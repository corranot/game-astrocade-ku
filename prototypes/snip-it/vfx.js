// PROTOTYPE - NOT FOR PRODUCTION
// Snip It effects: one pooled InstancedMesh of small balls for every burst (confetti, splash, hearts, flour...),
// plus a few floor rings. Nothing is allocated while playing.
/* global THREE */

const MAX = 260;
// n: how many, c: colours, v: speed, up: extra upward speed, g: gravity (negative falls), s: size, life: seconds,
// grow: size change per second, flat: squashed like paper, rain: starts above and falls
const KINDS = {
  spark: { n: 12, c: [0xffffff, 0xfff06a, 0xffc61a], v: 4.5, up: 1, g: -8, s: 0.07, life: 0.35 },
  trail: { n: 1, c: [0xffffff, 0x9ff3ff, 0xfff06a], v: 0.4, up: 0, g: 0, s: 0.09, life: 0.28, grow: -0.25 },
  hearts: { n: 16, c: [0xff5f8f, 0xff8fb1, 0xffc2d4], v: 2.6, up: 3, g: -3, s: 0.14, life: 1.1 },
  stars: { n: 18, c: [0xfff06a, 0xffc61a, 0xffffff], v: 5, up: 2, g: -9, s: 0.12, life: 0.8 },
  splash: { n: 30, c: [0x39b6ff, 0x8fd8ff, 0xffffff], v: 5, up: 4, g: -17, s: 0.13, life: 0.75 },
  confetti: { n: 44, c: [0xff4d5e, 0x2f9bff, 0xffc61a, 0x57d86b, 0xc27cff], v: 6, up: 5, g: -9, s: 0.11, life: 1.4, flat: true },
  flour: { n: 24, c: [0xffffff, 0xfff6e0], v: 2.6, up: 1, g: -0.6, s: 0.2, life: 1.1, grow: 0.25 },
  bubbles: { n: 26, c: [0xcdf1ff, 0xffffff, 0x9fe2ff], v: 2, up: 1.5, g: 2.2, s: 0.16, life: 1.5 },
  ducks: { n: 12, c: [0xffd21f, 0xffe26a], v: 4, up: 4, g: -15, s: 0.2, life: 1.3 },
  birds: { n: 10, c: [0x3b6fd8, 0x5a8cf0, 0x2a4fa8], v: 5.5, up: 2.5, g: 1.5, s: 0.13, life: 1.3, flat: true },
  rain: { n: 34, c: [0x39b6ff, 0x8fd8ff], v: 0.6, up: -9, g: -6, s: 0.08, life: 0.55, rain: true },
  mote: { n: 1, c: [0xffffff, 0xfff6c9], v: 0.25, up: 0.15, g: 0.05, s: 0.045, life: 4 },
};

/** Effects living in `scene`. scale() halves the counts on slow phones. */
export function createFx(scene) {
  const geo = new THREE.SphereGeometry(1, 8, 6), mat = new THREE.MeshBasicMaterial();
  const mesh = new THREE.InstancedMesh(geo, mat, MAX); mesh.frustumCulled = false; mesh.count = 0; scene.add(mesh);
  mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(MAX * 3), 3);
  const P = Array.from({ length: MAX }, () => ({ on: false, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, g: 0, s: 0, grow: 0, t: 0, life: 1, flat: false, spin: 0 }));
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), pos = new THREE.Vector3(), scl = new THREE.Vector3(), col = new THREE.Color();
  let next = 0, amount = 1, seed = 7;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }; // looks only, never rules

  const ringGeo = new THREE.RingGeometry(0.8, 1, 32), rings = Array.from({ length: 3 }, () => { const m = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false })); m.rotation.x = -Math.PI / 2; m.visible = false; scene.add(m); return { m, t: 1 }; });
  let ringNext = 0;

  /** A burst of `kind` at (x, y) on the play plane. */
  function emit(kind, x, y, mult = 1) {
    const k = KINDS[kind]; if (!k) return;
    const n = Math.max(1, Math.round(k.n * mult * (k.n > 1 ? amount : 1)));
    for (let i = 0; i < n; i++) {
      const idx = next, p = P[idx]; next = (next + 1) % MAX;
      const a = rnd() * Math.PI * 2, v = k.v * (0.4 + rnd() * 0.6);
      p.on = true; p.t = 0; p.life = k.life * (0.7 + rnd() * 0.5); p.g = k.g; p.s = k.s * (0.7 + rnd() * 0.6); p.grow = k.grow || 0; p.flat = !!k.flat; p.spin = rnd() * 6;
      p.x = x + (k.rain ? (rnd() - 0.5) * 1.6 : 0); p.y = y + (k.rain ? 0.6 + rnd() * 0.8 : 0); p.z = 0.5 + rnd() * 0.5;
      p.vx = Math.cos(a) * v; p.vy = Math.sin(a) * v * 0.7 + k.up; p.vz = (rnd() - 0.5) * v * 0.4;
      col.set(k.c[(rnd() * k.c.length) | 0]); mesh.instanceColor.setXYZ(idx, col.r, col.g, col.b);
    }
    mesh.instanceColor.needsUpdate = true;
  }

  /** A ring spreading on the floor under a landing. */
  function ring(x, y, color = 0xffffff) { const r = rings[ringNext]; ringNext = (ringNext + 1) % rings.length; r.t = 0; r.m.position.set(x, y + 0.03, 0.4); r.m.material.color.set(color); r.m.visible = true; }

  function update(dt) {
    let live = 0;
    for (let i = 0; i < MAX; i++) {
      const p = P[i];
      if (p.on) {
        p.t += dt; if (p.t >= p.life) p.on = false;
        p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
        if (p.y < 0.05 && p.g < 0) { p.y = 0.05; p.vy *= -0.4; p.vx *= 0.7; }
      }
      const k = p.on ? Math.min(1, (p.life - p.t) / (p.life * 0.3)) : 0, s = p.on ? Math.max(0.001, (p.s + p.grow * p.t) * k) : 0;
      if (p.on) live = i + 1;
      pos.set(p.x, p.y, p.z); scl.set(s, p.flat ? s * 0.35 : s, s); e.set(p.spin + p.t * 5, p.spin, p.flat ? p.t * 7 : 0); q.setFromEuler(e);
      m4.compose(pos, q, scl); mesh.setMatrixAt(i, m4);
    }
    mesh.count = live; mesh.instanceMatrix.needsUpdate = true;
    for (const r of rings) { if (!r.m.visible) continue; r.t += dt * 2.2; const s = 0.3 + r.t * 1.8; r.m.scale.set(s, s, s); r.m.material.opacity = Math.max(0, 0.75 * (1 - r.t)); if (r.t >= 1) r.m.visible = false; }
  }

  return {
    emit, ring, update, scale(a) { amount = a; },
    clear() { for (const p of P) p.on = false; for (const r of rings) r.m.visible = false; },
    dispose() { geo.dispose(); mat.dispose(); mesh.dispose(); ringGeo.dispose(); for (const r of rings) r.m.material.dispose(); },
  };
}
