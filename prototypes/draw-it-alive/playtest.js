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

(async () => {
  await new Promise((r) => server.listen(0, r));
  const base = `http://127.0.0.1:${server.address().port}/index.html?local`;
  const browser = await chromium.launch();
  let current = null; // one game page at a time: pages left open keep running and slow the frame-time checks
  const open = async (extra = '') => {
    if (current) await current.context().close();
    const page = current = await (await browser.newContext({ viewport: { width: 720, height: 1280 } })).newPage();
    page.errors = []; page.on('pageerror', (e) => page.errors.push(String(e)));
    await page.goto(base + extra); await page.waitForFunction(() => window.__game && window.__game.S && window.__frames > 3);
    return page;
  };
  const state = (page) => page.evaluate(() => { const S = window.__game.S; return { i: S.i, k: S.k, won: S.won, misses: S.misses, mood: S.mood, pen: !!S.pen, assisted: S.assisted, strokeLen: S.stroke ? S.stroke.length : 0, lines: S.lines.filter(Boolean).length }; });
  // drag through points given in game coordinates (the canvas fills the 720 x 1280 viewport)
  const drag = async (page, pts, lift = true, press = true) => { if (press) { await page.mouse.move(pts[0][0], pts[0][1]); await page.mouse.down(); } for (const p of pts.slice(1)) await page.mouse.move(p[0], p[1], { steps: 2 }); if (lift) await page.mouse.up(); };
  const target = (page) => page.evaluate(() => window.__game.target.filter((_, i) => i % 3 === 0).concat([window.__game.target[window.__game.target.length - 1]]));
  const wobble = (pts) => pts.map((p, i) => [p[0] + Math.sin(i * 1.3) * 14, p[1] + Math.cos(i * 0.9) * 14]); // a child's hand, not a ruler
  const settled = (page) => page.waitForFunction(() => !window.__game.S.pen, null, { timeout: 5000 });
  const shot = (page, name) => page.screenshot({ path: path.join(out, name + '.png') });

  console.log('1. first frame is the level itself, alive, with no input');
  let page = await open();
  let s = await state(page);
  ok(s.i === 0 && s.won < 0 && s.mood === 'wait', 'level 1 is up, nothing to tap first');
  await page.waitForTimeout(700); await shot(page, 'L1-start');

  console.log('2. every level of every chapter: wobbly lines along the missing parts win, and the scene plays out');
  for (let n = 0; n < 20; n++) {
    if (n % 5 === 0 && n > 5) { // a chapter ended (the first wall has its own checks below): its wall, then on into the next chapter
      await page.waitForFunction(() => window.__game.view === 'wall', null, { timeout: 20000 });
      const cards = await page.evaluate(() => window.__game.wall.cards.filter((c) => c.s.lines.length === window.__game.partsOf(c.s.lv).length).length);
      ok(cards === 5, `chapter ${n / 5}: all five pictures hang on its wall, every part drawn (${cards})`);
      await page.waitForTimeout(1500); await shot(page, `wall-ch${n / 5}`);
      const a = await page.evaluate(() => { const g = window.__game, p = g.cardAt(5); return [p.x + g.CARD.w / 2, p.y + g.CARD.h / 2]; });
      await page.evaluate(() => { window.__game.wall.unlocked = window.__game.wall.t; }); // the lock itself is checked in 9 and 10
      await page.mouse.click(a[0], a[1]);
    }
    await page.waitForFunction((n) => window.__game.S.i === n && window.__game.S.won < 0 && window.__game.view === 'play', n, { timeout: 20000 });
    await page.waitForTimeout(500); await shot(page, `L${n + 1}-start`);
    const parts = await page.evaluate(() => window.__game.partsOf(window.__game.S.lv).length);
    for (let k = 0; k < parts; k++) {
      const pts = wobble(await target(page));
      await drag(page, pts.slice(0, Math.ceil(pts.length * 0.6)), false); if (k === parts - 1) await shot(page, `L${n + 1}-drawing`);
      await drag(page, pts.slice(Math.ceil(pts.length * 0.6) - 1), true, false); await settled(page);
      s = await state(page);
      if (k < parts - 1) { ok(s.k === k + 1 && s.won < 0 && s.lines === k + 1, `level ${n + 1}: part ${k + 1} of ${parts} drawn, the next part is up`); await page.waitForTimeout(700); await shot(page, `L${n + 1}-part${k + 1}`); }
    }
    ok(s.won >= 0 && !s.assisted && s.lines === parts, `level ${n + 1} solved by the player's own line${parts > 1 ? 's' : ''}` + (s.won < 0 ? ' ' + JSON.stringify(s) : ''));
    await page.waitForTimeout(450); await shot(page, `L${n + 1}-payoff-early`);
    await page.waitForTimeout(1200); await shot(page, `L${n + 1}-payoff-late`);
    if (n === 4) {
      ok(await page.evaluate(() => !!window.__game.S.art(1)), 'level 5 shows the snail in the shell the player drew on level 2');
      console.log('2b. the chapter ends on the wall of the player\'s own pictures');
      await page.waitForFunction(() => window.__game.view === 'wall', null, { timeout: 20000 });
      const w = await page.evaluate(() => ({ cards: window.__game.wall.cards.filter((c) => c.s.stroke).length, arts: Object.keys(window.__game.save.art).length }));
      ok(w.cards === 5 && w.arts === 5, 'all five pictures hang on the wall with the stored lines');
      await page.waitForTimeout(1500); await shot(page, 'wall');
      const c0 = await page.evaluate(() => { const g = window.__game, p = g.cardAt(2); return [p.x + g.CARD.w / 2, p.y + g.CARD.h / 2]; });
      await page.mouse.click(c0[0], c0[1]); await page.waitForTimeout(100);
      ok(await page.evaluate(() => window.__game.wall.cards[2].pop > 0), 'a tap on a card replays it');
      const nx = await page.evaluate(() => { const g = window.__game, p = g.cardAt(5); return [p.x + g.CARD.w / 2, p.y + g.CARD.h / 2]; });
      await page.evaluate(() => { window.__game.wall.unlocked = window.__game.wall.t; });
      await page.mouse.click(nx[0], nx[1]); await page.waitForTimeout(150);
      s = await state(page); ok(await page.evaluate(() => window.__game.view) === 'play' && s.i === 5 && s.won < 0, 'the arrow goes on to the next level');
      await page.waitForTimeout(400); await shot(page, 'after-wall');
    }
  }
  const stored = await page.evaluate(() => { const g = window.__game; return [Object.keys(g.save.art).length, g.LEVELS.reduce((a, lv) => a + g.partsOf(lv).length, 0)]; });
  ok(stored[0] === stored[1] && stored[1] === 29, `every part of all 20 levels is stored: ${stored[0]} of ${stored[1]} lines`);
  ok(await page.evaluate(() => window.__game.save.stickers.length) >= 5, 'the jar has paid out stickers on the way: ' + await page.evaluate(() => JSON.stringify(window.__game.save.stickers)));
  ok(page.errors.length === 0, 'no page errors: ' + page.errors.join(' | '));

  console.log('3. a dab is ignored; a wrong line is a soft miss; the second miss on an early level is finished for the player');
  page = await open();
  await drag(page, [[300, 700], [312, 702]]); await settled(page);
  s = await state(page); ok(s.misses === 0 && s.won < 0, 'a tiny dab is not counted as a miss');
  await drag(page, [[120, 300], [300, 320], [500, 300], [620, 340]]); await settled(page);
  s = await state(page); ok(s.misses === 1 && s.won < 0 && s.mood === 'sad', 'a line in the wrong place is one miss, no fail screen');
  await page.waitForTimeout(250); await shot(page, 'L1-miss');
  await drag(page, [[120, 300], [300, 320], [500, 300], [620, 340]]); await settled(page);
  s = await state(page); ok(s.won >= 0 && s.assisted, 'second miss: the part is completed and the payoff plays');
  ok(await page.evaluate(() => window.__game.S.stars) === 1, 'a helped level earns 1 star');

  console.log('4. a finger that lifts and comes back near the line carries on');
  page = await open();
  await page.evaluate(() => window.__game.newLevel(2));
  const t = await target(page), half = Math.ceil(t.length / 2);
  await drag(page, t.slice(0, half)); await page.waitForTimeout(150);
  await drag(page, t.slice(half - 1)); await settled(page);
  s = await state(page); ok(s.won >= 0 && s.misses === 0, 'two touches joined into one line');

  console.log('4b. stars follow how well the line matches; the sound button toggles and is not a stroke');
  page = await open();
  await drag(page, await target(page)); await settled(page);
  let st = await page.evaluate(() => window.__game.S.stars); ok(st === 3, 'a line right on the part earns 3 stars (got ' + st + ')');
  await page.waitForFunction(() => window.__game.S.i === 1 && window.__game.S.won < 0, null, { timeout: 8000 });
  const m = await page.evaluate(() => window.__game.MUTE);
  await page.mouse.click(m.x + m.s / 2, m.y + m.s / 2); await page.waitForTimeout(120);
  s = await state(page); const muted = await page.evaluate(() => window.__game.save.muted);
  ok(muted === true && !s.pen && s.misses === 0, 'a tap on the sound button mutes and starts no line');
  await shot(page, 'L2-muted');

  console.log('4c. save safety: a late save never removes progress; bad stored lines are dropped; help never replaces a drawing');
  page = await open();
  const merged = await page.evaluate(() => {
    const g = window.__game; g.save.stars = { 0: 3 }; g.save.art = {};
    g.applySave({ stars: { 0: 1, 1: 2, 2: 'x', 3: 9 }, art: { 0: [[1, 2], [3, 4]], 1: [[1, 'x'], [2, 3]], 2: 'no' }, muted: false, level: 0 });
    return { stars: g.save.stars, art: Object.keys(g.save.art) };
  });
  ok(merged.stars[0] === 3 && merged.stars[1] === 2 && !merged.stars[2] && merged.stars[3] === 3, 'stars are merged by best and kept within 0-3: ' + JSON.stringify(merged.stars));
  ok(merged.art.join() === '0', 'only well-formed stored lines are kept: ' + merged.art.join());
  const before = await page.evaluate(() => { window.__game.save.art[0] = [[290, 700], [360, 690], [430, 700]]; return JSON.stringify(window.__game.save.art[0]); });
  for (let k = 0; k < 2; k++) { await drag(page, [[120, 300], [300, 320], [500, 300], [620, 340]]); await settled(page); }
  s = await state(page);
  ok(s.assisted && await page.evaluate(() => JSON.stringify(window.__game.save.art[0])) === before, 'a helped win keeps the line the player drew before');
  await page.waitForTimeout(150); await shot(page, 'L1-helped');

  console.log('4d. the wall from the middle of a level comes back to that level; the wall does not pile up canvases');
  page = await open();
  await page.evaluate(() => { const g = window.__game; for (let n = 0; n < 5; n++) g.save.art[n] = [[100, 600], [300, 620], [500, 600]]; g.newLevel(3); });
  const wb = await page.evaluate(() => window.__game.WALLB);
  await page.mouse.click(wb.x + wb.s / 2, wb.y + wb.s / 2); await page.waitForTimeout(150);
  ok(await page.evaluate(() => window.__game.view === 'wall' && window.__game.wall.next === 3), 'the wall button opens the wall and its arrow returns to the unfinished level');
  const nx2 = await page.evaluate(() => { const g = window.__game, p = g.cardAt(5); return [p.x + g.CARD.w / 2, p.y + g.CARD.h / 2]; });
  await page.mouse.click(nx2[0], nx2[1]); await page.waitForTimeout(150);
  for (let k = 0; k < 3; k++) { await page.evaluate(() => window.__game.openWall()); await page.waitForTimeout(100); }
  ok(await page.evaluate(() => window.__game.canvases) === 10, 'opening the wall again reuses its canvases (' + await page.evaluate(() => window.__game.canvases) + ')');
  await page.mouse.move(360, 640); await page.mouse.down(); await page.mouse.move(360, 900, { steps: 6 }); await page.mouse.up(); await page.waitForTimeout(100);
  ok(await page.evaluate(() => window.__game.view) === 'wall', 'a long swipe on the wall is not a tap');

  console.log('4e. the corner buttons and the jar sit on plain ground on every level, clear of every part to draw');
  page = await open();
  for (let i = 0; i < 20; i++) {
    const r = await page.evaluate((i) => {
      const g = window.__game; g.save.level = 20; g.LEVELS.forEach((lv, n) => g.partsOf(lv).forEach((_, k) => { g.save.art[g.artKey(n, k)] = g.save.art[g.artKey(n, k)] || [[100, 600], [300, 620], [500, 600]]; })); g.newLevel(i);
      const back = g.backLayer.getContext('2d'), res = {};
      for (const [name, b] of [['sound', g.MUTE], ['wall', g.WALLB], ['jar', g.JAR]]) {
        const cx = b.x + b.s / 2, cy = b.y + b.s / 2;
        let gap = Infinity; for (const p of g.partsOf(g.S.lv)) for (const q of p.target) gap = Math.min(gap, Math.hypot(q[0] - cx, q[1] - cy) - b.s / 2 - g.cfg.tolerance);
        // the scenery under the button and a margin around it must be one flat colour
        // faint ground spots are allowed; a flower or a tuft is not
        const d = back.getImageData(b.x - 14, b.y - 14, b.s + 28, b.s + 28).data, count = new Map();
        for (let k = 0; k < d.length; k += 16) { const c = d[k] + ',' + d[k + 1] + ',' + d[k + 2]; count.set(c, (count.get(c) || 0) + 1); }
        const base = [...count.entries()].sort((x, y) => y[1] - x[1])[0][0].split(',').map(Number);
        let other = 0, all = 0;
        for (let k = 0; k < d.length; k += 16) { all++; if (Math.abs(d[k] - base[0]) + Math.abs(d[k + 1] - base[1]) + Math.abs(d[k + 2] - base[2]) > 90) other++; }
        res[name] = { gap: Math.round(gap), colours: Math.round(other / all * 100) };
      }
      return res;
    }, i);
    ok(r.sound.gap > 60 && r.wall.gap > 60 && r.jar.gap > 40, `level ${i + 1}: buttons are clear of the parts (${r.sound.gap} px, ${r.wall.gap} px, jar ${r.jar.gap} px beyond the judging reach)`);
    ok(r.sound.colours <= 1 && r.wall.colours <= 1, `level ${i + 1}: no scenery under the buttons (${r.sound.colours}% and ${r.wall.colours}% of the area differs from the ground)`);
    await page.waitForTimeout(300); await shot(page, `L${i + 1}-buttons`);
  }

  console.log('4f. the wall carries on only after every picture has played in turn');
  page = await open('&cfg=' + encodeURIComponent(JSON.stringify({ cardRestSeconds: 0.5 })));
  await page.evaluate(() => { const g = window.__game; for (let n = 0; n < 5; n++) g.save.art[n] = [[100, 600], [300, 620], [500, 600]]; g.openWall(); });
  const t0 = Date.now(); let snap = null;
  while (Date.now() - t0 < 15000) {
    const v = await page.evaluate(() => { const g = window.__game; return g.view === 'wall' ? { started: g.wall.started.size, t: g.wall.t, last: Math.max(...g.wall.cards.map((c) => c.t0)) } : null; });
    if (!v) break; snap = v; await page.waitForTimeout(80);
  }
  const left = await page.evaluate(() => window.__game.view);
  ok(left === 'play' && snap && snap.started === 5, `the wall moved on after all ${snap && snap.started} pictures played`);
  ok(snap && snap.t - snap.last >= 0.5 + 1.0, `it waited for the last picture to finish and a pause (${snap && (snap.t - snap.last).toFixed(2)} s after it started)`);
  ok(Date.now() - t0 >= (5 * 0.5 + 1.2) * 1000 - 300, `and not before every turn was over (${((Date.now() - t0) / 1000).toFixed(1)} s)`);

  console.log('4g. a second run() resumes where the player was; a long line is kept whole; skipping a celebration does not fire its sounds at once');
  page = await open();
  const resumed = await page.evaluate(async () => {
    window.lib.getUserGameState = async () => ({ state: { level: 3 } });
    window.run('play'); await new Promise((r) => setTimeout(r, 300));
    window.run('play'); await new Promise((r) => setTimeout(r, 300));
    return window.__game.S.i;
  });
  ok(resumed === 3, 'after the host starts the game a second time the player is still on level 4 (got level ' + (resumed + 1) + ')');
  page = await open();
  const zig = []; for (let k = 0; k < 17; k++) zig.push(k % 2 ? [300, 702] : [420, 698]);
  await drag(page, [[290, 700], ...zig, [430, 700]]); await settled(page);
  const kept = await page.evaluate(() => { const g = window.__game, L = (p) => p.slice(1).reduce((s, q, i) => s + Math.hypot(q[0] - p[i][0], q[1] - p[i][1]), 0); return g.S.won >= 0 ? L(g.save.art[0]) / L(g.S.stroke) : -1; });
  ok(kept > 0.9, 'a long winning line is stored whole for the wall (' + Math.round(kept * 100) + '% kept)');
  page = await open();
  await page.evaluate(() => window.__game.newLevel(2)); // level 3 still has a sound due at 2.0 s and does not end the chapter
  await drag(page, await target(page)); await settled(page);
  await page.evaluate(() => { window.__osc = 0; const o = AudioContext.prototype.createOscillator; AudioContext.prototype.createOscillator = function () { window.__osc++; return o.call(this); }; });
  await page.waitForFunction(() => window.__game.S.won > 1.9, null, { timeout: 5000 });
  const oscBefore = await page.evaluate(() => window.__osc);
  await page.mouse.click(360, 400); await page.waitForTimeout(200);
  const burst = await page.evaluate((b) => window.__osc - b, oscBefore);
  ok(burst === 0, 'skipping the end of a celebration plays no leftover sounds (' + burst + ' played)');


  console.log('7. a full jar gives a surprise box; every sticker comes once; a full set turns gold; the book opens from the jar and goes back');
  page = await open('&cfg=' + encodeURIComponent(JSON.stringify({ boxAutoOpen: 0.6, boxShowSeconds: 0.6 })));
  await page.evaluate(() => { const g = window.__game; g.save.level = 1; g.save.drops = 6; g.newLevel(1); });
  await drag(page, await target(page)); await settled(page);
  await page.waitForFunction(() => window.__game.view === 'box', null, { timeout: 8000 });
  await page.waitForTimeout(250); await shot(page, 'box-closed');
  await page.mouse.click(360, 760); await page.waitForTimeout(700); await shot(page, 'box-open');
  ok(await page.evaluate(() => window.__game.save.stickers.length === 1 && window.__game.save.drops === 3), 'a tap opens the box; the sticker is kept and the jar is emptied (stars 3 stay)');
  await page.waitForFunction(() => window.__game.view === 'play' && window.__game.S.i === 2, null, { timeout: 8000 });
  ok(true, 'the game carries on to the next level after the box');
  const got = await page.evaluate(async () => {
    const g = window.__game, seen = [];
    for (let k = 0; k < 14; k++) { g.save.drops = 6; g.openBox(() => g.newLevel(2)); if (g.view === 'box') seen.push(g.gift.id); g.newLevel(2); }
    return { seen, kept: g.save.stickers.slice(), drops: g.save.drops };
  });
  const all = new Set(got.kept);
  ok(all.size === 12 && got.kept.length === 12, 'twelve boxes give twelve different stickers: ' + got.kept.join(','));
  ok(got.kept.slice(0, 6).every((id) => id < 6), 'the first set is finished before the second starts');
  ok(got.seen.length === 11, 'no box once every sticker is owned (' + got.seen.length + ' more boxes after the first)');
  await page.evaluate(() => { const g = window.__game; g.save.stickers = [0, 1, 2, 3, 4, 5, 7, 9]; g.newLevel(2); });
  const jar = await page.evaluate(() => window.__game.JAR);
  await page.mouse.click(jar.x + jar.s / 2, jar.y + jar.s / 2); await page.waitForTimeout(300);
  ok(await page.evaluate(() => window.__game.view) === 'book', 'a tap on the jar opens the sticker book');
  await shot(page, 'book');
  const bk = await page.evaluate(() => window.__game.BACK);
  await page.mouse.click(bk.x + bk.s / 2, bk.y + bk.s / 2); await page.waitForTimeout(200);
  s = await state(page); ok(await page.evaluate(() => window.__game.view) === 'play' && s.i === 2 && s.won < 0, 'the back arrow returns to the same level');

  console.log('8. on a two-part level, help on the second part keeps the first part the player drew');
  page = await open();
  await page.evaluate(() => window.__game.newLevel(10));
  await drag(page, wobble(await target(page))); await settled(page);
  const first = await page.evaluate(() => JSON.stringify(window.__game.S.lines[0]));
  for (let k = 0; k < 4; k++) { await drag(page, [[600, 1000], [650, 1100], [700, 1000]]); await settled(page); }
  s = await state(page);
  ok(s.won >= 0 && s.assisted && s.lines === 2, 'after the misses the second part is finished for the player');
  ok(await page.evaluate((f) => JSON.stringify(window.__game.S.lines[0]) === f && window.__game.S.stars === 1, first), 'the first line stays the player\'s and the level earns 1 star');
  await page.waitForTimeout(1200); await shot(page, 'L11-helped');

  console.log('9. a chapter\'s wall opens the next chapter: locked until every picture has played');
  page = await open('&cfg=' + encodeURIComponent(JSON.stringify({ cardRestSeconds: 0.4 })));
  await page.evaluate(() => { const g = window.__game; g.LEVELS.forEach((lv, n) => g.partsOf(lv).forEach((_, k) => { g.save.art[g.artKey(n, k)] = [[100, 600], [300, 620], [500, 600]]; })); g.openWall(2, 15, true); });
  await page.waitForTimeout(300); ok(await page.evaluate(() => window.__game.wall.unlocked < 0), 'the way into chapter 4 starts locked');
  await shot(page, 'wall-locked');
  await page.waitForFunction(() => window.__game.wall && window.__game.wall.unlocked >= 0, null, { timeout: 8000 });
  await page.waitForTimeout(250); await shot(page, 'wall-unlocking');
  await page.waitForFunction(() => window.__game.view === 'play', null, { timeout: 8000 });
  s = await state(page); ok(s.i === 15, 'then the game goes on into chapter 4 (level ' + (s.i + 1) + ')');
  ok(page.errors.length === 0, 'no page errors: ' + page.errors.join(' | '));


  console.log('10. fixes from the bug hunt: locked arrow, a slide still under way, drops before the save arrives, the book and a lifted finger');
  page = await open();
  await page.evaluate(() => { const g = window.__game; g.LEVELS.forEach((lv, n) => g.partsOf(lv).forEach((_, k) => { g.save.art[g.artKey(n, k)] = [[100, 600], [300, 620], [500, 600]]; })); g.openWall(1, 10, true); });
  const lk = await page.evaluate(() => { const g = window.__game, p = g.cardAt(5); return [p.x + g.CARD.w / 2, p.y + g.CARD.h / 2]; });
  await page.mouse.click(lk[0], lk[1]); await page.waitForTimeout(150);
  ok(await page.evaluate(() => window.__game.view) === 'wall', 'a tap on the padlock does not skip the wall');
  page = await open();
  const bent = await page.evaluate(() => { const g = window.__game; g.save.art = {}; g.newLevel(12); g.S.t = 5;
    g.S.morph = { k: 0, from: [[0, 0], [10, 10]], to: [[200, 700], [300, 700]] }; g.S.lines[0] = [[0, 0], [10, 10]]; g.S.done[0] = 5; g.S.k = 1; return true; });
  const tg = await target(page); await drag(page, tg); await settled(page);
  ok(await page.evaluate(() => JSON.stringify(window.__game.save.art[12].slice(-1)) === '[[300,700]]'), 'a slide still under way is stored at its end, not bent: ' + await page.evaluate(() => JSON.stringify(window.__game.save.art[12])));
  const dr = await page.evaluate(() => { const g = window.__game; g.save.drops = 0; return true; });
  page = await open();
  const merged2 = await page.evaluate(async () => { const g = window.__game; await new Promise((r) => setTimeout(r, 100)); return true; });
  await drag(page, await target(page)); await settled(page);
  const d2 = await page.evaluate(() => { const g = window.__game; g.applySave({ drops: 4 }); return g.save.drops; });
  ok(d2 === 7, 'drops won before the save arrived are added to the stored ones (4 + 3 = ' + d2 + ')');
  page = await open();
  await page.evaluate(() => { const g = window.__game; g.save.level = 3; g.newLevel(3); });
  await drag(page, [[150, 300], [400, 330], [620, 300]], true); await page.waitForTimeout(50);
  const j2 = await page.evaluate(() => window.__game.JAR); await page.mouse.click(j2.x + j2.s / 2, j2.y + j2.s / 2); await page.waitForTimeout(800);
  const bb = await page.evaluate(() => window.__game.BACK); await page.mouse.click(bb.x + bb.s / 2, bb.y + bb.s / 2); await page.waitForTimeout(800);
  s = await state(page); ok(s.misses === 0 && !s.pen, 'a line lifted just before opening the book is dropped, not judged as a miss');


  console.log('11. words: the device language is used (seven languages, others fall back to English), every text fits big enough, the globe changes it');
  for (const loc of ['en-US', 'ar-SA', 'es-MX', 'vi-VN', 'hi-IN', 'bn-BD', 'id-ID', 'fr-FR']) {
    if (current) await current.context().close();
    const ctx = await browser.newContext({ viewport: { width: 720, height: 1280 }, locale: loc });
    page = current = await ctx.newPage(); page.errors = []; page.on('pageerror', (e) => page.errors.push(String(e)));
    await page.goto(base + '&cfg=' + encodeURIComponent(JSON.stringify({ boxAutoOpen: 99 }))); await page.waitForFunction(() => window.__game && window.__game.S && window.__frames > 3);
    const want = loc === 'fr-FR' ? 'en' : loc.split('-')[0];
    const got = await page.evaluate(() => window.__game.lang);
    ok(got === want, `${loc}: the game shows ${got}`);
    if (loc === 'fr-FR') continue;
    // the smallest size any text shrinks to, with the widths the game gives it
    const small = await page.evaluate(() => {
      const g = window.__game, c = document.createElement('canvas').getContext('2d'); let worst = [99, ''];
      for (const [k, v] of Object.entries(g.cfg.strings[g.lang])) {
        const maxW = k === 'name' ? 310 : /^L/.test(k) ? 560 : 520; let px = k === 'name' ? 40 : 46;
        c.font = `bold ${px}px system-ui, 'Noto Sans', sans-serif`;
        while (px > 18 && c.measureText(v).width > maxW) { px -= 2; c.font = `bold ${px}px system-ui, 'Noto Sans', sans-serif`; }
        if (px < worst[0]) worst = [px, k];
      }
      return worst;
    });
    ok(small[0] >= 30, `${want}: every text stays 30 px or bigger (smallest ${small[0]} px, "${small[1]}")`);
    const l = want;
    await page.waitForTimeout(400); await shot(page, `lang-${l}-L1`);
    await page.evaluate(() => { const g = window.__game; g.save.level = 20; g.newLevel(10); });
    await drag(page, await target(page)); await settled(page); await page.waitForTimeout(500); await shot(page, `lang-${l}-L11-part2`);
    await drag(page, [[600, 1000], [650, 1100], [700, 1000]]); await settled(page); await page.waitForTimeout(150); await shot(page, `lang-${l}-miss`);
    await drag(page, await target(page)); await settled(page); await page.waitForTimeout(1200); await shot(page, `lang-${l}-praise`);
    await page.evaluate(() => { const g = window.__game; g.save.stickers = [0, 1, 2, 3, 4]; g.save.drops = 6; g.openBox(() => g.newLevel(3)); });
    await page.waitForTimeout(500); await shot(page, `lang-${l}-box`);
    await page.mouse.click(360, 760); await page.waitForTimeout(900); await shot(page, `lang-${l}-box-open`);
    await page.evaluate(() => { const g = window.__game; g.newLevel(3); g.openBook(); }); await page.waitForTimeout(300); await shot(page, `lang-${l}-book`);
    await page.evaluate(() => { const g = window.__game; g.LEVELS.forEach((lv, n) => g.partsOf(lv).forEach((_, k) => { g.save.art[g.artKey(n, k)] = g.partsOf(lv)[k].target.map((q) => q.slice()); })); g.openWall(0, 5, true); g.wall.unlocked = g.wall.t; });
    await page.waitForTimeout(600); await shot(page, `lang-${l}-wall`);
    ok(page.errors.length === 0, `${l}: no page errors ` + page.errors.join(' | '));
  }
  page = await open();
  await page.evaluate(() => { const g = window.__game; g.save.level = 3; g.newLevel(3); g.openBook(); });
  const lb = await page.evaluate(() => window.__game.LANGB);
  const before2 = await page.evaluate(() => window.__game.lang);
  await page.mouse.click(lb.x + lb.w / 2, lb.y + lb.h / 2); await page.waitForTimeout(150);
  const after2 = await page.evaluate(() => [window.__game.lang, window.__game.save.lang]);
  ok(after2[0] !== before2 && after2[1] === after2[0], `the globe changes the language and keeps it in the save (${before2} -> ${after2[0]})`);

  console.log('5. edit mode shows the live picture and ignores input');
  page = await open('&mode=edit');
  await drag(page, await target(page)); await page.waitForTimeout(900);
  s = await state(page); ok(s.won < 0 && !s.pen, 'drawing does nothing in edit mode');

  console.log('6. frame rate with the processor slowed four times');
  page = await open();
  const cdp = await page.context().newCDPSession(page); await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await drag(page, wobble(await target(page))); await settled(page);
  const times = await page.evaluate(() => new Promise((done) => { const d = []; let last = performance.now(); const tick = (now) => { d.push(now - last); last = now; d.length < 150 ? requestAnimationFrame(tick) : done(d); }; requestAnimationFrame(tick); }));
  times.sort((a, b) => a - b); const med = times[75], p95 = times[142];
  console.log(`  frame time median ${med.toFixed(1)} ms, 95th ${p95.toFixed(1)} ms (during the payoff with confetti)`);
  ok(med <= 22, 'median frame time at 4x slowdown is 22 ms or less');
  await page.evaluate(() => { const g = window.__game; for (let n = 0; n < 5; n++) g.save.art[n] = g.save.art[n] || [[100, 600], [300, 620], [500, 600]]; g.openWall(); });
  const wt = await page.evaluate(() => new Promise((done) => { const d = []; let last = performance.now(); const tick = (now) => { d.push(now - last); last = now; d.length < 150 ? requestAnimationFrame(tick) : done(d); }; requestAnimationFrame(tick); }));
  wt.sort((a, b) => a - b);
  console.log(`  wall frame time median ${wt[75].toFixed(1)} ms, 95th ${wt[142].toFixed(1)} ms`);
  ok(wt[75] <= 22, 'the wall runs at a median of 22 ms or less at 4x slowdown');

  await browser.close(); server.close();
  console.log(failed ? `PLAYTEST FAIL (${failed})` : 'PLAYTEST PASS'); process.exit(failed ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
