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

test('3 chunks make 1 gem, and the counter fills', () => {
  const c = cfg(), S = L.createState(c);
  S.polIn = 7; S.counter = 0;
  for (let i = 0; i < 60 * 3; i++) L.step(c, S, 1 / 60);
  assert.equal(S.counter, 2); assert.equal(S.polIn, 1);
});

test('carry never exceeds the cap, critter perk adds to it', () => {
  const c = cfg(), S = L.createState(c);
  S.pile = 50; S.hero.x = c.world.pile.x; S.hero.z = c.world.pile.z;
  for (let i = 0; i < 60 * 4; i++) L.step(c, S, 1 / 60);
  assert.equal(S.hero.n, c.hero.carry);
  S.critter = { x: 0, z: 0, vx: 0, vz: 0, face: 0 };
  for (let i = 0; i < 60 * 2; i++) L.step(c, S, 1 / 60);
  assert.equal(S.hero.n, c.hero.carry + c.egg.carryBonus);
});

test('the guide only ever points at a station that would do something (fix A)', () => {
  const c = cfg(), r = L.rng(5);
  for (let i = 0; i < 4000; i++) {
    const S = L.createState(c, i);
    S.pile = Math.floor(r() * 61); S.polIn = Math.floor(r() * 31); S.counter = Math.floor(r() * 13); S.stand = Math.floor(r() * 9); S.cashPile = Math.floor(r() * 20);
    const kind = [null, 'chunk', 'gem'][Math.floor(r() * 3)]; S.hero.kind = kind; S.hero.n = kind ? 1 + Math.floor(r() * 20) : 0; S.hero.cash = Math.floor(r() * 30);
    S.pads[0].shown = r() < 0.7; S.pads[0].done = r() < 0.2; if (r() < 0.2) S.egg.st = 'waiting';
    S.hero.x = -6 + r() * 12; S.hero.z = r() * 9;
    const g = L.guide(c, S);
    assert.ok(g, 'always a target');
    assert.ok(L.useful(c, S, g.what) || (g.wait && S.stand >= c.world.stand.cap), `guide -> ${g.what} must be useful (kind ${kind} n ${S.hero.n} pol ${S.polIn} stand ${S.stand} pile ${S.pile})`);
  }
});

test('stations never jam: holding chunks with a full polisher, the crate takes them', () => {
  const c = cfg(), S = L.createState(c);
  S.hero.kind = 'chunk'; S.hero.n = 10; S.polIn = c.world.polisher.cap; S.counter = c.world.counter.cap; S.cashPile = 0;
  const g = L.guide(c, S); assert.equal(g.what, 'crate');
});

test('bot plays 90 s: sells, buys the drill rig, hatches the egg, never stalls over 20 s', () => {
  const c = cfg();
  for (const seed of [1, 2, 3]) {
    const { S, all } = play(c, 90, seed);
    let last = 0, worst = 0;
    for (const e of all) if (['sale', 'gem', 'unlock', 'hatch', 'perfect', 'hit'].includes(e.type)) { worst = Math.max(worst, e.t - last); last = e.t; }
    assert.ok(worst < 20, `longest gap ${worst.toFixed(1)} s (seed ${seed})`);
    const unlock = all.find((e) => e.type === 'unlock'), hatch = all.find((e) => e.type === 'hatch'), sale = all.find((e) => e.type === 'sale');
    assert.ok(sale && sale.t < 25, `first sale by 25 s (seed ${seed}): ${sale && sale.t.toFixed(1)}`);
    assert.ok(unlock && unlock.t < 45, `drill rig by 45 s (seed ${seed}): ${unlock && unlock.t.toFixed(1)}`);
    assert.ok(hatch && hatch.t < 40, `egg hatched by 40 s (seed ${seed}): ${hatch && hatch.t.toFixed(1)}`);
    assert.ok(S.critter);
  }
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
