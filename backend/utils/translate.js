// backend/utils/translate.js
// Lightweight wrapper around @vitalets/google-translate-api (ESM-only)
// Works under CommonJS by using dynamic import. If translation fails, returns original text.

async function toArabic(text) {
  try {
    if (!text || !String(text).trim()) return '';
    const { default: translate } = await import('@vitalets/google-translate-api');
    const res = await translate(String(text), { from: 'en', to: 'ar' });
    return res && res.text ? res.text : String(text);
  } catch (e) {
    return String(text);
  }
}

module.exports = { toArabic };
