// PROTOTYPE - NOT FOR PRODUCTION
// Soak: many levels in one page with the bot finger. Fails on page errors, a level that does not finish, a broken
// save, a level that pays nothing, or GPU objects that keep growing from level to level.
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
  await g(() => { const a = document.querySelector('#app').getBoundingClientRect(); document.querySelector('#app').dispatchEvent(new PointerEvent('pointerdown', { pointerId: 9, clientX: a.left + a.width / 2, clientY: a.top + a.height * 0.4, bubbles: true })); window.dispatchEvent(new PointerEvent('pointerup', { pointerId: 9, bubbles: true })); __bot(true); });
  const mem = [], kinds = new Set(); let coins0 = 0;
  for (let i = 0; i < levels; i++) {
    const t0 = Date.now();
    while (Date.now() - t0 < 120000) { if (await g(() => __game.resultsOpen)) break; await page.waitForTimeout(200); }
    // count GPU objects once nothing is falling (a falling piece holds its own geometry until it lands)
    await page.waitForFunction(() => !__game.W.falls.length && !__game.W.fuses.length, null, { timeout: 15000 }).catch(() => {}); await page.waitForTimeout(400);
    const st = await g(() => ({ open: __game.resultsOpen, n: __game.W.n, kind: __game.W.kind, lvl: __game.save.level, coins: __game.save.coins, t: __game.textures, geo: __game.geometries, last: (window.__writes || []).slice(-1)[0], c: __game.scene.counts }));
    kinds.add(st.kind);
    check(st.open && st.lvl === i + 1 && st.coins > coins0 && st.last && st.last.level === st.lvl, `level ${i + 1} (${st.kind}): finished, paid (${st.coins} coins), saved`);
    coins0 = st.coins; mem.push([st.t, st.geo]);
    await g(() => document.querySelector('#nextBtn').click());
    await page.waitForTimeout(300);
  }
  console.log('gpu [textures, geometries] after each level:', JSON.stringify(mem));
  // geometry per level depends on the building (chunks), so compare the same building kind a full cycle apart
  const same = mem.length > 8 ? Math.abs(mem[mem.length - 1][1] - mem[mem.length - 1 - 8][1]) : 0;
  const tex = mem.slice(1).map((m) => m[0]);
  check(Math.max(...tex) - Math.min(...tex) <= 1, 'GPU textures stay flat');
  check(same <= 4, `geometries do not pile up (same building 8 levels apart differs by ${same})`);
  check(kinds.size === Math.min(8, levels), `every building came up (${[...kinds].join(', ')})`);
  check(errors.length === 0, 'no page errors: ' + (errors.join(' | ') || 'none'));
  await browser.close(); server.close();
  console.log(fails.length ? `\n${fails.length} FAILED` : '\nall passed'); process.exit(fails.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
