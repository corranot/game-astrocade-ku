// PROTOTYPE - NOT FOR PRODUCTION
// Node tests for the pure parts: grid, ray, smashing, collapse, the building generators, the economy and whole
// levels played by the bot (the pilot: every level is finished, the vault needs a tool, nothing pays in the demo).
// Usage: node logic.test.mjs
import fs from 'fs';
import { createGrid, fill, raycast, smashSphere, collapse, meshRegion } from './voxels.js';
import { buildLevel, KINDS, matIds } from './levels.js';
import * as L from './logic.js';
import * as WD from './world.js';

const cfg = JSON.parse(fs.readFileSync(new URL('./game_config.json', import.meta.url)));
const fails = []; let n = 0;
const check = (ok, msg) => { n++; console.log((ok ? 'ok   ' : 'FAIL ') + msg); if (!ok) fails.push(msg); };
const mats = [null, ...cfg.materials], M = matIds(cfg);

// ---- voxels
{
  const g = createGrid(8, 8, 8); fill(g, 2, 0, 2, 4, 3, 4, 1);
  check(g.count() === 3 * 4 * 3, 'fill fills an inclusive box');
  const h = raycast(g, 0.5, 1.5, 3.5, 1, 0, 0, 20);
  check(h && h.x === 2 && h.nx === -1 && Math.abs(h.t - 1.5) < 1e-6, 'ray stops at the first block, entered through its -x face');
  check(raycast(g, 0.5, 6.5, 3.5, 1, 0, 0, 20) === null, 'ray over the blocks hits nothing');
  check(raycast(g, 0.5, 1.5, 3.5, 1, 0, 0, 20, 1) === null, 'cells at or above skipY (the cut-away) are passed through');
  // a tower on a thin leg: knocking out the leg drops the top as one piece
  const t = createGrid(8, 12, 8); fill(t, 3, 0, 3, 3, 4, 3, M.wood); fill(t, 1, 5, 1, 5, 7, 5, M.brick);
  const before = t.count();
  const res = smashSphere(t, 3.5, 2.5, 3.5, 0.6, mats, false);
  check(res.removed.length === 1, 'a small smash takes one block');
  const cl = collapse(t, res.removed);
  check(cl.length === 1 && cl[0].total === before - 1 - 2, 'the top and the upper leg fall as one piece; the ground stub stays');
  check(t.count() === 2, 'falling pieces leave the grid at once');
  const s = createGrid(6, 6, 6); fill(s, 0, 0, 0, 5, 2, 5, M.steel);
  const r2 = smashSphere(s, 3, 1, 3, 2, mats, false);
  check(r2.removed.length === 0 && r2.hard > 0, 'the hammer bounces off steel');
  check(smashSphere(s, 3, 1, 3, 2, mats, true).removed.length > 0, 'explosives break steel');
  const one = createGrid(3, 3, 3); one.set(1, 0, 1, M.brick);
  const mr = meshRegion(one.get, 0, 0, 0, 3, 3, 3, [null, ...cfg.materials.map(() => [1, 1, 1])], []);
  check(mr.faces === 5, 'a lone block on the ground shows 5 faces (the bottom is hidden)');
}

// ---- buildings
for (let lv = 0; lv < 24; lv++) {
  const a = buildLevel(cfg, lv), b = buildLevel(cfg, lv);
  const g = a.grid, all = [];
  for (let y = 0; y < g.H; y++) for (let z = 0; z < g.D; z++) for (let x = 0; x < g.W; x++) if (g.get(x, y, z)) all.push({ x, y, z, m: 0 });
  const total = g.count(), floating = collapse(g, all).reduce((s, c) => s + c.total, 0);
  const room = a.chest, roomOk = !b.grid.get(room.x - 1, 0, room.z - 1) && !b.grid.get(room.x, 1, room.z);
  const walls = [[-2, 0], [1, 0], [0, -2], [0, 1]].every(([dx, dz]) => b.grid.get(room.x + dx, 0, room.z + dz) === M.steel);
  const ok = floating === 0 && roomOk && walls && b.stars.length === 2 && b.stars.every((c) => b.grid.get(c.x, c.y, c.z) === M.star) && a.total === b.total && a.spawn.z < cfg.level.D && !b.grid.get(Math.floor(a.spawn.x), 0, Math.floor(a.spawn.z));
  if (!ok || lv < 8) check(ok, `level ${lv} (${a.kind}): ${total} blocks, nothing floats (${floating}), chest room empty in a steel vault, 2 star blocks, same every build, spawn clear`);
}
check(KINDS.length === 8, '8 kinds of building');

// ---- economy
{
  check(L.detectLang(['ar-EG', 'en'], ['en', 'ar']) === 'ar' && L.detectLang(['fr-FR'], ['en', 'ar']) === 'en', 'device language picked, unknown falls back to English');
  const c = L.createCombo(cfg); let m = 1; for (let i = 0; i < 20; i++) m = L.comboHit(c);
  check(m === cfg.combo.max, 'combo multiplier caps at max');
  L.comboTick(c, cfg.combo.window + 0.01); check(c.mult === 1 && c.k === 0, 'combo ends after its window');
  check(L.coinsFor(cfg, [{ m: M.brick }, { m: M.gold }], 2) === (5 + 250) * 2, 'coins = material values × multiplier');
  check(JSON.stringify(L.starsFor(cfg, 0.49)) === '[true,false,false]' && JSON.stringify(L.starsFor(cfg, 0.8)) === '[true,true,true]', 'trophies at 50% and 80% wrecked');
  check(L.levelBonus(cfg, 2, [true, true, true]) === 2 * (cfg.coins.level + 2 * cfg.coins.levelStep), 'level bonus doubles with both trophies');
  check(L.dailyDue(20261120, 20261121) && !L.dailyDue(20261121, 20261121) && !L.dailyDue(20261122, 20261121), 'daily gift: once a day, never for a clock turned back');
  check(L.nextTool(cfg, ['hammer', 'bomb'], 100).tool.id === 'rocket' && L.nextTool(cfg, cfg.tools.map((t) => t.id), 0) === null, 'next tool is the cheapest locked one');
  check(L.cooldownOf(cfg, 'bomb', true) < L.cooldownOf(cfg, 'bomb', false), 'smash time cuts cooldowns');
}

// ---- upgrades and the daily challenge
{
  const t = cfg.tools.find((x) => x.id === 'bomb'), a = L.toolAt(cfg, t, 1), b = L.toolAt(cfg, t, 5);
  check(a.r === t.r && b.r > t.r * 1.4 && b.cd < t.cd, `upgrades grow a tool (bomb r ${a.r} → ${b.r}, cd ${a.cd} → ${b.cd})`);
  check(L.upgradeCost(cfg, 'bomb', 1) < L.upgradeCost(cfg, 'bomb', 4) && L.upgradeCost(cfg, 'bomb', 5) === null, 'upgrade prices climb and stop at the top level');
  const W = WD.createWorld(cfg, 0, { lv: { hammer: 5 }, coinMult: 2 });
  check(W.cfg.tools[0].r > cfg.tools[0].r && cfg.tools[0].r === 1.45, 'a world uses the upgraded tools without changing the config');
  const DB = WD.createWorld(cfg, 34, { daily: true, coinMult: 2 }), BB = WD.createWorld(cfg, 34, {});
  check(DB.coinMult === 2 && !DB.boss && BB.boss && BB.coinMult === 2, `a daily on a boss building pays ×2, not ×4 (daily ${DB.coinMult}, boss ${BB.coinMult})`);
  check(L.dailyLevel(cfg, 20261121) !== L.dailyLevel(cfg, 20261122) && L.dailyLevel(cfg, 20261121) >= 8 * cfg.level.maxStep, 'the daily building changes each day and is a big one');
}

// ---- the world, played
function play(lv, opts = {}, secs = 60, tap = WD.botTap) {
  const W = WD.createWorld(cfg, lv, opts); let t = 0, tt = 0; const seen = new Set(); let feverAt = null, coinsDemo = 0;
  while (t < secs && W.phase !== 'free') {
    if ((tt -= 1 / 60) <= 0) { tt = 0.25; const b = tap(W); if (b) { if (b.tool === 'hammer') WD.aimHammer(W, b.t, true); else WD.useTool(W, b.tool, b.p); } }
    for (const e of WD.step(W, 1 / 60)) { seen.add(e.type); if (e.type === 'fever') feverAt = t; if (W.demo) coinsDemo += e.coins || 0; }
    t += 1 / 60;
  }
  return { W, seen, feverAt, t, coinsDemo };
}
{
  const times = [];
  for (let lv = 0; lv < 16; lv++) { const r = play(lv); times.push(r.feverAt); if (r.feverAt === null) check(false, `bot finishes level ${lv} (${r.W.kind})`); }
  check(times.every((x) => x !== null), `the bot finds all 3 stars on 16 levels (${times.map((x) => x && x.toFixed(1)).join(', ')} s)`);
  const r = play(0, {}, 30);
  check(r.seen.has('fall') && r.seen.has('land'), 'pieces lose their support, fall and shatter');
  check(r.W.phase === 'free' && r.seen.has('clear'), 'smash time ends in the free phase (NEXT shows)');
  // hammer only: the vault never opens
  const ham = play(0, {}, 40, (W) => ({ tool: 'hammer', t: { type: 'chest' } }));
  check(ham.W.chest.open && ham.seen.has('tooHard') && ham.seen.has('super'), 'the hammer bounces off steel (TOO HARD), then SUPER HAMMER breaks it: no child stays stuck');
  const d = play(0, { demo: true }, 20);
  check(d.coinsDemo === 0 && d.W.coins === 0 && d.W.phase === 'play', 'the demo never pays and never starts smash time');
}
{
  const W = WD.createWorld(cfg, 0, { owned: ['hammer', 'bomb'] }), p = { x: 18, y: 1, z: 10 };
  check(WD.useTool(W, 'rocket', p) === true, 'a locked tool has one free try');
  W.cool.rocket = 0;
  check(WD.useTool(W, 'rocket', p) === false, '...and only one per level');
  check(WD.useTool(W, 'bomb', p) === true && WD.useTool(W, 'bomb', p) === false, 'a used tool cools down');
  W.fever = 5; W.phase = 'fever'; W.cool.rocket = 0;
  check(WD.useTool(W, 'rocket', p) === true, 'smash time lends locked tools');
  // every flight ends and the shots list empties
  const V = WD.createWorld(cfg, 2, { owned: cfg.tools.map((t) => t.id) });
  for (const t of ['bomb', 'rocket', 'ball', 'hole', 'meteor']) WD.useTool(V, t, { x: 18, y: 2, z: 12 });
  const kinds = new Set(); for (let i = 0; i < 60 * 6; i++) for (const e of WD.step(V, 1 / 60)) if (e.type === 'boom' || e.type === 'pop') kinds.add(e.kind);
  check(V.shots.length === 0 && ['bomb', 'rocket', 'meteor', 'ball', 'hole'].every((k) => kinds.has(k)), 'all five throwables fly, act and finish');
  check(V.left === V.g.count() + V.falls.reduce((a, f) => a + f.total, 0) || V.left === V.g.count(), 'blocks left matches the grid');
}

// ---- TNT chains and tipping towers
{
  const W = WD.createWorld(cfg, 0, {});
  check(W.tntCells.length >= 3 && W.tntCells.every((c) => W.g.get(c.x, c.y, c.z) === M.tnt), `TNT blocks placed (${W.tntCells.length}), one in front of the building`);
  // put two TNT side by side in the open and hit one: both go off
  const g = W.g; g.set(2, 0, 30, M.tnt); g.set(4, 0, 30, M.tnt);
  WD.useTool(W, 'bomb', { x: 2.5, y: 0.5, z: 30.5 });
  const booms = []; for (let i = 0; i < 90; i++) for (const e of WD.step(W, 1 / 30)) if (e.type === 'boom') booms.push(e.kind);
  check(booms.filter((k) => k === 'tnt').length >= 2, `one blast sets off the TNT next to it (${booms.join(',')})`);
  W.cool.bomb = 0; WD.useTool(W, 'bomb', { x: W.box.x0 + 3.5, y: 1.5, z: W.box.z1 + 0.5 }); for (let i = 0; i < 40; i++) WD.step(W, 1 / 30);
  check(g.scorch && g.scorch.some((v) => v > 0), 'blasts leave scorch marks on the blocks around them');
  // the lighthouse: knock out a ring at its base and the tower tips over
  const L = WD.createWorld(cfg, 3, {}), cx = (L.box.x0 + L.box.x1) / 2 + 0.5, cz = L.box.z0 + 6.5;
  const removed = [];
  for (let z = Math.floor(cz - 6); z <= cz + 6; z++) for (let x = Math.floor(cx - 6); x <= cx + 6; x++) for (let y = 0; y < 2; y++) { const m = L.g.get(x, y, z); if (m && Math.hypot(x + 0.5 - cx, z + 0.5 - cz) < 5) { L.g.set(x, y, z, 0); removed.push({ x, y, z, m }); } }
  const ev = []; WD.useTool(L, 'bomb', { x: cx, y: 2.5, z: cz + 3.5 }); // a real blast into the cut tower runs the collapse check
  for (let i = 0; i < 150; i++) for (const e of WD.step(L, 1 / 30)) ev.push(e);
  const top = ev.find((e) => e.type === 'topple'), landed = ev.find((e) => e.type === 'land' && e.topple);
  check(!!top && !!landed, `the cut lighthouse tips over its base and lands (${top ? 'tipped' : 'no topple'}, ${landed ? 'landed' : 'no landing'})`);
  if (top) { const f = top.fall, c = f.cells.reduce((a, b) => (b.y > a.y ? b : a)); f.th = 1.35; const p = WD.placeOf(f, c); check(p[1] < c.y * 0.5, `a tipped piece lies down (top block y ${c.y} → ${p[1].toFixed(1)})`); }
}

// ---- the child pilot: walks with the stick (only the stick walks), heading roughly (±0.6 rad) at what matters,
// holds HIT at what blocks the way, taps shining stars now and then, hesitates, bombs only half the time it is told to
{
  const { rng } = await import('./levels.js');
  function childPlan(r) {
    return (W) => {
      if (W.t > 1 && r() < 0.25) return { idle: true }; // looking around, thinking (never on the very first touch)
      const shining = W.starCells.filter((c) => W.g.get(c.x, c.y, c.z) === W.ids.star);
      if (shining.length && r() < 0.3) return { star: shining[Math.floor(r() * shining.length)] };
      const lh = W.lastHard;
      if (lh && W.t - lh.t < 3 && (W.cool.bomb || 0) <= 0 && r() < 0.5) return { bomb: { x: lh.x + 0.5, y: lh.y + 0.5, z: lh.z + 0.5 } };
      const aim = !W.chest.open || !shining.length ? { x: W.chest.x, y: 1, z: W.chest.z } : shining[Math.floor(r() * shining.length)];
      return { aim, wobble: (r() - 0.5) * 1.2 };
    };
  }
  /** What the crosshair shows straight ahead in reach (low rows first), the block HIT swings at. */
  function ahead(W, ux, uz) {
    const h = W.hero;
    for (let s = 0.6; s <= cfg.hero.reach - 0.3; s += 0.3) for (let y = 0; y < 3; y++) { const x = Math.floor(h.x + ux * s), z = Math.floor(h.z + uz * s); if (W.g.get(x, y, z)) return { x, y, z }; }
    return null;
  }
  const res = [];
  for (let lv = 0; lv < 16; lv++) for (let seed = 1; seed <= 3; seed++) {
    const r = rng(seed * 101 + lv), plan = childPlan(r), W = WD.createWorld(cfg, lv, {});
    let t = 0, tt = 0, first = null, lastSmash = 0, gap = 0, fever = null, cur = { idle: true };
    while (t < 240 && fever === null) {
      if ((tt -= 1 / 30) <= 0) { tt = 0.4 + r(); cur = plan(W); if (cur.star) WD.starShot(W, cur.star); if (cur.bomb) WD.useTool(W, 'bomb', cur.bomb); }
      WD.setMove(W, 0, 0);
      if (cur.aim) {
        const h = W.hero, a = Math.atan2(cur.aim.x + 0.5 - h.x, cur.aim.z + 0.5 - h.z) + cur.wobble, ux = Math.sin(a), uz = Math.cos(a);
        const b = ahead(W, ux, uz);
        if (b) WD.hitBlock(W, b); else if (Math.hypot(cur.aim.x + 0.5 - h.x, cur.aim.z + 0.5 - h.z) > 0.8) WD.setMove(W, ux, uz);
      }
      for (const e of WD.step(W, 1 / 30)) { if (e.type === 'smash' || e.type === 'land') { if (first === null) first = t; gap = Math.max(gap, t - lastSmash); lastSmash = t; } if (e.type === 'fever') fever = t; }
      t += 1 / 30;
    }
    res.push({ lv, kind: W.kind, first, gap, fever });
  }
  const done = res.filter((x) => x.fever !== null), p50 = done.map((x) => x.fever).sort((a, b) => a - b)[Math.floor(done.length / 2)];
  console.log(`  child pilot: ${done.length}/${res.length} runs reach smash time, median ${p50 && p50.toFixed(0)} s, slowest ${Math.max(...done.map((x) => x.fever)).toFixed(0)} s, worst idle gap ${Math.max(...res.map((x) => x.gap)).toFixed(1)} s`);
  const stuck = res.filter((x) => x.fever === null).map((x) => `${x.lv}:${x.kind}`);
  check(done.length >= res.length * 0.9, `child pilot: at least 90% of runs find all 3 stars within 4 min${stuck.length ? ' (stuck: ' + stuck.join(', ') + ')' : ''}`);
  check(res.every((x) => x.first !== null && x.first < 3), 'child pilot: the first smash comes within 3 s on every level');
}

// ---- the player's taps never walk: a far block is not aimed at, a block in reach is swung at in place
{
  const W = WD.createWorld(cfg, 0, {}), h = W.hero, x0 = h.x, z0 = h.z;
  WD.aimHammer(W, { type: 'block', x: Math.floor(W.chest.x), y: 1, z: W.box.z1, nx: 0, ny: 0, nz: 1 }, false, false);
  for (let i = 0; i < 60; i++) WD.step(W, 1 / 30);
  check(Math.hypot(h.x - x0, h.z - z0) < 0.01 && !h.goal && !h.aim, 'a tap on a far block: the hero stays where it is');
  WD.aimHammer(W, { type: 'ground', x: x0 + 5, z: z0 - 5 }, false, false); WD.aimHammer(W, { type: 'chest' }, false, false);
  for (let i = 0; i < 60; i++) WD.step(W, 1 / 30);
  check(Math.hypot(h.x - x0, h.z - z0) < 0.01, 'a tap on the ground or the chest: the hero stays where it is');
  const W2 = WD.createWorld(cfg, 0, {}), h2 = W2.hero; let c = null;
  for (let z = Math.floor(h2.z) - 1; z > h2.z - 3 && !c; z--) for (let x = Math.floor(h2.x) - 1; x <= h2.x + 1 && !c; x++) if (W2.g.get(x, 1, z)) c = { x, y: 1, z };
  if (!c) { c = { x: Math.floor(h2.x), y: 1, z: Math.floor(h2.z) - 2 }; W2.g.set(c.x, c.y, c.z, W2.ids.wood || 1); }
  const before = [h2.x, h2.z], ev = [];
  WD.aimHammer(W2, { type: 'block', ...c, nx: 0, ny: 0, nz: 1 }, false, false);
  for (let i = 0; i < 30; i++) ev.push(...WD.step(W2, 1 / 30));
  check(ev.some((e) => e.type === 'hit') && Math.hypot(h2.x - before[0], h2.z - before[1]) < 0.01, 'a tap on a block in reach: one swing, no step taken');
  // walking with the stick while holding on a block in reach: the hammer keeps swinging (walking once dropped the aim)
  const W3 = WD.createWorld(cfg, 0, {}), h3 = W3.hero, c3 = { x: Math.floor(h3.x), y: 1, z: Math.floor(h3.z) - 2 };
  W3.g.set(c3.x, c3.y, c3.z, 1); const ev3 = [];
  for (let i = 0; i < 30; i++) { WD.setMove(W3, 0.3, 0); WD.aimHammer(W3, { type: 'block', ...c3, nx: 0, ny: 0, nz: 1 }, true, false); ev3.push(...WD.step(W3, 1 / 30)); }
  check(ev3.some((e) => e.type === 'hit') && h3.x > c3.x + 0.5, 'walking with the stick while holding a block in reach: it is smashed on the way');
}

console.log(fails.length ? `\n${fails.length} of ${n} FAILED` : `\nall ${n} passed`);
process.exit(fails.length ? 1 : 0);
