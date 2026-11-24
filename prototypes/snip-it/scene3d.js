// PROTOTYPE - NOT FOR PRODUCTION
// Snip It stage: the Three.js picture of one level. A toy-box diorama seen from the front: a painted back wall,
// a floor block, a beam with hooks, the roped things, the hero and the scenery. The physics runs in the plane z = 0.
/* global THREE */
import { createKit } from './models3d.js';
import { createFx } from './vfx.js';
import { WORLDS } from './levels.js';

const VIEW_W = 6.6, CAM_Z = 14, LOOK_Y = 3.7, MAX_SEG = 72;

/** Builds the stage on `canvas`. */
export function createScene(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.NeutralToneMapping; renderer.toneMappingExposure = 1.05;
  let dpr = Math.min(window.devicePixelRatio || 1, 1.5);
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0xffe9b8);
  const viewH = VIEW_W * 16 / 9;
  const camera = new THREE.PerspectiveCamera(2 * Math.atan(viewH / 2 / CAM_Z) * 180 / Math.PI, 9 / 16, 1, 60);
  camera.position.set(0, LOOK_Y + 0.6, CAM_Z); camera.lookAt(0, LOOK_Y, 0);
  scene.add(new THREE.HemisphereLight(0xffffff, 0xffe2c4, 1.7));
  const sun = new THREE.DirectionalLight(0xfff4e0, 2.1); sun.position.set(-5, 12, 9); scene.add(sun);

  const kit = createKit(WORLDS), fx = createFx(scene);
  const stage = new THREE.Group(); scene.add(stage);
  const wallTex = {}, owned = []; // textures per theme are kept; per-level geometry and materials are freed on load
  const wallGeo = new THREE.PlaneGeometry(11, 15), boxGeo = new THREE.BoxGeometry(1, 1, 1), hookGeo = new THREE.TorusGeometry(0.12, 0.04, 8, 16), shadowGeo = new THREE.CircleGeometry(1, 24);
  const shadowMat = new THREE.MeshBasicMaterial({ color: 0x3a2040, transparent: true, opacity: 0.22, depthWrite: false });

  // every rope link is one stretched cylinder; cut ropes keep their pieces
  const segGeo = new THREE.CylinderGeometry(0.055, 0.055, 1, 8), segMat = new THREE.MeshStandardMaterial({ roughness: 0.7 });
  const segs = new THREE.InstancedMesh(segGeo, segMat, MAX_SEG); segs.frustumCulled = false; segs.count = 0; scene.add(segs);
  segs.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(MAX_SEG * 3), 3);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), dir = new THREE.Vector3(), pos = new THREE.Vector3(), scl = new THREE.Vector3(), col = new THREE.Color();

  // scissors that flash at a cut
  const snipMat = new THREE.MeshStandardMaterial({ color: 0xe9eef5, roughness: 0.25, metalness: 0.4 }), gripMat = new THREE.MeshStandardMaterial({ color: 0xff4d5e, roughness: 0.5 });
  const scissors = new THREE.Group(), blades = [1, -1].map((s) => { const b = new THREE.Group(); const m = new THREE.Mesh(boxGeo, snipMat); m.scale.set(0.9, 0.12, 0.05); m.position.x = 0.4; b.add(m); const h = new THREE.Mesh(hookGeo, gripMat); h.scale.setScalar(1.5); h.position.set(-0.28, -0.16 * s, 0); b.add(h); scissors.add(b); return b; });
  scissors.visible = false; scissors.position.z = 1.2; scene.add(scissors); let snipT = 1;

  let view = null, shake = 0, time = 0, motion = 1;
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0), hitP = new THREE.Vector3(), proj = new THREE.Vector3();

  function wall(theme) {
    if (wallTex[theme]) return wallTex[theme];
    const c = document.createElement('canvas'); c.width = 512; c.height = 704; (WORLDS.find((w) => w.id === theme) || WORLDS[0]).wall(c.getContext('2d'), 512, 704);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; wallTex[theme] = t; return t;
  }
  const own = (o) => { owned.push(o); return o; };
  const block = (color, x, y, z, sx, sy, sz) => { const m = new THREE.Mesh(boxGeo, own(new THREE.MeshStandardMaterial({ color, roughness: 0.8 }))); m.position.set(x, y, z); m.scale.set(sx, sy, sz); stage.add(m); return m; };

  /** Puts level on the stage. Returns { actors: {itemId: actor}, props: {id: actor}, hero: actor }. */
  function loadLevel(level) {
    stage.clear(); for (const o of owned) o.dispose(); owned.length = 0; kit.clear(); fx.clear();
    const world = WORLDS.find((w) => w.id === level.theme) || WORLDS[0], theme = world.id, fl = world.floor;
    scene.background.set(world.sky);
    const w = new THREE.Mesh(wallGeo, own(new THREE.MeshBasicMaterial({ map: wall(theme) }))); w.position.set(0, 4.6, -2.2); stage.add(w);
    block(fl[0], 0, -0.25, 0, 7.6, 0.5, 4.4); block(fl[1], 0, -1.6, 0.1, 7.6, 2.2, 4.4);
    block(world.beam, 0, 9.0, 0, 7.6, 0.34, 0.5);
    const hookMat = own(new THREE.MeshStandardMaterial({ color: 0x8a94a6, roughness: 0.3, metalness: 0.5 }));
    view = { level, actors: {}, props: {}, hero: null, shadows: [], list: [] };
    level.items.forEach((it, k) => {
      const h = new THREE.Mesh(hookGeo, hookMat); h.position.set(it.rope.ax, it.rope.ay + 0.1, 0); stage.add(h);
      const a = kit.make(it.body.model, { r: it.body.r, hang: true, seed: k, color: it.body.color }); a.group.position.set(it.body.x, it.body.y, 0); stage.add(a.group);
      const sh = new THREE.Mesh(shadowGeo, shadowMat); sh.rotation.x = -Math.PI / 2; stage.add(sh);
      view.actors[it.id] = a; view.shadows.push(sh); view.list.push(a);
    });
    for (const p of level.props || []) { const a = kit.make(p.model, { ...p, s: p.s || 1, seed: 5 }); a.group.position.set(p.x, p.y, p.z || 0); a.group.visible = !p.hidden; stage.add(a.group); view.list.push(a); if (p.id) view.props[p.id] = a; }
    if (typeof level.hero === 'string') view.hero = view.actors[level.hero];
    else { const h = level.hero, a = kit.make(h.model, { ...h, s: h.s || 1, seed: 9 }); a.group.position.set(h.x, h.y, h.z || 0); stage.add(a.group); view.hero = a; view.list.push(a); }
    return view;
  }

  /** Draws the world W. dt moves the looks (0 while frozen). */
  function update(W, dt) {
    time += dt;
    if (view && W) {
      W.bodies.forEach((b, k) => {
        const a = view.actors[b.id], p = W.pts[b.p], sh = view.shadows[k];
        if (b.gone) { sh.visible = false; return; }
        a.group.position.set(p.x, p.y, 0);
        a.group.rotation.z = a.spin ? b.ang : Math.max(-0.5, Math.min(0.5, -(p.x - p.px) * 4));
        if (b.done && !a.flags.landed) a.set('landed');
        let floor = 0; for (const bx of W.boxes) if (p.x > bx.x0 && p.x < bx.x1 && bx.y1 <= p.y) floor = Math.max(floor, bx.y1);
        const hgt = Math.max(0, p.y - b.r - floor), s = b.r * Math.max(0.35, 1 - hgt * 0.1);
        sh.visible = true; sh.position.set(p.x, floor + 0.02, 0.15); sh.scale.set(s, s, s);
      });
      let n = 0;
      for (const rope of W.ropes) {
        const item = view.level.items.find((x) => x.id === rope.id); col.set(item.rope.color);
        for (const li of rope.links) {
          const l = W.links[li]; if (l.cut || n >= MAX_SEG) continue;
          const a = W.pts[l.a], b = W.pts[l.b]; if (b.y < -10 || a.y < -10) continue;
          dir.set(b.x - a.x, b.y - a.y, 0); const len = dir.length() || 1e-4; dir.divideScalar(len);
          q.setFromUnitVectors(up, dir); pos.set((a.x + b.x) / 2, (a.y + b.y) / 2, 0); scl.set(1, len, 1);
          m4.compose(pos, q, scl); segs.setMatrixAt(n, m4); segs.instanceColor.setXYZ(n, col.r, col.g, col.b); n++;
        }
      }
      segs.count = n; segs.instanceMatrix.needsUpdate = true; segs.instanceColor.needsUpdate = true;
      for (const a of view.list) a.update(dt);
    }
    if (snipT < 1) { snipT += dt * 3.2; const o = Math.sin(Math.min(1, snipT * 2) * Math.PI) * 0.6 + 0.05; blades[0].rotation.z = o; blades[1].rotation.z = -o; scissors.scale.setScalar(1.1 * (1 - Math.max(0, snipT - 0.7) / 0.3)); if (snipT >= 1) scissors.visible = false; }
    fx.update(dt);
    shake = Math.max(0, shake - dt * 3);
    const sk = shake * shake * 0.25 * motion; camera.position.set(Math.sin(time * 71) * sk, LOOK_Y + 0.6 + Math.sin(time * 53) * sk, CAM_Z);
    renderer.render(scene, camera);
  }

  function resize(wd, ht) { renderer.setPixelRatio(dpr); renderer.setSize(wd, ht, false); }

  return {
    renderer, kit, fx, loadLevel, update, resize,
    /** Play-plane point under a client position, as [x, y]. */
    worldAt(cx, cy) { const r = canvas.getBoundingClientRect(); ndc.set((cx - r.left) / r.width * 2 - 1, 1 - (cy - r.top) / r.height * 2); ray.setFromCamera(ndc, camera); ray.ray.intersectPlane(plane, hitP); return [hitP.x, hitP.y]; },
    /** Frame position (0..720, 0..1280) of a play-plane point. */
    screenOf(x, y) { proj.set(x, y, 0).project(camera); return [(proj.x + 1) / 2 * 720, (1 - proj.y) / 2 * 1280]; },
    /** Scissors snip at (x, y), turned along the swipe. */
    snip(x, y, ang = 0) { scissors.position.set(x, y, 1.2); scissors.rotation.z = ang; scissors.visible = true; snipT = 0; },
    shake(a) { shake = Math.max(shake, a); },
    setMotion(m) { motion = m; },
    setQuality(qv) { dpr = Math.min(window.devicePixelRatio || 1, 1.5) * qv; fx.scale(qv < 1 ? 0.5 : 1); renderer.setPixelRatio(dpr); renderer.setSize(canvas.clientWidth || 720, canvas.clientHeight || 1280, false); },
    dispose() {
      stage.clear(); for (const o of owned) o.dispose(); for (const k in wallTex) wallTex[k].dispose();
      for (const g of [wallGeo, boxGeo, hookGeo, shadowGeo, segGeo]) g.dispose(); for (const m of [shadowMat, segMat, snipMat, gripMat]) m.dispose();
      segs.dispose(); kit.dispose(); fx.dispose(); renderer.dispose(); renderer.forceContextLoss();
    },
  };
}
