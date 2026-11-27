// PROTOTYPE - NOT FOR PRODUCTION
/**
 * Module 3: slingshot-bounce and rhythm-crit gameplay. Drag anywhere on the island to pull the hero
 * critter back on the golden sling, release to fling it through jelly mushrooms, crystal geodes, star-fruit
 * trees and pinatas. Tap a geode or pinata when its shrinking ring meets the core for a SUPER NOVA. Helpers
 * roam and dash into crystals by themselves. Every 75 s a sky-pirate airship pinata visits for 22 s.
 * This module only moves bodies and reports what happened on the bus ('hit', 'launch', 'land', 'nova',
 * 'raid:*'); economy, effects and sound listen elsewhere. Physics runs in fixed 1/120 s substeps.
 */
import { LAYOUT, clamp, dist, easeInOut } from './m0-orchestrator.js';

// ---------- pure helpers (unit tested) ----------
/** A touch that barely moved and lifted quickly on a target is a tap; anything else is a drag. */
export function classifyTouch(movedPx, ms, onTarget, p) { return onTarget && movedPx < p.tapMovePx && ms <= p.tapMs ? 'tap' : 'drag'; }
/** Launch velocity from the pull vector (finger offset from where it pressed); the critter flies the other way. */
export function launchVelocity(pullX, pullY, p, power = 1) {
  const len = Math.hypot(pullX, pullY), k = Math.min(len, p.maxPull) / (len || 1);
  let vx = -pullX * k * p.launchPower * power, vy = -pullY * k * p.launchPower * power;
  const sp = Math.hypot(vx, vy), cap = p.maxSpeed * power; if (sp > cap) { vx *= cap / sp; vy *= cap / sp; }
  return { vx, vy };
}
/** Magnetic aim assist: bend the launch up to assistDeg toward the nearest target inside the cone. */
export function aimAssist(vx, vy, ox, oy, targets, p) {
  const sp = Math.hypot(vx, vy); if (sp < 1) return { vx, vy };
  const a0 = Math.atan2(vy, vx), cone = p.assistConeDeg * Math.PI / 180, maxBend = p.assistDeg * Math.PI / 180;
  let best = null, bestD = 1e9;
  for (const t of targets) {
    if (!t.alive) continue;
    let d = Math.atan2(t.y - oy, t.x - ox) - a0; d = Math.atan2(Math.sin(d), Math.cos(d));
    if (Math.abs(d) < cone) { const dd = dist(ox, oy, t.x, t.y); if (dd < bestD) { bestD = dd; best = d; } }
  }
  if (best === null) return { vx, vy };
  const a = a0 + clamp(best, -maxBend, maxBend);
  return { vx: Math.cos(a) * sp, vy: Math.sin(a) * sp };
}
/** Ring radius multiplier (1 = on the core) at phase seconds into the period. */
export function ringScale(phase, r) { const u = (phase % r.period) / r.period; return 1 + (r.ringStart - 1) * (1 - u); }
/** True while the ring is on the core: the end of each period plus a short grace after it resets. */
export function isSweet(phase, r) { const u = (phase % r.period) / r.period; return u >= 1 - r.window || u <= r.window * 0.35; }
/** Advance a body with drag and friction, bouncing off the arena walls. Returns how many walls it hit. */
export function stepBody(b, dt, box, p) {
  const sp = Math.hypot(b.vx, b.vy);
  if (sp > 0) { const ns = Math.max(0, sp * Math.exp(-p.drag * dt) - p.friction * dt); b.vx *= ns / sp; b.vy *= ns / sp; }
  b.x += b.vx * dt; b.y += b.vy * dt;
  let walls = 0;
  if (b.x < box.l + b.r) { b.x = box.l + b.r; b.vx = Math.abs(b.vx) * p.wallBounce; walls++; }
  if (b.x > box.r - b.r) { b.x = box.r - b.r; b.vx = -Math.abs(b.vx) * p.wallBounce; walls++; }
  if (b.y < box.t + b.r) { b.y = box.t + b.r; b.vy = Math.abs(b.vy) * p.wallBounce; walls++; }
  if (b.y > box.b - b.r) { b.y = box.b - b.r; b.vy = -Math.abs(b.vy) * p.wallBounce; walls++; }
  return walls;
}
/** Circle-vs-circle: push the body out of a fixed circle and reflect its velocity. Returns the normal or null. */
export function collide(b, cx, cy, cr, restitution) {
  const dx = b.x - cx, dy = b.y - cy, d = Math.hypot(dx, dy), min = b.r + cr;
  if (d >= min || d === 0) return null;
  const nx = dx / d, ny = dy / d; b.x = cx + nx * min; b.y = cy + ny * min;
  const vn = b.vx * nx + b.vy * ny;
  if (vn < 0) { b.vx -= (1 + restitution) * vn * nx; b.vy -= (1 + restitution) * vn * ny; }
  return { nx, ny };
}
/** Trajectory preview dots (no collisions), one every `every` seconds. */
export function previewDots(x, y, vx, vy, box, p, n = 14, every = 0.045) {
  const b = { x, y, vx, vy, r: p.critterRadius }, out = [];
  for (let i = 0; i < n; i++) { for (let k = 0; k < 6; k++) stepBody(b, every / 6, box, p); out.push([b.x, b.y]); }
  return out;
}

// ---------- island layout ----------
const START = [
  ['mushroom', 360, 560, 0], ['mushroom', 170, 690, 1], ['mushroom', 560, 640, 2],
  ['pinata', 360, 700], ['geode', 250, 800], ['geode', 470, 770], ['geode', 616, 862],
  ['tree', 96, 548], ['tree', 630, 520],
];
const GROVE = [['mushroom', 130, 862, 1], ['mushroom', 470, 548, 0], ['mushroom', 604, 742, 2]];
const SPOTS = [[250, 800], [470, 770], [616, 862], [360, 700], [260, 600], [450, 650], [140, 770], [560, 840], [300, 520], [520, 520]];
const RADIUS = { mushroom: 40, geode: 38, pinata: 40, tree: 46 };
/** Trees collide on their canopy, this far above the trunk base. */
export const TREE_DY = 66;

export function createGameplay(world) {
  const { bus, cfg, rng } = world, P = cfg.physics, R = cfg.rhythm, E = cfg.economy, RD = cfg.raid;
  const G = { targets: [], helpers: [], aim: null, raid: null, combo: 0, time: 0, raidClock: 0, power: 1, critMult: R.critMult, enabled: true, nextRaid: RD.firstSec };
  let nid = 1;
  const add = (type, x, y, v = 0) => {
    const t = { id: nid++, type, x, y, r: RADIUS[type], v, alive: true, hp: type === 'geode' ? E.geodeHp : type === 'pinata' ? E.pinataHp : 1, phase: rng() * R.period, cool: 0, wob: 0, respawn: 0, born: 1 };
    if (type === 'pinata' && G.firstPinata !== false) { t.hp = 2; G.firstPinata = false; }
    G.targets.push(t); return t;
  };
  for (const s of START) add(...s);
  const hero = { x: LAYOUT.slingX, y: LAYOUT.slingY - 60, vx: 0, vy: 0, r: P.critterRadius, mode: 'rest', t: 0, from: null };
  G.hero = hero;
  const box = () => ({ l: LAYOUT.arenaLeft, r: LAYOUT.arenaRight, t: G.raid && G.raid.phase !== 'leave' ? 150 : LAYOUT.arenaTop + 300, b: LAYOUT.arenaBottom });
  G.box = box;
  const rest = () => ({ x: LAYOUT.slingX, y: LAYOUT.slingY - 60 });

  /** The target under a stage point, with the fat-finger hitbox. */
  G.targetAt = (x, y, kinds = ['geode', 'pinata']) => {
    let best = null, bd = 1e9;
    for (const t of G.targets) { if (!t.alive || !kinds.includes(t.type)) continue; const d = dist(x, y, t.x, t.y); if (d < t.r * P.hitboxScale && d < bd) { bd = d; best = t; } }
    if (G.raid && G.raid.phase === 'stay') for (const w of G.raid.weak) { if (w.hp <= 0) continue; const d = dist(x, y, w.x, w.y); if (d < w.r * P.hitboxScale && d < bd) { bd = d; best = w; } }
    return best;
  };

  // ---------- input ----------
  G.down = (p) => {
    if (!G.enabled) return false;
    G.aim = { sx: p.x, sy: p.y, x: p.x, y: p.y, t0: G.time, target: G.targetAt(p.x, p.y), dragging: false, moved: 0 };
    return true;
  };
  G.move = (p) => {
    const a = G.aim; if (!a) return;
    a.x = p.x; a.y = p.y; a.moved = Math.max(a.moved, dist(a.sx, a.sy, p.x, p.y));
    if (!a.dragging && a.moved >= P.tapMovePx) {
      a.dragging = true;
      if (hero.mode !== 'rest') { hero.mode = 'zip'; hero.t = 0; hero.from = { x: hero.x, y: hero.y }; hero.vx = hero.vy = 0; bus.emit('recall', {}); }
      bus.emit('aim:start', {});
    }
    if (a.dragging) bus.emit('aim', { tension: G.tension() });
  };
  G.up = () => {
    const a = G.aim; if (!a) return; G.aim = null;
    const kind = classifyTouch(a.moved, (G.time - a.t0) * 1000, !!a.target, P);
    if (kind === 'tap') { G.tapTarget(a.target); return; }
    if (!a.dragging) return;
    const px = a.x - a.sx, py = a.y - a.sy;
    if (Math.hypot(px, py) < 26) { bus.emit('aim:cancel', {}); return; }
    G.launch(px, py);
  };
  G.cancel = () => { if (G.aim && G.aim.dragging) bus.emit('aim:cancel', {}); G.aim = null; };
  /** Pull vector clamped to the sling's reach. */
  G.pull = () => { const a = G.aim; if (!a || !a.dragging) return null; const px = a.x - a.sx, py = a.y - a.sy, l = Math.hypot(px, py), k = Math.min(l, P.maxPull) / (l || 1); return { x: px * k, y: py * k }; };
  G.tension = () => { const p = G.pull(); return p ? Math.hypot(p.x, p.y) / P.maxPull : 0; };
  G.preview = () => { const p = G.pull(); if (!p || Math.hypot(p.x, p.y) < 26) return null; const o = rest(), v = launchVelocity(p.x, p.y, P, G.power); return previewDots(o.x, o.y, v.vx, v.vy, box(), Object.assign({}, P, { friction: P.friction })); };

  G.launch = (px, py) => {
    const o = rest(); let v = launchVelocity(px, py, P, G.power); v = aimAssist(v.vx, v.vy, o.x, o.y, G.targets, P);
    Object.assign(hero, { x: o.x, y: o.y, vx: v.vx, vy: v.vy, mode: 'fly', t: 0 }); G.combo = 0;
    bus.emit('launch', { x: o.x, y: o.y, vx: v.vx, vy: v.vy, tension: Math.min(1, Math.hypot(px, py) / P.maxPull) });
  };
  G.tapTarget = (t) => {
    if (t.weak) { G.hitWeak(t, 2, true); return; }
    const sweet = isSweet(t.phase, R);
    if (sweet) { G.nova(t); return; }
    t.wob = 1; t.cool = 0.15;
    bus.emit('hit', { type: t.type, x: t.x, y: t.y, by: 'tap', combo: 0, target: t });
    G.damage(t, 1, 'tap');
  };
  /** SUPER NOVA: the target bursts at once for critMult resources. */
  G.nova = (t) => {
    bus.emit('nova', { type: t.type, x: t.x, y: t.y, mult: G.critMult, target: t });
    G.burst(t, G.critMult);
  };

  // ---------- targets ----------
  G.damage = (t, n, by) => { if (t.type !== 'geode' && t.type !== 'pinata') return; t.hp -= n; if (t.hp <= 0) G.burst(t, 1, by); };
  G.burst = (t, mult, by) => {
    if (!t.alive) return;
    t.alive = false; t.respawn = t.type === 'geode' ? E.respawnSec.geode : E.respawnSec.pinata;
    bus.emit('burst', { type: t.type, x: t.x, y: t.y, mult, by, target: t });
  };
  const respawn = (t) => {
    const free = SPOTS.filter(([x, y]) => G.targets.every((o) => o === t || !o.alive || dist(o.x, o.y, x, y) > o.r + t.r + 24) && dist(x, y, hero.x, hero.y) > 90);
    const s = free.length ? free[Math.floor(rng() * free.length)] : [t.x, t.y];
    t.x = s[0]; t.y = s[1]; t.alive = true; t.born = 0; t.hp = t.type === 'geode' ? E.geodeHp : E.pinataHp; t.phase = 0;
    bus.emit('respawn', { type: t.type, x: t.x, y: t.y });
  };
  const contact = (b, t, byHero) => {
    const restitution = t.type === 'mushroom' ? 1 : 0.86, cr = t.type === 'tree' ? t.r : t.r * 1.02;
    const cy = t.type === 'tree' ? t.y - TREE_DY : t.y;
    const n = collide(b, t.x, cy, cr, restitution); if (!n) return false;
    if (t.type === 'mushroom') { const sp = Math.hypot(b.vx, b.vy), ns = Math.max(sp * P.bumperBoost, P.bumperMin); b.vx *= ns / (sp || 1); b.vy *= ns / (sp || 1); }
    if (t.cool > 0) return true;
    t.cool = 0.12; t.wob = 1;
    if (byHero) G.combo++;
    bus.emit('hit', { type: t.type, x: t.x - n.nx * t.r, y: cy - n.ny * t.r, by: byHero ? 'hero' : 'helper', combo: byHero ? G.combo : 0, speed: Math.hypot(b.vx, b.vy), target: t });
    G.damage(t, 1, byHero ? 'hero' : 'helper');
    return true;
  };

  // ---------- helpers ----------
  G.setHelpers = (ids) => {
    const keep = G.helpers.filter((h) => ids.includes(h.id));
    for (const id of ids) if (!keep.some((h) => h.id === id)) keep.push({ id, x: 200 + rng() * 320, y: 600 + rng() * 260, vx: 0, vy: 0, r: 26, mode: 'wander', t: 0, every: E.helperEverySec[0], goal: null, hop: 0 });
    G.helpers = keep.slice(0, 3);
  };
  const updHelper = (h, dt) => {
    h.t += dt; h.hop += dt;
    if (h.mode === 'wander') {
      if (!h.goal || dist(h.x, h.y, h.goal[0], h.goal[1]) < 12) { h.goal = [90 + rng() * 540, 540 + rng() * 380]; if (Math.abs(h.goal[0] - LAYOUT.slingX) < 120 && h.goal[1] > 760) h.goal[0] += h.goal[0] < LAYOUT.slingX ? -130 : 130; }
      const dx = h.goal[0] - h.x, dy = h.goal[1] - h.y, d = Math.hypot(dx, dy) || 1, sp = 70;
      h.vx = dx / d * sp; h.vy = dy / d * sp; h.x += h.vx * dt; h.y += h.vy * dt;
      if (h.t > h.every) {
        const cands = G.targets.filter((t) => t.alive && (t.type === 'geode' || t.type === 'tree'));
        if (cands.length) { cands.sort((a, b) => dist(h.x, h.y, a.x, a.y) - dist(h.x, h.y, b.x, b.y)); h.prey = cands[0]; h.mode = 'dash'; h.t = 0; bus.emit('helper:dash', { id: h.id }); } else h.t = 0;
      }
    } else if (h.mode === 'dash') {
      const t = h.prey; if (!t || !t.alive) { h.mode = 'wander'; h.t = 0; return; }
      const ty = t.type === 'tree' ? t.y - TREE_DY : t.y, dx = t.x - h.x, dy = ty - h.y, d = Math.hypot(dx, dy) || 1;
      h.vx = dx / d * 620; h.vy = dy / d * 620; h.x += h.vx * dt; h.y += h.vy * dt;
      if (d < t.r + h.r + 4) {
        if (t.cool <= 0) { t.cool = 0.2; t.wob = 0.7; bus.emit('hit', { type: t.type, x: t.x, y: ty, by: 'helper', combo: 0, target: t, helper: h.id }); G.damage(t, 1, 'helper'); }
        h.vx = -dx / d * 240; h.vy = -dy / d * 240; h.mode = 'recoil'; h.t = 0;
      }
    } else if (h.mode === 'recoil') {
      h.x += h.vx * dt; h.y += h.vy * dt; h.vx *= Math.exp(-5 * dt); h.vy *= Math.exp(-5 * dt);
      if (h.t > 0.5) { h.mode = 'wander'; h.t = 0; }
    }
    h.x = clamp(h.x, LAYOUT.arenaLeft + h.r, LAYOUT.arenaRight - h.r); h.y = clamp(h.y, 470, LAYOUT.arenaBottom - h.r);
    // friends keep clear of the sling so they never stand on the hero
    if (h.mode === 'wander') { const dx = h.x - LAYOUT.slingX, dy = h.y - (LAYOUT.slingY - 60); const d = Math.hypot(dx, dy); if (d < 140) { const k = (140 - d) / (d || 1); h.x += dx * k; h.y += dy * k; } }
  };

  // ---------- raid ----------
  G.startRaid = () => {
    G.raid = { phase: 'enter', t: 0, x: 900, y: 300, weak: [-96, 0, 96].map((ox, i) => ({ weak: true, ox, oy: i === 1 ? 92 : 58, x: 0, y: 0, r: 30, hp: RD.weakHp, spin: 0, cool: 0, wob: 0, alive: true, type: 'raid' })) };
    bus.emit('raid:start', { x: 360, y: 300 });
  };
  G.hitWeak = (w, n, byTap) => {
    if (w.hp <= 0 || !G.raid || G.raid.phase !== 'stay') return;
    w.hp -= n; w.wob = 1; w.cool = 0.15;
    bus.emit('raid:hit', { x: w.x, y: w.y, by: byTap ? 'tap' : 'hero', left: G.raid.weak.reduce((s, k) => s + Math.max(0, k.hp), 0) });
    if (w.hp <= 0) { w.alive = false; bus.emit('raid:weak', { x: w.x, y: w.y }); }
    if (G.raid.weak.every((k) => k.hp <= 0)) { G.raid.phase = 'leave'; G.raid.t = 0; G.raid.broken = true; bus.emit('raid:break', { x: G.raid.x, y: G.raid.y }); }
  };
  const updRaid = (dt) => {
    const r = G.raid; if (!r) return;
    r.t += dt;
    if (r.phase === 'enter') { const u = Math.min(1, r.t / 2.4); r.x = 900 - (900 - 360) * easeInOut(u); if (u >= 1) { r.phase = 'stay'; r.t = 0; } }
    else if (r.phase === 'stay') { r.x = 360 + Math.sin(r.t * 0.7) * 60; if (r.t > RD.staySec) { r.phase = 'leave'; r.t = 0; bus.emit('raid:escape', { x: r.x, y: r.y }); } }
    else if (r.phase === 'leave') { if (r.broken) { if (r.t > 0.2) { G.raid = null; bus.emit('raid:end', { broken: true }); return; } } else { r.x -= 320 * dt; if (r.x < -260) { G.raid = null; bus.emit('raid:end', { broken: false }); return; } } }
    r.y = 300 + Math.sin(r.t * 1.6) * 10;
    for (const w of r.weak) { w.x = r.x + w.ox; w.y = r.y + w.oy; w.spin += dt * 4; w.cool = Math.max(0, w.cool - dt); w.wob = Math.max(0, w.wob - dt * 3); }
  };

  // ---------- frame ----------
  G.update = (dt) => {
    G.time += dt;
    for (const t of G.targets) {
      t.phase += dt; t.cool = Math.max(0, t.cool - dt); t.wob = Math.max(0, t.wob - dt * 2.6); t.born = Math.min(1, t.born + dt * 2.5);
      if (!t.alive) { t.respawn -= dt; if (t.respawn <= 0) respawn(t); }
    }
    if (G.enabled) { G.raidClock += dt; if (!G.raid && G.raidClock >= G.nextRaid && G.allowRaid !== false) { G.startRaid(); G.raidClock = 0; G.nextRaid = RD.everySec; } }
    updRaid(dt);
    // hero
    if (hero.mode === 'fly') {
      const steps = Math.max(1, Math.ceil(dt / P.substep)), h = dt / steps;
      for (let s = 0; s < steps; s++) {
        const walls = stepBody(hero, h, box(), P);
        if (walls) bus.emit('wall', { x: hero.x, y: hero.y, speed: Math.hypot(hero.vx, hero.vy) });
        for (const t of G.targets) if (t.alive) contact(hero, t, true);
        if (G.raid && G.raid.phase === 'stay') {
          for (const w of G.raid.weak) if (w.hp > 0 && w.cool <= 0 && collide(hero, w.x, w.y, w.r, 0.9)) G.hitWeak(w, 1, false);
          collide(hero, G.raid.x, G.raid.y - 10, 92, 0.8);
        }
      }
      hero.t += dt;
      if (Math.hypot(hero.vx, hero.vy) < P.restSpeed || hero.t > 7) { hero.mode = 'land'; hero.t = 0; hero.vx = hero.vy = 0; bus.emit('land', { x: hero.x, y: hero.y, combo: G.combo }); }
    } else if (hero.mode === 'land') { hero.t += dt; if (hero.t > 0.22) { hero.mode = 'return'; hero.t = 0; hero.from = { x: hero.x, y: hero.y }; } }
    else if (hero.mode === 'return' || hero.mode === 'zip') {
      hero.t += dt; const dur = hero.mode === 'zip' ? 0.14 : P.returnSec, u = Math.min(1, hero.t / dur), o = rest(), e = easeInOut(u);
      hero.x = hero.from.x + (o.x - hero.from.x) * e; hero.y = hero.from.y + (o.y - hero.from.y) * e - Math.sin(u * Math.PI) * (hero.mode === 'zip' ? 20 : 90);
      if (u >= 1) { hero.mode = 'rest'; hero.x = o.x; hero.y = o.y; bus.emit('rest', {}); }
    } else if (hero.mode === 'rest') { const o = rest(), p = G.pull(); hero.x = o.x + (p ? p.x * 0.55 : 0); hero.y = o.y + (p ? p.y * 0.55 : 0); }
    for (const h of G.helpers) updHelper(h, dt);
  };
  G.addGrove = () => { for (const g of GROVE) if (!G.targets.some((t) => t.type === 'mushroom' && t.x === g[1] && t.y === g[2])) { const t = add(...g); t.born = 0; } };
  return G;
}
