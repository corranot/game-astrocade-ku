// PROTOTYPE - NOT FOR PRODUCTION
// Frame-time self-check on two phone profiles: plays the valley (tutorial skipped) with the hero walking a loop,
// and reads the game's own frame-time ring and quality tier every 8 s. Software GL (swiftshader) stands in for a
// weak phone GPU, so the numbers compare runs and show the adaptive quality reacting; a real phone is faster.
// Usage: node perf-check.js [seconds]   Prints one JSON line per sample and a summary per profile.
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const secs = +process.argv[2] || 24;
const types = { '.js': 'text/javascript', '.html': 'text/html', '.json': 'application/json' };
const server = http.createServer((q, s) => {
  const u = q.url.split('?')[0], f = path.join(__dirname, u === '/' ? 'index.html' : u);
  fs.readFile(f, (e, d) => { if (e) { s.writeHead(404); return s.end(); } s.writeHead(200, { 'content-type': types[path.extname(f)] || 'text/plain' }); s.end(d); });
}).listen(0);
const PROFILES = [
  { name: 'mid phone (390x844, 4x CPU, 8 cores, 4 GB)', w: 390, h: 844, cpu: 4, cores: 8, mem: 4 },
  { name: 'low-end phone (360x740, 6x CPU, 4 cores, 2 GB)', w: 360, h: 740, cpu: 6, cores: 4, mem: 2 },
];
const LOOP = [[0, -6], [6, -14], [-5, -20], [-6, -8], [0, 2]];

(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  let bad = 0;
  for (const p of PROFILES) {
    const ctx = await browser.newContext({ viewport: { width: p.w, height: p.h }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    const page = await ctx.newPage(), errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.addInitScript((q) => { Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => q.cores }); Object.defineProperty(navigator, 'deviceMemory', { get: () => q.mem }); }, p);
    const cdp = await ctx.newCDPSession(page); await cdp.send('Emulation.setCPUThrottlingRate', { rate: p.cpu });
    await page.goto(`http://localhost:${server.address().port}/?local`);
    await page.waitForFunction(() => window.__game && window.__game.loaded && document.getElementById('app').classList.contains('live'), null, { timeout: 60000 });
    await page.evaluate(() => __game.skipFtue());
    const samples = [];
    for (let s = 0, k = 0; s < secs; s += 2) {
      if (s % 4 === 0) { const [x, z] = LOOP[k++ % LOOP.length]; await page.evaluate(([a, b]) => __game.walkTo(a, b), [x, z]); }
      await page.waitForTimeout(2000);
      if ((s + 2) % 8 === 0) { const f = await page.evaluate(() => ({ ...__game.frames(), calls: __game.stats().calls })); f.at = s + 2; samples.push(f); console.log(JSON.stringify({ profile: p.name, ...f })); }
    }
    const last = samples[samples.length - 1];
    console.log(`${p.name}: started at tier ${last.start}, now tier ${last.tier}, frame p50 ${last.p50} ms, p95 ${last.p95} ms, game code ${last.js50} ms a frame, ${last.calls} draw calls, tier changes ${JSON.stringify(last.changes)}${errors.length ? ', errors: ' + errors.join(' | ') : ''}`);
    if (errors.length) bad++;
    await ctx.close();
  }
  await browser.close(); server.close();
  process.exit(bad ? 1 : 0);
})();
