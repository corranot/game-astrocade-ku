// PROTOTYPE - NOT FOR PRODUCTION
// Screens in all 7 languages: play (HUD, mission card), result and shop, saved to
// production/qa/evidence/toy-city-stomp/ (overwrites the previous set). Reports any HUD text cut off.
// Usage: node screens.js
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const out = path.join(__dirname, '..', '..', 'production', 'qa', 'evidence', 'toy-city-stomp');
fs.rmSync(out, { recursive: true, force: true }); fs.mkdirSync(out, { recursive: true });
const types = { '.js': 'text/javascript', '.html': 'text/html', '.json': 'application/json' };
const server = http.createServer((q, s) => {
  const f = path.join(__dirname, q.url.split('?')[0] === '/' ? 'index.html' : q.url.split('?')[0]);
  fs.readFile(f, (e, d) => { if (e) { s.writeHead(404); return s.end(); } s.writeHead(200, { 'content-type': types[path.extname(f)] || 'text/plain' }); s.end(d); });
}).listen(0);

/** Elements whose text is wider or taller than their box (cut off). */
const cutOff = () => [...document.querySelectorAll('.hud *')].filter((el) => {
  if (!el.offsetParent || !el.textContent.trim() || el.children.length) return false;
  return el.scrollWidth > el.clientWidth + 2 || el.scrollHeight > el.clientHeight + 4;
}).map((el) => (el.id || el.className) + ': ' + el.textContent.trim().slice(0, 30));

(async () => {
  const port = server.address().port, problems = [];
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  for (const lang of ['en', 'ar', 'es', 'vi', 'hi', 'bn', 'id']) {
    const page = await browser.newPage({ viewport: { width: 405, height: 720 }, deviceScaleFactor: 2, locale: lang });
    await page.goto(`http://localhost:${port}/?local&tier=1`);
    await page.waitForFunction(() => window.__game && window.__game.S, null, { timeout: 30000 });
    await page.evaluate(() => { const S = __game.S; S.touched = true; S.idle = 99; __game.save.tutorialDone = true; document.querySelector('#hint').hidden = true; __game.grow(); __game.grow(); });
    await page.waitForTimeout(4000);
    await page.screenshot({ path: path.join(out, `${lang}-1-play.png`) });
    let cut = await page.evaluate(cutOff);
    await page.evaluate(() => { __game.save.coins = 300; __game.finish(); });
    await page.waitForTimeout(2600);
    await page.screenshot({ path: path.join(out, `${lang}-2-result.png`) });
    cut = cut.concat(await page.evaluate(cutOff));
    await page.evaluate(() => __game.openShop());
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(out, `${lang}-3-shop.png`) });
    cut = cut.concat(await page.evaluate(cutOff));
    console.log((cut.length ? 'CUT  ' : 'ok   ') + lang + (cut.length ? ': ' + [...new Set(cut)].join(' | ') : ''));
    if (cut.length) problems.push(lang);
    await page.close();
  }
  await browser.close(); server.close();
  console.log(problems.length ? `text cut off in: ${problems.join(', ')}` : 'no text cut off in any language');
  process.exit(problems.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
