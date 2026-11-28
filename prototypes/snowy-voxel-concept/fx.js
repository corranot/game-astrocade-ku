// PROTOTYPE - NOT FOR PRODUCTION
// Pooled effects: soft particles (snow puffs, breath, steam, smoke), glowing particles (sparkles, stars, hearts,
// confetti; bright enough to pick up the glow pass), ground rings (shockwaves), ice debris with simple physics,
// footprints in the snow and the glowing paw-print guide trail. Nothing is allocated per frame.
import * as L from './logic.js';

const SHAPES = { dot: 0, star: 1, flake: 2, heart: 3 };
const PVS = `attribute vec4 aCol; attribute float aSize; attribute float aShape; varying vec4 vCol; varying float vShape;
void main(){ vCol = aCol; vShape = aShape; vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mv; gl_PointSize = aSize * 360.0 / -mv.z; }`;
const PFS = `varying vec4 vCol; varying float vShape; uniform float uGain;
void main(){ vec2 p = gl_PointCoord * 2.0 - 1.0; float a;
 if (vShape < 0.5) a = smoothstep(1.0, 0.2, length(p));
 else if (vShape < 1.5) { vec2 q = abs(p); a = smoothstep(0.2, 0.0, min(q.x * 4.0 + q.y * 0.6, q.y * 4.0 + q.x * 0.6) - 0.1) + smoothstep(0.5, 0.0, length(p)) * 0.6; }
 else if (vShape < 2.5) { float an = atan(p.y, p.x); float r = length(p); a = smoothstep(0.12, 0.0, abs(sin(an * 3.0)) * r - 0.02) * step(r, 0.95) + smoothstep(0.35, 0.1, r); }
 else { vec2 q = vec2(p.x, -p.y + 0.15) * 1.35; float h = pow(q.x * q.x + q.y * q.y - 1.0, 3.0) - q.x * q.x * q.y * q.y * q.y; a = smoothstep(0.04, -0.04, h); }
 if (a < 0.02) discard; gl_FragColor = vec4(vCol.rgb * uGain, vCol.a * clamp(a, 0.0, 1.0)); }`;

/** Creates the effect pools on `scene` with `cap` particles per pool. */
export function createFx(scene, cfg, cap = 500) {
  const pools = [];
  const makePool = (additive, gain, n) => {
    const g = new THREE.BufferGeometry();
    const pos = new Float32Array(n * 3), col = new Float32Array(n * 4), size = new Float32Array(n), shape = new Float32Array(n);
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aCol', new THREE.BufferAttribute(col, 4).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aSize', new THREE.BufferAttribute(size, 1).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aShape', new THREE.BufferAttribute(shape, 1).setUsage(THREE.DynamicDrawUsage));
    const m = new THREE.ShaderMaterial({ uniforms: { uGain: { value: gain } }, vertexShader: PVS, fragmentShader: PFS, transparent: true, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending });
    const pts = new THREE.Points(g, m); pts.frustumCulled = false; pts.renderOrder = 5; scene.add(pts);
    const P = { pts, g, m, n, pos, col, size, shape, live: [], free: [], v: new Float32Array(n * 3), life: new Float32Array(n), max: new Float32Array(n), s0: new Float32Array(n), grav: new Float32Array(n), drag: new Float32Array(n), rgba: new Float32Array(n * 4), grow: new Float32Array(n) };
    for (let i = n - 1; i >= 0; i--) { P.free.push(i); size[i] = 0; }
    pools.push(P); return P;
  };
  const soft = makePool(false, 1, cap), glow = makePool(true, 2.2, cap);
  const tc = new THREE.Color();

  /** Emits `count` particles. o = { pool: 'soft'|'glow', x, y, z, spread, speed, up, life, size, color, alpha, shape, grav, drag, grow } */
  function emit(o, count = 1) {
    const P = o.pool === 'glow' ? glow : soft;
    tc.set(o.color || '#ffffff');
    for (let k = 0; k < count; k++) {
      const i = P.free.pop(); if (i === undefined) return;
      const a = Math.random() * 6.283, e = Math.random() * 2 - 1, sp = (o.speed || 1) * (0.5 + Math.random() * 0.5), sr = o.spread || 0.2;
      P.pos[i * 3] = o.x + (Math.random() - 0.5) * sr; P.pos[i * 3 + 1] = o.y + (Math.random() - 0.5) * sr; P.pos[i * 3 + 2] = o.z + (Math.random() - 0.5) * sr;
      const ce = Math.sqrt(1 - e * e);
      P.v[i * 3] = Math.cos(a) * ce * sp + (o.vx || 0); P.v[i * 3 + 1] = Math.abs(e) * sp * 0.6 + (o.up || 0); P.v[i * 3 + 2] = Math.sin(a) * ce * sp + (o.vz || 0);
      P.life[i] = 0; P.max[i] = (o.life || 1) * (0.7 + Math.random() * 0.6); P.s0[i] = (o.size || 0.3) * (0.7 + Math.random() * 0.6);
      P.grav[i] = o.grav == null ? -2 : o.grav; P.drag[i] = o.drag == null ? 1.5 : o.drag; P.grow[i] = o.grow || 0;
      P.rgba.set([tc.r, tc.g, tc.b, o.alpha == null ? 1 : o.alpha], i * 4); P.shape[i] = SHAPES[o.shape || 'dot'] || 0;
      P.live.push(i);
    }
  }

  // ---- rings (shockwaves on the ground)
  const ringGeo = new THREE.RingGeometry(0.82, 1, 40); ringGeo.rotateX(-Math.PI / 2);
  const rings = [];
  for (let i = 0; i < 8; i++) { const m = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })); m.visible = false; m.renderOrder = 4; scene.add(m); rings.push({ m, t: 0, d: 1, r: 1 }); }
  /** A ring that grows to radius r over d seconds. */
  function ring(x, y, z, r = 3, color = '#bff7ff', d = 0.6) { const R = rings.find((q) => !q.m.visible) || rings[0]; R.m.visible = true; R.m.position.set(x, y + 0.08, z); R.m.material.color.set(color).multiplyScalar(1.6); R.t = 0; R.d = d; R.r = r; }

  // ---- debris (ice chunks)
  const debGeo = new THREE.OctahedronGeometry(0.22, 0), debMat = new THREE.MeshStandardMaterial({ color: 0xbfeaff, roughness: 0.2, emissive: 0x2a6a8a, emissiveIntensity: 0.4 });
  const debN = 48, deb = new THREE.InstancedMesh(debGeo, debMat, debN); deb.frustumCulled = false; deb.castShadow = true; scene.add(deb);
  const dS = Array.from({ length: debN }, () => ({ on: false, p: new THREE.Vector3(), v: new THREE.Vector3(), r: new THREE.Euler(), w: new THREE.Vector3(), t: 0, s: 1 }));
  const dm = new THREE.Matrix4(), dq = new THREE.Quaternion(), dv = new THREE.Vector3();
  const hide = new THREE.Matrix4().makeScale(0, 0, 0);
  for (let i = 0; i < debN; i++) deb.setMatrixAt(i, hide);
  /** Bursts `n` ice chunks from (x, y, z). */
  function debris(x, y, z, n = 24, width = 4, size = 1) {
    let k = 0;
    for (const d of dS) { if (d.on || k >= n) continue; k++; d.on = true; d.t = 0; d.s = (0.9 + Math.random() * 0.6) * size; d.p.set(x + ((k - 0.5) / n - 0.5) * width * 2, y + 0.5 + Math.random() * 2, z + (Math.random() - 0.5) * 0.6); d.v.set((d.p.x - x) * 0.5, (2.5 + Math.random() * 2.5) / Math.sqrt(size), (-1.5 - Math.random() * 2.5) / size); d.w.set(Math.random() * 9, Math.random() * 9, Math.random() * 9); }
  }

  // ---- footprints
  const fpGeo = new THREE.CircleGeometry(0.16, 10); fpGeo.rotateX(-Math.PI / 2); fpGeo.scale(1, 1, 1.5);
  const fpN = 120, fp = new THREE.InstancedMesh(fpGeo, new THREE.MeshBasicMaterial({ color: 0x8fa8cc, transparent: true, opacity: 0.38, depthWrite: false }), fpN); fp.frustumCulled = false; scene.add(fp);
  const fpT = new Float32Array(fpN).fill(-1), fpM = Array.from({ length: fpN }, () => new THREE.Matrix4()); let fpI = 0;
  for (let i = 0; i < fpN; i++) fp.setMatrixAt(i, hide);
  /** Leaves a footprint at (x, z) facing `yaw`, side -1/1. */
  function footprint(x, z, yaw, side) {
    const i = fpI++ % fpN; const ox = Math.cos(yaw) * 0.14 * side, oz = -Math.sin(yaw) * 0.14 * side;
    fpM[i].compose(dv.set(x + ox, L.terrainH(cfg, x + ox, z + oz) + 0.03, z + oz), dq.setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw), new THREE.Vector3(1, 1, 1));
    fp.setMatrixAt(i, fpM[i]); fpT[i] = 0; fp.instanceMatrix.needsUpdate = true;
  }

  // ---- guide trail: glowing paw prints from the hero toward the goal
  const paw = (() => { const s = new THREE.Shape(); s.absellipse(0, 0, 0.2, 0.17, 0, Math.PI * 2); const items = [new THREE.ShapeGeometry(s, 12)]; for (const [x, y] of [[-0.19, 0.22], [-0.07, 0.3], [0.07, 0.3], [0.19, 0.22]]) { const t = new THREE.Shape(); t.absellipse(x, y, 0.065, 0.075, 0, Math.PI * 2); items.push(new THREE.ShapeGeometry(t, 8)); } return items; })();
  const pawGeo = (() => { let nv = 0; for (const g of paw) nv += g.attributes.position.count; const pos = new Float32Array(nv * 3), idx = []; let o = 0; for (const g of paw) { const p = g.attributes.position; for (let i = 0; i < p.count; i++) pos.set([p.getX(i), 0, -p.getY(i)], (o + i) * 3); for (let i = 0; i < g.index.count; i++) idx.push(g.index.getX(i) + o); o += p.count; g.dispose(); } const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setIndex(idx); return g; })();
  const trailN = 9, trailMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0x7fffe0).multiplyScalar(1.7), transparent: true, opacity: 0.9, depthWrite: false, fog: false, side: THREE.DoubleSide });
  const trail = new THREE.InstancedMesh(pawGeo, trailMat, trailN); trail.frustumCulled = false; trail.renderOrder = 3; scene.add(trail);
  for (let i = 0; i < trailN; i++) trail.setMatrixAt(i, hide);
  let trailOn = 0;
  /** Lays the trail from (hx, hz) toward (gx, gz); `on` fades it in or out; `gold` for the rare visitor. */
  function setTrail(hx, hz, gx, gz, t, on, gold) {
    trailOn += ((on ? 1 : 0) - trailOn) * 0.12;
    trailMat.color.set(gold ? 0xffd86a : 0x7fffe0).multiplyScalar(1.7); trailMat.opacity = 0.9 * trailOn;
    const dx = gx - hx, dz = gz - hz, d = Math.hypot(dx, dz); const yaw = Math.atan2(dx, dz);
    for (let i = 0; i < trailN; i++) {
      const s = 1.4 + i * 1.15; const show = trailOn > 0.02 && s < d - 1.2;
      if (!show) { trail.setMatrixAt(i, hide); continue; }
      const x = hx + dx / d * s + Math.cos(yaw) * (i % 2 ? 0.18 : -0.18), z = hz + dz / d * s - Math.sin(yaw) * (i % 2 ? 0.18 : -0.18);
      const pulse = 0.75 + 0.45 * Math.max(0, Math.sin(t * 5 - i * 0.7));
      dm.compose(dv.set(x, L.terrainH(cfg, x, z) + 0.06, z), dq.setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw + Math.PI), new THREE.Vector3(pulse, 1, pulse));
      trail.setMatrixAt(i, dm);
    }
    trail.instanceMatrix.needsUpdate = true;
  }

  /** Steps every effect by dt seconds. */
  function update(dt) {
    for (const P of pools) {
      for (let k = P.live.length - 1; k >= 0; k--) {
        const i = P.live[k]; P.life[i] += dt; const u = P.life[i] / P.max[i];
        if (u >= 1) { P.size[i] = 0; P.live[k] = P.live[P.live.length - 1]; P.live.pop(); P.free.push(i); continue; }
        const dr = Math.exp(-P.drag[i] * dt);
        P.v[i * 3] *= dr; P.v[i * 3 + 1] = P.v[i * 3 + 1] * dr + P.grav[i] * dt; P.v[i * 3 + 2] *= dr;
        P.pos[i * 3] += P.v[i * 3] * dt; P.pos[i * 3 + 1] += P.v[i * 3 + 1] * dt; P.pos[i * 3 + 2] += P.v[i * 3 + 2] * dt;
        const fade = u < 0.15 ? u / 0.15 : 1 - (u - 0.15) / 0.85;
        P.col[i * 4] = P.rgba[i * 4]; P.col[i * 4 + 1] = P.rgba[i * 4 + 1]; P.col[i * 4 + 2] = P.rgba[i * 4 + 2]; P.col[i * 4 + 3] = P.rgba[i * 4 + 3] * fade;
        P.size[i] = P.s0[i] * (1 + P.grow[i] * u);
      }
      P.g.attributes.position.needsUpdate = true; P.g.attributes.aCol.needsUpdate = true; P.g.attributes.aSize.needsUpdate = true; P.g.attributes.aShape.needsUpdate = true;
      P.pts.visible = P.live.length > 0;
    }
    for (const R of rings) { if (!R.m.visible) continue; R.t += dt; const u = R.t / R.d; if (u >= 1) { R.m.visible = false; continue; } const s = 0.2 + R.r * (1 - Math.pow(1 - u, 3)); R.m.scale.set(s, 1, s); R.m.material.opacity = (1 - u) * 0.9; }
    let anyDeb = false;
    for (let i = 0; i < debN; i++) {
      const d = dS[i]; if (!d.on) continue; anyDeb = true; d.t += dt;
      d.v.y -= 22 * dt; d.p.addScaledVector(d.v, dt); const gy = L.terrainH(cfg, d.p.x, d.p.z) + 0.1; if (d.p.y < gy) { d.p.y = gy; d.v.y *= -0.2; d.v.x *= 0.3; d.v.z *= 0.3; d.w.multiplyScalar(0.25); }
      d.r.set(d.r.x + d.w.x * dt, d.r.y + d.w.y * dt, d.r.z + d.w.z * dt);
      const s = d.s * Math.min(1, Math.max(0, (1.8 - d.t) / 0.4));
      if (d.t > 1.8) { d.on = false; deb.setMatrixAt(i, hide); continue; }
      dm.compose(d.p, dq.setFromEuler(d.r), dv.set(s, s, s)); deb.setMatrixAt(i, dm);
    }
    if (anyDeb) deb.instanceMatrix.needsUpdate = true;
    let fpDirty = false;
    for (let i = 0; i < fpN; i++) { if (fpT[i] < 0) continue; fpT[i] += dt; if (fpT[i] > 18) { fpT[i] = -1; fp.setMatrixAt(i, hide); fpDirty = true; } else if (fpT[i] > 14) { const s = (18 - fpT[i]) / 4; fpM[i].elements[0] = s; fpM[i].elements[10] = s * 1.0; fp.setMatrixAt(i, fpM[i]); fpDirty = true; } }
    if (fpDirty) fp.instanceMatrix.needsUpdate = true;
  }

  function dispose() { for (const P of pools) { P.g.dispose(); P.m.dispose(); } ringGeo.dispose(); for (const R of rings) R.m.material.dispose(); debGeo.dispose(); debMat.dispose(); fpGeo.dispose(); fp.material.dispose(); pawGeo.dispose(); trailMat.dispose(); }

  return { emit, ring, debris, footprint, setTrail, update, dispose, setCap() { /* pools are fixed; the cap is the pool size */ } };
}
