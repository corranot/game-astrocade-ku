// Guest smoke test of live Astrocade games: phone portrait, loads page, waits, screenshots, collects frame errors.
const { chromium } = require('playwright');
const games = JSON.parse(process.argv[2]); const out = process.argv[3];
(async () => {
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const res = {};
  for (const [k, id] of Object.entries(games)) {
    const c = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true, userAgent: 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36' });
    const p = await c.newPage(); const errs = []; let frameUrl = null;
    p.on('pageerror', e => errs.push('page: ' + String(e).slice(0, 160)));
    p.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text().slice(0, 160)); });
    const t0 = Date.now();
    try {
      await p.goto('https://www.astrocade.com/games/x/' + id, { waitUntil: 'domcontentloaded', timeout: 45000 });
      await p.waitForTimeout(12000);
      const fr = p.frames().filter(f => f !== p.mainFrame());
      const gf = fr.find(f => /cdn|game|play/i.test(f.url())) || fr[0];
      frameUrl = gf ? gf.url().slice(0, 60) : null;
      await p.screenshot({ path: `${out}/${k}-live-load.jpg`, quality: 70 });
      // one tap in the middle of the game area
      await p.touchscreen.tap(195, 500); await p.waitForTimeout(3000);
      await p.screenshot({ path: `${out}/${k}-live-tap.jpg`, quality: 70 });
      res[k] = { ok: true, frames: fr.length, frameUrl, ms: Date.now() - t0, errs: errs.slice(0, 8), nErr: errs.length };
    } catch (e) { res[k] = { ok: false, err: String(e).slice(0, 200), errs }; }
    console.log(k, JSON.stringify(res[k]));
    await c.close();
  }
  require('fs').writeFileSync(out + '/live-smoke.json', JSON.stringify(res, null, 1));
  await b.close();
})();
