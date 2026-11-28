// PROTOTYPE - NOT FOR PRODUCTION
// Effects: one pooled point-sprite system for every particle (clippings, petals, dust, sparkles, straw, confetti),
// pooled ground rings, and the cinematic director that borrows the camera for short beats. Nothing here allocates
// per frame. Only sparkles are brighter than 1.0, so only they reach the bloom pass. THREE is read at build time.

const VS = `attribute vec3 aCol; attribute vec4 aP; varying vec3 vCol; varying vec4 vP; uniform float uScale;
void main(){ vCol = aCol; vP = aP; vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mv; gl_PointSize = aP.x * uScale / max(0.1, -mv.z); }`;
// aP = (size m, alpha, rotation, shape): shape 0 soft disc, 1 leaf/petal, 2 four-point sparkle, 3 square confetti
const FS = `varying vec3 vCol; varying vec4 vP;
void main(){ vec2 p = gl_PointCoord - 0.5; float c = cos(vP.z), s = sin(vP.z); p = vec2(p.x * c - p.y * s, p.x * s + p.y * c); float a;
  if (vP.w < 0.5) a = smoothstep(0.5, 0.2, length(p));
  else if (vP.w < 1.5) a = smoothstep(0.5, 0.42, length(p * vec2(1.0, 2.1)));
  else if (vP.w < 2.5) { vec2 q = abs(p); a = smoothstep(0.03, 0.0, q.x * q.y) * smoothstep(0.5, 0.15, length(p)); }
  else a = step(max(abs(p.x), abs(p.y) * 1.7), 0.42);
  a *= vP.y; if (a < 0.02) discard;
  float shade = vP.w > 0.5 && vP.w < 1.5 ? 0.82 + 0.36 * (p.x + 0.5) : 1.0;
  gl_FragColor = vec4(vCol * shade, a); }`;

/** Particle kinds: colour list, size, life, gravity, drag, spread speed, upward speed, shape, spin. */
const KINDS = {
  clip: { col: ['#5fae43', '#86c85a', '#3f8f3a', '#a5d86a'], size: [0.07, 0.13], life: [0.45, 0.9], g: 7, drag: 1.6, sp: 1.6, up: [1.4, 3.2], shape: 1, spin: 9 },
  mist: { col: ['#9fd57a', '#b9e296'], size: [0.25, 0.45], life: [0.3, 0.55], g: -0.4, drag: 3, sp: 0.5, up: [0.2, 0.6], shape: 0, spin: 0, alpha: 0.35 },
  dust: { col: ['#d9c9a4', '#c9b98f', '#e6d9b8'], size: [0.25, 0.5], life: [0.5, 0.9], g: -0.6, drag: 2.6, sp: 1.3, up: [0.3, 1], shape: 0, spin: 0, alpha: 0.5 },
  puff: { col: ['#e9e4d8', '#d8d3c8'], size: [0.1, 0.18], life: [0.45, 0.8], g: -1.2, drag: 2, sp: 0.25, up: [0.6, 1], shape: 0, spin: 0, alpha: 0.38 },
  cloud: { col: ['#efe9dc', '#e3dccd', '#f5efe2'], size: [0.7, 1.2], life: [0.6, 1.0], g: -0.3, drag: 3, sp: 1.4, up: [0.2, 1.2], shape: 0, spin: 0, alpha: 0.9 },
  petal: { col: ['#f3a0b8', '#f47c5d', '#f6b93b', '#c79ae8', '#f1e6cf'], size: [0.1, 0.16], life: [0.9, 1.6], g: 1.6, drag: 2.2, sp: 1.4, up: [1.2, 2.6], shape: 1, spin: 6 },
  leaf: { col: ['#5fae43', '#86c85a', '#c9b245'], size: [0.12, 0.2], life: [0.8, 1.4], g: 3, drag: 1.8, sp: 2.2, up: [1.5, 3.4], shape: 1, spin: 7 },
  straw: { col: ['#d9b85a', '#e8cf7a', '#bfa04a'], size: [0.06, 0.12], life: [0.5, 1.0], g: 8, drag: 1.2, sp: 2.4, up: [1.5, 3.5], shape: 1, spin: 12 },
  spark: { col: [[1.7, 1.45, 0.75], [1.6, 1.25, 0.6], [1.5, 1.5, 1.0]], size: [0.16, 0.3], life: [0.4, 0.8], g: -0.8, drag: 2.4, sp: 1.6, up: [0.6, 2], shape: 2, spin: 2 },
  gold: { col: [[1.5, 1.2, 0.45], [1.3, 1.0, 0.35]], size: [0.1, 0.2], life: [0.9, 1.7], g: -1.5, drag: 1.5, sp: 0.5, up: [0.5, 1.6], shape: 2, spin: 2 },
  confetti: { col: ['#f47c5d', '#f6b93b', '#49c7b8', '#c79ae8', '#86c85a', '#f3a0b8'], size: [0.1, 0.17], life: [1.2, 2.2], g: 3.2, drag: 1.6, sp: 3.2, up: [3.5, 6.5], shape: 3, spin: 10 },
  drop: { col: ['#9fd8ee', '#c4e8f5'], size: [0.06, 0.1], life: [0.5, 0.8], g: 9, drag: 0.4, sp: 0.8, up: [2, 3.6], shape: 0, spin: 0, alpha: 0.8 },
  fly: { col: [[1.5, 1.6, 0.6], [1.3, 1.5, 0.7]], size: [0.1, 0.16], life: [2.5, 4.5], g: -0.5, drag: 1.2, sp: 0.6, up: [0.3, 0.9], shape: 0, spin: 0 },
  ink: { col: ['#e9795b', '#c95a40'], size: [0.07, 0.14], life: [0.3, 0.5], g: 5, drag: 2, sp: 2.5, up: [1, 2], shape: 0, spin: 0 },
};

/** Builds the effect pools. Returns { burst, ring, update, setTier, alive, dispose }. */
export function createFx(world, cfg) {
  const THREE = window.THREE, MAX = Math.max(...cfg.quality.particles), geo = new THREE.BufferGeometry();
  const pos = new Float32Array(MAX * 3), col = new Float32Array(MAX * 3), par = new Float32Array(MAX * 4);
  const vel = new Float32Array(MAX * 3), life = new Float32Array(MAX), life0 = new Float32Array(MAX), phys = new Float32Array(MAX * 4); // g, drag, spin, alpha
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('aCol', new THREE.BufferAttribute(col, 3)); geo.setAttribute('aP', new THREE.BufferAttribute(par, 4));
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e6);
  const mat = new THREE.ShaderMaterial({ vertexShader: VS, fragmentShader: FS, uniforms: { uScale: { value: 600 } }, transparent: true, depthWrite: false });
  const points = new THREE.Points(geo, mat); points.frustumCulled = false; points.renderOrder = 5; world.scene.add(points);
  let cap = cfg.quality.particles[world.tier], next = 0, alive = 0;
  const tmp = new THREE.Color(), kc = {};
  for (const k in KINDS) kc[k] = KINDS[k].col.map((c) => (Array.isArray(c) ? c : (tmp.set(c), [tmp.r, tmp.g, tmp.b])));
  const rnd = Math.random; // effects only: never gameplay

  /**
   * Emits n particles of a kind at (x, y, z). opts: { dx, dz (a push direction, m/s), spread (m), col (hex or rgb
   * array to override), scale }.
   */
  function burst(kind, x, y, z, n = 1, o = {}) {
    const K = KINDS[kind]; if (!K) return; const cs = kc[kind], sc = o.scale || 1;
    n = Math.max(1, Math.round(n * (0.5 + 0.25 * world.tier)));
    for (let i = 0; i < n; i++) {
      let j = -1; for (let t = 0; t < 8; t++) { const k = (next + t) % cap; if (life[k] <= 0) { j = k; next = k + 1; break; } }
      if (j < 0) { j = next % cap; next = j + 1; }
      const a = rnd() * 6.283, sp = K.sp * (0.3 + rnd() * 0.7) * sc, sr = (o.spread || 0) * Math.sqrt(rnd());
      pos[j * 3] = x + Math.cos(a) * sr; pos[j * 3 + 1] = y; pos[j * 3 + 2] = z + Math.sin(a) * sr;
      vel[j * 3] = Math.cos(a) * sp + (o.dx || 0); vel[j * 3 + 1] = (K.up[0] + rnd() * (K.up[1] - K.up[0])) * (o.up ?? 1); vel[j * 3 + 2] = Math.sin(a) * sp + (o.dz || 0);
      const c = o.col ? (Array.isArray(o.col) ? o.col : (tmp.set(o.col), [tmp.r, tmp.g, tmp.b])) : cs[Math.floor(rnd() * cs.length)];
      col[j * 3] = c[0]; col[j * 3 + 1] = c[1]; col[j * 3 + 2] = c[2];
      life0[j] = life[j] = (K.life[0] + rnd() * (K.life[1] - K.life[0])) * (o.life || 1);
      par[j * 4] = (K.size[0] + rnd() * (K.size[1] - K.size[0])) * sc; par[j * 4 + 1] = 0; par[j * 4 + 2] = rnd() * 6.283; par[j * 4 + 3] = K.shape;
      phys[j * 4] = K.g; phys[j * 4 + 1] = K.drag; phys[j * 4 + 2] = K.spin * (rnd() - 0.5) * 2; phys[j * 4 + 3] = K.alpha || 1;
    }
  }

  // ground rings: flat, soft, pooled
  const ringGeo = new THREE.RingGeometry(0.9, 1, 48); ringGeo.rotateX(-Math.PI / 2);
  const rings = [];
  for (let i = 0; i < 8; i++) { const m = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: 0xfff1d6, transparent: true, opacity: 0, depthWrite: false })); m.visible = false; m.renderOrder = 4; world.scene.add(m); rings.push({ m, t: 0, life: 0, r0: 0, r1: 1, a: 0.5 }); }
  /** A ring that grows on the ground from r0 to r1 metres and fades. */
  function ring(x, z, color = '#fff1d6', r0 = 0.3, r1 = 2, lifeS = 0.5, alpha = 0.55, y = 0.12) {
    const r = rings.find((q) => q.life <= 0) || rings[0]; r.t = 0; r.life = lifeS; r.r0 = r0; r.r1 = r1; r.a = alpha; r.m.position.set(x, y, z); r.m.material.color.set(color); r.m.visible = true;
  }

  function update(dt) {
    alive = 0;
    for (let j = 0; j < cap; j++) {
      if (life[j] <= 0) continue;
      life[j] -= dt; if (life[j] <= 0) { par[j * 4 + 1] = 0; continue; }
      alive++;
      const d = Math.max(0, 1 - phys[j * 4 + 1] * dt);
      vel[j * 3] *= d; vel[j * 3 + 2] *= d; vel[j * 3 + 1] = vel[j * 3 + 1] * d - phys[j * 4] * dt;
      pos[j * 3] += vel[j * 3] * dt; pos[j * 3 + 1] += vel[j * 3 + 1] * dt; pos[j * 3 + 2] += vel[j * 3 + 2] * dt;
      if (pos[j * 3 + 1] < 0.03) { pos[j * 3 + 1] = 0.03; vel[j * 3 + 1] = 0; vel[j * 3] *= 0.6; vel[j * 3 + 2] *= 0.6; }
      const t = life[j] / life0[j]; par[j * 4 + 1] = Math.min(1, t * 3, (1 - t) * 10 + 0.2) * phys[j * 4 + 3]; par[j * 4 + 2] += phys[j * 4 + 2] * dt;
    }
    geo.attributes.position.needsUpdate = true; geo.attributes.aP.needsUpdate = true; geo.attributes.aCol.needsUpdate = true;
    mat.uniforms.uScale.value = world.renderer.domElement.height / (2 * Math.tan(world.camera.fov * Math.PI / 360));
    for (const r of rings) { if (r.life <= 0) continue; r.t += dt; const k = r.t / r.life; if (k >= 1) { r.life = 0; r.m.visible = false; continue; } const e = 1 - Math.pow(1 - k, 3); r.m.scale.setScalar(r.r0 + (r.r1 - r.r0) * e); r.m.material.opacity = r.a * (1 - k); }
  }
  return {
    burst, ring, update, alive: () => alive,
    setTier(k) { cap = cfg.quality.particles[k]; geo.setDrawRange(0, cap); },
    dispose() { world.scene.remove(points); geo.dispose(); mat.dispose(); ringGeo.dispose(); for (const r of rings) { world.scene.remove(r.m); r.m.material.dispose(); } },
  };
}

/**
 * The cinematic director: one beat at a time from a priority queue, with a cooldown per priority. A beat frames a
 * world point for a moment (push-in, glide, rise or orbit), may slow time briefly, and hands the camera back.
 * Input is never blocked; `cancel()` returns the camera at once.
 */
export function createDirector(cfg, hooks) {
  const queue = [], lastAt = {}; let cur = null, clock = 0;
  const ease = (t) => t * t * (3 - 2 * t);
  return {
    /** beat = { id, pri, len, at: () => ({ x, z }), dist, pitch, yaw, lift, slow: [scale, seconds], bars, onStart, onEnd, once } */
    play(beat) {
      if (hooks.calm()) { beat.onStart && beat.onStart(); beat.onEnd && beat.onEnd(); hooks.sting && hooks.sting(beat); return false; }
      if (lastAt[beat.pri] !== undefined && clock - lastAt[beat.pri] < cfg.cine.cooldownS && !beat.force) { beat.onStart && beat.onStart(); beat.onEnd && beat.onEnd(); return false; }
      if (cur && cur.pri >= beat.pri) { if (queue.length < 2) queue.push(beat); else { beat.onStart && beat.onStart(); beat.onEnd && beat.onEnd(); } return false; }
      if (cur) { cur.onEnd && cur.onEnd(); }
      cur = Object.assign({ t: 0, started: false }, beat); lastAt[beat.pri] = clock; return true;
    },
    cancel() { if (cur) { cur.t = Math.max(cur.t, cur.len - 0.25); } queue.length = 0; },
    active: () => !!cur, id: () => (cur ? cur.id : null),
    /** Advances the beat. Returns { w, x, z, dist, pitch, yaw, lift, bars, scale } to blend onto the follow camera, or null. */
    update(dt) {
      clock += dt;
      if (!cur && queue.length) { const b = queue.shift(); cur = Object.assign({ t: 0, started: false }, b); lastAt[b.pri] = clock; }
      if (!cur) return null;
      if (!cur.started) { cur.started = true; cur.onStart && cur.onStart(); hooks.sting && hooks.sting(cur); }
      cur.t += dt; const b = cur, inS = Math.min(0.3, b.len * 0.3), outS = Math.min(0.35, b.len * 0.3);
      const w = b.t < inS ? ease(b.t / inS) : b.t > b.len - outS ? ease(Math.max(0, (b.len - b.t) / outS)) : 1;
      const p = b.at(), scale = b.slow && b.t < b.slow[1] ? b.slow[0] : 1;
      const out = { w, x: p.x, z: p.z, dist: b.dist, pitch: b.pitch, yaw: (b.yaw || 0) * (b.orbit ? b.t / b.len : 1), lift: b.lift || 0, bars: b.bars ? w : 0, scale };
      if (b.t >= b.len) { cur = null; b.onEnd && b.onEnd(); }
      return out;
    },
  };
}
