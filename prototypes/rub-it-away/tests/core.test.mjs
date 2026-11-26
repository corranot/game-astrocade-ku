import assert from 'node:assert/strict';
import { LEVELS } from '../modules/levels.js';
import { effectiveLevelDefinition, extendProgressArray, normalizePrefs, starsForSolvedLevel, validateLevels, dailyLevel, dayKey, nextDayKey, giftDue, goldenLevel, TUNE } from '../modules/rules.js';
import { LEVEL_ASSETS } from '../modules/levels.js';
import { readFileSync } from 'node:fs';
import { TABLES, setLang, t } from '../modules/strings.js';
import { fitLines } from '../modules/util.js';

assert.equal(LEVELS.length, 66, 'the campaign should contain 60 original levels plus six Snow World levels');
assert.deepEqual(validateLevels(LEVELS), [], 'all levels should satisfy the scene data contract');
assert.deepEqual(LEVELS.slice(60).map((level) => level.n), [61, 62, 63, 64, 65, 66]);
assert.ok(LEVELS.slice(60).every((level) => level.bg.includes('snow') && level.things.filter((q) => q.role === 'target').length === 1 && level.things.filter((q) => q.role === 'decoy').length === 2));
const assetMap = JSON.parse(readFileSync(new URL('../asset_map.json', import.meta.url), 'utf8'));
for (const levelAssets of LEVEL_ASSETS.slice(60)) for (const asset of levelAssets) assert.ok(assetMap[asset], `asset_map should include ${asset}`);
const oldStars = Array(60).fill(0); oldStars[59] = 3;
const migratedStars = extendProgressArray(oldStars, 66, 3);
assert.equal(migratedStars[59], 3, 'migration must preserve a completed level 60');
assert.deepEqual(migratedStars.slice(60), [0, 0, 0, 0, 0, 0], 'new levels should start with safe zero progress');

const original = LEVELS[2].things[0].x;
const edited = effectiveLevelDefinition(LEVELS, 3, { levelEdits: { 3: { 0: { x: 500, y: 620, w: 190 } } } });
assert.equal(edited.things[0].x, 500, 'editor override should apply by stable thing index');
assert.equal(LEVELS[2].things[0].x, original, 'play-safe clone must not mutate authored levels');
assert.notEqual(edited, LEVELS[2], 'effective level must be a copy');
const clamped = effectiveLevelDefinition(LEVELS, 3, { levelEdits: { 3: { 0: { x: 9000, y: -50, w: 9999 } } } });
assert.ok(clamped.things[0].x <= 705 && clamped.things[0].y >= 160 && clamped.things[0].w <= 620, 'malformed editor values must be bounded');
assert.equal(starsForSolvedLevel(), 3, 'solving earns full stars regardless of optional exploration');
assert.deepEqual(normalizePrefs({ music: false, effects: true }, { haptics: false }), {
  music: false, effects: true, haptics: false, reduceMotion: false,
});
const textMetrics = { font: '', direction: 'ltr', measureText(text) { const size = Number((this.font.match(/(\\d+)px/) || [0, 28])[1]); return { width: Array.from(text).length * size * 0.55 }; } };
for (const [language, table] of Object.entries(TABLES)) {
  const snowTab = fitLines(textMetrics, table.world_snow, 34, 140, true);
  assert.ok(snowTab.lines.length <= 2 && snowTab.size >= 20, `${language} Snow World map label should fit the shared tab at a readable size`);
  for (const key of ['settings', 'music', 'effects', 'haptics', 'reduce_motion', 'on', 'off', 'back', 'move', 'resize', 'reset', 'world_snow', 'new_badge', 'share', 'world_share',
    'daily_short', 'daily_got', 'daily_tomorrow', 'tomorrow', 'gift', 'gift_got', 'world_done', 'skip', 'golden', 'perfect', 'record', 'rec_fast', 'rec_day']) {
    assert.ok(typeof table[key] === 'string' && table[key].length > 0, `${language} should translate ${key}`);
  }
  for (const level of LEVELS) {
    assert.ok(table[level.prompt] && table[level.win], `${language} should translate level ${level.n} prompt and win text`);
  }
}
// today's picture: a stable level per local day, never the same two days running, every level reached within a cycle
const seen = new Set(); let key = '2026-11-26', prev = 0;
for (let i = 0; i < LEVELS.length; i++) { const n = dailyLevel(key, LEVELS.length); assert.ok(n >= 1 && n <= LEVELS.length); assert.notEqual(n, prev, 'daily level must change day to day'); seen.add(n); prev = n; key = nextDayKey(key); }
assert.equal(seen.size, LEVELS.length, 'daily picture cycles through every level');
assert.equal(dailyLevel('2026-11-26', 66), dailyLevel('2026-11-26', 66), 'daily level is deterministic');
assert.equal(nextDayKey('2026-12-31'), '2027-01-01');
assert.match(dayKey(new Date(2026, 10, 26, 23, 59)), /^2026-11-26$/);
// surprise gift every TUNE.giftEvery levels solved in one session, never at 0
assert.equal(giftDue(0), false); assert.equal(giftDue(TUNE.giftEvery), true); assert.equal(giftDue(TUNE.giftEvery + 1), false);
// golden pictures: one in TUNE.goldenEvery, evenly spaced, never levels 1-2 or a world's last level, a different set tomorrow
const gold = (k) => LEVELS.map((l) => l.n).filter((n) => goldenLevel(n, k));
assert.ok(gold('2026-11-26').every((n) => n >= 3 && n % 6 !== 0));
assert.ok(gold('2026-11-26').length >= 5 && gold('2026-11-26').length <= 9, 'about one level in eight is golden');
assert.notDeepEqual(gold('2026-11-26'), gold('2026-11-27'), 'golden levels shift each day');
setLang('id'); assert.equal(t('settings'), 'PENGATURAN');
setLang('ar'); assert.ok(t('settings').length > 0);
console.log('Core rules, all 66 levels/assets, save migration defaults, and eight-language labels passed.');
