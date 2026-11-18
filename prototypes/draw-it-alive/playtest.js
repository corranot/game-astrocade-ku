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
  const open = async (extra = '') => {
    const page = await (await browser.newContext({ viewport: { width: 720, height: 1280 } })).newPage();
    page.errors = []; page.on('pageerror', (e) => page.errors.push(String(e)));
    await page.goto(base + extra); await page.waitForFunction(() => window.__game && window.__game.S && window.__frames > 3);
    return page;
  };
  const state = (page) => page.evaluate(() => { const S = window.__game.S; return { i: S.i, won: S.won, misses: S.misses, mood: S.mood, pen: !!S.pen, assisted: S.assisted, strokeLen: S.stroke ? S.stroke.length : 0 }; });
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

  console.log('2. every level: a wobbly line along the missing part wins, and the scene plays out');
  for (let n = 0; n < 5; n++) {
    await page.waitForFunction((n) => window.__game.S.i === n && window.__game.S.won < 0, n, { timeout: 8000 });
    if (n) { await page.waitForTimeout(500); await shot(page, `L${n + 1}-start`); }
    const pts = wobble(await target(page));
    await drag(page, pts.slice(0, Math.ceil(pts.length * 0.6)), false); await shot(page, `L${n + 1}-drawing`);
    await drag(page, pts.slice(Math.ceil(pts.length * 0.6) - 1), true, false); await settled(page);
    s = await state(page);
    ok(s.won >= 0 && !s.assisted && s.strokeLen > 3, `level ${n + 1} solved by the player's own line` + (s.won < 0 ? ' ' + JSON.stringify(s) : ''));
    await page.waitForTimeout(450); await shot(page, `L${n + 1}-payoff-early`);
    await page.waitForTimeout(1200); await shot(page, `L${n + 1}-payoff-late`);
  }
  ok(true, 'the next level starts by itself after each payoff');
  ok(await page.evaluate(() => !!window.__game.S.art(1)), 'level 5 shows the snail in the shell the player drew on level 2');
  console.log('2b. the chapter ends on the wall of the player\'s own pictures');
  await page.waitForFunction(() => window.__game.view === 'wall', null, { timeout: 8000 });
  const w = await page.evaluate(() => ({ cards: window.__game.wall.cards.filter((c) => c.s.stroke).length, arts: Object.keys(window.__game.save.art).length }));
  ok(w.cards === 5 && w.arts === 5, 'all five pictures hang on the wall with the stored lines');
  await page.waitForTimeout(1500); await shot(page, 'wall');
  const c0 = await page.evaluate(() => { const g = window.__game, p = g.cardAt(2); return [p.x + g.CARD.w / 2, p.y + g.CARD.h / 2]; });
  await page.mouse.click(c0[0], c0[1]); await page.waitForTimeout(100);
  ok(await page.evaluate(() => window.__game.wall.cards[2].pop > 0), 'a tap on a card replays it');
  const nx = await page.evaluate(() => { const g = window.__game, p = g.cardAt(5); return [p.x + g.CARD.w / 2, p.y + g.CARD.h / 2]; });
  await page.mouse.click(nx[0], nx[1]); await page.waitForTimeout(150);
  s = await state(page); ok(await page.evaluate(() => window.__game.view) === 'play' && s.i === 5 && s.won < 0, 'the arrow goes on to the next level');
  await page.waitForTimeout(400); await shot(page, 'after-wall');
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

  await browser.close(); server.close();
  console.log(failed ? `PLAYTEST FAIL (${failed})` : 'PLAYTEST PASS'); process.exit(failed ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
