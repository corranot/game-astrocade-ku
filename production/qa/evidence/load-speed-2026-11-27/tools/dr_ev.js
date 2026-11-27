// Dragon: force the rival events (race, thief) early in a session, before and after the rivals finish building
const { chromium } = require('playwright'); const fs = require('fs');
const sd = fs.readFileSync(process.argv[2], 'utf8'), out = process.argv[3];
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 405, height: 720 }, hasTouch: true, isMobile: true });
  const p = await ctx.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message.slice(0, 200)));
  await p.route('http://game.test/', r => r.fulfill({ contentType: 'text/html', body: sd }));
  await p.goto('http://game.test/');
  await p.waitForFunction(() => window.__riv, null, { timeout: 30000 });
  // MODE=early: fire the race the moment the title shows, before the rivals' 700 ms timer
  if (process.env.MODE === 'early') { await p.waitForFunction(() => document.querySelector('.ttl'), null, { timeout: 40000, polling: 20 }); }
  const early = await p.evaluate(() => { const R = window.__riv(); return { built: R.built, n: R.list.length }; });
  if (process.env.MODE === 'early') { await p.evaluate(() => window.__se('race')); await p.waitForTimeout(300); }
  else await p.waitForTimeout(14000);
  const r1 = await p.evaluate(() => { const R = window.__riv(); return { built: R.built, n: R.list.length, thief: !!R.thief, pow: R.list.map(r => r.pow) }; });
  await p.screenshot({ path: out + '-play.jpg', quality: 60, type: 'jpeg' });
  await p.evaluate(() => window.__se('race')); await p.waitForTimeout(3000);
  await p.screenshot({ path: out + '-race.jpg', quality: 60, type: 'jpeg' });
  await p.evaluate(() => window.__se('thief')); await p.waitForTimeout(3000);
  await p.screenshot({ path: out + '-thief.jpg', quality: 60, type: 'jpeg' });
  console.log(JSON.stringify({ early, r1, errs }));
  await b.close();
})();
