// PROTOTYPE - NOT FOR PRODUCTION
// Rules of +1 Mega Hammer: node --test logic.test.mjs
// Includes a simulated player (always slams the best spot, two slams a second like a quick child) to check the
// timeline the plan promises: zone 1 done near 10 s, and zone 2 done well inside a minute.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as L from './logic.js';

const cfg = JSON.parse(fs.readFileSync(new URL('./game_config.json', import.meta.url)));

test('rng is seeded and repeatable', () => {
  const a = L.rng(3), b = L.rng(3);
  for (let i = 0; i < 5; i++) assert.equal(a(), b());
});

test('hammer scale follows 1 + k * ln(1 + L) and stays within 8x at the end of a run', () => {
  assert.equal(L.hammerScale(cfg, 0), 1);
  assert.equal(L.hammerScale(cfg, Math.E - 1), 1 + cfg.hammer.scaleK);
  assert.ok(L.hammerScale(cfg, 50000) < 8);
});

test('tiers follow the thresholds and stop at the last one', () => {
  const t = cfg.hammer.tiers;
  assert.equal(L.tierOf(cfg, 1), 0);
  assert.equal(L.tierOf(cfg, t[1]), 1);
  assert.equal(L.tierOf(cfg, t[1] - 0.01), 0);
  assert.equal(L.tierOf(cfg, 1e9), t.length - 1);
});

test('objects never overlap and stay inside their zone', () => {
  const R = L.createRun(cfg, L.rng(cfg.seed));
  for (const a of R.objects) {
    const Z = cfg.zones[a.zone];
    assert.ok(Math.abs(a.x) <= Z.w / 2 && Math.abs(a.z - Z.z) <= Z.d / 2, `${a.kind} inside zone`);
    for (const b of R.objects) if (a !== b && a.zone === b.zone) assert.ok(Math.hypot(a.x - b.x, a.z - b.z) >= a.r + b.r, `${a.kind}/${b.kind} apart`);
  }
});

test('a too-big object bonks and does not break', () => {
  const R = L.createRun(cfg, L.rng(1));
  const big = R.objects.find((o) => o.zone === 0 && o.req > R.L);
  const ev = L.slam(cfg, R, big.x, big.z);
  assert.ok(ev.some((e) => e.type === 'bonk' && e.id === big.id));
  assert.ok(big.alive);
});

test('a break grows the hammer by value x mult and keeps a combo', () => {
  const R = L.createRun(cfg, L.rng(1), 2);
  const small = R.objects.find((o) => o.zone === 0 && o.req === 1);
  const ev = L.slam(cfg, R, small.x, small.z);
  const gain = ev.filter((e) => e.type === 'break').reduce((s, e) => s + e.gain, 0);
  assert.ok(gain >= 2 && gain % 2 === 0, 'every gain doubled');
  assert.equal(R.L, 1 + gain);
  assert.equal(R.combo, 1);
  L.tick(cfg, R, cfg.growth.combo + 0.01);
  assert.equal(R.combo, 0, 'combo lapses');
});

test('only the current zone can be hit', () => {
  const R = L.createRun(cfg, L.rng(1));
  R.L = 1000;
  const far = R.objects.find((o) => o.zone === 1);
  L.slam(cfg, R, far.x, far.z);
  assert.ok(far.alive);
});

test('an object opens once when the hammer reaches its req', () => {
  const R = L.createRun(cfg, L.rng(1));
  const target = R.objects.find((o) => o.zone === 0 && o.req === 8);
  R.L = 7.5;
  const small = R.objects.find((o) => o.zone === 0 && o.req === 1 && Math.hypot(o.x - target.x, o.z - target.z) > 3);
  const ev = L.slam(cfg, R, small.x, small.z);
  assert.ok(ev.some((e) => e.type === 'open' && e.id === target.id));
  const ev2 = L.slam(cfg, R, small.x + 50, small.z);
  assert.ok(!ev2.some((e) => e.type === 'open' && e.id === target.id), 'not again');
});

test('clearing the last zone ends the run, and nothing breaks after', () => {
  const R = L.createRun(cfg, L.rng(1));
  R.L = 1e6;
  let guard = 0, done = false;
  while (!done && guard++ < 500) { const p = L.bestSlam(cfg, R); for (const e of L.slam(cfg, R, p.x, p.z)) if (e.type === 'done') done = true; }
  assert.ok(done && R.done);
  assert.deepEqual(L.slam(cfg, R, 0, 0), []);
});

/** Plays one run with the autopilot; returns the time each zone cleared. */
function sim(seed, mult = 1) {
  const R = L.createRun(cfg, L.rng(seed), mult), cleared = [];
  const dt = 0.5; // two taps a second
  while (!R.done && R.t < 300) {
    L.tick(cfg, R, dt);
    const p = L.bestSlam(cfg, R);
    if (!p) continue; // everything breakable is growing back: wait
    for (const e of L.slam(cfg, R, p.x, p.z)) if (e.type === 'clear') cleared.push(R.t);
  }
  return { cleared, R };
}

test('the autopilot always finishes, never stuck behind a too-big object', () => {
  for (let s = 1; s <= 20; s++) { const { R } = sim(s); assert.ok(R.done, `seed ${s} finishes (L ${R.L})`); }
});

test('timeline at two taps a second: a zone every 3-18 s, the whole run in 40-120 s', () => {
  for (let s = 1; s <= 20; s++) {
    const { cleared, R } = sim(s);
    assert.equal(cleared.length, cfg.zones.length, `seed ${s}: every zone clears`);
    cleared.forEach((t, i) => { const d = t - (cleared[i - 1] || 0); assert.ok(d >= 3 && d <= 18, `seed ${s}: zone ${i + 1} took ${d.toFixed(1)} s`); });
    assert.ok(R.t >= 40 && R.t <= 120, `seed ${s}: run took ${R.t.toFixed(1)} s`);
  }
});

test('the cake vault takes several hits, and its zone only clears when it breaks', () => {
  const R = L.createRun(cfg, L.rng(5));
  R.zone = cfg.zones.length - 1; R.L = 1e7;
  const vault = R.objects.find((o) => o.boss);
  const hits = [];
  for (let k = 0; k < vault.maxHp; k++) hits.push(...L.slam(cfg, R, vault.x, vault.z));
  assert.equal(hits.filter((e) => e.type === 'hit' && e.id === vault.id).length, vault.maxHp - 1, 'holds until the last hit');
  assert.ok(hits.some((e) => e.type === 'break' && e.id === vault.id) && hits.some((e) => e.type === 'done'));
});

test('small objects grow back in the current zone; numbered ones do not', () => {
  const R = L.createRun(cfg, L.rng(6));
  R.L = 20;
  const small = R.objects.find((o) => o.zone === 0 && o.req === 1), big = R.objects.find((o) => o.zone === 0 && o.req > 1);
  L.slam(cfg, R, small.x, small.z); L.slam(cfg, R, big.x, big.z);
  assert.ok(!small.alive && !big.alive);
  const back = L.tick(cfg, R, cfg.growth.respawn + 0.01);
  assert.ok(small.alive && back.includes(small.id), 'small grows back');
  assert.ok(!big.alive, 'numbered stays broken');
});

test('a rebirth (x2) run is faster', () => {
  assert.ok(sim(4, 2).R.slams <= sim(4, 1).R.slams);
});

test('the shockwave breaks small objects just outside the direct reach, never numbered ones', () => {
  const R = L.createRun(cfg, L.rng(2));
  R.L = 50;
  const r = L.reach(cfg, R.L), rs = r * cfg.growth.splash;
  const z0 = R.objects.filter((o) => o.zone === 0 && o.alive);
  // a spot where some small object sits in the splash ring only
  let spot = null, ring = null;
  for (const c of z0) for (const o of z0) {
    const d = Math.hypot(o.x - c.x, o.z - c.z);
    if (L.isSmall(o) && d > r + o.r * 0.6 + 0.05 && d < rs + o.r * 0.6 - 0.05) { spot = c; ring = o; break; }
    if (spot) break;
  }
  assert.ok(spot, 'a test spot exists');
  const big = z0.filter((o) => !L.isSmall(o) && Math.hypot(o.x - spot.x, o.z - spot.z) > r + o.r * 0.6);
  const ev = L.slam(cfg, R, spot.x, spot.z);
  assert.ok(ev.some((e) => e.type === 'break' && e.id === ring.id && e.splash), 'the small one in the ring breaks, marked splash');
  for (const o of big) assert.ok(o.alive, `${o.kind} outside the direct reach stays`);
});

test('every world finishes on the same timeline as Toy Town', () => {
  for (let w = 0; w < cfg.worlds.length; w++) {
    const wc = { ...cfg, zones: L.worldZones(cfg, cfg.zones, w) };
    for (const Z of wc.zones) for (const it of Z.items) assert.ok(wc.kinds[it.kind], `world ${cfg.worlds[w].id}: kind ${it.kind} has a size`);
    for (let s = 1; s <= 6; s++) {
      const R = L.createRun(wc, L.rng(s));
      while (!R.done && R.t < 300) { L.tick(wc, R, 0.5); const p = L.bestSlam(wc, R); if (p) L.slam(wc, R, p.x, p.z); }
      assert.ok(R.done && R.t >= 40 && R.t <= 120, `world ${cfg.worlds[w].id} seed ${s}: ${R.t.toFixed(1)} s`);
    }
  }
});

test('the daily goal is fixed for a day, changes type every day, and follows the local calendar', () => {
  const d0 = L.dayNumber(new Date(2026, 10, 25, 0, 5)), d1 = L.dayNumber(new Date(2026, 10, 25, 23, 55));
  assert.equal(d0, d1, 'same local day');
  assert.equal(L.dayNumber(new Date(2026, 10, 26, 0, 1)), d0 + 1, 'next day after midnight');
  assert.deepEqual(L.dailyGoal(cfg, d0), L.dailyGoal(cfg, d0));
  for (let d = d0; d < d0 + 60; d++) {
    const g = L.dailyGoal(cfg, d);
    assert.ok(cfg.daily.goals.some((x) => x.type === g.type && x.n === g.n));
    assert.notEqual(g.type, L.dailyGoal(cfg, d + 1).type, `day ${d}`);
  }
});

test('a cutscene path starts and ends on its first and last keys and moves smoothly between', () => {
  const keys = cfg.cine.intro.keys, T = L.cineLen(keys), first = L.cinePose(keys, 0), end = L.cinePose(keys, T);
  assert.deepEqual(first.pos, keys[0].pos); assert.deepEqual(end.pos, keys.at(-1).pos); assert.equal(end.fov, keys.at(-1).fov);
  // no jump bigger than the path allows in one 60 FPS frame, anywhere on the track
  let prev = first.pos.slice(), worst = 0;
  for (let t = 1 / 60; t <= T; t += 1 / 60) { const p = L.cinePose(keys, t).pos; worst = Math.max(worst, Math.hypot(p[0] - prev[0], p[1] - prev[1], p[2] - prev[2])); prev = p.slice(); }
  assert.ok(worst < 0.6, `largest step per frame ${worst.toFixed(3)}`);
  // eased: it leaves at rest
  const a = L.cinePose(keys, 1 / 60).pos; assert.ok(Math.hypot(a[0] - keys[0].pos[0], a[1] - keys[0].pos[1], a[2] - keys[0].pos[2]) < 0.01);
});

test('cutscenes fit the run budget: shorter when seen, none past the cap', () => {
  const C = cfg.cine, full = L.cineLen(C.world.keys);
  assert.equal(L.cineFit(cfg, full, false, 0), full);
  assert.equal(L.cineFit(cfg, full, true, 0), full * C.repeat);
  assert.equal(L.cineFit(cfg, full, false, C.maxPerRun - 1), 1);
  assert.equal(L.cineFit(cfg, full, false, C.maxPerRun - C.minLen / 2), 0);
  // a run opens with either the intro or the world fly-over, then plays every other track once; all of it fits
  const len = (id) => L.cineLen(C[id].keys), open = Math.max(len('intro'), len('world'));
  const all = Object.keys(C).filter((id) => C[id] && C[id].keys && id !== 'intro' && id !== 'world').reduce((s, id) => s + len(id), open);
  assert.ok(all <= C.maxPerRun, `all cutscenes ${all} s`);
});

test('adaptive quality lowers the render scale first, then the tier, and climbs back only when fast for a while', () => {
  const q = cfg.quality, slow = q.dropMs + 5, fast = q.upMs - 3;
  let s = { tier: q.start, rs: 1, okT: 0, fails: [] };
  const steps = Math.round((1 - q.resMin) / q.resStep);
  for (let i = 0; i < steps; i++) { s = L.adaptQuality(q, s, slow, 2); assert.equal(s.tier, q.start); }
  assert.equal(s.rs, q.resMin);
  s = L.adaptQuality(q, s, slow, 2); assert.equal(s.tier, q.start - 1); assert.equal(s.rs, 1);
  // a middling frame resets the fast streak; a long fast streak climbs back up step by step
  s = L.adaptQuality(q, s, (q.dropMs + q.upMs) / 2, 2); assert.equal(s.okT, 0);
  for (let i = 0; i < 100 && s.tier < q.start; i++) s = L.adaptQuality(q, s, fast, 2);
  assert.equal(s.tier, q.start); assert.equal(s.rs, q.resMin);
  // a tier that failed twice is not tried again
  s = { tier: q.start, rs: q.resMin, okT: 0, fails: [0, 0, 1] };
  s = L.adaptQuality(q, s, slow, 2); assert.equal(s.tier, q.start - 1);
  for (let i = 0; i < 100; i++) s = L.adaptQuality(q, s, fast, 2);
  assert.equal(s.tier, q.start - 1);
  // never below tier 0 at the lowest scale
  s = { tier: 0, rs: q.resMin, okT: 0, fails: [] }; s = L.adaptQuality(q, s, slow, 2); assert.equal(s.tier, 0); assert.equal(s.rs, q.resMin);
});
