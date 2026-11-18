// PROTOTYPE - NOT FOR PRODUCTION
/**
 * Levels. Each level is a scene with one part missing; the player draws it and the scene comes alive
 * using the player's own line.
 *   bg      background colour
 *   target  the hidden path the stroke is compared with (array of [x, y])
 *   closed  true when the part is a closed shape
 *   notes   the win jingle, as frequencies
 *   cues    sounds during the payoff: [seconds after the win, frequency, length, wave, pitch slide]
 *   back(ctx)     everything that never moves; drawn once per level
 *   live(ctx, S)  everything that moves; drawn every frame
 * S = { t, won (-1, or seconds since solved), mood, look, stroke (the player's line once solved),
 *       part(ctx, width, color) draws that line as the missing part,
 *       once(key, fn) runs fn a single time, burst(x, y, n) throws confetti,
 *       art(i) the line the player drew for level i earlier, or null }
 */
import { sticker, blob, box, stick, shape, shadow, face, heart, tuft, bloom, dots, curve, circle, upTo, pointAt, pathLen,
  WHITE, MINT, SUNNY, CORAL, ORANGE, VIOLET, SKY, GRASS } from './art.js';

const clamp01 = (v) => Math.max(0, Math.min(1, v));
const ease = (k) => 1 - Math.pow(1 - clamp01(k), 3);
const hop = (s, speed, height) => Math.abs(Math.sin(s * speed)) * height;

/** A round chick standing with its feet on (x0, y0); dir is 1 facing right, -1 facing left; lean tips it forward. */
function chick(ctx, x0, y0, color, dir, mood, t, look, lean = 0) {
  const K = 1.3, x = 0, y = 0;
  if (look) look = [(look[0] - x0) / K, (look[1] - y0) / K];
  ctx.save(); ctx.translate(x0, y0); ctx.scale(K, K);
  shadow(ctx, x, y + 4, 46);
  ctx.rotate(lean);
  sticker(() => {
    stick(ctx, [[x - 16, y - 12], [x - 16, y - 2]], 10, ORANGE); stick(ctx, [[x + 16, y - 12], [x + 16, y - 2]], 10, ORANGE);
    blob(ctx, x, y - 54, 50, 46, color);
    shape(ctx, [[x + dir * 44, y - 62], [x + dir * 74, y - 50], [x + dir * 44, y - 40]], ORANGE);
    blob(ctx, x - dir * 30, y - 46, 16, 22, color, dir * 0.5);
    face(ctx, x + dir * 12, y - 66, 34, mood, t, look);
  });
  ctx.restore();
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

export const LEVELS = [
  // 1 -------- a bridge for the chick: one short, level line
  {
    bg: SKY, target: [[290, 700], [430, 700]], notes: [523, 659, 784, 1047],
    cues: [[1.6, 1500, 0.07, 'sine', 300], [1.75, 1700, 0.07, 'sine', 300], [1.95, 1500, 0.07, 'sine', 300]],
    back(ctx) {
      dots(ctx);
      ctx.fillStyle = '#1FA2E6'; ctx.fillRect(0, 930, 720, 350);
      sticker(() => blob(ctx, 636, 420, 54, 54, SUNNY));
      sticker(() => { blob(ctx, 150, 330, 70, 34, WHITE); blob(ctx, 210, 310, 56, 40, WHITE); blob(ctx, 440, 470, 60, 30, WHITE); });
      sticker(() => { box(ctx, -40, 700, 330, 700, 36, MINT); box(ctx, 430, 700, 330, 700, 36, MINT); });
      ctx.fillStyle = 'rgba(255,255,255,0.22)';
      for (const [x, y, r] of [[90, 820, 34], [210, 960, 22], [140, 1130, 40], [520, 880, 26], [640, 1010, 38], [560, 1170, 24]]) { ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.7, 0, 0, 7); ctx.fill(); }
      sticker(() => { tuft(ctx, 40, 700, GRASS); tuft(ctx, 262, 700, GRASS); tuft(ctx, 468, 700, GRASS); tuft(ctx, 700, 700, GRASS); });
    },
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
    bg: MINT, closed: true, target: circle(250, 705, 100), notes: [392, 523, 659, 880],
    cues: [[0.55, 240, 1.5, 'sine', 420]],
    back(ctx) {
      dots(ctx);
      sticker(() => blob(ctx, 610, 430, 62, 62, SUNNY));
      sticker(() => { blob(ctx, 140, 380, 64, 30, WHITE); blob(ctx, 196, 362, 50, 36, WHITE); });
      sticker(() => box(ctx, -40, 850, 800, 500, 0, GRASS));
      ctx.fillStyle = 'rgba(255,255,255,0.14)';
      for (const [x, y, r] of [[120, 1010, 60], [470, 1120, 80], [640, 960, 44]]) { ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.4, 0, 0, 7); ctx.fill(); }
      sticker(() => { tuft(ctx, 50, 850, MINT); tuft(ctx, 560, 850, MINT); tuft(ctx, 680, 850, MINT); });
      sticker(() => { bloom(ctx, 110, 935, 15, SUNNY); bloom(ctx, 610, 1060, 18, ORANGE); bloom(ctx, 330, 1150, 16, SUNNY); });
    },
    live(ctx, S) {
      const w = S.won, dx = w >= 0 ? ease((w - 0.5) / 2.2) * 190 : 0, x = 250 + dx;
      const bob = w >= 0 ? Math.sin(w * 9) * 0.05 : 0;
      if (dx > 4) { ctx.save(); ctx.globalAlpha = 0.55; ctx.lineCap = 'round'; ctx.strokeStyle = '#A8F5D6'; ctx.lineWidth = 16; ctx.beginPath(); ctx.moveTo(100, 850); ctx.lineTo(100 + dx, 850); ctx.stroke(); ctx.restore(); }
      shadow(ctx, x + 10, 852, 170);
      if (w >= 0) {
        ctx.save(); ctx.translate(x, 705); ctx.rotate(bob); ctx.translate(-250, -705);
        sticker(() => S.part(ctx, 24, VIOLET));
        // the spiral grows inside the shell the player drew
        const turns = [];
        for (let i = 0; i <= 40; i++) { const a = i / 40 * Math.PI * 4, r = 62 * (1 - i / 44); turns.push([250 + Math.cos(a) * r, 705 + Math.sin(a) * r]); }
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
    bg: SUNNY, target: curve([[318, 500], [420, 470], [505, 590], [548, 790]]), notes: [587, 740, 880, 1175],
    cues: [[0.2, 1900, 0.05, 'sine', -500], [0.45, 2100, 0.05, 'sine', -500], [0.7, 1800, 0.05, 'sine', -500], [0.95, 2000, 0.05, 'sine', -500], [1.2, 1900, 0.05, 'sine', -500], [2.0, 1319, 0.5, 'triangle', 0]],
    back(ctx) {
      ctx.fillStyle = '#FFE27A'; ctx.beginPath(); ctx.arc(540, 430, 250, 0, 7); ctx.fill();
      dots(ctx);
      sticker(() => box(ctx, -40, 1010, 800, 400, 0, MINT));
      ctx.fillStyle = 'rgba(255,255,255,0.2)';
      for (const [x, y, r] of [[330, 1120, 70], [620, 1200, 50], [90, 1210, 44]]) { ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.4, 0, 0, 7); ctx.fill(); }
      sticker(() => { tuft(ctx, 330, 1010, GRASS); tuft(ctx, 690, 1010, GRASS); tuft(ctx, 20, 1010, GRASS); });
      sticker(() => { box(ctx, 478, 900, 140, 112, 20, CORAL); box(ctx, 462, 880, 172, 40, 16, '#E63E52'); });
      sticker(() => { box(ctx, 150, 640, 60, 372, 10, ORANGE); box(ctx, 70, 612, 220, 44, 16, ORANGE); });
    },
    live(ctx, S) {
      const w = S.won, grow = ease((w - 0.7) / 1.3), tip = w >= 0 ? 0.1 : Math.sin(S.t * 1.6) * 0.03 + (S.mood === 'draw' ? 0.06 : 0);
      // the water is the player's line; drops run along it, and it runs dry once the flower is up
      const dry = w >= 0 ? ease((w - 2.1) / 0.6) : 0, wet = w >= 0 && dry < 1 ? upTo(S.stroke.slice().reverse(), 1 - dry).reverse() : null;
      if (wet && wet.length > 1) {
        sticker(() => stick(ctx, wet, 18, SKY));
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
      // the watering can tips forward when the water flows
      shadow(ctx, 180, 1012, 120);
      ctx.save(); ctx.translate(180, 540); ctx.rotate(tip); ctx.translate(-180, -540);
      sticker(() => {
        stick(ctx, [[110, 490], [62, 520], [70, 580], [112, 596]], 18, VIOLET);
        stick(ctx, [[250, 560], [318, 500]], 26, VIOLET);
        box(ctx, 100, 470, 160, 140, 28, VIOLET);
        face(ctx, 180, 532, 40, S.mood, S.t, S.look);
      });
      ctx.restore();
    },
  },
  // 4 -------- a rainbow over the chicks: one big arc
  {
    bg: SKY, target: curve([[130, 660], [190, 470], [360, 390], [530, 470], [590, 660]]), notes: [523, 659, 784, 988],
    cues: [[0.9, 1500, 0.07, 'sine', 300], [1.05, 1700, 0.07, 'sine', 300], [1.6, 1319, 0.4, 'triangle', 0]],
    back(ctx) {
      dots(ctx);
      sticker(() => box(ctx, -40, 860, 800, 500, 0, MINT));
      ctx.fillStyle = 'rgba(255,255,255,0.22)';
      for (const [x, y, r] of [[120, 980, 50], [520, 1090, 70], [300, 1190, 40]]) { ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.45, 0, 0, 7); ctx.fill(); }
      sticker(() => { tuft(ctx, 60, 860, GRASS); tuft(ctx, 650, 860, GRASS); tuft(ctx, 360, 860, GRASS); });
      sticker(() => { bloom(ctx, 150, 1060, 16, SUNNY); bloom(ctx, 600, 960, 15, CORAL); });
    },
    live(ctx, S) {
      const w = S.won, clear = w >= 0 ? ease(w / 1.2) : 0;
      // the sun comes out as the cloud drifts off
      if (clear > 0) sticker(() => blob(ctx, 110, 330 + (1 - clear) * 120, 62 * clear, 62 * clear, SUNNY));
      if (w >= 0) {
        // the player's line, three colours wide
        sticker(() => stick(ctx, S.stroke, 54, CORAL));
        ctx.lineCap = ctx.lineJoin = 'round';
        for (const [wd, c] of [[36, SUNNY], [18, VIOLET]]) { ctx.strokeStyle = c; ctx.lineWidth = wd; ctx.beginPath(); ctx.moveTo(S.stroke[0][0], S.stroke[0][1]); for (const p of S.stroke) ctx.lineTo(p[0], p[1]); ctx.stroke(); }
      }
      const cx = 330 + clear * 520;
      if (clear < 1) {
        ctx.fillStyle = '#1FA2E6';
        for (let i = 0; i < 9; i++) { const y = (S.t * 520 + i * 97) % 440, x = cx - 150 + i * 38; ctx.globalAlpha = 1 - clear; ctx.fillRect(x, 330 + y, 8, 30); }
        ctx.globalAlpha = 1;
      }
      sticker(() => { blob(ctx, cx - 70, 290, 90, 50, WHITE); blob(ctx, cx + 30, 262, 96, 66, WHITE); blob(ctx, cx + 120, 296, 70, 44, WHITE); face(ctx, cx + 20, 280, 44, w >= 0 ? 'happy' : 'sad', S.t, null); });
      const j = w > 0.9 ? hop(w - 0.9, 7, 30) : 0, shiver = w < 0 ? Math.sin(S.t * 30) * 2 : 0;
      chick(ctx, 250 + shiver, 860 - j, SUNNY, 1, S.mood, S.t, S.look);
      chick(ctx, 480 - shiver, 860 - (w > 1.05 ? hop(w - 1.05, 7, 30) : 0), VIOLET, -1, w >= 0 ? 'happy' : 'wait', S.t + 1.3, S.look);
    },
  },
  // 5 -------- a ramp for the snail, who wears the shell the player drew: one sloping line
  {
    bg: MINT, target: [[300, 846], [470, 600]], notes: [392, 523, 659, 784, 1047],
    cues: [[0.5, 260, 1.6, 'sine', 500], [2.5, 1319, 0.12, 'triangle', 0], [2.65, 1568, 0.3, 'triangle', 0]],
    back(ctx) {
      dots(ctx);
      sticker(() => blob(ctx, 130, 300, 62, 62, SUNNY));
      sticker(() => box(ctx, -40, 850, 800, 500, 0, GRASS));
      sticker(() => box(ctx, 470, 600, 330, 300, 30, '#8A6BFF'));
      ctx.fillStyle = 'rgba(255,255,255,0.16)';
      for (const [x, y, r] of [[560, 720, 40], [660, 800, 30], [150, 1010, 60], [450, 1140, 70]]) { ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.5, 0, 0, 7); ctx.fill(); }
      sticker(() => { tuft(ctx, 40, 850, MINT); tuft(ctx, 250, 850, MINT); tuft(ctx, 690, 600, MINT); });
      sticker(() => { bloom(ctx, 90, 950, 15, SUNNY); bloom(ctx, 330, 1080, 17, ORANGE); });
    },
    live(ctx, S) {
      const w = S.won;
      sticker(() => S.part(ctx, 26, ORANGE));
      // the strawberry on the rock, eaten at the end
      const left = w > 2.5 ? 1 - ease((w - 2.5) / 0.4) : 1, bobble = Math.sin(S.t * 3) * 3;
      if (left > 0.02) sticker(() => { blob(ctx, 620, 560 + bobble, 34 * left, 40 * left, CORAL); shape(ctx, [[604, 524 + bobble], [620, 506 + bobble], [636, 524 + bobble]].map((p) => [620 + (p[0] - 620) * left, p[1]]), GRASS); });
      // the snail crawls to the ramp, up the player's line and on to the berry
      let p = [150, 850], rot = 0;
      if (w >= 0) {
        const road = [[150, 850], [280, 850], ...S.stroke, [560, 600]], k = ease((w - 0.4) / 2.2);
        p = pointAt(road, k); const q = pointAt(road, Math.min(1, k + 0.03)); rot = k < 1 ? Math.atan2(q[1] - p[1], q[0] - p[0]) : 0;
      }
      const shell = S.art(1) || circle(250, 705, 100);
      shadow(ctx, p[0], p[1] + 2, 90);
      ctx.save(); ctx.translate(p[0], p[1]); ctx.rotate(rot); ctx.scale(0.55, 0.55);
      ctx.save(); ctx.translate(-280, -850); sticker(() => shape(ctx, shell, VIOLET)); ctx.restore();
      snail(ctx, S.mood, S.t, null, w < 0 ? Math.sin(S.t * 2) * 6 : hop(w, 6, 5), S.mood === 'draw' ? -14 : 0);
      ctx.restore();
    },
  },
];
