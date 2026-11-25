// PROTOTYPE - NOT FOR PRODUCTION
// Geometry kit and the models of +1 Mega Hammer: every model is built in code from rounded, vertex-coloured parts
// merged into one geometry, so each kind draws as one InstancedMesh with one shared material.
// Nothing here touches THREE at import time: the Astrocade bundle runs modules before three.js arrives.
/* global THREE */

/** Palette: warm jewel tones, no pure white (the anti-glare rule). */
export const PAL = {
  alabaster: 0xf4ede2, indigo: 0x2b2d5b, jade: 0x1f9d74, gold: 0xe5a93c, coral: 0xe06356, amethyst: 0x7e57c2, slate: 0x23263a,
  grass: 0x6dbb5a, grassDark: 0x4e9a48, earth: 0x9a6a45, earthDark: 0x6e4a33, wood: 0xc98a52, woodDark: 0x8e5a32, woodLight: 0xe0a86a,
  apple: 0xd9433b, appleDark: 0x9c2420, orange: 0xf09a2a, leaf: 0x4fa64a, melon: 0x3f9a4a, melonDark: 0x23683a, cloth: 0xe06356, iron: 0x5b5f73,
};

const col = (c) => new THREE.Color(c);

/** Non-indexed copy with a colour attribute painted by fn(x, y, z) -> THREE.Color, or one colour. */
export function paint(g, c) {
  const n = g.index ? g.toNonIndexed() : g;
  if (n !== g) g.dispose();
  const p = n.attributes.position, a = new Float32Array(p.count * 3), one = typeof c === 'function' ? null : col(c);
  for (let i = 0; i < p.count; i++) { const k = one || c(p.getX(i), p.getY(i), p.getZ(i)); a[i * 3] = k.r; a[i * 3 + 1] = k.g; a[i * 3 + 2] = k.b; }
  n.setAttribute('color', new THREE.BufferAttribute(a, 3));
  n.deleteAttribute('uv');
  return n;
}

/** Concatenates painted non-indexed geometries (position, normal, color) into one, disposing the parts. */
export function merge(parts) {
  let count = 0;
  for (const g of parts) count += g.attributes.position.count;
  const out = new THREE.BufferGeometry();
  for (const name of ['position', 'normal', 'color']) {
    const a = new Float32Array(count * 3);
    let o = 0;
    for (const g of parts) { a.set(g.attributes[name].array, o); o += g.attributes[name].array.length; }
    out.setAttribute(name, new THREE.BufferAttribute(a, 3));
  }
  for (const g of parts) g.dispose();
  out.computeBoundingSphere();
  return out;
}

/** A box with rounded edges of radius r (exact normals: each vertex pushed out from the inner box). */
export function rbox(w, h, d, r, seg = 3) {
  const g = new THREE.BoxGeometry(w, h, d, seg * 2, seg * 2, seg * 2), p = g.attributes.position, nrm = g.attributes.normal;
  const hx = w / 2 - r, hy = h / 2 - r, hz = d / 2 - r, v = new THREE.Vector3(), c = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    c.set(Math.max(-hx, Math.min(hx, v.x)), Math.max(-hy, Math.min(hy, v.y)), Math.max(-hz, Math.min(hz, v.z)));
    v.sub(c);
    if (v.lengthSq() < 1e-9) v.fromBufferAttribute(nrm, i);
    v.normalize();
    nrm.setXYZ(i, v.x, v.y, v.z);
    p.setXYZ(i, c.x + v.x * r, c.y + v.y * r, c.z + v.z * r);
  }
  return g;
}

const at = (g, x, y, z, rx = 0, ry = 0, rz = 0, s = 1) => {
  g.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(s, s, s)));
  return g;
};
const shade = (base, dark, t) => col(base).lerp(col(dark), Math.max(0, Math.min(1, t)));

function fruitBody(r, base, dark, squash) {
  const g = new THREE.SphereGeometry(r, r > 0.25 ? 14 : 8, r > 0.25 ? 10 : 6), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i), top = y / r;
    // a dimple at the top and a slight waist: reads as fruit, not a ball
    const dip = top > 0.75 ? (top - 0.75) * 0.9 * r : 0;
    p.setXYZ(i, x * (1 + 0.04 * Math.sin(top * 3)), y * squash - dip, z * (1 + 0.04 * Math.sin(top * 3)));
  }
  g.computeVertexNormals();
  return paint(g, (x, y) => shade(base, dark, 0.55 - y / r * 0.55));
}

function stemLeaf(r, y) {
  const stem = paint(at(new THREE.CylinderGeometry(r * 0.05, r * 0.07, r * 0.4, 6), 0, y + r * 0.15, 0, 0, 0, 0.2), PAL.woodDark);
  const leaf = paint(at(new THREE.SphereGeometry(r * 0.22, 8, 6), r * 0.18, y + r * 0.22, 0, 0, 0, -0.6), PAL.leaf);
  leaf.scale(1, 0.35, 0.6);
  return [stem, leaf];
}

/** Builds the geometry of one breakable kind, sized by its radius r, standing on y = 0. */
export function buildKind(kind, r) {
  const parts = [];
  if (kind === 'apple') {
    parts.push(at(fruitBody(r, PAL.apple, PAL.appleDark, 0.9), 0, r * 0.9, 0), ...stemLeaf(r, r * 1.6));
  } else if (kind === 'orange') {
    const g = fruitBody(r, PAL.orange, 0xb8641a, 0.95);
    parts.push(at(g, 0, r * 0.95, 0), paint(at(new THREE.SphereGeometry(r * 0.12, 8, 6), 0, r * 1.86, 0), PAL.leaf));
  } else if (kind === 'melon') {
    const g = new THREE.SphereGeometry(r, 20, 12);
    g.scale(1.25, 0.85, 1);
    parts.push(at(paint(g, (x, y, z) => {
      const stripe = Math.sin(Math.atan2(z, x) * 7) > 0.35;
      return shade(stripe ? PAL.melonDark : PAL.melon, 0x163f25, 0.3 - y / r * 0.4);
    }), 0, r * 0.85, 0));
  } else if (kind === 'crate') {
    const s = r * 1.3, t = s * 0.14;
    parts.push(paint(at(rbox(s * 0.94, s * 0.94, s * 0.94, s * 0.06, 2), 0, s / 2, 0), (x, y) => shade(PAL.wood, PAL.woodDark, Math.abs(Math.sin(y * 18)) * 0.35)));
    // frame rails and corner posts in lighter wood, a diagonal brace on two faces
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) parts.push(paint(at(rbox(t, s, t, t * 0.3, 1), sx * (s / 2 - t / 2), s / 2, sz * (s / 2 - t / 2)), PAL.woodLight));
    for (const y of [t / 2, s - t / 2]) for (const [w, d, x, z] of [[s, t, 0, s / 2 - t / 2], [s, t, 0, -(s / 2 - t / 2)], [t, s, s / 2 - t / 2, 0], [t, s, -(s / 2 - t / 2), 0]]) parts.push(paint(at(rbox(w, t, d, t * 0.3, 1), x, y, z), PAL.woodLight));
    for (const z of [s / 2 + 0.005, -s / 2 - 0.005]) parts.push(paint(at(rbox(s * 1.18, t * 0.8, t * 0.4, t * 0.15, 1), 0, s / 2, z, 0, 0, Math.PI / 4), PAL.woodLight));
  } else if (kind === 'barrel') {
    const h = r * 2, pts = [];
    for (let i = 0; i <= 10; i++) { const y = (i / 10) * h; pts.push(new THREE.Vector2(r * (0.8 + 0.2 * Math.sin((i / 10) * Math.PI)), y)); }
    const g = new THREE.LatheGeometry(pts, 14);
    parts.push(paint(g, (x, y, z) => shade(PAL.wood, PAL.woodDark, (Math.sin(Math.atan2(z, x) * 10) > 0.8 ? 0.45 : 0.1) + Math.abs(y - h / 2) / h * 0.3)));
    parts.push(paint(at(new THREE.CircleGeometry(r * 0.8, 20), 0, h, 0, -Math.PI / 2), PAL.woodLight));
    for (const y of [0.18, 0.5, 0.82]) {
      const rr = r * (0.8 + 0.2 * Math.sin(y * Math.PI)) + 0.012;
      parts.push(paint(at(new THREE.TorusGeometry(rr, r * 0.05, 4, 16), 0, y * h, 0, Math.PI / 2), PAL.iron));
    }
  } else if (kind === 'cart') {
    const L = r * 1.7, W = r * 1.1;
    parts.push(paint(at(rbox(L, r * 0.45, W, r * 0.06, 2), 0, r * 0.75, 0), (x, y) => shade(PAL.wood, PAL.woodDark, y < r * 0.7 ? 0.4 : 0)));
    for (const z of [-W / 2, W / 2]) parts.push(paint(at(rbox(L, r * 0.3, r * 0.08, r * 0.03, 1), 0, r * 1.1, z), PAL.woodLight));
    for (const sx of [-1, 1]) {
      const wz = sx * (W / 2 + r * 0.06);
      parts.push(paint(at(new THREE.TorusGeometry(r * 0.42, r * 0.07, 5, 16), -L * 0.18, r * 0.45, wz), PAL.woodDark));
      parts.push(paint(at(new THREE.CylinderGeometry(r * 0.1, r * 0.1, r * 0.14, 10), -L * 0.18, r * 0.45, wz, Math.PI / 2), PAL.iron));
      for (let k = 0; k < 4; k++) parts.push(paint(at(new THREE.BoxGeometry(r * 0.06, r * 0.8, r * 0.05), -L * 0.18, r * 0.45, wz, 0, 0, (k * Math.PI) / 4), PAL.woodDark));
      parts.push(paint(at(rbox(L * 0.55, r * 0.07, r * 0.07, r * 0.03, 1), L * 0.68, r * 0.8, sx * W * 0.32, 0, 0, 0.25), PAL.woodLight));
    }
    for (let k = 0; k < 7; k++) {
      const a = k * 2.4, d = (k % 3) * r * 0.22;
      const f = fruitBody(r * 0.2, k % 2 ? PAL.apple : PAL.orange, k % 2 ? PAL.appleDark : 0xb8641a, 0.92);
      parts.push(at(f, Math.cos(a) * d - L * 0.1, r * 1.12 + (k > 4 ? r * 0.2 : 0), Math.sin(a) * d * 0.7));
    }
  } else if (kind === 'stall') {
    const W = r * 1.6, D = r * 1.05, top = r * 0.8;
    parts.push(paint(at(rbox(W, r * 0.12, D, r * 0.04, 2), 0, top, 0), PAL.woodLight));
    parts.push(paint(at(rbox(W * 0.96, top * 0.85, D * 0.9, r * 0.05, 2), 0, top * 0.45, 0), (x, y) => shade(PAL.wood, PAL.woodDark, Math.abs(Math.sin(x * 9)) * 0.35)));
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) parts.push(paint(at(new THREE.CylinderGeometry(r * 0.05, r * 0.05, r * 1.9, 8), sx * W * 0.46, r * 0.95, sz * D * 0.44), PAL.woodDark));
    // striped awning: a shallow curved sheet with a scalloped front edge
    const aw = new THREE.CylinderGeometry(D * 0.75, D * 0.75, W * 1.08, 24, 1, true, -Math.PI * 0.35, Math.PI * 0.7);
    parts.push(paint(at(aw, 0, r * 1.45, -D * 0.05, 0, 0, Math.PI / 2), (x, y) => col(Math.floor((y + W) / (W * 0.18)) % 2 ? PAL.cloth : PAL.alabaster)));
    for (let k = 0; k < 9; k++) parts.push(paint(at(new THREE.SphereGeometry(W * 0.06, 6, 4), -W * 0.48 + k * W * 0.12, r * 1.7, D * 0.62), k % 2 ? PAL.cloth : PAL.alabaster));
    for (let k = 0; k < 10; k++) {
      const f = fruitBody(r * 0.13, [PAL.apple, PAL.orange, PAL.gold][k % 3], PAL.appleDark, 0.92);
      parts.push(at(f, -W * 0.38 + (k % 5) * W * 0.19, top + r * 0.07, (k < 5 ? -1 : 1) * D * 0.2));
    }
  } else buildMore(kind, r, parts);
  const g = merge(parts);
  if (kind === 'bigcastle' || kind === 'ginger' || kind === 'palace') g.scale(1.3, 1.3, 1.3); // the finale bosses read as big as the cake vault
  return g;
}

/** Zones 3-6: toy street, park, toy city, cake vault. */
function buildMore(kind, r, parts) {
  if (kind === 'cone') {
    const h = r * 2;
    parts.push(paint(at(rbox(r * 1.6, r * 0.18, r * 1.6, r * 0.06, 1), 0, r * 0.09, 0), PAL.coral));
    parts.push(paint(at(new THREE.ConeGeometry(r * 0.62, h, 14, 4), 0, h / 2 + r * 0.15, 0), (x, y) => col(Math.floor(y / (h / 4)) % 2 ? PAL.alabaster : PAL.coral)));
  } else if (kind === 'car') {
    const L = r * 1.9, W = r * 1.05;
    parts.push(paint(at(rbox(L, r * 0.55, W, r * 0.22, 3), 0, r * 0.62, 0), (x, y) => shade(PAL.coral, 0xa83c33, 0.5 - (y - r * 0.6) * 1.2)));
    parts.push(paint(at(rbox(L * 0.55, r * 0.5, W * 0.9, r * 0.2, 3), -L * 0.06, r * 1.08, 0), PAL.alabaster));
    for (const sz of [-1, 1]) parts.push(paint(at(rbox(L * 0.42, r * 0.3, 0.02, r * 0.08, 1), -L * 0.06, r * 1.1, sz * W * 0.46), 0x7fb5d9));
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      parts.push(paint(at(new THREE.CylinderGeometry(r * 0.3, r * 0.3, r * 0.22, 14), sx * L * 0.3, r * 0.3, sz * W * 0.48, Math.PI / 2), PAL.slate));
      parts.push(paint(at(new THREE.CylinderGeometry(r * 0.14, r * 0.14, r * 0.24, 10), sx * L * 0.3, r * 0.3, sz * W * 0.48, Math.PI / 2), PAL.gold));
    }
    for (const sz of [-1, 1]) parts.push(paint(at(new THREE.SphereGeometry(r * 0.1, 8, 6), L / 2, r * 0.7, sz * W * 0.3), PAL.gold));
  } else if (kind === 'mailbox') {
    parts.push(paint(at(new THREE.CylinderGeometry(r * 0.12, r * 0.14, r * 1.2, 8), 0, r * 0.6, 0), PAL.slate));
    parts.push(paint(at(rbox(r * 1.1, r * 0.7, r * 0.75, r * 0.25, 3), 0, r * 1.45, 0), (x, y) => shade(0x3d6fb8, 0x253f73, 0.3 - (y - r * 1.45) * 0.8)));
    parts.push(paint(at(rbox(r * 0.1, r * 0.5, r * 0.06, r * 0.02, 1), r * 0.3, r * 1.95, r * 0.3), PAL.coral));
    parts.push(paint(at(rbox(r * 0.04, r * 0.1, r * 0.5, r * 0.02, 1), r * 0.56, r * 1.5, 0), PAL.gold));
  } else if (kind === 'flowerpot') {
    const pts = [[0.55, 0], [0.62, 0.1], [0.75, 0.75], [0.85, 0.8], [0.85, 0.92], [0.7, 0.92]].map(([a, b]) => new THREE.Vector2(a * r, b * r));
    parts.push(paint(new THREE.LatheGeometry(pts, 14), (x, y) => shade(0xd9784a, 0x9c4f2a, 0.5 - y / r * 0.5)));
    parts.push(paint(at(new THREE.CylinderGeometry(r * 0.7, r * 0.7, r * 0.05, 14), 0, r * 0.88, 0), PAL.earthDark));
    for (let k = 0; k < 5; k++) {
      const a = k * 1.26, d = k ? r * 0.38 : 0, c = [PAL.coral, PAL.gold, PAL.amethyst, 0xf08bb0, PAL.alabaster][k];
      parts.push(paint(at(new THREE.CylinderGeometry(r * 0.03, r * 0.03, r * 0.5, 5), Math.cos(a) * d, r * 1.1, Math.sin(a) * d), PAL.leaf));
      parts.push(paint(at(new THREE.IcosahedronGeometry(r * 0.2, 1), Math.cos(a) * d, r * 1.4, Math.sin(a) * d), c));
      parts.push(paint(at(new THREE.SphereGeometry(r * 0.08, 6, 4), Math.cos(a) * d, r * 1.5, Math.sin(a) * d), PAL.gold));
    }
  } else if (kind === 'bench') {
    const L = r * 1.8, D = r * 0.6;
    for (let k = 0; k < 3; k++) parts.push(paint(at(rbox(L, r * 0.08, D * 0.3, r * 0.03, 1), 0, r * 0.5, -D * 0.33 + k * D * 0.33), PAL.woodLight));
    for (let k = 0; k < 2; k++) parts.push(paint(at(rbox(L, r * 0.16, r * 0.07, r * 0.03, 1), 0, r * 0.8 + k * r * 0.22, -D * 0.55, -0.2), PAL.woodLight));
    for (const sx of [-1, 1]) {
      parts.push(paint(at(rbox(r * 0.1, r * 0.5, D, r * 0.04, 1), sx * L * 0.42, r * 0.25, 0), PAL.slate));
      parts.push(paint(at(rbox(r * 0.1, r * 0.75, r * 0.1, r * 0.04, 1), sx * L * 0.42, r * 0.85, -D * 0.5, -0.2), PAL.slate));
      parts.push(paint(at(rbox(r * 0.1, r * 0.08, D * 0.9, r * 0.03, 1), sx * L * 0.42, r * 0.72, 0.02), PAL.slate));
    }
  } else if (kind === 'ptree') {
    parts.push(paint(at(new THREE.CylinderGeometry(r * 0.12, r * 0.2, r * 1.3, 8), 0, r * 0.65, 0), PAL.woodDark));
    for (const [x, y, z, s] of [[0, 1.6, 0, 0.62], [0.35, 1.3, 0.2, 0.45], [-0.35, 1.35, -0.1, 0.48], [0.05, 1.95, 0.05, 0.4]]) {
      parts.push(paint(at(new THREE.IcosahedronGeometry(s * r, 1), x * r, y * r, z * r), (px, py) => shade(0xf08bb0, 0xb85a86, 0.6 - (py - y * r) / (s * r) * 0.6)));
    }
    parts.push(paint(at(new THREE.CylinderGeometry(r * 0.5, r * 0.55, r * 0.12, 14), 0, r * 0.06, 0), PAL.earthDark));
  } else if (kind === 'fountain') {
    const pts = [[0.95, 0], [1, 0.05], [1, 0.32], [0.88, 0.36], [0.85, 0.2], [0, 0.2]].map(([a, b]) => new THREE.Vector2(a * r, b * r));
    parts.push(paint(new THREE.LatheGeometry(pts, 24), (x, y) => shade(PAL.alabaster, 0xb5a690, 0.4 - y / r)));
    parts.push(paint(at(new THREE.CylinderGeometry(r * 0.86, r * 0.86, r * 0.04, 24), 0, r * 0.28, 0), 0x6fb8d9));
    parts.push(paint(at(new THREE.CylinderGeometry(r * 0.12, r * 0.18, r * 0.7, 10), 0, r * 0.55, 0), PAL.alabaster));
    parts.push(paint(at(new THREE.CylinderGeometry(r * 0.45, r * 0.3, r * 0.12, 18), 0, r * 0.92, 0), PAL.alabaster));
    parts.push(paint(at(new THREE.CylinderGeometry(r * 0.4, r * 0.4, r * 0.03, 18), 0, r * 0.98, 0), 0x6fb8d9));
    parts.push(paint(at(new THREE.SphereGeometry(r * 0.12, 10, 8), 0, r * 1.1, 0), PAL.gold));
    for (let k = 0; k < 8; k++) { const a = k / 8 * 6.28; parts.push(paint(at(new THREE.SphereGeometry(r * 0.06, 6, 4), Math.cos(a) * r * 0.55, r * 0.33 + (k % 2) * r * 0.08, Math.sin(a) * r * 0.55), 0xa9dcf0)); }
  } else if (kind === 'house') {
    const W = r * 1.3, D = r * 1.1, H = r * 0.9;
    parts.push(paint(at(rbox(W, H, D, r * 0.06, 2), 0, H / 2, 0), (x, y) => shade(0xf2d6a0, 0xc9a978, 0.3 - y / H * 0.3)));
    const roof = new THREE.CylinderGeometry(D * 0.72, D * 0.72, W * 1.12, 3, 1);
    parts.push(paint(at(roof, 0, H + D * 0.32, 0, 0, 0, Math.PI / 2), (x, y) => shade(PAL.coral, 0x9c3a33, Math.abs(Math.sin(y * 9)) * 0.3)));
    parts.push(paint(at(rbox(r * 0.2, r * 0.5, r * 0.2, r * 0.03, 1), W * 0.25, H + D * 0.45, -D * 0.15), PAL.earthDark));
    parts.push(paint(at(rbox(r * 0.3, r * 0.5, 0.04, r * 0.05, 1), 0, r * 0.25, D / 2 + 0.01), PAL.woodDark));
    for (const sx of [-1, 1]) {
      parts.push(paint(at(rbox(r * 0.3, r * 0.28, 0.04, r * 0.04, 1), sx * W * 0.3, H * 0.6, D / 2 + 0.01), 0x7fb5d9));
      parts.push(paint(at(rbox(r * 0.36, r * 0.05, 0.06, r * 0.02, 1), sx * W * 0.3, H * 0.6 - r * 0.17, D / 2 + 0.02), PAL.alabaster));
    }
  } else if (kind === 'watertower') {
    for (let k = 0; k < 4; k++) { const a = k / 4 * 6.28 + 0.78; parts.push(paint(at(new THREE.CylinderGeometry(r * 0.06, r * 0.08, r * 1.6, 6), Math.cos(a) * r * 0.5, r * 0.8, Math.sin(a) * r * 0.5), PAL.slate)); }
    const pts = [[0, 0], [0.6, 0.05], [0.7, 0.2], [0.7, 0.75], [0.5, 0.95], [0, 1.05]].map(([a, b]) => new THREE.Vector2(a * r, b * r));
    parts.push(paint(at(new THREE.LatheGeometry(pts, 18), 0, r * 1.55, 0), (x, y) => col(Math.floor((y - r * 1.55) / (r * 0.18)) % 2 ? PAL.coral : PAL.alabaster)));
    parts.push(paint(at(new THREE.TorusGeometry(r * 0.72, r * 0.04, 4, 20), 0, r * 1.75, 0, Math.PI / 2), PAL.slate));
    parts.push(paint(at(new THREE.SphereGeometry(r * 0.1, 8, 6), 0, r * 2.65, 0), PAL.gold));
  } else if (kind === 'building') {
    const W = r * 1.15, H = r * 2.4;
    parts.push(paint(at(rbox(W, H, W, r * 0.08, 2), 0, H / 2, 0), (x, y) => shade(0x7e9ad1, 0x4a5f99, 0.2 + y / H * 0.2)));
    for (let f = 0; f < 5; f++) for (let k = 0; k < 3; k++) for (const [sx, sz, ry] of [[0, 1, 0], [1, 0, Math.PI / 2], [0, -1, 0], [-1, 0, Math.PI / 2]]) {
      const off = (k - 1) * W * 0.28, y = H * 0.18 + f * H * 0.16;
      parts.push(paint(at(rbox(W * 0.18, H * 0.09, 0.04, r * 0.03, 1), sx ? sx * (W / 2 + 0.01) : off, y, sz ? sz * (W / 2 + 0.01) : off, 0, ry), (f + k) % 3 ? 0xf2c96a : 0xa9cbe8));
    }
    parts.push(paint(at(rbox(W * 1.06, r * 0.12, W * 1.06, r * 0.04, 1), 0, H, 0), PAL.slate));
    parts.push(paint(at(new THREE.CylinderGeometry(r * 0.03, r * 0.03, r * 0.6, 5), W * 0.25, H + r * 0.3, 0), PAL.slate));
    parts.push(paint(at(new THREE.SphereGeometry(r * 0.06, 6, 4), W * 0.25, H + r * 0.62, 0), PAL.coral));
  } else if (kind === 'candy') {
    parts.push(paint(at(new THREE.SphereGeometry(r * 0.6, 14, 10), 0, r * 0.65, 0), (x, y, z) => col(Math.sin(Math.atan2(z, x) * 3 + y * 8) > 0 ? 0xf08bb0 : PAL.alabaster)));
    for (const sx of [-1, 1]) parts.push(paint(at(new THREE.ConeGeometry(r * 0.32, r * 0.42, 8), sx * r * 0.72, r * 0.65, 0, 0, 0, sx * Math.PI / 2), 0xf08bb0));
  } else if (kind === 'vault') {
    // a three-tier cake fortress with a golden vault door, cream drips and candles
    const tiers = [[1.0, 0.55, 0xc98a52], [0.74, 0.5, 0xf08bb0], [0.5, 0.45, 0xf2d6a0]];
    let y = 0;
    tiers.forEach(([rr, h, c], i) => {
      parts.push(paint(at(new THREE.CylinderGeometry(rr * r, rr * r, h * r, 32, 2), 0, y + h * r / 2, 0), (px, py) => shade(c, 0x6e4a33, 0.15 - (py - y) / (h * r) * 0.15)));
      parts.push(paint(at(new THREE.TorusGeometry(rr * r, r * 0.06, 6, 32), 0, y + h * r, 0, Math.PI / 2), PAL.alabaster));
      for (let k = 0; k < 14; k++) { const a = k / 14 * 6.28 + i; parts.push(paint(at(new THREE.SphereGeometry(r * 0.07, 6, 4), Math.cos(a) * rr * r, y + h * r - r * 0.08 - (k % 3) * r * 0.05, Math.sin(a) * rr * r), PAL.alabaster)); }
      y += h * r;
    });
    parts.push(paint(at(new THREE.CylinderGeometry(r * 0.32, r * 0.32, r * 0.06, 24), 0, r * 0.3, r * 0.99, Math.PI / 2), PAL.gold));
    parts.push(paint(at(new THREE.TorusGeometry(r * 0.2, r * 0.035, 6, 20), 0, r * 0.3, r * 1.03), 0x9c6a1d));
    for (let k = 0; k < 4; k++) parts.push(paint(at(rbox(r * 0.05, r * 0.24, r * 0.05, r * 0.02, 1), 0, r * 0.3, r * 1.03, 0, 0, k * Math.PI / 4), 0x9c6a1d));
    for (let k = 0; k < 6; k++) {
      const a = k / 6 * 6.28;
      parts.push(paint(at(new THREE.CylinderGeometry(r * 0.03, r * 0.03, r * 0.3, 6), Math.cos(a) * r * 0.3, y + r * 0.15, Math.sin(a) * r * 0.3), [PAL.coral, PAL.jade, PAL.amethyst][k % 3]));
      parts.push(paint(at(new THREE.SphereGeometry(r * 0.045, 6, 4), Math.cos(a) * r * 0.3, y + r * 0.34, Math.sin(a) * r * 0.3), PAL.gold));
    }
    parts.push(paint(at(new THREE.SphereGeometry(r * 0.16, 12, 8), 0, y + r * 0.12, 0), PAL.apple));
  } else buildWorlds(kind, r, parts);
}

const SAND = 0xf0d39a, SANDD = 0xc9a66a, SNOW = 0xf4f8ff, SNOWD = 0xb9c9e0, ICE = 0x9fdcf5, ICED = 0x4fa3cf, PINK = 0xf08bb0, MINT = 0x8fe0c0, CHOC = 0x7a4a2e;
/** Stripes around y (k bands per turn) between two colours. */
const swirl = (a, b, k, tw = 0) => (x, y, z) => col(Math.sin(Math.atan2(z, x) * k + y * tw) > 0 ? a : b);
/** A crenellated tower: cylinder, a ring of merlons, a cone roof with a flag. */
function tower(parts, x, z, rr, h, c, cd, roof, flag) {
  parts.push(paint(at(new THREE.CylinderGeometry(rr, rr * 1.08, h, 14), x, h / 2, z), (px, py) => shade(c, cd, 0.35 - py / h * 0.35)));
  for (let k = 0; k < 8; k++) { const a = k / 8 * 6.28; parts.push(paint(at(rbox(rr * 0.4, rr * 0.35, rr * 0.4, rr * 0.08, 1), x + Math.cos(a) * rr * 0.85, h + rr * 0.15, z + Math.sin(a) * rr * 0.85, 0, -a), c)); }
  if (roof) { parts.push(paint(at(new THREE.ConeGeometry(rr * 0.95, rr * 1.6, 14), x, h + rr * 1.05, z), roof)); parts.push(paint(at(new THREE.CylinderGeometry(rr * 0.03, rr * 0.03, rr * 0.7, 5), x, h + rr * 2.1, z), PAL.slate)); parts.push(paint(at(new THREE.BoxGeometry(rr * 0.45, rr * 0.28, 0.02), x + rr * 0.24, h + rr * 2.3, z), flag)); }
}

/** The three worlds after Toy Town: Sunny Beach, Candy Land and Snow Peak. */
function buildWorlds(kind, r, parts) {
  // ---- Sunny Beach
  if (kind === 'ball') {
    parts.push(paint(at(new THREE.SphereGeometry(r * 0.85, 18, 12), 0, r * 0.85, 0), (x, y, z) => { if (Math.abs(y - r * 0.85) > r * 0.78) return col(PAL.alabaster); const k = Math.floor((Math.atan2(z, x) + Math.PI) / (Math.PI / 3)); return col([PAL.coral, PAL.alabaster, 0x4cb8ff, PAL.alabaster, PAL.gold, PAL.alabaster][k % 6]); }));
  } else if (kind === 'sandcastle') {
    parts.push(paint(at(rbox(r * 1.5, r * 0.5, r * 1.5, r * 0.1, 2), 0, r * 0.25, 0), (x, y) => shade(SAND, SANDD, 0.4 - y / r)));
    tower(parts, 0, 0, r * 0.38, r * 1.2, SAND, SANDD, null);
    for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) tower(parts, x * r * 0.58, z * r * 0.58, r * 0.2, r * 0.75, SAND, SANDD, null);
    parts.push(paint(at(new THREE.CylinderGeometry(r * 0.02, r * 0.02, r * 0.6, 5), 0, r * 1.55, 0), PAL.woodDark));
    parts.push(paint(at(new THREE.BoxGeometry(r * 0.32, r * 0.2, 0.02), r * 0.17, r * 1.75, 0), PAL.coral));
    parts.push(paint(at(rbox(r * 0.24, r * 0.3, r * 0.06, r * 0.08, 1), 0, r * 0.65, r * 0.4), SANDD));
  } else if (kind === 'parasol') {
    parts.push(paint(at(new THREE.CylinderGeometry(r * 0.04, r * 0.05, r * 1.9, 8), 0, r * 0.95, 0, 0.12), PAL.alabaster));
    const can = new THREE.ConeGeometry(r * 1.05, r * 0.45, 16, 1, true); can.translate(0, r * 1.95, 0); can.rotateZ(0.12);
    parts.push(paint(can, (x, y, z) => col(Math.floor((Math.atan2(z, x) + Math.PI) / (Math.PI / 4)) % 2 ? 0x4cb8ff : PAL.alabaster)));
    parts.push(paint(at(new THREE.SphereGeometry(r * 0.07, 8, 6), r * 0.28, r * 2.2, 0), PAL.gold));
    // towel and a little bucket under it
    parts.push(paint(at(rbox(r * 1.1, r * 0.04, r * 0.6, r * 0.02, 1), r * 0.15, r * 0.02, r * 0.35), (x) => col(Math.floor((x + r) / (r * 0.18)) % 2 ? PAL.coral : PAL.gold)));
    parts.push(paint(at(new THREE.CylinderGeometry(r * 0.16, r * 0.12, r * 0.26, 12), -r * 0.45, r * 0.13, -r * 0.3), 0x4cb8ff));
  } else if (kind === 'shell') {
    const g = new THREE.SphereGeometry(r * 0.75, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2); g.scale(1, 0.55, 0.85);
    parts.push(paint(at(g, 0, 0.02, 0), (x, y, z) => shade(0xffb7a1, 0xe07a6a, Math.abs(Math.sin(Math.atan2(z, x) * 9)) * 0.5)));
    parts.push(paint(at(rbox(r * 0.4, r * 0.12, r * 0.25, r * 0.05, 1), 0, r * 0.06, -r * 0.62), 0xf5c0a8));
  } else if (kind === 'surfboard') {
    const g = new THREE.SphereGeometry(r, 18, 8); g.scale(0.36, 0.06, 1);
    parts.push(paint(at(g, 0, r * 0.95, 0, 1.25), (x, y, z) => col(Math.abs(x) < r * 0.05 ? PAL.coral : 0x4cb8ff)));
    parts.push(paint(at(new THREE.ConeGeometry(r * 0.5, r * 0.5, 4), 0, r * 0.18, r * 0.35), SAND));
    parts.push(paint(at(rbox(r * 0.12, r * 0.25, r * 0.04, r * 0.02, 1), 0, r * 0.5, -r * 0.05, 1.25), PAL.slate));
  } else if (kind === 'hut') {
    const W = r * 1.2, H = r * 0.95;
    parts.push(paint(at(rbox(W, H, W * 0.9, r * 0.05, 2), 0, H / 2 + r * 0.15, 0), (x) => col(Math.floor((x + W) / (W * 0.16)) % 2 ? 0x4cb8ff : PAL.alabaster)));
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) parts.push(paint(at(new THREE.CylinderGeometry(r * 0.05, r * 0.05, r * 0.3, 6), sx * W * 0.4, r * 0.15, sz * W * 0.35), PAL.woodDark));
    parts.push(paint(at(new THREE.ConeGeometry(W * 0.85, r * 0.7, 4), 0, H + r * 0.5, 0, 0, Math.PI / 4), (x, y) => shade(0xe0b860, 0xa07a30, Math.abs(Math.sin(y * 30)) * 0.4)));
    parts.push(paint(at(rbox(r * 0.34, r * 0.55, 0.04, r * 0.06, 1), 0, r * 0.45, W * 0.45 + 0.01), PAL.gold));
  } else if (kind === 'boat') {
    const L = r * 1.8, W = r * 0.8;
    const hull = new THREE.SphereGeometry(1, 20, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2); hull.scale(L / 2, r * 0.6, W / 2);
    parts.push(paint(at(hull, 0, r * 0.6, 0), (x, y) => col(y > -r * 0.2 ? PAL.coral : PAL.alabaster)));
    parts.push(paint(at(new THREE.CylinderGeometry(W / 2 * 0.95, W / 2 * 0.95, 0.03, 20).scale(L / W, 1, 1), 0, r * 0.6, 0), PAL.woodLight));
    parts.push(paint(at(new THREE.CylinderGeometry(r * 0.04, r * 0.05, r * 1.6, 6), 0, r * 1.35, 0), PAL.woodDark));
    const sail = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, r * 0.75, 0), new THREE.Vector3(0, r * 2.1, 0), new THREE.Vector3(L * 0.38, r * 0.8, 0)]); sail.computeVertexNormals();
    parts.push(paint(sail, PAL.alabaster), paint(sail.clone().scale(-1, 1, 1), PAL.alabaster));
    for (const sz of [-1, 1]) parts.push(paint(at(new THREE.TorusGeometry(r * 0.16, r * 0.05, 6, 14), L * 0.18, r * 0.6, sz * W * 0.48), PAL.alabaster));
  } else if (kind === 'starfish') {
    const shape = new THREE.Shape();
    for (let k = 0; k < 10; k++) { const a = k / 10 * Math.PI * 2 + Math.PI / 2, d = k % 2 ? r * 0.32 : r * 0.85; const x = Math.cos(a) * d, y = Math.sin(a) * d; if (k) shape.lineTo(x, y); else shape.moveTo(x, y); }
    const g = new THREE.ExtrudeGeometry(shape, { depth: r * 0.22, bevelEnabled: true, bevelThickness: r * 0.1, bevelSize: r * 0.1, bevelSegments: 2 });
    parts.push(paint(at(g, 0, r * 0.12, 0, -Math.PI / 2), (x, y, z) => shade(0xff9e5e, 0xd9603a, Math.hypot(x, z) / r)));
  } else if (kind === 'bigcastle') {
    parts.push(paint(at(rbox(r * 1.6, r * 0.55, r * 1.3, r * 0.1, 2), 0, r * 0.27, 0), (x, y) => shade(SAND, SANDD, 0.4 - y / r)));
    tower(parts, 0, -r * 0.1, r * 0.42, r * 1.35, SAND, SANDD, PAL.coral, 0x4cb8ff);
    for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) tower(parts, x * r * 0.68, z * r * 0.5, r * 0.24, r * 0.9, SAND, SANDD, 0x4cb8ff, PAL.coral);
    parts.push(paint(at(new THREE.CylinderGeometry(r * 0.3, r * 0.3, r * 0.06, 24), 0, r * 0.32, r * 0.66, Math.PI / 2), PAL.gold));
    parts.push(paint(at(new THREE.TorusGeometry(r * 0.19, r * 0.035, 6, 20), 0, r * 0.32, r * 0.7), 0x9c6a1d));
    for (let k = 0; k < 10; k++) { const a = k / 10 * 6.28; parts.push(paint(at(new THREE.SphereGeometry(r * 0.05, 6, 4), Math.cos(a) * r * 0.9, r * 0.57, Math.sin(a) * r * 0.75), [0xffb7a1, PAL.alabaster, 0x4cb8ff][k % 3])); }
  // ---- Candy Land
  } else if (kind === 'gumdrop') {
    const pts = [[0, 0], [0.8, 0], [0.85, 0.1], [0.7, 0.6], [0.4, 0.95], [0, 1.02]].map(([a, b]) => new THREE.Vector2(a * r, b * r * 1.2));
    parts.push(paint(new THREE.LatheGeometry(pts, 16), (x, y) => shade(MINT, 0x3fb08a, 0.5 - y / r * 0.4)));
    for (let k = 0; k < 7; k++) { const a = k * 2.2, h = r * (0.3 + (k % 3) * 0.25); parts.push(paint(at(new THREE.SphereGeometry(r * 0.06, 5, 4), Math.cos(a) * r * (0.8 - h / r * 0.45), h, Math.sin(a) * r * (0.8 - h / r * 0.45)), PAL.alabaster)); }
  } else if (kind === 'lollipop') {
    parts.push(paint(at(new THREE.CylinderGeometry(r * 0.06, r * 0.06, r * 1.5, 8), 0, r * 0.75, 0), PAL.alabaster));
    const disc = new THREE.CylinderGeometry(r * 0.75, r * 0.75, r * 0.22, 28, 1); disc.rotateX(Math.PI / 2);
    parts.push(paint(at(disc, 0, r * 1.75, 0), (x, y, z) => { const a = Math.atan2(y - r * 1.75, x), d = Math.hypot(x, y - r * 1.75) / r; return col(Math.sin(a * 2 + d * 9) > 0 ? PINK : PAL.alabaster); }));
    parts.push(paint(at(new THREE.TorusGeometry(r * 0.08, r * 0.03, 6, 12), 0, r * 1.02, 0, Math.PI / 2), MINT));
  } else if (kind === 'cupcake') {
    const pts = [[0.55, 0], [0.75, 0.7], [0.8, 0.72], [0, 0.72]].map(([a, b]) => new THREE.Vector2(a * r, b * r));
    parts.push(paint(new THREE.LatheGeometry(pts, 20), swirl(0x4cb8ff, 0x2f8bd0, 10)));
    for (let k = 0; k < 3; k++) parts.push(paint(at(new THREE.TorusGeometry(r * (0.62 - k * 0.18), r * 0.16, 8, 20), 0, r * (0.82 + k * 0.2), 0, Math.PI / 2), (x, y) => shade(0xfff0f6, PINK, 0.15 + k * 0.15)));
    parts.push(paint(at(new THREE.SphereGeometry(r * 0.16, 10, 8), 0, r * 1.38, 0), PAL.apple));
    for (let k = 0; k < 9; k++) { const a = k * 0.7; parts.push(paint(at(rbox(r * 0.04, r * 0.12, r * 0.04, r * 0.02, 1), Math.cos(a) * r * 0.45, r * 0.95 + (k % 3) * r * 0.1, Math.sin(a) * r * 0.45, a, 0, a), [PAL.gold, 0x4cb8ff, MINT][k % 3])); }
  } else if (kind === 'cane') {
    const path = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, r * 1.3, 0), new THREE.Vector3(r * 0.1, r * 1.65, 0), new THREE.Vector3(r * 0.45, r * 1.7, 0), new THREE.Vector3(r * 0.6, r * 1.4, 0)]);
    parts.push(paint(new THREE.TubeGeometry(path, 24, r * 0.16, 8), (x, y) => col(Math.floor((y + x) / (r * 0.22)) % 2 ? PAL.coral : PAL.alabaster)));
  } else if (kind === 'donut') {
    parts.push(paint(at(new THREE.TorusGeometry(r * 0.62, r * 0.3, 14, 28), 0, r * 0.3, 0, Math.PI / 2), (x, y) => y > r * 0.33 ? col(PINK) : shade(0xe0a060, 0xb07038, 0.3)));
    for (let k = 0; k < 16; k++) { const a = k / 16 * 6.28 + (k % 3) * 0.2; parts.push(paint(at(rbox(r * 0.05, r * 0.14, r * 0.05, r * 0.02, 1), Math.cos(a) * r * (0.55 + (k % 2) * 0.18), r * 0.6, Math.sin(a) * r * (0.55 + (k % 2) * 0.18), Math.PI / 2, 0, a), [PAL.gold, 0x4cb8ff, MINT, PAL.alabaster][k % 4])); }
  } else if (kind === 'icecone') {
    const cone = new THREE.ConeGeometry(r * 0.45, r * 1.2, 16); cone.rotateX(Math.PI);
    parts.push(paint(at(cone, 0, r * 0.6, 0), (x, y, z) => shade(0xe0a060, 0xa86e34, (Math.sin((Math.atan2(z, x) * 4 + y * 8)) > 0.6 || Math.sin(Math.atan2(z, x) * 4 - y * 8) > 0.6) ? 0.6 : 0.1)));
    for (const [y, c] of [[1.35, 0xfff0e0], [1.75, PINK], [2.1, MINT]]) parts.push(paint(at(new THREE.IcosahedronGeometry(r * 0.48, 2), 0, r * y, 0), (x, py) => shade(c, 0xb0a0a0, 0.15 - (py - r * y) / r * 0.3)));
    parts.push(paint(at(new THREE.SphereGeometry(r * 0.12, 8, 6), 0, r * 2.55, 0), PAL.apple));
  } else if (kind === 'jelly') {
    const pts = [[0, 0], [0.95, 0], [1, 0.08], [0.85, 0.5], [0.95, 0.55], [0.7, 1.0], [0.75, 1.05], [0.35, 1.35], [0, 1.4]].map(([a, b]) => new THREE.Vector2(a * r, b * r));
    parts.push(paint(new THREE.LatheGeometry(pts, 24), swirl(PAL.coral, 0xff8f7a, 12)));
    parts.push(paint(at(new THREE.SphereGeometry(r * 0.2, 12, 8), 0, r * 1.45, 0), PAL.alabaster));
    parts.push(paint(at(new THREE.SphereGeometry(r * 0.1, 8, 6), 0, r * 1.68, 0), PAL.apple));
  } else if (kind === 'ginger') {
    const W = r * 1.4, D = r * 1.1, H = r * 0.9;
    parts.push(paint(at(rbox(W, H, D, r * 0.06, 2), 0, H / 2, 0), (x, y) => shade(0xc98a52, 0x8e5a32, 0.25 - y / H * 0.2)));
    const roof = new THREE.CylinderGeometry(D * 0.78, D * 0.78, W * 1.15, 3, 1);
    parts.push(paint(at(roof, 0, H + D * 0.36, 0, 0, 0, Math.PI / 2), (x, y) => col(Math.floor(y / (r * 0.12)) % 2 ? PAL.alabaster : 0xfff6fb)));
    for (let k = 0; k < 12; k++) parts.push(paint(at(new THREE.SphereGeometry(r * 0.07, 8, 6), -W * 0.5 + k * W / 11, H + r * 0.05, D * 0.52), [PAL.apple, MINT, PAL.gold, 0x4cb8ff][k % 4]));
    for (const sx of [-1, 1]) { parts.push(paint(at(rbox(r * 0.3, r * 0.28, 0.04, r * 0.05, 1), sx * W * 0.28, H * 0.62, D / 2 + 0.01), 0xffe7a0)); parts.push(paint(at(rbox(r * 0.36, r * 0.05, 0.06, r * 0.02, 1), sx * W * 0.28, H * 0.42, D / 2 + 0.02), PAL.alabaster)); }
    parts.push(paint(at(rbox(r * 0.32, r * 0.5, 0.05, r * 0.14, 2), 0, r * 0.25, D / 2 + 0.01), PAL.gold));
    for (const sx of [-1, 1]) { parts.push(paint(at(new THREE.CylinderGeometry(r * 0.08, r * 0.08, r * 1.1, 10), sx * W * 0.62, r * 0.55, D * 0.42), swirl(PAL.coral, PAL.alabaster, 1, 18))); parts.push(paint(at(new THREE.SphereGeometry(r * 0.16, 10, 8), sx * W * 0.62, r * 1.18, D * 0.42), PINK)); }
    parts.push(paint(at(rbox(r * 0.18, r * 0.45, r * 0.18, r * 0.04, 1), W * 0.28, H + D * 0.45, -D * 0.1), PAL.alabaster));
  // ---- Snow Peak
  } else if (kind === 'snowball') {
    parts.push(paint(at(new THREE.IcosahedronGeometry(r * 0.8, 2), 0, r * 0.75, 0), (x, y) => shade(SNOW, SNOWD, 0.5 - y / r * 0.4)));
  } else if (kind === 'snowman') {
    for (const [y, s] of [[0.5, 0.55], [1.25, 0.42], [1.85, 0.3]]) parts.push(paint(at(new THREE.IcosahedronGeometry(r * s, 2), 0, r * y, 0), (x, py) => shade(SNOW, SNOWD, 0.4 - (py - r * y) / r)));
    parts.push(paint(at(new THREE.ConeGeometry(r * 0.07, r * 0.35, 8), 0, r * 1.85, r * 0.42, Math.PI / 2), PAL.orange));
    for (const sx of [-1, 1]) parts.push(paint(at(new THREE.SphereGeometry(r * 0.045, 6, 4), sx * r * 0.11, r * 1.95, r * 0.27), PAL.slate));
    for (const y of [1.15, 1.32, 1.5]) parts.push(paint(at(new THREE.SphereGeometry(r * 0.045, 6, 4), 0, r * y, r * 0.42 - Math.abs(y - 1.3) * r * 0.3), PAL.slate));
    parts.push(paint(at(new THREE.TorusGeometry(r * 0.3, r * 0.08, 6, 16), 0, r * 1.58, 0, Math.PI / 2), PAL.coral));
    parts.push(paint(at(new THREE.CylinderGeometry(r * 0.22, r * 0.22, r * 0.3, 12), 0, r * 2.25, 0), PAL.slate));
    parts.push(paint(at(new THREE.CylinderGeometry(r * 0.34, r * 0.34, r * 0.04, 14), 0, r * 2.1, 0), PAL.slate));
    for (const sx of [-1, 1]) parts.push(paint(at(new THREE.CylinderGeometry(r * 0.03, r * 0.03, r * 0.7, 5), sx * r * 0.62, r * 1.4, 0, 0, 0, sx * 1.0), PAL.woodDark));
  } else if (kind === 'sled') {
    const L = r * 1.7, W = r * 0.9;
    parts.push(paint(at(rbox(L, r * 0.12, W, r * 0.05, 1), 0, r * 0.5, 0), (x) => col(Math.floor((x + L) / (L * 0.12)) % 2 ? PAL.coral : 0xc04a40)));
    for (const sz of [-1, 1]) {
      const path = new THREE.CatmullRomCurve3([new THREE.Vector3(-L / 2, r * 0.08, 0), new THREE.Vector3(L * 0.4, r * 0.08, 0), new THREE.Vector3(L * 0.58, r * 0.3, 0), new THREE.Vector3(L * 0.5, r * 0.6, 0)]);
      parts.push(paint(at(new THREE.TubeGeometry(path, 16, r * 0.05, 6), 0, 0, sz * W * 0.42), PAL.gold));
      for (const x of [-0.3, 0.2]) parts.push(paint(at(new THREE.CylinderGeometry(r * 0.04, r * 0.04, r * 0.42, 6), x * L, r * 0.29, sz * W * 0.42), PAL.gold));
    }
    parts.push(paint(at(rbox(r * 0.6, r * 0.45, r * 0.55, r * 0.1, 2), -L * 0.15, r * 0.8, 0), PAL.jade));
    parts.push(paint(at(rbox(r * 0.62, r * 0.08, r * 0.12, r * 0.02, 1), -L * 0.15, r * 0.8, 0), PAL.gold));
  } else if (kind === 'crystal') {
    for (const [x, z, h, a] of [[0, 0, 1.3, 0], [0.3, 0.15, 0.9, 0.35], [-0.28, 0.1, 0.8, -0.4], [0.05, -0.3, 0.7, 0.25]]) parts.push(paint(at(new THREE.ConeGeometry(r * 0.22, r * h, 6), x * r, r * h / 2, z * r, a * 0.6, 0, a), (px, py) => shade(ICE, ICED, 0.5 - py / r * 0.4)));
  } else if (kind === 'pine') {
    parts.push(paint(at(new THREE.CylinderGeometry(r * 0.1, r * 0.14, r * 0.6, 8), 0, r * 0.3, 0), PAL.woodDark));
    for (let k = 0; k < 3; k++) {
      const y = r * (0.55 + k * 0.5), s = r * (0.85 - k * 0.22);
      parts.push(paint(at(new THREE.ConeGeometry(s, r * 0.8, 10), 0, y + r * 0.4, 0), (x, py, z) => (py > y + r * 0.42 && Math.sin(Math.atan2(z, x) * 5) > -0.2) ? col(SNOW) : shade(0x2f8a62, 0x1d5c42, 0.4 - (py - y) / r)));
    }
    parts.push(paint(at(new THREE.OctahedronGeometry(r * 0.16, 0), 0, r * 2.15, 0), PAL.gold));
  } else if (kind === 'igloo') {
    const g = new THREE.SphereGeometry(r * 0.95, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2);
    parts.push(paint(g, (x, y, z) => { const row = Math.floor(y / (r * 0.18)), a = Math.atan2(z, x) + (row % 2) * 0.2; return Math.abs(Math.sin(a * 7)) < 0.08 || (y % (r * 0.18)) < r * 0.02 ? col(SNOWD) : col(SNOW); }));
    const t = new THREE.CylinderGeometry(r * 0.36, r * 0.36, r * 0.7, 16, 1, false, -Math.PI / 2, Math.PI); t.rotateX(Math.PI / 2);
    parts.push(paint(at(t, 0, r * 0.05, r * 0.85), SNOW));
    parts.push(paint(at(new THREE.CircleGeometry(r * 0.26, 16, 0, Math.PI), 0, r * 0.05, r * 1.21), 0x3b4f73));
  } else if (kind === 'icerock') {
    for (const [x, z, h, s] of [[0, 0, 2.0, 0.42], [0.55, 0.2, 1.4, 0.32], [-0.5, 0.15, 1.5, 0.34], [0.2, -0.5, 1.1, 0.3], [-0.25, 0.55, 0.9, 0.26], [0.6, -0.35, 0.8, 0.22]]) parts.push(paint(at(new THREE.CylinderGeometry(0, r * s, r * h, 6), x * r, r * h / 2, z * r, (z) * 0.3, 0, -x * 0.3), (px, py) => shade(0xc8f0ff, ICED, 0.6 - py / (r * h) * 0.6)));
    parts.push(paint(at(new THREE.CylinderGeometry(r * 1.0, r * 1.05, r * 0.12, 16), 0, r * 0.06, 0), SNOW));
  } else if (kind === 'present') {
    parts.push(paint(at(rbox(r * 1.0, r * 0.85, r * 1.0, r * 0.08, 2), 0, r * 0.43, 0), PAL.jade));
    parts.push(paint(at(rbox(r * 1.04, r * 0.88, r * 0.18, r * 0.03, 1), 0, r * 0.43, 0), PAL.gold), paint(at(rbox(r * 0.18, r * 0.88, r * 1.04, r * 0.03, 1), 0, r * 0.43, 0), PAL.gold));
    for (const sx of [-1, 1]) parts.push(paint(at(new THREE.TorusGeometry(r * 0.18, r * 0.06, 6, 12), sx * r * 0.16, r * 0.98, 0, 0, Math.PI / 2, sx * 0.6), PAL.gold));
  } else if (kind === 'palace') {
    parts.push(paint(at(rbox(r * 1.7, r * 0.5, r * 1.3, r * 0.1, 2), 0, r * 0.25, 0), (x, y) => shade(SNOW, SNOWD, 0.4 - y / r)));
    parts.push(paint(at(rbox(r * 1.1, r * 0.75, r * 0.9, r * 0.08, 2), 0, r * 0.85, -r * 0.1), (x, y) => shade(0xdff4ff, ICED, 0.3 - (y - r * 0.85) / r)));
    tower(parts, 0, -r * 0.15, r * 0.36, r * 1.55, 0xdff4ff, ICED, ICE, PAL.coral);
    for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) tower(parts, x * r * 0.72, z * r * 0.52, r * 0.22, r * 1.0, 0xdff4ff, ICED, ICE, PAL.gold);
    parts.push(paint(at(new THREE.CylinderGeometry(r * 0.3, r * 0.3, r * 0.06, 24), 0, r * 0.32, r * 0.66, Math.PI / 2), PAL.gold));
    parts.push(paint(at(new THREE.TorusGeometry(r * 0.19, r * 0.035, 6, 20), 0, r * 0.32, r * 0.7), 0x9c6a1d));
    for (let k = 0; k < 12; k++) { const a = k / 12 * 6.28; parts.push(paint(at(new THREE.ConeGeometry(r * 0.06, r * 0.28, 5), Math.cos(a) * r * 0.86, r * 0.62, Math.sin(a) * r * 0.66), ICE)); }
  } else throw new Error('unknown kind ' + kind);
}

/** Colours a kind's debris uses: [main, accent]. */
export const DEBRIS = {
  apple: [PAL.apple, 0xf2d6a0], orange: [PAL.orange, 0xf6c27a], melon: [PAL.melon, PAL.coral], crate: [PAL.wood, PAL.woodLight],
  barrel: [PAL.wood, PAL.iron], cart: [PAL.woodDark, PAL.apple], stall: [PAL.cloth, PAL.woodLight],
  cone: [PAL.coral, PAL.alabaster], car: [PAL.coral, PAL.slate], mailbox: [0x3d6fb8, PAL.slate], flowerpot: [0xd9784a, PAL.gold],
  bench: [PAL.woodLight, PAL.slate], ptree: [0xf08bb0, PAL.woodDark], fountain: [PAL.alabaster, 0x6fb8d9], house: [0xf2d6a0, PAL.coral],
  watertower: [PAL.coral, PAL.alabaster], building: [0x7e9ad1, 0xf2c96a], candy: [0xf08bb0, PAL.alabaster], vault: [0xf08bb0, PAL.gold],
  ball: [PAL.coral, 0x4cb8ff], sandcastle: [0xf0d39a, 0xc9a66a], parasol: [0x4cb8ff, PAL.alabaster], shell: [0xffb7a1, 0xe07a6a], surfboard: [0x4cb8ff, PAL.coral],
  hut: [0x4cb8ff, 0xe0b860], boat: [PAL.coral, PAL.alabaster], starfish: [0xff9e5e, 0xd9603a], bigcastle: [0xf0d39a, 0x4cb8ff],
  gumdrop: [0x8fe0c0, PAL.alabaster], lollipop: [0xf08bb0, PAL.alabaster], cupcake: [0xf08bb0, 0x4cb8ff], cane: [PAL.coral, PAL.alabaster], donut: [0xf08bb0, 0xe0a060],
  icecone: [0xe0a060, 0x8fe0c0], jelly: [PAL.coral, PAL.alabaster], ginger: [0xc98a52, PAL.alabaster],
  snowball: [0xf4f8ff, 0xb9c9e0], snowman: [0xf4f8ff, PAL.coral], sled: [PAL.coral, PAL.gold], crystal: [0x9fdcf5, 0xf4f8ff], pine: [0x2f8a62, 0xf4f8ff],
  igloo: [0xf4f8ff, 0xb9c9e0], icerock: [0xc8f0ff, 0x4fa3cf], present: [PAL.jade, PAL.gold], palace: [0xdff4ff, 0x9fdcf5],
};

/** Tree: trunk and three rounded foliage blobs, shaded top-light. */
export function buildTree(v) {
  const parts = [paint(at(new THREE.CylinderGeometry(0.12, 0.2, 1.2, 8), 0, 0.6, 0), PAL.woodDark)];
  const greens = [[PAL.grass, PAL.grassDark], [PAL.jade, 0x146b50], [0x8cc65a, 0x5c9a3e]][v % 3];
  for (const [x, y, z, s] of [[0, 1.55, 0, 0.75], [0.35, 1.25, 0.15, 0.5], [-0.3, 1.3, -0.1, 0.55]]) {
    const g = new THREE.IcosahedronGeometry(s, 1);
    parts.push(paint(at(g, x, y, z), (px, py) => shade(greens[0], greens[1], 0.6 - (py - y) / s * 0.6)));
  }
  return merge(parts);
}

/** Bush: three small blobs. */
export function buildBush() {
  const parts = [];
  for (const [x, z, s] of [[0, 0, 0.42], [0.35, 0.1, 0.3], [-0.3, -0.05, 0.32]]) parts.push(paint(at(new THREE.IcosahedronGeometry(s, 1), x, s * 0.75, z), (px, py) => shade(PAL.grass, PAL.grassDark, 0.7 - py / s * 0.5)));
  return merge(parts);
}

/** Lamp post with a warm glass head. */
export function buildLamp() {
  return merge([
    paint(at(new THREE.CylinderGeometry(0.06, 0.09, 2.2, 8), 0, 1.1, 0), PAL.slate),
    paint(at(new THREE.CylinderGeometry(0.18, 0.12, 0.08, 10), 0, 2.2, 0), PAL.slate),
    paint(at(new THREE.SphereGeometry(0.16, 12, 8), 0, 2.36, 0), PAL.gold),
    paint(at(new THREE.ConeGeometry(0.22, 0.18, 10), 0, 2.58, 0), PAL.slate),
  ]);
}

/** Puffy cloud: merged blobs, warm alabaster. */
export function buildCloud() {
  const parts = [];
  for (const [x, y, z, s] of [[0, 0, 0, 1.4], [1.3, -0.2, 0.2, 1.0], [-1.2, -0.3, 0, 1.1], [0.5, 0.5, -0.3, 0.9], [-0.4, 0.4, 0.4, 0.8]]) parts.push(paint(at(new THREE.IcosahedronGeometry(s, 1), x, y, z), (px, py) => shade(PAL.alabaster, 0xc9b8c8, 0.5 - py * 0.3)));
  return merge(parts);
}

/** Evolution looks: [head, bands, glow]. Glow > 0 tiers light up. */
export const TIERS = [
  [0xb7814d, 0x5b5f73, 0], [0xc0813a, 0x3d6fb8, 0], [0x1f9d74, 0xe5a93c, 0.25], [0xe5a93c, 0x7e3b1d, 0.15],
  [0x7e57c2, 0xe5a93c, 0.35], [0x2a2230, 0xe0582a, 0.5], [0x2b2d5b, 0xf0c86a, 0.45], [0xe06356, 0x8fd6ff, 0.4],
];

/** Head pattern of a skin, drawn once into a canvas texture (u runs around the head, v across it). */
function patternTex(skin) {
  const c = document.createElement('canvas'); c.width = 128; c.height = 64; const g = c.getContext('2d'), w = 128, h = 64;
  g.fillStyle = skin.head; g.fillRect(0, 0, w, h);
  if (skin.pattern === 'stripes') { g.fillStyle = skin.p2; for (let x = -h; x < w; x += 32) { g.beginPath(); g.moveTo(x, h); g.lineTo(x + 14, h); g.lineTo(x + 14 + h, 0); g.lineTo(x + h, 0); g.fill(); } }
  else if (skin.pattern === 'rainbow') { const C = ['#ff5d6c', '#ff9f43', '#ffd84a', '#5fd38a', '#4cb8ff', '#9b7bff']; C.forEach((k, i) => { g.fillStyle = k; g.fillRect(i * w / 6, 0, w / 6 + 1, h); }); }
  else if (skin.pattern === 'drips') { g.fillStyle = skin.p2; g.fillRect(0, 0, w, h * 0.38); for (let x = 6; x < w; x += 18) { const d = h * (0.5 + ((x * 7) % 5) * 0.06); g.beginPath(); g.roundRect(x, h * 0.3, 10, d - h * 0.3, 5); g.fill(); } g.fillStyle = 'rgba(255,255,255,.8)'; for (let i = 0; i < 14; i++) g.fillRect((i * 37) % w, (i * 13) % (h * 0.3) + 3, 4, 2); }
  else if (skin.pattern === 'bolts') { g.fillStyle = 'rgba(35,38,58,.35)'; g.fillRect(0, h * 0.46, w, 3); g.fillStyle = skin.p2; g.beginPath(); g.roundRect(w * 0.3, h * 0.16, w * 0.4, h * 0.2, 6); g.fill(); g.fillStyle = '#e8ecf6'; for (const x of [10, 54, 74, 118]) for (const y of [10, 54]) { g.beginPath(); g.arc(x, y, 4, 0, 6.3); g.fill(); } }
  else if (skin.pattern === 'scales') { g.fillStyle = skin.p2; for (let y = 6; y < h; y += 16) for (let x = (y / 16) % 2 ? 8 : 0; x < w; x += 16) { g.beginPath(); g.arc(x, y, 4, 0, 6.3); g.fill(); } }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}

/** The hammer: a pivot group whose child head rests on the ground at rotation 0, handle running back to the pivot. */
export function buildHammer() {
  const handleLen = 1.6, headW = 1.0, headR = 0.36;
  const matHead = new THREE.MeshStandardMaterial({ color: TIERS[0][0], roughness: 0.42, metalness: 0.35 });
  const matBand = new THREE.MeshStandardMaterial({ color: TIERS[0][1], roughness: 0.35, metalness: 0.7 });
  const matWood = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6, color: PAL.wood });
  const matGrip = new THREE.MeshStandardMaterial({ color: PAL.coral, roughness: 0.55 });
  const root = new THREE.Group(), pivot = new THREE.Group();
  root.add(pivot);
  pivot.position.set(0, headR, handleLen);
  // handle along -z from the pivot: a light grain painted in greys, tinted by the material (wood, or a skin's colour)
  const shaft = merge([
    paint(at(new THREE.CylinderGeometry(0.075, 0.09, handleLen, 10), 0, 0, -handleLen / 2, Math.PI / 2), (x, y, z) => shade(0xffffff, 0xb8b8b8, Math.abs(Math.sin(z * 22 + x * 40)) * 0.45)),
    paint(at(new THREE.SphereGeometry(0.12, 10, 8), 0, 0, 0.02), 0xa0a0a0),
  ]);
  pivot.add(new THREE.Mesh(shaft, matWood));
  pivot.add(new THREE.Mesh(merge([0.08, 0.2, 0.32].map((d) => paint(at(new THREE.TorusGeometry(0.095, 0.022, 6, 14), 0, 0, -d), 0xffffff))), matGrip));
  const head = new THREE.Group();
  head.position.set(0, 0, -handleLen);
  head.add(new THREE.Mesh(rbox(headW, headR * 2, headR * 2, 0.12, 3), matHead));
  for (const x of [-headW * 0.36, headW * 0.36]) head.add(at(new THREE.Mesh(new THREE.CylinderGeometry(headR * 1.06, headR * 1.06, 0.12, 20), matBand), x, 0, 0, 0, 0, Math.PI / 2));
  for (const x of [-headW / 2 - 0.03, headW / 2 + 0.03]) head.add(at(new THREE.Mesh(new THREE.CylinderGeometry(headR * 0.8, headR * 0.9, 0.07, 20), matBand), x, 0, 0, 0, 0, Math.PI / 2));
  // dino spikes along the back of the head (shown by that skin only)
  const spikes = new THREE.Mesh(merge([-0.3, -0.1, 0.1, 0.3].map((x, i) => paint(at(new THREE.ConeGeometry(0.09 + (i % 2) * 0.02, 0.26 + (i % 2) * 0.06, 8), x, headR + 0.1, 0), 0xffffff))), matBand);
  spikes.visible = false; head.add(spikes);
  const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.13, 0), new THREE.MeshStandardMaterial({ color: PAL.gold, emissive: PAL.gold, emissiveIntensity: 0.4, roughness: 0.2, metalness: 0.5 }));
  gem.position.set(0, 0, headR + 0.02);
  head.add(gem);
  pivot.add(head);
  root.traverse((o) => { if (o.isMesh) { o.castShadow = true; } });
  let skin = null, tier = 0;
  const texCache = {};
  /**
   * Evolution tier t. The classic skin takes the tier's colours; any other skin keeps its own colours and the tier
   * raises its glow, so evolving still shows on every skin.
   */
  function setTier(t) {
    tier = t;
    const [h, b, glow] = TIERS[Math.min(t, TIERS.length - 1)];
    if (!skin || !skin.head) {
      matHead.map = null; matHead.color.set(h); matHead.emissive.set(h); matHead.emissiveIntensity = glow;
      matBand.color.set(b); matBand.emissive.set(b); matBand.emissiveIntensity = glow * 0.6;
      gem.material.color.set(b); gem.material.emissive.set(b);
    } else {
      const g = Math.min(0.5, t * 0.07);
      matHead.color.set(0xffffff); matHead.emissive.set(skin.head); matHead.emissiveIntensity = g;
      matBand.color.set(skin.band); matBand.emissive.set(skin.band); matBand.emissiveIntensity = g * 0.8;
      gem.material.color.set(skin.p2 || skin.band); gem.material.emissive.set(skin.p2 || skin.band);
    }
    matHead.needsUpdate = true;
  }
  /** Puts on a skin from the config (null or one without a head colour: the classic look). */
  function setSkin(s) {
    skin = s && s.head ? s : null;
    if (skin) { matHead.map = texCache[skin.id] || (texCache[skin.id] = patternTex(skin)); } else matHead.map = null;
    matHead.metalness = skin && skin.metal != null ? skin.metal : 0.35; matHead.roughness = skin ? 0.38 : 0.42;
    matWood.color.set(skin ? skin.handle : PAL.wood); matGrip.color.set(skin ? skin.grip : PAL.coral);
    spikes.visible = !!(skin && skin.spikes);
    setTier(tier);
  }
  function dispose() { for (const t of Object.values(texCache)) t.dispose(); }
  return { root, pivot, head, gem, setTier, setSkin, dispose, headR, handleLen, mats: [matHead, matBand, matWood, gem.material, matGrip] };
}
