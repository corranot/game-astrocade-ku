// PROTOTYPE - NOT FOR PRODUCTION
/**
 * Crazy Hair Salon: Cut & Color. A hair salon makeover game for kids (makeover, creative, casual, ASMR):
 * a cute customer with wild messy hair sits in the chair; the player washes, cuts, dyes, blow-dries and
 * decorates the hair with one finger, then the customer sees the result and gives 1-3 stars.
 *
 * Every customer brings an order card: the hair length, colour (two colours from customer 4) and accessory
 * they want. The five steps each use their own gesture: rub to lather (then the rinse runs by itself), drag
 * the scissors across the strands along the dotted line, paint with the chosen dye, hold to blow-dry, tap
 * accessories. The hair is real strands (hair.js): cut strands fall, painted points change colour, the dryer
 * blows and fluffs them. There is no fail: stars only say how close the result is to the order. Stars give
 * coins; coins buy new dyes and accessories, and the next order asks for what was just bought. The last 9
 * results hang on the salon wall as photos. A helper hand shows each gesture on the first customer and comes
 * back whenever the player waits. Text is a short command per step in the device's language (7 languages,
 * Arabic right to left; the globe on the wall changes it). Tunable numbers live in game_config.json.
 */
import { W, H, NAVY, WHITE, CORAL, SUNNY, MINT, SKY, VIOLET, ORANGE, SHADOW, rr, box, oval, star, drawSalon, drawChair, drawBody, drawHead, drawEars, CUSTOMERS, CUSTOMER_TYPES, ACCESSORIES, drawAcc, icon, pot, hand } from './art.js';
import { PLUM, PINK, GREEN, glossDisc, glossPill, sphere, panel, rays, vignette } from './ui.js';
import { startGL, stopGL, glOn, glHasArt, drawGL, clearHair } from './gl.js';
import { loadSprites, ready, settled, drawWhole, drawBust, drawAccSprite, drawToolSprite, drawRoom } from './sprites.js';
import { rng, COLORS, FREE_COLORS, colorOf, createHair, placeHair, stepHair, cutHair, trimToY, fillUnpainted, foamAt, paintAt, count, rinse, drawHair, encodeHair, hairFromCode } from './hair.js';

const DEBUG = location.search.includes('local');
const STEPS = ['wash', 'cut', 'dye', 'dry', 'deco'], STEP_ICONS = ['foam', 'scissors', 'brush', 'dryer', 'bow'];
const HEAD = { x: 360, y: 600, R: 200 }, FIX = 1 / 60, BROWN = 10, FREE_ACC = 5, MAX_PIECES = 40;
const MUTE = { x: 612, y: 22, s: 92 }, WALLB = { x: 506, y: 22, s: 92 }, CHECK = { x: 566, y: 724, s: 112 };
const NEXT = { x: 290, y: 930, s: 140 }, BACK = { x: 300, y: 950, s: 120 }, LANGB = { x: 600, y: 30, s: 92 };
const ORDER = { x: 560, y: 204, w: 142, h: 176 }, TRAY_Y = 856, CELL = { x: 30, y: 152, w: 216, h: 250, dx: 226, dy: 258 };
const LANGS = ['en', 'ar', 'es', 'vi', 'hi', 'bn', 'id'];
const FONT = "'Baloo 2', 'Baloo Da 2', 'Baloo Bhaijaan 2', system-ui, 'Noto Sans', 'Noto Sans Arabic', 'Noto Sans Devanagari', 'Noto Sans Bengali', sans-serif";
const CONFETTI = [SUNNY, CORAL, MINT, VIOLET, SKY, '#FF8FC7'];
const ease = (k) => 1 - Math.pow(1 - Math.max(0, Math.min(1, k)), 3);

let cv, g, cfg, mode, raf = 0, last = 0, acc = 0, runs = 0;
let save = { n: 0, coins: 0, stars: 0, colors: [], acc: [], wall: [], fresh: null, muted: false, lang: null }, saveRead = false, merged = false, muteTouched = false;
let view = 'play', S = null, lang = 'en', parts = [], back = null, photos = [], wallSel = -1, wallT = 0;
let pen = null, penId = null, touched = false, bound = false, coinShown = 0, coinPulse = 0, shakeId = null, shakeT = 0, gain = null;
let glSlow = 0, stageEl = null, vig = null, quality = 0, frameTimes = [], slow = 0, fast = 0, RES = 1, roomDrawn = false, bootT = 0; // RES: canvas pixels per game pixel, lowered on slow phones
let ac = null, noiseBuf = null, dryNode = null, dryOn = false;
const throttle = {};
const every = (key, ms) => { const t = performance.now(); if (t - (throttle[key] || 0) < ms) return false; throttle[key] = t; return true; };

// ---------- words ----------
/** Player-facing text for key k in the current language; English when the language lacks it. */
const T = (k) => (cfg.strings[lang] && cfg.strings[lang][k]) || cfg.strings.en[k] || k;
/** The first device language the game has text for, else English. */
function detectLang() {
  for (const l of navigator.languages || [navigator.language || 'en']) { const b = String(l).toLowerCase().split('-')[0]; if (cfg.strings[b]) return b; }
  return 'en';
}
const rtl = () => (cfg.rtl || []).includes(lang);
/** Bold text centred on (x, y), shrunk until it fits maxW. */
function words(str, x, y, size, maxW, color, ltr = false) {
  g.direction = rtl() && !ltr ? 'rtl' : 'ltr'; g.textAlign = 'center'; g.textBaseline = 'middle';
  let px = size; g.font = `800 ${px}px ${FONT}`;
  while (px > 18 && g.measureText(str).width > maxW) { px -= 2; g.font = `800 ${px}px ${FONT}`; }
  g.fillStyle = color; g.fillText(str, x, y); g.direction = 'ltr';
}
/** A glossy pill with words, centred on (x, y); pop scales it for a bounce. */
function banner(str, x, y, size, maxW, color = PLUM, pop = 1) {
  g.save(); g.translate(x, y); g.scale(pop, pop);
  g.font = `800 ${size}px ${FONT}`;
  const w = Math.min(maxW, g.measureText(str).width) + 64, h = size + 34;
  glossPill(g, -w / 2, -h / 2, w, h, '#FFFFFF', '#FF9CC8');
  words(str, 0, 4, size, maxW, color);
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
/** A burst of filtered noise: foam squish, brush swish, water. */
function hiss(len, vol, freq, q = 1) {
  if (!live()) return;
  const s = ac.createBufferSource(), f = ac.createBiquadFilter(), v = ac.createGain(), t = ac.currentTime;
  s.buffer = noiseBuf; f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q;
  v.gain.setValueAtTime(vol, t); v.gain.exponentialRampToValueAtTime(0.001, t + len);
  s.connect(f).connect(v).connect(ac.destination); s.start(t, Math.random() * 0.5); s.stop(t + len + 0.02);
}
const tune = (notes, gap, len = 0.22, vol = 0.09) => notes.forEach((f, i) => beep(f, len, 'triangle', vol, 0, i * gap / 1000));
const SFX = {
  squish: () => { hiss(0.14, 0.16, 700 + Math.random() * 500, 0.9); beep(200, 0.09, 'sine', 0.05, -70); },
  snip: () => { beep(3200, 0.025, 'square', 0.04); beep(2400, 0.03, 'square', 0.04, 0, 0.05); hiss(0.05, 0.06, 5000, 2); },
  swish: () => hiss(0.16, 0.07, 2200, 0.7),
  pop: () => beep(800 + Math.random() * 500, 0.06, 'sine', 0.06, 400),
  splash: () => { hiss(0.9, 0.12, 1200, 0.5); tune([523, 659], 90, 0.15, 0.05); },
  eek: () => beep(480, 0.32, 'triangle', 0.1, 650),
  step: () => tune([659, 880, 1175], 80, 0.18, 0.08),
  place: () => { beep(660, 0.08, 'triangle', 0.08, 300); beep(1320, 0.1, 'sine', 0.04, 0, 0.06); },
  pick: () => beep(990, 0.06, 'triangle', 0.07),
  no: () => { beep(220, 0.12, 'square', 0.05); beep(180, 0.14, 'square', 0.05, 0, 0.1); },
  unlock: () => tune([784, 988, 1175, 1568], 85, 0.25, 0.1),
  star: (k) => beep(880 + k * 220, 0.25, 'triangle', 0.1),
  wow: () => { tune([523, 659, 784, 1047, 1319], 95, 0.3, 0.09); hiss(0.4, 0.05, 6000, 0.5); },
  flash: () => hiss(0.12, 0.12, 4000, 0.4),
};
function dryStart() {
  if (dryOn) return; dryOn = true;
  try { lib.haptics.start({ intensity: 0.35, sharpness: 0.25 }); } catch (e) { /* none */ }
  if (!live()) return;
  const s = ac.createBufferSource(), f = ac.createBiquadFilter(), v = ac.createGain();
  s.buffer = noiseBuf; s.loop = true; f.type = 'lowpass'; f.frequency.value = 1400; v.gain.value = 0.06;
  s.connect(f).connect(v).connect(ac.destination); s.start(); dryNode = s;
}
function dryStop() {
  if (!dryOn) return; dryOn = false;
  try { lib.haptics.stop(); } catch (e) { /* none */ }
  if (dryNode) { try { dryNode.stop(); } catch (e) { /* stopped */ } dryNode = null; }
}

// ---------- owned things and orders ----------
const ownedColors = () => [...Array(FREE_COLORS).keys()].map((i) => i + 1).concat(save.colors);
const ownedAcc = () => ACCESSORIES.slice(0, FREE_ACC).concat(save.acc);
const price = () => cfg.unlockBase + cfg.unlockStep * (save.colors.length + save.acc.length);

/** The order for customer n: always the same for the same n and the same things owned. Uses up a fresh purchase. */
function makeOrder(n) {
  const r = rng(1000 + n * 7919), pick = (a) => a[Math.floor(r() * a.length) % a.length];
  const cols = ownedColors().filter((c) => c !== BROWN);
  let c1 = n === 0 ? 1 : pick(cols), a = n === 0 ? 'bow' : pick(ownedAcc());
  const cut = n < 2 ? 1 : Math.floor(r() * 3) % 3;
  if (save.fresh && save.fresh.k === 'col' && cols.includes(save.fresh.id)) c1 = save.fresh.id;
  if (save.fresh && save.fresh.k === 'acc' && ownedAcc().includes(save.fresh.id)) a = save.fresh.id;
  if (mode === 'play') save.fresh = null;
  const others = cols.filter((c) => c !== c1), c2 = n >= 3 && n % 3 === 0 && others.length ? pick(others) : 0;
  return { type: CUSTOMER_TYPES[n % CUSTOMER_TYPES.length], cut, cols: c2 ? [c1, c2] : [c1], acc: a };
}

/** A new customer in the chair; enter slides them in from the right. */
function newCustomer(n, enter) {
  clearHair();
  const order = makeOrder(n);
  S = {
    n, order, step: 0, stepT: 0, t: 0, enter: enter ? 1 : 0, jump: 0, idle: 0, used: false, rinse: -1, eek: 0, done: -1,
    sel: order.cols[0], page: 0, placed: [], blobs: [], rub: 0, lastDeco: 0, reveal: -1, stars: 0, score: 0, gained: 0,
    head: { x: HEAD.x + (enter ? 560 : 0), y: HEAD.y, R: HEAD.R },
    hair: createHair(HEAD.R, { strands: cfg.strands, points: cfg.points, seg: cfg.seg, minLen: cfg.minLen, maxLen: cfg.maxLen, seed: 77 + n * 131 }),
  };
  S.hair.stiff = cfg.stiffWild; placeHair(S.hair, S.head.x, S.head.y);
  for (let i = 0; i < 40; i++) stepHair(S.hair, FIX, S.head, null, i * FIX); // settle into its messy shape before the first frame
  pen = null; dryStop();
}

// ---------- progress of each step ----------
/** How much is lathered: foam blobs on the painted mop, or foamed points on the strands. */
const washShare = () => (S.hair.painted ? Math.min(1, S.blobs.length / cfg.foamBlobs) * cfg.foamGoal : count(S.hair, (s, i) => s.foam[i]).share);
const onMop = (x, y) => ((x - S.head.x) / (S.head.R * 1.6)) ** 2 + ((y - S.head.y + S.head.R * 0.05) / (S.head.R * 1.5)) ** 2 < 1;
const lineY = () => cfg.lines[S.order.cut];
const cutShare = () => S.hair.strands.filter((s) => s.goal).length / S.hair.strands.length;
/** Share of the hair the player can reach that is painted (hair hanging behind the tray is left out). */
const dyeShare = () => { const c = count(S.hair, (s, i) => s.y[i] < TRAY_Y - 6), d = count(S.hair, (s, i) => s.y[i] < TRAY_Y - 6 && s.mark[i]); return c.yes ? d.yes / c.yes : 1; };
/** Progress of the current step, 0..1. */
function progress() {
  if (S.step === 0) return S.rinse >= 0 ? 1 : Math.min(1, washShare() / cfg.foamGoal);
  if (S.step === 1) return Math.min(1, cutShare() / cfg.cutGoal);
  if (S.step === 2) return Math.min(1, dyeShare() / cfg.dyeGoal);
  if (S.step === 3) return Math.min(1, S.hair.volume);
  if (S.step === 4) return S.placed.length ? 1 : 0;
  return 1;
}
/** The colour the order wants at point i of strand s. */
const wanted = (s, i) => (S.order.cols.length > 1 && i > s.len / 2 ? S.order.cols[1] : S.order.cols[0]);

/** How close the hair is to the order: length 35%, colour 40%, accessory 25%. */
function scoreOf() {
  const o = S.order, st = S.hair.strands;
  const lenS = st.reduce((a, s) => a + (s.over ? 0.5 : s.goal ? 1 : 0), 0) / st.length;
  const colS = count(S.hair, (s, i) => s.col[i] === wanted(s, i) || (o.cols.length > 1 && Math.abs(i - s.len / 2) <= 2 && o.cols.includes(s.col[i]))).share; // two colours: the seam may wander a little
  const accS = S.placed.some((p) => p.id === o.acc) ? 1 : 0.4;
  const v = 0.35 * lenS + 0.4 * colS + 0.25 * accS;
  return { v, stars: v >= 0.85 ? 3 : v >= 0.6 ? 2 : 1 };
}

function finishStep() {
  if (S.step === 4) return reveal();
  if (S.step >= 1) trimToY(S.hair, lineY(), cfg.cutMin, MAX_PIECES, S.head); // strands the scissors missed, or that fell long later, are tidied by themselves
  if (S.step === 2 && dyeShare() >= cfg.dyeGoal) fillUnpainted(S.hair); // the last few spots the brush missed, and the ends behind the tray
  S.done = S.t; S.jump = 0.35; S.step++; S.stepT = 0; S.used = false; S.idle = 0; S.page = 0; pen = null; dryStop();
  SFX.step(); buzz('success'); burst(150 + S.step * 104 - 104, 166, 18, false);
  if (S.step === 2) S.sel = S.order.cols[0];
  if (S.step === 1) for (const s of S.hair.strands) { let low = 0; for (let i = 1; i <= s.len; i++) low = Math.max(low, s.y[i]); if (low <= lineY() + 40) s.goal = true; } // already short enough, even where it curls
}

function reveal() {
  trimToY(S.hair, lineY(), cfg.cutMin, MAX_PIECES, S.head);
  const sc = scoreOf();
  S.step = 5; S.reveal = 0; S.stars = sc.stars; S.score = sc.v; S.gained = sc.stars * cfg.coinsPerStar; S.jump = 0.5; pen = null; dryStop();
  save.coins += S.gained; save.stars += sc.stars; save.n += 1; // counted up, never set from the chair: a late save can't make it go back
  const slots = [null, null, null]; for (const p of S.placed) slots[p.slot] = p.id;
  save.wall.unshift({ t: S.order.type, h: encodeHair(S.hair), a: slots, s: sc.stars });
  if (save.wall.length > 9) save.wall.length = 9;
  photos = []; persist(); submitScore();
  SFX.flash(); setTimeout(() => SFX.wow(), 250); buzz('success');
  burst(360, 420, cfg.confetti, true);
}
const nextCustomer = () => newCustomer(save.n, true);

// ---------- particles ----------
function burst(x, y, n, conf) {
  const cap = quality ? 90 : 200, r = Math.random;
  for (let i = 0; i < n && parts.length < cap; i++) {
    const a = r() * Math.PI * 2, v = 200 + r() * 500;
    parts.push({ k: conf ? 'conf' : 'spark', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 300, life: 1.2 + r() * 0.6, c: CONFETTI[i % CONFETTI.length], s: 8 + r() * 8, rot: r() * 6, vr: (r() - 0.5) * 12 });
  }
}
function puff(k, x, y, c, n = 1) {
  const cap = quality ? 90 : 200, r = Math.random;
  for (let i = 0; i < n && parts.length < cap; i++) parts.push({ k, x: x + (r() - 0.5) * 30, y: y + (r() - 0.5) * 30, vx: (r() - 0.5) * 120, vy: k === 'bub' ? -60 - r() * 80 : k === 'steam' ? -120 - r() * 80 : 40 + r() * 80, life: 0.6 + r() * 0.5, c, s: k === 'bub' ? 8 + r() * 10 : 6 + r() * 6, rot: 0, vr: 0 });
}
function moveParts(dt) {
  for (const p of parts) { p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt; if (p.k === 'conf' || p.k === 'spark' || p.k === 'drop') p.vy += 900 * dt; if (p.k === 'conf') p.vx *= 0.99; }
  parts = parts.filter((p) => p.life > 0 && p.y < H + 40);
}
function drawParts() {
  for (const p of parts) {
    g.globalAlpha = Math.min(1, p.life * 2.5);
    if (p.k === 'conf') { g.save(); g.translate(p.x, p.y); g.rotate(p.rot); g.fillStyle = p.c; g.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); g.restore(); }
    else if (p.k === 'spark') star(g, p.x, p.y, p.s, p.c, 0);
    else if (p.k === 'bub') { oval(g, p.x, p.y, p.s, p.s, 'rgba(255,255,255,0.85)'); g.lineWidth = 2; g.strokeStyle = '#9FDDF7'; g.stroke(); }
    else if (p.k === 'drop') oval(g, p.x, p.y, p.s * 0.6, p.s, p.c);
    else if (p.k === 'steam') oval(g, p.x, p.y, p.s * 2, p.s * 1.4, 'rgba(255,255,255,0.6)');
  }
  g.globalAlpha = 1;
}

// ---------- the tray (dyes and accessories) ----------
const trayShown = () => mode === 'play' && (S.step === 2 || S.step === 4) && S.enter === 0;
/** Everything the tray offers this step, what the order wants first, locked ones last. */
function trayItems() {
  if (S.step === 2) {
    const first = [...new Set(S.order.cols)], own = ownedColors();
    const locked = [...Array(COLORS.length - 1 - FREE_COLORS).keys()].map((i) => i + FREE_COLORS + 1).filter((c) => !own.includes(c));
    return first.concat(own.filter((c) => !first.includes(c))).map((id) => ({ k: 'col', id })).concat(locked.map((id) => ({ k: 'col', id, locked: true })));
  }
  if (S.step === 4) {
    const own = ownedAcc(), first = own.includes(S.order.acc) ? [S.order.acc] : [];
    return first.concat(own.filter((a) => a !== S.order.acc)).map((id) => ({ k: 'acc', id })).concat(ACCESSORIES.filter((a) => !own.includes(a)).map((id) => ({ k: 'acc', id, locked: true })));
  }
  return [];
}
const pages = () => { const n = trayItems().length; return n > 12 ? Math.ceil(n / 11) : 1; };
/** The items on the tray page shown, and whether the last slot is the arrow to the next page. */
function pageItems() { const all = trayItems(); if (all.length <= 12) return { items: all, arrow: false }; const p = S.page % pages(); return { items: all.slice(p * 11, p * 11 + 11), arrow: true }; }
const slotXY = (j) => [70 + (j % 6) * 116, j < 6 ? 912 : 1018];
function slotAt(p) { for (let j = 0; j < 12; j++) { const [x, y] = slotXY(j); if (Math.hypot(p[0] - x, p[1] - y) < 54) return j; } return -1; }

function trayTap(j) {
  const { items, arrow } = pageItems();
  if (arrow && j === 11) { S.page = (S.page + 1) % pages(); SFX.pick(); buzz('tick'); return; }
  const it = items[j]; if (!it) return;
  S.used = true; S.idle = 0;
  if (it.locked) {
    if (save.coins < price() || !saveRead) { shakeId = it.k + it.id; shakeT = 0.5; coinPulse = 0.8; SFX.no(); buzz('error'); return; }
    save.coins -= price(); (it.k === 'col' ? save.colors : save.acc).push(it.id); save.fresh = { k: it.k, id: it.id };
    const [x, y] = slotXY(j); burst(x, y, 30, true); SFX.unlock(); buzz('success'); persist();
  }
  if (it.k === 'col') { S.sel = it.id; SFX.pick(); buzz('tick'); return; }
  const used = S.placed.map((p) => p.slot);
  if (S.placed.length >= cfg.decoMax) used.splice(used.indexOf(S.placed.shift().slot), 1);
  const slot = [0, 1, 2].find((k) => !used.includes(k));
  S.placed.push({ id: it.id, slot, t: S.t }); S.lastDeco = S.t; SFX.place(); buzz('tap');
  const [ax, ay] = accPos(slot); burst(ax, ay, 12, false);
}
/** Where accessory slot k sits on the head, and its tilt. */
function accPos(k) {
  const a = [-Math.PI / 2, -Math.PI / 2 - 0.66, -Math.PI / 2 + 0.66][k] || -Math.PI / 2, r = S.head.R + 18 + S.hair.volume * 8;
  return [S.head.x + Math.cos(a) * r, S.head.y + Math.sin(a) * r, (a + Math.PI / 2) * 0.8];
}
const checkShown = () => mode === 'play' && S.enter === 0 && ((S.step === 2 && dyeShare() >= cfg.dyeCheckAt) || (S.step === 4 && S.placed.length > 0));

// ---------- input ----------
function point(e) { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * W, (e.clientY - r.top) / r.height * H]; }
const inBtn = (b, p) => Math.hypot(p[0] - b.x - b.s / 2, p[1] - b.y - b.s / 2) <= b.s / 2 + 8;

function down(p) {
  touched = true; startAudio();
  if (view === 'wall') return wallTap(p);
  S.idle = 0;
  if (inBtn(MUTE, p)) { save.muted = !save.muted; muteTouched = true; if (save.muted) dryStop(); else SFX.pick(); persist(); return; }
  if (inBtn(WALLB, p)) { view = 'wall'; wallSel = -1; wallT = 0; pen = null; dryStop(); SFX.pick(); return; }
  if (S.step === 5) { if (S.reveal > 1.2) nextCustomer(); return; }
  if (S.enter > 0.3) return;
  if (checkShown() && inBtn(CHECK, p)) return finishStep();
  if (trayShown() && p[1] > TRAY_Y) { const j = slotAt(p); if (j >= 0) trayTap(j); return; }
  if (S.step === 4) {
    const hit = S.placed.findIndex((q) => { const [x, y] = accPos(q.slot); return Math.hypot(p[0] - x, p[1] - y) < 56; });
    if (hit >= 0) { S.placed.splice(hit, 1); SFX.pop(); buzz('tick'); S.lastDeco = S.t; }
    else if (every('hint', 400)) { S.idle = 99; }
    return;
  }
  if (!trayShown() && Math.hypot(p[0] - 360, p[1] - 980) < 70) { S.idle = 99; S.jump = 0.2; SFX.pick(); return; } // the tool badge shows the hand again
  pen = { x: p[0], y: p[1], px: p[0], py: p[1] };
  gesture(true);
}
function move(p) { if (!pen) return; pen.px = pen.x; pen.py = pen.y; pen.x = p[0]; pen.y = p[1]; gesture(false); }
function up() { pen = null; dryStop(); }

/** Apply the current step's gesture for the finger's move from (px, py) to (x, y). */
function gesture(first) {
  const h = S.hair, { x, y, px, py } = pen, len = Math.hypot(x - px, y - py), n = Math.max(1, Math.ceil(len / 18));
  S.idle = 0;
  if (S.step === 0 && S.rinse < 0) {
    let got = 0; for (let k = 1; k <= n; k++) got += foamAt(h, px + (x - px) * k / n, py + (y - py) * k / n, cfg.foamRadius);
    if (h.painted && onMop(x, y)) { // lather where the finger rubs the painted mop
      S.rub += len; got += 1;
      while (S.rub > 20 && S.blobs.length < cfg.foamBlobs * 1.3) { S.rub -= 20; S.blobs.push({ dx: x - S.head.x + (Math.random() - 0.5) * 50, dy: y - S.head.y + (Math.random() - 0.5) * 50, r: 14 + Math.random() * 14 }); }
    }
    if (got) { S.used = true; if (every('squish', 90)) SFX.squish(); if (every('hap', 120)) buzz('tick'); if (Math.random() < 0.5) puff('bub', x, y, null, 1); }
    if (washShare() >= cfg.foamGoal) { S.rinse = 0; SFX.splash(); buzz('thud'); }
  } else if (S.step === 1 && !first) {
    let over = false;
    const r = cutHair(h, px, py, x, y, cfg.cutMin, MAX_PIECES, (s, cy) => { if (cy < lineY() - 70) { s.over = true; over = true; } if (cy <= lineY() + 40) s.goal = true; });
    if (r.cut) {
      S.used = true; if (every('snip', 70)) SFX.snip(); if (every('hap', 60)) buzz('tick');
      if (over && every('eek', 900)) { S.eek = 0.9; S.eeks = (S.eeks || 0) + 1; SFX.eek(); buzz('warning'); }
      if (cutShare() >= cfg.cutGoal) finishStep();
    }
  } else if (S.step === 2) {
    const zone = S.order.cols.length > 1 && S.order.cols.includes(S.sel) ? (s, i) => wanted(s, i) === S.sel : null; // two colours: each wanted dye stays in its half
    let got = 0; for (let k = 1; k <= n; k++) got += paintAt(h, px + (x - px) * k / n, py + (y - py) * k / n, cfg.brushRadius, S.sel, zone);
    if (got) { S.used = true; if (every('swish', 110)) SFX.swish(); if (every('hap', 140)) buzz('tick'); if (Math.random() < 0.3) puff('drop', x, y + 20, colorOf(S.sel, 3)); }
    if (dyeShare() >= cfg.dyeGoal) finishStep();
  } else if (S.step === 3) { S.used = true; dryStart(); }
}

function bindInput() {
  if (bound) return; bound = true;
  cv.addEventListener('pointerdown', (e) => { e.preventDefault(); if (mode !== 'play' || penId !== null) return; penId = e.pointerId; try { cv.setPointerCapture(e.pointerId); } catch (er) { /* not captured */ } down(point(e)); });
  cv.addEventListener('pointermove', (e) => { if (e.pointerId === penId) move(point(e)); });
  const end = (e) => { if (e.pointerId !== penId) return; penId = null; up(); startAudio(); };
  cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end);
  document.addEventListener('visibilitychange', () => { if (document.hidden) { pen = null; penId = null; dryStop(); if (ac) ac.suspend().catch(() => {}); } else if (ac) startAudio(); });
  cv.addEventListener('lostpointercapture', (e) => { if (e.pointerId === penId) { penId = null; up(); } });
}

// ---------- simulation ----------
function sim(dt) {
  const s = S, h = s.hair;
  s.t += dt; s.stepT += dt; s.idle += dt; s.eek = Math.max(0, s.eek - dt); s.jump = Math.max(0, s.jump - dt);
  if (s.enter > 0) s.enter = Math.max(0, s.enter - dt / 0.45);
  s.head.x = HEAD.x + 560 * s.enter * s.enter;
  s.head.y = HEAD.y + Math.sin(s.t * 2.3) * 5 - Math.sin(Math.min(1, s.jump / 0.35) * Math.PI) * 22;
  let wind = null;
  if (s.step === 3 && pen) {
    wind = { x: pen.x, y: pen.y, r: cfg.dryRadius, power: cfg.dryPower };
    h.volume = Math.min(1, h.volume + dt / cfg.drySeconds); h.wet = Math.max(0, h.wet - dt / cfg.drySeconds); h.stiff = cfg.stiffWet + (cfg.stiffDry - cfg.stiffWet) * h.volume;
    if (Math.random() < 0.3) puff('steam', pen.x + (Math.random() - 0.5) * 120, pen.y - 40, null);
    if (h.volume >= 1) finishStep();
  }
  if (s.rinse >= 0 && s.step === 0) {
    s.rinse += dt; h.dirt = Math.max(0, 1 - s.rinse * 1.6); h.wild = Math.max(0.05, 1 - s.rinse * 1.5); h.wet = Math.min(1, s.rinse * 2); h.stiff = cfg.stiffWild + (cfg.stiffWet - cfg.stiffWild) * h.wet;
    if (Math.random() < 0.8) puff('drop', s.head.x + (Math.random() - 0.5) * 360, 330, '#7FD4FF', 2);
    if (s.blobs.length && Math.random() < 0.6) s.blobs.splice(Math.floor(Math.random() * s.blobs.length), 1); // lather pops away
    if ((Math.round(s.rinse / dt) % 3 === 0 && rinse(h, 1) && s.rinse > 0.9 && !s.blobs.length) || s.rinse > 2.5) {
      s.blobs.length = 0;
      for (const st of h.strands) { st.foam.fill(0); for (let i = 0; i < st.col.length; i++) if (st.col[i] === 0) st.col[i] = BROWN; }
      h.dirt = 0; h.wild = 0.05; s.rinse = -1; finishStep();
    } else if (Math.random() < 0.25) SFX.pop();
  }
  if (s.step === 4 && s.placed.length && s.t - s.lastDeco > cfg.decoAuto) reveal();
  if (s.step === 5) { s.reveal += dt; if (s.reveal > cfg.revealSeconds) nextCustomer(); }
  stepHair(h, dt, s.head, wind, s.t);
}

function update(dt) {
  bootT += dt; if (booting()) return;
  coinPulse = Math.max(0, coinPulse - dt); shakeT = Math.max(0, shakeT - dt);
  coinShown += (save.coins - coinShown) * Math.min(1, dt * 6); if (Math.abs(save.coins - coinShown) < 0.5) coinShown = save.coins;
  if (view === 'wall') { wallT += dt; moveParts(dt); return; }
  acc = Math.min(acc + dt, 0.1);
  while (acc >= FIX) { acc -= FIX; sim(FIX); }
  moveParts(dt);
}

// ---------- drawing ----------
/** The customer's face for this moment. */
function moodOf() {
  if (S.step === 5) return S.reveal < 0.35 ? 'eek' : S.stars === 3 ? 'wow' : S.stars === 2 ? 'giggle' : 'happy';
  if (S.eek > 0) return 'eek';
  if (pen && (S.step === 0 || S.step === 3)) return 'giggle';
  if (S.step === 0 && !S.used) return 'grumpy';
  return 'happy';
}
/** Where the helper hand is now, and whether it presses. */
function handAt() {
  const t = S.stepT;
  if (S.step === 0) return [300 + Math.sin(t * 5) * 90, 450 + Math.cos(t * 2.5) * 30, true];
  if (S.step === 1) { const gd = guide(), k = (t % 1.8) / 1.8; if (gd.length < 2) return [360, 700, true]; const i = Math.min(gd.length - 2, Math.floor(k * (gd.length - 1))), f = k * (gd.length - 1) - i; return [gd[i][0] + (gd[i + 1][0] - gd[i][0]) * f, gd[i][1] + (gd[i + 1][1] - gd[i][1]) * f, true]; }
  if (S.step === 2) { const ph = t % 2.6; if (ph < 0.8) { const { items } = pageItems(), j = items.findIndex((it) => it.id === S.order.cols[0]); const [x, y] = slotXY(j >= 0 ? j : 11); return [x, y, ph > 0.45]; } return [250 + (ph - 0.8) / 1.8 * 220, 500 + Math.sin(ph * 6) * 60, true]; }
  if (S.step === 3) return [360 + Math.sin(t * 2) * 50, 440, true];
  if (S.step === 4) { const j = pageItems().items.findIndex((it) => it.id === S.order.acc); const [x, y] = slotXY(Math.max(0, j)); return [x, y, t % 1.2 > 0.6]; }
  return null;
}
const handShown = () => mode === 'play' && S.step < 5 && S.enter === 0 && S.rinse < 0 && (S.n === 0 ? !S.used || S.idle > cfg.idleHand : S.idle > cfg.idleHand);
/** The dotted cut line: straight across at the order's length. */
function guide() { const y = lineY(), pts = []; for (let x = 110; x <= 610; x += 50) pts.push([x, y]); return pts; }
function dashed(pts, color) { // a glowing dotted guide
  if (pts.length < 2) return;
  g.save(); g.setLineDash([16, 14]); g.lineDashOffset = -S.t * 40; g.lineCap = 'round';
  g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])));
  g.lineWidth = 14; g.strokeStyle = 'rgba(255,95,162,0.55)'; g.stroke(); g.lineWidth = 6; g.strokeStyle = color; g.stroke(); g.restore();
}

function drawCustomer(s, c) {
  if (s.step === 5) rays(g, s.head.x, s.head.y - 40, 520, s.reveal, Math.min(0.85, s.reveal * 2));
  s.hair.painted = ready('messy_hair');
  if (s.hair.painted && s.hair.dirt > 0) { const k = 1 + Math.sin(s.t * 2.2) * 0.012; drawWhole(g, 'messy_hair', s.head.x, s.head.y - s.head.R * 0.05, s.head.R * 3.3 * k, s.hair.dirt); } // the painted bed-head, behind the head
  if (!drawBust(g, s.order.type, c.mood, s.head.x, s.head.y, s.head.R)) { // the code stand-in while the painting loads
    drawChair(g, s.head.x, HEAD.y - 260, false);
    drawBody(g, c); drawChair(g, s.head.x, HEAD.y - 260, true); drawHead(g, c);
  }
  drawHair(g, s.hair, s.head, quality < 2);
  drawLatherAndAcc(s);
}
/** Lather on the painted mop, and the accessories: drawn on the 2D canvas over either renderer. */
function drawLatherAndAcc(s) {
  if (s.blobs.length) { // lather on the painted mop: glossy bubbles
    const b = new Path2D(); for (const o of s.blobs) { const x = s.head.x + o.dx, y = s.head.y + o.dy; b.moveTo(x + o.r, y); b.arc(x, y, o.r, 0, 7); }
    g.fillStyle = 'rgba(255,255,255,0.93)'; g.fill(b); g.lineWidth = 3; g.strokeStyle = '#A8DDF5'; g.stroke(b);
    g.fillStyle = 'rgba(255,255,255,1)'; for (const o of s.blobs) { g.beginPath(); g.arc(s.head.x + o.dx - o.r * 0.35, s.head.y + o.dy - o.r * 0.35, o.r * 0.22, 0, 7); g.fill(); }
  }
  for (const p of s.placed) { const [x, y, rot] = accPos(p.slot), age = s.t - p.t, k = age < 0.3 ? 0.5 + ease(age / 0.3) * 0.5 + Math.sin(age / 0.3 * Math.PI) * 0.2 : 1; if (!drawAccSprite(g, p.id, x, y, 112 * k, rot)) drawAcc(g, p.id, x, y, 92 * k, rot); }
}

/** True while the room and this child are still on their way (never longer than 2.5 s). */
const booting = () => bootT < 2.5 && !settled() && !(ready('salon_bg') && ready('kid_' + S.order.type));
function drawLoading() {
  g.setTransform(RES, 0, 0, RES, 0, 0); g.fillStyle = '#F3E8FF'; g.fillRect(0, 0, W, H);
  for (let i = 0; i < 3; i++) { const k = (Math.sin(bootT * 6 - i * 0.9) + 1) / 2; oval(g, 300 + i * 60, 640 - k * 30, 18, 18, CONFETTI[i]); }
}
function draw() {
  if (!roomDrawn && ready('salon_bg')) { roomDrawn = drawRoom(back.getContext('2d'), W, H); photos = []; }
  if (booting()) return drawLoading();
  if (view === 'wall') return drawWall();
  const s = S, c = { type: s.order.type, x: s.head.x, y: s.head.y, R: s.head.R, t: s.t, mood: moodOf(), blink: s.t % 3.7 < 0.12 ? 1 : 0, look: null };
  const ha = handShown() ? handAt() : null;
  c.look = pen ? [pen.x, pen.y] : ha ? [ha[0], ha[1]] : [360 + Math.sin(s.t * 0.7) * 120, 700];
  const punch = s.step === 5 && s.reveal < 0.3 ? 1 + Math.sin(s.reveal / 0.3 * Math.PI) * 0.03 : 1;
  const gl = glOn() && glHasArt(s.order.type); // the WebGL layer draws the room, the child and the hair
  if (gl) {
    s.hair.painted = ready('messy_hair');
    drawGL({ W, H, punch, t: s.t, head: s.head, kid: s.order.type, mood: c.mood, hair: s.hair, showMop: s.hair.painted && s.hair.dirt > 0, mopAlpha: s.hair.dirt,
      rays: s.step === 5 ? Math.min(0.85, s.reveal * 2) : 0, raysT: s.reveal, hairAlpha: s.hair.painted ? 1 - s.hair.dirt : 1 });
    g.setTransform(RES, 0, 0, RES, 0, 0); g.clearRect(0, 0, W, H);
  }
  g.setTransform(punch * RES, 0, 0, punch * RES, RES * W / 2 * (1 - punch), RES * H / 2 * (1 - punch));
  if (gl) { drawHair(g, s.hair, s.head, quality < 2, true, true); drawLatherAndAcc(s); } // lather and accessories on top
  else { g.drawImage(back, 0, 0); drawCustomer(s, c); }
  if (s.step === 1 && mode === 'play') dashed(guide(), WHITE);
  if (s.step === 2 && s.order.cols.length > 1) dashed(S.hair.strands.filter((q) => q.len > 3).map((q) => [q.x[Math.floor(q.len / 2)], q.y[Math.floor(q.len / 2)]]).sort((a, b) => a[0] - b[0]), SUNNY);
  drawParts();
  g.setTransform(RES, 0, 0, RES, 0, 0);
  if (quality < 2) { if (!vig) vig = vignette(W, H); g.drawImage(vig, 0, 0); }
  if (pen && s.step < 4) drawTool(pen.x, pen.y);
  if (!trayShown() && s.step < 4 && s.enter === 0) drawToolBadge();
  if (trayShown()) drawTray();
  if (checkShown()) drawCheck();
  drawHud(); if (s.step < 5) drawSteps(); drawOrder(); drawPrompt();
  if (ha) hand(g, ha[0], ha[1], ha[2] && Math.sin(s.stepT * 10) > -0.3);
  if (s.step === 5) drawReveal();
}

/** The tool under the finger: shampoo, scissors (snapping), the brush in the chosen dye, the dryer. */
function drawTool(x, y) {
  const k = STEP_ICONS[S.step], snap = Math.sin(S.t * 30) * 0.12;
  if (S.step === 1 && drawToolSprite(g, 'scissors', x + 26, y - 30, 130, -0.5 + snap)) return;
  if (S.step === 2 && drawToolSprite(g, 'brush', x + 34, y - 52, 120, 0.2)) { oval(g, x + 6, y - 14, 16, 12, colorOf(S.sel, 3)); return; }
  if (S.step === 3 && drawToolSprite(g, 'dryer', x - 96, y + 84, 140, -0.75)) return;
  if (S.step === 0 && drawToolSprite(g, 'foam', x + 34, y - 44, 110, 0.3)) return;
  if (S.step === 1) icon(g, 'scissors', x + 20, y - 30, 120, (Math.sin(S.t * 30) + 1) / 2);
  else if (S.step === 2) icon(g, 'brush', x + 16, y - 46, 110, colorOf(S.sel, 3));
  else if (S.step === 3) { g.save(); g.translate(x - 96, y + 84); g.rotate(-0.75); icon(g, 'dryer', 0, 0, 130); g.restore(); }
  else icon(g, k, x + 26, y - 40, 100);
}
/** The tool of the step, resting on a disc below the customer; a tap on it shows the hand. */
function drawToolBadge() {
  const pulse = 1 + Math.sin(S.t * 4) * 0.04;
  glossDisc(g, 360, 980, 62 * pulse, '#FFFFFF', '#FF9CC8');
  if (!drawToolSprite(g, STEP_ICONS[S.step], 360, 980, 96)) icon(g, STEP_ICONS[S.step], 360, 980, 92, S.step === 2 ? colorOf(S.sel, 3) : 0);
}
function drawTray() {
  panel(g, 14, TRAY_Y, W - 28, 216, 40);
  const { items, arrow } = pageItems(), p = price();
  items.forEach((it, j) => {
    let [x, y] = slotXY(j); if (shakeId === it.k + it.id && shakeT > 0) x += Math.sin(shakeT * 50) * 8;
    const sel = it.k === 'col' && it.id === S.sel && !it.locked, want = it.k === 'col' ? S.order.cols.includes(it.id) : it.id === S.order.acc;
    if (sel) { g.beginPath(); g.arc(x, y, 52, 0, 7); g.fillStyle = 'rgba(255,95,162,0.16)'; g.fill(); g.lineWidth = 6; g.strokeStyle = PINK; g.stroke(); }
    g.globalAlpha = it.locked ? 0.55 : 1;
    if (it.k === 'col') sphere(g, x, y, 38, COLORS[it.id], it.id === 16); else if (!drawAccSprite(g, it.id, x, y, 92, 0)) drawAcc(g, it.id, x, y, 84, 0);
    g.globalAlpha = 1;
    if (want && !it.locked) star(g, x + 36, y - 36, 15, SUNNY, 3);
    if (it.locked) { icon(g, 'lock', x + 30, y - 26, 44); glossPill(g, x - 40, y + 28, 80, 34, save.coins >= p ? GREEN : PLUM); icon(g, 'coin', x - 20, y + 45, 24); words(String(p), x + 12, y + 46, 22, 44, WHITE, true); }
  });
  if (arrow) { const [x, y] = slotXY(11); glossDisc(g, x, y, 42, VIOLET); icon(g, 'next', x + 3, y, 50); }
}
function drawCheck() {
  const { x, y, s } = CHECK, pulse = 1 + Math.sin(S.t * 6) * 0.06;
  glossDisc(g, x + s / 2, y + s / 2, s / 2 * pulse, GREEN); icon(g, 'check', x + s / 2, y + s / 2, 96);
}
function pill(x, y, w, kind, value, pop = 0) {
  glossPill(g, x, y, w, 80, '#FFFFFF', '#FF9CC8');
  if (kind === 'coin') icon(g, 'coin', x + 42, y + 40, 62 * (1 + pop * 0.3)); else star(g, x + 42, y + 40, 28, SUNNY, 4);
  words(String(value), x + w / 2 + 22, y + 44, 42, w - 90, PLUM, true);
}
function disc(b, kind) { const r = b.s / 2; glossDisc(g, b.x + r, b.y + r, r, '#FFFFFF', '#FF9CC8'); icon(g, kind, b.x + r, b.y + r, b.s * 0.74); }
function drawHud() {
  pill(22, 22, 190, 'coin', Math.round(coinShown), Math.sin(coinPulse * 12) * coinPulse);
  disc(WALLB, 'wall'); disc(MUTE, save.muted ? 'mute' : 'sound');
  if (save.wall.length) { glossDisc(g, WALLB.x + 80, WALLB.y + 14, 18, PINK); words(String(save.wall.length), WALLB.x + 80, WALLB.y + 16, 22, 30, WHITE, true); }
}
function drawSteps() {
  for (let i = 0; i < 5; i++) {
    const x = 208 + i * 76, y = 160, cur = i === S.step, done = i < S.step, pop = cur && S.done >= 0 ? popIn(S.t - S.done) : 1, r = 31 * (cur ? 1.15 * pop : 1);
    glossDisc(g, x, y, r, done ? GREEN : cur ? '#FFFFFF' : '#F1E9FF', cur ? '#FF9CC8' : '#FFFFFF');
    if (cur && S.step < 5) { g.beginPath(); g.arc(x, y, r + 4, -Math.PI / 2, -Math.PI / 2 + progress() * Math.PI * 2); g.lineWidth = 8; g.strokeStyle = PINK; g.lineCap = 'round'; g.stroke(); }
    g.globalAlpha = done || cur ? 1 : 0.55;
    if (done) icon(g, 'check', x, y, 44); else if (!(i === 4 ? drawAccSprite(g, 'bow', x, y, r * 1.4) : drawToolSprite(g, STEP_ICONS[i], x, y, r * 1.5))) icon(g, STEP_ICONS[i], x, y, cur ? 52 : 44, i === 2 ? colorOf(S.order.cols[0], 3) : 0);
    g.globalAlpha = 1;
  }
}
/** The order card: a little picture of the wanted hair (length, colours) and accessory. */
function drawOrder() {
  const { x, y, w, h } = ORDER, o = S.order, k = CUSTOMERS[o.type], wob = S.step === 0 && !S.used ? Math.sin(S.t * 5) * 0.04 : 0;
  g.save(); g.translate(x + w / 2, y + h / 2); g.rotate(wob); g.translate(-x - w / 2, -y - h / 2);
  panel(g, x, y, w, h, 24);
  const cx = x + w / 2, cy = y + 74, fall = 22 + o.cut * 18;
  for (const sd of [-1, 1]) { // the two falls of hair, top colour then bottom colour
    rr(g, cx + sd * 33 - 13, cy - 16, 26, fall, 12); g.fillStyle = colorOf(o.cols[0], 2); g.fill(); g.lineWidth = 2; g.strokeStyle = 'rgba(70,30,15,0.35)'; g.stroke();
    if (o.cols.length > 1) { rr(g, cx + sd * 33 - 13, cy - 16 + fall / 2, 26, fall / 2, 12); g.fillStyle = colorOf(o.cols[1], 12); g.fill(); g.stroke(); }
  }
  g.save(); rr(g, x + 4, y + 4, w - 8, h - 8, 20); g.clip();
  if (!drawBust(g, o.type, 'happy', cx, cy, 30)) { oval(g, cx, cy, 30, 29, k.fur, 4); oval(g, cx - 10, cy + 5, 4, 5, NAVY); oval(g, cx + 10, cy + 5, 4, 5, NAVY); }
  g.restore();
  g.beginPath(); g.arc(cx, cy, 29, Math.PI + 0.25, -0.25); g.lineWidth = 16; g.strokeStyle = colorOf(o.cols[0], 1); g.stroke();
  if (!drawAccSprite(g, o.acc, cx + 28, cy - 34, 46, 0.3)) drawAcc(g, o.acc, cx + 28, cy - 34, 42, 0.3);
  // the length: scissors beside a marker at the length line
  if (!drawToolSprite(g, 'scissors', x + 30, y + h - 30, 40, -0.5)) icon(g, 'scissors', x + 30, y + h - 30, 40, 0.5);
  for (let i = 0; i < 3; i++) { const on = i <= o.cut; box(g, x + 58 + i * 26, y + h - 42 + (2 - i) * 6, 19, 24 - (2 - i) * 6 + 6, 6, on ? PINK : '#EADCF5'); }
  g.restore();
}
function drawPrompt() {
  let key = STEPS[S.step] || 'p' + S.stars, color = PLUM;
  if (S.step === 0 && S.rinse >= 0) key = 'rinse';
  if (S.eek > 0) { key = 'eek'; color = CORAL; }
  if (S.step === 5) { key = 'p' + S.stars; color = PINK; }
  if (S.enter > 0.1) return;
  const age = S.step === 5 ? S.reveal : S.eek > 0 ? 0.9 - S.eek : S.stepT;
  banner(T(key), S.step === 5 ? 360 : 268, S.step === 5 ? 168 : 268, S.step === 5 ? 52 : 42, S.step === 5 ? 600 : 420, color, popIn(age));
}
function drawReveal() {
  const t = S.reveal;
  if (t < 0.2) { g.fillStyle = `rgba(255,255,255,${1 - t / 0.2})`; g.fillRect(0, 0, W, H); }
  for (let i = 0; i < 3; i++) {
    const at = 0.45 + i * 0.28, age = t - at, x = 240 + i * 120, y = 330 - (i === 1 ? 18 : 0);
    if (age < 0) continue;
    if (i < S.stars && !(S.rang & (1 << i))) { S.rang = (S.rang || 0) | (1 << i); SFX.star(i); }
    const k = popIn(age) * (i === 1 ? 1.2 : 1);
    star(g, x, y + 7, 48 * k, 'rgba(90,30,80,0.22)', 0); star(g, x, y, 48 * k, i < S.stars ? SUNNY : '#EADCF5', 0);
    if (i < S.stars) { g.save(); g.beginPath(); g.ellipse(x - 12 * k, y - 16 * k, 12 * k, 7 * k, -0.5, 0, 7); g.fillStyle = 'rgba(255,255,255,0.7)'; g.fill(); g.restore(); }
  }
  if (t > 1.0) { const k = ease((t - 1.0) / 0.4); g.globalAlpha = Math.max(0, 1 - (t - 1.8) / 0.4); glossPill(g, 40, 120 - 30 * k, 200, 70, GREEN); icon(g, 'coin', 80, 155 - 30 * k, 54); words('+' + S.gained, 160, 158 - 30 * k, 40, 120, WHITE, true); g.globalAlpha = 1; }
  if (t > 1.2) {
    const pulse = 1 + Math.sin(t * 6) * 0.06, r = NEXT.s / 2;
    glossDisc(g, NEXT.x + r, NEXT.y + r, r * pulse, PINK); icon(g, 'next', NEXT.x + r + 6, NEXT.y + r, 104);
    const left = 1 - Math.min(1, (t - 1.2) / (cfg.revealSeconds - 1.2)); g.beginPath(); g.arc(NEXT.x + r, NEXT.y + r, r + 10, -Math.PI / 2, -Math.PI / 2 + left * Math.PI * 2); g.lineWidth = 8; g.strokeStyle = WHITE; g.stroke();
  }
}

// ---------- the salon wall ----------
/** A photo of a finished customer, drawn once into its own small canvas. */
function photo(ph) {
  const c = document.createElement('canvas'); c.width = CELL.w; c.height = CELL.h; const q = c.getContext('2d');
  const gr = q.createLinearGradient(0, 0, 0, CELL.h); gr.addColorStop(0, '#FFF3F8'); gr.addColorStop(1, '#E6F7FF'); q.fillStyle = gr; q.fillRect(0, 0, CELL.w, CELL.h);
  const k = 0.36; q.save(); q.translate(CELL.w / 2, 92); q.scale(k, k); q.translate(-HEAD.x, -HEAD.y);
  const hair = hairFromCode(ph.h, HEAD.R, { points: cfg.points, seg: cfg.seg, minLen: cfg.minLen, maxLen: cfg.maxLen, seed: 5, stiff: cfg.stiffDry }, HEAD.x, HEAD.y);
  const cu = { type: ph.t, x: HEAD.x, y: HEAD.y, R: HEAD.R, t: 0, mood: ph.s === 3 ? 'wow' : 'giggle', blink: 0, look: [HEAD.x, HEAD.y + 200] };
  if (!drawBust(q, ph.t, cu.mood, HEAD.x, HEAD.y, HEAD.R)) { drawBody(q, cu); drawHead(q, cu); }
  drawHair(q, hair, { x: HEAD.x, y: HEAD.y, R: HEAD.R }, true);
  ph.a.forEach((id, slot) => { if (!id) return; const a = [-Math.PI / 2, -Math.PI / 2 - 0.66, -Math.PI / 2 + 0.66][slot], r = HEAD.R + 22, x = HEAD.x + Math.cos(a) * r, y = HEAD.y + Math.sin(a) * r, rot = (a + Math.PI / 2) * 0.8; if (!drawAccSprite(q, id, x, y, 112, rot)) drawAcc(q, id, x, y, 92, rot); });
  q.restore();
  for (let i = 0; i < 3; i++) star(q, CELL.w / 2 - 44 + i * 44, CELL.h - 26, 17, i < ph.s ? SUNNY : '#E0E6F5', 3);
  return c;
}
const cellAt = (i) => [CELL.x + (i % 3) * CELL.dx, CELL.y + Math.floor(i / 3) * CELL.dy];
function drawWall() {
  g.setTransform(RES, 0, 0, RES, 0, 0); g.drawImage(back, 0, 0); g.fillStyle = 'rgba(255,240,246,0.88)'; g.fillRect(0, 0, W, H);
  banner(T('wall'), 290, 76, 46, 420, PINK, popIn(wallT));
  disc(LANGB, 'globe');
  if (photos.length !== save.wall.length) photos = save.wall.map(photo);
  for (let i = 0; i < 9; i++) {
    const [x, y] = cellAt(i), ph = photos[i];
    if (ph) { box(g, x - 8, y + 2, CELL.w + 16, CELL.h + 16, 18, 'rgba(90,30,80,0.18)'); box(g, x - 8, y - 8, CELL.w + 16, CELL.h + 16, 18, WHITE); g.drawImage(ph, x, y); rr(g, x - 8, y - 8, CELL.w + 16, CELL.h + 16, 18); g.lineWidth = 3; g.strokeStyle = '#FFB3D6'; g.stroke(); }
    else { box(g, x, y, CELL.w, CELL.h, 14, 'rgba(255,255,255,0.6)'); rr(g, x, y, CELL.w, CELL.h, 14); g.save(); g.setLineDash([14, 10]); g.lineWidth = 4; g.strokeStyle = '#B8C2E0'; g.stroke(); g.restore(); g.globalAlpha = 0.35; icon(g, 'camera', x + CELL.w / 2, y + CELL.h / 2, 90); g.globalAlpha = 1; }
  }
  disc(BACK, 'back');
  if (wallSel >= 0 && photos[wallSel]) {
    g.fillStyle = 'rgba(31,42,107,0.55)'; g.fillRect(0, 0, W, H);
    const k = ease(Math.min(1, wallSel === -1 ? 0 : (wallT - wallSelT) / 0.25)) * 0.6 + 2.0, w = CELL.w * k, h = CELL.h * k;
    box(g, 360 - w / 2 - 14, 560 - h / 2 - 14, w + 28, h + 28, 24, WHITE); g.drawImage(photos[wallSel], 360 - w / 2, 560 - h / 2, w, h);
  }
  drawParts();
}
let wallSelT = 0;
function wallTap(p) {
  if (wallSel >= 0) { wallSel = -1; SFX.pick(); return; }
  if (inBtn(BACK, p)) { view = 'play'; SFX.pick(); return; }
  if (inBtn(LANGB, p)) { lang = save.lang = LANGS[(LANGS.indexOf(lang) + 1) % LANGS.length]; SFX.pick(); buzz('tick'); persist(); wallT = 0; return; }
  for (let i = 0; i < photos.length; i++) { const [x, y] = cellAt(i); if (p[0] > x && p[0] < x + CELL.w && p[1] > y && p[1] < y + CELL.h) { wallSel = i; wallSelT = wallT; SFX.flash(); burst(360, 560, 24, true); buzz('tap'); return; } }
}

// ---------- speed watch ----------
/** Fewer canvas pixels for each quality step: drawing thick hair is what costs on a slow phone. */
function setRes(k) { if (k === RES) return; RES = k; cv.width = Math.round(W * k); cv.height = Math.round(H * k); }
/** Quality steps down after two slow half-seconds and back up after five fast ones. */
function watchSpeed(dt) {
  frameTimes.push(dt); if (frameTimes.length < 30) return;
  const mid = frameTimes.sort((a, b) => a - b)[15] * 1000; frameTimes = [];
  if (mid > cfg.slowFrameMs + quality * 5) { fast = 0; if (++slow >= 2 && quality < 2) { quality++; slow = 0; } }
  else if (mid < 18) { slow = 0; if (++fast >= 5 && quality > 0) { quality--; fast = 0; } }
  else slow = fast = 0;
  if (glOn() && mid > 70) { if (++glSlow >= 2) stopGL(); } else glSlow = 0; // no real GPU here: back to the 2D canvas
  setRes([1, 0.8, 0.62][quality]);
}
function frame(now) {
  raf = requestAnimationFrame(frame);
  if (stageEl) startGL(stageEl, cv, W, H);
  const rawDt = Math.max(0, (now - last) / 1000), dt = Math.min(0.05, rawDt); last = now;
  if (rawDt > 0 && rawDt < 1) watchSpeed(rawDt); // very slow frames count too: they are what the fallback is for
  if (DEBUG) { const a = performance.now(); update(dt); const b = performance.now(); draw(); const c = performance.now(); const p = (window.__prof = window.__prof || { u: 0, d: 0, n: 0 }); p.u += b - a; p.d += c - b; p.n++; window.__frames = (window.__frames || 0) + 1; }
  else { update(dt); draw(); }
}

// ---------- save ----------
const int = (v, lo, hi) => (Number.isInteger(v) && v >= lo && v <= hi ? v : null);
/** Merge the stored save into the current one, once; progress made before it arrived is added on top. */
function applySave(st) {
  if (!st || typeof st !== 'object' || merged) return;
  merged = true;
  const n0 = int(st.n, 0, 1e6) || 0, before = save.n;
  save.n = n0 + save.n; save.coins = (int(st.coins, 0, 1e7) || 0) + save.coins; save.stars = (int(st.stars, 0, 1e7) || 0) + save.stars;
  if (Array.isArray(st.colors)) for (const c of st.colors) if (int(c, FREE_COLORS + 1, COLORS.length - 1) && !save.colors.includes(c)) save.colors.push(c);
  if (Array.isArray(st.acc)) for (const a of st.acc) if (ACCESSORIES.indexOf(a) >= FREE_ACC && !save.acc.includes(a)) save.acc.push(a);
  if (Array.isArray(st.wall)) for (const ph of st.wall) if (ph && CUSTOMER_TYPES.includes(ph.t) && typeof ph.h === 'string' && ph.h.length < 3000 && ph.h.split(',').length <= 90 && Array.isArray(ph.a) && ph.a.length <= 3 && ph.a.every((a) => a === null || ACCESSORIES.includes(a)) && int(ph.s, 1, 3)) save.wall.push({ t: ph.t, h: ph.h, a: ph.a.slice(0, 3), s: ph.s });
  if (save.wall.length > 9) save.wall.length = 9;
  photos = [];
  if (st.fresh && (st.fresh.k === 'col' || st.fresh.k === 'acc') && !save.fresh) save.fresh = { k: st.fresh.k, id: st.fresh.id };
  if (!muteTouched && typeof st.muted === 'boolean') save.muted = st.muted;
  if (!save.lang && typeof st.lang === 'string' && cfg.strings[st.lang]) lang = save.lang = st.lang;
  coinShown = save.coins;
  if (n0 > 0 && before === 0 && !touched && view === 'play') newCustomer(save.n, false); // a returning player meets their next customer
}

/** Entry point. The host calls this on start and on every reload. */
function run(m) {
  const me = ++runs;
  mode = m; cfg = window.gameConfig;
  cv = document.getElementById('game') || document.body.appendChild(Object.assign(document.createElement('canvas'), { id: 'game' }));
  stageEl = document.getElementById('stage'); // the 2D canvas sits on a WebGL canvas inside one box
  if (!stageEl) { stageEl = document.createElement('div'); stageEl.id = 'stage'; cv.parentNode.insertBefore(stageEl, cv); stageEl.appendChild(cv); }
  stageEl.style.cssText = 'position:relative;width:min(100vw,calc(100vh*9/16));height:min(100vh,calc(100vw*16/9));touch-action:none;margin:auto';
  cv.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:none';
  cv.width = Math.round(W * RES); cv.height = Math.round(H * RES);
  g = cv.getContext('2d', { alpha: true });
  if (!back) { back = document.createElement('canvas'); back.width = W; back.height = H; drawSalon(back.getContext('2d')); }
  loadSprites(cfg.sprites); bootT = 0;
  try { for (const f of ["800 40px 'Baloo 2'", "800 40px 'Baloo Da 2'", "800 40px 'Baloo Bhaijaan 2'"]) document.fonts.load(f); } catch (e) { /* fonts load when they can */ }
  const slider = (key, min, max, step) => ({ key, type: 'slider', min, max, step });
  try {
    lib.showGameParameters({
      name: 'Crazy Hair Salon Settings',
      params: {
        'Strands of hair': slider('strands', 30, 90, 2), 'Foam needed to rinse': slider('foamGoal', 0.4, 1, 0.05), 'Foam brush size (px)': slider('foamRadius', 20, 90, 2),
        'Share of strands cut to finish': slider('cutGoal', 0.5, 1, 0.05), 'Dye brush size (px)': slider('brushRadius', 20, 90, 2), 'Dye needed to finish': slider('dyeGoal', 0.5, 1, 0.02),
        'Seconds of drying': slider('drySeconds', 1, 6, 0.2), 'Seconds before the hand helps': slider('idleHand', 1, 10, 0.5), 'Coins per star': slider('coinsPerStar', 1, 30, 1),
        'First unlock price': slider('unlockBase', 10, 200, 5), 'Confetti pieces': slider('confetti', 0, 200, 10),
      },
    });
  } catch (e) { /* settings panel not offered here */ }
  cancelAnimationFrame(raf); pen = null; penId = null; dryStop(); parts = [];
  lang = save.lang || detectLang();
  if (mode !== 'play' || !S || S.edit) { view = 'play'; newCustomer(mode === 'play' ? save.n : 0, false); S.edit = mode !== 'play'; }
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
  const read = window.__slowSave ? () => new Promise((r) => { window.__resolveSave = r; }) : none; // a test can hold the first read back
  window.lib = { showGameParameters() {}, log() {}, getAsset: (id) => (window.__noAssets ? undefined : { url: './' + id + '.webp', type: 'image' }), getUserGameState: read, saveUserGameState: (s) => { (window.__writes = window.__writes || []).push(JSON.parse(JSON.stringify(s))); return none(); }, addPlayerScoreToLeaderboard: none, haptics: { play() {}, start() {}, stop() {} } };
  window.__game = {
    get S() { return S; }, get save() { return save; }, set save(v) { save = v; }, get view() { return view; }, get cfg() { return cfg; }, get lang() { return lang; }, setLang(l) { lang = save.lang = l; },
    get quality() { return quality; }, set quality(q) { quality = q; }, get photos() { return photos.length; }, get parts() { return parts.length; }, get pen() { return pen; },
    booting, T, detectLang, applySave, newCustomer, finishStep, reveal, trayItems, pageItems, slotXY, accPos, guide, progress, scoreOf, washShare, cutShare, dyeShare, handAt, handShown, price,
    MUTE, WALLB, CHECK, NEXT, BACK, LANGB, ORDER, TRAY_Y, cellAt, CELL, COLORS, ACCESSORIES, wantedAt: (s, i) => wanted(s, i),
  };
  const q = new URLSearchParams(location.search);
  fetch('game_config.json').then((r) => r.json()).then((c) => { window.gameConfig = { ...c, ...JSON.parse(q.get('cfg') || '{}') }; run(q.get('mode') || 'play'); });
}
