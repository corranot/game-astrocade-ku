// PROTOTYPE - NOT FOR PRODUCTION
// The toy city on an island: buildings made of plastic blocks (one InstancedMesh for every block), which bite
// off, pancake or topple like dominoes; cars that squash flat and pop back; trees and street lamps; toy residents
// that float away on balloons; soft dust clouds and confetti; sea, beach, distant hills and clouds around it.
// All gameplay randomness comes from the seeded rng passed in.
/* global THREE */ // Three.js r187, loaded by index.html (import map) and set on window before run()

// the look of the first city (Toy Town); a theme from game_config.themes replaces any of these
const TOY = {
  palette: [0x3fa9ff, 0x22c6a3, 0xffc531, 0x9b6bff, 0xff9b54, 0xff6f91, 0x5ad1ff, 0xb8e05a], roof: [0xff5a4f, 0xff7a45, 0xe8475f],
  awning: [0xff5a4f, 0x22c6a3, 0x3fa9ff, 0xffc531], window: 0xcff0ff, trim: 0xfff6e0, door: 0x8a5a3c,
  grass: ['#8fdc6a', '#84d35f', '#9be57a', '#7fcf5a', '#a6ea86'], plaza: ['#f6e7cf', '#efd6b6'], road: '#9aa3b5', sand: 0xf5dfa6,
  hills: [0x7fd36a, 0x6cc7a0, 0x9adf72], crown: [0x4cc35a, 0x6fd64b, 0x2fb37a], trunk: 0x9a6a3f, tree: 'round',
  sea: [[0.35, 0.86, 0.95], [0.16, 0.6, 0.95]], horizon: 0xcdeeff,
};
/** Hex number from a config value ("#ff00aa", "0xff00aa" or a number). */
const hex = (v) => typeof v === 'number' ? v : parseInt(String(v).replace('#', '').replace(/^0x/, ''), 16);
const GRAVITY = 32, HALF = 0.48;

/** A canvas texture drawn once (the browser's own 2D canvas; no image files). */
function canvasTexture(size, draw, repeat = 1) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  draw(c.getContext('2d'), size);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat, repeat);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}

/** Block material: toy plastic (standard PBR, reflects the sky), bevel edges in the shader, and a see-through
 *  dither for blocks between the camera and Bonbon. */
function blockMaterial() {
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.38, metalness: 0, envMapIntensity: 0.7 });
  const uniforms = { uCam: { value: new THREE.Vector3() }, uMon: { value: new THREE.Vector3() }, uR: { value: 3 } };
  m.userData.uniforms = uniforms;
  m.onBeforeCompile = (s) => {
    Object.assign(s.uniforms, uniforms);
    s.vertexShader = s.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vLocal;\nvarying vec3 vWorld;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        vLocal = position;
        vec4 wpos = vec4(transformed, 1.0);
        #ifdef USE_INSTANCING
          wpos = instanceMatrix * wpos;
        #endif
        vWorld = (modelMatrix * wpos).xyz;`);
    s.fragmentShader = s.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vLocal;\nvarying vec3 vWorld;\nuniform vec3 uCam;\nuniform vec3 uMon;\nuniform float uR;')
      .replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>
        vec3 seg = uMon - uCam; float tt = clamp(dot(vWorld - uCam, seg) / dot(seg, seg), 0.0, 1.0);
        float dd = length(vWorld - (uCam + seg * tt));
        if (tt < 0.9 && dd < uR * (0.35 + 0.65 * tt)) {
          vec2 cell = floor(gl_FragCoord.xy / 2.0);
          if (mod(cell.x + cell.y, 2.0) < 1.0 || dd < uR * 0.55 * tt) discard;
        }`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        vec3 a = abs(vLocal) / ${HALF.toFixed(2)};
        float mx = max(a.x, max(a.y, a.z)), mn = min(a.x, min(a.y, a.z));
        float mid = a.x + a.y + a.z - mx - mn;
        float edge = smoothstep(0.76, 0.98, mid);
        diffuseColor.rgb *= 1.0 - 0.32 * edge;
        diffuseColor.rgb += 0.05 * (1.0 - edge) * step(0.99, a.y);`);
  };
  return m;
}

/** Soft dust: one Points draw call, each puff a size and an alpha, drawn with a lumpy round texture. */
function dustMaterial() {
  const tex = canvasTexture(128, (g, n) => {
    for (let i = 0; i < 7; i++) {
      const x = n / 2 + Math.cos(i * 0.9) * n * 0.16 * (i ? 1 : 0), y = n / 2 + Math.sin(i * 1.3) * n * 0.14 * (i ? 1 : 0), r = n * (i ? 0.26 : 0.36);
      const gr = g.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, 'rgba(255,255,255,0.9)'); gr.addColorStop(0.6, 'rgba(255,255,255,0.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr; g.fillRect(0, 0, n, n);
    }
  });
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  return new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { uTex: { value: tex }, uScale: { value: 600 }, uColor: { value: new THREE.Color(0xf3e3c8) } },
    vertexShader: `attribute float aSize; attribute float aAlpha; attribute float aSpin; varying float vA; varying float vSpin; uniform float uScale;
      void main() { vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mv; gl_PointSize = aSize * uScale / max(0.1, -mv.z); vA = aAlpha; vSpin = aSpin; }`,
    fragmentShader: `uniform sampler2D uTex; uniform vec3 uColor; varying float vA; varying float vSpin;
      void main() { vec2 p = gl_PointCoord - 0.5; float c = cos(vSpin), s = sin(vSpin); p = vec2(c * p.x - s * p.y, s * p.x + c * p.y) + 0.5;
        vec4 t = texture2D(uTex, p); float shade = 0.82 + 0.18 * (1.0 - gl_PointCoord.y); gl_FragColor = vec4(uColor * shade, t.a * vA); if (gl_FragColor.a < 0.01) discard;
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
}

/**
 * Builds the city into `scene`. cfg is game_config; rng a seeded () => [0,1); quality the device tier.
 * Returns the city object used by game.js (see the return statement).
 */
export function createCity(scene, cfg, rng, quality, opts = {}) {
  const C = cfg.city, classes = cfg.classes;
  const TH = { ...TOY, ...(opts.theme || {}) }, cl = (v) => [].concat(v).map(hex);
  const PALETTE = cl(TH.palette), ROOF = cl(TH.roof), AWNING = cl(TH.awning), WINDOW = hex(TH.window), TRIM = hex(TH.trim), DOOR = hex(TH.door);
  const pitch = C.lotSize + C.road, span = C.lots * pitch + C.road, half = span / 2;
  const group = new THREE.Group(); scene.add(group);
  const disposables = [];
  const keep = (x) => { disposables.push(x); return x; };
  const col = new THREE.Color(), mtx = new THREE.Matrix4(), quat = new THREE.Quaternion(), qd = new THREE.Quaternion(), v3 = new THREE.Vector3(), one = new THREE.Vector3(1, 1, 1), eul = new THREE.Euler();

  // ---------- island, sea, beach, grass, plazas, roads, kerbs
  const grassTex = keep(canvasTexture(256, (g, n) => {
    g.fillStyle = TH.grass[0]; g.fillRect(0, 0, n, n);
    for (let i = 0; i < 900; i++) { g.fillStyle = TH.grass[1 + i % (TH.grass.length - 1)]; g.fillRect(Math.random() * n, Math.random() * n, 2 + Math.random() * 3, 2 + Math.random() * 3); }
  }, span / 8));
  const plazaTex = keep(canvasTexture(128, (g, n) => {
    const s = n / 4;
    for (let x = 0; x < 4; x++) for (let y = 0; y < 4; y++) { g.fillStyle = TH.plaza[(x + y) % 2]; g.fillRect(x * s, y * s, s, s); }
    g.strokeStyle = 'rgba(160,120,80,0.25)'; g.lineWidth = 2; for (let i = 0; i <= 4; i++) { g.beginPath(); g.moveTo(i * s, 0); g.lineTo(i * s, n); g.moveTo(0, i * s); g.lineTo(n, i * s); g.stroke(); }
  }, 1));
  const roadTex = keep(canvasTexture(128, (g, n) => {
    g.fillStyle = TH.road; g.fillRect(0, 0, n, n);
    for (let i = 0; i < 400; i++) { g.fillStyle = Math.random() < 0.5 ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'; g.fillRect(Math.random() * n, Math.random() * n, 2, 2); }
  }, 1));
  const island = new THREE.Mesh(keep(new THREE.CylinderGeometry(span * 0.78, span * 0.86, 2, 48)), keep(new THREE.MeshLambertMaterial({ color: hex(TH.sand) })));
  island.position.y = -1.05; island.receiveShadow = true; group.add(island);
  const grass = new THREE.Mesh(keep(new THREE.CircleGeometry(span * 0.74, 64)), keep(new THREE.MeshLambertMaterial({ map: grassTex })));
  grass.rotation.x = -Math.PI / 2; grass.position.y = -0.04; grass.receiveShadow = true; group.add(grass);
  const lotGeo = new THREE.PlaneGeometry(C.lotSize, C.lotSize); lotGeo.rotateX(-Math.PI / 2);
  const roadMat = keep(new THREE.MeshLambertMaterial({ map: roadTex }));
  const roads = new THREE.Mesh(keep(new THREE.PlaneGeometry(span, span)), roadMat);
  roads.rotation.x = -Math.PI / 2; roads.position.y = -0.01; roads.receiveShadow = true; group.add(roads);
  const plazas = new THREE.InstancedMesh(keep(lotGeo), keep(new THREE.MeshLambertMaterial({ map: plazaTex })), C.lots * C.lots);
  const kerbs = new THREE.InstancedMesh(keep(new THREE.BoxGeometry(1, 1, 1)), keep(new THREE.MeshLambertMaterial({ color: 0xeeeae2 })), C.lots * C.lots * 4);
  plazaTex.repeat.set(C.lotSize / 3, C.lotSize / 3);
  const dashGeos = [];
  for (let i = 0; i < C.lots; i++) for (let j = 0; j < C.lots; j++) {
    const cx = -half + C.road + i * pitch + C.lotSize / 2, cz = -half + C.road + j * pitch + C.lotSize / 2, n = i * C.lots + j;
    plazas.setMatrixAt(n, mtx.makeTranslation(cx, 0.16, cz)); plazas.receiveShadow = true;
    const L = C.lotSize + 0.8;
    [[cx, cz - L / 2, L, 0.6], [cx, cz + L / 2, L, 0.6], [cx - L / 2, cz, 0.6, L], [cx + L / 2, cz, 0.6, L]].forEach(([x, z, w, d], k) => kerbs.setMatrixAt(n * 4 + k, mtx.compose(v3.set(x, 0.08, z), quat.identity(), one.set(w, 0.3, d))));
  }
  for (let i = 0; i <= C.lots; i++) {
    const p = -half + i * pitch + C.road / 2;
    for (let k = -half + 2; k < half - 2; k += 4) {
      dashGeos.push(new THREE.BoxGeometry(1.8, 0.04, 0.22).translate(k, 0.02, p), new THREE.BoxGeometry(0.22, 0.04, 1.8).translate(p, 0.02, k));
    }
  }
  const mergeGeos = (geos) => { const pos = [], nor = []; for (const g of geos) { const n = g.toNonIndexed(); pos.push(...n.attributes.position.array); nor.push(...n.attributes.normal.array); g.dispose(); n.dispose(); } const out = new THREE.BufferGeometry(); out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); out.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); return out; };
  group.add(plazas, kerbs, new THREE.Mesh(keep(mergeGeos(dashGeos)), keep(new THREE.MeshBasicMaterial({ color: 0xffffff }))));

  // sea with gentle waves, distant hills
  const seaMat = keep(new THREE.ShaderMaterial({
    uniforms: { uT: { value: 0 }, uFog: { value: new THREE.Color(hex(TH.horizon)) }, uShallow: { value: new THREE.Vector3(...TH.sea[0]) }, uDeep: { value: new THREE.Vector3(...TH.sea[1]) } },
    vertexShader: `uniform float uT; varying vec3 vW; void main() { vec3 p = position; vec4 w = modelMatrix * vec4(p, 1.0);
      w.y += sin(w.x * 0.15 + uT * 1.2) * 0.12 + cos(w.z * 0.13 + uT) * 0.12; vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `uniform float uT; uniform vec3 uFog; uniform vec3 uShallow; uniform vec3 uDeep; varying vec3 vW; void main() {
      float r = length(vW.xz); vec3 shallow = uShallow, deep = uDeep;
      vec3 c = mix(shallow, deep, smoothstep(${(span * 0.8).toFixed(1)}, ${(span * 1.4).toFixed(1)}, r));
      float sp = sin(vW.x * 0.9 + uT * 2.0) * sin(vW.z * 0.8 - uT * 1.6); c += smoothstep(0.92, 1.0, sp) * 0.35;
      float foam = smoothstep(${(span * 0.86).toFixed(1)}, ${(span * 0.8).toFixed(1)}, r); c = mix(c, vec3(1.0), foam * 0.6);
      c = mix(c, uFog, smoothstep(140.0, 380.0, r)); gl_FragColor = vec4(c, 1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
      }`,
  }));
  const sea = new THREE.Mesh(keep(new THREE.PlaneGeometry(900, 900, 90, 90)), seaMat);
  sea.rotation.x = -Math.PI / 2; sea.position.y = -1.2; group.add(sea);
  const hillGeo = keep(new THREE.IcosahedronGeometry(1, 1));
  const hills = new THREE.InstancedMesh(hillGeo, keep(new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: true })), 14);
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2 + rng() * 0.3, r = 230 + rng() * 60, s = 18 + rng() * 26;
    hills.setMatrixAt(i, mtx.compose(v3.set(Math.cos(a) * r, -s * 0.35, Math.sin(a) * r), quat.identity(), one.set(s * 1.6, s, s * 1.3)));
    hills.setColorAt(i, col.setHex(cl(TH.hills)[i % cl(TH.hills).length]));
  }
  group.add(hills);

  // ---------- blocks
  const MAXV = 12000;
  const vox = {
    px: new Float32Array(MAXV), py: new Float32Array(MAXV), pz: new Float32Array(MAXV),
    ox: new Float32Array(MAXV), oy: new Float32Array(MAXV), oz: new Float32Array(MAXV),
    vx: new Float32Array(MAXV), vy: new Float32Array(MAXV), vz: new Float32Array(MAXV),
    q: new Float32Array(MAXV * 4), w: new Float32Array(MAXV * 3), s: new Float32Array(MAXV),
    state: new Uint8Array(MAXV), // 0 standing, 1 flying, 2 rubble, 3 gone, 4 shrinking away
    b: new Int32Array(MAXV), slot: new Int32Array(MAXV), // slot: this block's place in the rubble queue
    col: new Uint32Array(MAXV), // block colour, so windows can sparkle and cracks can darken
  };
  let count = 0;
  const blockMat = keep(blockMaterial());
  const blocks = new THREE.InstancedMesh(keep(new THREE.BoxGeometry(HALF * 2, HALF * 2, HALF * 2)), blockMat, MAXV);
  blocks.receiveShadow = true; blocks.castShadow = quality.shadowsOnBlocks; blocks.frustumCulled = false;
  blocks.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  group.add(blocks);
  let dMin = Infinity, dMax = -1, cMin = Infinity, cMax = -1; // range of blocks changed this frame: only that part goes to the GPU
  const writeMatrix = (i) => {
    if (i < dMin) dMin = i; if (i > dMax) dMax = i;
    quat.set(vox.q[i * 4], vox.q[i * 4 + 1], vox.q[i * 4 + 2], vox.q[i * 4 + 3]);
    mtx.compose(v3.set(vox.px[i], vox.py[i], vox.pz[i]), quat, one.setScalar(vox.s[i]));
    blocks.setMatrixAt(i, mtx);
  };
  const addVoxel = (x, y, z, color, bid) => {
    const i = count++;
    vox.px[i] = vox.ox[i] = x; vox.py[i] = vox.oy[i] = y; vox.pz[i] = vox.oz[i] = z;
    vox.q[i * 4 + 3] = 1; vox.s[i] = 1; vox.state[i] = 0; vox.b[i] = bid;
    vox.col[i] = color; blocks.setColorAt(i, col.setHex(color)); writeMatrix(i);
  };

  // ---------- buildings
  const buildings = [];
  let intact = 0;
  function addBuilding(k, x0, z0) {
    const c = classes[k - 1], id = buildings.length, start = count;
    const body = PALETTE[Math.floor(rng() * PALETTE.length)], roofCol = ROOF[Math.floor(rng() * ROOF.length)], awn = AWNING[Math.floor(rng() * AWNING.length)];
    const { w, d, h } = c;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) for (let z = 0; z < d; z++) {
      const edgeX = x === 0 || x === w - 1, edgeZ = z === 0 || z === d - 1;
      if (!(edgeX || edgeZ || y === h - 1)) continue; // hollow toy shell
      let color = body;
      const onFace = (edgeX && !edgeZ) || (edgeZ && !edgeX);
      const along = edgeX ? z : x;
      if (y % 3 === 0 && y > 0) color = TRIM;
      else if (onFace && y % 3 !== 0 && along % 2 === 1 && along > 0 && along < (edgeX ? d : w) - 1 && y < h - 1) color = WINDOW;
      if (k === 2 && y === 1 && onFace) color = (x + z) % 2 ? awn : 0xffffff; // shop awning stripes
      if (y === 0 && z === d - 1 && x === Math.floor(w / 2)) color = DOOR;
      if (k === 5 && z === d - 1 && y >= h - 5 && y < h - 1 && x >= 2 && x <= w - 3) color = (x === Math.floor(w / 2) && y === h - 3) ? 0x2a2140 : 0xffffff;
      addVoxel(x0 + x + 0.5, y + 0.5, z0 + z + 0.5, color, id);
    }
    for (let r = 0; r < c.roof; r++) for (let x = r; x < w - r; x++) for (let z = r; z < d - r; z++) {
      if (x !== r && x !== w - 1 - r && z !== r && z !== d - 1 - r && r < c.roof - 1) continue;
      addVoxel(x0 + x + 0.5, h + r + 0.5, z0 + z + 0.5, roofCol, id);
    }
    const total = count - start;
    buildings.push({ id, k, x0, z0, w, d, h: h + c.roof, start, total, alive: total, state: 'intact', cx: x0 + w / 2, cz: z0 + d / 2, topple: null });
    intact++;
  }
  const centre = Math.floor(C.lots / 2);
  const kinds = ['cottages', 'cottages', 'cottages', 'cottages', 'cottages', 'shops', 'shops', 'shops', 'shops', 'shops', 'apart', 'apart', 'apart', 'apart', 'apart', 'tower', 'tower', 'tower', 'tower', 'park', 'park', 'cottages', 'shops', 'apart'];
  for (let n = kinds.length - 1; n > 0; n--) { const m = Math.floor(rng() * (n + 1)); [kinds[n], kinds[m]] = [kinds[m], kinds[n]]; }
  const treeSpots = [];
  let ki = 0;
  // the clock tower stands in the middle of the first city; later cities (opts.shuffle) put it anywhere but the
  // two lots in front of Bonbon, so each city looks different
  let clockI = centre, clockJ = centre;
  if (opts.shuffle) { clockI = Math.floor(rng() * C.lots); clockJ = Math.floor(rng() * (C.lots - 2)); }
  for (let i = 0; i < C.lots; i++) for (let j = 0; j < C.lots; j++) {
    const lx = -half + C.road + i * pitch, lz = -half + C.road + j * pitch, L = C.lotSize;
    // fixed lots: the clock tower, cottages where Bonbon starts, and just ahead a lot built to fall
    // like dominoes (an apartment in front of a row of shops), so the first domino comes early
    const kind = i === clockI && j === clockJ ? 'clock' : (i === centre && j === C.lots - 1) ? 'cottages' : (i === centre && j === C.lots - 2) ? 'domino' : kinds[ki++ % kinds.length];
    const place = (k, fx, fz) => { const c = classes[k - 1]; addBuilding(k, Math.round(lx + fx * (L - c.w)), Math.round(lz + fz * (L - c.d))); };
    if (kind === 'clock') place(5, 0.5, 0.5);
    else if (kind === 'tower') { place(4, 0.2, 0.2); place(1, 0.95, 0.95); }
    else if (kind === 'domino') { place(3, 0.5, 1); place(2, 0.05, 0); place(2, 0.5, 0); place(2, 0.95, 0); }
    else if (kind === 'apart') { place(3, 0.05, 0.1); place(2, 0.95, 0.9); }
    else if (kind === 'shops') { place(2, 0.05, 0.05); place(2, 0.95, 0.05); place(2, 0.05, 0.95); place(1, 0.95, 0.95); }
    else if (kind === 'cottages') { place(1, 0.05, 0.05); place(1, 0.95, 0.05); place(1, 0.05, 0.95); place(1, 0.95, 0.95); place(1, 0.5, 0.5); }
    else for (let t = 0; t < 6; t++) treeSpots.push([lx + 2 + rng() * (L - 4), lz + 2 + rng() * (L - 4)]);
  }
  blocks.count = count;
  blocks.instanceMatrix.needsUpdate = true; if (blocks.instanceColor) blocks.instanceColor.needsUpdate = true;
  dMin = Infinity; dMax = -1; // the first upload sends everything
  const totalBlocks = count;

  // ---------- props: trees in parks, street lamps along the kerbs (both pop when stepped on)
  const props = [];
  for (const [x, z] of treeSpots) props.push({ kind: 'tree', x, z, alive: true, s: 0.8 + rng() * 0.5 });
  for (let i = 0; i < C.lots; i++) for (let j = 0; j <= C.lots; j++) {
    const x = -half + C.road + i * pitch + C.lotSize / 2, z = -half + j * pitch + C.road / 2 - 1.9;
    props.push({ kind: 'lamp', x: x - 3, z, alive: true, s: 1 }, { kind: 'lamp', x: x + 3, z: z + 3.8, alive: true, s: 1 });
  }
  const TREE = { round: [1, 1.1, 1.25, 1.1, 2], lolly: [1.6, 1, 1, 0.45, 2.7], palm: [2, 1.9, 0.45, 1.9, 3.1], cone: [1, 1.15, 1.9, 1.15, 2.4] }[TH.tree] || [1, 1.1, 1.25, 1.1, 2];
  const [trunkH, crX, crY, crZ, crH] = TREE; // trunk height factor, crown size, crown height
  const crownGeo = TH.tree === 'cone' ? new THREE.ConeGeometry(1, 1.4, 7) : TH.tree === 'lolly' ? new THREE.SphereGeometry(1, 14, 10) : new THREE.IcosahedronGeometry(1, 1);
  const trunkMesh = new THREE.InstancedMesh(keep(new THREE.CylinderGeometry(0.22, 0.3, 1.4, 8)), keep(new THREE.MeshLambertMaterial({ color: hex(TH.trunk) })), props.length);
  const crownMesh = new THREE.InstancedMesh(keep(crownGeo), keep(new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6, flatShading: true })), props.length);
  const lampHead = new THREE.InstancedMesh(keep(new THREE.SphereGeometry(0.32, 10, 8)), keep(new THREE.MeshBasicMaterial({ color: 0xfff1b8 })), props.length);
  crownMesh.castShadow = true;
  for (const m of [trunkMesh, crownMesh, lampHead]) m.frustumCulled = false;
  const placeProp = (i) => {
    const p = props[i], s = p.alive ? p.s : 0;
    if (p.kind === 'tree') {
      trunkMesh.setMatrixAt(i, mtx.compose(v3.set(p.x, 0.7 * trunkH * s, p.z), quat.identity(), one.set(s, trunkH * s, s)));
      crownMesh.setMatrixAt(i, mtx.compose(v3.set(p.x, crH * s, p.z), quat.identity(), one.set(crX * s, crY * s, crZ * s)));
      lampHead.setMatrixAt(i, mtx.makeScale(0, 0, 0));
    } else {
      trunkMesh.setMatrixAt(i, mtx.compose(v3.set(p.x, 1.6 * s, p.z), quat.identity(), one.set(0.35 * s, 2.3 * s, 0.35 * s)));
      crownMesh.setMatrixAt(i, mtx.makeScale(0, 0, 0));
      lampHead.setMatrixAt(i, mtx.compose(v3.set(p.x, 3.3 * s, p.z), quat.identity(), one.setScalar(s)));
    }
    trunkMesh.instanceMatrix.needsUpdate = crownMesh.instanceMatrix.needsUpdate = lampHead.instanceMatrix.needsUpdate = true;
  };
  props.forEach((p, i) => { trunkMesh.setColorAt(i, col.setHex(p.kind === 'tree' ? 0xffffff : 0x8f96b0)); crownMesh.setColorAt(i, col.setHex(cl(TH.crown)[i % cl(TH.crown).length])); placeProp(i); });
  group.add(trunkMesh, crownMesh, lampHead);

  // ---------- cars
  const cars = [];
  for (let n = 0; n < C.cars; n++) {
    const horiz = n % 2 === 0, line = Math.floor(rng() * (C.lots + 1)), lane = rng() < 0.5 ? -1 : 1;
    cars.push({ horiz, p: -half + line * pitch + C.road / 2 + lane * 1.2, t: rng() * span - half, speed: (3 + rng() * 3) * lane, squash: 0, x: 0, z: 0, color: PALETTE[n % PALETTE.length] });
  }
  for (let n = 0; n < 3 && n < cars.length; n++) { const c = cars[(n * 3 + 1) % cars.length]; c.icecream = true; c.color = 0xff9cc6; }
  const carBody = new THREE.InstancedMesh(keep(new THREE.BoxGeometry(2.2, 0.8, 1.2)), keep(new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 })), cars.length);
  const carTop = new THREE.InstancedMesh(keep(new THREE.BoxGeometry(1.2, 0.6, 1.0)), keep(new THREE.MeshStandardMaterial({ color: 0xd9f3ff, roughness: 0.15 })), cars.length);
  const wheelGeo = keep(new THREE.CylinderGeometry(0.32, 0.32, 0.25, 12)); wheelGeo.rotateX(Math.PI / 2);
  const carWheels = new THREE.InstancedMesh(wheelGeo, keep(new THREE.MeshLambertMaterial({ color: 0x2a2140 })), cars.length * 4);
  carBody.castShadow = true;
  for (const m of [carBody, carTop, carWheels]) m.frustumCulled = false;
  cars.forEach((c, i) => carBody.setColorAt(i, col.setHex(c.color)));
  const coneGeo = new THREE.ConeGeometry(0.42, 1.0, 12); coneGeo.rotateX(Math.PI); coneGeo.translate(0, 0.5, 0);
  const cones = new THREE.InstancedMesh(keep(coneGeo), keep(new THREE.MeshStandardMaterial({ color: 0xe8b46a, roughness: 0.6 })), cars.length);
  const scoops = new THREE.InstancedMesh(keep(new THREE.SphereGeometry(0.5, 14, 10)), keep(new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 })), cars.length);
  for (const m of [cones, scoops]) { m.frustumCulled = false; for (let i = 0; i < cars.length; i++) m.setMatrixAt(i, mtx.makeScale(0, 0, 0)); }
  cars.forEach((c, i) => scoops.setColorAt(i, col.setHex([0xff9cc6, 0xfff0b3, 0xa8f0d8][i % 3])));
  group.add(carBody, carTop, carWheels, cones, scoops);
  const yAxis = new THREE.Vector3(0, 1, 0), wheelPos = new THREE.Vector3();
  function updateCars(dt) {
    for (let i = 0; i < cars.length; i++) {
      const c = cars[i];
      if (c.squash > 0) c.squash = Math.max(0, c.squash - dt); else { c.t += c.speed * dt; if (c.t > half) c.t -= span; if (c.t < -half) c.t += span; }
      c.x = c.horiz ? c.t : c.p; c.z = c.horiz ? c.p : c.t;
      const flat = c.squash > 0.4 ? 0.28 : c.squash > 0 ? 0.28 + (0.4 - c.squash) / 0.4 * 0.72 * (1 + Math.sin((0.4 - c.squash) * 30) * 0.3) : 1;
      quat.setFromAxisAngle(yAxis, c.horiz ? (c.speed > 0 ? 0 : Math.PI) : (c.speed > 0 ? -Math.PI / 2 : Math.PI / 2));
      const wide = c.squash > 0.4 ? 1.25 : 1;
      carBody.setMatrixAt(i, mtx.compose(v3.set(c.x, 0.7 * flat, c.z), quat, one.set(wide, flat, wide)));
      carTop.setMatrixAt(i, mtx.compose(v3.set(c.x, 1.35 * flat, c.z), quat, one.set(wide, flat, wide)));
      if (c.icecream) {
        cones.setMatrixAt(i, mtx.compose(v3.set(c.x, 1.65 * flat, c.z), quat, one.set(wide, flat, wide)));
        scoops.setMatrixAt(i, mtx.compose(v3.set(c.x, (2.75 + Math.sin(seaT * 4 + i) * 0.08) * flat, c.z), quat, one.set(wide, flat, wide)));
      }
      for (let w = 0; w < 4; w++) {
        wheelPos.set(w < 2 ? -0.7 : 0.7, 0.32 * flat, w % 2 ? -0.6 : 0.6).applyQuaternion(quat); wheelPos.x += c.x; wheelPos.z += c.z;
        carWheels.setMatrixAt(i * 4 + w, mtx.compose(wheelPos, quat, one.set(1, flat, 1)));
      }
    }
    carBody.instanceMatrix.needsUpdate = carTop.instanceMatrix.needsUpdate = carWheels.instanceMatrix.needsUpdate = cones.instanceMatrix.needsUpdate = scoops.instanceMatrix.needsUpdate = true;
  }

  // ---------- dust (soft points), confetti, residents with balloons, clouds
  const DUSTN = quality.dust;
  const dustGeo = keep(new THREE.BufferGeometry());
  const dPos = new Float32Array(DUSTN * 3), dSize = new Float32Array(DUSTN), dAlpha = new Float32Array(DUSTN), dSpin = new Float32Array(DUSTN);
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dPos, 3).setUsage(THREE.DynamicDrawUsage));
  dustGeo.setAttribute('aSize', new THREE.BufferAttribute(dSize, 1).setUsage(THREE.DynamicDrawUsage));
  dustGeo.setAttribute('aAlpha', new THREE.BufferAttribute(dAlpha, 1).setUsage(THREE.DynamicDrawUsage));
  dustGeo.setAttribute('aSpin', new THREE.BufferAttribute(dSpin, 1));
  const dustMat = keep(dustMaterial());
  const dustPts = new THREE.Points(dustGeo, dustMat); dustPts.frustumCulled = false; dustPts.renderOrder = 2; group.add(dustPts);
  const dust = Array.from({ length: DUSTN }, () => ({ life: 0 }));
  let dustNext = 0;
  const pool = (n, geo, mat) => {
    const m = new THREE.InstancedMesh(keep(geo), keep(mat), n); m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); m.frustumCulled = false;
    for (let i = 0; i < n; i++) { m.setMatrixAt(i, mtx.makeScale(0, 0, 0)); m.setColorAt(i, col.setHex(0xffffff)); } // colour buffer now, so no recompile mid-game
    group.add(m); return { m, items: Array.from({ length: n }, () => ({ life: 0 })), next: 0 };
  };
  const confetti = pool(quality.confetti, new THREE.BoxGeometry(0.35, 0.05, 0.22), new THREE.MeshBasicMaterial({ color: 0xffffff }));
  const people = pool(24, new THREE.CapsuleGeometry(0.2, 0.32, 4, 8), new THREE.MeshToonMaterial({ color: 0xffffff }));
  const balloons = pool(24, new THREE.SphereGeometry(0.42, 12, 10), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2 }));
  const strings = pool(24, new THREE.CylinderGeometry(0.02, 0.02, 0.9, 4), new THREE.MeshBasicMaterial({ color: 0x2a2140 }));
  const take = (P) => { const i = P.next; P.next = (P.next + 1) % P.items.length; return i; };
  const clouds = pool(18, new THREE.IcosahedronGeometry(1, 2), new THREE.MeshLambertMaterial({ color: 0xffffff, emissive: 0x6f7f8f }));
  clouds.items.forEach((it, i) => Object.assign(it, { life: 1, x: (rng() - 0.5) * 420, y: 45 + rng() * 25, z: -60 - rng() * 220, s: 6 + rng() * 9, v: 1 + rng() * 1.5 }));

  function puff(x, y, z, size = 1) {
    const i = dustNext; dustNext = (dustNext + 1) % DUSTN;
    Object.assign(dust[i], { x, y, z, vx: (rng() - 0.5) * 3, vy: 0.8 + rng() * 1.6, vz: (rng() - 0.5) * 3, life: 1.1 + rng() * 0.6, max: 1.7, size: size * (1.6 + rng() * 1.4) });
    dSpin[i] = rng() * 6.28; dustGeo.attributes.aSpin.needsUpdate = true;
  }
  function burstConfetti(x, y, z, n = 20, colors = PALETTE) {
    for (let k = 0; k < n; k++) {
      const i = take(confetti), it = confetti.items[i];
      confetti.m.setColorAt(i, col.setHex(colors[k % colors.length]));
      Object.assign(it, { x, y, z, vx: (rng() - 0.5) * 10, vy: 6 + rng() * 8, vz: (rng() - 0.5) * 10, life: 2.5, rx: rng() * 6, ry: rng() * 6 });
    }
    if (confetti.m.instanceColor) confetti.m.instanceColor.needsUpdate = true;
  }
  let rescued = 0; // residents who floated away on balloons this city
  function releaseResidents(x, y, z, n, ring = 0) {
    rescued += n;
    y = 0.4; // they step out on the ground beside the building, hop for joy, then float off
    for (let k = 0; k < n; k++) {
      const i = take(people), it = people.items[i];
      people.m.setColorAt(i, col.setHex([0xffd2a1, 0xc68a5c, 0xffe0bd, 0x8d5a3b][k % 4]));
      balloons.m.setColorAt(i, col.setHex([0xff5a4f, 0xffc531, 0x3fa9ff, 0x22c6a3, 0x9b6bff][Math.floor(rng() * 5)]));
      const a = rng() * Math.PI * 2;
      Object.assign(it, { hop: 0.9, y0: 0.4, x: x + Math.cos(a) * ring + (rng() - 0.5) * 2, y, z: z + Math.sin(a) * ring + (rng() - 0.5) * 2, vx: (rng() - 0.5) * 1.5, vy: 2.2 + rng(), vz: (rng() - 0.5) * 1.5, life: 4.5, max: 4.5, ph: rng() * 6 });
    }
    people.m.instanceColor.needsUpdate = balloons.m.instanceColor.needsUpdate = true;
  }
  function updateParticles(dt) {
    for (let i = 0; i < DUSTN; i++) {
      const it = dust[i];
      if (it.life <= 0) { dAlpha[i] = 0; dSize[i] = 0; continue; }
      it.life -= dt; it.x += it.vx * dt; it.y += it.vy * dt; it.z += it.vz * dt; it.vy *= Math.exp(-1.5 * dt); it.vx *= Math.exp(-2 * dt); it.vz *= Math.exp(-2 * dt);
      const k = Math.max(0, it.life) / it.max;
      dPos[i * 3] = it.x; dPos[i * 3 + 1] = it.y; dPos[i * 3 + 2] = it.z;
      dSize[i] = it.size * (0.5 + (1 - k) * 0.9); dAlpha[i] = Math.min(1, k * 1.8) * 0.85;
    }
    dustGeo.attributes.position.needsUpdate = dustGeo.attributes.aSize.needsUpdate = dustGeo.attributes.aAlpha.needsUpdate = true;
    for (let i = 0; i < confetti.items.length; i++) {
      const it = confetti.items[i]; if (it.life <= 0) continue;
      it.life -= dt; it.vy -= 14 * dt; it.vx *= Math.exp(-1.5 * dt); it.vz *= Math.exp(-1.5 * dt);
      if (it.vy < -3) it.vy = -3; it.x += it.vx * dt; it.y = Math.max(0.05, it.y + it.vy * dt); it.z += it.vz * dt; it.rx += dt * 7; it.ry += dt * 5;
      quat.setFromEuler(eul.set(it.rx, it.ry, 0));
      confetti.m.setMatrixAt(i, mtx.compose(v3.set(it.x, it.y, it.z), quat, one.setScalar(it.life > 0.4 ? 1 : Math.max(0, it.life) / 0.4)));
    }
    for (let i = 0; i < people.items.length; i++) {
      const it = people.items[i]; if (it.life <= 0) continue;
      it.life -= dt;
      if (it.hop > 0) { it.hop -= dt; it.y = it.y0 + Math.abs(Math.sin(it.hop * 11)) * 0.9; } // a little jump for joy on the ground first
      else { it.x += (it.vx + Math.sin(it.life * 2 + it.ph) * 0.6) * dt; it.y += it.vy * dt; it.z += it.vz * dt; }
      // residents close to the camera fade out so a balloon never fills the screen
      const cam = blockMat.userData.uniforms.uCam.value, cd = Math.hypot(it.x - cam.x, it.y - cam.y, it.z - cam.z);
      const s = Math.max(0, it.life < 0.5 ? it.life / 0.5 : Math.min(1, (it.max - it.life) * 4)) * THREE.MathUtils.smoothstep(cd, 7, 14);
      const sway = Math.sin(it.life * 4 + it.ph) * 0.25;
      quat.setFromEuler(eul.set(0, 0, sway));
      people.m.setMatrixAt(i, mtx.compose(v3.set(it.x, it.y, it.z), quat, one.setScalar(s)));
      strings.m.setMatrixAt(i, mtx.compose(v3.set(it.x - sway * 0.5, it.y + 0.75, it.z), quat.setFromEuler(eul.set(0, 0, sway * 0.6)), one.setScalar(s)));
      balloons.m.setMatrixAt(i, mtx.compose(v3.set(it.x - sway, it.y + 1.5, it.z), quat.identity(), one.set(s, s * 1.15, s)));
    }
    for (let i = 0; i < clouds.items.length; i++) {
      const it = clouds.items[i]; it.x += it.v * dt; if (it.x > 230) it.x -= 460;
      clouds.m.setMatrixAt(i, mtx.compose(v3.set(it.x, it.y, it.z), quat.identity(), one.set(it.s * 1.8, it.s * 0.7, it.s)));
    }
    for (const P of [confetti, people, balloons, strings, clouds]) P.m.instanceMatrix.needsUpdate = true;
  }

  // ---------- breaking
  const rubbleCap = quality.rubble;
  const rubbleQueue = new Int32Array(MAXV); let rqHead = 0, rqTail = 0, rubbleCount = 0; // oldest rubble first
  const events = []; // drained by game.js: { type, b, x, z, chain, hits }
  let seaT = 0;

  function launch(i, vx, vy, vz) {
    vox.state[i] = 1; vox.vx[i] = vx; vox.vy[i] = vy; vox.vz[i] = vz;
    vox.w[i * 3] = (rng() - 0.5) * 12; vox.w[i * 3 + 1] = (rng() - 0.5) * 12; vox.w[i * 3 + 2] = (rng() - 0.5) * 12;
  }
  let glass = 0;
  const biteAt = (b, p, r, dir, power) => {
    let n = 0;
    for (let i = b.start; i < b.start + b.total; i++) {
      if (vox.state[i] !== 0) continue;
      const dx = vox.px[i] - p.x, dy = vox.py[i] - p.y, dz = vox.pz[i] - p.z;
      if (dx * dx + dy * dy + dz * dz > r * r) continue;
      launch(i, dir.x * (5 + rng() * 6) * power + dx * 2, 3 + rng() * 6, dir.z * (5 + rng() * 6) * power + dz * 2); n++;
      if (vox.col[i] === WINDOW) glass++;
    }
    return n;
  };
  const near = new THREE.Vector3(), nearB = new THREE.Vector3();
  /** Bites blocks within radius r of point p off building b, flung along dir. When that spot is already empty
   *  (a hollow shell bitten before), it bites around the nearest standing block instead. Returns blocks removed. */
  function bite(b, p, r, dir, power = 1, chain = 0) {
    if (b.state !== 'intact') return 0;
    glass = 0;
    let n = biteAt(b, p, r, dir, power);
    if (!n) {
      let best = -1, bd = Infinity;
      for (let i = b.start; i < b.start + b.total; i++) if (vox.state[i] === 0) { const d = (vox.px[i] - p.x) ** 2 + (vox.py[i] - p.y) ** 2 + (vox.pz[i] - p.z) ** 2; if (d < bd) bd = d, best = i; }
      if (best >= 0) n = biteAt(b, nearB.set(vox.px[best], vox.py[best], vox.pz[best]), r, dir, power);
    }
    b.alive -= n;
    if (n) { puff(p.x, p.y, p.z, 1.1); puff(p.x, Math.max(0.6, p.y - 1), p.z, 0.9); }
    if (glass) { burstConfetti(p.x, p.y, p.z, Math.min(14, glass * 2), [0xffffff, 0xcff0ff, 0x9fe0ff]); events.push({ type: 'glass', n: glass }); }
    // cracks first: once a building is badly hit, some of its blocks darken and it creaks before it falls
    if (!b.cracked && b.alive / b.total < 0.8 && b.alive / b.total >= cfg.collapseAt) {
      b.cracked = true; let lo = Infinity, hi = -1;
      for (let i = b.start; i < b.start + b.total; i++) if (vox.state[i] === 0 && rng() < 0.22) { blocks.setColorAt(i, col.setHex(vox.col[i]).multiplyScalar(0.62)); lo = Math.min(lo, i); hi = Math.max(hi, i); }
      if (hi >= 0) { cMin = Math.min(cMin, lo); cMax = Math.max(cMax, hi); } // uploaded once per frame with every other crack
      events.push({ type: 'creak', b });
    }
    if (b.alive / b.total < cfg.collapseAt) collapse(b, dir, chain);
    return n;
  }

  /** Brings a building down: tall ones topple away from dir, the rest pancake. chain counts dominoes. */
  function collapse(b, dir, chain) {
    if (b.state !== 'intact') return;
    intact--;
    events.push({ type: 'collapse', b, x: b.cx, z: b.cz, chain });
    releaseResidents(b.cx, 0, b.cz, 2 + Math.floor(rng() * 3), Math.max(b.w, b.d) / 2 + 1);
    if (b.h >= cfg.toppleMinHeight) {
      // fall away from Bonbon; if a neighbour stands within reach to the side, fall onto it (dominoes)
      const ax = Math.abs(dir.x) > Math.abs(dir.z);
      let fx = ax ? Math.sign(dir.x) || 1 : 0, fz = ax ? 0 : Math.sign(dir.z) || 1;
      const reaches = (dx, dz) => buildings.some((o) => o !== b && o.state === 'intact' && o.k <= b.k &&
        Math.abs(o.cx - (b.cx + dx * (b.w / 2 + b.h * 0.6))) < o.w / 2 + b.h * 0.45 * Math.abs(dx) + 1 &&
        Math.abs(o.cz - (b.cz + dz * (b.d / 2 + b.h * 0.6))) < o.d / 2 + b.h * 0.45 * Math.abs(dz) + 1);
      if (!reaches(fx, fz)) for (const [dx, dz] of [[fz, fx], [-fz, -fx]]) if (reaches(dx, dz)) { fx = dx; fz = dz; break; }
      const pivot = new THREE.Vector3(fx > 0 ? b.x0 + b.w : fx < 0 ? b.x0 : b.cx, 0, fz > 0 ? b.z0 + b.d : fz < 0 ? b.z0 : b.cz);
      b.state = 'toppling';
      // rotating about (fz, 0, -fx) by +angle tips the top towards +f (away from Bonbon)
      b.topple = { fx, fz, pivot, axis: new THREE.Vector3(fz, 0, -fx), angle: 0, angVel: 0.25, chain };
    } else {
      b.state = 'gone';
      for (let i = b.start; i < b.start + b.total; i++) if (vox.state[i] === 0) launch(i, (rng() - 0.5) * 3 + dir.x * 2, -rng() * 2, (rng() - 0.5) * 3 + dir.z * 2);
      for (let k = 0; k < 6 + b.k * 3; k++) puff(b.cx + (rng() - 0.5) * b.w * 1.3, 0.8 + rng() * b.h * 0.4, b.cz + (rng() - 0.5) * b.d * 1.3, 1.6 + b.k * 0.45);
      b.alive = 0;
    }
  }

  const fall = new THREE.Vector3();
  function updateTopples(dt) {
    for (const b of buildings) {
      if (b.state !== 'toppling') continue;
      const T = b.topple;
      T.angVel += (1.8 + 7 * Math.sin(T.angle)) * dt; T.angle = Math.min(Math.PI / 2, T.angle + T.angVel * dt);
      qd.setFromAxisAngle(T.axis, T.angle);
      for (let i = b.start; i < b.start + b.total; i++) {
        if (vox.state[i] !== 0) continue;
        v3.set(vox.ox[i] - T.pivot.x, vox.oy[i], vox.oz[i] - T.pivot.z).applyQuaternion(qd);
        vox.px[i] = T.pivot.x + v3.x; vox.py[i] = Math.max(HALF, v3.y); vox.pz[i] = T.pivot.z + v3.z;
        vox.q[i * 4] = qd.x; vox.q[i * 4 + 1] = qd.y; vox.q[i * 4 + 2] = qd.z; vox.q[i * 4 + 3] = qd.w;
        writeMatrix(i);
      }
      if (T.angle >= Math.PI / 2 - 0.05) {
        b.state = 'gone';
        for (let i = b.start; i < b.start + b.total; i++) if (vox.state[i] === 0) {
          const r = Math.hypot(vox.px[i] - T.pivot.x, vox.pz[i] - T.pivot.z);
          launch(i, T.fx * T.angVel * r * 0.12 + (rng() - 0.5) * 3, 2 + rng() * 4, T.fz * T.angVel * r * 0.12 + (rng() - 0.5) * 3);
        }
        b.alive = 0;
        const hits = new Set();
        for (let s = 1; s <= b.h + 1; s += 0.7) {
          const x = T.pivot.x + T.fx * s, z = T.pivot.z + T.fz * s;
          for (const o of buildings) if (o.state === 'intact' && x > o.x0 - 0.5 && x < o.x0 + o.w + 0.5 && z > o.z0 - 0.5 && z < o.z0 + o.d + 0.5) hits.add(o);
          if (s % 2.8 < 0.7) puff(x, 0.8, z, 2.2);
        }
        events.push({ type: 'land', b, x: T.pivot.x + T.fx * b.h * 0.6, z: T.pivot.z + T.fz * b.h * 0.6, chain: T.chain, hits: hits.size });
        fall.set(T.fx, 0, T.fz);
        for (const o of hits) {
          if (o.k <= b.k) collapse(o, fall, T.chain + 1); // same size or smaller: knocked down
          else bite(o, near.set(o.cx - T.fx * o.w / 2, Math.min(o.h - 1, b.h * 0.5), o.cz - T.fz * o.d / 2), 2.5 + b.k * 0.5, fall, 1.4, T.chain + 1); // bigger: dented
        }
      }
    }
  }

  function updateBlocks(dt, monster) {
    const mx = monster.x, mz = monster.z, mr = monster.r * 0.8, mr2 = mr * mr;
    for (let i = 0; i < count; i++) {
      const st = vox.state[i];
      if (st === 1) {
        vox.vy[i] -= GRAVITY * dt;
        vox.px[i] += vox.vx[i] * dt; vox.py[i] += vox.vy[i] * dt; vox.pz[i] += vox.vz[i] * dt;
        const w0 = i * 3;
        qd.setFromEuler(eul.set(vox.w[w0] * dt, vox.w[w0 + 1] * dt, vox.w[w0 + 2] * dt));
        quat.set(vox.q[i * 4], vox.q[i * 4 + 1], vox.q[i * 4 + 2], vox.q[i * 4 + 3]).multiply(qd);
        if (vox.py[i] < HALF) {
          vox.py[i] = HALF; vox.vy[i] *= -0.28; vox.vx[i] *= 0.55; vox.vz[i] *= 0.55; vox.w[w0] *= 0.5; vox.w[w0 + 1] *= 0.5; vox.w[w0 + 2] *= 0.5;
          if (Math.abs(vox.vy[i]) < 1.2 && vox.vx[i] * vox.vx[i] + vox.vz[i] * vox.vz[i] < 1) {
            vox.state[i] = 2; rubbleCount++; vox.slot[i] = rqTail; rubbleQueue[rqTail] = i; rqTail = (rqTail + 1) % MAXV;
            if (rqTail === rqHead) rqHead = (rqHead + 1) % MAXV; // ring full: forget the oldest entry
            eul.setFromQuaternion(quat, 'YXZ'); quat.setFromEuler(eul.set(0, eul.y, 0)); // lie flat, keep the yaw
          }
        }
        vox.q[i * 4] = quat.x; vox.q[i * 4 + 1] = quat.y; vox.q[i * 4 + 2] = quat.z; vox.q[i * 4 + 3] = quat.w;
        writeMatrix(i);
      } else if (st === 2) {
        if (!monster.moving) continue;
        const dx = vox.px[i] - mx, dz = vox.pz[i] - mz, d2 = dx * dx + dz * dz;
        if (d2 < mr2) { const d = Math.sqrt(d2) || 1; rubbleCount--; launch(i, dx / d * (4 + rng() * 4), 2 + rng() * 3, dz / d * (4 + rng() * 4)); }
      } else if (st === 4) {
        vox.s[i] -= dt * 1.5;
        if (vox.s[i] <= 0) { vox.s[i] = 0; vox.state[i] = 3; }
        writeMatrix(i);
      }
    }
    // tidy away the oldest rubble while there is more than the device can keep
    while (rubbleCount > rubbleCap && rqHead !== rqTail) {
      const at = rqHead, i = rubbleQueue[at]; rqHead = (rqHead + 1) % MAXV;
      if (vox.state[i] === 2 && vox.slot[i] === at) { vox.state[i] = 4; rubbleCount--; } // stale entries (kicked, landed again) are skipped
    }
  }

  // ---------- queries for game.js
  function touching(x, z, r, out = []) {
    out.length = 0;
    for (const b of buildings) {
      if (b.state !== 'intact') continue;
      const px = Math.max(b.x0, Math.min(x, b.x0 + b.w)), pz = Math.max(b.z0, Math.min(z, b.z0 + b.d));
      const d = Math.hypot(x - px, z - pz);
      if (d < r) out.push({ b, px, pz, d });
    }
    return out;
  }
  /** Nearest intact building; `behind` > 0 adds that much distance per unit a building lies behind (south of) (x, z). */
  function nearest(x, z, filter, behind = 0) {
    let best = null, bd = Infinity;
    for (const b of buildings) if (b.state === 'intact' && (!filter || filter(b))) { const d = Math.hypot(b.cx - x, b.cz - z) + behind * Math.max(0, b.cz - z); if (d < bd) bd = d, best = b; }
    return best;
  }
  function squashCars(x, z, r) {
    const hit = [];
    for (const c of cars) if (c.squash <= 0 && Math.hypot(c.x - x, c.z - z) < r + 1) { c.squash = 5; hit.push(c); }
    return hit;
  }
  function crushTrees(x, z, r) {
    let n = 0;
    for (let i = 0; i < props.length; i++) {
      const p = props[i];
      if (!p.alive || Math.hypot(p.x - x, p.z - z) > r + 0.6) continue;
      p.alive = false; placeProp(i); n++;
      if (p.kind === 'tree') burstConfetti(p.x, 2, p.z, 10, [...cl(TH.crown), 0xffc531]); else { puff(p.x, 1, p.z, 0.8); burstConfetti(p.x, 3, p.z, 5, [0xfff1b8, 0x8f96b0]); }
    }
    return n;
  }

  // ---------- footprints: flat marks where Bonbon's feet land, fading out
  const FOOT = 40;
  const foot = new THREE.InstancedMesh(keep(new THREE.CircleGeometry(0.5, 16).rotateX(-Math.PI / 2)), keep(new THREE.MeshBasicMaterial({ color: 0x3a6b2c, transparent: true, opacity: 0.28, depthWrite: false })), FOOT);
  foot.frustumCulled = false; foot.renderOrder = 1; group.add(foot);
  const feet = Array.from({ length: FOOT }, () => ({ life: 0 })); let footNext = 0;
  for (let i = 0; i < FOOT; i++) foot.setMatrixAt(i, mtx.makeScale(0, 0, 0));
  function footprint(x, z, size, yaw) { Object.assign(feet[footNext], { x, z, size, yaw, life: 6 }); footNext = (footNext + 1) % FOOT; }
  function updateFeet(dt) {
    for (let i = 0; i < FOOT; i++) {
      const f = feet[i]; if (f.life <= 0) continue; f.life -= dt;
      const s = f.size * Math.min(1, Math.max(0, f.life) / 1.5);
      foot.setMatrixAt(i, mtx.compose(v3.set(f.x, 0.06, f.z), quat.setFromAxisAngle(yAxis, f.yaw), one.set(s * 0.8, 1, s * 1.15)));
    }
    foot.instanceMatrix.needsUpdate = true;
  }

  function update(dt, monster) {
    seaT += dt; seaMat.uniforms.uT.value = seaT;
    updateTopples(dt); updateBlocks(dt, monster); updateCars(dt); updateParticles(dt); updateFeet(dt);
    if (dMax >= 0) {
      const a = blocks.instanceMatrix; a.clearUpdateRanges(); a.addUpdateRange(dMin * 16, (dMax - dMin + 1) * 16); a.needsUpdate = true;
      dMin = Infinity; dMax = -1;
    }
    if (cMax >= 0) {
      const a = blocks.instanceColor; a.clearUpdateRanges(); a.addUpdateRange(cMin * 3, (cMax - cMin + 1) * 3); a.needsUpdate = true;
      cMin = Infinity; cMax = -1;
    }
  }
  function setXray(cam, mon, r) { const u = blockMat.userData.uniforms; u.uCam.value.copy(cam); u.uMon.value.copy(mon); u.uR.value = r; }

  return {
    start: { x: -half + C.road + centre * pitch + C.lotSize / 2, z: half - 1 }, // in front of the cottages lot
    /** Ice-cream trucks still driving, for the jingle. */
    iceTrucks: () => cars.filter((x) => x.icecream && x.squash <= 0),
    group, buildings, half, span, events, update, setXray, bite, collapse, touching, nearest, squashCars, crushTrees,
    puff, burstConfetti, releaseResidents, footprint,
    intactLeft: () => intact,
    rescued: () => rescued,
    anyToppling: () => buildings.some((b) => b.state === 'toppling'),
    totalBlocks, meshes: { blocks },
    setDustScale(s) { dustMat.uniforms.uScale.value = s; },
    dispose() {
      scene.remove(group);
      group.traverse((o) => { if (o.isInstancedMesh) o.dispose(); });
      for (const d of disposables) d.dispose();
      for (const t of [grassTex, plazaTex, roadTex, dustMat.uniforms.uTex.value]) t.dispose();
    },
  };
}
