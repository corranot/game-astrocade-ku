// PROTOTYPE - NOT FOR PRODUCTION
/**
 * Glossy candy UI that sits on the painted art: discs, pills, a frosted panel, light rays and a warm vignette.
 * Every piece is a gradient body, a white sheen on top, a soft rim and a soft drop below; no hard outlines.
 */
export const PLUM = '#4A2366', PINK = '#FF5FA2', GREEN = '#3BD16F', DROP = 'rgba(90,30,80,0.22)';

/** Colour c (#rrggbb) moved toward black (k < 0) or white (k > 0). */
export function tint(c, k) {
  const n = parseInt(c.slice(1), 16), t = k < 0 ? 0 : 255, a = Math.abs(k), ch = (x) => Math.round(x + (t - x) * a);
  return `rgb(${ch(n >> 16)},${ch((n >> 8) & 255)},${ch(n & 255)})`;
}
export function roundRect(g, x, y, w, h, r) { r = Math.min(r, w / 2, h / 2); g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }

/** A glossy round button of colour base, centred on (x, y). */
export function glossDisc(g, x, y, r, base, rim = '#FFFFFF') {
  g.beginPath(); g.ellipse(x, y + r * 0.12, r, r, 0, 0, 7); g.fillStyle = DROP; g.fill();
  const gr = g.createLinearGradient(x, y - r, x, y + r); gr.addColorStop(0, tint(base, 0.35)); gr.addColorStop(0.55, base); gr.addColorStop(1, tint(base, -0.18));
  g.beginPath(); g.arc(x, y, r, 0, 7); g.fillStyle = gr; g.fill(); g.lineWidth = Math.max(3, r * 0.09); g.strokeStyle = rim; g.stroke();
  g.beginPath(); g.ellipse(x - r * 0.18, y - r * 0.45, r * 0.55, r * 0.26, -0.3, 0, 7); g.fillStyle = 'rgba(255,255,255,0.55)'; g.fill();
}
/** A glossy pill of colour base. */
export function glossPill(g, x, y, w, h, base, rim = '#FFFFFF') {
  roundRect(g, x, y + h * 0.1, w, h, h / 2); g.fillStyle = DROP; g.fill();
  const gr = g.createLinearGradient(x, y, x, y + h); gr.addColorStop(0, tint(base, 0.4)); gr.addColorStop(0.55, base); gr.addColorStop(1, tint(base, -0.15));
  roundRect(g, x, y, w, h, h / 2); g.fillStyle = gr; g.fill(); g.lineWidth = Math.max(3, h * 0.07); g.strokeStyle = rim; g.stroke();
  roundRect(g, x + h * 0.3, y + h * 0.12, w - h * 0.6, h * 0.28, h * 0.14); g.fillStyle = 'rgba(255,255,255,0.5)'; g.fill();
}
/** A paint sphere: a glossy ball of dye colour c (rainbow = a sweep of hues). */
export function sphere(g, x, y, r, c, rainbow) {
  g.beginPath(); g.ellipse(x, y + r * 0.9, r * 0.8, r * 0.22, 0, 0, 7); g.fillStyle = DROP; g.fill();
  if (rainbow && g.createConicGradient) { const cg = g.createConicGradient(0, x, y); ['#FF4040', '#FF9F1C', '#FFD23F', '#22C55E', '#3B82F6', '#8B5CF6', '#FF4040'].forEach((k, i) => cg.addColorStop(i / 6, k)); g.fillStyle = cg; }
  else { const gr = g.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r); gr.addColorStop(0, tint(rainbow ? '#FF9F1C' : c, 0.45)); gr.addColorStop(0.5, rainbow ? '#FF9F1C' : c); gr.addColorStop(1, tint(rainbow ? '#FF9F1C' : c, -0.35)); g.fillStyle = gr; }
  g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); g.lineWidth = 3; g.strokeStyle = 'rgba(255,255,255,0.9)'; g.stroke();
  g.beginPath(); g.ellipse(x - r * 0.32, y - r * 0.4, r * 0.3, r * 0.18, -0.6, 0, 7); g.fillStyle = 'rgba(255,255,255,0.75)'; g.fill();
}
/** A frosted glass panel, soft pink rim. */
export function panel(g, x, y, w, h, r) {
  roundRect(g, x, y + 8, w, h, r); g.fillStyle = DROP; g.fill();
  const gr = g.createLinearGradient(x, y, x, y + h); gr.addColorStop(0, 'rgba(255,255,255,0.96)'); gr.addColorStop(1, 'rgba(253,236,250,0.94)');
  roundRect(g, x, y, w, h, r); g.fillStyle = gr; g.fill(); g.lineWidth = 4; g.strokeStyle = '#FFB3D6'; g.stroke();
  roundRect(g, x + 14, y + 8, w - 28, 10, 5); g.fillStyle = 'rgba(255,255,255,0.8)'; g.fill();
}
/** Soft light rays turning behind (x, y), for the reveal. */
export function rays(g, x, y, r, t, alpha) {
  g.save(); g.translate(x, y); g.rotate(t * 0.4); g.globalAlpha = alpha;
  const gr = g.createRadialGradient(0, 0, r * 0.1, 0, 0, r); gr.addColorStop(0, 'rgba(255,244,200,0.9)'); gr.addColorStop(1, 'rgba(255,244,200,0)'); g.fillStyle = gr;
  for (let i = 0; i < 12; i++) { g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, r, i * Math.PI / 6, i * Math.PI / 6 + 0.16); g.closePath(); g.fill(); }
  g.beginPath(); g.arc(0, 0, r * 0.55, 0, 7); g.fill();
  g.restore();
}
/** A warm vignette over the whole scene, drawn once into a layer. */
export function vignette(w, h) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; const q = c.getContext('2d');
  const gr = q.createRadialGradient(w / 2, h * 0.44, h * 0.25, w / 2, h * 0.44, h * 0.78); gr.addColorStop(0, 'rgba(255,220,180,0)'); gr.addColorStop(1, 'rgba(80,30,70,0.32)');
  q.fillStyle = gr; q.fillRect(0, 0, w, h); return c;
}
