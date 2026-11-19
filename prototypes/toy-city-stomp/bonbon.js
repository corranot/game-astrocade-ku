// PROTOTYPE - NOT FOR PRODUCTION
// Bonbon: the gummy dino the player walks through the toy city. Built from primitives with a 3-step toon
// shade and an ink outline (back-face hull), animated in code: walk bob, squash and stretch, jelly belly,
// spring tail, eyes that look around, six faces (happy, angry, roar, dizzy, surprised, win).
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.187.0/build/three.module.js';

const PINK = 0xff5fa2, PINK_D = 0xe0407f, BELLY = 0xffc6de, SPIKE = 0xffc531, INK = 0x2a2140, WHITE = 0xffffff;

/** A 3-step gradient so toon materials read as flat cartoon bands. */
function toonRamp() {
  const t = new THREE.DataTexture(new Uint8Array([90, 90, 90, 255, 175, 175, 175, 255, 255, 255, 255, 255]), 3, 1);
  t.minFilter = t.magFilter = THREE.NearestFilter; t.needsUpdate = true; return t;
}

/**
 * Builds Bonbon. Returns { root, update(dt, state), setStage(stage), face(name, sec), stomp(), roar() }.
 * state: { moving, speed, lookAt: Vector3|null }.
 */
export function createBonbon() {
  const ramp = toonRamp();
  const mat = (c) => new THREE.MeshToonMaterial({ color: c, gradientMap: ramp });
  const inkMat = new THREE.MeshBasicMaterial({ color: INK, side: THREE.BackSide });
  const root = new THREE.Group();      // world position and heading
  const body = new THREE.Group();      // squash and stretch, bob
  root.add(body);

  /** A mesh plus its ink hull. */
  const part = (geo, m, parent, outline = 0.06) => {
    const mesh = new THREE.Mesh(geo, m); mesh.castShadow = true; parent.add(mesh);
    if (outline) { const hull = new THREE.Mesh(geo, inkMat); hull.scale.setScalar(1 + outline); mesh.add(hull); }
    return mesh;
  };

  const torso = part(new THREE.SphereGeometry(1, 24, 18), mat(PINK), body);
  torso.scale.set(1.05, 1.2, 0.95); torso.position.y = 1.35;
  const belly = part(new THREE.SphereGeometry(0.72, 20, 14), mat(BELLY), torso, 0);
  belly.position.set(0, -0.12, 0.42); belly.scale.set(1, 1.05, 0.6);

  // face, on the front of the torso
  const face = new THREE.Group(); face.position.set(0, 0.6, 0.66); face.rotation.x = -0.35; torso.add(face);
  const eyes = [], pupils = [];
  for (const sx of [-0.33, 0.33]) {
    const eye = part(new THREE.SphereGeometry(0.3, 16, 12), mat(WHITE), face, 0.1);
    eye.position.set(sx * 1.1, 0.22, -0.05); eye.scale.set(1, 1.12, 0.85);
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 10), new THREE.MeshBasicMaterial({ color: INK }));
    pupil.position.set(0, 0, 0.25); eye.add(pupil);
    const shine = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), new THREE.MeshBasicMaterial({ color: WHITE }));
    shine.position.set(0.04, 0.05, 0.1); pupil.add(shine);
    eyes.push(eye); pupils.push(pupil);
  }
  const brows = [-1, 1].map((s) => {
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.06, 0.06), new THREE.MeshBasicMaterial({ color: INK }));
    b.position.set(0.33 * s, 0.33, 0.08); face.add(b); b.userData.side = s; return b;
  });
  const smile = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.04, 8, 20, Math.PI), new THREE.MeshBasicMaterial({ color: INK }));
  smile.rotation.z = Math.PI; smile.position.set(0, -0.3, 0.02); face.add(smile);
  const mouth = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 12), new THREE.MeshBasicMaterial({ color: 0x7a1b3d }));
  mouth.position.set(0, -0.32, -0.02); mouth.scale.set(1, 0.85, 0.4); face.add(mouth);
  const tooth = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.09, 0.05), mat(WHITE));
  tooth.position.set(0, -0.2, 0.05); face.add(tooth);
  const blush = [-1, 1].map((s) => {
    const b = new THREE.Mesh(new THREE.CircleGeometry(0.1, 14), new THREE.MeshBasicMaterial({ color: 0xff8fc0 }));
    b.position.set(0.55 * s, -0.18, -0.05); b.rotation.y = 0.5 * s; face.add(b); return b;
  });
  // dizzy stars that orbit the head
  const dizzy = new THREE.Group(); dizzy.position.y = 2.55; body.add(dizzy); dizzy.visible = false;
  for (let i = 0; i < 4; i++) {
    const s = new THREE.Mesh(new THREE.OctahedronGeometry(0.13), new THREE.MeshBasicMaterial({ color: SPIKE }));
    s.position.set(Math.cos(i * 1.57) * 0.75, 0, Math.sin(i * 1.57) * 0.75); dizzy.add(s);
  }

  // arms and legs
  const limb = (r, len, color) => { const g = new THREE.CapsuleGeometry(r, len, 6, 12); g.translate(0, -len / 2, 0); return part(g, mat(color), body); };
  const arms = [-1, 1].map((s) => { const a = limb(0.17, 0.35, PINK); a.position.set(0.9 * s, 1.55, 0.25); a.rotation.z = 0.5 * s; return a; });
  const legs = [-1, 1].map((s) => { const l = limb(0.27, 0.32, PINK_D); l.position.set(0.48 * s, 0.62, 0); return l; });

  // tail: 4 spring-driven segments
  const tail = [];
  for (let i = 0; i < 4; i++) {
    const r = 0.42 - i * 0.08;
    const seg = part(new THREE.SphereGeometry(r, 14, 10), mat(i % 2 ? PINK : PINK_D), root, 0.08);
    seg.userData = { r, pos: new THREE.Vector3(), vel: new THREE.Vector3() };
    tail.push(seg);
  }

  // back spikes, rebuilt as Bonbon grows
  const spikes = new THREE.Group(); torso.add(spikes);
  const spikeGeo = new THREE.ConeGeometry(0.22, 0.5, 10), spikeMat = mat(SPIKE);
  function setStage(stage) {
    spikes.clear();
    const n = 3 + Math.min(stage, 6);
    for (let i = 0; i < n; i++) {
      const a = -0.25 + (i / (n - 1)) * 1.6; // from the crown down the back
      const s = part(spikeGeo, spikeMat, spikes, 0.1);
      s.position.set(0, Math.cos(a) * 1.0, -Math.sin(a) * 0.98);
      s.rotation.x = -a; s.scale.setScalar(1 + stage * 0.05 - Math.abs(i - n / 3) * 0.04);
    }
  }
  setStage(1);

  // animation state
  let t = 0, walkPhase = 0, squash = 0, squashV = 0, faceName = 'happy', faceTimer = 0, blink = 0, roarT = 0, attackT = 0;
  const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3();

  function setFace(name, sec = 1) { faceName = name; faceTimer = sec; }

  /** Applies the current face to eyes, brows, mouth. */
  function applyFace() {
    const f = faceName;
    smile.visible = f === 'happy' || f === 'win';
    mouth.visible = !smile.visible;
    const open = f === 'roar' ? 1.6 : f === 'surprised' ? 1.1 : f === 'angry' ? 0.6 : f === 'dizzy' ? 0.7 : 0.5;
    mouth.scale.set(1.1, 0.85 * open, 0.4);
    for (const b of brows) {
      b.visible = f === 'angry' || f === 'roar' || f === 'surprised';
      b.rotation.z = f === 'surprised' ? 0.15 * b.userData.side : -0.45 * b.userData.side;
      b.position.y = f === 'surprised' ? 0.42 : 0.3;
    }
    const eyeY = blink > 0 ? 0.12 : f === 'win' ? 0.5 : f === 'surprised' ? 1.3 : 1.12;
    for (const e of eyes) e.scale.y = eyeY;
    for (const b of blush) b.visible = f === 'happy' || f === 'win';
    dizzy.visible = f === 'dizzy';
  }

  function update(dt, state) {
    t += dt;
    faceTimer -= dt; if (faceTimer <= 0 && faceName !== 'happy') faceName = 'happy';
    blink -= dt; if (blink < -2.6 - Math.sin(t * 3.1) * 1.2) blink = 0.12;
    roarT = Math.max(0, roarT - dt); attackT = Math.max(0, attackT - dt);

    // walk cycle
    const moving = state.moving;
    walkPhase += dt * (moving ? 9 + state.speed * 0.3 : 0);
    const step = Math.sin(walkPhase);
    legs[0].position.y = 0.62 + (moving ? Math.max(0, step) * 0.28 : 0);
    legs[1].position.y = 0.62 + (moving ? Math.max(0, -step) * 0.28 : 0);
    legs[0].rotation.x = moving ? step * 0.5 : 0; legs[1].rotation.x = moving ? -step * 0.5 : 0;
    const bob = moving ? Math.abs(Math.cos(walkPhase)) * 0.12 : Math.sin(t * 2.2) * 0.03;

    // jelly squash: a damped spring on vertical scale
    squashV += (-squash * 140 - squashV * 9) * dt; squash += squashV * dt;
    const sy = 1 - squash + (roarT > 0 ? 0.12 : 0), sxz = 1 + squash * 0.55;
    body.scale.set(sxz, sy, sxz);
    body.position.y = bob;
    torso.rotation.x = (moving ? 0.12 : 0) + (attackT > 0 ? Math.sin((attackT / 0.3) * Math.PI) * 0.35 : 0);
    torso.rotation.z = moving ? Math.sin(walkPhase) * 0.06 : 0;
    belly.scale.set(1 + squash * 0.3, 1.05 - squash * 0.2, 0.6);

    // arms swing, or punch forward during an attack
    for (const [i, a] of arms.entries()) {
      const s = i ? 1 : -1;
      a.rotation.x = attackT > 0 ? -1.6 * Math.sin((attackT / 0.3) * Math.PI) : moving ? Math.sin(walkPhase + i * Math.PI) * 0.6 : Math.sin(t * 2 + i) * 0.1;
      a.rotation.z = (roarT > 0 ? 1.3 : 0.5) * -s;
    }

    // eyes look at the target or around
    const look = state.lookAt;
    for (const p of pupils) {
      let lx = Math.sin(t * 0.7) * 0.04, ly = 0;
      if (look) { root.worldToLocal(tmp.copy(look)); lx = THREE.MathUtils.clamp(tmp.x * 0.02, -0.07, 0.07); ly = THREE.MathUtils.clamp((tmp.y - 2) * 0.01, -0.05, 0.05); }
      p.position.x = lx; p.position.y = ly;
    }
    dizzy.rotation.y += dt * 5;
    applyFace();

    // tail follows the body with springs (in world space, then kept on the ground plane)
    root.updateMatrixWorld();
    let prev = tmp2.set(0, 0.85, -0.85).applyMatrix4(root.matrixWorld);
    const sc = root.scale.x;
    for (const [i, seg] of tail.entries()) {
      const d = seg.userData, gap = (0.45 - i * 0.04) * sc;
      if (d.pos.lengthSq() === 0) d.pos.copy(prev);
      tmp.copy(d.pos).sub(prev); const len = tmp.length() || 1;
      d.vel.addScaledVector(tmp, -(len - gap) / len * 120 * dt); d.vel.multiplyScalar(Math.exp(-6 * dt));
      d.vel.y += Math.sin(t * 5 + i) * 0.4 * dt * sc;
      d.pos.addScaledVector(d.vel, dt);
      tmp.copy(d.pos).sub(prev).setLength(gap); d.pos.copy(prev).add(tmp);
      d.pos.y = Math.max(d.pos.y, (0.25 + d.r * 0.5) * sc);
      seg.position.copy(d.pos); root.worldToLocal(seg.position);
      prev = seg.userData.pos;
    }
  }

  return {
    root, update, setStage, face: setFace,
    /** A stomp or punch: squash down then spring back. */
    stomp(strength = 1) { squashV -= 6 * strength; attackT = 0.3; },
    roar() { roarT = 1.0; setFace('roar', 1.0); squashV += 5; },
    resetTail() { for (const s of tail) s.userData.pos.set(0, 0, 0), s.userData.vel.set(0, 0, 0); },
  };
}
