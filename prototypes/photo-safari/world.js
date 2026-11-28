// PROTOTYPE - NOT FOR PRODUCTION
// The 3D world: renderer, valley terrain with snow glints, an instanced pine forest that sways, rocks, props for
// each area (snowman, cabin, lanterns, lake ice, ice hole, crystals, ice gates), the sky dome with sun, stars and
// aurora, falling snow, day/night lighting, a follow camera with a viewfinder mode, an HDR glow pass with
// tone mapping and colour grading, quality tiers and the photo capture. THREE is read only inside functions.
import { merge } from './critters.js';
import * as L from './logic.js';

const C = (hex) => new THREE.Color(hex);
const M4 = (x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1, rx = 0, ry = 0, rz = 0) => new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(sx, sy, sz));
const sph = (s = 14) => new THREE.SphereGeometry(1, s, Math.round(s * 0.75));

const QUAD_VS = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';
const BRIGHT_FS = `uniform sampler2D tIn; uniform float uTh; varying vec2 vUv;
void main(){ vec3 c = texture2D(tIn, vUv).rgb; float l = max(c.r, max(c.g, c.b)); float k = smoothstep(uTh, uTh * 1.6, l); gl_FragColor = vec4(c * k, 1.0); }`;
const BLUR_FS = `uniform sampler2D tIn; uniform vec2 uDir; varying vec2 vUv;
void main(){ vec3 c = texture2D(tIn, vUv).rgb * 0.227;
 c += (texture2D(tIn, vUv + uDir * 1.385).rgb + texture2D(tIn, vUv - uDir * 1.385).rgb) * 0.316;
 c += (texture2D(tIn, vUv + uDir * 3.231).rgb + texture2D(tIn, vUv - uDir * 3.231).rgb) * 0.070; gl_FragColor = vec4(c, 1.0); }`;
const COMP_FS = `uniform sampler2D tScene; uniform sampler2D tBloom; uniform float uExp, uBloom, uSat, uVig, uCon; uniform vec3 uLift, uGain; varying vec2 vUv;
vec3 aces(vec3 x){ return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0); }
void main(){ vec3 c = texture2D(tScene, vUv).rgb * uExp + texture2D(tBloom, vUv).rgb * uBloom;
 c = aces(c); c = mix(c, c * c * (3.0 - 2.0 * c), uCon); c = c * uGain + uLift * (1.0 - c); float l = dot(c, vec3(0.2126, 0.7152, 0.0722)); c = mix(vec3(l), c, uSat);
 vec2 d = vUv - 0.5; d.x *= 0.75; c *= 1.0 - uVig * smoothstep(0.3, 0.85, length(d) * 1.4);
 c = mix(c * 12.92, 1.055 * pow(max(c, vec3(0.0)), vec3(1.0 / 2.4)) - 0.055, step(vec3(0.0031308), c));
 gl_FragColor = vec4(c, 1.0); }`;

const SKY_VS = 'varying vec3 vDir; void main(){ vDir = normalize(position); vec4 p = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * p; gl_Position.z = gl_Position.w; }';
const SKY_FS = `uniform vec3 uTop, uHor, uSunDir, uSunCol; uniform float uAur, uTime, uStars; varying vec3 vDir;
float h(vec3 p){ return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
void main(){ vec3 d = normalize(vDir); float y = max(d.y, 0.0);
 vec3 c = mix(uHor, uTop, pow(y, 0.55));
 float sd = max(dot(d, uSunDir), 0.0); c += uSunCol * (pow(sd, 600.0) * 6.0 + pow(sd, 12.0) * 0.25);
 vec3 g = floor(d * 180.0); float st = step(0.9965, h(g)) * smoothstep(0.05, 0.3, y) * uStars; c += vec3(st) * (0.6 + 0.6 * sin(uTime * 3.0 + h(g + 1.0) * 40.0));
 if (uAur > 0.001) {
  float a = 0.0; vec3 col = vec3(0.0);
  for (int i = 0; i < 3; i++) { float fi = float(i);
   float x = atan(d.x, -d.z) * (2.0 + fi) + uTime * (0.05 + fi * 0.02);
   float band = sin(x * 1.7 + sin(x * 0.6 + uTime * 0.2) * 2.0 + fi * 2.1) * 0.06 + 0.3 + fi * 0.07;
   float k = exp(-pow((y - band) * (14.0 - fi * 2.0), 2.0)) * (0.55 + 0.45 * sin(x * 9.0 + uTime * 0.9 + fi));
   float curtain = smoothstep(band - 0.02, band + 0.18, y) * exp(-(y - band) * 4.0) * 0.6 * (0.5 + 0.5 * sin(x * 13.0 + uTime));
   vec3 cc = i == 0 ? vec3(0.25, 1.6, 1.0) : i == 1 ? vec3(0.7, 0.55, 1.8) : vec3(1.6, 0.45, 1.1);
   col += cc * (k + curtain * 0.5); }
  c += col * uAur * smoothstep(0.02, 0.2, y) * 1.4; }
 gl_FragColor = vec4(c, 1.0); }`;

/** Creates the world in `canvas`. Returns the scene API used by game.js. */
export function createWorld(canvas, cfg, opts = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', preserveDrawingBuffer: !!opts.keep });
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(cfg.camera.fov, 0.5625, 0.3, 600);
  const fog = new THREE.FogExp2(0xd6e8f8, 0.0085); scene.fog = fog;
  const R = L.rng(cfg.seed);
  const uTime = { value: 0 }, uGust = { value: 0 }, uPush = { value: 0 }; // gust 0..1; push = wind drift integrated over time
  const disposables = [];
  const keep = (o) => { disposables.push(o); return o; };

  // ---- lights
  const hemi = new THREE.HemisphereLight(0xcfe6ff, 0x9cb4d8, 1.05); scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff4e2, 2.3); sun.castShadow = true;
  sun.shadow.camera.left = -16; sun.shadow.camera.right = 16; sun.shadow.camera.top = 16; sun.shadow.camera.bottom = -16; sun.shadow.camera.near = 1; sun.shadow.camera.far = 70;
  sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.03; sun.shadow.intensity = cfg.grade.shadowI; sun.shadow.radius = cfg.grade.shadowR; // a lighter, bluer shadow so big tree shapes don't read as flat holes
  scene.add(sun); scene.add(sun.target);
  // the hero's lantern: a warm pool of light on the snow around Pip after dusk, drawn in the terrain shader (a real
  // point light would add a light loop to every shader and slow the first frame)
  const lampU = { value: new THREE.Vector4(0, 0, 0, 0) };
  const sunDir = new THREE.Vector3(0.45, 0.75, 0.35).normalize();

  // ---- sky
  const skyU = { uTop: { value: C('#8fc6ff') }, uHor: { value: C('#e8f4ff') }, uSunDir: { value: sunDir.clone() }, uSunCol: { value: C('#fff4e2') }, uAur: { value: 0 }, uTime, uStars: { value: 0 } };
  const sky = new THREE.Mesh(keep(new THREE.SphereGeometry(300, 32, 16)), keep(new THREE.ShaderMaterial({ uniforms: skyU, vertexShader: SKY_VS, fragmentShader: SKY_FS, side: THREE.BackSide, depthWrite: false, fog: false })));
  sky.renderOrder = -10; sky.frustumCulled = false; scene.add(sky);

  // ---- terrain
  const tw = 140, tz0 = 70, tz1 = -232, tseg = [70, 151];
  const tg = keep(new THREE.PlaneGeometry(tw, tz0 - tz1, tseg[0], tseg[1])); tg.rotateX(-Math.PI / 2); tg.translate(0, 0, (tz0 + tz1) / 2);
  const tp = tg.attributes.position, tcol = new Float32Array(tp.count * 3);
  const tc = C('#ffffff'), cave = C('#c8d6f2'), snowLit = C('#eef5fc'), snowBlue = C('#a2c3ea'), rock = C('#7d889e'), path = C('#b4c8e6');
  for (let i = 0; i < tp.count; i++) {
    const x = tp.getX(i), z = tp.getZ(i), y = L.terrainH(cfg, x, z); tp.setY(i, y);
  }
  tg.computeVertexNormals();
  const tn = tg.attributes.normal;
  for (let i = 0; i < tp.count; i++) {
    const x = tp.getX(i), z = tp.getZ(i), ny = tn.getY(i);
    const hollow = Math.max(0, Math.min(1, -L.noise2(x * 0.11, z * 0.11) * 0.7 + 0.25));
    const c = tc.copy(snowLit).lerp(snowBlue, hollow * 0.7);
    const steep = Math.max(0, Math.min(1, (0.82 - ny) * 3.2)); if (steep > 0) c.lerp(rock, steep * (0.55 + 0.3 * L.noise2(x * 0.4, z * 0.4)));
    const px = Math.sin(z * 0.045) * 3; { const pd = Math.abs(x - px); if (pd < 1.9 && z < 20 && z > -186) c.lerp(path, 0.8 * Math.min(1, (1.9 - pd) * 1.5)); }
    if (z < -128) c.lerp(cave, 0.25);
    tcol[i * 3] = c.r; tcol[i * 3 + 1] = c.g; tcol[i * 3 + 2] = c.b;
  }
  tg.setAttribute('color', new THREE.BufferAttribute(tcol, 3));
  const terrainMat = keep(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92, metalness: 0 }));
  terrainMat.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = uTime; sh.uniforms.uGlint = { value: 1 }; sh.uniforms.uLamp = lampU; sh.uniforms.uLampR = { value: cfg.grade.lanternM }; terrainMat.userData.sh = sh;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vW;').replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvW = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vW; uniform float uTime; uniform float uGlint; uniform vec4 uLamp; uniform float uLampR;\nfloat gh(vec3 p){ return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }')
      // wind-carved drifts: long soft ripples that catch the sun and keep a blue trough, plus a fine crust grain, both
      // fading out with distance so the far field stays calm
      .replace('#include <color_fragment>', '#include <color_fragment>\nfloat rf = smoothstep(60.0, 6.0, length(vW - cameraPosition)); float rw = vW.x * 0.9 + vW.z * 0.42 + sin(vW.z * 0.31 + vW.x * 0.17) * 2.2; float rp = sin(rw * 1.9); rf *= 0.35 + 0.65 * smoothstep(-0.3, 0.8, sin(vW.x * 0.07 + vW.z * 0.11 + sin(vW.z * 0.05) * 2.0));\ndiffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(0.84, 0.92, 1.05), rf * 0.5 * smoothstep(-0.2, -1.0, rp));\ndiffuseColor.rgb *= 1.0 - rf * 0.05 * gh(floor(vW * 2.5));')
      .replace('#include <normal_fragment_maps>', '#include <normal_fragment_maps>\n{ float rc = cos(rw * 1.9) * 1.9 * rf * 0.1; normal = normalize(normal - (viewMatrix * vec4(rc * 0.9, 0.0, rc * 0.42, 0.0)).xyz); }')
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n{ vec3 cell = floor(vW * 9.0); float g = gh(cell + floor(cameraPosition * 1.5)); float sp = step(0.9975, g) * uGlint * smoothstep(40.0, 8.0, length(vW - cameraPosition)); totalEmissiveRadiance += vec3(1.6, 1.75, 2.0) * sp; }\n{ float ld = 1.0 - clamp(length(vW - uLamp.xyz) / uLampR, 0.0, 1.0); totalEmissiveRadiance += diffuseColor.rgb * vec3(1.0, 0.62, 0.3) * uLamp.w * 0.06 * ld * ld; }');
  };
  const terrain = new THREE.Mesh(tg, terrainMat); terrain.receiveShadow = true; scene.add(terrain);

  // ---- lake ice and the fishing hole
  const lake = cfg.areas[1].lake;
  const iceMat = keep(new THREE.MeshStandardMaterial({ color: 0xa8dcf0, roughness: 0.18, metalness: 0.05, transparent: true, opacity: 0.92 }));
  iceMat.onBeforeCompile = (sh) => {
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nfloat ih(vec2 p){ return fract(sin(dot(p, vec2(41.3, 289.1))) * 15731.7); }')
      .replace('#include <color_fragment>', '#include <color_fragment>\n{ vec2 q = vUvI * 22.0; vec2 f = fract(q) - 0.5; float cr = smoothstep(0.03, 0.0, abs(f.x + (ih(floor(q)) - 0.5) * 0.4)) + smoothstep(0.03, 0.0, abs(f.y)); diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.92, 0.97, 1.0), clamp(cr, 0.0, 1.0) * 0.35); float r = length(vUvI - 0.5); diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.45, 0.68, 0.86), smoothstep(0.2, 0.5, r) * 0.0 + smoothstep(0.3, 0.0, r) * 0.25); }');
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec2 vUvI;').replace('#include <uv_vertex>', '#include <uv_vertex>\nvUvI = uv;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec2 vUvI;');
  };
  const ice = new THREE.Mesh(keep(new THREE.CircleGeometry(lake[2] + 1.2, 48)), iceMat); ice.rotation.x = -Math.PI / 2; ice.position.set(lake[0], -0.1, lake[1]); ice.receiveShadow = true; scene.add(ice);
  const hole = new THREE.Mesh(keep(new THREE.CircleGeometry(1.7, 28)), keep(new THREE.MeshStandardMaterial({ color: 0x1c4a6e, roughness: 0.05, metalness: 0.2 }))); hole.rotation.x = -Math.PI / 2; hole.position.set(lake[0], -0.08, lake[1]); scene.add(hole);
  const holeRim = new THREE.Mesh(keep(new THREE.TorusGeometry(1.75, 0.22, 8, 28)), keep(new THREE.MeshStandardMaterial({ color: 0xeaf6ff, roughness: 0.4 }))); holeRim.rotation.x = Math.PI / 2; holeRim.position.set(lake[0], -0.05, lake[1]); holeRim.scale.set(1, 1, 0.5); scene.add(holeRim);

  // ---- pine forest (3 shapes, instanced, swaying in the wind)
  const pineGeo = (tiers, w, hgt) => {
    const items = [{ g: new THREE.CylinderGeometry(0.16, 0.24, 0.9, 7), m: M4(0, 0.45, 0), col: C('#6a4630') }]; // a short trunk under a low skirt: no bare stick against the snow
    for (let i = 0; i < tiers; i++) {
      const k = i / tiers, r = w * (1 - k * 0.62), y = 0.6 + k * hgt, hh = hgt / tiers * 1.7;
      items.push({ g: new THREE.ConeGeometry(1, 1, 9, 1), m: M4(0, y + hh * 0.5, 0, r, hh, r, 0, i * 0.7), col: (n, p) => (n.y > 0.5 - k * 0.1 ? C('#f4f9ff') : C(i % 2 ? '#2f6b5a' : '#2a6152')).multiplyScalar(0.78 + 0.22 * Math.max(0, n.y)) });
      items.push({ g: new THREE.ConeGeometry(1, 1, 9, 1), m: M4(0, y + hh * 0.62, 0, r * 0.82, hh * 0.55, r * 0.82, 0, i * 0.7 + 0.3), col: C('#f2f7ff') });
    }
    return merge(items);
  };
  const pineMat = keep(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85 }));
  // see-through: a whole pine between the camera and the hero fades out (ordered dither only while it fades), so the
  // hero is never hidden and no tree is left half cut
  const heroU = { value: new THREE.Vector3() }, seeR = { value: cfg.camera.seeThroughM };
  pineMat.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = uTime; sh.uniforms.uHero = heroU; sh.uniforms.uSeeR = seeR; sh.uniforms.uGust = uGust;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float uTime;\nuniform float uGust;\nuniform vec3 uHero;\nuniform float uSeeR;\nvarying vec3 vWp;\nvarying float vSee;').replace('#include <begin_vertex>', `#include <begin_vertex>
#ifdef USE_INSTANCING
 float ph = instanceMatrix[3].x * 0.31 + instanceMatrix[3].z * 0.17;
 float sw = ((sin(uTime * 1.3 + ph) * 0.6 + sin(uTime * 2.7 + ph * 1.7) * 0.25) * (1.0 + uGust * 1.6) + uGust * 0.9) * 0.035 * max(0.0, position.y - 1.0);
 transformed.x += sw; transformed.z += sw * 0.5;
 vWp = (modelMatrix * instanceMatrix * vec4(transformed, 1.0)).xyz;
 { vec3 ip = (modelMatrix * instanceMatrix * vec4(0.0, 2.5, 0.0, 1.0)).xyz, sg = uHero - cameraPosition;
   float tt = clamp(dot(ip - cameraPosition, sg) / max(dot(sg, sg), 1e-3), 0.0, 1.0);
   vSee = (1.0 - smoothstep(uSeeR * 0.8, uSeeR * 1.6, length(ip - (cameraPosition + sg * tt)))) * step(tt, 0.97);
   vSee = max(vSee, 1.0 - smoothstep(4.5, 7.5, length(ip.xz - cameraPosition.xz)) * step(cameraPosition.y, ip.y + 1.5)); }
#else
 vWp = (modelMatrix * vec4(transformed, 1.0)).xyz; vSee = 0.0;
#endif`);
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vWp;\nvarying float vSee;').replace('void main() {', `void main() {
 { float k = vSee < 0.9 ? vSee : 1.1;
   vec2 q = mod(floor(gl_FragCoord.xy), 4.0);
   float bay = (mod(q.x + q.y * 2.0, 4.0) * 4.0 + mod(q.x * 3.0 + q.y, 4.0)) / 16.0;
   if (k > bay + 0.03) discard; }`).replace('#include <color_fragment>', `#include <color_fragment>
 { vec3 cc = diffuseColor.rgb; float bark = step(cc.g * 1.25, cc.r), wht = step(0.8, cc.b);
   float n1 = fract(sin(dot(floor(vWp * vec3(16.0, 3.0, 16.0)), vec3(12.9898, 78.233, 37.719))) * 43758.5453);
   float n2 = fract(sin(dot(floor(vWp * vec3(6.0, 10.0, 6.0)), vec3(39.3, 11.1, 83.7))) * 24634.6345);
   diffuseColor.rgb *= mix(mix(0.8 + 0.32 * n2, 0.95 + 0.08 * n2, wht), 0.68 + 0.5 * n1, bark); }`);
  };
  const shapes = [pineGeo(4, 1.6, 4.2), pineGeo(5, 2.0, 5.6), pineGeo(3, 1.3, 3.0)].map(keep);
  const trees = [[], [], []], trunks = [], tops = []; // tops: [x, y, z] of each crown, for snow puffs
  const homes = [...cfg.species.map((s) => s.home), ...cfg.rares.map((r) => r.home)];
  const clearOf = (x, z, r) => homes.every((h) => Math.hypot(h[0] - x, h[1] - z) > r) && Math.abs(x - Math.sin(z * 0.045) * 3) > 3.2 && cfg.gates.every((g) => L.gateDist(g, x, z) > 2) && Math.hypot(x - lake[0], z - lake[1]) > lake[2] + 3;
  for (let i = 0; i < 2600 && trees[0].length + trees[1].length + trees[2].length < 420; i++) {
    const x = (R() - 0.5) * 130, z = 66 - R() * 294;
    let d = 1e9; for (const a of cfg.areas) d = Math.min(d, L.areaDist(a, x, z));
    const inBand = d > -5 && d < 16, inside = d < -7;
    if (!(inBand || (inside && R() < 0.05))) continue;
    if (!clearOf(x, z, inside ? 5 : 3)) continue;
    const s = 0.8 + R() * 0.7, k = Math.floor(R() * 3), y = L.terrainH(cfg, x, z) - 0.1;
    const sy = s * (0.9 + R() * 0.3); trees[k].push(M4(x, y, z, s, sy, s, 0, R() * 6.28)); tops.push([x, y + sy * [4.2, 5.6, 3.0][k] * 0.7, z, s]);
    if (d < 1) trunks.push([x, z]);
  }
  const forest = shapes.map((g, k) => { const m = new THREE.InstancedMesh(g, pineMat, trees[k].length); trees[k].forEach((t, i) => m.setMatrixAt(i, t)); m.castShadow = true; m.receiveShadow = false; m.computeBoundingSphere(); scene.add(m); return m; });

  // ---- rocks (instanced, snow on top)
  const rockGeo = (() => { const g = new THREE.IcosahedronGeometry(1, 1); const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const v = new THREE.Vector3().fromBufferAttribute(p, i); v.multiplyScalar(1 + L.noise2(v.x * 3 + 5, v.z * 3 + v.y * 2) * 0.18); p.setXYZ(i, v.x, v.y * 0.7, v.z); } g.computeVertexNormals(); return keep(merge([{ g, m: M4(), col: (n, p) => (n.y > 0.45 ? C('#f2f7ff') : C('#8a94a8').lerp(C('#6c7a96'), 0.5 + 0.5 * Math.sin(p.y * 11 + p.x * 3))).multiplyScalar(0.8 + 0.2 * n.y) }])); })();
  const rockS = []; // [x, z, size] per rock, for the camera's line of sight
  const rockM = []; for (let i = 0; i < 400 && rockM.length < 70; i++) { const x = (R() - 0.5) * 120, z = 60 - R() * 290; let d = 1e9; for (const a of cfg.areas) d = Math.min(d, L.areaDist(a, x, z)); if (d < -4 || d > 6 || !clearOf(x, z, 3)) continue; const s = 0.6 + R() * 1.6; rockM.push(M4(x, L.terrainH(cfg, x, z) + s * 0.15, z, s, s, s, 0, R() * 6)); rockS.push([x, z, s]); }
  const rocks = new THREE.InstancedMesh(rockGeo, keep(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 })), rockM.length); rockM.forEach((m, i) => rocks.setMatrixAt(i, m)); rocks.castShadow = true; rocks.receiveShadow = true; scene.add(rocks);

  // ground cover, fences and tracks: same material as the rocks (no new shader), built after the first frame
  const buildGround = () => {
    // ---- foreground ground cover (instanced): wind drifts with dry grass, twigs and pebbles
    // along the path edges and in the open fields, so the near ground has scale cues instead of blank snow
    const coverGeo = (k) => {
      const snow = (n) => C('#f2f7ff').lerp(C('#a9c6ec'), Math.max(0, 0.55 - n.y) * 0.9), grass = C(k ? '#d2bf86' : '#c0ae74'), twig = C('#5a4030');
      const items = [{ g: sph(9), m: M4(0, 0, 0, 1.1, 0.32, 0.7), col: snow }, { g: sph(7), m: M4(0.7, 0, 0.25, 0.6, 0.22, 0.5), col: snow }];
      for (let i = 0; i < 7; i++) { const a = i * 0.9 + k; items.push({ g: new THREE.ConeGeometry(0.025, 1, 3, 1), m: M4(Math.cos(a) * 0.45, 0.2, Math.sin(a) * 0.3, 1, 0.3 + (i % 3) * 0.1, 1, Math.sin(a) * 0.35, 0, Math.cos(a) * 0.35), col: grass }); }
      if (k) items.push({ g: new THREE.IcosahedronGeometry(0.28, 0), m: M4(-0.75, 0.08, 0.1, 1, 0.7, 1), col: (n) => (n.y > 0.5 ? C('#f2f7ff') : C('#7a86a0')) });
      else items.push({ g: new THREE.CylinderGeometry(0.025, 0.035, 1.2, 5), m: M4(-0.3, 0.2, 0.3, 1, 1, 1, 0.2, 0, 1.35), col: twig }, { g: new THREE.CylinderGeometry(0.015, 0.02, 0.45, 4), m: M4(-0.5, 0.28, 0.36, 1, 1, 1, 0.9, 0, 0.6), col: twig });
      return keep(merge(items));
    };
    const R2 = L.rng(cfg.seed + 7), coverM = [[], []];
    for (let i = 0; i < 3000 && coverM[0].length + coverM[1].length < cfg.world.cover; i++) {
      // half along the path edges, a third near each area's rim (the open corners), the rest anywhere in the fields
      const mode = R2(); let x, z;
      if (mode < 0.45) { z = 30 - R2() * 220; x = Math.sin(z * 0.045) * 3 + (R2() < 0.5 ? -1 : 1) * (3.4 + R2() * 3); }
      else if (mode < 0.8) { const a = cfg.areas[Math.floor(R2() * cfg.areas.length)], t = R2() * 6.283, k = 1 - (2.5 + R2() * 7) / ((a.r[0] + a.r[1]) / 2); x = a.c[0] + Math.sin(t) * a.r[0] * k; z = a.c[1] + Math.cos(t) * a.r[1] * k; }
      else { z = 30 - R2() * 220; x = (R2() - 0.5) * 80; }
      let d = 1e9; for (const a of cfg.areas) d = Math.min(d, L.areaDist(a, x, z));
      if (d > -2 || !clearOf(x, z, 3.2)) continue;
      const s = 0.7 + R2() * 0.7; coverM[R2() < 0.6 ? 0 : 1].push(M4(x, L.terrainH(cfg, x, z) - 0.05, z, s, s, s, 0, R2() * 6.28));
    }
    coverM.forEach((list, k) => { if (!list.length) return; const m = new THREE.InstancedMesh(coverGeo(k), rocks.material, list.length); list.forEach((t, i) => m.setMatrixAt(i, t)); m.receiveShadow = true; m.computeBoundingSphere(); scene.add(m); });
    // split-rail fences in snow along curving lines, and little animal tracks wandering across the open fields
    const fenceGeo = keep(merge([
      ...[-1, 1].map((sx) => ({ g: new THREE.CylinderGeometry(0.08, 0.1, 1.3, 6), m: M4(sx * 1.2, 0.55, 0, 1, 1, 1, 0, 0, sx * 0.05), col: C('#6a4a32') })),
      ...[-1, 1].map((sx) => ({ g: sph(8), m: M4(sx * 1.2, 1.22, 0, 0.12, 0.07, 0.12), col: C('#f4f9ff') })),
      { g: new THREE.BoxGeometry(2.6, 0.09, 0.07), m: M4(0, 0.95, 0, 1, 1, 1, 0, 0, 0.03), col: C('#7a5638') },
      { g: new THREE.BoxGeometry(2.6, 0.09, 0.07), m: M4(0, 0.5, 0, 1, 1, 1, 0, 0, -0.04), col: C('#7a5638') },
      { g: new THREE.BoxGeometry(2.6, 0.04, 0.12), m: M4(0, 1.0, 0, 1, 1, 1), col: C('#f4f9ff') },
    ]));
    const trackGeo = keep(merge([{ g: sph(6), m: M4(-0.1, 0, 0, 0.07, 0.02, 0.1), col: C('#8fa8d4') }, { g: sph(6), m: M4(0.1, 0, 0.18, 0.07, 0.02, 0.1), col: C('#8fa8d4') }]));
    const fenceM = [], trackM = [];
    // fences mark the meadow's edge, just past where Pip can walk, so they never stand in the way
    const ma = cfg.areas[0], fk = cfg.world.fenceK;
    for (const [t0, n] of cfg.world.fences) {
      for (let i = 0; i < n; i++) {
        const t = t0 + i * 2.5 / (fk * (ma.r[0] + ma.r[1]) / 2), x = ma.c[0] + Math.sin(t) * ma.r[0] * fk, z = ma.c[1] + Math.cos(t) * ma.r[1] * fk;
        const tx = Math.cos(t) * ma.r[0], tz = -Math.sin(t) * ma.r[1];
        if (clearOf(x, z, 3)) fenceM.push(M4(x, L.terrainH(cfg, x, z) - 0.1, z, 1, 1, 1, 0, Math.atan2(-tz, tx) + (R2() - 0.5) * 0.12, 0));
      }
    }
    for (const [x0, z0, h] of cfg.world.tracks) {
      let x = x0, z = z0, a = h;
      for (let i = 0; i < 36; i++) { a += Math.sin(i * 0.5 + x0) * 0.18; x += Math.sin(a) * 0.55; z += Math.cos(a) * 0.55; if (clearOf(x, z, 1.5)) trackM.push(M4(x, L.terrainH(cfg, x, z) + 0.01, z, 1, 1, 1, 0, a, 0)); }
    }
    for (const [g, list] of [[fenceGeo, fenceM], [trackGeo, trackM]]) { if (!list.length) continue; const m = new THREE.InstancedMesh(g, rocks.material, list.length); list.forEach((t, i) => m.setMatrixAt(i, t)); m.castShadow = g === fenceGeo; m.receiveShadow = true; m.computeBoundingSphere(); scene.add(m); }
  };

  // ---- props
  const propMat = keep(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8 }));
  const glowMat = keep(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.4, emissive: 0xffffff, emissiveIntensity: 1 }));
  glowMat.onBeforeCompile = (sh) => { sh.uniforms.uGlowK = { value: 1 }; glowMat.userData.sh = sh; sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform float uGlowK;').replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance = vColor.rgb * uGlowK * 3.0;'); };
  const props = [], glows = [];
  const place = (items, x, z, rot = 0, glow = null) => {
    const y = L.terrainH(cfg, x, z);
    const m = new THREE.Mesh(keep(merge(items)), propMat); m.position.set(x, y, z); m.rotation.y = rot; m.castShadow = true; m.receiveShadow = true; scene.add(m); props.push(m);
    if (glow) { const g = new THREE.Mesh(keep(merge(glow)), glowMat); g.position.copy(m.position); g.rotation.y = rot; scene.add(g); glows.push(g); }
    return m;
  };
  const W = C('#f4f9ff');
  // ---- mid-field dressing: snowy shrubs with red berries and fallen logs (instanced, one draw each), so open fields
  // have shapes at middle distance; a few stand in the first frame, the rest build after it
  const drift = (n) => C('#f2f7ff').lerp(C('#a9c6ec'), Math.max(0, 0.55 - n.y) * 0.9);
  const shrubGeo = keep(merge([
    ...[[0, 0.35, 0, 0.75, 0.55, 0.7], [0.55, 0.25, 0.2, 0.5, 0.4, 0.5], [-0.5, 0.22, -0.15, 0.5, 0.38, 0.45], [0.1, 0.62, -0.1, 0.45, 0.36, 0.45]].map(([x, y, z, a, b, c], i) => ({ g: sph(7), m: M4(x, y, z, a, b, c), col: (n) => C(i % 2 ? '#2f6b5a' : '#3a7564').multiplyScalar(0.7 + 0.3 * Math.max(0, n.y)) })),
    ...[[0, 0.78, 0, 0.6, 0.2, 0.55], [0.55, 0.55, 0.2, 0.42, 0.14, 0.4], [-0.5, 0.5, -0.15, 0.4, 0.13, 0.36]].map(([x, y, z, a, b, c]) => ({ g: sph(7), m: M4(x, y, z, a, b, c), col: (n) => W.clone().lerp(C('#b4c8e6'), Math.max(0, -n.y) * 0.8) })),
    ...[0, 1, 2, 3, 4].map((i) => ({ g: sph(4), m: M4(Math.cos(i * 1.4) * 0.62, 0.36 + (i % 2) * 0.12, Math.sin(i * 1.4) * 0.55, 0.07, 0.07, 0.07), col: C('#d8443a') })),
    { g: sph(9), m: M4(0, 0, 0, 1.25, 0.25, 1.05), col: drift },
  ]));
  const logGeo = keep(merge([
    { g: new THREE.CylinderGeometry(0.28, 0.32, 3.2, 9), m: M4(0, 0.26, 0, 1, 1, 1, 0, 0, Math.PI / 2), col: (n) => C('#6a4630').multiplyScalar(0.75 + 0.25 * Math.max(0, n.y)) },
    ...[-1, 1].map((sx) => ({ g: new THREE.CircleGeometry(0.27, 9), m: M4(sx * 1.61, 0.26, 0, 1, 1, 1, 0, sx * Math.PI / 2, 0), col: C('#c9a074') })),
    { g: sph(8), m: M4(0, 0.5, 0, 1.5, 0.11, 0.24), col: W },
    { g: new THREE.CylinderGeometry(0.05, 0.08, 0.8, 5), m: M4(0.6, 0.6, 0.12, 1, 1, 1, 0.5, 0, -0.6), col: C('#5a4030') },
    { g: sph(9), m: M4(-1.2, 0.05, 0.35, 0.8, 0.25, 0.6), col: drift }, { g: sph(9), m: M4(1.1, 0.05, -0.35, 0.7, 0.22, 0.5), col: drift },
  ]));
  const dress = (geo, list) => { if (!list.length) return; const m = new THREE.InstancedMesh(geo, rocks.material, list.length); list.forEach((t, i) => m.setMatrixAt(i, t)); m.castShadow = true; m.receiveShadow = true; m.computeBoundingSphere(); scene.add(m); };
  const shrubAt = ([x, z, s = 1]) => M4(x, L.terrainH(cfg, x, z) - 0.05, z, s, s, s, 0, x * 1.7 + z);
  const logAt = ([x, z, yaw]) => M4(x, L.terrainH(cfg, x, z) - 0.04, z, 1, 1, 1, 0, yaw);
  dress(shrubGeo, cfg.world.startShrubs.map(shrubAt)); dress(logGeo, cfg.world.startLogs.map(logAt));
  /** Builds after the first frame: shrubs and logs across the fields, and the frozen streams with snowy banks. */
  const dressFields = () => {
    const R3 = L.rng(cfg.seed + 11), sh = cfg.world.shrubAt.map(shrubAt);
    for (let i = 0; i < 2000 && sh.length < cfg.world.shrubs; i++) {
      const a = cfg.areas[Math.floor(R3() * cfg.areas.length)], t = R3() * 6.283, k = 0.35 + R3() * 0.5, x = a.c[0] + Math.sin(t) * a.r[0] * k, z = a.c[1] + Math.cos(t) * a.r[1] * k;
      if (!clearOf(x, z, 7) || Math.abs(x - Math.sin(z * 0.045) * 3) < 5) continue; // clear of homes, so no shrub blocks a photo
      sh.push(shrubAt([x, z, 0.7 + R3() * 0.5]));
    }
    dress(shrubGeo, sh); dress(logGeo, cfg.world.logs.map(logAt));
    const ice = keep(new THREE.MeshStandardMaterial({ color: 0x9fd6ee, roughness: 0.1, metalness: 0.05, emissive: 0x1d5a80, emissiveIntensity: 0.3, side: THREE.DoubleSide }));
    // a ribbon that follows the ground: the ice down the middle, laid over a wider snow lip so its edges stay soft
    const ribbon = (curve, n, wk, lift, col) => {
      const pos = [], nor = [], cl = [], idx = [];
      for (let i = 0; i <= n; i++) {
        const p = curve.getPointAt(i / n), tg = curve.getTangentAt(i / n), w = cfg.world.streamW * wk * (0.85 + 0.25 * Math.sin(i * 0.7)), nx = -tg.z * w / 2, nz = tg.x * w / 2;
        for (const sx of [-1, 1]) { const x = p.x + nx * sx, z = p.z + nz * sx; pos.push(x, L.terrainH(cfg, x, z) + lift, z); nor.push(0, 1, 0); cl.push(col.r, col.g, col.b); }
        if (i < n) idx.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
      }
      const g = keep(new THREE.BufferGeometry()); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(cl, 3)); g.setIndex(idx);
      return g;
    };
    for (const pts of cfg.world.streams) {
      const curve = new THREE.CatmullRomCurve3(pts.map(([x, z]) => new THREE.Vector3(x, 0, z))), n = Math.ceil(curve.getLength() / 0.8);
      const lip = new THREE.Mesh(ribbon(curve, n, 1.7, 0.07, C('#eef5ff')), propMat); lip.receiveShadow = true; scene.add(lip);
      const m = new THREE.Mesh(ribbon(curve, n, 1, 0.12, C('#ffffff')), ice); m.receiveShadow = true; scene.add(m);
    }
  };
  // snowman
  place([{ g: sph(), m: M4(0, 0.6, 0, 0.7, 0.62, 0.7), col: W }, { g: sph(), m: M4(0, 1.45, 0, 0.5, 0.46, 0.5), col: W }, { g: sph(), m: M4(0, 2.1, 0, 0.36, 0.34, 0.36), col: W },
    { g: new THREE.ConeGeometry(0.07, 0.42, 8), m: M4(0, 2.1, 0.5, 1, 1, 1, Math.PI / 2), col: C('#ff8a2e') },
    { g: sph(8), m: M4(-0.12, 2.2, 0.3, 0.04, 0.04, 0.03), col: C('#2b2b2b') }, { g: sph(8), m: M4(0.12, 2.2, 0.3, 0.04, 0.04, 0.03), col: C('#2b2b2b') },
    { g: new THREE.TorusGeometry(0.38, 0.09, 8, 18), m: M4(0, 1.78, 0, 1, 1, 0.9, Math.PI / 2), col: C('#e8513a') },
    { g: new THREE.CylinderGeometry(0.03, 0.03, 1.1, 5), m: M4(-0.75, 1.6, 0, 1, 1, 1, 0, 0, 1.0), col: C('#6a4630') }, { g: new THREE.CylinderGeometry(0.03, 0.03, 1.1, 5), m: M4(0.75, 1.6, 0, 1, 1, 1, 0, 0, -1.1), col: C('#6a4630') },
    { g: new THREE.CylinderGeometry(0.28, 0.32, 0.38, 14), m: M4(0, 2.5, 0, 1, 1, 1, 0.1), col: C('#2b3242') }], -7, -1, 0.4);
  // sled
  place([{ g: new THREE.BoxGeometry(0.9, 0.1, 1.8), m: M4(0, 0.32, 0), col: C('#c8562c') }, { g: new THREE.TorusGeometry(0.9, 0.04, 6, 16, Math.PI * 0.6), m: M4(-0.42, 0.18, 0, 1, 0.3, 1, 0, Math.PI / 2), col: C('#d9b060') }, { g: new THREE.TorusGeometry(0.9, 0.04, 6, 16, Math.PI * 0.6), m: M4(0.42, 0.18, 0, 1, 0.3, 1, 0, Math.PI / 2), col: C('#d9b060') }], 5, 9, -0.6);
  // cabin with a lit window and a chimney
  const log = (y, z, len, rot = 0) => ({ g: new THREE.CylinderGeometry(0.2, 0.2, len, 8), m: M4(0, y, z, 1, 1, 1, 0, rot, Math.PI / 2), col: C('#8a5a36') });
  const cabin = [];
  for (let i = 0; i < 7; i++) { cabin.push(log(0.2 + i * 0.38, 1.6, 4.4)); cabin.push(log(0.2 + i * 0.38, -1.6, 4.4)); cabin.push({ ...log(0.38 + i * 0.38, 0, 3.6), m: M4(2.1, 0.38 + i * 0.38, 0, 1, 1, 1, Math.PI / 2, 0, 0) }); cabin.push({ ...log(0.38 + i * 0.38, 0, 3.6), m: M4(-2.1, 0.38 + i * 0.38, 0, 1, 1, 1, Math.PI / 2, 0, 0) }); }
  cabin.push({ g: new THREE.CylinderGeometry(0.01, 2.9, 1.8, 4, 1), m: M4(0, 3.6, 0, 1, 1, 0.82, 0, Math.PI / 4), col: (n) => (n.y > 0.3 ? W : C('#5a3a24')) });
  cabin.push({ g: new THREE.BoxGeometry(0.5, 1.6, 0.5), m: M4(1.2, 3.8, -0.6), col: C('#8a7a72') });
  const cabinGlow = [{ g: new THREE.BoxGeometry(0.9, 0.7, 0.08), m: M4(-0.9, 1.3, 1.82), col: C('#ffb347') }, { g: new THREE.BoxGeometry(0.9, 0.7, 0.08), m: M4(0.9, 1.3, 1.82), col: C('#ffb347') }];
  place(cabin, -19, 21, 0.35, cabinGlow);
  const chimney = new THREE.Vector3(-19 + 1.2 * Math.cos(0.35) - 0.6 * Math.sin(0.35), L.terrainH(cfg, -19, 21) + 4.7, 21 - 1.2 * Math.sin(0.35) - 0.6 * Math.cos(0.35));
  // lanterns along the path
  const lanterns = [];
  for (let z = 16; z > -186; z -= 13) {
    const x = Math.sin(z * 0.045) * 3 + (Math.round(z / 13) % 2 ? 2.4 : -2.4);
    if (!L.walkable(cfg, 3, x, z) || cfg.gates.some((g) => Math.abs(g.z - z) < 6)) continue;
    place([{ g: new THREE.CylinderGeometry(0.06, 0.08, 1.8, 6), m: M4(0, 0.9, 0), col: C('#3a2c22') }, { g: new THREE.ConeGeometry(0.28, 0.25, 6), m: M4(0, 2.05, 0), col: C('#3a2c22') }], x, z, 0,
      [{ g: sph(10), m: M4(0, 1.82, 0, 0.17, 0.2, 0.17), col: C('#ffb347') }]);
    lanterns.push([x, z]);
  }
  // stumps and branches the birds sit on, mounds the shy ones hide in
  const perch = {};
  for (const s of [...cfg.species, ...cfg.rares.map((r) => ({ ...L.speciesById(cfg, r.base), ...r }))]) {
    if (s.perch) { place([{ g: new THREE.CylinderGeometry(0.32, 0.42, s.perch, 10), m: M4(0, s.perch / 2, 0), col: (n) => (n.y > 0.7 ? C('#f4f9ff') : C('#7a5236')) }, { g: sph(10), m: M4(0, s.perch + 0.02, 0, 0.38, 0.1, 0.38), col: W }], s.home[0], s.home[1]); perch[s.id] = s.perch; }
    if (s.shy) place([{ g: sph(16), m: M4(0, 0, 0, 1.0, 0.55, 0.9), col: (n) => W.clone().multiplyScalar(0.86 + 0.14 * n.y) }, { g: sph(10), m: M4(0, 0.12, 0.72, 0.36, 0.26, 0.2), col: C('#3a4a6a') }], s.home[0], s.home[1] - 0.8);
  }
  // berry bushes, reeds, a beaver dam, ice floes
  for (let i = 0; i < 14; i++) { const x = (R() - 0.5) * 50, z = 10 - R() * 190; if (!L.walkable(cfg, 3, x, z) || !clearOf(x, z, 3) || Math.hypot(x - lake[0], z - lake[1]) < lake[2] + 2) continue; place([{ g: sph(10), m: M4(0, 0.45, 0, 0.8, 0.55, 0.7), col: (n) => (n.y > 0.55 ? W : C('#3a6a4a')) }, { g: sph(6), m: M4(0.4, 0.55, 0.45, 0.09, 0.09, 0.09), col: C('#e8384a') }, { g: sph(6), m: M4(-0.3, 0.7, 0.4, 0.09, 0.09, 0.09), col: C('#e8384a') }, { g: sph(6), m: M4(0.1, 0.4, 0.6, 0.09, 0.09, 0.09), col: C('#e8384a') }], x, z, R() * 6); }
  place([0, 1, 2, 3, 4].map((i) => ({ g: new THREE.CylinderGeometry(0.16, 0.18, 2.4, 7), m: M4(Math.sin(i) * 0.4, 0.2 + i * 0.12, (i - 2) * 0.3, 1, 1, 1, 0, i * 0.5, Math.PI / 2 + 0.2), col: C('#7a5236') })), -18, -87, 0.6);
  for (let i = 0; i < 6; i++) { const a = i * 1.05 + 0.3, r = lake[2] * (0.45 + 0.35 * R()); const fl = new THREE.Mesh(keep(new THREE.CylinderGeometry(1, 1.1, 0.18, 7)), keep(new THREE.MeshStandardMaterial({ color: 0xf2f9ff, roughness: 0.5 }))); fl.position.set(lake[0] + Math.cos(a) * r, -0.02, lake[1] + Math.sin(a) * r); fl.scale.set(0.8 + R(), 1, 0.6 + R() * 0.8); fl.rotation.y = R() * 6; fl.receiveShadow = true; scene.add(fl); props.push(fl); }
  // ice caves: crystal clusters that glow and a frozen waterfall
  const crystal = (x, z, k) => { const items = []; for (let i = 0; i < 5; i++) { const a = i * 1.3, h = 0.8 + ((i * 7) % 5) * 0.35; items.push({ g: new THREE.OctahedronGeometry(1, 0), m: M4(Math.cos(a) * 0.35, h * 0.5, Math.sin(a) * 0.35, 0.22, h * 0.6, 0.22, Math.cos(a) * 0.3, 0, Math.sin(a) * 0.3), col: C(k ? '#9a7dff' : '#5cd8f2') }); } place([{ g: sph(8), m: M4(0, 0.05, 0, 0.8, 0.2, 0.8), col: C('#c8d6f2') }], x, z, 0, items); };
  for (let i = 0; i < 16; i++) { const a = R() * 6.28, r = 12 + R() * 16, x = Math.cos(a) * r * 0.95, z = -154 + Math.sin(a) * r; if (!clearOf(x, z, 3)) continue; crystal(x, z, i % 3 === 0); }
  place([{ g: new THREE.CylinderGeometry(2.2, 3.2, 9, 14, 1, true, 0, Math.PI), m: M4(0, 4.5, 0), col: C('#bfeaff') }], 0, -186, Math.PI);
  // ice gates: a wall of shards across each corridor, gone when the area opens
  // gate ice: deep blue at the foot, frosted white tips and edges, and a slow glint sweeping across the shards
  const gateMat = keep(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.12, metalness: 0.1, transparent: true, opacity: 0.9, emissive: 0x2a9ad8, emissiveIntensity: 0.6 }));
  gateMat.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = uTime;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vGl;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvGl = position;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform float uTime; varying vec3 vGl;')
      .replace('#include <color_fragment>', '#include <color_fragment>\nfloat gh = smoothstep(0.3, 4.2, vGl.y); float gr = pow(1.0 - saturate(dot(normalize(vNormal), normalize(vViewPosition))), 2.0);\ndiffuseColor.rgb = mix(diffuseColor.rgb * vec3(0.55, 0.75, 1.0), mix(diffuseColor.rgb, vec3(0.9, 0.97, 1.0), 0.6), gh);\ndiffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.95, 0.99, 1.0), gr * 0.6);')
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n{ float sw = fract(vGl.x * 0.09 + vGl.y * 0.05 - uTime * 0.16); totalEmissiveRadiance += vec3(0.75, 0.95, 1.0) * smoothstep(0.05, 0.0, abs(sw - 0.5)) * 1.1; }');
  };
  const gates = cfg.gates.map((g) => {
    const items = []; for (let i = 0; i < 9; i++) { const x = -4.6 + i * 1.15, h = 3 + ((i * 5) % 4) * 0.9; items.push({ g: new THREE.OctahedronGeometry(1, 0), m: M4(x, h * 0.45, 0, 0.66, h * 0.62, 0.5, 0, i * 0.4, (i - 4) * 0.05), col: C(i % 2 ? '#6cc8ff' : '#9ae6ff') }); }
    const mesh = new THREE.Mesh(keep(merge(items)), gateMat);
    mesh.position.set(0, L.terrainH(cfg, 0, g.z), g.z); mesh.castShadow = true; scene.add(mesh);
    return { mesh, rest: null, z: g.z, area: g.area };
  });

  /** Gate dressing built after the first frame: the stumps left when a gate breaks, and drifts on its approach. */
  const dressGates = () => { for (const G of gates) {
    // what is left once it breaks: low ice stumps lining both sides of the way through, shown when the gate opens
    const st = []; for (let i = 0; i < 6; i++) { const sx = i % 2 ? 1 : -1, k = (i >> 1) - 1, h = 1.0 + ((i * 3) % 4) * 0.3; st.push({ g: new THREE.OctahedronGeometry(1, 0), m: M4(sx * (3.8 + (Math.abs(k) % 2) * 0.6), h * 0.3, -1.5 - k * 3.4, 0.62, h * 0.6, 0.55, 0.15 * sx, i, -0.25 * sx), col: C(i % 3 ? '#6cc8ff' : '#9ae6ff') }); }
    G.rest = new THREE.Mesh(keep(merge(st)), G.mesh.material); G.rest.position.copy(G.mesh.position); G.rest.visible = !G.mesh.visible; G.rest.castShadow = true; scene.add(G.rest);
    // the approach: drifts heaped against the ice and fallen chips on the near side, off the trodden path
    const ap = []; for (let i = 0; i < 6; i++) { const sx = i % 2 ? 1 : -1, k = i >> 1, x = sx * (2.8 + k * 0.8), z = 2 + k * 2.6;
      ap.push({ g: sph(9), m: M4(x, 0, z, 1.3 - k * 0.2, 0.38, 0.9), col: (n) => C('#f2f7ff').lerp(C('#a9c6ec'), Math.max(0, 0.55 - n.y) * 0.9) });
      ap.push({ g: new THREE.OctahedronGeometry(1, 0), m: M4(x - sx * 0.6, 0.15, z + 0.4, 0.22, 0.3, 0.18, 0.5, i, 0.4 * sx), col: C('#8fd8ff') }); }
    const approach = new THREE.Mesh(keep(merge(ap)), propMat); approach.position.copy(G.mesh.position); approach.receiveShadow = true; scene.add(approach);
  } };

  // ---- falling snow (three depths, wraps around the hero)
  const snowU = { uTime, uPush, uOrigin: { value: new THREE.Vector3() }, uSize: { value: 1 }, uAlpha: { value: 0.85 } };
  const snowMat = keep(new THREE.ShaderMaterial({ uniforms: snowU, transparent: true, depthWrite: false, fog: false,
    vertexShader: `uniform float uTime; uniform float uPush; uniform vec3 uOrigin; uniform float uSize; attribute float aS; varying float vA;
      void main(){ vec3 box = vec3(44.0, 22.0, 44.0); vec3 p = position + vec3(sin(uTime * 0.3 + position.y) * 1.2 + uTime * 0.6 + uPush, -uTime * (0.9 + aS * 0.7), 0.0);
      p = mod(p - uOrigin + box * 0.5, box) - box * 0.5 + uOrigin; p.y += 6.0;
      vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_Position = projectionMatrix * mv; gl_PointSize = uSize * (40.0 + aS * 70.0) / -mv.z; vA = smoothstep(60.0, 20.0, -mv.z); }`,
    fragmentShader: 'uniform float uAlpha; varying float vA; void main(){ vec2 d = gl_PointCoord - 0.5; float a = smoothstep(0.5, 0.15, length(d)); gl_FragColor = vec4(vec3(1.0), a * vA * uAlpha); }' }));
  let snow = null;
  const makeSnow = (n) => {
    if (snow) { scene.remove(snow); snow.geometry.dispose(); }
    const g = new THREE.BufferGeometry(), p = new Float32Array(n * 3), s = new Float32Array(n);
    for (let i = 0; i < n; i++) { p.set([(R() - 0.5) * 44, (R() - 0.5) * 22, (R() - 0.5) * 44], i * 3); s[i] = R(); }
    g.setAttribute('position', new THREE.BufferAttribute(p, 3)); g.setAttribute('aS', new THREE.BufferAttribute(s, 1));
    snow = new THREE.Points(g, snowMat); snow.frustumCulled = false; scene.add(snow);
  };

  // ---- post-processing (HDR target, selective glow by threshold, tone mapping and grade)
  const quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1), quadScene = new THREE.Scene();
  const quad = new THREE.Mesh(keep(new THREE.PlaneGeometry(2, 2)), null); quad.frustumCulled = false; quadScene.add(quad);
  const G = cfg.grade;
  const brightMat = keep(new THREE.ShaderMaterial({ uniforms: { tIn: { value: null }, uTh: { value: G.bloomThreshold } }, vertexShader: QUAD_VS, fragmentShader: BRIGHT_FS, depthTest: false, depthWrite: false }));
  const blurMat = keep(new THREE.ShaderMaterial({ uniforms: { tIn: { value: null }, uDir: { value: new THREE.Vector2() } }, vertexShader: QUAD_VS, fragmentShader: BLUR_FS, depthTest: false, depthWrite: false }));
  const black = keep(new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1)); black.needsUpdate = true;
  const compMat = keep(new THREE.ShaderMaterial({ uniforms: { tScene: { value: null }, tBloom: { value: black }, uExp: { value: G.exposure }, uBloom: { value: G.bloomStrength }, uSat: { value: G.sat }, uVig: { value: G.vignette }, uCon: { value: G.contrast || 0 }, uLift: { value: new THREE.Vector3(...G.lift) }, uGain: { value: new THREE.Vector3(...G.gain) } }, vertexShader: QUAD_VS, fragmentShader: COMP_FS, depthTest: false, depthWrite: false }));
  const hdrType = renderer.capabilities.isWebGL2 && (renderer.extensions.has('EXT_color_buffer_float') || renderer.extensions.has('EXT_color_buffer_half_float')) ? THREE.HalfFloatType : THREE.UnsignedByteType;
  let rtScene = null, rtA = null, rtB = null, tier = 1, W0 = 1, H0 = 1, boot = true;
  const pass = (mat, target) => { quad.material = mat; renderer.setRenderTarget(target); renderer.render(quadScene, quadCam); };

  /** The first frames draw at quality.bootDpr (fewer pixels while the page is still busy), then at the tier's. */
  // the first frames skip the shadow pass (same shader keys, so nothing recompiles when it starts after boot)
  function endBoot() { if (!boot) return; boot = false; renderer.shadowMap.autoUpdate = true; renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, cfg.quality.dpr[tier])); resize(W0, H0, true); }
  /** Compiles the first frame's shaders, each against the target it draws into (the program key includes it). */
  function warm() {
    const into = (rt, fn) => { renderer.setRenderTarget(rt); try { return fn(); } finally { renderer.setRenderTarget(null); } };
    if (tier > 0 && rtA) for (const m of [brightMat, blurMat]) { quad.material = m; into(rtA, () => renderer.compile(quadScene, quadCam)); }
    if (tier > 0) { quad.material = compMat; renderer.compile(quadScene, quadCam); }
    return into(tier === 0 ? null : rtScene, () => (renderer.compileAsync ? renderer.compileAsync(scene, camera) : renderer.compile(scene, camera)));
  }
  /** Applies quality tier 0 (light), 1 (mid) or 2 (high). */
  function setTier(t) {
    tier = Math.max(0, Math.min(2, t)); const Q = cfg.quality;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, Q.dpr[tier], boot ? Q.bootDpr : 9)); renderer.shadowMap.autoUpdate = !boot;
    sun.castShadow = Q.shadow[tier] > 0;
    if (Q.shadow[tier] > 0 && sun.shadow.mapSize.x !== Q.shadow[tier]) { sun.shadow.mapSize.set(Q.shadow[tier], Q.shadow[tier]); if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; } }
    renderer.shadowMap.enabled = Q.shadow[tier] > 0;
    scene.traverse((o) => { if (o.material && o.material.needsUpdate !== undefined) o.material.needsUpdate = true; });
    makeSnow(Q.snow[tier]);
    resize(W0, H0, true);
  }
  function resize(w, h, force) {
    if (!force && w === W0 && h === H0) return; W0 = w; H0 = h;
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
    for (const rt of [rtScene, rtA, rtB]) if (rt) rt.dispose();
    rtScene = rtA = rtB = null;
    if (tier > 0) {
      const pr = renderer.getPixelRatio(), pw = Math.round(w * pr), ph = Math.round(h * pr);
      rtScene = new THREE.WebGLRenderTarget(pw, ph, { type: hdrType, samples: cfg.quality.msaa[tier] });
      if (cfg.quality.bloom[tier]) { rtA = new THREE.WebGLRenderTarget(Math.max(1, pw >> 2), Math.max(1, ph >> 2), { type: hdrType }); rtB = rtA.clone(); }
    }
    // tier 0 has no grade pass: neutral tone mapping keeps the snow white and the colours close to the graded look
    renderer.toneMapping = tier > 0 ? THREE.NoToneMapping : THREE.NeutralToneMapping; renderer.toneMappingExposure = G.tier0Exposure || G.exposure;
  }

  // ---- time of day
  const tmp = new THREE.Color();
  const blend = (w, key) => { const out = new THREE.Color(0, 0, 0); for (const n in w) if (w[n] > 0) out.add(tmp.copy(C(Array.isArray(cfg.tod[n][key]) ? cfg.tod[n][key][0] : cfg.tod[n][key])).multiplyScalar(w[n])); return out; };
  const blend2 = (w, key, i) => { const out = new THREE.Color(0, 0, 0); for (const n in w) if (w[n] > 0) out.add(tmp.copy(C(cfg.tod[n][key][i])).multiplyScalar(w[n])); return out; };
  const num = (w, key) => { let s = 0; for (const n in w) s += cfg.tod[n][key] * w[n]; return s; };
  let night = 0, fogK = 1;
  /** Sets light, sky, fog and glow for clock weights w ({ day, dusk, night, dawn }). */
  function setTod(w) {
    skyU.uTop.value.copy(blend2(w, 'sky', 0)); skyU.uHor.value.copy(blend2(w, 'sky', 1));
    fog.color.copy(blend(w, 'fog')); fog.density = num(w, 'fogD') * fogK;
    sun.color.copy(blend(w, 'sun')); sun.intensity = num(w, 'sunI');
    hemi.color.copy(blend2(w, 'hemi', 0)); hemi.groundColor.copy(blend2(w, 'hemi', 1)); hemi.intensity = num(w, 'hemiI');
    skyU.uAur.value = num(w, 'aurora'); skyU.uStars.value = w.night + w.dusk * 0.3 + w.dawn * 0.3; night = w.night + w.dusk * 0.4 + w.dawn * 0.3;
    const sunUp = cfg.grade.sunUp - w.dusk * 0.55 - w.night * 0.2 - w.dawn * 0.5;
    sunDir.set(0.45 - w.dusk * 0.5, Math.max(0.12, sunUp), 0.35).normalize();
    if (w.night > 0.5) sunDir.set(-0.35, 0.7, 0.3).normalize(); // the moon
    skyU.uSunDir.value.copy(sunDir); skyU.uSunCol.value.copy(sun.color).multiplyScalar(w.night > 0.5 ? 0.35 : 1);
    if (glowMat.userData.sh) glowMat.userData.sh.uniforms.uGlowK.value = 0.6 + night * 1.2;
    lampU.value.w = Math.max(0, night - 0.15) * cfg.grade.lanternI;
  }

  // ---- camera
  const camPos = new THREE.Vector3(0, 12, 14), camLook = new THREE.Vector3(), tmpV = new THREE.Vector3();
  const shake = { t: 0, a: 0 };
  /**
   * Moves the camera: follow behind the hero, blend `vf` (0..1) toward the viewfinder looking at `aim`, or toward a
   * cinematic `beat` ({ pos, look, k }). `focus` ({ x, y, z, k }) pulls the follow camera in low and close to frame the
   * hero with a nearby animal (treat moments). Eased per frame.
   */
  function updateCamera(dt, hero, vf, aim, fovVf, beat, focus) {
    const c = cfg.camera;
    const fx = hero.x, fz = hero.z, fy = hero.y;
    // a look swipe turns the eased camera with it, so a fast spin orbits the hero instead of cutting through it
    const dYaw = lookRot.yaw - lastYaw; lastYaw = lookRot.yaw;
    if (dYaw) for (const v of [camPos, camLook]) { const rx = v.x - fx, rz = v.z - fz, cs = Math.cos(dYaw), sn = Math.sin(dYaw); v.x = fx + rx * cs + rz * sn; v.z = fz - rx * sn + rz * cs; }
    // hills, rocks, lamps and closed ice gates between the hero and the camera first lift it (up to liftMax), then pull
    // it in (fast in, slow out) never closer than minDistM, so the hero always stays in view
    let want = 0, cf = 0;
    for (let e = 0; e <= c.liftMax + 1e-6; e += c.liftMax / 3) { const o = orbit(e); cf = clearFrac(fx, fy, fz, o[0], o[1], o[2]); want = e; if (cf > 0.85) break; }
    lift += (want - lift) * (1 - Math.exp(-dt * (want > lift ? 10 : 2)));
    let [ox, oy, oz, ax, az] = orbit(lift);
    { const r = Math.hypot(ox, oy, oz), cl = Math.max(Math.min(1, c.minDistM / r), clearFrac(fx, fy, fz, ox, oy, oz));
      pull += (cl - pull) * (1 - Math.exp(-dt * (cl < pull ? 14 : 2.5))); ox *= pull; oy *= pull; oz *= pull; }
    const follow = tmpV.set(fx + ox, fy + oy, fz + oz);
    let look = new THREE.Vector3(fx + ax, fy + c.lookUp, fz + az);
    let pos = follow.clone(), fov = c.fov;
    if (focus && focus.k > 0.001) {
      // frame the hero and the animal together from the player's side of the pair
      const fm = Math.min(c.focusMix, c.focusShiftM / (Math.hypot(focus.x - fx, focus.z - fz) || 1)), mx = fx + (focus.x - fx) * fm, mz = fz + (focus.z - fz) * fm, sy = Math.sin(lookRot.yaw), cy = Math.cos(lookRot.yaw);
      const back = c.dist * c.focusD + Math.abs((focus.x - fx) * sy + (focus.z - fz) * cy) / 2;
      pos.lerp(new THREE.Vector3(mx + sy * back, fy + c.height * c.focusH, mz + cy * back), focus.k);
      look.lerp(new THREE.Vector3(mx, fy + (focus.y - fy) * fm + 0.6, mz), focus.k);
    }
    if (vf > 0.001 && aim) {
      const dir = new THREE.Vector3(aim.x - fx, 0, aim.z - fz); const d = dir.length() || 1; dir.divideScalar(d);
      const vp = new THREE.Vector3(fx - dir.x * c.vfDist, fy + c.vfHeight, fz - dir.z * c.vfDist);
      pos.lerp(vp, vf); look.lerp(new THREE.Vector3(aim.x, aim.y, aim.z), vf); fov += (fovVf - fov) * vf;
    }
    if (beat && beat.k > 0) { pos.lerp(beat.pos, beat.k); look.lerp(beat.look, beat.k); fov += ((beat.fov || 42) - fov) * beat.k; }
    const k = 1 - Math.exp(-dt * c.follow * (vf > 0.5 || (beat && beat.k > 0) ? 1.6 : 1));
    camPos.lerp(pos, k); camLook.lerp(look, k);
    // keep the camera above the ground
    const gy = L.terrainH(cfg, camPos.x, camPos.z) + 1.2; if (camPos.y < gy) camPos.y = gy;
    camera.position.copy(camPos);
    if (shake.t > 0) { shake.t -= dt; const s = shake.a * Math.max(0, shake.t) * 4; camera.position.x += Math.sin(shake.t * 61) * s; camera.position.y += Math.sin(shake.t * 47 + 1) * s; }
    camera.lookAt(camLook);
    if (Math.abs(camera.fov - fov) > 0.01) { camera.fov = fov; camera.updateProjectionMatrix(); }
    // shadows follow the hero
    sun.position.set(fx + sunDir.x * 30, fy + sunDir.y * 30, fz + sunDir.z * 30); sun.target.position.set(fx, fy, fz - 3); sun.target.updateMatrixWorld();
    snowU.uOrigin.value.set(fx, fy, fz - 6);
    heroU.value.set(fx, fy + 1.1, fz);
    lampU.value.set(fx - 0.4, fy, fz + 0.5, lampU.value.w);
  }
  // swipe-to-look: yaw orbits the follow camera around the hero, el tilts it (radians, 0 = the authored view)
  const lookRot = { yaw: 0, el: 0 };
  let lastYaw = 0, pull = 1, lift = 0;
  /** Is this point inside a hill, a rock or a closed ice gate? */
  function solidAt(x, y, z) {
    if (y < L.terrainH(cfg, x, z) + 0.7) return true;
    for (const r of rockS) { const dx = x - r[0], dz = z - r[1]; if (dx * dx + dz * dz < r[2] * r[2] * 1.3 && y < L.terrainH(cfg, r[0], r[1]) + r[2] * 1.1) return true; }
    for (const l of lanterns) { const dx = x - l[0], dz = z - l[1]; if (dx * dx + dz * dz < 0.36 && y < L.terrainH(cfg, l[0], l[1]) + 3) return true; }
    for (const g of gates) if (g.mesh.visible && Math.abs(z - g.mesh.position.z) < 1 && Math.abs(x) < 6 && y < g.mesh.position.y + 5.5) return true;
    return false;
  }
  /** How much of the hero-to-camera line (0..1) is clear, sampled from the hero's head out. */
  function clearFrac(fx, fy, fz, ox, oy, oz) {
    const n = 12, hy = fy + 1.2;
    for (let i = 1; i <= n; i++) { const t = i / n; if (solidAt(fx + ox * t, hy + (fy + oy - hy) * t, fz + oz * t)) return Math.max(0, (i - 1.5) / n); }
    return 1;
  }
  /** Sets the player's look offset; the follow camera orbits the hero by it. */
  function setLook(yaw, el) { lookRot.yaw = yaw; lookRot.el = el; }
  /** Follow offset [x, y, z] and look-ahead [x, z] after the player's yaw and tilt. */
  function orbit(up = 0) {
    const c = cfg.camera, r = Math.hypot(c.height, c.dist), e = Math.min(1.35, Math.atan2(c.height, c.dist) + lookRot.el + up);
    const h = Math.sin(e) * r, d = Math.cos(e) * r, sy = Math.sin(lookRot.yaw), cy = Math.cos(lookRot.yaw);
    return [sy * d, h, cy * d, sy * c.lookAhead, cy * c.lookAhead];
  }
  function snapCamera(hero) { lastYaw = lookRot.yaw; pull = 1; lift = 0; const [ox, oy, oz, ax, az] = orbit(); camPos.set(hero.x + ox, hero.y + oy, hero.z + oz); camLook.set(hero.x + ax, hero.y + cfg.camera.lookUp, hero.z + az); }

  // ---- render
  const sceneInfo = { calls: 0, tris: 0 };
  const keepInfo = () => { sceneInfo.calls = renderer.info.render.calls; sceneInfo.tris = renderer.info.render.triangles; };
  function render() {
    if (tier === 0) { renderer.setRenderTarget(null); renderer.render(scene, camera); keepInfo(); return; }
    renderer.setRenderTarget(rtScene); renderer.render(scene, camera); keepInfo();
    let bloomTex = black;
    if (rtA) {
      brightMat.uniforms.tIn.value = rtScene.texture; pass(brightMat, rtA);
      for (let i = 0; i < 2; i++) {
        blurMat.uniforms.tIn.value = rtA.texture; blurMat.uniforms.uDir.value.set((1 + i) / rtA.width, 0); pass(blurMat, rtB);
        blurMat.uniforms.tIn.value = rtB.texture; blurMat.uniforms.uDir.value.set(0, (1 + i) / rtA.height); pass(blurMat, rtA);
      }
      bloomTex = rtA.texture;
    }
    compMat.uniforms.tScene.value = rtScene.texture; compMat.uniforms.tBloom.value = bloomTex; compMat.uniforms.uBloom.value = G.bloomStrength;
    pass(compMat, null);
  }

  // ---- photo capture: the photo camera's view, graded, into a small canvas
  const pw = cfg.photo.w, ph = cfg.photo.h;
  const rtPh = new THREE.WebGLRenderTarget(pw, ph, { type: hdrType, samples: 0 }), rtPl = new THREE.WebGLRenderTarget(pw, ph);
  const photoCam = new THREE.PerspectiveCamera(40, pw / ph, 0.3, 300);
  const pixels = new Uint8Array(pw * ph * 4);
  /** Renders the view from `from` looking at `at` with `fov` into a new canvas. `focus` ({ p: subject centre, k: 0..1 of the half
   * height }) keeps that much around the subject sharp and softens the rest like a shallow lens. */
  function capture(from, at, fov, studio = null, focus = null) {
    photoCam.position.copy(from); photoCam.fov = fov; photoCam.aspect = pw / ph; photoCam.updateProjectionMatrix(); photoCam.lookAt(at);
    const tm = renderer.toneMapping; renderer.toneMapping = THREE.NoToneMapping;
    renderer.setRenderTarget(rtPh); renderer.render(studio || scene, photoCam);
    compMat.uniforms.tScene.value = rtPh.texture; compMat.uniforms.tBloom.value = black; pass(compMat, rtPl);
    renderer.readRenderTargetPixels(rtPl, 0, 0, pw, ph, pixels); renderer.setRenderTarget(null); renderer.toneMapping = tm;
    const cv = document.createElement('canvas'); cv.width = pw; cv.height = ph; const g = cv.getContext('2d'), img = g.createImageData(pw, ph);
    for (let y = 0; y < ph; y++) img.data.set(pixels.subarray((ph - 1 - y) * pw * 4, (ph - y) * pw * 4), y * pw * 4);
    // a printed photo: more contrast and colour than the screen, a touch warm, soft corners
    if (!studio) {
      const P = cfg.photo, d = img.data, k = P.printContrast, sat = P.printSat;
      for (let y = 0; y < ph; y++) for (let x = 0; x < pw; x++) {
        const i = (y * pw + x) * 4, vx = x / pw - 0.5, vy = y / ph - 0.5, vig = 1 - P.printVignette * (vx * vx + vy * vy) * 2;
        let r = d[i], gg = d[i + 1], b = d[i + 2]; const l = 0.299 * r + 0.587 * gg + 0.114 * b;
        r = l + (r - l) * sat; gg = l + (gg - l) * sat; b = l + (b - l) * sat;
        d[i] = Math.max(0, Math.min(255, ((r - 128) * k + 128) * vig * 1.03)); d[i + 1] = Math.max(0, Math.min(255, ((gg - 128) * k + 128) * vig)); d[i + 2] = Math.max(0, Math.min(255, ((b - 128) * k + 128) * vig * 0.97));
      }
    }
    g.putImageData(img, 0, 0);
    // a shallow lens and a soft flash: the background melts away from the subject and highlights bloom gently.
    // Phones without canvas filters keep the plain print.
    const D = cfg.photo.depth;
    if (!studio && D && typeof g.filter === 'string') {
      const b = document.createElement('canvas'); b.width = pw; b.height = ph; const bg = b.getContext('2d');
      if (focus) {
        bg.filter = `blur(${D.blurPx}px)`; bg.drawImage(cv, 0, 0); bg.filter = 'none';
        const q = focus.p.clone().project(photoCam), cx = (q.x + 1) / 2 * pw, cy = (1 - q.y) / 2 * ph;
        const r0 = ph * 0.5 * focus.k, gr = bg.createRadialGradient(cx, cy, r0, cx, cy, r0 + ph * D.featherK);
        gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,1)'); bg.globalCompositeOperation = 'destination-in'; bg.fillStyle = gr; bg.fillRect(0, 0, pw, ph);
        g.drawImage(b, 0, 0); bg.globalCompositeOperation = 'source-over'; bg.clearRect(0, 0, pw, ph);
      }
      bg.filter = `blur(${D.glowPx}px) brightness(${D.glowBright})`; bg.drawImage(cv, 0, 0); bg.filter = 'none';
      g.globalCompositeOperation = 'screen'; g.globalAlpha = D.glow; g.drawImage(b, 0, 0); g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
    }
    return cv;
  }

  /** Screen position (0..1, y down) of a world point, and whether it is in front of the camera. */
  const proj = new THREE.Vector3();
  function toScreen(x, y, z) { proj.set(x, y, z).project(camera); return [(proj.x + 1) / 2, (1 - proj.y) / 2, proj.z < 1]; }

  /** Opens a gate (hides its wall). Returns its world position for effects. */
  function openGate(i) { const g = gates[i]; if (!g || !g.mesh.visible) return null; g.mesh.visible = false; if (g.rest) g.rest.visible = true; return g.mesh.position.clone(); }
  function gateShown(i) { return gates[i] && gates[i].mesh.visible; }

  function stats() { const i = renderer.info; return { calls: sceneInfo.calls, tris: sceneInfo.tris, geos: i.memory.geometries, tex: i.memory.textures, tier }; }

  function dispose() {
    for (const o of disposables) o.dispose && o.dispose();
    for (const rt of [rtScene, rtA, rtB, rtPh, rtPl]) rt && rt.dispose();
    if (snow) snow.geometry.dispose();
    scene.traverse((o) => { if (o.isMesh && o.geometry) o.geometry.dispose(); });
    renderer.dispose(); try { renderer.forceContextLoss(); } catch (e) { /* already lost */ }
  }

  setTod({ day: 1, dusk: 0, night: 0, dawn: 0 });
  return {
    renderer, scene, camera, uTime, uGust, uPush, tops, trunks, chimney, lanterns, perch, gates, shake, propMat,
    setTier, resize, endBoot, warm, setTod, updateCamera, snapCamera, setLook, render, capture, toScreen, openGate, gateShown, stats, dispose, buildGround: () => { buildGround(); dressGates(); dressFields(); },
    get tier() { return tier; }, get pull() { return pull; }, get night() { return night; }, lamp: lampU, set fogK(v) { fogK = v; },
    setGlint(v) { if (terrainMat.userData.sh) terrainMat.userData.sh.uniforms.uGlint.value = v; },
  };
}
