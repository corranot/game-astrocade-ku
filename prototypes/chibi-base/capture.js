// PROTOTYPE - NOT FOR PRODUCTION
// Renders every viewer shot to JPG. Usage: node capture.js <outDir>
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const root = path.join(__dirname, '..'), out = process.argv[2] || path.join(__dirname, 'shots');
fs.mkdirSync(out, { recursive: true });
const types = { '.js': 'text/javascript', '.html': 'text/html', '.json': 'application/json' };
const server = http.createServer((q, s) => {
  const f = path.join(root, decodeURIComponent(q.url.split('?')[0]));
  fs.readFile(f, (e, d) => { if (e) { s.writeHead(404); return s.end(); } s.writeHead(200, { 'content-type': types[path.extname(f)] || 'text/plain' }); s.end(d); });
}).listen(0);
const SHOTS = [['turn', 1600, 700], ['pip', 1600, 700], ['compare', 1600, 700], ['looks', 2100, 700], ['anim', 1600, 700], ['phone', 390, 844]];
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  for (const [shot, w, h] of SHOTS) {
    const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 2 });
    page.on('pageerror', (e) => console.error(shot, e.message)); page.on('console', (m) => m.type() === 'error' && console.error(shot, m.text()));
    await page.goto(`http://localhost:${server.address().port}/chibi-base/index.html?shot=${shot}`);
    await page.waitForFunction(() => window.__ready, null, { timeout: 60000 });
    const st = await page.evaluate(() => window.__stats);
    await page.screenshot({ path: path.join(out, `${shot}.jpg`), type: 'jpeg', quality: 86 });
    console.log(shot, JSON.stringify(st)); await page.close();
  }
  await browser.close(); server.close();
})();
