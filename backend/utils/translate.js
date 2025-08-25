// backend/utils/translate.js
// FINAL, STABLE VERSION.
// Uses a reliable (though unofficial) Google Translate endpoint as the primary method.
// This provides Google's translation quality without needing an API key or credit card.
// It includes a fallback to the MyMemory API for added robustness.

async function getFetch() {
  // Helper to ensure fetch is available in Node.js environments.
  if (typeof fetch !== "undefined") return fetch;
  try {
    const { default: nodeFetch } = await import("node-fetch");
    return nodeFetch;
  } catch (error) {
    throw new Error("Fetch API is not available. Please install node-fetch in your backend: npm install node-fetch");
  }
}

// --- In-Process Caching ---
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours
if (!global.__translate_cache) global.__translate_cache = new Map();

function cacheGet(key) {
  const item = global.__translate_cache.get(key);
  if (!item || Date.now() > item.expiresAt) {
    if (item) global.__translate_cache.delete(key);
    return null;
  }
  return item.value;
}

function cacheSet(key, value) {
  global.__translate_cache.set(key, {
    value,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });
}

// --- API Provider 1: Google Translate (Unofficial Endpoint) ---
async function googleTranslate(text) {
  const cacheKey = `google:${text}`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  const _fetch = await getFetch();
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=ar&dt=t&q=${encodeURIComponent(text)}`;

  try {
    const response = await _fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' } // A user-agent can help avoid blocks
    });

    if (!response.ok) {
      throw new Error(`Google Translate endpoint responded with status ${response.status}`);
    }

    const data = await response.json();
    
    // The response is a nested array; the translation is in the first element.
    const translatedText = data?.[0]?.[0]?.[0];

    if (!translatedText) {
      throw new Error("Could not parse a valid translation from Google's response.");
    }

    cacheSet(cacheKey, translatedText);
    return translatedText;
  } catch (error) {
    console.error("Google Translate endpoint failed:", error.message);
    throw error; // Re-throw to trigger the fallback.
  }
}

// --- API Provider 2: MyMemory (Reliable Fallback) ---
async function myMemoryTranslate(text) {
  const cacheKey = `mymemory:${text}`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;
  
  const _fetch = await getFetch();
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|ar`;

  try {
    const response = await _fetch(url);
    if (!response.ok) {
      throw new Error(`MyMemory API responded with status ${response.status}`);
    }

    const data = await response.json();
    if (data.responseStatus !== 200 || !data.responseData?.translatedText) {
      throw new Error("MyMemory did not return a valid translation.");
    }

    const translatedText = data.responseData.translatedText;
    cacheSet(cacheKey, translatedText);
    return translatedText;
  } catch(error) {
    console.error("MyMemory fallback failed:", error.message);
    throw error;
  }
}


/**
 * Main translation function. Translates English text to Arabic.
 * @param {string} text The English text to translate.
 * @returns {Promise<string>} The translated Arabic text.
 */
async function toArabic(text) {
  const inputText = String(text || "").trim();
  if (!inputText) {
    return "";
  }

  try {
    // 1. Try the primary, high-quality Google endpoint first.
    console.log("Attempting translation with Google Translate endpoint...");
    return await googleTranslate(inputText);
  } catch (error) {
    console.warn("Google Translate endpoint failed. Falling back to MyMemory API...");
    
    try {
      // 2. If Google fails, use the reliable MyMemory fallback.
      return await myMemoryTranslate(inputText);
    } catch (fallbackError) {
      console.error("All translation services have failed.", fallbackError.message);
      // If both services fail, we throw an error to be handled by the controller.
      throw new Error("The translation service is currently unavailable.");
    }
  }
}

module.exports = { toArabic };