// PROTOTYPE - NOT FOR PRODUCTION
/**
 * Module 1: procedural art bakery. Every picture in the game is drawn here by code, once, onto offscreen
 * canvases (SpriteBaker); the frame loop only moves baked images. Storybook velvet and satin enamel look:
 * multi-stop satin gradients, a soft rim light on top, feathered contact shadows and a paper-grain pass.
 * No pure white and no neon anywhere: the brightest colour is Cream Alabaster.
 */
import { W, H, VIEW, LAYOUT, makeRng } from './m0-orchestrator.js';

/** The seven palette colours (plan section 5). */
export const PAL = { cream: '#F5EFE4', plum: '#231F3A', gold: '#E6A83A', teal: '#1B7F79', coral: '#DF6458', sage: '#4D8B6F', lav: '#8E7CC3', velvet: '#1A162E' };

function hex(c) { const n = parseInt(c.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
/** Mix two hex colours; t = 0 gives a. */
export function mix(a, b, t) { const A = hex(a), B = hex(b); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join(''); }
/** Colour with alpha. */
export function rgba(c, a) { const [r, g, b] = hex(c); return `rgba(${r},${g},${b},${a})`; }
const light = (c, t) => mix(c, PAL.cream, t);
const dark = (c, t) => mix(c, PAL.plum, t);

/** A canvas of w x h logical px drawn at scale s. */
function mk(w, h, s) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.ceil(w * s)); c.height = Math.max(1, Math.ceil(h * s));
  const g = c.getContext('2d'); g.setTransform(s, 0, 0, s, 0, 0);
  return { c, g, w, h };
}
/** Sprite record: canvas plus its logical size and anchor (ax, ay in 0..1). */
function sprite(w, h, s, ax, ay, draw) { const o = mk(w, h, s); draw(o.g, w, h); return { img: o.c, w, h, ax, ay }; }

/** Draw a sprite at x, y (its anchor) with optional scale, rotation and alpha. */
export function put(ctx, sp, x, y, sx = 1, sy = sx, rot = 0, alpha = 1) {
  if (!sp) return;
  if (alpha <= 0) return;
  const a0 = ctx.globalAlpha; if (alpha !== 1) ctx.globalAlpha = a0 * alpha;
  if (rot === 0 && sx === 1 && sy === 1) ctx.drawImage(sp.img, x - sp.w * sp.ax, y - sp.h * sp.ay, sp.w, sp.h);
  else { ctx.save(); ctx.translate(x, y); if (rot) ctx.rotate(rot); ctx.scale(sx, sy); ctx.drawImage(sp.img, -sp.w * sp.ax, -sp.h * sp.ay, sp.w, sp.h); ctx.restore(); }
  if (alpha !== 1) ctx.globalAlpha = a0;
}

// ---------- satin helpers ----------
/** Vertical satin gradient for a shape spanning y0..y1: rim light, body colour, shadowed base. */
function satin(g, y0, y1, base) {
  const gr = g.createLinearGradient(0, y0, 0, y1);
  gr.addColorStop(0, light(base, 0.42)); gr.addColorStop(0.28, light(base, 0.12)); gr.addColorStop(0.7, base); gr.addColorStop(1, dark(base, 0.32));
  return gr;
}
/** Radial satin for round things: highlight up-left. */
function satinR(g, x, y, r, base) {
  const gr = g.createRadialGradient(x - r * 0.35, y - r * 0.45, r * 0.08, x, y, r * 1.05);
  gr.addColorStop(0, light(base, 0.55)); gr.addColorStop(0.35, light(base, 0.15)); gr.addColorStop(0.8, base); gr.addColorStop(1, dark(base, 0.35));
  return gr;
}
/** Soft rim highlight along the top of an ellipse. */
function rim(g, x, y, rx, ry, a = 0.55) { g.save(); g.strokeStyle = rgba(PAL.cream, a); g.lineWidth = Math.max(1.5, rx * 0.08); g.lineCap = 'round'; g.beginPath(); g.ellipse(x, y, rx * 0.78, ry * 0.78, 0, Math.PI * 1.15, Math.PI * 1.7); g.stroke(); g.restore(); }
/** Feathered elliptical contact shadow. */
function shadow(g, x, y, rx, ry, a = 0.32) { const gr = g.createRadialGradient(x, y, 0, x, y, rx); gr.addColorStop(0, rgba(PAL.plum, a)); gr.addColorStop(1, rgba(PAL.plum, 0)); g.save(); g.translate(x, y); g.scale(1, ry / rx); g.translate(-x, -y); g.fillStyle = gr; g.beginPath(); g.arc(x, y, rx, 0, Math.PI * 2); g.fill(); g.restore(); }
function outline(g, w = 3, c = dark(PAL.plum, 0)) { g.lineWidth = w; g.strokeStyle = rgba(c, 0.55); g.lineJoin = 'round'; g.stroke(); }
function ell(g, x, y, rx, ry) { g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); }

// ---------- world palettes ----------
/** Extra daylight colours for the sunny meadow (sky, lush leaf greens, petal pink). */
export const SUN = { skyTop: '#3E9FDC', skyMid: '#7FC9EE', skyLow: '#C4E8F2', haze: '#FFEFD0', leaf: '#7DC35A', leafDeep: '#3E8F55', moss: '#A4D96A', pink: '#F28DAE', sand: '#E9C891', rock: '#B98E74', water: '#7FD3E8' };
const WORLDS = [
  { sky: [SUN.skyTop, SUN.skyMid, SUN.skyLow, SUN.haze], sun: '#FFF3C8', far: '#9CD27A', hillA: '#79BFA0', hillB: '#55A866', top: '#86C85A', flowers: [PAL.coral, PAL.gold, PAL.lav, SUN.pink] },
];

// ---------- background layers ----------
function bakeSky(s, wp) {
  return sprite(W, 760, s, 0, 0, (g) => {
    const gr = g.createLinearGradient(0, 0, 0, 760);
    gr.addColorStop(0, wp.sky[0]); gr.addColorStop(0.42, wp.sky[1]); gr.addColorStop(0.75, wp.sky[2]); gr.addColorStop(1, wp.sky[3]);
    g.fillStyle = gr; g.fillRect(0, 0, W, 760);
    const sun = g.createRadialGradient(560, 210, 10, 560, 210, 360); sun.addColorStop(0, rgba(wp.sun, 1)); sun.addColorStop(0.18, rgba(wp.sun, 0.6)); sun.addColorStop(0.5, rgba(wp.sun, 0.16)); sun.addColorStop(1, rgba(wp.sun, 0));
    g.fillStyle = sun; g.fillRect(0, 0, W, 760);
    g.fillStyle = '#FFF8DE'; ell(g, 560, 210, 52, 52); g.fill();
    // a soft cumulus bank along the horizon, warm-lit on top
    const rng = makeRng(41);
    for (let i = 0; i < 26; i++) { const x = i * 30 - 20 + rng() * 20, y = 380 + rng() * 30, r = 30 + rng() * 34; const gr = g.createRadialGradient(x - r * 0.2, y - r * 0.5, r * 0.1, x, y, r); gr.addColorStop(0, rgba('#FFFDF4', 0.95)); gr.addColorStop(0.65, rgba('#E4F3FA', 0.85)); gr.addColorStop(1, rgba('#CFE9F5', 0)); g.fillStyle = gr; ell(g, x, y, r, r * 0.8); g.fill(); }
  });
}
function bakeCloud(s, seed, w, h) {
  const rng = makeRng(seed);
  return sprite(w, h, s, 0.5, 0.5, (g) => {
    const puffs = [];
    for (let i = 0; i < 9; i++) { const t = i / 8; puffs.push([w * (0.12 + 0.76 * t) + (rng() - 0.5) * 20, h * 0.62 - Math.sin(t * Math.PI) * h * 0.28 + (rng() - 0.5) * 10, h * (0.2 + 0.18 * Math.sin(t * Math.PI)) + rng() * 8]); }
    for (const [x, y, r] of puffs) { const gr = g.createRadialGradient(x - r * 0.2, y - r * 0.5, r * 0.1, x, y, r); gr.addColorStop(0, rgba('#FFFEF8', 1)); gr.addColorStop(0.62, rgba('#E2F1FA', 0.96)); gr.addColorStop(1, rgba('#B9DDF0', 0)); g.fillStyle = gr; ell(g, x, y, r, r); g.fill(); }
  });
}
/** A floating island in the sky: layered sandstone underside with roots and vines, a lush cap with round trees,
 *  an optional cottage and a waterfall pouring off one edge. haze (0..1) fades it toward the sky for depth. */
function bakeFarIsland(s, seed, w, color, haze = 0, house = false) {
  const rng = makeRng(seed), h = w * 0.9, top = h * 0.34;
  const fog = (c) => mix(c, SUN.skyLow, haze);
  return sprite(w, h, s, 0.5, 0.3, (g) => {
    // underside: three sandstone strata tapering to a point
    const under = () => { g.beginPath(); g.moveTo(w * 0.05, top); g.quadraticCurveTo(w * 0.16, h * 0.6, w * 0.42, h * 0.94); g.quadraticCurveTo(w * 0.5, h * 1.0, w * 0.6, h * 0.9); g.quadraticCurveTo(w * 0.84, h * 0.58, w * 0.95, top); g.closePath(); };
    under(); const gr = g.createLinearGradient(0, top, 0, h); gr.addColorStop(0, fog(SUN.sand)); gr.addColorStop(0.45, fog(SUN.rock)); gr.addColorStop(1, fog(mix(SUN.rock, PAL.plum, 0.35))); g.fillStyle = gr; g.fill();
    g.save(); under(); g.clip();
    for (let k = 1; k < 4; k++) { g.fillStyle = rgba(fog(mix(SUN.rock, PAL.plum, 0.25)), 0.35); g.beginPath(); const yy = top + k * h * 0.13; g.moveTo(0, yy); for (let x = 0; x <= w; x += w / 10) g.lineTo(x, yy + Math.sin(x * 0.07 + k + seed) * 4 + rng() * 3); g.lineTo(w, yy + 6); g.lineTo(0, yy + 6); g.fill(); }
    g.fillStyle = rgba('#FFFFFF', 0.18); g.fillRect(0, top, w * 0.5, h);
    g.restore();
    // hanging roots and vines
    g.lineCap = 'round';
    for (let i = 0; i < 6; i++) { const x = w * (0.18 + rng() * 0.64), l = h * (0.12 + rng() * 0.22); g.strokeStyle = rgba(fog(SUN.leafDeep), 0.8); g.lineWidth = Math.max(1.5, w * 0.012); g.beginPath(); g.moveTo(x, top + 4); g.quadraticCurveTo(x + (rng() - 0.5) * 14, top + l * 0.6, x + (rng() - 0.5) * 8, top + l); g.stroke(); g.fillStyle = fog(SUN.leaf); ell(g, x, top + l, 3, 3); g.fill(); }
    // lush cap
    g.beginPath(); g.moveTo(w * 0.02, top + 6);
    for (let i = 0; i <= 14; i++) { const x = w * (0.02 + 0.96 * i / 14); g.lineTo(x, top - Math.sin(i / 14 * Math.PI) * h * 0.08 - rng() * 3); }
    g.lineTo(w * 0.98, top + 8); g.quadraticCurveTo(w * 0.5, top + 18, w * 0.02, top + 6); g.closePath();
    const cap = g.createLinearGradient(0, top - h * 0.1, 0, top + 14); cap.addColorStop(0, fog(light(color, 0.35))); cap.addColorStop(1, fog(mix(color, SUN.leafDeep, 0.3))); g.fillStyle = cap; g.fill();
    g.strokeStyle = rgba(fog(SUN.leafDeep), 0.5); g.lineWidth = 2; g.stroke();
    // round trees and a cottage
    const trees = 3 + (rng() * 3 | 0);
    for (let i = 0; i < trees; i++) {
      const x = w * (0.14 + 0.72 * (i + rng() * 0.6) / trees), r = w * (0.05 + rng() * 0.035), y = top - h * 0.06 - r * 0.6;
      g.fillStyle = fog(mix(SUN.rock, PAL.plum, 0.3)); g.fillRect(x - r * 0.15, y, r * 0.3, r * 1.1);
      const tg = g.createRadialGradient(x - r * 0.4, y - r * 0.5, r * 0.1, x, y, r * 1.1); tg.addColorStop(0, fog(light(SUN.leaf, 0.35))); tg.addColorStop(1, fog(SUN.leafDeep)); g.fillStyle = tg; ell(g, x, y, r, r * 0.95); g.fill();
    }
    if (house) {
      const x = w * 0.62, y = top - h * 0.05, hw = w * 0.12;
      g.fillStyle = fog(PAL.cream); g.fillRect(x - hw / 2, y - hw * 0.7, hw, hw * 0.7);
      g.fillStyle = fog(PAL.coral); g.beginPath(); g.moveTo(x - hw * 0.65, y - hw * 0.66); g.lineTo(x, y - hw * 1.25); g.lineTo(x + hw * 0.65, y - hw * 0.66); g.closePath(); g.fill();
      g.fillStyle = fog(PAL.gold); g.fillRect(x - hw * 0.12, y - hw * 0.45, hw * 0.24, hw * 0.24);
    }
    // waterfall off the right lip
    const wx = w * 0.8, wy = top + 4, wl = h * 0.62;
    const wg = g.createLinearGradient(0, wy, 0, wy + wl); wg.addColorStop(0, rgba(fog('#E9FAFF'), 0.95)); wg.addColorStop(0.7, rgba(fog(SUN.water), 0.55)); wg.addColorStop(1, rgba(fog(SUN.water), 0));
    g.fillStyle = wg; g.beginPath(); g.moveTo(wx - w * 0.02, wy); g.lineTo(wx + w * 0.025, wy); g.lineTo(wx + w * 0.05, wy + wl); g.lineTo(wx - w * 0.035, wy + wl); g.closePath(); g.fill();
  });
}
function bakeHills(s, wp) {
  return sprite(W, 660, s, 0, 0, (g) => {
    const band = (y0, amp, freq, ph, c, alpha) => {
      g.beginPath(); g.moveTo(0, 660); g.lineTo(0, y0);
      for (let x = 0; x <= W; x += 12) g.lineTo(x, y0 - Math.sin(x * freq + ph) * amp - Math.sin(x * freq * 2.3 + ph * 1.7) * amp * 0.35);
      g.lineTo(W, 660); g.closePath();
      const gr = g.createLinearGradient(0, y0 - amp, 0, 660); gr.addColorStop(0, rgba(light(c, 0.3), alpha)); gr.addColorStop(0.25, rgba(c, alpha)); gr.addColorStop(1, rgba(dark(c, 0.25), alpha)); g.fillStyle = gr; g.fill();
    };
    band(110, 34, 0.009, 0.4, light(wp.hillA, 0.15), 0.9);
    band(160, 26, 0.012, 2.1, mix(wp.hillA, wp.hillB, 0.5), 1);
    band(205, 18, 0.016, 4.0, wp.hillB, 1);
    const rng = makeRng(31);
    const tree = (x, y, r, c) => { g.fillStyle = dark(c, 0.3); g.fillRect(x - r * 0.12, y, r * 0.24, r * 0.9); const tg = g.createRadialGradient(x - r * 0.35, y - r * 0.5, r * 0.1, x, y, r * 1.1); tg.addColorStop(0, light(c, 0.35)); tg.addColorStop(1, dark(c, 0.2)); g.fillStyle = tg; ell(g, x, y, r, r * 0.92); g.fill(); };
    for (let i = 0; i < 22; i++) { const x = rng() * W, y = 118 + rng() * 26; tree(x, y, 9 + rng() * 6, mix(wp.hillA, SUN.skyLow, 0.25)); }
    for (let i = 0; i < 18; i++) { const x = rng() * W, y = 168 + rng() * 22; tree(x, y, 12 + rng() * 7, mix(wp.hillA, wp.hillB, 0.5)); }
    for (let i = 0; i < 50; i++) { const x = rng() * W, y = 200 + rng() * 50; g.fillStyle = rgba(wp.flowers[i % 4], 0.85); ell(g, x, y, 2.5, 2.5); g.fill(); }
  });
}
/** Grass tuft strip: many satin blades, drawn swaying per strip at run time. */
function bakeGrass(s, seed, color) {
  const rng = makeRng(seed);
  return sprite(150, 44, s, 0.5, 1, (g) => {
    for (let i = 0; i < 26; i++) {
      const x = 6 + rng() * 138, hgt = 16 + rng() * 26, lean = (rng() - 0.5) * 12;
      const gr = g.createLinearGradient(0, 44 - hgt, 0, 44); gr.addColorStop(0, light(color, 0.35)); gr.addColorStop(1, dark(color, 0.2));
      g.fillStyle = gr; g.beginPath(); g.moveTo(x - 3, 44); g.quadraticCurveTo(x + lean * 0.3, 44 - hgt * 0.6, x + lean, 44 - hgt); g.quadraticCurveTo(x + lean * 0.5 + 1, 44 - hgt * 0.5, x + 3, 44); g.fill();
    }
  });
}
function bakeFlower(s, color) {
  return sprite(22, 30, s, 0.5, 1, (g) => {
    g.strokeStyle = dark(PAL.sage, 0.1); g.lineWidth = 2; g.beginPath(); g.moveTo(11, 30); g.quadraticCurveTo(9, 20, 11, 11); g.stroke();
    for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; g.fillStyle = satinR(g, 11 + Math.cos(a) * 4.5, 9 + Math.sin(a) * 4.5, 5, color); ell(g, 11 + Math.cos(a) * 4.5, 9 + Math.sin(a) * 4.5, 4.4, 4.4); g.fill(); }
    g.fillStyle = light(PAL.gold, 0.3); ell(g, 11, 9, 3, 3); g.fill();
  });
}
/** The main play terrace: meadow top, back hedge, carved stone trim with rune slots along the front. */
function bakeTerrace(s, wp) {
  const top = 400, front = 968;
  return sprite(W, 640, s, 0, 0, (g) => {
    const y = (v) => v - top, rng = makeRng(77);
    // underside earth (shows under the trim)
    { const ug = g.createLinearGradient(0, y(front), 0, y(1080)); ug.addColorStop(0, SUN.sand); ug.addColorStop(0.5, SUN.rock); ug.addColorStop(1, mix(SUN.rock, PAL.plum, 0.45)); g.fillStyle = ug; g.beginPath(); g.moveTo(10, y(front)); g.lineTo(710, y(front)); g.lineTo(690, y(1035)); g.quadraticCurveTo(360, y(1080), 30, y(1035)); g.closePath(); g.fill(); }
    // top face: narrower at the back for depth
    const face = () => { g.beginPath(); g.moveTo(40, y(452)); g.quadraticCurveTo(48, y(428), 96, y(426)); g.quadraticCurveTo(360, y(410), 624, y(426)); g.quadraticCurveTo(672, y(428), 680, y(452)); g.quadraticCurveTo(700, y(700), 712, y(front)); g.lineTo(8, y(front)); g.quadraticCurveTo(20, y(700), 40, y(452)); g.closePath(); };
    face();
    const gr = g.createLinearGradient(0, y(420), 0, y(front)); gr.addColorStop(0, light(wp.top, 0.22)); gr.addColorStop(0.5, wp.top); gr.addColorStop(1, dark(wp.top, 0.1)); g.fillStyle = gr; g.fill();
    g.save(); g.clip();
    // mown stripes
    g.globalAlpha = 0.06; g.fillStyle = PAL.cream; for (let i = -4; i < 12; i++) { g.beginPath(); g.moveTo(i * 90, y(front)); g.lineTo(i * 90 + 45, y(front)); g.lineTo(i * 90 + 245, y(410)); g.lineTo(i * 90 + 200, y(410)); g.fill(); }
    g.globalAlpha = 1;
    // warm light pool and darker edges for depth
    const pool = g.createRadialGradient(400, y(600), 30, 400, y(620), 460); pool.addColorStop(0, rgba(light(PAL.gold, 0.5), 0.3)); pool.addColorStop(1, rgba(PAL.gold, 0)); g.fillStyle = pool; g.fillRect(0, 0, W, 640);
    const edge = g.createLinearGradient(0, 0, W, 0); edge.addColorStop(0, rgba(PAL.teal, 0.28)); edge.addColorStop(0.12, rgba(PAL.teal, 0)); edge.addColorStop(0.88, rgba(PAL.teal, 0)); edge.addColorStop(1, rgba(PAL.teal, 0.28)); g.fillStyle = edge; g.fillRect(0, 0, W, 640);
    // a sandy path from the sling toward the back
    g.beginPath(); g.moveTo(300, y(front)); g.quadraticCurveTo(330, y(760), 352, y(560)); g.lineTo(368, y(560)); g.quadraticCurveTo(390, y(760), 420, y(front)); g.closePath();
    const path = g.createLinearGradient(0, y(560), 0, y(front)); path.addColorStop(0, rgba(mix(PAL.cream, PAL.gold, 0.35), 0)); path.addColorStop(1, rgba(mix(PAL.cream, PAL.gold, 0.35), 0.55)); g.fillStyle = path; g.fill();
    // clover patches, speckles, pebbles
    for (let i = 0; i < 26; i++) { const x = 40 + rng() * 640, yy = 470 + rng() * 480; for (let k = 0; k < 3; k++) { const a = k * 2.1 + rng(); g.fillStyle = rgba(light(wp.top, 0.3), 0.75); ell(g, x + Math.cos(a) * 5, y(yy) + Math.sin(a) * 4, 5, 4); g.fill(); } }
    for (let i = 0; i < 220; i++) { const x = rng() * W, yy = 440 + rng() * 520; g.fillStyle = rgba(rng() < 0.5 ? dark(wp.top, 0.25) : light(wp.top, 0.35), 0.35); ell(g, x, y(yy), 2 + rng() * 3, 1 + rng() * 1.5); g.fill(); }
    for (let i = 0; i < 14; i++) { const x = 50 + rng() * 620, yy = 480 + rng() * 460, r = 4 + rng() * 5; g.fillStyle = rgba(PAL.plum, 0.18); ell(g, x + 1, y(yy) + 2, r, r * 0.6); g.fill(); g.fillStyle = satinR(g, x, y(yy), r, mix(PAL.cream, PAL.lav, 0.3)); ell(g, x, y(yy), r, r * 0.65); g.fill(); }
    // stepping stones to the sling
    for (let i = 0; i < 4; i++) { const sx = 360 + Math.sin(i) * 16, sy = 952 - i * 30; g.fillStyle = rgba(PAL.plum, 0.14); ell(g, sx, y(sy + 3), 26 - i * 3, 8 - i); g.fill(); g.fillStyle = satin(g, y(sy - 8), y(sy + 8), PAL.cream); ell(g, sx, y(sy), 26 - i * 3, 8 - i); g.fill(); }
    // grass blades along both side edges
    for (let i = 0; i < 90; i++) {
      const side = i % 2, t = rng(), yy = 460 + t * 500, x = side ? 676 + t * 32 - rng() * 14 : 44 - t * 32 + rng() * 14, hgt = 10 + rng() * 16, lean = (side ? -1 : 1) * (2 + rng() * 6);
      g.fillStyle = rng() < 0.5 ? light(wp.top, 0.3) : dark(wp.top, 0.15); g.beginPath(); g.moveTo(x - 3, y(yy)); g.quadraticCurveTo(x + lean * 0.3, y(yy) - hgt * 0.6, x + lean, y(yy) - hgt); g.quadraticCurveTo(x + lean * 0.4, y(yy) - hgt * 0.4, x + 3, y(yy)); g.fill();
    }
    // painted grass texture: short directional strokes in two greens
    for (let i = 0; i < 420; i++) { const x = rng() * W, yy = 440 + rng() * 520, l = 5 + rng() * 7 * (yy - 400) / 560; g.strokeStyle = rgba(rng() < 0.55 ? light(wp.top, 0.4) : mix(wp.top, SUN.leafDeep, 0.45), 0.5); g.lineWidth = 1.6; g.beginPath(); g.moveTo(x, y(yy)); g.lineTo(x + (rng() - 0.5) * 3, y(yy) - l); g.stroke(); }
    // flower-dotted bushes hugging both side edges
    const bush = (x, yy, r) => { g.fillStyle = rgba(PAL.plum, 0.18); ell(g, x + 3, y(yy) + r * 0.55, r * 1.05, r * 0.32); g.fill(); for (const [dx, dy, k] of [[-r * 0.55, 0, 0.75], [r * 0.55, 0, 0.8], [0, -r * 0.35, 1]]) { g.fillStyle = satinR(g, x + dx, y(yy) + dy, r * k, mix(SUN.leaf, SUN.leafDeep, 0.25)); ell(g, x + dx, y(yy) + dy, r * k, r * k * 0.85); g.fill(); } for (let k = 0; k < 6; k++) { g.fillStyle = wp.flowers[(k + (x | 0)) % 4]; const a = rng() * 6.3, d = rng() * r * 0.8; ell(g, x + Math.cos(a) * d, y(yy) - r * 0.2 + Math.sin(a) * d * 0.5, 3.4, 3.4); g.fill(); g.fillStyle = PAL.cream; ell(g, x + Math.cos(a) * d, y(yy) - r * 0.2 + Math.sin(a) * d * 0.5, 1.2, 1.2); g.fill(); } };
    for (const [x, yy, r] of [[30, 500, 30], [58, 610, 26], [24, 720, 36], [40, 880, 40], [690, 520, 30], [664, 640, 28], [698, 760, 36], [676, 900, 40], [150, 452, 22], [570, 452, 22]]) bush(x, yy, r);
    g.restore();
    face(); g.lineWidth = 3; g.strokeStyle = rgba(dark(wp.top, 0.35), 0.5); g.stroke();
    // back hedge (the far edge the critter bounces on)
    for (let x = 40; x <= 680; x += 24) { const hy = y(436) - Math.sin(x * 0.05) * 3 - (x < 90 || x > 630 ? -6 : 0); g.fillStyle = satinR(g, x, hy, 20, mix(wp.hillB, PAL.teal, 0.3)); ell(g, x, hy, 20, 15); g.fill(); }
    for (let x = 52; x <= 668; x += 48) { g.fillStyle = rgba(wp.flowers[(x / 48 | 0) % 4], 0.9); ell(g, x, y(428) - Math.sin(x) * 3, 3.5, 3.5); g.fill(); }
    // carved stone trim along the front
    const ty = y(front - 6);
    g.fillStyle = satin(g, ty - 4, ty + 44, mix(PAL.cream, PAL.gold, 0.28)); g.beginPath(); if (g.roundRect) g.roundRect(4, ty, W - 8, 42, 14); else g.rect(4, ty, W - 8, 42); g.fill();
    g.strokeStyle = rgba(PAL.plum, 0.32); g.lineWidth = 2;
    for (let x = 48; x < W; x += 72) { g.beginPath(); g.moveTo(x, ty + 4); g.lineTo(x, ty + 38); g.stroke(); }
    g.strokeStyle = rgba(PAL.cream, 0.7); g.lineWidth = 2.5; g.beginPath(); g.moveTo(16, ty + 4); g.lineTo(W - 16, ty + 4); g.stroke();
    for (const rx of RUNE_X) { g.fillStyle = dark(PAL.teal, 0.25); runePath(g, rx, ty + 21, 11); g.fill(); }
  });
}
/** x positions of the trim runes, shared with the glow pass. */
export const RUNE_X = [84, 228, 492, 636];
export const RUNE_Y = LAYOUT.arenaBottom + 15;
function runePath(g, x, y, r) { g.beginPath(); g.moveTo(x, y - r); g.lineTo(x + r * 0.7, y); g.lineTo(x, y + r); g.lineTo(x - r * 0.7, y); g.closePath(); g.moveTo(x - r * 1.1, y); g.lineTo(x + r * 1.1, y); }

function bakeLeaf(s, flip, color) {
  return sprite(200, 300, s, flip ? 1 : 0, 1, (g) => {
    if (flip) { g.translate(200, 0); g.scale(-1, 1); }
    if ('filter' in g) g.filter = 'blur(3px)';
    for (let i = 0; i < 3; i++) {
      g.save(); g.translate(10 + i * 26, 300); g.rotate(-0.25 - i * 0.32);
      g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(70, -90, 0, -250 + i * 40); g.quadraticCurveTo(-60, -110, 0, 0);
      const gr = g.createLinearGradient(-40, 0, 60, 0); gr.addColorStop(0, dark(color, 0.25)); gr.addColorStop(0.5, color); gr.addColorStop(1, light(color, 0.25)); g.fillStyle = gr; g.fill();
      g.strokeStyle = rgba(light(color, 0.5), 0.6); g.lineWidth = 3; g.beginPath(); g.moveTo(0, -6); g.quadraticCurveTo(10, -120, 0, -235 + i * 40); g.stroke();
      g.restore();
    }
  });
}
function bakeGrain(s) {
  const o = mk(128, 128, 1), g = o.g, rng = makeRng(9), img = g.createImageData(128, 128);
  for (let i = 0; i < img.data.length; i += 4) { const v = rng() < 0.5 ? 0 : 255; img.data[i] = v ? 245 : 35; img.data[i + 1] = v ? 239 : 31; img.data[i + 2] = v ? 228 : 58; img.data[i + 3] = Math.floor(rng() * 255); }
  g.putImageData(img, 0, 0);
  g.globalAlpha = 0.5; g.strokeStyle = PAL.plum; g.lineWidth = 0.6;
  for (let i = 0; i < 40; i++) { const x = rng() * 128, y = rng() * 128, a = rng() * 6.3, l = 6 + rng() * 14; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke(); }
  return o.c;
}

// ---------- props ----------
function bakeMushroom(s, color) {
  return sprite(110, 110, s, 0.5, 0.62, (g) => {
    shadow(g, 55, 92, 40, 10);
    g.fillStyle = satin(g, 58, 96, PAL.cream); g.beginPath(); g.moveTo(42, 92); g.quadraticCurveTo(40, 66, 47, 58); g.lineTo(63, 58); g.quadraticCurveTo(70, 66, 68, 92); g.closePath(); g.fill(); outline(g, 2.5);
    g.beginPath(); g.moveTo(10, 62); g.bezierCurveTo(8, 18, 102, 18, 100, 62); g.quadraticCurveTo(55, 76, 10, 62); g.closePath();
    g.fillStyle = satin(g, 22, 72, color); g.fill(); outline(g, 3);
    g.save(); g.clip(); g.fillStyle = rgba(PAL.cream, 0.22); ell(g, 40, 34, 30, 12); g.fill(); g.restore();
    for (const [x, y, r] of [[34, 44, 7], [58, 33, 6], [78, 47, 8], [52, 54, 4.5]]) { g.fillStyle = satinR(g, x, y, r, PAL.cream); ell(g, x, y, r, r * 0.8); g.fill(); }
    rim(g, 55, 48, 44, 26, 0.6);
  });
}
function bakeGeode(s, crystal) {
  return sprite(110, 110, s, 0.5, 0.6, (g) => {
    shadow(g, 55, 94, 42, 11);
    g.beginPath(); g.moveTo(14, 88); g.quadraticCurveTo(6, 58, 26, 50); g.quadraticCurveTo(55, 40, 86, 50); g.quadraticCurveTo(104, 60, 96, 88); g.quadraticCurveTo(55, 100, 14, 88); g.closePath();
    g.fillStyle = satin(g, 44, 98, mix(PAL.lav, PAL.plum, 0.45)); g.fill(); outline(g, 3);
    const shard = (x, y, w2, h2, a, c) => { g.save(); g.translate(x, y); g.rotate(a); g.beginPath(); g.moveTo(0, -h2); g.lineTo(w2, -h2 * 0.55); g.lineTo(w2 * 0.8, 0); g.lineTo(-w2 * 0.8, 0); g.lineTo(-w2, -h2 * 0.55); g.closePath(); const gr = g.createLinearGradient(-w2, 0, w2, 0); gr.addColorStop(0, light(c, 0.55)); gr.addColorStop(0.45, c); gr.addColorStop(1, dark(c, 0.3)); g.fillStyle = gr; g.fill(); outline(g, 2); g.strokeStyle = rgba(PAL.cream, 0.6); g.lineWidth = 1.5; g.beginPath(); g.moveTo(0, -h2); g.lineTo(0, -2); g.stroke(); g.restore(); };
    shard(36, 70, 12, 42, -0.35, mix(crystal, PAL.lav, 0.3)); shard(74, 70, 12, 40, 0.38, mix(crystal, PAL.lav, 0.2)); shard(55, 72, 16, 60, 0, crystal); shard(45, 80, 8, 22, -0.7, light(crystal, 0.2)); shard(66, 80, 8, 24, 0.7, light(crystal, 0.2));
  });
}
function bakeTree(s) {
  return sprite(150, 170, s, 0.5, 0.82, (g) => {
    shadow(g, 75, 150, 46, 11);
    g.fillStyle = satin(g, 90, 150, mix(PAL.coral, PAL.plum, 0.45)); g.beginPath(); g.moveTo(64, 150); g.quadraticCurveTo(70, 110, 66, 92); g.lineTo(84, 92); g.quadraticCurveTo(80, 112, 88, 150); g.closePath(); g.fill(); outline(g, 2.5);
    for (const [x, y, r, k] of [[52, 70, 36, 0.1], [98, 68, 36, 0.05], [75, 46, 44, 0.2], [75, 82, 34, 0]]) { g.fillStyle = satinR(g, x, y, r, mix(PAL.sage, PAL.teal, k)); ell(g, x, y, r, r * 0.9); g.fill(); }
    g.beginPath(); ell(g, 75, 64, 62, 46); outline(g, 0.01);
    for (const [x, y] of [[48, 62], [92, 56], [72, 34], [100, 86], [56, 92]]) starPath(g, x, y, 9, 4.2, 5), g.fillStyle = satinR(g, x, y, 9, PAL.gold), g.fill(), outline(g, 1.5);
  });
}
function starPath(g, x, y, R, r, n) { g.beginPath(); for (let i = 0; i < n * 2; i++) { const a = -Math.PI / 2 + i * Math.PI / n, rr = i % 2 ? r : R; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } g.closePath(); }
function bakePinata(s) {
  return sprite(120, 130, s, 0.5, 0.58, (g) => {
    shadow(g, 60, 116, 38, 9);
    g.save(); starPath(g, 60, 66, 48, 26, 5); g.clip();
    const cols = [PAL.gold, PAL.coral, PAL.teal, PAL.lav, PAL.gold];
    for (let i = 0; i < 12; i++) { g.fillStyle = satin(g, 10 + i * 10, 22 + i * 10, cols[i % 5]); g.fillRect(0, 12 + i * 10, 120, 10); g.fillStyle = rgba(PAL.cream, 0.25); for (let x = 0; x < 120; x += 6) g.fillRect(x, 20 + i * 10, 3, 2); }
    const gr = g.createRadialGradient(42, 46, 4, 60, 66, 56); gr.addColorStop(0, rgba(PAL.cream, 0.4)); gr.addColorStop(1, rgba(PAL.plum, 0.25)); g.fillStyle = gr; g.fillRect(0, 0, 120, 130);
    g.restore(); starPath(g, 60, 66, 48, 26, 5); outline(g, 3);
    g.fillStyle = PAL.plum; ell(g, 52, 62, 3.5, 4.5); g.fill(); ell(g, 68, 62, 3.5, 4.5); g.fill();
    g.fillStyle = rgba(PAL.coral, 0.6); ell(g, 47, 71, 5, 3); g.fill(); ell(g, 73, 71, 5, 3); g.fill();
    g.strokeStyle = PAL.plum; g.lineWidth = 2.5; g.beginPath(); g.arc(60, 68, 6, 0.2, Math.PI - 0.2); g.stroke();
    g.strokeStyle = dark(PAL.gold, 0.3); g.lineWidth = 2; g.beginPath(); g.moveTo(60, 18); g.lineTo(60, 0); g.stroke();
  });
}
function bakeGem(s, c) {
  return sprite(28, 28, s, 0.5, 0.5, (g) => {
    g.beginPath(); g.moveTo(14, 2); g.lineTo(25, 10); g.lineTo(14, 26); g.lineTo(3, 10); g.closePath();
    const gr = g.createLinearGradient(3, 2, 25, 26); gr.addColorStop(0, light(c, 0.6)); gr.addColorStop(0.5, c); gr.addColorStop(1, dark(c, 0.3)); g.fillStyle = gr; g.fill(); outline(g, 1.6);
    g.strokeStyle = rgba(PAL.cream, 0.7); g.lineWidth = 1.2; g.beginPath(); g.moveTo(3, 10); g.lineTo(25, 10); g.moveTo(14, 2); g.lineTo(10, 10); g.lineTo(14, 26); g.stroke();
  });
}
function bakeLog(s) {
  return sprite(32, 22, s, 0.5, 0.5, (g) => {
    g.fillStyle = satin(g, 3, 19, mix(PAL.coral, PAL.gold, 0.35)); g.beginPath(); g.roundRect ? g.roundRect(3, 4, 24, 14, 7) : g.rect(3, 4, 24, 14); g.fill(); outline(g, 1.6);
    g.fillStyle = light(PAL.gold, 0.4); ell(g, 25, 11, 5, 7); g.fill(); outline(g, 1.2); g.strokeStyle = rgba(PAL.coral, 0.6); g.lineWidth = 1; ell(g, 25, 11, 2.5, 3.5); g.stroke();
    g.fillStyle = PAL.sage; ell(g, 10, 4, 4, 2.5); g.fill();
  });
}
function bakeGlow(s, c, r) {
  return sprite(r * 2, r * 2, s, 0.5, 0.5, (g) => { const gr = g.createRadialGradient(r, r, 0, r, r, r); gr.addColorStop(0, rgba(c, 1)); gr.addColorStop(0.35, rgba(c, 0.45)); gr.addColorStop(1, rgba(c, 0)); g.fillStyle = gr; g.fillRect(0, 0, r * 2, r * 2); });
}
function bakeStar(s, c) { return sprite(26, 26, s, 0.5, 0.5, (g) => { starPath(g, 13, 13, 12, 5, 4); g.fillStyle = satinR(g, 13, 13, 12, c); g.fill(); }); }
function bakePetal(s, c) { return sprite(18, 12, s, 0.5, 0.5, (g) => { g.beginPath(); g.moveTo(1, 6); g.quadraticCurveTo(9, -2, 17, 6); g.quadraticCurveTo(9, 14, 1, 6); g.fillStyle = satin(g, 0, 12, c); g.fill(); }); }

function bakeEgg(s, kind) {
  const base = { meadow: PAL.sage, coral: PAL.coral, royal: PAL.lav, gift: PAL.gold }[kind];
  return sprite(80, 100, s, 0.5, 0.86, (g) => {
    shadow(g, 40, 88, 26, 7);
    g.beginPath(); g.moveTo(40, 6); g.bezierCurveTo(70, 6, 74, 60, 70, 66); g.bezierCurveTo(66, 92, 14, 92, 10, 66); g.bezierCurveTo(6, 60, 10, 6, 40, 6); g.closePath();
    g.fillStyle = satinR(g, 40, 54, 40, light(base, 0.15)); g.fill();
    g.save(); g.clip();
    if (kind === 'meadow') for (const [x, y, r] of [[26, 40, 7], [50, 30, 5], [54, 60, 8], [30, 70, 5], [44, 50, 4]]) { g.fillStyle = light(PAL.cream, 0); ell(g, x, y, r, r * 0.85); g.fill(); }
    if (kind === 'coral') for (let i = 0; i < 3; i++) { g.fillStyle = i % 2 ? light(PAL.teal, 0.25) : light(PAL.gold, 0.3); g.beginPath(); for (let x = 0; x <= 80; x += 8) g.lineTo(x, 34 + i * 16 + Math.sin(x * 0.3) * 4); g.lineTo(80, 42 + i * 16); g.lineTo(0, 42 + i * 16); g.fill(); }
    if (kind === 'gift') { g.fillStyle = PAL.coral; g.fillRect(34, 0, 12, 100); g.fillRect(0, 44, 80, 12); }
    if (kind === 'royal') for (const [x, y] of [[28, 36], [52, 46], [36, 64]]) { starPath(g, x, y, 8, 3.5, 5); g.fillStyle = light(PAL.gold, 0.2); g.fill(); }
    g.restore();
    g.beginPath(); g.moveTo(40, 6); g.bezierCurveTo(70, 6, 74, 60, 70, 66); g.bezierCurveTo(66, 92, 14, 92, 10, 66); g.bezierCurveTo(6, 60, 10, 6, 40, 6); outline(g, 3);
    rim(g, 40, 44, 28, 34, 0.7);
    if (kind === 'gift') { g.fillStyle = PAL.coral; ell(g, 31, 10, 10, 6); g.fill(); ell(g, 49, 10, 10, 6); g.fill(); outline(g, 1.5); }
  });
}
function bakeNest(s) {
  return sprite(130, 60, s, 0.5, 0.55, (g) => {
    shadow(g, 65, 46, 58, 12);
    g.fillStyle = satin(g, 18, 56, mix(PAL.gold, PAL.coral, 0.45)); ell(g, 65, 36, 58, 20); g.fill(); outline(g, 2.5);
    g.fillStyle = dark(mix(PAL.gold, PAL.coral, 0.5), 0.4); ell(g, 65, 30, 44, 11); g.fill();
    const rng = makeRng(4); g.strokeStyle = rgba(light(PAL.gold, 0.3), 0.8); g.lineWidth = 2;
    for (let i = 0; i < 26; i++) { const x = 12 + rng() * 106, y = 30 + rng() * 22; g.beginPath(); g.moveTo(x - 10, y); g.quadraticCurveTo(x, y - 5, x + 12, y + 1); g.stroke(); }
  });
}
function bakeSling(s) {
  return sprite(150, 130, s, 0.5, 0.95, (g) => {
    shadow(g, 75, 120, 34, 8);
    g.lineCap = 'round'; g.lineJoin = 'round';
    const wood = mix(PAL.coral, PAL.plum, 0.4);
    g.strokeStyle = rgba(PAL.plum, 0.5); g.lineWidth = 19; g.beginPath(); g.moveTo(75, 122); g.lineTo(75, 78); g.quadraticCurveTo(72, 52, 24, 22); g.moveTo(75, 78); g.quadraticCurveTo(78, 52, 126, 22); g.stroke();
    g.strokeStyle = wood; g.lineWidth = 15; g.stroke();
    g.strokeStyle = rgba(light(wood, 0.5), 0.8); g.lineWidth = 4; g.beginPath(); g.moveTo(71, 118); g.lineTo(71, 80); g.quadraticCurveTo(68, 56, 26, 28); g.stroke();
    g.fillStyle = satinR(g, 24, 22, 11, PAL.gold); ell(g, 24, 22, 10, 10); g.fill(); outline(g, 2); g.fillStyle = satinR(g, 126, 22, 11, PAL.gold); ell(g, 126, 22, 10, 10); g.fill(); outline(g, 2);
    g.fillStyle = PAL.sage; ell(g, 34, 34, 9, 5); g.fill();
  });
}
/** Sling fork tips relative to the sling anchor (bottom centre). */
export const SLING_TIPS = [[-51, -102], [51, -102]];

// ---------- landmarks ----------
/** Landmark slot x positions on the back strip, and their base y. */
export const LANDMARK_X = [75, 189, 303, 417, 531, 645];
export const LANDMARK_BASE = 434;
function bakePedestal(s) {
  // a round stone plinth: lit top with a rune ring, a darker front face, soft contact shadow
  return sprite(112, 64, s, 0.5, 0.36, (g) => {
    shadow(g, 56, 50, 54, 12);
    const side = mix(PAL.lav, PAL.plum, 0.35);
    g.beginPath(); g.moveTo(6, 24); g.lineTo(6, 42); g.ellipse(56, 42, 50, 16, 0, Math.PI, 0, true); g.lineTo(106, 24); g.closePath();
    g.fillStyle = satin(g, 24, 58, side); g.fill(); outline(g, 2.5);
    for (let i = 0; i < 5; i++) { const x = 18 + i * 19; g.strokeStyle = rgba(PAL.plum, 0.25); g.lineWidth = 2; g.beginPath(); g.moveTo(x, 30 + Math.abs(i - 2) * -1); g.lineTo(x, 50 - Math.abs(i - 2) * 3); g.stroke(); }
    g.fillStyle = satin(g, 8, 38, mix(PAL.cream, PAL.lav, 0.25)); ell(g, 56, 24, 50, 16); g.fill(); outline(g, 2.5);
    g.fillStyle = mix(PAL.cream, PAL.lav, 0.45); ell(g, 56, 20, 42, 11); g.fill();
    g.strokeStyle = rgba(PAL.teal, 0.7); g.lineWidth = 2; ell(g, 56, 20, 30, 7.5); g.stroke();
    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; runePath(g, 56 + Math.cos(a) * 30, 20 + Math.sin(a) * 7.5, 3); g.stroke(); }
  });
}
function roof(g, x, y, w, h, c) { g.beginPath(); g.moveTo(x - w / 2, y); g.quadraticCurveTo(x, y - h * 1.2, x + w / 2, y); g.closePath(); g.fillStyle = satin(g, y - h, y, c); g.fill(); outline(g, 2.5); }
function bakeLandmark(s, i) {
  const w = 124, h = 200;
  return sprite(w, h, s, 0.5, 1, (g) => {
    const cx = w / 2, by = h - 8;
    shadow(g, cx, by, 54, 11, 0.36);
    if (i === 0) { // Honeycomb Bakery
      g.fillStyle = satin(g, by - 100, by, PAL.gold); g.beginPath(); g.moveTo(cx - 46, by); g.lineTo(cx - 46, by - 60); g.quadraticCurveTo(cx, by - 128, cx + 46, by - 60); g.lineTo(cx + 46, by); g.closePath(); g.fill(); outline(g, 3);
      g.save(); g.clip(); g.strokeStyle = rgba(dark(PAL.gold, 0.35), 0.5); g.lineWidth = 2;
      for (let yy = by - 110; yy < by; yy += 16) for (let xx = cx - 60 + ((yy / 16) % 2) * 9; xx < cx + 60; xx += 18) { g.beginPath(); for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2; g.lineTo(xx + Math.cos(a) * 9, yy + Math.sin(a) * 9); } g.closePath(); g.stroke(); }
      g.restore();
      g.fillStyle = satin(g, by - 44, by, mix(PAL.coral, PAL.plum, 0.35)); g.beginPath(); g.moveTo(cx - 14, by); g.lineTo(cx - 14, by - 30); g.arc(cx, by - 30, 14, Math.PI, 0); g.lineTo(cx + 14, by); g.fill(); outline(g, 2);
      g.fillStyle = mix(PAL.coral, PAL.plum, 0.4); g.fillRect(cx + 18, by - 124, 14, 30); g.fillStyle = light(PAL.gold, 0.3); ell(g, cx + 25, by - 94, 9, 5); g.fill();
      g.fillStyle = light(PAL.gold, 0.45); ell(g, cx - 26, by - 52, 9, 9); g.fill(); outline(g, 2);
      rim(g, cx, by - 70, 44, 50, 0.6);
    } else if (i === 1) { // Bouncy Jelly-Grove
      for (const [x, y, r, c] of [[cx - 30, by - 30, 26, PAL.lav], [cx + 30, by - 36, 28, PAL.coral], [cx, by - 74, 34, PAL.teal]]) {
        g.fillStyle = satin(g, y, by, PAL.cream); g.fillRect(x - 6, y, 12, by - y); g.beginPath(); g.moveTo(x - r, y + 4); g.bezierCurveTo(x - r, y - r * 1.1, x + r, y - r * 1.1, x + r, y + 4); g.quadraticCurveTo(x, y + 12, x - r, y + 4); g.fillStyle = satin(g, y - r, y + 8, c); g.fill(); outline(g, 2.5);
        g.fillStyle = rgba(PAL.cream, 0.7); ell(g, x - r * 0.3, y - r * 0.45, r * 0.22, r * 0.14); g.fill();
      }
    } else if (i === 2) { // Starlight Observatory
      g.fillStyle = satin(g, by - 110, by, mix(PAL.cream, PAL.lav, 0.3)); g.beginPath(); g.moveTo(cx - 30, by); g.lineTo(cx - 24, by - 100); g.lineTo(cx + 24, by - 100); g.lineTo(cx + 30, by); g.fill(); outline(g, 3);
      g.fillStyle = satinR(g, cx, by - 100, 34, PAL.lav); g.beginPath(); g.arc(cx, by - 100, 32, Math.PI, 0); g.closePath(); g.fill(); outline(g, 3);
      g.save(); g.translate(cx + 8, by - 118); g.rotate(-0.6); g.fillStyle = satin(g, -8, 8, PAL.gold); g.fillRect(0, -7, 46, 14); outline(g, 2); g.restore();
      g.fillStyle = dark(PAL.lav, 0.5); g.beginPath(); g.arc(cx, by - 30, 12, Math.PI, 0); g.lineTo(cx + 12, by); g.lineTo(cx - 12, by); g.fill();
      starPath(g, cx - 20, by - 160, 10, 4, 4); g.fillStyle = light(PAL.gold, 0.4); g.fill();
    } else if (i === 3) { // Clockwork Ferris Wheel stand (the wheel spins at run time)
      g.strokeStyle = dark(PAL.coral, 0.3); g.lineWidth = 7; g.lineCap = 'round'; g.beginPath(); g.moveTo(cx - 40, by); g.lineTo(cx, by - 96); g.lineTo(cx + 40, by); g.stroke();
      g.strokeStyle = PAL.coral; g.lineWidth = 4; g.stroke();
      g.fillStyle = satin(g, by - 16, by, mix(PAL.cream, PAL.gold, 0.4)); g.fillRect(cx - 50, by - 12, 100, 12); outline(g, 2);
    } else if (i === 4) { // Crystal Prism Fountain
      g.fillStyle = satin(g, by - 36, by, mix(PAL.cream, PAL.teal, 0.2)); ell(g, cx, by - 14, 52, 16); g.fill(); outline(g, 3);
      g.fillStyle = light(PAL.teal, 0.25); ell(g, cx, by - 20, 44, 10); g.fill();
      g.fillStyle = satin(g, by - 80, by - 16, mix(PAL.cream, PAL.lav, 0.3)); g.fillRect(cx - 9, by - 76, 18, 60); outline(g, 2);
      g.fillStyle = satin(g, by - 86, by - 70, mix(PAL.cream, PAL.teal, 0.2)); ell(g, cx, by - 76, 28, 9); g.fill(); outline(g, 2);
      g.beginPath(); g.moveTo(cx, by - 140); g.lineTo(cx + 16, by - 104); g.lineTo(cx, by - 84); g.lineTo(cx - 16, by - 104); g.closePath();
      const gr = g.createLinearGradient(cx - 16, 0, cx + 16, 0); gr.addColorStop(0, light(PAL.lav, 0.6)); gr.addColorStop(0.5, PAL.teal); gr.addColorStop(1, PAL.coral); g.fillStyle = gr; g.fill(); outline(g, 2);
    } else { // Royal Sky-Lighthouse
      g.save(); g.beginPath(); g.moveTo(cx - 28, by); g.lineTo(cx - 18, by - 130); g.lineTo(cx + 18, by - 130); g.lineTo(cx + 28, by); g.closePath(); g.clip();
      for (let k = 0; k < 7; k++) { g.fillStyle = satin(g, by - 130 + k * 20, by - 110 + k * 20, k % 2 ? PAL.cream : PAL.coral); g.fillRect(0, by - 130 + k * 20, w, 20); }
      g.restore(); g.beginPath(); g.moveTo(cx - 28, by); g.lineTo(cx - 18, by - 130); g.lineTo(cx + 18, by - 130); g.lineTo(cx + 28, by); g.closePath(); outline(g, 3);
      g.fillStyle = satin(g, by - 160, by - 130, light(PAL.gold, 0.35)); g.fillRect(cx - 16, by - 160, 32, 30); outline(g, 2);
      roof(g, cx, by - 160, 44, 26, PAL.teal);
      g.fillStyle = satin(g, by - 140, by - 128, PAL.plum); g.fillRect(cx - 26, by - 134, 52, 8);
    }
  });
}
function bakeWheel(s) {
  return sprite(150, 150, s, 0.5, 0.5, (g) => {
    const c = 75;
    g.strokeStyle = PAL.gold; g.lineWidth = 5; ell(g, c, c, 60, 60); g.stroke(); outline(g, 1.5);
    g.lineWidth = 2.5; g.strokeStyle = dark(PAL.gold, 0.2); for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2; g.beginPath(); g.moveTo(c, c); g.lineTo(c + Math.cos(a) * 60, c + Math.sin(a) * 60); g.stroke(); }
    g.fillStyle = satinR(g, c, c, 12, PAL.coral); ell(g, c, c, 11, 11); g.fill(); outline(g, 2);
  });
}
function bakeCabin(s, c) { return sprite(26, 24, s, 0.5, 0.1, (g) => { g.strokeStyle = PAL.plum; g.lineWidth = 2; g.beginPath(); g.moveTo(13, 0); g.lineTo(13, 6); g.stroke(); g.fillStyle = satin(g, 6, 22, c); g.beginPath(); g.roundRect ? g.roundRect(3, 6, 20, 16, 6) : g.rect(3, 6, 20, 16); g.fill(); outline(g, 1.8); }); }

// ---------- critters ----------
/** Species colours and shapes. */
export const SPECIES_LOOK = {
  fox: { body: mix(PAL.coral, PAL.gold, 0.45), belly: PAL.cream, accent: PAL.coral, ear: 'point', tail: 'bushy' },
  bunny: { body: mix(PAL.cream, PAL.lav, 0.35), belly: PAL.cream, accent: PAL.lav, ear: 'long', tail: 'puff' },
  dragon: { body: mix(PAL.sage, PAL.teal, 0.35), belly: light(PAL.gold, 0.45), accent: PAL.gold, ear: 'horn', tail: 'leaf' },
  owl: { body: mix(PAL.gold, PAL.coral, 0.3), belly: light(PAL.gold, 0.6), accent: PAL.teal, ear: 'tuft', tail: 'fan' },
  unicorn: { body: mix(PAL.cream, PAL.lav, 0.2), belly: PAL.cream, accent: PAL.coral, ear: 'point', tail: 'puff' },
};
function bakeCritterParts(s, sp) {
  const L = SPECIES_LOOK[sp];
  const parts = {};
  parts.body = sprite(80, 70, s, 0.5, 0.5, (g) => {
    ell(g, 40, 36, 30, 27); g.fillStyle = satinR(g, 40, 36, 32, L.body); g.fill(); outline(g, 3);
    ell(g, 40, 44, 17, 15); g.fillStyle = satinR(g, 40, 44, 18, L.belly); g.fill();
    g.fillStyle = dark(L.body, 0.2); ell(g, 24, 60, 8, 5); g.fill(); ell(g, 56, 60, 8, 5); g.fill();
  });
  parts.head = sprite(100, 90, s, 0.5, 0.55, (g) => {
    ell(g, 50, 48, 38, 34); g.fillStyle = satinR(g, 50, 48, 40, L.body); g.fill(); outline(g, 3);
    if (sp === 'fox') { g.beginPath(); g.moveTo(22, 56); g.quadraticCurveTo(50, 90, 78, 56); g.quadraticCurveTo(50, 66, 22, 56); g.fillStyle = L.belly; g.fill(); }
    else { ell(g, 50, 62, 18, 12); g.fillStyle = light(L.belly, 0.1); g.fill(); }
    g.fillStyle = PAL.plum; ell(g, 50, 58, 5, 3.6); g.fill();
    g.fillStyle = rgba(PAL.coral, 0.45); ell(g, 25, 60, 8, 5); g.fill(); ell(g, 75, 60, 8, 5); g.fill();
    rim(g, 50, 44, 38, 34, 0.55);
    if (sp === 'unicorn') { g.beginPath(); g.moveTo(44, 18); g.lineTo(50, -8 + 12); g.lineTo(56, 18); g.closePath(); g.fillStyle = satin(g, 4, 18, PAL.gold); g.fill(); outline(g, 1.5); }
  });
  parts.ear = sprite(40, 60, s, 0.5, 0.92, (g) => {
    g.beginPath();
    if (L.ear === 'long') { g.moveTo(14, 58); g.bezierCurveTo(2, 30, 10, 2, 20, 2); g.bezierCurveTo(30, 2, 38, 30, 26, 58); }
    else if (L.ear === 'horn') { g.moveTo(12, 58); g.quadraticCurveTo(12, 24, 22, 14); g.quadraticCurveTo(26, 34, 28, 58); }
    else if (L.ear === 'tuft') { g.moveTo(8, 58); g.lineTo(18, 22); g.lineTo(32, 58); }
    else { g.moveTo(6, 58); g.quadraticCurveTo(12, 16, 22, 10); g.quadraticCurveTo(34, 30, 34, 58); }
    g.closePath(); g.fillStyle = satin(g, 4, 58, L.ear === 'horn' ? L.accent : L.body); g.fill(); outline(g, 2.5);
    if (L.ear !== 'horn') { g.beginPath(); g.moveTo(14, 54); g.quadraticCurveTo(18, 30, 21, 20); g.quadraticCurveTo(26, 34, 26, 54); g.fillStyle = rgba(L.ear === 'long' ? PAL.coral : PAL.plum, 0.25); g.fill(); }
  });
  parts.tail = sprite(70, 60, s, 0.15, 0.7, (g) => {
    g.beginPath();
    if (L.tail === 'puff') { ell(g, 22, 34, 18, 17); g.fillStyle = satinR(g, 22, 34, 18, light(L.body, 0.3)); g.fill(); outline(g, 2.5); return; }
    if (L.tail === 'leaf') { g.moveTo(6, 42); g.quadraticCurveTo(40, 40, 52, 18); g.quadraticCurveTo(66, 32, 54, 44); g.quadraticCurveTo(36, 54, 6, 46); g.fillStyle = satin(g, 16, 50, L.body); g.fill(); outline(g, 2.5); g.beginPath(); g.moveTo(50, 20); g.quadraticCurveTo(70, 10, 66, 34); g.quadraticCurveTo(56, 34, 50, 20); g.fillStyle = satin(g, 10, 34, PAL.sage); g.fill(); outline(g, 2); return; }
    if (L.tail === 'fan') { for (let k = 0; k < 3; k++) { g.beginPath(); g.ellipse(14 + k * 6, 40, 10, 22, -0.6 + k * 0.6, 0, Math.PI * 2); g.fillStyle = satin(g, 18, 60, mix(L.body, PAL.coral, k * 0.2)); g.fill(); outline(g, 2); } return; }
    g.moveTo(6, 44); g.bezierCurveTo(26, 50, 60, 40, 64, 14); g.bezierCurveTo(48, 20, 30, 24, 6, 34); g.closePath();
    g.fillStyle = satin(g, 14, 50, L.body); g.fill(); outline(g, 2.5);
    g.beginPath(); g.moveTo(52, 26); g.quadraticCurveTo(60, 20, 64, 14); g.quadraticCurveTo(58, 30, 48, 34); g.fillStyle = L.belly; g.fill();
  });
  parts.wing = sprite(70, 60, s, 0.08, 0.75, (g) => {
    for (let k = 0; k < 3; k++) { g.beginPath(); g.moveTo(4, 46); g.quadraticCurveTo(26 + k * 8, 6 + k * 10, 64 - k * 6, 12 + k * 14); g.quadraticCurveTo(40, 38 + k * 4, 4, 50); g.closePath(); g.fillStyle = satin(g, 6, 52, k === 0 ? light(PAL.lav, 0.25) : k === 1 ? light(PAL.gold, 0.35) : PAL.cream); g.fill(); outline(g, 2); }
  });
  parts.crown = sprite(54, 40, s, 0.5, 0.9, (g) => {
    g.beginPath(); g.moveTo(6, 36); g.lineTo(4, 10); g.lineTo(16, 22); g.lineTo(27, 4); g.lineTo(38, 22); g.lineTo(50, 10); g.lineTo(48, 36); g.closePath();
    g.fillStyle = satin(g, 4, 36, PAL.gold); g.fill(); outline(g, 2.5);
    for (const [x, c] of [[16, PAL.coral], [27, PAL.teal], [38, PAL.lav]]) { g.fillStyle = satinR(g, x, 29, 4, c); ell(g, x, 29, 4, 4); g.fill(); }
  });
  return parts;
}

// ---------- airship ----------
function bakeAirship(s) {
  return sprite(300, 220, s, 0.5, 0.5, (g) => {
    g.save(); ell(g, 150, 78, 126, 62); g.clip();
    for (let k = 0; k < 9; k++) { g.fillStyle = k % 2 ? light(PAL.gold, 0.15) : PAL.coral; g.fillRect(24 + k * 28, 0, 28, 160); }
    const gr = g.createLinearGradient(0, 16, 0, 140); gr.addColorStop(0, rgba(PAL.cream, 0.45)); gr.addColorStop(0.5, rgba(PAL.cream, 0)); gr.addColorStop(1, rgba(PAL.plum, 0.35)); g.fillStyle = gr; g.fillRect(0, 0, 300, 160);
    g.restore(); ell(g, 150, 78, 126, 62); outline(g, 3.5);
    g.strokeStyle = rgba(PAL.plum, 0.5); g.lineWidth = 2; for (const x of [90, 150, 210]) { g.beginPath(); g.moveTo(x, 132); g.lineTo(x + (150 - x) * 0.3, 168); g.stroke(); }
    g.fillStyle = satin(g, 164, 206, mix(PAL.coral, PAL.plum, 0.4)); g.beginPath(); g.moveTo(84, 166); g.lineTo(216, 166); g.lineTo(196, 204); g.lineTo(104, 204); g.closePath(); g.fill(); outline(g, 3);
    g.fillStyle = light(PAL.gold, 0.4); for (const x of [120, 150, 180]) { ell(g, x, 184, 7, 7); g.fill(); }
    // tail fins
    g.fillStyle = satin(g, 40, 120, PAL.teal); g.beginPath(); g.moveTo(26, 78); g.lineTo(2, 44); g.lineTo(14, 80); g.lineTo(2, 114); g.closePath(); g.fill(); outline(g, 2.5);
  });
}

/**
 * Bake everything the first frame needs now, and queue the rest for idle slices (fast first load).
 * Returns the art store; `art.pump(ms)` bakes queued items within a time budget each frame.
 */
export function createBakery(bgScale) {
  const S2 = 2, wp = WORLDS[0];
  const art = { ready: {}, bgScale, queue: [] };
  const later = (key, fn) => art.queue.push([key, fn]);
  const now = (key, fn) => { art[key] = fn(); art.ready[key] = true; };
  // first frame: sky, terrace, hero, sling, targets
  now('sky', () => bakeSky(bgScale, wp));
  now('terrace', () => bakeTerrace(bgScale, wp));
  now('hills', () => bakeHills(bgScale, wp));
  now('critters', () => ({ fox: bakeCritterParts(S2, 'fox') }));
  now('sling', () => bakeSling(S2));
  now('mushroom', () => [bakeMushroom(S2, PAL.coral), bakeMushroom(S2, PAL.lav), bakeMushroom(S2, PAL.teal)]);
  now('geode', () => bakeGeode(S2, PAL.teal));
  now('gem', () => bakeGem(S2, PAL.gold));
  now('glow', () => bakeGlow(S2, light(PAL.gold, 0.3), 40));
  // after the first frame, in idle slices
  later('clouds', () => [bakeCloud(bgScale, 1, 300, 110), bakeCloud(bgScale, 2, 220, 90), bakeCloud(bgScale, 3, 360, 120)]);
  later('far', () => [bakeFarIsland(bgScale, 5, 250, wp.far, 0.05, true), bakeFarIsland(bgScale, 6, 180, wp.far, 0.3, false), bakeFarIsland(bgScale, 7, 130, wp.far, 0.5, true), bakeFarIsland(bgScale, 8, 90, wp.far, 0.62, false)]);
  later('grass', () => [bakeGrass(S2, 11, wp.hillB), bakeGrass(S2, 12, mix(wp.hillB, PAL.teal, 0.25)), bakeGrass(S2, 13, light(wp.hillB, 0.1))]);
  later('flowers', () => wp.flowers.map((c) => bakeFlower(S2, c)));
  later('tree', () => bakeTree(S2));
  later('pinata', () => bakePinata(S2));
  later('log', () => bakeLog(S2));
  later('gemTeal', () => bakeGem(S2, PAL.teal));
  later('gemLav', () => bakeGem(S2, PAL.lav));
  later('gemCoral', () => bakeGem(S2, PAL.coral));
  later('honey', () => bakeGlow(S2, PAL.gold, 14));
  later('star', () => bakeStar(S2, light(PAL.gold, 0.3)));
  later('petals', () => [bakePetal(S2, light(PAL.coral, 0.35)), bakePetal(S2, light(PAL.gold, 0.35)), bakePetal(S2, light(PAL.lav, 0.4))]);
  later('glowTeal', () => bakeGlow(S2, light(PAL.teal, 0.3), 30));
  later('glowCoral', () => bakeGlow(S2, light(PAL.coral, 0.3), 30));
  later('leaves', () => [bakeLeaf(bgScale, false, mix(PAL.sage, PAL.teal, 0.4)), bakeLeaf(bgScale, true, mix(PAL.teal, PAL.sage, 0.3))]);
  later('grain', () => bakeGrain(1));
  later('nest', () => bakeNest(S2));
  later('eggs', () => ({ meadow: bakeEgg(S2, 'meadow'), coral: bakeEgg(S2, 'coral'), royal: bakeEgg(S2, 'royal'), gift: bakeEgg(S2, 'gift') }));
  later('pedestal', () => bakePedestal(S2));
  for (let i = 0; i < 6; i++) later('landmark' + i, () => bakeLandmark(S2, i));
  later('wheel', () => bakeWheel(S2));
  later('cabins', () => [PAL.coral, PAL.teal, PAL.lav, PAL.gold].map((c) => bakeCabin(S2, c)));
  later('bunny', () => { art.critters.bunny = bakeCritterParts(S2, 'bunny'); return true; });
  later('dragon', () => { art.critters.dragon = bakeCritterParts(S2, 'dragon'); return true; });
  later('airship', () => bakeAirship(S2));
  art.pump = (budgetMs) => {
    const t0 = performance.now();
    while (art.queue.length && performance.now() - t0 < budgetMs) { const [k, fn] = art.queue.shift(); art[k] = fn(); art.ready[k] = true; }
    return art.queue.length;
  };
  /** Bake everything still queued (edit mode, tests). */
  art.finish = () => { while (art.queue.length) art.pump(1000); };
  /** Re-bake the full-screen layers at a new quality scale. */
  art.rescale = (sc) => { art.bgScale = sc; art.sky = bakeSky(sc, wp); art.terrace = bakeTerrace(sc, wp); art.hills = bakeHills(sc, wp); };
  return art;
}

/** Sky and far layers with parallax; px is the hero's offset from centre (-1..1). */
/** Stretch a sprite's outer pixel columns over the extra side width of a wide screen. */
function sideFill(ctx, sp, x, y, sx, sy) {
  const im = sp.img, iw = im.width, ih = im.height, top = y - sp.h * sp.ay * sy, h = sp.h * sy, d = VIEW.dx + 8;
  const k = Math.ceil(iw / sp.w * 10); // 10 px in from each edge: the outer columns can be soft or clear
  ctx.drawImage(im, k, 0, 1, ih, x - d, top, d + 10 * sx, h);
  ctx.drawImage(im, iw - k, 0, 1, ih, x + (sp.w - 10) * sx, top, d + 10 * sx, h);
}
export function drawBackdrop(ctx, art, t, px) {
  ctx.fillStyle = PAL.velvet; ctx.fillRect(-VIEW.dx, -VIEW.dy, VIEW.w, VIEW.h);
  if (art.sky && VIEW.dx > 0) sideFill(ctx, art.sky, -px * 4, 0, 1.02, 1.02);
  if (art.sky && VIEW.dy > 0) {
    // taller screen: the sky simply goes on higher, deepening toward the top, with its own slow clouds
    const im = art.sky.img, dy = VIEW.dy;
    ctx.drawImage(im, 0, 0, im.width, 1, -VIEW.dx - 4, -dy - 2, W * 1.02 + VIEW.dx * 2 + 8, dy + 4);
    const g = ctx.createLinearGradient(0, -dy, 0, 2); g.addColorStop(0, rgba('#2F86C8', 0.55)); g.addColorStop(1, rgba('#2F86C8', 0)); ctx.fillStyle = g; ctx.fillRect(-VIEW.dx, -dy, VIEW.w, dy + 2);
    if (art.clouds && dy > 120) { put(ctx, art.clouds[1], ((t * 5 + 380) % 1080) - 180 - px * 6, -dy * 0.42, 0.9, 0.9, 0, 0.7); put(ctx, art.clouds[2], ((t * 3 + 820) % 1160) - 220 - px * 5, -dy * 0.8 + 40, 0.75, 0.75, 0, 0.55); }
  }
  put(ctx, art.sky, 0 - px * 4, 0, 1.02, 1.02);
  if (art.clouds) {
    const c = art.clouds;
    put(ctx, c[0], ((t * 9 + 120) % 1080) - 180 - px * 8, 150, 1, 1, 0, 0.9);
    put(ctx, c[1], ((t * 6 + 620) % 1000) - 140 - px * 8, 236, 1, 1, 0, 0.8);
    if (!art.lite) put(ctx, c[2], ((t * 4 + 300) % 1160) - 220 - px * 6, 96, 1, 1, 0, 0.7);
  }
  // slow turning sun rays
  if (!art.lite) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.translate(560 - px * 4, 210); ctx.rotate(t * 0.03);
    for (let i = 0; i < 10; i++) { ctx.rotate(Math.PI / 5); const g = ctx.createLinearGradient(0, 0, 520, 0); g.addColorStop(0, 'rgba(255,240,200,0.16)'); g.addColorStop(1, 'rgba(255,240,200,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(40, -6); ctx.lineTo(520, -46); ctx.lineTo(520, 46); ctx.lineTo(40, 6); ctx.fill(); }
    ctx.restore();
  }
  if (art.far) {
    const f = art.far, bob = Math.sin(t * 0.6) * 5;
    if (VIEW.dy > 200) put(ctx, f[1], 560 - px * 6, -VIEW.dy * 0.45 + bob * 0.5, 0.9, 0.9);
    put(ctx, f[3], 300 - px * 6, 112 + bob * 0.4); put(ctx, f[2], 96 - px * 8, 150 - bob * 0.6);
    put(ctx, f[1], 640 - px * 10, 292 + bob * 0.7); put(ctx, f[0], 190 - px * 13, 282 - bob);
  }
  // a striped hot-air balloon drifting slowly through the sky
  { const bx = ((t * 7 + 520) % 1100) - 190 - px * 9, by = 190 + Math.sin(t * 0.5) * 12; ctx.save(); ctx.translate(bx, by);
    ctx.strokeStyle = rgba(PAL.plum, 0.5); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-12, 22); ctx.lineTo(-7, 40); ctx.moveTo(12, 22); ctx.lineTo(7, 40); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, -34); ctx.bezierCurveTo(34, -34, 34, 6, 12, 24); ctx.lineTo(-12, 24); ctx.bezierCurveTo(-34, 6, -34, -34, 0, -34); ctx.closePath(); ctx.save(); ctx.clip();
    for (let k = -3; k <= 3; k++) { ctx.fillStyle = k % 2 ? PAL.coral : '#FFE3A1'; ctx.fillRect(k * 10 - 5, -40, 10, 70); }
    const sg = ctx.createLinearGradient(-30, 0, 30, 0); sg.addColorStop(0, 'rgba(255,255,255,0.35)'); sg.addColorStop(0.5, 'rgba(255,255,255,0)'); sg.addColorStop(1, 'rgba(35,31,58,0.25)'); ctx.fillStyle = sg; ctx.fillRect(-34, -40, 68, 70); ctx.restore();
    ctx.lineWidth = 2; ctx.strokeStyle = rgba(PAL.plum, 0.6); ctx.stroke(); ctx.fillStyle = mix(PAL.coral, PAL.plum, 0.4); ctx.fillRect(-8, 39, 16, 11); ctx.restore(); }
  // a little flock of birds drifting across, wings flapping
  if (!art.lite) {
    ctx.save(); ctx.strokeStyle = rgba(PAL.plum, 0.55); ctx.lineWidth = 2.5; ctx.lineCap = 'round';
    for (let i = 0; i < 4; i++) { const x = ((t * 34 + i * 46) % 1100) - 190, y = 170 + (i % 2) * 18 + i * 6 + Math.sin(t + i) * 6, f = Math.sin(t * 9 + i * 1.3) * 6, k = 1 - i * 0.12; ctx.beginPath(); ctx.moveTo(x - 10 * k, y - f * k); ctx.quadraticCurveTo(x - 4 * k, y - 4 * k, x, y); ctx.quadraticCurveTo(x + 4 * k, y - 4 * k, x + 10 * k, y - f * k); ctx.stroke(); }
    ctx.restore();
  }
  put(ctx, art.hills, -px * 18 - 10, 330, 1.03, 1);
  // wide screens: the hills run on past the stage edge (drawn over the sprite's own outer columns)
  if (art.hills && VIEW.dx > 0) sideFill(ctx, art.hills, -px * 18 - 10, 330, 1.03, 1);
  if (art.grass) for (let i = 0; i < 6; i++) put(ctx, art.grass[i % 3], 60 + i * 120 - px * 18, 552 - (i % 2) * 6, 1, 1, Math.sin(t * 1.4 + i) * 0.04);
  if (VIEW.dx > 0) drawFlanks(ctx, art, t);
}
/** Wide screens: the meadow carries on past the island's sides with soft hills, trees and flowers. */
function drawFlanks(ctx, art, t) {
  const d = VIEW.dx + 4;
  for (const side of [-1, 1]) {
    const x0 = side < 0 ? -d : W, x1 = side < 0 ? 8 : W + d - 4 + 4;
    const g = ctx.createLinearGradient(0, 420, 0, 1010); g.addColorStop(0, '#7CC47A'); g.addColorStop(0.4, '#5DAE62'); g.addColorStop(1, '#3E8F55');
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x0, 1010); ctx.lineTo(x0, 440); for (let k = 0; k <= 8; k++) { const x = x0 + (x1 - x0) * k / 8; ctx.lineTo(x, 432 + Math.sin(x * 0.03) * 8); } ctx.lineTo(x1, 1010); ctx.closePath(); ctx.fill();
    for (let k = 0; k < 6; k++) {
      const u = (k + 0.5) / 6, x = side < 0 ? -d * (0.15 + 0.7 * ((k * 0.37) % 1)) : W + d * (0.15 + 0.7 * ((k * 0.37) % 1)), y = 470 + u * 480;
      if (art.tree && k % 2 === 0) put(ctx, art.tree, x, y, 0.75 + u * 0.35, 0.75 + u * 0.35, Math.sin(t * 0.8 + k) * 0.02);
      else if (art.grass) put(ctx, art.grass[k % 3], x, y, 0.8 + u * 0.4, 0.8 + u * 0.4, Math.sin(t * 1.4 + k) * 0.04);
      if (art.flowers) put(ctx, art.flowers[k % 4], x + 30 * side, y + 26, 1.1, 1.1, Math.sin(t * 1.8 + k) * 0.12);
    }
  }
}
/** The terrace with its swaying flowers and glowing runes. */
export function drawTerrace(ctx, art, t, px) {
  put(ctx, art.terrace, -px * 3, 400);
  if (art.flowers) for (let i = 0; i < FLOWERS.length; i++) { const [x, y, k] = FLOWERS[i]; put(ctx, art.flowers[k], x - px * 3, y, 1, 1, Math.sin(t * 1.8 + i * 1.7) * 0.12); }
  if (art.glowTeal) for (let i = 0; i < RUNE_X.length; i++) put(ctx, art.glowTeal, RUNE_X[i] - px * 3, RUNE_Y, 0.9, 0.6, 0, 0.35 + 0.35 * Math.sin(t * 2 + i * 1.3));
  drawLife(ctx, art, t);
}
/** The meadow is alive: butterflies on lazy loops and glinting pollen drifting up through the light. */
function drawLife(ctx, art, t) {
  if (art.glow && !art.lite) for (let i = 0; i < 12; i++) { const u = (t * 0.05 + i * 0.083) % 1, x = 60 + ((i * 263) % 600) + Math.sin(t * 0.7 + i) * 24, y = 940 - u * 520; put(ctx, art.glow, x, y, 0.16, 0.16, 0, Math.sin(u * Math.PI) * (0.55 + 0.3 * Math.sin(t * 5 + i))); }
  const cols = [SUN.pink, PAL.gold, '#8FD3F4'];
  for (let i = 0; i < 3; i++) {
    const cx = [150, 560, 420][i], cy = [620, 560, 760][i], x = cx + Math.sin(t * 0.55 + i * 2) * 90, y = cy + Math.sin(t * 0.9 + i) * 40, f = Math.abs(Math.sin(t * 14 + i * 2)), dir = Math.cos(t * 0.55 + i * 2) > 0 ? 1 : -1;
    ctx.save(); ctx.translate(x, y); ctx.scale(dir, 1); ctx.rotate(-0.25);
    ctx.fillStyle = cols[i]; ctx.strokeStyle = rgba(PAL.plum, 0.6); ctx.lineWidth = 1.5;
    for (const sy of [-1, 1]) { ctx.beginPath(); ctx.ellipse(-3, sy * 6 * (0.35 + f * 0.65), 9, 6 * (0.35 + f * 0.65), sy * 0.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
    ctx.fillStyle = PAL.plum; ctx.fillRect(-1, -6, 3, 12);
    ctx.restore();
  }
}
const FLOWERS = [[52, 520, 0], [92, 640, 1], [660, 560, 2], [622, 700, 3], [70, 800, 2], [650, 840, 0], [240, 470, 1], [480, 470, 3], [44, 930, 1], [676, 930, 2]];
/** Foreground framing leaves, soft-focus, swaying. */
export function drawForeground(ctx, art, t) {
  if (!art.leaves) return;
  put(ctx, art.leaves[0], -50 - VIEW.dx, 1040, 0.7, 0.7, Math.sin(t * 0.9) * 0.03, 0.95);
  put(ctx, art.leaves[1], W + 50 + VIEW.dx, 1040, 0.7, 0.7, Math.sin(t * 0.8 + 1) * 0.03, 0.95);
}
/** Paper-grain pass over the whole frame. */
export function drawGrain(ctx, art) {
  if (!art.grain || art.lite) return;
  if (!art.grainPat) art.grainPat = ctx.createPattern(art.grain, 'repeat');
  ctx.save(); ctx.globalAlpha = 0.035; ctx.fillStyle = art.grainPat; ctx.fillRect(-VIEW.dx, -VIEW.dy, VIEW.w, VIEW.h); ctx.restore();
}
