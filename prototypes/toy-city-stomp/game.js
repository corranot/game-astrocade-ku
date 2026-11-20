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
import { createMoveFx } from './movefx.js';
import { toon } from './toon.js';

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
  let active = true, rate = 1; // active: a game is running (music must not start for one already closed)
  function play(id, vol = 0.5, rate = 1) {
    if (!ctx || muted || !buffers[id]) return !!buffers[id] && !muted;
    const s = ctx.createBufferSource(), g = ctx.createGain(); s.buffer = buffers[id]; s.playbackRate.value = rate; g.gain.value = vol;
    s.connect(g).connect(master); s.start(); return true;
  }
  function startMusic() {
    if (!ctx || music || !buffers.music_main || !active) return;
    musicGain = ctx.createGain(); musicGain.gain.value = muted ? 0 : 0.3; musicGain.connect(master);
    music = ctx.createBufferSource(); music.buffer = buffers.music_main; music.loop = true; music.connect(musicGain); music.start();
  }
  return {
    unlock() { active = true; if (ensure()) { if (ctx.state === 'suspended') ctx.resume(); loadAssets(); startMusic(); } }, // startMusic: back again after a restart
    setMuted(m) { muted = m; if (musicGain) musicGain.gain.value = m ? 0 : 0.3; }, get muted() { return muted; },
    /** Music goes a little faster when the toy army is out in force or the boss fights. */
    musicRate(r) { if (!music || r === rate) return; rate = r; music.playbackRate.setTargetAtTime(r, ctx.currentTime, 0.8); }, // a slow glide, only on a change
    pause(p) { if (ctx) (p ? ctx.suspend() : ctx.resume()).catch(() => {}); },
    get loaded() { return Object.keys(buffers); },
    get musicOn() { return !!music; },
    stopMusic() { active = false; rate = 1; try { if (music) music.stop(); } catch (e) { /* already stopped */ } music = null; },
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
let app = null, pendingMode = null;
/** Three.js could not be loaded (no connection): one big retry button instead of a blank screen. */
function showRetry() {
  const root = document.getElementById('app') || document.body;
  if (window.__load) window.__load.done();
  root.innerHTML = '<button style="position:absolute;inset:0;margin:auto;width:40%;aspect-ratio:1;border-radius:50%;border:6px solid #24123f;background:#22c6a3;color:#fff;font-size:12vmin;cursor:pointer" aria-label="Retry">↻</button>';
  root.querySelector('button').onclick = () => location.reload();
}
function run(mode) {
  // the host may call run() before Three.js has arrived from the CDN: start as soon as it is there
  if (!window.THREE) {
    const first = pendingMode === null; pendingMode = mode; // a second call while waiting only changes the mode
    if (first) {
      window.addEventListener('three-ready', () => { const m = pendingMode; pendingMode = null; run(m); }, { once: true });
      setTimeout(() => { if (!window.THREE) showRetry(); }, 10000); // never a blank screen forever
    }
    return;
  }
  if (app) app.destroy();
  app = startGame(mode === 'edit' ? 'edit' : 'play');
  window.__game = app.debug;
}

function startGame(mode) {
  const cfg = window.gameConfig || {};
  if (window.__load) window.__load.step(75);
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
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' }); // smoothing happens in the scene target
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
  // ---------- cities: Toy Town first, then themed cities that open one after another (game_config.themes)
  const THEMES = Array.isArray(cfg.themes) && cfg.themes.length ? cfg.themes : [{ id: 'toy', icon: '🏙️' }];
  const TOY_SKY = ['#3f9dff', '#8fd2ff', '#cdeeff'];
  let skyShown = -1;
  /** Sky and fog for a city. */
  function applySky(t) {
    const s = t.sky || TOY_SKY, u = skyMat.uniforms;
    u.uTop.value.set(s[0]); u.uMid.value.set(s[1]); u.uBot.value.set(s[2]); scene.fog.color.set(t.horizon || s[2]);
  }
  const camera = new THREE.PerspectiveCamera(50, W / H, 0.5, 900);
  scene.add(new THREE.HemisphereLight(0xeaf6ff, 0xffd9a8, 1.25));
  const sun = new THREE.DirectionalLight(0xfff1d6, 2.4);
  sun.castShadow = quality.shadow > 0;
  if (sun.castShadow) { sun.shadow.mapSize.set(quality.shadow, quality.shadow); sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.05; }
  scene.add(sun, sun.target);

  // ---------- cel outline: the scene is drawn into a target, then one full-screen pass darkens a single pixel
  // wherever depth jumps (the far side of every silhouette), so every object gets the same very thin ink line
  const halfOk = renderer.extensions.has('EXT_color_buffer_float') || renderer.extensions.has('EXT_color_buffer_half_float');
  const edgeRT = new THREE.WebGLRenderTarget(1, 1, { type: halfOk ? THREE.HalfFloatType : THREE.UnsignedByteType, samples: tier >= 2 ? 4 : 0, depthTexture: new THREE.DepthTexture(1, 1, THREE.FloatType) });
  const edgeMat = new THREE.ShaderMaterial({
    depthTest: false, depthWrite: false,
    uniforms: { tColor: { value: edgeRT.texture }, tDepth: { value: edgeRT.depthTexture }, uTexel: { value: new THREE.Vector2(1, 1) }, uNear: { value: 0.5 }, uFar: { value: 900 }, uInk: { value: new THREE.Color(0x24123f) }, uLine: { value: cfg.fx && cfg.fx.outline !== undefined ? cfg.fx.outline : 0.85 } },
    vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
    fragmentShader: `uniform sampler2D tColor; uniform sampler2D tDepth; uniform vec2 uTexel; uniform float uNear; uniform float uFar; uniform vec3 uInk; uniform float uLine; varying vec2 vUv;
      // inverse view distance: it changes linearly across a flat surface on screen, so flat ground and walls give no line
      float w(vec2 uv) { float z = texture2D(tDepth, uv).x; return (uFar - z * (uFar - uNear)) / (uNear * uFar); }
      void main() {
        vec4 c = texture2D(tColor, vUv);
        float w0 = w(vUv), wl = w(vUv - vec2(uTexel.x, 0.0)), wr = w(vUv + vec2(uTexel.x, 0.0)), wd = w(vUv - vec2(0.0, uTexel.y)), wu = w(vUv + vec2(0.0, uTexel.y));
        float lap = (wl + wr + wu + wd - 4.0 * w0) / w0; // > 0 on the far side of an edge: a one-pixel line
        // the see-through checker in front of Bonbon: every neighbour is on the other layer, which is no edge
        float nearer = step(w0 * 1.03, wl) + step(w0 * 1.03, wr) + step(w0 * 1.03, wu) + step(w0 * 1.03, wd);
        float farther = step(wl, w0 * 0.97) + step(wr, w0 * 0.97) + step(wu, w0 * 0.97) + step(wd, w0 * 0.97);
        if (nearer > 3.5 || farther > 3.5) lap = 0.0;
        // silhouettes (far side, one pixel), plus a softer line on outer box corners (roof edges, block tops)
        float e = max(smoothstep(0.025, 0.09, lap), 0.7 * smoothstep(0.05, 0.16, -lap));
        float near = 1.0 / max(max(wl, wr), max(max(wu, wd), w0)); // the nearest of the five: lines fade out far away
        e *= 1.0 - smoothstep(220.0, 380.0, near);
        c.rgb = mix(c.rgb, uInk, e * uLine);
        gl_FragColor = vec4(c.rgb, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const edgeQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), edgeMat); edgeQuad.frustumCulled = false;
  const edgeScene = new THREE.Scene(); edgeScene.add(edgeQuad);
  const edgeCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1), edgeSize = new THREE.Vector2();

  let city = null;
  function resize() {
    const r = root.getBoundingClientRect();
    const w = Math.max(1, r.width), h = Math.max(1, r.height);
    renderer.setSize(w, h, false);
    const buf = renderer.getDrawingBufferSize(edgeSize), pw = Math.max(1, buf.x), ph = Math.max(1, buf.y);
    edgeRT.setSize(pw, ph); edgeMat.uniforms.uTexel.value.set(1 / pw, 1 / ph);
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
      <div class="cityhp"><div class="bar blue gloss"><i id="cityBar" style="width:100%"></i><b id="cityPct" class="out">100%</b></div><div class="bld"></div></div>
    </div>
    <div class="row2">
      <div class="leftcol"><div class="coins gloss"><span class="coin-ico"></span><b id="coins">0</b></div>
      <div class="mission gloss" id="mission" hidden><span class="mi-ico" id="miIco"></span><b id="miCount"></b><span class="mi-rw"><span class="coin-ico"></span><i id="miRw"></i></span></div></div>
      <div class="mid"><div class="spirit gloss" id="spiritBox"><span class="heart">❤</span><div class="sbar"><i id="spirit"></i></div></div><div class="wanted out" id="wanted"></div></div>
      <div class="btns"><button class="icon gloss" id="gear" aria-label="Settings">⚙️</button></div>
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
    <div class="album" id="album" hidden></div>
    <div class="album" id="gift" hidden></div>
    <div class="langs" id="langs" hidden></div>`;
  const $ = (id) => hud.querySelector('#' + id);
  // ---------- icons: drawn icons (one atlas, asset 'icons') replace the emoji everywhere in the HUD. A watcher
  // swaps every emoji that reaches the screen for its icon, so text built anywhere gets them; with no atlas the
  // emoji stay as they are
  const ICON_CELL = {"🌀": 0, "💥": 1, "🫧": 2, "📣": 3, "🍮": 4, "🧲": 5, "🌈": 6, "🤧": 7, "🌙": 8, "👣": 9, "⚙️": 10, "⚙": 10, "🔊": 11, "🔇": 12, "📖": 13, "🎁": 14, "📅": 15, "👆": 16, "🔒": 17, "❤": 18, "★": 19, "⭐": 19, "☆": 20, "🥇": 21, "🥈": 22, "🥉": 23, "⏱": 24, "🚗": 25, "🎈": 26, "🔥": 27, "🧱": 28, "🏠": 29, "⬆️": 30, "⬆": 30, "🏢": 31, "🌳": 32, "🪖": 33, "🎳": 34, "✨": 35, "🏙️": 36, "🏙": 36, "🍭": 37, "🏖️": 38, "🏖": 38, "❄️": 39, "❄": 39, "🌋": 40, "🛰️": 41, "🛰": 41, "🎩": 42, "✓": 43, "↻": 44, "🙂": 45, "🥳": 46, "🌸": 47, "😎": 48, "🍰": 49, "🤠": 50, "👑": 51, "🚁": 52, "👸": 54, "🧙": 55, "🦸": 56, "🐰": 57, "🦄": 58, "🍩": 59, "🦀": 60, "🐬": 61, "🧜": 62, "⛄": 63, "🐧": 64, "🎅": 65, "🦕": 66, "🦖": 67, "🐣": 68, "🤖": 69, "👾": 70, "🛸": 71};
  let iconWatch = null;
  const atlas = (() => { try { const a = lib.getAsset && lib.getAsset('icons'); return a && (a.url || (typeof a === 'string' ? a : '')); } catch (e) { return ''; } })();
  // a key inside a longer emoji (a skin tone, a joined figure, a keycap) is left alone
  const ICON_RE = new RegExp('(?:' + Object.keys(ICON_CELL).sort((a, b) => b.length - a.length).map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') + ')\ufe0f?(?![\u200d\u20e3\u{1F3FB}-\u{1F3FF}])', 'gu');
  function iconize(root) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT), hits = [];
    for (let n = walker.nextNode(); n; n = walker.nextNode()) { ICON_RE.lastIndex = 0; if (ICON_RE.test(n.nodeValue)) hits.push(n); }
    for (const n of hits) {
      const frag = document.createDocumentFragment(); let last = 0; const s = n.nodeValue; ICON_RE.lastIndex = 0;
      for (let m = ICON_RE.exec(s); m; m = ICON_RE.exec(s)) {
        if (m.index > last) frag.appendChild(document.createTextNode(s.slice(last, m.index)));
        last = m.index + m[0].length; const c = ICON_CELL[m[0]] ?? ICON_CELL[m[0].replace(/\ufe0f/g, '')];
        const i = document.createElement('i'); i.className = 'ic'; i.dataset.e = m[0]; i.setAttribute('aria-hidden', 'true');
        i.style.setProperty('--i', c % 9); i.style.setProperty('--j', Math.floor(c / 9)); frag.appendChild(i);
      }
      if (last < s.length) frag.appendChild(document.createTextNode(s.slice(last)));
      n.parentNode.replaceChild(frag, n);
    }
  }
  if (atlas) {
    hud.style.setProperty('--atlas', `url("${atlas}")`); new Image().src = atlas; // fetched now, ready before the first icon shows
    iconize(hud);
    iconWatch = new MutationObserver((list) => { for (const r of list) { if (r.type === 'characterData') { if (r.target.parentNode) iconize(r.target.parentNode); } else for (const n of r.addedNodes) if (n.isConnected && (n.nodeType === 1 || n.nodeType === 3)) iconize(n.nodeType === 1 ? n : n.parentNode); } });
    iconWatch.observe(hud, { childList: true, subtree: true, characterData: true });
  }
  const lbox = document.createElement('div'); lbox.className = 'lb'; hud.prepend(lbox); // letterbox bars for cinematic shots, under the HUD
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
  let bannerT = 0, bannerPrio = 0;
  /** A big word across the screen; a more important one (prio) is not covered by a lesser one while it shows. */
  let comicAt = 0;
  /** A comic-book word bursting where something broke (BONK / CRASH / KABOOM), sized by how big it was. */
  function comic(word, x, y, z, size = 1) {
    const now = performance.now(); if (now - comicAt < 220) return;
    const [sx, sy] = screenOf(x, y, z); if (projV.z > 1 || sx < 0.05 || sx > 0.95 || sy < 0.12 || sy > 0.9) return; // off screen or behind: no word
    comicAt = now; // one at a time, never a pile
    const el = document.createElement('div'); el.className = 'comic out'; el.textContent = word; el.dir = 'auto';
    el.style.left = (sx * 100) + '%'; el.style.top = (sy * 100) + '%';
    el.style.setProperty('--s', size.toFixed(2)); el.style.setProperty('--r', ((Math.random() - 0.5) * 24).toFixed(1) + 'deg');
    $('pops').appendChild(el); setTimeout(() => el.remove(), 900);
  }
  function banner(text, sec = 1.4, prio = 0) { if (bannerT > 0 && prio < bannerPrio) return; bannerPrio = prio; const b = $('banner'); b.textContent = text; b.style.animationDuration = sec + 's'; b.classList.remove('show'); void b.offsetWidth; b.classList.add('show'); bannerT = sec; }
  function flyCoins(x, y, n) {
    for (let i = 0; i < Math.min(n, 6); i++) {
      const c = document.createElement('div'); c.className = 'flycoin'; c.style.left = x * 100 + '%'; c.style.top = y * 100 + '%';
      c.style.animationDelay = (i * 0.05) + 's'; $('pops').appendChild(c); setTimeout(() => c.remove(), 900 + i * 50);
    }
  }

  // ---------- state
  const G = cfg.growth, MC = cfg.monster, CB = cfg.combo, PT = cfg.points, FX = cfg.fx;
  const bon = createBonbon({ candy: quality.candy }); scene.add(bon.root);
  const mfx = createMoveFx(scene);
  let rng, S, army = null, missions = null, target = null, lookAt = null;
  const camPos = new THREE.Vector3(), camLook = new THREE.Vector3();

  function newRound() {
    if (city) city.dispose();
    // a new city every round: the first one (and the attract mode) is the tuned seed, then each finished city
    // moves the seed on, so the layout, colours and the clock tower's place change
    // the Daily City: the same seed and city for every player today, picked from the map's 📅
    const daily = wantDaily, day = today(); // the day is fixed when the round starts (a round across midnight stays yesterday's)
    wantDaily = false;
    const n = save.rounds || 0, ti = daily ? day % THEMES.length : themeIndex(); // the same city for every player today, open or not
    rng = mulberry32(daily ? ((day * 7919 + 12345) >>> 0) : (((cfg.seed || 1) + n * 7919) >>> 0));
    const newSky = ti !== skyShown;
    if (newSky) { applySky(THEMES[ti]); skyShown = ti; }
    city = createCity(scene, cfg, rng, quality, { shuffle: n > 0 || daily, theme: THEMES[ti] });
    if (army) army.dispose();
    army = createArmy(scene, cfg, rng, quality, city, { boss: THEMES[ti].boss });
    missions = createMissions(rng, !!save.tutorialDone, missionDone, levelOf);
    resize();
    S = {
      x: city.start.x, z: city.start.z, yaw: Math.PI, stage: 1, xp: 0, points: 0, coins: 0, combo: 0, comboT: 0, bestCombo: 0,
      time: 0, attackT: 0, tooBigT: 0, slowT: 0, hitstopT: 0, lookT: 0, lookP: new THREE.Vector3(), fidgeted: false, trauma: 0, finished: false, idle: 0, touched: false,
      skillCd: 0, spinT: 0, sweepT: 0, moving: false, speed: 0, chainShown: 0, stepT: 0, firstBonk: false,
      scale: G.baseScale, scaleTarget: G.baseScale, kbX: 0, kbZ: 0, bonusCoins: 0, trucks: 0, truckSet: new Set(), rainbowUsed: false, rainbowT: 0, jingleT: 2, spirit: 0, dizzyT: 0, clock: 0, acts: [], jump: null, skillCdMax: 1, bossDone: false, avoidX: 0, avoidZ: 0, avoidT: 0, pct: 100, cars: 0, hits: 0, blocks0: 0, poseT: 0, carTipT: 2, thrown: 0, daily, dailyBonus: 0, theme: ti, day, collapses: 0, stickerAt: 0, newSticker: '', newCity: -1,
    };
    const SA = (cfg.stickers && cfg.stickers.atCollapse) || [4, 22];
    S.stickerAt = SA[0] + Math.floor(rng() * (SA[1] - SA[0] + 1)); // the n-th building the child knocks down hides a sticker
    target = null; lookAt = null;
    bon.setStage(1); bon.setRainbow(false); bon.face('happy', 0); bon.root.position.set(S.x, 0, S.z); bon.root.scale.setScalar(G.baseScale); bon.resetTail();
    $('result').hidden = true; $('skill').hidden = true; $('hint').hidden = mode !== 'play'; hud.classList.remove('ended'); $('langs').hidden = true; $('album').hidden = true;
    follow.init = false; follow.vx = follow.vz = 0;
    S.spirit = spiritMax(); $('bossbar').hidden = true; refreshSkill(); $('shop').hidden = true;
    hudCache.coins = hudCache.stage = hudCache.bar = hudCache.combo = hudCache.pct = hudCache.spirit = hudCache.wanted = hudCache.boss = hudCache.mission = null;
    updateHud();
    eventsStart();
    if (daily) banner('📅 ' + T('daily'), 1.8);
    else if (newSky && ti > 0) banner(THEMES[ti].icon + ' ' + T('t_' + THEMES[ti].id), 1.8); // the name of a new city
  }
  let wantDaily = false, giftWaiting = false;
  /** This city's robot boss name. */
  const bossName = () => { const b = S && THEMES[S.theme] && THEMES[S.theme].boss; return T(b && b.name ? b.name : 'boss'); };
  /** Today as a whole day number in the player's own time zone (the Daily City seed and the daily gift). */
  function today() { const d = new Date(); return Math.floor((d.getTime() - d.getTimezoneOffset() * 60000) / 86400000); }
  const unlockedCount = () => Math.min(THEMES.length, Math.max(1, Number(save.unlocked) || 1));
  /** The city to play: the one picked on the map, never past the last one opened. */
  const themeIndex = () => Math.min(unlockedCount() - 1, Math.max(0, Number(save.theme) || 0));

  const save = { best: null, coins: 0, bestCombo: 0, lang: null, owned: [], equipped: 'spin', tutorialDone: false, rounds: 0, smashed: 0, muted: false, unlocked: 1, theme: 0, wardrobe: [], hat: 'none', skin: 'pink', stickers: [], threwCar: false, lastDay: null, streak: 0, dailyDay: null, dailyBest: null };
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
    if (hudCache.spirit !== sp) { hudCache.spirit = sp; $('spirit').style.width = sp; $('spiritBox').classList.toggle('full', sp === '100%'); }
    const ws = army ? army.stars : 0;
    if (hudCache.wanted !== ws) { hudCache.wanted = ws; $('wanted').textContent = ws ? '★'.repeat(ws) + '☆'.repeat(4 - ws) : ''; }
    if (army && army.boss.alive) { const bh = Math.round(army.boss.hp / cfg.boss.hp * 100) + '%'; if (hudCache.boss !== bh) { hudCache.boss = bh; $('bossHp').style.width = bh; } }
    const mi = missions && !S.finished && missions.current, mk = mi ? mi.icon + mi.have + '/' + mi.n : '';
    if (hudCache.mission !== mk) {
      hudCache.mission = mk; $('mission').hidden = !mi || S.finished;
      if (mi) { $('miIco').textContent = mi.icon; $('miCount').textContent = mi.have + '/' + mi.n; $('miRw').textContent = missions.reward(mi); const el = $('mission'); el.classList.remove('bump', 'mini'); void el.offsetWidth; el.classList.add('bump'); setTimeout(() => { if (hudCache.mission === mk) el.classList.add('mini'); }, 3000); }
    }
    const pct = Math.max(0, Math.round(S.pct));
    if (hudCache.pct !== pct) { hudCache.pct = pct; $('cityBar').style.width = pct + '%'; $('cityPct').textContent = pct + '%'; }
  }

  /** Adds points (combo-multiplied) and fills the grow bar with the base points. */
  function score(base, x, y, z, label) {
    const m = comboMult(S.combo, CB) * (1 + 0.5 * (army ? army.stars : 0)) * (S.rainbowT > 0 ? 2 : 1) * (S.feverT > 0 ? 2 : 1), p = Math.round(base * m); // more wanted, more points
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
    S.hits++; S.spirit = Math.max(0, S.spirit - dmg); bon.face('surprised', 0.4); bon.stomp(0.3); buzz('tap'); Sound.boing();
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
    for (const c of city.squashCars(x, z, r)) { S.cars++; carDown(c); mission('car'); hitCombo(); score(PT.car, c.x, 1, c.z, T('squash')); Sound.squash(); buzz('tap'); city.puff(c.x, 0.5, c.z, 1); }
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
    S.combo++; S.bestCombo = Math.max(S.bestCombo, S.combo); mission('combo', comboMult(S.combo, CB)); feverCheck();
    if (S.combo >= CB.every && S.combo % CB.every === 0) { if (!bon.posing && !S.jump) bon.pose('flex', 0.9); bon.face('excited', 1); Sound.combo(S.combo / CB.every); const c = $('combo'); c.classList.remove('bump'); void c.offsetWidth; c.classList.add('bump'); }
  }

  // ---------- surprises each round (game_config.events): a golden building to catch in time, a giant candy that
  // makes Bonbon MEGA for a few seconds, and FEVER when the combo runs high
  const EVC = cfg.events || {};
  const stageScale = () => G.baseScale * Math.pow(G.scaleRatio, S.stage - 1);
  const candyMesh = (() => {
    const g = new THREE.Group();
    const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 2.2, 8), toon({ color: 0xffffff })); stick.position.y = 1.1; g.add(stick);
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 0.35, 28), toon({ color: 0xff5fa2 })); disc.rotation.x = Math.PI / 2; disc.position.y = 2.7; g.add(disc);
    const swirl = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.14, 8, 24), toon({ color: 0xffffff })); swirl.position.set(0, 2.7, 0.19); g.add(swirl);
    g.visible = false; scene.add(g); return g;
  })();
  const markers = { gold: null, candy: null };
  function marker(kind, iconEmoji) {
    if (!markers[kind]) { const el = document.createElement('div'); el.className = 'emark out'; el.innerHTML = '<span class="emi"></span><b></b>'; el.querySelector('.emi').textContent = iconEmoji; $('pops').appendChild(el); markers[kind] = el; }
    return markers[kind];
  }
  function hideMarker(kind) { if (markers[kind]) { markers[kind].remove(); markers[kind] = null; } }
  function placeMarker(kind, x, y, z, label) {
    const el = markers[kind]; if (!el) return;
    const [sx, sy] = screenOf(x, y, z), off = projV.z > 1 || sx < 0 || sx > 1 || sy < 0 || sy > 1;
    // off screen: stick to the nearest edge so the child knows which way to go
    el.style.left = (THREE.MathUtils.clamp(projV.z > 1 ? 1 - sx : sx, 0.08, 0.92) * 100) + '%'; el.style.top = (THREE.MathUtils.clamp(sy, 0.2, 0.86) * 100) + '%';
    el.classList.toggle('edge', off); if (el._label !== label) { el._label = label; el.lastChild.textContent = label; } // text only when it changes (the icon watcher sees every write)
  }
  function eventsStart() {
    const E = EVC.golden && EVC.golden.atSec || [16, 34];
    S.goldenAt = E[0] + rng() * (E[1] - E[0]); S.golden = null; S.goldenT = 0; S.goldenPh = -1;
    S.candyAt = (EVC.candy && EVC.candy.firstSec) || 30; S.candy = null; S.megaT = 0; S.feverT = 0; S.feverCd = 0;
    candyMesh.visible = false; hideMarker('gold'); hideMarker('candy'); hud.classList.remove('fever');
  }
  function eventsUpdate(dt) {
    if (!S.touched || S.finished) return;
    // golden building: a standing building in view turns gold; knock it down before the countdown ends
    if (!S.golden && S.goldenAt > 0 && S.time >= S.goldenAt) {
      S.goldenAt = -1;
      const b = city.nearest(S.x, S.z, (o) => o.k <= S.stage + 1 && o.k >= 2 && Math.hypot(o.cx - S.x, o.cz - S.z) > 6 * S.scale, 0.6);
      if (b) { bon.face('surprised', 0.8); S.lookT = 1.4; S.lookP.set(b.cx, Math.min(b.h, 8), b.cz); S.golden = b; S.goldenT = (EVC.golden && EVC.golden.timeSec) || 25; city.tintBuilding(b, 0xffc531); marker('gold', '⭐'); banner('⭐ ' + T('golden'), 1.8, 1); Sound.combo(4); }
    }
    if (S.golden) {
      const b = S.golden;
      if (b.state === 'intact') { // once it falls, drainEvents pays the reward (it runs after this in the frame)
        S.goldenT -= dt; const ph = Math.floor(S.goldenT * 4) % 2; if (ph !== S.goldenPh) { S.goldenPh = ph; city.tintBuilding(b, ph ? 0xffb300 : 0xffd84f); } // a shimmer, repainted only when it flips
        placeMarker('gold', b.cx, Math.min(b.h, 10) + 1.5, b.cz, String(Math.max(0, Math.ceil(S.goldenT))));
        if (S.goldenT <= 0) { city.tintBuilding(b, null); S.golden = null; hideMarker('gold'); }
      }
    }
    // the giant candy: shows up on the street ahead now and then; eating it makes Bonbon MEGA
    const CC = EVC.candy || {};
    if (!S.candy && S.megaT <= 0 && S.time >= S.candyAt) {
      for (let a = 0; a < 8; a++) {
        const ang = S.yaw + (a % 2 ? 1 : -1) * Math.ceil(a / 2) * 0.5, d = 11 * Math.sqrt(S.scale), x = S.x + Math.sin(ang) * d, z = S.z + Math.cos(ang) * d;
        if (Math.abs(x) < city.half - 4 && Math.abs(z) < city.half - 4 && city.touching(x, z, 2, touchList).length === 0) { S.candy = { x, z }; break; }
      }
      S.candyAt = S.time + (S.candy ? 1e9 : 3); // tried again a little later when there was no free spot
      if (S.candy) { candyMesh.visible = true; marker('candy', '🍭'); }
    }
    if (S.candy) {
      const c = S.candy, sc = Math.max(1.2, Math.sqrt(S.scale)), t = performance.now() / 1000;
      candyMesh.position.set(c.x, Math.sin(t * 3) * 0.3 * sc, c.z); candyMesh.rotation.y = t * 2; candyMesh.scale.setScalar(sc);
      placeMarker('candy', c.x, 4 * sc, c.z, '');
      if (Math.hypot(c.x - S.x, c.z - S.z) < (CC.pickRadius || 2.4) * sc + MC.radius * S.scale * 0.5) {
        S.candy = null; candyMesh.visible = false; hideMarker('candy'); S.megaT = CC.megaSec || 8; S.candyAt = S.time + (CC.everySec || 50);
        bon.setRainbow(true); startCine('mega', S.x, S.z, CN.megaSec); banner('🍭 ' + T('mega'), 1.8, 1); Sound.rainbow(); buzz('success'); bon.roar(); mfx.ring(S.x, S.z, 0xff9cc6, 8 * S.scale, 0.6);
      }
    }
    if (S.megaT > 0) { S.megaT -= dt; if (S.megaT <= 0 && S.rainbowT <= 0) bon.setRainbow(false); }
    S.scaleTarget = stageScale() * (S.megaT > 0 ? (CC.scale || 1.35) : 1);
    // fever: the combo keeps going after the meter is full
    S.feverCd -= dt;
    if (S.feverT > 0) { S.feverT -= dt; if (S.feverT <= 0) hud.classList.remove('fever'); }
  }
  /** FEVER when the combo passes the bar (not again until the cooldown is over). */
  function feverCheck() {
    const F = EVC.fever || {};
    if (!S.touched || S.finished || mode !== 'play') return;
    if (S.feverT <= 0 && S.feverCd <= 0 && S.combo >= (F.combo || 21)) { bon.face('excited', F.sec || 6); S.feverT = F.sec || 6; S.feverCd = (F.cooldownSec || 25) + S.feverT; hud.classList.add('fever'); banner('🔥 ' + T('fever'), 1.6, 1); Sound.combo(6); buzz('success'); }
  }
  function grow() {
    S.stage++; S.scaleTarget = G.baseScale * Math.pow(G.scaleRatio, S.stage - 1); S.spirit += cfg.army.spirit.perStage;
    S.slowT = FX.slowmoSec; shake(0.35);
    bon.setStage(S.stage); bon.roar(); Sound.roar(S.stage); buzz('success'); mission('grow', S.stage);
    if (!S.jump && !bon.posing) S.poseT = 0.9; // turns to face the player for a moment (not in the middle of a move)
    if (S.touched) startCine('grow', S.x, S.z, CN.growSec);
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
  function wake() {
    Sound.unlock();
    if (!S) return;
    // what the attract mode broke and earned before the first touch is not the child's: coins restart at 0, and
    // the blocks already down are left out of the count
    if (!S.touched) { S.coins = 0; S.points = 0; S.blocks0 = city.buildings.reduce((n, b) => n + (b.state === 'intact' ? 0 : b.total), 0); hudCache.coins = null; }
    S.touched = true; S.idle = 0; $('hint').hidden = true;
  }
  const onDown = (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if (e.target.closest && e.target.closest('button, .result, .langs, .shop, .album, #gift')) return;
    $('langs').hidden = true; // a tap in the game closes the settings
    if (input.id !== null) return; // a second finger does not steer
    input.id = e.pointerId; input.sx = e.clientX; input.sy = e.clientY; input.dx = input.dy = 0; input.t0 = performance.now(); input.ox = e.clientX; input.oy = e.clientY;
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
  const onUp = (e) => {
    if (e.pointerId !== input.id) return;
    input.id = null; input.dx = input.dy = 0; $('stick').hidden = true;
    if (performance.now() - input.t0 < 260 && Math.hypot(e.clientX - input.ox, e.clientY - input.oy) < 14) tapAt(e.clientX, e.clientY); // a quick tap, not a swipe
  };
  const tapRay = new THREE.Raycaster(), tapNdc = new THREE.Vector2(), tapPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.8), tapHit = new THREE.Vector3();
  /** A tap on a car near Bonbon: Bonbon picks it up and throws it at the nearest building it can break. */
  function tapAt(cx, cy) {
    if (!S || S.finished || S.jump || S.dizzyT > 0) return;
    const r = root.getBoundingClientRect();
    tapNdc.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1); tapRay.setFromCamera(tapNdc, camera);
    if (!tapRay.ray.intersectPlane(tapPlane, tapHit)) return;
    const reach = (cfg.throwCar && cfg.throwCar.reach || 12) * Math.sqrt(S.scale);
    const car = city.pickCar(tapHit.x, tapHit.z, 2.6 + S.scale * 0.6);
    if (!car || Math.hypot(car.x - S.x, car.z - S.z) > reach) { // nothing to throw: a tap on Bonbon tickles it, elsewhere it looks and points
      const RC = cfg.react || {}, [bx, by] = screenOf(S.x, 1.5 * S.scale, S.z), tx0 = (cx - r.left) / r.width, ty0 = (cy - r.top) / r.height;
      if (Math.hypot(tx0 - bx, (ty0 - by) * r.height / r.width) < (RC.tickleRadius || 0.14) * Math.sqrt(S.scale / G.baseScale)) {
        if (!bon.posing) { bon.pose('tickle', 1.1); bon.laugh(); Sound.boing(); buzz('tap'); pop('❤', tx0 + 0.05, ty0 - 0.06, '#ff5fa2', 1); S.idle = 0; }
        return;
      }
      S.lookT = (cfg.react && cfg.react.lookSec) || 1.6; S.lookP.set(tapHit.x, 1.5, tapHit.z); if (!bon.posing) bon.pose('point', 0.9); return;
    }
    // the target is a building the child can see (on screen), so the crash is seen
    const onScreen = (b) => { const [sx, sy] = screenOf(b.cx, Math.min(b.h, 6) * 0.5, b.cz); return sx > 0.12 && sx < 0.88 && sy > 0.15 && sy < 0.85; };
    const tgt = city.nearest(car.x, car.z, (b) => b.k <= S.stage + 2 && Math.hypot(b.cx - S.x, b.cz - S.z) > 4 * S.scale && onScreen(b));
    // no building in view: throw it away from the camera (into the scene, never at the player), onto the island
    const far = 18 * S.scale, ok = tgt && Math.hypot(tgt.cx - car.x, tgt.cz - car.z) < far * 2.2;
    const ax = car.x - camera.position.x, az = car.z - camera.position.z, al = Math.hypot(ax, az) || 1, lim = city.half - 2;
    const tx = ok ? tgt.cx : THREE.MathUtils.clamp(car.x + ax / al * far, -lim, lim), tz = ok ? tgt.cz : THREE.MathUtils.clamp(car.z + az / al * far, -lim, lim);
    city.throwCar(car, tx, tz, 6 + 2 * S.scale);
    S.yaw = Math.atan2(car.x - S.x, car.z - S.z); bon.stomp(0.6); bon.face('roar', 0.5); Sound.boing(); buzz('tap');
    S.thrown++; S.cars++; carDown(car); S.idle = 0; if (!save.threwCar) { save.threwCar = true; persist(); } // counts as a car squashed (and an ice-cream truck for the secret)
  }
  const onKey = (e) => {
    const k = e.key.toLowerCase();
    if (e.type === 'keydown') { if (k === ' ') { e.preventDefault(); useSkill(); } input.keys.add(k); wake(); } else input.keys.delete(k);
  };
  const onBlur = () => { input.keys.clear(); input.id = null; input.dx = input.dy = 0; $('stick').hidden = true; };
  canvas.addEventListener('pointerdown', onDown); hud.addEventListener('pointerdown', onDown);
  window.addEventListener('pointermove', onMove); window.addEventListener('pointerup', onUp); window.addEventListener('pointercancel', onUp);
  window.addEventListener('keydown', onKey); window.addEventListener('keyup', onKey); window.addEventListener('blur', onBlur);
  const noMenu = (e) => e.preventDefault(); root.addEventListener('contextmenu', noMenu);

  $('gear').onclick = (e) => {
    e.currentTarget.blur(); Sound.unlock();
    const box = $('langs'); box.hidden = !box.hidden;
    if (box.hidden) return;
    box.innerHTML = `<button id="snd" class="snd">${Sound.muted ? '🔇' : '🔊'}</button>` +
      LANGS.map((l) => `<button data-l="${l}" class="${l === lang ? 'on' : ''}" lang="${l}">${LANG_NAMES[l]}</button>`).join('');
    box.querySelector('#snd').onclick = (ev) => { Sound.setMuted(!Sound.muted); save.muted = Sound.muted; persist(); ev.currentTarget.textContent = Sound.muted ? '🔇' : '🔊'; };
    box.querySelectorAll('[data-l]').forEach((b) => b.onclick = () => { lang = save.lang = b.dataset.l; setDir(); $('bossName').textContent = bossName(); hudCache.combo = null; updateHud(); box.hidden = true; persist(); });
  };
  // the move button answers the moment a finger lands on it, even while another finger is steering
  // (phones send no click for a second finger)
  $('skill').addEventListener('pointerdown', (e) => { if (e.pointerType === 'mouse' && e.button !== 0) return; e.preventDefault(); e.stopPropagation(); Sound.unlock(); wake(); useSkill(); });
  $('skill').addEventListener('click', (e) => { if (e.detail === 0) { wake(); useSkill(); } }); // Enter or a screen reader's activate

  const dirV = new THREE.Vector3(), biteP = new THREE.Vector3(), touchList = [];
  // ---------- moves: the big button plays the equipped move (moves.js) through these effects
  const mouthV = new THREE.Vector3(), beamTo = new THREE.Vector3();
  const fx = {
    x: () => S.x, z: () => S.z, sc: () => S.scale,
    at(dist) { const d = dist * S.scale; return { x: S.x + Math.sin(S.yaw) * d, z: S.z + Math.cos(S.yaw) * d }; },
    later(sec, fn) { S.acts.push({ at: S.clock + sec, fn }); },
    spin() { S.spinT = 0.55; },
    /** Bonbon's body language for a move. */
    pose(name, sec) { bon.pose(name, sec); },
    /** Effects: a shock ring, a flying bubble or sneeze puff, the rainbow beam (see movefx.js). */
    ring(x, z, color, r, dur, inward) { mfx.ring(x, z, color, r, dur, inward); },
    ball(kind, x, y, z, vx, vy, vz, size, life) { mfx.ball(kind, x, y, z, vx, vy, vz, size, life); },
    /** Where the mouth is (in front of the eyes, a little lower). */
    mouth() { const e = bon.eyeWorld(mouthV); return { x: e.x + Math.sin(S.yaw) * 0.6 * S.scale, y: e.y - 0.45 * S.scale, z: e.z + Math.cos(S.yaw) * 0.6 * S.scale }; },
    /** A rainbow beam from the eyes to the ground dist (x size) ahead. */
    beam(dist, dur) { const p = fx.at(dist); mfx.beam(bon.eyeWorld(mouthV), beamTo.set(p.x, 0.5, p.z), 0.55 * S.scale, dur); },
    fwd: () => ({ x: Math.sin(S.yaw), z: Math.cos(S.yaw) }),
    roar() { bon.roar(); Sound.roar(S.stage); },
    /** Lifts Bonbon in an arc of height h (x size) over dur seconds, moving dist (x size) ahead, then onLand(). */
    jump(dur, h, dist, onLand) { const p = fx.at(dist); S.jump = { t: 0, dur, h: h * Math.sqrt(S.scale), sx: S.x, sz: S.z, tx: p.x, tz: p.z, onLand }; bon.stomp(-0.8); },
    /** Breaks what is within r of (x, z): bites buildings one class bigger than Bonbon could alone, squashes cars,
     *  pops props, knocks out toy units and hurts the boss. */
    blast(x, z, r, shakeAmt = 0, flavor = '') {
      for (const h of city.touching(x, z, r, touchList)) {
        if (h.b.k > S.stage + (S.megaT > 0 ? 4 : 2)) continue;
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
  const canBuy = () => (cfg.moves || []).some((m) => m.price > 0 && !save.owned.includes(m.id) && save.coins >= m.price) || COSTUMES.some((x) => !ownsLook(x) && save.coins >= x.price);
  // ---------- costumes (game_config.costumes): a hat and a skin, bought once with coins, worn from then on
  const COSTUMES = cfg.costumes || [];
  const costume = (id) => COSTUMES.find((x) => x.id === id) || null;
  const ownsLook = (x) => x.price === 0 || (Array.isArray(save.wardrobe) && save.wardrobe.includes(x.id));
  /** Puts the saved hat and skin on Bonbon (an unknown or unowned one falls back to none / pink). */
  function wearCostume() {
    const h = costume(save.hat), s = costume(save.skin);
    bon.setHat(h && h.kind === 'hat' && ownsLook(h) ? h.id : 'none');
    const hx = (v) => { const n = parseInt(String(v || '').replace('#', '').replace(/^0x/, ''), 16); return Number.isFinite(n) ? n : null; };
    const c = s && s.kind === 'skin' && ownsLook(s) ? hx(s.color) : null;
    if (c !== null) bon.setSkin(c, hx(s.dark) ?? c); else bon.setSkin();
  }
  let shopTab = 'moves';
  function openShop() { $('result').hidden = true; $('shop').hidden = false; renderShop(); }
  function renderShop() {
    const box = $('shop');
    const card = (icon, name, label, cls, id) => `<button class="mcard ${cls}" data-id="${id}"><span class="mico">${icon}</span><span class="mname" dir="auto">${name}</span><span class="mtag gloss">${label}</span></button>`;
    let html = `<div class="shead"><h2 class="out">${T('shop')}</h2><div class="coins gloss"><span class="coin-ico"></span><b>${save.coins}</b></div></div>
      <div class="tabs"><button class="tab gloss${shopTab === 'moves' ? ' on' : ''}" data-tab="moves">🌀 ${T('tabMoves')}</button><button class="tab gloss${shopTab === 'looks' ? ' on' : ''}" data-tab="looks">🎩 ${T('tabLooks')}</button></div><div class="mgrid${shopTab === 'looks' ? ' looks' : ''}">`;
    if (shopTab === 'looks') {
      for (const x of COSTUMES) {
        const owned = ownsLook(x), on = owned && (x.kind === 'hat' ? save.hat : save.skin) === x.id;
        const label = on ? '✓' : owned ? T('use') : `<span class="coin-ico"></span>${x.price}`;
        const ico = x.kind === 'skin' ? `<span class="swatch" style="background:${x.color}"></span>` : x.icon;
        html += `<button class="mcard look ${on ? 'on' : owned ? 'owned' : save.coins >= x.price ? 'afford' : 'lock'}" data-look="${x.id}"><span class="mico">${ico}</span><span class="mtag gloss">${label}</span></button>`;
      }
    } else html += card('👣', T('m_stomp'), '✓', 'owned basic', 'stomp');
    if (shopTab === 'moves') for (const m of cfg.moves || []) {
      const owned = m.price === 0 || save.owned.includes(m.id), on = save.equipped === m.id;
      const label = on ? T('inUse') : owned ? T('use') : `<span class="coin-ico"></span>${m.price}`;
      html += card(m.icon, T('m_' + m.id), label, on ? 'on' : owned ? 'owned' : save.coins >= m.price ? 'afford' : 'lock', m.id);
    }
    html += `</div><button class="again gloss out" id="shopPlay">${T('again')}</button>`;
    box.innerHTML = html;
    box.querySelectorAll('.mcard:not(.look)').forEach((b) => b.onclick = () => shopTap(b));
    box.querySelectorAll('.mcard.look').forEach((b) => b.onclick = () => lookTap(b));
    box.querySelectorAll('.tab').forEach((b) => b.onclick = () => { shopTab = b.dataset.tab; Sound.pop(); renderShop(); });
    box.querySelector('#shopPlay').onclick = () => { Sound.unlock(); newRound(); };
  }
  function lookTap(b) {
    const x = costume(b.dataset.look);
    if (!x) return;
    if (!ownsLook(x)) {
      if (save.coins < x.price) {
        b.classList.remove('shake'); void b.offsetWidth; b.classList.add('shake'); Sound.boing(); buzz('error');
        const rect = b.getBoundingClientRect(), rr = root.getBoundingClientRect();
        pop(T('need').replace('{n}', x.price - save.coins), (rect.left + rect.width / 2 - rr.left) / rr.width, (rect.top - rr.top) / rr.height, '#ff5a4f', 0.8);
        return;
      }
      save.coins -= x.price; save.wardrobe = [...(Array.isArray(save.wardrobe) ? save.wardrobe : []), x.id]; Sound.win(); buzz('success');
    } else { Sound.pop(); buzz('tick'); }
    if (x.kind === 'hat') save.hat = x.id; else save.skin = x.id;
    wearCostume(); bon.laugh(); persist(); renderShop();
    const card = $('shop').querySelector(`[data-look="${x.id}"]`); if (card) card.classList.add('bought');
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
    if (S.poseT > 0) {
      S.poseT -= dt; mag = 0; ix = iz = 0;
      let d = Math.atan2(camera.position.x - S.x, camera.position.z - S.z) - S.yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); S.yaw += d * Math.min(1, dt * 9);
      if (S.poseT <= 0) S.idle = 0;
    }
    if (mag) S.idle = 0; else S.idle += dt;
    // nobody steering: walk to the nearest building Bonbon can break (the game plays itself behind the Play card)
    if (!mag && S.dizzyT <= 0 && S.poseT <= 0 && (S.idle > cfg.idleAutoplaySec || !S.touched)) {
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
    const speed = MC.speed * (1 + MC.speedPerStage * (S.stage - 1)) * Math.sqrt(S.scale) * mag * (S.megaT > 0 ? ((EVC.candy && EVC.candy.speed) || 1.3) : 1);
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
      if (b.k > S.stage + (S.megaT > 0 ? 4 : 1)) {
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

  // ---------- sticker book: three special residents per city, one found per round (game_config.stickers)
  const stickerSet = (i) => ((cfg.stickers && cfg.stickers.sets) || {})[THEMES[i].id] || [];
  const stickerTotal = () => THEMES.reduce((n, t, i) => n + stickerSet(i).length, 0);
  const hasSticker = (id) => Array.isArray(save.stickers) && save.stickers.includes(id);
  /** A special resident floats out of the building: the next sticker of this city not found yet. */
  function giveSticker(x, z) {
    const set = stickerSet(S.theme), k = set.findIndex((_, i) => !hasSticker(THEMES[S.theme].id + i));
    if (k < 0) return;
    save.stickers = [...(Array.isArray(save.stickers) ? save.stickers : []), THEMES[S.theme].id + k]; persist();
    S.newSticker = set[k];
    const [sx, sy] = screenOf(x, 4, z); pop(set[k], sx, sy, '#fff', 2.4);
    banner(set[k] + ' ' + T('sticker'), 2.2, 2); Sound.win(); buzz('success'); bon.laugh(); city.releaseResidents(x, 3, z, 3);
  }
  function openAlbum() {
    const box = $('album'), n = THEMES.reduce((a, t, i) => a + stickerSet(i).filter((_, k) => hasSticker(t.id + k)).length, 0);
    box.innerHTML = `<div class="acard"><h2 class="out" dir="auto">📖 ${T('album')}</h2><div class="acount" dir="ltr">${n} / ${stickerTotal()}</div>
      ${THEMES.map((t, i) => stickerSet(i).length ? `<div class="arow"><span class="aico">${i < unlockedCount() ? t.icon : '🔒'}</span>${stickerSet(i).map((e, k) => `<span class="slot${hasSticker(t.id + k) ? ' got' : ''}">${hasSticker(t.id + k) ? e : '?'}</span>`).join('')}</div>` : '').join('')}
      <button class="again gloss out" id="albumClose">✓</button></div>`;
    box.hidden = false; Sound.pop();
    box.querySelector('#albumClose').onclick = () => { box.hidden = true; Sound.pop(); };
  }

  function drainEvents() {
    for (const e of city.events.splice(0)) {
      if (e.type === 'collapse') {
        hitCombo();
        if (S.touched && ++S.collapses === S.stickerAt) giveSticker(e.x, e.z);
        if (e.b === S.golden) { // caught in time
          const GC = EVC.golden || {}, gain = (GC.coins || 80) + (GC.coinsPerClass || 25) * e.b.k; S.bonusCoins += gain; S.coins += gain; hudCache.coins = null; S.golden = null; hideMarker('gold');
          city.burstConfetti(e.x, 4, e.z, 40, [0xffc531, 0xffe066, 0xffffff]); banner('⭐ +' + gain, 1.6, 1); Sound.win(); const [gx, gy] = screenOf(e.x, 3, e.z); flyCoins(gx, gy, 8);
        }
        comic(T(e.chain > 0 || e.b.k >= 5 ? 'w_kaboom' : e.b.k >= 3 ? 'w_crash' : 'w_bonk'), e.x, Math.min(e.b.h, 8), e.z, 0.75 + 0.12 * e.b.k + (e.chain > 0 ? 0.25 : 0));
        const label = e.chain > 0 ? T('domino') + ' ×' + (e.chain + 1) : '';
        score(PT.perClass * e.b.k * e.b.k, e.x, Math.min(e.b.h, 8), e.z, label);
        mission(e.b.h >= cfg.toppleMinHeight ? 'tower' : 'house'); if (S.rainbowT > 0) city.burstConfetti(e.x, 3, e.z, 18, [0xff5a4f, 0xffc531, 0x6fd64b, 0x3fa9ff, 0x9b6bff]); if (e.chain > 0) mission('domino', e.chain + 1);
        if (S.touched && (e.b.k >= (CN.collapseMinClass || 5) || e.chain >= 2) && S.time - lastCollapseCine > (CN.collapseEverySec || 9)) { lastCollapseCine = S.time; startCine('collapse', e.x, e.z, CN.collapseSec); }
        Sound.collapse(e.b.k); if (e.b.k >= 3) shake(0.1 + e.b.k * 0.05); S.hitstopT = FX.hitstopSec; buzz(e.b.k >= 3 ? 'thud' : 'tap');
        const [sx, sy] = screenOf(e.x, 2, e.z); flyCoins(sx, sy, e.b.k + 1); setTimeout(() => Sound.coin(e.b.k), 300);
        if (e.chain > 0) { bon.laugh(); if (e.chain + 1 > S.chainShown) { S.chainShown = e.chain + 1; banner(T('domino') + ' ×' + (e.chain + 1) + '!', 1.2); } }
      } else if (e.type === 'carLand') {
        fx.blast(e.x, e.z, 3.4 * S.scale, 0.3); comic(T('w_kaboom'), e.x, 3, e.z, 1.2);
        Sound.collapse(3); buzz('thud'); city.burstConfetti(e.x, 2, e.z, 14); mission('car');
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
        startCine('boss', army.boss.x, army.boss.z, CN.bossSec); bon.face('surprised', 1.2);
        banner(T('warn'), 1.8); $('bossName').textContent = bossName(); $('bossbar').hidden = false; hudCache.boss = null; Sound.roar(9); buzz('warning');
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

  const fmt = (n) => { try { return n.toLocaleString(lang, { numberingSystem: 'latn' }); } catch (e) { return String(n); } };
  /** The cheapest move not owned yet: how close the coins are to it (shown under the result). */
  function nextGoal() {
    const m = (cfg.moves || []).filter((x) => x.price > 0 && !save.owned.includes(x.id)).sort((a, b) => a.price - b.price)[0];
    if (!m) return null;
    const need = m.price - save.coins;
    return { icon: m.icon, p: Math.min(100, Math.round(save.coins / m.price * 100)), text: need > 0 ? T('need').replace('{n}', fmt(need)) : T('buy') + '!' };
  }
  /** Counts a number up over about a second with soft ticks. */
  function countUp(el, to) {
    if (!el) return;
    const round = S, t0 = performance.now(), dur = 1100; let ticks = 0;
    const step = (now) => {
      if (!alive || S !== round || !el.isConnected) return;
      const k = Math.min(1, (now - t0) / dur), v = Math.round(to * (1 - Math.pow(1 - k, 3)));
      el.textContent = fmt(v);
      if (Math.floor(k * 12) > ticks) { ticks = Math.floor(k * 12); Sound.pop(); }
      if (k < 1) requestAnimationFrame(step); else { el.classList.add('bump'); buzz('success'); }
    };
    requestAnimationFrame(step);
  }
  /** Posts lifetime blocks smashed and shows the top three under the result (names as plain text). */
  function postScore() {
    const round = S;
    Promise.resolve().then(() => lib.addPlayerScoreToLeaderboard(save.smashed)).catch(() => {})
      .then(() => lib.getTopNEntriesFromLeaderboard(3)).then((res) => {
        const list = res && Array.isArray(res.entries) ? res.entries.slice(0, 3) : [];
        const box = document.querySelector('#board');
        if (!alive || S !== round || !box || !list.length) return;
        box.innerHTML = '';
        list.forEach((e, i) => {
          const li = document.createElement('li'), nm = document.createElement('span'), sc = document.createElement('b');
          nm.textContent = ['🥇', '🥈', '🥉'][i] + ' ' + Array.from(String(e.username || '?')).slice(0, 16).join(''); nm.dir = 'auto';
          sc.textContent = fmt(Number(e.score) || 0); sc.dir = 'ltr';
          li.append(nm, sc); box.appendChild(li);
        });
        if (typeof res.userRank === 'number' && res.userRank > 3) { const li = document.createElement('li'); li.className = 'me'; li.textContent = '#' + res.userRank; box.appendChild(li); }
        box.hidden = false;
      }).catch(() => {});
  }
  function finish() {
    army.clearAll();
    hideMarker('gold'); hideMarker('candy'); candyMesh.visible = false; hud.classList.remove('fever'); if (S.megaT > 0 && S.rainbowT <= 0) bon.setRainbow(false); S.megaT = 0; S.scaleTarget = stageScale();
    S.finished = true; S.moving = false; S.combo = 0; $('hint').hidden = true; $('stick').hidden = true; $('skill').hidden = true;
    bon.face('win', 99); S.yaw = Math.atan2(camera.position.x - S.x, camera.position.z - S.z); Sound.win(); buzz('success');
    city.burstConfetti(S.x, 6 * S.scale, S.z, 60);
    const sec = Math.round(S.time), stars = starsFor(sec, cfg.starsTimeSec);
    const counts = S.touched; // the attract mode (nobody touched yet) shows the result but saves nothing
    // a best time only counts when the child played (almost) the whole city
    const isBest = counts && S.blocks0 < city.totalBlocks * 0.1 && (save.best === null || sec < save.best);
    if (isBest) save.best = sec;
    let newCity = -1;
    const blocks = city.totalBlocks - S.blocks0; // every block fell; those down before the first touch are not counted
    // the leaderboard ranks lifetime blocks smashed: it only grows, so every city played moves a child up
    if (counts) { save.coins += S.coins; save.bestCombo = Math.max(save.bestCombo, S.bestCombo); save.rounds = (save.rounds || 0) + 1; save.smashed = (save.smashed || 0) + blocks;
      // finishing the newest city opens the next one, which is picked for the next round
      const un = unlockedCount();
      if (!S.daily && S.theme === un - 1 && un < THEMES.length) { save.unlocked = un + 1; save.theme = un; newCity = un; }
      if (S.daily) {
        const d = S.day;
        if (save.dailyDay !== d) { save.dailyDay = d; save.dailyBest = sec; S.dailyBonus = (cfg.daily && cfg.daily.cityBonus) || 100; save.coins += S.dailyBonus; } // first today: bonus
        else save.dailyBest = Math.min(save.dailyBest === null ? sec : save.dailyBest, sec);
      }
      persist(); postScore(); }
    updateHud();
    const r = $('result');
    const mmss = Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0');
    const goal = nextGoal();
    r.innerHTML = `<div class="card">
      <h2 dir="auto">${S.daily ? '📅 ' + T('daily') : T('flat')}</h2>
      <div class="stars out">${[1, 2, 3].map((i) => `<span class="${i <= stars ? 'on' : ''}" style="animation-delay:${0.3 + i * 0.25}s">${i <= stars ? '★' : '☆'}</span>`).join('')}</div>
      <div class="smash"><b class="out" id="blk" dir="ltr">0</b><span dir="auto">${T('smashed')}</span></div>
      <div class="chips" dir="ltr"><span>⏱ ${mmss}</span><span>🚗 ${S.cars}</span><span>🎈 ${city.rescued()}</span><span>🔥 ×${comboMult(S.bestCombo, CB)}</span></div>
      <div class="earn"><span class="coin-ico"></span><b dir="ltr">+${S.coins + S.dailyBonus}</b>${S.dailyBonus ? `<span class="dbonus">📅 +${S.dailyBonus}</span>` : ''}</div>
      ${S.daily && counts && save.dailyBest !== null ? `<div class="total" dir="auto">${T('todayBest')} <b dir="ltr">${Math.floor(save.dailyBest / 60)}:${String(save.dailyBest % 60).padStart(2, '0')}</b></div>` : ''}
      ${counts ? `<div class="total" dir="auto">${T('total')} <b dir="ltr" id="tot">${fmt(save.smashed)}</b> 🧱</div>` : ''}
      ${isBest ? `<div class="best">${T('best')}</div>` : ''}
      ${goal ? `<div class="goal"><span class="gico">${goal.icon}</span><div class="gbar"><i style="width:${goal.p}%"></i></div><b dir="auto">${goal.text}</b></div>` : ''}
      <ol class="board" id="board" hidden></ol>
    </div>
    <div class="map" id="map"></div>
    <div class="cityname out" id="cityName" dir="auto"></div>
    <div class="endbtns"><button class="again gloss out" id="again">${T('again')}</button>
    <div class="row3"><button class="toshop gloss" id="toShop"><span class="coin-ico"></span> ${T('shop')}${canBuy() ? '<span class="badge">!</span>' : ''}</button>
    <button class="toalbum gloss" id="toAlbum" aria-label="${T('album')}">📖${S.newSticker ? `<span class="badge">${S.newSticker}</span>` : ''}</button></div></div>`;
    setTimeout(() => { if (!S.finished) return; r.hidden = false; hud.classList.add('ended'); $('langs').hidden = true; if (giftWaiting) dailyGift(); countUp(r.querySelector('#blk'), blocks); r.querySelector('#again').onclick = () => { Sound.unlock(); newRound(); }; r.querySelector('#toShop').onclick = () => { Sound.unlock(); openShop(); }; r.querySelector('#toAlbum').onclick = () => { Sound.unlock(); openAlbum(); };
    }, 1600);
    S.newCity = newCity; renderMap();
  }
  /** The daily gift: coming back on the next day grows a 7-day streak of coins; a missed day starts again. */
  function dailyGift() {
    if (mode !== 'play' || (new URLSearchParams(location.search).has('local') && !new URLSearchParams(location.search).has('daily'))) return; // dev runs skip it
    // mid-round the card waits for the result screen (it would cover the game while the clock runs)
    if (S && S.touched && !S.finished) { giftWaiting = true; return; }
    giftWaiting = false;
    const d = today(), lv = Number(save.lastDay), last = Number.isFinite(lv) ? Math.floor(lv) : null;
    if (last !== null && last >= d) return; // already today, or a clock set back: nothing to pay
    const streak = Math.max(0, Math.floor(Number(save.streak)) || 0);
    save.streak = last === d - 1 ? streak + 1 : 1; save.lastDay = d;
    // the gift grows for 7 days, then stays at the top while the streak lasts
    const R = (cfg.daily && cfg.daily.rewards) || [50, 80, 120, 160, 200, 260, 400], k = Math.min(save.streak, R.length) - 1, gift = Number(R[k]) || 0;
    save.coins += gift; persist(); hudCache.coins = null; updateHud();
    const box = $('gift');
    box.innerHTML = `<div class="acard"><h2 class="out" dir="auto">🎁 ${T('dailyGift')}</h2><div class="gday out" dir="auto">${T('dayN').replace('{n}', save.streak)}</div>
      <div class="gdays">${R.map((c, i) => `<span class="gd${i < k ? ' got' : i === k ? ' now' : ''}"><i>${i + 1}</i><b dir="ltr">${c}</b></span>`).join('')}</div>
      <div class="earn"><span class="coin-ico"></span><b dir="ltr">+${gift}</b></div><button class="again gloss out" id="giftOk">✓</button></div>`;
    box.hidden = false; buzz('success');
    box.querySelector('#giftOk').onclick = () => { box.hidden = true; Sound.unlock(); Sound.win(); }; // sound needs the tap that unlocks audio
  }
  /** The city map under the result: open cities can be picked for the next round, the newest one pulses. */
  function renderMap() {
    const box = $('map'), nm = $('cityName');
    if (!box || !S.finished) return;
    const doneToday = save.dailyDay === today();
    box.innerHTML = THEMES.map((t, i) => { const lock = i >= unlockedCount(); return `<button class="city gloss${!wantDaily && i === themeIndex() ? ' on' : ''}${lock ? ' locked' : ''}${i === S.newCity ? ' new' : ''}" data-c="${i}"${lock ? ' disabled' : ''} aria-label="${T('t_' + t.id)}">${lock ? '🔒' : t.icon}</button>`; }).join('')
      + `<button class="city daily gloss${wantDaily ? ' on' : ''}${doneToday ? '' : ' new'}" data-daily="1" aria-label="${T('daily')}">📅</button>`;
    nm.textContent = wantDaily ? '📅 ' + T('daily') : (S.newCity >= 0 && S.newCity === themeIndex() ? T('newCity') + ' ' : '') + T('t_' + THEMES[themeIndex()].id);
    box.querySelectorAll('.city:not(.locked)').forEach((b) => b.onclick = () => {
      Sound.unlock(); Sound.pop();
      if (b.dataset.daily) wantDaily = !wantDaily; else { wantDaily = false; save.theme = Number(b.dataset.c); persist(); }
      renderMap();
    });
  }

  const shakeV = new THREE.Vector3(), monV = new THREE.Vector3();
  let camOverride = null, frozen = false;
  // cinematic shots: the camera eases from the play view to a framed shot and back, with letterbox bars
  const CN = cfg.cine || {}, cine = { kind: '', t0: 0, dur: 0, x: 0, z: 0 }, cineP = new THREE.Vector3(), cineL = new THREE.Vector3();
  let lastCollapseCine = -99;
  /** Starts a shot ('boss', 'collapse', 'grow', 'mega') around world point x, z, unless one is playing or motion is reduced. */
  function startCine(kind, x, z, dur) {
    if (calm || !dur || camOverride) return;
    if (cine.kind && performance.now() / 1000 - cine.t0 < cine.dur && kind !== 'boss') return;
    Object.assign(cine, { kind, t0: performance.now() / 1000, dur, x, z });
  }
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
    if (cine.kind) { // blend toward the framed shot (eases in over the first quarter, out over the last)
      const k = (performance.now() / 1000 - cine.t0) / cine.dur, b = THREE.MathUtils.smoothstep(k, 0, 0.25) * (1 - THREE.MathUtils.smoothstep(k, 0.72, 1));
      if (k >= 1 || S.finished) { cine.kind = ''; hud.classList.remove('cine'); }
      else {
        const fx = Math.sin(S.yaw), fz = Math.cos(S.yaw);
        if (cine.kind === 'boss') { const bs = army.boss.scale || 1, dx = S.x - cine.x, dz = S.z - cine.z, dl = Math.hypot(dx, dz) || 1, d = (15 - k * 4) * bs;
          cineP.set(cine.x + dx / dl * d + dz / dl * 4 * bs, 5.5 * bs, cine.z + dz / dl * d - dx / dl * 4 * bs); cineL.set(cine.x, 5 * bs, cine.z); }
        else if (cine.kind === 'collapse') { cineP.lerpVectors(camPos, cineL.set(cine.x, 3 * z, cine.z), 0.32); cineP.x += Math.sin(k * 2) * 3 * z; cineL.set(cine.x, 2.5 * z, cine.z); }
        else if (cine.kind === 'grow') { cineP.set(S.x + fx * 8 * z - fz * 2.5 * z, 3.4 * z, S.z + fz * 8 * z + fx * 2.5 * z); cineL.set(S.x, 1.8 * z, S.z); }
        else { const m = 1.35 * z; cineP.set(S.x + fx * 10 * m + fz * 4 * m, 1.3 * m, S.z + fz * 10 * m - fx * 4 * m); cineL.set(S.x, 2.8 * m, S.z); } // mega: a low hero angle from the front
        camPos.lerp(cineP, b); camLook.lerp(cineL, b);
        hud.classList.toggle('cine', b > 0.05);
      }
    }
    S.trauma = Math.max(0, S.trauma - dt * 2.2);
    const sh = S.trauma * S.trauma * FX.shakeMax * z, tt = performance.now() / 1000;
    camera.position.copy(camPos).add(shakeV.set(Math.sin(tt * 23) * sh * 0.35, Math.sin(tt * 19 + 1) * sh * 0.25, 0));
    camera.lookAt(camLook);
    if (camOverride) { camera.position.copy(camOverride.p); camera.lookAt(camOverride.l); } // tests only: a fixed close-up
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
      if (tier < 2) { city.meshes.blocks.castShadow = false; if (edgeRT.samples) { edgeRT.samples = 0; edgeRT.dispose(); } } // the 4x target is rebuilt without MSAA
      if (tier === 0) { sun.castShadow = false; renderer.shadowMap.enabled = false; }
      frameTimes.length = 0;
    }
  }

  // ---------- loop
  let last = performance.now(), raf = 0, alive = true, fps = 0, ringShown = -1, drawn = 0;
  const SIM = Math.max(1, Math.min(8, +(params.get('speed') || 1))); // test runs only: more steps per frame
  function frame(now) {
    if (!alive) return;
    raf = requestAnimationFrame(frame);
    const raw = Math.min(0.11, (now - last) / 1000); last = now;
    if (++drawn === 3 && window.__load) window.__load.done(); // two frames on screen: the loading screen can go
    fps = fps * 0.95 + (1 / Math.max(raw, 0.001)) * 0.05;
    if (!frozen) for (let k = 0; k < SIM; k++) simulate(raw); // frozen: tests only, a still frame for close-ups
    updateCamera(raw); army.draw(); mfx.update(raw);
    bannerT -= raw; if (bannerT <= 0) $('banner').classList.remove('show');
    const ring = S.skillCd > 0 ? Math.ceil(S.skillCd / (S.skillCdMax || 1) * 20) / 20 : 0;
    if (ring !== ringShown) { ringShown = ring; $('ring').style.setProperty('--p', ring); $('skill').classList.toggle('ready', ring === 0); }
    renderer.setRenderTarget(edgeRT); renderer.render(scene, camera); // tone mapping happens in the edge pass
    renderer.setRenderTarget(null); renderer.render(edgeScene, edgeCam);
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
      Sound.musicRate(S.feverT > 0 || S.megaT > 0 ? 1.15 : army.boss.alive || army.stars >= 3 ? 1.08 : 1); eventsUpdate(raw);
      if (S.rainbowT > 0) { S.rainbowT -= raw; if (S.rainbowT <= 0 && S.megaT <= 0) bon.setRainbow(false); }
      S.jingleT -= raw; // an ice-cream truck nearby plays its tune now and then: a clue, never explained
      if (S.jingleT <= 0) { S.jingleT = 4; const t = city.iceTrucks().find((c) => Math.hypot(c.x - S.x, c.z - S.z) < 30 * Math.sqrt(S.scale)); if (t) Sound.jingle(); }
      drainEvents(); sweep(dt);
      // until the child has thrown a car once, a finger now and then points at a car Bonbon could pick up
      if (!save.threwCar && S.touched && S.stage >= 2 && (S.carTipT -= raw) <= 0) {
        S.carTipT = 4;
        const c = city.pickCar(S.x, S.z, (cfg.throwCar && cfg.throwCar.reach || 12) * Math.sqrt(S.scale) * 0.8);
        if (c) { const [sx, sy] = screenOf(c.x, 2.4, c.z); pop('👆', sx, sy, '#fff', 1.4); }
      }
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
    S.lookT -= dt;
    // left alone for a moment: Bonbon waves at the child (once each time)
    if (S.idle < 0.5) S.fidgeted = false; else if (S.touched && !S.fidgeted && S.idle > ((cfg.react && cfg.react.fidgetSec) || 2.2) && !bon.posing && !S.jump && !S.finished) { S.fidgeted = true; bon.pose('wave', 1.4); bon.face('happy', 1.4); }
    bon.update(dt, { moving: S.moving && !S.finished, speed: S.speed, lookAt: lookAt || (S.lookT > 0 ? S.lookP : null) });
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
  wearCostume();
  renderer.setRenderTarget(edgeRT); renderer.compile(scene, camera); renderer.setRenderTarget(null); // compile now, for the target the scene draws into, so the first frame does not stall
  renderer.compile(edgeScene, edgeCam);

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
      const dayMarks = { lastDay: save.lastDay, streak: save.streak, dailyDay: save.dailyDay, dailyBest: save.dailyBest };
      const roundsBefore = save.rounds || 0, smashedBefore = save.smashed || 0, unlockedBefore = unlockedCount(), themeBefore = save.theme, wardrobeBefore = save.wardrobe.slice(), stickersBefore = save.stickers.slice(), hatBefore = save.hat, skinBefore = save.skin;
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
        save.unlocked = Math.max(Number(st.unlocked) || 1, unlockedBefore); if (unlockedBefore > (Number(st.unlocked) || 1)) save.theme = themeBefore;
        save.stickers = [...new Set([...(Array.isArray(st.stickers) ? st.stickers : []), ...stickersBefore])];
        if (hatBefore !== 'none') save.hat = hatBefore; if (skinBefore !== 'pink') save.skin = skinBefore; // picked this session: keep wearing it
        save.wardrobe = [...new Set([...(Array.isArray(st.wardrobe) ? st.wardrobe : []), ...wardrobeBefore])];
        // day marks set this session before the save arrived are newer: keep them (no second gift or bonus)
        if (Number(dayMarks.lastDay) > (Number(st.lastDay) || -1)) { save.lastDay = dayMarks.lastDay; save.streak = dayMarks.streak; }
        if (Number(dayMarks.dailyDay) > (Number(st.dailyDay) || -1)) { save.dailyDay = dayMarks.dailyDay; save.dailyBest = dayMarks.dailyBest; }
        else if (Number(dayMarks.dailyDay) === Number(st.dailyDay) && dayMarks.dailyBest !== null) save.dailyBest = Math.min(Number(st.dailyBest) || Infinity, dayMarks.dailyBest);
        save.rounds = (Number(st.rounds) || 0) + roundsBefore; save.smashed = (Number(st.smashed) || 0) + smashedBefore;
        if (save.lang && LANGS.includes(save.lang)) { lang = save.lang; setDir(); }
      }
      // a player who did the tutorial before should not get it again just because the save arrived late
      if (save.tutorialDone && missions && missions.tutorial && !S.touched) missions = createMissions(rng, true, missionDone, levelOf);
      // nobody has touched yet: rebuild so a returning player sees the city after their last one
      if (save.rounds > 0 && roundsBefore === 0 && S && !S.touched && !S.finished) { const open = !$('langs').hidden; newRound(); $('langs').hidden = !open; }
      saveLoaded = true; dailyGift(); hudCache.coins = null; updateHud(); if (S && !S.finished) refreshSkill();
      if (earned > 0 || picked || ownedBefore.length || roundsBefore) persist();
      if (st && st.muted && !Sound.muted) Sound.setMuted(true);
      wearCostume();
      if (S && S.finished) {
        // a city finished before the save arrived: a "new" city that was already open is not new
        if (S.newCity >= 0 && st && (Number(st.unlocked) || 1) > S.newCity) S.newCity = -1;
        renderMap(); if (!$('shop').hidden) renderShop();
      }
      // a city finished before the save arrived: show and post the real all-time total
      if (roundsBefore && S && S.finished) { const t = document.querySelector('#tot'); if (t) t.textContent = fmt(save.smashed); postScore(); }
      { const ts = document.querySelector('#toShop'); if (ts && S.finished && canBuy() && !ts.querySelector('.badge')) ts.insertAdjacentHTML('beforeend', '<span class="badge">!</span>'); }
    }).catch(() => { /* the save could not be read: keep it safe by not writing over it this session */ });
  }
  raf = requestAnimationFrame(frame);

  return {
    destroy() {
      alive = false; cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp); window.removeEventListener('pointercancel', onUp);
      window.removeEventListener('keydown', onKey); window.removeEventListener('keyup', onKey); window.removeEventListener('blur', onBlur); root.removeEventListener('contextmenu', noMenu); document.removeEventListener('visibilitychange', onVis); Sound.stopMusic(); window.removeEventListener('resize', onResize);
      if (iconWatch) iconWatch.disconnect(); city.dispose(); army.dispose(); bon.dispose(); mfx.dispose(); candyMesh.traverse((o) => { if (o.isMesh) { o.geometry.dispose(); o.material.dispose(); } }); sky.geometry.dispose(); skyMat.dispose(); edgeRT.dispose(); edgeMat.dispose(); edgeQuad.geometry.dispose();
      renderer.dispose(); renderer.forceContextLoss(); root.innerHTML = '';
    },
    debug: {
      get S() { return S; }, get city() { return city; }, get army() { return army; }, get missions() { return missions; }, get save() { return save; }, openShop, openAlbum, fx, eventsUpdate: (dt) => eventsUpdate(dt), feverCheck: () => feverCheck(), startCine: (...a) => startCine(...a), get cine() { return cine; }, get posing() { return bon.posing; }, freeze(v) { frozen = !!v; }, closeUp(p, l) { camOverride = p ? { p: new THREE.Vector3(...p), l: new THREE.Vector3(...l) } : null; }, bossName: () => bossName(), dailyGift: () => dailyGift(), today: () => today(), get wantDaily() { return wantDaily; }, set wantDaily(v) { wantDaily = v; }, wear: () => wearCostume(), get skyTop() { return skyMat.uniforms.uTop.value.getHexString(); }, get textures() { return renderer.info.memory.textures; }, edgeMat, comic: (...a) => comic(...a), tapAt: (x, y) => tapAt(x, y), screenOfCar: (c) => { const [sx, sy] = screenOf(c.x, 0.8, c.z); const r = root.getBoundingClientRect(); return [r.left + sx * r.width, r.top + sy * r.height]; }, get hatOn() { return bon.hatOn; }, get tier() { return tier; }, get fps() { return fps; }, get lang() { return lang; },
      setLang(l) { lang = l; setDir(); }, T, Sound, newRound, finish, useSkill, input, renderer, camera,
      grow() { S.xp = xpFor(S.stage, G); score(0, S.x, 1, S.z); },
    },
  };
}

window.run = run;

// Outside Astrocade (?local): stand in for the host, read the config file and start.
if (typeof location !== 'undefined' && new URLSearchParams(location.search).has('local') && !window.lib) {
  const none = async () => ({});
  window.lib = { showGameParameters() {}, log() {}, getUserGameState: none, saveUserGameState: none, addPlayerScoreToLeaderboard: none, getTopNEntriesFromLeaderboard: none,
    shouldUseTouchControls: () => matchMedia('(pointer: coarse)').matches, haptics: { play() {}, start() {}, stop() {} } };
  Promise.all([fetch('./game_config.json').then((r) => r.json()), fetch('./asset_map.json').then((r) => r.json()).catch(() => ({}))]).then(([c, assets]) => {
    window.lib.getAsset = (id) => assets[id];
    window.gameConfig = c; run(new URLSearchParams(location.search).get('mode') || 'play');
  });
}
