// PROTOTYPE - NOT FOR PRODUCTION
// Meteor Gem Works rules, pure (no THREE, no DOM): the mine -> polish -> sell -> build loop, glints, the critter egg,
// the guide (never points at a step that does nothing), and adaptive quality. game.js steps it and draws the result.
// Plan: prototypes/meteor-gem-works/plan.md (v2), milestone M1.

/** Seeded random in [0, 1) (mulberry32). */
export function rng(seed) {
  let s = seed >>> 0;
  return () => { s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

const near = (a, x, z, r) => (a.x - x) ** 2 + (a.z - z) ** 2 < r * r;
const pt = (p) => (Array.isArray(p) ? { x: p[0], z: p[1] } : { x: p.x, z: p.z });

/** A fresh game state from the config. */
export function createState(cfg, seed = cfg.seed) {
  const W = cfg.world;
  return {
    t: 0, random: rng(seed),
    hero: { x: W.mine.x - 0.6, z: W.mine.z + 3.2, vx: 0, vz: 0, face: Math.PI, kind: null, n: 0, cash: 0, swing: 0, mining: false, pickT: 0, dropT: 0, payT: 0, cashT: 0 },
    pile: cfg.start.pile, polIn: cfg.start.polIn, polT: 0, counter: cfg.start.counter, stand: 0, cashPile: 0, standLock: 0,
    tourists: [], nextTourist: 0.5, tid: 0,
    glint: null, glintT: cfg.glint.every * 0.5,
    egg: { st: 'lodged', t: 0 }, critter: null,
    pads: cfg.pads.map((p) => ({ id: p.id, price: p.price, paid: 0, shown: false, done: false, rate: cfg.cashFlow.payStart })),
    rig: null, sold: 0, made: 0, earned: 0, progressT: 0, events: [],
  };
}

/** Carry capacity (the critter's perk adds to it). */
export const carryCap = (cfg, S) => cfg.hero.carry + (S.critter ? cfg.egg.carryBonus : 0);

/** True when the hero standing at a station would do something there now (the guide only picks such targets). */
export function useful(cfg, S, what) {
  const h = S.hero, room = carryCap(cfg, S) - h.n, W = cfg.world;
  switch (what) {
    case 'mine': return h.kind !== 'gem' && S.pile < W.pile.cap;
    case 'pile': return S.pile > 0 && room > 0 && (h.kind === null || h.kind === 'chunk');
    case 'crate': return h.kind === 'chunk' && h.n > 0;
    case 'polisher': return h.kind === 'chunk' && h.n > 0 && S.polIn < W.polisher.cap;
    case 'counter': return S.counter > 0 && room > 0 && (h.kind === null || h.kind === 'gem');
    case 'stand': return h.kind === 'gem' && h.n > 0 && S.stand < W.stand.cap;
    case 'cash': return S.cashPile > 0;
    case 'egg': return S.egg.st === 'waiting';
    default: { const p = S.pads.find((q) => q.id === what); return !!p && p.shown && !p.done && h.cash > 0; }
  }
}

/** Where the station `what` is (the point the hero walks to). */
export function spot(cfg, what) {
  const W = cfg.world;
  if (what === 'polisher') return pt(W.polisher.in);
  if (what === 'stand') return pt(W.stand.in);
  if (what === 'egg') return pt(W.egg);
  if (W[what]) return pt(W[what]);
  const p = cfg.pads.find((q) => q.id === what); return p ? pt(p) : null;
}

/** The next useful step for the hero: { what, x, z }. Never a station that would do nothing (fix A in the plan). */
export function guide(cfg, S) {
  const h = S.hero, pad = S.pads.find((p) => p.shown && !p.done);
  const pick = (w) => (useful(cfg, S, w) ? { what: w, ...spot(cfg, w) } : null);
  if (pad && h.cash > 0 && h.cash >= pad.price - pad.paid) return pick(pad.id);
  const egg = pick('egg'); if (egg) return egg;
  if (h.kind === 'gem' && h.n > 0) return pick('stand') || pick('cash') || (pad && pick(pad.id)) || { what: 'stand', wait: true, ...spot(cfg, 'stand') };
  if (h.kind === 'chunk' && h.n > 0) {
    if (h.n < carryCap(cfg, S) && S.pile > 0 && near(h, cfg.world.pile.x, cfg.world.pile.z, cfg.world.pile.r)) return pick('pile');
    return pick('polisher') || pick('crate');
  }
  if (S.cashPile >= cfg.guide.cashMin || (pad && S.cashPile > 0 && h.cash + S.cashPile >= pad.price - pad.paid)) return pick('cash');
  if (pad && h.cash > 0) { const ps = spot(cfg, pad.id); if (near(h, ps.x, ps.z, 1.4)) return pick(pad.id); }
  return pick('counter') || (S.pile >= 6 && pick('pile')) || pick('cash') || pick('mine') || pick('pile');
}

/** Can the hero stand at (x, z)? Inside the deck, outside every obstacle circle. */
export function walkable(cfg, x, z) {
  const D = cfg.world.deck, r = cfg.hero.r;
  if (x < D.x0 + r || x > D.x1 - r || z < D.z0 + r || z > D.z1 - r) return false;
  for (const [ox, oz, or] of cfg.world.obstacles) if ((x - ox) ** 2 + (z - oz) ** 2 < (or + r) ** 2) return false;
  return true;
}

const ev = (S, type, data) => S.events.push({ type, t: S.t, ...data });
const unlockedRig = (S) => S.pads.some((p) => p.id === 'rig' && p.done);

/**
 * Advances the game by dt seconds. input = { x, z } wanted world direction (length <= 1), tap = { glint: true } when
 * the player tapped the glint. Appends events to S.events (the caller drains them).
 */
export function step(cfg, S, dt, input = { x: 0, z: 0 }, tap = null) {
  S.t += dt; S.progressT += dt;
  const W = cfg.world, h = S.hero, rand = S.random;
  // ---- movement: ease towards the wanted velocity, slide along edges
  const sp = cfg.hero.speed, k = Math.min(1, dt * cfg.hero.accel);
  h.vx += (input.x * sp - h.vx) * k; h.vz += (input.z * sp - h.vz) * k;
  const nx = h.x + h.vx * dt, nz = h.z + h.vz * dt;
  if (walkable(cfg, nx, nz)) { h.x = nx; h.z = nz; } else if (walkable(cfg, nx, h.z)) { h.x = nx; h.vz *= 0.5; } else if (walkable(cfg, h.x, nz)) { h.z = nz; h.vx *= 0.5; } else { h.vx *= 0.3; h.vz *= 0.3; }
  const speed = Math.hypot(h.vx, h.vz);
  if (speed > 0.3) h.face = Math.atan2(h.vx, h.vz);
  const room = () => carryCap(cfg, S) - h.n;

  // ---- mining by hand: stand in the circle, the swing lands every cfg.mining.swing seconds
  h.mining = near(h, W.mine.x, W.mine.z, W.mine.r) && speed < 2.4 && useful(cfg, S, 'mine');
  if (h.mining) {
    h.face = Math.PI; h.swing += dt;
    if (h.swing >= cfg.mining.swing) { h.swing -= cfg.mining.swing; const n = Math.min(cfg.mining.perHit, W.pile.cap - S.pile); S.pile += n; ev(S, 'hit', { n, src: 'hero' }); S.progressT = 0; }
  } else h.swing = Math.min(h.swing, cfg.mining.swing * 0.6);

  // ---- the glint: a sparkle on the meteor; a tap on it is a Perfect Strike (3 chunks and a big burst)
  if (S.glint) { S.glint.t += dt; if (S.glint.t > cfg.glint.life) { ev(S, 'glintGone', {}); S.glint = null; S.glintT = 0; } }
  else if ((S.glintT += dt) >= cfg.glint.every) { S.glint = { t: 0, lon: (rand() - 0.5) * 1.5, lat: 0.15 + rand() * 0.55 }; ev(S, 'glint', { ...S.glint }); }
  if (tap && tap.glint && S.glint) {
    const n = Math.min(cfg.glint.chunks, W.pile.cap - S.pile); S.pile += n;
    ev(S, 'perfect', { n, lon: S.glint.lon, lat: S.glint.lat }); S.glint = null; S.glintT = 0; S.progressT = 0;
  }

  // ---- the drill rig mines on its own once bought
  if (unlockedRig(S)) {
    S.rig = S.rig || { t: 0 }; S.rig.t += dt;
    if (S.rig.t >= cfg.rig.period) { S.rig.t -= cfg.rig.period; const n = Math.min(cfg.rig.chunks, W.pile.cap - S.pile); S.pile += n; ev(S, 'rigHit', { n }); }
  }

  // ---- pick up and drop (one item per pickEvery / dropEvery while standing there)
  h.pickT -= dt; h.dropT -= dt;
  if (h.pickT <= 0) {
    if (near(h, W.pile.x, W.pile.z, W.pile.r) && useful(cfg, S, 'pile') && room() > 0) { S.pile--; h.kind = 'chunk'; h.n++; h.pickT = cfg.hero.pickEvery; ev(S, 'pick', { kind: 'chunk', n: h.n }); }
    else if (near(h, W.counter.x, W.counter.z, W.counter.r) && useful(cfg, S, 'counter') && room() > 0) { S.counter--; h.kind = 'gem'; h.n++; h.pickT = cfg.hero.pickEvery; ev(S, 'pick', { kind: 'gem', n: h.n }); }
  }
  if (h.dropT <= 0 && h.n > 0) {
    const pin = pt(W.polisher.in), sin = pt(W.stand.in);
    if (h.kind === 'chunk' && near(h, pin.x, pin.z, W.polisher.r) && S.polIn < W.polisher.cap) { h.n--; S.polIn++; h.dropT = cfg.hero.dropEvery; ev(S, 'drop', { at: 'polisher', n: h.n }); }
    else if (h.kind === 'chunk' && near(h, W.crate.x, W.crate.z, W.crate.r)) { h.n--; S.cashPile += W.crate.pay; h.dropT = cfg.hero.dropEvery; ev(S, 'drop', { at: 'crate', n: h.n }); S.progressT = 0; }
    else if (h.kind === 'gem' && near(h, sin.x, sin.z, W.stand.r) && S.stand < W.stand.cap) { h.n--; S.stand++; h.dropT = cfg.hero.dropEvery; ev(S, 'drop', { at: 'stand', n: h.n }); }
    if (h.n === 0) h.kind = null;
  }

  // ---- the polisher: 3 chunks -> 1 gem onto the counter
  if (S.polIn >= cfg.polish.per && S.counter < W.counter.cap) {
    S.polT += dt;
    if (S.polT >= cfg.polish.time) { S.polT = 0; S.polIn -= cfg.polish.per; S.counter++; S.made++; ev(S, 'gem', {}); S.progressT = 0; }
  } else S.polT = 0;

  // ---- tourists: walk to a free spot at the stand, take a gem, pay, leave
  S.standLock = Math.max(0, S.standLock - dt);
  S.nextTourist -= dt;
  const taken = new Set(S.tourists.filter((q) => q.st !== 'leave').map((q) => q.spot));
  if (S.nextTourist <= 0) {
    S.nextTourist = cfg.sell.spawnEvery;
    const free = W.spots.findIndex((_, i) => !taken.has(i));
    if (free >= 0) { const C = W.crowd; S.tourists.push({ id: S.tid++, spot: free, st: 'come', x: C.x0 + rand() * (C.x1 - C.x0), z: C.z0 + 0.4, t: 0, look: rand() }); }
  }
  for (const q of S.tourists) {
    q.t += dt;
    const target = q.st === 'leave' ? { x: q.ox, z: W.crowd.z1 + 1.5 } : pt(W.spots[q.spot]);
    const dx = target.x - q.x, dz = target.z - q.z, L = Math.hypot(dx, dz), v = cfg.sell.walk * dt;
    if (L > 0.05) { q.x += (dx / L) * Math.min(v, L); q.z += (dz / L) * Math.min(v, L); q.face = Math.atan2(dx, dz); q.moving = true; } else q.moving = false;
    if (q.st === 'come' && L <= 0.05) { q.st = 'wait'; q.t = 0; q.face = Math.atan2(W.stand.x - q.x, W.stand.z - q.z); }
    else if (q.st === 'wait' && S.stand > 0 && S.standLock <= 0) { S.stand--; S.standLock = cfg.sell.takeLock; q.st = 'buy'; q.t = 0; ev(S, 'take', { id: q.id }); }
    else if (q.st === 'buy' && q.t >= cfg.sell.pay) {
      q.st = 'leave'; q.ox = q.x + (rand() - 0.5) * 4; S.cashPile += cfg.sell.price; S.sold++; S.earned += cfg.sell.price; S.progressT = 0;
      ev(S, 'sale', { id: q.id, amount: cfg.sell.price, x: q.x, z: q.z });
    }
  }
  S.tourists = S.tourists.filter((q) => !(q.st === 'leave' && q.z >= W.crowd.z1 + 1.4));

  // ---- cash: walk over the pile to collect, stand on a pad to pay into it
  h.cashT -= dt;
  if (S.cashPile > 0 && near(h, W.cash.x, W.cash.z, W.cash.r) && h.cashT <= 0) {
    const n = Math.min(S.cashPile, 1 + Math.floor(S.cashPile / 12)); S.cashPile -= n; h.cash += n; h.cashT = cfg.cashFlow.collectEvery; ev(S, 'collect', { n });
  }
  for (const p of S.pads) {
    const def = cfg.pads.find((d) => d.id === p.id);
    if (!p.shown && def.after === 'firstSale' && S.sold > 0) { p.shown = true; ev(S, 'padShow', { id: p.id }); }
    if (!p.shown || p.done) continue;
    if (near(h, def.x, def.z, 1.3) && h.cash > 0) {
      p.payT = (p.payT || 0) - dt;
      while (p.payT <= 0 && h.cash > 0 && p.paid < p.price) {
        p.rate = Math.min(cfg.cashFlow.payMax, p.rate * cfg.cashFlow.payGrow); p.payT += 1 / p.rate; h.cash--; p.paid++; ev(S, 'pay', { id: p.id, paid: p.paid });
      }
      if (p.paid >= p.price) { p.done = true; S.progressT = 0; ev(S, 'unlock', { id: p.id }); }
    } else { p.payT = 0; p.rate = cfg.cashFlow.payStart; }
  }

  // ---- the critter egg: lodged in the meteor, drops at a fixed time, hatches when the hero walks onto it
  const E = S.egg;
  E.t += dt;
  if (E.st === 'lodged' && S.t >= cfg.egg.dropAt) { E.st = 'waiting'; E.t = 0; ev(S, 'eggDrop', {}); }
  else if (E.st === 'waiting' && near(h, W.egg.x, W.egg.z, cfg.egg.r)) { E.st = 'hatching'; E.t = 0; ev(S, 'hatchStart', {}); S.progressT = 0; }
  else if (E.st === 'hatching' && E.t >= cfg.egg.hatch) { E.st = 'done'; S.critter = { x: W.egg.x, z: W.egg.z, vx: 0, vz: 0, face: 0 }; ev(S, 'hatch', { name: 'pup' }); S.progressT = 0; }
  if (S.critter) {
    const c = S.critter, f = cfg.critter.follow, tx = h.x - Math.sin(h.face) * f, tz = h.z - Math.cos(h.face) * f;
    const ax = (tx - c.x) * cfg.critter.spring - c.vx * 2 * Math.sqrt(cfg.critter.spring), az = (tz - c.z) * cfg.critter.spring - c.vz * 2 * Math.sqrt(cfg.critter.spring);
    c.vx += ax * dt; c.vz += az * dt; c.x += c.vx * dt; c.z += c.vz * dt;
    if (Math.hypot(c.vx, c.vz) > 0.25) c.face = Math.atan2(c.vx, c.vz);
  }
  return S;
}

/** Bot input: walk toward the guide's target (used by tests and ?bot). Returns { x, z } and the target. */
export function botInput(cfg, S) {
  const g = guide(cfg, S); if (!g) return { x: 0, z: 0, g };
  const h = S.hero, dx = g.x - h.x, dz = g.z - h.z, L = Math.hypot(dx, dz);
  if (L < 0.25) return { x: 0, z: 0, g };
  // steer around a station in the way: the first of 0, ±25°, ±50°, ... whose next metre is walkable
  const a0 = Math.atan2(dx, dz); let x = dx / L, z = dz / L;
  for (const d of [0, 0.45, -0.45, 0.9, -0.9, 1.35, -1.35, 1.8, -1.8]) {
    const a = a0 + d * (S.botSide || 1), ok = [0.35, 0.7, 1.05].every((r) => walkable(cfg, h.x + Math.sin(a) * Math.min(r, L), h.z + Math.cos(a) * Math.min(r, L)));
    if (ok) { x = Math.sin(a); z = Math.cos(a); break; }
  }
  return { x, z, g };
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
