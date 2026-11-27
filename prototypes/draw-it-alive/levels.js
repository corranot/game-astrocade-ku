// PROTOTYPE - NOT FOR PRODUCTION
/**
 * Levels, five to a chapter. Each level is a scene with one or two parts missing; the player draws them
 * one after the other and the scene comes alive using the player's own lines.
 *   bg      background colour
 *   target  the hidden path the stroke is compared with (array of [x, y])
 *   closed  true when the part is a closed shape
 *   parts   for a level with more than one part: [{ target, closed }] in drawing order
 *   notes   the win jingle, as frequencies
 *   cues    sounds during the payoff: [seconds after the win, frequency, length, wave, pitch slide]
 *   back(ctx)     everything that never moves; drawn once per level
 *   live(ctx, S)  everything that moves; drawn every frame
 * S = { t, won (-1, or seconds since every part is drawn), mood, look, stroke (the player's line once solved),
 *       lines[k] the player's line for part k once drawn, age(k) seconds since part k was drawn,
 *       part(ctx, width, color, k = 0) draws line k as its part,
 *       once(key, fn) runs fn a single time, burst(x, y, n) throws confetti,
 *       art(i) the line the player drew for level i earlier, or null }
 */
import { sticker, blob, box, stick, shape, shadow, face, heart, tuft, bloom, dots, front, curve, circle, spiral, offsetPath, resample, borderScale, upTo, pointAt, pathLen, centroid, moved, loop,
  WHITE, NAVY, BLUSH, MINT, SUNNY, CORAL, ORANGE, VIOLET, SKY, GRASS } from './art.js';

/** Skies chosen against what stands in front of them (green grass and hills, yellow chicks and suns). */
const LIGHT_SKY = '#80D8FF', LILAC_SKY = '#D7C9FF', ROCK = '#B49BFF';
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const ease = (k) => 1 - Math.pow(1 - clamp01(k), 3);
const hop = (s, speed, height) => Math.abs(Math.sin(s * speed)) * height;

/** Plank marks across a bridge or ramp line. */
function planks(ctx, line) {
  if (!line) return;
  ctx.strokeStyle = '#D9690A'; ctx.lineWidth = 5; ctx.lineCap = 'round';
  const pts = resample(line, 28);
  for (let i = 1; i < pts.length - 1; i++) {
    const a = pts[i - 1], b = pts[i + 1], dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1, p = pts[i];
    ctx.beginPath(); ctx.moveTo(p[0] + dy / L * 9, p[1] - dx / L * 9); ctx.lineTo(p[0] - dy / L * 9, p[1] + dx / L * 9); ctx.stroke();
  }
}

/** Belly and wing shades for each body colour. */
const TONES = { [SUNNY]: ['#FFF0B3', '#F2A91F'], [VIOLET]: ['#B49BFF', '#5A2FE0'] };

/** A round chick standing with its feet on (x0, y0); dir is 1 facing right, -1 facing left; lean tips it forward. */
function chick(ctx, x0, y0, color, dir, mood, t, look, lean = 0) {
  const K = 1.3, x = 0, y = 0;
  if (look) look = [(look[0] - x0) / K, (look[1] - y0) / K];
  const [belly, wing] = TONES[color] || [WHITE, color];
  ctx.save(); ctx.translate(x0, y0); ctx.scale(K, K); const was = borderScale(1 / K);
  shadow(ctx, x, y + 4, 46);
  ctx.rotate(lean);
  sticker(() => {
    stick(ctx, [[x - 16, y - 12], [x - 16, y - 2]], 10, ORANGE); stick(ctx, [[x + 16, y - 12], [x + 16, y - 2]], 10, ORANGE);
    stick(ctx, [[x - 4, y - 96], [x - 12, y - 112]], 7, color); stick(ctx, [[x + 4, y - 97], [x + 6, y - 116]], 7, color);
    blob(ctx, x, y - 54, 50, 46, color);
    blob(ctx, x + dir * 4, y - 36, 30, 20, belly);
    shape(ctx, [[x + dir * 44, y - 62], [x + dir * 74, y - 50], [x + dir * 44, y - 40]], ORANGE);
    blob(ctx, x - dir * 30, y - 46, 16, 22, wing, dir * 0.5);
    face(ctx, x + dir * 12, y - 66, 34, mood, t, look);
  });
  borderScale(was); ctx.restore();
}

/** A snail facing right with the middle of its foot on the origin. Its shell centre is at (-30, -145). */
function snail(ctx, mood, t, look, nod, turn) {
  sticker(() => {
    stick(ctx, [[130 + turn, -182 + nod], [116 + turn, -240 + nod]], 12, CORAL); stick(ctx, [[166 + turn, -182 + nod], [184 + turn, -238 + nod]], 12, CORAL);
    blob(ctx, 116 + turn, -244 + nod, 15, 15, CORAL); blob(ctx, 184 + turn, -242 + nod, 15, 15, CORAL);
    stick(ctx, [[-180, -28], [80, -28], [135, -70], [146 + turn, -135 + nod]], 56, CORAL);
    blob(ctx, 148 + turn, -150 + nod, 48, 44, CORAL);
    face(ctx, 154 + turn, -156 + nod, 36, mood, t, look);
  });
}

/** True when a stored line is a closed shape big enough to be a shell. */
function roundEnough(p) {
  if (!p || p.length < 8) return false;
  let w = 0, h = 0; const xs = p.map((q) => q[0]), ys = p.map((q) => q[1]);
  w = Math.max(...xs) - Math.min(...xs); h = Math.max(...ys) - Math.min(...ys);
  return w > 80 && h > 80;
}

/** The shell used on level 5 when the player has not drawn one yet. */
const DEFAULT_SHELL = circle(250, 705, 100);

/** The snail in the shell the player drew on level 2 (or a round one), its foot centred on (x, y).
 *  dir -1 faces left; rot tips it along a slope. */
function shelled(ctx, S, x, y, rot = 0, K = 0.62, dir = 1) {
  const shell = roundEnough(S.art(1)) ? S.art(1) : DEFAULT_SHELL, [cx, cy] = centroid(shell);
  shadow(ctx, x, y + 2, 160 * K);
  ctx.save(); ctx.translate(x, y); ctx.rotate(Math.max(-0.7, Math.min(0.7, rot))); ctx.scale(K * dir, K); const was = borderScale(1 / K);
  ctx.save(); ctx.translate(-280, -850); sticker(() => shape(ctx, shell, VIOLET)); swirl(ctx, spiral(cx, cy, 58)); ctx.restore();
  snail(ctx, S.mood, S.t, null, S.won < 0 ? Math.sin(S.t * 2) * 6 : hop(S.won, 6, 5), S.mood === 'draw' ? -14 : 0);
  borderScale(was); ctx.restore();
}

/** The light spiral line inside a shell. */
function swirl(ctx, sp, color = '#C9B6FF', w = 12) {
  ctx.lineCap = ctx.lineJoin = 'round'; ctx.strokeStyle = color; ctx.lineWidth = w;
  ctx.beginPath(); ctx.moveTo(sp[0][0], sp[0][1]); for (const q of sp) ctx.lineTo(q[0], q[1]); ctx.stroke();
}

/** The watering can with a face, tipped by tip around its handle. */
function can(ctx, S, tip) {
  shadow(ctx, 180, 1012, 120);
  ctx.save(); ctx.translate(180, 540); ctx.rotate(tip); ctx.translate(-180, -540);
  sticker(() => {
    stick(ctx, [[110, 490], [62, 520], [70, 580], [112, 596]], 18, VIOLET);
    stick(ctx, [[250, 560], [318, 500]], 26, VIOLET);
    box(ctx, 100, 470, 160, 140, 28, VIOLET);
    face(ctx, 180, 532, 40, S.mood, S.t, S.look);
  });
  ctx.restore();
}

/** The player's line as a rainbow, five bands wide. */
function rainbow(ctx, line) {
  sticker(() => stick(ctx, line, 56, CORAL));
  ctx.lineCap = ctx.lineJoin = 'round'; ctx.lineWidth = 12;
  for (const [d, c] of [[-11, ORANGE], [0, SUNNY], [11, MINT], [22, VIOLET]]) {
    const band = d ? offsetPath(line, d) : line;
    ctx.strokeStyle = c; ctx.beginPath(); ctx.moveTo(band[0][0], band[0][1]); for (const p of band) ctx.lineTo(p[0], p[1]); ctx.stroke();
  }
}

/** The rain cloud at x = cx with its rain; shelter(x) is the top of a roof at x, or null, and stops the drops. */
function rainCloud(ctx, S, cx, clear, happy, shelter) {
  if (clear < 1) {
    ctx.fillStyle = '#1FA2E6'; ctx.globalAlpha = 1 - clear;
    for (let i = 0; i < 9; i++) {
      const y = 345 + (S.t * 520 + i * 97) % 440, x = cx - 150 + i * 38, roof = shelter && shelter(x);
      if (roof != null && y > roof - 10) { if (y < roof + 30) { ctx.beginPath(); ctx.ellipse(x, roof - 12, 12, 5, 0, 0, 7); ctx.fill(); } continue; }
      ctx.beginPath(); ctx.ellipse(x, y, 6, 13, 0, 0, 7); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  sticker(() => { blob(ctx, cx - 70, 290, 90, 50, WHITE); blob(ctx, cx + 30, 262, 96, 66, WHITE); blob(ctx, cx + 120, 296, 70, 44, WHITE); face(ctx, cx + 20, 280, 44, happy ? 'happy' : 'sad', S.t, null); });
}

/** Rays turning round a closed line, for a sun the player drew. */
function sunRays(ctx, line, t, grow = 1) {
  const [cx, cy] = centroid(line); let r = 0; for (const q of line) r += Math.hypot(q[0] - cx, q[1] - cy) / line.length;
  sticker(() => { for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2 + t * 0.8; stick(ctx, [[cx + Math.cos(a) * (r + 22), cy + Math.sin(a) * (r + 22)], [cx + Math.cos(a) * (r + 22 + 30 * grow), cy + Math.sin(a) * (r + 22 + 30 * grow)]], 14, SUNNY); } });
  return [cx, cy, r];
}

/** Top of line at x (the smallest y of its points within 14 px of x), or null when the line does not reach x. */
function topAt(line, x) { let y = null; for (const q of line) if (Math.abs(q[0] - x) < 14 && (y === null || q[1] < y)) y = q[1]; return y; }

/** A strawberry of size k (0 eaten .. 1 whole) at (x, y). */
function berry(ctx, x, y, k) {
  if (k < 0.02) return;
  sticker(() => { blob(ctx, x, y, 34 * k, 40 * k, CORAL); shape(ctx, [[x - 16 * k, y - 36 * k], [x, y - 54 * k], [x + 16 * k, y - 36 * k]], GRASS); });
}

/** The park: sky, a hill, flat grass from y = 950. */
function park(ctx) {
  dots(ctx);
  sticker(() => { blob(ctx, 150, 250, 64, 30, WHITE); blob(ctx, 205, 232, 50, 36, WHITE); blob(ctx, 600, 640, 56, 28, WHITE); });
  ctx.fillStyle = '#35CC8B'; ctx.beginPath(); ctx.ellipse(600, 960, 280, 110, 0, 0, 7); ctx.fill();
  sticker(() => box(ctx, -40, 950, 800, 400, 0, GRASS));
  sticker(() => { tuft(ctx, 200, 950, MINT); tuft(ctx, 520, 950, MINT); bloom(ctx, 460, 1000, 15, SUNNY); bloom(ctx, 250, 1060, 16, CORAL); });
  front(ctx, MINT, SUNNY);
}

/** The road: grass with a lilac road, for the bike. */
function road(ctx) {
  dots(ctx);
  sticker(() => blob(ctx, 600, 330, 58, 58, SUNNY));
  sticker(() => { blob(ctx, 160, 420, 66, 30, WHITE); blob(ctx, 214, 402, 50, 36, WHITE); });
  ctx.fillStyle = '#35CC8B'; ctx.beginPath(); ctx.ellipse(150, 905, 260, 90, 0, 0, 7); ctx.fill();
  sticker(() => box(ctx, -40, 902, 800, 500, 0, MINT));
  ctx.fillStyle = '#C9B6FF'; ctx.fillRect(0, 902, 720, 60);
  sticker(() => { bloom(ctx, 330, 1060, 16, CORAL); bloom(ctx, 420, 1130, 14, SUNNY); });
  front(ctx, GRASS, CORAL);
}

/** The sea, with the boat's hull floating at the middle. */
function sea(ctx) {
  dots(ctx);
  sticker(() => blob(ctx, 140, 300, 58, 58, SUNNY));
  sticker(() => { blob(ctx, 560, 280, 66, 30, WHITE); blob(ctx, 616, 262, 50, 36, WHITE); });
  ctx.fillStyle = '#1FA2E6'; ctx.fillRect(0, 840, 720, 440);
  ctx.fillStyle = 'rgba(255,255,255,0.22)';
  for (const [x, y, r] of [[300, 1000, 50], [520, 1100, 40], [200, 1190, 30]]) { ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.35, 0, 0, 7); ctx.fill(); }
}

/** The big chick's room: pink wall, mint floor. */
function room(ctx) {
  dots(ctx);
  sticker(() => box(ctx, -40, 1000, 800, 400, 0, MINT));
  sticker(() => { box(ctx, 70, 300, 150, 130, 20, SKY); box(ctx, 500, 280, 150, 160, 20, SUNNY); });
  ctx.fillStyle = WHITE; ctx.fillRect(141, 300, 8, 130); ctx.fillRect(70, 361, 150, 8);
  front(ctx, GRASS, CORAL);
}

/** The party: bunting along the top, a floor from y = 900. */
function party(ctx) {
  dots(ctx);
  ctx.strokeStyle = WHITE; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(0, 390); ctx.quadraticCurveTo(360, 460, 720, 390); ctx.stroke(); // below the stars of a win
  sticker(() => { const cs = [CORAL, MINT, VIOLET, SUNNY, ORANGE]; for (let i = 0; i < 9; i++) { const x = 40 + i * 80, y = 390 + Math.sin(i / 8 * Math.PI) * 36; shape(ctx, [[x - 26, y], [x + 26, y], [x, y + 50]], cs[i % 5]); } });
  sticker(() => box(ctx, -40, 900, 800, 500, 0, MINT));
  front(ctx, GRASS, CORAL);
}

/** A big round flat ellipse path, for leaves. */
const oval = (cx, cy, rx, ry, n = 40) => { const out = []; for (let i = 0; i <= n; i++) { const a = Math.PI + i / n * Math.PI * 2; out.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]); } return out; };

// ---------- scenes (the parts that never move; several levels share one) ----------
/** The pond: grass banks over water. plats are [left x, width] of each bank; sun false leaves the sky empty. */
function pond(ctx, sun = true, plats = [[-40, 330], [430, 330]], tufts = [40, 262, 468, 700]) {
  dots(ctx);
  ctx.fillStyle = '#1FA2E6'; ctx.fillRect(0, 930, 720, 350);
  if (sun) sticker(() => blob(ctx, 636, 420, 54, 54, SUNNY));
  sticker(() => { blob(ctx, 150, 330, 70, 34, WHITE); blob(ctx, 210, 310, 56, 40, WHITE); blob(ctx, 440, 470, 60, 30, WHITE); });
  sticker(() => { for (const [x, w] of plats) box(ctx, x, 700, w, 700, 36, MINT); });
  ctx.fillStyle = 'rgba(255,255,255,0.22)';
  for (const [x, y, r] of [[90, 820, 34], [210, 960, 22], [140, 1130, 40], [520, 880, 26], [640, 1010, 38], [560, 1170, 24]]) { ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.7, 0, 0, 7); ctx.fill(); }
  sticker(() => { for (const x of tufts) tuft(ctx, x, 700, GRASS); });
  front(ctx, GRASS, CORAL);
}

function meadow(ctx) {
  dots(ctx);
  sticker(() => blob(ctx, 610, 430, 62, 62, SUNNY));
  sticker(() => { blob(ctx, 140, 380, 64, 30, WHITE); blob(ctx, 196, 362, 50, 36, WHITE); });
  ctx.fillStyle = '#35CC8B'; ctx.beginPath(); ctx.ellipse(560, 870, 260, 110, 0, 0, 7); ctx.fill();
  sticker(() => box(ctx, -40, 850, 800, 500, 0, GRASS));
  ctx.fillStyle = 'rgba(255,255,255,0.14)';
  for (const [x, y, r] of [[120, 1010, 60], [470, 1120, 80], [640, 960, 44]]) { ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.4, 0, 0, 7); ctx.fill(); }
  sticker(() => { tuft(ctx, 50, 850, MINT); tuft(ctx, 560, 850, MINT); tuft(ctx, 680, 850, MINT); });
  sticker(() => { bloom(ctx, 110, 935, 15, SUNNY); bloom(ctx, 500, 1000, 18, ORANGE); bloom(ctx, 330, 1150, 16, SUNNY); });
  front(ctx, MINT, SUNNY);
}

function garden(ctx) {
  ctx.fillStyle = '#FFE27A'; ctx.beginPath(); ctx.arc(540, 430, 250, 0, 7); ctx.fill();
  dots(ctx);
  sticker(() => box(ctx, -40, 1010, 800, 400, 0, MINT));
  ctx.fillStyle = 'rgba(255,255,255,0.2)';
  for (const [x, y, r] of [[330, 1120, 70], [620, 1200, 50], [90, 1210, 44]]) { ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.4, 0, 0, 7); ctx.fill(); }
  sticker(() => { tuft(ctx, 330, 1010, GRASS); tuft(ctx, 690, 1010, GRASS); tuft(ctx, 20, 1010, GRASS); });
  sticker(() => { box(ctx, 478, 900, 140, 112, 20, CORAL); box(ctx, 462, 880, 172, 40, 16, '#E63E52'); });
  sticker(() => { box(ctx, 150, 640, 60, 372, 10, ORANGE); box(ctx, 70, 612, 220, 44, 16, ORANGE); });
  front(ctx, GRASS, CORAL);
}

function hills(ctx) {
  dots(ctx);
  ctx.fillStyle = '#35CC8B'; ctx.beginPath(); ctx.ellipse(130, 880, 250, 100, 0, 0, 7); ctx.fill();
  sticker(() => box(ctx, -40, 860, 800, 500, 0, MINT));
  ctx.fillStyle = 'rgba(255,255,255,0.22)';
  for (const [x, y, r] of [[120, 980, 50], [520, 1090, 70], [300, 1190, 40]]) { ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.45, 0, 0, 7); ctx.fill(); }
  sticker(() => { tuft(ctx, 60, 860, GRASS); tuft(ctx, 650, 860, GRASS); tuft(ctx, 360, 860, GRASS); });
  sticker(() => { bloom(ctx, 240, 1000, 16, SUNNY); bloom(ctx, 600, 960, 15, CORAL); });
  front(ctx, GRASS, VIOLET);
}

function rock(ctx) {
  dots(ctx);
  sticker(() => blob(ctx, 130, 300, 62, 62, SUNNY));
  ctx.fillStyle = '#35CC8B'; ctx.beginPath(); ctx.ellipse(220, 870, 240, 90, 0, 0, 7); ctx.fill();
  sticker(() => box(ctx, -40, 850, 800, 500, 0, GRASS));
  sticker(() => box(ctx, 470, 600, 330, 300, 30, ROCK)); // a lilac rock, clear of the blue sky
  ctx.fillStyle = 'rgba(255,255,255,0.16)';
  for (const [x, y, r] of [[560, 720, 40], [660, 800, 30], [150, 1010, 60], [450, 1140, 70]]) { ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.5, 0, 0, 7); ctx.fill(); }
  sticker(() => { tuft(ctx, 40, 850, MINT); tuft(ctx, 250, 850, MINT); tuft(ctx, 690, 600, MINT); });
  sticker(() => { bloom(ctx, 90, 950, 15, SUNNY); bloom(ctx, 330, 1080, 17, ORANGE); });
  front(ctx, MINT, CORAL);
}

// ---------- chapter 5: snowy day ----------
const WINTER = '#7CCFF5', ICE = '#8DE1F3', PINE = '#29B989';
function snowGround(ctx) {
  dots(ctx);
  ctx.fillStyle = '#C4E6F8'; ctx.beginPath(); ctx.moveTo(0, 900); ctx.quadraticCurveTo(180, 830, 360, 900); ctx.quadraticCurveTo(530, 820, 720, 890); ctx.lineTo(720, 1280); ctx.lineTo(0, 1280); ctx.fill();
  ctx.fillStyle = '#E4F5FD'; ctx.beginPath(); ctx.moveTo(0, 980); ctx.quadraticCurveTo(210, 910, 390, 980); ctx.quadraticCurveTo(550, 900, 720, 970); ctx.lineTo(720, 1280); ctx.lineTo(0, 1280); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.72)';
  for (const [x, y, r] of [[110, 340, 48], [170, 325, 34], [530, 290, 50], [590, 305, 34]]) { ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.55, 0, 0, 7); ctx.fill(); }
}
function pineTree(ctx, x, y, k = 1) {
  ctx.save(); ctx.translate(x, y); ctx.scale(k, k);
  sticker(() => { box(ctx, -13, -105, 26, 112, 7, '#A86B46'); shape(ctx, [[0, -300], [88, -155], [-88, -155]], PINE); shape(ctx, [[0, -230], [108, -75], [-108, -75]], '#36C995'); });
  sticker(() => { blob(ctx, -37, -154, 10, 8, WHITE); blob(ctx, 36, -84, 12, 8, WHITE); blob(ctx, 8, -260, 9, 7, WHITE); }); ctx.restore();
}
function snowWeather(ctx, S) {
  const count = qualitySnowCount(S);
  ctx.save(); ctx.globalAlpha = 0.76; ctx.fillStyle = WHITE;
  for (let i = 0; i < count; i++) {
    const x = (i * 191 + Math.sin(S.t * 0.7 + i * 1.7) * 16 + 720) % 720;
    const y = (i * 137 + S.t * (26 + i % 5 * 8)) % 1280, r = 2 + i % 3;
    ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
    if (i % 7 === 0) { ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x - 7, y); ctx.lineTo(x + 7, y); ctx.moveTo(x, y - 7); ctx.lineTo(x, y + 7); ctx.stroke(); }
  }
  ctx.restore();
}
// Keep weather particle work bounded on slower phones; the scene has no per-frame allocations beyond this loop.
const qualitySnowCount = (S) => S.quiet || S.quality >= 2 ? 9 : S.quality === 1 ? 15 : 23;
function winterLiveWeather(ctx, S) { snowWeather(ctx, S); }
function snowman(ctx, t, happy, bob = 0) {
  const y = 0; shadow(ctx, 360, 930, 150);
  sticker(() => { blob(ctx, 360, 800 + bob, 142, 134, WHITE); blob(ctx, 360, 630 + bob, 105, 102, WHITE); blob(ctx, 360, 492 + bob, 75, 70, WHITE); stick(ctx, [[286, 640 + bob], [222, 600 + bob]], 13, '#9B704D'); stick(ctx, [[434, 640 + bob], [498, 600 + bob]], 13, '#9B704D'); shape(ctx, [[357, 510 + bob], [430, 528 + bob], [359, 542 + bob]], ORANGE); });
  face(ctx, 360, 484 + bob, 46, happy ? 'happy' : 'wait', t, null);
  for (let i = 0; i < 3; i++) blob(ctx, 360, 760 + i * 35 + bob, 7, 7, NAVY);
}
function penguin(ctx, x, y, rot = 0, happy = true) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
  sticker(() => { blob(ctx, 0, -65, 58, 88, NAVY); blob(ctx, 0, -51, 34, 58, WHITE); blob(ctx, -30, -5, 26, 12, ORANGE, -0.12); blob(ctx, 30, -5, 26, 12, ORANGE, 0.12); shape(ctx, [[-10, -118], [0, -104], [10, -118]], ORANGE); });
  face(ctx, 0, -104, 31, happy ? 'happy' : 'wait', 1, null); ctx.restore();
}
function winterScenery(ctx, trees = true) { snowGround(ctx); if (trees) { pineTree(ctx, 90, 930, 0.86); pineTree(ctx, 630, 930, 1.05); } }

export const LEVELS = [
  // 1 -------- a bridge for the chick: one short, level line
  {
    bg: SKY, target: [[290, 700], [430, 700]], notes: [523, 659, 784, 1047],
    cues: [[1.6, 1500, 0.07, 'sine', 300], [1.75, 1700, 0.07, 'sine', 300], [1.95, 1500, 0.07, 'sine', 300]],
    back: (ctx) => pond(ctx),
    live(ctx, S) {
      const w = S.won;
      // a fish leaps in the gap when the bridge is up
      if (w > 0.3 && w < 1.5) {
        const k = (w - 0.3) / 1.2, fx = 330 + k * 60, fy = 1010 - Math.sin(k * Math.PI) * 190;
        ctx.save(); ctx.translate(fx, fy); ctx.rotate(-1.2 + k * 2.4);
        sticker(() => { shape(ctx, [[-30, 0], [-52, -18], [-52, 18]], CORAL); blob(ctx, 0, 0, 34, 20, CORAL); });
        ctx.fillStyle = '#1F2A6B'; ctx.beginPath(); ctx.arc(14, -5, 4, 0, 7); ctx.fill();
        ctx.restore();
      }
      sticker(() => S.part(ctx, 26, ORANGE));
      planks(ctx, S.stroke);
      const cheer = w > 1.5 ? hop(w - 1.5, 8, 22) : 0;
      chick(ctx, 622, 700 - cheer, VIOLET, -1, w >= 0 ? 'happy' : 'wait', S.t + 1.3, null, w < 0 ? Math.sin(S.t * 1.7) * 0.04 : 0);
      let x = 170, y = 700 - (w < 0 ? hop(S.t, 2.2, 6) : 0), lean = S.mood === 'draw' ? 0.12 : 0;
      if (w >= 0) {
        // walk the player's own line, then on to the friend
        const road = [[170, 700], ...S.stroke, [425, 700]], k = ease((w - 0.35) / 1.1), p = pointAt(road, k);
        x = p[0]; y = p[1] - (k < 1 ? hop(k, 16, 24) : cheer); lean = k < 1 ? 0.1 : 0;
      }
      chick(ctx, x, y, SUNNY, 1, S.mood, S.t, S.look, lean);
      if (w > 1.55) {
        for (let i = 0; i < 3; i++) {
          const a = w - 1.55 - i * 0.28; if (a < 0 || a > 1.4) continue;
          ctx.save(); ctx.globalAlpha = 1 - a / 1.4;
          sticker(() => heart(ctx, 524 + Math.sin(a * 5 + i) * 16, 560 - a * 150, 13 + i * 3, CORAL));
          ctx.restore();
        }
      }
    },
  },
  // 2 -------- a shell for the snail: one closed round shape
  {
    bg: LIGHT_SKY, closed: true, target: circle(250, 705, 100), notes: [392, 523, 659, 880],
    cues: [[0.55, 240, 1.5, 'sine', 420]],
    back: meadow,
    live(ctx, S) {
      const w = S.won, dx = w >= 0 ? ease((w - 0.5) / 2.2) * 190 : 0, x = 250 + dx;
      const bob = w >= 0 ? Math.sin(w * 9) * 0.05 : 0;
      if (dx > 4) { ctx.save(); ctx.globalAlpha = 0.55; ctx.lineCap = 'round'; ctx.strokeStyle = '#A8F5D6'; ctx.lineWidth = 16; ctx.beginPath(); ctx.moveTo(100, 850); ctx.lineTo(100 + dx, 850); ctx.stroke(); ctx.restore(); }
      shadow(ctx, x + 10, 852, 170);
      if (w >= 0) {
        ctx.save(); ctx.translate(x, 705); ctx.rotate(bob); ctx.translate(-250, -705);
        sticker(() => S.part(ctx, 24, VIOLET));
        // the spiral grows inside the shell the player drew
        const turns = spiral(250, 705, 62);
        ctx.lineCap = ctx.lineJoin = 'round'; ctx.strokeStyle = '#C9B6FF'; ctx.lineWidth = 12; ctx.beginPath();
        const shown = upTo(turns, ease((w - 0.2) / 0.8)); ctx.moveTo(shown[0][0], shown[0][1]); for (const p of shown) ctx.lineTo(p[0], p[1]); ctx.stroke();
        ctx.restore();
      }
      const nod = w < 0 ? Math.sin(S.t * 2) * 6 : hop(w, 6, 5), turn = S.mood === 'draw' ? -14 : 0, ox = x + 30;
      ctx.save(); ctx.translate(ox, 850); snail(ctx, S.mood, S.t, S.look && [S.look[0] - ox, S.look[1] - 850], nod, turn); ctx.restore();
    },
  },
  // 3 -------- water for the flower: a curve that joins two things
  {
    bg: LILAC_SKY, target: curve([[318, 500], [420, 470], [505, 590], [548, 790]]), notes: [587, 740, 880, 1175],
    cues: [[0.2, 1900, 0.05, 'sine', -500], [0.45, 2100, 0.05, 'sine', -500], [0.7, 1800, 0.05, 'sine', -500], [0.95, 2000, 0.05, 'sine', -500], [1.2, 1900, 0.05, 'sine', -500], [2.0, 1319, 0.5, 'triangle', 0]],
    back: garden,
    live(ctx, S) {
      const w = S.won, grow = ease((w - 0.7) / 1.3), tip = w >= 0 ? 0.1 : Math.sin(S.t * 1.6) * 0.03 + (S.mood === 'draw' ? 0.06 : 0);
      // the water is the player's line; drops run along it, and it runs dry once the flower is up
      const dry = w >= 0 ? ease((w - 2.1) / 0.6) : 0, wet = w >= 0 && dry < 1 ? upTo(S.stroke.slice().reverse(), 1 - dry).reverse() : null;
      if (wet && wet.length > 1) {
        sticker(() => stick(ctx, wet, 26, SKY));
        const len = pathLen(wet);
        sticker(() => { for (let i = 0; i < 4; i++) { const p = pointAt(wet, (w * 200 / Math.max(60, len) + i / 4) % 1); blob(ctx, p[0], p[1], 7, 7, WHITE); } });
      }
      // sprout, then stem and flower
      const top = 880 - 30 - 230 * grow, sway = w >= 0 ? Math.sin(w * 4) * 8 * grow : Math.sin(S.t * 2.2) * 3;
      sticker(() => {
        stick(ctx, [[548, 884], [548 + sway * 0.4, (884 + top) / 2], [548 + sway, top]], 14, GRASS);
        blob(ctx, 574 + sway * 0.3, 860 - 60 * grow, 24, 12, GRASS, -0.5);
        if (grow > 0.25) {
          const r = 38 * ease((grow - 0.25) / 0.6);
          for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2 + w * 0.6; blob(ctx, 548 + sway + Math.cos(a) * r * 1.25, top + Math.sin(a) * r * 1.25, r, r, CORAL); }
          blob(ctx, 548 + sway, top, r * 1.05, r * 1.05, WHITE);
          if (r > 30) face(ctx, 548 + sway, top - 6, 30, 'happy', S.t, null);
        }
      });
      if (grow > 0.92) S.once('bloom', () => S.burst(548, top, 40));
      can(ctx, S, tip); // the watering can tips forward when the water flows
    },
  },
  // 4 -------- a rainbow over the chicks: one big arc
  {
    bg: SKY, target: curve([[130, 660], [190, 470], [360, 390], [530, 470], [590, 660]]), notes: [523, 659, 784, 988],
    cues: [[0.9, 1500, 0.07, 'sine', 300], [1.05, 1700, 0.07, 'sine', 300], [1.6, 1319, 0.4, 'triangle', 0]],
    back: hills,
    live(ctx, S) {
      const w = S.won, clear = w >= 0 ? ease(w / 1.2) : 0;
      // the sun comes out as the cloud drifts off
      if (clear > 0) sticker(() => blob(ctx, 110, 330 + (1 - clear) * 120, 62 * clear, 62 * clear, SUNNY));
      if (w >= 0) rainbow(ctx, S.stroke);
      rainCloud(ctx, S, 330 + clear * 520, clear, w >= 0, null);
      const j = w > 0.9 ? hop(w - 0.9, 7, 30) : 0, shiver = w < 0 ? Math.sin(S.t * 30) * 2 : 0;
      chick(ctx, 250 + shiver, 860 - j, SUNNY, 1, S.mood, S.t, S.look);
      chick(ctx, 480 - shiver, 860 - (w > 1.05 ? hop(w - 1.05, 7, 30) : 0), VIOLET, -1, w >= 0 ? 'happy' : 'wait', S.t + 1.3, S.look);
    },
  },
  // 5 -------- a ramp for the snail, who wears the shell the player drew: one sloping line
  {
    bg: LIGHT_SKY, target: [[300, 846], [470, 600]], notes: [392, 523, 659, 784, 1047],
    cues: [[0.5, 260, 1.6, 'sine', 500], [2.5, 1319, 0.12, 'triangle', 0], [2.65, 1568, 0.3, 'triangle', 0]],
    back: rock,
    live(ctx, S) {
      const w = S.won;
      sticker(() => S.part(ctx, 26, ORANGE));
      planks(ctx, S.stroke);
      // the strawberry on the rock, eaten at the end
      const left = w > 2.5 ? 1 - ease((w - 2.5) / 0.4) : 1, bobble = Math.sin(S.t * 3) * 3;
      if (left > 0.02) sticker(() => { blob(ctx, 672, 560 + bobble, 34 * left, 40 * left, CORAL); shape(ctx, [[656, 524 + bobble], [672, 506 + bobble], [688, 524 + bobble]].map((p) => [672 + (p[0] - 672) * left, p[1]]), GRASS); });
      // the snail crawls to the ramp, up the player's line and on to the berry
      let p = [150, 850], rot = 0;
      if (w >= 0) {
        const road = [[150, 850], [280, 850], ...S.stroke, [585, 600]], k = ease((w - 0.4) / 2.2);
        p = pointAt(road, k); const q = pointAt(road, Math.min(1, k + 0.03)); rot = k < 1 ? Math.atan2(q[1] - p[1], q[0] - p[0]) : 0;
      }
      shelled(ctx, S, p[0], p[1], rot);
    },
  },
  // ======== chapter 2: the same places, a different part missing ========
  // 6 -------- the sun over the pond: a closed round shape
  {
    bg: SKY, closed: true, target: circle(590, 410, 76), notes: [523, 659, 784, 1047],
    cues: [[0.4, 880, 0.3, 'triangle', 300], [1.5, 1319, 0.12, 'triangle', 0], [1.65, 1568, 0.3, 'triangle', 0]],
    back(ctx) { pond(ctx, false); sticker(() => stick(ctx, [[290, 700], [430, 700]], 26, ORANGE)); planks(ctx, [[290, 700], [360, 700], [430, 700]]); },
    live(ctx, S) {
      const w = S.won, cold = w < 0 ? Math.sin(S.t * 30) * 2 : 0;
      if (w >= 0) {
        const [cx, cy] = sunRays(ctx, S.stroke, S.t, ease(w / 0.6));
        sticker(() => { S.part(ctx, 0, SUNNY); face(ctx, cx, cy, 46, 'happy', S.t, null); });
      }
      // the chicks shiver until the sun is out, then meet on the bridge
      const k = ease((w - 0.6) / 1.2), j = w > 1.9 ? hop(w - 1.9, 7, 24) : 0;
      chick(ctx, 170 + k * 140 + cold, 700 - j, SUNNY, 1, S.mood, S.t, S.look);
      chick(ctx, 600 - k * 150 - cold, 700 - (w > 2 ? hop(w - 2, 7, 24) : 0), VIOLET, -1, w >= 0 ? 'happy' : 'wait', S.t + 1.3, S.look);
    },
  },
  // 7 -------- a leaf for the snail to eat: a closed flat shape
  {
    bg: LIGHT_SKY, closed: true, target: oval(530, 790, 100, 50), notes: [392, 523, 659, 880],
    cues: [[1.1, 300, 0.08, 'square', -100], [1.4, 300, 0.08, 'square', -100], [1.7, 300, 0.08, 'square', -100], [2.2, 1319, 0.3, 'triangle', 0]],
    back: meadow,
    live(ctx, S) {
      const w = S.won, eat = ease((w - 1.0) / 1.1), x = 200 + ease((w - 0.3) / 0.7) * 90;
      shelled(ctx, S, x, 850, 0, 0.8);
      if (w >= 0 && eat < 0.98) { // in front of the snail: the leaf shrinks into its mouth (face at (154, -141) in its frame, scaled 0.8)
        const [cx, cy] = centroid(S.stroke), mx = x + 154 * 0.8, my = 850 - 141 * 0.8;
        const leaf = moved(S.stroke, cx, cy, 1 - eat, (mx - cx) * eat, (my - cy) * eat);
        sticker(() => shape(ctx, leaf, '#A6E85A'));
        const [lx, ly] = centroid(leaf); ctx.strokeStyle = '#5FB82E'; ctx.lineWidth = 6; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(lx - 60 * (1 - eat), ly); ctx.lineTo(lx + 60 * (1 - eat), ly); ctx.stroke();
      }
      if (w > 2.1) S.once('yum', () => S.burst(400, 700, 30));
      if (w > 2.1) { const a = Math.min(1, w - 2.1); ctx.save(); ctx.globalAlpha = 1 - a; sticker(() => heart(ctx, 330, 640 - a * 120, 18, CORAL)); ctx.restore(); }
    },
  },
  // 8 -------- a stem for the flower: one line straight up
  {
    bg: LILAC_SKY, target: [[548, 872], [548, 610]], notes: [587, 740, 880, 1175],
    cues: [[0.4, 600, 0.6, 'sine', 600], [1.4, 1319, 0.5, 'triangle', 0]],
    back: garden,
    live(ctx, S) {
      const w = S.won;
      if (w >= 0) {
        sticker(() => {
          S.part(ctx, 14, GRASS);
          for (const [k, d] of [[0.35, 1], [0.6, -1]]) { const p = pointAt(S.stroke, k), g = ease((w - 0.3) / 0.5); blob(ctx, p[0] + d * 22 * g, p[1] - 4, 24 * g, 11 * g, GRASS, d * -0.5); }
        });
      }
      // the flower head lies by the pot, then flies up to the top of the player's stem and opens
      const top = w >= 0 ? S.stroke[S.stroke.length - 1] : [548, 610], fly = ease((w - 0.3) / 0.8), open = ease((w - 1.0) / 0.6);
      const hx = 400 + (top[0] - 400) * fly, hy = 975 + (top[1] - 975) * fly - Math.sin(fly * Math.PI) * 80, r = 22 + 16 * open;
      sticker(() => {
        for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2 + S.t * 0.6 * open; blob(ctx, hx + Math.cos(a) * r * 1.25, hy + Math.sin(a) * r * 1.25, r, r, CORAL); }
        blob(ctx, hx, hy, r * 1.05, r * 1.05, WHITE);
        face(ctx, hx, hy - 4, 26, w >= 0 ? 'happy' : S.mood === 'draw' ? 'draw' : 'sad', S.t, null);
      });
      if (open > 0.9) S.once('bloom', () => S.burst(hx, hy, 40));
      can(ctx, S, w >= 0 ? 0.1 : Math.sin(S.t * 1.6) * 0.03);
    },
  },
  // 9 -------- an umbrella over the chicks: a small arc
  {
    bg: SKY, target: curve([[180, 690], [230, 580], [365, 535], [500, 580], [550, 690]]), notes: [523, 659, 784, 988],
    cues: [[0.3, 700, 0.06, 'sine', 0], [0.5, 760, 0.06, 'sine', 0], [0.7, 700, 0.06, 'sine', 0], [2.0, 1319, 0.4, 'triangle', 0]],
    back: hills,
    live(ctx, S) {
      const w = S.won, clear = w >= 0 ? ease((w - 1.4) / 1.0) : 0;
      if (clear > 0) sticker(() => blob(ctx, 110, 330 + (1 - clear) * 120, 62 * clear, 62 * clear, SUNNY));
      rainCloud(ctx, S, 330 + clear * 520, clear, w > 1.4, w >= 0 ? (x) => topAt(S.stroke, x) : null);
      if (w >= 0) {
        const tip = S.stroke.reduce((a, q) => (q[1] < a[1] ? q : a));
        sticker(() => { stick(ctx, [tip, [tip[0], 800], [tip[0] + 22, 822]], 12, ORANGE); shape(ctx, S.stroke, CORAL); });
        ctx.strokeStyle = WHITE; ctx.lineWidth = 6; ctx.lineCap = 'round';
        for (const k of [0.25, 0.5, 0.75]) { const p = pointAt(S.stroke, k); ctx.beginPath(); ctx.moveTo(tip[0], tip[1] + 8); ctx.lineTo(p[0], p[1]); ctx.stroke(); }
      }
      const shiver = w < 0 ? Math.sin(S.t * 30) * 2 : 0, j = w > 2 ? hop(w - 2, 7, 26) : 0;
      chick(ctx, 280 + shiver, 860 - j, SUNNY, 1, S.mood, S.t, S.look);
      chick(ctx, 450 - shiver, 860 - (w > 2.1 ? hop(w - 2.1, 7, 26) : 0), VIOLET, -1, w >= 0 ? 'happy' : 'wait', S.t + 1.3, S.look);
    },
  },
  // 10 -------- a slide off the rock: one curve down
  {
    bg: LIGHT_SKY, target: curve([[470, 612], [420, 650], [340, 760], [250, 846]]), notes: [784, 659, 523, 392, 1047],
    cues: [[0.5, 900, 1.0, 'sine', -600], [2.1, 1319, 0.12, 'triangle', 0], [2.25, 1568, 0.3, 'triangle', 0]],
    back: rock,
    live(ctx, S) {
      const w = S.won;
      if (w >= 0) sticker(() => S.part(ctx, 26, CORAL));
      berry(ctx, 110, 820 + Math.sin(S.t * 3) * 3, w > 1.9 ? 1 - ease((w - 1.9) / 0.4) : 1);
      let p = [600, 600], rot = 0;
      if (w >= 0) {
        const path = [[600, 600], [480, 600], ...S.stroke, [220, 850]], k = ease((w - 0.4) / 1.3);
        p = pointAt(path, k); const q = pointAt(path, Math.min(1, k + 0.03)); rot = k < 1 ? Math.atan2(p[1] - q[1], p[0] - q[0]) : 0;
      }
      shelled(ctx, S, p[0], p[1], rot, 0.62, -1);
    },
  },
  // ======== chapter 3: two parts to draw ========
  // 11 -------- a balloon and its string
  {
    bg: SKY, notes: [523, 659, 784, 1047],
    parts: [{ target: circle(330, 430, 90), closed: true }, { target: curve([[330, 522], [355, 640], [325, 760], [342, 878]]) }],
    cues: [[0.4, 500, 1.2, 'sine', 500], [1.8, 1319, 0.3, 'triangle', 0]],
    back: park,
    live(ctx, S) {
      const w = S.won, lift = w >= 0 ? -ease((w - 0.4) / 1.4) * 70 + Math.sin(w * 3) * 8 : 0;
      ctx.save(); ctx.translate(0, lift);
      if (S.lines[1]) sticker(() => S.part(ctx, 7, NAVY, 1));
      if (S.lines[0]) { sticker(() => S.part(ctx, 0, CORAL, 0)); const [cx, cy] = centroid(S.lines[0]); ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.beginPath(); ctx.ellipse(cx - 34, cy - 34, 14, 22, 0.6, 0, 7); ctx.fill(); }
      chick(ctx, 380, 950, SUNNY, 1, S.mood, S.t, S.look, w >= 0 ? Math.sin(w * 3) * 0.08 : 0);
      ctx.restore();
      if (w > 1.8) S.once('up', () => S.burst(360, 700, 30));
    },
  },
  // 12 -------- two wheels for the bike
  {
    bg: SKY, notes: [440, 554, 659, 880],
    parts: [{ target: circle(230, 830, 72), closed: true }, { target: circle(490, 830, 72), closed: true }],
    cues: [[0.3, 900, 0.08, 'square', 0], [0.45, 900, 0.08, 'square', 0], [1.5, 1319, 0.3, 'triangle', 0]],
    back: road,
    live(ctx, S) {
      const w = S.won, roll = w >= 0 ? w * 7 : 0, bob = w >= 0 ? Math.abs(Math.sin(w * 9)) * 4 : 0;
      // road dashes run past once the bike rides
      ctx.fillStyle = WHITE; for (let i = 0; i < 6; i++) { const x = ((i * 160 - roll * 60) % 960 + 960) % 960 - 120; ctx.fillRect(x, 928, 70, 10); }
      ctx.save(); ctx.translate(0, -bob);
      sticker(() => {
        stick(ctx, [[230, 830], [330, 730], [450, 730], [490, 830]], 14, CORAL); stick(ctx, [[330, 730], [370, 830], [230, 830]], 14, CORAL);
        stick(ctx, [[450, 730], [440, 680], [470, 672]], 12, CORAL); box(ctx, 300, 712, 64, 18, 9, NAVY);
      });
      for (let k = 0; k < 2; k++) {
        if (!S.lines[k]) continue;
        const [cx, cy] = centroid(S.lines[k]), a = roll, c = Math.cos(a), sn = Math.sin(a), wheel = S.lines[k].map((q) => [cx + (q[0] - cx) * c - (q[1] - cy) * sn, cy + (q[0] - cx) * sn + (q[1] - cy) * c]);
        sticker(() => stick(ctx, wheel, 18, VIOLET));
        ctx.strokeStyle = '#C9B6FF'; ctx.lineWidth = 6; ctx.lineCap = 'round';
        for (let i = 0; i < 3; i++) { const b = a + i * Math.PI / 3; ctx.beginPath(); ctx.moveTo(cx - Math.cos(b) * 54, cy - Math.sin(b) * 54); ctx.lineTo(cx + Math.cos(b) * 54, cy + Math.sin(b) * 54); ctx.stroke(); }
        sticker(() => blob(ctx, cx, cy, 10, 10, WHITE));
      }
      chick(ctx, 330, 722, SUNNY, 1, S.mood, S.t, S.look, w >= 0 ? 0.12 : 0);
      ctx.restore();
      if (w > 0.6 && w < 2.2) { ctx.strokeStyle = WHITE; ctx.lineWidth = 6; for (let i = 0; i < 3; i++) { const y = 660 + i * 50, x = 120 - ((w * 400 + i * 90) % 200); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 60, y); ctx.stroke(); } }
    },
  },
  // 13 -------- two bridges across the pond
  {
    bg: SKY, notes: [523, 659, 784, 1047],
    parts: [{ target: [[200, 700], [300, 700]] }, { target: [[420, 700], [520, 700]] }],
    cues: [[1.6, 1500, 0.07, 'sine', 300], [1.75, 1700, 0.07, 'sine', 300]],
    back: (ctx) => pond(ctx, true, [[-40, 240], [300, 120], [520, 240]], [40, 360, 700]),
    live(ctx, S) {
      const w = S.won;
      for (let k = 0; k < 2; k++) if (S.lines[k]) { sticker(() => S.part(ctx, 26, ORANGE, k)); planks(ctx, S.lines[k]); }
      chick(ctx, 640, 700 - (w > 1.5 ? hop(w - 1.5, 8, 22) : 0), VIOLET, -1, w >= 0 ? 'happy' : 'wait', S.t + 1.3, null);
      // the chick crosses the first bridge as soon as it is drawn, and the second at the end
      let x = 100, y = 700 - (S.lines[0] ? 0 : hop(S.t, 2.2, 6));
      if (S.lines[0]) {
        const a = ease(S.age(0) / 1.1), r1 = [[100, 700], ...S.lines[0], [340, 700]], p = pointAt(r1, a);
        x = p[0]; y = p[1] - (a < 1 ? hop(a, 14, 20) : 0);
      }
      const wait = Math.max(0, 1.1 - (S.age(0) - w)); // the first crossing finishes before the second starts
      if (w >= 0 && w > 0.3 + wait) {
        const b = ease((w - 0.3 - wait) / 1.1), p = pointAt([[340, 700], ...S.lines[1], [585, 700]], b);
        x = p[0]; y = p[1] - (b < 1 ? hop(b, 14, 20) : 0);
      }
      chick(ctx, x, y, SUNNY, 1, S.mood, S.t, S.look);
    },
  },
  // 14 -------- a shell for the baby snail: one small closed shape
  {
    bg: LIGHT_SKY, closed: true, target: circle(455, 777, 52), notes: [392, 523, 659, 880],
    cues: [[0.55, 300, 1.4, 'sine', 400], [2.0, 1319, 0.3, 'triangle', 0]],
    back: meadow,
    live(ctx, S) {
      const w = S.won, go = w >= 0 ? ease((w - 0.8) / 1.8) * 110 : 0, K = 0.5;
      shelled(ctx, S, 170 + go, 850, 0, 0.75);
      ctx.save(); ctx.translate(go, 0);
      if (w >= 0) { const [cx, cy] = centroid(S.stroke); sticker(() => S.part(ctx, 0, SUNNY)); swirl(ctx, spiral(cx, cy, 30), '#FFF0B3', 9); }
      ctx.save(); ctx.translate(470, 850); ctx.scale(K, K); const was = borderScale(1 / K);
      snail(ctx, w >= 0 ? 'happy' : S.mood === 'draw' ? 'draw' : 'sad', S.t, null, w < 0 ? Math.sin(S.t * 2.4) * 6 : hop(w, 6, 5), 0);
      borderScale(was); ctx.restore(); ctx.restore();
      if (w > 0.4 && w < 2) { const a = (w - 0.4) / 1.6; ctx.save(); ctx.globalAlpha = 1 - a; sticker(() => heart(ctx, 360, 620 - a * 120, 16, CORAL)); ctx.restore(); }
    },
  },
  // 15 -------- glasses for the big chick: two round lenses
  {
    bg: BLUSH, notes: [523, 659, 784, 1047],
    parts: [{ target: circle(288, 640, 60), closed: true }, { target: circle(432, 640, 60), closed: true }],
    cues: [[0.3, 1200, 0.1, 'triangle', 400], [1.4, 1319, 0.3, 'triangle', 0]],
    back: room,
    live(ctx, S) {
      const w = S.won, bob = Math.sin(S.t * 2) * 4;
      // a butterfly flutters round; the chick follows it once it can see
      const bt = S.t * 0.9, bx = 360 + Math.cos(bt) * 250, by = 420 + Math.sin(bt * 2) * 70, flap = Math.abs(Math.sin(S.t * 14));
      ctx.save(); ctx.translate(0, bob);
      sticker(() => {
        stick(ctx, [[300, 990], [300, 1010]], 16, ORANGE); stick(ctx, [[420, 990], [420, 1010]], 16, ORANGE);
        blob(ctx, 360, 780, 230, 220, SUNNY); blob(ctx, 360, 860, 140, 110, '#FFF0B3');
        blob(ctx, 140, 820, 40, 80, '#F2A91F', 0.3); blob(ctx, 580, 820, 40, 80, '#F2A91F', -0.3);
        stick(ctx, [[350, 560], [330, 520]], 12, SUNNY); stick(ctx, [[370, 560], [384, 516]], 12, SUNNY);
        face(ctx, 360, 640, 200, w >= 0 ? 'draw' : S.mood === 'sad' ? 'sad' : 'wait', S.t, w >= 0 ? [bx, by] : null);
        shape(ctx, [[318, 696], [402, 696], [360, 752]], ORANGE); // the beak covers the mouth
      });
      ctx.strokeStyle = NAVY; ctx.lineCap = 'round';
      for (let k = 0; k < 2; k++) if (S.lines[k]) { sticker(() => stick(ctx, S.lines[k], 14, VIOLET)); const [cx, cy] = centroid(S.lines[k]); ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(cx, cy, 36, 3.6, 4.4); ctx.stroke(); }
      if (S.lines[0] && S.lines[1]) { const a = centroid(S.lines[0]), b = centroid(S.lines[1]); sticker(() => stick(ctx, [[a[0] + 56, a[1] - 6], [360, a[1] - 18], [b[0] - 56, b[1] - 6]], 10, VIOLET)); }
      ctx.restore();
      sticker(() => { blob(ctx, bx - 16, by, 18, 22 * flap + 4, CORAL, 0.4); blob(ctx, bx + 16, by, 18, 22 * flap + 4, CORAL, -0.4); blob(ctx, bx, by, 5, 14, NAVY); });
      if (w > 0.5 && w < 2.2) { const a = (w - 0.5) / 1.7; ctx.save(); ctx.globalAlpha = 1 - a; sticker(() => { heart(ctx, 150, 500 - a * 140, 16, CORAL); heart(ctx, 570, 480 - a * 150, 14, CORAL); }); ctx.restore(); }
    },
  },
  // ======== chapter 4: two parts, bigger scenes ========
  // 16 -------- a mast and a sail for the boat
  {
    bg: SKY, notes: [392, 494, 587, 784],
    parts: [{ target: [[360, 790], [360, 470]] }, { target: loop([[380, 490], [560, 760], [380, 760]]), closed: true }],
    cues: [[0.4, 500, 1.0, 'sine', 300], [1.6, 1319, 0.3, 'triangle', 0]],
    back: sea,
    live(ctx, S) {
      const w = S.won, rock = Math.sin(S.t * 1.8) * (w >= 0 ? 0.05 : 0.02), wave = S.t * (w >= 0 ? 160 : 40);
      ctx.save(); ctx.translate(360, 840); ctx.rotate(rock); ctx.translate(-360, -840);
      if (S.lines[0]) sticker(() => S.part(ctx, 16, ORANGE, 0));
      if (S.lines[1]) {
        // the sail fills with wind: it swells sideways from the mast
        const puff = w >= 0 ? 1.06 + Math.sin(w * 4) * 0.05 : 1, sail = S.lines[1].map((q) => [375 + (q[0] - 375) * puff, q[1]]);
        sticker(() => shape(ctx, sail, '#FFF0B3'));
        ctx.save(); ctx.beginPath(); ctx.moveTo(sail[0][0], sail[0][1]); for (const q of sail) ctx.lineTo(q[0], q[1]); ctx.closePath(); ctx.clip();
        ctx.fillStyle = CORAL; ctx.fillRect(300, 620, 300, 26); ctx.fillRect(300, 690, 300, 26); ctx.restore();
      }
      chick(ctx, 250, 800, SUNNY, 1, S.mood, S.t, S.look);
      sticker(() => { shape(ctx, [[180, 790], [560, 790], [500, 880], [240, 880]], CORAL); box(ctx, 220, 806, 300, 14, 7, WHITE); });
      ctx.restore();
      // waves scroll past; faster once the boat sails
      ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 7; ctx.lineCap = 'round';
      for (let i = 0; i < 7; i++) { const x = ((i * 130 - wave) % 910 + 910) % 910 - 100; ctx.beginPath(); ctx.arc(x, 880, 26, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke(); }
      if (w > 0.8) { const a = ((w - 0.8) % 2.4) / 1.2; if (a < 1) { const fx = 560 + a * 120, fy = 960 - Math.sin(a * Math.PI) * 140; sticker(() => blob(ctx, fx, fy, 26, 16, ORANGE, -1 + a * 2)); } }
    },
  },
  // 17 -------- up the rock and down the other side: a ramp and a slide
  {
    bg: LIGHT_SKY, notes: [392, 523, 659, 784, 1047],
    parts: [{ target: [[200, 846], [330, 676]] }, { target: curve([[500, 676], [545, 710], [585, 790], [610, 846]]) }],
    cues: [[0.5, 260, 1.2, 'sine', 500], [1.8, 900, 0.9, 'sine', -600], [3.0, 1319, 0.12, 'triangle', 0], [3.15, 1568, 0.3, 'triangle', 0]],
    back(ctx) {
      dots(ctx);
      sticker(() => blob(ctx, 600, 300, 62, 62, SUNNY));
      sticker(() => box(ctx, -40, 850, 800, 500, 0, GRASS));
      sticker(() => box(ctx, 330, 670, 170, 250, 30, ROCK)); // lilac, clear of the blue sky
      ctx.fillStyle = 'rgba(255,255,255,0.16)'; for (const [x, y, r] of [[390, 760, 30], [450, 820, 24], [330, 1080, 70]]) { ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.5, 0, 0, 7); ctx.fill(); }
      sticker(() => { tuft(ctx, 460, 670, MINT); bloom(ctx, 250, 960, 15, SUNNY); bloom(ctx, 470, 980, 16, ORANGE); });
      front(ctx, MINT, CORAL);
    },
    live(ctx, S) {
      const w = S.won;
      for (let k = 0; k < 2; k++) if (S.lines[k]) { sticker(() => S.part(ctx, 26, k ? CORAL : ORANGE, k)); if (!k) planks(ctx, S.lines[0]); }
      berry(ctx, 670, 820 + Math.sin(S.t * 3) * 3, w > 2.9 ? 1 - ease((w - 2.9) / 0.4) : 1);
      let p = [40, 850], rot = 0;
      if (w >= 0) {
        const path = [[40, 850], ...S.lines[0], [415, 668], ...S.lines[1], [560, 850]], k = ease((w - 0.4) / 2.4);
        p = pointAt(path, k); const q = pointAt(path, Math.min(1, k + 0.03)); rot = k < 1 ? Math.atan2(q[1] - p[1], q[0] - p[0]) : 0;
      }
      shelled(ctx, S, p[0], p[1], rot, 0.55);
    },
  },
  // 18 -------- a rainbow, then the sun
  {
    bg: SKY, notes: [523, 659, 784, 988, 1319],
    parts: [{ target: curve([[130, 660], [190, 470], [360, 390], [530, 470], [590, 660]]) }, { target: circle(96, 390, 56), closed: true }],
    cues: [[0.9, 1500, 0.07, 'sine', 300], [1.05, 1700, 0.07, 'sine', 300], [1.6, 1319, 0.4, 'triangle', 0]],
    back: hills,
    live(ctx, S) {
      const w = S.won, clear = w >= 0 ? ease(w / 1.2) : 0;
      if (S.lines[0]) rainbow(ctx, S.lines[0]);
      if (w >= 0) { const [cx, cy] = sunRays(ctx, S.lines[1], S.t, ease(w / 0.6)); sticker(() => { S.part(ctx, 0, SUNNY, 1); face(ctx, cx, cy, 40, 'happy', S.t, null); }); }
      rainCloud(ctx, S, 330 + clear * 560, clear, w >= 0, S.lines[0] ? (x) => topAt(S.lines[0], x) : null);
      const j = w > 0.9 ? hop(w - 0.9, 7, 30) : 0, shiver = w < 0 && !S.lines[0] ? Math.sin(S.t * 30) * 2 : 0;
      chick(ctx, 250 + shiver, 860 - j, SUNNY, 1, S.mood, S.t, S.look);
      chick(ctx, 480 - shiver, 860 - (w > 1.05 ? hop(w - 1.05, 7, 30) : 0), VIOLET, -1, w >= 0 || S.lines[0] ? 'happy' : 'wait', S.t + 1.3, S.look);
    },
  },
  // 19 -------- a kite and its string
  {
    bg: SKY, notes: [587, 740, 880, 1175],
    parts: [{ target: loop([[500, 330], [590, 450], [500, 570], [410, 450]]), closed: true }, { target: curve([[500, 572], [440, 680], [330, 760], [262, 882]]) }],
    cues: [[0.4, 700, 1.0, 'sine', 500], [1.6, 1319, 0.3, 'triangle', 0]],
    back: park,
    live(ctx, S) {
      const w = S.won, sx = w >= 0 ? Math.sin(w * 2.2) * 40 : 0, sy = w >= 0 ? Math.cos(w * 3) * 12 : 0;
      if (S.lines[1]) { const n = S.lines[1].length, str = S.lines[1].map((q, i) => [q[0] + sx * (1 - i / n), q[1] + sy * (1 - i / n)]); sticker(() => stick(ctx, str, 6, NAVY)); }
      if (S.lines[0]) {
        const kite = moved(S.lines[0], 0, 0, 1, sx, sy), [cx, cy] = centroid(kite), bottom = kite.reduce((a, q) => (q[1] > a[1] ? q : a));
        const tail = [0, 1, 2, 3].map((i) => [bottom[0] + 30 + i * 28 + Math.sin(S.t * 4 + i) * 10, bottom[1] + 20 + i * 34]); // the tail trails away from the string
        sticker(() => { stick(ctx, [bottom, ...tail], 5, NAVY); for (const q of tail) shape(ctx, [[q[0] - 14, q[1] - 10], [q[0] + 14, q[1] + 10], [q[0] + 14, q[1] - 10], [q[0] - 14, q[1] + 10]], CORAL); shape(ctx, kite, VIOLET); });
        ctx.strokeStyle = '#C9B6FF'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(cx, cy - 100); ctx.lineTo(cx, cy + 100); ctx.moveTo(cx - 80, cy); ctx.lineTo(cx + 80, cy); ctx.stroke();
        if (w >= 0) sticker(() => face(ctx, cx, cy, 36, 'happy', S.t, null));
      }
      chick(ctx, 300, 950 - (w > 1 ? hop(w - 1, 6, 20) : 0), SUNNY, 1, S.mood, S.t, S.look, w >= 0 ? -0.08 : 0);
    },
  },
  // 20 -------- the party: a table, then the cake
  {
    bg: LIGHT_SKY, notes: [523, 659, 784, 1047, 1319],
    parts: [{ target: [[200, 800], [520, 800]] }, { target: loop([[270, 786], [270, 650], [450, 650], [450, 786]]), closed: true }],
    cues: [[0.5, 1047, 0.15, 'triangle', 0], [0.7, 1319, 0.15, 'triangle', 0], [0.9, 1568, 0.3, 'triangle', 0], [2.0, 2093, 0.4, 'triangle', 0]],
    back: party,
    live(ctx, S) {
      const w = S.won;
      if (S.lines[0]) {
        const a = pointAt(S.lines[0], 0.15), b = pointAt(S.lines[0], 0.85);
        sticker(() => { stick(ctx, [a, [a[0], 900]], 18, ORANGE); stick(ctx, [b, [b[0], 900]], 18, ORANGE); S.part(ctx, 26, ORANGE, 0); });
      }
      if (S.lines[1]) {
        const cake = S.lines[1], top = Math.min(...cake.map((q) => q[1])), xs = cake.map((q) => q[0]), l = Math.min(...xs), r = Math.max(...xs);
        sticker(() => S.part(ctx, 0, BLUSH, 1));
        ctx.save(); ctx.beginPath(); ctx.moveTo(cake[0][0], cake[0][1]); for (const q of cake) ctx.lineTo(q[0], q[1]); ctx.closePath(); ctx.clip();
        ctx.fillStyle = WHITE; ctx.beginPath(); ctx.moveTo(l - 20, top - 20); ctx.lineTo(r + 20, top - 20);
        for (let x = r + 20; x >= l - 20; x -= 20) ctx.lineTo(x, top + 30 + Math.sin(x * 0.12) * 10);
        ctx.fill(); ctx.restore();
        if (w >= 0) {
          const lit = ease(w / 0.5);
          sticker(() => { for (let i = 0; i < 3; i++) { const x = l + (r - l) * (0.25 + i * 0.25); box(ctx, x - 8, top - 50, 16, 50, 6, [SKY, MINT, VIOLET][i]); blob(ctx, x, top - 64 + Math.sin(S.t * 12 + i) * 2, 9 * lit, 15 * lit, ORANGE); } });
        }
      }
      const j = w > 0.9 ? hop(w - 0.9, 7, 30) : 0;
      chick(ctx, 80, 900 - j, SUNNY, 1, S.mood, S.t, S.look);
      chick(ctx, 640, 900 - (w > 1 ? hop(w - 1, 7, 30) : 0), VIOLET, -1, w >= 0 ? 'happy' : 'wait', S.t + 1.3, S.look);
      if (w > 0.6) S.once('pop1', () => S.burst(200, 500, 40));
      if (w > 1.1) S.once('pop2', () => S.burst(520, 480, 40));
    },
  },
  // ======== chapter 5: Snowy Day ========
  // 21 -------- a scarf for a chilly snowman
  {
    bg: WINTER, target: curve([[263, 676], [306, 711], [360, 694], [414, 711], [457, 676]]), notes: [659, 784, 988, 1319],
    back(ctx) { winterScenery(ctx); },
    live(ctx, S) {
      const w = S.won, bob = w >= 0 ? Math.sin(w * 8) * 5 : Math.sin(S.t * 2) * 2;
      snowman(ctx, S.t, w >= 0, bob);
      if (S.lines[0]) sticker(() => S.part(ctx, 24, CORAL));
      if (w > 1.2) S.once('snowman', () => S.burst(360, 630, 28));
      winterLiveWeather(ctx, S);
    },
  },
  // 22 -------- a sled hill for a sliding penguin
  {
    bg: WINTER, target: curve([[150, 790], [255, 860], [370, 872], [495, 824], [610, 710]]), notes: [784, 659, 523, 1047],
    back(ctx) { winterScenery(ctx); pineTree(ctx, 350, 930, 0.82); },
    live(ctx, S) {
      const w = S.won, line = S.lines[0];
      if (line) sticker(() => S.part(ctx, 34, ICE));
      let p = [150, 790], rot = 0;
      if (w >= 0 && line) { const k = ease((w - 0.25) / 2.2); p = pointAt(line, k); const q = pointAt(line, Math.min(1, k + 0.025)); rot = Math.atan2(q[1] - p[1], q[0] - p[0]); }
      const bob = w >= 0 ? Math.abs(Math.sin(w * 10)) * 5 : 0;
      ctx.save(); ctx.translate(p[0], p[1] - 68 - bob); ctx.rotate(rot);
      sticker(() => { stick(ctx, [[-48, 0], [42, 0], [56, -8]], 12, CORAL); stick(ctx, [[-38, 10], [40, 10]], 6, WHITE); });
      penguin(ctx, 0, 0, 0, w >= 0); ctx.restore();
      if (w > 1.2) S.once('slide', () => S.burst(p[0], p[1], 24));
      winterLiveWeather(ctx, S);
    },
  },
  // 23 -------- a chimney so the cozy house can breathe smoke
  {
    bg: WINTER, target: [[518, 626], [518, 426]], notes: [523, 659, 784, 1175],
    back(ctx) {
      snowGround(ctx);
      sticker(() => { box(ctx, 175, 630, 370, 285, 28, '#F7B56B'); shape(ctx, [[145, 642], [360, 418], [575, 642]], CORAL); box(ctx, 310, 750, 100, 165, 14, '#A86B46'); box(ctx, 215, 690, 76, 76, 12, SKY); box(ctx, 430, 690, 76, 76, 12, SKY); });
      stick(ctx, [[150, 638], [360, 415], [570, 638]], 18, WHITE);
      sticker(() => { blob(ctx, 248, 723, 8, 8, SUNNY); blob(ctx, 468, 723, 8, 8, SUNNY); });
    },
    live(ctx, S) {
      const w = S.won, line = S.lines[0];
      if (line) {
        sticker(() => S.part(ctx, 34, ORANGE));
        const top = line.reduce((a, p) => p[1] < a[1] ? p : a);
        for (let i = 0; i < 3; i++) { const age = Math.max(0, w - 0.45 - i * 0.3), y = top[1] - age * 105; if (w > 0.4 && age < 1.5) { ctx.save(); ctx.globalAlpha = 1 - age / 1.5; sticker(() => blob(ctx, top[0] + Math.sin(age * 3 + i) * 16, y, 16 + age * 3, 22 + age * 4, WHITE)); ctx.restore(); } }
      }
      winterLiveWeather(ctx, S);
    },
  },
  // 24 -------- a string of lights between snowy trees
  {
    bg: WINTER, target: curve([[128, 565], [238, 634], [360, 654], [482, 632], [592, 565]]), notes: [659, 784, 988, 1319, 1568],
    back(ctx) { snowGround(ctx); pineTree(ctx, 112, 940, 1.18); pineTree(ctx, 608, 940, 1.18); pineTree(ctx, 360, 955, 0.7); },
    live(ctx, S) {
      const w = S.won, line = S.lines[0];
      if (line) {
        sticker(() => S.part(ctx, 9, NAVY));
        sticker(() => { const cs = [CORAL, SUNNY, SKY, VIOLET, MINT, ORANGE, CORAL]; for (let i = 0; i < 7; i++) { const p = pointAt(line, (i + 0.5) / 7), glow = w >= 0 ? 1 + Math.sin(w * 8 + i) * 0.16 : 1; stick(ctx, [p, [p[0], p[1] + 20]], 5, NAVY); blob(ctx, p[0], p[1] + 29, 13 * glow, 17 * glow, cs[i]); } });
      }
      winterLiveWeather(ctx, S);
    },
  },
  // 25 -------- a frozen pond line for a skating duck
  {
    bg: WINTER, target: curve([[160, 822], [260, 792], [390, 806], [535, 770]]), notes: [587, 740, 880, 1175, 1568],
    back(ctx) {
      snowGround(ctx);
      ctx.fillStyle = '#8DE1F3'; ctx.beginPath(); ctx.ellipse(355, 910, 270, 155, 0, 0, 7); ctx.fill();
      ctx.strokeStyle = WHITE; ctx.lineWidth = 12; ctx.beginPath(); ctx.ellipse(355, 910, 270, 155, 0, 0, 7); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.58)'; for (const [x, y, r] of [[210, 890, 28], [430, 960, 36], [535, 865, 22]]) { ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.35, -0.15, 0, 7); ctx.fill(); }
    },
    live(ctx, S) {
      const w = S.won, line = S.lines[0]; if (line) sticker(() => S.part(ctx, 20, WHITE));
      let p = w >= 0 ? [160, 822] : [84, 1045], rot = 0; // waits clear of the start dot
      if (w >= 0 && line) { const k = ease((w - 0.2) / 2.2); p = pointAt(line, k); const q = pointAt(line, Math.min(1, k + 0.03)); rot = Math.atan2(q[1] - p[1], q[0] - p[0]); }
      chick(ctx, p[0], p[1] - 12, SUNNY, 1, w >= 0 ? 'happy' : S.mood, S.t, null, rot * 0.22);
      if (w > 1.5) { ctx.fillStyle = WHITE; for (let i = 0; i < 4; i++) { const q = pointAt(line || target, (w * 0.18 + i / 4) % 1); blob(ctx, q[0], q[1] + 15, 5, 5, WHITE); } }
      winterLiveWeather(ctx, S);
    },
  },
];
