// PROTOTYPE - NOT FOR PRODUCTION
// Chibi base: a reusable, code-built 3D chibi (big round head, small body, mitten hands, short legs), matching the
// owner's base silhouette. One skinned body mesh (skin and painted clothes as vertex colours) on a 12-bone skeleton,
// rigid face/hair/hat parts on the head bone, and optional puffy coat layers that share the skeleton.
// Origin on the ground between the feet, facing +z, about 1.8 units tall (head top). No textures, no assets.
// THREE is read from the global only inside functions (never at import), like the other game modules.

const C = (h) => new THREE.Color(h);
const sat = (x) => Math.max(0, Math.min(1, x));
const sstep = (a, b, x) => { const t = sat((x - a) / (b - a)); return t * t * (3 - 2 * t); };

/** Default look. Every slot is optional; pass a partial look to override. */
export const DEFAULT_LOOK = {
  skin: '#ffd9bf', blush: '#ff8f8f',
  eyes: { color: '#5a3a26', size: 1 },
  mouth: 'smile', // 'smile' | 'open' | 'cat'
  hair: { style: 'bob', color: '#5a3424' }, // style: 'bob' | 'short' | 'pigtails' | 'none'
  top: { color: '#8fd0ff', sleeve: 0.45 }, // sleeve 0..1 of the arm; null = bare
  bottom: { color: '#3d4f78', length: 0.42 }, // length 0..1 of the leg; null = bare
  shoes: '#7a4a32',
  mitts: null, // colour, or null for bare hands
  hat: null, // { style: 'beanie', color, cuff, pom }
  coat: null, // { color, trim, quilt }
  build: 'chibi', // 'chibi' (the owner's silhouette: head ~40% of height, wider than the shoulders) | 'tall'
};

/** Proportion presets: body height scale, head scale, mitten scale. */
export const BUILDS = { chibi: { body: 0.8, head: 1.25, hand: 1.22 }, tall: { body: 1, head: 1, hand: 1 } };

// bind pose (mesh space, feet at y 0); arms hang a little outward
const BONES = [ // name, parent, x, y, z
  ['root', -1, 0, 0, 0], ['hips', 0, 0, 0.6, 0], ['spine', 1, 0, 0.2, 0], ['chest', 2, 0, 0.18, 0], ['neck', 3, 0, 0.18, 0], ['head', 4, 0, 0.08, 0],
  ['armL', 3, 0.165, 0.045, 0], ['armR', 3, -0.165, 0.045, 0], ['handL', 6, 0, -0.3, 0], ['handR', 7, 0, -0.3, 0],
  ['legL', 1, 0.115, 0, 0], ['legR', 1, -0.115, 0, 0],
];
const ARM_REST = 0.27; // radians outward
const CHAIN = [[1, 0.6], [2, 0.8], [3, 0.98], [4, 1.16], [5, 1.24]]; // torso bones by height, for vertical blending
const HEAD = { cy: 0.2, rx: 0.3, ry: 0.29, rz: 0.275 }; // head ellipsoid, relative to the head bone

/**
 * Moves every vertex of `geo` by `f(p) -> Vector3` and carries the normals through f's tangent-plane derivatives
 * (numeric), so stretched spheres and lathes keep smooth shading across their UV seams. Works for f that flatten the
 * radial direction (normalize first), since only directions along the surface are used.
 */
function deform(geo, f) {
  const P = geo.attributes.position, N = geo.attributes.normal, e = 1e-3;
  const p = new THREE.Vector3(), n = new THREE.Vector3(), t1 = new THREE.Vector3(), t2 = new THREE.Vector3(), a = new THREE.Vector3(), b = new THREE.Vector3(), q = new THREE.Vector3();
  const dir = (t, out) => out.copy(f(q.copy(p).addScaledVector(t, e))).sub(f(q.copy(p).addScaledVector(t, -e))); // f's change along t
  for (let i = 0; i < P.count; i++) {
    p.fromBufferAttribute(P, i); n.fromBufferAttribute(N, i);
    t1.set(Math.abs(n.y) < 0.9 ? 0 : 1, Math.abs(n.y) < 0.9 ? 1 : 0, 0).cross(n).normalize(); t2.crossVectors(n, t1);
    dir(t1, a); dir(t2, b); const nn = a.cross(b); if (nn.lengthSq() > 1e-20) n.copy(nn).normalize();
    const o = f(p.clone()); P.setXYZ(i, o.x, o.y, o.z); N.setXYZ(i, n.x, n.y, n.z);
  }
  return geo;
}

/** Lathe around +y from (r, y) pairs; `inf` inflates every non-zero radius (for clothes over the body). */
const lathe = (pts, seg = 22, inf = 0, n = 0) => {
  let v = pts.map(([r, y]) => new THREE.Vector3(r > 0 ? r + inf : 0, y, 0));
  // resample along a smooth curve so clothing edges and quilt channels get enough rings (ends stay closed)
  if (n) v = new THREE.CatmullRomCurve3(v, false, 'centripetal').getSpacedPoints(n).map((p, i, a) => new THREE.Vector3(i === 0 || i === a.length - 1 ? 0 : Math.max(0.002, p.x), p.y, 0));
  return new THREE.LatheGeometry(v.map((p) => new THREE.Vector2(p.x, p.y)), seg);
};
const ell = (rx, ry, rz, seg = 16) => new THREE.SphereGeometry(1, seg, Math.round(seg * 0.7)).scale(rx, ry, rz);
const M4 = (x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) => new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(1, 1, 1));

// body profiles, (radius, y) bottom to top
const TORSO = [[0, 0.5], [0.1, 0.505], [0.16, 0.53], [0.195, 0.58], [0.2, 0.64], [0.19, 0.74], [0.172, 0.84], [0.165, 0.93], [0.17, 1.0], [0.163, 1.04], [0.142, 1.078], [0.108, 1.108], [0.078, 1.13], [0.064, 1.16], [0.062, 1.22], [0, 1.25]];
const LEG = [[0, -0.6], [0.05, -0.597], [0.088, -0.575], [0.1, -0.53], [0.104, -0.42], [0.112, -0.24], [0.113, -0.08], [0.105, 0.02], [0.06, 0.06], [0, 0.07]]; // leg-bone local
const ARM = [[0, -0.33], [0.045, -0.325], [0.052, -0.3], [0.056, -0.24], [0.063, -0.14], [0.07, -0.04], [0.068, 0.015], [0.048, 0.05], [0, 0.06]]; // arm-bone local

const icount = (g) => (g.index ? g.index.count : g.attributes.position.count);

/** One skinned part: geometry in its bone's local space, a weight rule and a colour rule. */
function part(geo, bone, weights, color) { return { geo, bone, weights, color }; }

/** Torso weights: blend between the two nearest bones of the spine chain by height. */
function chainW(y) {
  if (y <= CHAIN[0][1]) return [[CHAIN[0][0], 1]];
  for (let i = 0; i < CHAIN.length - 1; i++) {
    const [b0, y0] = CHAIN[i], [b1, y1] = CHAIN[i + 1];
    if (y <= y1) { const t = sstep(0, 1, (y - y0) / (y1 - y0)); return [[b0, 1 - t], [b1, t]]; }
  }
  return [[CHAIN[CHAIN.length - 1][0], 1]];
}

/** Soft baked occlusion: darker on faces that point down. */
const ao = (n, k = 0.22) => 1 - k + k * sat(n.y * 0.5 + 0.65);

/**
 * Merges skinned parts into one geometry (position, normal, color, skinIndex, skinWeight) in mesh space using the
 * bones' bind matrices.
 */
function mergeSkinned(parts, bind, sy = 1) {
  let nv = 0, ni = 0;
  for (const p of parts) { nv += p.geo.attributes.position.count; ni += icount(p.geo); }
  const pos = new Float32Array(nv * 3), nor = new Float32Array(nv * 3), col = new Float32Array(nv * 3), si = new Uint16Array(nv * 4), sw = new Float32Array(nv * 4), idx = new Uint32Array(ni);
  const v = new THREE.Vector3(), n = new THREE.Vector3(), w = new THREE.Vector3(), nm = new THREE.Matrix3();
  let vo = 0, io = 0;
  for (const p of parts) {
    const g = p.geo, P = g.attributes.position, N = g.attributes.normal, M = bind[p.bone]; nm.getNormalMatrix(M);
    for (let i = 0; i < P.count; i++) {
      v.fromBufferAttribute(P, i); n.fromBufferAttribute(N, i);
      const c = p.color(v, n); col.set([c.r, c.g, c.b], (vo + i) * 3);
      const ww = p.weights(v);
      w.copy(v); w.y *= sy; w.applyMatrix4(M); pos.set([w.x, w.y, w.z], (vo + i) * 3); // shorter builds squash the body
      n.y /= sy; for (let k = 0; k < ww.length; k++) { si[(vo + i) * 4 + k] = ww[k][0]; sw[(vo + i) * 4 + k] = ww[k][1]; }
      n.applyMatrix3(nm).normalize(); nor.set([n.x, n.y, n.z], (vo + i) * 3);
    }
    for (let i = 0; i < icount(g); i++) idx[io + i] = (g.index ? g.index.getX(i) : i) + vo;
    vo += P.count; io += icount(g); g.dispose();
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3)); out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  out.setAttribute('color', new THREE.BufferAttribute(col, 3)); out.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(si, 4));
  out.setAttribute('skinWeight', new THREE.BufferAttribute(sw, 4)); out.setIndex(new THREE.BufferAttribute(idx, 1));
  out.computeBoundingSphere(); out.boundingSphere.radius += 0.6; // room for poses (raised arms)
  return out;
}

/** Merges rigid geometries with per-vertex colour rules into one (for parts on the head bone). */
function mergeRigid(items) {
  let nv = 0, ni = 0;
  for (const it of items) { nv += it.g.attributes.position.count; ni += icount(it.g); }
  const pos = new Float32Array(nv * 3), nor = new Float32Array(nv * 3), col = new Float32Array(nv * 3), idx = new Uint32Array(ni);
  const v = new THREE.Vector3(), n = new THREE.Vector3(), nm = new THREE.Matrix3();
  let vo = 0, io = 0;
  for (const it of items) {
    const g = it.g, P = g.attributes.position, N = g.attributes.normal, M = it.m || new THREE.Matrix4(); nm.getNormalMatrix(M);
    for (let i = 0; i < P.count; i++) {
      v.fromBufferAttribute(P, i); n.fromBufferAttribute(N, i);
      const c = typeof it.col === 'function' ? it.col(v, n) : it.col; col.set([c.r, c.g, c.b], (vo + i) * 3);
      v.applyMatrix4(M); n.applyMatrix3(nm).normalize();
      pos.set([v.x, v.y, v.z], (vo + i) * 3); nor.set([n.x, n.y, n.z], (vo + i) * 3);
    }
    for (let i = 0; i < icount(g); i++) idx[io + i] = (g.index ? g.index.getX(i) : i) + vo;
    vo += P.count; io += icount(g); g.dispose();
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3)); out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  out.setAttribute('color', new THREE.BufferAttribute(col, 3)); out.setIndex(new THREE.BufferAttribute(idx, 1));
  out.computeBoundingSphere();
  return out;
}

let MATS = null;
/**
 * Shared chibi materials (one shader program for all of them): vertex colours, a soft toy-like rim light, a warm
 * wrap on the shadow side so skin never goes grey, and cool sky fill from above. Reused by every chibi on screen.
 */
export function chibiMaterials() {
  if (MATS) return MATS;
  const toy = (rough, rim) => {
    const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: rough, metalness: 0 });
    m.onBeforeCompile = (sh) => {
      sh.uniforms.uRim = { value: rim };
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform float uRim;')
        .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\nfloat fr = pow(1.0 - saturate(dot(normalize(vNormal), normalize(vViewPosition))), 2.4);\nfloat up = dot(normalize(vNormal), normalize((viewMatrix * vec4(0.0, 1.0, 0.0, 0.0)).xyz));\ntotalEmissiveRadiance += diffuseColor.rgb * (fr * uRim + vec3(0.09, 0.05, 0.04) * (1.0 - smoothstep(-0.4, 0.6, up)));');
    };
    m.customProgramCacheKey = () => 'chibi-toy';
    return m;
  };
  MATS = { body: toy(0.72, 0.42), hair: toy(0.42, 0.32), eye: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.08, metalness: 0 }) };
  return MATS;
}

const mergeLook = (look) => {
  const L = { ...DEFAULT_LOOK, ...look };
  for (const k of ['eyes', 'hair']) L[k] = { ...DEFAULT_LOOK[k], ...(look && look[k]) };
  return L;
};

/** Point on the head surface along unit direction d (head-bone space), and the head deform used for the skin. */
function headShape(d) {
  let x = d.x, y = d.y, z = d.z;
  const jowl = y < 0 ? 1 + 0.11 * Math.min(1, -y * 1.4) * (1 - Math.max(0, -y - 0.75) * 2.2) : 1; // chubby lower cheeks
  x *= jowl; z *= y < 0 ? 1 + 0.05 * -y : 1;
  if (y < 0) y *= 0.92; // a flatter chin
  if (z < 0) z *= 1.06; // a rounder back of the head
  return new THREE.Vector3(x * HEAD.rx, y * HEAD.ry + HEAD.cy, z * HEAD.rz);
}
const onHead = (dx, dy, dz, k = 1) => { const d = new THREE.Vector3(dx, dy, dz).normalize(); return { p: headShape(d).sub(new THREE.Vector3(0, HEAD.cy, 0)).multiplyScalar(k).add(new THREE.Vector3(0, HEAD.cy, 0)), d }; };
/** Matrix that places a feature at a head-surface point, facing out along the surface normal. */
function faceM(dx, dy, dz, lift = 0, roll = 0) {
  const { p } = onHead(dx, dy, dz);
  const e = 1e-3, a = onHead(dx + e, dy, dz).p.sub(onHead(dx - e, dy, dz).p), b = onHead(dx, dy + e, dz).p.sub(onHead(dx, dy - e, dz).p);
  const nz = new THREE.Vector3().crossVectors(a, b).normalize(); if (nz.z < 0) nz.negate();
  const ny0 = new THREE.Vector3(0, 1, 0), nx = new THREE.Vector3().crossVectors(ny0, nz).normalize(), ny = new THREE.Vector3().crossVectors(nz, nx);
  const m = new THREE.Matrix4().makeBasis(nx, ny, nz).multiply(new THREE.Matrix4().makeRotationZ(roll));
  m.setPosition(p.add(nz.clone().multiplyScalar(lift)));
  return m;
}

/**
 * Hair as a shell around the head whose radius dips smoothly under the skin outside the style's mask: a scalloped
 * fringe over the forehead, side locks framing the cheeks, and a length line at the back. Extra volume on the crown.
 */
function hairGeo(style, colour) {
  const base = C(colour), hi = base.clone().lerp(C('#fff1dc'), 0.38), lo = base.clone().multiplyScalar(0.72);
  const ctr = new THREE.Vector3(0, HEAD.cy, 0);
  const col = (p) => {
    const d = p.clone().sub(ctr).normalize(), a = Math.atan2(d.x, d.z);
    const ring = Math.exp(-Math.pow((d.y - 0.62) / 0.1, 2)) * (0.5 + 0.5 * Math.max(0, Math.sin(a * 11))); // glossy "angel ring"
    return base.clone().lerp(hi, ring * 0.85).lerp(lo, sat(-d.y * 0.9 + 0.1)).multiplyScalar(0.93 + 0.07 * Math.sin(a * 30 + d.y * 6));
  };
  const shell = (mask, out = 1.075) => deform(new THREE.SphereGeometry(1, 64, 48), (p) => {
    const d = p.clone().normalize(), m = mask(d), k = 0.95 + (out + 0.035 * sat(d.y) - 0.95) * m;
    return headShape(d).sub(ctr).multiplyScalar(k).add(ctr);
  });
  // the face opening: front, below the fringe line, between the side locks
  const open = (d, fr, lock) => sstep(0.18, 0.4, d.z) * (1 - sstep(fr - 0.05, fr + 0.05, d.y)) * (1 - sstep(lock - 0.08, lock + 0.04, Math.abs(d.x)));
  const fringe = (d, top, lumps, depth) => top - depth * Math.pow(Math.abs(Math.sin(d.x * lumps)), 0.6);
  const items = [];
  if (style === 'bob' || style === 'pigtails') {
    const mask = (d) => {
      const len = -0.82 + 0.34 * sstep(-0.3, 0.7, d.z); // length line: low at the nape, jaw level at the side locks
      return sstep(len - 0.05, len + 0.05, d.y) * (1 - open(d, fringe(d, 0.36, 7, 0.1), 0.66));
    };
    items.push({ g: shell(mask), col });
    if (style === 'pigtails') for (const s of [-1, 1]) {
      items.push({ g: deform(ell(0.1, 0.16, 0.1, 20), (p) => new THREE.Vector3(p.x * (1 - p.y * 1.5), p.y, p.z * (1 - p.y * 1.5))), m: M4(s * 0.35, HEAD.cy - 0.02, -0.1, 0, 0, s * 0.45), col });
      items.push({ g: ell(0.04, 0.035, 0.04, 10), m: M4(s * 0.3, HEAD.cy + 0.09, -0.09), col: () => C('#ff7aa2') }); // hair ties
    }
  } else if (style === 'short') {
    const mask = (d) => { const len = -0.3 + 0.1 * sstep(0, 0.6, d.z); return sstep(len - 0.04, len + 0.04, d.y) * (1 - open(d, fringe(d, 0.46, 6, 0.12), 0.8)); };
    items.push({ g: shell(mask, 1.06), col });
    items.push({ g: new THREE.TorusGeometry(0.06, 0.02, 8, 16, Math.PI * 1.4), m: M4(0.02, HEAD.cy + HEAD.ry + 0.035, 0.02, 0, Math.PI / 2, 0.6), col }); // a curl on top
  }
  return items.length ? mergeRigid(items) : null;
}

/** Eyes (iris gradient, two catchlights, a lash line), merged; built around the eye line so they blink by scale.y. */
function eyeGeo(eyes, eyeY) {
  const s = eyes.size || 1, iris = C(eyes.color), dark = C('#1d1420');
  const items = [];
  for (const sx of [-1, 1]) {
    const m = faceM(sx * 0.37, -0.13, 0.92, -0.004);
    m.elements[13] -= eyeY;
    const ec = (p) => dark.clone().lerp(iris, sstep(0.01, -0.05, p.y)).lerp(C('#0c0810'), Math.exp(-(p.x * p.x + (p.y - 0.008) * (p.y - 0.008)) / 0.0006) * 0.85);
    items.push({ g: ell(0.052 * s, 0.068 * s, 0.018, 18), m, col: ec });
    const add = (g, x, y, z, c, rz = 0) => items.push({ g, m: m.clone().multiply(M4(x, y, z, 0, 0, rz)), col: c });
    add(ell(0.02 * s, 0.024 * s, 0.006, 10), sx * 0.016 * s, 0.026 * s, 0.017, C('#ffffff'));
    add(ell(0.009 * s, 0.009 * s, 0.004, 8), -sx * 0.018 * s, -0.026 * s, 0.017, C('#fff6e8'));
    add(new THREE.TorusGeometry(0.056 * s, 0.009, 6, 16, Math.PI * 0.86), 0, -0.002, 0.01, C('#1a1018'), Math.PI * 0.07); // upper lash line
    add(ell(0.014, 0.008, 0.006, 8), sx * 0.058 * s, 0.05 * s, 0.008, C('#1a1018'), -sx * 0.6); // outer lash flick
  }
  return mergeRigid(items);
}

/** Builds the head skin mesh (with ears, mouth and blush) in head-bone space. */
function headGeo(L) {
  const skin = C(L.skin), blush = C(L.blush), lip = C('#a8404c');
  const cheek = [new THREE.Vector3(-0.58, -0.32, 0.75).normalize(), new THREE.Vector3(0.58, -0.32, 0.75).normalize()];
  const head = deform(new THREE.SphereGeometry(1, 40, 30), (p) => headShape(p.clone().normalize()));
  const headCol = (p, n) => {
    const d = p.clone().sub(new THREE.Vector3(0, HEAD.cy, 0)).normalize();
    const b = Math.max(...cheek.map((c) => Math.exp(-d.distanceToSquared(c) / 0.022)));
    return skin.clone().lerp(blush, b * 0.6).multiplyScalar(ao(n, 0.12));
  };
  const items = [{ g: head, col: headCol }];
  for (const s of [-1, 1]) items.push({ g: ell(0.05, 0.068, 0.04, 14), m: M4(s * 0.285, HEAD.cy - 0.12, -0.02, 0, s * 0.3, 0), col: (p, n) => skin.clone().multiplyScalar(0.94 * ao(n, 0.2)) });
  items.push({ g: ell(0.018, 0.012, 0.012, 8), m: faceM(0, -0.27, 1, -0.004), col: skin.clone().multiplyScalar(0.93) }); // button nose
  if (L.mouth === 'open') {
    items.push({ g: ell(0.035, 0.03, 0.01, 12), m: faceM(0, -0.45, 0.9, -0.004), col: (p) => (p.y < -0.008 ? C('#ff8a9a') : lip) });
  } else if (L.mouth === 'cat') {
    for (const s of [-1, 1]) items.push({ g: new THREE.TorusGeometry(0.018, 0.0045, 5, 10, Math.PI), m: faceM(0, -0.43, 0.9, 0).multiply(M4(s * 0.018, 0, 0, 0, 0, Math.PI)), col: lip });
  } else {
    items.push({ g: new THREE.TorusGeometry(0.028, 0.005, 5, 12, Math.PI * 0.8), m: faceM(0, -0.4, 0.9, 0).multiply(M4(0, 0.012, 0, 0, 0, Math.PI * 1.1)), col: lip });
  }
  return mergeRigid(items);
}

/** Beanie (knit cap, folded cuff, pom on its own group so it can spring). */
function hatParts(hat) {
  const c = C(hat.color || '#fff4e6'), cuff = C(hat.cuff || hat.color || '#fff4e6'), pom = C(hat.pom || '#ffffff');
  const knit = (p) => c.clone().multiplyScalar(Math.sin(Math.atan2(p.x, p.z) * 11) > 0 ? 1 : 0.87);
  const cap = mergeRigid([
    { g: deform(new THREE.SphereGeometry(1, 36, 18, 0, Math.PI * 2, 0, Math.PI * 0.52), (p) => headShape(p.clone().normalize()).sub(new THREE.Vector3(0, HEAD.cy, 0)).multiplyScalar(1.12)), m: M4(0, HEAD.cy + 0.04, -0.01, -0.22), col: knit },
    { g: deform(new THREE.TorusGeometry(1, 0.2, 10, 36), (p) => new THREE.Vector3(p.x * HEAD.rx * 1.04, p.y * 0.3, p.z * HEAD.rz * 1.06)), m: M4(0, HEAD.cy + 0.02, -0.01, Math.PI / 2 - 0.22), col: (p) => cuff.clone().multiplyScalar(Math.sin(Math.atan2(p.x, p.y) * 24) > 0 ? 0.98 : 0.88) },
  ]);
  const pomG = mergeRigid([{ g: deform(new THREE.IcosahedronGeometry(0.1, 3), (p) => p.clone().multiplyScalar(1 + 0.08 * Math.sin(p.x * 90) * Math.sin(p.y * 80) * Math.sin(p.z * 85))), col: (p, n) => pom.clone().multiplyScalar(0.88 + 0.12 * n.y) }]);
  return { cap, pomG, pomAt: new THREE.Vector3(0, HEAD.cy + HEAD.ry * 1.12 + 0.06, -0.08) };
}

/**
 * Builds a chibi. Returns { group, mesh, skeleton, bones{}, head, eyes, pom, rest, look, stats }.
 * `look` is a partial DEFAULT_LOOK. Pass `extra(c)` slots later via `attach(c, boneName, object)`.
 */
export function buildChibi(look = {}) {
  const L = mergeLook(look), mats = chibiMaterials();
  const group = new THREE.Group();
  const bones = {}, list = [];
  const PR = BUILDS[L.build] || BUILDS.chibi;
  for (const [name, parent, x, y, z] of BONES) { const b = new THREE.Bone(); b.name = name; b.position.set(x, y * PR.body, z); list.push(b); bones[name] = b; if (parent >= 0) list[parent].add(b); }
  bones.armL.rotation.z = ARM_REST; bones.armR.rotation.z = -ARM_REST;
  list[0].updateMatrixWorld(true);
  const bind = list.map((b) => b.matrixWorld.clone());
  const iArm = [6, 7], iHand = [8, 9], iLeg = [10, 11];

  // ---- painted body: skin, top, bottom, shoes, mitts as vertex colours (no textures)
  const skin = C(L.skin), top = L.top && C(L.top.color), bot = L.bottom && C(L.bottom.color), shoe = C(L.shoes), mitt = L.mitts ? C(L.mitts) : skin;
  const seam = (x, at, c) => (Math.abs(x - at) < 0.012 ? c.clone().multiplyScalar(0.84) : c); // a darker stitch line at clothing edges
  const parts = [];
  const torso = deform(lathe(TORSO, 28, 0, 60), (p) => new THREE.Vector3(p.x, p.y, p.z * 0.8 + (p.z > 0 ? 0.03 * Math.exp(-Math.pow((p.y - 0.74) / 0.11, 2)) * (p.z / 0.16) : 0)));
  parts.push(part(torso, 0, (v) => chainW(v.y), (v, n) => {
    const c = v.y > 1.13 ? skin : v.y > 0.63 ? (top ? seam(v.y, 0.63, top) : skin) : (bot || skin);
    return c.clone().multiplyScalar(ao(n));
  }));
  for (let s = 0; s < 2; s++) {
    const sx = s ? -1 : 1;
    const arm = deform(lathe(ARM, 16, 0, 30), (p) => new THREE.Vector3(p.x, p.y, p.z * 0.9));
    parts.push(part(arm, iArm[s], (v) => { const t = sstep(0.05, -0.06, v.y); return [[3, 1 - t], [iArm[s], t]]; }, (v, n) => {
      const t = -v.y / 0.3, c = top && L.top.sleeve > 0 && t < L.top.sleeve ? seam(t, L.top.sleeve, top) : skin;
      return c.clone().multiplyScalar(ao(n, 0.16));
    }));
    // mitten hand: a paddle with a thumb on the body side
    const hand = mergeRigid([
      { g: ell(0.07, 0.082, 0.056, 16), m: M4(0, -0.06, 0.005), col: mitt },
      { g: ell(0.032, 0.044, 0.034, 10), m: M4(-sx * 0.056, -0.04, 0.016, 0, 0, sx * 0.5), col: mitt },
    ]);
    hand.deleteAttribute('color');
    parts.push(part(hand, iHand[s], () => [[iHand[s], 1]], (v, n) => mitt.clone().multiplyScalar(ao(n, 0.18))));
    const leg = mergeRigid([
      { g: deform(lathe(LEG, 18, 0, 46), (p) => new THREE.Vector3(p.x, p.y, p.z * 0.95)), col: C('#fff') },
      { g: ell(0.098, 0.062, 0.14, 16), m: M4(0, -0.54, 0.035), col: C('#fff') }, // rounded foot
    ]);
    leg.deleteAttribute('color');
    parts.push(part(leg, iLeg[s], (v) => { const t = sstep(0.05, -0.06, v.y); return [[1, 1 - t], [iLeg[s], t]]; }, (v, n) => {
      const t = -v.y / 0.6;
      const c = v.y < -0.47 ? seam(v.y, -0.47, C(L.shoes)) : bot && t < L.bottom.length ? seam(t, L.bottom.length, bot) : skin;
      return c.clone().multiplyScalar(ao(n));
    }));
  }
  const geo = mergeSkinned(parts, bind, PR.body);
  const mesh = new THREE.SkinnedMesh(geo, mats.body); mesh.castShadow = true; mesh.frustumCulled = false;
  mesh.add(list[0]);
  const skeleton = new THREE.Skeleton(list); mesh.bind(skeleton);
  group.add(mesh);
  const meshes = [mesh];

  // ---- coat layer: the torso and arm profiles inflated, quilted, with a collar and cuffs; same skeleton
  if (L.coat) {
    const cc = C(L.coat.color), trim = C(L.coat.trim || '#fff8ef');
    const COAT = [[0, 0.52], [0.225, 0.525], [0.245, 0.57], [0.24, 0.65], [0.228, 0.75], [0.214, 0.85], [0.206, 0.94], [0.205, 1.0], [0.192, 1.045], [0.16, 1.085], [0.115, 1.115], [0, 1.125]];
    const puff = (y) => (L.coat.quilt === false ? 0 : 0.013 * Math.pow(Math.abs(Math.sin((y - 0.53) * Math.PI * 7)), 0.5)); // stitched channels bulge out
    const coat = deform(lathe(COAT, 32, 0, 90), (p) => { const r = Math.hypot(p.x, p.z), k = r > 1e-4 ? (r + puff(p.y) * sstep(0.02, 0.12, r)) / r : 1; return new THREE.Vector3(p.x * k, p.y, p.z * k * 0.84 + (p.z > 0 ? 0.03 * Math.exp(-Math.pow((p.y - 0.74) / 0.11, 2)) * (p.z / 0.2) : 0)); });
    const quilt = (y, c) => (L.coat.quilt === false ? c : c.clone().multiplyScalar(0.84 + 0.16 * Math.pow(Math.abs(Math.sin((y - 0.53) * Math.PI * 7)), 0.4)));
    const cparts = [part(coat, 0, (v) => chainW(v.y), (v, n) => {
      return (v.y < 0.54 ? cc.clone().multiplyScalar(0.85) : quilt(v.y, cc)).multiplyScalar(ao(n));
    })];
    const front = (y) => { let r = 0; for (let i = 0; i < COAT.length - 1; i++) if (y >= COAT[i][1] && y <= COAT[i + 1][1]) r = COAT[i][0] + (COAT[i + 1][0] - COAT[i][0]) * (y - COAT[i][1]) / (COAT[i + 1][1] - COAT[i][1]); return r * 0.84 + 0.03 * Math.exp(-Math.pow((y - 0.74) / 0.11, 2)); };
    const zip = deform(new THREE.BoxGeometry(0.028, 1, 0.012, 1, 40, 1), (p) => new THREE.Vector3(p.x, 0.56 + (p.y + 0.5) * 0.52, p.z + front(0.56 + (p.y + 0.5) * 0.52) + 0.012));
    cparts.push(part(zip, 0, (v) => chainW(v.y), (v, n) => trim.clone().multiplyScalar(ao(n, 0.1) * (Math.abs(((v.y * 60) % 1) - 0.5) < 0.2 ? 0.86 : 1)))); // zip with teeth
    cparts.push(part(deform(new THREE.TorusGeometry(0.1, 0.042, 10, 28), (p) => new THREE.Vector3(p.x, p.y, p.z * 0.95)).rotateX(Math.PI / 2).translate(0, 1.125, 0.004), 0, (v) => chainW(v.y), (v, n) => trim.clone().multiplyScalar(ao(n, 0.15) * (0.94 + 0.06 * Math.sin(Math.atan2(v.x, v.z) * 30))))); // fluffy collar
    for (let s = 0; s < 2; s++) {
      const sl = deform(lathe([[0, -0.27], [0.066, -0.27], [0.076, -0.25], [0.082, -0.14], [0.09, -0.04], [0.088, 0.02], [0.064, 0.062], [0, 0.075]], 18, 0, 50), (p) => { const r = Math.hypot(p.x, p.z), k = r > 1e-4 ? (r + 0.7 * puff(p.y * 0.8 + 0.53) * sstep(0.02, 0.06, r)) / r : 1; return new THREE.Vector3(p.x * k, p.y, p.z * k); });
      cparts.push(part(sl, iArm[s], (v) => { const t = sstep(0.05, -0.06, v.y); return [[3, 1 - t], [iArm[s], t]]; }, (v, n) => quilt(v.y * 0.8, cc).multiplyScalar(ao(n, 0.16))));
      cparts.push(part(new THREE.TorusGeometry(0.062, 0.022, 8, 18).rotateX(Math.PI / 2).translate(0, -0.265, 0), iArm[s], () => [[iArm[s], 1]], (v, n) => trim.clone().multiplyScalar(ao(n, 0.15)))); // cuff
    }
    const cm = new THREE.SkinnedMesh(mergeSkinned(cparts, bind, PR.body), mats.body); cm.castShadow = true; cm.frustumCulled = false;
    cm.bind(skeleton, mesh.bindMatrix); group.add(cm); meshes.push(cm);
  }

  // ---- rigid head parts on the head bone
  const head = new THREE.Mesh(headGeo(L), mats.body); head.castShadow = true; bones.head.add(head); meshes.push(head);
  const eyeY = onHead(0.37, -0.13, 0.92).p.y;
  const eyes = new THREE.Mesh(eyeGeo(L.eyes, eyeY), mats.eye); eyes.position.y = eyeY; bones.head.add(eyes); meshes.push(eyes);
  const hg = L.hair.style !== 'none' && hairGeo(L.hair.style, L.hair.color);
  if (hg) { const h = new THREE.Mesh(hg, mats.hair); h.castShadow = true; bones.head.add(h); meshes.push(h); }
  let pom = null;
  if (L.hat && L.hat.style === 'beanie') {
    const hp = hatParts(L.hat), cap = new THREE.Mesh(hp.cap, mats.body); cap.castShadow = true; bones.head.add(cap); meshes.push(cap);
    pom = new THREE.Group(); pom.position.copy(hp.pomAt); bones.head.add(pom);
    const pm = new THREE.Mesh(hp.pomG, mats.body); pm.castShadow = true; pom.add(pm); meshes.push(pm);
  }
  // bigger head and mittens: scaled on their bones after binding, so the face, hair and hat all follow
  bones.head.scale.setScalar(PR.head); bones.handL.scale.setScalar(PR.hand); bones.handR.scale.setScalar(PR.hand);
  const tris = meshes.reduce((a, m) => a + m.geometry.index.count / 3, 0);
  const rest = {}; for (const b of list) rest[b.name] = { p: b.position.clone(), r: b.rotation.clone() };
  return { group, mesh, skeleton, bones, head, eyes, pom, rest, look: L, pomV: 0, pomY: 0, stats: { draws: meshes.length, tris, bones: list.length } };
}

/** Attaches a prop (any Object3D) to a bone, e.g. a camera to 'chest' or a wand to 'handR'. */
export function attach(c, bone, obj) { c.bones[bone].add(obj); return obj; }

/**
 * Procedural animation. s = { walk 0..1, wave 0..1, look -1..1 (head turn), blink true }. Idle breathing and sway
 * always run; walk and wave blend on top. Call once per frame.
 */
export function animateChibi(c, t, dt, s = {}) {
  const B = c.bones, R = c.rest, walk = s.walk || 0, wave = s.wave || 0;
  for (const k in B) { B[k].position.copy(R[k].p); B[k].rotation.copy(R[k].r); }
  const ph = t * 9, sw = Math.sin(ph) * walk;
  // idle: breathe, sway, a soft head tilt
  B.hips.position.y += Math.sin(t * 2.2) * 0.006 + Math.abs(Math.sin(ph)) * 0.045 * walk;
  B.hips.rotation.z = Math.sin(t * 1.3) * 0.025 * (1 - walk); B.hips.rotation.y = sw * 0.12;
  B.spine.rotation.x = 0.06 * walk; B.chest.rotation.y = -sw * 0.16; B.chest.rotation.x = Math.sin(t * 2.2) * 0.015;
  B.head.rotation.z = Math.sin(t * 1.3 + 0.6) * 0.05 * (1 - walk) - wave * 0.12; B.head.rotation.y = (s.look || 0) * 0.6; B.head.rotation.x = -0.04 * walk;
  // walk: legs and arms swing opposite, the body bobs
  B.legL.rotation.x = sw * 0.75; B.legR.rotation.x = -sw * 0.75;
  B.armL.rotation.x = -sw * 0.7; B.armR.rotation.x = sw * 0.7 * (1 - wave);
  B.armL.rotation.z = ARM_REST + 0.05 * Math.sin(t * 2.2); B.armR.rotation.z = -ARM_REST - 0.05 * Math.sin(t * 2.2);
  // wave: right arm up and out, the hand waggles
  if (wave > 0) {
    B.armR.rotation.z = -(ARM_REST + (2.3 - ARM_REST) * wave) + Math.sin(t * 9) * 0.14 * wave;
    B.handR.rotation.z = Math.sin(t * 14) * 0.45 * wave; B.armR.rotation.x = 0.45 * wave; // forward, so the hand waves in front of the hair
  }
  // blink every few seconds
  const bp = (t + (c.blinkOff || 0)) % 3.6;
  c.eyes.scale.y = s.blink === false ? 1 : bp < 0.16 ? Math.max(0.08, Math.abs(bp - 0.08) / 0.08) : 1;
  // pom-pom on a spring
  if (c.pom) {
    const target = -(B.hips.position.y - R.hips.p.y) * 3;
    c.pomV += ((target - c.pomY) * 120 - c.pomV * 9) * Math.min(dt, 0.05); c.pomY += c.pomV * Math.min(dt, 0.05);
    c.pom.rotation.x = c.pomY * 0.25; c.pom.position.y = c.rest.pomY ?? (c.rest.pomY = c.pom.position.y); c.pom.position.y += c.pomY * 0.02;
  }
}
