import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { LEVELS } from '../levels.js';
import { STICKERS } from '../art.js';
import { migrateLegacyLevel, stickerChoices } from '../progress.js';

test('legacy completed chapter four flows into the new chapter without losing its milestone', () => {
  assert.equal(migrateLegacyLevel(19), 19);
  assert.equal(migrateLegacyLevel(20), 20);
  assert.equal(migrateLegacyLevel(21), 26);
  assert.equal(migrateLegacyLevel(39), 44);
  assert.equal(migrateLegacyLevel(40), 50);
  assert.equal(migrateLegacyLevel(-2), 0);
});

test('the original twenty puzzles remain first, followed by five winter puzzles', () => {
  assert.equal(LEVELS.length, 25);
  assert.ok(LEVELS.slice(20).every((lv) => Array.isArray(lv.target) && lv.target.length > 1));
  assert.ok(LEVELS.slice(20).every((lv) => typeof lv.back === 'function' && typeof lv.live === 'function'));
});

test('winter stickers unlock only after the original 24 are complete', () => {
  assert.equal(STICKERS.length, 30);
  assert.deepEqual(stickerChoices(Array.from({ length: 24 }, (_, i) => i), STICKERS.length), [24, 25, 26, 27, 28, 29]);
  assert.deepEqual(stickerChoices(Array.from({ length: 30 }, (_, i) => i), STICKERS.length), []);
});

test('new chapter, share and puzzle words exist in every existing language', async () => {
  const cfg = JSON.parse(await readFile(new URL('../game_config.json', import.meta.url), 'utf8'));
  assert.deepEqual(Object.keys(cfg.strings).sort(), ['ar', 'bn', 'en', 'es', 'hi', 'id', 'vi']);
  for (const words of Object.values(cfg.strings)) {
    for (const key of ['share', 'myDrawing', 'snowChapter', 'winterSet', 'snowOpen', 'L21', 'L22', 'L23', 'L24', 'L25']) {
      assert.equal(typeof words[key], 'string', `missing ${key}`);
      assert.ok(words[key].length > 0, `empty ${key}`);
    }
  }
});
