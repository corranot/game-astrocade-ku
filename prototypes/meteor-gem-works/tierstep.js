// Times the first frame after each adaptive-quality step (2->1->0->1->2), yielding between steps, CPU throttled 4x.
// usage: node tierstep.js <gameDir>
const http = require('http'), fs = require('fs'), path = require('path'); const { chromium } = require('playwright');
const [dir] = process.argv.slice(2);
const types = { '.js': 'text/javascript', '.html': 'text/html', '.json': 'application/json' };
const server = http.createServer((q, s) => { const f = path.join(dir, q.url.split('?')[0] === '/' ? 'index.html' : q.url.split('?')[0]); fs.readFile(f, (e, d) => { if (e) { s.writeHead(404); return s.end(); } s.writeHead(200, { 'content-type': types[path.extname(f)] || 'text/plain' }); s.end(d); }); }).listen(0);
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 120, height: 213 } }); const c = await p.context().newCDPSession(p);
  await p.goto(`http://localhost:${server.address().port}/?local&nointro&tier=${process.env.T0 || 2}`);
  await p.waitForFunction(() => window.__game, null, { timeout: 60000 });
  await p.evaluate(() => { __game.pause(); __game.run(120); for (let i = 0; i < 30; i++) __game.frame(1 / 60); });
  await p.waitForTimeout(4000); await c.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  const out = [];
  for (const t of (process.env.SEQ || "1,0,1,2,1,0").split(",").map(Number)) {
    out.push(await p.evaluate((t) => { const g = __game; g.scene.setTier(t); const a = performance.now(); g.frame(1 / 60); const first = performance.now() - a; const ft = []; for (let i = 0; i < 30; i++) { const s = performance.now(); g.frame(1 / 60); ft.push(performance.now() - s); } ft.sort((x, y) => x - y); return `tier ${t}: first frame ${Math.round(first)} ms, then median ${ft[15].toFixed(1)} ms`; }, t));
    await p.waitForTimeout(300);
  }
  console.log(out.join('\n')); await b.close(); server.close();
})();
