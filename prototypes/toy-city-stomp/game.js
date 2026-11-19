// PROTOTYPE - NOT FOR PRODUCTION
// Toy City Stomp — 3D monster destruction game for kids (look test slice).
// Bonbon, a giant gummy dino, walks through a toy-block city on an island with one finger: whatever it bumps
// breaks. Blocks fly off, small houses pancake, towers topple like dominoes, cars squash flat and pop back, toy
// residents float away on balloons. Points fill the grow bar; Bonbon grows 8 stages and can then break bigger
// buildings. Flatten the whole city for stars and coins.
// Modules: bonbon.js (the monster), city.js (island, blocks, cars, props, particles).
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.187.0/build/three.module.js';
import { createCity } from './city.js';
import { createBonbon } from './bonbon.js';

const LANGS = ['en', 'ar', 'es', 'vi', 'hi', 'bn', 'id'];
const LANG_NAMES = { en: 'English', ar: 'العربية', es: 'Español', vi: 'Tiếng Việt', hi: 'हिन्दी', bn: 'বাংলা', id: 'Indonesia' };
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
  let ctx = null, master = null, muted = false, noiseBuf = null;
  const ensure = () => {
    if (ctx) return ctx;
    try { ctx = new (window.AudioContext || window.webkitAudioContext)(); master = ctx.createGain(); master.gain.value = 0.55; master.connect(ctx.destination); } catch (e) { ctx = null; }
    return ctx;
  };
  const env = (node, t, a, peak, dec) => { node.gain.setValueAtTime(0.0001, t); node.gain.exponentialRampToValueAtTime(peak, t + a); node.gain.exponentialRampToValueAtTime(0.0001, t + a + dec); };
  function tone(type, f0, f1, dur, vol, at = 0) {
    if (!ctx || muted) return; const t = ctx.currentTime + at, o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    env(g, t, 0.005, vol, dur); o.connect(g).connect(master); o.start(t); o.stop(t + dur + 0.05);
  }
  function crash(dur, cutoff, vol, at = 0) {
    if (!ctx || muted) return; const t = ctx.currentTime + at;
    if (!noiseBuf) { noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 1.5, ctx.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
    const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noiseBuf; f.type = 'lowpass'; f.frequency.setValueAtTime(cutoff, t); f.frequency.exponentialRampToValueAtTime(cutoff * 0.25, t + dur);
    env(g, t, 0.004, vol, dur); s.connect(f).connect(g).connect(master); s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.05);
  }
  return {
    unlock() { if (ensure() && ctx.state === 'suspended') ctx.resume(); },
    setMuted(m) { muted = m; }, get muted() { return muted; },
    bite(size) { crash(0.18 + size * 0.04, 2200 - size * 200, 0.35); tone('triangle', 220 - size * 20, 90, 0.12, 0.25); },
    collapse(k) { crash(0.5 + k * 0.15, 1400 - k * 150, 0.6); tone('sine', 120 - k * 12, 40, 0.5 + k * 0.1, 0.5); },
    land() { crash(0.9, 900, 0.8); tone('sine', 70, 30, 0.9, 0.7); },
    squash() { tone('square', 520, 180, 0.12, 0.18); tone('sine', 300, 600, 0.15, 0.2, 0.1); },
    boing() { tone('sine', 180, 420, 0.25, 0.35); },
    coin(n) { tone('square', 988 + n * 40, 988 + n * 40, 0.06, 0.08); tone('square', 1318 + n * 40, 1318 + n * 40, 0.1, 0.08, 0.06); },
    combo(n) { const k = Math.pow(2, Math.min(n, 12) / 12); tone('triangle', 440 * k, 660 * k, 0.12, 0.2); },
    roar(stage) { const f = 260 - stage * 18; tone('sawtooth', f, f * 0.55, 0.9, 0.25); tone('square', f * 0.5, f * 0.3, 0.9, 0.15); crash(0.8, 600, 0.3); },
    step(stage) { tone('sine', 90 - stage * 6, 45, 0.12, 0.12 + stage * 0.02); },
    win() { [523, 659, 784, 1046].forEach((f, i) => tone('triangle', f, f, 0.25, 0.25, i * 0.12)); },
    pop() { tone('sine', 700, 1200, 0.08, 0.15); },
  };
})();

// ---------------------------------------------------------------- the game
let app = null;
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

  // quality tier: 0 low .. 3 high; chosen from the device, then lowered live when frames are slow
  const tiers = [
    { dpr: 0.75, shadow: 0, shadowsOnBlocks: false, candy: false, rubble: 700, dust: 50, confetti: 80 },
    { dpr: 1.0, shadow: 1024, shadowsOnBlocks: false, candy: false, rubble: 1200, dust: 90, confetti: 140 },
    { dpr: 1.25, shadow: 1024, shadowsOnBlocks: true, candy: true, rubble: 2000, dust: 130, confetti: 200 },
    { dpr: 1.75, shadow: 2048, shadowsOnBlocks: true, candy: true, rubble: 3000, dust: 160, confetti: 260 },
  ];
  const cores = navigator.hardwareConcurrency || 4, memory = navigator.deviceMemory || 4;
  let tier = isTouch ? (cores >= 8 && memory >= 6 ? 2 : 1) : 3;
  if (params.has('tier')) tier = THREE.MathUtils.clamp(Math.round(+params.get('tier')) || 0, 0, 3);
  let quality = tiers[tier];

  // ---------- renderer, sky, light, reflections
  const canvas = document.createElement('canvas'); canvas.id = 'scene'; root.appendChild(canvas);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: tier >= 2, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, quality.dpr));
  renderer.shadowMap.enabled = quality.shadow > 0; renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.toneMapping = THREE.NeutralToneMapping; renderer.toneMappingExposure = 1.0; // keeps toy colours saturated
  const scene = new THREE.Scene();
  const HORIZON = 0xcdeeff;
  scene.fog = new THREE.Fog(HORIZON, 140, 420);
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { uTop: { value: new THREE.Color(0x3f9dff) }, uMid: { value: new THREE.Color(0x8fd2ff) }, uBot: { value: new THREE.Color(HORIZON) } },
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'uniform vec3 uTop; uniform vec3 uMid; uniform vec3 uBot; varying vec3 vP; void main(){ float h = vP.y; vec3 c = mix(uBot, uMid, smoothstep(0.0, 0.18, h)); c = mix(c, uTop, smoothstep(0.18, 0.75, h)); gl_FragColor = vec4(c, 1.0);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}',
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(380, 32, 16), skyMat);
  scene.add(sky);
  // reflections for the plastic and the candy: a small scene of sky plus two soft light panels, prefiltered once
  let envTex = null;
  {
    const pm = new THREE.PMREMGenerator(renderer), envScene = new THREE.Scene();
    const envSky = new THREE.Mesh(new THREE.SphereGeometry(10, 16, 8), skyMat); envScene.add(envSky);
    const panel = new THREE.Mesh(new THREE.PlaneGeometry(6, 3), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    panel.position.set(4, 6, 3); panel.lookAt(0, 0, 0); envScene.add(panel);
    const p2 = panel.clone(); p2.position.set(-6, 3, -2); p2.lookAt(0, 0, 0); p2.scale.setScalar(0.6); envScene.add(p2);
    envTex = pm.fromScene(envScene, 0.02).texture; scene.environment = envTex;
    panel.geometry.dispose(); panel.material.dispose(); envSky.geometry.dispose(); pm.dispose();
  }
  const camera = new THREE.PerspectiveCamera(50, W / H, 0.5, 900);
  scene.add(new THREE.HemisphereLight(0xeaf6ff, 0xffd9a8, 1.25));
  const sun = new THREE.DirectionalLight(0xfff1d6, 2.4);
  sun.castShadow = quality.shadow > 0;
  if (sun.castShadow) { sun.shadow.mapSize.set(quality.shadow, quality.shadow); sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.05; }
  scene.add(sun, sun.target);

  let city = null;
  function resize() {
    const r = root.getBoundingClientRect();
    const w = Math.max(1, r.width), h = Math.max(1, r.height);
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
    root.style.setProperty('--u', (w / W).toString());
    if (city) city.setDustScale(h * renderer.getPixelRatio() / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))));
  }

  // ---------- language
  const STR = cfg.strings || {};
  let lang = detectLang();
  const T = (k) => (STR[lang] && STR[lang][k]) || (STR.en && STR.en[k]) || k;

  // ---------- HUD
  const hud = document.createElement('div'); hud.className = 'hud'; root.appendChild(hud);
  hud.innerHTML = `
    <div class="top">
      <div class="grow"><div class="stage"><span id="stage" class="out">1</span></div><div class="bar gloss"><i id="bar"></i></div></div>
      <div class="vs out">VS</div>
      <div class="cityhp"><div class="bar blue gloss"><i id="cityBar" style="width:100%"></i><b id="cityPct" class="out">100%</b></div><div class="bld"></div></div>
    </div>
    <div class="row2">
      <div class="coins gloss"><span class="coin-ico"></span><b id="coins">0</b></div>
      <div class="btns"><button class="icon gloss" id="lang" aria-label="Language">🌐</button><button class="icon gloss" id="mute" aria-label="Sound">🔊</button></div>
    </div>
    <div class="combo out" id="combo"></div>
    <div class="banner out" id="banner"></div>
    <div class="pops" id="pops"></div>
    <div class="stick" id="stick" hidden><div class="knob" id="knob"></div></div>
    <div class="hint" id="hint"><div class="hand">👆</div><div class="hint-t gloss" id="hintT"></div></div>
    <button class="skill" id="skill" hidden><span class="ring" id="ring"></span><span class="sk-ico">🌀</span></button>
    <div class="result" id="result" hidden></div>
    <div class="langs" id="langs" hidden></div>`;
  const $ = (id) => hud.querySelector('#' + id);
  const setDir = () => { hud.dir = lang === 'ar' ? 'rtl' : 'ltr'; $('hintT').textContent = T('swipe'); };
  setDir();

  function pop(text, x, y, color = '#ff5fa2', size = 1) {
    const el = document.createElement('div'); el.className = 'pop'; el.textContent = text; el.dir = 'auto';
    el.style.left = (THREE.MathUtils.clamp(x, 0.2, 0.8) * 100) + '%'; el.style.top = (THREE.MathUtils.clamp(y, 0.15, 0.85) * 100) + '%';
    el.style.color = color; el.style.setProperty('--s', size); el.style.setProperty('--r', ((Math.random() - 0.5) * 16).toFixed(1) + 'deg');
    $('pops').appendChild(el); setTimeout(() => el.remove(), 1100);
  }
  const projV = new THREE.Vector3();
  const screenOf = (x, y, z) => { projV.set(x, y, z).project(camera); return [(projV.x + 1) / 2, (1 - projV.y) / 2]; };
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
  const bon = createBonbon({ candy: quality.candy }); scene.add(bon.root);
  let rng, S, target = null, lookAt = null;
  const camPos = new THREE.Vector3(), camLook = new THREE.Vector3();

  function newRound() {
    if (city) city.dispose();
    rng = mulberry32(cfg.seed || 1);
    city = createCity(scene, cfg, rng, quality);
    resize();
    S = {
      x: 0, z: city.half - 4, yaw: Math.PI, stage: 1, xp: 0, points: 0, coins: 0, combo: 0, comboT: 0, bestCombo: 0,
      time: 0, attackT: 0, tooBigT: 0, slowT: 0, hitstopT: 0, trauma: 0, finished: false, idle: 0, touched: false,
      skillCd: 0, spinT: 0, sweepT: 0, moving: false, speed: 0, chainShown: 0, stepT: 0, firstBonk: false,
      scale: G.baseScale, scaleTarget: G.baseScale, avoidX: 0, avoidZ: 0, avoidT: 0, pct: 100,
    };
    target = null; lookAt = null;
    bon.setStage(1); bon.face('happy', 0); bon.root.position.set(S.x, 0, S.z); bon.root.scale.setScalar(G.baseScale); bon.resetTail();
    $('result').hidden = true; $('skill').hidden = true; $('hint').hidden = mode !== 'play';
    camPos.set(S.x, 9, S.z + 14); camLook.set(S.x, 3, S.z - 10);
    hudCache.coins = hudCache.stage = hudCache.bar = hudCache.combo = hudCache.pct = null;
    updateHud();
  }

  const save = { best: null, coins: 0, bestCombo: 0, lang: null };
  let saveLoaded = false;
  const persist = () => { if (mode === 'play' && saveLoaded) Promise.resolve().then(() => lib.saveUserGameState({ ...save })).catch(() => {}); };

  const hudCache = {};
  function setText(id, v) { if (hudCache[id] !== v) { hudCache[id] = v; $(id).textContent = v; } }
  function updateHud() {
    setText('coins', String(save.coins + (S.finished ? 0 : S.coins)));
    setText('stage', String(S.stage));
    const need = S.stage >= G.stages ? 1 : xpFor(S.stage, G);
    const w = (S.stage >= G.stages ? 100 : Math.min(100, S.xp / need * 100)).toFixed(1) + '%';
    if (hudCache.bar !== w) { hudCache.bar = w; $('bar').style.width = w; }
    const cb = $('combo'), txt = S.combo >= CB.every ? T('combo') + ' ×' + comboMult(S.combo, CB) : '';
    if (hudCache.combo !== txt) { hudCache.combo = txt; if (txt) { cb.textContent = txt; cb.classList.add('on'); } else cb.classList.remove('on'); }
    const pct = Math.max(0, Math.round(S.pct));
    if (hudCache.pct !== pct) { hudCache.pct = pct; $('cityBar').style.width = pct + '%'; $('cityPct').textContent = pct + '%'; }
  }

  /** Adds points (combo-multiplied) and fills the grow bar with the base points. */
  function score(base, x, y, z, label) {
    const m = comboMult(S.combo, CB), p = Math.round(base * m);
    S.points += p; S.xp += base; // the grow bar fills from base points, so a long combo does not end the round early
    S.coins = Math.floor(S.points * cfg.coinsPerPoint);
    if (label !== undefined) { const [sx, sy] = screenOf(x, y, z); pop((label ? label + ' ' : '') + '+' + p, sx, sy, m > 1 ? '#ff5fa2' : '#2a2140', label ? 1.15 : 0.8); }
    while (S.stage < G.stages && S.xp >= xpFor(S.stage, G)) { S.xp -= xpFor(S.stage, G); grow(); }
    updateHud();
    return p;
  }
  /** A bite only keeps the combo alive; a building down, a car squashed or a prop popped adds to it. */
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
    city.crushTrees(S.x, S.z, 4 * S.scaleTarget);
    for (const c of city.squashCars(S.x, S.z, 4 * S.scaleTarget)) score(PT.car, c.x, 1, c.z, '');
    for (let k = 0; k < 10; k++) city.puff(S.x + Math.cos(k) * 3 * S.scaleTarget, 0.6, S.z + Math.sin(k) * 3 * S.scaleTarget, 2.2);
    if (S.stage === cfg.skill.unlockStage) setTimeout(() => { if (S && !S.finished) { banner(T('newMove'), 1.6); $('skill').hidden = false; } }, 900);
  }

  // ---------- input: the first finger steers (a floating stick); keyboard on desktop
  const input = { id: null, sx: 0, sy: 0, dx: 0, dy: 0, keys: new Set() };
  const STICK = 70;
  function wake() { Sound.unlock(); if (S) { S.touched = true; S.idle = 0; $('hint').hidden = true; } }
  const onDown = (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if (e.target.closest && e.target.closest('button, .result, .langs')) return;
    if (input.id !== null) return; // a second finger does not steer
    input.id = e.pointerId; input.sx = e.clientX; input.sy = e.clientY; input.dx = input.dy = 0;
    try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* capture not available */ }
    wake();
    const r = root.getBoundingClientRect(), st = $('stick');
    st.style.left = (e.clientX - r.left) + 'px'; st.style.top = (e.clientY - r.top) + 'px'; st.hidden = false; $('knob').style.transform = '';
  };
  const onMove = (e) => {
    if (e.pointerId !== input.id) return;
    input.dx = e.clientX - input.sx; input.dy = e.clientY - input.sy;
    const l = Math.hypot(input.dx, input.dy);
    if (l > STICK) { input.sx += input.dx * (1 - STICK / l); input.sy += input.dy * (1 - STICK / l); input.dx *= STICK / l; input.dy *= STICK / l; const r = root.getBoundingClientRect(); $('stick').style.left = (input.sx - r.left) + 'px'; $('stick').style.top = (input.sy - r.top) + 'px'; }
    $('knob').style.transform = `translate(${input.dx}px, ${input.dy}px)`;
  };
  const onUp = (e) => { if (e.pointerId !== input.id) return; input.id = null; input.dx = input.dy = 0; $('stick').hidden = true; };
  const onKey = (e) => {
    const k = e.key.toLowerCase();
    if (e.type === 'keydown') { if (k === ' ') { e.preventDefault(); useSkill(); } input.keys.add(k); wake(); } else input.keys.delete(k);
  };
  const onBlur = () => { input.keys.clear(); input.id = null; input.dx = input.dy = 0; $('stick').hidden = true; };
  canvas.addEventListener('pointerdown', onDown); hud.addEventListener('pointerdown', onDown);
  window.addEventListener('pointermove', onMove); window.addEventListener('pointerup', onUp); window.addEventListener('pointercancel', onUp);
  window.addEventListener('keydown', onKey); window.addEventListener('keyup', onKey); window.addEventListener('blur', onBlur);
  root.addEventListener('contextmenu', (e) => e.preventDefault());

  $('mute').onclick = (e) => { e.currentTarget.blur(); Sound.setMuted(!Sound.muted); $('mute').textContent = Sound.muted ? '🔇' : '🔊'; };
  $('lang').onclick = (e) => {
    e.currentTarget.blur();
    const box = $('langs'); box.hidden = !box.hidden;
    box.innerHTML = LANGS.map((l) => `<button data-l="${l}" class="${l === lang ? 'on' : ''}" lang="${l}">${LANG_NAMES[l]}</button>`).join('');
    box.querySelectorAll('button').forEach((b) => b.onclick = () => { lang = save.lang = b.dataset.l; setDir(); hudCache.combo = null; updateHud(); box.hidden = true; persist(); });
  };
  $('skill').onclick = (e) => { e.currentTarget.blur(); Sound.unlock(); useSkill(); };

  const dirV = new THREE.Vector3(), biteP = new THREE.Vector3(), touchList = [];
  function useSkill() {
    if (!S || S.finished || S.stage < cfg.skill.unlockStage || S.skillCd > 0) return;
    S.skillCd = cfg.skill.cooldownSec; S.spinT = 0.55; bon.stomp(1.4); buzz('thud'); Sound.collapse(2);
    S.trauma = Math.min(1, S.trauma + 0.5);
    const r = cfg.skill.radius * S.scale;
    for (const h of city.touching(S.x, S.z, r, touchList)) {
      if (h.b.k > S.stage + 1) continue;
      dirV.set(h.px - S.x, 0, h.pz - S.z).normalize();
      const n = city.bite(h.b, biteP.set(h.px, Math.min(h.b.h - 0.5, 1.5 * S.scale), h.pz), 2.2 * S.scale, dirV, 1.6);
      if (n) { hitCombo(false); score(n * PT.perVoxel, h.px, 2, h.pz); }
    }
    for (const c of city.squashCars(S.x, S.z, r)) { hitCombo(); score(PT.car, c.x, 1, c.z, T('squash')); }
    if (city.crushTrees(S.x, S.z, r)) hitCombo();
    for (let k = 0; k < 12; k++) city.puff(S.x + Math.cos(k / 2) * r * 0.8, 0.5, S.z + Math.sin(k / 2) * r * 0.8, 1.6);
  }

  // ---------- rules per step
  const fwd = new THREE.Vector3(), lookV = new THREE.Vector3();
  function steer(dt) {
    let ix = input.dx / STICK, iz = input.dy / STICK;
    const k = input.keys;
    if (k.has('a') || k.has('arrowleft')) ix -= 1; if (k.has('d') || k.has('arrowright')) ix += 1;
    if (k.has('w') || k.has('arrowup')) iz -= 1; if (k.has('s') || k.has('arrowdown')) iz += 1;
    let mag = Math.min(1, Math.hypot(ix, iz));
    if (mag < 0.12) mag = 0;
    if (mag) S.idle = 0; else S.idle += dt;
    // nobody steering: walk to the nearest building Bonbon can break (the game plays itself behind the Play card)
    if (!mag && (S.idle > cfg.idleAutoplaySec || !S.touched)) {
      if (!target || target.state !== 'intact') target = city.nearest(S.x, S.z, (b) => b.k <= S.stage + 1);
      if (target) {
        ix = target.cx - S.x; iz = target.cz - S.z; const l = Math.hypot(ix, iz) || 1; ix /= l; iz /= l; mag = 0.75;
        if (S.avoidT > 0) { ix = ix * 0.3 + S.avoidX; iz = iz * 0.3 + S.avoidZ; } // step round a building too big to break
        if (S.touched) $('hint').hidden = false;
      }
    } else target = null;
    S.avoidT -= dt;
    S.moving = mag > 0;
    const speed = MC.speed * (1 + MC.speedPerStage * (S.stage - 1)) * Math.sqrt(S.scale) * mag;
    S.speed = speed;
    if (mag) {
      const l = Math.hypot(ix, iz) || 1; fwd.set(ix / l, 0, iz / l);
      let d = Math.atan2(fwd.x, fwd.z) - S.yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); S.yaw += d * Math.min(1, dt * 10);
      S.x += fwd.x * speed * dt; S.z += fwd.z * speed * dt;
      S.stepT -= dt * (speed / Math.max(1, S.scale)); if (S.stepT <= 0) { S.stepT = 0.42; Sound.step(S.stage); if (S.stage >= 4) S.trauma = Math.min(1, S.trauma + 0.04 * S.stage); }
    }
    const lim = city.half + 2; S.x = THREE.MathUtils.clamp(S.x, -lim, lim); S.z = THREE.MathUtils.clamp(S.z, -lim, lim);
  }

  function contact(dt) {
    const R = MC.radius * S.scale;
    S.attackT -= dt; S.tooBigT -= dt;
    lookAt = null;
    for (const h of city.touching(S.x, S.z, R, touchList)) {
      const b = h.b, d = h.d || 0.001;
      const nx = (S.x - h.px) / d, nz = (S.z - h.pz) / d;
      if (b.k <= S.stage - (cfg.crushBelow || 3)) { city.collapse(b, dirV.set(-nx, 0, -nz), 0); continue; } // small houses go flat underfoot
      S.x += nx * (R - h.d); S.z += nz * (R - h.d);
      lookAt = lookV.set(h.px, Math.min(b.h, 2 * S.scale), h.pz);
      if (b.k > S.stage + 1) {
        if (S.tooBigT <= 0) {
          S.tooBigT = 1.2; S.x += nx * 1.2 * S.scale; S.z += nz * 1.2 * S.scale; bon.face('surprised', 0.8); bon.stomp(0.6); Sound.boing(); buzz('tap');
          S.avoidX = -nz; S.avoidZ = nx; S.avoidT = 1.2;
          const [sx, sy] = screenOf(h.px, Math.min(b.h, 4), h.pz); pop(T('tooBig'), sx, sy, '#3fa9ff', 1.05);
        }
        continue;
      }
      if (S.attackT <= 0) {
        S.attackT = MC.attackSec; bon.stomp(1); bon.face('angry', 0.5);
        dirV.set(-nx, 0, -nz);
        biteP.set(h.px - nx * 0.6, THREE.MathUtils.clamp(1.3 * S.scale, 0.6, b.h - 0.5), h.pz - nz * 0.6);
        const n = city.bite(b, biteP, MC.biteRadius * Math.pow(S.scale, 0.85), dirV);
        if (n) {
          hitCombo(false); score(n * PT.perVoxel, biteP.x, biteP.y + 1, biteP.z, S.firstBonk ? undefined : T('bonk')); S.firstBonk = true;
          S.trauma = Math.min(1, S.trauma + 0.18 + b.k * 0.03); S.hitstopT = FX.hitstopSec * 0.6; Sound.bite(b.k); buzz('tap');
        }
      }
    }
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
    S.pct = city.intactLeft() / city.buildings.length * 100;
  }

  function sweep(dt) {
    // the last few buildings come down by themselves, so nobody hunts for a missed shed
    const left = city.intactLeft(), total = city.buildings.length;
    if (left > 0 && left / total < 0.12) {
      S.sweepT -= dt;
      if (S.sweepT <= 0) { S.sweepT = 0.45; const b = city.nearest(S.x, S.z); if (b) city.collapse(b, dirV.set(b.cx - S.x, 0, b.cz - S.z).normalize(), 0); }
    }
    // finish only once every collapse has been scored (events drained) and nothing is still falling
    if (left === 0 && city.events.length === 0 && !city.anyToppling() && !S.finished) finish();
  }

  function finish() {
    S.finished = true; S.moving = false; S.combo = 0; $('hint').hidden = true; $('stick').hidden = true;
    bon.face('win', 99); S.yaw = Math.atan2(camera.position.x - S.x, camera.position.z - S.z); Sound.win(); buzz('success');
    city.burstConfetti(S.x, 6 * S.scale, S.z, 60);
    const sec = Math.round(S.time), stars = starsFor(sec, cfg.starsTimeSec);
    const counts = S.touched; // the attract mode (nobody touched yet) shows the result but saves nothing
    const isBest = counts && (save.best === null || sec < save.best);
    if (isBest) save.best = sec;
    if (counts) { save.coins += S.coins; save.bestCombo = Math.max(save.bestCombo, S.bestCombo); persist(); Promise.resolve().then(() => lib.addPlayerScoreToLeaderboard(S.points)).catch(() => {}); }
    updateHud();
    const r = $('result');
    const mmss = Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0');
    r.innerHTML = `<div class="card">
      <h2 dir="auto">${T('flat')}</h2>
      <div class="stars out">${[1, 2, 3].map((i) => `<span class="${i <= stars ? 'on' : ''}" style="animation-delay:${0.3 + i * 0.25}s">★</span>`).join('')}</div>
      <dl><dt>${T('time')}</dt><dd>${mmss}</dd><dt>${T('bestCombo')}</dt><dd>×${comboMult(S.bestCombo, CB)}</dd><dt><span class="coin-ico"></span></dt><dd>+${S.coins}</dd></dl>
      ${isBest ? `<div class="best">${T('best')}</div>` : ''}
    </div>
    <button class="again gloss out" id="again">${T('again')}</button>`;
    setTimeout(() => { if (!S.finished) return; r.hidden = false; r.querySelector('#again').onclick = () => { Sound.unlock(); newRound(); }; }, 1600);
  }

  const camWant = new THREE.Vector3(), lookWant = new THREE.Vector3(), shakeV = new THREE.Vector3(), monV = new THREE.Vector3();
  function updateCamera(dt) {
    S.scale += (S.scaleTarget - S.scale) * Math.min(1, dt * 3);
    bon.root.scale.setScalar(S.scale);
    // low and close behind Bonbon, looking ahead to the horizon: the city towers around it, the sea shows beyond
    const z = Math.pow(S.scale / G.baseScale, 0.95); // the camera backs off as fast as Bonbon grows, so it keeps its size on screen
    camWant.set(S.x + 0.8 * z, 7.5 * z + 2.5, S.z + 13 * z + 3);
    camPos.lerp(camWant, Math.min(1, dt * 3));
    camLook.lerp(lookWant.set(S.x, 2.2 * z, S.z - 12 * z), Math.min(1, dt * 4));
    S.trauma = Math.max(0, S.trauma - dt * 1.6);
    const sh = S.trauma * S.trauma * FX.shakeMax, tt = performance.now() / 1000;
    camera.position.copy(camPos).add(shakeV.set(Math.sin(tt * 47) * sh * 0.5 * z, Math.sin(tt * 39 + 1) * sh * 0.4 * z, Math.sin(tt * 43 + 2) * sh * 0.3 * z));
    camera.lookAt(camLook);
    camera.rotation.z += Math.sin(tt * 31) * sh * 0.02;
    city.setXray(camera.position, monV.set(S.x, 1.4 * S.scale, S.z), 1.6 * S.scale);
    sky.position.copy(camera.position);
    const span = 26 * z;
    sun.position.set(S.x + 20 * z, 36 * z, S.z + 6 * z); sun.target.position.set(S.x, 0, S.z - 8 * z);
    if (sun.castShadow) { const c = sun.shadow.camera; c.left = c.bottom = -span; c.right = c.top = span; c.far = 140 * z; c.updateProjectionMatrix(); }
  }

  // ---------- live quality: drop a tier when frames are slow
  const frameTimes = [];
  let qualityT = 0;
  function adaptQuality(rawDt) {
    frameTimes.push(rawDt); if (frameTimes.length > 90) frameTimes.shift();
    qualityT += rawDt; if (qualityT < 1.5 || frameTimes.length < 60) return;
    qualityT = 0;
    const med = [...frameTimes].sort((a, b) => a - b)[frameTimes.length >> 1];
    if (med > 1 / 42 && tier > 0) {
      tier--; quality = tiers[tier]; renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, tiers[tier].dpr)); resize();
      if (tier < 2) city.meshes.blocks.castShadow = false;
      if (tier === 0) { sun.castShadow = false; renderer.shadowMap.enabled = false; }
      frameTimes.length = 0;
    }
  }

  // ---------- loop
  let last = performance.now(), raf = 0, alive = true, fps = 0, ringShown = -1;
  const SIM = Math.max(1, Math.min(8, +(params.get('speed') || 1))); // test runs only: more steps per frame
  function frame(now) {
    if (!alive) return;
    raf = requestAnimationFrame(frame);
    const raw = Math.min(0.11, (now - last) / 1000); last = now;
    fps = fps * 0.95 + (1 / Math.max(raw, 0.001)) * 0.05;
    for (let k = 0; k < SIM; k++) simulate(raw);
    updateCamera(raw);
    bannerT -= raw; if (bannerT <= 0) $('banner').classList.remove('show');
    const ring = S.skillCd > 0 ? Math.ceil(S.skillCd / cfg.skill.cooldownSec * 20) / 20 : 0;
    if (ring !== ringShown) { ringShown = ring; $('ring').style.setProperty('--p', ring); $('skill').classList.toggle('ready', ring === 0); }
    renderer.render(scene, camera);
    if (mode === 'play' && SIM === 1) adaptQuality(raw);
  }
  function simulate(raw) {
    let dt = raw;
    if (S.hitstopT > 0) { S.hitstopT -= raw; dt *= 0.15; }
    if (S.slowT > 0) { S.slowT -= raw; dt *= FX.slowmoScale; }
    if (mode === 'play' && !S.finished) {
      if (S.touched) S.time += raw;
      steer(dt); contact(dt);
      S.comboT -= raw; if (S.comboT <= 0 && S.combo) { S.combo = 0; updateHud(); }
      S.skillCd = Math.max(0, S.skillCd - raw);
      drainEvents(); sweep(dt);
    } else city.events.length = 0; // after the finish (or in edit mode) falling blocks still look right but score nothing
    if (S.spinT > 0) { S.spinT -= dt; S.yaw += dt * Math.PI * 2 / 0.55; }
    bon.root.position.set(S.x, 0, S.z); bon.root.rotation.y = S.yaw;
    bon.update(dt, { moving: S.moving && !S.finished, speed: S.speed, lookAt });
    city.update(dt, { x: S.x, z: S.z, r: MC.radius * S.scale, moving: S.moving && !S.finished });
  }

  // ---------- start
  const onResize = () => resize();
  window.addEventListener('resize', onResize);
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
    // coins earned before a slow load are added on top of the loaded ones, never overwritten
    Promise.resolve().then(() => lib.getUserGameState()).then((r) => {
      if (!alive) return;
      const st = r && r.state;
      const earned = save.coins, best = save.best, combo = save.bestCombo, picked = save.lang;
      if (st) {
        Object.assign(save, st);
        save.coins = (st.coins || 0) + earned;
        if (best !== null) save.best = save.best === null ? best : Math.min(best, save.best);
        save.bestCombo = Math.max(combo, st.bestCombo || 0);
        if (picked) save.lang = picked;
        if (save.lang && LANGS.includes(save.lang)) { lang = save.lang; setDir(); }
      }
      saveLoaded = true; hudCache.coins = null; updateHud();
      if (earned > 0 || picked) persist();
    }).catch(() => { saveLoaded = true; });
  }
  raf = requestAnimationFrame(frame);

  return {
    destroy() {
      alive = false; cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp); window.removeEventListener('pointercancel', onUp);
      window.removeEventListener('keydown', onKey); window.removeEventListener('keyup', onKey); window.removeEventListener('blur', onBlur); window.removeEventListener('resize', onResize);
      city.dispose(); bon.dispose(); sky.geometry.dispose(); skyMat.dispose(); envTex.dispose();
      renderer.dispose(); renderer.forceContextLoss(); root.innerHTML = '';
    },
    debug: {
      get S() { return S; }, get city() { return city; }, get tier() { return tier; }, get fps() { return fps; }, get lang() { return lang; },
      setLang(l) { lang = l; setDir(); }, T, newRound, finish, useSkill, input, renderer, camera,
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
