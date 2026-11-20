// PROTOTYPE - NOT FOR PRODUCTION
// Many soaps in one page: fails on any error, a broken save, feedback that stops in later rounds, or things
// that keep piling up (particles, canvases made per soap). Usage: node soak.js [orders]
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const N = +process.argv[2] || 14;
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.webp': 'image/webp' };
const server = http.createServer((q, r) => {
  const f = path.join(__dirname, decodeURIComponent(q.url.split('?')[0]).replace(/^\/$/, '/index.html'));
  fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); } else { r.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' }); r.end(d); } });
});
let failed = 0;
const ok = (c, what) => { console.log((c ? '  ok  ' : '  FAIL ') + what); if (!c) failed++; };
const BAR = JSON.parse(fs.readFileSync(path.join(__dirname, 'game_config.json'), 'utf8')).bar;

(async () => {
  await new Promise((r) => server.listen(0, r));
  const b = await chromium.launch(), ctx = await b.newContext({ viewport: { width: 720, height: 1280 } });
  await ctx.addInitScript(() => { const ce = document.createElement.bind(document); window.__canvases = 0; document.createElement = (t, o) => { if (String(t).toLowerCase() === 'canvas') window.__canvases++; return ce(t, o); }; });
  const p = await ctx.newPage(), errs = [];
  p.on('pageerror', (e) => errs.push(String(e))); p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto(`http://127.0.0.1:${server.address().port}/index.html?local`);
  await p.waitForFunction(() => window.__game && window.__game.S && window.__frames > 3 && !window.__game.booting(), null, { timeout: 10000 });
  const G = (f, a) => p.evaluate(f, a), wait = (f, a) => p.waitForFunction(f, a, { timeout: 15000 });
  const drag = async (pts) => { await p.mouse.move(pts[0][0], pts[0][1]); await p.mouse.down(); for (const q of pts.slice(1)) { await p.mouse.move(q[0], q[1]); await p.waitForTimeout(14); } await p.mouse.up(); };
  const perOrder = [];
  for (let k = 0; k < N; k++) {
    await wait(() => window.__game.S.enter <= 0 && window.__game.S.step === 0);
    const c0 = await G(() => window.__canvases);
    let curls = 0;
    for (let y = BAR.y; y < BAR.y + BAR.h + 10 && await G(() => window.__game.S.step === 0 && !window.__game.S.trim); y += (k % 2 ? 26 : 60)) {
      await drag(Array.from({ length: 14 }, (_, j) => [BAR.x - 20 + (BAR.w + 40) * j / 13, y]));
      curls = Math.max(curls, await G(() => window.__game.fx.P.filter((q) => q.k === 'curl').length + window.__game.S.shaveAcc));
    }
    if (await G(() => window.__game.S.step === 0 && !window.__game.S.trim)) await G(() => window.__game.finishCarve());
    await wait(() => window.__game.S.step === 1);
    await drag(Array.from({ length: 30 }, (_, j) => [BAR.x + 60 + (j % 2) * 220, BAR.y + 80 + j * 9]));
    await G(() => window.__game.S.step === 1 && window.__game.finishSmooth());
    await wait(() => window.__game.S.step === 2);
    await drag(Array.from({ length: 20 }, (_, j) => [300 + (j % 2) * 120, 520 + j * 8]));
    await G(() => window.__game.finishSparkle());
    await wait(() => window.__game.S.reveal && window.__game.S.reveal.t > 1.6);
    const info = await G(() => ({ n: window.__game.save.n, coins: window.__game.save.coins, shelf: window.__game.save.shelf.length, fx: window.__game.fx.P.length, size: JSON.stringify((window.__writes || []).slice(-1)[0] || {}).length, glit: window.__game.S.glitCount }));
    perOrder.push({ ...info, curls, canvases: (await G(() => window.__canvases)) - c0 });
    const nx = await G(() => window.__game.NEXT); await p.mouse.click(nx.x, nx.y);
  }
  console.log(perOrder.map((o, i) => `  #${i + 1} coins ${o.coins} shelf ${o.shelf} fx ${o.fx} canvases ${o.canvases} curls ${o.curls} glitter ${o.glit} save ${o.size}B`).join('\n'));
  ok(errs.length === 0, 'no errors in ' + N + ' soaps' + (errs.length ? ': ' + errs.slice(0, 3).join(' | ') : ''));
  ok(perOrder.every((o, i) => o.n === i + 1), 'every soap is counted once');
  ok(perOrder.every((o, i) => i === 0 || o.coins > perOrder[i - 1].coins), 'coins grow every soap');
  ok(perOrder[N - 1].shelf === Math.min(12, N), 'the shelf keeps the last 12');
  ok(perOrder.every((o) => o.curls > 0 && o.glit > 0), 'shavings and glitter still come in the last soaps');
  ok(Math.max(...perOrder.map((o) => o.fx)) < 900, 'particles stay capped');
  ok(Math.max(...perOrder.map((o) => o.size)) < 40000, 'the save stays under 40 KB');
  const cv = perOrder.map((o) => o.canvases).slice(1);
  ok(Math.max(...cv) - Math.min(...cv) < 40, `canvases made per soap stay level (${Math.min(...cv)}–${Math.max(...cv)})`);
  ok(await G(() => typeof window.__game.save.coins === 'number' && window.__game.S.n === window.__game.save.n), 'the next soap is soap ' + N);
  await b.close(); server.close();
  console.log(failed ? `\n${failed} FAILED` : '\nsoak passes');
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
