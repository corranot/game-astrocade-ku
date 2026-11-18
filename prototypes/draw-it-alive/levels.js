// PROTOTYPE - NOT FOR PRODUCTION
/**
 * Levels. Each level is a scene with one part missing; the player draws it and the scene comes alive
 * using the player's own line.
 *   bg      background colour
 *   target  the hidden path the stroke is compared with (array of [x, y])
 *   closed  true when the part is a closed shape
 *   back(ctx)     everything that never moves; drawn once per level
 *   live(ctx, S)  everything that moves; drawn every frame
 * S = { t, won (-1, or seconds since solved), mood, look, stroke (the player's line once solved),
 *       part(ctx, width, color) draws that line as the missing part }
 */
import { sticker, blob, box, stick, shape, shadow, face, curve, circle, upTo, pointAt, pathLen,
  WHITE, MINT, SUNNY, CORAL, ORANGE, VIOLET, SKY, GRASS } from './art.js';

const clamp01 = (v) => Math.max(0, Math.min(1, v));
const ease = (k) => 1 - Math.pow(1 - clamp01(k), 3);
const hop = (s, speed, height) => Math.abs(Math.sin(s * speed)) * height;

/** A round chick standing with its feet on (x, y); dir is 1 facing right, -1 facing left. */
function chick(ctx, x0, y0, color, dir, mood, t, look) {
  const K = 1.3, x = 0, y = 0;
  if (look) look = [(look[0] - x0) / K, (look[1] - y0) / K];
  ctx.save(); ctx.translate(x0, y0); ctx.scale(K, K);
  shadow(ctx, x, y + 4, 46);
  sticker(() => {
    stick(ctx, [[x - 16, y - 12], [x - 16, y - 2]], 10, ORANGE); stick(ctx, [[x + 16, y - 12], [x + 16, y - 2]], 10, ORANGE);
    blob(ctx, x, y - 54, 50, 46, color);
    shape(ctx, [[x + dir * 44, y - 62], [x + dir * 74, y - 50], [x + dir * 44, y - 40]], ORANGE);
    blob(ctx, x - dir * 30, y - 46, 16, 22, color, dir * 0.5);
    face(ctx, x + dir * 12, y - 66, 34, mood, t, look);
  });
  ctx.restore();
}

export const LEVELS = [
  // 1 -------- a bridge for the chick: one short, level line
  {
    bg: SKY, target: [[290, 700], [430, 700]],
    back(ctx) {
      ctx.fillStyle = '#1FA2E6'; ctx.fillRect(0, 930, 720, 350);
      sticker(() => { blob(ctx, 150, 300, 70, 34, WHITE); blob(ctx, 210, 280, 56, 40, WHITE); blob(ctx, 560, 380, 60, 30, WHITE); });
      sticker(() => { box(ctx, -40, 700, 330, 700, 36, MINT); box(ctx, 430, 700, 330, 700, 36, MINT); });
    },
    live(ctx, S) {
      const w = S.won;
      sticker(() => S.part(ctx, 26, ORANGE));
      const cheer = w > 1.5 ? hop(w - 1.5, 8, 22) : 0;
      chick(ctx, 622, 700 - cheer, VIOLET, -1, w >= 0 ? 'happy' : 'wait', S.t + 1.3, null);
      let x = 170, y = 700 - (w < 0 ? hop(S.t, 2.2, 6) : 0);
      if (w >= 0) {
        // walk the player's own line, then on to the friend
        const road = [[170, 700], ...S.stroke, [425, 700]], k = ease((w - 0.35) / 1.1), p = pointAt(road, k);
        x = p[0]; y = p[1] - (k < 1 ? hop(k, 16, 24) : cheer);
      }
      chick(ctx, x, y, SUNNY, 1, S.mood, S.t, S.look);
    },
  },
  // 2 -------- a shell for the snail: one closed round shape
  {
    bg: MINT, closed: true, target: circle(250, 705, 100),
    back(ctx) {
      sticker(() => blob(ctx, 590, 290, 66, 66, SUNNY));
      sticker(() => box(ctx, -40, 850, 800, 500, 0, GRASS));
    },
    live(ctx, S) {
      const w = S.won, dx = w >= 0 ? ease((w - 0.5) / 2.2) * 190 : 0, x = 250 + dx;
      const bob = w >= 0 ? Math.sin(w * 9) * 0.05 : 0;
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
      const nod = w < 0 ? Math.sin(S.t * 2) * 6 : 0;
      sticker(() => {
        stick(ctx, [[x + 160, 668 + nod], [x + 146, 610 + nod]], 12, CORAL); stick(ctx, [[x + 196, 668 + nod], [x + 214, 612 + nod]], 12, CORAL);
        blob(ctx, x + 146, 606 + nod, 15, 15, CORAL); blob(ctx, x + 214, 608 + nod, 15, 15, CORAL);
        stick(ctx, [[x - 150, 822], [x + 110, 822], [x + 165, 780], [x + 176, 715 + nod]], 56, CORAL);
        blob(ctx, x + 178, 700 + nod, 48, 44, CORAL);
        face(ctx, x + 184, 694 + nod, 36, S.mood, S.t, S.look);
      });
    },
  },
  // 3 -------- water for the flower: a curve that joins two things
  {
    bg: SUNNY, target: curve([[318, 500], [420, 470], [505, 590], [548, 790]]),
    back(ctx) {
      sticker(() => box(ctx, -40, 1010, 800, 400, 0, MINT));
      sticker(() => { box(ctx, 478, 900, 140, 112, 20, CORAL); box(ctx, 462, 880, 172, 40, 16, '#E63E52'); });
      sticker(() => { box(ctx, 150, 640, 60, 372, 10, ORANGE); box(ctx, 70, 612, 220, 44, 16, ORANGE); });
    },
    live(ctx, S) {
      const w = S.won, grow = ease((w - 0.7) / 1.3), tip = w >= 0 ? 0.1 : Math.sin(S.t * 1.6) * 0.03;
      // the water is the player's line; drops run along it, and it runs dry once the flower is up
      const dry = w >= 0 ? ease((w - 2.1) / 0.6) : 0, wet = w >= 0 && dry < 1 ? upTo(S.stroke.slice().reverse(), 1 - dry).reverse() : null;
      if (wet && wet.length > 1) {
        sticker(() => stick(ctx, wet, 18, SKY));
        const len = pathLen(wet);
        sticker(() => { for (let i = 0; i < 4; i++) { const p = pointAt(wet, (w * 200 / Math.max(60, len) + i / 4) % 1); blob(ctx, p[0], p[1], 7, 7, WHITE); } });
      }
      // sprout, then stem and flower
      const top = 880 - 30 - 230 * grow;
      sticker(() => {
        stick(ctx, [[548, 884], [548, top]], 14, GRASS);
        blob(ctx, 574, 860 - 60 * grow, 24, 12, GRASS, -0.5);
        if (grow > 0.25) {
          const r = 38 * ease((grow - 0.25) / 0.6);
          for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2 + w * 0.6; blob(ctx, 548 + Math.cos(a) * r * 1.25, top + Math.sin(a) * r * 1.25, r, r, CORAL); }
          blob(ctx, 548, top, r * 1.05, r * 1.05, WHITE);
          if (r > 30) face(ctx, 548, top - 6, 30, 'happy', S.t, null);
        }
      });
      // the watering can tips forward when the water flows
      shadow(ctx, 175, 1012, 120);
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
];
