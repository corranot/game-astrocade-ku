// PROTOTYPE - NOT FOR PRODUCTION
// Rules of Jelly Bump Party, with no DOM and no Three.js: the arena, the four jelly blobs, their one-button control
// (each blob spins its aim by itself; hold to stop the aim and charge, let go to dash), bumps, ring-outs, rounds,
// power-ups and the computer players. Units: the arena is a rounded rectangle around (0, 0) that fills the portrait
// frame (each frame corner left free for a player's button); x to the right, z down the screen.

/** Seat order everywhere: 0 red (bottom right), 1 blue (top left), 2 green (top right), 3 yellow (bottom left). */
export const SEATS = [
  { id: 'red', sx: 1, sz: 1 }, { id: 'blue', sx: -1, sz: -1 }, { id: 'green', sx: 1, sz: -1 }, { id: 'yellow', sx: -1, sz: 1 },
];

/** A small seeded random generator, so tests and replays are the same every run. */
export function rng(seed) {
  let a = seed >>> 0 || 1;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

/** First of the device's languages that the game has, else English. */
export function detectLang(list, langs) {
  for (const l of list || []) { const k = String(l || '').slice(0, 2).toLowerCase(); if (langs.includes(k)) return k; }
  return 'en';
}

const wrap = (a) => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/**
 * A new match. humans: seats played by people. opts.demo: nothing counts (attract mode); opts.easy: computer
 * players aim worse (the very first round a new player sees).
 */
export function createMatch(cfg, random, humans = [], opts = {}) {
  const M = {
    cfg, random, demo: !!opts.demo, easy: !!opts.easy, round: 0, phase: 'ready', timer: 0, t: 0,
    blobs: SEATS.map((s, i) => ({ seat: i, human: humans.includes(i), crowns: 0, kos: 0 })),
    items: [], itemClock: 0, mod: 'cake', s: 1, s0: 1, spinA: 0, winner: null, matchWinner: null, outOrder: [],
  };
  startRound(M, opts.firstGo);
  return M;
}

/** Arena modifier for round n (1-based): the first round is always plain cake, then a shuffled cycle. */
export function modFor(M, n) {
  const mods = M.cfg.mods; if (n <= 1) return mods[0];
  return mods[1 + Math.floor(M.random() * (mods.length - 1))];
}

/** Puts every blob back at its corner facing the middle and counts the next round in. */
export function startRound(M, go) {
  const c = M.cfg, b0 = c.blob;
  M.round++; M.mod = modFor(M, M.round); M.phase = 'ready'; M.timer = go != null ? go : c.match.go; M.t = 0;
  M.items = []; M.itemClock = 0; M.winner = null; M.outOrder = []; M.spinA = 0;
  M.s0 = M.mod === 'tiny' ? c.arena.tiny : 1; M.s = M.s0;
  // each blob starts towards its own corner, as far from its neighbours as from the middle
  const a = c.arena, sx0 = a.w * M.s0 * a.startX, sz0 = a.h * M.s0 * a.startZ;
  for (const b of M.blobs) {
    const s = SEATS[b.seat];
    Object.assign(b, { x: s.sx * sx0, z: s.sz * sz0, vx: 0, vz: 0, ang: Math.atan2(-s.sz, -s.sx), dir: b.seat % 2 ? -1 : 1,
      holding: false, holdT: 0, wantDash: false, cool: 0, out: false, fall: 0, lastBy: -1, lastT: -9, giant: 0, star: 0, dashT: 0, r: b0.r, mass: 1,
      // the demo is busy at once; a real round gives the player a moment first
      brain: { wait: (M.demo ? 0.05 : c.cpu.startWait) + M.random() * (M.demo ? 0.2 : 0.5), holdFor: 0, err: 0 }, hits: 0 });
  }
}

/** People press or let go of a seat's button. Letting go of a held, charged button dashes. */
export function setHold(M, seat, down) {
  const b = M.blobs[seat]; if (!b) return;
  if (down) { if (!b.holding && !b.out) { b.holding = true; b.holdT = 0; b.wantDash = false; } return; }
  if (!b.holding) return;
  b.holding = false;
  if (M.phase === 'play' && !b.out) b.wantDash = true;
}

/**
 * Signed distance from (x, z) to the floor's edge (below 0 inside) and the outward normal there. The floor is a
 * rounded rectangle of half width w, half height h and corner radius c (config), all scaled by M.s as it shrinks.
 */
export function edge(M, x, z) {
  const a = M.cfg.arena, W = a.w * M.s, H = a.h * M.s, C = a.c * M.s;
  const qx = Math.abs(x) - (W - C), qz = Math.abs(z) - (H - C), sx = x < 0 ? -1 : 1, sz = z < 0 ? -1 : 1;
  if (qx > 0 && qz > 0) { const l = Math.hypot(qx, qz); return { d: l - C, nx: qx / l * sx, nz: qz / l * sz }; }
  return qx > qz ? { d: qx - C, nx: sx, nz: 0 } : { d: qz - C, nx: 0, nz: sz };
}

/** How far the current charge would carry a blob on the current floor, for aiming. */
export function dashReach(M, charge) {
  const bc = M.cfg.blob, spd = bc.dashMin + (bc.dashMax - bc.dashMin) * charge;
  return spd / (bc.friction * (M.mod === 'ice' ? M.cfg.arena.iceFriction : 1));
}

function dash(M, b, ev) {
  const bc = M.cfg.blob, charge = clamp(b.holdT / bc.chargeTime, 0, 1), spd = bc.dashMin + (bc.dashMax - bc.dashMin) * charge;
  if (b.human) b.ang = assistAim(M, b, dashReach(M, charge) + 2 * bc.r);
  b.vx = b.vx * 0.3 + Math.cos(b.ang) * spd; b.vz = b.vz * 0.3 + Math.sin(b.ang) * spd;
  b.cool = bc.cooldown; b.dashT = 0.35; b.holdT = 0;
  ev.push({ type: 'dash', seat: b.seat, power: charge });
}

/** A person's dash bends towards the nearest blob inside a small cone of its aim and within reach (aim assist). */
export function assistAim(M, b, reach) {
  let best = null, bestD = 1e9;
  for (const o of M.blobs) {
    if (o === b || o.out) continue;
    const d = Math.hypot(o.x - b.x, o.z - b.z), a = Math.atan2(o.z - b.z, o.x - b.x);
    if (d < reach && Math.abs(wrap(a - b.ang)) < M.cfg.blob.assist && d < bestD) { bestD = d; best = a; }
  }
  return best == null ? b.ang : best;
}

/** Computer player: wait, line its spinning aim up with the nearest blob, hold a moment, let go; get back from the edge. */
function think(M, b, dt) {
  const c = M.cfg.cpu, brain = b.brain;
  if (b.holding) { if (b.holdT >= brain.holdFor) setHold(M, b.seat, false); return; }
  brain.wait -= dt; if (brain.wait > 0 || b.cool > 0) return;
  const here = edge(M, b.x, b.z), fx = Math.cos(b.ang), fz = Math.sin(b.ang);
  // near the edge and facing back in: a short dash home
  if (here.d > -c.edgeCare && -here.nx * fx - here.nz * fz > 0.85) { brain.holdFor = 0.12; setHold(M, b.seat, true); brain.wait = c.react; return; }
  let tgt = null, best = 1e9;
  // people are picked a little less often than other computer blobs (hidden help: three never gang up on one child)
  // and, in a new player's very first round, only when nobody else is left
  for (const o of M.blobs) if (o !== b && !o.out) { const d = Math.hypot(o.x - b.x, o.z - b.z) * (o.human ? (M.easy ? 50 : c.humanBias) : 1); if (d < best) { best = d; tgt = o; } }
  if (!tgt) return;
  best = Math.hypot(tgt.x - b.x, tgt.z - b.z);
  const want = Math.atan2(tgt.z - b.z, tgt.x - b.x) + brain.err;
  if (Math.abs(wrap(b.ang - want)) > c.aimTol) return;
  const charge = clamp(best / dashReach(M, 1), 0.2, 1), reach = dashReach(M, charge);
  const ex = b.x + fx * reach, ez = b.z + fz * reach;
  if (edge(M, ex, ez).d > -0.4 && best > reach * 0.8) { brain.wait = 0.1; return; } // would fly off on its own
  brain.holdFor = charge * M.cfg.blob.chargeTime; setHold(M, b.seat, true);
  brain.wait = c.react * (M.easy ? c.easySlow : 1) + M.random() * c.react;
  brain.err = (M.random() * 2 - 1) * (M.easy ? c.errEasy : c.err);
}

/** Advances the match by dt seconds; returns what happened (for sounds, words and effects). */
export function step(M, dt) {
  const c = M.cfg, bc = c.blob, ev = [];
  if (M.phase === 'ready') { M.timer -= dt; for (const b of M.blobs) if (!b.holding) spinAim(b, bc, dt); if (M.timer <= 0) { M.phase = 'play'; ev.push({ type: 'go' }); } return ev; }
  if (M.phase === 'over' || M.phase === 'done') {
    M.timer -= dt; moveFalling(M, dt);
    if (M.phase === 'over' && M.timer <= 0) { startRound(M); ev.push({ type: 'round', n: M.round, mod: M.mod }); }
    return ev;
  }
  M.t += dt;
  // the floor shrinks from shrinkAt on, so every round ends
  const sh = clamp((M.t - c.arena.shrinkAt) / c.arena.shrinkTime, 0, 1), was = M.s;
  M.s = M.s0 - (M.s0 - c.arena.minScale) * sh;
  if (was === M.s0 && M.s < M.s0) ev.push({ type: 'shrink' });
  if (M.mod === 'spin') M.spinA += c.arena.spin * dt;
  const fr = bc.friction * (M.mod === 'ice' ? c.arena.iceFriction : 1), k = Math.exp(-fr * dt);
  for (const b of M.blobs) {
    if (b.out) continue;
    if (!b.human) think(M, b, dt);
    b.cool = Math.max(0, b.cool - dt); b.dashT = Math.max(0, b.dashT - dt);
    b.giant = Math.max(0, b.giant - dt); b.star = Math.max(0, b.star - dt);
    const g = b.giant > 0 ? c.power.giant : null; b.r = bc.r * (g ? g.scale : 1); b.mass = g ? g.mass : 1;
    if (b.holding) b.holdT = Math.min(bc.chargeTime, b.holdT + dt); else spinAim(b, bc, dt);
    if (b.wantDash && b.cool <= 0) { b.wantDash = false; dash(M, b, ev); } // a tap during the cooldown dashes as soon as it ends
    b.vx *= k; b.vz *= k;
    if (M.mod === 'spin') { const w = c.arena.spin * c.arena.carry; b.x += -b.z * w * dt; b.z += b.x * w * dt; }
    b.x += b.vx * dt; b.z += b.vz * dt;
  }
  collide(M, ev);
  for (const b of M.blobs) {
    if (b.out) continue;
    const e = edge(M, b.x, b.z);
    b.teeter = e.d > -b.r * 0.8;
    // the jelly rim: a blob that slides there on its own bounces back; only a bump (or the fully shrunk floor) drops it
    // (in a new player's first round the rim keeps protecting the player to the end)
    const rim = (M.t < c.arena.shrinkAt + c.arena.shrinkTime || (M.easy && b.human)) && M.t - b.lastT > c.match.rimGrace;
    if (e.d > 0 && rim) {
      const nx = e.nx, nz = e.nz, vr = b.vx * nx + b.vz * nz;
      b.x -= nx * e.d; b.z -= nz * e.d;
      if (vr > 0) { b.vx -= nx * vr * 1.6; b.vz -= nz * vr * 1.6; if (vr > 1.5) ev.push({ type: 'rim', seat: b.seat, force: vr, x: b.x, z: b.z }); }
    } else if (e.d > 0) {
      b.out = true; b.holding = false; b.fall = 0; M.outOrder.push(b.seat);
      const by = b.lastBy >= 0 && M.t - b.lastT < c.match.koWindow ? b.lastBy : -1;
      if (by >= 0 && !M.demo) M.blobs[by].kos++;
      ev.push({ type: 'out', seat: b.seat, by, x: b.x, z: b.z });
    }
  }
  items(M, dt, ev);
  moveFalling(M, dt);
  const alive = M.blobs.filter((b) => !b.out);
  if (alive.length <= 1) {
    const w = alive[0] || null; M.winner = w ? w.seat : -1;
    if (w) w.crowns++;
    const done = w && w.crowns >= c.match.crowns;
    if (done) { M.phase = 'done'; M.matchWinner = w.seat; M.timer = c.match.endGap; } else { M.phase = 'over'; M.timer = c.match.roundGap; }
    ev.push({ type: 'roundEnd', winner: M.winner, done: !!done });
  }
  return ev;
}

function spinAim(b, bc, dt) { b.ang = wrap(b.ang + bc.spin * b.dir * dt); }

function moveFalling(M, dt) {
  for (const b of M.blobs) if (b.out && b.fall < 1) { b.fall = Math.min(1, b.fall + dt / M.cfg.blob.fallTime); b.x += b.vx * dt * 0.5; b.z += b.vz * dt * 0.5; }
}

/** Circle bumps: the blob moving into the other is the attacker, and its push is boosted (more with a star). */
function collide(M, ev) {
  const bc = M.cfg.blob, bs = M.blobs;
  for (let i = 0; i < bs.length; i++) for (let j = i + 1; j < bs.length; j++) {
    const a = bs[i], b = bs[j]; if (a.out || b.out) continue;
    let nx = b.x - a.x, nz = b.z - a.z; const d = Math.hypot(nx, nz) || 1e-6, min = a.r + b.r;
    if (d >= min) continue;
    nx /= d; nz /= d;
    const over = min - d, wa = b.mass / (a.mass + b.mass), wb = a.mass / (a.mass + b.mass);
    a.x -= nx * over * wa; a.z -= nz * over * wa; b.x += nx * over * wb; b.z += nz * over * wb;
    const va = a.vx * nx + a.vz * nz, vb = b.vx * nx + b.vz * nz, rel = va - vb;
    if (rel <= 0) continue;
    const J = (1 + bc.restitution) * rel / (1 / a.mass + 1 / b.mass);
    const atkA = va > -vb; // a moves into b faster than b moves into a
    const att = atkA ? a : b, vic = atkA ? b : a;
    const boost = bc.bumpBoost * (att.star > 0 ? M.cfg.power.star.boost : 1);
    const ka = atkA ? 1 : boost, kb = atkA ? boost : 1;
    a.vx -= nx * J / a.mass * ka; a.vz -= nz * J / a.mass * ka;
    b.vx += nx * J / b.mass * kb; b.vz += nz * J / b.mass * kb;
    vic.lastBy = att.seat; vic.lastT = M.t; att.hits++;
    ev.push({ type: 'bump', a: att.seat, b: vic.seat, force: J, x: (a.x + b.x) / 2, z: (a.z + b.z) / 2 });
  }
}

/** One power-up at a time: a candy (giant) or a star (super push), dropped near the middle every few seconds. */
function items(M, dt, ev) {
  const p = M.cfg.power;
  M.itemClock += dt;
  if (!M.items.length && M.itemClock >= p.every) {
    M.itemClock = 0;
    const a = M.cfg.arena, x = (M.random() * 2 - 1) * a.w * M.s * 0.45, z = (M.random() * 2 - 1) * a.h * M.s * 0.45;
    M.items.push({ kind: M.random() < 0.5 ? 'giant' : 'star', x, z, t: 0 });
    ev.push({ type: 'item', kind: M.items[0].kind });
  }
  for (const it of M.items) {
    it.t += dt;
    if (edge(M, it.x, it.z).d > -0.3) it.t = p.life; // the floor shrank under it
    for (const b of M.blobs) if (!b.out && Math.hypot(b.x - it.x, b.z - it.z) < b.r + 0.35) {
      b[it.kind] = p[it.kind].t; it.t = 1e9; ev.push({ type: 'power', seat: b.seat, kind: it.kind, x: it.x, z: it.z }); break;
    }
  }
  M.items = M.items.filter((it) => it.t < p.life);
}

/** Final places of a match: by crowns, then knock-outs; equal ones share. Returns [{seat, place}]. */
export function standings(M) {
  const order = M.blobs.slice().sort((a, b) => b.crowns - a.crowns || b.kos - a.kos);
  let place = 0;
  return order.map((b, i) => { if (i === 0 || b.crowns !== order[i - 1].crowns || b.kos !== order[i - 1].kos) place = i + 1; return { seat: b.seat, place }; });
}

/** Coins one human seat earns in a finished match: some for playing at all, per knock-out, per crown, a win bonus. */
export function coinsFor(cfg, b, won) {
  return cfg.coins.play + b.kos * cfg.coins.ko + b.crowns * cfg.coins.round + (won ? cfg.coins.match : 0);
}

/** The next hat to unlock and how far the coins are towards it ({hat, have, need}), or null when all are owned. */
export function nextHat(cfg, owned, coinsTotal) {
  const h = cfg.hats.find((x) => !owned.includes(x.id) && x.cost > 0);
  return h ? { hat: h, have: Math.min(coinsTotal, h.cost), need: h.cost } : null;
}
