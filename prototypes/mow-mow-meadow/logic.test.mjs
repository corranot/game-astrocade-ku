// PROTOTYPE - NOT FOR PRODUCTION
// Rules tests: node --test prototypes/mow-mow-meadow/logic.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as L from './logic.js';

const cfg = () => JSON.parse(fs.readFileSync(new URL('./game_config.json', import.meta.url), 'utf8'));
const garden = (c, n) => L.makeGarden(c, n, c.seed + n);
/** Mows a whole garden in lanes with the starting deck, ignoring obstacles (cutSweep only cuts grass cells). */
function mowAll(c, g, width) {
  for (let x = 0; x <= g.w; x += width * 0.8) L.cutSweep(c, g, x, g.d + 1, x, -1, 0, width);
}

test('every garden builds the same way twice, with grass to cut and a free start by the south entry', () => {
  const c = cfg();
  assert.equal(c.gardens.length, 12);
  assert.deepEqual([0, 5, 6, 8, 9, 11].map(L.districtOf), [0, 0, 1, 1, 2, 2]);
  for (let n = 0; n < c.gardens.length; n++) {
    const a = garden(c, n), b = garden(c, n);
    assert.ok(a.grassCount > 200, 'grass in garden ' + n);
    assert.deepEqual(Array.from(a.type), Array.from(b.type), 'same layout for the same seed, garden ' + n);
    assert.equal(a.cutCount, 0);
    assert.equal(L.percent(a), 0);
    assert.ok(!L.blocked(a, a.w / 2, a.d - c.kart.radiusM - 0.2, c.kart.radiusM, false), 'start is free in garden ' + n);
  }
});

test('cutting counts each cell once and 100% is shown only when every cell is cut', () => {
  const c = cfg(), g = garden(c, 0), w = L.upValue(c, 'deck', 0);
  const first = L.cutSweep(c, g, g.w / 2, g.d - 1, g.w / 2, g.d - 3, 0, w);
  assert.ok(first.cut > 0 && first.rect);
  const again = L.cutSweep(c, g, g.w / 2, g.d - 1, g.w / 2, g.d - 3, 0, w);
  assert.equal(again.cut, 0, 'a second pass cuts nothing new');
  assert.ok(L.percent(g) < 100);
  mowAll(c, g, w);
  assert.equal(g.cutCount, g.grassCount);
  assert.equal(L.percent(g), 100);
  assert.equal(L.starsFor(c, g), 3);
  assert.equal(L.nearestUncut(g, 1, 1), null);
});

test('stars come in order as coverage grows', () => {
  const c = cfg(), g = garden(c, 0); let last = 0;
  for (let z = g.d; z > -1; z -= 0.5) {
    for (let x = 0; x <= g.w; x += 0.9) L.cutSweep(c, g, x, z, x, z - 0.5, 0, 1.2);
    const s = L.starsFor(c, g); assert.ok(s >= last && s <= 3); last = s;
  }
  assert.equal(last, 3);
});

test('a save round-trips the cut lawn', () => {
  const c = cfg(), g = garden(c, 2);
  L.cutSweep(c, g, 2, g.d - 1, g.w - 2, g.d - 4, 0.6, 1.4);
  const str = L.packCut(g), h = garden(c, 2);
  assert.ok(L.unpackCut(h, str));
  assert.equal(h.cutCount, g.cutCount);
  assert.equal(L.packCut(h), str);
  const bad = garden(c, 2);
  assert.equal(L.unpackCut(bad, 'zz.1'), false, 'a wrong length is refused');
  assert.equal(L.unpackCut(bad, '<script>'), false);
  assert.equal(bad.cutCount, 0);
});

test('upgrades grow in value and price, and stop at the last level', () => {
  const c = cfg();
  for (const k of ['deck', 'engine', 'baler']) {
    for (let lv = 0; lv < c.upgrades.levels; lv++) {
      assert.ok(L.upPrice(c, k, lv + 1) > L.upPrice(c, k, lv) || lv + 1 === c.upgrades.levels, k + ' price rises at ' + lv);
      if (k !== 'baler') assert.ok(L.upValue(c, k, lv + 1) > L.upValue(c, k, lv), k + ' value rises at ' + lv);
    }
  }
  assert.ok(L.baleReach(c, c.upgrades.levels) > L.baleReach(c, 0));
});

test('the first upgrade is affordable inside garden 1 (bales plus finds plus tips)', () => {
  const c = cfg(), g = garden(c, 0);
  const bales = Math.floor(g.areaM2 / c.upgrades.baler.sizes[0]) * L.baleCoins(c, c.upgrades.baler.sizes[0], 0);
  const tips = L.tip(c, g, 1) + L.tip(c, g, 2) + L.tip(c, g, 3);
  const cheapest = Math.min(...['deck', 'engine', 'baler'].map((k) => L.upPrice(c, k, 0)));
  assert.ok(bales + tips >= cheapest, `garden 1 pays ${bales + tips}, cheapest upgrade ${cheapest}`);
});

test('a broken or hostile save is cleaned, never trusted', () => {
  const c = cfg();
  const s = L.cleanSave(c, { coins: -5, up: { deck: 99, engine: 'x' }, cur: 17, gardens: [{ stars: 9 }], friends: ['nope', c.friends[0], c.friends[0]], wear: 'crown', lang: 'english', cut: 5 });
  assert.equal(s.coins, 0);
  assert.equal(s.up.deck, c.upgrades.levels);
  assert.equal(s.up.engine, 0);
  assert.equal(s.gardens[0].stars, 3);
  assert.equal(s.cur, 1, 'cannot stand past the last finished garden');
  assert.deepEqual(s.friends, [c.friends[0]]);
  assert.equal(s.wear, null);
  assert.equal(s.lang, null);
  assert.equal(s.cut, null);
  assert.deepEqual(L.cleanSave(c, null), L.newSave(c));
  assert.deepEqual(L.cleanSave(c, 'junk'), L.newSave(c));
});

test('a late save merges without losing progress from either side', () => {
  const c = cfg(), a = L.newSave(c), b = L.newSave(c);
  a.coins = 40; a.friends = [c.friends[0]]; a.up.deck = 1;
  b.coins = 300; b.friends = [c.friends[1]]; b.gardens = [{ stars: 3, best: 100, rib: [] }]; b.cur = 1; b.ftueDone = true;
  const m = L.mergeSave(c, a, b);
  assert.equal(m.coins, 300); assert.equal(m.up.deck, 1); assert.equal(m.cur, 1); assert.equal(m.ftueDone, true);
  assert.deepEqual(m.friends.sort(), [c.friends[0], c.friends[1]].sort());
});

test('the kart is never born inside a solid and can always reach the gate', () => {
  const c = cfg(), rad = c.kart.radiusM;
  for (let n = 0; n < c.gardens.length; n++) {
    const g = garden(c, n), s = g.cell * 2, cols = Math.floor(g.w / s), rows = Math.floor(g.d / s), seen = new Uint8Array(cols * rows);
    const free = (i, j) => !L.blocked(g, (i + 0.5) * s, (j + 0.5) * s, rad, true);
    const q = [[Math.floor(cols / 2), rows - Math.ceil((rad + 0.2) / s) - 1]]; seen[q[0][1] * cols + q[0][0]] = 1; let gate = false;
    assert.ok(free(q[0][0], q[0][1]), 'start free, garden ' + n);
    while (q.length) {
      const [i, j] = q.pop(); if (j <= Math.ceil(rad / s) && Math.abs((i + 0.5) * s - g.w / 2) < 1) gate = true;
      for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const x = i + a, y = j + b; if (x < 0 || y < 0 || x >= cols || y >= rows || seen[y * cols + x] || !free(x, y)) continue; seen[y * cols + x] = 1; q.push([x, y]); }
    }
    assert.ok(gate, 'gate reachable in garden ' + n);
  }
});

test('every blade of grass can be cut: each grass cell is within deck reach of a place the mower can stand', () => {
  const c = cfg(), rad = c.kart.radiusM, reach = c.kart.deckAheadM + c.lawn.footLenM / 2;
  for (let n = 0; n < c.gardens.length; n++) {
    const g = garden(c, n), s = g.cell, k = Math.ceil(reach / s); let bad = 0;
    const stand = (x, z) => !L.blocked(g, x, z, rad, true);
    for (let r = 0; r < g.rows; r += 2) for (let col = 0; col < g.cols; col += 2) {
      if (g.type[r * g.cols + col] !== L.T.GRASS) continue;
      const x = (col + 0.5) * s, z = (r + 0.5) * s, eh = g.edge[r * g.cols + col] ? c.lawn.edgeHelpM : 0; let ok = false;
      for (let a = -k - 4; a <= k + 4 && !ok; a += 2) for (let b = -k - 4; b <= k + 4 && !ok; b += 2) { const px = x + a * s, pz = z + b * s; if (Math.hypot(px - x, pz - z) <= reach + eh && stand(px, pz)) ok = true; }
      if (!ok) bad++;
    }
    assert.equal(bad, 0, bad + ' unreachable grass cells in garden ' + n);
  }
});

test('the daily garden is the same all day and differs between days', () => {
  const c = cfg(), a = L.dailyRecipe(c, 20261128), b = L.dailyRecipe(c, 20261128), d = L.dailyRecipe(c, 20261129);
  assert.deepEqual(a, b);
  assert.notDeepEqual(a, d);
});

test('every language has every string, and Arabic is among them', () => {
  const c = cfg(), en = Object.keys(c.strings.en).sort();
  assert.ok(en.length > 20);
  for (const [lang, t] of Object.entries(c.strings)) assert.deepEqual(Object.keys(t).sort(), en, 'strings for ' + lang);
});
