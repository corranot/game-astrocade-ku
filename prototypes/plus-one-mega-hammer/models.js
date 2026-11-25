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
  }
  return merge(parts);
}

/** Colours a kind's debris uses: [main, accent]. */
export const DEBRIS = {
  apple: [PAL.apple, 0xf2d6a0], orange: [PAL.orange, 0xf6c27a], melon: [PAL.melon, PAL.coral], crate: [PAL.wood, PAL.woodLight],
  barrel: [PAL.wood, PAL.iron], cart: [PAL.woodDark, PAL.apple], stall: [PAL.cloth, PAL.woodLight],
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

/** The hammer: a pivot group whose child head rests on the ground at rotation 0, handle running back to the pivot. */
export function buildHammer() {
  const handleLen = 1.6, headW = 1.0, headR = 0.36;
  const matHead = new THREE.MeshStandardMaterial({ color: TIERS[0][0], roughness: 0.42, metalness: 0.35 });
  const matBand = new THREE.MeshStandardMaterial({ color: TIERS[0][1], roughness: 0.35, metalness: 0.7 });
  const matWood = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6 });
  const root = new THREE.Group(), pivot = new THREE.Group();
  root.add(pivot);
  pivot.position.set(0, headR, handleLen);
  // handle along -z from the pivot, with grip wraps and a pommel
  const handle = merge([
    paint(at(new THREE.CylinderGeometry(0.075, 0.09, handleLen, 10), 0, 0, -handleLen / 2, Math.PI / 2), (x, y, z) => shade(PAL.wood, PAL.woodDark, Math.abs(Math.sin(z * 22 + x * 40)) * 0.3)),
    ...[0.08, 0.2, 0.32].map((d) => paint(at(new THREE.TorusGeometry(0.095, 0.022, 6, 14), 0, 0, -d), PAL.coral)),
    paint(at(new THREE.SphereGeometry(0.12, 10, 8), 0, 0, 0.02), PAL.woodDark),
  ]);
  pivot.add(new THREE.Mesh(handle, matWood));
  const head = new THREE.Group();
  head.position.set(0, 0, -handleLen);
  head.add(new THREE.Mesh(rbox(headW, headR * 2, headR * 2, 0.12, 3), matHead));
  for (const x of [-headW * 0.36, headW * 0.36]) head.add(at(new THREE.Mesh(new THREE.CylinderGeometry(headR * 1.06, headR * 1.06, 0.12, 20), matBand), x, 0, 0, 0, 0, Math.PI / 2));
  for (const x of [-headW / 2 - 0.03, headW / 2 + 0.03]) head.add(at(new THREE.Mesh(new THREE.CylinderGeometry(headR * 0.8, headR * 0.9, 0.07, 20), matBand), x, 0, 0, 0, 0, Math.PI / 2));
  const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.13, 0), new THREE.MeshStandardMaterial({ color: PAL.gold, emissive: PAL.gold, emissiveIntensity: 0.4, roughness: 0.2, metalness: 0.5 }));
  gem.position.set(0, 0, headR + 0.02);
  head.add(gem);
  pivot.add(head);
  root.traverse((o) => { if (o.isMesh) { o.castShadow = true; } });
  function setTier(t) {
    const [h, b, glow] = TIERS[Math.min(t, TIERS.length - 1)];
    matHead.color.set(h); matHead.emissive.set(h); matHead.emissiveIntensity = glow;
    matBand.color.set(b); matBand.emissive.set(b); matBand.emissiveIntensity = glow * 0.6;
    gem.material.color.set(b); gem.material.emissive.set(b);
  }
  return { root, pivot, head, gem, setTier, headR, handleLen, mats: [matHead, matBand, matWood, gem.material] };
}
