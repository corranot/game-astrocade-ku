// PROTOTYPE - NOT FOR PRODUCTION
// The 3D look of Meteor Gem Works (Three.js r187, global THREE): a frontier crater town around a fallen crystal
// meteor. The meteor carries a cut map (a lat-long DataTexture) that digs the rock in and reveals glowing crystal
// where it is mined. Items (chunks, gems, coins) are three InstancedMeshes rebuilt each frame from the logic state;
// effects are pooled (sparkle and dust points, shards, rings, flyers). A sky dome shader and the key lights blend
// between time-of-day keys. High tiers add a glow (bloom) pass with a colour grade (copied from +1 Mega Hammer).
// Plan: plan.md §5, §6, §9. This file only draws; logic.js owns the rules.
/* global THREE */
import * as M from './models.js';
import { todBlend } from './logic.js';

const { PAL } = M;
const GEM_COLS = [0xd8279f, 0x1fb8e0, 0x7a3cf0, 0xf2a81e, 0x22c07a];

function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
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
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 0.95;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.info.autoReset = false;
  const scene = new THREE.Scene(), keep = [];
  const K = (o) => { keep.push(o); return o; };
  const camera = new THREE.PerspectiveCamera(cfg.camera.fov, 9 / 16, 1, 160);

  // ---- sky dome: four-stop gradient from the zenith to the horizon, a soft sun glow; colours come from the tod keys
  const skyU = { c0: { value: new THREE.Color() }, c1: { value: new THREE.Color() }, c2: { value: new THREE.Color() }, c3: { value: new THREE.Color() }, sunDir: { value: new THREE.Vector3(0, 0.5, -1) }, sunC: { value: new THREE.Color() } };
  const sky = new THREE.Mesh(K(new THREE.SphereGeometry(140, 32, 16)), K(new THREE.ShaderMaterial({
    uniforms: skyU, side: THREE.BackSide, depthWrite: false, fog: false,
    vertexShader: 'varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'uniform vec3 c0; uniform vec3 c1; uniform vec3 c2; uniform vec3 c3; uniform vec3 sunDir; uniform vec3 sunC; varying vec3 vD; void main(){ float y = clamp(vD.y, -0.2, 1.0); vec3 c = mix(c3, c2, smoothstep(-0.05, 0.08, y)); c = mix(c, c1, smoothstep(0.08, 0.3, y)); c = mix(c, c0, smoothstep(0.3, 0.8, y)); float s = max(dot(normalize(vD), normalize(sunDir)), 0.0); c += sunC * (pow(s, 24.0) * 0.35 + pow(s, 4.0) * 0.08); gl_FragColor = vec4(c, 1.0);\n#include <colorspace_fragment>\n}',
  })));
  sky.renderOrder = -10; sky.frustumCulled = false; scene.add(sky);
  scene.fog = new THREE.Fog(0xf0d9b8, 34, 90);

  const hemi = new THREE.HemisphereLight(0xfff4e4, 0xb86f45, 1.05);
  const sun = new THREE.DirectionalLight(0xfff1d6, 2.5);
  sun.castShadow = true; sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.035;
  Object.assign(sun.shadow.camera, { left: -15, right: 15, top: 15, bottom: -15, near: 1, far: 70 });
  const rim = new THREE.DirectionalLight(0xb9a8ff, 0.5); rim.position.set(-8, 6, -18);
  // a soft violet bounce from the crystals onto the front of the square (kept low: it washes out anything close to it)
  const crystalLight = new THREE.PointLight(0xc070ff, 1.5, 14, 1.2); crystalLight.position.set(W.meteor.x, W.meteor.y + 0.5, W.meteor.z + W.meteor.r + 3.5);
  scene.add(hemi, sun, sun.target, rim, crystalLight);

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
  const mesh = (g, m = mat, shadow = true) => { const o = new THREE.Mesh(K(g), m); o.castShadow = shadow; o.receiveShadow = true; scene.add(o); return o; };

  // ---- ground: warm sand with ripples and pebbles, a big plane that fades into the fog
  const sandTex = K(canvasTex(512, 512, (g, s) => {
    g.fillStyle = '#e6bd88'; g.fillRect(0, 0, s, s);
    for (let i = 0; i < 46; i++) { const y = random() * s; g.strokeStyle = `rgba(${random() < 0.5 ? '201,152,99' : '247,220,176'},0.35)`; g.lineWidth = 3 + random() * 5; g.beginPath(); g.moveTo(0, y); for (let x = 0; x <= s; x += 32) g.lineTo(x, y + Math.sin(x * 0.03 + i) * 8); g.stroke(); }
    for (let i = 0; i < 900; i++) { g.fillStyle = ['rgba(150,100,70,0.35)', 'rgba(250,230,200,0.5)', 'rgba(190,120,80,0.3)'][i % 3]; g.beginPath(); g.arc(random() * s, random() * s, 0.8 + random() * 2.2, 0, 6.3); g.fill(); }
  }));
  sandTex.wrapS = sandTex.wrapT = THREE.RepeatWrapping; sandTex.repeat.set(14, 14);
  const ground = new THREE.Mesh(K(new THREE.PlaneGeometry(220, 220).rotateX(-Math.PI / 2)), K(new THREE.MeshStandardMaterial({ map: sandTex, roughness: 0.95 })));
  ground.receiveShadow = true; scene.add(ground);

  // ---- the meteor: lumpy rock, rust and soot patches, crystal veins that glow, dug in by the cut map
  const MR = W.meteor.r, CUT_W = 128, CUT_H = 64;
  const meteorGeo = K(M.buildMeteor(MR));
  {
    const p = meteorGeo.attributes.position, n = p.count, colA = new Float32Array(n * 3), vein = new Float32Array(n), v = new THREE.Vector3(), c = new THREE.Color();
    for (let i = 0; i < n; i++) {
      v.fromBufferAttribute(p, i).normalize();
      const r = M.noise3(v.x * 2.2 + 5, v.y * 2.2, v.z * 2.2), q = M.noise3(v.x * 5 + 1, v.y * 5, v.z * 5);
      c.set(0x241c2c).lerp(new THREE.Color(0x5a4658), Math.max(0, v.y) * 0.45 + q * 0.35).lerp(new THREE.Color(0x9a5038), Math.max(0, r - 0.55) * 1.8);
      colA[i * 3] = c.r; colA[i * 3 + 1] = c.g; colA[i * 3 + 2] = c.b;
      // crystal seams: blobs of a second noise where it peaks, with a soft edge (patches, not scribbles)
      const blob = M.noise3(v.x * 3.4 + 9, v.y * 3.4, v.z * 3.4) * 0.7 + M.noise3(v.x * 8 + 2, v.y * 8, v.z * 8) * 0.3;
      vein[i] = Math.min(1, Math.max(0, blob - 0.71) / 0.07);
    }
    meteorGeo.setAttribute('color', new THREE.BufferAttribute(colA, 3)); meteorGeo.setAttribute('aVein', new THREE.BufferAttribute(vein, 1));
  }
  const cutData = new Uint8Array(CUT_W * CUT_H * 4);
  const cutTex = K(new THREE.DataTexture(cutData, CUT_W, CUT_H, THREE.RGBAFormat)); cutTex.wrapS = THREE.RepeatWrapping; cutTex.magFilter = cutTex.minFilter = THREE.LinearFilter; cutTex.needsUpdate = true;
  const meteorU = { cutMap: { value: cutTex }, maxD: { value: cfg.mining.maxD }, uGlow: { value: 1 }, uPulse: { value: 0 }, uFlash: { value: new THREE.Vector4(0, 0, 0, 0) } };
  const meteorMat = K(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.82, metalness: 0.05, emissive: 0xffffff }));
  meteorMat.onBeforeCompile = (s) => {
    Object.assign(s.uniforms, meteorU);
    s.vertexShader = 'attribute float aVein; uniform sampler2D cutMap; uniform float maxD; varying float vCut; varying float vVein; varying vec3 vObj;\n' + s.vertexShader.replace('#include <begin_vertex>',
      '#include <begin_vertex>\nfloat cut = texture2D(cutMap, uv).r; transformed -= normalize(objectNormal) * cut * maxD; vCut = cut; vVein = aVein; vObj = position;');
    s.fragmentShader = 'uniform float uGlow; uniform float uPulse; uniform vec4 uFlash; varying float vCut; varying float vVein; varying vec3 vObj;\n' + s.fragmentShader
      .replace('#include <color_fragment>', '#include <color_fragment>\nfloat cr = max(smoothstep(0.04, 0.35, vCut), vVein * 0.85); float hue = sin(vObj.x * 1.7 + vObj.y * 2.3) * 0.5 + 0.5; vec3 crys = mix(vec3(0.82, 0.12, 0.62), vec3(0.12, 0.62, 0.95), hue); diffuseColor.rgb = mix(diffuseColor.rgb, crys * 0.35, cr);')
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\nfloat fl = uFlash.w * exp(-dot(vObj - uFlash.xyz, vObj - uFlash.xyz) * 0.8); float facet = 0.55 + 0.45 * abs(sin(dot(floor(vObj * 2.6), vec3(12.9898, 78.233, 37.719))));\ntotalEmissiveRadiance = crys * (cr * (0.24 + 0.1 * uPulse) * facet + fl) * uGlow;');
  };
  const meteor = mesh(meteorGeo, meteorMat); meteor.position.set(W.meteor.x, W.meteor.y, W.meteor.z); meteor.rotation.y = 0;
  const crater = mesh(M.buildCrater(MR), mat, false); crater.position.set(W.meteor.x, 0, W.meteor.z); crater.scale.set(1, 1, 0.72); // flattened toward the deck so its rim stops at the boards
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
    cutTex.needsUpdate = true;
  }
  const cutAt = (lon, lat) => { const x = Math.floor((((0.25 + lon / (Math.PI * 2)) % 1 + 1) % 1) * CUT_W), y = Math.max(0, Math.min(CUT_H - 1, Math.floor((0.5 + lat / Math.PI) * CUT_H))); return cutData[(y * CUT_W + x) * 4] / 255; };
  // a few crystal clusters stuck in the meteor and around the rim (gem material, instanced)
  const shardGeo = K(M.chunkGeo(0.42)), rimShards = new THREE.InstancedMesh(shardGeo, chunkMat, 22);
  {
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), p = new THREE.Vector3(), s = new THREE.Vector3(), c = new THREE.Color();
    for (let i = 0; i < 22; i++) {
      if (i < 10) { const lon = -1.9 + random() * 3.8, lat = -0.1 + random() * 0.9; surf(lon, lat, 0.15, p); const nrm = p.clone().sub(meteor.position).normalize(); q.setFromUnitVectors(new THREE.Vector3(0, 1, 0), nrm); s.setScalar(1.1 + random() * 1.1); }
      else { const a = random() * Math.PI * 2, d = MR * 1.62 + random() * 1.4; p.set(W.meteor.x + Math.cos(a) * d, 0, W.meteor.z + Math.sin(a) * d * 0.9); if (p.z > -1.4) p.z = -1.4 - random(); q.setFromEuler(e.set(random() * 0.5, random() * 6, random() * 0.5)); s.setScalar(0.5 + random() * 0.6); }
      rimShards.setMatrixAt(i, m4.compose(p, q, s)); rimShards.setColorAt(i, c.set(GEM_COLS[i % GEM_COLS.length]));
    }
  }
  rimShards.castShadow = true; scene.add(rimShards);

  // ---- the deck (play area) and its rope fence, the crowd behind it
  const D = W.deck;
  mesh(M.buildDeck(D), mat, false);
  // plank boards as a texture (vertex colours cannot draw thin seams): warm boards, dark gaps, nail heads, grain
  const plankTex = K(canvasTex(256, 256, (g, s) => {
    const n = 6, w = s / n;
    for (let i = 0; i < n; i++) {
      const v = random(); g.fillStyle = `rgb(${200 + v * 22},${140 + v * 18},${88 + v * 12})`; g.fillRect(i * w, 0, w, s);
      for (let k = 0; k < 7; k++) { g.strokeStyle = `rgba(140,85,45,${0.12 + random() * 0.12})`; g.lineWidth = 1 + random() * 1.5; g.beginPath(); const x = i * w + 4 + random() * (w - 8); g.moveTo(x, 0); g.bezierCurveTo(x + 3, s * 0.3, x - 3, s * 0.6, x + 2, s); g.stroke(); }
      const cut = random() * s; g.fillStyle = 'rgba(90,50,25,0.85)'; g.fillRect(i * w, cut, w, 2.5);
      g.fillStyle = 'rgba(70,45,30,0.7)'; for (const y of [cut + 8, cut - 8]) for (const dx of [6, w - 6]) { g.beginPath(); g.arc(i * w + dx, (y + s) % s, 1.8, 0, 6.3); g.fill(); }
      g.fillStyle = 'rgba(90,50,25,0.9)'; g.fillRect(i * w, 0, 2.5, s);
    }
  }));
  plankTex.wrapS = plankTex.wrapT = THREE.RepeatWrapping;
  { const w = D.x1 - D.x0 + 1.1, d = D.z1 - D.z0 + 1.1; plankTex.repeat.set(w / 2.6, d / 2.6); const top = new THREE.Mesh(K(new THREE.PlaneGeometry(w, d).rotateX(-Math.PI / 2)), K(new THREE.MeshStandardMaterial({ map: plankTex, roughness: 0.78 }))); top.position.set((D.x0 + D.x1) / 2, 0.175, (D.z0 + D.z1) / 2); top.receiveShadow = true; scene.add(top); }
  mesh(M.buildRopeFence(D.x0 - 0.3, D.x1 + 0.3, D.z1 + 0.75, 12), brassMat);

  // ---- the town: false-front shops on both sides, water tower, windmill, mesas, cacti, lamps and bunting
  const shops = [];
  const shopDefs = [[-11.2, 1.0, Math.PI / 2, 4.2, 4.6, 0xd98a6a, PAL.cream, PAL.terraDark], [-11.6, 7.6, Math.PI / 2, 4.8, 3.6, 0x7ab8b0, PAL.cream, PAL.woodDark], [11.3, 0.4, -Math.PI / 2, 4.6, 4.2, 0xe6c56a, PAL.woodDark, PAL.red], [11.6, 7.2, -Math.PI / 2, 4.2, 5.0, 0xb88ad0, PAL.cream, PAL.navy], [-6.6, -9.5, 0.35, 4.4, 3.8, 0x9ab0d8, PAL.cream, PAL.terraDark], [7.2, -9.8, -0.4, 4.0, 4.4, 0xe8a27a, PAL.cream, PAL.woodDark]];
  for (const [x, z, ry, w, h, wall, trim, roof] of shopDefs) {
    const g = M.buildShop(w, h, wall, trim, roof), b = mesh(g.body), wn = mesh(g.windows, winMat, false);
    for (const o of [b, wn]) { o.position.set(x, 0, z); o.rotation.y = ry; }
    shops.push(b);
  }
  const tower = mesh(M.buildWaterTower()); tower.position.set(-9.6, 0, -4.2);
  const wm = M.buildWindmill(), mill = mesh(wm.tower), blades = mesh(wm.blades); mill.position.set(10.4, 0, -4.6); mill.rotation.y = -0.5;
  blades.position.set(10.4 + Math.sin(-0.5) * 0.95, 6.35, -4.6 + Math.cos(-0.5) * 0.95); blades.rotation.y = -0.5;
  for (const [x, z, w, h, d, ry] of [[-24, -30, 20, 10, 8, 0.2], [6, -38, 28, 14, 10, -0.05], [30, -28, 18, 9, 8, -0.3], [-40, -18, 16, 8, 8, 0.9], [42, -14, 16, 10, 8, -0.9], [-12, -46, 26, 18, 10, 0.1], [22, -52, 24, 20, 10, -0.15]]) { const m = mesh(M.buildMesa(w, h, d), mat, false); m.position.set(x, -0.4, z); m.rotation.y = ry; }
  const cactusPos = [[-9.2, 10.5], [9.4, 11.2], [-13.6, 4.6], [14.0, 3.6], [-8.4, -1.8], [8.8, -1.4], [-15, -7], [15.5, -9], [-4.5, -12.5], [3.2, -13.2], [-18, 12], [18, 13]];
  cactusPos.forEach(([x, z], i) => { const c = mesh(M.buildCactus(i)); c.position.set(x, 0, z); c.rotation.y = i * 1.7; c.scale.setScalar(0.85 + (i % 3) * 0.15); });
  for (const [x, z, ry] of [[-9.0, 4.4, 0.4], [9.1, 3.8, -0.6], [-8.8, -6.6, 1.2], [9.4, 9.4, 2.1]]) { const b = mesh(M.buildBarrels()); b.position.set(x, 0, z); b.rotation.y = ry; }
  // foreground: a parked ore wagon, flower pots and cacti in front of the crowd so the bottom of the frame is never bare
  for (const [x, z, ry, k] of [[-5.6, 15.4, 0.3, 0], [5.2, 15.8, -0.5, 1], [0.4, 16.6, 0.1, 2], [-2.6, 15.2, 0, 3], [7.8, 14.2, 0, 4], [-8.2, 14.6, 0, 5]]) {
    const o = k < 2 ? mesh(M.buildBarrels()) : mesh(M.buildCactus(k)); o.position.set(x, 0, z); o.rotation.y = ry; if (k >= 2) o.scale.setScalar(0.7 + (k % 2) * 0.2);
  }
  // lamp posts along both deck edges (instanced): bulbs glow at dusk
  const lampXZ = []; for (const sx of [-1, 1]) for (const z of [-0.4, 3.6, 7.6]) lampXZ.push([sx * (D.x1 + 0.75), z, sx < 0 ? 0 : Math.PI]);
  const lp = M.buildLampPost(), posts = new THREE.InstancedMesh(K(lp.post), brassMat, lampXZ.length), bulbs = new THREE.InstancedMesh(K(lp.bulb), glowMat, lampXZ.length);
  lampXZ.forEach(([x, z, ry], i) => { const m4 = new THREE.Matrix4().compose(new THREE.Vector3(x, 0, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, ry, 0)), new THREE.Vector3(1, 1, 1)); posts.setMatrixAt(i, m4); bulbs.setMatrixAt(i, m4); });
  posts.castShadow = true; scene.add(posts, bulbs);
  const bunting = [];
  for (const sx of [-1, 1]) for (let k = 0; k < 2; k++) {
    const x = sx * (D.x1 + 0.75), za = k ? 3.6 : -0.4, zb = k ? 7.6 : 3.6, b = mesh(M.buildBunting(x, 2.6, za, x, 2.6, zb, 9), K(new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide, roughness: 0.7 })), false);
    bunting.push(b);
  }
  // across the front of the meteor, high: a festival line from the water tower to the windmill
  bunting.push(mesh(M.buildBunting(-8.6, 5.2, -3.6, 9.6, 5.6, -3.8, 22), bunting[0].material, false));

  // ---- soft round blob shadows under everything that moves (the only shadows on tier 0)
  const blobTex = K(canvasTex(64, 64, (g, s) => { const gr = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2); gr.addColorStop(0, 'rgba(60,30,20,0.55)'); gr.addColorStop(0.6, 'rgba(60,30,20,0.25)'); gr.addColorStop(1, 'rgba(60,30,20,0)'); g.fillStyle = gr; g.fillRect(0, 0, s, s); }));
  const blobs = new THREE.InstancedMesh(K(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2)), K(new THREE.MeshBasicMaterial({ map: blobTex, transparent: true, depthWrite: false, opacity: LK.contact })), 16);
  blobs.renderOrder = 1; blobs.frustumCulled = false; scene.add(blobs);

  // ---- stations
  const pol = mesh(M.buildPolisher()); pol.position.set(W.polisher.x, 0.16, W.polisher.z); pol.rotation.y = Math.PI;
  const wheel = mesh(M.buildWheel()); wheel.position.set(W.polisher.x + 0.05, 1.45 + 0.16, W.polisher.z); wheel.rotation.y = Math.PI;
  const counter = mesh(M.buildCounter()); counter.position.set(W.counter.x, 0.16, W.counter.z);
  const st = M.buildStand(), stand = mesh(st.body), glass = mesh(st.glass, glassMat, false); stand.position.set(W.stand.x, 0.16, W.stand.z); glass.position.copy(stand.position); stand.rotation.y = glass.rotation.y = Math.PI;
  const crate = mesh(M.buildCrate()); crate.position.set(W.crate.x, 0.16, W.crate.z); crate.rotation.y = 0.5;
  const cashMat = brassMat;
  const cashTray = mesh(M.merge([M.paint(M.at(M.rbox(2.0, 0.12, 1.6, 0.05), 0, 0.06, 0), PAL.woodDark), M.paint(M.at(M.rbox(1.8, 0.05, 1.4, 0.03), 0, 0.13, 0), PAL.velvet)]));
  cashTray.position.set(W.cash.x, 0.16, W.cash.z);
  // station markers: a soft ring on the deck at each stop the hero walks into
  const markTex = K(canvasTex(128, 128, (g, s) => { g.strokeStyle = 'rgba(255,240,210,0.95)'; g.lineWidth = 7; g.setLineDash([14, 10]); g.beginPath(); g.arc(s / 2, s / 2, s / 2 - 8, 0, 6.3); g.stroke(); }));
  const marks = {};
  const markAt = (key, x, z, r) => { const m = new THREE.Mesh(K(new THREE.PlaneGeometry(r * 2, r * 2).rotateX(-Math.PI / 2)), K(new THREE.MeshBasicMaterial({ map: markTex, transparent: true, depthWrite: false, opacity: 0.35, color: 0xfff0d0 }))); m.position.set(x, 0.18, z); m.renderOrder = 2; scene.add(m); marks[key] = m; };
  markAt('mine', W.mine.x, W.mine.z, W.mine.r); markAt('pile', W.pile.x, W.pile.z, W.pile.r); markAt('polisher', W.polisher.in[0], W.polisher.in[1], 0.9); markAt('counter', W.counter.x, W.counter.z + 1.15, 0.9);
  markAt('stand', W.stand.in[0], W.stand.in[1], 0.9); markAt('cash', W.cash.x, W.cash.z, 1.1); markAt('crate', W.crate.x, W.crate.z + 0.9, 0.7);
  marks.counter.position.z = W.counter.z - 1.15;

  // ---- the price pad (drill rig): brass base, a canvas face redrawn in place (one texture for its life: fix B)
  const padDef = cfg.pads[0];
  const pad = new THREE.Group(); pad.position.set(padDef.x, 0.16, padDef.z); scene.add(pad);
  { const b = new THREE.Mesh(K(M.buildPadBase()), brassMat); b.receiveShadow = true; pad.add(b); }
  const padCanvas = document.createElement('canvas'); padCanvas.width = padCanvas.height = 256;
  const padTex = K(new THREE.CanvasTexture(padCanvas)); padTex.colorSpace = THREE.SRGBColorSpace; padTex.anisotropy = 4;
  const padFace = new THREE.Mesh(K(new THREE.PlaneGeometry(2.0, 2.0).rotateX(-Math.PI / 2)), K(new THREE.MeshBasicMaterial({ map: padTex, transparent: true }))); padFace.position.y = 0.2; pad.add(padFace);
  let padDrawn = -1;
  function drawPad(left, price) {
    if (left === padDrawn) return; padDrawn = left;
    const g = padCanvas.getContext('2d'), s = 256, k = 1 - left / price;
    g.clearRect(0, 0, s, s);
    g.fillStyle = '#2f6f69'; g.beginPath(); g.roundRect(14, 14, s - 28, s - 28, 34); g.fill();
    g.strokeStyle = '#f6d27a'; g.lineWidth = 10; g.beginPath(); g.roundRect(14, 14, s - 28, s - 28, 34); g.stroke();
    g.strokeStyle = 'rgba(255,230,160,0.35)'; g.lineWidth = 16; g.beginPath(); g.arc(s / 2, s / 2 - 22, 62, 0, 6.3); g.stroke();
    g.strokeStyle = '#ffd35a'; g.beginPath(); g.arc(s / 2, s / 2 - 22, 62, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2); g.stroke();
    // drill icon
    g.save(); g.translate(s / 2, s / 2 - 22); g.fillStyle = '#ffe6a8'; g.fillRect(-14, -40, 28, 26); g.beginPath(); g.moveTo(-16, -12); g.lineTo(16, -12); g.lineTo(0, 38); g.closePath(); g.fill();
    g.strokeStyle = '#2f6f69'; g.lineWidth = 4; for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(-12 + i * 3, -2 + i * 12); g.lineTo(12 - i * 3, 4 + i * 12); g.stroke(); } g.restore();
    // coin and price
    g.fillStyle = '#ffd35a'; g.beginPath(); g.arc(78, 200, 20, 0, 6.3); g.fill(); g.fillStyle = '#c98a2a'; g.beginPath(); g.arc(78, 200, 12, 0, 6.3); g.fill();
    g.fillStyle = '#fff6e0'; g.font = '900 54px system-ui, sans-serif'; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText(String(left), 108, 202);
    padTex.needsUpdate = true;
  }
  pad.visible = false;

  // ---- the drill rig (hidden until bought) and its drill head
  const rig = new THREE.Group(); rig.position.set(W.rigAt.x, 0, W.rigAt.z); rig.rotation.y = 0.35; scene.add(rig);
  { const b = new THREE.Mesh(K(M.buildRig()), mat); b.castShadow = true; rig.add(b); }
  const drill = new THREE.Mesh(K(M.buildDrillHead()), brassMat); drill.castShadow = true; drill.position.set(0, 2.3, -2.15); drill.rotation.x = -0.32; rig.add(drill);
  rig.visible = false;
  const rigLon = Math.atan2(W.rigAt.x - W.meteor.x, W.rigAt.z - W.meteor.z) * 0.9, rigLat = 0.05;

  // ---- characters: the hero (miner), tourists (pool), the crowd (instanced), the critter and its egg
  const hero = M.makePerson(mat, { pants: PAL.navy, boots: PAL.woodDark, shirt: PAL.red, shirt2: 0xb8443c, vest: PAL.woodLight, scarf: PAL.teal, belt: PAL.brassDark, skin: PAL.skin, hair: PAL.woodDark, hat: 'cowboy', hatCol: 0xc98d58, band: PAL.teal, pickaxe: true, sleeve: 0xe7d4b4 });
  hero.root.scale.setScalar(1.4); scene.add(hero.root);
  const outfits = [
    { pants: 0x5a6a8a, boots: PAL.ink, shirt: PAL.pink, shirt2: 0xd47898, skin: PAL.skin, hair: 0x4a2e22, hat: 'sun', hatCol: 0xf3d6a6, band: PAL.pink, camera: true },
    { pants: 0x3e5a4a, boots: PAL.woodDark, shirt: PAL.sun, shirt2: 0xd8a64a, skin: PAL.skinDark, skin2: 0xa8704e, hair: PAL.ink, hat: 'cap', hatCol: PAL.teal, band: PAL.tealDark },
    { pants: PAL.plum, boots: PAL.ink, shirt: PAL.mint, shirt2: 0x6cc0a0, skin: PAL.skin, hair: 0xd9a04a, hat: 'sun', hatCol: 0xe9c08a, band: PAL.violet, camera: true },
    { pants: 0x6a4a3a, boots: PAL.woodDark, shirt: 0x7aa8e8, shirt2: 0x5a88c8, skin: 0xe0a880, hair: 0x2a1a14, hat: 'cowboy', hatCol: 0x8e6a40, band: PAL.red },
    { pants: PAL.navy, boots: PAL.ink, shirt: 0xf09a6a, shirt2: 0xd8784a, skin: PAL.skinDark, skin2: 0xa8704e, hair: PAL.ink, hat: 'cap', hatCol: PAL.red, band: PAL.cream },
    { pants: 0x4a5a3a, boots: PAL.woodDark, shirt: PAL.violet, shirt2: 0x6a44c0, skin: PAL.skin, hair: 0x8a4a2a, hat: 'sun', hatCol: PAL.cream, band: PAL.teal, camera: true },
  ];
  const tourists = outfits.map((o) => { const p = M.makePerson(mat, o); p.root.scale.setScalar(1.25); p.root.visible = false; p.id = -1; scene.add(p.root); return p; });
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
  const critter = M.makeCritter(mat, shellMat); critter.root.visible = false; critter.root.scale.setScalar(1.25); scene.add(critter.root);
  const eg = M.eggGeos(), egg = new THREE.Group(); scene.add(egg);
  const eggShell = new THREE.Mesh(K(eg.shell), mat), eggSpots = new THREE.Mesh(K(eg.spots), spotMat); eggShell.castShadow = true; egg.add(eggShell, eggSpots);
  egg.scale.setScalar(1.7);
  const eggLodge = surf(0.18, 0.55, -0.1); egg.position.copy(eggLodge); egg.rotation.set(0.6, 0, -0.3);
  const eggBeacon = new THREE.Mesh(K(new THREE.RingGeometry(0.75, 0.95, 40).rotateX(-Math.PI / 2)), K(new THREE.MeshBasicMaterial({ color: 0xffc8f0, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending })));
  eggBeacon.position.set(W.egg.x, 0.2, W.egg.z); scene.add(eggBeacon);
  const eggState = { mode: 'lodged', t: 0, from: new THREE.Vector3() };

  // ---- guide arrow: a gold chevron bobbing over the next useful stop, with a pulsing ring on the deck
  const arrowShape = new THREE.Shape(); arrowShape.moveTo(-0.32, 0.5); arrowShape.lineTo(0.32, 0.5); arrowShape.lineTo(0.32, 0.05); arrowShape.lineTo(0.62, 0.05); arrowShape.lineTo(0, -0.62); arrowShape.lineTo(-0.62, 0.05); arrowShape.lineTo(-0.32, 0.05); arrowShape.closePath();
  const arrowMat = K(new THREE.MeshStandardMaterial({ color: 0xffc94a, emissive: 0xff9a20, emissiveIntensity: 0.55, roughness: 0.3, metalness: 0.4 }));
  const arrow = new THREE.Mesh(K(new THREE.ExtrudeGeometry(arrowShape, { depth: 0.16, bevelEnabled: true, bevelSize: 0.05, bevelThickness: 0.05, bevelSegments: 2 }).translate(0, 0, -0.08)), arrowMat);
  arrow.castShadow = true; scene.add(arrow);
  const guideRing = new THREE.Mesh(K(new THREE.RingGeometry(0.55, 0.72, 40).rotateX(-Math.PI / 2)), K(new THREE.MeshBasicMaterial({ color: 0xffd36a, transparent: true, opacity: 0.6, depthWrite: false })));
  guideRing.renderOrder = 3; scene.add(guideRing);

  // ---- tumbleweeds rolling across the sand now and then
  const twGeo = K(M.buildTumbleweed()), weeds = [0, 1].map((i) => { const m = new THREE.Mesh(twGeo, mat); m.castShadow = true; scene.add(m); return { m, t: i * 9, z: i ? 12.5 : -2.6, dir: i ? -1 : 1 }; });
  // ---- soft clouds drifting in the sky (instanced, one draw)
  const cloudGeo = K(M.merge([0, 1, 2, 3, 4].map((k) => M.paint(M.at(new THREE.SphereGeometry(1, 12, 8), (k - 2) * 1.3, Math.sin(k * 2) * 0.3 + (k === 2 ? 0.5 : 0), 0, 0, 0, 0, [1.3 - Math.abs(k - 2) * 0.15, 0.85 - Math.abs(k - 2) * 0.12, 1]), 0xfff2e4))));
  const cloudMat = K(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, emissive: 0xffe8d0, emissiveIntensity: 0.35, fog: false })), clouds = new THREE.InstancedMesh(cloudGeo, cloudMat, 7);
  const cloudList = []; for (let i = 0; i < 7; i++) cloudList.push({ x: -40 + i * 13 + random() * 6, y: 16 + random() * 9, z: -55 - random() * 25, s: 2.4 + random() * 2, v: 0.4 + random() * 0.5 });
  clouds.frustumCulled = false; clouds.instanceMatrix.setUsage(THREE.DynamicDrawUsage); scene.add(clouds);

  // ---- items: chunks, gems, coins, each one InstancedMesh filled per frame (+ flyers in the air)
  const coinGeo = K(M.coinGeo(0.2));
  const items = {
    chunk: new THREE.InstancedMesh(K(M.chunkGeo(0.25)), chunkMat, 220),
    gem: new THREE.InstancedMesh(K(M.gemGeo(0.24)), gemMat, 120),
    coin: new THREE.InstancedMesh(coinGeo, cashMat, 220),
  };
  const itemN = { chunk: 0, gem: 0, coin: 0 };
  for (const m of Object.values(items)) { m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); m.castShadow = true; m.frustumCulled = false; m.count = 0; scene.add(m); }
  for (const k of ['chunk', 'gem']) { const m = items[k]; for (let i = 0; i < m.instanceMatrix.count; i++) m.setColorAt(i, new THREE.Color(GEM_COLS[(i * 7) % GEM_COLS.length])); }
  const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _c = new THREE.Color();
  /** Places the next instance of kind at (x, y, z), turned ry (and tipped rx), scale s, colour index ci. */
  function put(kind, x, y, z, ry = 0, s = 1, ci = -1, rx = 0) {
    const m = items[kind], i = itemN[kind]; if (i >= m.instanceMatrix.count) return;
    m.setMatrixAt(i, _m.compose(_p.set(x, y, z), _q.setFromEuler(_e.set(rx, ry, 0)), _s.setScalar(s)));
    if (ci >= 0 && m.instanceColor) m.setColorAt(i, _c.set(GEM_COLS[ci % GEM_COLS.length]));
    itemN[kind] = i + 1;
  }
  // in-flight items: counts shown at a stop leave out what is still flying to it (so nothing appears twice)
  const pend = { pile: 0, pol: 0, counter: 0, stand: 0, cash: 0, stack: 0 };
  const flyers = [];
  /** Slot positions of each stop (index i of n), in world space. */
  function slot(key, i, out) {
    if (key === 'pile') { const a = i * 2.39996, r = 0.18 + Math.sqrt(i) * 0.16, y = Math.max(0, 0.55 - r * 0.45) + Math.floor(i / 22) * 0.1; return out.set(W.pile.x + Math.cos(a) * Math.min(r, 1.0), 0.2 + y, W.pile.z + Math.sin(a) * Math.min(r, 1.0)); }
    if (key === 'stack') { const f = hero.root.rotation.y; return out.set(heroPos.x + Math.sin(f) * 0.62, 1.25 + i * 0.19 + heroBob, heroPos.z + Math.cos(f) * 0.62); }
    if (key === 'pol') { const k = Math.min(i, 11), a = k * 2.4; return out.set(W.polisher.x + 0.6 + Math.cos(a) * 0.12, 1.42 + Math.floor(k / 4) * 0.06 + 0.16, W.polisher.z - 0.05 + Math.sin(a) * 0.12); }
    if (key === 'counter') { const c = i % 4, r = Math.floor(i / 4) % 3; return out.set(W.counter.x - 0.6 + c * 0.4, 1.2, W.counter.z - 0.25 + r * 0.25); }
    if (key === 'stand') { const c = i % 4, r = Math.floor(i / 4) % 2; return out.set(W.stand.x - 0.6 + c * 0.4, 1.25, W.stand.z - 0.2 + r * 0.4); }
    if (key === 'cash') { const col = i % 6, h = Math.floor(i / 6); return out.set(W.cash.x - 0.55 + (col % 3) * 0.55, 0.36 + h * 0.07, W.cash.z - 0.28 + Math.floor(col / 3) * 0.56); }
    if (key === 'hero') return out.set(heroPos.x, 1.4, heroPos.z);
    if (key === 'pad') return out.set(padDef.x, 0.5, padDef.z);
    if (key === 'crate') return out.set(W.crate.x, 0.7, W.crate.z);
    if (key === 'wheel') return out.set(W.polisher.x, 1.6, W.polisher.z + 0.3);
    return out.set(0, 0, 0);
  }
  /** Sends one item of kind flying from (a) to stop key's slot (index from count(n)), after a delay; arc height h. */
  function fly(kind, from, key, idx, delay = 0, h = 1.6, onLand = null) {
    if (pend[key] !== undefined) pend[key]++;
    flyers.push({ kind, from: from.clone(), key, idx, t: -delay, d: 0.32 + Math.random() * 0.06, h, ci: Math.floor(Math.random() * 5), spin: (Math.random() - 0.5) * 12, onLand });
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
  for (let i = 0; i < 90; i++) shards.setColorAt(i, new THREE.Color(GEM_COLS[i % 5]));
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
      glowPts.spawn({ x: p.x, y: p.y, z: p.z, vx: Math.cos(a) * sp * Math.sqrt(1 - u * u), vy: Math.abs(u) * sp + 1, vz: Math.sin(a) * sp * Math.sqrt(1 - u * u) + 1.5, g: 6, drag: 2.2, max: 0.5 + Math.random() * 0.4, s0: 0.5 * k, s1: 0.1, ...hexToRGB(GEM_COLS[i % 5]) });
    }
    for (let i = 0; i < n; i++) {
      const s = shardP[shardNext] || (shardP[shardNext] = {}); shardNext = (shardNext + 1) % 90;
      const a = Math.random() * 6.28, sp = 2 + Math.random() * 3 * k;
      Object.assign(s, { x: p.x, y: p.y, z: p.z, vx: Math.cos(a) * sp, vy: 3 + Math.random() * 4, vz: Math.sin(a) * sp * 0.6 + 2, life: 0.9 + Math.random() * 0.5, rx: Math.random() * 6, ry: Math.random() * 6, s: 0.8 + Math.random() * 0.8 });
    }
    for (let i = 0; i < 6 * k; i++) dustPts.spawn({ x: p.x + (Math.random() - 0.5) * 0.6, y: p.y - 0.2, z: p.z + 0.3, vx: (Math.random() - 0.5) * 2, vy: 0.6 + Math.random(), vz: 0.8 + Math.random(), drag: 2.5, max: 0.9 + Math.random() * 0.5, s0: 0.6, s1: 1.8 * k, r: 0.55, gg: 0.42, b: 0.4, a: 0.55 });
  }
  /** Soft ground puff (footsteps, landings). */
  function puff(x, z, n = 3, s = 0.6, col = 0xe8c69a) {
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
  const cam = { x: 0, z: W.mine.z + 3, trauma: 0, kick: 0, show: null, showK: 0 };
  const camBase = new THREE.Vector3(), camLook = new THREE.Vector3();
  function camDist() { const hf = Math.atan(Math.tan(THREE.MathUtils.degToRad(cfg.camera.fov) / 2) * camera.aspect); return (cfg.camera.width / 2) / Math.tan(hf); }

  // ---- state shared by update(): hero position for slots
  const heroPos = new THREE.Vector3(); let heroBob = 0;
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
    const el = L('elev'); sun.position.set(Math.cos(el) * -9, Math.sin(el) * 22 + 2, Math.cos(el) * 14 + 4); sun.target.position.set(0, 0, 3);
    skyU.sunDir.value.copy(sun.position).normalize();
    renderer.toneMappingExposure = L('exp'); lampsK = L('lamps'); meteorK = L('meteor');
    glowMat.color.setRGB(0.35 + lampsK * 1.6, 0.27 + lampsK * 1.15, 0.18 + lampsK * 0.6);
    winMat.emissiveIntensity = lampsK * 1.4; crystalLight.intensity = 0.8 + meteorK * 1.2;
    scene.environmentIntensity = 0.45 - lampsK * 0.15;
  }

  // ---- quality tiers
  let tier = -1, rs = 1;
  const ratio = () => Math.min(window.devicePixelRatio || 1, cfg.quality.dpr[tier]) * rs;
  function setTier(t) {
    t = Math.max(0, Math.min(cfg.quality.dpr.length - 1, t)); if (t === tier) return; tier = t;
    renderer.setPixelRatio(ratio());
    const sm = cfg.quality.shadow[t];
    renderer.shadowMap.enabled = sm > 0; sun.castShadow = sm > 0;
    if (sm > 0) { sun.shadow.mapSize.set(sm, sm); if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; } }
    crowdN = Math.min(C.n, cfg.quality.crowd[t]); crowdA.count = crowdB.count = crowdN;
    scene.traverse((o) => { if (o.material) { for (const m of [].concat(o.material)) m.needsUpdate = true; } });
    postSync();
  }
  function setScale(s) { if (s === rs) return; rs = s; renderer.setPixelRatio(ratio()); postSync(); }
  function resize(w, h) { renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); glowPts.m.uniforms.scale.value = dustPts.m.uniforms.scale.value = h * renderer.getPixelRatio() * 0.9; postSync(); }

  // ---- glow (bloom) and grade on tiers >= look.postTier (from +1 Mega Hammer): half-float scene target, bright
  // pass, blur at 1/4 and 1/8, then tone mapping + sRGB + warmth/saturation/contrast/vignette to the canvas
  const BL = LK.bloom, GR = LK.grade;
  const glowList = [
    { set: (on) => { for (const m of [gemMat, chunkMat]) m.emissiveIntensity = on ? 0.3 * LK.glow.gem : 0.3; for (const m of [shellMat, spotMat]) m.emissiveIntensity = on ? 0.35 * LK.glow.gem : 0.35; } },
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
  const finalMat = fsMat({ t: { value: null }, b1: { value: null }, b2: { value: null }, strength: { value: 0 }, vig: { value: 0 }, con: { value: 1 }, sat: { value: 1 }, warm: { value: 0 } },
    'uniform sampler2D t; uniform sampler2D b1; uniform sampler2D b2; uniform float strength; uniform float vig; uniform float con; uniform float sat; uniform float warm; varying vec2 vUv; void main(){ gl_FragColor = vec4(texture2D(t, vUv).rgb + (texture2D(b1, vUv).rgb + texture2D(b2, vUv).rgb) * strength, 1.0);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\nvec3 g = gl_FragColor.rgb; g += vec3(warm, warm * 0.35, -warm) * (1.0 - g); g = mix(vec3(dot(g, vec3(0.2126, 0.7152, 0.0722))), g, sat); g = (g - 0.5) * con + 0.5; g *= 1.0 - vig * smoothstep(0.4, 1.0, length((vUv - 0.5) * vec2(1.0, 1.25)) * 1.4142); gl_FragColor.rgb = clamp(g, 0.0, 1.0); }');
  let post = null;
  const postSize = new THREE.Vector2();
  function hdrOk() { try { const gl = renderer.getContext(); return typeof WebGL2RenderingContext !== 'undefined' && gl instanceof WebGL2RenderingContext && !!(gl.getExtension('EXT_color_buffer_float') || gl.getExtension('EXT_color_buffer_half_float')); } catch (e) { return false; } }
  function postFree() { if (post) for (const t of post.rt) t.dispose(); post = null; }
  function postSync() {
    if (!BL.on || tier < LK.postTier || !hdrOk()) { postFree(); return; }
    renderer.getDrawingBufferSize(postSize); const w = Math.max(1, postSize.x), h = Math.max(1, postSize.y), q = (d) => [Math.max(1, Math.round(w / d)), Math.max(1, Math.round(h / d))];
    if (!post) {
      const small = () => new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, depthBuffer: false });
      post = { scene: new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, depthBuffer: true, samples: BL.samples }), q1: small(), q2: small(), e1: small(), e2: small() };
      post.rt = [post.scene, post.q1, post.q2, post.e1, post.e2];
    }
    post.scene.setSize(w, h); post.q1.setSize(...q(4)); post.q2.setSize(...q(4)); post.e1.setSize(...q(8)); post.e2.setSize(...q(8));
  }
  const fsPass = (m, target) => { fsMesh.material = m; renderer.setRenderTarget(target); renderer.render(fsMesh, fsCam); };
  function draw() {
    renderer.info.reset();
    if (!post) { glowSet(false); renderer.setRenderTarget(null); renderer.render(scene, camera); return; }
    glowSet(true); renderer.setRenderTarget(post.scene); renderer.render(scene, camera); glowSet(false);
    const Pp = post, u = brightMat.uniforms, d = blurMat.uniforms.d.value, f = finalMat.uniforms;
    u.t.value = Pp.scene.texture; u.px.value.set(1 / Pp.scene.width, 1 / Pp.scene.height); u.thr.value = BL.threshold; u.knee.value = BL.knee; u.lim.value = BL.max; fsPass(brightMat, Pp.q1);
    blurMat.uniforms.t.value = Pp.q1.texture; d.set(1 / Pp.q1.width, 0); fsPass(blurMat, Pp.q2);
    blurMat.uniforms.t.value = Pp.q2.texture; d.set(0, 1 / Pp.q1.height); fsPass(blurMat, Pp.q1);
    blurMat.uniforms.t.value = Pp.q1.texture; d.set(1 / Pp.e1.width, 0); fsPass(blurMat, Pp.e2);
    blurMat.uniforms.t.value = Pp.e2.texture; d.set(0, 1 / Pp.e1.height); fsPass(blurMat, Pp.e1);
    f.t.value = Pp.scene.texture; f.b1.value = Pp.q1.texture; f.b2.value = Pp.e1.texture; f.strength.value = BL.strength; f.vig.value = GR.vignette; f.con.value = GR.contrast; f.sat.value = GR.saturation; f.warm.value = GR.warmth;
    fsPass(finalMat, null);
  }

  // ---------------------------------------------------------------- per-frame sync with the logic state
  const fx = { rigUp: -1, rigPlunge: 0, padPop: -1, padPulse: 0, hatchK: 0, stationBump: {}, flash: 0, crowdCheer: 0 };
  const bump = (k) => { fx.stationBump[k] = 1; };
  const bumpS = (o, k, base = 1) => { const b = fx.stationBump[k] || 0; o.scale.set(base * (1 + b * 0.08), base * (1 - b * 0.1), base * (1 + b * 0.08)); };
  let tAll = 0, stepT = 0;
  const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3();

  /** Draws the state S (logic.js) for this frame; dt in seconds; g is the guide target ({ x, z } or null). */
  function update(S, dt, g) {
    tAll += dt;
    for (const k of ['chunk', 'gem', 'coin']) itemN[k] = 0;
    const h = S.hero, sp = Math.hypot(h.vx, h.vz);
    // hero
    heroPos.set(h.x, 0.16, h.z); hero.root.position.copy(heroPos);
    let dy = h.face - hero.root.rotation.y; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); hero.root.rotation.y += dy * Math.min(1, dt * 14);
    hero.swingK = h.mining ? h.swing / cfg.mining.swing : 0;
    M.animPerson(hero, dt, sp, h.mining ? 'mine' : h.n > 0 ? 'carry' : null, tAll);
    hero.prop.visible = h.mining || h.n === 0;
    heroBob = hero.body.position.y * 1.15;
    if (sp > 1 && (stepT += dt) > 0.28) { stepT = 0; puff(h.x, h.z, 1, 0.45); }
    // the carried stack: a wobbling column in the hero's arms
    const stackN = Math.max(0, h.n - pend.stack), lean = Math.min(0.25, sp * 0.03);
    for (let i = 0; i < stackN; i++) {
      slot('stack', i, tmp); const sway = Math.sin(tAll * 6 + i * 0.4) * 0.02 * i * lean * 4;
      tmp.x += Math.sin(hero.root.rotation.y) * -lean * i * 0.06 + sway; tmp.z += Math.cos(hero.root.rotation.y) * -lean * i * 0.06;
      put(h.kind === 'gem' ? 'gem' : 'chunk', tmp.x, tmp.y, tmp.z, hero.root.rotation.y + i * 0.7, 0.9, i * 3);
    }
    // stops
    const pileN = Math.max(0, S.pile - pend.pile); for (let i = 0; i < pileN; i++) { slot('pile', i, tmp); put('chunk', tmp.x, tmp.y, tmp.z, i * 1.3, 1.0, i, (i % 3) * 0.3); }
    const polN = Math.min(12, Math.max(0, S.polIn - pend.pol)); for (let i = 0; i < polN; i++) { slot('pol', i, tmp); put('chunk', tmp.x, tmp.y, tmp.z, i * 1.9, 0.6, i + 2); }
    const cN = Math.max(0, S.counter - pend.counter); for (let i = 0; i < cN; i++) { slot('counter', i, tmp); put('gem', tmp.x, tmp.y + Math.sin(tAll * 2 + i) * 0.02, tmp.z, tAll * 0.6 + i, 1.0, i); }
    const sN = Math.max(0, S.stand - pend.stand); for (let i = 0; i < sN; i++) { slot('stand', i, tmp); put('gem', tmp.x, tmp.y + 0.05 + Math.sin(tAll * 2 + i) * 0.03, tmp.z, tAll * 1.1 + i, 1.15, i + 1); }
    const kN = Math.min(150, Math.max(0, S.cashPile - pend.cash)); for (let i = 0; i < kN; i++) { slot('cash', i, tmp); put('coin', tmp.x, tmp.y, tmp.z, i * 0.9, 1.0); }
    // polisher: the wheel spins and throws sparks while it works
    const working = S.polIn >= cfg.polish.per && S.counter < W.counter.cap;
    wheel.userData.v = lerp(wheel.userData.v || 0, working ? 18 : 0, Math.min(1, dt * 4)); wheel.rotation.x -= wheel.userData.v * dt;
    if (working && Math.random() < dt * 30) glowPts.spawn({ x: W.polisher.x + 0.05, y: 1.2 + 0.16, z: W.polisher.z + 0.45, vx: (Math.random() - 0.5) * 2, vy: 1 + Math.random() * 2, vz: 2 + Math.random() * 2, g: 9, drag: 1, max: 0.35 + Math.random() * 0.25, s0: 0.22, s1: 0.04, r: 1, gg: 0.75, b: 0.4 });
    bumpS(pol, 'pol'); bumpS(counter, 'counter'); bumpS(stand, 'stand'); bumpS(crate, 'crate'); bumpS(cashTray, 'cash');
    for (const k in fx.stationBump) fx.stationBump[k] = Math.max(0, fx.stationBump[k] - dt * 5);
    // flyers
    for (let i = flyers.length - 1; i >= 0; i--) {
      const f = flyers[i]; f.t += dt;
      if (f.t < 0) continue;
      const k = Math.min(1, f.t / f.d);
      const idx = f.idx(), to = slot(f.key, idx, tmp2);
      const x = lerp(f.from.x, to.x, k), z = lerp(f.from.z, to.z, k), y = lerp(f.from.y, to.y, k) + Math.sin(k * Math.PI) * f.h;
      put(f.kind, x, y, z, f.t * f.spin, f.kind === 'coin' ? 1 : 0.95, f.kind === 'coin' ? -1 : f.ci, f.kind === 'coin' ? f.t * 9 : 0);
      if (k >= 1) { if (pend[f.key] !== undefined) pend[f.key] = Math.max(0, pend[f.key] - 1); flyers.splice(i, 1); if (f.onLand) f.onLand(to); }
    }
    for (const k of ['chunk', 'gem', 'coin']) { items[k].count = itemN[k]; items[k].instanceMatrix.needsUpdate = true; if (items[k].instanceColor) items[k].instanceColor.needsUpdate = true; }
    // tourists
    const live = new Set(S.tourists.map((q) => q.id));
    for (const p of tourists) if (p.id >= 0 && !live.has(p.id)) { p.id = -1; p.root.visible = false; }
    for (const q of S.tourists) {
      let p = tourists.find((o) => o.id === q.id);
      if (!p) { p = tourists.find((o) => o.id < 0); if (!p) continue; p.id = q.id; p.root.visible = true; p.cheer = 0; }
      p.root.position.set(q.x, 0.16 * Math.min(1, Math.max(0, (W.crowd.z0 + 0.2 - q.z) * 2)) , q.z);
      let d = (q.face || 0) - p.root.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d)); p.root.rotation.y += d * Math.min(1, dt * 10);
      p.cheer = Math.max(0, (p.cheer || 0) - dt);
      M.animPerson(p, dt, q.moving ? cfg.sell.walk : 0, p.cheer > 0 ? 'cheer' : q.st === 'buy' ? 'carry' : null, tAll);
      if (q.st === 'buy' || (q.st === 'leave' && q.z < W.crowd.z0)) { tmp.set(q.x + Math.sin(p.root.rotation.y) * 0.4, 1.25, q.z + Math.cos(p.root.rotation.y) * 0.4); put('gem', tmp.x, tmp.y, tmp.z, tAll * 3, 1.0, q.id); }
    }
    items.gem.count = itemN.gem; items.gem.instanceMatrix.needsUpdate = true; items.gem.instanceColor.needsUpdate = true;
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
    // pad
    const P = S.pads[0];
    if (P.shown && !P.done) {
      if (!pad.visible) { pad.visible = true; fx.padPop = 0; }
      drawPad(P.price - P.paid, P.price);
      if (fx.padPop >= 0) { fx.padPop += dt; const k = Math.min(1, fx.padPop / 0.5); pad.scale.setScalar(Math.max(0.01, back(k))); if (k >= 1) fx.padPop = -1; }
      else pad.scale.setScalar(1 + Math.sin(tAll * 4) * 0.02 + fx.padPulse * 0.06);
      fx.padPulse = Math.max(0, fx.padPulse - dt * 6);
    } else if (P.done && pad.visible) { pad.scale.multiplyScalar(Math.max(0, 1 - dt * 8)); if (pad.scale.x < 0.05) pad.visible = false; }
    // rig: build-up bounce, then the drill turns and plunges on each rig hit
    if (fx.rigUp >= 0) { fx.rigUp += dt; const k = Math.min(1, fx.rigUp / 0.7); rig.scale.set(back(k), Math.max(0.01, back(Math.min(1, k * 1.15))), back(k)); if (k >= 1) fx.rigUp = -1; }
    if (rig.visible) {
      drill.rotation.y += dt * (8 + fx.rigPlunge * 30);
      fx.rigPlunge = Math.max(0, fx.rigPlunge - dt * 2.5);
      const pl = Math.sin(Math.min(1, fx.rigPlunge) * Math.PI);
      drill.position.set(0, 2.3 - pl * 0.35, -2.15 - pl * 0.5);
    }
    // egg
    eggState.t += dt;
    if (eggState.mode === 'lodged') { egg.rotation.z = -0.3 + Math.sin(tAll * 3) * 0.04; if (Math.random() < dt * 2) twinkle(egg.position, 1, 0xffc8f0, 0.3); }
    else if (eggState.mode === 'fall') {
      const k = Math.min(1, eggState.t / 1.1), to = tmp.set(W.egg.x, 0.16, W.egg.z);
      egg.position.set(lerp(eggState.from.x, to.x, k), lerp(eggState.from.y, to.y, k) + Math.sin(k * Math.PI) * 3, lerp(eggState.from.z, to.z, k));
      egg.rotation.set(lerp(0.6, 0, k), k * 6, lerp(-0.3, 0, k));
      if (k >= 1) { eggState.mode = eggState.queued ? 'hatch' : 'wait'; eggState.t = 0; eggState.queued = false; puff(W.egg.x, W.egg.z, 8, 0.9); ring(tmp.set(W.egg.x, 0.22, W.egg.z), 0xffc8f0, 0.3, 2.4, 0.5); fx.shake = 0.25; cam.trauma = Math.min(1, cam.trauma + 0.25); }
    } else if (eggState.mode === 'wait') {
      const b = Math.abs(Math.sin(eggState.t * 3)) * Math.max(0, 1 - eggState.t * 0.6); egg.position.y = 0.16 + b * 0.3; egg.rotation.z = Math.sin(tAll * 4) * 0.12;
      eggBeacon.material.opacity = 0.35 + Math.sin(tAll * 5) * 0.25; eggBeacon.scale.setScalar(1 + Math.sin(tAll * 5) * 0.08);
      if (Math.random() < dt * 5) twinkle(tmp.set(W.egg.x, 0.8, W.egg.z), 1, 0xffd8f4, 0.3);
    } else if (eggState.mode === 'hatch') {
      const k = Math.min(1, eggState.t / cfg.egg.hatch), wob = Math.sin(eggState.t * (10 + k * 30)) * (0.08 + k * 0.3);
      egg.rotation.set(0, 0, wob); egg.scale.set(1.7 * (1 + k * 0.12), 1.7 * (1 - k * 0.08 + Math.abs(wob) * 0.2), 1.7 * (1 + k * 0.12));
      eggBeacon.material.opacity = 0.4 + k * 0.5; eggBeacon.scale.setScalar(1 + k * 0.6);
      if (Math.random() < dt * (6 + k * 30)) twinkle(tmp.set(W.egg.x, 0.6 + Math.random() * 0.6, W.egg.z), 1, 0xffe0f8, 0.35 + k * 0.3);
    } else if (eggState.mode === 'done') { eggBeacon.material.opacity = Math.max(0, eggBeacon.material.opacity - dt * 2); egg.visible = false; }
    // critter
    if (S.critter) {
      const c = S.critter;
      if (!critter.root.visible) { critter.root.visible = true; fx.hatchK = 0; }
      fx.hatchK = Math.min(1, fx.hatchK + dt / 0.6);
      critter.root.position.set(c.x, 0.16 + (fx.hatchK < 1 ? Math.sin(fx.hatchK * Math.PI) * 1.6 : 0), c.z);
      critter.root.scale.setScalar(1.25 * Math.max(0.05, back(fx.hatchK)));
      let d = c.face - critter.root.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d)); critter.root.rotation.y += d * Math.min(1, dt * 8);
      M.animCritter(critter, dt, Math.hypot(c.vx, c.vz), tAll, fx.hatchK < 1 ? 0.3 : 0);
    }
    // blob shadows (hero, critter, tourists, egg)
    let bn = 0; const blob = (x, z, s) => { blobs.setMatrixAt(bn++, _m.compose(_p.set(x, 0.19, z), _q.identity(), _s.set(s, 1, s))); };
    blob(h.x, h.z, 1.3); if (S.critter) blob(S.critter.x, S.critter.z, 0.9);
    if (eggState.mode !== 'lodged' && eggState.mode !== 'done') blob(egg.position.x, egg.position.z, 1.0);
    for (const p of tourists) if (p.root.visible) blob(p.root.position.x, p.root.position.z, 1.1);
    blobs.count = bn; blobs.instanceMatrix.needsUpdate = true;
    // guide arrow and ring
    if (g) {
      const tx = g.x, tz = g.z, b = Math.abs(Math.sin(tAll * 3.2));
      const top = { polisher: 2.6, stand: 3.4, counter: 2.2, pile: 2.0, crate: 1.7, cash: 1.6, mine: 2.6, egg: 1.9 }[g.what] || 1.8;
      const ax = g.what === 'counter' ? W.counter.x : g.what === 'polisher' ? W.polisher.x : g.what === 'stand' ? W.stand.x : tx, az = g.what === 'counter' ? W.counter.z : g.what === 'polisher' ? W.polisher.z : g.what === 'stand' ? W.stand.z : tz;
      arrow.visible = guideRing.visible = true;
      arrow.position.set(lerp(arrow.position.x, ax, Math.min(1, dt * 10)), top + 0.5 + b * 0.45, lerp(arrow.position.z, az, Math.min(1, dt * 10)));
      arrow.rotation.set(0, tAll * 2.2, 0); arrow.scale.set(1 + (1 - b) * 0.1, 0.9 + b * 0.15, 1);
      guideRing.position.set(tx, 0.2, tz); guideRing.scale.setScalar(1 + Math.sin(tAll * 5) * 0.12); guideRing.material.opacity = g.wait ? 0.25 : 0.55;
    } else arrow.visible = guideRing.visible = false;
    for (const k in marks) marks[k].material.opacity = g && g.what === k ? 0.0 : 0.28;
    // glint
    if (glintState.on || glintState.out > 0) {
      glintState.t += dt; glintState.out = glintState.on ? Math.min(1, glintState.out + dt * 4) : Math.max(0, glintState.out - dt * 5);
      surf(glintState.lon, glintState.lat, cutAt(glintState.lon, glintState.lat) * cfg.mining.maxD - 0.25, glintPos);
      tmp.copy(glintPos).sub(meteor.position).normalize(); glintPos.addScaledVector(tmp, 0.4);
      glint.visible = true; glint.position.copy(glintPos); glint.quaternion.copy(camera.quaternion);
      const s = 0.85 + Math.sin(glintState.t * 7) * 0.12 + (glintState.on ? 0 : (1 - glintState.out) * 0.8); glint.scale.setScalar(s * (0.6 + glintState.out * 0.4));
      glintMat.uniforms.t.value = glintState.t; glintMat.uniforms.a.value = glintState.out;
      if (glintState.on && Math.random() < dt * 8) twinkle(glintPos, 1, 0xfff0c0, 0.3);
    } else glint.visible = false;
    // meteor: crystal pulse, the flash after a hit fades
    meteorU.uPulse.value = Math.sin(tAll * 1.6) * 0.5 + 0.5; meteorU.uFlash.value.w = Math.max(0, meteorU.uFlash.value.w - dt * 3);
    meteorU.uGlow.value = meteorK;
    crystalLight.intensity = (0.8 + meteorK * 1.2) * (1 + meteorU.uFlash.value.w * 0.8);
    // world: windmill, bunting sway, tumbleweeds, clouds, ambient motes by the meteor
    blades.rotation.z += dt * 1.4;
    bunting.forEach((b, i) => { b.rotation.x = Math.sin(tAll * 1.3 + i) * 0.015; });
    for (const w of weeds) {
      w.t += dt; const period = 16, k = (w.t % period) / period, x = w.dir * lerp(-22, 22, k);
      w.m.position.set(x, 0.38 + Math.abs(Math.sin(w.t * 3)) * 0.35, w.z + Math.sin(w.t * 0.7) * 0.8); w.m.rotation.z = -w.dir * w.t * 3.2; w.m.rotation.y = w.t * 0.5;
    }
    cloudList.forEach((c, i) => { c.x += c.v * dt; if (c.x > 60) c.x = -60; clouds.setMatrixAt(i, _m.compose(_p.set(c.x, c.y, c.z), _q.identity(), _s.set(c.s * 1.4, c.s * 0.8, c.s))); });
    clouds.instanceMatrix.needsUpdate = true;
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
    // the frame stays on the town square and leans toward the hero (kids keep their bearings; nothing pops off screen)
    const lead = cfg.camera.lead, tx = h.x * 0.25 + h.vx * 0.04 * lead, tz = Math.max(cfg.camera.zMin, Math.min(6.0, lerp(cfg.camera.zMid, h.z, cfg.camera.lean) + h.vz * 0.08 * lead));
    const kf = Math.min(1, dt * cfg.camera.follow); cam.x += (tx - cam.x) * kf; cam.z += (tz - cam.z) * kf;
    cam.trauma = Math.max(0, cam.trauma - dt * 1.6); cam.kick = Math.max(0, cam.kick - dt * 3);
    const dist = camDist(), pitch = cfg.camera.pitch, yaw = cfg.camera.yaw;
    camLook.set(cam.x, 0, cam.z);
    let dd = dist, look = camLook;
    if (cam.show) {
      cam.showK = Math.min(1, cam.showK + dt / 0.6); cam.show.t -= dt; if (cam.show.t <= 0) cam.show = null;
    } else cam.showK = Math.max(0, cam.showK - dt / 0.7);
    if (cam.showK > 0 && (cam.show || cam.last)) { const sh = cam.show || cam.last; cam.last = sh; const k = ease(cam.showK); look = tmp.copy(camLook).lerp(sh.p, k); dd = lerp(dist, dist * sh.zoom, k); }
    camBase.set(look.x + Math.sin(yaw) * Math.cos(pitch) * dd, look.y + Math.sin(pitch) * dd, look.z + Math.cos(yaw) * Math.cos(pitch) * dd);
    const sh = cam.trauma * cam.trauma * 0.35;
    camera.position.set(camBase.x + (Math.random() - 0.5) * sh, camBase.y + (Math.random() - 0.5) * sh, camBase.z + (Math.random() - 0.5) * sh);
    camera.lookAt(look);
    const fov = cfg.camera.fov * (1 - cam.kick * 0.04); if (Math.abs(camera.fov - fov) > 1e-3) { camera.fov = fov; camera.updateProjectionMatrix(); }
    sky.position.copy(camera.position);
  }

  const proj = new THREE.Vector3();
  /** Screen position (0..1) of a world point. */
  function toScreen(x, y, z) { proj.set(x, y, z).project(camera); return [(proj.x + 1) / 2, (1 - proj.y) / 2, proj.z]; }

  return {
    renderer, scene, camera, setTier, setScale, resize, setTod, update, render: draw, toScreen, slot, fly, burst, puff, confetti, twinkle, ring,
    get tier() { return tier; }, get post() { return !!post; }, get tod() { return tod; },
    /** Hand-mining hit at lon/lat: carve, flash, burst; returns the world point of the hit. */
    hit(lon, lat, big = false) {
      const r = big ? cfg.glint.carveR : cfg.mining.carveR, d = big ? cfg.glint.carveD : cfg.mining.carveD;
      carve(lon, lat, r, d); const p = surf(lon, lat, cutAt(lon, lat) * cfg.mining.maxD * 0.8, new THREE.Vector3());
      meteorU.uFlash.value.set(p.x - meteor.position.x, p.y - meteor.position.y, p.z - meteor.position.z, big ? 2.2 : 1.0);
      burst(p, big ? 2.2 : 1, big ? 18 : 5);
      const n = p.clone().sub(meteor.position).normalize();
      ring(p.clone().addScaledVector(n, 0.1), big ? 0xffd6f6 : 0xffe0b0, 0.2, big ? 3.0 : 1.4, big ? 0.55 : 0.35, n);
      if (big) { ring(p.clone().addScaledVector(n, 0.12), 0x9ae8ff, 0.1, 2.2, 0.75, n); cam.trauma = Math.min(1, cam.trauma + 0.55); cam.kick = 1; }
      else cam.trauma = Math.min(1, cam.trauma + 0.12);
      return p;
    },
    /** The drill rig strikes: plunge, carve near its lon, spray. Returns the hit point. */
    rigHit() { fx.rigPlunge = 1; const lon = rigLon + (Math.random() - 0.5) * 0.25, lat = rigLat + Math.random() * 0.25; carve(lon, lat, cfg.rig.carveR, cfg.rig.carveD); const p = surf(lon, lat, cutAt(lon, lat) * cfg.mining.maxD * 0.8, new THREE.Vector3()); burst(p, 0.8, 4); return p; },
    surf: (lon, lat, d = 0) => surf(lon, lat, d, new THREE.Vector3()),
    glintOn(lon, lat) { Object.assign(glintState, { on: true, lon, lat, t: 0 }); },
    glintOff() { glintState.on = false; },
    get glint() { return glintState.on ? glintPos : null; },
    bump,
    padPay() { fx.padPulse = 1; },
    unlockRig() { rig.visible = true; rig.scale.setScalar(0.01); fx.rigUp = 0; const p = new THREE.Vector3(W.rigAt.x, 1.5, W.rigAt.z); confetti(p, 90, 4); ring(new THREE.Vector3(W.rigAt.x, 0.25, W.rigAt.z), 0xffd35a, 0.5, 6, 0.7); puff(W.rigAt.x, W.rigAt.z, 14, 1.2); cam.trauma = Math.min(1, cam.trauma + 0.4); },
    eggDrop() { eggState.mode = 'fall'; eggState.t = 0; eggState.from.copy(egg.position); burst(egg.position, 1.2, 8); },
    hatchStart() { if (eggState.mode === 'fall') eggState.queued = true; else { eggState.mode = 'hatch'; eggState.t = 0; } }, // the hero can reach the spot before the egg lands
    hatch() { eggState.mode = 'done'; const p = new THREE.Vector3(W.egg.x, 0.8, W.egg.z); confetti(p, 110, 3.5); burst(p, 1.8, 14); ring(new THREE.Vector3(W.egg.x, 0.25, W.egg.z), 0xffc8f0, 0.4, 5, 0.7); cam.trauma = Math.min(1, cam.trauma + 0.3); },
    /** Camera showcase: ease toward world point p and zoom (fraction of the normal distance) for sec seconds. */
    showcase(p, zoom, sec) { cam.show = { p: p.clone(), zoom, t: sec }; cam.last = cam.show; },
    cheer(id) { fx.crowdCheer = 1.2; const p = tourists.find((o) => o.id === id); if (p) p.cheer = 0.9; },
    shake(a) { cam.trauma = Math.min(1, cam.trauma + a); },
    /** Snaps the camera to its follow target (no easing): for the first frame and screenshots. */
    snap(S) { cam.x = S.hero.x * 0.25; cam.z = Math.max(cfg.camera.zMin, Math.min(6, lerp(cfg.camera.zMid, S.hero.z, cfg.camera.lean))); },
    /** Live GPU textures (fix B check) and draw calls of the last frame. */
    stats() { return { textures: renderer.info.memory.textures, geometries: renderer.info.memory.geometries, calls: renderer.info.render.calls, tris: renderer.info.render.triangles }; },
    prewarm() { try { renderer.compile(scene, camera); } catch (e) { /* drivers without compile build shaders on first draw */ } },
    dispose() {
      for (const o of keep) if (o && o.dispose) o.dispose();
      postFree(); scene.traverse((o) => { if (o.isInstancedMesh) o.dispose(); if (o.isMesh && o.geometry) o.geometry.dispose(); });
      renderer.dispose(); renderer.forceContextLoss();
    },
  };
}
