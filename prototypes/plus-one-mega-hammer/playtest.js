// PROTOTYPE - NOT FOR PRODUCTION
// Playtest: serves this folder, plays a whole run with real mouse clicks (six zones and the cake vault, then the
// x2 run), checks the finale and the results card, checks the rules that matter, and saves screenshots.
// Usage: node playtest.js <out folder>   (needs Playwright; swiftshader GPU, so FPS here is not a phone's)
// THREE_DIR=<three/build folder> serves three.js locally when the CDN is not reachable from this machine.
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const out = process.argv[2] || fs.mkdtempSync(path.join(require('os').tmpdir(), 'mh-playtest-'));
fs.mkdirSync(out, { recursive: true });
const types = { '.js': 'text/javascript', '.html': 'text/html', '.json': 'application/json' };
let cfgPatch = null; // set by a test to serve game_config.json with some values changed
const server = http.createServer((q, s) => {
  if (cfgPatch && q.url.startsWith('/game_config.json')) { const c = JSON.parse(fs.readFileSync(path.join(__dirname, 'game_config.json'))); cfgPatch(c); s.writeHead(200, { 'content-type': 'application/json' }); return s.end(JSON.stringify(c)); }
  const f = path.join(__dirname, q.url.split('?')[0] === '/' ? 'index.html' : q.url.split('?')[0]);
  fs.readFile(f, (e, d) => { if (e) { s.writeHead(404); return s.end(); } s.writeHead(200, { 'content-type': types[path.extname(f)] || 'text/plain' }); s.end(d); });
}).listen(0);
const LANGS = ['en', 'ar', 'es', 'vi', 'hi', 'bn', 'id'];

async function open(browser, opts = {}) {
  const page = await browser.newPage({ viewport: { width: 405, height: 720 }, locale: opts.locale || 'en' });
  if (process.env.THREE_DIR) {
    const dir = process.env.THREE_DIR;
    await page.route(/cdnjs\.cloudflare\.com\/.*three\.module\.min\.js/, (r) => r.fulfill({ contentType: 'text/javascript', body: fs.readFileSync(path.join(dir, fs.existsSync(path.join(dir, 'three.module.min.js')) ? 'three.module.min.js' : 'three.module.js')) }));
    await page.route(/cdnjs\.cloudflare\.com\/.*three\.core(\.min)?\.js/, (r) => r.fulfill({ contentType: 'text/javascript', body: fs.readFileSync(path.join(dir, 'three.core.js')) }));
    await page.route(/jsdelivr/, (r) => r.abort()); // fonts: the system fallback is fine for a test
  }
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(m.text()); });
  if (opts.init) await page.addInitScript(opts.init);
  await page.goto(`http://localhost:${server.address().port}/?local&tier=${opts.tier ?? 1}${opts.mode ? '&mode=' + opts.mode : ''}`);
  await page.waitForFunction(() => window.__game && window.__game.R, null, { timeout: 30000 });
  return { page, errors };
}

(async () => {
  const fails = [];
  const check = (ok, msg) => { console.log((ok ? 'ok   ' : 'FAIL ') + msg); if (!ok) fails.push(msg); };
  // the Astrocade bundle runs every module before three.js arrives: importing one must not touch THREE
  {
    const bad = [], url = require('url');
    globalThis.window = globalThis;
    for (const f of ['logic', 'models', 'scene', 'game']) { try { await import(url.pathToFileURL(path.join(__dirname, f + '.js')).href); } catch (e) { bad.push(`${f}.js: ${e.message}`); } }
    delete globalThis.window; delete globalThis.run;
    check(bad.length === 0, `no module touches THREE when imported (${bad.join('; ') || 'all 4 load'})`);
  }
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  if (process.env.ONLY_FINALE) { await finale(); await browser.close(); server.close(); process.exit(fails.length ? 1 : 0); }
  const { page, errors } = await open(browser);
  const g = (fn, arg) => page.evaluate(fn, arg);
  /** Clicks like a finger on the world point (x, y, z). */
  const tapWorld = async (x, y, z) => { const [cx, cy] = await g(([a, b, c]) => __game.client(a, b, c), [x, y, z]); await page.mouse.click(cx, cy); };
  const waitIdle = () => page.waitForFunction(() => !__game.busy, null, { timeout: 5000 });

  // attract mode: moves before a touch, counts nothing
  const a0 = await g(() => __game.scene.hammer.pivot.rotation.x);
  await page.waitForTimeout(1800);
  const moved = await g((a) => Math.abs(__game.scene.hammer.pivot.rotation.x - a) > 0.01 || __game.scene.cam.focus.z !== 0, a0);
  check(moved, 'the screen moves before any touch (hammer demo swing)');
  check(await g(() => __game.R.L === 1 && __game.R.slams === 0), 'attract mode breaks and counts nothing');
  await page.screenshot({ path: path.join(out, '01-start.jpg'), type: 'jpeg', quality: 82 });

  // a tap on a small fruit breaks it and grows the hammer
  const first = await g(() => { const o = __game.R.objects.find((p) => p.zone === 0 && p.req === 1); return [o.x, o.z, o.id]; });
  await tapWorld(first[0], 0.3, first[1]); await waitIdle();
  check(await g((id) => !__game.R.objects[id].alive && __game.R.L > 1, first[2]), 'first tap breaks the fruit under the finger and the hammer grows');
  check(await g(() => document.getElementById('hint').hidden), 'the tap hint goes away after the first touch');

  // a numbered object too big for the hammer bounces and stays
  const big = await g(() => { const o = __game.R.objects.filter((p) => p.zone === 0 && p.req > __game.R.L).sort((a, b) => b.req - a.req)[0]; return [o.x, o.z, o.id]; });
  await tapWorld(big[0], 0.3, big[1]); await waitIdle();
  check(await g((id) => __game.R.objects[id].alive, big[2]), 'a too-big numbered object bounces and stays');

  // holding the finger down slams again and again
  const s0 = await g(() => __game.R.slams);
  const spot = await g(() => { const o = __game.R.objects.find((p) => p.zone === 0 && p.alive); return __game.client(o.x, 0, o.z); });
  await page.mouse.move(spot[0], spot[1]); await page.mouse.down();
  // game seconds, not wall time: the software GPU here runs few frames
  const held = await page.waitForFunction((s) => __game.R.slams - s >= 3, s0, { timeout: 30000 }).then(() => true, () => false);
  await page.mouse.up();
  check(held, 'holding the finger down keeps slamming');

  // play the whole run with real clicks on the best spot: six zones, the vault, then x2 (straight on, or via the card)
  const shots = { 1: '02-zone2-market', 2: '06-zone3-street', 3: '07-zone4-park', 4: '08-zone5-city', 5: '09-zone6-cake-vault' };
  let seen = 0, guard = 0, cardSeen = false, cardAt = -1;
  while (guard++ < 900 && (await g(() => __game.mult)) === 1) {
    if (await g(() => __game.card)) { cardSeen = true; cardAt = await g(() => __game.sessT); break; }
    const p = await g(() => { const b = __game.L.bestSlam(__game.cfg, __game.R); return b && [b.x, b.z]; });
    if (!p) { await page.waitForTimeout(200); continue; }
    await tapWorld(p[0], 0.3, p[1]); await waitIdle();
    const z = await g(() => __game.R.zone);
    if (z > seen) { seen = z; await page.waitForTimeout(900); if (shots[z]) await page.screenshot({ path: path.join(out, shots[z] + '.jpg'), type: 'jpeg', quality: 82 }); }
    if (z === 1 && (await g(() => __game.R.L > 60)) && !fs.existsSync(path.join(out, '03-big-hammer.jpg'))) await page.screenshot({ path: path.join(out, '03-big-hammer.jpg'), type: 'jpeg', quality: 82 });
  }
  check(seen === 5, `play moves through all six zones (${seen + 1} reached, ${guard} taps)`);
  if (!cardSeen) await page.waitForFunction(() => __game.mult === 2 || __game.card, null, { timeout: 15000 }).catch(() => {});
  if (await g(() => __game.card)) { cardSeen = true; cardAt = await g(() => __game.sessT); }
  const sess = await g(() => __game.sessT);
  console.log(`info session at the end of run 1: ${sess.toFixed(1)} game s`);
  check(cardSeen ? cardAt >= 60 : (await g(() => __game.mult === 2)), cardSeen ? `results card only after 60 s (at ${cardAt.toFixed(1)} s)` : `a run under 60 s goes straight on to x2, no end screen (${sess.toFixed(1)} s)`);
  if (cardSeen) { const b = await page.locator('#cAgain').boundingBox(); await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2); }
  await page.waitForFunction(() => __game.mult === 2, null, { timeout: 5000 }).catch(() => {});
  check(await g(() => __game.mult === 2 && __game.R.zone === 0 && __game.R.L === 1), 'finishing the vault starts the x2 run');
  check(await g(() => __game.R.objects.filter((o) => o.req > 1).every((o) => o.alive)), 'the new run restores every object');
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(out, '04-rebirth-x2.jpg'), type: 'jpeg', quality: 82 });
  check(await g(() => __game.save.runs === 1 && __game.save.best > 10000 && (window.__writes || []).length > 0), 'the finished run is saved (runs, best size)');
  check(await g(() => __game.R.tier === 0 && __game.save.tier >= 6), 'evolution tiers were reached and the new run starts at tier 0');

  // small objects grow back after a while in the zone being played
  {
    const id = await g(() => { const o = __game.R.objects.find((q) => q.zone === 0 && q.req === 1 && q.alive); return o.id; });
    const [x, z] = await g((i) => [__game.R.objects[i].x, __game.R.objects[i].z], id);
    await tapWorld(x, 0.3, z); await waitIdle();
    const gone = await g((i) => !__game.R.objects[i].alive, id);
    const back = await page.waitForFunction((i) => __game.R.objects[i].alive, id, { timeout: 30000 }).then(() => true, () => false);
    check(gone && back, 'a broken fruit grows back so the zone never runs dry');
  }

  // run() again on the same page: no error, one canvas, and a muted game stays muted with the right icon
  { const b = await page.locator('#mute').boundingBox(); await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2); }
  await g(() => window.run('play'));
  await page.waitForFunction(() => window.__game && window.__game.R && window.__game.R.L === 1);
  check(await g(() => document.querySelectorAll('canvas').length === 1), 'run() twice leaves one canvas');
  check(await g(() => __game.Sound.muted && document.getElementById('mute').textContent === '\u{1F507}'), 'after run() again the mute button still shows muted');
  check(errors.length === 0, 'no page errors in play: ' + errors.slice(0, 3).join(' | '));
  await page.close();

  await finale();
  async function finale() {
  // the finale with a short results gate: the vault takes several hits, then the results card, then Again x2
  {
    cfgPatch = (c) => { c.results.minSession = 3; };
    const { page: p6, errors: e6 } = await open(browser);
    cfgPatch = null;
    const g6 = (fn, arg) => p6.evaluate(fn, arg);
    const o0 = await g6(() => { const o = __game.R.objects.find((q) => q.zone === 0 && q.req === 1); return __game.client(o.x, 0.3, o.z); });
    await p6.mouse.click(o0[0], o0[1]); // first touch starts the session clock
    await p6.waitForFunction(() => __game.sessT > 3.2, null, { timeout: 30000 });
    await g6(() => __game.skipTo(5, 30000));
    await p6.waitForTimeout(3000);
    const v = await g6(() => { const o = __game.R.objects.find((q) => q.boss); return { id: o.id, x: o.x, z: o.z, hp: o.hp }; });
    const hps = [];
    for (let i = 0; i < v.hp && (await g6((id) => __game.R.objects[id].alive, v.id)); i++) {
      const [cx, cy] = await g6(([x, z]) => __game.client(x, 0.3, z), [v.x, v.z]);
      await p6.mouse.click(cx, cy); await p6.waitForFunction(() => !__game.busy, null, { timeout: 5000 });
      hps.push(await g6((id) => __game.R.objects[id].hp, v.id));
      if (i === 2) { await p6.waitForTimeout(300); await p6.screenshot({ path: path.join(out, '10-vault-hit.jpg'), type: 'jpeg', quality: 82 }); }
    }
    check(hps.length === v.hp && hps.slice(0, -1).every((h, i) => h === v.hp - 1 - i) && !(await g6((id) => __game.R.objects[id].alive, v.id)), `the vault takes ${v.hp} hits (hp ${hps.join(', ')})`);
    const shown = await p6.waitForFunction(() => __game.card, null, { timeout: 15000 }).then(() => true, () => false);
    check(shown, 'the results card shows after the vault once the session is long enough');
    check(await g6(() => __game.gemsGot >= __game.cfg.gems.vault && Number(document.getElementById('cGems').textContent) === __game.gemsGot), 'the vault gems fly into the hammer and the card counts them');
    await p6.waitForTimeout(700);
    await p6.screenshot({ path: path.join(out, '11-results-card.jpg'), type: 'jpeg', quality: 82 });
    check(await g6(() => parseFloat(document.getElementById("cSize").textContent) >= 30 && /x2/.test(document.getElementById('cAgain').textContent) && !document.getElementById('cShare').hidden), 'the card shows the size, Again x2 and a share button');
    const s0 = await g6(() => __game.R.slams);
    await p6.mouse.click(60, 640); // a tap on the card backdrop does not slam
    await p6.waitForTimeout(300);
    check(await g6((s) => __game.R.slams === s && __game.card, s0), 'a tap beside the buttons does not slam behind the card');
    const b = await p6.locator('#cAgain').boundingBox(); await p6.mouse.click(b.x + b.width / 2, b.y + b.height / 2);
    await p6.waitForTimeout(300);
    check(await g6(() => !__game.card && __game.mult === 2 && __game.R.L === 1), 'Again on the card starts the x2 run');
    check(e6.length === 0, 'no page errors in the finale: ' + e6.slice(0, 3).join(' | '));
    await p6.close();
  }
  }
  // no WebGL: a retry button with the code GL, no thrown error
  {
    const { page: p7, errors: e7 } = await (async () => {
      const page = await browser.newPage({ viewport: { width: 405, height: 720 } });
      if (process.env.THREE_DIR) {
        const dir = process.env.THREE_DIR;
        await page.route(/three\.module/, (r) => r.fulfill({ contentType: 'text/javascript', body: fs.readFileSync(path.join(dir, 'three.module.js')) }));
        await page.route(/three\.core/, (r) => r.fulfill({ contentType: 'text/javascript', body: fs.readFileSync(path.join(dir, 'three.core.js')) }));
        await page.route(/jsdelivr/, (r) => r.abort());
      }
      const errors = []; page.on('pageerror', (e) => errors.push(e.message));
      await page.addInitScript(() => { HTMLCanvasElement.prototype.getContext = function () { return null; }; });
      await page.goto(`http://localhost:${server.address().port}/?local`);
      return { page, errors };
    })();
    const shown = await p7.waitForSelector('.retry', { timeout: 20000 }).then(() => true, () => false);
    check(shown && /GL/.test(await p7.textContent('.retry')) && e7.length === 0, `without WebGL a retry button with code GL shows, no page error (${e7.slice(0, 2).join(' | ')})`);
    await p7.close();
  }
  // a save read that fails never writes over the player's progress
  {
    const { page: p2 } = await open(browser, { init: () => { window.__saveFails = true; } });
    const o = await p2.evaluate(() => { const b = __game.R.objects.find((q) => q.zone === 0); return __game.client(b.x, 0.3, b.z); });
    await p2.mouse.click(o[0], o[1]); await p2.waitForTimeout(800);
    check(await p2.evaluate(() => !(window.__writes || []).length && !__game.saveLoaded), 'no save is written while the read keeps failing');
    check(await p2.evaluate(() => !__game.scene.post), 'tier 1 draws direct, without the glow pass');
    await p2.close();
  }
  // edit mode: a live picture, taps do nothing
  {
    const { page: p3, errors: e3 } = await open(browser, { mode: 'edit' });
    const o = await p3.evaluate(() => { const b = __game.R.objects.find((q) => q.zone === 0); return __game.client(b.x, 0.3, b.z); });
    await p3.mouse.click(o[0], o[1]); await p3.waitForTimeout(600);
    check(await p3.evaluate(() => __game.R.slams === 0 && document.getElementById('hint').hidden), 'edit mode ignores taps and shows no hint');
    check(e3.length === 0, 'no page errors in edit mode');
    await p3.close();
  }
  // 7 languages: the hint follows the device
  for (const l of LANGS) {
    const { page: p4 } = await open(browser, { locale: l });
    check(await p4.evaluate((x) => __game.lang === x && document.getElementById('hint').textContent.length > 3, l), `language ${l} picked from the device`);
    await p4.waitForTimeout(600);
    await p4.screenshot({ path: path.join(out, `05-lang-${l}.jpg`), type: 'jpeg', quality: 82 });
    await p4.close();
  }
  // frame time at tier 2 on this machine's software GPU: reported, not judged (a phone GPU is not swiftshader)
  {
    const { page: p5 } = await open(browser, { tier: 2 });
    const fps = await p5.evaluate(() => new Promise((res) => { let n = 0; const t0 = performance.now(); const f = () => { n++; if (performance.now() - t0 < 3000) requestAnimationFrame(f); else res(n / 3); }; requestAnimationFrame(f); }));
    const info = await p5.evaluate(() => { const r = __game.scene.renderer.info.render; return [r.calls, r.triangles]; });
    check(await p5.evaluate(() => __game.scene.post), 'tier 2 draws through the glow and grade pass');
    console.log(`info FPS at tier 2 on swiftshader: ${fps.toFixed(1)}; draw calls ${info[0]}, triangles ${info[1]}`);
    // renderer.info counts every pass of a frame (shadow, scene, glow); six zones are in view from the start
    check(info[0] <= 130 && info[1] <= 220000, `render budget at the start view: ${info[0]} draw calls (<= 130), ${info[1]} triangles with shadows (<= 220k)`);
    await p5.close();
  }
  await browser.close(); server.close();
  console.log(fails.length ? `\n${fails.length} FAILED` : '\nall passed');
  process.exit(fails.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
