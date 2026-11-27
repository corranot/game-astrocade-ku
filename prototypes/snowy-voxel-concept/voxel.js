// PROTOTYPE - NOT FOR PRODUCTION
// Style preview only: wraps the three.js namespace so every rounded primitive the game builds (spheres, cones,
// cylinders, tori, discs, gems) comes out as chunky blocks. Big shapes (the sky dome) and planes are left alone.

/** Joins indexed geometries (position, normal, uv) into one. */
function join(T, geos) {
  const pos = [], nor = [], uv = [], idx = []; let vo = 0;
  for (const g of geos) {
    const P = g.attributes.position, N = g.attributes.normal, U = g.attributes.uv;
    for (let i = 0; i < P.count; i++) { pos.push(P.getX(i), P.getY(i), P.getZ(i)); nor.push(N.getX(i), N.getY(i), N.getZ(i)); uv.push(U ? U.getX(i) : 0, U ? U.getY(i) : 0); }
    if (g.index) for (let i = 0; i < g.index.count; i++) idx.push(g.index.getX(i) + vo); else for (let i = 0; i < P.count; i++) idx.push(i + vo);
    vo += P.count; g.dispose();
  }
  const o = new T.BufferGeometry();
  o.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); o.setAttribute('normal', new T.Float32BufferAttribute(nor, 3)); o.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); o.setIndex(idx);
  return o;
}
const box = (T, w, h, d, x = 0, y = 0, z = 0) => new T.BoxGeometry(w, h, d).translate(x, y, z);
/** A stepped pyramid (base width w, height h, n steps) centred on its height. */
const steps = (T, w0, w1, h, n = 3) => join(T, Array.from({ length: n }, (_, i) => { const k = (i + 0.5) / n, w = w0 + (w1 - w0) * k; return box(T, w, h / n, w, 0, -h / 2 + (i + 0.5) * h / n); }));
const copy = (dst, src) => { for (const k of ['position', 'normal', 'uv']) dst.setAttribute(k, src.attributes[k]); dst.setIndex(src.index); return dst; };

/** Returns a copy of the three.js namespace whose rounded geometries are blocky. */
export function voxelize(T0) {
  const T = { ...T0 };
  T.SphereGeometry = class extends T0.BufferGeometry {
    constructor(r = 1, ws, hs, p0 = 0, pl = Math.PI * 2, t0 = 0, tl = Math.PI) {
      super();
      if (r >= 50) return copy(this, new T0.SphereGeometry(r, ws, hs, p0, pl, t0, tl));
      const s = 0.86 * r, top = Math.cos(t0) * s, bot = Math.cos(Math.min(Math.PI, t0 + tl)) * s;
      copy(this, box(T0, 2 * s, top - bot, 2 * s, 0, (top + bot) / 2));
    }
  };
  T.ConeGeometry = class extends T0.BufferGeometry { constructor(r = 1, h = 1) { super(); copy(this, steps(T0, 1.8 * r, 0.5 * r, h, 3)); } };
  T.CylinderGeometry = class extends T0.BufferGeometry {
    constructor(rt = 1, rb = 1, h = 1) {
      super();
      const a = Math.max(rt, rb), b = Math.min(rt, rb);
      copy(this, b < a * 0.5 ? steps(T0, 1.75 * rb, Math.max(1.75 * rt, 0.3 * a), h, 3) : box(T0, 1.75 * a, h, 1.75 * a));
    }
  };
  T.TorusGeometry = class extends T0.BufferGeometry {
    constructor(R = 1, t = 0.4, rs, ts, arc = Math.PI * 2) {
      super();
      const q = 2 * t;
      if (arc < Math.PI * 1.8) { const a = arc / 2, c = Math.cos(a); copy(this, box(T0, 2 * R * Math.sin(a), q, q).rotateZ(a + Math.PI / 2).translate(R * c * c, R * c * Math.sin(a), 0)); return; }
      copy(this, join(T0, [box(T0, 2 * R + q, q, q, 0, R), box(T0, 2 * R + q, q, q, 0, -R), box(T0, q, 2 * R - q, q, R), box(T0, q, 2 * R - q, q, -R)]));
    }
  };
  T.CircleGeometry = class extends T0.BufferGeometry {
    constructor(r = 1) {
      super();
      const n = 7, rows = [];
      for (let i = 0; i < n; i++) { const y0 = -r + (2 * r * i) / n, y1 = y0 + 2 * r / n, yc = (y0 + y1) / 2, w = 2 * Math.sqrt(Math.max(0, r * r - yc * yc)); rows.push(new T0.PlaneGeometry(Math.round(w / (2 * r / n)) * (2 * r / n), y1 - y0).translate(0, yc, 0)); }
      copy(this, join(T0, rows));
    }
  };
  const gem = (k) => class extends T0.BufferGeometry { constructor(r = 1) { super(); copy(this, steps(T0, 1.5 * r, 1.5 * r * k, 1.6 * r, 2)); } };
  T.OctahedronGeometry = class extends T0.BufferGeometry { constructor(r = 1) { super(); copy(this, join(T0, [box(T0, 0.9 * r, 1.7 * r, 0.9 * r), box(T0, 1.3 * r, 0.7 * r, 1.3 * r)])); } };
  T.IcosahedronGeometry = gem(0.7);
  return T;
}
