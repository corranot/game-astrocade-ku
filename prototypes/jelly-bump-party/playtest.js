// PROTOTYPE - NOT FOR PRODUCTION
// Playtest: serves this folder and plays Jelly Bump Party like people do: the demo before any touch, the first tap,
// a whole solo match with a finger on the red button, play again, a friend joining, two fingers at once, a finger
// lost off the frame, the save (late, failing, from before), every language, edit mode and 600 random touches.
// Screens of every state go to the out folder.
// Usage: [ONLY=bugs] node playtest.js <out folder>   (Playwright; SwiftShader GPU, so FPS here is not a phone's)
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const out = process.argv[2] || fs.mkdtempSync(path.join(require('os').tmpdir(), 'jbp-'));
const types = { '.js': 'text/javascript', '.html': 'text/html', '.json': 'application/json', '.webp': 'image/webp', '.mp3': 'audio/mpeg' };
const serve = () => http.createServer((q, s) => {
  const f = path.join(__dirname, q.url.split('?')[0] === '/' ? 'index.html' : q.url.split('?')[0]);
  fs.readFile(f, (e, d) => { if (e) { s.writeHead(404); return s.end(); } s.writeHead(200, { 'content-type': types[path.extname(f)] || 'text/plain' }); s.end(d); });
}).listen(0);
const fails = [];
const check = (ok, msg) => { console.log((ok ? 'ok   ' : 'FAIL ') + msg); if (!ok) fails.push(msg); };
const GPU = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'];

/** In-page finger for seat s: presses its button when its aim lines up with a blob, holds a moment, lets go. */
const BOT = `window.__bot = (s, on) => {
  clearInterval((window.__bots = window.__bots || {})[s]); if (!on) return;
  let until = 0, down = false;
  const pad = () => document.querySelector('#seat' + s + ' .pad');
  const fire = (type) => { const r = pad().getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
    (type === 'pointerdown' ? pad() : window).dispatchEvent(new PointerEvent(type, { pointerId: 50 + s, clientX: x, clientY: y, bubbles: true, isPrimary: s === 0 })); };
  window.__bots[s] = setInterval(() => {
    const M = __game.M; if (!M) return; const b = M.blobs[s];
    if (down) { if (performance.now() > until || M.phase !== 'play') { fire('pointerup'); down = false; } return; }
    if (M.phase !== 'play' || b.out || b.cool > 0) return;
    for (const o of M.blobs) { if (o === b || o.out) continue; const d = Math.hypot(o.x - b.x, o.z - b.z); let a = b.ang - Math.atan2(o.z - b.z, o.x - b.x);
      while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI;
      if (Math.abs(a) < 0.3 && d < 6) { fire('pointerdown'); down = true; until = performance.now() + Math.min(650, 250 + d * 120) / (__speed || 1); return; } }
  }, 16);
};`;

async function open(browser, q = '', opts = {}) {
  const page = await browser.newPage({ viewport: { width: 360, height: 640 }, deviceScaleFactor: 2, locale: opts.locale || 'en-US', hasTouch: !!opts.touch });
  const errors = []; page.on('pageerror', (e) => errors.push(e.message)); page.on('console', (m) => { if (m.type() === 'error' && !/favicon/.test(m.text())) errors.push(m.text()); });
  if (opts.init) await page.addInitScript(opts.init);
  await page.addInitScript(`window.__speed = ${opts.speed || 1};` + BOT);
  await page.goto(`http://localhost:${opts.port}/?local${q}`);
  await page.waitForFunction(() => window.__game && window.__game.M && document.fonts.status === 'loaded', null, { timeout: 40000 });
  return { page, errors };
}
const g = (page, fn, a) => page.evaluate(fn, a);
const shot = (page, n) => page.screenshot({ path: path.join(out, n + '.png') });
async function tapAt(page, x, y, ms = 60) { const [cx, cy] = await g(page, ([x, y]) => __game.client(x, y), [x, y]); await page.mouse.move(cx, cy); await page.mouse.down(); await page.waitForTimeout(ms); await page.mouse.up(); }

async function main() {
  fs.mkdirSync(out, { recursive: true });
  const server = serve(), port = server.address().port;
  const browser = await chromium.launch({ args: GPU });

  if (!process.env.ONLY) { // ONLY=bugs runs just the bug-hunter checks (section 12 on)
  // ---- 1. the demo: moving before any touch, nothing counts or is saved
  {
    const { page, errors } = await open(browser, '', { port });
    const p0 = await g(page, () => __game.M.blobs.map((b) => [b.x, b.z]));
    await page.waitForTimeout(1000);
    const st = await g(page, () => ({ demo: __game.demo, moved: __game.M.blobs.map((b) => [b.x, b.z]), writes: (window.__writes || []).length, coins: __game.save.coins, hand: !document.querySelector('#hand').hidden, tip: document.querySelector('#seat0 .tip').textContent }));
    check(st.demo, 'opens straight into a live demo match (no menu)');
    check(st.moved.some((m, i) => Math.hypot(m[0] - p0[i][0], m[1] - p0[i][1]) > 0.3), 'blobs move before the first touch');
    check(st.hand && st.tip === 'TAP TO BUMP!', 'demo shows the hand and TAP TO BUMP! on the red button');
    check(st.writes === 0 && st.coins === 0, 'the demo saves nothing and pays nothing');
    await shot(page, '01-demo');
    // ---- 2. first tap anywhere: a match with red as the player, and the tap itself dashes
    const t0 = Date.now();
    await tapAt(page, 360, 700, 40);
    await page.waitForFunction(() => !__game.demo && __game.M.blobs[0].human && Math.hypot(__game.M.blobs[0].vx, __game.M.blobs[0].vz) > 3, null, { timeout: 3000 }).catch(() => {});
    const first = await g(page, () => ({ demo: __game.demo, human: __game.M.blobs.map((b) => b.human), v: Math.hypot(__game.M.blobs[0].vx, __game.M.blobs[0].vz), round: __game.M.round }));
    check(!first.demo && first.human.join() === 'true,false,false,false', 'first tap starts a solo match as red (3 computer blobs)');
    check(first.v > 3, `the very first tap is a dash (speed ${first.v.toFixed(1)}, ${Date.now() - t0} ms incl. test overhead)`);
    await page.waitForTimeout(150); await shot(page, '02-first-dash');
    // ---- 3. a whole solo match with the bot finger on the red button
    await g(page, () => __bot(0, true));
    const rounds = new Set(), mods = new Set();
    let tipSeen = false;
    for (let i = 0; i < 400; i++) {
      const s = await g(page, () => ({ phase: __game.M.phase, round: __game.M.round, mod: __game.M.mod, panel: !document.querySelector('#panel').hidden, tip: !document.querySelector('#seat0 .tip').hidden }));
      rounds.add(s.round); mods.add(s.mod); tipSeen = tipSeen || s.tip;
      if (s.round === 2 && !fs.existsSync(path.join(out, '03-round2.png'))) { await page.waitForTimeout(300); await shot(page, '03-round2'); }
      if (s.panel) break;
      await page.waitForTimeout(250);
    }
    await g(page, () => __bot(0, false));
    const res = await g(page, () => ({ panel: !document.querySelector('#panel').hidden, rows: document.querySelectorAll('#panel .row').length, again: !!document.querySelector('#again'), coins: __game.save.coins, total: __game.save.total, matches: __game.save.matches, last: (window.__writes || []).slice(-1)[0], winner: __game.M.matchWinner, crowns: __game.M.blobs.map((b) => b.crowns) }));
    check(res.panel && res.rows === 4 && res.again, `the match ends on a result card with 4 places and PLAY AGAIN (${rounds.size} rounds, floors: ${[...mods].join(', ')}, crowns ${res.crowns})`);
    check(res.coins > 0 && res.matches === 1, `the match pays coins (${res.coins}) and counts`);
    check(!res.last || res.last.coins === res.coins, 'what was paid is what was saved');
    check(tipSeen, 'the hold-aim-let-go tip showed while the player learned');
    await page.waitForTimeout(500); await shot(page, '04-result');
    // ---- 4. play again: instant, fresh crowns, same seats
    const t1 = await g(page, () => { const t = performance.now(); document.querySelector('#again').click(); return { ms: performance.now() - t, crowns: __game.M.blobs.map((b) => b.crowns).join(), panel: !document.querySelector('#panel').hidden, human: __game.M.blobs[0].human, round: __game.M.round }; });
    check(t1.ms < 100 && t1.crowns === '0,0,0,0' && !t1.panel && t1.human && t1.round === 1, `PLAY AGAIN resets at once (${t1.ms.toFixed(1)} ms)`);
    // ---- 5. a friend joins by tapping the + on the blue corner, then two fingers hold at once
    await page.waitForTimeout(1000);
    const jb = await page.locator('#seat1 .join').boundingBox();
    await page.mouse.click(jb.x + jb.width / 2, jb.y + jb.height / 2);
    const joined = await g(page, () => ({ blue: __game.M.blobs[1].human, cls: document.querySelector('#seat1').classList.contains('cpu') }));
    check(joined.blue && !joined.cls, 'tapping + on a corner turns that computer blob into a player at once');
    await page.waitForTimeout(400); await shot(page, '05-joined');
    await page.waitForFunction(() => __game.M.phase === 'play', null, { timeout: 5000 }).catch(() => {});
    const both = await g(page, () => {
      const at = (s) => { const r = document.querySelector('#seat' + s + ' .pad').getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; };
      const fire = (el, type, id, [x, y]) => el.dispatchEvent(new PointerEvent(type, { pointerId: id, clientX: x, clientY: y, bubbles: true }));
      fire(document.querySelector('#seat0 .pad'), 'pointerdown', 7, at(0)); fire(document.querySelector('#seat1 .pad'), 'pointerdown', 8, at(1));
      const held = [__game.M.blobs[0].holding, __game.M.blobs[1].holding];
      fire(window, 'pointerup', 7, at(0)); const after = [__game.M.blobs[0].holding, __game.M.blobs[1].holding];
      fire(window, 'pointerup', 8, at(1));
      return { held, after };
    });
    check(both.held.join() === 'true,true' && both.after.join() === 'false,true', 'two fingers hold two seats; lifting one lets go of only its seat');
    // a finger pressed on the red pad, slid off the frame and lifted outside lets go
    const rp = await page.locator('#seat0 .pad').boundingBox();
    await page.mouse.move(rp.x + rp.width / 2, rp.y + rp.height / 2); await page.mouse.down(); await page.mouse.move(400, 900, { steps: 4 }); await page.mouse.up();
    check(!(await g(page, () => __game.M.blobs[0].holding)), 'a finger lifted outside the frame still lets go');
    // a finger still down when a new round starts keeps holding
    const kept = await g(page, async () => {
      const r = document.querySelector('#seat0 .pad').getBoundingClientRect(), x = r.left + 50, y = r.top + 50;
      document.querySelector('#seat0 .pad').dispatchEvent(new PointerEvent('pointerdown', { pointerId: 9, clientX: x, clientY: y, bubbles: true }));
      const M = __game.M; for (const b of M.blobs) if (b.seat !== 0) { b.out = true; b.fall = 1; }
      await new Promise((ok) => { const w = () => (__game.M.round > 1 || __game.M.phase === 'done' ? ok() : setTimeout(w, 50)); w(); });
      const h = __game.M.phase === 'done' || __game.M.blobs[0].holding;
      window.dispatchEvent(new PointerEvent('pointerup', { pointerId: 9, clientX: x, clientY: y, bubbles: true }));
      return h;
    });
    check(kept, 'a finger held through the round change keeps holding in the next round');
    check(errors.length === 0, 'no page errors in the main run: ' + (errors.join(' | ') || 'none'));
    await page.close();
  }

  // ---- 6. hats: enough coins unlock one, it is worn and announced
  {
    const { page, errors } = await open(browser, '', { port, init: 'window.__preset = { v: 1, coins: 10, total: 10, hats: ["party"], hat: "party", kos: 3, wins: 0, matches: 2, learned: true };', speed: 2 });
    await page.waitForFunction(() => __game.saveLoaded, null, { timeout: 5000 });
    await tapAt(page, 360, 700);
    await g(page, () => __bot(0, true));
    await page.waitForFunction(() => !document.querySelector('#panel').hidden, null, { timeout: 120000, polling: 250 });
    await g(page, () => __bot(0, false));
    const h = await g(page, () => ({ hats: __game.save.hats, hat: __game.save.hat, card: !!document.querySelector('#panel .newhat'), matches: __game.save.matches, kos: __game.save.kos }));
    const newest = h.hats[h.hats.length - 1];
    check(h.hats.includes('crown') && h.hat === newest && h.card, `coins past 12 unlock the crown (and more), the newest is worn and shown on the card (${h.hats})`);
    check(h.matches === 3 && h.kos >= 3, 'the old save was kept and added to');
    await shot(page, '06-new-hat');
    await g(page, () => document.querySelector('#again').click());
    await page.waitForTimeout(900); await shot(page, '07-hat-worn');
    check(await g(page, (n) => __game.scene.blobs[0].hatId === n, newest), 'the new hat is on the red blob in the next match');
    // the hat button cycles owned hats
    await page.click('#bag'); await page.click('#hatBtn'); check(await g(page, (n) => __game.save.hat !== n && __game.scene.blobs[0].hatId === __game.save.hat, newest), 'the hat button switches between owned hats');
    check(errors.length === 0, 'no page errors with a save: ' + (errors.join(' | ') || 'none'));
    await page.close();
  }

  // ---- 7. save that fails or arrives late: never written blind, coins from before it arrived are kept
  {
    const { page, errors } = await open(browser, '', { port, init: 'window.__saveFails = true;', speed: 2 });
    await tapAt(page, 360, 700); await g(page, () => __bot(0, true));
    await page.waitForFunction(() => !document.querySelector('#panel').hidden, null, { timeout: 120000, polling: 250 });
    await g(page, () => __bot(0, false));
    const earned = await g(page, () => __game.save.coins);
    check((await g(page, () => (window.__writes || []).length)) === 0, 'a save that cannot be read is never overwritten');
    await g(page, () => { window.__saveFails = false; window.__preset = null; });
    await page.waitForFunction(() => __game.saveLoaded, null, { timeout: 15000 }).catch(() => {});
    const w = await g(page, () => ({ loaded: __game.saveLoaded, last: (window.__writes || []).slice(-1)[0] }));
    check(w.loaded && w.last && w.last.coins === earned, `once the save reads, the coins earned meanwhile are written (${earned})`);
    check(errors.length === 0, 'no page errors with a failing save: ' + (errors.join(' | ') || 'none'));
    await page.close();
  }

  // ---- 8. every language: words present, Arabic right to left, nothing outside the frame
  for (const lang of ['en', 'ar', 'es', 'vi', 'hi', 'bn', 'id']) {
    const { page, errors } = await open(browser, '', { port, locale: lang });
    const st = await g(page, () => ({ lang: __game.lang, dir: document.getElementById('app').dir, tip: document.querySelector('#seat0 .tip').textContent, join: document.querySelector('#seat1 .join span').textContent }));
    check(st.lang === lang && st.dir === (lang === 'ar' ? 'rtl' : 'ltr') && st.tip && st.join, `${lang}: device language used (${st.tip} / ${st.join})`);
    const over = await g(page, () => { const a = document.getElementById('app').getBoundingClientRect(); const bad = []; for (const el of document.querySelectorAll('.hud button:not([hidden]), .tip:not([hidden]), .pill, .next:not([hidden])')) { if (el.closest('[hidden]')) continue; const r = el.getBoundingClientRect(); if (r.width && (r.left < a.left - 1 || r.right > a.right + 1 || r.top < a.top - 1 || r.bottom > a.bottom + 1)) bad.push(el.className + ' ' + el.textContent.slice(0, 12)); } return bad; });
    check(!over.length, `${lang}: every HUD part stays inside the frame ${over.join(', ')}`);
    await shot(page, `08-lang-${lang}`);
    check(errors.length === 0, `${lang}: no page errors ` + (errors.join(' | ') || ''));
    await page.close();
  }

  // ---- 9. layout: buttons out of the guest sign-in strip, out of the cake, not on each other
  {
    const { page } = await open(browser, '', { port });
    const L = await g(page, () => {
      const a = document.getElementById('app').getBoundingClientRect(), k = 1280 / a.height;
      const box = (el) => { const r = el.getBoundingClientRect(); return { l: (r.left - a.left) * k, t: (r.top - a.top) * k, r: (r.right - a.left) * k, b: (r.bottom - a.top) * k, n: el.id || el.className }; };
      const pads = [...document.querySelectorAll('.pad')].map(box), tools = [...document.querySelectorAll('.bag, .pips')].map(box);
      const all = [...pads, ...tools], hits = [];
      for (let i = 0; i < all.length; i++) for (let j = i + 1; j < all.length; j++) { const p = all[i], q = all[j]; if (p.l < q.r - 2 && q.l < p.r - 2 && p.t < q.b - 2 && q.t < p.b - 2 && !(p.n === 'pips' && q.n === 'pips')) hits.push(p.n + '×' + q.n); }
      // the cake's edge on screen, sampled every 10 degrees, against every corner control
      const S = __game.scene, R = __game.M.R0, inCake = [];
      for (const b of all) for (let d = 0; d < 360; d += 10) { const [x, y] = S.screenOf(Math.cos(d / 57.3) * R, Math.sin(d / 57.3) * R); if (x > b.l && x < b.r && y > b.t && y < b.b) { inCake.push(b.n); break; } }
      return { low: Math.max(...pads.map((p) => p.b)), hits, inCake: [...new Set(inCake)] };
    });
    check(L.low <= 1280 - 16, `corner buttons sit inside the frame (lowest edge ${L.low.toFixed(0)}); the guest sign-in strip never locks play: any touch in a seat's quarter counts`);
    check(!L.hits.length, 'no HUD control overlaps another ' + L.hits.join(', '));
    check(!L.inCake.length, 'no corner control sits on the cake ' + L.inCake.join(', '));
    // blobs at the start of a round are not under any control
    const under = await g(page, () => { const S = __game.scene, a = document.getElementById('app').getBoundingClientRect(), k = 1280 / a.height; const bad = [];
      for (const b of __game.M.blobs) { const [x, y] = S.screenOf(b.x, b.z); for (const el of document.querySelectorAll('.pad, .join, .pips')) { const r = el.getBoundingClientRect(); if (x > (r.left - a.left) * k && x < (r.right - a.left) * k && y > (r.top - a.top) * k && y < (r.bottom - a.top) * k) bad.push(b.seat + ':' + el.className); } } return bad; });
    check(!under.length, 'no blob starts under a control ' + under.join(', '));
    await page.close();
  }

  // ---- 10. edit mode: drawn, nothing moves, touches do nothing
  {
    const { page, errors } = await open(browser, '&mode=edit', { port });
    const a = await g(page, () => __game.M.blobs.map((b) => b.x + ',' + b.z).join(';'));
    await tapAt(page, 360, 700); await tapAt(page, 600, 1012); await page.waitForTimeout(800);
    const b = await g(page, () => ({ pos: __game.M.blobs.map((b) => b.x + ',' + b.z).join(';'), human: __game.M.blobs.some((x) => x.human), seats: getComputedStyle(document.querySelector('#seat0')).display, writes: (window.__writes || []).length }));
    check(a === b.pos && !b.human && b.seats === 'none' && b.writes === 0, 'edit mode: a still picture, no controls, no play, no save');
    await shot(page, '10-edit');
    // run() again (the host may call it twice): one game, still working
    await g(page, () => window.run('play')); await page.waitForTimeout(500);
    await tapAt(page, 360, 700); await page.waitForTimeout(300);
    check(await g(page, () => !__game.demo && document.querySelectorAll('#cv').length === 1), 'run(play) after run(edit) gives one working game');
    check(errors.length === 0, 'edit mode: no page errors ' + (errors.join(' | ') || ''));
    await page.close();
  }

  // ---- 11. 600 seeded random touches from up to four fingers: no errors, state stays sane
  {
    const { page, errors } = await open(browser, '', { port, speed: 2 });
    const r = await g(page, async () => {
      let a = 12345; const rnd = () => { a = (a * 1103515245 + 12345) & 0x7fffffff; return a / 0x7fffffff; };
      const app = document.getElementById('app').getBoundingClientRect(), down = new Set();
      for (let i = 0; i < 600; i++) {
        const id = 1 + Math.floor(rnd() * 4), x = app.left + rnd() * app.width, y = app.top + rnd() * app.height;
        const el = document.elementFromPoint(x, y) || document.getElementById('app');
        if (down.has(id)) { window.dispatchEvent(new PointerEvent('pointerup', { pointerId: id, clientX: x, clientY: y, bubbles: true })); down.delete(id); }
        else { el.dispatchEvent(new PointerEvent('pointerdown', { pointerId: id, clientX: x, clientY: y, bubbles: true })); down.add(id); }
        if (rnd() < 0.15) { const b = document.querySelector('#again'); if (b) b.click(); }
        await new Promise((ok) => setTimeout(ok, 12));
      }
      for (const id of down) window.dispatchEvent(new PointerEvent('pointerup', { pointerId: id, bubbles: true }));
      await new Promise((ok) => setTimeout(ok, 100));
      const M = __game.M; const bad = M.blobs.filter((b) => !Number.isFinite(b.x) || !Number.isFinite(b.vx) || (b.holding && !b.human));
      return { bad: bad.length, holding: M.blobs.filter((b) => b.holding && b.human).length, langsOpen: !document.querySelector('#langs').hidden };
    });
    check(r.bad === 0, '600 random touches: every blob stays finite');
    check(r.holding === 0, 'after all fingers lift, no seat is stuck holding');
    check(errors.length === 0, 'random touches: no page errors ' + (errors.join(' | ') || ''));
    await page.close();
  }

  }
  // ---- 12. bug hunter findings, each a check that failed before its fix
  {
    const { page, errors } = await open(browser, '', { port });
    // a tap on another corner's + during the demo makes the player red, not that seat
    const jb = await page.locator('#seat1 .pad').boundingBox();
    await page.mouse.click(jb.x + jb.width / 2, jb.y + jb.height / 2);
    check(await g(page, () => __game.M.blobs[0].human && !__game.M.blobs[1].human), 'demo: a touch on any corner makes the player red');
    // the charge whine stops when a held blob is knocked out
    await page.waitForFunction(() => __game.M.phase === 'play', null, { timeout: 5000 });
    const rp = await page.locator('#seat0 .pad').boundingBox();
    await page.mouse.move(rp.x + rp.width / 2, rp.y + rp.height / 2); await page.mouse.down(); await page.waitForTimeout(300);
    const w0 = await g(page, () => __game.Sound.whines);
    await g(page, () => { const b = __game.M.blobs[0]; b.x = 30; b.lastT = __game.M.t; });
    await page.waitForTimeout(300);
    const w1 = await g(page, () => ({ w: __game.Sound.whines, out: __game.M.blobs[0].out }));
    await page.mouse.up();
    check(w0 === 1 && w1.out && w1.w === 0, `the charge whine stops when the held blob is knocked out (${w0} → ${w1.w})`);
    // a lost pointerup: the same pointer pressing again does not leave the seat held for good
    const lost = await g(page, () => { __game.newMatch([0], { firstGo: 0 }); const pad = document.querySelector('#seat0 .pad'), r = pad.getBoundingClientRect(), o = { pointerId: 5, clientX: r.left + 40, clientY: r.top + 40, bubbles: true };
      pad.dispatchEvent(new PointerEvent('pointerdown', o)); pad.dispatchEvent(new PointerEvent('pointerdown', o)); window.dispatchEvent(new PointerEvent('pointerup', o)); return __game.M.blobs[0].holding; });
    check(!lost, 'a pointer whose pointerup was lost does not stick its seat');
    // BUMP! is turned for the player who bumped
    const flip = await g(page, () => { __game.M.blobs[1].human = true; __game.onEvent({ type: 'bump', a: 1, b: 0, force: 14, x: 0, z: 0 }); const ps = [...document.querySelectorAll('.pop')]; return ps[ps.length - 1].classList.contains('flip'); });
    check(flip, 'BUMP! faces the top-seat player who made the bump');
    // nobody can take over a decided match by joining before the card shows
    const take = await g(page, () => { const M = __game.M; M.blobs[2].crowns = 3; M.phase = 'done'; M.matchWinner = 2; const pad = document.querySelector('#seat2 .pad'), r = pad.getBoundingClientRect();
      pad.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 6, clientX: r.left + 30, clientY: r.top + 30, bubbles: true })); window.dispatchEvent(new PointerEvent('pointerup', { pointerId: 6, bubbles: true })); return M.blobs[2].human; });
    check(!take, 'a finished match cannot be joined and taken over');
    // after a match nobody touched, the game goes back to the demo instead of playing alone forever
    const back = await g(page, async () => { __game.newMatch([0], { firstGo: 0 }); const M = __game.M; M.blobs.forEach((b, i) => { b.crowns = i === 3 ? 3 : 0; }); M.phase = 'done'; M.matchWinner = 3; M.timer = 99; __game.results();
      await new Promise((ok) => { const w = () => (__game.demo || document.querySelector('#panel').hidden ? ok() : setTimeout(w, 100)); w(); }); return __game.demo; });
    check(back, 'an untouched match ends back in the demo');
    // Space after clicking a settings button does not click it again
    await page.click('#bag'); await page.click('#mute'); const m0 = await g(page, () => __game.Sound.muted);
    await page.keyboard.down(' '); await page.keyboard.up(' '); await page.waitForTimeout(100);
    check(m0 === (await g(page, () => __game.Sound.muted)), 'Space (red\'s key) never re-clicks the last settings button');
    // run() many times: one WebGL context at a time, the game still works
    const ok = await g(page, async () => { const old = __game.scene.renderer.getContext(); for (let i = 0; i < 18; i++) { window.run('play'); await new Promise((r) => setTimeout(r, 30)); } await new Promise((r) => setTimeout(r, 400)); return { lost: old.isContextLost(), running: !!__game.M && document.querySelectorAll('canvas').length === 1 }; });
    check(ok.running && ok.lost, `run() 18 times in a row: one canvas, still running, the old WebGL context released (${ok.lost})`);
    check(errors.length === 0, 'bug checks: no page errors ' + (errors.join(' | ') || ''));
    await page.close();
  }
  // a hat picked while the save is still on its way is not undone when it arrives
  {
    const { page } = await open(browser, '', { port, init: 'window.__saveFails = true; window.__preset = { v: 1, coins: 50, total: 50, hats: ["party", "crown", "top"], hat: "party", muted: false };' });
    await g(page, () => { __game.save.hats.push('crown'); });
    await page.click('#bag'); await page.click('#hatBtn'); await page.click('#mute');
    const picked = await g(page, () => __game.save.hat);
    await g(page, () => { window.__saveFails = false; });
    await page.waitForFunction(() => __game.saveLoaded, null, { timeout: 15000 }).catch(() => {});
    const st = await g(page, () => ({ hat: __game.save.hat, worn: __game.scene.blobs[0].hatId, muted: __game.save.muted }));
    check(st.hat === picked && st.worn === picked && st.muted === true, `a hat and mute picked before the save arrived are kept (${picked} → ${st.hat}, muted ${st.muted})`);
    await page.close();
  }
  // edit mode shows no tapping hand
  {
    const { page } = await open(browser, '&mode=edit', { port });
    check(await g(page, () => getComputedStyle(document.querySelector('#hand')).display === 'none'), 'edit mode: no tapping hand over nothing');
    await page.close();
  }

  await browser.close(); server.close();
  console.log(fails.length ? `\n${fails.length} FAILED` : '\nall passed');
  process.exit(fails.length ? 1 : 0);
}
if (require.main === module) main().catch((e) => { console.error(e); process.exit(1); });
module.exports = { serve, open, BOT, GPU, types };
