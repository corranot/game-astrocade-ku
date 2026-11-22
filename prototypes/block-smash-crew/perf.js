// PROTOTYPE - NOT FOR PRODUCTION
// Frame cost on a slow phone stand-in: phone layout, CPU slowed 4x, a level played by the bot through smash time
// (bombs every throw). Prints the game code's ms per frame without the GL submit (what our code costs on a phone's CPU)
// and frames per second here, and checks that
// the quality step-down (no shadows, lower resolution, half the debris) switches on. SwiftShader draws on the CPU,
// so FPS here is far below a real phone's; the script ms is the comparable number.
// Usage: node perf.js
const { chromium } = require('playwright');
const { serve, BOT, GPU } = require('./playtest.js');
(async () => {
  const server = serve(), browser = await chromium.launch({ args: GPU });
  const ctx = await browser.newContext({ viewport: { width: 360, height: 640 }, isMobile: true, hasTouch: true });
  const page = await ctx.newPage(); const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript('window.__speed = 1;' + BOT);
  await page.goto(`http://localhost:${server.address().port}/?local`);
  await page.waitForFunction(() => window.__game && __game.W, null, { timeout: 40000 });
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 }); await cdp.send('Performance.enable');
  await page.evaluate(() => { __game.newLevel(2); const W = __game.W; W.got = 3; W.phase = 'fever'; W.fever = 99; __bot(true); });
  await page.waitForTimeout(3000);
  // wrap the frame's pieces: the GL submit (renderer.render) is SwiftShader's CPU drawing here, a GPU's job on a phone
  const r = await page.evaluate(async () => {
    const sc = __game.scene, ren = sc.renderer, T = { upd: 0, ren: 0, n: 0 }, u0 = sc.update, r0 = ren.render.bind(ren);
    ren.render = (a, b) => { const t = performance.now(); r0(a, b); T.ren += performance.now() - t; };
    sc.update = (w, dt) => { const t = performance.now(); u0(w, dt); T.upd += performance.now() - t; T.n++; };
    const t0 = performance.now(); await new Promise((res) => setTimeout(res, 4000));
    sc.update = u0; ren.render = r0;
    return { n: T.n, game: (T.upd - T.ren) / T.n, gl: T.ren / T.n, fps: T.n / (performance.now() - t0) * 1000 };
  });
  const q = await page.evaluate(() => ({ quality: __game.scene.quality, counts: __game.scene.counts }));
  console.log(`game code ${r.game.toFixed(1)} ms/frame at CPU 4x (GL submit ${r.gl.toFixed(1)} ms, ${r.fps.toFixed(1)} fps here on SwiftShader), quality ${q.quality}, ${JSON.stringify(q.counts)}`);
  const ok = r.game < 8 && q.quality < 1 && errors.length === 0;
  console.log((ok ? 'ok   ' : 'FAIL ') + 'game code under 8 ms per frame on a 4x slower CPU, and the slow-device step-down switched on' + (errors.length ? ' errors: ' + errors.join(' | ') : ''));
  await browser.close(); server.close(); process.exit(ok ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });
