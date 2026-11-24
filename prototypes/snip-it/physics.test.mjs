// PROTOTYPE - NOT FOR PRODUCTION
// Node tests for the rules that must never fail: every rope of every level, cut at any moment and at any link,
// brings its thing to its goal by itself in time. Usage: node physics.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createWorld, step, cut, hitRope, remove, reset, setGoal, segDist, STEP } from './physics.js';
import { LEVELS, WORLDS, buildLevel, allStickers, stickerId } from './levels.js';
import { SPECIES, COMMON } from './models3d.js';

const WAITS = [0, 0.37, 1.1, 2.9, 6.3]; // seconds of sway before the cut
const MAX_ARRIVE = 2.0;

/** Plays level i: waits, cuts rope id at link seg, returns the seconds until its thing arrives (or null). */
function arrive(i, id, wait, seg, tune) {
  const W = createWorld(buildLevel(i), tune);
  for (let t = 0; t < wait; t += STEP) step(W);
  assert.ok(cut(W, id, seg), 'cut works');
  for (let t = 0; t < 4; t += STEP) for (const e of step(W)) if (e.type === 'arrive' && e.id === id) return { t, late: e.late, W };
  return null;
}

test('every level has one win, two gags and three different stickers', () => {
  for (const l of LEVELS) {
    assert.ok(l.items.length === 3 || l.items.length === 4, l.id + ' has 3 or 4 ropes');
    assert.equal(l.items.filter((x) => x.result === 'win').length, 1, l.id);
    assert.equal(l.items.filter((x) => x.result === 'gag').length, l.items.length - 1, l.id);
    assert.equal(new Set(l.items.map((x) => x.sticker)).size, l.items.length, l.id);
    assert.equal(new Set(l.items.map((x) => x.rope.color)).size, l.items.length, l.id + ' rope colours differ');
    assert.equal(new Set(l.items.map((x) => x.id)).size, l.items.length, l.id + ' item ids differ');
    for (const it of l.items) assert.ok(it.goal && it.fx && it.sound && it.react, l.id + '/' + it.id);
  }
  const n = LEVELS.reduce((a, l) => a + l.items.length + l.items.filter((x) => x.early).length, 0);
  assert.equal(allStickers().length, n);
  assert.equal(new Set(allStickers().map((s) => s.id)).size, n);
  assert.equal(new Set(LEVELS.map((l) => l.id)).size, LEVELS.length, 'level ids differ');
  assert.equal(stickerId(LEVELS[0], LEVELS[0].items[0]), 'kitty_cat');
});

test('every rope, cut at any time and any link, lands its thing on its goal within 2 s', () => {
  LEVELS.forEach((l, i) => {
    for (const it of l.items) for (const wait of WAITS) for (const seg of [0, 3, 6]) {
      const r = arrive(i, it.id, wait, seg);
      assert.ok(r, `${l.id}/${it.id} wait ${wait} seg ${seg}: arrives`);
      assert.equal(r.late, false, `${l.id}/${it.id} wait ${wait} seg ${seg}: reaches the goal, not the time-out`);
      assert.ok(r.t <= MAX_ARRIVE, `${l.id}/${it.id} wait ${wait} seg ${seg}: ${r.t.toFixed(2)} s`);
    }
  });
});

test('the creator gravity setting keeps every rope working', () => {
  for (const g of [0.6, 1.5]) LEVELS.forEach((l, i) => { for (const it of l.items) for (const wait of WAITS) for (const seg of [0, 3, 6]) { const r = arrive(i, it.id, wait, seg, { gravityScale: g }); assert.ok(r && !r.late, `${l.id}/${it.id} gravity ${g} wait ${wait} seg ${seg}`); } });
});

test('uncut things keep hanging, and cutting one rope leaves the others alone', () => {
  LEVELS.forEach((l, i) => {
    const W = createWorld(buildLevel(i)), y0 = W.bodies.map((b) => W.pts[b.p].y);
    for (let t = 0; t < 8; t += STEP) step(W);
    W.bodies.forEach((b, k) => assert.ok(Math.abs(W.pts[b.p].y - y0[k]) < 0.35 && Math.abs(W.pts[b.p].x - l.items[k].body.x) < 0.5, `${l.id}/${b.id} hangs still`));
    cut(W, l.items[0].id, 2);
    for (let t = 0; t < 3; t += STEP) step(W);
    for (let k = 1; k < W.bodies.length; k++) assert.ok(Math.abs(W.pts[W.bodies[k].p].y - y0[k]) < 0.35, `${l.id}: ${W.bodies[k].id} still hangs`);
    assert.equal(cut(W, l.items[0].id, 2), false, 'a rope is cut once');
  });
});

test('nothing leaves the stage or goes not-a-number, in any cut order', () => {
  LEVELS.forEach((l, i) => {
    for (const order of [[0, 1, 2, 3], [3, 2, 1, 0], [1, 0, 3, 2]].map((o) => o.filter((k) => k < l.items.length))) {
      const W = createWorld(buildLevel(i));
      for (const k of order) { cut(W, l.items[k].id, k * 2); for (let t = 0; t < 3; t += STEP) for (const e of step(W)) if (e.type === 'arrive' && l.items.find((x) => x.id === e.id).pop) remove(W, e.id); }
      for (const b of W.bodies) { if (b.gone) continue; const p = W.pts[b.p]; assert.ok(Number.isFinite(p.x) && Number.isFinite(p.y), `${l.id}/${b.id} finite`); assert.ok(p.x > -3.4 && p.x < 3.4 && p.y >= b.r - 0.01 && p.y < 10, `${l.id}/${b.id} on stage at ${p.x.toFixed(2)}, ${p.y.toFixed(2)}`); }
      for (const p of W.pts) assert.ok(Number.isFinite(p.x) && Number.isFinite(p.y));
    }
  });
});

test('a swipe across a rope finds it; a swipe through empty air finds nothing', () => {
  const W = createWorld(buildLevel(0));
  for (let t = 0; t < 1; t += STEP) step(W);
  const h = hitRope(W, -0.8, 7.2, 0.8, 7.2, 0.12);
  assert.equal(h && h.id, 'cat');
  assert.equal(hitRope(W, -1.2, 7.2, -0.9, 7.4, 0.12), null);
  assert.equal(hitRope(W, -2.2, 7.5, -2.1, 7.5, 0.3).id, 'water', 'a tap beside a rope counts');
  assert.ok(Math.abs(segDist(0, 0, 2, 0, 1, 1, 1, 3).d - 1) < 1e-9);
});

test('the same cuts give the same result every time', () => {
  const i = LEVELS.findIndex((l) => l.id === 'bath');
  const run = () => { const r = arrive(i, 'flour', 1.1, 3); const p = r.W.pts[r.W.bodies[0].p]; return [r.t, p.x, p.y]; };
  assert.deepEqual(run(), run());
});

test('edits move a hook and a thing, and ignore bad numbers', () => {
  const l = buildLevel(0, { kitty: { cat: { ax: 0.5, y: 5, x: 'bad' } } });
  assert.equal(l.items[0].rope.ax, 0.5); assert.equal(l.items[0].body.y, 5); assert.equal(l.items[0].body.x, 0);
  assert.equal(LEVELS[0].items[0].rope.ax, 0, 'the source level is untouched');
});

test('a thing cut before its turn goes to its early place and can be hung back whole', () => {
  const W = createWorld(buildLevel(0)), id = LEVELS[0].items[0].id, p = () => W.pts[W.bodies[0].p], y0 = p().y;
  for (let t = 0; t < 1; t += STEP) step(W);
  cut(W, id, 2); setGoal(W, id, { x: 2.15, y: 1.41, r: 0.5 }); // on the drum
  let got = null; for (let t = 0; t < 3 && !got; t += STEP) for (const e of step(W)) if (e.type === 'arrive') got = e;
  assert.ok(got && !got.late && Math.abs(p().x - 2.15) < 0.6, 'lands at the early place');
  reset(W, id);
  assert.equal(W.ropes[0].cut, false); assert.ok(Math.abs(p().y - y0) < 1e-9);
  for (let t = 0; t < 4; t += STEP) step(W);
  assert.ok(Math.abs(p().y - y0) < 0.35, 'hangs again');
  assert.ok(cut(W, id, 2), 'and can be cut again');
  got = null; for (let t = 0; t < 3 && !got; t += STEP) for (const e of step(W)) if (e.type === 'arrive') got = e;
  assert.ok(got && !got.late && Math.abs(p().x - LEVELS[0].items[0].goal.x) < 0.6, 'its own goal is back');
});

test('a tied balloon stays put, and flies up and away when its rope is cut', () => {
  const i = LEVELS.findIndex((l) => l.items.some((x) => x.body.lift)), l = LEVELS[i], it = l.items.find((x) => x.body.lift);
  const W = createWorld(buildLevel(i)), b = W.bodies.find((x) => x.id === it.id), p = W.pts[b.p];
  for (let t = 0; t < 6; t += STEP) step(W);
  assert.ok(Math.abs(p.x - it.body.x) < 0.3 && Math.abs(p.y - it.body.y) < 0.3, `tied: stays at ${p.x.toFixed(2)}, ${p.y.toFixed(2)}`);
  cut(W, it.id, 1); let top = 0; for (let t = 0; t < 2; t += STEP) { step(W); top = Math.max(top, p.y); }
  assert.ok(top > it.body.y + 4, 'cut: it rises');
});

test('worlds: five levels each, model names used once in the whole game, every model and prompt exists', async () => {
  const strings = JSON.parse((await import('node:fs')).readFileSync(new URL('./game_config.json', import.meta.url), 'utf8')).strings;
  const names = new Map();
  for (const w of WORLDS) { assert.equal(w.levels.length, 5, w.id + ' has five levels'); assert.ok(w.icon && w.wall && w.floor.length === 2, w.id + ' has an icon, a wall and a floor');
    for (const n of Object.keys(w.models || {})) { assert.ok(!names.has(n) && !SPECIES[n] && !COMMON.includes(n), `model ${n} of ${w.id} is also in ${names.get(n) || 'the shared models'}`); names.set(n, w.id); } }
  const known = (m) => SPECIES[m] || COMMON.includes(m) || names.has(m);
  for (const l of LEVELS) {
    for (const lang of Object.keys(strings)) assert.ok(strings[lang][l.prompt], `${l.id}: prompt ${l.prompt} in ${lang}`);
    for (const it of l.items) { assert.ok(known(it.body.model), `${l.id}/${it.id}: model ${it.body.model}`); if (it.needs) assert.ok(l.items.some((x) => x.id === it.needs && x.id !== it.id) && it.early && it.early.goal && it.early.sticker, `${l.id}/${it.id}: needs a real other rope and an early ending`); }
    for (const p of l.props || []) assert.ok(known(p.model), `${l.id}: prop ${p.model}`);
    if (typeof l.hero === 'object') assert.ok(known(l.hero.model), `${l.id}: hero ${l.hero.model}`); else assert.ok(l.items.some((x) => x.id === l.hero), `${l.id}: hero rope`);
    for (const it of l.items) assert.ok(it.rope.ay > 8.4 || it.body.lift, `${l.id}/${it.id}: hangs from the ceiling or is a balloon`);
  }
});

test('a thing cut before its turn reaches its early place in every level that has one', () => {
  let n = 0;
  LEVELS.forEach((l, i) => { for (const it of l.items) { if (!it.early) continue; n++;
    for (const wait of WAITS) { const W = createWorld(buildLevel(i)); for (let t = 0; t < wait; t += STEP) step(W);
      cut(W, it.id, 3); setGoal(W, it.id, it.early.goal);
      let got = null; for (let t = 0; t < 4 && !got; t += STEP) for (const e of step(W)) if (e.type === 'arrive' && e.id === it.id) got = { t, late: e.late };
      assert.ok(got && !got.late && got.t <= MAX_ARRIVE, `${l.id}/${it.id} early, wait ${wait}`); } } });
  assert.ok(n >= 5, 'the game has levels with an order');
});
