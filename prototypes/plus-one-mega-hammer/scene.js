// PROTOTYPE - NOT FOR PRODUCTION
// The 3D look of +1 Mega Hammer (Three.js r187, global THREE): a floating toy-market island over a cloud sea,
// breakables drawn as one InstancedMesh per kind, number labels, the hammer, and pooled effects (debris, dust,
// shockwave rings, ground marks, magnet gems), contact shadows under each object, and on the high tiers a glow
// (bloom) pass with a warm colour grade. Logic state comes from logic.js; this file only draws it.
/* global THREE */
import { PAL, buildKind, buildTree, buildBush, buildLamp, buildCloud, buildHammer, DEBRIS, rbox, paint, merge } from './models.js';

function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}

/**
 * Builds the scene on canvas. cfg is the game config, random a seeded rng for decoration placement.
 * Returns the API game.js drives: setObjects, hide, bonk, open, slam fx, camera, render.
 */
export function createScene(canvas, cfg, random) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 0.92;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.info.autoReset = false; // draw() resets once per frame, so the counts include every pass
  const scene = new THREE.Scene();
  const keep = [];
  const K = (o) => { keep.push(o); return o; };

  // ---- sky: indigo overhead fading to a warm peach horizon, matching fog for depth
  const skyStops = (g, w, h, c) => { const gr = g.createLinearGradient(0, 0, 0, h); [0, 0.45, 0.75, 1].forEach((t, i) => gr.addColorStop(t, c[i])); g.fillStyle = gr; g.fillRect(0, 0, w, h); };
  scene.background = K(canvasTex(4, 256, (g, w, h) => skyStops(g, w, h, ['#2b2d5b', '#7e6aa8', '#e9a98a', '#f4d6b8'])));
  scene.fog = new THREE.Fog(0xe8b9a0, 26, 70);

  const camera = new THREE.PerspectiveCamera(cfg.camera.fov, 9 / 16, 0.5, 120);
  const hemi = new THREE.HemisphereLight(0xfff3dc, 0x3b5e4d, 1.15);
  const sun = new THREE.DirectionalLight(0xffe2b8, 2.1);
  sun.castShadow = true; sun.shadow.bias = -0.0008; sun.shadow.normalBias = 0.03;
  const rim = new THREE.DirectionalLight(0xa9b4ff, 0.55);
  rim.position.set(-6, 5, -14);
  scene.add(hemi, sun, sun.target, rim);

  const mat = K(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55, metalness: 0.02 }));

  // ---- the island: a rounded slab with grass on top and layered earth cliffs, plus cobble plazas per zone
  const grassTex = K(canvasTex(256, 256, (g, s) => {
    g.fillStyle = '#6dbb5a'; g.fillRect(0, 0, s, s);
    for (let i = 0; i < 900; i++) { const x = random() * s, y = random() * s; g.strokeStyle = random() < 0.5 ? 'rgba(78,154,72,0.55)' : 'rgba(150,205,110,0.5)'; g.lineWidth = 2; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (random() - 0.5) * 4, y - 6); g.stroke(); }
  }));
  grassTex.wrapS = grassTex.wrapT = THREE.RepeatWrapping; grassTex.repeat.set(6, 12);
  const first = cfg.zones[0], lastZ = cfg.zones[cfg.zones.length - 1];
  const isl = { w: Math.max(...cfg.zones.map((Z) => Z.w)) + 9, z0: first.z + first.d / 2 + 5, z1: lastZ.z - lastZ.d / 2 - 6 };
  const shape = new THREE.Shape(), r = 4, hw = isl.w / 2;
  shape.moveTo(-hw + r, isl.z1); shape.lineTo(hw - r, isl.z1); shape.quadraticCurveTo(hw, isl.z1, hw, isl.z1 + r);
  shape.lineTo(hw, isl.z0 - r); shape.quadraticCurveTo(hw, isl.z0, hw - r, isl.z0); shape.lineTo(-hw + r, isl.z0);
  shape.quadraticCurveTo(-hw, isl.z0, -hw, isl.z0 - r); shape.lineTo(-hw, isl.z1 + r); shape.quadraticCurveTo(-hw, isl.z1, -hw + r, isl.z1);
  const topGeo = K(new THREE.ShapeGeometry(shape, 12));
  topGeo.rotateX(Math.PI / 2);
  // rotating the shape up the +z axis leaves its faces looking down: turn them to face the sky (winding and normals)
  { const ix = topGeo.index.array, n = topGeo.attributes.normal; for (let i = 0; i < ix.length; i += 3) { const t = ix[i + 1]; ix[i + 1] = ix[i + 2]; ix[i + 2] = t; } for (let i = 0; i < n.count; i++) n.setXYZ(i, 0, 1, 0); }
  { const uv = topGeo.attributes.uv, p = topGeo.attributes.position; for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / isl.w + 0.5, p.getZ(i) / (isl.z0 - isl.z1)); }
  // the other worlds' ground: candy floss mint with sprinkles, and snow with blue glints
  const candyTex = K(canvasTex(256, 256, (g, s) => {
    g.fillStyle = '#a8ecd0'; g.fillRect(0, 0, s, s);
    for (let i = 0; i < 260; i++) { g.fillStyle = ['#ff8fb8', '#fff4f8', '#ffd84a', '#4cb8ff', '#b98cff'][i % 5]; g.save(); g.translate(random() * s, random() * s); g.rotate(random() * 3.14); g.fillRect(-4, -1.5, 8, 3); g.restore(); }
  }));
  const snowTex = K(canvasTex(256, 256, (g, s) => {
    g.fillStyle = '#eef4fb'; g.fillRect(0, 0, s, s);
    for (let i = 0; i < 500; i++) { g.fillStyle = random() < 0.6 ? 'rgba(170,195,225,0.35)' : 'rgba(255,255,255,0.9)'; g.beginPath(); g.arc(random() * s, random() * s, 1 + random() * 3, 0, 6.3); g.fill(); }
  }));
  for (const t of [candyTex, snowTex]) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(6, 12); }
  const groundTex = { grass: grassTex, candy: candyTex, snow: snowTex };
  const ground = new THREE.Mesh(topGeo, K(new THREE.MeshStandardMaterial({ map: grassTex, roughness: 0.9 })));
  ground.receiveShadow = true; scene.add(ground);
  const cliffGeo = new THREE.ExtrudeGeometry(shape, { depth: 3.2, bevelEnabled: true, bevelThickness: 0.6, bevelSize: 0.5, bevelSegments: 3, curveSegments: 12 });
  cliffGeo.rotateX(Math.PI / 2); cliffGeo.translate(0, -0.66, 0); // the bevel rises 0.6 above the extrude face: keep it under the grass
  const cliff = new THREE.Mesh(K(paint(cliffGeo, (x, y) => new THREE.Color(Math.floor(-y * 2.2) % 2 ? PAL.earth : PAL.earthDark).lerp(new THREE.Color(PAL.grassDark), y > -1.0 ? 0.8 : 0))), mat);
  cliff.geometry.computeVertexNormals(); scene.add(cliff);
  // ---- plaza grounds: one texture per look (tile size in world units), chosen per zone and per world
  const speck = (g, s, n, cols, r0, r1) => { for (let i = 0; i < n; i++) { g.fillStyle = cols[i % cols.length]; g.beginPath(); g.arc(random() * s, random() * s, r0 + random() * (r1 - r0), 0, 6.3); g.fill(); } };
  const PT = {
    cobble: [1.6, (g, s) => {
      g.fillStyle = '#b9a58c'; g.fillRect(0, 0, s, s);
      for (let y = 0; y < s; y += 22) for (let x = (y / 22) % 2 ? 11 : 0; x < s; x += 22) { g.fillStyle = ['#e6d3b3', '#d8c19c', '#cdb892'][Math.floor(random() * 3)]; g.beginPath(); g.ellipse(x + 11, y + 11, 9.5, 8.5, 0, 0, Math.PI * 2); g.fill(); }
    }],
    boards: [2.2, (g, s) => {
      for (let y = 0; y < s; y += 32) { g.fillStyle = ['#c98a52', '#b97a45', '#d89a60'][(y / 32) % 3]; g.fillRect(0, y, s, 32); g.fillStyle = 'rgba(110,70,40,.55)'; g.fillRect(0, y, s, 3); const cut = ((y / 32) * 97) % s; g.fillRect(cut, y, 3, 32); g.fillStyle = 'rgba(255,230,190,.18)'; for (let x = 0; x < s; x += 9) g.fillRect(x, y + 8 + (x % 3) * 6, 6, 1.5); g.fillStyle = '#7a5232'; g.fillRect(cut - 8, y + 8, 3, 3); g.fillRect(cut + 8, y + 20, 3, 3); }
    }],
    asphalt: [4.2, (g, s) => {
      g.fillStyle = '#5d6275'; g.fillRect(0, 0, s, s); speck(g, s, 700, ['rgba(40,44,60,.35)', 'rgba(150,155,175,.3)'], 0.6, 1.8);
      g.fillStyle = '#f4ede2'; for (let x = 8; x < s; x += 64) g.fillRect(x, s / 2 - 4, 36, 8);
    }],
    park: [3, (g, s) => {
      g.fillStyle = '#7cc463'; g.fillRect(0, 0, s, s); speck(g, s, 400, ['rgba(80,150,70,.5)', 'rgba(160,215,120,.5)'], 1, 2.5);
      for (let i = 0; i < 7; i++) { const x = (i * 71 + 20) % s, y = (i * 113 + 40) % s; g.fillStyle = '#d8cdb4'; g.beginPath(); g.ellipse(x, y, 16, 12, i, 0, 6.3); g.fill(); g.fillStyle = 'rgba(120,100,70,.25)'; g.beginPath(); g.ellipse(x + 2, y + 3, 14, 9, i, 0, 6.3); g.fill(); }
      g.fillStyle = '#f4ede2'; speck(g, s, 30, ['#ffffff', '#ffd84a', '#ff8fb8'], 1.5, 2.5);
    }],
    slabs: [2.6, (g, s) => {
      for (let y = 0; y < s; y += 64) for (let x = 0; x < s; x += 64) { g.fillStyle = ['#c9c6c0', '#bdbab3', '#d3d0c9'][Math.floor(random() * 3)]; g.fillRect(x, y, 64, 64); }
      g.fillStyle = 'rgba(80,80,90,.45)'; for (let k = 0; k <= s; k += 64) { g.fillRect(k - 1.5, 0, 3, s); g.fillRect(0, k - 1.5, s, 3); } speck(g, s, 250, ['rgba(90,90,100,.25)'], 0.6, 1.4);
    }],
    icing: [3, (g, s) => {
      g.fillStyle = '#ffd3e6'; g.fillRect(0, 0, s, s); speck(g, s, 120, ['rgba(255,255,255,.45)'], 6, 14);
      for (let i = 0; i < 160; i++) { g.fillStyle = ['#ff6f9c', '#fff4f8', '#ffd84a', '#4cb8ff', '#5fd38a'][i % 5]; g.save(); g.translate(random() * s, random() * s); g.rotate(random() * 3.14); g.fillRect(-4, -1.5, 8, 3); g.restore(); }
    }],
    sand: [3, (g, s) => {
      g.fillStyle = '#f3dba6'; g.fillRect(0, 0, s, s); g.strokeStyle = 'rgba(200,160,100,.35)'; g.lineWidth = 2;
      for (let y = 10; y < s; y += 22) { g.beginPath(); for (let x = 0; x <= s; x += 8) g.lineTo(x, y + Math.sin(x / 20 + y) * 4); g.stroke(); }
      speck(g, s, 40, ['#ffffff', '#ffb7a1', '#c9a66a'], 1.5, 3);
    }],
    snowpave: [2.6, (g, s) => {
      g.fillStyle = '#e9f2fb'; g.fillRect(0, 0, s, s); g.fillStyle = 'rgba(150,180,215,.45)';
      for (let k = 0; k <= s; k += 64) { g.fillRect(k - 1, 0, 2, s); g.fillRect(0, k - 1, s, 2); } speck(g, s, 300, ['rgba(255,255,255,.95)', 'rgba(170,200,235,.4)'], 0.8, 2.6);
    }],
  };
  const ptex = {};
  for (const [name, [tile, draw]] of Object.entries(PT)) { const t = K(canvasTex(256, 256, draw)); t.wrapS = t.wrapT = THREE.RepeatWrapping; ptex[name] = { t, tile }; }
  const plazas = [];
  /** The plaza of zone i with ground look name (a texture clone per zone, so each keeps its own repeat). */
  function plazaLook(i, name) {
    const P = plazas[i], Z = cfg.zones[i], L = ptex[name] || ptex.cobble;
    if (P.userData.look === name) return; P.userData.look = name;
    const t = P.userData.cache[name] || (P.userData.cache[name] = K(L.t.clone()));
    t.repeat.set((Z.w + 1.4) / L.tile, (Z.d + 1.4) / L.tile); t.needsUpdate = true; P.material.map = t; P.material.needsUpdate = true;
  }
  for (const Z of cfg.zones) {
    const g = K(new THREE.PlaneGeometry(Z.w + 1.4, Z.d + 1.4));
    const plaza = new THREE.Mesh(g, K(new THREE.MeshStandardMaterial({ roughness: 0.85 })));
    plaza.rotation.x = -Math.PI / 2; plaza.position.set(0, 0.01, Z.z); plaza.receiveShadow = true; plaza.userData.cache = {}; scene.add(plaza); plazas.push(plaza);
    plazaLook(plazas.length - 1, Z.tex);
  }
  // zebra crossings at both ends of the toy street (only where the street look is on)
  const zebra = new THREE.Group(); scene.add(zebra);
  { const si = cfg.zones.findIndex((Z) => Z.tex === 'asphalt'); if (si >= 0) { const Z = cfg.zones[si], zm = K(new THREE.MeshStandardMaterial({ color: 0xf4ede2, roughness: 0.8, polygonOffset: true, polygonOffsetFactor: -1 })), zg = K(new THREE.PlaneGeometry(0.42, 1.5).rotateX(-Math.PI / 2));
    for (const sz of [-1, 1]) for (let k = -3; k <= 3; k++) { const m = new THREE.Mesh(zg, zm); m.position.set(k * 0.85, 0.015, Z.z + sz * (Z.d / 2 - 0.2)); m.receiveShadow = true; zebra.add(m); } zebra.userData.zone = si; } }

  // ---- decoration: trees, bushes and lamps around the plazas, one InstancedMesh per kind and band of the island, so
  // the bands out of view (and out of the sun's shadow box) are culled whole
  const inPlaza = (x, z, m) => cfg.zones.some((Z) => Math.abs(x) < Z.w / 2 + 0.7 + m && Math.abs(z - Z.z) < Z.d / 2 + 0.7 + m);
  const decoMat = K(mat.clone()); // trees and bushes: tinted per world (frosted in snow, pink in candy land)
  function scatter(geo, n, margin, scaleMin, scaleMax, shadow, zA, zB) {
    const im = new THREE.InstancedMesh(geo, decoMat, n), m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), s = new THREE.Vector3();
    let placed = 0;
    for (let tries = 0; tries < n * 30 && placed < n; tries++) {
      const x = (random() - 0.5) * (isl.w - 1.4), z = zB + random() * (zA - zB);
      if (inPlaza(x, z, margin)) continue;
      if (shadow && z > cfg.zones[0].z + cfg.zones[0].d / 2 && Math.abs(x) < cfg.zones[0].w / 2 + 2) continue; // keep the view to the first plaza clear
      const k = scaleMin + random() * (scaleMax - scaleMin);
      m.compose(v.set(x, 0, z), q.setFromEuler(e.set(0, random() * 6.28, 0)), s.set(k, k, k)); im.setMatrixAt(placed++, m);
    }
    im.count = placed; im.computeBoundingSphere(); im.castShadow = shadow; im.receiveShadow = true; scene.add(im); return im;
  }
  const area = isl.w * (isl.z0 - isl.z1) / 500; // decoration density stays the same as the island grows
  const treeGeo = [0, 1, 2].map((v) => K(buildTree(v))), bushGeo = K(buildBush()), trees = [];
  const bands = Math.max(1, Math.round((isl.z0 - isl.z1) / 12)), bandD = (isl.z0 - isl.z1 - 1.4) / bands;
  for (let b = 0; b < bands; b++) {
    const zA = isl.z0 - 0.7 - b * bandD, zB = zA - bandD;
    for (const g of treeGeo) trees.push(scatter(g, Math.round(9 * area / bands), 0.6, 0.9, 1.6, true, zA, zB));
    scatter(bushGeo, Math.round(22 * area / bands), 0.1, 0.7, 1.3, false, zA, zB); // low bushes: no shadow pass
  }
  const lamps = new THREE.InstancedMesh(K(buildLamp()), mat, cfg.zones.length * 4);
  { const m = new THREE.Matrix4(); let i = 0; for (const Z of cfg.zones) for (const sx of [-1, 1]) for (const sz of [-1, 1]) lamps.setMatrixAt(i++, m.makeTranslation(sx * (Z.w / 2 + 0.75), 0, Z.z + sz * (Z.d / 2 + 0.75))); }
  lamps.castShadow = true; scene.add(lamps);
  // lamp glow: a warm bulb over each lamp head that lights up as the day turns to dusk (picked up by the glow pass)
  const bulbMat = K(new THREE.MeshStandardMaterial({ color: 0xffd98a, emissive: 0xffc861, emissiveIntensity: 0, roughness: 0.3 }));
  const bulbs = new THREE.InstancedMesh(K(new THREE.SphereGeometry(0.17, 12, 8)), bulbMat, cfg.zones.length * 4);
  { const m = new THREE.Matrix4(); let i = 0; for (const Z of cfg.zones) for (const sx of [-1, 1]) for (const sz of [-1, 1]) bulbs.setMatrixAt(i++, m.makeTranslation(sx * (Z.w / 2 + 0.75), 2.36, Z.z + sz * (Z.d / 2 + 0.75))); }
  scene.add(bulbs);
  // birds that sit around the zone being played and scatter on a heavy hit
  const birdGeo = K(merge([
    paint(new THREE.SphereGeometry(0.1, 8, 6).scale(1, 0.85, 1.4), PAL.alabaster), paint(new THREE.SphereGeometry(0.07, 8, 6).translate(0, 0.07, 0.11), PAL.alabaster),
    paint(new THREE.ConeGeometry(0.03, 0.07, 5).rotateX(Math.PI / 2).translate(0, 0.06, 0.2), PAL.gold),
  ]));
  const wingGeo = new THREE.BufferGeometry().setFromPoints([[0.05, 0.05], [0.32, -0.02], [0.05, -0.1], [-0.05, -0.1], [-0.32, -0.02], [-0.05, 0.05]].map(([x, z]) => new THREE.Vector3(x, 0.04, z)));
  wingGeo.computeVertexNormals(); K(wingGeo);
  const birdMat = K(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7 })), wingMat = K(new THREE.MeshStandardMaterial({ color: 0xdcd6e6, roughness: 0.7, side: THREE.DoubleSide }));
  const NB = cfg.fx.birds, birds = new THREE.InstancedMesh(birdGeo, birdMat, NB), wings = new THREE.InstancedMesh(wingGeo, wingMat, NB);
  for (const m of [birds, wings]) { m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); m.frustumCulled = false; scene.add(m); }
  const B = []; for (let i = 0; i < NB; i++) B.push({ p: new THREE.Vector3(0, -50, 0), v: new THREE.Vector3(), fly: 0, rest: 0, yaw: 0, hop: 0 });
  // bunting between the plaza lamps: triangle flags on a sagging string, swaying
  const bunting = [];
  for (const Z of cfg.zones) for (const sz of [-1]) {
    const flags = [], x0 = -(Z.w / 2 + 0.75), x1 = Z.w / 2 + 0.75, n = Math.round((x1 - x0) / 0.55);
    for (let k = 0; k <= n; k++) {
      const t = k / n, x = x0 + (x1 - x0) * t, y = 2.25 - Math.sin(t * Math.PI) * 0.45;
      const tri = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-0.17, 0, 0), new THREE.Vector3(0.17, 0, 0), new THREE.Vector3(0, -0.36, 0)]);
      tri.computeVertexNormals();
      flags.push(paint(tri.translate(x, y, Z.z + sz * (Z.d / 2 + 0.75)), [PAL.coral, PAL.gold, PAL.jade, PAL.amethyst][k % 4]));
    }
    const mesh = new THREE.Mesh(K(merge(flags)), K(new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide, roughness: 0.7 })));
    scene.add(mesh); bunting.push(mesh);
  }
  // clouds drifting below and around the island
  const cloudGeo = K(buildCloud()), clouds = [];
  for (let i = 0; i < 12; i++) {
    const c = new THREE.Mesh(cloudGeo, mat), side = i % 2 ? 1 : -1;
    c.position.set(side * (11 + random() * 10), -3 - random() * 6, 8 - random() * 36); const k = 1.2 + random() * 1.6; c.scale.set(k * 1.4, k, k);
    scene.add(c); clouds.push({ m: c, v: 0.25 + random() * 0.35 });
  }

  // ---- breakables: one InstancedMesh per kind, an entry per logic object
  const kinds = {}, byId = [];
  for (const [name, k] of Object.entries(cfg.kinds)) kinds[name] = { geo: K(buildKind(name, k.r)), mesh: null, list: [] };
  const tmpM = new THREE.Matrix4(), tmpQ = new THREE.Quaternion(), tmpE = new THREE.Euler(), tmpV = new THREE.Vector3(), tmpS = new THREE.Vector3();
  const labelTex = new Map();
  function labelTexture(text, ok) {
    const key = text + ok;
    if (labelTex.has(key)) return labelTex.get(key);
    // far targets: a small padlock badge instead of a number, so the screen shows only the next goals
    const t = ok === 'lock' ? canvasTex(80, 80, (g, w) => {
      g.fillStyle = '#3a3d75'; g.strokeStyle = '#23263a'; g.lineWidth = 6; g.beginPath(); g.arc(w / 2, w / 2, w / 2 - 4, 0, 6.3); g.fill(); g.stroke();
      g.strokeStyle = '#f4ede2'; g.lineWidth = 6; g.beginPath(); g.arc(w / 2, 34, 11, Math.PI, 0); g.stroke();
      g.fillStyle = '#f2c96a'; g.beginPath(); g.roundRect(22, 34, 36, 26, 6); g.fill(); g.fillStyle = '#23263a'; g.fillRect(38, 42, 4, 10);
    }) : canvasTex(160, 80, (g, w, h) => {
      g.fillStyle = ok ? '#1f9d74' : '#c8463d'; g.strokeStyle = '#23263a'; g.lineWidth = 7;
      g.beginPath(); g.roundRect(5, 5, w - 10, h - 10, 34); g.fill(); g.stroke();
      g.fillStyle = 'rgba(255,255,255,0.25)'; g.beginPath(); g.roundRect(14, 11, w - 28, 18, 9); g.fill();
      g.font = '800 46px "Baloo 2", system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#f4ede2';
      g.fillText(text, w / 2, h / 2 + 3);
    });
    labelTex.set(key, K(t)); return t;
  }
  const labels = new THREE.Group(); scene.add(labels);
  // contact shadows: a soft dark disc under every breakable, so objects sit on the plaza (cheap stand-in for AO)
  const blobTex = K(canvasTex(64, 64, (g, s) => { const gr = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2); gr.addColorStop(0, 'rgba(40,28,40,0.55)'); gr.addColorStop(0.55, 'rgba(40,28,40,0.3)'); gr.addColorStop(1, 'rgba(40,28,40,0)'); g.fillStyle = gr; g.fillRect(0, 0, s, s); }));
  const blobGeo = K(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2));
  const blobMat = K(new THREE.MeshBasicMaterial({ map: blobTex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1 }));
  let blobs = null;

  /** Places the run's objects; L is the current hammer size (for label colours). */
  function setObjects(objects, L) {
    for (const k of Object.values(kinds)) { if (k.mesh) { scene.remove(k.mesh); k.mesh.dispose(); } k.list = []; }
    for (const l of [...labels.children]) { labels.remove(l); l.material.dispose(); }
    byId.length = 0;
    for (const o of objects) kinds[o.kind].list.push(o);
    if (blobs) { scene.remove(blobs); blobs.dispose(); }
    blobs = new THREE.InstancedMesh(blobGeo, blobMat, objects.length); blobs.renderOrder = 1; blobs.instanceMatrix.setUsage(THREE.DynamicDrawUsage); scene.add(blobs);
    for (const k of Object.values(kinds)) {
      if (!k.list.length) continue;
      k.mesh = new THREE.InstancedMesh(k.geo, mat, k.list.length); k.mesh.castShadow = true; k.mesh.receiveShadow = true;
      k.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); scene.add(k.mesh);
      k.list.forEach((o, i) => { byId[o.id] = { o, k, i, rot: random() * 6.28, squash: 0, pop: 0, label: null, hidden: !o.alive, grow: 1 }; });
    }
    for (const e of byId) if (e && e.o.req > 1) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: labelTexture(String(e.o.req), true), depthTest: false, transparent: true }));
      s.renderOrder = 10; const h = cfg.kinds[e.o.kind].r * (cfg.kinds[e.o.kind].lh || (e.o.boss ? 1.75 : 2.1)) + 0.35; s.position.set(e.o.x, h, e.o.z); s.scale.set(0.9, 0.45, 1); s.userData.h = h;
      labels.add(s); e.label = s; relabel(e.o.id, L);
    }
    updateObjects(0, 0);
  }
  /** The label shows the size needed; a boss within reach shows the hits it has left instead. */
  function relabel(id, L) {
    const e = byId[id]; if (!e || !e.label) return;
    // breakable now: green; within cfg.labels.ahead x the size: red with the number; further: a padlock
    e.lab = e.o.req <= L ? 'ok' : e.o.req <= L * cfg.labels.ahead || e.o.boss ? 'near' : 'lock';
    if (e.lab === 'lock') { setMap(e.label.material, labelTexture('', 'lock')); return; }
    const ok = e.o.req <= L, text = e.o.boss && ok ? '\u00d7' + e.o.hp : String(e.o.req);
    setMap(e.label.material, labelTexture(text, ok));
  }
  /** Swaps a label's texture; only a material that had no map yet needs its shader rebuilt (every slam relabels all). */
  function setMap(m, t) { if (m.map === t) return; const had = !!m.map; m.map = t; if (!had) m.needsUpdate = true; }
  let clock = 0, labelK = 1;
  function updateObjects(dt, zone) {
    for (const k of Object.values(kinds)) k.shown = 0;
    for (const e of byId) {
      if (!e) continue;
      if (!e.hidden) e.k.shown++;
      if (e.hidden) { tmpM.makeScale(0, 0, 0); e.k.mesh.setMatrixAt(e.i, tmpM); blobs.setMatrixAt(e.o.id, tmpM); if (e.label) e.label.visible = false; continue; }
      e.squash = Math.max(0, e.squash - dt * 4); e.pop = Math.max(0, e.pop - dt * 2.2); e.grow = Math.min(1, e.grow + dt * 3);
      const live = e.o.zone === zone, sq = Math.sin(e.squash * 18) * e.squash * 0.25, idle = live ? Math.sin(clock * 3 + e.o.id) * 0.02 : 0;
      const pop = Math.sin(e.pop * Math.PI) * 0.2;
      const gr = e.grow < 1 ? 1 - Math.pow(1 - e.grow, 3) * Math.cos(e.grow * 7) : 1; // pop-in with a little overshoot
      tmpS.set((1 + sq + pop) * gr, (1 - sq + idle + pop) * gr, (1 + sq + pop) * gr);
      tmpM.compose(tmpV.set(e.o.x, 0, e.o.z), tmpQ.setFromEuler(tmpE.set(0, e.rot, 0)), tmpS); e.k.mesh.setMatrixAt(e.i, tmpM);
      const br = cfg.kinds[e.o.kind].r * cfg.look.contact * gr * (1 + sq); tmpM.makeScale(br, 1, br).setPosition(e.o.x, 0.025, e.o.z); blobs.setMatrixAt(e.o.id, tmpM);
      if (e.label) { e.label.visible = live; e.label.position.y = e.label.userData.h + Math.sin(clock * 2.5 + e.o.id) * 0.06; const ls = (1 + pop * 1.5 + Math.abs(sq) * 2 + (e.lab === 'ok' && !e.o.boss ? Math.sin(clock * 6 + e.o.id) * 0.07 : 0)) * labelK * (e.o.boss ? 1.8 : 1); if (e.lab === 'lock') e.label.scale.set(0.38 * ls, 0.38 * ls, 1); else e.label.scale.set(0.9 * ls, 0.45 * ls, 1); }
    }
    // a kind with nothing left standing is not drawn at all (zones already played)
    for (const k of Object.values(kinds)) if (k.mesh) { k.mesh.visible = k.shown > 0; k.mesh.instanceMatrix.needsUpdate = true; }
    blobs.instanceMatrix.needsUpdate = true;
  }

  // ---- the hammer
  const H = buildHammer(); scene.add(H.root); keep.push(...H.mats, H);

  // ---- pooled effects
  const chunkGeo = K(paint(rbox(0.16, 0.16, 0.16, 0.04, 1), 0xffffff));
  const debris = new THREE.InstancedMesh(chunkGeo, K(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6 })), cfg.fx.debrisMax);
  debris.instanceMatrix.setUsage(THREE.DynamicDrawUsage); debris.castShadow = false; debris.frustumCulled = false; scene.add(debris);
  const D = []; for (let i = 0; i < cfg.fx.debrisMax; i++) { D.push({ life: 0, p: new THREE.Vector3(), v: new THREE.Vector3(), r: new THREE.Euler(), w: new THREE.Vector3(), s: 1 }); debris.setColorAt(i, new THREE.Color(PAL.wood)); }
  let dNext = 0;
  const puffTex = K(canvasTex(64, 64, (g, s) => { const gr = g.createRadialGradient(s / 2, s / 2, 2, s / 2, s / 2, s / 2); gr.addColorStop(0, 'rgba(244,237,226,0.9)'); gr.addColorStop(0.6, 'rgba(230,215,195,0.45)'); gr.addColorStop(1, 'rgba(230,215,195,0)'); g.fillStyle = gr; g.fillRect(0, 0, s, s); }));
  const dust = new THREE.InstancedMesh(K(new THREE.PlaneGeometry(1, 1)), K(new THREE.MeshBasicMaterial({ map: puffTex, transparent: true, depthWrite: false, fog: true })), cfg.fx.dustMax);
  dust.instanceMatrix.setUsage(THREE.DynamicDrawUsage); dust.frustumCulled = false; dust.renderOrder = 5; scene.add(dust);
  const P = []; for (let i = 0; i < cfg.fx.dustMax; i++) P.push({ life: 0, max: 1, p: new THREE.Vector3(), v: new THREE.Vector3(), s: 1 });
  let pNext = 0;
  const ringTex = K(canvasTex(128, 128, (g, s) => { const gr = g.createRadialGradient(s / 2, s / 2, s * 0.3, s / 2, s / 2, s / 2); gr.addColorStop(0, 'rgba(255,236,190,0)'); gr.addColorStop(0.75, 'rgba(255,236,190,0.85)'); gr.addColorStop(1, 'rgba(255,236,190,0)'); g.fillStyle = gr; g.fillRect(0, 0, s, s); }));
  const rings = []; for (let i = 0; i < 5; i++) { const m = new THREE.Mesh(K(new THREE.PlaneGeometry(1, 1)), K(new THREE.MeshBasicMaterial({ map: ringTex, transparent: true, depthWrite: false, opacity: 0 }))); m.rotation.x = -Math.PI / 2; m.visible = false; m.renderOrder = 4; scene.add(m); rings.push({ m, life: 0, max: 0.45, size: 1 }); }
  let rNext = 0;
  const markTex = K(canvasTex(128, 128, (g, s) => {
    g.strokeStyle = 'rgba(60,40,30,0.55)'; g.lineWidth = 4; g.lineCap = 'round';
    for (let k = 0; k < 9; k++) { let a = k / 9 * 6.28 + 0.2, x = s / 2, y = s / 2; g.beginPath(); g.moveTo(x, y); for (let j = 0; j < 4; j++) { a += (j % 2 ? 0.35 : -0.3); x += Math.cos(a) * 14; y += Math.sin(a) * 14; g.lineTo(x, y); } g.stroke(); }
    const gr = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s * 0.3); gr.addColorStop(0, 'rgba(70,45,30,0.45)'); gr.addColorStop(1, 'rgba(70,45,30,0)'); g.fillStyle = gr; g.fillRect(0, 0, s, s);
  }));
  const marks = []; for (let i = 0; i < 8; i++) { const m = new THREE.Mesh(K(new THREE.PlaneGeometry(1, 1)), K(new THREE.MeshBasicMaterial({ map: markTex, transparent: true, depthWrite: false, opacity: 0, polygonOffset: true, polygonOffsetFactor: -2 }))); m.rotation.x = -Math.PI / 2; m.visible = false; m.renderOrder = 2; scene.add(m); marks.push({ m, life: 0 }); }
  let mNext = 0;
  const tmpC = new THREE.Color();
  // magnet gems: faceted jewels that pop out of a broken numbered object, hang a moment, then fly into the hammer
  const GEMC = [0xff5d8f, 0x5fd3ff, 0x7fe0b4, 0xf2c96a, 0xb98cff];
  const gemMat = K(new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: cfg.look.gemGlow, roughness: 0.15, metalness: 0.3 }));
  // the glow takes each gem's own colour (instance colour), not white
  gemMat.onBeforeCompile = (sh) => { sh.fragmentShader = sh.fragmentShader.replace('vec3 totalEmissiveRadiance = emissive;', 'vec3 totalEmissiveRadiance = emissive * vColor.rgb;'); };
  const gemMesh = new THREE.InstancedMesh(K(new THREE.OctahedronGeometry(0.16, 0)), gemMat, cfg.fx.gemsMax);
  gemMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); gemMesh.frustumCulled = false; gemMesh.count = 0; scene.add(gemMesh);
  const G = []; for (let i = 0; i < cfg.fx.gemsMax; i++) { G.push({ life: 0, t: 0, p: new THREE.Vector3(), v: new THREE.Vector3(), s: 1, spin: 0 }); gemMesh.setColorAt(i, tmpC.set(GEMC[i % GEMC.length])); }
  let gNext = 0;
  const headP = new THREE.Vector3();
  /** n gems burst out at (x, z) from height h; they home in on the hammer head after a short hang. */
  function gems(x, z, n, h = 1) {
    for (let k = 0; k < n; k++) {
      const g = G[gNext]; gNext = (gNext + 1) % G.length;
      // size and spread follow the camera's pull-back, so gems read the same at any hammer size
      const k = cam.k, a = random() * 6.28, sp = (3 + random() * 3.5 + Math.min(3, n * 0.06)) * Math.sqrt(k);
      g.life = 1; g.t = 0; g.p.set(x, h, z); g.v.set(Math.cos(a) * sp, (4 + random() * 3) * Math.sqrt(k), Math.sin(a) * sp); g.s = (1.2 + random() * 0.5) * k; g.spin = random() * 6;
    }
  }
  /** Moves the gems; returns how many reached the hammer this frame. */
  function updateGems(dt) {
    H.head.getWorldPosition(headP);
    let got = 0, top = 0;
    const hang = cfg.fx.gemHang;
    for (let i = 0; i < G.length; i++) {
      const g = G[i];
      if (g.life <= 0) { tmpM.makeScale(0, 0, 0); gemMesh.setMatrixAt(i, tmpM); continue; }
      top = i + 1; g.t += dt; g.spin += dt * 9;
      if (g.t < hang) { g.v.y -= 9 * dt; g.v.multiplyScalar(1 - 1.8 * dt); g.p.addScaledVector(g.v, dt); if (g.p.y < 0.2 * g.s) { g.p.y = 0.2 * g.s; g.v.y = Math.abs(g.v.y) * 0.5; } }
      else {
        // magnet: steer towards the head, faster every moment
        const pull = (10 + (g.t - hang) * 60) * Math.sqrt(cam.k); tmpV.subVectors(headP, g.p); const d = tmpV.length();
        if (d < 0.5 + H.root.scale.x * 0.3) { g.life = 0; got++; tmpM.makeScale(0, 0, 0); gemMesh.setMatrixAt(i, tmpM); continue; }
        g.v.lerp(tmpV.multiplyScalar(pull / d), Math.min(1, dt * 8)); g.p.addScaledVector(g.v, dt);
      }
      const s = g.s * Math.min(1, g.t * 6);
      tmpM.compose(g.p, tmpQ.setFromEuler(tmpE.set(g.spin * 0.5, g.spin, 0)), tmpS.set(s, s * 1.3, s)); gemMesh.setMatrixAt(i, tmpM);
    }
    gemMesh.count = top; gemMesh.instanceMatrix.needsUpdate = true; if (gemMesh.instanceColor) gemMesh.instanceColor.needsUpdate = true;
    return got;
  }

  /** Breaks object id into debris and dust; big = bigger burst. */
  function burst(id) {
    const e = byId[id]; if (!e) return;
    e.hidden = true;
    const r = cfg.kinds[e.o.kind].r, n = Math.round(6 + r * 10), [c1, c2] = DEBRIS[e.o.kind];
    for (let k = 0; k < n; k++) {
      const di = dNext, d = D[di]; dNext = (dNext + 1) % D.length;
      const a = random() * 6.28, sp = 2.2 + random() * 3.2 * (0.6 + r);
      d.life = 1.6 + random() * 0.8; d.s = (0.6 + random() * 1.1) * (0.7 + r * 0.8);
      d.p.set(e.o.x + Math.cos(a) * r * 0.5, r * (0.4 + random()), e.o.z + Math.sin(a) * r * 0.5);
      d.v.set(Math.cos(a) * sp, 3.5 + random() * 4.5, Math.sin(a) * sp); d.r.set(random() * 6, random() * 6, 0); d.w.set(random() * 14 - 7, random() * 14 - 7, random() * 14 - 7);
      debris.setColorAt(di, tmpC.set(k % 3 ? c1 : c2));
    }
    debris.instanceColor.needsUpdate = true;
    puff(e.o.x, e.o.z, 3 + Math.round(r * 4), r);
  }
  function chips(e, n) {
    const r = cfg.kinds[e.o.kind].r, [c1, c2] = DEBRIS[e.o.kind];
    for (let k = 0; k < n; k++) {
      const di = dNext, d = D[di]; dNext = (dNext + 1) % D.length; const a = random() * 6.28, sp = 2 + random() * 4;
      d.life = 1.4 + random() * 0.6; d.s = 0.8 + random() * 1.4;
      d.p.set(e.o.x + Math.cos(a) * r * 0.7, r * (0.6 + random() * 0.8), e.o.z + Math.sin(a) * r * 0.7);
      d.v.set(Math.cos(a) * sp, 4 + random() * 5, Math.sin(a) * sp); d.w.set(random() * 14 - 7, random() * 14 - 7, random() * 14 - 7);
      debris.setColorAt(di, tmpC.set(k % 3 ? c1 : c2));
    }
    debris.instanceColor.needsUpdate = true;
  }
  function puff(x, z, n, r) {
    for (let k = 0; k < n; k++) {
      const p = P[pNext]; pNext = (pNext + 1) % P.length; const a = random() * 6.28;
      p.max = p.life = 0.6 + random() * 0.5; p.s = 0.6 + r * 1.4 + random() * 0.5;
      p.p.set(x + Math.cos(a) * r * 0.6, 0.2 + random() * 0.3, z + Math.sin(a) * r * 0.6); p.v.set(Math.cos(a) * (1 + r), 0.6 + random() * 0.6, Math.sin(a) * (1 + r));
    }
  }
  /** Ground impact of a slam at (x, z) with reach R: ring, dust ring and a crack mark. */
  function impact(x, z, R, big) {
    const g = rings[rNext]; rNext = (rNext + 1) % rings.length; g.life = g.max = big ? 0.6 : 0.4; g.size = R * (big ? 5 : 3.4); g.m.position.set(x, 0.04, z); g.m.visible = true;
    const m = marks[mNext]; mNext = (mNext + 1) % marks.length; m.life = 4; m.m.position.set(x, 0.02, z); const ms = R * 2.2; m.m.scale.set(ms, ms, 1); m.m.rotation.z = random() * 6.28; m.m.visible = true;
    puff(x, z, big ? 10 : 6, R * 0.6);
  }
  /** A lone shockwave ring of diameter size at (x, z), lasting life seconds (the tier-up ring). */
  function ring(x, z, size, life) { const g = rings[rNext]; rNext = (rNext + 1) % rings.length; g.life = g.max = life; g.size = size; g.m.position.set(x, 0.05, z); g.m.visible = true; }
  /** Confetti-coloured debris rain over a zone when it clears. */
  function confetti(x, z) {
    for (let k = 0; k < 60; k++) {
      const di = dNext, d = D[di]; dNext = (dNext + 1) % D.length; const a = random() * 6.28, sp = 1 + random() * 3;
      d.life = 2 + random(); d.s = 0.5 + random() * 0.4; d.p.set(x + (random() - 0.5) * 4, 4 + random() * 3, z + (random() - 0.5) * 4);
      d.v.set(Math.cos(a) * sp, 2 + random() * 4, Math.sin(a) * sp); d.w.set(random() * 20 - 10, random() * 20 - 10, random() * 20 - 10);
      debris.setColorAt(di, tmpC.set([PAL.coral, PAL.gold, PAL.jade, PAL.amethyst][k % 4]));
    }
    debris.instanceColor.needsUpdate = true;
  }
  const camQ = new THREE.Quaternion();
  function updateFx(dt) {
    let top = 0;
    for (let i = 0; i < D.length; i++) {
      const d = D[i];
      if (d.life <= 0) { tmpM.makeScale(0, 0, 0); debris.setMatrixAt(i, tmpM); continue; }
      top = i + 1;
      d.life -= dt; d.v.y -= 18 * dt; d.p.addScaledVector(d.v, dt);
      const half = 0.08 * d.s;
      if (d.p.y < half) { d.p.y = half; if (d.v.y < 0) d.v.y *= -0.35; d.v.x *= 0.7; d.v.z *= 0.7; d.w.multiplyScalar(0.7); }
      d.r.x += d.w.x * dt; d.r.y += d.w.y * dt; d.r.z += d.w.z * dt;
      const s = d.s * Math.min(1, d.life * 2.5);
      tmpM.compose(d.p, tmpQ.setFromEuler(d.r), tmpS.set(s, s, s)); debris.setMatrixAt(i, tmpM);
    }
    debris.count = top; // dead chunks past the last live one are not drawn
    debris.instanceMatrix.needsUpdate = true;
    camQ.copy(camera.quaternion);
    for (let i = 0; i < P.length; i++) {
      const p = P[i];
      if (p.life <= 0) { tmpM.makeScale(0, 0, 0); dust.setMatrixAt(i, tmpM); continue; }
      p.life -= dt; p.p.addScaledVector(p.v, dt); p.v.multiplyScalar(1 - 2.5 * dt);
      const t = 1 - p.life / p.max, s = p.s * (0.5 + t) * Math.min(1, p.life / p.max * 3);
      tmpM.compose(p.p, camQ, tmpS.set(s, s, s)); dust.setMatrixAt(i, tmpM);
    }
    dust.instanceMatrix.needsUpdate = true;
    for (const g of rings) { if (!g.m.visible) continue; g.life -= dt; const t = 1 - g.life / g.max; const s = g.size * (0.25 + t * 0.9); g.m.scale.set(s, s, 1); g.m.material.opacity = Math.max(0, 1 - t) * 0.9; if (g.life <= 0) g.m.visible = false; }
    for (const m of marks) { if (!m.m.visible) continue; m.life -= dt; m.m.material.opacity = Math.min(0.9, m.life * 0.5); if (m.life <= 0) m.m.visible = false; }
  }

  // ---- camera: follows a focus point, pulls back and up as the hammer grows, trauma shake decays
  const cam = { focus: new THREE.Vector3(0, 0, 0), k: 1, trauma: 0, t: 0, punch: 0, kick: 0 };
  const lookP = new THREE.Vector3(), cineCam = { w: 0, pos: [0, 0, 0], look: [0, 0, 0], fov: cfg.camera.fov };
  function updateCamera(dt, focusZ, scale, focusX = 0) {
    cam.focus.z += (focusZ - cam.focus.z) * Math.min(1, dt * cfg.camera.follow);
    cam.focus.x += (focusX - cam.focus.x) * Math.min(1, dt * cfg.camera.follow * 0.6);
    const k = 1 + cfg.camera.growK * (scale - 1); cam.k += (k - cam.k) * Math.min(1, dt * 2.5);
    scene.fog.near = 26 * cam.k; scene.fog.far = 70 * cam.k; labelK = 0.6 + cam.k * 0.4;
    cam.trauma = Math.max(0, cam.trauma - dt * 1.6); cam.t += dt;
    // tier-up punch-in (pulls the camera in, then lets go) and the FOV kick of a big hit
    cam.punch = Math.max(0, cam.punch - dt * 1.6); cam.kick = Math.max(0, cam.kick - dt * 5);
    const pk = cam.k * (1 - cfg.fx.punch * Math.sin(cam.punch * Math.PI));
    const fov = cfg.camera.fov + cfg.fx.fovKick * cam.kick * cam.kick;
    if (cineCam.w > 0) camera.fov = fov; // the cutscene blend below starts from the play FOV and updates the projection
    else if (camera.fov !== fov) { camera.fov = fov; camera.updateProjectionMatrix(); }
    const sh = cam.trauma * cam.trauma * cfg.fx.shake;
    const ox = (Math.sin(cam.t * 41) + Math.sin(cam.t * 67) * 0.5) * sh, oy = (Math.sin(cam.t * 53) + Math.sin(cam.t * 29) * 0.5) * sh;
    camera.position.set(cam.focus.x + ox, cfg.camera.height * pk + oy, cam.focus.z + cfg.camera.back * pk);
    lookP.set(cam.focus.x, 0, cam.focus.z - cfg.camera.look);
    // a cutscene takes the camera over, blended by its weight w, so it leaves and returns to play without a cut
    const C = cineCam;
    if (C.w > 0) {
      const w = C.w; camera.position.x += (C.pos[0] + ox - camera.position.x) * w; camera.position.y += (C.pos[1] + oy - camera.position.y) * w; camera.position.z += (C.pos[2] - camera.position.z) * w;
      lookP.x += (C.look[0] - lookP.x) * w; lookP.y += (C.look[1] - lookP.y) * w; lookP.z += (C.look[2] - lookP.z) * w;
      camera.fov += (C.fov - camera.fov) * w; camera.updateProjectionMatrix();
    }
    camera.lookAt(lookP);
    // fog keeps its depth relative to the view: a cutscene's high or far camera is not washed out
    if (C.w > 0) { const fk = Math.max(cam.k, camera.position.distanceTo(lookP) / 17.9); scene.fog.near = 26 * fk; scene.fog.far = 70 * fk; }
    // the sun's shadow box follows the view and grows with it
    const ext = 7 * cam.k;
    sun.position.set(cam.focus.x + 6, 14, cam.focus.z + 4); sun.target.position.copy(cam.focus);
    const sc = sun.shadow.camera; if (sc.right !== ext) { sc.left = -ext; sc.right = ext; sc.top = ext; sc.bottom = -ext; sc.far = 40; sc.updateProjectionMatrix(); }
  }

  // per-zone light: the day moves from morning (first zone) to dusk (the finale), following the camera
  const LT = cfg.look.light, sunC = new THREE.Color(), sunC2 = new THREE.Color();
  let birdZone = -1;
  /** Puts the birds down around zone zi (on the grass just outside its plaza). */
  function seatBirds(zi) {
    const Z = cfg.zones[zi]; birdZone = zi;
    B.forEach((b, i) => { const side = i % 2 ? 1 : -1, a = random(); b.p.set(side * (Z.w / 2 + 0.5 + random() * 0.9), 0, Z.z + (a - 0.5) * Z.d); b.fly = 0; b.rest = random() * 3; b.yaw = random() * 6.28; b.v.set(0, 0, 0); });
  }
  /** A heavy hit at (x, z): birds within radius r take off away from it. */
  function scare(x, z, r) {
    for (const b of B) { if (b.fly) continue; const dx = b.p.x - x, dz = b.p.z - z, d = Math.hypot(dx, dz); if (d > r) continue; b.fly = 1; b.v.set(dx / (d || 1) * 3, 4 + random() * 2, dz / (d || 1) * 3 - 1); b.yaw = Math.atan2(b.v.x, b.v.z); }
  }
  function updateWorld(dt, zone = 0) {
    clock += dt;
    // light: blend the two zone settings around the camera's focus
    { let i = 0; while (i + 1 < cfg.zones.length && cam.focus.z < cfg.zones[i + 1].z) i++; const j = Math.min(cfg.zones.length - 1, i + 1);
      const za = cfg.zones[i].z, zb = cfg.zones[j].z, t = j === i ? 0 : Math.max(0, Math.min(1, (za - cam.focus.z) / (za - zb))), A = LT[i], Bq = LT[j], f = (k) => A[k] + (Bq[k] - A[k]) * t;
      sun.color.copy(sunC.set(A[0]).lerp(sunC2.set(Bq[0]), t)); sun.intensity = f(1); hemi.intensity = f(2); renderer.toneMappingExposure = f(3); bulbMat.emissiveIntensity = f(4); }
    if (zone !== birdZone) seatBirds(zone);
    const s = Math.sqrt(cam.k);
    for (let i = 0; i < NB; i++) {
      const b = B[i]; let flap = 1;
      if (b.fly) { b.fly += dt; b.p.addScaledVector(b.v, dt); b.v.y += 1.5 * dt; flap = 0.35 + Math.abs(Math.sin(b.fly * 22)) * 0.65; if (b.fly > 5) { b.fly = 0; const Z = cfg.zones[zone], side = random() < 0.5 ? 1 : -1; b.p.set(side * (Z.w / 2 + 0.5 + random() * 0.9), 0, Z.z + (random() - 0.5) * Z.d); } }
      else { b.rest -= dt; if (b.rest <= 0) { b.rest = 1 + random() * 3; b.hop = 1; b.yaw += (random() - 0.5) * 2; } b.hop = Math.max(0, b.hop - dt * 4); flap = 0.3; }
      tmpV.set(b.p.x, b.p.y + Math.sin(b.hop * Math.PI) * 0.12, b.p.z); tmpQ.setFromEuler(tmpE.set(0, b.yaw, 0));
      tmpM.compose(tmpV, tmpQ, tmpS.set(s, s, s)); birds.setMatrixAt(i, tmpM);
      tmpM.compose(tmpV, tmpQ, tmpS.set(s * flap, s, s)); wings.setMatrixAt(i, tmpM);
    }
    birds.instanceMatrix.needsUpdate = true; wings.instanceMatrix.needsUpdate = true;
    for (const c of clouds) { c.m.position.z += c.v * dt; if (c.m.position.z > 14) c.m.position.z -= 40; }
    bunting.forEach((b, i) => { b.rotation.x = Math.sin(clock * 1.7 + i) * 0.015; });
  }

  /** Dresses the island for world W from the config: sky, fog, ground, the replaced zones' plazas, tree tint. */
  function setWorld(W) {
    const c = scene.background.image; skyStops(c.getContext('2d'), c.width, c.height, W.sky); scene.background.needsUpdate = true;
    scene.fog.color.set(W.fog);
    ground.material.map = groundTex[W.ground] || grassTex; ground.material.needsUpdate = true;
    plazas.forEach((p, i) => plazaLook(i, (W.tex && W.tex[i]) || cfg.zones[i].tex));
    zebra.visible = !(W.tex && W.tex[zebra.userData.zone]);
    decoMat.color.set(W.deco);
  }

  // ---- quality tiers: pixel ratio and shadow map size
  let tier = -1, rs = 1;
  const ratio = () => Math.max(0.5, Math.min(window.devicePixelRatio || 1, cfg.quality.dpr[tier]) * rs);
  /** Render scale (cfg.quality.resMin..1) on top of the tier's pixel ratio: the first step when frames run slow. */
  function setScale(v) { if (v === rs || tier < 0) return; rs = v; renderer.setPixelRatio(ratio()); postSync(); }
  function setTier(t) {
    t = Math.max(0, Math.min(cfg.quality.dpr.length - 1, t)); if (t === tier) return; tier = t;
    renderer.setPixelRatio(ratio());
    const sm = cfg.quality.shadow[t];
    renderer.shadowMap.enabled = sm > 0; sun.castShadow = sm > 0;
    if (sm > 0) { sun.shadow.mapSize.set(sm, sm); if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; } }
    scene.traverse((o) => { if (o.material) o.material.needsUpdate = true; });
    postSync();
  }
  function resize(w, h) { renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); postSync(); }
  // ---- glow (bloom) and grade, tiers >= cfg.look.postTier only. The scene is drawn to a half-float target without
  // tone mapping; what is brighter than the threshold (emissive gems, rings, glowing hammer tiers, boosted during
  // this pass by cfg.look.glow) is blurred at a quarter and an eighth of the size and added back; the last pass draws
  // to the canvas with the renderer's tone mapping and sRGB, then grades (warmth, saturation, contrast, vignette).
  const LK = cfg.look, BL = LK.bloom, GR = LK.grade;
  const glowList = [];
  const glows = (m, k, prop) => glowList.push({ m, k, prop, v: 0 });
  for (const g of rings) glows(g.m.material, 'ring', 'color');
  glows(gemMat, 'gem', 'emissiveIntensity'); glows(H.mats[0], 'hammer', 'emissiveIntensity'); glows(H.mats[1], 'hammer', 'emissiveIntensity'); glows(H.mats[3], 'gem', 'emissiveIntensity');
  function glowSet(on) {
    for (const x of glowList) {
      if (x.prop === 'color') { if (on) x.m.color.setScalar(LK.glow[x.k]); else x.m.color.setScalar(1); }
      else if (on) { x.v = x.m[x.prop]; x.m[x.prop] *= LK.glow[x.k]; } else x.m[x.prop] = x.v;
    }
  }
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
  /** Makes, resizes or frees the glow targets for the tier and the drawing size. */
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
  /** Draws the frame: direct on the low tiers, through the glow pass on the high ones. */
  function draw() {
    renderer.info.reset();
    if (!post) { renderer.setRenderTarget(null); renderer.render(scene, camera); return; }
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

  const proj = new THREE.Vector3();
  /** Screen position (0..1) of a world point. */
  function toScreen(x, y, z) { proj.set(x, y, z).project(camera); return [(proj.x + 1) / 2, (1 - proj.y) / 2, proj.z]; }
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), hitP = new THREE.Vector3();
  /** Ground point under screen position (0..1). */
  function toGround(sx, sy) { ndc.set(sx * 2 - 1, 1 - sy * 2); ray.setFromCamera(ndc, camera); return ray.ray.intersectPlane(plane, hitP) ? { x: hitP.x, z: hitP.z } : null; }

  return {
    renderer, scene, camera, hammer: H, cam,
    setObjects, setWorld, scare, setScale, cineCam,
    /** Compiles every shader the current world needs now, so no material compiles in the middle of a cutscene. */
    prewarm() { try { renderer.compile(scene, camera); } catch (e) { /* a driver without compile: shaders build on first draw */ } },
    get scale() { return rs; }, relabel, updateObjects, burst, impact, confetti, puff, updateFx, updateCamera, updateWorld, setTier, resize, toScreen, toGround,
    get tier() { return tier; },
    bonk(id) { const e = byId[id]; if (e) e.squash = 1; },
    /** A multi-hit object took a hit: squash, a spray of chunks and dust, its hits-left label. */
    hit(id, L) { const e = byId[id]; if (!e) return; e.squash = 1; relabel(id, L); chips(e, 18); puff(e.o.x, e.o.z, 8, cfg.kinds[e.o.kind].r * 0.5); },
    /** A small object grows back with a pop. */
    regrow(id) { const e = byId[id]; if (e) { e.hidden = false; e.grow = 0; } },
    open(id, L) { const e = byId[id]; if (e) { e.pop = 1; relabel(id, L); } },
    shake(a) { cam.trauma = Math.min(1, cam.trauma + a); },
    /** Tier-up camera punch-in (a = 1 for the full move). */
    punch(a) { cam.punch = a; },
    /** FOV kick of a big hit. */
    kick(a) { cam.kick = Math.max(cam.kick, a); },
    ring,
    gems, updateGems,
    get post() { return !!post; },
    render: draw,
    dispose() {
      for (const k of Object.values(kinds)) if (k.mesh) k.mesh.dispose();
      for (const l of labels.children) l.material.dispose();
      for (const o of keep) if (o && o.dispose) o.dispose();
      postFree(); if (blobs) blobs.dispose(); gemMesh.dispose();
      debris.dispose(); dust.dispose(); lamps.dispose();
      scene.traverse((o) => { if (o.isInstancedMesh) o.dispose(); });
      renderer.dispose(); renderer.forceContextLoss();
    },
  };
}
