// PROTOTYPE - NOT FOR PRODUCTION
/**
 * Draw It Alive: draw the one missing part with a finger and the scene comes alive, using the line you drew.
 *
 * There is no menu and no text. Level 1 is on screen at once, with a dashed outline of the missing part,
 * a pulsing start dot and a ghost hand that shows the gesture; the hand comes back whenever the player
 * waits. A stroke is compared with the level's hidden path when the finger lifts. A miss never ends
 * anything: the line fades, the hand shows the way again, and after a few misses the player's line slides
 * into place by itself. Stars: 3 for a first try, 2 with retries, 1 when helped. The next level starts by
 * itself; a tap skips the end of a celebration. A chapter ends on the wall of the player's own pictures, which
 * plays each picture once in turn and then carries on to the next level.
 *
 * The 720 x 1280 scene is drawn by code (art.js). What never moves is drawn once per level into a
 * back layer; only the moving pieces, the stroke and the particles are drawn each frame. The wall shows
 * cached cards and animates one at a time. Tunable numbers live in game_config.json.
 */
import { sticker, stick, shape, star, box, blob, dots, borderScale, colourPass, resample, chaikin, pathLen, dist, upTo, WHITE, PEN, NAVY, SUNNY, CORAL, MINT, VIOLET, SKY, ORANGE } from './art.js';
import { LEVELS } from './levels.js';

const W = 720, H = 1280, STEP = 8;
const DEBUG = location.search.includes('local');
const CONFETTI = [SUNNY, CORAL, MINT, VIOLET, SKY, WHITE];
const MUTE = { x: 24, y: 1040, s: 96 }; // sound button, lower left, clear of the feed's swipe edge
const WALLB = { x: 600, y: 1040, s: 96 }; // button to the wall, lower right
const CARD = { k: 0.4, w: 288, h: 320, top: 280, border: 1.6, pad: 30 }; // a wall card shows the scene at 0.4, cropped from y = 280
const SKIN = '#FFD8B5';
const ease = (k) => 1 - Math.pow(1 - Math.max(0, Math.min(1, k)), 3);

let cv, g, cfg, mode, raf = 0, last = 0, runs = 0;
let save = { level: 0, stars: {}, art: {}, muted: false }, saveRead = false, muteTouched = false;
let view = 'play', wall = null; // 'play' is a level; 'wall' is the player's own finished pictures
let S = null, target = [], targetLen = 0, back = null, bits = [];
let pointerDown = false, touched = false, bound = false, press = null;
let ac = null, lastTick = 0, timers = [];
let quality = 0, frameTimes = [], slow = 0, fast = 0; // 0 full, 1 fewer particles, 2 also a still wall
const cardBacks = [], cardImgs = [];
let wallBack = null;

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
    i, lv, t: 0, won: -1, mood: 'wait', look: null, pen: null, liftAt: 0, stroke: null, morph: null, misses: 0,
    faded: null, sadFor: 0, assisted: false, stars: 0, starsShown: 0, freeze: 0, cue: 0, did: {}, quiet: false, idle: 0, dotPop: 0,
    once(key, fn) { if (!s.did[key]) { s.did[key] = true; fn(); } },
    burst(x, y, n) { if (!s.quiet) confetti(x, y, n); },
    art(n) { return save.art[n] || null; },
    part(ctx, width, color) {
      if (!s.stroke) return;
      const pop = s.won < 0.3 ? 1 + Math.sin(s.won / 0.3 * Math.PI) * 0.25 : 1, c = s.won < 0.15 ? PEN : color;
      if (lv.closed) return shape(ctx, s.stroke, c);
      stick(ctx, s.stroke, width * pop, c);
      if (colourPass() && quality < 2) { ctx.save(); ctx.globalAlpha = 0.4; ctx.translate(0, -width * 0.18); stick(ctx, s.stroke, width * 0.25, WHITE); ctx.restore(); }
    },
  };
  return s;
}

/** Start level i: build its hidden path and its back layer. */
function newLevel(i) {
  const lv = LEVELS[i % LEVELS.length];
  hush(); view = 'play'; wall = null; press = null; pointerDown = false;
  target = resample(lv.target, STEP); targetLen = pathLen(target);
  S = scene(lv, i);
  bits = [];
  back = back || document.createElement('canvas'); back.width = W; back.height = H;
  const b = back.getContext('2d'); b.fillStyle = lv.bg; b.fillRect(0, 0, W, H); lv.back(b);
}

const easy = () => S.i < cfg.easyLevels;

// ---------- the wall: every picture the player finished, alive, with the player's own lines ----------
const cardAt = (n) => ({ x: 48 + (n % 2) * 336, y: 170 + Math.floor(n / 2) * 360 });
const allDrawn = () => LEVELS.every((_, n) => save.art[n]);

/** A card in its white frame with its shadow, at the origin. */
function frameCard(ctx, c, won) {
  box(ctx, -12, 0, CARD.w + 24, CARD.h + 24, 34, 'rgba(31,42,107,0.25)');
  box(ctx, -12, -12, CARD.w + 24, CARD.h + 24, 34, WHITE);
  ctx.save(); box(ctx, 0, 0, CARD.w, CARD.h, 24, c.s.lv.bg); ctx.clip(); cardScene(ctx, c, won); ctx.restore(); // the rounded card is the current path, so it can clip
}

/** Draw one card's scene into ctx at card scale; won is the payoff time to show. */
function cardScene(ctx, c, won) {
  const s = c.s; s.won = won; s.t = wall.t;
  ctx.drawImage(cardBacks[s.i], 0, -CARD.top * CARD.k);
  if (!s.stroke) { ctx.fillStyle = 'rgba(31,42,107,0.45)'; ctx.fillRect(0, 0, CARD.w, CARD.h); return; }
  ctx.save(); ctx.scale(CARD.k, CARD.k); ctx.translate(0, -CARD.top); const was = borderScale(CARD.border);
  s.lv.live(ctx, s);
  borderScale(was); ctx.restore();
}

function openWall() {
  hush(); view = 'wall'; bits = []; pointerDown = false; press = null;
  if (!wallBack) { wallBack = document.createElement('canvas'); wallBack.width = W; wallBack.height = H; const b = wallBack.getContext('2d'); b.fillStyle = VIOLET; b.fillRect(0, 0, W, H); dots(b); }
  wall = { t: 0, rest: 0, next: S ? (S.won < 0 ? S.i : S.i + 1) : 0, turn: -1, started: new Set(), cards: [] };
  LEVELS.forEach((lv, n) => {
    if (!cardBacks[n]) { // the backgrounds never change, so they are drawn once per game
      const c = cardBacks[n] = document.createElement('canvas'); c.width = Math.round(W * CARD.k); c.height = Math.round(H * CARD.k);
      const b = c.getContext('2d'); b.scale(CARD.k, CARD.k); b.fillStyle = lv.bg; b.fillRect(0, 0, W, H); lv.back(b);
    }
    const s = scene(lv, n); s.quiet = true; s.mood = 'happy'; s.stroke = save.art[n] || null;
    const img = cardImgs[n] = cardImgs[n] || document.createElement('canvas'); img.width = CARD.w + 2 * CARD.pad; img.height = CARD.h + 2 * CARD.pad;
    const card = { s, img, t0: -99, pop: 0 };
    // the finished picture in its tilted frame, drawn once: turning images every frame is what slows phones down
    const b = img.getContext('2d');
    b.translate(img.width / 2, img.height / 2); b.rotate((n % 2 ? 1 : -1) * 0.025); b.translate(-CARD.w / 2, -CARD.h / 2);
    frameCard(b, card, cfg.cardRestSeconds);
    wall.cards.push(card);
  });
  tune([659, 784, 988, 1319], 110, 0.25, 0.09);
}

/** Play card n's scene from the start. */
function playCard(n) { const c = wall.cards[n]; c.t0 = wall.t; c.pop = 1; wall.turn = n; wall.started.add(n); }

function wallTap(p) {
  const nx = cardAt(LEVELS.length);
  if (Math.hypot(p[0] - nx.x - CARD.w / 2, p[1] - nx.y - CARD.h / 2) < 130) { beep(880, 0.1, 'triangle'); buzz('tap'); return newLevel(wall.next); }
  wall.cards.forEach((c, n) => {
    const { x, y } = cardAt(n);
    if (!c.s.stroke || p[0] < x || p[0] > x + CARD.w || p[1] < y || p[1] > y + CARD.h) return;
    playCard(n); buzz('tap'); hush(); tune(c.s.lv.notes, 90, 0.2, 0.09);
  });
}

function updateWall(dt) {
  wall.t += dt;
  for (const c of wall.cards) c.pop = Math.max(0, c.pop - dt * 3);
  // one card at a time plays its scene, each once, in turn; the others show their finished picture
  const playing = wall.cards.some((c) => wall.t - c.t0 < cfg.cardRestSeconds);
  if (playing) { wall.rest = 0; return; }
  if (quality < 2) {
    for (let k = 1; k <= wall.cards.length; k++) {
      const n = (wall.turn + k) % wall.cards.length;
      if (wall.cards[n].s.stroke && !wall.started.has(n)) { playCard(n); wall.cards[n].pop = 0; return; }
    }
  }
  // every picture has played: carry on after a short pause (longer when the wall is kept still on a slow phone)
  wall.rest += dt;
  if (wall.rest > (quality < 2 ? cfg.wallEndPause : cfg.wallSeconds)) newLevel(wall.next);
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
    if (c.s.stroke) { // stars on a white tab along the bottom of the card
      box(g, x + CARD.w / 2 - 78, y + CARD.h - 52, 156, 44, 22, WHITE);
      for (let j = 0; j < 3; j++) star(g, x + CARD.w / 2 + (j - 1) * 46, y + CARD.h - 30, 16, j < (save.stars[n] || 0) ? ORANGE : '#D9CCFF');
    }
  });
  // the way on: a big arrow where the next card would be
  const nx = cardAt(LEVELS.length), cx = nx.x + CARD.w / 2, cy = nx.y + CARD.h / 2, r = 104 + Math.sin(wall.t * 5) * 7;
  g.fillStyle = 'rgba(31,42,107,0.25)'; g.beginPath(); g.arc(cx, cy + 8, r, 0, 7); g.fill();
  g.fillStyle = WHITE; g.beginPath(); g.arc(cx, cy, r, 0, 7); g.fill();
  g.fillStyle = MINT; g.beginPath(); g.moveTo(cx - 34, cy - 52); g.lineTo(cx + 54, cy); g.lineTo(cx - 34, cy + 52); g.closePath(); g.fill();
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
  const pen = resample(S.pen, STEP); S.pen = null; S.liftAt = 0;
  if (!longEnough(pen)) { S.mood = 'wait'; S.dotPop = 1; S.idle = 99; beep(660, 0.08, 'sine', 0.06); return; } // a dab: show the way again
  if (passes(pen)) return win(pen, null);
  S.misses++;
  if (S.misses > (easy() ? cfg.assistAfterEasy : cfg.assistAfter)) { S.assisted = true; return win(target, pen); }
  S.faded = { pts: pen, age: 0 }; S.mood = 'sad'; S.sadFor = 0.9; S.idle = 99;
  beep(520, 0.1, 'sine', 0.06); timers.push(setTimeout(() => beep(620, 0.12, 'sine', 0.06), 120)); buzz('tap');
}

/** Throw n pieces of confetti from (x, y). */
function confetti(x, y, n) {
  n = Math.round(n * (quality ? 0.5 : 1));
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, v = 250 + Math.random() * 520;
    bits.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 380, g: 1500, c: CONFETTI[i % CONFETTI.length], s: 5 + Math.random() * 5, life: 1.1 + Math.random() * 0.7 });
  }
}

/** The line becomes the part and the scene comes alive. from is the player's own line when the game helped. */
function win(pen, from) {
  let line = resample(chaikin(resample(pen, 14), 2), 10); // smooth, and few enough points to draw thick lines fast
  if (dist(line[0], target[0]) > dist(line[line.length - 1], target[0])) line = line.slice().reverse(); // payoffs run from the path's start
  S.stroke = line; S.won = 0; S.mood = 'happy'; S.look = null; S.faded = null; S.freeze = 0.09; S.idle = 0;
  if (from && from.length > 1) { // the player's own line slides into place
    let f = resample(from, STEP); if (dist(f[0], line[0]) > dist(f[f.length - 1], line[0])) f = f.slice().reverse();
    S.morph = { from: line.map((_, i) => f[Math.round(i / Math.max(1, line.length - 1) * (f.length - 1))]), to: line };
    S.stroke = S.morph.from;
  }
  S.stars = S.assisted ? 1 : S.misses === 0 ? 3 : 2;
  confetti(line[line.length - 1][0], line[line.length - 1][1], cfg.confetti);
  // sparkles rise off the whole line as it turns into the part
  if (!quality) for (const p of resample(line, 24)) bits.push({ x: p[0], y: p[1], vx: (Math.random() - 0.5) * 120, vy: -120 - Math.random() * 160, g: -60, c: WHITE, s: 5, life: 0.5 + Math.random() * 0.5 });
  tune(S.lv.notes, 90, 0.22, 0.1);
  buzz('success');
  // keep the line and the stars for the wall and for later scenes; help never replaces the player's own picture
  const n = S.i % LEVELS.length;
  save.stars[n] = Math.max(save.stars[n] || 0, S.stars);
  // up to 90 points whatever the length, so a long line is kept whole
  if (!S.assisted || !save.art[n]) save.art[n] = resample(line, Math.max(12, pathLen(line) / 89)).slice(0, 90).map((p) => [Math.round(p[0]), Math.round(p[1])]);
  save.level = Math.max(save.level, S.i + 1);
  persist();
}

// ---------- input ----------
function point(e) { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * W, (e.clientY - r.top) / r.height * H]; }
const onButton = (b, p) => Math.hypot(p[0] - b.x - b.s / 2, p[1] - b.y - b.s / 2) <= b.s / 2 + 8;

/** What a press at p would trigger, or null for drawing. */
function pressTarget(p) {
  if (view === 'wall') return 'wall';
  if (wallShown() && onButton(WALLB, p)) return 'toWall';
  if (muteShown() && onButton(MUTE, p)) return 'mute';
  if (S.won >= 0) return 'skip';
  return null;
}

/** Buttons act on release with little travel, so a swipe of the feed or a gripping thumb does nothing. */
function release(p) {
  const pr = press; press = null;
  if (!pr || dist(p, pr.p) > cfg.tapTravel) return;
  if (pr.what === 'wall') return wallTap(p);
  if (pr.what === 'toWall' && onButton(WALLB, p)) return openWall();
  if (pr.what === 'mute' && onButton(MUTE, p)) { save.muted = !save.muted; muteTouched = true; beep(700, 0.08); persist(); return; }
  if (pr.what === 'skip' && S.won > cfg.skipAfter) { S.won = 99; S.cue = (S.lv.cues || []).length; S.starsShown = S.stars; } // skip the sounds still to come too
}

function bindInput() {
  if (bound) return; bound = true;
  cv.addEventListener('pointerdown', (e) => {
    if (mode !== 'play' || !e.isPrimary) return;
    e.preventDefault(); startAudio(); touched = true;
    const p = point(e), what = pressTarget(p);
    if (what) { press = { what, p }; return; }
    pointerDown = true; S.look = p; S.mood = 'draw'; S.sadFor = 0; S.idle = 0;
    // a finger that lifts and comes back near the end of the line carries on with it
    if (S.pen && S.liftAt && dist(p, S.pen[S.pen.length - 1]) <= cfg.liftReach) S.liftAt = 0;
    else { S.pen = [p]; S.faded = null; }
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
    if (press) return release(point(e));
    if (!pointerDown) return;
    pointerDown = false;
    if (!S.pen) return;
    // a line that already fits is judged at once; anything else waits a moment in case the finger comes back
    const pen = resample(S.pen, STEP);
    if (e.type === 'pointerup' && longEnough(pen) && passes(pen)) judge(); else S.liftAt = performance.now();
  };
  cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', (e) => { press = null; up(e); });
  document.addEventListener('visibilitychange', () => { if (ac) (document.hidden ? ac.suspend() : ac.resume()).catch(() => {}); });
}

// ---------- frame ----------
/** The sound button shows once the first level is behind the player. */
const muteShown = () => mode === 'play' && view === 'play' && (S.i > 0 || save.level > 0);

/** The wall button shows once every picture of the chapter is drawn. */
const wallShown = () => mode === 'play' && view === 'play' && S.won < 0 && allDrawn();

const celebrate = () => (S.i === 0 ? cfg.celebrateSeconds : cfg.celebrateLater);

function update(dt) {
  if (view === 'wall') return updateWall(dt);
  if (S.freeze > 0) { S.freeze -= dt; return; } // a short hold on the hit
  S.t += dt;
  if (!S.pen && S.won < 0) S.idle += dt;
  if (S.dotPop > 0) S.dotPop = Math.max(0, S.dotPop - dt * 2.5);
  if (S.pen && S.liftAt && performance.now() - S.liftAt > cfg.liftGraceMs) judge();
  if (S.sadFor > 0 && (S.sadFor -= dt) <= 0 && S.mood === 'sad') S.mood = 'wait';
  if (S.faded && (S.faded.age += dt) > 0.45) S.faded = null;
  if (S.won >= 0) {
    S.won += dt;
    if (S.morph) {
      const k = ease(S.won / cfg.morphSeconds), m = S.morph;
      S.stroke = k >= 1 ? m.to : m.to.map((q, i) => [m.from[i][0] + (q[0] - m.from[i][0]) * k, m.from[i][1] + (q[1] - m.from[i][1]) * k]);
      if (k >= 1) S.morph = null;
    }
    const cues = S.lv.cues || [];
    while (S.cue < cues.length && S.won >= cues[S.cue][0]) { const c = cues[S.cue++]; beep(c[1], c[2], c[3], 0.07, c[4]); }
    while (S.starsShown < S.stars && S.won >= 0.5 + S.starsShown * 0.25) { beep(880 + S.starsShown * 220, 0.14, 'triangle', 0.09); buzz('tap'); S.starsShown++; }
    if (S.won > celebrate()) return (S.i + 1) % LEVELS.length === 0 ? openWall() : newLevel(S.i + 1); // a chapter ends on the wall
  }
  let k = 0;
  for (const b of bits) { b.life -= dt; b.vy += b.g * dt; b.x += b.vx * dt; b.y += b.vy * dt; if (b.life > 0 && b.y < H + 40) bits[k++] = b; }
  bits.length = k;
}

/** A pointing hand with its fingertip on (x, y). */
function hand(x, y) {
  g.fillStyle = 'rgba(31,42,107,0.22)'; g.beginPath(); g.ellipse(x + 40, y + 96, 36, 30, 0, 0, 7); g.fill();
  sticker(() => { stick(g, [[x, y], [x + 18, y + 50]], 26, SKIN); blob(g, x + 34, y + 84, 36, 32, SKIN, 0.3); blob(g, x + 4, y + 82, 14, 20, SKIN, -0.4); });
}

/** Dashed outline of the missing part, the start dot, and the ghost hand that shows the gesture. */
function drawGuide() {
  if (S.won >= 0) return;
  const shown = easy() || S.misses > 0;
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
    if (!S.lv.closed) { g.lineWidth = 6; g.strokeStyle = WHITE; g.beginPath(); g.arc(end[0], end[1], 16, 0, 7); g.stroke(); }
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
  const n = LEVELS.length, gap = 54, x0 = W / 2 - (n - 1) * gap / 2;
  for (let i = 0; i < n; i++) {
    const cur = i === S.i % n, done = i < S.i % n || (cur && S.won >= 0);
    g.beginPath(); g.arc(x0 + i * gap, 120, cur ? 19 : 13, 0, 7);
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
    const pop = got ? 1 + Math.max(0, 1 - age / 0.25) * 0.6 : 1, x = W / 2 + (i - 1) * 112, y = 250 - (i === 1 ? 18 : 0);
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
  const punch = S.won >= 0 && S.won < 0.3 ? 1 + Math.sin(S.won / 0.3 * Math.PI) * 0.035 : 1;
  g.setTransform(punch, 0, 0, punch, W / 2 * (1 - punch), H / 2 * (1 - punch));
  g.drawImage(back, 0, 0);
  S.lv.live(g, S);
  drawGuide();
  if (S.faded) { const k = S.faded.age / 0.45; g.save(); g.globalAlpha = 1 - k; g.translate(Math.sin(k * 30) * 6, 0); sticker(() => stick(g, S.faded.pts, 22, PEN)); g.restore(); }
  if (S.pen) sticker(() => stick(g, S.pen, 22, PEN));
  for (const b of bits) { g.globalAlpha = Math.min(1, b.life * 3); g.fillStyle = b.c; g.beginPath(); g.arc(b.x, b.y, b.s, 0, 7); g.fill(); }
  g.globalAlpha = 1;
  g.setTransform(1, 0, 0, 1, 0, 0);
  drawStars(); drawPips(); drawMute(); drawWallButton();
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
  cancelAnimationFrame(raf); hush(); pointerDown = false; touched = false; press = null;
  newLevel(mode === 'play' ? save.level : 0); // a second start resumes where the player is; edit mode shows level 1
  if (mode === 'play') {
    bindInput();
    const read = (tries) => Promise.resolve().then(() => lib.getUserGameState()).then((r) => {
      if (me !== runs) return;
      saveRead = true; // from now on the save may be written
      applySave(r && r.state);
    }).catch(() => { if (me === runs && tries > 0) setTimeout(() => read(tries - 1), 4000); });
    read(3);
  }
  last = performance.now(); raf = requestAnimationFrame(frame);
}
window.run = run;

// Local preview outside Astrocade: open index.html?local to stub the host.
if (DEBUG) {
  const none = async () => ({});
  window.lib = { showGameParameters() {}, log() {}, getUserGameState: none, saveUserGameState: none, haptics: { play() {}, start() {}, stop() {} } };
  window.__game = { LEVELS, newLevel, get backLayer() { return back; }, get S() { return S; }, get target() { return target; }, get quality() { return quality; }, set quality(q) { quality = q; }, get save() { return save; }, set save(v) { save = v; }, applySave, get view() { return view; }, get wall() { return wall; }, MUTE, WALLB, CARD, cardAt, openWall, get cfg() { return cfg; }, get canvases() { return cardImgs.length + cardBacks.length; } };
  const q = new URLSearchParams(location.search);
  fetch('game_config.json').then((r) => r.json()).then((c) => { window.gameConfig = { ...c, ...JSON.parse(q.get('cfg') || '{}') }; run(q.get('mode') || 'play'); });
}
