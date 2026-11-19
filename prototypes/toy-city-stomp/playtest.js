// PROTOTYPE - NOT FOR PRODUCTION
// Playtest: serves this folder, plays one whole round on the game's own autopilot (sped up), checks the rules
// that matter (growth, dominoes, finish, replay), and saves screenshots.
// Usage: node playtest.js <out folder> [--lang xx]   (needs Playwright; swiftshader GPU, so FPS here is not a phone's)
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const out = process.argv[2] || '.', lang = (process.argv.indexOf('--lang') > 0 && process.argv[process.argv.indexOf('--lang') + 1]) || 'en';
fs.mkdirSync(out, { recursive: true });
const types = { '.js': 'text/javascript', '.html': 'text/html', '.json': 'application/json' };
const server = http.createServer((q, s) => {
  const f = path.join(__dirname, q.url.split('?')[0] === '/' ? 'index.html' : q.url.split('?')[0]);
  fs.readFile(f, (e, d) => { if (e) { s.writeHead(404); return s.end(); } s.writeHead(200, { 'content-type': types[path.extname(f)] || 'text/plain' }); s.end(d); });
}).listen(0);

(async () => {
  const port = server.address().port, fails = [];
  const check = (ok, msg) => { console.log((ok ? 'ok   ' : 'FAIL ') + msg); if (!ok) fails.push(msg); };
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  // screen comfort, on its own page at normal speed: hold a wandering drag with a big Bonbon, record the camera
  {
    const cp = await browser.newPage({ viewport: { width: 405, height: 720 } });
    await cp.goto(`http://localhost:${port}/?local&tier=0`);
    await cp.waitForFunction(() => window.__game && window.__game.S, null, { timeout: 30000 });
    await cp.evaluate(() => { for (let i = 0; i < 4; i++) __game.grow(); });
    await cp.waitForTimeout(1500);
    await cp.evaluate(() => { window.__cam = []; const c = __game.camera; const loop = () => { if (!window.__cam) return; __cam.push([c.position.x, c.position.y, c.position.z, c.rotation.z]); requestAnimationFrame(loop); }; loop(); });
    await cp.mouse.move(200, 500); await cp.mouse.down();
    for (const [x, y] of [[200, 430], [140, 440], [200, 430], [260, 440], [200, 560]]) { await cp.mouse.move(x, y, { steps: 4 }); await cp.waitForTimeout(1000); }
    await cp.mouse.up();
    const cam = await cp.evaluate(() => { const a = __cam; window.__cam = null; let maxJ = 0, roll = 0;
      for (let i = 2; i < a.length; i++) { maxJ = Math.max(maxJ, Math.hypot(...[0, 1, 2].map((k) => a[i][k] - 2 * a[i - 1][k] + a[i - 2][k]))); roll = Math.max(roll, Math.abs(a[i][3] - a[i - 1][3])); }
      return { maxJ, roll, n: a.length }; });
    check(cam.roll < 0.002 && cam.maxJ < 1.0, `screen comfort at stage 5: camera roll change ${cam.roll.toFixed(4)} per frame, biggest jolt ${cam.maxJ.toFixed(2)} (< 1.0) over ${cam.n} frames`);
    await cp.close();
  }
  const page = await browser.newPage({ viewport: { width: 405, height: 720 }, locale: lang });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(`http://localhost:${port}/?local&tier=0&speed=6`);
  await page.waitForFunction(() => window.__game && window.__game.S, null, { timeout: 30000 });
  const g = (fn) => page.evaluate(fn);
  check(await g(() => __game.lang) === (['en', 'ar', 'es', 'vi', 'hi', 'bn', 'id'].includes(lang.slice(0, 2)) ? lang.slice(0, 2) : 'en'), 'language follows the device: ' + lang);
  await page.waitForTimeout(1500);
  check(await g(() => __game.S.points > 0), 'autopilot breaks something before any touch');
  await page.screenshot({ path: path.join(out, `01-start-${lang}.png`) });
  check(await g(() => __game.S.time === 0), 'attract mode (no touch yet) does not run the clock');
  await g(() => { __game.S.touched = true; __game.S.idle = 99; }); // a child who touched once then let go: autopilot plays on and the round counts

  // play on autopilot; note when things happen
  const seen = { stage3: false, domino: false };
  const t0 = Date.now();
  while (Date.now() - t0 < 420000) {
    const s = await g(() => ({ stage: __game.S.stage, fin: __game.S.finished, time: __game.S.time, left: __game.city.intactLeft(), dom: __game.S.chainShown, pts: __game.S.points }));
    if (!seen.stage3 && s.stage >= 3) { seen.stage3 = true; await page.screenshot({ path: path.join(out, `02-grown-${lang}.png`) }); console.log('     stage 3 at', s.time.toFixed(0), 's'); }
    if (!seen.domino && s.dom >= 2) { seen.domino = true; await page.screenshot({ path: path.join(out, `03-domino-${lang}.png`) }); console.log('     domino x' + s.dom + ' at', s.time.toFixed(0), 's'); }
    if (s.fin) { console.log(`     finished at ${s.time.toFixed(0)} s game time, stage ${s.stage}, ${s.pts} points`); break; }
    await page.waitForTimeout(1000);
  }
  const end = await g(() => ({ fin: __game.S.finished, stage: __game.S.stage, time: __game.S.time, coins: __game.S.coins, best: __game.S.bestCombo }));
  check(end.fin, 'the city is flattened and the round finishes');
  check(end.stage >= 5, 'Bonbon grows to stage 5+ in one round (got ' + end.stage + ')');
  check(end.time > 60 && end.time < 300, 'autopilot round from the first touch (the shortest path; a child wanders) takes 60-300 game s: ' + end.time.toFixed(0) + ' s');
  check(seen.domino, 'at least one domino chain happens');
  await page.waitForTimeout(2500);
  check(await g(() => !document.querySelector('#result').hidden), 'result screen shows');
  await page.screenshot({ path: path.join(out, `04-result-${lang}.png`) });
  const { ms, reset } = await g(() => { const t = performance.now(); document.querySelector('#again').click(); const ms = performance.now() - t;
    return { ms, reset: { fin: __game.S.finished, stage: __game.S.stage, left: __game.city.intactLeft(), n: __game.city.buildings.length } }; });
  check(!reset.fin && reset.stage === 1 && reset.left === reset.n && ms < 100, `replay resets the round in ${ms.toFixed(0)} ms`);
  check(errors.length === 0, 'no page errors' + (errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''));
  await browser.close(); server.close();
  console.log(fails.length ? `\n${fails.length} FAILED` : '\nall passed');
  process.exit(fails.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
