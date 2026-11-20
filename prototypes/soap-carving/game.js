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
import { loadSprites, ready, settled, cellCanvas, drawCell, drawCellAt, drawTable, drawBowl } from './sprites.js';
import { rng, makeSoap, markDirty, carve, trimRows, carvedShare, sponge, edgeCells, meanRough, takeIslands, islandSprite, shapeScore, sparkleScore, verdict, soapCount, encodeMask, decodeMask, marbleAlbedo, attachPaint, paint } from './soap.js';
import { createFx } from './fx.js';

const DEBUG = location.search.includes('local');
const W = 720, H = 1280, TAU = Math.PI * 2, LANGS = ['en', 'ar', 'es', 'vi', 'hi', 'bn', 'id'];
const FONT = "'Baloo 2', 'Baloo Da 2', 'Baloo Bhaijaan 2', system-ui, 'Noto Sans', 'Noto Sans Arabic', 'Noto Sans Devanagari', 'Noto Sans Bengali', sans-serif";
const STEP_TOOLS = [0, 1, 2, -1]; // tools_sheet cells: knife, sponge, shaker; the bowl for the bath
const MOOD = { calm: 0, happy: 1, wow: 2, oops: 3 };
const CONF = ['#FF5FA2', '#FFD23F', '#3DDC97', '#3EC5FF', '#B57BFF', '#FF9F1C'];
const ease = (k) => 1 - Math.pow(1 - Math.max(0, Math.min(1, k)), 3);
const back3 = (k) => { k = Math.max(0, Math.min(1, k)); const c = 1.7; return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2); };

let cv, g, cfg, mode, raf = 0, last = 0, runs = 0, base = null, tables = [], ti = 0, fx = null, vig = null, chrome = null, chromeKey = '';
let save = { n: 0, coins: 0, stars: 0, buys: 0, owned: { marbles: [], glitters: [], gems: [] }, shelf: [], charms: [], fresh: null, lang: null, muted: false };
let saveRead = false, merged = false, muteTouched = false, touched = false;
let view = 'play', S = null, lang = 'en', pen = null, penId = null, coinShown = 0, coinPulse = 0, wiggle = null, shake = 0, freeNext = false;
let quality = 0, frameTimes = [], slow = 0, fast = 0, RES = 1, bootT = 0, photoSel = -1, coinsFlying = [];
let ac = null, noiseBuf = null, fizzNode = null;
const ALB = new Map(), THUMBS = new WeakMap(), throttle = {};
const R = rng(12345); // looks only (curls, sparkles); rules are seeded per order
const every = (key, ms) => { const t = performance.now(); if (t - (throttle[key] || 0) < ms) return false; throttle[key] = t; return true; };
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
function banner(str, x, y, size, maxW, color = PLUM, pop = 1, base = '#FFFFFF') {
  g.save(); g.translate(x, y); g.scale(pop, pop);
  g.font = `800 ${size}px ${FONT}`;
  const w = Math.min(maxW, g.measureText(str).width) + 60, h = size + 32;
  glossPill(g, -w / 2, -h / 2, w, h, base, '#FF9CC8');
  words(str, 0, 3, size, maxW, color);
  g.restore();
}
const popIn = (age) => (age < 0.35 ? 0.6 + 0.4 * ease(age / 0.35) + Math.sin(Math.min(1, age / 0.35) * Math.PI) * 0.12 : 1);

// ---------- host calls that must never stop the game ----------
const buzz = (kind) => { try { lib.haptics.play(kind); } catch (e) { /* no vibration here */ } };
/** Write the save, only after the player's stored save was read, so it can never be overwritten blind. */
const persist = () => { if (mode === 'play' && saveRead) Promise.resolve().then(() => lib.saveUserGameState(save)).catch(() => {}); };
const submitScore = () => { if (mode === 'play' && saveRead) Promise.resolve().then(() => lib.addPlayerScoreToLeaderboard(save.stars)).catch(() => {}); };

// ---------- sound (synthesized; starts on the first touch) ----------
function startAudio() {
  if (!ac) { const AC = window.AudioContext || window.webkitAudioContext; if (AC) { ac = new AC(); noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate); const d = noiseBuf.getChannelData(0), r = rng(9); for (let i = 0; i < d.length; i++) d[i] = r() * 2 - 1; } }
  if (ac && ac.state === 'suspended' && !document.hidden) ac.resume().catch(() => {});
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
  crunch: (sp) => { const k = Math.min(1, sp / 1600); hiss(0.07 + k * 0.03, 0.22, 900 + k * 1500 + Math.random() * 300, 1.4); hiss(0.04, 0.1, 4200, 2, 'bandpass', 0.015); beep(140 + Math.random() * 40, 0.04, 'triangle', 0.05, -40); },
  curl: () => beep(2600 + Math.random() * 900, 0.03, 'sine', 0.025, 600),
  skid: () => { beep(1500, 0.09, 'sine', 0.04, 500); hiss(0.08, 0.05, 6000, 3); },
  thud: () => { beep(110, 0.25, 'sine', 0.2, -60); hiss(0.18, 0.12, 400, 0.8, 'lowpass'); beep(70, 0.2, 'triangle', 0.1, -20, 0.12); },
  oops: () => { beep(520, 0.12, 'triangle', 0.09, -120); beep(380, 0.18, 'triangle', 0.09, -100, 0.11); },
  squeak: () => { beep(1100 + Math.random() * 400, 0.07, 'sine', 0.035, 450); hiss(0.07, 0.05, 3000, 1.5); },
  pop: () => beep(700 + Math.random() * 600, 0.05, 'sine', 0.05, 500),
  shimmer: () => { for (let i = 0; i < 3; i++) beep(2200 + Math.random() * 1800, 0.08, 'triangle', 0.025, 0, i * 0.03); },
  clink: () => { beep(2400, 0.18, 'sine', 0.07); beep(3300, 0.14, 'sine', 0.05, 0, 0.02); },
  plop: () => { beep(320, 0.18, 'sine', 0.16, -220); hiss(0.4, 0.12, 1800, 0.6); },
  step: () => tune([659, 880, 1175], 80, 0.18, 0.08),
  pick: () => beep(990, 0.06, 'triangle', 0.07),
  no: () => { beep(220, 0.12, 'square', 0.05); beep(180, 0.14, 'square', 0.05, 0, 0.1); },
  unlock: () => tune([784, 988, 1175, 1568], 85, 0.25, 0.1),
  fill: (k) => tune([523 + k * 120, 659 + k * 120, 784 + k * 120], 60, 0.14, 0.06),
  star: (k) => beep(880 + k * 220, 0.28, 'triangle', 0.1),
  coin: () => { beep(1568, 0.05, 'square', 0.03); beep(2093, 0.09, 'square', 0.03, 0, 0.05); },
  wow: () => { tune([523, 659, 784, 1047, 1319], 95, 0.3, 0.09); hiss(0.4, 0.05, 6000, 0.5); },
  charm: () => tune([1047, 1319, 1568, 2093], 70, 0.2, 0.08),
};
function fizz(on) {
  if (fizzNode) { try { fizzNode.stop(); } catch (e) { /* stopped */ } fizzNode = null; }
  if (!on || !live()) return;
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

/** The order for soap n: always the same for the same n and the same things owned. */
function makeOrder(n) {
  const r = rng(1000 + n * 7919), pick = (a) => a[Math.floor(r() * a.length) % a.length];
  const plain = cfg.marbles.filter((m) => m.id !== 'gold' && owns('marbles', m.id)).map((m) => m.id);
  const golden = n % 4 === 3, freeCarve = freeNext;
  let marble = golden ? 'gold' : n === 0 ? 'pink' : pick(plain);
  const shape = freeCarve ? 'free' : n === 0 ? 'heart' : n === 1 ? 'star' : cfg.shapes[(n * 3 + Math.floor(r() * cfg.shapes.length)) % cfg.shapes.length].id;
  const o = { n, shape, marble, golden: golden && !freeCarve, customer: cfg.customers[n % cfg.customers.length], charm: null, glitter: null, gem: null, simple: n < 2, free: freeCarve };
  if (n % 5 === 4) { const left = [...Array(8).keys()].filter((c) => !save.charms.includes(c)); o.charm = left.length ? left[Math.floor(r() * left.length) % left.length] : Math.floor(r() * 8) % 8; }
  const f = save.fresh;
  if (f && f.k === 'marbles' && owns('marbles', f.id) && !golden) o.marble = f.id;
  if (f && f.k === 'glitters' && owns('glitters', f.id)) o.glitter = f.id;
  if (f && f.k === 'gems' && owns('gems', f.id)) o.gem = f.id;
  return o;
}

// ---------- shapes ----------
/** An SVG path (0..100 box) for a shape: its own path, or a star or flower built from [points, inner radius]. */
function shapeD(sh) {
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
  const b = cfg.bar, pad = id === 'free' ? 110 : 26, s = Math.min((b.w - pad * 2) / 100, (b.h - pad * 2) / 100);
  return { s, ox: (b.w - 100 * s) / 2, oy: (b.h - 100 * s) / 2 };
}
/** A shape drawn into a w x h grid of cells (1 inside). */
function rasterize(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; const q = c.getContext('2d');
  draw(q); const d = q.getImageData(0, 0, w, h).data, out = new Uint8Array(w * h);
  for (let i = 0; i < out.length; i++) out[i] = d[i * 4 + 3] > 127 ? 1 : 0;
  return out;
}
const albedoOf = (id, w, h) => { const key = id + '@' + w; if (!ALB.has(key)) { if (ALB.size > 6) ALB.clear(); ALB.set(key, marbleAlbedo(MARBLE(id), w, h, 7 + cfg.marbles.indexOf(MARBLE(id)))); } return ALB.get(key); };

// ---------- a new soap ----------
function newOrder(n, enter) {
  const o = makeOrder(n), b = cfg.bar, fit = fitOf(o.shape);
  freeNext = false;
  const bar = rasterize(b.w, b.h, (q) => { roundRect(q, 0, 0, b.w, b.h, b.r); q.fill(); });
  const tpl = rasterize(b.w, b.h, (q) => { q.translate(fit.ox, fit.oy); q.scale(fit.s, fit.s); q.fill(pathOf(o.shape)); });
  const K = { protect: cfg.protect, core: cfg.core, tol: o.simple ? cfg.simpleTol : cfg.tol, bevel: cfg.bevel, depth: cfg.depth, margin: cfg.margin, shadowX: cfg.shadowX, shadowY: cfg.shadowY };
  const soap = makeSoap(b.w, b.h, bar, tpl, K);
  const mb = MARBLE(o.marble);
  const sc = (S && S.soap && S.soap.canvas) || document.createElement('canvas');
  attachPaint(soap, sc, albedoOf(mb.id, b.w, b.h), mb.inner);
  const glit = (S && S.glitLayer) || document.createElement('canvas');
  glit.width = sc.width; glit.height = sc.height;
  if (enter) { ti = 1 - ti; fx.setPile(tables[ti]); } // the old pile fades out on the other table
  freshTable(tables[ti]);
  S = {
    n, order: o, step: 0, soap, fit, enter: enter ? 0.7 : 0, t: 0, idle: 0, used: false, stepUsed: false, shaveAcc: 0, islandT: 0, dirtyIsl: false,
    score: { shape: 0, smooth: 0, sparkle: 0, v: 0, stars: 0 }, edges: null, rough: 1, trim: null, glitLayer: glit, specks: [], glitCount: 0,
    gems: [], gemSel: -1, glitSel: owns('glitters', o.glitter) ? cfg.glitters.findIndex((x) => x.id === o.glitter) : 0, lastAct: 0, added: false,
    charm: o.charm === null ? null : placeCharm(soap, n, o.charm), mood: 'calm', moodT: 0, reveal: null, photo: null, oopsT: 9, pileFade: enter ? 1 : 0, speed: 0, done: false,
  };
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
const STEP_KEYS = ['carve', 'smooth', 'sparkle', 'bath'];
function carveAlong(ax, ay, bx, by, dt) {
  const s = S.soap, step = cfg.knifeStep, d = Math.hypot(bx - ax, by - ay), n = Math.max(1, Math.ceil(d / step));
  S.speed = S.speed * 0.6 + (dt > 0 ? d / dt : 0) * 0.4;
  const fastNow = S.speed > cfg.insideSpeed && !S.order.free;
  let removed = 0, skid = 0, nick = 0, lx = ax, ly = ay;
  for (let i = 1; i <= n; i++) {
    const x = ax + (bx - ax) * i / n, y = ay + (by - ay) * i / n, [cx0, cy0] = barXY(lx, ly), [cx1, cy1] = barXY(x, y);
    const res = carve(s, cx0, cy0, cx1, cy1, cfg.knifeR, fastNow);
    removed += res.removed; skid += res.skid; nick += res.nick; lx = x; ly = y;
    if (res.removed) {
      S.shaveAcc += res.removed;
      const dx = (bx - ax) / (d || 1), dy = (by - ay) / (d || 1);
      while (S.shaveAcc >= cfg.shaveEvery) { S.shaveAcc -= cfg.shaveEvery; spawnCurl(res.cx, res.cy, dx, dy); }
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
  SFX.charm(); buzz('success'); setMood('wow', 1.6); burst(cfg.bar.x + c.x, cfg.bar.y + c.y, 24, false);
  if (!save.charms.includes(c.id)) save.charms.push(c.id);
}
function dropIslands() {
  S.dirtyIsl = false;
  const isl = takeIslands(S.soap, (list) => {
    for (const it of list) {
      // a crumb or two for a small piece; specks of the blade's edge just vanish
      if (it.cells.length < 60) { const sx = cfg.bar.x + (it.x0 + it.x1) / 2, sy = cfg.bar.y + (it.y0 + it.y1) / 2; for (let k = 0; k < Math.floor(it.cells.length / 25); k++) { const [tx, ty] = landing(sx, sy, 0, 1); fx.speck(sx, sy, 0, (tx - sx) / 0.42, (ty - sy) / 0.42, albAt(it.x0, it.y0), 6); const q = fx.P[fx.P.length - 1]; if (q) q.vz = 190; } continue; }
      const sp = islandSprite(S.soap, it), sx = cfg.bar.x - cfg.margin + sp.x, sy = cfg.bar.y - cfg.margin + sp.y;
      const cx = sx + sp.canvas.width / 2, out = cx < cfg.bar.x + cfg.bar.w / 2 ? -1 : 1, low = (it.y0 + it.y1) / 2 > cfg.bar.h * 0.6;
      fx.chunk(sp.canvas, sx, sy, out * (90 + R() * 120), low ? 260 + R() * 100 : 60 + R() * 120, R);
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
  S.trim = { y: -1, t: 0 }; SFX.step(); pen = null;
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
  if (tr.t >= 0.75) { S.trim = null; if (S.charm && S.charm.state === 'hidden') popCharm(); toStep(1); }
}
function toStep(k) {
  S.step = k; S.idle = 0; S.stepUsed = false; S.lastAct = S.t; pen = null; SFX.step(); buzz('success');
  burst(stepXY(k - 1)[0], stepXY(k - 1)[1], 12, false);
  if (k === 1) { S.edges = edgeCells(S.soap); S.rough = meanRough(S.soap, S.edges); }
  if (k === 3) startReveal();
}
function finishSmooth() { S.score.smooth = 1 - meanRough(S.soap, S.edges); toStep(2); }
function finishSparkle() {
  const dens = S.glitCount / Math.max(1, soapCount(S.soap) / 1000);
  S.score.sparkle = sparkleScore(dens, S.gems.length, cfg.glitterTarget);
  toStep(3);
}
const checkShown = () => mode === 'play' && view === 'play' && S.enter <= 0 && !S.trim && (
  (S.step === 0 && carvedShare(S.soap) >= (S.order.free ? 0.15 : cfg.carveCheck)) ||
  (S.step === 1 && S.rough <= cfg.smoothCheck) || (S.step === 2 && S.added));

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
  const entry = { m: encodeMask(S.soap), mb: S.order.marble, g: S.glitSel, gc: S.glitCount, gems: S.gems.map((gm) => [gm.id, Math.round(gm.x), Math.round(gm.y)]), s: S.score.stars, sh: S.order.shape };
  THUMBS.set(entry, thumbFrom(sm));
  save.shelf.unshift(entry); if (save.shelf.length > 12) save.shelf.length = 12;
  if (save.fresh && ((save.fresh.k === 'marbles' && S.order.marble === save.fresh.id) || (save.fresh.k === 'glitters' && S.order.glitter === save.fresh.id) || (save.fresh.k === 'gems' && S.order.gem === save.fresh.id))) save.fresh = null;
  persist(); submitScore();
  fizz(true);
}
const thumbFrom = (src) => { const c = document.createElement('canvas'), k = 150 / Math.max(src.width, src.height); c.width = Math.round(src.width * k); c.height = Math.round(src.height * k); const q = c.getContext('2d'); q.imageSmoothingQuality = 'high'; q.drawImage(src, 0, 0, c.width, c.height); return c; };
const BOWL = { x: 360, y: 566, d: 640 };
function stepReveal(dt) {
  const rv = S.reveal, t0 = rv.t; rv.t += dt; const t = rv.t;
  const at = (s) => t0 < s && t >= s;
  if (at(0.55)) { SFX.plop(); buzz('thud'); fx.ring(BOWL.x, BOWL.y, 120, 1.2); fx.ring(BOWL.x, BOWL.y, 80, 0.9); for (let i = 0; i < 18; i++) fx.bubble(BOWL.x + (R() - 0.5) * 300, BOWL.y + 60 + R() * 120, 6 + R() * 12, -40 - R() * 80, 1.4 + R()); }
  if (t > 0.6 && t < 3.5 && every('bub', 90)) { fx.bubble(BOWL.x + (R() - 0.5) * 340, BOWL.y + 100 + R() * 80, 5 + R() * 12, -50 - R() * 70, 1.5 + R()); if (R() < 0.4) SFX.pop(); }
  if (t > 0.8 && every('ring', 900)) fx.ring(BOWL.x, BOWL.y, 150 + R() * 30, 1.4);
  if (S.order.free) { if (at(1.0)) { setMood('wow', 9); SFX.wow(); burst(360, 520, cfg.confetti, true); } }
  else {
    if (at(1.0)) setMood(S.score.stars >= 3 ? 'wow' : S.score.stars === 2 ? 'happy' : 'calm', 9);
    for (let i = 0; i < 3; i++) if (at(1.1 + i * 0.45)) { rv.bars = i + 1; SFX.fill(i); }
    for (let i = 0; i < S.score.stars; i++) if (at(2.6 + i * 0.28)) { rv.stars = i + 1; SFX.star(i); buzz('tap'); burst(starXY(i)[0], starXY(i)[1], 10, false); }
    if (at(2.6 + S.score.stars * 0.28 + 0.1) && S.score.stars >= 2) { SFX.wow(); burst(360, 300, cfg.confetti * (S.score.stars === 3 ? 1 : 0.5), true); buzz('success'); }
  }
  if (at(3.4)) { const n = Math.min(12, Math.ceil(rv.coins / 5)); for (let i = 0; i < n; i++) coinsFlying.push({ x: 360 + (R() - 0.5) * 80, y: 300, t: -i * 0.06, v: rv.coins / n }); rv.paid = true; }
  if (t > cfg.revealSeconds + 3.2 && view === 'play') nextOrder();
}
const starXY = (i) => [360 + (i - 1) * 110, 196];
function nextOrder() { fizz(false); newOrder(save.n, true); }

// ---------- layout ----------
const MUTE = () => ({ x: mx(612, 92), y: 22, s: 92 }), SHELFB = () => ({ x: mx(512, 92), y: 22, s: 92 });
const CHECK = () => ({ x: mx(564, 112), y: 740, s: 112 });
const NEXT = { x: 360, y: 1028, r: 56 };
const stepXY = (i) => [mx(222 + i * 92), 160];
const slotXY = (row, j) => [mx(72 + j * 115), row ? 1040 : 962];
const ORDER = () => ({ x: mx(458, 244), y: 206, w: 244, h: 202 });
const SHELF_CELL = (i) => [mx(30 + (i % 4) * 168, 150), 226 + Math.floor(i / 4) * 182];
const SHOP_XY = (j) => [mx(150 + j * 140), 932];
const LANGB = () => ({ x: mx(30, 300), y: 1000, w: 300, h: 84 }), FREEB = () => ({ x: mx(390, 300), y: 1000, w: 300, h: 84 });
const inDisc = (b, p) => Math.hypot(p[0] - b.x - b.s / 2, p[1] - b.y - b.s / 2) <= b.s / 2 + 8;
const inRect = (b, p) => p[0] >= b.x && p[0] <= b.x + b.w && p[1] >= b.y && p[1] <= b.y + b.h;
const gemCell = (id) => { const gm = cfg.gems.find((x) => x.id === id); return gm ? gm.cell : 0; };
const trayShown = () => mode === 'play' && view === 'play' && S.step === 2 && S.enter <= 0;
const freeOpen = () => save.n >= cfg.freeAfter;

// ---------- input ----------
function point(e) { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * W, (e.clientY - r.top) / r.height * H]; }
/** Where the tool works: a touch works a little above the finger, so the finger never hides it. */
const tipOf = (p, touch) => (touch && S.step < 2 ? [p[0], p[1] - 56] : p);
function down(p, touch) {
  startAudio(); touched = true; S.idle = 0;
  if (view === 'photo') { view = 'shelf'; photoSel = -1; SFX.pick(); return; }
  if (inDisc(MUTE(), p)) { save.muted = !save.muted; muteTouched = true; if (save.muted) fizz(false); SFX.pick(); persist(); return; }
  if (inDisc(SHELFB(), p) && (view === 'shelf' || S.step !== 3 || S.reveal.t > 1)) { view = view === 'shelf' ? 'play' : 'shelf'; pen = null; SFX.pick(); return; }
  if (view === 'shelf') return shelfTap(p);
  if (S.enter > 0 || S.trim) return;
  if (S.step === 3) { if (S.reveal.t > 1.5) { SFX.pick(); nextOrder(); } return; }
  if (checkShown() && inDisc(CHECK(), p)) { SFX.pick(); if (S.step === 0) finishCarve(); else if (S.step === 1) finishSmooth(); else finishSparkle(); return; }
  if (trayShown() && p[1] > 905) return trayTap(p);
  S.used = true; S.lastAct = S.t;
  if (S.step === 2 && S.gemSel >= 0) return gemTap(p);
  const tp = tipOf(p, touch);
  pen = { x: tp[0], y: tp[1], px: tp[0], py: tp[1], t: performance.now(), touch, fx: p[0], fy: p[1] };
  gesture(0);
}
function move(p) {
  if (!pen) return;
  const tp = tipOf(p, pen.touch), now = performance.now(), dt = Math.max(1, now - pen.t) / 1000;
  pen.px = pen.x; pen.py = pen.y; pen.x = tp[0]; pen.y = tp[1]; pen.fx = p[0]; pen.fy = p[1]; pen.t = now; S.idle = 0; S.lastAct = S.t;
  if (DEBUG) { const a = performance.now(); gesture(dt); const pr = window.__prof; if (pr) { pr.g = (pr.g || 0) + performance.now() - a; pr.ge = (pr.ge || 0) + 1; } } else gesture(dt);
}
function up() { if (pen && S && S.step === 0 && S.dirtyIsl) dropIslands(); pen = null; }
function gesture(dt) {
  if (S.step === 0) carveAlong(pen.px, pen.py, pen.x, pen.y, dt);
  else if (S.step === 1) {
    const d = Math.hypot(pen.x - pen.px, pen.y - pen.py), [cx, cy] = barXY(pen.x, pen.y);
    const took = sponge(S.soap, cx, cy, cfg.spongeR, cfg.spongeRate, Math.min(0.06, d / 500));
    if (took > 0) {
      S.stepUsed = true;
      if (every('foam', 50)) fx.foam(pen.x + (R() - 0.5) * cfg.spongeR * 1.4, pen.y + (R() - 0.5) * cfg.spongeR * 1.4, 7 + R() * 9, 0.9 + R() * 0.8);
      if (every('squeak', 160)) SFX.squeak();
      if (every('tick', 140)) buzz('tick');
      if (every('shine', 260)) { const e = S.edges, i = e[Math.floor(R() * e.length)], x = i % S.soap.w, y = (i - x) / S.soap.w; if (Math.hypot(x - cx, y - cy) < cfg.spongeR * 1.6 && S.soap.rough[i] < 0.3) { fx.twinkle(cfg.bar.x + x, cfg.bar.y + y, 18, 0.6); SFX.shimmer(); } }
    }
  } else if (S.step === 2) {
    if (!every('shake', 35)) return;
    const gl = cfg.glitters[S.glitSel] || cfg.glitters[0];
    for (let k = 0; k < (quality ? 6 : 10); k++) {
      const a = R() * TAU, rr = R() * 40, x = pen.x + Math.cos(a) * rr, y = pen.y + 24 + Math.sin(a) * rr;
      fx.speck(x, y, 40 + R() * 20, 0, 0, gl.c, 5, (lx, ly) => landGlitter(lx, ly, gl.c));
    }
    if (every('shim', 120)) SFX.shimmer();
    if (every('tick', 160)) buzz('tick');
  }
}
function landGlitter(x, y, c) {
  if (!S || S.step !== 2) return;
  const [cx, cy] = barXY(x, y), s = S.soap, i = (cy | 0) * s.w + (cx | 0);
  if (cx >= 0 && cy >= 0 && cx < s.w && cy < s.h && s.m[i]) {
    const q = S.glitLayer.getContext('2d'), gx = cx + cfg.margin, gy = cy + cfg.margin;
    const z = 3 + R() * 2.5; q.fillStyle = 'rgba(74,35,102,0.35)'; q.beginPath(); q.moveTo(gx + 1, gy - z + 1); q.lineTo(gx + z * 0.8 + 1, gy + 1); q.lineTo(gx + 1, gy + z + 1); q.lineTo(gx - z * 0.8 + 1, gy + 1); q.fill();
    q.fillStyle = c; q.beginPath(); q.moveTo(gx, gy - z); q.lineTo(gx + z * 0.8, gy); q.lineTo(gx, gy + z); q.lineTo(gx - z * 0.8, gy); q.fill();
    q.fillStyle = 'rgba(255,255,255,0.95)'; q.fillRect(gx - 0.8, gy - z * 0.6, 1.6, 1.6);
    S.glitCount++; S.added = true; S.stepUsed = true; if (S.specks.length < 1500) S.specks.push([x, y]);
  } else if (R() < 0.25) { const q = fx.pile.getContext('2d'); q.fillStyle = c; q.fillRect(x - 1.5, y - 1.5, 3, 3); }
}
function gemTap(p) {
  const s = S.soap, hit = S.gems.findIndex((gm) => Math.hypot(cfg.bar.x + gm.x - p[0], cfg.bar.y + gm.y - p[1]) < 34);
  if (hit >= 0) { S.gems.splice(hit, 1); SFX.pick(); return; }
  const [cx, cy] = barXY(p[0], p[1]), i = (cy | 0) * s.w + (cx | 0);
  if (cx < 0 || cy < 0 || cx >= s.w || cy >= s.h || !s.m[i]) { S.gemSel = -1; return; } // a tap off the soap puts the tweezers down
  if (S.gems.length >= 3) { wiggle = { k: 'gemsfull', t: 0 }; SFX.no(); return; }
  S.gems.push({ id: cfg.gems[S.gemSel].id, x: cx, y: cy, t: 0 }); S.added = true; S.stepUsed = true;
  SFX.clink(); buzz('tap'); fx.twinkle(p[0], p[1], 26, 0.6); burst(p[0], p[1], 6, false);
}
/** The two tray rows: glitter colours and gems; locked ones show a price. */
function trayItems() {
  return [cfg.glitters.map((x, j) => ({ k: 'glitters', id: x.id, j, locked: !owns('glitters', x.id) })), cfg.gems.map((x, j) => ({ k: 'gems', id: x.id, j, locked: !owns('gems', x.id) }))];
}
function trayTap(p) {
  const rows = trayItems();
  for (let row = 0; row < 2; row++) for (const it of rows[row]) {
    const [x, y] = slotXY(row, it.j); if (Math.hypot(p[0] - x, p[1] - y) > 52) continue;
    if (it.locked) return buy(it.k, it.id, () => select(it));
    return select(it);
  }
}
function select(it) {
  if (it.k === 'glitters') { S.glitSel = it.j; S.gemSel = -1; } else S.gemSel = it.j;
  S.used = true; SFX.pick(); buzz('tap');
}
/** Buy item id of kind for the current price, or wiggle when coins are short. */
function buy(kind, id, then) {
  const c = price();
  if (save.coins < c) { wiggle = { k: kind + id, t: 0 }; coinPulse = 1; SFX.no(); buzz('error'); return false; }
  save.coins -= c; coinShown = save.coins; save.buys++; save.owned[kind].push(id); save.fresh = { k: kind, id };
  SFX.unlock(); buzz('success'); burst(360, 640, 30, true); persist();
  if (then) then();
  return true;
}
function shelfTap(p) {
  if (inRect(LANGB(), p)) { lang = save.lang = LANGS[(LANGS.indexOf(lang) + 1) % LANGS.length]; SFX.pick(); persist(); return; }
  if (freeOpen() && inRect(FREEB(), p)) { freeNext = true; view = 'play'; SFX.unlock(); if (S.step === 0 && !S.used) newOrder(save.n, true); return; } // an untouched soap turns free now, else the next one
  const shop = cfg.marbles.filter((m) => m.shop);
  for (let j = 0; j < shop.length; j++) { const [x, y] = SHOP_XY(j); if (Math.hypot(p[0] - x, p[1] - y) < 52 && !owns('marbles', shop[j].id)) return buy('marbles', shop[j].id); }
  for (let i = 0; i < save.shelf.length; i++) { const [x, y] = SHELF_CELL(i); if (Math.abs(p[0] - x - 75) < 80 && Math.abs(p[1] - y - 70) < 90) { photoSel = i; view = 'photo'; SFX.pick(); return; } }
}
function bindInput() {
  if (cv.__bound) return; cv.__bound = true;
  cv.addEventListener('pointerdown', (e) => { if (mode !== 'play' || penId !== null) return; penId = e.pointerId; try { cv.setPointerCapture(e.pointerId); } catch (x) { /* fine */ } down(point(e), e.pointerType !== 'mouse'); });
  cv.addEventListener('pointermove', (e) => { if (e.pointerId !== penId || mode !== 'play') return; const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : []; if (evs.length > 1) for (const c of evs) move(point(c)); else move(point(e)); });
  const end = (e) => { if (e.pointerId !== penId) return; penId = null; up(); startAudio(); };
  cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end);
  document.addEventListener('visibilitychange', () => { if (!ac) return; if (document.hidden) ac.suspend().catch(() => {}); else ac.resume().catch(() => {}); });
}

// ---------- update ----------
function update(dt) {
  bootT += dt; if (!S) return;
  if (fx) fx.step(dt);
  if (shake > 0) shake = Math.max(0, shake - dt * 1.8);
  coinPulse = Math.max(0, coinPulse - dt * 2.5); if (wiggle && (wiggle.t += dt) > 0.5) wiggle = null;
  for (let i = coinsFlying.length - 1; i >= 0; i--) { const c = coinsFlying[i]; c.t += dt; if (c.t > 0.7) { coinsFlying.splice(i, 1); coinShown = Math.min(save.coins, coinShown + c.v); coinPulse = 1; SFX.coin(); } }
  if (!coinsFlying.length && !(S.reveal && !S.reveal.paid)) coinShown = save.coins;
  if (mode !== 'play') { S.t += dt; return; }
  S.t += dt; S.oopsT += dt;
  if (S.pileFade > 0) S.pileFade = Math.max(0, S.pileFade - dt * 2);
  if (S.charm && S.charm.state === 'out') S.charm.t += dt;
  if (S.enter > 0) { S.enter = Math.max(0, S.enter - dt); return; }
  if (S.moodT > 0 && (S.moodT -= dt) <= 0 && S.step !== 3) S.mood = 'calm';
  if (view !== 'play') return;
  if (!pen) S.idle += dt;
  if (S.trim) { stepTrim(dt); return; }
  if (S.step === 0) {
    if ((S.islandT += dt) > 0.25 && S.dirtyIsl) { S.islandT = 0; dropIslands(); }
    if (carvedShare(S.soap) >= (S.order.free ? 2 : cfg.carveDone)) finishCarve();
  } else if (S.step === 1) {
    if (every('rough', 150)) S.rough = meanRough(S.soap, S.edges);
    if (S.rough <= cfg.smoothDone) finishSmooth();
  } else if (S.step === 2) {
    if (S.added && !pen && S.t - S.lastAct > cfg.sparkleAuto) finishSparkle();
    if (S.specks.length && every('twk', quality ? 120 : 50)) { const sp = S.specks[Math.floor(R() * S.specks.length)]; fx.twinkle(sp[0], sp[1], 6 + R() * 6, 0.45); }
    for (const gm of S.gems) gm.t += dt;
  } else if (S.step === 3) stepReveal(dt);
}

// ---------- draw ----------
const booting = () => bootT < 2.5 && !settled() && !ready('studio_bg');
/** The table art with its vignette, made once (again when the painted table arrives). */
function makeBase() {
  base = base || document.createElement('canvas'); base.width = W; base.height = H;
  const q = base.getContext('2d');
  if (!drawTable(q, W, H)) { const gr = q.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#FFE1B8'); gr.addColorStop(1, '#F7C98F'); q.fillStyle = gr; q.fillRect(0, 0, W, H); q.fillStyle = '#BFF0DD'; roundRect(q, 60, 300, 600, 720, 40); q.fill(); base.__plain = true; }
  else base.__plain = false;
  q.drawImage(vig || (vig = vignette(W, H)), 0, 0);
}
/** A table canvas back to the bare table: the pile of shavings lands on it. */
function freshTable(c) { if (!base) makeBase(); c.getContext('2d').drawImage(base, 0, 0); }
function drawBack() {
  if (!base || (base.__plain && ready('studio_bg'))) { makeBase(); for (const c of tables) freshTable(c); }
  g.drawImage(tables[ti], 0, 0);
  if (S && S.pileFade > 0) { g.globalAlpha = S.pileFade; g.drawImage(tables[1 - ti], 0, 0); g.globalAlpha = 1; }
}
function draw() {
  g.setTransform(RES, 0, 0, RES, 0, 0);
  if (shake > 0 && !reduced()) { const k = shake * shake * 10; g.translate((R() - 0.5) * k, (R() - 0.5) * k); }
  drawBack();
  if (!S) return;
  if (S.step === 3) drawBath();
  else drawWork();
  fx.draw(g);
  if (S.step < 3 && view === 'play') drawTool();
  g.setTransform(RES, 0, 0, RES, 0, 0);
  drawChrome();
  if (view === 'play') {
    if (S.step < 3) drawRing();
    drawCharm();
    if (checkShown()) drawCheck();
    if (trayShown()) drawTray();
    if (handShown()) drawHand();
    if (S.step === 3) drawResult();
  } else drawShelf();
  for (const c of coinsFlying) { if (c.t < 0) continue; const k = ease(c.t / 0.7), [tx, ty] = [rtl() ? mx(20, 230) + 187 : 63, 64]; coinIcon(c.x + (tx - c.x) * k, c.y + (ty - c.y) * k - Math.sin(k * Math.PI) * 120, 22); }
}
function drawWork() {
  const b = cfg.bar, k = S.enter > 0 ? back3(1 - S.enter / 0.7) : 1, oy = (1 - k) * -700;
  if (paint(S.soap) > 0 && DEBUG) window.__painted = (window.__painted || 0) + 1;
  g.drawImage(S.soap.canvas, b.x - cfg.margin, b.y - cfg.margin + oy);
  if (S.step >= 2 || S.glitCount) g.drawImage(S.glitLayer, b.x - cfg.margin, b.y - cfg.margin + oy);
  for (const gm of S.gems) { const s = 62 * popIn(gm.t); g.fillStyle = 'rgba(92,52,70,0.25)'; g.beginPath(); g.ellipse(b.x + gm.x + 4, b.y + gm.y + 8, s * 0.4, s * 0.22, 0, 0, TAU); g.fill(); if (!drawCellAt(g, 'gems_sheet', gemCell(gm.id), b.x + gm.x, b.y + gm.y + oy, s, 62)) { glossDisc(g, b.x + gm.x, b.y + gm.y, s / 2.4, '#FF4D6D'); } }
  if (S.step === 0 && !S.order.free) drawOutline(oy);
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
function drawTool() {
  let x, y;
  if (pen) { x = pen.x; y = pen.y; }
  else if (handShown()) { const h = handAt(); x = h[0]; y = h[1]; }
  else return;
  if (S.step === 0) { const ok = drawCell(g, 'tools_sheet', 0, x - 55, y + 55, 150, 0); if (!ok) { g.strokeStyle = '#C0C8D8'; g.lineWidth = 10; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 60, y - 60); g.stroke(); } }
  else if (S.step === 1) { if (!drawCell(g, 'tools_sheet', 1, x, y, 118, -0.2)) glossDisc(g, x, y, 44, '#FFE066'); }
  else if (S.step === 2 && S.gemSel < 0) { if (!drawCell(g, 'tools_sheet', 2, x + 6, y - 46 + Math.sin(S.t * 30) * (pen ? 4 : 0), 112, Math.PI * 0.85)) glossDisc(g, x, y - 40, 34, '#FF9CC8'); }
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
  const x = mx(20, 230), wig = wiggle && wiggle.k.startsWith('coin') ? Math.sin(wiggle.t * 40) * 6 : 0, pop = 1 + coinPulse * 0.12;
  g.save(); g.translate(x + 115 + wig, 64); g.scale(pop, pop);
  glossPill(g, -115, -38, 230, 76, '#FFFFFF', '#FFC94D'); coinIcon(rtl() ? 72 : -72, 0, 28);
  g.direction = 'ltr'; g.font = `800 42px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = PLUM; g.fillText(String(Math.floor(coinShown)), rtl() ? -22 : 22, 4);
  g.restore();
  disc(MUTE(), (cx, cy, s) => iconSound(cx, cy, s * 0.7, save.muted));
  disc(SHELFB(), (cx, cy, s) => (view === 'play' ? iconShelf(cx, cy, s * 0.8) : iconX(cx, cy, s * 0.8)));
  if (view === 'play' && save.shelf.length && S.step === 3 && S.reveal && S.reveal.t > 3.5) { const b = SHELFB(); g.fillStyle = PINK; g.beginPath(); g.arc(b.x + b.s - 10, b.y + 12, 13, 0, TAU); g.fill(); }
}
/** HUD, step row, prompt and order card: drawn into one layer, again only when what they show changes. */
function drawChrome() {
  const live = S.enter > 0 || S.oopsT < 1.1 || S.t - (S.promptAt || 0) < 0.4 || coinPulse > 0 || wiggle || coinsFlying.length || view !== 'play' || S.step === 3;
  const key = [lang, view, S.n, S.step, !!S.trim, S.mood, Math.floor(coinShown), save.muted, S.gemSel >= 0, S.promptKey, save.shelf.length].join('|');
  if (live) { drawHud(); if (view === 'play' && S.step < 3) { drawSteps(); drawPrompt(); drawOrder(); } chromeKey = ''; return; }
  if (key !== chromeKey) {
    chromeKey = key;
    if (!chrome) { chrome = document.createElement('canvas'); chrome.width = W; chrome.height = 420; }
    const keep = g; g = chrome.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, W, 420);
    drawHud(); drawSteps(); drawPrompt(); drawOrder();
    g = keep;
  }
  g.drawImage(chrome, 0, 0);
}
/** The progress ring around the current step, drawn every frame over the cached step row. */
function drawRing() {
  if (S.trim || S.enter > 0) return;
  const i = S.step, [x, y] = stepXY(i), r = 40;
  const k = i === 0 ? carvedShare(S.soap) / cfg.carveDone : i === 1 ? (1 - S.rough) / (1 - cfg.smoothDone) : Math.min(1, S.glitCount / 400 + S.gems.length / 3);
  g.strokeStyle = GREEN; g.lineWidth = 7; g.lineCap = 'round'; g.beginPath(); g.arc(x, y, r + 7, -Math.PI / 2, -Math.PI / 2 + TAU * Math.max(0.02, Math.min(1, k)) * (rtl() ? -1 : 1), rtl()); g.stroke();
}
function drawSteps() {
  const cur = S.trim ? 0 : S.step;
  g.strokeStyle = 'rgba(255,255,255,0.85)'; g.lineWidth = 8; g.beginPath(); g.moveTo(stepXY(0)[0], 160); g.lineTo(stepXY(3)[0], 160); g.stroke();
  for (let i = 0; i < 4; i++) {
    const [x, y] = stepXY(i), on = i === cur, doneI = i < cur, r = on ? 40 : 32;
    glossDisc(g, x, y, r, doneI ? '#7BE495' : on ? '#FFFFFF' : '#F4E9FF', on ? '#FF5FA2' : '#FFFFFF');
    if (STEP_TOOLS[i] >= 0) drawCell(g, 'tools_sheet', STEP_TOOLS[i], x, y, r * 1.5); else if (!drawBowl(g, x, y, r * 1.6)) glossDisc(g, x, y, r * 0.6, '#7FD6FF');
  }
}
function drawPrompt() {
  const key = S.trim ? 'carve' : STEP_KEYS[S.step], age = S.t - (S.promptAt || 0);
  if (S.promptKey !== key) { S.promptKey = key; S.promptAt = S.t; }
  const oops = S.oopsT < 1.1, txt = oops ? T('oops') : T(key === 'carve' && S.order.free ? 'carveFree' : key), cx = mx(232);
  banner(txt, cx, 262 + (oops ? Math.sin(S.oopsT * 30) * 3 : 0), 36, 380, oops ? '#E0245E' : PLUM, popIn(oops ? S.oopsT : age));
  if (S.order.golden && S.step === 0) banner(T('golden'), cx, 352, 28, 360, '#B87400', 1, '#FFF4C2');
  else if (S.step === 2 && S.gemSel >= 0) banner(T('gem'), cx, 352, 28, 360, PLUM, 1);
}
function drawOrder() {
  const o = ORDER(), k = S.enter > 0 ? back3(1 - S.enter / 0.7) : 1, ox = (1 - k) * (rtl() ? -320 : 320);
  g.save(); g.translate(ox, 0);
  panel(g, o.x, o.y, o.w, o.h, 30);
  const face = cellCanvas('customer_' + S.order.customer, MOOD[S.mood] ?? 0, 150);
  const px = rtl() ? o.x + o.w - 78 : o.x + 78;
  if (face) { g.save(); roundRect(g, px - 68, o.y + 14, 136, 150, 22); g.clip(); g.drawImage(face, Math.round(px - face.width / 2), o.y + 12); g.restore(); }
  else glossDisc(g, px, o.y + 90, 56, '#FFD9C2');
  // what they want: the shape in the soap's colour
  const sx = rtl() ? o.x + 60 : o.x + o.w - 60, sy = o.y + 82, mb = MARBLE(S.order.marble);
  g.save(); g.translate(sx - 40, sy - 40); g.scale(0.8, 0.8); g.fillStyle = mb.kind === 'layers' ? '#FFB3E0' : mb.base; g.fill(pathOf(S.order.shape)); g.lineWidth = 5; g.strokeStyle = '#FFFFFF'; g.stroke(pathOf(S.order.shape)); g.restore();
  // reward and wishes
  const ry = o.y + o.h - 30; coinIcon(px - 28, ry, 18);
  g.font = `800 30px ${FONT}`; g.fillStyle = PLUM; g.textAlign = 'left'; g.textBaseline = 'middle'; g.direction = 'ltr'; g.fillText(String(cfg.coinPerStar * 3 * (S.order.golden ? 2 : 1)), px - 4, ry + 2);
  let wx = sx - 26;
  if (S.order.glitter) { const gl = cfg.glitters.find((x) => x.id === S.order.glitter); glossDisc(g, wx, ry, 17, gl.c); wx += 44; }
  if (S.order.gem) drawCell(g, 'gems_sheet', gemCell(S.order.gem), wx, ry, 38);
  if (S.order.charm !== null && !S.order.free) { g.fillStyle = PINK; words('?', sx + 34, o.y + 30, 30, 40, '#FFFFFF', PINK); }
  g.restore();
}
function drawCheck() { const b = CHECK(), r = b.s / 2, p = 1 + Math.sin(S.t * 6) * 0.05; g.save(); g.translate(b.x + r, b.y + r); g.scale(p, p); glossDisc(g, 0, 0, r, GREEN); g.strokeStyle = '#FFFFFF'; g.lineWidth = 12; g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath(); g.moveTo(-r * 0.36, 0); g.lineTo(-r * 0.08, r * 0.28); g.lineTo(r * 0.4, -r * 0.3); g.stroke(); g.restore(); }
function drawTray() {
  panel(g, 14, 908, 692, 180, 34);
  const rows = trayItems();
  for (let row = 0; row < 2; row++) for (const it of rows[row]) {
    const [x, y] = slotXY(row, it.j), wig = wiggle && wiggle.k === it.k + it.id ? Math.sin(wiggle.t * 40) * 6 : 0;
    const sel = row === 0 ? S.gemSel < 0 && S.glitSel === it.j : S.gemSel === it.j;
    if (sel) { g.fillStyle = 'rgba(255,95,162,0.25)'; g.beginPath(); g.arc(x, y, 50, 0, TAU); g.fill(); g.strokeStyle = PINK; g.lineWidth = 5; g.stroke(); }
    if (row === 0) { glossDisc(g, x + wig, y, 34, cfg.glitters[it.j].c, '#FFFFFF'); for (let k = 0; k < 5; k++) { g.fillStyle = 'rgba(255,255,255,0.9)'; g.fillRect(x + wig - 14 + ((k * 37) % 28), y - 10 + ((k * 23) % 22), 3, 3); } }
    else if (!drawCell(g, 'gems_sheet', cfg.gems[it.j].cell, x + wig, y, 70)) glossDisc(g, x + wig, y, 30, '#FF4D6D');
    if (it.locked) { g.fillStyle = 'rgba(255,255,255,0.55)'; g.beginPath(); g.arc(x, y, 40, 0, TAU); g.fill(); lock(x + 22, y - 18, 30); priceTag(x, y + 32); }
  }
}
function priceTag(x, y) { glossPill(g, x - 40, y - 15, 80, 30, '#FFFFFF', '#FFC94D'); coinIcon(x - 22, y, 11); g.font = `800 20px ${FONT}`; g.fillStyle = PLUM; g.textAlign = 'center'; g.textBaseline = 'middle'; g.direction = 'ltr'; g.fillText(String(price()), x + 10, y + 1); }

// ---------- helper hand ----------
const handShown = () => mode === 'play' && view === 'play' && S.step < 3 && S.enter <= 0 && !S.trim && !pen && (S.n === 0 && !S.stepUsed ? true : S.idle > cfg.idleHand);
/** Where the hand is now: it acts out the current step's gesture on a loop. */
function handAt() {
  const b = cfg.bar, t = (S.t % 1.6) / 1.6, f = S.fit;
  if (S.step === 0) { // a stroke across the soap above the shape, where there is still soap
    let y = b.y + Math.max(24, f.oy * 0.5);
    for (let yy = 16; yy < b.h - 16; yy += 12) { const row = yy * b.w; let n = 0; for (let x = 10; x < b.w - 10; x += 8) if (S.soap.m[row + x] && S.soap.sd[row + x] < -cfg.knifeR) n++; if (n > 6) { y = b.y + yy; break; } }
    return [b.x + 30 + (b.w - 60) * ease(t), y];
  }
  if (S.step === 1) { const a = Math.sin(t * TAU * 2), y = b.y + f.oy + 30 * f.s; return [b.x + f.ox + 10 * f.s + a * 26, y + Math.cos(t * TAU) * 20]; }
  const [x, y] = [b.x + b.w / 2 + Math.sin(t * TAU) * 60, b.y + b.h * 0.42];
  return [x, y];
}
function drawHand() {
  const [x, y] = handAt(), press = S.step === 0 || S.step === 1 || ((S.t % 1.6) / 1.6 > 0.5);
  g.save(); g.translate(x, y + (S.step < 2 ? 56 : 0)); const k = press ? 0.92 : 1; g.scale(k, k); g.rotate(-0.35);
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
  }
  // the customer and the three bars
  if (t > 0.9) {
    const k = ease((t - 0.9) / 0.4), y0 = 856 + (1 - k) * 300;
    panel(g, 20, y0, 680, 118, 30);
    const face = cellCanvas('customer_' + S.order.customer, MOOD[S.mood] ?? 0, 120), fxp = mx(30, 100);
    if (face) { g.save(); roundRect(g, fxp, y0 + 6, 100, 106, 20); g.clip(); g.drawImage(face, Math.round(fxp + 50 - face.width / 2), y0 + 4); g.restore(); }
    if (S.order.free) words(T('thanks'), 400, y0 + 60, 40, 480, PLUM);
    else {
      const vals = [S.score.shape, S.score.smooth, S.score.sparkle], keys = ['shape', 'smoothBar', 'sparkleBar'], cols = ['#FF5FA2', '#3EC5FF', '#FFC928'];
      for (let i = 0; i < 3; i++) {
        const by = y0 + 22 + i * 32, bx = mx(140, 540), fill = i < rv.bars ? ease((t - 1.1 - i * 0.45) / 0.4) * vals[i] : 0;
        g.textAlign = rtl() ? 'right' : 'left'; g.direction = rtl() ? 'rtl' : 'ltr'; g.font = `800 22px ${FONT}`; g.fillStyle = PLUM; g.textBaseline = 'middle';
        g.fillText(T(keys[i]), rtl() ? bx + 540 : bx, by + 2); g.direction = 'ltr';
        const tx = mx(270, 400);
        g.fillStyle = 'rgba(74,35,102,0.12)'; roundRect(g, tx, by - 10, 400, 22, 11); g.fill();
        if (fill > 0) { g.fillStyle = cols[i]; roundRect(g, rtl() ? tx + 400 - 400 * fill : tx, by - 10, Math.max(22, 400 * fill), 22, 11); g.fill(); g.fillStyle = 'rgba(255,255,255,0.45)'; roundRect(g, rtl() ? tx + 400 - 400 * fill + 6 : tx + 6, by - 7, Math.max(10, 400 * fill - 12), 6, 3); g.fill(); }
      }
    }
  }
  if (t > 1.5) { const p = 1 + Math.sin(t * 5) * 0.06; g.save(); g.translate(NEXT.x, NEXT.y); g.scale(p, p); glossDisc(g, 0, 0, NEXT.r, GREEN); g.fillStyle = '#FFFFFF'; g.beginPath(); g.moveTo(-14, -22); g.lineTo(24, 0); g.lineTo(-14, 22); g.closePath(); g.fill(); g.restore(); }
}

// ---------- shelf ----------
/** A small render of a saved soap for the shelf (made once, one per frame). */
function thumbOf(e) {
  if (THUMBS.has(e)) return THUMBS.get(e);
  if (thumbOf.busy === bootT) return null; thumbOf.busy = bootT;
  const b = cfg.bar, w = Math.round(b.w / 3), h = Math.round(b.h / 3), m = decodeMask(e.m, w, h);
  if (!m) { THUMBS.set(e, null); return null; }
  const K = { protect: 3, core: 8, tol: 10, bevel: 2, depth: 10, margin: 7, shadowX: 3, shadowY: 3 };
  const s = makeSoap(w, h, m, m, K), c = document.createElement('canvas'), mb = MARBLE(e.mb);
  attachPaint(s, c, albedoOf(mb.id, w, h), mb.inner);
  const q = c.getContext('2d'), r = rng(e.gc + 5), gl = cfg.glitters[e.g] || cfg.glitters[0];
  for (let k = 0, n = Math.min(400, e.gc / 3); k < n; k++) { const x = Math.floor(r() * w), y = Math.floor(r() * h); if (m[y * w + x]) { q.fillStyle = gl.c; q.fillRect(x + K.margin, y + K.margin, 1.5, 1.5); } }
  for (const [id, x, y] of e.gems) { const cc = cellCanvas('gems_sheet', gemCell(id), 16); if (cc) q.drawImage(cc, x / 3 + K.margin - 8, y / 3 + K.margin - 8); }
  const out = thumbFrom(c); THUMBS.set(e, out); return out;
}
function drawShelf() {
  const wall = g.createLinearGradient(0, 120, 0, H); wall.addColorStop(0, '#FFF3E6'); wall.addColorStop(1, '#FFE3EE');
  g.fillStyle = wall; g.fillRect(0, 120, W, H - 120);
  words(T('shelf'), 360, 172, 52, 600, PLUM, '#FFFFFF');
  for (let row = 0; row < 3; row++) { const y = 226 + row * 182 + 150; g.fillStyle = '#E3A869'; roundRect(g, 18, y, 684, 22, 10); g.fill(); g.fillStyle = '#C98345'; g.fillRect(26, y + 18, 668, 8); }
  if (view === 'photo' && save.shelf[photoSel]) {
    const e = save.shelf[photoSel], th = thumbOf(e);
    g.fillStyle = 'rgba(74,35,102,0.55)'; g.fillRect(0, 0, W, H);
    rays(g, 360, 600, 420, S.t, 0.6);
    if (th) g.drawImage(th, 360 - th.width * 1.6, 600 - th.height * 1.6, th.width * 3.2, th.height * 3.2);
    for (let i = 0; i < 3; i++) { starPath(360 + (i - 1) * 100, 960, 42); g.fillStyle = i < e.s ? '#FFD23F' : 'rgba(255,255,255,0.4)'; g.fill(); g.lineWidth = 5; g.strokeStyle = '#FFFFFF'; g.stroke(); }
    return;
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
  MARB_TH.set(mb.id, c); return c;
}

// ---------- frame and speed ----------
function setRes(k) { if (k === RES) return; RES = k; cv.width = Math.round(W * k); cv.height = Math.round(H * k); }
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
  if (DEBUG) { const a = performance.now(); update(dt); const b = performance.now(); draw(); const c = performance.now(); const p = (window.__prof = window.__prof || { u: 0, d: 0, n: 0 }); p.u += b - a; p.d += c - b; p.n++; window.__frames = (window.__frames || 0) + 1; }
  else { update(dt); draw(); }
}

// ---------- save ----------
const int = (v, lo, hi) => (Number.isInteger(v) && v >= lo && v <= hi ? v : null);
/** A stored shelf soap, or null when anything about it is wrong. */
function cleanEntry(e) {
  if (!e || typeof e !== 'object' || !decodeMask(e.m, 48, 60)) return null;
  if (!cfg.marbles.some((m) => m.id === e.mb) || int(e.g, 0, cfg.glitters.length - 1) === null || int(e.gc, 0, 100000) === null || int(e.s, 0, 3) === null) return null;
  if (!(e.sh === 'free' || cfg.shapes.some((s) => s.id === e.sh)) || !Array.isArray(e.gems) || e.gems.length > 3) return null;
  const gems = e.gems.filter((x) => Array.isArray(x) && cfg.gems.some((gm) => gm.id === x[0]) && int(x[1], 0, cfg.bar.w) !== null && int(x[2], 0, cfg.bar.h) !== null).map((x) => [x[0], x[1], x[2]]);
  return { m: e.m, mb: e.mb, g: e.g, gc: e.gc, gems, s: e.s, sh: e.sh };
}
/** Merge the stored save into the current one, once; progress made before it arrived is added on top. */
function applySave(st) {
  if (!st || typeof st !== 'object' || merged) return;
  merged = true;
  const n0 = int(st.n, 0, 1e6) || 0, before = save.n;
  save.n = n0 + save.n; save.coins = (int(st.coins, 0, 1e7) || 0) + save.coins; save.stars = (int(st.stars, 0, 1e7) || 0) + save.stars; save.buys = (int(st.buys, 0, 1000) || 0) + save.buys;
  const ow = st.owned && typeof st.owned === 'object' ? st.owned : {};
  for (const k of ['marbles', 'glitters', 'gems']) if (Array.isArray(ow[k])) for (const id of ow[k]) if (cfg[k].some((x) => x.id === id && x.shop) && !save.owned[k].includes(id)) save.owned[k].push(id);
  if (Array.isArray(st.shelf)) for (const e of st.shelf.slice(0, 12)) { const c = cleanEntry(e); if (c && save.shelf.length < 12) save.shelf.push(c); }
  if (Array.isArray(st.charms)) for (const c of st.charms) if (int(c, 0, 7) !== null && !save.charms.includes(c)) save.charms.push(c);
  if (st.fresh && ['marbles', 'glitters', 'gems'].includes(st.fresh.k) && cfg[st.fresh.k].some((x) => x.id === st.fresh.id) && !save.fresh) save.fresh = { k: st.fresh.k, id: st.fresh.id };
  if (!muteTouched && typeof st.muted === 'boolean') save.muted = st.muted;
  if (!save.lang && typeof st.lang === 'string' && cfg.strings[st.lang]) lang = save.lang = st.lang;
  coinShown = save.coins;
  if (n0 > 0 && before === 0 && !touched && view === 'play') newOrder(save.n, false); // a returning player meets their next customer
}

/** Entry point. The host calls this on start and on every reload. */
function run(m) {
  const me = ++runs;
  mode = m; cfg = window.gameConfig;
  cv = document.getElementById('game') || document.body.appendChild(Object.assign(document.createElement('canvas'), { id: 'game' }));
  cv.style.cssText = 'display:block;width:min(100vw,calc(100vh*9/16));height:min(100vh,calc(100vw*16/9));touch-action:none;margin:auto';
  cv.width = Math.round(W * RES); cv.height = Math.round(H * RES);
  g = cv.getContext('2d');
  if (!fx) { tables = [0, 1].map(() => Object.assign(document.createElement('canvas'), { width: W, height: H })); fx = createFx(tables[0]); ti = 0; }
  loadSprites(cfg.sprites); bootT = 0;
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
  cancelAnimationFrame(raf); pen = null; penId = null;
  lang = save.lang || detectLang();
  if (mode !== 'play' || !S || S.edit) { view = 'play'; fx.clear(); newOrder(mode === 'play' ? save.n : 0, false); S.edit = mode !== 'play'; }
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
  window.lib = { showGameParameters() {}, log() {}, getAsset: (id) => (window.__noAssets ? undefined : { url: './' + id + '.webp', type: 'image' }), getUserGameState: read, saveUserGameState: (s) => { (window.__writes = window.__writes || []).push(JSON.parse(JSON.stringify(s))); return none(); }, addPlayerScoreToLeaderboard: none, haptics: { play() {}, start() {}, stop() {} } };
  window.__game = {
    get S() { return S; }, get save() { return save; }, set save(v) { save = v; }, get view() { return view; }, set view(v) { view = v; }, get cfg() { return cfg; }, get lang() { return lang; }, setLang(l) { lang = save.lang = l; },
    get quality() { return quality; }, set quality(q) { quality = q; }, get fx() { return fx; }, get pen() { return pen; }, get coinShown() { return coinShown; },
    booting, T, detectLang, applySave, newOrder, makeOrder, finishCarve, finishSmooth, finishSparkle, nextOrder, checkShown, handShown, handAt, trayItems, price, carvedShare: () => carvedShare(S.soap),
    MUTE, SHELFB, CHECK, NEXT, ORDER, slotXY, stepXY, SHELF_CELL, SHOP_XY, LANGB, FREEB, BOWL, freeOpen, set freeNext(v) { freeNext = v; },
  };
  const q = new URLSearchParams(location.search);
  fetch('game_config.json').then((r) => r.json()).then((c) => { window.gameConfig = { ...c, ...JSON.parse(q.get('cfg') || '{}') }; run(q.get('mode') || 'play'); });
}
