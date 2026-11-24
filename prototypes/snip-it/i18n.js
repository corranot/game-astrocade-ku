// PROTOTYPE - NOT FOR PRODUCTION
// Snip It languages: the words live in game_config.json (strings), this picks the language and looks words up.

export const LANGS = ['en', 'id', 'es', 'hi', 'ar', 'vi', 'bn', 'pt'];

/** First supported language in the device's list, else English. */
export function detectLang(list, langs = LANGS) {
  for (const l of list || []) { const k = String(l || '').slice(0, 2).toLowerCase(); if (langs.includes(k)) return k; }
  return 'en';
}

/** Word lookup for `strings` ({ en: {...}, ... }): t(key, n) falls back to English, then to the key. */
export function makeT(strings, getLang) {
  return (k, n) => String(((strings || {})[getLang()] || {})[k] || ((strings || {}).en || {})[k] || k).replace('{n}', n);
}

export const isRtl = (lang) => lang === 'ar';
