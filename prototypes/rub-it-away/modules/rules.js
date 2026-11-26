/* Pure level/configuration rules: kept free of DOM/lib access so the content contract can be unit-tested. */
export const EDIT_LIMITS = Object.freeze({ minW: 40, maxW: 620, minX: 15, maxX: 705, minY: 160, maxY: 1150 });

function finiteOr(value, fallback) { return Number.isFinite(value) ? value : fallback; }

/** Return a deep, play-safe copy of a level with the creator's position/size overrides applied. */
export function effectiveLevelDefinition(levels, n, config) {
  const source = levels[n - 1];
  if (!source) throw new RangeError(`Unknown level: ${n}`);
  const def = JSON.parse(JSON.stringify(source));
  const levelEdits = config && config.levelEdits && config.levelEdits[n];
  if (!levelEdits || typeof levelEdits !== 'object') return def;
  for (let index = 0; index < def.things.length; index++) {
    const thing = def.things[index];
    // Index keys remain unique even in authored scenes with multiple generic "actor" IDs.
    const edit = levelEdits[String(index)];
    if (!edit || typeof edit !== 'object') continue;
    thing.x = Math.max(EDIT_LIMITS.minX, Math.min(EDIT_LIMITS.maxX, finiteOr(edit.x, thing.x)));
    thing.y = Math.max(EDIT_LIMITS.minY, Math.min(EDIT_LIMITS.maxY, finiteOr(edit.y, thing.y)));
    thing.w = Math.max(EDIT_LIMITS.minW, Math.min(EDIT_LIMITS.maxW, finiteOr(edit.w, thing.w)));
  }
  return def;
}

/** Every solved puzzle earns full completion stars; exploration of funny decoys is never a score penalty. */
export function starsForSolvedLevel() { return 3; }

/** Extend older 60-level progress arrays with safe defaults while preserving every valid old entry. */
export function extendProgressArray(values, length, cap) {
  const out = new Array(length).fill(0);
  if (!Array.isArray(values)) return out;
  for (let i = 0; i < Math.min(values.length, length); i++) if (Number.isFinite(values[i])) out[i] = Math.max(0, Math.min(cap, Math.floor(values[i])));
  return out;
}

/** Report structural data issues without mutating the authored level table. */
export function validateLevels(levels) {
  const issues = [];
  if (!Array.isArray(levels) || levels.length !== 72) return ['Expected exactly 72 level definitions (12 worlds × 6 levels).'];
  levels.forEach((level, index) => {
    const n = index + 1;
    if (level.n !== n) issues.push(`Level ${n}: n does not match its position.`);
    if (!level.prompt || !level.win) issues.push(`Level ${n}: missing prompt or win key.`);
    if (!Array.isArray(level.things)) { issues.push(`Level ${n}: missing things array.`); return; }
    const ids = new Set();
    let targets = 0;
    for (const thing of level.things) {
      if (!thing || typeof thing.id !== 'string' || !thing.id) { issues.push(`Level ${n}: thing has no id.`); continue; }
      // Several multi-character scenes intentionally use the legacy generic id "actor";
      // editor overrides use array indexes, so these safe authored aliases do not collide.
      if (ids.has(thing.id) && thing.id !== 'actor') issues.push(`Level ${n}: duplicate thing id "${thing.id}".`);
      ids.add(thing.id);
      if (thing.role === 'target') targets++;
      if (!thing.asset || !Number.isFinite(thing.x) || !Number.isFinite(thing.y) || !Number.isFinite(thing.w) || thing.w <= 0) {
        issues.push(`Level ${n}/${thing.id}: missing asset or invalid geometry.`);
      } else if (thing.x < 30 || thing.x > 690 || thing.y < 150 || thing.y > 1140 || thing.w > 660) {
        issues.push(`Level ${n}/${thing.id}: authored object center or size falls outside the 720×1280 stage bounds.`);
      }
    }
    if (targets !== 1) issues.push(`Level ${n}: expected exactly one puzzle target, found ${targets}.`);
    if (n > 60 && n <= 66 && (level.bg.indexOf('snow') < 0 || !level.weather || level.weather.kind !== 'snow' || level.things.filter((q) => q.role === 'decoy').length !== 2)) {
      issues.push(`Level ${n}: Snow World levels need snow art/weather and exactly two decoys.`);
    }
    if (n > 66 && (level.bg.indexOf('candy') < 0 || level.things.filter((q) => q.role === 'decoy').length !== 2)) {
      issues.push(`Level ${n}: Candy World levels need candy art and exactly two decoys.`);
    }
  });
  return issues;
}

export function normalizePrefs(value, fallback = {}) {
  const defaults = { music: true, effects: true, haptics: true, reduceMotion: false, ...fallback };
  const prefs = value && typeof value === 'object' ? value : {};
  return {
    music: typeof prefs.music === 'boolean' ? prefs.music : defaults.music,
    effects: typeof prefs.effects === 'boolean' ? prefs.effects : defaults.effects,
    haptics: typeof prefs.haptics === 'boolean' ? prefs.haptics : defaults.haptics,
    reduceMotion: typeof prefs.reduceMotion === 'boolean' ? prefs.reduceMotion : defaults.reduceMotion,
  };
}

/** Tuning for the session and return features (no timers, no streaks, nothing is ever lost). */
export const TUNE = Object.freeze({
  giftEvery: 10,       // a surprise gift on the result card after every 10th level solved in one session (about minute 3-4, 7, 10 at 20 s a level)
  goldenEvery: 8,      // one level in 8 is a golden picture (which ones shifts every day); never level 1-2, never a world's last level
  giftHints: 2,        // what the gift holds
  dailyHints: 1,       // collecting today's picture
  pullAfter: 2.4,      // s after the result card settles before NEXT starts its stronger pulse
});

/** Local calendar day as YYYY-MM-DD: today's picture changes at the player's own midnight. */
export function dayKey(date) {
  const d = date || new Date(), p = (v) => String(v).padStart(2, '0');
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
}

/** The level shown as "today's picture": the same for everyone on a day, never the same two days running. */
export function dailyLevel(key, count) {
  const days = Math.floor(Date.UTC(+key.slice(0, 4), +key.slice(5, 7) - 1, +key.slice(8, 10)) / 86400000);
  // a fixed stride that shares no factor with the level count walks every level before repeating
  let stride = 23; while (gcd(stride, count) !== 1) stride++;
  return ((days * stride) % count + count) % count + 1;
}
function gcd(a, b) { return b ? gcd(b, a % b) : a; }

/** The next day's key, for the "tomorrow" teaser. */
export function nextDayKey(key) {
  const d = new Date(Date.UTC(+key.slice(0, 4), +key.slice(5, 7) - 1, +key.slice(8, 10) + 1));
  const p = (v) => String(v).padStart(2, '0');
  return d.getUTCFullYear() + '-' + p(d.getUTCMonth() + 1) + '-' + p(d.getUTCDate());
}

/** True when the n-th level solved in this session earns the surprise gift. */
export function giftDue(solvedThisSession) { return solvedThisSession > 0 && solvedThisSession % TUNE.giftEvery === 0; }

/** True when level n is a golden picture today: evenly spaced (one in TUNE.goldenEvery), shifted each day, never in the tutorial levels or on a world's last level. */
export function goldenLevel(n, key) {
  if (n < 3 || n % 6 === 0) return false;
  const days = Math.floor(Date.UTC(+key.slice(0, 4), +key.slice(5, 7) - 1, +key.slice(8, 10)) / 86400000);
  return (days * 3 + n) % TUNE.goldenEvery === 0;
}
