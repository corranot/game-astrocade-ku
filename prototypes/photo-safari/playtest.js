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
    { const k = await ev(page, () => { const a = document.getElementById('skip').getBoundingClientRect(), b = document.getElementById('logo').getBoundingClientRect(); return [a.bottom, b.top]; }); check(k[0] <= k[1], `the title sits below the skip button (${k[0].toFixed(0)} <= ${k[1].toFixed(0)})`); }
    // the opening: even when today's rare visitor stands at the start, no cinematic takes the camera from the hero
    await ev(page, () => { const r = __game.animals.find((a) => a.rare); if (r) { r.x = 2.5; r.z = -1; r.home = [2.5, -1]; } });
    let beatSeen = false; for (let i = 0; i < 10; i++) { await step(page, 30); if (await ev(page, () => !!__game.beat)) beatSeen = true; }
    check(!beatSeen && await heroOnScreen(page), 'the first 5 s keep the hero framed: no rare-visitor cinematic during the tutorial');
    await step(page, 20);
    await shoot(page, '01-first-frame-ftue-walk');
    // the walk stick waits in the bottom-left corner; a tap elsewhere on the snow does not walk (the rest of the screen looks)
    const z0 = await ev(page, () => __game.hero.z);
    const stk = await page.locator('#stick').boundingBox();
    check(!!stk && stk.x < 390 * 0.5 && stk.y > 844 * 0.5, `the walk stick rests in the bottom-left corner (${stk ? stk.x.toFixed(0) + ',' + stk.y.toFixed(0) : 'hidden'})`);
    check(await ev(page, () => { const h = document.getElementById('hand'), s = document.getElementById('stick').getBoundingClientRect(), b = h.getBoundingClientRect(); return !h.hidden && Math.abs(b.left - s.left) < s.width && Math.abs(b.top - s.top) < s.height; }), 'the tutorial hand shows the walk on the stick itself');
    await page.mouse.click(230, 330); await step(page, 60);
    check(Math.abs((await ev(page, () => __game.hero.z)) - z0) < 0.2, 'a tap on the snow does not walk the hero');
    // walk to the fox with a real drag on the stick: in range while still walking, the tutorial says "Stop to aim"
    let stopHint = false;
    await page.mouse.move(90, 760); await page.mouse.down(); await page.mouse.move(90, 700);
    for (let i = 0; i < 40 && await ev(page, () => __game.hero.z) > 0.6; i++) { await step(page, 4); if (await ev(page, () => { const c = document.getElementById('coach'); return !c.hidden && /Stop to aim/.test(c.textContent); })) stopHint = true; }
    check((await ev(page, () => __game.hero.z)) < z0 - 1, 'dragging the stick walks the hero');
    await page.mouse.up();
    for (let i = 0; i < 40 && await ev(page, () => __game.vf) < 0.9; i++) await step(page, 8);
    await step(page, 20);
    check(await ev(page, () => __game.vf) > 0.9, 'standing near an animal opens the viewfinder');
    check(await ev(page, () => __game.ftue) === 'snap', 'reaching the fox moves the tutorial to "snap"');
    check(stopHint, 'walking in range of the fox, the tutorial says "Stop to aim"');
    await shoot(page, '02-ftue-snap-viewfinder');
    const sb = await page.locator('#shutter').boundingBox();
    await page.mouse.click(sb.x + sb.width / 2, sb.y + sb.height / 2);
    await step(page, 30); await settle(page, 1200);
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
    await ev(page, () => __game.snap()); await step(page, 24); await settle(page, 1300);
    await shoot(page, '12-pose-photo');
    await settle(page);
    const st = await ev(page, () => ({ photos: __game.S.photos, flakes: __game.S.flakes, slots: JSON.stringify(__game.S.slots) }));
    check(st.photos >= 2 && st.flakes > 0, `photos pay snowflakes (${st.photos} photos, ${st.flakes} flakes)`);
    // the area unlock cinematic
    await ev(page, () => { __game.skipFtue(); __game.stamp(['owl', 'penguin', 'reindeer', 'squirrel', 'ermine', 'lynx', 'hare', 'fox']); });
    await settle(page);
    await ev(page, () => __game.openArea(1));
    for (let i = 0; i < 60 && !(await ev(page, () => !!__game.beat)); i++) await step(page, 10);
    await step(page, 40);
    await shoot(page, '13-cinematic-area-gate');
    await page.waitForTimeout(900); await step(page, 20);
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

  // ---- the HUD on four screens: equal margins, one pill height, one top row, brackets inside the HUD
  for (const [w, h] of [[360, 640], [390, 844], [430, 932], [768, 1024]]) {
    const { page, errors } = await open(w, h, '', saved);
    await ev(page, () => __game.buildAll()); // the animals and scenery build after the first frame
    await ev(page, () => { const f = __game.animals.find((a) => a.id === 'owl'); __game.tp(f.x, f.z + 6); }); await step(page, 60);
    const r = await ev(page, () => {
      // layout boxes without CSS transforms (the ready shutter pulses in scale)
      const app = document.getElementById('app').getBoundingClientRect();
      const R = (s) => { let e = document.querySelector(s), x = 0, y = 0; const w = e.offsetWidth, h = e.offsetHeight; for (; e && e.id !== 'app'; e = e.offsetParent) { x += e.offsetLeft; y += e.offsetTop; } return { l: x, t: y, r: app.width - x - w, b: app.height - y - h, w, h }; };
      return { fl: R('#flakes'), stp: R('#stamps'), mute: R('#mute'), book: R('#bookB'), sh: R('#shutter'), vf: R('#vf'), skip: R('#skip') };
    });
    const eq = (a, b) => Math.abs(a - b) <= 1.5;
    check(eq(r.fl.l, r.mute.r) && eq(r.fl.t, r.mute.t), `${w}x${h}: equal side margins top-left/top-right (${r.fl.l.toFixed(1)} / ${r.mute.r.toFixed(1)})`);
    check(eq(r.fl.h, r.stp.h) && eq(r.fl.h, r.mute.h), `${w}x${h}: pills and round buttons share one height (${r.fl.h.toFixed(1)}, ${r.stp.h.toFixed(1)}, ${r.mute.h.toFixed(1)})`);
    check(eq(r.fl.t, r.book.t) && eq(r.book.t, r.mute.t), `${w}x${h}: pills, book and sound on one top row (${r.fl.t.toFixed(1)}, ${r.book.t.toFixed(1)}, ${r.mute.t.toFixed(1)})`);
    const gapL = r.stp.l - (r.fl.l + r.fl.w), gapR = r.book.r - (r.mute.r + r.mute.w), clear = r.book.l - (r.stp.l + r.stp.w);
    check(eq(gapL, gapR) && clear >= gapL - 1.5, `${w}x${h}: equal gaps in the top row, pills clear of the book (${gapL.toFixed(1)} / ${gapR.toFixed(1)}, clear ${clear.toFixed(1)})`);
    check(eq(r.mute.r, r.sh.r), `${w}x${h}: sound button and shutter on one right margin (${r.mute.r.toFixed(1)}, ${r.sh.r.toFixed(1)})`);
    check(r.vf.t >= r.mute.t + r.mute.h * 2 && r.vf.t + r.vf.h <= r.sh.t && r.vf.l > r.fl.l && r.vf.r > r.mute.r, `${w}x${h}: viewfinder brackets inside the HUD (top ${r.vf.t.toFixed(0)}, bottom ${(r.vf.t + r.vf.h).toFixed(0)}, shutter top ${r.sh.t.toFixed(0)})`);
    const vis = await ev(page, () => { const r = document.getElementById('shutter').getBoundingClientRect(), m = document.getElementById('mute').getBoundingClientRect(); return [innerWidth - r.right, innerHeight - r.bottom, innerWidth - m.right]; }); // drawn boxes, pulse included
    check(vis[0] >= vis[2] - 0.5 && vis[1] >= vis[2] - 0.5, `${w}x${h}: the drawn shutter keeps the HUD margin (right ${vis[0].toFixed(1)}, bottom ${vis[1].toFixed(1)}, margin ${vis[2].toFixed(1)})`);
    const pad = await ev(page, () => ['#mute', '#bookB', '#treat'].map((q) => parseFloat(getComputedStyle(document.querySelector(q)).paddingTop)));
    check(pad.every((v) => v > 0), `${w}x${h}: round buttons keep their icon padding (${pad.map((v) => v.toFixed(1)).join(', ')})`);
    await shoot(page, `21-hud-${w}x${h}`);
    check(errors.length === 0, `${w}x${h}: no page errors`);
    await page.close();
  }

  // ---- swipe-to-look: a drag on the right side turns the view, the stick then walks relative to it, the view drifts back
  {
    const { page, errors } = await open(390, 844, '&tod=day', saved);
    await ev(page, () => { __game.skipFtue(); __game.S.hints &= ~4; __game.buildAll(); __game.tp(1, -30); }); await step(page, 90); // an open stretch of path: no viewfinder; hint re-armed for this check
    await shoot(page, '23-look-before');
    await ev(page, () => __game.animals.forEach((a) => { a.x0h = a.x; a.x += 400; })); // nobody wanders into view: the hint only shows in free walking
    await step(page, 60 * 4);
    const hint = () => ev(page, () => { const h = document.getElementById('hand'); return !h.hidden && h.classList.contains('swipe'); });
    check(await hint(), 'after the tutorial a one-time hand shows the swipe to look');
    await shoot(page, '24-look-hint');
    await ev(page, () => __game.animals.forEach((a) => { a.x = a.x0h; }));
    const h0 = await ev(page, () => ({ x: __game.hero.x, z: __game.hero.z }));
    const up2c = async (u) => { await u(); await step(page, 2); };
    const drag = async (x0, y0, dx, dy, n = 8) => { await page.mouse.move(x0, y0); await page.mouse.down(); for (let i = 1; i <= n; i++) { await page.mouse.move(x0 + dx * i / n, y0 + dy * i / n); await step(page, 2); } return async () => page.mouse.up(); };
    const up1 = await drag(300, 420, 90, 20); await up1(); await step(page, 40);
    const lk = await ev(page, () => __game.look());
    check(!(await hint()), 'the first look swipe dismisses the hint');
    check(lk.yaw < -0.5 && lk.el > 0, `a swipe outside the stick corner turns and tilts the view (yaw ${lk.yaw.toFixed(2)}, tilt ${lk.el.toFixed(2)})`);
    check(Math.hypot((await ev(page, () => __game.hero.x)) - h0.x, (await ev(page, () => __game.hero.z)) - h0.z) < 0.2, 'a look swipe does not move the hero');
    await shoot(page, '23-swipe-look');
    const p0 = await ev(page, () => ({ x: __game.hero.x, z: __game.hero.z, yaw: __game.look().yaw }));
    const up2 = await drag(90, 760, 0, -80); await step(page, 40);
    const p1 = await ev(page, () => ({ x: __game.hero.x, z: __game.hero.z })); await up2();
    const mvx = p1.x - p0.x, mvz = p1.z - p0.z, ml = Math.hypot(mvx, mvz) || 1, ex = -Math.sin(p0.yaw), ez = -Math.cos(p0.yaw);
    check((mvx * ex + mvz * ez) / ml > 0.8, `stick "up" walks away from the turned camera (dot ${((mvx * ex + mvz * ez) / ml).toFixed(2)})`);
    check(await heroOnScreen(page), 'the hero stays framed in the turned view');
    // two thumbs: the left one walks while a second finger on the right turns the view
    {
      const two = await ev(page, () => {
        const root = document.getElementById('app'), r = root.getBoundingClientRect(), y0 = __game.look().yaw, h0 = [__game.hero.x, __game.hero.z];
        const pe = (type, id, x, y) => root.dispatchEvent(new PointerEvent(type, { pointerId: id, clientX: r.left + x, clientY: r.top + y, bubbles: true, isPrimary: id === 21 }));
        pe('pointerdown', 21, 90, 760); pe('pointermove', 21, 90, 700); pe('pointerdown', 22, 300, 400);
        for (let i = 1; i <= 6; i++) { pe('pointermove', 22, 300 + i * 12, 400); pe('pointermove', 21, 90, 700); __game.step(4); }
        const walking = !document.getElementById('stick').classList.contains('rest');
        // the game goes to the background mid-walk: every finger lets go
        Object.defineProperty(document, 'hidden', { value: true, configurable: true }); document.dispatchEvent(new Event('visibilitychange'));
        const released = document.getElementById('stick').classList.contains('rest');
        Object.defineProperty(document, 'hidden', { value: false, configurable: true }); document.dispatchEvent(new Event('visibilitychange'));
        const h1 = [__game.hero.x, __game.hero.z]; __game.step(30); const h2 = [__game.hero.x, __game.hero.z];
        return { dyaw: __game.look().yaw - y0, moved: Math.hypot(h1[0] - h0[0], h1[1] - h0[1]), walking, released, after: Math.hypot(h2[0] - h1[0], h2[1] - h1[1]) };
      });
      check(two.walking && two.moved > 0.5 && Math.abs(two.dyaw) > 0.1, `walk and look at once with two thumbs (moved ${two.moved.toFixed(2)} m, turned ${two.dyaw.toFixed(2)})`);
      check(two.released && two.after < 0.3, `going to the background lets go of the stick (drift after ${two.after.toFixed(2)} m)`);
    }
    // the other order: the right thumb is already looking when the left one lands; it walks, and lifting it keeps the look going
    {
      const rev = await ev(page, () => {
        __game.step(60 * 8); const root = document.getElementById('app'), r = root.getBoundingClientRect(), h0 = [__game.hero.x, __game.hero.z];
        const pe = (type, id, x, y) => root.dispatchEvent(new PointerEvent(type, { pointerId: id, clientX: r.left + x, clientY: r.top + y, bubbles: true, isPrimary: id === 31 }));
        pe('pointerdown', 31, 300, 400); for (let i = 1; i <= 3; i++) { pe('pointermove', 31, 300 - i * 12, 400); __game.step(2); }
        const y0 = __game.look().yaw;
        pe('pointerdown', 32, 90, 760); pe('pointermove', 32, 90, 700);
        for (let i = 4; i <= 11; i++) { pe('pointermove', 31, 300 - i * 12, 400); pe('pointermove', 32, 90, 700); __game.step(4); }
        const walking = !document.getElementById('stick').classList.contains('rest'), y1 = __game.look().yaw, moved = Math.hypot(__game.hero.x - h0[0], __game.hero.z - h0[1]);
        pe('pointerup', 32, 90, 700); const h1 = [__game.hero.x, __game.hero.z];
        for (let i = 12; i <= 16; i++) { pe('pointermove', 31, 300 - i * 12, 400); __game.step(4); }
        const y2 = __game.look().yaw, after = Math.hypot(__game.hero.x - h1[0], __game.hero.z - h1[1]);
        pe('pointerup', 31, 300 - 16 * 12, 400); __game.step(2);
        return { walking, moved, turned: Math.abs(y1 - y0), turned2: Math.abs(y2 - y1), after, stuck: !document.getElementById('stick').classList.contains('rest') };
      });
      check(rev.walking && rev.moved > 0.5 && rev.turned > 0.05, `look first, then walk with the other thumb (moved ${rev.moved.toFixed(2)} m, turned ${rev.turned.toFixed(2)})`);
      check(rev.turned2 > 0.03 && !rev.stuck, `lifting the walking thumb keeps the look going (turned ${rev.turned2.toFixed(2)})`);
    }
    // the view stays where the player left it, and a full turn keeps the hero in frame
    { await step(page, 60); const a = await ev(page, () => __game.look().yaw); await step(page, 60 * 12); const b2 = await ev(page, () => __game.look().yaw); check(Math.abs(b2 - a) < 0.01, `the view stays where the player leaves it (yaw ${a.toFixed(2)} -> ${b2.toFixed(2)})`); }
    { await ev(page, () => { __game.tp(1, -30); __game.animals.forEach((q) => { q.x0h = q.x; q.x += 400; }); }); await step(page, 30); let framed = 0;
      for (let q = 0; q < 8; q++) { const u2 = await drag(300, 420, -Math.PI / 4 / 0.006 * (await ev(page, () => parseFloat(getComputedStyle(document.getElementById('app')).getPropertyValue('--u')))), 0); await step(page, 20); if (await heroOnScreen(page)) framed++; await up2c(u2); }
      await ev(page, () => __game.animals.forEach((q) => { q.x = q.x0h; }));
      check(framed === 8, `a full 360° swipe turn keeps the hero framed at every eighth (${framed}/8)`); }
    // low and high tilt by the valley's edge and behind a closed ice gate: the hero stays in view
    { let ok = 0; const spots = [[0, -33], [-14, -6], [12, -20]];
      for (const [x, z] of spots) { await ev(page, ([x, z]) => { __game.tp(x, z); __game.animals.forEach((q) => { q.x0h = q.x; q.x += 400; }); }, [x, z]);
        for (const dy of [300, -300]) { const u3 = await drag(250, 420, 0, dy); await step(page, 30); if (await heroOnScreen(page) && await ev(page, () => __game.W.camera.position.distanceTo({ x: __game.hero.x, y: __game.hero.y + 1, z: __game.hero.z }) > 2.6)) ok++; await up2c(u3); }
        await ev(page, () => __game.animals.forEach((q) => { q.x = q.x0h; })); }
      check(ok === spots.length * 2, `at the valley edge and by a closed gate, high and low tilts keep the hero in view (${ok}/${spots.length * 2})`); }
    check(errors.length === 0, `swipe-to-look: no page errors (${errors.slice(0, 3).join(' | ')})`);
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
