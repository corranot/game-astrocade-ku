// PROTOTYPE - NOT FOR PRODUCTION
// The playing world of one Block Smash Crew level, without any drawing: the hero who runs to where the player taps
// and smashes everything in the way, the six tools and their flights, pieces that lose their support and fall, the
// treasure chest in its steel vault and the smash-time finale. step() returns events for the look and the sound.
// Pure (no Three.js), so whole levels can be played by a bot in Node.
import { raycast, smashSphere, collapse } from './voxels.js';
import { buildLevel, matIds } from './levels.js';
import { coinsFor, createCombo, comboHit, comboTick, smashWord, cooldownOf, wreckOf } from './logic.js';

const SWING_HIT = 0.4; // share of the swing at which the hammer lands

/**
 * A new world for level n. opts: {demo: the attract mode (nothing pays), owned: tool ids the player has}.
 */
export function createWorld(cfg, n, opts = {}) {
  const L = buildLevel(cfg, n), g = L.grid, mats = [null, ...cfg.materials];
  const ids = matIds(cfg);
  const H = cfg.hero;
  const W = {
    cfg, n, g, mats, kind: L.kind, total: L.total, left: L.total, need: L.stars.length + 1, got: 0, starCells: L.stars, box: L.box, top: L.top,
    chest: { x: L.chest.x, z: L.chest.z, open: false, t: 0 },
    hero: { x: L.spawn.x, y: 0, z: L.spawn.z, vy: 0, yaw: Math.PI, moving: false, swingT: -1, swingCell: null, cool: 0, goal: null, aim: null, hold: false, happy: 0, stepT: 0, bump: 0 },
    shots: [], falls: [], cool: {}, owned: (opts.owned || ['hammer', 'bomb']).slice(), tried: new Set(),
    combo: createCombo(cfg), coins: 0, smashed: 0, demo: !!opts.demo, phase: 'play', fever: 0, t: 0, ev: [], nextId: 1,
    hardT: 0, used: new Set(), ids, lastHard: null,
  };
  return W;
}

const isHard = (W, m) => !!(W.mats[m] && W.mats[m].hard);
const tool = (W, id) => W.cfg.tools.find((t) => t.id === id);
const heroChest = (W) => [W.hero.x, W.hero.y + 1.3, W.hero.z];
const distToCell = (W, c) => { const [x, y, z] = heroChest(W); return Math.hypot(c.x + 0.5 - x, c.y + 0.5 - y, c.z + 0.5 - z); };

/** Removes blocks around a point and turns the result into events, coins, gems and falling pieces. */
function blast(W, x, y, z, r, canHard, by) {
  const res = smashSphere(W.g, x, y, z, r, W.mats, canHard);
  if (res.removed.length) afterRemove(W, res.removed, by, x, y, z, r);
  return res;
}
function afterRemove(W, removed, by, x, y, z, r) {
  const mult = comboHit(W.combo) * (W.fever > 0 ? W.cfg.fever.mult : 1);
  const coins = W.demo ? 0 : coinsFor(W.cfg, removed, mult);
  W.coins += coins; W.left -= removed.length; W.smashed += removed.length;
  let gold = 0;
  for (const c of removed) if (c.m === W.ids.gold) gold++;
  W.ev.push({ type: 'smash', by, removed, x, y, z, r, coins, mult, word: smashWord(W.cfg, removed.length), gold });
  for (const c of removed) if (c.m === W.ids.star) gotStar(W, c.x + 0.5, c.y + 0.5, c.z + 0.5);
  // whatever lost its support falls as one piece and shatters where it lands
  for (const cl of collapse(W.g, removed)) {
    W.left -= cl.total;
    const land = landingDrop(W.g, cl.cells);
    W.falls.push({ id: W.nextId++, cells: cl.cells, total: cl.total, y: 0, vy: 0, drop: land, spin: (cl.cells.length % 2 ? 1 : -1) * (0.3 + Math.min(1, cl.total / 400)) });
    W.ev.push({ type: 'fall', fall: W.falls[W.falls.length - 1] });
  }
}
/** How far a falling piece drops before its lowest block rests on something (or the ground). */
function landingDrop(g, cells) {
  let drop = Infinity;
  for (const c of cells) {
    let y = c.y - 1; while (y >= 0 && !g.get(c.x, y, c.z)) y--;
    drop = Math.min(drop, c.y - (y + 1));
  }
  return Number.isFinite(drop) ? drop : 0;
}

/** Can the hero stand at (x, z) with feet at y? Returns the first blocking cell (the one at chest height first) or null. */
function blockAt(W, x, z, y) {
  const r = W.cfg.hero.radius, g = W.g;
  let hit = null;
  const y0 = Math.floor(y + 0.05), y1 = Math.floor(y + W.cfg.hero.height);
  for (let cy = y1; cy >= y0; cy--) for (const [ox, oz] of [[0, 0], [r, 0], [-r, 0], [0, r], [0, -r], [r * 0.7, r * 0.7], [-r * 0.7, r * 0.7], [r * 0.7, -r * 0.7], [-r * 0.7, -r * 0.7]]) {
    const cx = Math.floor(x + ox), cz = Math.floor(z + oz);
    if (g.get(cx, cy, cz)) { if (!hit || cy === y0 + 1) hit = { x: cx, y: cy, z: cz }; }
  }
  return hit;
}
/** Height of the ground under the hero's feet (top of the highest block under his middle at most 1 step up). */
function supportY(W, x, z, y) {
  const cx = Math.floor(x), cz = Math.floor(z);
  for (let cy = Math.floor(y + 0.05) - 1; cy >= 0; cy--) if (W.g.get(cx, cy, cz)) return cy + 1;
  return 0;
}

/** The player taps or holds: t = {type: 'block', x, y, z, nx, ny, nz} or {type: 'ground', x, z} or {type: 'chest'}. */
export function aimHammer(W, t, hold) {
  const h = W.hero; h.hold = !!hold;
  if (!t) { h.goal = null; h.aim = null; return; }
  if (t.type === 'chest') { h.goal = { x: W.chest.x, z: W.chest.z }; h.aim = null; return; }
  if (t.type === 'block') {
    h.aim = { x: t.x, y: t.y, z: t.z };
    // walk to the face that was tapped (on the ground in front of it)
    h.goal = { x: t.x + 0.5 + (t.nx || 0) * 0.9, z: t.z + 0.5 + (t.nz || 0) * 0.9 };
  } else { h.aim = null; h.goal = { x: t.x, z: t.z }; }
}
export function release(W) { W.hero.hold = false; }

/** Uses a throwable tool at a target point; returns false when it is cooling down or locked (and the free try is used). */
export function useTool(W, id, p) {
  const tl = tool(W, id); if (!tl || id === 'hammer' || W.phase === 'done') return false;
  if ((W.cool[id] || 0) > 0) return false;
  const owned = W.owned.includes(id);
  if (!owned && W.fever <= 0) { if (W.tried.has(id)) return false; W.tried.add(id); } // a locked tool: one free try per level; smash time lends them all
  W.cool[id] = cooldownOf(W.cfg, id, W.fever > 0);
  W.used.add(id);
  const h = W.hero, [hx, hy, hz] = heroChest(W);
  h.yaw = Math.atan2(p.x - h.x, p.z - h.z); h.swingT = 0; h.swingCell = null; // throw animation
  const shot = { id: W.nextId++, kind: id, t: 0, x: hx, y: hy + 0.6, z: hz, sx: hx, sy: hy + 0.6, sz: hz, tx: p.x, ty: p.y, tz: p.z, r: tl.r, free: !owned };
  if (id === 'bomb') { shot.dur = Math.max(0.35, Math.min(0.8, Math.hypot(p.x - hx, p.z - hz) / 22)); }
  else if (id === 'rocket') { const d = Math.hypot(p.x - hx, p.y - shot.y, p.z - hz) || 1; shot.dx = (p.x - hx) / d; shot.dy = (p.y - shot.y) / d; shot.dz = (p.z - hz) / d; shot.dist = 0; }
  else if (id === 'ball') { const d = Math.hypot(p.x - hx, p.z - hz) || 1; shot.dx = (p.x - hx) / d; shot.dz = (p.z - hz) / d; shot.y = tl.r; shot.dist = 0; shot.x = h.x + shot.dx * 1.2; shot.z = h.z + shot.dz * 1.2; }
  else if (id === 'hole') { shot.x = p.x; shot.y = Math.max(1.5, p.y); shot.z = p.z; shot.dur = tl.dur; shot.tick = 0; }
  else if (id === 'meteor') { shot.sx = p.x + 8; shot.sy = 42; shot.sz = p.z + 10; shot.x = shot.sx; shot.y = shot.sy; shot.z = shot.sz; shot.dur = 0.9; }
  W.shots.push(shot);
  (W.queued = W.queued || []).push({ type: 'throw', shot }); // used between frames: delivered by the next step()
  return true;
}

function stepShots(W, dt) {
  for (const s of W.shots) {
    s.t += dt;
    if (s.kind === 'bomb') {
      const k = Math.min(1, s.t / s.dur);
      s.x = s.sx + (s.tx - s.sx) * k; s.z = s.sz + (s.tz - s.sz) * k; s.y = s.sy + (s.ty - s.sy) * k + Math.sin(k * Math.PI) * (2 + s.dur * 6);
      if (k >= 1) { s.done = true; boom(W, s, s.tx, s.ty, s.tz); }
    } else if (s.kind === 'rocket') {
      const sp = 34 * dt; let hit = raycast(W.g, s.x, s.y, s.z, s.dx, s.dy, s.dz, sp);
      s.x += s.dx * sp; s.y += s.dy * sp; s.z += s.dz * sp; s.dist += sp;
      if (s.y <= 0.2) hit = hit || { x: Math.floor(s.x), y: 0, z: Math.floor(s.z) };
      if (hit) { s.done = true; boom(W, s, hit.x + 0.5, hit.y + 0.5, hit.z + 0.5); } else if (s.dist > 60) { s.done = true; boom(W, s, s.x, s.y, s.z); }
    } else if (s.kind === 'ball') {
      const sp = 15 * dt; s.x += s.dx * sp; s.z += s.dz * sp; s.dist += sp; s.roll = (s.roll || 0) + sp / s.r;
      const res = smashSphere(W.g, s.x, s.y, s.z, s.r, W.mats, true);
      if (res.removed.length) { afterRemove(W, res.removed, 'ball', s.x, s.y, s.z, s.r); W.ev.push({ type: 'roll', x: s.x, y: s.y, z: s.z, n: res.removed.length }); }
      const out = s.x < -4 || s.z < -4 || s.x > W.g.W + 4 || s.z > W.g.D + 4;
      if (s.dist > tool(W, 'ball').len || out) { s.done = true; W.ev.push({ type: 'pop', x: s.x, y: s.y, z: s.z, kind: 'ball' }); }
    } else if (s.kind === 'hole') {
      s.tick -= dt;
      const r = s.r * Math.min(1, s.t / (s.dur * 0.6));
      if (s.tick <= 0) { s.tick = 0.1; const res = smashSphere(W.g, s.x, s.y, s.z, r, W.mats, true); if (res.removed.length) afterRemove(W, res.removed, 'hole', s.x, s.y, s.z, r); }
      if (s.t >= s.dur) { s.done = true; W.ev.push({ type: 'pop', x: s.x, y: s.y, z: s.z, kind: 'hole' }); }
    } else if (s.kind === 'meteor') {
      const k = Math.min(1, s.t / s.dur);
      s.x = s.sx + (s.tx - s.sx) * k; s.y = s.sy + (s.ty - s.sy) * k; s.z = s.sz + (s.tz - s.sz) * k;
      if (k >= 1) { s.done = true; boom(W, s, s.tx, s.ty, s.tz); }
    }
  }
  W.shots = W.shots.filter((s) => !s.done);
}
function boom(W, s, x, y, z) {
  W.ev.push({ type: 'boom', kind: s.kind, x, y, z, r: s.r });
  blast(W, x, y, z, s.r, true, s.kind);
}

function stepFalls(W, dt) {
  for (const f of W.falls) {
    f.vy -= 30 * dt; f.y += f.vy * dt;
    if (-f.y >= f.drop) { f.done = true; f.y = -f.drop; land(W, f); }
  }
  W.falls = W.falls.filter((f) => !f.done);
}
function land(W, f) {
  let x = 0, y = 0, z = 0; for (const c of f.cells) { x += c.x; y += c.y; z += c.z; }
  const k = f.cells.length || 1;
  const removed = f.cells;
  const mult = W.fever > 0 ? W.cfg.fever.mult : 1;
  const coins = W.demo ? 0 : coinsFor(W.cfg, removed, mult) + (removed.length < f.total ? coinsFor(W.cfg, [{ m: removed[0].m }], mult) * (f.total - removed.length) : 0);
  W.coins += coins; W.smashed += f.total;
  W.ev.push({ type: 'land', fall: f, x: x / k + 0.5, y: y / k - f.drop + 0.5, z: z / k + 0.5, coins, n: f.total });
  for (const c of removed) if (c.m === W.ids.star) gotStar(W, c.x + 0.5, c.y + 0.5 - f.drop, c.z + 0.5);
}

function stepHero(W, dt) {
  const h = W.hero, H = W.cfg.hero, hm = tool(W, 'hammer');
  h.cool -= dt; h.happy = Math.max(0, h.happy - dt); h.bump = Math.max(0, h.bump - dt);
  // the swing: the hammer lands part way through
  if (h.swingT >= 0) {
    const before = h.swingT; h.swingT += dt / hm.cd;
    if (before < SWING_HIT && h.swingT >= SWING_HIT && h.swingCell) {
      const c = h.swingCell, m = W.g.get(c.x, c.y, c.z);
      if (m && isHard(W, m)) { W.ev.push({ type: 'clang', x: c.x + 0.5, y: c.y + 0.5, z: c.z + 0.5 }); tooHard(W, c); h.bump = 0.25; }
      else { const res = blast(W, c.x + 0.5, c.y + 0.5, c.z + 0.5, hm.r, false, 'hammer'); if (res.hard && !res.removed.length) tooHard(W, c); W.ev.push({ type: 'hit', x: c.x + 0.5, y: c.y + 0.5, z: c.z + 0.5, n: res.removed.length }); }
    }
    if (h.swingT >= 1) h.swingT = -1;
  }
  const swing = (c) => { if (h.cool > 0 || h.swingT >= 0) return false; h.swingT = 0; h.cool = hm.cd; h.swingCell = { x: c.x, y: c.y, z: c.z }; h.yaw = Math.atan2(c.x + 0.5 - h.x, c.z + 0.5 - h.z); W.ev.push({ type: 'swing' }); return true; };
  // the tapped block: smash it once it is in reach (and keep smashing while the finger holds)
  if (h.aim && !W.g.get(h.aim.x, h.aim.y, h.aim.z)) { h.aim = null; if (!h.hold) h.goal = null; }
  if (h.aim && distToCell(W, h.aim) <= H.reach) { h.goal = null; h.moving = false; if (swing(h.aim) && !h.hold) h.aim = null; } // a tap is one swing, a hold keeps swinging
  else if (h.goal) {
    const dx = h.goal.x - h.x, dz = h.goal.z - h.z, d = Math.hypot(dx, dz);
    const near = W.phase !== 'done' && !W.chest.open && Math.hypot(W.chest.x - h.x, W.chest.z - h.z) < 1.0;
    if (d < 0.25 || near) { h.goal = null; h.moving = false; }
    else {
      const sp = Math.min(d, H.speed * dt), ux = dx / d, uz = dz / d;
      h.yaw = Math.atan2(ux, uz);
      const nx = h.x + ux * sp, nz = h.z + uz * sp;
      let b = blockAt(W, nx, nz, h.y);
      if (b && H.step > 0 && b.y === Math.floor(h.y + 0.05) && !blockAt(W, nx, nz, h.y + H.step)) { h.y += H.step; b = null; } // step up (off: the hero stays on the ground and smashes)
      if (!b) { h.x = nx; h.z = nz; h.moving = true; h.stepT += sp; if (h.stepT > 1.1) { h.stepT = 0; W.ev.push({ type: 'step' }); } }
      else {
        h.moving = false;
        // something in the way: smash through it (hard blocks need a tool)
        const m = W.g.get(b.x, b.y, b.z);
        if (isHard(W, m)) { if (swing(b) && !h.hold) h.goal = null; } // one clang, then stop: it needs a tool
        else swing(b);
      }
    }
  } else h.moving = false;
  // gravity onto whatever is under the feet
  const sy = supportY(W, h.x, h.z, h.y);
  if (h.y > sy) { h.vy -= 30 * dt; h.y = Math.max(sy, h.y + h.vy * dt); } else { h.vy = 0; h.y = sy; }
  // the treasure: walk into the open vault and touch the chest
  if (!W.chest.open && Math.hypot(W.chest.x - h.x, W.chest.z - h.z) < 1.9 && Math.abs(h.y) < 1.2) openChest(W);
}
function tooHard(W, c, quiet) { W.lastHard = { x: c.x, y: c.y, z: c.z, t: W.t }; if (W.hardT > 0) return; W.hardT = quiet ? 1.2 : 2.5; W.ev.push({ type: 'tooHard', x: c.x + 0.5, y: c.y + 0.5, z: c.z + 0.5 }); }
function openChest(W) {
  W.chest.open = true; W.hero.happy = 2.5; W.hero.goal = null; W.hero.aim = null;
  const bonus = W.demo ? 0 : W.cfg.coins.level;
  W.coins += bonus;
  W.ev.push({ type: 'treasure', x: W.chest.x, z: W.chest.z, coins: bonus });
  gotStar(W, W.chest.x, 1.5, W.chest.z, true);
}
/** A star is found (from the chest, a smashed star block or one that fell); the last one starts smash time. */
function gotStar(W, x, y, z, chest = false) {
  W.got++; W.hero.happy = 2;
  W.ev.push({ type: 'star', x, y, z, got: W.got, need: W.need, chest });
  if (W.got >= W.need && W.phase === 'play' && !W.demo) { W.phase = 'fever'; W.fever = W.cfg.fever.dur; for (const k of Object.keys(W.cool)) W.cool[k] = Math.min(W.cool[k], cooldownOf(W.cfg, k, true)); W.ev.push({ type: 'fever' }); }
}

/** Advances the world by dt seconds and returns what happened. */
export function step(W, dt) {
  W.ev = W.queued || []; W.queued = [];
  W.t += dt; W.hardT = Math.max(0, W.hardT - dt);
  for (const k of Object.keys(W.cool)) W.cool[k] = Math.max(0, W.cool[k] - dt);
  comboTick(W.combo, dt);
  if (W.phase !== 'done') stepHero(W, dt);
  stepShots(W, dt);
  stepFalls(W, dt);
  if (W.phase === 'fever') { W.fever -= dt; if (W.fever <= 0) { W.fever = 0; W.phase = 'free'; W.ev.push({ type: 'clear' }); } } // free: keep smashing, NEXT is up
  return W.ev;
}

export const wreck = (W) => wreckOf(W.total, W.left);

/**
 * The bot: where a player who wants the treasure would tap next. Walks at the chest; when a hard block stops the
 * hero it throws a bomb at it. Used for the attract mode and for the tests.
 */
export function botTap(W) {
  const h = W.hero;
  if (W.phase === 'fever' || W.phase === 'free') { // smash time and after: bombs at the biggest piece left, else hammer the nearest block
    const t = nearestBlock(W, 9); if (t && (W.cool.bomb || 0) <= 0) return { tool: 'bomb', p: { x: t.x + 0.5, y: t.y + 0.5, z: t.z + 0.5 } };
    return t ? { tool: 'hammer', t: { type: 'block', ...t, nx: 0, ny: 0, nz: 1 } } : null;
  }
  // the hammer just bounced off steel: bomb that block
  const lh = W.lastHard;
  if (lh && W.t - lh.t < 1.5 && W.g.get(lh.x, lh.y, lh.z) && (W.cool.bomb || 0) <= 0) return { tool: 'bomb', p: { x: lh.x + 0.5, y: lh.y + 0.5, z: lh.z + 0.5 } };
  // the stars still in the building: a high one gets a bomb, the chest and low ones the hammer
  const left = W.starCells.filter((c) => W.g.get(c.x, c.y, c.z) === W.ids.star);
  const hi = left.find((c) => c.y > 3);
  if (hi && (W.cool.bomb || 0) <= 0) return { tool: 'bomb', p: { x: hi.x + 0.5, y: hi.y + 0.5, z: hi.z + 0.5 } };
  const lo = left.find((c) => c.y <= 3);
  if (lo && W.chest.open) return { tool: 'hammer', t: { type: 'block', ...lo, nx: 0, ny: 0, nz: 1 } };
    // a hard block right in front: bomb it
  const dx = W.chest.x - h.x, dz = W.chest.z - h.z, d = Math.hypot(dx, dz) || 1;
  const ahead = blockAt(W, h.x + dx / d * 0.9, h.z + dz / d * 0.9, h.y);
  if (ahead && isHard(W, W.g.get(ahead.x, ahead.y, ahead.z)) && (W.cool.bomb || 0) <= 0) return { tool: 'bomb', p: { x: ahead.x + 0.5, y: ahead.y + 0.5, z: ahead.z + 0.5 } };
  return { tool: 'hammer', t: { type: 'chest' } };
}
function nearestBlock(W, R) {
  const h = W.hero; let best = null, bd = Infinity;
  for (let y = 0; y < 6; y++) for (let z = Math.floor(h.z - R); z <= h.z + R; z++) for (let x = Math.floor(h.x - R); x <= h.x + R; x++) {
    if (!W.g.get(x, y, z)) continue; const d = Math.hypot(x + 0.5 - h.x, y - 1, z + 0.5 - h.z); if (d < bd) { bd = d; best = { x, y, z }; }
  }
  return best;
}
