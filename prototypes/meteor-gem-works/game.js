// PROTOTYPE - NOT FOR PRODUCTION
// Meteor Gem Works, chapter 1: drag to walk a little miner around a crater town; swing at
// the crystal meteor for chunks, carry them to a polisher, bring the gems to a glass stand, tourists buy them, scoop
// the coins and pay the price pads: drill rig, conveyor + polisher 2, stand 2, the armadillo shopkeeper, the canyon
// road with its tour bus, the ring workshop and the laser cutter. Tap the sparkle for a Perfect Strike; eggs hatch six
// critters that follow in a parade with a perk each; a kid asks for an item now and then (no timer); Crystal Rush
// rains pickups. Progress saves through lib.saveUserGameState; a 3 s cold open greets a new game.
// Then seven more unlocks (the ghost town and its mine cart, drill rig 2, the cable car, the stargazer
// deck, the crown jeweler, neon signs, the heart of the meteor), rare eggs (12 critters), town stars, hats, the
// sticker album, the finale with its comet, a share button at the big moments, and a goal on screen at all times.
// Chapter 2 (behind drops.ch2): the cable car rides to the Frost Comet valley, a second town with its own pads, eggs
// and finale; the critter parade, hats and wallet travel along. Each place keeps its own state; the save holds both.
// Modules: logic.js (rules), models.js (geometry), scene.js (3D look, Three.js r187 loaded by index.html).
/* global THREE */ // set on window by index.html before run() starts the game
import * as L from './logic.js';
import { createScene, drawIcon } from './scene.js';

const LANGS = ['en', 'ar', 'es', 'vi', 'hi', 'bn', 'id'];
const PENTA = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24, 26, 28];

// ---------------------------------------------------------------- sound: all made in code, no files to load
const Sound = (() => {
  let ctx = null, master = null, noise = null, muted = false, far = 1; // far: distance gain for the next sounds (see at)
  const ensure = () => {
    if (ctx) return ctx;
    try { ctx = new (window.AudioContext || window.webkitAudioContext)(); master = ctx.createGain(); master.gain.value = muted ? 0 : 0.7; master.connect(ctx.destination); } catch (e) { ctx = null; }
    if (ctx) { noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate); const d = noise.getChannelData(0); let s = 1; for (let i = 0; i < d.length; i++) { s = (s * 16807) % 2147483647; d[i] = s / 1073741823.5 - 1; } }
    return ctx;
  };
  let toyN = 0;
  function tone(type, f0, f1, dur, vol, at = 0) {
    const t = ctx.currentTime + at, o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol * far), t + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(master); o.start(t); o.stop(t + dur + 0.02);
  }
  function hiss(f, q, dur, vol, at = 0) {
    const t = ctx.currentTime + at, s = ctx.createBufferSource(), fl = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noise; fl.type = 'bandpass'; fl.frequency.value = f; fl.Q.value = q;
    g.gain.setValueAtTime(Math.max(0.0002, vol * far), t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(fl).connect(g).connect(master); s.start(t, (at * 7.3) % 0.5); s.stop(t + dur + 0.02);
  }
  const note = (n, base = 880) => base * 2 ** (PENTA[Math.max(0, Math.min(PENTA.length - 1, n))] / 12);
  const on = () => ctx && !muted;
  return {
    unlock() { if (ensure() && ctx.state === 'suspended') ctx.resume(); },
    get muted() { return muted; },
    /** Sounds from a spot far from the hero are quieter in the wide town: k (0..1) applies until the next at(). */
    at(k) { far = k; return this; },
    setMuted(m) { muted = m; if (master) master.gain.value = m ? 0 : 0.7; },
    /** Pickaxe on crystal rock: a dull knock with a glassy ping on top. */
    hit() { if (!on()) return; tone('sine', 190, 80, 0.16, 0.35); hiss(1400, 1.5, 0.12, 0.18); tone('triangle', 1980 + Math.random() * 300, 1900, 0.18, 0.05, 0.01); },
    /** Perfect Strike: a deep boom and a rising crystal chord. */
    perfect() { if (!on()) return; tone('sine', 110, 40, 0.6, 0.5); hiss(900, 0.7, 0.4, 0.25); [0, 4, 7, 12, 16].forEach((n, i) => tone('triangle', 523 * 2 ** (n / 12), 523 * 2 ** (n / 12), 0.4, 0.09, 0.05 + i * 0.05)); },
    glint() { if (!on()) return; [0, 7, 12].forEach((n, i) => tone('sine', 1760 * 2 ** (n / 12), 1760 * 2 ** (n / 12), 0.25, 0.035, i * 0.07)); },
    /** One item onto the stack: a tick that climbs with the stack height n. */
    pick(n, gem) { if (!on()) return; tone(gem ? 'triangle' : 'sine', note(Math.floor(n / 2), gem ? 1046 : 660), note(Math.floor(n / 2), gem ? 1046 : 660), 0.06, 0.06); },
    drop(n) { if (!on()) return; tone('sine', note(Math.floor(n / 2), 520), note(Math.floor(n / 2), 420), 0.07, 0.05); },
    gem() { if (!on()) return; tone('triangle', 1568, 1568, 0.25, 0.07); tone('sine', 2349, 2349, 0.3, 0.04, 0.06); },
    sale() { if (!on()) return; tone('square', 1318, 1318, 0.07, 0.04); tone('square', 1760, 1760, 0.14, 0.04, 0.07); hiss(6000, 1, 0.12, 0.05, 0.05); },
    coin(k) { if (!on()) return; tone('triangle', note(k % 8, 1318), note(k % 8, 1318), 0.05, 0.04); },
    pay(k) { if (!on()) return; tone('triangle', 880 * 2 ** Math.min(2, k / 20), 880 * 2 ** Math.min(2, k / 20), 0.05, 0.04); },
    fanfare() { if (!on()) return; [0, 4, 7, 12, 16, 19, 24].forEach((n, i) => { tone('triangle', 392 * 2 ** (n / 12), 392 * 2 ** (n / 12), 0.35, 0.1, i * 0.07); tone('sine', 196 * 2 ** (n / 12), 196 * 2 ** (n / 12), 0.4, 0.05, i * 0.07); }); tone('sine', 90, 40, 0.8, 0.35); },
    whoosh() { if (!on()) return; const t = ctx.currentTime, s = ctx.createBufferSource(), fl = ctx.createBiquadFilter(), g = ctx.createGain(); s.buffer = noise; s.loop = true; fl.type = 'bandpass'; fl.Q.value = 1.3; fl.frequency.setValueAtTime(2400, t); fl.frequency.exponentialRampToValueAtTime(260, t + 0.9); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.3, t + 0.4); g.gain.exponentialRampToValueAtTime(0.0001, t + 1); s.connect(fl).connect(g).connect(master); s.start(t); s.stop(t + 1.05); tone('sine', 70, 40, 0.5, 0.3, 0.9); },
    crack(k) { if (!on()) return; hiss(2200 + k * 500, 3, 0.08, 0.2); tone('triangle', 900 + k * 200, 700, 0.08, 0.05); },
    pop() { if (!on()) return; tone('sine', 300, 900, 0.12, 0.15); },
    step() { if (!on()) return; hiss(700, 1.2, 0.05, 0.035); },
    /** Tour bus horn: two friendly toots. */
    honk() { if (!on()) return; for (const at of [0, 0.22]) { tone('square', 392, 380, 0.18, 0.06, at); tone('square', 494, 480, 0.18, 0.05, at); } },
    laser() { if (!on()) return; tone('sawtooth', 1400, 500, 0.3, 0.03); hiss(3000, 2, 0.25, 0.06); },
    ring() { if (!on()) return; tone('sine', 2093, 2093, 0.35, 0.05); tone('triangle', 3136, 3136, 0.25, 0.03, 0.05); },
    toy() { if (!on()) return; const b = [0, 2, 4, 5, 7, 9, 12][toyN++ % 7]; [0, 4, 7].forEach((n, i) => tone('triangle', 523 * 2 ** ((b + n) / 12), 523 * 2 ** ((b + n) / 12), 0.28, 0.06, i * 0.05)); },
    heart() { if (!on()) return; [0, 4, 7, 12].forEach((n, i) => tone('triangle', 784 * 2 ** (n / 12), 784 * 2 ** (n / 12), 0.22, 0.07, i * 0.06)); },
    rush() { if (!on()) return; tone('sine', 80, 40, 0.9, 0.4); [0, 5, 7, 12, 17, 19, 24].forEach((n, i) => tone('triangle', 330 * 2 ** (n / 12), 330 * 2 ** (n / 12), 0.25, 0.07, i * 0.05)); },
    boom() { if (!on()) return; tone('sine', 90, 28, 1.2, 0.6); hiss(400, 0.6, 1.0, 0.35); hiss(2400, 1, 0.4, 0.15, 0.02); },
  };
})();

/** Game font faces from the asset map: [asset id, family, unicode range] (the shared Baloo set, OFL 1.1). */
const FONTS = [
  ['font_baloo2_latin', 'Baloo 2', 'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+2074,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD'],
  ['font_baloo2_latin_ext', 'Baloo 2', 'U+0100-02AF,U+0304,U+0308,U+0329,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF'],
  ['font_baloo2_vietnamese', 'Baloo 2', 'U+0102-0103,U+0110-0111,U+0128-0129,U+0168-0169,U+01A0-01A1,U+01AF-01B0,U+0300-0301,U+0303-0304,U+0308-0309,U+0323,U+0329,U+1EA0-1EF9,U+20AB'],
  ['font_baloo2_devanagari', 'Baloo 2', 'U+0900-097F,U+1CD0-1CF9,U+200C-200D,U+20A8,U+20B9,U+20F0,U+25CC,U+A830-A839,U+A8E0-A8FF,U+11B00-11B09'],
  ['font_baloo_da2_bengali', 'Baloo Da 2', 'U+0951-0952,U+0964-0965,U+0980-09FE,U+1CD0,U+1CD2,U+1CD5-1CD6,U+1CD8,U+1CE1,U+1CEA,U+1CED,U+1CF2,U+1CF5-1CF7,U+200C-200D,U+20B9,U+25CC,U+A8F1'],
  ['font_baloo_bhaijaan2_arabic', 'Baloo Bhaijaan 2', 'U+0600-06FF,U+0750-077F,U+0870-088E,U+0890-0891,U+0898-08E1,U+08E3-08FF,U+200C-200E,U+2010-2011,U+204F,U+2E41,U+FB50-FDFF,U+FE70-FE74,U+FE76-FEFC'],
];
let fontsAdded = false;
function loadFonts() {
  if (fontsAdded || typeof FontFace === 'undefined' || !document.fonts) return; fontsAdded = true;
  for (const [id, family, unicodeRange] of FONTS) {
    let a = null; try { a = lib.getAsset(id); } catch (e) { /* no asset map */ }
    if (a && a.url) try { document.fonts.add(new FontFace(family, `url(${a.url}) format('woff2')`, { weight: '800', display: 'swap', unicodeRange })); } catch (e) { /* bad face: fallback font */ }
  }
}

const HTML = `
<canvas id="cv"></canvas>
<div class="hud">
  <div id="cine" class="cine"><i></i><i></i></div>
  <div id="spot" class="spot"><i></i></div>
  <div class="top"><div id="cash" class="chip cash"><i class="coin" aria-hidden="true"></i><b id="cashN" class="out">0</b></div>
  <div id="next" class="next" hidden><canvas width="96" height="96" aria-hidden="true"></canvas><span class="bar"><i></i></span><b class="out"></b></div></div>
  <div id="bubble" class="bubble" hidden><canvas width="96" height="96" aria-hidden="true"></canvas><em>&#9829;</em></div>
  <div id="edge" class="edge" hidden><i aria-hidden="true"></i></div>
  <div id="tap" class="tap" hidden><i aria-hidden="true"></i><b class="out"></b></div>
  <button id="mute" class="mute" aria-label="sound"><svg viewBox="0 0 48 48" aria-hidden="true"><path class="spk" d="M9 19h7l10-8v26l-10-8H9z"/><path class="wav" d="M31 17c3 2 4 4.5 4 7s-1 5-4 7M35 12c5 3.5 7 7.5 7 12s-2 8.5-7 12"/><path class="x" d="M31 18l11 12M42 18L31 30"/></svg></button>
  <div id="carry" class="carry out" hidden></div>
  <div id="pops"></div>
  <div id="banner" class="banner" hidden><b class="bt out"></b><span class="bs out"></span></div>
  <div id="coach" class="coach" hidden><canvas width="64" height="64" aria-hidden="true"></canvas><b class="out"></b><button id="ftSkip" class="skip" aria-label="skip"><svg viewBox="0 0 48 48" aria-hidden="true"><path d="M14 14l20 20M34 14L14 34"/></svg></button></div>
  <div id="hint" class="hint"><i class="hand" aria-hidden="true"></i><b class="out"></b></div>
  <div id="stick" class="stick" hidden><i></i></div>
  <div id="goal" class="goal" hidden><b class="gt out"></b><span class="gh"><i></i><i></i><i></i></span></div>
  <button id="albumB" class="albumB" aria-label="album"><svg viewBox="0 0 48 48" aria-hidden="true"><path d="M10 8h24a4 4 0 0 1 4 4v28H14a4 4 0 0 1-4-4z"/><path class="pg" d="M14 40a4 4 0 0 1 0-8h24"/><path class="st" d="M24 13l2.6 5.4 5.9.8-4.3 4.1 1 5.8-5.2-2.8-5.2 2.8 1-5.8-4.3-4.1 5.9-.8z"/></svg><em class="out"></em></button>
  <button id="toy" class="toy" aria-label="cheer"><svg viewBox="0 0 48 48" aria-hidden="true"><path d="M8 30c4-3 9-4 16-4s12 1 16 4c-2 3-8 5-16 5s-14-2-16-5z"/><path d="M15 27c0-8 3-14 9-14s9 6 9 14"/><path class="sp" d="M24 4v4M36 8l-3 3M12 8l3 3M42 18h-4M6 18h4"/></svg></button>
  <button id="share" class="share out" hidden><svg viewBox="0 0 48 48" aria-hidden="true"><path d="M24 30V8M15 16l9-9 9 9"/><path d="M12 24v14h24V24"/></svg><b></b></button>
  <div id="album" class="album" hidden><div class="card"><h2 class="out"></h2><div class="sec crit"></div><div class="sec hats"></div><div class="sec stars"></div><div class="sec chap"></div><button class="close out" aria-label="close">&#10005;</button></div></div>
  <div id="ride" class="ride" hidden><canvas width="160" height="120" aria-hidden="true"></canvas><b class="out"></b><span class="out"></span></div>
  <div id="menu" class="menu" hidden><h1 class="out"></h1><button id="cont" class="go out"></button><button id="newg" class="new out"></button></div>
</div>`;

/** Starts the game in mode 'play' or 'edit' (edit: a live picture played by the guide, no input). Returns { destroy, debug }. */
export function run(mode = 'play') {
  if (window.__mg) { try { window.__mg.destroy(); } catch (e) { console.warn('previous run', e); } }
  if (typeof THREE === 'undefined') {
    const again = () => { removeEventListener('three-ready', again); window.__mg = run(mode); };
    addEventListener('three-ready', again);
    const wait = { destroy() { removeEventListener('three-ready', again); if (window.__mg === wait) window.__mg = null; } };
    window.__mg = wait;
    return wait;
  }
  let cfg = JSON.parse(JSON.stringify(window.gameConfig || {})); // the active place's config (chapter 2 swaps it)
  // the host's settings panel: a few feel values the creator can tune (applied on the next run)
  if (typeof lib !== 'undefined' && lib.showGameParameters) lib.showGameParameters({ name: 'Meteor Gems', params: {
    'Walk speed': { key: 'hero.speed', type: 'slider', min: 6, max: 16, step: 0.5 },
    'Carry limit': { key: 'hero.carry', type: 'slider', min: 10, max: 40, step: 1 },
    'Camera tilt': { key: 'camera.pitch', type: 'slider', min: 0.45, max: 0.85, step: 0.01 },
    'Camera height': { key: 'camera.ahead', type: 'slider', min: 3, max: 9, step: 0.5 },
  } });
  loadFonts();
  const qs = new URLSearchParams(location.search);
  // dev:start
  if (qs.has('drops')) for (const k of qs.get('drops').split(',')) if (cfg.drops && k in cfg.drops) cfg.drops[k] = true;
  // dev:end
  L.applyDrops(cfg);
  const C1 = cfg; let C2 = null; // the desert and, once visited, the Frost Comet valley
  const root = document.getElementById('app');
  root.innerHTML = HTML;
  const $ = (id) => root.querySelector('#' + id);
  const detect = () => { for (const l of navigator.languages || [navigator.language || 'en']) { const k = String(l).slice(0, 2).toLowerCase(); if (LANGS.includes(k)) return k; } return 'en'; };
  const lang = qs.get('lang') && LANGS.includes(qs.get('lang')) ? qs.get('lang') : detect();
  const T0 = (k) => (cfg.strings[lang] || cfg.strings.en)[k] || cfg.strings.en[k];
  const T = (k) => String((cfg.area === 'frost' && T0('f_' + k)) || T0(k) || k); // the valley names its places with f_ keys
  root.dir = lang === 'ar' ? 'rtl' : 'ltr';
  $('hint').querySelector('b').textContent = T('drag');
  if (qs.has('bot') || mode === 'edit') $('hint').classList.add('gone');
  const muteUI = () => $('mute').classList.toggle('off', Sound.muted);
  muteUI();

  let scene;
  try { scene = createScene($('cv'), cfg, L.rng(cfg.seed + 101)); } catch (e) {
    console.warn('webgl', e); root.innerHTML = '';
    if (window.__load) window.__load.fail('GL'); return { destroy() {} };
  }
  let tier = qs.has('tier') ? Number(qs.get('tier')) : cfg.quality.start;
  scene.setTier(tier);
  let qa = { tier, rs: 1, okT: 0, fails: [] };
  scene.setTod(qs.has('tod') ? Number(qs.get('tod')) : cfg.tod.start);
  const bot = qs.has('bot') || mode === 'edit';
  const buzz = (fx) => { if (!bot && typeof lib !== 'undefined' && lib.haptics) lib.haptics.play(fx); }; // a felt tick on physical moments
  let S = L.createState(cfg, cfg.seed), S1 = S, S2 = null, area = 'desert';
  const leftAt = { desert: 0, frost: 0 };

  // ---- layout: --u is the design scale (1 at 720 x 1280)
  let hudB = 0.17, uH = 1 / 1280; // bottom of the HUD's button column (screen fraction), and one design unit as a height fraction
  function layout() {
    const r = root.getBoundingClientRect(); root.style.setProperty('--u', Math.min(r.height / 1280, r.width / 720).toFixed(4)); // tall phones fill the screen; the HUD keeps its 720-wide design
    scene.resize(Math.max(1, Math.round(r.width)), Math.max(1, Math.round(r.height)));
    const ab = $('toy').getBoundingClientRect(), u = Math.min(r.height / 1280, r.width / 720);
    hudB = r.height > 0 && ab.height > 0 ? (ab.bottom - r.top + 16 * u) / r.height : 0.17; uH = r.height > 0 ? u / r.height : 1 / 1280;
  }
  layout();
  const ro = new ResizeObserver(layout); ro.observe(root);

  // ---- input: drag anywhere = joystick (screen up walks toward the meteor); WASD / arrows; a tap on the sparkle
  const stick = { on: false, id: -1, x0: 0, y0: 0, x: 0, y: 0, moved: false, t0: 0 }, keys = new Set();
  let tapGlint = false, touched = false;
  const R = () => 70 * (root.getBoundingClientRect().height / 1280) + 20;
  const showStick = () => { const el = $('stick'), r = root.getBoundingClientRect(); el.hidden = !stick.on || !stick.moved; el.style.left = (stick.x0 - r.left) + 'px'; el.style.top = (stick.y0 - r.top) + 'px'; const dx = stick.x - stick.x0, dy = stick.y - stick.y0, l = Math.hypot(dx, dy), m = Math.min(l, R()); el.firstChild.style.transform = `translate(${l ? (dx / l) * m : 0}px, ${l ? (dy / l) * m : 0}px)`; };
  const onDown = (e) => {
    if (mode !== 'play' || e.target.closest('button')) return;
    Sound.unlock();
    if (phase === 'intro') { scene.skipIntro(); phase = 'play'; } // any touch skips the cold open and the same drag walks
    if (phase !== 'play') return;
    if (stick.on) return; Object.assign(stick, { on: true, id: e.pointerId, x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY, moved: false, t0: performance.now() });
    try { root.setPointerCapture(e.pointerId); } catch (er) { /* synthetic pointer */ }
  };
  const onMove = (e) => { if (!stick.on || e.pointerId !== stick.id) return; stick.x = e.clientX; stick.y = e.clientY; if (Math.hypot(stick.x - stick.x0, stick.y - stick.y0) > 10) stick.moved = true; showStick(); };
  const onUp = (e) => {
    if (!stick.on || e.pointerId !== stick.id) return;
    if (!stick.moved && performance.now() - stick.t0 < 400) tryGlint(e.clientX, e.clientY);
    stick.on = false; showStick();
  };
  function tryGlint(cx, cy) {
    const g = scene.glint; if (!g) return false;
    const [sx, sy] = scene.toScreen(g.x, g.y, g.z), r = root.getBoundingClientRect(), u = r.height / 1280;
    if (Math.hypot(sx * r.width + r.left - cx, sy * r.height + r.top - cy) < Math.max(44, cfg.glint.tapPx * u * 1.6)) { tapGlint = true; return true; }
    return false;
  }
  root.addEventListener('pointerdown', onDown); root.addEventListener('pointermove', onMove); root.addEventListener('pointerup', onUp); root.addEventListener('pointercancel', onUp);
  const onKey = (e) => { const k = e.key.toLowerCase(); if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 'a', 's', 'd', ' '].includes(k)) { e.preventDefault(); Sound.unlock(); if (e.type === 'keydown') { keys.add(k); if (phase === 'intro') { scene.skipIntro(); phase = 'play'; } else if (k === ' ' && scene.glint && phase === 'play') tapGlint = true; } else keys.delete(k); } };
  addEventListener('keydown', onKey); addEventListener('keyup', onKey);
  $('mute').addEventListener('click', () => { Sound.unlock(); Sound.setMuted(!Sound.muted); muteUI(); });
  function readInput() {
    let x = 0, z = 0;
    if (stick.on && stick.moved) { const dx = stick.x - stick.x0, dy = stick.y - stick.y0, l = Math.hypot(dx, dy), m = Math.min(1, l / R()); if (l > 4) { x = (dx / l) * m; z = (dy / l) * m; } }
    if (keys.has('arrowleft') || keys.has('a')) x -= 1; if (keys.has('arrowright') || keys.has('d')) x += 1;
    if (keys.has('arrowup') || keys.has('w')) z -= 1; if (keys.has('arrowdown') || keys.has('s')) z += 1;
    const l = Math.hypot(x, z); if (l > 1) { x /= l; z /= l; }
    if (root.dir === 'rtl') { /* the world is not mirrored: right is right for every language */ }
    return { x, z };
  }

  // ---- HUD helpers: pops are pooled DOM nodes (no textures per event), banner, carry label, cash chip
  const popEls = []; for (let i = 0; i < 14; i++) { const d = document.createElement('div'); d.className = 'pop out'; d.hidden = true; $('pops').appendChild(d); popEls.push({ d, t: 0, x: 0, y: 0, z: 0, life: 1 }); }
  let popNext = 0;
  function pop(text, x, y, z, cls = '', col = '') { const p = popEls[popNext]; popNext = (popNext + 1) % popEls.length; p.d.textContent = text; p.d.className = 'pop out ' + cls; p.d.style.color = col; p.d.hidden = false; Object.assign(p, { t: 0, x, y, z, life: cls === 'big' ? 1.4 : 0.9 }); }
  let bannerT = 0; const bannerQ = [];
  function banner(title, sub, sec = 2.4) {
    if (bannerT > 0.4) { bannerQ.push([title, sub, sec]); return; } // two big moments at once: the second waits its turn
    const b = $('banner'); b.querySelector('.bt').textContent = title; b.querySelector('.bs').textContent = sub || ''; b.hidden = false; b.classList.remove('go'); void b.offsetWidth; b.classList.add('go'); bannerT = sec; }
  let shownCash = 0, cashBump = 0;
  const cashEl = $('cashN');
  const bumpEl = (el) => { el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); };

  // ---- events from the logic -> flyers, bursts, sounds, pops
  const mineLon = Math.atan2(cfg.world.mine.x - cfg.world.meteor.x, cfg.world.mine.z - cfg.world.meteor.z);
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const padDef = (id) => cfg.pads.find((p) => p.id === id);
  const critterName = (id) => T(id === 'pebble' ? 'pup' : id);
  const perkText = (id) => { const d = cfg.critters.find((c) => c.id === id); return d ? T('perk' + d.perk[0].toUpperCase() + d.perk.slice(1)) : ''; };
  const polN = (id) => (S.pols.find((p) => p.id === id) || { polIn: 0 }).polIn, standN = (id) => (S.stands.find((p) => p.id === id) || { items: [] }).items.length;
  let coinK = 0;
  // ---- cinematic beats: the camera eases to the moment, time slows (or stops for a blink), letterbox bars and a soft
  // vignette slide in, then everything eases back. pri 2 = story beat (always plays), 1 = big moment (waits out the
  // cooldown), 0 = small moment (only when the camera is free). Input keeps working the whole time.
  const cine = { until: -1, cool: -1, pri: 0, slow: 0, stop: 0, bars: 0 };
  function moment(p, zoom, sec, pri = 1, o = {}) {
    const C = cfg.cine, t = S.t;
    if (pri < 2 && (t < cine.cool || (t < cine.until && pri <= cine.pri))) return false;
    // key beats push in past the normal framing so the subject fills the frame; locked finale shots keep their own framing
    scene.showcase(p, pri >= 1 && !o.lock ? zoom * C.push : zoom, sec, o.pitch || 0, !!o.lock);
    if (pri >= 1) { scene.burst(p.clone(), 1.6, 10); scene.ring(p.clone().setY(0.3), 0xffe9a8, 0.4, 3.2, 0.6); }
    cine.until = t + sec; cine.pri = pri; cine.cool = t + sec + C.gap * (pri === 0 ? 2 : 1);
    cine.slow = Math.max(cine.slow, o.slow ?? (pri >= 1 ? C.slow : 0)); cine.stop = Math.max(cine.stop, o.stop || 0); cine.bars = Math.max(cine.bars, sec);
    if (o.sting !== false) Sound.whoosh();
    return true;
  }
  /** Real seconds -> game seconds while a beat slows or stops time. */
  function timeK(real) {
    if (cine.stop > 0) { cine.stop -= real; return 0; }
    if (cine.slow > 0) { cine.slow -= real; return cfg.cine.slowK; }
    return 1;
  }
  function onEvent(e) {
    if (area === 'desert') ftDone |= L.ftueBit(cfg, e);
    const h = S.hero;
    switch (e.type) {
      case 'hit': {
        const p = scene.hit(mineLon + (Math.random() - 0.5) * 0.35, 0.08 + Math.random() * 0.3); Sound.hit(); buzz('tap');
        for (let i = 0; i < e.n; i++) scene.fly('chunk', p, 'pile', () => Math.max(0, S.pile - 1), 0.05 + i * 0.06, 2.2);
        break;
      }
      case 'perfect': {
        const p = scene.hit(e.lon, e.lat, true); Sound.perfect(); buzz('thud');
        for (let i = 0; i < e.n; i++) scene.fly('chunk', p, 'pile', () => Math.max(0, S.pile - 1), 0.1 + i * 0.08, 3.2);
        pop(T('perfect'), p.x, p.y + 1.2, p.z, 'big'); glintsHit++; cine.stop = Math.max(cine.stop, cfg.cine.stop); cine.slow = Math.max(cine.slow, cfg.cine.slow * 0.6);
        break;
      }
      case 'glint': scene.glintOn(e.lon, e.lat); Sound.glint(); break;
      case 'glintGone': scene.glintOff(); break;
      case 'rig2Hit': { const p = scene.rigHit(1); for (let i = 0; i < e.n; i++) scene.fly('chunk', p, 'pile', () => Math.max(0, S.pile - 1), 0.1 + i * 0.08, 2.6); break; }
      case 'rigHit': { const p = scene.rigHit(); for (let i = 0; i < e.n; i++) scene.fly('chunk', p, 'pile', () => Math.max(0, S.pile - 1), 0.1 + i * 0.08, 2.6); break; }
      case 'laserHit': { const p = scene.laserHit(); Sound.laser(); for (let i = 0; i < e.n; i++) scene.fly('chunk', p, 'pile', () => Math.max(0, S.pile - 1), 0.15 + i * 0.08, 3.0); break; }
      case 'conv': scene.fly('chunk', scene.slot('pile', Math.max(0, S.pile), V()), 'pol:' + e.to, () => Math.max(0, polN(e.to) - 1), 0, 0.8, () => scene.bump(e.to), scene.beltPath(e.to)); break;
      case 'pick': {
        const from = e.from === 'pile' ? scene.slot('pile', Math.max(0, S.pile), V()) : e.from === 'workshop' ? scene.slot('wsR', Math.max(0, S.ws.rings), V()) : scene.slot('counter', Math.max(0, S.counter), V());
        scene.fly(e.kind, from, 'stack', () => Math.max(0, h.n - 1), 0, 0.7); Sound.pick(e.n, e.kind !== 'chunk');
        break;
      }
      case 'drop': {
        const from = scene.slot('stack', h.n, V()), kind = e.kind || (e.at === 'workshop' ? 'gem' : 'chunk');
        if (S.pols.some((p) => p.id === e.at)) scene.fly(kind, from, 'pol:' + e.at, () => Math.max(0, polN(e.at) - 1), 0, 0.9, () => scene.bump(e.at));
        else if (S.stands.some((p) => p.id === e.at)) scene.fly(kind, from, 'stand:' + e.at, () => Math.max(0, standN(e.at) - 1), 0, 0.9, () => scene.bump(e.at));
        else if (e.at === 'workshop') scene.fly(kind, from, 'ws', () => Math.max(0, S.ws.gemsIn - 1), 0, 0.9, () => scene.bump('workshop'));
        else if (e.at === 'cart') scene.fly('gem', from, 'cart', () => Math.max(0, S.ghost.n - 1), 0, 1.0, (p) => scene.twinkle(p, 3, 0xfff0c0, 0.35));
        else scene.fly(kind, from, 'crate', () => 0, 0, 0.9, (p) => { scene.bump('crate'); scene.fly('coin', p, 'cash', () => Math.max(0, S.cashPile - 1), 0, 1.6); });
        Sound.drop(h.n);
        break;
      }
      case 'gem': scene.fly('gem', scene.slot('wheel:' + e.from, 0, V()), 'counter', () => Math.max(0, S.counter - 1), 0, 1.2, (p) => { scene.bump('counter'); scene.twinkle(p, 4, 0xfff0c0, 0.4); }); Sound.gem();
        if (S.made === 1) { moment(scene.slot('counter', 0, V()), 0.6, 1.5, 2); banner(T('firstGem'), '', 1.8); }
        break;
      case 'ring': { const p = scene.slot('wsR', Math.max(0, S.ws.rings - 1), V()); scene.bump('workshop'); scene.twinkle(p, 8, 0xffe6a0, 0.45); scene.puff(p.x, p.z, 2, 0.5, 0xfff0d0); Sound.ring(); break; }
      case 'keeperPick': scene.fly('gem', scene.slot('counter', Math.max(0, S.counter), V()), 'keeper', () => Math.max(0, (S.keeper ? S.keeper.n : 1) - 1), 0, 0.6); Sound.pick(e.n, true); break;
      case 'keeperDrop': scene.bump(e.at); scene.twinkle(scene.slot('stand:' + e.at, 0, V()), 6, 0xfff0c0, 0.4); Sound.drop(4); break;
      case 'take': scene.bump(e.stand); break;
      case 'sale': {
        const p = V(e.x, 1.3, e.z);
        for (let i = 0; i < e.amount; i++) scene.fly('coin', p, 'cash', () => Math.max(0, S.cashPile - 1), i * 0.08, 2.0, () => { Sound.coin(coinK++); scene.bump('cash'); });
        scene.cheer(e.id); pop('+' + e.amount, e.x, 2.3, e.z, 'gold', cfg.kindColor[e.kind]); Sound.at(farK(e.x, e.z)).sale(); Sound.at(1);
        if (S.sold === 1) { moment(V(e.x, 1.0, e.z), 0.62, 1.5, 2); banner(T('firstSale'), '', 1.8); }
        break;
      }
      case 'collect': {
        for (let i = 0; i < Math.min(3, e.n); i++) scene.fly('coin', scene.slot('cash', S.cashPile + i, V()), 'hero', () => 0, i * 0.04, 1.0, () => { cashBump = 1; Sound.coin(coinK++); });
        break;
      }
      case 'padShow': { const d = padDef(e.id); Sound.pop(); if (d) moment(V(d.x, 0, d.z), 0.82, 1.2, 0, { sting: false }); break; }
      case 'pay': { if (e.paid % 2 === 0) scene.fly('coin', V(h.x, 1.4, h.z), 'pad', () => 0, 0, 1.0); scene.padPay(); Sound.pay(e.paid); break; }
      case 'unlock': {
        { const d = padDef(e.id); if (d) { scene.ring(V(d.x, 0.3, d.z), 0xffd35a, 0.5, 4.5, 0.6); scene.confetti(V(d.x, 0.8, d.z), 40, 2.2); } } // the full bar pops
        const c = scene.unlock(e.id); Sound.fanfare(); buzz('success'); banner(T(e.id), e.id === 'rig' ? T('rigDone') : '', 2.6);
        if (e.id === 'heart') moment(V(0, 3, cfg.world.meteor.z + 2), 0.85, 2.0, 2);
        else moment(V(c.x, 1.0, c.z - 0.5), e.id === 'road' || e.id === 'cable' ? 0.8 : 0.7, 2.2, 2, { stop: cfg.cine.stop });
        if (e.id === 'ghost') banner(T('ghost'), T('ghostGoal'), 2.6);
        if (e.id === 'laser') offerShare();
        saveNow();
        break;
      }
      case 'bus': scene.busIn(); Sound.honk(); banner(T('bus'), '', 2.2); moment(scene.busAt, 0.85, 2.4, 0, { sting: false }); break;
      case 'order': Sound.pop(); break;
      case 'orderDone': {
        const k = scene.slot('kid', 0, V()); scene.kidHappy(); Sound.heart(); pop('♥', k.x, k.y + 1.2, k.z, 'big');
        for (let i = 0; i < e.tip; i++) scene.fly('coin', k, 'cash', () => Math.max(0, S.cashPile - 1), 0.2 + i * 0.07, 2.2, () => Sound.coin(coinK++));
        banner(T('thanks'), '', 1.6);
        break;
      }
      case 'rush': scene.rush(); Sound.rush(); banner(T('rush'), '', 2.2); moment(V(0, 2.5, cfg.world.meteor.z + 1.5), 0.8, 1.8, 1); break;
      case 'scoop': if (e.kind === 'coin') { cashBump = 1; Sound.coin(coinK++); } else Sound.pick(e.n || 1, false); break;
      case 'eggDrop': scene.eggDrop(); banner(T('eggDrop'), '', 1.6); moment(scene.eggAt, 0.8, 1.6, 1); break;
      case 'hatchStart': scene.hatchStart(); hatchCracks = 0; break;
      case 'hatch': scene.hatch(); Sound.fanfare(); buzz('success'); banner(e.rarity && e.rarity !== 'common' ? T(e.rarity) : T('hatch'), `${critterName(e.who)}  ${perkText(e.who)}`, 2.8); offerShare(); moment(V(cfg.world.egg.x + cfg.critter.pop[0] * 0.5, 0.6, cfg.world.egg.z + cfg.critter.pop[1] * 0.5), 0.62, 2.0, 2, { stop: cfg.cine.stop }); saveNow(); break;
      // ---- the ghost town, the crown jeweler, the finale, stars and hats
      case 'cartGo': Sound.whoosh(); pop('➜', scene.cartAt.x, 1.8, scene.cartAt.z, 'gold'); break;
      case 'ghostLight': {
        const p = scene.lightHouse(e.i); Sound.fanfare(); banner(T('ghostLit'), `${e.i + 1} / ${cfg.cart.lights}`, 2.4);
        moment(scene.houseAt(e.i), 0.72, 2.6, 1); coinsTo(p, e.pay); pop('+' + e.pay, p.x, p.y + 1.5, p.z, 'gold'); saveNow();
        break;
      }
      case 'districtDone': banner(T('districtDone'), '', 2.6); moment(V(0, 1.5, scene.houseAt(1).z), 0.9, 2.4, 2); break;
      case 'cartBack': { const p = scene.cartAt; coinsTo(V(p.x, 1.2, p.z), e.pay); pop('+' + e.pay, p.x, 2, p.z, 'gold'); Sound.sale(); break; }
      case 'crown': {
        const jw = scene.slot('jw', 0, V()), to = S.pads.some((q) => q.id === 'cable' && q.done) ? 'gond' : 'sky';
        scene.fly('ring', scene.slot('wsR', Math.max(0, S.ws.rings), V()), 'jw', () => 0, 0, 1.4, (q) => {
          scene.twinkle(q, 8, 0xffe6a0, 0.45); Sound.ring();
          const gi = Math.floor(Math.random() * 3); scene.fly('crown', q, to, () => gi, 0.15, 2.2, (r) => scene.twinkle(r, 6, 0xffd35a, 0.4));
          coinsTo(q, e.pay); pop('+' + e.pay, jw.x, 2.6, jw.z, 'gold');
        });
        break;
      }
      case 'finale': scene.rush(); Sound.rush(); banner(T('finale'), '', 2.6); moment(V(0, 4, cfg.world.meteor.z + 1), 0.8, 3.4, 2, { lock: true }); break;
      case 'heartRise': scene.finale('rise'); Sound.boom(); moment(V(0, 6, cfg.world.meteor.z + 1), 0.72, 3.6, 2, { lock: true, sting: false }); break;
      case 'crownHatch': scene.finale('burst'); Sound.perfect(); Sound.fanfare(); banner(T('legendary'), `${critterName(e.who)}  ${perkText(e.who)}`, 3.0); offerShare(); break;
      case 'comet': scene.finale('comet'); Sound.whoosh(); banner(area === 'frost' ? T0('chapter2') + ' ★' : T('chapter2'), T('comet'), 3.2); moment(scene.cometAt.add(V(2.5, 0, 0)), 0.55, 4.2, 2, { pitch: cfg.camera.cometPitch, lock: true, sting: false }); break;
      case 'finaleEnd': scene.finale('fireworks'); Sound.fanfare(); banner(T(area === 'frost' ? 'chapter2' : 'chapter1'), '★', 2.6); if (L.travelOpen(cfg, S) && area === 'desert') banner(T('toFrost'), T('ride'), 3.0); offerShare(); saveNow(); break;
      case 'travel': if (phase === 'play') startRide(e.to); break;
      case 'awayCoins': banner(T('awayCoins'), '+' + e.n, 2.6); pop('+' + e.n, cfg.world.cash.x, 1.8, cfg.world.cash.z, 'gold'); Sound.sale(); break;
      case 'record': moment(V(S.hero.x, 1, S.hero.z), 0.7, 1.6, 1); Sound.fanfare(); banner(T('rec'), T('rec' + e.k[0].toUpperCase() + e.k.slice(1)).replace('{n}', e.v), 2.4); offerShare(); break;
      case 'star': moment(V(S.hero.x, 1, S.hero.z), 0.66, 1.8, 2, { stop: cfg.cine.stop }); Sound.heart(); banner(T('star'), '★'.repeat(e.n) + '☆'.repeat(Math.max(0, 3 - e.n)), 2.4); offerShare(); saveNow(); break;
      case 'gift': Sound.fanfare(); banner(T('gift'), `${T('giftSub')}  +${e.coins}`, 3.0); coinsTo(V(h.x, 3.5, h.z), e.coins); saveNow(); break;
      case 'hat': Sound.pop(); banner(T('hat'), '', 2.0); pop('✦', h.x, 3.0, h.z, 'big'); albumDot = true; saveNow(); break;
      default: break;
    }
  }
  /** Up to 12 coins fly from p to the cash tray (the logic already paid the full amount into it). */
  /** Gain for a sound at (x, z): full within 7 m of the hero, down to a quarter 25 m away. */
  const farK = (x, z) => Math.max(0.25, Math.min(1, 1 - (Math.hypot(x - S.hero.x, z - S.hero.z) - 7) / 24));
  function coinsTo(p, n) { for (let i = 0; i < Math.min(12, n); i++) scene.fly('coin', p, 'cash', () => Math.max(0, S.cashPile - 1), 0.1 + i * 0.06, 2.4, () => Sound.coin(coinK++)); }
  let albumDot = false;

  // ---- share at the big moments: a button shows for a few seconds; it sends a brag line. No picture is passed,
  // so the host's share card shows the game's current cover, and a new cover shows up there with no game update.
  const canShare = mode === 'play' && typeof lib !== 'undefined' && typeof lib.share === 'function';
  let shareT = 0;
  $('share').querySelector('b').textContent = T('share');
  function offerShare() { if (!canShare) return; shareT = cfg.share.show; const b = $('share'); b.hidden = false; b.classList.remove('go'); void b.offsetWidth; b.classList.add('go'); }
  $('share').addEventListener('click', () => {
    Sound.unlock();
    Promise.resolve().then(() => lib.share({ title: T('title'), text: S.rec.best.gems > 0 ? T('bragGems').replace('{n}', S.rec.best.gems) : T('brag') })).catch(() => { /* host has no sheet: nothing to do */ });
    shareT = 0; $('share').hidden = true;
  });

  // ---- the sticker album: critters (silhouettes until hatched), hats (tap to wear), town stars, the chapter map
  const ch2On = () => !!(C1.drops && C1.drops.ch2);
  const albumTotal = () => cfg.critters.length + cfg.hats.length + (ch2On() ? 6 : 3);
  const albumHave = () => S.critters.length + S.hats.length + S1.stars.length + (S2 ? S2.stars.length : 0);
  const here = (x) => ((x && x.area) || 'desert') === area; // the album page shows the place you are in
  function tile(cls, draw, label, onTap) {
    const d = document.createElement(onTap ? 'button' : 'div'); d.className = 'tile ' + cls;
    const c = document.createElement('canvas'); c.width = c.height = 96; const g = c.getContext('2d'); g.translate(48, 50); draw(g); d.appendChild(c);
    if (label) { const b = document.createElement('b'); b.className = 'out'; b.textContent = label; d.appendChild(b); }
    if (onTap) d.addEventListener('click', onTap);
    return d;
  }
  const drawCritter = (g, d, have) => {
    g.fillStyle = have ? d.body : '#5a4a5e'; g.beginPath(); g.ellipse(0, 10, 30, 26, 0, 0, 6.3); g.fill(); g.beginPath(); g.arc(0, -14, 22, 0, 6.3); g.fill();
    g.fillStyle = have ? d.shell : '#6e5e72'; for (const [x, y, r] of [[-14, -2, 10], [2, -8, 13], [16, 2, 9]]) { g.beginPath(); g.moveTo(x, y - r - 10); g.lineTo(x + r * 0.7, y - 6); g.lineTo(x - r * 0.7, y - 6); g.closePath(); g.fill(); }
    if (have) { g.fillStyle = '#3a2418'; for (const x of [-8, 8]) { g.beginPath(); g.arc(x, -14, 4, 0, 6.3); g.fill(); } }
    else { g.fillStyle = '#e8d8f0'; g.font = '900 34px system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('?', 0, 6); }
  };
  function drawHat(g, id, have) {
    const fg = have ? '#ffe6a8' : '#6e5e72', bg = have ? '#2a7f78' : '#3a2a40';
    g.fillStyle = fg; g.strokeStyle = fg; g.lineWidth = 6;
    if (id === 'cowboy') { g.beginPath(); g.ellipse(0, 14, 40, 10, 0, 0, 6.3); g.fill(); g.beginPath(); g.roundRect(-20, -18, 40, 32, 12); g.fill(); }
    else if (id === 'flower') { for (let k = 0; k < 6; k++) { const a = k / 6 * 6.28; g.fillStyle = have ? ['#f27aa0', '#ffd35a', '#ff8ad8', '#b08cff'][k % 4] : fg; g.beginPath(); g.arc(Math.cos(a) * 26, Math.sin(a) * 12, 10, 0, 6.3); g.fill(); } }
    else if (id === 'bunny') { for (const x of [-14, 14]) { g.beginPath(); g.ellipse(x, -8, 9, 30, x * 0.01, 0, 6.3); g.fill(); } g.fillRect(-28, 20, 56, 8); }
    else if (id === 'astro') { g.beginPath(); g.arc(0, 2, 34, 0, 6.3); g.fill(); g.fillStyle = bg; g.beginPath(); g.roundRect(-22, -10, 44, 22, 10); g.fill(); }
    else if (id === 'lamp') { g.beginPath(); g.arc(0, 10, 32, Math.PI, 0); g.fill(); g.fillRect(-38, 8, 76, 8); g.fillStyle = have ? '#fff6c8' : bg; g.beginPath(); g.arc(0, -8, 10, 0, 6.3); g.fill(); }
    else if (id === 'antenna') { g.lineWidth = 5; g.beginPath(); g.arc(0, 26, 30, Math.PI, 0); g.stroke(); for (const x of [-1, 1]) { g.beginPath(); g.moveTo(x * 12, 0); g.lineTo(x * 22, -26); g.stroke(); g.fillStyle = have ? (x < 0 ? '#4fd8f0' : '#e04cc0') : fg; g.beginPath(); g.moveTo(x * 22, -40); g.lineTo(x * 22 + 10, -28); g.lineTo(x * 22, -16); g.lineTo(x * 22 - 10, -28); g.closePath(); g.fill(); } }
    else if (id === 'bandana') { g.fillStyle = have ? '#d9544a' : fg; g.beginPath(); g.moveTo(-36, -14); g.lineTo(36, -14); g.lineTo(0, 30); g.closePath(); g.fill(); g.fillRect(-40, -22, 80, 12); if (have) { g.fillStyle = '#f3e6cf'; for (const [x, y] of [[-14, -4], [14, -4], [0, 12], [0, -4]]) { g.beginPath(); g.arc(x, y, 4, 0, 6.3); g.fill(); } } }
    else if (id === 'earmuffs') { g.lineWidth = 7; g.beginPath(); g.arc(0, 10, 30, Math.PI, 0); g.stroke(); g.fillStyle = have ? '#d2557a' : fg; for (const x of [-30, 30]) { g.beginPath(); g.ellipse(x, 14, 13, 17, 0, 0, 6.3); g.fill(); } }
    else if (id === 'beanie') { g.fillStyle = have ? '#5a8ad8' : fg; g.beginPath(); g.arc(0, 14, 34, Math.PI, 0); g.fill(); g.fillStyle = have ? '#bccbe6' : fg; g.fillRect(-38, 10, 76, 14); g.beginPath(); g.arc(0, -26, 11, 0, 6.3); g.fill(); }
    else if (id === 'icecrown') { g.fillStyle = have ? '#8cc6ee' : fg; g.beginPath(); g.moveTo(-36, 24); for (let k = 0; k <= 6; k++) { const x = -36 + k * 12; g.lineTo(x, k % 2 ? -4 : -34); } g.lineTo(36, 24); g.closePath(); g.fill(); g.fillStyle = have ? '#d2557a' : bg; g.beginPath(); g.arc(0, 12, 6, 0, 6.3); g.fill(); }
    else if (id === 'top') { g.fillRect(-36, 18, 72, 8); g.fillRect(-20, -30, 40, 50); g.fillStyle = bg; g.fillRect(-20, 8, 40, 8); }
    else drawIcon(g, 'crown', fg, bg);
  }
  const hatNeed = (hd) => (hd.stars ? '★' + hd.stars : hd.hearts ? '♥' + hd.hearts : hd.critters ? '✿' + hd.critters : hd.sold ? '◆' + hd.sold : hd.finale ? '♛' : '');
  function openAlbum() {
    if (phase !== 'play') return;
    phase = 'album'; albumDot = false; stick.on = false; showStick();
    const a = $('album'), card = a.querySelector('.card');
    card.querySelector('h2').textContent = `${T('album')}  ${albumHave()}/${albumTotal()}`;
    const crit = card.querySelector('.crit'); crit.innerHTML = ''; crit.classList.toggle('six', cfg.critters.filter(here).length > 12);
    for (const d of cfg.critters.filter(here)) { const have = S.critters.some((c) => c.id === d.id); const t = tile('r-' + (d.rarity || 'common') + (have ? '' : ' off'), (g) => drawCritter(g, d, have), have ? critterName(d.id) : ''); crit.appendChild(t); }
    const hats = card.querySelector('.hats'); hats.innerHTML = ''; hats.classList.toggle('nine', cfg.hats.filter(here).length > 6);
    for (const hd of cfg.hats.filter((x, i) => i === 0 || here(x))) {
      const have = S.hats.includes(hd.id);
      hats.appendChild(tile((have ? '' : 'off ') + (S.hat === hd.id ? 'on' : ''), (g) => drawHat(g, hd.id, have), have ? '' : hatNeed(hd), have ? () => { S.hat = hd.id; Sound.pop(); saveNow(); openAlbum.refresh(); } : null));
    }
    const st = card.querySelector('.stars'); st.innerHTML = '';
    for (const [id, need] of [['orders', '♥' + cfg.stars.orders], ['critters', '✿' + cfg.stars.critters], ['town', '⌂']]) {
      const have = S.stars.includes(id);
      st.appendChild(tile(have ? '' : 'off', (g) => { g.scale(1.1, 1.1); drawIcon(g, 'star', have ? '#ffd35a' : '#6e5e72', have ? '#c98a2a' : '#3a2a40'); }, need));
    }
    const ch = card.querySelector('.chap'); ch.innerHTML = '';
    const prog = (X) => (X.done1 ? '✓' : X.pads.filter((p) => p.done).length + '/' + X.pads.length), cometIcon = (c) => (g) => { g.fillStyle = c; g.beginPath(); g.arc(-18, 6, 16, 0, 6.3); g.fill(); g.beginPath(); g.moveTo(-10, -6); g.lineTo(40, -26); g.lineTo(-4, 18); g.closePath(); g.globalAlpha = 0.6; g.fill(); };
    ch.appendChild(tile('wide ch1', (g) => drawIcon(g, 'heart', '#ff8ad8', '#5a1f5e'), `1 · ${T0('chapter1')}  ${prog(S1)}`));
    if (!ch2On()) ch.appendChild(tile('wide ch2 off', cometIcon('#9ae8ff'), `2 · ${T0('chapter2')}  ${T0('soon')}`));
    else ch.appendChild(tile('wide ch2' + (S2 ? '' : ' off'), cometIcon('#9ae8ff'), `2 · ${T0('chapter2')}  ${S2 ? prog(S2) : T0('soon')}`));
    a.hidden = false;
  }
  openAlbum.refresh = () => { phase = 'play'; openAlbum(); };
  const closeAlbum = () => { $('album').hidden = true; if (phase === 'album') phase = 'play'; last = performance.now(); };
  // the cheer toy: no score, just the hero waving, the crowd doing a wave and a chord that climbs with each press
  $('toy').addEventListener('click', () => { Sound.unlock(); if (phase === 'intro') { scene.skipIntro(); phase = 'play'; } scene.toy(); Sound.toy(); });
  $('albumB').addEventListener('click', () => { Sound.unlock(); if (phase === 'intro') { scene.skipIntro(); phase = 'play'; } openAlbum(); });
  $('album').querySelector('.close').addEventListener('click', () => { Sound.pop(); closeAlbum(); });
  $('album').addEventListener('pointerdown', (e) => { e.stopPropagation(); if (e.target === $('album')) closeAlbum(); });
  let hatchCracks = 0, glintsHit = 0, fwT = 2;

  // ---- save / continue: read first, write only after the read came back (a failed read never overwrites a save)
  const canSave = mode === 'play' && !bot && typeof lib !== 'undefined' && !!lib.saveUserGameState;
  let phase = 'play', loaded = false, lastWrite = Promise.resolve(), saveT = 0, alive = true;
  function saveNow() {
    if (!canSave || !loaded || (phase !== 'play' && phase !== 'album')) return;
    const snap = L.serialize(C1, S1); if (S2) snap.ch2 = L.serialize(C2, S2); snap.area = area; snap.seen = Date.now(); snap.ft = ftDone;
    lastWrite = lastWrite.then(() => lib.saveUserGameState(snap)).catch(() => { /* host refused: try again on the next tick */ });
  }
  function readSave(tries = 0) {
    const read = () => Promise.race([Promise.resolve().then(() => lib.getUserGameState()), new Promise((res, rej) => setTimeout(() => rej(new Error('save read timed out')), 8000))]);
    lastWrite.then(read).then((r) => {
      if (!alive) return;
      loaded = true;
      const st = r && r.state;
      ftDone |= L.ftueFromSave(st);
      if (st && typeof st === 'object' && st.v === cfg.save.version && (st.sold > 0 || (Array.isArray(st.pads) && st.pads.some((p) => p && p[1])))) offer(st);
    }).catch(() => { if (alive) setTimeout(() => readSave(tries + 1), Math.min(8000, 600 * (tries + 1))); });
  }
  /** The CONTINUE / NEW GAME card. New game asks for a second tap so a stray tap never wipes progress. */
  function offer(st) {
    closeAlbum(); phase = 'menu'; scene.skipIntro();
    const m = $('menu'), go = $('cont'), nw = $('newg');
    m.querySelector('h1').textContent = T('title'); go.textContent = T('cont'); nw.textContent = T('newGame'); nw.classList.remove('sure'); m.hidden = false;
    let sureT = 0;
    go.onclick = () => {
      Sound.unlock(); m.hidden = true;
      // shortcut: a save that arrives after this session already bought something replaces it; fine while reads take < 3 s
      cfg = C1; S = S1 = L.restore(C1, st, C1.seed + 7); S2 = null; area = 'desert';
      if (st.ch2 && ch2On()) { C2 = C2 || L.chapterConfig(C1, 'frost'); S2 = L.restore(C2, st.ch2, C2.seed + 57, { critters: S1.critters, hats: S1.hats }); }
      if (st.area === 'frost' && S2) { cfg = C2; S = S2; area = 'frost'; buildScene(); } else { scene.restoreBuilt(S); scene.snap(S); if (!qs.has('tod')) scene.setTod(L.todGoal(cfg, S)); }
      phase = 'play'; saveT = 0; Sound.pop();
      const gift = L.welcomeGift(cfg, st, Date.now()); if (gift) L.applyGift(cfg, S, gift);
    };
    nw.onclick = () => {
      Sound.unlock();
      if (!nw.classList.contains('sure')) { nw.classList.add('sure'); nw.textContent = T('sure'); clearTimeout(sureT); sureT = setTimeout(() => { nw.classList.remove('sure'); nw.textContent = T('newGame'); }, 2500); return; }
      clearTimeout(sureT); m.hidden = true; phase = 'play'; saveNow(); // this session's fresh game becomes the save
    };
  }
  // ---- the cable car ride between the two places: a short cover card, the scene is rebuilt behind it
  let rideT = 0, rideTo = null;
  function startRide(to) {
    phase = 'ride'; rideT = 0; rideTo = to; stick.on = false; showStick(); Sound.whoosh();
    const r = $('ride'); r.querySelector('b').textContent = T(to === 'frost' ? 'toFrost' : 'toDesert'); r.querySelector('span').textContent = T('ride');
    r.classList.toggle('frost', to === 'frost'); r.hidden = false; r.classList.remove('go'); void r.offsetWidth; r.classList.add('go');
  }
  /** Builds the scene's deferred extras (far desert, full ground paint) a moment after its first frame. */
  function lateFor(sc) { setTimeout(() => { if (alive && sc === scene) sc.late(); }, cfg.quality.lateMs); }
  /** A fresh scene (and canvas) for the active place, built from its state. */
  function buildScene() {
    const cv = document.createElement('canvas'), old = scene; cv.id = 'cv';
    scene = createScene(cv, cfg, L.rng(cfg.seed + 101));
    old.dispose(); $('cv').replaceWith(cv);
    scene.setTier(qa.tier); if (qa.rs !== 1) scene.setScale(qa.rs); layout();
    scene.restoreBuilt(S); scene.snap(S); scene.setTod(qs.has('tod') ? Number(qs.get('tod')) : L.todGoal(cfg, S)); scene.prewarm(); lateFor(scene);
    nextIcon = null; bubbleKind = null;
  }
  /** Moves the hero to the other place: wallet and hat come along, the parade follows; the town there kept earning. */
  function travel(to) {
    const now = Date.now(), from = S, TV = cfg.travel; leftAt[area] = now;
    if (to === 'frost') {
      if (!C2) C2 = L.chapterConfig(C1, 'frost');
      if (!S2) { S2 = L.createState(C2, C2.seed + 50); S2.critters = S1.critters; S2.hats = S1.hats; }
      cfg = C2; S = S2;
    } else { cfg = C1; S = S1; }
    area = to; S.hero.cash = from.hero.cash; S.hat = from.hat;
    S.hero.x = TV.x; S.hero.z = TV.z; S.travelT = -1; for (const c of S.critters) { c.x = TV.x; c.z = TV.z + 1; }
    buildScene();
    if (leftAt[to]) L.awayIncome(cfg, S, (now - leftAt[to]) / 1000);
    banner(T('title'), '', 2.4); saveT = 0;
  }
  function rideStep(dt) {
    rideT += dt;
    if (rideTo && rideT >= cfg.ride.swap) { const to = rideTo; rideTo = null; travel(to); last = performance.now(); }
    if (!rideTo && rideT >= cfg.ride.sec) { $('ride').hidden = true; phase = 'play'; saveNow(); }
  }
  const onHide = () => { if (document.visibilityState === 'hidden') saveNow(); else { last = performance.now(); perfT = 0; perfN = 0; perfMs = 0; } }; // time in the background is not a slow frame
  document.addEventListener('visibilitychange', onHide);

  // ---- loop
  let sessT = 0, teased = false, raf = 0, last = performance.now(), acc = 0, perfT = 0, perfN = 0, perfMs = 0, paused = false, glintAuto = 0;
  const DT = 1 / 60;
  function tick(dt) {
    if (phase === 'intro' && !scene.introOn) phase = 'play';
    if (phase === 'ride') rideStep(dt);
    if (phase !== 'play') return;
    let input = bot ? L.botInput(cfg, S) : readInput();
    if (!bot && (input.x || input.z) && !touched) { touched = true; $('hint').classList.add('gone'); }
    let tap = null;
    if (tapGlint) { tap = { glint: true }; tapGlint = false; }
    if (bot && S.glint && S.glint.t > 0.6 && (glintAuto += dt) > 0.1) { tap = { glint: true }; glintAuto = 0; }
    L.step(cfg, S, dt, input, tap);
    if (!teased && !bot && (sessT += dt) >= cfg.tomorrow.after) { teased = true; banner(T('tomorrow'), T('tomorrowSub'), 3.2); Sound.pop(); }
    for (const e of S.events) onEvent(e);
    S.events.length = 0;
    if (S.egg.st === 'hatching') { const k = Math.floor((S.egg.t / cfg.egg.hatch) * 5); if (k > hatchCracks) { hatchCracks = k; Sound.crack(k); } }
    if ((saveT += dt) >= cfg.save.every) { saveT = 0; saveNow(); }
  }
  const proj = (x, y, z) => { const [sx, sy] = scene.toScreen(x, y, z); return [sx * 100, sy * 100]; };
  function hud(dt) {
    const h = S.hero;
    // cash: counts up toward the real value
    if (shownCash !== h.cash) { shownCash += Math.sign(h.cash - shownCash) * Math.max(1, Math.ceil(Math.abs(h.cash - shownCash) * dt * 8)); if ((h.cash - shownCash) * Math.sign(h.cash - shownCash) < 0) shownCash = h.cash; cashEl.textContent = shownCash; }
    if (cashBump > 0) { bumpEl($('cash')); cashBump = 0; }
    // carry label over the stack
    const c = $('carry'), cap = L.carryCap(cfg, S);
    if (h.n > 0) { const [x, y] = proj(h.x, 1.7 + h.n * 0.16, h.z); c.hidden = false; c.style.setProperty('--k', cfg.kindColor[h.kind] || cfg.kindColor.chunk); c.style.left = x + '%'; c.style.top = y + '%'; const t = h.n >= cap ? T('full') : `${h.n}/${cap}`; if (c.textContent !== t) c.textContent = t; c.classList.toggle('max', h.n >= cap); }
    else c.hidden = true;
    for (const p of popEls) {
      if (p.d.hidden) continue; p.t += dt; const k = p.t / p.life;
      if (k >= 1) { p.d.hidden = true; continue; }
      const [x, y] = proj(p.x, p.y + k * 1.2, p.z); p.d.style.left = x + '%'; p.d.style.top = y + '%'; p.d.style.opacity = k > 0.7 ? (1 - k) / 0.3 : 1;
    }
    if (bannerT > 0 && (bannerT -= dt) <= 0) { $('banner').hidden = true; if (bannerQ.length) banner(...bannerQ.shift()); }
    // NEXT card: what the coins are for (icon, how far along, coins still to pay)
    // after the last unlock it shows the album instead: stickers collected of all there are (the next goal)
    const nx = $('next'), P = S.pads.find((p) => !p.done);
    nx.hidden = phase === 'menu';
    if (!P) {
      if (nextIcon !== 'star') { nextIcon = 'star'; const c = nx.querySelector('canvas'), g = c.getContext('2d'); g.clearRect(0, 0, 96, 96); g.save(); g.translate(48, 50); g.scale(0.82, 0.82); drawIcon(g, 'star', '#ffe6a8', '#2a7f78'); g.restore(); }
      nx.querySelector('i').style.width = ((albumHave() / albumTotal()) * 100).toFixed(1) + '%';
      const t = `${albumHave()}/${albumTotal()}`; if (nx.querySelector('b').textContent !== t) nx.querySelector('b').textContent = t;
      nx.classList.remove('ready');
    } else {
      const d = padDef(P.id), left = P.price - P.paid;
      if (nextIcon !== d.icon) { nextIcon = d.icon; const c = nx.querySelector('canvas'), g = c.getContext('2d'); g.clearRect(0, 0, 96, 96); g.save(); g.translate(48, 50); g.scale(0.82, 0.82); drawIcon(g, d.icon, '#ffe6a8', '#2a7f78'); g.restore(); }
      nx.querySelector('i').style.width = Math.min(100, ((h.cash + P.paid) / P.price) * 100).toFixed(1) + '%';
      const t = String(left); if (nx.querySelector('b').textContent !== t) nx.querySelector('b').textContent = t;
      nx.classList.toggle('ready', h.cash >= left && P.shown);
    }
    // the ghost town goal: three houses, lit as the cart delivers
    const go = $('goal'), gOpen = L.ghostOpen(cfg, S) && phase !== 'menu';
    go.hidden = !gOpen;
    if (gOpen) { if (go.querySelector('b').textContent !== T('ghostGoal')) go.querySelector('b').textContent = T('ghostGoal'); go.querySelectorAll('i').forEach((el, i) => el.classList.toggle('lit', i < S.ghost.lit)); }
    // share button timer, album badge, the sky easing toward the time of day the town has reached
    if (shareT > 0 && (shareT -= dt) <= 0) $('share').hidden = true;
    if (cfg.drops.festival && scene.lamps > cfg.festival.lampsMin && (fwT -= dt) <= 0) { fwT = cfg.festival.fireworks * (0.7 + Math.random() * 0.6); scene.firework(); Sound.pop(); }
    $('albumB').classList.toggle('dot', albumDot);
    if (!qs.has('tod')) { const want = L.todGoal(cfg, S), now = scene.tod; if (Math.abs(want - now) > 1e-3) scene.setTod(now + Math.sign(want - now) * Math.min(Math.abs(want - now), dt * cfg.tod.ease)); }
    // the order kid's bubble
    const bu = $('bubble');
    if (S.order) {
      if (bubbleKind !== S.order.kind) { bubbleKind = S.order.kind; paintItem(bu.querySelector('canvas'), bubbleKind); bu.style.setProperty('--k', cfg.kindColor[bubbleKind] || ''); bu.hidden = true; }
      const [x, y] = proj(cfg.world.order.x, 2.9, cfg.world.order.z); bu.hidden = false; bu.style.left = x + '%'; bu.style.top = Math.max(y, (hudB + 96 * uH) * 100) + '%'; // never under the HUD
    } else { bu.hidden = true; bubbleKind = null; }
    // first glint: a tapping finger over the sparkle until the first Perfect Strike
    const tp = $('tap'), gl = scene.glint;
    if (gl && !glintsHit && !bot && phase === 'play' && touched) { const [x, y] = proj(gl.x, gl.y, gl.z); tp.hidden = false; tp.style.left = x + '%'; tp.style.top = y + '%'; }
    else tp.hidden = true;
  }
  let nextIcon = null, bubbleKind = null, lastEvents = [];
  /** The item an order asks for, drawn flat on the bubble's canvas (gem: a faceted diamond; ring: the ring icon). */
  function paintItem(c, kind) {
    const g = c.getContext('2d'); g.clearRect(0, 0, 96, 96); g.save(); g.translate(48, 50);
    if (kind === 'ring' && cfg.area === 'frost') { g.scale(0.9, 0.9); drawIcon(g, 'globe', '#8cc6ee', '#3a5a9a'); }
    else if (kind === 'ring') { g.scale(0.85, 0.85); drawIcon(g, 'ring', '#d99a2e', '#fff3dc'); g.fillStyle = '#e04cc0'; g.beginPath(); g.moveTo(0, -40); g.lineTo(16, -24); g.lineTo(0, -10); g.lineTo(-16, -24); g.closePath(); g.fill(); }
    else { const pts = [[0, -34], [28, -10], [0, 36], [-28, -10]]; g.fillStyle = '#e04cc0'; g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.fill(); g.fillStyle = '#ff9ae8'; g.beginPath(); g.moveTo(0, -34); g.lineTo(12, -10); g.lineTo(0, 10); g.lineTo(-12, -10); g.closePath(); g.fill(); g.strokeStyle = '#3a2418'; g.lineWidth = 5; g.lineJoin = 'round'; g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.stroke(); }
    g.restore();
  }
  function frame(now) {
    raf = requestAnimationFrame(frame);
    if (paused) return;
    // a frame's timestamp can be older than the moment this run started its loop: never step backwards
    const raw = Math.max(0, (now - last) / 1000), real = Math.min(0.1, raw); last = now; acc += real * timeK(real);
    let n = 0; while (acc >= DT && n < 6) { tick(DT); acc -= DT; n++; }
    if (n === 6) acc = 0;
    draw(real);
    // adaptive quality every window seconds (CPU frame time stands in for GPU time)
    perfT += Math.min(1, raw); perfN++; perfMs += Math.min(1, raw) * 1000; // uncapped: a 10 FPS phone must count as slow, and soon
    if (perfT >= cfg.quality.window && !qs.has('tier')) {
      const nq = L.adaptQuality(cfg.quality, qa, perfMs / perfN, cfg.quality.window);
      if (nq.tier !== qa.tier) scene.setTier(nq.tier); if (nq.rs !== qa.rs) scene.setScale(nq.rs); qa = nq;
      perfT = 0; perfN = 0; perfMs = 0;
    }
  }
  let lastGuide = null, ftDone = 0, ftShown = null, ftW = 0, ftH = 0;
  const FT_ALL = (1 << L.FTUE.length) - 1;
  $('ftSkip').addEventListener('click', () => { Sound.unlock(); ftDone = FT_ALL; coach(); saveNow(); });
  function draw(dt) {
    const g = lastGuide = L.guide(cfg, S);
    scene.update(S, dt, g); scene.render(); hud(dt); edgePointer(); coach();
    if (cine.bars > 0) cine.bars -= dt; root.classList.toggle('cinema', cine.bars > 0);
  }
  // ---- first-time tutorial: a soft spotlight on the next stop with its icon and a few words. It moves on when the
  // player does the action there (never on a tap), skips what they already did, is saved, and can be skipped.
  function coach() {
    const sp = $('spot'), ch = $('coach'), g = lastGuide;
    const st = mode === 'play' && !bot && phase === 'play' && area === 'desert' && ftDone !== FT_ALL && S.t >= cine.until ? L.ftueStep(cfg, S, g, ftDone) : null;
    let on = false;
    if (st) {
      const [x, y, z] = scene.toScreen(g.x, 0.5, g.z), [x2, y2] = scene.toScreen(g.x + cfg.ftue.r, 0.5, g.z);
      if (z < 1 && x > 0.04 && x < 0.96 && y > hudB && y < 0.9) {
        on = true;
        const W = root.clientWidth, H = root.clientHeight, u = H * uH, r = Math.max(cfg.ftue.rMin * u, Math.hypot((x2 - x) * W, (y2 - y) * H));
        sp.style.setProperty('--x', x * W + 'px'); sp.style.setProperty('--y', y * H + 'px'); sp.style.setProperty('--r', r + 'px');
        if (st !== ftShown) {
          ftShown = st; ch.querySelector('b').textContent = T('ft_' + st);
          const c = ch.querySelector('canvas').getContext('2d'), ic = scene.icon(g.what), pd = cfg.pads.find((q) => q.id === g.what); c.clearRect(0, 0, 64, 64);
          if (ic) c.drawImage(ic[0], ic[1], ic[2], ic[3], ic[3], 0, 0, 64, 64); else if (pd) { c.save(); c.translate(32, 32); c.scale(0.5, 0.5); drawIcon(c, pd.icon, '#ffe6a8', '#2f6f69'); c.restore(); } // an unlock shows its own icon
          ch.hidden = false; ftW = ch.offsetWidth; ftH = ch.offsetHeight;
        }
        // the hint sits under the spotlight, or over it near the bottom, never under the HUD
        let top = y * H + r + 16 * u; if (top + ftH > 0.88 * H) top = y * H - r - 16 * u - ftH;
        top = Math.max(top, hudB * H + 16 * u); const left = Math.min(W - ftW / 2 - 24 * u, Math.max(ftW / 2 + 24 * u, x * W));
        ch.style.left = left + 'px'; ch.style.top = top + 'px';
      }
    }
    if (!on) ftShown = null;
    sp.classList.toggle('on', on); ch.hidden = !on;
  }
  /** In the wide town the next stop can be off screen: a gold arrow on the screen's edge points the way to it. */
  function edgePointer() {
    const el = $('edge'), g = lastGuide;
    if (!g || g.wait || phase !== 'play') { el.hidden = true; return; }
    const [x, y, z] = scene.toScreen(g.x, 0.5, g.z), M = 0.09, T = Math.max(0.15, hudB + 42 * uH), B = 0.86; // the arrow (84 high) stays below the HUD
    if (z < 1 && x > M && x < 1 - M && y > T && y < B) { el.hidden = true; return; }
    // from the hero toward the target (flipped when it is behind the camera), stopped at the safe frame
    const [hx, hy] = scene.toScreen(S.hero.x, 0.5, S.hero.z), f = z < 1 ? 1 : -1, ox = Math.min(1 - M, Math.max(M, hx)), oy = Math.min(B, Math.max(T, hy));
    const dx = (x - hx) * f, dy = (y - hy) * f, k = Math.min(Math.abs(((dx > 0 ? 1 - M : M) - ox) / (dx || 1e-6)), Math.abs(((dy > 0 ? B : T) - oy) / (dy || 1e-6)));
    el.hidden = false; el.style.left = (ox + dx * k) * 100 + '%'; el.style.top = (oy + dy * k) * 100 + '%'; el.style.setProperty('--a', Math.atan2(dy * 16, dx * 9) + 'rad');
  }
  $('tap').querySelector('b').textContent = T('tapGlint');
  { const g = $('ride').querySelector('canvas').getContext('2d'); g.translate(80, 64); g.scale(1.2, 1.2); drawIcon(g, 'cable', '#ffe6a8', '#3a5a9a'); }
  scene.snap(S);
  // the first frame waits for the shaders (at most a short while), so the picture appears whole instead of hitching
  const warm = scene.prewarm();
  // a new game in play mode opens with the meteor landing (3 s, any tap skips); the save is read at the same time
  if (mode === 'play' && !bot) { if (!qs.has('nointro')) { phase = 'intro'; scene.startIntro(); Sound.boom(); } if (canSave) readSave(); else loaded = true; }
  if (window.__load) window.__load.done();
  const go = () => { if (alive && !raf) { root.classList.add('live'); last = performance.now(); raf = requestAnimationFrame(frame); lateFor(scene); } };
  Promise.race([warm, new Promise((r) => setTimeout(r, cfg.quality.warmMs))]).then(go);

  const api = {
    destroy() { alive = false; saveNow(); document.removeEventListener('visibilitychange', onHide); cancelAnimationFrame(raf); ro.disconnect(); removeEventListener('keydown', onKey); removeEventListener('keyup', onKey); scene.dispose(); root.innerHTML = ''; if (window.__mg === api) window.__mg = null; },
    debug: {
      get S() { return S; }, get cfg() { return cfg; }, get scene() { return scene; }, L, get phase() { return phase; }, get ftDone() { return ftDone; }, get ftStep() { return ftShown; }, get cine() { return cine; }, saveNow, get lastEvents() { return lastEvents; },
      /** Stops the real-time loop; frame(dt) then advances by hand (step-by-step viewing). */
      pause(p = true) { paused = p; last = performance.now(); },
      /** Runs sec seconds of game time (bot input when bot is true), drawing only the last frame. */
      run(sec, useBot = true) { const n = Math.round(sec * 60); for (let i = 0; i < n; i++) { if (useBot) { const b = L.botInput(cfg, S); L.step(cfg, S, DT, b, S.glint && S.glint.t > 0.6 ? { glint: true } : null); for (const e of S.events) onEvent(e); S.events.length = 0; scene.update(S, DT, L.guide(cfg, S)); hud(DT); } else { tick(DT); hud(DT); } } draw(DT); },
      frame(dt = DT) { tick(dt); draw(dt); },
      /** Plays (bot) until an event of this type happens or maxSec passes; true when it happened. */
      until(type, maxSec = 120) {
        for (let i = 0; i < maxSec * 60; i++) {
          const b = L.botInput(cfg, S); L.step(cfg, S, DT, b, S.glint && S.glint.t > 0.6 && type !== 'glint' ? { glint: true } : null);
          const hit = S.events.some((e) => e.type === type); if (hit) lastEvents = S.events.slice(); for (const e of S.events) onEvent(e); S.events.length = 0;
          scene.update(S, DT, L.guide(cfg, S)); hud(DT);
          if (hit) { draw(DT); return true; }
        }
        draw(DT); return false;
      },
      /** Ends a cable car ride at once (checks): swaps the place and closes the cover card. */
      finishRide() { if (phase !== 'ride') return false; rideT = 99; if (rideTo) { const to = rideTo; rideTo = null; travel(to); } rideStep(0); return true; },
      ride: (to) => startRide(to),
      get area() { return area; }, get S1() { return S1; }, get S2() { return S2; },
      tapGlint() { const p = this.glintScreen(); if (p) tapGlint = true; return !!p; },
      draw(dt = 0) { draw(dt); },
      setTod: (t) => scene.setTod(t), setTier: (t) => scene.setTier(t), snap: () => scene.snap(S),
      glintScreen() { const g = scene.glint; if (!g) return null; const [x, y] = scene.toScreen(g.x, g.y, g.z); const r = root.getBoundingClientRect(); return [r.left + x * r.width, r.top + y * r.height]; },
      stats: () => scene.stats(),
      openAlbum: () => openAlbum(), closeAlbum: () => closeAlbum(), offerShare: () => offerShare(), get shareOn() { return !$('share').hidden; },
      /** Glare of the picture: share of near-white pixels, of very bright pixels, mean luminance (0..255). */
      glare() {
        draw(0); const gl = scene.renderer.getContext(), w = gl.drawingBufferWidth, hh = gl.drawingBufferHeight, px = new Uint8Array(w * hh * 4);
        gl.readPixels(0, 0, w, hh, gl.RGBA, gl.UNSIGNED_BYTE, px);
        let white = 0, bright = 0, lum = 0;
        for (let i = 0; i < px.length; i += 4) { const Lm = 0.2126 * px[i] + 0.7152 * px[i + 1] + 0.0722 * px[i + 2]; lum += Lm; if (px[i] > 240 && px[i + 1] > 240 && px[i + 2] > 240) white++; if (Lm > 215) bright++; }
        const n = w * hh; return { white: white / n, bright: bright / n, meanL: lum / n };
      },
    },
  };
  window.__mg = api; window.__game = api.debug;
  return api;
}

window.run = run;

// Outside Astrocade (?local): stand in for the host, read the config file and start.
if (typeof location !== 'undefined' && new URLSearchParams(location.search).has('local') && !window.lib) {
  const none = async () => ({});
  const store = { state: window.__seedSave || null }; window.__store = store; // a save can be seeded before start
  window.lib = { showGameParameters() {}, log() {}, getUserGameState: async () => ({ state: store.state }), saveUserGameState: async (s) => { store.state = s; }, addPlayerScoreToLeaderboard: none, getTopNEntriesFromLeaderboard: none,
    shouldUseTouchControls: () => matchMedia('(pointer: coarse)').matches, share: async (o) => { (window.__shares = window.__shares || []).push(o); }, haptics: { play() {}, start() {}, stop() {} }, getAsset: () => undefined };
  fetch('./game_config.json').then((r) => r.json()).then((c) => { window.gameConfig = c; run(new URLSearchParams(location.search).get('mode') || 'play'); });
}
