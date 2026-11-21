// PROTOTYPE - NOT FOR PRODUCTION
// Rules of Jelly Bump Party: node --test logic.test.mjs
// Includes simulated players (a child tapping at random, a player who aims) against three computer blobs.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as L from './logic.js';

const cfg = JSON.parse(fs.readFileSync(new URL('./game_config.json', import.meta.url)));
const DT = 1 / 60;

/** Plays rounds with seat 0 driven by `pilot(M, b, t)` returning true while its button is down. */
function sim(seed, pilot, rounds, opts = {}) {
  const M = L.createMatch(cfg, L.rng(seed), pilot ? [0] : [], opts);
  let wins = 0, done = 0, t = 0, roundT = 0, longest = 0, firstOut = 0, down = false;
  const lengths = [];
  while (done < rounds && t < rounds * 60) {
    t += DT; roundT += DT;
    if (pilot && M.phase === 'play') { const want = pilot(M, M.blobs[0], t); if (want !== down) { L.setHold(M, 0, want); down = want; } } else if (down) { L.setHold(M, 0, false); down = false; }
    for (const e of L.step(M, DT)) {
      if (e.type === 'out' && M.outOrder.length === 1 && e.seat === 0) firstOut++;
      if (e.type === 'roundEnd') { done++; if (e.winner === 0) wins++; lengths.push(roundT); longest = Math.max(longest, roundT); }
      if (e.type === 'round' || (e.type === 'roundEnd' && e.done)) roundT = 0;
    }
    if (M.phase === 'done' && M.timer <= 0) { const keep = M.blobs.map((b) => b.human); Object.assign(M, L.createMatch(cfg, M.random, keep.flatMap((h, i) => (h ? [i] : [])))); }
  }
  lengths.sort((a, b) => a - b);
  return { wins, done, longest, median: lengths[lengths.length >> 1], firstOut };
}

const tapper = () => { let next = 0, until = 0; return (M, b, t) => { if (t > next) { until = t + 0.08; next = t + 0.25 + Math.abs(Math.sin(t * 12.9898) * 0.45); } return t < until; }; };
const aimer = () => { let release = 0; return (M, b, t) => {
  if (b.holding) return t < release;
  if (b.cool > 0) return false;
  for (const o of M.blobs) {
    if (o === b || o.out) continue;
    const dx = o.x - b.x, dz = o.z - b.z, d = Math.hypot(dx, dz); let a = b.ang - Math.atan2(dz, dx);
    while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI;
    if (Math.abs(a) < 0.28 && d < 6) { release = t + Math.min(cfg.blob.chargeTime, 0.25 + d / 8); return true; }
  }
  return false;
}; };

test('same seed, same match', () => {
  const a = sim(7, tapper(), 20), b = sim(7, tapper(), 20);
  assert.deepEqual(a, b);
});

test('every round ends: the floor shrinks and nobody can stall', () => {
  const r = sim(3, null, 200);
  assert.equal(r.done, 200);
  assert.ok(r.longest < cfg.arena.shrinkAt + cfg.arena.shrinkTime + 8, `longest round ${r.longest.toFixed(1)} s`);
  assert.ok(r.median < 16, `median round ${r.median.toFixed(1)} s`);
});

test('a child tapping at random still wins rounds; a player who aims wins most', () => {
  const kid = sim(11, tapper(), 300), good = sim(11, aimer(), 300);
  console.log(`  tapper ${(kid.wins / kid.done * 100).toFixed(0)}% (out first ${(kid.firstOut / kid.done * 100).toFixed(0)}%), aimer ${(good.wins / good.done * 100).toFixed(0)}%, median round ${good.median.toFixed(1)} s`);
  assert.ok(kid.wins / kid.done >= 0.3, 'tapper wins at least 30% of rounds');
  assert.ok(good.wins / good.done >= 0.4, 'aimer wins at least 40% of rounds');
  assert.ok(kid.firstOut / kid.done <= 0.3, 'tapper is not usually the first one out');
});

test('easy first round: computer blobs are worse at it', () => {
  let easyWins = 0, hardWins = 0;
  for (let s = 1; s <= 120; s++) {
    for (const easy of [true, false]) {
      const M = L.createMatch(cfg, L.rng(s), [0], { easy }); const pilot = tapper(); let t = 0, down = false;
      while (M.phase !== 'over' && M.phase !== 'done' && t < 40) { t += DT; if (M.phase === 'play') { const w = pilot(M, M.blobs[0], t); if (w !== down) { L.setHold(M, 0, w); down = w; } } L.step(M, DT); }
      if (M.winner === 0) { if (easy) easyWins++; else hardWins++; }
    }
  }
  assert.ok(easyWins > hardWins, `easy ${easyWins} vs normal ${hardWins}`);
});

test('holding stops the aim, letting go dashes along it; a press before GO does nothing', () => {
  const M = L.createMatch(cfg, L.rng(1), [0, 1]);
  L.setHold(M, 0, true); L.setHold(M, 0, false);
  for (const e of L.step(M, DT)) assert.notEqual(e.type, 'dash');
  while (M.phase !== 'play') L.step(M, DT);
  const b = M.blobs[0];
  for (const o of M.blobs) if (o !== b) o.out = true, o.fall = 1; // alone: no bumps, no AI
  M.blobs[1].out = false; M.blobs[1].fall = 0; M.blobs[1].x = -3; M.blobs[1].z = -3; // a still human blob keeps the round going
  b.x = 0; b.z = 0;
  L.setHold(M, 0, true); const a0 = b.ang;
  for (let i = 0; i < 20; i++) L.step(M, DT);
  assert.equal(b.ang, a0, 'aim frozen while held');
  L.setHold(M, 0, false); const ev = L.step(M, DT);
  assert.ok(ev.some((e) => e.type === 'dash' && e.seat === 0 && e.power > 0.4));
  assert.ok(Math.cos(a0) * b.vx + Math.sin(a0) * b.vz > 5, 'moves along the aim');
});

test('a blob pushed off counts as a knock-out for the pusher, not in the demo', () => {
  for (const demo of [false, true]) {
    const M = L.createMatch(cfg, L.rng(2), [0, 1], { demo });
    while (M.phase !== 'play') L.step(M, DT);
    const [a, b] = M.blobs; M.blobs[2].x = M.blobs[3].x = -99; M.blobs[2].out = M.blobs[3].out = true; M.blobs[2].fall = M.blobs[3].fall = 1;
    a.x = 2.6; a.z = 0; b.x = 3.8; b.z = 0; a.vx = 12; b.vx = 0; a.vz = b.vz = 0;
    let out = null; for (let i = 0; i < 120 && !out; i++) out = L.step(M, DT).find((e) => e.type === 'out');
    assert.ok(out && out.seat === 1 && out.by === 0);
    assert.equal(M.blobs[0].kos, demo ? 0 : 1);
  }
});

test('the last blob standing gets a crown; three crowns end the match', () => {
  const M = L.createMatch(cfg, L.rng(4), []);
  let ends = 0;
  for (let i = 0; i < 60 * 400 && M.phase !== 'done'; i++) for (const e of L.step(M, DT)) if (e.type === 'roundEnd') ends++;
  assert.equal(M.phase, 'done');
  assert.equal(M.blobs[M.matchWinner].crowns, cfg.match.crowns);
  assert.ok(ends >= cfg.match.crowns);
  const st = L.standings(M); assert.equal(st[0].seat, M.matchWinner); assert.equal(st[0].place, 1);
});

test('standings share places on equal crowns and knock-outs', () => {
  const M = L.createMatch(cfg, L.rng(1), []);
  M.blobs.forEach((b, i) => { b.crowns = i < 2 ? 2 : 0; b.kos = 1; });
  const st = L.standings(M);
  assert.deepEqual(st.map((s) => s.place), [1, 1, 3, 3]);
});

test('coins and the next hat', () => {
  assert.equal(L.coinsFor(cfg, { kos: 2, crowns: 3 }, true), cfg.coins.play + 2 * cfg.coins.ko + 3 * cfg.coins.round + cfg.coins.match);
  assert.ok(L.coinsFor(cfg, { kos: 0, crowns: 0 }, false) > 0, 'a match with nothing won still pays');
  const n = L.nextHat(cfg, ['party'], 5); assert.equal(n.hat.id, 'crown'); assert.equal(n.have, 5);
  assert.equal(L.nextHat(cfg, cfg.hats.map((h) => h.id), 999), null);
});

test('power-ups appear and make a blob giant or super', () => {
  const M = L.createMatch(cfg, L.rng(9), []);
  let got = null;
  for (let i = 0; i < 60 * 60 && !got; i++) { got = L.step(M, DT).find((e) => e.type === 'power'); if (M.phase === 'over') L.step(M, 5); }
  assert.ok(got, 'someone picked one up');
});

test('language: device order, fallback English', () => {
  const langs = ['en', 'ar', 'es', 'vi', 'hi', 'bn', 'id'];
  assert.equal(L.detectLang(['fr-FR', 'id-ID'], langs), 'id');
  assert.equal(L.detectLang(['ja'], langs), 'en');
  for (const l of langs) for (const k of Object.keys(cfg.strings.en)) assert.ok(cfg.strings[l][k], `${l}.${k}`);
});

test('a tap during the dash cooldown still dashes once the cooldown ends', () => {
  const M = L.createMatch(cfg, L.rng(1), [0, 1]);
  while (M.phase !== 'play') L.step(M, DT);
  for (const o of M.blobs.slice(2)) { o.out = true; o.fall = 1; }
  const b = M.blobs[0]; b.x = 0; b.z = 0; M.blobs[1].x = -3; M.blobs[1].z = -6;
  L.setHold(M, 0, true); L.setHold(M, 0, false); L.step(M, DT);
  assert.ok(b.cool > 0, 'first tap dashed');
  L.setHold(M, 0, true); L.setHold(M, 0, false); // second tap inside the cooldown
  let dashes = 0; for (let i = 0; i < 30; i++) dashes += L.step(M, DT).filter((e) => e.type === 'dash' && e.seat === 0).length;
  assert.equal(dashes, 1);
});

test('a button held during the countdown stops that blob\'s aim', () => {
  const M = L.createMatch(cfg, L.rng(1), [0], { firstGo: 1 });
  L.setHold(M, 0, true); const a0 = M.blobs[0].ang, o0 = M.blobs[1].ang;
  for (let i = 0; i < 20; i++) L.step(M, DT);
  assert.equal(M.blobs[0].ang, a0); assert.notEqual(M.blobs[1].ang, o0);
});

