// PROTOTYPE - NOT FOR PRODUCTION
/**
 * The soap bar. A grid of cells (1 cell = 1 game pixel) is soap (1) or carved away (0). The wanted shape is a
 * template with a signed distance to its outline (positive inside), which decides what the knife may take:
 * outside and near the line is free, deeper inside it only nicks on a very fast slip, and the core never goes.
 *
 * The look is painted per pixel into one image: the top face lit by a normal from a box-blurred height field
 * (rounded bevel, gloss that grows as the sponge smooths the rough cut edges), the side wall extruded straight
 * down under every edge (cut walls show the soap's inner colour), and a soft shadow on the table. Only the
 * area a stroke touched is painted again (dirty rectangle), so carving costs well under a millisecond a frame.
 *
 * Logic functions take plain arrays and work in Node (unit tests); the paint functions need a canvas.
 */

/** Seeded random numbers in [0, 1). */
export function rng(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

// ---------- template ----------
/** Chamfer distance (cells) from each cell whose t equals val to the nearest cell whose t differs. */
function chamfer(t, w, h, val) {
  const d = new Float32Array(w * h), BIG = 1e6, D2 = 1.4142;
  for (let i = 0; i < d.length; i++) d[i] = t[i] === val ? BIG : 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x; if (!d[i]) continue;
    let v = d[i];
    if (x > 0) v = Math.min(v, d[i - 1] + 1);
    if (y > 0) { v = Math.min(v, d[i - w] + 1); if (x > 0) v = Math.min(v, d[i - w - 1] + D2); if (x < w - 1) v = Math.min(v, d[i - w + 1] + D2); }
    d[i] = v;
  }
  for (let y = h - 1; y >= 0; y--) for (let x = w - 1; x >= 0; x--) {
    const i = y * w + x; if (!d[i]) continue;
    let v = d[i];
    if (x < w - 1) v = Math.min(v, d[i + 1] + 1);
    if (y < h - 1) { v = Math.min(v, d[i + w] + 1); if (x < w - 1) v = Math.min(v, d[i + w + 1] + D2); if (x > 0) v = Math.min(v, d[i + w - 1] + D2); }
    d[i] = v;
  }
  return d;
}
/** Signed distance to the template outline: positive inside, negative outside, about ±0.5 on the line. */
export function signedDistance(t, w, h) {
  const a = chamfer(t, w, h, 1), b = chamfer(t, w, h, 0), sd = new Float32Array(w * h);
  for (let i = 0; i < sd.length; i++) sd[i] = t[i] ? a[i] - 0.5 : 0.5 - b[i];
  return sd;
}

/**
 * A new soap. bar = the uncarved soap (1 = soap), tpl = the wanted shape (1 inside), both w x h.
 * k = the knobs: { protect, core, tol, bevel, depth, margin }.
 */
export function makeSoap(w, h, bar, tpl, k) {
  const n = w * h, sd = signedDistance(tpl, w, h), m = Uint8Array.from(bar);
  let outside = 0, inT = 0, anchor = 0, best = -1e9;
  for (let i = 0; i < n; i++) {
    if (bar[i] && !tpl[i]) outside++;
    if (tpl[i]) inT++;
    if (sd[i] > best) { best = sd[i]; anchor = i; }
  }
  return {
    w, h, k, m, bar: Uint8Array.from(bar), t: tpl, sd, anchor, outside, inT,
    rough: new Float32Array(n), cut: new Uint8Array(n), emb: new Float32Array(n), removedOut: 0, nicks: 0,
    dirty: [0, 0, w - 1, h - 1], hs: new Float32Array(n), b: new Float32Array(n), img: null, canvas: null,
  };
}

/** Grow the dirty rectangle to hold cells x0..x1, y0..y1. */
export function markDirty(S, x0, y0, x1, y1) {
  x0 = Math.max(0, Math.floor(x0)); y0 = Math.max(0, Math.floor(y0)); x1 = Math.min(S.w - 1, Math.ceil(x1)); y1 = Math.min(S.h - 1, Math.ceil(y1));
  if (x1 < x0 || y1 < y0) return;
  const d = S.dirty;
  if (!d) S.dirty = [x0, y0, x1, y1];
  else { d[0] = Math.min(d[0], x0); d[1] = Math.min(d[1], y0); d[2] = Math.max(d[2], x1); d[3] = Math.max(d[3], y1); }
}

// ---------- tools ----------
/**
 * Knife along the segment (ax, ay)-(bx, by), blade radius r (cells). fast = the finger moves faster than the
 * slip speed. Returns { removed, outside, nick, skid, cx, cy } (cx, cy = centre of what came off).
 */
export function carve(S, ax, ay, bx, by, r, fast) {
  const { w, h, m, sd, rough, cut } = S, { protect, core } = S.k, rr = r + 3;
  const x0 = Math.max(0, Math.floor(Math.min(ax, bx) - rr)), x1 = Math.min(w - 1, Math.ceil(Math.max(ax, bx) + rr));
  const y0 = Math.max(0, Math.floor(Math.min(ay, by) - rr)), y1 = Math.min(h - 1, Math.ceil(Math.max(ay, by) + rr));
  const dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy || 1e-9, nickR = r * 0.5;
  let removed = 0, outside = 0, nick = 0, skid = 0, sx = 0, sy = 0;
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const i = y * w + x; if (!m[i]) continue;
    const u = clamp01(((x - ax) * dx + (y - ay) * dy) / L2), ex = ax + dx * u - x, ey = ay + dy * u - y, d = Math.sqrt(ex * ex + ey * ey);
    if (d > rr) continue;
    // a scalloped blade edge, fixed per cell, so cuts look hand made instead of perfectly round
    const jag = r * (0.9 + 0.2 * (((x * 73856093) ^ (y * 19349663)) & 255) / 255);
    let take = false;
    if (d <= jag) {
      const s = sd[i];
      if (s <= protect) take = true;
      else if (s <= core && fast && d <= nickR) { take = true; nick++; }
      else skid++;
    }
    if (take) { m[i] = 0; removed++; sx += x; sy += y; if (s0(sd[i])) outside++; rough[i] = 0; cut[i] = 0; }
    else { rough[i] = 1; cut[i] = 1; }
  }
  S.removedOut += outside; S.nicks += nick ? 1 : 0;
  if (removed || skid) markDirty(S, x0, y0, x1, y1);
  return { removed, outside, nick, skid, cx: removed ? sx / removed : bx, cy: removed ? sy / removed : by };
}
const s0 = (s) => s < 0; // a cell outside the wanted shape

/** Remove every soap cell outside the shape whose row is in [ya, yb] (the auto-trim sweeps); returns cells removed. */
export function trimRows(S, ya, yb) {
  const { w, m, sd, rough, cut } = S; let n = 0;
  ya = Math.max(0, ya | 0); yb = Math.min(S.h - 1, yb | 0);
  for (let y = ya; y <= yb; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x; if (!m[i] || sd[i] >= 0) continue;
    m[i] = 0; n++; S.removedOut++;
    for (const j of [i - 1, i + 1, i - w, i + w, i - 2, i + 2, i - 2 * w, i + 2 * w]) if (j >= 0 && j < m.length && m[j]) { rough[j] = 1; cut[j] = 1; }
  }
  if (n) markDirty(S, 0, ya - 1, w - 1, yb + 1);
  return n;
}
/** Share of the soap outside the shape that is gone (0..1). */
export const carvedShare = (S) => (S.outside ? S.removedOut / S.outside : 1);

/** Sponge at (x, y), radius r, for dt seconds at rate (roughness per second). Returns roughness taken off. */
export function sponge(S, x, y, r, rate, dt) {
  const { w, h, m, rough } = S, k = rate * dt;
  let took = 0;
  const x0 = Math.max(0, Math.floor(x - r)), x1 = Math.min(w - 1, Math.ceil(x + r)), y0 = Math.max(0, Math.floor(y - r)), y1 = Math.min(h - 1, Math.ceil(y + r));
  for (let yy = y0; yy <= y1; yy++) for (let xx = x0; xx <= x1; xx++) {
    const i = yy * w + xx; if (!m[i] || !rough[i]) continue;
    if ((xx - x) ** 2 + (yy - y) ** 2 > r * r) continue;
    const v = Math.max(0, rough[i] - k); took += rough[i] - v; rough[i] = v;
  }
  if (took) markDirty(S, x0, y0, x1, y1);
  return took;
}

/** Soap cells at the edge (a non-soap cell within 2 cells across): the cells Smooth judges. */
export function edgeCells(S) {
  const { w, h, m } = S, out = [];
  const off = (x, y) => x < 0 || y < 0 || x >= w || y >= h || !m[y * w + x];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (!m[y * w + x]) continue;
    if (off(x - 1, y) || off(x + 1, y) || off(x, y - 1) || off(x, y + 1) || off(x - 2, y) || off(x + 2, y) || off(x, y - 2) || off(x, y + 2)) out.push(y * w + x);
  }
  return Int32Array.from(out);
}
/** Mean roughness over the given edge cells (only those still soap). */
export function meanRough(S, edges) {
  let s = 0, n = 0;
  for (const i of edges) if (S.m[i]) { s += S.rough[i]; n++; }
  return n ? s / n : 0;
}

/**
 * Pieces cut loose from the main body (4-connected; the body is the part holding the deepest template cell).
 * They are removed from the soap and returned as { cells: Int32Array, x0, y0, x1, y1 }, biggest first.
 * before(list), if given, sees them while still painted.
 */
export function takeIslands(S, before) {
  const { w, h, m } = S, n = w * h;
  if (!S.seen || S.seen.length !== n) { S.seen = new Uint8Array(n); S.q = new Int32Array(n); }
  const seen = S.seen, q = S.q; seen.fill(0);
  const flood = (s, mark) => { // 4-connected fill from s; returns { cells, x0, y0, x1, y1 }
    let qh = 0, qt = 0, x0 = w, y0 = h, x1 = 0, y1 = 0; q[qt++] = s; seen[s] = mark;
    while (qh < qt) {
      const i = q[qh++], x = i % w, y = (i - x) / w;
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
      if (x > 0 && m[i - 1] && !seen[i - 1]) { seen[i - 1] = mark; q[qt++] = i - 1; }
      if (x < w - 1 && m[i + 1] && !seen[i + 1]) { seen[i + 1] = mark; q[qt++] = i + 1; }
      if (y > 0 && m[i - w] && !seen[i - w]) { seen[i - w] = mark; q[qt++] = i - w; }
      if (y < h - 1 && m[i + w] && !seen[i + w]) { seen[i + w] = mark; q[qt++] = i + w; }
    }
    return { cells: q.slice(0, qt), x0, y0, x1, y1 };
  };
  const comps = [];
  if (m[S.anchor]) flood(S.anchor, 1); // the body: usually the only piece, so one fill and one scan
  for (let s = 0; s < n; s++) if (m[s] && !seen[s]) comps.push(flood(s, 2));
  const out = comps;
  if (!out.length) return out;
  if (before) { paint(S); before(out); }
  for (const c of out) {
    for (const i of c.cells) { m[i] = 0; if (S.sd[i] < 0) S.removedOut++; }
    markDirty(S, c.x0 - 1, c.y0 - 1, c.x1 + 1, c.y1 + 1);
  }
  return out.sort((a, b) => b.cells.length - a.cells.length);
}

/**
 * Press a stamp into the soap: shape = a size x size grid of 0..1 (1 = raised part of the stamp), centred on
 * cell (x, y). The pressed cells sink (emb), which the paint turns into an engraved picture. Returns cells pressed.
 */
export function stamp(S, shape, size, x, y) {
  const { w, h, m, emb } = S, x0 = Math.round(x - size / 2), y0 = Math.round(y - size / 2);
  let n = 0;
  for (let j = 0; j < size; j++) for (let i = 0; i < size; i++) {
    const v = shape[j * size + i], cx = x0 + i, cy = y0 + j;
    if (!v || cx < 0 || cy < 0 || cx >= w || cy >= h) continue;
    const k = cy * w + cx; if (!m[k]) continue;
    if (v > emb[k]) { emb[k] = v; n++; }
  }
  if (n) markDirty(S, x0 - 2, y0 - 2, x0 + size + 2, y0 + size + 2);
  return n;
}

// ---------- scores (GDD §4) ----------
/** Shape: how much of the wanted shape is left, minus 1.5 x the share of soap left beyond the tolerance band. */
export function shapeScore(S) {
  const { m, t, sd, bar } = S, tol = S.k.tol;
  let inS = 0, inT = 0, ex = 0, notT = 0;
  for (let i = 0; i < m.length; i++) {
    if (t[i]) { inT++; if (m[i]) inS++; }
    else if (bar[i]) { notT++; if (m[i] && sd[i] < -tol) ex++; }
  }
  const cover = inT ? inS / inT : 0, excess = notT ? ex / notT : 0;
  return { cover, excess, shape: clamp01(cover - 1.5 * excess) };
}
/** Sparkle from glitter specks per 1,000 soap cells and gems placed. */
export const sparkleScore = (density, gems, target) => Math.min(1, density / target) * 0.6 + Math.min(gems, 2) / 2 * 0.4;
/** Weighted total and stars. */
export function verdict(shape, smooth, sparkle) {
  const v = 0.55 * shape + 0.25 * smooth + 0.2 * sparkle;
  return { v, stars: v >= 0.85 ? 3 : v >= 0.6 ? 2 : 1 };
}
/** Number of soap cells. */
export function soapCount(S) { let n = 0; for (let i = 0; i < S.m.length; i++) n += S.m[i]; return n; }

// ---------- compact save of a finished soap ----------
/** The mask as a gw x gh run-length string (runs alternate 0 and 1, base 36). */
export function encodeMask(S, gw = 48, gh = 60) {
  const { w, h, m } = S, runs = []; let cur = 0, len = 0;
  for (let gy = 0; gy < gh; gy++) for (let gx = 0; gx < gw; gx++) {
    const xa = Math.floor(gx * w / gw), xb = Math.floor((gx + 1) * w / gw), ya = Math.floor(gy * h / gh), yb = Math.floor((gy + 1) * h / gh);
    let s = 0, c = 0; for (let y = ya; y < yb; y += 2) for (let x = xa; x < xb; x += 2) { s += m[y * w + x]; c++; }
    const bit = s * 2 >= c ? 1 : 0;
    if (bit === cur) len++; else { runs.push(len.toString(36)); cur = bit; len = 1; }
  }
  runs.push(len.toString(36));
  return runs.join(',');
}
/** A full-size mask (w x h) from encodeMask's string, smoothed by bilinear upsampling; null when the string is bad. */
export function decodeMask(code, w, h, gw = 48, gh = 60) {
  if (typeof code !== 'string' || code.length > 4000) return null;
  const bits = new Uint8Array(gw * gh); let p = 0, cur = 0;
  for (const r of code.split(',')) {
    const n = parseInt(r, 36); if (!(n >= 0) || p + n > bits.length) return null;
    bits.fill(cur, p, p + n); p += n; cur ^= 1;
  }
  if (p !== bits.length) return null;
  const m = new Uint8Array(w * h), at = (x, y) => bits[Math.min(gh - 1, Math.max(0, y)) * gw + Math.min(gw - 1, Math.max(0, x))];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const fx = (x + 0.5) * gw / w - 0.5, fy = (y + 0.5) * gh / h - 0.5, ix = Math.floor(fx), iy = Math.floor(fy), u = fx - ix, v = fy - iy;
    const val = (at(ix, iy) * (1 - u) + at(ix + 1, iy) * u) * (1 - v) + (at(ix, iy + 1) * (1 - u) + at(ix + 1, iy + 1) * u) * v;
    m[y * w + x] = val >= 0.5 ? 1 : 0;
  }
  return m;
}

// ---------- marble ----------
const hex = (c) => { const n = parseInt(c.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; };
function valueNoise(seed) {
  const r = rng(seed), P = new Float32Array(256 * 256); for (let i = 0; i < P.length; i++) P[i] = r();
  return (x, y) => {
    const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
    const a = P[(iy & 255) * 256 + (ix & 255)], b = P[(iy & 255) * 256 + ((ix + 1) & 255)], c = P[((iy + 1) & 255) * 256 + (ix & 255)], d = P[((iy + 1) & 255) * 256 + ((ix + 1) & 255)];
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  };
}
/**
 * The soap's colour per cell (w x h x 3) for a marble { base, vein, swirl, kind }: soft veins, swirl clouds,
 * speckles, rainbow layers or a starry galaxy. Seeded, so the same marble always looks the same.
 */
export function marbleAlbedo(mb, w, h, seed = 7) {
  const out = new Uint8ClampedArray(w * h * 3), N = valueNoise(seed), N2 = valueNoise(seed + 1);
  const base = hex(mb.base), vein = hex(mb.vein), sw = hex(mb.swirl), kind = mb.kind || 'marble', r = rng(seed + 2);
  const fbm = (n, x, y) => n(x, y) * 0.5 + n(x * 2.1, y * 2.1) * 0.27 + n(x * 4.3, y * 4.3) * 0.15 + n(x * 8.7, y * 8.7) * 0.08;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const f = fbm(N, x * 0.011, y * 0.011), g = fbm(N2, x * 0.008 + 3, y * 0.008);
    let c0 = base[0], c1 = base[1], c2 = base[2];
    if (kind === 'layers') { // pastel rainbow bands bent by the noise
      const hue = ((y * 0.0042 + f * 0.9) % 1 + 1) % 1, k = hue * 6, i = Math.floor(k), fr = k - i;
      const rgb = [[1, fr, 0], [1 - fr, 1, 0], [0, 1, fr], [0, 1 - fr, 1], [fr, 0, 1], [1, 0, 1 - fr]][i % 6];
      c0 = 150 + rgb[0] * 105; c1 = 150 + rgb[1] * 105; c2 = 150 + rgb[2] * 105;
    } else {
      const s = Math.max(0, Math.min(1, (g - 0.48) * 4)); // swirl clouds
      c0 += (sw[0] - c0) * s * 0.75; c1 += (sw[1] - c1) * s * 0.75; c2 += (sw[2] - c2) * s * 0.75;
    }
    // a few soft veins that fade in and out along their length
    const a = Math.sin((x * 0.009 + y * 0.006 + f * 2.6) * Math.PI), fade = Math.max(0, Math.min(1, (fbm(N2, x * 0.02, y * 0.02) - 0.38) * 3.5));
    const vv = Math.pow(1 - Math.abs(a), kind === 'galaxy' ? 26 : 14) * 0.9 * fade;
    c0 += (vein[0] - c0) * vv; c1 += (vein[1] - c1) * vv; c2 += (vein[2] - c2) * vv;
    if (kind === 'speckle' || kind === 'galaxy') { if (r() < (kind === 'galaxy' ? 0.006 : 0.012)) { const t = kind === 'galaxy' ? 1 : 0.55; c0 += (255 - c0) * t; c1 += (255 - c1) * t; c2 += (255 - c2) * t; } }
    const grain = (N(x * 0.9, y * 0.9) - 0.5) * 10; // a fine soapy grain
    const i3 = (y * w + x) * 3; out[i3] = c0 + grain; out[i3 + 1] = c1 + grain; out[i3 + 2] = c2 + grain;
  }
  return out;
}

// ---------- paint ----------
const LX = -0.45, LY = -0.65, LZ = 0.62, LL = Math.hypot(LX, LY, LZ), lx = LX / LL, ly = LY / LL, lz = LZ / LL;
const HX = lx, HY = ly, HZ = lz + 1, HL = Math.hypot(HX, HY, HZ), hx = HX / HL, hy = HY / HL, hz = HZ / HL;

/**
 * Attach the paint target: a canvas (w + 2 margin) x (h + depth + 2 margin), the marble colours and the inner
 * colour. Paints everything once.
 */
export function attachPaint(S, canvas, albedo, inner) {
  const { w, h } = S, mg = S.k.margin, D = S.k.depth;
  canvas.width = w + mg * 2; canvas.height = h + D + mg * 2;
  S.canvas = canvas; S.ctx = canvas.getContext('2d');
  S.img = S.ctx.createImageData(canvas.width, canvas.height);
  S.alb = albedo; S.inner = hex(inner);
  if (!S.noise) { const r = rng(91); S.noise = new Float32Array(w * h * 2); for (let i = 0; i < S.noise.length; i++) S.noise[i] = r() - 0.5; }
  S.dirty = [0, 0, w - 1, h - 1];
  paint(S);
}

/** Bring the box-blurred height field up to date for changed cells x0..x1, y0..y1. */
function blurRegion(S, x0, y0, x1, y1) {
  const { w, h, m, hs, b } = S, R = S.k.bevel, area = (2 * R + 1) * (2 * R + 1);
  const xa = Math.max(0, x0 - R), xb = Math.min(w - 1, x1 + R);
  for (let y = y0; y <= y1; y++) { // horizontal sums (depend on this row only)
    const row = y * w; let s = 0;
    for (let k = xa - R; k <= xa + R; k++) if (k >= 0 && k < w) s += m[row + k];
    for (let x = xa; x <= xb; x++) {
      hs[row + x] = s;
      const out = x - R, inn = x + R + 1;
      if (out >= 0) s -= m[row + out];
      if (inn < w) s += m[row + inn];
    }
  }
  const ya = Math.max(0, y0 - R), yb = Math.min(h - 1, y1 + R);
  for (let x = xa; x <= xb; x++) {
    let s = 0;
    for (let k = ya - R; k <= ya + R; k++) if (k >= 0 && k < h) s += hs[k * w + x];
    for (let y = ya; y <= yb; y++) {
      b[y * w + x] = s / area;
      const out = y - R, inn = y + R + 1;
      if (out >= 0) s -= hs[out * w + x];
      if (inn < h) s += hs[inn * w + x];
    }
  }
}

/** Repaint the dirty area, if any. Returns the number of pixels painted. */
export function paint(S) {
  if (!S.dirty || !S.img) return 0;
  const [dx0, dy0, dx1, dy1] = S.dirty; S.dirty = null;
  blurRegion(S, dx0, dy0, dx1, dy1);
  const { w, h, m, b, rough, cut, alb, inner, noise, emb } = S, R = S.k.bevel, D = S.k.depth, mg = S.k.margin;
  const SX = S.k.shadowX, SY = S.k.shadowY, cw = S.canvas.width, ch = S.canvas.height, px = S.img.data;
  // pixels whose look may have changed: blur reach + normals, the wall below, the shadow below-right
  const x0 = Math.max(0, dx0 - R - 1 + mg), x1 = Math.min(cw - 1, dx1 + R + 1 + mg + Math.max(0, SX) + R);
  const y0 = Math.max(0, dy0 - R - 1 + mg), y1 = Math.min(ch - 1, dy1 + R + 1 + mg + D + SY + R);
  const bAt = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : b[y * w + x]), iw = 0.62 / w, ih = 0.38 / h;
  const hAt = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : b[y * w + x] - emb[y * w + x] * 0.5); // the top's height, stamps pressed in
  for (let cx = x0; cx <= x1; cx++) {
    const mx = cx - mg; let lastTop = -1e9;
    for (let k = 1; k <= D; k++) { const yy = y0 - mg - k; if (mx >= 0 && mx < w && yy >= 0 && yy < h && m[yy * w + mx]) { lastTop = yy; break; } }
    for (let cy = y0; cy <= y1; cy++) {
      const my = cy - mg, o = (cy * cw + cx) * 4, inside = mx >= 0 && mx < w && my >= 0 && my < h, i = inside ? my * w + mx : -1;
      if (inside && m[i]) { // ---- top face
        lastTop = my;
        const bv = b[i], tt = clamp01((bv - 0.5) * 2), e = 1 - tt, ro = rough[i] * e;
        let nx = -(hAt(mx + 1, my) - hAt(mx - 1, my)) * 5.5, ny = -(hAt(mx, my + 1) - hAt(mx, my - 1)) * 5.5, nz = 1;
        if (ro > 0) { nx += noise[i * 2] * ro * 2.2; ny += noise[i * 2 + 1] * ro * 2.2; }
        const nl = 1 / Math.sqrt(nx * nx + ny * ny + nz * nz); nx *= nl; ny *= nl; nz *= nl;
        const diff = Math.max(0, nx * lx + ny * ly + nz * lz), sh = Math.max(0, nx * hx + ny * hy + nz * hz);
        const gloss = 1 - 0.9 * rough[i] * Math.min(1, e * 3), sp2 = sh * sh, sp4 = sp2 * sp2, sp16 = sp4 * sp4 * sp4 * sp4, spec = sp16 * gloss * 300 * (0.3 + 0.7 * e); // sh^16
        const u = mx * iw + my * ih - 0.28, uu = 1 - u * u * 24, band = uu > 0 ? uu * uu * 24 : 0; // the soft sheen across the top
        const shade = (0.5 + 0.62 * diff) * (1 - emb[i] * 0.2), a3 = i * 3, glow = 0.16 * e, chalk = 0.42 * ro;
        let r0 = alb[a3] * (shade + glow), g0 = alb[a3 + 1] * (shade + glow), b0 = alb[a3 + 2] * (shade + glow);
        r0 += (250 - r0) * chalk; g0 += (246 - g0) * chalk; b0 += (240 - b0) * chalk;
        px[o] = r0 + spec + band; px[o + 1] = g0 + spec + band; px[o + 2] = b0 + spec + band; px[o + 3] = 255;
        continue;
      }
      const k = my - lastTop;
      if (k >= 1 && k <= D) { // ---- side wall under the edge above
        const ti = lastTop * w + mx, f = k / D;
        let r0, g0, b0;
        const wi = Math.max(0, lastTop - k) * w * 3 + mx * 3; // the marble carries on down through the slab
        if (cut[ti]) { const v = 0.82 + (alb[wi] + alb[wi + 1] + alb[wi + 2]) / 765 * 0.3; r0 = inner[0] * v; g0 = inner[1] * v; b0 = inner[2] * v; }
        else { r0 = alb[wi]; g0 = alb[wi + 1]; b0 = alb[wi + 2]; }
        const side = -(bAt(mx + 1, lastTop) - bAt(mx - 1, lastTop)) * 1.6; // walls facing left catch the light
        let s = 0.74 - 0.2 * f + side * 0.25;
        if (k <= 2) s += 0.22; // the lit lip of the edge
        if (k >= D - 1) s -= 0.12; // contact with the table
        const glow = 0.1 * (1 - f);
        px[o] = r0 * (s + glow); px[o + 1] = g0 * (s + glow); px[o + 2] = b0 * (s + glow); px[o + 3] = 255;
        continue;
      }
      // ---- shadow on the table, cast from the bottom of the bar
      const sv = bAt(mx - SX, my - D - SY) * 0.9 + bAt(mx - SX * 0.4, my - D) * 0.35;
      if (sv > 0.01) { px[o] = 92; px[o + 1] = 52; px[o + 2] = 64; px[o + 3] = Math.min(150, sv * 130); }
      else px[o + 3] = 0;
    }
  }
  S.ctx.putImageData(S.img, 0, 0, x0, y0, x1 - x0 + 1, y1 - y0 + 1);
  return (x1 - x0 + 1) * (y1 - y0 + 1);
}

/**
 * A canvas with just the given island's top and wall, cut from the painted image (call before paint() repaints
 * the area it left). Returns { canvas, x, y } in paint-canvas pixels.
 */
export function islandSprite(S, isl) {
  const { w } = S, mg = S.k.margin, D = S.k.depth, own = new Uint8Array(S.m.length);
  for (const i of isl.cells) own[i] = 1;
  const bx = isl.x0, by = isl.y0, bw = isl.x1 - isl.x0 + 1, bh = isl.y1 - isl.y0 + 1 + D;
  const c = document.createElement('canvas'); c.width = bw; c.height = bh;
  const q = c.getContext('2d'), out = q.createImageData(bw, bh), src = S.img.data, cw = S.canvas.width;
  for (let x = 0; x < bw; x++) {
    let last = -1e9;
    for (let y = 0; y < bh; y++) {
      const mx = bx + x, my = by + y, j = my * w + mx, inIsl = my <= isl.y1 && own[j] === 1;
      if (inIsl) last = my;
      const hidden = !inIsl && my < S.h && S.m[j] === 1; // the body's own top covers this pixel
      if (inIsl || (!hidden && my - last <= D)) {
        const s = ((my + mg) * cw + (mx + mg)) * 4, d = (y * bw + x) * 4;
        out.data[d] = src[s]; out.data[d + 1] = src[s + 1]; out.data[d + 2] = src[s + 2]; out.data[d + 3] = src[s + 3];
      }
    }
  }
  q.putImageData(out, 0, 0);
  return { canvas: c, x: bx + mg, y: by + mg };
}
