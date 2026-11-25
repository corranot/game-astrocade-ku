// PROTOTYPE - NOT FOR PRODUCTION
// M2 playtest: serves this folder, plays with the guide bot and with real input, and saves a screenshot of each moment
// the M2 build must show (cold open, NEXT card, first-glint finger, continue card, each of the seven unlocks, the bus,
// rings, the laser, the critter parade, Crystal Rush, the order bubble, mining close-up and Perfect punch-in, golden
// hour, dusk, tier 0, Arabic HUD). Checks: no page errors, glare under look.glareMax on every shot, live textures stay
// bounded after a long run (fix B), a real drag moves the hero, a real tap on the sparkle lands a Perfect Strike, the
// game saves and CONTINUE brings the progress back, NEW GAME needs a second tap, draw calls stay in the tier budget.
// Usage: node playtest.js <out folder>   (Playwright + swiftshader: frame times here are not a phone's)
// THREE_DIR=<three/build folder> serves three.js locally when the CDN is not reachable.
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const out = process.argv[2] || fs.mkdtempSync(path.join(require('os').tmpdir(), 'mg-playtest-'));
fs.mkdirSync(out, { recursive: true });
const types = { '.js': 'text/javascript', '.html': 'text/html', '.json': 'application/json' };
const server = http.createServer((q, s) => {
  const f = path.join(__dirname, q.url.split('?')[0] === '/' ? 'index.html' : q.url.split('?')[0]);
  fs.readFile(f, (e, d) => { if (e) { s.writeHead(404); return s.end(); } s.writeHead(200, { 'content-type': types[path.extname(f)] || 'text/plain' }); s.end(d); });
}).listen(0);
const cfg = JSON.parse(fs.readFileSync(path.join(__dirname, 'game_config.json')));
const BUDGET = { 0: 160, 2: 260 }; // draw calls per tier (see README: mobile budget)

async function open(browser, q = '', seed = null) {
  const page = await browser.newPage({ viewport: { width: 405, height: 720 }, deviceScaleFactor: 2 });
  if (seed) await page.addInitScript((s) => { window.__seedSave = s; }, seed);
  if (process.env.THREE_DIR) {
    const dir = process.env.THREE_DIR;
    await page.route(/cdnjs\.cloudflare\.com\/.*three\.module\.min\.js/, (r) => r.fulfill({ contentType: 'text/javascript', body: fs.readFileSync(path.join(dir, 'three.module.min.js')) }));
    await page.route(/cdnjs\.cloudflare\.com\/.*three\.core\.min\.js/, (r) => r.fulfill({ contentType: 'text/javascript', body: fs.readFileSync(path.join(dir, 'three.core.min.js')) }));
  }
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(m.text()); });
  await page.goto(`http://localhost:${server.address().port}/?local${q}`);
  await page.waitForFunction(() => window.__game, null, { timeout: 30000 });
  return { page, errors };
}

(async () => {
  const fails = [];
  const check = (ok, msg) => { console.log((ok ? 'ok   ' : 'FAIL ') + msg); if (!ok) fails.push(msg); };
  {
    // the Astrocade bundle runs every module before three.js arrives: importing one must not touch THREE
    const bad = [], url = require('url');
    globalThis.window = globalThis;
    for (const f of ['logic', 'models', 'scene', 'game']) { try { await import(url.pathToFileURL(path.join(__dirname, f + '.js')).href); } catch (e) { bad.push(`${f}.js: ${e.message}`); } }
    delete globalThis.window; delete globalThis.run;
    check(bad.length === 0, `no module touches THREE when imported (${bad.join('; ') || 'all 4 load'})`);
  }
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const shots = [];
  const shoot = async (page, name) => {
    const g = await page.evaluate(() => __game.glare());
    await page.screenshot({ path: path.join(out, name + '.jpg'), type: 'jpeg', quality: 84 });
    shots.push(name); check(g.white < cfg.look.glareMax, `${name}: glare ${(g.white * 100).toFixed(2)}% near-white (max ${cfg.look.glareMax * 100}%), mean luminance ${g.meanL.toFixed(0)}`);
  };
  const ev = (page, fn, arg) => page.evaluate(fn, arg);
  const frames = (n) => `for (let i = 0; i < ${n}; i++) __game.frame(1 / 60);`;

  // ---- a new game: the cold open (meteor lands, any tap skips), then the NEXT card, real drag and the first-glint finger
  let saved = null;
  {
    const { page, errors } = await open(browser, '&tier=2&tod=0.1');
    await ev(page, () => __game.pause());
    check(await ev(page, () => __game.phase) === 'intro', 'a new game opens with the cold open');
    await ev(page, () => { for (let i = 0; i < 50; i++) __game.draw(1 / 60); });
    await shoot(page, '01-cold-open-fall');
    await ev(page, () => { for (let i = 0; i < 46; i++) __game.draw(1 / 60); });
    await shoot(page, '02-cold-open-impact');
    await page.mouse.click(200, 400); // any tap skips the rest
    await ev(page, () => { for (let i = 0; i < 50; i++) { __game.draw(1 / 60); __game.frame(1 / 60); } });
    check(await ev(page, () => __game.phase) === 'play', 'a tap skips the cold open into play');
    await shoot(page, '03-start-next-card');
    const x0 = await ev(page, () => __game.S.hero.x);
    await page.mouse.move(200, 500); await page.mouse.down(); await page.mouse.move(280, 500, { steps: 4 });
    await ev(page, () => { for (let i = 0; i < 40; i++) __game.frame(1 / 60); });
    await page.mouse.up();
    const x1 = await ev(page, () => __game.S.hero.x);
    check(x1 > x0 + 1, `a drag to the right walks the hero right (${x0.toFixed(2)} -> ${x1.toFixed(2)})`);
    await ev(page, () => { __game.until('glint', 20); for (let i = 0; i < 20; i++) __game.frame(1 / 60); });
    check(await ev(page, () => !document.getElementById('tap').hidden), 'the first sparkle gets a tapping finger');
    await shoot(page, '04-first-glint-finger');
    const p = await ev(page, () => __game.glintScreen());
    if (p) {
      const before = await ev(page, () => __game.S.pile);
      await page.mouse.click(p[0], p[1]);
      await ev(page, () => { for (let i = 0; i < 3; i++) __game.frame(1 / 60); });
      const after = await ev(page, () => __game.S.pile);
      check(after > before, `a tap on the sparkle lands a Perfect Strike (pile ${before} -> ${after})`);
    } else check(false, 'a sparkle appears on the meteor');
    // play on with the guide, then save
    await ev(page, () => __game.run(150));
    await ev(page, () => __game.saveNow());
    await page.waitForTimeout(200);
    saved = await ev(page, () => window.__store.state);
    const st = await ev(page, () => ({ sold: __game.S.sold, pads: __game.S.pads.filter((q) => q.done).length }));
    check(saved && saved.sold === st.sold && saved.pads.filter((q) => q[1]).length === st.pads && st.pads >= 3, `the game saves its progress (${st.sold} sold, ${st.pads} unlocks)`);
    check(errors.length === 0, `no page errors in the new-game run (${errors.slice(0, 2).join(' | ')})`);
    await page.close();
  }

  // ---- a returning player: CONTINUE brings the town back; NEW GAME needs a second tap
  {
    const { page, errors } = await open(browser, '&tier=2&tod=0.2', saved);
    await ev(page, () => __game.pause());
    await page.waitForFunction(() => !document.getElementById('menu').hidden, null, { timeout: 5000 }).catch(() => {});
    check(await ev(page, () => __game.phase) === 'menu', 'a saved game shows the CONTINUE / NEW GAME card');
    await ev(page, () => { for (let i = 0; i < 90; i++) __game.draw(1 / 60); });
    await shoot(page, '05-continue-card');
    await page.click('#newg', { force: true });
    check(await ev(page, () => __game.phase) === 'menu' && await ev(page, () => document.getElementById('newg').classList.contains('sure')), 'NEW GAME asks for a second tap');
    await page.click('#cont', { force: true });
    const r = await ev(page, () => ({ phase: __game.phase, sold: __game.S.sold, pads: __game.S.pads.filter((q) => q.done).length }));
    check(r.phase === 'play' && r.sold === saved.sold && r.pads === saved.pads.filter((q) => q[1]).length, `CONTINUE restores the save (${r.sold} sold, ${r.pads} unlocks)`);
    await ev(page, () => { for (let i = 0; i < 30; i++) __game.frame(1 / 60); });
    await shoot(page, '06-continued-town');
    check(errors.length === 0, `no page errors in the continue run (${errors.slice(0, 2).join(' | ')})`);
    await page.close();
  }

  // ---- every unlock and big moment in order from a fresh start (each waits for its own event, then a close-up)
  {
    const { page, errors } = await open(browser, '&tier=2&tod=0&bot');
    await ev(page, () => __game.pause());
    await ev(page, () => { __game.until('hit', 10); for (let i = 0; i < 60; i++) __game.frame(1 / 60); });
    await shoot(page, '07-mining-closeup');
    await ev(page, () => { __game.until('perfect', 20); for (let i = 0; i < 8; i++) __game.frame(1 / 60); });
    await shoot(page, '08-perfect-punch-in');
    const W = cfg.world, at = (x, y, z) => ({ x, y, z });
    const moments = [
      ['unlock', 'rig', '09-unlock-drill-rig', 50],
      ['hatch', null, '10-new-critter', 40],
      ['unlock', 'conveyor', '11-unlock-conveyor', 70, at(-5.4, 0.8, 5.6), 0.62],
      ['unlock', 'stand2', '12-unlock-stand2-lanterns', 60],
      ['unlock', 'keeper', '13-unlock-shopkeeper', 50],
      ['keeperDrop', null, '14-keeper-delivers', 10, at(W.stands[0].x - 0.5, 0.6, W.stands[0].z + 0.4), 0.5],
      ['unlock', 'road', '15-unlock-road', 50],
      ['bus', null, '16-tour-bus', 150],
      ['order', null, '17-order-bubble', 30, at(W.order.x, 0.6, W.order.z - 0.6), 0.55],
      ['unlock', 'workshop', '18-unlock-ring-workshop', 50],
      ['ring', null, '19-rings', 30, at(W.workshop.x - 0.4, 0.8, W.workshop.z + 0.8), 0.5],
      ['unlock', 'laser', '20-unlock-laser', 50],
      ['laserHit', null, '21-laser-fires', 5, at(W.laserAt.x, 1.2, W.laserAt.z - 0.6), 0.55],
      ['rush', null, '22-crystal-rush', 110],
    ];
    const seen = [];
    for (const [type, id, name, frameN, focus, zoom] of moments) {
      const ok = await ev(page, ([t, i]) => { for (let k = 0; k < 400; k++) { if (!__game.until(t, 1)) continue; const e = __game.lastEvents; if (!i || e.some((x) => x.type === t && x.id === i)) return true; } return false; }, [type, id]);
      if (focus) await ev(page, ([f, z]) => __game.scene.showcase(new THREE.Vector3(f.x, f.y, f.z), z, 3), [focus, zoom]);
      await ev(page, (n) => { for (let i = 0; i < n; i++) __game.frame(1 / 60); }, frameN);
      seen.push(`${type}${id ? ':' + id : ''}${ok ? '' : ' (missed)'}`); check(ok, `moment ${name} happened`); console.log(`info ${name} at game time ${(await ev(page, () => __game.S.t)) | 0} s`);
      await shoot(page, name);
    }
    console.log('info moments: ' + seen.join(', '));
    const st = await ev(page, () => __game.stats());
    check(st.calls <= BUDGET[2], `tier 2 draw calls with everything built: ${st.calls} (budget ${BUDGET[2]}), ${st.tris} triangles`);
    // the parade: all six critters behind the hero
    await ev(page, () => { for (let k = 0; k < 8 && __game.S.critters.length < 6; k++) __game.until('hatch', 120); __game.run(4); const S = __game.S; __game.scene.showcase(new THREE.Vector3(S.hero.x, 0.6, S.hero.z - 1), 0.6, 3); for (let i = 0; i < 50; i++) __game.frame(1 / 60); });
    check(await ev(page, () => __game.S.critters.length) === 6, 'all six critters hatch');
    await shoot(page, '23-critter-parade');
    // a long run: textures must stay bounded (pops are DOM, pads redraw in place)
    await ev(page, () => __game.run(120));
    const s2 = await ev(page, () => __game.stats());
    check(s2.textures <= 60, `live textures after a long run: ${s2.textures} (max 60); geometries ${s2.geometries}`);
    await shoot(page, '24-noon-busy');
    check(errors.length === 0, `no page errors in the moments run (${errors.slice(0, 2).join(' | ')})`);
    await page.close();
  }

  // ---- golden hour, dusk, tier 0 (budget), Arabic HUD: a built-up town from a late save
  for (const [name, q, sec] of [['25-golden-hour', '&tier=2&tod=0.5&bot', 230], ['26-dusk-lanterns', '&tier=2&tod=1&bot', 230], ['27-tier0-noon', '&tier=0&tod=0&bot', 230], ['28-arabic-hud', '&tier=1&tod=0.3&lang=ar&bot', 60]]) {
    const { page, errors } = await open(browser, q);
    await ev(page, () => __game.pause());
    await ev(page, (s) => __game.run(s), sec);
    await shoot(page, name);
    if (name.startsWith('27')) {
      const ms = await ev(page, () => { const t0 = performance.now(); for (let i = 0; i < 60; i++) __game.frame(1 / 60); return (performance.now() - t0) / 60; });
      const st = await ev(page, () => __game.stats());
      check(st.calls <= BUDGET[0], `tier 0 draw calls late game: ${st.calls} (budget ${BUDGET[0]}), ${st.tris} triangles`);
      console.log(`info tier 0: ${ms.toFixed(1)} ms per frame on swiftshader (CPU raster, not a phone)`);
    }
    check(errors.length === 0, `no page errors (${name}) ${errors.slice(0, 2).join(' | ')}`);
    await page.close();
  }

  await browser.close(); server.close();
  console.log(`\n${shots.length} screenshots in ${out}`);
  console.log(fails.length ? `${fails.length} FAILED` : 'all checks passed');
  process.exit(fails.length ? 1 : 0);
})();
