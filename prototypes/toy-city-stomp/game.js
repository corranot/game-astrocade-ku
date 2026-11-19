// PROTOTYPE - NOT FOR PRODUCTION
// Genre: 3D giant-monster city smash for kids (ages 6-12), one-finger control.
// Toy City Stomp: Giant Monster Smash.
// Bonbon, a giant gummy dino, walks through a toy-block city on an island with one finger: whatever it bumps
// breaks. Blocks fly off, small houses pancake, towers topple like dominoes, cars squash flat and pop back, toy
// residents float away on balloons. Points fill the grow bar; Bonbon grows 8 stages and can then break bigger
// buildings. Flatten the whole city for stars and coins.
// Modules: bonbon.js (the monster), city.js (island, blocks, cars, props, particles).
/* global THREE */ // Three.js r187, loaded by index.html (import map) and set on window before run()
import { createCity } from './city.js';
import { createBonbon } from './bonbon.js';
import { createArmy } from './army.js';
import { MOVES, moveInfo, moveReady, buyMove } from './moves.js';
import { createMissions } from './missions.js';

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
  // recorded sounds and music from the game's assets (Astrocade); without them the synthesised ones play
  const buffers = {}; let loading = false, music = null, musicGain = null;
  async function loadAssets() {
    if (loading || !ctx) return; loading = true;
    const one = async (id) => {
      try {
        const a = typeof lib !== 'undefined' && lib.getAsset && lib.getAsset(id);
        if (!a || !a.url) return;
        const res = await fetch(a.url); buffers[id] = await ctx.decodeAudioData(await res.arrayBuffer());
      } catch (e) { /* this sound stays synthesised */ }
    };
    // the short effects together first, then the bigger music file
    await Promise.all(['sfx_stomp', 'sfx_crumble', 'sfx_roar', 'sfx_coin', 'sfx_squash', 'sfx_glass', 'sfx_win'].map(one));
    await one('music_main'); startMusic();
  }
  function play(id, vol = 0.5, rate = 1) {
    if (!ctx || muted || !buffers[id]) return !!buffers[id] && !muted;
    const s = ctx.createBufferSource(), g = ctx.createGain(); s.buffer = buffers[id]; s.playbackRate.value = rate; g.gain.value = vol;
    s.connect(g).connect(master); s.start(); return true;
  }
  function startMusic() {
    if (!ctx || music || !buffers.music_main) return;
    musicGain = ctx.createGain(); musicGain.gain.value = muted ? 0 : 0.3; musicGain.connect(master);
    music = ctx.createBufferSource(); music.buffer = buffers.music_main; music.loop = true; music.connect(musicGain); music.start();
  }
  return {
    unlock() { if (ensure()) { if (ctx.state === 'suspended') ctx.resume(); loadAssets(); } },
    setMuted(m) { muted = m; if (musicGain) musicGain.gain.value = m ? 0 : 0.3; }, get muted() { return muted; },
    /** Music goes a little faster when the toy army is out in force or the boss fights. */
    musicRate(r) { if (music) music.playbackRate.value = r; },
    pause(p) { if (ctx) (p ? ctx.suspend() : ctx.resume()).catch(() => {}); },
    get loaded() { return Object.keys(buffers); },
    stopMusic() { try { if (music) music.stop(); } catch (e) { /* already stopped */ } music = null; },
    bite(size) { crash(0.18 + size * 0.04, 2200 - size * 200, 0.35); tone('triangle', 220 - size * 20, 90, 0.12, 0.25); },
    collapse(k) { if (!play('sfx_crumble', 0.35 + k * 0.08, 1.15 - k * 0.07)) crash(0.5 + k * 0.15, 1400 - k * 150, 0.6); tone('sine', 120 - k * 12, 40, 0.5 + k * 0.1, 0.5); },
    land() { crash(0.9, 900, 0.8); tone('sine', 70, 30, 0.9, 0.7); },
    squash() { if (!play('sfx_squash', 0.5)) { tone('square', 520, 180, 0.12, 0.18); tone('sine', 300, 600, 0.15, 0.2, 0.1); } },
    boing() { tone('sine', 180, 420, 0.25, 0.35); },
    coin(n) { if (play('sfx_coin', 0.3, 1 + n * 0.04)) return; tone('square', 988 + n * 40, 988 + n * 40, 0.06, 0.08); tone('square', 1318 + n * 40, 1318 + n * 40, 0.1, 0.08, 0.06); },
    combo(n) { const k = Math.pow(2, Math.min(n, 12) / 12); tone('triangle', 440 * k, 660 * k, 0.12, 0.2); },
    roar(stage) { if (play('sfx_roar', 0.6, 1.25 - stage * 0.06)) return; const f = 260 - stage * 18; tone('sawtooth', f, f * 0.55, 0.9, 0.25); tone('square', f * 0.5, f * 0.3, 0.9, 0.15); crash(0.8, 600, 0.3); },
    step(stage) { if (!play('sfx_stomp', 0.18 + stage * 0.03, 1.2 - stage * 0.05)) tone('sine', 90 - stage * 6, 45, 0.12, 0.12 + stage * 0.02); },
    win() { if (play('sfx_win', 0.55)) return; [523, 659, 784, 1046].forEach((f, i) => tone('triangle', f, f, 0.25, 0.25, i * 0.12)); },
    pop() { tone('sine', 700, 1200, 0.08, 0.15); },
    glass(n) { if (play('sfx_glass', 0.3, 0.9 + Math.random() * 0.3)) return; for (let i = 0; i < Math.min(4, 1 + (n >> 2)); i++) tone('triangle', 2400 + Math.random() * 1600, 3200 + Math.random() * 1200, 0.09, 0.07, i * 0.035); },
    creak() { tone('sawtooth', 140, 90, 0.45, 0.08); },
    jingle(vol = 0.08) { [784, 659, 784, 880, 784, 659, 523].forEach((f, i) => tone('triangle', f, f, 0.14, vol, i * 0.16)); },
    rainbow() { [523, 659, 784, 1046, 1318].forEach((f, i) => tone('sine', f, f * 1.01, 0.3, 0.2, i * 0.07)); },
  };
})();

// ---------------------------------------------------------------- the game
let app = null;
function run(mode) {
  // the host may call run() before Three.js has arrived from the CDN: start as soon as it is there
  if (!window.THREE) { window.addEventListener('three-ready', () => run(mode), { once: true }); return; }
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
    { dpr: 0.75, shadow: 0, shadowsOnBlocks: false, candy: false, rubble: 700, dust: 50, confetti: 80, maxUnits: 6 },
    { dpr: 1.0, shadow: 1024, shadowsOnBlocks: false, candy: false, rubble: 1200, dust: 90, confetti: 140, maxUnits: 8 },
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
      <div class="leftcol"><div class="coins gloss"><span class="coin-ico"></span><b id="coins">0</b></div>
      <div class="mission gloss" id="mission" hidden><span class="mi-ico" id="miIco"></span><b id="miCount"></b><span class="mi-rw"><span class="coin-ico"></span><i id="miRw"></i></span></div></div>
      <div class="mid"><div class="spirit gloss"><span class="heart">❤</span><div class="sbar"><i id="spirit"></i></div></div><div class="wanted out" id="wanted"></div></div>
      <div class="btns"><button class="icon gloss" id="lang" aria-label="Language">🌐</button><button class="icon gloss" id="mute" aria-label="Sound">🔊</button></div>
    </div>
    <div class="bossbar" id="bossbar" hidden><b class="out" id="bossName"></b><div class="bar gloss"><i id="bossHp"></i></div></div>
    <div class="combo out" id="combo"></div>
    <div class="banner out" id="banner"></div>
    <div class="pops" id="pops"></div>
    <div class="stick" id="stick" hidden><div class="knob" id="knob"></div></div>
    <div class="hint" id="hint"><div class="hand">👆</div><div class="hint-t gloss" id="hintT"></div></div>
    <button class="skill" id="skill" hidden><span class="ring" id="ring"></span><span class="sk-ico" id="skIco">🌀</span></button>
    <div class="result" id="result" hidden></div>
    <div class="shop" id="shop" hidden></div>
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
  let rng, S, army = null, missions = null, target = null, lookAt = null;
  const camPos = new THREE.Vector3(), camLook = new THREE.Vector3();

  function newRound() {
    if (city) city.dispose();
    rng = mulberry32(cfg.seed || 1);
    city = createCity(scene, cfg, rng, quality);
    if (army) army.dispose();
    army = createArmy(scene, cfg, rng, quality, city);
    missions = createMissions(rng, !!save.tutorialDone, missionDone, levelOf);
    resize();
    S = {
      x: city.start.x, z: city.start.z, yaw: Math.PI, stage: 1, xp: 0, points: 0, coins: 0, combo: 0, comboT: 0, bestCombo: 0,
      time: 0, attackT: 0, tooBigT: 0, slowT: 0, hitstopT: 0, trauma: 0, finished: false, idle: 0, touched: false,
      skillCd: 0, spinT: 0, sweepT: 0, moving: false, speed: 0, chainShown: 0, stepT: 0, firstBonk: false,
      scale: G.baseScale, scaleTarget: G.baseScale, kbX: 0, kbZ: 0, bonusCoins: 0, trucks: 0, truckSet: new Set(), rainbowUsed: false, rainbowT: 0, jingleT: 2, spirit: 0, dizzyT: 0, clock: 0, acts: [], jump: null, skillCdMax: 1, bossDone: false, avoidX: 0, avoidZ: 0, avoidT: 0, pct: 100,
    };
    target = null; lookAt = null;
    bon.setStage(1); bon.setRainbow(false); bon.face('happy', 0); bon.root.position.set(S.x, 0, S.z); bon.root.scale.setScalar(G.baseScale); bon.resetTail();
    $('result').hidden = true; $('skill').hidden = true; $('hint').hidden = mode !== 'play';
    follow.init = false; follow.vx = follow.vz = 0;
    S.spirit = spiritMax(); $('bossbar').hidden = true; refreshSkill(); $('shop').hidden = true;
    hudCache.coins = hudCache.stage = hudCache.bar = hudCache.combo = hudCache.pct = hudCache.spirit = hudCache.wanted = hudCache.boss = hudCache.mission = null;
    updateHud();
  }

  const save = { best: null, coins: 0, bestCombo: 0, lang: null, owned: [], equipped: 'spin', tutorialDone: false };
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
    const sp = Math.round(S.spirit / spiritMax() * 100) + '%';
    if (hudCache.spirit !== sp) { hudCache.spirit = sp; $('spirit').style.width = sp; }
    const ws = army ? army.stars : 0;
    if (hudCache.wanted !== ws) { hudCache.wanted = ws; $('wanted').textContent = ws ? '★'.repeat(ws) + '☆'.repeat(4 - ws) : ''; }
    if (army && army.boss.alive) { const bh = Math.round(army.boss.hp / cfg.boss.hp * 100) + '%'; if (hudCache.boss !== bh) { hudCache.boss = bh; $('bossHp').style.width = bh; } }
    const mi = missions && !S.finished && missions.current, mk = mi ? mi.icon + mi.have + '/' + mi.n : '';
    if (hudCache.mission !== mk) {
      hudCache.mission = mk; $('mission').hidden = !mi || S.finished;
      if (mi) { $('miIco').textContent = mi.icon; $('miCount').textContent = mi.have + '/' + mi.n; $('miRw').textContent = missions.reward(mi); const el = $('mission'); el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); }
    }
    const pct = Math.max(0, Math.round(S.pct));
    if (hudCache.pct !== pct) { hudCache.pct = pct; $('cityBar').style.width = pct + '%'; $('cityPct').textContent = pct + '%'; }
  }

  /** Adds points (combo-multiplied) and fills the grow bar with the base points. */
  function score(base, x, y, z, label) {
    const m = comboMult(S.combo, CB) * (1 + 0.5 * (army ? army.stars : 0)) * (S.rainbowT > 0 ? 2 : 1), p = Math.round(base * m); // more wanted, more points
    if (army && !S.finished) army.heat(base);
    S.points += p; S.xp += base; // the grow bar fills from base points, so a long combo does not end the round early
    S.coins = Math.floor(S.points * cfg.coinsPerPoint) + S.bonusCoins;
    if (label !== undefined) { const [sx, sy] = screenOf(x, y, z); pop((label ? label + ' ' : '') + '+' + p, sx, sy, m > 1 ? '#ff5fa2' : '#2a2140', label ? 1.15 : 0.8); }
    while (S.stage < G.stages && S.xp >= xpFor(S.stage, G)) { S.xp -= xpFor(S.stage, G); grow(); }
    updateHud();
    return p;
  }
  const spiritMax = () => cfg.army.spirit.base + cfg.army.spirit.perStage * ((S && S.stage) || 1);
  /** Toy army hits lower Spirit; at zero Bonbon is dizzy for a moment and loses a little grow bar. Never a game over. */
  function hurt(dmg, x, z) {
    if (S.finished || S.dizzyT > 0) return;
    S.spirit = Math.max(0, S.spirit - dmg); bon.face('surprised', 0.4); bon.stomp(0.3); buzz('tap'); Sound.boing();
    const [sx, sy] = screenOf(x, 2, z); pop('-' + dmg, sx, sy, '#3fa9ff', 0.8);
    if (S.spirit <= 0) {
      S.dizzyT = cfg.army.spirit.dizzySec; bon.face('dizzy', S.dizzyT); banner(T('dizzy'), 1.2);
      S.xp = Math.max(0, S.xp - xpFor(S.stage, G) * cfg.army.spirit.loseGrowFrac);
      S.spirit = spiritMax() * 0.6;
    }
    updateHud();
  }
  /** A mission is complete: coins on top of the round's points, a cheer, and the tutorial remembered. */
  function missionDone(m) {
    const rw = missions.reward(m);
    S.bonusCoins += rw; S.coins += rw;
    banner(T('missionDone') + ' +' + rw, 1.3); Sound.win(); buzz('success');
    city.burstConfetti(S.x, 4 * S.scale, S.z, 24);
    if (m.tutorial && !missions.tutorial && !save.tutorialDone) { save.tutorialDone = true; persist(); }
    hudCache.mission = null; updateHud();
  }
  /** Every car squash goes through here: points, combo, the car mission and the ice-cream secret. */
  function squashCarsAt(x, z, r) {
    for (const c of city.squashCars(x, z, r)) { carDown(c); mission('car'); hitCombo(); score(PT.car, c.x, 1, c.z, T('squash')); Sound.squash(); buzz('tap'); city.puff(c.x, 0.5, c.z, 1); }
  }
  /** The current level of a "reach" mission event, so a new mission starts from where the player already is. */
  function levelOf(ev) { return ev === 'grow' ? S.stage : ev === 'stars' ? (army ? army.stars : 0) : ev === 'combo' ? comboMult(S.combo, CB) : 0; }
  /** The secret: squash all three ice-cream trucks in one round for 15 s of Rainbow Mode (points x2, confetti). */
  function carDown(c) {
    if (!c.icecream || S.finished || S.rainbowUsed || S.truckSet.has(c)) return;
    S.truckSet.add(c); S.trucks = S.truckSet.size;
    city.burstConfetti(c.x, 2, c.z, 14, [0xff9cc6, 0xfff0b3, 0xa8f0d8]);
    if (S.trucks >= 3) { S.rainbowUsed = true; S.rainbowT = 15; banner(T('rainbow'), 1.8); Sound.rainbow(); buzz('success'); bon.setRainbow(true); }
  }
  // the attract mode (before the first touch) does not do the child's missions
  const mission = (ev, n) => { if (missions && !S.finished && S.touched) { missions.on(ev, n); updateHud(); } };
  /** A bite only keeps the combo alive; a building down, a car squashed or a prop popped adds to it. */
  function hitCombo(counts = true) {
    S.comboT = CB.windowSec; if (!counts) return;
    S.combo++; S.bestCombo = Math.max(S.bestCombo, S.combo); mission('combo', comboMult(S.combo, CB));
    if (S.combo >= CB.every && S.combo % CB.every === 0) { Sound.combo(S.combo / CB.every); const c = $('combo'); c.classList.remove('bump'); void c.offsetWidth; c.classList.add('bump'); }
  }
  function grow() {
    S.stage++; S.scaleTarget = G.baseScale * Math.pow(G.scaleRatio, S.stage - 1); S.spirit += cfg.army.spirit.perStage;
    S.slowT = FX.slowmoSec; shake(0.35);
    bon.setStage(S.stage); bon.roar(); Sound.roar(S.stage); buzz('success'); mission('grow', S.stage);
    banner(T('grow'));
    city.crushTrees(S.x, S.z, 4 * S.scaleTarget);
    squashCarsAt(S.x, S.z, 4 * S.scaleTarget);
    for (let k = 0; k < 10; k++) city.puff(S.x + Math.cos(k) * 3 * S.scaleTarget, 0.6, S.z + Math.sin(k) * 3 * S.scaleTarget, 2.2);
    const round = S;
    if (save.equipped === 'spin' && S.stage === (moveInfo(cfg, 'spin') || {}).stage) setTimeout(() => { if (S === round && !S.finished) { banner(T('newMove'), 1.6); refreshSkill(); } }, 900);
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
  const noMenu = (e) => e.preventDefault(); root.addEventListener('contextmenu', noMenu);

  $('mute').onclick = (e) => { e.currentTarget.blur(); Sound.setMuted(!Sound.muted); $('mute').textContent = Sound.muted ? '🔇' : '🔊'; };
  $('lang').onclick = (e) => {
    e.currentTarget.blur();
    const box = $('langs'); box.hidden = !box.hidden;
    box.innerHTML = LANGS.map((l) => `<button data-l="${l}" class="${l === lang ? 'on' : ''}" lang="${l}">${LANG_NAMES[l]}</button>`).join('');
    box.querySelectorAll('button').forEach((b) => b.onclick = () => { lang = save.lang = b.dataset.l; setDir(); hudCache.combo = null; updateHud(); box.hidden = true; persist(); });
  };
  $('skill').onclick = (e) => { e.currentTarget.blur(); Sound.unlock(); useSkill(); };

  const dirV = new THREE.Vector3(), biteP = new THREE.Vector3(), touchList = [];
  // ---------- moves: the big button plays the equipped move (moves.js) through these effects
  const fx = {
    x: () => S.x, z: () => S.z, sc: () => S.scale,
    at(dist) { const d = dist * S.scale; return { x: S.x + Math.sin(S.yaw) * d, z: S.z + Math.cos(S.yaw) * d }; },
    later(sec, fn) { S.acts.push({ at: S.clock + sec, fn }); },
    spin() { S.spinT = 0.55; },
    roar() { bon.roar(); Sound.roar(S.stage); },
    /** Lifts Bonbon in an arc of height h (x size) over dur seconds, moving dist (x size) ahead, then onLand(). */
    jump(dur, h, dist, onLand) { const p = fx.at(dist); S.jump = { t: 0, dur, h: h * Math.sqrt(S.scale), sx: S.x, sz: S.z, tx: p.x, tz: p.z, onLand }; bon.stomp(-0.8); },
    /** Breaks what is within r of (x, z): bites buildings one class bigger than Bonbon could alone, squashes cars,
     *  pops props, knocks out toy units and hurts the boss. */
    blast(x, z, r, shakeAmt = 0, flavor = '') {
      for (const h of city.touching(x, z, r, touchList)) {
        if (h.b.k > S.stage + 2) continue;
        dirV.set(h.px - x, 0, h.pz - z); if (dirV.lengthSq() < 0.01) dirV.set(Math.sin(S.yaw), 0, Math.cos(S.yaw)); dirV.normalize();
        const n = city.bite(h.b, biteP.set(h.px, Math.min(h.b.h - 0.5, 1.5 * S.scale), h.pz), Math.max(2, r * 0.55), dirV, 1.6);
        if (n) { hitCombo(false); score(n * PT.perVoxel, h.px, 2, h.pz); }
      }
      squashCarsAt(x, z, r);
      { const t = city.crushTrees(x, z, r); if (t) { mission('prop', t); hitCombo(); } }
      army.hitArea(x, z, r);
      const br = army.bossReach(); if (br && Math.hypot(br.x - x, br.z - z) < r + br.r) army.damageBoss(cfg.boss.skillDmg, 'skill');
      for (let k = 0; k < 8; k++) city.puff(x + Math.cos(k * 0.8) * r * 0.7, 0.5, z + Math.sin(k * 0.8) * r * 0.7, 1.4);
      if (flavor === 'bubble') city.burstConfetti(x, 2, z, 8, [0xbfeaff, 0xffffff, 0x8fd2ff]);
      if (flavor === 'rainbow') city.burstConfetti(x, 2, z, 10, [0xff5a4f, 0xffc531, 0x6fd64b, 0x3fa9ff, 0x9b6bff]);
      if (shakeAmt) shake(shakeAmt);
      Sound.bite(3); buzz(shakeAmt > 0.2 ? 'thud' : 'tap');
    },
    /** Pulls toy units and cars in from r and knocks them out. */
    pull(r) { army.hitArea(S.x, S.z, r); squashCarsAt(S.x, S.z, r); city.burstConfetti(S.x, 3, S.z, 14, [0xff5a4f, 0x3fa9ff]); },
  };
  function useSkill() {
    if (!S || S.finished || S.skillCd > 0 || S.jump || S.dizzyT > 0) return;
    const id = save.equipped;
    if (!moveReady(cfg, id, save.owned, S.stage) || !MOVES[id]) return;
    S.skillCd = S.skillCdMax = moveInfo(cfg, id).cooldownSec; bon.stomp(1.2); bon.face('angry', 0.6); buzz('thud');
    MOVES[id](fx); mission('move');
  }
  /** Shows the big button with the equipped move once it can be used. */
  function refreshSkill() {
    const m = moveInfo(cfg, save.equipped), ok = m && moveReady(cfg, save.equipped, save.owned, S.stage);
    $('skill').hidden = !ok || mode !== 'play';
    if (m) $('skIco').textContent = m.icon;
  }

  // ---------- shop: every move as a card; buy with coins, choose which one sits on the big button
  const canBuy = () => (cfg.moves || []).some((m) => m.price > 0 && !save.owned.includes(m.id) && save.coins >= m.price);
  function openShop() { $('result').hidden = true; $('shop').hidden = false; renderShop(); }
  function renderShop() {
    const box = $('shop');
    const card = (icon, name, label, cls, id) => `<button class="mcard ${cls}" data-id="${id}"><span class="mico">${icon}</span><span class="mname" dir="auto">${name}</span><span class="mtag gloss">${label}</span></button>`;
    let html = `<div class="shead"><h2 class="out">${T('shop')}</h2><div class="coins gloss"><span class="coin-ico"></span><b>${save.coins}</b></div></div><div class="mgrid">`;
    html += card('👣', T('m_stomp'), '✓', 'owned basic', 'stomp');
    for (const m of cfg.moves || []) {
      const owned = m.price === 0 || save.owned.includes(m.id), on = save.equipped === m.id;
      const label = on ? T('inUse') : owned ? T('use') : `<span class="coin-ico"></span>${m.price}`;
      html += card(m.icon, T('m_' + m.id), label, on ? 'on' : owned ? 'owned' : save.coins >= m.price ? 'afford' : 'lock', m.id);
    }
    html += `</div><button class="again gloss out" id="shopPlay">${T('again')}</button>`;
    box.innerHTML = html;
    box.querySelectorAll('.mcard').forEach((b) => b.onclick = () => shopTap(b));
    box.querySelector('#shopPlay').onclick = () => { Sound.unlock(); newRound(); };
  }
  function shopTap(b) {
    const id = b.dataset.id, m = moveInfo(cfg, id);
    if (!m) return;
    const owned = m.price === 0 || save.owned.includes(id);
    if (owned) { save.equipped = id; Sound.pop(); buzz('tick'); persist(); renderShop(); return; }
    const r = buyMove(cfg, save, id);
    if (r.ok) { Sound.win(); buzz('success'); persist(); renderShop(); const c = $('shop').querySelector(`[data-id="${id}"]`); if (c) c.classList.add('bought'); return; }
    b.classList.remove('shake'); void b.offsetWidth; b.classList.add('shake'); Sound.boing(); buzz('error');
    const rect = b.getBoundingClientRect(), rr = root.getBoundingClientRect();
    pop(T('need').replace('{n}', r.need), (rect.left + rect.width / 2 - rr.left) / rr.width, (rect.top - rr.top) / rr.height, '#ff5a4f', 0.8);
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
    if (S.dizzyT > 0) { S.dizzyT -= dt; mag = 0; ix = iz = 0; S.idle = 0; }
    if (S.jump) { mag = 0; ix = iz = 0; }
    if (mag) S.idle = 0; else S.idle += dt;
    // nobody steering: walk to the nearest building Bonbon can break (the game plays itself behind the Play card)
    if (!mag && S.dizzyT <= 0 && (S.idle > cfg.idleAutoplaySec || !S.touched)) {
      const bossAt = army.bossReach();
      if (bossAt) target = { cx: bossAt.x, cz: bossAt.z, state: 'intact', boss: true };
      else if (!target || target.state !== 'intact' || target.boss) target = city.nearest(S.x, S.z, (b) => b.k <= S.stage + 1, 0.8); // prefers what lies ahead, as a child dragging up
      if (target) {
        ix = target.cx - S.x; iz = target.cz - S.z; const l = Math.hypot(ix, iz) || 1; ix /= l; iz /= l; mag = 0.75;
        if (S.avoidT > 0) { ix = ix * 0.3 + S.avoidX; iz = iz * 0.3 + S.avoidZ; } // step round a building too big to break
        if (S.touched) $('hint').hidden = false;
      }
    } else target = null;
    S.avoidT -= dt;
    // the bounce off a building too big to break slides back smoothly
    S.x += S.kbX * dt; S.z += S.kbZ * dt; const kd = Math.exp(-6 * dt); S.kbX *= kd; S.kbZ *= kd;
    S.moving = mag > 0;
    const speed = MC.speed * (1 + MC.speedPerStage * (S.stage - 1)) * Math.sqrt(S.scale) * mag;
    S.speed = speed;
    if (mag) {
      const l = Math.hypot(ix, iz) || 1; fwd.set(ix / l, 0, iz / l);
      let d = Math.atan2(fwd.x, fwd.z) - S.yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); S.yaw += d * Math.min(1, dt * 10);
      S.x += fwd.x * speed * dt; S.z += fwd.z * speed * dt;
      S.stepT -= dt * (speed / Math.max(1, S.scale)); if (S.stepT <= 0) { S.stepT = 0.42; Sound.step(S.stage); S.foot = -(S.foot || 1);
        city.footprint(S.x + Math.cos(S.yaw) * 0.52 * S.scale * S.foot, S.z - Math.sin(S.yaw) * 0.52 * S.scale * S.foot, 0.9 * S.scale, S.yaw); }
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
          S.tooBigT = 1.2; S.kbX = nx * 7 * Math.sqrt(S.scale); S.kbZ = nz * 7 * Math.sqrt(S.scale); bon.face('surprised', 0.8); bon.stomp(0.6); Sound.boing(); buzz('tap');
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
          S.hitstopT = FX.hitstopSec * 0.6; Sound.bite(b.k); buzz('tap'); // no screen shake per bite: the blocks and dust carry the hit
        }
      }
    }
    const br = army.bossReach();
    if (br) {
      const bx = S.x - br.x, bz = S.z - br.z, bd = Math.hypot(bx, bz) || 0.001;
      if (bd < R + br.r) {
        S.x = br.x + bx / bd * (R + br.r); S.z = br.z + bz / bd * (R + br.r);
        lookAt = lookV.set(br.x, 4 * army.boss.scale, br.z);
        if (S.attackT <= 0) { S.attackT = MC.attackSec; bon.stomp(1); bon.face('angry', 0.5); if (army.damageBoss(cfg.boss.hitDmg, 'hit')) { S.hitstopT = FX.hitstopSec; Sound.bite(4); buzz('tap'); } }
      }
    }
    squashCarsAt(S.x, S.z, R * 0.9);
    const t = city.crushTrees(S.x, S.z, R * 0.8); if (t) { mission('prop', t); hitCombo(); score(PT.tree * t, S.x, 1, S.z); Sound.pop(); }
  }

  function drainEvents() {
    for (const e of city.events.splice(0)) {
      if (e.type === 'collapse') {
        hitCombo();
        const label = e.chain > 0 ? T('domino') + ' ×' + (e.chain + 1) : '';
        score(PT.perClass * e.b.k * e.b.k, e.x, Math.min(e.b.h, 8), e.z, label);
        mission(e.b.h >= cfg.toppleMinHeight ? 'tower' : 'house'); if (S.rainbowT > 0) city.burstConfetti(e.x, 3, e.z, 18, [0xff5a4f, 0xffc531, 0x6fd64b, 0x3fa9ff, 0x9b6bff]); if (e.chain > 0) mission('domino', e.chain + 1);
        Sound.collapse(e.b.k); if (e.b.k >= 3) shake(0.1 + e.b.k * 0.05); S.hitstopT = FX.hitstopSec; buzz(e.b.k >= 3 ? 'thud' : 'tap');
        const [sx, sy] = screenOf(e.x, 2, e.z); flyCoins(sx, sy, e.b.k + 1); setTimeout(() => Sound.coin(e.b.k), 300);
        if (e.chain > 0) { bon.laugh(); if (e.chain + 1 > S.chainShown) { S.chainShown = e.chain + 1; banner(T('domino') + ' ×' + (e.chain + 1) + '!', 1.2); } }
      } else if (e.type === 'glass') { Sound.glass(e.n);
      } else if (e.type === 'creak') { Sound.creak(); bon.face('surprised', 0.4);
      } else if (e.type === 'land') {
        Sound.land(); shake(0.45); buzz('thud'); S.slowT = Math.max(S.slowT, e.hits ? 0.6 : 0.25);
        city.burstConfetti(e.x, 3, e.z, 16);
        const br = army.bossReach(); if (br && Math.hypot(br.x - e.x, br.z - e.z) < br.r + e.b.h * 0.5) army.damageBoss(cfg.boss.dominoDmg, 'domino');
      }
    }
    drainArmy();
    S.pct = city.intactLeft() / city.buildings.length * 100;
  }

  function drainArmy() {
    for (const e of army.events.splice(0)) {
      if (e.type === 'hitBonbon') hurt(e.dmg, e.x, e.z);
      else if (e.type === 'splat') { city.puff(e.x, 0.6, e.z, e.kind === 'bubble' ? 0.8 : 0.6); if (e.kind === 'bubble') Sound.pop(); }
      else if (e.type === 'unitDown') {
        mission('toy'); hitCombo(); score(e.points, e.x, e.y + 1, e.z, T('bonk')); Sound.squash(); buzz('tap');
        S.spirit = Math.min(spiritMax(), S.spirit + cfg.army.spirit.perKill); city.burstConfetti(e.x, e.y + 0.5, e.z, 10);
      } else if (e.type === 'stars') {
        mission('stars', e.stars);
        const w = $('wanted'); w.classList.remove('bump'); void w.offsetWidth; w.classList.add('bump'); Sound.combo(2 + e.stars); // the star row itself pops, no extra text
      } else if (e.type === 'bossIntro') {
        banner(T('warn'), 1.8); $('bossName').textContent = T('boss'); $('bossbar').hidden = false; hudCache.boss = null; Sound.roar(9); buzz('warning');
      } else if (e.type === 'bossLand') {
        shake(0.45); Sound.land(); for (let k = 0; k < 10; k++) city.puff(e.x + Math.cos(k) * 5, 0.8, e.z + Math.sin(k) * 5, 2.4);
      } else if (e.type === 'bossSlam') {
        shake(0.3); Sound.land(); for (let k = 0; k < 8; k++) city.puff(e.x + Math.cos(k) * 4, 0.6, e.z + Math.sin(k) * 4, 2);
      } else if (e.type === 'bossHit') {
        const [sx, sy] = screenOf(e.x, 5 * army.boss.scale, e.z); pop(e.how === 'hit' ? T('bonk') : e.how === 'domino' ? T('domino') + '!' : '★', sx, sy, '#ff5fa2', 0.9); updateHud();
      } else if (e.type === 'bossDown') {
        S.slowT = FX.slowmoSec * 1.5; shake(0.4); banner(T('bossDown'), 2); Sound.win(); buzz('success');
        score(cfg.boss.points, e.x, 8, e.z, ''); city.burstConfetti(e.x, 8 * army.boss.scale, e.z, 40, [0xffc531, 0xb8c2d6, 0x8e99b0, 0xff5a4f]);
      } else if (e.type === 'bossGone') {
        S.bossDone = true; $('bossbar').hidden = true;
        for (let k = 0; k < 12; k++) city.puff(e.x + (Math.random() - 0.5) * 6, 1 + Math.random() * 6, e.z + (Math.random() - 0.5) * 6, 2.2);
        city.releaseResidents(e.x, 3, e.z, 6);
      }
    }
  }

  function sweep(dt) {
    // the last few buildings come down by themselves, so nobody hunts for a missed shed
    const left = city.intactLeft(), total = city.buildings.length;
    if (left > 0 && left / total < 0.12) {
      S.sweepT -= dt;
      if (S.sweepT <= 0) { S.sweepT = 0.45; const b = city.nearest(S.x, S.z); if (b) city.collapse(b, dirV.set(b.cx - S.x, 0, b.cz - S.z).normalize(), 0); }
    }
    // finish only once every collapse has been scored (events drained) and nothing is still falling
    if (left === 0 && S.bossDone && city.events.length === 0 && army.events.length === 0 && !city.anyToppling() && !S.finished) finish();
  }

  function finish() {
    army.clearAll();
    S.finished = true; S.moving = false; S.combo = 0; $('hint').hidden = true; $('stick').hidden = true; $('skill').hidden = true;
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
      <dl><dt>${T('time')}</dt><dd dir="ltr">${mmss}</dd><dt>${T('bestCombo')}</dt><dd dir="ltr">×${comboMult(S.bestCombo, CB)}</dd><dt><span class="coin-ico"></span></dt><dd dir="ltr">+${S.coins}</dd></dl>
      ${isBest ? `<div class="best">${T('best')}</div>` : ''}
    </div>
    <div class="endbtns"><button class="again gloss out" id="again">${T('again')}</button>
    <button class="toshop gloss" id="toShop"><span class="coin-ico"></span> ${T('shop')}${canBuy() ? '<span class="badge">!</span>' : ''}</button></div>`;
    setTimeout(() => { if (!S.finished) return; r.hidden = false; r.querySelector('#again').onclick = () => { Sound.unlock(); newRound(); }; r.querySelector('#toShop').onclick = () => { Sound.unlock(); openShop(); }; }, 1600);
  }

  const shakeV = new THREE.Vector3(), monV = new THREE.Vector3();
  const follow = { x: 0, z: 0, vx: 0, vz: 0, init: false };
  const calm = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  /** Adds screen shake for a big moment only; amounts are small and never stack past 0.6. */
  function shake(a) { if (!calm) S.trauma = Math.min(0.6, S.trauma + a); }
  function updateCamera(dt) {
    S.scale += (S.scaleTarget - S.scale) * Math.min(1, dt * 3);
    bon.root.scale.setScalar(S.scale);
    // the camera follows a smoothed copy of Bonbon's position (critically damped), so wall pushes, bites and
    // bounces never jerk the view
    if (!follow.init) { follow.x = S.x; follow.z = S.z; follow.init = true; }
    const w = 5, ax = (S.x - follow.x) * w * w - 2 * w * follow.vx, az = (S.z - follow.z) * w * w - 2 * w * follow.vz;
    follow.vx += ax * dt; follow.vz += az * dt; follow.x += follow.vx * dt; follow.z += follow.vz * dt;
    const z = Math.pow(S.scale / G.baseScale, 0.95); // the camera backs off as fast as Bonbon grows
    // all offsets scale with Bonbon, so it keeps the same size and place on screen at every stage: low in the
    // frame, leaving the sky and what lies ahead (a boss, the next towers) in view
    camPos.set(follow.x + 0.8 * z, 8.6 * z, follow.z + 16 * z);
    camLook.set(follow.x, 3.4 * z, follow.z - 14 * z);
    S.trauma = Math.max(0, S.trauma - dt * 2.2);
    const sh = S.trauma * S.trauma * FX.shakeMax * z, tt = performance.now() / 1000;
    camera.position.copy(camPos).add(shakeV.set(Math.sin(tt * 23) * sh * 0.35, Math.sin(tt * 19 + 1) * sh * 0.25, 0));
    camera.lookAt(camLook);
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
    updateCamera(raw); army.draw();
    bannerT -= raw; if (bannerT <= 0) $('banner').classList.remove('show');
    const ring = S.skillCd > 0 ? Math.ceil(S.skillCd / (S.skillCdMax || 1) * 20) / 20 : 0;
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
      steer(dt); if (!S.jump) contact(dt);
      S.comboT -= raw; if (S.comboT <= 0 && S.combo) { S.combo = 0; updateHud(); }
      S.skillCd = Math.max(0, S.skillCd - raw); if (missions.update(raw)) updateHud();
      Sound.musicRate(army.boss.alive || army.stars >= 3 ? 1.08 : 1);
      if (S.rainbowT > 0) { S.rainbowT -= raw; if (S.rainbowT <= 0) bon.setRainbow(false); }
      S.jingleT -= raw; // an ice-cream truck nearby plays its tune now and then: a clue, never explained
      if (S.jingleT <= 0) { S.jingleT = 4; const t = city.iceTrucks().find((c) => Math.hypot(c.x - S.x, c.z - S.z) < 30 * Math.sqrt(S.scale)); if (t) Sound.jingle(); }
      drainEvents(); sweep(dt);
    } else { city.events.length = 0; army.events.length = 0; } // after the finish (or in edit mode) falling blocks still look right but score nothing
    if (S.spinT > 0) { S.spinT -= dt; S.yaw += dt * Math.PI * 2 / 0.55; }
    S.clock += dt;
    for (let i = S.acts.length - 1; i >= 0; i--) if (S.acts[i].at <= S.clock) { const a = S.acts.splice(i, 1)[0]; if (!S.finished) a.fn(); }
    let airY = 0;
    if (S.jump) {
      const J = S.jump; J.t += dt; const k = Math.min(1, J.t / J.dur);
      S.x = THREE.MathUtils.lerp(J.sx, J.tx, k); S.z = THREE.MathUtils.lerp(J.sz, J.tz, k); airY = Math.sin(k * Math.PI) * J.h;
      const lim = city.half + 2; S.x = THREE.MathUtils.clamp(S.x, -lim, lim); S.z = THREE.MathUtils.clamp(S.z, -lim, lim);
      if (k >= 1) { S.jump = null; bon.stomp(1.6); Sound.land(); if (!S.finished) J.onLand(); }
    }
    bon.root.position.set(S.x, airY, S.z); bon.root.rotation.y = S.yaw;
    bon.update(dt, { moving: S.moving && !S.finished, speed: S.speed, lookAt });
    city.update(dt, { x: S.x, z: S.z, r: MC.radius * S.scale, moving: S.moving && !S.finished });
    if (mode === 'play' && S.finished) army.settle(dt);
    if (mode === 'play' && !S.finished) army.update(dt, { x: S.x, z: S.z, r: MC.radius * S.scale, scale: S.scale, size: S.scaleTarget, height: 2.8 * S.scale, stage: S.stage });
  }

  // ---------- start
  const onVis = () => Sound.pause(document.hidden);
  document.addEventListener('visibilitychange', onVis);
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
      const earned = save.coins, best = save.best, combo = save.bestCombo, picked = save.lang, ownedBefore = save.owned.slice(), equippedBefore = save.equipped, tutorialBefore = save.tutorialDone;
      if (st) {
        Object.assign(save, st);
        save.coins = (st.coins || 0) + earned;
        if (best !== null) save.best = save.best === null ? best : Math.min(best, save.best);
        save.bestCombo = Math.max(combo, st.bestCombo || 0);
        if (picked) save.lang = picked;
        save.tutorialDone = !!(st.tutorialDone || tutorialBefore);
        save.owned = [...new Set([...(Array.isArray(st.owned) ? st.owned : []), ...ownedBefore])]; if (equippedBefore !== 'spin') save.equipped = equippedBefore;
        if (!moveInfo(cfg, save.equipped)) save.equipped = 'spin';
        if (save.lang && LANGS.includes(save.lang)) { lang = save.lang; setDir(); }
      }
      // a player who did the tutorial before should not get it again just because the save arrived late
      if (save.tutorialDone && missions && missions.tutorial && !S.touched) missions = createMissions(rng, true, missionDone, levelOf);
      saveLoaded = true; hudCache.coins = null; updateHud(); if (S && !S.finished) refreshSkill();
      if (earned > 0 || picked || ownedBefore.length) persist();
    }).catch(() => { saveLoaded = true; });
  }
  raf = requestAnimationFrame(frame);

  return {
    destroy() {
      alive = false; cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp); window.removeEventListener('pointercancel', onUp);
      window.removeEventListener('keydown', onKey); window.removeEventListener('keyup', onKey); window.removeEventListener('blur', onBlur); root.removeEventListener('contextmenu', noMenu); document.removeEventListener('visibilitychange', onVis); Sound.stopMusic(); window.removeEventListener('resize', onResize);
      city.dispose(); army.dispose(); bon.dispose(); sky.geometry.dispose(); skyMat.dispose(); envTex.dispose();
      renderer.dispose(); renderer.forceContextLoss(); root.innerHTML = '';
    },
    debug: {
      get S() { return S; }, get city() { return city; }, get army() { return army; }, get missions() { return missions; }, get save() { return save; }, openShop, get tier() { return tier; }, get fps() { return fps; }, get lang() { return lang; },
      setLang(l) { lang = l; setDir(); }, T, Sound, newRound, finish, useSkill, input, renderer, camera,
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
  Promise.all([fetch('./game_config.json').then((r) => r.json()), fetch('./asset_map.json').then((r) => r.json()).catch(() => ({}))]).then(([c, assets]) => {
    window.lib.getAsset = (id) => assets[id];
    window.gameConfig = c; run(new URLSearchParams(location.search).get('mode') || 'play');
  });
}
