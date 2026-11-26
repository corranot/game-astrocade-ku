/* Compact, backwards-compatible save layer: progress, permanent funny-reaction stickers and player accessibility preferences. No date-based rewards or leaderboard activity. */
import { normalizePrefs, extendProgressArray } from './rules.js';

export const LEVEL_COUNT = 66;
const creatorDefaults = typeof window !== 'undefined' && window.gameConfig && window.gameConfig.settings || {};
export const S = {
  reached: 1,
  stars: new Array(LEVEL_COUNT).fill(0),
  hints: 3,
  gags: new Array(LEVEL_COUNT).fill(0),
  prefs: normalizePrefs(null, creatorDefaults),
  snowWorldSeen: false,
};
export const HINT_MAX = 9;
let loaded = false, dirty = false, reading = false, saving = false, flushTimer = 0, readTimer = 0;
const failed = (r) => !r || r.error || r.success === false;
const log = (m) => { try { window.lib.log(String(m)); } catch (e) { return; } };
const timeout = (ms) => new Promise((resolve) => setTimeout(() => resolve({ error: 'timeout' }), ms));

export function totalStars() { return S.stars.reduce((sum, value) => sum + value, 0); }
export function isLoaded() { return loaded; }

function merge(st) {
  if (!st || typeof st !== 'object') return;
  if (Number.isFinite(st.reached)) S.reached = Math.max(S.reached, Math.min(LEVEL_COUNT + 1, Math.floor(st.reached)));
  const oldStars = extendProgressArray(st.stars, LEVEL_COUNT, 3);
  for (let i = 0; i < LEVEL_COUNT; i++) S.stars[i] = Math.max(S.stars[i], oldStars[i]);
  if (Number.isFinite(st.hints)) S.hints = Math.min(HINT_MAX, Math.max(0, Math.floor(st.hints)));
  const oldGags = extendProgressArray(st.gags, LEVEL_COUNT, 255);
  for (let i = 0; i < LEVEL_COUNT; i++) S.gags[i] |= oldGags[i];
  S.prefs = normalizePrefs(st.prefs, S.prefs);
  if (typeof st.snowWorldSeen === 'boolean') S.snowWorldSeen = S.snowWorldSeen || st.snowWorldSeen;
}

async function readOnce() {
  try { return await Promise.race([window.lib.getUserGameState(), timeout(9000)]); }
  catch (e) { return { error: String(e) }; }
}

export async function startRead() {
  if (reading || loaded) return;
  reading = true;
  for (let attempt = 0; attempt < 3 && !loaded; attempt++) {
    const response = await readOnce();
    if (!failed(response)) {
      merge(response.state);
      loaded = true;
    } else log('save read retry ' + (attempt + 1));
  }
  reading = false;
  if (loaded) { dirty = true; flush(); }
  else { clearTimeout(readTimer); readTimer = setTimeout(startRead, 30000); }
}

export function commit() { dirty = true; flush(); }

export async function flush() {
  if (!loaded || !dirty || saving) return;
  saving = true; dirty = false;
  const snapshot = {
    v: 2,
    reached: S.reached,
    stars: S.stars.slice(),
    hints: S.hints,
    gags: S.gags.slice(),
    prefs: { ...S.prefs },
    snowWorldSeen: S.snowWorldSeen,
  };
  let ok = false;
  try { const response = await window.lib.saveUserGameState(snapshot); ok = !failed(response); }
  catch (e) { ok = false; }
  if (!ok) { dirty = true; log('save write retry'); }
  saving = false;
  if (dirty) { clearTimeout(flushTimer); flushTimer = setTimeout(flush, ok ? 500 : 15000); }
}
