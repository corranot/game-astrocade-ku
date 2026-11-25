// PROTOTYPE - NOT FOR PRODUCTION
// Browser check of the post-launch drops (updates.md): Night Critters and the Desert Festival switched on through the
// local ?drops= switch, from a late save. Usage: node drops.js [outDir]. Screenshots 44-48 go to outDir.
const http = require('http'), fs = require('fs'), path = require('path'), url = require('url');
const { chromium } = require('playwright');
const out = process.argv[2] || fs.mkdtempSync(path.join(require('os').tmpdir(), 'mg-drops-'));
fs.mkdirSync(out, { recursive: true });
const types = { '.js': 'text/javascript', '.html': 'text/html', '.json': 'application/json' };
const server = http.createServer((q, s) => {
  const f = path.join(__dirname, q.url.split('?')[0] === '/' ? 'index.html' : q.url.split('?')[0]);
  fs.readFile(f, (e, d) => { if (e) { s.writeHead(404); return s.end(); } s.writeHead(200, { 'content-type': types[path.extname(f)] || 'text/plain' }); s.end(d); });
}).listen(0);
const raw = JSON.parse(fs.readFileSync(path.join(__dirname, 'game_config.json')));
const BUDGET = { 0: 160, 2: 260 };

(async () => {
  const L = await import(url.pathToFileURL(path.join(__dirname, 'logic.js')).href);
  const cfg = L.applyDrops(Object.assign(JSON.parse(JSON.stringify(raw)), { drops: { night: true, festival: true } }));
  // a bot game with both drops on, played (rules only) past every critter, saved 10 hours ago
  const S = L.createState(cfg, 1);
  for (let i = 0; i < 24 * 60 * 60; i++) { L.step(cfg, S, 1 / 60, L.botInput(cfg, S), S.glint && S.glint.t > 0.6 ? { glint: true } : null); S.events.length = 0; }
  const save = Object.assign(L.serialize(cfg, S), { seen: Date.now() - 10 * 3600e3 });
  // keep two critters unhatched so the gift's egg has someone to bring
  save.critters = save.critters.filter((id) => id !== 'lumen' && id !== 'cometpup');

  const fails = [], check = (ok, msg) => { console.log((ok ? 'ok   ' : 'FAIL ') + msg); if (!ok) fails.push(msg); };
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 405, height: 720 }, deviceScaleFactor: 2 });
  await page.addInitScript((s) => { window.__seedSave = s; }, save);
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(m.text()); });
  const ev = (fn, arg) => page.evaluate(fn, arg), after = (n) => ev((k) => { for (let i = 0; i < k; i++) __game.frame(1 / 60); }, n);
  const shoot = async (name) => {
    const g = await ev(() => __game.glare());
    await page.screenshot({ path: path.join(out, name + '.jpg'), type: 'jpeg', quality: 84 });
    check(g.white < cfg.look.glareMax, `${name}: glare ${(g.white * 100).toFixed(2)}% near-white (max ${cfg.look.glareMax * 100}%)`);
  };
  await page.goto(`http://localhost:${server.address().port}/?local&tier=2&nointro&drops=night,festival`);
  await page.waitForFunction(() => window.__game, null, { timeout: 30000 });
  await page.waitForFunction(() => !document.getElementById('menu').hidden, null, { timeout: 8000 });
  const gift = await ev(() => { document.getElementById('cont').click(); __game.pause(); document.getElementById('hint').classList.add('gone'); return __game.S.events.find((e) => e.type === 'gift') || null; });
  await after(40);
  check(!!gift && gift.coins > 0 && gift.egg, `welcome-back gift on Continue after 10 h (${JSON.stringify(gift)})`);
  await shoot('44-welcome-back-gift');
  const hatched = await ev(() => __game.until('hatch', 15));
  check(hatched, 'the gift egg hatches a night critter within 15 s');
  await after(60); await shoot('45-night-critter-hatch');
  // the parade keeps to critter.show with the legendary one in it
  const par = await ev(() => ({ n: __game.S.critters.length, shown: __game.S.critters.filter((c) => !c.hide).length, nova: __game.S.critters.some((c) => c.id === 'nova' && !c.hide) }));
  check(par.shown <= cfg.critter.show && par.nova, `parade shows ${par.shown} of ${par.n} critters, Nova among them`);
  // night: lanterns and fireworks over the festival arch
  await ev(() => __game.setTod(1)); await after(30);
  const fw = await ev(() => { const sc = __game.scene, f = sc.firework; let k = 0; sc.firework = () => { k++; f(); }; __game.run(30); sc.firework = f; return k; });
  check(fw >= 3, `fireworks go up at night on their own (${fw} in 30 s)`);
  await ev(() => { __game.scene.firework(); __game.scene.firework(); }); await after(24);
  await shoot('46-festival-night-fireworks');
  // the album with 18 critters and 9 hats
  await ev(() => __game.openAlbum()); await after(2);
  const tiles = await ev(() => ({ crit: document.querySelectorAll('#album .crit .tile').length, hats: document.querySelectorAll('#album .hats .tile').length, fits: (() => { const c = document.querySelector('#album .card'); return c.scrollHeight <= c.clientHeight + 2; })() }));
  check(tiles.crit === 18 && tiles.hats === 9, `album lists 18 critters and 9 hats (${JSON.stringify(tiles)})`);
  check(tiles.fits, 'album card fits without scrolling');
  await shoot('47-album-night-critters');
  await ev(() => __game.closeAlbum()); await after(10);
  const st2 = await ev(() => __game.stats());
  check(st2.calls <= BUDGET[2], `tier 2 draw calls with both drops: ${st2.calls} (budget ${BUDGET[2]})`);
  await ev(() => __game.setTier(0)); await after(5);
  const st0 = await ev(() => __game.stats());
  check(st0.calls <= BUDGET[0], `tier 0 draw calls with both drops: ${st0.calls} (budget ${BUDGET[0]})`);
  await ev(() => __game.setTod(0.3)); await after(5);
  await shoot('48-festival-day-tier0');
  check(errors.length === 0, `no page errors (${errors.slice(0, 2).join(' | ')})`);
  await browser.close(); server.close();
  console.log(fails.length ? `${fails.length} FAILED` : 'all checks passed');
  process.exit(fails.length ? 1 : 0);
})();
