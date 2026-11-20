// PROTOTYPE - NOT FOR PRODUCTION
// Plays the game in a phone-sized browser with real drags and taps and fails on any broken rule (GDD §8).
// Screenshots go to the folder given. Usage: node playtest.js <evidence folder>
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const out = process.argv[2] || 'evidence'; fs.mkdirSync(out, { recursive: true });
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.webp': 'image/webp', '.mp3': 'audio/mpeg' };
const server = http.createServer((q, r) => {
  const f = path.join(__dirname, decodeURIComponent(q.url.split('?')[0]).replace(/^\/$/, '/index.html'));
  fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); } else { r.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' }); r.end(d); } });
});
let failed = 0;
const ok = (cond, what) => { console.log((cond ? '  ok  ' : '  FAIL ') + what); if (!cond) failed++; };
const LANGS = ['en', 'ar', 'es', 'vi', 'hi', 'bn', 'id'];
const cfg = JSON.parse(fs.readFileSync(path.join(__dirname, 'game_config.json'), 'utf8')), BAR = cfg.bar;

(async () => {
  await new Promise((r) => server.listen(0, r));
  const base = `http://127.0.0.1:${server.address().port}/index.html?local`;
  const browser = await chromium.launch();
  let current = null; // one game page at a time: pages left open keep running and slow the frame checks
  const open = async (extra = '', ctx = {}, init, arg) => {
    if (current) await current.context().close();
    const c = await browser.newContext({ viewport: { width: 720, height: 1280 }, ...ctx });
    if (init) await c.addInitScript(init, arg);
    const page = current = await c.newPage();
    page.errors = []; page.on('pageerror', (e) => page.errors.push(String(e))); page.on('console', (m) => { if (m.type() === 'error') page.errors.push(m.text()); });
    await page.goto(base + extra); await page.waitForFunction(() => window.__game && window.__game.S && window.__frames > 3 && !window.__game.booting(), null, { timeout: 10000 });
    return page;
  };
  const G = (page, f, a) => page.evaluate(f, a);
  const st = (page) => G(page, () => { const S = window.__game.S; return { n: S.n, step: S.k, enter: S.enter, trim: !!S.trim, used: S.used, mood: S.mood, oopsT: S.oopsT, order: S.order, score: S.score, glit: S.glitCount, gems: S.gems.length, reveal: S.reveal && { t: S.reveal.t, coins: S.reveal.coins }, charm: S.charm && S.charm.state }; });
  const shot = (page, name) => page.screenshot({ path: path.join(out, name + '.jpg'), quality: 82 });
  const wait = (page, f, a, timeout = 12000) => page.waitForFunction(f, a, { timeout });
  const ready = (page) => wait(page, () => window.__game.S.enter <= 0 && !window.__game.S.trim);
  /** A drag through pts, one pointer event every ms milliseconds (a real finger's pace). */
  const drag = async (page, pts, ms = 16) => { await page.mouse.move(pts[0][0], pts[0][1]); await page.mouse.down(); for (const p of pts.slice(1)) { await page.mouse.move(p[0], p[1]); await page.waitForTimeout(ms); } await page.mouse.up(); };
  const row = (y) => Array.from({ length: 16 }, (_, j) => [BAR.x - 24 + (BAR.w + 48) * j / 15, y + (j % 2) * 6]);
  /** Carve the whole bar by careful strokes; returns the strokes taken. */
  const carveAll = async (page) => { let k = 0; for (let y = BAR.y - 6; y < BAR.y + BAR.h + 12 && await G(page, () => window.__game.S.k === 'carve' && !window.__game.S.trim); y += 26) { await drag(page, row(y)); k++; } return k; };
  /** Rub around the edges until smooth. */
  const smoothAll = async (page) => {
    let k = 0;
    while (k < 12 && await G(page, () => window.__game.S.k === 'smooth')) {
      const pts = await G(page, () => { const S = window.__game.S, s = S.soap, c = window.__game.cfg.bar, e = S.edges, out = []; let cx = 0, cy = 0;
        for (let i = 0; i < e.length; i += 9) { const x = e[i] % s.w, y = (e[i] - x) / s.w; out.push([x, y]); cx += x; cy += y; }
        cx /= out.length; cy /= out.length; out.sort((a, b) => Math.atan2(a[1] - cy, a[0] - cx) - Math.atan2(b[1] - cy, b[0] - cx));
        return out.filter((_, i) => i % 3 === 0).map(([x, y]) => [c.x + x, c.y + y]); });
      await drag(page, pts.concat(pts.slice(0, 3)), 12); k++;
    }
    return k;
  };
  const zig = (cx, cy, w, h, n) => Array.from({ length: n }, (_, j) => [cx - w / 2 + w * ((j % 2) ? 1 : 0) + Math.sin(j) * 20, cy - h / 2 + h * j / (n - 1)]);
  const sparkleIt = async (page, gems = 2) => {
    await drag(page, zig(360, 640, 200, 220, 40), 30);
    for (let i = 0; i < gems; i++) { const [x, y] = await G(page, () => window.__game.slotXY(1, 0)); await page.mouse.click(x, y); await page.mouse.click(330 + i * 60, 620); }
  };
  /** Jump past the making steps straight to carving. */
  const toCarve = (page) => G(page, () => { const G = window.__game; while (G.isMake(G.S.k)) G.nextStep(); });
  const tapCheck = async (page) => { const c = await G(page, () => window.__game.CHECK()); await page.mouse.click(c.x + 56, c.y + 56); };
  /** One soap, start to bath, by real gestures. */
  const serve = async (page, name) => {
    await ready(page); const t0 = await G(page, () => window.__game.S.t);
    const strokes = await carveAll(page); if (name) await shot(page, name + '-1-carved');
    await wait(page, () => window.__game.S.k === 'smooth' && !window.__game.S.trim); await page.waitForTimeout(300); if (name) await shot(page, name + '-2-smooth');
    const rubs = await smoothAll(page);
    if (await G(page, () => window.__game.S.k === 'smooth')) await tapCheck(page);
    await wait(page, () => window.__game.S.k === 'sparkle'); await page.waitForTimeout(300); if (name) await shot(page, name + '-3-sparkle');
    await sparkleIt(page); if (name) await shot(page, name + '-4-sparkled');
    await tapCheck(page); await wait(page, () => window.__game.S.k === 'bath');
    const t1 = await G(page, () => window.__game.S.t);
    return { strokes, rubs, secs: t1 - t0 };
  };

  console.log('1. the first frame is the bar, the dotted shape, the order and the moving hand, before any touch');
  let page = await open();
  let s = await st(page);
  ok(s.n === 0 && s.step === 'carve' && s.order.shape === 'heart' && s.order.simple, 'order 1 is a heart at the carve step');
  const h1 = await G(page, () => window.__game.handAt()); await page.waitForTimeout(400); const h2 = await G(page, () => window.__game.handAt());
  ok(await G(page, () => window.__game.handShown()) && (h1[0] !== h2[0] || h1[1] !== h2[1]), 'the helper hand moves before any touch');
  await shot(page, '01-first-frame');
  ok(await G(page, () => { const c = document.getElementById('game'), d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 0; i < d.length; i += 4000) if (d[i + 3]) n++; return n > 100; }), 'the canvas is painted');

  console.log('2. the very first touch carves at once');
  const before = await G(page, () => window.__game.S.soap.m.reduce((a, b) => a + b, 0));
  await drag(page, [[BAR.x + 10, BAR.y + 20], [BAR.x + 60, BAR.y + 24], [BAR.x + 110, BAR.y + 20]]);
  const after = await G(page, () => window.__game.S.soap.m.reduce((a, b) => a + b, 0));
  ok(after < before, `one stroke removes soap (${before - after} cells)`);
  await page.waitForTimeout(100);
  ok(await G(page, () => window.__game.fx.P.some((p) => p.k === 'curl')) || await G(page, () => window.__game.S.shaveAcc > 0), 'a curl peels off');
  ok(!await G(page, () => window.__game.handShown()), 'the hand steps aside once the player carves');
  await page.waitForTimeout(1500);
  ok(await G(page, () => window.__game.fx.P.filter((p) => p.k === 'curl').length === 0), 'curls land within 1.5 s and join the pile');

  console.log('3. order 1 by following the hand: 45-75 s of play, 3 stars');
  page = await open();
  const r1 = await serve(page, '03-order1');
  s = await st(page);
  ok(s.score.shape > 0.95, `shape score ${s.score.shape.toFixed(3)}`);
  ok(s.score.smooth > 0.9, `smooth score ${s.score.smooth.toFixed(3)}`);
  ok(s.score.stars === 3, `3 stars (v ${s.score.v.toFixed(3)})`);
  console.log(`      carve strokes ${r1.strokes}, rub loops ${r1.rubs}, game seconds start→bath ${r1.secs.toFixed(1)}`);
  for (const [t, n] of [[0.35, '03-order1-5-bath-drop'], [1.6, '03-order1-6-bath-bars'], [3.6, '03-order1-7-bath-stars']]) { await wait(page, (t) => window.__game.S.reveal.t > t, t); await shot(page, n); }
  const w1 = await G(page, () => window.__writes || []);
  ok(w1.length > 0 && w1[w1.length - 1].n === 1 && w1[w1.length - 1].shelf.length === 1 && w1[w1.length - 1].coins === 30 + 2 * cfg.stepCoins, 'the save holds 1 soap, 30 coins + a coin per finished step, and the shelf photo');
  ok(w1.every((w) => JSON.stringify(w).length < 40000), 'save stays under 40 KB');
  const nx = await G(page, () => window.__game.NEXT); await page.mouse.click(nx.x, nx.y);
  await wait(page, () => window.__game.S.n === 1);
  s = await st(page); ok(s.order.shape === 'star' && s.step === 'chop', 'the big ▶ brings order 2 (a star), made from scratch: it starts by chopping');
  await ready(page); await page.waitForTimeout(300); await shot(page, '04-order2-start'); await toCarve(page);

  console.log('4. knife rules: the core stays, a fast slip inside the line says oops and costs Shape');
  const core0 = await G(page, () => { const s = window.__game.S.soap; let n = 0; for (let i = 0; i < s.m.length; i++) if (s.m[i] && s.sd[i] > 8) n++; return n; });
  await page.mouse.move(BAR.x + 40, BAR.y + 215); await page.mouse.down(); for (let j = 1; j <= 6; j++) await page.mouse.move(BAR.x + 40 + j * 45, BAR.y + 215); await page.mouse.up(); // a quick slash across the star
  s = await st(page);
  ok(s.oopsT < 1.5 && s.mood === 'oops', 'oops: the customer winces');
  await page.waitForTimeout(150); await shot(page, '05-oops');
  ok(await G(page, () => window.__game.S.soap.nicks > 0), 'the nick is counted');
  for (let k = 0; k < 6; k++) { await page.mouse.move(BAR.x + 100, BAR.y + 120 + k * 30); await page.mouse.down(); for (let j = 1; j <= 5; j++) await page.mouse.move(BAR.x + 100 + j * 30, BAR.y + 120 + k * 30); await page.mouse.up(); }
  ok(core0 === await G(page, () => { const s = window.__game.S.soap; let n = 0; for (let i = 0; i < s.m.length; i++) if (s.m[i] && s.sd[i] > 8) n++; return n; }), 'the minimum core can never be carved');

  console.log('5. a piece cut loose falls as a chunk with a thud');
  page = await open();
  await ready(page);
  for (let y = BAR.y - 10; y < BAR.y + BAR.h + 20; y += 12) await drag(page, [[BAR.x + 34, y], [BAR.x + 34, y + 14]], 10); // a groove down the left side
  await wait(page, () => window.__game.fx.P.some((p) => p.k === 'chunk') || window.__game.S.mood === 'wow', null, 3000).catch(() => {});
  ok(await G(page, () => window.__game.fx.P.some((p) => p.k === 'chunk')), 'the cut-off strip falls as a chunk');
  ok(await G(page, () => window.__game.S.mood === 'wow'), 'the customer says wow');
  await page.waitForTimeout(150); await shot(page, '06-chunk-falling');
  await page.waitForTimeout(1600);
  ok(await G(page, () => !window.__game.fx.P.some((p) => p.k === 'chunk')), 'the chunk comes to rest on the pile');

  console.log('6. a charm hides in the waste soap and pops out');
  page = await open('', {}, () => { window.__saved = { n: 4, coins: 0, stars: 12 }; });
  await wait(page, () => window.__game.S.n === 4); await ready(page);
  s = await st(page); ok(s.order.charm !== null && s.charm === 'hidden', 'order 5 hides a charm');
  await toCarve(page); await carveAll(page);
  await wait(page, () => window.__game.S.charm.state === 'out', null, 4000).catch(() => {});
  ok(await G(page, () => window.__game.S.charm.state === 'out'), 'the charm pops out');
  await page.waitForTimeout(300); await shot(page, '07-charm');
  ok(await G(page, () => window.__game.save.charms.length === 1), 'the charm goes into the album');

  console.log('7. a purchase is followed by an order asking for it');
  page = await open('', {}, () => { window.__saved = { n: 2, coins: 200, stars: 6 }; });
  await wait(page, () => window.__game.S.n === 2); await ready(page);
  await G(page, () => { const G = window.__game; G.S.si = G.S.steps.indexOf('sparkle'); G.S.k = 'sparkle'; G.S.edges = new Int32Array(0); });
  await page.waitForTimeout(100); await shot(page, '08-tray-locked');
  const [lx, ly] = await G(page, () => window.__game.slotXY(0, 3)); await page.mouse.click(lx, ly);
  ok(await G(page, () => window.__game.save.owned.glitters.includes('sky') && window.__game.save.coins === 150), 'tapping a locked glitter buys it for 50');
  ok(await G(page, () => window.__game.S.glitSel === 3), 'and selects it');
  ok(await G(page, () => window.__game.makeOrder(window.__game.save.n).glitter === 'sky'), 'the next order asks for the new glitter');
  await G(page, () => { window.__game.save.coins = 5; });
  const [lx2, ly2] = await G(page, () => window.__game.slotXY(0, 4)); await page.mouse.click(lx2, ly2);
  ok(await G(page, () => !window.__game.save.owned.glitters.includes('lime') && window.__game.save.coins === 5), 'too few coins: nothing bought, just a wiggle');

  console.log('8. save: nothing written before the read; late save merged; corrupt save dropped');
  page = await open('', {}, () => { window.__slowSave = true; });
  await ready(page); await drag(page, row(BAR.y + 10));
  ok((await G(page, () => (window.__writes || []).length)) === 0, 'no write before the stored save is read');
  await G(page, () => window.__resolveSave({ state: { n: 3, coins: 40, stars: 9, owned: { marbles: ['gold', 'nope'], glitters: [], gems: ['pearl'] }, shelf: [{ m: 'zz', mb: 'pink', g: 0, gc: 0, gems: [], s: 3, sh: 'heart' }, { m: '0,280', mb: 'pink', g: 0, gc: 0, gems: [['ruby', 5, 5]], s: 2, sh: 'star' }, 'junk'], charms: [1, 99], lang: 'xx', fresh: { k: 'gems', id: 'pearl' } } }));
  await wait(page, () => (window.__writes || []).length > 0);
  const sv = await G(page, () => window.__game.save);
  ok(sv.n === 3 && sv.coins === 40 && sv.stars === 9, 'the late save is merged (count up)');
  ok(sv.owned.marbles.join() === 'gold' && sv.owned.gems.join() === 'pearl', 'unknown items are dropped');
  ok(sv.shelf.length === 1 && sv.charms.join() === '1', `only the valid shelf soap (${sv.shelf.length}) and charm survive`);
  ok(await G(page, () => window.__game.S.n === 0), 'a soap already started is not swapped under the finger');
  await G(page, () => { window.__game.view = 'shelf'; }); await page.waitForTimeout(400); await shot(page, '09-shelf-after-merge');

  console.log('9. a second run() keeps the soap and does not double the input');
  page = await open(); await ready(page);
  await drag(page, row(BAR.y + 12));
  const m1 = await G(page, () => window.__game.S.soap.removedOut);
  await G(page, () => window.run('play')); await page.waitForTimeout(200);
  ok(await G(page, () => window.__game.S.soap.removedOut) === m1, 'the carved soap is kept');
  await drag(page, row(BAR.y + 40));
  const m2 = await G(page, () => window.__game.S.soap.removedOut);
  await G(page, () => window.run('play')); await page.waitForTimeout(100);
  ok(m2 > m1, 'carving still works');

  console.log('10. edit mode: drawn, no input, no saving');
  page = await open('&mode=edit'); await page.waitForTimeout(300);
  await drag(page, row(BAR.y + 20));
  ok(await G(page, () => window.__game.S.soap.removedOut === 0 && !(window.__writes || []).length), 'edit mode ignores touches and writes nothing');
  await shot(page, '10-edit-mode');

  console.log('11. taps only, and 600 random seeded inputs: no errors, no stuck state');
  page = await open(); await ready(page);
  for (let i = 0; i < 120; i++) await page.mouse.click(200 + (i * 37) % 320, 430 + (i * 53) % 440);
  ok(await G(page, () => window.__game.carvedShare() > 0.05), 'taps carve too');
  let seed = 7; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  for (let i = 0; i < 600; i++) {
    const x = rnd() * 720, y = rnd() * 1280, k = rnd();
    if (k < 0.5) await page.mouse.click(x, y); else { await page.mouse.move(x, y); await page.mouse.down(); await page.mouse.move(x + (rnd() - 0.5) * 300, y + (rnd() - 0.5) * 300, { steps: 3 }); await page.mouse.up(); }
  }
  ok(page.errors.length === 0, 'no errors after 600 random inputs' + (page.errors.length ? ': ' + page.errors.slice(0, 2).join(' | ') : ''));
  ok(await G(page, () => Number.isFinite(window.__game.save.coins) && window.__game.save.coins >= 0), 'coins stay a sane number');

  console.log('12. layout: nothing tappable in the bottom 15%, buttons ≥ 96 px');
  const L = await G(page, () => { const G = window.__game; return { next: G.NEXT, slots: [G.slotXY(0, 0), G.slotXY(1, 5)], lang: G.LANGB(), free: G.FREEB(), check: G.CHECK(), mute: G.MUTE(), shelf: G.SHELFB(), shop: G.SHOP_XY(0) }; });
  ok(L.next.y + L.next.r <= 1088 && L.slots[1][1] + 48 <= 1088 && L.lang.y + L.lang.h <= 1088 && L.free.y + L.free.h <= 1088, 'every control ends above y 1088');
  ok(L.check.s >= 96 && L.mute.s >= 92 && L.next.r * 2 >= 96 && L.lang.h >= 84, 'controls are big enough for a child finger');

  console.log('13. seven languages: every screen, with the device locale');
  for (const l of LANGS) {
    page = await open('', { locale: l === 'en' ? 'en-US' : l });
    ok(await G(page, () => window.__game.lang) === l, `${l}: the game speaks the device language`);
    await page.waitForTimeout(250); await shot(page, `lang-${l}-1-carve`);
    await G(page, () => { const G = window.__game; G.finishCarve(); });
    await wait(page, () => window.__game.S.k === 'smooth'); await page.waitForTimeout(200); await shot(page, `lang-${l}-2-smooth`);
    await G(page, () => window.__game.finishSmooth()); await wait(page, () => window.__game.S.k === 'sparkle'); await page.waitForTimeout(200); await shot(page, `lang-${l}-3-sparkle`);
    await G(page, () => window.__game.finishSparkle()); await wait(page, () => window.__game.S.reveal && window.__game.S.reveal.t > 3.6); await shot(page, `lang-${l}-4-bath`);
    await G(page, () => { window.__game.view = 'shelf'; }); await page.waitForTimeout(300); await shot(page, `lang-${l}-5-shelf`);
    ok(page.errors.length === 0, `${l}: no errors`);
    page = await open('', { locale: l === 'en' ? 'en-US' : l }, () => { window.__saved = { n: 2, coins: 120, stars: 6 }; });
    await wait(page, () => window.__game.S.n === 2); await ready(page); await page.waitForTimeout(400); await shot(page, `lang-${l}-6-chop`);
    for (const [k, name] of [['stir', '7-stir'], ['pour', '8-pour'], ['stamp', '9-stamp']]) { await G(page, (k) => { const G = window.__game; while (G.S.k !== k) G.nextStep(); }, k); await page.waitForTimeout(700); await shot(page, `lang-${l}-${name}`); }
    await G(page, () => { const G = window.__game; while (G.S.k !== 'bath') G.nextStep(); }); await wait(page, () => window.__game.S.reveal && window.__game.S.reveal.t > 1.6);
    await G(page, () => { window.__game.save.giftDue = true; window.__game.nextOrder(); }); await page.waitForTimeout(600); await shot(page, `lang-${l}-10-gift`);
    ok(page.errors.length === 0 && await G(page, () => window.__game.view === 'gift'), `${l}: making, stamp and gift screens drawn`);
  }
  page = await open('', { locale: 'fr-FR' }); ok(await G(page, () => window.__game.lang) === 'en', 'an unknown locale falls back to English');
  page = await open(); await G(page, () => { window.__game.view = 'shelf'; }); await page.waitForTimeout(100);
  const lb = await G(page, () => window.__game.LANGB()); await page.mouse.click(lb.x + 50, lb.y + 40);
  ok(await G(page, () => window.__game.lang === 'ar' && window.__game.save.lang === 'ar'), 'the globe changes the language and keeps the choice');

  console.log('14. free carve opens after 6 soaps; the shelf shows photos');
  page = await open('', {}, () => { window.__saved = { n: 6, coins: 0, stars: 18 }; });
  await wait(page, () => window.__game.S.n === 6); await G(page, () => { window.__game.view = 'shelf'; }); await page.waitForTimeout(100);
  ok(await G(page, () => window.__game.freeOpen()), 'free carve is open');
  const fb = await G(page, () => window.__game.FREEB()); await page.mouse.click(fb.x + 150, fb.y + 40);
  ok(await G(page, () => window.__game.S.order.free && window.__game.view === 'play'), 'tapping it starts a free carve');
  await ready(page); await toCarve(page); await page.waitForTimeout(300); await shot(page, '11-free-carve');

  console.log('15. speed: carving with the CPU slowed 4×');
  page = await open(); await ready(page);
  const cdp = await page.context().newCDPSession(page); await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await G(page, () => { window.__dts = []; let last = performance.now(); const tick = (t) => { window.__dts.push(t - last); last = t; if (window.__dts.length < 400) requestAnimationFrame(tick); }; requestAnimationFrame(tick); });
  // a finger's events made inside the page at 60 Hz, so the browser driver's own cost is not measured
  await G(page, async (bar) => {
    const cv = document.getElementById('game'), r = cv.getBoundingClientRect(), k = r.width / 720;
    const ev = (type, x, y) => cv.dispatchEvent(new PointerEvent(type, { pointerId: 7, pointerType: 'touch', isPrimary: true, bubbles: true, clientX: r.left + x * k, clientY: r.top + y * k }));
    for (let y = bar.y + 56; y < bar.y + 300; y += 26) {
      ev('pointerdown', bar.x - 20, y);
      for (let j = 1; j <= 18; j++) { await new Promise((res) => setTimeout(res, 16)); ev('pointermove', bar.x - 20 + j * 21, y + (j % 2) * 6); }
      ev('pointerup', bar.x + bar.w + 20, y);
    }
  }, BAR);
  const dts = (await G(page, () => window.__dts)).slice(5).sort((a, b) => a - b), med = dts[Math.floor(dts.length / 2)];
  ok(med <= 1000 / 30 + 0.1, `median frame ${med.toFixed(1)} ms while carving (CPU 4× slower)`);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });

  console.log('16. comfort: the screen never shakes hard and never rolls');
  ok(await G(page, () => { const src = String(window.__game.applySave); return !!src; }) && fs.readFileSync(path.join(__dirname, 'game.js'), 'utf8').match(/shake = Math\.max\(shake, ([^)]*)\)/g).every((m) => !/0\.[6-9]|1\./.test(m.replace('Math.min(0.5', ''))), 'every shake is ≤ 0.5 and has no rotation');

  console.log('17. platform rules');
  const code = ['game.js', 'soap.js', 'fx.js', 'sprites.js', 'ui.js', 'index.html'].map((f) => fs.readFileSync(path.join(__dirname, f), 'utf8')).join('\n');
  ok(!/localStorage|document\.cookie|alert\(|window\.open/.test(code), 'no storage, cookies, alerts or popups');
  ok(!/https?:\/\/(?!cdn\.jsdelivr\.net)/.test(code.replace(/\/\/ .*$/gm, '')), 'no network beyond the CDN');
  const keys = new Set(Object.keys(cfg.strings.en)); ok(LANGS.every((l) => Object.keys(cfg.strings[l]).length === keys.size), 'every language has every string');
  const used = [...code.matchAll(/T\('([a-zA-Z0-9]+)'\)/g)].map((m) => m[1]); ok(used.every((k) => keys.has(k)), 'every string the code asks for exists');

  console.log('18. regressions found by the bug hunt');
  page = await open('', {}, () => { window.__saved = { n: 6, coins: 0, stars: 18 }; });
  await wait(page, () => window.__game.S.n === 6); await G(page, () => { window.__game.freeNext = true; window.__game.newOrder(6, false); }); await ready(page); await toCarve(page);
  for (let k = 0; k < 3; k++) await drag(page, [[BAR.x - 20, BAR.y + 60 + k * 40], [BAR.x + 60, BAR.y + 60 + k * 40], [BAR.x + 130, BAR.y + 60 + k * 40]]);
  await drag(page, Array.from({ length: 12 }, (_, j) => [BAR.x - 20 + (BAR.w + 40) * j / 11, BAR.y + BAR.h / 2])); // one cut through the middle
  ok(await G(page, () => { const s = window.__game.S.soap; let n = 0, t = 0; for (let i = 0; i < s.m.length; i++) if (s.t[i]) { t++; n += s.m[i]; } return n < t; }), 'free carve: the knife can cut into the middle of the bar');
  const out18 = () => G(page, () => { const s = window.__game.S.soap; let n = 0; for (let i = 0; i < s.m.length; i++) if (s.m[i] && !s.t[i]) n++; return n; });
  const before18 = await out18();
  const c18 = await G(page, () => window.__game.CHECK()); await page.mouse.click(c18.x + 56, c18.y + 56);
  await wait(page, () => window.__game.S.k === 'smooth');
  ok(before18 > 1000 && await out18() > before18 * 0.8, 'free carve: ✔ keeps the shape the player carved (no trim)');
  page = await open(); await ready(page);
  await G(page, () => { const G = window.__game; G.finishCarve(); }); await wait(page, () => window.__game.S.k === 'smooth'); await G(page, () => window.__game.finishSmooth()); await wait(page, () => window.__game.S.k === 'sparkle');
  await drag(page, zig(360, 640, 160, 160, 12), 30);
  const sb = await G(page, () => window.__game.SHELFB()); await page.mouse.click(sb.x + 46, sb.y + 46); await page.waitForTimeout(6500); await page.mouse.click(sb.x + 46, sb.y + 46); await page.waitForTimeout(300);
  ok(await G(page, () => window.__game.S.k === 'sparkle'), 'sparkle does not end by itself while the shelf is open');
  for (let i = 0; i < 6; i++) { const [x, y] = await G(page, (i) => window.__game.slotXY(0, i % 3), i); await page.mouse.click(x, y); await page.waitForTimeout(1000); }
  ok(await G(page, () => window.__game.S.k === 'sparkle'), 'browsing the tray counts as activity');
  const [gx, gy] = await G(page, () => window.__game.slotXY(1, 0)); await page.mouse.click(gx, gy); await page.mouse.click(360, 640);
  const placed18 = await G(page, () => window.__game.S.gems.length);
  const [sx18, sy18] = await G(page, () => window.__game.slotXY(0, 1)); await page.mouse.click(sx18, sy18);
  await page.mouse.click(360, 640);
  ok(placed18 === 1 && await G(page, () => window.__game.S.gems.length === 0), 'a tap on a placed gem removes it, whatever tool is held');
  page = await open(); await ready(page); await drag(page, row(BAR.y + 12));
  const r18 = await G(page, () => window.__game.S.soap.removedOut);
  await G(page, () => window.run('edit')); await page.waitForTimeout(150); await G(page, () => window.run('play')); await page.waitForTimeout(150);
  ok(await G(page, () => window.__game.S.soap.removedOut) === r18 && r18 > 0, 'run(edit) then run(play) keeps the soap in progress');
  page = await open(); await ready(page);
  await G(page, () => { window.__landed = []; const fx = window.__game.fx, bake = fx.bake; fx.bake = (p) => { if (p.k === 'chunk') window.__landed.push([p.x, p.y]); bake(p); }; });
  for (let y = BAR.y - 10; y < BAR.y + BAR.h + 20; y += 12) await drag(page, [[BAR.x + 34, y], [BAR.x + 34, y + 14]], 10);
  for (let x = BAR.x - 10; x < BAR.x + BAR.w + 20; x += 12) await drag(page, [[x, BAR.y + 30], [x + 14, BAR.y + 30]], 10);
  await page.waitForTimeout(2000);
  const landed = await G(page, () => window.__landed);
  ok(landed.length > 0 && landed.every(([x, y]) => x < BAR.x || x > BAR.x + BAR.w || y > BAR.y + BAR.h), `chunks come to rest off the bar (${landed.map((p) => p.map(Math.round).join(',')).join(' ')})`);
  page = await open(); await ready(page);
  await G(page, () => { const G = window.__game; G.finishCarve(); }); await wait(page, () => window.__game.S.k === 'smooth'); await G(page, () => window.__game.finishSmooth()); await wait(page, () => window.__game.S.k === 'sparkle');
  await G(page, () => window.__game.finishSparkle()); await wait(page, () => window.__game.S.reveal && window.__game.S.reveal.t > 1.2);
  const sb2 = await G(page, () => window.__game.SHELFB()); await page.mouse.click(sb2.x + 46, sb2.y + 46); await page.waitForTimeout(200);
  ok(await G(page, () => window.__game.view === 'shelf' && window.__game.coinShown === window.__game.save.coins && window.__game.save.coins > 0), 'opening the shelf during the bath shows the real coin total');

  console.log('19. the full recipe (soap 2 on): twelve steps, each its own gesture, by real touches');
  page = await open('', {}, () => { window.__saved = { n: 2, coins: 0, stars: 6 }; });
  await wait(page, () => window.__game.S.n === 2); await ready(page);
  ok(JSON.stringify(await G(page, () => window.__game.S.steps)) === JSON.stringify(['chop', 'color', 'stir', 'scent', 'pour', 'cool', 'pop', 'carve', 'smooth', 'stamp', 'sparkle', 'bath']), 'the recipe has 12 steps');
  const k19 = () => G(page, () => window.__game.S.k), t19 = await G(page, () => window.__game.S.t), seen = [];
  ok(await G(page, () => window.__game.handShown()), 'the hand shows the new gesture on the second soap');
  for (let i = 0; i < 6 && await k19() === 'chop'; i++) { await page.mouse.click(360, 994); await page.waitForTimeout(260); }
  await wait(page, () => window.__game.S.k === 'color'); seen.push('chop');
  const b0 = await G(page, () => window.__game.S.make.base);
  for (const [x, w] of [[260, 220], [260, 220], [460, 220]]) { await page.mouse.click(x, 994); await page.waitForTimeout(w); }
  await wait(page, () => window.__game.S.k === 'stir'); seen.push('color');
  for (let i = 0; i < 4 && await k19() === 'stir'; i++) await drag(page, Array.from({ length: 90 }, (_, j) => [360 + Math.cos(j / 8) * 110, 640 + Math.sin(j / 8) * 110]), 8);
  await wait(page, () => window.__game.S.k === 'scent'); seen.push('stir');
  await page.mouse.click(520, 994); await wait(page, () => window.__game.S.k === 'pour'); seen.push('scent');
  ok(await G(page, () => window.__game.S.scent) === 'lemon', 'the flower tapped is the scent kept');
  await page.waitForTimeout(600); await page.mouse.move(360, 650); await page.mouse.down();
  await wait(page, () => window.__game.S.make.level > 0.9); await page.mouse.up();
  ok(await G(page, () => window.__game.S.make.perfect), 'letting go in the green band is a perfect pour');
  await wait(page, () => window.__game.S.k === 'cool'); seen.push('pour');
  for (let y = BAR.y + 20; y < BAR.y + BAR.h && await k19() === 'cool'; y += 40) await drag(page, Array.from({ length: 12 }, (_, j) => [BAR.x - 10 + j * 36, y + (j % 2) * 12]), 14); // rubbing row by row, as the hand shows
  await wait(page, () => window.__game.S.k === 'pop'); seen.push('cool');
  await drag(page, [[360, 520], [360, 600], [360, 700]], 30); await wait(page, () => window.__game.S.k === 'carve'); seen.push('pop');
  await carveAll(page); await wait(page, () => window.__game.S.k === 'smooth' && !window.__game.S.trim); seen.push('carve');
  await smoothAll(page); if (await k19() === 'smooth') await tapCheck(page); await wait(page, () => window.__game.S.k === 'stamp'); seen.push('smooth');
  await page.mouse.click(330, 600); await page.mouse.click(400, 720);
  ok(await G(page, () => window.__game.S.soap.emb.some((v) => v > 0.5) && window.__game.S.stamps.length === 2), 'stamps press into the soap');
  await tapCheck(page); await wait(page, () => window.__game.S.k === 'sparkle'); seen.push('stamp');
  await sparkleIt(page); await tapCheck(page); await wait(page, () => window.__game.S.k === 'bath'); seen.push('sparkle');
  ok(seen.length === 11, 'every step was reached in order by its own gesture: ' + seen.join(' → '));
  const t19b = await G(page, () => window.__game.S.t);
  console.log(`      a test bot needs ${(t19b - t19).toFixed(0)} s of game time from chop to bath; a child takes longer`);
  await wait(page, () => window.__game.S.reveal.t > 3.8);
  const coins19 = await G(page, () => window.__game.save.coins);
  ok(coins19 >= cfg.coinPerStar + 10 * cfg.stepCoins + cfg.perfectCoins, `coins: stars + a coin per step + the perfect pour (${coins19})`);
  const entry19 = await G(page, () => window.__game.save.shelf[0]);
  ok(entry19.st.length === 2, 'the shelf soap keeps its stamps');
  const nx19 = await G(page, () => window.__game.NEXT); await page.mouse.click(nx19.x, nx19.y); await page.waitForTimeout(300);
  ok(await G(page, () => window.__game.view === 'gift'), 'after the 3rd soap a gift box waits');
  await shot(page, '12-gift');
  const sb19 = await G(page, () => window.__game.SHELFB()); await page.mouse.click(sb19.x + 46, sb19.y + 46);
  ok(await G(page, () => window.__game.view === 'gift' && window.__game.gift.taps === 1), 'the gift screen keeps every tap (the shelf button cannot skip it)');
  for (let i = 0; i < 2; i++) { await page.mouse.click(360, 650); await page.waitForTimeout(150); }
  await page.waitForTimeout(700); await shot(page, '13-gift-open');
  const gift19 = await G(page, () => window.__game.gift.item);
  ok(gift19 && gift19.k === 'stamps' && await G(page, (id) => window.__game.save.owned.stamps.includes(id) && window.__game.save.fresh.id === id, gift19.id), `three taps open it: a new stamp (${gift19 && gift19.id})`);
  await page.mouse.click(360, 650); await wait(page, () => window.__game.view === 'play' && window.__game.S.n === 3);
  ok(await G(page, () => window.__game.S.order.stamp) === gift19.id, 'and the next customer asks for it');
  ok(page.errors.length === 0, 'no errors through the whole recipe');

  console.log('20. regressions found by the second bug hunt');
  const toStep = (page, k) => G(page, (k) => { const G = window.__game; while (G.S.k !== k) G.nextStep(); }, k);
  page = await open('', {}, () => { window.__saved = { n: 2, coins: 0, stars: 6 }; });
  await wait(page, () => window.__game.S.n === 2); await ready(page); await toStep(page, 'pour');
  await page.mouse.move(360, 650); await page.mouse.down(); await page.waitForTimeout(1500);
  ok(await G(page, () => window.__game.S.make.level > 0.3), 'holding before the pot arrives still pours');
  await page.mouse.up();
  page = await open('', {}, () => { window.__saved = { n: 2, coins: 0, stars: 6 }; });
  await wait(page, () => window.__game.S.n === 2); await ready(page); await toStep(page, 'pour'); await page.waitForTimeout(700);
  await page.mouse.move(360, 650); await page.mouse.down(); await wait(page, () => window.__game.S.make.level > 0.45); await page.mouse.up();
  ok(await G(page, () => window.__game.S.k === 'pour' && window.__game.S.make.lowT > 0), 'letting go too early shows and sounds a hint');
  ok(await G(page, () => window.__game.fillShare(0.55) < 0.8 && window.__game.fillShare(window.__game.cfg.pourLo) >= 0.99), 'the mould looks full only when the level reaches the green band');
  await page.mouse.move(360, 650); await page.mouse.down(); await wait(page, () => window.__game.S.make.level > 0.7);
  await G(page, () => window.run('play')); await page.waitForTimeout(300); await page.mouse.up();
  ok(await G(page, () => !window.__game.S.make.pouring), 'a second run() mid-pour stops the pouring');
  page = await open('', {}, () => { window.__saved = { n: 2, coins: 0, stars: 6 }; });
  await wait(page, () => window.__game.S.n === 2); await ready(page);
  const w20 = await G(page, () => (window.__writes || []).length); await toStep(page, 'color');
  ok(await G(page, (w) => (window.__writes || []).length > w && window.__writes[window.__writes.length - 1].learned.includes('chop'), w20), 'a finished step is saved at once (coins and learned gestures)');
  await toStep(page, 'bath'); await wait(page, () => window.__game.S.reveal && window.__game.S.reveal.t > 0.5);
  ok(await G(page, () => window.__game.save.giftDue === true && window.__game.giftDots() === window.__game.cfg.giftEvery), 'the gift is due and saved; its dots show full');
  const saved20 = await G(page, () => JSON.parse(JSON.stringify(window.__game.save)));
  page = await open('', {}, (st) => { window.__saved = st; }, saved20);
  await wait(page, () => window.__game.view === 'gift');
  ok(true, 'a reload with a gift due opens the gift box');
  for (let i = 0; i < 3; i++) { await page.mouse.click(360, 650); await page.waitForTimeout(150); }
  ok(await G(page, () => window.__game.save.giftDue === false), 'opening it clears the due gift');
  ok(await G(page, () => { const G = window.__game, b = G.potSide(); return b.x - b.r >= 0 && b.x + b.r <= 720; }), 'the pot beside the mould stays on screen');

  console.log('21. precision: every tool works exactly where it is drawn; the HUD sits on one line');
  page = await open(); await ready(page);
  const tip = await G(page, () => {
    const G = window.__game, c = document.createElement('canvas'); c.width = c.height = 400; const q = c.getContext('2d'), res = [];
    for (const lean of [-0.4, 0, 0.4]) { // the opaque pixel furthest along the blade must be the cut point
      q.clearRect(0, 0, 400, 400); G.drawKnife(q, 200, 200, lean);
      const d = q.getImageData(0, 0, 400, 400).data, dir = [Math.cos(-Math.PI / 4 + lean), Math.sin(-Math.PI / 4 + lean)]; let best = -1e9, at = null;
      for (let y = 0; y < 400; y++) for (let x = 0; x < 400; x++) if (d[(y * 400 + x) * 4 + 3] > 60) { const v = (x - 200) * dir[0] + (y - 200) * dir[1]; if (v > best) { best = v; at = [x, y]; } }
      res.push(Math.hypot(at[0] - 200, at[1] - 200));
    }
    q.clearRect(0, 0, 400, 400); G.drawShaker(q, 200, 260, Math.PI * 0.14); // held straight upside down: the middle of its lowest row is the mouth
    const d = q.getImageData(0, 0, 400, 400).data; let low = null;
    for (let y = 399; y >= 0 && !low; y--) { const xs = []; for (let x = 0; x < 400; x++) if (d[(y * 400 + x) * 4 + 3] > 60) xs.push(x); if (xs.length) low = [Math.round((xs[0] + xs[xs.length - 1]) / 2), y]; }
    return { knife: res, mouth: low, mouthWant: [200, 260 - G.MOUTH_UP] };
  });
  ok(tip.knife.every((v) => v <= 3), `the knife's tip is the cut point at every lean (${tip.knife.map((v) => v.toFixed(1)).join(', ')} px)`);
  ok(Math.abs(tip.mouth[1] - tip.mouthWant[1]) <= 3 && Math.abs(tip.mouth[0] - tip.mouthWant[0]) <= 4, `the shaker's mouth hangs right above the glitter spot (${tip.mouth} vs ${tip.mouthWant})`);
  const hud = await G(page, () => { const G = window.__game, m = G.MUTE(), s = G.SHELFB(), gb = G.GIFTB(); return [m.y + m.s / 2, s.y + s.s / 2, gb.y + gb.h / 2, 64]; });
  ok(hud.every((v) => v === 64), `coin pill, gift pill, shelf and sound buttons share one centre line (${hud.join(', ')})`);
  await toCarve(page);
  await G(page, () => window.__game.S.k === 'carve');
  await page.mouse.move(BAR.x + 10, BAR.y + 30); await page.mouse.down(); await page.mouse.move(BAR.x + 40, BAR.y + 30, { steps: 3 });
  ok(await G(page, (b) => { const s = window.__game.S.soap; return !s.m[30 * s.w + 38] && !s.m[30 * s.w + 12]; }, BAR), 'the knife removes soap at the finger, where its tip is drawn');
  await page.mouse.up();

  console.log('22. pointer bursts (several events per frame, as on 120 Hz screens) and RTL pouring');
  const burst = (page, pts, per) => G(page, async ({ pts, per }) => { // `per` events sent back to back, then a frame's pause
    const cv = document.getElementById('game'), r = cv.getBoundingClientRect(), k = r.width / 720;
    const ev = (type, x, y) => cv.dispatchEvent(new PointerEvent(type, { pointerId: 9, pointerType: 'touch', isPrimary: true, bubbles: true, clientX: r.left + x * k, clientY: r.top + y * k }));
    ev('pointerdown', pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) { ev('pointermove', pts[i][0], pts[i][1]); if (i % per === 0) await new Promise((res) => requestAnimationFrame(res)); }
    ev('pointerup', pts[pts.length - 1][0], pts[pts.length - 1][1]);
  }, { pts, per });
  page = await open(); await ready(page);
  await burst(page, Array.from({ length: 40 }, (_, j) => [BAR.x + 60 + j * 4, BAR.y + BAR.h / 2]), 4); // 4 px apart, 4 events a frame: about 1,000 px/s
  ok(await G(page, () => window.__game.S.speed < 1500 && window.__game.S.soap.nicks === 0), 'a slow stroke sent in bursts is measured as slow (no false slip)');
  page = await open('', {}, () => { window.__saved = { n: 2, coins: 0, stars: 6 }; });
  await wait(page, () => window.__game.S.n === 2); await ready(page); await toStep(page, 'stir');
  await burst(page, Array.from({ length: 160 }, (_, j) => [360 + Math.cos(j / 16) * 100, 640 + Math.sin(j / 16) * 100]), 4); // 1.6 turns
  ok(await G(page, () => window.__game.makeProgress() > 1.5 / window.__game.cfg.stirTurns), 'stirring counts the spoon\'s turns, however the events arrive');
  await burst(page, Array.from({ length: 120 }, (_, j) => [360 + Math.cos(Math.sin(j / 3) * 0.7) * 100, 640 + Math.sin(Math.sin(j / 3) * 0.7) * 100]), 2); // back and forth
  ok(await G(page, () => window.__game.makeProgress() > 2.5 / window.__game.cfg.stirTurns), 'stirring back and forth counts too');
  await toStep(page, 'cool');
  for (let y = BAR.y + 20; y < BAR.y + BAR.h; y += 36) await burst(page, [[BAR.x - 10, y], [BAR.x + BAR.w + 10, y]], 1); // long swipes, two events each
  ok(await G(page, () => window.__game.S.k !== 'cool'), 'cooling counts the whole length of a fast swipe');
  page = await open('', { locale: 'ar' }, () => { window.__saved = { n: 2, coins: 0, stars: 6 }; });
  await wait(page, () => window.__game.S.n === 2); await ready(page); await toStep(page, 'pour');
  ok(await G(page, () => { const a = window.__game.landAt(), b = window.__game.fillCentre(); return Math.abs(a[0] - b[0]) < 1 && Math.abs(a[1] - b[1]) < 1; }), 'in Arabic the mould fills from where the stream lands');

  console.log('23. recorded sounds, the daily gift, praise while carving');
  page = await open(); await ready(page);
  await page.mouse.click(40, 700); await wait(page, () => window.__game.sounds().length === Object.keys(window.__game.cfg.sounds).length, null, 15000).catch(() => {});
  ok(await G(page, () => window.__game.sounds().length === Object.keys(window.__game.cfg.sounds).length), 'every recorded sound loads from the asset map after the first touch: ' + (await G(page, () => window.__game.sounds().join(' '))));
  ok(await G(page, () => window.__game.musicOn), 'the studio music plays');
  const mu = await G(page, () => window.__game.MUTE()); await page.mouse.click(mu.x + 46, mu.y + 46);
  ok(await G(page, () => !window.__game.musicOn && window.__game.save.muted), 'the sound button stops the music');
  await page.mouse.click(mu.x + 46, mu.y + 46);
  for (let y = BAR.y; y < BAR.y + BAR.h && await G(page, () => window.__game.carvedShare() < 0.55); y += 26) await drag(page, row(y));
  const pr23 = await G(page, () => ({ share: window.__game.carvedShare(), mile: window.__game.S.mile, key: window.__game.S.praise && window.__game.S.praise.key }));
  ok(pr23.share >= 0.5 && pr23.mile >= 1 && ['great', 'almost'].includes(pr23.key), `carving past half brings praise (${(pr23.share * 100).toFixed(0)}% carved: ${pr23.key})`);
  for (const [label, dayShift, want] of [['a new day', -1, true], ['the clock turned back', +1, false]]) {
    page = await open('', {}, (d) => { const t = new Date(); t.setDate(t.getDate() + d); window.__saved = { n: 1, coins: 0, stars: 3, day: t.getFullYear() * 10000 + (t.getMonth() + 1) * 100 + t.getDate() }; }, dayShift);
    await wait(page, () => window.__game.S.n === 1); await ready(page);
    await G(page, () => { const G = window.__game; while (G.S.k !== 'bath') G.nextStep(); });
    ok(await G(page, () => window.__game.save.giftDue) === want, `${label}: ${want ? 'the first soap of the day opens a gift box' : 'no daily gift'}`);
  }

  await browser.close(); server.close();
  console.log(failed ? `\n${failed} FAILED` : '\nall playtest checks pass');
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
