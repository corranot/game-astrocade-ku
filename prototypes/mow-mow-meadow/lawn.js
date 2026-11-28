// PROTOTYPE - NOT FOR PRODUCTION
// The lawn: one mask texture per garden (height, cut direction, cut order, grass flag per cell) drives the blades, the
// striped ground under them, the finale blooms and the coverage. THREE is read when a lawn is built, never at import.
import { H } from './logic.js';

const COMMON = `
uniform sampler2D uMask; uniform vec4 uRect; uniform float uTime; uniform vec3 uKart; uniform vec3 uRoot; uniform vec3 uTip; uniform vec3 uLight; uniform vec3 uDark; uniform float uGrow; uniform vec4 uLamp; uniform float uBloom; uniform vec2 uStripe;
vec2 maskUv(vec2 xz) { return (xz - uRect.xy) / uRect.zw; }
float hash21(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
// stripe tone of cut grass: the direction it was mown, crossed with the mower's own lanes so that a single pass already
// shows light and dark bands, and combed into tidy wide stripes by the finale wave (groom)
float stripeTone(float g, vec2 xz, float groom) {
  float lane = smoothstep(0.38, 0.62, abs(fract(xz.x / uStripe.x + 0.25) - 0.5) * 2.0), tidy = smoothstep(0.42, 0.58, abs(fract(xz.x / 2.6) - 0.5) * 2.0);
  return mix(mix(g, lane, uStripe.y), tidy, groom);
}
`;

/** Shared lawn uniforms for one garden. */
function uniforms(THREE, tex, g, ox, oz, pal) {
  const c = (h) => new THREE.Color(h);
  return { uMask: { value: tex }, uRect: { value: new THREE.Vector4(ox, oz, g.w, g.d) }, uTime: { value: 0 }, uKart: { value: new THREE.Vector3(0, 0, -99) },
    uRoot: { value: c(pal[0]) }, uTip: { value: c(pal[1]) }, uLight: { value: c(pal[2]) }, uDark: { value: c(pal[3]) }, uGrow: { value: 1 }, uBloom: { value: -1 },
    uLamp: { value: new THREE.Vector4(0, 0, 0, 0) }, uTall: { value: 1.18 }, uCut: { value: 0.07 }, uWind: { value: new THREE.Vector2(0.09, 1.3) }, uPush: { value: 1.1 }, uStripe: { value: new THREE.Vector2(1.3, 0.4) } };
}

/**
 * Builds the lawn of garden `g` with its north-west corner at world (ox, oz).
 * Returns { group, update(dt, t, kart), dirty(rect), setTier(n), setBloom(v), setGrow(v), setLamp(x, z, on), dispose() }.
 */
export function createLawn(THREE, g, cfg, ox, oz, pal, tier, R, bladeH = 1) {
  const L = cfg.lawn, group = new THREE.Group();
  const tex = new THREE.DataTexture(g.mask, g.cols, g.rows, THREE.RGBAFormat, THREE.UnsignedByteType);
  tex.magFilter = THREE.LinearFilter; tex.minFilter = THREE.LinearFilter; tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping; tex.needsUpdate = true;
  const U = uniforms(THREE, tex, g, ox, oz, pal);
  U.uCut.value = L.cutM; U.uTall.value = (L.extraTallM - L.cutM) * bladeH; // each district's grass stands a little taller or shorter U.uWind.value.set(L.windAmp, L.windSpeed); U.uPush.value = L.pushM; U.uStripe.value.set(L.stripeLaneM, L.stripeK);
  const share = (sh) => { for (const k in U) sh.uniforms[k] = U[k]; };

  // ---- ground: stripes from the cut direction, a dark root colour under tall grass, a darker band at the cut edge
  const groundMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
  groundMat.onBeforeCompile = (sh) => {
    share(sh);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec2 vXZ;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvXZ = (modelMatrix * vec4(position, 1.0)).xz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec2 vXZ;' + COMMON).replace('#include <color_fragment>', `
      vec4 m = texture2D(uMask, maskUv(vXZ));
      float groom = clamp((uBloom - m.b) * 6.0, 0.0, 1.0) * 0.85; // the finale wave combs the lawn into tidy stripes
      float tone = stripeTone(m.g, vXZ, groom), ns = abs(tone * 2.0 - 1.0);
      float n = hash21(floor(vXZ * 22.0)) * 0.5 + hash21(floor(vXZ * 61.0)) * 0.5;
      float streak = mix(hash21(floor(vec2(vXZ.y * 34.0, vXZ.x * 3.0))), hash21(floor(vec2(vXZ.x * 34.0, vXZ.y * 3.0))), ns);
      float fine = mix(hash21(floor(vec2(vXZ.y * 90.0, vXZ.x * 9.0))), hash21(floor(vec2(vXZ.x * 90.0, vXZ.y * 9.0))), ns);
      float sheen = 0.5 + 0.5 * sin(vXZ.x * 0.7 + vXZ.y * 1.1 + uTime * 0.25);
      vec3 cut = mix(uDark, uLight, smoothstep(0.2, 0.8, tone)) * (0.9 + 0.08 * n + 0.07 * streak + 0.08 * fine) * (1.0 + 0.09 * sheen * tone + 0.06 * groom);
      vec3 tall = uRoot * (0.62 + 0.2 * n);
      float h = smoothstep(0.05, 0.45, m.r);
      vec3 col = mix(cut, tall, h);
      col *= 1.0 - 0.22 * h * (1.0 - h) * 4.0;
      vec3 soil = vec3(0.36, 0.27, 0.2) * (0.85 + 0.3 * n);
      col = mix(soil, col, smoothstep(0.3, 0.7, m.a));
      float lamp = uLamp.w * smoothstep(uLamp.z, 0.0, distance(vXZ, uLamp.xy));
      diffuseColor.rgb = col * (1.0 + 0.9 * lamp);`);
  };
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(g.w, g.d), groundMat);
  ground.rotation.x = -Math.PI / 2; ground.position.set(ox + g.w / 2, 0, oz + g.d / 2); ground.receiveShadow = true; group.add(ground);

  // ---- blades: one instanced tapered blade; the vertex shader reads the mask for height, lean and colour
  const blade = new THREE.BufferGeometry();
  blade.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-0.5, 0, 0, 0.5, 0, 0, -0.36, 0.5, 0, 0.36, 0.5, 0, 0, 1, 0]), 3));
  blade.setAttribute('normal', new THREE.BufferAttribute(new Float32Array([0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0]), 3));
  blade.setIndex([0, 1, 2, 2, 1, 3, 2, 3, 4]);
  // blades live in tiles of TILE_M metres, each its own instanced draw, so only the tiles in view are drawn
  const TILE_M = 6, tiles = [], per = L.bladesPerM2[2], tx = Math.ceil(g.w / TILE_M), tz = Math.ceil(g.d / TILE_M);
  for (let j = 0; j < tz; j++) for (let i = 0; i < tx; i++) {
    const x0 = i * TILE_M, z0 = j * TILE_M, w = Math.min(TILE_M, g.w - x0), d = Math.min(TILE_M, g.d - z0), want = Math.round(w * d * per), inst = new Float32Array(want * 4); let n = 0;
    for (let t = 0; t < want; t++) {
      const x = x0 + R() * w, z = z0 + R() * d; if (g.mask[(Math.min(g.rows - 1, Math.floor(z / g.cell)) * g.cols + Math.min(g.cols - 1, Math.floor(x / g.cell))) * 4 + 3] === 0) continue;
      inst[n * 4] = ox + x; inst[n * 4 + 1] = oz + z; inst[n * 4 + 2] = R(); inst[n * 4 + 3] = R(); n++;
    }
    if (!n) continue;
    const geo = new THREE.InstancedBufferGeometry(); geo.index = blade.index; geo.setAttribute('position', blade.getAttribute('position')); geo.setAttribute('normal', blade.getAttribute('normal'));
    geo.setAttribute('aI', new THREE.InstancedBufferAttribute(inst.subarray(0, n * 4), 4));
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(ox + x0 + w / 2, 0.5, oz + z0 + d / 2), Math.hypot(w, d) / 2 + 1.5);
    tiles.push({ geo, n, share: n / want, cx: ox + x0 + w / 2, cz: oz + z0 + d / 2 });
  }
  const allSphere = new THREE.Sphere(new THREE.Vector3(ox + g.w / 2, 0.5, oz + g.d / 2), Math.hypot(g.w, g.d) / 2 + 2);
  const bladeMat = new THREE.MeshLambertMaterial({ color: 0xffffff, side: THREE.DoubleSide });
  bladeMat.onBeforeCompile = (sh) => {
    share(sh);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute vec4 aI; varying vec3 vCol; uniform float uTall; uniform float uCut; uniform vec2 uWind; uniform float uPush; uniform float uBladeW;' + COMMON)
      .replace('#include <beginnormal_vertex>', 'vec3 objectNormal = vec3(0.0, 1.0, 0.0);')
      .replace('#include <begin_vertex>', `
      vec2 base = aI.xy; vec4 m = texture2D(uMask, maskUv(base));
      float r1 = aI.z, r2 = aI.w, y = position.y;
      float tall = m.r * uGrow, isCut = 1.0 - smoothstep(0.02, 0.3, m.r);
      float hgt = (uCut + tall * uTall) * (0.72 + 0.56 * r1) * step(0.5, m.a);
      float wdt = uBladeW * (0.7 + 0.6 * r2) * mix(1.0, 0.55, isCut);
      float yaw = r1 * 6.2831853; vec2 across = vec2(cos(yaw), sin(yaw));
      vec3 transformed = vec3(base.x + across.x * position.x * wdt, y * hgt, base.y + across.y * position.x * wdt);
      float y2 = y * y;
      float w = sin(uTime * uWind.y + base.x * 0.55 + base.y * 0.4 + r2 * 2.0) + 0.5 * sin(uTime * uWind.y * 2.3 + base.x * 1.3 - base.y * 0.8);
      transformed.x += w * uWind.x * hgt * y2; transformed.z += w * uWind.x * 0.5 * hgt * y2;
      vec2 away = base - uKart.xy; float dK = length(away); float push = (1.0 - smoothstep(0.3, uPush, dK)) * uKart.z;
      transformed.xz += normalize(away + 0.0001) * push * 0.55 * hgt * y; transformed.y -= push * 0.3 * hgt * y;
      transformed.z -= (m.g * 2.0 - 1.0) * isCut * 0.05 * y;
      transformed.xz += (vec2(r2, r1) - 0.5) * 0.3 * hgt * y2;
      float groom = clamp((uBloom - m.b) * 6.0, 0.0, 1.0) * 0.85;
      float tone = stripeTone(m.g, base, groom);
      vec3 cutCol = mix(uDark, uLight, smoothstep(0.2, 0.8, tone)) * (0.94 + 0.16 * r2) * (1.0 + 0.06 * groom);
      vec3 tallCol = mix(uRoot * 0.75, uTip * (0.86 + 0.28 * r1), y);
      vCol = mix(tallCol, cutCol, isCut);
      float lamp = uLamp.w * smoothstep(uLamp.z, 0.0, distance(base, uLamp.xy)); vCol *= 1.0 + 0.9 * lamp;`);
    sh.uniforms.uBladeW = { value: L.bladeW };
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vCol;').replace('#include <color_fragment>', 'diffuseColor.rgb = vCol;').replace('#include <normal_fragment_begin>', '#include <normal_fragment_begin>\nnormal = normalize(vNormal);');
  };
  const blades = new THREE.Group(); group.add(blades);
  for (const t of tiles) { const m = new THREE.Mesh(t.geo, bladeMat); m.receiveShadow = true; blades.add(m); }

  // ---- finale blooms: small flowers that open where the lawn was cut, in the order it was cut
  const bn = Math.min(1200, Math.round(g.areaM2 * 1.5)), bi = new Float32Array(bn * 4); let bk = 0;
  for (let t = 0; t < bn * 3 && bk < bn; t++) {
    const x = R() * g.w, z = R() * g.d; if (g.mask[(Math.floor(z / g.cell) * g.cols + Math.floor(x / g.cell)) * 4 + 3] === 0) continue;
    bi[bk * 4] = ox + x; bi[bk * 4 + 1] = oz + z; bi[bk * 4 + 2] = R(); bi[bk * 4 + 3] = R(); bk++;
  }
  const petal = new THREE.PlaneGeometry(1, 1); petal.rotateX(-Math.PI / 2); // one quad; the five petals are drawn in the fragment shader
  const bgeo = new THREE.InstancedBufferGeometry(); bgeo.index = petal.index; bgeo.setAttribute('position', petal.getAttribute('position')); bgeo.setAttribute('normal', petal.getAttribute('normal'));
  bgeo.setAttribute('aI', new THREE.InstancedBufferAttribute(bi.subarray(0, bk * 4), 4)); bgeo.boundingSphere = allSphere;
  const bloomMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
  bloomMat.onBeforeCompile = (sh) => {
    share(sh);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute vec4 aI; varying vec3 vCol; varying vec3 vP;' + COMMON)
      .replace('#include <begin_vertex>', `
      vec4 m = texture2D(uMask, maskUv(aI.xy));
      float open = clamp((uBloom - m.b) * 6.0, 0.0, 1.0) * step(m.r, 0.1) * step(0.5, m.a);
      float pop = open * (1.0 + 0.35 * sin(min(open, 1.0) * 3.14159));
      float sz = (0.2 + 0.13 * aI.w) * pop;
      vec3 transformed = vec3(aI.x + position.x * sz, 0.1 + 0.03 * aI.z + 0.02 * sin(uTime * 2.0 + aI.z * 20.0), aI.y + position.z * sz);
      vP = vec3(position.xz, aI.z * 6.2831853);
      float k = fract(aI.z * 7.0);
      vCol = k < 0.25 ? vec3(1.0, 0.95, 0.86) : k < 0.5 ? vec3(0.96, 0.49, 0.36) : k < 0.75 ? vec3(0.96, 0.73, 0.23) : vec3(0.78, 0.62, 0.92);`);
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vCol; varying vec3 vP;').replace('#include <color_fragment>', 'float rr = length(vP.xy), th = atan(vP.y, vP.x) + vP.z, lobe = 0.5 + 0.5 * cos(th * 5.0); if (rr > 0.5 * (0.56 + 0.44 * lobe)) discard; diffuseColor.rgb = mix(vec3(1.0, 0.8, 0.26), vCol * (0.84 + 0.16 * lobe + 0.25 * rr), smoothstep(0.1, 0.15, rr));');
  };
  const blooms = new THREE.Mesh(bgeo, bloomMat); blooms.visible = false; group.add(blooms);

  let dirtyFlag = false, curTier = -1;
  const api = {
    group, g, ox, oz, uniforms: U, blades,
    /** Marks the mask changed; it is uploaded once on the next update. */
    dirty() { dirtyFlag = true; },
    update(t, kx, kz, moving, wide = 1) {
      U.uTime.value = t; U.uKart.value.set(kx, kz, moving); if (dirtyFlag) { tex.needsUpdate = true; dirtyFlag = false; }
      // fewer blades far from Buzzy: a far tile is small on a phone screen, and this keeps big gardens inside the triangle budget
      const base = L.bladesPerM2[curTier] / per * wide; // `wide` < 1 while a camera beat pulls far back
      for (const tl of tiles) { const d = Math.hypot(tl.cx - kx, tl.cz - kz), share = Math.min(1, Math.max(L.farShare, L.lodK - d / L.lodM)); tl.geo.instanceCount = Math.max(1, Math.round(tl.n * base * share)); }
    },
    setTier(k) { curTier = k; },
    /** 0 = flat, 1 = full height: the wave that raises a garden's grass as it comes into view. */
    setGrow(v) { U.uGrow.value = v; },
    /** Opens the finale flowers up to cut-order share v (0 to 1.2); below 0 hides them. */
    setBloom(v) { U.uBloom.value = v; blooms.visible = v >= 0; },
    setLamp(x, z, r, on) { U.uLamp.value.set(x, z, r, on); },
    count: () => tiles.reduce((a, t) => a + t.geo.instanceCount, 0),
    dispose() { tex.dispose(); for (const t of tiles) t.geo.dispose(); bgeo.dispose(); petal.dispose(); blade.dispose(); ground.geometry.dispose(); groundMat.dispose(); bladeMat.dispose(); bloomMat.dispose(); },
  };
  api.setTier(tier);
  return api;
}
export { H };
