// PROTOTYPE - NOT FOR PRODUCTION
// Rules tests: node --test prototypes/photo-safari/logic.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as L from './logic.js';

const cfg = () => JSON.parse(fs.readFileSync(new URL('./game_config.json', import.meta.url), 'utf8'));
const KEY = 20261128;

test('rating: every photo of an animal is 1 to 3 stars, framing and pose each add one', () => {
  const c = cfg();
  assert.equal(L.rate(c, { cover: 0.05, inPose: false }), 1);
  assert.equal(L.rate(c, { cover: 0.3, inPose: false }), 2);
  assert.equal(L.rate(c, { cover: 0.3, inPose: true }), 3);
  assert.equal(L.rate(c, { cover: 0.3, inPose: true, occluded: true }), 2);
  assert.equal(L.rate(c, { cover: 0.95, inPose: false }), 1, 'too close is not framed');
  assert.equal(L.rate(c, { cover: 0.3, inPose: true, night: true }), 2, 'night without flash caps at 2');
  assert.equal(L.rate(c, { cover: 0.3, inPose: true, night: true, flash: true }), 3);
});

test('coverage shrinks with distance and grows with zoom', () => {
  assert.ok(L.coverage(3, 0.5, 40) > L.coverage(8, 0.5, 40));
  assert.ok(L.coverage(8, 0.5, 26) > L.coverage(8, 0.5, 40));
  // a fox (radius ~0.6) in viewfinder range 4 to 7 m is framed at the base lens
  const c = cfg();
  for (const d of [4, 5, 6, 7]) assert.ok(L.coverage(d, 0.6, c.camera.vfFov) >= c.photo.minCover, 'framed at ' + d);
});

test('a tree trunk on the line blocks the shot, one beside it does not', () => {
  assert.equal(L.occluded([[0, -5]], 0, 0, 0, -10), true);
  assert.equal(L.occluded([[3, -5]], 0, 0, 0, -10), false);
  assert.equal(L.occluded([[0, -0.5]], 0, 0, 0, -10), false, 'a trunk at the camera end is ignored');
});

test('slots fill once, pay double the first time, and stamps count them', () => {
  const c = cfg(), S = L.createState(c);
  L.rollDay(c, S, KEY);
  const r1 = L.applyPhoto(c, S, { id: 'fox', stars: 2, inPose: false });
  assert.deepEqual(r1.filled, ['hello']); assert.ok(r1.newSpecies);
  assert.ok(r1.flakes >= c.economy.photo[2] * 2);
  const r2 = L.applyPhoto(c, S, { id: 'fox', stars: 3, inPose: true });
  assert.deepEqual(r2.filled, ['pose', 'star']);
  assert.equal(L.stamps(S), 3);
  const f = S.flakes, r3 = L.applyPhoto(c, S, { id: 'fox', stars: 3, inPose: true });
  assert.deepEqual(r3.filled, []); assert.equal(S.flakes - f, r3.flakes);
  assert.ok(r3.flakes >= c.economy.photo[3]);
});

test('half page and page complete pay once', () => {
  const c = cfg(), S = L.createState(c), list = L.areaSpecies(c, 0);
  assert.equal(list.length, 8);
  let half = 0, page = 0;
  for (const s of list) { const r = L.applyPhoto(c, S, { id: s.id, stars: 1 }); if (r.half >= 0) half++; if (r.page >= 0) page++; }
  assert.equal(half, 2); assert.equal(page, 1);
  const r = L.applyPhoto(c, S, { id: list[0].id, stars: 1 }); assert.equal(r.half, -1); assert.equal(r.page, -1);
});

test('areas open at 10 and 25 stamps, reported once', () => {
  const c = cfg(), S = L.createState(c); const opened = [];
  for (const s of c.species) for (const st of [1, 3]) { const r = L.applyPhoto(c, S, { id: s.id, stars: st, inPose: st === 3 }); if (r.opened >= 0) opened.push([r.opened, L.stamps(S)]); }
  assert.deepEqual(opened.map((o) => o[0]), [1, 2]);
  assert.ok(opened[0][1] >= 10 && opened[0][1] < 13); assert.ok(opened[1][1] >= 25 && opened[1][1] < 28);
});

test('pacing: area 1 alone can open the lake (8 species x 3 slots >= 10)', () => {
  const c = cfg(); assert.ok(L.areaSpecies(c, 0).length * 3 >= c.areas[1].unlock);
  assert.ok(L.areaSpecies(c, 0).length * 3 + L.areaSpecies(c, 1).length * 3 >= c.areas[2].unlock);
});

test('shop: price, needs, owned; outfits are worn on purchase', () => {
  const c = cfg(), S = L.createState(c);
  assert.equal(L.canBuy(c, S, 'fish'), 'poor');
  S.flakes = 1000;
  assert.equal(L.canBuy(c, S, 'zoom3'), 'needs');
  assert.ok(L.buy(c, S, 'zoom2')); assert.equal(S.flakes, 700); assert.equal(L.canBuy(c, S, 'zoom2'), 'owned');
  assert.equal(L.lens(c, S).zoom, 2);
  assert.ok(L.buy(c, S, 'o_mint')); assert.equal(S.outfit, 'o_mint');
  assert.ok(!L.buy(c, S, 'nope'));
});

test('scenery photos pay a little, at most 3 a minute', () => {
  const c = cfg(), S = L.createState(c); let got = 0;
  for (let i = 0; i < 6; i++) got += L.applyPhoto(c, S, { id: null, stars: 1, now: i * 1000 }).flakes;
  assert.equal(got, c.economy.scenery * 3);
  assert.equal(L.applyPhoto(c, S, { id: null, stars: 1, now: 70000 }).flakes, c.economy.scenery);
});

test('daily: same rare and requests for everyone on a day, different kinds, doable now', () => {
  const c = cfg();
  assert.equal(L.dailyRare(c, KEY), L.dailyRare(c, KEY));
  const seen = new Set(); for (let d = 1; d <= 28; d++) seen.add(L.dailyRare(c, 20261100 + d));
  assert.equal(seen.size, c.daily.rareCount, 'all rares come round within four weeks');
  const q = L.dailyRequests(c, KEY, 1);
  assert.equal(q.length, 3); assert.equal(new Set(q.map((x) => x.type)).size, 3);
  assert.ok(!q.some((x) => x.type === 'area'), 'no area request before a second area opens');
  for (const x of q) if (x.type === 'species') assert.equal(L.speciesById(c, x.arg).area, 0);
});

test('requests complete on a matching photo and pay', () => {
  const c = cfg(), S = L.createState(c); S.req = [{ type: 'stars3', arg: null, done: false }, { type: 'two', arg: null, done: false }];
  const r = L.applyPhoto(c, S, { id: 'fox', stars: 3, inPose: true, others: 1 });
  assert.deepEqual(r.requests, [0, 1]); assert.ok(S.req.every((q) => q.done));
});

test('new day: requests roll, mail only for a returning player', () => {
  const c = cfg(), S = L.createState(c);
  assert.deepEqual(L.rollDay(c, S, KEY), { newDay: true, mail: false });
  assert.deepEqual(L.rollDay(c, S, KEY), { newDay: false, mail: false });
  S.photos = 3; assert.deepEqual(L.rollDay(c, S, KEY + 1), { newDay: true, mail: true });
});

test('day clock: day, dusk, night, dawn in 6 minutes; first night near 4.5 minutes', () => {
  const c = cfg();
  assert.equal(L.clockAt(c, 0).name, 'day');
  let first = -1; for (let t = 0; t < 600; t++) if (L.clockAt(c, c.clock.startS + t).night) { first = t; break; }
  assert.ok(first >= 255 && first <= 285, 'first night at ' + first + ' s');
  const w = L.clockAt(c, 239).w; assert.ok(Math.abs(w.day + w.dusk - 1) < 1e-9 && w.dusk > 0, 'blends into dusk');
});

test('save round trip keeps progress; bad fields fall back without throwing', () => {
  const c = cfg(), S = L.createState(c); S.flakes = 50; L.applyPhoto(c, S, { id: 'fox', stars: 3, inPose: true }); S.owned = ['fish']; S.ftue = 5;
  const R = L.restore(c, JSON.parse(JSON.stringify(L.serialize(c, S))));
  assert.equal(R.flakes, S.flakes); assert.equal(R.slots.fox, 7); assert.deepEqual(R.owned, ['fish']); assert.equal(R.ftue, 5);
  for (const bad of [null, 5, 'x', { v: 99 }, { v: 1, flakes: 'lots', slots: { fox: 99, hack: 7 }, owned: ['gold', 'fish'], open: 9, req: [{ type: 'evil' }] }]) {
    const B = L.restore(c, bad); assert.ok(B.flakes >= 0 && B.open >= 1 && B.open <= c.areas.length);
    assert.ok(!('hack' in B.slots)); assert.ok(!B.owned.includes('gold'));
  }
  assert.equal(L.restore(c, { v: 1, open: 3 }).open, 1, 'open areas never exceed what the stamps allow');
});

test('a late save is merged with this session, nothing lost', () => {
  const c = cfg(), now = L.createState(c); L.applyPhoto(c, now, { id: 'hare', stars: 1 });
  const saved = L.serialize(c, (() => { const S = L.createState(c); L.applyPhoto(c, S, { id: 'fox', stars: 3, inPose: true }); return S; })());
  const M = L.merge(c, saved, now);
  assert.equal(M.slots.fox, 7); assert.equal(M.slots.hare, 1); assert.ok(M.flakes >= now.flakes + saved.flakes);
});

test('a late save keeps tutorial steps from both sides and drops a corrupt request', () => {
  const c = cfg(), now = L.createState(c); now.ftue = 4;
  const S0 = L.createState(c); S0.ftue = 3; const saved = L.serialize(c, S0);
  saved.req = [{ type: 'area', arg: 99, done: false }, { type: 'species', arg: 'nobody', done: false }];
  const M = L.merge(c, saved, now);
  assert.equal(M.ftue, 7, 'bit flags are joined, not maxed');
  assert.equal(M.req.length, 0, 'requests with a bad target are dropped');
});

test('tutorial: steps in order, done steps skipped, finished once', () => {
  const S = { ftue: 0, ftueDone: false };
  assert.equal(L.ftueNow(S), 'walk');
  assert.equal(L.ftueDo(S, 'snap'), 'walk', 'a step done early is skipped later');
  assert.equal(L.ftueDo(S, 'walk'), 'book');
  for (const n of ['book', 'treat', 'pose']) L.ftueDo(S, n);
  assert.equal(L.ftueNow(S), 'gate'); assert.equal(L.ftueDo(S, 'gate'), null); assert.ok(S.ftueDone);
});

test('tap vs drag', () => {
  const c = cfg();
  assert.equal(L.tapOrDrag(c, 4, 120), 'tap'); assert.equal(L.tapOrDrag(c, 30, 120), 'drag'); assert.equal(L.tapOrDrag(c, 4, 400), 'drag');
});

test('guide: tutorial > rare > gate > nearest animal with an empty slot', () => {
  const S = { slots: { a: 7 } }, an = [{ id: 'a', x: 1, z: 0, avail: true }, { id: 'b', x: 5, z: 0, avail: true }, { id: 'c', x: 2, z: 0, avail: false }];
  assert.equal(L.guideTarget(S, { hero: [0, 0], animals: an }).id, 'b');
  assert.equal(L.guideTarget(S, { hero: [0, 0], animals: an, gate: { g: 1 } }).g, 1);
  assert.equal(L.guideTarget(S, { hero: [0, 0], animals: an, gate: { g: 1 }, rare: { r: 1 } }).r, 1);
  assert.equal(L.guideTarget(S, { hero: [0, 0], animals: an, rare: { r: 1 }, ftue: { f: 1 } }).f, 1);
});

test('edge arrow sits on the hero-to-goal ray and points toward the goal', () => {
  assert.equal(L.edgeArrow([0.5, 0.7], [0.6, 0.4]), null, 'on screen: no arrow');
  const a = L.edgeArrow([0.5, 0.7], [0.5, -0.6]);
  assert.ok(Math.abs(a.x - 0.5) < 1e-9 && Math.abs(a.y - 0.08) < 1e-9); assert.ok(Math.abs(a.a + Math.PI / 2) < 1e-9, 'points up');
  const r = L.edgeArrow([0.5, 0.7], [1.8, 0.7]); assert.ok(Math.abs(r.x - 0.92) < 1e-9 && Math.abs(r.a) < 1e-9, 'points right');
});

test('walkable: start is walkable, the closed lake is not, it opens with the gate', () => {
  const c = cfg();
  assert.ok(L.walkable(c, 1, 0, 0)); assert.ok(!L.walkable(c, 1, 0, -80)); assert.ok(L.walkable(c, 2, 0, -80));
  assert.ok(!L.walkable(c, 1, 0, -38) && L.walkable(c, 2, 0, -38), 'gate corridor');
  for (const s of c.species) assert.ok(L.walkable(c, 3, s.home[0], s.home[1]) || s.perch || s.type === 'whale', s.id + ' home is reachable');
  for (const r of c.rares) assert.ok(L.walkable(c, r.area + 1, r.home[0], r.home[1]), r.id + ' home is reachable');
  const [x, z] = L.slide(c, 1, 0, -30, 0, -20); assert.ok(L.walkable(c, 1, x, z));
});

test('terrain: flat-ish valley floor, walls outside, flat lake', () => {
  const c = cfg();
  assert.ok(Math.abs(L.terrainH(c, 0, 0)) < 1.5); assert.ok(L.terrainH(c, 50, 0) > 8);
  const lk = c.areas[1].lake; assert.ok(Math.abs(L.terrainH(c, lk[0], lk[1]) + 0.15) < 1e-6);
});

test('quality steps down after 2 s slow, never bounces back up after a drop', () => {
  const c = cfg(), q = { tier: 2, low: 0, high: 0 };
  for (let i = 0; i < 25; i++) L.qualityStep(c, q, 40, 0.1);
  assert.equal(q.tier, 1);
  for (let i = 0; i < 200; i++) L.qualityStep(c, q, 60, 0.1);
  assert.equal(q.tier, 1);
  const u = { tier: 0, low: 0, high: 0 }; for (let i = 0; i < 120; i++) L.qualityStep(c, u, 60, 0.1); assert.equal(u.tier, 1);
});

test('config: every string key exists in all 7 languages; every species has a name', () => {
  const c = cfg(), en = Object.keys(c.strings.en);
  for (const l of ['ar', 'es', 'vi', 'hi', 'bn', 'id']) for (const k of en) assert.ok(c.strings[l][k], l + ' ' + k);
  for (const s of [...c.species, ...c.rares]) assert.ok(c.strings.en['s_' + s.id], s.id);
  for (const r of c.rares) assert.ok(L.speciesById(c, r.base), r.id + ' base');
  assert.equal(c.species.length, 24);
});
