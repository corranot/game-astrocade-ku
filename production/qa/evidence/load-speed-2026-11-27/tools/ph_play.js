// Prop Heist quick playtest on the served page: tap play as soon as the title shows (physics may still be loading),
// then walk with WASD and check the round started, physics came up and no page errors.
const { chromium } = require('playwright'); const fs = require('fs');
const sd = fs.readFileSync(process.argv[2], 'utf8'), out = process.argv[3];
(async () => {
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const ctx = await b.newContext({ viewport: { width: 405, height: 720 }, hasTouch: true, isMobile: true });
  const p = await ctx.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message.slice(0, 200)));
  const c = await ctx.newCDPSession(p); await c.send('Network.enable');
  await c.send('Network.emulateNetworkConditions', { offline: false, latency: 60, downloadThroughput: 9e6 / 8, uploadThroughput: 1e5 });
  await p.route('http://game.test/', r => r.fulfill({ contentType: 'text/html', body: sd }));
  await p.goto('http://game.test/');
  const t0 = Date.now(); let st;
  while (Date.now() - t0 < 30000) { st = await p.evaluate(() => window.__ftState && window.__ftState()); if (st === 'title') break; await p.waitForTimeout(50); }
  const titleAt = Date.now() - t0, okAtTitle = await p.evaluate(() => !!window.__phOk);
  await p.screenshot({ path: out + '-title.jpg', quality: 60, type: 'jpeg' });
  await p.mouse.click(202, 560); await p.mouse.click(202, 560); await p.mouse.click(202, 560);
  let playAt = null; while (Date.now() - t0 < 40000) { if (await p.evaluate(() => window.__ftState() !== 'title')) { playAt = Date.now() - t0; break; } await p.waitForTimeout(50); }
  await p.waitForTimeout(3000);
  for (const k of ['w', 'a', 'w', 'd', 's']) { for (let i = 0; i < 12; i++) { await p.keyboard.down(k); await p.waitForTimeout(60); await p.keyboard.up(k); } }
  await p.screenshot({ path: out + '-play.jpg', quality: 60, type: 'jpeg' });
  const s2 = await p.evaluate(() => ({ st: window.__ftState(), ok: !!window.__phOk, late: !!window.__pnLate }));
  console.log(JSON.stringify({ titleAt, okAtTitle, playAt, s2, errs }));
  await b.close();
})();
