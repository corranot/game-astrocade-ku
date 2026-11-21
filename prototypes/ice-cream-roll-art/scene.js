// PROTOTYPE - NOT FOR PRODUCTION
/**
 * The 3D stall (Three.js r187, global THREE set by index.html): a pastel counter, the ice-cold steel plate with
 * the cream sheet on it, the milk jug, fruit, spatulas, the syrup bottle, real spiral rolls built from the sheet
 * (roll.js), the paper cup, toppings and the particle effects. Nothing here touches THREE at import time: the
 * platform bundle runs before the library arrives, so everything is built inside createScene().
 */
/* global THREE */
import { rollPoint, rollRadius } from './roll.js';
import { RECT } from './sheet.js';

export const PW = 4; // plate width in world units (square)
const DPR_MAX = 1.5;

/** Build the scene into canvas `cv`. `cfg` is the game config, `sheet` the cream sheet (sheet.js). */
export function createScene(cv, cfg, sheet) {
  const renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  let dpr = Math.min(window.devicePixelRatio || 1, DPR_MAX);
  renderer.setPixelRatio(dpr);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 720 / 1280, 0.1, 60);
  const disposables = [];
  const keep = (x) => { disposables.push(x); return x; };
  const std = (o) => keep(new THREE.MeshStandardMaterial(o));

  // ---- light and a soft pastel environment for the steel to reflect
  scene.add(new THREE.HemisphereLight(0xfff4fb, 0xffd9b8, 1.25));
  const sun = new THREE.DirectionalLight(0xffffff, 2.3);
  sun.position.set(-3.5, 9, 6); sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024); Object.assign(sun.shadow.camera, { left: -4, right: 4, top: 4, bottom: -4, near: 1, far: 25 });
  sun.shadow.bias = -0.0008; sun.shadow.radius = 4;
  scene.add(sun);
  {
    const pm = new THREE.PMREMGenerator(renderer), env = new THREE.Scene();
    const sky = new THREE.Mesh(new THREE.SphereGeometry(10, 24, 12), new THREE.MeshBasicMaterial({ side: THREE.BackSide, vertexColors: true }));
    const col = [], pos = sky.geometry.attributes.position, c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) { const y = pos.getY(i) / 10, x = pos.getX(i) / 10; c.setHSL(x > 0 ? 0.93 : 0.45, 0.6, 0.78 + y * 0.2); col.push(c.r, c.g, c.b); }
    sky.geometry.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); env.add(sky);
    for (const [x, y, z, s] of [[0, 8, 0, 6], [-6, 3, 4, 2.5], [6, 4, -3, 2.5], [0, 3, -7, 5], [-3, 5, 6, 3]]) { const p = new THREE.Mesh(new THREE.PlaneGeometry(s, s), new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide })); p.position.set(x, y, z); p.lookAt(0, 0, 0); env.add(p); }
    const rt = pm.fromScene(env, 0.03); scene.environment = keep(rt.texture);
    env.traverse((o) => { if (o.isMesh) { o.geometry.dispose(); o.material.dispose(); } }); pm.dispose();
  }

  // ---- counter, freezer machine and the steel plate
  const canvasTex = (w, h, draw) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = keep(new THREE.CanvasTexture(c)); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; };
  const counterTop = canvasTex(512, 512, (g, w, h) => {
    // warm honey wood planks: warm against the cold steel, like a real stall
    const planks = 6;
    for (let k = 0; k < planks; k++) {
      const x = (k * w) / planks; g.fillStyle = k % 2 ? '#f4c27e' : '#efb56c'; g.fillRect(x, 0, w / planks, h);
      for (let i = 0; i < 18; i++) { g.strokeStyle = `rgba(190,120,50,${0.12 + Math.random() * 0.16})`; g.lineWidth = 1 + Math.random() * 2; g.beginPath(); const gx = x + Math.random() * (w / planks); g.moveTo(gx, 0); g.bezierCurveTo(gx + 6, h * 0.3, gx - 6, h * 0.7, gx + 3, h); g.stroke(); }
      g.fillStyle = 'rgba(150,85,30,0.35)'; g.fillRect(x, 0, 3, h); g.fillStyle = 'rgba(255,255,255,0.18)'; g.fillRect(x + 3, 0, 4, h);
    }
  });
  const counter = new THREE.Mesh(keep(new THREE.BoxGeometry(16, 1, 8.75)), std({ map: counterTop, roughness: 0.55 }));
  counter.position.set(0, -0.72, 1.625); counter.receiveShadow = true; scene.add(counter);
  const front = canvasTex(512, 128, (g, w, h) => {
    for (let i = 0; i < 16; i++) { g.fillStyle = i % 2 ? '#ffffff' : '#ff8fbd'; g.fillRect((i * w) / 16, 0, w / 16 + 1, h); }
    g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(0, 0, w, 10);
  });
  front.wrapS = THREE.RepeatWrapping; front.repeat.set(2, 1);
  const machine = new THREE.Mesh(keep(new THREE.BoxGeometry(PW + 0.9, 0.42, PW + 0.9)), [std({ color: 0xff8fbd, roughness: 0.5 }), std({ color: 0xff8fbd, roughness: 0.5 }), std({ color: 0xffb3d1, roughness: 0.4 }), std({ color: 0xff8fbd }), std({ map: front, roughness: 0.5 }), std({ color: 0xff8fbd })]);
  machine.position.set(0, -0.23, 0); machine.receiveShadow = true; scene.add(machine);
  // brushed steel: fine streaks in the roughness so the cold plate catches light like the real thing
  const brushed = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#5a5a5a'; g.fillRect(0, 0, w, h); for (let i = 0; i < 900; i++) { const v = 70 + Math.random() * 90 | 0; g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(Math.random() * w, Math.random() * h, 20 + Math.random() * 90, 1); } });
  brushed.colorSpace = THREE.NoColorSpace;
  const steel = std({ color: 0xf6f9fd, metalness: 0.75, roughness: 0.85, roughnessMap: brushed });
  const plate = new THREE.Mesh(keep(new THREE.BoxGeometry(PW, 0.08, PW)), steel);
  plate.position.y = -0.04; plate.receiveShadow = true; scene.add(plate);
  const rimMat = std({ color: 0xc7d4e2, metalness: 0.9, roughness: 0.2 });
  for (const [x, z, w, d] of [[0, -PW / 2 - 0.12, PW + 0.48, 0.24], [0, PW / 2 + 0.12, PW + 0.48, 0.24], [-PW / 2 - 0.12, 0, 0.24, PW], [PW / 2 + 0.12, 0, 0.24, PW]]) {
    const r = new THREE.Mesh(keep(new THREE.BoxGeometry(w, 0.16, d)), rimMat); r.position.set(x, 0.04, z); r.castShadow = true; r.receiveShadow = true; scene.add(r);
  }
  // cold glow: a frosty tint on the steel that grows while freezing
  const frostMat = keep(new THREE.MeshBasicMaterial({ color: 0xbfe6ff, transparent: true, opacity: 0, depthWrite: false }));
  const frostPlane = new THREE.Mesh(keep(new THREE.PlaneGeometry(PW, PW)), frostMat);
  frostPlane.rotation.x = -Math.PI / 2; frostPlane.position.y = 0.002; scene.add(frostPlane);

  // ---- the cream sheet
  const sheetTex = keep(new THREE.CanvasTexture(sheet.canvas)); sheetTex.colorSpace = THREE.SRGBColorSpace; sheetTex.anisotropy = 4;
  const creamMat = std({ map: sheetTex, transparent: true, roughness: 0.32, metalness: 0, alphaTest: 0.02, side: THREE.DoubleSide });
  const sheetMesh = new THREE.Mesh(keep(new THREE.PlaneGeometry(PW, PW)), creamMat);
  sheetMesh.rotation.x = -Math.PI / 2; sheetMesh.position.y = 0.006; sheetMesh.receiveShadow = true; scene.add(sheetMesh);
  const uvToWorld = (u, v, y = 0) => new THREE.Vector3((u - 0.5) * PW, y, (v - 0.5) * PW);

  // ---- jug, spatulas, scraper, syrup bottle
  const jug = new THREE.Group();
  {
    const prof = [[0, 0], [0.32, 0], [0.36, 0.05], [0.37, 0.55], [0.33, 0.78], [0.36, 0.86], [0.34, 0.88]].map(([x, y]) => new THREE.Vector2(x, y));
    const body = new THREE.Mesh(keep(new THREE.LatheGeometry(prof, 28)), std({ color: 0xfff0f7, roughness: 0.2, metalness: 0, side: THREE.DoubleSide }));
    const liquid = new THREE.Mesh(keep(new THREE.CylinderGeometry(0.33, 0.31, 0.6, 24)), std({ color: 0xfff3d4, roughness: 0.3 }));
    liquid.position.y = 0.32; liquid.scale.set(1.02, 1, 1.02);
    const handle = new THREE.Mesh(keep(new THREE.TorusGeometry(0.2, 0.045, 10, 20, Math.PI * 1.2)), std({ color: 0xff8fbd, roughness: 0.4 }));
    handle.position.set(-0.36, 0.45, 0); handle.rotation.z = Math.PI * 0.4;
    const spout = new THREE.Mesh(keep(new THREE.ConeGeometry(0.1, 0.22, 12, 1, true)), std({ color: 0xffffff, roughness: 0.15, transparent: true, opacity: 0.6, side: THREE.DoubleSide }));
    spout.position.set(0.38, 0.84, 0); spout.rotation.z = -Math.PI / 2.2;
    jug.add(body, liquid, handle, spout); jug.userData.liquid = liquid;
    jug.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    jug.visible = false; scene.add(jug);
  }
  const stream = new THREE.Mesh(keep(new THREE.CylinderGeometry(0.05, 0.07, 1, 12, 1, true)), std({ color: 0xfff3d4, roughness: 0.2 }));
  stream.visible = false; scene.add(stream);

  function makeSpatula(handleCol, w = 0.6) {
    const g = new THREE.Group();
    const blade = new THREE.Mesh(keep(new THREE.BoxGeometry(w, 0.025, 0.42)), std({ color: 0xe8eef5, metalness: 0.9, roughness: 0.18 }));
    blade.position.z = -0.21;
    const neck = new THREE.Mesh(keep(new THREE.BoxGeometry(0.06, 0.03, 0.3)), std({ color: 0xc9d3de, metalness: 0.9, roughness: 0.25 }));
    neck.position.set(0, 0.06, 0.12); neck.rotation.x = -0.4;
    const handle = new THREE.Mesh(keep(new THREE.CylinderGeometry(0.07, 0.08, 0.7, 14)), std({ color: handleCol, roughness: 0.45 }));
    handle.rotation.x = Math.PI / 2 - 0.4; handle.position.set(0, 0.28, 0.55);
    g.add(blade, neck, handle); g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    g.visible = false; scene.add(g); return g;
  }
  const spatA = makeSpatula(0xff6fa8), spatB = makeSpatula(0x56c8ff);
  const laneW = ((RECT.u1 - RECT.u0) * PW) / cfg.roll.lanes;
  const scraper = makeSpatula(0xffc22e, laneW * 0.96);

  const bottle = new THREE.Group();
  {
    const body = new THREE.Mesh(keep(new THREE.CylinderGeometry(0.17, 0.17, 0.62, 18)), std({ color: 0x6b3a22, roughness: 0.3 }));
    body.position.y = 0.55;
    const tip = new THREE.Mesh(keep(new THREE.ConeGeometry(0.17, 0.26, 18)), std({ color: 0xffffff, roughness: 0.3 }));
    tip.rotation.x = Math.PI; tip.position.y = 0.13;
    const cap = new THREE.Mesh(keep(new THREE.CylinderGeometry(0.18, 0.18, 0.08, 18)), std({ color: 0xffffff, roughness: 0.3 }));
    cap.position.y = 0.88;
    bottle.add(body, tip, cap); bottle.userData.body = body; bottle.visible = false;
    bottle.traverse((o) => { if (o.isMesh) o.castShadow = true; }); scene.add(bottle);
  }

  // ---- fruit (procedural so they match their icons exactly)
  const fruitById = Object.fromEntries(cfg.fruits.map((f) => [f.id, f]));
  const geoCache = {};
  const cacheGeo = (k, make) => geoCache[k] || (geoCache[k] = keep(make()));
  const matCache = {};
  // o may be a function, so a texture inside it is only drawn on a cache miss (not on every call)
  const mat = (k, o) => matCache[k] || (matCache[k] = std(typeof o === 'function' ? o() : o));
  const seedTex = (bg, dot, n) => canvasTex(128, 128, (g, w, h) => { g.fillStyle = bg; g.fillRect(0, 0, w, h); g.fillStyle = dot; for (let i = 0; i < n; i++) { g.beginPath(); g.ellipse(Math.random() * w, Math.random() * h, 2.2, 3.2, Math.random() * 3, 0, 7); g.fill(); } });
  const faceTex = (ring, flesh, seed, n) => canvasTex(128, 128, (g, w) => {
    g.fillStyle = ring; g.beginPath(); g.arc(w / 2, w / 2, w / 2, 0, 7); g.fill();
    g.fillStyle = flesh; g.beginPath(); g.arc(w / 2, w / 2, w * 0.43, 0, 7); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.55)'; g.beginPath(); g.arc(w / 2, w / 2, w * 0.12, 0, 7); g.fill();
    g.fillStyle = seed; for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2, r = w * (0.22 + (i % 3) * 0.05); g.beginPath(); g.ellipse(w / 2 + Math.cos(a) * r, w / 2 + Math.sin(a) * r, 2.5, 4, a, 0, 7); g.fill(); }
  });

  /** A fresh 3D model of fruit id, about 0.5 world units across, standing on y = 0. */
  function fruitModel(id) {
    const g = new THREE.Group(), f = fruitById[id] || cfg.fruits[0];
    const M = (geo, m) => { const x = new THREE.Mesh(geo, m); x.castShadow = true; g.add(x); return x; };
    if (id === 'strawberry') {
      const geo = cacheGeo('straw', () => { const s = new THREE.SphereGeometry(0.24, 24, 18), p = s.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i) / 0.24, k = 0.55 + 0.45 * Math.pow((y + 1) / 2, 0.55); p.setX(i, p.getX(i) * k); p.setZ(i, p.getZ(i) * k); } s.computeVertexNormals(); return s; });
      const m = M(geo, mat('straw', () => ({ map: seedTex('#ff2d55', '#ffe066', 70), roughness: 0.35 }))); m.position.y = 0.24;
      for (let i = 0; i < 5; i++) { const l = M(cacheGeo('leaf', () => new THREE.ConeGeometry(0.07, 0.2, 6)), mat('leaf', { color: 0x3fbf4a, roughness: 0.5 })); const a = (i / 5) * Math.PI * 2; l.position.set(Math.cos(a) * 0.08, 0.47, Math.sin(a) * 0.08); l.rotation.set(Math.sin(a) * 1.3, 0, -Math.cos(a) * 1.3); }
    } else if (id === 'banana') {
      const geo = cacheGeo('banana', () => { const c = new THREE.CatmullRomCurve3([new THREE.Vector3(-0.32, 0.2, 0), new THREE.Vector3(-0.15, 0.08, 0), new THREE.Vector3(0.1, 0.07, 0), new THREE.Vector3(0.32, 0.22, 0)]); const t = new THREE.TubeGeometry(c, 24, 0.1, 10); const p = t.attributes.position; for (let i = 0; i < p.count; i++) { /* taper the ends */ const x = p.getX(i), k = 1 - Math.pow(Math.abs(x) / 0.36, 4) * 0.6; p.setY(i, 0.12 + (p.getY(i) - 0.12) * k); p.setZ(i, p.getZ(i) * k); } t.computeVertexNormals(); return t; });
      M(geo, mat('banana', { color: 0xffd93b, roughness: 0.4 }));
      for (const x of [-0.33, 0.33]) { const tip = M(cacheGeo('btip', () => new THREE.SphereGeometry(0.04, 8, 6)), mat('btip', { color: 0x7a5228 })); tip.position.set(x, x < 0 ? 0.2 : 0.22, 0); }
    } else if (id === 'mango') {
      const m = M(cacheGeo('mango', () => new THREE.SphereGeometry(0.25, 24, 16)), mat('mango', { color: 0xffa21f, roughness: 0.35 })); m.scale.set(1.1, 0.85, 0.8); m.position.y = 0.21;
      const blush = M(cacheGeo('mblush', () => new THREE.SphereGeometry(0.2, 16, 12)), mat('mblush', { color: 0xff5a3c, roughness: 0.4 })); blush.scale.set(0.9, 0.7, 0.75); blush.position.set(-0.08, 0.25, 0.03);
    } else if (id === 'kiwi' || id === 'dragonfruit') {
      const kiwi = id === 'kiwi';
      const half = M(cacheGeo('hemi', () => new THREE.SphereGeometry(0.24, 22, 12, 0, Math.PI * 2, 0, Math.PI / 2)), mat(id + 'skin', { color: kiwi ? 0x8a6234 : 0xff3c96, roughness: 0.8 }));
      half.rotation.x = Math.PI; half.position.y = 0.24;
      const face = M(cacheGeo('face', () => new THREE.CircleGeometry(0.24, 28)), mat(id + 'face', () => ({ map: kiwi ? faceTex('#c9e86b', '#7cc43a', '#1d1d12', 26) : faceTex('#ff5aa8', '#fffaf4', '#1d1d1d', 34), roughness: 0.35 })));
      face.rotation.x = -Math.PI / 2; face.position.y = 0.241;
    } else if (id === 'blueberry') {
      for (const [x, z] of [[-0.1, 0], [0.1, 0.02], [0, 0.12], [0.01, -0.11]]) { const b = M(cacheGeo('berry', () => new THREE.SphereGeometry(0.11, 16, 12)), mat('berry', { color: 0x4b5fd8, roughness: 0.3 })); b.position.set(x, 0.11, z); }
    } else if (id === 'cookie') {
      const a = M(cacheGeo('ck', () => new THREE.CylinderGeometry(0.24, 0.24, 0.07, 24)), mat('ck', { color: 0x2c1a14, roughness: 0.75 })); a.position.y = 0.035;
      const c = M(cacheGeo('ckc', () => new THREE.CylinderGeometry(0.22, 0.22, 0.06, 24)), mat('ckc', { color: 0xfffaf0, roughness: 0.6 })); c.position.y = 0.1;
      const b = M(cacheGeo('ck', () => null), mat('ck', {})); b.position.y = 0.165;
    } else if (id === 'watermelon') {
      const geo = cacheGeo('wedge', () => { const sh = new THREE.Shape(); sh.moveTo(0, 0.42); sh.lineTo(-0.3, 0); sh.quadraticCurveTo(0, -0.06, 0.3, 0); sh.lineTo(0, 0.42); return new THREE.ExtrudeGeometry(sh, { depth: 0.16, bevelEnabled: true, bevelSize: 0.02, bevelThickness: 0.02, bevelSegments: 2 }); });
      const w = M(geo, [mat('wflesh', () => ({ map: seedTex('#ff4d6d', '#2a1414', 22), roughness: 0.4 })), mat('wrind', { color: 0x3fae4c, roughness: 0.5 })]); w.position.set(0, 0.03, -0.08);
    } else {
      const m = M(cacheGeo('genf', () => new THREE.SphereGeometry(0.22, 18, 14)), mat('g' + id, { color: new THREE.Color(f.flesh), roughness: 0.4 })); m.position.y = 0.22;
    }
    return g;
  }
  // chunks: one instanced mesh, a fixed pool, coloured per instance
  const CHUNKS = 260;
  const chunkMesh = new THREE.InstancedMesh(keep(new THREE.DodecahedronGeometry(0.055, 0)), std({ roughness: 0.4 }), CHUNKS);
  chunkMesh.castShadow = true; chunkMesh.count = 0; scene.add(chunkMesh);
  const chunks = []; const dummy = new THREE.Object3D(), tmpC = new THREE.Color();
  function spawnChunks(pos, cols, n) {
    for (let i = 0; i < n && chunks.length < CHUNKS; i++) {
      const a = Math.random() * Math.PI * 2, sp = 0.6 + Math.random() * 1.6;
      chunks.push({ p: pos.clone().add(new THREE.Vector3(0, 0.15, 0)), v: new THREE.Vector3(Math.cos(a) * sp, 1.5 + Math.random() * 1.5, Math.sin(a) * sp), s: 0.6 + Math.random() * 0.9, r: Math.random() * 6, col: cols[i % cols.length], life: 1, rest: false });
    }
  }
  function updateChunks(dt) {
    let n = 0;
    for (let i = chunks.length - 1; i >= 0; i--) {
      const c = chunks[i];
      if (!c.rest) { c.v.y -= 9 * dt; c.p.addScaledVector(c.v, dt); c.r += dt * 8; if (c.p.y < 0.04) { c.p.y = 0.04; c.v.multiplyScalar(0.35); c.v.y = Math.abs(c.v.y) * 0.4; if (c.v.lengthSq() < 0.05) c.rest = true; } }
      const lim = PW / 2 - 0.15; c.p.x = Math.max(-lim, Math.min(lim, c.p.x)); c.p.z = Math.max(-lim, Math.min(lim, c.p.z));
      if (c.absorb) { c.s -= dt * 4; if (c.s <= 0) { chunks.splice(i, 1); continue; } }
    }
    for (const c of chunks) { dummy.position.copy(c.p); dummy.rotation.set(c.r, c.r * 0.7, 0); dummy.scale.setScalar(c.s); dummy.updateMatrix(); chunkMesh.setMatrixAt(n, dummy.matrix); chunkMesh.setColorAt(n, tmpC.set(c.col)); n++; }
    chunkMesh.count = n; chunkMesh.instanceMatrix.needsUpdate = true; if (chunkMesh.instanceColor) chunkMesh.instanceColor.needsUpdate = true;
  }
  /** Chunks within world radius r of (x, z) melt into the cream; returns their colours. */
  function absorbChunks(x, z, r) { const got = []; for (const c of chunks) if (!c.absorb && c.rest && (c.p.x - x) ** 2 + (c.p.z - z) ** 2 < r * r) { c.absorb = true; got.push(c); } return got; }

  // ---- sprites: sparkles, cold fog, splash drops
  const starTex = canvasTex(64, 64, (g, w) => { g.translate(w / 2, w / 2); g.fillStyle = '#fff'; g.beginPath(); for (let i = 0; i < 8; i++) { const a = (i * Math.PI) / 4, r = i % 2 ? 7 : 30; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); } g.fill(); });
  const softTex = canvasTex(64, 64, (g, w) => { const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,0.95)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, w); });
  const sprites = [];
  function spritePool(tex, n, blend) {
    const pool = [];
    for (let i = 0; i < n; i++) { const s = new THREE.Sprite(keep(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, blending: blend || THREE.NormalBlending }))); s.visible = false; scene.add(s); pool.push({ s, life: 0 }); }
    return pool;
  }
  const sparkPool = spritePool(starTex, 60), fogPool = spritePool(softTex, 26);
  function emit(pool, pos, o) {
    const p = pool.find((x) => x.life <= 0) || pool[0];
    p.life = o.life || 1; p.max = p.life; p.v = o.v || new THREE.Vector3(); p.size = o.size || 0.2; p.grow = o.grow || 0; p.g = o.g || 0;
    p.s.position.copy(pos); p.s.material.color.set(o.color || 0xffffff); p.s.material.opacity = 1; p.s.visible = true; p.s.scale.setScalar(p.size); p.spin = o.spin || 0;
    if (!sprites.includes(pool)) sprites.push(pool);
  }
  function sparkle(pos, n = 12, cols = [0xfff36b, 0xffffff, 0xff9ad0, 0x8fe3ff]) {
    for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, u = Math.random() * 2.5; emit(sparkPool, pos, { v: new THREE.Vector3(Math.cos(a) * u, 1 + Math.random() * 2.5, Math.sin(a) * u), size: 0.12 + Math.random() * 0.18, life: 0.6 + Math.random() * 0.5, color: cols[i % cols.length], g: 4, spin: 1 }); }
  }
  function fog(pos) { emit(fogPool, pos, { v: new THREE.Vector3((Math.random() - 0.5) * 0.3, 0.35 + Math.random() * 0.3, 0.25), size: 0.8 + Math.random() * 0.6, grow: 0.8, life: 1.8, color: 0xeaf7ff }); }
  function updateSprites(dt) {
    for (const pool of sprites) for (const p of pool) {
      if (p.life <= 0) continue; p.life -= dt; if (p.life <= 0) { p.s.visible = false; continue; }
      p.v.y -= p.g * dt; p.s.position.addScaledVector(p.v, dt); p.s.scale.setScalar(p.size * (1 + p.grow * (1 - p.life / p.max)));
      p.s.material.opacity = Math.min(1, (p.life / p.max) * 2) * (pool === fogPool ? 0.7 : 1); if (p.spin) p.s.material.rotation += dt * 4;
    }
  }

  // ---- rolls: each lane of the sheet becomes a strip that really winds into a spiral (roll.js)
  const RA = cfg.roll.inner, RB = cfg.roll.thick / (2 * Math.PI), L = (RECT.v1 - RECT.v0) * PW;
  const COLS = 6, ROWS = 140, CAP = 160;
  const rollMat = std({ map: sheetTex, roughness: 0.55, side: THREE.DoubleSide });
  const capMat = std({ map: sheetTex, roughness: 0.6, side: THREE.DoubleSide, vertexColors: true }); // inner edge of each turn shaded: the spiral line
  const lanes = [];
  function buildLanes() {
    clearLanes();
    for (let i = 0; i < cfg.roll.lanes; i++) {
      const g = new THREE.Group();
      const u0 = RECT.u0 + (i / cfg.roll.lanes) * (RECT.u1 - RECT.u0), u1 = RECT.u0 + ((i + 1) / cfg.roll.lanes) * (RECT.u1 - RECT.u0);
      const gap = 0.006; const ua = u0 + gap, ub = u1 - gap, w = (ub - ua) * PW;
      const geo = new THREE.PlaneGeometry(1, 1, COLS, ROWS); // positions rewritten in setLane
      const uv = geo.attributes.uv;
      for (let r = 0; r <= ROWS; r++) for (let c = 0; c <= COLS; c++) { const k = r * (COLS + 1) + c; uv.setXY(k, ua + (ub - ua) * (c / COLS), 1 - (RECT.v1 - (RECT.v1 - RECT.v0) * (r / ROWS))); }
      const mesh = new THREE.Mesh(geo, rollMat); mesh.castShadow = true; mesh.receiveShadow = true; g.add(mesh);
      // two end caps: the spiral seen from the side, coloured from the sheet edge so the layers show
      const caps = [];
      for (const side of [0, 1]) {
        const cg = new THREE.BufferGeometry();
        cg.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array((CAP + 1) * 2 * 3), 3));
        const cuv = new Float32Array((CAP + 1) * 2 * 2); const idx = [];
        for (let k = 0; k <= CAP; k++) { const v = 1 - (RECT.v1 - (RECT.v1 - RECT.v0) * (k / CAP)); const uu = side ? ub - 0.004 : ua + 0.004; cuv.set([uu, v, uu, v], k * 4); if (k < CAP) { const a = k * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } }
        cg.setAttribute('uv', new THREE.BufferAttribute(cuv, 2)); cg.setIndex(idx);
        const shadeC = new Float32Array((CAP + 1) * 2 * 3); for (let k = 0; k <= CAP; k++) shadeC.set([1, 1, 1, 0.55, 0.5, 0.55], k * 6);
        cg.setAttribute('color', new THREE.BufferAttribute(shadeC, 3));
        const cm = new THREE.Mesh(cg, capMat); g.add(cm); caps.push(cm);
      }
      const x = (((ua + ub) / 2) - 0.5) * PW, z0 = (RECT.v1 - 0.5) * PW;
      g.position.set(x, 0.008, z0); scene.add(g);
      const lane = { g, mesh, caps, w, p: 0, done: false, pivot: null, x };
      lanes.push(lane); setLane(lane, 0);
    }
    sheetMesh.visible = false;
  }
  /** Rewrite lane geometry for scraper position p (0..L). */
  function setLane(lane, p) {
    lane.p = p;
    const pos = lane.mesh.geometry.attributes.position;
    for (let r = 0; r <= ROWS; r++) {
      const s = (r / ROWS) * L; const [d, y] = rollPoint(s, p, RA, RB);
      for (let c = 0; c <= COLS; c++) { pos.setXYZ(r * (COLS + 1) + c, (c / COLS - 0.5) * lane.w, y + 0.004, -d); }
    }
    pos.needsUpdate = true; lane.mesh.geometry.computeVertexNormals(); lane.mesh.geometry.computeBoundingSphere();
    const tk = cfg.roll.thick * 0.8;
    lane.caps.forEach((cm, side) => {
      const cp = cm.geometry.attributes.position, x = (side ? 0.5 : -0.5) * lane.w;
      const pc = Math.min(p, L);
      const tp = rollRadius(pc, RA, RB) - RA; // radius grown so far (unused when flat)
      for (let k = 0; k <= CAP; k++) {
        const s = (k / CAP) * pc; const [d, y] = rollPoint(s, pc, RA, RB);
        // the inner edge of this layer, toward the roll centre
        const cy = rollRadius(pc, RA, RB), cz = pc; const dy = cy - y, dz = cz - d, len = Math.hypot(dy, dz) || 1;
        const th = pc > 0.02 && tp > 0 ? tk : 0;
        cp.setXYZ(k * 2, x, y + 0.004, -d); cp.setXYZ(k * 2 + 1, x, y + 0.004 + (dy / len) * th, -(d + (dz / len) * th));
      }
      cp.needsUpdate = true; cm.geometry.computeVertexNormals(); cm.geometry.computeBoundingSphere(); cm.visible = pc > 0.02;
    });
  }
  function clearLanes() { for (const l of lanes) { (l.pivot || l.g).removeFromParent(); l.mesh.geometry.dispose(); l.caps.forEach((c) => c.geometry.dispose()); } lanes.length = 0; sheetMesh.visible = true; }
  /** Wrap a finished lane in a pivot at its roll centre, so it can hop and stand up. */
  function liftLane(lane) {
    const R = rollRadius(L, RA, RB);
    const pivot = new THREE.Group();
    pivot.position.set(lane.x, 0.008 + R, lane.g.position.z - L);
    scene.add(pivot); pivot.add(lane.g); lane.g.position.set(0, -R, L); lane.pivot = pivot;
    return pivot;
  }

  // ---- cup and toppings
  const cup = new THREE.Group();
  const CUP_H = cfg.cup.height, CUP_R = cfg.cup.radius;
  {
    const stripes = canvasTex(512, 128, (g, w, h) => { for (let i = 0; i < 20; i++) { g.fillStyle = i % 2 ? '#ffffff' : '#ff7fb6'; g.fillRect((i * w) / 20, 0, w / 20 + 1, h); } g.fillStyle = '#ffd1e6'; g.fillRect(0, 0, w, 10); });
    const prof = [[CUP_R * 0.86, 0], [CUP_R, CUP_H], [CUP_R * 1.04, CUP_H + 0.02], [CUP_R * 1.02, CUP_H + 0.05]].map(([x, y]) => new THREE.Vector2(x, y));
    const body = new THREE.Mesh(keep(new THREE.LatheGeometry(prof, 40)), std({ map: stripes, roughness: 0.5, side: THREE.DoubleSide }));
    body.castShadow = true; body.receiveShadow = true;
    const bottom = new THREE.Mesh(keep(new THREE.CircleGeometry(CUP_R * 0.86, 32)), std({ color: 0xffd1e6 }));
    bottom.rotation.x = -Math.PI / 2; bottom.position.y = 0.01;
    const saucer = new THREE.Mesh(keep(new THREE.CylinderGeometry(CUP_R * 1.45, CUP_R * 1.3, 0.06, 40)), std({ color: 0xffffff, roughness: 0.25 }));
    saucer.position.y = -0.03; saucer.receiveShadow = true; saucer.castShadow = true;
    cup.add(body, bottom, saucer); cup.visible = false; scene.add(cup);
  }
  const toppingGroup = new THREE.Group(); cup.add(toppingGroup);
  /** Where roll k of n stands in the cup (cup-local). */
  const slot = (k, n) => { const a = (k / n) * Math.PI * 2 + Math.PI / 4, r = n > 1 ? cfg.cup.ring : 0; return new THREE.Vector3(Math.cos(a) * r, cfg.cup.floor, Math.sin(a) * r); };
  const rollTopY = () => cfg.cup.floor + laneW * 0.96;

  /** A topping model in cup-local space; `fruit` picks the colour of the slices. */
  function toppingModel(id, fruit, seed = 1) {
    const g = new THREE.Group(); const T = rollTopY();
    let s = seed * 9301 + 49297; const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
    const add = (geo, m, x, y, z) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = true; g.add(o); return o; };
    if (id === 'whip') {
      const geo = cacheGeo('whip', () => {
        const turns = 3.2, rows = 60, seg = 36, pos = [], idx = [];
        for (let r = 0; r <= rows; r++) { const t = r / rows, rad = 0.3 * Math.pow(1 - t, 0.8) + 0.02, y = t * 0.5;
          for (let c = 0; c <= seg; c++) { const a = (c / seg) * Math.PI * 2, star = 1 + 0.16 * Math.cos(a * 8 + t * turns * Math.PI * 2); pos.push(Math.cos(a) * rad * star, y, Math.sin(a) * rad * star); } }
        for (let r = 0; r < rows; r++) for (let c = 0; c < seg; c++) { const a = r * (seg + 1) + c; idx.push(a, a + seg + 1, a + 1, a + 1, a + seg + 1, a + seg + 2); }
        const b = new THREE.BufferGeometry(); b.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); b.setIndex(idx); b.computeVertexNormals(); return b;
      });
      add(geo, mat('whip', { color: 0xfffdf6, roughness: 0.55 }), 0, T - 0.04, 0);
    } else if (id === 'choco' || id === 'berrysauce') {
      // a zig-zag drizzle laid over the roll tops, with a few drips running down the rolls
      const m = mat(id, { color: id === 'choco' ? 0x5a2c16 : 0xe0194f, roughness: 0.15, metalness: 0.05 });
      for (let k = 0; k < 2; k++) { const pts = []; for (let i = 0; i <= 14; i++) { const t = i / 14 - 0.5; const a = k ? Math.PI / 2.6 : 0; const x = t * 1.05, z = (i % 2 ? 0.2 : -0.2); pts.push(new THREE.Vector3(x * Math.cos(a) - z * Math.sin(a), T + 0.035 + Math.sin(i) * 0.008, x * Math.sin(a) + z * Math.cos(a))); }
        add(keep(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 90, 0.026, 8)), m, 0, 0, 0); }
    } else if (id === 'sprinkles') {
      const cols = [0xff4f8b, 0x4fc3ff, 0xffe14f, 0x7be36b, 0xb27bff, 0xffffff];
      const n = 70, im = new THREE.InstancedMesh(cacheGeo('spr', () => new THREE.CapsuleGeometry(0.018, 0.06, 2, 6)), mat('spr', { roughness: 0.3 }), n);
      for (let i = 0; i < n; i++) { const a = rnd() * Math.PI * 2, r = Math.sqrt(rnd()) * 0.62; const dome = Math.max(0, 0.6 - r * 0.9); dummy.position.set(Math.cos(a) * r, T + 0.03 + dome * 0.55 * rnd(), Math.sin(a) * r); dummy.rotation.set(rnd() * 3, rnd() * 3, rnd() * 3); dummy.scale.setScalar(1); dummy.updateMatrix(); im.setMatrixAt(i, dummy.matrix); im.setColorAt(i, tmpC.set(cols[i % cols.length])); }
      g.add(im);
    } else if (id === 'cherry') {
      add(cacheGeo('cherry', () => new THREE.SphereGeometry(0.13, 20, 16)), mat('cherry', { color: 0xe3102e, roughness: 0.12 }), 0, T + 0.56, 0);
      const st = add(cacheGeo('stem', () => new THREE.CylinderGeometry(0.012, 0.012, 0.24, 6)), mat('stem', { color: 0x5b8a2a }), 0.04, T + 0.72, 0); st.rotation.z = -0.4;
    } else if (id === 'wafer') {
      for (const [x, z, rz] of [[-0.18, -0.22, 0.32], [0.16, -0.25, -0.28]]) { const o = add(cacheGeo('wafer', () => new THREE.CylinderGeometry(0.05, 0.05, 0.75, 12)), mat('wafer', () => ({ map: canvasTex(64, 128, (q, w, h) => { q.fillStyle = '#f1b862'; q.fillRect(0, 0, w, h); q.strokeStyle = '#c98a3a'; q.lineWidth = 4; for (let y = -w; y < h; y += 14) { q.beginPath(); q.moveTo(0, y); q.lineTo(w, y + w); q.stroke(); } }), roughness: 0.6 })), x, T + 0.32, z); o.rotation.z = rz; o.rotation.x = -0.2; }
    } else if (id === 'slices') {
      const f = fruitById[fruit] || cfg.fruits[0];
      const sm = mat('slice' + f.id, () => ({ map: faceTex(f.flesh, f.cream, '#3a1a12', 10), roughness: 0.35 }));
      for (let k = 0; k < 5; k++) { const a = (k / 5) * Math.PI * 2 + 0.3; const o = add(cacheGeo('slice', () => new THREE.CylinderGeometry(0.11, 0.11, 0.03, 20)), sm, Math.cos(a) * 0.5, T + 0.08, Math.sin(a) * 0.5); o.rotation.order = 'YXZ'; o.rotation.set(0.55, -a + Math.PI / 2, 0); }
    } else if (id === 'gummy') {
      const cols = [0xff4f6b, 0xffc93c, 0x5fd16b, 0x4fa8ff, 0xff8a3c];
      for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2; const m = mat('gum' + k, { color: cols[k % 5], roughness: 0.1, transparent: true, opacity: 0.9 }); const b = add(cacheGeo('gumb', () => new THREE.CapsuleGeometry(0.06, 0.07, 4, 10)), m, Math.cos(a) * 0.45, T + 0.1, Math.sin(a) * 0.45); const h = add(cacheGeo('gumh', () => new THREE.SphereGeometry(0.055, 12, 10)), m, Math.cos(a) * 0.45, T + 0.21, Math.sin(a) * 0.45); h.scale.set(1, 0.9, 1); b.rotation.z = (rnd() - 0.5) * 0.6; }
    } else if (id === 'marshmallow') {
      const cols = [0xffffff, 0xffc4dc, 0xc9f0ff];
      for (let k = 0; k < 7; k++) { const a = (k / 7) * Math.PI * 2 + 0.2; const o = add(cacheGeo('mm', () => new THREE.CylinderGeometry(0.075, 0.075, 0.1, 14)), mat('mm' + (k % 3), { color: cols[k % 3], roughness: 0.8 }), Math.cos(a) * 0.52, T + 0.07, Math.sin(a) * 0.52); o.rotation.set(rnd(), rnd(), rnd()); }
    }
    return g;
  }
  const toppings = [];
  /** Add a topping to the cup with a pop. */
  function addTopping(id, fruit) {
    const m = toppingModel(id, fruit, toppings.length + 1); m.scale.setScalar(0.01); toppingGroup.add(m);
    toppings.push({ id, m, t: 0 });
    sparkle(cup.localToWorld(new THREE.Vector3(0, rollTopY() + 0.4, 0)), 10);
  }
  function clearToppings() { for (const t of toppings) { t.m.removeFromParent(); t.m.traverse((o) => { if (o.isInstancedMesh) o.dispose(); if (o.isMesh && o.geometry && !Object.values(geoCache).includes(o.geometry) && !o.isInstancedMesh) o.geometry.dispose(); }); } toppings.length = 0; }

  // ---- counter decor in front of the plate: a sprinkle jar and a bowl of strawberries (static, built once)
  {
    const jar = new THREE.Group();
    const glass = new THREE.Mesh(keep(new THREE.CylinderGeometry(0.42, 0.42, 0.9, 28, 1, true)), std({ color: 0xffffff, roughness: 0.05, transparent: true, opacity: 0.35, side: THREE.DoubleSide }));
    glass.position.y = 0.45;
    const lid = new THREE.Mesh(keep(new THREE.CylinderGeometry(0.46, 0.46, 0.16, 28)), std({ color: 0x5ec4ff, roughness: 0.35 })); lid.position.y = 0.98;
    const cols = [0xff4f8b, 0x4fc3ff, 0xffe14f, 0x7be36b, 0xb27bff, 0xffffff], n = 260;
    const im = new THREE.InstancedMesh(keep(new THREE.CapsuleGeometry(0.03, 0.09, 2, 6)), std({ roughness: 0.35 }), n);
    for (let i = 0; i < n; i++) { const a = Math.random() * 6.28, r = Math.sqrt(Math.random()) * 0.36; dummy.position.set(Math.cos(a) * r, 0.05 + Math.random() * 0.62, Math.sin(a) * r); dummy.rotation.set(Math.random() * 3, Math.random() * 3, 0); dummy.scale.setScalar(1); dummy.updateMatrix(); im.setMatrixAt(i, dummy.matrix); im.setColorAt(i, tmpC.set(cols[i % cols.length])); }
    jar.add(glass, lid, im); jar.position.set(-2.9, -0.22, 1.2); jar.traverse((o) => { if (o.isMesh) o.castShadow = true; }); scene.add(jar);
    const bowl = new THREE.Group();
    const b = new THREE.Mesh(keep(new THREE.SphereGeometry(0.62, 28, 14, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2)), std({ color: 0x9fe3c8, roughness: 0.3, side: THREE.DoubleSide }));
    b.position.y = 0.5; b.castShadow = true;
    bowl.add(b);
    for (let i = 0; i < 6; i++) { const f = fruitModel('strawberry'); const a = (i / 6) * Math.PI * 2; f.position.set(Math.cos(a) * 0.3, 0.38 + (i % 2) * 0.06, Math.sin(a) * 0.3); f.rotation.set(0.4, a, 0.3); f.scale.setScalar(0.9); bowl.add(f); }
    const top = fruitModel('strawberry'); top.position.set(0, 0.5, 0); bowl.add(top);
    bowl.position.set(-1.85, -0.22, 3.2); scene.add(bowl);
  }

  // ---- placed fruit on the plate
  const placed = [];
  function dropFruit(id, u, v) {
    const m = fruitModel(id); const p = uvToWorld(u, v); m.position.set(p.x, 2.2, p.z); m.rotation.y = Math.random() * 6; scene.add(m);
    const it = { id, m, vy: 0, y: 2.2, hits: 0, sq: 0, burst: false, u, v };
    placed.push(it); return it;
  }
  function clearFruit() { for (const f of placed) f.m.removeFromParent(); placed.length = 0; chunks.length = 0; }

  // ---- thumbnails: each fruit and topping rendered once to a picture for the buttons
  function thumbs() {
    const out = {}, size = 160;
    const rt = new THREE.WebGLRenderTarget(size, size, { samples: 4 }); rt.texture.colorSpace = THREE.SRGBColorSpace;
    const ts = new THREE.Scene(); ts.environment = scene.environment;
    ts.add(new THREE.HemisphereLight(0xffffff, 0xffe0c8, 1.6)); const l = new THREE.DirectionalLight(0xffffff, 2.2); l.position.set(-2, 4, 3); ts.add(l);
    const cam = new THREE.PerspectiveCamera(30, 1, 0.1, 20);
    const lut = new Uint8Array(256); for (let i = 0; i < 256; i++) { const l = i / 255; lut[i] = Math.round(255 * Math.min(1, (l <= 0.0031308 ? l * 12.92 : 1.055 * Math.pow(l, 1 / 2.4) - 0.055) * 1.08)); }
    const buf = new Uint8Array(size * size * 4), c = document.createElement('canvas'); c.width = c.height = size; const g = c.getContext('2d'), img = g.createImageData(size, size);
    const box = new THREE.Box3(), mid = new THREE.Vector3(), bsize = new THREE.Vector3();
    const shot = (obj) => {
      // frame whatever the model is: its bounding box centred, seen from the front and above
      ts.add(obj); obj.updateMatrixWorld(true); box.setFromObject(obj); box.getCenter(mid); box.getSize(bsize);
      const dist = Math.max(bsize.x, bsize.y, bsize.z) * 2.1 + 0.2; cam.position.set(mid.x, mid.y + dist * 0.6, mid.z + dist * 0.8); cam.lookAt(mid);
      renderer.setRenderTarget(rt); renderer.setClearColor(0x000000, 0); renderer.clear(); renderer.render(ts, cam); renderer.readRenderTargetPixels(rt, 0, 0, size, size, buf); renderer.setRenderTarget(null);
      // the target holds linear colour (no output conversion off-screen): encode to sRGB by table, flip rows
      for (let y = 0; y < size; y++) for (let x = 0; x < size * 4; x++) { const v = buf[(size - 1 - y) * size * 4 + x]; img.data[y * size * 4 + x] = (x & 3) === 3 ? v : lut[v]; }
      g.putImageData(img, 0, 0); ts.remove(obj); return c.toDataURL();
    };
    for (const f of cfg.fruits) out[f.id] = shot(fruitModel(f.id));
    for (const t of cfg.toppings) { const m = toppingModel(t.id, 'strawberry', 3); out['t_' + t.id] = shot(m); m.traverse((o) => { if (o.isMesh && o.geometry && !Object.values(geoCache).includes(o.geometry) && !o.isInstancedMesh) o.geometry.dispose(); }); }
    rt.dispose(); renderer.setClearColor(0x000000, 0);
    return out;
  }

  // ---- camera poses
  const poses = {
    plate: { p: new THREE.Vector3(0, 9.6, 7.6), l: new THREE.Vector3(0, 0, 0.25) },
    cup: { p: new THREE.Vector3(1.55, 4, 10.65), l: new THREE.Vector3(1.55, 0.15, 2.85) },
    show: { p: new THREE.Vector3(1.55, 2.9, 7.1), l: new THREE.Vector3(1.55, 0.45, 3.35) },
  };
  const cam = { p: poses.plate.p.clone(), l: poses.plate.l.clone(), to: poses.plate, orbit: 0, shake: 0 };
  camera.position.copy(cam.p); camera.lookAt(cam.l);
  const reduceMotion = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

  function resize() {
    const r = cv.getBoundingClientRect(); const w = Math.max(1, r.width), h = Math.max(1, r.height);
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
  }
  // adaptive quality: slow frames lower the resolution and switch shadows off; fast frames win it back
  let slow = 0, fast = 0;
  function watch(dt) {
    if (dt > 1 / 38) { slow += dt; fast = 0; } else if (dt < 1 / 55) { fast += dt; slow = Math.max(0, slow - dt); }
    if (slow > 2.5 && dpr > 0.7) { dpr = Math.max(0.7, dpr * 0.8); renderer.setPixelRatio(dpr); resize(); if (dpr < 1) renderer.shadowMap.enabled = false; slow = 0; }
    if (fast > 6 && dpr < Math.min(window.devicePixelRatio || 1, DPR_MAX)) { dpr = Math.min(DPR_MAX, dpr * 1.15); renderer.setPixelRatio(dpr); resize(); fast = 0; }
  }

  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), hit = new THREE.Vector3();
  const api = {
    cupHome: new THREE.Vector3(1.55, -0.155, 3.35), poses, renderer, scene, camera, cup, lanes, placed, toppings, jug, stream, spatA, spatB, scraper, bottle, sheetTex, creamMat, frostMat, L, laneW,
    uvToWorld, fruitModel, dropFruit, clearFruit, spawnChunks, absorbChunks, sparkle, fog, buildLanes, setLane, clearLanes, liftLane, slot, rollTopY, addTopping, clearToppings, thumbs,
    get chunkCount() { return chunks.length; },
    get dpr() { return dpr; },
    /** Plate uv under client point (x, y), or null when the ray misses the plate plane. */
    pick(x, y) {
      const r = cv.getBoundingClientRect(); ndc.set(((x - r.left) / r.width) * 2 - 1, -((y - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ndc, camera); if (!ray.ray.intersectPlane(plane, hit)) return null;
      return { u: hit.x / PW + 0.5, v: hit.z / PW + 0.5 };
    },
    /** The world point at screen fraction (fx, fy), dist units in front of the camera. */
    worldAt(fx, fy, dist) { const v = new THREE.Vector3(fx * 2 - 1, 1 - fy * 2, 0.5).unproject(camera).sub(camera.position).normalize(); return camera.position.clone().addScaledVector(v, dist); },
    /** Screen position (0..1 of the canvas) of a world point. */
    screenOf(v3) { const p = v3.clone().project(camera); return [(p.x + 1) / 2, (1 - p.y) / 2]; },
    pose(name) { cam.to = poses[name]; cam.orbit = 0; },
    orbit(on) { cam.orbit = on ? 1e-6 : 0; },
    shake(k) { if (!reduceMotion) cam.shake = Math.min(0.6, Math.max(cam.shake, k)); },
    resize,
    /** Advance animations by dt seconds and draw. */
    frame(dt) {
      if (sheet.dirty) { sheet.dirty = false; sheetTex.needsUpdate = true; }
      // camera: critically damped follow, optional slow orbit for the showcase; no roll
      const k = 1 - Math.exp(-dt * 4);
      cam.p.lerp(cam.to.p, k); cam.l.lerp(cam.to.l, k);
      const pos = cam.p.clone();
      if (cam.orbit) { cam.orbit += dt * 0.6; const a = Math.sin(cam.orbit) * 0.22; const d = pos.clone().sub(cam.l); d.applyAxisAngle(new THREE.Vector3(0, 1, 0), a); pos.copy(cam.l).add(d); }
      if (cam.shake > 0) { cam.shake = Math.max(0, cam.shake - dt * 2.5); const s = cam.shake * cam.shake * 0.06; pos.x += (Math.random() - 0.5) * s; pos.y += (Math.random() - 0.5) * s; }
      camera.position.copy(pos); camera.lookAt(cam.l);
      // falling fruit and chops
      for (const f of placed) {
        if (f.y > 0 || f.vy > 0) { f.vy -= 14 * dt; f.y += f.vy * dt; if (f.y <= 0) { f.y = 0; f.land = 1; if (f.vy < -2) f.vy = -f.vy * 0.25; else f.vy = 0; } }
        f.land = Math.max(0, (f.land || 0) - dt * 5); f.sq = Math.max(0, f.sq - dt * 6);
        const squash = 1 - f.hits * 0.13 - f.sq * 0.25 - f.land * 0.2;
        f.m.position.y = f.y; f.m.scale.set(1 + (1 - squash) * 0.7, squash, 1 + (1 - squash) * 0.7);
      }
      updateChunks(dt); updateSprites(dt);
      for (const t of toppings) { t.t = Math.min(1, t.t + dt * 4); const e = t.t < 1 ? 1 + Math.sin(t.t * Math.PI) * 0.25 : 1; t.m.scale.setScalar(Math.max(0.01, t.t * e)); }
      watch(dt);
      renderer.render(scene, camera);
    },
    dispose() {
      clearLanes(); clearFruit(); clearToppings();
      for (const d of disposables) d.dispose();
      renderer.dispose(); renderer.forceContextLoss();
    },
  };
  return api;
}
