// PROTOTYPE - NOT FOR PRODUCTION
// Plays several chapters in one page and fails on errors, a broken save, lost feedback or growing canvases.
// Usage: node soak.js [chapters]
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const chapters = +process.argv[2] || 3;
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json' };
const server = http.createServer((q, r) => {
  const f = path.join(__dirname, decodeURIComponent(q.url.split('?')[0]).replace(/^\/$/, '/index.html'));
  fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); } else { r.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' }); r.end(d); } });
});
let failed = 0;
const ok = (cond, what) => { console.log((cond ? '  ok  ' : '  FAIL ') + what); if (!cond) failed++; };
(async () => {
  await new Promise((r) => server.listen(0, r));
  const cfg = encodeURIComponent(JSON.stringify({ celebrateSeconds: 1.9, celebrateLater: 1.9, wallEndPause: 0.2, cardRestSeconds: 0.6 }));
  const browser = await chromium.launch();
  const page = await (await browser.newContext({ viewport: { width: 720, height: 1280 } })).newPage();
  const errors = []; page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(`http://127.0.0.1:${server.address().port}/index.html?local&cfg=${cfg}`);
  await page.waitForFunction(() => window.__game && window.__game.S && window.__frames > 3);
  // count sounds that are started, so lost feedback in later chapters shows up
  await page.evaluate(() => { const o = AudioContext.prototype.createOscillator; window.__beeps = 0; AudioContext.prototype.createOscillator = function () { window.__beeps++; return o.call(this); }; });
  await page.mouse.click(5, 5); // first touch starts the sound
  const n = await page.evaluate(() => window.__game.LEVELS.length);
  const perLevel = [];
  for (let L = 0; L < n * chapters; L++) {
    await page.waitForFunction((L) => window.__game.view === 'play' && window.__game.S.i === L && window.__game.S.won < 0, L, { timeout: 15000 });
    const b0 = await page.evaluate(() => window.__beeps);
    const t = await page.evaluate(() => window.__game.target.filter((_, i) => i % 3 === 0).concat([window.__game.target.at(-1)]));
    await page.mouse.move(t[0][0], t[0][1]); await page.mouse.down();
    for (const p of t.slice(1)) await page.mouse.move(p[0], p[1], { steps: 2 });
    await page.mouse.up();
    await page.waitForFunction(() => window.__game.S.won > 1.2, null, { timeout: 8000 });
    perLevel.push(await page.evaluate((b0) => window.__beeps - b0, b0));
  }
  const st = await page.evaluate(() => ({ save: JSON.parse(JSON.stringify(window.__game.save)), canvases: window.__game.canvases }));
  ok(errors.length === 0, 'no page errors ' + errors.join(' | '));
  ok(st.save.level === n * chapters, `save level counts every level played (${st.save.level})`);
  ok(Object.keys(st.save.art).length === n && Object.values(st.save.art).every((a) => a.length > 1), 'one stored picture per scene');
  ok(JSON.stringify(st.save).length < 20000, `save stays small (${JSON.stringify(st.save).length} bytes)`);
  ok(st.canvases === 2 * n, `wall canvases do not pile up (${st.canvases})`);
  const first = perLevel.slice(0, n), lastCh = perLevel.slice(-n);
  ok(lastCh.every((b, i) => b >= first[i] * 0.6 && b > 3), `sounds still play in the last chapter (first ${first} / last ${lastCh})`);
  await browser.close(); server.close();
  console.log(failed ? `SOAK FAIL (${failed})` : 'SOAK PASS'); process.exit(failed ? 1 : 0);
})();
