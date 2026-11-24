// PROTOTYPE - NOT FOR PRODUCTION
// Node tests for the rules that must never fail: every rope of every level, cut at any moment and at any link,
// brings its thing to its goal by itself in time. Usage: node physics.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createWorld, step, cut, hitRope, remove, segDist, STEP } from './physics.js';
import { LEVELS, buildLevel, allStickers, stickerId } from './levels.js';

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
    assert.equal(l.items.length, 3, l.id);
    assert.equal(l.items.filter((x) => x.result === 'win').length, 1, l.id);
    assert.equal(l.items.filter((x) => x.result === 'gag').length, 2, l.id);
    assert.equal(new Set(l.items.map((x) => x.sticker)).size, 3, l.id);
    assert.equal(new Set(l.items.map((x) => x.rope.color)).size, 3, l.id + ' rope colours differ');
    for (const it of l.items) assert.ok(it.goal && it.fx && it.sound && it.react, l.id + '/' + it.id);
  }
  assert.equal(allStickers().length, LEVELS.length * 3);
  assert.equal(new Set(allStickers().map((s) => s.id)).size, LEVELS.length * 3);
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
  for (const g of [0.6, 1.6]) LEVELS.forEach((l, i) => { for (const it of l.items) { const r = arrive(i, it.id, 1, 2, { gravityScale: g }); assert.ok(r && !r.late, `${l.id}/${it.id} gravity ${g}`); } });
});

test('uncut things keep hanging, and cutting one rope leaves the others alone', () => {
  LEVELS.forEach((l, i) => {
    const W = createWorld(buildLevel(i)), y0 = W.bodies.map((b) => W.pts[b.p].y);
    for (let t = 0; t < 8; t += STEP) step(W);
    W.bodies.forEach((b, k) => assert.ok(Math.abs(W.pts[b.p].y - y0[k]) < 0.35 && Math.abs(W.pts[b.p].x - l.items[k].body.x) < 0.5, `${l.id}/${b.id} hangs still`));
    cut(W, l.items[0].id, 2);
    for (let t = 0; t < 3; t += STEP) step(W);
    for (const k of [1, 2]) assert.ok(Math.abs(W.pts[W.bodies[k].p].y - y0[k]) < 0.35, `${l.id}: ${W.bodies[k].id} still hangs`);
    assert.equal(cut(W, l.items[0].id, 2), false, 'a rope is cut once');
  });
});

test('nothing leaves the stage or goes not-a-number, in any cut order', () => {
  LEVELS.forEach((l, i) => {
    for (const order of [[0, 1, 2], [2, 1, 0], [1, 0, 2]]) {
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
  const run = () => { const r = arrive(1, 'flour', 1.1, 3); const p = r.W.pts[r.W.bodies[0].p]; return [r.t, p.x, p.y]; };
  assert.deepEqual(run(), run());
});

test('edits move a hook and a thing, and ignore bad numbers', () => {
  const l = buildLevel(0, { kitty: { cat: { ax: 0.5, y: 5, x: 'bad' } } });
  assert.equal(l.items[0].rope.ax, 0.5); assert.equal(l.items[0].body.y, 5); assert.equal(l.items[0].body.x, 0);
  assert.equal(LEVELS[0].items[0].rope.ax, 0, 'the source level is untouched');
});
