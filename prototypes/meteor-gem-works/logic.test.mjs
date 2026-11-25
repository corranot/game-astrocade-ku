// PROTOTYPE - NOT FOR PRODUCTION
// Rules tests for Meteor Gem Works (node --test). Plan: plan.md §10 and §11 (fix A: the guide never dead-ends).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as L from './logic.js';

const cfg = () => JSON.parse(fs.readFileSync(new URL('./game_config.json', import.meta.url)));

/** Plays the game with the bot for sec seconds at 60 Hz; returns the state and every event. */
function play(c, sec, seed) {
  const S = L.createState(c, seed), all = [];
  for (let i = 0; i < sec * 60; i++) {
    const b = L.botInput(c, S);
    L.step(c, S, 1 / 60, b, S.glint && S.glint.t > 0.6 ? { glint: true } : null);
    all.push(...S.events); S.events.length = 0;
  }
  return { S, all };
}

const REWARDS = ['unlock', 'hatch', 'orderDone', 'rush', 'bus'];

test('3 chunks make 1 gem, and the counter fills', () => {
  const c = cfg(), S = L.createState(c);
  S.pols[0].polIn = 7; S.counter = 0;
  for (let i = 0; i < 60 * 3; i++) L.step(c, S, 1 / 60);
  assert.equal(S.counter, 2); assert.equal(S.pols[0].polIn, 1);
});

test('carry never exceeds the cap, Pebble adds to it', () => {
  const c = cfg(), S = L.createState(c);
  S.pile = 50; S.hero.x = c.world.pile.x; S.hero.z = c.world.pile.z;
  for (let i = 0; i < 60 * 4; i++) L.step(c, S, 1 / 60);
  assert.equal(S.hero.n, c.hero.carry);
  S.critters.push({ id: 'pebble', x: 0, z: 0, vx: 0, vz: 0, face: 0 });
  for (let i = 0; i < 60 * 2; i++) L.step(c, S, 1 / 60);
  assert.equal(S.hero.n, c.hero.carry + c.critters.find((q) => q.id === 'pebble').v);
});

test('the guide only ever points at a station that would do something (fix A)', () => {
  const c = cfg(), r = L.rng(5), kinds = [null, 'chunk', 'gem', 'ring'];
  for (let i = 0; i < 4000; i++) {
    const S = L.createState(c, i);
    S.pile = Math.floor(r() * 61); S.counter = Math.floor(r() * 17); S.cashPile = Math.floor(r() * 20);
    for (const p of S.pols) p.polIn = Math.floor(r() * 31);
    for (const s of S.stands) s.items = Array(Math.floor(r() * 9)).fill('gem');
    S.ws.gemsIn = Math.floor(r() * 13); S.ws.rings = Math.floor(r() * 9);
    const kind = kinds[Math.floor(r() * 4)]; S.hero.kind = kind; S.hero.n = kind ? 1 + Math.floor(r() * 20) : 0; S.hero.cash = Math.floor(r() * 120);
    const built = Math.floor(r() * 8);
    S.pads.forEach((p, j) => { p.done = j < built; p.shown = j <= built; });
    if (r() < 0.2) S.egg.st = 'waiting';
    if (r() < 0.3) S.order = { kind: r() < 0.5 ? 'gem' : 'ring', n: 3 };
    S.hero.x = -6 + r() * 12; S.hero.z = r() * 9;
    const g = L.guide(c, S);
    assert.ok(g, 'always a target');
    const full = S.stands.every((s) => s.items.length >= c.world.standCap);
    assert.ok(L.useful(c, S, g.what) || (g.wait && full), `guide -> ${g.what} must be useful (kind ${kind} n ${S.hero.n} built ${built})`);
  }
});

test('stations never jam: holding chunks with every polisher full, the crate takes them', () => {
  const c = cfg(), S = L.createState(c);
  S.pads.forEach((p) => { p.done = p.shown = true; });
  S.hero.kind = 'chunk'; S.hero.n = 10; S.pols.forEach((p) => { p.polIn = c.world.polisherCap; }); S.counter = c.world.counter.cap; S.cashPile = 0;
  assert.equal(L.guide(c, S).what, 'crate');
});

test('an unbuilt pad that shares its id with a station points at the pad', () => {
  const c = cfg(), S = L.createState(c), d = c.pads.find((p) => p.id === 'stand2');
  S.pads.find((p) => p.id === 'stand2').shown = true; S.hero.cash = 5;
  assert.ok(L.useful(c, S, 'stand2'));
  assert.deepEqual(L.spot(c, 'stand2', S), { x: d.x, z: d.z });
});

test('bot plays 4 min: first sale early, all 7 unlocks by ~3:50, a reward at least every 45 s', () => {
  const c = cfg();
  for (const seed of [1, 2, 3]) {
    const { S, all } = play(c, 240, seed);
    const sale = all.find((e) => e.type === 'sale');
    assert.ok(sale && sale.t < 25, `first sale by 25 s (seed ${seed}): ${sale && sale.t.toFixed(1)}`);
    const unlocks = all.filter((e) => e.type === 'unlock').map((e) => e.id);
    assert.deepEqual(unlocks, c.pads.map((p) => p.id), `unlock order (seed ${seed})`);
    const laser = all.find((e) => e.type === 'unlock' && e.id === 'laser');
    assert.ok(laser.t < 230, `laser by 3:50 (seed ${seed}): ${laser.t.toFixed(1)}`);
    let last = 0, worst = 0;
    for (const e of all) if (REWARDS.includes(e.type)) { worst = Math.max(worst, e.t - last); last = e.t; }
    assert.ok(worst <= 45, `longest gap between rewards ${worst.toFixed(1)} s (seed ${seed})`);
    assert.ok(S.critters.length >= 3, `critters hatched (seed ${seed}): ${S.critters.length}`);
    assert.ok(all.some((e) => e.type === 'orderDone') && all.some((e) => e.type === 'rush') && all.some((e) => e.type === 'bus') && all.some((e) => e.type === 'ring'), `orders, Rush, bus and rings all happen (seed ${seed})`);
  }
});

test('save round trip keeps progress, and restore rejects junk', () => {
  const c = cfg(), { S } = play(c, 150, 4), d = JSON.parse(JSON.stringify(L.serialize(c, S))), R = L.restore(c, d, 9);
  assert.deepEqual(L.serialize(c, R), L.serialize(c, S));
  assert.deepEqual(L.restore(c, { v: -1 }).pads, L.createState(c).pads);
  const J = L.restore(c, { v: c.save.version, cash: 1e99, pile: -4, counter: 'x', pols: [999], stands: [['gem', 'bomb']], critters: ['pebble', 'pebble', 'nope'], kind: 'chunk', n: 500, pads: [[1e9, 1]] });
  assert.equal(J.hero.cash, 1e9); assert.equal(J.pile, 0); assert.equal(J.counter, c.start.counter);
  assert.equal(J.pols[0].polIn, c.world.polisherCap); assert.deepEqual(J.stands[0].items, ['gem']);
  assert.equal(J.critters.length, 1); assert.equal(J.hero.n, L.carryCap(c, J)); assert.equal(J.pads[0].paid, J.pads[0].price);
});

test('a restored game keeps playing: the bot reaches the next unlock', () => {
  const c = cfg(), { S } = play(c, 60, 2), R = L.restore(c, L.serialize(c, S), 3);
  const next = R.pads.find((p) => !p.done);
  for (let i = 0; i < 90 * 60 && !next.done; i++) { L.step(c, R, 1 / 60, L.botInput(c, R)); R.events.length = 0; }
  assert.ok(next.done, `${next.id} built after restore`);
});

test('adaptQuality drops scale then tier, and climbs back', () => {
  const q = cfg().quality; let s = { tier: 2, rs: 1, okT: 0, fails: [] };
  for (let i = 0; i < 4; i++) s = L.adaptQuality(q, s, 40, 2);
  assert.equal(s.tier, 1);
  for (let i = 0; i < 40; i++) s = L.adaptQuality(q, s, 10, 2);
  assert.equal(s.tier, 2); assert.equal(s.rs, 1);
});

test('time of day blends between keys', () => {
  const k = cfg().tod.keys, m = L.todBlend(k, 0.25);
  assert.equal(m.a.t, 0); assert.equal(m.b.t, 0.5); assert.ok(Math.abs(m.k - 0.5) < 1e-9);
});
