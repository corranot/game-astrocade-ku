// PROTOTYPE - NOT FOR PRODUCTION
// Building generators for Block Smash Crew. Each level is a cheerful voxel building on a lawn with the treasure
// chest (star one) locked in a steel vault on its ground floor, two more star blocks (one high, one deep inside) and a few trees and a fence.
// Pure and seeded: the same level number always builds the same building.
import { createGrid, fill } from './voxels.js';

/** Small seeded random (mulberry32). */
export function rng(seed) { let a = seed >>> 0 || 1; return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

/** Material name → id map from the config's material list (id = index + 1). */
export const matIds = (cfg) => Object.fromEntries(cfg.materials.map((m, i) => [m.id, i + 1]));

function walls(g, x0, z0, x1, z1, y0, y1, m) { fill(g, x0, y0, z0, x1, y1, z0, m); fill(g, x0, y0, z1, x1, y1, z1, m); fill(g, x0, y0, z0, x0, y1, z1, m); fill(g, x1, y0, z0, x1, y1, z1, m); }
/** Glass windows 2 wide every `step` along each wall, rows at the given heights. */
function windows(g, x0, z0, x1, z1, ys, m, step = 4, h = 2) {
  for (const y of ys) {
    for (let x = x0 + 2; x + 1 < x1 - 1; x += step) { fill(g, x, y, z0, x + 1, y + h - 1, z0, m); fill(g, x, y, z1, x + 1, y + h - 1, z1, m); }
    for (let z = z0 + 2; z + 1 < z1 - 1; z += step) { fill(g, x0, y, z, x0, y + h - 1, z + 1, m); fill(g, x1, y, z, x1, y + h - 1, z + 1, m); }
  }
}
/** A gable roof over [x0..x1]×[z0..z1] starting at height y, sloping down towards z0 and z1, with an overhang. */
function gable(g, x0, z0, x1, z1, y, m, fillM) {
  for (let k = 0; z0 - 1 + k <= z1 + 1 - k; k++) {
    // two rows per side per layer, so each layer rests face to face on the one below
    fill(g, x0 - 1, y + k, z0 - 1 + k, x1 + 1, y + k, z0 + k, m); fill(g, x0 - 1, y + k, z1 - k, x1 + 1, y + k, z1 + 1 - k, m);
    if (fillM) { fill(g, x0, y + k, z0 + k, x0, y + k, z1 - k, fillM); fill(g, x1, y + k, z0 + k, x1, y + k, z1 - k, fillM); }
  }
}
function pyramidRoof(g, x0, z0, x1, z1, y, m) {
  for (let k = 0; x0 - 1 + k <= x1 + 1 - k && z0 - 1 + k <= z1 + 1 - k; k++) {
    walls(g, x0 - 1 + k, z0 - 1 + k, x1 + 1 - k, z1 + 1 - k, y + k, y + k, m);
    if (x0 + k <= x1 - k && z0 + k <= z1 - k) walls(g, x0 + k, z0 + k, x1 - k, z1 - k, y + k, y + k, m); // inner ring: rests on the layer below
  }
}
function cylinder(g, cx, cz, r, y0, y1, m, hollow = true) {
  for (let z = Math.floor(cz - r - 1); z <= cz + r + 1; z++) for (let x = Math.floor(cx - r - 1); x <= cx + r + 1; x++) {
    const d = Math.hypot(x + 0.5 - cx, z + 0.5 - cz);
    if (d <= r && (!hollow || d > r - 1.2)) fill(g, x, y0, z, x, y1, z, m);
  }
}
function dome(g, cx, cy, cz, r, m) {
  for (let y = 0; y <= r; y++) for (let z = Math.floor(cz - r - 1); z <= cz + r + 1; z++) for (let x = Math.floor(cx - r - 1); x <= cx + r + 1; x++) {
    const d = Math.hypot(x + 0.5 - cx, y + 0.5, z + 0.5 - cz);
    if (d <= r && d > r - 1.3) g.set(x, cy + y, z, m);
  }
}
function cone(g, cx, cy, cz, r, m) { for (let k = 0; r - k * 0.75 > 0.4; k++) cylinder(g, cx, cz, r - k * 0.75, cy + k, cy + k, m, false); }
function tree(g, M, x, z, h, rnd) {
  fill(g, x, 0, z, x, h - 1, z, M.trunk);
  const r = 2 + (rnd() < 0.5 ? 0 : 1);
  for (let y = -r; y <= r; y++) for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) if (Math.hypot(dx, y * 1.2, dz) <= r + 0.3 && !g.get(x + dx, h + y, z + dz)) g.set(x + dx, h + y, z + dz, M.leaves);
}
function fence(g, M, x0, x1, z) { for (let x = x0; x <= x1; x++) { g.set(x, 1, z, M.wood); if (x % 3 === 0) { g.set(x, 0, z, M.trunk); g.set(x, 2, z, M.trunk); } } }
/** The vault: a steel box with the 2×2 chest room inside; returns the chest centre. */
function vault(g, M, cx, cz) {
  fill(g, cx - 1, 0, cz - 1, cx + 2, 2, cz + 2, M.steel);
  fill(g, cx, 0, cz, cx + 1, 1, cz + 1, 0);
  g.set(cx, 2, cz, M.gold); g.set(cx + 1, 2, cz + 1, M.gold);
  return { x: cx + 1, z: cz + 1 };
}
function stripes(g, x0, z0, x1, z1, y0, y1, a, b, every = 2) { for (let y = y0; y <= y1; y++) walls(g, x0, z0, x1, z1, y, y, Math.floor((y - y0) / every) % 2 ? b : a); }

/** Builders: each fills g and returns {chest}. b = the building box, s = size step for later loops. */
const BUILD = {
  cottage(g, M, b, rnd) {
    const { x0, z0, x1, z1 } = b, h = 6 + b.s;
    walls(g, x0, z0, x1, z1, 0, h, M.brick);
    for (const [x, z] of [[x0, z0], [x1, z0], [x0, z1], [x1, z1]]) fill(g, x, 0, z, x, h, z, M.plaster);
    windows(g, x0, z0, x1, z1, [2], M.glass, 4);
    const mid = (x0 + x1) >> 1; fill(g, mid - 1, 0, z1, mid, 2, z1, M.wood);
    gable(g, x0, z0, x1, z1, h + 1, M.roofRed, M.plaster);
    fill(g, x1 - 3, h + 1, z0 + 2, x1 - 2, h + 5, z0 + 3, M.brick); // chimney
    return { chest: vault(g, M, mid - 1, ((z0 + z1) >> 1) - 1) };
  },
  candy(g, M, b, rnd) {
    const { x0, z0, x1, z1 } = b, h = 7 + b.s;
    stripes(g, x0, z0, x1, z1, 0, h, M.candyPink, M.candyMint, 2);
    windows(g, x0, z0, x1, z1, [2], M.glass, 5);
    const mid = (x0 + x1) >> 1; fill(g, mid - 1, 0, z1, mid, 2, z1, M.toyYellow);
    // frosting roof with sprinkles
    pyramidRoof(g, x0, z0, x1, z1, h + 1, M.plaster);
    for (let i = 0; i < 40; i++) { const x = x0 + Math.floor(rnd() * (x1 - x0)), z = z0 + Math.floor(rnd() * (z1 - z0)); for (let y = g.H - 1; y > h; y--) if (g.get(x, y, z) === M.plaster) { g.set(x, y, z, [M.toyRed, M.toyYellow, M.toyBlue, M.candyMint][i % 4]); break; } }
    // giant lollipops at the corners of the lawn
    for (const [x, z] of [[x0 - 3, z1 + 2], [x1 + 3, z1 + 2]]) { fill(g, x, 0, z, x, 5, z, M.plaster); cylinder(g, x + 0.5, z + 0.5, 2.2, 6, 8, M.candyPink, false); cylinder(g, x + 0.5, z + 0.5, 1.2, 6, 8, M.toyYellow, false); }
    return { chest: vault(g, M, mid - 1, ((z0 + z1) >> 1) - 1) };
  },
  castle(g, M, b, rnd) {
    const { x0, z0, x1, z1 } = b, h = 8 + b.s;
    walls(g, x0, z0, x1, z1, 0, h, M.stone);
    for (let x = x0; x <= x1; x += 2) { g.set(x, h + 1, z0, M.stone); g.set(x, h + 1, z1, M.stone); }
    for (let z = z0; z <= z1; z += 2) { g.set(x0, h + 1, z, M.stone); g.set(x1, h + 1, z, M.stone); }
    fill(g, x0 + 1, h - 3, z0 + 1, x1 - 1, h - 3, z1 - 1, M.wood); // upper floor
    windows(g, x0, z0, x1, z1, [h - 2], M.glass, 5, 1);
    for (const [x, z] of [[x0, z0], [x1, z0], [x0, z1], [x1, z1]]) { cylinder(g, x + 0.5, z + 0.5, 2.6, 0, h + 4, M.stone); cone(g, x + 0.5, h + 5, z + 0.5, 3.2, M.roofBlue); }
    const mid = (x0 + x1) >> 1; fill(g, mid - 1, 0, z1, mid + 1, 3, z1, M.wood);
    return { chest: vault(g, M, mid - 1, ((z0 + z1) >> 1) - 2) };
  },
  lighthouse(g, M, b, rnd) {
    const { x0, z0, x1, z1 } = b, cx = (x0 + x1) / 2 + 0.5, cz = z0 + 6.5, top = Math.min(g.H - 6, 16 + b.s * 2);
    for (let y = 0; y <= top; y++) cylinder(g, cx, cz, 4.2, y, y, Math.floor(y / 3) % 2 ? M.plaster : M.brick);
    fill(g, Math.floor(cx) - 1, 0, Math.floor(cz) + 4, Math.floor(cx), 2, Math.floor(cz) + 4, M.wood);
    cylinder(g, cx, cz, 5.2, top + 1, top + 1, M.steel, false);
    cylinder(g, cx, cz, 3.6, top + 2, top + 4, M.glass);
    cone(g, cx, top + 5, cz, 4.4, M.roofRed);
    // keeper's cottage in front, where the vault is
    const hx0 = x0 + 1, hz0 = z0 + 13, hx1 = x1 - 1, hz1 = z1; walls(g, hx0, hz0, hx1, hz1, 0, 4, M.plaster); windows(g, hx0, hz0, hx1, hz1, [1], M.glass, 4); gable(g, hx0, hz0, hx1, hz1, 5, M.roofBlue, M.plaster);
    return { chest: vault(g, M, ((hx0 + hx1) >> 1) - 1, ((hz0 + hz1) >> 1) - 1) };
  },
  factory(g, M, b, rnd) {
    const { x0, z0, x1, z1 } = b, h = 9 + b.s;
    for (let y = 0; y <= h; y++) walls(g, x0, z0, x1, z1, y, y, [M.toyRed, M.toyYellow, M.toyBlue][Math.floor(y / 3) % 3]);
    for (let x = x0; x <= x1; x += 5) { fill(g, x, 0, z0, x, h, z0, M.steel); fill(g, x, 0, z1, x, h, z1, M.steel); }
    windows(g, x0, z0, x1, z1, [2, 6], M.glass, 5, 2);
    fill(g, x0, h + 1, z0, x1, h + 1, z1, M.steel);
    for (let i = 0; i < 3; i++) { const x = x0 + 3 + i * 5; cylinder(g, x + 0.5, z0 + 3.5, 1.6, h + 2, h + 7 + i * 2, M.brick); }
    // conveyor of toy blocks inside
    for (let x = x0 + 2; x < x1 - 1; x += 2) g.set(x, 0, z1 - 3, [M.toyRed, M.toyYellow, M.toyBlue][x % 3]);
    const mid = (x0 + x1) >> 1; fill(g, mid - 1, 0, z1, mid + 1, 3, z1, 0);
    return { chest: vault(g, M, mid - 1, ((z0 + z1) >> 1) - 1) };
  },
  ice(g, M, b, rnd) {
    const { x0, z0, x1, z1 } = b, h = 6 + b.s;
    walls(g, x0, z0, x1, z1, 0, h, M.ice);
    windows(g, x0, z0, x1, z1, [2], M.glass, 3);
    fill(g, x0, h + 1, z0, x1, h + 1, z1, M.snow);
    const cx = (x0 + x1) / 2 + 0.5, cz = (z0 + z1) / 2 + 0.5;
    dome(g, cx, h + 2, cz, Math.min(x1 - x0, z1 - z0) / 2 - 1, M.ice);
    for (const [x, z] of [[x0, z0], [x1, z0], [x0, z1], [x1, z1]]) { cylinder(g, x + 0.5, z + 0.5, 2, 0, h + 5, M.snow); cone(g, x + 0.5, h + 6, z + 0.5, 2.4, M.ice); }
    const mid = (x0 + x1) >> 1; fill(g, mid - 1, 0, z1, mid, 2, z1, 0);
    return { chest: vault(g, M, mid - 1, ((z0 + z1) >> 1) - 1) };
  },
  temple(g, M, b, rnd) {
    const { x0, z0, x1, z1 } = b;
    let k = 0;
    for (; x0 + k * 2 < x1 - k * 2 - 2 && z0 + k * 2 < z1 - k * 2 - 2; k++) {
      const a = x0 + k * 2, c = z0 + k * 2, e = x1 - k * 2, f = z1 - k * 2, y = k * 3;
      walls(g, a, c, e, f, y, y + 2, k % 2 ? M.moss : M.sand);
      fill(g, a + 1, y + 2, c + 1, e - 1, y + 2, f - 1, M.sand);
    }
    const mid = (x0 + x1) >> 1; fill(g, mid - 1, 0, z1, mid, 2, z1, 0); // entrance
    for (const [x, z] of [[x0 - 2, z1 + 2], [x1 + 2, z1 + 2]]) { fill(g, x, 0, z, x, 4, z, M.moss); g.set(x, 5, z, M.gold); }
    return { chest: vault(g, M, mid - 1, ((z0 + z1) >> 1) - 1) };
  },
  space(g, M, b, rnd) {
    const { x0, z0, x1, z1 } = b, h = 5 + b.s;
    walls(g, x0, z0, x1, z1, 0, h, M.panel);
    windows(g, x0, z0, x1, z1, [2], M.glass, 3, 1);
    const cx = (x0 + x1) / 2 + 0.5, cz = (z0 + z1) / 2 + 0.5;
    fill(g, x0, h + 1, z0, x1, h + 1, z1, M.panel);
    dome(g, cx, h + 2, cz, Math.min(x1 - x0, z1 - z0) / 2 - 2, M.glass);
    // rocket on a pad beside the base
    const rx = x1 + 3.5, rz = z0 + 3.5; cylinder(g, rx, rz, 1.8, 0, 12, M.panel, false); cone(g, rx, 13, rz, 2, M.toyRed); for (const [dx, dz] of [[-2, 0], [2, 0], [0, -2], [0, 2]]) fill(g, Math.floor(rx + dx), 0, Math.floor(rz + dz), Math.floor(rx + dx), 3, Math.floor(rz + dz), M.toyRed);
    fill(g, Math.floor(cx), h + 2, z0 + 1, Math.floor(cx), h + 8, z0 + 1, M.steel); // antenna
    const mid = (x0 + x1) >> 1; fill(g, mid - 1, 0, z1, mid, 2, z1, M.glass);
    return { chest: vault(g, M, mid - 1, ((z0 + z1) >> 1) - 1) };
  },
};
export const KINDS = Object.keys(BUILD);

/**
 * Builds level n (0-based): kind cycles through the 8 buildings; every full cycle the buildings grow a step.
 * Returns {grid, kind, chest: {x, z}, spawn: {x, z}, stars: star block cells, total: block count, top: highest block}.
 */
export function buildLevel(cfg, n) {
  const M = matIds(cfg), L = cfg.level;
  // every 5th level is a boss: the biggest size of its building; the look also changes with the level (theme)
  const boss = n % 5 === 4 && n < 1000, kind = KINDS[n % KINDS.length], s = boss ? L.maxStep : Math.min(L.maxStep, Math.floor(n / KINDS.length));
  const theme = ['day', 'sunset', 'snow'][n % 3] === 'snow' && kind === 'ice' ? 'day' : ['day', 'sunset', 'snow'][n % 3];
  const rnd = rng(1000 + n * 7919);
  const g = createGrid(L.W, L.H, L.D);
  const w = Math.min(L.W - 12, L.bw + s * 2 + (kind === 'castle' ? 4 : 0)), d = Math.min(L.D - 18, L.bd + s * 2 + (kind === 'lighthouse' ? 8 : 0));
  const x0 = ((L.W - w) >> 1), z0 = 6, b = { x0, z0, x1: x0 + w - 1, z1: z0 + d - 1, s };
  const { chest } = BUILD[kind](g, M, b, rnd);
  // rooms: two inner walls between the front door and the vault, so the way in takes a few smashes
  const wallM = g.get(b.x0 + 1, 1, b.z1) || M.brick;
  for (const z of [chest.z + 3, chest.z + 5]) if (z < b.z1 - 1) for (let x = b.x0 + 1; x < b.x1; x++) for (let y = 0; y < 4; y++) if (!g.get(x, y, z)) g.set(x, y, z, z === chest.z + 3 ? wallM : M.wood);
  // stars: one high up (roof, tower: knock it down or throw at it), one deep inside behind the rooms
  const stars = [];
  const ok = (m) => m && !cfg.materials[m - 1].hard && m !== M.glass && m !== M.gold;
  let top = 0; for (let y = 0; y < L.H; y++) for (let z = b.z0 - 3; z <= b.z1 + 3; z++) for (let x = b.x0 - 3; x <= b.x1 + 3; x++) if (g.get(x, y, z)) top = Math.max(top, y);
  const pick = (test) => { const c = []; for (let y = 0; y < L.H; y++) for (let z = b.z0 - 3; z <= b.z1; z++) for (let x = b.x0 - 3; x <= b.x1 + 3; x++) if (ok(g.get(x, y, z)) && test(x, y, z)) c.push([x, y, z]); return c.length ? c[Math.floor(rnd() * c.length)] : null; };
  const high = pick((x, y, z) => y >= Math.max(5, Math.floor(top * 0.6)) && y <= top - 1);
  const deep = pick((x, y, z) => y >= 1 && y <= 2 && z <= chest.z - 2 && z >= b.z0);
  for (const c of [high, deep]) if (c) { g.set(c[0], c[1], c[2], M.star); stars.push({ x: c[0], y: c[1], z: c[2] }); }
  // boom barrel: one in front of the building (seen from the start: the first chain of booms), a few inside along the walls
  const keg = [];
  const mid = (b.x0 + b.x1) >> 1, nearVault = (x, z) => Math.abs(x + 0.5 - chest.x) < 3 && Math.abs(z + 0.5 - chest.z) < 3;
  const putKeg = (x, z) => { if (!g.get(x, 0, z) && !nearVault(x, z)) { g.set(x, 0, z, M.keg); keg.push({ x, y: 0, z }); return true; } return false; };
  // the BOOM box: ahead behind the fence, left of the hammer in the hand (in view once the front barrel opens the fence),
  // outside that barrel's blast; smashing it sets off every barrel. Two cells tall: base and handle.
  const fz = Math.min(L.D - 6, b.z1 + 4);
  let boomBox = null;
  if (M.boomBox) for (const dx of [cfg.keg.boxSide, cfg.keg.boxSide - 1, 1, 2]) { const x = Math.floor(L.W / 2) + dx, z = fz - cfg.keg.boxAhead; if (!g.get(x, 0, z) && !g.get(x, 1, z)) { g.set(x, 0, z, M.boomBox); g.set(x, 1, z, M.boomBox); boomBox = { x, y: 0, z }; break; } }
  // no barrel stands where its own effect (cluster bombs, black hole, meteor) would reach the box
  const nearBox = (x, z) => !!boomBox && Math.hypot(x - boomBox.x, z - boomBox.z) < cfg.keg.boxClear;
  const inside = [];
  for (let z = b.z0 + 1; z < b.z1; z++) for (let x = b.x0 + 1; x < b.x1; x++) if (!g.get(x, 0, z) && !g.get(x, 1, z) && !nearVault(x, z) && !nearBox(x, z) && (g.get(x - 1, 0, z) || g.get(x + 1, 0, z) || g.get(x, 0, z - 1) || g.get(x, 0, z + 1))) inside.push([x, z]);
  // the barrels inside are special ones, a different kind each (the level number turns the order)
  const kinds = (cfg.keg && cfg.keg.kinds) || [];
  for (let i = 0; i < 2 + s && inside.length; i++) { const [x, z] = inside.splice(Math.floor(rnd() * inside.length), 1)[0]; if (putKeg(x, z) && kinds.length) keg[keg.length - 1].k = kinds[(n + i) % kinds.length].id; }
  // yard: fence across the front, trees at the sides
  fence(g, M, b.x0 - 2, b.x1 + 2, fz);
  for (const [x, z] of [[3, b.z0 + 2], [L.W - 4, b.z0 + 2], [3, b.z1 - 1], [L.W - 4, b.z1 - 1]]) if (!g.get(x, 0, z)) tree(g, M, x, z, 4 + Math.floor(rnd() * 2), rnd);
  putKeg(Math.floor(L.W / 2) - 1, fz + 2) || putKeg(Math.floor(L.W / 2) - 2, fz + 2); // straight ahead (just left of the hammer) in front of the fence: the first tap is a boom
  const total = g.count();
  return { grid: g, kind, boss, theme, chest, spawn: { x: L.W / 2, z: Math.min(L.D - 2, fz + 5) }, stars, keg, total, box: b, fenceZ: fz, top, boomBox };
}
