// PROTOTYPE - NOT FOR PRODUCTION
// Mow Mow Meadow: each garden's one new idea (plan section 8). Ducklings that parade behind Buzzy, molehills that
// pop a toy, orchard trees that drop apples, sheep that munch the edges, sprinklers that wet the grass, mushroom rings
// that chime when circled, and the fountain's spray. Rules stay in logic.js; this file owns the small actors.
// THREE is read when a garden's toys are built.
import { paint, xf, merge, blob, cyl, lathe, mesh } from './kit.js';

const DARK = '#2b2b33';
const ducklingGeo = () => merge([
  paint(xf(blob(0.11, 1, 0.9, 1.25, 2), [0, 0.11, 0]), '#f6d04a', '#fbe58a'), paint(xf(blob(0.08, 1, 1, 1, 2), [0, 0.24, -0.09]), '#f6d04a', '#fbe58a'),
  paint(xf(blob(0.035, 1.1, 0.5, 1.4, 1), [0, 0.225, -0.17]), '#f08a3c'), paint(xf(blob(0.014, 1, 1, 1, 1), [-0.045, 0.265, -0.14]), DARK), paint(xf(blob(0.014, 1, 1, 1, 1), [0.045, 0.265, -0.14]), DARK),
  paint(xf(blob(0.05, 0.5, 0.8, 1.2, 1), [-0.1, 0.12, 0.02]), '#f1c23c'), paint(xf(blob(0.05, 0.5, 0.8, 1.2, 1), [0.1, 0.12, 0.02]), '#f1c23c'), paint(xf(blob(0.04, 1, 1, 1, 1), [0, 0.17, 0.13]), '#f6d04a'),
]);
const sheepGeo = () => {
  const out = [paint(xf(blob(0.28, 1, 0.85, 1.25, 2), [0, 0.42, 0]), '#f3efe6', '#ffffff')];
  for (let i = 0; i < 9; i++) { const a = i / 9 * 6.283; out.push(paint(xf(blob(0.13, 1, 1, 1, 1), [Math.cos(a) * 0.2, 0.46 + Math.sin(i * 2.1) * 0.08, Math.sin(a) * 0.27]), '#f3efe6', '#ffffff')); }
  out.push(paint(xf(blob(0.13, 0.9, 1, 1.15, 2), [0, 0.5, -0.36]), '#4a4450', '#5e5868'), paint(xf(blob(0.09, 1.2, 0.7, 1, 1), [0, 0.6, -0.3]), '#f3efe6'),
    paint(xf(blob(0.045, 1.6, 0.5, 0.8, 1), [-0.14, 0.53, -0.33]), '#4a4450'), paint(xf(blob(0.045, 1.6, 0.5, 0.8, 1), [0.14, 0.53, -0.33]), '#4a4450'),
    paint(xf(blob(0.02, 1, 1, 1, 1), [-0.06, 0.54, -0.47]), '#ffffff'), paint(xf(blob(0.02, 1, 1, 1, 1), [0.06, 0.54, -0.47]), '#ffffff'));
  for (const [x, z] of [[-0.13, -0.2], [0.13, -0.2], [-0.13, 0.2], [0.13, 0.2]]) out.push(paint(xf(cyl(0.035, 0.03, 0.24, 5), [x, 0, z]), '#4a4450'));
  return merge(out);
};
const moundGeo = () => merge([paint(xf(blob(0.36, 1, 0.5, 1, 2), [0, 0.02, 0]), '#6b4a34', '#8f6a4a'), paint(xf(blob(0.1, 1, 0.6, 1, 1), [0.3, 0.02, 0.12]), '#7a563c'), paint(xf(blob(0.08, 1, 0.6, 1, 1), [-0.26, 0.02, -0.2]), '#7a563c'), paint(xf(blob(0.07, 1, 0.5, 1, 1), [0.05, 0.02, 0.34]), '#6b4a34')]);
const appleGeo = () => merge([paint(xf(blob(0.1, 1, 0.9, 1, 2), [0, 0.1, 0]), '#d8432e', '#f08a5a'), paint(xf(cyl(0.008, 0.006, 0.06, 4), [0, 0.18, 0]), '#6a4028'), paint(xf(blob(0.035, 1.6, 0.3, 0.8, 1), [0.04, 0.22, 0]), '#5fae52')]);
const sprinklerGeo = () => merge([paint(xf(cyl(0.05, 0.04, 0.22, 8), [0, 0, 0]), '#8a9aa8', '#c4d0d8'), paint(xf(blob(0.07, 1, 0.6, 1, 1), [0, 0.24, 0]), '#e9795b')]);
const armGeo = () => paint(xf(cyl(0.02, 0.015, 0.2, 5), [0, 0, 0], [Math.PI / 2 - 0.5, 0, 0]), '#c4d0d8');
const shroomGeo = (cap) => merge([paint(xf(cyl(0.05, 0.04, 0.16, 7), [0, 0, 0]), '#f6efe0', '#fffaf0'), paint(xf(lathe([[0, 0.3], [0.08, 0.28], [0.15, 0.2], [0.16, 0.15], [0.05, 0.15]], 10), [0, 0, 0]), cap, '#ffffff'),
  paint(xf(blob(0.022, 1, 0.5, 1, 1), [0.07, 0.25, 0.04]), '#ffffff'), paint(xf(blob(0.018, 1, 0.5, 1, 1), [-0.06, 0.255, -0.05]), '#ffffff')]);

/**
 * Builds the toys of one garden. `c` is the game's context: { world, cfg, L, fx, audio, S, award(n, x, y, z),
 * reward(kind), reveal(slot, find), cellCut(g, x, z), cutAt(slot, lx, lz, width), reach() }.
 * `s` is the garden slot { n, g, ox, oz, dress, stars, finale }.
 * Returns { update(dt, t, active), dispose() }; `active` is true for the garden Buzzy is in.
 */
export function createToys(c, s) {
  const THREE = window.THREE, { world, cfg, L, fx, audio, S } = c, g = s.g, M = world.M, group = new THREE.Group(), E = cfg.toyplay;
  world.scene.add(group);
  const add = (geo, mat = M.enamel, shadow = true) => { const m = mesh(geo, mat, shadow); group.add(m); return m; };
  const wx = (x) => s.ox + x, wz = (z) => s.oz + z;
  const steps = [];

  // ---- a trail of where Buzzy has been, for anything that follows in a line
  const trail = []; let lastX = 1e9, lastZ = 1e9;
  const followers = [];
  function trailStep(kt) {
    if (Math.hypot(kt.x - lastX, kt.z - lastZ) > 0.25) { trail.unshift({ x: kt.x, z: kt.z }); if (trail.length > 60) trail.pop(); lastX = kt.x; lastZ = kt.z; }
  }
  /** Moves a follower toward the trail point `back` metres behind Buzzy, waddling. Returns true when it moved. */
  function follow(f, back, dt, t, speed) {
    const p = trail[Math.min(trail.length - 1, Math.round(back / 0.25))]; if (!p) return false;
    const tx = p.x + (f.side || 0), tz = p.z, dx = tx - f.m.position.x, dz = tz - f.m.position.z, d = Math.hypot(dx, dz);
    if (d > 0.05) { const k = Math.min(1, speed * dt / d); f.m.position.x += dx * k; f.m.position.z += dz * k; f.m.rotation.y = Math.atan2(-dx, -dz); }
    const moving = d > 0.12; f.m.position.y = moving ? Math.abs(Math.sin(t * 11 + f.ph)) * f.hop : 0; f.m.rotation.z = moving ? Math.sin(t * 11 + f.ph) * 0.14 : 0;
    return moving;
  }

  // ---- pond: three ducklings swim, then parade behind Buzzy once it comes close
  if (g.pond) {
    const p = g.pond, ducks = [], st = { mode: s.finale ? 'home' : 'swim', said: false };
    for (let i = 0; i < 3; i++) { const m = add(ducklingGeo()); m.scale.setScalar(1.5 - i * 0.12); ducks.push({ m, ph: i * 2.1, hop: 0.07, side: 0 }); followers.push(ducks[i]); }
    steps.push((dt, t, active, kt) => {
      const near = Math.hypot(kt.x - wx(p.x), kt.z - wz(p.z)) < Math.max(p.rx, p.rz) + E.duckWakeM;
      if (st.mode === 'swim' && active && near) { st.mode = 'follow'; audio.sfx('splash'); fx.burst('drop', wx(p.x), 0.2, wz(p.z), 14, { spread: 0.8, up: 2 }); fx.ring(wx(p.x), wz(p.z), '#c4e8f5', 0.4, p.rx + 0.6, 0.6, 0.5); if (!st.said) { st.said = true; c.reward('parade'); } }
      if (st.mode === 'follow' && (s.finale || !active)) st.mode = 'home';
      ducks.forEach((d, i) => {
        if (st.mode === 'follow') { if (follow(d, E.duckGapM * (i + 2), dt, t, 6) && Math.random() < dt * 1.5) audio.sfx('pop', { quiet: true }); }
        else { // swim in a slow ring on the pond
          const a = t * 0.5 + i * 2.1, tx = wx(p.x) + Math.cos(a) * p.rx * 0.5, tz = wz(p.z) + Math.sin(a) * p.rz * 0.5, k = Math.min(1, dt * (st.mode === 'home' ? 2.5 : 8));
          d.m.position.x += (tx - d.m.position.x) * k; d.m.position.z += (tz - d.m.position.z) * k; d.m.position.y = -0.03 + Math.sin(t * 2 + i) * 0.012; d.m.rotation.set(0, -a - Math.PI / 2 + Math.PI, 0);
          if (Math.random() < dt * 0.6) fx.ring(d.m.position.x, d.m.position.z, '#e6f6fb', 0.1, 0.45, 0.8, 0.35, 0.07);
        }
      });
    });
    ducks.forEach((d, i) => d.m.position.set(wx(p.x) + Math.cos(i * 2.1) * p.rx * 0.5, 0, wz(p.z) + Math.sin(i * 2.1) * p.rz * 0.5));
  }

  // ---- molehills: bump one (or mow over it) and a toy pops out
  if (g.molehills.length) {
    const hills = g.molehills.map((h) => { const m = add(moundGeo(), M.matte); m.position.set(wx(h.x), 0, wz(h.z)); h.popped = h.popped || c.cellCut(g, h.x, h.z); if (h.popped) m.scale.set(1.1, 0.35, 1.1); return { h, m, t: 0 }; });
    steps.push((dt, t, active, kt) => {
      for (const o of hills) {
        if (!o.h.popped) {
          o.m.scale.y = 1 + Math.sin(t * 2.2 + o.h.x) * 0.05; // it breathes: something is inside
          if (active && (Math.hypot(kt.x - o.m.position.x, kt.z - o.m.position.z) < E.moleBumpM || c.cellCut(g, o.h.x, o.h.z))) {
            o.h.popped = true; o.t = 0.5; audio.sfx('pop'); fx.burst('dust', o.m.position.x, 0.3, o.m.position.z, 12, { spread: 0.4, up: 1.5 }); fx.ring(o.m.position.x, o.m.position.z, '#e6d3ab', 0.3, 1.6, 0.45);
            const left = cfg.toys.filter((id) => !S.save.toys.includes(id));
            if (left.length) c.reveal(s, { kind: 'toy', id: left[Math.floor(o.h.x * 7 + o.h.z * 13) % left.length], x: o.h.x, z: o.h.z, golden: false, found: false });
            else c.award(L.findCoins(cfg, s.n + 1) * 2, o.m.position.x, 0.5, o.m.position.z);
            c.reward('molehill');
          }
        } else if (o.t > 0) { o.t = Math.max(0, o.t - dt); const k = 1 - o.t / 0.5; o.m.scale.set(1 + 0.1 * k, 1 - 0.65 * k + Math.sin(k * Math.PI) * 0.5, 1 + 0.1 * k); }
      }
    });
  }

  // ---- orchard: brush a tree and apples drop; drive near an apple to catch it
  const trees = s.dress.trees || [];
  if (trees.length) {
    const apples = [], geo = appleGeo();
    for (const tr of trees) { tr.left = s.stars >= 3 ? 0 : E.applesPerTree; tr.cd = 0; }
    steps.push((dt, t, active, kt) => {
      for (const tr of trees) {
        tr.cd = Math.max(0, tr.cd - dt); tr.shake = Math.max(0, (tr.shake || 0) - dt * 2.2);
        const sh = Math.sin(t * 30) * tr.shake * 0.05; tr.leaf.rotation.z = sh; tr.leaf.rotation.x = sh * 0.6;
        if (!active || tr.left <= 0 || tr.cd > 0 || Math.hypot(kt.x - tr.x, kt.z - tr.z) > E.appleBrushM || kt.speed < 0.4) continue;
        tr.cd = E.appleCooldownS; tr.shake = 1; audio.sfx('rustle'); fx.burst('leaf', tr.x, 2, tr.z, 10, { spread: 0.8 });
        const n = Math.min(tr.left, 1 + (Math.random() < 0.5 ? 1 : 0)); tr.left -= n;
        for (let i = 0; i < n; i++) {
          const a = Math.atan2(kt.z - tr.z, kt.x - tr.x) + (Math.random() - 0.5) * 1.6, r = 1.0 + Math.random() * 0.6, m = new THREE.Mesh(geo, M.enamel); m.castShadow = true;
          m.position.set(tr.x + Math.cos(a) * 0.5, 2.0, tr.z + Math.sin(a) * 0.5); group.add(m);
          apples.push({ m, vx: Math.cos(a) * r * 1.2, vz: Math.sin(a) * r * 1.2, vy: 1 + Math.random(), rest: false, age: 0 });
        }
      }
      for (let i = apples.length - 1; i >= 0; i--) {
        const a = apples[i]; a.age += dt;
        if (!a.rest) {
          a.vy -= 12 * dt; a.m.position.x += a.vx * dt; a.m.position.z += a.vz * dt; a.m.position.y += a.vy * dt; a.m.rotation.x += dt * 6;
          a.m.position.x = Math.min(Math.max(a.m.position.x, s.ox + 0.7), s.ox + g.w - 0.7); a.m.position.z = Math.min(Math.max(a.m.position.z, s.oz + 0.7), s.oz + g.d - 0.7);
          if (a.m.position.y <= 0) { a.m.position.y = 0; if (a.vy < -2) { a.vy = -a.vy * 0.35; a.vx *= 0.5; a.vz *= 0.5; } else { a.rest = true; a.m.rotation.x = 0; } }
        } else {
          const d = Math.hypot(kt.x - a.m.position.x, kt.z - a.m.position.z);
          a.m.position.y = Math.abs(Math.sin(t * 3 + i)) * 0.03;
          if (d < c.reach() + 0.4) { const k = Math.min(1, 8 * dt / Math.max(d, 0.01)); a.m.position.x += (kt.x - a.m.position.x) * k; a.m.position.z += (kt.z - a.m.position.z) * k; }
          if (d < 1.0 || a.age > 60) { if (d < 1.0) { c.award(cfg.economy.appleCoins, a.m.position.x, 0.4, a.m.position.z); audio.sfx('apple'); fx.burst('spark', a.m.position.x, 0.4, a.m.position.z, 4); c.reward('apple'); } group.remove(a.m); apples.splice(i, 1); }
        }
      }
    });
    steps.dispose = () => geo.dispose();
  }

  // ---- sheep: three follow Buzzy and munch the grass beside its stripe
  if (g.f.includes('sheep')) {
    const flock = [];
    for (let i = 0; i < 3; i++) { const m = add(sheepGeo(), M.felt); m.position.set(wx(g.w / 2 + (i - 1) * 1.2), 0, wz(1.2 + (i % 2) * 0.6)); m.scale.setScalar(0.9); flock.push({ m, ph: i * 1.7, hop: 0.05, side: (i - 1) * E.sheepSideM, munch: i * 0.2 }); }
    steps.push((dt, t, active, kt) => {
      if (!active) return;
      for (const [i, f] of flock.entries()) {
        follow(f, E.sheepGapM * (i + 2), dt, t, 4.2);
        f.munch -= dt; if (f.munch <= 0 && !s.finale) { f.munch = 0.1; const bx = f.m.position.x - s.ox, bz = f.m.position.z - s.oz, n = c.cutAt(s, bx, bz, E.sheepBiteM, f.bx === undefined ? bx : f.bx, f.bz === undefined ? bz : f.bz); f.bx = bx; f.bz = bz; if (n > 0) { fx.burst('clip', f.m.position.x, 0.2, f.m.position.z, 1); if (Math.random() < 0.05) audio.sfx('rustle'); } }
      }
    });
  }

  // ---- sprinklers: a turning jet wets the grass it passes; wet grass sparkles and pays more
  if (g.sprinklers.length) {
    const heads = g.sprinklers.map((sp) => { const base = add(sprinklerGeo(), M.matte), arm = add(armGeo(), M.matte); base.position.set(wx(sp.x), 0, wz(sp.z)); arm.position.set(wx(sp.x), 0.24, wz(sp.z)); return { sp, arm, dry: 0 }; });
    const cells = Math.ceil(3.4 / g.cell);
    steps.push((dt, t, active) => {
      for (const h of heads) {
        const sp = h.sp; sp.a += E.sprinklerTurn * dt; h.arm.rotation.y = -sp.a + Math.PI / 2;
        if (!active) continue;
        const dx = Math.cos(sp.a), dz = Math.sin(sp.a);
        for (let k = 0.6; k <= sp.r; k += g.cell * 1.5) for (const o of [-0.25, 0, 0.25]) { // wet a narrow wedge under the jet
          const x = sp.x + dx * k - dz * o * k * 0.4, z = sp.z + dz * k + dx * o * k * 0.4, col = Math.floor(x / g.cell), row = Math.floor(z / g.cell);
          if (col >= 0 && row >= 0 && col < g.cols && row < g.rows) g.wet[row * g.cols + col] = 255;
        }
        if (Math.random() < dt * 24) { const k = 0.4 + Math.random() * (sp.r - 0.4); fx.burst('drop', wx(sp.x + dx * k), 0.5 + Math.sin(k / sp.r * Math.PI) * 0.7, wz(sp.z + dz * k), 1, { dx: dx * 2, dz: dz * 2, spread: 0.1 }); }
        if (Math.random() < dt * 5) { const a = sp.a - Math.random() * 1.2, k = 0.8 + Math.random() * (sp.r - 0.8); fx.burst('spark', wx(sp.x + Math.cos(a) * k), 0.5, wz(sp.z + Math.sin(a) * k), 1, { spread: 0.1 }); }
        h.dry += dt; if (h.dry > 0.5) { h.dry = 0; // wet grass dries in a few seconds, so timing the jet matters
          const c0 = Math.max(0, Math.floor(sp.x / g.cell) - cells), c1 = Math.min(g.cols - 1, Math.floor(sp.x / g.cell) + cells), r0 = Math.max(0, Math.floor(sp.z / g.cell) - cells), r1 = Math.min(g.rows - 1, Math.floor(sp.z / g.cell) + cells), drop = Math.ceil(255 * 0.5 / E.wetLastsS);
          for (let r = r0; r <= r1; r++) for (let q = c0; q <= c1; q++) { const i = r * g.cols + q; if (g.wet[i]) g.wet[i] = Math.max(0, g.wet[i] - drop); }
        }
      }
    });
  }

  // ---- mushroom rings: circle one all the way round and it lights up, note by note
  if (g.rings.length) {
    const caps = ['#e2533c', '#f08a6c', '#c8a0e8', '#f6c443'], blobGeo = blob(0.07, 1, 1, 1, 1);
    const rings = g.rings.map((r, k) => {
      const ms = []; for (let i = 0; i < 8; i++) { const a = i / 8 * 6.283, m = add(shroomGeo(caps[(i + k) % 4]), M.enamel); m.position.set(wx(r.x) + Math.cos(a) * r.r, 0, wz(r.z) + Math.sin(a) * r.r); m.scale.setScalar(0.9 + (i % 3) * 0.15); ms.push(m); }
      const glow = []; for (let i = 0; i < 8; i++) { const gm = new THREE.Mesh(blobGeo, M.glow); gm.position.copy(ms[i].position); gm.position.y = 0.34; gm.visible = false; group.add(gm); glow.push(gm); }
      return { r, ms, glow, acc: 0, last: null, lit: 0, seq: -1, seqT: 0 };
    });
    steps.push((dt, t, active, kt) => {
      for (const o of rings) {
        const dx = kt.x - wx(o.r.x), dz = kt.z - wz(o.r.z), d = Math.hypot(dx, dz), a = Math.atan2(dz, dx);
        for (const [i, m] of o.ms.entries()) { const near = Math.hypot(kt.x - m.position.x, kt.z - m.position.z) < 0.9; m.scale.y += (((near ? 0.55 : 1) * (0.9 + (i % 3) * 0.15)) - m.scale.y) * Math.min(1, dt * 12); }
        if (active && !o.r.lit && d > o.r.r * 0.6 && d < o.r.r + E.ringBandM) {
          if (o.last !== null) { let da = a - o.last; da = Math.atan2(Math.sin(da), Math.cos(da)); o.acc += da; }
          o.last = a; const n = Math.min(8, Math.floor(Math.abs(o.acc) / (6.283 * 0.94) * 8));
          if (n > o.lit) { o.lit = n; o.glow[n - 1].visible = true; audio.note(); fx.burst('spark', o.ms[n - 1].position.x, 0.4, o.ms[n - 1].position.z, 3); }
          if (o.lit >= 8) { o.r.lit = 1; o.seq = 0; o.seqT = 0; c.reward('ring'); audio.sfx('chime'); fx.ring(wx(o.r.x), wz(o.r.z), '#f6c95a', 0.3, o.r.r + 1.2, 0.8, 0.6); c.award(E.ringCoins, wx(o.r.x), 0.6, wz(o.r.z)); }
        } else if (!o.r.lit && d > o.r.r + E.ringBandM + 1.5) { o.acc = 0; o.last = null; if (o.lit) { o.lit = 0; for (const gm of o.glow) gm.visible = false; } }
        if (o.r.lit) for (const [i, gm] of o.glow.entries()) { gm.visible = true; gm.scale.setScalar(1 + 0.25 * Math.sin(t * 3 + i * 0.8)); }
      }
    });
  }

  // ---- the fountain's spray
  const fountain = g.props.find((p) => p.kind === 'fountain');
  if (fountain) steps.push((dt, t, active) => { if (active && Math.random() < dt * 20) fx.burst('drop', wx(fountain.x), 1.7, wz(fountain.z), 1, { spread: 0.05, up: 2.2, dx: (Math.random() - 0.5) * 1.6, dz: (Math.random() - 0.5) * 1.6 }); });

  return {
    update(dt, t, active) { const kt = S.kart; if (active && followers.length + (g.f.includes('sheep') ? 1 : 0) > 0) trailStep(kt); for (const f of steps) f(dt, t, active, kt); },
    dispose() { world.scene.remove(group); const seen = new Set(); group.traverse((o) => { if (o.geometry && !seen.has(o.geometry)) { seen.add(o.geometry); o.geometry.dispose(); } }); if (steps.dispose) steps.dispose(); },
  };
}

