// backend/utils/translate.js
// ============================================================================
// FINAL, SIMPLIFIED, AND CORRECTED VERSION
//
// This utility is specifically configured for the translate.com API using
// the confirmed working endpoint and request format. It is the most direct
// and reliable solution based on the provided API details.
//
// Requirements:
// 1. Your .env file must contain:
//    TRANSLATE_COM_API_KEY=168ac3191ddc3a
// 2. 'node-fetch' should be installed (`npm install node-fetch`)
// ============================================================================

/**
 * A helper function to ensure a `fetch` implementation is available.
 */
async function getFetch() {
  if (typeof fetch !== "undefined") return fetch;
  try {
    const { default: nodeFetch } = await import("node-fetch");
    return nodeFetch;
  } catch (error) {
    throw new Error("Fetch API is not available. Please install node-fetch in your backend: npm install node-fetch");
  }
}

// --- In-Process Caching ---
// Caches successful translations to improve performance and avoid redundant API calls.
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // Cache items for 6 hours
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


/**
 * The main translation function. Translates English text to Arabic.
 * @param {string} text The English text to translate.
 * @returns {Promise<string>} The translated Arabic text.
 */
async function toArabic(text) {
  const inputText = String(text || "").trim();
  if (!inputText) {
    return "";
  }

  // 1. Get the API Key from your .env file.
  const apiKey = process.env.TRANSLATE_COM_API_KEY;
  if (!apiKey) {
    console.error("FATAL: Translate.com API Key not found. Please ensure TRANSLATE_COM_API_KEY is set in your .env file.");
    throw new Error("Translation service is not configured on the server.");
  }

  // 2. Check the cache for a prior translation.
  const cacheKey = `translate.com:${inputText}`;
  const cached = cacheGet(cacheKey);
  if (cached) {
    return cached;
  }

  // 3. Prepare the request exactly like the working curl command.
  const _fetch = await getFetch();
  
  // This is the single, correct endpoint provided in your curl command.
  const apiUrl = "https://translation-api.translate.com/translate/v1/mt";

  // The API requires the data in 'x-www-form-urlencoded' format.
  // URLSearchParams is the standard way to create this format in JavaScript.
  const params = new URLSearchParams();
  params.append('source_language', 'en');
  params.append('translation_language', 'ar');
  params.append('text', inputText);

  try {
    console.log("Attempting translation with the configured translate.com API...");

    const response = await _fetch(apiUrl, {
      method: "POST",
      headers: {
        'accept': '*/*',
        'x-api-key': apiKey,
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-CSRF-TOKEN': '', // Include the empty CSRF token as seen in the curl command
      },
      body: params,
    });

    if (!response.ok) {
        const errorBody = await response.text();
        console.error(`Translate.com API Error (Status: ${response.status}): ${errorBody}`);
        throw new Error(`The translation API returned an error.`);
    }

    const data = await response.json();

    // Handle official response shapes:
    // 1) { translation: "...", limit_used, limit_remaining }
    // 2) { output: { translated_text: "..." } }
    // 3) legacy/alt: translatedText / translated_text
    const translatedText =
      data?.translation ||
      data?.output?.translated_text ||
      data?.translatedText ||
      data?.translated_text;

    if (!translatedText) {
      console.error("Could not find translated text in the API response:", data);
      throw new Error("API response did not contain a valid translation.");
    }
    
    // 4. Cache the result and return it.
    cacheSet(cacheKey, translatedText);
    return translatedText;

  } catch (error) {
    console.error("The translation request failed:", error.message);
    throw new Error("The translation service is currently unavailable.");
  }
}

module.exports = { toArabic };