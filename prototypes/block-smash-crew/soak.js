// PROTOTYPE - NOT FOR PRODUCTION
// Soak: many levels in one page with the bot finger. Fails on page errors, a level that does not finish, a broken
// save, a level that pays nothing, GPU objects that keep growing from level to level, or frame time that keeps
// climbing (late levels slower than early ones: a leak or a per-frame cost that grows; not an absolute FPS test).
// Usage: node soak.js [levels]
const { chromium } = require('playwright');
const { serve, open, GPU } = require('./playtest.js');
const levels = Number(process.argv[2]) || 10;
const fails = []; const check = (ok, m) => { console.log((ok ? 'ok   ' : 'FAIL ') + m); if (!ok) fails.push(m); };
(async () => {
  const server = serve(), browser = await chromium.launch({ args: GPU });
  const { page, errors } = await open(browser, '&speed=3', { port: server.address().port, speed: 3 });
  const g = (fn, a) => page.evaluate(fn, a);
  await page.waitForFunction(() => __game.saveLoaded, null, { timeout: 10000 });
  // frame-time sampler: every rAF gap since the last read, so each level gets its own median
  await g(() => { window.__ft = []; let last = performance.now(); const tick = (t) => { window.__ft.push(t - last); last = t; requestAnimationFrame(tick); }; requestAnimationFrame(tick); });
  const med = (a) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[s.length >> 1] : 0; };
  await g(() => { const a = document.querySelector('#app').getBoundingClientRect(); document.querySelector('#app').dispatchEvent(new PointerEvent('pointerdown', { pointerId: 9, clientX: a.left + a.width / 2, clientY: a.top + a.height * 0.4, bubbles: true })); window.dispatchEvent(new PointerEvent('pointerup', { pointerId: 9, bubbles: true })); __bot(true); });
  // the same fresh building before and after the run: a leak shows as more GPU geometries the second time
  // (its frame time too: the same scene before and after the run is the only fair comparison, since buildings differ in size)
  const med0 = (a) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[s.length >> 1] : 0; };
  const fresh = async () => { const r = await g(async () => { const n = __game.W.n; __game.newLevel(0); await new Promise((r) => setTimeout(r, 600)); const geo = __game.geometries; window.__ft.splice(0); await new Promise((r) => setTimeout(r, 2500)); const ft = window.__ft.splice(0); __game.newLevel(n); return { geo, ft }; }); fresh.ft = med0(r.ft); return r.geo; };
  // warm up: every tool thrown once (each shot kind builds its shared geometry the first time, then reuses it)
  await g(async () => { const W = __game.W; W.fever = 5; for (const t of W.cfg.tools) if (t.id !== 'hammer') { W.cool[t.id] = 0; __game.WD.useTool(W, t.id, { x: W.chest.x, y: 1, z: W.chest.z }); } await new Promise((r) => setTimeout(r, 3000)); });
  // and the robots' bounded pools: every costume, face and the full pool of sign cards drawn once
  await g(async () => { const W = __game.W, base = W.bots[1], sc = __game.scene, extra = [];
    // in front of the eye (what is out of view is never drawn, so never uploaded)
    const fx = -Math.sin(sc.yaw), fz = -Math.cos(sc.yaw), h = W.hero;
    for (let k = 0; k < 30; k++) { const d = 3 + Math.floor(k / 6) * 0.8, side = ((k % 6) - 2.5) * 0.35 * d / 3; extra.push({ ...base, id: 7000 + k, sign: k, costume: (k % 7) - 1, mouth: k % 5, happy: 0, pts: null, x: h.x + fx * d - fz * side, z: h.z + fz * d + fx * side, yaw: Math.atan2(-fx, -fz) }); }
    W.bots.push(...extra);
    // marching, knocked (X and dizzy eyes), getting up (the smile): every face cell once
    // (all in one go, drawn by hand: the game's own loop never steps these stand-ins)
    for (const st of ['march', 'down', 'reboot']) { for (const b of extra) b.state = st; sc.update(W, 0.016); }
    W.bots.splice(W.bots.length - extra.length, extra.length); sc.update(W, 0.016); });
  const geo0 = await fresh(), ft0 = fresh.ft;
  const mem = [], kinds = new Set(), ft = []; let coins0 = 0, cards = 0;
  for (let i = 0; i < levels; i++) {
    const t0 = Date.now();
    kinds.add(await g(() => __game.W.kind));
    // a level is finished when it is paid and saved: mostly the next building then follows by itself (the chain),
    // every flow.cardEvery buildings (once flow.cardAfterSec are played) the result card opens instead
    while (Date.now() - t0 < 120000) { if (await g((k) => __game.resultsOpen || __game.save.level > k, i)) break; await page.waitForTimeout(100); }
    const st = await g(() => ({ open: __game.resultsOpen, lvl: __game.save.level, coins: __game.save.coins, t: __game.textures, geo: __game.geometries, last: (window.__writes || []).slice(-1)[0], every: window.gameConfig.flow.cardEvery, played: __game.flow.playT, after: window.gameConfig.flow.cardAfterSec }));
    check(st.lvl === i + 1 && st.coins > coins0 && st.last && st.last.level === st.lvl, `level ${i + 1}: finished, paid (${st.coins} coins), saved${st.open ? ', result card' : ', next building follows'}`);
    if (st.open) { cards++; check(st.played >= st.after, `the card at level ${i + 1} came after ${st.after} s of play (${st.played.toFixed(0)} s)`); }
    coins0 = st.coins; mem.push([st.t, st.geo]);
    ft.push(+med(await g(() => window.__ft.splice(0))).toFixed(1));
    if (st.open) {
      // count GPU objects once nothing is falling (a falling piece holds its own geometry until it lands)
      await page.waitForFunction(() => !__game.W.falls.length && !__game.W.fuses.length, null, { timeout: 15000 }).catch(() => {}); await page.waitForTimeout(400);
      await g(() => document.querySelector('#nextBtn').click());
    } else await page.waitForFunction((k) => __game.W.n > k, i, { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(300);
  }
  check(cards <= Math.floor(levels / 3), `at most one result card per 3 buildings (${cards} in ${levels} levels)`);
  console.log('gpu [textures, geometries] after each level:', JSON.stringify(mem));
  // buildings grow every cycle of 8, so a level 8 apart is not the same size: compare the same fresh level 1
  const geo1 = await fresh(), same = geo1 - geo0, ft1 = fresh.ft;
  console.log('median frame ms per level:', JSON.stringify(ft));
  // the same fresh level 1 before and after the run. rAF gaps snap to 16.7 ms steps, so one step up is already 2x
  // slower: fail on a climb of half a 60 Hz frame (8 ms). (Levels of the run are not compared with each other: a
  // bigger building is slower by itself, and that read as a climb whenever the early ones ran at 60.)
  check(ft1 - ft0 < 8, `frame time of the same fresh level does not climb over the run (before ${ft0.toFixed(1)} ms, after ${ft1.toFixed(1)} ms)`);
  const tex = mem.slice(1).map((m) => m[0]);
  check(Math.max(...tex) - Math.min(...tex) <= 1, 'GPU textures stay flat');
  check(same <= 2, `geometries do not pile up (the same fresh level 1: ${geo0} before, ${geo1} after 10 levels)`);
  check(kinds.size === Math.min(8, levels), `every building came up (${[...kinds].join(', ')})`);
  check(errors.length === 0, 'no page errors: ' + (errors.join(' | ') || 'none'));
  await browser.close(); server.close();
  console.log(fails.length ? `\n${fails.length} FAILED` : '\nall passed'); process.exit(fails.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
