// PROTOTYPE - NOT FOR PRODUCTION
// BONK-BOTs: little toy robots that come in waves of 15, marching at the hero into a golden-angle ring, some holding
// cardboard dare signs ("CAN'T TOPPLE OUR TOWER!"), many in the wave's costume. Anything that hits them (the hammer, a
// blast, a falling piece, another flying robot) knocks them flying as a floppy ragdoll (Verlet points joined by
// sticks); after a few seconds on the ground they put themselves back together, beep happily and walk off through a
// gate. They never break for good: kid-safe toys, confetti, no harm.
// Pure (no Three.js): world.js steps them and scene.js draws them from the points.
import { rng } from './levels.js';

/** The standing pose, in the bot's own frame (x right, y up, z forward), for unit height. */
const POSE = [
  [0, 0.9, 0], // 0 head
  [0, 0.66, 0], // 1 chest
  [0, 0.4, 0], // 2 pelvis
  [-0.3, 0.5, 0], // 3 left hand
  [0.3, 0.5, 0], // 4 right hand
  [-0.12, 0, 0], // 5 left foot
  [0.12, 0, 0], // 6 right foot
];
/** Sticks between points: the body, the arms and legs, and a few braces so it flops but does not fold flat. */
const STICKS = [[0, 1], [1, 2], [1, 3], [1, 4], [2, 5], [2, 6], [0, 2], [5, 6], [3, 2], [4, 2], [0, 3], [0, 4]];
export const BOT_POINTS = POSE.length;

const solid = (g, x, y, z) => y >= 0 && !!g.get(Math.floor(x), Math.floor(y), Math.floor(z));

/** World position of pose point k for a bot standing at (x, z) facing yaw. */
function posePoint(b, k, x, z, yaw) {
  const [px, py, pz] = POSE[k], s = b.h, c = Math.cos(yaw), n = Math.sin(yaw);
  return [x + (px * c + pz * n) * s, py * s, z + (-px * n + pz * c) * s];
}

/** Can a bot stand at (x, z)? No block at its feet or body, inside the lot. */
function free(W, x, z) {
  const lim = W.botLot;
  if (x < lim.x0 || x > lim.x1 || z < lim.z0 || z > lim.z1) return false;
  for (const [ox, oz] of [[0, 0], [0.3, 0], [-0.3, 0], [0, 0.3], [0, -0.3]]) for (let y = 0; y < 2; y++) if (solid(W.g, x + ox, y + 0.2, z + oz)) return false;
  return true;
}
const GOLDEN = Math.PI * (3 - Math.sqrt(5));
/** Is the bot on its feet (it pays when knocked over)? */
export const standing = (b) => b.state === 'walk' || b.state === 'march' || b.state === 'leave';
/** Ring slot idx around the hero, golden-angle spaced: radius ringR0 + √idx · ringStep. */
export const ringRad = (B, idx) => B.ringR0 + Math.sqrt(idx) * B.ringStep;

function newBot(W, x, z, yaw, extra) {
  const B = W.cfg.bots, id = W.botId = (W.botId || 0) + 1;
  return { id, x, z, yaw, h: B.height, state: 'march', t: 0, step: 0, goal: null, pts: null, prev: null, rest: [], hue: id, r: rng(W.n * 31 + id * 7 + 1), sign: -1, costume: -1, mouth: id % 5, wave: 0, slot: 0, knocked: false, near: false, life: 0, ...extra };
}

/** The bots of a new level: one strolling in the front yard (the first boom sends it flying) and the first wave. */
export function makeBots(W, cfg, n) {
  const b = W.box;
  W.botLot = { x0: b.x0 - 7, x1: b.x1 + 8, z0: b.z0 - 7, z1: b.z1 + 9 };
  const L = W.botLot, mx = (L.x0 + L.x1) / 2, mz = (L.z0 + L.z1) / 2;
  // four gates on the lot's edges where robots leave (and nothing blocks them)
  W.gates = [[L.x0 + 0.6, mz], [L.x1 - 0.6, mz], [mx, L.z0 + 0.6], [mx, L.z1 - 0.6]];
  W.bots = []; W.waves = []; W.wave = { n: 0, t: 0 }; W.botId = 0;
  const fx = W.hero.x + 2.6, fz = W.hero.z - 3.2;
  if (free(W, fx, fz)) W.bots.push(newBot(W, fx, fz, -Math.PI / 2, { state: 'walk', front: true, goal: [fx - 4, fz], r: rng(n * 31 + 1) }));
  nextWave(W);
  return W.bots;
}

/**
 * A new wave: the robots still marching from the wave before last leave through the gates, and cfg.waves.count new ones
 * appear 4.5–12 m ahead of the hero in a 270° arc, already walking at him; some carry a cardboard dare sign, many wear
 * this wave's costume set.
 */
export function nextWave(W) {
  const B = W.cfg.bots, V = W.cfg.waves, h = W.hero, n = ++W.wave.n;
  W.wave.t = 0;
  // the robots of the wave before last still marching leave; the last wave's stay one more wave (it can still be
  // cleared: the early call for the next wave must not send away the very robots needed for it)
  for (const b of W.bots) if (standing(b) && b.state !== 'leave' && !b.front && b.wave < n - 1) leave(W, b);
  // too many on the lot: the leavers furthest along go first
  const r = rng(W.n * 131 + n * 17), costume = (n - 1) % 6;
  // too many on the lot for the new wave: the leavers go first, then the robots lying down longest (a puff, gone)
  let extra = W.bots.length - (B.maxBots - V.count);
  for (const st of ['leave', 'reboot', 'down']) for (const b of W.bots.filter((x) => x.state === st).sort((p, q) => q.t + q.life - p.t - p.life)) if (extra > 0 && !b.front) { b.gone = true; extra--; const c = b.pts ? b.pts[1] : [b.x, 0.8, b.z]; W.ev.push({ type: 'leave', x: c[0], y: c[1], z: c[2] }); }
  W.bots = W.bots.filter((b) => !b.gone);
  // the hero looks along (sin yaw, cos yaw): the arc is centred on that
  const arc = B.spawnArc * Math.PI / 180, made = [];
  for (let i = 0; i < V.count; i++) {
    let x = 0, z = 0, ok = false;
    for (let tries = 0; tries < 30 && !ok; tries++) {
      // where the view looks (the building's side) ± 135°, spread evenly with a little jitter
      const a = h.yaw - arc / 2 + arc * ((i + 0.5 + (r() - 0.5) * 0.8) / V.count) + (tries ? (r() - 0.5) * Math.min(2.4, 0.3 + tries * 0.08) : 0);
      const d = B.spawnMin + r() * (B.spawnMax - B.spawnMin);
      x = h.x + Math.sin(a) * d; z = h.z + Math.cos(a) * d;
      ok = free(W, x, z) && !made.some((o) => Math.hypot(o.x - x, o.z - z) < 1.1);
    }
    // no free ground out there (a big building): this one stays away
    if (!ok) continue;
    const bot = newBot(W, x, z, Math.atan2(h.x - x, h.z - z), { wave: n, slot: i, sign: r() < B.signRatio ? Math.floor(r() * 1e6) : -1, costume: r() < V.costumeShare ? costume : -1 });
    made.push(bot); W.bots.push(bot);
  }
  W.waves.push({ n, size: made.length, knocked: 0, done: false });
  if (W.waves.length > 4) W.waves.shift();
  W.ev.push({ type: 'wave', n, count: made.length });
}

function leave(W, b) {
  let best = W.gates[0], bd = Infinity;
  for (const g of W.gates) { const d = Math.hypot(g[0] - b.x, g[1] - b.z); if (d < bd) { bd = d; best = g; } }
  b.state = 'leave'; b.goal = best.slice(); b.life = 0;
}

/** Points of a standing bot (also used to start a ragdoll from where it stands). */
export function standingPoints(b) { return POSE.map((_, k) => posePoint(b, k, b.x, b.z, b.yaw)); }

/**
 * Knocks the bots near (x, y, z) within radius R: each flies away from the point, the power fading with distance.
 * Returns the number of bots knocked over from standing (the ones that pay).
 */
export function knockBots(W, x, y, z, R, power, by) {
  let fresh = 0;
  for (let i = 0; i < W.bots.length; i++) {
    const b = W.bots[i], c = b.pts ? b.pts[1] : posePoint(b, 1, b.x, b.z, b.yaw);
    const d = Math.hypot(c[0] - x, c[1] - y, c[2] - z);
    if (d > R) continue;
    if (knock(W, i, (c[0] - x) / (d || 1), (c[2] - z) / (d || 1), power * (1 - 0.6 * d / R), by)) fresh++;
  }
  return fresh;
}

/** Knocks bot i in direction (dx, dz) with the given power; true when it was standing (it pays coins). */
export function knock(W, i, dx, dz, power, by) {
  const b = W.bots[i]; if (!b) return false;
  const was = standing(b);
  // from its feet: the points start on top of the ground (the ragdoll's own floor), never in it
  if (!b.pts) b.pts = standingPoints(b).map((p) => [p[0], Math.max(0.12, p[1]), p[2]]);
  b.prev = b.pts.map((p) => p.slice()); b.dt = 0;
  const len = Math.hypot(dx, dz) || 1, ux = dx / len, uz = dz / len;
  // each part gets its own little kick (m/s), applied on the next step with that step's dt: the bot tumbles and spins
  b.kick = b.pts.map((p) => { const wob = 0.75 + 0.5 * b.r(), up = 0.55 + 0.35 * (p[1] / b.h); return [ux * power * wob, power * up * wob, uz * power * wob]; });
  b.state = 'down'; b.t = 0; b.still = 0; b.chained = false;
  const c = b.pts[1];
  if (was) {
    // coins for the first knock only: a robot that got up and is walking off flies again, for nothing
    const first = !b.knocked, mult = (W.fever > 0 ? W.cfg.fever.mult : 1) * W.coinMult, coins = W.demo || !first ? 0 : Math.round(W.cfg.bots.coins * mult);
    W.coins += coins; W.bonks = (W.bonks || 0) + 1;
    W.ev.push({ type: 'bonk', i, x: c[0], y: c[1], z: c[2], coins, by });
    if (first) { b.knocked = true; const wv = W.waves.find((v) => v.n === b.wave); if (wv && ++wv.knocked >= wv.size && !wv.done) waveCleared(W, wv); }
  } else W.ev.push({ type: 'bonk', i, x: c[0], y: c[1], z: c[2], coins: 0, by, again: true });
  return was;
}
/** Every robot of a wave knocked over at least once: coins (more each wave) and a celebration. */
function waveCleared(W, wv) {
  wv.done = true;
  const V = W.cfg.waves, coins = W.demo ? 0 : Math.round((V.coins + V.coinsStep * (wv.n - 1)) * W.coinMult);
  W.coins += coins;
  W.ev.push({ type: 'waveClear', n: wv.n, coins });
}

/** One step of every bot: strolling, marching at the hero, leaving, flying as a ragdoll, or getting back up; and the waves. */
export function stepBots(W, dt) {
  const B = W.cfg.bots, V = W.cfg.waves;
  // the next wave comes after `every` s, or sooner (never before minGap) once only a few of this one still march
  W.wave.t += dt;
  // where the crowd gathers follows where the hero looks, slowly (it shuffles, it does not jump)
  if (W.crowdYaw == null) W.crowdYaw = W.hero.yaw;
  { const d = Math.atan2(Math.sin(W.hero.yaw - W.crowdYaw), Math.cos(W.hero.yaw - W.crowdYaw)); W.crowdYaw += d * Math.min(1, dt * B.crowdTurn); }
  const cur = W.bots.filter((b) => b.wave === W.wave.n && !b.knocked && standing(b)).length, size = (W.waves.find((v) => v.n === W.wave.n) || { size: V.count }).size;
  if (W.wave.t >= V.every || (W.wave.t >= V.minGap && cur <= size * V.leftRatio)) nextWave(W);
  for (let i = 0; i < W.bots.length; i++) {
    const b = W.bots[i];
    if (b.state === 'walk') { walk(W, b, dt, B); if (b.front && W.t > B.frontUntil) b.front = false; }
    else if (b.state === 'march') march(W, b, dt, B);
    else if (b.state === 'leave') goOut(W, b, dt, B);
    else if (b.state === 'down') ragdoll(W, b, dt, B, i);
    else if (b.state === 'reboot') {
      b.t += dt; const k = Math.min(1, b.t / B.rebootTime), e = k * k * (3 - 2 * k);
      for (let p = 0; p < b.pts.length; p++) { const s = posePoint(b, p, b.x, b.z, b.yaw); for (let a = 0; a < 3; a++) b.pts[p][a] = b.rest[p][a] + (s[a] - b.rest[p][a]) * e; }
      // back on its feet: happy, it walks off through the nearest gate (the next wave brings new ones)
      if (k >= 1) { b.pts = null; b.prev = null; leave(W, b); b.happy = 2; }
    }
    if (b.happy > 0) b.happy -= dt;
  }
  // at most maxDown lying around: the one down longest gets up first
  const downs = W.bots.filter((x) => x.state === 'down');
  if (downs.length > B.maxDown) for (const b of downs.sort((p, q) => q.t - p.t).slice(0, downs.length - B.maxDown)) getUp(W, b, W.bots.indexOf(b));
  if (W.bots.some((b) => b.gone)) W.bots = W.bots.filter((b) => !b.gone);
}

/** The nearest free spot on the lot around (x, z) (a spiral out to 9 m), else the free spot next to the hero. */
function nearestFree(W, x, z) {
  for (let a = 0; a < 60; a++) { const rr = 0.6 + a * 0.15, an = a * 2.4; const tx = x + Math.cos(an) * rr, tz = z + Math.sin(an) * rr; if (free(W, tx, tz)) return [tx, tz]; }
  for (const [ox, oz] of [[2, 0], [-2, 0], [0, 2], [0, -2]]) if (free(W, W.hero.x + ox, W.hero.z + oz)) return [W.hero.x + ox, W.hero.z + oz];
  return [W.hero.x, W.hero.z];
}

/**
 * Steps a bot towards (gx, gz) at speed sp; slides around a block in the way; never closer than keep m to the hero.
 * Turning to walk there unless shuffle (it keeps facing where it faces: a crowd shuffling into place). False when stuck.
 */
function stepTo(W, b, gx, gz, sp, dt, shuffle = false, keep = 0) {
  const want = Math.atan2(gx - b.x, gz - b.z); let turn = want - b.yaw; turn = Math.atan2(Math.sin(turn), Math.cos(turn));
  if (!shuffle) b.yaw += Math.max(-5 * dt, Math.min(5 * dt, turn));
  const d = sp * dt * (shuffle || Math.abs(turn) < 1.2 ? 1 : 0.3), base = shuffle ? want : b.yaw, h = W.hero, d0 = Math.hypot(b.x - h.x, b.z - h.z);
  for (const off of [0, 0.7, -0.7, 1.5, -1.5]) {
    const a = base + off, nx = b.x + Math.sin(a) * d, nz = b.z + Math.cos(a) * d, dh = Math.hypot(nx - h.x, nz - h.z);
    if (free(W, nx, nz) && (dh >= keep || dh > d0)) { b.x = nx; b.z = nz; return true; }
  }
  return false;
}

/** Marching at the hero, into its golden-angle ring slot; close by it faces him, stomps and lifts its sign. */
function march(W, b, dt, B) {
  if (!free(W, b.x, b.z)) [b.x, b.z] = nearestFree(W, b.x, b.z);
  // the slot: golden-angle spaced (ring index from slotFrom on, so no robot stands in the hero's face) and gathered in
  // the arc the hero looks into (first person, portrait: a full ring would stand mostly out of view)
  const h = W.hero, idx = b.slot + B.slotFrom, f = (idx * GOLDEN / (Math.PI * 2) + b.wave * 0.37) % 1, a = W.crowdYaw + (f - 0.5) * B.frontArc * Math.PI / 180, rr = ringRad(B, idx);
  const sx = h.x + Math.sin(a) * rr, sz = h.z + Math.cos(a) * rr;
  const dSlot = Math.hypot(sx - b.x, sz - b.z), dHero = Math.hypot(h.x - b.x, h.z - b.z);
  b.near = dHero < B.near;
  // slow when close to its slot, catching up (at most catchUp ×) when far behind
  const sp = B.march * Math.max(0.35, Math.min(B.catchUp, dSlot / 1.5));
  // near: it faces the hero (the sign reads) and shuffles into its slot, stomping; never in the hero's face
  if (dSlot > 0.3) { if (!stepTo(W, b, sx, sz, sp, dt, b.near, B.ringR0 - 0.25)) b.stuck = (b.stuck || 0) + dt; else b.stuck = 0; b.step += dt * (2 + sp * 3); }
  else b.step += dt * 7;
  if (b.near) { let t = Math.atan2(h.x - b.x, h.z - b.z) - b.yaw; t = Math.atan2(Math.sin(t), Math.cos(t)); b.yaw += Math.max(-5 * dt, Math.min(5 * dt, t)); }
}

/** Leaving through a gate; gone when there (or after leaveMax seconds, stuck behind the building). */
function goOut(W, b, dt, B) {
  b.life += dt; b.near = false; b.step += dt * 7;
  if (!free(W, b.x, b.z)) [b.x, b.z] = nearestFree(W, b.x, b.z);
  const d = Math.hypot(b.goal[0] - b.x, b.goal[1] - b.z);
  if (d < 0.9 || b.life > B.leaveMax) { b.gone = true; W.ev.push({ type: 'leave', x: b.x, y: 0.8, z: b.z }); return; }
  stepTo(W, b, b.goal[0], b.goal[1], B.leaveSpeed, dt);
}

function walk(W, b, dt, B) {
  // buried by a landed piece (or stood where the ground changed): it steps out to the nearest free spot
  if (!free(W, b.x, b.z)) { [b.x, b.z] = nearestFree(W, b.x, b.z); b.goal = null; }
  b.step += dt * B.speed * 3;
  if (!b.goal || Math.hypot(b.goal[0] - b.x, b.goal[1] - b.z) < 0.4) {
    // a new stroll: somewhere free on the lot, not too far
    for (let tries = 0; tries < 12; tries++) {
      const gx = b.x + (b.r() - 0.5) * 10, gz = b.z + (b.r() - 0.5) * 10;
      if (free(W, gx, gz)) { b.goal = [gx, gz]; break; }
    }
    if (!b.goal) return;
  }
  const dx = b.goal[0] - b.x, dz = b.goal[1] - b.z;
  // turn smoothly towards the goal, then walk where it faces
  const want = Math.atan2(dx, dz); let turn = want - b.yaw; turn = Math.atan2(Math.sin(turn), Math.cos(turn));
  b.yaw += Math.max(-4 * dt, Math.min(4 * dt, turn));
  const sp = B.speed * dt * (Math.abs(turn) < 1 ? 1 : 0.2), nx = b.x + Math.sin(b.yaw) * sp, nz = b.z + Math.cos(b.yaw) * sp;
  if (free(W, nx, nz)) { b.x = nx; b.z = nz; } else b.goal = null;
}

/** Moves point p (inside a block) out through the closest face whose neighbour cell is free, plus margin R. */
function pushOut(g, p, q, R) {
  const cx = Math.floor(p[0]), cy = Math.floor(p[1]), cz = Math.floor(p[2]);
  const opts = [[1, 0, cy + 1 - p[1]], [0, 1, p[0] - cx], [0, -1, cx + 1 - p[0]], [2, 1, p[2] - cz], [2, -1, cz + 1 - p[2]]];
  let best = null;
  for (const [ax, dir, depth] of opts) {
    const n = [cx, cy, cz];
    if (ax === 1) n[1] += 1; else n[ax] -= dir;
    if (g.get(n[0], n[1], n[2]) && !(n[1] < 0)) continue;
    if (!best || depth < best[2]) best = [ax, dir, depth];
  }
  if (!best) { p[1] = cy + 1 + R; q[1] = p[1]; return; }
  const [ax, dir, depth] = best;
  if (ax === 1) { p[1] += depth + R; q[1] = p[1]; } else { p[ax] -= dir * (depth + R); q[ax] = p[ax]; }
}

function ragdoll(W, b, dt, B, i) {
  // hit-stop (the game sets W.frozen): the ragdoll holds still like everything on screen, and its kick waits for
  // real time. A flag, not a small dt: a 240 Hz screen or slow motion on 120 Hz also makes small steps
  if (W.frozen || dt <= 0) return;
  b.t += dt; const g = W.g, P = b.pts, Q = b.prev, R = 0.12, lot = W.botLot;
  let speed = 0;
  // time-corrected Verlet: the last move is rescaled to this step's length (slow motion, one or two sub-steps)
  if (b.kick) { for (let k = 0; k < P.length; k++) for (let a = 0; a < 3; a++) Q[k][a] = P[k][a] - b.kick[k][a] * dt; b.kick = null; b.dt = dt; }
  const kt = b.dt ? Math.max(0.25, Math.min(4, dt / b.dt)) : 1; b.dt = dt;
  for (let k = 0; k < P.length; k++) {
    const p = P[k], q = Q[k];
    const vx = (p[0] - q[0]) * 0.995 * kt, vy = (p[1] - q[1]) * 0.995 * kt, vz = (p[2] - q[2]) * 0.995 * kt;
    q[0] = p[0]; q[1] = p[1]; q[2] = p[2];
    p[0] += vx; p[1] += vy - B.gravity * dt * dt; p[2] += vz;
    speed = Math.max(speed, Math.hypot(vx, vy, vz) / dt);
  }
  // a robot flying fast knocks over a standing one it touches, passing on part of its speed (a chain of bonks)
  const cv = [(P[1][0] - Q[1][0]) / dt, (P[1][1] - Q[1][1]) / dt, (P[1][2] - Q[1][2]) / dt], cs = Math.hypot(cv[0], cv[1], cv[2]);
  if (cs > B.chainSpeed) for (let j = 0; j < W.bots.length; j++) {
    const o = W.bots[j]; if (j === i || !standing(o)) continue;
    // any part of the flier touching its chest or hips
    const oc = posePoint(o, 1, o.x, o.z, o.yaw), op = posePoint(o, 2, o.x, o.z, o.yaw);
    if (P.some((p) => Math.min(Math.hypot(oc[0] - p[0], oc[1] - p[1], oc[2] - p[2]), Math.hypot(op[0] - p[0], op[1] - p[1], op[2] - p[2])) < B.chainR)) knock(W, j, cv[0], cv[2], cs * B.chainKeep, 'chain');
  }
  for (let it = 0; it < 4; it++) {
    for (const [a, c] of STICKS) {
      const pa = P[a], pc = P[c], ra = POSE[a], rc = POSE[c];
      const rest = Math.hypot(ra[0] - rc[0], ra[1] - rc[1], ra[2] - rc[2]) * b.h;
      const dx = pc[0] - pa[0], dy = pc[1] - pa[1], dz = pc[2] - pa[2], d = Math.hypot(dx, dy, dz) || 1e-6, f = (d - rest) / d * 0.5;
      pa[0] += dx * f; pa[1] += dy * f; pa[2] += dz * f; pc[0] -= dx * f; pc[1] -= dy * f; pc[2] -= dz * f;
    }
    for (let k = 0; k < P.length; k++) {
      const p = P[k], q = Q[k];
      // the ground: rests on it with friction
      if (p[1] < R) { p[1] = R; q[0] = p[0] - (p[0] - q[0]) * 0.7; q[2] = p[2] - (p[2] - q[2]) * 0.7; if (q[1] < p[1]) q[1] = p[1] + (q[1] - p[1]) * 0.3; }
      // a block: out through its nearest open face (up, or a side with no block behind it), that way's speed gone
      if (solid(g, p[0], p[1], p[2])) pushOut(g, p, q, R);
      // never off the lot, never through the sky
      p[0] = Math.max(lot.x0 - 3, Math.min(lot.x1 + 3, p[0])); p[2] = Math.max(lot.z0 - 3, Math.min(lot.z1 + 3, p[2])); p[1] = Math.min(60, p[1]);
    }
  }
  b.still = speed < 0.6 ? b.still + dt : 0;
  if ((b.t > B.rebootAfter && b.still > 0.4) || b.t > B.rebootAfter * 3) getUp(W, b, i);
}
/** Back on its feet where its body came to rest (or the nearest free spot on the lot): the reboot starts. */
function getUp(W, b, i) {
  const P = b.pts; let x = P[2][0], z = P[2][2];
  if (!free(W, x, z)) [x, z] = nearestFree(W, x, z);
  b.x = x; b.z = z; b.yaw = Math.atan2(P[0][0] - P[2][0], P[0][2] - P[2][2]) || b.yaw;
  b.rest = P.map((p) => p.slice()); b.state = 'reboot'; b.t = 0;
  W.ev.push({ type: 'reboot', i, x, y: 0.8, z });
}
