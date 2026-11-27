// PROTOTYPE - NOT FOR PRODUCTION
/**
 * Soap Carving: Satisfying ASMR. A soap carving craft game for kids (DIY, ASMR, creative, casual): a marbled soap
 * bar sits on a craft table with a shape drawn on it as a dotted line; the player carves away the soap outside
 * the line with a knife, rubs the cut edges smooth and glossy with a damp sponge, adds glitter and gems, then
 * drops the soap into a bath bowl where it fizzes and foams while the customer reacts and gives 1-3 stars.
 *
 * Each drag peels curly shavings that fall and pile up on the table; a cut that frees a piece of soap drops it
 * as a chunk; some soaps hide a toy charm in the waste soap. Stars give coins; coins buy new soap marbles,
 * glitter and gems, and the next order asks for what was just bought. The last 12 soaps stand on the player's
 * shelf; after 6 orders, free carve opens. There is no fail. A helper hand shows each gesture on the first
 * soap and whenever the player waits. Text is a short command per step in the device's language (7 languages,
 * Arabic right to left; the globe on the shelf screen changes it). Tunable numbers live in game_config.json.
 */
import { PLUM, PINK, GREEN, tint, glossDisc, glossPill, panel, rays, vignette, roundRect } from './ui.js';
import { loadSprites, loadRest, loadedN, previewIn, ready, settled, cellCanvas, drawCell, drawCellAt, drawTable, drawBowl } from './sprites.js';
import { rng, makeSoap, markDirty, carve, trimRows, carvedShare, sponge, edgeCells, meanRough, takeIslands, islandSprite, shapeScore, sparkleScore, verdict, soapCount, encodeMask, decodeMask, marbleAlbedo, attachPaint, paint, stamp as pressStamp } from './soap.js';
import { POT, MAKE_STEPS, initMake, isMake, makeState, makeTray, makeDown, makeMove, makeUp, makeUpdate, makeProgress, drawMake, drawMakeTray, drawMakeTool, makeHand, perfectAge, makeStop, fillShare, potSide, landAt, fillCentre } from './make.js';
import { createFx, ribbonShape, strokeCurl } from './fx.js';
import { orderShape, winterMarble } from './winter.js';

const DEBUG = location.search.includes('local');
const W = 720, H = 1280, TAU = Math.PI * 2, LANGS = ['en', 'ar', 'es', 'vi', 'hi', 'bn', 'id'];
const FONT = "'Baloo 2', 'Baloo Da 2', 'Baloo Bhaijaan 2', system-ui, 'Noto Sans', 'Noto Sans Arabic', 'Noto Sans Devanagari', 'Noto Sans Bengali', sans-serif";
// the recipes: the first soap is short (carving on the very first touch); every later soap is made from scratch
const SHORT = ['carve', 'smooth', 'sparkle', 'bath'], READY = ['carve', 'smooth', 'stamp', 'sparkle', 'bath'], FULL = [...MAKE_STEPS, ...READY];
const TOOL_CELL = { carve: 0, smooth: 1, sparkle: 2 }; // tools_sheet cells for the step icons
const MOOD = { calm: 0, happy: 1, wow: 2, oops: 3 };
const CONF = ['#FF5FA2', '#FFD23F', '#3DDC97', '#3EC5FF', '#B57BFF', '#FF9F1C'];
const ease = (k) => 1 - Math.pow(1 - Math.max(0, Math.min(1, k)), 3);
const back3 = (k) => { k = Math.max(0, Math.min(1, k)); const c = 1.7; return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2); };

let cv, g, cfg, mode, raf = 0, last = 0, runs = 0, base = null, tables = [], ti = 0, fx = null, vig = null, chrome = null, chromeKey = '';
let save = { n: 0, coins: 0, stars: 0, buys: 0, gifts: 0, giftDue: false, learned: [], owned: { marbles: [], glitters: [], gems: [], stamps: [] }, shelf: [], charms: [], fresh: null, lang: null, muted: false, winterSeen: [], made: [], ftue: false };
let saveRead = false, merged = false, muteTouched = false, touched = false;
let view = 'play', S = null, lang = 'en', pen = null, penId = null, coinShown = 0, coinPulse = 0, wiggle = null, shake = 0, freeNext = false;
// tall phones: the canvas grows to HV high and the 1280-high game sits in the middle, OFF below the top;
// the table art fills the extra height and the top HUD row moves up to the screen edge
let HV = 1280, OFF = 0;
let coinShake = 0, quality = 0, frameTimes = [], slow = 0, fast = 0, RES = 1, bootT = 0, photoSel = -1, coinsFlying = [];
let ac = null, noiseBuf = null, fizzNode = null, gift = null;
const ALB = new Map(), ALB_SMALL = new Map(), THUMBS = new WeakMap(), throttle = {};
const R = rng(12345); // looks only (curls, sparkles); rules are seeded per order
const every = (key, ms) => { const t = performance.now(); if (t - (throttle[key] || 0) < ms) return false; throttle[key] = t; return true; };
/** Colour a moved toward colour b by k (0..1), as rgb(). */
const mix = (a, b, k) => { const p = (c) => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)], x = p(a), y = p(b); return `rgb(${x.map((v, i) => Math.round(v + (y[i] - v) * k)).join(',')})`; };
const reduced = () => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };

// ---------- words ----------
/** Player-facing text for key k in the current language; English when the language lacks it. */
const T = (k) => (cfg.strings[lang] && cfg.strings[lang][k]) || cfg.strings.en[k] || k;
/** The first device language the game has text for, else English. */
function detectLang() {
  for (const l of navigator.languages || [navigator.language || 'en']) { const b = String(l).toLowerCase().split('-')[0]; if (cfg.strings[b]) return b; }
  return 'en';
}
const rtl = () => (cfg.rtl || []).includes(lang);
/** x of a box of width w laid out from the left, mirrored for right-to-left languages. */
const mx = (x, w = 0) => (rtl() ? W - x - w : x);
/** Bold text centred on (x, y), shrunk until it fits maxW. */
function words(str, x, y, size, maxW, color, stroke) {
  g.direction = rtl() ? 'rtl' : 'ltr'; g.textAlign = 'center'; g.textBaseline = 'middle';
  let px = size; g.font = `800 ${px}px ${FONT}`;
  while (px > 18 && g.measureText(str).width > maxW) { px -= 2; g.font = `800 ${px}px ${FONT}`; }
  if (stroke) { g.lineWidth = Math.max(4, px * 0.16); g.lineJoin = 'round'; g.strokeStyle = stroke; g.strokeText(str, x, y); }
  g.fillStyle = color; g.fillText(str, x, y); g.direction = 'ltr';
}
/** A glossy white pill with words, centred on (x, y); pop scales it for a bounce. */
function banner(str, x, y, size, maxW, color = PLUM, pop = 1, base = '#FFFFFF', fixW = 0) {
  g.save(); g.translate(x, y); g.scale(pop, pop);
  g.font = `800 ${size}px ${FONT}`;
  const w = fixW || Math.min(maxW, g.measureText(str).width) + 60, h = size + 32;
  glossPill(g, -w / 2, -h / 2, w, h, base, '#FF9CC8');
  words(str, 0, 3, size, maxW, color);
  g.restore();
}
const popIn = (age) => (age < 0.35 ? 0.6 + 0.4 * ease(age / 0.35) + Math.sin(Math.min(1, age / 0.35) * Math.PI) * 0.12 : 1);

// ---------- the rounded Baloo family, from the asset map (no outside requests); the system font shows until it lands ----------
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

// ---------- first-time spotlight: the table dims except what to touch next; it moves on when the player does it ----------
const SKIPB = () => ({ x: mx(24, 96), y: 296, s: 96 }); // second row of the top grid, under the prompt's left edge
/** The hole of the spotlight for the current step, or null when there is nothing to teach. */
function spotRect() {
  if (mode !== 'play' || view !== 'play' || save.ftue || !S || S.enter > 0 || S.trim || S.k === 'bath') return null;
  if (S.stepUsed || save.learned.includes(S.k)) return null;
  const b = cfg.bar, pad = 28; let x0 = b.x - pad, y0 = b.y - pad, x1 = b.x + b.w + pad, y1 = b.y + b.h + pad;
  if (isMake(S.k)) { const ps = potSide(); x0 = Math.min(x0, POT.x - POT.r - pad, ps.x - ps.r - 8); x1 = Math.max(x1, POT.x + POT.r + pad, ps.x + ps.r + 8); y0 = Math.min(y0, POT.y - POT.r - pad, ps.y - ps.r - 8); y1 = Math.max(y1, POT.y + POT.r + pad); }
  if (trayShown()) { y1 = 1090; x0 = 8; x1 = W - 8; } // the tray of glitter, gems, cubes or flowers is part of the lesson
  return { x: Math.max(8, x0), y: y0, w: Math.min(W - 8, x1) - Math.max(8, x0), h: y1 - y0 };
}
const spotOn = () => !!spotRect() || (!save.ftue && mode === 'play' && view === 'play' && S && S.k === 'bath' && S.reveal && S.reveal.t > 1.5);
function drawSpot() {
  const r = spotRect(); if (!r) return;
  const a = Math.min(1, (S.t - (S.promptAt || 0)) * 3), k = 1 + Math.sin(S.t * 4) * 0.012;
  g.save(); g.fillStyle = `rgba(40,16,50,${0.5 * a})`;
  g.beginPath(); g.rect(0, -OFF, W, HV);
  const cx = r.x + r.w / 2, cy = r.y + r.h / 2, w = r.w * k, h = r.h * k, x = cx - w / 2, y = cy - h / 2, q = 44;
  g.moveTo(x + q, y); g.arcTo(x, y, x, y + h, q); g.arcTo(x, y + h, x + w, y + h, q); g.arcTo(x + w, y + h, x + w, y, q); g.arcTo(x + w, y, x, y, q); g.closePath(); // the hole, wound the other way
  g.fill('evenodd');
  g.lineWidth = 6; g.strokeStyle = `rgba(255,255,255,${0.85 * a})`; roundRect(g, x, y, w, h, q); g.stroke();
  g.restore();
}
/** The ring that points at the big next button on the first result, and the skip button while the lesson runs. */
function drawSpotTop() {
  if (!spotOn()) return;
  if (S.k === 'bath') { const p = (S.t * 1.2) % 1; g.strokeStyle = `rgba(255,255,255,${1 - p})`; g.lineWidth = 8; g.beginPath(); g.arc(NEXT.x, NEXT.y, NEXT.r + 10 + p * 40, 0, TAU); g.stroke(); }
  if (S.k === 'bath') return;
  const b = SKIPB(); glossDisc(g, b.x + b.s / 2, b.y + b.s / 2, b.s / 2, '#FFFFFF', '#FF9CC8');
  g.fillStyle = PLUM; for (const dx of [-14, 8]) { const x = b.x + b.s / 2 + dx; g.beginPath(); g.moveTo(x - 8, b.y + b.s / 2 - 16); g.lineTo(x + 10, b.y + b.s / 2); g.lineTo(x - 8, b.y + b.s / 2 + 16); g.closePath(); g.fill(); } // skip: two arrows, no words
}

// ---------- cinematic beats: on a key moment the camera eases in, frames it with a brief slow-down, then eases back ----------
// One beat at a time from a priority queue with a cooldown, so they never pile up; input is never blocked.
let cine = null, cineCool = 0, cineSlow = 0;
const cineQ = [];
/** Ask for the beat kind (cfg.cine) at world point (x, y). */
function beat(kind, x, y) {
  const c = cfg.cine[kind]; if (!c || reduced()) return;
  if ((cineCool > 0 || cine) && !c.always) return;
  cineQ.push({ kind, x, y, ...c, t: 0 }); cineQ.sort((a, b) => b.prio - a.prio);
}
/** Real-time step of the beat; returns the factor game time runs at (below 1 during a slow-down). */
function stepCine(dt) {
  cineCool = Math.max(0, cineCool - dt);
  if (!cine && cineQ.length) { cine = cineQ.shift(); cineQ.length = 0; cineSlow = cine.slow || 0; if (cine.sting) SFX.sting(); }
  if (cine && (cine.t += dt) >= cine.dur) { cine = null; cineCool = cfg.cineCooldown; }
  if (cineSlow > 0) { cineSlow -= dt; return cfg.cineSlowRate; }
  return 1;
}
/** How far in the camera is now, 0..1: eases in, holds, eases out. */
const cineK = () => (!cine ? 0 : cine.t < cine.ease ? ease(cine.t / cine.ease) : cine.t > cine.dur - cine.ease ? ease(Math.max(0, cine.dur - cine.t) / cine.ease) : 1);
/** The camera of the beat around the world layer, and its soft vignette after. */
function cineCamera() {
  const k = cineK(); if (!k) return;
  const z = 1 + (cine.zoom - 1) * k, fx0 = 360 + (cine.x - 360) * k, fy0 = 640 + (cine.y - 640) * k; // the focus slides to the centre as it zooms
  g.translate(360, 640); g.scale(z, z); g.translate(-fx0, -fy0);
  return true;
}
function cineVignette() {
  const k = cineK(); if (!k) return;
  const v = g.createRadialGradient(360, 640, 330, 360, 640, 820); v.addColorStop(0, 'rgba(60,20,70,0)'); v.addColorStop(1, `rgba(60,20,70,${0.42 * k})`);
  g.fillStyle = v; g.fillRect(0, -OFF, W, HV);
}

// ---------- host calls that must never stop the game ----------
const buzz = (kind) => { try { lib.haptics.play(kind); } catch (e) { /* no vibration here */ } };
/** Write the save, only after the player's stored save was read, so it can never be overwritten blind. */
const persist = () => { if (mode === 'play' && saveRead) Promise.resolve().then(() => lib.saveUserGameState(save)).catch(() => {}); };
const submitScore = () => { if (mode === 'play' && saveRead) Promise.resolve().then(() => lib.addPlayerScoreToLeaderboard(save.stars)).catch(() => {}); };

// ---------- sound (synthesized; starts on the first touch) ----------
// ---------- recorded sounds from the asset map; the synthesized ones stay as the fallback ----------
const REC = {}; let ext = null, restAsked = false, tipShown = false, recAsked = false, musicNode = null, pourNode = null;
function loadRecorded() {
  if (recAsked || !ac) return; recAsked = true;
  for (const id of Object.keys(cfg.sounds || {})) {
    let a = null; try { a = lib.getAsset(id); } catch (e) { /* no asset map */ }
    if (!a || !a.url) continue;
    fetch(a.url).then((r) => r.arrayBuffer()).then((b) => new Promise((res, rej) => ac.decodeAudioData(b, res, rej)))
      .then((buf) => { REC[id] = buf; if (id === 'music_studio') music(true); }).catch(() => { /* the synthesized sound plays instead */ });
  }
}
/**
 * Play recorded sound id from its measured start (cfg.sounds: skip, gain). len > 0 plays a slice of that length,
 * from a random place when random. Returns whether the recording exists (true even when muted, so the fallback stays quiet).
 */
function rec(id, { vol = 1, rate = 1, len = 0, random = false } = {}) {
  const buf = REC[id]; if (!buf) return false; if (!live()) return true;
  const c = cfg.sounds[id], s = ac.createBufferSource(), v = ac.createGain(), t = ac.currentTime, g = c.gain * vol;
  const room = Math.max(0, buf.duration - c.skip - (len || 0)), off = c.skip + (random ? Math.random() * room : 0);
  s.buffer = buf; s.playbackRate.value = rate; v.gain.setValueAtTime(g, t);
  if (len) { v.gain.setValueAtTime(g, t + len * 0.7); v.gain.linearRampToValueAtTime(0.0001, t + len); } // a soft end, no click
  s.connect(v).connect(ac.destination); s.start(t, off, len || undefined);
  return true;
}
/** The studio music, quiet under everything, while the sound is on. */
function music(on) {
  if (musicNode && (!on || save.muted)) { try { musicNode.stop(); } catch (e) { /* stopped */ } musicNode = null; }
  if (!on || musicNode || save.muted || !REC.music_studio || !live()) return;
  const s = ac.createBufferSource(), v = ac.createGain(); s.buffer = REC.music_studio; s.loop = true;
  v.gain.value = cfg.sounds.music_studio.gain * 0.22; s.connect(v).connect(ac.destination); s.start(0, cfg.sounds.music_studio.skip); musicNode = s;
}
/** The pour sound runs exactly while the pot pours. Returns whether a recording is used. */
function pourLoop(on) {
  if (!REC.sfx_pour) return false;
  if (!on || !live()) { if (pourNode) { try { pourNode.stop(); } catch (e) { /* stopped */ } pourNode = null; } return true; }
  if (pourNode) return true;
  const s = ac.createBufferSource(), v = ac.createGain(); s.buffer = REC.sfx_pour; s.loop = true;
  v.gain.value = cfg.sounds.sfx_pour.gain * 0.8; s.connect(v).connect(ac.destination); s.start(0, cfg.sounds.sfx_pour.skip); pourNode = s;
  return true;
}
function startAudio() {
  if (!ac) { const AC = window.AudioContext || window.webkitAudioContext; if (AC) { ac = new AC(); noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate); const d = noiseBuf.getChannelData(0), r = rng(9); for (let i = 0; i < d.length; i++) d[i] = r() * 2 - 1; } }
  if (ac && ac.state === 'suspended' && !document.hidden) ac.resume().then(() => music(true)).catch(() => {});
  loadRecorded(); music(true);
}
const live = () => ac && !save.muted && ac.state === 'running';
function beep(freq, len, type = 'sine', vol = 0.1, slide = 0, delay = 0) {
  if (!live()) return;
  const o = ac.createOscillator(), v = ac.createGain(), t = ac.currentTime + delay;
  o.type = type; o.frequency.setValueAtTime(freq, t); if (slide) o.frequency.linearRampToValueAtTime(Math.max(40, freq + slide), t + len);
  v.gain.setValueAtTime(vol, t); v.gain.exponentialRampToValueAtTime(0.001, t + len);
  o.connect(v).connect(ac.destination); o.start(t); o.stop(t + len + 0.02);
}
/** A burst of filtered noise. */
function hiss(len, vol, freq, q = 1, type = 'bandpass', delay = 0) {
  if (!live()) return;
  const s = ac.createBufferSource(), f = ac.createBiquadFilter(), v = ac.createGain(), t = ac.currentTime + delay;
  s.buffer = noiseBuf; f.type = type; f.frequency.value = freq; f.Q.value = q;
  v.gain.setValueAtTime(0.0001, t); v.gain.exponentialRampToValueAtTime(vol, t + 0.006); v.gain.exponentialRampToValueAtTime(0.001, t + len);
  s.connect(f).connect(v).connect(ac.destination); s.start(t, Math.random() * 0.5); s.stop(t + len + 0.02);
}
const tune = (notes, gap, len = 0.22, vol = 0.09) => notes.forEach((f, i) => beep(f, len, 'triangle', vol, 0, i * gap / 1000));
const SFX = {
  crunch: (sp) => rec('sfx_carve', { len: 0.16, random: true, rate: 0.9 + Math.min(1, sp / 1600) * 0.3, vol: 0.9 }) || SFX.crunchSynth(sp),
  crunchSynth: (sp) => { const k = Math.min(1, sp / 1600); hiss(0.07 + k * 0.03, 0.22, 900 + k * 1500 + Math.random() * 300, 1.4); hiss(0.04, 0.1, 4200, 2, 'bandpass', 0.015); beep(140 + Math.random() * 40, 0.04, 'triangle', 0.05, -40); },
  curl: () => beep(2600 + Math.random() * 900, 0.03, 'sine', 0.025, 600),
  skid: () => { beep(1500, 0.09, 'sine', 0.04, 500); hiss(0.08, 0.05, 6000, 3); },
  thud: () => { beep(110, 0.25, 'sine', 0.2, -60); hiss(0.18, 0.12, 400, 0.8, 'lowpass'); beep(70, 0.2, 'triangle', 0.1, -20, 0.12); },
  oops: () => { beep(520, 0.12, 'triangle', 0.09, -120); beep(380, 0.18, 'triangle', 0.09, -100, 0.11); },
  squeak: () => rec('sfx_squeak', { len: 0.22, random: true, rate: 0.95 + Math.random() * 0.12 }) || SFX.squeakSynth(),
  squeakSynth: () => { beep(1100 + Math.random() * 400, 0.07, 'sine', 0.035, 450); hiss(0.07, 0.05, 3000, 1.5); },
  pop: () => beep(700 + Math.random() * 600, 0.05, 'sine', 0.05, 500),
  shimmer: () => { for (let i = 0; i < 3; i++) beep(2200 + Math.random() * 1800, 0.08, 'triangle', 0.025, 0, i * 0.03); },
  clink: () => { beep(2400, 0.18, 'sine', 0.07); beep(3300, 0.14, 'sine', 0.05, 0, 0.02); },
  plop: () => rec('sfx_plop') || SFX.plopSynth(),
  plopSynth: () => { beep(320, 0.18, 'sine', 0.16, -220); hiss(0.4, 0.12, 1800, 0.6); },
  step: () => tune([659, 880, 1175], 80, 0.18, 0.08),
  pick: () => beep(990, 0.06, 'triangle', 0.07),
  no: () => { beep(220, 0.12, 'square', 0.05); beep(180, 0.14, 'square', 0.05, 0, 0.1); },
  unlock: () => tune([784, 988, 1175, 1568], 85, 0.25, 0.1),
  fill: (k) => tune([523 + k * 120, 659 + k * 120, 784 + k * 120], 60, 0.14, 0.06),
  star: (k) => beep(880 + k * 220, 0.28, 'triangle', 0.1),
  coin: () => { beep(1568, 0.05, 'square', 0.03); beep(2093, 0.09, 'square', 0.03, 0, 0.05); },
  wow: () => rec('sfx_win') || SFX.wowSynth(),
  sting: () => { [523, 659, 784, 1047].forEach((f, i) => beep(f, 0.22, 'triangle', 0.06, 0, i * 0.07)); beep(1568, 0.5, 'sine', 0.03, 0, 0.3); },
  wowSynth: () => { tune([523, 659, 784, 1047, 1319], 95, 0.3, 0.09); hiss(0.4, 0.05, 6000, 0.5); },
  charm: () => tune([1047, 1319, 1568, 2093], 70, 0.2, 0.08),
  winter: () => tune([1175, 1568, 1976], 58, 0.09, 0.035),
  swish: () => hiss(0.22, 0.08, 700 + Math.random() * 300, 0.8),
  crackle: () => { hiss(0.05, 0.09, 5200, 3); hiss(0.04, 0.06, 7000, 3, 'bandpass', 0.05); },
  pour: () => hiss(0.16, 0.08, 1100 + Math.random() * 400, 0.7),
  chop: () => rec('sfx_chop', { rate: 0.95 + Math.random() * 0.1 }) || SFX.crunchSynth(1200),
  glitter: () => rec('sfx_glitter', { len: 0.3, random: true }) || SFX.shimmer(),
  plopSmall: () => rec('sfx_plop', { len: 0.35, vol: 0.5, rate: 1.3 }) || beep(320, 0.12, 'sine', 0.1, -200),
  shutter: () => { hiss(0.05, 0.2, 3000, 0.7); beep(1800, 0.03, 'square', 0.04, 0, 0.04); },
  pourLoop,
  stamp: () => { beep(160, 0.16, 'sine', 0.16, -60); hiss(0.1, 0.1, 900, 0.8); beep(1200, 0.06, 'triangle', 0.04, 0, 0.12); },
};
function fizz(on) {
  if (fizzNode) { try { fizzNode.stop(); } catch (e) { /* stopped */ } fizzNode = null; }
  if (!on || !live() || REC.sfx_plop) return; // the recorded plop carries its own fizz
  const s = ac.createBufferSource(), f = ac.createBiquadFilter(), v = ac.createGain(), t = ac.currentTime;
  s.buffer = noiseBuf; s.loop = true; f.type = 'highpass'; f.frequency.value = 3500;
  v.gain.setValueAtTime(0.0001, t); v.gain.exponentialRampToValueAtTime(0.05, t + 0.3); v.gain.exponentialRampToValueAtTime(0.001, t + 2.6);
  s.connect(f).connect(v).connect(ac.destination); s.start(); s.stop(t + 2.7); fizzNode = s;
}

// ---------- owned things, prices and orders ----------
const MARBLE = (id) => cfg.marbles.find((m) => m.id === id) || cfg.marbles[0];
const owns = (kind, id) => { const list = cfg[kind], it = list.find((x) => x.id === id); return !!it && (!it.shop || save.owned[kind].includes(id)); };
const price = () => cfg.priceBase + cfg.priceStep * save.buys;
const shapeOf = (id) => cfg.shapes.find((s) => s.id === id) || cfg.shapes[0];
const isWinterShape = (id) => !!(cfg.shapes.find((s) => s.id === id) || {}).winter;

/** The steps of order o: the first soap is short, every scratchEvery-th soap is made from scratch first
 *  (a few quick making steps, from cfg.quickMake), the rest arrive as a ready bar. ready: always start at the knife (a fresh load). */
const stepsOf = (o, ready) => {
  if (o.n === 0) return SHORT;
  // dev:start
  if (window.__fullRecipe) return FULL; // tests: every making gesture in one soap
  // dev:end
  if (!o.scratch || ready) return READY;
  const sets = cfg.quickMake, i = Math.floor(o.n / cfg.scratchEvery) % sets.length; // the sets take turns, so every making step still comes round
  return [...sets[i], ...READY];
};
/** The order for soap n: always the same for the same n and the same things owned. */
function makeOrder(n) {
  const r = rng(1000 + n * 7919), pick = (a) => a[Math.floor(r() * a.length) % a.length];
  const plain = cfg.marbles.filter((m) => m.id !== 'gold' && (n >= cfg.freeAfter || !['frost', 'candy_cane'].includes(m.id)) && owns('marbles', m.id)).map((m) => m.id);
  const golden = n % 4 === 3, freeCarve = freeNext;
  let marble = golden ? 'gold' : n === 0 ? 'pink' : winterMarble(n, cfg.freeAfter) || pick(plain);
  // Six familiar soaps first; four winter silhouettes then arrive one by one. Free carve uses
  // them as a guide while retaining its original no-fail, player-made outline.
  const shape = orderShape(n, freeCarve, cfg.freeAfter, cfg.shapes, (length) => Math.floor(r() * length));
  const o = { n, shape, marble, golden: golden && !freeCarve, customer: cfg.customers[n % cfg.customers.length], charm: null, glitter: null, gem: null, stamp: null, simple: n < 2, free: freeCarve, scratch: !freeCarve && n % cfg.scratchEvery === cfg.scratchEvery - 1 };
  if (n % 5 === 4) { const left = [...Array(8).keys()].filter((c) => !save.charms.includes(c)); o.charm = left.length ? left[Math.floor(r() * left.length) % left.length] : Math.floor(r() * 8) % 8; }
  const f = save.fresh;
  if (f && f.k === 'marbles' && owns('marbles', f.id) && !golden) o.marble = f.id;
  if (f && f.k === 'glitters' && owns('glitters', f.id)) o.glitter = f.id;
  if (f && f.k === 'gems' && owns('gems', f.id)) o.gem = f.id;
  if (f && f.k === 'stamps' && owns('stamps', f.id)) o.stamp = f.id;
  return o;
}

// ---------- shapes ----------
/** An SVG path (0..100 box) for a shape: its own path, or a star or flower built from [points, inner radius]. */
function shapeD(sh) {
  if (sh.snowflake) {
    const poly = (pts) => 'M' + pts.map((p) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' L') + ' Z';
    const out = ['M50 31 C39 31 31 39 31 50 C31 61 39 69 50 69 C61 69 69 61 69 50 C69 39 61 31 50 31 Z'];
    for (let i = 0; i < 6; i++) {
      const a = -Math.PI / 2 + i * Math.PI / 3, ux = Math.cos(a), uy = Math.sin(a), px = -uy, py = ux, half = 7, len = 44;
      out.push(poly([[50 + px * half, 50 + py * half], [50 + ux * len + px * half, 50 + uy * len + py * half], [50 + ux * len - px * half, 50 + uy * len - py * half], [50 - px * half, 50 - py * half]]));
      for (const side of [-1, 1]) {
        const ba = a + side * 0.82, bx = 50 + ux * 25, by = 50 + uy * 25, bux = Math.cos(ba), buy = Math.sin(ba), bpx = -buy, bpy = bux, bl = 17, bh = 4.4;
        out.push(poly([[bx + bpx * bh, by + bpy * bh], [bx + bux * bl + bpx * bh, by + buy * bl + bpy * bh], [bx + bux * bl - bpx * bh, by + buy * bl - bpy * bh], [bx - bpx * bh, by - bpy * bh]]));
      }
    }
    return out.join(' ');
  }
  if (sh.d) return sh.d;
  const [n, inner] = sh.star || sh.flower, cx = 50, cy = sh.star ? 53 : 50, Ro = 48, pts = [];
  if (sh.star) { for (let i = 0; i < n * 2; i++) { const a = -Math.PI / 2 + i * Math.PI / n, k = i % 2 ? Ro * inner : Ro; pts.push(`${(cx + Math.cos(a) * k).toFixed(1)} ${(cy + Math.sin(a) * k).toFixed(1)}`); } return 'M' + pts.join(' L') + ' Z'; }
  let d = '';
  for (let i = 0; i < n; i++) {
    const a0 = -Math.PI / 2 + i * TAU / n, a1 = a0 + TAU / n, am = (a0 + a1) / 2, ri = Ro * inner * 1.05, rc = Ro * 1.32;
    const p0 = [cx + Math.cos(a0) * ri, cy + Math.sin(a0) * ri], p1 = [cx + Math.cos(a1) * ri, cy + Math.sin(a1) * ri];
    const c0 = [cx + Math.cos(am - 0.42) * rc, cy + Math.sin(am - 0.42) * rc], c1 = [cx + Math.cos(am + 0.42) * rc, cy + Math.sin(am + 0.42) * rc];
    d += (i ? ' ' : `M${p0[0].toFixed(1)} ${p0[1].toFixed(1)}`) + ` C${c0[0].toFixed(1)} ${c0[1].toFixed(1)} ${c1[0].toFixed(1)} ${c1[1].toFixed(1)} ${p1[0].toFixed(1)} ${p1[1].toFixed(1)}`;
  }
  return d + ' Z';
}
const PATHS = {};
const pathOf = (id) => PATHS[id] || (PATHS[id] = new Path2D(id === 'free' ? 'M20 20 C40 5 60 5 80 20 C95 40 95 60 80 80 C60 95 40 95 20 80 C5 60 5 40 20 20 Z' : shapeD(shapeOf(id))));
/** Fit of the 0..100 shape box inside the bar: scale and offset in bar cells. */
function fitOf(id) {
  const b = cfg.bar, pad = id === 'free' ? 140 : 26, s = Math.min((b.w - pad * 2) / 100, (b.h - pad * 2) / 100);
  return { s, ox: (b.w - 100 * s) / 2, oy: (b.h - 100 * s) / 2 };
}
/** A shape drawn into a w x h grid of cells (1 inside). */
function rasterize(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; const q = c.getContext('2d');
  draw(q); const d = q.getImageData(0, 0, w, h).data, out = new Uint8Array(w * h);
  for (let i = 0; i < out.length; i++) out[i] = d[i * 4 + 3] > 127 ? 1 : 0;
  return out;
}
/** A marble's colours at w x h, cached: full-size bars and shelf thumbnails in separate caches, so one never evicts the other. */
const albedoOf = (id, w, h) => {
  const big = w === cfg.bar.w, C = big ? ALB : ALB_SMALL, key = id + '@' + w;
  if (!C.has(key)) { if (C.size >= (big ? 4 : 12)) C.delete(C.keys().next().value); C.set(key, marbleAlbedo(MARBLE(id), w, h, 7 + cfg.marbles.indexOf(MARBLE(id)))); }
  return C.get(key);
};

// ---------- a new soap ----------
function newOrder(n, enter, ready = false) {
  const o = makeOrder(n), b = cfg.bar, fit = fitOf(o.shape);
  freeNext = false;
  const bar = rasterize(b.w, b.h, (q) => { roundRect(q, 0, 0, b.w, b.h, b.r); q.fill(); });
  const tpl = rasterize(b.w, b.h, (q) => { q.translate(fit.ox, fit.oy); q.scale(fit.s, fit.s); q.fill(pathOf(o.shape)); });
  // free carve: everything but the small hidden core may go, so the player's own shape is the result
  const K = { protect: o.free ? cfg.core : cfg.protect, core: cfg.core, tol: o.simple ? cfg.simpleTol : cfg.tol, bevel: cfg.bevel, depth: cfg.depth, margin: cfg.margin, shadowX: cfg.shadowX, shadowY: cfg.shadowY };
  const soap = makeSoap(b.w, b.h, bar, tpl, K);
  const mb = MARBLE(o.marble);
  const sc = (S && S.soap && S.soap.canvas) || document.createElement('canvas');
  attachPaint(soap, sc, albedoOf(mb.id, b.w, b.h), mb.inner);
  const glit = (S && S.glitLayer) || document.createElement('canvas');
  glit.width = sc.width; glit.height = sc.height;
  if (enter) { ti = 1 - ti; fx.setPile(tables[ti]); } // the old pile fades out on the other table
  freshTable(tables[ti]);
  S = {
    n, order: o, steps: stepsOf(o, ready), si: 0, k: stepsOf(o, ready)[0], soap, fit, make: null, stamps: [], stampAnim: null, scent: null,
    stampSel: Math.max(0, cfg.stamps.findIndex((x) => x.id === o.stamp)), enter: enter ? 0.7 : 0, t: 0, idle: 0, used: false, stepUsed: false, shaveAcc: 0, islandT: 0, dirtyIsl: false,
    score: { shape: 0, smooth: 0, sparkle: 0, v: 0, stars: 0 }, edges: null, rough: 1, trim: null, glitLayer: glit, specks: [], glitCount: 0,
    gems: [], gemSel: -1, glitSel: owns('glitters', o.glitter) ? cfg.glitters.findIndex((x) => x.id === o.glitter) : ['honey', 'gold'].includes(o.marble) ? 2 : 1, lastAct: 0, added: false, // glitSel: a glitter that stands out on this soap
    charm: o.charm === null ? null : placeCharm(soap, n, o.charm), mood: 'calm', moodT: 0, reveal: null, photo: null, oopsT: 9, pileFade: enter ? 1 : 0, speed: 0, done: false,
  };
  if (isMake(S.k)) S.make = makeState(S);
  if (isWinterShape(o.shape) && !save.winterSeen.includes(o.shape)) {
    S.winterNew = true;
    save.winterSeen.push(o.shape);
    persist();
  }
}
/** A hidden charm: a point deep in the waste soap, and the cells around it that hide it. */
function placeCharm(soap, n, id) {
  const r = rng(77 + n), { w, h, sd } = soap;
  for (let k = 0; k < 400; k++) {
    const x = 30 + Math.floor(r() * (w - 60)), y = 30 + Math.floor(r() * (h - 60));
    if (sd[y * w + x] < -30 && soap.m[y * w + x]) {
      const cells = []; for (let yy = y - 18; yy <= y + 18; yy++) for (let xx = x - 18; xx <= x + 18; xx++) if ((xx - x) ** 2 + (yy - y) ** 2 <= 324 && soap.m[yy * w + xx]) cells.push(yy * w + xx);
      return { id, x, y, cells, state: 'hidden', t: 0 };
    }
  }
  return null;
}

// ---------- particles that need the game ----------
function burst(x, y, n, conf) {
  const k = quality ? 0.5 : 1;
  for (let i = 0; i < n * k; i++) {
    const a = R() * TAU, s = 150 + R() * 450;
    if (conf) fx.confetti(x, y, Math.cos(a) * s, Math.sin(a) * s - 300, CONF[i % CONF.length], R);
    else fx.twinkle(x + Math.cos(a) * s * 0.15, y + Math.sin(a) * s * 0.15, 10 + R() * 14, 0.5 + R() * 0.4, i % 3 ? '#FFFFFF' : '#FFE27A');
  }
}
const barXY = (x, y) => [x - cfg.bar.x, y - cfg.bar.y]; // screen → bar cells
const albAt = (cx, cy) => { const s = S.soap, i = (Math.max(0, Math.min(s.h - 1, cy | 0)) * s.w + Math.max(0, Math.min(s.w - 1, cx | 0))) * 3; return `rgb(${s.alb[i]},${s.alb[i + 1]},${s.alb[i + 2]})`; };
/** A resting place for something peeled at screen (sx, sy): beside or below the bar, never on it. */
function landing(sx, sy, dirx, diry) {
  const b = cfg.bar;
  let tx = sx + dirx * 60 + (R() - 0.5) * 120, ty = sy + diry * 40 + 40 + R() * 80;
  // land beside or below the bar, never on it
  if (tx > b.x - 10 && tx < b.x + b.w + 10 && ty < b.y + b.h + cfg.depth + 20) {
    const toL = tx - b.x, toR = b.x + b.w - tx, toB = b.y + b.h + cfg.depth - ty;
    if (toB < Math.min(toL, toR) * 1.6) ty = b.y + b.h + cfg.depth + 30 + R() * 140;
    else if (toL < toR) tx = b.x - 30 - R() * 120; else tx = b.x + b.w + 30 + R() * 120;
  }
  return [Math.max(24, Math.min(W - 24, tx)), Math.max(b.y + 10, Math.min(1230, ty))];
}
/** A curl flying from bar cell (cx, cy) to a resting place off the soap. */
function spawnCurl(cx, cy, dirx, diry) {
  const b = cfg.bar, sx = b.x + cx, sy = b.y + cy, [tx, ty] = landing(sx, sy, dirx, diry);
  const z0 = 18, vz = 170 + R() * 120, T = (vz + Math.sqrt(vz * vz + 2 * 900 * z0)) / 900;
  const inner = S.soap.inner, c2 = `rgb(${inner[0] * 0.8 | 0},${inner[1] * 0.8 | 0},${inner[2] * 0.8 | 0})`;
  fx.curl(sx, sy, (tx - sx) / T, (ty - sy) / T, albAt(cx, cy), c2, R, quality ? 0.85 : 1);
  const p = fx.P[fx.P.length - 1]; if (p && p.k === 'curl') { p.z = z0; p.vz = vz; }
}

// ---------- steps ----------
function carveAlong(ax, ay, bx, by, dt) {
  const s = S.soap, step = cfg.knifeStep, d = Math.hypot(bx - ax, by - ay), n = Math.max(1, Math.ceil(d / step));
  S.speed = S.speed * 0.6 + (dt > 0 ? d / dt : 0) * 0.4;
  if (d > 2) { const want = Math.max(-0.45, Math.min(0.45, Math.sin(Math.atan2(by - ay, bx - ax) + Math.PI / 4) * 0.45)); S.lean = (S.lean || 0) * 0.7 + want * 0.3; } // the blade leans into the stroke
  const fastNow = S.speed > cfg.insideSpeed && !S.order.free;
  let removed = 0, skid = 0, nick = 0, lx = ax, ly = ay;
  for (let i = 1; i <= n; i++) {
    const x = ax + (bx - ax) * i / n, y = ay + (by - ay) * i / n, [cx0, cy0] = barXY(lx, ly), [cx1, cy1] = barXY(x, y);
    const res = carve(s, cx0, cy0, cx1, cy1, cfg.knifeR, fastNow);
    removed += res.removed; skid += res.skid; nick += res.nick; lx = x; ly = y;
    if (res.removed) {
      S.shaveAcc += res.removed;
      const dx = (bx - ax) / (d || 1), dy = (by - ay) / (d || 1);
      while (S.shaveAcc >= cfg.shaveEvery * 2) { S.shaveAcc -= cfg.shaveEvery * 2; spawnCurl(res.cx, res.cy, dx, dy); } // small curls fly off; the main shaving grows on the blade
      const rb = S.ribbon || (S.ribbon = { len: 0, c: albAt(res.cx, res.cy) });
      rb.len = Math.min(cfg.ribbonMax, rb.len + res.removed / cfg.ribbonCells); rb.back = Math.atan2(-dy, -dx) - 0.6;
      if (rb.len >= cfg.ribbonMax) dropRibbon(); // a full shaving breaks off by itself
      if (R() < 0.03) { const sx = cfg.bar.x + res.cx, sy = cfg.bar.y + res.cy, [tx, ty] = landing(sx, sy, dx, dy); fx.speck(sx, sy, 0, (tx - sx) / 0.42, (ty - sy) / 0.42, albAt(res.cx, res.cy), 7 + R() * 4); const q = fx.P[fx.P.length - 1]; if (q) q.vz = 190; } // crumbs
    }
  }
  if (removed) {
    S.dirtyIsl = true; S.stepUsed = true;
    if (every('crunch', 45)) SFX.crunch(S.speed);
    if (every('curl', 140)) SFX.curl();
    if (every('tick', 110)) buzz('tick');
    if (S.mood !== 'oops' && S.mood !== 'wow') setMood('happy', 0.6);
    checkCharm();
  }
  if (skid && !removed && every('skid', 220)) SFX.skid();
  if (nick && S.oopsT > 1) { S.oopsT = 0; SFX.oops(); buzz('warning'); setMood('oops', 1.2); shake = Math.max(shake, 0.2); }
}
function setMood(m, secs) { S.mood = m; S.moodT = secs; }
function checkCharm() {
  const c = S.charm; if (!c || c.state !== 'hidden') return;
  let gone = 0; for (const i of c.cells) if (!S.soap.m[i]) gone++;
  if (gone >= c.cells.length * 0.3) popCharm();
}
function popCharm() {
  const c = S.charm; c.state = 'out'; c.t = 0;
  for (const i of c.cells) if (S.soap.m[i]) { S.soap.m[i] = 0; if (S.soap.sd[i] < 0) S.soap.removedOut++; } // the charm's hollow comes out with it
  markDirty(S.soap, c.x - 20, c.y - 20, c.x + 20, c.y + 20); S.dirtyIsl = true;
  SFX.charm(); buzz('success'); setMood('wow', 1.6); beat('charm', cfg.bar.x + c.x, cfg.bar.y + c.y); burst(cfg.bar.x + c.x, cfg.bar.y + c.y, 24, false);
  if (!save.charms.includes(c.id)) save.charms.push(c.id);
}
function dropIslands() {
  S.dirtyIsl = false;
  const isl = takeIslands(S.soap, (list) => {
    for (const it of list) {
      // a crumb or two for a small piece; specks of the blade's edge just vanish
      if (it.cells.length < 60) { const sx = cfg.bar.x + (it.x0 + it.x1) / 2, sy = cfg.bar.y + (it.y0 + it.y1) / 2; for (let k = 0; k < Math.floor(it.cells.length / 25); k++) { const [tx, ty] = landing(sx, sy, 0, 1); fx.speck(sx, sy, 0, (tx - sx) / 0.42, (ty - sy) / 0.42, albAt(it.x0, it.y0), 6); const q = fx.P[fx.P.length - 1]; if (q) q.vz = 190; } continue; }
      const sp = islandSprite(S.soap, it), sx = cfg.bar.x - cfg.margin + sp.x, sy = cfg.bar.y - cfg.margin + sp.y;
      const b = cfg.bar, cw = sp.canvas.width, ch = sp.canvas.height, cx = sx + cw / 2, cy = sy + ch / 2, out = cx < b.x + b.w / 2 ? -1 : 1;
      // a narrow piece rests beside the bar, a wide one below it; never on the soap that is left
      let [tx, ty] = cw < 130 ? landing(cx, cy, out, 0) : [cx + out * 40, b.y + b.h + cfg.depth + 30 + ch * 0.3 + R() * 70];
      tx = Math.max(cw / 2 + 6, Math.min(W - cw / 2 - 6, tx)); ty = Math.min(1180, ty);
      const vz = 150 + R() * 50, T = (vz + Math.sqrt(vz * vz + 2 * 900 * 6)) / 900;
      fx.chunk(sp.canvas, sx, sy, (tx - cx) / T, (ty - cy) / T, R, vz);
    }
  });
  const big = isl.filter((it) => it.cells.length >= 60);
  if (big.length) { SFX.thud(); buzz('thud'); shake = Math.max(shake, Math.min(0.5, 0.15 + big[0].cells.length / 30000)); setMood('wow', 1.2); }
  if (isl.length) checkCharm();
}
function finishCarve() {
  if (S.trim) return;
  if (S.dirtyIsl) dropIslands();
  const sh = shapeScore(S.soap); S.score.shape = S.order.free ? 1 : sh.shape;
  if (isWinterShape(S.order.shape) && !S.winterJingled) { S.winterJingled = true; SFX.winter(); }
  dropRibbon(); pen = null;
  if (S.order.free) { if (S.charm && S.charm.state === 'hidden') popCharm(); nextStep(); return; } // the player's shape stays as carved
  S.trim = { y: -1, t: 0 }; SFX.step();
}
function stepTrim(dt) {
  const tr = S.trim; tr.t += dt;
  const ny = Math.min(S.soap.h, Math.floor(S.soap.h * tr.t / 0.7));
  if (ny > tr.y) {
    const n = trimRows(S.soap, tr.y + 1, ny);
    for (let k = 0; k < Math.min(4, Math.ceil(n / 400)); k++) {
      for (let tries = 0; tries < 8; tries++) { const x = Math.floor(R() * S.soap.w), y = Math.min(S.soap.h - 1, ny); if (S.soap.sd[y * S.soap.w + x] < 0) { spawnCurl(x, y, x < S.soap.w / 2 ? -1 : 1, 0.3); break; } }
    }
    if (n && every('crunch', 60)) SFX.crunch(900);
    tr.y = ny;
  }
  if (tr.t >= 0.75) { S.trim = null; if (S.charm && S.charm.state === 'hidden') popCharm(); nextStep(); }
}
/** On to the next step of the recipe: a chime, a burst and a coin from the finished step, then its own setup. */
function nextStep() {
  const [x, y] = stepPos(S.k);
  if (!save.learned.includes(S.k)) save.learned.push(S.k); // the hand teaches each gesture until it has been done once
  S.si = Math.min(S.steps.length - 1, S.si + 1); S.k = S.steps[S.si];
  S.idle = 0; S.stepUsed = false; S.lastAct = S.t; pen = null; SFX.step(); buzz('success');
  burst(x, y, 12, false);
  if (S.make) S.make.stepT = 0;
  pourLoop(false);
  if (S.k !== 'bath') reward(x, y, cfg.stepCoins);
  if (S.k === 'smooth') {
    S.edges = edgeCells(S.soap); S.rough = meanRough(S.soap, S.edges); S.rubT = 0; roughSpots();
    for (let i = fx.P.length - 1; i >= 0; i--) { const q = fx.P[i]; if (q.k === 'curl' || q.k === 'chunk') { fx.P.splice(i, 1); fx.bake(q); } } // scraps still in the air go with the old table
    ti = 1 - ti; freshTable(tables[ti]); fx.setPile(tables[ti]); S.pileFade = 1; SFX.swish(); // the scraps are swept off the table
  }
  if (S.k === 'bath') startReveal(); else persist(); // coins and learned gestures are kept even if the player leaves mid-soap
}
/** Edge cells still rough (sampled), for the chalky hint and the helper hand. */
function roughSpots() {
  const s = S.soap, out = []; let sx = 0, sy = 0;
  for (let i = 0; i < S.edges.length; i += 5) { const c = S.edges[i]; if (s.m[c] && s.rough[c] > 0.3) { const x = c % s.w, y = (c - x) / s.w; out.push([x, y, (x * 7 + y * 13) % 10 / 10]); sx += x; sy += y; } }
  const mx0 = sx / out.length, my0 = sy / out.length; // the spot nearest the middle: the middle itself may be smooth soap
  S.spots = out; S.spotC = out.length ? out.reduce((b, q) => Math.hypot(q[0] - mx0, q[1] - my0) < Math.hypot(b[0] - mx0, b[1] - my0) ? q : b) : null;
}
/** Today as a number YYYYMMDD in the player's own time zone. */
const today = () => { const d = new Date(); return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate(); };
/** A word of praise at eye level, with a chime and sparkles. */
function praise(key) { S.praise = { key, t: 0 }; SFX.fill(2); buzz('success'); burst(cfg.bar.x + cfg.bar.w / 2, cfg.bar.y + cfg.bar.h / 2, 18, false); }
/** n coins flying from (x, y) to the counter: a small reward the player sees land. */
function reward(x, y, n) {
  if (!n || mode !== 'play') return;
  save.coins += n; coinsFlying.push({ x, y, t: 0, v: n });
}
function finishSmooth() { S.score.smooth = 1 - meanRough(S.soap, S.edges); nextStep(); }
function finishSparkle() {
  const dens = S.glitCount / Math.max(1, soapCount(S.soap) / 1000);
  S.score.sparkle = sparkleScore(dens, S.gems.length, cfg.glitterTarget);
  nextStep();
}
/** A stamp's raised picture as a size x size grid of 0..1, softened at the edges (cached). */
const STAMPS = new Map();
function stampShape(shape, size) {
  const key = shape + '@' + size; if (STAMPS.has(key)) return STAMPS.get(key);
  const m = rasterize(size, size, (q) => { const k = size * 0.86 / 100; q.translate(size * 0.07, size * 0.07); q.scale(k, k); q.fill(pathOf(shape)); });
  const out = new Float32Array(size * size);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) { let s = 0, c = 0; for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) { const xx = x + i, yy = y + j; if (xx >= 0 && yy >= 0 && xx < size && yy < size) { s += m[yy * size + xx]; c++; } } out[y * size + x] = s / c; }
  STAMPS.set(key, out); return out;
}
/** The middle of the soap that is left (cells). */
function soapCentre(s) { let x = 0, y = 0, n = 0; for (let i = 0; i < s.m.length; i += 7) if (s.m[i]) { x += i % s.w; y += Math.floor(i / s.w); n++; } return n ? [x / n, y / n] : [s.w / 2, s.h / 2]; }
function stampTap(p) {
  const s = S.soap; let [cx, cy] = barXY(p[0], p[1]);
  if (cx < 0 || cy < 0 || cx >= s.w || cy >= s.h || !s.m[(cy | 0) * s.w + (cx | 0)]) return;
  if (S.stamps.length >= cfg.stampMax) { wiggle = { k: 'stampsfull', t: 0 }; SFX.no(); return; }
  const st = cfg.stamps[S.stampSel] || cfg.stamps[0], sh = stampShape(st.shape, cfg.stampSize), z = cfg.stampSize;
  const on = (x, y) => { let a = 0, n = 0; for (let j = 0; j < z; j += 6) for (let i = 0; i < z; i += 6) if (sh[j * z + i] > 0.5) { n++; const X = Math.round(x - z / 2 + i), Y = Math.round(y - z / 2 + j); if (X >= 0 && Y >= 0 && X < s.w && Y < s.h && s.m[Y * s.w + X]) a++; } return n ? a / n : 0; };
  for (let k = 0; k < 24 && on(cx, cy) < 0.95; k++) { const c = S.soapC || (S.soapC = soapCentre(s)); cx += (c[0] - cx) * 0.12; cy += (c[1] - cy) * 0.12; } // nudged inward so the whole picture lands on soap
  p = [cfg.bar.x + cx, cfg.bar.y + cy];
  pressStamp(s, sh, z, cx, cy);
  S.stamps.push({ id: st.id, x: cx, y: cy }); S.stampAnim = { x: p[0], y: p[1], t: 0, shape: st.shape };
  S.stepUsed = true; S.lastAct = S.t; SFX.stamp(); buzz('thud'); burst(p[0], p[1], 10, false); shake = Math.max(shake, 0.12);
}
const checkShown = () => mode === 'play' && view === 'play' && S.enter <= 0 && !S.trim && (
  (S.k === 'carve' && carvedShare(S.soap) >= (S.order.free ? 0.15 : cfg.carveCheck)) ||
  (S.k === 'smooth' && (S.rough <= cfg.smoothCheck || S.rubT > cfg.smoothCheckSecs)) || (S.k === 'sparkle' && S.added) || (S.k === 'stamp' && S.stamps.length > 0));

// ---------- the bath reveal ----------
function startReveal() {
  const sc = S.soap.canvas, ph = document.createElement('canvas'); ph.width = sc.width; ph.height = sc.height;
  const q = ph.getContext('2d'); q.drawImage(sc, 0, 0); q.drawImage(S.glitLayer, 0, 0);
  for (const gm of S.gems) drawCell(q, 'gems_sheet', gemCell(gm.id), gm.x + cfg.margin, gm.y + cfg.margin, 62);
  S.photo = ph;
  const v = verdict(S.score.shape, S.score.smooth, S.score.sparkle);
  S.score.v = v.v; S.score.stars = S.order.free ? 0 : v.stars;
  const coins = S.order.free ? cfg.coinPerStar : cfg.coinPerStar * v.stars * (S.order.golden ? 2 : 1);
  // a small copy for the bowl and the shelf, scaled once
  const k = 1, sm = document.createElement('canvas'); sm.width = Math.round(ph.width * k); sm.height = Math.round(ph.height * k);
  const sq = sm.getContext('2d'); sq.imageSmoothingQuality = 'high'; sq.drawImage(ph, 0, 0, sm.width, sm.height);
  // foam where the soap meets the water: the outermost edge cell in each of 56 directions, two or three bubbles each
  const e = edgeCells(S.soap), w = S.soap.w, best = new Array(56).fill(null); let mxx = 0, myy = 0;
  for (const c of e) { mxx += c % w; myy += (c - (c % w)) / w; } mxx /= e.length || 1; myy /= e.length || 1;
  for (const c of e) { const x = c % w, y = (c - x) / w, a = Math.floor(((Math.atan2(y - myy, x - mxx) + Math.PI) / TAU) * 56) % 56, d = (x - mxx) ** 2 + (y - myy) ** 2; if (!best[a] || d > best[a][2]) best[a] = [x, y, d]; }
  const foam = [];
  for (const b of best) if (b) for (let j = 0; j < 2 + (R() < 0.5); j++) { const ang = Math.atan2(b[1] - myy, b[0] - mxx), o = 4 + R() * 12; foam.push([(b[0] + Math.cos(ang) * o + cfg.margin) * k, (b[1] + Math.sin(ang) * o + cfg.margin + cfg.depth * 0.7) * k, 5 + R() * 9]); }
  S.reveal = { t: 0, coins, small: sm, k, foam, paid: false, stars: 0, bars: 0 };
  // the save, written once per soap
  save.n++; save.coins += coins; save.stars += S.score.stars;
  if (!S.order.free && !save.made.includes(S.order.shape)) save.made.push(S.order.shape);
  S.tip = !tipShown; tipShown = true; // once a session: tomorrow brings a gift
  const entry = { m: encodeMask(S.soap), mb: S.order.marble, g: S.glitSel, gc: S.glitCount, gems: S.gems.map((gm) => [gm.id, Math.round(gm.x), Math.round(gm.y)]), st: S.stamps.map((q) => [q.id, Math.round(q.x), Math.round(q.y)]), s: S.score.stars, sh: S.order.shape, cu: S.order.customer };
  THUMBS.set(entry, thumbFrom(sm));
  save.shelf.unshift(entry); if (save.shelf.length > 12) save.shelf.length = 12;
  if (save.fresh && ((save.fresh.k === 'marbles' && S.order.marble === save.fresh.id) || (save.fresh.k === 'glitters' && S.order.glitter === save.fresh.id) || (save.fresh.k === 'gems' && S.order.gem === save.fresh.id) || (save.fresh.k === 'stamps' && S.order.stamp === save.fresh.id))) save.fresh = null;
  if (save.n % cfg.giftEvery === 0) save.giftDue = true; // every few soaps a gift box; saved, so a reload cannot lose it
  const day = today(); if (save.day && day > save.day) save.giftDue = true; // and the first soap of a new day (a clock turned back pays nothing)
  save.day = Math.max(save.day || 0, day);
  persist(); submitScore();
  fizz(true);
}
const thumbFrom = (src) => { const c = document.createElement('canvas'), k = 150 / Math.max(src.width, src.height); c.width = Math.round(src.width * k); c.height = Math.round(src.height * k); const q = c.getContext('2d'); q.imageSmoothingQuality = 'high'; q.drawImage(src, 0, 0, c.width, c.height); return c; };
/** Share the game: title and text only, so the host's card shows the game's current thumbnail. */
function shareGame() {
  try {
    const result = lib.share({ title: 'Soap Carving: Satisfying ASMR', text: T('shareDesc') });
    if (result && typeof result.catch === 'function') result.catch(() => {});
  } catch (e) { /* Sharing is optional and never interrupts carving. */ }
}
const BOWL = { x: 360, y: 566, d: 640 };
function stepReveal(dt) {
  const rv = S.reveal, t0 = rv.t; rv.t += dt; const t = rv.t;
  const at = (s) => t0 < s && t >= s;
  if (at(0.5)) { const st = S.score.stars, k = save.n === 1 ? 'first' : S.winterNew ? 'newShape' : st === 3 ? 'perfect' : null; if (k) beat(k, BOWL.x, BOWL.y); }
  if (at(0.55)) { SFX.plop(); buzz('thud'); fx.ring(BOWL.x, BOWL.y, 120, 1.2); fx.ring(BOWL.x, BOWL.y, 80, 0.9); for (let i = 0; i < 18; i++) fx.bubble(BOWL.x + (R() - 0.5) * 300, BOWL.y + 60 + R() * 120, 6 + R() * 12, -40 - R() * 80, 1.4 + R()); }
  if (t > 0.6 && t < 3.5 && every('bub', 90)) { fx.bubble(BOWL.x + (R() - 0.5) * 340, BOWL.y + 100 + R() * 80, 5 + R() * 12, -50 - R() * 70, 1.5 + R()); if (R() < 0.4) SFX.pop(); }
  if (t > 0.8 && every('ring', 900)) fx.ring(BOWL.x, BOWL.y, 150 + R() * 30, 1.4);
  if (S.order.free) { if (at(1.0)) { setMood('wow', 9); SFX.wow(); burst(360, 520, cfg.confetti, true); } }
  else {
    if (at(1.0)) setMood(S.score.stars >= 2 ? 'happy' : 'calm', 9);
    for (let i = 0; i < 3; i++) if (at(1.1 + i * 0.45)) { rv.bars = i + 1; SFX.fill(i); }
    for (let i = 0; i < S.score.stars; i++) if (at(2.6 + i * 0.28)) { rv.stars = i + 1; SFX.star(i); buzz('tap'); burst(starXY(i)[0], starXY(i)[1], 10, false); }
    if (at(2.6 + S.score.stars * 0.28 + 0.1) && S.score.stars >= 2) { SFX.wow(); burst(360, 300, cfg.confetti * (S.score.stars === 3 ? 1 : 0.5), true); buzz('success'); }
  }
  if (at(3.4)) { const n = Math.min(12, Math.ceil(rv.coins / 5)); for (let i = 0; i < n; i++) coinsFlying.push({ x: 360 + (R() - 0.5) * 80, y: 300, t: -i * 0.06, v: rv.coins / n }); rv.paid = true; }
  if (at(3.9)) { rv.flash = 0; SFX.shutter(); buzz('tap'); } // a photo for the shelf
  if (rv.flash !== undefined) rv.flash += dt;
  if (t > 3.4 + cfg.revealSeconds && view === 'play') nextOrder(); // stars and coins take 3.4 s, then the soap is shown off
}
const starXY = (i) => [360 + (i - 1) * 110, 196];
function nextOrder() {
  fizz(false);
  if (!save.ftue) { save.ftue = true; persist(); } // the first soap went all the way round: the lesson is done
  if (save.giftDue) return showGift();
  newOrder(save.n, true);
}
function showGift() { gift = { taps: 0, t: 0, open: -1, item: null }; view = 'gift'; pen = null; }
/** Dots filled on the gift pill: all of them while a gift waits. */
const giftDots = () => (save.giftDue ? cfg.giftEvery : save.n % cfg.giftEvery);
/** What the gift box holds: the next locked thing, taking turns between stamps, glitter, gems and marbles. */
function pickGift() {
  const kinds = ['stamps', 'glitters', 'gems', 'marbles'];
  for (let i = 0; i < 4; i++) { const k = kinds[(save.gifts + i) % 4], it = cfg[k].find((x) => x.shop && !owns(k, x.id)); if (it) return { k, id: it.id }; }
  return { k: 'coins', n: cfg.giftCoins };
}
function openGift() {
  const it = pickGift(); gift.item = it; gift.open = 0; beat('gift', 360, 640); save.gifts++; save.giftDue = false;
  if (it.k === 'coins') { save.coins += it.n; coinShown = save.coins; } else { save.owned[it.k].push(it.id); save.fresh = { k: it.k, id: it.id }; }
  SFX.unlock(); SFX.wow(); buzz('success'); burst(360, 600, cfg.confetti, true); persist();
}
function giftTap() {
  if (gift.open < 0) { gift.taps++; gift.hit = 0; SFX.pop(); buzz('tap'); shake = Math.max(shake, 0.15); burst(360, 640, 8, false); if (gift.taps >= 3) openGift(); return; }
  if (gift.open > 0.8) { view = 'play'; gift = null; SFX.pick(); newOrder(save.n, true); }
}

// ---------- layout ----------
// the top row sits on one 8 px grid: 16 px margins and gaps all round, every pill and button 96 tall, centred on y 64
const MUTE = () => ({ x: mx(608, 96), y: 16 - OFF, s: 96 }), SHELFB = () => ({ x: mx(496, 96), y: 16 - OFF, s: 96 });
const CHECK = () => ({ x: mx(564, 112), y: 740, s: 112 });
const NEXT = { x: 360, y: 1028, r: 56 }; // the result row's centre line (y 1028): share | next | peek
/** The icons of the current part of the recipe (making, or finishing) and where step k's icon sits. */
const phaseList = (k = S.k) => S.steps.filter((q) => isMake(q) === isMake(k));
const stepPos = (k) => { const list = phaseList(k), n = list.length, i = Math.max(0, list.indexOf(k)), sp = Math.min(92, 470 / Math.max(1, n - 1)); return [mx(360 + (i - (n - 1) / 2) * sp), 160]; };
const GIFTB = () => ({ x: mx(248, 232), y: 16 - OFF, w: 232, h: 96 });
const SHAREB = () => (view === 'photo' ? { x: 240, y: 984, w: 240, h: 84 } : { x: mx(24, 240), y: 986, w: 240, h: 84 }); // beside the big next button (centred under a shelf photo), above the bottom 15%
const slotXY = (row, j) => [mx(72 + j * 115), row ? 1040 : 962];
const ORDER = () => ({ x: mx(480, 216), y: 208, w: 216, h: 176 }); // right column of the top grid, clear of the board
const SHELF_CELL = (i) => [mx(30 + (i % 4) * 168, 150), 226 + Math.floor(i / 4) * 182];
const SHOP_XY = (j) => [mx(150 + j * 140), 932];
const LANGB = () => ({ x: mx(30, 300), y: 1000, w: 300, h: 84 }), FREEB = () => ({ x: mx(390, 300), y: 1000, w: 300, h: 84 });
const inDisc = (b, p) => Math.hypot(p[0] - b.x - b.s / 2, p[1] - b.y - b.s / 2) <= b.s / 2 + 8;
const inRect = (b, p) => p[0] >= b.x && p[0] <= b.x + b.w && p[1] >= b.y && p[1] <= b.y + b.h;
const gemCell = (id) => { const gm = cfg.gems.find((x) => x.id === id); return gm ? gm.cell : 0; };
const trayShown = () => mode === 'play' && view === 'play' && S.enter <= 0 && (S.k === 'sparkle' || S.k === 'stamp' || makeTray(S.k));
const freeOpen = () => save.n >= cfg.freeAfter;

// ---------- input ----------
function point(e) { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * W, (e.clientY - r.top) / r.height * HV - OFF]; }
/** Where the tool works: a touch works a little above the finger, so the finger never hides it. */
const tipOf = (p, touch) => (touch && (S.k === 'carve' || S.k === 'smooth') ? [p[0], p[1] - 56] : p);
function down(p, touch) {
  startAudio(); touched = true; S.idle = 0; S.ribbon = null; // a new touch starts with a clean blade
  if (view === 'photo') { if (inRect(SHAREB(), p)) { shareGame(); return; } view = 'shelf'; photoSel = -1; SFX.pick(); return; }
  if (inDisc(MUTE(), p)) { save.muted = !save.muted; muteTouched = true; if (save.muted) { fizz(false); pourLoop(false); } music(!save.muted); SFX.pick(); persist(); return; }
  if (spotRect() && inDisc(SKIPB(), p)) { save.ftue = true; SFX.pick(); persist(); return; } // skip the lesson
  if (view === 'gift') return giftTap(); // the gift screen holds every tap until the box is opened and closed
  if (inDisc(SHELFB(), p)) { view = view === 'shelf' ? 'play' : 'shelf'; pen = null; SFX.pick(); return; }
  if (view === 'shelf') return shelfTap(p);
  if (S.enter > 0 || S.trim) return;
  if (S.k === 'bath') { if (S.reveal.t > 3.5 && inRect(SHAREB(), p)) { shareGame(); return; } if (S.reveal.t > 1.5) { SFX.pick(); nextOrder(); } return; }
  if (checkShown() && inDisc(CHECK(), p)) { SFX.pick(); if (S.k === 'carve') finishCarve(); else if (S.k === 'smooth') finishSmooth(); else if (S.k === 'stamp') nextStep(); else finishSparkle(); return; }
  if (isMake(S.k)) { // making: taps on the tray things, or a drag (stir, cool, swipe), or a hold (pour)
    S.used = true; S.stepUsed = true; S.lastAct = S.t;
    makeDown(S, p); if (makeTray(S.k)) return;
    pen = { x: p[0], y: p[1], px: p[0], py: p[1], t: performance.now(), touch, fx: p[0], fy: p[1] };
    return;
  }
  if (trayShown() && p[1] > 905) return trayTap(p);
  S.used = true; S.lastAct = S.t;
  if (S.k === 'stamp') return stampTap(p);
  if (S.k === 'sparkle') { const hit = S.gems.findIndex((gm) => Math.hypot(cfg.bar.x + gm.x - p[0], cfg.bar.y + gm.y - p[1]) < 34); if (hit >= 0) { S.gems.splice(hit, 1); SFX.pick(); return; } }
  if (S.k === 'sparkle' && S.gemSel >= 0) return gemTap(p);
  const tp = tipOf(p, touch);
  pen = { x: tp[0], y: tp[1], px: tp[0], py: tp[1], t: performance.now(), touch, fx: p[0], fy: p[1] };
  gesture(0);
}
/** The finger moved to p at time ts (the event's own time: several events can arrive in one frame on fast screens). */
function move(p, ts = performance.now()) {
  if (!pen) return;
  const tp = tipOf(p, pen.touch), now = ts, dt = Math.max(1 / 240, (now - pen.t) / 1000);
  pen.px = pen.x; pen.py = pen.y; pen.x = tp[0]; pen.y = tp[1]; pen.fx = p[0]; pen.fy = p[1]; pen.t = now; S.idle = 0; S.lastAct = S.t;
  if (DEBUG) { const a = performance.now(); gesture(dt); const pr = window.__prof; if (pr) { pr.g = (pr.g || 0) + performance.now() - a; pr.ge = (pr.ge || 0) + 1; } } else gesture(dt);
}
function up() { if (pen && S && S.k === 'carve') { if (S.dirtyIsl) dropIslands(); dropRibbon(); } if (S && isMake(S.k)) makeUp(S); pen = null; }
/** The shaving on the blade breaks off and falls to the pile. */
function dropRibbon() {
  const rb = S && S.ribbon; S.ribbon = null; if (!rb || rb.len < 18 || !pen) return;
  const sh = ribbonShape(rb.len, rb.back, 9 + Math.min(5, rb.len / 30)), inner = S.soap.inner, c2 = `rgb(${inner[0] * 0.78 | 0},${inner[1] * 0.78 | 0},${inner[2] * 0.78 | 0})`;
  const [tx, ty] = landing(pen.x, pen.y, -Math.cos(rb.back), -Math.sin(rb.back)), T = 0.5;
  fx.curl(pen.x, pen.y, (tx - pen.x) / T, (ty - pen.y) / T, rb.c, c2, R, 1, sh); SFX.curl();
}
/** The shaving still on the blade, peeling back from the tip. */
function drawRibbon() {
  const rb = S.ribbon; if (!rb || !pen || S.k !== 'carve' || rb.len < 6) return;
  const inner = S.soap.inner, c2 = `rgb(${inner[0] * 0.78 | 0},${inner[1] * 0.78 | 0},${inner[2] * 0.78 | 0})`;
  strokeCurl(g, { pts: ribbonShape(rb.len, rb.back, 0).pts, rot: 0, c: rb.c, c2, wide: 9 + Math.min(5, rb.len / 30) }, pen.x, pen.y, 1);
}
function gesture(dt) {
  if (isMake(S.k)) makeMove(S, pen.px, pen.py, pen.x, pen.y, dt);
  else if (S.k === 'carve') carveAlong(pen.px, pen.py, pen.x, pen.y, dt);
  else if (S.k === 'smooth') {
    const d = Math.hypot(pen.x - pen.px, pen.y - pen.py), [cx, cy] = barXY(pen.x, pen.y);
    S.rubD = (S.rubD || 0) + d; if (d > 1) S.rubDir = Math.atan2(pen.y - pen.py, pen.x - pen.px); // the squash follows the distance rubbed per frame
    const took = sponge(S.soap, cx, cy, cfg.spongeR, cfg.spongeRate, Math.min(0.06, d / 500));
    if (took > 0) {
      S.stepUsed = true;
      if (every('foam', 50)) fx.foam(pen.x + (R() - 0.5) * cfg.spongeR * 1.4, pen.y + (R() - 0.5) * cfg.spongeR * 1.4, 7 + R() * 9, 0.9 + R() * 0.8);
      if (every('squeak', 160)) SFX.squeak();
      if (every('tick', 140)) buzz('tick');
      if (every('shine', 260)) { const e = S.edges, i = e[Math.floor(R() * e.length)], x = i % S.soap.w, y = (i - x) / S.soap.w; if (Math.hypot(x - cx, y - cy) < cfg.spongeR * 1.6 && S.soap.rough[i] < 0.3) { fx.twinkle(cfg.bar.x + x, cfg.bar.y + y, 18, 0.6); SFX.shimmer(); } }
    }
  } else if (S.k === 'sparkle') {
    if (!every('shake', 35)) return;
    const gl = cfg.glitters[S.glitSel] || cfg.glitters[0];
    for (let k = 0; k < (quality ? 6 : 10); k++) { // out of the mouth, MOUTH_UP above the finger, scattering as it falls
      const a = R() * TAU, sp = Math.sqrt(R()) * 110; // spread evenly over a disc, not bunched in the middle
      fx.speck(pen.x + (R() - 0.5) * 8, pen.y + (R() - 0.5) * 8, MOUTH_UP, Math.cos(a) * sp, Math.sin(a) * sp, gl.c, 5, (lx, ly) => landGlitter(lx, ly, gl.c));
    }
    if (every('shim', 200)) SFX.glitter();
    if (every('tick', 160)) buzz('tick');
  }
}
function paintGlitterMark(q, gx, gy, c, z, winter = false) {
  const st = (ox, oy) => { q.beginPath(); q.moveTo(gx + ox, gy - z + oy); q.quadraticCurveTo(gx + ox, gy + oy, gx + z + ox, gy + oy); q.quadraticCurveTo(gx + ox, gy + oy, gx + ox, gy + z + oy); q.quadraticCurveTo(gx + ox, gy + oy, gx - z + ox, gy + oy); q.quadraticCurveTo(gx + ox, gy + oy, gx + ox, gy - z + oy); q.fill(); };
  q.fillStyle = 'rgba(74,35,102,0.28)'; st(1, 1); q.fillStyle = c; st(0, 0);
  if (winter && ((gx * 13 + gy * 7) % 3 | 0) === 0) {
    q.save(); q.strokeStyle = 'rgba(235,251,255,0.95)'; q.lineWidth = 1.15; q.lineCap = 'round'; q.beginPath();
    for (let j = 0; j < 6; j++) { const a = j * Math.PI / 3; q.moveTo(gx + Math.cos(a) * z * 0.34, gy + Math.sin(a) * z * 0.34); q.lineTo(gx + Math.cos(a) * z * 1.18, gy + Math.sin(a) * z * 1.18); }
    q.stroke(); q.restore();
  }
  q.fillStyle = 'rgba(255,255,255,0.95)'; q.fillRect(gx - 0.8, gy - z * 0.6, 1.6, 1.6);
}
function landGlitter(x, y, c) {
  if (!S || S.k !== 'sparkle') return;
  const [cx, cy] = barXY(x, y), s = S.soap, i = (cy | 0) * s.w + (cx | 0);
  if (cx >= 0 && cy >= 0 && cx < s.w && cy < s.h && s.m[i] && s.emb[i] < 0.3) { // glitter keeps off the stamped picture
    const q = S.glitLayer.getContext('2d'), gx = cx + cfg.margin, gy = cy + cfg.margin;
    paintGlitterMark(q, gx, gy, c, 3.5 + R() * 3, isWinterShape(S.order.shape));
    S.glitCount++; S.added = true; S.stepUsed = true; if (S.specks.length < 1500) S.specks.push([x, y]);
  } else if (R() < 0.25) { const q = fx.pile.getContext('2d'); q.fillStyle = c; q.fillRect(x - 1.5, y - 1.5, 3, 3); }
}
function gemTap(p) {
  const s = S.soap, [cx, cy] = barXY(p[0], p[1]), i = (cy | 0) * s.w + (cx | 0);
  if (cx < 0 || cy < 0 || cx >= s.w || cy >= s.h || !s.m[i]) { S.gemSel = -1; return; } // a tap off the soap puts the tweezers down
  if (S.gems.length >= 3) { wiggle = { k: 'gemsfull', t: 0 }; SFX.no(); return; }
  S.gems.push({ id: cfg.gems[S.gemSel].id, x: cx, y: cy, t: 0 }); S.added = true; S.stepUsed = true; S.lastAct = S.t;
  SFX.clink(); buzz('tap'); fx.twinkle(p[0], p[1], 26, 0.6); burst(p[0], p[1], 6, false);
}
/** The two tray rows: glitter colours and gems; locked ones show a price. */
function trayItems() {
  if (S.k === 'stamp') return [cfg.stamps.map((x, j) => ({ k: 'stamps', id: x.id, j, locked: !owns('stamps', x.id) })), []];
  return [cfg.glitters.map((x, j) => ({ k: 'glitters', id: x.id, j, locked: !owns('glitters', x.id) })), cfg.gems.map((x, j) => ({ k: 'gems', id: x.id, j, locked: !owns('gems', x.id) }))];
}
function trayTap(p) {
  const rows = trayItems();
  for (let row = 0; row < 2; row++) for (const it of rows[row]) {
    const [x, y0] = slotXY(row, it.j), y = it.k === 'stamps' ? 998 : y0; if (Math.hypot(p[0] - x, p[1] - y) > 52) continue;
    if (it.locked) return buy(it.k, it.id, () => select(it));
    return select(it);
  }
}
function select(it) {
  S.lastAct = S.t;
  if (it.k === 'stamps') S.stampSel = it.j;
  else if (it.k === 'glitters') { S.glitSel = it.j; S.gemSel = -1; } else S.gemSel = it.j;
  S.used = true; SFX.pick(); buzz('tap');
}
/** Buy item id of kind for the current price, or wiggle when coins are short. */
function buy(kind, id, then) {
  const c = price();
  if (S) S.lastAct = S.t;
  if (save.coins < c) { wiggle = { k: kind + id, t: 0 }; coinPulse = 1; coinShake = 0.5; SFX.no(); buzz('error'); return false; }
  save.coins -= c; coinShown = save.coins; save.buys++; save.owned[kind].push(id); save.fresh = { k: kind, id };
  SFX.unlock(); buzz('success'); burst(360, 640, 30, true); persist();
  if (then) then();
  return true;
}
function shelfTap(p) {
  if (inRect(LANGB(), p)) { lang = save.lang = LANGS[(LANGS.indexOf(lang) + 1) % LANGS.length]; SFX.pick(); persist(); return; }
  if (freeOpen() && inRect(FREEB(), p)) { freeNext = true; view = 'play'; SFX.unlock(); if (S.si === 0 && !S.used) newOrder(save.n, true); return; } // an untouched soap turns free now, else the next one
  const shop = cfg.marbles.filter((m) => m.shop);
  for (let j = 0; j < shop.length; j++) { const [x, y] = SHOP_XY(j); if (Math.hypot(p[0] - x, p[1] - y) < 52 && !owns('marbles', shop[j].id)) return buy('marbles', shop[j].id); }
  for (let i = 0; i < save.shelf.length; i++) { const [x, y] = SHELF_CELL(i); if (Math.abs(p[0] - x - 75) < 80 && Math.abs(p[1] - y - 70) < 90) { photoSel = i; view = 'photo'; SFX.pick(); return; } }
}
function bindInput() {
  if (cv.__bound) return; cv.__bound = true;
  cv.addEventListener('pointerdown', (e) => { if (mode !== 'play' || penId !== null) return; penId = e.pointerId; try { cv.setPointerCapture(e.pointerId); } catch (x) { /* fine */ } down(point(e), e.pointerType !== 'mouse'); });
  cv.addEventListener('pointermove', (e) => { if (e.pointerId !== penId || mode !== 'play') return; const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : []; if (evs.length > 1) for (const c of evs) move(point(c), c.timeStamp); else move(point(e), e.timeStamp); });
  const end = (e) => { if (e.pointerId !== penId) return; penId = null; up(); startAudio(); };
  cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end);
  document.addEventListener('visibilitychange', () => { if (!ac) return; if (document.hidden) ac.suspend().catch(() => {}); else ac.resume().catch(() => {}); });
}

// ---------- update ----------
function update(dt) {
  bootT += dt;
  if (!restAsked && (bootT > 3 || ready('studio_bg'))) { restAsked = true; loadRest(); } // the rest waits until the first picture is in
  if (!S) return;
  if (fx) fx.step(dt);
  if (shake > 0) shake = Math.max(0, shake - dt * 1.8);
  coinPulse = Math.max(0, coinPulse - dt * 2.5); if (wiggle && (wiggle.t += dt) > 0.5) wiggle = null;
  for (let i = coinsFlying.length - 1; i >= 0; i--) { const c = coinsFlying[i]; c.t += dt; if (c.t > 0.7) { coinsFlying.splice(i, 1); coinShown = Math.min(save.coins, coinShown + c.v); coinPulse = 1; SFX.coin(); } }
  if ((!coinsFlying.length && !(S.reveal && !S.reveal.paid)) || view !== 'play') coinShown = save.coins;
  coinShake = Math.max(0, coinShake - dt);
  if (mode !== 'play') { S.t += dt; return; }
  S.t += dt; S.oopsT += dt;
  if (S.pileFade > 0) S.pileFade = Math.max(0, S.pileFade - dt * 2);
  if (S.charm && S.charm.state === 'out') S.charm.t += dt;
  if (S.praise) S.praise.t += dt;
  S.rub = (S.rub || 0) * 0.7 + ((S.rubD || 0) / Math.max(dt, 1e-3)) * 0.3; S.rubD = 0; // the sponge springs back when the finger rests
  if (S.enter > 0) { S.enter = Math.max(0, S.enter - dt); return; }
  if (S.moodT > 0 && (S.moodT -= dt) <= 0 && S.k !== 'bath') S.mood = 'calm';
  if (view === 'gift') { gift.t += dt; if (gift.open >= 0) gift.open += dt; gift.hit = (gift.hit ?? 1) + dt; }
  if (view !== 'play') { S.lastAct += dt; S.idle = 0; return; } // time on the shelf does not count as waiting
  if (!pen) S.idle += dt;
  if (S.trim) { stepTrim(dt); return; }
  if (isMake(S.k)) makeUpdate(S, dt);
  else if (S.k === 'carve') {
    if ((S.islandT += dt) > 0.25 && S.dirtyIsl) { S.islandT = 0; dropIslands(); }
    const cs = carvedShare(S.soap);
    if (!S.order.free && !S.trim) { if (cs >= 0.5 && !S.mile) { S.mile = 1; praise('great'); } else if (cs >= 0.8 && S.mile === 1) { S.mile = 2; praise('almost'); } }
    if (cs >= (S.order.free ? 2 : cfg.carveDone)) finishCarve();
  } else if (S.k === 'smooth') {
    if (every('rough', 150)) { S.rough = meanRough(S.soap, S.edges); roughSpots(); }
    if (pen) S.rubT += dt;
    if (S.rough <= cfg.smoothDone) finishSmooth();
  } else if (S.k === 'stamp') {
    if (S.stampAnim) S.stampAnim.t += dt;
    if (S.stamps.length && !pen && S.t - S.lastAct > (S.stamps.length >= cfg.stampMax ? 1.2 : cfg.sparkleAuto)) nextStep();
  } else if (S.k === 'sparkle') {
    if (S.added && !pen && S.t - S.lastAct > cfg.sparkleAuto) finishSparkle();
    if (S.specks.length && every('twk', quality ? 120 : 50)) { const sp = S.specks[Math.floor(R() * S.specks.length)]; fx.twinkle(sp[0], sp[1], 6 + R() * 6, 0.45); }
    for (const gm of S.gems) gm.t += dt;
  } else if (S.k === 'bath') stepReveal(dt);
}

// ---------- draw ----------
const booting = () => bootT < 2.5 && !settled() && !ready('studio_bg');
/** The table art with its vignette, made once (again when the painted table arrives). */
function makeBase() {
  ext = ext || document.createElement('canvas'); ext.width = W; ext.height = HV;
  const q = ext.getContext('2d');
  const tb = drawTable(q, W, HV);
  if (!tb) { const gr = q.createLinearGradient(0, 0, 0, HV); gr.addColorStop(0, '#FFE1B8'); gr.addColorStop(1, '#F7C98F'); q.fillStyle = gr; q.fillRect(0, 0, W, HV); q.fillStyle = '#BFF0DD'; roundRect(q, 60, 300 + OFF, 600, 720, 40); q.fill(); }
  q.drawImage(vignette(W, HV), 0, 0);
  base = base || document.createElement('canvas'); base.width = W; base.height = H;
  base.getContext('2d').drawImage(ext, 0, -OFF); // the game's own 1280 high slice of the same picture, so there is no seam
  base.__prev = tb === 'preview'; base.__plain = tb !== true;
}
/** A table canvas back to the bare table: the pile of shavings lands on it. */
function freshTable(c) { if (!base) makeBase(); c.getContext('2d').drawImage(base, 0, 0); }
function drawBack() {
  if (!base || (base.__plain && (ready('studio_bg') || (!base.__prev && previewIn())))) { makeBase(); for (const c of tables) freshTable(c); }
  g.drawImage(tables[ti], 0, 0);
  if (S && S.pileFade > 0) { g.globalAlpha = S.pileFade; g.drawImage(tables[1 - ti], 0, 0); g.globalAlpha = 1; }
}
function draw() {
  g.setTransform(RES, 0, 0, RES, 0, 0);
  if (!ext) makeBase(); g.drawImage(ext, 0, 0); // the table above and below the game, and under a moving camera
  g.setTransform(RES, 0, 0, RES, 0, OFF * RES);
  if (shake > 0 && !reduced()) { const k = shake * shake * 10; g.translate((R() - 0.5) * k, (R() - 0.5) * k); }
  if (cineCamera()) g.drawImage(ext, 0, -OFF); // a camera off centre shows past the game's edges
  drawBack();
  if (!S) return;
  if (S.k === 'bath') drawBath();
  else if (isMake(S.k)) { paint(S.soap); drawMake(g, S); }
  else drawWork();
  fx.draw(g);
  if (S.k !== 'bath' && view === 'play') { drawRibbon(); drawTool(); }
  g.setTransform(RES, 0, 0, RES, 0, OFF * RES);
  cineVignette();
  drawSpot();
  drawChrome();
  if (view === 'play') {
    if (S.k !== 'bath') drawRing();
    drawCharm(); drawPerfect();
    if (checkShown()) drawCheck();
    if (trayShown()) drawTray();
    if (handShown()) drawHand();
    if (S.k === 'bath') drawResult();
  } else if (view === 'gift') drawGift();
  else drawShelf();
  drawSpotTop();
  for (const c of coinsFlying) { if (c.t < 0) continue; const k = ease(c.t / 0.7), [tx, ty] = [rtl() ? mx(16, 216) + 180 : 52, 64 - OFF]; coinIcon(c.x + (tx - c.x) * k, c.y + (ty - c.y) * k - Math.sin(k * Math.PI) * 120, 22); }
}
function drawWork() {
  const b = cfg.bar, k = S.enter > 0 ? back3(1 - S.enter / 0.7) : 1, oy = (1 - k) * -700;
  if (paint(S.soap) > 0 && DEBUG) window.__painted = (window.__painted || 0) + 1;
  g.drawImage(S.soap.canvas, b.x - cfg.margin, b.y - cfg.margin + oy);
  if (S.glitCount) g.drawImage(S.glitLayer, b.x - cfg.margin, b.y - cfg.margin + oy);
  const gw = wiggle && wiggle.k === 'gemsfull' ? Math.sin(wiggle.t * 40) * 5 : 0;
  for (const gm of S.gems) { const s = 62 * popIn(gm.t) + gw; g.fillStyle = 'rgba(92,52,70,0.25)'; g.beginPath(); g.ellipse(b.x + gm.x + 4, b.y + gm.y + 8, s * 0.4, s * 0.22, 0, 0, TAU); g.fill(); if (!drawCellAt(g, 'gems_sheet', gemCell(gm.id), b.x + gm.x, b.y + gm.y + oy, s, 62)) { glossDisc(g, b.x + gm.x, b.y + gm.y, s / 2.4, '#FF4D6D'); } }
  if (S.k === 'carve' && !S.order.free) drawOutline(oy);
  if (S.k === 'smooth' && S.spots) { // chalky dust that pulses where the edge is still rough
    for (const [x, y, ph] of S.spots) { const a = 0.45 + 0.4 * Math.sin(S.t * 5 + ph * 6); g.fillStyle = `rgba(255,255,255,${a})`; g.fillRect(b.x + x - 2, b.y + y - 2, 4, 4); }
  }
  const sa = S.stampAnim; // the stamp lifting off after a press
  if (sa && sa.t < 0.45) { const k = Math.max(0, (sa.t - 0.1) / 0.35); stampTool(sa.x, sa.y, sa.shape, 1 - k * 0.3, k * 60); } // pressed for a beat, then lifted
}
/** "Perfect pour!" and the carving praise, at eye level. */
function drawPerfect() {
  const a = perfectAge(S); if (a >= 0 && a < 1.3 && isMake(S.k)) banner(T('perfect'), 360, 470, 44, 560, '#1E9E5A', popIn(a));
  const p = S.praise; if (p && p.t < 1.1 && S.k === 'carve') { g.globalAlpha = Math.min(1, (1.1 - p.t) * 4); banner(T(p.key), 360, 470, 44, 560, '#1E9E5A', popIn(p.t)); g.globalAlpha = 1; }
}
/** A rubber stamp: a wooden knob, a pink base and the picture it presses. */
function stampTool(x, y, shape, a = 1, lift = 0) {
  g.save(); g.globalAlpha = a;
  const sh = 1 - Math.min(1, lift / 60) * 0.5; // the shadow shrinks as the stamp rises off the soap
  g.fillStyle = `rgba(92,52,70,${0.22 * sh})`; g.beginPath(); g.ellipse(x + 6, y + 10, 48 * sh + 10, 22 * sh + 6, 0, 0, TAU); g.fill();
  y -= lift;
  g.fillStyle = '#FF8FC0'; roundRect(g, x - 44, y - 22, 88, 44, 14); g.fill(); g.lineWidth = 4; g.strokeStyle = '#FFFFFF'; g.stroke(); // the face, centred on (x, y)
  g.fillStyle = '#E7B377'; g.beginPath(); g.ellipse(x, y - 46, 26, 30, 0, 0, TAU); g.fill(); g.strokeStyle = '#FFFFFF'; g.stroke();
  g.fillStyle = 'rgba(255,255,255,0.5)'; g.beginPath(); g.ellipse(x - 8, y - 56, 8, 10, -0.4, 0, TAU); g.fill();
  g.save(); g.translate(x - 16, y - 16); g.scale(0.32, 0.32); g.fillStyle = '#FFFFFF'; g.fill(pathOf(shape)); g.restore();
  g.restore();
}
/** A charm that just came out: it jumps up shining, then flies to the shelf button. Drawn above the HUD. */
function drawCharm() {
  const c = S.charm; if (!c || c.state !== 'out' || c.t > 2) return;
  const b = cfg.bar, t = c.t, home = SHELFB(), fly = Math.max(0, ease((t - 1.4) / 0.6)), sx = b.x + c.x, sy = b.y + c.y - Math.min(1, t * 3) * 60;
  const x = sx + (home.x + 46 - sx) * fly, y = sy + (home.y + 46 - sy) * fly, s = t < 1.4 ? 130 * popIn(t) * (1 + Math.sin(t * 8) * 0.05) : 130 * (1 - fly * 0.65);
  if (t < 1.4) rays(g, sx, sy, 130, t, 0.75);
  if (!drawCellAt(g, 'charms_sheet', c.id, x, y, s, 130)) glossDisc(g, x, y, s / 2.2, '#FFD23F');
  if (t > 0.15 && t < 1.4) banner(T('charm'), 360, Math.max(470, sy - 120), 38, 560, PLUM, popIn(t - 0.15));
}
function drawOutline(oy) {
  const f = S.fit, b = cfg.bar;
  g.save(); g.translate(b.x + f.ox, b.y + f.oy + oy); g.scale(f.s, f.s);
  const lw = 1 / f.s, p = pathOf(S.order.shape);
  g.lineJoin = 'round'; g.lineCap = 'round';
  g.strokeStyle = 'rgba(255,255,255,0.85)'; g.lineWidth = 10 * lw; g.stroke(p);
  g.setLineDash([14 * lw, 11 * lw]); g.lineDashOffset = -S.t * 30 * lw; g.strokeStyle = PLUM; g.lineWidth = 5 * lw; g.stroke(p);
  g.restore(); g.setLineDash([]);
}
// ---------- tools: each is drawn from the point where it works ----------
/** Points measured on the painted tools (fractions of the sprite's box): the knife's tip and heel, the shaker's mouth. */
const KNIFE = { cell: 0, size: 150, tip: [0.98, 0.01], heel: [0.04, 0.93] }, SHAKER = { cell: 2, size: 112, mouth: [0.484, 0.0] }, MOUTH_UP = 40;
/** Offset of a tools-sheet point (u, v) from the centre of the cell drawn at size s. */
function cellOffset(cell, s, u, v) { const [, , bw, bh] = cfg.sprites.tools_sheet.cells[cell], k = s / Math.max(bw, bh); return [(u - 0.5) * bw * k, (v - 0.5) * bh * k]; }
/** Draw a tool so its point (u, v) lands exactly on (x, y), turned by rot around that point. False while loading. */
function drawAnchored(gc, cell, s, u, v, x, y, rot, sx = 1, sy = 1) {
  const c = cellCanvas('tools_sheet', cell, s); if (!c) return false;
  const [ox, oy] = cellOffset(cell, s, u, v);
  gc.save(); gc.translate(x, y); gc.rotate(rot); gc.scale(sx, sy); gc.drawImage(c, -c.width / 2 - ox, -c.height / 2 - oy); gc.restore(); return true;
}
/** The knife with its tip on the cut point (x, y); it leans a little with the stroke. */
function drawKnife(gc, x, y, lean) {
  if (!drawAnchored(gc, KNIFE.cell, KNIFE.size, KNIFE.tip[0], KNIFE.tip[1], x, y, lean)) { gc.strokeStyle = '#C0C8D8'; gc.lineWidth = 10; gc.beginPath(); gc.moveTo(x, y); gc.lineTo(x - 60, y + 60); gc.stroke(); }
}
/** The glitter shaker upside down, its mouth MOUTH_UP above the spot (x, y) the glitter falls on; wob shakes it. */
function drawShaker(gc, x, y, wob) {
  if (!drawAnchored(gc, SHAKER.cell, SHAKER.size, SHAKER.mouth[0], SHAKER.mouth[1], x, y - MOUTH_UP, Math.PI * 0.86 + wob)) glossDisc(gc, x, y - MOUTH_UP - 34, 34, '#FF9CC8');
}
function drawTool() {
  let x, y;
  if (pen) { x = pen.x; y = pen.y; }
  else if (handShown()) { const h = handAt(); x = h[0]; y = h[1]; }
  else return;
  if (isMake(S.k)) { if (pen) drawMakeTool(g, S, x, y); return; }
  if (S.k === 'stamp') { const st = cfg.stamps[S.stampSel] || cfg.stamps[0]; if (!S.stampAnim || S.stampAnim.t >= 0.45) stampTool(x, y, st.shape); return; }
  if (S.k === 'carve') drawKnife(g, x, y, S.lean || 0);
  else if (S.k === 'smooth') { // the sponge squashes along the way it is rubbed
    const v = Math.min(1, (S.rub || 0) / 1500), a = S.rubDir || 0;
    g.save(); g.translate(x, y); g.rotate(a); g.scale(1 + 0.14 * v, 1 - 0.12 * v); g.rotate(-a - 0.2);
    if (!drawCell(g, 'tools_sheet', 1, 0, 0, 118)) glossDisc(g, 0, 0, 44, '#FFE066');
    g.restore();
  } else if (S.k === 'sparkle' && S.gemSel < 0) drawShaker(g, x, y, pen ? Math.sin(S.t * 28) * 0.18 : 0);
}
function coinIcon(x, y, r) {
  const gr = g.createRadialGradient(x - r * 0.3, y - r * 0.4, r * 0.1, x, y, r); gr.addColorStop(0, '#FFF6B0'); gr.addColorStop(0.6, '#FFC928'); gr.addColorStop(1, '#E59A00');
  g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); g.lineWidth = Math.max(2, r * 0.12); g.strokeStyle = '#FFFFFF'; g.stroke();
  starPath(x, y + r * 0.04, r * 0.55); g.fillStyle = '#FFF3B8'; g.fill();
}
function starPath(x, y, r) { g.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, k = i % 2 ? r * 0.46 : r; g.lineTo(x + Math.cos(a) * k, y + Math.sin(a) * k); } g.closePath(); }
function iconSound(x, y, s, muted) {
  g.fillStyle = PLUM; g.beginPath(); g.moveTo(x - s * 0.32, y - s * 0.12); g.lineTo(x - s * 0.14, y - s * 0.12); g.lineTo(x + s * 0.08, y - s * 0.3); g.lineTo(x + s * 0.08, y + s * 0.3); g.lineTo(x - s * 0.14, y + s * 0.12); g.lineTo(x - s * 0.32, y + s * 0.12); g.closePath(); g.fill();
  g.strokeStyle = PLUM; g.lineWidth = s * 0.07; g.lineCap = 'round';
  if (muted) { g.strokeStyle = '#FF3D6E'; g.beginPath(); g.moveTo(x + s * 0.18, y - s * 0.16); g.lineTo(x + s * 0.4, y + s * 0.16); g.moveTo(x + s * 0.4, y - s * 0.16); g.lineTo(x + s * 0.18, y + s * 0.16); g.stroke(); }
  else { g.beginPath(); g.arc(x + s * 0.1, y, s * 0.18, -0.9, 0.9); g.stroke(); g.beginPath(); g.arc(x + s * 0.1, y, s * 0.32, -0.9, 0.9); g.stroke(); }
}
function iconShelf(x, y, s) {
  g.fillStyle = '#C98A4B'; roundRect(g, x - s * 0.38, y + s * 0.14, s * 0.76, s * 0.1, 3); g.fill();
  const cols = ['#FF9EC4', '#8FE8C8', '#FFD27A'];
  for (let i = 0; i < 3; i++) { g.fillStyle = cols[i]; roundRect(g, x - s * 0.34 + i * s * 0.24, y - s * 0.16 - (i === 1 ? s * 0.08 : 0), s * 0.2, s * 0.3 + (i === 1 ? s * 0.08 : 0), s * 0.06); g.fill(); g.fillStyle = 'rgba(255,255,255,0.6)'; g.fillRect(x - s * 0.31 + i * s * 0.24, y - s * 0.12 - (i === 1 ? s * 0.08 : 0), s * 0.05, s * 0.12); }
}
function iconX(x, y, s) { g.strokeStyle = PLUM; g.lineWidth = s * 0.12; g.lineCap = 'round'; g.beginPath(); g.moveTo(x - s * 0.22, y - s * 0.22); g.lineTo(x + s * 0.22, y + s * 0.22); g.moveTo(x + s * 0.22, y - s * 0.22); g.lineTo(x - s * 0.22, y + s * 0.22); g.stroke(); }
function iconGlobe(x, y, r) {
  g.fillStyle = '#3EC5FF'; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); g.strokeStyle = '#FFFFFF'; g.lineWidth = 3; g.stroke();
  g.beginPath(); g.ellipse(x, y, r * 0.45, r, 0, 0, TAU); g.moveTo(x - r, y); g.lineTo(x + r, y); g.stroke();
}
function lock(x, y, s) {
  g.fillStyle = '#FFFFFF'; g.strokeStyle = PLUM; g.lineWidth = s * 0.12;
  g.beginPath(); g.arc(x, y - s * 0.12, s * 0.24, Math.PI, 0); g.stroke();
  roundRect(g, x - s * 0.36, y - s * 0.12, s * 0.72, s * 0.56, s * 0.1); g.fillStyle = '#FFC928'; g.fill(); g.lineWidth = 3; g.strokeStyle = '#FFFFFF'; g.stroke();
}
function disc(b, draw) { const r = b.s / 2; glossDisc(g, b.x + r, b.y + r, r, '#FFFFFF', '#FF9CC8'); draw(b.x + r, b.y + r, b.s); }
function drawHud() {
  const x = mx(16, 216), wig = coinShake > 0 ? Math.sin(coinShake * 60) * 6 : 0, pop = 1 + coinPulse * 0.12;
  g.save(); g.translate(x + 108 + wig, 64 - OFF); g.scale(pop, pop);
  glossPill(g, -108, -48, 216, 96, '#FFFFFF', '#FFC94D'); coinIcon(rtl() ? 72 : -72, 0, 28);
  g.direction = 'ltr'; g.font = `800 42px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = PLUM; g.fillText(String(Math.floor(coinShown)), rtl() ? -22 : 22, 4);
  g.restore();
  disc(MUTE(), (cx, cy, s) => iconSound(cx, cy, s * 0.7, save.muted));
  if (view !== 'gift') disc(SHELFB(), (cx, cy, s) => (view === 'play' ? iconShelf(cx, cy, s * 0.8) : iconX(cx, cy, s * 0.8)));
  if (view === 'play') { // how close the next gift box is
    const gb = GIFTB(), k = giftDots(); glossPill(g, gb.x, gb.y, gb.w, gb.h, '#FFFFFF', '#FF9CC8'); giftIcon(rtl() ? gb.x + gb.w - 44 : gb.x + 44, gb.y + gb.h / 2, 24, 0);
    for (let i = 0; i < cfg.giftEvery; i++) { const dx = rtl() ? gb.x + gb.w - 100 - i * 44 : gb.x + 100 + i * 44; g.fillStyle = i < k ? PINK : 'rgba(74,35,102,0.18)'; g.beginPath(); g.arc(dx, gb.y + gb.h / 2, 13, 0, TAU); g.fill(); }
  }
  if (view === 'play' && save.shelf.length && S.k === 'bath' && S.reveal && S.reveal.t > 3.5) { const b = SHELFB(); g.fillStyle = PINK; g.beginPath(); g.arc(b.x + b.s - 10, b.y + 12, 13, 0, TAU); g.fill(); }
}
/** HUD, step row, prompt and order card: drawn into one layer, again only when what they show changes. */
function drawChrome() {
  const live = S.enter > 0 || S.oopsT < 1.1 || S.t - (S.promptAt || 0) < 0.4 || coinPulse > 0 || wiggle || coinsFlying.length || view !== 'play' || S.k === 'bath';
  const key = [lang, view, S.n, S.k, !!S.trim, S.mood, Math.floor(coinShown), save.muted, S.gemSel >= 0, S.promptKey, save.shelf.length, save.n, save.giftDue, loadedN(), document.fonts ? document.fonts.status : ''].join('|'); // a sprite that arrives redraws the layer
  drawHud(); // the top row sits at the screen edge, outside the cached layer
  if (live) { if (view === 'play' && S.k !== 'bath') { drawSteps(); drawPrompt(); drawOrder(); } chromeKey = ''; return; }
  if (key !== chromeKey) {
    chromeKey = key;
    if (!chrome) { chrome = document.createElement('canvas'); chrome.width = W; chrome.height = 420; }
    const keep = g; g = chrome.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, W, 420);
    drawSteps(); drawPrompt(); drawOrder();
    g = keep;
  }
  g.drawImage(chrome, 0, 0);
}
/** The progress ring around the current step, drawn every frame over the cached step row. */
function drawRing() {
  if (S.trim || S.enter > 0) return;
  const [x, y] = stepPos(S.k), r = phaseList().length > 5 ? 34 : 40;
  const k = isMake(S.k) ? makeProgress(S) : S.k === 'carve' ? carvedShare(S.soap) / cfg.carveDone : S.k === 'smooth' ? (1 - S.rough) / (1 - cfg.smoothDone) : S.k === 'stamp' ? S.stamps.length / cfg.stampMax : Math.min(1, S.glitCount / 400 + S.gems.length / 3);
  g.strokeStyle = GREEN; g.lineWidth = 7; g.lineCap = 'round'; g.beginPath(); g.arc(x, y, r + 7, -Math.PI / 2, -Math.PI / 2 + TAU * Math.max(0.02, Math.min(1, k)) * (rtl() ? -1 : 1), rtl()); g.stroke();
}
function drawSteps() {
  const list = phaseList(), cur = list.indexOf(S.trim ? 'carve' : S.k), big = list.length > 5 ? 34 : 40, small = list.length > 5 ? 26 : 32;
  const a = stepPos(list[0]), z = stepPos(list[list.length - 1]);
  g.strokeStyle = 'rgba(255,255,255,0.85)'; g.lineWidth = 8; g.beginPath(); g.moveTo(a[0], 160); g.lineTo(z[0], 160); g.stroke();
  list.forEach((k, i) => {
    const [x, y] = stepPos(k), on = i === cur, doneI = i < cur, r = on ? big : small;
    glossDisc(g, x, y, r, doneI ? '#7BE495' : on ? '#FFFFFF' : '#F4E9FF', on ? '#FF5FA2' : '#FFFFFF');
    stepIcon(k, x, y, r);
  });
}
/** The picture on a step's button: the painted tool where there is one, else a small drawing. */
function stepIcon(k, x, y, r) {
  if (k in TOOL_CELL && drawCell(g, 'tools_sheet', TOOL_CELL[k], x, y, r * 1.5)) return;
  if (k === 'bath') { if (!drawBowl(g, x, y, r * 1.6)) glossDisc(g, x, y, r * 0.6, '#7FD6FF'); return; }
  const s = r * 0.62;
  g.save(); g.translate(x, y); g.lineCap = 'round'; g.lineJoin = 'round';
  if (k === 'chop') { g.fillStyle = '#FFFFFF'; roundRect(g, -s * 0.7, -s * 0.5, s * 1.1, s * 1.1, s * 0.2); g.fill(); g.strokeStyle = '#A9B4D0'; g.lineWidth = 3; g.stroke(); g.strokeStyle = '#8C93A8'; g.lineWidth = 5; g.beginPath(); g.moveTo(s * 0.2, -s); g.lineTo(s * 0.9, s * 0.3); g.stroke(); }
  else if (k === 'color') { g.fillStyle = '#FF5FA2'; g.beginPath(); g.moveTo(0, -s); g.quadraticCurveTo(s * 0.8, 0, s * 0.6, s * 0.4); g.arc(0, s * 0.35, s * 0.6, 0, Math.PI); g.quadraticCurveTo(-s * 0.8, 0, 0, -s); g.fill(); }
  else if (k === 'stir') { g.strokeStyle = '#3EC5FF'; g.lineWidth = 5; g.beginPath(); g.arc(0, s * 0.1, s * 0.75, 0.3, 5.6); g.stroke(); g.strokeStyle = '#DDA463'; g.lineWidth = 6; g.beginPath(); g.moveTo(-s * 0.2, s * 0.2); g.lineTo(s * 0.8, -s * 0.9); g.stroke(); }
  else if (k === 'scent') { for (let i = 0; i < 5; i++) { const a = i * TAU / 5; g.fillStyle = '#B57BFF'; g.beginPath(); g.arc(Math.cos(a) * s * 0.5, Math.sin(a) * s * 0.5, s * 0.38, 0, TAU); g.fill(); } g.fillStyle = '#FFD23F'; g.beginPath(); g.arc(0, 0, s * 0.3, 0, TAU); g.fill(); }
  else if (k === 'pour') { g.fillStyle = '#4FD1B0'; g.beginPath(); g.arc(-s * 0.2, -s * 0.2, s * 0.6, 0, TAU); g.fill(); g.fillStyle = '#FF9EC4'; roundRect(g, -s * 0.2, s * 0.25, s * 1.1, s * 0.6, s * 0.2); g.fill(); g.strokeStyle = '#FF9EC4'; g.lineWidth = 5; g.beginPath(); g.moveTo(s * 0.35, -s * 0.1); g.lineTo(s * 0.4, s * 0.3); g.stroke(); }
  else if (k === 'cool') { g.strokeStyle = '#3EC5FF'; g.lineWidth = 5; for (let i = 0; i < 3; i++) { g.rotate(Math.PI / 3); g.beginPath(); g.moveTo(-s * 0.85, 0); g.lineTo(s * 0.85, 0); g.stroke(); } }
  else if (k === 'pop') { g.fillStyle = '#FF9EC4'; roundRect(g, -s * 0.8, -s * 0.1, s * 1.6, s * 0.9, s * 0.2); g.fill(); g.strokeStyle = '#4A2366'; g.lineWidth = 5; g.beginPath(); g.moveTo(0, s * 0.3); g.lineTo(0, -s * 0.9); g.moveTo(-s * 0.35, -s * 0.55); g.lineTo(0, -s * 0.9); g.lineTo(s * 0.35, -s * 0.55); g.stroke(); }
  else if (k === 'stamp') { g.fillStyle = '#E7B377'; g.beginPath(); g.arc(0, -s * 0.45, s * 0.42, 0, TAU); g.fill(); g.fillStyle = '#FF8FC0'; roundRect(g, -s * 0.8, -s * 0.05, s * 1.6, s * 0.75, s * 0.2); g.fill(); }
  g.restore();
}
/** A wrapped gift box; hit (0..) squashes it after a tap. */
function giftIcon(x, y, r, hit) {
  const sq = hit < 0.25 ? 1 + Math.sin(hit / 0.25 * Math.PI) * 0.15 : 1;
  g.save(); g.translate(x, y); g.scale(1 / sq, sq);
  if (drawCellAt(g, 'gift_box', 0, 0, -r * 0.1, r * 2.5, r > 60 ? 380 : 60)) { g.restore(); return; } // the painted box; drawn in code until it arrives
  g.fillStyle = 'rgba(92,52,70,0.2)'; roundRect(g, -r + 4, -r * 0.6 + 8, r * 2, r * 1.6, r * 0.2); g.fill();
  g.fillStyle = '#FF5FA2'; roundRect(g, -r, -r * 0.6, r * 2, r * 1.6, r * 0.2); g.fill();
  g.fillStyle = '#FF86BC'; roundRect(g, -r * 1.1, -r * 0.85, r * 2.2, r * 0.5, r * 0.15); g.fill();
  g.fillStyle = '#FFD23F'; g.fillRect(-r * 0.18, -r * 0.85, r * 0.36, r * 1.85);
  g.beginPath(); g.ellipse(-r * 0.35, -r * 1.0, r * 0.35, r * 0.22, -0.5, 0, TAU); g.ellipse(r * 0.35, -r * 1.0, r * 0.35, r * 0.22, 0.5, 0, TAU); g.fill();
  g.fillStyle = 'rgba(255,255,255,0.45)'; roundRect(g, -r * 0.85, -r * 0.45, r * 0.3, r * 1.1, r * 0.1); g.fill();
  g.restore();
}
/** The gift screen: tap the box three times; it bursts open and shows what it held. */
function drawGift() {
  g.fillStyle = 'rgba(74,35,102,0.55)'; g.fillRect(0, -OFF, W, HV);
  const gf = gift, it = gf.item;
  rays(g, 360, 620, 460, S.t, gf.open >= 0 ? 0.85 : 0.35);
  if (gf.open < 0) {
    const wob = Math.sin(S.t * 10) * (0.04 + gf.taps * 0.03);
    g.save(); g.translate(360, 640); g.rotate(wob); g.translate(-360, -640); giftIcon(360, 660, 150, gf.hit ?? 1); g.restore();
    banner(T('gift'), 360, 330, 44, 600, PLUM, popIn(gf.t));
    for (let i = 0; i < 3; i++) { g.fillStyle = i < gf.taps ? '#FFD23F' : 'rgba(255,255,255,0.5)'; g.beginPath(); g.arc(300 + i * 60, 920, 16, 0, TAU); g.fill(); }
    if (gf.t > 1.2) { const k = (gf.t % 1) ; g.strokeStyle = `rgba(255,255,255,${1 - k})`; g.lineWidth = 8; g.beginPath(); g.arc(360, 650, 170 + k * 60, 0, TAU); g.stroke(); } // a pulse that says: tap me
    return;
  }
  const k = ease(gf.open / 0.5), s = 70 + 130 * popIn(gf.open);
  g.save(); g.globalAlpha = 1 - k; giftIcon(360, 660 + k * 200, 150, 1); g.restore();
  if (it.k === 'coins') { coinIcon(360, 620, s * 0.6); words('+' + it.n, 360, 780, 64, 400, '#FFFFFF', PLUM); }
  else if (it.k === 'marbles') { const th = cellCanvasMarble(MARBLE(it.id)); g.save(); g.beginPath(); g.arc(360, 620, s * 0.7, 0, TAU); g.clip(); g.drawImage(th, 360 - s * 0.7, 620 - s * 0.7, s * 1.4, s * 1.4); g.restore(); }
  else if (it.k === 'glitters') { glossDisc(g, 360, 620, s * 0.6, cfg.glitters.find((x) => x.id === it.id).c); }
  else if (it.k === 'gems') { if (!drawCellAt(g, 'gems_sheet', gemCell(it.id), 360, 620, s * 1.2, 160)) glossDisc(g, 360, 620, s * 0.5, '#FF4D6D'); }
  else if (it.k === 'stamps') { // the stamp's picture, big, as it shows in the tray
    glossDisc(g, 360, 620, s * 0.62, '#FFE3EF'); const k = s * 1.0 / 100;
    g.save(); g.translate(360 - 50 * k, 620 - 50 * k); g.scale(k, k); g.fillStyle = '#FF5FA2'; g.fill(pathOf(cfg.stamps.find((x) => x.id === it.id).shape)); g.restore();
  }
  banner(T('new'), 360, 400, 52, 400, '#FFFFFF', popIn(gf.open), PINK);
}
function drawPrompt() {
  const key = S.trim ? 'carve' : S.k, age = S.t - (S.promptAt || 0);
  if (S.promptKey !== key) { S.promptKey = key; S.promptAt = S.t; }
  const oops = S.oopsT < 1.1, txt = oops ? T('oops') : T(key === 'carve' && S.order.free ? 'carveFree' : key), cx = mx(244);
  banner(txt, cx, 248 + (oops ? Math.sin(S.oopsT * 30) * 3 : 0), 36, 380, oops ? '#E0245E' : PLUM, popIn(oops ? S.oopsT : age), '#FFFFFF', 440); // one fixed pill: its left edge is the skip's
  const sk = !!spotRect(), bx = sk ? mx(300) : cx, bw = sk ? 268 : 380; // second row: beside the skip when it shows
  if (S.order.golden && (S.k === 'carve' || isMake(S.k))) banner(T('golden'), bx, 344, 28, bw - 60, '#B87400', 1, '#FFF4C2', bw);
  else if (S.k === 'sparkle' && S.gemSel >= 0) banner(T('gem'), bx, 344, 28, bw - 60, PLUM, 1, '#FFFFFF', bw);
}
function drawOrder() {
  const o = ORDER(), k = S.enter > 0 ? back3(1 - S.enter / 0.7) : 1, ox = (1 - k) * (rtl() ? -320 : 320);
  g.save(); g.translate(ox, 0);
  panel(g, o.x, o.y, o.w, o.h, 30);
  const face = cellCanvas('customer_' + S.order.customer, MOOD[S.mood] ?? 0, 124);
  const px = rtl() ? o.x + o.w - 70 : o.x + 70;
  if (face) { g.save(); roundRect(g, px - 58, o.y + 12, 116, 116, 22); g.clip(); g.drawImage(face, Math.round(px - face.width / 2), o.y + 10); g.restore(); }
  else glossDisc(g, px, o.y + 70, 50, '#FFD9C2');
  // what they want: the shape in the soap's colour
  const sx = rtl() ? o.x + 48 : o.x + o.w - 48, sy = o.y + 70, mb = MARBLE(S.order.marble);
  g.save(); g.translate(sx - 32, sy - 32); g.scale(0.64, 0.64); g.fillStyle = mb.kind === 'layers' ? '#FFB3E0' : mb.base; g.fill(pathOf(S.order.shape)); g.lineWidth = 5; g.strokeStyle = '#FFFFFF'; g.stroke(pathOf(S.order.shape)); g.restore();
  // reward and wishes
  const ry = o.y + o.h - 26; coinIcon(px - 28, ry, 18);
  g.font = `800 30px ${FONT}`; g.fillStyle = PLUM; g.textAlign = 'left'; g.textBaseline = 'middle'; g.direction = 'ltr'; g.fillText(String(S.order.free ? cfg.coinPerStar : cfg.coinPerStar * 3 * (S.order.golden ? 2 : 1)), px - 4, ry + 2);
  let wx = sx - 26;
  if (S.order.glitter) { const gl = cfg.glitters.find((x) => x.id === S.order.glitter); glossDisc(g, wx, ry, 17, gl.c); wx += 44; }
  if (S.order.gem) { drawCell(g, 'gems_sheet', gemCell(S.order.gem), wx, ry, 38); wx += 44; }
  if (S.order.stamp) { g.save(); g.translate(wx - 15, ry - 15); g.scale(0.3, 0.3); g.fillStyle = '#FF8FC0'; g.fill(pathOf(cfg.stamps.find((x) => x.id === S.order.stamp).shape)); g.restore(); }
  if (S.order.charm !== null && !S.order.free) { g.fillStyle = PINK; words('?', sx + 26, o.y + 26, 30, 40, '#FFFFFF', PINK); }
  if (S.winterNew) banner(T('new'), sx, o.y + 118, 22, 80, '#FFFFFF', 1, PINK);
  g.restore();
}
function drawCheck() { const b = CHECK(), r = b.s / 2, p = 1 + Math.sin(S.t * 6) * 0.05; g.save(); g.translate(b.x + r, b.y + r); g.scale(p, p); glossDisc(g, 0, 0, r, GREEN); g.strokeStyle = '#FFFFFF'; g.lineWidth = 12; g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath(); g.moveTo(-r * 0.36, 0); g.lineTo(-r * 0.08, r * 0.28); g.lineTo(r * 0.4, -r * 0.3); g.stroke(); g.restore(); }
function drawTray() {
  panel(g, 14, 908, 692, 180, 34);
  if (makeTray(S.k)) return drawMakeTray(g, S);
  const rows = trayItems();
  for (let row = 0; row < 2; row++) for (const it of rows[row]) {
    const shakeIt = wiggle && (wiggle.k === it.k + it.id || (wiggle.k === 'stampsfull' && it.k === 'stamps'));
    const [x, y0] = slotXY(row, it.j), y = it.k === 'stamps' ? 998 : y0, wig = shakeIt ? Math.sin(wiggle.t * 40) * 6 : 0; // one row of stamps sits in the middle
    const sel = it.k === 'stamps' ? S.stampSel === it.j : row === 0 ? S.gemSel < 0 && S.glitSel === it.j : S.gemSel === it.j;
    if (sel) { g.fillStyle = 'rgba(255,95,162,0.25)'; g.beginPath(); g.arc(x, y, 50, 0, TAU); g.fill(); g.strokeStyle = PINK; g.lineWidth = 5; g.stroke(); }
    if (it.k === 'stamps') { glossDisc(g, x + wig, y, 40, '#FFE3EF'); g.save(); g.translate(x + wig - 26, y - 26); g.scale(0.52, 0.52); g.fillStyle = '#FF5FA2'; g.fill(pathOf(cfg.stamps[it.j].shape)); g.restore(); }
    else if (row === 0) { glossDisc(g, x + wig, y, 34, cfg.glitters[it.j].c, '#FFFFFF'); for (let k = 0; k < 5; k++) { g.fillStyle = 'rgba(255,255,255,0.9)'; g.fillRect(x + wig - 14 + ((k * 37) % 28), y - 10 + ((k * 23) % 22), 3, 3); } }
    else if (!drawCell(g, 'gems_sheet', cfg.gems[it.j].cell, x + wig, y, 70)) glossDisc(g, x + wig, y, 30, '#FF4D6D');
    if (it.locked) { g.fillStyle = 'rgba(255,255,255,0.55)'; g.beginPath(); g.arc(x, y, 40, 0, TAU); g.fill(); lock(x + 22, y - 18, 30); priceTag(x, y + 32); }
  }
}
function priceTag(x, y) { glossPill(g, x - 40, y - 15, 80, 30, '#FFFFFF', '#FFC94D'); coinIcon(x - 22, y, 11); g.font = `800 20px ${FONT}`; g.fillStyle = PLUM; g.textAlign = 'center'; g.textBaseline = 'middle'; g.direction = 'ltr'; g.fillText(String(price()), x + 10, y + 1); }

// ---------- helper hand ----------
const handShown = () => mode === 'play' && view === 'play' && S.k !== 'bath' && S.enter <= 0 && !S.trim && !pen && ((!S.stepUsed && !save.learned.includes(S.k)) || S.idle > cfg.idleHand);
/** Where the hand is now: it acts out the current step's gesture on a loop. */
/** Points just outside the shape's line, in order round it, on the stretch that still has soap (null: none left). */
function traceOf(S) {
  const sp = S.soap, off = cfg.knifeR + 10;
  if (!S.trace) {
    const pts = []; let cx = 0, cy = 0;
    for (let y = 4; y < sp.h - 4; y += 4) for (let x = 4; x < sp.w - 4; x += 4) { const d = sp.sd[y * sp.w + x]; if (Math.abs(d + off) < 2.5) { pts.push([x, y]); cx += x; cy += y; } }
    if (!pts.length) return (S.trace = []), null;
    cx /= pts.length; cy /= pts.length;
    S.trace = pts.map(([x, y]) => [x, y, (Math.atan2(y - cy, x - cx) + Math.PI * 2.5) % (Math.PI * 2)]).sort((a, c) => a[2] - c[2]); // from the top, clockwise
  }
  const left = S.trace.filter(([x, y]) => sp.m[y * sp.w + x]);
  return left.length > 6 ? left.slice(0, Math.max(6, Math.round(S.trace.length * 0.35))) : null;
}
function handAt() {
  const b = cfg.bar, t = (S.t % 1.6) / 1.6, f = S.fit;
  if (isMake(S.k)) return makeHand(S, t);
  if (S.k === 'stamp') return [b.x + b.w / 2 + Math.sin(t * TAU) * 40, b.y + b.h * 0.45];
  if (S.k === 'carve') { // trace just outside the dashed line where soap is left, so the knife shows the cut
    const tr = traceOf(S);
    if (tr) { const p = tr[Math.min(tr.length - 1, Math.floor(ease(t) * tr.length))]; return [b.x + p[0], b.y + p[1]]; }
    let y = b.y + Math.max(24, f.oy * 0.5);
    for (let yy = 16; yy < b.h - 16; yy += 12) { const row = yy * b.w; let n = 0; for (let x = 10; x < b.w - 10; x += 8) if (S.soap.m[row + x] && S.soap.sd[row + x] < -cfg.knifeR) n++; if (n > 6) { y = b.y + yy; break; } }
    return [b.x + 30 + (b.w - 60) * ease(t), y];
  }
  if (S.k === 'smooth' && S.spotC) { const a = Math.sin(t * TAU * 2); return [b.x + S.spotC[0] + a * 30, b.y + S.spotC[1] + Math.cos(t * TAU) * 20]; } // rub where it is still rough
  if (S.k === 'smooth') { const a = Math.sin(t * TAU * 2), y = b.y + f.oy + 30 * f.s; return [b.x + f.ox + 10 * f.s + a * 26, y + Math.cos(t * TAU) * 20]; }
  const [x, y] = [b.x + b.w / 2 + Math.sin(t * TAU) * 60, b.y + b.h * 0.42];
  return [x, y];
}
function drawHand() {
  const [x, y] = handAt(), press = S.k === 'carve' || S.k === 'smooth' || S.k === 'stir' || S.k === 'cool' || S.k === 'pour' || ((S.t % 1.6) / 1.6 > 0.5);
  g.save(); g.translate(x, y + (S.k === 'carve' || S.k === 'smooth' ? 56 : 0)); const k = press ? 0.92 : 1; g.scale(k, k); g.rotate(-0.35);
  g.beginPath(); g.moveTo(-12, 0); g.quadraticCurveTo(-14, -10, 0, -12); g.quadraticCurveTo(14, -10, 12, 0); g.lineTo(14, 56); g.quadraticCurveTo(40, 54, 44, 74); g.quadraticCurveTo(46, 120, 18, 132); g.lineTo(-22, 132); g.quadraticCurveTo(-44, 110, -40, 78); g.quadraticCurveTo(-34, 60, -12, 62); g.closePath();
  g.fillStyle = 'rgba(74,35,102,0.25)'; g.translate(5, 6); g.fill(); g.translate(-5, -6);
  g.fillStyle = '#FFFFFF'; g.fill(); g.lineWidth = 6; g.strokeStyle = PLUM; g.stroke();
  g.restore();
}

// ---------- bath and result ----------
function drawBath() {
  const rv = S.reveal, t = rv.t, rise = ease(t / 0.5), by = BOWL.y + (1 - rise) * 800;
  if (t > 2.4 && S.score.stars >= 2) rays(g, BOWL.x, by, 420, t, Math.min(0.7, (t - 2.4) * 1.5));
  g.fillStyle = 'rgba(92,52,70,0.22)'; g.beginPath(); g.ellipse(BOWL.x, by + BOWL.d * 0.46, BOWL.d * 0.42, 34, 0, 0, TAU); g.fill();
  if (!drawBowl(g, BOWL.x, by, BOWL.d)) { glossDisc(g, BOWL.x, by, BOWL.d / 2, '#FFFFFF'); glossDisc(g, BOWL.x, by, BOWL.d * 0.42, '#7FE0EA'); }
  const sm = rv.small, drop = ease((t - 0.1) / 0.45), bob = t > 0.55 ? Math.sin(t * 2.4) * 5 : 0, sc = t < 0.55 ? 1.35 - 0.35 * drop : 1 + Math.sin(Math.min(1, (t - 0.55) * 4) * Math.PI) * 0.04;
  const x = BOWL.x - sm.width * sc / 2, y = by - sm.height * sc / 2 - (1 - drop) * 420 + bob;
  if (t > 0.1) {
    if (sc !== 1) g.drawImage(sm, x, y, sm.width * sc, sm.height * sc); else g.drawImage(sm, Math.round(x), Math.round(y));
    if (t > 0.6) { // foam gathering around the soap where it meets the water
      const a = Math.min(1, (t - 0.6) * 1.2); g.globalAlpha = a;
      for (const [fx0, fy0, r0] of rv.foam) { const r = r0 * (0.6 + 0.4 * a) + Math.sin(t * 3 + fx0) * 1.5; g.fillStyle = 'rgba(255,255,255,0.85)'; g.beginPath(); g.arc(x + fx0, y + fy0, r, 0, TAU); g.fill(); g.strokeStyle = 'rgba(150,215,255,0.8)'; g.lineWidth = 1.5; g.stroke(); }
      g.globalAlpha = 1;
    }
  }
}
function drawResult() {
  const rv = S.reveal, t = rv.t;
  if (S.order.free) { if (t > 1) banner(T('love'), 360, 230, 44, 600, PLUM, popIn(t - 1)); }
  else {
    for (let i = 0; i < 3; i++) { const [x, y] = starXY(i), on = i < rv.stars, s = on ? 52 * popIn(t - 2.6 - i * 0.28) : 40; starPath(x, y, s); g.fillStyle = on ? '#FFD23F' : 'rgba(255,255,255,0.6)'; g.fill(); g.lineWidth = 6; g.strokeStyle = on ? '#FFFFFF' : 'rgba(74,35,102,0.25)'; g.stroke(); }
    if (t > 2.6 + rv.stars * 0.28) banner(T(['p1', 'p1', 'p2', 'p3'][S.score.stars]), 360, 290, 40, 600, PLUM, popIn(t - 2.6 - rv.stars * 0.28));
    if (S.tip && t > 3.4) { // a reason to come back: the first soap of a new day opens a gift box
      const p = popIn(t - 3.4); g.save(); g.translate(360, 372); g.scale(p, p); g.font = `800 28px ${FONT}`;
      const tw = Math.min(440, g.measureText(T('tomorrow')).width), w = tw + 110;
      glossPill(g, -w / 2, -32, w, 64, '#FFFFFF', '#FF9CC8'); giftIcon(rtl() ? w / 2 - 40 : -w / 2 + 40, 0, 20, 0); words(T('tomorrow'), rtl() ? -22 : 22, 2, 28, 440, PLUM);
      g.restore();
    }
  }
  // the customer and the three bars
  if (t > 0.9) {
    const k = ease((t - 0.9) / 0.4), y0 = 832 + (1 - k) * 300; // ends at 950, the button row starts below it
    panel(g, 20, y0, 680, 118, 30);
    const face = cellCanvas('customer_' + S.order.customer, MOOD[S.mood] ?? 0, 170), fxp = mx(24, 120);
    if (face) { g.save(); roundRect(g, fxp, y0 - 46, 120, 160, 24); g.clip(); g.drawImage(face, Math.round(fxp + 60 - face.width / 2), y0 - 50); g.restore(); } // the customer leans up out of the panel
    if (t > 1.2 && !S.order.free) { // what they say, in a bubble above their head (a free soap has its own banner)
      const say = T(S.score.stars >= 2 ? 'love' : 'thanks'), bx = rtl() ? fxp - 20 : fxp + 120, pop = popIn(t - 1.2);
      g.save(); g.translate(bx + (rtl() ? -110 : 110), y0 - 70); g.scale(pop, pop);
      g.font = `800 30px ${FONT}`; const bw = Math.min(300, g.measureText(say).width) + 44;
      glossPill(g, -bw / 2, -30, bw, 60, '#FFFFFF', '#FF9CC8'); g.fillStyle = '#FFFFFF'; g.beginPath(); g.moveTo(rtl() ? 40 : -40, 26); g.lineTo(rtl() ? 70 : -70, 50); g.lineTo(rtl() ? 16 : -16, 28); g.fill();
      words(say, 0, 2, 30, 300, PLUM); g.restore();
    }
    if (S.order.free) words(T('thanks'), 400, y0 + 60, 40, 480, PLUM);
    else {
      const vals = [S.score.shape, S.score.smooth, S.score.sparkle], keys = ['shape', 'smoothBar', 'sparkleBar'], cols = ['#FF5FA2', '#3EC5FF', '#FFC928'];
      for (let i = 0; i < 3; i++) {
        const by = y0 + 22 + i * 32, bx = mx(156, 524), fill = i < rv.bars ? ease((t - 1.1 - i * 0.45) / 0.4) * vals[i] : 0;
        g.textAlign = rtl() ? 'right' : 'left'; g.direction = rtl() ? 'rtl' : 'ltr'; g.font = `800 22px ${FONT}`; g.fillStyle = PLUM; g.textBaseline = 'middle';
        g.fillText(T(keys[i]), rtl() ? bx + 524 : bx, by + 2); g.direction = 'ltr';
        const tx = mx(270, 400);
        g.fillStyle = 'rgba(74,35,102,0.12)'; roundRect(g, tx, by - 10, 400, 22, 11); g.fill();
        if (fill > 0) { g.fillStyle = cols[i]; roundRect(g, rtl() ? tx + 400 - 400 * fill : tx, by - 10, Math.max(22, 400 * fill), 22, 11); g.fill(); g.fillStyle = 'rgba(255,255,255,0.45)'; roundRect(g, rtl() ? tx + 400 - 400 * fill + 6 : tx + 6, by - 7, Math.max(10, 400 * fill - 12), 6, 3); g.fill(); }
      }
    }
  }
  if (rv.flash !== undefined && rv.flash < 1.3) { // the flash, then the photo card flies to the shelf button
    const f = rv.flash; if (f < 0.35) { g.fillStyle = `rgba(255,255,255,${0.85 * (1 - f / 0.35)})`; g.fillRect(0, -OFF, W, HV); }
    const th = save.shelf[0] && THUMBS.get(save.shelf[0]);
    if (th && f > 0.15) {
      const k = ease((f - 0.35) / 0.9), sb = SHELFB(), x = BOWL.x + (sb.x + 46 - BOWL.x) * Math.max(0, k), y = BOWL.y + (sb.y + 46 - BOWL.y) * Math.max(0, k), sc = 1.2 - Math.max(0, k) * 0.9;
      g.save(); g.translate(x, y); g.rotate(-0.12 + Math.max(0, k) * 0.5); g.scale(sc, sc);
      g.fillStyle = 'rgba(92,52,70,0.25)'; roundRect(g, -84, -94, 176, 196, 14); g.fill();
      g.fillStyle = '#FFFFFF'; roundRect(g, -90, -100, 180, 200, 14); g.fill();
      g.fillStyle = '#E9F7FF'; roundRect(g, -78, -88, 156, 156, 8); g.fill(); g.drawImage(th, -th.width / 2, -10 - th.height / 2);
      g.restore();
    }
  }
  if (t > 1.5) { // a peek at the next order: its shape in its colour, gold when it is a golden soap
    const no = makeOrder(save.n), nx = mx(546, 150), ny = 983, mb = MARBLE(no.marble), pop = popIn(t - 1.5);
    g.save(); g.translate(nx + 75, ny + 45); g.scale(pop, pop); glossPill(g, -75, -40, 150, 80, no.golden ? '#FFE27A' : '#FFFFFF', '#FF9CC8');
    if (no.shape !== 'free') { g.save(); g.translate(-62, -24); g.scale(0.48, 0.48); g.fillStyle = mb.kind === 'layers' ? '#FFB3E0' : mb.base; g.fill(pathOf(no.shape)); g.lineWidth = 6; g.strokeStyle = '#FFFFFF'; g.stroke(pathOf(no.shape)); g.restore(); }
    words(`${save.made.length}/${cfg.shapes.length}`, no.shape === 'free' ? 0 : 26, 3, 30, 84, PLUM); // shapes made so far: the long goal
    g.restore();
  }
  if (t > 1.5) { const p = 1 + Math.sin(t * 5) * 0.06; g.save(); g.translate(NEXT.x, NEXT.y); g.scale(p, p); glossDisc(g, 0, 0, NEXT.r, GREEN); g.fillStyle = '#FFFFFF'; g.beginPath(); g.moveTo(-14, -22); g.lineTo(24, 0); g.lineTo(-14, 22); g.closePath(); g.fill(); g.restore(); }
  if (t > 3.5) drawShareButton();
}
function drawShareButton() {
  const b = SHAREB(); glossPill(g, b.x, b.y, b.w, b.h, '#FF5FA2', '#FFFFFF');
  const cx = b.x + b.w / 2, cy = b.y + b.h / 2, icx = rtl() ? cx + 66 : cx - 66; g.strokeStyle = '#FFFFFF'; g.fillStyle = '#FFFFFF'; g.lineWidth = 6; g.lineCap = 'round';
  g.beginPath(); g.moveTo(icx - 22, cy); g.lineTo(icx + 10, cy - 18); g.moveTo(icx - 22, cy); g.lineTo(icx + 10, cy + 18); g.stroke();
  for (const [x, y] of [[icx - 22, cy], [icx + 12, cy - 19], [icx + 12, cy + 19]]) { g.beginPath(); g.arc(x, y, 8, 0, TAU); g.fill(); }
  words(T('share'), rtl() ? cx - 28 : cx + 28, cy + 1, 30, 124, '#FFFFFF', PLUM);
}

// ---------- shelf ----------
/** A small render of a saved soap for the shelf (made once, one per frame). */
function thumbOf(e) {
  if (THUMBS.has(e)) return THUMBS.get(e);
  if (thumbOf.busy === bootT) return null; thumbOf.busy = bootT;
  const b = cfg.bar, w = Math.round(b.w / 3), h = Math.round(b.h / 3), m = decodeMask(e.m, w, h);
  if (!m) { THUMBS.set(e, null); return null; }
  const K = { protect: 3, core: 8, tol: 10, bevel: 2, depth: 10, margin: 7, shadowX: 3, shadowY: 3 };
  const s = makeSoap(w, h, m, m, K), c = document.createElement('canvas'), mb = MARBLE(e.mb), ss = Math.round(cfg.stampSize / 3);
  for (const [id, x, y] of e.st || []) { const st = cfg.stamps.find((q) => q.id === id); if (st) pressStamp(s, stampShape(st.shape, ss), ss, x / 3, y / 3); }
  attachPaint(s, c, albedoOf(mb.id, w, h), mb.inner);
  const q = c.getContext('2d'), r = rng(e.gc + 5), gl = cfg.glitters[e.g] || cfg.glitters[0];
  for (let k = 0, n = Math.min(400, e.gc / 3); k < n; k++) { const x = Math.floor(r() * w), y = Math.floor(r() * h); if (m[y * w + x]) { q.fillStyle = gl.c; q.fillRect(x + K.margin, y + K.margin, 1.5, 1.5); } }
  for (const [id, x, y] of e.gems) { const cc = cellCanvas('gems_sheet', gemCell(id), 16); if (cc) q.drawImage(cc, x / 3 + K.margin - 8, y / 3 + K.margin - 8); }
  const out = thumbFrom(c); THUMBS.set(e, out); return out;
}
function drawShelf() {
  const wall = g.createLinearGradient(0, 120 - OFF, 0, H + OFF); wall.addColorStop(0, '#FFF3E6'); wall.addColorStop(1, '#FFE3EE');
  g.fillStyle = wall; g.fillRect(0, 120 - OFF, W, HV - 120);
  words(T('shelf'), 360, 172, 52, 600, PLUM, '#FFFFFF');
  for (let row = 0; row < 3; row++) { const y = 226 + row * 182 + 150; g.fillStyle = '#E3A869'; roundRect(g, 18, y, 684, 22, 10); g.fill(); g.fillStyle = '#C98345'; g.fillRect(26, y + 18, 668, 8); }
  if (view === 'photo' && save.shelf[photoSel]) {
    const e = save.shelf[photoSel], th = thumbOf(e);
    g.fillStyle = 'rgba(74,35,102,0.55)'; g.fillRect(0, -OFF, W, HV);
    rays(g, 360, 600, 420, S.t, 0.6);
    if (th) g.drawImage(th, 360 - th.width * 1.6, 600 - th.height * 1.6, th.width * 3.2, th.height * 3.2);
    for (let i = 0; i < 3; i++) { starPath(360 + (i - 1) * 100, 900, 42); g.fillStyle = i < e.s ? '#FFD23F' : 'rgba(255,255,255,0.4)'; g.fill(); g.lineWidth = 5; g.strokeStyle = '#FFFFFF'; g.stroke(); }
    drawShareButton(); return;
  }
  for (let i = 0; i < 12; i++) {
    const [x, y] = SHELF_CELL(i), e = save.shelf[i];
    if (!e) { g.fillStyle = 'rgba(201,131,69,0.15)'; roundRect(g, x + 20, y + 40, 110, 110, 20); g.fill(); continue; }
    const th = thumbOf(e); if (th) g.drawImage(th, Math.round(x + 75 - th.width / 2), Math.round(y + 150 - th.height));
  }
  // charms found
  for (let i = 0; i < 8; i++) {
    const x = mx(80 + i * 80), y = 826, got = save.charms.includes(i);
    glossDisc(g, x, y, 32, got ? '#FFFFFF' : '#EADCF5');
    if (got) drawCell(g, 'charms_sheet', i, x, y, 50); else words('?', x, y + 2, 30, 40, 'rgba(74,35,102,0.45)');
  }
  // soap marbles to buy
  const shop = cfg.marbles.filter((m) => m.shop);
  for (let j = 0; j < shop.length; j++) {
    const [x, y] = SHOP_XY(j), mb = shop[j], have = owns('marbles', mb.id), wig = wiggle && wiggle.k === 'marbles' + mb.id ? Math.sin(wiggle.t * 40) * 6 : 0;
    const th = cellCanvasMarble(mb); g.save(); g.beginPath(); g.arc(x + wig, y, 44, 0, TAU); g.clip(); g.drawImage(th, x + wig - 44, y - 44); g.restore();
    g.lineWidth = 5; g.strokeStyle = have ? GREEN : '#FFFFFF'; g.beginPath(); g.arc(x + wig, y, 44, 0, TAU); g.stroke();
    if (!have) { lock(x + 28, y - 24, 30); priceTag(x, y + 40); } else if (save.fresh && save.fresh.id === mb.id) words(T('new'), x, y - 50, 22, 120, '#FFFFFF', PINK);
  }
  const lb = LANGB(); glossPill(g, lb.x, lb.y, lb.w, lb.h, '#FFFFFF', '#9BD8FF'); iconGlobe(rtl() ? lb.x + lb.w - 44 : lb.x + 44, lb.y + lb.h / 2, 24); words(T('lang'), lb.x + lb.w / 2 + (rtl() ? -24 : 24), lb.y + lb.h / 2 + 3, 30, lb.w - 100, PLUM);
  if (freeOpen()) { const fb = FREEB(); glossPill(g, fb.x, fb.y, fb.w, fb.h, freeNext ? GREEN : '#FFFFFF', '#FF9CC8'); words(T('free'), fb.x + fb.w / 2, fb.y + fb.h / 2 + 3, 30, fb.w - 40, freeNext ? '#FFFFFF' : PLUM); }
}
const MARB_TH = new Map();
function cellCanvasMarble(mb) {
  if (MARB_TH.has(mb.id)) return MARB_TH.get(mb.id);
  const c = document.createElement('canvas'); c.width = c.height = 88; const q = c.getContext('2d'), img = q.createImageData(88, 88), a = marbleAlbedo(mb, 88, 88, 3);
  for (let i = 0; i < 88 * 88; i++) { img.data[i * 4] = a[i * 3]; img.data[i * 4 + 1] = a[i * 3 + 1]; img.data[i * 4 + 2] = a[i * 3 + 2]; img.data[i * 4 + 3] = 255; }
  q.putImageData(img, 0, 0);
  const gr = q.createRadialGradient(30, 26, 4, 44, 44, 60); gr.addColorStop(0, 'rgba(255,255,255,0.55)'); gr.addColorStop(0.5, 'rgba(255,255,255,0)'); gr.addColorStop(1, 'rgba(74,35,102,0.25)'); q.fillStyle = gr; q.fillRect(0, 0, 88, 88);
  if (mb.kind === 'frost') {
    q.save(); q.globalCompositeOperation = 'screen';
    const sheen = q.createLinearGradient(8, 68, 74, 12); sheen.addColorStop(0, 'rgba(255,255,255,0)'); sheen.addColorStop(0.48, 'rgba(255,255,255,0.28)'); sheen.addColorStop(1, 'rgba(220,250,255,0)');
    q.strokeStyle = sheen; q.lineWidth = 5; q.beginPath(); q.ellipse(43, 43, 34, 17, -0.55, 0.25, 2.65); q.stroke();
    q.fillStyle = 'rgba(255,255,255,0.72)'; for (const [x, y, r] of [[22, 26, 2], [63, 37, 1.6], [34, 64, 1.8], [70, 59, 1.2]]) { q.beginPath(); q.arc(x, y, r, 0, TAU); q.fill(); }
    q.restore();
  }
  MARB_TH.set(mb.id, c); return c;
}

// ---------- frame and speed ----------
function setRes(k) { if (k === RES) return; RES = k; cv.width = Math.round(W * k); cv.height = Math.round(HV * k); }
/** Fit the canvas to the screen: taller than 9:16 grows the height (up to cfg.maxHeight), wider keeps 9:16 with table sides. */
function fit() {
  const ar = innerHeight / Math.max(1, innerWidth), hv = Math.round(Math.min(cfg.maxHeight, Math.max(H, W * ar)) / 2) * 2;
  if (hv !== HV || !cv.style.width) {
    HV = hv; OFF = (HV - H) / 2; ext = null; if (base) makeBase(); chromeKey = ''; // the shavings pile stays as it is
    cv.width = Math.round(W * RES); cv.height = Math.round(HV * RES);
  }
  cv.style.cssText = `display:block;width:min(100vw,calc(100vh*${W}/${HV}));height:min(100vh,calc(100vw*${HV}/${W}));touch-action:none;margin:auto`;
}
/** Quality steps down after two slow half-seconds and back up after five fast ones. */
function watchSpeed(dt) {
  frameTimes.push(dt); if (frameTimes.length < 30) return;
  const mid = frameTimes.sort((a, b) => a - b)[15] * 1000; frameTimes = [];
  if (mid > cfg.slowFrameMs + quality * 5) { fast = 0; if (++slow >= 2 && quality < 2) { quality++; slow = 0; } }
  else if (mid < 18) { slow = 0; if (++fast >= 5 && quality > 0) { quality--; fast = 0; } }
  else slow = fast = 0;
  setRes([1, 0.8, 0.62][quality]);
}
function frame(now) {
  raf = requestAnimationFrame(frame);
  const rawDt = Math.max(0, (now - last) / 1000), dt = Math.min(0.05, rawDt); last = now;
  if (rawDt > 0 && rawDt < 1) watchSpeed(rawDt);
  const gdt = dt * stepCine(dt);
  if (DEBUG) { const a = performance.now(); update(gdt); const b = performance.now(); draw(); const c = performance.now(); const p = (window.__prof = window.__prof || { u: 0, d: 0, n: 0 }); p.u += b - a; p.d += c - b; p.n++; window.__frames = (window.__frames || 0) + 1; }
  else { update(gdt); draw(); }
  if (!drawn) { drawn = true; document.body.style.backgroundImage = 'none'; } // the canvas now shows the table: drop the page's stand-in
}
let drawn = false;

// ---------- save ----------
const int = (v, lo, hi) => (Number.isInteger(v) && v >= lo && v <= hi ? v : null);
/** A stored shelf soap, or null when anything about it is wrong. */
function cleanEntry(e) {
  if (!e || typeof e !== 'object' || !decodeMask(e.m, 48, 60)) return null;
  if (!cfg.marbles.some((m) => m.id === e.mb) || int(e.g, 0, cfg.glitters.length - 1) === null || int(e.gc, 0, 100000) === null || int(e.s, 0, 3) === null) return null;
  if (!(e.sh === 'free' || cfg.shapes.some((s) => s.id === e.sh)) || !Array.isArray(e.gems) || e.gems.length > 3) return null;
  const gems = e.gems.filter((x) => Array.isArray(x) && cfg.gems.some((gm) => gm.id === x[0]) && int(x[1], 0, cfg.bar.w) !== null && int(x[2], 0, cfg.bar.h) !== null).map((x) => [x[0], x[1], x[2]]);
  const st = (Array.isArray(e.st) ? e.st : []).slice(0, cfg.stampMax).filter((x) => Array.isArray(x) && cfg.stamps.some((q) => q.id === x[0]) && int(x[1], 0, cfg.bar.w) !== null && int(x[2], 0, cfg.bar.h) !== null).map((x) => [x[0], x[1], x[2]]);
  return { m: e.m, mb: e.mb, g: e.g, gc: e.gc, gems, st, s: e.s, sh: e.sh, cu: cfg.customers.includes(e.cu) ? e.cu : cfg.customers[0] };
}
/** Merge the stored save into the current one, once; progress made before it arrived is added on top. */
function applySave(st) {
  if (!st || typeof st !== 'object' || merged) return;
  merged = true;
  const n0 = int(st.n, 0, 1e6) || 0, before = save.n;
  save.n = n0 + save.n; save.coins = (int(st.coins, 0, 1e7) || 0) + save.coins; save.stars = (int(st.stars, 0, 1e7) || 0) + save.stars; save.buys = (int(st.buys, 0, 1000) || 0) + save.buys; save.gifts = (int(st.gifts, 0, 1e5) || 0) + save.gifts; if (st.giftDue === true) save.giftDue = true;
  if (int(st.day, 20200101, 21001231)) save.day = Math.max(save.day || 0, st.day);
  const ow = st.owned && typeof st.owned === 'object' ? st.owned : {};
  for (const k of ['marbles', 'glitters', 'gems', 'stamps']) if (Array.isArray(ow[k])) for (const id of ow[k]) if (cfg[k].some((x) => x.id === id && x.shop) && !save.owned[k].includes(id)) save.owned[k].push(id);
  if (Array.isArray(st.shelf)) for (const e of st.shelf.slice(0, 12)) { const c = cleanEntry(e); if (c && save.shelf.length < 12) save.shelf.push(c); }
  if (Array.isArray(st.learned)) for (const k of st.learned) if (FULL.includes(k) && !save.learned.includes(k)) save.learned.push(k);
  if (Array.isArray(st.made)) for (const id of st.made) if (cfg.shapes.some((x) => x.id === id) && !save.made.includes(id)) save.made.push(id);
  save.ftue = save.ftue || st.ftue === true || n0 > 0; // a returning player has seen the basics
  if (Array.isArray(st.charms)) for (const c of st.charms) if (int(c, 0, 7) !== null && !save.charms.includes(c)) save.charms.push(c);
  if (Array.isArray(st.winterSeen)) for (const id of st.winterSeen) if (isWinterShape(id) && !save.winterSeen.includes(id)) save.winterSeen.push(id);
  if (st.fresh && ['marbles', 'glitters', 'gems', 'stamps'].includes(st.fresh.k) && cfg[st.fresh.k].some((x) => x.id === st.fresh.id) && !save.fresh) save.fresh = { k: st.fresh.k, id: st.fresh.id };
  if (!muteTouched && typeof st.muted === 'boolean') save.muted = st.muted;
  if (!save.lang && typeof st.lang === 'string' && cfg.strings[st.lang]) lang = save.lang = st.lang;
  coinShown = save.coins;
  if (n0 > 0 && before === 0 && !touched && view === 'play') newOrder(save.n, false, true); // a returning player meets their next customer
  if (save.giftDue && !touched && view === 'play' && S && S.si === 0 && !S.used) showGift(); // a gift left waiting before a reload
}

/** Entry point. The host calls this on start and on every reload. */
function run(m) {
  const me = ++runs;
  mode = m; cfg = window.gameConfig;
  loadSprites(cfg.sprites, cfg.firstSprites, cfg.bgPreview); // first, so the table starts downloading before any set-up work
  cv = document.getElementById('game') || document.body.appendChild(Object.assign(document.createElement('canvas'), { id: 'game' }));
  cv.style.cssText = ''; fit(); if (!fit.on) { fit.on = true; addEventListener('resize', () => { if (cfg) fit(); }); }
  g = cv.getContext('2d');
  initMake({ cfg: () => cfg, get fx() { return fx; }, SFX, buzz, burst, R, drawCellAt, stopSign: (x, y) => banner(T('stop'), x, y, 26, 160, '#FFFFFF', 1 + Math.sin(S.t * 14) * 0.08, '#FF5F7E'), reward, drawKnife, done: () => nextStep(), roundRect, tint, mx, every, mix, shake: (v) => { shake = Math.max(shake, v); } });
  if (!fx) { tables = [0, 1].map(() => Object.assign(document.createElement('canvas'), { width: W, height: H })); fx = createFx(tables[0]); ti = 0; }
  bootT = 0;
  loadFonts();
  try { for (const f of ["800 40px 'Baloo 2'", "800 40px 'Baloo Da 2'", "800 40px 'Baloo Bhaijaan 2'"]) document.fonts.load(f); } catch (e) { /* fonts load when they can */ }
  const slider = (key, min, max, step) => ({ key, type: 'slider', min, max, step });
  try {
    lib.showGameParameters({
      name: 'Soap Carving Settings',
      params: {
        'Knife size (px)': slider('knifeR', 8, 30, 1), 'Soap carved to finish': slider('carveDone', 0.6, 1, 0.02), 'Slip speed inside the line (px/s)': slider('insideSpeed', 800, 4000, 100),
        'Soap per shaving (cells)': slider('shaveEvery', 60, 600, 20), 'Sponge size (px)': slider('spongeR', 20, 80, 2), 'Sponge strength': slider('spongeRate', 0.5, 6, 0.1),
        'Glitter for full sparkle': slider('glitterTarget', 5, 40, 1), 'Seconds before the hand helps': slider('idleHand', 1, 10, 0.5), 'Coins per star': slider('coinPerStar', 1, 30, 1),
        'First unlock price': slider('priceBase', 10, 200, 5), 'Confetti pieces': slider('confetti', 0, 200, 10),
      },
    });
  } catch (e) { /* settings panel not offered here */ }
  cancelAnimationFrame(raf); pen = null; penId = null; makeStop(S); pourLoop(false); // a pour or stir in progress lost its finger
  lang = save.lang || detectLang();
  // a soap in progress is kept through edit runs; edit mode only shows it, with no input
  if (!S || (S.edit && mode === 'play')) { view = 'play'; fx.clear(); newOrder(mode === 'play' ? save.n : 0, false, true); S.edit = mode !== 'play'; }
  if (mode === 'play') {
    bindInput();
    const read = (tries) => Promise.resolve().then(() => lib.getUserGameState()).then((r) => {
      if (me !== runs) return;
      applySave(r && r.state); saveRead = true; persist(); submitScore();
    }).catch(() => { if (me === runs) setTimeout(() => read(tries + 1), Math.min(30000, 4000 * tries)); }); // keep trying: writing blind could erase the player's save
    if (!saveRead) read(1);
  }
  last = performance.now(); raf = requestAnimationFrame(frame);
}
window.run = run;

// Local preview outside Astrocade: open index.html?local to stub the host.
if (DEBUG) {
  const none = async () => ({});
  const read = window.__slowSave ? () => new Promise((r) => { window.__resolveSave = r; }) : window.__saved ? async () => ({ state: window.__saved }) : none;
  window.lib = { showGameParameters() {}, log() {}, getAsset: (id) => (window.__noAssets ? undefined : /^(sfx|music)_/.test(id) ? { url: './' + id + '.mp3', type: 'audio' } : /^font_/.test(id) ? { url: './' + id + '.woff2', type: 'other' } : { url: './' + id + '.webp', type: 'image' }), getUserGameState: read, saveUserGameState: (s) => { (window.__writes = window.__writes || []).push(JSON.parse(JSON.stringify(s))); return none(); }, addPlayerScoreToLeaderboard: none, share: async (options) => { window.__shared = options; }, haptics: { play() {}, start() {}, stop() {} } };
  window.__game = {
    get S() { return S; }, get save() { return save; }, set save(v) { save = v; }, get view() { return view; }, set view(v) { view = v; }, get cfg() { return cfg; }, get lang() { return lang; }, setLang(l) { lang = save.lang = l; },
    get quality() { return quality; }, set quality(q) { quality = q; }, get fx() { return fx; }, get pen() { return pen; }, get coinShown() { return coinShown; }, set coinShown(v) { coinShown = v; },
    booting, T, detectLang, applySave, nextStep, fillShare, potSide, giftDots, landAt, fillCentre, sounds: () => Object.keys(REC), get musicOn() { return !!musicNode; }, today, drawKnife, drawShaker, MOUTH_UP, isMake, makeProgress: () => makeProgress(S), stepPos, GIFTB, get gift() { return gift; }, newOrder, makeOrder, finishCarve, finishSmooth, finishSparkle, nextOrder, checkShown, handShown, handAt, trayItems, price, carvedShare: () => carvedShare(S.soap),
    get OFF() { return OFF; }, spotRect, spotOn, SKIPB, SHAREB, stepsOf, get cineOn() { return !!cine; },
    MUTE, SHELFB, CHECK, NEXT, ORDER, slotXY, SHELF_CELL, SHOP_XY, LANGB, FREEB, BOWL, freeOpen, set freeNext(v) { freeNext = v; },
  };
  const q = new URLSearchParams(location.search);
  fetch('game_config.json').then((r) => r.json()).then((c) => { window.gameConfig = { ...c, ...JSON.parse(q.get('cfg') || '{}') }; run(q.get('mode') || 'play'); });
}
