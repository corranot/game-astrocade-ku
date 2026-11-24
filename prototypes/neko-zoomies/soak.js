// PROTOTYPE - NOT FOR PRODUCTION
// Soak: one long session in one page. Each round the kitten runs a lap, swipes the desk, plays the piano, has a
// fever and both events. Fails on page errors, a broken save, rewards that stop paying, GPU objects that keep
// growing after warm-up, or frame time that climbs between early and late rounds.
// Usage: node soak.js [rounds]   (Playwright; SwiftShader, so absolute frame times are not a phone's)
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const rounds = Number(process.argv[2]) || 10;
const types = { '.js': 'text/javascript', '.html': 'text/html', '.json': 'application/json' };
const srv = http.createServer((q, s) => {
  const f = path.join(__dirname, q.url.split('?')[0] === '/' ? 'index.html' : q.url.split('?')[0]);
  fs.readFile(f, (e, d) => { if (e) { s.writeHead(404); return s.end(); } s.writeHead(200, { 'content-type': types[path.extname(f)] || 'text/plain' }); s.end(d); });
}).listen(0);
const fails = [];
const check = (ok, msg) => { console.log((ok ? 'ok   ' : 'FAIL ') + msg); if (!ok) fails.push(msg); };

(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 360, height: 640 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push((e.stack || e.message).split('\n').slice(0, 3).join(' | ')));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(`http://localhost:${srv.address().port}/?local`);
  await page.waitForFunction(() => window.__game && window.__game.state.loaded, null, { timeout: 40000 });
  await page.mouse.click(180, 330);
  const gameWait = async (sec) => { const t = await page.evaluate(() => __game.state.now); await page.waitForFunction((x) => __game.state.now >= x, t + sec, { timeout: 60000 }).catch(() => {}); };
  await page.evaluate(() => { window.__gaps = []; let last = performance.now(); (function f(t) { window.__gaps.push(t - last); last = t; requestAnimationFrame(f); })(performance.now()); });
  // warm-up: every costume worn once, the fever and both events seen, so their GPU objects exist before counting
  for (const n of [100, 250, 450, 700, 1000]) { await page.evaluate((v) => __game.give(v - __game.state.stars), n); await gameWait(0.3); }
  await page.evaluate(() => { __game.addPurr(1000); __game.eventNow('laser'); }); await gameWait(1);
  await page.evaluate(() => __game.eventNow('bubbles')); await gameWait(13);
  const lap = [[0, 0, 5], [5, 0, 9], [-9.7, 0, 7.4], [-3, 0, -3], [-1.9, 2.5, -10.8], [3.4, 4.7, -10.8], [8.8, 6.9, -10.2], [8.5, 4, 2.5]];
  const rows = [];
  for (let r = 0; r < rounds; r++) {
    const s0 = await page.evaluate(() => { window.__gaps.length = 0; return __game.state.stars; });
    await page.evaluate((k) => { __game.eventNow(k % 2 ? 'bubbles' : 'laser'); if (k % 2) __game.addPurr(1000); }, r);
    for (const [x, y, z] of lap) {
      await page.evaluate(([x, y, z]) => __game.tp(x, y, z), [x, y, z]);
      await page.keyboard.down('KeyW'); await gameWait(0.5); await page.keyboard.press('Space'); await page.keyboard.press('ShiftLeft'); await gameWait(0.5); await page.keyboard.up('KeyW');
    }
    await gameWait(1);
    rows.push(await page.evaluate((s) => { const g = window.__gaps.slice().sort((a, b) => a - b); return Object.assign({ gain: __game.state.stars - s, med: g[Math.floor(g.length / 2)] }, __game.info()); }, s0));
    console.log(`round ${r + 1}: +${rows[r].gain} stars, median frame ${rows[r].med.toFixed(1)} ms, geometries ${rows[r].geometries}, textures ${rows[r].textures}, calls ${rows[r].calls}`);
  }
  const first = rows.slice(0, 3), last = rows.slice(-3), avg = (a, k) => a.reduce((s, o) => s + o[k], 0) / a.length;
  check(errors.length === 0, 'no page errors in the whole session' + (errors.length ? ': ' + errors[0] : ''));
  check(rows.every((o) => o.gain > 0), 'every round still pays stars');
  check(rows[rows.length - 1].geometries <= rows[1].geometries && rows[rows.length - 1].textures <= rows[1].textures, `GPU objects do not grow after warm-up (geometries ${rows[1].geometries} to ${rows[rows.length - 1].geometries}, textures ${rows[1].textures} to ${rows[rows.length - 1].textures})`);
  check(avg(last, 'med') < avg(first, 'med') * 1.3 + 2, `frame time does not climb (${avg(first, 'med').toFixed(1)} ms early, ${avg(last, 'med').toFixed(1)} ms late)`);
  const w = await page.evaluate(() => ({ n: (window.__writes || []).length, last: (window.__writes || []).slice(-1)[0], stars: __game.state.stars }));
  await page.evaluate(() => { document.dispatchEvent(new Event('visibilitychange')); });
  check(w.n > 0 && w.last && typeof w.last.stars === 'number' && w.last.stars <= w.stars, `the save keeps up (${w.n} writes, last ${w.last && w.last.stars} of ${w.stars} stars)`);
  const ok = await page.evaluate(() => [__game.cat.x, __game.cat.y, __game.cat.z].every(Number.isFinite) && __game.props.every((o) => Math.abs(o.x) <= 12 && Math.abs(o.z) <= 12 && o.y > -0.05));
  check(ok, 'kitten and toys still inside the room');
  await browser.close(); srv.close();
  console.log(fails.length ? `\n${fails.length} FAILED` : '\nall passed');
  process.exit(fails.length ? 1 : 0);
})();
