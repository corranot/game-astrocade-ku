// PROTOTYPE - NOT FOR PRODUCTION
// Model kit: every shape in the game is built here from profiles (lathe, bevelled extrude, squashed spheres), painted
// with vertex colours and merged, so a whole prop is one draw call. THREE is read at call time, never at import.

const T = () => window.THREE;
const hex = (h) => new (T().Color)(h);

/** Paints a geometry with one colour, or a bottom-to-top gradient when `top` is given. Returns the geometry. */
export function paint(geo, color, top) {
  const THREE = T(), g = geo.index ? geo.toNonIndexed() : geo, p = g.getAttribute('position'), a = new Float32Array(p.count * 3), c0 = hex(color), c1 = top ? hex(top) : c0;
  let lo = Infinity, hi = -Infinity; for (let i = 0; i < p.count; i++) { const y = p.getY(i); if (y < lo) lo = y; if (y > hi) hi = y; }
  for (let i = 0; i < p.count; i++) { const t = top ? (p.getY(i) - lo) / Math.max(1e-6, hi - lo) : 0; a[i * 3] = c0.r + (c1.r - c0.r) * t; a[i * 3 + 1] = c0.g + (c1.g - c0.g) * t; a[i * 3 + 2] = c0.b + (c1.b - c0.b) * t; }
  g.setAttribute('color', new THREE.BufferAttribute(a, 3)); g.deleteAttribute('uv');
  if (g !== geo) geo.dispose();
  return g;
}
/** Moves, turns (Euler XYZ, radians) and scales a geometry in place. Scale may be a number or [x, y, z]. */
export function xf(geo, p = [0, 0, 0], r = [0, 0, 0], s = 1) {
  const THREE = T(), m = new THREE.Matrix4().compose(new THREE.Vector3(...p), new THREE.Quaternion().setFromEuler(new THREE.Euler(...r)), Array.isArray(s) ? new THREE.Vector3(...s) : new THREE.Vector3(s, s, s));
  geo.applyMatrix4(m); return geo;
}
/** Merges painted geometries into one (position, normal, colour). The inputs are disposed. */
export function merge(list) {
  const THREE = T(); let n = 0; const gs = list.filter(Boolean).map((g) => (g.index ? g.toNonIndexed() : g));
  for (const g of gs) n += g.getAttribute('position').count;
  const P = new Float32Array(n * 3), N = new Float32Array(n * 3), C = new Float32Array(n * 3); let o = 0;
  for (const g of gs) {
    const k = g.getAttribute('position').count; if (!g.getAttribute('normal')) g.computeVertexNormals();
    P.set(g.getAttribute('position').array.subarray(0, k * 3), o * 3); N.set(g.getAttribute('normal').array.subarray(0, k * 3), o * 3);
    const c = g.getAttribute('color'); if (c) C.set(c.array.subarray(0, k * 3), o * 3); else C.fill(1, o * 3, (o + k) * 3);
    o += k; g.dispose();
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(P, 3)); out.setAttribute('normal', new THREE.BufferAttribute(N, 3)); out.setAttribute('color', new THREE.BufferAttribute(C, 3));
  return out;
}
/** A turned shape from a profile of [radius, height] points. */
export function lathe(points, seg = 16) { const THREE = T(); return new THREE.LatheGeometry(points.map((p) => new THREE.Vector2(p[0], p[1])), seg); }
/** A box with rounded edges, centred on x and z, sitting on y = 0. */
export function rbox(w, h, d, r = 0.06, seg = 3) {
  const THREE = T(), s = new THREE.Shape(), x = w / 2 - r, z = d / 2 - r;
  s.moveTo(-x, -d / 2); s.lineTo(x, -d / 2); s.quadraticCurveTo(w / 2, -d / 2, w / 2, -z); s.lineTo(w / 2, z); s.quadraticCurveTo(w / 2, d / 2, x, d / 2); s.lineTo(-x, d / 2); s.quadraticCurveTo(-w / 2, d / 2, -w / 2, z); s.lineTo(-w / 2, -z); s.quadraticCurveTo(-w / 2, -d / 2, -x, -d / 2);
  const b = Math.min(r, h / 2 - 0.001), g = new THREE.ExtrudeGeometry(s, { depth: h - b * 2, bevelEnabled: true, bevelThickness: b, bevelSize: b * 0.9, bevelSegments: seg, curveSegments: 6 });
  g.rotateX(-Math.PI / 2); g.translate(0, b, 0); return g;
}
/** A soft blob: a sphere squashed to (sx, sy, sz). */
export function blob(r, sx = 1, sy = 1, sz = 1, detail = 2) { const g = new (T().IcosahedronGeometry)(r, detail); g.scale(sx, sy, sz); return g; }
/** A cylinder or cone from radius `r0` (bottom) to `r1` (top), sitting on y = 0. */
export function cyl(r0, r1, h, seg = 10) { const g = new (T().CylinderGeometry)(r1, r0, h, seg); g.translate(0, h / 2, 0); return g; }
/** A flat rounded slab (a path stone, a bed of mulch, a pad) of radius-ish `rx` by `rz`, `h` thick. */
export function slab(rx, rz, h, seg = 18) { const g = lathe([[0, 0], [0.92, 0], [1, h * 0.5], [0.94, h], [0, h]], seg); g.scale(rx, 1, rz); return g; }
/** A mesh from merged, painted geometry with a shared material. */
export function mesh(geo, mat, shadow = true) { const m = new (T().Mesh)(geo, mat); m.castShadow = shadow; m.receiveShadow = true; return m; }
