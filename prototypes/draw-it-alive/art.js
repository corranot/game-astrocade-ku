// PROTOTYPE - NOT FOR PRODUCTION
/**
 * Sticker-style drawing kit and path maths. Every shape is flat colour with a thick white border.
 * A scene part is drawn inside sticker(): the callback runs twice, first laying all white borders,
 * then all colours, so overlapping pieces share one outline.
 */
export const WHITE = '#FFFFFF', NAVY = '#1F2A6B', SKY = '#3EC5FF', MINT = '#3DDC97', SUNNY = '#FFD23F',
  CORAL = '#FF4D5E', ORANGE = '#FF8A1F', VIOLET = '#7A4DFF', BLUSH = '#FF9EC4', PEN = '#FF2E93', GRASS = '#25B877';
export const BORDER = 10;
const TAU = Math.PI * 2;
let fill = true; // false while sticker() lays the white borders

/** Run draw twice: white borders, then colours. */
export function sticker(draw) { fill = false; draw(); fill = true; draw(); }

/** Ellipse. */
export function blob(ctx, x, y, rx, ry, color, rot = 0) {
  const b = fill ? 0 : BORDER;
  ctx.beginPath(); ctx.ellipse(x, y, Math.max(0.1, rx + b), Math.max(0.1, ry + b), rot, 0, TAU);
  ctx.fillStyle = fill ? color : WHITE; ctx.fill();
}

/** Rounded rectangle (arcTo, because roundRect is missing on older phones). */
export function box(ctx, x, y, w, h, r, color) {
  const b = fill ? 0 : BORDER; x -= b; y -= b; w += 2 * b; h += 2 * b; r = Math.min(r + b, w / 2, h / 2);
  ctx.beginPath(); ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath(); ctx.fillStyle = fill ? color : WHITE; ctx.fill();
}

const trace = (ctx, pts) => { ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]); };

/** Thick round-capped line through pts. */
export function stick(ctx, pts, w, color) {
  if (!pts || pts.length < 2) return;
  ctx.lineCap = ctx.lineJoin = 'round'; trace(ctx, pts);
  ctx.strokeStyle = fill ? color : WHITE; ctx.lineWidth = w + (fill ? 0 : BORDER * 2); ctx.stroke();
}

/** Filled closed polygon through pts. */
export function shape(ctx, pts, color) {
  if (!pts || pts.length < 3) return;
  trace(ctx, pts); ctx.closePath(); ctx.lineJoin = 'round';
  if (fill) { ctx.fillStyle = color; ctx.fill(); } else { ctx.fillStyle = ctx.strokeStyle = WHITE; ctx.lineWidth = BORDER * 2; ctx.fill(); ctx.stroke(); }
}

/** Soft ground shadow; call outside sticker(). */
export function shadow(ctx, x, y, rx) {
  ctx.beginPath(); ctx.ellipse(x, y, rx, rx * 0.22, 0, 0, TAU); ctx.fillStyle = 'rgba(31,42,107,0.18)'; ctx.fill();
}

/**
 * Face of size s centred on (x, y). mood: 'wait' (worried), 'draw' (watching, round mouth), 'sad' (puzzled), 'happy'.
 * look is the point the eyes turn to, or null. Draws only on the colour pass.
 */
export function face(ctx, x, y, s, mood, t, look) {
  if (!fill) return;
  let ox = 0, oy = 0;
  if (look) { const d = Math.hypot(look[0] - x, look[1] - y) || 1; ox = (look[0] - x) / d * s * 0.07; oy = (look[1] - y) / d * s * 0.07; }
  const blink = (t % 3.7) < 0.12, r = s * 0.13;
  ctx.fillStyle = ctx.strokeStyle = NAVY; ctx.lineCap = 'round';
  for (const side of [-1, 1]) {
    const ex = x + side * s * 0.36 + ox, ey = y + oy;
    if (mood === 'happy') { ctx.lineWidth = r * 0.8; ctx.beginPath(); ctx.arc(ex, ey + r * 0.5, r, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke(); }
    else { ctx.beginPath(); ctx.ellipse(ex, ey, r, blink ? r * 0.15 : r * 1.15, 0, 0, TAU); ctx.fill(); }
  }
  const my = y + s * 0.42; ctx.lineWidth = s * 0.09;
  ctx.beginPath();
  if (mood === 'happy') ctx.arc(x, my - s * 0.16, s * 0.3, Math.PI * 0.15, Math.PI * 0.85);
  else if (mood === 'draw') ctx.ellipse(x, my, s * 0.1, s * 0.13, 0, 0, TAU);
  else if (mood === 'sad') { ctx.moveTo(x - s * 0.2, my + s * 0.06); ctx.lineTo(x + s * 0.2, my - s * 0.06); }
  else ctx.arc(x, my + s * 0.22, s * 0.24, Math.PI * 1.2, Math.PI * 1.8);
  ctx.stroke();
  if (mood === 'happy') { ctx.fillStyle = BLUSH; for (const side of [-1, 1]) { ctx.beginPath(); ctx.ellipse(x + side * s * 0.62, y + s * 0.24, s * 0.15, s * 0.1, 0, 0, TAU); ctx.fill(); } }
}

// ---------- path maths (a path is an array of [x, y]) ----------
export const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
export function pathLen(p) { let L = 0; for (let i = 1; i < p.length; i++) L += dist(p[i], p[i - 1]); return L; }

/** Points spaced step apart along p; keeps both ends. */
export function resample(p, step) {
  if (p.length < 2) return p.slice();
  const out = [p[0].slice()]; let carry = 0;
  for (let i = 1; i < p.length; i++) {
    const a = p[i - 1], d = dist(p[i], a); if (!d) continue;
    let pos = step - carry;
    while (pos <= d) { out.push([a[0] + (p[i][0] - a[0]) * pos / d, a[1] + (p[i][1] - a[1]) * pos / d]); pos += step; }
    carry = d - (pos - step);
  }
  out.push(p[p.length - 1].slice()); return out;
}

/** Corner-cutting smoothing, n passes; keeps both ends. */
export function chaikin(p, n = 2) {
  for (; n > 0 && p.length > 2; n--) {
    const out = [p[0]];
    for (let i = 0; i < p.length - 1; i++) {
      const a = p[i], b = p[i + 1];
      out.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25], [a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75]);
    }
    out.push(p[p.length - 1]); p = out;
  }
  return p;
}

/** Smooth curve through a few control points. */
export const curve = (ctrl) => chaikin(ctrl, 4);

/** Circle as a closed path starting at the top. */
export function circle(cx, cy, r, n = 48) {
  const out = []; for (let i = 0; i <= n; i++) { const a = -Math.PI / 2 + i / n * TAU; out.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); } return out;
}

/** The first share k (0..1) of p, by length. */
export function upTo(p, k) {
  if (k >= 1) return p; if (k <= 0) return [p[0]];
  const goal = pathLen(p) * k; let L = 0; const out = [p[0]];
  for (let i = 1; i < p.length; i++) {
    const d = dist(p[i], p[i - 1]);
    if (L + d >= goal) { const f = d ? (goal - L) / d : 0; out.push([p[i - 1][0] + (p[i][0] - p[i - 1][0]) * f, p[i - 1][1] + (p[i][1] - p[i - 1][1]) * f]); return out; }
    L += d; out.push(p[i]);
  }
  return out;
}

/** The point at share k (0..1) along p. */
export const pointAt = (p, k) => { const s = upTo(p, k); return s[s.length - 1]; };

// ---------- small decorations ----------
/** Five-point star. */
export function star(ctx, x, y, r, color, rot = 0) {
  const p = []; for (let i = 0; i < 10; i++) { const a = rot - Math.PI / 2 + i * Math.PI / 5, q = i % 2 ? r * 0.5 : r; p.push([x + Math.cos(a) * q, y + Math.sin(a) * q]); }
  shape(ctx, p, color);
}

/** Heart of half-width s. */
export function heart(ctx, x, y, s, color) {
  blob(ctx, x - s * 0.5, y - s * 0.3, s * 0.56, s * 0.56, color); blob(ctx, x + s * 0.5, y - s * 0.3, s * 0.56, s * 0.56, color);
  shape(ctx, [[x - s * 0.98, y - s * 0.02], [x + s * 0.98, y - s * 0.02], [x, y + s * 1.05]], color);
}

/** Tuft of three grass blades standing on (x, y). */
export function tuft(ctx, x, y, color) {
  stick(ctx, [[x - 12, y], [x - 20, y - 22]], 9, color); stick(ctx, [[x, y], [x, y - 32]], 9, color); stick(ctx, [[x + 12, y], [x + 20, y - 22]], 9, color);
}

/** Small five-petal flower. */
export function bloom(ctx, x, y, r, color) {
  for (let i = 0; i < 5; i++) { const a = i / 5 * TAU - 0.3; blob(ctx, x + Math.cos(a) * r, y + Math.sin(a) * r, r * 0.8, r * 0.8, color); }
  blob(ctx, x, y, r * 0.7, r * 0.7, WHITE);
}

/** Sparse soft dots over a flat background; call outside sticker(). */
export function dots(ctx) {
  ctx.fillStyle = 'rgba(255,255,255,0.26)';
  for (let i = 0; i < 24; i++) { ctx.beginPath(); ctx.arc((i * 197 + 60) % 720, (i * 331 + 90) % 1280, 5 + (i % 3) * 3, 0, TAU); ctx.fill(); }
}
