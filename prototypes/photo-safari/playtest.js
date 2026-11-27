// PROTOTYPE - NOT FOR PRODUCTION
// Quick playtest: serves this folder, plays the first-time tutorial with real taps, and saves a JPG of each moment the
// build must show (FTUE steps, viewfinder, photo card, book, shop, treat, pose, area unlock cinematic, aurora night,
// hero at the far corners, HUD on four screen sizes, Arabic HUD, tier 0). Checks: no page errors, modules load
// without THREE, the feed handover (run('edit') then run('play')), the save comes back, the hero stays framed at the
// corners, the HUD sits on one grid (equal margins, one pill height), glare stays low.
// Usage: node playtest.js <out folder>   (Playwright + swiftshader: frame times here are not a phone's)
const http = require('http'), fs = require('fs'), path = require('path'), url = require('url');
const { chromium } = require('playwright');
const out = process.argv[2] || fs.mkdtempSync(path.join(require('os').tmpdir(), 'ss-playtest-'));
fs.mkdirSync(out, { recursive: true });
const types = { '.js': 'text/javascript', '.html': 'text/html', '.json': 'application/json' };
const server = http.createServer((q, s) => {
  const u = q.url.split('?')[0], f = path.join(__dirname, u === '/' ? 'index.html' : u);
  fs.readFile(f, (e, d) => { if (e) { s.writeHead(404); return s.end(); } s.writeHead(200, { 'content-type': types[path.extname(f)] || 'text/plain' }); s.end(d); });
}).listen(0);
const GLARE_MAX = 0.03; // share of near-white pixels a shot may have

(async () => {
  const fails = [];
  const check = (ok, msg) => { console.log((ok ? 'ok   ' : 'FAIL ') + msg); if (!ok) fails.push(msg); };
  {
    const bad = [];
    globalThis.window = globalThis;
    for (const f of ['logic', 'critters', 'world', 'fx', 'audio', 'game']) { try { await import(url.pathToFileURL(path.join(__dirname, f + '.js')).href); } catch (e) { bad.push(`${f}.js: ${e.message}`); } }
    delete globalThis.window; delete globalThis.run;
    check(bad.length === 0, `no module touches THREE when imported (${bad.join('; ') || 'all 6 load'})`);
  }
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  async function open(w, h, q = '', seed = null) {
    const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1, hasTouch: false });
    if (seed) await page.addInitScript((s) => { window.__seedSave = s; }, seed);
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(m.text()); });
    await page.goto(`http://localhost:${server.address().port}/?local${q}`);
    await page.waitForFunction(() => window.__game && window.__game.loaded && document.getElementById('app').classList.contains('live'), null, { timeout: 40000 });
    await page.evaluate(() => { __game.pause(); if (window.__seedSave) __game.hideLogo(); });
    return { page, errors };
  }
  const ev = (page, fn, arg) => page.evaluate(fn, arg);
  const step = (page, n) => page.evaluate((k) => __game.step(k), n);
  const shoot = async (page, name, glare = true) => {
    await page.waitForTimeout(250); // CSS transitions
    const g = await ev(page, () => __game.glare());
    await page.screenshot({ path: path.join(out, name + '.jpg'), type: 'jpeg', quality: 82 });
    if (glare) check(g.white < GLARE_MAX, `${name}: glare ${(g.white * 100).toFixed(2)}% near-white, mean luminance ${g.meanL.toFixed(0)}`);
  };
  // the photo card runs on real time (timers): let it fly to the book while the game steps
  const settle = async (page, ms = 2800) => { const t = Date.now(); while (Date.now() - t < ms) await step(page, 4); };
  const heroOnScreen = (page) => ev(page, () => { const h = __game.hero, p = __game.screenOf(h.x, h.y + 0.9, h.z), r = document.getElementById('app').getBoundingClientRect(); return p[0] > r.width * 0.08 && p[0] < r.width * 0.92 && p[1] > r.height * 0.12 && p[1] < r.height * 0.88; });

  // ---- a new game, played with real taps through the tutorial
  let saved = null;
  {
    const { page, errors } = await open(390, 844, '&tod=day');
    check(await ev(page, () => __game.ftue) === 'walk', 'a new game starts the tutorial at "walk"');
    await step(page, 20);
    await shoot(page, '01-first-frame-ftue-walk');
    // a real tap on the snow walks the hero there
    const z0 = await ev(page, () => __game.hero.z);
    await page.mouse.click(230, 330);
    await step(page, 90);
    const z1 = await ev(page, () => __game.hero.z);
    check(z1 < z0 - 1, `a tap on the snow walks the hero there (z ${z0.toFixed(1)} -> ${z1.toFixed(1)})`);
    // walk to the fox: the viewfinder opens and the tutorial points at the shutter
    await ev(page, () => { const f = __game.animals.find((a) => a.id === 'fox'); __game.walkTo(f.x, f.z + 6); });
    for (let i = 0; i < 12 && await ev(page, () => __game.vf) < 0.9; i++) await step(page, 30);
    await step(page, 20);
    check(await ev(page, () => __game.vf) > 0.9, 'standing near an animal opens the viewfinder');
    check(await ev(page, () => __game.ftue) === 'snap', 'reaching the fox moves the tutorial to "snap"');
    await shoot(page, '02-ftue-snap-viewfinder');
    const sb = await page.locator('#shutter').boundingBox();
    await page.mouse.click(sb.x + sb.width / 2, sb.y + sb.height / 2);
    await step(page, 30);
    check(await ev(page, () => __game.S.photos) >= 1, 'a real tap on the shutter takes a photo');
    await shoot(page, '03-photo-develops');
    await settle(page);
    await shoot(page, '04-new-friend');
    check(await ev(page, () => __game.ftue) === 'book', 'after the first photo the tutorial points at the book');
    await step(page, 120);
    await shoot(page, '05-ftue-book');
    const bb = await page.locator('#bookB').boundingBox();
    await page.mouse.click(bb.x + bb.width / 2, bb.y + bb.height / 2);
    await step(page, 20);
    check(await ev(page, () => !document.getElementById('book').hidden), 'the book button opens the book');
    await shoot(page, '06-book', false);
    await page.locator('.tabs button').nth(1).click(); await step(page, 5);
    await shoot(page, '07-shop', false);
    await page.locator('.tabs button').nth(2).click(); await step(page, 5);
    await shoot(page, '08-today-requests', false);
    await ev(page, () => __game.closeBook()); await step(page, 20);
    // the shy hare: the treat step
    check(await ev(page, () => __game.ftue) === 'treat', 'after the book the tutorial teaches treats');
    await ev(page, () => { const a = __game.animals.find((q) => q.id === 'hare'); __game.walkTo(a.x, a.z + 6); });
    for (let i = 0; i < 12 && await ev(page, () => !document.getElementById('treat').hidden ? 0 : 1); i++) await step(page, 30);
    await step(page, 10);
    await shoot(page, '09-ftue-treat');
    const tb = await page.locator('#treat').boundingBox().catch(() => null);
    if (tb) { await page.mouse.click(tb.x + tb.width / 2, tb.y + tb.height / 2); await step(page, 40); await shoot(page, '10-treat-toss'); }
    check(!!tb && await ev(page, () => __game.ftue) !== 'treat', 'a tap on the treat button tosses a treat and moves on');
    // a pose: the cue, then the photo in the pose window
    await step(page, 120);
    await ev(page, () => { const a = __game.animals.find((q) => q.id === 'hare'); __game.poseNow(a.id); });
    await step(page, 40);
    await shoot(page, '11-pose-cue');
    for (let i = 0; i < 10 && !(await ev(page, () => { const a = __game.animals.find((q) => q.id === 'hare'); return a.pose && a.poseT >= 0; })); i++) await step(page, 6);
    await ev(page, () => __game.snap()); await step(page, 24);
    await shoot(page, '12-pose-photo');
    await settle(page);
    const st = await ev(page, () => ({ photos: __game.S.photos, flakes: __game.S.flakes, slots: JSON.stringify(__game.S.slots) }));
    check(st.photos >= 2 && st.flakes > 0, `photos pay snowflakes (${st.photos} photos, ${st.flakes} flakes)`);
    // the area unlock cinematic
    await ev(page, () => { __game.skipFtue(); __game.stamp(['owl', 'penguin', 'reindeer', 'squirrel', 'ermine', 'lynx', 'hare', 'fox']); });
    await settle(page);
    await ev(page, () => __game.openArea(1)); await step(page, 12); await page.waitForTimeout(400); await step(page, 30);
    await shoot(page, '13-cinematic-area-unlock');
    await step(page, 200);
    check(await ev(page, () => __game.vf > 0.5) || await heroOnScreen(page), 'the hero is framed again after the cinematic (or the viewfinder is up)');
    await shoot(page, '14-after-cinematic');
    await ev(page, () => __game.saveNow && __game.saveNow());
    await page.waitForTimeout(200);
    saved = await ev(page, () => window.__store.state);
    check(!!saved, 'the game saved its state');
    check(errors.length === 0, `no page errors in the new-game run (${errors.slice(0, 3).join(' | ')})`);
    await page.close();
  }

  // ---- a returning player: the save comes back; the far corners and the aurora night
  {
    const { page, errors } = await open(390, 844, '', saved);
    check(await ev(page, () => __game.S.photos) === saved.photos, `the save comes back (${saved.photos} photos)`);
    const C = [['15-corner-meadow-west', -26, 4], ['16-corner-meadow-east', 26, -10], ['17-corner-lake-far', 24, -100]];
    for (const [n, x, z] of C) {
      await ev(page, ([a, b]) => { __game.tp(a, b); }, [x, z]);
      await ev(page, ([a, b]) => __game.walkTo(a + (a > 0 ? 3 : -3), b + 2), [x, z]); await step(page, 70);
      check(await heroOnScreen(page), `${n}: the hero stays framed`);
      await shoot(page, n);
    }
    await ev(page, () => { __game.tp(0, 4); __game.clock(304); }); await step(page, 70);
    await shoot(page, '18-cinematic-aurora-night');
    await step(page, 200);
    await shoot(page, '19-night');
    check(errors.length === 0, `no page errors in the returning run (${errors.slice(0, 3).join(' | ')})`);
    await page.close();
  }

  // ---- the feed handover: the host runs edit first, then play (and play twice)
  {
    const { page, errors } = await open(390, 844, '&mode=edit');
    await ev(page, () => { window.run('play'); });
    await page.waitForFunction(() => window.__game && window.__game.loaded, null, { timeout: 20000 });
    await ev(page, () => { __game.pause(); }); await step(page, 30);
    await ev(page, () => { window.run('play'); });
    await page.waitForFunction(() => window.__game && window.__game.loaded, null, { timeout: 20000 });
    await ev(page, () => { __game.pause(); }); await step(page, 30);
    check(await ev(page, () => document.querySelectorAll('canvas#cv').length) === 1, 'edit -> play -> play leaves one game canvas');
    check(await ev(page, () => __game.ftue) === 'walk', 'the tutorial still runs after the handover');
    await shoot(page, '20-feed-handover');
    check(errors.length === 0, `no page errors in the handover (${errors.slice(0, 3).join(' | ')})`);
    await page.close();
  }

  // ---- the HUD on four screens: equal margins, one pill height, buttons on one column
  for (const [w, h] of [[360, 640], [390, 844], [430, 932], [768, 1024]]) {
    const { page, errors } = await open(w, h, '', saved);
    await ev(page, () => { const f = __game.animals.find((a) => a.id === 'owl'); __game.tp(f.x, f.z + 6); }); await step(page, 60);
    const r = await ev(page, () => {
      // layout boxes without CSS transforms (the ready shutter pulses in scale)
      const app = document.getElementById('app').getBoundingClientRect();
      const R = (s) => { let e = document.querySelector(s), x = 0, y = 0; const w = e.offsetWidth, h = e.offsetHeight; for (; e && e.id !== 'app'; e = e.offsetParent) { x += e.offsetLeft; y += e.offsetTop; } return { l: x, t: y, r: app.width - x - w, b: app.height - y - h, w, h }; };
      return { fl: R('#flakes'), stp: R('#stamps'), mute: R('#mute'), book: R('#bookB'), sh: R('#shutter') };
    });
    const eq = (a, b) => Math.abs(a - b) <= 1.5;
    check(eq(r.fl.l, r.mute.r) && eq(r.fl.t, r.mute.t), `${w}x${h}: equal side margins top-left/top-right (${r.fl.l.toFixed(1)} / ${r.mute.r.toFixed(1)})`);
    check(eq(r.fl.h, r.stp.h) && eq(r.fl.h, r.mute.h), `${w}x${h}: pills and round buttons share one height (${r.fl.h.toFixed(1)}, ${r.stp.h.toFixed(1)}, ${r.mute.h.toFixed(1)})`);
    check(eq(r.mute.r, r.book.r) && eq(r.book.r, r.sh.r), `${w}x${h}: right buttons on one column (${r.mute.r.toFixed(1)}, ${r.book.r.toFixed(1)}, ${r.sh.r.toFixed(1)})`);
    await shoot(page, `21-hud-${w}x${h}`);
    check(errors.length === 0, `${w}x${h}: no page errors`);
    await page.close();
  }

  // ---- Arabic (right to left) and tier 0
  {
    const { page, errors } = await open(390, 844, '&lang=ar&tier=0', saved);
    await step(page, 40);
    await shoot(page, '22-arabic-tier0');
    const st = await ev(page, () => __game.stats());
    check(st.calls <= 160, `tier 0 draw calls within budget (${st.calls})`);
    check(errors.length === 0, 'Arabic / tier 0: no page errors');
    await page.close();
  }

  await browser.close(); server.close();
  console.log(fails.length ? `\n${fails.length} FAILED` : '\nall passed');
  process.exit(fails.length ? 1 : 0);
})();
