// PROTOTYPE - NOT FOR PRODUCTION
// What the button moves look like: expanding shock rings, flying bubbles and sneeze puffs, and a rainbow beam.
// Everything is pooled and made once, so a move costs no new GPU objects while playing.
/* global THREE */ // Three.js r187, set on window by index.html before run()
import { toon } from './toon.js';

/** Builds the move effects into `scene`. Returns { ring, ball, beam, update(dt), dispose }. */
export function createMoveFx(scene) {
  const group = new THREE.Group(); scene.add(group);
  const own = [];
  const keep = (x) => { own.push(x); return x; };

  // shock rings on the ground: grow from 0 to r while fading
  const ringGeo = keep(new THREE.RingGeometry(0.82, 1, 48)); ringGeo.rotateX(-Math.PI / 2);
  const rings = Array.from({ length: 6 }, () => {
    const m = new THREE.Mesh(ringGeo, keep(new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false })));
    m.visible = false; m.renderOrder = 3; group.add(m); return { m, t: 0, dur: 1, r: 1, inward: false };
  });
  let ringNext = 0;
  /** A ring of colour at (x, z) that grows to radius r over dur seconds (or shrinks from r to 0 when inward). */
  function ring(x, z, color, r, dur = 0.5, inward = false, y = 0.3) {
    const it = rings[ringNext]; ringNext = (ringNext + 1) % rings.length;
    it.m.position.set(x, y, z); it.m.material.color.setHex(color); it.t = 0; it.dur = dur; it.r = r; it.inward = inward; it.m.visible = true;
  }

  // flying balls: see-through bubbles and solid sneeze puffs
  const BALLS = 40, ballGeo = keep(new THREE.SphereGeometry(1, 16, 12)), mtx = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), s = new THREE.Vector3();
  const makePool = (mat) => { const m = new THREE.InstancedMesh(ballGeo, keep(mat), BALLS); m.frustumCulled = false; m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    for (let i = 0; i < BALLS; i++) m.setMatrixAt(i, mtx.makeScale(0, 0, 0)); group.add(m); return { m, items: Array.from({ length: BALLS }, () => ({ life: 0 })), next: 0 }; };
  const pools = {
    bubble: makePool(new THREE.MeshBasicMaterial({ color: 0xbfeaff, transparent: true, opacity: 0.55, depthWrite: false })),
    puff: makePool(toon({ color: 0xffffff })),
  };
  /** Launches a ball of kind 'bubble' or 'puff' from (x, y, z) with velocity (vx, vy, vz). */
  function ball(kind, x, y, z, vx, vy, vz, size, life = 0.8) {
    const p = pools[kind], it = p.items[p.next]; p.next = (p.next + 1) % BALLS;
    Object.assign(it, { x, y, z, vx, vy, vz, size, life, max: life, kind });
  }

  // the rainbow beam: a stretched cylinder with moving stripes, from the eyes to a point ahead
  const beamMat = keep(new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, uniforms: { uT: { value: 0 }, uA: { value: 0 } },
    vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform float uT; uniform float uA; varying vec2 vUv;
      vec3 hue(float h) { return clamp(abs(mod(h * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0); }
      void main() { vec3 c = hue(fract(vUv.y * 3.0 - uT * 2.0)) * 0.85 + 0.25; float edge = 1.0 - abs(vUv.x - 0.5) * 0.6; gl_FragColor = vec4(c * edge, uA);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  }));
  const beamGeo = keep(new THREE.CylinderGeometry(1, 1, 1, 16, 1, true)); beamGeo.translate(0, 0.5, 0); beamGeo.rotateX(Math.PI / 2); // along +z, from 0 to 1
  const beamMesh = new THREE.Mesh(beamGeo, beamMat); beamMesh.visible = false; beamMesh.renderOrder = 3; group.add(beamMesh);
  let beamT = 0, beamDur = 1;
  /** A rainbow beam from `from` toward `to` (Vector3s), radius r, shown for dur seconds. */
  function beam(from, to, r, dur) {
    beamMesh.position.copy(from); beamMesh.lookAt(to); beamMesh.scale.set(r, r, from.distanceTo(to)); beamT = dur; beamDur = dur; beamMesh.visible = true;
  }

  function update(dt) {
    for (const it of rings) {
      if (!it.m.visible) continue;
      it.t += dt; const k = it.t / it.dur;
      if (k >= 1) { it.m.visible = false; continue; }
      const e = 1 - Math.pow(1 - k, 3); it.m.scale.setScalar(Math.max(0.01, it.r * (it.inward ? 1 - e : e))); it.m.material.opacity = 0.85 * (it.inward ? Math.min(1, k * 3) * (1 - k * 0.5) : 1 - k);
    }
    for (const kind in pools) {
      const p = pools[kind]; let any = false;
      p.items.forEach((it, i) => {
        if (it.life <= 0) return; any = true;
        it.life -= dt; it.x += it.vx * dt; it.y += it.vy * dt; it.z += it.vz * dt;
        if (kind === 'bubble') { it.vy += Math.sin(it.life * 9 + i) * 0.6 * dt; } else { it.vx *= 1 - dt * 2.5; it.vz *= 1 - dt * 2.5; it.vy -= 2 * dt; }
        const k = it.life / it.max, sc = it.life > 0 ? it.size * (kind === 'puff' ? 0.6 + (1 - k) * 0.8 : 1) * Math.min(1, k * 4) : 0;
        p.m.setMatrixAt(i, mtx.compose(v.set(it.x, it.y, it.z), q, s.setScalar(sc)));
      });
      if (any) p.m.instanceMatrix.needsUpdate = true;
    }
    if (beamT > 0) {
      beamT -= dt; beamMat.uniforms.uT.value += dt; beamMat.uniforms.uA.value = Math.min(1, beamT / beamDur * 3) * 0.9;
      if (beamT <= 0) beamMesh.visible = false;
    }
  }

  return {
    ring, ball, beam, update,
    dispose() { scene.remove(group); for (const x of own) x.dispose(); for (const kind in pools) pools[kind].m.dispose(); },
  };
}
