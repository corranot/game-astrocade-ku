// PROTOTYPE - NOT FOR PRODUCTION
// Snowy Snapshot: walk a snowy valley, sneak up on shy animals and catch their silliest poses on an instant camera.
// This file runs the game: run(mode), the loop, input, the animals' behaviour, the photo flow, the HUD, the book
// and shop, the tutorial spotlight, cinematic beats, the day clock, daily visitors, save and share.
// Progress saves through lib.saveUserGameState. All tuning values are in game_config.json.
import * as L from './logic.js';
import { createWorld } from './world.js';
import { voxelize } from './voxel.js';
import { buildCritter, animateCritter, critterMaterials, buildHero, animateHero } from './critters.js';
import { createFx } from './fx.js';
import { Sound } from './audio.js';

const LANGS = ['en', 'ar', 'es', 'vi', 'hi', 'bn', 'id'];
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

// ---- icons (SVG, drawn by hand so every phone shows the same ink)
const ICON = {
  flake: '<svg viewBox="0 0 56 56"><g stroke="#1a2147" stroke-width="9" stroke-linecap="round"><path d="M28 6v44M9 17l38 22M9 39l38-22"/></g><g stroke="#bff7ff" stroke-width="5" stroke-linecap="round"><path d="M28 6v44M9 17l38 22M9 39l38-22M22 9l6 6 6-6M22 47l6-6 6 6"/></g><circle cx="28" cy="28" r="6" fill="#fff" stroke="#1a2147" stroke-width="3"/></svg>',
  book: '<svg viewBox="0 0 48 48"><path d="M8 9h14a4 4 0 0 1 4 4v28a4 4 0 0 0-4-4H8z" fill="#fff6e6" stroke="#fff" stroke-width="3" stroke-linejoin="round"/><path d="M40 9H28a4 4 0 0 0-4 4v28a4 4 0 0 1 4-4h12z" fill="#cfe6ff" stroke="#fff" stroke-width="3" stroke-linejoin="round"/><path d="M33 16l1.8 3.7 4 .6-2.9 2.8.7 4-3.6-1.9-3.6 1.9.7-4-2.9-2.8 4-.6z" fill="#ffcf3a"/></svg>',
  cam: '<svg viewBox="0 0 48 48"><path d="M8 15h8l3-5h10l3 5h8a3 3 0 0 1 3 3v19a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3V18a3 3 0 0 1 3-3z"/><circle cx="24" cy="27" r="8" fill="#e8513a"/><circle cx="24" cy="27" r="4" fill="#fff"/></svg>',
  star: '<svg viewBox="0 0 48 48"><path d="M24 4l6 12.5 13.6 2-9.8 9.6 2.3 13.6L24 35.3l-12.1 6.4 2.3-13.6-9.8-9.6 13.6-2z" fill="#ffcf3a" stroke="#1a2147" stroke-width="3" stroke-linejoin="round"/></svg>',
  pose: '<svg viewBox="0 0 48 48"><path d="M24 3l4 13 13-4-8 11 11 6-13 2 3 13-10-9-10 9 3-13-13-2 11-6-8-11 13 4z" fill="#ffcf3a" stroke="#1a2147" stroke-width="2.5" stroke-linejoin="round"/><path d="M24 15v11" stroke="#1a2147" stroke-width="5" stroke-linecap="round"/><circle cx="24" cy="32" r="3" fill="#1a2147"/></svg>',
  heart: '<svg viewBox="0 0 48 48"><path d="M24 41S6 30 6 18a9 9 0 0 1 18-3 9 9 0 0 1 18 3c0 12-18 23-18 23z" fill="#ff6a8a" stroke="#1a2147" stroke-width="3"/></svg>',
  share: '<svg viewBox="0 0 48 48"><path d="M24 30V8M15 16l9-9 9 9"/><path d="M12 24v14h24V24"/></svg>',
  hand: '<svg viewBox="0 0 64 64"><path d="M22 34V12a5 5 0 0 1 10 0v16l13 3a6 6 0 0 1 4 7l-3 14a8 8 0 0 1-8 6H29a8 8 0 0 1-6-3l-11-13a4.5 4.5 0 0 1 7-6z" fill="#fff6e6" stroke="#1a2147" stroke-width="4" stroke-linejoin="round"/></svg>',
  moon: '<svg viewBox="0 0 48 48"><path d="M30 6a18 18 0 1 0 12 30A15 15 0 0 1 30 6z" fill="#cfd8ff" stroke="#1a2147" stroke-width="3"/></svg>',
  two: '<svg viewBox="0 0 48 48"><circle cx="16" cy="26" r="9" fill="#f08a3c" stroke="#1a2147" stroke-width="3"/><circle cx="32" cy="22" r="9" fill="#f4f1ee" stroke="#1a2147" stroke-width="3"/></svg>',
  map: '<svg viewBox="0 0 48 48"><path d="M6 12l12-5 12 5 12-5v29l-12 5-12-5-12 5z" fill="#cfe6ff" stroke="#1a2147" stroke-width="3" stroke-linejoin="round"/><path d="M18 7v29M30 12v29" stroke="#1a2147" stroke-width="3"/></svg>',
  lock: '<svg viewBox="0 0 48 48"><rect x="10" y="21" width="28" height="21" rx="5" fill="#ffcf3a" stroke="#1a2147" stroke-width="3"/><path d="M16 21v-6a8 8 0 0 1 16 0v6" fill="none" stroke="#1a2147" stroke-width="4"/></svg>',
};
const SPK = '<svg viewBox="0 0 48 48" aria-hidden="true"><path class="spk" d="M9 19h7l10-8v26l-10-8H9z"/><path class="wav" d="M31 17c3 2 4 4.5 4 7s-1 5-4 7M35 12c5 3.5 7 7.5 7 12s-2 8.5-7 12"/><path class="x" d="M31 18l11 12M42 18L31 30"/></svg>';

/** Draws a treat (carrot, fish, berries, yarn) or shop icon on a 2D canvas. */
function drawIcon(cv, id, color) {
  const g = cv.getContext('2d'), w = cv.width; g.clearRect(0, 0, w, w); g.save(); g.scale(w / 100, w / 100); g.lineJoin = 'round'; g.lineCap = 'round'; g.lineWidth = 6; g.strokeStyle = '#1a2147';
  const blob = (x, y, rx, ry, c) => { g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, 7); g.fillStyle = c; g.fill(); g.stroke(); };
  if (id === 'carrot') { g.beginPath(); g.moveTo(30, 32); g.lineTo(74, 30); g.lineTo(48, 88); g.closePath(); g.fillStyle = '#ff8a2e'; g.fill(); g.stroke(); for (const a of [-0.5, 0, 0.5]) { g.beginPath(); g.ellipse(52 + a * 20, 18, 7, 15, a, 0, 7); g.fillStyle = '#4cc070'; g.fill(); g.stroke(); } }
  else if (id === 'fish') { g.beginPath(); g.moveTo(78, 50); g.lineTo(94, 34); g.lineTo(94, 66); g.closePath(); g.fillStyle = '#6ab8ff'; g.fill(); g.stroke(); blob(46, 50, 34, 20, '#8fd0ff'); blob(30, 45, 4, 4, '#1a2147'); }
  else if (id === 'berries') { blob(36, 58, 16, 16, '#e8384a'); blob(64, 58, 16, 16, '#e8384a'); blob(50, 36, 16, 16, '#ff5a6a'); g.beginPath(); g.ellipse(68, 22, 14, 7, -0.6, 0, 7); g.fillStyle = '#4cc070'; g.fill(); g.stroke(); }
  else if (id === 'yarn') { blob(50, 52, 34, 34, '#ff8ab8'); g.lineWidth = 4; for (const k of [-14, 0, 14]) { g.beginPath(); g.ellipse(50 + k * 0.3, 52, 30, 12, 0.6 + k * 0.03, 0, 7); g.stroke(); } g.beginPath(); g.moveTo(80, 70); g.quadraticCurveTo(92, 90, 70, 94); g.stroke(); }
  else if (id === 'zoom2' || id === 'zoom3') { blob(50, 50, 36, 36, '#2b2f38'); blob(50, 50, 24, 24, '#6ab8ff'); g.fillStyle = '#fff'; g.font = '900 30px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(id === 'zoom2' ? '2×' : '3×', 50, 52); }
  else if (id === 'flash') { blob(50, 50, 38, 38, '#3b2d6e'); g.beginPath(); g.moveTo(56, 14); g.lineTo(30, 56); g.lineTo(50, 56); g.lineTo(42, 86); g.lineTo(72, 42); g.lineTo(52, 42); g.closePath(); g.fillStyle = '#ffcf3a'; g.fill(); g.stroke(); }
  else if (id === 'slow') { blob(50, 50, 38, 38, '#fff6e6'); g.beginPath(); g.moveTo(50, 50); g.lineTo(50, 24); g.moveTo(50, 50); g.lineTo(68, 60); g.stroke(); }
  else if (id === 'owl') { blob(50, 56, 34, 38, '#c8a878'); blob(36, 48, 14, 14, '#fff'); blob(64, 48, 14, 14, '#fff'); blob(36, 49, 6, 7, '#1a2147'); blob(64, 49, 6, 7, '#1a2147'); g.beginPath(); g.moveTo(44, 62); g.lineTo(56, 62); g.lineTo(50, 72); g.closePath(); g.fillStyle = '#ffb347'; g.fill(); g.stroke(); g.beginPath(); g.moveTo(22, 26); g.lineTo(32, 34); g.lineTo(20, 36); g.moveTo(78, 26); g.lineTo(68, 34); g.lineTo(80, 36); g.stroke(); }
  else { blob(50, 46, 32, 30, color || '#e8513a'); g.beginPath(); g.ellipse(50, 22, 20, 12, 0, Math.PI, 0); g.fillStyle = '#fff6e6'; g.fill(); g.stroke(); blob(50, 10, 9, 9, '#fff6e6'); blob(50, 78, 26, 12, color || '#e8513a'); }
  g.restore();
}

const HTML = `
<canvas id="cv"></canvas>
<div class="hud">
  <div id="vf" class="vf"><i></i><i></i><i></i><i></i></div>
  <div id="focus" class="focus"><div class="dots"><s></s><s></s><s></s></div></div>
  <div id="bubs"></div>
  <div id="spot" class="spot"></div>
  <div id="cine" class="cine"><i></i><i></i></div>
  <div id="flash" class="flash"></div>
  <div id="iris" class="iris"></div>
  <div class="top"><div id="flakes" class="pill glass">${ICON.flake}<b id="flakesN">0</b></div><div id="stamps" class="pill glass"><span class="clock"><svg viewBox="0 0 56 56"><circle cx="28" cy="28" r="25" fill="none" stroke="rgba(255,255,255,.25)" stroke-width="5"/><circle id="clockArc" cx="28" cy="28" r="25" fill="none" stroke="#ffcf3a" stroke-width="5" stroke-linecap="round" stroke-dasharray="157" stroke-dashoffset="157" transform="rotate(-90 28 28)"/></svg>${ICON.book.replace('viewBox="0 0 48 48"', 'viewBox="-6 -6 60 60"')}</span><b id="stampsN">0</b></div></div>
  <button id="mute" class="rnd glass mute" aria-label="sound">${SPK}</button>
  <button id="bookB" class="rnd glass bookB" aria-label="book">${ICON.book}<em class="out">!</em></button>
  <div id="edge" class="edge" hidden><i></i></div>
  <button id="nightB" class="treat glass nightb" aria-label="night" hidden>${ICON.moon}</button>
  <button id="treat" class="treat glass" aria-label="treat" hidden><canvas width="96" height="96"></canvas><span class="lock"></span></button>
  <button id="shutter" class="shutter" aria-label="snap">${ICON.cam}</button>
  <div id="stick" class="stick" hidden><i></i></div>
  <div id="logo" class="logo out"></div>
  <div id="toast" class="toast" hidden><b class="out"></b><span class="out"></span><button id="share" class="share out" hidden>${ICON.share}<b></b></button></div>
  <div id="tick" class="tick glass" hidden></div>
  <div id="card" class="card" hidden><div class="nm out"></div><div class="ph"></div><div class="st"></div></div>
  <div id="coach" class="coach glass" hidden></div>
  <div id="hand" class="hand" hidden>${ICON.hand}</div>
  <button id="skip" class="skip glass" hidden></button>
  <div id="flies"></div>
  <div id="book" class="book" hidden><div class="sheet"><div class="tabs"><button data-t="pages"></button><button data-t="shop"></button><button data-t="req"></button></div><button class="close" aria-label="close">&#10005;</button>
    <div class="pane" data-p="pages"></div><div class="pane" data-p="shop" hidden></div><div class="pane" data-p="req" hidden></div></div></div>
</div>`;

/** Starts the game in mode 'play' or 'edit' (edit: the living valley, no input, no save). Returns { destroy }. */
export function run(mode = 'play') {
  if (window.__ss) { try { window.__ss.destroy(); } catch (e) { console.warn('previous run', e); } }
  if (typeof THREE === 'undefined') {
    const again = () => { removeEventListener('three-ready', again); window.__ss = run(mode); };
    addEventListener('three-ready', again);
    const wait = { destroy() { removeEventListener('three-ready', again); if (window.__ss === wait) window.__ss = null; } };
    window.__ss = wait; return wait;
  }
  if (!THREE.__vox) { window.THREE = voxelize(THREE); window.THREE.__vox = true; } // voxel preview: blocky primitives
  const cfg = JSON.parse(JSON.stringify(window.gameConfig || {})); // a copy: the host's config is never written
  if (typeof lib !== 'undefined' && lib.showGameParameters) lib.showGameParameters({ name: 'Snowy Snapshot', params: {
    'Walk speed': { key: 'hero.speed', type: 'slider', min: 3, max: 9, step: 0.2 },
    'Camera height': { key: 'camera.height', type: 'slider', min: 6, max: 16, step: 0.5 },
    'Photo range': { key: 'photo.range', type: 'slider', min: 6, max: 14, step: 0.5 },
    'Pose window (s)': { key: 'photo.poseWindowS', type: 'slider', min: 0.8, max: 3, step: 0.1 },
  } });
  loadFonts();
  const qs = new URLSearchParams(location.search);
  const play = mode === 'play';
  let bot = false;
  // dev:start
  bot = qs.has('bot');
  // dev:end
  const root = document.getElementById('app');
  root.innerHTML = HTML; root.classList.remove('live');
  const $ = (id) => root.querySelector('#' + id);
  const detect = () => { for (const l of navigator.languages || [navigator.language || 'en']) { const k = String(l).slice(0, 2).toLowerCase(); if (LANGS.includes(k)) return k; } return 'en'; };
  const lang = qs.get('lang') && LANGS.includes(qs.get('lang')) ? qs.get('lang') : detect();
  const T = (k, v = {}) => String((cfg.strings[lang] || cfg.strings.en)[k] || cfg.strings.en[k] || k).replace(/\{(\w)\}/g, (m, x) => (x in v ? v[x] : m));
  const name = (id) => T('s_' + id);
  root.dir = lang === 'ar' ? 'rtl' : 'ltr';
  $('logo').innerHTML = `${cfg.strings.en.title}<small>${lang === 'en' ? '' : T('title')}</small>`;
  $('skip').textContent = T('skip');
  const tabs = root.querySelectorAll('.tabs button'); tabs[0].textContent = T('book'); tabs[1].textContent = T('shop'); tabs[2].textContent = T('req');

  // ---- world
  let W;
  try { W = createWorld($('cv'), cfg, { keep: qs.has('keep') }); } catch (e) {
    console.warn('webgl', e); root.innerHTML = ''; if (window.__load) window.__load.fail('GL'); return { destroy() {} };
  }
  const coarse = typeof lib !== 'undefined' && lib.shouldUseTouchControls ? lib.shouldUseTouchControls() : matchMedia('(pointer: coarse)').matches;
  const cores = navigator.hardwareConcurrency || 4, mem = navigator.deviceMemory || 4;
  let tier0 = coarse ? (cores <= 4 || mem <= 3 ? 0 : 1) : 2;
  if (qs.has('tier')) tier0 = Number(qs.get('tier'));
  const quality = { tier: tier0, low: 0, high: 0, capped: false };
  W.setTier(tier0);
  const fx = createFx(W.scene, cfg, cfg.quality.particles[2]);
  const mats = critterMaterials();

  // ---- state
  let S = L.createState(cfg, Date.now());
  const today = () => L.dateKey(Date.now());
  L.rollDay(cfg, S, today());
  let rareId = L.dailyRare(cfg, S.day);
  const lookOf = () => { const o = S.outfit && L.item(cfg, S.outfit), c = S.cam && L.item(cfg, S.cam); return { parka: o ? o.parka : cfg.economy.outfit0.parka, hat: o ? o.hat : cfg.economy.outfit0.hat, cam: c ? c.color : cfg.economy.cam0 }; };

  // ---- hero
  const H = buildHero(lookOf(), mats); W.scene.add(H.group);
  const hero = { x: 0, z: 3, y: 0, vx: 0, vz: 0, yaw: Math.PI, speed: 0, stepD: 0, side: 1, still: 0, breathT: 1, walked: 0 };
  hero.y = L.terrainH(cfg, hero.x, hero.z);
  const applyLook = () => { const l = lookOf(); H.mats.parka.color.set(l.parka); H.mats.hat.color.set(l.hat); H.mats.cam.color.set(l.cam); };

  // ---- animals (area 1 now, the rest a little after the first frame)
  const R = L.rng(cfg.seed + 7);
  const animals = [];
  function makeAnimal(sp, look, isRare) {
    const parts = buildCritter(sp, mats, look); parts.phase = R() * 6.28;
    const home = look.home || sp.home;
    const a = { sp, id: look.id || sp.id, rare: isRare, parts, x: home[0], z: home[1], y: 0, yaw: R() * 6.28, home, tx: home[0], tz: home[1],
      state: 'idle', stT: 1 + R() * 3, walk: 0, pose: null, poseT: 0, poseEnd: -9, nextPose: 3 + R() * 4, cue: false, blink: 0, blinkT: 2 + R() * 3,
      hide: sp.shy ? 0.72 : 0, outT: 0, flee: 0, look: 0, present: true, voiceT: 3 + R() * 6, perch: sp.perch || 0, glowT: 0 };
    if (sp.type === 'whale') { a.yaw = Math.PI * 0.5; }
    W.scene.add(parts.group); animals.push(a); return a;
  }
  const speciesOf = (id) => L.speciesById(cfg, id);
  const buildQueue = []; let booted = false;
  // only the animals the first frame shows are built now (nearest first); the rest build one per frame after it
  { const d = (sp) => Math.hypot(sp.home[0] - hero.x, sp.home[1] - hero.z);
    const order = cfg.species.slice().sort((p, q) => (p.area - q.area) || (d(p) - d(q)));
    order.forEach((sp, i) => (i < cfg.quality.bootAnimals ? (f) => f() : (f) => buildQueue.push(f))(() => makeAnimal(sp, sp, false)));
    buildQueue.push(() => W.buildGround()); } // ground cover after the animals
  // tier 0 has no shadow map: soft blob shadows ground Pip and the animals instead (one instanced quad, built after
  // the first frame)
  let blobs = null;
  buildQueue.push(() => {
    const cv = document.createElement('canvas'); cv.width = cv.height = 64; const c = cv.getContext('2d'), gr = c.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.55, 'rgba(255,255,255,.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = gr; c.fillRect(0, 0, 64, 64);
    const geo = new THREE.PlaneGeometry(1, 1); geo.rotateX(-Math.PI / 2);
    blobs = new THREE.InstancedMesh(geo, new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(cv), color: cfg.grade.blob, transparent: true, opacity: cfg.grade.blobA, depthWrite: false }), 40);
    blobs.frustumCulled = false; blobs.renderOrder = 1; W.scene.add(blobs);
  });
  const blobM = new THREE.Matrix4(), blobQ = new THREE.Quaternion(), blobP = new THREE.Vector3(), blobS = new THREE.Vector3();
  function updateBlobs() {
    if (!blobs) return; blobs.visible = W.tier === 0; if (!blobs.visible) return;
    let n = 0; const put = (x, z, r) => { blobP.set(x, L.terrainH(cfg, x, z) + 0.03, z); blobS.set(r, 1, r); blobs.setMatrixAt(n++, blobM.compose(blobP, blobQ, blobS)); };
    put(hero.x, hero.z, 1.3);
    for (const a of animals) if (n < 40 && a.parts.group.visible && Math.hypot(a.x - hero.x, a.z - hero.z) < 40) put(a.x, a.z, a.parts.radius * 2.6);
    blobs.count = n; blobs.instanceMatrix.needsUpdate = true;
  }
  const placeRare = () => {
    for (const a of animals.filter((q) => q.rare)) { W.scene.remove(a.parts.group); animals.splice(animals.indexOf(a), 1); }
    const r = L.rareById(cfg, rareId), base = speciesOf(r.base);
    const home = r.area < S.open ? r.home : cfg.rares.find((x) => x.area === 0).home;
    makeAnimal(base, { ...r, home }, true);
  };
  placeRare();

  // ---- HUD helpers
  const ui = { flakes: -1, stamps: -1, bookDot: false };
  const pill = (id, v) => { const el = $(id + 'N'); if (el.textContent !== String(v)) { el.textContent = v; $(id).classList.remove('bump'); void $(id).offsetWidth; $(id).classList.add('bump'); } };
  const totalStamps = cfg.species.length * 3;
  const hud = () => {
    const st = L.stamps(S);
    if (Math.floor(S.flakes) !== ui.flakes) { ui.flakes = Math.floor(S.flakes); pill('flakes', ui.flakes); }
    if (st !== ui.stamps) { ui.stamps = st; pill('stamps', `${st}/${totalStamps}`); }
  };
  const muteUI = () => $('mute').classList.toggle('off', Sound.muted);
  muteUI();
  // shared "toast" at eye level
  let toastT = 0, toastQ = [];
  function toast(title, sub = '', shareKind = null) { if (!alive) return; hideLogo(); toastQ.push({ title, sub, shareKind }); if (toastT <= 0) nextToast(); }
  function nextToast() {
    if (!alive) return;
    const t = toastQ.shift(); if (!t) { $('toast').hidden = true; return; }
    const el = $('toast'); el.hidden = false; el.querySelector('b').textContent = t.title; el.querySelector('span').textContent = t.sub;
    const sh = $('share'); sh.hidden = !(t.shareKind && shareOk()); sh.querySelector('b').textContent = T('share'); sh.dataset.k = t.shareKind || '';
    el.style.animation = 'none'; void el.offsetWidth; el.style.animation = '';
    toastT = sh.hidden ? 2.2 : 4.5;
  }
  let tickT = 0;
  function tick(html) { if (!alive) return; const el = $('tick'); el.innerHTML = html; el.hidden = false; el.style.animation = 'none'; void el.offsetWidth; el.style.animation = ''; tickT = 2.4; }
  // the root's box, read once per resize: reading it every frame forced a layout after each HUD write
  let rootR = null; const rootRect = () => rootR || (rootR = root.getBoundingClientRect());
  const toPx = (sx, sy) => { const r = rootRect(); return [sx * r.width, sy * r.height]; };
  const unit = () => { const r = rootRect(); return Math.min(r.width, r.height * 9 / 16) / 720; }; // phone-sized HUD on any screen; the world fills it
  const layoutU = () => { root.style.setProperty('--u', String(unit())); };
  layoutU();
  // flying snowflakes from a screen point into the counter
  function flyFlakes(fromX, fromY, n) {
    const tgt = $('flakes').getBoundingClientRect(), r = rootRect();
    for (let i = 0; i < Math.min(8, n); i++) {
      const el = document.createElement('div'); el.className = 'fly'; el.innerHTML = ICON.flake; $('flies').appendChild(el);
      el.style.left = fromX + 'px'; el.style.top = fromY + 'px';
      const tx = tgt.left - r.left + tgt.height * 0.5, ty = tgt.top - r.top + tgt.height * 0.5, mx = (fromX + tx) / 2 + (Math.random() - 0.5) * 160, my = Math.min(fromY, ty) - 80;
      const an = el.animate([{ transform: 'translate(0,0) scale(.6)', opacity: 1 }, { transform: `translate(${mx - fromX}px,${my - fromY}px) scale(1.1)`, opacity: 1, offset: 0.45 }, { transform: `translate(${tx - fromX}px,${ty - fromY}px) scale(.7)`, opacity: 0.9 }], { duration: 700 + i * 60, delay: i * 50, easing: 'cubic-bezier(.5,0,.5,1)' });
      an.onfinish = () => { el.remove(); if (i === 0) Sound.coin(0); };
    }
  }

  // ---- save: read first, write only after the read came back (a failed read never overwrites a save)
  const canSave = play && !bot && typeof lib !== 'undefined' && !!lib.saveUserGameState;
  let loaded = !canSave, lastWrite = window.__ssWrite || Promise.resolve(), saveT = 0, dirty = false, alive = true, mailPending = false;
  function saveNow() {
    if (!canSave || !loaded) return;
    const snap = L.serialize(cfg, S); snap.mute = Sound.muted;
    dirty = false; saveT = 0;
    lastWrite = window.__ssWrite = lastWrite.then(() => lib.saveUserGameState(snap)).catch(() => { dirty = true; }); // shared by every run: a re-run reads after this write
  }
  const soon = () => { dirty = true; if (saveT < cfg.save.everyS - 1.5) saveT = cfg.save.everyS - 1.5; };
  function readSave(tries = 0) {
    const read = () => Promise.race([Promise.resolve().then(() => lib.getUserGameState()), new Promise((res, rej) => setTimeout(() => rej(new Error('save read timed out')), 8000))]);
    lastWrite.then(read).then((r) => {
      if (!alive) return;
      const st = r && r.state;
      if (st && typeof st === 'object' && st.v === cfg.save.version) {
        S = L.merge(cfg, st, S); if (play && !bot) ftue = L.ftueNow(S); if (typeof st.mute === 'boolean') { Sound.setMuted(st.mute); muteUI(); }
        const roll = L.rollDay(cfg, S, today()); mailPending = roll.mail || (S.day === today() && S.mailDay !== S.day && S.photos > 0 && st.day && st.day < today());
        rareId = L.dailyRare(cfg, S.day); placeRare(); applyLook();
        for (let i = 1; i < S.open; i++) W.openGate(i - 1);
        ui.flakes = -1; ui.stamps = -1;
      }
      loaded = true; dirty = true;
    }).catch(() => { if (alive) setTimeout(() => readSave(tries + 1), Math.min(8000, 600 * (tries + 1))); });
  }
  if (canSave) readSave();
  const onHide = () => { if (document.hidden) { saveNow(); input.keys.clear(); } };
  document.addEventListener('visibilitychange', onHide);

  // ---- share (no image: the host card shows the game's live thumbnail)
  const canShare = play && typeof lib !== 'undefined' && typeof lib.share === 'function';
  let playT = 0, lastShare = -999;
  const shareOk = () => canShare && playT > 60 && playT - lastShare > 180;
  $('share').addEventListener('click', () => {
    lastShare = playT; $('share').hidden = true; Sound.pop();
    const k = $('share').dataset.k, text = k && k.startsWith('rare:') ? T('bragRare', { s: name(k.slice(5)) }) : T('brag');
    Promise.resolve().then(() => lib.share({ title: T('title'), text })).catch(() => { /* host has no sheet */ });
  });

  // ---- cinematic beats: one priority queue with a cooldown; never block input
  const beats = { q: [], cur: null, cool: 0 };
  /** Queues a beat. b = { pri, dur, pos(), look(), fov, slow, bars, sting, start() } */
  function beat(b) { if (!play && !bot) return; beats.q.push(b); beats.q.sort((x, y) => y.pri - x.pri); }
  let timeScale = 1;
  function stepBeats(rdt) {
    beats.cool -= rdt;
    if (!beats.cur && beats.q.length && beats.cool <= 0 && !bookOpen) { beats.cur = beats.q.shift(); beats.cur.t = 0; beats.cur.k = 0; if (beats.cur.start) beats.cur.start(); if (beats.cur.sting) Sound.sting(beats.cur.sting); $('cine').classList.toggle('on', !!beats.cur.bars); }
    const b = beats.cur; timeScale = 1;
    if (!b) return null;
    b.t += rdt; const d = b.dur, e = 0.35;
    b.k = b.t < e ? b.t / e : b.t > d - e ? Math.max(0, (d - b.t) / e) : 1; b.k = b.k * b.k * (3 - 2 * b.k);
    if (b.slow && b.t > e && b.t < e + 0.45) timeScale = cfg.beats.slowMo;
    if (b.t >= d) { beats.cur = null; beats.cool = cfg.beats.cooldownS; $('cine').classList.remove('on'); return null; }
    return { pos: b.pos(b.t), look: b.look(b.t), fov: b.fov || 40, k: b.k, clear: !!b.clear };
  }
  const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
  const beatAt = (a, opts = {}) => ({ pri: opts.pri || 2, dur: opts.dur || 1.6, bars: true, slow: !!opts.slow, sting: opts.sting, fov: 40,
    pos: () => { const dx = hero.x - a.x, dz = hero.z - a.z, d = Math.hypot(dx, dz) || 1, r = 3 + a.parts.radius * 6; return V3(a.x + dx / d * r + 1.4, a.y + 1.2 + a.parts.height * 0.8, a.z + dz / d * r); },
    look: () => V3(a.x, a.y + a.parts.centerY, a.z) });

  // ---- tutorial (spotlight: the screen dims except a soft cutout; steps advance on the real action)
  let ftue = (play && !bot) ? L.ftueNow(S) : null, ftueT = 0;
  const ftueOn = () => play && !bot && loaded && ftue && !S.ftueDone;
  function ftueDid(name) { if (!play || bot) return; const before = ftue; ftue = L.ftueDo(S, name); if (before !== ftue) { ftueT = 0; soon(); } }
  $('skip').addEventListener('click', () => { S.ftueDone = true; ftue = null; hideLogo(); Sound.pop(); soon(); });

  // ---- book, shop and today's requests
  let bookOpen = false, bookTab = 'pages', bookAutoClose = 0;
  const portraits = new Map();
  let studio = null;
  /** A portrait of species `id` in a small studio (a silhouette when not yet photographed). Cached. */
  function portrait(id, seen) {
    const key = id + (seen ? '' : ':s'); if (portraits.has(key)) return portraits.get(key);
    if (!studio) {
      studio = new THREE.Scene(); studio.add(new THREE.HemisphereLight(0xffffff, 0xb9d4f2, 1.4)); const d = new THREE.DirectionalLight(0xffffff, 1.8); d.position.set(2, 4, 3); studio.add(d);
      const bg = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), new THREE.MeshBasicMaterial({ color: 0xdfeaf6 })); bg.position.set(0, 0, -6); studio.add(bg);
      const fl = new THREE.Mesh(new THREE.CircleGeometry(3, 24), new THREE.MeshStandardMaterial({ color: 0xf4f9ff })); fl.rotation.x = -Math.PI / 2; studio.add(fl);
      studio.userData.sil = new THREE.MeshBasicMaterial({ color: 0x9fb0c8 });
    }
    const r = L.rareById(cfg, id), sp = r ? speciesOf(r.base) : speciesOf(id);
    const parts = buildCritter(sp, mats, r || sp); parts.phase = 0; parts.group.rotation.y = 0.55; studio.add(parts.group);
    animateCritter(parts, sp, { t: 0.3, walk: 0, pose: null, p: 0, blink: 0, look: 0, hide: 0 });
    if (!seen) parts.group.traverse((o) => { if (o.isMesh) o.material = studio.userData.sil; });
    const h = Math.max(parts.height, parts.radius * 1.4), cy = h * 0.5;
    const cv = W.capture(V3(0, cy + h * 0.25, h * 2.3 + 1.2), V3(0, cy, 0), 34, studio);
    studio.remove(parts.group); parts.group.traverse((o) => { if (o.isMesh) o.geometry.dispose(); });
    const small = document.createElement('canvas'); small.width = 128; small.height = 160; small.getContext('2d').drawImage(cv, 0, 0, 128, 160);
    portraits.set(key, small); if (portraits.size > 40) portraits.delete(portraits.keys().next().value);
    return small;
  }
  const photoOf = new Map(); // this session's best real photos per species
  function cardFor(id, b, hint) {
    const el = document.createElement('div'); el.className = 'sp' + (b ? '' : ' hint'); el.style.setProperty('--rot', ((id.length * 37) % 7 - 3) * 0.6 + 'deg');
    const cv = photoOf.get(id) ? photoOf.get(id).cv : portrait(id, !!b);
    const c2 = document.createElement('canvas'); c2.width = 128; c2.height = 160; c2.getContext('2d').drawImage(cv, 0, 0, 128, 160); el.appendChild(c2);
    el.insertAdjacentHTML('beforeend', `<span class="tape"></span><b>${b ? name(id) : '?'}</b><div class="sl"><i class="${b & 1 ? 'on' : ''}"></i><i class="p ${b & 2 ? 'on' : ''}"></i><i class="s ${b & 4 ? 'on' : ''}"></i></div>`);
    if (!b && hint) el.insertAdjacentHTML('beforeend', `<span class="ico">${hint}</span>`);
    return el;
  }
  function buildBook() {
    const P = root.querySelector('[data-p=pages]'); P.innerHTML = '';
    cfg.areas.forEach((a, i) => {
      const list = L.areaSpecies(cfg, i), got = list.filter((s) => S.slots[s.id] & 1).length;
      const pg = document.createElement('div'); pg.className = 'page' + (i < S.open ? '' : ' lockd');
      pg.innerHTML = `<h3>${T('a_' + a.id)} <small>${got}/${list.length}${i < S.open ? '' : ' · ' + T('locked', { n: a.unlock })}</small></h3>`;
      const g = document.createElement('div'); g.className = 'grid';
      for (const s of list) g.appendChild(cardFor(s.id, S.slots[s.id] | 0, s.night ? ICON.moon : s.shy ? '' : ''));
      pg.appendChild(g); P.appendChild(pg);
    });
    const rp = document.createElement('div'); rp.className = 'page'; rp.innerHTML = `<h3>${T('rare')}</h3>`; const rg = document.createElement('div'); rg.className = 'grid';
    for (const r of cfg.rares) rg.appendChild(cardFor(r.id, S.rare[r.id] ? 1 : 0, ICON.star)); rp.appendChild(rg); P.appendChild(rp);
    // shop
    const SP = root.querySelector('[data-p=shop]'); SP.innerHTML = '<div class="items"></div>'; const items = SP.firstChild;
    for (const it of cfg.economy.shop) {
      const st = L.canBuy(cfg, S, it.id), own = st === 'owned', worn = (it.kind === 'outfit' && S.outfit === it.id) || (it.kind === 'cam' && S.cam === it.id);
      const el = document.createElement('div'); el.className = 'it'; const cv = document.createElement('canvas'); cv.width = 112; cv.height = 112;
      drawIcon(cv, it.kind === 'outfit' || it.kind === 'cam' ? 'wear' : it.id, it.parka || it.color); el.appendChild(cv);
      el.insertAdjacentHTML('beforeend', `<b>${T('i_' + (it.kind === 'outfit' ? 'outfit' : it.kind === 'cam' ? 'cam' : it.id))}</b>`);
      const btn = document.createElement('button');
      if (own) { btn.className = 'own'; btn.textContent = (it.kind === 'outfit' || it.kind === 'cam') ? (worn ? T('owned') : T('wear')) : T('owned'); }
      else if (st === 'needs') { btn.className = 'poor'; btn.innerHTML = ICON.lock; }
      else { btn.className = st === 'ok' ? '' : 'poor'; btn.innerHTML = `${ICON.flake}${it.price}`; }
      btn.addEventListener('click', () => {
        if (own && (it.kind === 'outfit' || it.kind === 'cam')) { if (it.kind === 'outfit') S.outfit = it.id; else S.cam = it.id; applyLook(); Sound.pop(); soon(); buildBook(); return; }
        if (L.buy(cfg, S, it.id)) { Sound.sting('friend'); applyLook(); fx.emit({ pool: 'glow', x: hero.x, y: hero.y + 1.5, z: hero.z, spread: 1, speed: 3, up: 2, life: 1, size: 0.3, color: '#ffcf3a', shape: 'star', grav: -2 }, 18); soon(); buildBook(); hud(); }
        else Sound.pop();
      });
      el.appendChild(btn); items.appendChild(el);
    }
    // today's requests and visitor
    const RP = root.querySelector('[data-p=req]'); RP.innerHTML = '';
    const hoot = document.createElement('div'); hoot.className = 'hoot'; const oc = document.createElement('canvas'); oc.width = 112; oc.height = 112; drawIcon(oc, 'owl'); hoot.appendChild(oc);
    hoot.insertAdjacentHTML('beforeend', `<span>${T('rare')} ${name(rareId)}${S.rareDay === S.day ? ' ✓' : ''}</span>`); RP.appendChild(hoot);
    const list = document.createElement('div'); list.className = 'reqs';
    for (const q of S.req) {
      const ico = { species: ICON.cam, stars3: ICON.star, night: ICON.moon, two: ICON.two, pose: ICON.pose, area: ICON.map }[q.type];
      const txt = T('r_' + q.type, { s: q.arg ? name(q.arg) : '', a: q.type === 'area' ? T('a_' + cfg.areas[q.arg].id) : '' });
      list.insertAdjacentHTML('beforeend', `<div class="rq ${q.done ? 'done' : ''}">${ico}<span>${txt}</span><i>${q.done ? '✓' : '+' + cfg.economy.request}</i></div>`);
    }
    RP.appendChild(list);
    // what tomorrow brings: a reason to come back (no streak, nothing lost by missing a day)
    RP.insertAdjacentHTML('beforeend', `<div class="rq soon">${ICON.moon}<span>${T('tomorrow')}</span><i>✦</i></div>`);
    const reqLeft = S.req.filter((q) => !q.done).length; tabs[2].innerHTML = T('req') + (reqLeft ? `<em>${reqLeft}</em>` : '');
    for (const b of tabs) b.classList.toggle('on', b.dataset.t === bookTab);
    root.querySelectorAll('.pane').forEach((p) => { p.hidden = p.dataset.p !== bookTab; });
    root.querySelector('.sheet').classList.toggle('fit', bookTab === 'req'); // today's short list: the sheet hugs it
  }
  function openBook(tab) { if (tab) bookTab = tab; bookOpen = true; $('book').hidden = false; buildBook(); Sound.whoosh(); ftueDid('book'); ui.bookDot = false; $('bookB').classList.remove('dot'); }
  function closeBook() { bookOpen = false; $('book').hidden = true; bookAutoClose = 0; }
  $('bookB').addEventListener('click', () => { Sound.unlock(); if (bookOpen) closeBook(); else { openBook(); if (ftueT >= 0 && S.photos <= 2) bookAutoClose = 3; } });
  $('book').querySelector('.close').addEventListener('click', () => { Sound.pop(); closeBook(); });
  $('book').addEventListener('pointerdown', (e) => { bookAutoClose = 0; if (e.target === $('book')) closeBook(); });
  for (const b of tabs) b.addEventListener('click', () => { bookTab = b.dataset.t; Sound.pop(); buildBook(); });
  $('mute').addEventListener('click', () => { Sound.unlock(); Sound.setMuted(!Sound.muted); muteUI(); soon(); });

  // ---- input: drag anywhere for a floating stick, tap the snow to walk there
  // a drag that starts on the right side of the screen looks around (swipe-to-look) instead of moving
  const input = { id: null, x0: 0, y0: 0, t0: 0, dx: 0, dy: 0, drag: false, keys: new Set(), target: null, look: false, lx: 0, ly: 0 };
  const view = { yaw: 0, el: 0, tYaw: 0, tEl: 0, idle: 0 };
  let firstGesture = false;
  const gesture = () => { if (!firstGesture) { firstGesture = true; hideLogo(); } Sound.unlock(); };
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), hit = new THREE.Vector3();
  function onDown(e) {
    if (!play || bot || e.target.closest('button') || bookOpen) return;
    gesture(); if (input.id !== null) return;
    try { root.setPointerCapture(e.pointerId); } catch (err) { /* a synthetic pointer */ }
    input.id = e.pointerId; input.x0 = input.lx = e.clientX; input.y0 = input.ly = e.clientY; input.t0 = performance.now(); input.dx = input.dy = 0; input.drag = false;
    const r = rootRect(); input.look = e.clientX - r.left > r.width * (1 - cfg.camera.look.zone);
  }
  function onMove(e) {
    if (e.pointerId !== input.id) return;
    input.dx = e.clientX - input.x0; input.dy = e.clientY - input.y0;
    if (input.look) {
      if (!input.drag && Math.hypot(input.dx, input.dy) >= cfg.hero.tapMaxPx * unit() * 1.5) { input.drag = true; input.lx = e.clientX; input.ly = e.clientY; }
      if (input.drag) { const lk = cfg.camera.look, k = lk.radPerPx / unit(); view.tYaw = Math.max(-lk.yawMax, Math.min(lk.yawMax, view.tYaw - (e.clientX - input.lx) * k)); view.tEl = Math.max(-lk.elDown, Math.min(lk.elUp, view.tEl + (e.clientY - input.ly) * k)); view.idle = 0; input.lx = e.clientX; input.ly = e.clientY; if (!(S.hints & 4)) { S.hints |= 4; dirty = true; } }
      return;
    }
    if (!input.drag && Math.hypot(input.dx, input.dy) >= cfg.hero.tapMaxPx * unit() * 1.5) {
      input.drag = true; input.target = null; const r = rootRect(), s = $('stick'); s.hidden = false; s.style.left = (input.x0 - r.left) + 'px'; s.style.top = (input.y0 - r.top) + 'px';
    }
    if (input.drag) { const m = cfg.hero.stickMaxPx * unit(), l = Math.hypot(input.dx, input.dy), k = l > m ? m / l : 1; $('stick').firstChild.style.transform = `translate(${input.dx * k}px,${input.dy * k}px)`; }
  }
  function onUp(e) {
    if (e.pointerId !== input.id) return;
    const kind = L.tapOrDrag(cfg, Math.hypot(input.dx, input.dy) / unit(), performance.now() - input.t0);
    if (kind === 'tap' && !input.drag) {
      const r = rootRect(); ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ndc, W.camera); plane.constant = -hero.y;
      if (ray.ray.intersectPlane(plane, hit)) { input.target = [hit.x, hit.z]; fx.ring(hit.x, L.terrainH(cfg, hit.x, hit.z), hit.z, 0.9, '#bff7ff', 0.45); }
    }
    input.id = null; input.drag = false; input.look = false; input.dx = input.dy = 0; $('stick').hidden = true;
  }
  root.addEventListener('pointerdown', onDown); root.addEventListener('pointermove', onMove); root.addEventListener('pointerup', onUp); root.addEventListener('pointercancel', onUp);
  const onKey = (e) => {
    if (!play || bot) return;
    const k = e.key.toLowerCase();
    if (e.type === 'keydown') {
      gesture(); input.keys.add(k);
      if (k === ' ' && !e.repeat) { e.preventDefault(); snap(); }
      if (k === 't' && !e.repeat) toss();
      if (k === 'b' && !e.repeat) { if (bookOpen) closeBook(); else openBook(); }
      if (k === 'escape') closeBook();
    } else input.keys.delete(k);
  };
  addEventListener('keydown', onKey); addEventListener('keyup', onKey);
  const onBlur = () => { input.keys.clear(); }; addEventListener('blur', onBlur); // a key released in another window never sends keyup
  $('shutter').addEventListener('click', () => { gesture(); snap(); });
  $('treat').addEventListener('click', () => { gesture(); toss(); });
  // "wait for night": once every day animal is done, the clock runs fast to nightfall instead of making the player wait
  let skipTo = null, nightLeftT = 0, nightLeft = false;
  $('nightB').addEventListener('click', () => {
    gesture(); if (skipTo !== null) return;
    const day = cfg.clock.dayS, ph = cfg.clock.phases, at = ph[0][1] + ph[1][1], base = Math.floor(S.clock / day) * day;
    skipTo = base + at + 1 + (((S.clock % day) + day) % day >= at ? day : 0); Sound.whoosh(); Sound.shimmer(); buzz('snap');
  });
  function onlyNightLeft() {
    const dayLeft = animals.some((a) => !a.rare && !a.sp.night && a.sp.area < S.open && ((S.slots[a.id] | 0) & 7) !== 7 && (!a.sp.shy || L.treatOwned(S, a.sp.shy)));
    return !dayLeft && cfg.species.some((s) => s.night && s.area < S.open && ((S.slots[s.id] | 0) & 7) !== 7);
  }
  var logoT = 4; // var: toast() may hide the logo before this line runs
  function hideLogo() { const l = $("logo"); if (l) l.classList.add("gone"); logoT = 0; }

  // ---- the viewfinder target: the nearest present animal in range
  let vf = 0, aim = null, aimA = null, vfFov = cfg.camera.vfFov, focusK = 0, focusAt = null;
  function nearest(range) {
    let best = null, bd = 1e9;
    for (const a of animals) {
      if (!a.present || a.hide > 0.5 || !a.parts.group.visible) continue;
      const d = Math.hypot(a.x - hero.x, a.z - hero.z); if (d >= range) continue;
      // an animal that still has an empty slot wins over a nearer one whose page is already full
      const full = a.rare ? !!S.rare[a.id] : ((S.slots[a.id] | 0) & 7) === 7, k = d + (full ? cfg.photo.fullPenaltyM : 0);
      if (k < bd) { bd = k; best = a; }
    }
    return best;
  }
  /** Smart zoom: the vertical fov that frames `a` at about photo.aimCover of the narrow side, never tighter than the lens allows. */
  const narrow = (v) => { const asp = W.camera.aspect || 1; return asp >= 1 ? v : 2 * Math.atan(Math.tan(v * Math.PI / 360) * asp) * 180 / Math.PI; };
  const fovFor = (a, d) => {
    const ln = L.lens(cfg, S), asp = Math.min(1, W.camera.aspect || 1), th = 2 * Math.atan(a.parts.radius * cfg.photo.frameR / Math.max(0.5, d)) / cfg.photo.aimCover; // frameR: a side-on body with its tail is wider than its radius
    const v = 2 * Math.atan(Math.tan(th / 2) / asp) * 180 / Math.PI;
    return Math.max(ln.fov, Math.min(cfg.photo.maxFov, v));
  };
  const photoFrom = (a) => { const dx = a.x - hero.x, dz = a.z - hero.z, d = Math.hypot(dx, dz) || 1; return V3(hero.x - dx / d * cfg.camera.vfDist, hero.y + cfg.camera.vfHeight, hero.z - dz / d * cfg.camera.vfDist); };
  const inPose = (a) => (a.pose && a.poseT >= 0) || clockT - a.poseEnd < cfg.photo.poseGraceS + (S.owned.includes('slow') ? cfg.photo.poseWindowSlowS - cfg.photo.poseWindowS : 0); // a short grace after the pose: small hands react late
  /** What a photo of `a` would score now. */
  function shotOf(a) {
    const from = photoFrom(a), cy = a.y + a.parts.centerY, d = Math.hypot(a.x - from.x, cy - from.y, a.z - from.z), fov = fovFor(a, d);
    const cover = L.coverage(d, a.parts.radius, narrow(fov)), occ = L.occluded(W.trunks, from.x, from.z, a.x, a.z);
    const night = L.clockAt(cfg, S.clock).night, flash = S.owned.includes('flash');
    const others = animals.filter((o) => o !== a && o.present && o.parts.group.visible && o.hide < 0.5 && Math.hypot(o.x - hero.x, o.z - hero.z) < L.lens(cfg, S).range + 4 && Math.abs(angleDiff(Math.atan2(o.x - from.x, o.z - from.z), Math.atan2(a.x - from.x, a.z - from.z))) < fov * Math.PI / 360 * 0.9).length;
    const sh = { cover, occluded: occ, inPose: !!inPose(a), night, flash };
    return { from, at: V3(a.x, cy, a.z), fov, stars: L.rate(cfg, sh), framed: !occ && cover >= cfg.photo.minCover && cover <= cfg.photo.maxCover, inPose: sh.inPose, night, others };
  }
  const angleDiff = (a, b) => { let d = a - b; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return d; };

  // ---- snapping a photo
  let cardBusy = 0, clockT = 0, snapCool = 0;
  // the card keeps the screen's horizontal framing (the card is wider than a portrait screen)
  const cardFov = (v) => 2 * Math.atan(Math.tan(narrow(v) * Math.PI / 360) / (cfg.photo.w / cfg.photo.h)) * 180 / Math.PI;
  /** A short phone buzz where the device allows it (tuned in config; silent when muted). */
  const buzz = (k) => { try { if (!Sound.muted && navigator.vibrate) navigator.vibrate(cfg.feel.buzz[k]); } catch (e) { /* not supported */ } };
  function snap() {
    if (!play || bookOpen || snapCool > 0) return;
    snapCool = 0.45; Sound.shutter(); buzz('snap');
    $('flash').classList.remove('go'); void $('flash').offsetWidth; $('flash').classList.add('go');
    $('iris').classList.remove('go'); void $('iris').offsetWidth; $('iris').classList.add('go');
    $('shutter').classList.remove('bump'); void $('shutter').offsetWidth; $('shutter').classList.add('bump');
    W.shake.t = 0.12; W.shake.a = 0.04;
    const a = nearest(L.lens(cfg, S).range);
    let res, cv, stars = 1, shot = null;
    if (a) {
      shot = shotOf(a); stars = shot.stars;
      cv = W.capture(shot.from, shot.at, cardFov(shot.fov));
      res = L.applyPhoto(cfg, S, { id: a.id, stars, inPose: shot.inPose, night: shot.night, area: L.areaAt(cfg, hero.x, hero.z), others: shot.others, now: Date.now() });
      const best = photoOf.get(a.id); if (!best || best.stars <= stars) photoOf.set(a.id, { cv, stars });
      // the animal reacts: hearts and its call
      fx.emit({ pool: 'glow', x: a.x, y: a.y + a.parts.height + 0.3, z: a.z, spread: 0.6, speed: 0.8, up: 1.6, life: 1.4, size: 0.42, color: '#ff8aa8', shape: 'heart', grav: 0.2, drag: 2 }, 3 + stars);
      // flash beat: a warm ring at the animal's feet and a spray of sparkles; a 3-star shot adds a second, wider ring
      fx.ring(a.x, a.y + 0.05, a.z, 1.6 + a.parts.radius, '#fff1c4', 0.55);
      if (stars >= 3) setTimeout(() => alive && fx.ring(a.x, a.y + 0.05, a.z, 3.2 + a.parts.radius, '#ffe48a', 0.7), 120);
      fx.emit({ pool: 'glow', x: a.x, y: a.y + a.parts.height * 0.6, z: a.z, spread: a.parts.radius + 0.4, speed: 2.2, up: 1.2, life: 0.9, size: 0.16, color: '#fff6d8', shape: 'star', grav: -1.5, drag: 2.5 }, 4 + stars * 3);
      Sound.voice(a.sp); a.voiceT = 4;
      ftueDid('walk'); ftueDid('snap'); if (shot.inPose) ftueDid('pose');
    } else {
      const fwd = V3(hero.x + Math.sin(hero.yaw) * 8, hero.y + 1.6, hero.z + Math.cos(hero.yaw) * 8);
      cv = W.capture(V3(hero.x, hero.y + 2.2, hero.z), fwd, cfg.camera.vfFov);
      res = L.applyPhoto(cfg, S, { id: null, stars: 1, now: Date.now() });
    }
    showCard(cv, a, stars, res);
    // a posed night photo stuck at 2 stars: say once what would make it 3
    if (shot && shot.night && shot.inPose && shot.framed && !S.owned.includes('flash') && !(S.hints & 2)) { S.hints |= 2; dirty = true; setTimeout(() => toast(T('flashHint'), T('i_flash')), 2600); }
    soon();
  }
  function showCard(cv, a, stars, res) {
    const card = $('card'); card.hidden = false; card.className = 'card' + (a && a.rare ? ' rare' : '') + (stars >= 3 ? ' gold' : '');
    const ph = card.querySelector('.ph'); ph.innerHTML = ''; ph.appendChild(cv); ph.style.setProperty('--dev', '1');
    card.querySelector('.nm').textContent = a ? name(a.id) : '';
    const st = card.querySelector('.st'); st.innerHTML = a ? ICON.star.repeat(3) : '';
    card.getAnimations().forEach((x) => x.cancel());
    card.animate([{ transform: 'translateY(40%) scale(.5) rotate(-6deg)', opacity: 0 }, { transform: 'translateY(0) scale(1.04) rotate(2deg)', opacity: 1, offset: 0.6 }, { transform: 'none', opacity: 1 }], { duration: 380, easing: 'cubic-bezier(.2,1.2,.4,1)' });
    Sound.develop();
    cardBusy = (a ? 2.2 : 1.4) + (res.newSpecies ? 0.3 : 0);
    const t0 = performance.now(), devMs = cfg.photo.developS * 1000;
    const dev = () => { const k = Math.min(1, (performance.now() - t0) / devMs); ph.style.setProperty('--dev', String((1 - k) * (1 - k))); if (k < 1 && alive) requestAnimationFrame(dev); };
    requestAnimationFrame(dev);
    setTimeout(() => { card.classList.add('shake'); }, 60);
    if (a) st.querySelectorAll('svg').forEach((s, i) => { if (i < stars) setTimeout(() => { s.classList.add('on'); Sound.star(i + (stars >= 3 ? 2 : 0)); if (i === stars - 1 && stars >= 3) { const r = card.getBoundingClientRect(), rr = rootRect(); confetti(r.left - rr.left + r.width / 2, r.top - rr.top + r.height * 0.4); } }, 600 + i * 220); });
    const flyAt = (a ? 1500 + stars * 120 : 900) + (res.newSpecies ? 300 : 0);
    setTimeout(() => {
      if (!alive) return;
      const r = card.getBoundingClientRect(), rr = rootRect(), b = $('bookB').getBoundingClientRect();
      if (res.flakes > 0) flyFlakes(r.left - rr.left + r.width / 2, r.top - rr.top + r.height / 2, Math.ceil(res.flakes / 10));
      const an = card.animate([{ transform: 'none', opacity: 1 }, { transform: `translate(${b.left + b.width / 2 - (r.left + r.width / 2)}px,${b.top + b.height / 2 - (r.top + r.height / 2)}px) scale(.12) rotate(18deg)`, opacity: 0.4 }], { duration: 480, easing: 'cubic-bezier(.6,0,.6,1)' });
      Sound.whoosh();
      an.onfinish = () => { card.hidden = true; card.classList.remove('shake'); $('bookB').classList.remove('bump'); void $('bookB').offsetWidth; $('bookB').classList.add('bump'); hud(); if (res.filled.length) { ui.bookDot = true; $('bookB').classList.add('dot'); } };
    }, flyAt);
    // the moments this photo made
    if (a && res.newSpecies) {
      const n = Object.keys(S.slots).length + Object.keys(S.rare).length;
      buzz(a.rare ? 'big' : 'friend');
      if (a.rare) { beat({ ...beatAt(a, { pri: 5, dur: 2, slow: true, sting: 'rare' }) }); setTimeout(() => toast(T('rare'), name(a.id), 'rare:' + a.id), flyAt); }
      else if (n <= 8) { beat(beatAt(a, { pri: 3, dur: 1.4, slow: n === 1, sting: 'friend' })); setTimeout(() => toast(T('newFriend')), flyAt); }
      else setTimeout(() => toast(T('newFriend')), flyAt);
    }
    if (res.half >= 0 && res.page < 0) setTimeout(() => { toast(T('half'), '+' + cfg.economy.halfPage); Sound.sting('page'); }, flyAt + 200);
    if (res.page >= 0) setTimeout(() => { toast(T('page'), T('a_' + cfg.areas[res.page].id), 'page'); Sound.sting('page'); confetti(root.clientWidth / 2, root.clientHeight * 0.3); }, flyAt + 200);
    if (res.requests.length) setTimeout(() => tick(`${ICON.star.replace('<svg', '<svg width="40" height="40"')} ✓ +${cfg.economy.request}`), flyAt + 400);
    if (res.opened >= 0) setTimeout(() => openArea(res.opened), flyAt + 600);
  }
  function confetti(x, y) {
    // screen-space confetti: a burst of glowing stars in the world in front of the camera
    const c = W.camera, d = 5, ndcX = (x / root.clientWidth) * 2 - 1, ndcY = -(y / root.clientHeight) * 2 + 1;
    const p = V3(ndcX, ndcY, 0.5).unproject(c).sub(c.position).normalize().multiplyScalar(d).add(c.position);
    for (const col of ['#ffcf3a', '#5cf2c7', '#ff8ab8', '#8fd0ff']) fx.emit({ pool: 'glow', x: p.x, y: p.y, z: p.z, spread: 0.3, speed: 4, up: 2, life: 1.2, size: 0.12, color: col, shape: 'star', grav: -4, drag: 2.5 }, 8);
  }

  // ---- areas
  function openArea(i) {
    const g = cfg.gates.find((q) => q.area === i); if (!g) return;
    const gp = V3(0, L.terrainH(cfg, 0, g.z), g.z);
    // the camera frames the gate, the shards burst, then it rises and glides through toward the new place
    const glide = (t) => { const k = Math.max(0, Math.min(1, (t - 1.2) / 1.5)); return k * k * (3 - 2 * k); };
    // it opens wide, from above the path, so the wall, the way to it and the new place beyond all read together
    beat({ pri: 6, dur: 3.2, bars: true, slow: false, sting: null, fov: 52, clear: true,
      pos: (t = 0) => V3(gp.x + 3.5, gp.y + 6.2, gp.z + 17).lerp(V3(gp.x + 0.8, gp.y + 2.8, gp.z + 3), glide(t)),
      look: (t = 0) => V3(gp.x, gp.y + 1.2, gp.z - 7).lerp(V3(gp.x, gp.y + 2.9, gp.z - 18), glide(t)),
      start: () => setTimeout(() => {
        if (!alive) return;
        W.openGate(i - 1); Sound.crack(); buzz('big'); W.shake.t = 0.4; W.shake.a = 0.12;
        fx.debris(gp.x, gp.y + 0.5, gp.z, 6, 3.5, 2.6); /* a few big chunks that drop and settle inside a second */ fx.ring(gp.x, gp.y, gp.z, 7, '#bff7ff', 0.8);
        fx.emit({ pool: 'glow', x: gp.x, y: gp.y + 1.5, z: gp.z, spread: 4, speed: 2.4, up: 2.4, life: 1.2, size: 0.22, color: '#bff7ff', shape: 'flake', grav: -1 }, 6);
        fx.emit({ pool: 'soft', x: gp.x, y: gp.y + 0.3, z: gp.z, spread: 4, speed: 1.5, up: 0.3, life: 1.2, size: 0.8, color: '#dceafb', alpha: 0.35, grav: 0.3, drag: 2, grow: 1 }, 6);
        toast(T('area'), T('a_' + cfg.areas[i].id), 'area');
      }, 900) });
  }

  // ---- treats
  let tossCool = 0;
  function shyNear() {
    let best = null, bd = 12;
    for (const a of animals) { if (!a.sp.shy || !a.present || a.hide < 0.4) continue; const d = Math.hypot(a.x - hero.x, a.z - hero.z); if (d < bd) { bd = d; best = a; } }
    return best;
  }
  function toss() {
    if (!play || tossCool > 0) return;
    const a = shyNear(); if (!a) return;
    if (!L.treatOwned(S, a.sp.shy)) { openBook('shop'); return; }
    tossCool = 1; Sound.whoosh(); ftueDid('treat');
    const from = V3(hero.x, hero.y + 1.4, hero.z), to = V3(a.x, a.y + 0.3, a.z + 0.9);
    for (let i = 0; i < 10; i++) setTimeout(() => { const k = i / 9; fx.emit({ pool: 'glow', x: from.x + (to.x - from.x) * k, y: from.y + (to.y - from.y) * k + Math.sin(k * Math.PI) * 2, z: from.z + (to.z - from.z) * k, spread: 0.1, speed: 0.1, life: 0.5, size: 0.25, color: '#ffcf3a', shape: 'star', grav: 0 }, 1); }, i * 40);
    setTimeout(() => { if (!alive) return; Sound.plop(); fx.emit({ pool: 'soft', x: to.x, y: to.y, z: to.z, spread: 0.5, speed: 1.5, up: 1.5, life: 0.8, size: 0.6, color: '#f4f9ff', alpha: 0.9, grav: -3 }, 10); fx.ring(to.x, a.y + 0.05, to.z, 1.4, '#ffe9a8', 0.5); fx.emit({ pool: 'glow', x: to.x, y: to.y + 0.1, z: to.z, spread: 0.3, speed: 1.6, up: 1.4, life: 0.7, size: 0.12, color: '#ffcf3a', shape: 'star', grav: -4, drag: 2 }, 8);
      setTimeout(() => alive && fx.emit({ pool: 'glow', x: a.x, y: a.y + a.parts.height + 0.3, z: a.z, spread: 0.5, speed: 0.7, up: 1.4, life: 1.3, size: 0.36, color: '#ff8aa8', shape: 'heart', grav: 0.2, drag: 2 }, 4), 700); a.outT = 25; a.nextPose = Math.min(a.nextPose, 2.5); Sound.voice(a.sp); }, 420);
  }

  // ---- night and the rare visitor
  let wasNight = false, sawRare = false, nightSeen = false;

  // ---- per-frame updates
  const bubs = []; for (let i = 0; i < 3; i++) { const b = document.createElement('div'); b.className = 'bub'; b.hidden = true; $('bubs').appendChild(b); bubs.push(b); }
  function updateAnimals(dt, t, cw) {
    const night = cw.night > 0.5 || (cw.dusk > 0.6 && L.clockAt(cfg, S.clock).k > 0.8);
    const slowWin = cfg.photo.poseWindowS;
    for (const a of animals) {
      const sp = a.sp, dh = Math.hypot(a.x - hero.x, a.z - hero.z);
      // who is out: night animals only at night, the beluga in its ice hole, rares all day once their area is open
      a.present = sp.night ? night : true;
      if (sp.area >= S.open && !a.rare) a.present = a.present && dh < 60; // seen from behind the ice, not reachable
      const vis = a.present && dh < 70; a.parts.group.visible = vis;
      if (!vis) { a.pose = null; continue; }
      // shy animals hide until a treat lands
      if (sp.shy) { a.outT = Math.max(0, a.outT - dt); const want = a.outT > 0 ? 0 : 0.72; a.hide += (want - a.hide) * Math.min(1, dt * 3); }
      // skittish ones keep their distance
      if (sp.skittish && dh < sp.skittish * 2.6 && !a.pose) { a.flee = 1.2; const dx = a.x - hero.x, dz = a.z - hero.z, d = dh || 1; a.tx = a.home[0] + dx / d * sp.wander; a.tz = a.home[1] + dz / d * sp.wander; a.state = 'walk'; }
      a.flee = Math.max(0, a.flee - dt);
      // wander around home
      a.stT -= dt;
      if (!a.pose && sp.wander > 0 && a.hide < 0.3 && sp.type !== 'whale') {
        if (a.state === 'idle' && a.stT <= 0) { const an = R() * 6.28, r = R() * sp.wander; const nx = a.home[0] + Math.cos(an) * r, nz = a.home[1] + Math.sin(an) * r; if (L.walkable(cfg, 3, nx, nz) || sp.area === 1) { a.tx = nx; a.tz = nz; a.state = 'walk'; } a.stT = 2 + R() * 3; }
        if (a.state === 'walk') {
          const dx = a.tx - a.x, dz = a.tz - a.z, d = Math.hypot(dx, dz), spd = (a.flee > 0 ? 3.2 : 1.1) * (sp.scale || 1);
          if (d < 0.15) { a.state = 'idle'; a.stT = 1.5 + R() * 3; }
          else { const st = Math.min(d, spd * dt), n = L.slide(cfg, 3, a.x, a.z, dx / d * st, dz / d * st); if (n[0] === a.x && n[1] === a.z) a.state = 'idle'; a.x = n[0]; a.z = n[1]; a.yaw += angleDiff(Math.atan2(dx, dz), a.yaw) * Math.min(1, dt * 6); }
        }
      } else a.state = 'idle';
      // personal space: an animal never walks into the lens (the hero pushes it gently back)
      { const ps = cfg.photo.personalM + a.parts.radius, dx = (a.x - hero.x) || 0.01, dz = a.z - hero.z, d = Math.hypot(dx, dz);
        if (d < ps && sp.type !== 'whale') { const k = Math.min(ps - d, 2.5 * dt), n = L.slide(cfg, 3, a.x, a.z, dx / d * k, dz / d * k), left = k - Math.hypot(n[0] - a.x, n[1] - a.z); a.x = n[0]; a.z = n[1]; // never pushed off the valley floor, out of the hero's reach
          if (left > 0.01) { const h = L.slide(cfg, S.open, hero.x, hero.z, -dx / d * left, -dz / d * left); hero.x = h[0]; hero.z = h[1]; } // backed against the edge: the hero steps back instead
          if (a.state === 'walk' && ((a.tx - hero.x) * dx + (a.tz - hero.z) * dz) < 0) a.state = 'idle'; }
        // a whale in its ice hole cannot move: the hero stops at the edge instead, so the photo still frames it
        else if (d < ps && a.present && a.hide < 0.5) { const k = Math.min(ps - d, 4 * dt), n = L.slide(cfg, S.open, hero.x, hero.z, -dx / d * k, -dz / d * k); hero.x = n[0]; hero.z = n[1]; } }
      a.walk += ((a.state === 'walk' ? 1 : 0) - a.walk) * Math.min(1, dt * 6);
      // look at the hero when near
      const wantLook = dh < 9 && !a.pose ? Math.max(-1, Math.min(1, angleDiff(Math.atan2(hero.x - a.x, hero.z - a.z), a.yaw))) : 0;
      a.look += (wantLook - a.look) * Math.min(1, dt * 4);
      if (dh < 9 && a.state === 'idle' && !a.pose && Math.abs(angleDiff(Math.atan2(hero.x - a.x, hero.z - a.z), a.yaw)) > 1.2 && sp.type !== 'whale') a.yaw += angleDiff(Math.atan2(hero.x - a.x, hero.z - a.z), a.yaw) * Math.min(1, dt * 1.5);
      // poses: a cue, then the pose (the photo window)
      if (dh < 18 && a.hide < 0.3) {
        a.nextPose -= dt;
        a.cue = !a.pose && a.nextPose < cfg.photo.poseCueS && a.nextPose > 0;
        if (!a.pose && a.nextPose <= 0) { a.pose = sp.pose; a.poseT = 0; a.state = 'idle'; if (sp.pose === 'sneeze') a.sneezed = false; }
      } else a.cue = false;
      if (a.pose) {
        a.poseT += dt; const p = a.poseT / slowWin;
        if (a.pose === 'slide') { a.x += Math.sin(a.yaw) * dt * 3.2; a.z += Math.cos(a.yaw) * dt * 3.2; if (!L.walkable(cfg, 3, a.x, a.z)) { a.x -= Math.sin(a.yaw) * dt * 3.2; a.z -= Math.cos(a.yaw) * dt * 3.2; } if (R() < 0.5) fx.emit({ pool: 'soft', x: a.x, y: a.y + 0.1, z: a.z, spread: 0.3, speed: 0.8, up: 0.8, life: 0.6, size: 0.35, color: '#f4f9ff', alpha: 0.8, grav: -2 }, 1); }
        if (a.pose === 'sneeze' && p > 0.6 && !a.sneezed) { a.sneezed = true; const hx = a.x + Math.sin(a.yaw) * 1.2, hz = a.z + Math.cos(a.yaw) * 1.2; fx.emit({ pool: 'soft', x: hx, y: a.y + a.parts.headY * (sp.scale || 1), z: hz, spread: 0.3, speed: 2.4, life: 0.9, size: 0.6, color: '#f4f9ff', alpha: 0.9, grav: -0.5, grow: 1 }, 14); Sound.hiss && Sound.ok && Sound.hiss(Sound.ctx.currentTime, 0.2, { f: 3000, g: 0.1 }); }
        if ((a.pose === 'hop' || a.pose === 'jump') && p > 0.92 && !a.landed) { a.landed = true; fx.emit({ pool: 'soft', x: a.x, y: a.y + (a.pose === 'jump' ? 0 : 0.05), z: a.z, spread: 0.6, speed: 1.6, up: 0.8, life: 0.7, size: 0.5, color: a.pose === 'jump' ? '#bfeaff' : '#f4f9ff', alpha: 0.85, grav: -3 }, 10); if (a.pose === 'jump') fx.ring(a.x, a.y - 0.1, a.z, 2.6, '#bfeaff', 0.7); }
        if (p >= 1) { a.pose = null; a.poseEnd = clockT; a.landed = false; const want = !a.rare && (((S.slots[a.id] | 0) & 6) !== 6), pe = want && dh < L.lens(cfg, S).range ? cfg.photo.poseEveryNearS : cfg.photo.poseEveryS; a.nextPose = pe[0] + R() * (pe[1] - pe[0]); } // poses come sooner while someone waits for one
      }
      // voices now and then, blinks
      a.voiceT -= dt; if (a.voiceT <= 0 && dh < 12 && play) { a.voiceT = 6 + R() * 8; Sound.voice(sp); }
      a.blinkT -= dt; if (a.blinkT <= 0) { a.blink = 0.12; a.blinkT = 2.5 + R() * 3; } a.blink = Math.max(0, a.blink - dt);
      // place and animate
      a.y = sp.type === 'whale' ? 0 : L.terrainH(cfg, a.x, a.z) + a.perch;
      a.parts.group.position.set(a.x, a.y, a.z); a.parts.group.rotation.y = a.yaw;
      animateCritter(a.parts, sp, { t, walk: a.walk, pose: a.pose, p: a.pose ? Math.min(1, a.poseT / slowWin) : 0, blink: a.blink, look: a.look, hide: sp.shy ? a.hide : 0 });
      // the rare visitor shimmers
      if (a.rare && dh < 45) { a.glowT -= dt; if (a.glowT <= 0) { a.glowT = 0.12; fx.emit({ pool: 'glow', x: a.x, y: a.y + 0.2, z: a.z, spread: 1.4, speed: 0.2, up: 1.6, life: 1.4, size: 0.16, color: '#ffe48a', shape: 'star', grav: 0.6, drag: 1 }, 1); } }
    }
  }

  function updateHero(dt, t) {
    let mx = 0, mz = 0;
    const stick = input.drag && !input.look;
    if (stick) { const m = cfg.hero.stickMaxPx * unit(), l = Math.hypot(input.dx, input.dy); if (l > 4) { const k = Math.min(1, l / m); mx = input.dx / l * k; mz = input.dy / l * k; } }
    const K = input.keys; const kx = (K.has('d') || K.has('arrowright') ? 1 : 0) - (K.has('a') || K.has('arrowleft') ? 1 : 0), kz = (K.has('s') || K.has('arrowdown') ? 1 : 0) - (K.has('w') || K.has('arrowup') ? 1 : 0);
    if (kx || kz) { const l = Math.hypot(kx, kz); mx = kx / l; mz = kz / l; input.target = null; }
    if (mx || mz) { const c = Math.cos(view.yaw), sn = Math.sin(view.yaw), rx = mx * c + mz * sn; mz = -mx * sn + mz * c; mx = rx; } // screen-relative under the player's look yaw
    if (stick) input.target = null;
    if (!mx && !mz && input.target) { const dx = input.target[0] - hero.x, dz = input.target[1] - hero.z, d = Math.hypot(dx, dz); if (d < 0.35) input.target = null; else { const k = Math.min(1, d / 1.2); mx = dx / d * k; mz = dz / d * k; } }
    // dev:start
    if (bot) [mx, mz] = botMove();
    // dev:end
    const sp = cfg.hero.speed, tvx = mx * sp, tvz = mz * sp, acc = 1 - Math.exp(-dt * 10);
    hero.vx += (tvx - hero.vx) * acc; hero.vz += (tvz - hero.vz) * acc;
    const [nx, nz] = L.slide(cfg, S.open, hero.x, hero.z, hero.vx * dt, hero.vz * dt);
    const moved = Math.hypot(nx - hero.x, nz - hero.z); hero.speed = moved / Math.max(dt, 1e-4);
    if (moved < hero.speed * 0) input.target = null;
    hero.x = nx; hero.z = nz; hero.y = L.terrainH(cfg, hero.x, hero.z);
    if (hero.speed > 0.4) { hero.yaw += angleDiff(Math.atan2(hero.vx, hero.vz), hero.yaw) * Math.min(1, dt * 10); hero.still = 0; }
    else { hero.still += dt; if (aimA && vf > 0.3) hero.yaw += angleDiff(Math.atan2(aimA.x - hero.x, aimA.z - hero.z), hero.yaw) * Math.min(1, dt * 6); }
    hero.walked += moved;
    if (input.target && moved < 1e-4 && hero.still > 0.4) input.target = null;
    // footprints, snow kicks and steps
    hero.stepD += moved;
    if (hero.stepD > 0.55) { hero.stepD = 0; hero.side = -hero.side; fx.footprint(hero.x, hero.z, hero.yaw, hero.side); fx.emit({ pool: 'soft', x: hero.x, y: hero.y + 0.08, z: hero.z, spread: 0.2, speed: 0.6, up: 0.5, life: 0.5, size: 0.28, color: '#f4f9ff', alpha: 0.7, grav: -2 }, 2); Sound.step(); }
    // brushing past an edge pine shakes a clump of snow off its lower boughs
    hero.shakeT = (hero.shakeT || 0) - dt;
    if (hero.shakeT <= 0 && hero.stepD > 0.3) for (const t of W.trunks) { const dx = t[0] - hero.x, dz = t[1] - hero.z; if (dx * dx + dz * dz < 6.5) { hero.shakeT = 2.5; const y = L.terrainH(cfg, t[0], t[1]); fx.emit({ pool: 'soft', x: t[0], y: y + 2.6, z: t[1], spread: 0.9, speed: 0.4, up: 0, life: 1.2, size: 0.45, color: '#f4f9ff', alpha: 0.85, grav: -5, drag: 0.6 }, 9); fx.emit({ pool: 'glow', x: t[0], y: y + 2.4, z: t[1], spread: 1.2, speed: 0.3, life: 1.6, size: 0.12, color: '#ffffff', shape: 'flake', grav: -0.8, drag: 1 }, 6); Sound.hiss && Sound.ok && Sound.hiss(Sound.ctx.currentTime, 0.35, { f: 2200, g: 0.05 }); break; } }
    hero.breathT -= dt; if (hero.breathT <= 0) { hero.breathT = 2.4; fx.emit({ pool: 'soft', x: hero.x + Math.sin(hero.yaw) * 0.35, y: hero.y + 1.45, z: hero.z + Math.cos(hero.yaw) * 0.35, spread: 0.05, speed: 0.15, vx: Math.sin(hero.yaw) * 0.4, vz: Math.cos(hero.yaw) * 0.4, life: 1.1, size: 0.3, color: '#ffffff', alpha: 0.45, grav: 0.15, drag: 1, grow: 1.6 }, 1); }
    H.group.position.set(hero.x, hero.y, hero.z); H.group.rotation.y = hero.yaw; H.group.visible = vf < 0.55;
    animateHero(H, t, dt, Math.min(1, hero.speed / cfg.hero.speed), vf);
    // walking into a newly opened area
    const ar = L.areaAt(cfg, hero.x, hero.z);
    if (ar >= S.entered) { S.entered = ar + 1; ftueDid('gate'); toast(T('a_' + cfg.areas[ar].id)); Sound.sting('area'); soon(); }
  }

  // ---- the guide and the tutorial spotlight
  const edge = $('edge');
  function ftueTarget() {
    if (!ftueOn()) return null;
    const fox = animals.find((a) => a.id === 'fox'), hare = animals.find((a) => a.id === 'hare');
    if (ftue === 'walk' || ftue === 'snap') return fox ? { x: fox.x, z: fox.z, y: fox.y, a: fox } : null;
    if (ftue === 'treat') return hare ? { x: hare.x, z: hare.z, y: hare.y, a: hare } : null;
    if (ftue === 'pose') { const a = animals.find((q) => q.cue || q.pose) || nearest(18); return a ? { x: a.x, z: a.z, y: a.y, a } : null; }
    if (ftue === 'gate') { if (S.open < 2) return null; const g = cfg.gates[S.entered - 1]; return g ? { x: 0, z: g.z - cfg.camera.gateInM, y: 0, gate: true } : null; }
    return null;
  }
  function guide() {
    const ft = ftueTarget();
    const rare = animals.find((a) => a.rare);
    const rareGoal = rare && S.rareDay !== S.day && rare.present && L.walkable(cfg, S.open, rare.x, rare.z) ? { x: rare.x, z: rare.z, y: rare.y, rare: true } : null;
    const gateGoal = S.entered < S.open ? { x: 0, z: cfg.gates[S.entered - 1].z - cfg.camera.gateInM, y: 0, gate: true } : null;
    const list = animals.filter((a) => !a.rare).map((a) => ({ id: a.id, x: a.x, z: a.z, y: a.y, night: !!a.sp.night, avail: a.present && a.sp.area < S.open && (!a.sp.shy || L.treatOwned(S, a.sp.shy)) }));
    const noStar = L.clockAt(cfg, S.clock).night && !S.owned.includes('flash') && cfg.photo.nightCapNoFlash < 3;
    const goal = L.guideTarget(S, { hero: [hero.x, hero.z], ftue: ft, rare: rareGoal, gate: gateGoal, animals: list, noStar });
    if (!goal || ft) return goal;
    const via = L.routeVia(cfg, [hero.x, hero.z], goal); // through the gate when the goal is in another area
    return via === goal ? goal : { ...via, y: 0, gate: true, rare: goal.rare };
  }
  function updateGuide(t, goal) {
    const near = goal && Math.hypot(goal.x - hero.x, goal.z - hero.z) < (goal.gate ? 3 : L.lens(cfg, S).range * 0.8);
    const show = !!goal && !near && vf < 0.5 && !beats.cur && !bookOpen;
    fx.setTrail(hero.x, hero.z, goal ? goal.x : hero.x, goal ? goal.z : hero.z, t, show, goal && goal.rare);
    // off-screen goal: an arrow on the hero's side of the screen pointing toward it
    if (show) {
      const gy = (goal.y || L.terrainH(cfg, goal.x, goal.z)) + 1;
      const hs = W.toScreen(hero.x, hero.y + 1, hero.z), gs = W.toScreen(goal.x, gy, goal.z);
      const e = L.edgeArrow(hs, gs, 0.1);
      if (e) { const [px, py] = toPx(e.x, Math.max(0.2, Math.min(0.72, e.y))); edge.hidden = false; edge.style.left = px + 'px'; edge.style.top = py + 'px'; edge.style.setProperty('--a', e.a + 'rad'); edge.classList.toggle('gold', !!goal.rare); }
      else edge.hidden = true;
    } else edge.hidden = true;
  }
  const spot = $('spot'), coach = $('coach'), hand = $('hand');
  let coachKey = '';
  function updateSpot(dt) {
    const on = ftueOn() && !bookOpen && !beats.cur && $('card').hidden;
    ftueT += dt;
    let tgt = null, hint = '', icon = '', handOn = false, handDrag = false;
    const rr = rootRect(), u = unit();
    const elC = (id) => { const b = $(id).getBoundingClientRect(); return [b.left - rr.left + b.width / 2, b.top - rr.top + b.height / 2, b.width * 0.62]; };
    const world = (x, y, z, r) => { const s = W.toScreen(x, y, z); return s[2] && s[0] > 0.06 && s[0] < 0.94 && s[1] > 0.1 && s[1] < 0.9 ? [s[0] * rr.width, s[1] * rr.height, r * u] : null; };
    if (on) {
      if (ftue === 'walk') { const f = ftueTarget(); tgt = world(hero.x, hero.y + 1, hero.z, 150);
        // the cutout holds both the hero and the first animal, so the opening shows who to walk to
        const fs = f && world(f.x, f.y + 0.6, f.z, 0); if (tgt && fs) { const d = Math.hypot(fs[0] - tgt[0], fs[1] - tgt[1]); tgt = [(tgt[0] + fs[0]) / 2, (tgt[1] + fs[1]) / 2, d / 2 + 110 * u]; } hint = T('walk'); icon = ICON.hand; handOn = true; handDrag = true; if (f && f.a && hero.walked > cfg.hero.ftueWalkM && nearest(L.lens(cfg, S).range) === f.a) ftueDid('walk'); }
      else if (ftue === 'snap') { if (vf > 0.4) { tgt = elC('shutter'); hint = T('snap'); icon = ICON.cam.replace('<svg', '<svg fill="#fff"'); handOn = true; } else { tgt = world(hero.x, hero.y + 1, hero.z, 150); hint = T('walk'); icon = ICON.hand; } }
      else if (ftue === 'book') { if (S.photos >= 1 && $('card').hidden) { tgt = elC('bookB'); hint = T('book'); icon = ICON.book; handOn = true; } }
      else if (ftue === 'treat') { const sh = shyNear(); if (sh && sh.id === 'hare') { tgt = elC('treat'); hint = T('treat'); handOn = true; icon = ''; } else { const f = ftueTarget(); if (f && Math.hypot(f.x - hero.x, f.z - hero.z) < 25) { tgt = world(f.x, f.y + 0.5, f.z, 120); hint = T('walk'); icon = ICON.hand; } } }
      else if (ftue === 'pose') { const f = ftueTarget(); if (f && f.a && Math.hypot(f.x - hero.x, f.z - hero.z) < L.lens(cfg, S).range && (f.a.cue || f.a.pose)) { tgt = world(f.x, f.y + f.a.parts.centerY, f.z, 140); hint = T('pose'); icon = ICON.pose; } }
      else if (ftue === 'gate') { const f = ftueTarget(); if (f) { tgt = world(f.x, L.terrainH(cfg, f.x, f.z) + 1.5, f.z, 160); hint = T('gate'); icon = ICON.map; } }
    }
    spot.classList.toggle('on', !!tgt);
    // while the viewfinder is up the subject stays bright: the snap step dims the rest only lightly
    spot.classList.toggle('lite', ftue === 'snap' && vf > 0.4);
    $('skip').hidden = !on;
    if (tgt) {
      spot.style.setProperty('--x', tgt[0] + 'px'); spot.style.setProperty('--y', tgt[1] + 'px'); spot.style.setProperty('--r', Math.max(60 * u, tgt[2]) + 'px');
      const key = hint + icon; if (key !== coachKey) { coachKey = key; coach.innerHTML = icon + `<b class="out">${hint}</b>`; }
      coach.hidden = false;
      const cy = tgt[1] - tgt[2] - 110 * u; const y = cy < 230 * u || ftue === 'walk' ? tgt[1] + tgt[2] + 30 * u : cy;
      const half = coach.offsetWidth / 2 + 24 * u; coach.style.left = Math.max(half, Math.min(rr.width - half, tgt[0])) + 'px'; coach.style.top = Math.min(rr.height - 360 * u, y) + 'px';
      // the snap hint sits beside the shutter, below the viewfinder brackets, never over the frame
      if (ftue === 'snap' && vf > 0.4) { const rtl = root.dir === 'rtl', side = tgt[2] / 0.62 / 2 + 16 * u + coach.offsetWidth / 2; coach.style.left = (tgt[0] + (rtl ? side : -side)) + 'px'; coach.style.top = (tgt[1] - coach.offsetHeight / 2) + 'px'; }
      hand.hidden = !handOn; hand.classList.toggle('drag', handDrag); if (handOn) { hand.style.left = (handDrag ? tgt[0] : tgt[0]) + 'px'; hand.style.top = (handDrag ? tgt[1] + 60 * u : tgt[1]) + 'px'; }
    } else if (lookHint(dt)) {
      // one-time swipe-to-look hint after the tutorial: a hand sweeps across the right half, no dimming
      const key = 'look'; if (key !== coachKey) { coachKey = key; coach.innerHTML = ICON.hand + `<b class="out">${T('look')}</b>`; }
      coach.hidden = false; const x = rr.width * 0.72, y = rr.height * 0.4, half = coach.offsetWidth / 2 + 24 * u;
      coach.style.left = Math.max(half, Math.min(rr.width - half, x)) + 'px'; coach.style.top = (y - 150 * u) + 'px';
      hand.hidden = false; hand.classList.remove('drag'); hand.classList.add('swipe'); hand.style.left = x + 'px'; hand.style.top = y + 'px';
    } else { coach.hidden = true; hand.hidden = true; hand.classList.remove('swipe'); coachKey = ''; }
  }
  let lookHintT = 0;
  /** True while the one-time swipe hint shows: after the tutorial, in free walking, until the first look swipe. */
  function lookHint(dt) {
    if (!play || bot || !S.ftueDone || (S.hints & 4) || vf > 0.05 || bookOpen || beats.cur || !$('card').hidden) { lookHintT = Math.min(lookHintT, cfg.camera.look.hintAfterS); return false; }
    lookHintT += dt; const lk = cfg.camera.look;
    if (lookHintT > lk.hintAfterS + lk.hintMaxS) { S.hints |= 4; dirty = true; return false; } // shown long enough: never again
    return lookHintT > lk.hintAfterS;
  }

  // ---- viewfinder HUD, pose cues, treat button
  const focus = $('focus'), dots = focus.querySelectorAll('s');
  function updateHud(dt) {
    hud();
    $('vf').classList.toggle('on', vf > 0.5 && $('card').hidden && !beats.cur);
    if (aimA && vf > 0.3 && !beats.cur) { // no focus pill during a cinematic beat
      // the focus pill sits under the animal's feet, never on it
      const s = W.toScreen(aimA.x, aimA.y, aimA.z), [px, py0] = toPx(s[0], s[1]), py = Math.min(py0 + 24 * unit(), rootRect().height - 300 * unit());
      const sh = shotOf(aimA);
      focus.classList.add('on'); focus.classList.toggle('ok', sh.framed); focus.style.left = px + 'px'; focus.style.top = py + 'px';
      dots.forEach((d, i) => d.classList.toggle('on', i < sh.stars));
      $('shutter').classList.toggle('ready', true);
    } else { focus.classList.remove('on'); $('shutter').classList.remove('ready'); }
    // pose cue bubbles over the three nearest cued or posing animals
    const rr = rootRect(), u = unit(), cued = animals.filter((a) => (a.cue || a.pose) && a.parts.group.visible && Math.hypot(a.x - hero.x, a.z - hero.z) < 16).sort((a, b) => Math.hypot(a.x - hero.x, a.z - hero.z) - Math.hypot(b.x - hero.x, b.z - hero.z));
    bubs.forEach((b, i) => {
      const a = cued[i]; if (!a || bookOpen) { b.hidden = true; return; }
      const s = W.toScreen(a.x, a.y + a.parts.height + 0.5, a.z); if (!s[2]) { b.hidden = true; return; }
      const key = a.id + (a.pose ? 'p' : 'c'); if (b.dataset.k !== key) { b.dataset.k = key; b.innerHTML = a.pose ? ICON.pose : ICON.pose; b.classList.toggle('gold', !!a.pose); }
      b.hidden = false; b.style.left = (s[0] * rr.width) + 'px'; b.style.top = Math.max(200 * u, Math.min(rr.height - 300 * u, s[1] * rr.height)) + 'px';
    });
    // treat button: shows when a shy animal is near
    const sh = shyNear(), tb = $('treat');
    if (sh) {
      if (tb.dataset.k !== sh.sp.shy + L.treatOwned(S, sh.sp.shy)) { tb.dataset.k = sh.sp.shy + L.treatOwned(S, sh.sp.shy); drawIcon(tb.querySelector('canvas'), sh.sp.shy); tb.classList.toggle('need', !L.treatOwned(S, sh.sp.shy)); const it = L.item(cfg, sh.sp.shy); tb.querySelector('.lock').innerHTML = it ? `${it.price}` : ''; }
      tb.hidden = false; tb.classList.toggle('glow', L.treatOwned(S, sh.sp.shy));
    } else { tb.hidden = true; tb.dataset.k = ''; }
    nightLeftT -= 0.1; if (nightLeftT <= 0) { nightLeftT = 1; nightLeft = onlyNightLeft(); }
    { const tt = $('toast'), co = $('coach'); if (!tt.hidden) tt.classList.toggle('low', !co.hidden && co.offsetTop < rootRect().height * 0.3); } // a tutorial bubble up top pushes the toast down a row
    const nb = $('nightB'), wantNight = !sh && play && S.ftueDone && !beats.cur && W.night < 0.3 && skipTo === null && nightLeft;
    if (wantNight && nb.hidden && !(S.hints & 1)) { S.hints |= 1; dirty = true; toast(T('nightB')); } // once ever; then the moon button's glow carries it
    nb.hidden = !wantNight;
    // the day clock arc on the stamps pill
    const cl = L.clockAt(cfg, S.clock), day = cfg.clock.dayS, k = ((S.clock % day) + day) % day / day;
    $('clockArc').setAttribute('stroke-dashoffset', String(157 * (1 - k))); $('clockArc').setAttribute('stroke', cl.night ? '#cfd8ff' : cl.name === 'dusk' ? '#ffb070' : '#ffcf3a');
  }

  // dev:start
  // the guide bot: walks to the guide's goal, waits for a pose, snaps, tosses treats (tests and timeline checks)
  let botT = 0;
  function botMove() {
    const g = guide(); botT -= 1 / 60;
    if (!g) return [0, 0];
    const a = nearest(L.lens(cfg, S).range * 0.8);
    if (a && !g.gate) {
      if ((inPose(a) || (a.poseT > 0.3 && a.pose)) && botT <= 0 && $('card').hidden) { botT = 0.8; snap(); }
      else if (!(S.slots[a.id] & 1) && botT <= 0 && $('card').hidden) { botT = 0.8; snap(); }
      if (shyNear() && L.treatOwned(S, shyNear().sp.shy)) toss();
      return [0, 0];
    }
    const sh = shyNear(); if (sh && L.treatOwned(S, sh.sp.shy) && sh.hide > 0.5) { toss(); return [0, 0]; }
    const dx = g.x - hero.x, dz = g.z - hero.z, d = Math.hypot(dx, dz) || 1;
    return [dx / d, dz / d];
  }
  // dev:end

  // ---- the loop
  let last = performance.now(), raf = 0, t = 0, fpsT = 0, fpsN = 0, fpsV = 60, first = true, mailT = 1.5;
  const ro = new ResizeObserver(() => { rootR = null; const r = rootRect(); W.resize(Math.max(1, Math.round(r.width)), Math.max(1, Math.round(r.height))); layoutU(); });
  ro.observe(root);
  { const r = rootRect(); W.resize(Math.max(1, Math.round(r.width)), Math.max(1, Math.round(r.height))); }
  W.snapCamera(hero);
  const ftRing = new Float32Array(240), jsRing = new Float32Array(240), tierLog = []; let ftN = 0, realT = 0;
  function frame(now, manual = false, draw = true) {
    if (!alive) return;
    if (!manual) raf = requestAnimationFrame(frame);
    // frame times (ms) for the quality self-check, kept in a small ring
    if (!manual && t > 0) { ftRing[ftN % ftRing.length] = now - last; ftN++; }
    // the quality check counts real seconds (a pause over 0.25 s is not a slow frame); the game itself steps at most 50 ms
    const realDt = Math.max(0, Math.min(0.25, (now - last) / 1000)); realT += realDt;
    const rdt = Math.max(0, Math.min(0.05, (now - last) / 1000)); last = now;
    const b = stepBeats(rdt);
    const dt = rdt * timeScale; t += dt; clockT += dt;
    if (play || mode === 'edit') S.clock += dt;
    if (skipTo !== null) { S.clock = Math.min(skipTo, S.clock + rdt * cfg.clock.skipRate); if (S.clock >= skipTo) skipTo = null; }
    if (play) playT += rdt;
    // day clock and light
    const cl = L.clockAt(cfg, S.clock); W.setTod(cl.w); W.uTime.value = t; mats.night.value = W.night; mats.lamp.value.copy(W.lamp.value); H.mats.lamp.color.setRGB(0.55 + W.night * 2.4, 0.42 + W.night * 1.5, 0.25 + W.night * 0.6);
    if (cl.night && !wasNight && play && !nightSeen) { nightSeen = true; beat({ pri: 1, dur: 2, bars: true, sting: 'night', fov: 50, pos: () => V3(hero.x, hero.y + 2.5, hero.z + 6), look: () => V3(hero.x, hero.y + 6, hero.z - 26) }); toast(T('night')); }
    wasNight = cl.night;
    // simulation
    updateHero(dt, t);
    updateAnimals(dt, t, cl.w);
    updateBlobs();
    // viewfinder
    const a = nearest(L.lens(cfg, S).range);
    const wantVf = a && ftue !== 'walk' && hero.speed < 0.6 && hero.still > 0.15 && !bookOpen ? 1 : 0;
    vf += (wantVf - vf) * Math.min(1, rdt / cfg.camera.vfEase * 2.2); if (vf < 0.01) vf = 0;
    if (a) { aimA = a; aim = V3(a.x, a.y + a.parts.centerY, a.z); vfFov = fovFor(a, Math.hypot(a.x - hero.x, a.z - hero.z)); } else if (vf === 0) { aimA = null; aim = null; }
    // treat moments: a shy animal close by pulls the camera in so both read at a glance
    const shy = vf < 0.05 && !bookOpen ? shyNear() : null;
    focusK += ((shy ? 1 : 0) - focusK) * Math.min(1, rdt * 2.5); if (shy) focusAt = shy;
    W.fogK = 1 - (b && b.clear ? cfg.beats.clearFog * b.k : 0); // the unlock beat looks across the valley: thin the haze
    { // swipe-to-look: ease toward the target, drift back to the authored view after a quiet spell
      const lk = cfg.camera.look; view.idle += rdt;
      if (view.idle > lk.recenterS && !(input.look && input.drag)) { const d = Math.exp(-rdt * lk.recenterRate); view.tYaw *= d; view.tEl *= d; }
      const k = 1 - Math.exp(-rdt * lk.ease); view.yaw += (view.tYaw - view.yaw) * k; view.el += (view.tEl - view.el) * k; W.setLook(view.yaw, view.el);
    }
    W.updateCamera(rdt, hero, vf, aim, vfFov, b, focusAt && focusK > 0.001 ? { x: focusAt.x, y: focusAt.y, z: focusAt.z, k: focusK * (1 - vf) } : null);
    // the rare visitor's first sighting
    const rare = animals.find((q) => q.rare);
    if (rare && !sawRare && play && rare.parts.group.visible && Math.hypot(rare.x - hero.x, rare.z - hero.z) < 20 && S.rareDay !== S.day) { sawRare = true; beat(beatAt(rare, { pri: 4, dur: 1.6, sting: 'rare' })); Sound.shimmer(); }
    // chimney smoke and world details
    if (Math.hypot(W.chimney.x - hero.x, W.chimney.z - hero.z) < 45 && R() < 0.12) fx.emit({ pool: 'soft', x: W.chimney.x, y: W.chimney.y, z: W.chimney.z, spread: 0.2, speed: 0.2, up: 0.9, life: 3, size: 0.8, color: '#e6ecf4', alpha: 0.55, grav: 0.1, drag: 0.6, grow: 2 }, 1);
    fx.update(dt);
    // deferred builds, one per frame
    if (buildQueue.length && booted) buildQueue.shift()();
    // HUD
    const goal = play || bot ? guide() : null; updateGuide(t, goal);
    if (play) { updateHud(rdt); updateSpot(rdt); }
    if (toastT > 0) { toastT -= rdt; if (toastT <= 0) nextToast(); }
    if (tickT > 0) { tickT -= rdt; if (tickT <= 0) $('tick').hidden = true; }
    if (cardBusy > 0) cardBusy -= rdt; if (snapCool > 0) snapCool -= rdt; if (tossCool > 0) tossCool -= rdt;
    if (bookAutoClose > 0) { bookAutoClose -= rdt; if (bookAutoClose <= 0 && bookOpen) closeBook(); }
    if (mailPending && loaded && play && !bookOpen) { mailT -= rdt; if (mailT <= 0) { mailPending = false; S.mailDay = S.day; S.flakes += cfg.economy.mail; toast(T('morning'), `${T('mail')} +${cfg.economy.mail} · ${name(rareId)}`); Sound.sting('friend'); soon(); } }
    if (play && loaded) { saveT += rdt; if (saveT >= cfg.save.everyS && dirty) saveNow(); }
    Sound.update(W.night, L.areaAt(cfg, hero.x, hero.z));
    // a new calendar day while playing
    if (play && loaded && (Math.floor(t) % 30 === 0) && L.dateKey(Date.now()) !== S.day) { if (L.rollDay(cfg, S, L.dateKey(Date.now())).mail) mailPending = true; rareId = L.dailyRare(cfg, S.day); placeRare(); sawRare = false; soon(); }
    // adaptive quality
    fpsT += realDt; fpsN++;
    if (fpsT >= 0.5) { fpsV = fpsN / fpsT; fpsT = 0; fpsN = 0; }
    if (!qs.has('tier') && realT > 5 && L.qualityStep(cfg, quality, fpsV, realDt)) { W.setTier(quality.tier); tierLog.push([Math.round(realT * 10) / 10, quality.tier, Math.round(fpsV)]); }
    if (draw) W.render();
    if (!manual) jsRing[(ftN + jsRing.length - 1) % jsRing.length] = performance.now() - now;
    if (first) { first = false; setTimeout(() => { if (alive) { W.endBoot(); booted = true; } }, cfg.quality.bootS * 1000); root.classList.add('live'); if (play) setTimeout(() => { if (alive) hideLogo(); }, logoT * 1000); if (window.__load) window.__load.done(); }
  }
  // compile every shader against the target it draws into, in parallel where the driver can (capped)
  const start = () => { if (alive && !raf) { last = performance.now(); raf = requestAnimationFrame(frame); } };
  try { const p = W.warm(); if (p && p.then) { p.then(start, start); setTimeout(start, 1500); } else start(); } catch (e) { start(); }

  const api = {
    destroy() {
      alive = false; saveNow(); cancelAnimationFrame(raf); ro.disconnect();
      document.removeEventListener('visibilitychange', onHide); removeEventListener('keydown', onKey); removeEventListener('keyup', onKey); removeEventListener('blur', onBlur);
      root.removeEventListener('pointerdown', onDown); root.removeEventListener('pointermove', onMove); root.removeEventListener('pointerup', onUp); root.removeEventListener('pointercancel', onUp);
      fx.dispose(); W.dispose(); root.innerHTML = ''; if (window.__ss === api) window.__ss = null;
    },
  };
  // dev:start
  api.debug = {
    get S() { return S; }, get hero() { return hero; }, get animals() { return animals; }, get ftue() { return ftue; }, get vf() { return vf; }, get beat() { return beats.cur; }, get loaded() { return loaded; },
    W, fx, snap, toss, openBook, closeBook, saveNow, hideLogo, openArea, guide, stats: () => W.stats(), fps: () => fpsV, tier: () => quality.tier,
    // the self-check: frame-time spread of the last 240 frames, the tier now and every change the loop made
    frames() { const n = Math.min(ftN, ftRing.length), a = Array.from(ftRing.slice(0, n)).sort((p, q) => p - q), at = (k) => Math.round(a[Math.min(n - 1, Math.floor(n * k))] * 10) / 10; const js = Array.from(jsRing.slice(0, n)).sort((p, q) => p - q); return { n, p50: at(0.5), p95: at(0.95), max: at(1), js50: Math.round(js[Math.floor(n / 2)] * 10) / 10, fps: Math.round(fpsV), tier: quality.tier, start: tier0, changes: tierLog.slice() }; },
    tp(x, z) { hero.x = x; hero.z = z; hero.vx = hero.vz = 0; input.target = null; W.snapCamera(hero); },
    walkTo(x, z) { input.target = [x, z]; },
    buy(id) { if (!L.buy(cfg, S, id)) return false; applyLook(); hud(); return true; }, night: () => W.night, get card() { return !$('card').hidden; },
    clock(s) { S.clock = s; }, give(n) { S.flakes += n; },
    stamp(ids) { for (const id of ids) L.applyPhoto(cfg, S, { id, stars: 3, inPose: true }); },
    skipFtue() { S.ftueDone = true; ftue = null; hideLogo(); },
    shot(id) { const a = animals.find((q) => q.id === id); if (!a) return null; const r = shotOf(a); return { stars: r.stars, framed: r.framed, inPose: r.inPose, fov: r.fov, d: Math.hypot(a.x - hero.x, a.z - hero.z), ax: a.x, az: a.z, cover: L.coverage(Math.hypot(a.x - r.from.x, a.y + a.parts.centerY - r.from.y, a.z - r.from.z), a.parts.radius, narrow(r.fov)), occ: L.occluded(W.trunks, r.from.x, r.from.z, a.x, a.z) }; },
    poseNow(id) { const a = animals.find((q) => q.id === id); if (a) a.nextPose = 0.01; },
    screenOf(x, y, z) { const s = W.toScreen(x, y, z); return toPx(s[0], s[1]); },
    look() { return { ...view }; },
    pause() { cancelAnimationFrame(raf); raf = -1; },
    /** Steps n frames of 1/60 s by hand (paused tests); draws only the last one. */
    step(n = 1) { for (let i = 0; i < n; i++) frame(last + 1000 / 60, true, i === n - 1); },
    buildAll() { while (buildQueue.length) buildQueue.shift()(); },
    glare() {
      W.render(); const gl = W.renderer.getContext(), w = gl.drawingBufferWidth, h = gl.drawingBufferHeight, px = new Uint8Array(w * h * 4);
      gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px);
      let white = 0, bright = 0, lum = 0; for (let i = 0; i < px.length; i += 4) { const Lm = 0.2126 * px[i] + 0.7152 * px[i + 1] + 0.0722 * px[i + 2]; lum += Lm; if (px[i] > 240 && px[i + 1] > 240 && px[i + 2] > 240) white++; if (Lm > 215) bright++; }
      const n = w * h; return { white: white / n, bright: bright / n, meanL: lum / n };
    },
  };
  window.__game = api.debug;
  // dev:end
  window.__ss = api;
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
