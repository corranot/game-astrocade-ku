// PROTOTYPE - NOT FOR PRODUCTION
// Toy City Stomp — 3D monster destruction game for kids (look test slice).
// Bonbon, a giant gummy dino, walks through a toy-block city with one finger: whatever it bumps breaks.
// Blocks fly off, small houses pancake, towers topple like dominoes, cars squash flat and pop back, toy residents
// float away on balloons. Points fill the grow bar; Bonbon grows 8 stages and can then break bigger buildings.
// Flatten the whole city for stars and coins. Modules: bonbon.js (the monster), city.js (blocks, cars, particles).
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.187.0/build/three.module.js';
import { createCity } from './city.js';
import { createBonbon } from './bonbon.js';

const LANGS = ['en', 'ar', 'es', 'vi', 'hi', 'bn', 'id'];
const W = 720, H = 1280;

/** Seeded random in [0, 1). */
function mulberry32(a) { return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

/** The device language among the 7 supported, else English. */
export function detectLang(list = (typeof navigator !== 'undefined' && (navigator.languages || [navigator.language])) || []) {
  for (const l of list) { const k = String(l || '').slice(0, 2).toLowerCase(); if (LANGS.includes(k)) return k; }
  return 'en';
}

/** Points to reach the next stage from stage s (1-based). */
export function xpFor(s, g) { return Math.round(g.base * Math.pow(g.ratio, s - 1)); }
/** Combo multiplier for n hits in the window. */
export function comboMult(n, c) { return Math.min(c.max, 1 + Math.floor(n / c.every)); }
/** Stars for a finish time in seconds. */
export function starsFor(sec, limits) { return sec <= limits[0] ? 3 : sec <= limits[1] ? 2 : 1; }

const buzz = (kind) => { try { lib.haptics.play(kind); } catch (e) { /* no vibration here */ } };

// ---------------------------------------------------------------- sound (synthesised, no files)
const Sound = (() => {
  let ctx = null, master = null, muted = false;
  const ensure = () => {
    if (ctx) return ctx;
    try { ctx = new (window.AudioContext || window.webkitAudioContext)(); master = ctx.createGain(); master.gain.value = 0.55; master.connect(ctx.destination); } catch (e) { ctx = null; }
    return ctx;
  };
  const noise = (dur) => { const b = ctx.createBuffer(1, Math.max(1, ctx.sampleRate * dur), ctx.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; return b; };
  let noiseBuf = null;
  const env = (node, t, a, peak, dec) => { node.gain.setValueAtTime(0.0001, t); node.gain.exponentialRampToValueAtTime(peak, t + a); node.gain.exponentialRampToValueAtTime(0.0001, t + a + dec); };
  function tone(type, f0, f1, dur, vol, at = 0) {
    if (!ctx || muted) return; const t = ctx.currentTime + at, o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    env(g, t, 0.005, vol, dur); o.connect(g).connect(master); o.start(t); o.stop(t + dur + 0.05);
  }
  function crash(dur, cutoff, vol, at = 0) {
    if (!ctx || muted) return; const t = ctx.currentTime + at;
    noiseBuf = noiseBuf || noise(1.5);
    const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noiseBuf; f.type = 'lowpass'; f.frequency.setValueAtTime(cutoff, t); f.frequency.exponentialRampToValueAtTime(cutoff * 0.25, t + dur);
    env(g, t, 0.004, vol, dur); s.connect(f).connect(g).connect(master); s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.05);
  }
  return {
    unlock() { if (ensure() && ctx.state === 'suspended') ctx.resume(); },
    setMuted(m) { muted = m; },
    get muted() { return muted; },
    bite(size) { crash(0.18 + size * 0.04, 2200 - size * 200, 0.35); tone('triangle', 220 - size * 20, 90, 0.12, 0.25); },
    collapse(k) { crash(0.5 + k * 0.15, 1400 - k * 150, 0.6); tone('sine', 120 - k * 12, 40, 0.5 + k * 0.1, 0.5); },
    land() { crash(0.9, 900, 0.8); tone('sine', 70, 30, 0.9, 0.7); },
    squash() { tone('square', 520, 180, 0.12, 0.18); tone('sine', 300, 600, 0.15, 0.2, 0.1); },
    boing() { tone('sine', 180, 420, 0.25, 0.35); },
    coin(n) { tone('square', 988 + n * 40, 988 + n * 40, 0.06, 0.08); tone('square', 1318 + n * 40, 1318 + n * 40, 0.1, 0.08, 0.06); },
    combo(n) { tone('triangle', 440 * Math.pow(2, Math.min(n, 12) / 12), 660 * Math.pow(2, Math.min(n, 12) / 12), 0.12, 0.2); },
    roar(stage) { const f = 260 - stage * 18; tone('sawtooth', f, f * 0.55, 0.9, 0.25); tone('square', f * 0.5, f * 0.3, 0.9, 0.15); crash(0.8, 600, 0.3); },
    step(stage) { tone('sine', 90 - stage * 6, 45, 0.12, 0.12 + stage * 0.02); },
    win() { [523, 659, 784, 1046].forEach((f, i) => tone('triangle', f, f, 0.25, 0.25, i * 0.12)); },
    pop() { tone('sine', 700, 1200, 0.08, 0.15); },
  };
})();

// ---------------------------------------------------------------- the game
let app = null; // one running game per page

function run(mode) {
  if (app) app.destroy();
  app = startGame(mode === 'edit' ? 'edit' : 'play');
  window.__game = app.debug;
}

function startGame(mode) {
  const cfg = window.gameConfig || {};
  const root = document.getElementById('app') || document.body;
  root.innerHTML = '';
  const isTouch = (() => { try { return lib.shouldUseTouchControls(); } catch (e) { return matchMedia('(pointer: coarse)').matches; } })();
  const params = new URLSearchParams(location.search);

  // quality tier: 0 low .. 3 high; chosen from the device, then adjusted live from frame times
  const cores = navigator.hardwareConcurrency || 4, memory = navigator.deviceMemory || 4;
  let tier = params.has('tier') ? +params.get('tier') : isTouch ? (cores >= 8 && memory >= 6 ? 2 : 1) : 3;
  const tiers = [
    { dpr: 0.75, shadow: 0, shadowsOnBlocks: false, rubble: 700, dust: 40, confetti: 80 },
    { dpr: 1.0, shadow: 1024, shadowsOnBlocks: false, rubble: 1200, dust: 70, confetti: 140 },
    { dpr: 1.25, shadow: 1024, shadowsOnBlocks: true, rubble: 2000, dust: 100, confetti: 200 },
    { dpr: 1.75, shadow: 2048, shadowsOnBlocks: true, rubble: 3000, dust: 120, confetti: 260 },
  ];
  const quality = tiers[tier];

  // ---------- renderer and scene
  const canvas = document.createElement('canvas'); canvas.id = 'scene'; root.appendChild(canvas);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: tier >= 2, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, quality.dpr));
  renderer.shadowMap.enabled = quality.shadow > 0; renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.15;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xbfe8ff); scene.fog = new THREE.Fog(0xbfe8ff, 70, 190);
  const camera = new THREE.PerspectiveCamera(52, W / H, 0.5, 400);
  scene.add(new THREE.HemisphereLight(0xeaf6ff, 0xffd9a8, 1.6));
  const sun = new THREE.DirectionalLight(0xfff4e0, 2.2);
  sun.castShadow = quality.shadow > 0;
  if (sun.castShadow) { sun.shadow.mapSize.set(quality.shadow, quality.shadow); sun.shadow.bias = -0.0008; sun.shadow.normalBias = 0.04; }
  scene.add(sun, sun.target);

  function resize() {
    const r = root.getBoundingClientRect();
    const w = Math.max(1, r.width), h = Math.max(1, r.height);
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
    root.style.setProperty('--u', (w / W).toString());
  }

  // ---------- language
  const STR = cfg.strings || {};
  let lang = detectLang();
  const T = (k) => (STR[lang] && STR[lang][k]) || (STR.en && STR.en[k]) || k;

  // ---------- HUD
  const hud = document.createElement('div'); hud.className = 'hud'; root.appendChild(hud);
  hud.innerHTML = `
    <div class="top">
      <div class="coins"><span class="coin-ico"></span><b id="coins">0</b></div>
      <div class="grow"><div class="stage" id="stage">1</div><div class="bar"><i id="bar"></i></div></div>
      <button class="icon" id="lang" aria-label="Language">🌐</button>
      <button class="icon" id="mute" aria-label="Sound">🔊</button>
    </div>
    <div class="combo" id="combo"></div>
    <div class="banner" id="banner"></div>
    <div class="pops" id="pops"></div>
    <div class="hint" id="hint"><div class="hand">👆</div><div class="hint-t" id="hintT"></div></div>
    <button class="skill" id="skill" hidden><span class="ring" id="ring"></span><span class="sk-ico">🌀</span></button>
    <div class="result" id="result" hidden></div>
    <div class="langs" id="langs" hidden></div>`;
  const $ = (id) => hud.querySelector('#' + id);
  const setDir = () => { hud.dir = lang === 'ar' ? 'rtl' : 'ltr'; $('hintT').textContent = T('swipe'); };
  setDir();

  function pop(text, x, y, color = '#ff5fa2', size = 1) {
    const el = document.createElement('div'); el.className = 'pop'; el.textContent = text;
    el.style.left = (x * 100) + '%'; el.style.top = (y * 100) + '%'; el.style.color = color; el.style.setProperty('--s', size);
    el.style.setProperty('--r', ((Math.random() - 0.5) * 16).toFixed(1) + 'deg');
    $('pops').appendChild(el); setTimeout(() => el.remove(), 1100);
  }
  const screenOf = (x, y, z) => { const v = new THREE.Vector3(x, y, z).project(camera); return [(v.x + 1) / 2, (1 - v.y) / 2]; };
  let bannerT = 0;
  function banner(text, sec = 1.4) { const b = $('banner'); b.textContent = text; b.classList.remove('show'); void b.offsetWidth; b.classList.add('show'); bannerT = sec; }
  function flyCoins(x, y, n) {
    for (let i = 0; i < Math.min(n, 6); i++) {
      const c = document.createElement('div'); c.className = 'flycoin'; c.style.left = x * 100 + '%'; c.style.top = y * 100 + '%';
      c.style.animationDelay = (i * 0.05) + 's'; $('pops').appendChild(c); setTimeout(() => c.remove(), 900 + i * 50);
    }
  }

  // ---------- state
  const G = cfg.growth, MC = cfg.monster, CB = cfg.combo, PT = cfg.points, FX = cfg.fx;
  let rng, city, bon, S;
  bon = createBonbon(); scene.add(bon.root);

  function newRound() {
    if (city) city.dispose();
    rng = mulberry32(cfg.seed || 1);
    city = createCity(scene, cfg, rng, quality);
    const half = city.half;
    S = {
      x: 0, z: half - 4, yaw: Math.PI, stage: 1, xp: 0, points: 0, coins: 0, combo: 0, comboT: 0, bestCombo: 0,
      time: 0, attackT: 0, tooBigT: 0, slowT: 0, hitstopT: 0, trauma: 0, finished: false, idle: 0, touched: false,
      skillCd: 0, spinT: 0, sweepT: 0, moving: false, speed: 0, chainShown: 0, stepT: 0, scale: G.baseScale, scaleTarget: G.baseScale,
    };
    bon.setStage(1); bon.root.position.set(S.x, 0, S.z); bon.root.scale.setScalar(G.baseScale); bon.resetTail();
    $('result').hidden = true; $('skill').hidden = true; $('hint').hidden = mode !== 'play';
    camPos.set(S.x + 7, 19, S.z + 17); camLook.set(S.x, 1.2, S.z - 3.5);
    updateHud();
  }

  const save = { best: null, coins: 0, bestCombo: 0, lang: null };
  let saveRead = false;
  const persist = () => { if (mode === 'play' && saveRead) Promise.resolve().then(() => lib.saveUserGameState({ ...save })).catch(() => {}); };

  function updateHud() {
    $('coins').textContent = save.coins + S.coins;
    $('stage').textContent = S.stage;
    const need = S.stage >= G.stages ? 1 : xpFor(S.stage, G);
    $('bar').style.width = (S.stage >= G.stages ? 100 : Math.min(100, S.xp / need * 100)) + '%';
    const cb = $('combo');
    if (S.combo >= CB.every) { cb.textContent = T('combo') + ' ×' + comboMult(S.combo, CB); cb.classList.add('on'); } else cb.classList.remove('on');
  }

  /** Adds points with the combo multiplier; fills the grow bar. Returns points given. */
  function score(base, x, y, z, label) {
    const m = comboMult(S.combo, CB), p = Math.round(base * m);
    S.points += p; S.xp += base; // the grow bar fills from base points, so a long combo does not end the round early
    S.coins = Math.floor(S.points * cfg.coinsPerPoint);
    if (label !== undefined) { const [sx, sy] = screenOf(x, y, z); pop((label ? label + ' ' : '') + '+' + p, sx, sy, m > 1 ? '#ff5fa2' : '#2a2140', label ? 1.15 : 0.8); }
    while (S.stage < G.stages && S.xp >= xpFor(S.stage, G)) { S.xp -= xpFor(S.stage, G); grow(); }
    updateHud();
    return p;
  }
  /** A bite only keeps the combo alive; a building down, a car squashed or a tree popped adds to it. */
  function hitCombo(counts = true) {
    S.comboT = CB.windowSec; if (!counts) return;
    S.combo++; S.bestCombo = Math.max(S.bestCombo, S.combo);
    if (S.combo >= CB.every && S.combo % CB.every === 0) { Sound.combo(S.combo / CB.every); const c = $('combo'); c.classList.remove('bump'); void c.offsetWidth; c.classList.add('bump'); }
  }
  function grow() {
    S.stage++; S.scaleTarget = G.baseScale * Math.pow(G.scaleRatio, S.stage - 1);
    S.slowT = FX.slowmoSec; S.trauma = Math.min(1, S.trauma + 0.8);
    bon.setStage(S.stage); bon.roar(); Sound.roar(S.stage); buzz('success');
    banner(T('grow'));
    // shock ring: small things nearby go flat
    city.crushTrees(S.x, S.z, 4 * S.scaleTarget);
    for (const c of city.squashCars(S.x, S.z, 4 * S.scaleTarget)) score(PT.car, c.x, 1, c.z, '');
    for (let k = 0; k < 10; k++) city.puff(S.x + Math.cos(k) * 3 * S.scaleTarget, 0.6, S.z + Math.sin(k) * 3 * S.scaleTarget, 2);
    if (S.stage === cfg.skill.unlockStage) { setTimeout(() => { if (!S.finished) { banner(T('newMove'), 1.6); $('skill').hidden = false; } }, 900); }
  }

  // ---------- input: one finger anywhere steers; keyboard on desktop
  const input = { active: false, sx: 0, sy: 0, dx: 0, dy: 0, keys: new Set() };
  const onDown = (e) => {
    if (e.target.closest && e.target.closest('button, .result, .langs')) return;
    Sound.unlock(); input.active = true; input.sx = e.clientX; input.sy = e.clientY; input.dx = input.dy = 0;
    S.touched = true; $('hint').hidden = true; S.idle = 0;
  };
  const onMove = (e) => { if (!input.active) return; input.dx = e.clientX - input.sx; input.dy = e.clientY - input.sy; const l = Math.hypot(input.dx, input.dy), max = 70; if (l > max) { input.sx += input.dx * (1 - max / l); input.sy += input.dy * (1 - max / l); input.dx *= max / l; input.dy *= max / l; } };
  const onUp = () => { input.active = false; input.dx = input.dy = 0; };
  const onKey = (e) => {
    const k = e.key.toLowerCase();
    if (e.type === 'keydown') { input.keys.add(k); Sound.unlock(); if (S) { S.touched = true; $('hint').hidden = true; S.idle = 0; } if (k === ' ' ) useSkill(); } else input.keys.delete(k);
  };
  canvas.addEventListener('pointerdown', onDown); hud.addEventListener('pointerdown', onDown);
  window.addEventListener('pointermove', onMove); window.addEventListener('pointerup', onUp); window.addEventListener('pointercancel', onUp);
  window.addEventListener('keydown', onKey); window.addEventListener('keyup', onKey);

  $('mute').onclick = () => { Sound.setMuted(!Sound.muted); $('mute').textContent = Sound.muted ? '🔇' : '🔊'; };
  $('lang').onclick = () => {
    const box = $('langs'); box.hidden = !box.hidden;
    box.innerHTML = LANGS.map((l) => `<button data-l="${l}" class="${l === lang ? 'on' : ''}">${(STR[l] && STR[l].swipe) ? l.toUpperCase() : l}</button>`).join('');
    box.querySelectorAll('button').forEach((b) => b.onclick = () => { lang = save.lang = b.dataset.l; setDir(); box.hidden = true; persist(); });
  };
  $('skill').onclick = () => { Sound.unlock(); useSkill(); };

  function useSkill() {
    if (!S || S.finished || S.stage < cfg.skill.unlockStage || S.skillCd > 0) return;
    S.skillCd = cfg.skill.cooldownSec; S.spinT = 0.55; bon.stomp(1.4); buzz('thud'); Sound.collapse(2);
    S.trauma = Math.min(1, S.trauma + 0.5);
    const r = cfg.skill.radius * S.scale;
    for (const h of city.touching(S.x, S.z, r)) {
      const dir = new THREE.Vector3(h.px - S.x, 0, h.pz - S.z).normalize();
      if (h.b.k > S.stage + 1) continue;
      const n = city.bite(h.b, new THREE.Vector3(h.px, Math.min(h.b.h - 0.5, 1.5 * S.scale), h.pz), 2.2 * S.scale, dir, 1.6);
      if (n) { hitCombo(false); score(n * PT.perVoxel, h.px, 2, h.pz); }
    }
    for (const c of city.squashCars(S.x, S.z, r)) { hitCombo(); score(PT.car, c.x, 1, c.z, T('squash')); }
    city.crushTrees(S.x, S.z, r);
    for (let k = 0; k < 12; k++) city.puff(S.x + Math.cos(k / 2) * r * 0.8, 0.5, S.z + Math.sin(k / 2) * r * 0.8, 1.5);
  }

  // ---------- rules per frame
  const fwd = new THREE.Vector3(), tmp = new THREE.Vector3(), camPos = new THREE.Vector3(), camLook = new THREE.Vector3();
  let target = null, lookAt = null;

  function steer(dt) {
    let ix = input.dx / 70, iz = input.dy / 70;
    const k = input.keys;
    if (k.has('a') || k.has('arrowleft')) ix -= 1; if (k.has('d') || k.has('arrowright')) ix += 1;
    if (k.has('w') || k.has('arrowup')) iz -= 1; if (k.has('s') || k.has('arrowdown')) iz += 1;
    let mag = Math.min(1, Math.hypot(ix, iz));
    if (mag < 0.12) mag = 0;
    if (mag) S.idle = 0; else S.idle += dt;
    // nobody steering: walk to the nearest building Bonbon can break (the game plays itself behind the Play card)
    if (!mag && (S.idle > cfg.idleAutoplaySec || !S.touched)) {
      if (!target || target.state !== 'intact') target = city.nearest(S.x, S.z, (b) => b.k <= S.stage + 1);
      if (target) { ix = target.cx - S.x; iz = target.cz - S.z; const l = Math.hypot(ix, iz) || 1; ix /= l; iz /= l; mag = 0.75; if (S.touched && !S.finished) $('hint').hidden = false; }
    } else target = null;
    S.moving = mag > 0;
    const speed = (MC.speed * (1 + MC.speedPerStage * (S.stage - 1))) * Math.sqrt(S.scale) * mag;
    S.speed = speed;
    if (mag) {
      const l = Math.hypot(ix, iz); fwd.set(ix / l, 0, iz / l);
      const want = Math.atan2(fwd.x, fwd.z);
      let d = want - S.yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); S.yaw += d * Math.min(1, dt * 10);
      S.x += fwd.x * speed * dt; S.z += fwd.z * speed * dt;
      S.stepT -= dt * (speed / Math.max(1, S.scale)); if (S.stepT <= 0) { S.stepT = 0.42; Sound.step(S.stage); if (S.stage >= 4) S.trauma = Math.min(1, S.trauma + 0.04 * S.stage); }
    }
    const lim = city.half + 2; S.x = THREE.MathUtils.clamp(S.x, -lim, lim); S.z = THREE.MathUtils.clamp(S.z, -lim, lim);
  }

  function contact(dt) {
    const R = MC.radius * S.scale;
    S.attackT -= dt; S.tooBigT -= dt;
    lookAt = null;
    const touching = city.touching(S.x, S.z, R);
    for (const h of touching) {
      const b = h.b;
      const nx = (S.x - h.px) / (h.d || 1), nz = (S.z - h.pz) / (h.d || 1);
      // crush small houses underfoot once big enough
      if (b.k <= S.stage - 2) { city.collapse(b, new THREE.Vector3(-nx, 0, -nz), 0); continue; }
      S.x += nx * (R - h.d); S.z += nz * (R - h.d); // stay outside the walls
      lookAt = tmp.set(h.px, Math.min(b.h, 2 * S.scale), h.pz).clone();
      if (b.k > S.stage + 1) {
        if (S.tooBigT <= 0) {
          S.tooBigT = 1.2; S.x += nx * 1.2 * S.scale; S.z += nz * 1.2 * S.scale; bon.face('surprised', 0.8); bon.stomp(0.6); Sound.boing(); buzz('tap');
          const [sx, sy] = screenOf(h.px, Math.min(b.h, 4), h.pz); pop(T('tooBig'), sx, sy, '#3fa9ff', 1.05);
        }
        continue;
      }
      if (S.attackT <= 0) {
        S.attackT = MC.attackSec; bon.stomp(1); bon.face('angry', 0.5);
        const dir = new THREE.Vector3(-nx, 0, -nz);
        const p = new THREE.Vector3(h.px - nx * 0.6, THREE.MathUtils.clamp(1.3 * S.scale, 0.6, b.h - 0.5), h.pz - nz * 0.6);
        const n = city.bite(b, p, MC.biteRadius * Math.pow(S.scale, 0.85), dir);
        if (n) {
          hitCombo(false); score(n * PT.perVoxel, p.x, p.y + 1, p.z, S.combo === 1 && !S.firstBonk ? T('bonk') : undefined); S.firstBonk = true;
          S.trauma = Math.min(1, S.trauma + 0.18 + b.k * 0.03); S.hitstopT = FX.hitstopSec * 0.6; Sound.bite(b.k); buzz('tap');
        }
      }
    }
    // cars and trees under the feet
    for (const c of city.squashCars(S.x, S.z, R * 0.9)) { hitCombo(); score(PT.car, c.x, 1, c.z, T('squash')); Sound.squash(); buzz('tap'); city.puff(c.x, 0.5, c.z, 1); }
    const t = city.crushTrees(S.x, S.z, R * 0.8); if (t) { hitCombo(); score(PT.tree * t, S.x, 1, S.z); Sound.pop(); }
  }

  function drainEvents() {
    for (const e of city.events.splice(0)) {
      if (e.type === 'collapse') {
        hitCombo();
        const label = e.chain > 0 ? T('domino') + ' ×' + (e.chain + 1) : '';
        score(PT.perClass * e.b.k * e.b.k, e.x, Math.min(e.b.h, 8), e.z, label);
        Sound.collapse(e.b.k); S.trauma = Math.min(1, S.trauma + 0.25 + e.b.k * 0.08); S.hitstopT = FX.hitstopSec; buzz(e.b.k >= 3 ? 'thud' : 'tap');
        const [sx, sy] = screenOf(e.x, 2, e.z); flyCoins(sx, sy, e.b.k + 1); setTimeout(() => Sound.coin(e.b.k), 300);
        if (e.chain > 0) { bon.face('win', 1); if (e.chain + 1 > S.chainShown) { S.chainShown = e.chain + 1; banner(T('domino') + ' ×' + (e.chain + 1) + '!', 1.2); } }
      } else if (e.type === 'land') {
        Sound.land(); S.trauma = 1; buzz('thud'); S.slowT = Math.max(S.slowT, e.hits ? 0.6 : 0.25);
        city.burstConfetti(e.x, 3, e.z, 16);
      }
    }
  }

  function sweep(dt) {
    // the last few buildings come down by themselves, so nobody hunts for a missed shed
    const left = city.intactLeft(), total = city.buildings.length;
    if (left > 0 && left / total < 0.12) {
      S.sweepT -= dt;
      if (S.sweepT <= 0) { S.sweepT = 0.45; const b = city.nearest(S.x, S.z); if (b) city.collapse(b, new THREE.Vector3(b.cx - S.x, 0, b.cz - S.z).normalize(), 0); }
    }
    if (left === 0 && !city.buildings.some((b) => b.state === 'toppling') && !S.finished) finish();
  }

  function finish() {
    S.finished = true; $('hint').hidden = true; bon.face('win', 99); S.yaw = Math.atan2(camera.position.x - S.x, camera.position.z - S.z); Sound.win(); buzz('success');
    city.burstConfetti(S.x, 6 * S.scale, S.z, 60);
    const sec = Math.round(S.time), stars = starsFor(sec, cfg.starsTimeSec);
    const isBest = save.best === null || sec < save.best;
    if (isBest) save.best = sec;
    save.coins += S.coins; save.bestCombo = Math.max(save.bestCombo, S.bestCombo); persist();
    try { lib.addPlayerScoreToLeaderboard(S.points); } catch (e) { /* no board here */ }
    const r = $('result');
    const mmss = Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0');
    r.innerHTML = `<div class="card">
      <h2>${T('flat')}</h2>
      <div class="stars">${[1, 2, 3].map((i) => `<span class="${i <= stars ? 'on' : ''}" style="animation-delay:${0.3 + i * 0.25}s">★</span>`).join('')}</div>
      <dl><dt>${T('time')}</dt><dd>${mmss}</dd><dt>${T('bestCombo')}</dt><dd>×${comboMult(S.bestCombo, CB)}</dd><dt>🪙</dt><dd>+${S.coins}</dd></dl>
      ${isBest ? `<div class="best">${T('best')}</div>` : ''}
    </div>
    <button class="again" id="again">${T('again')}</button>`;
    setTimeout(() => { r.hidden = false; r.querySelector('#again').onclick = () => { Sound.unlock(); newRound(); }; }, 1600);
  }

  function updateCamera(dt) {
    S.scale += (S.scaleTarget - S.scale) * Math.min(1, dt * 3);
    bon.root.scale.setScalar(S.scale);
    const z = 0.55 + 0.45 * S.scale;
    const want = tmp.set(S.x + 7 * z, 19 * z, S.z + 17 * z);
    camPos.lerp(want, Math.min(1, dt * 3));
    camLook.lerp(new THREE.Vector3(S.x, 1.2 * S.scale, S.z - 3.5 * z), Math.min(1, dt * 5));
    S.trauma = Math.max(0, S.trauma - dt * 1.6);
    const sh = S.trauma * S.trauma * FX.shakeMax, tt = performance.now() / 1000;
    camera.position.copy(camPos).add(tmp.set(Math.sin(tt * 47) * sh * 0.6 * z, Math.sin(tt * 39 + 1) * sh * 0.5 * z, Math.sin(tt * 43 + 2) * sh * 0.4 * z));
    camera.lookAt(camLook);
    camera.rotation.z += Math.sin(tt * 31) * sh * 0.02;
    city.setXray(camera.position, tmp.set(S.x, 1.4 * S.scale, S.z), 2.2 * S.scale);
    // shadows follow Bonbon
    const span = 22 * z;
    sun.position.set(S.x + 18 * z, 34 * z, S.z + 12 * z); sun.target.position.set(S.x, 0, S.z - 4 * z);
    if (sun.castShadow) { const c = sun.shadow.camera; c.left = c.bottom = -span; c.right = c.top = span; c.far = 120 * z; c.updateProjectionMatrix(); }
  }

  // ---------- live quality: drop a tier when frames are slow, never below 0
  const frameTimes = [];
  let qualityT = 0;
  function adaptQuality(rawDt) {
    frameTimes.push(rawDt); if (frameTimes.length > 90) frameTimes.shift();
    qualityT += rawDt; if (qualityT < 1.5 || frameTimes.length < 60) return;
    qualityT = 0;
    const med = [...frameTimes].sort((a, b) => a - b)[frameTimes.length >> 1];
    if (med > 1 / 42 && tier > 0) {
      tier--; renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, tiers[tier].dpr));
      if (tier < 2) city.meshes.blocks.castShadow = false;
      if (tier === 0) { sun.castShadow = false; renderer.shadowMap.enabled = false; }
      frameTimes.length = 0;
    }
  }

  // ---------- loop
  let last = performance.now(), raf = 0, alive = true, fps = 0;
  const SIM = Math.max(1, Math.min(8, +(params.get('speed') || 1))); // test runs only: more steps per frame
  function frame(now) {
    if (!alive) return;
    raf = requestAnimationFrame(frame);
    const raw = Math.min(0.11, (now - last) / 1000); last = now;
    fps = fps * 0.95 + (1 / Math.max(raw, 0.001)) * 0.05;
    for (let k = 0; k < SIM; k++) simulate(raw);
    updateCamera(raw);
    bannerT -= raw; if (bannerT <= 0) $('banner').classList.remove('show');
    renderer.render(scene, camera);
    if (mode === 'play' && SIM === 1) adaptQuality(raw);
  }
  function simulate(raw) {
    let dt = raw;
    if (S.hitstopT > 0) { S.hitstopT -= raw; dt *= 0.15; }
    if (S.slowT > 0) { S.slowT -= raw; dt *= FX.slowmoScale; }
    if (mode === 'play' && !S.finished) {
      S.time += raw;
      steer(dt); contact(dt);
      S.comboT -= raw; if (S.comboT <= 0 && S.combo) { S.combo = 0; updateHud(); }
      S.skillCd = Math.max(0, S.skillCd - raw);
      $('ring').style.setProperty('--p', S.skillCd > 0 ? (S.skillCd / cfg.skill.cooldownSec) : 0);
      $('skill').classList.toggle('ready', S.skillCd <= 0);
      drainEvents(); sweep(dt);
    } else if (mode === 'play') drainEvents();
    if (S.spinT > 0) { S.spinT -= dt; S.yaw += dt * Math.PI * 2 / 0.55; }
    bon.root.position.set(S.x, 0, S.z); bon.root.rotation.y = S.yaw;
    bon.update(dt, { moving: S.moving && !S.finished, speed: S.speed, lookAt });
    city.update(dt, { x: S.x, z: S.z, r: MC.radius * S.scale, moving: S.moving });
  }

  // ---------- start
  const onResize = () => resize();
  window.addEventListener('resize', onResize);
  resize();
  newRound();
  renderer.compile(scene, camera); // compile shaders now so the first hit does not stall

  try {
    lib.showGameParameters({
      name: 'Toy City Stomp',
      params: {
        'Monster speed': { key: 'monster.speed', type: 'slider', min: 3, max: 14, step: 0.5 },
        'Grow ratio': { key: 'growth.ratio', type: 'slider', min: 1.5, max: 2.4, step: 0.05 },
        'Combo window (s)': { key: 'combo.windowSec', type: 'slider', min: 2, max: 6, step: 0.5 },
        'Camera shake': { key: 'fx.shakeMax', type: 'slider', min: 0, max: 1.5, step: 0.1 },
      },
    });
  } catch (e) { /* host without a settings panel */ }

  if (mode === 'play') {
    const read = () => Promise.resolve().then(() => lib.getUserGameState()).then((r) => {
      const st = r && r.state; if (st) Object.assign(save, st);
      if (save.lang && LANGS.includes(save.lang)) { lang = save.lang; setDir(); }
      saveRead = true; updateHud();
    }).catch(() => { saveRead = true; });
    Promise.race([read(), new Promise((r) => setTimeout(r, 2500))]).then(() => { saveRead = true; });
  }
  raf = requestAnimationFrame(frame);

  return {
    destroy() {
      alive = false; cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp); window.removeEventListener('pointercancel', onUp);
      window.removeEventListener('keydown', onKey); window.removeEventListener('keyup', onKey); window.removeEventListener('resize', onResize);
      city.dispose(); renderer.dispose(); root.innerHTML = '';
    },
    debug: {
      get S() { return S; }, get city() { return city; }, get tier() { return tier; }, get fps() { return fps; }, get lang() { return lang; },
      setLang(l) { lang = l; setDir(); }, T, newRound, finish, useSkill, input, renderer,
      grow() { S.xp = xpFor(S.stage, G); score(0, S.x, 1, S.z); },
    },
  };
}

window.run = run;

// Outside Astrocade (?local): stand in for the host, read the config file and start.
if (typeof location !== 'undefined' && new URLSearchParams(location.search).has('local') && !window.lib) {
  const none = async () => ({});
  window.lib = { showGameParameters() {}, log() {}, getUserGameState: none, saveUserGameState: none, addPlayerScoreToLeaderboard: none,
    shouldUseTouchControls: () => matchMedia('(pointer: coarse)').matches, haptics: { play() {}, start() {}, stop() {} } };
  fetch('./game_config.json').then((r) => r.json()).then((c) => { window.gameConfig = c; run(new URLSearchParams(location.search).get('mode') || 'play'); });
}
