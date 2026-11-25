// PROTOTYPE - NOT FOR PRODUCTION
// Meteor Gem Works rules, pure (no THREE, no DOM): the mine -> polish -> sell -> build loop with the 14 unlocks of
// chapter 1 (drill rig, conveyor + polisher 2, stand 2, shopkeeper, road + tour bus, ring workshop, laser cutter, mine
// cart + ghost town, drill rig 2, cable car, stargazer deck, crown jeweler, neon main street, the heart of the meteor),
// glints, orders, critter eggs with rarities and a pity counter, Crystal Rush, the ghost town goal, town stars, hats,
// the finale, the guide (never points at a step that does nothing), save / restore, and adaptive quality.
// game.js steps it and draws the result.

/** Seeded random in [0, 1) (mulberry32). */
export function rng(seed) {
  let s = seed >>> 0;
  return () => { s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

const near = (a, x, z, r) => (a.x - x) ** 2 + (a.z - z) ** 2 < r * r;
const pt = (p) => (Array.isArray(p) ? { x: p[0], z: p[1] } : { x: p.x, z: p.z });
const ITEMS = ['gem', 'ring'];

/** A fresh game state from the config. */
export function createState(cfg, seed = cfg.seed) {
  const W = cfg.world;
  return {
    t: 0, random: rng(seed),
    hero: { x: W.mine.x - 0.6, z: W.mine.z + 3.2, vx: 0, vz: 0, face: Math.PI, kind: null, n: 0, cash: 0, swing: 0, mining: false, pickT: 0, dropT: 0, cashT: 0 },
    pile: cfg.start.pile, counter: cfg.start.counter, cashPile: 0,
    pols: W.polishers.map((p, i) => ({ id: p.id, polIn: i === 0 ? cfg.start.polIn : 0, polT: 0 })),
    stands: W.stands.map((s) => ({ id: s.id, items: [], lock: 0 })),
    ws: { gemsIn: 0, rings: 0, t: 0 },
    keeper: null, conv: { t: 0 }, rig: null, laser: { t: 0 }, bus: { next: -1, wave: 0 },
    tourists: [], nextTourist: 0.5, tid: 0,
    glint: null, glintT: cfg.glint.every * 0.5,
    egg: { st: 'lodged', t: 0, at: cfg.egg.dropAt, who: cfg.critters[0].id }, critters: [],
    order: null, orderT: cfg.order.first, hearts: 0,
    rush: { on: false, next: cfg.rush.first, left: 0, spawnT: 0 }, loose: [], lid: 0,
    pads: cfg.pads.map((p) => ({ id: p.id, price: p.price, paid: 0, shown: false, done: false, rate: cfg.coinFlow.payStart, payT: 0 })),
    rig2: { t: 0 }, jw: { t: 0 }, ghost: { n: 0, lit: 0, go: -1 }, eggs: 0, noRare: 0,
    stars: [], hats: [cfg.hats[0].id], hat: cfg.hats[0].id, finale: null, done1: false,
    sold: 0, made: 0, earned: 0, progressT: 0, events: [],
  };
}

/** True once the pad with this id is paid for. */
export const has = (S, id) => S.pads.some((p) => p.id === id && p.done);
const MULT = ['swing', 'polish', 'tourists', 'luck'];
/** A perk summed over the parade (carry, speed, magnet, tip, bonus) or multiplied (swing, polish, tourists, luck). */
const perk = (cfg, S, name) => {
  let v = MULT.includes(name) ? 1 : 0;
  for (const c of S.critters) { const d = cfg.critters.find((q) => q.id === c.id); if (d && d.perk === name) v = MULT.includes(name) ? v * d.v : v + d.v; }
  return v;
};
/** Carry capacity (Pebble's and Nugget's perks add to it). */
export const carryCap = (cfg, S) => cfg.hero.carry + perk(cfg, S, 'carry');
const heroSpeed = (cfg, S) => cfg.hero.speed * (1 + perk(cfg, S, 'speed'));
const swingTime = (cfg, S) => cfg.mining.swing * perk(cfg, S, 'swing');
const polishTime = (cfg, S) => cfg.polish.time * perk(cfg, S, 'polish');
const spawnEvery = (cfg, S) => cfg.sell.spawnEvery * perk(cfg, S, 'tourists') * (has(S, 'cable') ? cfg.cable.tourists : 1) * (has(S, 'neon') ? cfg.neon.tourists : 1);
const cashR = (cfg, S) => cfg.world.cash.r + perk(cfg, S, 'magnet');
/** What a tourist pays for an item: the base price, plus the stargazer deck and Nova's bonus. */
export const price = (cfg, S, kind) => (cfg.sell.prices[kind] || cfg.sell.prices.gem) + (has(S, 'stargaze') ? cfg.stargaze.bonus : 0) + perk(cfg, S, 'bonus');
const cartRoom = (cfg, S) => has(S, 'ghost') && S.ghost.go < 0 && S.ghost.n < cfg.cart.cap;
/** The ghost town goal: the cart has lit fewer buildings than there are. */
export const ghostOpen = (cfg, S) => has(S, 'ghost') && S.ghost.lit < cfg.cart.lights;
/** The time of day the town is heading to (noon at the start, dusk with the neon street, night after the finale). */
export function todGoal(cfg, S) { let t = cfg.tod.start; for (const [id, v] of Object.entries(cfg.tod.byPad)) if (has(S, id)) t = Math.max(t, v); return t; }
/** Polishers / stands that are built (the first of each is there from the start). */
const polOn = (cfg, S) => S.pols.filter((p, i) => !cfg.world.polishers[i].pad || has(S, cfg.world.polishers[i].pad));
const standOn = (cfg, S) => S.stands.filter((s, i) => !cfg.world.stands[i].pad || has(S, cfg.world.stands[i].pad));
const polDef = (cfg, id) => cfg.world.polishers.find((p) => p.id === id);
const standDef = (cfg, id) => cfg.world.stands.find((s) => s.id === id);

/** True when the hero standing at a station would do something there now (the guide only picks such targets). */
export function useful(cfg, S, what) {
  const h = S.hero, room = carryCap(cfg, S) - h.n, W = cfg.world;
  if (what === 'mine') return !ITEMS.includes(h.kind) && S.pile < W.pile.cap;
  if (what === 'pile') return S.pile > 0 && room > 0 && (h.kind === null || h.kind === 'chunk');
  if (what === 'crate') return h.kind === 'chunk' && h.n > 0;
  if (what === 'counter') return S.counter > 0 && room > 0 && (h.kind === null || h.kind === 'gem');
  if (what === 'cash') return S.cashPile > 0;
  if (what === 'egg') return S.egg.st === 'waiting';
  if (what === 'order') return !!S.order && h.kind === S.order.kind && h.n > 0;
  if (what === 'cart' && !S.pads.some((q) => q.id === 'ghost' && !q.done)) return cartRoom(cfg, S) && h.kind === 'gem' && h.n > (S.order && S.order.kind === 'gem' ? 1 : 0);
  const pad = S.pads.find((q) => q.id === what && !q.done); // an unbuilt pad shares its id with the station it builds
  if (pad) return pad.shown && h.cash > 0;
  if (what === 'workshop') return has(S, 'workshop') && ((h.kind === 'gem' && h.n > 0 && S.ws.gemsIn < W.workshop.gemCap) || (S.ws.rings > 0 && room > 0 && (h.kind === null || h.kind === 'ring')));
  const p = S.pols.find((q) => q.id === what);
  if (p) return polOn(cfg, S).includes(p) && h.kind === 'chunk' && h.n > 0 && p.polIn < W.polisherCap;
  const s = S.stands.find((q) => q.id === what);
  if (s) return standOn(cfg, S).includes(s) && ITEMS.includes(h.kind) && h.n > (S.order && S.order.kind === h.kind ? 1 : 0) && s.items.length < W.standCap;
  return false;
}

/** Where the station `what` is (the point the hero walks to). */
export function spot(cfg, what, S = null) {
  const W = cfg.world, p = polDef(cfg, what), s = standDef(cfg, what), d = cfg.pads.find((q) => q.id === what);
  if (d && S && !has(S, what)) return pt(d);
  if (p) return pt(p.in);
  if (s) return pt(s.in);
  if (what === 'workshop') return pt(W.workshop.in);
  if (what === 'counter' || what === 'mine' || what === 'pile' || what === 'crate' || what === 'cash' || what === 'egg' || what === 'order' || what === 'cart') return pt(W[what]);
  return d ? pt(d) : null;
}

/** The next useful step for the hero: { what, x, z }. Never a station that would do nothing. */
export function guide(cfg, S) {
  const h = S.hero, pad = S.pads.find((p) => p.shown && !p.done);
  const pick = (w) => (useful(cfg, S, w) ? { what: w, ...spot(cfg, w, S) } : null);
  const nearest = (ids) => { let best = null, bd = 1e9; for (const id of ids) { if (!useful(cfg, S, id)) continue; const q = spot(cfg, id, S), d = (q.x - h.x) ** 2 + (q.z - h.z) ** 2; if (d < bd) { bd = d; best = { what: id, ...q }; } } return best; };
  if (pad && h.cash > 0 && h.cash >= pad.price - pad.paid) return pick(pad.id);
  const egg = pick('egg'); if (egg) return egg;
  const ord = pick('order'); if (ord) return ord;
  if (S.order && S.order.kind === 'ring' && h.kind === null) { const w = pick('workshop'); if (w) return w; } // fetch the ring the kid asked for
  if (ITEMS.includes(h.kind) && h.n > 0) {
    if (h.kind === 'gem' && ghostOpen(cfg, S)) { const c = pick('cart'); if (c) return c; } // the ghost town goal comes first
    if (h.kind === 'gem' && S.ws.gemsIn < cfg.workshop.per * 2) { const w = pick('workshop'); if (w) return w; } // keep the ring workshop fed
    return nearest(S.stands.map((s) => s.id)) || pick('cart') || pick('workshop') || pick('cash') || (pad && pick(pad.id)) || { what: 'stand', wait: true, ...spot(cfg, 'stand', S) };
  }
  if (h.kind === 'chunk' && h.n > 0) {
    if (h.n < carryCap(cfg, S) && S.pile > 0 && near(h, cfg.world.pile.x, cfg.world.pile.z, cfg.world.pile.r)) return pick('pile');
    return nearest(S.pols.map((p) => p.id)) || pick('crate');
  }
  if (S.cashPile >= cfg.guide.cashMin || (pad && S.cashPile > 0 && h.cash + S.cashPile >= pad.price - pad.paid)) return pick('cash');
  if (pad && h.cash > 0) { const ps = spot(cfg, pad.id, S); if (near(h, ps.x, ps.z, 1.4)) return pick(pad.id); }
  if (S.ws.rings >= 3) { const w = pick('workshop'); if (w) return w; }
  return pick('counter') || (S.pile >= 6 && pick('pile')) || pick('cash') || pick('mine') || pick('pile');
}

/** Can the hero stand at (x, z)? Inside the deck, outside every obstacle (built unlocks add theirs when S is given). */
export function walkable(cfg, x, z, S = null) {
  const D = cfg.world.deck, r = cfg.hero.r;
  if (x < D.x0 + r || x > D.x1 - r || z < D.z0 + r || z > D.z1 - r) return false;
  for (const [ox, oz, or] of cfg.world.obstacles) if ((x - ox) ** 2 + (z - oz) ** 2 < (or + r) ** 2) return false;
  if (S) for (let i = 0; i < cfg.pads.length; i++) { const o = cfg.pads[i].obstacle; if (o && S.pads[i].done && (x - o[0]) ** 2 + (z - o[1]) ** 2 < (o[2] + r) ** 2) return false; }
  return true;
}

/** Event types the player feels as a reward; the quiet timer (beatT) restarts on each one. */
export const REWARDS = ['unlock', 'hatch', 'orderDone', 'rush', 'bus', 'ghostLight', 'cartBack', 'crown', 'star', 'hat', 'finale', 'crownHatch'];
const ev = (S, type, data) => { S.events.push({ type, t: S.t, ...data }); if (REWARDS.includes(type)) S.beatT = 0; };

/**
 * Advances the game by dt seconds. input = { x, z } wanted world direction (length <= 1), tap = { glint: true } when
 * the player tapped the glint. Appends events to S.events (the caller drains them).
 */
export function step(cfg, S, dt, input = { x: 0, z: 0 }, tap = null) {
  S.t += dt; S.progressT += dt; S.beatT = (S.beatT || 0) + dt;
  const W = cfg.world, h = S.hero, rand = S.random;
  // ---- movement: ease towards the wanted velocity, slide along edges
  const sp = heroSpeed(cfg, S), k = Math.min(1, dt * cfg.hero.accel);
  h.vx += (input.x * sp - h.vx) * k; h.vz += (input.z * sp - h.vz) * k;
  const nx = h.x + h.vx * dt, nz = h.z + h.vz * dt;
  if (walkable(cfg, nx, nz, S)) { h.x = nx; h.z = nz; } else if (walkable(cfg, nx, h.z, S)) { h.x = nx; h.vz *= 0.5; } else if (walkable(cfg, h.x, nz, S)) { h.z = nz; h.vx *= 0.5; } else { h.vx *= 0.3; h.vz *= 0.3; }
  const speed = Math.hypot(h.vx, h.vz);
  if (speed > 0.3) h.face = Math.atan2(h.vx, h.vz);
  const room = () => carryCap(cfg, S) - h.n;
  const addPile = (n) => { const m = Math.min(n, W.pile.cap - S.pile); S.pile += m; return m; };

  // ---- mining by hand: stand in the circle, the swing lands every swingTime seconds
  const sw = swingTime(cfg, S);
  h.mining = near(h, W.mine.x, W.mine.z, W.mine.r) && speed < 2.4 && useful(cfg, S, 'mine');
  if (h.mining) {
    h.face = Math.PI; h.swing += dt;
    if (h.swing >= sw) { h.swing -= sw; ev(S, 'hit', { n: addPile(cfg.mining.perHit), src: 'hero' }); S.progressT = 0; }
  } else h.swing = Math.min(h.swing, sw * 0.6);

  // ---- the glint: a sparkle on the meteor; a tap on it is a Perfect Strike (3 chunks and a big burst)
  if (S.glint) { S.glint.t += dt; if (S.glint.t > cfg.glint.life) { ev(S, 'glintGone', {}); S.glint = null; S.glintT = 0; } }
  else if ((S.glintT += dt) >= cfg.glint.every * perk(cfg, S, 'luck')) { S.glint = { t: 0, lon: (rand() - 0.5) * 1.5, lat: 0.15 + rand() * 0.55 }; ev(S, 'glint', { ...S.glint }); }
  if (tap && tap.glint && S.glint) {
    ev(S, 'perfect', { n: addPile(cfg.glint.chunks), lon: S.glint.lon, lat: S.glint.lat }); S.glint = null; S.glintT = 0; S.progressT = 0;
  }

  // ---- machines that mine on their own: drill rig, laser cutter
  if (has(S, 'rig')) { S.rig = S.rig || { t: 0 }; if ((S.rig.t += dt) >= cfg.rig.period) { S.rig.t -= cfg.rig.period; ev(S, 'rigHit', { n: addPile(cfg.rig.chunks) }); } }
  if (has(S, 'laser') && (S.laser.t += dt) >= cfg.laser.period) { S.laser.t -= cfg.laser.period; ev(S, 'laserHit', { n: addPile(cfg.laser.chunks) }); }
  if (has(S, 'rig2') && (S.rig2.t += dt) >= cfg.rig.period) { S.rig2.t -= cfg.rig.period; ev(S, 'rig2Hit', { n: addPile(cfg.rig.chunks) }); }

  // ---- conveyor: chunks ride from the pile to the emptiest built polisher
  if (has(S, 'conveyor') && S.pile > 0 && (S.conv.t += dt) >= cfg.conveyor.every) {
    S.conv.t = 0; let best = null;
    for (const p of polOn(cfg, S)) if (p.polIn < W.polisherCap && (!best || p.polIn < best.polIn)) best = p;
    if (best) { S.pile--; best.polIn++; ev(S, 'conv', { to: best.id }); }
  }

  // ---- pick up and drop (one item per pickEvery / dropEvery while standing there)
  h.pickT -= dt; h.dropT -= dt;
  const wsIn = pt(W.workshop.in);
  if (h.pickT <= 0) {
    if (near(h, W.pile.x, W.pile.z, W.pile.r) && useful(cfg, S, 'pile') && room() > 0) { S.pile--; h.kind = 'chunk'; h.n++; h.pickT = cfg.hero.pickEvery; ev(S, 'pick', { kind: 'chunk', n: h.n, from: 'pile' }); }
    else if (near(h, W.counter.x, W.counter.z, W.counter.r) && useful(cfg, S, 'counter') && room() > 0) { S.counter--; h.kind = 'gem'; h.n++; h.pickT = cfg.hero.pickEvery; ev(S, 'pick', { kind: 'gem', n: h.n, from: 'counter' }); }
    else if (has(S, 'workshop') && near(h, wsIn.x, wsIn.z, W.workshop.r) && S.ws.rings > 0 && room() > 0 && (h.kind === null || h.kind === 'ring')) { S.ws.rings--; h.kind = 'ring'; h.n++; h.pickT = cfg.hero.pickEvery; ev(S, 'pick', { kind: 'ring', n: h.n, from: 'workshop' }); }
  }
  if (h.dropT <= 0 && h.n > 0) {
    const O = W.order;
    let done = false;
    if (S.order && h.kind === S.order.kind && near(h, O.x, O.z, O.r)) {
      const tip = cfg.order.tip + perk(cfg, S, 'tip');
      h.n--; done = true; S.hearts++; S.cashPile += tip; S.earned += tip; S.progressT = 0; ev(S, 'orderDone', { kind: S.order.kind, tip, n: h.n }); S.order = null; S.orderT = cfg.order.every;
    }
    if (!done && h.kind === 'chunk') for (const p of polOn(cfg, S)) { const q = pt(polDef(cfg, p.id).in); if (near(h, q.x, q.z, W.polisherR) && p.polIn < W.polisherCap) { h.n--; p.polIn++; ev(S, 'drop', { at: p.id, n: h.n }); done = true; break; } }
    if (!done && h.kind === 'chunk' && near(h, W.crate.x, W.crate.z, W.crate.r)) { h.n--; S.cashPile += W.crate.pay; ev(S, 'drop', { at: 'crate', n: h.n }); S.progressT = 0; done = true; }
    const keep = S.order && S.order.kind === h.kind && h.n === 1; // the last one is saved for the kid's order
    if (!done && ITEMS.includes(h.kind) && !keep) for (const s of standOn(cfg, S)) { const q = pt(standDef(cfg, s.id).in); if (near(h, q.x, q.z, W.standR) && s.items.length < W.standCap) { h.n--; s.items.push(h.kind); ev(S, 'drop', { at: s.id, kind: h.kind, n: h.n }); done = true; break; } }
    if (!done && h.kind === 'gem' && has(S, 'workshop') && near(h, wsIn.x, wsIn.z, W.workshop.r) && S.ws.gemsIn < W.workshop.gemCap) { h.n--; S.ws.gemsIn++; ev(S, 'drop', { at: 'workshop', n: h.n }); done = true; }
    if (!done && h.kind === 'gem' && !keep && cartRoom(cfg, S) && near(h, W.cart.x, W.cart.z, W.cart.r)) {
      h.n--; S.ghost.n++; ev(S, 'drop', { at: 'cart', n: h.n }); done = true;
      if (S.ghost.n >= cfg.cart.cap) { S.ghost.go = 0; ev(S, 'cartGo', { lit: S.ghost.lit }); S.progressT = 0; }
    }
    if (done) h.dropT = cfg.hero.dropEvery;
    if (h.n === 0) h.kind = null;
  }

  // ---- polishers: 3 chunks -> 1 gem onto the counter; the ring workshop: 2 gems -> 1 ring
  for (const p of polOn(cfg, S)) {
    if (p.polIn >= cfg.polish.per && S.counter < W.counter.cap) {
      if ((p.polT += dt) >= polishTime(cfg, S)) { p.polT = 0; p.polIn -= cfg.polish.per; S.counter++; S.made++; ev(S, 'gem', { from: p.id }); S.progressT = 0; }
    } else p.polT = 0;
  }
  if (has(S, 'workshop') && S.ws.gemsIn >= cfg.workshop.per && S.ws.rings < W.workshop.ringCap) {
    if ((S.ws.t += dt) >= cfg.workshop.time) { S.ws.t = 0; S.ws.gemsIn -= cfg.workshop.per; S.ws.rings++; ev(S, 'ring', {}); S.progressT = 0; }
  } else S.ws.t = 0;
  // the crown jeweler turns a ring into a crown and ships it off for a big payout (one ring stays for a ring order)
  if (has(S, 'crown') && (S.jw.t += dt) >= cfg.crown.every) {
    if (S.ws.rings > (S.order && S.order.kind === 'ring' ? 1 : 0)) { S.jw.t = 0; S.ws.rings--; S.cashPile += cfg.crown.pay; S.earned += cfg.crown.pay; S.progressT = 0; ev(S, 'crown', { pay: cfg.crown.pay }); }
    else S.jw.t = cfg.crown.every;
  }
  // the mine cart: a full cart rolls to the ghost town; the first trips each light a building up (the district goal)
  if (S.ghost.go >= 0 && (S.ghost.go += dt) >= cfg.cart.trip) {
    const lightUp = S.ghost.lit < cfg.cart.lights, pay = S.ghost.n * cfg.cart.pay + (lightUp ? cfg.cart.tip : 0);
    S.ghost.go = -1; S.ghost.n = 0; S.cashPile += pay; S.earned += pay; S.progressT = 0;
    if (lightUp) { S.ghost.lit++; ev(S, 'ghostLight', { i: S.ghost.lit - 1, pay }); if (S.ghost.lit === cfg.cart.lights) ev(S, 'districtDone', {}); }
    else ev(S, 'cartBack', { pay });
  }

  // ---- the shopkeeper (an armadillo): counter -> the stand with the most room, on foot
  if (has(S, 'keeper')) stepKeeper(cfg, S, dt);

  // ---- tourists: walk to a free spot at a built stand, take an item, pay, leave; the tour bus brings a wave
  if (has(S, 'road')) {
    if (S.bus.next < 0) S.bus.next = S.t + cfg.bus.first;
    if (S.t >= S.bus.next) { S.bus.next = S.t + cfg.bus.every; S.bus.wave = cfg.bus.wave + (has(S, 'cable') ? cfg.cable.busWave : 0); S.nextTourist = 0; ev(S, 'bus', {}); }
  }
  for (const s of S.stands) s.lock = Math.max(0, s.lock - dt);
  S.nextTourist -= dt;
  if (S.nextTourist <= 0) {
    S.nextTourist = S.bus.wave > 0 ? cfg.bus.spawn : spawnEvery(cfg, S) / standOn(cfg, S).length; // each built stand draws its own line
    const taken = new Set(S.tourists.filter((q) => q.st !== 'leave').map((q) => q.stand + ':' + q.spot));
    const free = [];
    for (const s of standOn(cfg, S)) standDef(cfg, s.id).spots.forEach((_, i) => { if (!taken.has(s.id + ':' + i)) free.push([s.id, i]); });
    if (free.length) {
      const [sid, i] = free[Math.floor(rand() * free.length)], C = W.crowd;
      S.tourists.push({ id: S.tid++, stand: sid, spot: i, st: 'come', x: C.x0 + rand() * (C.x1 - C.x0), z: C.z0 + 0.4, t: 0, look: rand(), bus: S.bus.wave > 0 });
      if (S.bus.wave > 0) S.bus.wave--;
    }
  }
  for (const q of S.tourists) {
    q.t += dt;
    const sd = standDef(cfg, q.stand), target = q.st === 'leave' ? { x: q.ox, z: W.crowd.z1 + 1.5 } : pt(sd.spots[q.spot]);
    const dx = target.x - q.x, dz = target.z - q.z, L = Math.hypot(dx, dz), v = cfg.sell.walk * dt;
    if (L > 0.05) { q.x += (dx / L) * Math.min(v, L); q.z += (dz / L) * Math.min(v, L); q.face = Math.atan2(dx, dz); q.moving = true; } else q.moving = false;
    const s = S.stands.find((o) => o.id === q.stand);
    if (q.st === 'come' && L <= 0.05) { q.st = 'wait'; q.t = 0; q.face = Math.atan2(sd.x - q.x, sd.z - q.z); }
    else if (q.st === 'wait' && s.items.length > 0 && s.lock <= 0) { q.item = s.items.shift(); s.lock = cfg.sell.takeLock; q.st = 'buy'; q.t = 0; ev(S, 'take', { id: q.id, stand: q.stand, kind: q.item }); }
    else if (q.st === 'buy' && q.t >= cfg.sell.pay) {
      const pay = price(cfg, S, q.item);
      q.st = 'leave'; q.ox = q.x + (rand() - 0.5) * 4; S.cashPile += pay; S.sold++; S.earned += pay; S.progressT = 0;
      ev(S, 'sale', { id: q.id, amount: pay, kind: q.item, x: q.x, z: q.z });
    }
  }
  S.tourists = S.tourists.filter((q) => !(q.st === 'leave' && q.z >= W.crowd.z1 + 1.4));

  // ---- orders: one tourist kid at a time asks for a gem (or a ring once the workshop is built); no timer
  if (!S.order && S.sold > 0 && ((S.orderT -= dt) <= 0 || S.beatT > cfg.order.quiet)) { // a quiet spell brings the next kid early
    const ring = has(S, cfg.order.ringAfter) && rand() < cfg.order.ringShare;
    S.order = { kind: ring ? 'ring' : 'gem', t: 0 }; ev(S, 'order', { kind: S.order.kind });
  }
  if (S.order) S.order.t += dt;

  // ---- cash: walk over the pile to collect, stand on a pad to pay into it
  h.cashT -= dt;
  if (S.cashPile > 0 && near(h, W.cash.x, W.cash.z, cashR(cfg, S)) && h.cashT <= 0) {
    const n = Math.min(S.cashPile, 1 + Math.floor(S.cashPile / 12)); S.cashPile -= n; h.cash += n; h.cashT = cfg.coinFlow.collectEvery; ev(S, 'collect', { n });
  }
  S.pads.forEach((p, i) => {
    const def = cfg.pads[i];
    if (!p.shown && (def.after === 'firstSale' ? S.sold > 0 : i > 0 && S.pads[i - 1].done)) { p.shown = true; ev(S, 'padShow', { id: p.id }); }
    if (!p.shown || p.done) return;
    if (near(h, def.x, def.z, 1.3) && h.cash > 0) {
      p.payT -= dt;
      while (p.payT <= 0 && h.cash > 0 && p.paid < p.price) {
        p.rate = Math.min(cfg.coinFlow.payMax, p.rate * cfg.coinFlow.payGrow); p.payT += 1 / p.rate; h.cash--; p.paid++; ev(S, 'pay', { id: p.id, paid: p.paid });
      }
      if (p.paid >= p.price) { p.done = true; S.progressT = 0; ev(S, 'unlock', { id: p.id }); pushOut(cfg, S, def); if (p.id === 'heart') S.finale = { t: 0, st: 0 }; }
    } else { p.payT = 0; p.rate = cfg.coinFlow.payStart; }
  });

  // ---- critter eggs: one lodged in the meteor drops at its time, hatches when the hero walks onto it
  const E = S.egg;
  E.t += dt;
  if (E.st === 'lodged' && E.who && S.t >= E.at) { E.st = 'waiting'; E.t = 0; ev(S, 'eggDrop', { who: E.who }); }
  else if (E.st === 'waiting' && near(h, W.egg.x, W.egg.z, cfg.egg.r)) { E.st = 'hatching'; E.t = 0; ev(S, 'hatchStart', { who: E.who }); S.progressT = 0; }
  else if (E.st === 'hatching' && E.t >= cfg.egg.hatch) {
    const rare = (cfg.critters.find((c) => c.id === E.who) || {}).rarity;
    S.critters.push({ id: E.who, x: W.egg.x, z: W.egg.z, vx: 0, vz: 0, face: 0 }); S.eggs++; S.noRare = rare === 'rare' ? 0 : S.noRare + 1;
    ev(S, 'hatch', { who: E.who, rarity: rare }); S.progressT = 0;
    nextEgg(cfg, S);
  }
  // critters walk in a parade: each one follows the one in front (the first follows the hero)
  let lead = h;
  for (const c of S.critters) {
    const f = cfg.critter.follow, tx = lead.x - Math.sin(lead.face) * f, tz = lead.z - Math.cos(lead.face) * f, kk = cfg.critter.spring;
    c.vx += ((tx - c.x) * kk - c.vx * 2 * Math.sqrt(kk)) * dt; c.vz += ((tz - c.z) * kk - c.vz * 2 * Math.sqrt(kk)) * dt;
    c.x += c.vx * dt; c.z += c.vz * dt;
    if (Math.hypot(c.vx, c.vz) > 0.25) c.face = Math.atan2(c.vx, c.vz);
    lead = c;
  }

  // ---- the finale: the heart of the meteor rises, the crown critter hatches from it, a comet points to chapter 2
  if (S.finale) {
    const F = S.finale, FC = cfg.finale; F.t += dt;
    const beats = [['finale', 0], ['heartRise', FC.rise], ['crownHatch', FC.crown], ['comet', FC.comet], ['finaleEnd', FC.end]];
    while (F.st < beats.length && F.t >= beats[F.st][1]) {
      const [type] = beats[F.st++]; S.progressT = 0;
      if (type === 'finale') { S.rush.on = true; S.rush.left = cfg.rush.length; S.rush.spawnT = 0; }
      if (type === 'crownHatch' && !S.critters.some((c) => c.id === FC.critter)) S.critters.push({ id: FC.critter, x: W.egg.x, z: W.egg.z, vx: 0, vz: 0, face: 0 });
      ev(S, type, type === 'crownHatch' ? { who: FC.critter } : {});
      if (type === 'finaleEnd') { S.finale = null; S.done1 = true; break; }
    }
  }
  // ---- town stars and the hats they unlock (checked every step; each fires once)
  const SC = cfg.stars, earn = (id, ok) => { if (ok && !S.stars.includes(id)) { S.stars.push(id); ev(S, 'star', { id, n: S.stars.length }); S.progressT = 0; } };
  earn('orders', S.hearts >= SC.orders); earn('critters', S.critters.length >= SC.critters); earn('town', S.ghost.lit >= cfg.cart.lights && has(S, 'neon'));
  for (const hd of cfg.hats) {
    if (S.hats.includes(hd.id)) continue;
    if ((hd.stars && S.stars.length >= hd.stars) || (hd.hearts && S.hearts >= hd.hearts) || (hd.finale && S.done1)) { S.hats.push(hd.id); S.hat = hd.id; ev(S, 'hat', { id: hd.id }); }
  }

  // ---- Crystal Rush: the meteor flares, chunks and coins rain onto the deck for a few seconds; scoop them up
  const R = S.rush, RC = cfg.rush;
  if (!R.on && S.t >= R.next && !S.finale) { R.on = true; R.left = RC.length; R.spawnT = 0; ev(S, 'rush', {}); }
  if (R.on) {
    R.left -= dt;
    if ((R.spawnT -= dt) <= 0 && S.loose.length < RC.max) {
      R.spawnT = RC.spawn;
      for (let tries = 0; tries < 6; tries++) {
        const D = W.deck, x = D.x0 + 1 + rand() * (D.x1 - D.x0 - 2), z = D.z0 + 1 + rand() * (D.z1 - D.z0 - 2);
        if (walkable(cfg, x, z, S)) { const l = { id: S.lid++, kind: rand() < RC.coinShare ? 'coin' : 'chunk', x, z }; S.loose.push(l); ev(S, 'loose', { ...l }); break; }
      }
    }
    if (R.left <= 0) { R.on = false; R.next = S.t + RC.every; ev(S, 'rushEnd', { left: S.loose.length }); S.loose = []; }
  }
  for (let i = S.loose.length - 1; i >= 0; i--) {
    const l = S.loose[i];
    if (!near(h, l.x, l.z, RC.pickR)) continue;
    if (l.kind === 'coin') { h.cash++; S.loose.splice(i, 1); ev(S, 'scoop', { id: l.id, kind: 'coin' }); }
    else if ((h.kind === null || h.kind === 'chunk') && room() > 0) { h.kind = 'chunk'; h.n++; S.loose.splice(i, 1); ev(S, 'scoop', { id: l.id, kind: 'chunk', n: h.n }); }
  }
  return S;
}

/**
 * Picks the next critter from the ones not hatched yet (weighted by rarity; after egg.pity eggs without a rare one, a
 * rare one is sure) and schedules its egg. The laser makes eggs come sooner. Legendary critters never come from eggs.
 */
function nextEgg(cfg, S) {
  let left = cfg.critters.filter((c) => c.rarity !== 'legendary' && !S.critters.some((o) => o.id === c.id));
  if (!left.length) { S.egg = { st: 'none', t: 0, at: Infinity, who: null }; return; }
  const rares = left.filter((c) => c.rarity === 'rare');
  if (rares.length && S.noRare >= cfg.egg.pity) left = rares;
  const wsum = left.reduce((a, c) => a + cfg.egg.weights[c.rarity], 0); let r = S.random() * wsum, pickC = left[left.length - 1];
  for (const c of left) { r -= cfg.egg.weights[c.rarity]; if (r < 0) { pickC = c; break; } }
  const who = pickC.id;
  S.egg = { st: 'lodged', t: 0, at: S.t + cfg.egg.every * (has(S, 'laser') ? cfg.laser.eggK : 1), who };
}

/** A new building must not trap the hero inside it: step them out to the nearest walkable point. */
function pushOut(cfg, S, def) {
  const h = S.hero; if (walkable(cfg, h.x, h.z, S)) return;
  for (let r = 0.5; r < 4; r += 0.25) for (let a = 0; a < 6.28; a += 0.4) { const x = h.x + Math.sin(a) * r, z = h.z + Math.cos(a) * r; if (walkable(cfg, x, z, S)) { h.x = x; h.z = z; return; } }
  void def;
}

/** The shopkeeper walks counter -> stand (via waypoints around the first stand) carrying up to keeper.carry gems. */
function stepKeeper(cfg, S, dt) {
  const W = cfg.world, KC = cfg.keeper;
  if (!S.keeper) S.keeper = { x: W.keeperHome.x, z: W.keeperHome.z, n: 0, path: [], pickT: 0, face: 0, moving: false };
  const k = S.keeper;
  if (!k.path.length) {
    if (!k.go && k.n < KC.carry && S.counter > 0) {
      if (Math.hypot(k.x - W.keeperHome.x, k.z - W.keeperHome.z) > 0.2) k.path = [{ ...W.keeperHome }];
      else if ((k.pickT -= dt) <= 0) { S.counter--; k.n++; k.pickT = KC.pickEvery; ev(S, 'keeperPick', { n: k.n }); if (k.n >= KC.carry || S.counter === 0) k.go = true; }
    } else if (k.n > 0) {
      let best = null; for (const s of standOn(cfg, S)) if (s.items.length < W.standCap && (!best || s.items.length < best.items.length)) best = s;
      if (best) {
        const q = pt(standDef(cfg, best.id).in);
        k.path = best.id === 'stand' ? [{ x: 0.6, z: 7.6 }, q] : [{ x: 0.6, z: 4.2 }, { x: 4.8, z: 4.2 }, q];
        k.target = best.id; k.go = false;
      }
    }
  }
  if (k.path.length) {
    const p = k.path[0], dx = p.x - k.x, dz = p.z - k.z, L = Math.hypot(dx, dz), v = KC.speed * dt;
    if (L > 0.05) { k.x += (dx / L) * Math.min(v, L); k.z += (dz / L) * Math.min(v, L); k.face = Math.atan2(dx, dz); k.moving = true; }
    else {
      k.path.shift(); k.moving = k.path.length > 0;
      if (!k.path.length && k.target) {
        const s = S.stands.find((o) => o.id === k.target);
        while (k.n > 0 && s.items.length < W.standCap) { k.n--; s.items.push('gem'); }
        ev(S, 'keeperDrop', { at: k.target }); k.target = null; if (k.n === 0) k.path = [{ ...W.keeperHome }];
      }
    }
  } else k.moving = false;
}

/**
 * One step of a route on a coarse grid over the deck: a distance field from the target (breadth first, rebuilt when
 * the target or the buildings change), then the neighbour cell nearest to the target. Returns a direction or null.
 */
function navStep(cfg, S, g) {
  const D = cfg.world.deck, c = 0.4, nx = Math.ceil((D.x1 - D.x0) / c) + 1, nz = Math.ceil((D.z1 - D.z0) / c) + 1, h = S.hero;
  const key = `${g.x.toFixed(1)},${g.z.toFixed(1)}:${S.pads.filter((p) => p.done).length}`;
  if (!S._nav || S._nav.key !== key) {
    const open = new Uint8Array(nx * nz), dist = new Int32Array(nx * nz).fill(-1), q = [];
    for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) open[j * nx + i] = walkable(cfg, D.x0 + i * c, D.z0 + j * c, S) ? 1 : 0;
    for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) { const k = j * nx + i; if (open[k] && (D.x0 + i * c - g.x) ** 2 + (D.z0 + j * c - g.z) ** 2 < 0.8 * 0.8) { dist[k] = 0; q.push(k); } }
    for (let qi = 0; qi < q.length; qi++) {
      const k = q[qi], i = k % nx, j = (k - i) / nx;
      for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const a = i + di, b = j + dj, kk = b * nx + a; if (a >= 0 && b >= 0 && a < nx && b < nz && open[kk] && dist[kk] < 0) { dist[kk] = dist[k] + 1; q.push(kk); } }
    }
    Object.defineProperty(S, '_nav', { value: { key, dist }, configurable: true, writable: true, enumerable: false });
  }
  const dist = S._nav.dist, i0 = Math.round((h.x - D.x0) / c), j0 = Math.round((h.z - D.z0) / c);
  let best = null, bd = 1e9;
  for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
    const i = i0 + di, j = j0 + dj; if (i < 0 || j < 0 || i >= nx || j >= nz) continue;
    const d = dist[j * nx + i]; if (d < 0) continue;
    const vx = D.x0 + i * c - h.x, vz = D.z0 + j * c - h.z, l = Math.hypot(vx, vz);
    if (l < 0.05 || !walkable(cfg, h.x + (vx / l) * 0.12, h.z + (vz / l) * 0.12, S)) continue; // never steer into a wall the hero touches
    const cost = d + l * 0.5;
    if (cost < bd) { bd = cost; best = { x: vx / l, z: vz / l }; }
  }
  return best;
}

/** Bot input: walk toward the guide's target (the demo in edit mode and ?bot). Returns { x, z } and the target. */
export function botInput(cfg, S) {
  const g = guide(cfg, S); if (!g) return { x: 0, z: 0, g };
  const h = S.hero, dx = g.x - h.x, dz = g.z - h.z, L = Math.hypot(dx, dz);
  if (L < 0.25) return { x: 0, z: 0, g };
  let x = dx / L, z = dz / L;
  const clear = (() => { for (let r = 0.3; r < L; r += 0.3) if (!walkable(cfg, h.x + x * r, h.z + z * r, S)) return false; return true; })();
  const step = clear ? null : navStep(cfg, S, g);
  if (step) { x = step.x; z = step.z; }
  else if (!clear) {
    // no route from here (hero just pushed out of a new building): steer around, first of 0, ±25°, ±50°, ... that is open
    const a0 = Math.atan2(dx, dz);
    for (const d of [0, 0.45, -0.45, 0.9, -0.9, 1.35, -1.35, 1.8, -1.8, 2.25, -2.25, 2.7, -2.7, 3.14]) {
      const a = a0 + d, ok = [0.35, 0.7, 1.05].every((r) => walkable(cfg, h.x + Math.sin(a) * Math.min(r, L), h.z + Math.cos(a) * Math.min(r, L), S));
      if (ok) { x = Math.sin(a); z = Math.cos(a); break; }
    }
  }
  // the bot also scoops Rush pickups on the way when one is close
  if (S.loose.length && !g.wait) { const l = S.loose.find((q) => Math.hypot(q.x - h.x, q.z - h.z) < 2.5 && (q.kind === 'coin' || h.kind === null || h.kind === 'chunk')); if (l) { const lx = l.x - h.x, lz = l.z - h.z, ll = Math.hypot(lx, lz) || 1; x = lx / ll; z = lz / ll; } }
  return { x, z, g };
}

/** What gets saved: progress only (positions and in-flight things start fresh). */
export function serialize(cfg, S) {
  return {
    v: cfg.save.version, t: Math.round(S.t), cash: S.hero.cash, kind: S.hero.kind, n: S.hero.n, cashPile: S.cashPile + (S.ghost.go >= 0 ? S.ghost.n * cfg.cart.pay + (S.ghost.lit < cfg.cart.lights ? cfg.cart.tip : 0) : 0), pile: S.pile, counter: S.counter,
    pols: S.pols.map((p) => p.polIn), stands: S.stands.map((s) => s.items.slice()), ws: { g: S.ws.gemsIn, r: S.ws.rings },
    pads: S.pads.map((p) => [p.paid, p.done ? 1 : 0]), critters: S.critters.map((c) => c.id), hearts: S.hearts, sold: S.sold, made: S.made, earned: S.earned,
    ghost: { n: S.ghost.go >= 0 ? 0 : S.ghost.n, lit: S.ghost.lit + (S.ghost.go >= 0 && S.ghost.lit < cfg.cart.lights ? 1 : 0) }, stars: ['orders', 'critters', 'town'].filter((id) => S.stars.includes(id)), hats: cfg.hats.map((x) => x.id).filter((id) => S.hats.includes(id)), hat: S.hat,
    done1: S.done1 || !!S.finale, eggs: S.eggs, noRare: S.noRare,
  };
}

/** A state rebuilt from serialize() output; anything missing or malformed falls back to a fresh value. */
export function restore(cfg, d, seed = cfg.seed) {
  const S = createState(cfg, seed);
  if (!d || d.v !== cfg.save.version) return S;
  const num = (v, lo, hi, def) => (Number.isFinite(v) ? Math.max(lo, Math.min(hi, Math.floor(v))) : def);
  const W = cfg.world;
  S.t = num(d.t, 0, 1e7, 0); S.hero.cash = num(d.cash, 0, 1e9, 0); S.cashPile = num(d.cashPile, 0, 1e9, 0); S.pile = num(d.pile, 0, W.pile.cap, S.pile); S.counter = num(d.counter, 0, W.counter.cap, S.counter);
  if (Array.isArray(d.pads)) d.pads.forEach((p, i) => { if (S.pads[i] && Array.isArray(p)) { S.pads[i].paid = num(p[0], 0, S.pads[i].price, 0); S.pads[i].done = !!p[1]; S.pads[i].shown = S.pads[i].done || (i === 0 ? num(d.sold, 0, 1e9, 0) > 0 : !!(d.pads[i - 1] && d.pads[i - 1][1])); } });
  if (Array.isArray(d.pols)) d.pols.forEach((v, i) => { if (S.pols[i]) S.pols[i].polIn = num(v, 0, W.polisherCap, 0); });
  if (Array.isArray(d.stands)) d.stands.forEach((v, i) => { if (S.stands[i] && Array.isArray(v)) S.stands[i].items = v.filter((x) => ITEMS.includes(x)).slice(0, W.standCap); });
  if (d.ws) { S.ws.gemsIn = num(d.ws.g, 0, W.workshop.gemCap, 0); S.ws.rings = num(d.ws.r, 0, W.workshop.ringCap, 0); }
  S.hearts = num(d.hearts, 0, 1e9, 0); S.sold = num(d.sold, 0, 1e9, 0); S.made = num(d.made, 0, 1e9, 0); S.earned = num(d.earned, 0, 1e9, 0);
  if (Array.isArray(d.critters)) for (const id of d.critters) if (cfg.critters.some((c) => c.id === id) && !S.critters.some((c) => c.id === id)) S.critters.push({ id, x: S.hero.x, z: S.hero.z + 1, vx: 0, vz: 0, face: 0 });
  if (ITEMS.concat('chunk').includes(d.kind)) { S.hero.kind = d.kind; S.hero.n = num(d.n, 0, carryCap(cfg, S), 0); if (!S.hero.n) S.hero.kind = null; }
  if (d.ghost) { S.ghost.lit = num(d.ghost.lit, 0, cfg.cart.lights, 0); S.ghost.n = num(d.ghost.n, 0, cfg.cart.cap - 1, 0); }
  if (Array.isArray(d.stars)) S.stars = ['orders', 'critters', 'town'].filter((id) => d.stars.includes(id));
  if (Array.isArray(d.hats)) S.hats = cfg.hats.map((x) => x.id).filter((id, i) => i === 0 || d.hats.includes(id));
  if (S.hats.includes(d.hat)) S.hat = d.hat;
  S.done1 = !!d.done1 && has(S, 'heart'); S.eggs = num(d.eggs, 0, 1e6, S.critters.length); S.noRare = num(d.noRare, 0, 1e6, 0);
  if (has(S, 'heart') && !S.done1) S.done1 = true; // a save made mid-finale: the finale counts as seen
  if (S.done1 && !S.critters.some((c) => c.id === cfg.finale.critter)) S.critters.push({ id: cfg.finale.critter, x: S.hero.x, z: S.hero.z + 1, vx: 0, vz: 0, face: 0 });
  if (S.critters.length) { nextEgg(cfg, S); S.egg.at = S.t + Math.min(cfg.egg.every, 25); }
  S.rush.next = S.t + cfg.rush.first; S.orderT = cfg.order.first * 0.5; S.glintT = cfg.glint.every * 0.5;
  return S;
}

/**
 * Adaptive quality: average frame time ms over a window -> new { tier, rs, okT, fails }. First lowers the render
 * scale, then the tier; climbs back slowly, and never into a tier that failed twice.
 */
export function adaptQuality(q, s, ms, win) {
  const n = { tier: s.tier, rs: s.rs, okT: s.okT, fails: s.fails.slice() };
  const stepv = (v, d) => Math.round((v + d) * 100) / 100;
  if (ms > q.dropMs) {
    n.okT = 0;
    if (n.rs > q.resMin) n.rs = Math.max(q.resMin, stepv(n.rs, -q.resStep));
    else if (n.tier > 0) { n.fails[n.tier] = (n.fails[n.tier] || 0) + 1; n.tier--; n.rs = 1; }
  } else if (ms < q.upMs) {
    n.okT += win;
    if (n.okT >= q.upAfter) {
      n.okT = 0;
      if (n.rs < 1) n.rs = Math.min(1, stepv(n.rs, q.resStep));
      else if (n.tier < q.start && (n.fails[n.tier + 1] || 0) < 2) { n.tier++; n.rs = q.resMin; }
    }
  } else n.okT = 0;
  return n;
}

/** Time-of-day keys blended at t in [0, 1]: numbers lerp, colours stay hex strings (picked by the caller). */
export function todBlend(keys, t) {
  let a = keys[0], b = keys[keys.length - 1];
  for (let i = 0; i < keys.length - 1; i++) if (t >= keys[i].t && t <= keys[i + 1].t) { a = keys[i]; b = keys[i + 1]; break; }
  const k = b.t > a.t ? Math.min(1, Math.max(0, (t - a.t) / (b.t - a.t))) : 0;
  return { a, b, k };
}
