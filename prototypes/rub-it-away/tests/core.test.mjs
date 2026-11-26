import assert from 'node:assert/strict';
import { LEVELS } from '../modules/levels.js';
import { effectiveLevelDefinition, extendProgressArray, normalizePrefs, starsForSolvedLevel, validateLevels } from '../modules/rules.js';
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
  const snowTab = fitLines(textMetrics, table.world_snow, 38, 114, true);
  assert.equal(snowTab.lines.length, 2, `${language} Snow World map label should wrap into two lines`);
  assert.ok(snowTab.size >= 25, `${language} Snow World map label should stay large and readable`);
  for (const key of ['settings', 'music', 'effects', 'haptics', 'reduce_motion', 'on', 'off', 'back', 'move', 'resize', 'reset', 'world_snow', 'new_badge', 'share', 'world_share']) {
    assert.ok(typeof table[key] === 'string' && table[key].length > 0, `${language} should translate ${key}`);
  }
  for (const level of LEVELS) {
    assert.ok(table[level.prompt] && table[level.win], `${language} should translate level ${level.n} prompt and win text`);
  }
}
setLang('id'); assert.equal(t('settings'), 'PENGATURAN');
setLang('ar'); assert.ok(t('settings').length > 0);
console.log('Core rules, all 66 levels/assets, save migration defaults, and eight-language labels passed.');
