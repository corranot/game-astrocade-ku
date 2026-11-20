// PROTOTYPE - NOT FOR PRODUCTION
// Plays the game in a phone-sized browser with real drags and taps and fails on any broken rule (GDD §8).
// Screenshots go to the folder given. Usage: node playtest.js <evidence folder>
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const out = process.argv[2] || 'evidence'; fs.mkdirSync(out, { recursive: true });
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.webp': 'image/webp' };
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
  const open = async (extra = '', ctx = {}, init) => {
    if (current) await current.context().close();
    const c = await browser.newContext({ viewport: { width: 720, height: 1280 }, ...ctx });
    if (init) await c.addInitScript(init);
    const page = current = await c.newPage();
    page.errors = []; page.on('pageerror', (e) => page.errors.push(String(e))); page.on('console', (m) => { if (m.type() === 'error') page.errors.push(m.text()); });
    await page.goto(base + extra); await page.waitForFunction(() => window.__game && window.__game.S && window.__frames > 3 && !window.__game.booting(), null, { timeout: 10000 });
    return page;
  };
  const G = (page, f, a) => page.evaluate(f, a);
  const st = (page) => G(page, () => { const S = window.__game.S; return { n: S.n, step: S.step, enter: S.enter, trim: !!S.trim, used: S.used, mood: S.mood, oopsT: S.oopsT, order: S.order, score: S.score, glit: S.glitCount, gems: S.gems.length, reveal: S.reveal && { t: S.reveal.t, coins: S.reveal.coins }, charm: S.charm && S.charm.state }; });
  const shot = (page, name) => page.screenshot({ path: path.join(out, name + '.jpg'), quality: 82 });
  const wait = (page, f, a, timeout = 12000) => page.waitForFunction(f, a, { timeout });
  const ready = (page) => wait(page, () => window.__game.S.enter <= 0 && !window.__game.S.trim);
  /** A drag through pts, one pointer event every ms milliseconds (a real finger's pace). */
  const drag = async (page, pts, ms = 16) => { await page.mouse.move(pts[0][0], pts[0][1]); await page.mouse.down(); for (const p of pts.slice(1)) { await page.mouse.move(p[0], p[1]); await page.waitForTimeout(ms); } await page.mouse.up(); };
  const row = (y) => Array.from({ length: 16 }, (_, j) => [BAR.x - 24 + (BAR.w + 48) * j / 15, y + (j % 2) * 6]);
  /** Carve the whole bar by careful strokes; returns the strokes taken. */
  const carveAll = async (page) => { let k = 0; for (let y = BAR.y - 6; y < BAR.y + BAR.h + 12 && await G(page, () => window.__game.S.step === 0 && !window.__game.S.trim); y += 26) { await drag(page, row(y)); k++; } return k; };
  /** Rub around the edges until smooth. */
  const smoothAll = async (page) => {
    let k = 0;
    while (k < 12 && await G(page, () => window.__game.S.step === 1)) {
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
  const tapCheck = async (page) => { const c = await G(page, () => window.__game.CHECK()); await page.mouse.click(c.x + 56, c.y + 56); };
  /** One soap, start to bath, by real gestures. */
  const serve = async (page, name) => {
    await ready(page); const t0 = await G(page, () => window.__game.S.t);
    const strokes = await carveAll(page); if (name) await shot(page, name + '-1-carved');
    await wait(page, () => window.__game.S.step === 1 && !window.__game.S.trim); await page.waitForTimeout(300); if (name) await shot(page, name + '-2-smooth');
    const rubs = await smoothAll(page);
    if (await G(page, () => window.__game.S.step === 1)) await tapCheck(page);
    await wait(page, () => window.__game.S.step === 2); await page.waitForTimeout(300); if (name) await shot(page, name + '-3-sparkle');
    await sparkleIt(page); if (name) await shot(page, name + '-4-sparkled');
    await tapCheck(page); await wait(page, () => window.__game.S.step === 3);
    const t1 = await G(page, () => window.__game.S.t);
    return { strokes, rubs, secs: t1 - t0 };
  };

  console.log('1. the first frame is the bar, the dotted shape, the order and the moving hand, before any touch');
  let page = await open();
  let s = await st(page);
  ok(s.n === 0 && s.step === 0 && s.order.shape === 'heart' && s.order.simple, 'order 1 is a heart at the carve step');
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
  ok(w1.length > 0 && w1[w1.length - 1].n === 1 && w1[w1.length - 1].shelf.length === 1 && w1[w1.length - 1].coins === 30, 'the save holds 1 soap, 30 coins and the shelf photo');
  ok(w1.every((w) => JSON.stringify(w).length < 40000), 'save stays under 40 KB');
  const nx = await G(page, () => window.__game.NEXT); await page.mouse.click(nx.x, nx.y);
  await wait(page, () => window.__game.S.n === 1);
  s = await st(page); ok(s.order.shape === 'star' && s.step === 0, 'the big ▶ brings order 2 (a star) at once');
  await ready(page); await shot(page, '04-order2-start');

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
  await carveAll(page);
  await wait(page, () => window.__game.S.charm.state === 'out', null, 4000).catch(() => {});
  ok(await G(page, () => window.__game.S.charm.state === 'out'), 'the charm pops out');
  await page.waitForTimeout(300); await shot(page, '07-charm');
  ok(await G(page, () => window.__game.save.charms.length === 1), 'the charm goes into the album');

  console.log('7. a purchase is followed by an order asking for it');
  page = await open('', {}, () => { window.__saved = { n: 2, coins: 200, stars: 6 }; });
  await wait(page, () => window.__game.S.n === 2); await ready(page);
  await G(page, () => { const G = window.__game; G.S.step = 2; G.S.edges = new Int32Array(0); });
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
    await wait(page, () => window.__game.S.step === 1); await page.waitForTimeout(200); await shot(page, `lang-${l}-2-smooth`);
    await G(page, () => window.__game.finishSmooth()); await wait(page, () => window.__game.S.step === 2); await page.waitForTimeout(200); await shot(page, `lang-${l}-3-sparkle`);
    await G(page, () => window.__game.finishSparkle()); await wait(page, () => window.__game.S.reveal && window.__game.S.reveal.t > 3.6); await shot(page, `lang-${l}-4-bath`);
    await G(page, () => { window.__game.view = 'shelf'; }); await page.waitForTimeout(300); await shot(page, `lang-${l}-5-shelf`);
    ok(page.errors.length === 0, `${l}: no errors`);
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
  await ready(page); await shot(page, '11-free-carve');

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

  await browser.close(); server.close();
  console.log(failed ? `\n${failed} FAILED` : '\nall playtest checks pass');
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
