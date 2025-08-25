// backend/utils/translate.js
// Lightweight wrapper around @vitalets/google-translate-api (ESM-only)
// Works under CommonJS by using dynamic import. Throws an error on failure.

async function toArabic(text) {
  if (!text || !String(text).trim()) {
    return '';
  }
  
  try {
    const mod = await import('@vitalets/google-translate-api');
    // Support various export shapes that can occur with ESM/CJS interop
    const translate =
      typeof mod === 'function'
        ? mod
        : typeof mod.default === 'function'
        ? mod.default
        : typeof mod.translate === 'function'
        ? mod.translate
        : null;
    if (typeof translate !== 'function') {
      throw new Error('Translate module did not export a function');
    }
    const input = String(text);
    const hasArabic = (s) => /[\u0600-\u06FF]/.test(s);
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

    // Simple in-memory cache with TTL to avoid repeated requests
    if (!global.__translate_cache) global.__translate_cache = new Map();
    const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours
    function cacheGet(key) {
      const item = global.__translate_cache.get(key);
      if (!item) return null;
      const { value, expiresAt } = item;
      if (Date.now() > expiresAt) {
        global.__translate_cache.delete(key);
        return null;
      }
      return value;
    }
    function cacheSet(key, value) {
      global.__translate_cache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
    }

    // Simple in-process rate limiter (one call at a time, min gap between calls)
    const RATE_GAP_MS = 1500; // ~1.5 request/sec to be safer against 429
    if (!global.__translate_last_call) global.__translate_last_call = 0;
    async function rateLimit() {
      const now = Date.now();
      const elapsed = now - global.__translate_last_call;
      if (elapsed < RATE_GAP_MS) {
        await sleep(RATE_GAP_MS - elapsed);
      }
      global.__translate_last_call = Date.now();
    }

    async function translateWithRetries(textToTranslate, options) {
      const cacheKey = JSON.stringify({ t: textToTranslate, ...options });
      const cached = cacheGet(cacheKey);
      if (cached) return cached;
      const maxAttempts = 5;
      let attempt = 0;
      let lastErr;
      while (attempt < maxAttempts) {
        try {
          await rateLimit();
          const res = await translate(textToTranslate, options);
          cacheSet(cacheKey, res);
          return res;
        } catch (e) {
          lastErr = e;
          const msg = (e && e.message) || String(e || '');
          // Backoff on rate limiting
          const is429 = msg.toLowerCase().includes('too many requests');
          const backoff = is429 ? 2500 * (attempt + 1) : 600 * (attempt + 1);
          await sleep(backoff);
          attempt++;
        }
      }
      throw lastErr || new Error('Translation failed after retries');
    }

    async function getFetch() {
      if (typeof fetch !== 'undefined') return fetch;
      // Try node-fetch if available
      try {
        const mod = await import('node-fetch');
        return mod.default || mod;
      } catch {
        // Minimal https-based fetch replacement (POST JSON only)
        const https = await import('node:https');
        return function minimalFetch(url, opts = {}) {
          return new Promise((resolve, reject) => {
            try {
              const u = new URL(url);
              const data = opts.body || '';
              const req = https.request(
                {
                  method: opts.method || 'GET',
                  hostname: u.hostname,
                  port: u.port || 443,
                  path: u.pathname + (u.search || ''),
                  headers: opts.headers || { 'Content-Type': 'application/json' },
                },
                (res) => {
                  const chunks = [];
                  res.on('data', (c) => chunks.push(c));
                  res.on('end', () => {
                    const body = Buffer.concat(chunks).toString('utf8');
                    resolve({
                      ok: res.statusCode >= 200 && res.statusCode < 300,
                      status: res.statusCode,
                      json: async () => JSON.parse(body || '{}'),
                      text: async () => body,
                    });
                  });
                }
              );
              req.on('error', reject);
              if (data) req.write(data);
              req.end();
            } catch (e) {
              reject(e);
            }
          });
        };
      }
    }

    async function libreDetect(textToTranslate) {
      const _fetch = await getFetch();
      const detectEndpoints = [
        (process.env.LIBRE_TRANSLATE_URL || 'https://libretranslate.com') + '/detect',
        'https://libretranslate.de/detect',
        'https://translate.argosopentech.com/detect',
      ];
      for (const url of detectEndpoints) {
        try {
          await rateLimit();
          const resp = await _fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ q: textToTranslate })
          });
          if (!resp.ok) continue;
          const arr = await resp.json();
          if (Array.isArray(arr) && arr.length) {
            return arr[0]?.language || 'en';
          }
        } catch { /* try next mirror */ }
      }
      return 'en';
    }

    async function libreTranslate(textToTranslate, from = 'auto', to = 'ar') {
      const cacheKey = JSON.stringify({ provider: 'libre', t: textToTranslate, from, to });
      const cached = cacheGet(cacheKey);
      if (cached) return cached;
      const _fetch = await getFetch();
      const mirrors = [
        (process.env.LIBRE_TRANSLATE_URL || 'https://libretranslate.com') + '/translate',
        'https://libretranslate.de/translate',
        'https://translate.argosopentech.com/translate',
      ];
      // Avoid 'auto' for source for better success rate
      const sourceLang = from === 'auto' ? await libreDetect(textToTranslate) : from;
      const apiKey = process.env.LIBRE_TRANSLATE_KEY;
      const payload = { q: textToTranslate, source: sourceLang, target: to, format: 'text' };
      if (apiKey) payload.api_key = apiKey;
      let lastErr;
      for (const endpoint of mirrors) {
        try {
          await rateLimit();
          const resp = await _fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          if (!resp.ok) {
            lastErr = new Error(`LibreTranslate failed: ${resp.status}`);
            if (resp.status >= 500 || resp.status === 429 || resp.status === 408) {
              // transient; try next mirror
              continue;
            } else {
              // 4xx likely payload/limit; try next mirror anyway
              continue;
            }
          }
          const data = await resp.json();
          cacheSet(cacheKey, data);
          return data; // { translatedText }
        } catch (e) {
          lastErr = e;
          // try next mirror
          continue;
        }
      }
      throw lastErr || new Error('LibreTranslate failed');
    }

    // Chunked translation helper that prefers Google, falls back to Libre per-chunk
    async function translateChunkedPreferFallback(textToTranslate, from = 'auto', to = 'ar') {
      const sentences = textToTranslate
        .split(/(?<=[\.!?\n])\s+/)
        .reduce((chunks, s) => {
          if (!chunks.length) return [[s]];
          const last = chunks[chunks.length - 1];
          const joined = last.join(' ');
          if ((joined + ' ' + s).length < 300) last.push(s);
          else chunks.push([s]);
          return chunks;
        }, [])
        .map((arr) => arr.join(' '));
      const outParts = [];
      for (const s of sentences) {
        const r = await translatePreferFallback(s, { from, to }, from);
        outParts.push(r?.text || '');
        await sleep(250);
      }
      return outParts.join(' ').trim();
    }

    // Fast-path: single Google try; on 429 immediately fall back to LibreTranslate.
    async function translatePreferFallback(textToTranslate, options, fallbackFrom = 'auto') {
      try {
        await rateLimit();
        const res = await translate(textToTranslate, options);
        return res;
      } catch (e) {
        const msg = (e && e.message) || '';
        if (msg.toLowerCase().includes('too many requests')) {
          try {
            const alt = await libreTranslate(textToTranslate, fallbackFrom, options.to || 'ar');
            return { text: alt?.translatedText };
          } catch (altErr) {
            const altMsg = (altErr && altErr.message) || '';
            // If Libre returns a 400 (often due to payload length or unsupported content), try chunking
            if (altMsg.includes('400')) {
              const joined = await translateChunkedPreferFallback(textToTranslate, fallbackFrom, options.to || 'ar');
              return { text: joined };
            }
            throw altErr;
          }
        }
        // For non-429, fall back to the retrying path
        return translateWithRetries(textToTranslate, options);
      }
    }
    const transliterateToArabic = (s) => {
      if (!s) return '';
      let str = s;
      // Pre-normalize
      str = str.normalize('NFC');
      // Handle common digraphs first
      const digraphs = [
        [/sch/gi, 'ش'],
        [/sh/gi, 'ش'],
        [/ch/gi, 'تش'],
        [/ph/gi, 'ف'],
        [/th/gi, 'ث'],
        [/kh/gi, 'خ'],
        [/gh/gi, 'غ'],
      ];
      for (const [re, rep] of digraphs) str = str.replace(re, rep);
      // Single-letter map (approximate)
      const map = {
        a: 'ا', b: 'ب', c: 'ك', d: 'د', e: 'ي', f: 'ف', g: 'ج', h: 'ه', i: 'ي',
        j: 'ج', k: 'ك', l: 'ل', m: 'م', n: 'ن', o: 'و', p: 'ب', q: 'ق', r: 'ر',
        s: 'س', t: 'ت', u: 'و', v: 'ف', w: 'و', x: 'كس', y: 'ي', z: 'ز',
      };
      let out = '';
      for (const ch of str) {
        const lower = ch.toLowerCase();
        if (map[lower]) out += map[lower];
        else if (/[0-9]/.test(ch)) out += ch; // keep digits
        else if (/\s/.test(ch)) out += ch; // keep spaces
        else if (/[\-\'\.]/.test(ch)) out += ch; // keep basic punctuation
        else out += ch; // fallback keep
      }
      return out;
    };

    // If the input is long, prefer chunked path from the start to avoid provider limits
    let translatedText;
    if (input.length > 500) {
      translatedText = await translateChunkedPreferFallback(input, 'en', 'ar');
    } else {
      ({ text: translatedText } = await translatePreferFallback(input, { from: 'en', to: 'ar' }, 'en'));
    }

    // If no Arabic letters present, try a fallback with source auto-detection
    if (!translatedText || !hasArabic(translatedText)) {
      if (input.length > 500) {
        translatedText = await translateChunkedPreferFallback(input, 'auto', 'ar');
      } else {
        const fallback = await translatePreferFallback(input, { from: 'auto', to: 'ar' }, 'auto');
        translatedText = fallback?.text;
      }
    }

    if (!translatedText || !hasArabic(translatedText)) {
      // Try transliteration for proper nouns
      const translit = transliterateToArabic(input);
      if (translit && hasArabic(translit)) {
        return translit;
      }
      // If still no Arabic and text is long, try chunked translation as a last resort
      if (input.length > 400) {
        const sentences = input
          .split(/(?<=[\.!?\n])\s+/)
          .reduce((chunks, s) => {
            if (!chunks.length) return [[s]];
            const last = chunks[chunks.length - 1];
            const joined = last.join(' ');
            if ((joined + ' ' + s).length < 300) last.push(s);
            else chunks.push([s]);
            return chunks;
          }, [])
          .map((arr) => arr.join(' '));
        const outParts = [];
        for (const s of sentences) {
          const r = await translatePreferFallback(s, { from: 'auto', to: 'ar' }, 'auto');
          outParts.push(r?.text || '');
          // small gap between chunk requests as extra safety
          await sleep(300);
        }
        const joined = outParts.join(' ').trim();
        if (joined && hasArabic(joined)) return joined;
      }
      throw new Error('Translation API did not return a valid Arabic translation.');
    }

    return translatedText;
  } catch (error) {
    console.error('Translation Service Error:', error.message);
    // Re-throw a more generic error to be handled by the controller
    throw new Error('Failed to translate text due to a service error.');
  }
}

module.exports = { toArabic };
