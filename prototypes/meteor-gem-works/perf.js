// Long-session frame cost of Meteor Gems: plays with the bot, then times N real frames per phase with the CPU slowed.
// usage: node perf.js <gameDir> <outJson> [rate=4] [frames=360]
const http = require('http'), fs = require('fs'), path = require('path'); const { chromium } = require('playwright');
const [dir, out, rate = 4, N = 360] = process.argv.slice(2);
const types = { '.js': 'text/javascript', '.html': 'text/html', '.json': 'application/json' };
const server = http.createServer((q, s) => { const f = path.join(dir, q.url.split('?')[0] === '/' ? 'index.html' : q.url.split('?')[0]); fs.readFile(f, (e, d) => { if (e) { s.writeHead(404); return s.end(); } s.writeHead(200, { 'content-type': types[path.extname(f)] || 'text/plain' }); s.end(d); }); }).listen(0);
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--enable-precise-memory-info', '--js-flags=--expose-gc'] });
  const p = await b.newPage({ viewport: { width: +(process.env.VW || 120), height: +(process.env.VH || 213) } }); const c = await p.context().newCDPSession(p);
  await p.goto(`http://localhost:${server.address().port}/?local&nointro&tier=2&drops=ch2`);
  await p.waitForFunction(() => window.__game, null, { timeout: 60000 });
  await p.evaluate(() => { __game.pause(); document.getElementById('hint').classList.add('gone'); });
  const res = {};
  const measure = async (name) => {
    await p.evaluate(() => { for (let i = 0; i < 30; i++) __game.frame(1 / 60); }); // settle (shader builds for new things)
    await c.send('Emulation.setCPUThrottlingRate', { rate: +rate });
    const r = await p.evaluate((n) => { const g = __game, sc = g.scene, rr = sc.render; let rm = 0; sc.render = () => { const t = performance.now(); rr.call(sc); rm += performance.now() - t; };
      const ft = [], rt = [], h0 = performance.memory.usedJSHeapSize; let drops = 0, lastH = h0;
      for (let i = 0; i < n; i++) { rm = 0; const t = performance.now(); g.frame(1 / 60); ft.push(+(performance.now() - t).toFixed(2)); rt.push(+rm.toFixed(2)); const h = performance.memory.usedJSHeapSize; if (h < lastH - 2e5) drops++; lastH = h; }
      sc.render = rr; const s = g.stats(); return { ft, rt, gcDrops: drops, heapMB: +((performance.memory.usedJSHeapSize - h0) / 1e6).toFixed(2), calls: s.calls, tris: s.tris, tex: s.textures, geo: s.geometries, progs: sc.renderer.info.programs.length, crit: g.S.critters.length, sold: g.S.sold, area: g.area, t: Math.round(g.S.t || 0) }; }, +N);
    await c.send('Emulation.setCPUThrottlingRate', { rate: 1 });
    const q = (a, k) => { const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(s.length * k))]; };
    r.med = q(r.ft, 0.5); r.p99 = q(r.ft, 0.99); r.max = Math.max(...r.ft); r.over50 = r.ft.filter((x) => x > 50).length; r.renderMed = q(r.rt, 0.5); r.cpuMed = +(q(r.ft.map((x, i) => x - r.rt[i]), 0.5)).toFixed(2);
    res[name] = r; console.log(name, JSON.stringify({ med: r.med, p99: r.p99, max: r.max, over50: r.over50, cpu: r.cpuMed, render: r.renderMed, gc: r.gcDrops, heapMB: r.heapMB, calls: r.calls, tris: r.tris, progs: r.progs, crit: r.crit, t: r.t, area: r.area }));
  };
  const play = (sec) => p.evaluate((s) => __game.run(s), sec);
  await measure('start');
  await play(180); await measure('3min');
  await play(300); await measure('8min');
  await play(420); await measure('15min');
  console.log('finale', await p.evaluate(() => __game.until('finaleEnd', 1500)));
  await measure('ch1done');
  console.log('travel', await p.evaluate(() => { const ok = __game.until('travel', 120); for (let i = 0; i < 200; i++) __game.frame(1 / 60); if (__game.phase === 'ride') __game.finishRide(); return ok + ' ' + __game.area; }));
  await play(240); await measure('frost4min');
  fs.writeFileSync(out, JSON.stringify(res)); await b.close(); server.close();
})();
