// PROTOTYPE - NOT FOR PRODUCTION
// Screens in every language: the first cup (rolling), pouring, drawing, freezing, toppings, the rating card and a
// gift box, at 720x1280, for the full-size look check and the HUD overlap check (text must stay inside the screen).
// Usage: node look.js <out folder> [langs comma-separated]
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const out = process.argv[2]; const langs = (process.argv[3] || 'en,ar,es,vi,hi,bn,id').split(',');
if (!out) { console.error('usage: node look.js <out folder> [langs]'); process.exit(1); }
fs.mkdirSync(out, { recursive: true });
const types = { '.js': 'text/javascript', '.html': 'text/html', '.json': 'application/json', '.webp': 'image/webp', '.mp3': 'audio/mpeg' };
const server = http.createServer((q, s) => { const f = path.join(__dirname, q.url.split('?')[0] === '/' ? 'index.html' : q.url.split('?')[0]); fs.readFile(f, (e, d) => { if (e) { s.writeHead(404); return s.end(); } s.writeHead(200, { 'content-type': types[path.extname(f)] || 'text/plain' }); s.end(d); }); }).listen(0);
const fails = [];
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  for (const lang of langs) {
    const page = await browser.newPage({ viewport: { width: 360, height: 640 }, deviceScaleFactor: 2, locale: lang });
    const errors = []; page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(`http://localhost:${server.address().port}/?local`);
    await page.waitForFunction(() => window.__game && window.__game.S && window.__game.saveLoaded, null, { timeout: 40000 });
    await page.evaluate(() => document.fonts.ready); await page.waitForTimeout(1200);
    const shot = async (n) => {
      await page.screenshot({ path: path.join(out, `${n}-${lang}.jpg`), type: 'jpeg', quality: 80 });
      // every visible text box inside the 720-wide screen
      const bad = await page.evaluate(() => { const r = document.querySelector('#app').getBoundingClientRect(); return [...document.querySelectorAll('#hud .banner, #hud .pop, #hud button, #panel .gtitle, #panel .tap, #panel .board, #panel .styles, #panel .card, #panel .lock, #hud .lock')].filter((e) => e.offsetParent && e.getBoundingClientRect().width).filter((e) => { const b = e.getBoundingClientRect(); return b.left < r.left - 1 || b.right > r.right + 1; }).map((e) => e.className + ':' + e.textContent.slice(0, 20)); });
      if (bad.length) fails.push(`${lang} ${n}: outside the screen: ${bad.join(', ')}`);
    };
    const g = (fn, a) => page.evaluate(fn, a);
    await shot('01-hook-roll');
    await g(() => { for (const ln of __game.scene.lanes) __game.scene.setLane(ln, __game.scene.L); });
    await page.waitForFunction(() => __game.S.step === 'topping', null, { timeout: 20000 });
    await g(() => { __game.addTop('whip'); __game.addTop('cherry'); }); await page.waitForTimeout(700); await shot('02-toppings');
    // a second cup's worth of play, so the daily gift (from cup 2) follows the rating card
    await g(() => { __game.save.cups = 1; });
    await page.click('#action', { force: true }); await page.waitForSelector('#nextBtn', { timeout: 15000 }); await page.waitForTimeout(1500); await shot('03-rating');
    await page.click('#nextBtn', { force: true }); await page.waitForSelector('#giftBox', { timeout: 5000 }); await shot('04-gift');
    await page.click('#giftBox', { force: true }); await page.waitForSelector('#nextBtn'); await page.click('#nextBtn', { force: true });
    await page.waitForFunction(() => __game.S.step === 'pour' || __game.S.step === 'roll', null, { timeout: 8000 }); await g(() => { if (__game.S.step !== 'pour') { __game.save.cups = 1; __game.newCup(); } }); await page.waitForTimeout(1300); await shot('05-pour');
    await g(() => __game.go(4)); await page.waitForTimeout(600); await shot('06-draw');
    await g(() => __game.go(5)); await page.waitForTimeout(600); await shot('07-freeze');
    await g(() => { __game.save.coins = 130; __game.openShelf(); }); await page.waitForTimeout(700); await shot('08-shelf');
    await page.click('#closeShelf', { force: true });
    await g(() => { __game.save.cups = 3; __game.newCup(); }); await page.waitForTimeout(900); await shot('09-vip');
    if (errors.length) fails.push(`${lang}: page errors ${errors.join(' | ')}`);
    console.log('done', lang);
    await page.close();
  }
  await browser.close(); server.close();
  console.log(fails.length ? 'FAIL\n' + fails.join('\n') : 'all screens inside, no errors');
  process.exit(fails.length ? 1 : 0);
})().catch((e) => { console.error(e); server.close(); process.exit(1); });
