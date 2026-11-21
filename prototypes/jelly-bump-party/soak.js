// PROTOTYPE - NOT FOR PRODUCTION
// Soak: many matches in one page with the bot finger on red (and blue joined halfway). Fails on page errors, a
// broken save, a match that pays nothing, hats that stop coming, or GPU objects that keep growing.
// Usage: node soak.js [matches]
const { chromium } = require('playwright');
const { serve, open, GPU } = require('./playtest.js');
const matches = Number(process.argv[2]) || 10;
const fails = []; const check = (ok, m) => { console.log((ok ? 'ok   ' : 'FAIL ') + m); if (!ok) fails.push(m); };
(async () => {
  const server = serve(), browser = await chromium.launch({ args: GPU });
  const { page, errors } = await open(browser, '&speed=3', { port: server.address().port, speed: 3 });
  const g = (fn, a) => page.evaluate(fn, a);
  await page.waitForFunction(() => __game.saveLoaded, null, { timeout: 10000 });
  await g(() => { const r = document.querySelector('#seat0 .pad').getBoundingClientRect(); document.querySelector('#app').dispatchEvent(new PointerEvent('pointerdown', { pointerId: 99, clientX: r.left - 200, clientY: r.top - 200, bubbles: true })); window.dispatchEvent(new PointerEvent('pointerup', { pointerId: 99, bubbles: true })); __bot(0, true); });
  // every hat once first: each hat kind uploads its shared shapes the first time it is drawn (warm-up, not a leak)
  await g(async () => { for (const h of window.gameConfig.hats) { __game.scene.setHat(0, h.id); await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))); } __game.scene.setHat(0, __game.save.hat); });
  const mem = [], mods = new Set(); let coins0 = 0;
  for (let i = 0; i < matches; i++) {
    if (i === Math.floor(matches / 2)) await g(() => { document.querySelector('#seat1 .join').dispatchEvent(new PointerEvent('pointerdown', { pointerId: 98, bubbles: true })); window.dispatchEvent(new PointerEvent('pointerup', { pointerId: 98, bubbles: true })); __bot(1, true); });
    const t0 = Date.now();
    while (Date.now() - t0 < 150000) { const s = await g(() => ({ p: !document.querySelector('#panel').hidden, mod: __game.M.mod })); mods.add(s.mod); if (s.p) break; await page.waitForTimeout(200); }
    const st = await g(() => ({ m: __game.save.matches, coins: __game.save.coins, hats: __game.save.hats.length, t: __game.textures, geo: __game.geometries, last: (window.__writes || []).slice(-1)[0], panel: !document.querySelector('#panel').hidden }));
    check(st.panel && st.m === i + 1 && st.coins > coins0 && st.last && st.last.matches === st.m, `match ${i + 1}: finished, paid (${st.coins} coins, ${st.hats} hats), saved`);
    coins0 = st.coins; mem.push([st.t, st.geo]);
    await g(() => document.querySelector('#again').click());
    await page.waitForTimeout(300);
  }
  console.log('gpu [textures, geometries] per match:', JSON.stringify(mem));
  const late = mem.slice(2);
  check(Math.max(...late.map((m) => m[0])) - Math.min(...late.map((m) => m[0])) <= 1 && Math.max(...late.map((m) => m[1])) - Math.min(...late.map((m) => m[1])) <= 2, 'GPU textures and geometries stay flat');
  check(mods.size === 4, `all four floors came up (${[...mods].join(', ')})`);
  const hats = await g(() => __game.save.hats.length); check(hats >= 3, `hats keep unlocking (${hats})`);
  check(errors.length === 0, 'no page errors: ' + (errors.join(' | ') || 'none'));
  await browser.close(); server.close();
  console.log(fails.length ? `\n${fails.length} FAILED` : '\nall passed'); process.exit(fails.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
