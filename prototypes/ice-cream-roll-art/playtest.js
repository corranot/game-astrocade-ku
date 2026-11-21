// PROTOTYPE - NOT FOR PRODUCTION
// Playtest: serves this folder, plays the first (short) cup and a full cup with real pointer input like a finger,
// checks the rules that matter and saves a screenshot of every step.
// Usage: node playtest.js <out folder> [--lang xx] [--quick]   (Playwright; SwiftShader GPU, so FPS here is not a phone's)
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const args = process.argv.slice(2);
const out = args[0] && !args[0].startsWith('--') ? args[0] : fs.mkdtempSync(path.join(require('os').tmpdir(), 'icr-'));
const langArg = args.includes('--lang') ? args[args.indexOf('--lang') + 1] : 'en';
if (require.main === module) fs.mkdirSync(out, { recursive: true });
const types = { '.js': 'text/javascript', '.html': 'text/html', '.json': 'application/json', '.webp': 'image/webp', '.mp3': 'audio/mpeg' };
const server = require.main !== module ? null : http.createServer((q, s) => {
  const f = path.join(__dirname, q.url.split('?')[0] === '/' ? 'index.html' : q.url.split('?')[0]);
  fs.readFile(f, (e, d) => { if (e) { s.writeHead(404); return s.end(); } s.writeHead(200, { 'content-type': types[path.extname(f)] || 'text/plain' }); s.end(d); });
});
if (server) server.listen(0);
const fails = [];
const check = (ok, msg) => { console.log((ok ? 'ok   ' : 'FAIL ') + msg); if (!ok) fails.push(msg); };

/** Helpers that touch the game like a finger (page.mouse at the plate point's screen position). */
function driver(page) {
  const g = (fn, a) => page.evaluate(fn, a);
  const at = (u, v) => g(([u, v]) => __game.client(u, v), [u, v]);
  const step = () => g(() => __game.S.step);
  const waitStep = (s, t = 20000) => page.waitForFunction((s) => __game.S && __game.S.step === s && !__game.S.busy, s, { timeout: t });
  async function tap(u, v) { const [x, y] = await at(u, v); await page.mouse.click(x, y); }
  async function hold(u, v, until, t = 15000) { const [x, y] = await at(u, v); await page.mouse.move(x, y); await page.mouse.down(); await page.waitForFunction(until, null, { timeout: t, polling: 30 }).catch(() => {}); await page.mouse.up(); }
  async function drag(pts, steps = 6) {
    let [x, y] = await at(...pts[0]); await page.mouse.move(x, y); await page.mouse.down();
    for (const p of pts.slice(1)) { const [nx, ny] = await at(...p); await page.mouse.move(nx, ny, { steps }); }
    await page.mouse.up();
  }
  const trayTap = (id) => page.click(`#tray button[data-id="${id}"]`, { force: true });
  return { g, at, step, waitStep, tap, hold, drag, trayTap };
}

/** Play one whole cup from whatever step it is at; shots go to out with prefix. */
async function playCup(page, d, prefix, shots = true) {
  const shot = (n) => (shots ? page.screenshot({ path: path.join(out, `${prefix}-${n}.png`) }) : null);
  if (!shots) page.waitForTimeout = ((orig) => (ms) => orig.call(page, Math.min(ms, 150)))(page.waitForTimeout);
  const S = () => d.g(() => ({ step: __game.S.step, order: __game.S.order, made: __game.S.made, n: __game.S.n }));
  let s = await S();
  if (s.step === 'pour') {
    await shot('01-pour-start');
    await d.hold(0.5, 0.5, () => __game.S.made.pour >= 0.92);
    await shot('02-pour-done');
    await d.waitStep('fruit');
  }
  s = await S();
  if (s.step === 'fruit') {
    const per = s.order.fruits.length > 1 ? 2 : 3;
    for (const f of s.order.fruits) for (let i = 0; i < per; i++) { await d.trayTap(f); await page.waitForTimeout(120); }
    await page.waitForTimeout(500); await shot('03-fruit');
    await d.waitStep('chop');
  }
  if ((await S()).step === 'chop') {
    for (let k = 0; k < 30 && (await d.step()) === 'chop'; k++) {
      const f = await d.g(() => { const x = __game.scene.placed.find((p) => !p.burst && p.y <= 0.001); return x ? [x.u, x.v] : null; });
      if (!f) { await page.waitForTimeout(150); continue; }
      await d.tap(f[0], f[1]); await page.waitForTimeout(60);
      if (k === 4) await shot('04-chop');
    }
    await d.waitStep('spread');
  }
  if ((await S()).step === 'spread') {
    await shot('05-spread-start');
    const zig = []; for (let i = 0; i <= 10; i++) zig.push([i % 2 ? 0.86 : 0.14, 0.15 + i * 0.07]);
    await d.drag(zig.slice(0, 5), 5); await shot('06-spread-half');
    await d.drag(zig.slice(4), 5);
    for (let r = 0; r < 3 && (await d.step()) === 'spread' && !(await d.g(() => __game.S.busy)); r++) { const z2 = []; for (let i = 0; i <= 12; i++) z2.push([0.14 + (i % 2) * 0.72, 0.14 + i * 0.06]); await d.drag(z2, 4); }
    await d.waitStep('draw');
  }
  if ((await S()).step === 'draw') {
    await d.drag([[0.3, 0.3], [0.45, 0.45], [0.35, 0.6], [0.6, 0.65], [0.7, 0.35]], 6);
    await shot('07-draw-free');
    const want = (await S()).order.art || 'star';
    await d.trayTap(want); await page.waitForFunction(() => !__game.S.stencil, null, { timeout: 8000 });
    await shot('08-draw-stencil');
    await page.click('#action', { force: true }); await d.waitStep('freeze');
  }
  if ((await S()).step === 'freeze') {
    const b = await page.$('#hold'); const bb = await b.boundingBox();
    await page.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2); await page.mouse.down();
    await page.waitForFunction(() => __game.sheet.freeze > 0.5, null, { timeout: 10000 }); await shot('09-freeze-half');
    await page.waitForFunction(() => __game.sheet.freeze >= 1, null, { timeout: 10000 }).catch(() => {}); await page.mouse.up();
    await d.waitStep('roll');
  }
  if ((await S()).step === 'roll') {
    await shot('10-roll-start');
    const lanes = await d.g(() => __game.scene.lanes.map((l) => l.x / 4 + 0.5));
    for (let i = 0; i < lanes.length; i++) {
      await d.drag([[lanes[i], 0.84], [lanes[i], 0.55], [lanes[i], 0.3]], 6);
      if (i === 0) { await page.waitForTimeout(250); await shot('11-roll-first'); }
    }
    await page.waitForTimeout(400); await shot('12-roll-all');
    await d.waitStep('topping', 25000);
  }
  if ((await S()).step === 'topping') {
    await shot('13-cup');
    s = await S();
    for (const t of s.order.toppings) { await d.trayTap(t); await page.waitForTimeout(250); }
    await page.waitForTimeout(500); await shot('14-toppings');
    await page.click('#action', { force: true });
  }
  await page.waitForFunction(() => __game.S.step === 'serve', null, { timeout: 8000 });
  await page.waitForTimeout(900); await shot('15-serve');
  await page.waitForSelector('#nextBtn', { timeout: 15000 }); await page.waitForTimeout(1200); await shot('16-rating');
}

/** Regression checks for bugs found by reading the code (each one failed before its fix). */
async function bugChecks(browser, port) {
  const today = await (async () => { const d = new Date(); return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate(); })();
  // 1. a late save must not pay the daily gift twice
  {
    const page = await browser.newPage({ viewport: { width: 360, height: 640 } });
    await page.addInitScript((t) => { window.__preset = { cups: 5, coins: 100, lastDaily: t, owned: [] }; window.__saveFails = true; }, today);
    await page.goto(`http://localhost:${port}/?local&speed=3`);
    await page.waitForFunction(() => window.__game && window.__game.S, null, { timeout: 40000 });
    await page.evaluate(() => { for (const ln of __game.scene.lanes) __game.scene.setLane(ln, __game.scene.L); });
    await page.waitForFunction(() => __game.S.step === 'topping', null, { timeout: 20000 });
    await page.evaluate(() => __game.addTop('whip')); await page.click('#action', { force: true });
    await page.waitForSelector('#nextBtn', { timeout: 15000 }); await page.click('#nextBtn', { force: true });
    const gift = await page.waitForSelector('#giftBox', { timeout: 900 }).then(() => true).catch(() => false);
    await page.evaluate(() => { window.__saveFails = false; });
    await page.waitForFunction(() => __game.saveLoaded, null, { timeout: 12000 });
    const st = await page.evaluate(() => ({ lastDaily: __game.save.lastDaily, coins: __game.save.coins }));
    check(!gift && st.lastDaily === today && st.coins < 100 + 30 + 30, `late save: no daily gift before it is read, today's claim kept (gift shown ${gift}, ${JSON.stringify(st)})`);
    await page.close();
  }
  // 2, 3, 6, 7, 8 on one page in Arabic with a returning player's save
  const page = await browser.newPage({ viewport: { width: 360, height: 640 }, locale: 'ar' });
  await page.addInitScript((t) => { window.__preset = { cups: 1, coins: 100, lastDaily: t, owned: [], learned: {} }; }, today);
  await page.goto(`http://localhost:${port}/?local`);
  await page.waitForFunction(() => window.__game && window.__game.saveLoaded && __game.S.step === 'pour', null, { timeout: 40000 });
  await page.waitForTimeout(400);
  const band = await page.evaluate(() => { const b = document.querySelector('#bar').getBoundingClientRect(), e = document.querySelector('#bar em').getBoundingClientRect(); return { bar: b.left + b.width / 2, band: e.left + e.width / 2 }; });
  check(band.band < band.bar, `Arabic: the perfect band sits toward the reading start (right to left) like the fill (${JSON.stringify(band)})`);
  // never the flavour that is already highlighted
  const pickBase = await page.evaluate(() => ['milk', 'strawberry', 'chocolate'].find((b) => b !== __game.S.order.base));
  await page.click(`#tray button[data-id="${pickBase}"]`, { force: true }); await page.waitForTimeout(150);
  await page.click('#langBtn', { force: true }); await page.click('#langs button[data-l="es"]', { force: true }); await page.waitForTimeout(150);
  const on = await page.evaluate(() => [...document.querySelectorAll('#tray .slot.on')].map((b) => b.dataset.id));
  check(on.length === 1 && on[0] === pickBase, `language change keeps the chosen flavour highlighted (${on}, picked ${pickBase})`);
  { // hold still while pouring: no hint hand over the finger
    const [x, y] = await page.evaluate(() => __game.client(0.5, 0.5));
    await page.mouse.move(x, y); await page.mouse.down(); await page.waitForTimeout(1500);
    const hand = await page.evaluate(() => !document.querySelector('#hand').hidden);
    const coins0 = await page.evaluate(() => __game.save.coins);
    // a second finger taps the locked flavour while the first one pours
    await page.evaluate(() => document.querySelector('#tray button[data-id="matcha"]').click()); await page.waitForTimeout(150);
    const coins1 = await page.evaluate(() => __game.save.coins);
    await page.mouse.up();
    check(!hand, 'no hint hand while a finger holds the pour still');
    check(coins1 === coins0, `a locked flavour tapped mid-pour costs nothing (${coins0} -> ${coins1})`);
  }
  await page.click('#mute', { force: true });
  // the save cannot be read this time: the icon must still show the sound state the player chose
  await page.evaluate(() => { window.__saveFails = true; window.run('play'); window.run('play'); window.run('play'); });
  await page.waitForFunction(() => window.__game && window.__game.S, null, { timeout: 20000 });
  const icon = await page.evaluate(() => document.querySelector('#mute').textContent);
  check(icon === '🔇', `muted stays shown as muted after the host calls run() again (${icon})`);
  const cdp = await page.context().newCDPSession(page);
  const { result } = await cdp.send('Runtime.evaluate', { expression: 'document.getElementById("app")' });
  const { listeners } = await cdp.send('DOMDebugger.getEventListeners', { objectId: result.objectId });
  const downs = listeners.filter((l) => l.type === 'pointerdown').length;
  check(downs <= 2, `run() four times leaves one game's listeners on the page (${downs} pointerdown)`);
  await page.close();
}

module.exports = { driver, playCup, types };
if (require.main === module) (async () => {
  const port = server.address().port;
  // modules must not touch THREE at import (the platform bundle runs before the library arrives)
  {
    const bad = [], url = require('url'); globalThis.window = globalThis;
    for (const f of ['logic', 'roll', 'sheet', 'scene', 'game']) { try { await import(url.pathToFileURL(path.join(__dirname, f + '.js')).href); } catch (e) { bad.push(`${f}.js: ${e.message}`); } }
    delete globalThis.window; delete globalThis.run;
    check(bad.length === 0, `no module touches THREE when imported (${bad.join('; ') || 'all 5 load'})`);
  }
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  await bugChecks(browser, port);
  if (args.includes('--bugs')) { await browser.close(); server.close(); console.log(fails.length ? `\n${fails.length} FAILED` : '\nall passed'); process.exit(fails.length ? 1 : 0); }
  const page = await browser.newPage({ viewport: { width: 360, height: 640 }, deviceScaleFactor: 2, locale: langArg });
  const errors = []; page.on('pageerror', (e) => errors.push(e.message + ' @ ' + String(e.stack).split('\n').slice(1, 3).join(' <- '))); page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.addInitScript(() => { window.__trace = []; });
  await page.goto(`http://localhost:${port}/?local&speed=2`);
  await page.waitForFunction(() => window.__game && window.__game.S && window.__game.saveLoaded, null, { timeout: 40000 });
  const d = driver(page);
  check(await d.g(() => __game.lang) === (['en', 'ar', 'es', 'vi', 'hi', 'bn', 'id'].includes(langArg.slice(0, 2)) ? langArg.slice(0, 2) : 'en'), 'language follows the device: ' + langArg);
  check(await d.step() === 'roll', 'the first cup starts at the most satisfying step (rolling a ready sheet)');
  await page.waitForTimeout(800);
  globalThis.__errs = errors; globalThis.__page = page;
  await playCup(page, d, 'a');
  const r0 = await d.g(() => ({ coins: __game.save.coins, cups: __game.save.cups, writes: (window.__writes || []).length }));
  check(r0.cups === 1 && r0.coins > 0 && r0.writes > 0, `first cup pays and saves (cups ${r0.cups}, coins ${r0.coins}, writes ${r0.writes})`);
  await page.click('#nextBtn', { force: true });
  // the daily gift comes after the first cup: open it, then go on
  await page.waitForSelector('#giftBox', { timeout: 3000 }); await page.screenshot({ path: path.join(out, 'a-17-daily-gift.png') });
  await page.click('#giftBox', { force: true }); await page.waitForSelector('#nextBtn', { timeout: 3000 });
  await page.waitForTimeout(500); await page.screenshot({ path: path.join(out, 'a-18-daily-open.png') });
  check(await d.g(() => __game.save.coins) > r0.coins, 'daily gift pays coins after the first cup');
  await page.click('#nextBtn', { force: true });
  await page.waitForFunction(() => __game.S.n === 1 && __game.S.step === 'pour', null, { timeout: 8000 });
  check(true, 'next cup starts at pouring with a new order');
  const cupState = await d.g(() => ({ s: __game.scene.cup.scale.x, r: __game.scene.cup.rotation.y, v: __game.scene.cup.visible, kids: __game.scene.cup.children.length }));
  check(cupState.s === 1 && cupState.r === 0 && !cupState.v && cupState.kids === 4, `the new cup is reset to full size, empty and put away (${JSON.stringify(cupState)})`);
  await playCup(page, d, 'b');
  const r1 = await d.g(() => ({ stars: __game.S.result.stars, q: __game.S.result.quality, parts: __game.S.result.parts, cups: __game.save.cups }));
  check(r1.cups === 2 && r1.stars === 3, `a careful full cup earns 3 stars (stars ${r1.stars}, quality ${r1.q.toFixed(2)}, ${JSON.stringify(r1.parts)})`);
  const mem = await d.g(() => ({ t: __game.textures, g: __game.geometries }));
  check(errors.length === 0, 'no page errors: ' + (errors.join(' | ') || 'none'));
  console.log('gpu memory after 2 cups:', JSON.stringify(mem));
  await browser.close(); server.close();
  console.log(fails.length ? `\n${fails.length} FAILED` : '\nall passed');
  process.exit(fails.length ? 1 : 0);
})().catch(async (e) => {
  const st = globalThis.__page ? await globalThis.__page.evaluate(() => JSON.stringify({ step: __game.S.step, si: __game.S.si, n: __game.S.n, busy: __game.S.busy, made: __game.S.made, lanes: __game.scene.lanes.length, trace: window.__trace.slice(-14) })).catch(() => '') : '';
  console.error(e.message.split('\n')[0], '\nstate:', st, '\npage errors:', (globalThis.__errs || []).join(' | ')); server.close(); process.exit(1);
});
