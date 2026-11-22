// PROTOTYPE - NOT FOR PRODUCTION
// The 3D look of Block Smash Crew (Three.js r187, global THREE from index.html): voxel chunks with baked corner
// shading, the demolition kid with his giant hammer, flying blocks, dust, coins that fly to the hero, explosions,
// falling pieces, star beacons, the chest, a bright sky and a camera on a spring behind the hero that cuts away the
// roof when he is inside. World coordinates are grid coordinates (1 unit = 1 block).
/* global THREE */
import { meshRegion, raycast } from './voxels.js';
import { placeOf } from './world.js';
import { cooldownOf } from './logic.js';
import { standingPoints, limbJoint } from './bots.js';

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
  // the sun stands in front and to the right of the building (cfg.look): the front is lit, the left side in shade
  const LK = cfg.look;
  const hemi = new THREE.HemisphereLight('#e4f4ff', '#8fcf6a', LK.hemi); scene.add(hemi);
  const sun = new THREE.DirectionalLight('#fff4dc', LK.sun); sun.position.set(LK.sunDir[0], LK.sunDir[1], LK.sunDir[2]).multiplyScalar(50); scene.add(sun); scene.add(sun.target);
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
    // voxel trees in the middle distance, so the land between the lot and the hills is not bare
    for (let i = 0; i < LK.trees; i++) {
      const a = rnd() * Math.PI * 2, r = 58 + rnd() * 30, tx = 18 + Math.cos(a) * r, tz = 20 + Math.sin(a) * r, th = 3 + rnd() * 3;
      for (const [w, hh, y, c] of [[1.2, th, th / 2, '#8a5a2e'], [4.6, 3.6, th + 1.6, rnd() < 0.5 ? '#3fae4a' : '#58c456'], [3, 2, th + 4.2, '#58c456']]) {
        m4.compose(new THREE.Vector3(tx, y, tz), new THREE.Quaternion(), new THREE.Vector3(w, hh, w)); const g = geo.clone().applyMatrix4(m4); col.set(c);
        const ca = new Float32Array(g.attributes.position.count * 3); for (let k = 0; k < ca.length; k += 3) { ca[k] = col.r; ca[k + 1] = col.g; ca[k + 2] = col.b; }
        g.setAttribute('color', new THREE.BufferAttribute(ca, 3)); parts.push(g);
      }
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
  const reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const vmScene = new THREE.Scene();
  vmScene.add(new THREE.HemisphereLight('#e4f4ff', '#a08060', 2.2)); const vmSun = new THREE.DirectionalLight('#fff4dc', 2); vmSun.position.set(1, 2, 1.5); vmScene.add(vmSun);
  const vmCam = new THREE.PerspectiveCamera(60, 720 / 1280, 0.01, 10);
  const rig = new THREE.Group(); rig.position.set(0.1, -0.29, -0.6); rig.scale.setScalar(0.36); vmScene.add(rig); // sized for the narrow portrait view: the hammer head ±1/3 of the width // the right hand, low right of the view
  // the sleeve is long enough to leave the view at the bottom wherever the hand goes (its hand end is where it always was)
  const arm = new THREE.Group(); rig.add(arm);
  {
    // the forearm along the old sleeve line: a round sleeve, narrow at the wrist and wider towards the elbow, a white
    // knit cuff at the glove and two thin hi-vis bands (the full-length yellow stripe read as a plank from above)
    const AR = cfg.feel.arm, ax = [0, -Math.sin(0.2), Math.cos(0.2)], he = [0.06, -0.0254, 0.0305];
    const tube = (r0, r1, len, t, mat) => { const m = part(keep(new THREE.CylinderGeometry(r1, r0, len, 10)), mat, he[0] + ax[0] * (t + len / 2), he[1] + ax[1] * (t + len / 2), he[2] + ax[2] * (t + len / 2), arm); m.rotation.x = Math.PI / 2 + 0.2; return m; };
    tube(AR.wrist, AR.elbow, AR.len, 0.06, lam(AR.sleeve));
    tube(AR.wrist + 0.012, AR.wrist + 0.012, 0.09, 0, lam(AR.cuff));
    const bm = lam(AR.band);
    for (const t of AR.bands) { const r = AR.wrist + (AR.elbow - AR.wrist) * (t / AR.len) + 0.006; tube(r, r, AR.bandW, t, bm); }
    // the work glove: palm, a darker row of fingers wrapped around the grip, a thumb
    const gl = lam(AR.glove), gd = lam(AR.gloveDark);
    part(box(0.19, 0.19, 0.19), gl, 0.02, 0, 0, rig); part(box(0.2, 0.09, 0.1), gd, 0.02, 0.03, -0.08, rig); part(box(0.07, 0.11, 0.09), gl, -0.1, 0.02, -0.02, rig);
  }
  const held = {};
  // the hammer: one geometry and one material (a heavy toy sledge: steel head with chamfered edges and two striking
  // faces, a red band, a collar, a wooden handle with a grip wrap and a pommel). Its steel mirrors a tiny sky map;
  // the low tier draws it with a plain material and no reflection.
  const HM = cfg.feel.hammer, HL = HM.look, MO = HM.motion;
  const hamMap = tex(256, 128, (x) => drawHammerMap(x, HL)); hamMap.generateMipmaps = false; hamMap.minFilter = THREE.LinearFilter;
  const hamOrm = tex(256, 128, (x) => drawHammerOrm(x)); hamOrm.colorSpace = THREE.NoColorSpace; hamOrm.generateMipmaps = false; hamOrm.minFilter = THREE.LinearFilter;
  const hamStd = keep(new THREE.MeshStandardMaterial({ map: hamMap, roughnessMap: hamOrm, metalnessMap: hamOrm, roughness: 1, metalness: 1, envMapIntensity: HL.envIntensity }));
  const hamLow = keep(new THREE.MeshLambertMaterial({ map: hamMap }));
  const hamMesh = new THREE.Mesh(keep(hammerGeometry(HL)), hamStd);
  { const g = new THREE.Group(); g.add(hamMesh); g.rotation.set(HL.tilt[0], HL.tilt[1], HL.tilt[2]); held.hammer = g; }
  // the sky the steel mirrors: one small map per theme, made the first time it is needed (never on the low tier)
  const envs = new Map(); let envName = 'day', envOn = '';
  function envFor(name) {
    let rt = envs.get(name);
    if (!rt) {
      const t = cfg.themes[name] || cfg.themes.day, c = document.createElement('canvas'); c.width = 128; c.height = 64; drawEnv(c.getContext('2d'), t, 128, 64);
      const src = new THREE.CanvasTexture(c); src.colorSpace = THREE.SRGBColorSpace; src.mapping = THREE.EquirectangularReflectionMapping;
      const pm = new THREE.PMREMGenerator(renderer); rt = pm.fromEquirectangular(src); pm.dispose(); src.dispose(); envs.set(name, rt);
    }
    return rt.texture;
  }
  // a lost WebGL context takes the sky maps with it (they are render targets): on restore they are dropped and made
  // again on the next frame; the canvas textures and geometries are uploaded again by the renderer itself
  const onRestored = () => { for (const rt of envs.values()) rt.dispose(); envs.clear(); envOn = ''; };
  cv.addEventListener('webglcontextrestored', onRestored);
  /** The hammer's material for the tier: mirrored steel, or the plain one (low tier). */
  function hammerLook() {
    hamMesh.material = low ? hamLow : hamStd;
    const key = (low ? 'L' : 'S') + envName; if (key === envOn) return; envOn = key;
    // the other tools in the hand follow the tier the same way
    for (const k of Object.keys(held)) held[k].traverse((m) => { if (m.userData.pair) m.material = low ? m.userData.pair.low : m.userData.pair.std; });
    if (!low) { const t = envFor(envName); hamStd.envMap = t; hamStd.needsUpdate = true; for (const pr of tierMats) { pr.std.envMap = t; pr.std.needsUpdate = true; } }
  }
  // toy materials for the other tools: a mirrored one and its plain twin for the low tier
  const tierMats = [];
  const toy = (o) => { const pr = { std: keep(new THREE.MeshStandardMaterial({ envMapIntensity: HL.envIntensity, ...o })), low: keep(new THREE.MeshLambertMaterial({ color: o.color || '#ffffff', map: o.map || null, emissive: o.emissive || '#000000', emissiveIntensity: o.emissiveIntensity === undefined ? 1 : o.emissiveIntensity, flatShading: !!o.flatShading, side: o.side || THREE.FrontSide })) }; tierMats.push(pr); return pr; };
  const tpart = (geo, pr, x, y, z, parent) => { const m = part(geo, low ? pr.low : pr.std, x, y, z, parent); m.userData.pair = pr; return m; };
  const TG = {}, tg = (k, make) => TG[k] || (TG[k] = keep(make()));
  // the tool that just left the hand: its kind and the seconds since (the fire animation runs on it)
  const fr = { kind: null, t: 0 };
  // the hammer's motion: springs for the look lag and the recoil, the swing's own state
  let frameN = 0;
  const ham = { prevT: -1, landF: -9, swingEv: false, sx: 0, sy: 0, svx: 0, svy: 0, rec: 0, recV: 0, imp: 0, run: 0, yaw: 0, pitch: 0, landed: false, aimed: true, clang: false };
  const motionK = reduced ? MO.reduced : 1;
  const armRest = new THREE.Vector3(0, -Math.sin(0.2), Math.cos(0.2)), armNow = new THREE.Vector3(), armQ = new THREE.Quaternion(), rigQ = new THREE.Quaternion();
  const elbow = new THREE.Vector3(MO.rest[0], MO.rest[1], MO.rest[2]).addScaledVector(armRest, MO.elbow);
  // the flash where the hammer lands: one sprite, shown for a few frames
  const hitFlash = new THREE.Sprite(keep(new THREE.SpriteMaterial({ map: tex(64, 64, (x) => drawFlash(x)), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })));
  hitFlash.visible = false; hitFlash.renderOrder = 5; scene.add(hitFlash);
  const HF = { t: 1, life: 0.1, size: 1 };
  // a second one for blasts, sized by the blast's radius
  const boomFlash = new THREE.Sprite(keep(new THREE.SpriteMaterial({ map: hitFlash.material.map, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })));
  boomFlash.visible = false; boomFlash.renderOrder = 5; scene.add(boomFlash);
  const BF = { t: 1, life: 0.1, size: 1 };
  // the other five are built further down (they share parts with the shots that fly)
  for (const k of ['bomb', 'rocket', 'ball', 'hole', 'meteor']) held[k] = new THREE.Group();
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
  // per piece: how it bounces, seconds of glint left, its own colour (the glint brightens it for a moment)
  D.b = new Float32Array(debrisMax); D.g = new Float32Array(debrisMax); D.g0 = new Float32Array(debrisMax); D.c = new Float32Array(debrisMax * 3);
  // fragments, hanging dust, scorch marks and dust rings follow the tier's caps (cfg.quality.fx)
  const FR = cfg.feel.frags, FB = cfg.feel.blast, fxTier = () => (low ? cfg.quality.fx.low : cfg.quality.fx.high);
  let fragBudget = Infinity;
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
  const ballTex = tex(128, 64, (x, w, h) => { x.fillStyle = '#ff5a8a'; x.fillRect(0, 0, w, h); x.fillStyle = '#fff'; for (let i = 0; i < 4; i++) x.fillRect(i * 32, 0, 12, h); x.fillStyle = '#ffd12e'; x.fillRect(0, h * 0.42, w, h * 0.16); });
  // ---- the five other tools: one builder each, used for the tool in the hand and for the shot that flies
  const FL = cfg.feel, basic = (c, o = {}) => keep(new THREE.MeshBasicMaterial({ color: c, ...o }));
  const glowTex = tex(32, 32, (x) => { const g = x.createRadialGradient(16, 16, 0, 16, 16, 16); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.4, 'rgba(255,255,255,.45)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 32, 32); });
  const glowMats = {}, glow = (c, size, parent, own) => { const m = own ? keep(new THREE.SpriteMaterial({ map: glowTex, color: c, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })) : (glowMats[c] || (glowMats[c] = keep(new THREE.SpriteMaterial({ map: glowTex, color: c, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })))); const sp = new THREE.Sprite(m); sp.scale.set(size, size, 1); parent.add(sp); return sp; };
  const rockOpts = { color: FL.meteor.look.rock, emissive: FL.meteor.look.glow, emissiveIntensity: FL.meteor.look.heat, roughness: 0.9, metalness: 0, flatShading: true };
  const TM = {
    iron: toy({ color: FL.bomb.look.iron, roughness: 0.36, metalness: 0.9 }), brass: toy({ color: FL.bomb.look.cap, roughness: 0.3, metalness: 1 }), fuse: toy({ color: FL.bomb.look.fuse, roughness: 0.9, metalness: 0 }),
    shell: toy({ color: FL.rocket.look.body, roughness: 0.3, metalness: 0.1 }), red: toy({ color: FL.rocket.look.nose, roughness: 0.35, metalness: 0.05 }), tube: toy({ color: FL.rocket.look.tube, roughness: 0.5, metalness: 0.25, side: THREE.DoubleSide }),
    dark: toy({ color: FL.rocket.look.metal, roughness: 0.35, metalness: 1 }), ball: toy({ map: ballTex, roughness: 0.3, metalness: 0.05 }),
    rock: toy(rockOpts), rockHeld: toy(rockOpts),
  };
  const emberMat = basic(FL.bomb.look.ember), coreMat = basic(FL.hole.look.core), rimMat = basic(FL.hole.look.rim), rimHeld = basic(FL.hole.look.rim), lampMat = basic(FL.rocket.look.wait), beaconMat = basic(FL.meteor.look.lamp);
  /** A bomb of radius 1: iron ball, brass cap, a braided fuse leaning over, an ember with its glow at the tip. */
  function mBomb(g) {
    tpart(tg('sph', () => new THREE.SphereGeometry(1, 18, 12)), TM.iron, 0, 0, 0, g);
    tpart(tg('bcap', () => new THREE.CylinderGeometry(0.3, 0.36, 0.26, 12)), TM.brass, 0, 1.02, 0, g);
    let x = 0, y = 1.15;
    for (let i = 0; i < 3; i++) { const f = tpart(tg('bfuse', () => new THREE.CylinderGeometry(0.075, 0.075, 0.27, 6)), TM.fuse, x + 0.05, y + 0.11, 0, g); f.rotation.z = -0.35 - i * 0.28; x += 0.1 + i * 0.05; y += 0.2 - i * 0.04; }
    g.userData.ember = part(tg('ember', () => new THREE.SphereGeometry(0.15, 8, 6)), emberMat, x + 0.03, y + 0.05, 0, g);
    g.userData.halo = glow(FL.bomb.look.glow, 1, g); g.userData.halo.position.copy(g.userData.ember.position);
    return g;
  }
  /** A rocket of body radius 1 pointing along +y: white body, red nose cone and band, four fins, a dark nozzle. */
  function mRocket(g) {
    tpart(tg('rbody', () => new THREE.CylinderGeometry(1, 1, 5, 12)), TM.shell, 0, 0, 0, g);
    tpart(tg('rnose', () => new THREE.ConeGeometry(1, 2.1, 12)), TM.red, 0, 3.55, 0, g);
    tpart(tg('rband', () => new THREE.CylinderGeometry(1.05, 1.05, 0.5, 12)), TM.red, 0, 1.5, 0, g);
    tpart(tg('rnoz', () => new THREE.CylinderGeometry(0.7, 0.95, 0.6, 10)), TM.dark, 0, -2.8, 0, g);
    for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2, f = tpart(tg('rfin', () => new THREE.BoxGeometry(0.16, 1.6, 1.3)), TM.red, Math.cos(a) * 1.45, -1.9, Math.sin(a) * 1.45, g); f.rotation.y = Math.PI / 2 - a; }
    return g;
  }
  /** A wrecking ball of radius 1 with a shackle on top. */
  function mBall(g) {
    g.userData.ball = tpart(tg('ball', () => new THREE.SphereGeometry(1, 24, 16)), TM.ball, 0, 0, 0, g);
    tpart(tg('shack', () => new THREE.TorusGeometry(0.3, 0.09, 6, 14)), TM.dark, 0, 1.12, 0, g.userData.ball);
    return g;
  }
  /** A meteor of radius 1: a glowing rock with a halo. */
  function mRock(g, pr, own) {
    g.userData.rock = tpart(tg('rock', () => new THREE.IcosahedronGeometry(1, 1)), pr, 0, 0, 0, g);
    g.userData.halo = glow(FL.meteor.look.halo, 3.4, g, own);
    return g;
  }
  // in the hand (the rig's units): each has charge(k), k = 0 just used ... 1 ready again; hold.rot turns it for its outline
  for (const k of ['bomb', 'rocket', 'ball', 'hole', 'meteor']) { const r = FL[k].hold.rot; if (r) held[k].rotation.set(r[0], r[1], r[2]); }
  {
    const g = held.bomb, b = mBomb(new THREE.Group()); b.scale.setScalar(0.17); b.position.set(0, 0.2, -0.05); b.rotation.z = -0.2; g.add(b);
    // just thrown: the hand is empty; the next bomb comes up into it, and its fuse is lit the moment it is ready
    g.userData.charge = (k, ready) => { const s = Math.max(0, Math.min(1, (k - 0.45) / 0.5)); b.visible = s > 0; b.scale.setScalar(0.17 * (0.3 + 0.7 * s * (2 - s))); b.position.y = 0.2 - (1 - s) * 0.16; b.userData.ember.visible = b.userData.halo.visible = ready; if (ready) { const f = 0.8 + Math.random() * 0.5; b.userData.ember.scale.setScalar(f); b.userData.halo.scale.set(f, f, 1); } };
  }
  {
    // a launcher tube on the hand with the rocket's nose looking out of its mouth; a lamp on top: red loading, green ready
    const g = held.rocket, tb = tpart(tg('ltube', () => new THREE.CylinderGeometry(0.105, 0.105, 0.75, 14, 1, true)), TM.tube, 0, 0.12, -0.2, g); tb.rotation.x = Math.PI / 2;
    tpart(tg('lring', () => new THREE.TorusGeometry(0.108, 0.022, 6, 16)), TM.dark, 0, 0.12, -0.575, g);
    tpart(tg('lrear', () => new THREE.CylinderGeometry(0.108, 0.135, 0.1, 14, 1, true)), TM.dark, 0, 0.12, 0.2, g).rotation.x = Math.PI / 2;
    tpart(box(0.05, 0.05, 0.2), TM.dark, 0, 0.245, -0.3, g);
    const lamp = part(tg('llamp', () => new THREE.SphereGeometry(0.028, 8, 6)), lampMat, 0, 0.285, -0.25, g);
    const rk = mRocket(new THREE.Group()); rk.scale.setScalar(0.075); rk.rotation.x = -Math.PI / 2; rk.position.set(0, 0.12, -0.38); g.add(rk);
    g.userData.charge = (k, ready) => { const s = Math.max(0, Math.min(1, (k - 0.5) / 0.5)), e = s * s * (3 - 2 * s); rk.visible = s > 0; rk.position.z = -0.02 - 0.36 * e; lampMat.color.set(ready ? FL.rocket.look.ready : FL.rocket.look.wait); lamp.scale.setScalar(ready ? 1.25 : 1); };
  }
  {
    // the ball rests on the hand, a short chain from its shackle falls over the glove
    const g = held.ball, b = mBall(new THREE.Group()); b.scale.setScalar(0.2); b.position.set(0, 0.27, -0.05); g.add(b);
    [[0.06, 0.545, 0.3], [0.125, 0.52, 0.7], [0.175, 0.47, 1.1], [0.2, 0.4, 1.45]].forEach(([x, y, rz], i) => { const l = tpart(tg('link', () => new THREE.TorusGeometry(0.045, 0.015, 6, 12)), TM.dark, x, y, -0.05, g); l.rotation.set(0, i % 2 ? Math.PI / 2 : 0, 0); l.rotation.z = i % 2 ? 0 : rz; });
    // just thrown: only the chain; the next ball grows back onto it
    g.userData.charge = (k) => { const s = Math.max(0, Math.min(1, (k - 0.4) / 0.6)), e = s * s * (3 - 2 * s); b.visible = s > 0; b.scale.setScalar(0.2 * e); b.position.y = 0.27 - (1 - e) * 0.1; };
  }
  {
    // an emitter cup on the hand; over it the dark core inside its bright rim, which spins up as it charges
    const g = held.hole; tpart(tg('hcup', () => new THREE.CylinderGeometry(0.1, 0.05, 0.1, 12)), TM.dark, 0, 0.13, -0.05, g); tpart(tg('hstem', () => new THREE.CylinderGeometry(0.03, 0.03, 0.1, 8)), TM.brass, 0, 0.05, -0.05, g);
    const core = part(tg('sph', () => new THREE.SphereGeometry(1, 18, 12)), coreMat, 0, 0.36, -0.05, g), rim = part(tg('hrim', () => new THREE.TorusGeometry(0.2, 0.026, 6, 24)), rimHeld, 0, 0.36, -0.05, g), halo = glow(FL.hole.look.rim, 0.7, g, true); halo.position.set(0, 0.36, -0.08);
    const cA = new THREE.Color(FL.hole.look.dim), cB = new THREE.Color(FL.hole.look.rim);
    g.userData.ring = rim;
    g.userData.charge = (k, ready) => { core.scale.setScalar(0.12 * (0.25 + 0.75 * k)); rimHeld.color.copy(cA).lerp(cB, k * k); halo.scale.setScalar(0.7 * k * (ready ? 1 + Math.sin(time * 6) * 0.08 : 0.7)); g.userData.spin = 1 + k * 5; };
  }
  {
    // a beacon dish on the hand with a lamp; over it the rock, cold and small after a call, glowing when ready
    const g = held.meteor; tpart(tg('mdish', () => new THREE.CylinderGeometry(0.12, 0.06, 0.06, 12)), TM.dark, 0, 0.12, -0.05, g); tpart(tg('hstem', () => new THREE.CylinderGeometry(0.03, 0.03, 0.1, 8)), TM.brass, 0, 0.05, -0.05, g);
    const lamp = part(tg('llamp', () => new THREE.SphereGeometry(0.028, 8, 6)), beaconMat, 0.1, 0.17, -0.05, g);
    const r = mRock(new THREE.Group(), TM.rockHeld, true); r.position.set(0, 0.36, -0.05); g.add(r);
    g.userData.charge = (k, ready) => { r.scale.setScalar(0.15 * (0.55 + 0.45 * k)); r.rotation.y = time * 0.9; r.rotation.x = time * 0.5; const heat = FL.meteor.look.heat * k * k; TM.rockHeld.std.emissiveIntensity = TM.rockHeld.low.emissiveIntensity = heat; r.userData.halo.scale.setScalar(3.4 * k * (ready ? 1 + Math.sin(time * 7) * 0.06 : 0.6)); lamp.visible = ready ? Math.sin(time * 9) > -0.3 : false; };
  }
  const holeMat = keep(new THREE.MeshBasicMaterial({ color: '#16052a' })), ringMat = keep(new THREE.MeshBasicMaterial({ color: '#b65cff', transparent: true, opacity: 0.85, side: THREE.DoubleSide }));
  // shot parts are made once and shared by every throw (a new geometry per bomb grew GPU memory all level)
  const SH = {}, sh = (k, make) => SH[k] || (SH[k] = keep(make()));
  function shotMesh(s) {
    const g = new THREE.Group();
    if (s.kind === 'bomb') { const b = mBomb(new THREE.Group()); b.scale.setScalar(0.42); g.add(b); g.userData.spark = b.userData.ember; g.userData.halo = b.userData.halo; }
    else if (s.kind === 'rocket') { const r = mRocket(new THREE.Group()); r.scale.setScalar(0.22); r.rotation.x = Math.PI / 2; g.add(r); }
    else if (s.kind === 'ball') { const b = mBall(new THREE.Group()); b.scale.setScalar(s.r); g.add(b); g.userData.ball = b.userData.ball; }
    else if (s.kind === 'hole') { part(sh('hole', () => new THREE.SphereGeometry(0.6, 16, 12)), holeMat, 0, 0, 0, g); glow(FL.hole.look.rim, 3.6, g); for (let i = 0; i < 3; i++) { const t = part(sh('ring' + i, () => new THREE.TorusGeometry(1.1 + i * 0.5, 0.08, 6, 32)), ringMat, 0, 0, 0, g); t.rotation.x = Math.PI / 2 + i * 0.3; t.userData.spin = 2 + i; } }
    else if (s.kind === 'meteor') { const r = mRock(new THREE.Group(), TM.rock, false); r.scale.setScalar(1.3); g.add(r); }
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
  const tmpV = new THREE.Vector3(), tmpQ = new THREE.Quaternion(), tmpE = new THREE.Euler(), tmpM = new THREE.Matrix4(), tmpS = new THREE.Vector3(), tmpC = new THREE.Color();
  const WHITE = new THREE.Color(1, 1, 1);

  /**
   * A broken block at (x, y, z) of material m becomes fragments of its kind (cfg.feel.frags.kinds): long tumbling
   * splinters, thin glinting shards, crumbs, bouncing soft bits, shiny chunks; steel also throws sparks. All in the one
   * debris pool (shape, colour and spin per instance). The pieces per block follow the tier and the event's budget.
   */
  function spawnDebris(x, y, z, m, cx, cy, cz, power, pullTo) {
    const K = FR.kinds[(cfg.materials[m - 1] || {}).frag] || FR.kinds.chunk, want = K.n * fxTier().frag, p = dcol[m] || [1, 1, 1];
    let pieces = Math.floor(want) + (Math.random() < want - Math.floor(want) ? 1 : 0);
    if (K.sparks && Math.random() < 0.7) sparks(x, y, z, K.sparks);
    for (; pieces > 0; pieces--) {
      if (D.n >= debrisMax * (low ? 0.5 : 1) || fragBudget <= 0) return;
      fragBudget--;
      const i = D.n++, o = i * 3, px = x + (Math.random() - 0.5) * 0.5, py = y + (Math.random() - 0.5) * 0.5, pz = z + (Math.random() - 0.5) * 0.5;
      let dx = px - cx, dy = py - cy, dz = pz - cz; const d = Math.hypot(dx, dy, dz) || 1; dx /= d; dy /= d; dz /= d;
      const sp = power * (0.6 + Math.random() * 0.8);
      D.p[o] = px; D.p[o + 1] = py; D.p[o + 2] = pz;
      D.v[o] = dx * sp + (Math.random() - 0.5) * 3; D.v[o + 1] = Math.max(0, dy) * sp + 3 + Math.random() * 5; D.v[o + 2] = dz * sp + (Math.random() - 0.5) * 3;
      for (let k = 0; k < 3; k++) { D.r[o + k] = Math.random() * 6; D.w[o + k] = (Math.random() - 0.5) * K.spin; }
      D.s[i] = K.size[0] + Math.random() * K.size[1]; D.life[i] = cfg.debris.life * (0.7 + Math.random() * 0.5);
      D.sh[o] = K.shape[0]; D.sh[o + 1] = K.shape[1]; D.sh[o + 2] = K.shape[2];
      D.b[i] = K.bounce; D.g[i] = D.g0[i] = K.glint * (0.6 + Math.random() * 0.8);
      if (pullTo) { D.pull[i * 4] = pullTo[0]; D.pull[i * 4 + 1] = pullTo[1]; D.pull[i * 4 + 2] = pullTo[2]; D.pull[i * 4 + 3] = 1; D.life[i] = 1.2; } else D.pull[i * 4 + 3] = 0;
      const j = 0.9 + Math.random() * 0.2;
      D.c[o] = p[0] * j + (1 - p[0] * j) * K.lift; D.c[o + 1] = p[1] * j + (1 - p[1] * j) * K.lift; D.c[o + 2] = p[2] * j + (1 - p[2] * j) * K.lift;
      tmpC.setRGB(D.c[o], D.c[o + 1], D.c[o + 2]); debris.setColorAt(i, tmpC);
    }
  }
  function killDebris(i) { const j = --D.n; if (i !== j) { D.b[i] = D.b[j]; D.g[i] = D.g[j]; D.g0[i] = D.g0[j]; for (let k = 0; k < 3; k++) D.c[i * 3 + k] = D.c[j * 3 + k]; for (let k = 0; k < 3; k++) { D.p[i * 3 + k] = D.p[j * 3 + k]; D.v[i * 3 + k] = D.v[j * 3 + k]; D.r[i * 3 + k] = D.r[j * 3 + k]; D.w[i * 3 + k] = D.w[j * 3 + k]; } for (let k = 0; k < 4; k++) D.pull[i * 4 + k] = D.pull[j * 4 + k]; for (let k = 0; k < 3; k++) D.sh[i * 3 + k] = D.sh[j * 3 + k]; D.s[i] = D.s[j]; D.life[i] = D.life[j]; debris.getColorAt(j, tmpC); debris.setColorAt(i, tmpC); } }
  /** n puffs of dust; hang = a slow cloud that stays in the air and drifts before it fades (cfg.feel.frags.dust). */
  function puff(x, y, z, size, color = '#f4ead8', n = 3, hang = false) {
    const HD = FR.dust, sp = hang ? HD.speed : 1;
    for (let k = 0; k < n; k++) {
      if (U.n >= dustMax * (low ? 0.5 : 1)) return;
      const i = U.n++;
      U.p[i * 3] = x + (Math.random() - 0.5) * size; U.p[i * 3 + 1] = y + Math.random() * size * 0.5; U.p[i * 3 + 2] = z + (Math.random() - 0.5) * size;
      U.v[i * 3] = (Math.random() - 0.5) * 2 * sp + (hang ? 0.35 : 0); U.v[i * 3 + 1] = (0.8 + Math.random() * 1.2) * sp; U.v[i * 3 + 2] = (Math.random() - 0.5) * 2 * sp;
      U.s[i * 2] = size * (0.5 + Math.random() * 0.6); U.life[i * 2] = 0; U.life[i * 2 + 1] = hang ? HD.life * (0.75 + Math.random() * 0.5) : 0.7 + Math.random() * 0.6;
      tmpC.set(color).offsetHSL(0, 0, (Math.random() - 0.5) * 0.06); dust.setColorAt(i, tmpC);
    }
  }
  // scorch marks on the ground: a few flat discs with one texture, each fading out at the end of its life
  const scorchTex = tex(64, 64, (x) => { x.clearRect(0, 0, 64, 64); const g = x.createRadialGradient(32, 32, 2, 32, 32, 31); g.addColorStop(0, 'rgba(30,22,18,.95)'); g.addColorStop(0.55, 'rgba(40,30,24,.7)'); g.addColorStop(1, 'rgba(40,30,24,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); for (let i = 0; i < 14; i++) { const a = i * 2.4, r = 14 + (i * 37 % 13); x.fillStyle = 'rgba(30,22,18,.35)'; x.beginPath(); x.arc(32 + Math.cos(a) * r, 32 + Math.sin(a) * r, 4 + (i % 4), 0, 7); x.fill(); } });
  const scorchGeo = keep(new THREE.PlaneGeometry(2, 2)), scorches = []; let scorchN = 0;
  /** The ground under a blast: a scorch mark and a ring of dust rolling outwards (only for blasts near the ground). */
  function groundFx(e) {
    const SC = FB.scorch, RG = FB.ring, T = fxTier();
    if (e.y - e.r > SC.ground) return;
    if (T.scorch > 0) {
      // a new mark while the tier's cap allows, else the oldest one moves here
      let it = scorches.length < T.scorch ? null : scorches.reduce((a, b) => (a.t > b.t ? a : b));
      if (!it) { const mesh = new THREE.Mesh(scorchGeo, keep(new THREE.MeshBasicMaterial({ map: scorchTex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }))); mesh.rotation.x = -Math.PI / 2; scene.add(mesh); it = { mesh, t: 0 }; scorches.push(it); }
      it.t = 0; it.mesh.visible = true; it.mesh.position.set(e.x, 0.02 + (scorchN++ % 8) * 0.002, e.z); it.mesh.rotation.z = Math.random() * 6; it.mesh.scale.setScalar(e.r * SC.size);
    }
    const n = Math.round(Math.min(RG.max, e.r * RG.per) * T.ring), a0 = Math.random() * 6;
    for (let i = 0; i < n; i++) { const a = a0 + i / n * Math.PI * 2; puff(e.x + Math.cos(a) * e.r * 0.8, 0.25, e.z + Math.sin(a) * e.r * 0.8, RG.size, RG.color, 1, T.hangDust); }
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
      // the pieces of one break: more for a bigger one, never above the cap for a hit or a blast
      fragBudget = e.by === 'hammer' ? cfg.debris.perHit : cfg.debris.perBlast;
      const power = e.by === 'hammer' ? 5 : e.by === 'ball' ? 7 : 6 + e.r * 2.2;
      const hx = W.hero.x, hz = W.hero.z;
      const cx = e.by === 'hammer' ? hx : e.x, cz = e.by === 'hammer' ? hz : e.z, cy = e.by === 'hammer' ? e.y - 0.5 : e.y - 1;
      for (let k = 0; k < cap; k++) { const c = e.removed[Math.floor(k * step)]; spawnDebris(c.x + 0.5, c.y + 0.5, c.z + 0.5, c.m, cx, cy, cz, power, e.by === 'hole' ? [e.x, e.y, e.z] : null); }
      if (e.by !== 'hole') puff(e.x, e.y - 0.3, e.z, Math.min(2.6, 0.5 + e.removed.length * 0.02), '#fbf6ec', Math.min(6, 1 + (e.removed.length >> 4)));
      // brick, stone and plaster leave a cloud in their own colour that hangs and drifts (not on the low tier)
      { const m0 = cfg.materials[(e.removed[0] || {}).m - 1]; if (e.by !== 'hole' && m0 && m0.frag === 'crumb' && fxTier().hangDust) { tmpC.set(m0.color).lerp(WHITE, FR.dust.lift); puff(e.x, e.y, e.z, FR.dust.size, '#' + tmpC.getHexString(), Math.min(FR.dust.max, 1 + Math.round(e.removed.length * FR.dust.per)), true); } }
      if (!W.demo) spawnCoins(e.x, e.y, e.z, Math.min(6, 1 + Math.floor(e.removed.length / 8)) + e.gold * 3);
      addTrauma(e.by === 'hammer' ? 0.06 : Math.min(0.5, e.removed.length / 300), e);
      if (e.by === 'hammer') hammerImpact(e, e.removed.length, (cfg.materials[(e.removed[0] || {}).m - 1] || {}), false);
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
      fragBudget = cfg.debris.perBlast;
      for (let k = 0; k < cap; k++) { const c = cells[Math.floor(k * step)], p = placeOf(e.fall, c); spawnDebris(p[0], Math.max(0.5, p[1]), p[2], c.m, e.x, e.y - 2, e.z, 4 + Math.min(8, e.n / 40)); }
      if (e.topple) kick(0.07);
      puff(e.x, 0.3, e.z, Math.min(5, 1.5 + e.n / 60), '#efe4cf', Math.min(10, 3 + (e.n >> 5)));
      if (!W.demo) spawnCoins(e.x, e.y + 1, e.z, Math.min(8, 2 + (e.n >> 5)));
      addTrauma(Math.min(0.6, 0.15 + e.n / 250), e);
    } else if (e.type === 'boom') {
      if (e.kind === 'tnt') placeBarrels();
      addBlast(e.x, e.y, e.z, e.r); blastFx(e, e.r); groundFx(e); puff(e.x, e.y, e.z, e.r * 0.6, '#ece6dc', 5); addTrauma(Math.min(0.6, 0.25 + e.r * 0.06), e); sparks(e.x, e.y, e.z, 10);
      const R = e.r + 2.6; for (let x = e.x - R; x <= e.x + R + CS; x += CS) for (let y = Math.max(0, e.y - R); y <= e.y + R + CS; y += CS) for (let z = e.z - R; z <= e.z + R + CS; z += CS) markCell(Math.floor(Math.min(x, e.x + R)), Math.floor(Math.min(y, e.y + R)), Math.floor(Math.min(z, e.z + R))); // scorch shows
      kick(Math.min(0.06, 0.02 + e.r * 0.006));
    } else if (e.type === 'detonate') { placeBarrels(); sparks(e.x, e.y + 0.6, e.z, 24); addTrauma(0.35, e);
    } else if (e.type === 'fuse') { sparks(e.x, e.y + 0.4, e.z, 8);
    } else if (e.type === 'throw') { shotMeshes.set(e.shot.id, shotMesh(e.shot)); if (!e.shot.from && FL[e.shot.kind] && FL[e.shot.kind].fire) toolFired(e.shot.kind); }
    else if (e.type === 'pop') { puff(e.x, e.y, e.z, 2, e.kind === 'hole' ? '#c58bff' : '#ffd0e0', 6); blastFx(e, e.kind === 'hole' ? 2.5 : 1.5); }
    else if (e.type === 'roll') { if (e.first) blastFx({ kind: 'ball', x: e.x, y: e.y, z: e.z }, 1.9); }
    else if (e.type === 'clang') { puff(e.x, e.y, e.z, 0.6, '#ffe9a0', 2); addTrauma(0.05, e); hammerImpact(e, 0, null, true); hammerLanded(MO.recoil.clang, true); }
    else if (e.type === 'bonk') { sparks(e.x, e.y, e.z, e.again ? 6 : 16); puff(e.x, e.y, e.z, 0.5, '#ffffff', 2); if (!e.again) addTrauma(0.08, e); if (e.by === 'hammer' && !e.again) hammerLanded(MO.recoil.bot, false); }
    else if (e.type === 'swing') { ham.swingEv = true; ham.landed = false; ham.clang = false; ham.aimed = !!(W && (W.hero.swingCell || W.hero.swingBot)); }
    else if (e.type === 'hit') hammerLanded(e.n > 0 ? MO.recoil.base + MO.recoil.perBlock * e.n : MO.recoil.air, false, e.n);
    else if (e.type === 'super') hammerLanded(MO.recoil.super, false);
    else if (e.type === 'reboot') { sparks(e.x, e.y + 0.4, e.z, 8); puff(e.x, 0.5, e.z, 0.5, '#bdf3ff', 2); }
    else if (e.type === 'treasure') { spawnCoins(e.x, 1.4, e.z, 24); puff(e.x, 1, e.z, 2, '#fff3a0', 6); }
    else if (e.type === 'star') { puff(e.x, e.y, e.z, 1.6, '#fff3a0', 5); }
  }
  function kick(a) { cam.kick = (cam.kick || 0) + (reduced ? a * 0.3 : a); }
  /**
   * The hammer has landed with strength k (0..recoil.max): the hand bounces back, the head squashes, and the view
   * nods and widens for a moment (not in the attract mode). n = blocks broken; clang = it bounced off steel.
   */
  function hammerLanded(k, clang, n = 0) {
    const R = MO.recoil, C = HM.camera; k = Math.min(R.max, k);
    ham.landF = frameN;
    ham.landed = true; ham.clang = !!clang; ham.recV += R.kick * k; ham.imp = Math.min(1, k);
    if (W && W.demo) return;
    if (clang) { kick(C.kickClang); punch(C.fovClang); } else if (n > 0) { kick(Math.min(C.kickMax, C.kick + C.kickPer * n)); punch(C.fov + C.fovPer * n); }
  }
  /**
   * A thrown tool has just left the hand (the world lets it go the moment it is used): the fire animation starts,
   * the hand recoils by the tool's size and the view nods and widens a touch (not in the attract mode).
   */
  function toolFired(kind) {
    const T = FL[kind]; fr.kind = kind; fr.t = 0; ham.recV += MO.recoil.kick * T.recoil.kick;
    if (W && W.demo) return;
    kick(T.camera.kick); punch(T.camera.fov);
  }
  /** A blast of radius r at e: a flash sized by it, and the view widens by the tool's size, less the farther away. */
  function blastFx(e, r) {
    const T = FL[e.kind] && FL[e.kind].flash ? FL[e.kind] : FL.bomb, d = W ? Math.hypot(e.x - W.hero.x, e.z - W.hero.z) : 0, fall = Math.max(0, 1 - d / FL.shakeRange);
    BF.t = 0; BF.life = T.flash.life; BF.size = T.flash.size * r; boomFlash.position.set(e.x, e.y, e.z); boomFlash.material.color.set(T.flash.color); boomFlash.material.rotation = Math.random() * Math.PI; boomFlash.visible = true; flash.color.set(T.flash.color);
    if (!(W && W.demo)) punch(T.camera.boomFov * fall);
  }
  /** A brief widening of the view (degrees), the biggest one wins; smaller with reduced motion. */
  function punch(deg) { const C = HM.camera, v = Math.min(C.fovMax, deg) * (reduced ? MO.reduced : 1); cam.punch = Math.max(cam.punch || 0, v); }
  /**
   * Where the hammer lands: a flash and sparks sized by the n blocks broken and a puff in the material's colour, at
   * the point of the hit block nearest the eye. clang = steel that did not break (more sparks, a cold flash).
   */
  function hammerImpact(e, n, mat, clang) {
    const I = HM.impact, F = I.flash, S = I.sparks;
    tmpV.set(camera.position.x - e.x, camera.position.y - e.y, camera.position.z - e.z); const d = tmpV.length() || 1, k = Math.min(I.toEye, d * 0.5) / d;
    const x = e.x + tmpV.x * k, y = e.y + tmpV.y * k, z = e.z + tmpV.z * k;
    HF.t = 0; HF.life = F.life; HF.size = Math.min(F.max, F.size + F.per * Math.sqrt(n)) * (clang ? 1.25 : 1);
    hitFlash.position.set(x, y, z); hitFlash.material.color.set(clang ? F.clang : F.color); hitFlash.material.rotation = Math.random() * Math.PI; hitFlash.visible = true;
    flash.position.set(x, y, z); flash.intensity = Math.max(flash.intensity, Math.min(F.lightMax, F.light + n));
    const soft = mat && mat.frag === 'soft';
    sparks(x, y, z, clang ? S.clang : Math.round(Math.min(S.max, S.base + S.per * n) * (soft ? S.soft : 1)));
    if (mat && mat.color) { const D = I.dust, pn = low ? Math.ceil(D.n / 2) : D.n; tmpC.set(mat.color).lerp(WHITE, 0.45); puff(x, y, z, D.size + D.per * n, '#' + tmpC.getHexString(), pn); }
  }
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
  // the lawn around the lot: tone patches and grass tufts as one mesh, made again for each level
  const decoMat = keep(new THREE.MeshLambertMaterial({ vertexColors: true })); let deco = null;
  function buildDeco() {
    if (deco) { scene.remove(deco); deco.geometry.dispose(); deco = null; }
    const P = [], C = [], b = W.box, S = LK.spread, px = (b.x0 + b.x1 + 1) / 2;
    let a = 1234 + W.n * 77; const rnd = () => ((a = (a * 16807) % 2147483647) / 2147483647);
    const x0 = b.x0 - S, x1 = b.x1 + 1 + S, z0 = b.z0 - S, z1 = W.g.D + 14;
    // free lawn only: not under a block, not inside the building's footprint, not on the path
    const free = (x, z, m) => !(x > b.x0 - m && x < b.x1 + 1 + m && z > b.z0 - m && z < b.z1 + 1 + m) && !(Math.abs(x - px) < 2.2 + m && z > b.z1) && !(x >= 0 && z >= 0 && x < W.g.W && z < W.g.D && W.g.get(Math.floor(x), 0, Math.floor(z)));
    const tri = (p, q, r, v) => { P.push(p[0], p[1], p[2], q[0], q[1], q[2], r[0], r[1], r[2]); for (let i = 0; i < 3; i++) C.push(v, v, v); };
    for (let i = 0; i < LK.patches; i++) {
      const x = x0 + rnd() * (x1 - x0), z = z0 + rnd() * (z1 - z0), r = 0.9 + rnd() * 1.6, v = rnd() < 0.6 ? 0.76 + rnd() * 0.1 : 1.1 + rnd() * 0.08, y = 0.012 + i * 0.0004, sq = 0.6 + rnd() * 0.4, a0 = rnd() * 6;
      if (!free(x, z, r)) continue;
      for (let k = 0; k < 6; k++) { const a1 = a0 + k * Math.PI / 3, a2 = a1 + Math.PI / 3; tri([x, y, z], [x + Math.cos(a2) * r, y, z + Math.sin(a2) * r * sq], [x + Math.cos(a1) * r, y, z + Math.sin(a1) * r * sq], v); }
    }
    for (let i = 0; i < LK.tufts; i++) {
      const x = x0 + rnd() * (x1 - x0), z = z0 + rnd() * (z1 - z0), w = 0.1 + rnd() * 0.1, h = 0.25 + rnd() * 0.35, v = 0.72 + rnd() * 0.4;
      if (!free(x, z, 0.3)) continue;
      const t = [x + (rnd() - 0.5) * 0.1, h, z + (rnd() - 0.5) * 0.1], c = [[x - w, 0, z - w], [x + w, 0, z - w], [x + w, 0, z + w], [x - w, 0, z + w]];
      for (let k = 0; k < 4; k++) tri(c[k], t, c[(k + 1) % 4], v * (k % 2 ? 0.9 : 1));
    }
    const g = new THREE.BufferGeometry(), N = new Float32Array(P.length); for (let i = 1; i < N.length; i += 3) N[i] = 1;
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(P), 3)); g.setAttribute('normal', new THREE.BufferAttribute(N, 3)); g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(C), 3));
    deco = new THREE.Mesh(g, decoMat); deco.receiveShadow = true; deco.frustumCulled = false; scene.add(deco);
  }
  /** The level's look: day, warm sunset or snow (always bright: sky, light, ground tint, snowflakes). */
  function setTheme(name) {
    const t = cfg.themes[name] || cfg.themes.day;
    SKY_TOP.set(t.top); SKY_LOW.set(t.low); scene.fog.color.set(t.low); sun.color.set(t.sun); hemi.groundColor.set(t.hemiG);
    ground.material.color.set(t.ground); ground.material.map = name === 'snow' ? snowTex : grassTex; flakes.visible = name === 'snow';
    envName = cfg.themes[name] ? name : 'day';
    decoMat.color.set(t.tuft || '#63c843');
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
    // arms and legs: an upper and a lower part each, a hand or a foot at the end
    const arm = () => ({ up: add(g, col, 0.11, 1, 0.11), low: add(g, col, 0.11, 1, 0.11), end: add(g, botWhite, 0.15, 0.15, 0.15) });
    const leg = () => ({ up: add(g, botDark, 0.14, 1, 0.14), low: add(g, botDark, 0.14, 1, 0.14), end: add(g, botDark, 0.17, 0.1, 0.27) });
    const limbs = [arm(), arm(), leg(), leg()];
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
  /**
   * One arm or leg of a bot: from its shoulder or hip (the body point c moved sideways by `out` and along the spine
   * by `drop`) to the hand or foot e, bent at an elbow (backwards and outwards) or a knee (forwards).
   */
  const limbR = [0, 0, 0];
  function limb(L, c, e, out, drop, len, t, knee) {
    limbR[0] = c[0] + bx.x * out + by.x * drop; limbR[1] = c[1] + bx.y * out + by.y * drop; limbR[2] = c[2] + bx.z * out + by.z * drop;
    const s = Math.sign(out), j = knee ? limbJoint(limbR, e, len, [bz.x, bz.y, bz.z]) : limbJoint(limbR, e, len, [bx.x * s * 0.6 - bz.x, bx.y * s * 0.6 - bz.y, bx.z * s * 0.6 - bz.z]);
    along(L.up, limbR, j, t); along(L.low, j, e, t);
    // the hand sits on the end; the foot stands on it, toes forward
    if (knee) L.end.position.set(e[0] + by.x * 0.05 + bz.x * 0.05, e[1] + by.y * 0.05 + bz.y * 0.05, e[2] + by.z * 0.05 + bz.z * 0.05); else L.end.position.set(e[0], e[1], e[2]);
    L.end.quaternion.copy(bq);
  }
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
      // shoulders at the sides of the chest, hips under the pelvis; lengths follow the bot's height
      const hs = b.h / 1.5;
      limb(v.limbs[0], P[1], P[3], -0.29, 0.03, 0.5 * hs, 0.11, false); limb(v.limbs[1], P[1], P[4], 0.29, 0.03, 0.5 * hs, 0.11, false);
      limb(v.limbs[2], P[2], P[5], -0.12, -0.04, 0.62 * hs, 0.14, true); limb(v.limbs[3], P[2], P[6], 0.12, -0.04, 0.62 * hs, 0.14, true);
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
    D.n = 0; U.n = 0; C.n = 0; SP.n = 0; cam.kick = 0; cam.punch = 0;
    ham.sx = ham.sy = ham.svx = ham.svy = ham.rec = ham.recV = ham.imp = 0; ham.landed = false; ham.yaw = 0; ham.pitch = cfg.camera.pitch0; hitFlash.visible = false; HF.t = 1; boomFlash.visible = false; BF.t = 1; fr.kind = null; ham.eq = 1;
    for (let cy = 0; cy * CS < W.g.H; cy++) for (let cz = 0; cz * CS < W.g.D; cz++) for (let cx = 0; cx * CS < W.g.W; cx++) buildChunk(cx, cy, cz);
    chest.position.set(W.chest.x, 0, W.chest.z); chest.rotation.y = 0; lid.rotation.x = 0; chest.visible = true;
    placeBarrels();
    for (const b of beacons) scene.remove(b.beam, b.mark); beacons.length = 0;
    const bc = makeBeacon(); bc.chest = true; beacons.push(bc);
    for (const c of W.starCells) { const b = makeBeacon(); b.cell = c; beacons.push(b); }
    const pz0 = W.box.z1 + 0.5, pz1 = W.g.D + 30; path.scale.set(1, pz1 - pz0, 1); path.position.set((W.box.x0 + W.box.x1 + 1) / 2, 0.01, (pz0 + pz1) / 2);
    cam.yaw = 0; cam.pitch = cfg.camera.pitch0; cam.eyeY = cfg.camera.eye; cam.target = null;
    buildDeco(); for (const it of scorches) it.mesh.visible = false;
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
    W = world; time += dt; frameN++;
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
    // a tool that was just thrown stays in the hand for its fire animation, even when the hand goes back to the hammer
    fr.t += dt;
    const firing = fr.kind && fr.t < fireDur(fr.kind), want = firing ? fr.kind : cam.tool || 'hammer';
    // a newly picked tool comes up from below (a thrown one is already up)
    if (want !== heldTool) { held[heldTool].visible = false; heldTool = want; ham.eq = firing ? 1 : 0; }
    held[heldTool].visible = true;
    hammerLook();
    if (heldTool === 'hammer') hammerPose(h, dt); else toolPose(h, dt);
    const EQ = FL.equip; ham.eq = Math.min(1, (ham.eq === undefined ? 1 : ham.eq) + dt / EQ.dur);
    { const d = Math.pow(1 - ham.eq, 3) * EQ.drop; rig.position.y -= d; rig.rotation.x += d * EQ.tilt; }
    // the arm reaches from the same elbow, off the bottom of the view, to wherever the hand is
    armNow.copy(elbow).sub(rig.position).normalize(); armQ.setFromUnitVectors(armRest, armNow); arm.quaternion.copy(rigQ.copy(rig.quaternion).invert()).multiply(armQ);
    if (hamStd.envMapRotation) { hamStd.envMapRotation.y = cam.yaw; for (const pr of tierMats) pr.std.envMapRotation.y = cam.yaw; }
    held.hole.userData.ring.rotation.z += dt * (held.hole.userData.spin || 4);
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
  /**
   * The hammer in the hand, in layers: the swing (wind-up, strike landing exactly at SWING_HIT, follow-through or
   * hold), the recoil spring (kicked when it lands), and a second spring that lags behind the view's turning, the
   * walk bob and the idle sway. Every number is in cfg.feel.hammer.motion.
   */
  function hammerPose(h, dt) {
    const R = MO.recoil, SW = MO.sway, I = MO.idle, t = h.swingT;
    // 1. the swing: rx is the pitch around the hand (+ back, - forward and down), o the hand's way to the strike pose
    let rx = 0, ox = 0, oy = 0, oz = 0;
    // a swing has started (the swing clock went back to its beginning): if its `swing` event did not come, the last
    // swing's state is dropped here all the same (unless this very swing has already landed, in one long frame)
    if (t >= 0 && (ham.prevT < 0 || t < ham.prevT) && !ham.swingEv) { if (ham.landF !== frameN - 1) { ham.landed = false; ham.clang = false; } ham.aimed = !!(h.swingCell || h.swingBot) || ham.landed; }
    ham.swingEv = false; ham.prevT = t;
    if (t >= 0) {
      const amp = ham.aimed ? 1 : MO.whiff, wE = Math.min(MO.windEnd, SWING_HIT - 0.05), Wd = MO.wind, St = MO.strike;
      if (t < wE) { const u = 1 - Math.pow(1 - t / wE, 3); rx = Wd.rx * u; ox = Wd.x * u; oy = Wd.y * u; oz = Wd.z * u; }
      else if (t < SWING_HIT) {
        // the strike speeds up all the way to the landing
        const u = (t - wE) / (SWING_HIT - wE), a = u * u;
        rx = Wd.rx + (St.rx - Wd.rx) * a; ox = Wd.x + (St.x - Wd.x) * a; oy = Wd.y + (St.y - Wd.y) * a; oz = Wd.z + (St.z - Wd.z) * a;
      } else {
        // after the landing: a hit holds on the block for a moment, a miss swings on through; both ease home
        const v = (t - SWING_HIT) / (1 - SWING_HIT), w = ham.landed ? Math.max(0, (v - MO.hold) / (1 - MO.hold)) : v, back = 1 - w * w * (3 - 2 * w);
        rx = St.rx * back; ox = St.x * back; oy = St.y * back; oz = St.z * back;
        if (!ham.landed) rx -= MO.overshoot * Math.sin(Math.min(1, v * 2) * Math.PI);
      }
      rx *= amp; ox *= amp; oy *= amp; oz *= amp;
    }
    // 2. the springs
    const rawRec = vmSprings(h, dt);
    ham.imp *= Math.exp(-dt * MO.squashDecay);
    // 3. put together: the recoil tips the hammer back and pulls the hand towards the eye
    const rec = rawRec;
    rig.position.set(MO.rest[0] + ox + ham.sx, MO.rest[1] + oy + ham.sy + rec * R.y, MO.rest[2] + oz + rec * R.z);
    rig.rotation.set(rx + rec + Math.sin(time * I.rate + 1) * I.tilt * motionK, ham.sx * SW.turn, h.happy > 0 ? Math.sin(time * 10) * 0.2 : 0);
    const q = MO.squash * ham.imp; held.hammer.scale.set(1 + q * 0.5, 1 - q, 1 + q * 0.5);
  }
  /** Seconds a thrown tool's fire animation lasts: its own length, never longer than its cooldown. */
  function fireDur(kind) { const cd = W ? cooldownOf(W.cfg, kind, W.fever > 0) : 0; return cd > 0 ? Math.min(FL[kind].fire.dur, cd) : FL[kind].fire.dur; }
  /** The lag spring (view turns, walk bob, idle sway) and the recoil spring, in small steps; returns the recoil. */
  function vmSprings(h, dt) {
    const R = MO.recoil, SW = MO.sway, I = MO.idle;
    let dy = cam.yaw - ham.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); const dp = cam.pitch - ham.pitch; ham.yaw = cam.yaw; ham.pitch = cam.pitch;
    ham.run += ((h.moving ? 1 : 0) - ham.run) * Math.min(1, dt * MO.bob.blend);
    ham.sx = Math.max(-SW.max, Math.min(SW.max, ham.sx + dy * SW.look * motionK)); ham.sy = Math.max(-SW.max, Math.min(SW.max, ham.sy - dp * SW.look * motionK));
    const tx = (Math.cos(cam.bob) * MO.bob.x * ham.run + Math.cos(time * I.rate * 0.5) * I.x) * motionK;
    const ty = (-Math.abs(Math.sin(cam.bob)) * MO.bob.y * ham.run + Math.sin(time * I.rate) * I.y) * motionK;
    const n = Math.max(1, Math.min(10, Math.ceil(dt / 0.006))), sd = dt / n, ws = SW.hz * Math.PI * 2, wr = R.hz * Math.PI * 2;
    for (let i = 0; i < n; i++) {
      ham.svx += ((tx - ham.sx) * ws * ws - ham.svx * 2 * SW.damp * ws) * sd; ham.sx += ham.svx * sd;
      ham.svy += ((ty - ham.sy) * ws * ws - ham.svy * 2 * SW.damp * ws) * sd; ham.sy += ham.svy * sd;
      ham.recV += (-ham.rec * wr * wr - ham.recV * 2 * R.damp * wr) * sd; ham.rec += ham.recV * sd;
    }
    return Math.max(-0.6, Math.min(1.2, ham.rec));
  }
  /**
   * Any other tool in the hand: the fire animation from the moment the shot left (a quick push to the tool's own
   * pose, then home), the shared springs, and the tool's charge: how far its cooldown has run (1 = ready again).
   */
  function toolPose(h, dt) {
    const T = FL[heldTool], F = T.fire, SW = MO.sway, I = MO.idle, dur = fireDur(heldTool), busy = fr.kind === heldTool && fr.t < dur;
    let b = 0;
    if (busy) { const u = fr.t / dur; if (u < F.peak) b = 1 - Math.pow(1 - u / F.peak, 2); else { const w = (u - F.peak) / (1 - F.peak); b = 1 - w * w * (3 - 2 * w); } }
    const rec = vmSprings(h, dt);
    rig.position.set(T.hold.pos[0] + F.to[0] * b + ham.sx, T.hold.pos[1] + F.to[1] * b + ham.sy + rec * T.recoil.y, T.hold.pos[2] + F.to[2] * b + rec * T.recoil.z);
    rig.rotation.set(F.rx * b + rec * T.recoil.rx + Math.sin(time * I.rate + 1) * I.tilt * motionK, ham.sx * SW.turn, h.happy > 0 ? Math.sin(time * 10) * 0.2 : 0);
    const total = cooldownOf(W.cfg, heldTool, W.fever > 0) || 1, k = 1 - Math.max(0, Math.min(1, (W.cool[heldTool] || 0) / total));
    // while its shot is leaving the hand, the tool shows as just used whatever the cooldown says (a free star bomb)
    ham.charge = busy ? Math.min(k, fr.t / dur * 0.4) : k;
    held[heldTool].userData.charge(ham.charge, !busy && k >= 1);
  }
  function updateShots(dt) {
    for (const [id, g] of shotMeshes) {
      const s = W.shots.find((x) => x.id === id);
      if (!s) { scene.remove(g); shotMeshes.delete(id); continue; }
      g.position.set(s.x, s.y, s.z);
      if (s.kind === 'bomb') { g.rotation.x += dt * 8; const f = 0.8 + Math.random() * 0.6; g.userData.spark.scale.setScalar(f); g.userData.halo.scale.set(f, f, 1); if (Math.random() < FL.bomb.trail) sparks(s.x, s.y + 0.3, s.z, 1); }
      else if (s.kind === 'rocket') { g.lookAt(s.x + s.dx, s.y + s.dy, s.z + s.dz); if (Math.random() < FL.rocket.trail) { puff(s.x - s.dx, s.y - s.dy, s.z - s.dz, 0.5, '#ffffff', 1); sparks(s.x - s.dx * 0.8, s.y - s.dy * 0.8, s.z - s.dz * 0.8, 1); } }
      else if (s.kind === 'ball') { g.rotation.y = Math.atan2(s.dx, s.dz); g.userData.ball.rotation.x = s.roll || 0; if (Math.random() < FL.ball.trail) puff(s.x, 0.2, s.z, 0.7, '#efe4cf', 1); }
      else if (s.kind === 'hole') { const k = Math.min(1, s.t / (s.dur * 0.6)); g.scale.setScalar(0.4 + k * 1.2 * (1 - Math.max(0, (s.t - s.dur + 0.3) / 0.3))); for (const c of g.children) if (c.userData.spin) c.rotation.z += dt * c.userData.spin; }
      else if (s.kind === 'meteor') { g.rotation.x += dt * 5; g.rotation.y += dt * 3; if (Math.random() < FL.meteor.trail) { puff(s.x, s.y + 0.5, s.z, 1.2, '#ffb347', 1); sparks(s.x, s.y, s.z, 1); } }
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
        if (D.p[o + 1] < floor) {
          D.p[o + 1] = floor; if (D.v[o + 1] < 0) D.v[o + 1] *= -D.b[i]; D.v[o] *= 0.72; D.v[o + 2] *= 0.72; for (let k = 0; k < 3; k++) D.w[o + k] *= 0.7;
          // come to rest: it lies there for a moment, then shrinks away
          if (Math.abs(D.v[o + 1]) < 1.2 && Math.abs(D.v[o]) + Math.abs(D.v[o + 2]) < FR.rest) { D.v[o] = D.v[o + 1] = D.v[o + 2] = 0; D.w[o] = D.w[o + 1] = D.w[o + 2] = 0; if (D.life[i] > FR.linger + FR.shrink) D.life[i] = FR.linger + FR.shrink; }
        }
      }
      for (let k = 0; k < 3; k++) D.r[o + k] += D.w[o + k] * dt;
      const sc = s * Math.min(1, D.life[i] / FR.shrink);
      // glass, gold and steel glint: brighter for a moment, flickering as the piece turns
      if (D.g[i] > 0) { D.g[i] -= dt; const gk = D.g[i] > 0 ? (D.g[i] / D.g0[i]) * (0.55 + 0.45 * Math.sin(D.r[o] * 3)) : 0; const gt = LK.glint; tmpC.setRGB(D.c[o] + Math.max(0, gt - D.c[o]) * gk, D.c[o + 1] + Math.max(0, gt - D.c[o + 1]) * gk, D.c[o + 2] + Math.max(0, gt - D.c[o + 2]) * gk); debris.setColorAt(i, tmpC); }
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
    for (const it of scorches) { if (!it.mesh.visible) continue; it.t += dt; const SC = FB.scorch; if (it.t >= SC.life) it.mesh.visible = false; else it.mesh.material.opacity = SC.opacity * Math.min(1, (SC.life - it.t) / SC.fade); }
    // the hammer's flash: grows a little and fades over its short life
    for (const [sp, S] of [[hitFlash, HF], [boomFlash, BF]]) { if (!sp.visible) continue; S.t += dt; const k = S.t / S.life; if (k >= 1) sp.visible = false; else { const sc = S.size * (0.65 + 0.35 * k); sp.scale.set(sc, sc, 1); sp.material.opacity = (1 - k * k) * (reduced ? 0.5 : 1); } }
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
    // the punch: the view widens a touch when the hammer lands and comes back (exponential, like the kick)
    cam.punch = (cam.punch || 0) * Math.exp(-dt * HM.camera.fovDecay);
    { const f = cc.fov + (cam.punch > 0.02 ? cam.punch : 0); if (Math.abs(f - camera.fov) > 0.005) { camera.fov = f; camera.updateProjectionMatrix(); } }
    const sh = cam.trauma * cam.trauma * 0.25;
    const st = performance.now() / 1000, sa = sh * 0.5; // summed sines at unrelated rates: a per-frame random offset buzzes like static
    camera.position.set(h.x + Math.sin(st * 39) * sa, h.y + cam.eyeY + bob + Math.sin(st * 53 + 1) * sa, h.z + Math.sin(st * 47 + 2) * sa);
    camera.rotation.set(cam.pitch + (cam.kick || 0), cam.yaw, 0, 'YXZ'); // yaw 0 looks along -z; never a roll
    sky.position.copy(camera.position);
    sun.position.set(W.g.W / 2 + LK.sunDir[0] * 50, LK.sunDir[1] * 50, W.g.D / 2 + LK.sunDir[2] * 50); sun.target.position.set(W.g.W / 2, 0, W.g.D / 2); // fixed over the lot: shadows never swim
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
    get counts() { return { scorch: scorches.filter((x) => x.mesh.visible).length, deco: deco ? deco.geometry.attributes.position.count / 3 : 0, debris: D.n, dust: U.n, coins: C.n, falls: falls.size, chunks: chunks.size, blasts: blasts.length, shots: shotMeshes.size }; },
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
    /** The low tier: no sun shadows, half the debris, dust and sparks, the hammer without its reflection. */
    setLow(v) { low = !!v; sun.castShadow = !low; hammerLook(); },
    /** The tool in the hand as drawn: which, its charge (1 = ready), seconds since it fired, the hand's place. */
    get hand() { return { landed: ham.landed, aimed: ham.aimed, envs: envs.size, tool: heldTool, charge: heldTool === 'hammer' ? 1 : ham.charge, fired: fr.kind ? fr.t : -1, kind: fr.kind, eq: ham.eq, pos: rig.position.toArray(), rx: rig.rotation.x, recoil: ham.rec, punch: cam.punch || 0, flash: boomFlash.visible, mirrored: !low && !!hamStd.envMap }; },
    /** The hammer as drawn: its tier's material, triangles, the swing's layers (for tests and tuning). */
    get hammer() { return { mirrored: hamMesh.material === hamStd && !!hamStd.envMap, tris: hamMesh.geometry.attributes.position.count / 3, rx: rig.rotation.x, pos: rig.position.toArray(), recoil: ham.rec, sway: [ham.sx, ham.sy], punch: cam.punch || 0, landed: ham.landed, flash: hitFlash.visible }; },
    /** Is world point (x, y, z) inside the view? */
    seen(x, y, z) { const [sx, sy, behind] = screenOf(x, y, z); return !behind && sx >= 0 && sx <= 720 && sy >= 0 && sy <= 1280; },
    compile() { try { renderer.compile(scene, camera); } catch (e) { /* first frame compiles instead */ } },
    dispose() {
      for (const m of chunks.values()) m.geometry.dispose(); for (const it of falls.values()) it.mesh.geometry.dispose();
      for (const b of blasts) { b.a.material.dispose(); b.b.material.dispose(); b.w.material.dispose(); }
      for (const x of disposables) x.dispose();
      for (const rt of envs.values()) rt.dispose();
      cv.removeEventListener('webglcontextrestored', onRestored);
      if (deco) deco.geometry.dispose();
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

// ---- the hammer in the hand: its shape and its three small textures, all made here
// tiles of the hammer's 256 × 128 texture, in pixels: [x, y, w, h]
const HAM_TILES = { steel: [0, 0, 64, 64], face: [64, 0, 64, 64], band: [128, 0, 64, 64], wood: [192, 0, 64, 128], grip: [0, 64, 64, 64], pommel: [64, 64, 64, 64], collar: [128, 64, 64, 64] };

/**
 * The hammer as one geometry (position, normal, uv into HAM_TILES), the handle along +y with the hand at the origin
 * and the head's two striking faces along z. K = cfg.feel.hammer.look (sizes). About 400 triangles, one draw call.
 */
function hammerGeometry(K) {
  const P = [], N = [], UV = [];
  const uv = (r, u, v) => { const [x, y, w, h] = HAM_TILES[r], m = 2.5; UV.push((x + m + u * (w - 2 * m)) / 256, 1 - (y + m + v * (h - 2 * m)) / 128); };
  // one triangle, turned so that it faces away from the point ref; flat unless normals are given
  const tri = (r, a, b, c, ref, uvs, nrm) => {
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx; const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
    const mx = (a[0] + b[0] + c[0]) / 3 - ref[0], my = (a[1] + b[1] + c[1]) / 3 - ref[1], mz = (a[2] + b[2] + c[2]) / 3 - ref[2];
    const flip = nx * mx + ny * my + nz * mz < 0, order = flip ? [0, 2, 1] : [0, 1, 2], pts = [a, b, c];
    if (flip) { nx = -nx; ny = -ny; nz = -nz; }
    for (const i of order) { const p = pts[i]; P.push(p[0], p[1], p[2]); if (nrm) N.push(nrm[i][0], nrm[i][1], nrm[i][2]); else N.push(nx, ny, nz); uv(r, uvs[i][0], uvs[i][1]); }
  };
  /** A box with every edge and corner cut off by c; rz = the tile of its two z faces (the striking faces). */
  const chamferBox = (r, cx, cy, cz, w, h, d, c, rz) => {
    const H = [w / 2, h / 2, d / 2], O = [cx, cy, cz], polys = [];
    const pt = (v) => [O[0] + v[0], O[1] + v[1], O[2] + v[2]];
    for (let a = 0; a < 3; a++) {
      const b = (a + 1) % 3, k = (a + 2) % 3;
      for (const s of [-1, 1]) {
        // the flat face
        polys.push([[1, 1], [1, -1], [-1, -1], [-1, 1]].map(([sb, sk]) => { const v = [0, 0, 0]; v[a] = s * H[a]; v[b] = sb * (H[b] - c); v[k] = sk * (H[k] - c); return pt(v); }));
        // the cut edges between this face and the two faces of the next axis
        for (const sb of [-1, 1]) {
          const q = (ia, ib, sk) => { const v = [0, 0, 0]; v[a] = s * (H[a] - (ia ? c : 0)); v[b] = sb * (H[b] - (ib ? c : 0)); v[k] = sk * (H[k] - c); return pt(v); };
          polys.push([q(0, 1, 1), q(0, 1, -1), q(1, 0, -1), q(1, 0, 1)]);
        }
      }
    }
    // the cut corners
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) polys.push([pt([sx * H[0], sy * (H[1] - c), sz * (H[2] - c)]), pt([sx * (H[0] - c), sy * H[1], sz * (H[2] - c)]), pt([sx * (H[0] - c), sy * (H[1] - c), sz * H[2]])]);
    for (const poly of polys) {
      // the texture is laid flat on whichever way the piece faces most
      const a = poly[0], b = poly[1], e = poly[2], n = [(b[1] - a[1]) * (e[2] - a[2]) - (b[2] - a[2]) * (e[1] - a[1]), (b[2] - a[2]) * (e[0] - a[0]) - (b[0] - a[0]) * (e[2] - a[2]), (b[0] - a[0]) * (e[1] - a[1]) - (b[1] - a[1]) * (e[0] - a[0])].map(Math.abs);
      const ax = n[2] >= n[0] && n[2] >= n[1] ? 2 : n[0] >= n[1] ? 0 : 1, i = (ax + 1) % 3, j = (ax + 2) % 3, reg = ax === 2 && rz ? rz : r;
      const uvs = poly.map((p) => [(p[i] - O[i]) / (2 * H[i]) + 0.5, (p[j] - O[j]) / (2 * H[j]) + 0.5]);
      for (let t = 1; t + 1 < poly.length; t++) tri(reg, poly[0], poly[t], poly[t + 1], O, [uvs[0], uvs[t], uvs[t + 1]]);
    }
  };
  /** A round piece along y from y0 (radius r0) to y1 (radius r1), smooth around, with flat caps where asked. */
  const cyl = (r, y0, y1, r0, r1, sides, cap0, cap1) => {
    const ring = (y, rad, i) => { const a = i / sides * Math.PI * 2; return [Math.cos(a) * rad, y, Math.sin(a) * rad]; };
    const nr = (i) => { const a = i / sides * Math.PI * 2; return [Math.cos(a), 0, Math.sin(a)]; };
    for (let i = 0; i < sides; i++) {
      const a = ring(y0, r0, i), b = ring(y0, r0, i + 1), c = ring(y1, r1, i + 1), e = ring(y1, r1, i), ref = [0, (y0 + y1) / 2, 0], u0 = i / sides, u1 = (i + 1) / sides;
      tri(r, a, b, c, ref, [[u0, 1], [u1, 1], [u1, 0]], [nr(i), nr(i + 1), nr(i + 1)]); tri(r, a, c, e, ref, [[u0, 1], [u1, 0], [u0, 0]], [nr(i), nr(i + 1), nr(i)]);
    }
    for (const [on, y, rad] of [[cap0, y0, r0], [cap1, y1, r1]]) {
      if (!on) continue;
      for (let i = 0; i < sides; i++) { const a = ring(y, rad, i), b = ring(y, rad, i + 1); tri(r, [0, y, 0], a, b, [0, (y0 + y1) / 2, 0], [[0.5, 0.5], [a[0] / rad * 0.5 + 0.5, a[2] / rad * 0.5 + 0.5], [b[0] / rad * 0.5 + 0.5, b[2] / rad * 0.5 + 0.5]]); }
    }
  };
  const S = K.headSize, L = K.headLen, c = K.chamfer, hr = K.handleR, top = K.handleLen - 0.16, hy = top, ft = L * 0.15;
  // handle (thicker towards the head), grip wrap, pommel
  cyl('wood', -0.13, top - S * 0.3, hr, hr * 1.12, 10, false, false);
  cyl('grip', -0.13, 0.2, hr + 0.014, hr + 0.012, 10, false, true);
  cyl('pommel', -0.2, -0.13, hr + 0.034, hr + 0.022, 10, true, true);
  // collar where the handle enters the head, and the handle's end showing on top
  cyl('collar', hy - S * 0.5 - 0.06, hy - S * 0.5 + 0.01, hr * 1.9, hr * 1.7, 10, true, false);
  cyl('wood', hy + S * 0.5, hy + S * 0.5 + 0.025, hr * 1.3, hr * 1.1, 10, false, true);
  // head: a steel core, a wider red band around the middle, two flared striking faces
  chamferBox('steel', 0, hy, 0, S * 0.84, S * 0.84, L - ft * 1.6, c * 0.7, null);
  chamferBox('band', 0, hy, 0, S * 1.02, S * 1.02, L * 0.36, c, null);
  for (const s of [-1, 1]) chamferBox('steel', 0, hy, s * (L - ft) / 2, S + K.faceFlare * 2, S + K.faceFlare * 2, ft, c, 'face');
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(P), 3)); g.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(N), 3)); g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(UV), 2));
  g.computeBoundingSphere();
  return g;
}

/** The hammer's colours (256 × 128, tiles as in HAM_TILES): brushed steel, polished faces, red paint, wood grain, grip wrap. */
function drawHammerMap(x, K) {
  const R = (() => { let a = 4242; return () => ((a = (a * 16807) % 2147483647) / 2147483647); })();
  const tile = (name, draw) => { const [tx, ty, w, h] = HAM_TILES[name]; x.save(); x.translate(tx, ty); x.beginPath(); x.rect(0, 0, w, h); x.clip(); draw(w, h); x.restore(); };
  const fill = (c, w, h) => { x.fillStyle = c; x.fillRect(0, 0, w, h); };
  const streaks = (n, w, h, light, dark, len, across) => { for (let i = 0; i < n; i++) { x.fillStyle = R() < 0.5 ? light : dark; const a = R() * w, b = R() * h, l = len * (0.4 + R()); if (across) x.fillRect(a, b, l, 1); else x.fillRect(a, b, 1, l); } };
  tile('steel', (w, h) => { fill(K.steel, w, h); streaks(60, w, h, 'rgba(255,255,255,.1)', 'rgba(20,30,50,.08)', 40, true); x.fillStyle = 'rgba(255,255,255,.2)'; x.fillRect(0, 0, w, 5); x.fillStyle = 'rgba(10,20,40,.2)'; x.fillRect(0, h - 6, w, 6); });
  tile('face', (w, h) => {
    fill(K.face, w, h);
    // a struck face: worn rings and a few dents
    x.strokeStyle = 'rgba(40,55,80,.1)'; x.lineWidth = 2; for (const r of [12, 24]) { x.beginPath(); x.arc(w / 2, h / 2, r, 0, 7); x.stroke(); }
    x.strokeStyle = 'rgba(30,40,60,.4)'; x.lineWidth = 5; x.strokeRect(1, 1, w - 2, h - 2);
    for (let i = 0; i < 9; i++) { x.fillStyle = 'rgba(30,40,60,.3)'; x.fillRect(8 + R() * (w - 16), 8 + R() * (h - 16), 2 + R() * 3, 1.5); }
  });
  tile('band', (w, h) => {
    fill(K.band, w, h); x.fillStyle = K.bandLight; x.fillRect(0, 4, w, 7);
    x.fillStyle = 'rgba(90,0,0,.3)'; x.fillRect(0, h - 9, w, 9);
    // paint chipped at the edges
    for (let i = 0; i < 10; i++) { x.fillStyle = 'rgba(215,222,232,.75)'; x.fillRect(R() < 0.5 ? R() * 3 : w - 3 - R() * 3, R() * h, 2 + R() * 2, 2 + R() * 3); }
  });
  tile('wood', (w, h) => {
    fill(K.wood, w, h);
    // grain runs along the handle: wavy darker lines, a few light ones, two knots
    for (let i = 0; i < 16; i++) { const x0 = (i + R() * 0.8) * w / 16, ph = R() * 6; x.strokeStyle = K.grain; x.globalAlpha = 0.3 + R() * 0.45; x.lineWidth = 0.8 + R() * 1.6; x.beginPath(); for (let y = 0; y <= h; y += 8) x.lineTo(x0 + Math.sin(y * 0.05 + ph) * 2, y); x.stroke(); }
    x.globalAlpha = 1; streaks(24, w, h, 'rgba(255,236,200,.3)', 'rgba(255,236,200,.18)', 34, false);
    for (const [kx, ky] of [[20, 40], [46, 92]]) { x.strokeStyle = K.grain; x.globalAlpha = 0.7; x.lineWidth = 1.4; for (const r of [2, 4.5]) { x.beginPath(); x.ellipse(kx, ky, r, r * 1.8, 0, 0, 7); x.stroke(); } }
    x.globalAlpha = 1;
  });
  tile('grip', (w, h) => { fill(K.grip, w, h); x.strokeStyle = K.gripRib; x.lineWidth = 3; for (let i = -2; i < 9; i++) { x.beginPath(); x.moveTo(0, i * 9 + 12); x.lineTo(w, i * 9); x.stroke(); } x.fillStyle = 'rgba(0,0,0,.35)'; x.fillRect(0, 0, w, 4); });
  tile('pommel', (w, h) => { fill(K.pommel, w, h); x.fillStyle = K.bandLight; x.fillRect(0, 6, w, 6); x.fillStyle = 'rgba(90,0,0,.3)'; x.fillRect(0, h - 10, w, 10); });
  tile('collar', (w, h) => { fill(K.steel, w, h); x.fillStyle = 'rgba(20,30,50,.3)'; x.fillRect(0, 0, w, h); x.fillStyle = 'rgba(255,255,255,.3)'; x.fillRect(0, h * 0.4, w, 5); });
}

/** How the hammer's surface takes light, same tiles: green = roughness, blue = metalness (steel mirrors, wood does not). */
function drawHammerOrm(x) {
  const R = (() => { let a = 777; return () => ((a = (a * 16807) % 2147483647) / 2147483647); })();
  const put = (name, rough, metal, marks) => {
    const [tx, ty, w, h] = HAM_TILES[name]; x.fillStyle = `rgb(0,${Math.round(rough * 255)},${Math.round(metal * 255)})`; x.fillRect(tx, ty, w, h);
    // scratches are rougher than the surface around them
    for (let i = 0; i < marks; i++) { x.fillStyle = `rgb(0,${Math.round(Math.min(1, rough + 0.25) * 255)},${Math.round(metal * 255)})`; x.fillRect(tx + R() * (w - 14), ty + R() * h, 6 + R() * 14, 1); }
  };
  put('steel', 0.36, 1, 30); put('face', 0.2, 1, 14); put('band', 0.42, 0, 0); put('wood', 0.78, 0, 0); put('grip', 0.95, 0, 0); put('pommel', 0.42, 0, 0); put('collar', 0.3, 1, 8);
}

/** The sky the steel mirrors (a small equirectangular picture): the theme's sky, a bright sun, a pale horizon, the ground. */
function drawEnv(x, t, w, h) {
  const sky = x.createLinearGradient(0, 0, 0, h / 2); sky.addColorStop(0, t.top); sky.addColorStop(1, t.low); x.fillStyle = sky; x.fillRect(0, 0, w, h / 2);
  const gr = x.createLinearGradient(0, h / 2, 0, h); gr.addColorStop(0, t.hemiG); gr.addColorStop(1, '#4a4038'); x.fillStyle = gr; x.fillRect(0, h / 2, w, h / 2);
  // a white band at the horizon and the sun: what makes the highlight on the head
  x.fillStyle = 'rgba(255,255,255,.75)'; x.fillRect(0, h / 2 - 5, w, 5);
  for (const [sx, sy, r] of [[w * 0.3, h * 0.2, h * 0.2], [w * 0.8, h * 0.3, h * 0.1]]) { const g = x.createRadialGradient(sx, sy, 0, sx, sy, r); g.addColorStop(0, '#ffffff'); g.addColorStop(0.45, t.sun); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(sx - r, sy - r, r * 2, r * 2); }
}

/** The flash where the hammer lands: a soft glow with an eight-point burst. */
function drawFlash(x) {
  x.clearRect(0, 0, 64, 64);
  const g = x.createRadialGradient(32, 32, 0, 32, 32, 30); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.3, 'rgba(255,255,255,.55)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64);
  x.fillStyle = 'rgba(255,255,255,.95)'; x.translate(32, 32);
  for (let i = 0; i < 8; i++) { const r = i % 2 ? 19 : 31; x.rotate(Math.PI / 4); x.beginPath(); x.moveTo(0, -r); x.lineTo(2.6, 0); x.lineTo(0, 3); x.lineTo(-2.6, 0); x.closePath(); x.fill(); }
}
