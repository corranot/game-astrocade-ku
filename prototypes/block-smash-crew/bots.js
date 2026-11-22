// PROTOTYPE - NOT FOR PRODUCTION
// BONK-BOTs: little toy robots that stroll around the building. Anything that hits them (the hammer, a blast, a
// falling piece) knocks them flying as a floppy ragdoll (Verlet points joined by sticks); after a few seconds on the
// ground they put themselves back together and walk on. They never break for good: kid-safe toys, confetti, no harm.
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

/** The bots of a new level: a few, more on later levels, on free ground around the building (not on the hero). */
export function makeBots(W, cfg, n) {
  const B = cfg.bots, r = rng(n * 977 + 5), b = W.box;
  W.botLot = { x0: b.x0 - 7, x1: b.x1 + 8, z0: b.z0 - 7, z1: b.z1 + 9 };
  const count = Math.min(B.max, B.count + Math.floor(n * B.perLevel));
  const bots = [];
  // the first one strolls in the front yard, in view from the start (the first boom sends it flying)
  const fx = W.hero.x + 2.6, fz = W.hero.z - 3.2;
  if (count > 0 && free(W, fx, fz)) bots.push({ x: fx, z: fz, yaw: -Math.PI / 2, h: B.height, state: 'walk', t: 0, step: 0, goal: [fx - 4, fz], pts: null, prev: null, rest: [], hue: 0, r: rng(n * 31 + 1) });
  for (let tries = 0; bots.length < count && tries < 400; tries++) {
    const x = W.botLot.x0 + 1 + r() * (W.botLot.x1 - W.botLot.x0 - 2), z = W.botLot.z0 + 1 + r() * (W.botLot.z1 - W.botLot.z0 - 2);
    if (!free(W, x, z) || Math.hypot(x - W.hero.x, z - W.hero.z) < 3 || bots.some((o) => Math.hypot(o.x - x, o.z - z) < 1.6)) continue;
    const bot = { x, z, yaw: r() * Math.PI * 2, h: B.height, state: 'walk', t: 0, step: r() * 6, goal: null, pts: null, prev: null, rest: [], hue: bots.length, r: rng(n * 31 + bots.length * 7 + 1) };
    bots.push(bot);
  }
  return bots;
}

/** Points of a standing bot (also used to start a ragdoll from where it stands). */
export function standingPoints(b) { return POSE.map((_, k) => posePoint(b, k, b.x, b.z, b.yaw)); }

/**
 * Knocks the bots near (x, y, z) within radius R: each flies away from the point, the power fading with distance.
 * Returns the number of bots knocked over from walking (the ones that pay).
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
  const was = b.state !== 'down';
  if (!b.pts || b.state === 'reboot') { b.pts = standingPoints(b); b.prev = b.pts.map((p) => p.slice()); }
  const len = Math.hypot(dx, dz) || 1, ux = dx / len, uz = dz / len;
  // each part gets its own little kick (m/s), applied on the next step with that step's dt: the bot tumbles and spins
  b.kick = b.pts.map((p) => { const wob = 0.75 + 0.5 * b.r(), up = 0.55 + 0.35 * (p[1] / b.h); return [ux * power * wob, power * up * wob, uz * power * wob]; });
  b.state = 'down'; b.t = 0; b.still = 0;
  const c = b.pts[1];
  if (was) {
    const mult = (W.fever > 0 ? W.cfg.fever.mult : 1) * W.coinMult, coins = W.demo ? 0 : Math.round(W.cfg.bots.coins * mult);
    W.coins += coins; W.bonks = (W.bonks || 0) + 1;
    W.ev.push({ type: 'bonk', i, x: c[0], y: c[1], z: c[2], coins, by });
  } else W.ev.push({ type: 'bonk', i, x: c[0], y: c[1], z: c[2], coins: 0, by, again: true });
  return was;
}

/** One step of every bot: walking around, flying as a ragdoll, or putting itself back together. */
export function stepBots(W, dt) {
  const B = W.cfg.bots;
  for (let i = 0; i < W.bots.length; i++) {
    const b = W.bots[i];
    if (b.state === 'walk') walk(W, b, dt, B);
    else if (b.state === 'down') ragdoll(W, b, dt, B, i);
    else if (b.state === 'reboot') {
      b.t += dt; const k = Math.min(1, b.t / B.rebootTime), e = k * k * (3 - 2 * k);
      for (let p = 0; p < b.pts.length; p++) { const s = posePoint(b, p, b.x, b.z, b.yaw); for (let a = 0; a < 3; a++) b.pts[p][a] = b.rest[p][a] + (s[a] - b.rest[p][a]) * e; }
      if (k >= 1) { b.state = 'walk'; b.pts = null; b.prev = null; b.goal = null; }
    }
  }
}

function walk(W, b, dt, B) {
  b.step += dt * B.speed * 3;
  if (!b.goal || Math.hypot(b.goal[0] - b.x, b.goal[1] - b.z) < 0.4) {
    // a new stroll: somewhere free on the lot, not too far
    for (let tries = 0; tries < 12; tries++) {
      const gx = b.x + (b.r() - 0.5) * 10, gz = b.z + (b.r() - 0.5) * 10;
      if (free(W, gx, gz)) { b.goal = [gx, gz]; break; }
    }
    if (!b.goal) return;
  }
  const dx = b.goal[0] - b.x, dz = b.goal[1] - b.z, d = Math.hypot(dx, dz) || 1;
  // turn smoothly towards the goal, then walk where it faces
  const want = Math.atan2(dx, dz); let turn = want - b.yaw; turn = Math.atan2(Math.sin(turn), Math.cos(turn));
  b.yaw += Math.max(-4 * dt, Math.min(4 * dt, turn));
  const sp = B.speed * dt * (Math.abs(turn) < 1 ? 1 : 0.2), nx = b.x + Math.sin(b.yaw) * sp, nz = b.z + Math.cos(b.yaw) * sp;
  if (free(W, nx, nz)) { b.x = nx; b.z = nz; } else b.goal = null;
  // the ground under it was smashed away or a block landed on it: it stands where it can
  if (!free(W, b.x, b.z)) b.goal = null;
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
  b.t += dt; const g = W.g, P = b.pts, Q = b.prev, R = 0.12, lot = W.botLot;
  let speed = 0;
  if (b.kick) { for (let k = 0; k < P.length; k++) for (let a = 0; a < 3; a++) Q[k][a] = P[k][a] - b.kick[k][a] * dt; b.kick = null; }
  for (let k = 0; k < P.length; k++) {
    const p = P[k], q = Q[k];
    const vx = (p[0] - q[0]) * 0.995, vy = (p[1] - q[1]) * 0.995, vz = (p[2] - q[2]) * 0.995;
    q[0] = p[0]; q[1] = p[1]; q[2] = p[2];
    p[0] += vx; p[1] += vy - B.gravity * dt * dt; p[2] += vz;
    speed = Math.max(speed, Math.hypot(vx, vy, vz) / dt);
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
  if (b.t > B.rebootAfter && b.still > 0.4) {
    // back on its feet where its body came to rest (or the nearest free spot on the lot)
    let x = P[2][0], z = P[2][2];
    if (!free(W, x, z)) { let best = null; for (let a = 0; a < 16 && !best; a++) { const rr = 0.8 + a * 0.3, an = a * 2.4; const tx = x + Math.cos(an) * rr, tz = z + Math.sin(an) * rr; if (free(W, tx, tz)) best = [tx, tz]; } if (best) [x, z] = best; else { x = W.hero.x + 2; z = W.hero.z; } }
    b.x = x; b.z = z; b.yaw = Math.atan2(P[0][0] - P[2][0], P[0][2] - P[2][2]) || b.yaw;
    b.rest = P.map((p) => p.slice()); b.state = 'reboot'; b.t = 0;
    W.ev.push({ type: 'reboot', i, x, y: 0.8, z });
  }
}
