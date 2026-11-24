// PROTOTYPE - NOT FOR PRODUCTION
// Snip It stage: the Three.js picture of one level. A toy-box diorama seen from the front: a painted back wall,
// a floor block, a beam with hooks, the roped things, the hero and the scenery. The physics runs in the plane z = 0.
/* global THREE */
import { createKit } from './models3d.js';
import { createFx } from './vfx.js';

const VIEW_W = 6.6, CAM_Z = 14, LOOK_Y = 3.7, MAX_SEG = 72;

/** Paints the back wall of a theme on a canvas: (g, w, h). */
const WALLS = {
  room(g, w, h) {
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#ffe9b8'); gr.addColorStop(1, '#ffd08a'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(255,255,255,.28)'; for (let x = 0; x < w; x += 64) g.fillRect(x, 0, 28, h);
    g.fillStyle = '#fff'; g.fillRect(w * 0.6, h * 0.3, w * 0.28, h * 0.2); g.fillStyle = '#9fe2ff'; g.fillRect(w * 0.62, h * 0.31, w * 0.24, h * 0.18);
    g.fillStyle = '#fff'; g.fillRect(w * 0.735, h * 0.31, w * 0.012, h * 0.18); g.beginPath(); g.arc(w * 0.68, h * 0.37, 22, 0, 7); g.arc(w * 0.71, h * 0.36, 28, 0, 7); g.arc(w * 0.75, h * 0.37, 20, 0, 7); g.fill();
    g.fillStyle = '#ff8fb1'; g.fillRect(w * 0.14, h * 0.34, w * 0.18, h * 0.11); g.fillStyle = '#fff6c9'; g.fillRect(w * 0.155, h * 0.35, w * 0.15, h * 0.09);
    g.fillStyle = '#ffc61a'; g.beginPath(); g.arc(w * 0.23, h * 0.395, 26, 0, 7); g.fill();
    g.fillStyle = '#f2a65a'; g.fillRect(0, h * 0.86, w, h * 0.14);
  },
  bath(g, w, h) {
    g.fillStyle = '#bfeaff'; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(255,255,255,.75)'; g.lineWidth = 5; for (let x = 0; x <= w; x += 64) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); } for (let y = 0; y <= h; y += 64) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
    g.fillStyle = '#8fd0f2'; for (let i = 0; i < 9; i++) g.fillRect(((i * 197) % w) & ~63, ((i * 331) % (h * 0.8)) & ~63, 64, 64);
    g.fillStyle = '#fff'; g.beginPath(); g.ellipse(w * 0.74, h * 0.36, 70, 92, 0, 0, 7); g.fill(); g.fillStyle = '#e3f6ff'; g.beginPath(); g.ellipse(w * 0.74, h * 0.36, 58, 80, 0, 0, 7); g.fill();
    g.fillStyle = '#ffb3cf'; g.fillRect(w * 0.12, h * 0.4, w * 0.16, h * 0.15); g.fillStyle = '#ff8fb1'; g.fillRect(w * 0.12, h * 0.4, w * 0.16, 14);
  },
  garden(g, w, h) {
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#5ec8ff'); gr.addColorStop(0.75, '#c9f1ff'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.fillStyle = '#fff3a8'; g.beginPath(); g.arc(w * 0.8, h * 0.2, 60, 0, 7); g.fill(); g.fillStyle = '#ffe14d'; g.beginPath(); g.arc(w * 0.8, h * 0.2, 44, 0, 7); g.fill();
    g.fillStyle = '#fff'; for (const [x, y, s] of [[0.2, 0.3, 1], [0.55, 0.42, 0.8], [0.3, 0.55, 0.7]]) { g.beginPath(); g.arc(w * x, h * y, 30 * s, 0, 7); g.arc(w * x + 34 * s, h * y - 10 * s, 38 * s, 0, 7); g.arc(w * x + 72 * s, h * y, 28 * s, 0, 7); g.fill(); }
    g.fillStyle = '#8ede6a'; g.beginPath(); g.ellipse(w * 0.25, h * 0.92, w * 0.5, h * 0.14, 0, 0, 7); g.fill(); g.fillStyle = '#6fcf55'; g.beginPath(); g.ellipse(w * 0.8, h * 0.95, w * 0.5, h * 0.15, 0, 0, 7); g.fill();
  },
};
const FLOORS = { room: [0xf2a65a, 0xd98a3d], bath: [0x9fd8ff, 0x6fb7e6], garden: [0x7fd85a, 0x8a5a33] };
const BEAMS = { room: 0xc98a4e, bath: 0xffffff, garden: 0x9b6431 };

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

  const kit = createKit(), fx = createFx(scene);
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
    const c = document.createElement('canvas'); c.width = 512; c.height = 704; (WALLS[theme] || WALLS.room)(c.getContext('2d'), 512, 704);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; wallTex[theme] = t; return t;
  }
  const own = (o) => { owned.push(o); return o; };
  const block = (color, x, y, z, sx, sy, sz) => { const m = new THREE.Mesh(boxGeo, own(new THREE.MeshStandardMaterial({ color, roughness: 0.8 }))); m.position.set(x, y, z); m.scale.set(sx, sy, sz); stage.add(m); return m; };

  /** Puts level on the stage. Returns { actors: {itemId: actor}, props: {id: actor}, hero: actor }. */
  function loadLevel(level) {
    stage.clear(); for (const o of owned) o.dispose(); owned.length = 0; kit.clear(); fx.clear();
    const theme = WALLS[level.theme] ? level.theme : 'room', fl = FLOORS[theme];
    scene.background.set(theme === 'bath' ? 0xbfeaff : theme === 'garden' ? 0x5ec8ff : 0xffe9b8);
    const w = new THREE.Mesh(wallGeo, own(new THREE.MeshBasicMaterial({ map: wall(theme) }))); w.position.set(0, 4.6, -2.2); stage.add(w);
    block(fl[0], 0, -0.25, 0, 7.6, 0.5, 4.4); block(fl[1], 0, -1.6, 0.1, 7.6, 2.2, 4.4);
    block(BEAMS[theme], 0, 9.0, 0, 7.6, 0.34, 0.5);
    const hookMat = own(new THREE.MeshStandardMaterial({ color: 0x8a94a6, roughness: 0.3, metalness: 0.5 }));
    view = { level, actors: {}, props: {}, hero: null, shadows: [], list: [] };
    level.items.forEach((it, k) => {
      const h = new THREE.Mesh(hookGeo, hookMat); h.position.set(it.rope.ax, it.rope.ay + 0.1, 0); stage.add(h);
      const a = kit.make(it.body.model, { r: it.body.r, hang: true, seed: k }); a.group.position.set(it.body.x, it.body.y, 0); stage.add(a.group);
      const sh = new THREE.Mesh(shadowGeo, shadowMat); sh.rotation.x = -Math.PI / 2; stage.add(sh);
      view.actors[it.id] = a; view.shadows.push(sh); view.list.push(a);
    });
    for (const p of level.props || []) { const a = kit.make(p.model, { s: p.s || 1, seed: 5 }); a.group.position.set(p.x, p.y, p.z || 0); stage.add(a.group); view.list.push(a); if (p.id) view.props[p.id] = a; }
    if (typeof level.hero === 'string') view.hero = view.actors[level.hero];
    else { const h = level.hero, a = kit.make(h.model, { s: h.s || 1, wilted: h.wilted, muddy: h.muddy, seed: 9 }); a.group.position.set(h.x, h.y, h.z || 0); stage.add(a.group); view.hero = a; view.list.push(a); }
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
