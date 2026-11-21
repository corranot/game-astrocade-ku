// PROTOTYPE - NOT FOR PRODUCTION
// Unit tests for the pure rules (logic.js) and the roll spiral (roll.js). Run: node logic.test.mjs
import fs from 'fs';
import assert from 'assert/strict';
import * as R from './logic.js';
import { spiralTheta, rollRadius, rollPoint } from './roll.js';

const cfg = JSON.parse(fs.readFileSync(new URL('./game_config.json', import.meta.url)));
let n = 0; const t = (name, fn) => { fn(); n++; console.log('ok  ', name); };

t('device language: first supported, else English', () => {
  assert.equal(R.detectLang(['fr-FR', 'id-ID'], ['en', 'id']), 'id');
  assert.equal(R.detectLang(['de'], ['en', 'id']), 'en');
  assert.equal(R.detectLang([], ['en']), 'en');
});
t('pick never returns undefined for a list, null for empty', () => {
  const r = () => 0.999999; assert.equal(R.pick(r, ['a', 'b']), 'b'); assert.equal(R.pick(r, []), null);
});
t('first order is the fixed hook cup', () => {
  const o = R.makeOrder(cfg, [], 0, R.mulberry32(1));
  assert.deepEqual([o.base, o.fruits, o.toppings, o.art], ['strawberry', ['strawberry'], ['whip'], 'heart']);
});
t('orders only ask for owned things, toppings never repeat', () => {
  for (let s = 1; s < 300; s++) {
    const o = R.makeOrder(cfg, [], 1 + (s % 9), R.mulberry32(s));
    const free = (k) => cfg[k].filter((x) => !x.cost).map((x) => x.id);
    assert.ok(free('bases').includes(o.base)); for (const f of o.fruits) assert.ok(free('fruits').includes(f));
    for (const x of o.toppings) assert.ok(free('toppings').includes(x));
    assert.equal(new Set(o.toppings).size, o.toppings.length); assert.ok(o.toppings.length >= 1);
    if (o.fruits.length === 2) assert.notEqual(o.fruits[0], o.fruits[1]);
  }
});
t('pieces: 3 of one fruit, 2 + 2 for a mix', () => {
  assert.equal(R.piecesFor({ fruits: ['a'] }), 3); assert.equal(R.piecesFor({ fruits: ['a', 'b'] }), 2);
});
t('a perfect cup is 3 stars; wrong everything is 1', () => {
  const order = { base: 'milk', fruits: ['mango'], toppings: ['whip', 'cherry'], art: 'star' };
  const good = { base: 'milk', fruits: ['mango', 'mango', 'mango'], pour: 0.95, cover: 1, rolls: 1, toppings: ['cherry', 'whip'], art: 'star' };
  assert.equal(R.scoreCup(cfg, order, good).stars, 3);
  const bad = { base: 'chocolate', fruits: ['kiwi'], pour: 0.2, cover: 0.2, rolls: 0.2, toppings: ['sprinkles'], art: null };
  assert.equal(R.scoreCup(cfg, order, bad).stars, 1);
});
t('pour band edges count as perfect, overflow costs a little', () => {
  const order = { base: 'milk', fruits: ['mango'], toppings: [], art: null };
  const m = (pour) => R.scoreCup(cfg, order, { base: 'milk', fruits: ['mango'], pour, cover: 1, rolls: 1, toppings: [] }).parts.pour;
  assert.equal(m(cfg.pour.band[0]), 1); assert.equal(m(cfg.pour.band[1]), 1); assert.ok(m(cfg.pour.max) < 1 && m(cfg.pour.max) > 0.3);
});
t('jaccard', () => { assert.equal(R.jaccard([], []), 1); assert.equal(R.jaccard(['a'], ['a', 'b']), 0.5); });
t('coins grow with stars, art tip added', () => {
  assert.ok(R.coinsFor(cfg, 3, false) > R.coinsFor(cfg, 1, false)); assert.equal(R.coinsFor(cfg, 2, true) - R.coinsFor(cfg, 2, false), cfg.coins.artTip);
});
t('gift every n cups, never at 0', () => { assert.equal(R.giftDue(0, 3), false); assert.equal(R.giftDue(3, 3), true); assert.equal(R.giftDue(4, 3), false); });
t('gift is the cheapest locked item, coins when all owned', () => {
  const g = R.giftContent(cfg, []); assert.equal(g.kind, 'item'); assert.equal(g.id, 'wafer');
  const all = ['bases', 'fruits', 'toppings', 'syrups', 'cupStyles'].flatMap((k) => cfg[k].map((x) => x.id));
  assert.deepEqual(R.giftContent(cfg, all), { kind: 'coins', amount: cfg.coins.giftCoins });
});
t('daily gift: only after a cup, once a day, never for a clock moved back', () => {
  assert.equal(R.dailyDue(20261121, 0, 0), false); assert.equal(R.dailyDue(20261121, 0, 1), true);
  assert.equal(R.dailyDue(20261121, 0, 1, 2), false); assert.equal(R.dailyDue(20261121, 0, 2, 2), true);
  assert.equal(R.dailyDue(20261121, 20261121, 5), false); assert.equal(R.dailyDue(20261120, 20261121, 5), false);
  assert.equal(R.dayNum(new Date(2026, 0, 5)), 20260105);
});
t('buy: only locked, affordable, not owned', () => {
  assert.equal(R.buy(cfg, 'fruits', 'cookie', 29, []), -1); assert.equal(R.buy(cfg, 'fruits', 'cookie', 30, []), 0);
  assert.equal(R.buy(cfg, 'fruits', 'cookie', 99, ['cookie']), -1); assert.equal(R.buy(cfg, 'fruits', 'mango', 99, []), -1);
});
t('cream colour blends base and fruit', () => {
  assert.equal(R.mixHex('#000000', '#ffffff', 0.5), '#808080');
  assert.equal(R.creamColour(cfg, 'milk', []), cfg.bases[0].color);
  assert.notEqual(R.creamColour(cfg, 'milk', ['strawberry']), cfg.bases[0].color);
});
t('spiral: arc length is inverted exactly, radius grows', () => {
  const a = 0.05, b = 0.045 / (2 * Math.PI);
  for (const u of [0.1, 1, 3]) { const th = spiralTheta(u, a, b); assert.ok(Math.abs(a * th + b * th * th / 2 - u) < 1e-9); }
  assert.ok(rollRadius(3, a, b) > rollRadius(1, a, b));
});
t('roll: flat ahead of the scraper, touching the plate at the scraper, no kink', () => {
  const a = 0.05, b = 0.045 / (2 * Math.PI), p = 1.5;
  assert.deepEqual(rollPoint(2, p, a, b), [2, 0]);
  const [d, y] = rollPoint(p - 1e-6, p, a, b); assert.ok(Math.abs(d - p) < 1e-4 && Math.abs(y) < 1e-4);
  // the whole wound part stays inside the outer radius, above the plate
  const R0 = rollRadius(p, a, b);
  for (let s = 0; s < p; s += 0.01) { const [dd, yy] = rollPoint(s, p, a, b); assert.ok(yy >= -1e-9 && Math.hypot(dd - p, yy - R0) <= R0 + 1e-9); }
});
t('VIP every 3rd cup from cup 3: three toppings and a drawing, pays double', () => {
  for (let s = 1; s < 50; s++) {
    const o = R.makeOrder(cfg, [], 6, R.mulberry32(s)); assert.equal(o.special, 'vip'); assert.ok(o.art); assert.equal(o.toppings.length, 3); assert.equal(new Set(o.toppings).size, 3);
    assert.equal(R.makeOrder(cfg, [], 4, R.mulberry32(s)).special, null); assert.equal(R.makeOrder(cfg, [], 0, R.mulberry32(s)).special, undefined);
  }
  assert.equal(R.coinsFor(cfg, 3, false, 'vip'), 2 * R.coinsFor(cfg, 3, false));
  assert.equal(R.coinsFor(cfg, 3, false, 'today') - R.coinsFor(cfg, 3, false), cfg.coins.todayBonus);
});
t("today's special is the same for everyone that day, and differs between days", () => {
  assert.deepEqual(R.dailyOrder(cfg, 20261121), R.dailyOrder(cfg, 20261121));
  assert.equal(R.dailyOrder(cfg, 20261121).special, 'today');
  const days = new Set(); for (let d = 20261101; d < 20261111; d++) days.add(JSON.stringify(R.dailyOrder(cfg, d))); assert.ok(days.size > 5);
});
t('next unlock: cheapest locked across all lists, null when all owned', () => {
  assert.deepEqual(R.nextUnlock(cfg, []), { list: 'toppings', id: 'wafer', cost: 25 });
  const all = ['bases', 'fruits', 'toppings', 'syrups', 'cupStyles'].flatMap((k) => cfg[k].map((x) => x.id));
  assert.equal(R.nextUnlock(cfg, all), null);
});
t('expert tuning only for learned steps from cup 3', () => {
  const base = R.tuned(cfg, {}, 9); assert.equal(base.pourRate, cfg.pour.rate); assert.equal(base.chopHits, cfg.chop.hits);
  const early = R.tuned(cfg, { pour: 1, chop: 1 }, 2); assert.equal(early.pourRate, cfg.pour.rate);
  const pro = R.tuned(cfg, { pour: 1, chop: 1, freeze: 1, spread: 1 }, 3);
  assert.ok(pro.pourRate > cfg.pour.rate && pro.chopHits === cfg.chop.hits - 1 && pro.freezeTime < cfg.freeze.time && pro.spreadDone < cfg.spread.done);
});
t('extra toppings never cost a star; a missing ordered one does', () => {
  const order = { base: 'milk', fruits: ['mango'], toppings: ['whip'], art: null };
  const base = { base: 'milk', fruits: ['mango', 'mango', 'mango'], pour: 0.95, cover: 1, rolls: 1 };
  const extra = R.scoreCup(cfg, order, { ...base, toppings: ['whip', 'cherry', 'sprinkles', 'choco'] });
  assert.equal(extra.parts.toppings, 1); assert.equal(extra.stars, 3);
  assert.equal(R.scoreCup(cfg, order, { ...base, toppings: ['cherry'] }).parts.toppings, 0);
});
t('the default syrup always shows on the cream (never brown on chocolate, never white on milk)', () => {
  const free = cfg.syrups.filter((x) => !x.cost).map((x) => x.id);
  for (const b of cfg.bases) for (const f of cfg.fruits) {
    const cream = R.creamColour(cfg, b.id, [f.id]), id = R.bestSyrup(cfg, cream, free), col = cfg.syrups.find((x) => x.id === id).color;
    assert.ok(R.contrast(col, cream) >= 2.2, `${id} on ${b.id}+${f.id}: ${R.contrast(col, cream).toFixed(2)}`);
  }
  assert.equal(R.bestSyrup(cfg, '#fff1cf', free), 'chocsyrup'); assert.equal(R.bestSyrup(cfg, '#5a2c16', free), 'whitesyrup');
});
t('a missing ordered fruit is missed even when other pieces fill the plate', () => {
  const order = { base: 'milk', fruits: ['strawberry', 'kiwi'], toppings: [], art: null };
  const base = { base: 'milk', pour: 0.95, cover: 1, rolls: 1, toppings: [] };
  const r = R.scoreCup(cfg, order, { ...base, fruits: ['strawberry', 'strawberry', 'strawberry', 'strawberry'] });
  assert.equal(r.fruitEach.kiwi, 0); assert.equal(r.fruitEach.strawberry, 1); assert.equal(r.parts.fruit, 0.5); assert.ok(r.stars < 3);
  const ok = R.scoreCup(cfg, order, { ...base, fruits: ['strawberry', 'kiwi', 'strawberry', 'kiwi'] });
  assert.equal(ok.parts.fruit, 1);
});
t('chocolate cream never gets chocolate syrup by default', () => {
  const free = cfg.syrups.filter((x) => !x.cost).map((x) => x.id);
  for (const f of cfg.fruits) assert.notEqual(R.bestSyrup(cfg, R.creamColour(cfg, 'chocolate', [f.id]), free, ['chocsyrup']), 'chocsyrup');
});
console.log(`\n${n} passed`);
