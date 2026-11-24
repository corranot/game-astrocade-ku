// PROTOTYPE - NOT FOR PRODUCTION
// Soak: wins every level in order, several rounds, and watches what must not grow: page errors, GPU objects
// (geometries, textures), and the time between frames. Fails when the last round holds more GPU objects than the
// first, or when frames get slower by 8 ms or more.
// Usage: node soak.js [rounds, default 2]
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const rounds = Number(process.argv[2]) || 2;
const types = { '.js': 'text/javascript', '.html': 'text/html', '.json': 'application/json' };
const server = http.createServer((q, s) => { const f = path.join(__dirname, q.url.split('?')[0] === '/' ? 'index.html' : q.url.split('?')[0]); fs.readFile(f, (e, d) => { if (e) { s.writeHead(404); return s.end(); } s.writeHead(200, { 'content-type': types[path.extname(f)] || 'text/plain' }); s.end(d); }); }).listen(0);
const fails = [], check = (ok, m) => { console.log((ok ? 'ok   ' : 'FAIL ') + m); if (!ok) fails.push(m); };
const median = (a) => a.slice().sort((x, y) => x - y)[a.length >> 1];

(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 360, height: 640 } });
  const errors = []; page.on('pageerror', (e) => errors.push(e.message)); page.on('console', (m) => { if (m.type() === 'error' && !/favicon/.test(m.text())) errors.push(m.text()); });
  await page.goto(`http://localhost:${server.address().port}/?local&speed=2`);
  await page.waitForFunction(() => window.__game && window.__game.W, null, { timeout: 40000 });
  await page.evaluate(() => { window.__gaps = []; let last = performance.now(); const f = (t) => { window.__gaps.push(t - last); last = t; requestAnimationFrame(f); }; requestAnimationFrame(f); });
  const total = await page.evaluate(() => __game.total);
  const swipe = async (id) => { const [x, y] = await page.evaluate((id) => { const p = __game.ropeAt(id); return __game.client(p[0], p[1]); }, id); await page.mouse.move(x - 30, y - 6); await page.mouse.down(); await page.mouse.move(x + 30, y + 6, { steps: 4 }); await page.mouse.up(); };
  const stats = [];
  for (let r = 0; r < rounds; r++) {
    await page.evaluate(() => { window.__gaps.length = 0; });
    for (let n = 0; n < total; n++) {
      await page.evaluate((i) => __game.loadLevel(i), n); await page.waitForTimeout(120);
      const order = await page.evaluate(() => { const w = __game.level.items.find((x) => x.result === 'win'); return [...(w.needs ? [w.needs] : []), w.id]; });
      for (const id of order) { await swipe(id); await page.waitForFunction(() => !__game.busy, null, { timeout: 8000 }).catch(() => fails.push(`round ${r + 1} level ${n + 1}: stuck after ${id}`)); }
      if (!(await page.evaluate(() => __game.won))) fails.push(`round ${r + 1} level ${n + 1}: not won`);
    }
    const s = await page.evaluate(() => ({ geo: __game.geometries, tex: __game.textures, gaps: window.__gaps.slice(), stars: __game.save.stars.filter((x) => x === 3).length }));
    stats.push({ geo: s.geo, tex: s.tex, gap: median(s.gaps), stars: s.stars });
    console.log(`round ${r + 1}: ${s.stars} levels won, geometries ${s.geo}, textures ${s.tex}, median frame gap ${median(s.gaps).toFixed(1)} ms`);
  }
  const a = stats[0], z = stats[stats.length - 1];
  check(a.stars === total && z.stars === total, `every level is won in every round (${total})`);
  check(z.geo <= a.geo && z.tex <= a.tex, `GPU objects do not grow between rounds (geometries ${a.geo} -> ${z.geo}, textures ${a.tex} -> ${z.tex})`);
  check(z.gap - a.gap < 8, `frames do not slow down (${a.gap.toFixed(1)} -> ${z.gap.toFixed(1)} ms)`);
  check(errors.length === 0, 'no errors: ' + errors.slice(0, 3).join(' | '));
  check(fails.length <= 0 + fails.filter((f) => !/round/.test(f)).length, 'no level got stuck');
  await browser.close(); server.close();
  console.log(fails.length ? `\n${fails.length} FAILED:\n- ` + fails.join('\n- ') : '\nsoak passed');
  process.exit(fails.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
