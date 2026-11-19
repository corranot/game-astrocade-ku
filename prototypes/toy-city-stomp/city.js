// PROTOTYPE - NOT FOR PRODUCTION
// The toy city: buildings made of plastic blocks (one InstancedMesh for every block in the city), which bite
// off, pancake or topple like dominoes, plus cars that squash flat and pop back, trees, toy residents that float
// away on balloons, dust and confetti. All gameplay randomness comes from the seeded rng passed in.
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.187.0/build/three.module.js';

const PALETTE = [0x3fa9ff, 0x22c6a3, 0xffc531, 0x9b6bff, 0xff9b54, 0xff6f91, 0x5ad1ff, 0xb8e05a];
const ROOF = [0xff5a4f, 0xff7a45, 0xe8475f];
const WINDOW = 0xd9f3ff, DOOR = 0x8a5a3c, TRIM = 0xfff6e0;
const GRAVITY = 32, HALF = 0.48;

/** A block material: shiny toy plastic with darkened bevel edges drawn in the shader (no extra triangles). */
function blockMaterial() {
  const m = new THREE.MeshPhongMaterial({ color: 0xffffff, shininess: 70, specular: 0x333333 });
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
        // see-through: blocks between the camera and Bonbon are cut with a dither, so Bonbon is never hidden
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
        float edge = smoothstep(0.74, 0.97, mid);
        diffuseColor.rgb *= 1.0 - 0.3 * edge;
        diffuseColor.rgb += 0.06 * (1.0 - edge) * step(0.99, a.y);`);
  };
  return m;
}

/**
 * Builds the city into `scene`. cfg is game_config; rng a seeded () => [0,1).
 * Returns the city object used by game.js (see the return statement for its API).
 */
export function createCity(scene, cfg, rng, quality) {
  const C = cfg.city, classes = cfg.classes;
  const pitch = C.lotSize + C.road, span = C.lots * pitch + C.road, half = span / 2;
  const group = new THREE.Group(); scene.add(group);

  // ---------- board, roads, rim
  const board = new THREE.Mesh(new THREE.BoxGeometry(span + 6, 1, span + 6), new THREE.MeshLambertMaterial({ color: 0x8fdc6a }));
  board.position.y = -0.5; board.receiveShadow = true; group.add(board);
  const rim = new THREE.Mesh(new THREE.BoxGeometry(span + 10, 1.6, span + 10), new THREE.MeshLambertMaterial({ color: 0xd99a5b }));
  rim.position.y = -1.3; group.add(rim);
  const roadGeos = [], dashGeos = [];
  for (let i = 0; i <= C.lots; i++) {
    const p = -half + i * pitch + C.road / 2;
    for (const horiz of [true, false]) {
      const g = new THREE.BoxGeometry(horiz ? span : C.road, 0.06, horiz ? C.road : span);
      g.translate(horiz ? 0 : p, 0.03, horiz ? p : 0); roadGeos.push(g);
      for (let k = -half + 2; k < half - 2; k += 4) {
        const dg = new THREE.BoxGeometry(horiz ? 1.6 : 0.25, 0.08, horiz ? 0.25 : 1.6);
        dg.translate(horiz ? k : p, 0.04, horiz ? p : k); dashGeos.push(dg);
      }
    }
  }
  const merge = (geos) => { // tiny merge: concatenate non-indexed positions and normals
    const pos = [], nor = [];
    for (const g of geos) { const n = g.toNonIndexed(); pos.push(...n.attributes.position.array); nor.push(...n.attributes.normal.array); }
    const out = new THREE.BufferGeometry();
    out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); out.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    return out;
  };
  const roads = new THREE.Mesh(merge(roadGeos), new THREE.MeshLambertMaterial({ color: 0xf5e6c4 })); roads.receiveShadow = true; group.add(roads);
  group.add(new THREE.Mesh(merge(dashGeos), new THREE.MeshLambertMaterial({ color: 0xffffff })));

  // ---------- blocks
  const MAXV = 12000;
  const vox = {
    px: new Float32Array(MAXV), py: new Float32Array(MAXV), pz: new Float32Array(MAXV),
    ox: new Float32Array(MAXV), oy: new Float32Array(MAXV), oz: new Float32Array(MAXV),
    vx: new Float32Array(MAXV), vy: new Float32Array(MAXV), vz: new Float32Array(MAXV),
    q: new Float32Array(MAXV * 4), w: new Float32Array(MAXV * 3), s: new Float32Array(MAXV),
    state: new Uint8Array(MAXV), // 0 standing, 1 flying, 2 rubble, 3 gone
    b: new Int32Array(MAXV), settledAt: new Float32Array(MAXV),
  };
  let count = 0;
  const blocks = new THREE.InstancedMesh(new THREE.BoxGeometry(HALF * 2, HALF * 2, HALF * 2), blockMaterial(), MAXV);
  blocks.receiveShadow = true; blocks.castShadow = quality.shadowsOnBlocks;
  blocks.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  group.add(blocks);
  const col = new THREE.Color(), mtx = new THREE.Matrix4(), quat = new THREE.Quaternion(), qd = new THREE.Quaternion(), v3 = new THREE.Vector3(), one = new THREE.Vector3(1, 1, 1);
  const writeMatrix = (i) => {
    quat.set(vox.q[i * 4], vox.q[i * 4 + 1], vox.q[i * 4 + 2], vox.q[i * 4 + 3]);
    mtx.compose(v3.set(vox.px[i], vox.py[i], vox.pz[i]), quat, one.setScalar(vox.s[i]));
    blocks.setMatrixAt(i, mtx);
  };
  const addVoxel = (x, y, z, color, bid) => {
    const i = count++;
    vox.px[i] = vox.ox[i] = x; vox.py[i] = vox.oy[i] = y; vox.pz[i] = vox.oz[i] = z;
    vox.q[i * 4 + 3] = 1; vox.s[i] = 1; vox.state[i] = 0; vox.b[i] = bid;
    blocks.setColorAt(i, col.setHex(color)); writeMatrix(i);
  };

  // ---------- buildings
  const buildings = [];
  /** One building of class k with its min corner at (x0, z0). */
  function addBuilding(k, x0, z0) {
    const c = classes[k - 1], id = buildings.length, start = count;
    const body = PALETTE[Math.floor(rng() * PALETTE.length)], roofCol = ROOF[Math.floor(rng() * ROOF.length)];
    const { w, d, h } = c;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) for (let z = 0; z < d; z++) {
      const edgeX = x === 0 || x === w - 1, edgeZ = z === 0 || z === d - 1;
      if (!(edgeX || edgeZ || y === h - 1)) continue; // hollow toy shell
      let color = body;
      const onFace = (edgeX && !edgeZ) || (edgeZ && !edgeX);
      const along = edgeX ? z : x;
      if (y % 3 === 0 && y > 0) color = TRIM;
      else if (onFace && y % 3 !== 0 && along % 2 === 1 && along > 0 && along < (edgeX ? d : w) - 1 && y < h - 1) color = WINDOW;
      if (y === 0 && z === d - 1 && x === Math.floor(w / 2)) color = DOOR;
      if (k === 5 && z === d - 1 && y >= h - 5 && y < h - 1 && x >= 2 && x <= w - 3) color = (x === Math.floor(w / 2) && y === h - 3) ? 0x2a2140 : 0xffffff; // clock face
      addVoxel(x0 + x + 0.5, y + 0.5, z0 + z + 0.5, color, id);
    }
    for (let r = 0; r < c.roof; r++) { // stepped roof
      for (let x = r; x < w - r; x++) for (let z = r; z < d - r; z++) {
        if (x !== r && x !== w - 1 - r && z !== r && z !== d - 1 - r && r < c.roof - 1) continue;
        addVoxel(x0 + x + 0.5, h + r + 0.5, z0 + z + 0.5, roofCol, id);
      }
    }
    const total = count - start;
    buildings.push({ id, k, x0, z0, w, d, h: h + c.roof, start, total, alive: total, state: 'intact', cx: x0 + w / 2, cz: z0 + d / 2, topple: null });
  }

  // lots: the centre lot holds the clock tower, the rest a mix
  const lotPlan = [];
  for (let i = 0; i < C.lots; i++) for (let j = 0; j < C.lots; j++) lotPlan.push([i, j]);
  const centre = Math.floor(C.lots / 2);
  const kinds = ['cottages', 'cottages', 'cottages', 'cottages', 'cottages', 'shops', 'shops', 'shops', 'shops', 'shops', 'apart', 'apart', 'apart', 'apart', 'apart', 'tower', 'tower', 'tower', 'tower', 'park', 'park', 'cottages', 'shops', 'apart'];
  for (let n = kinds.length - 1; n > 0; n--) { const m = Math.floor(rng() * (n + 1)); [kinds[n], kinds[m]] = [kinds[m], kinds[n]]; }
  const treeSpots = [];
  let ki = 0;
  for (const [i, j] of lotPlan) {
    const lx = -half + C.road + i * pitch, lz = -half + C.road + j * pitch, L = C.lotSize;
    // the start lot (front centre) is cottages so the first bite is always a small one
    const kind = i === centre && j === centre ? 'clock' : (i === centre && j === C.lots - 1) ? 'cottages' : kinds[ki++ % kinds.length];
    const place = (k, fx, fz) => { const c = classes[k - 1]; addBuilding(k, Math.round(lx + fx * (L - c.w)), Math.round(lz + fz * (L - c.d))); };
    if (kind === 'clock') place(5, 0.5, 0.5);
    else if (kind === 'tower') { place(4, 0.2, 0.2); place(1, 0.95, 0.95); }
    else if (kind === 'apart') { place(3, 0.05, 0.1); place(2, 0.95, 0.9); }
    else if (kind === 'shops') { place(2, 0.05, 0.05); place(2, 0.95, 0.05); place(2, 0.05, 0.95); place(1, 0.95, 0.95); }
    else if (kind === 'cottages') { place(1, 0.05, 0.05); place(1, 0.95, 0.05); place(1, 0.05, 0.95); place(1, 0.95, 0.95); place(1, 0.5, 0.5); }
    else for (let t = 0; t < 6; t++) treeSpots.push([lx + 2 + rng() * (L - 4), lz + 2 + rng() * (L - 4)]);
    treeSpots.push([lx - C.road / 2 + 0.01, lz + rng() * L]); // a street tree beside each lot
  }
  blocks.count = count;
  blocks.instanceMatrix.needsUpdate = true; if (blocks.instanceColor) blocks.instanceColor.needsUpdate = true;
  const totalBlocks = count;

  // ---------- trees
  const trees = treeSpots.slice(0, C.trees + 20).map(([x, z]) => ({ x, z, alive: true, s: 0.8 + rng() * 0.5 }));
  const trunkMesh = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.22, 0.3, 1.4, 8), new THREE.MeshLambertMaterial({ color: 0x9a6a3f }), trees.length);
  const crownMesh = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), new THREE.MeshPhongMaterial({ color: 0xffffff, shininess: 30, flatShading: true }), trees.length);
  crownMesh.castShadow = true;
  const placeTree = (i) => {
    const t = trees[i], s = t.alive ? t.s : 0;
    trunkMesh.setMatrixAt(i, mtx.compose(v3.set(t.x, 0.7 * s, t.z), quat.identity(), one.setScalar(s)));
    crownMesh.setMatrixAt(i, mtx.compose(v3.set(t.x, 2 * s, t.z), quat.identity(), one.set(1.1 * s, 1.25 * s, 1.1 * s)));
    trunkMesh.instanceMatrix.needsUpdate = crownMesh.instanceMatrix.needsUpdate = true;
  };
  trees.forEach((t, i) => { crownMesh.setColorAt(i, col.setHex([0x4cc35a, 0x6fd64b, 0x2fb37a][i % 3])); placeTree(i); });
  group.add(trunkMesh, crownMesh);

  // ---------- cars: drive along road lines, squash flat, pop back
  const cars = [];
  for (let n = 0; n < C.cars; n++) {
    const horiz = n % 2 === 0, line = Math.floor(rng() * (C.lots + 1));
    const lane = (rng() < 0.5 ? -1 : 1);
    cars.push({ horiz, lane, p: -half + line * pitch + C.road / 2 + lane * 1.2, t: rng() * span - half, speed: (3 + rng() * 3) * lane, squash: 0, x: 0, z: 0, color: PALETTE[n % PALETTE.length] });
  }
  const carBody = new THREE.InstancedMesh(new THREE.BoxGeometry(2.2, 0.8, 1.2), new THREE.MeshPhongMaterial({ color: 0xffffff, shininess: 80 }), cars.length);
  const carTop = new THREE.InstancedMesh(new THREE.BoxGeometry(1.2, 0.6, 1.0), new THREE.MeshPhongMaterial({ color: 0xd9f3ff, shininess: 90 }), cars.length);
  const wheelGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.25, 12); wheelGeo.rotateX(Math.PI / 2);
  const carWheels = new THREE.InstancedMesh(wheelGeo, new THREE.MeshLambertMaterial({ color: 0x2a2140 }), cars.length * 4);
  carBody.castShadow = true;
  cars.forEach((c, i) => carBody.setColorAt(i, col.setHex(c.color)));
  group.add(carBody, carTop, carWheels);
  const yAxis = new THREE.Vector3(0, 1, 0);
  function updateCars(dt) {
    for (const [i, c] of cars.entries()) {
      if (c.squash > 0) c.squash = Math.max(0, c.squash - dt); else { c.t += c.speed * dt; if (c.t > half) c.t -= span; if (c.t < -half) c.t += span; }
      c.x = c.horiz ? c.t : c.p; c.z = c.horiz ? c.p : c.t;
      const flat = c.squash > 0.4 ? 0.28 : c.squash > 0 ? 0.28 + (0.4 - c.squash) / 0.4 * 0.72 * (1 + Math.sin((0.4 - c.squash) * 30) * 0.3) : 1;
      quat.setFromAxisAngle(yAxis, c.horiz ? (c.speed > 0 ? 0 : Math.PI) : (c.speed > 0 ? -Math.PI / 2 : Math.PI / 2));
      const wide = c.squash > 0.4 ? 1.25 : 1;
      carBody.setMatrixAt(i, mtx.compose(v3.set(c.x, 0.7 * flat, c.z), quat, one.set(wide, flat, wide)));
      carTop.setMatrixAt(i, mtx.compose(v3.set(c.x, (0.7 + 0.65) * flat, c.z), quat, one.set(wide, flat, wide)));
      for (let w = 0; w < 4; w++) {
        const ox = (w < 2 ? -0.7 : 0.7), oz = (w % 2 ? -0.6 : 0.6);
        v3.set(ox, 0.32 * flat, oz).applyQuaternion(quat).add(new THREE.Vector3(c.x, 0, c.z));
        carWheels.setMatrixAt(i * 4 + w, mtx.compose(v3, quat, one.set(1, flat, 1)));
      }
    }
    carBody.instanceMatrix.needsUpdate = carTop.instanceMatrix.needsUpdate = carWheels.instanceMatrix.needsUpdate = true;
  }

  // ---------- particles: dust puffs, confetti, residents with balloons
  const pool = (n, geo, mat, shadow) => {
    const m = new THREE.InstancedMesh(geo, mat, n); m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); m.castShadow = !!shadow;
    for (let i = 0; i < n; i++) m.setMatrixAt(i, mtx.makeScale(0, 0, 0));
    group.add(m); return { m, items: Array.from({ length: n }, () => ({ life: 0 })), next: 0 };
  };
  const dust = pool(quality.dust, new THREE.IcosahedronGeometry(0.42, 0), new THREE.MeshLambertMaterial({ color: 0xfff0d6, flatShading: true }));
  const confetti = pool(quality.confetti, new THREE.BoxGeometry(0.35, 0.05, 0.22), new THREE.MeshBasicMaterial({ color: 0xffffff }));
  const people = pool(24, new THREE.CapsuleGeometry(0.2, 0.32, 4, 8), new THREE.MeshToonMaterial({ color: 0xffffff }));
  const balloons = pool(24, new THREE.SphereGeometry(0.42, 12, 10), new THREE.MeshPhongMaterial({ color: 0xffffff, shininess: 100 }));
  const strings = pool(24, new THREE.CylinderGeometry(0.02, 0.02, 0.9, 4), new THREE.MeshBasicMaterial({ color: 0x2a2140 }));
  const spawn = (P) => { const it = P.items[P.next]; P.next = (P.next + 1) % P.items.length; return it; };

  function puff(x, y, z, size = 1) {
    const it = spawn(dust); Object.assign(it, { x, y, z, vx: (rng() - 0.5) * 4, vy: 1.5 + rng() * 2, vz: (rng() - 0.5) * 4, life: 0.5 + rng() * 0.35, max: 1.1, size: size * (0.6 + rng() * 0.8) });
  }
  function burstConfetti(x, y, z, n = 20, colors = PALETTE) {
    for (let k = 0; k < n; k++) {
      const it = spawn(confetti), i = confetti.items.indexOf(it);
      confetti.m.setColorAt(i, col.setHex(colors[k % colors.length]));
      Object.assign(it, { x, y, z, vx: (rng() - 0.5) * 10, vy: 6 + rng() * 8, vz: (rng() - 0.5) * 10, life: 2.5, rx: rng() * 6, ry: rng() * 6 });
    }
    if (confetti.m.instanceColor) confetti.m.instanceColor.needsUpdate = true;
  }
  function releaseResidents(x, y, z, n) {
    for (let k = 0; k < n; k++) {
      const it = spawn(people), i = people.items.indexOf(it);
      people.m.setColorAt(i, col.setHex([0xffd2a1, 0xc68a5c, 0xffe0bd, 0x8d5a3b][k % 4]));
      balloons.m.setColorAt(i, col.setHex([0xff5a4f, 0xffc531, 0x3fa9ff, 0x22c6a3, 0x9b6bff][Math.floor(rng() * 5)]));
      Object.assign(it, { x: x + (rng() - 0.5) * 3, y: y + rng(), z: z + (rng() - 0.5) * 3, vx: (rng() - 0.5) * 1.5, vy: 2.2 + rng(), vz: (rng() - 0.5) * 1.5, life: 4.5, max: 4.5, ph: rng() * 6 });
    }
    people.m.instanceColor.needsUpdate = balloons.m.instanceColor.needsUpdate = true;
  }
  function updateParticles(dt) {
    for (const [i, it] of dust.items.entries()) {
      if (it.life <= 0) continue; it.life -= dt; it.x += it.vx * dt; it.y += it.vy * dt; it.z += it.vz * dt; it.vy *= Math.exp(-2 * dt);
      const k = Math.max(0, it.life) / it.max, s = it.size * Math.sin(Math.min(1, (1 - k) * 2.2 + 0.2) * Math.PI * 0.5) * (k < 0.3 ? k / 0.3 : 1);
      dust.m.setMatrixAt(i, mtx.compose(v3.set(it.x, it.y, it.z), quat.identity(), one.setScalar(Math.max(0, s))));
    }
    for (const [i, it] of confetti.items.entries()) {
      if (it.life <= 0) continue; it.life -= dt; it.vy -= 14 * dt; it.vx *= Math.exp(-1.5 * dt); it.vz *= Math.exp(-1.5 * dt);
      if (it.vy < -3) it.vy = -3; it.x += it.vx * dt; it.y = Math.max(0.05, it.y + it.vy * dt); it.z += it.vz * dt; it.rx += dt * 7; it.ry += dt * 5;
      quat.setFromEuler(new THREE.Euler(it.rx, it.ry, 0));
      confetti.m.setMatrixAt(i, mtx.compose(v3.set(it.x, it.y, it.z), quat, one.setScalar(it.life > 0.4 ? 1 : it.life / 0.4)));
    }
    for (const [i, it] of people.items.entries()) {
      if (it.life <= 0) continue; it.life -= dt;
      it.x += (it.vx + Math.sin(it.life * 2 + it.ph) * 0.6) * dt; it.y += it.vy * dt; it.z += it.vz * dt;
      const s = it.life < 0.5 ? it.life / 0.5 : Math.min(1, (it.max - it.life) * 4);
      const sway = Math.sin(it.life * 4 + it.ph) * 0.25;
      quat.setFromEuler(new THREE.Euler(0, 0, sway));
      people.m.setMatrixAt(i, mtx.compose(v3.set(it.x, it.y, it.z), quat, one.setScalar(s)));
      balloons.m.setMatrixAt(i, mtx.compose(v3.set(it.x - sway, it.y + 1.5, it.z), quat.identity(), one.set(s, s * 1.15, s)));
      strings.m.setMatrixAt(i, mtx.compose(v3.set(it.x - sway * 0.5, it.y + 0.75, it.z), quat.setFromEuler(new THREE.Euler(0, 0, sway * 0.6)), one.setScalar(s)));
    }
    for (const P of [dust, confetti, people, balloons, strings]) P.m.instanceMatrix.needsUpdate = true;
  }

  // ---------- breaking
  const rubbleCap = quality.rubble;
  let rubbleCount = 0, clock = 0;
  const events = []; // game.js drains these: { type, b, x, z, points, chain }
  const intactLeft = () => buildings.filter((b) => b.state === 'intact').length;

  function launch(i, vx, vy, vz) {
    vox.state[i] = 1; vox.vx[i] = vx; vox.vy[i] = vy; vox.vz[i] = vz;
    vox.w[i * 3] = (rng() - 0.5) * 12; vox.w[i * 3 + 1] = (rng() - 0.5) * 12; vox.w[i * 3 + 2] = (rng() - 0.5) * 12;
  }

  /** Bites blocks within radius r of point p off building b, flung along dir. Returns blocks removed. */
  function bite(b, p, r, dir, power = 1) {
    if (b.state !== 'intact') return 0;
    let n = 0;
    for (let i = b.start; i < b.start + b.total; i++) {
      if (vox.state[i] !== 0) continue;
      const dx = vox.px[i] - p.x, dy = vox.py[i] - p.y, dz = vox.pz[i] - p.z;
      if (dx * dx + dy * dy + dz * dz > r * r) continue;
      launch(i, dir.x * (5 + rng() * 6) * power + dx * 2, 3 + rng() * 6, dir.z * (5 + rng() * 6) * power + dz * 2); n++;
    }
    b.alive -= n;
    if (n) for (let k = 0; k < 2; k++) puff(p.x, p.y, p.z, 1.2);
    if (b.alive / b.total < cfg.collapseAt) collapse(b, dir, 0);
    return n;
  }

  /** Brings a building down: tall ones topple away from dir, the rest pancake. chain counts dominoes. */
  function collapse(b, dir, chain) {
    if (b.state !== 'intact') return;
    const tall = b.h >= cfg.toppleMinHeight;
    events.push({ type: 'collapse', b, x: b.cx, z: b.cz, chain });
    releaseResidents(b.cx, Math.min(b.h, 6), b.cz, 2 + Math.floor(rng() * 3));
    if (tall) {
      const ax = Math.abs(dir.x) > Math.abs(dir.z);
      const fx = ax ? Math.sign(dir.x) || 1 : 0, fz = ax ? 0 : Math.sign(dir.z) || 1;
      const pivot = new THREE.Vector3(fx > 0 ? b.x0 + b.w : fx < 0 ? b.x0 : b.cx, 0, fz > 0 ? b.z0 + b.d : fz < 0 ? b.z0 : b.cz);
      b.state = 'toppling';
      b.topple = { fx, fz, pivot, axis: new THREE.Vector3(fz, 0, -fx), angle: 0, angVel: 0.25, chain };
    } else {
      b.state = 'gone';
      for (let i = b.start; i < b.start + b.total; i++) if (vox.state[i] === 0) launch(i, (rng() - 0.5) * 3 + dir.x * 2, -rng() * 2, (rng() - 0.5) * 3 + dir.z * 2);
      for (let k = 0; k < 6; k++) puff(b.cx + (rng() - 0.5) * b.w, 0.8, b.cz + (rng() - 0.5) * b.d, 2.2);
      b.alive = 0;
    }
  }

  function updateTopples(dt) {
    for (const b of buildings) {
      if (b.state !== 'toppling') continue;
      const T = b.topple;
      T.angVel += (1.8 + 7 * Math.sin(T.angle)) * dt; T.angle = Math.min(Math.PI / 2, T.angle + T.angVel * dt);
      qd.setFromAxisAngle(T.axis, -T.angle);
      for (let i = b.start; i < b.start + b.total; i++) {
        if (vox.state[i] !== 0) continue;
        v3.set(vox.ox[i] - T.pivot.x, vox.oy[i], vox.oz[i] - T.pivot.z).applyQuaternion(qd);
        vox.px[i] = T.pivot.x + v3.x; vox.py[i] = Math.max(HALF, v3.y); vox.pz[i] = T.pivot.z + v3.z;
        vox.q[i * 4] = qd.x; vox.q[i * 4 + 1] = qd.y; vox.q[i * 4 + 2] = qd.z; vox.q[i * 4 + 3] = qd.w;
        writeMatrix(i);
      }
      if (T.angle >= Math.PI / 2 - 0.05) {
        b.state = 'gone';
        const speed = T.angVel;
        for (let i = b.start; i < b.start + b.total; i++) if (vox.state[i] === 0) {
          const r = Math.hypot(vox.px[i] - T.pivot.x, vox.pz[i] - T.pivot.z);
          launch(i, T.fx * speed * r * 0.12 + (rng() - 0.5) * 3, 2 + rng() * 4, T.fz * speed * r * 0.12 + (rng() - 0.5) * 3);
        }
        b.alive = 0;
        // where it lands: everything under the fallen length comes down too
        const hits = new Set();
        for (let s = 1; s <= b.h + 1; s += 0.7) {
          const x = T.pivot.x + T.fx * s, z = T.pivot.z + T.fz * s;
          for (const o of buildings) if (o.state === 'intact' && x > o.x0 - 0.5 && x < o.x0 + o.w + 0.5 && z > o.z0 - 0.5 && z < o.z0 + o.d + 0.5) hits.add(o);
          if (s % 3 < 0.7) puff(x, 0.6, z, 2.4);
        }
        events.push({ type: 'land', b, x: T.pivot.x + T.fx * b.h * 0.6, z: T.pivot.z + T.fz * b.h * 0.6, chain: T.chain, hits: hits.size });
        const fall = new THREE.Vector3(T.fx, 0, T.fz);
        for (const o of hits) {
          if (o.k <= b.k) collapse(o, fall, T.chain + 1); // same size or smaller: knocked down
          else bite(o, new THREE.Vector3(o.cx - T.fx * o.w / 2, Math.min(o.h - 1, b.h * 0.5), o.cz - T.fz * o.d / 2), 2.5 + b.k * 0.5, fall, 1.4); // bigger: dented
        }
      }
    }
  }

  const kickR2 = 1;
  function updateBlocks(dt, monster) {
    clock += dt;
    let dirty = false;
    const mx = monster.x, mz = monster.z, mr = monster.r * 0.8, mr2 = mr * mr;
    for (let i = 0; i < count; i++) {
      const st = vox.state[i];
      if (st === 1) {
        vox.vy[i] -= GRAVITY * dt;
        vox.px[i] += vox.vx[i] * dt; vox.py[i] += vox.vy[i] * dt; vox.pz[i] += vox.vz[i] * dt;
        const w = vox.w.subarray(i * 3, i * 3 + 3);
        qd.setFromEuler(new THREE.Euler(w[0] * dt, w[1] * dt, w[2] * dt));
        quat.set(vox.q[i * 4], vox.q[i * 4 + 1], vox.q[i * 4 + 2], vox.q[i * 4 + 3]).multiply(qd);
        vox.q[i * 4] = quat.x; vox.q[i * 4 + 1] = quat.y; vox.q[i * 4 + 2] = quat.z; vox.q[i * 4 + 3] = quat.w;
        if (vox.py[i] < HALF) {
          vox.py[i] = HALF; vox.vy[i] *= -0.28; vox.vx[i] *= 0.55; vox.vz[i] *= 0.55; w[0] *= 0.5; w[1] *= 0.5; w[2] *= 0.5;
          if (Math.abs(vox.vy[i]) < 1.2 && vox.vx[i] * vox.vx[i] + vox.vz[i] * vox.vz[i] < 1) {
            vox.state[i] = 2; vox.settledAt[i] = clock; rubbleCount++;
            // lie flat on a face: keep only the yaw
            const e = new THREE.Euler().setFromQuaternion(quat, 'YXZ'); quat.setFromEuler(new THREE.Euler(0, e.y, 0));
            vox.q[i * 4] = quat.x; vox.q[i * 4 + 1] = quat.y; vox.q[i * 4 + 2] = quat.z; vox.q[i * 4 + 3] = quat.w;
          }
        }
        writeMatrix(i); dirty = true;
      } else if (st === 2) {
        const dx = vox.px[i] - mx, dz = vox.pz[i] - mz, d2 = dx * dx + dz * dz;
        if (monster.moving && d2 < mr2 * kickR2) { // kicked by a foot
          const d = Math.sqrt(d2) || 1; rubbleCount--;
          launch(i, dx / d * (4 + rng() * 4), 2 + rng() * 3, dz / d * (4 + rng() * 4));
        } else if (rubbleCount > rubbleCap && clock - vox.settledAt[i] > 6) { // tidy the oldest rubble away
          vox.s[i] -= dt * 1.5;
          if (vox.s[i] <= 0) { vox.s[i] = 0; vox.state[i] = 3; rubbleCount--; }
          writeMatrix(i); dirty = true;
        }
      }
    }
    if (dirty) blocks.instanceMatrix.needsUpdate = true;
  }

  // ---------- queries for game.js
  /** Buildings whose footprint is within r of (x, z), with the closest point. */
  function touching(x, z, r) {
    const out = [];
    for (const b of buildings) {
      if (b.state !== 'intact') continue;
      const px = Math.max(b.x0, Math.min(x, b.x0 + b.w)), pz = Math.max(b.z0, Math.min(z, b.z0 + b.d));
      const d = Math.hypot(x - px, z - pz);
      if (d < r) out.push({ b, px, pz, d });
    }
    return out;
  }
  function nearest(x, z, filter) {
    let best = null, bd = Infinity;
    for (const b of buildings) if (b.state === 'intact' && (!filter || filter(b))) { const d = Math.hypot(b.cx - x, b.cz - z); if (d < bd) bd = d, best = b; }
    return best;
  }
  function squashCars(x, z, r) {
    const hit = [];
    for (const c of cars) if (c.squash <= 0 && Math.hypot(c.x - x, c.z - z) < r + 1) { c.squash = 5; hit.push(c); }
    return hit;
  }
  function crushTrees(x, z, r) {
    let n = 0;
    for (const [i, t] of trees.entries()) if (t.alive && Math.hypot(t.x - x, t.z - z) < r + 0.6) {
      t.alive = false; placeTree(i); n++;
      burstConfetti(t.x, 2, t.z, 10, [0x4cc35a, 0x6fd64b, 0x2fb37a, 0xffc531]);
    }
    return n;
  }

  function update(dt, monster) { updateTopples(dt); updateBlocks(dt, monster); updateCars(dt); updateParticles(dt); }
  /** Where the camera and Bonbon are, for the see-through cut. */
  function setXray(cam, mon, r) { const u = blocks.material.userData.uniforms; u.uCam.value.copy(cam); u.uMon.value.copy(mon); u.uR.value = r; }

  return {
    group, buildings, half, span, events, update, setXray, bite, collapse, touching, nearest, squashCars, crushTrees,
    puff, burstConfetti, releaseResidents, intactLeft,
    get blocksLeft() { let n = 0; for (const b of buildings) if (b.state === 'intact') n += b.alive; return n; },
    totalBlocks, meshes: { blocks, crownMesh, carBody },
    dispose() { scene.remove(group); group.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); }); },
  };
}
