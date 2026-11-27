// Audit capture for Draw It Alive: serves a build folder, plays key moments, saves JPGs and numbers.
// Usage: node audit.js <build dir> <out dir> <tag>
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const [dir, out, tag] = process.argv.slice(2); fs.mkdirSync(out, { recursive: true });
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json' };
const server = http.createServer((q, r) => {
  const f = path.join(dir, decodeURIComponent(q.url.split('?')[0]).replace(/^\/$/, '/index.html'));
  fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); } else { r.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' }); r.end(d); } });
});
const res = {};
(async () => {
  await new Promise((r) => server.listen(0, r));
  const base = `http://127.0.0.1:${server.address().port}/index.html?local`;
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 720, height: 1280 } });
  const page = await ctx.newPage(); const errors = []; page.on('pageerror', (e) => errors.push(String(e)));
  const shot = (n) => page.screenshot({ path: path.join(out, `${tag}-${n}.jpg`), quality: 80, scale: 'css' });

  // load time on a throttled phone profile (4x CPU, 4G-ish network)
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Network.enable'); await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: 1.6e6 / 8, uploadThroughput: 750e3 / 8 });
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  const t0 = Date.now(); await page.goto(base, { waitUntil: 'commit' });
  await page.waitForFunction(() => window.__frames > 0, null, { timeout: 30000 }); res.firstFrameMs = Date.now() - t0;
  await page.waitForTimeout(300); await shot('00-first-frame-300ms');
  await page.waitForTimeout(1200); await shot('01-first-frame-1500ms');
  // frame time while idle with ghost hand, 4x CPU
  res.idleFrame = await page.evaluate(() => new Promise((ok) => { const ts = []; let p = performance.now(); const f = (n) => { ts.push(n - p); p = n; if (ts.length < 120) requestAnimationFrame(f); else { ts.sort((a, b) => a - b); ok({ p50: +ts[60].toFixed(1), p90: +ts[108].toFixed(1) }); } }; requestAnimationFrame(f); }));
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 }); await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });

  // feed handover: edit then play
  await page.evaluate(() => { window.run('edit'); window.run('play'); }); await page.waitForTimeout(600); await shot('02-after-feed-handover');
  res.handover = await page.evaluate(() => ({ i: window.__game.S.i, view: window.__game.view }));

  // capture share calls
  await page.evaluate(() => { window.__shares = []; lib.share = async (o) => { window.__shares.push({ title: o.title, text: o.text, img: o.image && o.image.toDataURL ? o.image.toDataURL('image/jpeg', 0.8) : null }); }; });
  const target = () => page.evaluate(() => window.__game.target.filter((_, i) => i % 3 === 0).concat([window.__game.target[window.__game.target.length - 1]]));
  const wob = (pts) => pts.map((p, i) => [p[0] + Math.sin(i * 1.3) * 14, p[1] + Math.cos(i * 0.9) * 14]);
  const drag = async (pts, lift = true, press = true) => { if (press) { await page.mouse.move(pts[0][0], pts[0][1]); await page.mouse.down(); } for (const p of pts.slice(1)) await page.mouse.move(p[0], p[1], { steps: 2 }); if (lift) await page.mouse.up(); };
  const solve = async (n, shots) => {
    await page.waitForFunction((n) => window.__game.S.i === n && window.__game.S.won < 0 && window.__game.view === 'play', n, { timeout: 25000 });
    await page.waitForTimeout(400);
    const parts = await page.evaluate(() => window.__game.partsOf(window.__game.S.lv).length);
    for (let k = 0; k < parts; k++) {
      await page.waitForFunction((k) => window.__game.S.k === k && !window.__game.S.pen, k, { timeout: 8000 });
      const pts = wob(await target()); const cut = Math.ceil(pts.length * 0.6);
      await drag(pts.slice(0, cut), false); if (shots && k === parts - 1) await shot(`L${n + 1}-drawing`);
      await drag(pts.slice(cut - 1), true, false);
    }
    const tw = Date.now();
    if (shots) { await page.waitForTimeout(250); await shot(`L${n + 1}-win-0.3s`); await page.waitForTimeout(900); await shot(`L${n + 1}-win-1.2s`); }
    await page.waitForFunction((n) => window.__game.S.i !== n || window.__game.view !== 'play', n, { timeout: 25000 });
    return Date.now() - tw;
  };
  // a miss on level 1
  const t1 = await target();
  await drag([[t1[0][0], t1[0][1] + 300], [t1[0][0] + 200, t1[0][1] + 420], [t1[0][0] + 380, t1[0][1] + 360]]); await page.waitForTimeout(150); await shot('03-L1-miss');
  await page.waitForTimeout(1500);
  res.celebrateMs = [];
  for (let n = 0; n < 5; n++) {
    if (n === 1) {
      // try share during celebration on level 2
    }
    res.celebrateMs.push(await solve(n, n < 3));
  }
  await page.waitForTimeout(800); await shot('10-wall-ch1'); res.viewAfter5 = await page.evaluate(() => window.__game.view);
  await page.waitForTimeout(4000); await shot('11-wall-ch1-later');
  // share button: tap it during a celebration
  await page.evaluate(() => { const g = window.__game; g.save.level = 7; g.newLevel(7); });
  await page.waitForTimeout(500);
  {
    const parts = await page.evaluate(() => window.__game.partsOf(window.__game.S.lv).length);
    for (let k = 0; k < parts; k++) { await page.waitForFunction((k) => window.__game.S.k === k && !window.__game.S.pen, k, { timeout: 8000 }); const pts = wob(await target()); await drag(pts); }
    await page.waitForTimeout(700); await shot('12-L8-win-share-button');
    await page.mouse.click(360, 1132); await page.waitForTimeout(500);
    const sh = await page.evaluate(() => window.__shares);
    res.shares = sh.map((s) => ({ title: s.title, text: s.text, hasImage: !!s.img }));
    if (sh[0] && sh[0].img) fs.writeFileSync(path.join(out, `${tag}-13-share-card.jpg`), Buffer.from(sh[0].img.split(',')[1], 'base64'));
  }
  // box and book
  await page.evaluate(() => { const g = window.__game; g.save.drops = 6; g.openBox(() => {}); }); await page.waitForTimeout(1200); await shot('14-box');
  await page.waitForTimeout(3500); await shot('15-box-open');
  await page.evaluate(() => { window.__game.openBook(); }); await page.waitForTimeout(800); await shot('16-sticker-book');
  // a level from each chapter start, and the new chapter
  for (const i of [10, 15, 20, 22, 24]) {
    if (i >= (await page.evaluate(() => window.__game.LEVELS.length))) continue;
    await page.evaluate((i) => { const g = window.__game; g.save.level = i; g.newLevel(i); }, i); await page.waitForTimeout(700); await shot(`20-L${i + 1}-start`);
  }
  // languages: hi and ar banner fit
  res.levels = await page.evaluate(() => window.__game.LEVELS.length);
  res.errors = errors;
  fs.writeFileSync(path.join(out, `${tag}-numbers.json`), JSON.stringify(res, null, 1));
  console.log(JSON.stringify(res));
  await browser.close(); server.close();
})().catch((e) => { console.error(e); res.errors = String(e); console.log(JSON.stringify(res)); process.exit(1); });
