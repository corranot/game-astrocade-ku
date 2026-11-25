// PROTOTYPE - NOT FOR PRODUCTION
// M1 playtest: serves this folder, plays with the guide bot, and saves a screenshot of each moment the M1 look must
// show (noon square, Perfect Strike, polisher, stand with tourists, egg hatch, critter, drill rig unlock, golden hour,
// dusk, tier 0, Arabic HUD). Checks: no page errors, glare under look.glareMax on every shot, live textures stay
// bounded after a long run (fix B), a real drag moves the hero, a real tap on the sparkle lands a Perfect Strike.
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

async function open(browser, q = '') {
  const page = await browser.newPage({ viewport: { width: 405, height: 720 }, deviceScaleFactor: 2 });
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
    await page.screenshot({ path: path.join(out, name + '.png') });
    shots.push(name); check(g.white < cfg.look.glareMax, `${name}: glare ${(g.white * 100).toFixed(2)}% near-white (max ${cfg.look.glareMax * 100}%), mean luminance ${g.meanL.toFixed(0)}`);
  };
  const ev = (page, fn, arg) => page.evaluate(fn, arg);

  // ---- real input: a drag walks the hero, a tap on the sparkle is a Perfect Strike
  {
    const { page, errors } = await open(browser, '&tier=1');
    await ev(page, () => __game.pause());
    const x0 = await ev(page, () => __game.S.hero.x);
    await page.mouse.move(200, 500); await page.mouse.down(); await page.mouse.move(280, 500, { steps: 4 });
    await ev(page, () => { for (let i = 0; i < 40; i++) __game.frame(1 / 60); });
    await page.mouse.up();
    const x1 = await ev(page, () => __game.S.hero.x);
    check(x1 > x0 + 1, `a drag to the right walks the hero right (${x0.toFixed(2)} -> ${x1.toFixed(2)})`);
    await ev(page, () => __game.until('glint', 20));
    const p = await ev(page, () => __game.glintScreen());
    check(!!p, 'a sparkle appears on the meteor');
    if (p) {
      await page.mouse.click(p[0], p[1]);
      const got = await ev(page, () => { for (let i = 0; i < 3; i++) { __game.frame(1 / 60); } return __game.S.glint === null && __game.S.pile >= 0; });
      const perfect = await ev(page, () => __game.S.pile);
      check(got, `a tap on the sparkle lands a Perfect Strike (pile now ${perfect})`);
    }
    check(errors.length === 0, `no page errors in the input test (${errors.slice(0, 2).join(' | ')})`);
    await page.close();
  }

  // ---- the M1 moments at noon, tier 2 (glow pass)
  {
    const { page, errors } = await open(browser, '&tier=2&tod=0&bot');
    await ev(page, () => __game.pause());
    await ev(page, () => __game.run(1.5)); await shoot(page, '01-noon-start');
    await ev(page, () => { const S = __game.S; __game.until('hit', 10); __game.scene.showcase(new THREE.Vector3(S.hero.x, 1.2, S.hero.z - 1.2), 0.42, 4); for (let i = 0; i < 50; i++) __game.frame(1 / 60); });
    await shoot(page, '01b-mining-closeup');
    // Perfect Strike close-up
    await ev(page, () => { __game.until('glint', 20); for (let i = 0; i < 30; i++) __game.frame(1 / 60); });
    await ev(page, () => { const g = __game.S.glint; __game.scene.showcase(__game.scene.surf(g.lon, g.lat), 0.5, 3); __game.tapGlint(); for (let i = 0; i < 40; i++) __game.frame(1 / 60); });
    await ev(page, () => { __game.tapGlint(); for (let i = 0; i < 9; i++) __game.frame(1 / 60); });
    await shoot(page, '02-perfect-strike');
    // first sale -> stand and tourists close-up
    await ev(page, () => { __game.until('sale', 30); const W = __game.cfg.world; __game.scene.showcase(new THREE.Vector3(W.stand.x, 0.5, W.stand.z + 0.8), 0.5, 3); for (let i = 0; i < 40; i++) __game.frame(1 / 60); });
    await shoot(page, '03-stand-tourists');
    // polisher and counter close-up
    await ev(page, () => { const W = __game.cfg.world; __game.until('gem', 30); __game.scene.showcase(new THREE.Vector3((W.polisher.x + W.counter.x) / 2, 0.8, W.polisher.z), 0.5, 3); for (let i = 0; i < 40; i++) __game.frame(1 / 60); });
    await shoot(page, '04-polisher-counter');
    // egg: drop, hatching, the critter
    await ev(page, () => { __game.run(6); const S = __game.S; __game.scene.showcase(new THREE.Vector3(S.hero.x, 0.6, S.hero.z), 0.45, 3); for (let i = 0; i < 45; i++) __game.frame(1 / 60); });
    await shoot(page, '08-critter-follows');
    // a long run: textures must stay bounded (pops are DOM, pads redraw in place)
    await ev(page, () => __game.run(90));
    const st = await ev(page, () => __game.stats());
    check(st.textures <= 60, `live textures after a long run: ${st.textures} (max 60); geometries ${st.geometries}`);
    await shoot(page, '09-noon-busy');
    const s = await ev(page, () => ({ sold: __game.S.sold, made: __game.S.made, rig: !!__game.S.rig, critter: !!__game.S.critter }));
    check(s.sold > 20 && s.rig && s.critter, `bot loop after ~3 min: ${s.sold} sold, ${s.made} polished, rig ${s.rig}, critter ${s.critter}`);
    console.log(`info draw calls ${st.calls}, triangles ${st.tris} (tier 2)`);
    check(errors.length === 0, `no page errors at noon (${errors.slice(0, 2).join(' | ')})`);
    await page.close();
  }

  // ---- the big moments in order from a fresh start (each one waits for its own event, so none is missed)
  {
    const { page, errors } = await open(browser, '&tier=2&tod=0&bot');
    await ev(page, () => __game.pause());
    const seen = [];
    for (const [type, name, frames, show] of [['hatchStart', '05-egg-hatching', 130, true], ['hatch', '06-hatch-new-friend', 20, false], ['unlock', '07-drill-rig-unlock', 45, false]]) {
      const ok = await ev(page, ([t, f, sh]) => { const W = __game.cfg.world, S = __game.S; const done = t === 'unlock' ? S.pads[0].done : t === 'hatchStart' ? S.egg.st === 'hatching' || S.egg.st === 'done' : S.egg.st === 'done'; const r = done || __game.until(t, 60); if (sh) __game.scene.showcase(new THREE.Vector3(W.egg.x, 0.6, W.egg.z), 0.45, 4); for (let i = 0; i < f; i++) __game.frame(1 / 60); return r && !done; }, [type, frames, show]);
      seen.push(`${type}${ok ? '' : ' (already past)'}`);
      await shoot(page, name);
    }
    console.log('info moments: ' + seen.join(', '));
    check(errors.length === 0, `no page errors in the moments run (${errors.slice(0, 2).join(' | ')})`);
    await page.close();
  }

  // ---- golden hour, dusk, tier 0, Arabic HUD
  for (const [name, q, sec] of [['10-golden-hour', '&tier=2&tod=0.5&bot', 40], ['11-dusk', '&tier=2&tod=1&bot', 40], ['12-tier0-noon', '&tier=0&tod=0&bot', 40], ['13-arabic-hud', '&tier=1&tod=0.3&lang=ar', 3]]) {
    const { page, errors } = await open(browser, q);
    await ev(page, () => __game.pause());
    await ev(page, (s) => __game.run(s), sec);
    await shoot(page, name);
    if (name.startsWith('12')) {
      const ms = await ev(page, () => { const t0 = performance.now(); for (let i = 0; i < 60; i++) __game.frame(1 / 60); return (performance.now() - t0) / 60; });
      const st = await ev(page, () => __game.stats());
      console.log(`info tier 0: ${ms.toFixed(1)} ms per frame on swiftshader (CPU raster, not a phone), ${st.calls} draw calls, ${st.tris} triangles`);
    }
    check(errors.length === 0, `no page errors (${name}) ${errors.slice(0, 2).join(' | ')}`);
    await page.close();
  }

  await browser.close(); server.close();
  console.log(`\n${shots.length} screenshots in ${out}`);
  console.log(fails.length ? `${fails.length} FAILED` : 'all checks passed');
  process.exit(fails.length ? 1 : 0);
})();
