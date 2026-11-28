// PROTOTYPE - NOT FOR PRODUCTION
// Mow Mow Meadow: the game loop. Gardens are stacked northward along a lane; the kart drives with one thumb, the
// deck cuts the mask of the garden it is in, and the gate opens at 90%. Rules live in logic.js, tuning in
// game_config.json.
import * as L from './logic.js';
import { createWorld, dressGarden, lanePiece } from './world.js';
import { createLawn } from './lawn.js';
import { buildBuzzy } from './buzzy.js';

const LANE_M = 10, LANE_HALF_W = 1.45;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/** Starts the game in mode 'play' or 'edit' (edit: the living garden, no input, no save). Returns { destroy }. */
export function run(mode = 'play') {
  if (window.__mm) { try { window.__mm.destroy(); } catch (e) { console.warn('previous run', e); } }
  if (!window.THREE) {
    const again = () => { removeEventListener('three-ready', again); window.__mm = run(mode); };
    addEventListener('three-ready', again);
    const wait = { destroy() { removeEventListener('three-ready', again); if (window.__mm === wait) window.__mm = null; } };
    window.__mm = wait; return wait;
  }
  const cfg = JSON.parse(JSON.stringify(window.gameConfig || {})); // a copy: the host's config is never written
  const play = mode === 'play', root = document.getElementById('app');
  root.innerHTML = '<canvas id="cv"></canvas>'; root.classList.remove('live');
  const canvas = root.querySelector('#cv');
  let world;
  try { world = createWorld(canvas, cfg, { keep: new URLSearchParams(location.search).has('keep') }); } catch (e) { console.error(e); window.__load && window.__load.fail('GL'); return { destroy() {} }; }
  const THREE = window.THREE, dead = { v: false }, offs = [];
  const on = (el, ev, fn, opt) => { el.addEventListener(ev, fn, opt); offs.push(() => el.removeEventListener(ev, fn, opt)); };

  // ---- state
  const S = { save: L.newSave(cfg), slots: new Map(), cur: 0, kart: { x: 0, z: 0, ang: 0, vx: 0, vz: 0, speed: 0, turn: 0 }, flow: L.newFlow(), t: 0, stick: { on: false, id: -1, ox: 0, oy: 0, dx: 0, dz: 0, mag: 0 }, keys: {}, cutting: 0, fresh: 0, frames: 0, ms: 16, slow: 0, fast: 0 };
  const zSouth = []; { let z = 0; for (let n = 0; n < cfg.gardens.length; n++) { zSouth.push(z); z -= cfg.gardens[n].d + LANE_M; } }

  /** Builds (once) garden n: its data, lawn and dressing, north of the one before it. */
  function slot(n) {
    if (S.slots.has(n)) return S.slots.get(n);
    const rec = cfg.gardens[n], g = L.makeGarden(cfg, n, cfg.seed + n * 7919), ox = -rec.w / 2, oz = zSouth[n] - rec.d, d = L.districtOf(n);
    const lawn = createLawn(THREE, g, cfg, ox, oz, cfg.districts[d].grass, world.tier, L.rng(g.seed + 99)); world.scene.add(lawn.group);
    const dress = dressGarden(world, g, ox, oz, cfg, d), lane = lanePiece(world, 0, oz, oz - LANE_M);
    const s = { n, g, ox, oz, lawn, dress, lane, gateOpen: false, gateT: 0, stars: 0 };
    S.slots.set(n, s); return s;
  }
  function drop(n) { const s = S.slots.get(n); if (!s) return; world.scene.remove(s.lawn.group, s.lane); s.lawn.dispose(); s.dress.dispose(); s.lane.geometry.dispose(); S.slots.delete(n); }

  const buzzy = buildBuzzy(world, { paint: S.save.use.paint }); world.scene.add(buzzy.group);
  const deckW = () => L.upValue(cfg, 'deck', S.save.up.deck), topSpeed = () => L.upValue(cfg, 'engine', S.save.up.engine) * (S.flow.v >= 1 ? cfg.flow.speedMul : 1);
  function enter(n, atStart) {
    S.cur = n; const s = slot(n);
    if (atStart) { S.kart.x = s.ox + s.g.start.x; S.kart.z = s.oz + s.g.start.z; S.kart.ang = 0; }
    world.setDistrict(L.districtOf(n), 1); buzzy.setDeck(deckW());
    for (const k of [...S.slots.keys()]) if (k < n - 1 || k > n + 1) drop(k);
  }
  enter(S.save.cur, true);
  world.follow(S.kart.x, S.kart.z, 0, 0, camDist(), 0, true);
  function camDist() { const s = S.slots.get(S.cur), k = clamp((s.g.w - 8) / 20, 0, 1); return cfg.camera.dist[0] + (cfg.camera.dist[1] - cfg.camera.dist[0]) * k; }

  // ---- input: a floating one-thumb stick anywhere on the screen, or the arrow keys / WASD
  const K = cfg.kart, unit = () => root.clientWidth / 720 * (root.clientWidth > root.clientHeight ? 0.6 : 1);
  if (play) {
    on(canvas, 'pointerdown', (e) => { if (S.stick.on) return; S.stick.on = true; S.stick.id = e.pointerId; S.stick.ox = e.clientX; S.stick.oy = e.clientY; S.stick.mag = 0; try { canvas.setPointerCapture(e.pointerId); } catch (er) { /* synthetic pointer */ } });
    on(canvas, 'pointermove', (e) => {
      if (!S.stick.on || e.pointerId !== S.stick.id) return;
      const u = unit(); let dx = e.clientX - S.stick.ox, dy = e.clientY - S.stick.oy; const len = Math.hypot(dx, dy), drift = K.stickDriftPx * u;
      if (len > drift) { S.stick.ox += dx / len * (len - drift); S.stick.oy += dy / len * (len - drift); dx = e.clientX - S.stick.ox; dy = e.clientY - S.stick.oy; } // the base follows a long drag
      const l2 = Math.hypot(dx, dy); S.stick.mag = l2 < K.stickDeadPx * u ? 0 : clamp(l2 / (K.stickFullPx * u), 0, 1); S.stick.dx = l2 ? dx / l2 : 0; S.stick.dz = l2 ? dy / l2 : 0;
    });
    const up = (e) => { if (e.pointerId === S.stick.id) { S.stick.on = false; S.stick.mag = 0; } };
    on(canvas, 'pointerup', up); on(canvas, 'pointercancel', up);
    on(window, 'keydown', (e) => { S.keys[e.code] = true; }); on(window, 'keyup', (e) => { S.keys[e.code] = false; }); on(window, 'blur', () => { S.keys = {}; S.stick.on = false; S.stick.mag = 0; });
  }
  function wish() {
    let dx = S.stick.dx * S.stick.mag, dz = S.stick.dz * S.stick.mag; const k = S.keys;
    const kx = (k.ArrowRight || k.KeyD ? 1 : 0) - (k.ArrowLeft || k.KeyA ? 1 : 0), kz = (k.ArrowDown || k.KeyS ? 1 : 0) - (k.ArrowUp || k.KeyW ? 1 : 0);
    if (kx || kz) { const l = Math.hypot(kx, kz); dx = kx / l; dz = kz / l; }
    if (S.auto) { dx = S.auto.dx; dz = S.auto.dz; }
    return [dx, dz];
  }

  // ---- one step of the game
  function step(dt) {
    S.t += dt; const kt = S.kart, s = S.slots.get(S.cur), g = s.g;
    const [wx, wz] = wish(), wm = Math.hypot(wx, wz), top = topSpeed();
    const ka = 1 - Math.exp(-dt / (wm > 0.01 ? K.accelS : K.stopS) * 3);
    kt.vx += (wx * top - kt.vx) * ka; kt.vz += (wz * top - kt.vz) * ka; kt.speed = Math.hypot(kt.vx, kt.vz);
    let turn = 0;
    if (wm > 0.05) { const want = Math.atan2(-wx, -wz); let da = want - kt.ang; da = Math.atan2(Math.sin(da), Math.cos(da)); const st = clamp(da, -K.turnRate * dt, K.turnRate * dt); kt.ang += st; turn = clamp(da * 1.5, -1, 1); }
    kt.turn += (turn - kt.turn) * Math.min(1, dt * 10);
    // move in the garden's own coordinates; the lane outside is a corridor as wide as the gate
    const lx0 = kt.x - s.ox, lz0 = kt.z - s.oz; let r = L.slide(g, lx0, lz0, kt.vx * dt, kt.vz * dt, K.radiusM, s.gateOpen), lx = r.x, lz = r.z;
    if (lz < K.radiusM || lz > g.d - K.radiusM) lx = clamp(lx, g.w / 2 - LANE_HALF_W, g.w / 2 + LANE_HALF_W);
    const last = S.cur === cfg.gardens.length - 1; lz = clamp(lz, last ? -LANE_M / 2 : -LANE_M, g.d + (S.cur === 0 ? 2.2 : LANE_M));
    if (r.hit) { kt.vx *= 0.6; kt.vz *= 0.6; }
    kt.x = s.ox + lx; kt.z = s.oz + lz;
    // cut
    S.fresh = 0;
    if (kt.speed > 0.15 && lz > -1 && lz < g.d + 1) {
      const c = L.cutSweep(cfg, g, lx0, lz0, lx, lz, kt.ang, deckW());
      if (c.cut > 0) { s.lawn.dirty(); S.fresh = c.cut; S.save.m2 += c.cut * g.cell * g.cell; }
    }
    S.cutting += ((S.fresh > 0 ? 1 : 0) - S.cutting) * Math.min(1, dt * 8);
    L.flowStep(cfg, S.flow, S.fresh > 0, dt);
    if (!s.gateOpen && L.coverage(g) >= cfg.stars[0]) s.gateOpen = true;
    if (s.gateOpen && s.gateT < 1) { s.gateT = Math.min(1, s.gateT + dt / 0.8); const e = s.gateT, o = 1 - Math.pow(1 - e, 3) + Math.sin(e * Math.PI) * 0.12; s.dress.gate.set(o); if (!last) slot(S.cur + 1); }
    // into the next garden (or back into the one before) once past the middle of the lane
    if (!last && lz < -LANE_M / 2) enter(S.cur + 1, false); else if (S.cur > 0 && lz > g.d + LANE_M / 2) enter(S.cur - 1, false);
  }

  // ---- frame
  let raf = 0, prev = 0;
  function frame(now) {
    if (dead.v) return; raf = requestAnimationFrame(frame);
    const raw = prev ? (now - prev) / 1000 : 0.016; prev = now; const dt = clamp(raw, 0, 0.05);
    const w = root.clientWidth, h = root.clientHeight; if (w < 2 || h < 2) return; world.resize(w, h);
    if (play || S.auto) step(dt); else S.t += dt;
    const kt = S.kart; buzzy.group.position.set(kt.x, 0, kt.z); buzzy.group.rotation.y = kt.ang;
    buzzy.update(dt, S.t, { speed: kt.speed, turn: kt.turn, cutting: S.cutting, flow: S.flow.v });
    for (const s of S.slots.values()) s.lawn.update(S.t, kt.x, kt.z, clamp(kt.speed / 2, 0.35, 1));
    const top = topSpeed();
    // dev:start
    if (S.camHold) { const c = S.camHold; world.placeCamera(c.x, c.z, c.dist, c.pitch, c.yaw || 0, c.lift || 0); } else
    // dev:end
    world.follow(kt.x, kt.z, kt.vx / top, kt.vz / top, camDist() * (1 + cfg.camera.flowPull * (S.flow.v >= 1 ? 1 : 0)), dt, false);
    world.render(dt);
    // adaptive quality: step down after a slow stretch, up after a long smooth one
    S.ms += (raw * 1000 - S.ms) * 0.05; S.frames++; world.smoothFrame(raw < 0.03);
    const Q = cfg.quality, bud = Q.budgetMs[world.tier];
    if (S.frames > 20) { if (S.ms > bud) { S.slow += raw; S.fast = 0; } else { S.fast += raw; S.slow = Math.max(0, S.slow - raw); } }
    if (S.slow > Q.downAfterS && world.tier > 0) { setTier(world.tier - 1); S.slow = 0; } else if (S.fast > Q.upAfterS && world.tier < 2 && S.ms < Q.budgetMs[world.tier + 1] * 0.7 && !S.noUp) { setTier(world.tier + 1); S.fast = 0; }
    if (S.frames === 2) { root.classList.add('live'); S.firstFrameMs = performance.now(); }
  }
  function setTier(k) { if (k < world.tier) S.noUp = (S.downs = (S.downs || 0) + 1) > 1; world.setTier(k); for (const s of S.slots.values()) s.lawn.setTier(k); }
  raf = requestAnimationFrame(frame);

  const api = {
    destroy() { dead.v = true; cancelAnimationFrame(raf); for (const f of offs) f(); for (const k of [...S.slots.keys()]) drop(k); world.destroy(); if (window.__mm === api) window.__mm = null; },
  };
  // dev:start
  window.__game = { S, cfg, world, L, step, setTier, buzzy, slot: () => S.slots.get(S.cur) };
  // dev:end
  window.__mm = api;
  return api;
}

window.run = run;

// Outside Astrocade (?local): stand in for the host, read the config file and start.
if (typeof location !== 'undefined' && new URLSearchParams(location.search).has('local') && !window.lib) {
  const none = async () => ({});
  const store = { state: window.__seedSave || null }; window.__store = store;
  window.lib = { showGameParameters() {}, log() {}, getUserGameState: async () => ({ state: store.state }), saveUserGameState: async (s) => { store.state = JSON.parse(JSON.stringify(s)); }, addPlayerScoreToLeaderboard: none, getTopNEntriesFromLeaderboard: none,
    shouldUseTouchControls: () => matchMedia('(pointer: coarse)').matches, share: async (o) => { (window.__shares = window.__shares || []).push(o); }, haptics: { play() {}, start() {}, stop() {} }, getAsset: () => undefined };
  fetch('./game_config.json').then((r) => r.json()).then((c) => { window.gameConfig = c; run(new URLSearchParams(location.search).get('mode') || 'play'); });
}
