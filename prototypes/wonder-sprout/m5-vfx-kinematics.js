// PROTOTYPE - NOT FOR PRODUCTION
/**
 * Module 5: hyper-animated VFX, spring-rigged critters and camera beats. One fixed particle pool (sparks,
 * shards with gravity and ground bounce, shockwave rings, petals, confetti, number pops), resource orbs on
 * Bezier arcs with stardust tails, damped trauma shake, hitstop, and a priority queue of short cinematic
 * beats (ease in, frame, letterbox, ease back; never blocks input). Critters are drawn from baked parts on
 * a small spring rig: squash and stretch that keeps volume, blinking eyes that track the finger, bobbing
 * ears, wagging tail, flapping wings at stage 2, crown and orbiting star halo at stage 3.
 */
import { W, H, VIEW, LAYOUT, HUD_TARGET, clamp, lerp, easeInOut, easeOut } from './m0-orchestrator.js';
import { put, PAL, rgba, mix, SLING_TIPS, LANDMARK_X, LANDMARK_BASE } from './m1-art-bakery.js';

/** Quadratic Bezier point. */
export function bez(p0, p1, p2, u) { const a = 1 - u; return [a * a * p0[0] + 2 * a * u * p1[0] + u * u * p2[0], a * a * p0[1] + 2 * a * u * p1[1] + u * u * p2[1]]; }
/** Beat queue rule: a beat plays if nothing plays and the cooldown passed, or it outranks the one waiting. */
export function pickBeat(queue, now, readyAt) { if (!queue.length || now < readyAt) return null; queue.sort((a, b) => b.pri - a.pri); return queue.shift(); }

/** Stage-2 mark: a two-leaf sprout growing from the head, swaying. */
function sprout(ctx, x, y, sway) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(sway);
  ctx.strokeStyle = PAL.plum; ctx.lineWidth = 2.5; ctx.fillStyle = '#7FC36B';
  ctx.beginPath(); ctx.moveTo(0, 6); ctx.quadraticCurveTo(1, -6, 0, -14); ctx.stroke();
  for (const sx of [-1, 1]) { ctx.beginPath(); ctx.moveTo(0, -12); ctx.quadraticCurveTo(sx * 10, -26, sx * 20, -16); ctx.quadraticCurveTo(sx * 10, -8, 0, -12); ctx.fill(); ctx.stroke(); }
  ctx.restore();
}
/** Iris colour per species. */
const IRIS = { fox: '#B8732E', bunny: '#5D8FD6', dragon: '#2E9E6E', owl: '#C98A1E', unicorn: '#B06CC8' };
export function createVfx(world) {
  const { bus, cfg, rng } = world, F = cfg.fx;
  const V = { flash: 0, rainbow: 0, trauma: 0, hitstop: 0, timeScale: 1, slowT: 0, cam: { x: W / 2, y: H / 2, z: 1 }, beat: null, beatQ: [], beatReady: 0, bars: 0, time: 0, curtain: 0, pills: { gem: 0, wood: 0 }, rigs: new Map(), firstNova: true };
  const N = 600, pool = Array.from({ length: N }, () => ({ on: false }));
  let cap = F.particleCap[1], live = 0;
  V.setTier = (tier) => { cap = F.particleCap[tier]; };
  const spawn = (o) => { if (live >= cap) return null; for (let i = 0; i < N; i++) { const p = pool[i]; if (!p.on) { Object.assign(p, { on: true, x: 0, y: 0, vx: 0, vy: 0, g: 0, life: 1, max: 1, rot: 0, vr: 0, s: 1, a: 1, ground: 0, drag: 0, sp: null, kind: 'sp', text: '', col: PAL.gold }, o); live++; return p; } } return null; };
  const art = () => world.art;
  // ---------- emitters ----------
  V.sparks = (x, y, n, spKey = 'star', speed = 380, life = 0.55) => { for (let i = 0; i < n; i++) { const a = rng() * Math.PI * 2, v = speed * (0.4 + rng() * 0.8); spawn({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, drag: 3, life, max: life, s: 0.5 + rng() * 0.6, vr: (rng() - 0.5) * 10, sp: spKey }); } };
  V.shards = (x, y, n, keys = ['gemTeal', 'gemLav', 'gem']) => { for (let i = 0; i < n; i++) { const a = -Math.PI * (0.1 + rng() * 0.8), v = 260 + rng() * 420; spawn({ x, y, vx: Math.cos(a) * v * (rng() < 0.5 ? -1 : 1), vy: Math.sin(a) * v, g: 1500, ground: y + 30 + rng() * 40, life: 1.3, max: 1.3, s: 0.6 + rng() * 0.7, rot: rng() * 6, vr: (rng() - 0.5) * 14, sp: keys[i % keys.length] }); } };
  V.ring = (x, y, r0, r1, life, col, width = 8) => spawn({ kind: 'ring', x, y, s: r0, vr: r1, life, max: life, col, ground: width });
  V.petals = (x, y, n, spread = 300) => { for (let i = 0; i < n; i++) spawn({ x: x + (rng() - 0.5) * spread, y: y + (rng() - 0.5) * 60, vx: (rng() - 0.5) * 160, vy: -120 - rng() * 220, g: 220, drag: 1.2, life: 2.2, max: 2.2, rot: rng() * 6, vr: (rng() - 0.5) * 6, s: 0.8 + rng() * 0.6, sp: 'petals', a: rng() * 3 | 0 }); };
  V.confetti = (x, y, n) => { const cols = [PAL.gold, PAL.coral, PAL.teal, PAL.lav, mix(PAL.cream, PAL.gold, 0.3)]; for (let i = 0; i < n; i++) { const a = -Math.PI / 2 + (rng() - 0.5) * 2.2, v = 400 + rng() * 520; spawn({ kind: 'conf', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: 700, drag: 1.6, life: 1.8, max: 1.8, rot: rng() * 6, vr: (rng() - 0.5) * 16, s: 1, col: cols[i % cols.length] }); } };
  V.dust = (x, y, n) => { for (let i = 0; i < n; i++) { const a = Math.PI + rng() * Math.PI, v = 60 + rng() * 120; spawn({ kind: 'dust', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v * 0.3, drag: 4, life: 0.6, max: 0.6, s: 8 + rng() * 10, col: mix(PAL.cream, PAL.sage, 0.3) }); } };
  V.pop = (x, y, text, col = PAL.cream, big = false) => spawn({ kind: 'text', x, y, vy: -90, drag: 1.5, life: big ? 1.3 : 0.9, max: big ? 1.3 : 0.9, text, col, s: big ? 1.6 : 1 });
  V.firework = (x, y) => { const cols = ['glow', 'glowTeal', 'glowCoral']; for (let i = 0; i < 26; i++) { const a = i / 26 * Math.PI * 2, v = 300 + rng() * 80; spawn({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: 260, drag: 2.2, life: 1.1, max: 1.1, s: 0.22, sp: cols[i % 3] }); } V.ring(x, y, 10, 120, 0.5, PAL.gold, 5); };
  V.shake = (k) => { V.trauma = Math.min(1, V.trauma + k * F.shake); };
  V.stop = (ms) => { V.hitstop = Math.max(V.hitstop, ms / 1000); };
  V.slow = (sec, k = 0.35) => { V.slowT = Math.max(V.slowT, sec); V.timeScale = k; };
  /** Ask for a cinematic beat; pri decides who wins, the cooldown keeps them rare in the core loop. */
  V.queueBeat = (b) => { if (V.beatQ.length > 3) V.beatQ.sort((a, c) => c.pri - a.pri).pop(); V.beatQ.push(Object.assign({ zoom: 1.12, dur: 1.2, pri: 1, t: 0 }, b)); };
  V.curtainGo = () => { V.curtain = 0.0001; };

  // ---------- orbs ----------
  const orbs = [], MAXO = 160;
  const destPos = (o) => {
    if (o.dest === 'landmark') { const i = world.kingdom.target(); return i >= 0 ? [LANDMARK_X[i], LANDMARK_BASE - (world.state.activeLandmark >= 6 ? 196 : 70)] : HUD_TARGET.gem; }
    return HUD_TARGET[o.kind] || HUD_TARGET.gem;
  };
  bus.on('orb', (e) => {
    if (orbs.length >= MAXO) { bus.emit('orb:arrive', e); return; }
    const a = rng() * Math.PI * 2, v = (120 + rng() * 260) * (e.spread || 1);
    orbs.push({ x: e.x, y: e.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 160, t: 0, pop: world.magnet ? 0.12 : 0.34 + rng() * 0.18, fly: 0, dur: 0.55 + rng() * 0.25, p0: null, p1: null, e, k: orbs.length });
  });
  const updOrbs = (dt) => {
    for (let i = orbs.length - 1; i >= 0; i--) {
      const o = orbs[i]; o.t += dt;
      if (!o.p0) { o.x += o.vx * dt; o.y += o.vy * dt; o.vx *= Math.exp(-4 * dt); o.vy = o.vy * Math.exp(-4 * dt) + 300 * dt; if (o.t >= o.pop) { o.p0 = [o.x, o.y]; const d = destPos(o.e); o.p2 = d; o.p1 = [lerp(o.x, d[0], 0.3) + (o.x < d[0] ? -140 : 140) * rng(), Math.min(o.y, d[1]) - 120 - rng() * 120]; } continue; }
      o.fly += dt / o.dur; const u = easeInOut(Math.min(1, o.fly)), p = bez(o.p0, o.p1, o.p2, u); o.x = p[0]; o.y = p[1];
      if ((o.k + Math.floor(o.t * 30)) % 3 === 0) spawn({ x: o.x, y: o.y, vx: 0, vy: 20, drag: 2, life: 0.35, max: 0.35, s: 0.28, sp: 'star' });
      if (o.fly >= 1) { orbs.splice(i, 1); bus.emit('orb:arrive', o.e); if (o.e.dest !== 'landmark') V.pills[o.e.kind === 'wood' ? 'wood' : 'gem'] = 1; else V.landPulse = 1; world.audio.orb(o.k); }
    }
  };

  // ---------- reactions ----------
  bus.on('hit', (e) => {
    V.impulse(e.by === 'hero' ? world.state.heroId : e.helper, e.type === 'mushroom' ? 0.5 : 0.35);
    if (e.by === 'hero') { V.rig(world.state.heroId).joy = 0.45; spawn({ kind: 'burst', x: e.x, y: e.y, life: 0.18, max: 0.18, s: 34 + Math.min(30, (e.combo || 0) * 4), rot: rng() * 3, col: e.type === 'mushroom' ? mix(PAL.coral, PAL.gold, 0.5) : PAL.gold }); spawn({ kind: 'flash', x: e.x, y: e.y, life: 0.22, max: 0.22, s: 0.35 }); }
    V.sparks(e.x, e.y, e.type === 'mushroom' ? 5 : 7, e.type === 'geode' ? 'gemTeal' : 'star', 300);
    V.ring(e.x, e.y, 8, 54, 0.3, e.type === 'mushroom' ? PAL.coral : PAL.gold, 4);
    if (e.type === 'tree') { V.petals(e.x, e.y - 70, 4, 80); if (e.by !== 'helper') V.pop(e.x, e.y - 96, '+1', mix(PAL.coral, PAL.gold, 0.5)); }
    if (e.by === 'hero' && e.combo >= 3) V.pop(e.x, e.y - 40, '×' + e.combo, mix(PAL.gold, PAL.cream, 0.3));
    if (e.by === 'hero') V.shake(e.type === 'mushroom' ? 0.08 : 0.12);
  });
  bus.on('burst', (e) => {
    spawn({ kind: 'burst', x: e.x, y: e.y, life: 0.24, max: 0.24, s: 70, rot: rng() * 3, col: e.type === 'pinata' ? PAL.coral : '#7FE0E8' }); spawn({ kind: 'flash', x: e.x, y: e.y, life: 0.3, max: 0.3, s: 0.6 });
    V.shards(e.x, e.y, e.type === 'pinata' ? 18 : 12, e.type === 'pinata' ? ['gem', 'gemCoral', 'gemTeal', 'gemLav'] : ['gemTeal', 'gemLav', 'gemTeal']);
    V.ring(e.x, e.y, 20, 140, 0.45, e.type === 'pinata' ? PAL.coral : PAL.teal, 7); V.sparks(e.x, e.y, 10, 'star', 520);
    if (e.type === 'pinata') V.confetti(e.x, e.y, 30);
    V.shake(0.3); V.stop(e.mult > 1 ? 0 : 25);
  });
  bus.on('nova', (e) => {
    V.stop(F.hitstopMs); V.shake(0.55);
    V.ring(e.x, e.y, 20, 220, 0.55, PAL.gold, 12); V.ring(e.x, e.y, 10, 320, 0.8, mix(PAL.cream, PAL.gold, 0.4), 5);
    spawn({ kind: 'flash', x: e.x, y: e.y, life: 0.35, max: 0.35, s: 1 });
    V.sparks(e.x, e.y, 24, 'star', 700, 0.8);
    V.pop(e.x, e.y - 60, '×' + Math.round(e.mult), PAL.gold, true);
    if (V.firstNova) { V.firstNova = false; V.queueBeat({ x: e.x, y: e.y, pri: 2, dur: 0.8, zoom: 1.1, slow: 0.25 }); }
  });
  bus.on('launch', (e) => { V.dust(e.x, e.y + 30, 6); V.impulse(world.state.heroId, -0.45, true); });
  bus.on('land', (e) => { V.dust(e.x, e.y + 28, 5); V.impulse(world.state.heroId, 0.4); });
  bus.on('wall', (e) => { if (e.speed > 400) { V.dust(e.x, e.y, 3); V.impulse(world.state.heroId, 0.3); V.shake(0.06); } });
  bus.on('respawn', (e) => V.sparks(e.x, e.y, 8, 'star', 200));
  bus.on('landmark:built', (e) => {
    V.queueBeat({ x: e.x, y: e.y, pri: 5, dur: 1.8, zoom: 1.18, slow: 0.3, bars: true });
    for (let k = 0; k < 3; k++) setTimeout(() => V.firework(e.x + (k - 1) * 70, e.y - 60 - k * 20), 250 + k * 220);
    V.petals(e.x, e.y, 20, 200); V.confetti(e.x, e.y + 20, 40); V.shake(0.35);
  });
  bus.on('landmark:planted', (e) => { V.sparks(e.x, e.y, 14, 'star', 260); V.ring(e.x, e.y, 10, 80, 0.5, PAL.gold, 5); });
  bus.on('egg:drop', (e) => { V.eggFly = { kind: e.kind, x0: e.x, y0: e.y, x1: e.tx, y1: e.ty, t: 0 }; });
  bus.on('egg:tap', (e) => { V.sparks(e.x, e.y, 6 + e.n * 3, 'star', 240); V.shake(0.06 * e.n); });
  bus.on('egg:poke', (e) => V.sparks(e.x, e.y, 3, 'star', 120));
  bus.on('egg:hatch', (e) => {
    V.shards(e.x, e.y, 10, ['star']); V.ring(e.x, e.y, 20, 160, 0.6, PAL.gold, 8); V.confetti(e.x, e.y, 26); V.petals(e.x, e.y, 10, 120);
    if (e.critter) { V.rig(e.critter.id).pop = 1; V.queueBeat({ x: e.x + 40, y: e.y - 40, pri: 4, dur: 1.4, zoom: 1.2, slow: 0.4, bars: true }); }
  });
  bus.on('evolve', (e) => {
    const h = e.hero ? world.gameplay.hero : (world.gameplay.helpers.find((k) => k.id === e.critter.id) || world.gameplay.hero);
    V.rig(e.critter.id).evo = 1; spawn({ kind: 'pillar', x: h.x, y: h.y, life: 1.4, max: 1.4, s: 1 });
    V.sparks(h.x, h.y, 30, 'star', 500, 1); V.ring(h.x, h.y, 20, 200, 0.7, PAL.lav, 8);
    V.queueBeat({ x: h.x, y: h.y - 30, pri: 5, dur: 1.6, zoom: 1.22, slow: 0.35, bars: true });
  });
  bus.on('raid:start', (e) => V.queueBeat({ x: 360, y: 320, pri: 3, dur: 1.1, zoom: 1.06, bars: true }));
  bus.on('raid:weak', (e) => { V.shards(e.x, e.y, 10, ['gemCoral', 'gem', 'gemLav']); V.ring(e.x, e.y, 10, 110, 0.4, PAL.coral, 6); V.shake(0.25); V.stop(30); });
  bus.on('raid:hit', (e) => { V.sparks(e.x, e.y, 8, 'star', 300); V.shake(0.1); });
  bus.on('raid:break', (e) => { V.stop(F.hitstopMs); V.shake(0.7); V.confetti(e.x, e.y, 70); V.shards(e.x, e.y, 26, ['gem', 'gemCoral', 'gemTeal', 'gemLav']); for (let k = 0; k < 4; k++) setTimeout(() => V.firework(e.x - 150 + k * 100, e.y - 40 + (k % 2) * 40), k * 160); V.queueBeat({ x: e.x, y: e.y, pri: 4, dur: 1.4, zoom: 1.12, slow: 0.3, bars: true }); });
  bus.on('landmark:gild', (e) => {
    V.queueBeat({ x: e.x, y: e.y - 30, pri: 5, dur: 1.5, zoom: 1.16, slow: 0.3, bars: true });
    V.ring(e.x, e.y - 20, 20, 190, 0.7, PAL.gold, 9); V.sparks(e.x, e.y - 40, 34, 'star', 460, 1); V.confetti(e.x, e.y, 30); V.shake(0.3);
    for (let k = 0; k < 2; k++) setTimeout(() => V.firework(e.x + (k ? 60 : -60), e.y - 90), 260 + k * 240);
    if (e.n >= 6) setTimeout(() => { V.flash = 1; V.queueBeat({ x: 380, y: 300, pri: 6, dur: 2, zoom: 1.06, slow: 0, bars: true }); }, 1600);
  });
  // island complete: a short golden flash, then the rainbow bridge to the next island draws itself across
  // the sky while the camera frames it
  bus.on('world:done', () => { V.flash = 1; V.rainbow = 0.0001; V.beatReady = 0; V.queueBeat({ x: 380, y: 300, pri: 6, dur: 2.2, zoom: 1.06, slow: 0, bars: true }); V.sparks(645, 300, 14, 'star', 360); });

  // ---------- rigs ----------
  V.rig = (id) => { let r = V.rigs.get(id); if (!r) { r = { sq: 0, v: 0, blink: 1 + rng() * 3, eyes: 1, tail: rng() * 6, pop: 0, evo: 0, face: 1, look: [0, 0] }; V.rigs.set(id, r); } return r; };
  /** Squash impulse: positive squashes, negative stretches. */
  V.impulse = (id, k) => { if (id == null) return; const r = V.rig(id); r.v += k * 14; };
  const updRig = (r, dt) => {
    r.v += (-180 * r.sq - 12 * r.v) * dt; r.sq += r.v * dt; r.sq = clamp(r.sq, -0.45, 0.45);
    r.blink -= dt; if (r.blink < 0) { r.eyes = 0; if (r.blink < -0.12) { r.eyes = 1; r.blink = 2 + rng() * 3; } }
    r.tail += dt; r.joy = Math.max(0, (r.joy || 0) - dt); r.pop = Math.max(0, r.pop - dt * 1.6); r.evo = Math.max(0, r.evo - dt * 0.8);
  };
  /**
   * Draw one critter at x, y (feet centre). vx, vy give stretch along motion; look is a point the eyes follow.
   */
  V.drawCritter = (ctx, c, x, y, o = {}) => {
    const A = art(); const parts = A.critters && A.critters[c.species]; if (!parts) return;
    const r = V.rig(c.id), t = V.time, stage = c.stage, size = (o.size || 1) * [1, 1.12, 1.24][stage - 1] * (1 + r.pop * 0.25 * Math.sin(r.pop * 12));
    const sp = Math.hypot(o.vx || 0, o.vy || 0), st = clamp(sp / 2600, 0, 0.32), ang = Math.atan2(o.vy || 0, o.vx || 0);
    if (Math.abs(o.vx || 0) > 30) r.face = o.vx > 0 ? 1 : -1;
    const breathe = o.idle ? Math.sin(t * 3 + c.id) * 0.03 : 0, sq = r.sq + breathe;
    ctx.save(); ctx.translate(x, y);
    // shadow on the ground
    ctx.save(); ctx.globalAlpha = 0.28; ctx.fillStyle = PAL.plum; ctx.beginPath(); ctx.ellipse(0, 6 + (o.air || 0), 28 * size, 8 * size, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    ctx.translate(0, -(o.air || 0));
    if (stage === 3 && A.glow) put(ctx, A.glow, 0, -44 * size, 1.5 * size, 1.5 * size, 0, 0.35 + 0.1 * Math.sin(t * 3));
    if (st > 0.02) { ctx.rotate(ang); ctx.scale(1 + st, 1 / (1 + st)); ctx.rotate(-ang); }
    ctx.scale(size * (1 + sq * 0.6), size * (1 - sq));
    ctx.translate(0, -30); ctx.scale(r.face, 1);
    const flap = Math.sin(t * (o.fly ? 22 : 6)) * (o.fly ? 0.5 : 0.18);
    if (stage >= 2) { put(ctx, parts.wing, -30, -14, 1.3, 1.3, -0.45 - flap); ctx.save(); ctx.scale(-1, 1); put(ctx, parts.wing, -30, -14, 1.3, 1.3, -0.45 - flap); ctx.restore(); }
    put(ctx, parts.tail, -22, 8, 1, 1, Math.sin(r.tail * 5) * 0.25 - 0.1);
    put(ctx, parts.body, 0, 0);
    const hx = 2, hy = -34 + Math.sin(t * 3 + c.id) * 1.2;
    const earA = Math.sin(t * 2.4 + c.id) * 0.08 - sq * 0.8;
    put(ctx, parts.ear, hx - 22, hy - 18, 1, 1, -0.32 + earA); put(ctx, parts.ear, hx + 22, hy - 18, 1, 1, 0.32 - earA);
    put(ctx, parts.head, hx, hy);
    // face: big glossy eyes that blink and follow the look point; the mood picks the eyes and mouth
    const look = o.look || [x + 60 * r.face, y - 60], lx = clamp((look[0] - x) / 300 * r.face, -1, 1) * 3.5, ly = clamp((look[1] - y + 60) / 300, -1, 1) * 2.5;
    const mood = r.joy > 0 ? 'joy' : o.fly ? 'whee' : o.pull > 0.15 ? 'focus' : 'calm';
    const iris = IRIS[c.species] || PAL.teal;
    for (const ex of [-15, 15]) {
      const ox = hx + ex + lx, oy = hy - 5 + ly;
      if (mood === 'joy' || r.eyes < 0.5) { ctx.strokeStyle = PAL.plum; ctx.lineWidth = 3.5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(ox, oy + 3, 7, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke(); continue; }
      const ry = mood === 'focus' ? 6.5 : mood === 'whee' ? 11.5 : 10, rx = mood === 'whee' ? 9 : 8;
      ctx.fillStyle = PAL.plum; ctx.beginPath(); ctx.ellipse(ox, oy, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
      const ig = ctx.createLinearGradient(0, oy - ry, 0, oy + ry); ig.addColorStop(0, PAL.plum); ig.addColorStop(1, iris);
      ctx.fillStyle = ig; ctx.beginPath(); ctx.ellipse(ox, oy + 1, rx * 0.78, ry * 0.8, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = PAL.cream; ctx.beginPath(); ctx.arc(ox + 2.6, oy - ry * 0.38, rx * 0.36, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(ox - 2.6, oy + ry * 0.4, rx * 0.16, 0, Math.PI * 2); ctx.fill();
      if (mood === 'focus') { ctx.strokeStyle = PAL.plum; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(ox - 9, oy - 12 + (ex < 0 ? -2 : 2) * 0); ctx.lineTo(ox + 9, oy - 12 + (ex < 0 ? 3 : -3)); ctx.stroke(); }
    }
    ctx.strokeStyle = PAL.plum; ctx.lineWidth = 2.8; ctx.lineCap = 'round';
    if (mood === 'whee' || mood === 'joy') { ctx.fillStyle = mix(PAL.coral, PAL.plum, 0.35); ctx.beginPath(); ctx.ellipse(hx, hy + 12, mood === 'whee' ? 6 : 8, mood === 'whee' ? 7.5 : 6, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.fillStyle = PAL.coral; ctx.beginPath(); ctx.ellipse(hx, hy + 15, 4, 2.5, 0, 0, Math.PI * 2); ctx.fill(); }
    else if (mood === 'focus') { ctx.beginPath(); ctx.moveTo(hx - 5, hy + 11); ctx.lineTo(hx + 5, hy + 10); ctx.stroke(); }
    else if (o.happy) { ctx.beginPath(); ctx.arc(hx, hy + 8, 6, 0.2, Math.PI - 0.2); ctx.stroke(); }
    if (stage === 2) sprout(ctx, hx, hy - 34, Math.sin(t * 2.2 + c.id) * 0.12);
    if (stage >= 3) put(ctx, parts.crown, hx, hy - 30, 0.85, 0.85, Math.sin(t * 2) * 0.05);
    ctx.restore();
    if (stage >= 3 && A.star) for (let k = 0; k < 5; k++) { const a = t * 1.8 + k / 5 * Math.PI * 2; put(ctx, A.star, x + Math.cos(a) * 46 * size, y - 70 * size - (o.air || 0) + Math.sin(a) * 14 * size, 0.55, 0.55, a * 2, 0.9); }
    if (r.evo > 0) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; put(ctx, A.glow, x, y - 40, 2.5 * r.evo, 2.5 * r.evo, 0, r.evo); ctx.restore(); }
  };

  // ---------- targets, sling, raid ----------
  V.drawTargets = (ctx, G, t, showRings) => {
    const A = art();
    for (const k of G.targets) {
      if (!k.alive) continue;
      const b = easeOut(k.born), w = Math.sin(t * 28) * k.wob * 0.12;
      let sp = null;
      if (k.type === 'mushroom') sp = A.mushroom[k.v % 3];
      else if (k.type === 'geode') sp = A.geode; else if (k.type === 'tree') sp = A.tree || null; else sp = A.pinata || null;
      if (!sp) continue;
      const bob = k.type === 'pinata' ? Math.sin(t * 2 + k.id) * 4 : 0, sq = 1 + k.wob * 0.16 * Math.sin(t * 34);
      put(ctx, sp, k.x, k.y + bob, b * sq, b / sq, w * (k.type === 'tree' ? 0.4 : 1));
      if (showRings && (k.type === 'geode' || k.type === 'pinata')) V.drawRing(ctx, k.x, k.y + bob, k.r, k.phase, b);
    }
  };
  /** The rhythm ring: shrinks toward the core; bright gold while a tap is a SUPER NOVA. */
  V.drawRing = (ctx, x, y, r, phase, a = 1) => {
    const R = cfg.rhythm, u = (phase % R.period) / R.period, sc = 1 + (R.ringStart - 1) * (1 - u), sweet = u >= 1 - R.window || u <= R.window * 0.35;
    ctx.save(); ctx.globalAlpha = a * (sweet ? 1 : 0.35 + 0.5 * u);
    ctx.strokeStyle = sweet ? mix(PAL.gold, PAL.cream, 0.35) : PAL.gold; ctx.lineWidth = sweet ? 7 : 4;
    ctx.beginPath(); ctx.arc(x, y, r * sc, 0, Math.PI * 2); ctx.stroke();
    ctx.globalAlpha = a * 0.5; ctx.strokeStyle = rgba(PAL.cream, 0.8); ctx.lineWidth = 2; ctx.setLineDash([6, 8]); ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
    if (sweet && art().glow) put(ctx, art().glow, x, y, 1.5, 1.5, 0, 0.45 * a);
  };
  /** Sling with its golden elastic bands: both run behind the critter to a pouch at its feet. */
  const SL = 1.2;
  V.drawSlingBack = (ctx, G) => {
    const A = art(), sx = LAYOUT.slingX, sy = LAYOUT.slingY + 56, h = G.hero;
    put(ctx, A.sling, sx, sy, SL, SL);
    const tl = [sx + SLING_TIPS[0][0] * SL, sy + SLING_TIPS[0][1] * SL], tr = [sx + SLING_TIPS[1][0] * SL, sy + SLING_TIPS[1][1] * SL];
    const k = G.tension(), pouch = h.mode === 'rest' ? [h.x, h.y + 14] : [sx, tl[1] + 18];
    band(ctx, tl[0], tl[1], pouch[0], pouch[1], k); band(ctx, tr[0], tr[1], pouch[0], pouch[1], k);
    ctx.save(); ctx.fillStyle = mix(PAL.coral, PAL.plum, 0.45); ctx.beginPath(); ctx.ellipse(pouch[0], pouch[1], 20, 9, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  };
  V.drawSlingFront = (ctx, G) => {
    const dots = G.preview();
    if (dots) {
      ctx.save();
      // the guide flows from the hero toward where it will go
      for (let i = 0; i < dots.length; i++) { const [x, y] = dots[i], a = 1 - i / dots.length; ctx.globalAlpha = 0.9 * a; ctx.fillStyle = PAL.plum; ctx.beginPath(); ctx.arc(x, y, 7 * a + 5, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = i % 2 ? PAL.cream : PAL.gold; ctx.beginPath(); ctx.arc(x, y, 7 * a + 3, 0, Math.PI * 2); ctx.fill(); }
      ctx.restore();
    }
  };
  function band(ctx, x0, y0, x1, y1, k) {
    ctx.save(); ctx.lineCap = 'round';
    ctx.strokeStyle = rgba(PAL.plum, 0.45); ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
    ctx.strokeStyle = mix(PAL.gold, PAL.cream, 0.2 + k * 0.4); ctx.lineWidth = 6 - k * 2; ctx.stroke();
    if (k > 0.05) { ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = rgba(PAL.gold, 0.35 * k); ctx.lineWidth = 16; ctx.stroke(); }
    ctx.restore();
  }
  V.drawRaid = (ctx, G, t) => {
    const r = G.raid, A = art(); if (!r || !A.airship) return;
    const tilt = r.phase === 'enter' ? 0.06 : r.phase === 'leave' ? -0.06 : Math.sin(t * 1.3) * 0.03;
    put(ctx, A.airship, r.x, r.y, 1, 1, tilt);
    // propeller
    ctx.save(); ctx.translate(r.x + 150, r.y + 74); ctx.scale(1, Math.abs(Math.sin(t * 30))); ctx.fillStyle = rgba(PAL.cream, 0.8); ctx.fillRect(-4, -34, 8, 68); ctx.restore();
    for (const w of r.weak) {
      if (w.hp <= 0) continue;
      ctx.save(); ctx.translate(w.x, w.y); ctx.rotate(w.spin); const s = 1 + w.wob * 0.25 * Math.sin(t * 40); ctx.scale(s, s);
      for (let k = 0; k < 8; k++) { ctx.rotate(Math.PI / 4); ctx.fillStyle = k % 2 ? PAL.gold : mix(PAL.gold, PAL.coral, 0.4); ctx.fillRect(-6, -30, 12, 12); }
      ctx.fillStyle = mix(PAL.gold, PAL.cream, 0.2); ctx.beginPath(); ctx.arc(0, 0, 22, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = rgba(PAL.plum, 0.6); ctx.lineWidth = 3; ctx.stroke();
      ctx.fillStyle = PAL.coral; ctx.beginPath(); ctx.arc(0, 0, 9, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      for (let k = 0; k < w.hp; k++) { ctx.fillStyle = PAL.gold; ctx.beginPath(); ctx.arc(w.x - 12 + k * 12, w.y + 40, 4.5, 0, Math.PI * 2); ctx.fill(); }
    }
    if (r.phase === 'stay') { const left = Math.max(0, cfg.raid.staySec - r.t) / cfg.raid.staySec; ctx.save(); ctx.lineCap = 'round'; ctx.strokeStyle = rgba(PAL.plum, 0.4); ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(r.x - 80, r.y - 82); ctx.lineTo(r.x + 80, r.y - 82); ctx.stroke(); ctx.strokeStyle = PAL.gold; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(r.x - 80, r.y - 82); ctx.lineTo(r.x - 80 + 160 * left, r.y - 82); ctx.stroke(); ctx.restore(); }
  };
  V.drawEggFly = (ctx) => {
    const f = V.eggFly, A = art(); if (!f || !A.eggs) return;
    const u = Math.min(1, f.t / 0.9), p = bez([f.x0, f.y0], [(f.x0 + f.x1) / 2, Math.min(f.y0, f.y1) - 200], [f.x1, f.y1], easeInOut(u));
    put(ctx, A.eggs[f.kind], p[0], p[1] + 30, 0.8, 0.8, u * 6.28);
  };

  // ---------- frame ----------
  V.update = (rawDt) => {
    V.time += rawDt;
    V.trauma = Math.max(0, V.trauma - rawDt * 1.8);
    if (V.slowT > 0) { V.slowT -= rawDt; if (V.slowT <= 0) V.timeScale = 1; }
    if (V.eggFly) { V.eggFly.t += rawDt; if (V.eggFly.t > 0.9) V.eggFly = null; }
    V.pills.gem = Math.max(0, V.pills.gem - rawDt * 4); V.pills.wood = Math.max(0, V.pills.wood - rawDt * 4); V.landPulse = Math.max(0, (V.landPulse || 0) - rawDt * 4);
    for (const r of V.rigs.values()) updRig(r, rawDt);
    // beats
    if (!V.beat) { const b = pickBeat(V.beatQ, V.time, V.beatReady); if (b) { V.beat = b; if (b.slow) V.slow(b.slow * b.dur, 0.4); world.audio.sting(); } }
    let tz = 1, tx = W / 2, ty = H / 2, bars = 0;
    if (V.beat) {
      const b = V.beat; b.t += rawDt; const u = b.t / b.dur, k = u < 0.25 ? easeInOut(u / 0.25) : u > 0.75 ? easeInOut((1 - u) / 0.25) : 1;
      tz = 1 + (b.zoom - 1) * k; tx = lerp(W / 2, b.x, k * 0.7); ty = lerp(H / 2, b.y, k * 0.6); bars = b.bars ? k : k * 0.4;
      if (u >= 1) { V.beat = null; V.beatReady = V.time + F.beatCooldownSec; }
    }
    V.cam.z = tz; V.cam.x = tx; V.cam.y = ty; V.bars = bars;
    if (V.curtain > 0) { V.curtain += rawDt / 2.4; if (V.curtain >= 1) V.curtain = 0; }
    if (V.flash > 0) V.flash = Math.max(0, V.flash - rawDt / 0.45);
    if (V.rainbow > 0 && V.rainbow < 1) V.rainbow = Math.min(1, V.rainbow + rawDt / 1.6);
    const dt = rawDt * V.timeScale;
    updOrbs(dt);
    for (let i = 0; i < N; i++) {
      const p = pool[i]; if (!p.on) continue;
      p.life -= dt; if (p.life <= 0) { p.on = false; live--; continue; }
      if (p.drag) { const k = Math.exp(-p.drag * dt); p.vx *= k; p.vy *= k; }
      p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
      if (p.ground && p.g && p.y > p.ground) { p.y = p.ground; p.vy *= -0.45; p.vx *= 0.7; p.vr *= 0.6; }
    }
  };
  /** Camera transform for the world layer (beats zoom, trauma shake). */
  V.applyCamera = (ctx) => {
    const z = V.cam.z, sh = V.trauma * V.trauma * 18, t = V.time;
    const ox = sh ? Math.sin(t * 91) * sh : 0, oy = sh ? Math.cos(t * 73) * sh : 0;
    // keep the zoomed view inside the painted stage: a beat near an edge never shows past it
    const zz = Math.max(1, z), m = sh / zz, dx = VIEW.dx, dy = VIEW.dy;
    const cx = clamp(V.cam.x, -dx + (W / 2 + dx) / zz + m, W + dx - (W / 2 + dx) / zz - m), cy = clamp(V.cam.y, -dy + (H / 2 + dy) / zz + m, H - H / (2 * zz) - m);
    ctx.translate(W / 2 + ox, H / 2 + oy); ctx.scale(zz, zz); ctx.translate(-cx, -cy);
  };
  V.drawParticles = (ctx) => {
    const A = art();
    for (let i = 0; i < N; i++) {
      const p = pool[i]; if (!p.on) continue;
      const u = p.life / p.max;
      if (p.kind === 'sp') { const sp = p.sp === 'petals' ? A.petals && A.petals[p.a] : A[p.sp]; if (sp) put(ctx, sp, p.x, p.y, p.s, p.s, p.rot, Math.min(1, u * 2.5)); }
      else if (p.kind === 'ring') { ctx.save(); ctx.globalAlpha = u; ctx.strokeStyle = p.col; ctx.lineWidth = p.ground * u + 1; ctx.beginPath(); ctx.arc(p.x, p.y, lerp(p.vr, p.s, u), 0, Math.PI * 2); ctx.stroke(); ctx.restore(); }
      else if (p.kind === 'conf') { ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.globalAlpha = Math.min(1, u * 3); ctx.fillStyle = p.col; ctx.fillRect(-5, -3 * Math.abs(Math.cos(p.rot * 2)) - 1, 10, 6 * Math.abs(Math.cos(p.rot * 2)) + 2); ctx.restore(); }
      else if (p.kind === 'dust') { ctx.save(); ctx.globalAlpha = u * 0.6; ctx.fillStyle = p.col; ctx.beginPath(); ctx.arc(p.x, p.y, p.s * (1.6 - u), 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
      else if (p.kind === 'text') { ctx.save(); const s = p.s * (1 + (1 - u) * 0.2) * (u > 0.85 ? 1 + (u - 0.85) * 3 : 1); ctx.translate(p.x, p.y); ctx.scale(s, s); ctx.globalAlpha = Math.min(1, u * 3); ctx.font = '900 40px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round'; ctx.lineWidth = 9; ctx.strokeStyle = PAL.plum; ctx.strokeText(p.text, 0, 0); ctx.fillStyle = p.col; ctx.fillText(p.text, 0, 0); ctx.restore(); }
      else if (p.kind === 'flash') { ctx.save(); ctx.globalCompositeOperation = 'lighter'; put(ctx, A.glow, p.x, p.y, 6 * p.s * (1.2 - u), 6 * p.s * (1.2 - u), 0, u); ctx.restore(); }
      else if (p.kind === 'burst') { ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); const R = p.s * (0.6 + (1 - u) * 0.7); ctx.globalAlpha = Math.min(1, u * 2); ctx.fillStyle = p.col; ctx.beginPath(); for (let k = 0; k < 16; k++) { const a = k / 16 * Math.PI * 2, rr = k % 2 ? R * 0.45 : R; ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } ctx.closePath(); ctx.fill(); ctx.fillStyle = PAL.cream; ctx.beginPath(); ctx.arc(0, 0, R * 0.32, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
      else if (p.kind === 'pillar') { ctx.save(); ctx.globalCompositeOperation = 'lighter'; const gr = ctx.createLinearGradient(p.x - 60, 0, p.x + 60, 0); gr.addColorStop(0, rgba(PAL.gold, 0)); gr.addColorStop(0.5, rgba(mix(PAL.gold, PAL.cream, 0.5), 0.55 * Math.sin(u * Math.PI))); gr.addColorStop(1, rgba(PAL.gold, 0)); ctx.fillStyle = gr; ctx.fillRect(p.x - 60, 0, 120, p.y + 20); ctx.restore(); }
    }
  };
  V.drawOrbs = (ctx) => {
    const A = art();
    for (const o of orbs) { const sp = o.e.kind === 'wood' ? A.log : o.e.kind === 'honey' ? A.honey : A.gem; if (!sp) continue; const s = o.p0 ? 1 - o.fly * 0.3 : 1; put(ctx, sp, o.x, o.y, s, s, o.e.kind === 'gem' ? Math.sin(o.t * 8) * 0.3 : o.t * 4); }
  };
  /** Letterbox bars, vignette and the world-transition curtain (screen space). */
  V.drawOverlay = (ctx) => {
    if (V.bars > 0.01) {
      const h = 84 * V.bars, x0 = -VIEW.dx, y0 = -VIEW.dy; ctx.fillStyle = rgba(PAL.velvet, 0.92); ctx.fillRect(x0, y0, VIEW.w, h); ctx.fillRect(x0, H - h, VIEW.w, h);
      const cy = y0 + VIEW.h / 2, R = VIEW.h; const g = ctx.createRadialGradient(W / 2, cy, R * 0.3, W / 2, cy, R * 0.75); g.addColorStop(0, rgba(PAL.plum, 0)); g.addColorStop(1, rgba(PAL.plum, 0.4 * V.bars)); ctx.fillStyle = g; ctx.fillRect(x0, y0, VIEW.w, VIEW.h);
    }
    if (V.flash > 0) { ctx.fillStyle = rgba(mix(PAL.gold, PAL.cream, 0.45), 0.5 * V.flash * V.flash); ctx.fillRect(-VIEW.dx, -VIEW.dy, VIEW.w, VIEW.h); }
    if (V.curtain > 0) {
      const u = V.curtain, x = lerp(-W * 1.2, W * 1.2, u), A = art();
      ctx.save(); const g = ctx.createLinearGradient(x - 500, 0, x + 500, 0); g.addColorStop(0, rgba(PAL.cream, 0)); g.addColorStop(0.5, rgba(mix(PAL.cream, PAL.lav, 0.25), 0.96)); g.addColorStop(1, rgba(PAL.cream, 0)); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      if (A.petals) for (let k = 0; k < 40; k++) put(ctx, A.petals[k % 3], x + Math.sin(k * 7.1) * 300, (k * 97 + u * 900) % H, 1.4, 1.4, k + u * 8);
      ctx.restore();
    }
  };
  /** The rainbow bridge over a finished island: grows from the lighthouse across the sky, then stays. */
  V.drawRainbow = (ctx, t) => {
    const done = world.state.landmarks[5] && world.state.landmarks[5].built; if (!done) return;
    const k = V.rainbow > 0 ? easeInOut(V.rainbow) : 1, cx = 380, cy = 430, r0 = 300;
    const a1 = Math.PI * 2 - 0.12, a0 = a1 - (Math.PI - 0.24) * k;
    ctx.save(); ctx.lineCap = 'round'; ctx.globalAlpha = 0.5 + 0.06 * Math.sin(t * 1.5);
    [PAL.coral, PAL.gold, mix(PAL.gold, PAL.sage, 0.5), PAL.teal, PAL.lav].forEach((c, i) => { ctx.strokeStyle = c; ctx.lineWidth = 13; ctx.beginPath(); ctx.arc(cx, cy, r0 - i * 12, a0, a1); ctx.stroke(); });
    ctx.restore();
    if (k < 1 && art().star) { const a = a0; put(ctx, art().star, cx + Math.cos(a) * (r0 - 24), cy + Math.sin(a) * (r0 - 24), 0.9, 0.9, t * 6, 1); }
  };
  /** Rainbow ribbon behind the flying hero: a tapering band through its last positions, with sparkles. */
  const trail = [];
  V.drawTrail = (ctx, h, t) => {
    if (h.mode === 'fly') { trail.push([h.x, h.y - 6]); if (trail.length > 16) trail.shift(); } else if (trail.length) trail.shift();
    if (trail.length < 3) return;
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const cols = [PAL.coral, PAL.gold, '#8FD36B', '#6CC6EA', PAL.lav];
    for (let b = 0; b < cols.length; b++) {
      const off = (b - 2) * 6;
      for (let i = 1; i < trail.length; i++) {
        const u = i / trail.length, [x0, y0] = trail[i - 1], [x1, y1] = trail[i], n = Math.hypot(x1 - x0, y1 - y0) || 1, nx = -(y1 - y0) / n * off * u, ny = (x1 - x0) / n * off * u;
        ctx.globalAlpha = 0.75 * u; ctx.strokeStyle = cols[b]; ctx.lineWidth = 7 * u + 1; ctx.beginPath(); ctx.moveTo(x0 + nx, y0 + ny); ctx.lineTo(x1 + nx, y1 + ny); ctx.stroke();
      }
    }
    ctx.restore();
    if (art().star && trail.length > 4 && h.mode === 'fly' && (V.time * 60 | 0) % 2 === 0) spawn({ x: trail[0][0] + (rng() - 0.5) * 20, y: trail[0][1] + (rng() - 0.5) * 20, vy: 30, drag: 2, life: 0.5, max: 0.5, s: 0.4, vr: 4, sp: 'star' });
  };
  V.liveCount = () => live;
  return V;
}
