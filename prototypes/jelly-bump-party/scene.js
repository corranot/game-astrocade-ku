// PROTOTYPE - NOT FOR PRODUCTION
// The 3D look of Jelly Bump Party (Three.js, global THREE): a round cake floating on a bright sea, seen from above,
// four glossy jelly blobs with big eyes, their spinning aim arrows, hats, power-up candies, and the effects
// (bump stars, splashes, confetti, crumbs). Logic positions come from logic.js; this file only draws them.
/* global THREE */

export const COLORS = [0xf4473b, 0x18a5f0, 0x57c232, 0xffbe2b]; // red, blue, green, yellow (seat order)
const DARK = [0xa8261c, 0x0b6aa3, 0x2f7f16, 0xc98600];
const THEMES = { // floor top, rim dollops, cake side, sea
  cake: { top: '#ff9ecb', ring: '#ffc4df', dot: '#ffffff', rim: 0xffffff, side: 0x8a4b2f },
  ice: { top: '#d9f4ff', ring: '#f2fbff', dot: '#9fdcff', rim: 0xffffff, side: 0x7fb8e6 },
  spin: { top: '#b9f3d9', ring: '#ffd3ea', dot: '#ffffff', rim: 0xff7fb6, side: 0x6b3a26 },
  tiny: { top: '#cdbdff', ring: '#e6ddff', dot: '#ffffff', rim: 0xfff2a8, side: 0x7a4a9a },
};
const VIEW_W = 12.4; // world units across the 720-unit frame at floor height
const CAM_Y = 35;
const TILT = 12 * Math.PI / 180;

function canvasTex(size, draw) {
  const c = document.createElement('canvas'); c.width = c.height = size; draw(c.getContext('2d'), size);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}

/** Builds the scene on canvas; cfg is the game config. */
export function createScene(canvas, cfg) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.NeutralToneMapping; renderer.toneMappingExposure = 1.05;
  let dpr = Math.min(window.devicePixelRatio || 1, 1.5);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(2 * Math.atan(VIEW_W * 16 / 9 / 2 / CAM_Y) * 180 / Math.PI, 9 / 16, 1, 80);
  // tilted 12 degrees towards the bottom players: the cake's thickness and the blobs' faces show, still fair for all four
  camera.position.set(0, CAM_Y * Math.cos(TILT), CAM_Y * Math.sin(TILT)); camera.lookAt(0, 0, 0);
  scene.add(new THREE.HemisphereLight(0xffffff, 0xffe2c4, 1.6));
  const sun = new THREE.DirectionalLight(0xffffff, 2.2); sun.position.set(-6, 20, -8); scene.add(sun);
  const disposables = [];
  const keep = (o) => { disposables.push(o); return o; };

  // ---- the sea: bright water with drifting ripples, a foam ring around the cake
  const seaTex = keep(canvasTex(256, (g, s) => {
    g.fillStyle = '#35c8f5'; g.fillRect(0, 0, s, s);
    g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 5; g.lineCap = 'round';
    for (let i = 0; i < 9; i++) { const x = (i * 71) % s, y = (i * 113) % s; g.beginPath(); g.arc(x, y, 18, Math.PI * 1.1, Math.PI * 1.9); g.stroke(); g.beginPath(); g.arc(x + 36, y, 18, Math.PI * 1.1, Math.PI * 1.9); g.stroke(); }
  }));
  seaTex.wrapS = seaTex.wrapT = THREE.RepeatWrapping; seaTex.repeat.set(7, 7);
  const sea = new THREE.Mesh(keep(new THREE.PlaneGeometry(60, 60)), keep(new THREE.MeshBasicMaterial({ map: seaTex })));
  sea.rotation.x = -Math.PI / 2; sea.position.y = -1.6; scene.add(sea);
  // ---- the floor shape: a rounded rectangle (half width w, half height h, corner c) that fills the frame
  const A = cfg.arena;
  function roundRect(w, h, c) {
    const sh = new THREE.Shape(), x = w - c, y = h - c;
    sh.moveTo(-x, -h); sh.lineTo(x, -h); sh.absarc(x, -y, c, -Math.PI / 2, 0); sh.lineTo(w, y); sh.absarc(x, y, c, 0, Math.PI / 2);
    sh.lineTo(-x, h); sh.absarc(-x, y, c, Math.PI / 2, Math.PI); sh.lineTo(-w, -y); sh.absarc(-x, -y, c, Math.PI, Math.PI * 1.5);
    return sh;
  }
  /** Point at share t (0..1) of the way round the floor's edge, unscaled. */
  function perimeter(t) {
    const w = A.w, h = A.h, c = A.c, sx = 2 * (w - c), sz = 2 * (h - c), arc = Math.PI / 2 * c, L = 2 * sx + 2 * sz + 4 * arc;
    let d = ((t % 1) + 1) % 1 * L;
    const segs = [[sx, (k) => [-(w - c) + k, -h]], [arc, (k) => { const a = -Math.PI / 2 + k / c; return [(w - c) + Math.cos(a) * c, -(h - c) + Math.sin(a) * c]; }],
      [sz, (k) => [w, -(h - c) + k]], [arc, (k) => { const a = k / c; return [(w - c) + Math.cos(a) * c, (h - c) + Math.sin(a) * c]; }],
      [sx, (k) => [(w - c) - k, h]], [arc, (k) => { const a = Math.PI / 2 + k / c; return [-(w - c) + Math.cos(a) * c, (h - c) + Math.sin(a) * c]; }],
      [sz, (k) => [-w, (h - c) - k]], [arc, (k) => { const a = Math.PI + k / c; return [-(w - c) + Math.cos(a) * c, -(h - c) + Math.sin(a) * c]; }]];
    for (const [len, at] of segs) { if (d <= len) return at(d); d -= len; }
    return [-(w - c), -h];
  }
  const flat = (geo) => { geo.rotateX(-Math.PI / 2); return geo; }; // shape x,y → floor x,-z (the shape is symmetric), facing up
  const foam = new THREE.Mesh(keep(flat(new THREE.ShapeGeometry(roundRect(A.w + 0.32, A.h + 0.32, A.c + 0.32), 24))), keep(new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8, side: THREE.DoubleSide })));
  foam.position.y = -1.58; scene.add(foam);

  // ---- the cake: the shape extruded down to the sea, a painted top, cream dollops all round the edge
  const cake = new THREE.Group(); scene.add(cake);
  const sideMat = keep(new THREE.MeshPhongMaterial({ color: THEMES.cake.side, shininess: 20 }));
  const sideGeo = keep(new THREE.ExtrudeGeometry(roundRect(A.w, A.h, A.c), { depth: 1.6, bevelEnabled: false, curveSegments: 24 }));
  sideGeo.rotateX(-Math.PI / 2); sideGeo.translate(0, -1.61, 0);
  const side = new THREE.Mesh(sideGeo, sideMat); cake.add(side);
  const tops = {};
  for (const [k, th] of Object.entries(THEMES)) {
    // a tile repeated across the top: soft diamonds and sprinkles, so movement reads on any part of the floor
    const t = keep(canvasTex(256, (g, s) => {
      g.fillStyle = th.top; g.fillRect(0, 0, s, s);
      g.fillStyle = th.ring;
      if (k === 'spin') { for (let i = 0; i < 4; i++) g.fillRect(i * s / 4, 0, s / 8, s); }
      else { g.beginPath(); g.moveTo(s / 2, s * 0.08); g.lineTo(s * 0.92, s / 2); g.lineTo(s / 2, s * 0.92); g.lineTo(s * 0.08, s / 2); g.closePath(); g.fill(); }
      g.fillStyle = th.dot;
      for (let i = 0; i < 14; i++) { const x = (i * 97 + 31) % s, y = (i * 61 + 17) % s, a = i * 1.7; g.beginPath(); g.ellipse(x, y, s * 0.014, s * 0.04, a, 0, Math.PI * 2); g.fill(); }
    }));
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1 / 3.2, 1 / 3.2); t.center.set(0, 0); tops[k] = t;
  }
  const topMat = keep(new THREE.MeshPhongMaterial({ map: tops.cake, shininess: 30 }));
  const top = new THREE.Mesh(keep(flat(new THREE.ShapeGeometry(roundRect(A.w, A.h, A.c), 24))), topMat); cake.add(top);
  const RIM_N = 64;
  const rimMat = keep(new THREE.MeshPhongMaterial({ color: 0xffffff, shininess: 60 }));
  const rim = new THREE.InstancedMesh(keep(new THREE.SphereGeometry(1, 12, 8)), rimMat, RIM_N); cake.add(rim);
  let rimS = -1;
  function placeRim(S) {
    if (Math.abs(S - rimS) < 1e-3) return; rimS = S;
    const m = new THREE.Matrix4(), k = 0.3 / S; // the cake group is scaled by S, so dollops keep their size
    for (let i = 0; i < RIM_N; i++) { const [x, z] = perimeter(i / RIM_N); m.makeScale(k, 0.24, k); m.setPosition(x, 0.03, z); rim.setMatrixAt(i, m); }
    rim.instanceMatrix.needsUpdate = true;
  }

  // ---- shared bits
  const shadowTex = keep(canvasTex(64, (g, s) => { const gr = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2); gr.addColorStop(0, 'rgba(60,20,40,0.42)'); gr.addColorStop(1, 'rgba(60,20,40,0)'); g.fillStyle = gr; g.fillRect(0, 0, s, s); }));
  const shadowGeo = keep(new THREE.PlaneGeometry(1, 1)), shadowMat = keep(new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false }));
  const sphere = keep(new THREE.SphereGeometry(1, 32, 20)), small = keep(new THREE.SphereGeometry(1, 14, 10));
  const white = keep(new THREE.MeshPhongMaterial({ color: 0xffffff, shininess: 80 })), black = keep(new THREE.MeshPhongMaterial({ color: 0x1b1020, shininess: 120 }));
  const blush = keep(new THREE.MeshBasicMaterial({ color: 0xff8fb0, transparent: true, opacity: 0.7 }));
  const arrowTex = keep(canvasTex(128, (g, s) => {
    g.lineJoin = 'round'; g.fillStyle = '#ffffff'; g.strokeStyle = 'rgba(40,20,40,0.55)'; g.lineWidth = 10;
    g.beginPath(); g.moveTo(s * 0.14, s * 0.36); g.lineTo(s * 0.56, s * 0.36); g.lineTo(s * 0.56, s * 0.16); g.lineTo(s * 0.94, s * 0.5); g.lineTo(s * 0.56, s * 0.84); g.lineTo(s * 0.56, s * 0.64); g.lineTo(s * 0.14, s * 0.64); g.closePath(); g.stroke(); g.fill();
  }));
  const arrowGeo = keep(new THREE.PlaneGeometry(1, 1)); arrowGeo.translate(0.5, 0, 0); arrowGeo.rotateX(-Math.PI / 2);
  const ringGeo = keep(new THREE.RingGeometry(0.82, 1, 40)); ringGeo.rotateX(-Math.PI / 2);

  // ---- hats, made from primitives, sized for a blob of radius 1
  const gold = keep(new THREE.MeshPhongMaterial({ color: 0xffc928, shininess: 100, specular: 0xfff1b0 }));
  const hatMats = {
    stripe: keep(new THREE.MeshPhongMaterial({ map: keep(canvasTex(64, (g, s) => { for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? '#ffe14a' : '#ff5fa8'; g.fillRect(0, i * s / 8, s, s / 8); } })), shininess: 40 })),
    black: keep(new THREE.MeshPhongMaterial({ color: 0x2a2233, shininess: 60 })), red: keep(new THREE.MeshPhongMaterial({ color: 0xff4d6d, shininess: 60 })),
    grey: keep(new THREE.MeshPhongMaterial({ color: 0xc9d2de, shininess: 90 })), cream: keep(new THREE.MeshPhongMaterial({ color: 0xfff1d6, shininess: 30 })),
    pink: keep(new THREE.MeshPhongMaterial({ color: 0xffb3cc, shininess: 30 })),
  };
  const G = {
    cone: keep(new THREE.ConeGeometry(0.42, 0.95, 20)), cyl: keep(new THREE.CylinderGeometry(0.42, 0.42, 0.6, 20)), brim: keep(new THREE.CylinderGeometry(0.72, 0.72, 0.07, 24)),
    crown: keep(new THREE.CylinderGeometry(0.46, 0.4, 0.34, 20, 1, true)), spike: keep(new THREE.ConeGeometry(0.1, 0.26, 8)), blade: keep(new THREE.BoxGeometry(1.1, 0.04, 0.2)),
    horn: keep(new THREE.ConeGeometry(0.13, 0.55, 10)), halo: keep(new THREE.TorusGeometry(0.5, 0.08, 10, 30)), ear: keep(new THREE.CapsuleGeometry(0.13, 0.55, 4, 10)),
    dome: keep(new THREE.SphereGeometry(0.55, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2)),
  };
  function makeHat(id) {
    const h = new THREE.Group(), add = (geo, mat, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.scale.set(sx, sy, sz); h.add(m); return m; };
    if (id === 'party') { add(G.cone, hatMats.stripe, 0, 0.45); add(small, white, 0, 0.95, 0, 0.13, 0.13, 0.13); }
    else if (id === 'crown') { add(G.crown, gold, 0, 0.17); for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; add(G.spike, gold, Math.cos(a) * 0.42, 0.42, Math.sin(a) * 0.42); add(small, hatMats.red, Math.cos(a) * 0.45, 0.15, Math.sin(a) * 0.45, 0.06, 0.06, 0.06); } }
    else if (id === 'top') { add(G.brim, hatMats.black, 0, 0.03); add(G.cyl, hatMats.black, 0, 0.35, 0, 0.85, 1, 0.85); add(G.cyl, hatMats.red, 0, 0.14, 0, 0.87, 0.18, 0.87); }
    else if (id === 'chef') { add(G.cyl, white, 0, 0.25, 0, 0.9, 0.8, 0.9); add(small, white, 0, 0.62, 0, 0.5, 0.36, 0.5); add(small, white, 0.25, 0.58, 0, 0.3, 0.28, 0.3); add(small, white, -0.25, 0.58, 0, 0.3, 0.28, 0.3); }
    else if (id === 'propeller') { add(G.dome, hatMats.red, 0, 0, 0, 0.9, 0.7, 0.9); add(G.cyl, gold, 0, 0.42, 0, 0.1, 0.4, 0.1); const p = new THREE.Group(); p.position.y = 0.55; p.name = 'spin'; const b = new THREE.Mesh(G.blade, hatMats.stripe); p.add(b); const b2 = b.clone(); b2.rotation.y = Math.PI / 2; p.add(b2); h.add(p); }
    else if (id === 'bunny') { for (const s of [-1, 1]) { const e = add(G.ear, white, s * 0.22, 0.4); e.rotation.z = -s * 0.25; const i = add(G.ear, hatMats.pink, s * 0.22, 0.4, 0.06, 0.55, 0.85, 0.5); i.rotation.z = -s * 0.25; } }
    else if (id === 'viking') { add(G.dome, hatMats.grey, 0, 0, 0, 0.95, 0.75, 0.95); for (const s of [-1, 1]) { const ho = add(G.horn, hatMats.cream, s * 0.55, 0.3); ho.rotation.z = -s * 0.9; } }
    else if (id === 'halo') { const t = add(G.halo, gold, 0, 0.55); t.rotation.x = Math.PI / 2; t.name = 'float'; }
    return h;
  }

  // ---- blobs
  const blobs = COLORS.map((col, i) => {
    const g = new THREE.Group(); scene.add(g);
    const body = new THREE.Group(); g.add(body); // squash and stretch along the travel heading
    const bodyMat = keep(new THREE.MeshPhongMaterial({ color: col, shininess: 110, specular: 0x777777, emissive: col, emissiveIntensity: 0.06 }));
    const mesh = new THREE.Mesh(sphere, bodyMat); body.add(mesh);
    const shine = new THREE.Mesh(small, keep(new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.75 })));
    shine.position.set(-0.35, 0.7, -0.3); shine.scale.set(0.22, 0.1, 0.16); body.add(shine);
    const face = new THREE.Group(); g.add(face); // eyes look along the aim
    for (const s of [-1, 1]) {
      const eye = new THREE.Mesh(small, white); eye.position.set(0.55, 0.62, s * 0.3); eye.scale.setScalar(0.27); face.add(eye);
      const pupil = new THREE.Mesh(small, black); pupil.position.set(0.7, 0.68, s * 0.3); pupil.scale.setScalar(0.15); face.add(pupil);
      const glint = new THREE.Mesh(small, white); glint.position.set(0.76, 0.8, s * 0.26); glint.scale.setScalar(0.05); face.add(glint);
      const ch = new THREE.Mesh(small, blush); ch.position.set(0.62, 0.38, s * 0.62); ch.scale.set(0.06, 0.1, 0.14); face.add(ch);
    }
    const hatHolder = new THREE.Group(); hatHolder.position.y = 0.82; face.add(hatHolder);
    const shadow = new THREE.Mesh(shadowGeo, shadowMat); shadow.rotation.x = -Math.PI / 2; scene.add(shadow);
    const arrowMat = keep(new THREE.MeshBasicMaterial({ map: arrowTex, color: col, transparent: true, depthWrite: false }));
    const arrow = new THREE.Mesh(arrowGeo, arrowMat); scene.add(arrow);
    const ring = new THREE.Mesh(ringGeo, keep(new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.9, depthWrite: false }))); scene.add(ring);
    return { g, body, mesh, bodyMat, face, hatHolder, hatId: null, shadow, arrow, ring, wob: 0, wv: 0, x: 0, z: 0, seat: i, splashed: false };
  });

  // ---- power-ups: a swirl lollipop (giant) and a gold star (super push)
  const starShape = new THREE.Shape(); for (let i = 0; i < 10; i++) { const r = i % 2 ? 0.2 : 0.46, a = i / 10 * Math.PI * 2 - Math.PI / 2; if (i) starShape.lineTo(Math.cos(a) * r, Math.sin(a) * r); else starShape.moveTo(Math.cos(a) * r, Math.sin(a) * r); }
  const starGeo = keep(new THREE.ExtrudeGeometry(starShape, { depth: 0.16, bevelEnabled: true, bevelSize: 0.05, bevelThickness: 0.05, bevelSegments: 2 }));
  const swirl = keep(canvasTex(128, (g, s) => { for (let i = 0; i < 12; i++) { g.fillStyle = ['#ff5fa8', '#ffffff', '#3fd0ff', '#ffffff'][i % 4]; g.beginPath(); g.moveTo(s / 2, s / 2); g.arc(s / 2, s / 2, s / 2, i / 12 * Math.PI * 2, (i + 1) / 12 * Math.PI * 2 + 0.02); g.fill(); } }));
  const items = {
    star: new THREE.Mesh(starGeo, gold),
    giant: (() => { const l = new THREE.Group(); const d = new THREE.Mesh(keep(new THREE.CylinderGeometry(0.5, 0.5, 0.18, 32)), keep(new THREE.MeshPhongMaterial({ map: swirl, shininess: 90 }))); l.add(d); return l; })(),
  };
  items.star.geometry.center();
  for (const m of Object.values(items)) { m.visible = false; scene.add(m); }
  const itemShadow = new THREE.Mesh(shadowGeo, shadowMat); itemShadow.rotation.x = -Math.PI / 2; itemShadow.visible = false; scene.add(itemShadow);

  // ---- effects: one pool of small spheres, splash rings
  const PN = 260;
  const parts = new THREE.InstancedMesh(small, keep(new THREE.MeshBasicMaterial({ color: 0xffffff })), PN);
  parts.instanceMatrix.setUsage(THREE.DynamicDrawUsage); parts.frustumCulled = false; scene.add(parts);
  const P = Array.from({ length: PN }, () => ({ life: 0 })); let pNext = 0, pLive = 0;
  const tmpC = new THREE.Color(), tmpM = new THREE.Matrix4(), hidden = new THREE.Matrix4().makeScale(0, 0, 0);
  for (let i = 0; i < PN; i++) { parts.setMatrixAt(i, hidden); parts.setColorAt(i, tmpC.set(0xffffff)); }
  let fxScale = 1;
  function emit(x, y, z, n, colors, spd = 4, up = 4, size = 0.12, life = 0.8, grav = 12) {
    n = Math.max(1, Math.round(n * fxScale));
    for (let k = 0; k < n; k++) {
      const p = P[pNext]; pNext = (pNext + 1) % PN; const a = Math.random() * Math.PI * 2, v = spd * (0.4 + Math.random() * 0.6);
      Object.assign(p, { x, y, z, vx: Math.cos(a) * v, vz: Math.sin(a) * v, vy: up * (0.5 + Math.random()), life, max: life, size: size * (0.6 + Math.random() * 0.8), grav });
      parts.setColorAt((pNext + PN - 1) % PN, tmpC.set(colors[k % colors.length]));
    }
    parts.instanceColor.needsUpdate = true; pLive = PN;
  }
  const splashes = Array.from({ length: 6 }, () => { const m = new THREE.Mesh(keep(new THREE.RingGeometry(0.7, 1, 32)), keep(new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, depthWrite: false }))); m.rotation.x = -Math.PI / 2; m.visible = false; scene.add(m); return { m, t: 9 }; });
  let sNext = 0;
  function splash(x, z) { const s = splashes[sNext]; sNext = (sNext + 1) % splashes.length; s.t = 0; s.m.position.set(x, -1.55, z); s.m.visible = true; emit(x, -1.5, z, 22, [0xffffff, 0xbff0ff, 0x7fe0ff], 3, 7, 0.16, 0.9); }

  let shakeT = 0, theme = 'cake', time = 0;
  const focus = { x: 0, z: 0, k: 0, on: 0 };
  const reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const camBase = camera.position.clone();

  function setTheme(mod) {
    theme = THEMES[mod] ? mod : 'cake'; const th = THEMES[theme];
    topMat.map = tops[theme]; topMat.needsUpdate = true; sideMat.color.set(th.side); rimMat.color.set(th.rim);
  }
  function setHat(seat, id) {
    const b = blobs[seat]; if (b.hatId === id) return;
    b.hatHolder.clear(); b.hatId = id || null;
    if (id) b.hatHolder.add(makeHat(id));
  }

  /** Draw one frame of match M (logic state). view: {edit} */
  function update(M, dt) {
    time += dt;
    seaTex.offset.set(time * 0.02, time * 0.012);
    const S = M ? M.s : 1;
    cake.scale.set(S, 1, S); placeRim(S); topMat.map.rotation = M && M.mod === 'spin' ? M.spinA : 0;
    const fs = S * (1 + Math.sin(time * 2) * 0.006); foam.scale.set(fs, 1, fs);
    if (M) for (const b of blobs) drawBlob(b, M.blobs[b.seat], M, dt);
    // power-up
    for (const [k, m] of Object.entries(items)) m.visible = false;
    itemShadow.visible = false;
    const it = M && M.items[0];
    if (it) { const m = items[it.kind]; m.visible = true; const pop = Math.min(1, it.t * 4); m.position.set(it.x, 0.55 + Math.sin(time * 4) * 0.12, it.z); m.rotation.set(it.kind === 'star' ? -Math.PI / 2 : 0, 0, 0); if (it.kind === 'star') m.rotation.z = time * 2; else m.rotation.y = time * 2; m.scale.setScalar(pop * (1 + Math.sin(time * 8) * 0.05)); itemShadow.visible = true; itemShadow.position.set(it.x, 0.02, it.z); itemShadow.scale.setScalar(1.1); }
    // particles
    if (pLive) {
      let any = 0;
      for (let i = 0; i < PN; i++) {
        const p = P[i]; if (p.life <= 0) continue;
        p.life -= dt; if (p.life <= 0) { parts.setMatrixAt(i, hidden); continue; }
        any++; p.vy -= p.grav * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
        const s = p.size * Math.min(1, p.life / p.max * 2.5);
        tmpM.makeScale(s, s, s); tmpM.setPosition(p.x, p.y, p.z); parts.setMatrixAt(i, tmpM);
      }
      parts.instanceMatrix.needsUpdate = true; if (!any) pLive = 0;
    }
    for (const s of splashes) if (s.m.visible) { s.t += dt; const k = s.t / 0.8; s.m.scale.setScalar(0.6 + k * 2.4); s.m.material.opacity = Math.max(0, 0.9 * (1 - k)); if (k >= 1) s.m.visible = false; }
    // gentle shake for big moments only (no roll)
    shakeT = Math.max(0, shakeT - dt * 1.8);
    const a = reduced ? 0 : shakeT * shakeT * 0.35;
    // focus: a short push-in towards a point (the last knock-out of a round), eased with a critically damped spring
    focus.k += ((focus.on > 0 ? 1 : 0) - focus.k) * Math.min(1, dt * 6); focus.on = Math.max(0, focus.on - dt);
    const fk = reduced ? 0 : focus.k * 0.32;
    camera.position.set(camBase.x * (1 - fk) + focus.x * fk + (Math.random() * 2 - 1) * a, camBase.y * (1 - fk * 0.9), camBase.z * (1 - fk * 0.9) + focus.z * fk + (Math.random() * 2 - 1) * a);
    camera.lookAt(focus.x * fk, 0, focus.z * fk);
    renderer.render(scene, camera);
  }

  function drawBlob(v, b, M, dt) {
    const bc = cfg.blob, r = b.r;
    // squash spring (a hit wobbles it), stretch along speed, swell while charging, sink while falling
    v.wv += (-90 * v.wob - 9 * v.wv) * dt; v.wob += v.wv * dt;
    const spd = Math.hypot(b.vx, b.vz), st = Math.min(0.35, spd / bc.dashMax * 0.4), charge = b.holding ? b.holdT / bc.chargeTime : 0;
    const breathe = Math.sin(time * 3 + v.seat) * 0.03, trem = charge > 0 ? Math.sin(time * 60) * 0.02 * charge : 0;
    const fall = b.out ? b.fall : 0, sink = fall * fall;
    v.g.position.set(b.x, -sink * 3.2 + r * 0.82, b.z);
    v.g.scale.setScalar(r * (1 - sink * 0.35));
    v.body.rotation.y = -Math.atan2(b.vz, b.vx);
    const sq = v.wob;
    v.body.scale.set(1 + st + sq * 0.5 + charge * 0.12 + trem, 0.84 * (1 - st * 0.6 - sq + breathe + charge * 0.1), 1 - st * 0.4 + sq * 0.5 + charge * 0.12 - trem);
    v.face.rotation.y = -b.ang; v.face.position.y = (0.84 * (1 - st * 0.6 - sq + breathe) - 0.84) * 0.9;
    if (b.teeter && !b.out) v.face.rotation.z = Math.sin(time * 18) * 0.12; else v.face.rotation.z = 0;
    const hat = v.hatHolder.children[0];
    if (hat) { const sp = hat.getObjectByName('spin'), fl = hat.getObjectByName('float'); if (sp) sp.rotation.y += dt * (6 + spd * 2); if (fl) fl.position.y = 0.55 + Math.sin(time * 3) * 0.06; }
    v.shadow.visible = !b.out || fall < 0.3; v.shadow.position.set(b.x, 0.015, b.z); v.shadow.scale.setScalar(r * 2.6 * (1 - fall));
    // aim arrow on the floor, longer as the charge grows
    const show = !b.out && M.phase !== 'done';
    v.arrow.visible = show; v.ring.visible = show;
    if (show) {
      const len = r * (1.25 + charge * 1.5);
      v.arrow.position.set(b.x + Math.cos(b.ang) * r * 0.9, 0.02, b.z + Math.sin(b.ang) * r * 0.9);
      v.arrow.rotation.y = -b.ang; v.arrow.scale.set(len, 1, r * (1.05 + charge * 0.3));
      v.arrow.material.opacity = M.phase === 'play' ? 0.95 : 0.55;
      v.ring.position.set(b.x, 0.012, b.z); v.ring.scale.setScalar(r * 1.18);
      v.ring.material.opacity = b.human ? 0.95 : 0.5;
    }
    if (b.out && fall > 0.55 && !v.splashed) { v.splashed = true; splash(b.x, b.z); }
    if (!b.out) v.splashed = false;
    // star power: golden flicker; giant: handled by r
    // star power: the blob keeps its own colour (players know themselves by it), glows and sheds gold sparkles
    v.bodyMat.emissiveIntensity = b.star > 0 ? 0.3 + Math.sin(time * 16) * 0.15 : 0.06;
    if (b.star > 0 && !b.out && Math.random() < dt * 14) emit(b.x + (Math.random() - 0.5) * r * 2, r * 1.4, b.z + (Math.random() - 0.5) * r * 2, 1, [0xffd23c, 0xffffff], 0.6, 2, 0.1, 0.6, 3);
  }

  /** Effects for a logic event. */
  function event(e, M) {
    if (e.type === 'bump') {
      const k = Math.min(1, e.force / 14);
      blobs[e.b].wob += 0.25 + k * 0.35; blobs[e.a].wob += 0.12;
      emit(e.x, 0.8, e.z, 8 + k * 14, [0xffffff, 0xfff27a, COLORS[e.a]], 3 + k * 5, 3, 0.11 + k * 0.06, 0.55);
      if (k > 0.7) shakeT = Math.max(shakeT, 0.6);
    } else if (e.type === 'rim') { blobs[e.seat].wob += 0.3; emit(e.x, 0.3, e.z, 6, [0xffffff, 0xffd3ea], 2.5, 2, 0.1, 0.4); }
    else if (e.type === 'dash') { blobs[e.seat].wob -= 0.25 + e.power * 0.2; const b = M.blobs[e.seat]; emit(b.x, 0.2, b.z, 4 + e.power * 6, [0xffffff, DARK[e.seat]], 1.5, 1.5, 0.09, 0.35); }
    else if (e.type === 'out') { shakeT = Math.max(shakeT, 0.8); emit(e.x, 0.4, e.z, 14, [0xfff1d6, THEMES[theme].rim, 0x8a4b2f], 3, 4, 0.12, 0.7); }
    else if (e.type === 'power') { emit(e.x, 0.6, e.z, 26, [0xffd23c, 0xffffff, 0xff5fa8, 0x3fd0ff], 4, 5, 0.12, 0.8); blobs[e.seat].wob += 0.4; }
    else if (e.type === 'shrink') { /* crumbs fall from the rim while it shrinks */ }
  }
  function confetti(seat) { const b = blobs[seat]; for (let i = 0; i < 3; i++) emit(b.g.position.x, 1.2, b.g.position.z, 30, [0xff5fa8, 0xffd23c, 0x3fd0ff, 0x7ee36a, 0xffffff], 6, 9, 0.13, 1.6, 9); }
  function crumbs(M) { if (!M) return; const [x, z] = perimeter(Math.random()); emit(x * M.s, 0, z * M.s, 2, [0x8a4b2f, THEMES[theme].rim], 1.5, 1, 0.1, 0.8, 10); }

  function resize(w, h) { renderer.setPixelRatio(dpr); renderer.setSize(w, h, false); }
  const proj = new THREE.Vector3();
  /** Frame position (0..720, 0..1280) of a floor point. */
  function screenOf(x, z, y = 0) { proj.set(x, y, z).project(camera); return [(proj.x + 1) / 2 * 720, (1 - proj.y) / 2 * 1280]; }

  return {
    renderer, update, event, confetti, crumbs, setTheme, setHat, screenOf, resize, blobs,
    shake(a) { shakeT = Math.max(shakeT, a); },
    /** Push the camera in towards floor point (x, z) for t seconds. */
    focusOn(x, z, t) { focus.x = Math.max(-3, Math.min(3, x)); focus.z = Math.max(-3, Math.min(3, z)); focus.on = t; },
    setQuality(q) { dpr = Math.min(window.devicePixelRatio || 1, 1.5) * q; fxScale = q < 1 ? 0.5 : 1; const c = renderer.domElement; renderer.setPixelRatio(dpr); renderer.setSize(c.clientWidth || 720, c.clientHeight || 1280, false); },
    dispose() { for (const d of disposables) d.dispose && d.dispose(); rim.dispose(); parts.dispose(); renderer.dispose(); renderer.forceContextLoss(); },
  };
}
