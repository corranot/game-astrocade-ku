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

/** The flood queue of a grid: one Int32Array as large as the grid, made on first use and reused by every flood. */
const queueOf = (g) => g.queue || (g.queue = new Int32Array(g.data.length));
/**
 * Floods face to face through solid cells from the ones already in q[0..n) (stamped `mine` by the caller), stamping
 * each cell reached with `mine`; cells stamped `skip` are left alone. Neighbours are visited in the order of N6.
 * Returns the new length of q.
 */
function flood(g, q, n, mine, skip) {
  const { W, D, H, data, stamp } = g, WD = W * D;
  for (let h = 0; h < n; h++) {
    const i = q[h], x = i % W, z = ((i / W) | 0) % D, y = (i / WD) | 0;
    let j;
    if (x + 1 < W && data[j = i + 1] && stamp[j] !== mine && stamp[j] !== skip) { stamp[j] = mine; q[n++] = j; }
    if (x > 0 && data[j = i - 1] && stamp[j] !== mine && stamp[j] !== skip) { stamp[j] = mine; q[n++] = j; }
    if (y + 1 < H && data[j = i + WD] && stamp[j] !== mine && stamp[j] !== skip) { stamp[j] = mine; q[n++] = j; }
    if (y > 0 && data[j = i - WD] && stamp[j] !== mine && stamp[j] !== skip) { stamp[j] = mine; q[n++] = j; }
    if (z + 1 < D && data[j = i + W] && stamp[j] !== mine && stamp[j] !== skip) { stamp[j] = mine; q[n++] = j; }
    if (z > 0 && data[j = i - W] && stamp[j] !== mine && stamp[j] !== skip) { stamp[j] = mine; q[n++] = j; }
  }
  return n;
}
/** Does any of these cells have a solid block next to it (face to face)? */
function touchesSolid(g, cells) {
  for (const c of cells) for (let k = 0; k < 6; k++) { const a = N6[k]; if (g.get(c.x + a[0], c.y + a[1], c.z + a[2])) return true; }
  return false;
}

/**
 * After blocks were removed: finds every solid piece no longer connected (face to face) to a block on the ground
 * (y = 0), empties it from the grid and returns it as clusters [{cells: [{x, y, z, m}], minY}]. Only pieces next
 * to the removed cells can have lost their support, so only those are flooded; the ground flood runs once, and not
 * at all when nothing solid touches the removed cells (the last blocks of a wall, a hole dug into open air).
 */
export function collapse(g, removed, maxCells = 6000) {
  if (!removed.length || !touchesSolid(g, removed)) return [];
  const { W, D, data, stamp } = g, WD = W * D, q = queueOf(g);
  // 1. mark everything held up by the ground
  const ground = ++g.mark;
  let n = 0;
  for (let i = 0; i < WD; i++) if (data[i]) { stamp[i] = ground; q[n++] = i; }
  flood(g, q, n, ground, ground);
  // 2. any solid neighbour of a removed cell that the ground did not reach starts a falling cluster
  const clusters = [];
  for (const c of removed) for (let k = 0; k < 6; k++) {
    const X = c.x + N6[k][0], Y = c.y + N6[k][1], Z = c.z + N6[k][2]; if (!g.inside(X, Y, Z)) continue;
    const s = g.idx(X, Y, Z); if (!data[s] || stamp[s] === ground) continue;
    const mine = ++g.mark, cells = []; stamp[s] = mine; q[0] = s; let minY = Y;
    const m = flood(g, q, 1, mine, ground);
    for (let h = 0; h < m; h++) {
      const i = q[h], y = (i / WD) | 0;
      if (cells.length < maxCells) cells.push({ x: i % W, y, z: ((i / W) | 0) % D, m: data[i] });
      if (y < minY) minY = y;
      // gone from the grid; never picked up twice
      data[i] = 0; stamp[i] = ground;
    }
    clusters.push({ cells, minY, total: m });
  }
  return clusters;
}

/**
 * A storey too weak to carry what stands on it: looks at the piece of building next to the removed cells and returns
 * the cells of its lowest layer that kept at most `ratio` of the blocks it was built with (g.orig, within the piece's
 * footprint) while at least `minAbove` blocks still rest above it. Empty when every layer holds.
 */
export function weakLayer(g, removed, ratio, minAbove) {
  const { W, D, H, data, stamp, orig } = g, WD = W * D;
  if (!orig) return [];
  for (const c of removed) for (let k = 0; k < 6; k++) {
    const X = c.x + N6[k][0], Y = c.y + N6[k][1], Z = c.z + N6[k][2]; if (!g.inside(X, Y, Z)) continue;
    const s = g.idx(X, Y, Z); if (!data[s]) continue;
    // the queue and the per-layer counts belong to the grid: reused by every call
    const mine = ++g.mark, q = queueOf(g), cnt = g.layers || (g.layers = new Int32Array(H)); stamp[s] = mine; q[0] = s; cnt.fill(0);
    const n = flood(g, q, 1, mine, mine);
    let x0 = X, x1 = X, z0 = Z, z1 = Z;
    for (let h = 0; h < n; h++) {
      const i = q[h], x = i % W, z = ((i / W) | 0) % D;
      cnt[(i / WD) | 0]++; if (x < x0) x0 = x; if (x > x1) x1 = x; if (z < z0) z0 = z; if (z > z1) z1 = z;
    }
    let above = n;
    for (let y = 0; y < H; y++) {
      above -= cnt[y]; if (above < minAbove) break;
      if (!cnt[y]) continue;
      let was = 0; for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) if (orig[g.idx(x, y, z)]) was++;
      if (cnt[y] > ratio * was) continue;
      const out = [];
      for (let h = 0; h < n; h++) { const i = q[h]; if (((i / WD) | 0) === y) { out.push({ x: i % W, y, z: ((i / W) | 0) % D, m: data[i] }); data[i] = 0; } }
      return out;
    }
    return [];
  }
  return [];
}

/**
 * Rebuilds the dirty chunks nearest to the eye (ex, ey, ez) first until budgetMs is spent, always at least one; the
 * rest stay dirty for the next frames (the rules read the grid, so only the picture is a frame or two behind).
 * dirty: a Set of 'cx,cy,cz' keys of chunks CS cells wide; build(cx, cy, cz) rebuilds one; now() gives milliseconds.
 * Returns how many were rebuilt.
 */
export function remeshNearest(dirty, ex, ey, ez, CS, budgetMs, now, build) {
  if (!dirty.size) return 0;
  const list = [];
  for (const k of dirty) {
    const p = k.split(','), cx = +p[0], cy = +p[1], cz = +p[2], dx = (cx + 0.5) * CS - ex, dy = (cy + 0.5) * CS - ey, dz = (cz + 0.5) * CS - ez;
    list.push({ k, cx, cy, cz, d: dx * dx + dy * dy + dz * dz });
  }
  list.sort((a, b) => a.d - b.d);
  const t0 = now(); let n = 0;
  for (const c of list) {
    if (n && now() - t0 >= budgetMs) break;
    build(c.cx, c.cy, c.cz); dirty.delete(c.k); n++;
  }
  return n;
}

// Face table: normal, the quad's u and v edges (u × v = normal) and the corner the quad starts from.
// up: which quad edge runs up the wall (so a texture's rows stay level); none on the top and bottom faces
const FACES = [
  { n: [1, 0, 0], u: [0, 1, 0], v: [0, 0, 1], o: [1, 0, 0], up: 'u' },
  { n: [-1, 0, 0], u: [0, 0, 1], v: [0, 1, 0], o: [0, 0, 0], up: 'v' },
  { n: [0, 1, 0], u: [0, 0, 1], v: [1, 0, 0], o: [0, 1, 0], up: 'v' },
  { n: [0, -1, 0], u: [1, 0, 0], v: [0, 0, 1], o: [0, 0, 0], up: 'v' },
  { n: [0, 0, 1], u: [1, 0, 0], v: [0, 1, 0], o: [0, 0, 1], up: 'v' },
  { n: [0, 0, -1], u: [0, 1, 0], v: [1, 0, 0], o: [0, 0, 0], up: 'u' },
];
const ATLAS = 4, INSET = 0.03; // tiles per row in the texture atlas, edge inset against bleeding
const AO = [0.42, 0.62, 0.8, 1];
/** A small stable hash in 0..1 for a cell, for the per-block colour jitter. */
export const hash3 = (x, y, z) => { let h = (x * 374761393 + y * 668265263 + z * 2147483647) | 0; h = (h ^ (h >>> 13)) * 1274126177 | 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };

// The mesher's scratch: reused by every call and grown when a region needs more room (the result is copied out at
// its exact size, so nothing is pushed value by value)
let mCap = 0, mPos = null, mNor = null, mCol = null, mUv = null, mInd = null;
const mAo = [0, 0, 0, 0];
function meshRoom(faces) {
  const n = Math.max(faces, mCap * 2, 2048), grow = (old, a) => { if (old) a.set(old); return a; };
  mPos = grow(mPos, new Float32Array(n * 12)); mNor = grow(mNor, new Float32Array(n * 12)); mCol = grow(mCol, new Float32Array(n * 12));
  mUv = grow(mUv, new Float32Array(n * 8)); mInd = grow(mInd, new Uint32Array(n * 6));
  mCap = n;
}

/**
 * Builds the visible faces of the cells in [x0, x1)×[y0, y1)×[z0, z1). get(x, y, z) gives a material id for any cell
 * (also outside the range, for culling and occlusion); palette[m] = [r, g, b] linear; jitter[m] = 0..1 strength.
 * Faces below y = 0 are never built (the ground hides them). shade(x, y, z) optionally darkens a block (scorch);
 * tiles[m] picks a texture-atlas tile per material (uvs are then built, rows level on the walls).
 * Returns typed arrays for a geometry, positions relative to (ox, oy, oz).
 */
export function meshRegion(get, x0, y0, z0, x1, y1, z1, palette, jitter, ox = 0, oy = 0, oz = 0, floorY = 0, shade = null, tiles = null) {
  let vi = 0, fc = 0;
  const ao = mAo;
  // a material without a palette colour (boom barrel: drawn as a barrel by the look) counts as empty here
  const solid = (x, y, z) => { if (y < floorY) return 1; const m = get(x, y, z); return m && palette[m] ? 1 : 0; };
  for (let y = y0; y < y1; y++) for (let z = z0; z < z1; z++) for (let x = x0; x < x1; x++) {
    const m = get(x, y, z); if (!m || !palette[m]) continue;
    const base = palette[m], j = (1 + ((hash3(x, y, z) - 0.5) * 2) * (jitter[m] || 0)) * (shade ? shade(x, y, z) : 1);
    for (let fi = 0; fi < 6; fi++) {
      const f = FACES[fi], fn = f.n, fu = f.u, fv = f.v, fo = f.o;
      const X = x + fn[0], Y = y + fn[1], Z = z + fn[2];
      if (solid(X, Y, Z)) continue;
      if (fc >= mCap) meshRoom(fc + 1);
      for (let c = 0; c < 4; c++) {
        const cu = c === 1 || c === 2 ? 1 : -1, cv = c >= 2 ? 1 : -1;
        const s1 = solid(X + fu[0] * cu, Y + fu[1] * cu, Z + fu[2] * cu);
        const s2 = solid(X + fv[0] * cv, Y + fv[1] * cv, Z + fv[2] * cv);
        const cr = solid(X + fu[0] * cu + fv[0] * cv, Y + fu[1] * cu + fv[1] * cv, Z + fu[2] * cu + fv[2] * cv);
        ao[c] = s1 && s2 ? 0 : 3 - (s1 + s2 + cr);
      }
      for (let c = 0; c < 4; c++) {
        const du = c === 1 || c === 2 ? 1 : 0, dv = c >= 2 ? 1 : 0, p = (vi + c) * 3;
        mPos[p] = x + fo[0] + fu[0] * du + fv[0] * dv - ox; mPos[p + 1] = y + fo[1] + fu[1] * du + fv[1] * dv - oy; mPos[p + 2] = z + fo[2] + fu[2] * du + fv[2] * dv - oz;
        mNor[p] = fn[0]; mNor[p + 1] = fn[1]; mNor[p + 2] = fn[2];
        const k = AO[ao[c]] * j; mCol[p] = base[0] * k; mCol[p + 1] = base[1] * k; mCol[p + 2] = base[2] * k;
        if (tiles) { const t = tiles[m] || 0, a = f.up === 'u' ? dv : du, b = f.up === 'u' ? du : dv, u = (vi + c) * 2; mUv[u] = ((t % ATLAS) + INSET + a * (1 - 2 * INSET)) / ATLAS; mUv[u + 1] = 1 - (Math.floor(t / ATLAS) + 1 - INSET - b * (1 - 2 * INSET)) / ATLAS; }
      }
      const o = fc * 6;
      if (ao[1] + ao[3] > ao[0] + ao[2]) { mInd[o] = vi; mInd[o + 1] = vi + 1; mInd[o + 2] = vi + 3; mInd[o + 3] = vi + 1; mInd[o + 4] = vi + 2; mInd[o + 5] = vi + 3; }
      else { mInd[o] = vi; mInd[o + 1] = vi + 1; mInd[o + 2] = vi + 2; mInd[o + 3] = vi; mInd[o + 4] = vi + 2; mInd[o + 5] = vi + 3; }
      vi += 4; fc++;
    }
  }
  if (!fc) return { positions: new Float32Array(0), normals: new Float32Array(0), colors: new Float32Array(0), uvs: tiles ? new Float32Array(0) : null, indices: new Uint16Array(0), faces: 0 };
  return {
    positions: mPos.slice(0, vi * 3), normals: mNor.slice(0, vi * 3), colors: mCol.slice(0, vi * 3), uvs: tiles ? mUv.slice(0, vi * 2) : null,
    indices: vi > 65000 ? mInd.slice(0, fc * 6) : new Uint16Array(mInd.subarray(0, fc * 6)), faces: fc,
  };
}
