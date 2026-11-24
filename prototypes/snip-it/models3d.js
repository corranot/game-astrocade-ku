// PROTOTYPE - NOT FOR PRODUCTION
// Snip It models: every character and prop is built from a few shared shapes, no files to load.
// kit.make(name, opts) returns an actor: { group, update(dt), react(kind), tint(hex, on), set(flag) }.
// Animals come from one builder and the SPECIES table; things every world hangs on ropes are in COMMON; scenery
// and special things come from the world packs (w_*.js), each a builder (g, K, o) using K.add and K.mat.
// A model is built inside a ball of radius 1 around its centre and scaled by opts.r (roped things) or opts.s.
/* global THREE */

const REACT_TIME = { happy: 1.5, laugh: 1.2, sneeze: 1.1, dizzy: 1.8, wow: 0.9, bounce: 0.5, shiver: 1.4, sleep: 1.6 };

// fur, pale (belly and muzzle), dark (ear and tail tips); ears: point | flop | long | round | big | none;
// face: nose | beak | bill | snout; tail: long | stub | puff | none; eyes: front | top
export const SPECIES = {
  cat: { fur: 0xff9a3c, pale: 0xffe6c7, dark: 0xd96f1a, ears: 'point', face: 'nose', tail: 'long' },
  puppy: { fur: 0xf2c48d, pale: 0xfff3df, dark: 0xa9713f, ears: 'flop', face: 'nose', tail: 'stub' },
  bunny: { fur: 0xf4f1ee, pale: 0xffffff, dark: 0xffb7cd, ears: 'long', face: 'nose', tail: 'puff' },
  panda: { fur: 0xffffff, pale: 0xffffff, dark: 0x2f2a33, ears: 'round', face: 'nose', tail: 'none', mask: true },
  bear: { fur: 0xb9793f, pale: 0xf1d3a6, dark: 0x8a5526, ears: 'round', face: 'nose', tail: 'stub' },
  mouse: { fur: 0xb9bcc6, pale: 0xf3e9ee, dark: 0xff9db5, ears: 'big', face: 'nose', tail: 'long' },
  pig: { fur: 0xffa9bf, pale: 0xffc9d6, dark: 0xf07f9d, ears: 'point', face: 'snout', tail: 'stub' },
  penguin: { fur: 0x33384a, pale: 0xffffff, dark: 0xffa726, ears: 'none', face: 'beak', tail: 'none' },
  duck: { fur: 0xffd93b, pale: 0xfff0a0, dark: 0xff9a1f, ears: 'none', face: 'bill', tail: 'stub' },
  chick: { fur: 0xffe45c, pale: 0xfff3a8, dark: 0xff9a1f, ears: 'none', face: 'beak', tail: 'none' },
  owl: { fur: 0x9a6a43, pale: 0xf3dcb8, dark: 0xffb02e, ears: 'point', face: 'beak', tail: 'none' },
  frog: { fur: 0x5fcf55, pale: 0xd8f7a6, dark: 0x3a9a35, ears: 'none', face: 'none', tail: 'none', eyes: 'top' },
  monkey: { fur: 0x9a623a, pale: 0xf4cfa5, dark: 0x7a4a26, ears: 'big', face: 'nose', tail: 'long' },
  alien: { fur: 0x7be07a, pale: 0xc9ffc2, dark: 0x3fae4a, ears: 'none', face: 'none', tail: 'none', eyes: 'top' },
};

/** Names of the things any world may hang on a rope. */
export const COMMON = ['waterBalloon', 'gift', 'sack', 'bucket', 'crate', 'ball', 'can', 'balloon', 'pillow', 'cake', 'star', 'pot', 'anvil', 'cloud', 'bell',
  'cheese', 'carrot', 'banana', 'fish', 'bone', 'apple', 'honey', 'scarf', 'hat', 'umbrella', 'liftCage', 'ice', 'battery', 'lamp', 'yarn'];

/** Shared shapes and the model builders. `packs` are the world packs, whose models join in by name. */
export function createKit(packs = []) {
  const G = {
    ball: new THREE.SphereGeometry(1, 20, 14), box: new THREE.BoxGeometry(1, 1, 1), tube: new THREE.CylinderGeometry(1, 1, 1, 20),
    cone: new THREE.ConeGeometry(1, 1, 16), ring: new THREE.TorusGeometry(1, 0.22, 8, 20), disc: new THREE.CircleGeometry(1, 24),
  };
  const mats = [];
  const mat = (color, rough = 0.6) => { const m = new THREE.MeshStandardMaterial({ color, roughness: rough }); m.userData.base = color; mats.push(m); return m; };
  /** Adds one shape to parent: geometry name, material, position, scale (number or [x, y, z]), rotation. */
  const add = (parent, geo, m, p, s, r) => {
    const o = new THREE.Mesh(G[geo], m); o.position.set(p[0], p[1], p[2]);
    if (typeof s === 'number') o.scale.setScalar(s); else o.scale.set(s[0], s[1], s[2]);
    if (r) o.rotation.set(r[0], r[1], r[2]);
    parent.add(o); return o;
  };
  /** The little loop a rope ties to, on top of a roped thing. */
  const knot = (g, m) => add(g, 'ring', m, [0, 1.0, 0], 0.12, [0, Math.PI / 2, 0]);
  const group = () => new THREE.Group();
  const K = { add, mat, knot, group };

  /** Wraps a built model: reactions move the inner group, so the owner is free to place the outer one. */
  function actor(inner, o, extra = {}) {
    const outer = new THREE.Group(); outer.add(inner); inner.scale.setScalar(o.r || o.s || 1);
    const tinted = extra.tinted || [], tmp = new THREE.Color(), to = new THREE.Color();
    const A = { group: outer, inner, mood: null, moodT: 0, time: (o.seed || 0) * 1.7, tintK: 0, tintGoal: 0, flags: {}, spin: extra.spin !== false, base: o.r || o.s || 1 };
    A.react = (kind) => { A.mood = kind; A.moodT = 0; };
    A.tint = (hex, on) => { if (hex !== null && hex !== undefined) to.set(hex); A.tintGoal = on ? 1 : 0; };
    A.set = (flag) => { A.flags[flag] = true; };
    if (o.tint !== undefined) { to.set(o.tint); A.tintK = A.tintGoal = 1; }
    A.update = (dt) => {
      A.time += dt;
      let sy = 1, sx = 1, y = 0, rz = 0, rx = 0, x = 0;
      if (A.mood) {
        A.moodT += dt; const t = A.moodT, T = REACT_TIME[A.mood] || 1, k = Math.max(0, 1 - t / T);
        if (A.mood === 'happy') { const h = Math.abs(Math.sin(t * 8)) * k; y = h * 0.55; sy = 1 + h * 0.18 - (h < 0.08 ? 0.12 * k : 0); sx = 2 - sy; }
        else if (A.mood === 'laugh') { rz = Math.sin(t * 24) * 0.12 * k; sy = 1 + Math.sin(t * 24) * 0.05 * k; }
        else if (A.mood === 'sneeze') { rx = t < 0.45 ? -0.45 * (t / 0.45) : 0.6 * Math.max(0, 1 - (t - 0.45) / 0.3); }
        else if (A.mood === 'dizzy') { rz = Math.sin(t * 7) * 0.32 * k; }
        else if (A.mood === 'wow') { sy = sx = 1 + Math.sin(Math.min(1, t / 0.25) * Math.PI) * 0.2; }
        else if (A.mood === 'bounce') { sy = 1 - Math.sin(Math.min(1, t / T) * Math.PI) * 0.25; sx = 2 - sy; }
        else if (A.mood === 'shiver') { x = Math.sin(t * 60) * 0.04 * k; }
        else if (A.mood === 'sleep') { rz = 0.25 * Math.sin(Math.min(1, t / 0.5) * Math.PI / 2) * Math.min(1, k * 4); sy = 1 + Math.sin(t * 3) * 0.04; }
        if (t >= T) A.mood = null;
      }
      inner.position.set(x * A.base, y * A.base, 0); inner.rotation.z = rz; inner.rotation.x = rx; inner.scale.set(A.base * sx, A.base * sy, A.base * sx);
      if (A.tintK !== A.tintGoal) A.tintK += Math.sign(A.tintGoal - A.tintK) * Math.min(Math.abs(A.tintGoal - A.tintK), dt * 3);
      for (const m of tinted) { tmp.set(m.userData.base); m.color.copy(tmp).lerp(to, A.tintK * (m.userData.tintMax || 0.85)); }
      if (extra.update) extra.update(A, dt);
    };
    return A;
  }

  // ---- a round little animal of any SPECIES. opts: hang (paws up on the rope), asleep (eyes shut until 'wake')
  function critter(o) {
    const sp = SPECIES[o.model] || SPECIES.cat, g = group();
    const fur = mat(sp.fur), pale = mat(sp.pale), dark = mat(sp.dark), white = mat(0xffffff, 0.3), black = mat(0x2a1b2e, 0.3), pink = mat(0xff7fa0);
    add(g, 'ball', fur, [0, -0.28, 0], [0.7, 0.66, 0.6]); add(g, 'ball', pale, [0, -0.3, 0.3], [0.46, 0.44, 0.36]);
    const head = group(); head.position.set(0, 0.4, 0.1); g.add(head);
    add(head, 'ball', fur, [0, 0, 0], 0.6);
    if (sp.face !== 'none') add(head, 'ball', pale, [0, -0.16, 0.38], [0.3, 0.22, 0.26]);
    const earM = sp.mask ? dark : fur;
    if (sp.ears === 'point') for (const s of [-1, 1]) { add(head, 'cone', earM, [s * 0.34, 0.56, 0], [0.2, 0.36, 0.14], [0, 0, -s * 0.3]); add(head, 'cone', sp.face === 'beak' ? dark : pink, [s * 0.34, 0.54, 0.06], [0.11, 0.22, 0.08], [0, 0, -s * 0.3]); }
    else if (sp.ears === 'flop') for (const s of [-1, 1]) add(head, 'ball', dark, [s * 0.58, 0.02, 0], [0.17, 0.36, 0.16], [0, 0, s * 0.35]);
    else if (sp.ears === 'long') for (const s of [-1, 1]) { add(head, 'ball', fur, [s * 0.22, 0.86, -0.02], [0.13, 0.46, 0.1], [0, 0, -s * 0.12]); add(head, 'ball', dark, [s * 0.22, 0.86, 0.05], [0.07, 0.34, 0.05], [0, 0, -s * 0.12]); }
    else if (sp.ears === 'round') for (const s of [-1, 1]) add(head, 'ball', earM, [s * 0.44, 0.46, 0], [0.2, 0.2, 0.12]);
    else if (sp.ears === 'big') for (const s of [-1, 1]) { add(head, 'ball', fur, [s * 0.58, 0.3, -0.04], [0.3, 0.3, 0.08]); add(head, 'ball', dark, [s * 0.58, 0.3, 0.02], [0.2, 0.2, 0.06]); }
    const top = sp.eyes === 'top';
    if (sp.mask) for (const s of [-1, 1]) add(head, 'ball', dark, [s * 0.23, 0.08, 0.46], [0.2, 0.24, 0.12], [0, 0, s * 0.4]);
    const eyes = [-0.23, 0.23].map((x) => { const e = group(); e.position.set(top ? x * 1.3 : x, top ? 0.52 : 0.1, top ? 0.2 : 0.5); head.add(e); if (top) add(e, 'ball', fur, [0, 0, -0.06], 0.2); add(e, 'ball', white, [0, 0, 0], [0.16, 0.18, 0.1]); add(e, 'ball', black, [0, 0, 0.07], [0.09, 0.11, 0.06]); add(e, 'ball', white, [0.03, 0.05, 0.12], 0.03); return e; });
    if (sp.face === 'nose') add(head, 'ball', sp.dark === 0x2f2a33 || o.model === 'puppy' || o.model === 'bear' ? black : pink, [0, -0.08, 0.6], [0.07, 0.05, 0.05]);
    else if (sp.face === 'beak') add(head, 'cone', dark, [0, -0.1, 0.62], [0.11, 0.2, 0.1], [Math.PI / 2, 0, 0]);
    else if (sp.face === 'bill') add(head, 'ball', dark, [0, -0.12, 0.62], [0.2, 0.07, 0.16]);
    else if (sp.face === 'snout') { add(head, 'tube', dark, [0, -0.1, 0.58], [0.16, 0.1, 0.13], [Math.PI / 2, 0, 0]); for (const s of [-1, 1]) add(head, 'ball', black, [s * 0.06, -0.1, 0.64], 0.025); }
    const mouth = add(head, 'ball', black, [0, sp.face === 'none' ? -0.14 : -0.24, sp.face === 'none' ? 0.56 : 0.54], [0.09, 0.04, 0.04]);
    const armM = sp.mask ? dark : fur;
    const arms = [-1, 1].map((s) => add(g, 'ball', armM, o.hang ? [s * 0.3, 0.86, 0.02] : [s * 0.62, -0.14, 0.2], o.hang ? [0.15, 0.3, 0.15] : 0.17));
    const legs = [-1, 1].map((s) => add(g, 'ball', sp.mask ? dark : sp.face === 'beak' || sp.face === 'bill' ? dark : pale, [s * 0.3, -0.86, 0.22], [0.2, 0.15, 0.26]));
    const tail = group(); tail.position.set(0.5, -0.5, -0.3); g.add(tail);
    if (sp.tail === 'long') { add(tail, 'ball', fur, [0.12, 0.1, 0], 0.13); add(tail, 'ball', fur, [0.25, 0.28, 0], 0.12); add(tail, 'ball', dark, [0.3, 0.48, 0], 0.12); }
    else if (sp.tail === 'stub') add(tail, 'ball', dark, [0.1, 0.12, 0], [0.11, 0.22, 0.11], [0, 0, -0.5]);
    else if (sp.tail === 'puff') add(tail, 'ball', pale, [0.05, 0.05, 0], 0.2);
    let shut = o.asleep ? 1 : 0;
    return actor(g, o, { tinted: [fur, pale], spin: false, update(A, dt) {
      const t = A.time;
      if (A.flags.wake && shut > 0) shut = Math.max(0, shut - dt * 4);
      const blink = (t % 3.1) > 2.96 ? 0.12 : 1, wide = A.mood === 'wow' || A.mood === 'happy' ? 1.25 : A.mood === 'laugh' || A.mood === 'sneeze' || A.mood === 'sleep' ? 0.3 : 1;
      for (const e of eyes) e.scale.set(1, Math.max(0.1, blink * wide * (1 - shut * 0.9)), 1);
      mouth.scale.set(A.mood === 'happy' || A.mood === 'laugh' ? 0.16 : 0.09, A.mood === 'wow' || A.mood === 'laugh' || A.mood === 'happy' ? 0.12 : 0.04, 0.04);
      tail.rotation.z = Math.sin(t * (A.mood === 'happy' ? 14 : 4)) * 0.35; head.rotation.z = Math.sin(t * 1.7) * 0.06 + shut * 0.25;
      const sw = o.hang && !A.flags.landed ? Math.sin(t * 5) * 0.25 : 0; legs[0].position.z = 0.22 + sw * 0.4; legs[1].position.z = 0.22 - sw * 0.4;
      if (A.flags.landed && o.hang) { arms[0].position.set(-0.62, -0.14, 0.2); arms[1].position.set(0.62, -0.14, 0.2); arms[0].scale.setScalar(0.17); arms[1].scale.setScalar(0.17); }
    } });
  }

  // ---- things any world hangs on a rope (built in a ball of radius 1)
  const B = {
    waterBalloon: (g) => { const m = mat(0x39b6ff, 0.2); add(g, 'ball', m, [0, -0.08, 0], [0.86, 0.94, 0.86]); add(g, 'cone', m, [0, 0.88, 0], [0.16, 0.2, 0.16]); add(g, 'ball', mat(0xffffff, 0.2), [-0.3, 0.25, 0.68], [0.18, 0.26, 0.08]); knot(g, mat(0x1b7fd6)); },
    gift: (g) => { add(g, 'box', mat(0xff5fa8), [0, -0.1, 0], [1.3, 1.2, 1.3]); const r = mat(0xfff06a); add(g, 'box', r, [0, -0.1, 0], [0.26, 1.24, 1.34]); add(g, 'box', r, [0, -0.1, 0], [1.34, 1.24, 0.26]); add(g, 'ring', r, [-0.2, 0.66, 0], 0.2, [0, 0, 0.5]); add(g, 'ring', r, [0.2, 0.66, 0], 0.2, [0, 0, -0.5]); knot(g, r); },
    sack: (g) => { const m = mat(0xe9d3a4); add(g, 'ball', m, [0, -0.2, 0], [0.84, 0.8, 0.7]); add(g, 'cone', m, [0, 0.72, 0], [0.34, 0.4, 0.3], [Math.PI, 0, 0]); add(g, 'ring', mat(0xb5793d), [0, 0.54, 0], 0.2, [Math.PI / 2, 0, 0]); add(g, 'box', mat(0xffffff), [0, -0.2, 0.68], [0.5, 0.36, 0.04]); knot(g, mat(0xb5793d)); },
    bucket: (g) => { add(g, 'tube', mat(0x9fd8ff, 0.3), [0, -0.15, 0], [0.8, 1.2, 0.8]); add(g, 'tube', mat(0x2f9bff, 0.15), [0, 0.42, 0], [0.74, 0.08, 0.74]); add(g, 'ring', mat(0x6b7c93), [0, 0.5, 0], [0.74, 0.74, 0.5]); for (let i = 0; i < 3; i++) add(g, 'ball', mat(0xffffff, 0.1), [-0.4 + i * 0.4, 0.62 + (i % 2) * 0.12, 0.2], 0.2); knot(g, mat(0x6b7c93)); },
    crate: (g) => { add(g, 'box', mat(0xc98a4e), [0, -0.2, 0], [1.4, 1.1, 1.3]); add(g, 'box', mat(0x9b6431), [0, -0.2, 0.66], [1.44, 0.2, 0.04]); const y = mat(0xffd21f, 0.35); add(g, 'ball', y, [0, 0.5, 0.1], [0.42, 0.34, 0.42]); add(g, 'ball', y, [0, 0.86, 0.26], 0.26); add(g, 'cone', mat(0xff8a1f), [0, 0.82, 0.54], [0.12, 0.2, 0.08], [Math.PI / 2, 0, 0]); add(g, 'ball', mat(0x2a1b2e), [-0.1, 0.94, 0.47], 0.04); add(g, 'ball', mat(0x2a1b2e), [0.1, 0.94, 0.47], 0.04); },
    ball: (g) => { add(g, 'ball', mat(0xffffff, 0.35), [0, 0, 0], 0.98); const cs = [0xff4d5e, 0x2f9bff, 0xffc61a]; for (let i = 0; i < 3; i++) add(g, 'ball', mat(cs[i], 0.35), [0, 0, 0], [1, 1, 0.34], [0, i * Math.PI / 3, 0]); },
    can: (g) => { const m = mat(0x39c6b0, 0.4); add(g, 'tube', m, [0, -0.15, 0], [0.66, 1.05, 0.66]); add(g, 'tube', m, [0.9, 0.05, 0], [0.11, 0.95, 0.11], [0, 0, -1.0]); add(g, 'cone', mat(0x2aa392), [1.33, 0.33, 0], [0.24, 0.26, 0.24], [0, 0, 0.55]); add(g, 'ring', mat(0x2aa392), [-0.7, -0.1, 0], [0.4, 0.5, 0.4]); knot(g, m); },
    balloon: (g, o) => { const m = mat(o.color || 0xff4d5e, 0.2); add(g, 'ball', m, [0, 0.1, 0], [0.86, 1, 0.86]); add(g, 'cone', m, [0, -0.92, 0], [0.14, 0.18, 0.14]); add(g, 'ball', mat(0xffffff, 0.2), [-0.3, 0.45, 0.66], [0.16, 0.24, 0.07]); },
    pillow: (g) => { const m = mat(0xbfe3ff, 0.9); add(g, 'ball', m, [0, 0, 0], [1, 0.62, 0.7]); for (const [x, y] of [[-0.86, 0.5], [0.86, 0.5], [-0.86, -0.5], [0.86, -0.5]]) add(g, 'ball', m, [x, y, 0], 0.16); add(g, 'ball', mat(0xffffff, 0.9), [0, 0, 0.4], [0.5, 0.3, 0.34]); },
    cake: (g) => { add(g, 'tube', mat(0xfff1d6), [0, -0.3, 0], [0.9, 0.8, 0.9]); add(g, 'tube', mat(0xff8fb1), [0, 0.14, 0], [0.94, 0.16, 0.94]); for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; add(g, 'ball', mat(0xff4d5e, 0.3), [Math.cos(a) * 0.62, 0.3, Math.sin(a) * 0.62], 0.13); } add(g, 'tube', mat(0x9fd8ff), [0, 0.5, 0], [0.05, 0.4, 0.05]); add(g, 'cone', mat(0xffc61a, 0.2), [0, 0.82, 0], [0.09, 0.2, 0.09]); },
    star: (g) => { const m = mat(0xffd21f, 0.25); for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2 + Math.PI / 2; add(g, 'cone', m, [Math.cos(a) * 0.5, Math.sin(a) * 0.5, 0], [0.34, 0.8, 0.2], [0, 0, a - Math.PI / 2]); } add(g, 'ball', m, [0, 0, 0], [0.5, 0.5, 0.24]); },
    pot: (g) => { const m = mat(0x6b7c93, 0.3); add(g, 'tube', m, [0, -0.1, 0], [0.86, 1.0, 0.86]); add(g, 'ring', m, [0, 0.4, 0], [0.86, 0.86, 0.4], [Math.PI / 2, 0, 0]); add(g, 'box', m, [-1.05, 0.25, 0], [0.4, 0.12, 0.2]); add(g, 'box', m, [1.05, 0.25, 0], [0.4, 0.12, 0.2]); },
    anvil: (g) => { const m = mat(0x4a5266, 0.35); add(g, 'box', m, [0, 0.3, 0], [1.6, 0.5, 0.8]); add(g, 'cone', m, [1.05, 0.3, 0], [0.26, 0.6, 0.38], [0, 0, -Math.PI / 2]); add(g, 'box', m, [0, -0.15, 0], [0.6, 0.5, 0.5]); add(g, 'box', m, [0, -0.6, 0], [1.2, 0.4, 0.8]); knot(g, m); },
    cloud: (g) => { const m = mat(0xffffff, 0.9); add(g, 'ball', m, [-0.5, -0.1, 0], 0.5); add(g, 'ball', m, [0, 0.12, 0], 0.66); add(g, 'ball', m, [0.55, -0.1, 0], 0.48); add(g, 'ball', m, [0, -0.3, 0.1], [0.9, 0.36, 0.5]); },
    bell: (g) => { const m = mat(0xffc61a, 0.2); add(g, 'cone', m, [0, 0.1, 0], [0.8, 1.2, 0.8]); add(g, 'tube', m, [0, -0.5, 0], [0.86, 0.14, 0.86]); add(g, 'ball', mat(0xb87400, 0.3), [0, -0.66, 0], 0.18); knot(g, m); },
    cheese: (g) => { const m = mat(0xffd23c, 0.5); add(g, 'box', m, [0, 0, 0], [1.5, 0.9, 0.9], [0, 0, 0.12]); for (const [x, y, r] of [[-0.3, 0.1, 0.16], [0.35, -0.12, 0.12], [0.1, 0.22, 0.09]]) add(g, 'ball', mat(0xe8a80c, 0.5), [x, y, 0.46], [r, r, 0.04]); },
    carrot: (g) => { add(g, 'cone', mat(0xff8a1f, 0.5), [0, -0.15, 0], [0.42, 1.5, 0.42], [Math.PI, 0, 0]); for (const x of [-0.2, 0, 0.2]) add(g, 'ball', mat(0x4fbf4a), [x, 0.78, 0], [0.12, 0.3, 0.1], [0, 0, -x * 2]); },
    banana: (g) => { const m = mat(0xffe03c, 0.45); for (let i = 0; i < 5; i++) { const a = -0.9 + i * 0.45; add(g, 'ball', m, [Math.sin(a) * 0.8, -Math.cos(a) * 0.8 + 0.5, 0], [0.3, 0.26, 0.26]); } add(g, 'ball', mat(0x7a4a26), [-0.66, -0.02, 0], 0.1); },
    fish: (g) => { const m = mat(0x4fb4ff, 0.3); add(g, 'ball', m, [0.1, 0, 0], [0.8, 0.5, 0.3]); add(g, 'cone', m, [-0.85, 0, 0], [0.4, 0.5, 0.12], [0, 0, -Math.PI / 2]); add(g, 'ball', mat(0xffffff, 0.2), [0.5, 0.12, 0.26], 0.11); add(g, 'ball', mat(0x2a1b2e), [0.54, 0.12, 0.34], 0.055); },
    bone: (g) => { const m = mat(0xfffbf0, 0.5); add(g, 'tube', m, [0, 0, 0], [0.16, 1.2, 0.16], [0, 0, Math.PI / 2]); for (const [x, y] of [[-0.7, 0.16], [-0.7, -0.16], [0.7, 0.16], [0.7, -0.16]]) add(g, 'ball', m, [x, y, 0], 0.24); },
    apple: (g) => { add(g, 'ball', mat(0xff3d4f, 0.3), [0, -0.05, 0], [0.86, 0.8, 0.86]); add(g, 'tube', mat(0x7a4a26), [0, 0.8, 0], [0.05, 0.3, 0.05]); add(g, 'ball', mat(0x4fbf4a), [0.24, 0.86, 0], [0.26, 0.08, 0.14], [0, 0, 0.5]); add(g, 'ball', mat(0xffffff, 0.2), [-0.3, 0.25, 0.68], [0.14, 0.2, 0.06]); },
    honey: (g) => { add(g, 'tube', mat(0xffb62e, 0.25), [0, -0.12, 0], [0.74, 1.1, 0.74]); add(g, 'tube', mat(0xfff1d6), [0, 0.5, 0], [0.8, 0.2, 0.8]); add(g, 'box', mat(0xffffff), [0, -0.1, 0.72], [0.7, 0.44, 0.04]); add(g, 'ball', mat(0xffd23c, 0.3), [0, -0.1, 0.76], [0.16, 0.16, 0.03]); },
    scarf: (g) => { const m = mat(0xff4d5e, 0.9); add(g, 'ring', m, [0, 0.2, 0], [0.7, 0.7, 1.4], [Math.PI / 2, 0, 0]); add(g, 'box', m, [0.4, -0.4, 0.3], [0.34, 1.0, 0.14], [0, 0, 0.2]); for (const y of [-0.2, -0.5]) add(g, 'box', mat(0xffffff, 0.9), [0.37 + y * -0.06, y, 0.38], [0.36, 0.1, 0.04], [0, 0, 0.2]); },
    hat: (g) => { const m = mat(0x2f9bff, 0.9); add(g, 'ball', m, [0, -0.1, 0], [0.86, 0.8, 0.86]); add(g, 'ring', mat(0xffffff, 0.9), [0, -0.5, 0], [0.84, 0.84, 0.9], [Math.PI / 2, 0, 0]); add(g, 'ball', mat(0xffffff, 0.9), [0, 0.74, 0], 0.26); },
    umbrella: (g) => { const cs = [0xff4d5e, 0xffffff]; for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; add(g, 'cone', mat(cs[i % 2], 0.6), [Math.cos(a) * 0.05, 0.42, Math.sin(a) * 0.05], [1.05, 0.5, 1.05], [0, a, 0]); } add(g, 'tube', mat(0x7a4a26), [0, -0.2, 0], [0.05, 1.3, 0.05]); add(g, 'ring', mat(0x7a4a26), [0.14, -0.86, 0], [0.14, 0.14, 0.3]); },
    liftCage: (g) => { const m = mat(0xc9d2e3, 0.3); add(g, 'ring', m, [0, 0.62, 0], [0.9, 0.9, 0.3], [Math.PI / 2, 0, 0]); add(g, 'ring', m, [0, -0.86, 0], [0.9, 0.9, 0.3], [Math.PI / 2, 0, 0]); for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; add(g, 'tube', m, [Math.cos(a) * 0.9, -0.12, Math.sin(a) * 0.9], [0.035, 1.5, 0.035]); } add(g, 'cone', m, [0, 0.82, 0], [0.92, 0.4, 0.92]); const cs = [0xff4d5e, 0xffc61a, 0x2f9bff]; cs.forEach((c, i) => { add(g, 'ball', mat(c, 0.2), [(i - 1) * 0.55, 1.75 + (i % 2) * 0.2, 0], [0.4, 0.48, 0.4]); add(g, 'tube', mat(0xffffff), [(i - 1) * 0.28, 1.25, 0], [0.012, 0.6, 0.012], [0, 0, (i - 1) * -0.45]); }); },
    ice: (g) => { const m = mat(0xbfeaff, 0.1); add(g, 'box', m, [0, 0, 0], [1.3, 1.3, 1.3], [0.2, 0.3, 0.1]); add(g, 'box', mat(0xffffff, 0.1), [-0.2, 0.3, 0.6], [0.4, 0.14, 0.1], [0, 0, 0.4]); },
    battery: (g) => { add(g, 'tube', mat(0x57d86b, 0.3), [0, -0.1, 0], [0.5, 1.4, 0.5]); add(g, 'tube', mat(0x2a1b2e, 0.3), [0, 0.5, 0], [0.52, 0.3, 0.52]); add(g, 'tube', mat(0xc9d2e3, 0.2), [0, 0.76, 0], [0.2, 0.2, 0.2]); add(g, 'cone', mat(0xfff06a, 0.2), [0, 0.05, 0.5], [0.14, 0.4, 0.04]); add(g, 'cone', mat(0xfff06a, 0.2), [0, -0.3, 0.5], [0.14, 0.4, 0.04], [Math.PI, 0, 0]); },
    lamp: (g) => { add(g, 'cone', mat(0xffe07a, 0.5), [0, 0.2, 0], [0.9, 0.9, 0.9]); add(g, 'ball', mat(0xfffbe0, 0.1), [0, -0.3, 0], 0.3); add(g, 'tube', mat(0x6b7c93), [0, 0.8, 0], [0.06, 0.4, 0.06]); },
    yarn: (g) => { const m = mat(0xc27cff, 0.9); add(g, 'ball', m, [0, 0, 0], 0.9); for (let i = 0; i < 4; i++) add(g, 'ring', mat(0xa64dff, 0.9), [0, 0, 0], [0.88, 0.88, 0.5], [i * 0.8, i * 1.1, 0]); },
  };
  const P = {}; // world pack models by name
  for (const pack of packs) for (const [name, fn] of Object.entries(pack.models || {})) P[name] = fn;

  return {
    /** Builds model `name`; opts: { r or s, hang, asleep, muddy, tint, color, seed } plus anything a pack model reads. */
    make(name, o = {}) {
      const opts = { ...o, model: name }; if (o.muddy) opts.tint = 0x6b4a2e;
      if (SPECIES[name]) return critter(opts);
      const g = group(), extra = (P[name] || B[name] || B.gift)(g, P[name] ? K : opts, opts) || {};
      return actor(g, opts, extra);
    },
    has: (name) => !!(SPECIES[name] || B[name] || P[name]),
    /** Frees the materials of every model made so far (call when a level's models leave the stage). */
    clear() { for (const m of mats) m.dispose(); mats.length = 0; },
    dispose() { for (const k in G) G[k].dispose(); for (const m of mats) m.dispose(); mats.length = 0; },
  };
}
