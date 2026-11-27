// Mega Aura quick playtest on the served page: wait for TAP TO PLAY, tap, walk with WASD, press HELP/space,
// screenshots and page errors.
const { chromium } = require('playwright'); const fs = require('fs');
const sd = fs.readFileSync(process.argv[2], 'utf8'), out = process.argv[3];
(async () => {
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const ctx = await b.newContext({ viewport: { width: 405, height: 720 }, hasTouch: true, isMobile: true });
  const p = await ctx.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message.slice(0, 200)));
  await p.route('http://game.test/', r => r.fulfill({ contentType: 'text/html', body: sd }));
  await p.goto('http://game.test/');
  const t0 = Date.now();
  await p.waitForFunction(() => { const e = document.getElementById('tapTx'); return e && e.offsetParent && getComputedStyle(e).opacity > 0.5; }, null, { timeout: 30000 }).catch(() => {});
  const titleAt = Date.now() - t0; await p.waitForTimeout(800);
  await p.screenshot({ path: out + '-title.jpg', quality: 60, type: 'jpeg' });
  await p.mouse.click(202, 620); await p.waitForTimeout(2500);
  await p.screenshot({ path: out + '-start.jpg', quality: 60, type: 'jpeg' });
  for (const k of ['w', 'a', 'w', 'd', 's']) { for (let i = 0; i < 15; i++) { await p.keyboard.down(k); await p.waitForTimeout(60); await p.keyboard.up(k); } await p.keyboard.press('Space'); }
  await p.waitForTimeout(1500);
  await p.screenshot({ path: out + '-play.jpg', quality: 60, type: 'jpeg' });
  console.log(JSON.stringify({ titleAt, errs }));
  await b.close();
})();
