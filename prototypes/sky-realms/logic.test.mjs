// PROTOTYPE - NOT FOR PRODUCTION
// Logic tests for Voxel Wonderland (no browser, no Three.js): world generation, island gaps, pads, wonder costs
// against the blocks that exist, structures that fit and can be climbed or walked, meshing face counts and ambient
// occlusion, the DDA raycast, the edit diff (save) and its guard against bad data, tool thresholds.
// Usage: node logic.test.mjs
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.dirname(fileURLToPath(import.meta.url));
const cfg = JSON.parse(fs.readFileSync(path.join(dir, 'game_config.json'), 'utf8'));
const code = fs.readFileSync(path.join(dir, 'game.js'), 'utf8');
const ctx = { window: {}, navigator: { languages: ['en'] }, console, Math, JSON, Map, Set, Promise, setTimeout };
vm.createContext(ctx);
vm.runInContext(code + '\n;globalThis.__T = { VoxelWorld, STRUCTURES, B, BLOCKS, FACES, AO_LEVEL, isOre, solidT, detectLang, SCALE };', ctx);
const { VoxelWorld, STRUCTURES, B, BLOCKS, detectLang, SCALE } = ctx.__T;

let fails = 0, n = 0;
const check = (ok, msg) => { n++; if (!ok) { fails++; console.log('FAIL ' + msg); } else console.log('ok   ' + msg); };
const fresh = () => { const w = new VoxelWorld(cfg); w.generate(); return w; };
const I = Object.fromEntries(cfg.islands.map((i) => [i.id, i]));

// ---- generation
const W = fresh(), W2 = fresh();
check(Buffer.compare(Buffer.from(W.cells), Buffer.from(W2.cells)) === 0, 'same seed, same world');
let solidCount = 0; for (const c of W.cells) if (c) solidCount++;
check(solidCount > 20000, `world has blocks (${solidCount})`);
const sp = cfg.world.spawn, gy = W.groundY(Math.floor(sp[0]), Math.floor(sp[2]));
check(W.get(Math.floor(sp[0]), gy, Math.floor(sp[2])) === B.GRASS && gy <= I.meadow.y + 4, `spawn stands on meadow grass, not a tree (y ${gy})`);
for (let y = gy + 1; y < gy + 4; y++) check(!W.get(Math.floor(sp[0]), y, Math.floor(sp[2])), `spawn headroom free at y ${y}`);
// the first ore is within a few steps of the spawn
let near = 9; for (const i of W.ores) { const [x, y, z] = W.xyz(i); near = Math.min(near, Math.hypot(x + 0.5 - sp[0], z + 0.5 - sp[2])); }
{ const seen = new Set(W.flowerSpots.map(([x, , z]) => x + ',' + z)); check(seen.size === W.flowerSpots.length && W.flowerSpots.length > 30, `one flower per column (${W.flowerSpots.length})`); }
check(near < 6, `an ore within 6 blocks of the spawn (${near.toFixed(1)})`);
// meadow -> crystal: a short gap that takes a few placed blocks
const rowZ = I.meadow.z; let lastM = -1, firstC = 999;
for (let x = I.meadow.x; x < I.crystal.x; x++) { const top = W.groundY(x, rowZ); if (top > 20 && x < I.meadow.x + I.meadow.r + 3) lastM = x; }
for (let x = I.crystal.x; x > I.meadow.x; x--) { const top = W.groundY(x, rowZ); if (top > 20 && x > I.crystal.x - I.crystal.r - 3) firstC = x; }
const gap = firstC - lastM - 1;
check(gap >= 2 && gap <= 6, `meadow → crystal gap is bridgeable (${gap} blocks)`);
// pads: 3×3 pad blocks with three free blocks above
for (const id of Object.keys(W.pads)) {
  const p = W.pads[id]; let ok = true;
  for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) { if (W.get(p.x + dx, p.y, p.z + dz) !== B.PAD) ok = false; for (let y = p.y + 1; y < p.y + 4; y++) if (W.get(p.x + dx, y, p.z + dz)) ok = false; }
  check(ok, `pad ${id}: 3×3 with headroom`);
}
// costs: every wonder can be paid with blocks that exist in the world (and the treehouse from the meadow alone)
const count = {}; for (const c of W.cells) if (c) count[c] = (count[c] || 0) + 1;
const yieldOf = (t) => cfg.mining.yield[t] || 1;
for (const bp of cfg.blueprints) for (const k in bp.cost) check((count[k] || 0) * yieldOf(+k) >= bp.cost[k] * 2, `wonder ${bp.id}: world holds 2× the ${bp.cost[k]} of block ${k} (${count[k] || 0})`);
{
  const M = I.meadow, have = {};
  for (let x = M.x - M.r - 3; x <= M.x + M.r + 3; x++) for (let z = M.z - M.r - 3; z <= M.z + M.r + 3; z++) for (let y = 0; y < W.H; y++) { const t = W.get(x, y, z); if (t) have[t] = (have[t] || 0) + 1; }
  for (const k in cfg.blueprints[0].cost) check((have[k] || 0) >= cfg.blueprints[0].cost[k] * 1.5, `treehouse block ${k} found on the meadow (${have[k] || 0})`);
}
// structures: inside the world, never on a pad cell, and the treehouse stairs are climbable one block at a time
for (const bp of cfg.blueprints) {
  const pad = W.pads[bp.island], L = STRUCTURES[bp.id](W, pad, I).map(([dx, dy, dz, t]) => [pad.x + dx, pad.y + 1 + dy, pad.z + dz, t]);
  check(L.length > 20 && L.every(([x, y, z]) => W.inside(x, y, z)), `${bp.id}: ${L.length} blocks, all inside the world`);
  check(!L.some(([x, y, z]) => Math.abs(x - pad.x) <= 1 && Math.abs(z - pad.z) <= 1 && y <= pad.y + 3), `${bp.id}: leaves the pad and the space above it free`);
  check(L.every(([, , , t]) => BLOCKS[t]), `${bp.id}: only known blocks`);
}
{
  const pad = W.pads.meadow, L = STRUCTURES.tree(W, pad, I);
  const steps = L.filter(([dx, dy, dz, t]) => t === B.PLANK && dx === 2).sort((a, b) => a[1] - b[1]);
  let ok = steps.length === 6;
  for (let i = 1; i < steps.length; i++) if (steps[i][1] - steps[i - 1][1] !== 1 || Math.abs(steps[i][2] - steps[i - 1][2]) !== 1) ok = false;
  const set = new Set(L.map(([x, y, z]) => x + ',' + y + ',' + z));
  for (const [x, y, z] of steps) for (let h = 1; h <= 2; h++) if (set.has(x + ',' + (y + h) + ',' + z)) ok = false;
  const top = steps[steps.length - 1], door = [top[0] + 1, top[1] + 1, top[2]];
  if (!set.has(door.join(','))) ok = false;
  for (let h = 1; h <= 2; h++) if (set.has([door[0], door[1] + h, door[2]].join(','))) ok = false;
  check(ok, 'treehouse stairs rise one block per step with headroom, ending at the door floor');
}
{
  const pad = W.pads.candy, L = STRUCTURES.bridge(W, pad, I).filter(([, , , t]) => t === B.RAINBOW);
  // walk the deck: consecutive deck rows differ by at most one block in height
  const byRow = new Map(); for (const [x, y, z] of L) { const k = x + ',' + z; byRow.set(k, y); }
  let maxStep = 0; const pts = L.map(([x, y, z]) => [x, y, z]);
  for (const [x, y, z] of pts) for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const o = byRow.get((x + dx) + ',' + (z + dz)); if (o !== undefined) maxStep = Math.max(maxStep, Math.abs(o - y)); }
  check(maxStep <= 1, `rainbow bridge deck never steps more than one block (${maxStep})`);
  const end = pts.reduce((a, b) => (Math.hypot(b[0] + pad.x - I.volcano.x, b[2] + pad.z - I.volcano.z) < Math.hypot(a[0] + pad.x - I.volcano.x, a[2] + pad.z - I.volcano.z) ? b : a));
  const ex = end[0] + pad.x, ez = end[2] + pad.z;
  check(Math.hypot(ex - I.volcano.x, ez - I.volcano.z) < I.volcano.r, 'rainbow bridge lands on the volcano island');
}

// ---- raycast
{
  const w = new VoxelWorld(cfg); w.base = w.cells.slice();
  w.set(10, 10, 15, B.COBBLE);
  const h = w.raycast(10.5, 10.5, 10.5, 0, 0, 1, 10);
  check(h && h.x === 10 && h.y === 10 && h.z === 15 && h.nz === -1 && Math.abs(h.t - 4.5) < 1e-6, 'raycast hits the block face toward the eye');
  w.set(10, 10, 12, B.WATER);
  const h2 = w.raycast(10.5, 10.5, 10.5, 0, 0, 1, 10);
  check(h2 && h2.z === 15, 'raycast passes through water');
  check(w.raycast(10.5, 10.5, 10.5, 0, 0, 1, 3) === null, 'raycast respects reach');
  const h3 = w.raycast(10.5, 13.5, 15.5, 0, -1, 0, 10);
  check(h3 && h3.ny === 1 && h3.y === 10, 'raycast from above hits the top face');
}
// ---- meshing
{
  const w = new VoxelWorld(cfg); w.base = w.cells.slice();
  const tex = { uv: () => [0, 0, 1, 1] };
  w.set(5, 5, 5, B.COBBLE);
  let m = w.meshChunk(0, 0, 0, tex);
  check(m.o.p.length / 3 === 24 && m.o.i.length === 36, 'one block: 6 faces');
  w.set(6, 5, 5, B.COBBLE);
  m = w.meshChunk(0, 0, 0, tex);
  check(m.o.p.length / 12 === 10, 'two touching blocks: shared faces culled (10 faces)');
  w.set(7, 5, 5, B.GLASS);
  m = w.meshChunk(0, 0, 0, tex);
  check(m.o.p.length / 12 === 15, 'glass next to stone: stone face behind glass is kept, glass face against stone culled');
  // ambient occlusion: the top face of a floor block next to a wall is darker on the wall side
  const a = new VoxelWorld(cfg); a.base = a.cells.slice();
  a.set(3, 3, 3, B.COBBLE); a.set(4, 4, 3, B.COBBLE);
  const mm = a.meshChunk(0, 0, 0, tex), shades = [];
  for (let f = 0; f < mm.o.p.length / 12; f++) { const nx = mm.o.n[f * 12], ny = mm.o.n[f * 12 + 1]; const x0 = mm.o.p[f * 12]; if (ny === 1 && Math.min(mm.o.p[f * 12], mm.o.p[f * 12 + 3], mm.o.p[f * 12 + 6], mm.o.p[f * 12 + 9]) === 3) for (let k = 0; k < 4; k++) shades.push([mm.o.p[f * 12 + k * 3], mm.o.c[f * 12 + k * 3]]); void nx; void x0; }
  const wallSide = shades.filter(([x]) => x === 4).map(([, c]) => c), open = shades.filter(([x]) => x === 3).map(([, c]) => c);
  check(wallSide.length === 2 && open.length === 2 && Math.max(...wallSide) < Math.min(...open), 'ambient occlusion darkens corners against a wall');
  // a cell hidden while it pops in is not meshed
  w.hidden.add(w.idx(5, 5, 5)); m = w.meshChunk(0, 0, 0, tex); w.hidden.clear();
  check(m.o.p.length / 12 === 11, `popping block is left out of its chunk mesh (${m.o.p.length / 12} faces)`);
}
// ---- edits (save diff)
{
  const w = fresh();
  const [x, y, z] = [Math.floor(sp[0]), gy, Math.floor(sp[2])];
  w.set(x, y, z, B.AIR); w.set(x, y + 1, z, B.CANDY); w.set(x + 1, y + 1, z, B.RAINBOW); w.set(x + 1, y + 1, z, B.AIR);
  const ed = w.exportEdits();
  check(ed.length === 4, `edits keep only real changes (${ed.length / 2})`);
  const w2 = fresh(); w2.importEdits(JSON.parse(JSON.stringify(ed)));
  check(Buffer.compare(Buffer.from(w.cells), Buffer.from(w2.cells)) === 0, 'edits round-trip through JSON');
  w.set(x, y, z, B.GRASS);
  check(w.exportEdits().length === 2, 'putting a block back as generated drops its edit');
  const w3 = fresh(), before = Buffer.from(w3.cells);
  w3.importEdits([NaN, 1, -5, 2, 1e12, 3, 5, 999, 7, 1.5e3, 'x', 2, 10]);
  let diff = 0; for (let i = 0; i < before.length; i++) if (before[i] !== w3.cells[i]) diff++;
  check(diff <= 1, `bad saved edits are ignored (${diff} cell changed)`);
  w3.importEdits(null); w3.importEdits({}); check(true, 'importEdits survives null/object');
  // ores tracked through edits
  const w4 = fresh(), before4 = w4.ores.size; const oi = [...w4.ores][0], [ox, oy, oz] = w4.xyz(oi);
  w4.set(ox, oy, oz, B.AIR); check(w4.ores.size === before4 - 1, 'mined ore leaves the ore list');
  w4.set(ox, oy, oz, B.GOLDORE); check(w4.ores.size === before4, 'placed ore joins the ore list');
  // remesh marks: an edit on a chunk border also dirties the neighbour
  w4.dirty.clear(); w4.set(16, 40, 40, B.CANDY); check(w4.dirty.size === 2, 'edit on a chunk border remeshes both chunks');
}
// ---- config sanity
{
  const at = cfg.tools.map((t) => t.at); check(at.every((v, i) => i === 0 || v > at[i - 1]) && at[0] === 0, 'tool thresholds rise from 0');
  check(cfg.tools.every((t, i) => i === 0 || t.speed > cfg.tools[i - 1].speed), 'each tool mines faster');
  check(SCALE.length === 6 && Math.abs(SCALE[0] - 523.25) < 0.01 && Math.abs(SCALE[5] - 1046.5) < 0.01, 'combo notes run C5 → C6');
  check(detectLang(['ar-EG']) === 'ar' && detectLang(['fr-FR', 'id-ID']) === 'id' && detectLang(['de']) === 'en', 'device language picks a supported one');
  const keys = Object.keys(cfg.strings.en);
  for (const l of Object.keys(cfg.strings)) check(keys.every((k) => typeof cfg.strings[l][k] === 'string' && cfg.strings[l][k].length), `strings complete in ${l}`);
  const used = [...code.matchAll(/this\.T\('([a-z_]+)'\)/g)].map((m) => m[1]);
  check(used.every((k) => keys.includes(k)), 'every string key used in code exists');
  for (const bp of cfg.blueprints) check(keys.includes('b_' + bp.id), `wonder ${bp.id} has a name`);
  for (const k of cfg.pets.species) check(keys.includes('p_' + k), `pet ${k} has a name`);
  for (const t of cfg.tools.slice(1)) check(keys.includes('t_' + t.id), `tool ${t.id} has a name`);
}
console.log(`\n${n - fails}/${n} passed`);
process.exit(fails ? 1 : 0);
