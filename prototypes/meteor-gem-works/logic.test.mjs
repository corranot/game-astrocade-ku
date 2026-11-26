// PROTOTYPE - NOT FOR PRODUCTION
// Rules tests for Meteor Gem Works (node --test). Plan: plan.md §10, §11 (fix A: the guide never dead-ends) and §12 (M2, M3) and the post-launch drops (updates.md).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as L from './logic.js';

/** The config as the game sees it: content drops off unless named in `on` (e.g. { night: true }). */
const cfg = (on = {}) => { const c = JSON.parse(fs.readFileSync(new URL('./game_config.json', import.meta.url))); Object.assign(c.drops, on); return L.applyDrops(c); };

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

const REWARDS = L.REWARDS;

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
    assert.deepEqual(unlocks.slice(0, 7), c.pads.slice(0, 7).map((p) => p.id), `unlock order (seed ${seed})`);
    const laser = all.find((e) => e.type === 'unlock' && e.id === 'laser');
    assert.ok(laser.t < 230, `laser by 3:50 (seed ${seed}): ${laser.t.toFixed(1)}`);
    let last = 0, worst = 0;
    for (const e of all) if (REWARDS.includes(e.type)) { worst = Math.max(worst, e.t - last); last = e.t; }
    assert.ok(worst <= 45, `longest gap between rewards ${worst.toFixed(1)} s (seed ${seed})`);
    assert.ok(S.critters.length >= 3, `critters hatched (seed ${seed}): ${S.critters.length}`);
    assert.ok(all.some((e) => e.type === 'orderDone') && all.some((e) => e.type === 'rush') && all.some((e) => e.type === 'bus') && all.some((e) => e.type === 'ring'), `orders, Rush, bus and rings all happen (seed ${seed})`);
  }
});

test('chapter 1 with the bot: all 14 unlocks in order, the ghost town, 3 stars, the finale by ~11 min, no quiet spell over 45 s', () => {
  const c = cfg();
  for (const seed of [1, 2, 3]) {
    const { S, all } = play(c, 680, seed), at = (type, id) => all.find((e) => e.type === type && (!id || e.id === id));
    assert.deepEqual(all.filter((e) => e.type === 'unlock').map((e) => e.id), c.pads.map((p) => p.id), `unlock order (seed ${seed})`);
    assert.ok(at('unlock', 'heart').t < 660, `heart by 11:00 (seed ${seed}): ${at('unlock', 'heart').t.toFixed(0)}`);
    assert.ok(at('finaleEnd') && S.done1, `the finale plays to its end (seed ${seed})`);
    assert.equal(all.filter((e) => e.type === 'ghostLight').length, c.cart.lights, `ghost town lit (seed ${seed})`);
    assert.ok(at('districtDone'), `district goal done (seed ${seed})`);
    assert.deepEqual(S.stars.slice().sort(), ['critters', 'orders', 'town'], `3 town stars (seed ${seed})`);
    assert.ok(S.hats.length >= 5 && S.hats.includes('crown'), `hats (seed ${seed}): ${S.hats}`);
    assert.ok(S.critters.length >= 10 && S.critters.some((q) => q.id === 'nova'), `critters (seed ${seed}): ${S.critters.length}`);
    assert.ok(at('crown') && at('rig2Hit'), `crowns ship and rig 2 drills (seed ${seed})`);
    let last = 0, worst = 0;
    for (const e of all) if (REWARDS.includes(e.type)) { worst = Math.max(worst, e.t - last); last = e.t; }
    assert.ok(worst <= 45, `longest gap between rewards ${worst.toFixed(1)} s (seed ${seed})`);
  }
});

test('perks add up or multiply over the parade; Nova and the stargazer deck raise prices', () => {
  const c = cfg(), S = L.createState(c);
  S.critters = ['pebble', 'nugget'].map((id) => ({ id, x: 0, z: 0, vx: 0, vz: 0, face: 0 }));
  assert.equal(L.carryCap(c, S), c.hero.carry + 10);
  const base = L.price(c, S, 'gem');
  S.critters.push({ id: 'nova', x: 0, z: 0, vx: 0, vz: 0, face: 0 }); S.pads.find((p) => p.id === 'stargaze').done = true;
  assert.equal(L.price(c, S, 'gem'), base + c.stargaze.bonus + 1);
});

test('eggs: legendary never hatches from an egg, and a rare one comes by the pity count', () => {
  const c = cfg();
  for (let seed = 1; seed <= 20; seed++) {
    const S = L.createState(c, seed), got = [];
    S.critters.push({ id: 'pebble', x: 0, z: 0, vx: 0, vz: 0, face: 0 });
    for (let k = 0; k < 11; k++) {
      S.egg = { st: 'hatching', t: 99, at: 0, who: S.egg.who };
      if (k === 0) { S.egg.who = 'sparky'; }
      L.step(c, S, 1 / 60, { x: 0, z: 0 }); got.push(...S.events.filter((e) => e.type === 'hatch').map((e) => e.who)); S.events.length = 0;
      if (!S.egg.who) break;
    }
    assert.ok(!got.includes('nova'), 'no legendary from eggs');
    const firstRare = got.findIndex((id) => c.critters.find((q) => q.id === id).rarity === 'rare');
    assert.ok(firstRare >= 0 && firstRare <= c.egg.pity, `a rare by egg ${c.egg.pity + 1} (seed ${seed}): ${got.join(',')}`);
  }
});

test('the mine cart: a full cart lights a ghost town house and pays; the guide takes gems there first', () => {
  const c = cfg(), S = L.createState(c);
  S.pads.forEach((p) => { if (p.id === 'ghost') p.done = true; }); S.sold = 1;
  Object.assign(S.hero, { x: c.world.cart.x, z: c.world.cart.z, kind: 'gem', n: c.cart.cap });
  assert.equal(L.guide(c, S).what, 'cart');
  const ev = [];
  for (let i = 0; i < (c.cart.trip + 1) * 60; i++) { L.step(c, S, 1 / 60, { x: 0, z: 0 }); ev.push(...S.events); S.events.length = 0; }
  assert.ok(ev.some((e) => e.type === 'cartGo'));
  const lit = ev.find((e) => e.type === 'ghostLight');
  assert.ok(lit && lit.i === 0 && lit.pay === c.cart.cap * c.cart.pay + c.cart.tip, JSON.stringify(lit));
  assert.equal(S.ghost.lit, 1);
});

test('the town gets later in the day as the chapter goes on', () => {
  const c = cfg(), S = L.createState(c);
  assert.equal(L.todGoal(c, S), c.tod.start);
  S.pads.find((p) => p.id === 'neon').done = true;
  assert.equal(L.todGoal(c, S), c.tod.byPad.neon);
});

test('save round trip keeps progress, and restore rejects junk', () => {
  const c = cfg(), { S } = play(c, 150, 4), d = JSON.parse(JSON.stringify(L.serialize(c, S))), R = L.restore(c, d, 9);
  assert.deepEqual(L.serialize(c, R), L.serialize(c, S));
  assert.deepEqual(L.restore(c, { v: -1 }).pads, L.createState(c).pads);
  const J = L.restore(c, { v: c.save.version, cash: 1e99, pile: -4, counter: 'x', pols: [999], stands: [['gem', 'bomb']], critters: ['pebble', 'pebble', 'nope'], kind: 'chunk', n: 500, pads: [[1e9, 1]] });
  assert.equal(J.hero.cash, 1e9); assert.equal(J.pile, 0); assert.equal(J.counter, c.start.counter);
  assert.equal(J.pols[0].polIn, c.world.polisherCap); assert.deepEqual(J.stands[0].items, ['gem']);
  assert.equal(J.critters.length, 1); assert.equal(J.hero.n, L.carryCap(c, J)); assert.equal(J.pads[0].paid, J.pads[0].price);
  const K = L.restore(c, { v: c.save.version, ghost: { lit: 99, n: -3 }, stars: ['town', 'fake'], hats: ['bunny', 'nope'], hat: 'nope', done1: true });
  assert.equal(K.ghost.lit, c.cart.lights); assert.equal(K.ghost.n, 0); assert.deepEqual(K.stars, ['town']);
  assert.deepEqual(K.hats, ['cowboy', 'bunny']); assert.equal(K.hat, 'cowboy'); assert.equal(K.done1, false, 'no finale without the heart');
});

test('a late save (chapter done) round trips: stars, hats, the hat worn, Nova', () => {
  const c = cfg(), { S } = play(c, 680, 1), d = JSON.parse(JSON.stringify(L.serialize(c, S))), R = L.restore(c, d, 9);
  assert.deepEqual(L.serialize(c, R), L.serialize(c, S));
  assert.ok(R.done1 && R.critters.some((q) => q.id === 'nova'));
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

test('drops: chapter 1 ships 12 critters and 6 hats; the night drop adds 6 and 3, all named in every language', () => {
  const off = cfg(), on = cfg({ night: true });
  assert.equal(off.critters.length, 12); assert.equal(off.hats.length, 6);
  assert.equal(on.critters.length, 18); assert.equal(on.hats.length, 9);
  assert.equal(new Set(on.critters.map((q) => q.id)).size, 18);
  assert.equal(on.critters[on.critters.length - 1].rarity, 'legendary');
  for (const [lang, t] of Object.entries(on.strings)) for (const q of on.critters) assert.ok(t[q.id === 'pebble' ? 'pup' : q.id], `${lang}: ${q.id}`);
  for (const [lang, t] of Object.entries(on.strings)) for (const k of ['gift', 'giftSub']) assert.ok(t[k], `${lang}: ${k}`);
});

test('night drop: all 18 critters hatch, the parade stays at critter.show with Nova in it, the new hats come', () => {
  const c = cfg({ night: true }), { S } = play(c, 26 * 60, 1);
  assert.equal(S.critters.length, 18);
  const shown = S.critters.filter((q) => !q.hide);
  assert.equal(shown.length, c.critter.show); assert.ok(shown.some((q) => q.id === 'nova'));
  for (const id of ['lamp', 'antenna', 'bandana']) assert.ok(S.hats.includes(id), id);
});

test('night drop on an old finished save: a new egg comes within 30 s of Continue', () => {
  const old = cfg(), { S } = play(old, 680, 1), d = JSON.parse(JSON.stringify(L.serialize(old, S)));
  assert.equal(S.egg.st, 'none');
  const c = cfg({ night: true }), R = L.restore(c, d, 4), all = [];
  for (let i = 0; i < 40 * 60; i++) { L.step(c, R, 1 / 60, L.botInput(c, R)); all.push(...R.events); R.events.length = 0; }
  assert.ok(all.some((e) => e.type === 'hatch'), 'a night critter hatched');
});

test('welcome-back gift: always on (a reason to come back tomorrow), after awayH, capped, one egg a day', () => {
  const H = 3600e3, d = { seen: 0, giftDay: -1, pads: Array.from({ length: 30 }, () => [0, 1]) };
  assert.ok(L.welcomeGift(cfg(), d, 20 * H), 'no festival needed');
  const c = cfg();
  assert.equal(L.welcomeGift(c, d, c.gift.awayH * H - 1), null);
  const g = L.welcomeGift(c, d, 20 * H);
  assert.equal(g.coins, c.gift.cap); assert.equal(g.egg, true);
  assert.equal(L.welcomeGift(c, { ...d, giftDay: g.day }, 20 * H).egg, false);
  const S = L.createState(c, 1), pile = S.cashPile; S.egg.at = S.t + 50;
  L.applyGift(c, S, g);
  assert.equal(S.cashPile, pile + g.coins); assert.ok(S.egg.at <= S.t + c.gift.eggIn); assert.equal(S.giftDay, g.day);
  assert.equal(L.restore(c, JSON.parse(JSON.stringify(L.serialize(c, S))), 2).giftDay, g.day);
});

/** Chapter 2 helpers: both places' configs with the ch2 switch on, and a desert game played to the cable car. */
const ch2 = (on = {}) => { const b = cfg({ ch2: true, ...on }); return { b, c1: L.chapterConfig(b, 'desert'), c2: L.chapterConfig(b, 'frost') }; };
function toFrost(c1, c2, seed) {
  const S1 = L.createState(c1, seed); let tr = null;
  for (let i = 0; i < 20 * 3600 && !tr; i++) { L.step(c1, S1, 1 / 60, L.botInput(c1, S1), S1.glint && S1.glint.t > 0.6 ? { glint: true } : null); tr = S1.events.find((e) => e.type === 'travel'); S1.events.length = 0; }
  const S2 = L.createState(c2, seed + 50); Object.assign(S2, { critters: S1.critters, hats: S1.hats, hat: S1.hat }); S2.hero.cash = S1.hero.cash;
  return { S1, S2, tr };
}

test('chapter 2 is off by default: no frost critters, hats or cable car to it', () => {
  const c = cfg();
  assert.ok(!c.critters.some((q) => q.area === 'frost')); assert.ok(!c.hats.some((h) => h.area === 'frost'));
  const { S } = play(c, 680, 1);
  assert.ok(S.done1); assert.equal(L.travelOpen(c, S), false);
});

test('chapter 2: the cable car opens after the finale, the bot rides it, frost has its 10 pads, names in every language', () => {
  const { b, c1, c2 } = ch2(), { S1, tr } = toFrost(c1, c2, 1);
  assert.ok(tr && tr.to === 'frost' && S1.done1 && S1.seen2, 'travel after the finale');
  assert.equal(c2.pads.length, 10); assert.equal(c2.pads[0].after, 'now');
  for (const [lang, t] of Object.entries(b.strings)) {
    for (const p of c2.pads) assert.ok(t[p.label], `${lang}: ${p.label}`);
    for (const q of b.critters.filter((x) => x.area === 'frost')) assert.ok(t[q.id], `${lang}: ${q.id}`);
    for (const k of ['toFrost', 'toDesert', 'awayCoins', 'f_ghostGoal', 'f_ghostLit', 'f_districtDone', 'f_finale', 'f_comet', 'lava']) assert.ok(t[k], `${lang}: ${k}`);
  }
});

test('chapter 2: the bot finishes it in 7-9 min with a reward at least every 45 s; frost eggs, stars and hats come', () => {
  const { c1, c2 } = ch2();
  for (const seed of [1, 2, 3]) {
    const { S2 } = toFrost(c1, c2, seed); let last = S2.t, gap = 0; const hatched = [];
    for (let i = 0; i < 12 * 3600 && !S2.done1; i++) {
      L.step(c2, S2, 1 / 60, L.botInput(c2, S2), S2.glint && S2.glint.t > 0.6 ? { glint: true } : null);
      for (const e of S2.events) { if (L.REWARDS.includes(e.type)) { gap = Math.max(gap, S2.t - last); last = S2.t; } if (e.type === 'hatch') hatched.push(e.who); }
      S2.events.length = 0;
    }
    assert.ok(S2.done1, `seed ${seed}: chapter 2 done`);
    assert.ok(S2.t >= 7 * 60 && S2.t <= 9 * 60, `seed ${seed}: ${(S2.t / 60).toFixed(1)} min`);
    assert.ok(gap <= 45, `seed ${seed}: reward gap ${gap.toFixed(0)} s`);
    assert.ok(hatched.every((id) => c2.critters.find((q) => q.id === id).area === 'frost'), 'only frost critters hatch up top');
    assert.deepEqual([...S2.stars].sort(), ['critters', 'orders', 'town']);
    for (const id of ['earmuffs', 'beanie', 'icecrown']) assert.ok(S2.hats.includes(id), id);
    assert.ok(S2.critters.some((q) => q.id === 'polaris'));
  }
});

test('chapter 2 save: both places round trip and share one parade and hat box; away coins are capped', () => {
  const { c1, c2 } = ch2(), { S1, S2 } = toFrost(c1, c2, 2);
  for (let i = 0; i < 200 * 60; i++) { L.step(c2, S2, 1 / 60, L.botInput(c2, S2)); S2.events.length = 0; }
  const d = JSON.parse(JSON.stringify({ ...L.serialize(c1, S1), ch2: L.serialize(c2, S2) }));
  const R1 = L.restore(c1, d, 3), R2 = L.restore(c2, d.ch2, 4, R1);
  assert.equal(R2.critters, R1.critters); assert.equal(R2.hats, R1.hats);
  assert.deepEqual(L.serialize(c2, R2).pads, L.serialize(c2, S2).pads);
  assert.ok(R1.seen2 && R1.done1);
  const pile = R1.cashPile, n = L.awayIncome(c1, R1, 3600);
  assert.equal(n, c1.away.cap); assert.equal(R1.cashPile, pile + n);
  assert.ok(L.awayIncome(c2, R2, 60) > 0 && L.awayIncome(c2, R2, 60) <= c2.away.cap);
});

test('the hero walks through every station, prop and building and only the deck edge stops them', () => {
  const c = cfg(), { S } = play(c, 900, 7); // a well-built town
  const D = c.world.deck, r = c.hero.r;
  // walk straight lines across the whole deck in both directions; any step that is not the deck edge must move
  for (let z = D.z0 + r; z <= D.z1 - r; z += 0.5) for (const dir of [1, -1]) {
    S.hero.x = dir > 0 ? D.x0 + r : D.x1 - r; S.hero.z = z; S.hero.vx = S.hero.vz = 0;
    for (let i = 0; i < 60 * 6; i++) {
      const x0 = S.hero.x; L.step(c, S, 1 / 60, { x: dir, z: 0 });
      const atEdge = dir > 0 ? S.hero.x >= D.x1 - r - 1e-6 : S.hero.x <= D.x0 + r + 1e-6;
      if (atEdge) break;
      if (i > 20) assert.ok(Math.abs(S.hero.x - x0) > 1e-4, `stuck at x ${S.hero.x.toFixed(2)} z ${z.toFixed(2)}`);
    }
    assert.ok(dir > 0 ? S.hero.x >= D.x1 - r - 1e-3 : S.hero.x <= D.x0 + r + 1e-3, `crossed the deck at z ${z.toFixed(2)}`);
  }
});

test('tutorial: the bot completes every step in order, each step only spotlights its own kind of stop', () => {
  const c = cfg(), S = L.createState(c, c.seed), shown = [];
  let done = 0;
  for (let i = 0; i < 900 * 60 && done !== (1 << L.FTUE.length) - 1; i++) {
    const g = L.guide(c, S), st = L.ftueStep(c, S, g, done);
    if (st) { assert.ok(!(done & (1 << L.FTUE.indexOf(st))), `${st} shown after it was done`); if (!shown.includes(st)) shown.push(st); }
    L.step(c, S, 1 / 60, L.botInput(c, S), null); // no glint taps: the bot then mines by hand like a new player
    for (const e of S.events) done |= L.ftueBit(c, e);
    S.events.length = 0;
  }
  assert.equal(done, (1 << L.FTUE.length) - 1, `steps done: ${done.toString(2)}`);
  assert.deepEqual([...shown].sort(), [...L.FTUE].sort(), `every step got its spotlight: ${shown.join(',')}`);
  assert.equal(L.ftueStep(c, S, L.guide(c, S), done), null);
});

test('tutorial: old saves skip what they already did; a skipped tutorial stays off', () => {
  assert.equal(L.ftueFromSave(null), 0);
  assert.equal(L.ftueFromSave({ sold: 3, pads: [[0, 0]] }), 0b11111);
  assert.equal(L.ftueFromSave({ sold: 3, pads: [[5, 1]], critters: ['a'] }), 0b1111111);
  assert.equal(L.ftueFromSave({ ft: 0b1111111 }), 0b1111111);
});
