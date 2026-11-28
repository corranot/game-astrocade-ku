// PROTOTYPE - NOT FOR PRODUCTION
// Mow Mow Meadow rules: no 3D and no page here, so every rule runs under node --test.
// A garden is a grid of cells; x runs west to east from 0 to w, z runs north to south from 0 to d (metres). The gate is
// in the north fence, the player starts in the south.

export const T = { OUT: 0, GRASS: 1, BED: 2, PATH: 3, WATER: 4, SOLID: 5, SOIL: 6 };
export const H = { CUT: 0, TALL: 170, EXTRA: 255 };
export const GATE_HALF_M = 1.7;
/** Half the width of Buzzy's body, in metres: what must fit between the gate posts. */
export const BODY_M = 0.75;

/** Seeded generator (mulberry32). Returns a function giving numbers in [0, 1). */
export function rng(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;

// ---------------------------------------------------------------- upgrades and economy

/** The value an upgrade gives at a level: deck width (m), engine speed (m/s) or bale size (m2). */
export function upValue(cfg, kind, lv) {
  const u = cfg.upgrades, n = clamp(lv, 0, u.levels);
  if (kind === 'baler') return u.baler.sizes[n];
  return +lerp(u[kind].from, u[kind].to, n / u.levels).toFixed(3);
}
/** Coins for the next level of an upgrade, or Infinity at the top level. */
export function upPrice(cfg, kind, lv) {
  const u = cfg.upgrades; if (lv >= u.levels) return Infinity;
  return Math.round(u[kind].base * Math.pow(u.growth, lv) / 5) * 5;
}
/** How far (m) the baler pulls bales in. */
export function baleReach(cfg, lv) { const u = cfg.upgrades; return lerp(u.baler.reachFrom, u.baler.reachTo, clamp(lv, 0, u.levels) / u.levels); }
/** Coins in one bale of `m2` clippings filled at an average Flow of `flow` (0 to 1). */
export function baleCoins(cfg, m2, flow, wet = 0) {
  return Math.max(1, Math.round(m2 * cfg.economy.perM2 * (1 + (cfg.flow.baleMul - 1) * clamp(flow, 0, 1)) * (1 + (cfg.economy.wetMul - 1) * clamp(wet, 0, 1))));
}
/** Stars (0 to 3) for a coverage share. Star 3 needs every cell. */
export function starsFor(cfg, g) {
  const c = coverage(g); let s = 0;
  for (let i = 0; i < 3; i++) if (i === 2 ? g.cutCount >= g.grassCount : c >= cfg.stars[i]) s = i + 1;
  return s;
}
/** The tip paid when a garden first reaches star `star` (1 to 3). */
export function tip(cfg, g, star) { return Math.round(g.areaM2 * cfg.economy.tipK * cfg.economy.starFactor[star - 1]); }
/** Coins in a coin find in garden number `n` (1-based). */
export function findCoins(cfg, n) { return cfg.economy.findBase + cfg.economy.findPerGarden * n; }

// ---------------------------------------------------------------- Flow

/** Advances Flow. `fresh` is the share of the footprint that met tall grass this step. Returns the same object. */
export function flowStep(cfg, f, fresh, dt) {
  const c = cfg.flow;
  if (fresh >= c.freshShare) { f.idle = 0; f.v = Math.min(1, f.v + c.riseS * dt); } else {
    f.idle += dt; if (f.idle > c.graceS) f.v = Math.max(0, f.v - c.fallS * dt);
  }
  f.full = f.v >= 1 ? f.full + dt : 0;
  if (f.full >= c.ribbonS) f.ribbon = true;
  return f;
}
export const newFlow = () => ({ v: 0, idle: 0, full: 0, ribbon: false });

// ---------------------------------------------------------------- garden generation

/** Area in m2 of the grass in a garden. */
const idx = (g, c, r) => r * g.cols + c;

function fillRect(g, x0, z0, x1, z1, t, round = 0) {
  const s = g.cell;
  for (let r = Math.max(0, Math.floor(z0 / s)); r < Math.min(g.rows, Math.ceil(z1 / s)); r++) for (let c = Math.max(0, Math.floor(x0 / s)); c < Math.min(g.cols, Math.ceil(x1 / s)); c++) {
    if (round) { const x = (c + 0.5) * s, z = (r + 0.5) * s, dx = Math.max(x0 + round - x, 0, x - (x1 - round)), dz = Math.max(z0 + round - z, 0, z - (z1 - round)); if (dx * dx + dz * dz > round * round) continue; }
    g.type[idx(g, c, r)] = t;
  }
}
function fillEllipse(g, cx, cz, rx, rz, t) {
  const s = g.cell;
  for (let r = Math.max(0, Math.floor((cz - rz) / s)); r < Math.min(g.rows, Math.ceil((cz + rz) / s)); r++) for (let c = Math.max(0, Math.floor((cx - rx) / s)); c < Math.min(g.cols, Math.ceil((cx + rx) / s)); c++) {
    const x = ((c + 0.5) * s - cx) / rx, z = ((r + 0.5) * s - cz) / rz; if (x * x + z * z <= 1) g.type[idx(g, c, r)] = t;
  }
}

/**
 * Builds garden number `n` (0-based) from its recipe and a seed. Everything random comes from the seed.
 * Returns the garden: grid, mask (RGBA per cell: height, cut direction, cut order, grass flag), props and finds.
 */
export function makeGarden(cfg, n, seed, recipe = cfg.gardens[n]) {
  const R = rng(seed), s = cfg.lawn.cellM, w = recipe.w, d = recipe.d;
  const g = { n, id: recipe.id, w, d, cell: s, cols: Math.round(w / s), rows: Math.round(d / s), f: recipe.f.slice(), seed,
    props: [], beds: [], finds: [], molehills: [], sprinklers: [], rings: [], pattern: null, pond: null,
    start: { x: w / 2, z: d - 1.2 }, gate: { x: w / 2, z: 0 }, cutCount: 0, grassCount: 0, touchedBed: false };
  const N = g.cols * g.rows;
  g.type = new Uint8Array(N).fill(T.GRASS); g.mask = new Uint8Array(N * 4); g.edge = new Uint8Array(N); g.wet = new Uint8Array(N);
  const has = (k) => g.f.includes(k);
  for (const k of g.f) if (k.startsWith('pattern:')) g.pattern = k.slice(8);
  // keep the way from the start to the gate free of big things (a 3 m corridor down the middle), and leave room
  // for the mower to pass between a thing and the fence, so no grass hides where the deck cannot reach
  const pass = cfg.kart.radiusM * 2 + 0.5, free = (x, z, r) => Math.abs(x - w / 2) > 1.6 + r && z > pass + r && z < d - pass - r && x > pass + r && x < w - pass - r;
  const placed = [];
  const soft = (x, z, r) => Math.abs(x - w / 2) > 1.6 + r && z > 1.2 + r && z < d - 1.2 - r && x > 0.6 + r && x < w - 0.6 - r; // for things the mower drives over (flower beds)
  const spot = (r, tries = 60, mid = false, drive = false) => {
    for (let i = 0; i < tries; i++) {
      const x = lerp(r + 0.5, w - r - 0.5, R()), z = lerp(r + 1.4, d - r - 2.4, R());
      if (!mid && !(drive ? soft(x, z, r) : free(x, z, r))) continue;
      if (mid && (z < 2 + r || z > d - 3 - r)) continue;
      if (placed.some((p) => Math.hypot(p.x - x, p.z - z) < p.r + r + 2.3)) continue;
      placed.push({ x, z, r }); return { x, z };
    }
    return null;
  };
  if (has('fountain')) { const p = { x: w / 2, z: d * 0.45 }; placed.push({ ...p, r: 1.6 }); fillEllipse(g, p.x, p.z, 1.5, 1.5, T.SOLID); g.props.push({ kind: 'fountain', ...p, r: 1.5 }); }
  if (has('pond')) { const rx = lerp(1.6, 2.6, R()) * Math.min(1.4, w / 12), rz = rx * lerp(0.6, 0.85, R()), p = { x: lerp(pass + rx, w - pass - rx, R()), z: lerp(pass + rz + 1.5, d - pass - rz - 1.5, R()) }; // the pond may sit in the middle: there is a mower-width of lawn all round it
    placed.push({ ...p, r: rx }); fillEllipse(g, p.x, p.z, rx, rz, T.WATER); g.pond = { ...p, rx, rz }; }
  if (has('terraces')) for (const fz of [0.36, 0.68]) { // low walls across the garden, each with two gaps
    const z = d * fz, gaps = [w * lerp(0.2, 0.32, R()), w * lerp(0.68, 0.8, R())];
    let x = 0; for (const gx of [...gaps, w + 9]) { const x1 = Math.min(w, gx - 1.7); if (x1 - x > 0.6) { fillRect(g, x, z - 0.2, x1, z + 0.2, T.SOLID); g.props.push({ kind: 'wall', x: (x + x1) / 2, z, len: x1 - x }); } x = gx + 1.7; }
    placed.push({ x: w / 2, z, r: 0.2 });
  }
  if (has('orchard')) for (let i = 0, k = Math.round(w * d / 70); i < k; i++) { const p = spot(0.45); if (p) { fillEllipse(g, p.x, p.z, 0.4, 0.4, T.SOLID); g.props.push({ kind: 'tree', ...p, r: 0.4, apples: 3 }); } }
  if (has('beds')) for (let i = 0, k = clamp(Math.round(w * d / 60), 1, 6); i < k; i++) {
    const bw = lerp(1.2, 2.4, R()), bd = lerp(0.9, 1.6, R()), p = spot(Math.max(bw, bd) / 2, 60, false, true); if (!p) continue;
    fillRect(g, p.x - bw / 2, p.z - bd / 2, p.x + bw / 2, p.z + bd / 2, T.BED, 0.4); g.beds.push({ x: p.x, z: p.z, w: bw, d: bd, kind: Math.floor(R() * 6) });
  }
  for (let i = 0, k = Math.round(w * d / 90); i < k; i++) { const p = spot(0.3, 20); if (p) { fillEllipse(g, p.x, p.z, 0.28, 0.28, T.SOLID); g.props.push({ kind: R() < 0.5 ? 'rock' : 'bush', ...p, r: 0.28 }); } }
  if (has('molehills')) for (let i = 0; i < 6; i++) { const p = spot(0.3, 40, true); if (p) g.molehills.push({ ...p, popped: false }); }
  if (has('sprinklers')) for (let i = 0; i < 3; i++) { const p = spot(0.2, 40, true); if (p) g.sprinklers.push({ ...p, r: 3.2, a: R() * 6.28 }); }
  if (has('mushrooms')) for (let i = 0; i < 3; i++) { const p = spot(1.3, 40, true); if (p) g.rings.push({ ...p, r: 1.2, lit: 0 }); }

  // what a mower can reach: cells where its body fits, joined to the start; grass nobody can reach becomes soil
  const kr = cfg.kart.radiusM, kc = Math.ceil(kr / s), stand = new Uint8Array(N), block = new Uint8Array(N);
  for (let i = 0; i < N; i++) block[i] = g.type[i] === T.SOLID || g.type[i] === T.WATER ? 1 : 0;
  // distance transform (chamfer) from blocking cells, capped
  const dist = new Uint16Array(N).fill(999);
  for (let i = 0; i < N; i++) if (block[i]) dist[i] = 0;
  for (let r = 0; r < g.rows; r++) for (let c = 0; c < g.cols; c++) { const i = idx(g, c, r); let v = dist[i]; if (c > 0) v = Math.min(v, dist[i - 1] + 1); if (r > 0) v = Math.min(v, dist[i - g.cols] + 1); dist[i] = v; }
  for (let r = g.rows - 1; r >= 0; r--) for (let c = g.cols - 1; c >= 0; c--) { const i = idx(g, c, r); let v = dist[i]; if (c < g.cols - 1) v = Math.min(v, dist[i + 1] + 1); if (r < g.rows - 1) v = Math.min(v, dist[i + g.cols] + 1); dist[i] = v; }
  // clearance: metres from each cell to the nearest solid or water cell (8-neighbour chamfer), used by collision
  const clr = g.clear = new Float32Array(N).fill(99), D1 = s, D2 = s * 1.4142;
  for (let i = 0; i < N; i++) if (block[i]) clr[i] = 0;
  for (let r = 0; r < g.rows; r++) for (let c = 0; c < g.cols; c++) { const i = idx(g, c, r); let v = clr[i]; if (c > 0) v = Math.min(v, clr[i - 1] + D1); if (r > 0) { v = Math.min(v, clr[i - g.cols] + D1); if (c > 0) v = Math.min(v, clr[i - g.cols - 1] + D2); if (c < g.cols - 1) v = Math.min(v, clr[i - g.cols + 1] + D2); } clr[i] = v; }
  for (let r = g.rows - 1; r >= 0; r--) for (let c = g.cols - 1; c >= 0; c--) { const i = idx(g, c, r); let v = clr[i]; if (c < g.cols - 1) v = Math.min(v, clr[i + 1] + D1); if (r < g.rows - 1) { v = Math.min(v, clr[i + g.cols] + D1); if (c < g.cols - 1) v = Math.min(v, clr[i + g.cols + 1] + D2); if (c > 0) v = Math.min(v, clr[i + g.cols - 1] + D2); } clr[i] = v; }
  for (let r = 0; r < g.rows; r++) for (let c = 0; c < g.cols; c++) { const i = idx(g, c, r); stand[i] = dist[i] > kc * 1.42 && c >= kc && c < g.cols - kc && r >= kc && r < g.rows - kc ? 1 : 0; }
  const reach = new Uint8Array(N), q = new Int32Array(N); let qh = 0, qt = 0;
  const s0 = idx(g, Math.floor(g.start.x / s), Math.floor(g.start.z / s)); reach[s0] = 1; q[qt++] = s0;
  while (qh < qt) { const i = q[qh++], c = i % g.cols; for (const j of [i - 1, i + 1, i - g.cols, i + g.cols]) { if (j < 0 || j >= N || reach[j] || !stand[j]) continue; if (Math.abs((j % g.cols) - c) > 1) continue; reach[j] = 1; q[qt++] = j; } }
  // heights: tall grass with extra-tall clumps (the whole lawn in a maze garden)
  const maze = has('maze'), clumps = [];
  for (let i = 0, k = Math.round(w * d / 16); i < k; i++) clumps.push({ x: R() * w, z: R() * d, r: lerp(0.7, 1.5, R()) });
  const er = Math.ceil(cfg.lawn.edgeHelpM / s) + 1;
  for (let r = 0; r < g.rows; r++) for (let c = 0; c < g.cols; c++) {
    const i = idx(g, c, r), m = i * 4;
    if (g.type[i] !== T.GRASS) continue;
    g.grassCount++;
    const x = (c + 0.5) * s, z = (r + 0.5) * s;
    let tall = maze && z > 2 && z < d - 3;
    if (!tall) for (const k of clumps) if ((k.x - x) ** 2 + (k.z - z) ** 2 < k.r * k.r) { tall = true; break; }
    g.mask[m] = tall ? H.EXTRA : H.TALL; g.mask[m + 3] = 255;
    // edge cells get help: grass next to anything that is not grass, or next to the fence
    let e = c < er || r < er || c >= g.cols - er || r >= g.rows - er;
    for (let dr = -er; dr <= er && !e; dr += er) for (let dc = -er; dc <= er && !e; dc += er) { const cc = c + dc, rr = r + dr; if (cc >= 0 && rr >= 0 && cc < g.cols && rr < g.rows && g.type[idx(g, cc, rr)] !== T.GRASS) e = true; }
    g.edge[i] = e ? 1 : 0;
  }
  // proof that every blade can be cut: run the smallest deck from every place the mower can stand, in eight headings;
  // grass it never touches becomes soil, so 100% is always possible
  const real = g.grassCount, keep = g.mask.slice(); g.grassCount = Infinity;
  for (let r = 0; r < g.rows; r += 2) for (let c = 0; c < g.cols; c += 2) {
    if (!reach[idx(g, c, r)]) continue;
    const x = (c + 0.5) * s, z = (r + 0.5) * s;
    for (let k = 0; k < 8; k++) cutSweep(cfg, g, x, z, x, z, k * 0.785398, cfg.upgrades.deck.from);
  }
  let lost = 0;
  for (let i = 0; i < N; i++) if (g.type[i] === T.GRASS) { if (g.mask[i * 4] !== H.CUT) { g.type[i] = T.SOIL; keep[i * 4] = 0; keep[i * 4 + 3] = 0; lost++; } }
  g.mask.set(keep); for (let i = 0; i < N; i++) { g.mask[i * 4 + 1] = 0; g.mask[i * 4 + 2] = 0; }
  g.grassCount = real - lost; g.cutCount = 0; g.lostShare = lost / N;
  g.areaM2 = g.grassCount * s * s;

  // finds: hidden in grass, spaced out, never near the start; the gift sits in the far (north) third
  const want = Math.max(cfg.finds.min, Math.round(g.areaM2 * cfg.finds.perM2)), fs = [];
  for (let t = 0; t < want * 60 && fs.length < want; t++) {
    const x = lerp(0.8, w - 0.8, R()), z = lerp(0.8, d - 0.8, R());
    if (fs.length === 0 && z > d / 3) continue; // the first one placed is the gift
    if (g.type[idx(g, Math.floor(x / s), Math.floor(z / s))] !== T.GRASS) continue;
    if (Math.hypot(x - g.start.x, z - g.start.z) < cfg.finds.startClearM) continue;
    if (fs.some((f) => Math.hypot(f.x - x, f.z - z) < cfg.finds.spacingM)) continue;
    fs.push({ x, z, found: false, kind: 'coins', id: null, golden: false });
  }
  if (fs[0]) { fs[0].kind = 'gift'; fs[0].id = cfg.gifts[n % cfg.gifts.length]; }
  // the friend is the find nearest the middle (met around 40% of the way); then three toys; the rest are coins
  const rest = fs.slice(1).sort((a, b) => Math.hypot(a.x - w / 2, a.z - d * 0.55) - Math.hypot(b.x - w / 2, b.z - d * 0.55));
  if (rest[0] && n < cfg.friends.length) { rest[0].kind = 'friend'; rest[0].id = cfg.friends[n]; }
  for (let i = 0; i < 3 && rest[1 + i]; i++) { const f = rest[rest.length - 1 - i]; if (f.kind !== 'coins') continue; f.kind = 'toy'; f.id = cfg.toys[(n * 3 + i) % cfg.toys.length]; f.golden = R() < 1 / cfg.finds.goldenOneIn; }
  g.finds = fs;
  return g;
}

/** The recipe of the Garden of the Day for a date number YYYYMMDD: size and features rotate, the layout is the seed's. */
export function dailyRecipe(cfg, ymd) {
  const R = rng(ymd * 7 + 13), pool = ['beds', 'pond', 'orchard', 'molehills', 'sprinklers', 'mushrooms'], f = ['beds'];
  for (let i = 0; i < 2; i++) { const k = pool[Math.floor(R() * pool.length)]; if (!f.includes(k)) f.push(k); }
  f.push('pattern:' + ['long', 'cross', 'diag', 'chequer'][ymd % 4]);
  const hosts = cfg.gardens.filter((x) => !x.daily);
  return { id: 'daily', daily: true, nb: hosts[ymd % hosts.length].id, w: 16 + Math.floor(R() * 5) * 2, d: 22 + Math.floor(R() * 5) * 2, f, district: ymd % cfg.districts.length };
}
/** Today's date number from a Date, in local time. */
export const ymdOf = (date) => date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate();

// ---------------------------------------------------------------- cutting

/** Share of grass cut, 0 to 1. */
export function coverage(g) { return g.grassCount ? g.cutCount / g.grassCount : 1; }
/** Whole-number percent shown to the player, rounded down so 100 is only shown when true. */
export function percent(g) { return g.cutCount >= g.grassCount ? 100 : Math.min(99, Math.floor(coverage(g) * 100)); }

/**
 * Cuts the grass under the deck as the mower moves from (x0, z0) to (x1, z1) with heading `ang` (radians, 0 = north).
 * The footprint is `width` wide; it runs from cfg.lawn.underM behind the mower's centre to `ahead` + half of
 * cfg.lawn.footLenM in front of it.
 * Returns { cut, met, cells, wet, rect } : cells newly cut, tall cells met, cells looked at, wet cells cut, dirty rect.
 */
export function cutSweep(cfg, g, x0, z0, x1, z1, ang, width, ahead = 0.45) {
  const s = g.cell, L = cfg.lawn, out = { cut: 0, met: 0, cells: 0, wet: 0, rect: null };
  const fin = coverage(g) >= L.finishHelpAt ? L.finishHelpMul : 1;
  const hw = width / 2 * fin, hl = L.footLenM / 2 * fin, eh = L.edgeHelpM;
  const fx = -Math.sin(ang), fz = -Math.cos(ang); // forward; heading 0 points north (-z)
  const dist = Math.hypot(x1 - x0, z1 - z0), steps = Math.max(1, Math.ceil(dist / (s * 0.9)));
  const dirByte = Math.round((0.5 + 0.5 * Math.cos(ang)) * 255); // stripe tone: 255 mown northward, 0 southward, 128 across. A tone (not an angle) blends cleanly between cells
  let c0 = 1e9, r0 = 1e9, c1 = -1, r1 = -1;
  for (let k = 1; k <= steps; k++) {
    const t = k / steps, cx = lerp(x0, x1, t) + fx * ahead, cz = lerp(z0, z1, t) + fz * ahead, back = ahead + L.underM, ext = Math.hypot(hw + eh, back + hl + eh);
    const ca = Math.max(0, Math.floor((cx - ext) / s)), cb = Math.min(g.cols - 1, Math.floor((cx + ext) / s));
    const ra = Math.max(0, Math.floor((cz - ext) / s)), rb = Math.min(g.rows - 1, Math.floor((cz + ext) / s));
    const last = k === steps;
    for (let r = ra; r <= rb; r++) for (let c = ca; c <= cb; c++) {
      const i = r * g.cols + c; if (g.type[i] !== T.GRASS) continue;
      const dx = (c + 0.5) * s - cx, dz = (r + 0.5) * s - cz, along = dx * fx + dz * fz, side = dx * fz - dz * fx, e = g.edge[i] ? eh : 0;
      if (along > hl + e || along < -back - e || Math.abs(side) > hw + e) continue; // the blades reach back under the body, so no tuft is left where the mower stands
      const m = i * 4;
      if (last) out.cells++;
      if (g.mask[m] === H.CUT) { g.mask[m + 1] = dirByte; if (c < c0) c0 = c; if (c > c1) c1 = c; if (r < r0) r0 = r; if (r > r1) r1 = r; continue; }
      g.mask[m] = H.CUT; g.mask[m + 1] = dirByte; g.mask[m + 2] = Math.min(255, Math.floor(255 * g.cutCount / g.grassCount));
      g.cutCount++; out.cut++; if (last) out.met++; if (g.wet[i]) out.wet++;
      if (c < c0) c0 = c; if (c > c1) c1 = c; if (r < r0) r0 = r; if (r > r1) r1 = r;
    }
  }
  if (c1 >= 0) out.rect = { c0, r0, c1, r1 };
  return out;
}

/** True when a mower of radius `rad` cannot stand at (x, z): fence, solid or water. Gaps: the north gate when open, the south entry always. */
export function blocked(g, x, z, rad, gateOpen) {
  const inGap = Math.abs(x - g.w / 2) < GATE_HALF_M - Math.min(rad, BODY_M);
  if (x < rad || x > g.w - rad) return true;
  if (z < rad && !(gateOpen && inGap)) return true;
  if (z > g.d - rad && !inGap) return true;
  return clearAt(g, x, z) < rad;
}
/** Metres from (x, z) to the nearest solid or water (the centre of its cell counts as its edge plus half a cell). */
export function clearAt(g, x, z) {
  const c = Math.floor(x / g.cell), r = Math.floor(z / g.cell); if (c < 0 || r < 0 || c >= g.cols || r >= g.rows) return 99;
  return g.clear[r * g.cols + c] - g.cell * 0.5;
}
/**
 * How the cutting deck must tuck in so that neither front corner pokes through a fence, a rock or the pond: it
 * first springs narrower (k, 1 = full width), then slides back under the body (pull, metres). `hw` is half the
 * deck width, `front` how far ahead of the body's centre the corners sit, `steps` the widths and `pulls` the
 * slides to try in order. Returns { k, pull, poke } with `poke` = metres still outside (0 when it fits).
 */
export function deckFit(g, x, z, ang, hw, steps, front, pulls = [0]) {
  const fx = -Math.sin(ang), fz = -Math.cos(ang); let k = 1, pull = 0, poke = 0;
  if (z < -0.5 || z > g.d + 0.5) return { k, pull, poke };
  for (pull of pulls) for (k of steps) { poke = 0;
    for (const sd of [-1, 1]) { const f = front - pull, cx = x + fx * f + fz * sd * hw * k, cz = z + fz * f - fx * sd * hw * k, gap = Math.abs(cx - g.w / 2) < GATE_HALF_M;
      poke = Math.max(poke, -cx, cx - g.w, gap ? 0 : Math.max(-cz, cz - g.d), cx >= 0 && cx <= g.w && cz >= 0 && cz <= g.d ? -clearAt(g, cx, cz) : 0); }
    if (poke <= 0) return { k, pull, poke: 0 }; }
  return { k, pull, poke };
}
/** Moves a point by (dx, dz), sliding along whatever blocks it. Returns the new { x, z, hit }. */
export function slide(g, x, z, dx, dz, rad, gateOpen) {
  const n = Math.max(1, Math.ceil(Math.hypot(dx, dz) / (g.cell * 2))); let hit = false;
  for (let i = 0; i < n; i++) {
    const sx = dx / n, sz = dz / n;
    if (!blocked(g, x + sx, z + sz, rad, gateOpen)) { x += sx; z += sz; continue; }
    hit = true;
    if (!blocked(g, x + sx, z, rad, gateOpen)) x += sx; else if (!blocked(g, x, z + sz, rad, gateOpen)) z += sz;
  }
  return { x, z, hit };
}
/** Cell type at a point, OUT beyond the grid. */
export function typeAt(g, x, z) { const c = Math.floor(x / g.cell), r = Math.floor(z / g.cell); return c < 0 || r < 0 || c >= g.cols || r >= g.rows ? T.OUT : g.type[r * g.cols + c]; }

/** The uncut grass cell nearest to (x, z), as { x, z, d }, or null when the lawn is finished. A coarse scan, cheap enough for once a second. */
export function nearestUncut(g, x, z) {
  let best = null, bd = 1e9; const s = g.cell, step = 2;
  for (let r = 0; r < g.rows; r += step) for (let c = 0; c < g.cols; c += step) {
    const i = r * g.cols + c; if (g.type[i] !== T.GRASS || g.mask[i * 4] === H.CUT) continue;
    const px = (c + 0.5) * s, pz = (r + 0.5) * s, d2 = (px - x) ** 2 + (pz - z) ** 2; if (d2 < bd) { bd = d2; best = { x: px, z: pz }; }
  }
  if (!best && g.cutCount < g.grassCount) for (let i = 0; i < g.type.length; i++) if (g.type[i] === T.GRASS && g.mask[i * 4] !== H.CUT) { best = { x: (i % g.cols + 0.5) * s, z: (Math.floor(i / g.cols) + 0.5) * s }; bd = (best.x - x) ** 2 + (best.z - z) ** 2; break; }
  if (best) best.d = Math.sqrt(bd);
  return best;
}

/** Share (0 to 1) of cut cells whose stripes follow the asked pattern: long, cross, diag or chequer. */
export function styleShare(g, pattern) {
  let ok = 0, n = 0; const s = g.cell;
  for (let i = 0; i < g.type.length; i++) {
    if (g.type[i] !== T.GRASS || g.mask[i * 4] !== H.CUT) continue; n++;
    const ns = Math.abs(g.mask[i * 4 + 1] / 127.5 - 1), ew = Math.sqrt(Math.max(0, 1 - ns * ns));
    let want = pattern;
    if (pattern === 'chequer') { const cx = Math.floor((i % g.cols) * s / 3), cz = Math.floor(Math.floor(i / g.cols) * s / 3); want = (cx + cz) % 2 ? 'long' : 'cross'; }
    if (want === 'long' ? ns > 0.9 : want === 'cross' ? ew > 0.9 : Math.abs(ns - ew) < 0.35) ok++;
  }
  return n ? ok / n : 0;
}

// ---------------------------------------------------------------- save

/** Packs which cells are cut (and their direction, coarsely) into a short string: run lengths of cut / uncut over grass cells. */
export function packCut(g) {
  const runs = []; let cur = 0, len = 0;
  for (let i = 0; i < g.type.length; i++) { if (g.type[i] !== T.GRASS) continue; const v = g.mask[i * 4] === H.CUT ? 1 : 0; if (v === cur) len++; else { runs.push(len); cur = v; len = 1; } }
  runs.push(len);
  return runs.map((n) => n.toString(36)).join('.');
}
/** Restores a garden's cut cells from packCut's string. Bad input leaves the garden uncut. Stripes come back lengthwise. */
export function unpackCut(g, str) {
  if (typeof str !== 'string' || !/^[0-9a-z.]+$/.test(str)) return false;
  const runs = str.split('.').map((x) => parseInt(x, 36)); let total = 0; for (const n of runs) { if (!(n >= 0)) return false; total += n; }
  if (total !== g.grassCount) return false;
  let k = 0, left = runs[0], cur = 0, done = 0;
  for (let i = 0; i < g.type.length; i++) {
    if (g.type[i] !== T.GRASS) continue;
    while (left === 0 && k < runs.length - 1) { k++; left = runs[k]; cur ^= 1; }
    if (cur) { const m = i * 4; if (g.mask[m] !== H.CUT) { g.mask[m] = H.CUT; g.mask[m + 1] = (Math.floor((i % g.cols) * g.cell / 1.3) % 2) ? 0 : 255; g.mask[m + 2] = Math.min(255, Math.floor(255 * done / g.grassCount)); g.cutCount++; done++; } }
    left--;
  }
  return true;
}

/** A fresh save. */
export function newSave(cfg) {
  return { v: cfg.save.version, coins: 0, up: { deck: 0, engine: 0, baler: 0 }, cur: 0, gardens: [], cut: null, cutFor: -1,
    friends: [], toys: [], golden: [], gifts: [], neighbours: [], wear: null, ride: [], own: { paint: ['teal'], tint: ['classic'], trail: ['petals'] }, use: { paint: 'teal', tint: 'classic', trail: 'petals' },
    ftue: 0, ftueDone: false, mute: false, music: true, calm: false, lefty: false, lang: null, daily: { ymd: 0, done: false, stars: 0 }, m2: 0, playS: 0, parties: [] };
}
/** Cleans a loaded save: fills fields a newer build added, rounds and clamps every number, drops what it does not know. */
export function cleanSave(cfg, raw) {
  const s = newSave(cfg); if (!raw || typeof raw !== 'object') return s;
  const num = (v, a, b) => (Number.isFinite(+v) ? clamp(Math.round(+v), a, b) : a);
  const list = (v, ok) => (Array.isArray(v) ? [...new Set(v.filter((x) => typeof x === 'string' && (!ok || ok.includes(x))))] : []);
  s.coins = num(raw.coins, 0, 9999999); s.m2 = num(raw.m2, 0, 99999999); s.playS = num(raw.playS, 0, 99999999);
  for (const k of ['deck', 'engine', 'baler']) s.up[k] = num(raw.up && raw.up[k], 0, cfg.upgrades.levels);
  s.cur = num(raw.cur, 0, cfg.gardens.length - 1);
  if (Array.isArray(raw.gardens)) s.gardens = raw.gardens.slice(0, cfg.gardens.length).map((x) => ({ stars: num(x && x.stars, 0, 3), best: num(x && x.best, 0, 100), rib: list(x && x.rib, ['gentle', 'style', 'flow']) }));
  s.cur = Math.min(s.cur, s.gardens.filter((x, i) => x.stars > 0 && !cfg.gardens[i].daily).length); // the Garden of the Day never unlocks the lane
  if (typeof raw.cut === 'string' && raw.cut.length < 60000) { s.cut = raw.cut; s.cutFor = num(raw.cutFor, -1, cfg.gardens.length - 1); }
  s.friends = list(raw.friends, cfg.friends); s.toys = list(raw.toys, cfg.toys); s.golden = list(raw.golden, cfg.toys); s.gifts = list(raw.gifts, cfg.gifts);
  s.neighbours = list(raw.neighbours, cfg.gardens.filter((x) => !x.daily).map((x) => x.id)); s.ride = list(raw.ride, cfg.friends).slice(0, 3);
  s.wear = typeof raw.wear === 'string' && s.gifts.includes(raw.wear) ? raw.wear : null;
  for (const k of ['paint', 'tint', 'trail']) { const ids = cfg.shop[k].map((x) => x[0]); s.own[k] = [...new Set([ids[0], ...list(raw.own && raw.own[k], ids)])]; s.use[k] = raw.use && s.own[k].includes(raw.use[k]) ? raw.use[k] : ids[0]; }
  s.ftue = num(raw.ftue, 0, 99); s.ftueDone = !!raw.ftueDone; s.mute = !!raw.mute; s.music = raw.music !== false; s.calm = !!raw.calm; s.lefty = !!raw.lefty;
  s.lang = typeof raw.lang === 'string' && raw.lang.length === 2 ? raw.lang : null;
  s.daily = { ymd: num(raw.daily && raw.daily.ymd, 0, 99991231), done: !!(raw.daily && raw.daily.done), stars: num(raw.daily && raw.daily.stars, 0, 3) };
  s.parties = Array.isArray(raw.parties) ? [...new Set(raw.parties.map((x) => num(x, 0, 9)))] : [];
  return s;
}
/** Merges a save that arrived late into the one in play: the larger of each count, the union of each collection. Used once. */
export function mergeSave(cfg, a, late) {
  const b = cleanSave(cfg, late), o = cleanSave(cfg, a);
  o.coins = Math.max(o.coins, b.coins); o.m2 = Math.max(o.m2, b.m2); o.playS = Math.max(o.playS, b.playS);
  for (const k of ['deck', 'engine', 'baler']) o.up[k] = Math.max(o.up[k], b.up[k]);
  for (let i = 0; i < Math.max(o.gardens.length, b.gardens.length); i++) { const x = o.gardens[i] || { stars: 0, best: 0, rib: [] }, y = b.gardens[i] || x; o.gardens[i] = { stars: Math.max(x.stars, y.stars), best: Math.max(x.best, y.best), rib: [...new Set([...x.rib, ...y.rib])] }; }
  if (b.cur > o.cur) { o.cur = b.cur; o.cut = b.cut; o.cutFor = b.cutFor; }
  for (const k of ['friends', 'toys', 'golden', 'gifts', 'neighbours', 'parties']) o[k] = [...new Set([...o[k], ...b[k]])];
  for (const k of ['paint', 'tint', 'trail']) o.own[k] = [...new Set([...o.own[k], ...b.own[k]])];
  o.ftueDone = o.ftueDone || b.ftueDone; o.ftue = Math.max(o.ftue, b.ftue);
  if (b.daily.ymd > o.daily.ymd) o.daily = b.daily;
  return o;
}

/** Which district (0-based) garden n belongs to: Clover Lane 1-6, Windmill Hill 7-9, Lantern Lake 10-12 (plan sections 6.3 and 8). */
export const districtOf = (n) => (n < 6 ? 0 : n < 9 ? 1 : 2);
/** Gardens whose finale is a garden party (plan section 8). */
export const PARTY_AFTER = [5, 11];
