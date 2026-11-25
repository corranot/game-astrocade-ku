// PROTOTYPE - NOT FOR PRODUCTION
// M2 playtest: serves this folder, plays with the guide bot and with real input, and saves a screenshot of each moment
// the M2 build must show (cold open, NEXT card, first-glint finger, continue card, each of the seven unlocks, the bus,
// rings, the laser, the critter parade, Crystal Rush, the order bubble, mining close-up and Perfect punch-in, golden
// hour, dusk, tier 0, Arabic HUD). Checks: no page errors, glare under look.glareMax on every shot, live textures stay
// bounded after a long run (fix B), a real drag moves the hero, a real tap on the sparkle lands a Perfect Strike, the
// game saves and CONTINUE brings the progress back, NEW GAME needs a second tap, draw calls stay in the tier budget.
// M3 (from a simulated save, so it starts late): the ghost town goal card and each house lighting up, unlocks 8-14,
// a crown riding the cable car, neon at night, the finale (heart, legendary hatch, comet, fireworks), the share button
// (sends a picture), the album (tap a hat to wear it), the tier budgets with chapter 1 complete, the perf guard (slow
// frames lower the resolution, then the tier) and a soak of 16 game minutes (textures, geometries and heap stay flat).
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
/** A save of a bot game played (logic only, no rendering) to second sec: late-game shots start from it. */
async function saveAt(sec) {
  const L = await import(require('url').pathToFileURL(path.join(__dirname, 'logic.js')).href), c = L.applyDrops(JSON.parse(JSON.stringify(cfg))), S = L.createState(c, 1);
  for (let i = 0; i < sec * 60; i++) { L.step(c, S, 1 / 60, L.botInput(c, S), S.glint && S.glint.t > 0.6 ? { glint: true } : null); S.events.length = 0; }
  return L.serialize(c, S);
}

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
      ['unlock', 'workshop', '18-unlock-ring-workshop', 50],
      ['ring', null, '19-rings', 30, at(W.workshop.x - 0.4, 0.8, W.workshop.z + 0.8), 0.5],
      ['unlock', 'laser', '20-unlock-laser', 50],
      ['laserHit', null, '21-laser-fires', 5, at(W.laserAt.x, 1.2, W.laserAt.z - 0.6), 0.55],
      ['rush', null, '22-crystal-rush', 110],
      ['order', null, '17-order-bubble', 30, at(W.order.x, 0.6, W.order.z - 0.6), 0.55], // orders recur: wait for one after the unlocks
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
    check(await ev(page, () => __game.S.critters.length) >= 6, 'six critters hatch');
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

  // ---- M3: chapter 1's second half from a save taken right after the laser (seed 1)
  {
    const { page, errors } = await open(browser, '&tier=2&nointro', await saveAt(300));
    await page.waitForFunction(() => !document.getElementById('menu').hidden, null, { timeout: 8000 });
    await ev(page, () => { document.getElementById('cont').click(); __game.pause(); document.getElementById('hint').classList.add('gone'); }); // a returning player has already touched
    const until = (t, id = null, max = 300) => ev(page, ([t, i, m]) => { for (let k = 0; k < m; k++) { if (!__game.until(t, 1)) continue; if (!i || __game.lastEvents.some((x) => x.type === t && x.id === i)) return true; } return false; }, [t, id, max]);
    const after = (n) => ev(page, (k) => { for (let i = 0; i < k; i++) __game.frame(1 / 60); }, n);
    await after(20);
    check(await ev(page, () => !document.getElementById('goal').hidden), 'the ghost town goal card is up while houses are dark');
    await shoot(page, '29-ghost-goal-card');
    // the second rig and the first lit house land a few seconds apart; either may come first
    const rig2First = await ev(page, () => { for (let k = 0; k < 120; k++) { __game.until('unlock', 1); if (__game.S.pads.find((p) => p.id === 'rig2').done) return true; if (__game.S.ghost.lit > 0) return false; } return null; });
    const rigShot = async () => { await after(60); await shoot(page, '31-unlock-rig2'); };
    if (rig2First) await rigShot();
    check(await ev(page, () => __game.S.ghost.lit > 0) || await until('ghostLight'), 'the mine cart lights a house'); await after(70); await shoot(page, '30-ghost-house-lights');
    if (!rig2First) { check(await ev(page, () => __game.S.pads.find((p) => p.id === 'rig2').done) || await until('unlock', 'rig2'), 'moment 31-unlock-rig2 happened'); await rigShot(); }
    else check(true, 'moment 31-unlock-rig2 happened');
    const M3 = [['unlock', 'cable', '32-unlock-cable-car', 70], ['unlock', 'stargaze', '33-unlock-stargazer-dusk', 70],
      ['unlock', 'crown', '34-unlock-crown-jeweler', 60], ['crown', null, '35-crown-to-cable-car', 75], ['unlock', 'neon', '36-unlock-neon-night', 150]];
    for (const [t, id, name, n] of M3) { const ok = await until(t, id); check(ok, `moment ${name} happened`); await after(n); console.log(`info ${name} at game time ${(await ev(page, () => __game.S.t)) | 0} s`); await shoot(page, name); }
    // the share button: shows at a big moment and sends a picture of the town with the brag line
    await ev(page, () => __game.offerShare()); await after(40);
    check(await ev(page, () => __game.shareOn), 'the share button shows at a big moment');
    await shoot(page, '37-share-button');
    await page.click('#share', { force: true });
    const sh = await ev(page, () => (window.__shares || []).map((o) => ({ img: String(o.image).slice(0, 15), len: String(o.image).length, text: o.text })));
    check(sh.length === 1 && sh[0].img === 'data:image/jpeg' && sh[0].len > 20000 && !!sh[0].text, `share sends a picture and a line (${JSON.stringify(sh).slice(0, 120)})`);
    // the finale
    for (const [t, name, n] of [['heartRise', '38-finale-heart-rises', 150], ['crownHatch', '39-finale-legendary-hatch', 50], ['comet', '40-finale-comet', 150], ['finaleEnd', '41-chapter-1-complete', 60]]) {
      const ok = await until(t, null, 400); check(ok, `moment ${name} happened`); await after(n); console.log(`info ${name} at game time ${(await ev(page, () => __game.S.t)) | 0} s`); await shoot(page, name);
    }
    const S1 = await ev(page, () => ({ done1: __game.S.done1, crit: __game.S.critters.length, hats: __game.S.hats.length, stars: __game.S.stars.length, nova: __game.S.critters.some((c) => c.id === 'nova') }));
    check(S1.done1 && S1.nova && S1.crit >= 10, `chapter 1 is complete with the legendary critter (${JSON.stringify(S1)})`);
    check(await ev(page, () => !document.getElementById('next').hidden && /\d+\/\d+/.test(document.querySelector('#next b').textContent)), 'after the last unlock the NEXT card shows the album count (the next goal)');
    // the album: tap a hat to wear it
    await ev(page, () => __game.openAlbum()); await after(2);
    check(await ev(page, () => __game.phase) === 'album', 'the album opens and game time stops');
    await shoot(page, '42-album');
    const hat0 = await ev(page, () => __game.S.hat);
    await page.locator('#album .hats button.tile').first().click({ force: true });
    check(await ev(page, () => __game.S.hat) !== hat0 || hat0 === cfg.hats[0].id, `tapping a hat in the album wears it (${hat0} -> ${await ev(page, () => __game.S.hat)})`);
    await ev(page, () => __game.closeAlbum()); await after(20);
    // budgets with everything built and twelve critters on screen
    const st2 = await ev(page, () => __game.stats());
    check(st2.calls <= BUDGET[2], `tier 2 draw calls with chapter 1 complete: ${st2.calls} (budget ${BUDGET[2]}), ${st2.tris} triangles`);
    await ev(page, () => __game.setTier(0)); await after(5);
    const st0 = await ev(page, () => __game.stats());
    check(st0.calls <= BUDGET[0], `tier 0 draw calls with chapter 1 complete: ${st0.calls} (budget ${BUDGET[0]}), ${st0.tris} triangles`);
    await shoot(page, '43-tier0-chapter1-night');
    check(errors.length === 0, `no page errors in the M3 run (${errors.slice(0, 2).join(' | ')})`);
    await page.close();
  }

  // ---- perf guard: slow frames (a phone that cannot keep up) lower the resolution first, then the tier
  {
    const { page, errors } = await open(browser, '&tod=0&bot');
    const t0 = await ev(page, () => ({ tier: __game.scene.tier, pr: __game.scene.renderer.getPixelRatio() }));
    await ev(page, () => { const r = __game.scene.render; __game.scene.render = () => { const e = performance.now() + 34; while (performance.now() < e) { /* a slow GPU */ } r(); }; });
    await page.waitForTimeout(20000);
    const t1 = await ev(page, () => ({ tier: __game.scene.tier, pr: __game.scene.renderer.getPixelRatio() }));
    check(t1.tier < t0.tier, `slow frames drop the quality (tier ${t0.tier} -> ${t1.tier}, pixel ratio ${t0.pr} -> ${t1.pr})`);
    check(errors.length === 0, `no page errors in the perf-guard run (${errors.slice(0, 2).join(' | ')})`);
    await page.close();
  }

  // ---- soak: 16 game minutes from a fresh start; textures, geometries and the JS heap must stay flat once built
  {
    const { page, errors } = await open(browser, '&tier=1&tod=0.3&bot');
    await ev(page, () => __game.pause());
    const rows = [];
    for (let m = 1; m <= 16; m++) {
      await ev(page, () => __game.run(60));
      rows.push(await ev(page, (m) => { const st = __game.stats(), mem = performance.memory ? performance.memory.usedJSHeapSize : 0; return { m, tex: st.textures, geo: st.geometries, heapMB: Math.round(mem / 1e6), t: __game.S.t | 0, pads: __game.S.pads.filter((q) => q.done).length }; }, m));
    }
    console.log('info soak ' + rows.map((r) => `${r.m}m tex ${r.tex} geo ${r.geo} heap ${r.heapMB}MB pads ${r.pads}`).join(' | '));
    fs.writeFileSync(path.join(out, 'soak.json'), JSON.stringify(rows, null, 1));
    const late = rows.filter((r) => r.m >= 12), texSpan = Math.max(...late.map((r) => r.tex)) - Math.min(...late.map((r) => r.tex)), geoSpan = Math.max(...late.map((r) => r.geo)) - Math.min(...late.map((r) => r.geo));
    check(texSpan <= 2 && geoSpan <= 8 && Math.max(...rows.map((r) => r.tex)) <= 60, `soak: textures and geometries flat in the last 5 minutes (spans ${texSpan} / ${geoSpan}, max textures ${Math.max(...rows.map((r) => r.tex))})`);
    const h0 = rows[5].heapMB, h1 = rows[rows.length - 1].heapMB;
    check(!h0 || h1 - h0 < 40, `soak: JS heap does not climb (${h0} MB at 6 min -> ${h1} MB at 16 min)`);
    check(errors.length === 0, `no page errors in the soak run (${errors.slice(0, 2).join(' | ')})`);
    await page.close();
  }

  await browser.close(); server.close();
  console.log(`\n${shots.length} screenshots in ${out}`);
  console.log(fails.length ? `${fails.length} FAILED` : 'all checks passed');
  process.exit(fails.length ? 1 : 0);
})();
