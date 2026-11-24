// PROTOTYPE - NOT FOR PRODUCTION
// Snip It models: every character and prop is built here from a few shared shapes, no files to load.
// kit.make(name, opts) returns an actor: { group, update(dt), react(kind), tint(hex, on), set(flag) }.
// A model is built inside a ball of radius 1 around its centre and scaled by opts.r, so the physics radius fits.
/* global THREE */

const REACT_TIME = { happy: 1.5, laugh: 1.2, sneeze: 1.1, dizzy: 1.8, wow: 0.9, bounce: 0.5 };

/** Shared shapes and the model builders. Call dispose() when the scene goes. */
export function createKit() {
  const G = {
    ball: new THREE.SphereGeometry(1, 20, 14), box: new THREE.BoxGeometry(1, 1, 1), tube: new THREE.CylinderGeometry(1, 1, 1, 20),
    cone: new THREE.ConeGeometry(1, 1, 16), ring: new THREE.TorusGeometry(1, 0.22, 8, 20), disc: new THREE.CircleGeometry(1, 24),
  };
  const mats = [];
  const mat = (color, rough = 0.6) => { const m = new THREE.MeshStandardMaterial({ color, roughness: rough }); m.userData.base = color; mats.push(m); return m; };
  /** Adds one shape to parent: position, scale, rotation. */
  const add = (parent, geo, m, p, s, r) => {
    const o = new THREE.Mesh(G[geo], m); o.position.set(p[0], p[1], p[2]);
    if (typeof s === 'number') o.scale.setScalar(s); else o.scale.set(s[0], s[1], s[2]);
    if (r) o.rotation.set(r[0], r[1], r[2]);
    parent.add(o); return o;
  };

  /** Wraps a built model: reactions move the inner group, so the owner is free to place the outer one. */
  function actor(inner, o, extra = {}) {
    const group = new THREE.Group(); group.add(inner); inner.scale.setScalar(o.r || o.s || 1);
    const tinted = extra.tinted || [], tmp = new THREE.Color(), to = new THREE.Color();
    const A = { group, inner, mood: null, moodT: 0, time: (o.seed || 0) * 1.7, tintK: 0, tintGoal: 0, flags: {}, spin: extra.spin !== false, base: o.r || o.s || 1 };
    A.react = (kind) => { A.mood = kind; A.moodT = 0; };
    A.tint = (hex, on) => { if (hex !== null && hex !== undefined) to.set(hex); A.tintGoal = on ? 1 : 0; };
    A.set = (flag) => { A.flags[flag] = true; };
    if (o.tint !== undefined) { to.set(o.tint); A.tintK = A.tintGoal = 1; }
    A.update = (dt) => {
      A.time += dt;
      let sy = 1, sx = 1, y = 0, rz = 0, rx = 0;
      if (A.mood) {
        A.moodT += dt; const t = A.moodT, T = REACT_TIME[A.mood] || 1, k = Math.max(0, 1 - t / T);
        if (A.mood === 'happy') { const h = Math.abs(Math.sin(t * 8)) * k; y = h * 0.55; sy = 1 + h * 0.18 - (h < 0.08 ? 0.12 * k : 0); sx = 2 - sy; }
        else if (A.mood === 'laugh') { rz = Math.sin(t * 24) * 0.12 * k; sy = 1 + Math.sin(t * 24) * 0.05 * k; }
        else if (A.mood === 'sneeze') { rx = t < 0.45 ? -0.45 * (t / 0.45) : 0.6 * Math.max(0, 1 - (t - 0.45) / 0.3); }
        else if (A.mood === 'dizzy') { rz = Math.sin(t * 7) * 0.32 * k; }
        else if (A.mood === 'wow') { sy = sx = 1 + Math.sin(Math.min(1, t / 0.25) * Math.PI) * 0.2; }
        else if (A.mood === 'bounce') { sy = 1 - Math.sin(Math.min(1, t / T) * Math.PI) * 0.25; sx = 2 - sy; }
        if (t >= T) A.mood = null;
      }
      inner.position.y = y * A.base; inner.rotation.z = rz; inner.rotation.x = rx; inner.scale.set(A.base * sx, A.base * sy, A.base * sx);
      if (A.tintK !== A.tintGoal) A.tintK += Math.sign(A.tintGoal - A.tintK) * Math.min(Math.abs(A.tintGoal - A.tintK), dt * 3);
      for (const m of tinted) { tmp.set(m.userData.base); m.color.copy(tmp).lerp(to, A.tintK * (m.userData.tintMax || 0.85)); }
      if (extra.update) extra.update(A, dt);
    };
    return A;
  }

  // ---- a round little animal: cat or puppy
  function critter(o) {
    const cat = o.model === 'cat', g = new THREE.Group();
    const fur = mat(cat ? 0xff9a3c : 0xf2c48d), pale = mat(cat ? 0xffe6c7 : 0xfff3df), dark = mat(cat ? 0xd96f1a : 0xa9713f), white = mat(0xffffff, 0.3), black = mat(0x2a1b2e, 0.3), pink = mat(0xff7fa0);
    add(g, 'ball', fur, [0, -0.28, 0], [0.7, 0.66, 0.6]); add(g, 'ball', pale, [0, -0.3, 0.3], [0.46, 0.44, 0.36]);
    const head = new THREE.Group(); head.position.set(0, 0.4, 0.1); g.add(head);
    add(head, 'ball', fur, [0, 0, 0], 0.6); add(head, 'ball', pale, [0, -0.16, 0.38], [0.3, 0.22, 0.26]);
    if (cat) { add(head, 'cone', fur, [-0.34, 0.56, 0], [0.2, 0.36, 0.14], [0, 0, 0.3]); add(head, 'cone', fur, [0.34, 0.56, 0], [0.2, 0.36, 0.14], [0, 0, -0.3]); add(head, 'cone', pink, [-0.34, 0.54, 0.06], [0.11, 0.22, 0.08], [0, 0, 0.3]); add(head, 'cone', pink, [0.34, 0.54, 0.06], [0.11, 0.22, 0.08], [0, 0, -0.3]); }
    else { add(head, 'ball', dark, [-0.58, 0.02, 0], [0.17, 0.36, 0.16], [0, 0, -0.35]); add(head, 'ball', dark, [0.58, 0.02, 0], [0.17, 0.36, 0.16], [0, 0, 0.35]); }
    const eyes = [-0.23, 0.23].map((x) => { const e = new THREE.Group(); e.position.set(x, 0.1, 0.5); head.add(e); add(e, 'ball', white, [0, 0, 0], [0.16, 0.18, 0.1]); add(e, 'ball', black, [0, 0, 0.07], [0.09, 0.11, 0.06]); add(e, 'ball', white, [0.03, 0.05, 0.12], 0.03); return e; });
    add(head, 'ball', cat ? pink : black, [0, -0.08, 0.6], [0.07, 0.05, 0.05]);
    const mouth = add(head, 'ball', black, [0, -0.22, 0.56], [0.09, 0.04, 0.04]);
    const arms = [-1, 1].map((s) => add(g, 'ball', fur, o.hang ? [s * 0.3, 0.86, 0.02] : [s * 0.62, -0.14, 0.2], o.hang ? [0.15, 0.3, 0.15] : 0.17));
    const legs = [-1, 1].map((s) => add(g, 'ball', pale, [s * 0.3, -0.86, 0.22], [0.2, 0.15, 0.26]));
    const tail = new THREE.Group(); tail.position.set(0.5, -0.5, -0.3); g.add(tail);
    if (cat) { add(tail, 'ball', fur, [0.12, 0.1, 0], 0.13); add(tail, 'ball', fur, [0.25, 0.28, 0], 0.12); add(tail, 'ball', dark, [0.3, 0.48, 0], 0.12); } else add(tail, 'ball', dark, [0.1, 0.12, 0], [0.11, 0.22, 0.11], [0, 0, -0.5]);
    return actor(g, o, { tinted: [fur, pale], spin: false, update(A) {
      const t = A.time, blink = (t % 3.1) > 2.96 ? 0.12 : 1, wide = A.mood === 'wow' || A.mood === 'happy' ? 1.25 : A.mood === 'laugh' || A.mood === 'sneeze' ? 0.3 : 1;
      for (const e of eyes) e.scale.set(1, blink * wide, 1);
      mouth.scale.set(A.mood === 'happy' || A.mood === 'laugh' ? 0.16 : 0.09, A.mood === 'wow' || A.mood === 'laugh' || A.mood === 'happy' ? 0.12 : 0.04, 0.04);
      tail.rotation.z = Math.sin(t * (A.mood === 'happy' ? 14 : 4)) * 0.35; head.rotation.z = Math.sin(t * 1.7) * 0.06;
      const sw = o.hang && !A.flags.landed ? Math.sin(t * 5) * 0.25 : 0; legs[0].position.z = 0.22 + sw * 0.4; legs[1].position.z = 0.22 - sw * 0.4;
      if (A.flags.landed && o.hang) { arms[0].position.set(-0.62, -0.14, 0.2); arms[1].position.set(0.62, -0.14, 0.2); arms[0].scale.setScalar(0.17); arms[1].scale.setScalar(0.17); }
    } });
  }

  // ---- a sunflower with a face; wilted until it gets water
  function flower(o) {
    const g = new THREE.Group(), green = mat(0x4fbf4a), leaf = mat(0x3aa63f), petal = mat(0xffd21f), core = mat(0x8a4f22), white = mat(0xffffff, 0.3), black = mat(0x2a1b2e, 0.3);
    add(g, 'tube', green, [0, 1.2, 0], [0.09, 2.4, 0.09]);
    add(g, 'ball', leaf, [-0.4, 0.9, 0.05], [0.42, 0.1, 0.2], [0, 0, 0.5]); add(g, 'ball', leaf, [0.42, 1.4, 0.05], [0.42, 0.1, 0.2], [0, 0, -0.5]);
    add(g, 'tube', mat(0xc8763a), [0, 0.22, 0], [0.5, 0.44, 0.5]); add(g, 'tube', mat(0xe08d4c), [0, 0.46, 0], [0.58, 0.1, 0.58]);
    const head = new THREE.Group(); head.position.set(0, 2.45, 0); g.add(head);
    for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; add(head, 'ball', petal, [Math.cos(a) * 0.62, Math.sin(a) * 0.62, 0], [0.3, 0.16, 0.07], [0, 0, a]); }
    add(head, 'ball', core, [0, 0, 0.05], [0.5, 0.5, 0.16]);
    const eyes = [-0.18, 0.18].map((x) => { const e = add(head, 'ball', white, [x, 0.08, 0.2], [0.11, 0.13, 0.05]); add(e, 'ball', black, [0, 0, 0.6], 0.55); return e; });
    const mouth = add(head, 'ball', black, [0, -0.18, 0.2], [0.1, 0.04, 0.03]);
    let up = o.wilted ? 0 : 1;
    return actor(g, { ...o, tint: o.wilted ? 0x9c9468 : undefined }, { tinted: [petal, green, leaf], spin: false, update(A, dt) {
      if (A.flags.bloom && up < 1) { up = Math.min(1, up + dt * 1.6); A.tint(null, false); }
      const d = 1 - up; head.rotation.x = d * 0.95; head.rotation.z = d * 0.5 + Math.sin(A.time * 1.5) * 0.05; head.position.set(d * 0.25, 2.45 - d * 0.35, d * 0.35);
      const blink = (A.time % 2.7) > 2.58 ? 0.12 : 1; for (const e of eyes) e.scale.set(0.11, 0.13 * blink * (A.mood === 'wow' ? 1.3 : 1), 0.05);
      mouth.scale.set(up > 0.9 || A.mood === 'happy' ? 0.17 : 0.1, A.mood === 'wow' ? 0.12 : up > 0.9 ? 0.09 : 0.04, 0.03);
    } });
  }

  const simple = (o, build) => { const g = new THREE.Group(); build(g); return actor(g, o); };
  const knot = (g, m) => add(g, 'ring', m, [0, 1.0, 0], 0.12, [0, Math.PI / 2, 0]);
  const B = {
    cat: critter, puppy: critter, flower,
    waterBalloon: (o) => simple(o, (g) => { const m = mat(0x39b6ff, 0.2); add(g, 'ball', m, [0, -0.08, 0], [0.86, 0.94, 0.86]); add(g, 'cone', m, [0, 0.88, 0], [0.16, 0.2, 0.16]); add(g, 'ball', mat(0xffffff, 0.2), [-0.3, 0.25, 0.68], [0.18, 0.26, 0.08]); knot(g, mat(0x1b7fd6)); }),
    gift: (o) => simple(o, (g) => { add(g, 'box', mat(0xff5fa8), [0, -0.1, 0], [1.3, 1.2, 1.3]); const r = mat(0xfff06a); add(g, 'box', r, [0, -0.1, 0], [0.26, 1.24, 1.34]); add(g, 'box', r, [0, -0.1, 0], [1.34, 1.24, 0.26]); add(g, 'ring', r, [-0.2, 0.66, 0], 0.2, [0, 0, 0.5]); add(g, 'ring', r, [0.2, 0.66, 0], 0.2, [0, 0, -0.5]); knot(g, r); }),
    sack: (o) => simple(o, (g) => { const m = mat(0xe9d3a4); add(g, 'ball', m, [0, -0.2, 0], [0.84, 0.8, 0.7]); add(g, 'cone', m, [0, 0.72, 0], [0.34, 0.4, 0.3], [Math.PI, 0, 0]); add(g, 'ring', mat(0xb5793d), [0, 0.54, 0], 0.2, [Math.PI / 2, 0, 0]); add(g, 'box', mat(0xffffff), [0, -0.2, 0.68], [0.5, 0.36, 0.04]); knot(g, mat(0xb5793d)); }),
    bucket: (o) => simple(o, (g) => { const m = mat(0x9fd8ff, 0.3); const b = add(g, 'tube', m, [0, -0.15, 0], [0.8, 1.2, 0.8]); b.geometry = G.tube; add(g, 'tube', mat(0x2f9bff, 0.15), [0, 0.42, 0], [0.74, 0.08, 0.74]); add(g, 'ring', mat(0x6b7c93), [0, 0.5, 0], [0.74, 0.74, 0.5], [0, 0, 0]); for (let i = 0; i < 3; i++) add(g, 'ball', mat(0xffffff, 0.1), [-0.4 + i * 0.4, 0.62 + (i % 2) * 0.12, 0.2], 0.2); knot(g, mat(0x6b7c93)); }),
    crate: (o) => simple(o, (g) => { add(g, 'box', mat(0xc98a4e), [0, -0.2, 0], [1.4, 1.1, 1.3]); add(g, 'box', mat(0x9b6431), [0, -0.2, 0.66], [1.44, 0.2, 0.04]); const y = mat(0xffd21f, 0.35); add(g, 'ball', y, [0, 0.5, 0.1], [0.42, 0.34, 0.42]); add(g, 'ball', y, [0, 0.86, 0.26], 0.26); add(g, 'cone', mat(0xff8a1f), [0, 0.82, 0.54], [0.12, 0.2, 0.08], [Math.PI / 2, 0, 0]); add(g, 'ball', mat(0x2a1b2e), [-0.1, 0.94, 0.47], 0.04); add(g, 'ball', mat(0x2a1b2e), [0.1, 0.94, 0.47], 0.04); }),
    ball: (o) => simple(o, (g) => { add(g, 'ball', mat(0xffffff, 0.35), [0, 0, 0], 0.98); const cs = [0xff4d5e, 0x2f9bff, 0xffc61a]; for (let i = 0; i < 3; i++) add(g, 'ball', mat(cs[i], 0.35), [0, 0, 0], [1, 1, 0.34], [0, i * Math.PI / 3, 0]); }),
    can: (o) => simple(o, (g) => { const m = mat(0x39c6b0, 0.4); add(g, 'tube', m, [0, -0.15, 0], [0.66, 1.05, 0.66]); add(g, 'tube', m, [0.9, 0.05, 0], [0.11, 0.95, 0.11], [0, 0, -1.0]); add(g, 'cone', mat(0x2aa392), [1.33, 0.33, 0], [0.24, 0.26, 0.24], [0, 0, 0.55]); add(g, 'ring', mat(0x2aa392), [-0.7, -0.1, 0], [0.4, 0.5, 0.4]); knot(g, mat(0x2aa392)); }),
    // ---- scenery, built at real size (opts.s scales it), origin on the floor
    sofa: (o) => simple(o, (g) => { const m = mat(0xff8fb1, 0.8), d = mat(0xf2678f, 0.8); add(g, 'box', m, [0, 0.5, 0], [2.3, 1.0, 1.5]); add(g, 'box', d, [0, 1.25, -0.6], [2.5, 1.5, 0.4]); add(g, 'tube', d, [-1.2, 0.75, 0], [0.34, 1.5, 0.34], [Math.PI / 2, 0, 0]); add(g, 'tube', d, [1.2, 0.75, 0], [0.34, 1.5, 0.34], [Math.PI / 2, 0, 0]); add(g, 'ball', mat(0xfff06a, 0.8), [-0.6, 1.1, 0.2], [0.42, 0.3, 0.2]); }),
    robot: (o) => simple(o, (g) => { const m = mat(0xb8c4d6, 0.35), d = mat(0x6f7f99, 0.35); add(g, 'box', m, [0, 0.45, 0], [0.8, 0.7, 0.6]); add(g, 'box', m, [0, 1.02, 0], [0.62, 0.46, 0.5]); add(g, 'ball', mat(0x39f0ff, 0.1), [-0.14, 1.05, 0.26], 0.08); add(g, 'ball', mat(0x39f0ff, 0.1), [0.14, 1.05, 0.26], 0.08); add(g, 'tube', d, [0, 1.36, 0], [0.03, 0.22, 0.03]); add(g, 'ball', mat(0xff4d5e), [0, 1.5, 0], 0.07); add(g, 'box', d, [-0.5, 0.5, 0], [0.16, 0.5, 0.2]); add(g, 'box', d, [0.5, 0.5, 0], [0.16, 0.5, 0.2]); add(g, 'box', d, [-0.2, 0.06, 0.05], [0.26, 0.12, 0.4]); add(g, 'box', d, [0.2, 0.06, 0.05], [0.26, 0.12, 0.4]); }),
    drum: (o) => simple(o, (g) => { add(g, 'tube', mat(0xff5f5f), [0, 0.42, 0], [0.56, 0.8, 0.56]); add(g, 'tube', mat(0xfff7e6), [0, 0.84, 0], [0.58, 0.05, 0.58]); add(g, 'ring', mat(0xffc61a), [0, 0.8, 0], [0.56, 0.56, 0.3], [Math.PI / 2, 0, 0]); add(g, 'ring', mat(0xffc61a), [0, 0.06, 0], [0.56, 0.56, 0.3], [Math.PI / 2, 0, 0]); }),
    tub: (o) => simple(o, (g) => { const w = mat(0xffffff, 0.25); add(g, 'ball', w, [0, 0.62, 0], [1.6, 0.62, 0.9]); add(g, 'ball', mat(0xd9ecff, 0.3), [0, 0.86, 0.06], [1.42, 0.3, 0.74]); add(g, 'tube', w, [0, 1.02, 0], [1.56, 0.12, 0.88]); for (const x of [-1, 1]) add(g, 'ball', mat(0xffc61a, 0.3), [x * 1.0, 0.1, 0.4], 0.14); add(g, 'tube', mat(0xb8c4d6, 0.3), [-1.5, 1.5, -0.2], [0.06, 1.1, 0.06]); add(g, 'ball', mat(0xb8c4d6, 0.3), [-1.5, 2.05, -0.2], 0.12); }),
    fence: (o) => simple(o, (g) => { const w = mat(0xffffff, 0.7); for (let i = -4; i <= 4; i++) { if (Math.abs(i) < 1) continue; add(g, 'box', w, [i * 0.7, 0.55, -0.9], [0.4, 1.1, 0.1]); add(g, 'cone', w, [i * 0.7, 1.2, -0.9], [0.24, 0.26, 0.07]); } add(g, 'box', w, [-1.9, 0.7, -0.92], [2.6, 0.14, 0.06]); add(g, 'box', w, [1.9, 0.7, -0.92], [2.6, 0.14, 0.06]); }),
  };

  return {
    /** Builds model `name`; opts: { r or s, hang, wilted, muddy, seed }. */
    make(name, o = {}) { const opts = { ...o, model: name }; if (o.muddy) opts.tint = 0x6b4a2e; return (B[name] || B.gift)(opts); },
    has: (name) => !!B[name],
    /** Frees the materials of every model made so far (call when a level's models leave the stage). */
    clear() { for (const m of mats) m.dispose(); mats.length = 0; },
    dispose() { for (const k in G) G[k].dispose(); for (const m of mats) m.dispose(); mats.length = 0; },
  };
}
