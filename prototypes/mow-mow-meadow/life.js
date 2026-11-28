// PROTOTYPE - NOT FOR PRODUCTION
// Mow Mow Meadow: the small life around the lawn. Butterflies drift near Buzzy and birds cross the sky; nothing here
// touches the rules. THREE is read when the life is built.
import { paint, xf, merge, blob, mesh } from './kit.js';

/**
 * Builds the ambient life. Returns { update(dt, t, x, z), setCount(n), dispose() } where (x, z) is where Buzzy is.
 * `Cast` supplies the butterfly models; `n` butterflies and two birds are pooled and reused.
 */
export function createLife(world, Cast, n = 5) {
  const THREE = window.THREE, group = new THREE.Group(); world.scene.add(group);
  const kinds = ['butterfly', 'bluefly', 'moth', 'butterfly', 'bee', 'bluefly'], flies = [];
  for (let i = 0; i < n; i++) {
    const f = Cast.buildFriend(world, kinds[i % kinds.length]); f.group.scale.setScalar(0.8); group.add(f.group);
    flies.push({ f, a: i * 2.4, r: 3 + i * 1.3, h: 0.9 + (i % 3) * 0.5, sp: 0.35 + (i % 4) * 0.12, cx: 0, cz: 0, on: true });
  }
  const birdGeo = () => merge([paint(xf(blob(0.1, 1, 0.8, 2, 1), [0, 0, 0]), '#5a6a7a', '#8a9aa8'), paint(xf(blob(0.05, 1, 1, 1.2, 1), [0, 0.03, 0.2]), '#5a6a7a')]);
  const wingGeo = () => paint(xf(blob(0.2, 1, 0.08, 0.5, 1), [0.2, 0, 0]), '#6a7a8a', '#a8b6c2');
  const birds = [];
  for (let i = 0; i < 2; i++) {
    const g = new THREE.Group(), l = mesh(wingGeo(), world.M.matte, false), r = mesh(wingGeo(), world.M.matte, false); r.scale.x = -1;
    g.add(mesh(birdGeo(), world.M.matte, false), l, r); g.visible = false; group.add(g); birds.push({ g, l, r, t: 3 + i * 6, x: 0, z: 0, vx: 0, vz: 0, life: 0 });
  }
  // fireflies for the dusk district: a handful of warm points that drift near Buzzy
  const FN = 18, fpos = new Float32Array(FN * 3), fgeo = new THREE.BufferGeometry(); fgeo.setAttribute('position', new THREE.BufferAttribute(fpos, 3));
  const fire = new THREE.Points(fgeo, new THREE.PointsMaterial({ color: new THREE.Color(1.9, 1.7, 0.7), size: 0.16, sizeAttenuation: true, transparent: true, opacity: 0.9, depthWrite: false, toneMapped: false })); fire.frustumCulled = false; fire.visible = false; group.add(fire);
  return {
    /** Fireflies on or off (on in the dusk district). */
    setDusk(on) { fire.visible = on; },
    update(dt, t, x, z) {
      if (fire.visible) { for (let i = 0; i < FN; i++) { const a = i * 2.399, r = 2.5 + (i % 6) * 1.3; fpos[i * 3] = x + Math.cos(a + t * 0.11 * (1 + i % 3)) * r; fpos[i * 3 + 1] = 0.7 + (i % 4) * 0.35 + Math.sin(t * 0.9 + i) * 0.25; fpos[i * 3 + 2] = z - 1 + Math.sin(a * 1.7 + t * 0.09 * (1 + i % 2)) * r; } fgeo.attributes.position.needsUpdate = true; }
      for (const b of flies) {
        if (!b.on) continue;
        b.cx += (x - b.cx) * Math.min(1, dt * 0.25); b.cz += (z - b.cz) * Math.min(1, dt * 0.25); b.a += dt * b.sp;
        const px = b.cx + Math.cos(b.a) * b.r + Math.sin(b.a * 2.7) * 0.8, pz = b.cz - 2 + Math.sin(b.a * 1.3) * b.r * 0.8;
        b.f.group.rotation.y = Math.atan2(px - b.f.group.position.x, pz - b.f.group.position.z);
        b.f.group.position.set(px, b.h + Math.sin(t * 2.2 + b.r) * 0.25, pz); b.f.update(t + b.r);
      }
      for (const b of birds) {
        b.t -= dt;
        if (b.life <= 0 && b.t <= 0) { const side = Math.random() < 0.5 ? -1 : 1; b.x = x - side * 16; b.z = z - 6 - Math.random() * 10; b.vx = side * (4.5 + Math.random() * 2); b.vz = (Math.random() - 0.5) * 1.5; b.life = 8; b.h = 4.5 + Math.random() * 2; b.g.visible = true; b.g.rotation.y = Math.atan2(b.vx, b.vz); }
        if (b.life > 0) {
          b.life -= dt; b.x += b.vx * dt; b.z += b.vz * dt; b.g.position.set(b.x, b.h + Math.sin(t * 1.7 + b.h) * 0.3, b.z);
          const f = Math.sin(t * 9 + b.h) * 0.7; b.l.rotation.z = f; b.r.rotation.z = -f;
          if (b.life <= 0) { b.g.visible = false; b.t = 7 + Math.random() * 9; }
        }
      }
    },
    /** Fewer butterflies on a slow device. */
    setCount(k) { flies.forEach((b, i) => { b.on = i < k; b.f.group.visible = b.on; }); },
    dispose() { world.scene.remove(group); group.traverse((o) => { if (o.geometry) o.geometry.dispose(); }); },
  };
}
