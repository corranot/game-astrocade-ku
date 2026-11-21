// PROTOTYPE - NOT FOR PRODUCTION
// Soak: many cups in one page with real finger input. Fails on page errors, a broken save, a cup that pays nothing,
// rewards that stop coming, or GPU objects that keep growing from cup to cup.
// Usage: node soak.js [cups]
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const { driver, playCup, types } = require('./playtest.js');
const cups = Number(process.argv[2]) || 14;
const server = http.createServer((q, s) => { const f = path.join(__dirname, q.url.split('?')[0] === '/' ? 'index.html' : q.url.split('?')[0]); fs.readFile(f, (e, d) => { if (e) { s.writeHead(404); return s.end(); } s.writeHead(200, { 'content-type': types[path.extname(f)] || 'text/plain' }); s.end(d); }); }).listen(0);
const fails = []; const check = (ok, m) => { console.log((ok ? 'ok   ' : 'FAIL ') + m); if (!ok) fails.push(m); };
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 360, height: 640 } });
  const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`http://localhost:${server.address().port}/?local&speed=3`);
  await page.waitForFunction(() => window.__game && window.__game.S && window.__game.saveLoaded, null, { timeout: 40000 });
  const d = driver(page); const mem = []; let gifts = 0, coins0 = 0;
  for (let i = 0; i < cups; i++) {
    await playCup(page, d, 's' + i, false);
    const st = await d.g(() => ({ cups: __game.save.cups, coins: __game.save.coins, t: __game.textures, g: __game.geometries, last: (window.__writes || []).slice(-1)[0] }));
    check(st.cups === i + 1 && st.coins > coins0, `cup ${i + 1}: paid (${st.coins} coins), saved cups ${st.last && st.last.cups}`);
    coins0 = st.coins; mem.push([st.t, st.g]);
    await page.click('#nextBtn', { force: true });
    for (let k = 0; k < 3; k++) { // gift box / daily gift, then the next cup
      const gb = await page.waitForSelector('#giftBox', { timeout: 700 }).catch(() => null); if (!gb) break;
      gifts++; await page.click('#giftBox', { force: true }); await page.waitForSelector('#nextBtn'); await page.click('#nextBtn', { force: true });
    }
    await page.waitForFunction((n) => __game.S.n === n && __game.S.step === 'pour', i + 1, { timeout: 8000 });
  }
  console.log('gpu memory per cup [textures, geometries]:', JSON.stringify(mem));
  const late = mem.slice(4); check(Math.max(...late.map((m) => m[0])) - Math.min(...late.map((m) => m[0])) <= 2 && Math.max(...late.map((m) => m[1])) - Math.min(...late.map((m) => m[1])) <= 12, 'GPU textures and geometries stay flat after warm-up');
  check(gifts >= Math.floor(cups / 3), `gift boxes keep coming (${gifts} in ${cups} cups)`);
  const owned = await d.g(() => __game.save.owned.length); check(owned >= 2, `gifts and coins unlock things (${owned} owned)`);
  check(errors.length === 0, 'no page errors: ' + (errors.join(' | ') || 'none'));
  await browser.close(); server.close();
  console.log(fails.length ? `\n${fails.length} FAILED` : '\nall passed'); process.exit(fails.length ? 1 : 0);
})().catch((e) => { console.error(e.message.split('\n')[0]); server.close(); process.exit(1); });
