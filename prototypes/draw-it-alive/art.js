// PROTOTYPE - NOT FOR PRODUCTION
/**
 * Sticker-style drawing kit and path maths. Every shape is flat colour with a thick white border.
 * A scene part is drawn inside sticker(): the callback runs twice, first laying all white borders,
 * then all colours, so overlapping pieces share one outline.
 */
export const WHITE = '#FFFFFF', NAVY = '#1F2A6B', SKY = '#3EC5FF', MINT = '#3DDC97', SUNNY = '#FFD23F',
  CORAL = '#FF4D5E', ORANGE = '#FF8A1F', VIOLET = '#7A4DFF', BLUSH = '#FF9EC4', PEN = '#FF2E93', GRASS = '#25B877';
export const BORDER = 10;
let bk = 1; // border scale: a scaled drawing calls borderScale(1 / scale) so its borders stay 10 px on screen
/** Keep borders the same width on screen while drawing at another scale; returns the previous value. */
export function borderScale(k) { const was = bk; bk = k; return was; }
const TAU = Math.PI * 2;
let fill = true; // false while sticker() lays the white borders

/** Run draw twice: white borders, then colours. */
/** True while sticker() is on its colour pass (use it to draw shine only once). */
export const colourPass = () => fill;

export function sticker(draw) { fill = false; draw(); fill = true; draw(); }

/** Ellipse. */
export function blob(ctx, x, y, rx, ry, color, rot = 0) {
  const b = fill ? 0 : BORDER * bk;
  ctx.beginPath(); ctx.ellipse(x, y, Math.max(0.1, rx + b), Math.max(0.1, ry + b), rot, 0, TAU);
  ctx.fillStyle = fill ? color : WHITE; ctx.fill();
}

/** Rounded rectangle (arcTo, because roundRect is missing on older phones). */
export function box(ctx, x, y, w, h, r, color) {
  const b = fill ? 0 : BORDER * bk; x -= b; y -= b; w += 2 * b; h += 2 * b; r = Math.min(r + b, w / 2, h / 2);
  ctx.beginPath(); ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath(); ctx.fillStyle = fill ? color : WHITE; ctx.fill();
}

const trace = (ctx, pts) => { ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]); };

/** Thick round-capped line through pts. */
export function stick(ctx, pts, w, color) {
  if (!pts || pts.length < 2) return;
  ctx.lineCap = ctx.lineJoin = 'round'; trace(ctx, pts);
  ctx.strokeStyle = fill ? color : WHITE; ctx.lineWidth = w + (fill ? 0 : BORDER * bk * 2); ctx.stroke();
}

/** Filled closed polygon through pts. */
export function shape(ctx, pts, color) {
  if (!pts || pts.length < 3) return;
  trace(ctx, pts); ctx.closePath(); ctx.lineJoin = 'round';
  if (fill) { ctx.fillStyle = color; ctx.fill(); } else { ctx.fillStyle = ctx.strokeStyle = WHITE; ctx.lineWidth = BORDER * bk * 2; ctx.fill(); ctx.stroke(); }
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
  const blink = (t % 3.7) < 0.12, r = s * 0.18;
  ctx.fillStyle = ctx.strokeStyle = NAVY; ctx.lineCap = 'round';
  for (const side of [-1, 1]) {
    const ex = x + side * s * 0.36 + ox, ey = y + oy;
    if (mood === 'happy') { ctx.lineWidth = r * 0.8; ctx.beginPath(); ctx.arc(ex, ey + r * 0.5, r, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke(); }
    else {
      ctx.beginPath(); ctx.ellipse(ex, ey, r, blink ? r * 0.15 : r * 1.15, 0, 0, TAU); ctx.fill();
      if (!blink) { ctx.fillStyle = WHITE; ctx.beginPath(); ctx.arc(ex - r * 0.35, ey - r * 0.45, r * 0.38, 0, TAU); ctx.fill(); ctx.fillStyle = NAVY; }
    }
  }
  const my = y + s * 0.42; ctx.lineWidth = s * 0.09;
  ctx.beginPath();
  if (mood === 'happy') ctx.arc(x, my - s * 0.16, s * 0.3, Math.PI * 0.15, Math.PI * 0.85);
  else if (mood === 'draw') ctx.ellipse(x, my, s * 0.1, s * 0.13, 0, 0, TAU);
  else if (mood === 'sad') { ctx.moveTo(x - s * 0.2, my + s * 0.06); ctx.lineTo(x + s * 0.2, my - s * 0.06); }
  else ctx.arc(x, my + s * 0.22, s * 0.24, Math.PI * 1.2, Math.PI * 1.8);
  ctx.stroke();
  if (mood !== 'sad') { ctx.globalAlpha = mood === 'happy' ? 1 : 0.6; ctx.fillStyle = BLUSH; for (const side of [-1, 1]) { ctx.beginPath(); ctx.ellipse(x + side * s * 0.62, y + s * 0.24, s * 0.15, s * 0.1, 0, 0, TAU); ctx.fill(); }  ctx.globalAlpha = 1; }
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

/** Path p moved sideways by d (positive to the left of travel), for bands along a line. */
export function offsetPath(p, d) {
  return p.map((q, i) => {
    const a = p[Math.max(0, i - 1)], b = p[Math.min(p.length - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1;
    return [q[0] + dy / L * d, q[1] - dx / L * d];
  });
}

/** Spiral of n turns inside radius r, as a path from the rim inward. */
export function spiral(cx, cy, r, turns = 2) {
  const out = []; for (let i = 0; i <= 40; i++) { const a = i / 40 * TAU * turns, q = r * (1 - i / 44); out.push([cx + Math.cos(a) * q, cy + Math.sin(a) * q]); } return out;
}

/** Big grass and flowers along the bottom edge, in front of everything in the back layer. */
export function front(ctx, grass, flower) {
  ctx.save(); ctx.translate(0, 1240); ctx.scale(1.8, 1.8); const was = borderScale(1 / 1.8);
  sticker(() => { tuft(ctx, 30, 22, grass); tuft(ctx, 200, 22, grass); tuft(ctx, 370, 22, grass); bloom(ctx, 112, 4, 13, flower); bloom(ctx, 292, 8, 12, ORANGE); });
  borderScale(was); ctx.restore();
}

/** Middle point of a path (mean of its points). */
export function centroid(p) { let x = 0, y = 0; for (const q of p) { x += q[0]; y += q[1]; } return [x / p.length, y / p.length]; }

/** Path p moved by (dx, dy) and scaled by k around (cx, cy). */
export const moved = (p, cx, cy, k, dx = 0, dy = 0) => p.map((q) => [cx + (q[0] - cx) * k + dx, cy + (q[1] - cy) * k + dy]);

/** Closed path through corner points, starting at the first one. */
export const loop = (pts) => [...pts, pts[0]];

// ---------- stickers: four sets of six, drawn at (x, y) with radius r ----------
const eye = (ctx, x, y, r) => { ctx.fillStyle = NAVY; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); };
export const STICKERS = [
  // set 1: friends
  (ctx, x, y, r) => { sticker(() => { blob(ctx, x, y + r * 0.1, r * 0.8, r * 0.75, SUNNY); shape(ctx, [[x + r * 0.5, y], [x + r * 0.95, y + r * 0.15], [x + r * 0.5, y + r * 0.3]], ORANGE); stick(ctx, [[x, y - r * 0.62], [x - r * 0.15, y - r * 0.9]], r * 0.14, SUNNY); }); face(ctx, x, y, r * 0.6, 'happy', 1, null); },
  (ctx, x, y, r) => { sticker(() => { stick(ctx, [[x - r * 0.68, y + r * 0.55], [x + r * 0.55, y + r * 0.55], [x + r * 0.62, y]], r * 0.3, CORAL); blob(ctx, x - r * 0.15, y + r * 0.05, r * 0.6, r * 0.6, VIOLET); }); face(ctx, x + r * 0.7, y - r * 0.05, r * 0.4, 'happy', 1, null); },
  (ctx, x, y, r) => { sticker(() => { shape(ctx, [[x + r * 0.5, y], [x + r * 0.95, y - r * 0.4], [x + r * 0.95, y + r * 0.4]], ORANGE); blob(ctx, x - r * 0.1, y, r * 0.7, r * 0.5, SKY); }); eye(ctx, x - r * 0.4, y - r * 0.1, r * 0.1); },
  (ctx, x, y, r) => { sticker(() => { blob(ctx, x - r * 0.4, y - r * 0.45, r * 0.28, r * 0.28, MINT); blob(ctx, x + r * 0.4, y - r * 0.45, r * 0.28, r * 0.28, MINT); blob(ctx, x, y + r * 0.1, r * 0.85, r * 0.6, MINT); }); eye(ctx, x - r * 0.4, y - r * 0.45, r * 0.12); eye(ctx, x + r * 0.4, y - r * 0.45, r * 0.12); ctx.strokeStyle = NAVY; ctx.lineWidth = r * 0.08; ctx.beginPath(); ctx.arc(x, y + r * 0.05, r * 0.4, 0.3, Math.PI - 0.3); ctx.stroke(); },
  (ctx, x, y, r) => { sticker(() => { blob(ctx, x - r * 0.3, y - r * 0.6, r * 0.18, r * 0.42, WHITE); blob(ctx, x + r * 0.3, y - r * 0.6, r * 0.18, r * 0.42, WHITE); blob(ctx, x, y + r * 0.15, r * 0.65, r * 0.6, WHITE); }); ctx.fillStyle = BLUSH; for (const s of [-1, 1]) { ctx.beginPath(); ctx.ellipse(x + s * r * 0.3, y - r * 0.6, r * 0.08, r * 0.28, 0, 0, TAU); ctx.fill(); } face(ctx, x, y + r * 0.1, r * 0.5, 'happy', 1, null); },
  (ctx, x, y, r) => { sticker(() => { shape(ctx, [[x - r * 0.7, y - r * 0.1], [x - r * 0.6, y - r * 0.85], [x - r * 0.15, y - r * 0.5]], ORANGE); shape(ctx, [[x + r * 0.7, y - r * 0.1], [x + r * 0.6, y - r * 0.85], [x + r * 0.15, y - r * 0.5]], ORANGE); blob(ctx, x, y + r * 0.05, r * 0.75, r * 0.62, ORANGE); }); face(ctx, x, y, r * 0.55, 'happy', 1, null); },
  // set 2: treats
  (ctx, x, y, r) => { sticker(() => { blob(ctx, x, y + r * 0.1, r * 0.7, r * 0.8, CORAL); shape(ctx, [[x - r * 0.4, y - r * 0.6], [x, y - r * 1], [x + r * 0.4, y - r * 0.6]], GRASS); }); ctx.fillStyle = '#FFF0B3'; for (const [a, b] of [[-0.3, 0], [0.3, 0.1], [0, 0.4], [-0.25, 0.55], [0.3, 0.6]]) { ctx.beginPath(); ctx.ellipse(x + a * r, y + b * r, r * 0.05, r * 0.08, 0, 0, TAU); ctx.fill(); } },
  (ctx, x, y, r) => { sticker(() => { blob(ctx, x, y, r * 0.9, r * 0.8, ORANGE); blob(ctx, x, y - r * 0.05, r * 0.78, r * 0.66, BLUSH); }); ctx.fillStyle = ORANGE; ctx.beginPath(); ctx.ellipse(x, y, r * 0.26, r * 0.22, 0, 0, TAU); ctx.fill(); ctx.lineCap = 'round'; ctx.lineWidth = r * 0.08; [SKY, SUNNY, WHITE, MINT].forEach((c, i) => { const a = i * 1.6 + 0.4; ctx.strokeStyle = c; ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * r * 0.45, y + Math.sin(a) * r * 0.4); ctx.lineTo(x + Math.cos(a) * r * 0.6, y + Math.sin(a) * r * 0.5); ctx.stroke(); }); },
  (ctx, x, y, r) => { sticker(() => { shape(ctx, [[x - r * 0.45, y], [x + r * 0.45, y], [x, y + r * 0.95]], ORANGE); blob(ctx, x, y - r * 0.15, r * 0.55, r * 0.45, BLUSH); blob(ctx, x, y - r * 0.6, r * 0.38, r * 0.32, SKY); }); },
  (ctx, x, y, r) => { sticker(() => { stick(ctx, [[x, y + r * 0.2], [x, y + r * 0.95]], r * 0.16, WHITE); blob(ctx, x, y - r * 0.25, r * 0.6, r * 0.6, VIOLET); }); ctx.strokeStyle = '#C9B6FF'; ctx.lineWidth = r * 0.12; ctx.beginPath(); ctx.arc(x, y - r * 0.25, r * 0.32, 0, 4.5); ctx.stroke(); },
  (ctx, x, y, r) => { sticker(() => { box(ctx, x - r * 0.65, y - r * 0.1, r * 1.3, r * 0.8, r * 0.15, BLUSH); box(ctx, x - r * 0.7, y - r * 0.3, r * 1.4, r * 0.3, r * 0.15, WHITE); blob(ctx, x, y - r * 0.55, r * 0.2, r * 0.2, CORAL); }); },
  (ctx, x, y, r) => { sticker(() => star(ctx, x, y, r * 0.9, SUNNY)); face(ctx, x, y + r * 0.05, r * 0.45, 'happy', 1, null); },
  // set 3: sea
  (ctx, x, y, r) => { sticker(() => { for (let i = 0; i < 4; i++) stick(ctx, [[x - r * 0.45 + i * r * 0.3, y + r * 0.1], [x - r * 0.55 + i * r * 0.32, y + r * 0.85]], r * 0.18, VIOLET); blob(ctx, x, y - r * 0.15, r * 0.62, r * 0.55, VIOLET); }); face(ctx, x, y - r * 0.15, r * 0.5, 'happy', 1, null); },
  (ctx, x, y, r) => { sticker(() => { shape(ctx, [[x + r * 0.55, y], [x + r * 0.95, y - r * 0.35], [x + r * 0.9, y + r * 0.25]], SKY); blob(ctx, x - r * 0.1, y + r * 0.05, r * 0.75, r * 0.5, SKY); }); ctx.fillStyle = '#BDEBFF'; ctx.beginPath(); ctx.ellipse(x - r * 0.15, y + r * 0.25, r * 0.5, r * 0.2, 0, 0, TAU); ctx.fill(); eye(ctx, x - r * 0.45, y - r * 0.1, r * 0.09); ctx.strokeStyle = SKY; ctx.lineWidth = r * 0.08; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x - r * 0.2, y - r * 0.5); ctx.lineTo(x - r * 0.2, y - r * 0.8); ctx.moveTo(x - r * 0.2, y - r * 0.8); ctx.lineTo(x - r * 0.4, y - r * 0.92); ctx.moveTo(x - r * 0.2, y - r * 0.8); ctx.lineTo(x, y - r * 0.92); ctx.stroke(); },
  (ctx, x, y, r) => { sticker(() => { for (const sd of [-1, 1]) { stick(ctx, [[x + sd * r * 0.45, y], [x + sd * r * 0.75, y - r * 0.45]], r * 0.16, CORAL); blob(ctx, x + sd * r * 0.75, y - r * 0.55, r * 0.2, r * 0.16, CORAL); stick(ctx, [[x + sd * r * 0.4, y + r * 0.3], [x + sd * r * 0.8, y + r * 0.6]], r * 0.12, CORAL); } blob(ctx, x, y + r * 0.1, r * 0.55, r * 0.42, CORAL); }); face(ctx, x, y + r * 0.05, r * 0.42, 'happy', 1, null); },
  (ctx, x, y, r) => { sticker(() => { blob(ctx, x + r * 0.65, y - r * 0.05, r * 0.22, r * 0.2, MINT); for (const [a, b] of [[-0.45, -0.4], [0.45, -0.4], [-0.45, 0.42], [0.45, 0.42]]) blob(ctx, x + a * r, y + b * r, r * 0.16, r * 0.14, MINT); blob(ctx, x, y, r * 0.55, r * 0.45, GRASS); }); ctx.fillStyle = MINT; for (const [a, b] of [[0, 0], [-0.25, -0.2], [0.25, -0.2], [-0.25, 0.2], [0.25, 0.2]]) { ctx.beginPath(); ctx.arc(x + a * r, y + b * r, r * 0.1, 0, TAU); ctx.fill(); } eye(ctx, x + r * 0.7, y - r * 0.1, r * 0.06); },
  (ctx, x, y, r) => { sticker(() => { for (let i = 0; i < 3; i++) stick(ctx, [[x - r * 0.3 + i * r * 0.3, y + r * 0.1], [x - r * 0.4 + i * r * 0.32, y + r * 0.5], [x - r * 0.25 + i * r * 0.3, y + r * 0.9]], r * 0.1, BLUSH); blob(ctx, x, y - r * 0.15, r * 0.6, r * 0.45, BLUSH); box(ctx, x - r * 0.6, y - r * 0.15, r * 1.2, r * 0.3, r * 0.1, BLUSH); }); face(ctx, x, y - r * 0.2, r * 0.45, 'happy', 1, null); },
  (ctx, x, y, r) => { const fan = [[x, y + r * 0.75]]; for (let k = 0; k <= 10; k++) { const a = Math.PI * (1.1 + k * 0.08); fan.push([x + Math.cos(a) * r * 0.85, y + r * 0.35 + Math.sin(a) * r * 0.95]); } sticker(() => { shape(ctx, fan, BLUSH); box(ctx, x - r * 0.22, y + r * 0.6, r * 0.44, r * 0.25, r * 0.08, BLUSH); }); ctx.strokeStyle = '#FF7FB0'; ctx.lineWidth = r * 0.07; ctx.lineCap = 'round'; for (let k = 1; k < 5; k++) { const a = Math.PI * (1.1 + k * 0.16); ctx.beginPath(); ctx.moveTo(x, y + r * 0.7); ctx.lineTo(x + Math.cos(a) * r * 0.75, y + r * 0.35 + Math.sin(a) * r * 0.85); ctx.stroke(); } },
  // set 4: sky
  (ctx, x, y, r) => { sticker(() => { shape(ctx, [[x - r * 0.3, y + r * 0.45], [x - r * 0.55, y + r * 0.85], [x - r * 0.15, y + r * 0.7]], CORAL); shape(ctx, [[x + r * 0.3, y + r * 0.45], [x + r * 0.55, y + r * 0.85], [x + r * 0.15, y + r * 0.7]], CORAL); blob(ctx, x, y, r * 0.32, r * 0.75, WHITE); shape(ctx, [[x - r * 0.28, y - r * 0.45], [x, y - r * 0.98], [x + r * 0.28, y - r * 0.45]], CORAL); }); ctx.fillStyle = SKY; ctx.beginPath(); ctx.arc(x, y - r * 0.1, r * 0.15, 0, TAU); ctx.fill(); ctx.fillStyle = ORANGE; ctx.beginPath(); ctx.ellipse(x, y + r * 0.85, r * 0.12, r * 0.18, 0, 0, TAU); ctx.fill(); },
  (ctx, x, y, r) => { sticker(() => blob(ctx, x, y, r * 0.75, r * 0.75, SUNNY)); ctx.fillStyle = '#F2A91F'; for (const [a, b, q] of [[-0.3, -0.3, 0.14], [0.3, 0.25, 0.1], [0.25, -0.35, 0.08]]) { ctx.beginPath(); ctx.arc(x + a * r, y + b * r, q * r, 0, TAU); ctx.fill(); } face(ctx, x - r * 0.05, y + r * 0.05, r * 0.45, 'happy', 1, null); },
  (ctx, x, y, r) => { sticker(() => { blob(ctx, x, y, r * 0.55, r * 0.55, VIOLET); }); ctx.strokeStyle = SUNNY; ctx.lineWidth = r * 0.14; ctx.lineCap = 'round'; ctx.beginPath(); ctx.ellipse(x, y, r * 0.95, r * 0.28, -0.35, 0.15, Math.PI - 0.15); ctx.stroke(); face(ctx, x, y - r * 0.05, r * 0.4, 'happy', 1, null); },
  (ctx, x, y, r) => { sticker(() => { blob(ctx, x - r * 0.4, y + r * 0.1, r * 0.4, r * 0.32, WHITE); blob(ctx, x + r * 0.1, y - r * 0.1, r * 0.5, r * 0.45, WHITE); blob(ctx, x + r * 0.5, y + r * 0.15, r * 0.35, r * 0.28, WHITE); }); ctx.fillStyle = SKY; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.ellipse(x - r * 0.35 + i * r * 0.35, y + r * 0.7, r * 0.06, r * 0.13, 0, 0, TAU); ctx.fill(); } face(ctx, x, y, r * 0.4, 'happy', 1, null); },
  (ctx, x, y, r) => { ctx.strokeStyle = NAVY; ctx.lineWidth = r * 0.06; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x, y + r * 0.3); ctx.quadraticCurveTo(x + r * 0.3, y + r * 0.6, x - r * 0.05, y + r * 0.95); ctx.stroke(); sticker(() => { shape(ctx, [[x, y - r * 0.9], [x + r * 0.55, y - r * 0.2], [x, y + r * 0.3], [x - r * 0.55, y - r * 0.2]], ORANGE); }); ctx.strokeStyle = SUNNY; ctx.lineWidth = r * 0.08; ctx.beginPath(); ctx.moveTo(x, y - r * 0.9); ctx.lineTo(x, y + r * 0.3); ctx.moveTo(x - r * 0.55, y - r * 0.2); ctx.lineTo(x + r * 0.55, y - r * 0.2); ctx.stroke(); },
  (ctx, x, y, r) => { sticker(() => { for (const [d, c] of [[0.85, CORAL], [0.68, SUNNY], [0.51, MINT], [0.34, SKY]]) { ctx.save(); stick(ctx, Array.from({ length: 13 }, (_, i) => [x + Math.cos(Math.PI + i / 12 * Math.PI) * r * d, y + r * 0.35 + Math.sin(Math.PI + i / 12 * Math.PI) * r * d]), r * 0.18, c); ctx.restore(); } }); },
  // set 5: winter friends (new; the first 24 sticker ids stay unchanged)
  (ctx, x, y, r) => { sticker(() => { blob(ctx, x, y + r * 0.15, r * 0.72, r * 0.7, WHITE); blob(ctx, x, y - r * 0.48, r * 0.48, r * 0.43, WHITE); stick(ctx, [[x - r * 0.55, y - r * 0.25], [x + r * 0.55, y - r * 0.25]], r * 0.22, CORAL); stick(ctx, [[x + r * 0.24, y - r * 0.25], [x + r * 0.4, y + r * 0.12]], r * 0.18, CORAL); }); face(ctx, x, y - r * 0.48, r * 0.33, 'happy', 1, null); blob(ctx, x, y + r * 0.02, r * 0.1, r * 0.1, ORANGE); },
  (ctx, x, y, r) => { sticker(() => { blob(ctx, x, y - r * 0.12, r * 0.65, r * 0.76, NAVY); blob(ctx, x, y + r * 0.22, r * 0.38, r * 0.52, WHITE); blob(ctx, x + r * 0.55, y - r * 0.15, r * 0.26, r * 0.16, ORANGE); stick(ctx, [[x - r * 0.35, y + r * 0.7], [x + r * 0.35, y + r * 0.7]], r * 0.15, ORANGE); }); face(ctx, x - r * 0.08, y - r * 0.38, r * 0.32, 'happy', 1, null); },
  (ctx, x, y, r) => { sticker(() => { shape(ctx, [[x, y - r], [x + r * 0.8, y - r * 0.1], [x + r * 0.55, y + r * 0.82], [x, y + r], [x - r * 0.55, y + r * 0.82], [x - r * 0.8, y - r * 0.1]], SKY); }); ctx.strokeStyle = WHITE; ctx.lineWidth = r * 0.1; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x - r * 0.55, y); ctx.lineTo(x + r * 0.55, y); ctx.moveTo(x, y - r * 0.68); ctx.lineTo(x, y + r * 0.68); ctx.stroke(); },
  (ctx, x, y, r) => { sticker(() => { blob(ctx, x, y + r * 0.12, r * 0.72, r * 0.76, VIOLET); box(ctx, x - r * 0.65, y - r * 0.18, r * 1.3, r * 0.36, r * 0.16, CORAL); box(ctx, x - r * 0.22, y - r * 0.82, r * 0.44, r * 0.7, r * 0.15, SKY); }); face(ctx, x, y + r * 0.12, r * 0.48, 'happy', 1, null); },
  (ctx, x, y, r) => { sticker(() => { blob(ctx, x, y, r * 0.75, r * 0.75, WHITE); }); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; stick(ctx, [[x + Math.cos(a) * r * 0.22, y + Math.sin(a) * r * 0.22], [x + Math.cos(a) * r * 0.85, y + Math.sin(a) * r * 0.85]], r * 0.12, SKY); } blob(ctx, x, y, r * 0.14, r * 0.14, VIOLET); },
  (ctx, x, y, r) => { sticker(() => { blob(ctx, x, y, r * 0.64, r * 0.72, CORAL); blob(ctx, x, y - r * 0.5, r * 0.72, r * 0.3, VIOLET); box(ctx, x - r * 0.72, y - r * 0.6, r * 1.44, r * 0.2, r * 0.1, VIOLET); }); face(ctx, x, y, r * 0.45, 'happy', 1, null); },
];
