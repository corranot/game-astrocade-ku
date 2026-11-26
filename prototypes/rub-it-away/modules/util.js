/* Rub It Away shared helpers: stage constants, colours, easing and the rounded-sticker drawing primitives used by every screen. */
import { fontsOk } from './font.js';
import { isRtl, isJoined } from './strings.js';
export const W = 720, H = 1280;
export const STAGE = { x: 30, y: 150, w: 660, h: 990, r: 46 };
export const INK = '#3a2f45';
export const FONT = '"RubFont", sans-serif';
export const COL = { paper: '#f7e9c8', bg: '#ecd9b0', orange: '#e8743b', gold: '#ebb439', green: '#2dbe45', greenDk: '#249942', blue: '#3d8fd2', red: '#d9534f', plum: '#76259f', rain: '#3d91d2' };
export const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const ease = {
  out: (t) => 1 - Math.pow(1 - t, 3),
  back: (t) => { const c = 2.2; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); },
  el: (t) => (t <= 0 ? 0 : t >= 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * 2.094) + 1),
};

export function rr(g, x, y, w, h, r) {
  g.beginPath(); g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}

export function fillStroke(g, fill, lw = 7) {
  g.fillStyle = fill; g.fill();
  if (lw) { g.lineWidth = lw; g.strokeStyle = INK; g.lineJoin = g.lineCap = 'round'; g.stroke(); }
}

export function label(g, s, x, y, size, fill, o = {}) {
  if (!fontsOk()) return;
  g.font = '900 ' + size + 'px ' + FONT; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round'; g.direction = isRtl() ? 'rtl' : 'ltr';
  if (o.stroke !== 0) { g.lineWidth = (o.lw || size * 0.2) * (isJoined() ? 0.6 : 1); g.strokeStyle = o.stroke || INK; g.strokeText(s, x, y); }
  g.fillStyle = fill; g.fillText(s, x, y);
}

export function fitSize(g, s, size, maxW) {
  g.font = '900 ' + size + 'px ' + FONT; g.direction = isRtl() ? 'rtl' : 'ltr';
  const w = g.measureText(s).width;
  return w > maxW ? Math.max(14, Math.floor(size * maxW / w)) : size;
}

/* One line when it keeps a readable size (>= 22 px and >= 60 % of the drawn size), else the best two-line split; forceTwo reserves the split for compact map labels. */
export function fitLines(g, s, size, maxW, forceTwo = false) {
  const one = fitSize(g, s, size, maxW), words = s.split(' ');
  if ((!forceTwo && one >= Math.max(22, size * 0.6)) || words.length < 2) return { lines: [s], size: one };
  let best = null;
  for (let i = 1; i < words.length; i++) {
    const a = words.slice(0, i).join(' '), b = words.slice(i).join(' ');
    g.font = '900 ' + size + 'px ' + FONT;
    const w = Math.max(g.measureText(a).width, g.measureText(b).width);
    if (!best || w < best.w) best = { a, b, w };
  }
  const two = Math.max(14, Math.min(Math.floor(size * 0.75), Math.floor(size * maxW / best.w)));
  return forceTwo || two > one ? { lines: [best.a, best.b], size: two } : { lines: [s], size: one };
}

export function labelLines(g, fit, x, y, fill, o = {}, lineSpacing = 1.12) {
  const n = fit.lines.length, lh = fit.size * lineSpacing;
  fit.lines.forEach((ln, i) => label(g, ln, x, y + (i - (n - 1) / 2) * lh, fit.size, fill, o));
}

export function starPath(g, r, inner) {
  g.beginPath();
  for (let n = 0; n < 10; n++) { const rad = n % 2 ? inner : r, a = n / 10 * Math.PI * 2 - Math.PI / 2; g.lineTo(Math.cos(a) * rad, Math.sin(a) * rad); }
  g.closePath();
}

export function drawStar(g, x, y, r, on, rot = 0) {
  g.save(); g.translate(x, y); g.rotate(rot);
  starPath(g, r, r * 0.44); fillStroke(g, on ? COL.gold : '#9a8f9c', Math.max(3, r * 0.14));
  g.restore();
}

export function drawBulb(g, x, y, s, on) {
  g.save(); g.translate(x, y); g.scale(s, s);
  g.beginPath(); g.arc(0, -8, 30, 0, 7); fillStroke(g, on ? COL.gold : '#9a8f9c', 6);
  rr(g, -15, 18, 30, 22, 6); fillStroke(g, '#7a6a85', 6);
  g.restore();
}

export function hash(s) { let h = 7; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h; }

export function drawTrophy(g, x, y, s = 1) {
  g.save(); g.translate(x, y); g.scale(s, s);
  g.lineWidth = 9; g.strokeStyle = INK; g.lineJoin = g.lineCap = 'round';
  g.beginPath(); g.arc(-30, -12, 17, Math.PI * 0.5, Math.PI * 1.5); g.stroke();
  g.beginPath(); g.arc(30, -12, 17, Math.PI * 1.5, Math.PI * 0.5); g.stroke();
  rr(g, -14, 18, 28, 20, 4); fillStroke(g, COL.orange, 6);
  rr(g, -30, 36, 60, 14, 6); fillStroke(g, COL.orange, 6);
  g.beginPath(); g.moveTo(-34, -34); g.lineTo(34, -34); g.lineTo(26, 6); g.quadraticCurveTo(0, 30, -26, 6); g.closePath(); fillStroke(g, COL.gold, 7);
  g.restore();
}
