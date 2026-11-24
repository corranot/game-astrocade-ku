// PROTOTYPE - NOT FOR PRODUCTION
// Playtest: serves this folder and plays Voxel Wonderland like a child would: the live title before any touch, the
// first tap, walking, jumping (coyote time, buffer), auto-step, clouds, falling off the world, mining with the crack,
// the combo, tool upgrades and the splash, placing with the elastic pop, the hotbar, a wonder assembling, eggs and
// pets that mine, the save (round trip, late, failing), edit mode, run() twice, touch with two fingers, 600 random
// inputs and every language. Game time is stepped in the page (render stubbed) so SwiftShader speed does not matter.
// Usage: node playtest.js [out folder]   ONLY=<section> runs one section.
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const out = process.argv[2] || fs.mkdtempSync(path.join(require('os').tmpdir(), 'vw-'));
fs.mkdirSync(out, { recursive: true });
const types = { '.js': 'text/javascript', '.html': 'text/html', '.json': 'application/json' };
const srv = http.createServer((q, s) => {
  const f = path.join(__dirname, q.url.split('?')[0] === '/' ? 'index.html' : q.url.split('?')[0]);
  fs.readFile(f, (e, d) => { if (e) { s.writeHead(404); return s.end(); } s.writeHead(200, { 'content-type': types[path.extname(f)] || 'text/plain' }); s.end(d); });
}).listen(0);
const ONLY = process.env.ONLY;
const fails = [];
const check = (ok, msg) => { console.log((ok ? 'ok   ' : 'FAIL ') + msg); if (!ok) fails.push(msg); };
const GPU = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'];

async function open(browser, o = {}) {
  const page = await browser.newPage({ viewport: o.vp || { width: 360, height: 640 }, locale: o.locale || 'en-US', hasTouch: !!o.touch, isMobile: !!o.touch });
  const errors = [];
  page.on('pageerror', (e) => errors.push((e.stack || e.message).split('\n').slice(0, 3).join(' | ')));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  if (o.init) await page.addInitScript(o.init);
  await page.goto(`http://localhost:${srv.address().port}/?local${o.q || ''}`);
  await page.waitForFunction(() => window.__game && window.__game.alive, null, { timeout: 60000 });
  if (!o.noWait) await page.waitForFunction(() => __game.loaded, null, { timeout: 20000 });
  await page.evaluate(() => {
    __game.perf.warm = -1e9;
    // step game time without drawing (SwiftShader draws at ~2 fps)
    // a flat test floor in an empty corner of the sky (x 4..16, z 4..20, top at y 46), player on it facing -z
    window.__arena = () => { const g = __game, W = g.world; for (let x = 2; x < 19; x++) for (let z = 2; z < 23; z++) { W.set(x, 45, z, (x >= 4 && x <= 16 && z >= 4 && z <= 20) ? 3 : 0); for (let y = 46; y < 52; y++) W.set(x, y, z, 0); } g.player.pos.set(10.5, 46, 16.5); g.player.vel.set(0, 0, 0); g.player.yaw = 0; g.player.pitch = 0; g.player.onGround = true; __step(0.2); return 46; };
    window.__step = (secs, dt = 1 / 30) => { const g = __game, R = g.renderer, r = R.render; R.render = () => {}; try { for (let t = 0; t < secs; t += dt) g.frame(dt); } finally { R.render = r; } };
  });
  page.errors = errors;
  return page;
}
const step = (p, s, dt) => p.evaluate(([s, dt]) => __step(s, dt), [s, dt || 1 / 30]);
const startDesk = async (p) => { await p.mouse.click(180, 200); await p.waitForFunction(() => __game.started); await p.evaluate(() => { __game.locked = true; }); };
const tp = (p, x, z, yaw, pitch) => p.evaluate(([x, z, yaw, pitch]) => { const g = __game; g.player.spawnAt(x, z); g.player.yaw = yaw ?? g.player.yaw; g.player.pitch = pitch ?? g.player.pitch; }, [x, z, yaw, pitch]);
const S = (p) => p.evaluate(() => JSON.parse(JSON.stringify(__game.S)));
const run = (name) => !ONLY || ONLY === name;

(async () => {
  const browser = await chromium.launch({ args: GPU });
  // ---------------------------------------------------------------- 1 title / start
  if (run('start')) {
    const p = await open(browser);
    const c0 = await p.evaluate(() => __game.camera.position.toArray());
    await p.waitForTimeout(1200);
    const c1 = await p.evaluate(() => __game.camera.position.toArray());
    check(Math.hypot(c0[0] - c1[0], c0[2] - c1[2]) > 0.05, 'title: the island panorama moves before any touch');
    check(await p.evaluate(() => { const t = document.querySelector('.title'); return getComputedStyle(t).opacity === '1' && !!document.querySelector('.play').offsetParent; }), 'title: PLAY visible');
    check(await p.evaluate(() => !__game.started && !__game.dirtySave), 'title: nothing counted or saved before the first touch');
    await p.mouse.click(60, 600);
    check(await p.evaluate(() => __game.started && !__game.demo), 'a tap anywhere (not only PLAY) starts');
    await step(p, 0.5);
    check(await p.evaluate(() => getComputedStyle(document.querySelector('.hotbar')).display !== 'none' && getComputedStyle(document.querySelector('.cross')).display !== 'none'), 'HUD: hotbar and crosshair shown in play');
    check(p.errors.length === 0, 'no page errors on start: ' + p.errors.join(' / '));
    await p.close();
  }
  // ---------------------------------------------------------------- 2 movement
  if (run('move')) {
    const p = await open(browser); await startDesk(p);
    const sp = await p.evaluate(() => __game.cfg.world.spawn);
    await tp(p, sp[0], sp[2], Math.PI, 0); await step(p, 0.3);
    const a = await p.evaluate(() => __game.player.pos.toArray());
    await p.keyboard.down('KeyW'); await step(p, 1); await p.keyboard.up('KeyW');
    const b = await p.evaluate(() => __game.player.pos.toArray());
    check(Math.hypot(b[0] - a[0], b[2] - a[2]) > 2, `W walks forward (${Math.hypot(b[0] - a[0], b[2] - a[2]).toFixed(2)} m)`);
    const y0 = await p.evaluate(() => __arena());
    await p.keyboard.press('Space'); await step(p, 0.25);
    const y1 = await p.evaluate(() => __game.player.pos.y);
    check(y1 - y0 > 0.8, `Space jumps (${(y1 - y0).toFixed(2)})`);
    await step(p, 1.2);
    // auto-step: a one-block ledge in front is walked up without jumping
    const r = await p.evaluate(() => {
      const g = __game, W = g.world, P = g.player, y = __arena();
      for (let x = 4; x <= 16; x++) for (let z = 4; z <= 13; z++) W.set(x, 46, z, 3);
      const before = P.pos.y; g.keys.add('KeyW'); __step(1.2); g.keys.delete('KeyW'); __step(0.3);
      return { before, after: P.pos.y, onGround: P.onGround, z: P.pos.z };
    });
    check(Math.abs(r.after - r.before - 1) < 0.01 && r.onGround && r.z < 13, `auto-step walks up a 1-block ledge (${r.before} → ${r.after.toFixed(2)})`);
    // a 2-block wall is not climbed without jumping
    const r2 = await p.evaluate(() => {
      const g = __game, W = g.world, P = g.player; __arena();
      for (let x = 4; x <= 16; x++) { W.set(x, 46, 14, 3); W.set(x, 47, 14, 3); }
      const before = P.pos.y; g.keys.add('KeyW'); __step(1); g.keys.delete('KeyW');
      return { before, after: P.pos.y, z: P.pos.z };
    });
    check(Math.abs(r2.after - r2.before) < 0.05 && r2.z > 15, `a two-block wall stops the walk (z ${r2.z.toFixed(2)})`);
    // coyote time: a jump pressed just after walking off an edge still works
    const r3 = await p.evaluate(() => {
      const g = __game, P = g.player; P.spawnAt(62.5, 74.5); __step(0.3);
      P.pos.y += 0.0; P.onGround = false; P.tGround = 0.05; P.vel.y = -1; g.input.jumpPressed = true; const v = (() => { P.update(1 / 60, g.input); return P.vel.y; })(); g.input.jumpPressed = false;
      P.spawnAt(62.5, 74.5); __step(0.3); P.onGround = false; P.tGround = 0.3; P.vel.y = -1; g.input.jumpPressed = true; P.update(1 / 60, g.input); const late = P.vel.y; g.input.jumpPressed = false; P.jumpBuf = 0;
      return { v, late };
    });
    check(r3.v > 5 && r3.late < 1, `coyote time: jump 0.05 s after leaving ground works (${r3.v.toFixed(1)}), at 0.3 s it does not (${r3.late.toFixed(1)})`);
    // falling off the world brings the player home, no game over
    const r4 = await p.evaluate(() => { const g = __game, P = g.player; P.pos.set(5, 5, 5); P.vel.set(0, 0, 0); __step(1.5); return { y: P.pos.y, z: P.pos.z, started: g.started }; });
    check(r4.y > 25 && Math.abs(r4.z - 74.5) < 1 && r4.started, 'falling off the islands returns the player to the meadow');
    // cloud bounce
    const r5 = await p.evaluate(() => { const g = __game, W = g.world, P = g.player; let best = 0; for (let x = 58; x < 76; x++) for (let z = 20; z < 45; z++) { const y = W.groundY(x, z); if (W.get(x, y, z) === 14 && !W.get(x, y + 1, z) && !W.get(x, y + 2, z) && !W.get(x, y + 3, z)) { P.pos.set(x + 0.5, y + 4, z + 0.5); P.vel.set(0, -6, 0); P.onGround = false; for (let i = 0; i < 60; i++) { P.update(1 / 60, { fwd: 0, side: 0 }); best = Math.max(best, P.vel.y); } return best; } } return -1; });
    check(r5 > 10, `landing on a cloud bounces high (${r5.toFixed(1)})`);
    check(p.errors.length === 0, 'no page errors while moving: ' + p.errors.join(' / '));
    await p.close();
  }
  // ---------------------------------------------------------------- 3 mining, combo, tools, placing
  if (run('mine')) {
    const p = await open(browser); await startDesk(p);
    const r = await p.evaluate(() => {
      const g = __game, W = g.world, P = g.player; __arena(); P.pitch = -1.0; __step(0.1);
      const hit = g.aim(null); g.mouseMine = true; __step(0.2);
      const crack = g.crack.visible, prog = g.mineP;
      __step(1.5); g.mouseMine = false;
      return { hit: hit && [hit.x, hit.y, hit.z, hit.type], crack, prog, after: hit && W.get(hit.x, hit.y, hit.z), mined: g.S.mined, inv: g.S.inv };
    });
    check(r.hit && r.crack && r.prog > 0 && r.prog < 1, 'holding mine shows the crack and progress');
    check(r.after === 0 && r.mined >= 1 && (r.inv[r.hit[3]] || 0) >= 1, `the block breaks into the hotbar (mined ${r.mined})`);
    const combo = await p.evaluate(() => { const g = __game, s = g.sound; s.combo = 0; s.lastHarvest = -9; const a = [s.harvest(1, 'soft', 2), s.harvest(1.5, 'soft', 2), s.harvest(2, 'soft', 2), s.harvest(5, 'soft', 2)]; return a; });
    check(combo.join(',') === '1,2,3,1', `combo notes climb and reset after a 2 s pause (${combo})`);
    const shards = await p.evaluate(() => { const g = __game, W = g.world; __step(2); const n0 = g.vfx.shards.length; const x = 60, z = 80, y = W.groundY(x, z); g.mineCell(x, y, z, {}); return g.vfx.shards.length - n0; });
    check(shards >= 10 && shards <= 30, `breaking a block bursts into ${shards} voxel shards`);
    // tool upgrade at the threshold; splash from the golden star pickaxe
    const t = await p.evaluate(() => {
      const g = __game, W = g.world; g.S.gauge = g.cfg.tools[1].at - 1; const x = 58, z = 82, y = W.groundY(x, z); g.mineCell(x, y, z, {});
      const t1 = g.player.tier;
      g.S.gauge = g.cfg.tools[2].at; g.hudDirty = true; g.player.setTier(2);
      __arena(); const X = 10, Z = 10, Y = 45; let before = 0; for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) if (W.get(X + a, Y, Z + b)) before++;
      g.mineCell(X, Y, Z, { face: { nx: 0, ny: 1, nz: 0 } });
      let after = 0; for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) if (W.get(X + a, Y, Z + b)) after++;
      return { t1, before, after };
    });
    check(t.t1 === 1, 'crossing the gauge threshold upgrades the pickaxe in hand');
    check(t.before - t.after >= 7, `golden star pickaxe breaks a 3×3 splash (${t.before - t.after})`);
    const sp = await p.evaluate(() => { const g = __game, W = g.world, P = g.player; __arena(); W.set(10, 46, 14, 3); W.set(10, 47, 14, 3); P.pitch = -0.1; __step(0.1); g.S.gauge = 0; P.setTier(0); const h = g.aim(null), i = W.idx(h.x, h.y, h.z); g.mouseMine = true; let k = 0; for (; k < 200 && W.cells[i]; k++) __step(1 / 30); const wood = k; W.set(h.x, h.y, h.z, h.type); g.mineKey = -1; g.mineP = 0; g.S.gauge = g.cfg.tools[3].at; for (k = 0; k < 200 && W.cells[i]; k++) __step(1 / 30); g.mouseMine = false; return { wood, cosmic: k }; });
    check(sp.cosmic < sp.wood / 3, `cosmic pickaxe mines much faster (${sp.wood} → ${sp.cosmic} frames)`);
    // place: E puts the selected block on the aimed face with the elastic pop
    const pl = await p.evaluate(() => {
      const g = __game, W = g.world, P = g.player; __arena(); P.pitch = -0.9; __step(0.1);
      g.S.inv[5] = 5; g.S.bar[0] = 5; g.S.sel = 0; const h = g.aim(null); const x = h.x + h.nx, y = h.y + h.ny, z = h.z + h.nz;
      const n0 = g.S.inv[5]; window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyE' })); window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyE' }));
      const placed = W.get(x, y, z), hidden = W.hidden.has(W.idx(x, y, z)); let peak = 0;
      for (let i = 0; i < 20; i++) { __step(1 / 60, 1 / 60); if (g.pops[0]) peak = Math.max(peak, g.pops[0].m.scale.x); }
      return { placed, hidden, peak, n: g.S.inv[5], n0, left: g.pops.length, unhidden: !W.hidden.has(W.idx(x, y, z)) };
    });
    check(pl.placed === 5 && pl.n === pl.n0 - 1, 'E places the selected block and uses one');
    check(pl.hidden && pl.peak > 1.12 && pl.peak < 1.2 && pl.left === 0 && pl.unhidden, `placed block pops 0 → ${pl.peak.toFixed(2)} → 1 and then joins the mesh`);
    const self = await p.evaluate(() => { const g = __game, P = g.player; P.pitch = -1.5; __step(0.1); const n = g.S.inv[5]; g.placeOrBuild(null); return g.S.inv[5] === n; });
    check(self, 'placing into your own body is refused');
    const hb = await p.evaluate(() => { const g = __game; window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Digit3' })); window.dispatchEvent(new KeyboardEvent('keyup', { code: 'Digit3' })); const a = g.S.sel; document.querySelector('#cv').dispatchEvent(new WheelEvent('wheel', { deltaY: 100, bubbles: true, cancelable: true })); return [a, g.S.sel]; });
    check(hb[0] === 2 && hb[1] === 3, `1–9 and the wheel pick hotbar slots (${hb})`);
    const empty = await p.evaluate(() => { const g = __game; g.S.sel = 8; g.S.bar[8] = 0; const n = JSON.stringify(g.S.inv); g.placeOrBuild(null); return n === JSON.stringify(g.S.inv) && document.querySelector('.hotbar').classList.contains('nope'); });
    check(empty, 'placing with an empty slot wiggles the hotbar, places nothing');
    check(p.errors.length === 0, 'no page errors while mining: ' + p.errors.join(' / '));
    await p.close();
  }
  // ---------------------------------------------------------------- 4 wonders, eggs, pets
  if (run('wonder')) {
    const p = await open(browser); await startDesk(p);
    const r = await p.evaluate(() => {
      const g = __game, b = g.blueprints.list[0];
      g.player.spawnAt(b.pad.x + 0.5, b.pad.z + 0.5); __step(0.2);
      const onPad = !!g.blueprints.padUnder(g.player.pos), btn = !document.querySelector('.bbuild').hidden, ready0 = document.querySelector('.bbuild').classList.contains('ready');
      g.placeOrBuild(null); const started0 = b.building;
      for (const k in b.cost) g.S.inv[k] = b.cost[k] + 3;
      __step(0.1); const ready = document.querySelector('.bbuild').classList.contains('ready');
      g.placeOrBuild(null); const started = b.building, spent = Object.keys(b.cost).every((k) => g.S.inv[k] === 3);
      __step(1); const mid = g.blueprints.flying.length;
      __step(14);
      const ok = b.cells.every(([x, y, z, t]) => g.world.get(x, y, z) === t);
      return { onPad, btn, ready0, started0, ready, started, spent, mid, done: b.done, ok, built: g.S.built, eggs: g.pets.eggs.length, hatched: g.pets.pets.length, cells: b.cells.length };
    });
    check(r.onPad && r.btn && !r.ready0 && !r.started0, 'on the pad without the blocks: grey BUILD, nothing happens');
    check(r.ready && r.started && r.spent, 'with the blocks: BUILD lights up, the cost is paid, assembly starts');
    check(r.mid > 0, `blocks fly from the player (${r.mid} in flight)`);
    check(r.done && r.ok && r.built.includes('tree'), `the treehouse assembles every block (${r.cells}) and is remembered`);
    check(r.eggs + r.hatched === 1, 'a finished wonder drops a golden egg (hatched or about to)');
    const h = await p.evaluate(() => { const g = __game; __step(3); return { pets: g.pets.pets.length, saved: g.S.pets.slice() }; });
    check(h.pets === 1 && h.saved.length === 1, `the egg wiggles and hatches a pet (${h.saved})`);
    // the pet follows and mines an ore near the player
    const m = await p.evaluate(() => {
      const g = __game, W = g.world, P = g.player; P.spawnAt(62.5, 80.5); __step(0.5);
      const x = 64, z = 82, y = W.groundY(x, z) + 1; const i = W.idx(x, y, z); W.base[i] = 7; W.set(x, y, z, 7); const inv0 = g.S.inv[7] || 0;
      const pet = g.pets.pets[0]; pet.seekT = 0; __step(10);
      return { gone: W.cells[i] === 0, got: (g.S.inv[7] || 0) - inv0, dist: Math.hypot(pet.p.x - P.pos.x, pet.p.z - P.pos.z) };
    });
    check(m.gone && m.got >= 3, `a pet mines a nearby ore for the player (+${m.got})`);
    check(m.dist < 6, `the pet comes back to the player (${m.dist.toFixed(1)} m)`);
    // egg pity: at most N ores without an egg
    const e = await p.evaluate(() => { const g = __game, W = g.world; g.cfg.eggs.chance = 0; g.S.ore = 0; let n = 0; for (; n < 10 && !g.pets.eggs.length; n++) { const x = 60 + n, z = 86, y = W.groundY(x, z) + 1; W.base[W.idx(x, y, z)] = 8; W.set(x, y, z, 8); g.mineCell(x, y, z, {}); } return n; });
    check(e === (await p.evaluate(() => __game.cfg.eggs.pity)), `pity gives an egg by ore ${e} even with zero luck`);
    const full = await p.evaluate(() => { const g = __game; __step(3); for (let k = 0; k < 6; k++) g.hatch(g.player.pos.clone()); return { active: g.pets.pets.length, owned: g.S.pets.length, kinds: new Set(g.S.pets).size }; });
    check(full.active === 3 && full.owned === 4 && full.kinds === 4, `at most 3 pets follow, all 4 kinds collected without repeats (${JSON.stringify(full)})`);
    check(p.errors.length === 0, 'no page errors in wonders/pets: ' + p.errors.join(' / '));
    await p.close();
  }
  // ---------------------------------------------------------------- 5 save
  if (run('save')) {
    let p = await open(browser); await startDesk(p);
    const before = await p.evaluate(() => {
      const g = __game, W = g.world; const x = 60, z = 80, y = W.groundY(x, z); g.mineCell(x, y, z, {}); W.set(x, y + 3, z, 9);
      g.S.gauge = 40; g.S.pets.push('fox'); g.S.built.push('tree'); g.blueprints.markDone('tree'); g.flushSave();
      return { edits: W.exportEdits(), inv: g.S.inv, gauge: g.S.gauge };
    });
    await p.waitForTimeout(200);
    const saved = await p.evaluate(() => window.__writes[window.__writes.length - 1]);
    check(saved && saved.edits.length === before.edits.length && saved.gauge === 40, 'save holds world edits, gauge, pets, wonders');
    check(JSON.stringify(saved).length < 60000, `save stays small (${JSON.stringify(saved).length} bytes)`);
    await p.close();
    p = await open(browser, { init: `window.__preset = ${JSON.stringify(saved)};` });
    const after = await p.evaluate(() => { const g = __game; return { edits: g.world.exportEdits(), inv: g.S.inv, gauge: g.S.gauge, tier: g.player.tier, pets: g.pets.pets.length, done: g.blueprints.list[0].done }; });
    check(JSON.stringify(after.edits) === JSON.stringify(before.edits) && JSON.stringify(after.inv) === JSON.stringify(before.inv), 'reload restores the world edits and the hotbar counts');
    check(after.gauge === 40 && after.tier === 1 && after.pets === 1 && after.done, 'reload restores the pickaxe, the pets and finished wonders');
    await p.close();
    // a save that arrives after play started merges in (nothing mined meanwhile is lost)
    p = await open(browser, { noWait: true, init: `window.__preset = ${JSON.stringify(saved)}; window.__holdSave = true;` });
    await p.mouse.click(180, 200); await p.evaluate(() => { __game.locked = true; });
    const late = await p.evaluate(async (st) => {
      const g = __game, W = g.world; const x = 66, z = 82, y = W.groundY(x, z); const t = W.get(x, y, z); g.mineCell(x, y, z, {}); const mine = g.S.inv[t];
      g.flushSave(); const wroteEarly = (window.__writes || []).length;
      while (!window.__releaseSave) await new Promise((r) => setTimeout(r, 20));
      window.__releaseSave(); while (!g.loaded) await new Promise((r) => setTimeout(r, 20));
      return { t, mine, wroteEarly, after: g.S.inv[t], saved: st.inv[t] || 0, gauge: g.S.gauge, edits: g.world.exportEdits().length };
    }, saved);
    check(late.wroteEarly === 0, 'nothing is written before the save has been read');
    check(late.after === late.mine + late.saved && late.gauge >= 40, `late save adds to what was mined meanwhile (${late.mine}+${late.saved}=${late.after})`);
    await p.close();
    // a failing read never writes over the save
    p = await open(browser, { noWait: true, init: 'window.__saveFails = true;' });
    await p.mouse.click(180, 200);
    await p.evaluate(() => { const g = __game, W = g.world; const x = 60, z = 80; g.mineCell(x, W.groundY(x, z), z, {}); g.flushSave(); __step(16); });
    check(await p.evaluate(() => !(window.__writes || []).length && !__game.loaded), 'no write while the save cannot be read');
    await p.close();
    // garbage save does not break the game
    p = await open(browser, { init: 'window.__preset = { v: 1, inv: { 3: "x", 99: 5, 7: -4, 5: 1e30 }, bar: [1, 2], gauge: "big", built: ["nope", 7], pets: ["cat"], edits: [1, 2, "a"], pos: [NaN, 1, 2], sel: 99 };' });
    const g2 = await p.evaluate(() => ({ sel: __game.S.sel, inv: __game.S.inv, gauge: __game.S.gauge, built: __game.S.built, pets: __game.S.pets, y: __game.player.pos.y }));
    check(g2.sel === 8 && !g2.inv[99] && !g2.inv[7] && g2.inv[5] === 99999 && g2.gauge === 0 && !g2.built.length && !g2.pets.length && g2.y > 25, 'bad save values are clamped or dropped');
    check(p.errors.length === 0, 'no page errors with a bad save: ' + p.errors.join(' / '));
    await p.close();
  }
  // ---------------------------------------------------------------- 6 edit mode, run twice
  if (run('host')) {
    const p = await open(browser, { q: '&mode=edit', noWait: true });
    await p.mouse.click(180, 300); await p.keyboard.press('KeyW'); await p.waitForTimeout(300);
    check(await p.evaluate(() => !__game.started && __game.mode === 'edit' && !(window.__writes || []).length), 'edit mode: alive picture, no input, no save');
    await p.evaluate(() => { run('play'); });
    await p.waitForFunction(() => __game && __game.mode === 'play' && __game.loaded);
    await p.evaluate(() => { run('play'); });
    await p.waitForFunction(() => __game && __game.loaded);
    check(await p.evaluate(() => document.querySelectorAll('canvas#cv').length === 1 && document.querySelectorAll('.hud').length === 1), 'run() twice leaves one canvas and one HUD');
    await p.mouse.click(180, 300);
    check(await p.evaluate(() => __game.started), 'the new run starts on a tap');
    check(p.errors.length === 0, 'no page errors across runs: ' + p.errors.join(' / '));
    await p.close();
  }
  // ---------------------------------------------------------------- 7 touch
  if (run('touch')) {
    const p = await open(browser, { touch: true });
    const cdp = await p.context().newCDPSession(p);
    const touch = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map(([x, y, id]) => ({ x, y, id })) });
    await touch('touchStart', [[180, 200, 1]]); await touch('touchEnd', []);
    await p.waitForFunction(() => __game.started);
    await step(p, 0.3);
    check(await p.evaluate(() => !document.querySelector('.touch').hidden && __game.touch), 'touch device: stick and buttons appear');
    const sp = await p.evaluate(() => { __game.player.spawnAt(62.5, 80.5); __game.player.yaw = Math.PI; __step(0.3); return __game.player.pos.toArray(); });
    await touch('touchStart', [[60, 520, 1]]); await touch('touchMove', [[60, 470, 1]]);
    await step(p, 1);
    const moved = await p.evaluate(() => __game.player.pos.toArray());
    check(Math.hypot(moved[0] - sp[0], moved[2] - sp[2]) > 1.5, 'the stick walks');
    // second finger taps the hotbar while the stick is held
    const slot = await p.evaluate(() => { __game.S.bar[4] = 3; __game.S.inv[3] = 2; const r = document.querySelectorAll('.slot')[4].getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; });
    await touch('touchStart', [[60, 470, 1], [slot[0], slot[1], 2]]); await touch('touchEnd', [[slot[0], slot[1], 2]]);
    check(await p.evaluate(() => __game.S.sel === 4), 'second finger on a hotbar slot selects it while walking');
    await touch('touchEnd', []);
    // hold on a block to mine it
    await p.evaluate(() => { __arena(); __game.player.pitch = -1.1; __step(0.2); });
    const m0 = await p.evaluate(() => __game.S.mined);
    await touch('touchStart', [[180, 330, 3]]);
    await step(p, 2);
    await touch('touchEnd', []);
    check(await p.evaluate((m0) => __game.S.mined > m0, m0), 'holding a finger on a block mines it');
    // drag looks around, does not mine
    const yaw0 = await p.evaluate(() => __game.player.yaw), m1 = await p.evaluate(() => __game.S.mined);
    await touch('touchStart', [[250, 300, 4]]); for (let i = 1; i <= 6; i++) await touch('touchMove', [[250 - i * 15, 300, 4]]); await step(p, 1); await touch('touchEnd', []);
    check(await p.evaluate(([y, m]) => Math.abs(__game.player.yaw - y) > 0.2 && __game.S.mined === m, [yaw0, m1]), 'a drag turns the view and mines nothing');
    // place mode + tap places
    const pl = await p.evaluate(() => { const g = __game; __arena(); g.S.inv[5] = 4; g.S.bar[0] = 5; g.S.sel = 0; g.placeMode = true; g.texts(); g.player.pitch = -0.9; __step(0.1); return g.S.inv[5]; });
    await touch('touchStart', [[180, 330, 5]]); await touch('touchEnd', []);
    check(await p.evaluate((n) => __game.S.inv[5] === n - 1, pl), 'in build mode a tap places a block');
    const jb = await p.evaluate(() => { const r = document.querySelector('.b-jump').getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2, r.width]; });
    check(jb[2] >= 48, `jump button is big enough (${jb[2]} css px at 360 wide)`);
    const y0 = await p.evaluate(() => { __step(0.5); return __game.player.pos.y; });
    await touch('touchStart', [[jb[0], jb[1], 6]]); await step(p, 0.2); await touch('touchEnd', []);
    check(await p.evaluate((y) => __game.player.pos.y > y + 0.5, y0), 'jump button jumps');
    check(p.errors.length === 0, 'no page errors with touch: ' + p.errors.join(' / '));
    await p.close();
  }
  // ---------------------------------------------------------------- bugs found by the bug hunt (each proven to fail without its fix)
  if (run('bugs')) {
    let p = await open(browser); await startDesk(p);
    const b1 = await p.evaluate(() => { const g = __game, W = g.world, sp = g.cfg.world.spawn, x = Math.floor(sp[0]), z = Math.floor(sp[2]); for (let y = 0; y < W.H; y++) W.set(x, y, z, 0); g.lastRespawn = -9; g.respawn(); __step(3); return { y: g.player.pos.y, ground: g.player.onGround }; });
    check(b1.y > 25 && b1.ground, `spawn column dug to the void: a cloud catches the player (y ${b1.y.toFixed(1)})`);
    const b2 = await p.evaluate(() => { const g = __game, W = g.world, P = g.player; __arena(); g.hatch(P.pos.clone()); W.set(11, 46, 13, 8); const i = W.idx(11, 46, 13); for (const q of g.pets.pets) q.seekT = 0; __step(6); return W.cells[i]; });
    check(b2 === 8, 'pets leave ore the player placed (and wonder ore) alone');
    const b6 = await p.evaluate(() => { const g = __game, W = g.world; __arena(); W.set(10, 46, 13, 8); const inv = g.S.inv[8] || 0, gauge = g.S.gauge, ore = g.S.ore; g.mineCell(10, 46, 13, {}); return { got: (g.S.inv[8] || 0) - inv, dg: g.S.gauge - gauge, dore: g.S.ore - ore }; });
    check(b6.got === 1 && b6.dg === 0 && b6.dore === 0, `placed ore mines back as one block, no bonus, gauge or egg roll (${JSON.stringify(b6)})`);
    const b3 = await p.evaluate(() => { const g = __game; __arena(); g.locked = false; g.dragLook = true; g.S.inv[5] = 3; g.S.bar[0] = 5; g.S.sel = 0; g.player.pitch = -0.9; __step(0.1); const r = g.root.getBoundingClientRect(); g.cv.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 2, pointerType: 'mouse', pointerId: 9, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2 })); g.cv.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, button: 2, pointerType: 'mouse', pointerId: 9, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2 })); __step(0.2); const n = g.S.inv[5]; g.dragLook = false; g.locked = true; return n; });
    check(b3 === 2, 'without pointer lock a right click still places');
    const b8 = await p.evaluate(() => { const g = __game; g.S.pets = ['fox', 'bunny', 'turtle', 'dragon']; g.S.gauge = g.cfg.tools[1].at - 3; g.player.setTier(0); g.hatch(g.player.pos.clone()); return { tier: g.tier(), held: g.player.tier, lvl: g.S.petLvl }; });
    check(b8.tier === 1 && b8.held === 1 && b8.lvl === 1, 'pet power-up bonus that crosses a tool threshold upgrades the pickaxe in hand');
    const b9 = await p.evaluate(() => { const g = __game; g.pets.egg(3, 40, 3); __step(0.6); const e = g.pets.eggs[g.pets.eggs.length - 1]; return e ? e.g.position.y : -1; });
    check(b9 > 39, `an egg laid over the void stays where it was laid (y ${b9.toFixed ? b9.toFixed(1) : b9})`);
    const b11 = await p.evaluate(() => { const g = __game, W = g.world, b = g.blueprints.list[0], [x, y, z] = b.cells[b.cells.length - 1]; W.set(x, y, z, 5); const n0 = g.S.inv[5] || 0; for (const k in b.cost) g.S.inv[k] = (g.S.inv[k] || 0) + b.cost[k]; g.blueprints.start(b); return (g.S.inv[5] || 0) - n0; });
    check(b11 === 1, 'a placed block in a wonder footprint is given back');
    // a save taken in the middle of assembling: on reload the wonder is complete and not paid twice
    await p.evaluate(() => { __step(16); });
    await p.close();
    p = await open(browser); await startDesk(p);
    const mid = await p.evaluate(() => { const g = __game, b = g.blueprints.list[1]; for (const k in b.cost) g.S.inv[k] = b.cost[k]; g.player.spawnAt(b.pad.x + 0.5, b.pad.z + 0.5); __step(0.1); g.placeOrBuild(null); __step(1); g.flushSave(); return new Promise((r) => setTimeout(() => r(window.__writes[window.__writes.length - 1]), 100)); });
    await p.close();
    p = await open(browser, { init: `window.__preset = ${JSON.stringify(mid)};` });
    const b4 = await p.evaluate(() => { const g = __game, b = g.blueprints.list[1]; return { done: b.done, ok: b.cells.every(([x, y, z, t]) => g.world.get(x, y, z) === t), lvl: g.S.petLvl }; });
    check(b4.done && b4.ok, 'save taken mid-assembly: the wonder is whole after reload, not asked for again');
    await p.close();
    // a mined block of a finished wonder stays mined after reload
    p = await open(browser); await startDesk(p);
    const fin = await p.evaluate(() => { const g = __game, b = g.blueprints.list[0]; for (const k in b.cost) g.S.inv[k] = b.cost[k]; g.player.spawnAt(b.pad.x + 0.5, b.pad.z + 0.5); __step(0.1); g.placeOrBuild(null); __step(14); const [x, y, z] = b.cells[b.cells.length - 1]; g.mineCell(x, y, z, {}); g.flushSave(); return new Promise((r) => setTimeout(() => r({ s: window.__writes[window.__writes.length - 1], c: [x, y, z] }), 100)); });
    await p.close();
    p = await open(browser, { init: `window.__preset = ${JSON.stringify(fin.s)};` });
    check(await p.evaluate((c) => __game.world.get(c[0], c[1], c[2]) === 0 && __game.blueprints.list[0].done, fin.c), 'a block mined from a finished wonder stays mined after reload');
    await p.close();
    p = await open(browser, { init: 'window.__preset = { v: 1, bar: ["5", 19, 1.5, 3, 0, 0, 0, 0, 0], inv: { 19: 4, "1e1": 3, 3: 2 }, petLvl: 1, pets: ["fox"] };' });
    const b12 = await p.evaluate(() => ({ bar: __game.S.bar.slice(0, 4), inv: __game.S.inv, lvl: __game.pets.pets.map((q) => q.lvl) }));
    check(JSON.stringify(b12.bar) === '[0,0,0,3]' && !b12.inv[19] && !b12.inv['1e1'] && b12.inv[3] === 2, `saved hotbar/inventory keep only real block ids, never pads (${JSON.stringify(b12)})`);
    check(b12.lvl.join() === '1', 'pet power-up survives a reload');
    const lb = await p.evaluate(async () => { const g = __game; let bad = 0; const on = () => { bad++; }; window.addEventListener('unhandledrejection', on); const keep = lib.addPlayerScoreToLeaderboard; lib.addPlayerScoreToLeaderboard = () => Promise.reject(new Error('guest')); g.wonderDone(g.blueprints.list[3]); await new Promise((r) => setTimeout(r, 200)); lib.addPlayerScoreToLeaderboard = keep; window.removeEventListener('unhandledrejection', on); return bad; });
    check(lb === 0, 'a refused leaderboard post (guest) is caught, no unhandled rejection');
    check(p.errors.length === 0, 'no page errors in bug checks: ' + p.errors.join(' / '));
    // run() twice before Three.js has arrived: one game, not two
    const two = await p.evaluate(() => new Promise((res) => { const T = window.THREE; window.THREE = undefined; const live = window.__liveGames; run('play'); run('play'); window.THREE = T; window.dispatchEvent(new Event('three-ready')); setTimeout(() => res({ before: live, after: window.__liveGames }), 300); }));
    check(two.after === 1, `run() twice before the library loads leaves one live game (${two.before} → ${two.after})`);
    await p.close();
  }
  // ---------------------------------------------------------------- comfort: no glare (user: "mataku gak suka silau")
  if (run('comfort')) {
    const LIM = { white: 0.015, bright: 0.12, meanL: 165 };
    const p = await open(browser);
    const g0 = await p.evaluate(() => __game.glare());
    const judge = (name, r) => check(r.white <= LIM.white && r.bright <= LIM.bright && r.meanL <= LIM.meanL, `no glare: ${name} (white ${(r.white * 100).toFixed(1)}%, bright ${(r.bright * 100).toFixed(1)}%, mean ${r.meanL.toFixed(0)})`);
    judge('title panorama', g0);
    await startDesk(p);
    const scene = (name, fn, arg) => p.evaluate(([fn, arg]) => { const g = __game; new Function('g', 'arg', fn)(g, arg); g.frame(1 / 30); g.frame(1 / 30); return g.glare(); }, [fn, arg]).then((r) => judge(name, r));
    const at = 'g.player.spawnAt(arg[0], arg[1]); g.player.yaw = arg[2]; g.player.pitch = arg[3]; g.phase = arg[4];';
    await scene('first view', at, [62.5, 74.5, 0.35, -0.15, 0.15]);
    await scene('looking at the sky', at, [62.5, 74.5, 0.35, 0.35, 0.15]);
    await scene('next to a pad beam and hologram', 'const b = g.blueprints.list[1]; g.player.spawnAt(b.pad.x - 4, b.pad.z); g.player.yaw = -Math.PI / 2; g.player.pitch = 0.1; g.phase = 0.15;');
    await scene('standing on a pad', 'const b = g.blueprints.list[0]; g.player.spawnAt(b.pad.x + 0.5, b.pad.z + 0.5); g.player.yaw = 0; g.player.pitch = 0.2; g.phase = 0.15;');
    await scene('candy haven clouds', at, [66, 40, -0.5, -0.05, 0.15]);
    await scene('golden hour toward the sun', 'g.player.spawnAt(64, 84); g.phase = 0.47; g.frame(1 / 30); const d = g.sky.sunDir; g.player.yaw = Math.atan2(-d.x, -d.z); g.player.pitch = Math.asin(d.y);');
    await scene('noon toward the sun', 'g.player.spawnAt(64, 84); g.phase = 0.22; g.frame(1 / 30); const d = g.sky.sunDir; g.player.yaw = Math.atan2(-d.x, -d.z); g.player.pitch = Math.min(1.4, Math.asin(d.y));');
    await scene('night', at, [64, 84, 0, 0.05, 0.72]);
    await scene('standing on a pad at night, looking down', 'const b = g.blueprints.list[0]; g.player.spawnAt(b.pad.x + 0.5, b.pad.z + 0.5); g.player.yaw = 0; g.player.pitch = -1.2; g.phase = 0.72;');
    await scene('looking down at candy at noon', 'g.player.spawnAt(66, 36); g.player.yaw = 0; g.player.pitch = -1.3; g.phase = 0.22;');
    await scene('inside a glass geode', 'const W = g.world; let best = null; for (const i of W.ores) { const [x, y, z] = W.xyz(i); if (x > 85 && W.get(x, y, z) === 7) { let glass = 0; for (let d = 1; d <= 3; d++) if (W.get(x + d, y, z) === 12) glass++; if (glass) { best = [x, y, z]; break; } } } if (best) { const [x, y, z] = best; for (let h = 0; h < 2; h++) W.set(x, y + h, z, 0); g.player.pos.set(x + 0.5, y, z + 0.5); } g.player.yaw = 0; g.player.pitch = 0; g.phase = 0.22;');
    await scene('on the rainbow bridge', 'const b = g.blueprints.list[2]; g.blueprints.markDone("bridge", true); __step(0.2); const c = b.cells[Math.floor(b.cells.length / 2)]; g.player.pos.set(c[0] + 0.5, c[1] + 2, c[2] + 0.5); __step(0.6); g.player.pitch = -0.8; g.phase = 0.22;');
    await scene('low quality tier at noon (no shadows)', 'g.perf.tier = 2; g.applyTier(); g.player.spawnAt(62.5, 74.5); g.player.yaw = 0.35; g.player.pitch = -0.15; g.phase = 0.22;');
    await p.evaluate(() => { const g = __game; g.perf.tier = 0; g.applyTier(); });
    // the cosmic pickaxe: the shockwave ring at most once a second, the camera barely wobbles
    const cos = await p.evaluate(() => { const g = __game, W = g.world, P = g.player; __arena(); for (let x = 4; x <= 16; x++) for (let z = 4; z <= 14; z++) for (let y = 46; y < 50; y++) W.set(x, y, z, 3); P.pos.set(10.5, 50, 16.5); __step(0.3); P.pitch = -0.5; g.S.gauge = g.cfg.tools[3].at; P.setTier(3); let n = 0; const sh = g.vfx.shock.bind(g.vfx); g.vfx.shock = (...a) => { n++; sh(...a); }; let maxT = 0; g.mouseMine = true; for (let i = 0; i < 120; i++) { __step(1 / 30); maxT = Math.max(maxT, g.trauma); P.yaw += 0.02; } g.mouseMine = false; g.vfx.shock = sh; return { perSec: n / 4, maxT, mined: g.S.mined }; });
    check(cos.perSec <= 1 && cos.mined > 10, `cosmic mining: shockwave ring ${cos.perSec.toFixed(2)}/s (max 1), ${cos.mined} blocks mined`);
    check(cos.maxT <= 0.3, `mining keeps camera shake small (trauma peak ${cos.maxT.toFixed(2)})`);
    // celebrations: fireworks + confetti right in view
    await scene('wonder fireworks in view', 'g.player.spawnAt(62.5, 80.5); g.player.yaw = 0; g.player.pitch = 0.2; g.phase = 0.15; const P = g.player.pos; g.vfx.fireworks(P.x, P.y, P.z - 8, 7); g.vfx.confetti(P.x, P.y + 2, P.z - 4, 160); for (let i = 0; i < 25; i++) g.frame(1 / 30);');
    // full-screen flashes are tinted, soft and never white
    const fl = await p.evaluate(() => { const g = __game, f = g.el.fade, out = []; const peek = () => { const cs = getComputedStyle(f); out.push({ o: g.flashPeak, bg: cs.backgroundColor, img: cs.backgroundImage }); };
      g.lastRespawn = -9; g.respawn(); peek(); g.toolUp(1); peek(); g.hatch(g.player.pos.clone()); peek(); g.flash(0.5); peek(); return out; });
    check(fl.every((x) => x.o > 0 && x.o <= 0.12), `screen flashes stay soft (peaks ${fl.map((x) => x.o).join(', ')})`);
    check(fl.every((x) => x.bg !== 'rgb(255, 255, 255)' && !/rgb\(255, 255, 255\)/.test(x.img)), 'screen flashes are never plain white');
    check(p.errors.length === 0, 'no page errors in comfort checks: ' + p.errors.join(' / '));
    await p.close();
  }
  // ---------------------------------------------------------------- 8 chaos: 600 seeded random inputs
  if (run('chaos')) {
    const p = await open(browser); await startDesk(p);
    let s = 12345; const rnd = () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
    const keys = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space', 'KeyE', 'KeyF', 'Digit1', 'Digit4', 'Digit9'];
    for (let i = 0; i < 600; i++) {
      const r = rnd();
      if (r < 0.35) await p.keyboard.press(keys[Math.floor(rnd() * keys.length)]);
      else if (r < 0.55) await p.evaluate((v) => { __game.mouseMine = v; }, rnd() < 0.6);
      else if (r < 0.75) await p.evaluate(([a, b]) => __game.look(a, b), [(rnd() - 0.5) * 0.6, (rnd() - 0.5) * 0.4]);
      else if (r < 0.8) await p.evaluate(() => __game.respawn());
      else if (r < 0.83) await p.mouse.click(rnd() * 360, rnd() * 640);
      await step(p, 0.06);
    }
    const st = await p.evaluate(() => ({ y: __game.player.pos.y, ok: Number.isFinite(__game.player.pos.x + __game.player.pos.y + __game.player.pos.z), inv: Object.values(__game.S.inv).every((n) => n >= 0) }));
    check(st.ok && st.inv, 'after 600 random inputs: position finite, no negative counts');
    check(p.errors.length === 0, 'no page errors in 600 random inputs: ' + p.errors.join(' / '));
    await p.close();
  }
  // ---------------------------------------------------------------- 9 languages
  if (run('lang')) {
    for (const [l, loc] of [['ar', 'ar-SA'], ['es', 'es-ES'], ['vi', 'vi-VN'], ['hi', 'hi-IN'], ['bn', 'bn-BD'], ['id', 'id-ID'], ['en', 'fr-FR']]) {
      const p = await open(browser, { locale: loc });
      const r = await p.evaluate(() => ({ lang: __game.lang, dir: document.querySelector('.hud').dir, play: document.querySelector('.play').textContent, over: (() => { const b = document.querySelector('.play').getBoundingClientRect(), s = document.querySelector('.play span').getBoundingClientRect(); return s.width > b.width; })() }));
      check(r.lang === l && (l === 'ar') === (r.dir === 'rtl') && r.play.length > 1 && !r.over, `language ${loc} → ${r.lang} (${r.play})`);
      await p.close();
    }
  }
  console.log(fails.length ? `\n${fails.length} FAILED` : '\nall passed');
  await browser.close(); srv.close();
  process.exit(fails.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
