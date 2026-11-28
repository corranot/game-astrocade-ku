// PROTOTYPE - NOT FOR PRODUCTION
// The 3D world: renderer, fixed-direction follow camera, one sun with a soft shadow, the look per district, quality
// tiers with a small post chain (selective bloom, filmic tone map, grade, vignette), and the garden dressing
// (fence, gate, cottage, trees, beds, pond and the far layers). THREE is read when the world is built.
import { paint, xf, merge, lathe, rbox, blob, cyl, slab, mesh } from './kit.js';
import { GATE_HALF_M, rng } from './logic.js';

const QUAD_VS = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';
const BRIGHT_FS = 'uniform sampler2D tIn; varying vec2 vUv; void main(){ vec3 c = texture2D(tIn, vUv).rgb; float l = max(c.r, max(c.g, c.b)); gl_FragColor = vec4(c * smoothstep(1.05, 1.6, l), 1.0); }';
const BLUR_FS = 'uniform sampler2D tIn; uniform vec2 uDir; varying vec2 vUv; void main(){ vec3 c = texture2D(tIn, vUv).rgb * 0.227; for (int i = 1; i < 5; i++) { float w = i == 1 ? 0.194 : i == 2 ? 0.121 : i == 3 ? 0.054 : 0.016; c += (texture2D(tIn, vUv + uDir * float(i)).rgb + texture2D(tIn, vUv - uDir * float(i)).rgb) * w; } gl_FragColor = vec4(c, 1.0); }';
const COMP_FS = `uniform sampler2D tScene; uniform sampler2D tBloom; uniform float uExp; uniform float uBloom; uniform float uVig; uniform vec3 uGrade; uniform vec3 uVigCol; uniform float uPulse; varying vec2 vUv;
vec3 film(vec3 x) { x *= uExp; vec3 a = x * (x * 2.2 + 0.06); vec3 b = x * (x * 2.1 + 0.62) + 0.12; return clamp(a / b, 0.0, 1.0); }
void main(){ vec3 c = texture2D(tScene, vUv).rgb + texture2D(tBloom, vUv).rgb * uBloom; c = film(c) * uGrade;
  float l = dot(c, vec3(0.299, 0.587, 0.114)); c = mix(vec3(l), c, 1.12);
  vec2 d = vUv - 0.5; float v = smoothstep(0.35, 0.95, length(d * vec2(1.0, 1.25))); c = mix(c, uVigCol, v * (uVig + uPulse));
  gl_FragColor = vec4(pow(clamp(c, 0.0, 0.985), vec3(1.0 / 2.2)), 1.0); }`;

/** Builds the renderer, scene, camera, lights and post chain on `canvas`. */
export function createWorld(canvas, cfg, opts = {}) {
  const THREE = window.THREE, Q = cfg.quality, C = cfg.camera;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', preserveDrawingBuffer: !!opts.keep });
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap; renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene(); scene.background = new THREE.Color('#d8f0ec'); scene.fog = new THREE.Fog('#d8f0ec', 34, 78);
  const camera = new THREE.PerspectiveCamera(C.fov, 0.5, 1, 140);
  const hemi = new THREE.HemisphereLight(0xcfeaff, 0x7fb35a, 1.25); scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff1d2, 2.3); sun.castShadow = true; scene.add(sun, sun.target);
  const sc = sun.shadow.camera; sc.left = -15; sc.right = 15; sc.top = 20; sc.bottom = -14; sc.near = 1; sc.far = 80; sun.shadow.bias = -0.0008; sun.shadow.normalBias = 0.04; sun.shadow.radius = 3; sun.shadow.intensity = 0.5;
  const sunDir = new THREE.Vector3();

  // shared materials: matte paint, glossy enamel, leaves that sway, emissive glints (the only thing that blooms)
  const M = {
    matte: new THREE.MeshLambertMaterial({ vertexColors: true }),
    enamel: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.34, metalness: 0.0 }),
    rubber: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, metalness: 0.0 }),
    leaf: new THREE.MeshLambertMaterial({ vertexColors: true }),
    water: new THREE.MeshStandardMaterial({ color: 0x6fc3d8, roughness: 0.25, metalness: 0.0, transparent: true, opacity: 0.86 }),
    glow: new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 1.9, 1.1), toneMapped: false }),
    lamp: new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.05, 0.42), toneMapped: false }), // a warm lantern glass
    // a soft pool of warm light laid over the grass under a lantern (additive, no depth write)
    pool: new THREE.ShaderMaterial({ transparent: true, depthWrite: false, vertexColors: true, blending: THREE.AdditiveBlending, uniforms: { uCol: { value: new THREE.Color(1.0, 0.6, 0.22) }, uK: { value: cfg.comfort.poolK } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = color.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }', // the quad's own 0..1 coordinates ride in the colour attribute (merged geometry keeps no uv)
      fragmentShader: 'varying vec2 vUv; uniform vec3 uCol; uniform float uK; void main(){ float a = smoothstep(1.0, 0.0, length(vUv - 0.5) * 2.0); gl_FragColor = vec4(uCol * a * a * uK, 1.0); }' }),
    ground: new THREE.MeshLambertMaterial({ color: 0x6aa64a }),
    felt: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0.0 }),
    wing: new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide, transparent: true, opacity: 0.88 }),
  };
  // the meadow outside the fences: soft patches of lighter and darker green and fine speckle, never a flat fill
  M.ground.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec2 vXZ;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvXZ = (modelMatrix * vec4(position, 1.0)).xz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec2 vXZ;\nfloat gh(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }\nfloat gn(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(gh(i), gh(i + vec2(1.0, 0.0)), f.x), mix(gh(i + vec2(0.0, 1.0)), gh(i + vec2(1.0, 1.0)), f.x), f.y); }')
      .replace('#include <color_fragment>', 'float pn = gn(vXZ * 0.35) * 0.6 + gn(vXZ * 1.3) * 0.4; float sp = gh(floor(vXZ * 26.0)); diffuseColor.rgb *= 0.84 + 0.26 * pn + 0.07 * sp;');
  };
  const timeU = { value: 0 };
  M.leaf.onBeforeCompile = (sh) => { sh.uniforms.uT = timeU; sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float uT;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvec4 wp0 = modelMatrix * vec4(position, 1.0); float sw = sin(uT * 1.2 + wp0.x * 0.5 + wp0.z * 0.4) * 0.035 * max(0.0, position.y); transformed.x += sw; transformed.z += sw * 0.6;'); };

  // far layers: a wide meadow under everything and soft hill bands behind, so the top of a portrait frame is composed
  const far = new THREE.Group(); scene.add(far);
  // the meadow is long enough for all twelve gardens and the daily one
  const meadow = new THREE.Mesh(new THREE.PlaneGeometry(400, 1400), M.ground); meadow.rotation.x = -Math.PI / 2; meadow.position.set(0, -0.02, -350); meadow.receiveShadow = true; far.add(meadow);

  // ---- post chain
  const hdr = THREE.HalfFloatType, quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2)), quadScene = new THREE.Scene(), quadCam = new THREE.Camera(); quadScene.add(quad); quad.frustumCulled = false;
  const brightMat = new THREE.ShaderMaterial({ uniforms: { tIn: { value: null } }, vertexShader: QUAD_VS, fragmentShader: BRIGHT_FS, depthTest: false, depthWrite: false });
  const blurMat = new THREE.ShaderMaterial({ uniforms: { tIn: { value: null }, uDir: { value: new THREE.Vector2() } }, vertexShader: QUAD_VS, fragmentShader: BLUR_FS, depthTest: false, depthWrite: false });
  const compMat = new THREE.ShaderMaterial({ uniforms: { tScene: { value: null }, tBloom: { value: null }, uExp: { value: cfg.comfort.exposure }, uBloom: { value: cfg.comfort.bloom }, uVig: { value: cfg.comfort.vignette }, uGrade: { value: new THREE.Vector3(1, 1, 1) }, uVigCol: { value: new THREE.Color('#24506a') }, uPulse: { value: 0 } }, vertexShader: QUAD_VS, fragmentShader: COMP_FS, depthTest: false, depthWrite: false });
  let rtScene = null, rtA = null, rtB = null, tier = Q.start, W0 = 1, H0 = 1, post = false, smooth = 0;
  const pass = (mat, target) => { quad.material = mat; renderer.setRenderTarget(target); renderer.render(quadScene, quadCam); };
  function resize(w, h, force) {
    if (!force && w === W0 && h === H0) return; W0 = w; H0 = h;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, Q.dpr[tier])); renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
    for (const rt of [rtScene, rtA, rtB]) if (rt) rt.dispose(); rtScene = rtA = rtB = null;
    if (tier > 0) { const pw = Math.round(w * renderer.getPixelRatio()), ph = Math.round(h * renderer.getPixelRatio()); rtScene = new THREE.WebGLRenderTarget(pw, ph, { type: hdr, samples: tier > 1 ? 4 : 2 }); rtA = new THREE.WebGLRenderTarget(Math.max(1, pw >> 2), Math.max(1, ph >> 2), { type: hdr }); rtB = rtA.clone(); }
  }
  function setTier(k) {
    k = Math.max(0, Math.min(2, k)); if (k === tier && rtScene !== undefined && smooth >= 0) { /* same tier */ }
    tier = k; const size = Q.shadow[k]; renderer.shadowMap.enabled = size > 0; sun.castShadow = size > 0;
    if (size > 0 && sun.shadow.mapSize.x !== size) { sun.shadow.mapSize.set(size, size); if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; } }
    renderer.toneMapping = k > 0 ? THREE.NoToneMapping : THREE.NeutralToneMapping; renderer.toneMappingExposure = cfg.comfort.exposure * 1.05;
    scene.traverse((o) => { if (o.material) for (const m of Array.isArray(o.material) ? o.material : [o.material]) m.needsUpdate = true; });
    resize(W0, H0, true);
  }
  let frame = 0;
  function render(dt) {
    timeU.value += dt; frame++;
    renderer.shadowMap.autoUpdate = frame < 4 || frame % (tier > 1 ? 2 : 3) === 0;
    renderer.info.reset();
    if (tier === 0 || !rtScene) { renderer.setRenderTarget(null); renderer.render(scene, camera); return; }
    renderer.setRenderTarget(rtScene); renderer.render(scene, camera);
    post = smooth > 30; // the glow waits for 30 smooth frames
    if (post) { brightMat.uniforms.tIn.value = rtScene.texture; pass(brightMat, rtA); blurMat.uniforms.tIn.value = rtA.texture; blurMat.uniforms.uDir.value.set(1.4 / rtA.width, 0); pass(blurMat, rtB); blurMat.uniforms.tIn.value = rtB.texture; blurMat.uniforms.uDir.value.set(0, 1.4 / rtA.height); pass(blurMat, rtA); }
    compMat.uniforms.tScene.value = rtScene.texture; compMat.uniforms.tBloom.value = rtA.texture; compMat.uniforms.uBloom.value = post ? cfg.comfort.bloom : 0;
    pass(compMat, null);
  }
  renderer.info.autoReset = false;

  // ---- camera: fixed direction, follows a target with look-ahead
  const pitch = C.pitchDeg * Math.PI / 180, yaw0 = C.yawDeg * Math.PI / 180, camT = new THREE.Vector3(), camAhead = new THREE.Vector3(); let camDist = C.dist[0], shake = 0;
  const cam = { x: 0, z: 0, dist: C.dist[0], override: null };
  function follow(x, z, ax, az, dist, dt, snap) {
    const k = snap ? 1 : 1 - Math.exp(-C.ease * dt), ka = snap ? 1 : 1 - Math.exp(-dt / C.aheadEaseS);
    camAhead.x += (ax * C.aheadM - camAhead.x) * ka; camAhead.z += (az * C.aheadM - camAhead.z) * ka;
    camT.x += (x + camAhead.x - camT.x) * k; camT.z += (z + camAhead.z - camT.z) * k; camDist += (dist - camDist) * k;
    placeCamera(camT.x, camT.z, camDist, pitch, yaw0);
  }
  function placeCamera(x, z, dist, p, yaw, lift = 0) {
    // the hero sits below the middle of a portrait frame: aim a little north of it
    const up = dist * (C.heroY - 0.5) * 0.62, sx = shake ? (Math.sin(timeU.value * 53) + Math.sin(timeU.value * 31)) * shake * 0.004 : 0;
    const tx = x - Math.sin(yaw) * up, tz = z - Math.cos(yaw) * up; // "north of it" along the view, so the three-quarter angle keeps the same framing
    camera.position.set(tx + Math.sin(yaw) * Math.cos(p) * dist + sx, Math.sin(p) * dist + lift, tz + Math.cos(yaw) * Math.cos(p) * dist);
    camera.lookAt(tx, lift * 0.3, tz);
    sun.target.position.set(x, 0, z - 4); sun.position.copy(sun.target.position).addScaledVector(sunDir, 40);
    cam.x = x; cam.z = z; cam.dist = dist;
  }
  function setShake(v) { shake = v; }

  // ---- district look
  const look = { i: -1 };
  function setDistrict(i, t = 1) {
    const d = cfg.districts[i], p = cfg.districts[Math.max(0, look.i)] || d, mix = (a, b) => new THREE.Color(a).lerp(new THREE.Color(b), t);
    if (t >= 1) look.i = i;
    const el = (p.sun[0] + (d.sun[0] - p.sun[0]) * t) * Math.PI / 180, az = (p.sun[1] + (d.sun[1] - p.sun[1]) * t) * Math.PI / 180;
    sunDir.set(Math.cos(el) * Math.sin(az), Math.sin(el), Math.cos(el) * Math.cos(az)).normalize();
    sun.color.copy(mix(p.sunCol, d.sunCol)); hemi.color.copy(mix(p.hemi[0], d.hemi[0])); hemi.groundColor.copy(mix(p.hemi[1], d.hemi[1]));
    const fog = mix(p.fog, d.fog); scene.fog.color.copy(fog); scene.background.copy(fog);
    sun.intensity = p.sunK + (d.sunK - p.sunK) * t; hemi.intensity = p.hemiK + (d.hemiK - p.hemiK) * t;
    compMat.uniforms.uGrade.value.set(p.grade[0] + (d.grade[0] - p.grade[0]) * t, p.grade[1] + (d.grade[1] - p.grade[1]) * t, p.grade[2] + (d.grade[2] - p.grade[2]) * t);
    M.ground.color.copy(mix(p.grass[3], d.grass[3])).multiplyScalar(0.82);
  }
  setDistrict(0, 1);

  function info() { return { calls: renderer.info.render.calls, tris: renderer.info.render.triangles, tier, post }; }
  function destroy() {
    for (const rt of [rtScene, rtA, rtB]) if (rt) rt.dispose();
    scene.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
    for (const k in M) M[k].dispose(); brightMat.dispose(); blurMat.dispose(); compMat.dispose();
    renderer.dispose(); try { renderer.forceContextLoss(); } catch (e) { /* already lost */ }
  }
  setTier(tier);
  return { THREE, renderer, scene, camera, sun, hemi, M, far, timeU, resize, render, setTier, follow, placeCamera, setShake, setDistrict, info, destroy, cam, compMat,
    get tier() { return tier; }, smoothFrame(ok) { smooth = ok ? smooth + 1 : 0; }, pitch, yaw: yaw0 };
}

// ---------------------------------------------------------------- garden dressing

const CREAM = '#f1e6cf', WOOD = '#b98a5e', WOOD_D = '#8a6240', STONE = '#c9c2b4', CORAL = '#e9795b', SUN = '#f6b93b';
const FLOWERS = ['#f47c5d', '#f6b93b', '#c79ae8', '#f3a0b8', '#f1e6cf', '#7fb7ee'];

let F = null; // the fence look of the district being dressed (config: districts[i].fence)
function picket(h = 0.72) { return merge([paint(xf(cyl(0.07, 0.066, h, 4), [0, 0, 0], [0, Math.PI / 4, 0], [1, 1, 0.36]), F.a, F.b), paint(xf(cyl(0.066, 0.004, 0.09, 4), [0, h, 0], [0, Math.PI / 4, 0], [1, 1, 0.36]), F.b)]); }

/** A run of fence from (x0, z0) to (x1, z1) as painted geometry. */
function fenceRun(x0, z0, x1, z1) {
  const len = Math.hypot(x1 - x0, z1 - z0), n = Math.max(2, Math.round(len / F.gapM)), ang = Math.atan2(x1 - x0, z1 - z0), out = [];
  for (let i = 0; i <= n; i++) { const t = i / n; out.push(xf(picket(0.66 + (i % 5 === 0 ? 0.1 : 0)), [x0 + (x1 - x0) * t, 0, z0 + (z1 - z0) * t], [0, ang + Math.PI / 2, 0])); }
  for (const y of [0.2, 0.5]) out.push(paint(xf(rbox(0.05, 0.06, len, 0.015, 1), [(x0 + x1) / 2, y, (z0 + z1) / 2], [0, ang, 0]), F.rail));
  return out;
}
function post(x, z, h = 1.05) { return [paint(xf(rbox(0.2, h, 0.2, 0.04, 2), [x, 0, z]), F.post[0], F.post[1]), paint(xf(blob(0.13, 1, 1, 1, 1), [x, h + 0.08, z]), F.cap)]; }

/** A tuft of wild grass: a few leaning blades. */
function tuftGeo(R, leaf) { const out = []; for (let i = 0; i < 5; i++) { const a = R() * 6.283, h = 0.22 + R() * 0.2; out.push(paint(xf(cyl(0.035, 0.002, h, 3), [Math.cos(a) * 0.05, 0, Math.sin(a) * 0.05], [Math.cos(a) * 0.5, 0, -Math.sin(a) * 0.5]), leaf[0], leaf[1])); } return merge(out); }
/** A tree: tapered trunk, layered canopy blobs, a few apples. Returns [trunkGeo, leafGeo]. */
export function treeGeo(R, scale = 1, leaf = ['#3f8f3a', '#86c84e'], apples = true) {
  const trunk = [paint(lathe([[0.2, 0], [0.13, 0.5], [0.1, 1.2], [0.14, 1.5], [0, 1.52]], 8), WOOD_D, WOOD)], leaves = [];
  for (let i = 0; i < 4; i++) { const a = i * 1.7 + R() * 0.6, r = i === 0 ? 0 : 0.42; leaves.push(paint(xf(blob(0.62 + R() * 0.16, 1, 0.82, 1, 1), [Math.cos(a) * r, 1.75 + (i === 0 ? 0.42 : R() * 0.25), Math.sin(a) * r]), leaf[0], leaf[1])); }
  if (apples) for (let i = 0; i < 5; i++) { const a = R() * 6.28; trunk.push(paint(xf(blob(0.075, 1, 1, 1, 1), [Math.cos(a) * 0.72, 1.55 + R() * 0.6, Math.sin(a) * 0.72]), '#e2533c')); }
  return [xf(merge(trunk), [0, 0, 0], [0, 0, 0], scale), xf(merge(leaves), [0, 0, 0], [0, 0, 0], scale)];
}
function bushGeo(R, c = ['#3f8f3a', '#86c84e']) { const out = []; for (let i = 0; i < 3; i++) out.push(paint(xf(blob(0.3 + R() * 0.1, 1, 0.8, 1, 1), [(i - 1) * 0.22, 0.24, (R() - 0.5) * 0.2]), c[0], c[1])); return merge(out); }
function rockGeo(R) { return merge([paint(xf(blob(0.3, 1.1, 0.7, 0.9, 1), [0, 0.14, 0], [0, R() * 6, 0]), '#9d968a', STONE), paint(xf(blob(0.16, 1, 0.7, 1, 1), [0.24, 0.07, 0.1]), '#9d968a', STONE)]); }
function flowerGeo(color, h = 0.42) {
  const out = [paint(cyl(0.018, 0.014, h, 4), '#4f9a43'), paint(xf(blob(0.05, 1, 0.5, 1, 0), [0, h, 0]), SUN)];
  for (let i = 0; i < 5; i++) { const a = i * 1.2566; out.push(paint(xf(blob(0.066, 1, 0.34, 0.66, 0), [Math.cos(a) * 0.085, h, Math.sin(a) * 0.085], [0, -a, 0]), color)); }
  out.push(paint(xf(blob(0.07, 1, 0.25, 0.5, 0), [0.06, h * 0.45, 0], [0, 0, 0.5]), '#5fae4c'));
  return merge(out);
}
/** A cottage front: walls, roof with overhang, door, windows, chimney, step. About 4 m wide. */
function cottageGeo(wall = CREAM, roof = CORAL) {
  const THREE = window.THREE, s = new THREE.Shape(); s.moveTo(-2.5, 0); s.lineTo(0, 1.7); s.lineTo(2.5, 0); s.lineTo(2.2, 0); s.lineTo(0, 1.45); s.lineTo(-2.2, 0);
  const roofG = new THREE.ExtrudeGeometry(s, { depth: 3.6, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.05, bevelSegments: 2 }); roofG.translate(0, 2.3, -1.8);
  const gable = new THREE.Shape(); gable.moveTo(-2.1, 0); gable.lineTo(0, 1.42); gable.lineTo(2.1, 0); const gG = new THREE.ExtrudeGeometry(gable, { depth: 3.1, bevelEnabled: false }); gG.translate(0, 2.3, -1.55);
  return merge([paint(rbox(4.2, 2.36, 3.1, 0.1, 2), wall, '#fff3dc'), paint(gG, wall), paint(roofG, roof, '#f29a7a'),
    paint(xf(rbox(0.78, 1.5, 0.12, 0.06, 2), [0, 0, 1.56]), '#2bb3a3', '#49c9b9'), paint(xf(blob(0.05), [0.24, 0.75, 1.66]), SUN),
    paint(xf(rbox(0.8, 0.8, 0.1, 0.05, 2), [-1.3, 0.95, 1.55]), '#9fd8ee', '#d3f0fa'), paint(xf(rbox(0.8, 0.8, 0.1, 0.05, 2), [1.3, 0.95, 1.55]), '#9fd8ee', '#d3f0fa'),
    paint(xf(rbox(0.96, 0.1, 0.16, 0.03, 1), [-1.3, 0.86, 1.6]), '#f6dcae'), paint(xf(rbox(0.96, 0.1, 0.16, 0.03, 1), [1.3, 0.86, 1.6]), '#f6dcae'),
    paint(xf(rbox(1.3, 0.14, 0.6, 0.05, 2), [0, 0, 1.9]), STONE), paint(xf(rbox(0.5, 1.3, 0.5, 0.06, 2), [1.2, 2.9, -0.4]), '#d98a6c', '#e9a98c'),
    paint(xf(blob(0.3, 1, 0.7, 1, 1), [-1.3, 0.72, 1.7]), '#f47c5d'), paint(xf(blob(0.3, 1, 0.7, 1, 1), [1.3, 0.72, 1.7]), '#f6b93b')]);
}

/**
 * Dresses garden `g` whose north-west corner is at world (ox, oz): fence with a north gate and a south entry, the
 * neighbour's cottage, props, beds, pond, and trees and hedges outside. Returns { group, gate, beds, trees, dispose }.
 */
export function dressGarden(world, g, ox, oz, cfg, district) {
  const THREE = window.THREE, M = world.M, R = rng(g.seed * 3 + 7), group = new THREE.Group(), geos = [], leafG = [], smallG = [], spin = [], D = cfg.districts[district];
  F = D.fence;
  const leafC = D.leaf;
  const gx = ox + g.w / 2, gh = GATE_HALF_M, x0 = ox, x1 = ox + g.w, z0 = oz, z1 = oz + g.d;
  // fence: four sides, a gap for the gate in the north and for the way in at the south
  geos.push(...fenceRun(x0, z0, gx - gh, z0), ...fenceRun(gx + gh, z0, x1, z0), ...fenceRun(x0, z1, gx - gh, z1), ...fenceRun(gx + gh, z1, x1, z1), ...fenceRun(x0, z0, x0, z1), ...fenceRun(x1, z0, x1, z1));
  for (const [px, pz] of [[gx - gh, z0], [gx + gh, z0], [gx - gh, z1], [gx + gh, z1], [x0, z0], [x1, z0], [x0, z1], [x1, z1]]) geos.push(...post(px, pz));
  // props inside the garden
  const trees = [];
  for (const p of g.props) {
    const wx = ox + p.x, wz = oz + p.z;
    if (p.kind === 'tree') { const [t, l] = treeGeo(R, 1.15, leafC); const tm = mesh(xf(t, [wx, 0, wz]), M.matte), lm = mesh(xf(l, [wx, 0, wz]), M.leaf); group.add(tm, lm); trees.push({ x: wx, z: wz, leaf: lm, trunk: tm, apples: p.apples, shake: 0, p }); }
    else if (p.kind === 'rock') geos.push(xf(rockGeo(R), [wx, 0, wz]));
    else if (p.kind === 'bush') leafG.push(xf(bushGeo(R, leafC), [wx, 0, wz]));
    else if (p.kind === 'wall') geos.push(paint(xf(rbox(p.len, 0.45, 0.42, 0.1, 2), [wx, 0, wz]), '#b8ad9a', STONE));
    else if (p.kind === 'fountain') geos.push(paint(xf(lathe([[1.5, 0], [1.5, 0.4], [1.3, 0.45], [1.25, 0.2], [0.3, 0.2], [0.26, 1.1], [0.6, 1.2], [0.62, 1.3], [0.1, 1.34], [0.08, 1.7], [0, 1.72]], 24), [wx, 0, wz]), '#b8ad9a', '#e2dccf'));
  }
  // flower beds: a mulch slab and flowers that bow when touched
  const beds = [];
  for (const b of g.beds) {
    const wx = ox + b.x, wz = oz + b.z, fl = [], n = Math.round(b.w * b.d * 7);
    geos.push(paint(xf(rbox(b.w, 0.1, b.d, 0.38, 3), [wx, 0, wz]), '#6b4a34', '#8a6446'));
    for (let i = 0; i < n; i++) fl.push(xf(flowerGeo(FLOWERS[(b.kind + (i % 3)) % 6], 0.3 + R() * 0.2), [(R() - 0.5) * (b.w - 0.5), 0.08, (R() - 0.5) * (b.d - 0.5)], [0, R() * 6, 0]));
    const fm = mesh(merge(fl), M.leaf); fm.position.set(wx, 0, wz); group.add(fm); beds.push({ x: wx, z: wz, w: b.w, d: b.d, mesh: fm, bow: 0 });
  }
  let pond = null;
  if (g.pond) {
    const p = g.pond, wx = ox + p.x, wz = oz + p.z, wg = new THREE.CircleGeometry(1, 28); wg.rotateX(-Math.PI / 2); wg.scale(p.rx, 1, p.rz);
    pond = new THREE.Mesh(wg, M.water); pond.position.set(wx, 0.05, wz); pond.receiveShadow = true; group.add(pond);
    for (let i = 0; i < 22; i++) { const a = i / 22 * 6.283; geos.push(paint(xf(blob(0.2 + R() * 0.08, 1.2, 0.6, 1, 1), [wx + Math.cos(a) * (p.rx + 0.08), 0.06, wz + Math.sin(a) * (p.rz + 0.08)], [0, R() * 6, 0]), '#a39c90', STONE)); }
    for (let i = 0; i < 4; i++) { const a = R() * 6.28, r = R() * 0.6; leafG.push(paint(xf(slab(0.22, 0.22, 0.02, 10), [wx + Math.cos(a) * p.rx * r, 0.07, wz + Math.sin(a) * p.rz * r]), '#4f9a43', '#7cc25a')); }
    for (let i = 0; i < 7; i++) { const a = 3.6 + R() * 1.2; leafG.push(paint(xf(cyl(0.02, 0.012, 0.7 + R() * 0.4, 4), [wx + Math.cos(a) * (p.rx - 0.1), 0, wz + Math.sin(a) * (p.rz - 0.1)], [0.1 * (R() - 0.5), 0, 0.1 * (R() - 0.5)]), '#4f9a43', '#9bd060')); }
  }
  const solid = mesh(merge(geos), M.matte); group.add(solid);
  if (leafG.length) group.add(mesh(merge(leafG), M.leaf));
  /** Builds what the first picture can do without (the cottage, trees, hedges and wild plants outside the fence). Call once. */
  let finished = false;
  function finish() {
    if (finished) return; finished = true; const geos = [], leafG = [];
    // cottage beside the lane, north-west of the gate, facing south; a mailbox and a path stone row to the gate
    geos.push(xf(cottageGeo(D.house, D.roofs[0]), [gx - gh - 4.6, 0, z0 - 3.4]));
    for (let i = 0; i < 5; i++) geos.push(paint(xf(slab(0.34, 0.28, 0.05), [gx - gh - 4.4 + i * 0.75, 0, z0 - 1.2 + Math.sin(i) * 0.15]), STONE, '#ddd6c8'));
    geos.push(paint(xf(rbox(0.08, 0.8, 0.08, 0.02, 1), [gx - 3.95, 0, z0 - 0.8]), WOOD), paint(xf(rbox(0.3, 0.2, 0.42, 0.08, 2), [gx - 3.95, 0.8, z0 - 0.8]), '#e2533c', '#f08a6c'));
    // outside the fence: hedges and trees on both sides, so the frame is never empty
    for (const side of [-1, 1]) for (let z = z0 - 2; z < z1 + 2; z += 3.2 + R() * 1.5) {
      const x = (side < 0 ? x0 : x1) + side * (1.6 + R() * 1.2);
      if (R() < 0.55) { const [t, l] = treeGeo(R, 1.25 + R() * 0.5, leafC, district === 0); geos.push(xf(t, [x, 0, z])); leafG.push(xf(l, [x, 0, z])); } else leafG.push(xf(bushGeo(R, leafC), [x, 0, z], [0, 0, 0], 1.6));
      if (R() < 0.5) { const [t, l] = treeGeo(R, 1.6 + R() * 0.6, leafC, false); geos.push(xf(t, [x + side * (3 + R() * 3), 0, z + R() * 2])); leafG.push(xf(l, [x + side * (3 + R() * 3), 0, z + R() * 2])); }
    }
    // wild tufts and flowers on the meadow around the fence and along the lane
    for (let i = 0; i < 150; i++) {
      const side = R() < 0.5 ? -1 : 1, lane = R() < 0.3, x = lane ? gx + side * (3.9 + R() * 2.5) : (side < 0 ? x0 - 0.5 - R() * 7 : x1 + 0.5 + R() * 7), z = lane ? (R() < 0.5 ? z0 - 0.6 - R() * 9 : z1 + 0.6 + R() * 5) : z0 - 3 + R() * (g.d + 6);
      if (R() < 0.6) smallG.push(xf(tuftGeo(R, leafC), [x, 0, z], [0, R() * 6, 0], 0.7 + R() * 0.7)); else smallG.push(xf(flowerGeo(FLOWERS[Math.floor(R() * 6)], 0.22 + R() * 0.18), [x, 0, z], [0, R() * 6, 0]));
    }
    // the village around: more cottages set back from the lane, a laundry line by the neighbour's door, tall trees behind
    const roofs = D.roofs;
    for (const side of [-1, 1]) for (let z = z1 - 2 - R() * 3, k = 0; z > z0 - 8; z -= 11 + R() * 5, k++) {
      const x = (side < 0 ? x0 - 11 - R() * 3 : x1 + 11 + R() * 3);
      geos.push(xf(cottageGeo(k % 2 ? '#f3e6cf' : D.house, roofs[Math.floor(R() * 3)]), [x, 0, z], [0, side < 0 ? 0.5 : -0.5, 0], 0.9 + R() * 0.25));
      for (let i = 0; i < 3; i++) { const [t, l] = treeGeo(R, 1.7 + R() * 0.9, leafC, false), tx = x + side * (4 + R() * 6), tz = z - 4 + R() * 9; geos.push(xf(t, [tx, 0, tz])); leafG.push(xf(l, [tx, 0, tz])); }
    }
    { const lx = gx - gh - 7.6, lz = z0 - 1.5, cloth = ['#f6f1e4', '#e9795b', '#8fc6d8', '#f6c443', '#f1b9c8'];
      geos.push(paint(xf(cyl(0.035, 0.03, 1.7, 5), [lx, 0, lz]), WOOD), paint(xf(cyl(0.035, 0.03, 1.7, 5), [lx + 2.6, 0, lz]), WOOD), paint(xf(rbox(2.6, 0.015, 0.015, 0.005, 1), [lx + 1.3, 1.62, lz]), '#f6f1e4'));
      for (let i = 0; i < 5; i++) leafG.push(paint(xf(rbox(0.34 + (i % 2) * 0.1, 0.5 - (i % 3) * 0.1, 0.02, 0.008, 1), [lx + 0.35 + i * 0.48, 1.62 - (0.5 - (i % 3) * 0.1), lz]), cloth[i], '#ffffff')); } // on the leaf material, so the washing moves in the breeze
    if (district === 1) { // Windmill Hill: a mill beside the lane, sails turning
      const mx = gx - gh - 4.4, mz = z0 - 7.8;
      geos.push(paint(xf(cyl(1.05, 0.62, 4.2, 12), [mx, 0, mz]), '#f3e6cf', CREAM), paint(xf(cyl(0.8, 0.04, 1.0, 12), [mx, 4.2, mz]), '#b5653a', '#d9a05a'), paint(xf(rbox(0.5, 0.95, 0.08, 0.04, 1), [mx, 0, mz + 0.98]), '#8a5a3a'), paint(xf(cyl(0.09, 0.09, 0.5, 8), [mx, 3.7, mz + 0.55], [Math.PI / 2, 0, 0]), WOOD));
      const sg = []; for (let k = 0; k < 4; k++) sg.push(xf(merge([paint(xf(rbox(0.07, 2.3, 0.05, 0.01, 1), [0, 0.1, 0]), WOOD), paint(xf(rbox(0.55, 1.7, 0.03, 0.01, 1), [0.24, 0.6, 0]), '#fbf4e2', '#e9dcc0')]), [0, 0, 0], [0, 0, k * Math.PI / 2]));
      const sails = mesh(merge(sg), M.matte); sails.position.set(mx, 3.7, mz + 1.08); group.add(sails); spin.push(sails);
    }
    if (district === 1) { // golden haystacks beside the lane and out on the meadow
      for (const [hx, hz, k] of [[gx + gh + 3.3, z0 - 2.6, 1], [gx + gh + 4.4, z0 - 3.5, 0.75], [gx - gh - 3.0, z0 - 8.8, 0.85], [x1 + 3.5, z0 + g.d * 0.4, 1.1], [x0 - 3.8, z0 + g.d * 0.7, 0.9]]) geos.push(paint(xf(blob(0.8, 1, 0.85, 1, 2), [hx, 0.5 * k, hz], [0, 0, 0], k), '#d9b44a', '#f3dc86'), paint(xf(cyl(0.5, 0.05, 0.5, 8), [hx, 1.05 * k, hz], [0, 0, 0], k), '#e9c95c', '#f6e39a'));
    }
    if (district === 2) { // Lantern Lake: big warm lanterns along the lane and the fence, each with a pool of light on the grass
      const glow = [], pools = [];
      const lamp = (x, z, h) => { geos.push(paint(xf(cyl(0.07, 0.05, h, 6), [x, 0, z]), '#5d4f7c'), paint(xf(cyl(0.3, 0.03, 0.2, 8), [x, h + 0.42, z]), '#5d4f7c')); glow.push(xf(blob(0.27, 1, 1.15, 1, 2), [x, h + 0.14, z])); { const q = new THREE.PlaneGeometry(7, 7), uv = q.getAttribute('uv'), col = new Float32Array(uv.count * 3); for (let i = 0; i < uv.count; i++) { col[i * 3] = uv.getX(i); col[i * 3 + 1] = uv.getY(i); } q.setAttribute('color', new THREE.BufferAttribute(col, 3)); pools.push(xf(q, [x, 0.95, z], [-Math.PI / 2, 0, 0])); } };
      for (const side of [-1, 1]) { for (const dz of side < 0 ? [7, 9.3] : [1.6, 5, 8.4]) lamp(gx + side * 5, z0 - dz, 2.3); for (let z = z0 + 3.5; z < z1 - 1; z += 5) lamp((side < 0 ? x0 : x1) + side * 0.5, z, 1.8); }
      group.add(mesh(merge(glow), M.lamp, false)); const pm = mesh(merge(pools), M.pool, false); pm.renderOrder = 3; group.add(pm);
    }
    if (district === 3) { // the daily garden is a little festival: bunting along the fence
      const cols = ['#e9795b', '#f6c443', '#8fc6d8', '#f1b9c8', '#7cc25a'], bun = [];
      for (const [ax, az, bx, bz] of [[x0, z0, gx - gh, z0], [gx + gh, z0, x1, z0], [x0, z1, gx - gh, z1], [gx + gh, z1, x1, z1], [x0, z0, x0, z1], [x1, z0, x1, z1]]) { const len = Math.hypot(bx - ax, bz - az), n = Math.round(len / 0.5); for (let i = 0; i < n; i++) { const t = (i + 0.5) / n; bun.push(paint(xf(cyl(0.15, 0.01, 0.3, 3), [ax + (bx - ax) * t, 1.32, az + (bz - az) * t], [Math.PI, 0, 0], [1, 1, 0.15]), cols[i % 5])); } }
      leafG.push(...bun);
    }
    group.add(mesh(merge(geos), M.matte), mesh(merge(leafG), M.leaf), mesh(merge(smallG), M.leaf, false));
  }

  // the gate: two leaves on hinges at the posts, closed until 90%
  const leafGeo = () => { const out = []; for (let i = 0; i < 7; i++) out.push(xf(picket(0.6 + Math.sin(i / 6 * Math.PI) * 0.22), [0.14 + i * 0.22, 0, 0])); out.push(paint(xf(rbox(1.55, 0.06, 0.05, 0.015, 1), [0.8, 0.22, 0]), F.rail), paint(xf(rbox(1.55, 0.06, 0.05, 0.015, 1), [0.8, 0.5, 0]), F.rail)); return merge(out); };
  const gl = mesh(leafGeo(), M.matte), gr = mesh(leafGeo(), M.matte); gl.position.set(gx - gh + 0.1, 0, z0); gr.position.set(gx + gh - 0.1, 0, z0); gr.scale.x = -1; group.add(gl, gr);
  const gate = { l: gl, r: gr, t: 0, x: gx, z: z0, set(t) { this.t = t; gl.rotation.y = t * 1.75; gr.rotation.y = -t * 1.75; } };
  world.scene.add(group);
  return { group, gate, beds, trees, pond, D, finish, /** Turns the mill sails. */ tick(t) { for (const m of spin) m.rotation.z = t * 0.5; }, dispose() { world.scene.remove(group); group.traverse((o) => { if (o.geometry) o.geometry.dispose(); }); } };
}

/** The lane between two gardens: a soft path from one gate to the next and stepping stones. Returns a mesh. */
export function lanePiece(world, x, zSouth, zNorth, D) {
  const geos = [], len = zSouth - zNorth, R = rng(Math.round(zSouth * 31) + 5);
  geos.push(paint(xf(rbox(7.4, 0.04, len + 1.4, 2.2, 3), [x, -0.01, (zSouth + zNorth) / 2]), D.lane[0], D.lane[1]));
  for (let i = 0; i < 14; i++) geos.push(paint(xf(slab(0.3 + R() * 0.12, 0.26, 0.05, 10), [x + (R() - 0.5) * 6, 0.02, zNorth + 0.6 + R() * (len - 1.2)], [0, R() * 6, 0]), STONE, '#ddd6c8'));
  const m = mesh(merge(geos), world.M.matte, false); world.scene.add(m); return m;
}
