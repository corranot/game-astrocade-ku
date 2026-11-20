// PROTOTYPE - NOT FOR PRODUCTION
// Plays the game in a phone-sized browser and fails on any broken rule. Screenshots go to the folder given.
// Usage: node playtest.js <evidence folder>
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const out = process.argv[2] || 'evidence'; fs.mkdirSync(out, { recursive: true });
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json' };
const server = http.createServer((q, r) => {
  const f = path.join(__dirname, decodeURIComponent(q.url.split('?')[0]).replace(/^\/$/, '/index.html'));
  fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); } else { r.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' }); r.end(d); } });
});
let failed = 0;
const ok = (cond, what) => { console.log((cond ? '  ok  ' : '  FAIL ') + what); if (!cond) failed++; };
const LANGS = ['en', 'ar', 'es', 'vi', 'hi', 'bn', 'id'];

(async () => {
  await new Promise((r) => server.listen(0, r));
  const base = `http://127.0.0.1:${server.address().port}/index.html?local`;
  const browser = await chromium.launch();
  let current = null; // one game page at a time: pages left open keep running and slow the frame checks
  const open = async (extra = '', ctx = {}) => {
    if (current) await current.context().close();
    const page = current = await (await browser.newContext({ viewport: { width: 720, height: 1280 }, ...ctx })).newPage();
    page.errors = []; page.on('pageerror', (e) => page.errors.push(String(e))); page.on('console', (m) => { if (m.type() === 'error') page.errors.push(m.text()); });
    await page.goto(base + extra); await page.waitForFunction(() => window.__game && window.__game.S && window.__frames > 3);
    return page;
  };
  const G = (page, f, a) => page.evaluate(f, a);
  const st = (page) => G(page, () => { const S = window.__game.S; return { n: S.n, step: S.step, rinse: S.rinse, used: S.used, enter: S.enter, reveal: S.reveal, stars: S.stars, placed: S.placed.length, sel: S.sel, order: S.order, eek: S.eek }; });
  const shot = (page, name) => page.screenshot({ path: path.join(out, name + '.jpg'), quality: 82 });
  const waitStep = (page, n, timeout = 9000) => page.waitForFunction((n) => window.__game.S.step === n && window.__game.S.enter === 0, n, { timeout });
  const swipe = async (page, pts) => { await page.mouse.move(pts[0][0], pts[0][1]); await page.mouse.down(); for (const p of pts.slice(1)) await page.mouse.move(p[0], p[1], { steps: 3 }); await page.mouse.up(); };
  const row = (y, x0 = 60, x1 = 660) => Array.from({ length: 13 }, (_, j) => [x0 + (x1 - x0) * j / 12, y + Math.sin(j) * 30]);
  /** Rub until the rinse starts; returns the swipes it took. */
  const wash = async (page) => { let k = 0; while (k < 40 && await G(page, () => window.__game.S.step === 0 && window.__game.S.rinse < 0)) { await swipe(page, row(300 + (k % 8) * 85)); k++; } return k; };
  /** Snip straight along the dotted line. */
  const cut = async (page, dy = -6) => { let k = 0; while (k < 8 && await G(page, () => window.__game.S.step === 1)) { const y = await G(page, () => window.__game.guide()[0][1]); await swipe(page, row(y + dy, 50, 670).map((p) => [p[0], y + dy])); k++; } return k; };
  /** Tap the pot of colour c (paging if needed), then paint every point that wants c. */
  const pickColour = async (page, c) => {
    for (let tries = 0; tries < 3; tries++) {
      const j = await G(page, (c) => window.__game.pageItems().items.findIndex((it) => it.k === 'col' && it.id === c), c);
      if (j >= 0) { const [x, y] = await G(page, (j) => window.__game.slotXY(j), j); await page.mouse.click(x, y); return true; }
      const [x, y] = await G(page, () => window.__game.slotXY(11)); await page.mouse.click(x, y);
    }
    return false;
  };
  const dye = async (page) => {
    const o = (await st(page)).order; let k = 0;
    while (k < 30 && await G(page, () => window.__game.S.step === 2)) {
      for (const c of o.cols) {
        await pickColour(page, c);
        const pts = await G(page, (c) => { const G = window.__game, out = []; for (const s of G.S.hair.strands) for (let i = 1; i <= s.len; i++) if (G.wantedAt(s, i) === c && (s.col[i] !== c || !s.mark[i])) out.push([Math.round(s.x[i]), Math.round(s.y[i])]); const f = out.filter((p) => p[1] < G.TRAY_Y - 10), k = Math.max(1, Math.ceil(f.length / 40)); return f.filter((_, i) => i % k === 0); }, c);
        if (pts.length) await swipe(page, pts.length > 1 ? pts : [pts[0], [pts[0][0] + 4, pts[0][1] + 4]]);
        if (!await G(page, () => window.__game.S.step === 2)) break;
      }
      k++;
      if (k > 12 && await G(page, () => window.__game.dyeShare() >= window.__game.cfg.dyeCheckAt)) { const c = await G(page, () => window.__game.CHECK); await page.mouse.click(c.x + 56, c.y + 56); }
    }
    return k;
  };
  const dry = async (page) => { await page.mouse.move(360, 440); await page.mouse.down(); await page.waitForFunction(() => window.__game.S.step !== 3, null, { timeout: 9000 }); await page.mouse.up(); };
  const deco = async (page, want = true) => {
    const j = await G(page, (want) => window.__game.pageItems().items.findIndex((it) => !it.locked && (want ? it.id === window.__game.S.order.acc : it.id !== window.__game.S.order.acc)), want);
    const [x, y] = await G(page, (j) => window.__game.slotXY(j), j); await page.mouse.click(x, y); await page.waitForTimeout(300);
    const c = await G(page, () => window.__game.CHECK); await page.mouse.click(c.x + 56, c.y + 56);
  };
  /** One customer, start to reveal, by real gestures. */
  const serve = async (page, name, decoWanted = true) => {
    await waitStep(page, 0); const w = await wash(page); if (name) await shot(page, name + '-1-wash');
    await waitStep(page, 1); await page.waitForTimeout(700); if (name) await shot(page, name + '-2-cut-line');
    const c = await cut(page); await waitStep(page, 2); await page.waitForTimeout(300); if (name) await shot(page, name + '-3-dye-tray');
    const d = await dye(page); await waitStep(page, 3); if (name) await shot(page, name + '-4-dry');
    await dry(page); await waitStep(page, 4); await page.waitForTimeout(400); if (name) await shot(page, name + '-5-deco');
    await deco(page, decoWanted); await page.waitForFunction(() => window.__game.S.step === 5);
    return { w, c, d };
  };

  console.log('1. the first frame is the customer, alive, with the hand, before any touch');
  let page = await open();
  let s = await st(page);
  ok(s.n === 0 && s.step === 0 && s.enter === 0, 'customer 1 is in the chair, wash step, nothing to tap first');
  ok(await G(page, () => window.__game.handShown()), 'the helper hand shows the rub at once');
  const tip0 = await G(page, () => window.__game.S.hair.strands[5].x[20]); await page.waitForTimeout(600);
  ok(Math.abs(tip0 - await G(page, () => window.__game.S.hair.strands[5].x[20])) > 0.3, 'the hair sways with no input');
  await shot(page, 'first-frame');
  const words = await G(page, () => [window.__game.S.order.cols[0], window.__game.S.order.acc, window.__game.S.order.cut]);
  ok(words[0] === 1 && words[1] === 'bow' && words[2] === 1, 'the first order is pink, a bow, medium length');

  console.log('2. customer 1 by real gestures: five steps, each its own gesture, then the reveal');
  const t0 = Date.now(); const counts = await serve(page, 'c1');
  ok(counts.w <= 8, `the wash needs a few swipes, not a chore (${counts.w})`);
  ok(counts.c <= 3, `one or two snips along the line finish the cut (${counts.c})`);
  s = await st(page);
  ok(s.stars === 3, `following the order gives 3 stars (${s.stars})`);
  await page.waitForTimeout(250); await shot(page, 'c1-6-reveal-flash'); await page.waitForTimeout(1300); await shot(page, 'c1-7-reveal');
  let sv = await G(page, () => JSON.parse(JSON.stringify(window.__game.save)));
  ok(sv.n === 1 && sv.coins === 30 && sv.stars === 3 && sv.wall.length === 1, 'save: 1 customer, 30 coins, 3 stars, 1 photo');
  console.log(`     (customer 1 took ${((Date.now() - t0) / 1000).toFixed(1)} s of scripted play)`);
  ok(page.errors.length === 0, 'no page errors: ' + page.errors.join(' | '));

  console.log('3. the next customer walks in by themselves; a tap after the stars skips the wait');
  await page.waitForFunction(() => window.__game.S.n === 1, null, { timeout: 8000 });
  await page.waitForTimeout(600); s = await st(page);
  ok(s.n === 1 && s.step === 0 && s.order.type === 'bunny', 'customer 2 (bunny) is in the chair');
  ok(!await G(page, () => window.__game.handShown()), 'the hand stays away after the first customer until the player waits');
  await page.waitForTimeout(4300); ok(await G(page, () => window.__game.handShown()), 'after 4 s idle the hand comes back');
  await shot(page, 'c2-start');
  await serve(page, null);
  await page.waitForFunction(() => window.__game.S.reveal > 1.3); await page.mouse.click(360, 600); await page.waitForTimeout(150);
  ok((await st(page)).n === 2, 'a tap after the stars brings the next customer at once');

  console.log('4. the wall: photos, a big photo on tap, the language button, back');
  await page.mouse.click(552, 68); await page.waitForTimeout(400);
  ok(await G(page, () => window.__game.view === 'wall' && window.__game.photos === 2), 'the wall shows 2 photos');
  await shot(page, 'wall');
  const cell = await G(page, () => window.__game.cellAt(0)); await page.mouse.click(cell[0] + 100, cell[1] + 120); await page.waitForTimeout(350); await shot(page, 'wall-big');
  await page.mouse.click(360, 1150); await page.waitForTimeout(100);
  const L = await G(page, () => window.__game.LANGB); await page.mouse.click(L.x + 46, L.y + 46); await page.waitForTimeout(150);
  ok(await G(page, () => window.__game.lang === 'ar' && window.__game.save.lang === 'ar'), 'the globe changes the language and keeps it (en -> ar)');
  await shot(page, 'wall-ar');
  const B = await G(page, () => window.__game.BACK); await page.mouse.click(B.x + 60, B.y + 60); await page.waitForTimeout(150);
  ok(await G(page, () => window.__game.view === 'play'), 'back returns to the chair');
  ok(page.errors.length === 0, 'no page errors: ' + page.errors.join(' | '));

  console.log('5. over-cutting: "eek", the strand counts half, the result is still celebrated');
  page = await open();
  await wash(page); await waitStep(page, 1); await page.waitForTimeout(600);
  const y = await G(page, () => window.__game.guide()[0][1]);
  await swipe(page, row(y - 140, 50, 670).map((p) => [p[0], y - 140]));
  s = await st(page); ok(s.eek > 0, 'a cut far above the line makes the customer say eek');
  await shot(page, 'eek');
  ok(await G(page, () => window.__game.S.hair.strands.some((q) => q.over)), 'the strands cut too short are marked');
  await cut(page); // the strands rooted too low to reach still need the line
  await waitStep(page, 2); await dye(page); await waitStep(page, 3); await dry(page); await waitStep(page, 4); await deco(page, false);
  await page.waitForFunction(() => window.__game.S.step === 5); s = await st(page);
  ok(s.stars >= 1 && s.stars < 3, `a short cut and the wrong accessory give fewer stars, never zero (${s.stars})`);

  console.log('6. coins: a locked dye shows its price; too few coins only wiggles; enough coins buy it, and the next order asks for it');
  page = await open();
  await G(page, () => { window.__game.save.coins = 10; });
  await wash(page); await waitStep(page, 1); await cut(page); await waitStep(page, 2);
  const lockedAt = async () => { for (let pg = 0; pg < 3; pg++) { const j = await G(page, () => window.__game.pageItems().items.findIndex((it) => it.locked)); if (j >= 0) return j; const [x, yy] = await G(page, () => window.__game.slotXY(11)); await page.mouse.click(x, yy); } return -1; };
  let j = await lockedAt(); ok(j >= 0, 'the tray has a locked dye on page 2');
  await shot(page, 'tray-page2');
  let [lx, ly] = await G(page, (j) => window.__game.slotXY(j), j); await page.mouse.click(lx, ly);
  ok(await G(page, () => window.__game.save.colors.length === 0 && window.__game.save.coins === 10), 'with 10 coins nothing is bought');
  await G(page, () => { window.__game.save.coins = 60; });
  const id = await G(page, (j) => window.__game.pageItems().items[j].id, j);
  await page.mouse.click(lx, ly); await page.waitForTimeout(200);
  ok(await G(page, (id) => window.__game.save.colors.includes(id) && window.__game.save.coins === 10 && window.__game.S.sel === id, id), 'with 60 coins the dye is bought (50), and picked');
  await shot(page, 'bought');
  ok(await G(page, () => window.__game.price()) === 60, 'the next unlock costs 10 more');
  await dye(page); await waitStep(page, 3); await dry(page); await waitStep(page, 4); await deco(page); await page.waitForFunction(() => window.__game.S.reveal > 1.3);
  await page.mouse.click(360, 600); await page.waitForFunction(() => window.__game.S.n === 1);
  ok((await st(page)).order.cols[0] === id, 'the next order asks for the dye just bought');

  console.log('7. two colours from customer 4: the order card shows both, the tray puts them first');
  page = await open();
  await G(page, () => { window.__game.save.n = 3; window.__game.newCustomer(3, false); });
  s = await st(page); ok(s.order.cols.length === 2, 'customer 4 wants two colours: ' + s.order.cols);
  await wash(page); await waitStep(page, 1); await cut(page); await waitStep(page, 2);
  const first2 = await G(page, () => window.__game.pageItems().items.slice(0, 2).map((it) => it.id));
  ok(first2[0] === s.order.cols[0] && first2[1] === s.order.cols[1], 'the two wanted dyes are the first two pots');
  await page.waitForTimeout(400); await shot(page, 'two-tone-tray');
  await dye(page); await waitStep(page, 3); await page.waitForTimeout(300); await shot(page, 'two-tone-dyed');
  await dry(page); await waitStep(page, 4); await deco(page); await page.waitForFunction(() => window.__game.S.step === 5);
  ok((await st(page)).stars === 3, 'painting both colours where the card shows them gives 3 stars');

  console.log('8. every customer and length looks right (a full-size shot of each)');
  for (let n = 0; n < 4; n++) {
    page = await open();
    await G(page, (n) => { window.__game.newCustomer(n + 4, false); }, n);
    await page.waitForTimeout(900); await shot(page, `look-customer${n}-messy`);
    await wash(page); await waitStep(page, 1); await page.waitForTimeout(900); await shot(page, `look-customer${n}-cut-line${(await st(page)).order.cut}`);
    await cut(page); await waitStep(page, 2); await dye(page); await waitStep(page, 3); await dry(page); await waitStep(page, 4); await deco(page);
    await page.waitForFunction(() => window.__game.S.reveal > 1.5); await shot(page, `look-customer${n}-done`);
  }

  console.log('9. taps only, quick taps, and 600 seeded random touches never break it');
  page = await open();
  for (let k = 0; k < 40; k++) await page.mouse.click(60 + (k * 97) % 600, 280 + (k * 131) % 900);
  ok(page.errors.length === 0, 'tapping everywhere: no errors');
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let k = 0; k < 600; k++) {
    const x = rnd() * 720, yy = rnd() * 1280;
    if (rnd() < 0.5) await page.mouse.click(x, yy); else await swipe(page, [[x, yy], [x + (rnd() - 0.5) * 400, yy + (rnd() - 0.5) * 400], [rnd() * 720, rnd() * 1280]]);
  }
  await page.waitForTimeout(300);
  s = await st(page);
  ok(page.errors.length === 0, `600 random touches: no errors (customer ${s.n + 1}, step ${s.step})`);
  ok(await G(page, () => { const S = window.__game.S; return S.hair.strands.every((q) => Array.from(q.x.subarray(0, q.len + 1)).every(Number.isFinite)); }), 'every hair point is still a number');
  ok(await G(page, () => window.__game.parts) <= 200, 'particles stay under their cap');

  console.log('10. edit mode draws the customer, takes no input, saves nothing');
  page = await open('&mode=edit');
  await page.mouse.click(360, 450); await swipe(page, row(450)); await page.waitForTimeout(300);
  s = await st(page); ok(s.step === 0 && !s.used, 'edit mode: touches change nothing');
  await shot(page, 'edit-mode');

  console.log('11. save: written only after the stored save was read, merged with play made before it, bad saves ignored');
  if (current) await current.context().close();
  { const ctx = await browser.newContext({ viewport: { width: 720, height: 1280 } }); await ctx.addInitScript(() => { window.__slowSave = true; }); page = current = await ctx.newPage(); page.errors = []; page.on('pageerror', (e) => page.errors.push(String(e))); await page.goto(base); await page.waitForFunction(() => window.__game && window.__game.S && window.__frames > 3); }
  ok(await G(page, async () => {
    const G = window.__game;
    G.reveal(); // a customer finished before the read came back
    const writes = window.__writes || [], before = writes.length;
    window.__resolveSave({ state: { n: 5, coins: 120, stars: 14, colors: [13, 99, 'x'], acc: ['heart', 'bad'], wall: [{ t: 'cat', h: 'bbb,ccc', a: ['bow'], s: 3 }, { t: 'dragon', h: 'b', a: [], s: 3 }], lang: 'es', muted: true } });
    await new Promise((r) => setTimeout(r, 50));
    const s = G.save;
    return before === 0 && (window.__writes || []).length >= 1 && s.n === 6 && s.coins === 120 + G.S.gained && s.colors.join() === '13' && s.acc.join() === 'heart' && s.wall.length === 2 && s.lang === 'es' && s.muted === true;
  }), 'nothing written before the read; then merged: customers, coins, owned items, good photos only, language, mute');
  ok(await G(page, () => { window.__game.applySave({ n: 'x', coins: -5, wall: 'no' }); return true; }), 'a broken save does not throw');

  console.log('12. a second run() keeps one game: no doubled input, the customer kept');
  page = await open();
  await wash(page); await waitStep(page, 1);
  await G(page, () => { window.run('play'); });
  await page.waitForTimeout(200);
  ok((await st(page)).step === 1, 'the customer and step survive a second run()');
  await cut(page); ok((await st(page)).step === 2 && page.errors.length === 0, 'input still works once, no errors');

  console.log('13. layout: nothing important overlaps; nothing tappable in the bottom 15% (the sign-in sheet)');
  page = await open();
  const boxes = await G(page, () => { const G = window.__game, b = (o) => [o.x, o.y, o.x + o.s, o.y + o.s]; return { mute: b(G.MUTE), wall: b(G.WALLB), check: b(G.CHECK), next: b(G.NEXT), back: b(G.BACK), lang: b(G.LANGB), order: [G.ORDER.x, G.ORDER.y, G.ORDER.x + G.ORDER.w, G.ORDER.y + G.ORDER.h], coins: [22, 22, 232, 102], stars: [246, 22, 416, 102], steps: [112, 126, 608, 206], trayLow: G.slotXY(11)[1] + 54, cells: G.cellAt(8)[1] + G.CELL.h }; });
  const hit = (a, c) => a[0] < c[2] && c[0] < a[2] && a[1] < c[3] && c[1] < a[3];
  const pairs = [['mute', 'wall'], ['coins', 'stars'], ['stars', 'wall'], ['steps', 'order'], ['steps', 'coins'], ['check', 'order'], ['order', 'mute']];
  for (const [a, c] of pairs) ok(!hit(boxes[a], boxes[c]), `${a} and ${c} do not overlap`);
  for (const k of ['check', 'next', 'back']) ok(boxes[k][3] <= 1088, `${k} button ends above the bottom 15% (${boxes[k][3]})`);
  ok(boxes.trayLow <= 1088, `the tray's lowest slot ends above the bottom 15% (${boxes.trayLow})`);
  ok(boxes.cells <= 950, 'the wall grid ends above the back button');

  console.log('14. seven languages: the device language is picked; every prompt fits; screens per language');
  for (const l of LANGS) {
    page = await open('', { locale: l === 'ar' ? 'ar-SA' : l });
    ok(await G(page, () => window.__game.lang) === l, `device language ${l} is used`);
    await page.waitForTimeout(500); await shot(page, `lang-${l}-wash`);
    await wash(page); await waitStep(page, 1); await page.waitForTimeout(500); await shot(page, `lang-${l}-cut`);
    const fit = await G(page, () => { const G = window.__game, c = document.createElement('canvas').getContext('2d'); return ['wash', 'rinse', 'cut', 'dye', 'dry', 'deco', 'eek', 'wall'].map((k) => { let px = 42; c.font = `bold ${px}px system-ui`; while (px > 18 && c.measureText(G.T(k)).width > 420) { px -= 2; c.font = `bold ${px}px system-ui`; } return [k, px]; }).filter(([, px]) => px < 26); });
    ok(fit.length === 0, `${l}: every prompt fits at 26 px or more ${JSON.stringify(fit)}`);
  }
  ok(await G(page, () => { const G = window.__game; return Object.keys(G.cfg.strings).every((l) => Object.keys(G.cfg.strings.en).every((k) => G.cfg.strings[l][k])); }), 'every language has every string');

  console.log('15. smoothness on a slow phone (CPU slowed 4x): drying, the heaviest moment');
  page = await open();
  const cdp = await page.context().newCDPSession(page); await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await wash(page); await waitStep(page, 1, 20000); await cut(page); await waitStep(page, 2, 20000); await dye(page); await waitStep(page, 3, 20000);
  await page.mouse.move(360, 440); await page.mouse.down();
  const ms = await G(page, () => new Promise((r) => { const t = []; let l = performance.now(); const f = (n) => { t.push(n - l); l = n; if (t.length < 90) requestAnimationFrame(f); else r(t.sort((a, b) => a - b)[45]); }; requestAnimationFrame(f); }));
  await page.mouse.up();
  console.log(`     median frame ${ms.toFixed(1)} ms at 4x slower CPU (quality level ${await G(page, () => window.__game.quality)})`);
  ok(ms < 34, 'median frame under 34 ms (30 FPS) even at 4x slower CPU');

  console.log('16. platform rules');
  const src = ['game.js', 'hair.js', 'art.js', 'index.html'].map((f) => fs.readFileSync(path.join(__dirname, f), 'utf8')).join('\n');
  ok(!/localStorage|sessionStorage|document\.cookie|alert\(|confirm\(|window\.open|navigator\.vibrate|XMLHttpRequest|WebSocket/.test(src), 'no browser storage, alert, popups, raw vibration or network');
  ok((src.match(/fetch\(/g) || []).length === 1 && /if \(DEBUG\)[\s\S]*fetch\('game_config.json'\)/.test(src), 'the only fetch is the local preview loading its config');
  ok(/window\.run = run;/.test(src) && /showGameParameters/.test(src), 'window.run is assigned and the settings panel is offered');
  const conf = JSON.parse(fs.readFileSync(path.join(__dirname, 'game_config.json'), 'utf8'));
  ok(conf.persistent_storage_config && conf.persistent_storage_config.leaderboard && conf.persistent_storage_config.leaderboard.sort_ascending === false, 'the leaderboard is declared (highest first)');

  await browser.close(); server.close();
  console.log(failed ? `PLAYTEST FAIL (${failed})` : 'PLAYTEST PASS'); process.exit(failed ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
