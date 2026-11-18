// PROTOTYPE - NOT FOR PRODUCTION
/**
 * Draw It Alive: draw the one missing part with a finger and the scene comes alive, using the line you drew.
 *
 * There is no menu and no text. Level 1 is on screen at once, with a dashed outline of the missing part,
 * a pulsing start dot and a ghost line that shows the gesture. A stroke is compared with the level's
 * hidden path on release. A miss never ends anything: the line fades, the missing shape flashes, and
 * after a few misses the game finishes the part for the player. The next level starts by itself.
 *
 * The 720 x 1280 scene is drawn by code (art.js). What never moves is drawn once per level into a
 * back layer; only the moving pieces, the stroke and the particles are drawn each frame.
 * Tunable numbers live in game_config.json.
 */
import { sticker, stick, shape, star, box, resample, chaikin, pathLen, dist, upTo, pointAt, WHITE, PEN, NAVY, SUNNY, CORAL, MINT, VIOLET, SKY, ORANGE } from './art.js';
import { LEVELS } from './levels.js';

const W = 720, H = 1280, STEP = 8;
const DEBUG = location.search.includes('local');
const CONFETTI = [SUNNY, CORAL, MINT, VIOLET, SKY, WHITE];
const MUTE = { x: 24, y: 1160, s: 96 }; // sound button, bottom left

let cv, g, cfg, mode, raf = 0, last = 0;
let save = { level: 0, stars: {}, muted: false }, saveRead = false;
let S = null, target = [], targetLen = 0, back = null, bits = [];
let pointerDown = false, touched = false, bound = false;
let ac = null, lastTick = 0;
let low = false, frameTimes = [], slowChecks = 0;

// ---------- sound (synthesized; starts on the first touch) ----------
function beep(freq, len, type = 'sine', vol = 0.1, slide = 0) {
  if (!ac || save.muted) return;
  const o = ac.createOscillator(), v = ac.createGain(), t = ac.currentTime;
  o.type = type; o.frequency.setValueAtTime(freq, t); if (slide) o.frequency.linearRampToValueAtTime(Math.max(40, freq + slide), t + len);
  v.gain.setValueAtTime(vol, t); v.gain.exponentialRampToValueAtTime(0.001, t + len);
  o.connect(v).connect(ac.destination); o.start(t); o.stop(t + len);
}
function startAudio() {
  if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
  const AC = window.AudioContext || window.webkitAudioContext; if (AC) ac = new AC();
}

// ---------- level ----------
/** Start level i: build its hidden path and its back layer. */
function newLevel(i) {
  const lv = LEVELS[i % LEVELS.length];
  target = resample(lv.target, STEP); targetLen = pathLen(target);
  S = {
    i, lv, t: 0, won: -1, mood: 'wait', look: null, pen: null, liftAt: 0, stroke: null, misses: 0,
    faded: null, flash: 0, sadFor: 0, assisted: false, stars: 0, starsShown: 0, freeze: 0, cue: 0, did: {},
    once(key, fn) { if (!S.did[key]) { S.did[key] = true; fn(); } },
    burst(x, y, n) { confetti(x, y, n); },
    part(ctx, width, color) {
      if (!S.stroke) return;
      const pop = S.won < 0.3 ? 1 + Math.sin(S.won / 0.3 * Math.PI) * 0.25 : 1, c = S.won < 0.15 ? PEN : color;
      if (lv.closed) shape(ctx, S.stroke, c); else stick(ctx, S.stroke, width * pop, c);
    },
  };
  bits = [];
  back = back || document.createElement('canvas'); back.width = W; back.height = H;
  const b = back.getContext('2d'); b.fillStyle = lv.bg; b.fillRect(0, 0, W, H); lv.back(b);
}

const easy = () => S.i < cfg.easyLevels;

/** Share of points in a that lie within reach of path b. */
function near(a, b, reach) {
  let hit = 0;
  for (const p of a) { for (const q of b) if (Math.abs(p[0] - q[0]) <= reach && Math.abs(p[1] - q[1]) <= reach && dist(p, q) <= reach) { hit++; break; } }
  return a.length ? hit / a.length : 0;
}

/** Compare the finished stroke with the hidden path: win, miss, or (too short) nothing. */
function judge() {
  const pen = resample(S.pen, STEP); S.pen = null; S.liftAt = 0;
  if (pathLen(pen) < targetLen * cfg.minStrokeShare) { S.mood = 'wait'; return; } // a dab is not an attempt
  const cover = near(target, pen, cfg.tolerance), precise = near(pen, target, cfg.tolerance * cfg.precisionReach);
  if (cover >= cfg.passCoverage && precise >= cfg.passPrecision) {
    // stars measure neatness: how far, on average, the line strays from the part
    let off = 0; for (const p of pen) { let d = Infinity; for (const q of target) d = Math.min(d, dist(p, q)); off += d; }
    return win(pen, 1 - off / pen.length / cfg.tolerance);
  }
  S.misses++;
  if (S.misses > (easy() ? cfg.assistAfterEasy : cfg.assistAfter)) { S.assisted = true; return win(target, 0); }
  S.faded = { pts: pen, age: 0 }; S.flash = 1.4; S.mood = 'sad'; S.sadFor = 0.9;
  beep(300, 0.18, 'triangle', 0.08, -90); lib.haptics.play('tap');
}

/** Throw n pieces of confetti from (x, y). */
function confetti(x, y, n) {
  n = Math.round(n * (low ? 0.5 : 1));
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, v = 250 + Math.random() * 520;
    bits.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 380, g: 1500, c: CONFETTI[i % CONFETTI.length], s: 10 + Math.random() * 10, life: 1.1 + Math.random() * 0.7 });
  }
}

/** The stroke becomes the part and the scene comes alive. quality is 0..1: how well the line matched. */
function win(pen, quality) {
  let line = chaikin(pen, 2);
  if (dist(line[0], target[0]) > dist(line[line.length - 1], target[0])) line = line.slice().reverse(); // payoffs run from the path's start
  S.stroke = line; S.won = 0; S.mood = 'happy'; S.look = null; S.faded = null; S.flash = 0; S.freeze = 0.09;
  S.stars = quality >= cfg.threeStars ? 3 : quality >= cfg.twoStars ? 2 : 1;
  confetti(line[line.length - 1][0], line[line.length - 1][1], cfg.confetti);
  // sparkles rise off the whole line as it turns into the part
  for (const p of resample(line, low ? 48 : 24)) bits.push({ x: p[0], y: p[1], vx: (Math.random() - 0.5) * 120, vy: -120 - Math.random() * 160, g: -60, c: WHITE, s: 9, life: 0.5 + Math.random() * 0.5 });
  S.lv.notes.forEach((f, i) => setTimeout(() => beep(f, 0.22, 'triangle', 0.1), i * 90));
  lib.haptics.play('success');
  if (mode === 'play' && saveRead) {
    save.level = Math.max(save.level, S.i + 1); save.stars[S.i] = Math.max(save.stars[S.i] || 0, S.stars);
    lib.saveUserGameState(save).catch(() => {});
  }
}

// ---------- input ----------
function point(e) { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * W, (e.clientY - r.top) / r.height * H]; }
function bindInput() {
  if (bound) return; bound = true;
  cv.addEventListener('pointerdown', (e) => {
    if (mode !== 'play' || !e.isPrimary) return;
    e.preventDefault(); startAudio(); touched = true;
    const p = point(e);
    if (muteShown() && p[0] >= MUTE.x && p[0] <= MUTE.x + MUTE.s && p[1] >= MUTE.y && p[1] <= MUTE.y + MUTE.s) {
      save.muted = !save.muted; beep(700, 0.08); if (saveRead) lib.saveUserGameState(save).catch(() => {});
      return;
    }
    if (S.won >= 0) return;
    pointerDown = true; S.look = p; S.mood = 'draw'; S.sadFor = 0;
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
  const up = (e) => { if (!pointerDown || !e.isPrimary) return; pointerDown = false; if (S.pen) S.liftAt = performance.now(); };
  cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
}

// ---------- frame ----------
/** The sound button shows once the first level is behind the player. */
const muteShown = () => mode === 'play' && (S.i > 0 || save.level > 0);

function update(dt) {
  if (S.freeze > 0) { S.freeze -= dt; return; } // a short hold on the hit
  S.t += dt;
  if (S.pen && S.liftAt && performance.now() - S.liftAt > cfg.liftGraceMs) judge();
  if (S.sadFor > 0 && (S.sadFor -= dt) <= 0 && S.mood === 'sad') S.mood = 'wait';
  if (S.flash > 0) S.flash -= dt;
  if (S.faded && (S.faded.age += dt) > 0.45) S.faded = null;
  if (S.won >= 0) {
    S.won += dt;
    const cues = S.lv.cues || [];
    while (S.cue < cues.length && S.won >= cues[S.cue][0]) { const c = cues[S.cue++]; beep(c[1], c[2], c[3], 0.07, c[4]); }
    while (S.starsShown < S.stars && S.won >= 0.5 + S.starsShown * 0.25) { beep(880 + S.starsShown * 220, 0.14, 'triangle', 0.09); lib.haptics.play('tap'); S.starsShown++; }
    if (S.won > cfg.celebrateSeconds) return newLevel(S.i + 1);
  }
  for (const b of bits) { b.life -= dt; b.vy += b.g * dt; b.x += b.vx * dt; b.y += b.vy * dt; }
  bits = bits.filter((b) => b.life > 0 && b.y < H + 40);
}

/** Dashed outline of the missing part, the start dot, and on level 1 a ghost line that shows the gesture. */
function drawGuide() {
  if (S.won >= 0) return;
  const shown = easy() || S.misses > 0, bright = S.flash > 0 ? 1 : 0.55 + Math.sin(S.t * 5.2) * 0.25;
  if (shown || S.flash > 0) {
    g.save(); g.globalAlpha = bright; g.setLineDash([16, 20]); g.lineCap = 'round'; g.strokeStyle = WHITE; g.lineWidth = 12;
    g.beginPath(); g.moveTo(target[0][0], target[0][1]); for (const p of target) g.lineTo(p[0], p[1]); g.stroke(); g.restore();
  }
  if (S.pen) return;
  const r = 18 + Math.sin(S.t * 6) * 5;
  g.fillStyle = WHITE; g.beginPath(); g.arc(target[0][0], target[0][1], r + 8, 0, 7); g.fill();
  g.fillStyle = PEN; g.beginPath(); g.arc(target[0][0], target[0][1], r, 0, 7); g.fill();
  if (S.i === 0 && S.misses === 0 && !touched || S.i === 0 && S.misses > 0) {
    const k = (S.t % cfg.ghostFingerSeconds) / cfg.ghostFingerSeconds, line = upTo(target, Math.min(1, k * 1.25)), tip = line[line.length - 1];
    g.save(); g.globalAlpha = 0.75; sticker(() => stick(g, line, 22, PEN)); g.restore();
    g.fillStyle = 'rgba(31,42,107,0.25)'; g.beginPath(); g.arc(tip[0] + 6, tip[1] + 10, 30, 0, 7); g.fill();
    g.fillStyle = WHITE; g.beginPath(); g.arc(tip[0], tip[1], 30, 0, 7); g.fill();
  }
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

/** Up to three stars for the line, popping in one by one. */
function drawStars() {
  if (S.won < 0.5) return;
  for (let i = 0; i < 3; i++) {
    const age = S.won - 0.5 - i * 0.25, got = i < S.stars;
    if (got && age < 0) continue;
    const pop = got ? 1 + Math.max(0, 1 - age / 0.25) * 0.6 : 1, x = W / 2 + (i - 1) * 112, y = 250 - (i === 1 ? 18 : 0);
    g.save(); g.globalAlpha = got ? 1 : 0.35;
    sticker(() => star(g, x, y, 44 * pop, got ? (S.lv.bg === SUNNY ? ORANGE : SUNNY) : WHITE, (i - 1) * 0.18));
    g.restore();
  }
}

/** Sound button: a speaker, struck through when muted. */
function drawMute() {
  if (!muteShown()) return;
  const { x, y, s } = MUTE;
  g.fillStyle = 'rgba(31,42,107,0.22)'; g.beginPath(); g.arc(x + s / 2, y + s / 2 + 5, s / 2, 0, 7); g.fill();
  g.fillStyle = WHITE; g.beginPath(); g.arc(x + s / 2, y + s / 2, s / 2, 0, 7); g.fill();
  g.fillStyle = NAVY; g.beginPath();
  g.moveTo(x + 26, y + 40); g.lineTo(x + 40, y + 40); g.lineTo(x + 56, y + 26); g.lineTo(x + 56, y + 70); g.lineTo(x + 40, y + 56); g.lineTo(x + 26, y + 56); g.closePath(); g.fill();
  g.strokeStyle = save.muted ? CORAL : NAVY; g.lineWidth = 7; g.lineCap = 'round'; g.beginPath();
  if (save.muted) { g.moveTo(x + 24, y + 24); g.lineTo(x + 72, y + 72); } else g.arc(x + 56, y + 48, 16, -0.9, 0.9);
  g.stroke();
}

function draw() {
  const punch = S.won >= 0 && S.won < 0.3 ? 1 + Math.sin(S.won / 0.3 * Math.PI) * 0.035 : 1;
  g.setTransform(punch, 0, 0, punch, W / 2 * (1 - punch), H / 2 * (1 - punch));
  g.drawImage(back, 0, 0);
  S.lv.live(g, S);
  drawGuide();
  if (S.faded) { const k = S.faded.age / 0.45; g.save(); g.globalAlpha = 1 - k; g.translate(Math.sin(k * 30) * 6, 0); sticker(() => stick(g, S.faded.pts, 22, PEN)); g.restore(); }
  if (S.pen) sticker(() => stick(g, S.pen, 22, PEN));
  for (const b of bits) { g.globalAlpha = Math.min(1, b.life * 3); g.fillStyle = b.c; g.fillRect(b.x - b.s / 2, b.y - b.s / 2, b.s, b.s * (b.g < 0 ? 1 : 0.6)); }
  g.globalAlpha = 1;
  g.setTransform(1, 0, 0, 1, 0, 0);
  drawStars(); drawPips(); drawMute();
}

/** When frames stay slow, halve the confetti. */
function watchSpeed(dt) {
  frameTimes.push(dt); if (frameTimes.length < 90) return;
  const mid = frameTimes.slice().sort((a, b) => a - b)[45]; frameTimes = [];
  slowChecks = mid * 1000 > cfg.slowFrameMs ? slowChecks + 1 : 0;
  // shortcut: quality only steps down once and never back up; add more steps (30 Hz idle, smaller canvas) if real phones still run slow
  if (slowChecks >= 2) low = true;
}

function frame(now) {
  raf = requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  if (dt > 0 && dt < 0.25) watchSpeed(dt);
  update(dt); draw();
  if (DEBUG) window.__frames = (window.__frames || 0) + 1;
}

/** Entry point. The host calls this on start and on every reload. */
function run(m) {
  mode = m; cfg = window.gameConfig;
  cv = document.getElementById('game') || document.body.appendChild(Object.assign(document.createElement('canvas'), { id: 'game' }));
  cv.width = W; cv.height = H; cv.style.touchAction = 'none';
  g = cv.getContext('2d', { alpha: false });
  const slider = (key, min, max, step) => ({ key, type: 'slider', min, max, step });
  lib.showGameParameters({
    name: 'Draw It Alive Settings',
    params: {
      'How close the line must be (px)': slider('tolerance', 30, 140, 5), 'Share of the part to cover': slider('passCoverage', 0.4, 0.95, 0.05),
      'Share of the line on the part': slider('passPrecision', 0.4, 0.95, 0.05), 'Misses before help (first levels)': slider('assistAfterEasy', 0, 5, 1),
      'Misses before help (later levels)': slider('assistAfter', 1, 8, 1), 'Celebration length (s)': slider('celebrateSeconds', 1.5, 6, 0.1),
      'Confetti pieces': slider('confetti', 0, 200, 10), 'Neatness for 3 stars': slider('threeStars', 0.5, 1, 0.05), 'Neatness for 2 stars': slider('twoStars', 0.2, 1, 0.05),
    },
  });
  cancelAnimationFrame(raf); pointerDown = false; touched = false;
  newLevel(0);
  if (mode === 'play') {
    bindInput();
    lib.getUserGameState().then((r) => {
      saveRead = true; // only write the save once the player's own save has been read
      const st = r && r.state; if (!st) return;
      if (st.stars && typeof st.stars === 'object') save.stars = { ...st.stars };
      save.muted = !!st.muted;
      if (Number.isInteger(st.level) && st.level > 0) { save.level = st.level; if (!touched) newLevel(st.level); }
    }).catch(() => { setTimeout(() => lib.getUserGameState().then(() => { saveRead = true; }).catch(() => {}), 4000); });
  }
  last = performance.now(); raf = requestAnimationFrame(frame);
}
window.run = run;

// Local preview outside Astrocade: open index.html?local to stub the host.
if (DEBUG) {
  const none = async () => ({});
  window.lib = { showGameParameters() {}, log() {}, getUserGameState: none, saveUserGameState: none, haptics: { play() {}, start() {}, stop() {} } };
  window.__game = { LEVELS, newLevel, get S() { return S; }, get target() { return target; }, get low() { return low; }, get save() { return save; }, MUTE, get cfg() { return cfg; } };
  const q = new URLSearchParams(location.search);
  fetch('game_config.json').then((r) => r.json()).then((c) => { window.gameConfig = { ...c, ...JSON.parse(q.get('cfg') || '{}') }; run(q.get('mode') || 'play'); });
}
