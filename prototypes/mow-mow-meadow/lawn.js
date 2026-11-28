// PROTOTYPE - NOT FOR PRODUCTION
// The lawn: one mask texture per garden (height, cut direction, cut order, grass flag per cell) drives the blades, the
// striped ground under them, the finale blooms and the coverage. THREE is read when a lawn is built, never at import.
import { H } from './logic.js';

const COMMON = `
uniform sampler2D uMask; uniform vec4 uRect; uniform float uTime; uniform vec3 uKart; uniform vec3 uRoot; uniform vec3 uTip; uniform vec3 uLight; uniform vec3 uDark; uniform float uGrow; uniform vec4 uLamp;
vec2 maskUv(vec2 xz) { return (xz - uRect.xy) / uRect.zw; }
float hash21(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
`;

/** Shared lawn uniforms for one garden. */
function uniforms(THREE, tex, g, ox, oz, pal) {
  const c = (h) => new THREE.Color(h);
  return { uMask: { value: tex }, uRect: { value: new THREE.Vector4(ox, oz, g.w, g.d) }, uTime: { value: 0 }, uKart: { value: new THREE.Vector3(0, 0, -99) },
    uRoot: { value: c(pal[0]) }, uTip: { value: c(pal[1]) }, uLight: { value: c(pal[2]) }, uDark: { value: c(pal[3]) }, uGrow: { value: 1 }, uBloom: { value: -1 },
    uLamp: { value: new THREE.Vector4(0, 0, 0, 0) }, uTall: { value: 1.18 }, uCut: { value: 0.07 }, uWind: { value: new THREE.Vector2(0.09, 1.3) }, uPush: { value: 1.1 } };
}

/**
 * Builds the lawn of garden `g` with its north-west corner at world (ox, oz).
 * Returns { group, update(dt, t, kart), dirty(rect), setTier(n), setBloom(v), setGrow(v), setLamp(x, z, on), dispose() }.
 */
export function createLawn(THREE, g, cfg, ox, oz, pal, tier, R) {
  const L = cfg.lawn, group = new THREE.Group();
  const tex = new THREE.DataTexture(g.mask, g.cols, g.rows, THREE.RGBAFormat, THREE.UnsignedByteType);
  tex.magFilter = THREE.LinearFilter; tex.minFilter = THREE.LinearFilter; tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping; tex.needsUpdate = true;
  const U = uniforms(THREE, tex, g, ox, oz, pal);
  U.uCut.value = L.cutM; U.uTall.value = L.extraTallM - L.cutM; U.uWind.value.set(L.windAmp, L.windSpeed); U.uPush.value = L.pushM;
  const share = (sh) => { for (const k in U) sh.uniforms[k] = U[k]; };

  // ---- ground: stripes from the cut direction, a dark root colour under tall grass, a darker band at the cut edge
  const groundMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
  groundMat.onBeforeCompile = (sh) => {
    share(sh);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec2 vXZ;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvXZ = (modelMatrix * vec4(position, 1.0)).xz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec2 vXZ;' + COMMON).replace('#include <color_fragment>', `
      vec4 m = texture2D(uMask, maskUv(vXZ));
      float a = m.g * 6.2831853, tone = 0.5 + 0.5 * cos(a);
      float n = hash21(floor(vXZ * 22.0)) * 0.5 + hash21(floor(vXZ * 61.0)) * 0.5;
      vec2 dir = vec2(-sin(a), -cos(a)); float streak = hash21(floor(vec2(dot(vXZ, vec2(dir.y, -dir.x)) * 34.0, dot(vXZ, dir) * 3.0)));
      float fine = hash21(floor(vec2(dot(vXZ, vec2(dir.y, -dir.x)) * 90.0, dot(vXZ, dir) * 9.0)));
      vec3 cut = mix(uDark, uLight, smoothstep(0.25, 0.75, tone)) * (0.86 + 0.12 * n + 0.1 * streak + 0.12 * fine);
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
    tiles.push({ geo, n, share: n / want });
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
      float a = m.g * 6.2831853; transformed.xz += vec2(-sin(a), -cos(a)) * isCut * 0.05 * y;
      transformed.xz += (vec2(r2, r1) - 0.5) * 0.3 * hgt * y2;
      float tone = 0.5 + 0.5 * cos(a);
      vec3 cutCol = mix(uDark, uLight, smoothstep(0.25, 0.75, tone)) * (0.92 + 0.2 * r2);
      vec3 tallCol = mix(uRoot * 0.75, uTip * (0.86 + 0.28 * r1), y);
      vCol = mix(tallCol, cutCol, isCut);
      float lamp = uLamp.w * smoothstep(uLamp.z, 0.0, distance(base, uLamp.xy)); vCol *= 1.0 + 0.9 * lamp;`);
    sh.uniforms.uBladeW = { value: L.bladeW };
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vCol;').replace('#include <color_fragment>', 'diffuseColor.rgb = vCol;').replace('#include <normal_fragment_begin>', '#include <normal_fragment_begin>\nnormal = normalize(vNormal);');
  };
  const blades = new THREE.Group(); group.add(blades);
  for (const t of tiles) { const m = new THREE.Mesh(t.geo, bladeMat); m.receiveShadow = true; blades.add(m); }

  // ---- finale blooms: small flowers that open where the lawn was cut, in the order it was cut
  const bn = Math.min(1400, Math.round(g.areaM2 * 2.2)), bi = new Float32Array(bn * 4); let bk = 0;
  for (let t = 0; t < bn * 3 && bk < bn; t++) {
    const x = R() * g.w, z = R() * g.d; if (g.mask[(Math.floor(z / g.cell) * g.cols + Math.floor(x / g.cell)) * 4 + 3] === 0) continue;
    bi[bk * 4] = ox + x; bi[bk * 4 + 1] = oz + z; bi[bk * 4 + 2] = R(); bi[bk * 4 + 3] = R(); bk++;
  }
  const petal = new THREE.CircleGeometry(0.5, 6); petal.rotateX(-Math.PI / 2);
  const bgeo = new THREE.InstancedBufferGeometry(); bgeo.index = petal.index; bgeo.setAttribute('position', petal.getAttribute('position')); bgeo.setAttribute('normal', petal.getAttribute('normal'));
  bgeo.setAttribute('aI', new THREE.InstancedBufferAttribute(bi.subarray(0, bk * 4), 4)); bgeo.boundingSphere = allSphere;
  const bloomMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
  bloomMat.onBeforeCompile = (sh) => {
    share(sh);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute vec4 aI; varying vec3 vCol; varying vec2 vP; uniform float uBloom;' + COMMON)
      .replace('#include <begin_vertex>', `
      vec4 m = texture2D(uMask, maskUv(aI.xy));
      float open = clamp((uBloom - m.b) * 6.0, 0.0, 1.0) * step(m.r, 0.1) * step(0.5, m.a);
      float pop = open * (1.0 + 0.35 * sin(min(open, 1.0) * 3.14159));
      float sz = (0.16 + 0.12 * aI.w) * pop;
      vec3 transformed = vec3(aI.x + position.x * sz, 0.1 + 0.03 * aI.z + 0.02 * sin(uTime * 2.0 + aI.z * 20.0), aI.y + position.z * sz);
      vP = position.xz;
      float k = fract(aI.z * 7.0);
      vCol = k < 0.25 ? vec3(1.0, 0.95, 0.86) : k < 0.5 ? vec3(0.96, 0.49, 0.36) : k < 0.75 ? vec3(0.96, 0.73, 0.23) : vec3(0.78, 0.62, 0.92);`);
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vCol; varying vec2 vP;').replace('#include <color_fragment>', 'float rr = length(vP); diffuseColor.rgb = mix(vec3(0.98, 0.78, 0.25), vCol, smoothstep(0.14, 0.2, rr)); if (rr > 0.5) discard;');
  };
  const blooms = new THREE.Mesh(bgeo, bloomMat); blooms.visible = false; group.add(blooms);

  let dirtyFlag = false, curTier = -1;
  const api = {
    group, g, ox, oz, uniforms: U, blades,
    /** Marks the mask changed; it is uploaded once on the next update. */
    dirty() { dirtyFlag = true; },
    update(t, kx, kz, moving) { U.uTime.value = t; U.uKart.value.set(kx, kz, moving); if (dirtyFlag) { tex.needsUpdate = true; dirtyFlag = false; } },
    setTier(k) { if (k === curTier) return; curTier = k; for (const t of tiles) t.geo.instanceCount = Math.max(1, Math.round(t.n * L.bladesPerM2[k] / per)); },
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
