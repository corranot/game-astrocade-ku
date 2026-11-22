// PROTOTYPE - NOT FOR PRODUCTION
// The 3D look of Block Smash Crew (Three.js r187, global THREE from index.html): voxel chunks with baked corner
// shading, the demolition kid with his giant hammer, flying blocks, dust, coins that fly to the hero, explosions,
// falling pieces, star beacons, the chest, a bright sky and a camera on a spring behind the hero that cuts away the
// roof when he is inside. World coordinates are grid coordinates (1 unit = 1 block).
/* global THREE */
import { meshRegion, raycast } from './voxels.js';
import { placeOf } from './world.js';
import { standingPoints } from './bots.js';

const CS = 12; // chunk size in blocks
const SWING_HIT = 0.4;

/** Builds the scene on canvas cv; cfg = game_config.json. */
export function createScene(cv, cfg) {
  const renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true, powerPreference: 'high-performance' });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping; renderer.toneMappingExposure = 1.05;
  // resolution and the quality tier: dpr follows the frame time (game.js), low = no shadows and half the particles
  const dprBase = Math.min(window.devicePixelRatio || 1, 1.5); let dpr = dprBase, low = false;
  renderer.setPixelRatio(dprBase);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(cfg.camera.fov, 720 / 1280, 0.1, 400);
  const disposables = [];
  const keep = (x) => { disposables.push(x); return x; };

  // ---- sky, fog, light
  const SKY_TOP = new THREE.Color('#3aa8ff'), SKY_LOW = new THREE.Color('#d9f3ff');
  scene.fog = new THREE.Fog(SKY_LOW.clone(), 70, 190);
  const skyMat = keep(new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { top: { value: SKY_TOP }, low: { value: SKY_LOW } },
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: 'uniform vec3 top; uniform vec3 low; varying vec3 vP; void main(){ float k = smoothstep(-0.05, 0.55, vP.y); gl_FragColor = vec4(mix(low, top, k), 1.0);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}',
  }));
  const sky = new THREE.Mesh(keep(new THREE.SphereGeometry(300, 24, 12)), skyMat); scene.add(sky);
  const hemi = new THREE.HemisphereLight('#e4f4ff', '#8fcf6a', 1.7); scene.add(hemi);
  const sun = new THREE.DirectionalLight('#fff4dc', 2.3); sun.position.set(0.55, 1, 0.38).multiplyScalar(50); scene.add(sun); scene.add(sun.target);
  // soft sun shadows over the whole lot (off on a slow phone)
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap; // soft since r182; PCFSoftShadowMap only warns and falls back
  sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024); sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.04;
  Object.assign(sun.shadow.camera, { left: -34, right: 34, top: 34, bottom: -34, near: 1, far: 140 }); sun.shadow.camera.updateProjectionMatrix();
  const flash = new THREE.PointLight('#ffb347', 0, 30, 1.6); scene.add(flash);

  // ---- ground: lawn with a soft texture, a dirt path, and hills + clouds far away for scale
  const tex = (w, h, draw) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = keep(new THREE.CanvasTexture(c)); t.colorSpace = THREE.SRGBColorSpace; return t; };
  const grassTex = tex(128, 128, (x, w, h) => { x.fillStyle = '#6fd14a'; x.fillRect(0, 0, w, h); for (let i = 0; i < 900; i++) { const v = Math.random(); x.fillStyle = v < 0.5 ? 'rgba(80,180,50,.55)' : 'rgba(150,235,100,.5)'; x.fillRect(Math.random() * w, Math.random() * h, 2, 3); } });
  grassTex.wrapS = grassTex.wrapT = THREE.RepeatWrapping; grassTex.repeat.set(70, 70);
  const snowTex = tex(128, 128, (x, w, h) => { x.fillStyle = '#f4f9ff'; x.fillRect(0, 0, w, h); for (let i = 0; i < 700; i++) { x.fillStyle = Math.random() < 0.5 ? 'rgba(200,222,245,.6)' : 'rgba(255,255,255,.9)'; x.fillRect(Math.random() * w, Math.random() * h, 2, 2); } });
  snowTex.wrapS = snowTex.wrapT = THREE.RepeatWrapping; snowTex.repeat.set(70, 70);
  const ground = new THREE.Mesh(keep(new THREE.PlaneGeometry(400, 400)), keep(new THREE.MeshLambertMaterial({ map: grassTex })));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
  const pathMat = keep(new THREE.MeshLambertMaterial({ color: '#e8c48a' }));
  const path = new THREE.Mesh(keep(new THREE.PlaneGeometry(4, 1)), pathMat); path.rotation.x = -Math.PI / 2; path.position.y = 0.01; scene.add(path);
  // far hills and trees: one merged mesh of boxes, coloured per vertex
  {
    const geo = new THREE.BoxGeometry(1, 1, 1), parts = [], m4 = new THREE.Matrix4(), col = new THREE.Color();
    const rnd = (() => { let a = 7; return () => ((a = (a * 16807) % 2147483647) / 2147483647); })();
    for (let i = 0; i < 70; i++) {
      const a = i / 70 * Math.PI * 2, r = 95 + rnd() * 40, w = 14 + rnd() * 20, h = 6 + rnd() * 16;
      m4.compose(new THREE.Vector3(18 + Math.cos(a) * r, h / 2 - 1, 20 + Math.sin(a) * r), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), a), new THREE.Vector3(w, h, w * 0.8));
      const g = geo.clone().applyMatrix4(m4); col.set(rnd() < 0.5 ? '#7fd36a' : '#5fbf55').offsetHSL(0, 0, (rnd() - 0.5) * 0.08);
      const c = new Float32Array(g.attributes.position.count * 3); for (let k = 0; k < c.length; k += 3) { c[k] = col.r; c[k + 1] = col.g; c[k + 2] = col.b; }
      g.setAttribute('color', new THREE.BufferAttribute(c, 3)); parts.push(g);
    }
    for (let i = 0; i < 9; i++) { // voxel clouds
      const cx = rnd() * 160 - 60, cz = rnd() * 60 - 120, cy = 38 + rnd() * 14;
      for (let k = 0; k < 5; k++) { m4.compose(new THREE.Vector3(cx + k * 3 - 6, cy + (k % 2), cz + rnd() * 3), new THREE.Quaternion(), new THREE.Vector3(5 + rnd() * 3, 2.5, 4)); const g = geo.clone().applyMatrix4(m4); const c = new Float32Array(g.attributes.position.count * 3).fill(1); g.setAttribute('color', new THREE.BufferAttribute(c, 3)); parts.push(g); }
    }
    const merged = mergeGeos(parts); parts.forEach((g) => g.dispose()); geo.dispose();
    scene.add(new THREE.Mesh(keep(merged), keep(new THREE.MeshLambertMaterial({ vertexColors: true }))));
  }

  // ---- palette (linear) for the mesher
  const palette = [null], jitter = [0];
  const tiles = [0]; for (const m of cfg.materials) tiles.push(m.tile || 0);
  const dcol = [null]; // debris colours: every material, also the ones drawn as their own mesh (TNT)
  for (const m of cfg.materials) { const c = new THREE.Color(m.color); palette.push(m.hidden ? null : [c.r, c.g, c.b]); dcol.push([c.r, c.g, c.b]); jitter.push(m.jitter || 0); }

  // ---- voxel chunks
  // a pixel texture atlas (bricks, planks, studs...) multiplied by the block colour and corner shading
  const atlas = tex(128, 128, (x) => drawAtlas(x)); atlas.magFilter = THREE.NearestFilter; atlas.minFilter = THREE.LinearFilter; atlas.generateMipmaps = false;
  const chunkMat = keep(new THREE.MeshLambertMaterial({ vertexColors: true, map: atlas, side: THREE.FrontSide }));
  const chunkRoot = new THREE.Group(); scene.add(chunkRoot);
  let chunks = new Map(), dirty = new Set(), W = null;
  const ckey = (cx, cy, cz) => `${cx},${cy},${cz}`;
  function buildChunk(cx, cy, cz) {
    const k = ckey(cx, cy, cz), old = chunks.get(k);
    if (old) { chunkRoot.remove(old); old.geometry.dispose(); chunks.delete(k); }
    const g = W.g, sc = g.scorch, shade = sc ? (x, y, z) => 1 - sc[g.idx(x, y, z)] * 0.0033 : null;
    const r = meshRegion(g.get, cx * CS, cy * CS, cz * CS, Math.min(g.W, (cx + 1) * CS), Math.min(g.H, (cy + 1) * CS), Math.min(g.D, (cz + 1) * CS), palette, jitter, 0, 0, 0, 0, shade, tiles);
    if (!r.faces) return;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(r.positions, 3)); geo.setAttribute('normal', new THREE.BufferAttribute(r.normals, 3)); geo.setAttribute('color', new THREE.BufferAttribute(r.colors, 3)); geo.setAttribute('uv', new THREE.BufferAttribute(r.uvs, 2));
    geo.setIndex(new THREE.BufferAttribute(r.indices, 1)); geo.computeBoundingSphere();
    const mesh = new THREE.Mesh(geo, chunkMat); mesh.matrixAutoUpdate = false; mesh.castShadow = mesh.receiveShadow = true; chunkRoot.add(mesh); chunks.set(k, mesh);
  }
  function markCell(x, y, z) {
    for (const [dx, dy, dz] of [[0, 0, 0], [1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]]) {
      const X = x + dx, Y = y + dy, Z = z + dz; if (X < 0 || Y < 0 || Z < 0) continue;
      dirty.add(ckey(Math.floor(X / CS), Math.floor(Y / CS), Math.floor(Z / CS)));
    }
  }

  // ---- first person: hands holding the tool, drawn in a second pass over the world (never inside a wall)
  const lam = (c) => keep(new THREE.MeshLambertMaterial({ color: c }));
  const box = (w, h, d) => keep(new THREE.BoxGeometry(w, h, d));
  const part = (geo, mat, x, y, z, parent) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); parent.add(m); return m; };
  const vmScene = new THREE.Scene();
  vmScene.add(new THREE.HemisphereLight('#e4f4ff', '#a08060', 2.2)); const vmSun = new THREE.DirectionalLight('#fff4dc', 2); vmSun.position.set(1, 2, 1.5); vmScene.add(vmSun);
  const vmCam = new THREE.PerspectiveCamera(60, 720 / 1280, 0.01, 10);
  const rig = new THREE.Group(); rig.position.set(0.1, -0.29, -0.6); rig.scale.setScalar(0.36); vmScene.add(rig); // sized for the narrow portrait view: the hammer head ±1/3 of the width // the right hand, low right of the view
  const sleeve = part(box(0.2, 0.2, 0.55), lam('#ff8a1f'), 0.06, -0.08, 0.3, rig); sleeve.rotation.x = 0.2;
  part(box(0.22, 0.05, 0.56), lam('#fff36b'), 0.06, -0.08 + 0.1, 0.3, rig).rotation.x = 0.2;
  part(box(0.19, 0.19, 0.19), lam('#ff9f1c'), 0.02, 0, 0, rig); part(box(0.21, 0.06, 0.21), lam('#ffffff'), 0.02, -0.1, 0.02, rig); // work glove with a white cuff
  const held = {};
  { const g = new THREE.Group(); part(keep(new THREE.CylinderGeometry(0.035, 0.035, 0.85, 8)), lam('#c98a4b'), 0, 0.3, 0, g); const hd = part(box(0.42, 0.24, 0.24), lam('#8a96a8'), 0, 0.72, 0, g); part(box(0.44, 0.08, 0.26), lam('#ff4a4a'), 0, 0.72, 0, g); hd.rotation.y = 0; g.rotation.set(-0.3, 0, 0.15); held.hammer = g; }
  { const g = new THREE.Group(); part(keep(new THREE.SphereGeometry(0.17, 14, 10)), lam('#2a2d3a'), 0, 0.17, -0.05, g); part(box(0.05, 0.08, 0.05), lam('#c9a46b'), 0, 0.36, -0.05, g); held.bomb = g; }
  { const g = new THREE.Group(); const t = part(keep(new THREE.CylinderGeometry(0.09, 0.09, 0.9, 12)), lam('#8fae5a'), 0, 0.08, -0.25, g); t.rotation.x = Math.PI / 2; part(keep(new THREE.ConeGeometry(0.09, 0.2, 12)), lam('#ff4a4a'), 0, 0.08, -0.78, g).rotation.x = -Math.PI / 2; held.rocket = g; }
  { const g = new THREE.Group(); held.ball = g; } // the ball mesh is the ball texture sphere, made below
  { const g = new THREE.Group(); part(keep(new THREE.SphereGeometry(0.12, 12, 10)), keep(new THREE.MeshBasicMaterial({ color: '#16052a' })), 0, 0.2, -0.05, g); const r = part(keep(new THREE.TorusGeometry(0.2, 0.025, 6, 24)), keep(new THREE.MeshBasicMaterial({ color: '#b65cff' })), 0, 0.2, -0.05, g); g.userData.ring = r; held.hole = g; }
  { const g = new THREE.Group(); part(keep(new THREE.IcosahedronGeometry(0.17, 0)), keep(new THREE.MeshLambertMaterial({ color: '#7a4b2a', emissive: '#ff5a00', emissiveIntensity: 0.6, flatShading: true })), 0, 0.18, -0.05, g); held.meteor = g; }
  for (const k of Object.keys(held)) { held[k].visible = false; rig.add(held[k]); }
  let heldTool = 'hammer';
  // the block under the crosshair: a white outline (red on steel the hammer cannot break)
  const outline = new THREE.LineSegments(keep(new THREE.EdgesGeometry(new THREE.BoxGeometry(1.03, 1.03, 1.03))), keep(new THREE.LineBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.9, depthTest: true })));
  outline.visible = false; scene.add(outline);

  // ---- chest (star one) and the star beacons
  const chest = new THREE.Group(); scene.add(chest);
  part(box(1.5, 0.8, 1.05), lam('#b8682c'), 0, 0.4, 0, chest).castShadow = true;
  for (const x of [-0.55, 0.55]) part(box(0.14, 0.84, 1.09), lam('#ffcc1f'), x, 0.42, 0, chest);
  const lid = new THREE.Group(); lid.position.set(0, 0.8, -0.52); chest.add(lid);
  part(box(1.5, 0.4, 1.05), lam('#c97a36'), 0, 0.2, 0.52, lid); part(box(0.3, 0.3, 0.12), lam('#ffcc1f'), 0, 0.05, 1.07, lid);
  const starTex = tex(128, 128, (x) => drawStar(x));
  const beamMat = keep(new THREE.MeshBasicMaterial({ color: '#fff3a0', transparent: true, opacity: 0.32, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false }));
  const beamGeo = keep(new THREE.CylinderGeometry(0.45, 0.45, 60, 10, 1, true)); beamGeo.translate(0, 30, 0);
  const markMat = keep(new THREE.SpriteMaterial({ map: starTex, depthTest: false, transparent: true, fog: false, sizeAttenuation: false })); // same size on screen near or far
  const beacons = []; // {beam, mark, cell | chest}
  function makeBeacon() { const beam = new THREE.Mesh(beamGeo, beamMat); const mark = new THREE.Sprite(markMat); mark.scale.set(0.085, 0.085, 1); mark.renderOrder = 10; scene.add(beam, mark); return { beam, mark }; }

  // ---- pools: flying blocks, dust, coins
  const debrisMax = cfg.debris.max;
  const dGeo = box(1, 1, 1), dMat = keep(new THREE.MeshLambertMaterial());
  const debris = new THREE.InstancedMesh(dGeo, dMat, debrisMax); debris.instanceMatrix.setUsage(THREE.DynamicDrawUsage); debris.frustumCulled = false; debris.castShadow = true; scene.add(debris);
  debris.setColorAt(0, new THREE.Color(1, 1, 1));
  const D = { n: 0, p: new Float32Array(debrisMax * 3), v: new Float32Array(debrisMax * 3), r: new Float32Array(debrisMax * 3), w: new Float32Array(debrisMax * 3), s: new Float32Array(debrisMax), life: new Float32Array(debrisMax), pull: new Float32Array(debrisMax * 4), sh: new Float32Array(debrisMax * 3) }; // sh: the piece's shape (x, y, z scale)
  const dustMax = 160, dustGeo = keep(new THREE.IcosahedronGeometry(0.5, 1)), dustMat = keep(new THREE.MeshLambertMaterial({ emissive: '#5a5040' }));
  const dust = new THREE.InstancedMesh(dustGeo, dustMat, dustMax); dust.instanceMatrix.setUsage(THREE.DynamicDrawUsage); dust.frustumCulled = false; scene.add(dust);
  dust.setColorAt(0, new THREE.Color(1, 1, 1));
  const U = { n: 0, p: new Float32Array(dustMax * 3), v: new Float32Array(dustMax * 3), s: new Float32Array(dustMax * 2), life: new Float32Array(dustMax * 2) };
  // sparks (steel, TNT fuses): tiny bright bits, short life
  const sparkMax = 80, sparkMesh = new THREE.InstancedMesh(keep(new THREE.BoxGeometry(0.09, 0.09, 0.09)), keep(new THREE.MeshBasicMaterial({ color: '#ffd84a', fog: false })), sparkMax);
  sparkMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); sparkMesh.frustumCulled = false; scene.add(sparkMesh);
  const SP = { n: 0, p: new Float32Array(sparkMax * 3), v: new Float32Array(sparkMax * 3), life: new Float32Array(sparkMax) };
  function sparks(x, y, z, n) { if (low) n = Math.ceil(n / 2); for (let k = 0; k < n && SP.n < sparkMax; k++) { const i = SP.n++; SP.p[i * 3] = x; SP.p[i * 3 + 1] = y; SP.p[i * 3 + 2] = z; SP.v[i * 3] = (Math.random() - 0.5) * 9; SP.v[i * 3 + 1] = 2 + Math.random() * 6; SP.v[i * 3 + 2] = (Math.random() - 0.5) * 9; SP.life[i] = 0.25 + Math.random() * 0.25; } }
  // TNT barrels: red with a white band, standing on their blocks (the block itself is not drawn)
  const tntMax = 24, barrel = new THREE.InstancedMesh(keep(new THREE.CylinderGeometry(0.44, 0.44, 0.96, 14)), keep(new THREE.MeshLambertMaterial({ color: '#ffffff' })), tntMax);
  const band = new THREE.InstancedMesh(keep(new THREE.CylinderGeometry(0.455, 0.455, 0.22, 14)), keep(new THREE.MeshLambertMaterial({ color: '#ffffff', emissive: '#553300' })), tntMax);
  // never culled: the bounding sphere of an instanced mesh is measured once, so barrels placed later vanished from some views
  barrel.frustumCulled = band.frustumCulled = false;
  barrel.castShadow = true; scene.add(barrel, band); barrel.count = band.count = 0;
  // the BOOM box: a red box with a yellow lid and a T-handle; smashing it sets off every barrel
  const boomBox = new THREE.Group();
  {
    const bx = (w, h, d, color, y, emissive = '#000000') => { const m = new THREE.Mesh(keep(new THREE.BoxGeometry(w, h, d)), keep(new THREE.MeshLambertMaterial({ color, emissive }))); m.position.y = y; m.castShadow = true; boomBox.add(m); return m; };
    bx(0.86, 0.5, 0.86, '#e8322b', 0.25); bx(0.94, 0.1, 0.94, '#ffd12e', 0.55, '#5a4200'); bx(0.12, 0.5, 0.12, '#3a3340', 0.85); bx(0.66, 0.14, 0.16, '#ffd12e', 1.14, '#5a4200');
  }
  // a bobbing arrow over it, tall enough to show above the fence
  const boomArrow = new THREE.Mesh(keep(new THREE.ConeGeometry(0.34, 0.62, 4)), keep(new THREE.MeshLambertMaterial({ color: '#ff3b30', emissive: '#7a1410' })));
  boomArrow.rotation.x = Math.PI; boomBox.add(boomArrow);
  boomBox.visible = false; scene.add(boomBox);
  function placeBarrels() {
    let n = 0;
    // each kind of barrel has its own colour (config); a plain one is red
    const kinds = (W && W.cfg.tnt.kinds) || [];
    if (W && W.tntCells) for (const c of W.tntCells) { if (W.g.get(c.x, c.y, c.z) !== W.ids.tnt || n >= tntMax) continue; tmpM.compose(tmpV.set(c.x + 0.5, c.y + 0.48, c.z + 0.5), tmpQ.identity(), tmpS.set(1, 1, 1)); barrel.setMatrixAt(n, tmpM); band.setMatrixAt(n, tmpM); const K = kinds.find((k) => k.id === c.k); barrel.setColorAt(n, tmpC.set(K ? K.color : '#e8322b')); n++; }
    barrel.count = band.count = n; barrel.instanceMatrix.needsUpdate = band.instanceMatrix.needsUpdate = true;
    if (barrel.instanceColor) barrel.instanceColor.needsUpdate = true;
    const b = W && W.boomBox;
    boomBox.visible = !!(b && W.g.get(b.x, b.y, b.z) === W.ids.boomBox);
    if (boomBox.visible) boomBox.position.set(b.x + 0.5, b.y, b.z + 0.5);
  }
  const coinMax = 90, coinGeo = keep(new THREE.CylinderGeometry(0.28, 0.28, 0.08, 14)), coinMat = keep(new THREE.MeshLambertMaterial({ color: '#ffcf1f', emissive: '#7a5000' }));
  const coins = new THREE.InstancedMesh(coinGeo, coinMat, coinMax); coins.instanceMatrix.setUsage(THREE.DynamicDrawUsage); coins.frustumCulled = false; scene.add(coins);
  const C = { n: 0, p: new Float32Array(coinMax * 3), v: new Float32Array(coinMax * 3), t: new Float32Array(coinMax) };
  let coinArrive = 0; // coins that reached the hero this frame (for the sound)

  // ---- shots and blasts
  const shotMeshes = new Map();
  const bombGeo = keep(new THREE.SphereGeometry(0.42, 16, 12)), black = lam('#2a2d3a'), red = lam('#ff4a4a'), white = lam('#f4f7ff');
  const ballTex = tex(128, 64, (x, w, h) => { x.fillStyle = '#ff5a8a'; x.fillRect(0, 0, w, h); x.fillStyle = '#fff'; for (let i = 0; i < 4; i++) x.fillRect(i * 32, 0, 12, h); x.fillStyle = '#ffd12e'; x.fillRect(0, h * 0.42, w, h * 0.16); });
  const ballMat = keep(new THREE.MeshLambertMaterial({ map: ballTex }));
  part(keep(new THREE.SphereGeometry(0.2, 18, 12)), ballMat, 0, 0.2, -0.05, held.ball);
  const holeMat = keep(new THREE.MeshBasicMaterial({ color: '#16052a' })), ringMat = keep(new THREE.MeshBasicMaterial({ color: '#b65cff', transparent: true, opacity: 0.85, side: THREE.DoubleSide }));
  const rockMat = keep(new THREE.MeshLambertMaterial({ color: '#7a4b2a', emissive: '#ff5a00', emissiveIntensity: 0.6, flatShading: true }));
  // shot parts are made once and shared by every throw (a new geometry per bomb grew GPU memory all level)
  const SH = {}, sh = (k, make) => SH[k] || (SH[k] = keep(make()));
  function shotMesh(s) {
    const g = new THREE.Group();
    if (s.kind === 'bomb') { part(bombGeo, black, 0, 0, 0, g); part(sh('fuse', () => new THREE.BoxGeometry(0.12, 0.2, 0.12)), sh('fuseM', () => new THREE.MeshLambertMaterial({ color: '#c9a46b' })), 0, 0.46, 0, g); g.userData.spark = part(sh('spark', () => new THREE.SphereGeometry(0.12, 8, 6)), sh('sparkM', () => new THREE.MeshBasicMaterial({ color: '#ffe14a' })), 0, 0.6, 0, g); }
    else if (s.kind === 'rocket') { const r = new THREE.Group(); g.add(r); part(sh('rBody', () => new THREE.CylinderGeometry(0.22, 0.22, 1.1, 10)), white, 0, 0, 0, r); part(sh('rNose', () => new THREE.ConeGeometry(0.22, 0.45, 10)), red, 0, 0.78, 0, r); for (let i = 0; i < 3; i++) { const f = part(sh('rFin', () => new THREE.BoxGeometry(0.06, 0.34, 0.3)), red, Math.cos(i * 2.1) * 0.22, -0.45, Math.sin(i * 2.1) * 0.22, r); f.rotation.y = -i * 2.1; } r.rotation.x = Math.PI / 2; }
    else if (s.kind === 'ball') { g.userData.ball = part(sh('ball' + s.r, () => new THREE.SphereGeometry(s.r, 24, 16)), ballMat, 0, 0, 0, g); }
    else if (s.kind === 'hole') { part(sh('hole', () => new THREE.SphereGeometry(0.6, 16, 12)), holeMat, 0, 0, 0, g); for (let i = 0; i < 3; i++) { const t = part(sh('ring' + i, () => new THREE.TorusGeometry(1.1 + i * 0.5, 0.08, 6, 32)), ringMat, 0, 0, 0, g); t.rotation.x = Math.PI / 2 + i * 0.3; t.userData.spin = 2 + i; } }
    else if (s.kind === 'meteor') { part(sh('rock', () => new THREE.IcosahedronGeometry(1.3, 0)), rockMat, 0, 0, 0, g); }
    scene.add(g); return g;
  }
  const fireMat = keep(new THREE.MeshBasicMaterial({ color: '#ffd23c', transparent: true, depthWrite: false, fog: false }));
  const fireMat2 = keep(new THREE.MeshBasicMaterial({ color: '#ff7a1f', transparent: true, depthWrite: false, fog: false }));
  const ringGeo = keep(new THREE.RingGeometry(0.85, 1, 40)), waveMat = keep(new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, depthWrite: false, side: THREE.DoubleSide }));
  const blasts = [];
  const fireGeo = keep(new THREE.IcosahedronGeometry(1, 2));
  function addBlast(x, y, z, r) {
    const a = new THREE.Mesh(fireGeo, fireMat.clone()), b = new THREE.Mesh(fireGeo, fireMat2.clone()), w = new THREE.Mesh(ringGeo, waveMat.clone());
    a.position.set(x, y, z); b.position.set(x, y, z); w.position.set(x, 0.05, z); w.rotation.x = -Math.PI / 2;
    scene.add(a, b, w); blasts.push({ a, b, w, r, t: 0 });
    flash.position.set(x, y + 1, z); flash.intensity = 60 * Math.min(1.5, r / 3);
  }
  const falls = new Map();

  // ---- camera rig
  const cam = { yaw: 0, pitch: cfg.camera.pitch0, trauma: 0, follow: true, bob: 0, eyeY: cfg.camera.eye };
  const reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const tmpV = new THREE.Vector3(), tmpQ = new THREE.Quaternion(), tmpE = new THREE.Euler(), tmpM = new THREE.Matrix4(), tmpS = new THREE.Vector3(), tmpC = new THREE.Color();

  function spawnDebris(x, y, z, m, cx, cy, cz, power, pullTo) {
    if (D.n >= debrisMax * (low ? 0.5 : 1)) return;
    const i = D.n++, p = dcol[m] || [1, 1, 1];
    let dx = x - cx, dy = y - cy, dz = z - cz; const d = Math.hypot(dx, dy, dz) || 1; dx /= d; dy /= d; dz /= d;
    const sp = power * (0.6 + Math.random() * 0.8);
    D.p[i * 3] = x; D.p[i * 3 + 1] = y; D.p[i * 3 + 2] = z;
    D.v[i * 3] = dx * sp + (Math.random() - 0.5) * 3; D.v[i * 3 + 1] = Math.max(0, dy) * sp + 3 + Math.random() * 5; D.v[i * 3 + 2] = dz * sp + (Math.random() - 0.5) * 3;
    for (let k = 0; k < 3; k++) { D.r[i * 3 + k] = Math.random() * 6; D.w[i * 3 + k] = (Math.random() - 0.5) * 14; }
    D.s[i] = 0.42 + Math.random() * 0.4; D.life[i] = cfg.debris.life * (0.7 + Math.random() * 0.5);
    // each material breaks its own way: wood splinters, glass shards, brick crumbs, soft stuff in round lumps
    const frag = (cfg.materials[m - 1] || {}).frag;
    const SH = frag === 'splinter' ? [0.32, 0.32, 1.9] : frag === 'shard' ? [1.1, 0.14, 0.8] : frag === 'crumb' ? [0.7, 0.7, 0.7] : frag === 'soft' ? [0.85, 0.85, 0.85] : [1, 1, 1];
    D.sh[i * 3] = SH[0]; D.sh[i * 3 + 1] = SH[1]; D.sh[i * 3 + 2] = SH[2];
    if (frag === 'spark' && Math.random() < 0.7) sparks(x, y, z, 2);
    if (pullTo) { D.pull[i * 4] = pullTo[0]; D.pull[i * 4 + 1] = pullTo[1]; D.pull[i * 4 + 2] = pullTo[2]; D.pull[i * 4 + 3] = 1; D.life[i] = 1.2; } else D.pull[i * 4 + 3] = 0;
    const j = 0.9 + Math.random() * 0.2; tmpC.setRGB(p[0] * j, p[1] * j, p[2] * j); debris.setColorAt(i, tmpC);
  }
  function killDebris(i) { const j = --D.n; if (i !== j) { for (let k = 0; k < 3; k++) { D.p[i * 3 + k] = D.p[j * 3 + k]; D.v[i * 3 + k] = D.v[j * 3 + k]; D.r[i * 3 + k] = D.r[j * 3 + k]; D.w[i * 3 + k] = D.w[j * 3 + k]; } for (let k = 0; k < 4; k++) D.pull[i * 4 + k] = D.pull[j * 4 + k]; for (let k = 0; k < 3; k++) D.sh[i * 3 + k] = D.sh[j * 3 + k]; D.s[i] = D.s[j]; D.life[i] = D.life[j]; debris.getColorAt(j, tmpC); debris.setColorAt(i, tmpC); } }
  function puff(x, y, z, size, color = '#f4ead8', n = 3) {
    for (let k = 0; k < n; k++) {
      if (U.n >= dustMax * (low ? 0.5 : 1)) return;
      const i = U.n++;
      U.p[i * 3] = x + (Math.random() - 0.5) * size; U.p[i * 3 + 1] = y + Math.random() * size * 0.5; U.p[i * 3 + 2] = z + (Math.random() - 0.5) * size;
      U.v[i * 3] = (Math.random() - 0.5) * 2; U.v[i * 3 + 1] = 0.8 + Math.random() * 1.2; U.v[i * 3 + 2] = (Math.random() - 0.5) * 2;
      U.s[i * 2] = size * (0.5 + Math.random() * 0.6); U.life[i * 2] = 0; U.life[i * 2 + 1] = 0.7 + Math.random() * 0.6;
      tmpC.set(color).offsetHSL(0, 0, (Math.random() - 0.5) * 0.06); dust.setColorAt(i, tmpC);
    }
  }
  function killDust(i) { const j = --U.n; if (i !== j) { for (let k = 0; k < 3; k++) { U.p[i * 3 + k] = U.p[j * 3 + k]; U.v[i * 3 + k] = U.v[j * 3 + k]; } U.s[i * 2] = U.s[j * 2]; U.life[i * 2] = U.life[j * 2]; U.life[i * 2 + 1] = U.life[j * 2 + 1]; dust.getColorAt(j, tmpC); dust.setColorAt(i, tmpC); } }
  function spawnCoins(x, y, z, n) {
    for (let k = 0; k < n && C.n < coinMax; k++) { const i = C.n++; C.p[i * 3] = x; C.p[i * 3 + 1] = y; C.p[i * 3 + 2] = z; C.v[i * 3] = (Math.random() - 0.5) * 6; C.v[i * 3 + 1] = 5 + Math.random() * 4; C.v[i * 3 + 2] = (Math.random() - 0.5) * 6; C.t[i] = 0; }
  }
  function killCoin(i) { const j = --C.n; if (i !== j) { for (let k = 0; k < 3; k++) { C.p[i * 3 + k] = C.p[j * 3 + k]; C.v[i * 3 + k] = C.v[j * 3 + k]; } C.t[i] = C.t[j]; } }

  /** Effects for one world event. */
  function event(e) {
    if (e.type === 'smash') {
      for (const c of e.removed) markCell(c.x, c.y, c.z);
      if (e.removed.some((c) => c.m === W.ids.tnt || c.m === W.ids.boomBox)) placeBarrels();
      const cap = Math.min(e.removed.length, e.by === 'hammer' ? 30 : cfg.debris.perBlast), step = e.removed.length / cap;
      const power = e.by === 'hammer' ? 5 : e.by === 'ball' ? 7 : 6 + e.r * 2.2;
      const hx = W.hero.x, hz = W.hero.z;
      const cx = e.by === 'hammer' ? hx : e.x, cz = e.by === 'hammer' ? hz : e.z, cy = e.by === 'hammer' ? e.y - 0.5 : e.y - 1;
      for (let k = 0; k < cap; k++) { const c = e.removed[Math.floor(k * step)]; spawnDebris(c.x + 0.5, c.y + 0.5, c.z + 0.5, c.m, cx, cy, cz, power, e.by === 'hole' ? [e.x, e.y, e.z] : null); }
      if (e.by !== 'hole') puff(e.x, e.y - 0.3, e.z, Math.min(2.6, 0.5 + e.removed.length * 0.02), '#fbf6ec', Math.min(6, 1 + (e.removed.length >> 4)));
      if (!W.demo) spawnCoins(e.x, e.y, e.z, Math.min(6, 1 + Math.floor(e.removed.length / 8)) + e.gold * 3);
      addTrauma(e.by === 'hammer' ? 0.06 : Math.min(0.5, e.removed.length / 300), e);
    } else if (e.type === 'fall' || e.type === 'topple') {
      const f = e.fall; for (const c of f.cells) markCell(c.x, c.y, c.z);
      // the piece as one mesh, turning a little around its middle as it drops
      let x0 = Infinity, y0 = Infinity, z0 = Infinity, x1 = -Infinity, y1 = -Infinity, z1 = -Infinity; const map = new Map();
      for (const c of f.cells) { map.set(`${c.x},${c.y},${c.z}`, c.m); x0 = Math.min(x0, c.x); y0 = Math.min(y0, c.y); z0 = Math.min(z0, c.z); x1 = Math.max(x1, c.x); y1 = Math.max(y1, c.y); z1 = Math.max(z1, c.z); }
      const mx = (x0 + x1 + 1) / 2, my = (y0 + y1 + 1) / 2, mz = (z0 + z1 + 1) / 2;
      const r = meshRegion((x, y, z) => map.get(`${x},${y},${z}`) || 0, x0, y0, z0, x1 + 1, y1 + 1, z1 + 1, palette, jitter, mx, my, mz, -1e9, null, tiles);
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(r.positions, 3)); geo.setAttribute('normal', new THREE.BufferAttribute(r.normals, 3)); geo.setAttribute('color', new THREE.BufferAttribute(r.colors, 3)); geo.setAttribute('uv', new THREE.BufferAttribute(r.uvs, 2)); geo.setIndex(new THREE.BufferAttribute(r.indices, 1));
      const mesh = new THREE.Mesh(geo, chunkMat); mesh.castShadow = true;
      // a tipping piece turns around its base edge (the pivot), a dropping one around its middle
      const holder = new THREE.Group(); holder.add(mesh); scene.add(holder);
      if (f.topple) { holder.position.set(f.topple.px, f.topple.py, f.topple.pz); mesh.position.set(mx - f.topple.px, my - f.topple.py, mz - f.topple.pz); } else holder.position.set(mx, my, mz);
      falls.set(f.id, { mesh, holder, f, my, tilt: 0 });
      puff(mx, y0, mz, 1.5, '#f4ead8', 3);
    } else if (e.type === 'land') {
      const it = falls.get(e.fall.id);
      if (it) { scene.remove(it.holder); it.mesh.geometry.dispose(); falls.delete(e.fall.id); }
      const cells = e.fall.cells, cap = Math.min(cells.length, cfg.debris.perBlast), step = cells.length / cap;
      for (let k = 0; k < cap; k++) { const c = cells[Math.floor(k * step)], p = placeOf(e.fall, c); spawnDebris(p[0], Math.max(0.5, p[1]), p[2], c.m, e.x, e.y - 2, e.z, 4 + Math.min(8, e.n / 40)); }
      if (e.topple) kick(0.07);
      puff(e.x, 0.3, e.z, Math.min(5, 1.5 + e.n / 60), '#efe4cf', Math.min(10, 3 + (e.n >> 5)));
      if (!W.demo) spawnCoins(e.x, e.y + 1, e.z, Math.min(8, 2 + (e.n >> 5)));
      addTrauma(Math.min(0.6, 0.15 + e.n / 250), e);
    } else if (e.type === 'boom') {
      if (e.kind === 'tnt') placeBarrels();
      addBlast(e.x, e.y, e.z, e.r); puff(e.x, e.y, e.z, e.r * 0.6, '#ece6dc', 5); addTrauma(Math.min(0.6, 0.25 + e.r * 0.06), e); sparks(e.x, e.y, e.z, 10);
      const R = e.r + 2.6; for (let x = e.x - R; x <= e.x + R + CS; x += CS) for (let y = Math.max(0, e.y - R); y <= e.y + R + CS; y += CS) for (let z = e.z - R; z <= e.z + R + CS; z += CS) markCell(Math.floor(Math.min(x, e.x + R)), Math.floor(Math.min(y, e.y + R)), Math.floor(Math.min(z, e.z + R))); // scorch shows
      kick(Math.min(0.06, 0.02 + e.r * 0.006));
    } else if (e.type === 'detonate') { placeBarrels(); sparks(e.x, e.y + 0.6, e.z, 24); addTrauma(0.35, e);
    } else if (e.type === 'fuse') { sparks(e.x, e.y + 0.4, e.z, 8);
    } else if (e.type === 'throw') { shotMeshes.set(e.shot.id, shotMesh(e.shot)); }
    else if (e.type === 'pop') { puff(e.x, e.y, e.z, 2, e.kind === 'hole' ? '#c58bff' : '#ffd0e0', 6); }
    else if (e.type === 'clang') { puff(e.x, e.y, e.z, 0.6, '#ffe9a0', 2); addTrauma(0.05, e); }
    else if (e.type === 'bonk') { sparks(e.x, e.y, e.z, e.again ? 6 : 16); puff(e.x, e.y, e.z, 0.5, '#ffffff', 2); if (!e.again) addTrauma(0.08, e); }
    else if (e.type === 'reboot') { sparks(e.x, e.y + 0.4, e.z, 8); puff(e.x, 0.5, e.z, 0.5, '#bdf3ff', 2); }
    else if (e.type === 'treasure') { spawnCoins(e.x, 1.4, e.z, 24); puff(e.x, 1, e.z, 2, '#fff3a0', 6); }
    else if (e.type === 'star') { puff(e.x, e.y, e.z, 1.6, '#fff3a0', 5); }
  }
  function kick(a) { cam.kick = (cam.kick || 0) + (reduced ? a * 0.3 : a); }
  /** Shake from an event at point p: a·(1 − d/range) by its distance d from the hero, the strongest one wins (no sum). */
  function addTrauma(k, p) {
    const d = p && W ? Math.hypot((p.x || 0) - W.hero.x, (p.z || 0) - W.hero.z) : 0, v = k * Math.max(0, 1 - d / cfg.feel.shakeRange);
    cam.trauma = Math.min(1, Math.max(cam.trauma, reduced ? v * 0.3 : v));
  }

  /** Shows level W: rebuilds every chunk, the chest, the beacons and the path. */
  // snow: flakes drifting around the eye (one Points object, 260 flakes)
  const flakeN = 260, flakePos = new Float32Array(flakeN * 3); for (let i = 0; i < flakeN; i++) { flakePos[i * 3] = Math.random() * 40 - 20; flakePos[i * 3 + 1] = Math.random() * 18; flakePos[i * 3 + 2] = Math.random() * 40 - 20; }
  const flakeGeo = keep(new THREE.BufferGeometry()); flakeGeo.setAttribute('position', new THREE.BufferAttribute(flakePos, 3));
  const flakes = new THREE.Points(flakeGeo, keep(new THREE.PointsMaterial({ color: '#ffffff', size: 0.16, fog: false }))); flakes.frustumCulled = false; flakes.visible = false; scene.add(flakes);
  /** The level's look: day, warm sunset or snow (always bright: sky, light, ground tint, snowflakes). */
  function setTheme(name) {
    const t = cfg.themes[name] || cfg.themes.day;
    SKY_TOP.set(t.top); SKY_LOW.set(t.low); scene.fog.color.set(t.low); sun.color.set(t.sun); hemi.groundColor.set(t.hemiG);
    ground.material.color.set(t.ground); ground.material.map = name === 'snow' ? snowTex : grassTex; flakes.visible = name === 'snow';
  }
  // ---- BONK-BOTs: toy robots drawn from their points (marching, flying as a ragdoll, putting themselves together)
  const BOT_COLORS = ['#ffcf3a', '#4fd1c5', '#ff7ab6', '#7aa8ff', '#9be15d', '#ff9a3c'].map((c) => lam(c));
  const botWhite = lam('#f4f7ff'), botDark = lam('#3a4256'), botRed = keep(new THREE.MeshBasicMaterial({ color: '#ff4a4a' }));
  const unitBox = box(1, 1, 1), botMeshes = new Map();
  const UPV = new THREE.Vector3(0, 1, 0), bva = new THREE.Vector3(), bvb = new THREE.Vector3(), bx = new THREE.Vector3(), by = new THREE.Vector3(), bz = new THREE.Vector3(), bm = new THREE.Matrix4(), bq = new THREE.Quaternion();
  // faces: one atlas of 4 eye kinds (normal, X, dizzy swirl, happy) × 5 mouths; each cell a shared material
  const faceTex = tex(640, 256, (x) => drawFaces(x)), faceGeo = keep(new THREE.PlaneGeometry(0.36, 0.18)), faceMats = {};
  const faceMat = (eye, mouth) => { const k = eye * 5 + mouth; if (!faceMats[k]) { const t = keep(faceTex.clone()); t.repeat.set(1 / 5, 1 / 4); t.offset.set(mouth / 5, 1 - (eye + 1) / 4); faceMats[k] = keep(new THREE.MeshBasicMaterial({ map: t })); } return faceMats[k]; };
  // costumes: 6 sets of shared parts on the head (party hat, astronaut, chef, pirate, construction, disco)
  const cg = {}, geo = (k, make) => cg[k] || (cg[k] = keep(make()));
  const cm = {}, cmat = (c) => cm[c] || (cm[c] = lam(c));
  const COSTUMES = [
    [['head', () => new THREE.ConeGeometry(0.15, 0.34, 14), '#ff5fa8', 0, 0.33, 0], ['head', () => new THREE.SphereGeometry(0.06, 10, 8), '#ffe14a', 0, 0.51, 0]],
    [['head', () => new THREE.TorusGeometry(0.27, 0.05, 8, 20), '#f4f7ff', 0, -0.19, 0, Math.PI / 2], ['body', () => new THREE.BoxGeometry(0.34, 0.38, 0.16), '#e8eef8', 0, 0.02, -0.24]],
    [['head', () => new THREE.CylinderGeometry(0.15, 0.15, 0.2, 14), '#ffffff', 0, 0.27, 0], ['head', () => new THREE.SphereGeometry(0.2, 14, 10), '#ffffff', 0, 0.42, 0, 0, [1, 0.7, 1]]],
    [['head', () => new THREE.BoxGeometry(0.56, 0.1, 0.24), '#2a2d3a', 0, 0.22, 0], ['head', () => new THREE.CylinderGeometry(0.15, 0.17, 0.14, 12), '#2a2d3a', 0, 0.3, 0], ['head', () => new THREE.BoxGeometry(0.1, 0.08, 0.02), '#111522', -0.08, 0.02, 0.19]],
    [['head', () => new THREE.SphereGeometry(0.24, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), '#ffd21f', 0, 0.12, 0], ['head', () => new THREE.CylinderGeometry(0.3, 0.3, 0.03, 18), '#ff9f1c', 0, 0.13, 0.03]],
    [['head', () => new THREE.SphereGeometry(0.29, 14, 10), '#a46bff', 0, 0.16, -0.05], ['head', () => new THREE.BoxGeometry(0.36, 0.07, 0.03), '#16141f', 0, 0.03, 0.2]],
  ];
  // dare signs: cardboard canvases (512 × 340) in a small pool, each painted once per phrase and language
  let signLang = 'en', signList = (cfg.signs && cfg.signs.en) || [];
  const signPool = [], SIGN_MAX = 18, signGeo = keep(new THREE.BoxGeometry(0.8, 0.53, 0.04)), stickGeo = keep(new THREE.BoxGeometry(0.05, 0.62, 0.05)), cardMat = lam('#c98f52'), stickMat = lam('#9a6a3a');
  function signFor(idx) {
    const k = signList.length ? idx % signList.length : 0;
    let s = signPool.find((x) => x.k === k);
    if (!s) s = signPool.find((x) => x.users === 0) || null;
    if (!s && signPool.length < SIGN_MAX) { const c = document.createElement('canvas'); c.width = 512; c.height = 340; const t = keep(new THREE.CanvasTexture(c)); t.colorSpace = THREE.SRGBColorSpace; s = { c, t, mat: [cardMat, cardMat, cardMat, cardMat, keep(new THREE.MeshLambertMaterial({ map: t })), cardMat], k: -1, users: 0 }; signPool.push(s); }
    // a full pool: share a sign already painted, as it is (repainting it would change the text robots already hold)
    if (!s) { s = signPool[k % signPool.length]; s.users++; return s; }
    if (s.k !== k) { s.k = k; paintSign(s); }
    s.users++; return s;
  }
  function paintSign(s) { drawSign(s.c.getContext('2d'), signList[s.k] || '', signLang === 'ar', s.k); s.t.needsUpdate = true; }
  /** One robot: a coloured body with a chest panel, a white head with its face, an antenna, arms and legs; a costume, a sign. */
  function makeBot(b) {
    const g = new THREE.Group(), col = BOT_COLORS[b.hue % BOT_COLORS.length];
    const add = (parent, mat, sx, sy, sz, x = 0, y = 0, z = 0, sh = false) => { const m = new THREE.Mesh(unitBox, mat); m.scale.set(sx, sy, sz); m.position.set(x, y, z); m.castShadow = sh; parent.add(m); return m; };
    const head = new THREE.Group(), body = new THREE.Group(); g.add(head, body);
    add(head, botWhite, 0.42, 0.34, 0.36, 0, 0, 0, true);
    const face = new THREE.Mesh(faceGeo, faceMat(0, b.mouth)); face.position.set(0, 0, 0.181); head.add(face);
    const cos = b.costume >= 0 ? COSTUMES[b.costume] : null;
    // a hat hides the antenna (the astronaut keeps it)
    if (!cos || b.costume === 1) { add(head, botDark, 0.03, 0.16, 0.03, 0, 0.25, 0); add(head, botRed, 0.08, 0.08, 0.08, 0, 0.35, 0); }
    const trunk = add(body, col, 0.46, 0.5, 0.34, 0, 0, 0, true); add(body, botWhite, 0.22, 0.16, 0.02, 0, 0.02, 0.175);
    if (cos) for (const [where, make, c, x, y, z, rx = 0, sc] of cos) { const m = new THREE.Mesh(geo(make.toString(), make), cmat(c)); m.position.set(x, y, z); m.rotation.x = rx; if (sc) m.scale.set(sc[0], sc[1], sc[2]); (where === 'head' ? head : body).add(m); }
    const limbs = [add(g, col, 0.1, 1, 0.1), add(g, col, 0.1, 1, 0.1), add(g, botDark, 0.13, 1, 0.13), add(g, botDark, 0.13, 1, 0.13)];
    let sign = null;
    if (b.sign >= 0) { const sp = signFor(b.sign), sg = new THREE.Group(), board = new THREE.Mesh(signGeo, sp.mat), stick = new THREE.Mesh(stickGeo, stickMat); board.castShadow = true; stick.position.y = -0.5; sg.add(board, stick); g.add(sg); sign = { g: sg, sp }; }
    scene.add(g);
    return { g, head, body, trunk, limbs, face, sign, fk: -1 };
  }
  function dropBot(v) { scene.remove(v.g); if (v.sign) v.sign.sp.users--; }
  /** Points of a standing bot: the standing pose with swinging legs and arms and a bob; close to the hero it stomps and lifts its sign (or pumps a fist). */
  function walkPoints(b) {
    const P = standingPoints(b), s = Math.sin(b.step), fx = Math.sin(b.yaw), fz = Math.cos(b.yaw), rx = Math.cos(b.yaw), rz = -Math.sin(b.yaw), H = b.h;
    const sw = (k, a) => { P[k][0] += fx * a; P[k][2] += fz * a; };
    if (b.near) {
      // stomping in place: feet lift in turn, the body bobs
      P[5][1] += Math.max(0, s) * 0.1 * H; P[6][1] += Math.max(0, -s) * 0.1 * H;
      const bob = Math.abs(s) * 0.05 * H; for (const k of [0, 1, 2, 3, 4]) P[k][1] += bob;
      if (b.sign >= 0) for (const [k, side] of [[3, -1], [4, 1]]) { P[k][0] = b.x + rx * side * 0.12 * H + fx * 0.1 * H; P[k][1] = 1.02 * H + bob; P[k][2] = b.z + rz * side * 0.12 * H + fz * 0.1 * H; }
      else { const up = s > 0 ? 4 : 3; P[up][1] = (1.0 + 0.08 * Math.abs(s)) * H; sw(up, 0.08 * H); }
      return P;
    }
    const bob = Math.abs(s) * 0.035 * H;
    sw(5, s * 0.16 * H); sw(6, -s * 0.16 * H);
    if (b.sign >= 0) { for (const k of [3, 4]) { sw(k, 0.16 * H); P[k][1] = 0.62 * H; } }
    else { sw(3, -s * 0.1 * H); sw(4, s * 0.1 * H); }
    for (const k of [0, 1, 2, 3, 4]) P[k][1] += bob;
    return P;
  }
  /** Puts mesh m along the segment a→b (a box of thickness t). */
  function along(m, a, b, t) {
    bva.set(a[0], a[1], a[2]); bvb.set(b[0], b[1], b[2]); const len = bva.distanceTo(bvb);
    m.position.copy(bva).add(bvb).multiplyScalar(0.5); m.scale.set(t, Math.max(0.02, len), t);
    if (len > 1e-4) m.quaternion.setFromUnitVectors(UPV, bvb.sub(bva).divideScalar(len));
  }
  let botFrame = 0;
  function updateBots() {
    botFrame++;
    for (let i = 0; i < W.bots.length; i++) {
      const b = W.bots[i]; let v = botMeshes.get(b.id); if (!v) { v = makeBot(b); botMeshes.set(b.id, v); }
      v.seen = botFrame;
      const P = b.pts || walkPoints(b); b.drawn = P;
      // the body's frame: up from pelvis to head, right from the left hand to the right one
      by.set(P[0][0] - P[2][0], P[0][1] - P[2][1], P[0][2] - P[2][2]).normalize();
      bx.set(P[4][0] - P[3][0], P[4][1] - P[3][1], P[4][2] - P[3][2]); bx.addScaledVector(by, -bx.dot(by));
      if (bx.lengthSq() < 1e-4) bx.set(Math.cos(b.yaw), 0, -Math.sin(b.yaw)); bx.normalize();
      bz.crossVectors(bx, by); bm.makeBasis(bx, by, bz); bq.setFromRotationMatrix(bm);
      v.head.position.set(P[0][0], P[0][1], P[0][2]); v.head.quaternion.copy(bq);
      v.body.position.set((P[1][0] + P[2][0]) / 2, (P[1][1] + P[2][1]) / 2, (P[1][2] + P[2][2]) / 2); v.body.quaternion.copy(bq);
      along(v.limbs[0], P[1], P[3], 0.1); along(v.limbs[1], P[1], P[4], 0.1); along(v.limbs[2], P[2], P[5], 0.13); along(v.limbs[3], P[2], P[6], 0.13);
      // the face: X or dizzy eyes when knocked, a happy smile while getting up and walking off, else its own mouth
      const eye = b.state === 'down' ? 1 + (b.id % 2) : b.state === 'reboot' || b.happy > 0 ? 3 : 0, fk = eye * 5 + (eye === 3 ? 0 : b.mouth);
      if (fk !== v.fk) { v.fk = fk; v.face.material = faceMat(eye, eye === 3 ? 0 : b.mouth); }
      // the sign: between the hands, raised over the head close to the hero, facing where the body faces
      if (v.sign) {
        const raised = b.near && !b.pts, mx = (P[3][0] + P[4][0]) / 2, my = (P[3][1] + P[4][1]) / 2, mz = (P[3][2] + P[4][2]) / 2;
        const up = raised ? 0.46 : 0.08, fwd = raised ? 0 : 0.12;
        v.sign.g.position.set(mx + by.x * up + bz.x * fwd, my + by.y * up + bz.y * fwd, mz + by.z * up + bz.z * fwd); v.sign.g.quaternion.copy(bq);
      }
    }
    for (const [id, v] of botMeshes) if (v.seen !== botFrame) { dropBot(v); botMeshes.delete(id); }
  }
  /** The nearest bot the ray (o, d) passes within reach of (its head or chest), closer than maxT: {i, t, p}. */
  function botOnRay(o, d, maxT) {
    let best = null; if (!W || !W.bots) return null;
    for (let i = 0; i < W.bots.length; i++) {
      // a standing bot is picked by the points it was drawn with last frame
      const b = W.bots[i], P = b.pts || b.drawn || standingPoints(b);
      // ray-point distance with plain numbers (no new vectors per bot per frame)
      for (const k of [0, 1]) { const px = P[k][0] - o.x, py = P[k][1] - o.y, pz = P[k][2] - o.z, t = px * d.x + py * d.y + pz * d.z; if (t <= 0 || t > maxT) continue; const off = Math.hypot(px - d.x * t, py - d.y * t, pz - d.z * t); if (off < 0.5 && (!best || t < best.t)) best = { i, t, p: { x: P[1][0], y: P[1][1], z: P[1][2] } }; }
    }
    return best;
  }

  function setLevel(world) {
    W = world;
    for (const v of botMeshes.values()) dropBot(v); botMeshes.clear();
    for (const m of chunks.values()) { chunkRoot.remove(m); m.geometry.dispose(); } chunks.clear(); dirty.clear();
    for (const it of falls.values()) { scene.remove(it.holder); it.mesh.geometry.dispose(); } falls.clear();
    for (const g of shotMeshes.values()) scene.remove(g); shotMeshes.clear();
    for (const b of blasts) { scene.remove(b.a, b.b, b.w); b.a.material.dispose(); b.b.material.dispose(); b.w.material.dispose(); } blasts.length = 0;
    D.n = 0; U.n = 0; C.n = 0; SP.n = 0; cam.kick = 0;
    for (let cy = 0; cy * CS < W.g.H; cy++) for (let cz = 0; cz * CS < W.g.D; cz++) for (let cx = 0; cx * CS < W.g.W; cx++) buildChunk(cx, cy, cz);
    chest.position.set(W.chest.x, 0, W.chest.z); chest.rotation.y = 0; lid.rotation.x = 0; chest.visible = true;
    placeBarrels();
    for (const b of beacons) scene.remove(b.beam, b.mark); beacons.length = 0;
    const bc = makeBeacon(); bc.chest = true; beacons.push(bc);
    for (const c of W.starCells) { const b = makeBeacon(); b.cell = c; beacons.push(b); }
    const pz0 = W.box.z1 + 0.5, pz1 = W.g.D + 30; path.scale.set(1, pz1 - pz0, 1); path.position.set((W.box.x0 + W.box.x1 + 1) / 2, 0.01, (pz0 + pz1) / 2);
    cam.yaw = 0; cam.pitch = cfg.camera.pitch0; cam.eyeY = cfg.camera.eye; cam.target = null;
    setTheme(W.theme);
  }

  // ---- input helpers
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  /** What a tap at client point (cx, cy) points at: {type:'chest'|'block'|'ground', x, y, z, p:{x,y,z}} or null (sky). */
  function pick(clientX, clientY) {
    const r = cv.getBoundingClientRect();
    ndc.set((clientX - r.left) / r.width * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const o = ray.ray.origin, d = ray.ray.direction;
    const hit = W ? raycast(W.g, o.x, o.y, o.z, d.x, d.y, d.z, 120) : null;
    const bt = W ? botOnRay(o, d, hit ? hit.t : 80) : null; if (bt) return { type: 'bot', i: bt.i, dist: bt.t, x: bt.p.x, y: bt.p.y, z: bt.p.z, p: bt.p };
    // the chest wins when the ray passes close to it before any block
    if (W && !W.chest.open) { const c = tmpV.set(W.chest.x, 0.6, W.chest.z); const t = c.clone().sub(o).dot(d); if (t > 0 && (!hit || t < hit.t + 0.5) && ray.ray.distanceToPoint(c) < 1.1) return { type: 'chest', x: W.chest.x, y: 0.6, z: W.chest.z, p: { x: W.chest.x, y: 0.6, z: W.chest.z } }; }
    if (hit) return { type: 'block', x: hit.x, y: hit.y, z: hit.z, nx: hit.nx, ny: hit.ny, nz: hit.nz, p: { x: hit.x + 0.5, y: hit.y + 0.5, z: hit.z + 0.5 } };
    if (d.y < -0.01) { const t = -o.y / d.y; if (t < 160) { const x = o.x + d.x * t, z = o.z + d.z * t; return { type: 'ground', x, y: 0, z, p: { x, y: 0.5, z } }; } }
    return null;
  }
  // the cut comes down from high above as the camera goes inside (the roof peels away from the top)
  /** Frame position (720 × 1280 units) of world point (x, y, z); z flag says it is behind the camera. */
  function screenOf(x, y, z) { tmpV.set(x, y, z).project(camera); return [(tmpV.x + 1) / 2 * 720, (1 - tmpV.y) / 2 * 1280, tmpV.z > 1]; }

  // ---- per frame
  let time = 0;
  function update(world, dt) {
    W = world; time += dt;
    if (!W) { renderer.render(scene, camera); return; }
    // remesh what changed
    for (const k of dirty) { const [cx, cy, cz] = k.split(',').map(Number); if (cx * CS < W.g.W && cy * CS < W.g.H && cz * CS < W.g.D) buildChunk(cx, cy, cz); }
    dirty.clear();
    updateCamera(dt); updateHero(dt); updateShots(dt); updateFx(dt); updateBots();
    if (boomBox.visible) { boomArrow.position.y = 2.25 + Math.sin(time * 4) * 0.16; boomArrow.rotation.y = time * 2; }
    renderer.autoClear = true; renderer.render(scene, camera);
    renderer.autoClear = false; renderer.clearDepth(); renderer.render(vmScene, vmCam); renderer.autoClear = true; // the hands on top
  }
  function updateHero(dt) {
    const h = W.hero;
    // the tool in the hand: the hammer swings down at SWING_HIT, a thrown tool is pushed forward
    const want = h.swingT >= 0 && h.throwKind ? h.throwKind : cam.tool || 'hammer'; // a throw shows the thrown tool, even when the hand goes back to the hammer
    if (want !== heldTool) { held[heldTool].visible = false; heldTool = want; }
    held[heldTool].visible = true;
    let rx = 0, rz = 0, py = 0;
    if (h.swingT >= 0) {
      const t = h.swingT;
      if (heldTool === 'hammer') { if (t < 0.25) rx = (t / 0.25) * 0.9; else if (t < SWING_HIT) rx = 0.9 - ((t - 0.25) / (SWING_HIT - 0.25)) * 2.5; else rx = -1.6 + ((t - SWING_HIT) / (1 - SWING_HIT)) * 1.6; }
      else { const k = Math.sin(Math.min(1, t * 1.6) * Math.PI); rz = -k * 0.35; py = k * 0.12; }
    }
    const run = h.moving ? 1 : 0;
    rig.position.set(0.1 + Math.cos(time * 9) * 0.007 * run, -0.29 + py * 0.45 + Math.abs(Math.sin(time * 9)) * 0.011 * run + Math.sin(time * 2) * 0.003, -0.6 + rz * 0.45);
    rig.rotation.set(rx, 0, h.happy > 0 ? Math.sin(time * 10) * 0.2 : 0);
    if (held.hole.userData.ring) held.hole.userData.ring.rotation.z += dt * 4;
    // chest
    if (W.chest.open) { lid.rotation.x = Math.max(-1.9, lid.rotation.x - dt * 8); } else { chest.rotation.y = Math.sin(time * 3) * 0.04; }
    // beacons: on the stars still in the building; the mark floats above it, always visible
    for (const b of beacons) {
      const on = b.chest ? !W.chest.open : W.g.get(b.cell.x, b.cell.y, b.cell.z) === W.ids.star;
      b.beam.visible = b.mark.visible = on && W.phase === 'play';
      if (!on) continue;
      const x = b.chest ? W.chest.x : b.cell.x + 0.5, y = b.chest ? 0 : b.cell.y + 0.5, z = b.chest ? W.chest.z : b.cell.z + 0.5;
      b.beam.position.set(x, y, z);
      b.mark.position.set(x, Math.max(y + 2.2, Math.min(W.top + 3, y + 7)) + Math.sin(time * 3 + x) * 0.3, z);
      const s = 0.085 + Math.sin(time * 5 + z) * 0.006; b.mark.scale.set(s, s, 1);
    }
  }
  function updateShots(dt) {
    for (const [id, g] of shotMeshes) {
      const s = W.shots.find((x) => x.id === id);
      if (!s) { scene.remove(g); shotMeshes.delete(id); continue; }
      g.position.set(s.x, s.y, s.z);
      if (s.kind === 'bomb') { g.rotation.x += dt * 8; g.userData.spark.scale.setScalar(0.8 + Math.random() * 0.6); }
      else if (s.kind === 'rocket') { g.lookAt(s.x + s.dx, s.y + s.dy, s.z + s.dz); if (Math.random() < 0.7) puff(s.x - s.dx, s.y - s.dy, s.z - s.dz, 0.5, '#ffffff', 1); }
      else if (s.kind === 'ball') { g.rotation.y = Math.atan2(s.dx, s.dz); g.userData.ball.rotation.x = s.roll || 0; }
      else if (s.kind === 'hole') { const k = Math.min(1, s.t / (s.dur * 0.6)); g.scale.setScalar(0.4 + k * 1.2 * (1 - Math.max(0, (s.t - s.dur + 0.3) / 0.3))); for (const c of g.children) if (c.userData.spin) c.rotation.z += dt * c.userData.spin; }
      else if (s.kind === 'meteor') { g.rotation.x += dt * 5; g.rotation.y += dt * 3; puff(s.x, s.y + 0.5, s.z, 1.2, '#ffb347', 1); }
    }
    for (const it of falls.values()) {
      const T = it.f.topple;
      if (T) { it.holder.position.y = T.py + it.f.y; if (T.axis === 'z') it.holder.rotation.z = T.s * it.f.th; else it.holder.rotation.x = T.s * it.f.th; continue; }
      it.holder.position.y = it.my + it.f.y; it.tilt = Math.min(0.22, it.tilt + dt * Math.abs(it.f.spin) * 0.25); it.holder.rotation.z = Math.sign(it.f.spin) * it.tilt;
    }
  }
  function updateFx(dt) {
    const g = W.g;
    for (let i = D.n - 1; i >= 0; i--) {
      D.life[i] -= dt; if (D.life[i] <= 0) { killDebris(i); continue; }
      const o = i * 3, s = D.s[i];
      if (D.pull[i * 4 + 3]) { // into the black hole
        for (let k = 0; k < 3; k++) { const dd = D.pull[i * 4 + k] - D.p[o + k]; D.v[o + k] += dd * 9 * dt; D.v[o + k] *= 1 - 2.5 * dt; }
      } else D.v[o + 1] -= 26 * dt;
      D.p[o] += D.v[o] * dt; D.p[o + 1] += D.v[o + 1] * dt; D.p[o + 2] += D.v[o + 2] * dt;
      if (!D.pull[i * 4 + 3]) {
        let floor = s * 0.5; const cx = Math.floor(D.p[o]), cz = Math.floor(D.p[o + 2]), cy = Math.floor(D.p[o + 1] - s * 0.5);
        if (cy >= 0 && g.get(cx, cy, cz)) floor = cy + 1 + s * 0.5;
        if (D.p[o + 1] < floor) { D.p[o + 1] = floor; if (D.v[o + 1] < 0) D.v[o + 1] *= -0.32; D.v[o] *= 0.72; D.v[o + 2] *= 0.72; for (let k = 0; k < 3; k++) D.w[o + k] *= 0.7; }
      }
      for (let k = 0; k < 3; k++) D.r[o + k] += D.w[o + k] * dt;
      const sc = s * Math.min(1, D.life[i] / 0.5);
      tmpM.compose(tmpV.set(D.p[o], D.p[o + 1], D.p[o + 2]), tmpQ.setFromEuler(tmpE.set(D.r[o], D.r[o + 1], D.r[o + 2])), tmpS.set(sc * D.sh[o], sc * D.sh[o + 1], sc * D.sh[o + 2]));
      debris.setMatrixAt(i, tmpM);
    }
    for (let i = SP.n - 1; i >= 0; i--) {
      SP.life[i] -= dt; if (SP.life[i] <= 0) { const j = --SP.n; for (let k = 0; k < 3; k++) { SP.p[i * 3 + k] = SP.p[j * 3 + k]; SP.v[i * 3 + k] = SP.v[j * 3 + k]; } SP.life[i] = SP.life[j]; continue; }
      const o = i * 3; SP.v[o + 1] -= 22 * dt; for (let k = 0; k < 3; k++) SP.p[o + k] += SP.v[o + k] * dt;
      tmpM.compose(tmpV.set(SP.p[o], SP.p[o + 1], SP.p[o + 2]), tmpQ.identity(), tmpS.setScalar(Math.min(1, SP.life[i] * 4))); sparkMesh.setMatrixAt(i, tmpM);
    }
    sparkMesh.count = SP.n; sparkMesh.instanceMatrix.needsUpdate = true;
    debris.count = D.n; debris.instanceMatrix.needsUpdate = true; if (debris.instanceColor) debris.instanceColor.needsUpdate = true;
    for (let i = U.n - 1; i >= 0; i--) {
      U.life[i * 2] += dt; const k = U.life[i * 2] / U.life[i * 2 + 1]; if (k >= 1) { killDust(i); continue; }
      const o = i * 3; for (let j = 0; j < 3; j++) { U.p[o + j] += U.v[o + j] * dt; U.v[o + j] *= 1 - 1.5 * dt; }
      const sc = U.s[i * 2] * (0.5 + k * 1.1) * (k > 0.6 ? (1 - k) / 0.4 : 1);
      tmpM.compose(tmpV.set(U.p[o], U.p[o + 1], U.p[o + 2]), tmpQ.identity(), tmpS.set(sc, sc, sc)); dust.setMatrixAt(i, tmpM);
    }
    dust.count = U.n; dust.instanceMatrix.needsUpdate = true; if (dust.instanceColor) dust.instanceColor.needsUpdate = true;
    coinArrive = 0;
    const hx = W.hero.x, hy = W.hero.y + 1.3, hz = W.hero.z;
    for (let i = C.n - 1; i >= 0; i--) {
      C.t[i] += dt; const o = i * 3;
      if (C.t[i] < 0.35) { C.v[o + 1] -= 20 * dt; }
      else { const dx = hx - C.p[o], dy = hy - C.p[o + 1], dz = hz - C.p[o + 2], d = Math.hypot(dx, dy, dz); if (d < 0.6 || C.t[i] > 2.5) { killCoin(i); coinArrive++; continue; } const sp = 8 + C.t[i] * 22; C.v[o] = dx / d * sp; C.v[o + 1] = dy / d * sp; C.v[o + 2] = dz / d * sp; }
      for (let k = 0; k < 3; k++) C.p[o + k] += C.v[o + k] * dt;
      tmpM.compose(tmpV.set(C.p[o], C.p[o + 1], C.p[o + 2]), tmpQ.setFromEuler(tmpE.set(Math.PI / 2, C.t[i] * 9, 0)), tmpS.set(1, 1, 1)); coins.setMatrixAt(i, tmpM);
    }
    coins.count = C.n; coins.instanceMatrix.needsUpdate = true;
    for (let i = blasts.length - 1; i >= 0; i--) {
      const b = blasts[i]; b.t += dt; const k = b.t / 0.55;
      if (k >= 1) { scene.remove(b.a, b.b, b.w); b.a.material.dispose(); b.b.material.dispose(); b.w.material.dispose(); blasts.splice(i, 1); continue; }
      const e = 1 - Math.pow(1 - Math.min(1, k * 2.2), 3);
      b.a.scale.setScalar(b.r * 0.45 * e); b.b.scale.setScalar(b.r * 0.65 * e); b.a.material.opacity = Math.max(0, 1 - k * 1.6); b.b.material.opacity = Math.max(0, 0.75 * (1 - k * 1.4));
      b.w.scale.setScalar(b.r * 2.4 * k); b.w.material.opacity = 0.7 * (1 - k);
    }
    flash.intensity *= Math.exp(-dt * 9);
    // the flakes' box rides with the eye: snow always falls around the player
    if (flakes.visible) { const p = flakeGeo.attributes.position.array, cx = camera.position.x, cz = camera.position.z; for (let i = 0; i < flakeN; i++) { p[i * 3 + 1] -= dt * (1.2 + (i % 5) * 0.2); p[i * 3] += Math.sin(time + i) * dt * 0.3; if (p[i * 3 + 1] < 0) p[i * 3 + 1] += 18; } flakes.position.set(cx, 0, cz); flakeGeo.attributes.position.needsUpdate = true; }
  }
  function updateCamera(dt) {
    const h = W.hero, cc = cfg.camera;
    // demo / bot: the view turns towards where the hero walks and swings; the player's own look otherwise
    if (cam.follow) { let d = h.yaw + Math.PI - cam.yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); cam.yaw += d * Math.min(1, dt * 4); cam.pitch += (cc.pitch0 - 0.1 - cam.pitch) * Math.min(1, dt * 2); }
    cam.bob += (h.moving ? dt * 9 : 0);
    const bob = h.moving ? Math.abs(Math.sin(cam.bob)) * 0.06 : 0;
    cam.trauma *= Math.exp(-cfg.feel.shakeDecay * dt);
    // the kick: a short upward nod on hits and blasts that dies away (exponential: stable at any frame time; no roll)
    cam.kick = Math.min(0.12, (cam.kick || 0)) * Math.exp(-dt * 14);
    const sh = cam.trauma * cam.trauma * 0.25;
    const st = performance.now() / 1000, sa = sh * 0.5; // summed sines at unrelated rates: a per-frame random offset buzzes like static
    camera.position.set(h.x + Math.sin(st * 39) * sa, h.y + cam.eyeY + bob + Math.sin(st * 53 + 1) * sa, h.z + Math.sin(st * 47 + 2) * sa);
    camera.rotation.set(cam.pitch + (cam.kick || 0), cam.yaw, 0, 'YXZ'); // yaw 0 looks along -z; never a roll
    sky.position.copy(camera.position);
    sun.position.set(W.g.W / 2 + 27, 50, W.g.D / 2 + 19); sun.target.position.set(W.g.W / 2, 0, W.g.D / 2); // fixed over the lot: shadows never swim
    // what the crosshair points at
    const t = pickCenter(); cam.target = t;
    if (t && t.type === 'block' && (cam.tool !== 'hammer' || t.dist <= cfg.hero.reach)) {
      outline.visible = true; outline.position.set(t.x + 0.5, t.y + 0.5, t.z + 0.5);
      const hard = cam.tool === 'hammer' && W.mats[W.g.get(t.x, t.y, t.z)] && W.mats[W.g.get(t.x, t.y, t.z)].hard;
      outline.material.color.set(hard ? '#ff4a4a' : '#ffffff');
    } else outline.visible = false;
  }
  /** What the crosshair (the middle of the view) points at, with its distance from the eye. */
  function pickCenter() {
    if (!W) return null;
    camera.updateMatrixWorld(); const d = tmpV.set(0, 0, -1).applyQuaternion(camera.quaternion), o = camera.position;
    const hit = raycast(W.g, o.x, o.y, o.z, d.x, d.y, d.z, 90);
    // a bot in front of the first block is the target
    const bt = botOnRay(o, d, hit ? hit.t : 60); if (bt) return { type: 'bot', i: bt.i, dist: bt.t, x: bt.p.x, y: bt.p.y, z: bt.p.z, p: bt.p };
    if (!W.chest.open) { const c = new THREE.Vector3(W.chest.x, 0.6, W.chest.z), tt = c.clone().sub(o).dot(d); if (tt > 0 && (!hit || tt < hit.t + 0.5) && new THREE.Ray(o, d).distanceToPoint(c) < 1.1) return { type: 'chest', x: W.chest.x, y: 0.6, z: W.chest.z, dist: tt, p: { x: W.chest.x, y: 0.6, z: W.chest.z } }; }
    if (hit) return { type: 'block', x: hit.x, y: hit.y, z: hit.z, nx: hit.nx, ny: hit.ny, nz: hit.nz, dist: hit.t, p: { x: hit.x + 0.5 + hit.nx * 0.5, y: hit.y + 0.5 + hit.ny * 0.5, z: hit.z + 0.5 + hit.nz * 0.5 } };
    const far = 40, gy = d.y < -0.01 ? Math.min(far, -o.y / d.y) : far;
    return { type: 'air', dist: gy, p: { x: o.x + d.x * gy, y: Math.max(0.5, o.y + d.y * gy), z: o.z + d.z * gy } };
  }

  function resize(w, h) { renderer.setPixelRatio(dpr); renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); vmCam.aspect = w / h; vmCam.updateProjectionMatrix(); }

  return {
    renderer, camera, event, setLevel, update, pick, screenOf, resize,
    /** Turns the camera around the hero (radians). */
    /** Turns the first-person view (radians); the player looking stops the demo's follow. */
    look(dy, dp) { cam.follow = false; cam.yaw += dy; cam.pitch = Math.max(-cfg.camera.pitchMax, Math.min(cfg.camera.pitchMax, cam.pitch + dp)); },
    set follow(v) { cam.follow = !!v; }, get follow() { return cam.follow; },
    get yaw() { return cam.yaw; }, get pitch() { return cam.pitch; },
    /** The tool shown in the hand. */
    set tool(id) { cam.tool = id; },
    get target() { return cam.target; },
    pickCenter,
    kick,
    get heldTool() { return heldTool; },
    get flakesAt() { return flakes.visible ? [flakes.position.x, flakes.position.z] : null; },
    /** Star beacons in view: [{cell, x, y}] in frame units (a tap near one throws a star bomb). */
    starMarks() { const out = []; for (const b of beacons) { if (b.chest || !b.mark.visible) continue; const [x, y, behind] = screenOf(b.mark.position.x, b.mark.position.y, b.mark.position.z); if (!behind) out.push({ cell: b.cell, x, y }); } return out; },
    /** Attract mode: the view sweeps slowly across the building's front. */
    /** The attract mode's view: sweeping along the building, or turned smoothly towards focus {x, z} (a robot in flight). */
    demoLook(b, focus) {
      if (!W) return; const h = W.hero; cam.follow = false;
      if (focus) { let d = Math.atan2(-(focus.x - h.x), -(focus.z - h.z)) - cam.yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); cam.yaw += d * 0.12; const want = Math.atan2((focus.y || 0.9) - (h.y + cfg.camera.eye), Math.hypot(focus.x - h.x, focus.z - h.z)); cam.pitch += (Math.max(-0.5, Math.min(0.4, want)) - cam.pitch) * 0.12; return; }
      const cx = (b.x0 + b.x1 + 1) / 2 + Math.sin(time * 0.5) * (b.x1 - b.x0) * 0.25, cz = b.z1; cam.yaw = Math.atan2(-(cx - h.x), -(cz - h.z)); cam.pitch = cfg.camera.pitch0 + 0.12;
    },
    get coinArrive() { return coinArrive; },
    get counts() { return { debris: D.n, dust: U.n, coins: C.n, falls: falls.size, chunks: chunks.size, blasts: blasts.length, shots: shotMeshes.size }; },
    /** The resolution as a share of the device's own (1 = full), and the device's own pixel ratio. */
    get quality() { return dpr / dprBase; }, get trauma() { return cam.trauma; }, get dpr() { return dpr; }, get dprBase() { return dprBase; }, get low() { return low; },
    /** Sets the pixel ratio (the dynamic resolution); a change of less than 0.01 is ignored. */
    setDpr(d) { if (Math.abs(d - dpr) < 0.01) return; dpr = d; const r = cv.getBoundingClientRect(); resize(r.width || 360, r.height || 640); },
    /** The dare signs' language: every sign in the pool is painted again in it. */
    setSignLang(lang, list) { signLang = lang; signList = list || []; for (const x of signPool) if (x.k >= 0) paintSign(x); },
    /** Paints the signs again (the web font has arrived). */
    redrawSigns() { for (const x of signPool) if (x.k >= 0) paintSign(x); },
    /** Sign textures made so far (a fixed pool) and robots drawn. */
    get signCount() { return signPool.length; }, get botsDrawn() { return botMeshes.size; },
    /** A robot's sign as drawn: {text, raised, x, y, z} of its board, or null. */
    signOf(id) { const v = botMeshes.get(id); if (!v || !v.sign) return null; const p = v.sign.g.position; return { text: signList[v.sign.sp.k] || '', k: v.sign.sp.k, x: p.x, y: p.y, z: p.z }; },
    /** A robot's face cell (eye kind × 5 + mouth). */
    faceOf(id) { const v = botMeshes.get(id); return v ? v.fk : -1; },
    /** The low tier: no sun shadows, half the debris, dust and sparks. */
    setLow(v) { low = !!v; sun.castShadow = !low; },
    /** Is world point (x, y, z) inside the view? */
    seen(x, y, z) { const [sx, sy, behind] = screenOf(x, y, z); return !behind && sx >= 0 && sx <= 720 && sy >= 0 && sy <= 1280; },
    compile() { try { renderer.compile(scene, camera); } catch (e) { /* first frame compiles instead */ } },
    dispose() {
      for (const m of chunks.values()) m.geometry.dispose(); for (const it of falls.values()) it.mesh.geometry.dispose();
      for (const b of blasts) { b.a.material.dispose(); b.b.material.dispose(); b.w.material.dispose(); }
      for (const x of disposables) x.dispose();
      debris.dispose(); dust.dispose(); coins.dispose(); sparkMesh.dispose(); barrel.dispose(); band.dispose();
      renderer.dispose(); try { renderer.forceContextLoss(); } catch (e) { /* already gone */ }
    },
  };
}

/** Joins non-indexed-compatible box geometries (position, normal, color) into one indexed geometry. */
function mergeGeos(list) {
  let nv = 0, ni = 0; for (const g of list) { nv += g.attributes.position.count; ni += g.index.count; }
  const pos = new Float32Array(nv * 3), nor = new Float32Array(nv * 3), col = new Float32Array(nv * 3), ind = new Uint32Array(ni);
  let ov = 0, oi = 0;
  for (const g of list) {
    pos.set(g.attributes.position.array, ov * 3); nor.set(g.attributes.normal.array, ov * 3); col.set(g.attributes.color.array, ov * 3);
    const ix = g.index.array; for (let i = 0; i < ix.length; i++) ind[oi + i] = ix[i] + ov;
    ov += g.attributes.position.count; oi += ix.length;
  }
  const m = new THREE.BufferGeometry();
  m.setAttribute('position', new THREE.BufferAttribute(pos, 3)); m.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); m.setAttribute('color', new THREE.BufferAttribute(col, 3)); m.setIndex(new THREE.BufferAttribute(ind, 1));
  return m;
}

/**
 * The block texture atlas: 4 × 4 tiles of 32 px, light grey patterns (multiplied by each block's colour):
 * 0 plain, 1 brick, 2 planks, 3 cobble, 4 roof tiles, 5 glass, 6 steel plate, 7 leaves, 8 toy studs, 9 candy swirl,
 * 10 sand, 11 bark, 12 star, 13 gold, 14 panel, 15 ice.
 */
function drawAtlas(x) {
  const T = 32, R = (() => { let a = 99; return () => ((a = (a * 16807) % 2147483647) / 2147483647); })();
  const tile = (i, draw) => { x.save(); x.translate((i % 4) * T, Math.floor(i / 4) * T); x.beginPath(); x.rect(0, 0, T, T); x.clip(); draw(); x.restore(); };
  const base = (v, n = 0.05) => { x.fillStyle = `rgb(${v},${v},${v})`; x.fillRect(0, 0, T, T); for (let k = 0; k < 120; k++) { const c = Math.round(v * (1 - n + R() * n * 2)); x.fillStyle = `rgb(${c},${c},${c})`; x.fillRect(Math.floor(R() * T), Math.floor(R() * T), 2, 2); } };
  const line = (v, rects) => { x.fillStyle = `rgb(${v},${v},${v})`; for (const r of rects) x.fillRect(...r); };
  tile(0, () => base(250, 0.03));
  tile(1, () => { base(245, 0.06); line(200, [[0, 0, T, 2], [0, 16, T, 2], [8, 0, 2, 16], [24, 16, 2, 16]]); });
  tile(2, () => { base(240, 0.05); line(195, [[0, 10, T, 2], [0, 21, T, 2], [0, 31, T, 1], [20, 0, 2, 10], [6, 12, 2, 9], [26, 23, 2, 8]]); for (let k = 0; k < 10; k++) line(220, [[Math.floor(R() * 28), Math.floor(R() * 30), 4, 1]]); });
  tile(3, () => { base(235, 0.08); line(190, [[0, 0, T, 2], [0, 11, T, 2], [0, 22, T, 2], [10, 0, 2, 11], [22, 11, 2, 11], [6, 22, 2, 10], [26, 22, 2, 10]]); });
  tile(4, () => { base(245, 0.04); for (let r = 0; r < 4; r++) { line(205, [[0, r * 8 + 6, T, 2]]); for (let c = 0; c < 4; c++) line(215, [[c * 8 + (r % 2) * 4, r * 8, 1, 8]]); } });
  tile(5, () => { base(250, 0.01); line(215, [[0, 0, T, 3], [0, 29, T, 3], [0, 0, 3, T], [29, 0, 3, T]]); x.fillStyle = 'rgba(255,255,255,1)'; x.save(); x.translate(10, 6); x.rotate(0.7); x.fillRect(0, 0, 4, 18); x.fillRect(8, 0, 2, 12); x.restore(); });
  tile(6, () => { base(240, 0.03); line(205, [[0, 0, T, 1], [0, 31, T, 1], [0, 0, 1, T], [31, 0, 1, T]]); for (const [a, b] of [[4, 4], [26, 4], [4, 26], [26, 26]]) { line(200, [[a, b, 3, 3]]); line(255, [[a, b, 1, 1]]); } });
  tile(7, () => { base(235, 0.14); for (let k = 0; k < 40; k++) { const v = R() < 0.5 ? 205 : 255; line(v, [[Math.floor(R() * 30), Math.floor(R() * 30), 3, 2]]); } });
  tile(8, () => { base(245, 0.02); for (const [a, b] of [[8, 8], [24, 8], [8, 24], [24, 24]]) { x.fillStyle = 'rgb(210,210,210)'; x.beginPath(); x.arc(a, b + 1, 6, 0, 7); x.fill(); x.fillStyle = 'rgb(255,255,255)'; x.beginPath(); x.arc(a, b - 0.5, 5, 0, 7); x.fill(); } });
  tile(9, () => { base(248, 0.02); for (let k = 0; k < 7; k++) { x.fillStyle = 'rgb(220,220,220)'; x.beginPath(); x.arc(R() * 30 + 1, R() * 30 + 1, 2.4, 0, 7); x.fill(); } line(255, [[2, 2, 10, 2]]); });
  tile(10, () => { base(245, 0.1); for (let k = 0; k < 60; k++) line(R() < 0.5 ? 215 : 255, [[Math.floor(R() * T), Math.floor(R() * T), 1, 1]]); });
  tile(11, () => { base(230, 0.06); for (let c = 0; c < 6; c++) line(195, [[c * 6 + Math.floor(R() * 2), 0, 2, T]]); });
  tile(12, () => { base(255, 0); x.fillStyle = 'rgb(225,225,225)'; x.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 6 : 13; x.lineTo(16 + Math.cos(a) * r, 17 + Math.sin(a) * r); } x.closePath(); x.fill(); });
  tile(13, () => { base(240, 0.04); line(255, [[3, 3, 26, 3], [3, 3, 3, 26]]); line(205, [[3, 27, 26, 2], [27, 3, 2, 26]]); });
  tile(14, () => { base(245, 0.02); line(200, [[0, 15, T, 2], [15, 0, 2, 15]]); line(255, [[4, 4, 6, 2]]); });
  tile(15, () => { base(250, 0.02); x.strokeStyle = 'rgb(220,220,220)'; x.lineWidth = 1.5; x.beginPath(); x.moveTo(4, 6); x.lineTo(14, 16); x.lineTo(10, 28); x.moveTo(14, 16); x.lineTo(28, 12); x.stroke(); });
}
/** A golden star with a dark outline, for the beacon marks. */
function drawStar(x) {
  x.clearRect(0, 0, 128, 128);
  const pts = []; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 24 : 54; pts.push([64 + Math.cos(a) * r, 68 + Math.sin(a) * r]); }
  x.lineJoin = 'round'; x.beginPath(); pts.forEach(([a, b], i) => (i ? x.lineTo(a, b) : x.moveTo(a, b))); x.closePath();
  x.lineWidth = 12; x.strokeStyle = '#7a4a00'; x.stroke();
  const g = x.createLinearGradient(0, 14, 0, 120); g.addColorStop(0, '#fff7b0'); g.addColorStop(0.5, '#ffd21f'); g.addColorStop(1, '#ff9f00'); x.fillStyle = g; x.fill();
  x.fillStyle = 'rgba(255,255,255,.7)'; x.beginPath(); x.ellipse(52, 48, 9, 6, -0.6, 0, 7); x.fill();
}

/** The robots' face atlas: rows = eyes (normal, X, dizzy swirl, happy), columns = 5 mouths; cyan on a dark visor. */
function drawFaces(x) {
  x.fillStyle = '#1b2440'; x.fillRect(0, 0, 640, 256);
  x.lineCap = 'round'; x.lineJoin = 'round';
  for (let e = 0; e < 4; e++) for (let m = 0; m < 5; m++) {
    x.save(); x.translate(m * 128, e * 64); x.strokeStyle = x.fillStyle = '#7dfcff'; x.lineWidth = 6;
    for (const ex of [40, 88]) {
      const ey = 24; x.beginPath();
      if (e === 0) { x.ellipse(ex, ey, 8, 11, 0, 0, Math.PI * 2); x.fill(); }
      else if (e === 1) { x.moveTo(ex - 9, ey - 9); x.lineTo(ex + 9, ey + 9); x.moveTo(ex + 9, ey - 9); x.lineTo(ex - 9, ey + 9); x.stroke(); }
      else if (e === 2) { for (let a = 0; a < 12; a += 0.3) x.lineTo(ex + Math.cos(a) * a * 0.9, ey + Math.sin(a) * a * 0.9); x.lineWidth = 4; x.stroke(); x.lineWidth = 6; }
      else { x.arc(ex, ey + 7, 10, Math.PI * 1.1, Math.PI * 1.9); x.stroke(); }
    }
    x.beginPath();
    if (m === 0) { x.arc(64, 38, 14, 0.15 * Math.PI, 0.85 * Math.PI); x.stroke(); }
    else if (m === 1) { x.arc(64, 49, 7, 0, Math.PI * 2); x.stroke(); }
    else if (m === 2) { x.moveTo(50, 50); x.lineTo(78, 50); x.stroke(); }
    else if (m === 3) { x.arc(64, 42, 14, 0, Math.PI); x.closePath(); x.fill(); }
    else { x.moveTo(46, 50); x.quadraticCurveTo(55, 42, 64, 50); x.quadraticCurveTo(73, 58, 82, 50); x.stroke(); }
    x.restore();
  }
}

/** A cardboard dare sign (512 × 340): duct tape on two corners, the text as big as fits in up to 3 lines, outlined. */
function drawSign(x, text, rtl, k) {
  const W = 512, H = 340, g = x.createLinearGradient(0, 0, 0, H);
  x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, W, H);
  g.addColorStop(0, '#e6b679'); g.addColorStop(1, '#cf9a5c'); x.fillStyle = g; x.fillRect(0, 0, W, H);
  x.strokeStyle = 'rgba(150,95,45,.2)'; x.lineWidth = 3;
  for (let i = 0; i < 9; i++) { x.beginPath(); x.moveTo(20, 40 + i * 32); x.lineTo(W - 20, 44 + i * 32); x.stroke(); }
  x.strokeStyle = 'rgba(120,70,30,.55)'; x.lineWidth = 14; x.strokeRect(7, 7, W - 14, H - 14);
  x.fillStyle = 'rgba(214,220,230,.94)';
  for (const [cx, a] of [[44, -0.6], [W - 44, 0.6]]) { x.save(); x.translate(cx, 28); x.rotate(a); x.fillRect(-48, -15, 96, 30); x.restore(); }
  const font = (n) => `800 ${n}px "Baloo 2","Baloo Bhaijaan 2","Baloo Da 2","Noto Sans","Noto Sans Devanagari","Noto Sans Bengali","Noto Sans Arabic",sans-serif`;
  const words = String(text).split(' '); let size = 92, lines = [];
  for (; size >= 30; size -= 4) {
    x.font = font(size); lines = []; let cur = '';
    for (const w of words) { const t = cur ? cur + ' ' + w : w; if (!cur || x.measureText(t).width <= 440) cur = t; else { lines.push(cur); cur = w; } }
    if (cur) lines.push(cur);
    if (lines.length <= 3 && lines.every((l) => x.measureText(l).width <= 440) && lines.length * size * 1.1 <= 260) break;
  }
  x.direction = rtl ? 'rtl' : 'ltr'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.lineJoin = 'round';
  const fills = ['#ffffff', '#fff07a', '#bff6ff', '#ffd0ec'], lh = size * 1.1, y0 = H / 2 + 6 - (lines.length - 1) * lh / 2;
  lines.forEach((l, i) => { x.lineWidth = size * 0.24; x.strokeStyle = '#2b1d4f'; x.strokeText(l, W / 2, y0 + i * lh); x.fillStyle = fills[k % 4]; x.fillText(l, W / 2, y0 + i * lh); });
}
