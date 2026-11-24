// PROTOTYPE - NOT FOR PRODUCTION
// Soak: many play cycles in one page (mine, place, splash, a wonder, an egg, a fall home, a day) and watches for leaks:
// GPU geometries/textures that keep growing, frame time (game code) that climbs, page errors, a save that breaks.
// Usage: node soak.js [cycles=14]
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const N = +process.argv[2] || 14;
const types = { '.js': 'text/javascript', '.html': 'text/html', '.json': 'application/json' };
const srv = http.createServer((q, s) => {
  const f = path.join(__dirname, q.url.split('?')[0] === '/' ? 'index.html' : q.url.split('?')[0]);
  fs.readFile(f, (e, d) => { if (e) { s.writeHead(404); return s.end(); } s.writeHead(200, { 'content-type': types[path.extname(f)] || 'text/plain' }); s.end(d); });
}).listen(0);
const fails = [];
const check = (ok, msg) => { console.log((ok ? 'ok   ' : 'FAIL ') + msg); if (!ok) fails.push(msg); };
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 360, height: 640 } });
  const errors = []; p.on('pageerror', (e) => errors.push(e.stack));
  await p.goto(`http://localhost:${srv.address().port}/?local`);
  await p.waitForFunction(() => window.__game && __game.loaded, null, { timeout: 60000 });
  await p.mouse.click(180, 200);
  const rows = [];
  for (let c = 0; c < N; c++) {
    const r = await p.evaluate((c) => {
      const g = __game, W = g.world, P = g.player, R = g.renderer, real = R.render;
      g.perf.warm = -1e9; g.locked = true;
      const times = [];
      const step = (secs) => { R.render = () => {}; for (let t = 0; t < secs; t += 1 / 30) { const a = performance.now(); g.frame(1 / 30); times.push(performance.now() - a); } R.render = real; };
      // mine around the spawn, place some back, splash with a big tool every few cycles
      P.spawnAt(62.5, 80.5); P.yaw = (c * 0.7) % 6.28; P.pitch = -1.1; step(0.2);
      g.mouseMine = true; step(3); g.mouseMine = false;
      if (c % 3 === 2) { g.S.gauge = Math.max(g.S.gauge, g.cfg.tools[2].at); const x = 58 + (c % 5), z = 84, y = W.groundY(x, z); g.mineCell(x, y, z, { face: { nx: 0, ny: 1, nz: 0 } }); }
      for (const t of Object.keys(g.S.inv)) if (g.S.inv[t] > 0) { g.S.bar[0] = +t; g.S.sel = 0; break; }
      P.pitch = -0.7; for (let k = 0; k < 6; k++) { P.yaw += 0.5; step(0.05); g.placeOrBuild(null); step(0.25); }
      // a wonder on cycles 1..4 (all four), an egg every cycle
      const bp = g.blueprints.list[c - 1];
      if (bp && !bp.done) { for (const k in bp.cost) g.S.inv[k] = (g.S.inv[k] || 0) + bp.cost[k]; P.spawnAt(bp.pad.x + 0.5, bp.pad.z + 0.5); step(0.1); g.placeOrBuild(null); step(14); }
      g.pets.egg(Math.floor(P.pos.x) + 1, Math.floor(P.pos.y), Math.floor(P.pos.z)); step(3);
      P.pos.y = -20; step(1);
      g.phase = (g.phase + 0.37) % 1; step(0.5);
      g.flushSave();
      R.render(g.scene, g.camera);
      times.sort((a, b) => a - b);
      const m = R.info.memory;
      return { geo: m.geometries, tex: m.textures, med: times[Math.floor(times.length / 2)], p90: times[Math.floor(times.length * 0.9)], built: g.S.built.length, pets: g.pets.pets.length, edits: W.edits.size, parts: g.vfx.parts.length, shards: g.vfx.shards.length };
    }, c);
    rows.push(r);
    console.log(`cycle ${c + 1}: geo ${r.geo} tex ${r.tex} frame med ${r.med.toFixed(2)} ms p90 ${r.p90.toFixed(2)} ms · wonders ${r.built} pets ${r.pets} edits ${r.edits}`);
  }
  // geometry after the four wonders are done (cycle 5 onward) must not keep climbing
  const late = rows.slice(5), g0 = late[0].geo, gN = late[late.length - 1].geo;
  check(gN - g0 <= 6, `GPU geometries stable after warm-up (${g0} → ${gN})`);
  check(late[late.length - 1].tex - late[0].tex <= 1, `textures stable (${late[0].tex} → ${late[late.length - 1].tex})`);
  const early = rows.slice(1, 4).map((r) => r.med), last = rows.slice(-3).map((r) => r.med), avg = (a) => a.reduce((x, y) => x + y, 0) / a.length;
  check(avg(last) - avg(early) < 3, `game-code frame time does not climb (${avg(early).toFixed(2)} → ${avg(last).toFixed(2)} ms)`);
  check(rows[rows.length - 1].built === 4, 'all four wonders built during the soak');
  const save = await p.evaluate(() => window.__writes && window.__writes[window.__writes.length - 1]);
  check(save && save.v === 1 && Array.isArray(save.edits) && JSON.stringify(save).length < 200000, `last save is whole (${save && JSON.stringify(save).length} bytes)`);
  check(errors.length === 0, 'no page errors: ' + errors.join(' / '));
  console.log(fails.length ? `\n${fails.length} FAILED` : '\nall passed');
  await b.close(); srv.close();
  process.exit(fails.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
