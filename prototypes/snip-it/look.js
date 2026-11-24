// PROTOTYPE - NOT FOR PRODUCTION
// Look: plays every level (or the ones named) and saves what a player sees: the start, then each ending just after
// it lands, one row per level on a contact sheet per world. Also fails on a page error, a model name no builder
// knows, or a rope whose thing never arrives.
// Usage: node look.js <out folder> [first level number] [last level number]
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const out = process.argv[2] || fs.mkdtempSync(path.join(require('os').tmpdir(), 'snip-look-')), from = Number(process.argv[3]) || 1, to = Number(process.argv[4]) || 999;
const types = { '.js': 'text/javascript', '.html': 'text/html', '.json': 'application/json' };
const server = http.createServer((q, s) => { const f = path.join(__dirname, q.url.split('?')[0] === '/' ? 'index.html' : q.url.split('?')[0]); fs.readFile(f, (e, d) => { if (e) { s.writeHead(404); return s.end(); } s.writeHead(200, { 'content-type': types[path.extname(f)] || 'text/plain' }); s.end(d); }); }).listen(0);
const fails = [];

(async () => {
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 360, height: 640 }, deviceScaleFactor: 1 });
  page.on('pageerror', (e) => fails.push('page error: ' + e.message)); page.on('console', (m) => { if (m.type() === 'error' && !/favicon/.test(m.text())) fails.push('console: ' + m.text()); });
  await page.goto(`http://localhost:${server.address().port}/?local`);
  await page.waitForFunction(() => window.__game && window.__game.W && document.fonts.status === 'loaded', null, { timeout: 40000 });
  const total = await page.evaluate(() => __game.total);
  const swipe = async (id) => { const [x, y] = await page.evaluate((id) => { const p = __game.ropeAt(id); return __game.client(p[0], p[1]); }, id); await page.mouse.move(x - 30, y - 6); await page.mouse.down(); await page.mouse.move(x + 30, y + 6, { steps: 5 }); await page.mouse.up(); };
  const sheets = {};
  for (let n = Math.max(1, from); n <= Math.min(total, to); n++) {
    await page.evaluate((i) => __game.loadLevel(i), n - 1); await page.waitForTimeout(700);
    const L = await page.evaluate(() => ({ id: __game.level.id, world: __game.level.theme, bad: [...__game.level.items.map((x) => x.body.model), ...(__game.level.props || []).map((p) => p.model), ...(typeof __game.level.hero === 'object' ? [__game.level.hero.model] : [])].filter((m) => !__game.scene.kit.has(m)),
      order: [...__game.level.items.filter((x) => x.result === 'gag' && !x.needs), ...__game.level.items.filter((x) => x.needs), ...__game.level.items.filter((x) => x.result === 'win' && !x.needs)].map((x) => x.id) }));
    if (L.bad.length) fails.push(`level ${n} ${L.id}: unknown models ${L.bad.join(', ')}`);
    const shots = [await page.screenshot({ type: 'jpeg', quality: 70 })];
    // a thing that needs another cut first is cut early once (its early ending), then in turn
    const early = await page.evaluate(() => __game.level.items.filter((x) => x.needs && x.early).map((x) => x.id));
    for (const id of [...early, ...L.order]) {
      await swipe(id);
      if (!(await page.evaluate(() => __game.busy))) { fails.push(`level ${n} ${L.id}: swipe on ${id} cut nothing`); continue; }
      await page.waitForFunction(() => __game.landed, null, { timeout: 6000 }).catch(() => fails.push(`level ${n} ${L.id}: ${id} never arrived`));
      await page.waitForTimeout(420); shots.push(await page.screenshot({ type: 'jpeg', quality: 70 }));
      await page.waitForFunction(() => !__game.busy, null, { timeout: 6000 }).catch(() => fails.push(`level ${n} ${L.id}: stayed busy after ${id}`));
      await page.waitForTimeout(250);
    }
    if (!(await page.evaluate(() => __game.won))) fails.push(`level ${n} ${L.id}: not won after every rope`);
    (sheets[L.world] = sheets[L.world] || []).push({ n, id: L.id, shots: shots.map((b) => b.toString('base64')) });
    console.log(`level ${n} ${L.id}: ${shots.length} screens`);
  }
  // one contact sheet per world: a row per level
  for (const [world, rows] of Object.entries(sheets)) {
    const html = `<body style="margin:0;background:#222;font:20px sans-serif;color:#fff">${rows.map((r) => `<div style="display:flex;align-items:center;gap:4px;padding:2px"><b style="width:120px">${r.n} ${r.id}</b>${r.shots.map((s) => `<img style="height:420px" src="data:image/jpeg;base64,${s}">`).join('')}</div>`).join('')}</body>`;
    const p2 = await browser.newPage({ viewport: { width: 1400, height: 430 * rows.length } }); await p2.setContent(html); await p2.screenshot({ path: path.join(out, `world-${world}.jpg`), type: 'jpeg', quality: 55, fullPage: true }); await p2.close();
  }
  await browser.close(); server.close();
  console.log(fails.length ? `\n${fails.length} FAILED:\n- ` + fails.join('\n- ') : '\nall levels play through', '\nsheets in', out);
  process.exit(fails.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
