// PROTOTYPE - NOT FOR PRODUCTION
// Node tests for the pure parts: grid, ray, smashing, collapse, the building generators, the economy and whole
// levels played by the bot (the pilot: every level is finished, the vault needs a tool, nothing pays in the demo).
// Usage: node logic.test.mjs
import fs from 'fs';
import { createGrid, fill, raycast, smashSphere, collapse, weakLayer, meshRegion, remeshNearest } from './voxels.js';
import { buildLevel, KINDS, matIds } from './levels.js';
import * as L from './logic.js';
import * as WD from './world.js';
import { knock as knockBot } from './bots.js';

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
  // aaa2: the big moments grow with what the building earned, the daily gift with the next thing to buy
  {
    const C = cfg.coins, st = [true, true, true], base = L.levelBonus(cfg, 2, st), big = 200000, all = cfg.tools.map((t) => t.id);
    check(L.levelBonus(cfg, 2, st, 0) === base && L.levelBonus(cfg, 2, st, base) === base && L.levelBonus(cfg, 2, st, big) === Math.round(C.levelShare * big) && Math.round(C.levelShare * big) > base, `level bonus = max(base, coins.levelShare ${C.levelShare} × the building's coins) (${L.levelBonus(cfg, 2, st, big)} for ${big})`);
    check(typeof L.flatBonus === 'function' && L.flatBonus(cfg, 0, 1) === C.flat && L.flatBonus(cfg, 0, 2) === 2 * C.flat && L.flatBonus(cfg, big, 1) === Math.round(C.flatShare * big) && Math.round(C.flatShare * big) > C.flat, `flattened bonus = max(coins.flat × the level's multiplier, coins.flatShare ${C.flatShare} × the building's coins)`);
    const goal = typeof L.nextGoal === 'function' ? L.nextGoal : () => null, rocket = cfg.tools.find((t) => t.id === 'rocket');
    const g1 = goal(cfg, ['hammer', 'bomb'], {}, 100), g2 = goal(cfg, all, { hammer: 7 }, 1e9), g3 = goal(cfg, all, Object.fromEntries(all.map((id) => [id, cfg.upgrade.max])), 5);
    check(g1 && g1.kind === 'tool' && g1.tool.id === 'rocket' && g1.need === rocket.cost && g1.have === 100, 'the next goal is the cheapest locked tool while one is locked');
    check(g2 && g2.kind === 'up' && g2.tool.id === 'bomb' && g2.lv === 1 && g2.need === L.upgradeCost(cfg, 'bomb', 1) && g2.have === g2.need, `...then the cheapest upgrade (${g2 && g2.tool.id} Lv ${g2 && g2.lv} for ${g2 && g2.need})`);
    check(g3 === null, '...and nothing when every tool is at the top level');
    const gift = typeof L.dailyGift === 'function' ? L.dailyGift : () => -1, meteor = cfg.tools.find((t) => t.id === 'meteor');
    check(gift(cfg, ['hammer', 'bomb'], {}) === Math.max(C.daily, Math.round(C.dailyShare * rocket.cost)) && gift(cfg, all.filter((id) => id !== 'meteor'), {}) === Math.round(C.dailyShare * meteor.cost) && Math.round(C.dailyShare * meteor.cost) > C.daily, `daily gift = max(coins.daily, coins.dailyShare ${C.dailyShare} × the next price) (${gift(cfg, all.filter((id) => id !== 'meteor'), {})} before the meteor)`);
    check(gift(cfg, all, Object.fromEntries(all.map((id) => [id, cfg.upgrade.max]))) === C.daily, '...and coins.daily when nothing is left to buy');
    // (hunt 6: at high levels a tenth of the next price was more than the whole wallet: 17,000,000 at level 29)
    const late = gift(cfg, all, Object.fromEntries(all.map((id) => [id, cfg.upgrade.max - 1])));
    check(late <= C.dailyCap && late >= C.daily, `...and never more than coins.dailyCap (${late} of ${C.dailyCap})`);
    check(Number.isFinite(L.levelBonus(cfg, 0, [true, false, false], NaN)) && Number.isFinite(L.flatBonus(cfg, NaN, 1)) && Number.isFinite(L.flatBonus(cfg, undefined, 1)), 'a broken earned figure never makes a bonus NaN');
  }
  check(L.cooldownOf(cfg, 'bomb', true) < L.cooldownOf(cfg, 'bomb', false), 'smash time cuts cooldowns');
}

// ---- upgrades and the daily challenge
{
  const U = cfg.upgrade, t = cfg.tools.find((x) => x.id === 'bomb'), a = L.toolAt(cfg, t, 1), b = L.toolAt(cfg, t, 5), top = L.toolAt(cfg, t, U.max);
  check(a.r === t.r && a.power === 1 && b.r > t.r * 1.3 && b.cd < t.cd && top.r <= t.r * (1 + U.rGain) + 1e-6 && top.cd >= t.cd * (1 - U.cdGain) - 1e-6, `upgrades grow a tool with smaller steps, never past the cap (bomb r ${a.r} → ${b.r} → ${top.r}, cd ${a.cd} → ${b.cd} → ${top.cd})`);
  check(Math.abs(L.toolAt(cfg, t, 2).power - U.power) < 1e-3 && Math.abs(L.toolAt(cfg, t, 11).power - L.toolAt(cfg, t, 10).power - (U.power - 1)) < 1e-3, `level 2 earns ×${U.power} with the tool, each level after adds ${(U.power - 1).toFixed(1)}`);
  check(U.max >= 20 && U.max <= 50 && L.upgradeCost(cfg, 'bomb', U.max) === null && L.upgradeCost(cfg, 'bomb', U.max - 1) > 0, `the top level is ${U.max} (20–50), with no price there`);
  const firsts = cfg.tools.map((x) => L.upgradeCost(cfg, x.id, 1)), ratio = L.upgradeCost(cfg, 'hammer', 11) / L.upgradeCost(cfg, 'hammer', 10);
  check(Math.abs(ratio - U.growth) < 0.06 && firsts.every((c, i) => i === 0 || c >= firsts[i - 1]), `prices c0 · ${U.growth}^lv (×${ratio.toFixed(2)} a level), the bigger tools cost more (${firsts.join(', ')})`);
  check(L.clampLv(cfg, 5) === 5 && L.clampLv(cfg, 3.7) === 3 && L.clampLv(cfg, 999) === U.max && L.clampLv(cfg, 'x') === 1 && L.clampLv(cfg, -2) === 1, 'an old save keeps its levels (5 stays 5); junk and huge levels are clamped');
  check(L.toolAt(cfg, t, 5).r === L.toolAt(cfg, t, '5').r && L.upgradeCost(cfg, 'bomb', 5) === L.nicePrice(U.c0.bomb * Math.pow(U.growth, 4)), 'an old level 5 bomb prices its next step from level 5');
  check(L.nicePrice(12.4) === 12 && L.nicePrice(345) === 350 && L.nicePrice(4123) === 4100, 'prices round to two leading digits');
  const cheapest = Math.min(...cfg.tools.map((x) => (['hammer', 'bomb'].includes(x.id) ? L.upgradeCost(cfg, x.id, 1) : x.cost)));
  check(L.canBuy(cfg, ['hammer', 'bomb'], {}, cheapest) && !L.canBuy(cfg, ['hammer', 'bomb'], {}, cheapest - 1), `the "!" shows exactly when the cheapest thing is affordable (${cheapest})`);
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
  // smash time now lasts while the player keeps smashing (up to fever.maxTotal): the run needs more room than 30 s
  const r = play(0, {}, 70);
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
  // the meteor comes in at a slant from ahead of the hero (its tool's `from`: ahead of the target, up, to the right), or on the hero's side of the
  // target when blocks hide that fall (`from.near`, in shares of the distance), and still lands on the target after 0.9 s
  {
    const M = WD.createWorld(cfg, 2, { owned: cfg.tools.map((t) => t.id) }), F = cfg.tools.find((t) => t.id === 'meteor').from, q = { x: M.hero.x, y: 2, z: M.hero.z + 10 };
    WD.useTool(M, 'meteor', q); const s = M.shots.find((x) => x.kind === 'meteor') || {}, near = (u, v) => Math.abs(u - v) < 1e-6;
    let at = null; for (let i = 1; i <= 80 && !at; i++) for (const e of WD.step(M, 1 / 60)) if (e.type === 'boom' && e.kind === 'meteor') at = [i / 60, e.x, e.y, e.z];
    const far = near(s.sx, q.x - F.side) && near(s.sy, q.y + F.up) && near(s.sz, q.z + F.ahead), n = Math.max(10, F.near.min), close = near(s.sx, q.x - n * F.near.side) && near(s.sy, q.y + n * F.near.up) && near(s.sz, q.z - n * F.near.back);
    check((far || close) && F.ahead > 0 && F.up > 0 && F.near.up > 0, `the meteor starts ${far ? `${F.ahead} ahead of its target, ${F.up} up, ${F.side} to the right` : `on the hero's side of its target (blocks hide the far start), ${n * F.near.up} up`}`);
    // a wall across the far start's fall: the near start; no blocks at all: the far start
    const eye = M.hero.z, wall = (on) => { for (let x = 0; x < M.g.W; x++) for (let y = 0; y < M.g.H; y++) M.g.set(x, y, Math.floor(eye + 12), on); };
    const startOf = () => { M.cool.meteor = 0; WD.useTool(M, 'meteor', q); return M.shots[M.shots.length - 1]; };
    for (let x = 0; x < M.g.W; x++) for (let y = 0; y < M.g.H; y++) for (let z = 0; z < M.g.D; z++) M.g.set(x, y, z, 0);
    const open = startOf(); wall(1); const hid = startOf();
    check(near(open.sz, q.z + F.ahead) && near(hid.sz, q.z - n * F.near.back) && near(hid.sy, q.y + n * F.near.up), `...far in front over open ground (z +${F.ahead}), on the hero's side behind a wall (z -${n * F.near.back})`);
    check(at && Math.abs(at[0] - 0.9) < 0.04 && near(at[1], q.x) && near(at[2], q.y) && near(at[3], q.z), `...and lands on the target after 0.9 s (${at && at[0].toFixed(2)} s)`);
  }
  check(V.left === V.g.count() + V.falls.reduce((a, f) => a + f.total, 0) || V.left === V.g.count(), 'blocks left matches the grid');
}

// ---- boom barrel chains and tipping towers
{
  const W = WD.createWorld(cfg, 0, {});
  check(W.kegCells.length >= 3 && W.kegCells.every((c) => W.g.get(c.x, c.y, c.z) === M.keg), `boom barrel blocks placed (${W.kegCells.length}), one in front of the building`);
  // put two boom barrel side by side in the open and hit one: both go off
  const g = W.g; g.set(2, 0, 30, M.keg); g.set(4, 0, 30, M.keg);
  WD.useTool(W, 'bomb', { x: 2.5, y: 0.5, z: 30.5 });
  const booms = []; for (let i = 0; i < 90; i++) for (const e of WD.step(W, 1 / 30)) if (e.type === 'boom') booms.push(e.kind);
  check(booms.filter((k) => k === 'keg').length >= 2, `one blast sets off the boom barrel next to it (${booms.join(',')})`);
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

// ---- BONK-BOTs: toy robots that fly when hit and get back up
{
  const solidAt = (W, p) => p[1] >= 0 && !!W.g.get(Math.floor(p[0]), Math.floor(p[1]), Math.floor(p[2]));
  const okPts = (W, b) => b.pts.every((p) => p.every(Number.isFinite) && p[1] >= 0.05);
  let spawnOk = true, counts = [];
  for (let lv = 0; lv < 8; lv++) {
    const W = WD.createWorld(cfg, lv, {}); counts.push(W.bots.filter((x) => !x.boss).length);
    for (const b of W.bots) if (W.g.get(Math.floor(b.x), 0, Math.floor(b.z)) || W.g.get(Math.floor(b.x), 1, Math.floor(b.z)) || Math.hypot(b.x - W.hero.x, b.z - W.hero.z) < 3) spawnOk = false;
  }
  check(spawnOk && counts.every((c) => c >= cfg.waves.count - 1 && c <= cfg.waves.count + 1), `a wave of ${cfg.waves.count} + the front-yard robot stand on free ground away from the hero on every building (${counts.join(',')})`);
  // strolling: never inside a block, never off the lot, no NaN
  const W = WD.createWorld(cfg, 2, {}); let walkOk = true;
  for (let i = 0; i < 600; i++) { WD.step(W, 1 / 30); for (const b of W.bots) if (b.state === 'walk' && (!Number.isFinite(b.x) || W.g.get(Math.floor(b.x), 0, Math.floor(b.z)) || b.x < W.botLot.x0 || b.x > W.botLot.x1 || b.z < W.botLot.z0 || b.z > W.botLot.z1)) walkOk = false; }
  check(walkOk && W.bots.some((b) => b.goal), '20 s of strolling: bots stay on free ground inside the lot');
  // a blast next to a bot: it flies, the player gets coins; the ragdoll keeps its shape, lands, and the bot reboots
  const b = W.bots[0], c0 = coinsBefore(W);
  function coinsBefore(w) { return w.coins; }
  const ev = []; const { knockBots } = await import('./bots.js');
  knockBots(W, b.x + 0.6, 0.8, b.z, 2.5, cfg.bots.knock, 'bomb'); ev.push(...W.ev);
  const bonk = ev.find((e) => e.type === 'bonk');
  check(b.state === 'down' && bonk && bonk.coins > 0 && W.coins > c0, `a blast knocks the bot flying and pays (${bonk && bonk.coins} coins)`);
  let maxStretch = 1, peak = 0, rebooted = false, insideAtRest = false;
  for (let i = 0; i < 300 && !rebooted; i++) {
    for (const e of WD.step(W, 1 / 30)) if (e.type === 'reboot') rebooted = true;
    if (b.pts && b.state === 'down') { peak = Math.max(peak, b.pts[1][1]); const d = Math.hypot(...[0, 1, 2].map((a) => b.pts[0][a] - b.pts[1][a])) / (0.24 * b.h); maxStretch = Math.max(maxStretch, d); }
  }
  check(peak > 1.2, `the bot really flies (chest up to ${peak.toFixed(1)} m)`);
  check(maxStretch < 1.35, `the ragdoll keeps its shape (head-chest stretch ${maxStretch.toFixed(2)}×)`);
  check(rebooted, 'after resting on the ground the bot reboots');
  for (let i = 0; i < 40; i++) WD.step(W, 1 / 30);
  check(b.state === 'leave' && !W.g.get(Math.floor(b.x), 0, Math.floor(b.z)), 'rebooted: it stands on free ground and walks off to a gate');
  // hit again while down: it flies again, no second payment
  const W2 = WD.createWorld(cfg, 0, {}), b2 = W2.bots[0];
  knockBots(W2, b2.x, 0.8, b2.z, 2, cfg.bots.knock, 'bomb');
  WD.step(W2, 1 / 30); const c1 = W2.coins; const { knock: knock2 } = await import('./bots.js'); knock2(W2, 0, 1, 0, cfg.bots.knock, 'bomb');
  check(W2.coins === c1 && W2.ev.some((e) => e.type === 'bonk' && e.again), 'a bot already down flies again but pays only once');
  // ragdolls never sink into the ground or into blocks, whatever hits them
  let sane = true;
  for (let lv = 0; lv < 4; lv++) { const w = WD.createWorld(cfg, lv, {}); for (const bb of w.bots) knockBots(w, bb.x, 0.3, bb.z - 0.5, 2, cfg.bots.knock * 1.6, 'bomb'); for (let i = 0; i < 200; i++) { WD.step(w, 1 / 30); for (const bb of w.bots) if (bb.state === 'down' && (!okPts(w, bb) || (bb.still > 0.3 && bb.pts.some((p) => solidAt(w, p))))) sane = false; } }
  check(sane, 'ragdolls rest on top of the ground and blocks, never inside, no NaN');
  // the hammer: walk up to a bot and swing
  const W3 = WD.createWorld(cfg, 0, {}), b3 = W3.bots[0]; b3.state = 'walk'; b3.goal = null;
  W3.hero.x = b3.x; W3.hero.z = b3.z + 1.5; const sw = WD.swingBot(W3, 0); const ev3 = [];
  for (let i = 0; i < 20; i++) ev3.push(...WD.step(W3, 1 / 30));
  check(sw && ev3.some((e) => e.type === 'bonk' && e.by === 'hammer') && b3.state === 'down', 'the hammer knocks a bot flying');
  // a knock during hit-stop (a few tiny steps first) still sends the bot flying at full height
  { const travel = (steps) => { const w = WD.createWorld(cfg, 0, {}), bb = w.bots[0]; knockBots(w, bb.x - 0.6, 0.8, bb.z, 2.5, cfg.bots.knock, 'bomb'); const x0 = bb.x, z0 = bb.z;
      // the game marks hit-stop frames (W.frozen), as it does in play
      let t = 0; for (const dt of steps) { w.frozen = dt < 1 / 200; WD.step(w, dt); if (!w.frozen) t += dt; if (t > 0.6) break; } return Math.hypot(bb.pts[2][0] - x0, bb.pts[2][2] - z0); };
    const N = (dt, n) => Array(n).fill(dt), normal = travel(N(1 / 30, 40)), stopped = travel([...N(0.002, 6), ...N(1 / 30, 40)]), mixed = travel(Array.from({ length: 80 }, (_, k) => (k % 3 ? 1 / 60 : 1 / 30)));
    check(Math.abs(stopped - normal) / normal < 0.25 && Math.abs(mixed - normal) / normal < 0.25, `a knock throws as far after hit-stop or with changing steps (${normal.toFixed(2)} / ${stopped.toFixed(2)} / ${mixed.toFixed(2)} m)`); }
  // a 240 Hz screen (or slow motion on 120 Hz) makes tiny steps that are not hit-stop: robots still fly and get up
  { const w = WD.createWorld(cfg, 0, {}), bb = w.bots[0]; knockBots(w, bb.x - 0.6, 0.8, bb.z, 2.5, cfg.bots.knock, 'bomb'); const x0 = bb.x, z0 = bb.z; let up = false;
    for (let i = 0; i < 240 * 10 && !up; i++) for (const e of WD.step(w, 1 / 240)) if (e.type === 'reboot' && w.bots[e.i] === bb) up = true;
    const far = Math.hypot(bb.x - x0, bb.z - z0);
    check(up && far > 2, `at 240 Hz a knocked robot flies (${far.toFixed(1)} m) and gets up again`); }
  // buried where it walks (a landed piece): it steps out to free ground
  { const w = WD.createWorld(cfg, 1, {}), bb = w.bots[1]; for (let y = 0; y < 2; y++) w.g.set(Math.floor(bb.x), y, Math.floor(bb.z), 1);
    WD.step(w, 1 / 30); check(!w.g.get(Math.floor(bb.x), 0, Math.floor(bb.z)) && !w.g.get(Math.floor(bb.x), 1, Math.floor(bb.z)), 'a bot buried by a block steps out to free ground'); }
  // a knock while it puts itself back together: it flies from where its parts are, and pays nothing
  { const w = WD.createWorld(cfg, 0, {}), bb = w.bots[0]; knockBots(w, bb.x, 0.8, bb.z, 2, cfg.bots.knock, 'bomb');
    for (let i = 0; i < 300 && bb.state !== 'reboot'; i++) WD.step(w, 1 / 30); WD.step(w, 1 / 30); const before = bb.pts.map((p) => p.slice()), c = w.coins;
    const { knock: knock3 } = await import('./bots.js'); knock3(w, w.bots.indexOf(bb), 1, 0, cfg.bots.knock, 'bomb');
    check(bb.state === 'down' && w.coins === c && Math.hypot(...[0, 1, 2].map((a) => bb.pts[0][a] - before[0][a])) < 0.01, 'a knock during the reboot: no pay, no jump of its parts'); }
  // the attract mode: bots fly but nothing pays
  const D = WD.createWorld(cfg, 0, { demo: true }), bd = D.bots[0]; knockBots(D, bd.x, 0.8, bd.z, 2, cfg.bots.knock, 'rocket');
  check(D.coins === 0 && D.ev.some((e) => e.type === 'bonk' && e.coins === 0), 'the attract mode: bots fly, nothing pays');
}

// ---- the horde: waves of BONK-BOTs marching at the hero, signs, costumes, gates, chains
{
  const B = cfg.bots, V = cfg.waves, { knockBots, ringRad, standing } = await import('./bots.js');
  const ang = (a) => Math.atan2(Math.sin(a), Math.cos(a));
  // where the first wave appears: 4.5–12 m from the hero, inside the 270° arc around where he looks
  let inRing = 0, inArc = 0, tot = 0, signs = 0, cost = 0, front = true;
  for (let lv = 0; lv < 8; lv++) {
    const W = WD.createWorld(cfg, lv, {}), h = W.hero, f = W.bots[0];
    if (!(f.front && Math.abs(f.x - (h.x + 2.6)) < 1e-6 && Math.abs(f.z - (h.z - 3.2)) < 1e-6 && f.state === 'walk')) front = false;
    for (const b of W.bots.filter((x) => x.wave === 1)) {
      tot++; const d = Math.hypot(b.x - h.x, b.z - h.z), a = Math.atan2(b.x - h.x, b.z - h.z);
      if (d >= B.spawnMin - 0.6 && d <= B.spawnMax + 0.6) inRing++;
      if (Math.abs(ang(a - h.yaw)) <= B.spawnArc / 2 * Math.PI / 180 + 0.35) inArc++;
      if (b.sign >= 0) signs++; if (b.costume === 0) cost++;
    }
  }
  check(front, 'the front-yard robot stands where it always did (the demo rocket and the first boom barrel throw it)');
  check(inRing >= tot * 0.85 && inArc >= tot * 0.85, `wave 1 starts 4.5–12 m away (${inRing}/${tot}) in the 270° arc ahead (${inArc}/${tot})`);
  check(signs > tot * 0.3 && signs < tot * 0.7 && cost > tot * 0.35 && cost < tot * 0.85, `about half carry a dare sign (${signs}/${tot}); the wave's costume is mixed with plain robots (${cost}/${tot})`);
  // marching: closer every second, never faster than catch-up, and close by they face the hero
  const W = WD.createWorld(cfg, 0, {}), h = W.hero, wave1 = W.bots.filter((b) => b.wave === 1);
  const mean = () => wave1.reduce((s, b) => s + Math.hypot(b.x - h.x, b.z - h.z), 0) / wave1.length, m0 = mean();
  let maxSp = 0, firstReach = null;
  for (let i = 0; i < 30 * 12; i++) {
    const before = wave1.map((b) => [b.x, b.z]); WD.step(W, 1 / 30);
    wave1.forEach((b, k) => { if (b.state === 'march') maxSp = Math.max(maxSp, Math.hypot(b.x - before[k][0], b.z - before[k][1]) * 30); });
    if (firstReach === null && wave1.some((b) => Math.hypot(b.x - h.x, b.z - h.z) <= cfg.hero.reach + 0.6)) firstReach = i / 30;
  }
  const m1 = mean(), near = wave1.filter((b) => b.near), facing = near.filter((b) => Math.abs(ang(Math.atan2(h.x - b.x, h.z - b.z) - b.yaw)) < 0.6);
  check(m1 < m0 - 2 && maxSp <= B.march * B.catchUp + 0.05, `the wave marches in (mean ${m0.toFixed(1)} → ${m1.toFixed(1)} m), at most ${(B.march * B.catchUp).toFixed(2)} m/s (fastest ${maxSp.toFixed(2)})`);
  check(firstReach !== null && firstReach < 3, `a robot is in hammer reach within 3 s (${firstReach && firstReach.toFixed(1)} s): the first hit comes fast`);
  check(near.length >= wave1.length * 0.6 && facing.length >= near.length * 0.8, `close by they face the hero (${facing.length}/${near.length} of ${wave1.length} near)`);
  check(Math.abs(ringRad(B, 0) - 1.45) < 1e-9 && Math.abs(ringRad(B, 4) - (1.45 + 2 * 0.72)) < 1e-9, 'ring slots: 1.45 + √idx · 0.72');
  // the next wave: at `every` seconds when nobody is knocked; survivors leave through a gate and are gone
  const X = WD.createWorld(cfg, 1, {}); let waveAt = null, leftOk = true;
  for (let i = 0; i < 30 * 40 && waveAt === null; i++) for (const e of WD.step(X, 1 / 30)) if (e.type === 'wave') waveAt = (i + 1) / 30;
  const leavers = X.bots.filter((b) => b.wave === 1);
  check(waveAt !== null && Math.abs(waveAt - V.every) < 0.1 && leavers.length && leavers.every((b) => b.state === 'march'), `wave 2 comes at ${waveAt && waveAt.toFixed(1)} s; wave 1's robots still march (one more wave to clear it)`);
  for (let i = 0; i < 30 * V.every && X.wave.n < 3; i++) WD.step(X, 1 / 30);
  check(X.wave.n === 3 && leavers.every((b) => b.state === 'leave' || b.gone), `wave 3: the robots of wave 1 still marching leave through the gates`);
  for (let i = 0; i < 30 * (B.leaveMax + 1); i++) WD.step(X, 1 / 30);
  check(X.bots.filter((b) => b.wave === 1).length === 0 && X.wave.n >= 2, `leavers are gone within ${B.leaveMax} s (through the gates)`);
  void leftOk;
  // most of a wave knocked: the next comes early, but never before minGap
  const Y = WD.createWorld(cfg, 2, {}); let at2 = null;
  for (let i = 0; i < 30 * 30 && at2 === null; i++) {
    if (i === 30 * 3) { for (const b of Y.bots.filter((x) => x.wave === 1).slice(0, Math.ceil(V.count * (1 - V.leftRatio)) + 1)) knockBots(Y, b.x, 0.8, b.z, 0.6, B.knock, 'bomb'); }
    for (const e of WD.step(Y, 1 / 30)) if (e.type === 'wave') at2 = (i + 1) / 30;
  }
  check(at2 !== null && at2 >= V.minGap - 0.05 && at2 < V.every - 1, `${Math.round((1 - V.leftRatio) * 100)}% knocked at 3 s: the next wave comes at ${at2 && at2.toFixed(1)} s (not before ${V.minGap} s)`);
  // a cleared wave pays once; costume set changes each wave
  const Z = WD.createWorld(cfg, 0, {}); let clears = [];
  for (const b of Z.bots.filter((x) => x.wave === 1)) knockBots(Z, b.x, 0.8, b.z, 0.6, B.knock, 'bomb');
  for (const b of Z.bots.filter((x) => x.wave === 1)) knockBots(Z, b.pts[1][0], b.pts[1][1], b.pts[1][2], 0.6, B.knock, 'bomb');
  clears.push(...Z.ev.filter((e) => e.type === 'waveClear'));
  check(clears.length === 1 && clears[0].coins >= V.coins, `knocking every robot of a wave clears it once (+${clears[0] && clears[0].coins} coins)`);
  // one robot knocked twice (again after it got up) still counts once: 14 of 15 different robots do not clear the wave
  { const Kw = WD.createWorld(cfg, 1, {}), w1 = Kw.bots.filter((x) => x.wave === 1), first = w1[0], last = w1[w1.length - 1]; let cleared = false;
    last.x = Kw.botLot.x0 + 1; last.z = Kw.botLot.z0 + 1; last.state = 'walk'; last.goal = [last.x, last.z];
    for (const b of w1.slice(0, -1)) knockBots(Kw, b.x, 0.8, b.z, 0.5, B.knock, 'bomb');
    for (let i = 0; i < 30 * 8 && first.state !== 'leave'; i++) for (const e of WD.step(Kw, 1 / 30)) if (e.type === 'waveClear') cleared = true;
    const { knock: kk } = await import('./bots.js'); kk(Kw, Kw.bots.indexOf(first), 1, 0, B.knock, 'bomb');
    cleared = cleared || Kw.ev.some((e) => e.type === 'waveClear');
    check(first.state === 'down' && !cleared && !last.knocked && !Kw.ev.some((e) => e.type === 'bonk' && e.coins > 0), `a robot knocked again after getting up counts once and pays nothing more: 14 of 15 robots do not clear the wave (cleared: ${cleared})`); }
  const D = WD.createWorld(cfg, 0, { demo: true }); for (const b of D.bots) knockBots(D, b.x, 0.8, b.z, 0.6, B.knock, 'bomb');
  check(D.coins === 0 && D.ev.some((e) => e.type === 'waveClear' && e.coins === 0), 'the attract mode clears waves without paying');
  for (let i = 0; i < 30 * 13; i++) WD.step(Z, 1 / 30);
  const c2 = Z.bots.filter((b) => b.wave === 2 && b.costume >= 0).map((b) => b.costume);
  check(Z.wave.n === 2 && c2.length > 0 && c2.every((c) => c === 1), `wave 2 wears the next costume set (${[...new Set(c2)].join(',')})`);
  // bounded: three minutes of waves with knocks now and then never pile up robots
  const Q = WD.createWorld(cfg, 3, {}); let most = 0, mostDown = 0;
  for (let i = 0; i < 30 * 180; i++) {
    if (i % 45 === 0) { const s = Q.bots.find((b) => standing(b)); if (s) knockBots(Q, s.x, 0.8, s.z, 3, B.knock, 'bomb'); }
    WD.step(Q, 1 / 30); most = Math.max(most, Q.bots.length); mostDown = Math.max(mostDown, Q.bots.filter((b) => b.state === 'down').length);
  }
  check(most <= B.maxBots + 1 && mostDown <= B.maxDown + 1 && Q.wave.n >= 6, `3 min of waves: at most ${most} robots (cap ${B.maxBots}), ${mostDown} down at once (cap ${B.maxDown}), ${Q.wave.n} waves`);
  // chain: a robot flying fast through a standing one knocks it over too (55% of its speed passed on)
  const C = WD.createWorld(cfg, 0, {}); C.bots.length = 0;
  const { knock } = await import('./bots.js');
  const mk = (x, z) => ({ id: 900 + C.bots.length, x, z, yaw: 0, h: B.height, state: 'march', t: 0, step: 0, goal: null, pts: null, prev: null, rest: [], hue: 0, r: (() => { let a = 3; return () => ((a = (a * 16807) % 2147483647) / 2147483647); })(), sign: -1, costume: -1, mouth: 0, wave: 9, slot: 0, knocked: false, near: false, life: 0 });
  C.hero.x = 2; C.hero.z = 34; C.bots.push(mk(18, 30), mk(19.2, 30));
  knock(C, 0, 1, 0, 9, 'bomb'); const chainEv = [];
  for (let i = 0; i < 30; i++) chainEv.push(...WD.step(C, 1 / 30).filter((e) => e.type === 'bonk'));
  check(C.bots[1].state === 'down' && chainEv.some((e) => e.by === 'chain'), `a flying robot knocks a standing one over (chain: ${chainEv.map((e) => e.by).join(',')})`);
  // the swing keeps its robot even when the list shifts (one leaves) before the hammer lands
  const S = WD.createWorld(cfg, 0, {}), target = S.bots[3]; S.hero.x = target.x; S.hero.z = target.z + 1.5; target.goal = null;
  WD.swingBot(S, 3); S.bots.splice(0, 1);
  const sev = []; for (let i = 0; i < 12; i++) sev.push(...WD.step(S, 1 / 30));
  check(target.state === 'down' && sev.some((e) => e.type === 'bonk' && e.by === 'hammer'), 'a swing lands on the robot it was aimed at, after the list shifted');
  // a bomb flying inside a blast goes off 0.12–0.24 s later; lit boom barrel too
  const R = WD.createWorld(cfg, 0, { owned: cfg.tools.map((x) => x.id) }), hx = R.hero.x, hz = R.hero.z;
  WD.useTool(R, 'bomb', { x: hx, y: 1, z: hz - 9 }); WD.step(R, 1 / 30);
  const bomb = R.shots[0]; R.cool.rocket = 0;
  R.fuses.push({ x: Math.floor(bomb.x), y: bomb.y, z: Math.floor(bomb.z), t: 5 });
  WD.useTool(R, 'meteor', { x: bomb.x, y: bomb.y, z: bomb.z }); R.shots[1].t = R.shots[1].dur - 1 / 60;
  let t = 0, boomAt = null, kegAt = null; const tb = [];
  for (let i = 0; i < 40; i++) { for (const e of WD.step(R, 1 / 60)) { if (e.type === 'boom') tb.push([e.kind, t]); } t += 1 / 60; }
  const mt = (tb.find((x) => x[0] === 'meteor') || [])[1], bt = (tb.find((x) => x[0] === 'bomb') || [])[1], nt = (tb.find((x) => x[0] === 'keg') || [])[1];
  boomAt = bt != null && mt != null ? bt - mt : null; kegAt = nt != null && mt != null ? nt - mt : null;
  check(boomAt !== null && boomAt >= 0.1 && boomAt <= 0.26 && kegAt !== null && kegAt <= 0.26, `a blast sets off a bomb in flight (${boomAt && boomAt.toFixed(2)} s later) and lit boom barrel (${kegAt && kegAt.toFixed(2)} s)`);
  // a falling piece still knocks robots over where it lands
  const F = WD.createWorld(cfg, 0, {}), fb = F.bots[2];
  const fake = { id: 77, cells: [{ x: Math.floor(fb.x), y: 3, z: Math.floor(fb.z), m: M.brick }], total: 1, y: 0, vy: 0, drop: 3, spin: 0, th: 0, thv: 0, t: 0, topple: null };
  F.falls.push(fake); let landHit = false; for (let i = 0; i < 40; i++) for (const e of WD.step(F, 1 / 30)) if (e.type === 'bonk' && e.by === 'land') landHit = true;
  check(landHit, 'a falling block knocks over the robot it lands on');
}

// ---- dynamic resolution and the quality tier
{
  const Q = cfg.quality, q0 = { dpr: 1.5, max: 1.5, low: false, capped: false, dropped: null, slow: 0 };
  let q = q0; const seq = [];
  for (let i = 0; i < 12; i++) { q = L.qualityStep(Q, q, 1 / 30); seq.push(q.dpr.toFixed(2)); }
  check(q.dpr >= Q.lowMax && q.capped, `a 30 fps cap: one step down that does not help is undone; the resolution is never crushed to ${Q.minDpr} (${seq.join(' ')})`);
  // a really slow phone: frames get quicker as the resolution drops, down to the floor, then the low tier
  // (a model phone: part of each frame scales with the pixels, part does not)
  // (lowAt out of reach here: this one walks the steps)
  q = q0; const s2 = [], ftOf = (d) => 0.025 + 0.03 * (d / 1.5) ** 2, QW = { ...Q, lowAt: 1 };
  for (let i = 0; i < 14; i++) { q = L.qualityStep(QW, q, ftOf(q.dpr)); s2.push(q.dpr.toFixed(2) + (q.low ? 'L' : '')); }
  check(q.low && q.dpr <= Q.minDpr + 0.01 && q.max <= Q.lowMax, `a slow phone steps down to DPR ${Q.minDpr} and then the low tier (${s2.join(' ')})`);
  q = { ...q0, dpr: 0.9 }; for (let i = 0; i < 8; i++) q = L.qualityStep(Q, q, 1 / 120);
  check(q.dpr === 1.5, `fast frames climb back up by ${Q.up} a window to the device's own ratio (${q.dpr})`);
  // hitches: a smooth average with quality.hitch.count long frames in the window is a slow window
  const H = Q.hitch;
  q = L.qualityStep(Q, q0, 1 / 60, H.count - 1);
  check(q.dpr === q0.dpr && !q.low && q.slow === 0, `${H.count - 1} long frame(s) in a 60 fps window change nothing (${q.dpr})`);
  q = L.qualityStep(Q, q0, 1 / 60, H.count);
  check(q.dpr < q0.dpr && !q.low, `${H.count} frames over ${H.ms} ms in a 60 fps window: a step down (${q.dpr})`);
  let wn = 0; q = q0; while (!q.low && wn < 20) { q = L.qualityStep(Q, q, 1 / 60, H.count); wn++; }
  check(q.low && wn <= 2 + Q.lowSlowWindows, `a game at 60 fps that keeps hitching reaches the low tier (${wn} windows)`);
  q = L.qualityStep(Q, q, 1 / 60, 0);
  check(q.low && q.slow === 0, 'the low tier is kept when the hitches stop');
  // far too slow: no walk down the steps
  q = L.qualityStep(Q, q0, Q.lowAt + 0.001);
  check(q.low && q.dpr <= Q.minDpr + 0.01 && q.max <= Q.lowMax && !q.dropped, `a window over ${Q.lowAt * 1000} ms goes straight to the low tier (${q.dpr})`);
  q = L.qualityStep(Q, q0, Q.lowAt - 0.001);
  check(!q.low && q.dpr < q0.dpr, `a slow window under ${Q.lowAt * 1000} ms still takes one step (${q.dpr})`);
  const pure = { ...q0 }; L.qualityStep(Q, pure, 0.05, 3);
  check(JSON.stringify(pure) === JSON.stringify(q0), 'qualityStep leaves its input as it was');
}

// ---- the economy, cheap and often (Prison style): a child who buys the cheapest thing whenever it can
{
  const { rng } = await import('./levels.js');
  const U = cfg.upgrade;
  /** One level as the child pilot plays it (stick + HIT + star taps + some bombs), with the given upgrades. */
  function childLevel(lv, seed, lvs) {
    const r = rng(seed * 101 + lv), W = WD.createWorld(cfg, lv, { lv: lvs });
    let t = 0, tt = 0, cur = { idle: true }, fever = null;
    const ahead = (ux, uz) => { const h = W.hero; for (let s = 0.6; s <= cfg.hero.reach - 0.3; s += 0.3) for (let y = 0; y < 3; y++) { const x = Math.floor(h.x + ux * s), z = Math.floor(h.z + uz * s); if (W.g.get(x, y, z)) return { x, y, z }; } return null; };
    while (t < 240 && fever === null) {
      if ((tt -= 1 / 30) <= 0) { tt = 0.4 + r(); const sh = W.starCells.filter((c) => W.g.get(c.x, c.y, c.z) === W.ids.star);
        cur = W.t > 1 && r() < 0.25 ? { idle: true } : sh.length && r() < 0.3 ? { star: sh[0] } : W.lastHard && W.t - W.lastHard.t < 3 && r() < 0.5 ? { bomb: W.lastHard } : { aim: !W.chest.open || !sh.length ? { x: W.chest.x, z: W.chest.z } : sh[0], wobble: (r() - 0.5) * 1.2 };
        if (cur.star) WD.starShot(W, cur.star); if (cur.bomb) WD.useTool(W, 'bomb', { x: cur.bomb.x + 0.5, y: cur.bomb.y + 0.5, z: cur.bomb.z + 0.5 }); }
      WD.setMove(W, 0, 0);
      if (cur.aim) { const h = W.hero, a = Math.atan2(cur.aim.x + 0.5 - h.x, cur.aim.z + 0.5 - h.z) + cur.wobble, ux = Math.sin(a), uz = Math.cos(a), b = ahead(ux, uz); if (b) WD.hitBlock(W, b); else WD.setMove(W, ux, uz); }
      for (const e of WD.step(W, 1 / 30)) if (e.type === 'fever') fever = t;
      t += 1 / 30;
    }
    // smash time as the child plays it (a tap every 0.5 s) until it runs out or the building is flat; then the next
    // building follows after flow.nextDelay, and every flow.cardEvery buildings a result card is read (6 s)
    let ft = 0;
    while (W.phase === 'fever' && t < 400) { if ((ft -= 1 / 30) <= 0) { ft = 0.5; const b = WD.botTap(W); if (b && b.tool === 'bomb') WD.useTool(W, 'bomb', b.p); else if (b) WD.aimHammer(W, b.t, true); } WD.step(W, 1 / 30); t += 1 / 30; }
    const stars = L.starsFor(cfg, WD.wreck(W));
    if (process.env.ECON) console.log('   lv', lv, 't', t.toFixed(0), 'coins', W.coins, 'bonus', L.levelBonus(cfg, lv, stars, W.coins));
    return { t: t + cfg.flow.nextDelay + 6 / cfg.flow.cardEvery, coins: W.coins + L.levelBonus(cfg, lv, stars, W.coins) };
  }
  for (const seed of [1, 2, 3]) {
    const lvs = {}, owned = ['hammer', 'bomb']; let coins = 0, clock = 0, buys = [];
    for (let lv = 0; clock < 300; lv++) {
      const r = childLevel(lv, seed, lvs); coins += r.coins;
      // coins arrive through the level: buying is checked a few times in it
      for (let k = 1; k <= 4; k++) {
        const at = clock + r.t * k / 4;
        for (;;) { const opts = cfg.tools.map((x) => ({ id: x.id, c: owned.includes(x.id) ? L.upgradeCost(cfg, x.id, lvs[x.id] || 1) : x.cost })).filter((o) => o.c !== null).sort((a, b) => a.c - b.c); const o = opts[0];
          if (!o || o.c > coins * k / 4 + coins * 0) break; if (o.c > coins) break; coins -= o.c; if (owned.includes(o.id)) lvs[o.id] = (lvs[o.id] || 1) + 1; else owned.push(o.id); buys.push(+at.toFixed(0)); }
      }
      clock += r.t;
    }
    // buy moments (several things bought at one visit to the shop count once)
    const moments = [...new Set(buys)], gaps = moments.map((b, i) => b - (i ? moments[i - 1] : 0)), early = gaps.slice(0, 10), med = early.slice().sort((a, b) => a - b)[Math.floor(early.length / 2)], ends = Math.max(...moments.filter((b) => b < 300).map((b, i, a) => (i ? b - a[i - 1] : b)));
    console.log(`  economy seed ${seed}: ${buys.filter((b) => b < 300).length} buys in 5 min at ${buys.slice(0, 14).join(', ')} s; levels ${JSON.stringify(lvs)}, owned ${owned.length}`);
    check(buys[0] <= 40 && med >= 12 && med <= 45 && ends <= 90, `economy seed ${seed}: first buy at ${buys[0]} s, median gap ${med} s between the first 10 buy moments, longest gap in 5 min ${ends} s (target: something every ~30 s)`);
  }
}

// ---- BOOM update: special boom barrel and the BOOM box that sets every barrel off
{
  const kinds = cfg.keg.kinds.map((k) => k.id);
  let boxOk = true, kindsSeen = new Set(), frontPlain = true, far = true;
  for (let lv = 0; lv < 40; lv++) {
    const Lv = buildLevel(cfg, lv), b = Lv.boomBox, front = Lv.keg[Lv.keg.length - 1];
    if (!b || Lv.grid.get(b.x, b.y, b.z) !== M.boomBox) boxOk = false;
    for (const c of Lv.keg) if (c.k) kindsSeen.add(c.k);
    if (front.k) frontPlain = false;
    // the first tap blows the front barrel: the BOOM box must survive that blast, or every level starts with all of it
    if (b && Math.hypot(b.x - front.x, b.z - front.z) <= cfg.keg.r + 1) far = false;
  }
  check(boxOk, 'every level has a BOOM box standing in the yard');
  check(kinds.length >= 3 && kinds.every((k) => kindsSeen.has(k)), 'every special barrel kind appears within the first 40 levels');
  check(frontPlain, 'the barrel in front of the start stays a plain one (the first tap is a plain boom)');
  check(far, 'the BOOM box stands outside the front barrel\'s blast');

  // a bomb on the BOOM box lights every barrel; they go off one after the other and the specials do their own thing
  const W = WD.createWorld(cfg, 2, { owned: ['hammer', 'bomb'] }), b = W.boomBox, total = W.kegCells.length;
  const special = W.kegCells.filter((c) => c.k).map((c) => c.k);
  check(WD.useTool(W, 'bomb', { x: b.x + 0.5, y: b.y + 0.5, z: b.z + 0.5 }), 'a bomb can be thrown at the BOOM box');
  const seen = { detonate: null, booms: [], shots: new Set() }; let t = 0;
  while (t < 9) {
    for (const e of WD.step(W, 1 / 60)) {
      if (e.type === 'detonate') seen.detonate = e;
      if (e.type === 'boom' && e.kind === 'keg') seen.booms.push(t);
      if (e.type === 'throw' && e.shot.from === 'keg') seen.shots.add(e.shot.kind);
    }
    t += 1 / 60;
  }
  check(seen.detonate && seen.detonate.n === total, `the BOOM box lights all ${total} barrels (${seen.detonate && seen.detonate.n})`);
  check(seen.booms.length === total, `every barrel goes off (${seen.booms.length} of ${total})`);
  check(seen.booms.length > 1 && seen.booms[seen.booms.length - 1] - seen.booms[0] >= 0.2, 'the barrels go off one after the other, not in one frame');
  check(W.kegCells.every((c) => W.g.get(c.x, c.y, c.z) !== M.keg), 'no barrel is left standing afterwards');
  const want = { cluster: 'bomb', hole: 'hole', meteor: 'meteor' };
  check(special.length > 0 && special.every((k) => seen.shots.has(want[k])), `each special barrel did its own thing (${special.join(', ')} → ${[...seen.shots].join(', ')})`);
  check(W.left >= 0 && W.left === W.g.count(), `the block count still matches the grid after the chain (${W.left} / ${W.g.count()})`);

  // a cluster barrel hit on its own throws its bombs outward
  const C = WD.createWorld(cfg, 2, { owned: ['hammer', 'bomb'] }), cl = C.kegCells.find((c) => c.k === 'cluster');
  if (cl) {
    WD.useTool(C, 'bomb', { x: cl.x + 0.5, y: cl.y + 0.5, z: cl.z + 0.5 }); let bombs = 0;
    for (let i = 0; i < 240; i++) for (const e of WD.step(C, 1 / 60)) if (e.type === 'throw' && e.shot.from === 'keg' && e.shot.kind === 'bomb') bombs++;
    check(bombs === cfg.keg.kinds.find((k) => k.id === 'cluster').n, `a cluster barrel throws ${bombs} bombs`);
  } else check(false, 'level 2 has a cluster barrel to test');
}

// ---- BOOM update, found by the bug hunt (22 Nov)
{
  const run = (W, secs, each) => { for (let i = 0; i < secs * 60; i++) { const ev = WD.step(W, 1 / 60); if (each) each(ev, i / 60); } };
  // 1. one barrel hit on its own never takes the BOOM box with it (it did on 12 of the first 40 levels)
  const accident = [];
  for (let lv = 0; lv < 40; lv++) for (let i = 0; i < buildLevel(cfg, lv).keg.length; i++) {
    const W = WD.createWorld(cfg, lv, { owned: ['hammer', 'bomb'] }), c = W.kegCells[i];
    WD.useTool(W, 'bomb', { x: c.x + 0.5, y: c.y + 0.5, z: c.z + 0.5 });
    // only the barrels inside the bomb's own blast count as hit together with it
    run(W, 10, (ev) => { if (ev.some((e) => e.type === 'detonate')) accident.push(`L${lv} ${c.k || 'plain'}`); });
  }
  check(accident.length === 0, `a barrel's own effect never sets the BOOM box off (${accident.length ? [...new Set(accident)].slice(0, 6).join(', ') : 'none'})`);

  // 2. after the box is hit the barrels stay standing until their own boom
  const W = WD.createWorld(cfg, 9, { owned: ['hammer', 'bomb'] }), b = W.boomBox, n0 = W.kegCells.length;
  WD.useTool(W, 'bomb', { x: b.x + 0.5, y: 0.5, z: b.z + 0.5 });
  const standing = () => W.kegCells.filter((c) => W.g.get(c.x, c.y, c.z) === M.keg).length;
  let atDetonate = null, early = 0, booms = 0, leftOk = true;
  run(W, 9, (ev) => {
    for (const e of ev) { if (e.type === 'detonate') atDetonate = standing(); if (e.type === 'boom' && e.kind === 'keg') booms++; }
    // a barrel is gone only once it (or a blast that reached it) has gone off
    if (atDetonate !== null && n0 - standing() > booms + 1) early++;
    if (W.left !== W.g.count()) leftOk = false;
  });
  check(atDetonate >= n0 - 1 && n0 >= 4, `when the BOOM box goes, the barrels are still standing (${atDetonate} of ${n0})`);
  check(early === 0 && standing() === 0 && booms === n0, `each barrel disappears with its own boom (${booms} booms, ${early} frames with a barrel gone early)`);
  check(leftOk, 'the block count matches the grid on every frame of the chain');

  // 3. what the barrels throw does not run up the combo (one box paid 2,245 coins on level 1 against 595 with plain barrels)
  const pay = (kinds) => { const c2 = { ...cfg, keg: { ...cfg.keg, kinds } }, V = WD.createWorld(c2, 0, { owned: ['hammer', 'bomb'] }); WD.useTool(V, 'bomb', { x: V.boomBox.x + 0.5, y: 0.5, z: V.boomBox.z + 0.5 }); let top = 0; run(V, 12, () => { top = Math.max(top, V.combo.mult); }); return { coins: V.coins, top }; };
  const withKinds = pay(cfg.keg.kinds), plain = pay([]);
  check(withKinds.top <= plain.top, `special barrels do not push the combo higher than plain ones (×${withKinds.top} against ×${plain.top})`);
  check(withKinds.coins <= plain.coins * 2.5, `a BOOM box on level 1 pays at most 2.5× the plain chain (${withKinds.coins} against ${plain.coins})`);

  // 4. a barrel's black hole is still a hole to the look and the sound
  const H = WD.createWorld(cfg, 0, { owned: ['hammer', 'bomb'] }), hb = H.kegCells.find((c) => c.k === 'hole'); const bys = new Set();
  WD.useTool(H, 'bomb', { x: hb.x + 0.5, y: 0.5, z: hb.z + 0.5 });
  run(H, 6, (ev) => { for (const e of ev) if (e.type === 'smash' && H.shots.some((s) => s.kind === 'hole')) bys.add(e.by); });
  check(bys.has('hole'), `blocks a barrel's black hole swallows are reported as swallowed by a hole (${[...bys].join(', ')})`);

  // 5. the box is two cells tall (a tap on its handle hits it too) and both cells go together
  const T2 = WD.createWorld(cfg, 2, { owned: ['hammer', 'bomb'] }), tb = T2.boomBox;
  check(T2.g.get(tb.x, 0, tb.z) === M.boomBox && T2.g.get(tb.x, 1, tb.z) === M.boomBox, 'the BOOM box fills two cells, base and handle');
  WD.useTool(T2, 'bomb', { x: tb.x + 0.5, y: 2.6, z: tb.z + 0.5 }); let det = 0;
  run(T2, 8, (ev) => { det += ev.filter((e) => e.type === 'detonate').length; });
  check(det === 1 && !T2.g.get(tb.x, 0, tb.z) && !T2.g.get(tb.x, 1, tb.z) && T2.left === T2.g.count(), `a hit on the handle sets it off once and both cells go (${det})`);
}

// ---- robot limbs: shoulders, hips, elbows and knees (the arms and legs were single sticks from one point)
{
  const { limbJoint } = await import('./bots.js');
  const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
  let ok = true, bends = true, straight = true, finite = true;
  for (const [r, e, len, nrm] of [[[0, 1, 0], [0.2, 0.7, 0.1], 0.5, [0, 0, -1]], [[0, 0.6, 0], [0.05, 0, 0.2], 0.6, [0, 0, 1]], [[1, 1, 1], [1, 0.9, 1], 0.5, [1, 0, 0]], [[0, 1, 0], [0, 0.6, 0], 0.5, [0, -1, 0]], [[0, 1, 0], [0, 1, 0], 0.5, [0, 0, 1]]]) {
    const j = limbJoint(r, e, len, nrm), d = dist(r, e), half = Math.max(len, d) / 2;
    if (!j.every(Number.isFinite)) finite = false;
    if (Math.abs(dist(r, j) - half) > 1e-6 || Math.abs(dist(j, e) - half) > 1e-6) ok = false;
    // the joint lies on the side asked for (when that side is not along the limb)
    const side = (j[0] - (r[0] + e[0]) / 2) * nrm[0] + (j[1] - (r[1] + e[1]) / 2) * nrm[1] + (j[2] - (r[2] + e[2]) / 2) * nrm[2];
    if (d > 1e-6 && d < len && Math.abs((e[0] - r[0]) * nrm[0] + (e[1] - r[1]) * nrm[1] + (e[2] - r[2]) * nrm[2]) < 0.9 * d && side <= 0) bends = false;
  }
  const far = limbJoint([0, 1, 0], [0, 0, 0], 0.6, [0, 0, 1]);
  if (dist(far, [0, 0.5, 0]) > 1e-6) straight = false;
  check(finite, 'limb joint: never NaN, also for a zero-length limb or a bend direction along the limb');
  check(ok, 'limb joint: upper and lower part are equally long and meet at the joint');
  check(bends, 'limb joint: a limb shorter than its length bends towards the side asked for');
  check(straight, 'limb joint: a limb pulled longer than its length stays straight');
}

// ---- a swing started between frames (HIT button, Space, a tap on a robot) still reports itself
{
  const W = WD.createWorld(cfg, 0, { owned: ['hammer', 'bomb'] });
  WD.step(W, 1 / 60);
  const started = WD.hitBlock(W, null), ev = WD.step(W, 1 / 60);
  check(started && ev.some((e) => e.type === 'swing'), `a swing at the air from outside step() reaches the next frame's events (${ev.map((e) => e.type).join(', ') || 'none'})`);
  // and one started inside step() (the hero reaching a tapped block) is reported once, in that same frame
  const V = WD.createWorld(cfg, 0, { owned: ['hammer', 'bomb'] }); let swings = 0, frames = 0;
  const c = V.kegCells[V.kegCells.length - 1]; WD.aimHammer(V, { x: c.x, y: c.y, z: c.z }, false);
  for (let i = 0; i < 120 && !swings; i++) { swings += WD.step(V, 1 / 60).filter((e) => e.type === 'swing').length; frames++; }
  for (let i = 0; i < 10; i++) swings += WD.step(V, 1 / 60).filter((e) => e.type === 'swing').length;
  check(swings === 1, `a swing started by the world itself is reported exactly once (${swings}, after ${frames} frames)`);
}

// ---- smash time grows with the smashing (fever.addPerBlock), within fever.dur at once and fever.maxTotal in all,
// ---- and ends early with a FLATTENED bonus once the building is flat (fever.flatAt)
{
  const F = cfg.fever, dt = 1 / 30;
  /** A level played by the bot up to the start of smash time. */
  const toFever = (lv, opts = {}) => { const W = WD.createWorld(cfg, lv, opts); let tt = 0; for (let i = 0; i < 30 * 120 && W.phase !== 'fever'; i++) { if ((tt -= dt) <= 0) { tt = 0.25; const b = WD.botTap(W); if (b) { if (b.tool === 'hammer') WD.aimHammer(W, b.t, true); else WD.useTool(W, b.tool, b.p); } } WD.step(W, dt); } WD.aimHammer(W, null); WD.release(W); return W; };
  /** Runs smash time to its end; active = the bot keeps tapping every `every` seconds. */
  const run = (W, every) => { let t = 0, tt = 0, top = 0; const ev = []; while (t < 120 && W.phase === 'fever') { if (every && (tt -= dt) <= 0) { tt = every; const b = WD.botTap(W); if (b) { if (b.tool === 'hammer') WD.aimHammer(W, b.t, true); else WD.useTool(W, b.tool, b.p); } } for (const e of WD.step(W, dt)) ev.push(e.type); top = Math.max(top, W.fever); t += dt; } return { t, ev, top }; };
  check(F.addPerBlock > 0 && F.maxTotal > F.dur && F.flatAt > 0.5 && F.flatAt <= 1 && cfg.coins.flat > 0, `smash time's numbers are in the config (add ${F.addPerBlock} s a block, ${F.maxTotal} s in all, flat at ${F.flatAt}, +${cfg.coins.flat})`);
  // nobody smashing: it ends after fever.dur, as it always did
  {
    const W = toFever(0); W.shots.length = 0; W.falls.length = 0; W.fuses.length = 0;
    const r = run(W, 0);
    check(Math.abs(r.t - F.dur) < 0.2 && r.ev.includes('clear') && !r.ev.includes('flat') && W.phase === 'free', `an idle player's smash time ends after ${F.dur} s (${r.t.toFixed(2)} s)`);
  }
  // each smashed block adds time, never more than fever.dur on the clock
  {
    const W = toFever(0); W.shots.length = 0; W.falls.length = 0; W.fuses.length = 0;
    for (let i = 0; i < 30 * 5; i++) WD.step(W, dt);
    const low = W.fever, left0 = W.left;
    const b = WD.botTap(W); WD.useTool(W, 'bomb', b.p);
    let top = 0; for (let i = 0; i < 30 * 2 && W.left === left0; i++) { WD.step(W, dt); top = Math.max(top, W.fever); }
    check(Math.abs(low - (F.dur - 5)) < 0.1 && W.left < left0 && W.fever > low, `smashing blocks adds smash time (${low.toFixed(1)} s left, ${left0 - W.left} blocks later ${W.fever.toFixed(1)} s)`);
    check(W.fever <= F.dur + 1e-9, `...never more than ${F.dur} s on the clock at once (${W.fever.toFixed(2)})`);
  }
  // a player who never stops: longer than fever.dur, never longer than fever.maxTotal, or flat before that
  {
    const lens = [], tops = [];
    for (const lv of [0, 2, 4]) { const W = toFever(lv, { owned: cfg.tools.map((x) => x.id) }); const r = run(W, 0.5); lens.push(+r.t.toFixed(1)); tops.push(r.top); check(r.ev.filter((x) => x === 'clear').length === 1 && (r.ev.includes('flat') || r.t > F.dur + 1), `level ${lv + 1}: a steady player's smash time outlasts ${F.dur} s or ends flat (${r.t.toFixed(1)} s, wrecked ${(WD.wreck(W) * 100).toFixed(0)}%${r.ev.includes('flat') ? ', FLATTENED' : ''})`); }
    check(lens.every((x) => x <= F.maxTotal + 0.1), `smash time never runs past ${F.maxTotal} s in all (${lens.join(', ')} s)`);
    check(tops.every((x) => x <= F.dur + 1e-9), 'the clock never shows more than fever.dur');
  }
  // the clock is honest near the cap: what it shows is never more than what is really left
  {
    const W = toFever(0); W.feverT = F.maxTotal - 2; W.fever = 1;
    const b = WD.botTap(W); WD.useTool(W, 'bomb', b.p); let ok = true, t = 0;
    while (W.phase === 'fever' && t < 10) { WD.step(W, dt); t += dt; if (W.fever > F.maxTotal - W.feverT + 1e-6) ok = false; }
    check(ok && t <= 2 + 0.1, `near the cap the clock shows only the time really left (ended after ${t.toFixed(2)} s of the last 2)`);
  }
  // flat: the building is (nearly) gone, smash time ends at once with a bonus, paid once
  {
    const W = toFever(1); W.shots.length = 0; W.falls.length = 0; W.fuses.length = 0;
    const c0 = W.coins; W.left = Math.floor(W.total * (1 - F.flatAt)) - 1;
    const ev = WD.step(W, dt), flat = ev.filter((e) => e.type === 'flat'), i = ev.findIndex((e) => e.type === 'flat'), j = ev.findIndex((e) => e.type === 'clear');
    const fb = Math.max(cfg.coins.flat, Math.round((cfg.coins.flatShare || 0) * c0));
    check(flat.length === 1 && flat[0].coins === fb && W.coins - c0 === fb && i >= 0 && j > i && W.phase === 'free' && W.flat === true, `a flat building ends smash time with FLATTENED and +${cfg.coins.flat} coins, then the level's end`);
    const more = []; for (let k = 0; k < 60; k++) more.push(...WD.step(W, dt));
    check(!more.some((e) => e.type === 'flat' || e.type === 'clear'), '...once: no second bonus, no second end');
    const D = toFever(1, { daily: true, coinMult: cfg.daily.mult }); D.left = 0; const fd = WD.step(D, dt).find((e) => e.type === 'flat');
    check(fd && fd.coins === cfg.coins.flat * cfg.daily.mult, 'the daily challenge multiplies the flat bonus like every other coin');
    // aaa2: a rich building's FLATTENED pays its share
    const R = toFever(1); R.shots.length = 0; R.falls.length = 0; R.fuses.length = 0; R.coins = 100000; R.left = 0; const fr = WD.step(R, dt).find((e) => e.type === 'flat');
    check(fr && fr.coins === Math.round(cfg.coins.flatShare * 100000) && R.coins === 100000 + fr.coins, `FLATTENED after 100,000 coins pays coins.flatShare of them (${fr && fr.coins})`);
    const P = WD.createWorld(cfg, 1, {}); P.left = 0; const pe = []; for (let k = 0; k < 30; k++) pe.push(...WD.step(P, dt));
    check(!pe.some((e) => e.type === 'flat'), 'no FLATTENED outside smash time');
  }
}

// ---- missions: three small goals at a time, from the config's pool, paid when done and replaced by the next
{
  const MS = cfg.missions, owned = ['hammer', 'bomb'], def = (id) => L.missionOf(cfg, id);
  const m = L.missionsFill(cfg, null, owned);
  check(m.on.length === MS.slots && MS.slots === 3 && m.on.every((a) => a.have === 0 && def(a.id)), 'a new player gets three missions from the pool, all at zero');
  check(new Set(m.on.map((a) => def(a.id).kind)).size === 3, 'the three missions are three different kinds of goal');
  check(m.on.every((a) => def(a.id).kind !== 'tool' || owned.includes(def(a.id).tool)), 'no mission asks for a tool the player does not own');
  check(MS.pool.every((d) => d.n > 0 && d.coins > 0 && ['smash', 'bonk', 'keg', 'chest', 'flat', 'clear', 'tool'].includes(d.kind) && (d.kind !== 'tool' || cfg.tools.some((t) => t.id === d.tool))) && new Set(MS.pool.map((d) => d.id)).size === MS.pool.length, 'every mission in the pool has a known kind, a goal, a prize and its own id');
  for (const l of Object.keys(cfg.strings)) check(['missions', 'mDone', ...new Set(MS.pool.map((d) => MS.text[d.kind]))].every((k) => cfg.strings[l][k] && !/\p{Extended_Pictographic}/u.test(cfg.strings[l][k])), `mission words exist in ${l}, without emoji`);
  // progress
  const first = def(m.on[0].id), before = JSON.stringify(m.on.slice(1));
  check(L.missionsAdd(cfg, m, owned, first.kind, first.n - 1, first.tool).length === 0 && m.on[0].have === first.n - 1 && JSON.stringify(m.on.slice(1)) === before, 'progress counts on the matching mission only, and one short of the goal pays nothing');
  check(L.missionChip(cfg, m).def.id === first.id && Math.abs(L.missionChip(cfg, m).part - (first.n - 1) / first.n) < 1e-9, 'the chip shows the mission nearest to its goal');
  const back = L.missionsFill(cfg, JSON.parse(JSON.stringify(m)), owned);
  check(JSON.stringify(back) === JSON.stringify(m), 'a saved mission list comes back as it was (progress kept)');
  const got = L.missionsAdd(cfg, m, owned, first.kind, 5, first.tool);
  check(got.length === 1 && got[0].id === first.id && got[0].coins === first.coins && m.done === 1, 'reaching the goal completes the mission once, with its prize');
  check(m.on.length === MS.slots && !m.on.some((a) => a.id === first.id) && m.on.every((a) => a.have < def(a.id).n), 'a finished mission is replaced by the next from the pool');
  // the pool goes round: finishing missions for a long time never repeats one on the list and never runs dry
  { const r = L.missionsFill(cfg, null, owned); let ok = true, paid = 0; const seen = new Set();
    for (let i = 0; i < MS.pool.length * 3; i++) { const d = def(r.on[0].id); seen.add(d.id); paid += L.missionsAdd(cfg, r, owned, d.kind, d.n, d.tool).length; ok = ok && r.on.length === MS.slots && new Set(r.on.map((a) => a.id)).size === MS.slots; }
    check(ok && paid >= MS.pool.length * 3 && seen.size >= MS.pool.filter((d) => d.kind !== 'tool' || owned.includes(d.tool)).length - MS.slots, `the pool rotates for ever: always ${MS.slots} different missions (${seen.size} of ${MS.pool.length} seen by a player with two tools)`); }
  // a broken or old save
  const fixed = L.missionsFill(cfg, { on: [{ id: 'nope', have: 3 }, { id: MS.pool[0].id, have: 1e9 }, { id: MS.pool[0].id, have: 1 }, null], next: 'x', done: -4 }, owned);
  check(fixed.on.length === MS.slots && fixed.on.every((a) => def(a.id) && a.have >= 0 && a.have < def(a.id).n) && new Set(fixed.on.map((a) => a.id)).size === MS.slots && fixed.next >= 0 && fixed.done === 0, 'a broken save gives three valid missions, none already past its goal');
  // what the world reports
  const ev = (e) => L.missionEvent(e);
  check(ev({ type: 'smash', removed: [1, 2, 3] }).kind === 'smash' && ev({ type: 'smash', removed: [1, 2, 3] }).n === 3 && ev({ type: 'land', n: 40 }).n === 40, 'smashed and fallen blocks count as blocks');
  check(ev({ type: 'bonk' }).kind === 'bonk' && ev({ type: 'bonk', again: true }) === null, 'a robot bonked counts once (not again while it is down)');
  check(ev({ type: 'detonate', n: 2 }).kind === 'keg' && ev({ type: 'treasure' }).kind === 'chest' && ev({ type: 'flat' }).kind === 'flat' && ev({ type: 'clear' }).kind === 'clear', 'boom barrels, chests, flattened and finished buildings count');
  check(ev({ type: 'throw', shot: { kind: 'bomb' } }).tool === 'bomb' && ev({ type: 'throw', shot: { kind: 'bomb', from: 'keg' } }) === null && ev({ type: 'step' }) === null, 'a tool the player fires counts; what a barrel throws does not');
  // the bot plays two buildings: missions get done, and their prizes stay a small share of what smashing pays
  { const r = L.missionsFill(cfg, null, owned); let paid = 0, done = 0, earned = 0, secs = 0, tools = 0;
    for (let lv = 0; lv < 2; lv++) { const W = WD.createWorld(cfg, lv, { owned }); let t = 0, tap = 0, end = false;
      while (t < 240 && !end) { if (t >= tap) { tap = t + 0.5; const b = WD.botTap(W); if (b) { if (b.tool === 'hammer') WD.aimHammer(W, b.t, true); else WD.useTool(W, b.tool, b.p); } }
        for (const e of WD.step(W, 1 / 30)) { if (e.type === 'clear') end = true; const x = L.missionEvent(e); if (x) { if (x.kind === 'tool') tools++; for (const d of L.missionsAdd(cfg, r, owned, x.kind, x.n, x.tool)) { paid += d.coins; done++; } } }
        t += 1 / 30; }
      earned += W.coins; secs += t; }
    check(tools > 0, `the world reports the bot's own shots (${tools})`);
    check(done >= 2, `the steady bot finishes missions while it plays (${done} in ${secs.toFixed(0)} s)`);
    check(paid <= earned * MS.maxShare, `mission prizes stay under ${MS.maxShare * 100}% of the coins smashing paid (${paid} of ${earned}: ${(paid / earned * 100).toFixed(1)}%)`); }
}

// ---- the boss: one giant crowned BONK-BOT on boss levels (every 5th building); three knocks bring it down
{
  const BS = cfg.boss, { knock, standing } = await import('./bots.js');
  const bossOf = (W) => W.bots.filter((b) => b.boss);
  const made = [0, 1, 2, 3, 4, 5, 9, 14].map((lv) => bossOf(WD.createWorld(cfg, lv, {})).length);
  check(made.join() === '0,0,0,0,1,0,1,1', `one boss robot on boss levels only (levels 0,1,2,3,4,5,9,14: ${made.join()})`);
  check(bossOf(WD.createWorld(cfg, 4, { demo: true })).length === 0 && bossOf(WD.createWorld(cfg, 4, { daily: true })).length === 0, 'no boss in the attract show, none on a daily challenge (W.boss is false there)');
  // where it stands: ahead of the hero in the front yard, on free ground, off the line to the nearest barrel
  let placeOk = true; const places = [];
  for (const lv of [4, 9, 14, 19, 24, 29]) {
    const W = WD.createWorld(cfg, lv, {}), b = bossOf(W)[0], h = W.hero; if (!b) { placeOk = false; continue; }
    const ahead = (b.x - h.x) * Math.sin(h.yaw) + (b.z - h.z) * Math.cos(h.yaw), side = Math.abs((b.x - h.x) * Math.cos(h.yaw) - (b.z - h.z) * Math.sin(h.yaw));
    let keg = null; for (const c of W.kegCells) if (!keg || Math.hypot(c.x - h.x, c.z - h.z) < Math.hypot(keg.x - h.x, keg.z - h.z)) keg = c;
    let line = Infinity; if (keg) { const kx = keg.x + 0.5 - h.x, kz = keg.z + 0.5 - h.z, t = Math.max(0, Math.min(1, ((b.x - h.x) * kx + (b.z - h.z) * kz) / (kx * kx + kz * kz))); line = Math.hypot(b.x - h.x - kx * t, b.z - h.z - kz * t); }
    places.push(`${ahead.toFixed(1)}/${side.toFixed(1)}/${line === Infinity ? '-' : line.toFixed(1)}`);
    if (!(ahead >= BS.ahead - 1.5 && ahead <= BS.ahead + 1.5 && side < ahead * 0.5 && line >= BS.clear && b.z > W.box.z1 && !W.g.get(Math.floor(b.x), 0, Math.floor(b.z)) && Math.abs(b.h - cfg.bots.height * BS.botScale) < 1e-9 && b.hp === BS.hits && standing(b))) placeOk = false;
  }
  check(placeOk, `the boss stands in the front yard ahead of the spawn, in view, off the line to the nearest barrel, ${BS.botScale}× tall with ${BS.hits} knocks to go (ahead/side/line m: ${places.join(' ')})`);
  // from the spawn the hero's eye sees its head and crown (nothing but air between): the yard's fence hides its legs
  { let seen = true, low = 0; for (const lv of [4, 9, 14, 19, 24, 29]) { const W = WD.createWorld(cfg, lv, {}), b = bossOf(W)[0], h = W.hero, eye = cfg.camera.eye;
    const sees = (y) => { const dx = b.x - h.x, dy = y - eye, dz = b.z - h.z, d = Math.hypot(dx, dy, dz); return raycast(W.g, h.x, eye, h.z, dx / d, dy / d, dz / d, d) === null; };
    let lo = b.h; while (lo > 0.1 && sees(lo - 0.1)) lo -= 0.1; low = Math.max(low, lo);
    if (!(sees(b.h * 0.9) && sees(b.h * 1.1))) seen = false; }
    check(seen, `from the spawn the eye sees the boss's head and crown over the fence on 6 boss buildings (its middle line is in sight from ${low.toFixed(1)} m up at worst: the fence hides what is below)`); }
  // left alone for 40 s (waves come and go): it stays where it stands
  { const W = WD.createWorld(cfg, 4, {}), b = bossOf(W)[0], x0 = b && b.x, z0 = b && b.z; for (let i = 0; i < 40 * 30; i++) WD.step(W, 1 / 30);
    check(!!b && W.bots.includes(b) && standing(b) && Math.hypot(b.x - x0, b.z - z0) < 1 && W.wave.n > 1, `waves come and go (${W.wave.n}), the boss stays in its place`); }
  const W = WD.createWorld(cfg, 4, {}), b = bossOf(W)[0] || {}, idx = () => W.bots.indexOf(b);
  const hit = () => { W.ev = []; knock(W, idx(), 0, 1, cfg.bots.knock, 'hammer'); return W.ev.slice(); };
  const upIn = (max) => { let t = 0; while (t < max && !standing(b)) { WD.step(W, 1 / 30); t += 1 / 30; } return t; };
  const stage = Math.round(BS.hitCoins * W.coinMult);
  let c0 = W.coins; const e1 = hit().find((e) => e.type === 'bossHit');
  check(!!e1 && e1.left === BS.hits - 1 && e1.coins === stage && W.coins - c0 === stage && !W.ev.some((e) => e.type === 'bossDown'), `knock 1: a bossHit event, ${BS.hits - 1} to go, boss.hitCoins paid (${e1 && e1.coins} of ${stage})`);
  check(!!e1 && L.missionEvent(e1) === null, 'a stagger is no bonk for the missions');
  c0 = W.coins; hit();
  check(b.hp === BS.hits - 1 && W.coins === c0, 'a knock while it lies staggered counts for nothing');
  const t1 = upIn(20);
  check(standing(b) && t1 < cfg.bots.rebootAfter + cfg.bots.rebootTime, `it stands up again in ${t1.toFixed(2)} s, sooner than a normal robot (${cfg.bots.rebootAfter + cfg.bots.rebootTime} s)`);
  const e2 = hit().find((e) => e.type === 'bossHit'); upIn(20);
  check(!!e2 && e2.left === BS.hits - 2 && standing(b), 'knock 2: one to go, up again');
  W.coins = 10000; const bonks = W.bonks || 0, e3 = hit().find((e) => e.type === 'bossDown'), want = Math.max(Math.round(BS.downCoins * W.coinMult), Math.round(BS.downShare * 10000));
  check(!!e3 && e3.coins === want && W.coins === 10000 + want && (W.bonks || 0) === bonks + 1, `knock 3: bossDown pays max(boss.downCoins, boss.downShare × the building's coins) (${e3 && e3.coins} of ${want})`);
  check(!!e3 && JSON.stringify(L.missionEvent(e3)) === JSON.stringify({ kind: 'bonk', n: 1 }), 'bossDown is one bonk for the missions');
  check(typeof L.bossBonus === 'function' && L.bossBonus(cfg, 0, 1) === BS.downCoins && L.bossBonus(cfg, 1e6, 1) === Math.round(BS.downShare * 1e6), 'bossBonus: the flat prize early, the share of a rich building');
  let reboot = false, up = false; for (let i = 0; i < 30 * 30; i++) { for (const e of WD.step(W, 1 / 30)) if (e.type === 'reboot' && W.bots[e.i] === b) reboot = true; if (standing(b) || b.state === 'reboot') up = true; }
  c0 = W.coins; const e4 = hit();
  check(!reboot && !up && W.bots.includes(b) && W.coins === c0 && !e4.some((e) => e.type === 'bossDown' || e.type === 'bossHit') && b.pts.every((p) => p.every(Number.isFinite)), 'after the last knock it never gets up again (30 s), and pays nothing more');
}
// ---- owner report (23 Nov): from the farthest spot behind the lot the wrecking ball never rolled; every tool must knock a robot
{
  const ids = cfg.tools.map((t) => t.id);
  {
    const W = WD.createWorld(cfg, 1, { owned: ids }), h = W.hero; h.z = W.g.D + 12;
    const fx = Math.sin(h.yaw), fz = Math.cos(h.yaw), s0 = W.smashed; W.cool.ball = 0;
    WD.useTool(W, 'ball', { x: h.x + fx * 20, y: 1, z: h.z + fz * 20 });
    let rolled = 0; for (let i = 0; i < 30 * 6; i++) { WD.step(W, 1 / 30); if (W.shots.some((x) => x.kind === 'ball')) rolled++; }
    check(rolled > 30 && W.smashed > s0, `the ball thrown from the far edge of the lot rolls and reaches the building (${(rolled / 30).toFixed(1)} s rolling, ${W.smashed - s0} blocks)`);
  }
  // a robot held on open ground behind the lot (no block near to fall on it): hit straight on, standing beside the
  // aim point, and standing in the way of a shot aimed past it
  const hit = [];
  for (const id of ids.filter((x) => x !== 'hammer')) for (const [name, ahead, side, aim] of [['direct', 5, 0, 5], ['beside', 5, 1.5, 5], ['in the way', 3, 0, 6]]) {
    const W = WD.createWorld(cfg, 1, { owned: ids }), h = W.hero; h.z = W.g.D + 8;
    const fx = Math.sin(h.yaw), fz = Math.cos(h.yaw), rx = Math.cos(h.yaw), rz = -Math.sin(h.yaw), b = W.bots[0], bx = h.x + fx * ahead + rx * side, bz = h.z + fz * ahead + rz * side;
    b.pts = null; b.goal = null; b.x = bx; b.z = bz; W.cool[id] = 0;
    // (aimed at the robot's chest when it is the target, as a tap on it does; at the ground when the tap is beside it)
    WD.useTool(W, id, { x: h.x + fx * aim, y: name === 'beside' ? 0 : 1, z: h.z + fz * aim });
    let down = false; for (let k = 0; k < 30 * 5 && !down; k++) { if (b.state !== 'down') { b.x = bx; b.z = bz; } WD.step(W, 1 / 30); down = b.state === 'down'; }
    if (!down) hit.push(`${id} ${name}`);
  }
  check(hit.length === 0, `every thrown tool knocks a robot: hit straight on, beside the aim point, or in its way (missed: ${hit.join(', ') || 'none'})`);
}

// ---- the wrecking ball has weight (23 Nov, owner: "all the physics right"): thrown in a low arc, one bounce, then it
// rolls on the ground, slowed by friction and by every block it breaks, until it stops
{
  const ids = cfg.tools.map((t) => t.id), T = cfg.tools.find((t) => t.id === 'ball'), DT = 1 / 60;
  // a throw followed to its end: every step's height, speed and events (lane = beside the grid: open ground, no blocks)
  const run = (lane) => {
    const W = WD.createWorld(cfg, 1, { owned: ids }), h = W.hero; W.cool.ball = 0;
    if (lane) { h.x = -10; h.z = -12; W.bots.length = 0; } else h.z = W.g.D + 12;
    const dz = lane ? 1 : Math.cos(h.yaw), dx = lane ? 0 : Math.sin(h.yaw);
    WD.useTool(W, 'ball', { x: h.x + dx * 20, y: 1, z: h.z + dz * 20 });
    const out = { W, ys: [], vs: [], ev: [], blocks: 0, dist: 0, t: 0, bad: 0 };
    for (let i = 0; i < 60 * 12; i++) {
      const s = W.shots.find((x) => x.kind === 'ball'), v0 = s ? s.v : 0, ev = WD.step(W, DT); let n = 0;
      for (const e of ev) { if (e.type === 'ballLand' || e.type === 'ballBounce' || e.type === 'pop') out.ev.push({ type: e.type, t: i * DT, d: s ? s.dist : 0, v: s ? s.v : 0 }); if (e.type === 'roll') n += e.n; }
      if (!s) continue;
      out.blocks += n; out.ys.push(s.y); out.vs.push(s.v); out.dist = s.dist; out.t = (i + 1) * DT;
      // a step that broke n blocks lost at least n · loss (and no step ever gains speed)
      if (s.v > v0 + 1e-9 || (n && !s.done && s.v > Math.max(0, v0 - n * T.loss) + 1e-9)) out.bad++;
    }
    return out;
  };
  const O = run(true), names = O.ev.map((e) => e.type).join(' '), iL = Math.round(O.ev[0].t / DT), iB = O.ev[1] ? Math.round(O.ev[1].t / DT) : 0;
  const apex = Math.max(...O.ys.slice(0, iL)) - T.r, hop = Math.max(...O.ys.slice(iL, iB + 1)) - T.r;
  check(names === 'ballLand ballBounce pop' && apex > 0.5 && O.ys.slice(0, iL - 1).every((y) => y > T.r), `the ball flies a low arc before it lands (events: ${names}; ${apex.toFixed(2)} m over the ground at the top, lands after ${O.ev[0].t.toFixed(2)} s and ${O.ev[0].d.toFixed(1)} m)`);
  check(hop > 0.2 && hop < apex && O.ys.slice(iB + 1).every((y) => y === T.r), `one visible bounce, then its centre stays at ground height + r (bounce ${hop.toFixed(2)} m, down again at ${O.ev[1].t.toFixed(2)} s)`);
  check(O.bad === 0 && O.vs.slice(iB + 2).every((v, i, a) => !i || v < a[i - 1]) && O.ev[2].v < T.stop && O.dist < T.len && O.W.shots.length === 0, `on open ground friction slows it until it stops under ball.stop (${O.dist.toFixed(1)} m in ${O.t.toFixed(1)} s, cap ${T.len} m)`);
  const B = run(false);
  check(B.blocks > 0 && B.bad === 0 && B.dist < O.dist && B.ev.some((e) => e.type === 'pop') && B.vs[B.vs.length - 1] < T.stop, `every block it breaks costs it speed: through the building it stops sooner (${B.blocks} blocks, ${B.dist.toFixed(1)} m against ${O.dist.toFixed(1)} m on open ground)`);
  // a robot standing 1.2 m to the side of its path (open ground at the edge of the robots' lot, the ball thrown along
  // +x) is thrown onwards along the path, not out to the side
  const W = WD.createWorld(cfg, 1, { owned: ids }), h = W.hero, b = W.bots[0]; W.bots.length = 1; W.cool.ball = 0;
  h.x = (W.botLot.x0 + W.botLot.x1) / 2 - 16; h.z = W.botLot.z1 - 2; b.pts = null; b.goal = null; const bx = h.x + 14, bz = h.z - 1.2; let c = null;
  WD.useTool(W, 'ball', { x: h.x + 20, y: 1, z: h.z });
  for (let i = 0; i < 60 * 3; i++) { if (b.state !== 'down') { if (c) break; b.x = bx; b.z = bz; } WD.step(W, DT); if (b.state === 'down') c = b.pts[1].slice(); }
  const along = c ? c[0] - bx : 0, side = c ? Math.abs(c[2] - bz) : 0;
  check(!!c && along > 1 && along > side * 2, `a robot the ball touches is knocked along its direction of travel (${along.toFixed(1)} m along, ${side.toFixed(1)} m to the side)`);
}

// ---- hunt 7: a robot three times the size needs headroom: nothing solid inside its column on any boss level
{
  const BS = cfg.boss, H = cfg.bots.height * BS.botScale, r = BS.room / 2, bad = [];
  for (const n of [4, 9, 14, 19, 24, 29, 34, 39]) {
    const W = WD.createWorld(cfg, n, { owned: ['hammer'] }), b = W.bots.find((x) => x.boss);
    if (!b) { bad.push(`${n}: no boss`); continue; }
    for (let y = 0.5; y < H * BS.crownRoom; y++) for (const [dx, dz] of [[0, 0], [r, 0], [-r, 0], [0, r], [0, -r]]) if (W.g.get(Math.floor(b.x + dx), Math.floor(y), Math.floor(b.z + dz))) bad.push(`${n}: block at ${Math.floor(b.x + dx)},${Math.floor(y)},${Math.floor(b.z + dz)}`);
  }
  check(bad.length === 0, `the boss has headroom on every boss level (${bad.slice(0, 4).join('; ') || 'clear'})`);
}

// a storey that kept too few of its blocks gives way; one that kept enough holds
{
  const K = cfg.crush, mk = () => { const g = createGrid(12, 10, 12); fill(g, 1, 0, 1, 10, 7, 10, 1); g.orig = g.data.slice(); return g; };
  const cut = (g, keep) => { const rem = []; let k = 0; for (let z = 1; z <= 10; z++) for (let x = 1; x <= 10; x++) if (k++ >= keep) { g.set(x, 0, z, 0); rem.push({ x, y: 0, z, m: 1 }); } return rem; };
  const few = Math.floor(100 * K.ratio) - 5, many = Math.ceil(100 * K.ratio) + 5;
  let g = mk(), weak = weakLayer(g, cut(g, few), K.ratio, K.minAbove);
  check(weak.length === few && collapse(g, weak).reduce((a, c) => a + c.total, 0) === 700, `a ground floor left with ${few} of 100 blocks gives way and the 700 above fall (${weak.length} crushed)`);
  g = mk(); weak = weakLayer(g, cut(g, many), K.ratio, K.minAbove);
  check(weak.length === 0 && g.count() === 700 + many, `a ground floor left with ${many} of 100 blocks still holds`);
  g = createGrid(12, 10, 12); fill(g, 5, 0, 5, 5, 3, 5, 1); fill(g, 3, 4, 3, 7, 6, 7, 1); g.orig = g.data.slice();
  g.set(4, 6, 4, 0);
  check(weakLayer(g, [{ x: 4, y: 6, z: 4, m: 1 }], K.ratio, K.minAbove).length === 0, 'a shape built on a thin stem (a tree) stands until its stem is cut');
}
// a robot thrown about never comes apart: head, hands and feet stay within reach of the body
{
  let worst = 0;
  for (const lv of [1, 3, 5]) {
    const W = WD.createWorld(cfg, lv); const hz = 30;
    for (let t = 0; t < 20 * hz; t++) {
      if (t % (hz * 2) === 0) for (let i = 0; i < W.bots.length; i++) knockBot(W, i, (i % 3) - 1, ((i + t) % 3) - 1, cfg.bots.knock * (0.5 + (t % 7) / 3));
      WD.step(W, 1 / hz);
      for (const b of W.bots) if (b.pts) worst = Math.max(worst, Math.hypot(b.pts[0][0] - b.pts[1][0], b.pts[0][1] - b.pts[1][1], b.pts[0][2] - b.pts[1][2]) / (0.24 * b.h));
    }
  }
  check(worst <= cfg.bots.maxStretch + 0.01, `a robot's head stays on its body however it is thrown (neck at most ×${worst.toFixed(2)} of its length)`);
}

// ---- the frame's budgets: chunks are rebuilt nearest first and never left stale; the mesher's scratch is not shared
{
  const CS = 12, keys = ['0,0,0', '2,0,0', '1,0,0', '0,1,2', '3,2,1', '1,1,1'], dirty = new Set(keys), built = [];
  // a clock on which every rebuild costs more than the whole budget: exactly one chunk per frame
  let clock = 0; const now = () => clock, build = (cx, cy, cz) => { built.push(`${cx},${cy},${cz}`); clock += 9; };
  let frames = 0; while (dirty.size && frames < 50) { const k = remeshNearest(dirty, 30, 2, 6, CS, 5, now, build); frames++; if (k !== 1) break; }
  check(frames === keys.length && !dirty.size && built.length === keys.length, `six dirty chunks over budget are rebuilt one a frame and all gone after ${frames} frames (none left stale)`);
  check(built[0] === '2,0,0' && built[1] === '1,0,0' && built[built.length - 1] === '0,1,2', `the chunk nearest the eye is rebuilt first (${built.join(' ')})`);
  const all = new Set(keys); let cheap = 0;
  check(remeshNearest(all, 0, 0, 0, CS, 5, () => 0, () => { cheap++; }) === keys.length && !all.size && cheap === keys.length, 'chunks that fit the budget are all rebuilt in the same frame');
  check(remeshNearest(new Set(), 0, 0, 0, CS, 5, now, build) === 0, 'nothing dirty: nothing rebuilt');
  // two regions meshed one after the other: the first result keeps its own numbers
  const g = createGrid(8, 8, 8); fill(g, 1, 0, 1, 2, 1, 2, 1); fill(g, 5, 0, 5, 6, 3, 6, 1);
  const pal = [null, [1, 1, 1]], jit = [0, 0];
  const a = meshRegion(g.get, 0, 0, 0, 4, 8, 4, pal, jit), copy = Array.from(a.positions), b = meshRegion(g.get, 4, 0, 4, 8, 8, 8, pal, jit);
  check(a.faces === 20 && b.faces === 36 && a.positions.length === a.faces * 12 && a.indices.length === a.faces * 6 && copy.every((v, i) => v === a.positions[i]) && Math.max(...b.positions) === 7, `a mesh keeps its own arrays when the next one is built (${a.faces} and ${b.faces} faces)`);
  // the last blocks of a piece, with nothing next to them: no flood at all (the marks do not move)
  const e = createGrid(6, 6, 6); fill(e, 0, 0, 0, 1, 1, 1, 1); e.set(4, 3, 4, 1); const m0 = e.mark; e.set(4, 3, 4, 0);
  check(collapse(e, [{ x: 4, y: 3, z: 4, m: 1 }]).length === 0 && e.mark === m0 && e.count() === 8, 'removing a block that touched nothing skips the ground flood');
}

console.log(fails.length ? `\n${fails.length} of ${n} FAILED` : `\nall ${n} passed`);
process.exit(fails.length ? 1 : 0);
