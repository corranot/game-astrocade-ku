// PROTOTYPE - NOT FOR PRODUCTION
// Soak: one long session in one page. Each round the kitten runs around, pounces, catches the red dot, scores yarn,
// buys a look and visits the garden. Fails on page errors, a broken save, rewards that stop paying, GPU objects that
// keep growing after warm-up, or frame time that climbs between early and late rounds.
// Usage: node soak.js [rounds]   (Playwright; SwiftShader, so absolute frame times are not a phone's)
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const rounds = Number(process.argv[2]) || 14;
const types = { '.js': 'text/javascript', '.html': 'text/html', '.json': 'application/json' };
const srv = http.createServer((q, s) => {
  const f = path.join(__dirname, q.url.split('?')[0] === '/' ? 'index.html' : q.url.split('?')[0]);
  fs.readFile(f, (e, d) => { if (e) { s.writeHead(404); return s.end(); } s.writeHead(200, { 'content-type': types[path.extname(f)] || 'text/plain' }); s.end(d); });
}).listen(0);
const fails = [];
const check = (ok, msg) => { console.log((ok ? 'ok   ' : 'FAIL ') + msg); if (!ok) fails.push(msg); };

(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 360, height: 640 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push((e.stack || e.message).split('\n').slice(0, 3).join(' | ')));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(`http://localhost:${srv.address().port}/?local`);
  await page.waitForFunction(() => window.__game && window.__game.state.loaded, null, { timeout: 40000 });
  await page.mouse.click(180, 380);
  // frame gaps measured in the page, per round
  await page.evaluate(() => { window.__gaps = []; let last = performance.now(); (function f(t) { window.__gaps.push(t - last); last = t; requestAnimationFrame(f); })(performance.now()); });
  // warm-up: every look worn once, garden open, both zones drawn
  await page.evaluate(() => { __game.give(200); });
  for (const id of ['tuxedo', 'calico', 'siamese', 'pink', 'cosmic', 'wizard', 'pirate', 'crown', 'propeller', 'wings', 'none', 'ginger']) {
    await page.evaluate(() => __game.tp(9.9, 0, 4));
    await page.waitForFunction(() => __game.state.ward, null, { timeout: 5000 }).catch(() => {});
    await page.evaluate((i) => { const el = document.querySelector(`.card[data-id="${i}"]`); if (el) el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); }, id);
    await page.waitForTimeout(150);
  }
  // every yarn colour drawn once (a scored ball comes back in a new colour)
  for (let c = 0; c < 6; c++) { await page.evaluate((i) => { const y = __game.props.find((o) => o.kind === 'yarn'); y.mesh.material = __game.yarnMats[i]; }, c); await page.waitForTimeout(120); }
  await page.evaluate(() => { const y = __game.props.find((o) => o.kind === 'yarn'); y.mesh.material = __game.yarnMats[y.color]; });
  await page.evaluate(() => __game.tp(0, 0, -18)); await page.waitForTimeout(800);
  await page.evaluate(() => __game.tp(0, 0, 4)); await page.waitForTimeout(800);
  let base = null;
  const med = [];
  for (let r = 0; r < rounds; r++) {
    await page.evaluate(() => { window.__gaps = []; });
    const f0 = await page.evaluate(() => __game.state.total);
    // knock toys
    await page.evaluate(() => __game.tp(-4, 1.6, -6.9));
    for (let i = 0; i < 3; i++) { await page.evaluate(() => __game.action()); await page.waitForTimeout(350); }
    // walk about
    await page.keyboard.down('KeyW'); await page.keyboard.down(r % 2 ? 'KeyA' : 'KeyD'); await page.waitForTimeout(1200); await page.keyboard.up('KeyW'); await page.keyboard.up(r % 2 ? 'KeyA' : 'KeyD');
    // red dot
    await page.evaluate(() => { __game.tp(0, 0, 3); __game.laserNow(); });
    await page.waitForFunction(() => __game.quests.laser.on, null, { timeout: 5000 }).catch(() => {});
    await page.evaluate(() => { const L = __game.quests.laser; L.darts = 0; L.to = null; __game.tp(L.x, L.y, L.z); });
    await page.waitForTimeout(600);
    // yarn goal
    await page.evaluate(() => { const y = __game.props.find((o) => o.kind === 'yarn'); y.asleep = false; y.x = 6; y.z = 7.5; y.y = 1; });
    await page.waitForTimeout(900);
    // garden lap
    await page.evaluate(() => { const b = __game.quests.butterflies[0]; __game.tp(b.x, Math.max(0, b.y - 0.6), b.z); });
    await page.waitForTimeout(800);
    await page.evaluate(() => __game.tp(0, 0, 4));
    await page.waitForTimeout(600);
    const f1 = await page.evaluate(() => __game.state.total);
    check(f1 - f0 >= 5, `round ${r + 1}: rewards still pay (${f1 - f0} fish)`);
    const g = await page.evaluate(() => { const a = window.__gaps.slice(5).sort((x, y) => x - y); return a[Math.floor(a.length / 2)] || 0; });
    med.push(g);
    if (process.env.SOAK_INFO) console.log(JSON.stringify(await page.evaluate(() => [__game.info(), __game.props.filter((o) => o.kind === 'yarn').map((o) => o.color), __game.quests.guide.visible])));
    // yarn colours and other first-time uploads settle in the first rounds; growth is measured after them
    if (r === 3) base = await page.evaluate(() => __game.info());
  }
  const end = await page.evaluate(() => __game.info());
  console.log('gpu objects', JSON.stringify(base), '->', JSON.stringify(end), 'median frame gaps', med.map((x) => x.toFixed(1)).join(' '));
  check(end.geometries <= base.geometries + 2 && end.textures <= base.textures + 1, 'GPU objects do not keep growing');
  const early = med.slice(1, 4).reduce((a, b) => a + b, 0) / 3, late = med.slice(-3).reduce((a, b) => a + b, 0) / 3;
  check(late - early < 8, `frame time does not climb (early ${early.toFixed(1)} ms, late ${late.toFixed(1)} ms)`);
  const save = await page.evaluate(() => (window.__writes || []).slice(-1)[0]);
  check(save && typeof save.fish === 'number' && save.fish >= 0 && Array.isArray(save.skins) && save.skins.length === 6, 'save is whole after the session');
  const props = await page.evaluate(() => __game.props.every((o) => Number.isFinite(o.x + o.y + o.z) && o.y > -1));
  check(props, 'every toy is still in the world');
  check(!errors.length, 'no page errors' + (errors.length ? ': ' + errors.slice(0, 2).join(' || ') : ''));
  await browser.close(); srv.close();
  console.log(fails.length ? `\n${fails.length} FAILED` : '\nall passed');
  process.exit(fails.length ? 1 : 0);
})();
