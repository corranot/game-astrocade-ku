// PROTOTYPE - NOT FOR PRODUCTION
/**
 * Draw It Alive: draw the one missing part with a finger and the scene comes alive, using the line you drew.
 *
 * There is no menu. Words are few and short: one command per part, praise, and labels on the box, the wall and
 * the book, in the device's language (seven languages, Arabic right to left; the globe in the sticker book
 * changes it). Level 1 is on screen at once, with a dashed outline of the missing part,
 * a pulsing start dot and a ghost hand that shows the gesture; the hand comes back whenever the player
 * waits. A stroke is compared with the level's hidden path when the finger lifts. A miss never ends
 * anything: the line fades, the hand shows the way again, and after a few misses the player's line slides
 * into place by itself. From chapter 3 a level has two parts, drawn one after the other. Stars: 3 for a first
 * try, 2 with retries, 1 when helped. The next level starts by itself; a tap skips the end of a celebration.
 * Each chapter of five ends on the wall of the player's own pictures, which plays each picture once in turn and
 * then opens the next chapter. Every star is a paint drop for the jar; a full jar gives a surprise box with a
 * sticker the player does not have yet (two sets of six), kept in the sticker book behind the jar.
 *
 * The 720 x 1280 scene is drawn by code (art.js). What never moves is drawn once per level into a
 * back layer; only the moving pieces, the stroke and the particles are drawn each frame. The wall shows
 * cached cards and animates one at a time. Tunable numbers live in game_config.json.
 */
import { sticker, stick, shape, star, box, blob, dots, borderScale, colourPass, resample, chaikin, pathLen, dist, upTo, STICKERS, WHITE, PEN, NAVY, SUNNY, CORAL, MINT, VIOLET, SKY, ORANGE } from './art.js';
import { LEVELS } from './levels.js';

const W = 720, H = 1280, STEP = 8, CHAPTER = 5, SET = 6;
const DEBUG = location.search.includes('local');
const CONFETTI = [SUNNY, CORAL, MINT, VIOLET, SKY, WHITE];
const MUTE = { x: 24, y: 1040, s: 96 }; // sound button, lower left, clear of the feed's swipe edge
const WALLB = { x: 600, y: 1040, s: 96 }; // button to the wall, lower right
const JAR = { x: 24, y: 40, s: 110 }; // the paint jar, top left; it opens the sticker book
const BACK = { x: 312, y: 1110, s: 96 }; // the way back out of the sticker book
const LANGB = { x: 140, y: 46, w: 440, h: 96 }; // the language button at the top of the sticker book
const CARD = { k: 0.4, w: 288, h: 320, top: 280, border: 1.6, pad: 30 }; // a wall card shows the scene at 0.4, cropped from y = 280
const SKIN = '#FFD8B5';
const ease = (k) => 1 - Math.pow(1 - Math.max(0, Math.min(1, k)), 3);

let cv, g, cfg, mode, raf = 0, last = 0, runs = 0;
let save = { level: 0, stars: {}, art: {}, muted: false, drops: 0, stickers: [], lang: null, day: 0 }, saveRead = false, muteTouched = false;
let view = 'play', wall = null, gift = null, book = null; // 'play' a level, 'wall' the finished pictures, 'box' a surprise box, 'book' the stickers
let lang = 'en', said = { key: '', t: 0 }; // the language shown; the command on screen and when it appeared
let jarShown = 0, flyers = [], dropsSince = 0, dropsMerged = false; // drops in the jar as drawn, drops on their way to it, drops earned (less boxes opened) before the stored count was merged
let S = null, target = [], targetLen = 0, closed = false, back = null, bits = [];
let pointerDown = false, touched = false, bound = false, press = null;
let ac = null, lastTick = 0, timers = [];
let quality = 0, frameTimes = [], slow = 0, fast = 0; // 0 full, 1 fewer particles, 2 also a still wall
const cardBacks = [], cardImgs = [];
let wallBack = null;

// ---------- words ----------
/** Player-facing text for key k in the current language; English when the language lacks it. All text lives in cfg.strings. */
const T = (k) => (cfg.strings[lang] && cfg.strings[lang][k]) || cfg.strings.en[k] || k;
/** The first device language the game has text for, else English. */
function detectLang() {
  for (const l of navigator.languages || [navigator.language || 'en']) { const base = String(l).toLowerCase().split('-')[0]; if (cfg.strings[base]) return base; }
  return 'en';
}
const rtl = () => (cfg.rtl || []).includes(lang);
/** Text centred on (x, y), bold, shrunk until it fits in maxW. Returns the width drawn. */
function words(str, x, y, size, maxW, color) {
  g.direction = rtl() ? 'rtl' : 'ltr'; g.textAlign = 'center'; g.textBaseline = 'middle';
  let px = size; g.font = `bold ${px}px system-ui, 'Noto Sans', sans-serif`;
  while (px > 18 && g.measureText(str).width > maxW) { px -= 2; g.font = `bold ${px}px system-ui, 'Noto Sans', sans-serif`; }
  g.fillStyle = color; g.fillText(str, x, y);
  return Math.min(maxW, g.measureText(str).width);
}
/** A white pill with words in it, centred at (x, y); pop scales it for a bounce. */
function banner(str, x, y, size, maxW, color = NAVY, pop = 1) {
  g.save(); g.translate(x, y); g.scale(pop, pop);
  g.font = `bold ${size}px system-ui, 'Noto Sans', sans-serif`;
  const w = Math.min(maxW, g.measureText(str).width) + 64, h = size + 34;
  box(g, -w / 2, -h / 2 + 6, w, h, h / 2, 'rgba(31,42,107,0.22)');
  box(g, -w / 2, -h / 2, w, h, h / 2, WHITE);
  words(str, 0, 2, size, maxW, color);
  g.restore();
}
const popIn = (age) => (age < 0.35 ? 0.6 + 0.4 * ease(age / 0.35) + Math.sin(Math.min(1, age / 0.35) * Math.PI) * 0.12 : 1);

/** The command for the part being drawn, or "try again" just after a miss; praise once the level is done. */
function drawWords() {
  if (S.won < 0) {
    const key = S.mood === 'sad' && S.sadFor > 0 ? 'miss' : 'L' + (S.i % LEVELS.length + 1) + (S.k ? 'b' : '');
    if (said.key !== key) said = { key, t: S.t };
    banner(T(key), W / 2, 200, 46, 560, key === 'miss' ? CORAL : NAVY, popIn(S.t - said.t));
  } else if (S.daily && S.won > 1.5) banner(T('daily'), W / 2, 196, 52, 560, CORAL, popIn(S.won - 1.5));
  else if (S.won > 0.4) banner(T('p' + S.stars), W / 2, 196, 52, 520, ORANGE, popIn(S.won - 0.4));
}

// ---------- host calls that must never stop the game ----------
const buzz = (kind) => { try { if (lib.haptics && lib.haptics.play) lib.haptics.play(kind); } catch (e) { /* no vibration here */ } };
/** Write the save, but only after the player's own save has been read, so it can never overwrite it. */
const persist = () => { if (mode === 'play' && saveRead) Promise.resolve().then(() => lib.saveUserGameState(save)).catch(() => {}); };

// ---------- sound (synthesized; starts on the first touch) ----------
function beep(freq, len, type = 'sine', vol = 0.1, slide = 0) {
  if (!ac || save.muted || ac.state !== 'running') return;
  const o = ac.createOscillator(), v = ac.createGain(), t = ac.currentTime;
  o.type = type; o.frequency.setValueAtTime(freq, t); if (slide) o.frequency.linearRampToValueAtTime(Math.max(40, freq + slide), t + len);
  v.gain.setValueAtTime(vol, t); v.gain.exponentialRampToValueAtTime(0.001, t + len);
  o.connect(v).connect(ac.destination); o.start(t); o.stop(t + len);
}
function startAudio() {
  if (!ac) { const AC = window.AudioContext || window.webkitAudioContext; if (AC) ac = new AC(); }
  if (ac && ac.state === 'suspended' && !document.hidden) ac.resume().catch(() => {});
}
/** A note sequence; pending notes are dropped when the level or the screen changes. */
function tune(notes, gap, len, vol) { notes.forEach((f, i) => timers.push(setTimeout(() => beep(f, len, 'triangle', vol), i * gap))); }
function hush() { for (const t of timers) clearTimeout(t); timers = []; }

// ---------- level ----------
/** State of one scene: the level being played, or a card on the wall. */
function scene(lv, i) {
  const s = {
    i, lv, t: 0, won: -1, mood: 'wait', look: null, pen: null, liftAt: 0, morph: null, misses: 0, k: 0, partMisses: 0,
    lines: [], done: [], // the player's line for each part, and the scene time it was drawn
    faded: null, sadFor: 0, assisted: false, stars: 0, starsShown: 0, freeze: 0, cue: 0, did: {}, quiet: false, idle: 0, dotPop: 0, daily: 0,
    get stroke() { return s.lines[0] || null; },
    once(key, fn) { if (!s.did[key]) { s.did[key] = true; fn(); } },
    burst(x, y, n) { if (!s.quiet) confetti(x, y, n); },
    art(n) { return save.art[n] || null; },
    age(k) { return s.done[k] != null ? s.t - s.done[k] : 99; },
    part(ctx, width, color, k = 0) {
      const line = s.lines[k]; if (!line) return;
      const age = s.done[k] != null ? s.t - s.done[k] : s.won, pop = age < 0.3 ? 1 + Math.sin(age / 0.3 * Math.PI) * 0.25 : 1, c = age < 0.15 ? PEN : color;
      if (partsOf(lv)[k].closed) return shape(ctx, line, c);
      stick(ctx, line, width * pop, c);
      if (colourPass() && quality < 2) { ctx.save(); ctx.globalAlpha = 0.4; ctx.translate(0, -width * 0.18); stick(ctx, line, width * 0.25, WHITE); ctx.restore(); }
    },
  };
  return s;
}

/** A level's parts in drawing order; a one-part level lists its own target. */
const partsOf = (lv) => lv.parts || [{ target: lv.target, closed: lv.closed }];
/** Where part k of level n is kept in the save: the level number for the first part, "n.k" after it. */
const artKey = (n, k) => (k ? n + '.' + k : String(n));
const chapterOf = (i) => Math.floor((i % LEVELS.length) / CHAPTER);
const drawnAll = (n) => partsOf(LEVELS[n]).every((_, k) => save.art[artKey(n, k)]);
const chapterDrawn = (c) => { for (let n = c * CHAPTER; n < (c + 1) * CHAPTER; n++) if (!drawnAll(n)) return false; return true; };

/** Make part k the one being drawn. */
function setPart(k) {
  const p = partsOf(S.lv)[k];
  S.k = k; S.partMisses = 0; target = resample(p.target, STEP); targetLen = pathLen(target); closed = !!p.closed;
}

/** Start level i: build its hidden path and its back layer. */
function newLevel(i) {
  const lv = LEVELS[i % LEVELS.length];
  hush(); view = 'play'; wall = null; gift = null; book = null; press = null; pointerDown = false;
  S = scene(lv, i); S.flip = Math.floor(i / LEVELS.length) % 2 === 1; setPart(0);
  bits = [];
  back = back || document.createElement('canvas'); back.width = W; back.height = H;
  const b = back.getContext('2d'); b.fillStyle = lv.bg; b.fillRect(0, 0, W, H); if (S.flip) { b.translate(W, 0); b.scale(-1, 1); } lv.back(b);
}

/** Every other round shows the scenes mirrored, so a second pass through the chapters is a fresh picture.
 *  The level's own drawing, its hidden path and the stored lines stay in the level's frame; only the
 *  finger, the confetti and the words are in the screen's frame. */
const mirror = (p) => p.map((q) => [W - q[0], q[1]]);
const toLevel = (p) => (S.flip ? mirror(p) : p);

const easy = () => S.i % LEVELS.length < cfg.easyLevels; // a later round starts gently again too

// ---------- the wall: every picture the player finished, alive, with the player's own lines ----------
const cardAt = (n) => ({ x: 48 + (n % 2) * 336, y: 170 + Math.floor(n / 2) * 360 });

/** A card in its white frame with its shadow, at the origin. */
function frameCard(ctx, c, won) {
  box(ctx, -12, 0, CARD.w + 24, CARD.h + 24, 34, 'rgba(31,42,107,0.25)');
  box(ctx, -12, -12, CARD.w + 24, CARD.h + 24, 34, WHITE);
  ctx.save(); box(ctx, 0, 0, CARD.w, CARD.h, 24, c.s.lv.bg); ctx.clip(); cardScene(ctx, c, won); ctx.restore(); // the rounded card is the current path, so it can clip
}

/** Draw one card's scene into ctx at card scale; won is the payoff time to show. */
function cardScene(ctx, c, won) {
  const s = c.s; s.won = won; s.t = wall.t; s.done = s.lines.map(() => s.t - won); // on a card every part was drawn as the replay starts
  ctx.drawImage(cardBacks[s.i % LEVELS.length], 0, -CARD.top * CARD.k);
  if (!s.lines.length) { ctx.fillStyle = 'rgba(31,42,107,0.45)'; ctx.fillRect(0, 0, CARD.w, CARD.h); return; }
  ctx.save(); ctx.scale(CARD.k, CARD.k); ctx.translate(0, -CARD.top); const was = borderScale(CARD.border);
  s.lv.live(ctx, s);
  borderScale(was); ctx.restore();
}

/** Level n's background at card scale; backgrounds never change, so each is drawn once per game. */
function cardBack(n) {
  if (!cardBacks[n]) {
    const lv = LEVELS[n], c = cardBacks[n] = document.createElement('canvas'); c.width = Math.round(W * CARD.k); c.height = Math.round(H * CARD.k);
    const b = c.getContext('2d'); b.scale(CARD.k, CARD.k); b.fillStyle = lv.bg; b.fillRect(0, 0, W, H); lv.back(b);
  }
  return cardBacks[n];
}

/** The wall of chapter c. next is the level the arrow leads to; opens is true when it leads into a new chapter. */
function openWall(c = 0, next = 0, opens = false) {
  hush(); view = 'wall'; bits = []; pointerDown = false; press = null; gift = null; book = null;
  if (!wallBack) { wallBack = document.createElement('canvas'); wallBack.width = W; wallBack.height = H; const b = wallBack.getContext('2d'); b.fillStyle = VIOLET; b.fillRect(0, 0, W, H); dots(b); }
  wall = { t: 0, rest: 0, c, next, opens, unlocked: opens ? -1 : 0, turn: -1, started: new Set(), cards: [], big: -1, bigAt: 0 }; // big: the card shown large to show it off
  cardBack(next % LEVELS.length);
  for (let j = 0; j < CHAPTER; j++) {
    const n = c * CHAPTER + j, lv = LEVELS[n]; cardBack(n);
    const s = scene(lv, n); s.quiet = true; s.mood = 'happy';
    if (drawnAll(n)) s.lines = partsOf(lv).map((_, k) => save.art[artKey(n, k)]);
    const img = cardImgs[j] = cardImgs[j] || document.createElement('canvas'); img.width = CARD.w + 2 * CARD.pad; img.height = CARD.h + 2 * CARD.pad;
    const card = { s, img, t0: -99, pop: 0 };
    // the finished picture in its tilted frame, drawn once: turning images every frame is what slows phones down
    const b = img.getContext('2d');
    b.setTransform(1, 0, 0, 1, 0, 0); b.clearRect(0, 0, img.width, img.height);
    b.translate(img.width / 2, img.height / 2); b.rotate((j % 2 ? 1 : -1) * 0.025); b.translate(-CARD.w / 2, -CARD.h / 2);
    frameCard(b, card, cfg.cardRestSeconds);
    wall.cards.push(card);
  }
  tune([659, 784, 988, 1319], 110, 0.25, 0.09);
}

/** Play card n's scene from the start. */
function playCard(n) { for (const o of wall.cards) o.t0 = -99; const c = wall.cards[n]; c.t0 = wall.t; c.pop = 1; wall.turn = n; wall.started.add(n); }

/** The lock on the way into the next chapter springs open. */
function unlock() { if (wall.unlocked < 0) { wall.unlocked = wall.t; const a = cardAt(CHAPTER); confetti(a.x + CARD.w / 2, a.y + CARD.h / 2, cfg.confetti); tune([784, 988, 1175, 1568], 90, 0.25, 0.1); buzz('success'); } }

function wallTap(p) {
  if (wall.big >= 0) { wall.big = -1; beep(660, 0.06, 'triangle'); return; } // any tap puts the big picture back
  const nx = cardAt(CHAPTER);
  if (Math.hypot(p[0] - nx.x - CARD.w / 2, p[1] - nx.y - CARD.h / 2) < 130) {
    if (wall.opens && wall.unlocked < 0) { beep(300, 0.08); buzz('tap'); return; } // still locked: the pictures play first
    beep(880, 0.1, 'triangle'); buzz('tap'); return newLevel(wall.next); }
  wall.cards.forEach((c, n) => {
    const { x, y } = cardAt(n);
    if (!c.s.lines.length || p[0] < x || p[0] > x + CARD.w || p[1] < y || p[1] > y + CARD.h) return;
    playCard(n); buzz('success'); hush(); wall.big = n; wall.bigAt = wall.t; beep(1800, 0.05, 'square', 0.04); tune(c.s.lv.notes, 90, 0.2, 0.09); // a camera flash, then the picture plays large
  });
}

function updateWall(dt) {
  wall.t += dt; moveBits(dt);
  for (const c of wall.cards) c.pop = Math.max(0, c.pop - dt * 3);
  if (wall.big >= 0) { if (wall.t - wall.bigAt < cfg.cardRestSeconds + cfg.bigExtra) { wall.rest = 0; return; } wall.big = -1; }
  // one card at a time plays its scene, each once, in turn; the others show their finished picture
  const playing = wall.cards.some((c) => wall.t - c.t0 < cfg.cardRestSeconds);
  if (playing) { wall.rest = 0; return; }
  if (quality < 2) {
    for (let k = 1; k <= wall.cards.length; k++) {
      const n = (wall.turn + k) % wall.cards.length;
      if (wall.cards[n].s.lines.length && !wall.started.has(n)) { playCard(n); wall.cards[n].pop = 0; return; }
    }
  }
  // every picture has played: the next chapter opens, and the game carries on after a short pause
  // (longer when the wall is kept still on a slow phone)
  unlock();
  wall.rest += dt;
  if (wall.rest > (quality < 2 ? cfg.wallEndPause : cfg.wallSeconds)) newLevel(wall.next);
}

/** The card the player tapped, large in the middle with its stars: a picture to show someone. */
function drawBig() {
  const c = wall.cards[wall.big], a = wall.t - wall.bigAt, grow = ease(a / 0.3), from = cardAt(wall.big);
  const k = 1 + grow * 1.1, cx = from.x + CARD.w / 2 + (W / 2 - from.x - CARD.w / 2) * grow, cy = from.y + CARD.h / 2 + (590 - from.y - CARD.h / 2) * grow;
  g.globalAlpha = 0.75 * grow; g.fillStyle = VIOLET; g.fillRect(0, 0, W, H); g.globalAlpha = 1;
  g.save(); g.translate(cx, cy); g.scale(k, k); g.translate(-CARD.w / 2, -CARD.h / 2); frameCard(g, c, a); g.restore();
  for (let j = 0; j < 3; j++) sticker(() => star(g, W / 2 + (j - 1) * 110, 1010 + (1 - grow) * 200, 44, j < (save.stars[c.s.i] || 0) ? ORANGE : '#D9CCFF', (j - 1) * 0.18));
  if (a < 0.3) { g.globalAlpha = 0.85 * (1 - a / 0.3); g.fillStyle = WHITE; g.fillRect(0, 0, W, H); g.globalAlpha = 1; } // the flash
}

function drawWall() {
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.drawImage(wallBack, 0, 0);
  wall.cards.forEach((c, n) => {
    const { x, y } = cardAt(n), live = wall.t - c.t0 < cfg.cardRestSeconds;
    if (live) { // the card that is playing lifts up straight and a little larger
      const pop = 1.04 + c.pop * 0.06;
      g.save(); g.translate(x + CARD.w / 2, y + CARD.h / 2 - 8); g.scale(pop, pop); g.translate(-CARD.w / 2, -CARD.h / 2);
      frameCard(g, c, wall.t - c.t0); g.restore();
    } else g.drawImage(c.img, x - CARD.pad, y - CARD.pad);
    if (c.s.lines.length) { // stars on a white tab along the bottom of the card
      box(g, x + CARD.w / 2 - 78, y + CARD.h - 52, 156, 44, 22, WHITE);
      for (let j = 0; j < 3; j++) star(g, x + CARD.w / 2 + (j - 1) * 46, y + CARD.h - 30, 16, j < (save.stars[c.s.i] || 0) ? ORANGE : '#D9CCFF');
    }
  });
  // the way on: a round window onto the next level with a big arrow; into a new chapter it is locked until every picture has played
  const nx = cardAt(CHAPTER), cx = nx.x + CARD.w / 2, cy = nx.y + CARD.h / 2, r = 104 + Math.sin(wall.t * 5) * 7, peek = cardBacks[wall.next % LEVELS.length];
  g.fillStyle = 'rgba(31,42,107,0.25)'; g.beginPath(); g.arc(cx, cy + 8, r + 10, 0, 7); g.fill();
  g.fillStyle = WHITE; g.beginPath(); g.arc(cx, cy, r + 10, 0, 7); g.fill();
  g.save(); g.beginPath(); g.arc(cx, cy, r - 4, 0, 7); g.clip(); g.drawImage(peek, cx - peek.width / 2, cy - peek.height * 0.55); g.restore();
  const locked = wall.unlocked < 0, open = locked ? 0 : ease((wall.t - wall.unlocked) / 0.5);
  if (!locked || !wall.opens) {
    g.fillStyle = WHITE; g.beginPath(); g.arc(cx, cy, 62, 0, 7); g.fill();
    g.fillStyle = MINT; g.beginPath(); g.moveTo(cx - 24, cy - 38); g.lineTo(cx + 40, cy); g.lineTo(cx - 24, cy + 38); g.closePath(); g.fill();
  }
  if (wall.opens && open < 1) { // the padlock: its loop lifts and the lock drops away
    const drop = open * 160, shake = locked ? Math.sin(wall.t * 18) * (wall.t % 2 < 0.3 ? 4 : 0) : 0;
    g.save(); g.globalAlpha = 1 - open; g.translate(cx + shake, cy + drop);
    g.lineWidth = 16; g.strokeStyle = NAVY; g.beginPath(); g.arc(0, -24 - open * 30, 30, Math.PI, 0); g.stroke();
    sticker(() => box(g, -48, -24, 96, 76, 18, SUNNY)); g.fillStyle = NAVY; g.beginPath(); g.arc(0, 10, 10, 0, 7); g.fill();
    g.restore();
  }
  for (const b of bits) { g.globalAlpha = Math.min(1, b.life * 3); g.fillStyle = b.c; g.beginPath(); g.arc(b.x, b.y, b.s, 0, 7); g.fill(); }
  g.globalAlpha = 1;
  if (wall.big >= 0) drawBig();
  if (wall.opens && wall.unlocked >= 0 && wall.next > 0 && wall.next < LEVELS.length) banner(T('open').replace('{n}', chapterOf(wall.next) + 1), W / 2, 84, 46, 600, VIOLET, popIn(wall.t - wall.unlocked));
}

// ---------- judging ----------
/** Share of points in a that lie within reach of path b. */
function near(a, b, reach) {
  let hit = 0;
  for (const p of a) { for (const q of b) if (Math.abs(p[0] - q[0]) <= reach && Math.abs(p[1] - q[1]) <= reach && dist(p, q) <= reach) { hit++; break; } }
  return a.length ? hit / a.length : 0;
}
const longEnough = (pen) => pathLen(pen) >= targetLen * cfg.minStrokeShare;
const passes = (pen) => near(target, pen, cfg.tolerance) >= cfg.passCoverage && near(pen, target, cfg.tolerance * cfg.precisionReach) >= cfg.passPrecision;

/** Compare the finished stroke with the hidden path: win, miss, or (too short) a nudge. */
function judge() {
  const shown = resample(S.pen, STEP), pen = toLevel(shown); S.pen = null; S.liftAt = 0;
  if (!longEnough(pen)) { S.mood = 'wait'; S.dotPop = 1; S.idle = 99; beep(660, 0.08, 'sine', 0.06); return; } // a dab: show the way again
  if (passes(pen)) return win(pen, null);
  S.misses++; S.partMisses++;
  if (S.partMisses > (easy() ? cfg.assistAfterEasy : cfg.assistAfter)) { S.assisted = true; return win(target, pen); }
  S.faded = { pts: shown, age: 0 }; S.mood = 'sad'; S.sadFor = 0.9; S.idle = 99;
  beep(520, 0.1, 'sine', 0.06); timers.push(setTimeout(() => beep(620, 0.12, 'sine', 0.06), 120)); buzz('tap');
}

/** Throw n pieces of confetti from (x, y). */
function confetti(x, y, n) {
  if (view === 'play' && S && S.flip) x = W - x; // the level's points are in its own frame
  n = Math.round(n * (quality ? 0.5 : 1));
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, v = 250 + Math.random() * 520;
    bits.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 380, g: 1500, c: CONFETTI[i % CONFETTI.length], s: 5 + Math.random() * 5, life: 1.1 + Math.random() * 0.7 });
  }
}

/** The line becomes the part. from is the player's own line when the game helped. After the last part the
 *  scene comes alive; after an earlier one the next part is shown. */
function win(pen, from) {
  let line = resample(chaikin(resample(pen, 14), 2), 10); // smooth, and few enough points to draw thick lines fast
  if (dist(line[0], target[0]) > dist(line[line.length - 1], target[0])) line = line.slice().reverse(); // payoffs run from the path's start
  if (S.morph) S.lines[S.morph.k] = S.morph.to; // a slide still under way finishes first
  const k = S.k, last = k === partsOf(S.lv).length - 1;
  S.lines[k] = line; S.done[k] = S.t; S.morph = null; S.mood = 'happy'; S.look = null; S.faded = null; S.freeze = 0.09; S.idle = 0;
  if (from && from.length > 1) { // the player's own line slides into place
    let f = resample(from, STEP); if (dist(f[0], line[0]) > dist(f[f.length - 1], line[0])) f = f.slice().reverse();
    S.morph = { k, from: line.map((_, i) => f[Math.round(i / Math.max(1, line.length - 1) * (f.length - 1))]), to: line };
    S.lines[k] = S.morph.from;
  }
  if (!last) { // one part done: a small cheer, then the next part's start dot pops and the hand shows it soon
    confetti(line[line.length - 1][0], line[line.length - 1][1], cfg.confetti / 3);
    tune(S.lv.notes.slice(0, 2), 90, 0.18, 0.09); buzz('tap');
    setPart(k + 1); S.sadFor = 0.9; S.dotPop = 1; S.idle = (easy() ? cfg.ghostIdleEasy : cfg.ghostIdle) - 1;
    return;
  }
  S.won = 0;
  S.stars = S.assisted ? 1 : S.misses === 0 ? 3 : 2;
  confetti(line[line.length - 1][0], line[line.length - 1][1], cfg.confetti);
  // sparkles rise off the whole line as it turns into the part
  if (!quality) for (const p of resample(toLevel(line), 24)) bits.push({ x: p[0], y: p[1], vx: (Math.random() - 0.5) * 120, vy: -120 - Math.random() * 160, g: -60, c: WHITE, s: 5, life: 0.5 + Math.random() * 0.5 });
  tune(S.lv.notes, 90, 0.22, 0.1);
  buzz('success');
  // keep the lines and the stars for the wall and for later scenes; help never replaces the player's own picture
  const n = S.i % LEVELS.length;
  save.stars[n] = Math.max(save.stars[n] || 0, S.stars);
  const mine = !S.assisted || !drawnAll(n);
  // up to 90 points whatever the length, so a long line is kept whole
  if (mine) S.lines.forEach((l, j) => { const m = S.morph && S.morph.k === j ? S.morph.to : l; save.art[artKey(n, j)] = resample(m, Math.max(12, pathLen(m) / 89)).slice(0, 90).map((p) => [Math.round(p[0]), Math.round(p[1])]); });
  save.level = Math.max(save.level, S.i + 1);
  // every star is a paint drop that flies to the jar
  save.drops += S.stars; dropsSince += S.stars;
  for (let j = 0; j < S.stars; j++) flyers.push({ x: W / 2 + (j - 1) * 112, y: 310, t: -0.55 - j * 0.25 });
  // the first win of a new day brings a gift of extra drops; a clock turned back gives nothing
  const td = today();
  if (saveRead && td > save.day) {
    if (save.day) { S.daily = cfg.dailyDrops; save.drops += S.daily; dropsSince += S.daily; for (let j = 0; j < S.daily; j++) flyers.push({ x: W / 2 + (j - 1) * 80, y: 290, t: -1.7 - j * 0.2 }); }
    save.day = td;
  }
  persist();
}

// ---------- input ----------
function point(e) { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * W, (e.clientY - r.top) / r.height * H]; }
const onButton = (b, p) => Math.hypot(p[0] - b.x - b.s / 2, p[1] - b.y - b.s / 2) <= b.s / 2 + 8;

/** What a press at p would trigger, or null for drawing. */
function pressTarget(p) {
  if (view === 'wall') return 'wall';
  if (view === 'box') return 'box';
  if (view === 'book') return 'book';
  if (wallShown() && onButton(WALLB, p)) return 'toWall';
  if (muteShown() && onButton(JAR, p)) return 'jar';
  if (muteShown() && onButton(MUTE, p)) return 'mute';
  if (S.won >= 0) return 'skip';
  return null;
}

/** Buttons act on release with little travel, so a swipe of the feed or a gripping thumb does nothing. */
function release(p) {
  const pr = press; press = null;
  if (!pr || dist(p, pr.p) > cfg.tapTravel) return;
  if (pr.what === 'wall') return wallTap(p);
  if (pr.what === 'toWall' && onButton(WALLB, p)) { const c = wallChapter(); return openWall(c, S.i, false); }
  if (pr.what === 'jar' && onButton(JAR, p)) return openBook();
  if (pr.what === 'box') return gift.open < 0 ? popBox() : gift.t - gift.open > cfg.skipAfter * 0.5 ? gift.then() : undefined;
  if (pr.what === 'book') {
    if (p[0] > LANGB.x && p[0] < LANGB.x + LANGB.w && p[1] > LANGB.y && p[1] < LANGB.y + LANGB.h) { const all = Object.keys(cfg.strings); lang = save.lang = all[(all.indexOf(lang) + 1) % all.length]; persist(); beep(760, 0.07); return; }
    if (onButton(BACK, p)) { beep(700, 0.08); view = 'play'; book = null; S.idle = 0; } return; }
  if (pr.what === 'mute' && onButton(MUTE, p)) { save.muted = !save.muted; muteTouched = true; beep(700, 0.08); persist(); return; }
  if (pr.what === 'skip' && S.won > cfg.skipAfter) { S.won = 99; S.cue = (S.lv.cues || []).length; S.starsShown = S.stars; } // skip the sounds still to come too
}

function bindInput() {
  if (bound) return; bound = true;
  cv.addEventListener('pointerdown', (e) => {
    if (mode !== 'play' || !e.isPrimary) return;
    e.preventDefault(); startAudio(); touched = true;
    try { cv.setPointerCapture(e.pointerId); } catch (err) { /* pointer already gone */ }
    const p = point(e), what = pressTarget(p);
    if (what) { press = { what, p }; return; }
    pointerDown = true; S.look = p; S.mood = 'draw'; S.sadFor = 0; S.idle = 0;
    // a finger that lifts and comes back near the end of the line carries on with it
    if (S.pen && S.liftAt && dist(p, S.pen[S.pen.length - 1]) <= cfg.liftReach) S.liftAt = 0;
    else { S.pen = [p]; S.faded = null; S.liftAt = 0; }
  });
  cv.addEventListener('pointermove', (e) => {
    if (!pointerDown || !S.pen || !e.isPrimary) return;
    const p = point(e); p[0] = Math.max(0, Math.min(W, p[0])); p[1] = Math.max(0, Math.min(H, p[1]));
    S.look = p;
    if (S.pen.length < 600 && dist(p, S.pen[S.pen.length - 1]) >= 4) {
      S.pen.push(p);
      // the pencil sound climbs as the line gets longer
      if (S.t - lastTick > 0.06) { lastTick = S.t; beep(420 + Math.min(1.2, pathLen(S.pen) / targetLen) * 520, 0.05, 'sine', 0.035); }
    }
  });
  const up = (e) => {
    if (!e.isPrimary || mode !== 'play') return;
    if (e.type === 'pointerup') startAudio(); // phones count the lift, not the press, as the gesture that may start sound
    if (press) return release(point(e));
    if (!pointerDown) return;
    pointerDown = false;
    if (!S.pen) return;
    // a line that already fits is judged at once; anything else waits a moment in case the finger comes back
    const pen = toLevel(resample(S.pen, STEP));
    if (e.type === 'pointerup' && longEnough(pen) && passes(pen)) judge(); else S.liftAt = performance.now();
  };
  cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', (e) => { press = null; up(e); });
  document.addEventListener('visibilitychange', () => { if (ac) (document.hidden ? ac.suspend() : ac.resume()).catch(() => {}); });
}

// ---------- frame ----------
/** The sound button shows once the first level is behind the player. */
const muteShown = () => mode === 'play' && view === 'play' && (S.i > 0 || (save.level > 0 && S.won < 0)); // not popping in mid-celebration on level 1

/** The newest chapter, up to the current one, whose pictures are all drawn; -1 when there is none yet. */
function wallChapter() { for (let c = chapterOf(S.i); c >= 0; c--) if (chapterDrawn(c)) return c; return -1; }

/** The wall button shows once a whole chapter is drawn. */
const wallShown = () => mode === 'play' && view === 'play' && S.won < 0 && !S.lines.length && wallChapter() >= 0; // not while a part is drawn: leaving would lose it

const celebrate = () => (S.i === 0 ? cfg.celebrateSeconds : cfg.celebrateLater) + (S.daily ? 1 : 0);
/** Today as a number (20261119), from the device calendar, so a new day starts at local midnight. */
const today = () => { const d = new Date(); return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate(); };

/** After a celebration: a surprise box when the jar is full, then the next level, or the wall at a chapter's end. */
function finish() {
  const next = S.i + 1, go = next % CHAPTER === 0 ? () => openWall(chapterOf(S.i), next, true) : () => newLevel(next);
  if (saveRead && save.drops >= cfg.jarDrops && save.stickers.length < STICKERS.length) openBox(go); else go();
}

// ---------- surprise box and sticker book ----------
/** A sticker the player does not have: from the first set not yet complete. */
function pickSticker() {
  for (let s0 = 0; s0 < STICKERS.length; s0 += SET) {
    const left = []; for (let id = s0; id < s0 + SET; id++) if (!save.stickers.includes(id)) left.push(id);
    if (left.length) return left[Math.floor(Math.random() * left.length)];
  }
  return -1;
}
const setDone = (s0) => { for (let id = s0; id < s0 + SET; id++) if (!save.stickers.includes(id)) return false; return true; };

/** The box opens on a tap, or by itself after a moment; the sticker is saved as soon as the box appears. */
function openBox(then) {
  const id = pickSticker(); if (id < 0) return then();
  save.stickers.push(id); save.drops -= cfg.jarDrops; dropsSince -= cfg.jarDrops; jarShown = Math.min(cfg.jarDrops, save.drops); persist();
  hush(); view = 'box'; press = null; pointerDown = false; bits = []; flyers = [];
  gift = { t: 0, open: -1, id, then, full: setDone(id - id % SET) };
  tune([392, 494, 587], 120, 0.2, 0.08);
}

function updateBox(dt) {
  gift.t += dt; moveBits(dt);
  if (gift.open < 0 && gift.t > cfg.boxAutoOpen) popBox();
  if (gift.open >= 0 && gift.t - gift.open > cfg.boxShowSeconds) gift.then();
}
function popBox() {
  if (gift.open >= 0) return;
  gift.open = gift.t; confetti(W / 2, 700, cfg.confetti); buzz('success');
  tune(gift.full ? [523, 659, 784, 1047, 1319, 1568] : [659, 784, 1047, 1319], 90, 0.25, 0.1);
}

function drawBox() {
  const a = gift.open < 0 ? 0 : gift.t - gift.open, cx = W / 2, cy = 760;
  g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = VIOLET; g.fillRect(0, 0, W, H); dots(g); // a full panel, bright and not see-through
  // rays behind the box, then the box: it wobbles, its lid flies off, the sticker rises out
  g.save(); g.translate(cx, cy - 120); g.rotate(gift.t * 0.6); g.fillStyle = 'rgba(255,255,255,0.18)';
  for (let i = 0; i < 12; i++) { g.rotate(Math.PI / 6); g.beginPath(); g.moveTo(0, 0); g.lineTo(-60, -560); g.lineTo(60, -560); g.fill(); }
  g.restore();
  const wob = gift.open < 0 ? Math.sin(gift.t * 16) * 0.06 * (gift.t % 1 < 0.5 ? 1 : 0.3) : 0, sq = gift.open < 0 ? 1 + Math.sin(gift.t * 8) * 0.03 : 1;
  g.save(); g.translate(cx, cy + 140); g.rotate(wob); g.scale(1 / sq, sq);
  sticker(() => { box(g, -130, -200, 260, 200, 24, CORAL); box(g, -24, -200, 48, 200, 8, SUNNY); });
  const lid = ease(a / 0.4);
  g.translate(lid * 220, -lid * 380); g.rotate(lid * 1.4);
  sticker(() => { box(g, -150, -250, 300, 66, 20, CORAL); box(g, -24, -250, 48, 66, 8, SUNNY); blob(g, -40, -270, 40, 26, SUNNY, 0.4); blob(g, 40, -270, 40, 26, SUNNY, -0.4); });
  g.restore();
  if (gift.open >= 0) {
    const up = ease(a / 0.6), r = 120 * up * (1 + Math.max(0, 0.3 - Math.abs(a - 0.6)) * 0.8), y = cy - 40 - up * 260;
    g.fillStyle = WHITE; g.beginPath(); g.arc(cx, y, r * 1.25, 0, 7); g.fill();
    STICKERS[gift.id](g, cx, y, r);
    // the set it belongs to: six slots, the new one glowing
    banner(T(gift.full ? 'setDone' : 'sticker'), W / 2, 214, 52, 520, gift.full ? ORANGE : VIOLET, popIn(a - 0.3));
    const s0 = gift.id - gift.id % SET;
    for (let j = 0; j < SET; j++) {
      const id = s0 + j, x = cx + (j - 2.5) * 104, yy = 1060, has = save.stickers.includes(id);
      if (gift.full) { g.fillStyle = SUNNY; g.beginPath(); g.arc(x, yy, 54, 0, 7); g.fill(); } // a finished set gets gold rings
      g.fillStyle = WHITE; g.beginPath(); g.arc(x, yy, 46, 0, 7); g.fill();
      if (has) STICKERS[id](g, x, yy, id === gift.id ? 34 + Math.sin(a * 10) * 3 : 34); else { g.fillStyle = '#D9CCFF'; g.beginPath(); g.arc(x, yy, 26, 0, 7); g.fill(); }
    }
  } else { // the hand shows where to tap
    banner(T('tap'), W / 2, 420, 56, 400, CORAL, 1 + Math.abs(Math.sin(gift.t * 4)) * 0.06);
    hand(cx + 40, cy - 20 + Math.abs(Math.sin(gift.t * 4)) * 20);
  }
  for (const b of bits) { g.globalAlpha = Math.min(1, b.life * 3); g.fillStyle = b.c; g.beginPath(); g.arc(b.x, b.y, b.s, 0, 7); g.fill(); }
  g.globalAlpha = 1;
}

/** Book: four panels of one set each, two by two; a panel holds three rows of two. */
const panelAt = (s) => ({ x: 30 + (s % 2) * 340, y: 200 + Math.floor(s / 2) * 450, w: 320, h: 420 });
const slotAt = (id) => { const p = panelAt(Math.floor(id / SET)), j = id % SET; return { x: p.x + 85 + (j % 2) * 150, y: p.y + 95 + Math.floor(j / 2) * 125 }; };

function openBook() { hush(); S.pen = null; S.liftAt = 0; view = 'book'; press = null; pointerDown = false; book = { t: 0 }; beep(880, 0.1, 'triangle'); }

function drawBook() {
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.fillStyle = SKY; g.fillRect(0, 0, W, H); dots(g);
  for (let s0 = 0; s0 < STICKERS.length; s0 += SET) {
    const P = panelAt(s0 / SET), top = P.y, gold = setDone(s0);
    box(g, P.x, top + 10, P.w, P.h, 36, 'rgba(31,42,107,0.22)');
    if (gold) box(g, P.x - 10, top - 10, P.w + 20, P.h + 20, 44, ORANGE); // a finished set gets a gold frame
    box(g, P.x, top, P.w, P.h, 36, '#FFE3EF');
    if (gold) for (const x of [P.x + 30, P.x + P.w - 30]) sticker(() => star(g, x, top + 14, 26, SUNNY, Math.sin(book.t * 3) * 0.3));
    for (let id = s0; id < s0 + SET; id++) {
      const { x, y } = slotAt(id);
      if (save.stickers.includes(id)) STICKERS[id](g, x, y + Math.sin(book.t * 3 + id) * 3, 50);
      else { g.fillStyle = WHITE; g.beginPath(); g.arc(x, y, 48, 0, 7); g.fill(); g.fillStyle = '#F5C6DA'; g.beginPath(); g.arc(x, y, 14, 0, 7); g.fill(); }
    }
    let n = 0; for (let id = s0; id < s0 + SET; id++) if (save.stickers.includes(id)) n++;
    box(g, P.x + P.w / 2 - 62, top - 26, 124, 52, 26, gold ? ORANGE : VIOLET); words(n + '/' + SET, P.x + P.w / 2, top + 2, 34, 110, WHITE); // numbers are not mirrored
  }
  // the language button: a globe and the language's own name
  const L = LANGB; box(g, L.x, L.y + 6, L.w, L.h, L.h / 2, 'rgba(31,42,107,0.22)'); box(g, L.x, L.y, L.w, L.h, L.h / 2, WHITE);
  const gx = rtl() ? L.x + L.w - 54 : L.x + 54, gy = L.y + L.h / 2;
  g.strokeStyle = SKY; g.lineWidth = 6; g.beginPath(); g.arc(gx, gy, 26, 0, 7); g.moveTo(gx - 26, gy); g.lineTo(gx + 26, gy); g.moveTo(gx, gy - 26); g.lineTo(gx, gy + 26); g.stroke();
  g.beginPath(); g.ellipse(gx, gy, 12, 26, 0, 0, 7); g.stroke();
  words(T('name'), L.x + L.w / 2 + (rtl() ? -30 : 30), gy + 2, 40, L.w - 130, NAVY);
  disc(BACK); const { x, y, s } = BACK;
  g.fillStyle = MINT; g.beginPath(); g.moveTo(x + s / 2 + 24, y + 22); g.lineTo(x + s / 2 - 30, y + s / 2); g.lineTo(x + s / 2 + 24, y + s - 22); g.closePath(); g.fill();
}

function update(dt) {
  if (view === 'wall') return updateWall(dt);
  if (view === 'box') return updateBox(dt);
  if (view === 'book') { book.t += dt; return; }
  if (S.freeze > 0) { S.freeze -= dt; return; } // a short hold on the hit
  S.t += dt;
  if (!S.pen && S.won < 0) S.idle += dt;
  if (S.dotPop > 0) S.dotPop = Math.max(0, S.dotPop - dt * 2.5);
  if (S.pen && S.liftAt && performance.now() - S.liftAt > cfg.liftGraceMs) judge();
  if (S.sadFor > 0 && (S.sadFor -= dt) <= 0 && S.won < 0 && S.mood !== 'draw') S.mood = 'wait';
  if (S.morph) {
    const m = S.morph, k = ease(S.age(m.k) / cfg.morphSeconds);
    S.lines[m.k] = k >= 1 ? m.to : m.to.map((q, i) => [m.from[i][0] + (q[0] - m.from[i][0]) * k, m.from[i][1] + (q[1] - m.from[i][1]) * k]);
    if (k >= 1) S.morph = null;
  }
  if (S.faded && (S.faded.age += dt) > 0.45) S.faded = null;
  if (S.won >= 0) {
    S.won += dt;
    const cues = S.lv.cues || [];
    while (S.cue < cues.length && S.won >= cues[S.cue][0]) { const c = cues[S.cue++]; beep(c[1], c[2], c[3], 0.07, c[4]); }
    while (S.starsShown < S.stars && S.won >= 0.5 + S.starsShown * 0.25) { beep(880 + S.starsShown * 220, 0.14, 'triangle', 0.09); buzz('tap'); S.starsShown++; }
    if (S.won > celebrate()) return finish();
  }
  moveBits(dt);
}

function moveBits(dt) {
  let k = 0;
  for (const b of bits) { b.life -= dt; b.vy += b.g * dt; b.x += b.vx * dt; b.y += b.vy * dt; if (b.life > 0 && b.y < H + 40) bits[k++] = b; }
  bits.length = k;
  // drops fly to the jar after their star pops; the jar fills as each lands
  k = 0;
  for (const f of flyers) { f.t += dt; if (f.t < 0.6) flyers[k++] = f; else { jarShown = Math.min(cfg.jarDrops, jarShown + 1); beep(1200 + jarShown * 90, 0.06, 'sine', 0.05); } }
  flyers.length = k;
}

/** A pointing hand with its fingertip on (x, y). */
function hand(x, y) {
  g.fillStyle = 'rgba(31,42,107,0.22)'; g.beginPath(); g.ellipse(x + 40, y + 96, 36, 30, 0, 0, 7); g.fill();
  sticker(() => { stick(g, [[x, y], [x + 18, y + 50]], 26, SKIN); blob(g, x + 34, y + 84, 36, 32, SKIN, 0.3); blob(g, x + 4, y + 82, 14, 20, SKIN, -0.4); });
}

/** Dashed outline of the missing part, the start dot, and the ghost hand that shows the gesture. */
function drawGuide() {
  if (S.won >= 0) return;
  const shown = easy() || S.partMisses > 0 || S.i % CHAPTER === 0; // a chapter's first level shows each outline
  const ghost = !S.pen && ((S.i === 0 && !touched) || S.idle > (easy() ? cfg.ghostIdleEasy : cfg.ghostIdle));
  let line = null, tip = null;
  if (ghost) {
    const k = (S.t % cfg.ghostFingerSeconds) / cfg.ghostFingerSeconds;
    line = upTo(target, Math.min(1, k * 1.25)); tip = line[line.length - 1];
    g.save(); g.globalAlpha = 0.55; stick(g, line, 16, PEN); g.restore();
  }
  if (shown || ghost) {
    g.save(); g.setLineDash([16, 20]); g.lineCap = 'round';
    g.beginPath(); g.moveTo(target[0][0], target[0][1]); for (const p of target) g.lineTo(p[0], p[1]);
    g.globalAlpha = 0.28; g.strokeStyle = NAVY; g.lineWidth = 18; g.stroke();
    g.globalAlpha = 0.9 + Math.sin(S.t * 5.2) * 0.1; g.strokeStyle = WHITE; g.lineWidth = 10; g.stroke();
    g.restore();
    const end = target[target.length - 1];
    if (!closed) { g.lineWidth = 6; g.strokeStyle = WHITE; g.beginPath(); g.arc(end[0], end[1], 16, 0, 7); g.stroke(); }
  }
  if (S.pen) return;
  const [sx, sy] = target[0], r = 34 + Math.sin(S.t * 6) * 4 + S.dotPop * 16, ring = (S.t % 1.2) / 1.2;
  g.save(); g.globalAlpha = 1 - ring; g.lineWidth = 6; g.strokeStyle = WHITE; g.beginPath(); g.arc(sx, sy, r + ring * 40, 0, 7); g.stroke(); g.restore();
  g.fillStyle = WHITE; g.beginPath(); g.arc(sx, sy, r + 8, 0, 7); g.fill();
  g.fillStyle = PEN; g.beginPath(); g.arc(sx, sy, r, 0, 7); g.fill();
  if (ghost) hand(tip[0], tip[1]);
}

/** Progress pips at the top: one per level, the current one larger. */
function drawPips() {
  const n = CHAPTER, gap = 54, x0 = W / 2 - (n - 1) * gap / 2;
  for (let i = 0; i < n; i++) {
    const cur = i === S.i % n, done = i < S.i % n || (cur && S.won >= 0);
    g.beginPath(); g.arc(rtl() ? W - x0 - i * gap : x0 + i * gap, 120, cur ? 19 : 13, 0, 7);
    g.fillStyle = done ? WHITE : 'rgba(255,255,255,0.4)'; g.fill();
    if (cur) { g.lineWidth = 6; g.strokeStyle = NAVY; g.stroke(); }
  }
}

/** Up to three stars, popping in one by one. */
function drawStars() {
  if (S.won < 0.5) return;
  for (let i = 0; i < 3; i++) {
    const age = S.won - 0.5 - i * 0.25, got = i < S.stars;
    if (got && age < 0) continue;
    const pop = got ? 1 + Math.max(0, 1 - age / 0.25) * 0.6 : 1, x = W / 2 + (i - 1) * 112, y = 310 - (i === 1 ? 18 : 0);
    g.save(); g.globalAlpha = got ? 1 : 0.35;
    sticker(() => star(g, x, y, 44 * pop, got ? ORANGE : WHITE, (i - 1) * 0.18));
    g.restore();
  }
}

/** A round white button with its shadow. */
function disc(b) {
  g.fillStyle = 'rgba(31,42,107,0.22)'; g.beginPath(); g.arc(b.x + b.s / 2, b.y + b.s / 2 + 5, b.s / 2, 0, 7); g.fill();
  g.fillStyle = WHITE; g.beginPath(); g.arc(b.x + b.s / 2, b.y + b.s / 2, b.s / 2, 0, 7); g.fill();
}

/** Sound button: a speaker, struck through when muted. */
function drawMute() {
  if (!muteShown()) return;
  const { x, y } = MUTE; disc(MUTE);
  g.fillStyle = NAVY; g.beginPath();
  g.moveTo(x + 26, y + 40); g.lineTo(x + 40, y + 40); g.lineTo(x + 56, y + 26); g.lineTo(x + 56, y + 70); g.lineTo(x + 40, y + 56); g.lineTo(x + 26, y + 56); g.closePath(); g.fill();
  g.strokeStyle = save.muted ? CORAL : NAVY; g.lineWidth = 7; g.lineCap = 'round'; g.beginPath();
  if (save.muted) { g.moveTo(x + 24, y + 24); g.lineTo(x + 72, y + 72); } else g.arc(x + 56, y + 48, 16, -0.9, 0.9);
  g.stroke();
}

/** Button to the wall: a little framed picture. */
function drawWallButton() {
  if (!wallShown()) return;
  const { x, y } = WALLB; disc(WALLB);
  box(g, x + 24, y + 28, 48, 40, 8, VIOLET);
  g.fillStyle = SUNNY; g.beginPath(); g.arc(x + 58, y + 42, 7, 0, 7); g.fill();
  g.fillStyle = MINT; g.beginPath(); g.moveTo(x + 28, y + 64); g.lineTo(x + 44, y + 46); g.lineTo(x + 60, y + 64); g.closePath(); g.fill();
}

function draw() {
  if (view === 'wall') return drawWall();
  if (view === 'book') return drawBook();
  if (view === 'box') { drawBox(); drawJar(); return; }
  const punch = S.won >= 0 && S.won < 0.3 ? 1 + Math.sin(S.won / 0.3 * Math.PI) * 0.035 : 1;
  g.setTransform(punch, 0, 0, punch, W / 2 * (1 - punch), H / 2 * (1 - punch));
  g.drawImage(back, 0, 0);
  if (S.flip) { // the scene and its guide in the level's frame
    g.save(); g.translate(W, 0); g.scale(-1, 1); const look = S.look; if (look) S.look = [W - look[0], look[1]];
    S.lv.live(g, S); drawGuide(); S.look = look; g.restore();
  } else { S.lv.live(g, S); drawGuide(); }
  if (S.faded) { const k = S.faded.age / 0.45; g.save(); g.globalAlpha = 1 - k; g.translate(Math.sin(k * 30) * 6, 0); sticker(() => stick(g, S.faded.pts, 22, PEN)); g.restore(); }
  if (S.pen) sticker(() => stick(g, S.pen, 22, PEN));
  for (const b of bits) { g.globalAlpha = Math.min(1, b.life * 3); g.fillStyle = b.c; g.beginPath(); g.arc(b.x, b.y, b.s, 0, 7); g.fill(); }
  g.globalAlpha = 1;
  g.setTransform(1, 0, 0, 1, 0, 0);
  drawStars(); drawPips(); drawMute(); drawWallButton(); drawJar(); drawWords();
}

/** The paint jar: drops of every colour piled up to how full it is; it glows when a box is due. */
function drawJar() {
  if (!muteShown() && view !== 'box') return;
  const { x, y, s } = JAR, cx = x + s / 2, glow = save.drops >= cfg.jarDrops && save.stickers.length < STICKERS.length;
  g.fillStyle = 'rgba(31,42,107,0.22)'; g.beginPath(); g.arc(cx, y + s / 2 + 5, s / 2, 0, 7); g.fill();
  g.fillStyle = WHITE; g.beginPath(); g.arc(cx, y + s / 2, s / 2, 0, 7); g.fill();
  if (glow) { g.lineWidth = 8; g.strokeStyle = ORANGE; g.beginPath(); g.arc(cx, y + s / 2, s / 2 - 4 + Math.sin(S.t * 8) * 3, 0, 7); g.stroke(); }
  box(g, x + 26, y + 28, s - 52, s - 42, 14, '#E6F7FF');
  box(g, x + 22, y + 18, s - 44, 14, 6, VIOLET);
  g.save(); box(g, x + 26, y + 28, s - 52, s - 42, 14, '#E6F7FF'); g.clip();
  const bottom = y + s - 14;
  for (let j = 0; j < jarShown; j++) { g.fillStyle = CONFETTI[j % 5]; g.beginPath(); g.arc(x + 38 + (j % 3) * 17, bottom - 8 - Math.floor(j / 3) * 15, 11, 0, 7); g.fill(); }
  g.restore();
  for (const f of flyers) { // drops on their way, from the stars down to the jar
    if (f.t < 0) continue; const k = ease(f.t / 0.6);
    g.fillStyle = CONFETTI[(f.x / 7 | 0) % 5]; g.beginPath(); g.arc(f.x + (cx - f.x) * k, f.y + (y + 40 - f.y) * k - Math.sin(k * Math.PI) * 80, 13, 0, 7); g.fill();
  }
}

/** Quality steps down after two slow seconds and back up after five fast ones. */
function watchSpeed(dt) {
  frameTimes.push(dt); if (frameTimes.length < 60) return;
  const mid = frameTimes.sort((a, b) => a - b)[30] * 1000; frameTimes = [];
  if (mid > cfg.slowFrameMs + quality * 5) { fast = 0; if (++slow >= 2 && quality < 2) { quality++; slow = 0; } }
  else if (mid < 18) { slow = 0; if (++fast >= 5 && quality > 0) { quality--; fast = 0; } }
  else slow = fast = 0;
  // shortcut: no step renders the canvas at a lower resolution; add one if real phones still drop below 40 FPS
}

function frame(now) {
  raf = requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  if (dt > 0 && dt < 0.25) watchSpeed(dt);
  update(dt); draw();
  if (DEBUG) window.__frames = (window.__frames || 0) + 1;
}

/** Keep only a well-formed line from a stored save. */
const goodLine = (p) => Array.isArray(p) && p.length > 1 && p.length <= 200 && p.every((q) => Array.isArray(q) && q.length === 2 && Number.isFinite(q[0]) && Number.isFinite(q[1]));

/** Merge the stored save into the current one; progress made before it arrived is kept. */
function applySave(st) {
  if (!st || typeof st !== 'object') return;
  if (st.stars && typeof st.stars === 'object') for (const [n, v] of Object.entries(st.stars)) { const k = Math.max(0, Math.min(3, Math.round(Number(v)) || 0)); if (k) save.stars[n] = Math.max(save.stars[n] || 0, k); }
  if (st.art && typeof st.art === 'object') for (const [n, pts] of Object.entries(st.art)) if (!save.art[n] && goodLine(pts)) save.art[n] = pts;
  if (!muteTouched && typeof st.muted === 'boolean') save.muted = st.muted;
  if (!save.lang && typeof st.lang === 'string' && cfg.strings[st.lang]) lang = save.lang = st.lang;
  if (Array.isArray(st.stickers)) for (const id of st.stickers) if (Number.isInteger(id) && id >= 0 && id < STICKERS.length && !save.stickers.includes(id)) save.stickers.push(id);
  if (!dropsMerged && Number.isInteger(st.drops) && st.drops >= 0) { dropsMerged = true; save.drops = Math.max(0, Math.min(99, st.drops + dropsSince)); jarShown = Math.min(cfg.jarDrops, Math.max(0, save.drops - flyers.length)); } // drops still flying land on top
  if (Number.isInteger(st.day) && st.day > save.day && st.day < 30000000) save.day = st.day;
  if (Number.isInteger(st.level) && st.level > save.level) { save.level = st.level; if (!touched && view === 'play') newLevel(st.level); }
}

/** Entry point. The host calls this on start and on every reload. */
function run(m) {
  const me = ++runs; // a reply that belongs to an earlier run is ignored
  mode = m; cfg = window.gameConfig;
  cv = document.getElementById('game') || document.body.appendChild(Object.assign(document.createElement('canvas'), { id: 'game' }));
  cv.width = W; cv.height = H; cv.style.touchAction = 'none';
  g = cv.getContext('2d', { alpha: false });
  const slider = (key, min, max, step) => ({ key, type: 'slider', min, max, step });
  try {
    lib.showGameParameters({
      name: 'Draw It Alive Settings',
      params: {
        'How close the line must be (px)': slider('tolerance', 30, 140, 5), 'Share of the part to cover': slider('passCoverage', 0.4, 0.95, 0.05),
        'Share of the line on the part': slider('passPrecision', 0.4, 0.95, 0.05), 'Misses before help (first levels)': slider('assistAfterEasy', 0, 5, 1),
        'Misses before help (later levels)': slider('assistAfter', 1, 8, 1), 'Celebration on level 1 (s)': slider('celebrateSeconds', 1.5, 6, 0.1),
        'Celebration after level 1 (s)': slider('celebrateLater', 1.5, 6, 0.1), 'Wait before the hand shows again (s)': slider('ghostIdleEasy', 1, 10, 0.5),
        'Confetti pieces': slider('confetti', 0, 200, 10),
      },
    });
  } catch (e) { /* settings panel not offered here */ }
  cancelAnimationFrame(raf); hush(); pointerDown = false; touched = false; press = null; flyers = []; jarShown = Math.min(cfg.jarDrops, save.drops);
  lang = save.lang || detectLang();
  if (mode !== 'play' || !((view === 'box' && gift) || (view === 'wall' && wall))) newLevel(mode === 'play' ? save.level : 0); // a second start resumes where the player is (an open box or wall stays: it leads on by itself); edit mode shows level 1
  if (mode === 'play') {
    bindInput();
    const read = (tries) => Promise.resolve().then(() => lib.getUserGameState()).then((r) => {
      if (me !== runs) return;
      saveRead = true; // from now on the save may be written
      applySave(r && r.state);
      persist(); // progress made before the read arrived is written now, merged with the stored one
    }).catch(() => { if (me === runs) setTimeout(() => read(tries + 1), Math.min(30000, 4000 * tries)); }); // never give up: writing blind could erase the player's real save
    read(1);
  }
  last = performance.now(); raf = requestAnimationFrame(frame);
}
window.run = run;

// Local preview outside Astrocade: open index.html?local to stub the host.
if (DEBUG) {
  const none = async () => ({});
  window.lib = { showGameParameters() {}, log() {}, getUserGameState: none, saveUserGameState: none, haptics: { play() {}, start() {}, stop() {} } };
  window.__game = { today, newLevel, get backLayer() { return back; }, get S() { return S; }, get target() { return S.flip ? mirror(target) : target; }, get quality() { return quality; }, set quality(q) { quality = q; }, get save() { return save; }, set save(v) { save = v; }, applySave, get view() { return view; }, get wall() { return wall; }, get gift() { return gift; }, get lang() { return lang; }, setLang(l) { lang = save.lang = l; }, detectLang, T, LANGB, get jarShown() { return jarShown; }, MUTE, WALLB, JAR, BACK, CARD, CHAPTER, STICKERS, cardAt, slotAt, openWall, openBox, openBook, partsOf, artKey, get cfg() { return cfg; }, get canvases() { return cardImgs.length + cardBacks.length; } };
  const q = new URLSearchParams(location.search);
  fetch('game_config.json').then((r) => r.json()).then((c) => { window.gameConfig = { ...c, ...JSON.parse(q.get('cfg') || '{}') }; run(q.get('mode') || 'play'); });
}
