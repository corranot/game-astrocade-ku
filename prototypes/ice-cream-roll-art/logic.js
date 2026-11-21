// PROTOTYPE - NOT FOR PRODUCTION
/**
 * Pure rules for Ice Cream Roll Art: orders, stars, coins, unlocks, gifts and calendar days.
 * No DOM, no THREE: every function here is unit-tested in logic.test.mjs.
 */

/** Seeded random in [0, 1). */
export function mulberry32(a) {
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
/** One item of a non-empty list, picked with rng; null for an empty list. */
export const pick = (rng, list) => (list && list.length ? list[Math.min(list.length - 1, Math.floor(rng() * list.length))] : null);

/** The device language among the supported ones, else English. */
export function detectLang(list, langs) {
  for (const l of list || []) { const k = String(l || '').slice(0, 2).toLowerCase(); if (langs.includes(k)) return k; }
  return 'en';
}

/** Ids of the items of one kind ('bases' | 'fruits' | 'toppings' | 'syrups') the player may use. */
export function unlockedIds(cfg, kind, owned) {
  return (cfg[kind] || []).filter((it) => !it.cost || (owned || []).includes(it.id)).map((it) => it.id);
}

/**
 * A customer's order for cup number n (0 = the first-ever cup, which is the short hook round).
 * @returns {{base:string, fruits:string[], toppings:string[], art:string|null, customer:string}}
 */
export function makeOrder(cfg, owned, n, rng) {
  const bases = unlockedIds(cfg, 'bases', owned), fruits = unlockedIds(cfg, 'fruits', owned), tops = unlockedIds(cfg, 'toppings', owned);
  const customer = cfg.customers[n % cfg.customers.length];
  if (n === 0) return { base: 'strawberry', fruits: ['strawberry'], toppings: ['whip'], art: 'heart', customer };
  const o = cfg.order;
  const f1 = pick(rng, fruits);
  const mix = n >= o.mixFrom && fruits.length > 1 && rng() < o.mixChance;
  const f2 = mix ? pick(rng, fruits.filter((f) => f !== f1)) : null;
  const want = Math.min(tops.length, n < o.twoToppingsFrom ? 1 : 1 + Math.floor(rng() * o.maxToppings));
  const pool = tops.slice(), toppings = [];
  while (toppings.length < want && pool.length) toppings.push(pool.splice(Math.floor(rng() * pool.length), 1)[0]);
  // every few cups a VIP: a richer order (an extra topping and a drawing) that pays double
  const vip = n >= (o.vipEvery || 3) && n % (o.vipEvery || 3) === 0;
  if (vip) while (toppings.length < Math.min(3, tops.length)) { const rest = tops.filter((t) => !toppings.includes(t)); toppings.push(pick(rng, rest)); }
  const art = vip ? pick(rng, cfg.stencils) : n >= o.artFrom && rng() < o.artChance ? pick(rng, cfg.stencils) : null;
  return { base: pick(rng, bases), fruits: f2 ? [f1, f2] : [f1], toppings, art, customer, special: vip ? 'vip' : null };
}

/** Today's special order: the same for every player on calendar day `day` (YYYYMMDD), from the free items only. */
export function dailyOrder(cfg, day) {
  const o = makeOrder(cfg, [], 5, mulberry32(day));
  return { ...o, customer: cfg.customers[day % cfg.customers.length], special: 'today' };
}

/** How many pieces of each ordered fruit go on the plate: 3 of one, or 2 + 2 for a mix. */
export const piecesFor = (order) => (order.fruits.length > 1 ? 2 : 3);

/** Jaccard similarity of two lists of ids (1 when both are empty). */
export function jaccard(a, b) {
  const A = new Set(a), B = new Set(b); if (!A.size && !B.size) return 1;
  let both = 0; for (const x of A) if (B.has(x)) both++;
  return both / (A.size + B.size - both);
}

/**
 * Score of one cup. made = {base, fruits (ids added, with repeats), pour (0..1.3 of target), cover (0..1),
 * rolls (lanes rolled cleanly / lanes), toppings (ids), art (stencil id or 'free' or null)}.
 * @returns {{quality:number, stars:number, parts:Object<string,number>}}
 */
export function scoreCup(cfg, order, made) {
  const w = cfg.score.weights;
  const parts = {};
  parts.base = made.base === order.base ? 1 : 0.5;
  // each ordered fruit counts by how many of its pieces went in (a missing kiwi is missed, even with extra strawberries)
  const got = made.fruits || [], per = piecesFor(order);
  const fruitEach = Object.fromEntries(order.fruits.map((f) => [f, Math.min(1, got.filter((x) => x === f).length / per)]));
  parts.fruit = order.fruits.reduce((a, f) => a + fruitEach[f], 0) / order.fruits.length;
  const p = made.pour || 0, band = cfg.pour.band;
  parts.pour = p >= band[0] && p <= band[1] ? 1 : Math.max(0, 1 - Math.min(Math.abs(p - band[0]), Math.abs(p - band[1])) * 2.5);
  parts.spread = Math.min(1, (made.cover || 0) / cfg.spread.done);
  parts.rolls = Math.max(0, Math.min(1, made.rolls || 0));
  // every ordered topping counts; extras are a kid's own idea and never cost a star
  const tops = new Set(made.toppings || []);
  parts.toppings = order.toppings.length ? order.toppings.filter((t) => tops.has(t)).length / order.toppings.length : 1;
  let sum = 0, tot = 0;
  for (const k of Object.keys(parts)) { sum += parts[k] * w[k]; tot += w[k]; }
  if (order.art) { parts.art = made.art === order.art ? 1 : made.art ? 0.6 : 0.3; sum += parts.art * w.art; tot += w.art; }
  const quality = sum / tot;
  const s = cfg.score.stars;
  return { quality, stars: quality >= s[0] ? 3 : quality >= s[1] ? 2 : 1, parts, fruitEach };
}

/** Coins paid for a cup with the given stars; a drawing earns the art tip, a VIP pays double, today's special a bonus. */
export function coinsFor(cfg, stars, drew, special = null) {
  const c = cfg.coins;
  const pay = c.base + c.perStar * stars + (drew ? c.artTip : 0);
  return special === 'vip' ? pay * (c.vipMult || 2) : special === 'today' ? pay + (c.todayBonus || 0) : pay;
}

/** The cheapest thing still locked (any list, cup styles included), or null when everything is owned. */
export function nextUnlock(cfg, owned, lists = ['bases', 'fruits', 'toppings', 'syrups', 'cupStyles']) {
  let best = null;
  for (const list of lists) {
    for (const it of cfg[list] || []) if (it.cost && !(owned || []).includes(it.id) && (!best || it.cost < best.cost)) best = { list, id: it.id, cost: it.cost };
  }
  return best;
}

/** Step tuning for a cup: once a step has been done before and from cup `expert.from`, it goes quicker. */
export function tuned(cfg, learned, n) {
  const e = cfg.expert || {}, on = (k) => n >= (e.from || 3) && !!(learned || {})[k];
  return {
    pourRate: cfg.pour.rate * (on('pour') ? e.pourRate || 1 : 1),
    chopHits: Math.max(1, cfg.chop.hits + (on('chop') ? e.chopHits || 0 : 0)),
    freezeTime: cfg.freeze.time * (on('freeze') ? e.freezeTime || 1 : 1),
    spreadDone: on('spread') ? e.spreadDone || cfg.spread.done : cfg.spread.done,
  };
}

/** Whether a gift box is due after `cups` cups have been served (every n-th cup, never the first). */
export const giftDue = (cups, every) => cups > 0 && cups % every === 0;

/**
 * What a gift box holds: the cheapest locked item (free), or coins when everything is owned.
 * @returns {{kind:'item', id:string, list:string}|{kind:'coins', amount:number}}
 */
export function giftContent(cfg, owned) {
  let best = null;
  for (const list of ['fruits', 'toppings', 'bases', 'syrups', 'cupStyles']) {
    for (const it of cfg[list] || []) if (it.cost && !(owned || []).includes(it.id) && (!best || it.cost < best.cost)) best = { ...it, list };
  }
  return best ? { kind: 'item', id: best.id, list: best.list } : { kind: 'coins', amount: cfg.coins.giftCoins };
}

/** A calendar day as the number YYYYMMDD (compared by size, so a clock moved back never pays twice). */
export const dayNum = (d) => d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();

/** Whether today's daily gift may be paid: only after `from` cups, once per calendar day, never backwards. */
export const dailyDue = (today, lastDaily, cups, from = 1) => cups >= from && today > (Number(lastDaily) || 0);

/** Buy item id if the player has the coins. Returns the new coins, or -1 when it cannot be bought. */
export function buy(cfg, list, id, coins, owned) {
  const it = (cfg[list] || []).find((x) => x.id === id);
  if (!it || !it.cost || owned.includes(id) || coins < it.cost) return -1;
  return coins - it.cost;
}

/** Linear blend of two '#rrggbb' colours, t in 0..1. */
export function mixHex(a, b, t) {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
  const ch = (s) => Math.round(((pa >> s) & 255) * (1 - t) + ((pb >> s) & 255) * t);
  return '#' + ((1 << 24) | (ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).slice(1);
}

/** The cream colour of a cup: the base blended with the average flesh colour of the fruits added. */
export function creamColour(cfg, baseId, fruitIds) {
  const base = (cfg.bases.find((b) => b.id === baseId) || cfg.bases[0]).color;
  const fs = (fruitIds || []).map((f) => cfg.fruits.find((x) => x.id === f)).filter(Boolean);
  if (!fs.length) return base;
  let c = fs[0].cream; for (let i = 1; i < fs.length; i++) c = mixHex(c, fs[i].cream, 1 / (i + 1));
  return mixHex(base, c, cfg.fruitTint);
}

/** Relative luminance (0..1) of a '#rrggbb' colour. */
export function luminance(hex) {
  const p = parseInt(hex.slice(1), 16), f = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  return 0.2126 * f(p >> 16 & 255) + 0.7152 * f(p >> 8 & 255) + 0.0722 * f(p & 255);
}
/** WCAG contrast ratio between two colours (1..21). */
export const contrast = (a, b) => { const x = luminance(a), y = luminance(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
/** The usable syrup that shows best on this cream (so a drawing is never brown on brown or white on white). */
export function bestSyrup(cfg, cream, usable, avoid = []) {
  let best = null, bc = -1;
  for (const sy of cfg.syrups) { if (!usable.includes(sy.id) || sy.color === 'rainbow' || avoid.includes(sy.id)) continue; const c = contrast(sy.color, cream); if (c > bc) { bc = c; best = sy.id; } }
  return best || cfg.syrups[0].id;
}
