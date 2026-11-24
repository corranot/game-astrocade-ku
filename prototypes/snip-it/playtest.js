// PROTOTYPE - NOT FOR PRODUCTION
// Playtest: serves this folder and plays Snip It like a child does: looks before touching, swipes a rope, swipes
// again too early, taps beside a rope, wins, goes on, plays again, comes back with a save (old, late, failing),
// in all 8 languages, in edit mode, after a second run(), and with 600 random touches. Screens go to the out folder.
// Usage: node playtest.js <out folder>   (Playwright; SwiftShader GPU, so FPS here is not a phone's)
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const out = process.argv[2] || fs.mkdtempSync(path.join(require('os').tmpdir(), 'snip-'));
const types = { '.js': 'text/javascript', '.html': 'text/html', '.json': 'application/json' };
const serve = () => http.createServer((q, s) => {
  const f = path.join(__dirname, q.url.split('?')[0] === '/' ? 'index.html' : q.url.split('?')[0]);
  fs.readFile(f, (e, d) => { if (e) { s.writeHead(404); return s.end(); } s.writeHead(200, { 'content-type': types[path.extname(f)] || 'text/plain' }); s.end(d); });
}).listen(0);
const fails = [];
const check = (ok, msg) => { console.log((ok ? 'ok   ' : 'FAIL ') + msg); if (!ok) fails.push(msg); };
const GPU = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'];
const LANGS = { en: 'en-US', id: 'id-ID', es: 'es-ES', hi: 'hi-IN', ar: 'ar-SA', vi: 'vi-VN', bn: 'bn-BD', pt: 'pt-BR' };

async function open(browser, port, q = '', opts = {}) {
  const page = await browser.newPage({ viewport: { width: 360, height: 640 }, deviceScaleFactor: 2, locale: opts.locale || 'en-US' });
  const errors = []; page.on('pageerror', (e) => errors.push(e.message)); page.on('console', (m) => { if (m.type() === 'error' && !/favicon/.test(m.text())) errors.push(m.text()); });
  if (opts.init) await page.addInitScript(opts.init);
  await page.goto(`http://localhost:${port}/?local${q}`);
  await page.waitForFunction(() => window.__game && window.__game.W && document.fonts.status === 'loaded', null, { timeout: 40000 });
  return { page, errors };
}
const g = (page, fn, a) => page.evaluate(fn, a);
const shot = (page, n) => page.screenshot({ path: path.join(out, n + '.jpg'), type: 'jpeg', quality: 80 });
const ropeXY = async (page, id) => g(page, (id) => { const p = __game.ropeAt(id); return __game.client(p[0], p[1]); }, id);
async function swipe(page, id) { const [x, y] = await ropeXY(page, id); await page.mouse.move(x - 40, y); await page.mouse.down(); await page.mouse.move(x + 40, y, { steps: 5 }); await page.mouse.up(); }
const idle = (page) => page.waitForFunction(() => !__game.busy, null, { timeout: 9000 });
const ids = (page, kind) => g(page, (kind) => __game.level.items.filter((x) => x.result === kind).map((x) => x.id), kind);
const cutN = (page) => g(page, () => __game.W.ropes.filter((r) => r.cut).length);
async function winLevel(page) { const [id] = await ids(page, 'win'); await swipe(page, id); await page.waitForFunction(() => !document.querySelector('#bar').hidden, null, { timeout: 9000 }); }

async function main() {
  fs.mkdirSync(out, { recursive: true });
  const server = serve(), port = server.address().port;
  const browser = await chromium.launch({ args: GPU });

  // ---- 1. before any touch: alive, a hint, nothing saved
  {
    const { page, errors } = await open(browser, port);
    const p0 = await g(page, () => __game.W.bodies.map((b) => __game.W.pts[b.p].x));
    await page.waitForTimeout(1200);
    const st = await g(page, () => ({ x: __game.W.bodies.map((b) => __game.W.pts[b.p].x), hand: !document.querySelector('#hand').hidden, prompt: document.querySelector('#prompt').textContent, writes: (window.__writes || []).length, touched: __game.touched, buzz: (window.__buzz || []).length }));
    check(st.x.some((x, i) => Math.abs(x - p0[i]) > 0.002), 'the stage moves before any touch');
    check(st.hand && st.prompt === 'Snip the rope!', 'a swipe hint and a three-word prompt show');
    check(st.writes === 0 && !st.touched && st.buzz === 0, 'nothing is saved or counted before a touch');
    await shot(page, 'en-1-start');

    // ---- 2. the first swipe is already the action; a second swipe during the ending is ignored
    const [gagA, gagB] = await ids(page, 'gag'), [win] = await ids(page, 'win');
    await swipe(page, gagA);
    let s = await g(page, () => ({ busy: __game.busy, hand: document.querySelector('#hand').hidden, prompt: document.querySelector('#prompt').hidden, buzz: window.__buzz.slice() }));
    check(s.busy === gagA && (await cutN(page)) === 1, 'the first swipe cuts the rope it crosses');
    check(s.hand && s.prompt, 'the hint and the words leave after the first cut');
    check(s.buzz.includes('tick') && s.buzz.includes('tap'), 'touch and cut both buzz');
    await swipe(page, win);
    check((await cutN(page)) === 1, 'a swipe during an ending cuts nothing');
    await page.waitForTimeout(250); await shot(page, 'en-2-gag-fall');
    await idle(page);
    s = await g(page, () => ({ gags: __game.save.gags.slice(), won: __game.won, bar: !document.querySelector('#bar').hidden, stars: __game.save.stars.slice(), buzz: window.__buzz.slice(), toast: !document.querySelector('#toast').hidden }));
    check(s.gags.length === 1 && !s.won && !s.bar && !s.stars[0], 'a wrong rope gives a sticker, no stars, no bar and no penalty');
    check(s.buzz.includes('warning') && s.toast, 'the gag buzzes and shows the new sticker');
    await shot(page, 'en-3-gag-sticker');

    // ---- 3. a tap beside a rope cuts it too
    const [x, y] = await ropeXY(page, gagB);
    await page.mouse.click(x + 14, y);
    check((await cutN(page)) === 2, 'a tap beside a rope cuts it');
    await idle(page);

    // ---- 4. the right rope: stars, bar, score, save
    const t0 = await g(page, () => __game.clock);
    await swipe(page, win);
    await page.waitForFunction(() => !document.querySelector('#bar').hidden, null, { timeout: 9000 });
    s = await g(page, () => ({ t: __game.clock, won: __game.won, stars: __game.save.stars[0], gags: __game.save.gags.length, scores: window.__scores, bar: document.querySelector('#barGags').textContent, buzz: window.__buzz.slice() }));
    check(s.won && s.stars === 3 && s.gags === 3, 'the right rope wins three stars and the third sticker');
    check(s.t - t0 < 3.2, `the win bar is up ${(s.t - t0).toFixed(2)} s after the cut`);
    check(s.scores[s.scores.length - 1] === 6, 'the score (stars + stickers) goes to the leaderboard');
    check(!/❔/.test(s.bar) && s.buzz.includes('success'), 'the bar shows all three stickers; the win buzzes');
    await page.waitForTimeout(2300);
    const w = await g(page, () => window.__writes[window.__writes.length - 1]);
    check(w && w.gags.length === 3 && w.stars[0] === 3 && w.learned, 'the save holds the stars and stickers');
    await shot(page, 'en-4-win-bar');

    // ---- 5. again keeps what was found; next goes on
    await page.click('#again', { force: true });
    s = await g(page, () => ({ i: __game.index, cut: __game.W.ropes.filter((r) => r.cut).length, gags: __game.save.gags.length, bar: document.querySelector('#bar').hidden, hand: document.querySelector('#hand').hidden }));
    check(s.i === 0 && s.cut === 0 && s.gags === 3 && s.bar && s.hand, 'AGAIN resets the level, keeps the stickers, shows no hint to a player who knows');
    await winLevel(page); await page.click('#next', { force: true });
    check((await g(page, () => __game.index)) === 1, 'NEXT opens level 2');
    await page.waitForTimeout(600); await shot(page, 'en-5-level2');
    await winLevel(page); await page.click('#next', { force: true }); await page.waitForTimeout(600); await shot(page, 'en-6-level3');
    await winLevel(page); await page.waitForTimeout(400); await shot(page, 'en-7-level3-win');
    await page.click('#next', { force: true });
    check((await g(page, () => __game.index)) === 3, 'NEXT keeps going to level 4');
    await g(page, () => __game.loadLevel(__game.total - 1)); await winLevel(page); await page.click('#next', { force: true });
    check(await g(page, () => __game.index === 0 && !document.querySelector('#sheet').hidden), 'after the last level the map opens, back at the first');
    await page.click('#close', { force: true });

    // ---- 6. buttons are not cuts; mute is kept
    await page.click('#mute', { force: true });
    s = await g(page, () => ({ muted: __game.save.muted, cut: __game.W.ropes.filter((r) => r.cut).length, icon: document.querySelector('#mute').textContent }));
    check(s.muted && s.cut === 0 && s.icon === '🔇', 'the sound button mutes and cuts nothing');
    // ---- 6b. the level map and the sticker book
    await page.click('#lvl', { force: true });
    s = await g(page, () => ({ open: !document.querySelector('#sheet').hidden, n: document.querySelectorAll('.lv').length, locked: document.querySelectorAll('.lv.lock').length, here: document.querySelector('.lv.here').dataset.n, total: __game.total, lvl: __game.save.lvl }));
    check(s.open && s.n === s.total && s.locked === s.total - s.lvl - 1 && s.here === '1' && s.n % 5 === 0, `the map shows every level (${s.n}), locks the ones not reached (${s.locked}) and marks this one`);
    const [gx, gy] = await ropeXY(page, win); await page.mouse.move(gx - 40, gy); await page.mouse.down(); await page.mouse.move(gx + 40, gy, { steps: 4 }); await page.mouse.up();
    check((await cutN(page)) === 0, 'a swipe over the open map cuts nothing');
    await page.click('.lv[data-n="3"]', { force: true });
    check(await g(page, () => document.querySelector('#sheet').hidden && __game.index === 2), 'tapping an open level plays it and closes the map');
    await shot(page, 'en-8-picked-level');
    await page.click('#book', { force: true });
    s = await g(page, () => ({ open: !document.querySelector('#sheet').hidden, n: document.querySelectorAll('.stk').length, got: document.querySelectorAll('.stk:not(.no)').length, gags: __game.save.gags.length, head: document.querySelector('#sheetT').textContent }));
    check(s.open && s.got === s.gags && s.head === s.gags + '/' + s.n, `the book shows ${s.n} stickers, ${s.got} found`);
    await shot(page, 'en-9-book'); await page.click('#close', { force: true });
    check(await g(page, () => document.querySelector('#sheet').hidden), 'the sheet closes');
    await page.click('#lvl', { force: true }); await page.waitForTimeout(200); await shot(page, 'en-10-map'); await page.click('#close', { force: true });
    check(errors.length === 0, 'no errors in a full play: ' + errors.slice(0, 2).join(' | '));
    await page.close();
  }

  // ---- 7. a whole run as a child who only cuts the right rope: time per level
  {
    const { page, errors } = await open(browser, port);
    const t0 = await g(page, () => __game.clock);
    for (let i = 0; i < 3; i++) { await winLevel(page); await page.click('#next', { force: true }); }
    const t = (await g(page, () => __game.clock)) - t0;
    check(t < 30, `three levels cut straight take ${t.toFixed(1)} s of game time`);
    check(errors.length === 0, 'no errors in a straight run');
    await page.close();
  }

  // ---- 8. saves: an old one, a late one, a failing one
  {
    let r = await open(browser, port, '', { init: 'window.__preset = { v: 1, lvl: 2, at: 1, stars: [3, 3], gags: ["kitty_cat", "gone_level", "nap_bell"], muted: true, learned: true, lang: "id" };' });
    await r.page.waitForFunction(() => __game.saveLoaded);
    let s = await g(r.page, () => ({ i: __game.index, gags: __game.save.gags, lang: __game.lang, muted: __game.sound.muted, prompt: document.querySelector('#prompt').textContent, hand: document.querySelector('#hand').hidden, writes: (window.__writes || []).length }));
    check(s.i === 1 && s.gags.length === 2 && s.lang === 'id' && s.muted, 'an old save opens its level, drops unknown stickers, keeps language and mute');
    check(s.prompt === 'Bangunkan!' && s.hand && s.writes === 0, 'the saved language shows; reading a save writes nothing');
    await r.page.click('#lvl', { force: true });
    const lk = await g(r.page, () => ({ lock: document.querySelectorAll('.lv.lock').length, total: __game.total })); await r.page.click('.lv.lock', { force: true });
    check(lk.lock === lk.total - 3 && (await g(r.page, () => !document.querySelector('#sheet').hidden && __game.index === 1)), `levels past the save stay locked (${lk.lock}) and do not open`);
    await r.page.click('#close', { force: true });
    await r.page.close();

    r = await open(browser, port, '', { init: 'window.__saveDelay = 2500; window.__preset = { v: 1, lvl: 1, at: 1, stars: [3], gags: ["kitty_cat", "kitty_water"], learned: true };' });
    const gag = (await ids(r.page, 'gag'))[1]; await swipe(r.page, gag); await idle(r.page); // the sticker the stored save lacks
    check((await g(r.page, () => (window.__writes || []).length)) === 0, 'nothing is written before the save has been read');
    await r.page.waitForFunction(() => __game.saveLoaded, null, { timeout: 8000 }); await r.page.waitForTimeout(2400);
    s = await g(r.page, () => ({ i: __game.index, gags: __game.save.gags.length, stars: __game.save.stars[0], w: window.__writes[window.__writes.length - 1] }));
    check(s.i === 0 && s.gags === 3 && s.stars === 3 && s.w && s.w.gags.length === 3, 'a late save is merged with what was just found, and the level in play stays');
    check(r.errors.length === 0, 'no errors with a late save'); await r.page.close();

    r = await open(browser, port, '', { init: 'window.__saveFails = true;' });
    await winLevel(r.page); await r.page.waitForTimeout(2500);
    check((await g(r.page, () => (window.__writes || []).length)) === 0 && !(await g(r.page, () => window.__scores)), 'with the save unreachable nothing is written or scored, and play goes on');
    check(r.errors.length === 0, 'no errors with a failing save'); await r.page.close();
  }

  // ---- 9. run() twice, and edit mode
  {
    const { page, errors } = await open(browser, port);
    await g(page, () => { window.run('play'); });
    await page.waitForFunction(() => window.__game && window.__game.W);
    check((await g(page, () => document.querySelectorAll('canvas').length)) === 1, 'a second run() leaves one stage');
    await winLevel(page); check(await g(page, () => __game.won), 'the game plays after a second run()');
    await g(page, () => { window.run('edit'); });
    await page.waitForFunction(() => window.__game && window.__game.mode === 'edit');
    const [win] = await ids(page, 'win'); const before = await g(page, () => (window.__writes || []).length);
    await swipe(page, win); await page.waitForTimeout(400);
    const s = await g(page, () => ({ cut: __game.W.ropes.filter((r) => r.cut).length, writes: (window.__writes || []).length, pill: getComputedStyle(document.querySelector('#lvl')).display }));
    check(s.cut === 0 && s.writes === before && s.pill === 'none', 'edit mode: no cutting, no saving, no play HUD');
    await shot(page, 'edit');
    check(errors.length === 0, 'no errors across run() calls: ' + errors.slice(0, 2).join(' | '));
    await page.close();
  }

  // ---- 10. every language: words inside the frame, buttons apart
  for (const [lang, locale] of Object.entries(LANGS)) {
    const { page, errors } = await open(browser, port, '', { locale });
    const inside = (sel) => g(page, (sel) => { const r = document.querySelector('#app').getBoundingClientRect(), e = document.querySelector(sel).getBoundingClientRect(); return e.width > 0 && e.left >= r.left - 0.5 && e.right <= r.right + 0.5 && e.top >= r.top && e.bottom <= r.bottom + 0.5; }, sel);
    const wide = await g(page, () => { const p = document.querySelector('#prompt'); return p.scrollWidth <= p.clientWidth + 1; });
    check((await g(page, () => __game.lang)) === lang && wide && (await inside('#prompt')), `${lang}: the prompt fits the frame`);
    check((await g(page, () => document.querySelector('#app').dir)) === (lang === 'ar' ? 'rtl' : 'ltr'), `${lang}: reading direction`);
    const clear = await g(page, () => { const r = ['#lvl', '#book', '#mute'].map((s) => document.querySelector(s).getBoundingClientRect()); return r.every((a, i) => r.every((b, j) => i >= j || a.right <= b.left || b.right <= a.left)); });
    check(clear && (await inside('#lvl')) && (await inside('#book')) && (await inside('#mute')), `${lang}: the top buttons do not touch each other`);
    await shot(page, `${lang}-1-start`);
    const [gag] = await ids(page, 'gag'); await swipe(page, gag); await page.waitForFunction(() => !document.querySelector('#toast').hidden, null, { timeout: 9000 });
    check(await inside('#toast'), `${lang}: the sticker card fits the frame`); await idle(page);
    await winLevel(page); await page.waitForTimeout(300);
    const apart = await g(page, () => { const a = document.querySelector('#again').getBoundingClientRect(), n = document.querySelector('#next').getBoundingClientRect(); return a.right <= n.left + 0.5 || n.right <= a.left + 0.5; });
    check((await inside('#again')) && (await inside('#next')) && apart, `${lang}: AGAIN and NEXT fit side by side`);
    await shot(page, `${lang}-2-win`);
    check(errors.length === 0, `${lang}: no errors`);
    await page.close();
  }

  // ---- 11. 600 random touches: nothing breaks, nothing leaks
  {
    const { page, errors } = await open(browser, port);
    const geo0 = await g(page, () => __game.geometries);
    let seed = 12345; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    for (let i = 0; i < 600; i++) {
      const x = rnd() * 360, y = rnd() * 640, k = rnd();
      if (k < 0.5) { await page.mouse.move(x, y); await page.mouse.down(); await page.mouse.move(rnd() * 360, rnd() * 640, { steps: 2 }); await page.mouse.up(); } else await page.mouse.click(x, y);
    }
    await page.waitForTimeout(500);
    const s = await g(page, () => ({ ok: __game.W.pts.every((p) => Number.isFinite(p.x) && Number.isFinite(p.y)), geo: __game.geometries, tex: __game.textures, i: __game.index }));
    check(s.ok && errors.length === 0, 'random touches: no errors, no broken numbers: ' + errors.slice(0, 2).join(' | '));
    check(s.geo <= geo0 + 2 && s.tex <= 4, `random touches: GPU objects stay put (geometries ${geo0} -> ${s.geo}, textures ${s.tex})`);
    await page.close();
  }

  await browser.close(); server.close();
  console.log(fails.length ? `\n${fails.length} FAILED:\n- ` + fails.join('\n- ') : '\nall checks passed', '\nscreens in', out);
  process.exit(fails.length ? 1 : 0);
}
main().catch((e) => { console.error(e); process.exit(1); });
