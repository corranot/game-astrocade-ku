// PROTOTYPE - NOT FOR PRODUCTION
// Bonbon v2: the gummy dino. A chubby pear body with a separate head (snout, opening jaw, teeth, nostrils, big
// eyes), clawed arms and toed feet, a 6-segment spring tail and back spikes. Candy material: glossy clearcoat
// with an environment reflection on capable devices, smooth matte shading on low-end ones; thin ink outline either way.
// Animated in code: walk, squash and stretch, jelly belly, jaw, look-at eyes, six faces.
/* global THREE */ // Three.js r187, loaded by index.html (import map) and set on window before run()
import { toon } from './toon.js';

const PINK = 0xff5fa2, PINK_D = 0xe8478a, SPOT = 0xff86bb, BELLY = 0xffe3ef, SPIKE = 0xffc531, INK = 0x3a1f3d, WHITE = 0xffffff, MOUTH = 0x8a1d48, TONGUE = 0xff7aa8;

/**
 * Builds Bonbon. opts.candy: glossy physical material (needs scene.environment) or matte Lambert.
 * Returns { root, update(dt, state), setStage, face, stomp, roar, resetTail, dispose }.
 */
export function createBonbon(opts = {}) {
  const mats = new Map();
  const mat = (c, gloss = 1) => {
    const key = c + ':' + gloss; if (mats.has(key)) return mats.get(key);
    const m = toon({ color: c }); // cel-shaded on every phone
    mats.set(key, m); return m;
  };
  const flat = (c) => { const k = 'b' + c; if (!mats.has(k)) mats.set(k, new THREE.MeshBasicMaterial({ color: c })); return mats.get(k); };
  const inkMat = new THREE.MeshBasicMaterial({ color: INK, side: THREE.BackSide });
  const geos = [];
  const G = (g) => { geos.push(g); return g; };

  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  const part = (geo, m, parent, outline = 0.045) => {
    const mesh = new THREE.Mesh(geo, m); mesh.castShadow = true; parent.add(mesh);
    if (outline) { const hull = new THREE.Mesh(geo, inkMat); hull.scale.setScalar(1 + outline * 0.28); mesh.add(hull); } // a very thin ink line
    return mesh;
  };
  const sphere = G(new THREE.SphereGeometry(1, 28, 20));

  // body: pear of two spheres, belly plate, spots
  const torso = new THREE.Group(); torso.position.y = 1.2; body.add(torso);
  const upper = part(sphere, mat(PINK), torso); upper.scale.set(0.92, 0.95, 0.85); upper.position.y = 0.25;
  const lower = part(sphere, mat(PINK), torso); lower.scale.set(1.08, 0.95, 1.0); lower.position.y = -0.25;
  const belly = part(sphere, mat(BELLY, 0.6), torso, 0); belly.scale.set(0.78, 1.0, 0.42); belly.position.set(0, -0.1, 0.66);
  for (const [x, y, z, s] of [[-0.75, 0.1, -0.4, 0.2], [0.8, -0.3, -0.3, 0.16], [-0.4, 0.55, -0.62, 0.13], [0.35, -0.5, -0.82, 0.18]]) {
    const sp = part(sphere, mat(SPOT, 0.4), torso, 0); sp.position.set(x, y, z); sp.scale.set(s, s, s * 0.45); sp.lookAt(x * 3, y * 3, z * 3);
  }

  // head with snout, jaw, teeth, nostrils, eyes
  const head = new THREE.Group(); head.position.set(0, 2.1, 0.22); body.add(head);
  const skull = part(sphere, mat(PINK), head); skull.scale.set(0.72, 0.66, 0.7);
  const snout = part(sphere, mat(PINK), head); snout.scale.set(0.56, 0.36, 0.5); snout.position.set(0, -0.12, 0.5);
  for (const s of [-1, 1]) { const n = new THREE.Mesh(sphere, flat(INK)); n.scale.setScalar(0.045); n.position.set(0.14 * s, -0.04, 0.97); head.add(n); }
  for (const s of [-1, 1]) { const t = new THREE.Mesh(G(new THREE.ConeGeometry(0.06, 0.13, 8)), mat(WHITE, 0.3)); t.rotation.x = Math.PI; t.position.set(0.18 * s, -0.33, 0.83); head.add(t); }
  const jaw = new THREE.Group(); jaw.position.set(0, -0.28, 0.22); head.add(jaw);
  const jawMesh = part(sphere, mat(PINK_D), jaw); jawMesh.scale.set(0.48, 0.2, 0.5); jawMesh.position.set(0, -0.06, 0.28);
  const mouthIn = new THREE.Mesh(sphere, flat(MOUTH)); mouthIn.scale.set(0.42, 0.12, 0.44); mouthIn.position.set(0, -0.12, 0.47); head.add(mouthIn);
  const tongue = new THREE.Mesh(sphere, mat(TONGUE, 0.5)); tongue.scale.set(0.24, 0.07, 0.28); tongue.position.set(0, 0.06, 0.3); jaw.add(tongue);
  const eyes = [], pupils = [], pupilMat = new THREE.MeshBasicMaterial({ color: 0x1a1030 });
  for (const s of [-1, 1]) {
    const eye = part(sphere, mat(WHITE, 0.8), head, 0.08); eye.scale.set(0.24, 0.27, 0.2); eye.position.set(0.3 * s, 0.22, 0.48);
    const pupil = new THREE.Mesh(sphere, pupilMat); pupil.scale.set(0.5, 0.5, 0.4); pupil.position.set(0, 0, 0.72); eye.add(pupil);
    const shine = new THREE.Mesh(sphere, flat(WHITE)); shine.scale.setScalar(0.32); shine.position.set(0.35, 0.4, 0.6); pupil.add(shine);
    eyes.push(eye); pupils.push(pupil);
  }
  const brows = [-1, 1].map((s) => { const b = new THREE.Mesh(G(new THREE.BoxGeometry(0.26, 0.06, 0.06)), flat(INK)); b.position.set(0.3 * s, 0.5, 0.58); b.userData.s = s; head.add(b); return b; });
  const blush = [-1, 1].map((s) => { const b = new THREE.Mesh(sphere, flat(0xff9cc6)); b.scale.set(0.12, 0.07, 0.03); b.position.set(0.52 * s, -0.05, 0.42); b.rotation.y = 0.6 * s; head.add(b); return b; });
  const dizzy = new THREE.Group(); dizzy.position.y = 0.75; head.add(dizzy); dizzy.visible = false;
  const starGeo = G(new THREE.OctahedronGeometry(0.12));
  for (let i = 0; i < 4; i++) { const st = new THREE.Mesh(starGeo, flat(SPIKE)); st.position.set(Math.cos(i * 1.57) * 0.7, 0, Math.sin(i * 1.57) * 0.7); dizzy.add(st); }

  // arms with claws, legs with toes
  const clawGeo = G(new THREE.ConeGeometry(0.06, 0.18, 8));
  const arms = [-1, 1].map((s) => {
    const a = new THREE.Group(); a.position.set(0.82 * s, 1.55, 0.35); body.add(a);
    const g = G(new THREE.CapsuleGeometry(0.17, 0.32, 6, 12)); g.translate(0, -0.25, 0);
    part(g, mat(PINK), a);
    for (let k = -1; k <= 1; k++) { const c = new THREE.Mesh(clawGeo, mat(WHITE, 0.3)); c.position.set(k * 0.08, -0.6, 0.08); c.rotation.x = Math.PI * 0.85; a.add(c); }
    return a;
  });
  const legs = [-1, 1].map((s) => {
    const l = new THREE.Group(); l.position.set(0.52 * s, 0.62, 0.05); body.add(l);
    const g = G(new THREE.CapsuleGeometry(0.32, 0.25, 6, 12)); g.translate(0, -0.2, 0);
    part(g, mat(PINK_D), l);
    const foot = part(sphere, mat(PINK_D), l); foot.scale.set(0.36, 0.2, 0.46); foot.position.set(0, -0.5, 0.16);
    for (let k = -1; k <= 1; k++) { const c = new THREE.Mesh(clawGeo, mat(WHITE, 0.3)); c.position.set(k * 0.14, -0.55, 0.58); c.rotation.x = Math.PI / 2; l.add(c); }
    return l;
  });

  // tail: 6 spring segments
  const tail = [];
  for (let i = 0; i < 6; i++) {
    const r = 0.5 - i * 0.065;
    const seg = part(sphere, mat(i % 2 ? PINK : PINK_D), root, 0.06); seg.scale.setScalar(r);
    seg.userData = { r, pos: new THREE.Vector3(), vel: new THREE.Vector3() };
    tail.push(seg);
  }

  // spikes: crown and back, more as Bonbon grows
  const spikes = new THREE.Group(); body.add(spikes);
  const spikeGeo = G(new THREE.ConeGeometry(0.2, 0.46, 10));
  function setStage(stage) {
    spikes.clear();
    const n = 4 + Math.min(stage, 6);
    for (let i = 0; i < n; i++) {
      const f = i / (n - 1), a = -0.6 + f * 2.2; // from the crown over the back
      const s = part(spikeGeo, mat(SPIKE, 0.8), spikes, 0.08);
      const onHead = a < 0.15;
      if (onHead) { s.position.set(0, 2.1 + Math.cos(a + 0.6) * 0.68, 0.22 - Math.sin(a + 0.6) * 0.5); s.rotation.x = -(a + 0.6) * 0.8; }
      else { s.position.set(0, 1.45 + Math.cos(a) * 0.95, -Math.sin(a) * 0.9); s.rotation.x = -a; }
      s.scale.setScalar(0.8 + stage * 0.05 - Math.abs(f - 0.35) * 0.35);
    }
  }
  setStage(1);

  let poseName = '', poseT = 0, poseDur = 1, wantJawOverride = 0, rainbowEyes = false;
  let headYaw = 0, laughT = 0, t = 0, walkPhase = 0, squash = 0, squashV = 0, faceName = 'happy', faceTimer = 0, blink = 0, roarT = 0, attackT = 0, jawOpen = 0;
  const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3();
  function setFace(name, sec = 1) { faceName = name; faceTimer = sec; }

  function applyFace(dt) {
    const f = faceName;
    const wantJaw = f === 'roar' ? 0.75 : f === 'surprised' ? 0.45 : f === 'win' ? 0.4 : f === 'angry' ? 0.12 : f === 'dizzy' ? 0.3 : 0.18;
    jawOpen += (Math.max(wantJaw, wantJawOverride) - jawOpen) * Math.min(1, dt * 14); wantJawOverride = 0;
    jaw.rotation.x = jawOpen;
    mouthIn.scale.y = 0.06 + jawOpen * 0.32;
    for (const b of brows) {
      b.visible = f === 'angry' || f === 'roar' || f === 'surprised';
      b.rotation.z = f === 'surprised' ? 0.2 * b.userData.s : -0.45 * b.userData.s;
      b.position.y = f === 'surprised' ? 0.58 : 0.48;
    }
    const eyeY = blink > 0 ? 0.04 : f === 'win' ? 0.1 : f === 'surprised' ? 0.33 : 0.27;
    for (const e of eyes) e.scale.y += (eyeY - e.scale.y) * Math.min(1, dt * 25);
    for (const b of blush) b.visible = f === 'happy' || f === 'win';
    dizzy.visible = f === 'dizzy';
  }

  let update = function (dt, state) {
    t += dt;
    faceTimer -= dt; if (faceTimer <= 0 && faceName !== 'happy') faceName = 'happy';
    blink -= dt; if (blink < -2.6 - Math.sin(t * 3.1) * 1.2) blink = 0.12;
    roarT = Math.max(0, roarT - dt); attackT = Math.max(0, attackT - dt);
    const moving = state.moving;
    walkPhase += dt * (moving ? 8 + state.speed * 0.25 : 0);
    const step = Math.sin(walkPhase);
    legs[0].position.y = 0.62 + (moving ? Math.max(0, step) * 0.3 : 0);
    legs[1].position.y = 0.62 + (moving ? Math.max(0, -step) * 0.3 : 0);
    legs[0].rotation.x = moving ? step * 0.55 : 0; legs[1].rotation.x = moving ? -step * 0.55 : 0;
    const bob = moving ? Math.abs(Math.cos(walkPhase)) * 0.14 : Math.sin(t * 2.2) * 0.03;
    squashV += (-squash * 140 - squashV * 9) * dt; squash += squashV * dt;
    const sy = 1 - squash + (roarT > 0 ? 0.1 : 0), sxz = 1 + squash * 0.55;
    body.scale.set(sxz, sy, sxz); body.position.y = bob;
    const atk = attackT > 0 ? Math.sin((attackT / 0.3) * Math.PI) : 0;
    torso.rotation.x = (moving ? 0.1 : 0) + atk * 0.25; torso.rotation.z = moving ? step * 0.06 : 0;
    head.rotation.x = -0.05 + atk * 0.35 - (roarT > 0 ? 0.35 : 0) + (moving ? Math.cos(walkPhase * 2) * 0.03 : Math.sin(t * 1.7) * 0.03);
    head.rotation.z = moving ? -step * 0.05 : Math.sin(t * 0.9) * 0.05;
    // the head turns toward what Bonbon is about to break
    let wantYaw = 0;
    if (state.lookAt) { root.worldToLocal(tmp.copy(state.lookAt)); wantYaw = THREE.MathUtils.clamp(Math.atan2(tmp.x, tmp.z), -0.7, 0.7); }
    headYaw += (wantYaw - headYaw) * Math.min(1, dt * 6); head.rotation.y = headYaw;
    // a laugh: a quick giggle shake of the whole body
    if (laughT > 0) { laughT -= dt; body.rotation.z = Math.sin(t * 38) * 0.07 * Math.min(1, laughT * 2); head.rotation.x -= 0.25; } else body.rotation.z = 0;
    belly.scale.set(0.78 + squash * 0.25, 1.0 - squash * 0.2, 0.42);
    for (const [i, a] of arms.entries()) {
      const s = i ? 1 : -1;
      a.rotation.x = atk ? -1.7 * atk : moving ? Math.sin(walkPhase + i * Math.PI) * 0.6 : Math.sin(t * 2 + i) * 0.1;
      a.rotation.z = (roarT > 0 ? 1.4 : 0.35) * -s;
    }
    // a move's own body language, on top of the walk (k goes 0 -> 1 over the move)
    if (poseT > 0) {
      poseT -= dt; const k = 1 - Math.max(0, poseT) / poseDur, inOut = Math.sin(Math.min(1, k) * Math.PI);
      const ease = (a, b2) => THREE.MathUtils.smoothstep(k, a, b2);
      if (poseName === 'flop') { // leaps, tips forward onto the belly in the air, lands flat, pops back up
        body.rotation.x = 1.25 * ease(0.1, 0.55) * (1 - ease(0.8, 1)); for (const [i, a] of arms.entries()) { a.rotation.z = (i ? -1 : 1) * 1.7 * inOut; a.rotation.x = -0.4; }
      } else if (poseName === 'spin') { // arms flung out like a spinning top, head back laughing
        for (const [i, a] of arms.entries()) { a.rotation.z = (i ? -1 : 1) * 1.55; a.rotation.x = 0; } head.rotation.x -= 0.3 * inOut;
      } else if (poseName === 'bubble') { // cheeks puffed, mouth open, head pushed forward
        head.rotation.x += 0.25 * inOut; head.scale.set(1 + 0.12 * inOut, 1, 1 + 0.06 * inOut); wantJawOverride = 0.9 * inOut;
      } else if (poseName === 'roar') { // leans back and opens wide, arms up
        torso.rotation.x -= 0.25 * inOut; for (const [i, a] of arms.entries()) { a.rotation.z = (i ? -1 : 1) * 2.0 * inOut; a.rotation.x = -0.6 * inOut; }
      } else if (poseName === 'jelly') { // wobbles like jelly between hops
        body.rotation.z = Math.sin(k * 40) * 0.12 * inOut; for (const [i, a] of arms.entries()) a.rotation.z = (i ? -1 : 1) * (0.6 + Math.sin(k * 30) * 0.5);
      } else if (poseName === 'magnet') { // arms wide open to pull everything in, then a big hug
        const open = 1 - ease(0.45, 0.6);
        for (const [i, a] of arms.entries()) { a.rotation.z = (i ? -1 : 1) * (1.7 * open + 0.15); a.rotation.x = -0.3 * open - 1.5 * (1 - open) * (1 - ease(0.85, 1)); }
        torso.rotation.x += 0.25 * (1 - open) * (1 - ease(0.85, 1));
      } else if (poseName === 'rainbow') { // head forward, eyes wide and glowing in rainbow colours
        head.rotation.x += 0.2 * inOut; for (const e of eyes) e.scale.y = 0.27 + 0.08 * inOut;
        pupilMat.color.setHSL((t * 2) % 1, 0.9, 0.55); rainbowEyes = true;
      } else if (poseName === 'sneeze') { // ah... ah... (head and body back) CHOO! (snap forward, mouth open)
        const back = ease(0, 0.55) * (1 - ease(0.55, 0.65)), snap = ease(0.55, 0.65) * (1 - ease(0.8, 1));
        head.rotation.x += -0.7 * back + 0.6 * snap; torso.rotation.x += -0.3 * back + 0.35 * snap; wantJawOverride = 0.9 * snap;
        for (const e of eyes) e.scale.y = 0.27 - 0.2 * back;
      } else if (poseName === 'moon') { // arms up to the sky, legs tucked
        for (const [i, a] of arms.entries()) { a.rotation.z = (i ? -1 : 1) * 2.7 * inOut; a.rotation.x = 0; } for (const l of legs) l.rotation.x = -0.6 * inOut;
      }
      if (poseT <= 0) { body.rotation.x = 0; head.scale.set(1, 1, 1); poseName = ''; }
    }
    if (rainbowEyes && poseName !== 'rainbow') { pupilMat.color.setHex(0x1a1030); rainbowEyes = false; }
    const look = state.lookAt;
    for (const p of pupils) {
      let lx = Math.sin(t * 0.7) * 0.12, ly = 0;
      if (look) { head.worldToLocal(tmp.copy(look)); lx = THREE.MathUtils.clamp(tmp.x * 0.15, -0.25, 0.25); ly = THREE.MathUtils.clamp(tmp.y * 0.1, -0.2, 0.2); }
      if (faceName === 'dizzy') { lx = Math.cos(t * 9) * 0.25; ly = Math.sin(t * 9) * 0.25; }
      p.position.x = lx; p.position.y = ly;
    }
    dizzy.rotation.y += dt * 5;
    applyFace(dt);
    // tail springs in world space
    root.updateMatrixWorld();
    let prev = tmp2.set(0, 0.75, -0.8).applyMatrix4(root.matrixWorld);
    const sc = root.scale.x;
    for (const [i, seg] of tail.entries()) {
      const d = seg.userData, gap = (0.42 - i * 0.03) * sc;
      if (d.pos.lengthSq() === 0) d.pos.copy(prev);
      tmp.copy(d.pos).sub(prev); const len = tmp.length() || 1;
      d.vel.addScaledVector(tmp, -(len - gap) / len * 120 * dt); d.vel.multiplyScalar(Math.exp(-6 * dt));
      d.vel.y += Math.sin(t * 5 + i) * 0.4 * dt * sc;
      d.pos.addScaledVector(d.vel, dt);
      tmp.copy(d.pos).sub(prev).setLength(gap); d.pos.copy(prev).add(tmp);
      d.pos.y = Math.max(d.pos.y, (0.12 + d.r) * sc * 0.8);
      seg.position.copy(d.pos); root.worldToLocal(seg.position);
      prev = d.pos;
    }
  }

  let rainbow = false;
  const bodyMats = [...mats.values()].filter((m) => m.color && (m.color.getHex() === PINK || m.color.getHex() === PINK_D));
  const baseCol = bodyMats.map((m) => m.color.getHex()), hue = new THREE.Color();
  const isDark = baseCol.map((h) => h === PINK_D);
  /** A skin: the body colour and its darker shade (jaw, legs, tail rings). */
  function setSkin(c = PINK, d = PINK_D) { bodyMats.forEach((m, i) => { baseCol[i] = isDark[i] ? d : c; if (!rainbow) m.color.setHex(baseCol[i]); }); }

  // costumes on the head, built the first time they are worn (simple shapes with the same ink outline)
  const hats = {}, hatSpot = new THREE.Group(); hatSpot.position.set(0, 0.52, -0.08); hatSpot.scale.setScalar(1.3); head.add(hatSpot);
  let propeller = null;
  function makeHat(id) {
    const g = new THREE.Group(), ring = (r, n, y, geo, m, s = 1) => { for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2, p = part(geo, m, g, 0.06); p.position.set(Math.cos(a) * r, y, Math.sin(a) * r); p.scale.setScalar(s); } };
    if (id === 'party') {
      const cone = part(G(new THREE.ConeGeometry(0.3, 0.72, 18)), mat(0x3fa9ff, 0.8), g, 0.06); cone.position.y = 0.34; cone.rotation.z = -0.15;
      const pom = part(sphere, mat(0xffc531), g, 0.06); pom.scale.setScalar(0.12); pom.position.set(0.1, 0.72, 0);
      ring(0.24, 6, 0.16, sphere, mat(0xffffff, 0.6), 0.06);
    } else if (id === 'crown') {
      const band = part(G(new THREE.CylinderGeometry(0.36, 0.34, 0.2, 20)), mat(0xffc531, 1), g, 0.05); band.position.y = 0.08;
      ring(0.3, 6, 0.28, G(new THREE.ConeGeometry(0.08, 0.22, 8)), mat(0xffc531, 1));
      ring(0.355, 6, 0.08, sphere, mat(0xff4f7d, 1), 0.05);
    } else if (id === 'cowboy') {
      const brim = part(G(new THREE.CylinderGeometry(0.66, 0.66, 0.05, 28)), mat(0xc4834a, 0.4), g, 0.04); brim.position.y = 0.02;
      const top = part(G(new THREE.CylinderGeometry(0.28, 0.35, 0.36, 22)), mat(0xc4834a, 0.4), g, 0.05); top.position.y = 0.2;
      const band = part(G(new THREE.CylinderGeometry(0.355, 0.355, 0.07, 22)), mat(0x6b3d1f, 0.4), g, 0); band.position.y = 0.06;
    } else if (id === 'chef') {
      const tube = part(G(new THREE.CylinderGeometry(0.3, 0.3, 0.32, 22)), mat(0xffffff, 0.5), g, 0.05); tube.position.y = 0.14;
      const puff = part(sphere, mat(0xffffff, 0.5), g, 0.05); puff.scale.set(0.42, 0.3, 0.42); puff.position.y = 0.42;
    } else if (id === 'flower') {
      const f = new THREE.Group(); f.position.set(0.32, 0.02, 0.1); f.rotation.z = -0.5; g.add(f);
      const mid = part(sphere, mat(0xffc531), f, 0.06); mid.scale.setScalar(0.1);
      for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2, p = part(sphere, mat(0xff86c8, 0.7), f, 0.06); p.scale.set(0.12, 0.05, 0.12); p.position.set(Math.cos(a) * 0.17, 0, Math.sin(a) * 0.17); }
    } else if (id === 'shades') {
      for (const s of [-1, 1]) { const l = part(G(new THREE.BoxGeometry(0.3, 0.18, 0.05)), mat(0x241238, 1), g, 0.06); l.position.set(0.3 * s, 0.22, 0.7); }
      const br = part(G(new THREE.BoxGeometry(0.2, 0.04, 0.04)), mat(0x241238, 1), g, 0); br.position.set(0, 0.26, 0.72);
    } else if (id === 'propeller') {
      const cap = part(G(new THREE.SphereGeometry(0.36, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2)), mat(0xff5a4f, 0.8), g, 0.05); cap.scale.y = 0.7;
      const stick = part(G(new THREE.CylinderGeometry(0.025, 0.025, 0.22, 6)), mat(0xffc531), g, 0); stick.position.y = 0.32;
      propeller = new THREE.Group(); propeller.position.y = 0.44; g.add(propeller);
      for (const col of [0x3fa9ff, 0x22c6a3]) { const b = part(G(new THREE.BoxGeometry(0.62, 0.025, 0.11)), mat(col, 0.8), propeller, 0.05); b.rotation.y = col === 0x3fa9ff ? 0 : Math.PI / 2; }
    }
    (id === 'shades' ? head : hatSpot).add(g);
    return g;
  }
  /** Wears one costume on the head ('none' or an unknown id takes it off). */
  function setHat(id) {
    for (const k in hats) hats[k].visible = false;
    if (!id || id === 'none') return;
    if (!hats[id]) hats[id] = makeHat(id);
    hats[id].visible = true;
  }

  /** Rainbow Mode: the body cycles through the rainbow and glows a little. */
  function setRainbow(on) {
    rainbow = on;
    bodyMats.forEach((m, i) => { m.color.setHex(baseCol[i]); if (m.emissive) m.emissive.setHex(0x000000); });
  }
  const _update = update;
  update = function (dt, state) {
    _update(dt, state);
    if (propeller && propeller.parent.visible) propeller.rotation.y += dt * 14;
    if (rainbow) bodyMats.forEach((m, i) => { m.color.copy(hue.setHSL((t * 0.35 + i * 0.12) % 1, 0.85, 0.62)); if (m.emissive) m.emissive.copy(hue).multiplyScalar(0.25); });
  };

  return {
    root, update: (dt, s) => update(dt, s), setStage, face: setFace, setRainbow, setSkin, setHat, get hatOn() { for (const k in hats) if (hats[k].visible) return k; return 'none'; },
    stomp(strength = 1) { squashV -= 6 * strength; attackT = 0.3; },
    /** Plays a move's body pose for sec seconds ('flop', 'spin', 'bubble', 'roar', 'jelly', 'magnet', 'rainbow', 'sneeze', 'moon'). */
    pose(name, sec) { poseName = name; poseT = poseDur = sec; },
    get posing() { return poseT > 0; },
    /** Where the eyes are in the world (for the rainbow beam). */
    eyeWorld(out) { return eyes[0].getWorldPosition(out).add(eyes[1].getWorldPosition(tmp2)).multiplyScalar(0.5); },
    roar() { roarT = 1.0; setFace('roar', 1.0); squashV += 5; },
    laugh() { laughT = 0.9; setFace('win', 1.0); },
    resetTail() { for (const s of tail) s.userData.pos.set(0, 0, 0), s.userData.vel.set(0, 0, 0); },
    dispose() { for (const g of geos) g.dispose(); for (const m of mats.values()) m.dispose(); inkMat.dispose(); pupilMat.dispose(); },
  };
}
