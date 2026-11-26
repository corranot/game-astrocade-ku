// PROTOTYPE - NOT FOR PRODUCTION
// The 3D look of Meteor Gem Works (Three.js r187, global THREE): a frontier crater town around a fallen crystal
// meteor. The meteor carries a cut map (a lat-long DataTexture) that digs the rock in and reveals glowing crystal
// where it is mined. Items (chunks, gems, coins) are three InstancedMeshes rebuilt each frame from the logic state;
// effects are pooled (sparkle and dust points, shards, rings, flyers). A sky dome shader and the key lights blend
// between time-of-day keys. High tiers add a glow (bloom) pass with a colour grade.
// The town grows with the unlock buildings (rig, conveyor + polisher 2, stand 2 + lanterns, armadillo shopkeeper, canyon road
// + tour bus, ring workshop, laser cutter), six critters in a parade, the order kid, Crystal Rush and a rim light on
// the characters, then chapter 1's last seven unlocks (ghost town + mine cart, rig 2, cable car, stargazer deck, crown
// jeweler, neon signs, the heart of the meteor with its finale and comet), six more critters and the hero's hats.
// This file only draws; logic.js owns the rules.
/* global THREE */
import * as M from './models.js';
import { todBlend, travelOpen } from './logic.js';

const { PAL } = M;
const GEM_COLS = [0xd8279f, 0x1fb8e0, 0x7a3cf0, 0xf2a81e, 0x22c07a];
const FROST_GEMS = [0x2fa8f0, 0x7a5cf0, 0x22c8c0, 0xe060b0, 0x5a8cff]; // chapter 2: icy blues, violet, a pink

function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
/**
 * Draws an unlock's icon centred on the origin of g (about 90 px across): fg is the fill, bg the cut-out colour.
 * Shared by the price pad face and the HUD's NEXT card (game.js draws the same icons from this function).
 */
export function drawIcon(g, icon, fg, bg) {
  g.fillStyle = fg; g.strokeStyle = bg; g.lineWidth = 4; g.lineJoin = g.lineCap = 'round';
  const rr = (x, y, w, h, r) => { g.beginPath(); g.roundRect(x, y, w, h, r); g.fill(); };
  if (icon === 'rig') {
    rr(-14, -40, 28, 26, 4); g.beginPath(); g.moveTo(-16, -12); g.lineTo(16, -12); g.lineTo(0, 38); g.closePath(); g.fill();
    for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(-12 + i * 3, -2 + i * 12); g.lineTo(12 - i * 3, 4 + i * 12); g.stroke(); }
  } else if (icon === 'conveyor') {
    rr(-44, 4, 88, 18, 9); g.fillStyle = bg; for (const x of [-32, -11, 11, 32]) { g.beginPath(); g.arc(x, 13, 5, 0, 6.3); g.fill(); }
    g.fillStyle = fg; for (const [x, y, r] of [[-26, -10, 11], [0, -14, 13], [26, -10, 11]]) { g.beginPath(); g.moveTo(x, y - r); g.lineTo(x + r, y); g.lineTo(x, y + r * 0.8); g.lineTo(x - r, y); g.closePath(); g.fill(); }
  } else if (icon === 'stand') {
    rr(-40, 4, 80, 30, 6); rr(-44, -38, 88, 14, 5); g.fillRect(-36, -24, 6, 28); g.fillRect(30, -24, 6, 28);
    g.fillStyle = bg; g.beginPath(); g.moveTo(0, -18); g.lineTo(11, -6); g.lineTo(0, 4); g.lineTo(-11, -6); g.closePath(); g.fill();
  } else if (icon === 'keeper') {
    g.beginPath(); g.ellipse(0, 6, 30, 32, 0, 0, 6.3); g.fill(); g.beginPath(); g.ellipse(0, -34, 20, 9, 0, 0, 6.3); g.fill(); rr(-12, -50, 24, 18, 6);
    g.fillStyle = bg; for (const x of [-11, 11]) { g.beginPath(); g.arc(x, 0, 5, 0, 6.3); g.fill(); } g.beginPath(); g.arc(0, 14, 9, 0.2, Math.PI - 0.2); g.stroke();
  } else if (icon === 'road') {
    rr(-46, -4, 92, 12, 4); for (const x of [-38, -14, 10, 34]) rr(x, -22, 6, 44, 3);
    g.beginPath(); g.moveTo(-46, -16); g.quadraticCurveTo(0, -42, 46, -16); g.lineWidth = 6; g.strokeStyle = fg; g.stroke();
  } else if (icon === 'ring') {
    g.lineWidth = 11; g.strokeStyle = fg; g.beginPath(); g.arc(0, 10, 24, 0, 6.3); g.stroke();
    g.beginPath(); g.moveTo(0, -40); g.lineTo(16, -24); g.lineTo(0, -10); g.lineTo(-16, -24); g.closePath(); g.fill();
  } else if (icon === 'laser') {
    rr(-26, 10, 52, 26, 8); rr(-20, -16, 40, 26, 8);
    for (const dx of [-12, 0, 12]) { g.fillRect(dx - 3, -42, 6, 26); }
    g.fillStyle = bg; g.beginPath(); g.arc(0, 22, 6, 0, 6.3); g.fill();
  } else if (icon === 'cart') {
    g.beginPath(); g.moveTo(-40, -14); g.lineTo(40, -14); g.lineTo(30, 18); g.lineTo(-30, 18); g.closePath(); g.fill();
    for (const x of [-20, 20]) { g.beginPath(); g.arc(x, 26, 11, 0, 6.3); g.fill(); }
    g.fillStyle = bg; for (const x of [-20, 20]) { g.beginPath(); g.arc(x, 26, 4, 0, 6.3); g.fill(); }
    g.fillStyle = fg; for (const [x, y, r] of [[-16, -24, 11], [6, -28, 13], [24, -22, 9]]) { g.beginPath(); g.moveTo(x, y - r); g.lineTo(x + r, y); g.lineTo(x, y + r * 0.8); g.lineTo(x - r, y); g.closePath(); g.fill(); }
  } else if (icon === 'cable') {
    g.lineWidth = 5; g.strokeStyle = fg; g.beginPath(); g.moveTo(-46, -34); g.quadraticCurveTo(0, -12, 46, -38); g.stroke();
    g.fillRect(-2, -24, 5, 14); rr(-24, -10, 48, 40, 9); g.fillStyle = bg; rr(-17, -3, 14, 12, 3); rr(3, -3, 14, 12, 3);
  } else if (icon === 'star') {
    g.beginPath(); for (let k = 0; k <= 10; k++) { const a = k / 10 * Math.PI * 2 - Math.PI / 2, r = k % 2 ? 18 : 42; g.lineTo(Math.cos(a) * r, Math.sin(a) * r + 2); } g.closePath(); g.fill();
    g.fillStyle = bg; g.beginPath(); g.arc(0, 4, 8, 0, 6.3); g.fill();
  } else if (icon === 'crown') {
    g.beginPath(); g.moveTo(-40, 26); g.lineTo(-44, -22); g.lineTo(-20, 0); g.lineTo(0, -34); g.lineTo(20, 0); g.lineTo(44, -22); g.lineTo(40, 26); g.closePath(); g.fill();
    g.fillStyle = bg; for (const x of [-22, 0, 22]) { g.beginPath(); g.arc(x, 14, 6, 0, 6.3); g.fill(); }
  } else if (icon === 'neon') {
    g.lineWidth = 9; g.strokeStyle = fg; g.beginPath(); for (let k = 0; k <= 10; k++) { const a = k / 10 * Math.PI * 2 - Math.PI / 2, r = k % 2 ? 14 : 32; g.lineTo(Math.cos(a) * r - 6, Math.sin(a) * r - 6); } g.closePath(); g.stroke();
    g.lineWidth = 6; g.beginPath(); g.moveTo(-42, 34); g.quadraticCurveTo(-20, 22, 0, 34); g.quadraticCurveTo(20, 46, 42, 32); g.stroke();
  } else if (icon === 'globe') {
    rr(-30, 22, 60, 16, 6); g.beginPath(); g.arc(0, -6, 32, 0, 6.3); g.fill();
    g.fillStyle = bg; g.beginPath(); g.moveTo(0, -28); g.lineTo(14, 8); g.lineTo(-14, 8); g.closePath(); g.fill();
    for (const [x, y] of [[-18, -18], [16, -22], [20, 0], [-22, 2]]) { g.beginPath(); g.arc(x, y, 3.5, 0, 6.3); g.fill(); }
  } else if (icon === 'cocoa') {
    rr(-28, -10, 46, 46, 9); g.lineWidth = 9; g.strokeStyle = fg; g.beginPath(); g.arc(22, 12, 13, -1.4, 1.4); g.stroke();
    g.lineWidth = 6; for (const x of [-16, -4, 8]) { g.beginPath(); g.moveTo(x, -18); g.bezierCurveTo(x - 8, -28, x + 8, -34, x, -44); g.stroke(); }
    g.fillStyle = bg; g.beginPath(); g.moveTo(-5, 4); g.bezierCurveTo(-14, -6, -22, 8, -5, 20); g.bezierCurveTo(12, 8, 4, -6, -5, 4); g.fill();
  } else if (icon === 'aurora') {
    g.lineWidth = 9; g.strokeStyle = fg; for (const [y, a] of [[-24, 1], [-4, 0.8], [16, 0.6]]) { g.globalAlpha = a; g.beginPath(); g.moveTo(-44, y + 8); g.bezierCurveTo(-20, y - 14, 10, y + 18, 44, y - 6); g.stroke(); }
    g.globalAlpha = 1; for (const [x, y] of [[-30, 34], [0, 30], [28, 36]]) { g.beginPath(); g.arc(x, y, 4, 0, 6.3); g.fill(); }
  } else if (icon === 'heart') {
    g.beginPath(); g.moveTo(0, 38); g.bezierCurveTo(-12, 26, -46, 6, -42, -16); g.bezierCurveTo(-38, -40, -8, -40, 0, -18); g.bezierCurveTo(8, -40, 38, -40, 42, -16); g.bezierCurveTo(46, 6, 12, 26, 0, 38); g.fill();
    g.fillStyle = bg; g.beginPath(); g.ellipse(-16, -16, 7, 11, -0.5, 0, 6.3); g.fill();
  }
}
const lerp = (a, b, k) => a + (b - a) * k;
const ease = (k) => 1 - (1 - k) ** 3;
const back = (k) => { const c = 1.9; return 1 + (c + 1) * (k - 1) ** 3 + c * (k - 1) ** 2; };

/**
 * Builds the scene on canvas. cfg is the game config, random a seeded rng for decoration placement.
 * Returns the API game.js drives (see the object at the end).
 */
export function createScene(canvas, cfg, random) {
  const W = cfg.world, LK = cfg.look;
  // the town's dressing (shops, ghost town, road, cable car) was laid out for the first, small square; the same
  // stretch as world.spread moves it out to the wide town
  const SPR = W.spread || { kx: 1, kz: 1, z0: 0 }, sx = (x) => x * SPR.kx, sz = (z) => SPR.z0 + (z - SPR.z0) * SPR.kz;
  // past the crowd the spread would leave a wide empty strip, so the road (and its barrels) is pulled in to run
  // just behind the spectators
  const sf = (z) => sz(z) - (sz(16.2) - W.crowd.z1 - 2.4);
  // chapter 2 (the Frost Comet valley) reuses this whole scene with a frost theme: snow, pines, a penguin, aurora
  const FROST = cfg.theme === 'frost', GEMS = FROST ? FROST_GEMS : GEM_COLS, DUST = FROST ? 0xc4c8e4 : 0xe8c69a;
  const fz = (g, snow = true) => (FROST ? M.frostify(g, snow) : g);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, stencil: true, powerPreference: 'high-performance' });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 0.95;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap; renderer.shadowMap.autoUpdate = false; // refreshed in draw(): every frame on high tiers, every other frame below
  renderer.info.autoReset = false;
  // a shader that fails to build on some phone must not take the meteor with it: log it and fall back (see update)
  let shaderFail = 0;
  renderer.debug.onShaderError = (gl, prog, vs, fs) => { shaderFail++; console.warn('shader build failed', gl.getProgramInfoLog(prog), gl.getShaderInfoLog(vs), gl.getShaderInfoLog(fs)); };
  const scene = new THREE.Scene(), keep = [];
  const K = (o) => { keep.push(o); return o; };
  const camera = new THREE.PerspectiveCamera(cfg.camera.fov, 9 / 16, 1, 230);

  // ---- sky dome: four-stop gradient from the zenith to the horizon, a band of soft drifting clouds, a soft sun glow; colours come from the tod keys
  const skyU = { c0: { value: new THREE.Color() }, c1: { value: new THREE.Color() }, c2: { value: new THREE.Color() }, c3: { value: new THREE.Color() }, sunDir: { value: new THREE.Vector3(0, 0.5, -1) }, sunC: { value: new THREE.Color() }, uStars: { value: 0 }, uAur: { value: 0 }, uTime: { value: 0 } };
  const sky = new THREE.Mesh(K(new THREE.SphereGeometry(140, 32, 16)), K(new THREE.ShaderMaterial({
    uniforms: skyU, side: THREE.BackSide, depthWrite: false, fog: false,
    vertexShader: 'varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'uniform vec3 c0; uniform vec3 c1; uniform vec3 c2; uniform vec3 c3; uniform vec3 sunDir; uniform vec3 sunC; uniform float uStars; uniform float uAur; uniform float uTime; varying vec3 vD; float hs(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); } float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(hs(i), hs(i + vec2(1.0, 0.0)), f.x), mix(hs(i + vec2(0.0, 1.0)), hs(i + vec2(1.0, 1.0)), f.x), f.y); } void main(){ float y = clamp(vD.y, -0.2, 1.0); vec3 c = mix(c3, c2, smoothstep(-0.04, 0.025, y)); c = mix(c, c1, smoothstep(0.025, 0.1, y)); c = mix(c, c0, smoothstep(0.1, 0.45, y)); if (y > 0.01 && y < 0.3) { float ax = atan(vD.x, -vD.z); vec2 q = vec2(ax * 4.0 + uTime * 0.006, y * 16.0); float n = vn(q) * 0.62 + vn(q * 2.7 + 5.3) * 0.38; float cl = smoothstep(0.5, 0.74, n) * smoothstep(0.01, 0.04, y) * smoothstep(0.3, 0.1, y); vec3 cc = mix(c2, vec3(1.0, 0.98, 0.95), 0.75 * (1.0 - min(uStars, 1.0))) + sunC * 0.06; c = mix(c, cc, cl * 0.8); } float s = max(dot(normalize(vD), normalize(sunDir)), 0.0); c += sunC * (pow(s, 24.0) * 0.35 + pow(s, 4.0) * 0.08); vec3 sc = floor(normalize(vD) * 260.0); float st = fract(sin(dot(sc, vec3(12.9898, 78.233, 37.719))) * 43758.5453); c += vec3(1.0, 0.95, 0.85) * step(0.9975, st) * smoothstep(0.12, 0.45, y) * uStars; if (uAur > 0.0) { float ax = atan(vD.x, -vD.z); float w = sin(ax * 3.0 + uTime * 0.12 + sin(ax * 7.0 - uTime * 0.25) * 0.7); float band = smoothstep(0.1, 0.95, w) * smoothstep(0.1, 0.26, y) * smoothstep(0.72, 0.34, y); float ray = 0.55 + 0.45 * sin(ax * 70.0 + uTime * 0.6 + w * 3.0); c += mix(vec3(0.12, 0.62, 0.48), vec3(0.42, 0.22, 0.7), smoothstep(0.2, 0.55, y)) * band * ray * uAur * 0.5; } gl_FragColor = vec4(c, 1.0);\n#include <colorspace_fragment>\n}',
  })));
  // drawn after the opaque world, so the depth test skips the sky's pixels under the ground and buildings
  sky.renderOrder = 10; sky.frustumCulled = false; scene.add(sky);
  scene.fog = new THREE.Fog(0xf0d9b8, 34, 90);

  const hemi = new THREE.HemisphereLight(0xfff4e4, 0xb86f45, 1.05);
  const sun = new THREE.DirectionalLight(0xfff1d6, 2.5);
  sun.castShadow = true; sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.035;
  Object.assign(sun.shadow.camera, { left: -15, right: 15, top: 15, bottom: -15, near: 1, far: 70 });
  const rim = new THREE.DirectionalLight(0xb9a8ff, 0.5); rim.position.set(-8, 6, -18);
  // a soft violet bounce from the crystals onto the front of the square (kept low: it washes out anything close to it)
  const crystalLight = new THREE.PointLight(FROST ? 0x6aa8ff : 0xc070ff, 1.5, 14, 1.2); crystalLight.position.set(W.meteor.x, W.meteor.y + 0.5, W.meteor.z + W.meteor.r + 3.5);
  // a warm key light that lands on the subject of a camera beat (always in the scene so no shader rebuild; 0 when idle)
  const focusLight = new THREE.PointLight(0xfff0d8, 0, 8, 1.4);
  scene.add(hemi, sun, sun.target, rim, crystalLight, focusLight);

  // ---- environment for reflections (gems, brass): a tiny warm studio, baked once with PMREM
  const pm = new THREE.PMREMGenerator(renderer);
  const envScene = new THREE.Scene();
  envScene.add(new THREE.Mesh(new THREE.SphereGeometry(10, 16, 8), new THREE.MeshBasicMaterial({ color: 0x8a6a5a, side: THREE.BackSide })));
  for (const [x, y, z, c, s] of [[0, 8, 0, 0xc8b49a, 5], [-8, 2, 3, 0xd08a5a, 3], [8, 3, -2, 0x7a90c0, 3], [0, 1, 9, 0xc8a870, 2.5], [3, -6, 0, 0x4a3428, 6]]) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(s, s), new THREE.MeshBasicMaterial({ color: c, side: THREE.DoubleSide })); m.position.set(x, y, z); m.lookAt(0, 0, 0); envScene.add(m);
  }
  const envRT = K(pm.fromScene(envScene, 0.04)); pm.dispose();
  envScene.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
  scene.environment = envRT.texture; scene.environmentIntensity = 0.45;

  const mat = K(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.62, metalness: 0.02 }));
  const brassMat = K(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.32, metalness: 0.55, envMapIntensity: 1.4 }));
  const gemMat = K(new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3, metalness: 0.78, flatShading: true, emissive: 0xffffff, emissiveIntensity: 0.3, envMapIntensity: 1.1 }));
  // the emissive takes the gem's own colour (instance x vertex colour, already in diffuseColor), so it glows that colour, not white
  gemMat.onBeforeCompile = (s) => { s.fragmentShader = s.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance *= diffuseColor.rgb;'); };
  // chunks keep their rocky base (vertex colour AO tint); solid crystal for the critter shell and egg spots
  const chunkMat = K(gemMat.clone()); chunkMat.vertexColors = true; chunkMat.onBeforeCompile = gemMat.onBeforeCompile;
  const shellMat = K(new THREE.MeshStandardMaterial({ color: 0x5ab8ff, roughness: 0.2, metalness: 0.5, flatShading: true, emissive: 0x2a80ff, emissiveIntensity: 0.35, envMapIntensity: 2 }));
  const spotMat = K(new THREE.MeshStandardMaterial({ color: 0xff8ad8, roughness: 0.15, metalness: 0.1, flatShading: true, emissive: 0xe04cc0, emissiveIntensity: 0.35, envMapIntensity: 2 }));
  const glassMat = K(new THREE.MeshStandardMaterial({ color: 0xcfeaff, roughness: 0.05, metalness: 0.0, transparent: true, opacity: 0.18, envMapIntensity: 2, depthWrite: false }));
  const glowMat = K(new THREE.MeshBasicMaterial({ color: 0xffd49a, fog: false }));
  const winMat = K(new THREE.MeshStandardMaterial({ color: 0x5a6a80, roughness: 0.2, emissive: 0xffb860, emissiveIntensity: 0 }));
  // characters get a warm fresnel rim so they read against the busy deck
  const charMat = K(mat.clone()), rimU = { rimK: { value: LK.rim } };
  charMat.onBeforeCompile = (s) => { Object.assign(s.uniforms, rimU); s.fragmentShader = 'uniform float rimK;\n' + s.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += vec3(1.0, 0.86, 0.66) * pow(1.0 - clamp(dot(normal, normalize(vViewPosition)), 0.0, 1.0), 3.0) * rimK;'); };
  const ringMat = K(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.28, metalness: 0.7, envMapIntensity: 1.5, emissive: 0x3a2a10, emissiveIntensity: 0.4 }));
  const lanternMat = K(new THREE.MeshBasicMaterial({ vertexColors: true, fog: false }));
  const beamMat = K(new THREE.MeshBasicMaterial({ color: 0xff6ad8, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
  const mesh = (g, m = mat, shadow = true, snow = true) => { if (FROST && m.vertexColors && !m.isMeshBasicMaterial && g.attributes.color && !g.userData.frost) { M.frostify(g, snow); g.userData.frost = true; } const o = new THREE.Mesh(K(g), m); o.castShadow = shadow; o.receiveShadow = true; scene.add(o); return o; };
  // set dressing that never moves is baked into one mesh per material and shadow flag at the end (draw-call budget)
  const statics = [], smesh = (g, m = mat, shadow = true, snow = true) => { const o = mesh(g, m, shadow, snow); statics.push(o); return o; };
  function bakeStatics() {
    const groups = new Map();
    for (const o of statics) { o.updateMatrixWorld(true); const k = o.material.uuid + o.castShadow; if (!groups.has(k)) groups.set(k, []); groups.get(k).push(o); }
    for (const list of groups.values()) {
      if (list.length < 2) continue;
      const one = mesh(M.merge(list.map((o) => o.geometry.clone().applyMatrix4(o.matrixWorld))), list[0].material, list[0].castShadow);
      for (const o of list) { scene.remove(o); o.geometry.dispose(); }
      void one;
    }
  }

  const _gc = new THREE.Color();
  /** Adds per-vertex colours from f(x, y, z) and keeps the UVs (M.paint drops them). */
  const tintGeo = (g, f) => { const p = g.attributes.position, a = new Float32Array(p.count * 3); for (let i = 0; i < p.count; i++) { const k = f(p.getX(i), p.getY(i), p.getZ(i)); a[i * 3] = k.r; a[i * 3 + 1] = k.g; a[i * 3 + 2] = k.b; } g.setAttribute('color', new THREE.BufferAttribute(a, 3)); return g; };
  // ---- ground: warm sand with ripples and pebbles, a big plane that fades into the fog
  const sandTex = K(canvasTex(512, 512, FROST ? (g, s) => {
    // snow: lavender base, soft blue drifts and pink glints (the brightest stays near #cdd0e8, anti-glare)
    g.fillStyle = '#bfc2e0'; g.fillRect(0, 0, s, s);
    for (let i = 0; i < 40; i++) { const y = random() * s; g.strokeStyle = `rgba(${random() < 0.5 ? '160,172,214' : '205,208,232'},0.4)`; g.lineWidth = 4 + random() * 8; g.beginPath(); g.moveTo(0, y); for (let x = 0; x <= s; x += 32) g.lineTo(x, y + Math.sin(x * 0.025 + i) * 10); g.stroke(); }
    for (let i = 0; i < 700; i++) { g.fillStyle = ['rgba(150,160,205,0.35)', 'rgba(205,208,232,0.6)', 'rgba(214,190,214,0.5)'][i % 3]; g.beginPath(); g.arc(random() * s, random() * s, 0.8 + random() * 2, 0, 6.3); g.fill(); }
  } : (g, s) => {
    g.fillStyle = '#e6bd88'; g.fillRect(0, 0, s, s);
    for (let i = 0; i < 46; i++) { const y = random() * s; g.strokeStyle = `rgba(${random() < 0.5 ? '201,152,99' : '247,220,176'},0.35)`; g.lineWidth = 3 + random() * 5; g.beginPath(); g.moveTo(0, y); for (let x = 0; x <= s; x += 32) g.lineTo(x, y + Math.sin(x * 0.03 + i) * 8); g.stroke(); }
    for (let i = 0; i < 900; i++) { g.fillStyle = ['rgba(150,100,70,0.35)', 'rgba(250,230,200,0.5)', 'rgba(190,120,80,0.3)'][i % 3]; g.beginPath(); g.arc(random() * s, random() * s, 0.8 + random() * 2.2, 0, 6.3); g.fill(); }
  }));
  sandTex.wrapS = sandTex.wrapT = THREE.RepeatWrapping; sandTex.repeat.set(14, 14);
  // big soft patches of lighter and redder sand (vertex colours over the tiled texture) so the desert is not one flat tone
  const groundGeo = tintGeo(new THREE.PlaneGeometry(220, 220, 48, 48).rotateX(-Math.PI / 2), (x, y, z) => { const n = M.noise3(x * 0.045, 0, z * 0.045) * 0.6 + M.noise3(x * 0.13, 3, z * 0.13) * 0.4, c = _gc.setRGB(1, 1, 1); return FROST ? c.setRGB(0.92 + n * 0.12, 0.94 + n * 0.1, 1) : c.setRGB(1, 0.9 + n * 0.16, 0.82 + n * 0.26); });
  const ground = new THREE.Mesh(K(groundGeo), K(new THREE.MeshStandardMaterial({ map: sandTex, roughness: 0.95, vertexColors: true })));
  ground.receiveShadow = true; scene.add(ground);

  // ---- the meteor: lumpy rock, rust and soot patches, crystal veins that glow, dug in by the cut map
  const MR = W.meteor.r, CUT_W = 128, CUT_H = 64;
  const meteorGeo = K(M.buildMeteor(MR));
  {
    const p = meteorGeo.attributes.position, n = p.count, colA = new Float32Array(n * 3), vein = new Float32Array(n), v = new THREE.Vector3(), c = new THREE.Color();
    for (let i = 0; i < n; i++) {
      v.fromBufferAttribute(p, i).normalize();
      const r = M.noise3(v.x * 2.2 + 5, v.y * 2.2, v.z * 2.2), q = M.noise3(v.x * 5 + 1, v.y * 5, v.z * 5);
      if (FROST) c.set(0x232a4a).lerp(new THREE.Color(0x4a5a88), Math.max(0, v.y) * 0.45 + q * 0.35).lerp(new THREE.Color(0x6a8cc0), Math.max(0, r - 0.55) * 1.8).lerp(new THREE.Color(M.FROSTPAL.snow), Math.max(0, Math.min(1, (v.y - 0.62 + q * 0.2) / 0.15)) * 0.85);
      else c.set(0x241c2c).lerp(new THREE.Color(0x5a4658), Math.max(0, v.y) * 0.45 + q * 0.35).lerp(new THREE.Color(0x9a5038), Math.max(0, r - 0.55) * 1.8);
      colA[i * 3] = c.r; colA[i * 3 + 1] = c.g; colA[i * 3 + 2] = c.b;
      // crystal seams: blobs of a second noise where it peaks, with a soft edge (patches, not scribbles)
      const blob = M.noise3(v.x * 3.4 + 9, v.y * 3.4, v.z * 3.4) * 0.7 + M.noise3(v.x * 8 + 2, v.y * 8, v.z * 8) * 0.3;
      vein[i] = Math.min(1, Math.max(0, blob - 0.71) / 0.07);
    }
    meteorGeo.setAttribute('color', new THREE.BufferAttribute(colA, 3)); meteorGeo.setAttribute('aVein', new THREE.BufferAttribute(vein, 1));
  }
  const cutData = new Uint8Array(CUT_W * CUT_H * 4);
  // the cut depth rides on a vertex attribute filled on the CPU (no texture reads in the vertex shader: some phone
  // GPUs drop the whole meteor when a vertex shader samples a texture)
  const muv = meteorGeo.attributes.uv, NV = muv.count, aCut = new Float32Array(NV);
  meteorGeo.setAttribute('aCut', new THREE.BufferAttribute(aCut, 1).setUsage(THREE.DynamicDrawUsage));
  const cutTexel = (x, y) => cutData[(Math.min(CUT_H - 1, Math.max(0, y)) * CUT_W + ((x % CUT_W) + CUT_W) % CUT_W) * 4];
  /** Bilinear cut depth (0..1) at uv, wrapping around the meteor in u. */
  const cutSample = (u, v) => { const x = u * CUT_W - 0.5, y = v * CUT_H - 0.5, x0 = Math.floor(x), y0 = Math.floor(y), fx = x - x0, fy = y - y0; return ((cutTexel(x0, y0) * (1 - fx) + cutTexel(x0 + 1, y0) * fx) * (1 - fy) + (cutTexel(x0, y0 + 1) * (1 - fx) + cutTexel(x0 + 1, y0 + 1) * fx) * fy) / 255; };
  const meteorU = { maxD: { value: cfg.mining.maxD }, uGlow: { value: 1 }, uPulse: { value: 0 }, uFlash: { value: new THREE.Vector4(0, 0, 0, 0) } };
  const meteorMat = K(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.82, metalness: 0.05, emissive: 0xffffff }));
  meteorMat.onBeforeCompile = (s) => {
    Object.assign(s.uniforms, meteorU);
    s.vertexShader = 'attribute float aVein; attribute float aCut; uniform float maxD; varying float vCut; varying float vVein; varying vec3 vObj;\n' + s.vertexShader.replace('#include <begin_vertex>',
      '#include <begin_vertex>\nfloat cut = aCut; transformed -= normalize(objectNormal) * cut * maxD; vCut = cut; vVein = aVein; vObj = position;');
    s.fragmentShader = 'uniform float uGlow; uniform float uPulse; uniform vec4 uFlash; varying float vCut; varying float vVein; varying vec3 vObj;\n' + s.fragmentShader
      .replace('#include <color_fragment>', '#include <color_fragment>\nfloat cr = clamp(max(smoothstep(0.04, 0.35, vCut), vVein * 0.85), 0.0, 1.0); float hue = sin(vObj.x * 1.7 + vObj.y * 2.3) * 0.5 + 0.5; vec3 crys = mix(' + (FROST ? 'vec3(0.18, 0.62, 0.98), vec3(0.5, 0.3, 0.95)' : 'vec3(0.82, 0.12, 0.62), vec3(0.12, 0.62, 0.95)') + ', hue); diffuseColor.rgb = mix(diffuseColor.rgb, crys * 0.35, cr);')
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\nfloat fl = uFlash.w * exp(-dot(vObj - uFlash.xyz, vObj - uFlash.xyz) * 0.8); float facet = 0.55 + 0.45 * abs(sin(dot(floor(vObj * 2.6), vec3(12.9898, 78.233, 37.719))));\ntotalEmissiveRadiance = min(crys * (cr * (0.24 + 0.1 * uPulse) * facet + fl) * uGlow, vec3(8.0));');
  };
  const meteor = mesh(meteorGeo, meteorMat); meteor.position.set(W.meteor.x, W.meteor.y, W.meteor.z); meteor.rotation.y = 0; meteor.frustumCulled = false; // the star of the screen: never culled by a stale bound
  const crater = smesh(M.buildCrater(MR), mat, false); crater.position.set(W.meteor.x, 0, W.meteor.z); crater.scale.set(1, 1, 0.72); // flattened toward the deck so its rim stops at the boards
  /** World point (and outward normal) on the meteor's surface at lon/lat (lon 0 faces the deck), cut depth d in m. */
  const surf = (lon, lat, d = 0, out = new THREE.Vector3()) => {
    const nx = Math.sin(lon) * Math.cos(lat), ny = Math.sin(lat), nz = Math.cos(lon) * Math.cos(lat), r = MR * 1.0 - d;
    return out.set(W.meteor.x + nx * r, W.meteor.y + ny * r * 0.94, W.meteor.z + nz * r);
  };
  /** Digs a soft round cut of radius r (m) and depth k (0..1 of maxD) at lon/lat. */
  function carve(lon, lat, r, k) {
    const u0 = 0.25 + lon / (Math.PI * 2), v0 = 0.5 + lat / Math.PI, ru = r / (MR * 2 * Math.PI * Math.max(0.3, Math.cos(lat))), rv = r / (MR * Math.PI);
    for (let y = Math.floor((v0 - rv * 1.5) * CUT_H); y <= Math.ceil((v0 + rv * 1.5) * CUT_H); y++) {
      if (y < 0 || y >= CUT_H) continue;
      for (let xx = Math.floor((u0 - ru * 1.5) * CUT_W); xx <= Math.ceil((u0 + ru * 1.5) * CUT_W); xx++) {
        const x = ((xx % CUT_W) + CUT_W) % CUT_W, du = (xx / CUT_W - u0) / ru, dv = (y / CUT_H - v0) / rv, f = Math.exp(-(du * du + dv * dv) * 2.2);
        const i = (y * CUT_W + x) * 4; cutData[i] = Math.min(255, cutData[i] + f * k * 255); cutData[i + 1] = cutData[i]; cutData[i + 2] = cutData[i];
      }
    }
    const vlo = v0 - rv * 1.6 - 1 / CUT_H, vhi = v0 + rv * 1.6 + 1 / CUT_H, uw = ru * 1.6 + 1 / CUT_W;
    for (let i = 0; i < NV; i++) { const v = muv.getY(i); if (v < vlo || v > vhi) continue; const u = muv.getX(i); let du = u - u0; du -= Math.round(du); if (Math.abs(du) <= uw) aCut[i] = cutSample(u, v); }
    meteorGeo.attributes.aCut.needsUpdate = true;
  }
  const cutAt = (lon, lat) => { const x = Math.floor((((0.25 + lon / (Math.PI * 2)) % 1 + 1) % 1) * CUT_W), y = Math.max(0, Math.min(CUT_H - 1, Math.floor((0.5 + lat / Math.PI) * CUT_H))); return cutData[(y * CUT_W + x) * 4] / 255; };
  // a few crystal clusters stuck in the meteor and around the rim (gem material, instanced)
  const shardGeo = K(M.chunkGeo(0.42)), rimShards = new THREE.InstancedMesh(shardGeo, chunkMat, 22);
  {
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), p = new THREE.Vector3(), s = new THREE.Vector3(), c = new THREE.Color();
    for (let i = 0; i < 22; i++) {
      if (i < 10) { const lon = -1.9 + random() * 3.8, lat = -0.1 + random() * 0.9; surf(lon, lat, 0.15, p); const nrm = p.clone().sub(meteor.position).normalize(); q.setFromUnitVectors(new THREE.Vector3(0, 1, 0), nrm); s.setScalar(1.1 + random() * 1.1); }
      else { const a = random() * Math.PI * 2, d = MR * 1.62 + random() * 1.4; p.set(W.meteor.x + Math.cos(a) * d, 0, W.meteor.z + Math.sin(a) * d * 0.9); if (p.z > -1.4) p.z = -1.4 - random(); q.setFromEuler(e.set(random() * 0.5, random() * 6, random() * 0.5)); s.setScalar(0.5 + random() * 0.6); }
      rimShards.setMatrixAt(i, m4.compose(p, q, s)); rimShards.setColorAt(i, c.set(GEMS[i % GEMS.length]));
    }
  }
  rimShards.castShadow = true; scene.add(rimShards);

  // ---- the deck (play area) and its rope fence, the crowd behind it
  const D = W.deck;
  smesh(M.buildDeck(D), mat, false, false);
  const lotsOn = new Set(); let repaintSquare = () => {}, paintFull = () => {};
  // the town square as one painted texture (one draw): packed earth, a main boardwalk down the middle, a street along
  // the meteor and one along the stations, a plank platform under every station, pebbles and dry grass in between
  {
    const w = D.x1 - D.x0 + 1.1, d = D.z1 - D.z0 + 1.1, PX = 40, cw = Math.round(w * PX), ch = Math.round(d * PX);
    const X = (x) => (x - D.x0 + 0.55) * PX, Z = (z) => (z - D.z0 + 0.55) * PX;
    // repainted when a station is bought (its lot gets its planks); a fixed seed keeps the earth the same each time
    let seed = 7; const random = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    // the first frame gets only the earth, boards and lots; late() repaints it with the ripples, pebbles, grass and tracks
    let full = false;
    const paintSquare = (g) => {
      seed = 7;
      g.fillStyle = FROST ? '#b9bcd8' : '#d8a874'; g.fillRect(0, 0, cw, ch);
      if (full) {
        for (let i = 0; i < 60; i++) { const y = random() * ch; g.strokeStyle = FROST ? `rgba(${random() < 0.5 ? '160,170,214' : '208,210,234'},0.35)` : `rgba(${random() < 0.5 ? '186,134,88' : '236,198,150'},0.35)`; g.lineWidth = 3 + random() * 6; g.beginPath(); g.moveTo(0, y); for (let x = 0; x <= cw; x += 40) g.lineTo(x, y + Math.sin(x * 0.02 + i) * 9); g.stroke(); }
        for (let i = 0; i < 2600; i++) { g.fillStyle = FROST ? ['rgba(150,160,205,0.35)', 'rgba(214,190,214,0.45)', 'rgba(225,228,244,0.55)'][i % 3] : ['rgba(140,92,60,0.35)', 'rgba(248,226,190,0.5)', 'rgba(176,112,72,0.3)'][i % 3]; g.beginPath(); g.arc(random() * cw, random() * ch, 0.8 + random() * 2.6, 0, 6.3); g.fill(); }
        if (!FROST) for (let i = 0; i < 90; i++) { const x = random() * cw, y = random() * ch; g.strokeStyle = `rgba(${120 + random() * 40},${130 + random() * 30},70,0.55)`; g.lineWidth = 1.6; for (let k = 0; k < 6; k++) { g.beginPath(); g.moveTo(x, y); g.lineTo(x + (random() - 0.5) * 12, y - 6 - random() * 8); g.stroke(); } }
      }
      // boards: a strip of planks across the strip's short side, dark seams, a few nails, a soft shadow at the edges
      const boards = (x0, z0, x1, z1) => {
        const ax = X(Math.min(x0, x1)), az = Z(Math.min(z0, z1)), bw = Math.abs(X(x1) - X(x0)), bh = Math.abs(Z(z1) - Z(z0)), along = bw > bh, n = Math.ceil((along ? bw : bh) / 17);
        g.fillStyle = 'rgba(90,50,25,0.28)'; g.fillRect(ax - 3, az - 3, bw + 6, bh + 6);
        for (let i = 0; i < n; i++) { const v = random(); g.fillStyle = FROST ? `rgb(${150 + v * 20},${128 + v * 16},${124 + v * 14})` : `rgb(${200 + v * 22},${140 + v * 18},${88 + v * 12})`; if (along) g.fillRect(ax + i * 17, az, 16, bh); else g.fillRect(ax, az + i * 17, bw, 16); }
        g.fillStyle = 'rgba(90,50,25,0.8)'; for (let i = 0; i <= n; i++) if (along) g.fillRect(ax + i * 17 - 1, az, 2, bh); else g.fillRect(ax, az + i * 17 - 1, bw, 2);
      };
      const pad = (x, z, r) => { g.save(); g.beginPath(); g.arc(X(x), Z(z), r * PX, 0, 6.3); g.clip(); boards(x - r, z - r, x + r, z + r); g.restore(); g.strokeStyle = 'rgba(110,64,32,0.8)'; g.lineWidth = 5; g.beginPath(); g.arc(X(x), Z(z), r * PX, 0, 6.3); g.stroke(); };
      const midZ = (W.counter.z + W.stands[0].z) / 2;
      // cart-wheel tracks curving across the earth and little boot prints along the streets
      if (full) { g.lineWidth = 3; for (let k = 0; k < 4; k++) { const z0 = D.z0 + random() * (D.z1 - D.z0), z1 = D.z0 + random() * (D.z1 - D.z0), bend = (random() - 0.5) * 6; for (const off of [0, 1.1]) { g.strokeStyle = 'rgba(120,72,40,0.22)'; g.beginPath(); g.moveTo(X(D.x0 - 1), Z(z0 + off)); g.quadraticCurveTo(X(0), Z((z0 + z1) / 2 + bend + off), X(D.x1 + 1), Z(z1 + off)); g.stroke(); } }
      g.fillStyle = 'rgba(110,66,36,0.28)'; for (let i = 0; i < 70; i++) { const along = random() < 0.5, t = random(), x = along ? D.x0 + t * (D.x1 - D.x0) : (random() < 0.5 ? -1.3 : 1.3), z = along ? (random() < 0.5 ? midZ + 1.2 : 2.6) : D.z0 + t * (D.z1 - D.z0); for (const sd of [-1, 1]) { g.beginPath(); g.ellipse(X(x) + (along ? 0 : sd * 4), Z(z) + (along ? sd * 4 : 0), 3, 5, along ? Math.PI / 2 : 0, 0, 6.3); g.fill(); } } }
      boards(-0.9, D.z0 - 0.55, 0.9, D.z1 + 0.55); // main boardwalk, meteor to the front fence
      boards(D.x0 - 0.55, 0.6, D.x1 + 0.55, 2.2); // street along the meteor
      boards(D.x0 - 0.55, midZ - 0.8, D.x1 + 0.55, midZ + 0.8); // street along the stations
      const lot = (x, z, r) => { g.setLineDash([10, 8]); g.strokeStyle = 'rgba(110,64,32,0.55)'; g.lineWidth = 4; g.beginPath(); g.arc(X(x), Z(z), r * PX, 0, 6.3); g.stroke(); g.setLineDash([]); };
      for (const [o, id] of [[W.pile], [W.counter], [W.cash], [W.crate], [W.order], [W.workshop, 'workshop'], [W.cart, 'ghost'], ...W.polishers.map((p) => [p, p.pad]), ...W.stands.map((p) => [p, p.pad])]) (!id || lotsOn.has(id) ? pad : lot)(o.x, o.z, (o.r || 1.25) + 0.9);
    };
    const sqTex = K(canvasTex(cw, ch, paintSquare));
    paintFull = () => { full = true; paintSquare(sqTex.image.getContext('2d')); sqTex.needsUpdate = true; };
    repaintSquare = (id) => { if (lotsOn.has(id) || ![W.workshop.pad, 'workshop', 'ghost', ...W.polishers.map((p) => p.pad), ...W.stands.map((p) => p.pad)].includes(id)) return; lotsOn.add(id); paintSquare(sqTex.image.getContext('2d')); sqTex.needsUpdate = true; };
    const top = new THREE.Mesh(K(new THREE.PlaneGeometry(w, d).rotateX(-Math.PI / 2)), K(new THREE.MeshStandardMaterial({ map: sqTex, roughness: 0.85 })));
    top.position.set((D.x0 + D.x1) / 2, 0.175, (D.z0 + D.z1) / 2); top.receiveShadow = true; scene.add(top);
  }
  mesh(M.buildRopeFence(D.x0 - 0.3, D.x1 + 0.3, D.z1 + 0.75, 12), brassMat);

  // ---- the town: false-front shops on both sides, water tower, windmill, mesas, cacti, lamps and bunting
  const shops = [];
  const shopDefs = [[-11.2, 1.0, Math.PI / 2, 4.2, 4.6, 0xd98a6a, PAL.cream, PAL.terraDark], [-11.6, 7.6, Math.PI / 2, 4.8, 3.6, 0x7ab8b0, PAL.cream, PAL.woodDark], [11.3, 0.4, -Math.PI / 2, 4.6, 4.2, 0xe6c56a, PAL.woodDark, PAL.red], [11.6, 7.2, -Math.PI / 2, 4.2, 5.0, 0xb88ad0, PAL.cream, PAL.navy], [-6.6, -9.5, 0.35, 4.4, 3.8, 0x9ab0d8, PAL.cream, PAL.terraDark], [7.2, -9.8, -0.4, 4.0, 4.4, 0xe8a27a, PAL.cream, PAL.woodDark]];
  for (const [x, z, ry, w, h, wall, trim, roof] of shopDefs) {
    const g = M.buildShop(w, h, wall, trim, roof), b = smesh(g.body), wn = smesh(g.windows, winMat, false);
    for (const o of [b, wn]) { o.position.set(sx(x), 0, sz(z)); o.rotation.y = ry; }
    shops.push(b);
  }
  const tower = smesh(M.buildWaterTower()); tower.position.set(sx(-9.6), 0, sz(-4.2));
  const wm = M.buildWindmill(), mill = smesh(wm.tower), blades = mesh(wm.blades); mill.position.set(sx(10.4), 0, sz(-4.6)); mill.rotation.y = -0.5;
  blades.position.set(sx(10.4) + Math.sin(-0.5) * 0.95, 6.35, sz(-4.6) + Math.cos(-0.5) * 0.95); blades.rotation.y = -0.5;
  for (const [x, z, w, h, d, ry] of [[-24, -30, 20, 10, 8, 0.2], [6, -38, 28, 14, 10, -0.05], [30, -28, 18, 9, 8, -0.3], [-40, -18, 16, 8, 8, 0.9], [42, -14, 16, 10, 8, -0.9], [-12, -46, 26, 18, 10, 0.1], [22, -52, 24, 20, 10, -0.15]]) { const m = smesh(M.buildMesa(w, h * 0.45, d), mat, false); m.position.set(x * 1.5, -0.4, z * 1.35 - 14); m.rotation.y = ry; }
  const cactusPos = [[-9.2, 10.5], [9.4, 11.2], [-13.6, 4.6], [14.0, 3.6], [-8.4, -1.8], [-15, -7], [15.5, -9], [-4.5, -12.5], [3.2, -13.2], [-18, 12], [18, 13]];
  cactusPos.forEach(([x, z], i) => { const c = smesh(FROST ? M.buildPine(i) : M.buildCactus(i)); c.position.set(sx(x), 0, sz(z)); c.rotation.y = i * 1.7; c.scale.setScalar(0.85 + (i % 3) * 0.15); });
  for (const [x, z, ry] of [[-9.0, 4.4, 0.4], [9.1, 3.8, -0.6], [-8.8, -6.6, 1.2], [9.4, 9.4, 2.1]]) { const b = smesh(M.buildBarrels()); b.position.set(sx(x), 0, sz(z)); b.rotation.y = ry; }
  // the wide desert around the town (dunes, rocks, cacti, two rock arches, a far windmill, grass tufts) is built after
  // the first frame by late(), into one merged mesh, so it never delays the first picture
  const farParts = [], fmesh = (g, m, shadow, snow = true) => { const o = new THREE.Object3D(); o.userData.g = g; o.userData.snow = snow; farParts.push(o); return o; };
  let fseed = 11; const frand = () => { fseed = (fseed * 16807) % 2147483647; return fseed / 2147483647; };
  function buildFar() {
  // the wide desert around the town: low dunes, rocks and cacti out to the mesas (baked into the static meshes, so
  // they add no draw calls; the fog fades the far ones)
  {
    const near = (x, z) => x > D.x0 - 9 && x < D.x1 + 9 && z > D.z0 - 16 && z < D.z1 + 12;
    for (let i = 0, n = 0; n < 34 && i < 400; i++) {
      const a = frand() * Math.PI * 2, r = 26 + frand() * 52, x = Math.cos(a) * r, z = 6 + Math.sin(a) * r; if (near(x, z)) continue; n++;
      const dune = fmesh(M.paint(new THREE.SphereGeometry(1, 14, 6, 0, Math.PI * 2, 0, Math.PI / 2), FROST ? 0xc8cbe6 : (n % 2 ? 0xe2b47e : 0xd59f69)), mat, false, false);
      dune.position.set(x, -0.05, z); dune.scale.set(5 + frand() * 7, 0.8 + frand() * 1.6, 3 + frand() * 4); dune.rotation.y = frand() * 3;
    }
    for (let i = 0, n = 0; n < 40 && i < 400; i++) {
      const x = (frand() - 0.5) * 110, z = -30 + frand() * 80; if (near(x, z)) continue; n++;
      const o = n % 3 ? fmesh(FROST ? M.buildPine(n) : M.buildCactus(n), mat, false) : fmesh(M.paint(new THREE.IcosahedronGeometry(0.7 + frand() * 1.1, 0).scale(1.3, 0.6, 1), FROST ? 0x9aa0c8 : 0xb4704a), mat, false, false);
      o.position.set(x, 0, z); o.rotation.y = frand() * 6; if (n % 3) o.scale.setScalar(0.7 + frand() * 0.6);
    }
  }
  // landmarks at middle distance (a sense of scale between the town and the mesas): two rock arches and a lone
  // windmill, plus sparse grass tufts on the sand around the town (all baked into the static meshes)
  for (const [x, z, ry, k] of [[-34, -6, 0.5, 1], [36, 4, -0.7, 0.85], [-30, 34, 1.2, 0.7]]) {
    const arch = fmesh(M.paint(new THREE.TorusGeometry(4.2, 1.3, 7, 14, Math.PI).scale(1, 1.15, 0.9), FROST ? 0x9aa0c8 : 0xc2784c), mat, false, false);
    arch.position.set(x, -0.4, z); arch.rotation.y = ry; arch.scale.setScalar(k);
    for (const sd of [-1, 1]) { const foot = fmesh(M.paint(new THREE.IcosahedronGeometry(1.7, 0).scale(1, 0.7, 1), FROST ? 0x8c92ba : 0xa9643e), mat, false, false); foot.position.set(x + Math.cos(ry) * sd * 4.2 * k, 0, z - Math.sin(ry) * sd * 4.2 * k); foot.scale.setScalar(k); }
  }
  { const wm2 = M.buildWindmill(), m2 = fmesh(wm2.tower); m2.position.set(30, 0, -22); m2.rotation.y = -0.9; m2.scale.setScalar(0.9); }
  if (!FROST) for (let i = 0, n = 0; n < 70 && i < 600; i++) {
    const x = (frand() - 0.5) * 70, z = -14 + frand() * 52; if (x > D.x0 - 1.5 && x < D.x1 + 1.5 && z > D.z0 - 7 && z < D.z1 + 1.5) continue; n++;
    const tuft = fmesh(M.merge([0, 1, 2, 3].map((k) => M.paint(M.at(new THREE.ConeGeometry(0.07, 0.45 + frand() * 0.3, 3), Math.cos(k * 1.6) * 0.12, 0.22, Math.sin(k * 1.6) * 0.12, Math.cos(k) * 0.35, 0, Math.sin(k) * 0.35), k % 2 ? 0x9aa05a : 0x7f8a48))), mat, false, false);
    tuft.position.set(x, 0, z); tuft.rotation.y = frand() * 6;
  }
    const one = mesh(M.merge(farParts.map((o) => { o.updateMatrixWorld(true); const g = o.userData.g; if (FROST && g.attributes.color && !g.userData.frost) { M.frostify(g, o.userData.snow); g.userData.frost = true; } return g.applyMatrix4(o.matrixWorld); })), mat, false);
    for (const o of farParts) o.userData.g.dispose();
    farParts.length = 0; return one;
  }
  // foreground: barrels and cacti beside the crowd (the ghost town fills the bottom of the frame)
  for (const [x, z, ry, k] of [[-7.4, 17.2, 0.3, 0], [8.6, 14.6, 0, 4], [-8.8, 14.8, 0, 5]]) {
    const o = k < 2 ? smesh(M.buildBarrels()) : smesh(FROST ? M.buildPine(k) : M.buildCactus(k)); o.position.set(sx(x), 0, k < 2 ? sf(z) : sz(z)); o.rotation.y = ry; if (k >= 2) o.scale.setScalar(0.7 + (k % 2) * 0.2);
  }
  // lamp posts along both deck edges (instanced): bulbs glow at dusk
  const lampXZ = []; for (const sx of [-1, 1]) for (const z of [-0.4, 3.6, 7.6, 11.6].map(sz)) lampXZ.push([sx * (D.x1 + 0.75), z, sx < 0 ? 0 : Math.PI]);
  const lp = M.buildLampPost(), posts = new THREE.InstancedMesh(K(lp.post), brassMat, lampXZ.length), bulbs = new THREE.InstancedMesh(K(lp.bulb), glowMat, lampXZ.length);
  lampXZ.forEach(([x, z, ry], i) => { const m4 = new THREE.Matrix4().compose(new THREE.Vector3(x, 0, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, ry, 0)), new THREE.Vector3(1, 1, 1)); posts.setMatrixAt(i, m4); bulbs.setMatrixAt(i, m4); });
  posts.castShadow = true; scene.add(posts, bulbs);
  const bunting = [];
  for (const sx of [-1, 1]) for (let k = 0; k < 2; k++) {
    const x = sx * (D.x1 + 0.75), za = sz(k ? 3.6 : -0.4), zb = sz(k ? 7.6 : 3.6), b = mesh(M.buildBunting(x, 2.6, za, x, 2.6, zb, 9), K(new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide, roughness: 0.7 })), false);
    bunting.push(b);
  }
  // across the front of the meteor, high: a festival line from the water tower to the windmill
  bunting.push(mesh(M.buildBunting(sx(-8.6), 5.2, sz(-3.6), sx(9.6), 5.6, sz(-3.8), 30), bunting[0].material, false));

  // the festival set (a content drop, off until its day): flower arch over the front and paper lantern strings
  if (cfg.drops && cfg.drops.festival) { const fs = M.buildFestival(W.deck.z1 + 0.5); smesh(fs.body); smesh(fs.lanterns, lanternMat, false); }

  // ---- soft round blob shadows under everything that moves (the only shadows on tier 0)
  const blobTex = K(canvasTex(64, 64, (g, s) => { const gr = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2); gr.addColorStop(0, 'rgba(60,30,20,0.55)'); gr.addColorStop(0.6, 'rgba(60,30,20,0.25)'); gr.addColorStop(1, 'rgba(60,30,20,0)'); g.fillStyle = gr; g.fillRect(0, 0, s, s); }));
  const blobs = new THREE.InstancedMesh(K(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2)), K(new THREE.MeshBasicMaterial({ map: blobTex, transparent: true, depthWrite: false, opacity: LK.contact })), 28);
  const BLOBS = 28;
  blobs.renderOrder = 1; blobs.frustumCulled = false; scene.add(blobs);

  // ---- stations: polishers and stands come from world arrays; the ones bought later start hidden (unlock pops them in)
  const built = {}; // unlock id -> objects that appear when it is bought
  const unlockObj = (id, o) => { (built[id] = built[id] || []).push(o); o.visible = false; return o; };
  const pols = W.polishers.map((d, i) => {
    const g = new THREE.Group(); g.position.set(d.x, 0.16, d.z); scene.add(g);
    const ry = i === 0 ? Math.PI : 0; // polisher 2 turns its hopper to the conveyor on the left
    const body = new THREE.Mesh(K(fz(M.buildPolisher())), mat); body.castShadow = body.receiveShadow = true; body.rotation.y = ry; g.add(body);
    const wheel = new THREE.Mesh(K(M.buildWheel()), mat); wheel.castShadow = true; wheel.position.set(Math.cos(ry) * -0.05, 1.45, 0); wheel.rotation.y = ry; g.add(wheel);
    if (d.pad) unlockObj(d.pad, g);
    return { d, g, wheel, ry, hop: new THREE.Vector3(d.x + Math.cos(ry) * 0.6, 1.6, d.z) };
  });
  const counter = mesh(M.buildCounter()); counter.position.set(W.counter.x, 0.16, W.counter.z);
  const stG = M.buildStand(), standGeo = K(fz(stG.body)), standGlass = K(stG.glass);
  const stands = W.stands.map((d) => {
    const g = new THREE.Group(); g.position.set(d.x, 0.16, d.z); g.rotation.y = Math.PI; scene.add(g);
    const b = new THREE.Mesh(standGeo, mat); b.castShadow = b.receiveShadow = true; const gl = new THREE.Mesh(standGlass, glassMat); g.add(b, gl);
    if (d.pad) unlockObj(d.pad, g);
    return { d, g };
  });
  // lantern rope from stand 1 to stand 2, and one along the crater rim (bought with stand 2: the rim lights up)
  {
    const s0 = W.stands[0], s1 = W.stands[1], g = new THREE.Group(), ropes = [], lans = []; scene.add(g);
    for (const [ax, az, bx, bz, y, n] of [[s0.x + 1.2, s0.z - 0.9, s1.x + 1.2, s1.z - 0.9, 2.9, 5], [-6.8, -1.6, -2.6, -2.2, 3.4, 7], [2.6, -2.2, 7.2, -1.4, 3.4, 7]]) { const L = M.buildLanternRope(ax, az, bx, bz, y, n); ropes.push(L.rope); lans.push(L.lanterns); }
    const r = new THREE.Mesh(K(M.merge(ropes)), mat), l = new THREE.Mesh(K(M.merge(lans)), lanternMat); r.castShadow = true; g.add(r, l);
    unlockObj('stand2', g);
  }
  const crate = mesh(M.buildCrate()); crate.position.set(W.crate.x, 0.16, W.crate.z); crate.rotation.y = 0.5;
  const cashMat = brassMat;
  const cashTray = mesh(M.merge([M.paint(M.at(M.rbox(2.0, 0.12, 1.6, 0.05), 0, 0.06, 0), PAL.woodDark), M.paint(M.at(M.rbox(1.8, 0.05, 1.4, 0.03), 0, 0.13, 0), PAL.velvet)]));
  cashTray.position.set(W.cash.x, 0.16, W.cash.z);
  // chunk conveyor: pile -> along the left edge -> polisher 2's hopper
  const beltPts = [[W.pile.x - 1.0, W.pile.z + 0.4], [-7.2, W.pile.z + 1.0], [-7.2, W.polishers[1].z - 0.2], [W.polishers[1].x - 1.0, W.polishers[1].z]];
  const BELT_Y = 1.0, belt = unlockObj('conveyor', mesh(M.buildConveyor(beltPts, BELT_Y)));
  const beltPath = beltPts.map(([x, z]) => new THREE.Vector3(x, BELT_Y + 0.16 + 0.12, z));
  void belt;
  // ring workshop
  const WS = W.workshop, workshop = unlockObj('workshop', mesh(M.buildWorkshop())); workshop.position.set(WS.x, 0.16, WS.z);
  // laser cutter: base + swivel head + three beams (additive), aimed at the meteor
  const LA = W.laserAt, LZ = M.buildLaser(), laser = unlockObj('laser', new THREE.Group()); laser.position.set(LA.x, 0.16, LA.z); scene.add(laser);
  { const b = new THREE.Mesh(K(LZ.base), mat); b.castShadow = true; laser.add(b); }
  const laserHead = new THREE.Mesh(K(LZ.head), brassMat); laserHead.castShadow = true; laserHead.position.y = 1.45; laser.add(laserHead);
  const beamGeo = K(new THREE.CylinderGeometry(0.05, 0.05, 1, 8, 1, true).translate(0, 0.5, 0).rotateX(Math.PI / 2));
  const beams = [-0.2, 0, 0.2].map((dx) => { const m = new THREE.Mesh(beamGeo, beamMat); m.renderOrder = 7; m.visible = false; scene.add(m); return { m, dx }; });
  const laserFx = { t: 0, p: new THREE.Vector3() };
  // canyon road with the bridge (planks come back when it is fixed) and the tour bus
  const RD = { z: sf(16.2), bx: sx(-5.2), park: sx(1.6) };
  const road = M.buildRoad(-60, 60, RD.z, RD.bx); smesh(road.road, mat, false, false);
  unlockObj('road', mesh(M.merge(road.planks)));
  const busB = M.buildBus(), bus = new THREE.Group(); scene.add(bus);
  { const b = new THREE.Mesh(K(fz(busB.body)), mat), w = new THREE.Mesh(K(busB.windows), winMat); b.castShadow = true; bus.add(b, w); }
  const busWheelGeo = K(busB.wheel), busWheels = busB.wheels.map(([x, y, z]) => { const m = new THREE.Mesh(busWheelGeo, mat); m.position.set(x, y, z); bus.add(m); return m; });
  const busSt = { mode: 'off', t: 0, x: -50 }; bus.visible = false;
  // the order kid: a small tourist with a speech bubble (the bubble is HTML in game.js)
  const kid = M.makePerson(charMat, { pants: 0x5a6a8a, boots: PAL.ink, shirt: PAL.sun, shirt2: 0xd8a64a, skin: PAL.skin, hair: 0x8a4a2a, hat: 'cap', hatCol: PAL.pink, band: PAL.cream });
  kid.root.scale.setScalar(1.0); kid.root.visible = false; kid.root.traverse((m) => { m.castShadow = false; }); scene.add(kid.root);
  const kidSt = { k: 0, happy: 0, kind: null };
  // station markers: a soft ring on the deck at each stop the hero walks into (keyed by the guide's target id)
  const markTex = K(canvasTex(128, 128, (g, s) => { g.strokeStyle = 'rgba(255,240,210,0.95)'; g.lineWidth = 7; g.setLineDash([14, 10]); g.beginPath(); g.arc(s / 2, s / 2, s / 2 - 8, 0, 6.3); g.stroke(); }));
  const markKeys = [], markXZR = [];
  const markAt = (key, x, z, r, padId = null) => { markKeys.push(key); markXZR.push([x, z, r, padId]); };
  markAt('mine', W.mine.x, W.mine.z, W.mine.r); markAt('pile', W.pile.x, W.pile.z, W.pile.r); markAt('counter', W.counter.x, W.counter.z - 1.15, 0.9);
  for (const p of pols) markAt(p.d.id, p.d.in[0], p.d.in[1], 0.9, p.d.pad);
  for (const st of stands) markAt(st.d.id + ':in', st.d.in[0], st.d.in[1], 0.9, st.d.pad);
  markAt('cash', W.cash.x, W.cash.z, 1.1); markAt('crate', W.crate.x, W.crate.z + 0.9, 0.7); markAt('workshop', WS.in[0], WS.in[1], 0.9, 'workshop'); markAt('order', W.order.x, W.order.z, W.order.r, 'order');
  const marks = new THREE.InstancedMesh(K(new THREE.PlaneGeometry(2, 2).rotateX(-Math.PI / 2)), K(new THREE.MeshBasicMaterial({ map: markTex, transparent: true, depthWrite: false, opacity: 0.28, color: 0xfff0d0 })), markKeys.length);
  marks.renderOrder = 2; marks.frustumCulled = false; scene.add(marks);
  /** Shows the station rings: built stations only, not the guide's current target (its own gold ring takes over). */
  function drawMarks(S, g) {
    markXZR.forEach(([x, z, r, padId], i) => {
      const on = (padId === 'order' ? !!S.order : !padId || S.pads.some((p) => p.id === padId && p.done)) && !(g && (g.what === markKeys[i] || g.what + ':in' === markKeys[i]));
      marks.setMatrixAt(i, _m.compose(_p.set(x, 0.18, z), _q.identity(), _s.setScalar(on ? r : 0)));
    });
    marks.instanceMatrix.needsUpdate = true;
  }

  // ---- the price pad: one brass pad that moves to whichever unlock is up next; its face is a canvas redrawn in
  // place (one texture for the whole game), with the unlock's icon, a fill ring and the coins left
  const pad = new THREE.Group(); scene.add(pad);
  { const b = new THREE.Mesh(K(M.buildPadBase()), brassMat); b.receiveShadow = true; pad.add(b); }
  const padCanvas = document.createElement('canvas'); padCanvas.width = padCanvas.height = 256;
  const padTex = K(new THREE.CanvasTexture(padCanvas)); padTex.colorSpace = THREE.SRGBColorSpace; padTex.anisotropy = 4;
  const padFace = new THREE.Mesh(K(new THREE.PlaneGeometry(2.0, 2.0).rotateX(-Math.PI / 2)), K(new THREE.MeshBasicMaterial({ map: padTex, transparent: true }))); padFace.position.y = 0.2; pad.add(padFace);
  let padDrawn = '', padId = null;
  function drawPad(icon, left, price) {
    const key = icon + left; if (key === padDrawn) return; padDrawn = key;
    const g = padCanvas.getContext('2d'), s = 256, k = 1 - left / price;
    g.clearRect(0, 0, s, s);
    g.fillStyle = '#2f6f69'; g.beginPath(); g.roundRect(14, 14, s - 28, s - 28, 34); g.fill();
    g.strokeStyle = '#f6d27a'; g.lineWidth = 10; g.beginPath(); g.roundRect(14, 14, s - 28, s - 28, 34); g.stroke();
    // icon on top, then a fat progress bar that fills as coins drain in, then the coins still to pay
    g.save(); g.translate(s / 2, 84); g.scale(0.78, 0.78); drawIcon(g, icon, '#ffe6a8', '#2f6f69'); g.restore();
    const bx = 38, by = 150, bw = s - 76, bh = 30;
    g.fillStyle = '#163b38'; g.beginPath(); g.roundRect(bx, by, bw, bh, bh / 2); g.fill();
    if (k > 0) { g.fillStyle = '#ffd35a'; g.beginPath(); g.roundRect(bx, by, Math.max(bh, bw * k), bh, bh / 2); g.fill(); g.fillStyle = 'rgba(255,255,255,0.45)'; g.beginPath(); g.roundRect(bx + 6, by + 4, Math.max(bh - 12, bw * k - 12), 8, 4); g.fill(); }
    g.strokeStyle = '#f6d27a'; g.lineWidth = 4; g.beginPath(); g.roundRect(bx, by, bw, bh, bh / 2); g.stroke();
    g.font = '900 50px system-ui, sans-serif'; g.textBaseline = 'middle'; const tw = g.measureText(String(left)).width, cx = s / 2 - (tw + 46) / 2;
    g.fillStyle = '#ffd35a'; g.beginPath(); g.arc(cx + 18, 210, 18, 0, 6.3); g.fill(); g.fillStyle = '#c98a2a'; g.beginPath(); g.arc(cx + 18, 210, 11, 0, 6.3); g.fill();
    g.fillStyle = '#fff6e0'; g.textAlign = 'left'; g.fillText(String(left), cx + 46, 212);
    padTex.needsUpdate = true;
  }
  pad.visible = false;

  // ---- the drill rig (hidden until bought) and its drill head
  const rig = unlockObj('rig', new THREE.Group()); rig.position.set(W.rigAt.x, 0, W.rigAt.z); rig.rotation.y = 0.35; scene.add(rig);
  { const b = new THREE.Mesh(K(fz(M.buildRig())), mat); b.castShadow = true; rig.add(b); }
  const drill = new THREE.Mesh(K(M.buildDrillHead()), brassMat); drill.castShadow = true; drill.position.set(0, 2.3, -2.15); drill.rotation.x = -0.32; rig.add(drill);
  const rigLon = Math.atan2(W.rigAt.x - W.meteor.x, W.rigAt.z - W.meteor.z) * 0.9, rigLat = 0.05;
  const laserLon = Math.atan2(LA.x - W.meteor.x, LA.z - W.meteor.z);

  // ---- chapter 1 unlocks 8-14: the ghost town and its mine cart, a second drill rig, the cable car,
  // the stargazer deck, the crown jeweler, the neon main street and the heart of the meteor (finale + comet)
  // the ghost town across the road: grey and boarded up until the cart lights each house (one draw: aIdx picks the
  // house, uLit[i] blends it from its ghost colour to its real one, swaps boards for bunting and lights the windows)
  const GH = [[-4.6, 19.7, 0.08, 3.8, 3.6, 0xe8a27a, PAL.cream, PAL.terraDark], [0.2, 20.1, 0, 4.2, 4.4, 0x7ab8b0, PAL.cream, PAL.woodDark], [4.9, 19.7, -0.08, 3.8, 3.8, 0xe6c56a, PAL.woodDark, PAL.red]];
  for (const g of GH) { g[0] = sx(g[0]); g[1] = sz(g[1]); }
  const ghostU = { uLit: { value: [0, 0, 0] }, uWin: { value: 0 }, uFade: { value: LK.nearFade ?? 0.22 } };
  const ghostMat = K(mat.clone());
  ghostMat.onBeforeCompile = (s) => {
    Object.assign(s.uniforms, ghostU);
    s.vertexShader = 'attribute vec3 aGhost; attribute float aIdx; attribute float aKind; attribute float aWin; uniform float uLit[3]; varying float vK; varying float vWin; varying vec4 vClip;\n' + s.vertexShader
      .replace('#include <project_vertex>', '#include <project_vertex>\nvClip = gl_Position;')
      .replace('#include <color_vertex>', '#include <color_vertex>\nint gi = int(aIdx + 0.5); vK = gi == 0 ? uLit[0] : gi == 1 ? uLit[1] : uLit[2]; vColor.xyz = mix(aGhost, vColor.xyz, vK); vWin = aWin;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nfloat gk = int(aIdx + 0.5) == 0 ? uLit[0] : int(aIdx + 0.5) == 1 ? uLit[1] : uLit[2]; float hide = aKind > 1.5 ? step(gk, 0.5) : aKind > 0.5 ? step(0.5, gk) : 0.0; transformed.y -= hide * 60.0;');
    // near the camera the houses would fill the joystick band at the bottom of the frame: there they dissolve with a
    // 4x4 ordered dither (no transparency sort, same draw), a short dissolved edge, nothing below it
    s.fragmentShader = 'uniform float uWin; uniform float uFade; varying float vK; varying float vWin; varying vec4 vClip;\n' + s.fragmentShader.replace('void main() {', 'void main() {\nif (uFade > 0.0) { float sy = vClip.y / vClip.w * 0.5 + 0.5; float f = clamp((uFade - sy) / 0.05, 0.0, 1.0); ivec2 q = ivec2(mod(gl_FragCoord.xy, 4.0)); const float bm[16] = float[16](0.,8.,2.,10.,12.,4.,14.,6.,3.,11.,1.,9.,15.,7.,13.,5.); if (f > (bm[q.x + q.y * 4] + 0.5) / 16.0) discard; }').replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += vec3(1.0, 0.72, 0.38) * vWin * vK * uWin;');
  };
  const ghostTown = mesh(M.buildGhostTown(GH), ghostMat, false);
  const ghostFx = { k: [0, 0, 0], to: [0, 0, 0] };
  // the mine cart rail: from the cart stop east along the deck edge, down past the road, then west along the houses
  const CA = W.cart, railPts = [[CA.x, CA.z + 0.55], [CA.x, sz(10.95)], [sx(8.4), sz(10.95)], [sx(8.4), sz(18.0)], [sx(-4.6), sz(18.0)]];
  unlockObj('ghost', mesh(M.buildRail(railPts), mat, false, false));
  const railPath = new THREE.CurvePath(); for (let i = 0; i < railPts.length - 1; i++) railPath.add(new THREE.LineCurve3(new THREE.Vector3(railPts[i][0], 0.16, railPts[i][1]), new THREE.Vector3(railPts[i + 1][0], 0.16, railPts[i + 1][1])));
  const railLen = railPath.getLength(), houseU = GH.map(([x]) => { let best = 0, bd = 1e9; for (let u = 0; u <= 1; u += 0.005) { const p = railPath.getPointAt(u); const d = Math.abs(p.x - x) + Math.abs(p.z - sz(18.0)) * 3; if (d < bd) { bd = d; best = u; } } return best; });
  const cart = unlockObj('ghost', mesh(M.buildMineCart(), mat, true)); cart.position.set(CA.x, 0.16, CA.z + 0.55);
  const cartSt = { u: 0, back: 0 };
  // drill rig 2, on the left of the meteor (same build as rig 1)
  const rig2 = unlockObj('rig2', new THREE.Group()); rig2.position.set(W.rig2At.x, 0, W.rig2At.z); rig2.rotation.y = -0.4; scene.add(rig2);
  { const b = new THREE.Mesh(K(fz(M.buildRig())), mat); b.castShadow = true; rig2.add(b); }
  const drill2 = new THREE.Mesh(drill.geometry, brassMat); drill2.castShadow = true; drill2.position.set(0, 2.3, -2.15); drill2.rotation.x = -0.32; rig2.add(drill2);
  const rig2Lon = Math.atan2(W.rig2At.x - W.meteor.x, W.rig2At.z - W.meteor.z) * 0.9;
  const rigs = [{ g: rig, drill, lon: rigLon, k: 0 }, { g: rig2, drill: drill2, lon: rig2Lon, k: 0 }];
  // the cable car across the back of town: two pylons, the cable and three gondolas (one instanced draw)
  const CB = M.buildCableLine([sx(-12.5), sz(-10.6), 6.6], [sx(12.5), sz(-11.4), 7.2]);
  unlockObj('cable', mesh(CB.line, mat, false));
  const gondolas = unlockObj('cable', new THREE.InstancedMesh(K(fz(M.buildGondola())), mat, 3)); gondolas.frustumCulled = false; scene.add(gondolas);
  const gondU = [0.1, 0.77, 1.43];
  /** Gondola i rides back and forth along the cable (hanging from the point it returns). */
  const gondAt = (i, out) => { const p = (gondU[i] + tAll * 0.025) % 2; return CB.curve.getPoint(0.04 + 0.92 * (p < 1 ? p : 2 - p), out); };
  // the stargazer deck on the right, beside the windmill
  const stargazer = unlockObj('stargaze', mesh(FROST ? M.buildCocoa() : M.buildStargazer(), mat, true)); stargazer.position.set(sx(8.9), 0.16, sz(-0.6)); stargazer.rotation.y = -0.6;
  // the crown jeweler: turns rings into crowns that ride off on the cable car
  const JW = W.jeweler, jeweler = unlockObj('crown', mesh(M.buildJeweler(), mat, true)); jeweler.position.set(JW.x, 0.16, JW.z); jeweler.rotation.y = -0.5;
  // neon on main street: five signs that light one after another (one draw; uOn counts the lit signs)
  const neonU = { uOn: { value: 0 }, uBoost: { value: 1 } };
  const neonMat = K(new THREE.MeshBasicMaterial({ vertexColors: true, fog: false }));
  neonMat.onBeforeCompile = (s) => {
    Object.assign(s.uniforms, neonU);
    s.vertexShader = 'attribute float aIdx; uniform float uOn; varying float vOn;\n' + s.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvOn = clamp(uOn - aIdx, 0.0, 1.0);');
    s.fragmentShader = 'uniform float uBoost; varying float vOn;\n' + s.fragmentShader.replace('#include <color_fragment>', '#include <color_fragment>\ndiffuseColor.rgb *= mix(0.16, uBoost, vOn);');
  };
  const neon = unlockObj('neon', mesh(M.buildNeon(([
    FROST ? { shape: 'flake', x: -6.2, y: 4.4, z: -2.6, ry: 0.25, s: 0.75, color: 0x8ad8ff } : { shape: 'star', x: -6.2, y: 4.4, z: -2.6, ry: 0.25, s: 0.7, color: 0xffd35a },
    { shape: 'gem', x: 6.3, y: 4.3, z: -2.7, ry: -0.25, s: 0.75, color: 0x6fe0f0 },
    { shape: 'heart', x: -8.2, y: 3.4, z: 5.6, ry: 0.6, s: 0.75, color: 0xff6fa8 },
    { shape: 'wave', x: 8.3, y: 3.6, z: 5.4, ry: -0.6, s: 0.6, color: 0x8fe0a8 },
    { shape: FROST ? 'flake' : 'arch', x: 0.5, y: 6.2, z: -3.9, ry: 0, s: FROST ? 1.0 : 1.6, color: FROST ? 0x9ae0d0 : 0xc890ff },
  ]).map((n) => ({ ...n, x: sx(n.x), z: sz(n.z) }))), neonMat, false));
  const neonFx = { on: 0, to: 0 };
  // the heart of the meteor (rises in the finale) and the comet that points to chapter 2
  const heartMat = K(shellMat.clone()); if (FROST) { heartMat.color.set(0x7ac8ff); heartMat.emissive.set(0x3a8ae0); } else { heartMat.color.set(0xff7ad0); heartMat.emissive.set(0xe0409a); }
  const heart = new THREE.Mesh(K(M.heartGeo()), heartMat); heart.visible = false; scene.add(heart);
  const cg = M.cometGeo(), comet = new THREE.Group(); comet.visible = false; scene.add(comet);
  const cometMat = K(new THREE.MeshBasicMaterial({ color: FROST ? 0xffa060 : 0x9fd8f0, fog: false, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  comet.add(new THREE.Mesh(K(cg.head), cometMat), new THREE.Mesh(K(cg.tail), K(new THREE.MeshBasicMaterial({ vertexColors: true, color: FROST ? 0xffa070 : 0xffffff, fog: false, transparent: true, opacity: 0.45, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }))));
  comet.children.forEach((m) => { m.renderOrder = -5; });
  const COMET = { from: new THREE.Vector3(40, 30, -60), to: new THREE.Vector3(-4, 24, -54) }; // high over the mesas: the finale camera turns up to it
  const finFx = { st: null, t: 0 };

  // ---- characters: the hero (miner), tourists (pool), the crowd (instanced), the critter and its egg
  // the hero marks the stencil where it is seen; a soft silhouette then shows it wherever a station or a crowd hides it
  const heroMat = K(charMat.clone()); heroMat.onBeforeCompile = charMat.onBeforeCompile;
  Object.assign(heroMat, { stencilWrite: true, stencilRef: 1, stencilFunc: THREE.AlwaysStencilFunc, stencilZPass: THREE.ReplaceStencilOp });
  const silMat = K(new THREE.MeshBasicMaterial({ color: LK.silhouette || 0xffe6a8, transparent: true, opacity: LK.silhouetteAlpha ?? 0.62, depthWrite: false, depthFunc: THREE.GreaterDepth, fog: false,
    stencilWrite: true, stencilRef: 1, stencilFunc: THREE.NotEqualStencilFunc, stencilZPass: THREE.KeepStencilOp }));
  const hero = M.makePerson(heroMat, { pants: PAL.navy, boots: PAL.woodDark, shirt: PAL.red, shirt2: 0xb8443c, vest: PAL.woodLight, scarf: PAL.teal, belt: PAL.brassDark, skin: PAL.skin, hair: PAL.woodDark, hat: null, pickaxe: true, sleeve: 0xe7d4b4 });
  hero.root.scale.setScalar(1.4); scene.add(hero.root);
  const heroSil = [];
  // the hat slot: one mesh on the head, its geometry swapped for the hat that is worn (album)
  const hatGeos = {}; for (const hd of cfg.hats) hatGeos[hd.id] = K(M.buildHat(hd.id));
  const hatMesh = new THREE.Mesh(hatGeos[cfg.hats[0].id], heroMat); hatMesh.castShadow = true; hero.head.add(hatMesh); let hatOn = cfg.hats[0].id;
  { const ms = []; hero.root.traverse((m) => { if (m.isMesh) ms.push(m); }); for (const m of ms) { const o = new THREE.Mesh(m.geometry, silMat); o.scale.setScalar(LK.silhouetteGrow ?? 1.12); o.renderOrder = 9; o.castShadow = false; m.add(o); heroSil.push([m, o]); } }
  const outfits = [
    { pants: 0x5a6a8a, boots: PAL.ink, shirt: PAL.pink, shirt2: 0xd47898, skin: PAL.skin, hair: 0x4a2e22, hat: 'sun', hatCol: 0xf3d6a6, band: PAL.pink, camera: true },
    { pants: 0x3e5a4a, boots: PAL.woodDark, shirt: PAL.sun, shirt2: 0xd8a64a, skin: PAL.skinDark, skin2: 0xa8704e, hair: PAL.ink, hat: 'cap', hatCol: PAL.teal, band: PAL.tealDark },
    { pants: PAL.plum, boots: PAL.ink, shirt: PAL.mint, shirt2: 0x6cc0a0, skin: PAL.skin, hair: 0xd9a04a, hat: 'sun', hatCol: 0xe9c08a, band: PAL.violet, camera: true },
    { pants: 0x6a4a3a, boots: PAL.woodDark, shirt: 0x7aa8e8, shirt2: 0x5a88c8, skin: 0xe0a880, hair: 0x2a1a14, hat: 'cowboy', hatCol: 0x8e6a40, band: PAL.red },
    { pants: PAL.navy, boots: PAL.ink, shirt: 0xf09a6a, shirt2: 0xd8784a, skin: PAL.skinDark, skin2: 0xa8704e, hair: PAL.ink, hat: 'cap', hatCol: PAL.red, band: PAL.cream },
    { pants: 0x4a5a3a, boots: PAL.woodDark, shirt: PAL.violet, shirt2: 0x6a44c0, skin: PAL.skin, hair: 0x8a4a2a, hat: 'sun', hatCol: PAL.cream, band: PAL.teal, camera: true },
  ];
  const noCast = (o) => o.traverse((m) => { m.castShadow = false; }); // blob shadows stand in (draw-call budget)
  const tourists = outfits.map((o) => { const p = M.makePerson(charMat, o); noCast(p.root); p.root.scale.setScalar(1.25); p.root.visible = false; p.id = -1; scene.add(p.root); return p; });
  const crowdG = M.crowdGeos(), crowdTint = K(new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6 }));
  const C = W.crowd, crowd = [];
  for (let i = 0; i < C.n; i++) {
    const row = i % 2, x = C.x0 + ((i * 0.618034) % 1) * (C.x1 - C.x0), z = C.z0 + row * 0.9 + random() * 0.3;
    crowd.push({ x, z, ry: Math.PI + (random() - 0.5) * 0.8, ph: random() * 6, jump: 0, s: 0.95 + random() * 0.15, col: new THREE.Color([PAL.red, PAL.teal, PAL.sun, PAL.pink, PAL.violet, PAL.mint, 0x7aa8e8, 0xf09a6a][i % 8]) });
  }
  const crowdA = new THREE.InstancedMesh(K(crowdG.tint), crowdTint, C.n), crowdB = new THREE.InstancedMesh(K(crowdG.rest), mat, C.n);
  crowd.forEach((p, i) => crowdA.setColorAt(i, p.col));
  for (const m of [crowdA, crowdB]) { m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); m.castShadow = true; m.frustumCulled = false; scene.add(m); }
  let crowdN = C.n;
  // the six critters (each its own fur colour and crystal shell), shown once hatched; they follow in a parade
  const critters = {};
  for (const d of cfg.critters) {
    const sm = K(shellMat.clone()); sm.color.set(d.shell); sm.emissive.set(d.shell).multiplyScalar(0.55);
    const c = M.makeCritter(charMat, sm, new THREE.Color(d.body).getHex()); c.root.visible = false; c.root.scale.setScalar(1.25 * (d.s || 1)); noCast(c.root); scene.add(c.root);
    c.sm = sm; c.hatchK = 0; c.s = 1.25 * (d.s || 1); critters[d.id] = c;
    if (d.rarity === 'legendary') { const hid = d.area === 'frost' ? 'icecrown' : 'crown', cr = new THREE.Mesh(hatGeos[hid] || K(M.buildHat(hid)), mat); cr.scale.setScalar(0.8); cr.position.set(0, 0.02, -0.02); c.head.add(cr); }
  }
  // the shopkeeper armadillo
  const keeper = (FROST ? M.makePenguin : M.makeKeeper)(charMat); keeper.root.scale.setScalar(1.25); noCast(keeper.root); scene.add(keeper.root); unlockObj('keeper', keeper.root);
  keeper.root.position.set(W.keeperHome.x, 0.16, W.keeperHome.z);
  const eg = M.eggGeos(), egg = new THREE.Group(); scene.add(egg);
  const eggShell = new THREE.Mesh(K(eg.shell), mat), eggSpots = new THREE.Mesh(K(eg.spots), spotMat); eggShell.castShadow = true; egg.add(eggShell, eggSpots);
  egg.scale.setScalar(1.7);
  const eggLodge = surf(0.18, 0.55, -0.1); egg.position.copy(eggLodge); egg.rotation.set(0.6, 0, -0.3);
  const eggBeacon = new THREE.Mesh(K(new THREE.RingGeometry(0.75, 0.95, 40).rotateX(-Math.PI / 2)), K(new THREE.MeshBasicMaterial({ color: 0xffc8f0, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending })));
  eggBeacon.position.set(W.egg.x, 0.2, W.egg.z); scene.add(eggBeacon);
  const eggState = { mode: 'lodged', t: 0, from: new THREE.Vector3() };

  // ---- goal marker: a pulsing ring on the deck at the next useful stop (the floor trail from the hero leads to it)
  const guideRing = new THREE.Mesh(K(new THREE.RingGeometry(0.55, 0.72, 40).rotateX(-Math.PI / 2)), K(new THREE.MeshBasicMaterial({ color: 0xffd36a, transparent: true, opacity: 0.6, depthWrite: false })));
  guideRing.renderOrder = 3; scene.add(guideRing); let guideSide = 0;
  // ---- station badges: a round icon over every working stop says what it is for (pickaxe = mine here, rock = pick
  // up chunks, rock to gem = polish, gem = pick up gems, stand = sell, coins = collect); the guide's target gets a big
  // bouncing one. One atlas texture, one instanced draw, always on top. A trail of chevrons on the floor leads there.
  const ICONS = ['pick', 'rock', 'polish', 'gem', 'stand', 'cash', 'crate', 'egg', FROST ? 'globe' : 'ring', 'cart', 'heart', 'cable'], IC = 4;
  const iconOf = (w) => { if (w === 'mine') return 0; if (w === 'pile') return 1; if (pols.some((p) => p.d.id === w)) return 2; if (w === 'counter') return 3; if (stands.some((q) => q.d.id === w)) return 4; return { cash: 5, crate: 6, egg: 7, workshop: 8, cart: 9, order: 10, travel: 11 }[w] ?? -1; };
  const badgeTex = K(canvasTex(512, 512, (g, s) => {
    const c = s / IC, gem = (x, y, r, a = '#d8279f', b = '#ff9ae8') => { g.fillStyle = a; g.beginPath(); g.moveTo(x, y - r); g.lineTo(x + r * 0.85, y - r * 0.25); g.lineTo(x, y + r); g.lineTo(x - r * 0.85, y - r * 0.25); g.closePath(); g.fill(); g.fillStyle = b; g.beginPath(); g.moveTo(x, y - r); g.lineTo(x + r * 0.35, y - r * 0.25); g.lineTo(x, y + r * 0.3); g.lineTo(x - r * 0.35, y - r * 0.25); g.closePath(); g.fill(); };
    const rock = (x, y, r) => { g.fillStyle = '#6a5060'; g.beginPath(); for (let k = 0; k < 7; k++) { const a = k / 7 * 6.28, rr = r * (0.8 + (k % 2) * 0.2); g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr * 0.85); } g.closePath(); g.fill(); gem(x + r * 0.15, y - r * 0.1, r * 0.45, '#1fb8e0', '#9ae8ff'); };
    const coin = (x, y, r) => { g.fillStyle = '#e8a82a'; g.beginPath(); g.arc(x, y, r, 0, 6.3); g.fill(); g.fillStyle = '#ffd35a'; g.beginPath(); g.arc(x, y, r * 0.72, 0, 6.3); g.fill(); g.fillStyle = '#c98a2a'; g.font = `900 ${r}px system-ui, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('$', x, y + r * 0.06); };
    ICONS.forEach((id, i) => {
      const x = (i % IC) * c + c / 2, y = Math.floor(i / IC) * c + c / 2;
      g.fillStyle = '#3a2418'; g.beginPath(); g.arc(x, y, c * 0.47, 0, 6.3); g.fill();
      g.fillStyle = '#efe2c8'; g.beginPath(); g.arc(x, y, c * 0.41, 0, 6.3); g.fill();
      g.save(); g.translate(x, y); g.lineCap = g.lineJoin = 'round';
      if (id === 'pick') { g.rotate(-0.6); g.fillStyle = '#8a5a34'; g.fillRect(-5, -6, 10, 46); g.strokeStyle = '#5a6070'; g.lineWidth = 11; g.beginPath(); g.moveTo(-34, -6); g.quadraticCurveTo(0, -30, 34, -6); g.stroke(); }
      else if (id === 'rock') { rock(-12, 8, 22); rock(16, 12, 17); rock(2, -14, 18); }
      else if (id === 'polish') { rock(-22, 4, 18); g.fillStyle = '#3a2418'; g.beginPath(); g.moveTo(-4, -6); g.lineTo(6, 4); g.lineTo(-4, 14); g.closePath(); g.fill(); gem(24, 4, 20); }
      else if (id === 'gem') { gem(0, 0, 34); }
      else if (id === 'stand') { gem(-14, -4, 22); coin(18, 14, 16); }
      else if (id === 'cash' || id === 'crate') { coin(-12, 10, 20); coin(12, 4, 20); coin(0, -14, 20); }
      else if (id === 'egg') { g.fillStyle = '#ffd0ea'; g.beginPath(); g.ellipse(0, 4, 26, 34, 0, 0, 6.3); g.fill(); g.fillStyle = '#e04cc0'; for (const [a, b] of [[-8, -8], [10, 6], [-6, 18]]) { g.beginPath(); g.arc(a, b, 6, 0, 6.3); g.fill(); } }
      else if (id === 'heart') { g.scale(0.62, 0.62); drawIcon(g, 'heart', '#e8457f', '#efe2c8'); }
      else { g.scale(0.62, 0.62); drawIcon(g, id, '#2a7f78', '#efe2c8'); }
      g.restore();
    });
  }));
  const badgeStops = [['mine', W.mine.x, W.mine.z, 2.6], ['pile', W.pile.x, W.pile.z, 2.0], ...pols.map((p) => [p.d.id, p.d.x, p.d.z, 2.6, p.d.pad]), ['counter', W.counter.x, W.counter.z, 2.2],
    ...stands.map((q) => [q.d.id, q.d.x, q.d.z, 3.4, q.d.pad]), ['cash', W.cash.x, W.cash.z, 1.6], ['workshop', WS.x, WS.z, 3.5, 'workshop']];
  const NB = badgeStops.length + 1, badgeGeo = K(new THREE.PlaneGeometry(1, 1));
  const bCell = new THREE.InstancedBufferAttribute(new Float32Array(NB), 1), bK = new THREE.InstancedBufferAttribute(new Float32Array(NB * 2), 2).setUsage(THREE.DynamicDrawUsage);
  badgeGeo.setAttribute('aCell', bCell); badgeGeo.setAttribute('aK', bK);
  badgeStops.forEach((b, i) => { bCell.setX(i, iconOf(b[0])); });
  const badges = new THREE.InstancedMesh(badgeGeo, K(new THREE.ShaderMaterial({
    uniforms: { map: { value: badgeTex }, uN: { value: IC } }, transparent: true, depthTest: false, depthWrite: false,
    vertexShader: 'attribute float aCell; attribute vec2 aK; uniform float uN; varying vec2 vUv; varying float vA; void main(){ vec4 c = modelViewMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0); float hw = -c.z / projectionMatrix[0][0], r = 0.5 * aK.x; if (aK.y > 0.95 && abs(c.x) < hw + r) c.x = clamp(c.x, -hw * 0.95 + r, hw * 0.95 - r); c.xy += position.xy * aK.x; gl_Position = projectionMatrix * c; float col = mod(aCell, uN), row = floor(aCell / uN); vUv = vec2((col + uv.x) / uN, 1.0 - (row + 1.0 - uv.y) / uN); vA = aK.y; }',
    fragmentShader: 'uniform sampler2D map; varying vec2 vUv; varying float vA; void main(){ vec4 t = texture2D(map, vUv); if (t.a * vA < 0.02) discard; gl_FragColor = vec4(t.rgb, t.a * vA);\n#include <colorspace_fragment>\n}',
  })), NB);
  badges.frustumCulled = false; badges.renderOrder = 9; badges.instanceMatrix.setUsage(THREE.DynamicDrawUsage); scene.add(badges);
  const trailShape = new THREE.Shape(); trailShape.moveTo(-0.22, -0.12); trailShape.lineTo(0, 0.14); trailShape.lineTo(0.22, -0.12); trailShape.lineTo(0.22, 0.02); trailShape.lineTo(0, 0.28); trailShape.lineTo(-0.22, 0.02); trailShape.closePath();
  const TRAIL = 16, trail = new THREE.InstancedMesh(K(new THREE.ShapeGeometry(trailShape).rotateX(-Math.PI / 2)), K(new THREE.MeshBasicMaterial({ color: 0xff7a1a, transparent: true, opacity: 0.95, depthWrite: false })), TRAIL); // deep orange reads on pale planks and sand
  trail.renderOrder = 3; trail.frustumCulled = false; trail.instanceMatrix.setUsage(THREE.DynamicDrawUsage); trail.count = 0; scene.add(trail);
  /** Station badges (built stops, small) and the target's big bouncing badge, plus the floor trail from the hero to it. */
  const badgeSpots = []; // [x, y, z, size] of every badge drawn this frame (the HUD keeps its labels off them)
  function drawBadges(S, g, top) {
    const tgt = g && !g.wait ? g.what : null, hk = 1 - cam.showK; // badges fade out during a camera beat so only the subject reads; the target's badge (alpha 1) is clamped inside the screen edge in the shader
    badgeSpots.length = 0;
    // late game has many stops: only the few nearest the hero keep their small badge (the target always has its big one)
    const near = (LK.badgeNear || 8) ** 2, keep = new Set(badgeStops.map(([key, x, z, , padId], i) => [i, (x - S.hero.x) ** 2 + (z - S.hero.z) ** 2, (!padId || S.pads.some((p) => p.id === padId && p.done)) && key !== tgt])
      .filter(([, d2, ok]) => ok && d2 < near).sort((a, b) => a[1] - b[1]).slice(0, LK.badgeMax || 4).map(([i]) => i));
    badgeStops.forEach(([key, x, z, h], i) => {
      const on = keep.has(i);
      badges.setMatrixAt(i, _m.makeTranslation(x, h + 0.75, z)); bK.setXY(i, on ? 1.35 * hk : 0, 0.85);
      if (on && hk > 0.5) badgeSpots.push([x, h + 0.75, z, 1.35]);
    });
    const ti = NB - 1, cell = tgt ? iconOf(tgt) : -1;
    if (cell >= 0 && top) { const b = Math.abs(Math.sin(tAll * 3.2)); bCell.setX(ti, cell); bCell.needsUpdate = true; badges.setMatrixAt(ti, _m.makeTranslation(top[0], top[2] + 2.3 + b * 0.35, top[1])); bK.setXY(ti, (2.5 + Math.sin(tAll * 6) * 0.08) * hk, 1); badgeSpots.push([top[0], top[2] + 2.3 + b * 0.35, top[1], 2.5]); }
    else bK.setXY(ti, 0, 0);
    badges.instanceMatrix.needsUpdate = true; bK.needsUpdate = true;
    // the trail: chevrons flowing from the hero to the target spot (hidden when close)
    let n = 0;
    if (g && !g.wait && cam.showK < 0.3) {
      const dx = g.x - heroPos.x, dz = g.z - heroPos.z, L = Math.hypot(dx, dz), ry = Math.atan2(dx, dz) + Math.PI, step = LK.trailStep, off = (tAll * 1.6) % step;
      // ry + PI: the chevron's tip is its local -z, so this turns every tip toward the goal; they start at the hero's feet
      for (let d = 0.35 + off; d < L - 0.8 && n < TRAIL; d += step) { const k = Math.min(1, (d - 0.35) / 0.4, (L - 0.8 - d) / 0.6); trail.setMatrixAt(n++, _m.compose(_p.set(heroPos.x + dx / L * d, 0.26, heroPos.z + dz / L * d), _q.setFromEuler(_e.set(0, ry, 0)), _s.setScalar(Math.max(0.05, k) * LK.trailScale))); }
    }
    trail.count = n; trail.instanceMatrix.needsUpdate = true;
  }

  // ---- tumbleweeds rolling across the sand now and then
  const twGeo = K(FROST ? M.buildSnowball() : M.buildTumbleweed()), weeds = [0, 1].map((i) => { const m = new THREE.Mesh(twGeo, mat); m.castShadow = true; scene.add(m); return { m, t: i * 9, z: sz(i ? 12.5 : -2.6), dir: i ? -1 : 1 }; });
  // ---- soft clouds drifting in the sky (instanced, one draw)
  const cloudGeo = K(M.merge([0, 1, 2, 3, 4].map((k) => M.paint(M.at(new THREE.SphereGeometry(1, 12, 8), (k - 2) * 1.3, Math.sin(k * 2) * 0.3 + (k === 2 ? 0.5 : 0), 0, 0, 0, 0, [1.3 - Math.abs(k - 2) * 0.15, 0.85 - Math.abs(k - 2) * 0.12, 1]), 0xfff2e4))));
  const cloudMat = K(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, emissive: FROST ? 0xd8dcf4 : 0xffe8d0, emissiveIntensity: 0.7, fog: false })), clouds = new THREE.InstancedMesh(cloudGeo, cloudMat, 7);
  const cloudList = []; for (let i = 0; i < 7; i++) cloudList.push({ x: -40 + i * 13 + random() * 6, y: (FROST ? 9 : 10) + random() * (FROST ? 5 : 6), z: -70 - random() * 22, s: 2.4 + random() * 2, v: 0.4 + random() * 0.5 });
  clouds.frustumCulled = false; clouds.instanceMatrix.setUsage(THREE.DynamicDrawUsage); scene.add(clouds);
  // ---- soft cloud shadows drifting over the ground and the town (one transparent plane, its texture scrolls)
  const cloudShadowTex = K(canvasTex(256, 256, (g, s) => { for (let i = 0; i < 9; i++) { const x = random() * s, y = random() * s, r = 30 + random() * 50; for (const [dx, dy] of [[0, 0], [s, 0], [0, s], [s, s], [-s, 0], [0, -s], [-s, -s], [s, -s], [-s, s]]) { const gr = g.createRadialGradient(x + dx, y + dy, 0, x + dx, y + dy, r); gr.addColorStop(0, 'rgba(255,255,255,0.9)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(x + dx - r, y + dy - r, r * 2, r * 2); } } }));
  cloudShadowTex.colorSpace = THREE.NoColorSpace; cloudShadowTex.wrapS = cloudShadowTex.wrapT = THREE.RepeatWrapping; cloudShadowTex.repeat.set(2.2, 2.2);
  const cloudShadow = new THREE.Mesh(K(new THREE.PlaneGeometry(170, 170).rotateX(-Math.PI / 2)), K(new THREE.MeshBasicMaterial({ color: FROST ? 0x3a3f6a : 0x5a2e1a, alphaMap: cloudShadowTex, transparent: true, opacity: LK.cloudShadow, depthWrite: false })));
  cloudShadow.position.set(0, 0.21, 0); cloudShadow.renderOrder = 1; scene.add(cloudShadow);
  // ---- birds circling high over the town (one instanced draw; wings flap by tilting each bird's two halves)
  const birdGeo = K(M.merge([-1, 1].map((sd) => M.paint(M.at(new THREE.BoxGeometry(0.9, 0.05, 0.28), sd * 0.42, 0, 0, 0, 0, sd * 0.25), FROST ? 0x4a4f78 : 0x5a3a3a))));
  const birds = new THREE.InstancedMesh(birdGeo, mat, 7); birds.frustumCulled = false; birds.instanceMatrix.setUsage(THREE.DynamicDrawUsage); scene.add(birds);
  const birdList = []; for (let i = 0; i < 7; i++) birdList.push({ cx: (random() - 0.5) * 30, cz: -6 + random() * 20, r: 6 + random() * 10, y: 13 + random() * 6, w: (random() < 0.5 ? -1 : 1) * (0.25 + random() * 0.2), a: random() * 6.3, f: random() * 6 });
  // ---- a shooting meteor across the sky every few seconds (the world's own story, far behind the town)
  const streak = new THREE.Mesh(K(new THREE.CylinderGeometry(0.0, 0.18, 9, 6, 1, true).rotateZ(Math.PI / 2)), K(new THREE.MeshBasicMaterial({ color: FROST ? 0xffc890 : 0xd8b0ff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, fog: false })));
  streak.renderOrder = -4; streak.visible = false; scene.add(streak); const streakSt = { t: 4, x: 0, y: 0, z: 0, v: 1 };
  // ---- frost: snowfall over the valley, one Points draw animated on the GPU (flakes tinted lavender, not white)
  let snowfall = null;
  if (FROST) {
    const SF = cfg.ch2.snow, N = SF.flakes, pos = new Float32Array(N * 3), ph = new Float32Array(N), g = new THREE.BufferGeometry();
    for (let i = 0; i < N; i++) { pos[i * 3] = random() * 44 - 22; pos[i * 3 + 1] = random() * SF.h; pos[i * 3 + 2] = random() * 38 - 18; ph[i] = random() * 6.28; }
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('aPh', new THREE.BufferAttribute(ph, 1));
    snowfall = new THREE.Points(K(g), K(new THREE.ShaderMaterial({
      uniforms: { uT: { value: 0 }, scale: { value: 400 }, uH: { value: SF.h }, uFall: { value: SF.fall }, uSize: { value: SF.size }, uCol: { value: new THREE.Color(SF.color) }, uA: { value: SF.alpha } },
      transparent: true, depthWrite: false,
      vertexShader: 'attribute float aPh; uniform float uT; uniform float scale; uniform float uH; uniform float uFall; uniform float uSize; void main(){ vec3 p = position; p.y = mod(p.y - uT * uFall * (0.8 + fract(aPh) * 0.4), uH); p.x += sin(uT * 0.6 + aPh) * 0.5; p.z += cos(uT * 0.45 + aPh * 1.3) * 0.3; vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_PointSize = uSize * (0.7 + fract(aPh * 3.7) * 0.6) * scale / -mv.z; gl_Position = projectionMatrix * mv; }',
      fragmentShader: 'uniform vec3 uCol; uniform float uA; void main(){ float r = length(gl_PointCoord - 0.5); gl_FragColor = vec4(uCol, smoothstep(0.5, 0.15, r) * uA);\n#include <colorspace_fragment>\n}',
    })));
    snowfall.frustumCulled = false; snowfall.renderOrder = 5; scene.add(snowfall);
  }
  // ---- the travel pad (cable car ride between the desert and the Frost Comet valley): shown once travel is open
  const TV = cfg.travel, travelPad = new THREE.Group(); travelPad.visible = false; scene.add(travelPad);
  const travelFace = new THREE.Mesh(K(new THREE.PlaneGeometry(2.0, 2.0).rotateX(-Math.PI / 2)), K(new THREE.MeshBasicMaterial({ transparent: true, map: K(canvasTex(256, 256, (g, s) => {
    const bg = FROST ? '#a8583a' : '#3a5a9a';
    g.fillStyle = bg; g.beginPath(); g.arc(s / 2, s / 2, s / 2 - 14, 0, 6.3); g.fill();
    g.strokeStyle = '#f6d27a'; g.lineWidth = 10; g.stroke();
    g.save(); g.translate(s / 2, s / 2); g.scale(1.25, 1.25); drawIcon(g, 'cable', '#ffe6a8', bg); g.restore();
  })) })));
  if (TV) {
    travelPad.position.set(TV.x, 0.16, TV.z);
    const b = new THREE.Mesh(pad.children[0].geometry, brassMat); b.receiveShadow = true; travelPad.add(b);
    travelFace.position.y = 0.2; travelPad.add(travelFace);
  }

  // ---- items: chunks, gems, coins, each one InstancedMesh filled per frame (+ flyers in the air)
  const coinGeo = K(M.coinGeo(0.2));
  const items = {
    chunk: new THREE.InstancedMesh(K(M.chunkGeo(0.25)), chunkMat, 220),
    gem: new THREE.InstancedMesh(K(M.gemGeo(0.24)), gemMat, 120),
    coin: new THREE.InstancedMesh(coinGeo, cashMat, 220),
    ring: new THREE.InstancedMesh(K(FROST ? M.globeGeo(0.26) : M.ringGeo(0.24)), ringMat, 60),
    crown: new THREE.InstancedMesh(K(M.crownGeo(0.3)), ringMat, 16),
  };
  const KINDS = Object.keys(items), itemN = { chunk: 0, gem: 0, coin: 0, ring: 0, crown: 0 };
  for (const m of Object.values(items)) { m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); m.castShadow = true; m.frustumCulled = false; m.count = 0; scene.add(m); }
  for (const k of ['chunk', 'gem']) { const m = items[k]; for (let i = 0; i < m.instanceMatrix.count; i++) m.setColorAt(i, new THREE.Color(GEMS[(i * 7) % GEMS.length])); }
  const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _c = new THREE.Color();
  /** Places the next instance of kind at (x, y, z), turned ry (and tipped rx), scale s, colour index ci. */
  function put(kind, x, y, z, ry = 0, s = 1, ci = -1, rx = 0) {
    const m = items[kind], i = itemN[kind]; if (i >= m.instanceMatrix.count) return;
    m.setMatrixAt(i, _m.compose(_p.set(x, y, z), _q.setFromEuler(_e.set(rx, ry, 0)), _s.setScalar(s)));
    if (ci >= 0 && m.instanceColor) m.setColorAt(i, _c.set(GEMS[ci % GEMS.length]));
    itemN[kind] = i + 1;
  }
  // in-flight items: counts shown at a stop leave out what is still flying to it (so nothing appears twice)
  const pend = {}, pendOf = (k) => pend[k] || 0;
  const flyers = [];
  const polIdx = (id) => Math.max(0, W.polishers.findIndex((p) => p.id === id)), standIdx = (id) => Math.max(0, W.stands.findIndex((p) => p.id === id));
  /** Slot positions of each stop (index i), in world space. Keys: pile, stack, pol:<id>, counter, stand:<id>, cash, hero, pad, crate, wheel:<id>, ws, wsR, keeper, kid. */
  function slot(key, i, out) {
    const [k0, id] = key.split(':');
    if (k0 === 'pile') { const a = i * 2.39996, r = 0.18 + Math.sqrt(i) * 0.16, y = Math.max(0, 0.55 - r * 0.45) + Math.floor(i / 22) * 0.1; return out.set(W.pile.x + Math.cos(a) * Math.min(r, 1.0), 0.2 + y, W.pile.z + Math.sin(a) * Math.min(r, 1.0)); }
    if (k0 === 'stack') { const f = hero.root.rotation.y; return out.set(heroPos.x + Math.sin(f) * 0.62, 1.25 + i * 0.19 + heroBob, heroPos.z + Math.cos(f) * 0.62); }
    if (k0 === 'pol') { const P = pols[polIdx(id)], k = Math.min(i, 11), a = k * 2.4; return out.set(P.hop.x + Math.cos(a) * 0.12, 1.42 + Math.floor(k / 4) * 0.06 + 0.16, P.d.z - 0.05 + Math.sin(a) * 0.12); }
    if (k0 === 'wheel') { const P = pols[polIdx(id)]; return out.set(P.d.x, 1.6, P.d.z + 0.3); }
    if (k0 === 'counter') { const c = i % 4, r = Math.floor(i / 4) % 4; return out.set(W.counter.x - 0.6 + c * 0.4, 1.2 + Math.floor(i / 16) * 0.1, W.counter.z - 0.3 + r * 0.2); }
    if (k0 === 'stand') { const d = W.stands[standIdx(id)], c = i % 4, r = Math.floor(i / 4) % 2; return out.set(d.x - 0.6 + c * 0.4, 1.25, d.z - 0.2 + r * 0.4); }
    if (k0 === 'cash') { const col = i % 6, h = Math.floor(i / 6); return out.set(W.cash.x - 0.55 + (col % 3) * 0.55, 0.36 + h * 0.07, W.cash.z - 0.28 + Math.floor(col / 3) * 0.56); }
    if (k0 === 'ws') { const c = i % 4, r = Math.floor(i / 4) % 3; return out.set(WS.x - 0.95 + c * 0.22, 1.18 + Math.floor(i / 12) * 0.1, WS.z + 0.25 + r * 0.16); }
    if (k0 === 'wsR') { const c = i % 4, r = Math.floor(i / 4) % 2; return out.set(WS.x + 0.2 + c * 0.2, 1.22, WS.z + 0.25 + r * 0.2); }
    if (k0 === 'keeper') { const f = keeper.root.rotation.y; return out.set(keeper.root.position.x + Math.sin(f) * 0.5, 1.15 + i * 0.19, keeper.root.position.z + Math.cos(f) * 0.5); }
    if (k0 === 'kid') return out.set(W.order.x, 1.2, W.order.z);
    if (k0 === 'hero') return out.set(heroPos.x, 1.4, heroPos.z);
    if (k0 === 'pad') return out.set(pad.position.x, 0.5, pad.position.z);
    if (k0 === 'crate') return out.set(W.crate.x, 0.7, W.crate.z);
    if (k0 === 'jw') return out.set(JW.x, 1.25, JW.z + 0.5);
    if (k0 === 'cart') return out.set(cart.position.x + ((i % 2) - 0.5) * 0.4, 0.95 + Math.floor(i / 2) * 0.15, cart.position.z + ((i >> 1) % 2 - 0.5) * 0.3);
    if (k0 === 'gond') { gondAt(i % 3, out); out.y -= 1.2; return out; }
    if (k0 === 'sky') return out.set(JW.x + 2, 14, JW.z - 8);
    return out.set(0, 0, 0);
  }
  /**
   * Sends one item of kind flying from (a) to stop key's slot (index from idx()), after a delay; arc height h.
   * path (optional): world points it rides through first (the conveyor), at speed m/s, before its last hop.
   */
  function fly(kind, from, key, idx, delay = 0, h = 1.6, onLand = null, path = null) {
    pend[key] = pendOf(key) + 1;
    let d = 0.32 + Math.random() * 0.06, pts = null;
    if (path) { pts = [from.clone(), ...path]; let L = 0; for (let i = 1; i < pts.length; i++) L += pts[i].distanceTo(pts[i - 1]); d = L / 2.6 + 0.35; }
    flyers.push({ kind, from: from.clone(), key, idx, t: -delay, d, h, ci: Math.floor(Math.random() * 5), spin: (Math.random() - 0.5) * 12, onLand, pts });
  }

  // ---- pooled effects: glow points (additive sparkles), dust points (soft puffs), shards, rings
  function pointPool(n, additive) {
    const g = new THREE.BufferGeometry(), pos = new Float32Array(n * 3), colA = new Float32Array(n * 4), size = new Float32Array(n);
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage)); g.setAttribute('aCol', new THREE.BufferAttribute(colA, 4).setUsage(THREE.DynamicDrawUsage)); g.setAttribute('aSize', new THREE.BufferAttribute(size, 1).setUsage(THREE.DynamicDrawUsage));
    const m = K(new THREE.ShaderMaterial({
      uniforms: { scale: { value: 400 }, boost: { value: 1 } }, transparent: true, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
      vertexShader: 'attribute vec4 aCol; attribute float aSize; uniform float scale; varying vec4 vC; void main(){ vC = aCol; vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_PointSize = aSize * scale / -mv.z; gl_Position = projectionMatrix * mv; }',
      fragmentShader: additive ? 'uniform float boost; varying vec4 vC; void main(){ vec2 d = gl_PointCoord - 0.5; float r = length(d); float star = max(0.0, 1.0 - abs(d.x) * 9.0) * max(0.0, 1.0 - abs(d.y) * 1.8) + max(0.0, 1.0 - abs(d.y) * 9.0) * max(0.0, 1.0 - abs(d.x) * 1.8); float a = (smoothstep(0.5, 0.0, r) * 0.7 + star * 0.6) * vC.a; gl_FragColor = vec4(vC.rgb * a * boost, a); }'
        : 'varying vec4 vC; void main(){ float r = length(gl_PointCoord - 0.5); float a = smoothstep(0.5, 0.1, r) * vC.a; gl_FragColor = vec4(vC.rgb, a);\n#include <colorspace_fragment>\n}',
    }));
    const pts = new THREE.Points(K(g), m); pts.frustumCulled = false; pts.renderOrder = additive ? 6 : 5; scene.add(pts);
    const P = []; for (let i = 0; i < n; i++) P.push({ life: 0, max: 1, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, g: 0, drag: 0, s0: 0, s1: 0, r: 1, gg: 1, b: 1, a: 1 });
    let next = 0;
    return {
      pts, m,
      spawn(o) { const p = P[next]; next = (next + 1) % n; Object.assign(p, { drag: 1.5, g: 0, a: 1 }, o); p.life = p.max; return p; },
      update(dt) {
        for (let i = 0; i < n; i++) {
          const p = P[i];
          if (p.life <= 0) { size[i] = 0; continue; }
          p.life -= dt; const k = 1 - Math.max(0, p.life) / p.max;
          p.vy -= p.g * dt; const dr = Math.exp(-p.drag * dt); p.vx *= dr; p.vy *= dr; p.vz *= dr; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
          if (p.y < 0.2 && p.g > 0) { p.y = 0.2; p.vy *= -0.3; }
          pos[i * 3] = p.x; pos[i * 3 + 1] = p.y; pos[i * 3 + 2] = p.z;
          size[i] = lerp(p.s0, p.s1, k); colA[i * 4] = p.r; colA[i * 4 + 1] = p.gg; colA[i * 4 + 2] = p.b; colA[i * 4 + 3] = p.a * (k < 0.15 ? k / 0.15 : 1 - (k - 0.15) / 0.85);
        }
        g.attributes.position.needsUpdate = g.attributes.aCol.needsUpdate = g.attributes.aSize.needsUpdate = true;
      },
    };
  }
  const glowPts = pointPool(420, true), dustPts = pointPool(220, false);
  const shards = new THREE.InstancedMesh(K(M.gemGeo(0.09)), gemMat, 90); shards.instanceMatrix.setUsage(THREE.DynamicDrawUsage); shards.frustumCulled = false; shards.count = 0; scene.add(shards);
  for (let i = 0; i < 90; i++) shards.setColorAt(i, new THREE.Color(GEMS[i % 5]));
  const shardP = []; let shardNext = 0;
  const rings = [];
  for (let i = 0; i < 8; i++) { const m = new THREE.Mesh(K(new THREE.RingGeometry(0.82, 1, 48)), K(new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }))); m.visible = false; m.renderOrder = 4; scene.add(m); rings.push({ m, t: 1, d: 0.5, s0: 0, s1: 1 }); }
  /** A shockwave ring at p facing along n (default up), from size s0 to s1 over d seconds. */
  function ring(p, color, s0, s1, d = 0.5, n = null) {
    const r = rings.find((q) => q.t >= q.d) || rings[0];
    Object.assign(r, { t: 0, d, s0, s1 }); r.m.position.copy(p); r.m.material.color.set(color); r.m.visible = true;
    if (n) r.m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), n); else r.m.rotation.set(-Math.PI / 2, 0, 0);
  }
  const hexToRGB = (h) => { _c.set(h); return { r: _c.r, gg: _c.g, b: _c.b }; };
  /** Crystal burst at p: sparkles, shards (n), dust; size k (1 normal, 2 perfect). */
  function burst(p, k = 1, n = 6) {
    for (let i = 0; i < 14 * k; i++) {
      const a = Math.random() * 6.28, u = Math.random() * 2 - 1, sp = (2 + Math.random() * 4) * k;
      glowPts.spawn({ x: p.x, y: p.y, z: p.z, vx: Math.cos(a) * sp * Math.sqrt(1 - u * u), vy: Math.abs(u) * sp + 1, vz: Math.sin(a) * sp * Math.sqrt(1 - u * u) + 1.5, g: 6, drag: 2.2, max: 0.5 + Math.random() * 0.4, s0: 0.5 * k, s1: 0.1, ...hexToRGB(GEMS[i % 5]) });
    }
    for (let i = 0; i < n; i++) {
      const s = shardP[shardNext] || (shardP[shardNext] = {}); shardNext = (shardNext + 1) % 90;
      const a = Math.random() * 6.28, sp = 2 + Math.random() * 3 * k;
      Object.assign(s, { x: p.x, y: p.y, z: p.z, vx: Math.cos(a) * sp, vy: 3 + Math.random() * 4, vz: Math.sin(a) * sp * 0.6 + 2, life: 0.9 + Math.random() * 0.5, rx: Math.random() * 6, ry: Math.random() * 6, s: 0.8 + Math.random() * 0.8 });
    }
    for (let i = 0; i < 6 * k; i++) dustPts.spawn({ x: p.x + (Math.random() - 0.5) * 0.6, y: p.y - 0.2, z: p.z + 0.3, vx: (Math.random() - 0.5) * 2, vy: 0.6 + Math.random(), vz: 0.8 + Math.random(), drag: 2.5, max: 0.9 + Math.random() * 0.5, s0: 0.6, s1: 1.8 * k, r: 0.55, gg: 0.42, b: 0.4, a: 0.55 });
  }
  /** Soft ground puff (footsteps, landings). */
  function puff(x, z, n = 3, s = 0.6, col = DUST) {
    const c = hexToRGB(col);
    for (let i = 0; i < n; i++) dustPts.spawn({ x: x + (Math.random() - 0.5) * 0.4, y: 0.3, z: z + (Math.random() - 0.5) * 0.4, vx: (Math.random() - 0.5) * 1.2, vy: 0.4 + Math.random() * 0.5, vz: (Math.random() - 0.5) * 1.2, drag: 3, max: 0.6 + Math.random() * 0.4, s0: s * 0.5, s1: s * 1.6, ...c, a: 0.45 });
  }
  /** A fountain of confetti-like sparkles at p (unlock, hatch). */
  function confetti(p, n = 60, spread = 3) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * 6.28, sp = 1 + Math.random() * spread;
      glowPts.spawn({ x: p.x, y: p.y, z: p.z, vx: Math.cos(a) * sp, vy: 5 + Math.random() * 5, vz: Math.sin(a) * sp, g: 7, drag: 1.2, max: 1.2 + Math.random() * 0.8, s0: 0.45, s1: 0.2, ...hexToRGB([0xffd35a, 0xff8ac8, 0x6fe0f0, 0xb08cff, 0x8fe0a8][i % 5]) });
    }
  }
  /** A festival firework: a round burst of sparks high over the meteor, with a ring. */
  function firework() {
    const p = new THREE.Vector3(-7 + Math.random() * 14, 7 + Math.random() * 2.5, -5 + Math.random() * 3), c = [0xffd35a, 0xff8ac8, 0x6fe0f0, 0xb08cff, 0x8fe0a8][(Math.random() * 5) | 0], rgb = hexToRGB(c);
    for (let i = 0; i < 42; i++) {
      const u = Math.random() * 2 - 1, a = Math.random() * 6.28, r = Math.sqrt(1 - u * u), sp = 3.5 + Math.random() * 1.5;
      glowPts.spawn({ x: p.x, y: p.y, z: p.z, vx: r * Math.cos(a) * sp, vy: u * sp, vz: r * Math.sin(a) * sp, g: 1.5, drag: 1.6, max: 1.1 + Math.random() * 0.5, s0: 0.5, s1: 0.1, ...rgb });
    }
    ring(p, c, 0.4, 5, 0.7, new THREE.Vector3(0, 0, 1));
  }
  /** Sparkles rising from a point (twinkle, gem made, polisher). */
  function twinkle(p, n = 3, col = 0xffe6a0, s = 0.35) {
    const c = hexToRGB(col);
    for (let i = 0; i < n; i++) glowPts.spawn({ x: p.x + (Math.random() - 0.5) * 0.5, y: p.y + Math.random() * 0.3, z: p.z + (Math.random() - 0.5) * 0.5, vx: (Math.random() - 0.5) * 0.6, vy: 0.8 + Math.random(), vz: (Math.random() - 0.5) * 0.6, drag: 1, max: 0.7 + Math.random() * 0.5, s0: s, s1: 0.05, ...c });
  }

  // ---- the glint: a star twinkling on the meteor (tap it for a Perfect Strike)
  const glintMat = K(new THREE.ShaderMaterial({
    uniforms: { t: { value: 0 }, a: { value: 0 } }, transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending,
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv - 0.5; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'uniform float t; uniform float a; varying vec2 vUv; void main(){ float r = length(vUv); float ang = atan(vUv.y, vUv.x); float rays = pow(abs(cos(ang * 2.0 + t * 0.8)), 40.0) * smoothstep(0.5, 0.0, r) + pow(abs(cos(ang * 2.0 + 0.785 - t * 0.5)), 60.0) * smoothstep(0.35, 0.0, r) * 0.6; float core = smoothstep(0.12, 0.0, r) + smoothstep(0.3, 0.0, r) * 0.35; float ringv = smoothstep(0.03, 0.0, abs(r - 0.38 - 0.06 * sin(t * 5.0))) * 0.6; vec3 c = mix(vec3(1.0, 0.85, 0.55), vec3(1.0, 0.6, 0.95), r * 2.0); gl_FragColor = vec4(c * (rays + core + ringv) * a * 1.6, 1.0); }',
  }));
  const glint = new THREE.Mesh(K(new THREE.PlaneGeometry(2.6, 2.6)), glintMat); glint.visible = false; glint.renderOrder = 8; scene.add(glint);
  const glintState = { on: false, lon: 0, lat: 0, t: 0, out: 0 };
  const glintPos = new THREE.Vector3();

  // ---- camera rig: follows the hero, with shake (trauma), FOV kick, and a showcase move for big moments
  const cam = { x: 0, z: W.mine.z + 3, trauma: 0, kick: 0, show: null, showK: 0, mineK: 0, punch: 0 };
  const camBase = new THREE.Vector3(), camLook = new THREE.Vector3();
  // the look point sits camera.ahead toward the meteor, so the hero stands low in the frame with the town and horizon above
  // the look point sits `ahead` past the hero (lean 1 keeps the hero at one screen height); zMin/zMax are only a safety rail
  const camX = (x) => x * cfg.camera.followX, camZ = (z) => Math.max(cfg.camera.zMin, Math.min(cfg.camera.zMax, lerp(cfg.camera.zMid, z, cfg.camera.lean) - cfg.camera.ahead));
  function camDist() { const hf = Math.atan(Math.tan(THREE.MathUtils.degToRad(cfg.camera.fov) / 2) * camera.aspect); return (cfg.camera.width / 2) / Math.tan(hf); }

  // ---- state shared by update(): hero position for slots
  const heroPos = new THREE.Vector3(); let heroBob = 0;
  // the sun's shadow box (30 m) follows the camera across the wide town, snapped to 2 m steps so shadows do not crawl
  const sunOff = new THREE.Vector3(), shadowAt = new THREE.Vector3(0, 0, 3);
  function placeSun() { sun.target.position.copy(shadowAt); sun.position.copy(shadowAt).add(sunOff); skyU.sunDir.value.copy(sunOff).normalize(); }
  let tod = cfg.tod.start, lampsK = 0, meteorK = 1;
  const keyCol = (a, b, k, out) => out.set(a).lerp(_c.set(b), k);
  /** Time of day in [0, 1] (0 noon, 0.5 golden hour, 1 dusk): sky, fog, sun, hemi, exposure, lamps, meteor glow. */
  function setTod(t) {
    tod = Math.max(0, Math.min(1, t));
    const { a, b, k } = todBlend(cfg.tod.keys, tod), L = (n) => lerp(a[n], b[n], k);
    for (let i = 0; i < 4; i++) keyCol(a.sky[i], b.sky[i], k, skyU['c' + i].value);
    keyCol(a.fog, b.fog, k, scene.fog.color); scene.fog.near = L('fogNear'); scene.fog.far = L('fogFar');
    keyCol(a.sun, b.sun, k, sun.color); sun.intensity = L('sunI'); keyCol(a.sun, b.sun, k, skyU.sunC.value);
    keyCol(a.hemiSky, b.hemiSky, k, hemi.color); keyCol(a.hemiGround, b.hemiGround, k, hemi.groundColor); hemi.intensity = L('hemiI');
    const el = L('elev'); sunOff.set(Math.cos(el) * -9, Math.sin(el) * 22 + 2, Math.cos(el) * 11); placeSun();
    renderer.toneMappingExposure = L('exp'); lampsK = L('lamps'); skyU.uStars.value = Math.max(0, lampsK - 0.3) * 1.4; cloudMat.emissiveIntensity = 0.7 * (1 - lampsK * 0.6); meteorK = L('meteor');
    glowMat.color.setRGB(0.35 + lampsK * 1.6, 0.27 + lampsK * 1.15, 0.18 + lampsK * 0.6);
    winMat.emissiveIntensity = lampsK * 1.4; crystalLight.intensity = 0.8 + meteorK * 1.2;
    scene.environmentIntensity = 0.45 - lampsK * 0.15;
  }

  // ---- quality tiers
  let tier = -1, rs = 1, cssW = 360, cssH = 640;
  // pixel ratio: device, tier cap, and a pixel budget per tier (a big tablet or desktop window must not shade 4M pixels)
  const ratio = () => Math.min(window.devicePixelRatio || 1, cfg.quality.dpr[tier], Math.sqrt(cfg.quality.maxPx[tier] / Math.max(1, cssW * cssH))) * rs;
  function setTier(t) {
    t = Math.max(0, Math.min(cfg.quality.dpr.length - 1, t)); if (t === tier) return; tier = t;
    renderer.setPixelRatio(ratio());
    const sm = cfg.quality.shadow[t];
    // shadows stay on in the shaders (switching them rebuilds every program, a long hitch); tier 0 stops drawing the
    // map (no shadow pass draw calls) and fades it out instead
    sun.shadow.intensity = sm > 0 ? 1 : 0; shadowN = 0;
    if (sm > 0 && sm !== sun.shadow.mapSize.x) { sun.shadow.mapSize.set(sm, sm); if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; } }
    crowdN = Math.min(C.n, cfg.quality.crowd[t]); crowdA.count = crowdB.count = crowdN;
    postSync();
  }
  function setScale(s) { if (s === rs) return; rs = s; renderer.setPixelRatio(ratio()); postSync(); }
  function resize(w, h) { cssW = w; cssH = h; if (tier >= 0) renderer.setPixelRatio(ratio()); renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); glowPts.m.uniforms.scale.value = dustPts.m.uniforms.scale.value = h * renderer.getPixelRatio() * 0.9; if (snowfall) snowfall.material.uniforms.scale.value = h * renderer.getPixelRatio() * 0.9; postSync(); }

  // ---- glow (bloom) and grade on tiers >= look.postTier half-float scene target, bright
  // pass, blur at 1/4 and 1/8, then tone mapping + sRGB + warmth/saturation/contrast/vignette to the canvas
  const BL = LK.bloom, GR = LK.grade;
  const glowList = [
    { set: (on) => { gemMat.emissiveIntensity = chunkMat.emissiveIntensity = on ? 0.3 * LK.glow.gem : 0.3; const e = on ? 0.35 * LK.glow.gem : 0.35; shellMat.emissiveIntensity = spotMat.emissiveIntensity = e; for (const k in critters) critters[k].sm.emissiveIntensity = e; lanternMat.color.setScalar(on ? LK.glow.lantern : 1); beamMat.color.setRGB(1, 0.42, 0.85).multiplyScalar(on ? LK.glow.fx : 1); } },
    { set: (on) => { meteorU.uGlow.value = (on ? LK.glow.meteor : 1) * meteorK; } },
    { set: (on) => { glowPts.m.uniforms.boost.value = on ? LK.glow.fx : 1; glintMat.uniforms.a.value = glintState.out * (on ? LK.glow.fx : 1); } },
    { set: (on) => { const k = on ? LK.glow.lamp : 1; glowMat.color.setRGB((0.35 + lampsK * 1.6) * (lampsK > 0.05 ? k : 1), (0.27 + lampsK * 1.15) * (lampsK > 0.05 ? k : 1), (0.18 + lampsK * 0.6) * (lampsK > 0.05 ? k : 1)); } },
  ];
  const glowSet = (on) => { for (const x of glowList) x.set(on); };
  const fsCam = new THREE.Camera(), fsGeo = K(new THREE.BufferGeometry()); fsGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3));
  const fsMesh = new THREE.Mesh(fsGeo, null); fsMesh.frustumCulled = false;
  const fsVert = 'varying vec2 vUv; void main(){ vUv = position.xy * 0.5 + 0.5; gl_Position = vec4(position.xy, 0.0, 1.0); }';
  const fsMat = (uniforms, fragmentShader) => K(new THREE.ShaderMaterial({ uniforms, vertexShader: fsVert, fragmentShader, depthTest: false, depthWrite: false }));
  const brightMat = fsMat({ t: { value: null }, px: { value: new THREE.Vector2() }, thr: { value: 1 }, knee: { value: 1 }, lim: { value: 1 } },
    'uniform sampler2D t; uniform vec2 px; uniform float thr; uniform float knee; uniform float lim; varying vec2 vUv; void main(){ vec3 c = (texture2D(t, vUv - px).rgb + texture2D(t, vUv + vec2(px.x, -px.y)).rgb + texture2D(t, vUv + vec2(-px.x, px.y)).rgb + texture2D(t, vUv + px).rgb) * 0.25; float b = max(c.r, max(c.g, c.b)); gl_FragColor = vec4(min(c * smoothstep(thr, thr + knee, b), vec3(lim)), 1.0); }');
  const blurMat = fsMat({ t: { value: null }, d: { value: new THREE.Vector2() } },
    'uniform sampler2D t; uniform vec2 d; varying vec2 vUv; void main(){ vec3 c = texture2D(t, vUv).rgb * 0.227027; c += (texture2D(t, vUv + d * 1.384615).rgb + texture2D(t, vUv - d * 1.384615).rgb) * 0.316216; c += (texture2D(t, vUv + d * 3.230769).rgb + texture2D(t, vUv - d * 3.230769).rgb) * 0.070270; gl_FragColor = vec4(c, 1.0); }');
  const finalMat = fsMat({ t: { value: null }, b1: { value: null }, b2: { value: null }, tb: { value: null }, tf: { value: 0.6 }, ta: { value: 0 }, tw: { value: 0.1 }, ts: { value: 0.3 }, strength: { value: 0 }, vig: { value: 0 }, con: { value: 1 }, sat: { value: 1 }, warm: { value: 0 } },
    'uniform sampler2D t; uniform sampler2D b1; uniform sampler2D b2; uniform sampler2D tb; uniform float tf; uniform float ta; uniform float tw; uniform float ts; uniform float strength; uniform float vig; uniform float con; uniform float sat; uniform float warm; varying vec2 vUv; void main(){ gl_FragColor = vec4(mix(texture2D(t, vUv).rgb, texture2D(tb, vUv).rgb, ta * smoothstep(tw, tw + ts, abs(vUv.y - tf))) + (texture2D(b1, vUv).rgb + texture2D(b2, vUv).rgb) * strength, 1.0);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\nvec3 g = gl_FragColor.rgb; g += vec3(warm, warm * 0.35, -warm) * (1.0 - g); g = mix(vec3(dot(g, vec3(0.2126, 0.7152, 0.0722))), g, sat); g = (g - 0.5) * con + 0.5; g *= 1.0 - vig * smoothstep(0.4, 1.0, length((vUv - 0.5) * vec2(1.0, 1.25)) * 1.4142); gl_FragColor.rgb = clamp(g, 0.0, 1.0); }');
  let post = null;
  const postSize = new THREE.Vector2();
  function hdrOk() { try { const gl = renderer.getContext(); return typeof WebGL2RenderingContext !== 'undefined' && gl instanceof WebGL2RenderingContext && !!(gl.getExtension('EXT_color_buffer_float') || gl.getExtension('EXT_color_buffer_half_float')); } catch (e) { return false; } }
  function postFree() { if (post) for (const t of post.rt) t.dispose(); post = null; }
  function postSync() {
    if (!BL.on || tier < LK.postTier || !hdrOk()) { postFree(); return; }
    renderer.getDrawingBufferSize(postSize); const w = Math.max(1, postSize.x), h = Math.max(1, postSize.y), q = (d) => [Math.max(1, Math.round(w / d)), Math.max(1, Math.round(h / d))];
    if (!post) {
      const small = () => new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, depthBuffer: false });
      post = { scene: new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, depthBuffer: true, stencilBuffer: true, samples: BL.samples }), q1: small(), q2: small(), e1: small(), e2: small(), d1: small(), d2: small() };
      post.rt = [post.scene, post.q1, post.q2, post.e1, post.e2, post.d1, post.d2];
    }
    post.scene.setSize(w, h); post.q1.setSize(...q(4)); post.q2.setSize(...q(4)); post.e1.setSize(...q(8)); post.e2.setSize(...q(8)); post.d1.setSize(...q(4)); post.d2.setSize(...q(4));
  }
  const fsPass = (m, target) => { fsMesh.material = m; renderer.setRenderTarget(target); renderer.render(fsMesh, fsCam); };
  let shadowN = 0;
  function draw() {
    renderer.info.reset();
    renderer.shadowMap.needsUpdate = cfg.quality.shadow[tier] > 0 && (tier >= cfg.quality.shadowEvery1 || (shadowN++ & 1) === 0);
    if (!post) { glowSet(false); renderer.setRenderTarget(null); renderer.render(scene, camera); return; }
    glowSet(true); renderer.setRenderTarget(post.scene); renderer.render(scene, camera); glowSet(false);
    const Pp = post, u = brightMat.uniforms, d = blurMat.uniforms.d.value, f = finalMat.uniforms;
    u.t.value = Pp.scene.texture; u.px.value.set(1 / Pp.scene.width, 1 / Pp.scene.height); u.thr.value = BL.threshold; u.knee.value = BL.knee; u.lim.value = BL.max; fsPass(brightMat, Pp.q1);
    blurMat.uniforms.t.value = Pp.q1.texture; d.set(1 / Pp.q1.width, 0); fsPass(blurMat, Pp.q2);
    blurMat.uniforms.t.value = Pp.q2.texture; d.set(0, 1 / Pp.q1.height); fsPass(blurMat, Pp.q1);
    blurMat.uniforms.t.value = Pp.q1.texture; d.set(1 / Pp.e1.width, 0); fsPass(blurMat, Pp.e2);
    blurMat.uniforms.t.value = Pp.e2.texture; d.set(0, 1 / Pp.e1.height); fsPass(blurMat, Pp.e1);
    // tilt-shift: a quarter-size blurred copy of the frame, mixed in away from a soft band at the hero (or the beat's subject)
    const TS = LK.tilt, tOn = TS && TS.on && tier >= TS.tier;
    if (tOn) {
      blurMat.uniforms.t.value = Pp.scene.texture; d.set(1 / Pp.d1.width, 0); fsPass(blurMat, Pp.d2);
      blurMat.uniforms.t.value = Pp.d2.texture; d.set(0, 1 / Pp.d1.height); fsPass(blurMat, Pp.d1);
      const sh = cam.last, k = sh ? ease(cam.showK) : 0, fy = toScreen(lerp(heroPos.x, sh ? sh.p.x : 0, k), lerp(1, sh ? sh.p.y : 0, k), lerp(heroPos.z, sh ? sh.p.z : 0, k))[1];
      f.tf.value = 1 - Math.max(0.15, Math.min(0.85, fy)); f.tw.value = TS.band; f.ts.value = TS.soft;
    }
    // during a camera beat keep the frame crisp: less tilt blur, a touch more contrast and vignette (no washed-out look)
    const CB = cfg.cine || {}, bk = cam.last ? ease(cam.showK) : 0;
    f.tb.value = Pp.d1.texture; f.ta.value = tOn ? TS.amount * (1 - (CB.tilt || 0) * bk) : 0;
    f.t.value = Pp.scene.texture; f.b1.value = Pp.q1.texture; f.b2.value = Pp.e1.texture; f.strength.value = BL.strength; f.vig.value = GR.vignette + (CB.vig || 0) * bk; f.con.value = GR.contrast + (CB.con || 0) * bk; f.sat.value = GR.saturation; f.warm.value = GR.warmth;
    fsPass(finalMat, null);
  }

  // ---------------------------------------------------------------- per-frame sync with the logic state
  const fx = { padPop: -1, padPulse: 0, stationBump: {}, flash: 0, crowdCheer: 0, rush: 0 };
  const pops = []; // unlock build-up bounces: { o, t, d }
  const bump = (k) => { fx.stationBump[k] = 1; };
  const bumpS = (o, k, base = 1) => { const b = fx.stationBump[k] || 0; o.scale.set(base * (1 + b * 0.08), base * (1 - b * 0.1), base * (1 + b * 0.08)); };
  let tAll = 0, stepT = 0, toyT = 0;
  const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3(), tmp3 = new THREE.Vector3();
  const liveIds = new Set(); // reused every frame
  const looseT = new Map(); // Rush pickup id -> time it started falling
  // cold open (3 s, skippable): the meteor streaks in from the sky, slams into the crater, the camera swoops to town
  const INTRO = { fall: 1.4, len: 3.0 }, intro = { t: -1, hit: false };
  const meteorRest = new THREE.Vector3(W.meteor.x, W.meteor.y, W.meteor.z), meteorSky = new THREE.Vector3(W.meteor.x + 16, 46, W.meteor.z - 34);
  function introImpact(soft) {
    intro.hit = true; meteor.position.copy(meteorRest); meteor.scale.setScalar(1); rimShards.visible = true;
    const p = tmp3.set(W.meteor.x, 0.6, W.meteor.z + MR * 0.8);
    meteorU.uFlash.value.set(0, 0, MR, 4); burst(p, 3, 30); confetti(p, 60, 6);
    ring(tmp.set(W.meteor.x, 0.3, W.meteor.z + 1), 0xffe0b0, 1, 22, 1.0); ring(tmp.set(W.meteor.x, 0.32, W.meteor.z + 1), 0xff9ae8, 0.5, 14, 0.8);
    for (let i = 0; i < 24; i++) { const a = i / 24 * 6.28; puff(W.meteor.x + Math.cos(a) * MR * 1.3, W.meteor.z + Math.sin(a) * MR * 1.1, 1, 1.8, FROST ? 0xb8bce0 : 0xd8b088); }
    if (!soft) cam.trauma = 1;
  }
  function introStep(dt) {
    if (intro.t < 0) return 0;
    intro.t += Math.max(0, dt);
    if (!intro.hit) {
      const k = Math.min(1, intro.t / INTRO.fall); meteor.position.lerpVectors(meteorSky, meteorRest, k * k); meteor.rotation.x = (1 - k) * 2.2; meteor.scale.setScalar(0.7 + 0.3 * k);
      for (let i = 0; i < 6; i++) glowPts.spawn({ x: meteor.position.x + (Math.random() - 0.5) * 3, y: meteor.position.y + (Math.random() - 0.5) * 3, z: meteor.position.z + (Math.random() - 0.5) * 3, vx: 3, vy: 8, vz: -6, drag: 2, max: 0.8, s0: 1.6, s1: 0.2, ...hexToRGB([0xffb060, 0xff8ad8, 0xfff0c0][i % 3]) });
      dustPts.spawn({ x: meteor.position.x, y: meteor.position.y, z: meteor.position.z, vx: 2, vy: 5, vz: -4, drag: 1, max: 1.4, s0: 3, s1: 6, r: 0.4, gg: 0.32, b: 0.36, a: 0.5 });
      if (k >= 1) introImpact(false);
    } else meteor.rotation.x = 0;
    if (intro.t >= INTRO.len) { if (!intro.hit) introImpact(true); intro.t = -1; } // the meteor always ends up in its crater
    return intro.t < 0 ? 0 : 1 - ease(Math.max(0, (intro.t - INTRO.fall) / (INTRO.len - INTRO.fall)));
  }
  const hasB = (S, id) => S.pads.some((p) => p.id === id && p.done);
  /** Where the goal badge hovers for a target: over the station mesh (not its walk-in point), and how high. */
  function anchor(g) {
    const w = g.what, P = pols.find((p) => p.d.id === w), St = stands.find((q) => q.d.id === w);
    if (P) return [P.d.x, P.d.z, 2.6]; if (St) return [St.d.x, St.d.z, 3.4];
    if (w === 'counter') return [W.counter.x, W.counter.z, 2.2]; if (w === 'workshop') return [WS.x, WS.z, 3.5]; if (w === 'order') return [W.order.x, W.order.z, 2.4];
    return [g.x, g.z, { pile: 2.0, crate: 1.7, cash: 1.6, mine: 2.6, egg: 1.9 }[w] || 1.8];
  }
  /** Puts the items of a stop: n of them at slot key, kind per index (fn) or one kind. */
  function fill(key, n, kind, s = 1, bob = 0.02, max = 99) {
    const m = Math.min(max, Math.max(0, n - pendOf(key)));
    for (let i = 0; i < m; i++) { slot(key, i, tmp); const k = typeof kind === 'function' ? kind(i) : kind; put(k, tmp.x, tmp.y + Math.sin(tAll * 2 + i) * bob, tmp.z, tAll * 0.8 + i, s, i + 1); }
  }

  /** Per frame: hat, mine cart, ghost town lights, gondolas, neon, the finale's heart and comet, night fireflies. */
  function m3Update(S, dt) {
    silMat.opacity = (LK.silhouetteAlpha ?? 0.62) * (0.8 + 0.2 * Math.sin(tAll * 5)); // a slow pulse draws the eye to the hidden hero
    if (S.hat !== hatOn && hatGeos[S.hat]) { hatOn = S.hat; hatMesh.geometry = hatGeos[S.hat]; for (const [m, o] of heroSil) o.geometry = m.geometry; }
    // mine cart: waits at its stop (gems ride in it), rolls along the rail to the next dark house, then comes back
    if (cart.visible && !cart.popping) {
      const tgt = houseU[Math.min(GH.length - 1, S.ghost.go >= 0 ? S.ghost.lit : Math.max(0, S.ghost.lit - 1))];
      if (S.ghost.go >= 0) { cartSt.u = tgt * ease(Math.min(1, S.ghost.go / (cfg.cart.trip * 0.8))); cartSt.back = 1; }
      else if (cartSt.back > 0) { cartSt.back = Math.max(0, cartSt.back - dt / 1.2); cartSt.u = tgt * cartSt.back * cartSt.back; }
      railPath.getPointAt(Math.min(1, cartSt.u), tmp); const ta = railPath.getTangentAt(Math.min(0.999, cartSt.u + 1e-3), tmp2);
      cart.position.set(tmp.x, 0.16 + (S.ghost.go >= 0 ? Math.abs(Math.sin(tAll * 18)) * 0.02 : 0), tmp.z); cart.rotation.y = Math.atan2(ta.x, ta.z);
      if (S.ghost.go >= 0 && Math.random() < dt * 10) puff(cart.position.x, cart.position.z, 1, 0.4);
    }
    // ghost town: each house blends from grey to colour as it lights; windows glow at dusk
    for (let i = 0; i < 3; i++) { ghostFx.k[i] = lerp(ghostFx.k[i], ghostFx.to[i], Math.min(1, dt * 1.6)); ghostU.uLit.value[i] = ghostFx.k[i]; }
    ghostU.uWin.value = 0.35 + lampsK * 1.3;
    for (let i = 0; i < 3; i++) if (ghostFx.to[i] && Math.random() < dt * (0.6 + lampsK)) twinkle(tmp.set(GH[i][0] + (Math.random() - 0.5) * GH[i][3], 1 + Math.random() * GH[i][4], GH[i][1] + 1.8), 1, 0xffe0a0, 0.3);
    // gondolas glide along the cable
    if (gondolas.visible) { for (let i = 0; i < 3; i++) { gondAt(i, tmp); gondolas.setMatrixAt(i, _m.compose(tmp, _q.setFromEuler(_e.set(0, 0, Math.sin(tAll * 1.3 + i) * 0.05)), _s.setScalar(1))); } gondolas.instanceMatrix.needsUpdate = true; }
    // neon: signs light one by one, then hum
    neonFx.on = Math.min(neonFx.to, neonFx.on + dt * 2.2); neonU.uOn.value = neonFx.on;
    // frost: the aurora fills the night sky once the aurora sign (the neon unlock) is lit; cocoa steam; snowfall
    skyU.uTime.value = tAll; skyU.uAur.value = FROST ? Math.min(1, neonFx.on / 5) * Math.max(0, Math.min(1, (lampsK - 0.2) * 1.6)) : 0;
    if (snowfall) snowfall.material.uniforms.uT.value = tAll;
    if (FROST && stargazer.visible && Math.random() < dt * 5) { stargazer.localToWorld(tmp.set(-0.6 + (Math.random() - 0.5) * 0.4, 1.8, (Math.random() - 0.5) * 0.4)); dustPts.spawn({ x: tmp.x, y: tmp.y, z: tmp.z, vx: 0.1, vy: 0.55, vz: 0, drag: 0.8, max: 1.6, s0: 0.25, s1: 1.0, r: 0.78, gg: 0.76, b: 0.86, a: 0.3 }); }
    if (TV) { const on = travelOpen(cfg, S); travelPad.visible = on; if (on) { const k = Math.max(0, S.travelT || 0) / TV.hold; travelFace.rotation.y = tAll * 0.6; travelPad.scale.setScalar(1 + Math.sin(tAll * 3) * 0.04 + k * 0.2); if (Math.random() < dt * 3) twinkle(tmp.set(TV.x, 0.4, TV.z), 1, FROST ? 0xffb070 : 0x8ac8ff, 0.3); } }
    neonU.uBoost.value = (0.9 + lampsK * 1.1) * (1 + Math.sin(tAll * 11) * 0.03) * (post ? LK.glow.lantern : 1);
    // the finale: the heart rises out of the meteor and spins, then bursts; the comet streaks to its place
    if (finFx.st) {
      finFx.t += dt; const top = tmp3.set(W.meteor.x, W.meteor.y + MR * 0.9, W.meteor.z);
      if (finFx.st === 'rise') { const k = ease(Math.min(1, finFx.t / 3)); heart.visible = true; heart.position.set(top.x, lerp(top.y - 1.5, top.y + 2.6, k), top.z + 1); heart.rotation.y = finFx.t * 2.4; heart.scale.setScalar(0.4 + k * 0.9); if (Math.random() < dt * 30) twinkle(heart.position, 2, 0xffb0e8, 0.45); }
      else if (finFx.st === 'comet') { const k = Math.min(1, finFx.t / 3.2); comet.visible = true; comet.position.lerpVectors(COMET.from, COMET.to, ease(k)); if (Math.random() < dt * 40) glowPts.spawn({ x: comet.position.x + 1, y: comet.position.y, z: comet.position.z, vx: 2, vy: -0.5, vz: 0, drag: 1, max: 1.2, s0: 1.4, s1: 0.2, r: 0.7, gg: 0.9, b: 1 }); if (k >= 1) finFx.st = null; }
    }
    if (heart.visible && finFx.st !== 'rise') heart.position.y += dt * 0.5;
    if (comet.visible) comet.children[0].scale.setScalar(1 + Math.sin(tAll * 6) * 0.08);
    // night: fireflies drift over the sand around the deck
    if (lampsK > 0.5 && Math.random() < dt * 4 * lampsK) { const a = Math.random() * 6.28, r = 9 + Math.random() * 4; twinkle(tmp.set(Math.cos(a) * r, 0.6 + Math.random() * 1.5, 5 + Math.sin(a) * r * 0.7), 1, 0xd8ff8a, 0.22); }
  }

  /** Draws the state S (logic.js) for this frame; dt in seconds; g is the guide target ({ x, z } or null). */
  function update(S, dt, g) {
    dt = Math.max(0, dt); // never backwards: a negative step once stranded the meteor in the sky
    tAll += dt;
    // A GPU that rejects the carved-rock shader still gets a visible meteor.
    if (shaderFail && !meteor.userData.safe) { meteor.material = K(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.82 })); meteor.userData.safe = true; }
    for (const k of KINDS) itemN[k] = 0;
    const h = S.hero, sp = Math.hypot(h.vx, h.vz);
    // hero
    heroPos.set(h.x, 0.16, h.z); hero.root.position.copy(heroPos);
    let dy = h.face - hero.root.rotation.y; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); hero.root.rotation.y += dy * Math.min(1, dt * 14);
    hero.swingK = h.mining ? h.swing / cfg.mining.swing : 0;
    toyT = Math.max(0, toyT - dt);
    M.animPerson(hero, dt, sp, toyT > 0 ? 'cheer' : h.mining ? 'mine' : h.n > 0 ? 'carry' : null, tAll);
    hero.prop.visible = h.mining || h.n === 0;
    heroBob = hero.body.position.y * 1.15;
    if (sp > 1 && (stepT += dt) > 0.28) { stepT = 0; puff(h.x, h.z, 1, 0.45); }
    // the carried stack: a wobbling column in the hero's arms
    const stackN = Math.max(0, h.n - pendOf('stack')), lean = Math.min(0.25, sp * 0.03), hk = h.kind === 'chunk' ? 'chunk' : h.kind || 'chunk';
    for (let i = 0; i < stackN; i++) {
      slot('stack', i, tmp); const sway = Math.sin(tAll * 6 + i * 0.4) * 0.02 * i * lean * 4;
      tmp.x += Math.sin(hero.root.rotation.y) * -lean * i * 0.06 + sway; tmp.z += Math.cos(hero.root.rotation.y) * -lean * i * 0.06;
      put(hk, tmp.x, tmp.y, tmp.z, hero.root.rotation.y + i * 0.7, 0.9, i * 3);
    }
    // stops
    const pileN = Math.max(0, S.pile - pendOf('pile')); for (let i = 0; i < pileN; i++) { slot('pile', i, tmp); put('chunk', tmp.x, tmp.y, tmp.z, i * 1.3, 1.0, i, (i % 3) * 0.3); }
    S.pols.forEach((p) => fill('pol:' + p.id, p.polIn, 'chunk', 0.6, 0, 12));
    fill('counter', S.counter, 'gem', 1.0);
    S.stands.forEach((st) => fill('stand:' + st.id, st.items.length, (i) => st.items[i] || 'gem', 1.15, 0.03));
    fill('cash', S.cashPile, 'coin', 1.0, 0, 150);
    if (cart.visible) fill('cart', S.ghost.n, 'gem', 0.9, 0, 8);
    if (hasB(S, 'workshop')) { fill('ws', S.ws.gemsIn, 'gem', 0.75, 0); fill('wsR', S.ws.rings, 'ring', 0.9, 0.02); }
    // polishers: each wheel spins and throws sparks while it works
    for (const P of pols) {
      const st = S.pols.find((q) => q.id === P.d.id), on = P.g.visible && st && st.polIn >= cfg.polish.per && S.counter < W.counter.cap;
      P.wheel.userData.v = lerp(P.wheel.userData.v || 0, on ? 18 : 0, Math.min(1, dt * 4)); P.wheel.rotation.x -= P.wheel.userData.v * dt;
      if (on && Math.random() < dt * 30) glowPts.spawn({ x: P.d.x - Math.cos(P.ry) * 0.05, y: 1.2 + 0.16, z: P.d.z + 0.45, vx: (Math.random() - 0.5) * 2, vy: 1 + Math.random() * 2, vz: 2 + Math.random() * 2, g: 9, drag: 1, max: 0.35 + Math.random() * 0.25, s0: 0.22, s1: 0.04, r: 1, gg: 0.75, b: 0.4 });
      if (!P.popping) bumpS(P.g, P.d.id);
    }
    bumpS(counter, 'counter'); for (const St of stands) if (!St.popping) bumpS(St.g, St.d.id); bumpS(crate, 'crate'); bumpS(cashTray, 'cash'); if (workshop.visible && !workshop.popping) bumpS(workshop, 'workshop');
    for (const k in fx.stationBump) fx.stationBump[k] = Math.max(0, fx.stationBump[k] - dt * 5);
    // the shopkeeper: walks counter <-> stands with up to keeper.carry gems on a little tray
    if (S.keeper && keeper.root.visible) {
      const k = S.keeper; keeper.root.position.set(k.x, 0.16, k.z);
      let d = (k.face || 0) - keeper.root.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d)); keeper.root.rotation.y += d * Math.min(1, dt * 10);
      M.animPerson(keeper, dt, k.moving ? cfg.keeper.speed : 0, k.n > 0 ? 'carry' : null, tAll);
      fill('keeper', k.n, 'gem', 0.85, 0);
    }
    // Rush pickups: fall from the sky, then bob and twinkle on the deck until scooped
    for (const l of S.loose) {
      if (!looseT.has(l.id)) looseT.set(l.id, tAll);
      const k = Math.min(1, (tAll - looseT.get(l.id)) / 0.7), y = k < 1 ? lerp(9, 0.42, k * k) : 0.42 + Math.abs(Math.sin(tAll * 4 + l.id)) * 0.08;
      if (k >= 1 && !l.landed) { l.landed = true; puff(l.x, l.z, 2, 0.5, 0xffe0a0); }
      put(l.kind, l.x, y, l.z, tAll * 3 + l.id, l.kind === 'coin' ? 1.3 : 1.1, l.id, l.kind === 'coin' ? Math.PI / 2 : 0);
      if (Math.random() < dt * 1.5) twinkle(tmp.set(l.x, 0.7, l.z), 1, 0xfff0b0, 0.25);
    }
    if (!S.loose.length && looseT.size) looseT.clear();
    // flyers (a conveyor rider first follows its belt points, then hops into the hopper)
    for (let i = flyers.length - 1; i >= 0; i--) {
      const f = flyers[i]; f.t += dt;
      if (f.t < 0) continue;
      const k = Math.min(1, f.t / f.d), to = slot(f.key, f.idx(), tmp2);
      let x, y, z;
      if (f.pts) {
        const ride = (f.d - 0.35) / f.d;
        if (k < ride) { const u = (k / ride) * (f.pts.length - 1), j = Math.min(f.pts.length - 2, Math.floor(u)), a = f.pts[j], b = f.pts[j + 1], w = u - j; x = lerp(a.x, b.x, w); y = lerp(a.y, b.y, w) + (j === 0 ? Math.sin(w * Math.PI) * 0.6 : 0); z = lerp(a.z, b.z, w); }
        else { const w = (k - ride) / (1 - ride), a = f.pts[f.pts.length - 1]; x = lerp(a.x, to.x, w); y = lerp(a.y, to.y, w) + Math.sin(w * Math.PI) * 0.5; z = lerp(a.z, to.z, w); }
      } else { x = lerp(f.from.x, to.x, k); z = lerp(f.from.z, to.z, k); y = lerp(f.from.y, to.y, k) + Math.sin(k * Math.PI) * f.h; }
      put(f.kind, x, y, z, f.t * f.spin, f.kind === 'coin' ? 1 : 0.95, f.kind === 'coin' ? -1 : f.ci, f.kind === 'coin' ? f.t * 9 : 0);
      if (k >= 1) { pend[f.key] = Math.max(0, pendOf(f.key) - 1); flyers.splice(i, 1); if (f.onLand) f.onLand(to); }
    }
    // tourists
    const live = liveIds; live.clear(); for (const q of S.tourists) live.add(q.id);
    for (const p of tourists) if (p.id >= 0 && !live.has(p.id)) { p.id = -1; p.root.visible = false; }
    for (const q of S.tourists) {
      let p = tourists.find((o) => o.id === q.id);
      if (!p) { p = tourists.find((o) => o.id < 0); if (!p) continue; p.id = q.id; p.root.visible = true; p.cheer = 0; }
      p.root.position.set(q.x, 0.16 * Math.min(1, Math.max(0, (W.crowd.z0 + 0.2 - q.z) * 2)), q.z);
      let d = (q.face || 0) - p.root.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d)); p.root.rotation.y += d * Math.min(1, dt * 10);
      p.cheer = Math.max(0, (p.cheer || 0) - dt);
      M.animPerson(p, dt, q.moving ? cfg.sell.walk : 0, p.cheer > 0 ? 'cheer' : q.st === 'buy' ? 'carry' : null, tAll);
      if (q.item && (q.st === 'buy' || (q.st === 'leave' && q.z < W.crowd.z0))) { tmp.set(q.x + Math.sin(p.root.rotation.y) * 0.4, 1.25, q.z + Math.cos(p.root.rotation.y) * 0.4); put(q.item, tmp.x, tmp.y, tmp.z, tAll * 3, 1.0, q.id); }
    }
    // the order kid: hops in when an order is up, waves, cheers on delivery and walks off
    if (S.order) { kidSt.kind = S.order.kind; kidSt.k = Math.min(1, kidSt.k + dt * 2.5); } else if (kidSt.happy <= 0) kidSt.k = Math.max(0, kidSt.k - dt * 2);
    kidSt.happy = Math.max(0, kidSt.happy - dt);
    kid.root.visible = kidSt.k > 0.01;
    if (kid.root.visible) {
      kid.root.position.set(W.order.x, 0.16 + (kidSt.k < 1 ? Math.sin(kidSt.k * Math.PI) * 0.6 : 0), W.order.z + (1 - kidSt.k) * 2.5);
      kid.root.rotation.y = Math.PI + Math.sin(tAll * 0.8) * 0.2; kid.root.scale.setScalar(Math.max(0.05, kidSt.k));
      M.animPerson(kid, dt, kidSt.k < 1 ? 2 : 0, kidSt.happy > 0 ? 'cheer' : null, tAll);
      if (!kidSt.happy) kid.armR.rotation.x = -2.6 + Math.sin(tAll * 7) * 0.35; // waving
      if (kidSt.happy > 0) { slot('kid', 0, tmp); put(kidSt.kind || 'gem', tmp.x, tmp.y + 0.3, tmp.z + 0.3, tAll * 4, 1.1, 2); }
    }
    for (const k of KINDS) { items[k].count = itemN[k]; items[k].instanceMatrix.needsUpdate = true; if (items[k].instanceColor) items[k].instanceColor.needsUpdate = true; }
    // crowd: idle sway, a cheering wave after a sale
    fx.crowdCheer = Math.max(0, fx.crowdCheer - dt);
    for (let i = 0; i < crowdN; i++) {
      const p = crowd[i], wave = fx.crowdCheer > 0 ? Math.max(0, Math.sin((fx.crowdCheer * 6) - p.x * 0.5)) : 0;
      p.jump = wave * 0.35;
      const y = Math.abs(Math.sin(tAll * 1.6 + p.ph)) * 0.04 + p.jump;
      _m.compose(_p.set(p.x, y, p.z), _q.setFromEuler(_e.set(0, p.ry + Math.sin(tAll * 0.7 + p.ph) * 0.2, Math.sin(tAll * 1.1 + p.ph) * 0.04)), _s.setScalar(p.s));
      crowdA.setMatrixAt(i, _m); crowdB.setMatrixAt(i, _m);
    }
    crowdA.instanceMatrix.needsUpdate = crowdB.instanceMatrix.needsUpdate = true;
    // pad: the one unlock that is up next
    const P = S.pads.find((q) => q.shown && !q.done), Pd = P && cfg.pads.find((q) => q.id === P.id);
    if (P) {
      if (padId !== P.id) { padId = P.id; pad.position.set(Pd.x, 0.16, Pd.z); pad.visible = true; fx.padPop = 0; }
      drawPad(Pd.icon, P.price - P.paid, P.price);
      if (fx.padPop >= 0) { fx.padPop += dt; const k = Math.min(1, fx.padPop / 0.5); pad.scale.setScalar(Math.max(0.01, back(k))); if (k >= 1) fx.padPop = -1; }
      else pad.scale.setScalar(1 + Math.sin(tAll * 4) * 0.02 + fx.padPulse * 0.06);
      fx.padPulse = Math.max(0, fx.padPulse - dt * 6);
    } else if (pad.visible) { padId = null; pad.scale.multiplyScalar(Math.max(0, 1 - dt * 8)); if (pad.scale.x < 0.05) pad.visible = false; }
    // unlock build-up bounces
    for (let i = pops.length - 1; i >= 0; i--) {
      const q = pops[i]; q.t += dt; const k = Math.max(0, Math.min(1, q.t / q.d)); if (q.t < 0) continue;
      q.o.visible = true; q.o.scale.set(q.s * Math.max(0.01, back(k)), q.s * Math.max(0.01, back(Math.min(1, k * 1.15))), q.s * Math.max(0.01, back(k)));
      if (q.o.userData.fall) q.o.position.y = lerp(q.o.userData.fall, q.o.userData.y0, ease(k));
      if (k >= 1) { pops.splice(i, 1); q.o.popping = false; for (const x of [...pols, ...stands]) if (x.g === q.o) x.popping = false; }
    }
    // rigs: each drill turns and plunges on its hit
    for (const R of rigs) {
      if (!R.g.visible) continue;
      R.drill.rotation.y += dt * (8 + R.k * 30); R.k = Math.max(0, R.k - dt * 2.5);
      const pl = Math.sin(Math.min(1, R.k) * Math.PI); R.drill.position.set(0, 2.3 - pl * 0.35, -2.15 - pl * 0.5);
    }
    m3Update(S, dt);
    // laser: the head tracks its target, beams flash on each cut
    if (laser.visible) {
      const tg = laserFx.p.lengthSq() ? laserFx.p : surf(laserLon, 0.25, 0, tmp3);
      laserHead.rotation.y = lerp(laserHead.rotation.y, Math.atan2(-(tg.x - LA.x), -(tg.z - LA.z)), Math.min(1, dt * 6));
      laserFx.t = Math.max(0, laserFx.t - dt);
      const on = laserFx.t > 0, a = on ? Math.min(1, laserFx.t / 0.12) : 0;
      beamMat.opacity = 0.85 * a;
      for (const B of beams) {
        B.m.visible = on; if (!on) continue;
        tmp.set(B.dx, B.dx === 0 ? 0.06 : -0.08, -0.95).applyEuler(laserHead.rotation).add(laserHead.getWorldPosition(tmp2));
        B.m.position.copy(tmp); B.m.lookAt(laserFx.p); B.m.scale.set(1 + Math.sin(tAll * 60) * 0.3, 1 + Math.sin(tAll * 60) * 0.3, tmp.distanceTo(laserFx.p));
      }
      if (on && Math.random() < dt * 40) glowPts.spawn({ x: laserFx.p.x, y: laserFx.p.y, z: laserFx.p.z, vx: (Math.random() - 0.5) * 4, vy: 1 + Math.random() * 3, vz: 1 + Math.random() * 3, g: 9, drag: 1, max: 0.3 + Math.random() * 0.2, s0: 0.25, s1: 0.04, r: 1, gg: 0.55, b: 0.9 });
    }
    // tour bus: drives in on the canyon road, waits while the wave walks over, U-turns and leaves
    if (busSt.mode !== 'off') {
      busSt.t += dt; bus.visible = true;
      if (busSt.mode === 'in') { const k = Math.min(1, busSt.t / 3.2); busSt.x = lerp(-48, RD.park, ease(k)); if (k >= 1) { busSt.mode = 'wait'; busSt.t = 0; puff(RD.park + 2.2, RD.z, 6, 0.9); } }
      else if (busSt.mode === 'wait') { if (busSt.t > 7) { busSt.mode = 'out'; busSt.t = 0; } }
      else { const k = Math.min(1, busSt.t / 3.4); busSt.x = lerp(RD.park, 52, k * k); if (k >= 1) { busSt.mode = 'off'; bus.visible = false; } }
      bus.position.set(busSt.x, 0.03 + (busSt.mode === 'wait' ? Math.abs(Math.sin(busSt.t * 9)) * 0.015 : 0), RD.z); bus.rotation.y = 0;
      const v = busSt.mode === 'wait' ? 0 : 9; for (const w of busWheels) w.rotation.z -= v * dt;
      if (busSt.mode !== 'wait' && Math.random() < dt * 14) puff(bus.position.x - 2.2, RD.z + (Math.random() - 0.5) * 1.6, 1, 0.8);
    }
    // egg (the next one lodges in the meteor again after a hatch)
    if (eggState.mode === 'done' && S.egg.st === 'lodged') { eggState.mode = 'lodged'; egg.visible = true; egg.position.copy(eggLodge); egg.rotation.set(0.6, 0, -0.3); egg.scale.setScalar(1.7); }
    egg.visible = eggState.mode !== 'done' && S.egg.st !== 'none';
    eggState.t += dt;
    if (eggState.mode === 'lodged') { egg.rotation.z = -0.3 + Math.sin(tAll * 3) * 0.04; if (Math.random() < dt * 2) twinkle(egg.position, 1, 0xffc8f0, 0.3); }
    else if (eggState.mode === 'fall') {
      const k = Math.min(1, eggState.t / 1.1), to = tmp.set(W.egg.x, 0.16, W.egg.z);
      egg.position.set(lerp(eggState.from.x, to.x, k), lerp(eggState.from.y, to.y, k) + Math.sin(k * Math.PI) * 3, lerp(eggState.from.z, to.z, k));
      egg.rotation.set(lerp(0.6, 0, k), k * 6, lerp(-0.3, 0, k));
      if (k >= 1) { eggState.mode = eggState.queued ? 'hatch' : 'wait'; eggState.t = 0; eggState.queued = false; puff(W.egg.x, W.egg.z, 8, 0.9); ring(tmp.set(W.egg.x, 0.22, W.egg.z), 0xffc8f0, 0.3, 2.4, 0.5); cam.trauma = Math.min(1, cam.trauma + 0.25); }
    } else if (eggState.mode === 'wait') {
      const b = Math.abs(Math.sin(eggState.t * 3)) * Math.max(0, 1 - eggState.t * 0.6); egg.position.y = 0.16 + b * 0.3; egg.rotation.z = Math.sin(tAll * 4) * 0.12;
      eggBeacon.material.opacity = 0.35 + Math.sin(tAll * 5) * 0.25; eggBeacon.scale.setScalar(1 + Math.sin(tAll * 5) * 0.08);
      if (Math.random() < dt * 5) twinkle(tmp.set(W.egg.x, 0.8, W.egg.z), 1, 0xffd8f4, 0.3);
    } else if (eggState.mode === 'hatch') {
      const k = Math.min(1, eggState.t / cfg.egg.hatch), wob = Math.sin(eggState.t * (10 + k * 30)) * (0.08 + k * 0.3);
      egg.rotation.set(0, 0, wob); egg.scale.set(1.7 * (1 + k * 0.12), 1.7 * (1 - k * 0.08 + Math.abs(wob) * 0.2), 1.7 * (1 + k * 0.12));
      eggBeacon.material.opacity = 0.4 + k * 0.5; eggBeacon.scale.setScalar(1 + k * 0.6);
      if (Math.random() < dt * (6 + k * 30)) twinkle(tmp.set(W.egg.x, 0.6 + Math.random() * 0.6, W.egg.z), 1, 0xffe0f8, 0.35 + k * 0.3);
    } else if (eggState.mode === 'done') eggBeacon.material.opacity = Math.max(0, eggBeacon.material.opacity - dt * 2);
    if (eggState.mode === 'lodged') eggBeacon.material.opacity = Math.max(0, eggBeacon.material.opacity - dt * 2);
    // critters: the parade behind the hero; a fresh one pops out of its egg with a hop
    for (const c of S.critters) {
      const m = critters[c.id]; if (!m) continue;
      if (c.hide) { m.root.visible = false; continue; }
      if (!m.root.visible) { m.root.visible = true; m.hatchK = 0; }
      m.hatchK = Math.min(1, m.hatchK + dt / 0.6);
      m.root.position.set(c.x, 0.16 + (m.hatchK < 1 ? Math.sin(m.hatchK * Math.PI) * 1.6 : 0) + (toyT > 0 ? Math.abs(Math.sin(toyT * 9)) * 0.35 : 0), c.z);
      m.root.scale.setScalar(m.s * Math.max(0.05, back(m.hatchK)));
      let d = c.face - m.root.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d)); m.root.rotation.y += d * Math.min(1, dt * 8);
      M.animCritter(m, dt, Math.hypot(c.vx, c.vz), tAll, m.hatchK < 1 ? 0.3 : 0);
    }
    // blob shadows (hero, critters, keeper, kid, tourists, egg)
    let bn = 0; const blob = (x, z, s) => { if (bn < BLOBS) blobs.setMatrixAt(bn++, _m.compose(_p.set(x, 0.19, z), _q.identity(), _s.set(s, 1, s))); };
    blob(h.x, h.z, 1.3); for (const c of S.critters) if (!c.hide) blob(c.x, c.z, 0.9);
    if (keeper.root.visible) blob(keeper.root.position.x, keeper.root.position.z, 1.1); if (kid.root.visible) blob(kid.root.position.x, kid.root.position.z, 0.9 * kidSt.k);
    if (eggState.mode !== 'lodged' && eggState.mode !== 'done') blob(egg.position.x, egg.position.z, 1.0);
    for (const p of tourists) if (p.root.visible) blob(p.root.position.x, p.root.position.z, 1.1);
    blobs.count = bn; blobs.instanceMatrix.needsUpdate = true;
    // goal ring and badge
    if (g) {
      const tx = g.x, tz = g.z, [ax0, az, top] = anchor(g);
      // with the hero close to the stop the badge would cover them, so they slide to the side away from the hero
      // (measured on screen at the unmoved spot, so the slide never feeds back into itself)
      const [hx, hy] = toScreen(S.hero.x, 1, S.hero.z), [bx, by] = toScreen(ax0, top + 2.3, az), side = hx > bx ? -1 : 1;
      const cover = hy > by - 0.04 && hy < by + LK.guideNear ? Math.max(0, 1 - Math.abs(hx - bx) / 0.14) : 0;
      guideSide = lerp(guideSide, Math.min(1, cover * 2) * LK.guideSide * side, Math.min(1, dt * 6));
      const ax = ax0 + guideSide;
      guideRing.visible = true;
      guideRing.position.set(tx, 0.2, tz); guideRing.scale.setScalar(1 + Math.sin(tAll * 5) * 0.12); guideRing.material.opacity = (g.wait ? 0.25 : 0.55) * (1 - cam.showK);
      drawBadges(S, g, [ax, az, top]);
    } else { guideRing.visible = false; drawBadges(S, null, null); }
    drawMarks(S, g);
    // glint
    // a Perfect Strike (or a load) clears the logic's glint without a glintGone event: hide the star at once, no fade
    if (glintState.on && !S.glint) { glintState.on = false; glintState.out = 0; }
    if (glintState.on || glintState.out > 0) {
      glintState.t += dt; glintState.out = glintState.on ? Math.min(1, glintState.out + dt * 4) : Math.max(0, glintState.out - dt * 5);
      surf(glintState.lon, glintState.lat, cutAt(glintState.lon, glintState.lat) * cfg.mining.maxD - 0.25, glintPos);
      tmp.copy(glintPos).sub(meteor.position).normalize(); glintPos.addScaledVector(tmp, 0.4);
      glint.visible = true; glint.position.copy(glintPos); glint.quaternion.copy(camera.quaternion);
      const s = 0.85 + Math.sin(glintState.t * 7) * 0.12 + (glintState.on ? 0 : (1 - glintState.out) * 0.8); glint.scale.setScalar(s * (0.6 + glintState.out * 0.4));
      glintMat.uniforms.t.value = glintState.t; glintMat.uniforms.a.value = glintState.out;
      if (glintState.on && Math.random() < dt * 8) twinkle(glintPos, 1, 0xfff0c0, 0.3);
    } else glint.visible = false;
    // meteor: crystal pulse, the flash after a hit fades; Crystal Rush makes it flare and rain sparkles
    fx.rush = lerp(fx.rush, S.rush.on ? 1 : 0, Math.min(1, dt * 3));
    meteorU.uPulse.value = Math.sin(tAll * (1.6 + fx.rush * 6)) * 0.5 + 0.5 + fx.rush * 0.8; meteorU.uFlash.value.w = Math.max(0, meteorU.uFlash.value.w - dt * 3);
    meteorU.uGlow.value = meteorK;
    crystalLight.intensity = (0.8 + meteorK * 1.2) * (1 + meteorU.uFlash.value.w * 0.8 + fx.rush * 0.6);
    if (fx.rush > 0.05 && Math.random() < dt * 40 * fx.rush) { const D = W.deck; glowPts.spawn({ x: D.x0 + Math.random() * (D.x1 - D.x0), y: 7 + Math.random() * 3, z: D.z0 + Math.random() * (D.z1 - D.z0), vx: 0, vy: -6, vz: 0, drag: 0.2, max: 1.2, s0: 0.3, s1: 0.15, ...hexToRGB([0xffd35a, 0xff9ae8, 0x9ae8ff][Math.floor(Math.random() * 3)]) }); }
    // world: windmill, bunting sway, tumbleweeds, clouds, ambient motes by the meteor
    blades.rotation.z += dt * 1.4;
    bunting.forEach((b, i) => { b.rotation.x = Math.sin(tAll * 1.3 + i) * 0.015; });
    for (const w of weeds) {
      w.t += dt; const period = 16, k = (w.t % period) / period, x = w.dir * lerp(-34, 34, k);
      w.m.position.set(x, 0.38 + Math.abs(Math.sin(w.t * 3)) * 0.35, w.z + Math.sin(w.t * 0.7) * 0.8); w.m.rotation.z = -w.dir * w.t * 3.2; w.m.rotation.y = w.t * 0.5;
    }
    cloudList.forEach((c, i) => { c.x += c.v * dt; if (c.x > 60) c.x = -60; clouds.setMatrixAt(i, _m.compose(_p.set(c.x, c.y, c.z), _q.identity(), _s.set(c.s * 1.4, c.s * 0.8, c.s))); });
    clouds.instanceMatrix.needsUpdate = true;
    birdList.forEach((b, i) => { b.a += b.w * dt; b.f += dt * 7; birds.setMatrixAt(i, _m.compose(_p.set(b.cx + Math.cos(b.a) * b.r, b.y + Math.sin(b.f * 0.3) * 0.4, b.cz + Math.sin(b.a) * b.r), _q.setFromEuler(_e.set(0, -b.a - Math.sign(b.w) * Math.PI / 2, Math.sin(b.f) * 0.35)), _s.set(1, 1 + Math.sin(b.f) * 0.6, 1))); });
    birds.instanceMatrix.needsUpdate = true;
    cloudShadowTex.offset.x += dt * 0.006; cloudShadowTex.offset.y += dt * 0.002;
    streakSt.t -= dt;
    if (streakSt.t <= 0 && !streak.visible) { streak.visible = true; streakSt.v = 0; streakSt.x = -50 + Math.random() * 40; streakSt.y = 34 + Math.random() * 12; streakSt.z = -70 - Math.random() * 20; }
    if (streak.visible) { streakSt.v += dt; const k = streakSt.v / 1.3; streak.position.set(streakSt.x + k * 46, streakSt.y - k * 14, streakSt.z); streak.rotation.z = -0.3; streak.material.opacity = Math.sin(Math.min(1, k) * Math.PI) * 0.9; if (k >= 1) { streak.visible = false; streakSt.t = 6 + Math.random() * 8; } }
    if (Math.random() < dt * 6) { const a = Math.random() * 3 - 1.5; surf(a, Math.random() * 0.8, -0.4, tmp); twinkle(tmp, 1, [0xff9ae8, 0x9ae8ff, 0xd0a8ff][Math.floor(Math.random() * 3)], 0.28); }
    if (lampsK > 0.2 && Math.random() < dt * 3 * lampsK) { const L = lampXZ[Math.floor(Math.random() * lampXZ.length)]; twinkle(tmp.set(L[0] + (L[2] ? -0.42 : 0.42), 2.4, L[1]), 1, 0xffd08a, 0.2); }
    // shards and rings
    let sn = 0;
    for (const s of shardP) {
      if (!s || s.life <= 0) continue; s.life -= dt; s.vy -= 16 * dt; s.x += s.vx * dt; s.y += s.vy * dt; s.z += s.vz * dt;
      if (s.y < 0.25) { s.y = 0.25; s.vy *= -0.35; s.vx *= 0.6; s.vz *= 0.6; }
      s.rx += dt * 9; s.ry += dt * 7;
      shards.setMatrixAt(sn++, _m.compose(_p.set(s.x, s.y, s.z), _q.setFromEuler(_e.set(s.rx, s.ry, 0)), _s.setScalar(s.s * Math.min(1, s.life * 3))));
    }
    shards.count = sn; shards.instanceMatrix.needsUpdate = true;
    for (const r of rings) {
      if (r.t >= r.d) { r.m.visible = false; continue; }
      r.t += dt; const k = Math.min(1, r.t / r.d); r.m.scale.setScalar(lerp(r.s0, r.s1, ease(k))); r.m.material.opacity = (1 - k) * 0.85;
    }
    glowPts.update(dt); dustPts.update(dt);
    // camera
    // the frame follows the hero across the wide town (a little behind, leading where they walk); it eases a little
    // closer while the hero mines and punches in on a Perfect Strike
    const lead = cfg.camera.lead, tx = camX(h.x) + h.vx * 0.04 * lead, tz = camZ(h.z + h.vz * 0.08 * lead);
    const kf = Math.min(1, dt * cfg.camera.follow); cam.x += (tx - cam.x) * kf; cam.z += (tz - cam.z) * kf;
    cam.trauma = Math.max(0, cam.trauma - dt * 1.6); cam.kick = Math.max(0, cam.kick - dt * 3);
    cam.mineK = lerp(cam.mineK, h.mining ? 1 : 0, Math.min(1, dt * (h.mining ? 1.5 : 0.8))); cam.punch = Math.max(0, cam.punch - dt * 2.2);
    const zoom = lerp(1, cfg.camera.mineZoom, ease(cam.mineK)) * lerp(1, cfg.camera.punch, Math.sin(Math.min(1, cam.punch) * Math.PI / 2));
    const dist = camDist() * zoom, yaw = cfg.camera.yaw; let pitch = cfg.camera.pitch;
    camLook.set(lerp(cam.x, h.x * 0.5, cam.mineK * 0.5), 0, lerp(cam.z, cfg.camera.mineZ, cam.mineK * 0.6));
    let dd = dist, look = camLook;
    { const gx = Math.round(camLook.x / 2) * 2, gz = Math.round(camLook.z / 2) * 2 + 2; if (gx !== shadowAt.x || gz !== shadowAt.z) { shadowAt.set(gx, 0, gz); placeSun(); } }
    const ik = introStep(dt);
    if (ik > 0) { look = tmp3.copy(camLook).lerp(tmp2.set(W.meteor.x, 2, W.meteor.z + 2), ik); dd = dist * (1 + ik * 0.45); }
    if (cam.show) {
      cam.showK = Math.min(1, cam.showK + dt / 0.6); cam.show.t -= dt; if (cam.show.t <= 0) cam.show = null;
    } else cam.showK = Math.max(0, cam.showK - dt / 0.7);
    if (cam.showK > 0 && (cam.show || cam.last)) { const sh = cam.show || cam.last; cam.last = sh; const k = ease(cam.showK); look = tmp.copy(camLook).lerp(sh.p, k); dd = lerp(dist, camDist() * sh.zoom, k); if (sh.pitch) pitch = lerp(pitch, sh.pitch, k); focusLight.position.set(sh.p.x, sh.p.y + 2.4, sh.p.z + 1.8); focusLight.intensity = k * (cfg.cine ? cfg.cine.light : 0); } else focusLight.intensity = 0;
    camBase.set(look.x + Math.sin(yaw) * Math.cos(pitch) * dd, look.y + Math.sin(pitch) * dd, look.z + Math.cos(yaw) * Math.cos(pitch) * dd);
    const sh = cam.trauma * cam.trauma * 0.35;
    camera.position.set(camBase.x + (Math.random() - 0.5) * sh, camBase.y + (Math.random() - 0.5) * sh, camBase.z + (Math.random() - 0.5) * sh);
    camera.lookAt(look);
    const fov = cfg.camera.fov * (1 - cam.kick * 0.04); if (Math.abs(camera.fov - fov) > 1e-3) { camera.fov = fov; camera.updateProjectionMatrix(); }
    sky.position.copy(camera.position);
  }

  /** Pops in everything an unlock adds (staggered), with confetti, a ground ring, dust and a shake. Returns its centre. */
  function unlock(id, instant = false) {
    repaintSquare(id);
    const list = built[id] || [], c = new THREE.Vector3(); let n = 0;
    list.forEach((o, i) => {
      if (o.visible && !instant) return;
      o.visible = true; o.getWorldPosition(tmp); c.add(tmp); n++;
      if (instant) return;
      const s = o === keeper.root ? 1.25 : 1; o.popping = true; o.scale.setScalar(0.01); o.visible = false;
      if (id === 'road') { o.userData.y0 = o.userData.y0 ?? o.position.y; o.userData.fall = o.userData.y0 + 5; }
      pops.push({ o, t: -i * (id === 'road' ? 0.12 : 0.08), d: 0.7, s });
      for (const x of [...pols, ...stands]) if (x.g === o) x.popping = true;
    });
    if (n) c.divideScalar(n);
    if (id === 'neon') neonFx.to = 5;
    if (!instant) { c.y = 1.4; confetti(c, 90, 4); ring(tmp.set(c.x, 0.25, c.z), 0xffd35a, 0.5, 6, 0.7); puff(c.x, c.z, 14, 1.2); cam.trauma = Math.min(1, cam.trauma + 0.4); }
    return c;
  }

  bakeStatics();
  let lateDone = false;
  const proj = new THREE.Vector3();
  /** Screen position (0..1) of a world point. */
  function toScreen(x, y, z) { proj.set(x, y, z).project(camera); return [(proj.x + 1) / 2, (1 - proj.y) / 2, proj.z]; }

  return {
    renderer, scene, camera, setTier, setScale, resize, setTod, update, render: draw, toScreen, slot, fly, burst, puff, confetti, twinkle, ring,
    /** The badge atlas cell for a guide target: [canvas, sx, sy, size], or null (the tutorial hint draws the same icon). */
    icon(what) { const i = iconOf(what); if (!(i >= 0)) return null; const c = badgeTex.image.width / IC; return [badgeTex.image, (i % IC) * c, Math.floor(i / IC) * c, c]; },
    get tier() { return tier; }, get post() { return !!post; }, get tod() { return tod; }, get lamps() { return lampsK; }, firework,
    /** Hand-mining hit at lon/lat: carve, flash, burst; returns the world point of the hit. */
    hit(lon, lat, big = false) {
      const r = big ? cfg.glint.carveR : cfg.mining.carveR, d = big ? cfg.glint.carveD : cfg.mining.carveD;
      carve(lon, lat, r, d); const p = surf(lon, lat, cutAt(lon, lat) * cfg.mining.maxD * 0.8, new THREE.Vector3());
      meteorU.uFlash.value.set(p.x - meteor.position.x, p.y - meteor.position.y, p.z - meteor.position.z, big ? 2.2 : 1.0);
      burst(p, big ? 2.2 : 1, big ? 18 : 5);
      const n = p.clone().sub(meteor.position).normalize();
      ring(p.clone().addScaledVector(n, 0.1), big ? 0xffd6f6 : 0xffe0b0, 0.2, big ? 3.0 : 1.4, big ? 0.55 : 0.35, n);
      if (big) { ring(p.clone().addScaledVector(n, 0.12), 0x9ae8ff, 0.1, 2.2, 0.75, n); cam.trauma = Math.min(1, cam.trauma + 0.55); cam.kick = 1; cam.punch = 1; }
      else cam.trauma = Math.min(1, cam.trauma + 0.12);
      return p;
    },
    /** The drill rig strikes: plunge, carve near its lon, spray. Returns the hit point. */
    rigHit(i = 0) { const R = rigs[i]; R.k = 1; const lon = R.lon + (Math.random() - 0.5) * 0.25, lat = rigLat + Math.random() * 0.25; carve(lon, lat, cfg.rig.carveR, cfg.rig.carveD); const p = surf(lon, lat, cutAt(lon, lat) * cfg.mining.maxD * 0.8, new THREE.Vector3()); burst(p, 0.8, 4); return p; },
    surf: (lon, lat, d = 0) => surf(lon, lat, d, new THREE.Vector3()),
    glintOn(lon, lat) { Object.assign(glintState, { on: true, lon, lat, t: 0 }); },
    glintOff() { glintState.on = false; },
    get glint() { return glintState.on ? glintPos : null; },
    bump,
    padPay() { fx.padPulse = 1; },
    unlock,
    /** Starts the cold open (the meteor lands); skipIntro() jumps to its end (any tap). */
    startIntro() { intro.t = 0; intro.hit = false; rimShards.visible = false; meteor.position.copy(meteorSky); },
    skipIntro() { if (intro.t < 0) return; if (!intro.hit) introImpact(true); intro.t = Math.max(intro.t, INTRO.len - 0.6); },
    get introOn() { return intro.t >= 0; },
    /** Shows every building already bought (a continued game), without the bounce or confetti. */
    restoreBuilt(S) {
      for (const p of S.pads) if (p.done) unlock(p.id, true);
      for (let i = 0; i < 3; i++) ghostFx.k[i] = ghostFx.to[i] = i < S.ghost.lit ? 1 : 0;
      neonFx.on = neonFx.to = hasB(S, 'neon') ? 5 : 0;
      if (S.done1) { comet.visible = true; comet.position.copy(COMET.to); }
    },
    /** The laser fires: three beams to a point near its lon, a wide carve, sparks. Returns the hit point. */
    laserHit() {
      const lon = laserLon + (Math.random() - 0.5) * 0.7, lat = 0.1 + Math.random() * 0.4; carve(lon, lat, cfg.laser.carveR, cfg.laser.carveD);
      const p = surf(lon, lat, cutAt(lon, lat) * cfg.mining.maxD * 0.8, new THREE.Vector3()); laserFx.p.copy(p); laserFx.t = 0.35;
      meteorU.uFlash.value.set(p.x - meteor.position.x, p.y - meteor.position.y, p.z - meteor.position.z, 0.9); burst(p, 0.9, 4); return p;
    },
    /** The tour bus honks in on the canyon road. */
    busIn() { if (busSt.mode === 'off') { busSt.mode = 'in'; busSt.t = 0; } },
    /** Mid-arc of the egg's fall from the meteor to its spot, where the egg-drop beat looks. */
    get badgeSpots() { return badgeSpots; },
    get eggAt() { return new THREE.Vector3((eggLodge.x + W.egg.x) / 2, 1.6, (eggLodge.z + W.egg.z) / 2); },
    get busAt() { return new THREE.Vector3(RD.park, 0.5, RD.z - 1.5); },
    /** The order kid cheers: delivered. */
    kidHappy() { kidSt.happy = 1.3; confetti(tmp.set(W.order.x, 1.6, W.order.z), 40, 2.5); },
    eggDrop() { eggState.mode = 'fall'; eggState.t = 0; eggState.from.copy(egg.position); burst(egg.position, 1.2, 8); },
    hatchStart() { if (eggState.mode === 'fall') eggState.queued = true; else { eggState.mode = 'hatch'; eggState.t = 0; } }, // the hero can reach the spot before the egg lands
    hatch() { eggState.mode = 'done'; const p = new THREE.Vector3(W.egg.x, 0.8, W.egg.z); confetti(p, 110, 3.5); burst(p, 1.8, 14); ring(new THREE.Vector3(W.egg.x, 0.25, W.egg.z), 0xffc8f0, 0.4, 5, 0.7); cam.trauma = Math.min(1, cam.trauma + 0.3); },
    /** Crystal Rush starts: a big flare and ring on the meteor. */
    rush() { const p = surf(0, 0.3, 0, new THREE.Vector3()); meteorU.uFlash.value.set(p.x - meteor.position.x, p.y - meteor.position.y, p.z - meteor.position.z, 3); burst(p, 2.4, 20); ring(p, 0xffd35a, 0.5, 9, 0.9, p.clone().sub(meteor.position).normalize()); cam.trauma = Math.min(1, cam.trauma + 0.5); },
    /** A house of the ghost town lights up (i 0..2): colour floods in, the boards fall, sparkles and a ring. Returns its centre. */
    lightHouse(i) {
      ghostFx.to[i] = 1; const [x, z, , w, hh] = GH[i], p = new THREE.Vector3(x, hh * 0.5, z + 1.7);
      confetti(p, 80, 3); burst(p, 1.4, 10); ring(new THREE.Vector3(x, 0.25, z + 1.2), 0xffd35a, 0.5, w * 1.6, 0.8); for (let k = 0; k < 8; k++) puff(x + (k - 3.5) * w / 8, z + 1.7, 1, 1.0, FROST ? 0xb8bce0 : 0xc8b8a8);
      return p;
    },
    get cartAt() { return cart.position.clone(); },
    houseAt: (i) => new THREE.Vector3(GH[i][0], 1.5, GH[i][1]),
    /** The finale beats: 'rise' (heart lifts out of the meteor), 'burst' (it shatters into sparkles), 'comet'. */
    finale(beat) {
      const top = new THREE.Vector3(W.meteor.x, W.meteor.y + MR * 0.9, W.meteor.z + 1);
      if (beat === 'rise') { finFx.st = 'rise'; finFx.t = 0; meteorU.uFlash.value.set(0, MR * 0.9, 1, 3); burst(top, 2.4, 24); ring(top, 0xff9ae8, 0.5, 8, 0.9); cam.trauma = Math.min(1, cam.trauma + 0.6); }
      else if (beat === 'burst') { finFx.st = null; const p = heart.position.clone(); heart.visible = false; confetti(p, 160, 6); burst(p, 3, 40); ring(p, 0xffd35a, 0.5, 14, 1.0); ring(p, 0xff9ae8, 0.3, 10, 0.8, new THREE.Vector3(0, 0, 1)); cam.trauma = 1; }
      else if (beat === 'comet') { finFx.st = 'comet'; finFx.t = 0; comet.visible = true; comet.position.copy(COMET.from); }
      else if (beat === 'fireworks') for (let k = 0; k < 5; k++) confetti(new THREE.Vector3(-6 + k * 3, 6 + (k % 2) * 2, -2 - (k % 3)), 70, 5);
      return top;
    },
    get cometAt() { return COMET.to.clone(); },
    get heartAt() { return heart.position.clone(); },
    beltPath: (to) => { const P = pols[polIdx(to)]; return P === pols[1] ? beltPath : [beltPath[0]]; },
    /** Camera showcase: ease toward world point p and zoom (fraction of the normal distance) for sec seconds. */
    /** How far the current camera beat has eased in (0 idle, 1 at its peak). */
    get showK() { return cam.showK; },
    showcase(p, zoom, sec, pitch = 0, lock = false) { if (cam.show && cam.show.lock && !lock) return; cam.show = { p: p.clone(), zoom, t: sec, pitch, lock }; cam.last = cam.show; }, // a locked one (finale) is not cut short
    /** The cheer toy: the hero waves, the crowd does a wave, visitors and critters hop, a few sparkles. */
    toy() { toyT = 1.0; fx.crowdCheer = 1.2; for (const p of tourists) if (p.root.visible) p.cheer = 0.9; confetti(tmp3.set(heroPos.x, 2.2, heroPos.z), 18, 1.6); },
    cheer(id) { fx.crowdCheer = 1.2; const p = tourists.find((o) => o.id === id); if (p) p.cheer = 0.9; },
    shake(a) { cam.trauma = Math.min(1, cam.trauma + a); },
    /** Snaps the camera to its follow target (no easing): for the first frame and still views. */
    snap(S) { cam.x = camX(S.hero.x); cam.z = camZ(S.hero.z); },
    /** Live GPU textures and draw calls of the last frame. */
    stats() { return { textures: renderer.info.memory.textures, geometries: renderer.info.memory.geometries, calls: renderer.info.render.calls, tris: renderer.info.render.triangles }; },
    /** Work that waits for the first frame: the full town-square paint and the far desert. Safe to call twice. */
    late() { if (lateDone) return; lateDone = true; paintFull(); buildFar(); },
    /** Builds every shader before the first draw; resolves when the GPU has them (in parallel where the driver can). */
    prewarm() {
      // hidden things (later unlocks, effects) are shown for the compile so their shaders never build mid-game
      // drawing to the glow target and drawing straight to the screen use different shaders (tone mapping), so both
      // sets are built: the one in use now first, the other a moment later, so a quality step never builds them mid-game
      // the glow target is made on the first resize, which comes after this; make it now so the first picture's shaders
      // are built for the target it really draws to (otherwise the first draw builds the whole set a second time)
      postSync();
      const rt = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType });
      const build = (target, all = true) => {
        const hidden = []; if (all) scene.traverse((o) => { if (!o.visible) { hidden.push(o); o.visible = true; } });
        const was = renderer.getRenderTarget(); renderer.setRenderTarget(target);
        let p; try { p = renderer.compileAsync(scene, camera).catch(() => {}); } catch (e) { p = Promise.resolve(); /* drivers without compile build shaders on first draw */ }
        renderer.setRenderTarget(was); for (const o of hidden) o.visible = false;
        return p;
      };
      // the first picture waits only for what is on screen; later unlocks and effects compile right after it, long
      // before the first of them appears
      const p = build(post ? rt : null, false);
      p.then(() => setTimeout(() => build(post ? rt : null).then(() => build(post ? null : rt)).then(() => rt.dispose()), cfg.quality.warmLaterMs));
      return p;
    },
    dispose() {
      for (const o of keep) if (o && o.dispose) o.dispose();
      postFree(); scene.traverse((o) => { if (o.isInstancedMesh) o.dispose(); if (o.isMesh && o.geometry) o.geometry.dispose(); });
      renderer.dispose(); renderer.forceContextLoss();
    },
  };
}
