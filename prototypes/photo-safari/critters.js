// PROTOTYPE - NOT FOR PRODUCTION
// The critter kit: every animal is built in code from rounded parts with vertex colours (belly
// gradient, baked occlusion, spots), merged per moving part so one animal is a handful of draw calls.
// Animals face +z in their own frame. THREE is read from the global only inside functions (never at import).

const C = (hex) => new THREE.Color(hex); // sRGB hex -> linear working colour
const mixC = (a, b, t) => a.clone().lerp(b, Math.max(0, Math.min(1, t)));

/** Merges indexed geometries into one with position, normal and color. items = [{ g, m (Matrix4), col (fn(n, p) -> Color) }] */
export function merge(items) {
  let nv = 0, ni = 0;
  for (const it of items) { nv += it.g.attributes.position.count; ni += it.g.index ? it.g.index.count : it.g.attributes.position.count; }
  const pos = new Float32Array(nv * 3), nor = new Float32Array(nv * 3), col = new Float32Array(nv * 3), idx = new Uint32Array(ni);
  let vo = 0, io = 0;
  const v = new THREE.Vector3(), n = new THREE.Vector3(), nm = new THREE.Matrix3();
  for (const it of items) {
    const g = it.g, P = g.attributes.position, N = g.attributes.normal; nm.getNormalMatrix(it.m);
    for (let i = 0; i < P.count; i++) {
      v.fromBufferAttribute(P, i).applyMatrix4(it.m); n.fromBufferAttribute(N, i).applyMatrix3(nm).normalize();
      pos.set([v.x, v.y, v.z], (vo + i) * 3); nor.set([n.x, n.y, n.z], (vo + i) * 3);
      const c = typeof it.col === 'function' ? it.col(n, v) : it.col; col.set([c.r, c.g, c.b], (vo + i) * 3);
    }
    if (g.index) for (let i = 0; i < g.index.count; i++) idx[io + i] = g.index.getX(i) + vo; else for (let i = 0; i < P.count; i++) idx[io + i] = i + vo;
    vo += P.count; io += g.index ? g.index.count : P.count;
    g.dispose();
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3)); out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  out.setAttribute('color', new THREE.BufferAttribute(col, 3)); out.setIndex(new THREE.BufferAttribute(idx, 1));
  out.computeBoundingSphere();
  return out;
}

const M4 = (x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1, rx = 0, ry = 0, rz = 0) => new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(sx, sy, sz));
const sph = (seg = 18) => new THREE.SphereGeometry(1, seg, Math.round(seg * 0.75));
const cone = (seg = 12) => new THREE.ConeGeometry(1, 1, seg, 1);
const cyl = (seg = 10) => new THREE.CylinderGeometry(1, 1, 1, seg, 1);

/** Fur colouring: belly colour underneath and in front, darker toward the ground (baked occlusion), optional spots. */
function fur(main, belly, opt = {}) {
  const M = C(main), B = C(belly), A = opt.spots ? C(opt.accent) : null;
  return (n, p) => {
    let c = mixC(M, B, (-n.y * 0.9 + (opt.front ? n.z * 0.6 : 0) - 0.15) * 1.6);
    if (A && Math.sin(p.x * 23) * Math.sin(p.y * 19 + p.z * 7) * Math.sin(p.z * 17) > 0.32) c = mixC(c, A, 0.75);
    const ao = 0.82 + 0.18 * Math.max(0, Math.min(1, n.y * 0.5 + 0.7));
    return c.multiplyScalar(ao);
  };
}

/**
 * Shared materials: soft fur with a rim light that reads as fluff (lighter on the back, cooler underneath), glossy eyes,
 * an emissive variant for rare visitors. `night` (0..1) adds a moonlit edge so animals read against the night snow.
 */
export function critterMaterials() {
  const night = { value: 0 }, lamp = { value: new THREE.Vector4() };
  const rim = (mat, strength, glow = 0, quilt = 0) => {
    mat.onBeforeCompile = (sh) => {
      sh.uniforms.uRim = { value: strength }; sh.uniforms.uGlow = { value: glow }; sh.uniforms.uNight = night; sh.uniforms.uLamp = lamp; sh.uniforms.uQuilt = { value: quilt };
      // object-space position: fur strands (short cells stretched along y) or, with uQuilt, the parka's stitched channels
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vLp;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvLp = position;');
      // pale fur gets a cool blue-grey edge so white animals keep their outline on snow; the rim light stays soft on
      // them, and the glow of a rare visitor is a warm gold edge instead of a white blow-out
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform float uRim; uniform float uGlow; uniform float uNight; uniform vec4 uLamp; uniform float uQuilt; varying vec3 vLp;')
        .replace('#include <color_fragment>', '#include <color_fragment>\nfloat fr0 = pow(1.0 - saturate(dot(normalize(vNormal), normalize(vViewPosition))), 1.8);\nfloat pale = smoothstep(0.62, 0.9, dot(diffuseColor.rgb, vec3(0.333)));\ndiffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(0.5, 0.62, 0.84), fr0 * pale * 0.85);\nfloat upF = dot(normalize(vNormal), normalize((viewMatrix * vec4(0.0, 1.0, 0.0, 0.0)).xyz));\ndiffuseColor.rgb *= mix(vec3(0.8, 0.84, 0.94), vec3(1.04, 1.02, 0.98), smoothstep(-0.7, 0.8, upF));\nfloat fn = fract(sin(dot(floor(vLp * vec3(46.0, 17.0, 46.0)), vec3(12.9898, 78.233, 37.719))) * 43758.5453);\nfloat qc = abs(fract(vLp.y * 10.0) - 0.5) * 2.0;\ndiffuseColor.rgb *= mix(vec3(1.0), mix(vec3(0.6, 0.66, 0.84), vec3(1.08, 1.06, 1.04), smoothstep(-0.5, 0.9, upF)), uNight * 0.8);\ndiffuseColor.rgb *= mix(0.9 + (0.16 + 0.14 * uNight) * fn, mix(0.74, 1.05, smoothstep(0.0, 0.4, qc)), uQuilt);')
        .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\nfloat fr = pow(1.0 - saturate(dot(normalize(vNormal), normalize(vViewPosition))), 2.6);\ntotalEmissiveRadiance += diffuseColor.rgb * fr * uRim * (1.0 - 0.75 * pale) + vec3(0.6, 0.76, 1.0) * fr * uNight * 1.15 + diffuseColor.rgb * vec3(1.0, 0.62, 0.3) * uLamp.w * 0.1 * pow(1.0 - clamp(length(-vViewPosition - (viewMatrix * vec4(uLamp.xyz + vec3(0.0, 1.0, 0.0), 1.0)).xyz) / 14.0, 0.0, 1.0), 2.0) + mix(diffuseColor.rgb, vec3(1.0, 0.8, 0.42), 0.5) * uGlow * (0.15 + fr * 0.9);');
      mat.userData.sh = sh;
    };
    return mat;
  };
  const fur = rim(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.88, metalness: 0 }), 0.55);
  const glow = rim(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6, metalness: 0 }), 1.2, 0.9);
  const eye = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.12, metalness: 0 });
  const mouth = new THREE.MeshStandardMaterial({ color: 0x8a2c3a, roughness: 0.7 });
  return { fur, glow, eye, mouth, night, lamp, make: rim };
}

/** Eyes (dark, glossy, two catchlights), merged into one mesh. Positioned on a head of radius r at the front. */
function eyes(r, spread = 0.42, up = 0.12, size = 0.2, color = '#1b1420') {
  const items = [];
  for (const s of [-1, 1]) {
    const x = s * r * spread, y = r * up, z = r * 0.86;
    items.push({ g: sph(12), m: M4(x, y, z, r * size, r * size * 1.1, r * size * 0.6), col: C(color) });
    items.push({ g: sph(8), m: M4(x + r * size * 0.35, y + r * size * 0.4, z + r * size * 0.5, r * size * 0.3, r * size * 0.3, r * size * 0.15), col: C('#ffffff') });
    items.push({ g: sph(6), m: M4(x - r * size * 0.3, y - r * size * 0.35, z + r * size * 0.55, r * size * 0.14, r * size * 0.14, r * size * 0.08), col: C('#ffffff') });
  }
  return merge(items);
}

/**
 * Builds one animal from its species entry. Returns
 * { group, body, head, eyes, mouth, tail, legs[], wings[], radius, height, headY, type }.
 * The group's origin is on the ground under the animal.
 */
export function buildCritter(sp, mats, look = sp) {
  const s = sp.scale || 1, [bw, bh, bl] = sp.body, hr = sp.head;
  const main = look.main, belly = look.belly, acc = look.accent;
  const mat = look.glow ? mats.glow : mats.fur;
  const furC = fur(main, belly, { spots: sp.spots, accent: acc, front: sp.type === 'biped' || sp.type === 'bird' });
  const group = new THREE.Group(), inner = new THREE.Group(); group.add(inner); inner.scale.setScalar(s);
  const parts = { group, inner, legs: [], wings: [], type: sp.type };
  const add = (geo, m = mat, parent = inner) => { const me = new THREE.Mesh(geo, m); me.castShadow = true; parent.add(me); return me; };
  const pivot = (x, y, z, parent = inner) => { const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); return g; };
  const upright = sp.type === 'biped' || sp.type === 'bird';
  const legLen = sp.type === 'quad' ? bh * 0.75 : upright ? 0.12 : 0;
  const bodyY = sp.type === 'quad' ? legLen + bh * 0.72 : upright ? bh + 0.04 : bh * 0.8;

  // body
  const bodyItems = [{ g: sph(20), m: M4(0, 0, 0, bw, bh, bl), col: furC }];
  if (sp.type === 'quad') bodyItems.push({ g: sph(14), m: M4(0, bh * 0.25, bl * 0.55, bw * 0.75, bh * 0.75, bl * 0.45), col: furC }); // chest
  if (sp.type === 'seal' || sp.type === 'whale') bodyItems.push({ g: sph(14), m: M4(0, -bh * 0.1, -bl * 0.75, bw * 0.6, bh * 0.55, bl * 0.5), col: furC });
  parts.body = add(merge(bodyItems)); parts.body.position.y = bodyY;
  parts.bodyY = bodyY;

  // head pivot: on top for upright animals, at the front for the rest
  const headY = upright ? bodyY + bh * 0.95 + hr * 0.55 : sp.type === 'quad' ? bodyY + bh * 0.55 + hr * 0.35 : bodyY + bh * 0.25;
  const headZ = upright ? bw * 0.08 : sp.type === 'quad' ? bl * 0.88 : bl * 0.95;
  const hp = pivot(0, headY, headZ); parts.head = hp; parts.headY = headY;
  const headItems = [{ g: sph(20), m: M4(0, 0, 0, hr, hr * 0.95, hr * 0.98), col: furC }];
  // snout or beak
  if (upright) {
    headItems.push({ g: cone(10), m: M4(0, -hr * 0.12, hr * 0.98, hr * 0.2, Math.max(0.06, sp.snout) * 1.4, hr * 0.2, Math.PI / 2), col: C(acc) });
  } else {
    headItems.push({ g: sph(14), m: M4(0, -hr * 0.22, hr * 0.62 + sp.snout * 0.5, hr * 0.5, hr * 0.42, hr * 0.32 + sp.snout), col: mixC(C(belly), C(main), 0.25) });
    headItems.push({ g: sph(10), m: M4(0, -hr * 0.05, hr * 0.92 + sp.snout * 1.4, hr * 0.17, hr * 0.13, hr * 0.12), col: C('#2b1e22') });
  }
  // cheeks
  for (const sx of [-1, 1]) headItems.push({ g: sph(8), m: M4(sx * hr * 0.58, -hr * 0.22, hr * 0.68, hr * 0.17, hr * 0.11, hr * 0.06), col: C('#ff9aa8') });
  // ears
  const earC = (n, p) => mixC(C(main), C(acc), p.y > headY * 0 + hr * 1.15 ? 0.8 : 0);
  for (const sx of [-1, 1]) {
    if (sp.ears === 'fox') headItems.push({ g: cone(8), m: M4(sx * hr * 0.55, hr * 0.95, -hr * 0.05, hr * 0.32, hr * 0.7, hr * 0.18, 0, 0, -sx * 0.35), col: earC });
    else if (sp.ears === 'long') headItems.push({ g: sph(12), m: M4(sx * hr * 0.32, hr * 1.45, -hr * 0.1, hr * 0.2, hr * 0.85, hr * 0.12, -0.15, 0, -sx * 0.18), col: (n, p) => mixC(C(main), C(acc), n.z > 0.4 ? 0.8 : 0) });
    else if (sp.ears === 'round') headItems.push({ g: sph(10), m: M4(sx * hr * 0.62, hr * 0.78, -hr * 0.1, hr * 0.26, hr * 0.26, hr * 0.12), col: mixC(C(main), C(acc), 0.25) });
    else if (sp.ears === 'tuft') headItems.push({ g: cone(6), m: M4(sx * hr * 0.6, hr * 0.92, 0, hr * 0.18, hr * 0.5, hr * 0.12, 0, 0, -sx * 0.25), col: mixC(C(main), C(acc), 0.4) });
    else if (sp.ears === 'tiny') headItems.push({ g: sph(8), m: M4(sx * hr * 0.6, hr * 0.7, -hr * 0.2, hr * 0.14, hr * 0.14, hr * 0.08), col: C(main) });
  }
  if (sp.antler) for (const sx of [-1, 1]) {
    const big = sp.antler > 1, ac = C(big ? '#c8a878' : '#d8b888');
    headItems.push({ g: cyl(6), m: M4(sx * hr * 0.4, hr * 1.25, -hr * 0.1, hr * 0.07, hr * 0.9, hr * 0.07, 0, 0, -sx * 0.4), col: ac });
    if (big) headItems.push({ g: sph(10), m: M4(sx * hr * 1.0, hr * 1.55, -hr * 0.1, hr * 0.55, hr * 0.12, hr * 0.38, 0, 0, -sx * 0.2), col: ac });
    else for (const k of [0.6, 1.0]) headItems.push({ g: cyl(6), m: M4(sx * hr * (0.4 + k * 0.5), hr * (1.1 + k * 0.6), -hr * 0.1, hr * 0.05, hr * 0.45, hr * 0.05, 0, 0, -sx * 1.1), col: ac });
  }
  if (sp.horns) for (const sx of [-1, 1]) headItems.push({ g: cone(8), m: M4(sx * hr * 0.32, hr * 1.0, -hr * 0.2, hr * 0.12, hr * 0.5, hr * 0.12, -0.5, 0, -sx * 0.15), col: C('#8a7a6a') });
  if (sp.tusk) for (const sx of [-1, 1]) headItems.push({ g: cone(8), m: M4(sx * hr * 0.2, -hr * 0.7, hr * 0.8, hr * 0.07, hr * 0.6, hr * 0.07, Math.PI, 0, 0), col: C('#fff8ef') });
  if (sp.id === 'owl' || sp.id === 'moonowl') for (const sx of [-1, 1]) headItems.push({ g: sph(12), m: M4(sx * hr * 0.4, hr * 0.12, hr * 0.7, hr * 0.38, hr * 0.38, hr * 0.2), col: C('#ffffff') });
  const headMesh = add(merge(headItems), mat, hp); parts.headMesh = headMesh;
  const eyeSize = sp.id === 'owl' ? 0.28 : 0.2;
  parts.eyes = add(eyes(hr, sp.id === 'owl' ? 0.42 : 0.4, 0.12, eyeSize, sp.id === 'owl' ? '#3a2410' : '#1b1420'), mats.eye, hp);
  if (sp.id === 'owl') parts.eyes.material = mats.eye;
  // mouth (shown only for yawns, sneezes and howls)
  const mouth = new THREE.Mesh(merge([{ g: sph(10), m: M4(0, -hr * 0.42, hr * 0.78 + sp.snout * 0.6, hr * 0.22, hr * 0.16, hr * 0.12), col: C('#ffffff') }]), mats.mouth);
  mouth.visible = false; hp.add(mouth); parts.mouth = mouth;

  // tail
  if (sp.tail !== 'none') {
    const tz = upright ? -bw * 0.85 : -bl * 0.95, ty = upright ? bodyY - bh * 0.6 : bodyY + bh * 0.1;
    const tp = pivot(0, ty, tz); parts.tail = tp;
    let items;
    if (sp.tail === 'bushy') items = [{ g: sph(14), m: M4(0, bh * 0.45, -bl * 0.45, bw * 0.45, bh * 0.55, bl * 0.55, -0.7), col: (n, p) => mixC(C(main), C('#ffffff'), p.z < -bl * 0.75 ? 1 : 0) }];
    else if (sp.tail === 'puff') items = [{ g: sph(10), m: M4(0, 0.02, -0.04, bw * 0.32, bw * 0.32, bw * 0.3), col: C(belly) }];
    else if (sp.tail === 'long') items = [{ g: sph(10), m: M4(0, bh * 0.15, -bl * 0.55, bw * 0.16, bw * 0.16, bl * 0.65, -0.35), col: (n, p) => mixC(C(main), C(acc), p.z < -bl ? 1 : 0) }];
    else if (sp.tail === 'flat') items = [{ g: sph(12), m: M4(0, -bh * 0.3, -bl * 0.35, bw * 0.7, bh * 0.12, bl * 0.32), col: sp.type === 'quad' ? C('#5a3a24') : furC }];
    else items = [{ g: cone(8), m: M4(0, 0, -0.1, bw * 0.5, 0.35, 0.08, -Math.PI / 2), col: C(main) }];
    add(merge(items), mat, tp);
  }

  // legs, flippers, wings
  if (sp.type === 'quad') {
    const lw = Math.min(bw, bl) * 0.32;
    for (const [lx, lz] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) {
      const lp = pivot(lx * bw * 0.55, legLen + 0.05, lz * bl * 0.55);
      add(merge([{ g: cyl(8), m: M4(0, -legLen * 0.5, 0, lw, legLen, lw), col: furC }, { g: sph(10), m: M4(0, -legLen, lw * 0.25, lw * 1.15, lw * 0.7, lw * 1.35), col: mixC(C(main), C(acc), sp.id === 'fox' ? 0.8 : 0.15) }]), mat, lp);
      parts.legs.push(lp);
    }
  } else if (upright) {
    for (const sx of [-1, 1]) {
      const fp = pivot(sx * bw * 0.4, 0.06, bw * 0.15);
      add(merge([{ g: sph(10), m: M4(0, 0, 0.08, bw * 0.28, 0.06, bw * 0.4), col: C(sp.type === 'biped' ? acc : '#ffcf3a') }]), mat, fp);
      parts.legs.push(fp);
      const wp = pivot(sx * bw * 0.92, bodyY + bh * 0.25, 0);
      const wl = sp.type === 'bird' ? 1.35 : 0.8;
      add(merge([{ g: sph(12), m: M4(sx * bw * 0.1, -bh * 0.35 * wl, 0, bw * 0.18 * wl, bh * 0.62 * wl, bw * 0.55, 0, 0, sx * 0.15), col: (n, p) => mixC(C(main), C(acc), sp.id === 'moth' || sp.id === 'tern' ? (p.y < bodyY - bh * 0.2 ? 0.7 : 0) : 0) }]), mat, wp);
      parts.wings.push(wp);
    }
  } else if (sp.type === 'seal') {
    for (const sx of [-1, 1]) {
      const fp = pivot(sx * bw * 0.85, bodyY - bh * 0.5, bl * 0.35);
      add(merge([{ g: sph(10), m: M4(sx * bw * 0.25, 0, 0.05, bw * 0.45, 0.07, bw * 0.3, 0, sx * 0.4), col: mixC(C(main), C(acc), 0.3) }]), mat, fp);
      parts.wings.push(fp);
    }
  }
  if (sp.type === 'whale') { headMesh.scale.set(1.1, 0.95, 1.0); }

  parts.radius = Math.max(bw, bh, bl * 0.8, hr * 1.2) * s * 1.05;
  parts.height = (headY + hr) * s;
  parts.centerY = (bodyY + hr * 0.4) * s;
  return parts;
}

/**
 * Per-frame animation of an animal. st = { t (s), walk (0..1 speed), pose (name or null), p (0..1 pose progress),
 * blink (0..1), look (yaw of the head, rad), hide (0..1 sunk into the snow), tilt (0..1 curious head tilt),
 * idle (null or { k: 'sniff'|'shake'|'scan'|'flick'|'play', p: 0..1 }: a small idle between poses) }.
 */
export function animateCritter(a, sp, st) {
  const { t, walk = 0, p = 0 } = st, pose = st.pose;
  const inn = a.inner, b = a.body, h = a.head;
  const breath = Math.sin(t * 2.4 + a.phase) * 0.025;
  inn.position.set(0, 0, 0); inn.rotation.set(0, 0, 0);
  b.scale.set(1 - breath * 0.4, 1 + breath, 1); b.rotation.set(0, 0, 0); b.position.y = a.bodyY;
  h.rotation.set(Math.sin(t * 0.9 + a.phase) * 0.06, st.look || 0, Math.sin(t * 0.7 + a.phase) * 0.05);
  const bounce = walk > 0.05 ? Math.abs(Math.sin(t * 9)) * 0.08 * walk : 0;
  inn.position.y = bounce;
  a.legs.forEach((l, i) => { l.rotation.set(walk > 0.05 ? Math.sin(t * 9 + (i % 2 ? Math.PI : 0) + (i > 1 ? Math.PI : 0)) * 0.7 * walk : 0, 0, 0); });
  a.wings.forEach((w, i) => { w.rotation.set(0, 0, (i ? -1 : 1) * (0.1 + Math.sin(t * 3 + a.phase) * 0.05)); });
  if (a.tail) a.tail.rotation.set(Math.sin(t * 1.3) * 0.08, Math.sin(t * 3.1 + a.phase) * (0.25 + walk * 0.3), 0);
  a.eyes.scale.y = st.blink > 0 ? 0.12 : 1;
  a.mouth.visible = false;
  if (st.tilt) h.rotation.z += st.tilt * 0.32 * (a.phase > 3 ? 1 : -1);
  if (st.idle && !pose) { const q = st.idle.p, u = Math.sin(Math.PI * q);
    if (st.idle.k === 'sniff') { h.rotation.x += 0.5 * u + Math.sin(q * 60) * 0.04 * u; b.scale.z *= 1 + 0.04 * u; }
    else if (st.idle.k === 'shake') { inn.rotation.z = Math.sin(q * 45) * 0.22 * u; h.rotation.z += Math.sin(q * 45 + 1) * 0.3 * u; }
    else if (st.idle.k === 'scan') h.rotation.y += Math.sin(q * Math.PI * 2) * 0.9;
    else if (st.idle.k === 'flick') { h.rotation.z += Math.sin(q * Math.PI * 6) * 0.1 * u; h.rotation.x += Math.sin(q * Math.PI * 6 + 1) * 0.05 * u; } // a quick twitch of the head and ears
    else if (st.idle.k === 'play') { inn.position.y = Math.abs(Math.sin(q * Math.PI * 4)) * 0.28 * u; b.scale.y *= 1 + Math.sin(q * Math.PI * 8) * 0.05 * u; h.rotation.x += Math.sin(q * Math.PI * 8) * 0.15 * u; if (a.tail) a.tail.rotation.y += Math.sin(q * 40) * 0.5 * u; } }
  const up = Math.sin(Math.PI * p);
  switch (pose) {
    case 'yawn': h.rotation.x = -0.55 * up; a.mouth.visible = p > 0.15 && p < 0.85; a.mouth.scale.setScalar(0.4 + up); b.scale.y *= 1 + 0.08 * up; a.eyes.scale.y = up > 0.4 ? 0.15 : 1; break;
    case 'hop': inn.position.y = up * 0.9; b.scale.y *= p < 0.12 ? 0.85 : 1 + up * 0.1; a.legs.forEach((l, i) => { l.rotation.x = (i < 2 ? -1 : 1) * up * 0.8; }); if (a.tail) a.tail.rotation.x = -up * 0.6; break;
    case 'slide': { const k = p < 0.15 ? p / 0.15 : p > 0.85 ? (1 - p) / 0.15 : 1; inn.rotation.x = k * 1.35; inn.position.y = k * 0.12; inn.position.z = 0; a.wings.forEach((w, i) => { w.rotation.z = (i ? -1 : 1) * (0.1 + k * 1.2); }); h.rotation.x = -k * 0.9; break; }
    case 'turn': h.rotation.y = Math.sin(p * Math.PI * 2) * 2.6; break;
    case 'spin': inn.rotation.y = p * Math.PI * 2; inn.position.y = up * 0.25; break;
    case 'peek': inn.position.y = -(1 - Math.abs(p * 2 - 1)) * 0; h.rotation.y = Math.sin(p * Math.PI * 4) * 0.7; inn.position.y = up * 0.25; b.scale.y *= 1 + up * 0.2; break;
    case 'stretch': b.scale.z = 1 + up * 0.28; b.scale.y *= 1 - up * 0.15; h.rotation.x = up * 0.35; a.legs[0] && (a.legs[0].rotation.x = -up * 0.9); a.legs[1] && (a.legs[1].rotation.x = -up * 0.9); inn.rotation.x = up * 0.12; break;
    case 'roll': inn.rotation.z = p * Math.PI * 2; inn.position.y = up * 0.25; break;
    case 'wave': { const w = a.legs[0] || a.wings[0]; if (w) { if (a.legs.length) w.rotation.x = -1.9 * up + Math.sin(p * 30) * 0.3 * up; else w.rotation.z = 1.5 * up + Math.sin(p * 30) * 0.3 * up; } inn.rotation.x = -0.15 * up; break; }
    case 'sneeze': { const k = p < 0.6 ? p / 0.6 : 1 - (p - 0.6) / 0.4; h.rotation.x = p < 0.6 ? -0.35 * k : 0.5 * k; a.mouth.visible = p > 0.5 && p < 0.75; a.eyes.scale.y = p > 0.45 && p < 0.8 ? 0.12 : 1; break; }
    case 'flap': inn.position.y = up * 0.7; a.wings.forEach((w, i) => { w.rotation.z = (i ? -1 : 1) * (0.4 + Math.sin(p * 40) * 0.9 * (0.3 + up)); }); break;
    case 'jump': inn.position.y = -1.4 + up * 3.2; inn.rotation.x = -Math.cos(p * Math.PI) * 0.9; break;
  }
  if (a.type === 'whale' && pose !== 'jump') { inn.position.y = -0.62 + Math.sin(t * 1.6) * 0.06; inn.rotation.x = -0.15; }
  if (st.hide > 0) { inn.position.y -= st.hide * a.height * 0.85; }
}

