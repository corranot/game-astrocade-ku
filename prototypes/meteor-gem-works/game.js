// PROTOTYPE - NOT FOR PRODUCTION
// Meteor Gem Works, milestone M1 (visual sample): drag to walk a little miner around a crater town; swing at the
// crystal meteor for chunks, carry them to the polisher, bring the gems to the glass stand, tourists buy them, scoop
// the coins, pay the pad for a drill rig; tap the sparkle on the meteor for a Perfect Strike; an egg drops and
// hatches a crystal pup that follows you (+5 carry). Plan: plan.md (v2) §2, §3, §6, §7, §8.
// Modules: logic.js (rules), models.js (geometry), scene.js (3D look, Three.js r187 loaded by index.html).
/* global THREE */ // set on window by index.html before run() starts the game
import * as L from './logic.js';
import { createScene } from './scene.js';

const LANGS = ['en', 'ar', 'es', 'vi', 'hi', 'bn', 'id'];
const PENTA = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24, 26, 28];

// ---------------------------------------------------------------- sound: all made in code, no files to load
const Sound = (() => {
  let ctx = null, master = null, noise = null, muted = false;
  const ensure = () => {
    if (ctx) return ctx;
    try { ctx = new (window.AudioContext || window.webkitAudioContext)(); master = ctx.createGain(); master.gain.value = muted ? 0 : 0.7; master.connect(ctx.destination); } catch (e) { ctx = null; }
    if (ctx) { noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate); const d = noise.getChannelData(0); let s = 1; for (let i = 0; i < d.length; i++) { s = (s * 16807) % 2147483647; d[i] = s / 1073741823.5 - 1; } }
    return ctx;
  };
  function tone(type, f0, f1, dur, vol, at = 0) {
    const t = ctx.currentTime + at, o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(master); o.start(t); o.stop(t + dur + 0.02);
  }
  function hiss(f, q, dur, vol, at = 0) {
    const t = ctx.currentTime + at, s = ctx.createBufferSource(), fl = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noise; fl.type = 'bandpass'; fl.frequency.value = f; fl.Q.value = q;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(fl).connect(g).connect(master); s.start(t, (at * 7.3) % 0.5); s.stop(t + dur + 0.02);
  }
  const note = (n, base = 880) => base * 2 ** (PENTA[Math.max(0, Math.min(PENTA.length - 1, n))] / 12);
  const on = () => ctx && !muted;
  return {
    unlock() { if (ensure() && ctx.state === 'suspended') ctx.resume(); },
    get muted() { return muted; },
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
  <div id="cash" class="chip cash"><i class="coin" aria-hidden="true"></i><b id="cashN" class="out">0</b></div>
  <button id="mute" class="mute" aria-label="sound"><svg viewBox="0 0 48 48" aria-hidden="true"><path class="spk" d="M9 19h7l10-8v26l-10-8H9z"/><path class="wav" d="M31 17c3 2 4 4.5 4 7s-1 5-4 7M35 12c5 3.5 7 7.5 7 12s-2 8.5-7 12"/><path class="x" d="M31 18l11 12M42 18L31 30"/></svg></button>
  <div id="carry" class="carry out" hidden></div>
  <div id="pops"></div>
  <div id="banner" class="banner" hidden><b class="bt out"></b><span class="bs out"></span></div>
  <div id="hint" class="hint"><i class="hand" aria-hidden="true"></i><b class="out"></b></div>
  <div id="stick" class="stick" hidden><i></i></div>
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
  const cfg = JSON.parse(JSON.stringify(window.gameConfig || {}));
  loadFonts();
  const qs = new URLSearchParams(location.search);
  const root = document.getElementById('app');
  root.innerHTML = HTML;
  const $ = (id) => root.querySelector('#' + id);
  const detect = () => { for (const l of navigator.languages || [navigator.language || 'en']) { const k = String(l).slice(0, 2).toLowerCase(); if (LANGS.includes(k)) return k; } return 'en'; };
  const lang = qs.get('lang') && LANGS.includes(qs.get('lang')) ? qs.get('lang') : detect();
  const T = (k) => String((cfg.strings[lang] || cfg.strings.en)[k] || cfg.strings.en[k] || k);
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
  const S = L.createState(cfg, cfg.seed);

  // ---- layout: --u is the design scale (1 at 720 x 1280)
  function layout() {
    const r = root.getBoundingClientRect(); root.style.setProperty('--u', (r.height / 1280).toFixed(4));
    scene.resize(Math.max(1, Math.round(r.width)), Math.max(1, Math.round(r.height)));
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
  const onKey = (e) => { const k = e.key.toLowerCase(); if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 'a', 's', 'd', ' '].includes(k)) { e.preventDefault(); Sound.unlock(); if (e.type === 'keydown') { keys.add(k); if (k === ' ' && scene.glint) tapGlint = true; } else keys.delete(k); } };
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

  // ---- HUD helpers: pops are pooled DOM nodes (no textures per event: fix B), banner, carry label, cash chip
  const popEls = []; for (let i = 0; i < 14; i++) { const d = document.createElement('div'); d.className = 'pop out'; d.hidden = true; $('pops').appendChild(d); popEls.push({ d, t: 0, x: 0, y: 0, z: 0, life: 1 }); }
  let popNext = 0;
  function pop(text, x, y, z, cls = '') { const p = popEls[popNext]; popNext = (popNext + 1) % popEls.length; p.d.textContent = text; p.d.className = 'pop out ' + cls; p.d.hidden = false; Object.assign(p, { t: 0, x, y, z, life: cls === 'big' ? 1.4 : 0.9 }); }
  let bannerT = 0; const bannerQ = [];
  function banner(title, sub, sec = 2.4) {
    if (bannerT > 0.4) { bannerQ.push([title, sub, sec]); return; } // two big moments at once: the second waits its turn
    const b = $('banner'); b.querySelector('.bt').textContent = title; b.querySelector('.bs').textContent = sub || ''; b.hidden = false; b.classList.remove('go'); void b.offsetWidth; b.classList.add('go'); bannerT = sec; }
  let shownCash = 0, cashBump = 0;
  const cashEl = $('cashN');
  const bumpEl = (el) => { el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); };

  // ---- events from the logic -> flyers, bursts, sounds, pops
  const mineLon = Math.atan2(cfg.world.mine.x - cfg.world.meteor.x, cfg.world.mine.z - cfg.world.meteor.z);
  const V = (x, y, z) => new THREE.Vector3(x, y, z), tmp = V(0, 0, 0);
  let coinK = 0;
  function onEvent(e) {
    const h = S.hero;
    switch (e.type) {
      case 'hit': {
        const p = scene.hit(mineLon + (Math.random() - 0.5) * 0.35, 0.08 + Math.random() * 0.3); Sound.hit();
        for (let i = 0; i < e.n; i++) scene.fly('chunk', p, 'pile', () => Math.max(0, S.pile - 1), 0.05 + i * 0.06, 2.2);
        break;
      }
      case 'perfect': {
        const p = scene.hit(e.lon, e.lat, true); Sound.perfect();
        for (let i = 0; i < e.n; i++) scene.fly('chunk', p, 'pile', () => Math.max(0, S.pile - 1), 0.1 + i * 0.08, 3.2);
        pop(T('perfect'), p.x, p.y + 1.2, p.z, 'big');
        break;
      }
      case 'glint': scene.glintOn(e.lon, e.lat); Sound.glint(); break;
      case 'glintGone': scene.glintOff(); break;
      case 'rigHit': { const p = scene.rigHit(); for (let i = 0; i < e.n; i++) scene.fly('chunk', p, 'pile', () => Math.max(0, S.pile - 1), 0.1 + i * 0.08, 2.6); break; }
      case 'pick': {
        const from = e.kind === 'chunk' ? scene.slot('pile', Math.max(0, S.pile), V()) : scene.slot('counter', Math.max(0, S.counter), V());
        scene.fly(e.kind, from, 'stack', () => Math.max(0, h.n - 1), 0, 0.7); Sound.pick(e.n, e.kind === 'gem');
        break;
      }
      case 'drop': {
        const from = scene.slot('stack', h.n, V()), kind = e.at === 'stand' ? 'gem' : 'chunk';
        if (e.at === 'polisher') scene.fly(kind, from, 'pol', () => Math.max(0, S.polIn - 1), 0, 0.9, () => scene.bump('pol'));
        else if (e.at === 'stand') scene.fly(kind, from, 'stand', () => Math.max(0, S.stand - 1), 0, 0.9, () => scene.bump('stand'));
        else scene.fly(kind, from, 'crate', () => 0, 0, 0.9, (p) => { scene.bump('crate'); scene.fly('coin', p, 'cash', () => Math.max(0, S.cashPile - 1), 0, 1.6); });
        Sound.drop(h.n);
        break;
      }
      case 'gem': scene.fly('gem', scene.slot('wheel', 0, V()), 'counter', () => Math.max(0, S.counter - 1), 0, 1.2, (p) => { scene.bump('counter'); scene.twinkle(p, 4, 0xfff0c0, 0.4); }); Sound.gem(); break;
      case 'take': scene.bump('stand'); break;
      case 'sale': {
        const p = V(e.x, 1.3, e.z);
        for (let i = 0; i < e.amount; i++) scene.fly('coin', p, 'cash', () => Math.max(0, S.cashPile - 1), i * 0.08, 2.0, () => { Sound.coin(coinK++); scene.bump('cash'); });
        scene.cheer(e.id); pop('+' + e.amount, e.x, 2.3, e.z, 'gold'); Sound.sale();
        break;
      }
      case 'collect': {
        for (let i = 0; i < Math.min(3, e.n); i++) scene.fly('coin', scene.slot('cash', S.cashPile + i, V()), 'hero', () => 0, i * 0.04, 1.0, () => { cashBump = 1; Sound.coin(coinK++); });
        break;
      }
      case 'padShow': Sound.pop(); scene.showcase(V(cfg.pads[0].x, 0, cfg.pads[0].z), 0.82, 1.2); break;
      case 'pay': { if (e.paid % 2 === 0) scene.fly('coin', V(h.x, 1.4, h.z), 'pad', () => 0, 0, 1.0); scene.padPay(); Sound.pay(e.paid); break; }
      case 'unlock': scene.unlockRig(); Sound.fanfare(); banner(T('rig'), T('rigDone'), 2.6); scene.showcase(V(cfg.world.rigAt.x, 1.5, cfg.world.rigAt.z - 1), 0.7, 2.2); break;
      case 'eggDrop': scene.eggDrop(); Sound.whoosh(); scene.showcase(V(cfg.world.egg.x, 0, cfg.world.egg.z - 1.5), 0.8, 1.6); break;
      case 'hatchStart': scene.hatchStart(); hatchCracks = 0; break;
      case 'hatch': scene.hatch(); Sound.fanfare(); banner(T('hatch'), `${T('pup')}  ${T('perk')}`, 2.8); scene.showcase(V(cfg.world.egg.x, 0.5, cfg.world.egg.z), 0.62, 2.0); break;
      default: break;
    }
  }
  let hatchCracks = 0;

  // ---- loop
  let raf = 0, last = performance.now(), acc = 0, perfT = 0, perfN = 0, perfMs = 0, paused = false, glintAuto = 0;
  const DT = 1 / 60;
  function tick(dt) {
    let input = bot ? L.botInput(cfg, S) : readInput();
    if (!bot && (input.x || input.z) && !touched) { touched = true; $('hint').classList.add('gone'); }
    let tap = null;
    if (tapGlint) { tap = { glint: true }; tapGlint = false; }
    if (bot && S.glint && S.glint.t > 0.6 && (glintAuto += dt) > 0.1) { tap = { glint: true }; glintAuto = 0; }
    L.step(cfg, S, dt, input, tap);
    for (const e of S.events) onEvent(e);
    S.events.length = 0;
    if (S.egg.st === 'hatching') { const k = Math.floor((S.egg.t / cfg.egg.hatch) * 5); if (k > hatchCracks) { hatchCracks = k; Sound.crack(k); } }
  }
  const proj = (x, y, z) => { const [sx, sy] = scene.toScreen(x, y, z); return [sx * 100, sy * 100]; };
  function hud(dt) {
    const h = S.hero;
    // cash: counts up toward the real value
    if (shownCash !== h.cash) { shownCash += Math.sign(h.cash - shownCash) * Math.max(1, Math.ceil(Math.abs(h.cash - shownCash) * dt * 8)); if ((h.cash - shownCash) * Math.sign(h.cash - shownCash) < 0) shownCash = h.cash; cashEl.textContent = shownCash; }
    if (cashBump > 0) { bumpEl($('cash')); cashBump = 0; }
    // carry label over the stack
    const c = $('carry'), cap = L.carryCap(cfg, S);
    if (h.n > 0) { const [x, y] = proj(h.x, 1.7 + h.n * 0.16, h.z); c.hidden = false; c.style.left = x + '%'; c.style.top = y + '%'; const t = h.n >= cap ? T('full') : `${h.n}/${cap}`; if (c.textContent !== t) c.textContent = t; c.classList.toggle('max', h.n >= cap); }
    else c.hidden = true;
    for (const p of popEls) {
      if (p.d.hidden) continue; p.t += dt; const k = p.t / p.life;
      if (k >= 1) { p.d.hidden = true; continue; }
      const [x, y] = proj(p.x, p.y + k * 1.2, p.z); p.d.style.left = x + '%'; p.d.style.top = y + '%'; p.d.style.opacity = k > 0.7 ? (1 - k) / 0.3 : 1;
    }
    if (bannerT > 0 && (bannerT -= dt) <= 0) { $('banner').hidden = true; if (bannerQ.length) banner(...bannerQ.shift()); }
  }
  function frame(now) {
    raf = requestAnimationFrame(frame);
    if (paused) return;
    const real = Math.min(0.1, (now - last) / 1000); last = now; acc += real;
    let n = 0; while (acc >= DT && n < 6) { tick(DT); acc -= DT; n++; }
    if (n === 6) acc = 0;
    draw(real);
    // adaptive quality every window seconds (CPU frame time stands in for GPU time)
    perfT += real; perfN++; perfMs += real * 1000;
    if (perfT >= cfg.quality.window && !qs.has('tier')) {
      const nq = L.adaptQuality(cfg.quality, qa, perfMs / perfN, cfg.quality.window);
      if (nq.tier !== qa.tier) scene.setTier(nq.tier); if (nq.rs !== qa.rs) scene.setScale(nq.rs); qa = nq;
      perfT = 0; perfN = 0; perfMs = 0;
    }
  }
  function draw(dt) {
    const g = L.guide(cfg, S);
    scene.update(S, dt, g); scene.render(); hud(dt);
  }
  scene.snap(S);
  scene.prewarm();
  if (window.__load) window.__load.done();
  raf = requestAnimationFrame(frame);

  const api = {
    destroy() { cancelAnimationFrame(raf); ro.disconnect(); removeEventListener('keydown', onKey); removeEventListener('keyup', onKey); scene.dispose(); root.innerHTML = ''; if (window.__mg === api) window.__mg = null; },
    debug: {
      S, cfg, scene, L,
      /** Stops the real-time loop; frame(dt) then advances by hand (tests and screenshots). */
      pause(p = true) { paused = p; last = performance.now(); },
      /** Runs sec seconds of game time (bot input when bot is true), drawing only the last frame. */
      run(sec, useBot = true) { const n = Math.round(sec * 60); for (let i = 0; i < n; i++) { if (useBot) { const b = L.botInput(cfg, S); L.step(cfg, S, DT, b, S.glint && S.glint.t > 0.6 ? { glint: true } : null); for (const e of S.events) onEvent(e); S.events.length = 0; scene.update(S, DT, L.guide(cfg, S)); hud(DT); } else { tick(DT); hud(DT); } } draw(DT); },
      frame(dt = DT) { tick(dt); draw(dt); },
      /** Plays (bot) until an event of this type happens or maxSec passes; true when it happened. */
      until(type, maxSec = 120) {
        for (let i = 0; i < maxSec * 60; i++) {
          const b = L.botInput(cfg, S); L.step(cfg, S, DT, b, S.glint && S.glint.t > 0.6 && type !== 'glint' ? { glint: true } : null);
          const hit = S.events.some((e) => e.type === type); for (const e of S.events) onEvent(e); S.events.length = 0;
          scene.update(S, DT, L.guide(cfg, S)); hud(DT);
          if (hit) { draw(DT); return true; }
        }
        draw(DT); return false;
      },
      tapGlint() { const p = this.glintScreen(); if (p) tapGlint = true; return !!p; },
      draw(dt = 0) { draw(dt); },
      setTod: (t) => scene.setTod(t), setTier: (t) => scene.setTier(t), snap: () => scene.snap(S),
      glintScreen() { const g = scene.glint; if (!g) return null; const [x, y] = scene.toScreen(g.x, g.y, g.z); const r = root.getBoundingClientRect(); return [r.left + x * r.width, r.top + y * r.height]; },
      stats: () => scene.stats(),
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
  const store = { state: null };
  window.lib = { showGameParameters() {}, log() {}, getUserGameState: async () => ({ state: store.state }), saveUserGameState: async (s) => { store.state = s; }, addPlayerScoreToLeaderboard: none, getTopNEntriesFromLeaderboard: none,
    shouldUseTouchControls: () => matchMedia('(pointer: coarse)').matches, haptics: { play() {}, start() {}, stop() {} }, getAsset: () => undefined };
  fetch('./game_config.json').then((r) => r.json()).then((c) => { window.gameConfig = c; run(new URLSearchParams(location.search).get('mode') || 'play'); });
}
