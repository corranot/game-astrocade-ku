// PROTOTYPE - NOT FOR PRODUCTION
// Voxel world for Block Smash Crew: the grid of block materials, a mesher with per-corner ambient occlusion, a grid
// ray cast, sphere smashing and the collapse check (blocks no longer connected to the ground fall as one piece).
// Pure: no Three.js here, so the rules can be tested in Node.

/** A W×H×D grid of material ids (0 = empty). Cell (x, y, z) fills [x, x+1]×[y, y+1]×[z, z+1]; y = 0 sits on the ground. */
export function createGrid(W, H, D) {
  const data = new Uint8Array(W * H * D);
  const g = {
    W, H, D, data,
    stamp: new Uint32Array(W * H * D), mark: 0, // flood marks, reused every collapse check
    idx: (x, y, z) => (y * D + z) * W + x,
    inside: (x, y, z) => x >= 0 && y >= 0 && z >= 0 && x < W && y < H && z < D,
    get(x, y, z) { return x >= 0 && y >= 0 && z >= 0 && x < W && y < H && z < D ? data[(y * D + z) * W + x] : 0; },
    set(x, y, z, m) { if (x >= 0 && y >= 0 && z >= 0 && x < W && y < H && z < D) data[(y * D + z) * W + x] = m; },
    count() { let n = 0; for (let i = 0; i < data.length; i++) if (data[i]) n++; return n; },
  };
  return g;
}

/** Fills the box [x0..x1]×[y0..y1]×[z0..z1] (inclusive) with m. */
export function fill(g, x0, y0, z0, x1, y1, z1, m) {
  for (let y = Math.max(0, y0); y <= Math.min(g.H - 1, y1); y++) for (let z = Math.max(0, z0); z <= Math.min(g.D - 1, z1); z++) for (let x = Math.max(0, x0); x <= Math.min(g.W - 1, x1); x++) g.data[g.idx(x, y, z)] = m;
}

/**
 * Walks the grid along a ray (Amanatides & Woo). Returns the first solid cell within maxDist as
 * {x, y, z, nx, ny, nz, t} (n = the face it was entered through), or null. Cells at y ≥ skipY are passed through.
 */
export function raycast(g, ox, oy, oz, dx, dy, dz, maxDist, skipY = Infinity) {
  const len = Math.hypot(dx, dy, dz) || 1; dx /= len; dy /= len; dz /= len;
  let x = Math.floor(ox), y = Math.floor(oy), z = Math.floor(oz);
  const sx = dx > 0 ? 1 : -1, sy = dy > 0 ? 1 : -1, sz = dz > 0 ? 1 : -1;
  const tdx = dx ? Math.abs(1 / dx) : Infinity, tdy = dy ? Math.abs(1 / dy) : Infinity, tdz = dz ? Math.abs(1 / dz) : Infinity;
  let tx = dx ? ((dx > 0 ? x + 1 - ox : ox - x) * tdx) : Infinity, ty = dy ? ((dy > 0 ? y + 1 - oy : oy - y) * tdy) : Infinity, tz = dz ? ((dz > 0 ? z + 1 - oz : oz - z) * tdz) : Infinity;
  let nx = 0, ny = 0, nz = 0, t = 0;
  for (let i = 0; i < 512 && t <= maxDist; i++) {
    if (y < skipY && g.get(x, y, z)) return { x, y, z, nx, ny, nz, t }; // cells at or above skipY are cut away (not shown)
    if (tx < ty && tx < tz) { t = tx; x += sx; tx += tdx; nx = -sx; ny = 0; nz = 0; }
    else if (ty < tz) { t = ty; y += sy; ty += tdy; nx = 0; ny = -sy; nz = 0; }
    else { t = tz; z += sz; tz += tdz; nx = 0; ny = 0; nz = -sz; }
  }
  return null;
}

/**
 * Empties every cell whose centre lies within r of (cx, cy, cz). Hard materials stay unless canHard.
 * Returns {removed: [{x, y, z, m}], hard: number of hard cells that resisted}.
 */
export function smashSphere(g, cx, cy, cz, r, mats, canHard) {
  const removed = []; let hard = 0;
  const r2 = r * r;
  for (let y = Math.max(0, Math.floor(cy - r)); y <= Math.min(g.H - 1, Math.floor(cy + r)); y++)
    for (let z = Math.max(0, Math.floor(cz - r)); z <= Math.min(g.D - 1, Math.floor(cz + r)); z++)
      for (let x = Math.max(0, Math.floor(cx - r)); x <= Math.min(g.W - 1, Math.floor(cx + r)); x++) {
        const i = g.idx(x, y, z), m = g.data[i]; if (!m) continue;
        const ddx = x + 0.5 - cx, ddy = y + 0.5 - cy, ddz = z + 0.5 - cz;
        if (ddx * ddx + ddy * ddy + ddz * ddz > r2) continue;
        if (mats[m] && mats[m].hard && !canHard) { hard++; continue; }
        g.data[i] = 0; removed.push({ x, y, z, m });
      }
  return { removed, hard };
}

const N6 = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];

/**
 * After blocks were removed: finds every solid piece no longer connected (face to face) to a block on the ground
 * (y = 0), empties it from the grid and returns it as clusters [{cells: [{x, y, z, m}], minY}]. Only pieces next
 * to the removed cells can have lost their support, so only those are flooded; the ground flood runs once.
 */
export function collapse(g, removed, maxCells = 6000) {
  if (!removed.length) return [];
  const { W, D, data, stamp } = g;
  // 1. mark everything held up by the ground
  const ground = ++g.mark;
  const q = [];
  for (let z = 0; z < D; z++) for (let x = 0; x < W; x++) { const i = g.idx(x, 0, z); if (data[i]) { stamp[i] = ground; q.push(i); } }
  const WD = W * D;
  for (let h = 0; h < q.length; h++) {
    const i = q[h], x = i % W, z = ((i / W) | 0) % D, y = (i / WD) | 0;
    for (const [ax, ay, az] of N6) {
      const X = x + ax, Y = y + ay, Z = z + az;
      if (X < 0 || Y < 0 || Z < 0 || X >= W || Y >= g.H || Z >= D) continue;
      const j = g.idx(X, Y, Z); if (data[j] && stamp[j] !== ground) { stamp[j] = ground; q.push(j); }
    }
  }
  // 2. any solid neighbour of a removed cell that the ground did not reach starts a falling cluster
  const clusters = [];
  for (const c of removed) for (const [ax, ay, az] of N6) {
    const X = c.x + ax, Y = c.y + ay, Z = c.z + az; if (!g.inside(X, Y, Z)) continue;
    const s = g.idx(X, Y, Z); if (!data[s] || stamp[s] === ground) continue;
    const mine = ++g.mark, cells = [], cq = [s]; stamp[s] = mine; let minY = Y;
    for (let h = 0; h < cq.length; h++) {
      const i = cq[h], x = i % W, z = ((i / W) | 0) % D, y = (i / WD) | 0;
      if (cells.length < maxCells) cells.push({ x, y, z, m: data[i] });
      if (y < minY) minY = y;
      for (const [bx, by, bz] of N6) {
        const X2 = x + bx, Y2 = y + by, Z2 = z + bz;
        if (X2 < 0 || Y2 < 0 || Z2 < 0 || X2 >= W || Y2 >= g.H || Z2 >= D) continue;
        const j = g.idx(X2, Y2, Z2); if (data[j] && stamp[j] !== mine && stamp[j] !== ground) { stamp[j] = mine; cq.push(j); }
      }
    }
    for (const i of cq) { data[i] = 0; stamp[i] = ground; } // gone from the grid; never picked up twice
    clusters.push({ cells, minY, total: cq.length });
  }
  return clusters;
}

// Face table: normal, the quad's u and v edges (u × v = normal) and the corner the quad starts from.
const FACES = [
  { n: [1, 0, 0], u: [0, 1, 0], v: [0, 0, 1], o: [1, 0, 0] },
  { n: [-1, 0, 0], u: [0, 0, 1], v: [0, 1, 0], o: [0, 0, 0] },
  { n: [0, 1, 0], u: [0, 0, 1], v: [1, 0, 0], o: [0, 1, 0] },
  { n: [0, -1, 0], u: [1, 0, 0], v: [0, 0, 1], o: [0, 0, 0] },
  { n: [0, 0, 1], u: [1, 0, 0], v: [0, 1, 0], o: [0, 0, 1] },
  { n: [0, 0, -1], u: [0, 1, 0], v: [1, 0, 0], o: [0, 0, 0] },
];
const AO = [0.42, 0.62, 0.8, 1];
/** A small stable hash in 0..1 for a cell, for the per-block colour jitter. */
export const hash3 = (x, y, z) => { let h = (x * 374761393 + y * 668265263 + z * 2147483647) | 0; h = (h ^ (h >>> 13)) * 1274126177 | 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };

/**
 * Builds the visible faces of the cells in [x0, x1)×[y0, y1)×[z0, z1). get(x, y, z) gives a material id for any cell
 * (also outside the range, for culling and occlusion); palette[m] = [r, g, b] linear; jitter[m] = 0..1 strength.
 * Faces below y = 0 are never built (the ground hides them). shade(x, y, z) optionally darkens a block (scorch).
 * Returns typed arrays for a geometry, positions relative to (ox, oy, oz).
 */
export function meshRegion(get, x0, y0, z0, x1, y1, z1, palette, jitter, ox = 0, oy = 0, oz = 0, floorY = 0, shade = null) {
  const pos = [], nor = [], col = [], ind = [];
  let vi = 0;
  // a material without a palette colour (TNT: drawn as a barrel by the look) counts as empty here
  const solid = (x, y, z) => { if (y < floorY) return 1; const m = get(x, y, z); return m && palette[m] ? 1 : 0; };
  for (let y = y0; y < y1; y++) for (let z = z0; z < z1; z++) for (let x = x0; x < x1; x++) {
    const m = get(x, y, z); if (!m || !palette[m]) continue;
    const base = palette[m], j = (1 + ((hash3(x, y, z) - 0.5) * 2) * (jitter[m] || 0)) * (shade ? shade(x, y, z) : 1);
    for (const f of FACES) {
      const X = x + f.n[0], Y = y + f.n[1], Z = z + f.n[2];
      if (solid(X, Y, Z)) continue;
      const ao = [0, 0, 0, 0];
      for (let c = 0; c < 4; c++) {
        const cu = c === 1 || c === 2 ? 1 : -1, cv = c >= 2 ? 1 : -1;
        const s1 = solid(X + f.u[0] * cu, Y + f.u[1] * cu, Z + f.u[2] * cu);
        const s2 = solid(X + f.v[0] * cv, Y + f.v[1] * cv, Z + f.v[2] * cv);
        const cr = solid(X + f.u[0] * cu + f.v[0] * cv, Y + f.u[1] * cu + f.v[1] * cv, Z + f.u[2] * cu + f.v[2] * cv);
        ao[c] = s1 && s2 ? 0 : 3 - (s1 + s2 + cr);
      }
      for (let c = 0; c < 4; c++) {
        const du = c === 1 || c === 2 ? 1 : 0, dv = c >= 2 ? 1 : 0;
        pos.push(x + f.o[0] + f.u[0] * du + f.v[0] * dv - ox, y + f.o[1] + f.u[1] * du + f.v[1] * dv - oy, z + f.o[2] + f.u[2] * du + f.v[2] * dv - oz);
        nor.push(f.n[0], f.n[1], f.n[2]);
        const k = AO[ao[c]] * j; col.push(base[0] * k, base[1] * k, base[2] * k);
      }
      if (ao[1] + ao[3] > ao[0] + ao[2]) ind.push(vi, vi + 1, vi + 3, vi + 1, vi + 2, vi + 3);
      else ind.push(vi, vi + 1, vi + 2, vi, vi + 2, vi + 3);
      vi += 4;
    }
  }
  return {
    positions: new Float32Array(pos), normals: new Float32Array(nor), colors: new Float32Array(col),
    indices: vi > 65000 ? new Uint32Array(ind) : new Uint16Array(ind), faces: vi / 4,
  };
}
