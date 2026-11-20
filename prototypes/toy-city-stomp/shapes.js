// Detailed toy shapes built from parts and merged into one geometry each (one draw call per kind of thing):
// cars with wheel arches, glass cabin, lights and hubcaps; little people; trees; toy tanks and helicopters.
// Parts carry their colour as vertex colours; white parts take the instance colour (each car its own paint).
/* global THREE */ // Three.js r187, set on window by index.html before run()

let tmp = null; // created lazily: THREE arrives from the CDN after module import
/** Merges [geometry, colour, matrix?] parts into one non-indexed geometry with position, normal and colour. */
export function mergeParts(parts) {
  const pos = [], nor = [], colArr = [];
  for (const [g0, c, m] of parts) {
    const g = g0.index ? g0.toNonIndexed() : g0.clone();
    if (m) g.applyMatrix4(m);
    if (!g.attributes.normal) g.computeVertexNormals();
    (tmp ||= new THREE.Color()).setHex(c);
    const p = g.attributes.position, n = g.attributes.normal;
    for (let i = 0; i < p.count; i++) { pos.push(p.getX(i), p.getY(i), p.getZ(i)); nor.push(n.getX(i), n.getY(i), n.getZ(i)); colArr.push(tmp.r, tmp.g, tmp.b); }
    g.dispose(); if (g0 !== g) g0.dispose();
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  out.setAttribute('color', new THREE.Float32BufferAttribute(colArr, 3));
  return out;
}
const M = (x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, s = 1) => new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(s, s, s));
const MS = (x, y, z, sx, sy, sz) => new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion(), new THREE.Vector3(sx, sy, sz));

/** The car body seen from the side (front is +x): a rounded slab with two wheel arches, extruded to its width. */
function carBodyGeo(len = 2.4, h0 = 0.25, h1 = 0.78, w = 1.1) {
  const L = len / 2, s = new THREE.Shape(), ar = 0.37, ax = L * 0.58;
  s.moveTo(-L, h0); s.lineTo(-L, h1 - 0.15); s.quadraticCurveTo(-L, h1, -L + 0.18, h1); s.lineTo(L - 0.25, h1); s.quadraticCurveTo(L, h1, L, h1 - 0.2); s.lineTo(L, h0);
  s.lineTo(ax + ar, h0); s.absarc(ax, h0, ar, 0, Math.PI, false); s.lineTo(-ax + ar, h0); s.absarc(-ax, h0, ar, 0, Math.PI, false); s.lineTo(-L, h0);
  const g = new THREE.ExtrudeGeometry(s, { depth: w, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.05, bevelSegments: 2, curveSegments: 10 });
  g.translate(0, 0, -w / 2); return g;
}
/** The glass cabin: a sloped windscreen at the front, a shorter back window. */
function cabinGeo(h0 = 0.78, h1 = 1.28, w = 0.95) {
  const s = new THREE.Shape(); s.moveTo(-0.62, h0); s.lineTo(0.62, h0); s.lineTo(0.28, h1); s.lineTo(-0.48, h1); s.lineTo(-0.62, h0);
  const g = new THREE.ExtrudeGeometry(s, { depth: w, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.04, bevelSegments: 1 });
  g.translate(0, 0, -w / 2); return g;
}

/** City car: body (takes the instance paint), glass cabin, lights + bumpers, wheels. Local origin on the ground. */
export function cityCar() {
  const body = mergeParts([[carBodyGeo(), 0xffffff], [new THREE.BoxGeometry(0.86, 0.07, 1.02), 0xffffff, M(-0.1, 1.33, 0)]]); // roof in the car's paint, on the cabin
  const glass = mergeParts([[cabinGeo(), 0xbfe6ff]]);
  const trim = mergeParts([
    [new THREE.BoxGeometry(0.06, 0.16, 0.26), 0xfff3b0, M(1.22, 0.58, 0.32)], [new THREE.BoxGeometry(0.06, 0.16, 0.26), 0xfff3b0, M(1.22, 0.58, -0.32)], // headlights
    [new THREE.BoxGeometry(0.06, 0.14, 0.24), 0xff3b3b, M(-1.22, 0.6, 0.34)], [new THREE.BoxGeometry(0.06, 0.14, 0.24), 0xff3b3b, M(-1.22, 0.6, -0.34)], // tail lights
    [new THREE.BoxGeometry(0.12, 0.14, 1.16), 0x5b5f73, M(1.24, 0.32, 0)], [new THREE.BoxGeometry(0.12, 0.14, 1.16), 0x5b5f73, M(-1.24, 0.32, 0)], // bumpers
  ]);
  const wheel = mergeParts([[new THREE.CylinderGeometry(0.32, 0.32, 0.26, 16), 0x2a2140, M(0, 0, 0, Math.PI / 2)], [new THREE.CylinderGeometry(0.15, 0.15, 0.28, 12), 0xd8dde8, M(0, 0, 0, Math.PI / 2)]]);
  return { body, glass, trim, wheel, wheelAt: [[0.7, 0.3, 0.6], [0.7, 0.3, -0.6], [-0.7, 0.3, 0.6], [-0.7, 0.3, -0.6]] };
}

/** A toy army car (all colours baked in), centred like a 1.8 x 0.8 box. */
export function armyCar() {
  return mergeParts([
    [carBodyGeo(2.0, 0.25, 0.72, 1.0), 0xff5a4f, M(0, -0.5, 0)], [cabinGeo(0.72, 1.12, 0.85), 0xbfe6ff, M(0, -0.5, 0, 0, 0, 0, 1)],
    ...[[0.58, 0.5], [0.58, -0.5], [-0.58, 0.5], [-0.58, -0.5]].map(([x, z]) => [new THREE.CylinderGeometry(0.3, 0.3, 0.24, 14), 0x2a2140, M(x, -0.2, z, Math.PI / 2)]),
    [new THREE.BoxGeometry(0.06, 0.14, 0.22), 0xfff3b0, M(1.02, 0.02, 0.28)], [new THREE.BoxGeometry(0.06, 0.14, 0.22), 0xfff3b0, M(1.02, 0.02, -0.28)],
  ]);
}

/** A toy tank hull with treads and road wheels (colours baked in), centred like a 2.2 x 0.8 box. */
export function tankHull() {
  const parts = [[new THREE.BoxGeometry(2.1, 0.5, 1.2), 0x6fd64b, M(0, 0.1, 0)], [new THREE.BoxGeometry(1.4, 0.2, 1.1), 0x5cc23d, M(0.1, 0.42, 0)]];
  for (const z of [0.72, -0.72]) {
    parts.push([new THREE.CapsuleGeometry(0.28, 1.7, 4, 10), 0x3a3550, M(0, -0.12, z, 0, 0, Math.PI / 2)]);
    for (let k = 0; k < 4; k++) parts.push([new THREE.CylinderGeometry(0.17, 0.17, 0.3, 10), 0x9aa3b5, M(-0.75 + k * 0.5, -0.12, z * 1.02, Math.PI / 2)]);
  }
  return mergeParts(parts);
}
/** The turret with a hatch on top. */
export function tankTurret() {
  return mergeParts([[new THREE.CylinderGeometry(0.55, 0.65, 0.5, 16), 0x4cc35a], [new THREE.CylinderGeometry(0.24, 0.24, 0.12, 12), 0xffc531, M(-0.15, 0.3, 0)]]);
}

/** A toy helicopter body: round cabin, glass bubble, skids. */
export function heliBody() {
  return mergeParts([
    [new THREE.SphereGeometry(0.85, 18, 12), 0x3fa9ff], [new THREE.SphereGeometry(0.62, 16, 10), 0xbfe6ff, MS(0.42, 0.12, 0, 0.75, 0.85, 0.95)],
    ...[0.5, -0.5].map((z) => [new THREE.CapsuleGeometry(0.06, 1.5, 3, 6), 0x3a3550, M(0, -0.95, z, 0, 0, Math.PI / 2)]),
    ...[[0.35, 0.5], [-0.35, 0.5], [0.35, -0.5], [-0.35, -0.5]].map(([x, z]) => [new THREE.CylinderGeometry(0.04, 0.04, 0.4, 6), 0x3a3550, M(x, -0.75, z)]),
    [new THREE.CylinderGeometry(0.1, 0.1, 0.3, 8), 0x3a3550, M(0, 0.85, 0)],
  ]);
}
/** The tail boom with a fin and a small rotor. */
export function heliTail() {
  return mergeParts([
    [new THREE.CylinderGeometry(0.12, 0.2, 1.6, 10), 0x3fa9ff, M(-1.2, 0.1, 0, 0, 0, Math.PI / 2)],
    [new THREE.BoxGeometry(0.4, 0.55, 0.08), 0xffc531, M(-1.95, 0.35, 0)], [new THREE.BoxGeometry(0.06, 0.7, 0.08), 0x3a3550, M(-1.95, 0.25, 0.1)],
  ]);
}

/** A little toy person: torso and legs (white: takes the shirt colour), arms up cheering. Head is separate. */
export function personBody() {
  return mergeParts([
    [new THREE.CapsuleGeometry(0.16, 0.18, 4, 10), 0xffffff, M(0, 0.02, 0)],
    [new THREE.CapsuleGeometry(0.06, 0.16, 3, 6), 0x55607a, M(0.07, -0.26, 0)], [new THREE.CapsuleGeometry(0.06, 0.16, 3, 6), 0x55607a, M(-0.07, -0.26, 0)],
    [new THREE.CapsuleGeometry(0.05, 0.18, 3, 6), 0xffffff, M(0.2, 0.18, 0, 0, 0, -0.7)], [new THREE.CapsuleGeometry(0.05, 0.18, 3, 6), 0xffffff, M(-0.2, 0.18, 0, 0, 0, 0.7)],
  ]);
}
/** The head with a little cap of hair. */
export function personHead() {
  return mergeParts([[new THREE.SphereGeometry(0.15, 14, 10), 0xffffff, M(0, 0.36, 0)], [new THREE.SphereGeometry(0.155, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.45), 0x4a3426, M(0, 0.375, -0.01)]]);
}

/** Tree crowns by kind: a bushy cluster (round), stacked cones (pine), drooping fronds (palm), a ball (lollipop). */
export function treeCrown(kind) {
  if (kind === 'cone') return mergeParts([[new THREE.ConeGeometry(1, 0.9, 8), 0xffffff, M(0, -0.35, 0)], [new THREE.ConeGeometry(0.78, 0.8, 8), 0xffffff, M(0, 0.1, 0)], [new THREE.ConeGeometry(0.52, 0.7, 8), 0xffffff, M(0, 0.5, 0)]]);
  if (kind === 'palm') return mergeParts(Array.from({ length: 7 }, (_, k) => [new THREE.SphereGeometry(1, 10, 6), 0xffffff, new THREE.Matrix4().compose(new THREE.Vector3(Math.cos(k / 7 * Math.PI * 2) * 0.55, -0.15, Math.sin(k / 7 * Math.PI * 2) * 0.55), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, -k / 7 * Math.PI * 2, -0.45)), new THREE.Vector3(0.6, 0.12, 0.22))]));
  if (kind === 'lolly') return mergeParts([[new THREE.SphereGeometry(1, 16, 12), 0xffffff], [new THREE.TorusGeometry(0.72, 0.1, 6, 24), 0xffffff, M(0, 0, 0.72)]]);
  return mergeParts([[new THREE.IcosahedronGeometry(0.8, 1), 0xffffff, M(0, 0.15, 0)], [new THREE.IcosahedronGeometry(0.6, 1), 0xffffff, M(0.55, -0.15, 0.1)], [new THREE.IcosahedronGeometry(0.6, 1), 0xffffff, M(-0.5, -0.1, -0.15)], [new THREE.IcosahedronGeometry(0.55, 1), 0xffffff, M(0.05, -0.1, 0.55)]]);
}
