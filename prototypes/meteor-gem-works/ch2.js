// PROTOTYPE - NOT FOR PRODUCTION
// Browser check of chapter 2, the Frost Comet valley (switched on through the local ?drops= switch): a finished
// desert save, the cable car ride, the frost town built up by the bot, the aurora night, the frost finale, the album
// page, the ride back with the coins the desert earned meanwhile. Usage: node ch2.js [outDir]. Screenshots 49-58.
const http = require('http'), fs = require('fs'), path = require('path'), url = require('url');
const { chromium } = require('playwright');
const out = process.argv[2] || fs.mkdtempSync(path.join(require('os').tmpdir(), 'mg-ch2-'));
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
  const cfg = L.applyDrops(Object.assign(JSON.parse(JSON.stringify(raw)), { drops: { night: true, festival: true, ch2: true } }));
  // a bot game with every drop on, played (rules only) through chapter 1 to the cable car pad, saved just now
  const S = L.createState(cfg, 1);
  for (let i = 0; i < 20 * 3600 && !S.done1; i++) { L.step(cfg, S, 1 / 60, L.botInput(cfg, S), S.glint && S.glint.t > 0.6 ? { glint: true } : null); S.events.length = 0; }
  const save = Object.assign(L.serialize(cfg, S), { seen: Date.now() });

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
    await page.screenshot({ path: path.join(out, name + '.jpg'), type: 'jpeg', quality: 84, timeout: 120000 });
    check(g.white < cfg.look.glareMax, `${name}: glare ${(g.white * 100).toFixed(2)}% near-white (max ${cfg.look.glareMax * 100}%), mean luminance ${g.meanL.toFixed(0)}`);
  };
  const budget = async (what) => {
    await ev(() => __game.setTier(2)); await after(4); const a = await ev(() => __game.stats());
    await ev(() => __game.setTier(0)); await after(4); const b = await ev(() => __game.stats());
    await ev(() => __game.setTier(2)); await after(2);
    check(a.calls <= BUDGET[2], `${what}: tier 2 draw calls ${a.calls} (budget ${BUDGET[2]})`);
    check(b.calls <= BUDGET[0], `${what}: tier 0 draw calls ${b.calls} (budget ${BUDGET[0]})`);
  };
  const unlockTo = async (id, sec = 200) => ev(([k, s]) => { for (let i = 0; i < s; i++) { if (__game.S.pads.some((p) => p.id === k && p.done)) return true; __game.until('unlock', 1); } return __game.S.pads.some((p) => p.id === k && p.done); }, [id, sec]);

  await page.goto(`http://localhost:${server.address().port}/?local&tier=2&nointro&drops=night,festival,ch2`);
  await page.waitForFunction(() => window.__game, null, { timeout: 30000 });
  await page.waitForFunction(() => !document.getElementById('menu').hidden, null, { timeout: 8000 });
  await ev(() => { document.getElementById('cont').click(); __game.pause(); document.getElementById('hint').classList.add('gone'); });
  check(await ev(() => __game.L.travelOpen(__game.cfg, __game.S)), 'the finished desert opens the cable car to the valley');
  // the bot walks to the pad; the ride card covers the swap
  check(await ev(() => __game.until('travel', 40)), 'standing on the cable car pad starts the ride');
  await after(30); await page.screenshot({ path: path.join(out, '49-cable-car-ride.jpg'), type: 'jpeg', quality: 84, timeout: 120000 });
  check(await ev(() => __game.phase === 'ride' && !document.getElementById('ride').hidden), 'the ride card shows');
  await after(100);
  const arr = await ev(() => ({ area: __game.area, phase: __game.phase, theme: __game.cfg.theme, crit: __game.S.critters.length, same: __game.S2 && __game.S2.critters === __game.S1.critters, cash: __game.S.hero.cash, ride: document.getElementById('ride').hidden }));
  check(arr.area === 'frost' && arr.theme === 'frost' && arr.phase === 'play' && arr.ride, `the ride ends in the Frost Comet valley (${JSON.stringify(arr)})`);
  check(arr.same && arr.crit > 0, `the critter parade came along (${arr.crit})`);
  await ev(() => __game.until('unlock', 30)); await after(40);
  await shoot('50-frost-arrival-rig');
  check(await unlockTo('keeper'), 'the frost town builds up to the penguin shopkeeper');
  await ev(() => __game.run(6)); await after(20);
  await shoot('51-penguin-keeper');
  check(await unlockTo('workshop'), 'the snow globe workshop opens');
  await ev(() => __game.run(25)); await after(20);
  await shoot('52-snow-globes');
  check(await unlockTo('stargaze'), 'the cocoa stand opens');
  await ev(() => __game.run(4)); await after(30);
  await shoot('53-cocoa-stand');
  check(await unlockTo('neon', 260), 'the aurora sign lights up');
  await ev(() => { __game.setTod(1); __game.run(4); }); await after(40);
  await shoot('54-aurora-night');
  check(await ev(() => __game.until('comet', 300)), 'the frost finale reaches its comet (a red glow: chapter 3)');
  await after(190); await shoot('55-frost-finale-comet');
  check(await ev(() => __game.until('finaleEnd', 30)), 'the frost finale ends');
  const done = await ev(() => ({ done1: __game.S.done1, polaris: __game.S.critters.some((c) => c.id === 'polaris'), hats: __game.S.hats.filter((h) => ['earmuffs', 'beanie', 'icecrown'].includes(h)).length, stars: __game.S.stars.length }));
  check(done.done1 && done.polaris, `chapter 2 complete with Polaris (${JSON.stringify(done)})`);
  await ev(() => __game.run(8)); await after(10);
  await budget('frost, chapter 2 complete');
  await ev(() => __game.openAlbum()); await after(2);
  const tiles = await ev(() => ({ crit: document.querySelectorAll('#album .crit .tile').length, hats: document.querySelectorAll('#album .hats .tile').length, title: document.querySelector('#album h2').textContent, fits: (() => { const c = document.querySelector('#album .card'); return c.scrollHeight <= c.clientHeight + 2; })() }));
  check(tiles.crit === 8 && tiles.hats === 4 && tiles.fits, `the album opens on the valley page: 8 critters, 4 hats, fits (${JSON.stringify(tiles)})`);
  await shoot('56-album-frost-page');
  await ev(() => __game.closeAlbum());
  // the save holds both places; a ride back home collects what the desert sold meanwhile
  const snap = await ev(() => { __game.saveNow(); return new Promise((r) => setTimeout(() => r(window.__store.state), 50)); });
  check(!!snap && snap.area === 'frost' && !!snap.ch2 && snap.ch2.done1, 'the save holds both places and says where you are');
  // the valley's own pad leads home: stand on it (rules only) and it calls the ride back
  const back = await ev(() => { const S = __game.S, T = __game.cfg.travel; S.hero.x = T.x; S.hero.z = T.z; S.travelT = 0; for (let i = 0; i < 3 * 60; i++) { __game.L.step(__game.cfg, S, 1 / 60, { x: 0, z: 0 }, null); const e = S.events.find((q) => q.type === 'travel'); S.events.length = 0; if (e) return e.to; } return null; });
  check(back === 'desert', `the valley pad rides back to the desert (${back})`);
  const pile0 = await ev(() => __game.S1.cashPile);
  await ev(() => { __game.ride('desert'); __game.finishRide(); });
  await after(60);
  const home = await ev(() => ({ area: __game.area, theme: __game.cfg.theme || 'desert', pile: __game.S.cashPile }));
  check(home.area === 'desert' && home.pile > pile0, `back in the desert, and the town there kept selling (${pile0} -> ${home.pile} coins on the tray)`);
  await ev(() => __game.setTod(0.2)); await after(30);
  await shoot('57-back-in-the-desert');
  await ev(() => __game.setTier(0)); await after(10); await ev(() => { __game.setTod(0.1); }); await after(5);
  await shoot('58-desert-tier0-after-ch2');
  check(errors.length === 0, `no page errors (${errors.slice(0, 2).join(' | ')})`);
  await browser.close(); server.close();
  console.log(fails.length ? `${fails.length} FAILED` : 'all checks passed');
  process.exit(fails.length ? 1 : 0);
})();
