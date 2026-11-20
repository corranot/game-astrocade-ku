// PROTOTYPE - NOT FOR PRODUCTION
/**
 * Hair as real strands. Each strand is a chain of points rooted on the top of the head; a follow-the-leader
 * step keeps every segment the same length, points are pushed out of the head so hair drapes around the face,
 * and frizz, volume, wetness and the dryer's wind are forces on the points. Cutting finds the strand
 * segments the finger crossed and drops the rest of the strand as a falling piece; dyeing and foam are per point.
 * Drawing batches segments by colour so a full head is a handful of strokes.
 */
import { NAVY, W } from './art.js';

const EDGE = 40; // hair stays this far inside the screen's sides, where a finger can reach it
const CX = new Float32Array(256), CY = new Float32Array(256); // the correction each point got this step

/** Seeded random numbers (mulberry32): the same seed always makes the same customer. */
export function rng(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

/** Hair colours. 0 is the messy starting colour; 1-12 are free dyes; 13-16 are bought; 16 is the rainbow. */
export const COLORS = ['#9A8775', '#FF6FB5', '#FF4040', '#FF9F1C', '#FFD23F', '#9BE564', '#22C55E', '#14B8A6', '#3B82F6', '#8B5CF6', '#8B5A2B', '#33334A', '#FFE38F', '#C4B5FD', '#6EF0C2', '#FF7F6B', 'rainbow'];
export const FREE_COLORS = 12, RAINBOW = 16;
const RAIN = ['#FF4040', '#FF9F1C', '#FFD23F', '#22C55E', '#3B82F6', '#8B5CF6'];
/** The CSS colour of colour index c at point i of a strand. */
export const colorOf = (c, i) => (c === RAINBOW ? RAIN[Math.min(RAIN.length - 1, Math.floor(i / 2.4))] : COLORS[c]);

/**
 * A new head of messy hair. o: { strands, points, seg, minLen, maxLen, seed }. Strand roots sit on the
 * upper arc of the head circle (radius R), stored relative to the head centre so the hair follows it.
 */
export function createHair(R, o) {
  const rand = rng(o.seed), strands = [];
  for (let k = 0; k < o.strands; k++) {
    const a = -Math.PI + 0.22 + (k + 0.5) / o.strands * (Math.PI - 0.44) + (rand() - 0.5) * 0.05;
    const side = Math.cos(a) < 0 ? -1 : 1, tx = side * -Math.sin(a), ty = side * Math.cos(a), rx = Math.cos(a) * 0.3 + tx, ry = Math.sin(a) * 0.3 + ty, rl = Math.hypot(rx, ry);
    const n = Math.min(255, o.points), s = { a, dx: rx / rl, dy: ry / rl, ax: Math.cos(a) * (R - 10), ay: Math.sin(a) * (R - 12), len: Math.round(o.minLen + rand() * (o.maxLen - o.minLen)),
      x: new Float32Array(n), y: new Float32Array(n), px: new Float32Array(n), py: new Float32Array(n), fx: new Float32Array(n), fy: new Float32Array(n),
      col: new Uint8Array(n), foam: new Uint8Array(n), mark: new Uint8Array(n), goal: false, over: false };
    let dir = a;
    for (let i = 0; i < n; i++) {
      dir += (rand() - 0.5) * 0.9 + (Math.PI / 2 - dir) * 0.12; // outward, bending down, every strand its own tangle
      s.x[i] = s.ax + Math.cos(dir) * o.seg * i; s.y[i] = s.ay + Math.sin(dir) * o.seg * i;
      const f = 250 + rand() * 650, fa = a + (rand() - 0.5) * 2.4;
      s.fx[i] = Math.cos(fa) * f; s.fy[i] = Math.sin(fa) * f - 200;
    }
    strands.push(s);
  }
  return { strands, seg: o.seg, R, wild: 1, volume: 0, wet: 0, dirt: 1, stiff: 0.45, pieces: [], placed: false };
}

/** Put every point at the head's current place (the first frame, or after the head jumped). */
export function placeHair(h, hx, hy) {
  for (const s of h.strands) for (let i = 0; i < s.x.length; i++) { s.x[i] += hx; s.y[i] += hy; s.px[i] = s.x[i]; s.py[i] = s.y[i]; }
  h.placed = true;
}

/**
 * One fixed simulation step. head: {x, y, R}; wind: null or {x, y, r, power}. The body below the head stops
 * hair from swinging through the shoulders.
 */
export function stepHair(h, dt, head, wind, t) {
  const g = 980 * (1 + h.wet * 0.7), dt2 = dt * dt, rc = head.R + 8, rc2 = rc * rc, seg = h.seg, damp = 0.9, st = h.stiff;
  for (const s of h.strands) {
    const { x, y, px, py } = s;
    x[0] = head.x + s.ax; y[0] = head.y + s.ay; px[0] = x[0]; py[0] = y[0];
    for (let i = 1; i <= s.len; i++) {
      const vx = (x[i] - px[i]) * damp, vy = (y[i] - py[i]) * damp;
      px[i] = x[i]; py[i] = y[i];
      let dx = x[i] - head.x, dy = y[i] - head.y; const d = Math.hypot(dx, dy) || 1; dx /= d; dy /= d;
      let fx = h.wild * s.fx[i], fy = g + h.wild * s.fy[i];
      if (wind) {
        const wx = x[i] - wind.x, wy = y[i] - wind.y, wd = Math.hypot(wx, wy);
        if (wd < wind.r) { const k = (1 - wd / wind.r) * wind.power / (wd || 1); fx += wx * k + Math.sin(t * 40 + i) * 250; fy += wy * k - 300; }
      }
      x[i] += vx + fx * dt2; y[i] += vy + fy * dt2;
    }
    let pdx = s.dx, pdy = s.dy; // the direction the hair grows out of the scalp: parted in the middle, along the head
    for (let i = 1; i <= s.len; i++) { // follow the leader: each segment bent toward the one before (stiffness), back to its length, out of the head
      const ox = x[i], oy = y[i];
      let dx = x[i] - x[i - 1], dy = y[i] - y[i - 1], d = Math.hypot(dx, dy) || 1;
      dx = dx / d + pdx * st; dy = dy / d + pdy * st; d = Math.hypot(dx, dy) || 1;
      x[i] = x[i - 1] + dx / d * seg; y[i] = y[i - 1] + dy / d * seg;
      dx = x[i] - head.x; dy = y[i] - head.y; const r2 = dx * dx + dy * dy;
      if (r2 < rc2) { const r = Math.sqrt(r2) || 1; x[i] = head.x + dx / r * rc; y[i] = head.y + dy / r * rc; }
      if (x[i] < EDGE) x[i] = EDGE; else if (x[i] > W - EDGE) x[i] = W - EDGE;
      pdx = (x[i] - x[i - 1]) / seg; pdy = (y[i] - y[i - 1]) / seg;
      CX[i] = x[i] - ox; CY[i] = y[i] - oy;
    }
    // Mueller's FTL velocity correction: each point gives back most of the pull its child needed, which stops the zig-zag
    for (let i = 1; i < s.len; i++) { px[i] += CX[i + 1] * 0.9; py[i] += CY[i + 1] * 0.9; }
  }
  for (const p of h.pieces) { p.life -= dt; p.vy += 900 * dt; for (let i = 0; i < p.x.length; i++) { p.x[i] += p.vx * dt; p.y[i] += p.vy * dt; } p.vx *= 0.98; }
  h.pieces = h.pieces.filter((p) => p.life > 0 && p.y[0] < 1400);
}

/** Whether segment a-b crosses segment c-d. */
function crosses(ax, ay, bx, by, cx, cy, dx, dy) {
  const d1 = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax), d2 = (bx - ax) * (dy - ay) - (by - ay) * (dx - ax);
  const d3 = (dx - cx) * (ay - cy) - (dy - cy) * (ax - cx), d4 = (dx - cx) * (by - cy) - (dy - cy) * (bx - cx);
  return d1 * d2 < 0 && d3 * d4 < 0;
}

/**
 * Cut every strand the finger's move a-b crossed, keeping at least minLen segments. The rest of each strand
 * falls as a piece. Returns how many strands were cut and the lowest length any of them was left at.
 */
export function cutHair(h, ax, ay, bx, by, minLen, maxPieces, onCut) {
  let cut = 0, shortest = 99;
  for (const s of h.strands) for (let i = minLen; i < s.len; i++) {
    if (!crosses(ax, ay, bx, by, s.x[i], s.y[i], s.x[i + 1], s.y[i + 1])) continue;
    if (h.pieces.length < maxPieces) h.pieces.push({ x: Float32Array.from(s.x.subarray(i, s.len + 1)), y: Float32Array.from(s.y.subarray(i, s.len + 1)), col: Uint8Array.from(s.col.subarray(i, s.len + 1)), vx: (s.x[i] - s.x[0]) * 0.6, vy: -60, life: 1.3 });
    if (onCut) onCut(s, (s.y[i] + s.y[i + 1]) / 2);
    s.len = i; for (let j = i + 1; j < s.foam.length; j++) s.foam[j] = 0;
    cut++; shortest = Math.min(shortest, i); break;
  }
  return { cut, shortest };
}

/** Points the brush missed take the colour of the nearest painted point on their strand. */
export function fillUnpainted(h) {
  for (const s of h.strands) {
    let last = -1;
    for (let i = 1; i <= s.len; i++) if (s.mark[i]) last = s.col[i]; else if (last >= 0) { s.col[i] = last; s.mark[i] = 1; }
    last = -1;
    for (let i = s.len; i >= 1; i--) if (s.mark[i]) last = s.col[i]; else if (last >= 0) { s.col[i] = last; s.mark[i] = 1; }
  }
}

/** Trim every strand that reaches below the line y (and is not marked done) at the line; the ends fall. Returns how many were trimmed. */
export function trimToY(h, lineY, minLen, maxPieces) {
  let n = 0;
  for (const s of h.strands) {
    let len = s.len; for (let i = minLen; i <= s.len; i++) if (s.y[i] > lineY + (s.goal ? 40 : 0)) { len = i; break; } // a strand counted as done is still tidied if it fell long
    if (len >= s.len) continue;
    if (h.pieces.length < maxPieces) h.pieces.push({ x: Float32Array.from(s.x.subarray(len, s.len + 1)), y: Float32Array.from(s.y.subarray(len, s.len + 1)), col: Uint8Array.from(s.col.subarray(len, s.len + 1)), vx: (s.x[len] - s.x[0]) * 0.6, vy: -40, life: 1.3 });
    s.len = len; s.goal = true; n++;
  }
  return n;
}

/** Points of the hair within r of (x, y), handed to fn(strand, index); returns how many fn reported as changed. */
function near(h, x, y, r, fn) {
  let n = 0; const r2 = r * r;
  for (const s of h.strands) for (let i = 1; i <= s.len; i++) { const dx = s.x[i] - x, dy = s.y[i] - y; if (dx * dx + dy * dy < r2 && fn(s, i)) n++; }
  return n;
}
/** Lather where the finger rubs; the lather runs along each strand it touches. Returns the number of points newly foamed. */
export const foamAt = (h, x, y, r) => near(h, x, y, r, (s, i) => { let n = 0; for (let j = Math.max(1, i - 2); j <= Math.min(s.len, i + 2); j++) if (!s.foam[j]) { s.foam[j] = 1; n++; } return n > 0; });
/**
 * Dye where the brush passes, soaking one point along the strand each way: points take colour c and count as
 * painted. only(s, i), when given, keeps the dye inside a zone, like colouring inside the lines. Returns how many changed.
 */
export const paintAt = (h, x, y, r, c, only) => near(h, x, y, r, (s, i) => { let n = 0; for (let j = Math.max(1, i - 1); j <= Math.min(s.len, i + 1); j++) if ((!only || only(s, j)) && (s.col[j] !== c || !s.mark[j])) { s.col[j] = c; s.mark[j] = 1; n++; } return n > 0; });

/** How many points the hair has (roots not counted) and how many pass test(strand, i). */
export function count(h, test) {
  let all = 0, yes = 0;
  for (const s of h.strands) for (let i = 1; i <= s.len; i++) { all++; if (test(s, i)) yes++; }
  return { all, yes, share: all ? yes / all : 0 };
}

/** Rinse: foam pops from the tips up, rate points per call. Returns true when no foam is left. */
export function rinse(h, rate) {
  let left = false;
  for (const s of h.strands) { let k = rate; for (let i = s.len; i >= 1 && k > 0; i--) if (s.foam[i]) { s.foam[i] = 0; k--; } if (s.foam.some((f, i) => f && i <= s.len)) left = true; }
  return !left;
}

/**
 * Draw the hair: a coloured cap over the scalp, strands outlined in navy and filled by colour, a light streak,
 * dirt specks while unwashed, and foam bubbles. fine = false skips the streak and bubble outlines (slow phones).
 */
export function drawHair(g, h, head, fine) {
  const w = (19 + h.volume * 7) * (1 - h.wet * 0.15);
  g.lineCap = 'round'; g.lineJoin = 'bevel'; // bevel: the bends are gentle, and round joins cost a circle per point
  // strands: one outline path, then one path per colour
  const out = new Path2D(), byCol = new Map();
  /** Each run of one colour along a strand becomes one polyline: far cheaper to fill than a cap per segment. */
  const runs = (xs, ys, cols, from, to) => {
    let i = from;
    while (i <= to) {
      const c = colorOf(cols[i], i); let p = byCol.get(c); if (!p) byCol.set(c, (p = new Path2D()));
      p.moveTo(xs[i - 1], ys[i - 1]);
      while (i <= to && colorOf(cols[i], i) === c) { p.lineTo(xs[i], ys[i]); i++; }
    }
  };
  for (const s of h.strands) {
    out.moveTo(s.x[0], s.y[0]); for (let i = 1; i <= s.len; i++) out.lineTo(s.x[i], s.y[i]);
    runs(s.x, s.y, s.col, 1, s.len);
  }
  for (const p of h.pieces) runs(p.x, p.y, p.col, 1, p.x.length - 1);
  g.strokeStyle = NAVY; g.lineWidth = w + 7; g.stroke(out);
  for (const p of h.pieces) { g.globalAlpha = Math.min(1, p.life * 1.5); g.beginPath(); for (let i = 0; i < p.x.length; i++) g.lineTo(p.x[i], p.y[i]); g.stroke(); }
  g.globalAlpha = 1; g.lineWidth = w;
  for (const [c, p] of byCol) { g.strokeStyle = c; g.stroke(p); }
  // the cap: a thick band over the scalp in each strand's root colour
  const cap = new Map();
  for (const s of h.strands) { const c = colorOf(s.col[1], 1); let p = cap.get(c); if (!p) cap.set(c, (p = new Path2D())); const r = head.R - 14; p.moveTo(head.x + Math.cos(s.a - 0.06) * r, head.y + Math.sin(s.a - 0.06) * r); p.arc(head.x, head.y, r, s.a - 0.06, s.a + 0.06); }
  g.lineWidth = 46 + h.volume * 10; g.lineCap = 'butt';
  for (const [c, p] of cap) { g.strokeStyle = c; g.stroke(p); }
  g.lineCap = 'round';
  g.beginPath(); g.arc(head.x, head.y, head.R + 9 + h.volume * 5, -Math.PI + 0.2, -0.2); g.lineWidth = 6; g.strokeStyle = NAVY; g.stroke();
  if (fine) { // the shine streak
    const hi = new Path2D();
    for (const s of h.strands) for (let i = 2; i <= Math.min(s.len, 8); i++) { hi.moveTo(s.x[i - 1] - 4, s.y[i - 1] - 3); hi.lineTo(s.x[i] - 4, s.y[i] - 3); }
    g.strokeStyle = h.dirt > 0.5 ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.45)'; g.lineWidth = 4; g.stroke(hi);
    g.beginPath(); g.arc(head.x, head.y, head.R - 6, -2.4, -1.5); g.strokeStyle = 'rgba(255,255,255,0.5)'; g.lineWidth = 8; g.stroke();
  }
  if (h.dirt > 0) { // specks and leaves of the messy start
    g.fillStyle = `rgba(107,84,68,${h.dirt})`; g.beginPath();
    for (const s of h.strands) for (let i = 4; i <= s.len; i += 7) { g.moveTo(s.x[i] + 4, s.y[i]); g.arc(s.x[i], s.y[i], 4, 0, 7); }
    g.fill();
  }
  const bub = new Path2D();
  for (const s of h.strands) for (let i = 1; i <= s.len; i++) if (s.foam[i]) { const r = 12 + ((i * 7 + s.len) % 5) * 2; bub.moveTo(s.x[i] + r, s.y[i]); bub.arc(s.x[i], s.y[i], r, 0, 7); }
  g.fillStyle = '#FFFFFF'; g.fill(bub);
  if (fine) { g.strokeStyle = '#9FDDF7'; g.lineWidth = 3; g.stroke(bub); }
}

/** A compact copy of the hair for the save: each strand's colours as letters, its length by the string's length. */
export const encodeHair = (h) => h.strands.map((s) => Array.from(s.col.subarray(1, s.len + 1), (c) => String.fromCharCode(97 + c)).join('')).join(',');

/** A settled head of hair from a saved copy, for a photo: clean, dried, at rest under the head at (hx, hy). */
export function hairFromCode(code, R, o, hx, hy) {
  const parts = String(code).split(','), h = createHair(R, { ...o, strands: parts.length });
  h.wild = 0; h.dirt = 0; h.volume = 1; h.stiff = o.stiff;
  h.strands.forEach((s, k) => { const str = parts[k] || ''; s.len = Math.max(1, Math.min(o.points - 1, str.length)); for (let i = 1; i <= s.len; i++) s.col[i] = Math.max(0, Math.min(COLORS.length - 1, (str.charCodeAt(i - 1) || 97) - 97)); s.col[0] = s.col[1]; });
  placeHair(h, hx, hy);
  for (let n = 0; n < 160; n++) stepHair(h, 1 / 60, { x: hx, y: hy, R }, null, n / 60);
  return h;
}
