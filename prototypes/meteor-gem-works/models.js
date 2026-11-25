// PROTOTYPE - NOT FOR PRODUCTION
// Geometry kit and models of Meteor Gem Works. Every prop is built in code from rounded, vertex-coloured parts merged
// into one geometry (one draw call per prop kind, one shared material). Characters are small part hierarchies so they
// can be animated. Nothing here touches THREE at import time: the Astrocade bundle runs modules before three.js loads.
// Plan: plan.md §5 (art direction). Helpers paint/merge/rbox follow the +1 Mega Hammer kit.
/* global THREE */

/** Palette: warm desert world, cool crystal treasure, mint-teal machines, candy accents. No pure white (anti-glare). */
export const PAL = {
  sand: 0xe9c08a, sandDark: 0xc99863, sandLight: 0xf3d6a6, terra: 0xc8643c, terraDark: 0x9c4a2e, terraLight: 0xe0875a,
  wood: 0xb97a48, woodDark: 0x7e4f2e, woodLight: 0xd9a46c, plank: 0xc98d58, plankDark: 0xa36d40,
  sage: 0x8fae7a, sageDark: 0x5f8457, cactus: 0x6f9e5a, cactusDark: 0x4f7a44, flower: 0xf27aa0,
  teal: 0x3fb3a3, tealDark: 0x2a7f78, brass: 0xd8a64a, brassDark: 0x9c7230, iron: 0x4a4e5c, steel: 0xb8c2cc,
  cream: 0xf3e6cf, ink: 0x2a2233, skin: 0xf1c29a, skinDark: 0xc98d68, red: 0xd9544a, navy: 0x3b4a7a, plum: 0x7a4a8c,
  rock: 0x3b3340, rockLight: 0x5d5060, char: 0x2a242e, magenta: 0xe04cc0, violet: 0x8a5cf0, cyan: 0x4fd8f0,
  velvet: 0x7a2f5a, glass: 0xbfe6ff, pink: 0xf29ab8, mint: 0x8fe0c0, sun: 0xf6c35a,
};

const col = (c) => new THREE.Color(c);
const shade = (a, b, t) => col(a).lerp(col(b), Math.max(0, Math.min(1, t)));

/** Non-indexed copy with a colour attribute painted by fn(x, y, z) -> THREE.Color, or one colour. */
export function paint(g, c) {
  const n = g.index ? g.toNonIndexed() : g;
  if (n !== g) g.dispose();
  const p = n.attributes.position, a = new Float32Array(p.count * 3), one = typeof c === 'function' ? null : col(c);
  for (let i = 0; i < p.count; i++) { const k = one || c(p.getX(i), p.getY(i), p.getZ(i)); a[i * 3] = k.r; a[i * 3 + 1] = k.g; a[i * 3 + 2] = k.b; }
  n.setAttribute('color', new THREE.BufferAttribute(a, 3));
  if (n.attributes.uv) n.deleteAttribute('uv');
  return n;
}

/** Concatenates painted non-indexed geometries (position, normal, color) into one, disposing the parts. */
export function merge(parts) {
  let count = 0;
  for (const g of parts) count += g.attributes.position.count;
  const out = new THREE.BufferGeometry();
  for (const name of ['position', 'normal', 'color']) {
    const a = new Float32Array(count * 3); let o = 0;
    for (const g of parts) { a.set(g.attributes[name].array, o); o += g.attributes[name].array.length; }
    out.setAttribute(name, new THREE.BufferAttribute(a, 3));
  }
  for (const g of parts) g.dispose();
  out.computeBoundingSphere();
  return out;
}

/** A box with rounded edges of radius r. */
export function rbox(w, h, d, r, seg = 2) {
  const g = new THREE.BoxGeometry(w, h, d, seg * 2, seg * 2, seg * 2), p = g.attributes.position, nrm = g.attributes.normal;
  const hx = w / 2 - r, hy = h / 2 - r, hz = d / 2 - r, v = new THREE.Vector3(), c = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    c.set(Math.max(-hx, Math.min(hx, v.x)), Math.max(-hy, Math.min(hy, v.y)), Math.max(-hz, Math.min(hz, v.z)));
    v.sub(c); if (v.lengthSq() < 1e-9) v.fromBufferAttribute(nrm, i); v.normalize();
    nrm.setXYZ(i, v.x, v.y, v.z); p.setXYZ(i, c.x + v.x * r, c.y + v.y * r, c.z + v.z * r);
  }
  return g;
}

/** Moves, rotates (Euler) and scales a geometry in place; returns it. */
export const at = (g, x, y, z, rx = 0, ry = 0, rz = 0, s = 1) => {
  const sv = Array.isArray(s) ? new THREE.Vector3(...s) : new THREE.Vector3(s, s, s);
  g.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), sv));
  return g;
};
const P = (g, c) => paint(g, c);
const sphere = (r, w = 12, h = 9) => new THREE.SphereGeometry(r, w, h);
const cyl = (r0, r1, h, s = 12) => new THREE.CylinderGeometry(r0, r1, h, s);
const lathe = (pts, s = 16) => new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), s);

/** Smooth value noise on 3D points (deterministic), used for rock lumps. */
export function noise3(x, y, z) {
  const h = (i, j, k) => { const s = Math.sin(i * 127.1 + j * 311.7 + k * 74.7) * 43758.5453; return s - Math.floor(s); };
  const fx = Math.floor(x), fy = Math.floor(y), fz = Math.floor(z), tx = x - fx, ty = y - fy, tz = z - fz;
  const u = (t) => t * t * (3 - 2 * t), a = u(tx), b = u(ty), c = u(tz), L = (p, q, t) => p + (q - p) * t;
  return L(L(L(h(fx, fy, fz), h(fx + 1, fy, fz), a), L(h(fx, fy + 1, fz), h(fx + 1, fy + 1, fz), a), b),
    L(L(h(fx, fy, fz + 1), h(fx + 1, fy, fz + 1), a), L(h(fx, fy + 1, fz + 1), h(fx + 1, fy + 1, fz + 1), a), b), c);
}
const fbm = (x, y, z) => noise3(x, y, z) * 0.6 + noise3(x * 2.1, y * 2.1, z * 2.1) * 0.28 + noise3(x * 4.3, y * 4.3, z * 4.3) * 0.12;

// ---------------------------------------------------------------- the meteor and its crater

/** The meteor body: a lumpy lat-long sphere (uv kept for the cut map). Lumps are baked into the radius. */
export function buildMeteor(R) {
  const g = new THREE.SphereGeometry(R, 150, 100), p = g.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i).normalize();
    const n = fbm(v.x * 1.6 + 3, v.y * 1.6, v.z * 1.6) - 0.5, crater = Math.max(0, noise3(v.x * 3.2, v.y * 3.2 + 7, v.z * 3.2) - 0.72) * 1.6;
    const r = R * (1 + n * 0.16 - crater * 0.09 + (v.y < -0.2 ? 0.04 : 0));
    p.setXYZ(i, v.x * r, v.y * r * 0.94, v.z * r);
  }
  g.computeVertexNormals();
  return g;
}

/** Crater: a scorched dish with a raised, broken rim of boulders, sized for meteor radius R. */
export function buildCrater(R) {
  const parts = [], rim = R * 1.55;
  const dish = new THREE.RingGeometry(R * 0.6, rim * 1.35, 64, 6); dish.rotateX(-Math.PI / 2);
  const dp = dish.attributes.position;
  for (let i = 0; i < dp.count; i++) { const x = dp.getX(i), z = dp.getZ(i), d = Math.hypot(x, z) / rim; dp.setY(i, Math.max(0, 0.55 * Math.exp(-((d - 1) ** 2) / 0.03)) - 0.05 + (d < 0.9 ? -0.1 * (0.9 - d) : 0) + (noise3(x, 0, z) - 0.5) * 0.12); }
  dish.computeVertexNormals();
  parts.push(P(dish, (x, y, z) => { const d = Math.hypot(x, z) / rim; return d < 1.05 ? shade(PAL.char, PAL.terraDark, d * 0.9 - 0.1 + y * 0.6) : shade(PAL.terraDark, PAL.sandDark, (d - 1.05) * 3); }));
  for (let k = 0; k < 34; k++) {
    const a = (k / 34) * Math.PI * 2 + Math.sin(k * 7.1) * 0.06, s = 0.32 + ((k * 37) % 9) / 14, d = rim * (1.0 + ((k * 13) % 5) / 30);
    const b = new THREE.IcosahedronGeometry(s, 1), bp = b.attributes.position;
    for (let i = 0; i < bp.count; i++) { const x = bp.getX(i), y = bp.getY(i), z = bp.getZ(i), f = 0.8 + noise3(x * 3 + k, y * 3, z * 3) * 0.45; bp.setXYZ(i, x * f, y * f * 0.7, z * f); }
    b.computeVertexNormals();
    parts.push(P(at(b, Math.cos(a) * d, s * 0.25, Math.sin(a) * d, k, k * 0.7, 0), (x, y) => shade(PAL.terraDark, PAL.terra, 0.3 + y * 0.8)));
  }
  return merge(parts);
}

// ---------------------------------------------------------------- small items (instanced)

/** A cut gem (brilliant): crown and pavilion as a lathe with 8 facets; flat shading makes the facets read. */
export function gemGeo(s = 0.22) {
  const g = lathe([[0, -s * 0.95], [s * 0.98, -s * 0.05], [s, s * 0.08], [s * 0.62, s * 0.42], [0, s * 0.44]], 8);
  return g.toNonIndexed();
}
/** A raw crystal chunk: three hexagonal points on a rocky base. */
export function chunkGeo(s = 0.2) {
  const parts = [];
  const pt = (h, r, x, z, rx, rz) => { const c = lathe([[0, 0], [r, 0.02], [r * 0.95, h * 0.72], [0, h]], 6); return at(c, x, 0, z, rx, 0, rz); };
  parts.push(pt(s * 2.2, s * 0.42, 0, 0, 0.1, -0.15), pt(s * 1.6, s * 0.34, s * 0.32, s * 0.12, 0.2, 0.55), pt(s * 1.3, s * 0.3, -s * 0.3, -s * 0.1, -0.25, -0.6));
  const base = new THREE.IcosahedronGeometry(s * 0.45, 0); base.scale(1.3, 0.55, 1.1);
  const all = [...parts.map((g) => g.toNonIndexed()), at(base.toNonIndexed(), 0, s * 0.05, 0)];
  const out = new THREE.BufferGeometry(); let n = 0; for (const g of all) n += g.attributes.position.count;
  const pos = new Float32Array(n * 3), ao = new Float32Array(n * 3); let o = 0;
  all.forEach((g, gi) => { pos.set(g.attributes.position.array, o * 3); for (let i = 0; i < g.attributes.position.count; i++) { const rock = gi === all.length - 1; ao[(o + i) * 3] = rock ? 0.32 : 1; ao[(o + i) * 3 + 1] = rock ? 0.27 : 1; ao[(o + i) * 3 + 2] = rock ? 0.34 : 1; } o += g.attributes.position.count; g.dispose(); });
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3)); out.setAttribute('color', new THREE.BufferAttribute(ao, 3)); out.computeVertexNormals();
  return out;
}
/** A gold coin with a raised rim and a star emboss. */
export function coinGeo(r = 0.2) {
  const g = lathe([[0, 0], [r * 0.98, 0], [r, 0.012], [r, 0.05], [r * 0.9, 0.062], [r * 0.82, 0.05], [r * 0.35, 0.056], [0, 0.058]], 20);
  return P(g, (x, y) => shade(PAL.brass, 0xffd77a, y > 0.055 ? 0.7 : 0.2));
}

// ---------------------------------------------------------------- town props (one merged geometry each)

/** False-front western shop with a porch, posts, a sign board and windows. Returns { body, windows } geometries. */
export function buildShop(w, h, wall, trim, roofCol) {
  const parts = [], win = [], d = 3.2;
  parts.push(P(at(rbox(w, h, d, 0.08), 0, h / 2, 0), (x, y) => shade(wall, trim, Math.abs(Math.sin(y * 7.5)) > 0.94 ? 0.35 : 0.04 + (1 - y / h) * 0.12)));
  parts.push(P(at(rbox(w * 1.04, h * 0.32, 0.22, 0.05), 0, h + h * 0.13, d / 2 - 0.12), wall));
  parts.push(P(at(rbox(w * 1.1, 0.16, 0.34, 0.05), 0, h + h * 0.3, d / 2 - 0.12), trim));
  parts.push(P(at(rbox(w + 0.3, 0.18, d + 0.3, 0.06), 0, h + 0.05, 0), roofCol));
  // porch: deck, roof on posts
  parts.push(P(at(rbox(w + 0.2, 0.16, 1.5, 0.05), 0, 0.08, d / 2 + 0.72), (x, y, z) => shade(PAL.plank, PAL.plankDark, Math.abs(Math.sin(x * 9)) > 0.93 ? 0.6 : 0.1)));
  parts.push(P(at(rbox(w + 0.36, 0.12, 1.7, 0.05), 0, h * 0.62, d / 2 + 0.78, 0.12), roofCol));
  for (const sx of [-0.46, -0.15, 0.15, 0.46]) parts.push(P(at(cyl(0.07, 0.08, h * 0.62, 8), sx * w, h * 0.31, d / 2 + 1.38), trim));
  parts.push(P(at(rbox(w * 0.98, 0.07, 0.07, 0.02), 0, 0.62, d / 2 + 1.38), trim));
  // door and windows (windows go to their own glowing mesh)
  parts.push(P(at(rbox(0.9, 1.55, 0.08, 0.04), 0, 0.85, d / 2 + 0.01), PAL.woodDark));
  for (const sx of [-1, 1]) {
    win.push(P(at(rbox(0.78, 0.9, 0.06, 0.04), sx * w * 0.3, 1.2, d / 2 + 0.02), 0xffffff));
    parts.push(P(at(rbox(0.94, 0.1, 0.12, 0.03), sx * w * 0.3, 0.72, d / 2 + 0.05), trim));
    if (h > 3) win.push(P(at(rbox(0.7, 0.75, 0.06, 0.04), sx * w * 0.28, h * 0.78, d / 2 + 0.02), 0xffffff));
  }
  return { body: merge(parts), windows: merge(win) };
}
/** Water tower on stilts with bands and a ladder. */
export function buildWaterTower() {
  const parts = [];
  for (const [x, z] of [[-0.8, -0.8], [0.8, -0.8], [-0.8, 0.8], [0.8, 0.8]]) parts.push(P(at(cyl(0.09, 0.11, 4, 8), x, 2, z), PAL.woodDark));
  for (const y of [1.2, 2.6]) for (const r of [0, Math.PI / 2]) parts.push(P(at(rbox(1.9, 0.08, 0.08, 0.02), 0, y, 0, 0, r, 0), PAL.wood));
  parts.push(P(at(lathe([[0, 0], [1.25, 0], [1.25, 1.8], [1.3, 1.85], [0, 1.9]], 18), 0, 4, 0), (x, y, z) => shade(PAL.wood, PAL.woodDark, Math.abs(Math.sin(Math.atan2(z, x) * 14)) > 0.9 ? 0.4 : 0.08)));
  for (const y of [4.35, 5.2]) parts.push(P(at(new THREE.TorusGeometry(1.27, 0.04, 5, 24), 0, y, 0, Math.PI / 2), PAL.iron));
  parts.push(P(at(lathe([[0, 0], [1.45, 0], [0, 0.9]], 18), 0, 5.88, 0), PAL.terraDark));
  for (let k = 0; k < 10; k++) parts.push(P(at(rbox(0.36, 0.05, 0.05, 0.02), 0.95, 0.35 + k * 0.38, 0.95, 0, Math.PI / 4), PAL.woodLight));
  parts.push(P(at(sphere(0.12, 6, 5), 0, 6.85, 0), PAL.brass));
  return merge(parts);
}
/** Windmill tower (the blades are a separate geometry so they can turn). */
export function buildWindmill() {
  const parts = [];
  for (const a of [0, 2.1, 4.2]) parts.push(P(at(cyl(0.05, 0.08, 6.2, 6), Math.cos(a) * 0.55, 3.1, Math.sin(a) * 0.55, Math.sin(a) * 0.09, 0, -Math.cos(a) * 0.09), PAL.steel));
  parts.push(P(at(rbox(0.5, 0.4, 0.8, 0.08), 0, 6.3, 0), PAL.red));
  parts.push(P(at(rbox(0.06, 0.7, 1.1, 0.03), 0, 6.35, -0.85), PAL.red));
  const blades = [];
  for (let k = 0; k < 12; k++) blades.push(P(at(rbox(0.22, 1.2, 0.03, 0.02), 0, 0.85, 0, 0, 0, 0), k % 2 ? PAL.cream : PAL.red).rotateZ((k / 12) * Math.PI * 2));
  blades.push(P(at(cyl(0.14, 0.14, 0.16, 10), 0, 0, 0, Math.PI / 2), PAL.iron));
  return { tower: merge(parts), blades: merge(blades) };
}
/** Saguaro cactus with arms and a few pink flowers. */
export function buildCactus(v = 0) {
  const parts = [], H = 2.2 + (v % 3) * 0.5;
  const arm = (h, r) => lathe([[r * 0.9, 0], [r, 0.1], [r, h - r], [r * 0.6, h - r * 0.2], [0, h]], 10);
  const tint = (x, y, z) => shade(PAL.cactus, PAL.cactusDark, Math.abs(Math.sin(Math.atan2(z, x) * 5)) > 0.85 ? 0.5 : 0.05);
  parts.push(P(arm(H, 0.28), tint));
  const sides = v % 2 ? [1] : [1, -1];
  for (const s of sides) {
    parts.push(P(at(cyl(0.18, 0.2, 0.55, 10), s * 0.4, H * 0.42, 0, 0, 0, s * Math.PI / 2), tint));
    parts.push(P(at(arm(H * 0.45, 0.2), s * 0.62, H * 0.42, 0), tint));
    parts.push(P(at(sphere(0.1, 6, 5), s * 0.62, H * 0.42 + H * 0.45, 0.08), PAL.flower));
  }
  parts.push(P(at(sphere(0.12, 6, 5), 0.05, H + 0.02, 0.1), PAL.flower));
  return merge(parts);
}
/** A round barrel and a small crate cluster. */
export function buildBarrels() {
  const parts = [];
  const barrel = (x, z, s) => {
    parts.push(P(at(lathe([[0, 0], [0.36, 0], [0.42, 0.42], [0.36, 0.84], [0, 0.84]], 14), x, 0, z, 0, 0, 0, s), (px, py, pz) => shade(PAL.wood, PAL.woodDark, Math.abs(Math.sin(Math.atan2(pz - z, px - x) * 9)) > 0.9 ? 0.45 : 0.1)));
    for (const y of [0.16, 0.68]) parts.push(P(at(new THREE.TorusGeometry(0.4 * s, 0.025, 4, 16), x, y * s, z, Math.PI / 2), PAL.iron));
  };
  barrel(0, 0, 1); barrel(0.82, 0.25, 0.92);
  parts.push(P(at(rbox(0.7, 0.6, 0.7, 0.05), -0.75, 0.3, 0.35, 0, 0.3), PAL.woodLight));
  return merge(parts);
}
/** Mesa (background rock table) with banded strata, w wide and h tall. */
export function buildMesa(w, h, d) {
  const shape = new THREE.Shape(); const n = 9;
  shape.moveTo(-w / 2, 0);
  for (let i = 0; i <= n; i++) { const t = i / n, x = -w / 2 + w * (0.12 + t * 0.76), y = h * (0.92 + Math.sin(t * 9.1) * 0.05); shape.lineTo(x, y); }
  shape.lineTo(w / 2, 0); shape.lineTo(-w / 2, 0);
  const g = new THREE.ExtrudeGeometry(shape, { depth: d, bevelEnabled: true, bevelSize: 0.6, bevelThickness: 0.6, bevelSegments: 2, curveSegments: 4 });
  g.translate(0, 0, -d / 2);
  return P(g, (x, y) => { const b = Math.floor(y / (h / 6)); return shade([PAL.terra, PAL.terraLight, PAL.terraDark, PAL.terra, PAL.terraLight, 0xe39a6a][b % 6], PAL.terraDark, (noise3(x * 0.3, y * 0.8, 0) - 0.5) * 0.5 + 0.1); });
}
/** Lamp post with a lantern (the bulb is separate, it glows at dusk). */
export function buildLampPost() {
  const parts = [P(at(cyl(0.06, 0.08, 2.6, 8), 0, 1.3, 0), PAL.iron), P(at(rbox(0.5, 0.06, 0.06, 0.02), 0.2, 2.55, 0), PAL.iron),
    P(at(lathe([[0, 0], [0.18, 0.05], [0.2, 0.32], [0.1, 0.42], [0, 0.44]], 8), 0.42, 2.18, 0), PAL.brass), P(at(cyl(0.16, 0.2, 0.08, 10), 0, 0.04, 0), PAL.iron)];
  return { post: merge(parts), bulb: P(at(sphere(0.13, 10, 8), 0.42, 2.38, 0), 0xffffff) };
}
/** A string of bunting flags (triangles) between two points, sagging. */
export function buildBunting(ax, ay, az, bx, by, bz, n = 12) {
  const parts = [], cols = [PAL.red, PAL.sun, PAL.teal, PAL.pink, PAL.violet];
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n, x = ax + (bx - ax) * t, z = az + (bz - az) * t, y = ay + (by - ay) * t - Math.sin(t * Math.PI) * 0.5;
    const f = new THREE.BufferGeometry(); f.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-0.17, 0, 0, 0.17, 0, 0, 0, -0.36, 0, 0.17, 0, 0, -0.17, 0, 0, 0, -0.36, 0]), 3)); f.computeVertexNormals();
    parts.push(P(at(f, x, y, z, 0, Math.atan2(bx - ax, bz - az) + Math.PI / 2, 0), cols[i % cols.length]));
  }
  return merge(parts);
}

// ---------------------------------------------------------------- stations

/** Gem polisher: wooden bench, brass motor, a hopper; the stone wheel is separate (it spins). */
export function buildPolisher() {
  const parts = [];
  parts.push(P(at(rbox(2.0, 0.9, 1.3, 0.08), 0, 0.45, 0), (x, y) => shade(PAL.wood, PAL.woodDark, Math.abs(Math.sin(y * 12)) > 0.92 ? 0.5 : 0.1)));
  parts.push(P(at(rbox(2.2, 0.12, 1.45, 0.05), 0, 0.95, 0), PAL.woodLight));
  parts.push(P(at(rbox(0.7, 0.55, 0.55, 0.12), 0.65, 1.3, 0), PAL.teal));
  parts.push(P(at(cyl(0.2, 0.2, 0.62, 14), 0.65, 1.3, 0, Math.PI / 2), PAL.brass));
  parts.push(P(at(cyl(0.05, 0.05, 1.1, 8), 0.05, 1.45, 0, 0, 0, Math.PI / 2), PAL.steel));
  // hopper (input bin) on the left, flared
  parts.push(P(at(lathe([[0.25, 0], [0.32, 0.05], [0.6, 0.55], [0.64, 0.6], [0.57, 0.6], [0.24, 0.08], [0, 0.08]], 10), -0.6, 1.0, 0.05), PAL.tealDark));
  parts.push(P(at(rbox(0.5, 0.04, 0.4, 0.02), 0.9, 0.96, 0.75), PAL.brassDark));
  return merge(parts);
}
export function buildWheel() {
  return merge([P(at(cyl(0.48, 0.48, 0.16, 28), 0, 0, 0, 0, 0, Math.PI / 2), (x, y, z) => shade(0xc9b8a8, 0x8a7a70, Math.hypot(y, z) / 0.48 * 0.6)),
    P(at(cyl(0.12, 0.12, 0.22, 12), 0, 0, 0, 0, 0, Math.PI / 2), PAL.brass)]);
}
/** Display counter where finished gems wait (velvet top, brass trim). */
export function buildCounter() {
  return merge([P(at(rbox(1.8, 0.85, 0.9, 0.08), 0, 0.42, 0), PAL.woodDark), P(at(rbox(1.9, 0.1, 1.0, 0.04), 0, 0.88, 0), PAL.brass),
    P(at(rbox(1.7, 0.06, 0.82, 0.03), 0, 0.95, 0), PAL.velvet), P(at(rbox(1.5, 0.5, 0.06, 0.03), 0, 0.42, 0.46), PAL.wood)]);
}
/** Glass display case for selling: wooden plinth, brass frame, a glass hood (separate, transparent). */
export function buildStand() {
  const parts = [P(at(rbox(1.9, 0.9, 1.2, 0.1), 0, 0.45, 0), (x, y) => shade(PAL.plum, 0x4e2c5c, 0.2 + (1 - y) * 0.3)), P(at(rbox(2.0, 0.08, 1.3, 0.03), 0, 0.92, 0), PAL.brass),
    P(at(rbox(1.8, 0.05, 1.1, 0.02), 0, 0.97, 0), PAL.velvet)];
  for (const [x, z] of [[-0.93, -0.58], [0.93, -0.58], [-0.93, 0.58], [0.93, 0.58]]) parts.push(P(at(cyl(0.035, 0.035, 0.85, 6), x, 1.4, z), PAL.brass));
  parts.push(P(at(rbox(1.98, 0.07, 1.28, 0.03), 0, 1.85, 0), PAL.brass));
  // awning sign over it
  parts.push(P(at(rbox(2.3, 0.5, 0.12, 0.06), 0, 2.45, -0.62), PAL.teal), P(at(rbox(2.4, 0.08, 0.16, 0.03), 0, 2.72, -0.62), PAL.brass));
  for (const sx of [-1, 1]) parts.push(P(at(cyl(0.05, 0.05, 2.7, 8), sx * 1.05, 1.35, -0.62), PAL.woodDark));
  const glass = rbox(1.82, 0.84, 1.12, 0.04); glass.translate(0, 1.42, 0);
  return { body: merge(parts), glass };
}
/** Overflow crate (takes extra chunks for a coin). */
export function buildCrate() {
  const parts = [P(at(rbox(1.1, 0.7, 0.8, 0.05), 0, 0.35, 0), (x, y) => shade(PAL.woodLight, PAL.wood, Math.abs(Math.sin(y * 20)) > 0.9 ? 0.6 : 0.1))];
  for (const sx of [-1, 1]) parts.push(P(at(rbox(0.08, 0.75, 0.84, 0.03), sx * 0.52, 0.37, 0), PAL.woodDark));
  parts.push(P(at(cyl(0.18, 0.18, 0.04, 16), 0, 0.45, 0.41, Math.PI / 2), PAL.brass));
  return merge(parts);
}
/** Price pad base (the face with icon and price is a canvas texture on a separate plane). */
export function buildPadBase() {
  return merge([P(at(rbox(2.3, 0.14, 2.3, 0.1), 0, 0.07, 0), PAL.brassDark), P(at(rbox(2.1, 0.06, 2.1, 0.06), 0, 0.15, 0), PAL.brass)]);
}
/** Wooden boardwalk deck (the play area) with plank seams and a brass edge. */
export function buildDeck(D) {
  const w = D.x1 - D.x0 + 1.2, d = D.z1 - D.z0 + 1.2, parts = [];
  const top = new THREE.PlaneGeometry(w, d, Math.round(w * 2.4), 6); top.rotateX(-Math.PI / 2);
  parts.push(P(at(top, (D.x0 + D.x1) / 2, 0.16, (D.z0 + D.z1) / 2), (x, y, z) => {
    const plank = Math.floor((x + 40) / 0.42), seam = ((x + 40) / 0.42) % 1 < 0.06; const v = (Math.sin(plank * 12.9898) * 43758.5) % 1;
    return seam ? col(PAL.plankDark) : shade(PAL.plank, PAL.woodLight, Math.abs(v) * 0.5 + noise3(x * 0.8, 0, z * 0.25) * 0.25);
  }));
  parts.push(P(at(rbox(w, 0.18, d, 0.06), (D.x0 + D.x1) / 2, 0.06, (D.z0 + D.z1) / 2), PAL.woodDark));
  return merge(parts);
}
/** Drill rig: tripod base, mint-teal boom, brass motor; the drill head is separate (plunges and spins). */
export function buildRig() {
  const parts = [];
  parts.push(P(at(rbox(1.8, 0.3, 1.8, 0.12), 0, 0.15, 0), PAL.tealDark));
  parts.push(P(at(cyl(0.45, 0.6, 1.6, 16), 0, 1.0, 0), PAL.teal));
  parts.push(P(at(new THREE.TorusGeometry(0.5, 0.06, 6, 20), 0, 1.75, 0, Math.PI / 2), PAL.brass));
  parts.push(P(at(rbox(0.5, 0.5, 2.6, 0.12), 0, 2.05, -1.0, -0.32), PAL.teal));
  parts.push(P(at(cyl(0.08, 0.08, 2.4, 8), 0.3, 1.9, -0.9, -0.32 + Math.PI / 2), PAL.steel));
  parts.push(P(at(rbox(0.7, 0.6, 0.6, 0.14), 0, 2.55, 0.25), PAL.brass));
  parts.push(P(at(sphere(0.12, 8, 6), 0.32, 2.75, 0.5), PAL.red));
  for (const a of [0.6, 2.7, 4.8]) parts.push(P(at(cyl(0.07, 0.07, 1.2, 6), Math.cos(a) * 0.75, 0.55, Math.sin(a) * 0.75, Math.sin(a) * 0.4, 0, -Math.cos(a) * 0.4), PAL.iron));
  return merge(parts);
}
export function buildDrillHead() {
  const parts = [P(at(cyl(0.3, 0.3, 0.5, 14), 0, 0, 0), PAL.brass), P(at(lathe([[0, -1.2], [0.08, -1.0], [0.22, -0.3], [0.24, 0], [0, 0]], 10), 0, -0.25, 0), PAL.steel)];
  for (let k = 0; k < 3; k++) parts.push(P(at(new THREE.TorusGeometry(0.17 - k * 0.04, 0.025, 4, 12), 0, -0.55 - k * 0.22, 0, Math.PI / 2 + 0.25), PAL.steel));
  return merge(parts);
}
/** Rope fence posts with a sagging rope (the crowd stands behind it). */
export function buildRopeFence(x0, x1, z, n = 9) {
  const parts = [];
  for (let i = 0; i <= n; i++) { const x = x0 + ((x1 - x0) * i) / n; parts.push(P(at(cyl(0.07, 0.08, 0.9, 8), x, 0.45, z), PAL.brass), P(at(sphere(0.1, 8, 6), x, 0.92, z), PAL.brass)); }
  for (let i = 0; i < n; i++) {
    const xa = x0 + ((x1 - x0) * i) / n, xb = x0 + ((x1 - x0) * (i + 1)) / n, c = new THREE.QuadraticBezierCurve3(new THREE.Vector3(xa, 0.8, z), new THREE.Vector3((xa + xb) / 2, 0.55, z), new THREE.Vector3(xb, 0.8, z));
    parts.push(P(new THREE.TubeGeometry(c, 8, 0.035, 5), PAL.velvet));
  }
  return merge(parts);
}

// ---------------------------------------------------------------- characters

/** Merges the untransformed child meshes of each group that share material m into one mesh (fewer draw calls). */
export function collapse(groups, m) {
  for (const g of groups) {
    if (!g) continue;
    const parts = g.children.filter((c) => c.isMesh && c.material === m && c.position.lengthSq() === 0 && c.rotation.x === 0 && c.rotation.y === 0 && c.rotation.z === 0 && c.scale.x === 1);
    if (parts.length < 2) continue;
    const one = new THREE.Mesh(merge(parts.map((c) => c.geometry)), m); one.castShadow = true;
    for (const c of parts) g.remove(c);
    g.add(one);
  }
}

/**
 * A chibi person: { root, body, head, armL, armR, legL, legR, hand, prop } (groups to animate). o: colours and hat.
 * Big head, short body: reads well from the top-down 3/4 camera and looks friendly to kids.
 */
export function makePerson(mat, o) {
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  const add = (parent, geo, c) => { const m = new THREE.Mesh(P(geo, c), mat); m.castShadow = true; parent.add(m); return m; };
  // legs (pivot at the hip)
  const legs = [-1, 1].map((s) => { const g = new THREE.Group(); g.position.set(s * 0.13, 0.5, 0); add(g, at(cyl(0.085, 0.1, 0.36, 8), 0, -0.2, 0), o.pants); add(g, at(rbox(0.17, 0.12, 0.26, 0.05), 0, -0.42, 0.04), o.boots); root.add(g); return g; });
  add(body, at(lathe([[0, 0], [0.24, 0.02], [0.27, 0.2], [0.24, 0.42], [0.14, 0.52], [0, 0.54]], 14), 0, 0.42, 0), (x, y) => shade(o.shirt, o.shirt2 || o.shirt, y > 0.78 ? 0 : 0.12));
  if (o.vest) add(body, at(lathe([[0.25, 0], [0.285, 0.2], [0.255, 0.38], [0.2, 0.46]], 14, ), 0, 0.46, 0), o.vest);
  if (o.scarf) add(body, at(new THREE.TorusGeometry(0.17, 0.065, 6, 14), 0, 0.92, 0, Math.PI / 2), o.scarf);
  if (o.belt) add(body, at(new THREE.TorusGeometry(0.255, 0.035, 4, 16), 0, 0.5, 0, Math.PI / 2), o.belt);
  const head = new THREE.Group(); head.position.set(0, 1.2, 0); body.add(head);
  add(head, sphere(0.3, 16, 12), o.skin);
  for (const s of [-1, 1]) {
    add(head, at(sphere(0.045, 8, 6), s * 0.1, 0.02, 0.27, 0, 0, 0, [1, 1.25, 0.6]), PAL.ink);
    add(head, at(sphere(0.016, 6, 4), s * 0.1 + 0.015, 0.045, 0.3), 0xfaf3e8);
    add(head, at(sphere(0.05, 8, 6), s * 0.17, -0.07, 0.23, 0, 0, 0, [1, 0.6, 0.4]), 0xf09a9a);
  }
  add(head, at(sphere(0.045, 8, 6), 0, -0.04, 0.3), o.skin2 || PAL.skinDark);
  add(head, at(new THREE.TorusGeometry(0.05, 0.012, 4, 10, Math.PI), 0, -0.1, 0.27, 0, 0, Math.PI), PAL.ink);
  if (o.hair) add(head, at(sphere(0.31, 14, 10, ), 0, 0.04, -0.04, 0, 0, 0, [1, 0.92, 0.96]).translate(0, 0, 0), o.hair).scale.set(1, 1, 1);
  if (o.hat === 'cowboy') {
    add(head, at(lathe([[0, 0], [0.5, 0.0], [0.52, 0.04], [0.42, 0.06], [0.24, 0.07], [0.22, 0.28], [0.15, 0.33], [0, 0.31]], 18), 0, 0.17, 0, -0.08), o.hatCol);
    add(head, at(new THREE.TorusGeometry(0.225, 0.03, 4, 18), 0, 0.27, 0, Math.PI / 2 - 0.08), o.band);
  } else if (o.hat === 'sun') {
    add(head, at(lathe([[0, 0], [0.56, -0.04], [0.5, 0.02], [0.27, 0.06], [0.26, 0.2], [0, 0.24]], 18), 0, 0.18, 0, -0.1), o.hatCol);
    add(head, at(new THREE.TorusGeometry(0.265, 0.03, 4, 18), 0, 0.27, 0, Math.PI / 2 - 0.1), o.band);
  } else if (o.hat === 'cap') {
    add(head, at(new THREE.SphereGeometry(0.31, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), 0, 0.06, 0), o.hatCol);
    add(head, at(rbox(0.36, 0.04, 0.26, 0.02), 0, 0.08, 0.3), o.band);
  }
  const arms = [-1, 1].map((s) => {
    const g = new THREE.Group(); g.position.set(s * 0.3, 0.86, 0); body.add(g);
    add(g, at(cyl(0.07, 0.065, 0.36, 8), 0, -0.17, 0), o.sleeve || o.shirt); add(g, at(sphere(0.085, 8, 6), 0, -0.38, 0), o.skin);
    return g;
  });
  let prop = null;
  if (o.pickaxe) {
    prop = new THREE.Group(); prop.position.set(0, -0.38, 0.04); arms[1].add(prop);
    add(prop, at(cyl(0.035, 0.04, 0.95, 6), 0, 0.3, 0.02), PAL.woodLight);
    add(prop, at(lathe([[0, -0.36], [0.06, -0.22], [0.07, 0], [0.06, 0.22], [0, 0.36]], 8), 0, 0.74, 0.02, 0, 0, Math.PI / 2), PAL.steel);
  }
  if (o.camera) add(body, at(rbox(0.22, 0.15, 0.1, 0.03), 0, 0.72, 0.27), PAL.ink);
  collapse([body, head, ...legs, ...arms, prop], mat);
  return { root, body, head, armL: arms[0], armR: arms[1], legL: legs[0], legR: legs[1], prop, phase: Math.random() * 6 };
}

/** Walk / idle / mine / carry / cheer animation of a person made by makePerson. */
export function animPerson(p, dt, speed, pose, t) {
  const w = Math.min(1, speed / 4.5); p.phase += dt * (speed > 0.2 ? 5 + speed * 1.6 : 2.2);
  const s = Math.sin(p.phase);
  p.legL.rotation.x = s * 0.8 * w; p.legR.rotation.x = -s * 0.8 * w;
  p.body.position.y = Math.abs(Math.cos(p.phase)) * 0.07 * w + (speed < 0.2 ? Math.sin(t * 2.2 + p.phase) * 0.012 : 0);
  p.body.rotation.z = s * 0.05 * w; p.head.rotation.z = Math.sin(t * 1.3 + p.phase) * 0.04;
  p.body.rotation.x = 0;
  if (pose === 'mine') {
    // a big overhead swing: wind up (slow), strike (fast), settle; k in [0, 1) is the swing phase
    const k = p.swingK || 0, up = k < 0.6 ? Math.sin((k / 0.6) * Math.PI / 2) : 1 - Math.sin(((k - 0.6) / 0.4) * Math.PI / 2);
    p.armR.rotation.x = -2.9 * up - 0.2; p.armL.rotation.x = -2.6 * up - 0.3; p.armR.rotation.z = -0.1; p.armL.rotation.z = 0.25;
    p.body.rotation.x = 0.25 - up * 0.35; p.body.scale.set(1 + (1 - up) * 0.04, 1 - (1 - up) * 0.05, 1);
  } else if (pose === 'carry') {
    p.armL.rotation.x = p.armR.rotation.x = -1.35; p.armL.rotation.z = 0.25; p.armR.rotation.z = -0.25; p.body.scale.set(1, 1, 1);
  } else if (pose === 'cheer') {
    p.armL.rotation.x = p.armR.rotation.x = -2.8 + Math.sin(t * 12) * 0.25; p.armL.rotation.z = 0.4; p.armR.rotation.z = -0.4; p.body.position.y += Math.abs(Math.sin(t * 8)) * 0.12; p.body.scale.set(1, 1, 1);
  } else {
    p.armL.rotation.x = -s * 0.7 * w; p.armR.rotation.x = s * 0.7 * w; p.armL.rotation.z = 0.12; p.armR.rotation.z = -0.12; p.body.scale.set(1, 1, 1);
  }
}

/** Simple crowd person for instancing: body (tinted per instance) and the rest (skin, legs, hat) in two geometries. */
export function crowdGeos() {
  const tint = merge([P(at(lathe([[0, 0], [0.26, 0.02], [0.3, 0.3], [0.2, 0.55], [0, 0.58]], 10), 0, 0.42, 0), 0xffffff), P(at(lathe([[0, 0], [0.5, -0.03], [0.46, 0.03], [0.24, 0.07], [0.23, 0.2], [0, 0.23]], 12), 0, 1.38, 0, -0.08), 0xffffff)]);
  const rest = merge([P(at(sphere(0.29, 12, 9), 0, 1.2, 0), PAL.skin), P(at(cyl(0.1, 0.1, 0.44, 6), -0.12, 0.22, 0), PAL.navy), P(at(cyl(0.1, 0.1, 0.44, 6), 0.12, 0.22, 0), PAL.navy),
    P(at(sphere(0.04, 6, 4), -0.1, 1.22, 0.27), PAL.ink), P(at(sphere(0.04, 6, 4), 0.1, 1.22, 0.27), PAL.ink), P(at(sphere(0.08, 6, 5), -0.33, 0.86, 0.05), PAL.skin), P(at(sphere(0.08, 6, 5), 0.33, 0.86, 0.05), PAL.skin)]);
  return { tint, rest };
}

/**
 * The crystal pup (first critter): a round sandy armadillo pup with a crystal shell. Returns parts for animation and
 * the shell geometry (drawn with the gem material).
 */
export function makeCritter(mat, gemMat) {
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  const add = (parent, geo, c, m = mat) => { const mm = new THREE.Mesh(c === null ? geo : P(geo, c), m); mm.castShadow = true; parent.add(mm); return mm; };
  add(body, at(sphere(0.34, 16, 12), 0, 0.36, 0, 0, 0, 0, [1, 0.86, 1.15]), (x, y) => shade(0xf0c48c, 0xd99a68, 0.2 - y * 0.6));
  // crystal shell: rows of faceted plates along the back
  const shell = [];
  for (let r = 0; r < 4; r++) for (let c = -2; c <= 2; c++) {
    if (Math.abs(c) === 2 && (r === 0 || r === 3)) continue;
    const a = c * 0.42, z = -0.26 + r * 0.17, g = lathe([[0, 0], [0.1, 0.01], [0.08, 0.13], [0, 0.17]], 6).toNonIndexed();
    shell.push(at(g, Math.sin(a) * 0.3, 0.42 + Math.cos(a) * 0.24, z, 0, 0, -a * 0.9));
  }
  const sg = new THREE.BufferGeometry(); let n = 0; for (const g of shell) n += g.attributes.position.count;
  const pos = new Float32Array(n * 3); let o = 0; for (const g of shell) { pos.set(g.attributes.position.array, o); o += g.attributes.position.array.length; g.dispose(); }
  sg.setAttribute('position', new THREE.BufferAttribute(pos, 3)); sg.computeVertexNormals();
  const shellMesh = add(body, sg, null, gemMat);
  const head = new THREE.Group(); head.position.set(0, 0.42, 0.38); body.add(head);
  add(head, at(sphere(0.22, 14, 10), 0, 0, 0, 0, 0, 0, [1, 0.92, 1]), 0xf3cc96);
  add(head, at(sphere(0.09, 10, 8), 0, -0.05, 0.18, 0, 0, 0, [1.1, 0.8, 1]), 0xf7dcb4);
  add(head, at(sphere(0.03, 6, 5), 0, -0.02, 0.27), PAL.ink);
  for (const s of [-1, 1]) {
    add(head, at(sphere(0.06, 10, 8), s * 0.1, 0.05, 0.16, 0, 0, 0, [1, 1.15, 0.8]), PAL.ink);
    add(head, at(sphere(0.022, 6, 4), s * 0.1 + 0.02, 0.08, 0.21), 0xfaf3e8);
    add(head, at(sphere(0.07, 8, 6), s * 0.14, 0.2, -0.02, 0, 0, s * -0.4, [0.7, 1.2, 0.5]), 0xe9b07c);
    add(head, at(sphere(0.04, 6, 5), s * 0.15, -0.06, 0.13, 0, 0, 0, [1, 0.6, 0.4]), 0xf09a9a);
  }
  const feet = [];
  for (const [x, z] of [[-0.18, 0.18], [0.18, 0.18], [-0.18, -0.2], [0.18, -0.2]]) { const f = add(root, at(sphere(0.085, 8, 6), 0, 0, 0, 0, 0, 0, [1, 0.7, 1.2]), 0xd99a68); f.position.set(x, 0.07, z); feet.push(f); }
  const tail = add(body, at(lathe([[0.06, 0], [0.04, 0.2], [0, 0.26]], 6), 0, 0.3, -0.42, -2.1), 0xe9b07c);
  const tip = add(body, at(lathe([[0, 0], [0.05, 0.02], [0.04, 0.1], [0, 0.14]], 6), 0, 0.2, -0.62, -2.3), null, gemMat);
  void tip;
  collapse([body, head], mat);
  return { root, body, head, feet, tail, shell: shellMesh, phase: 0 };
}

/** Bounce-walk animation of the critter (hop when moving, breathe and look around when still). */
export function animCritter(c, dt, speed, t, happy = 0) {
  c.phase += dt * (speed > 0.25 ? 12 : 2.5);
  const hop = speed > 0.25 ? Math.abs(Math.sin(c.phase)) : 0;
  c.body.position.y = hop * 0.18 + Math.sin(t * 2) * 0.01 + happy * Math.abs(Math.sin(t * 9)) * 0.3;
  const sq = speed > 0.25 ? 1 - Math.abs(Math.cos(c.phase)) * 0.12 : 1 + Math.sin(t * 2) * 0.02;
  c.body.scale.set(1 + (1 - sq) * 0.6, sq, 1 + (1 - sq) * 0.6);
  c.head.rotation.y = speed > 0.25 ? 0 : Math.sin(t * 0.9) * 0.4; c.head.rotation.z = Math.sin(t * 1.7) * 0.08;
  c.tail.rotation.y = Math.sin(t * 8) * 0.4;
  c.feet.forEach((f, i) => { f.position.y = 0.07 + (speed > 0.25 ? Math.max(0, Math.sin(c.phase + i * 1.6)) * 0.08 : 0); });
  if (happy) c.root.rotation.y += dt * happy * 10;
}

/** The critter egg: a pastel egg with crystal spots (spots drawn with the gem material). */
export function eggGeos() {
  const shell = lathe([[0, 0], [0.22, 0.04], [0.33, 0.2], [0.34, 0.42], [0.27, 0.66], [0.15, 0.8], [0, 0.84]], 20);
  const spots = [];
  for (let k = 0; k < 9; k++) {
    const a = k * 2.39, y = 0.2 + ((k * 0.37) % 0.55), r = Math.sin(Math.min(Math.PI, (y / 0.84) * Math.PI)) * 0.34;
    const g = new THREE.OctahedronGeometry(0.06 + (k % 3) * 0.015, 0).toNonIndexed(); at(g, Math.cos(a) * r, y, Math.sin(a) * r, k, k, 0);
    spots.push(g);
  }
  const sg = new THREE.BufferGeometry(); let n = 0; for (const g of spots) n += g.attributes.position.count;
  const pos = new Float32Array(n * 3); let o = 0; for (const g of spots) { pos.set(g.attributes.position.array, o); o += g.attributes.position.array.length; g.dispose(); }
  sg.setAttribute('position', new THREE.BufferAttribute(pos, 3)); sg.computeVertexNormals();
  return { shell: P(shell, (x, y) => shade(0xf7b0d8, 0x9a7ae6, 0.25 + Math.sin(y * 18) * 0.2)), spots: sg };
}

/** Tumbleweed: a loose ball of twigs. */
export function buildTumbleweed() {
  const parts = [];
  for (let k = 0; k < 26; k++) parts.push(P(at(new THREE.TorusGeometry(0.32 + (k % 4) * 0.03, 0.012, 3, 10), 0, 0, 0, k * 1.3, k * 0.7, k * 2.1), k % 3 ? 0xb08a58 : 0x8e6a40));
  return merge(parts);
}
