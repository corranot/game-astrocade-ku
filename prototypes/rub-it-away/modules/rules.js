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
  if (!Array.isArray(levels) || levels.length !== 66) return ['Expected exactly 66 level definitions (11 worlds × 6 levels).'];
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
    if (n > 60 && (level.bg.indexOf('snow') < 0 || !level.weather || level.weather.kind !== 'snow' || level.things.filter((q) => q.role === 'decoy').length !== 2)) {
      issues.push(`Level ${n}: Snow World levels need snow art/weather and exactly two decoys.`);
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
