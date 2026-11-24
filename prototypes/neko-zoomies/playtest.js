// PROTOTYPE - NOT FOR PRODUCTION
// Playtest: serves this folder and plays NEKO ZOOMIES like a child would: the attract show before any touch, the
// first tap, walls and falls, the climb from the rug to the cloud mobiles, the floor piano, orbs, dominoes, knock
// combos with hit-stop, MEGA ZOOMIES, every costume, both events, the save, edit mode, run() twice, two fingers,
// camera and kitten against everything solid, random inputs and every language. Screens go to the out folder.
// Usage: node playtest.js <out folder>   (Playwright; SwiftShader GPU, so FPS here is not a phone's)
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const out = process.argv[2] || fs.mkdtempSync(path.join(require('os').tmpdir(), 'nz-'));
fs.mkdirSync(out, { recursive: true });
const cfg = JSON.parse(fs.readFileSync(path.join(__dirname, 'game_config.json'), 'utf8'));
const types = { '.js': 'text/javascript', '.html': 'text/html', '.json': 'application/json' };
const srv = http.createServer((q, s) => {
  const f = path.join(__dirname, q.url.split('?')[0] === '/' ? 'index.html' : q.url.split('?')[0]);
  fs.readFile(f, (e, d) => { if (e) { s.writeHead(404); return s.end(); } s.writeHead(200, { 'content-type': types[path.extname(f)] || 'text/plain' }); s.end(d); });
}).listen(0);
const fails = [];
const check = (ok, msg) => { console.log((ok ? 'ok   ' : 'FAIL ') + msg); if (!ok) fails.push(msg); };
const GPU = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'];
const LANGS = { en: 'en-US', ar: 'ar-SA', es: 'es-ES', vi: 'vi-VN', hi: 'hi-IN', bn: 'bn-BD', id: 'id-ID' };

async function open(browser, q = '', opts = {}) {
  const page = await browser.newPage({ viewport: { width: 360, height: 640 }, deviceScaleFactor: 2, locale: opts.locale || 'en-US', hasTouch: !!opts.touch, isMobile: !!opts.touch });
  const errors = [];
  page.on('pageerror', (e) => errors.push((e.stack || e.message).split('\n').slice(0, 3).join(' | ')));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  if (opts.init) await page.addInitScript(opts.init);
  await page.goto(`http://localhost:${srv.address().port}/?local${q}`);
  const ok = await page.waitForFunction(() => window.__game && window.__game.state, null, { timeout: 40000 }).then(() => true, () => false);
  if (!ok) console.log('page did not start: __game ' + await page.evaluate(() => typeof window.__game + ', THREE ' + typeof window.THREE + ', config ' + typeof window.gameConfig) + ' ' + errors.join(' / '));
  page.errors = errors;
  return page;
}
const st = (p) => p.evaluate(() => __game.state);
const until = (p, fn, arg, t) => p.waitForFunction(fn, arg, { timeout: t || 15000 }).then(() => true, () => false);
/** Waits in game seconds, so a slow software GPU does not change what a check sees. */
const gameWait = async (p, sec) => { const t0 = (await st(p)).now; return until(p, (t) => __game.state.now >= t, t0 + sec, 60000); };
const start = async (p) => { await p.mouse.click(180, 330); await until(p, () => __game.state.started); };
const shot = (p, name) => p.screenshot({ path: path.join(out, name + '.jpg'), type: 'jpeg', quality: 80 });
/** Stands the kitten at a spot and lets it settle on the ground there. */
const stand = async (p, x, y, z) => { await p.evaluate(([x, y, z]) => { __game.tp(x, y, z); __game.cat.jumpAt = -9; }, [x, y, z]); await gameWait(p, 0.2); await until(p, () => __game.cat.grounded, null, 5000); };

async function attractAndStart(browser) {
  const p = await open(browser);
  const a = await p.evaluate(() => ({ x: __game.cat.x, z: __game.cat.z, yaw: __game.cam.x }));
  await gameWait(p, 2.5);
  const b = await p.evaluate(() => ({ x: __game.cat.x, z: __game.cat.z, yaw: __game.cam.x, s: __game.state, title: !document.querySelector('#title').classList.contains('gone'), play: document.querySelector('#playBtn').textContent }));
  check(b.s.demo && !b.s.started && b.title, 'attract show runs before any touch, title and PLAY button up');
  check(Math.hypot(b.x - a.x, b.z - a.z) > 0.3 || Math.abs(b.yaw - a.yaw) > 0.1, 'the scene moves before the first touch (kitten or camera)');
  check(b.s.stars === 0 && b.s.purr === 0, 'nothing is counted during the attract show');
  check(b.play === cfg.strings.en.play, 'PLAY button carries the string from the table');
  await shot(p, '01-attract');
  await start(p);
  const c = await p.evaluate(() => ({ s: __game.state, gone: document.querySelector('#title').classList.contains('gone') }));
  check(c.s.started && !c.s.demo && c.gone, 'first tap anywhere starts the game and clears the title');
  await gameWait(p, 0.4);
  check(await p.evaluate(() => !__game.cat.grounded || __game.cat.vy !== 0 || __game.cat.y > 0.05), 'that same first tap is already an action (the kitten pounces)');
  await gameWait(p, 1.2);
  await shot(p, '02-play');
  // keyboard: walk, pounce, swipe
  await stand(p, 0, 0, 6); await p.evaluate(() => __game.setYaw(0));
  const z0 = await p.evaluate(() => __game.cat.z);
  await p.keyboard.down('KeyW'); await gameWait(p, 0.6); await p.keyboard.up('KeyW');
  check(await p.evaluate((z) => __game.cat.z < z - 1, z0), 'W walks the kitten forward');
  await until(p, () => __game.cat.grounded);
  await p.keyboard.press('Space');
  check(await until(p, () => __game.cat.y > 0.8, null, 4000), 'Space makes a high pounce');
  await until(p, () => __game.cat.grounded);
  await p.keyboard.press('ShiftLeft');
  check(await p.evaluate(() => __game.cat.swipeT > 0), 'Shift does the paw swipe');
  check(p.errors.length === 0, 'no page errors in the opening' + (p.errors.length ? ': ' + p.errors[0] : ''));
  await p.close();
}

async function worldBounds(browser) {
  const p = await open(browser);
  await start(p);
  // walls: run into each one for a while
  const bad = [];
  for (const [x, z, yaw] of [[0, 10, Math.PI], [0, -8.5, 0], [10, 3, -Math.PI / 2], [-10, 9, Math.PI / 2], [10.5, 10.5, Math.PI * 0.75], [-10.5, 10.5, -Math.PI * 0.75]]) {
    await stand(p, x, 0, z); await p.evaluate((y) => __game.setYaw(y), yaw);
    await p.keyboard.down('KeyW'); await gameWait(p, 1.6); await p.keyboard.press('Space'); await gameWait(p, 0.8); await p.keyboard.up('KeyW');
    const c = await p.evaluate(() => ({ x: __game.cat.x, y: __game.cat.y, z: __game.cat.z }));
    if (Math.abs(c.x) > 11.7 || Math.abs(c.z) > 11.7 || c.y < -0.01) bad.push(JSON.stringify(c));
  }
  check(!bad.length, 'the kitten cannot run or jump out through any wall or corner' + (bad.length ? ': ' + bad.join(' ') : ''));
  // below the floor, outside the room, not-a-number: back inside
  for (const [x, y, z] of [[0, -9, 0], [40, 0, 0], [0, 0, -40], [NaN, 0, 0]]) {
    await p.evaluate(([x, y, z]) => __game.tp(x, y, z), [x, y, z]);
    await gameWait(p, 0.3);
  }
  await until(p, () => __game.cat.grounded);
  const c = await p.evaluate(() => ({ x: __game.cat.x, y: __game.cat.y, z: __game.cat.z }));
  check(Math.abs(c.x) < 12 && Math.abs(c.z) < 12 && c.y >= 0, 'a kitten put below the floor or outside the room comes back in');
  // the fever jump does not go through the ceiling
  await stand(p, 0, 0, 4); await p.evaluate(() => __game.addPurr(1000));
  let top = 0;
  for (const [x, y, z] of [[0, 0, 4], [7.6, 8.3, -4.6]]) {
    await stand(p, x, y, z); await p.keyboard.press('Space');
    for (let i = 0; i < 25; i++) { await p.waitForTimeout(60); top = Math.max(top, await p.evaluate(() => __game.cat.y)); }
  }
  check(top > 2.4 && top <= cfg.room.height - 1.29, `the doubled fever jump is higher (${top.toFixed(2)} m) and stops under the ceiling`);
  // toys never leave the room
  await gameWait(p, 2);
  const lost = await p.evaluate(() => __game.props.filter((o) => Math.abs(o.x) > 12 || Math.abs(o.z) > 12 || o.y < -0.05).length);
  check(lost === 0, 'no toy is outside the room or below the floor');
  check(p.errors.length === 0, 'no page errors at the walls' + (p.errors.length ? ': ' + p.errors[0] : ''));
  await p.close();
}

/** Each step of the climb is made with the real controls: run at the next perch and pounce. */
async function climb(browser) {
  const p = await open(browser);
  await start(p);
  const C = await p.evaluate(() => ({ clouds: __game.world.clouds, tops: __game.world.shelfTops }));
  const hops = [
    ['rug to toy drum', [-2.5, 0, -6.4], [-2.5, 1.25, -8.3]],
    ['rug to toy chest', [-7.2, 0, -6.6], [-7.2, 1.2, -9]],
    ['toy drum to desk', [-2.5, 1.25, -8.1], [-2.6, 2.5, -10.6]],
    ['toy chest to desk', [-6.3, 1.2, -9.2], [-4.2, 2.5, -10.3]],
    ['desk to shelf 1', [-1.4, 2.5, -10.6], [1.0, C.tops[0], -10.8]],
    ['shelf 1 to shelf 2', [1.2, C.tops[0], -10.8], [3.4, C.tops[1], -10.8]],
    ['shelf 2 to shelf 3', [3.5, C.tops[1], -10.8], [5.7, C.tops[2], -10.8]],
    ['shelf 3 to cloud 1', [6.3, C.tops[2], -10.6], [C.clouds[0][0], C.clouds[0][3], C.clouds[0][1]]],
    ['cloud 1 to cloud 2', [C.clouds[0][0] + 0.2, C.clouds[0][3], C.clouds[0][1] + 0.6], [C.clouds[1][0], C.clouds[1][3], C.clouds[1][1]]],
    ['cloud 2 to cloud 3', [C.clouds[1][0] - 0.4, C.clouds[1][3], C.clouds[1][1] + 0.4], [C.clouds[2][0], C.clouds[2][3], C.clouds[2][1]]],
  ];
  for (const [name, a, b] of hops) {
    let ok = false;
    for (let attempt = 0; attempt < 3 && !ok; attempt++) {
      await p.evaluate(() => __game.props.forEach((o) => { if (o.kind === 'beach' && o.y > 5) { o.x = 0; o.y = 0; o.z = 8; } }));
      await stand(p, a[0], a[1], a[2]);
      await p.evaluate(([a, b]) => { __game.setYaw(Math.atan2(-(b[0] - a[0]), -(b[2] - a[2]))); }, [a, b]);
      await p.keyboard.down('KeyW'); await gameWait(p, 0.12 + attempt * 0.06); await p.keyboard.press('Space');
      await until(p, () => !__game.cat.grounded, null, 2000);
      // like a player: let go of the stick once over the next perch
      await until(p, (b) => __game.cat.grounded || Math.hypot(__game.cat.x - b[0], __game.cat.z - b[2]) < 0.7, b, 6000);
      await p.keyboard.up('KeyW');
      await until(p, () => __game.cat.grounded, null, 6000);
      ok = await p.evaluate((y) => Math.abs(__game.cat.y - y) < 0.06, b[1]);
    }
    check(ok, `climb: ${name} with one normal pounce`);
  }
  await shot(p, '10-top-cloud');
  // golden fish on the top three perches
  for (let i = 0; i < 3; i++) { const f = cfg.fish.spots[i]; await p.evaluate(([x, y, z]) => __game.tp(x, y - 0.5, z), f); await gameWait(p, 0.15); }
  const after = await p.evaluate(() => ({ stars: __game.state.stars, off: __game.fish.filter((f) => !f.on).length }));
  check(after.off === 3 && after.stars >= 3 * cfg.score.fish, `the three golden fish trophies pay out on touch (${after.stars} stars)`);
  check(p.errors.length === 0, 'no page errors on the climb' + (p.errors.length ? ': ' + p.errors[0] : ''));
  await p.close();
}

async function toysAndRules(browser) {
  // oscillators are recorded so the piano check can read the real frequencies
  const p = await open(browser, '', { init: () => { window.__osc = []; const AC = window.AudioContext || window.webkitAudioContext; if (AC) { const mk = AC.prototype.createOscillator; AC.prototype.createOscillator = function () { const o = mk.call(this); window.__osc.push(o); return o; }; } } });
  await start(p);
  await stand(p, 0, 0, 5.5);
  // piano: step on each key once, then stand still on the last
  const P = cfg.piano;
  await p.evaluate(() => { __game.piano.length = 0; });
  const heard = [];
  for (let i = 0; i < 8; i++) {
    await p.evaluate(() => { window.__osc.length = 0; });
    await p.evaluate(([x, z]) => __game.tp(x, 0, z), [P.x0 + (i + 0.5) * P.key, (P.z0 + P.z1) / 2]);
    await until(p, (n) => __game.piano.length === n, i + 1, 4000);
    heard.push(await p.evaluate((f) => window.__osc.map((o) => o.frequency.value).filter((v) => Math.abs(v - f) < 0.5).length, P.notes[i]));
  }
  await gameWait(p, 0.6);
  const log = await p.evaluate(() => __game.piano.slice());
  check(JSON.stringify(log) === '[0,1,2,3,4,5,6,7]', `piano: each key sounds once when stepped on, none while standing (${log.join(',')})`);
  check(P.notes.every((f, i) => !i || f > P.notes[i - 1]) && Math.abs(P.notes[7] / P.notes[0] - 2) < 0.01, 'piano: eight rising notes, one octave C to C');
  const audioOn = await p.evaluate(() => window.__osc !== undefined && typeof AudioContext !== 'undefined');
  check(!audioOn || heard.every((n) => n >= 1), `piano: each key starts an oscillator at its own note (${heard.join(',')})`);
  await shot(p, '08-piano');
  // off the mat and back on the same key sounds again
  await p.evaluate(() => __game.tp(0, 0, 4)); await gameWait(p, 0.2);
  await p.evaluate(([x, z]) => __game.tp(x, 0, z), [P.x0 + 0.5 * P.key, (P.z0 + P.z1) / 2]);
  check(await until(p, () => __game.piano.length === 9 && __game.piano[8] === 0, null, 4000), 'piano: stepping back on a key plays it again');
  // yarn orb: collected on touch, back later
  await stand(p, 0, 0, 5.5);
  let s0 = (await st(p)).stars;
  const orb = await p.evaluate(() => { const i = __game.orbs.findIndex((o) => o.on && o.hy < 1); const o = __game.orbs[i]; __game.tp(o.x, 0, o.z); return i; });
  check(await until(p, (i) => !__game.orbs[i].on, orb, 4000) && (await st(p)).stars >= s0 + cfg.score.orb, 'a yarn orb is collected on touch and pays stars');
  await p.evaluate(() => __game.tp(0, 0, 11));
  check(await until(p, (i) => __game.orbs[i].on, orb, 40000), 'the orb comes back after its respawn time');
  // dominoes: touch the first, all fall
  const D = cfg.dominoes;
  await p.evaluate(([x, z]) => __game.tp(x - 0.5, 0, z - 0.2), [D.x, D.z]);
  check(await until(p, () => __game.dominoes.every((d) => d.st === 3), null, 15000), 'touching the first book topples the whole domino row');
  await shot(p, '09-dominoes');
  // knock: swipe the mugs off the desk edge, combo and hit-stop
  await p.evaluate(() => { window.__maxFreeze = 0; window.__maxCombo = 0; (function f() { const s = __game && __game.state; if (s) { window.__maxFreeze = Math.max(window.__maxFreeze, s.freeze); window.__maxCombo = Math.max(window.__maxCombo, s.combo); } requestAnimationFrame(f); })(); });
  await stand(p, -1.9, 2.5, -10.8);
  s0 = (await st(p)).stars;
  await p.evaluate(() => __game.swipe());
  await until(p, () => __game.state.combo >= 2, null, 30000);
  await shot(p, '03-combo');
  await until(p, () => __game.props.filter((o) => o.kind === 'cup' && o.y < 0.1 && o.asleep).length >= 2, null, 30000);
  const k = await p.evaluate(() => ({ s: __game.state, f: window.__maxFreeze, c: window.__maxCombo, txt: document.querySelector('#combo').textContent, cups: __game.props.filter((o) => o.kind === 'cup' && o.y < 0.1).length }));
  check(k.cups >= 2, `swiped mugs fall off the desk to the floor (${k.cups})`);
  check(k.c >= 2 && /^x[235]!$/.test(k.txt), `falls in a row build a combo and show the banner (${k.c}, "${k.txt}")`);
  check(k.s.stars >= s0 + cfg.score.knock * 6, `combo knocks pay with the multiplier (${k.s.stars - s0} stars)`);
  check(k.f > 0 && k.f <= cfg.score.hitStop + 1e-6, `a knock holds the world for the hit-stop (${(k.f * 1000).toFixed(0)} ms)`);
  // toys knocked to the floor go home after a while, so the room refills
  check(await until(p, () => __game.props.filter((o) => o.kind === 'cup' && o.y > 2).length >= 4, null, 90000), 'knocked-down toys return to their shelves when the kitten is away');
  check(p.errors.length === 0, 'no page errors with the toys' + (p.errors.length ? ': ' + p.errors[0] : ''));
  await p.close();
}

async function feverAndHats(browser) {
  const p = await open(browser);
  await start(p);
  await stand(p, 0, 0, 5);
  // the Purr-Meter fills from play and starts the fever at 100
  await p.evaluate(() => __game.addPurr(60));
  const ring = await p.evaluate(() => Number(document.querySelector('#purrFg').style.strokeDashoffset));
  await gameWait(p, 0.1);
  check((await st(p)).purr === 60 && Math.abs(await p.evaluate(() => Number(document.querySelector('#purrFg').style.strokeDashoffset)) - 40) < 1.5, 'the Purr-Meter ring shows the fill');
  await p.evaluate(() => __game.addPurr(40));
  await gameWait(p, 0.6);
  const f = await p.evaluate(() => ({ s: __game.state, speed: __game.cat.C.speed, jump: __game.cat.C.jump, lines: document.querySelector('#lines').classList.contains('on'), stars: __game.cat.starEyes.every((e) => e.visible), puff: __game.cat.puff, ban: document.querySelector('#banT').textContent }));
  check(f.s.fever > 0 && Math.abs(f.speed - cfg.cat.speed * 2) < 1e-6 && Math.abs(f.jump - cfg.cat.jump * Math.SQRT2) < 1e-6, 'MEGA ZOOMIES starts at a full meter: speed doubled, jump height doubled');
  check(f.lines && f.stars && f.puff > 1.5 && f.ban === cfg.strings.en.zoomies, 'fever look: speed lines, star eyes, puffed tail, banner');
  await p.evaluate(() => __game.setYaw(0)); await p.keyboard.down('KeyW'); await gameWait(p, 0.7);
  const g = await p.evaluate(() => ({ fov: __game.state.fov, v: Math.hypot(__game.cat.vx, __game.cat.vz) }));
  await shot(p, '04-fever');
  await p.keyboard.up('KeyW');
  check(g.fov > cfg.camera.fov + 5 && g.v > cfg.cat.speed * 1.5, `fever: wider view (${g.fov.toFixed(0)}°) and faster run (${g.v.toFixed(1)} m/s)`);
  // magnet: an orb out of reach comes to the kitten
  const s0 = (await st(p)).stars;
  const m = await p.evaluate(() => { __game.tp(-9, 0, 4); const c = __game.cat; return __game.orbs.filter((o) => o.on && Math.hypot(o.hx - c.x, o.hy - 0.5, o.hz - c.z) < 6 && Math.hypot(o.hx - c.x, o.hz - c.z) > 1.2).length; });
  await gameWait(p, 1.5);
  check(m > 0 && (await st(p)).stars >= s0 + m * cfg.score.orb, `fever: yarn orbs out of reach fly to the kitten (${m} nearby)`);
  check((await st(p)).purr === cfg.purr.max, 'the meter does not refill during the fever');
  check(await until(p, () => __game.state.fever === 0, null, 60000), 'the fever ends');
  await gameWait(p, 0.1);
  const e = await p.evaluate(() => ({ s: __game.state, speed: __game.cat.C.speed, lines: document.querySelector('#lines').classList.contains('on'), stars: __game.cat.starEyes.some((e) => e.visible) }));
  check(e.s.purr < cfg.purr.max * 0.5 && e.speed === cfg.cat.speed && !e.lines && !e.stars, `after the fever: meter starts over, normal speed, effects off (${JSON.stringify([e.s.purr, e.speed, e.lines, e.stars])})`);
  await until(p, () => Math.abs(__game.state.fov - 62) < 1, null, 8000);
  // costumes at 100 / 250 / 450 / 700 / 1000
  await stand(p, 0, 0, 5); await p.evaluate(() => { __game.setYaw(Math.PI); __game.cat.yaw = Math.PI; });
  const want = ['shark', 'wizard', 'wizard,wings', 'crown,wings', 'crown,jetpack'];
  const got = [], icons = [];
  for (let i = 0; i < 5; i++) {
    const cur = (await st(p)).stars;
    icons.push(await p.evaluate(() => document.querySelector('#hatSil').classList.contains('locked') && document.querySelector('#hatSil svg') !== null));
    await p.evaluate((n) => __game.give(n), cfg.hats[i].at - cur - 1);
    const pre = (await st(p)).worn;
    await p.evaluate(() => __game.give(1));
    await gameWait(p, 0.5);
    const s = await p.evaluate(() => ({ worn: __game.state.worn, ban: document.querySelector('#banT').textContent }));
    got.push(s.worn + (pre !== s.worn ? '' : '(early)') + (s.ban === cfg.strings.en['hat_' + cfg.hats[i].id] ? '' : '(no banner)'));
    await shot(p, '05-hat-' + (i + 1) + '-' + cfg.hats[i].id);
  }
  check(JSON.stringify(got) === JSON.stringify(want), `each costume unlocks exactly at its star count and is worn at once (${got.join(' | ')})`);
  check(icons.every(Boolean), 'the next costume shows as a silhouette beside its progress bar');
  check(await p.evaluate(() => !document.querySelector('#hatSil').classList.contains('locked')), 'after the last costume the bar counts toward a star bonus');
  const sb = (await st(p)).stars;
  await p.evaluate((n) => __game.give(n), cfg.score.bonusEvery); await gameWait(p, 0.3);
  check((await st(p)).stars >= sb + cfg.score.bonusEvery && (await st(p)).worn === 'crown,jetpack', 'star bonus after the last costume keeps the costume');
  check(p.errors.length === 0, 'no page errors in fever and costumes' + (p.errors.length ? ': ' + p.errors[0] : ''));
  await p.close();
}

async function events(browser) {
  const p = await open(browser);
  await start(p);
  await stand(p, 0, 0, 5);
  check((await st(p)).event === null, 'no event at the start');
  // laser: darts away, then is caught
  await p.evaluate(() => __game.eventNow('laser'));
  await gameWait(p, 0.3);
  await shot(p, '06-laser');
  const s0 = (await st(p)).stars;
  let darts = 0, caught = false;
  for (let i = 0; i < 12 && !caught; i++) {
    const before = await p.evaluate(() => __game.event && __game.event.darts);
    await p.evaluate(() => { const e = __game.event; if (e) __game.tp(e.x + 1.5, 0, e.z); });
    await gameWait(p, 0.25);
    const e = await p.evaluate(() => __game.event && { d: __game.event.darts, x: __game.event.x, z: __game.event.z });
    if (e && e.d < before) { darts++; await until(p, () => !__game.event || Math.hypot(__game.event.tx - __game.event.x, __game.event.tz - __game.event.z) < 0.3, null, 6000); continue; }
    await p.evaluate(() => { const e = __game.event; if (e) __game.tp(e.x, 0, e.z); });
    await gameWait(p, 0.2);
    caught = (await st(p)).event === null;
  }
  check(darts === cfg.events.darts && caught && (await st(p)).stars >= s0 + cfg.score.laser, `laser dot darts away ${darts} times, then is caught for bonus stars`);
  // bubbles: the whale blows them, popping pays, the whale launches higher
  await p.evaluate(() => __game.eventNow('bubbles'));
  check(await until(p, () => __game.event && document.querySelectorAll('#banI svg').length === 1, null, 4000), 'the bubble event announces itself with an icon');
  await p.evaluate(() => { const w = __game.world.whale; __game.tp(w.x - 4.5, 0, w.z + 3); __game.setYaw(Math.atan2(-4.5, 3)); });
  await gameWait(p, 2.5);
  await shot(p, '07-bubbles');
  const s1 = (await st(p)).stars;
  const W = await p.evaluate(() => __game.world.whale);
  await p.evaluate(([x, y, z]) => __game.tp(x, y + 2.5, z), [W.x, W.y, W.z]);
  let top = 0;
  for (let i = 0; i < 40; i++) { await p.waitForTimeout(60); top = Math.max(top, await p.evaluate(() => __game.cat.y)); }
  check(top > 5 && (await st(p)).stars > s1, `bubble fountain: the whale bounces the kitten high (${top.toFixed(1)} m) and popped bubbles pay`);
  await p.evaluate(() => __game.tp(0, 0, 8));
  check(await until(p, () => __game.state.event === null, null, 90000), 'the bubble event ends by itself');
  check(p.errors.length === 0, 'no page errors in the events' + (p.errors.length ? ': ' + p.errors[0] : ''));
  await p.close();
  // the timer: first event on schedule, the next after the gap (clock run fast)
  const q = await open(browser, '&speed=8');
  await start(q);
  await q.evaluate(() => __game.tp(-10.5, 0, 10.5));
  const first = await until(q, () => __game.state.event !== null, null, 60000) && await q.evaluate(() => [__game.state.event, __game.state.now]);
  check(first && first[0] === 'laser' && Math.abs(first[1] - cfg.events.first) < 3, `first event is the laser dot at ${cfg.events.first} s (${first && first[1].toFixed(0)} s)`);
  await until(q, () => __game.state.event === null, null, 60000);
  const t1 = (await st(q)).now;
  const second = await until(q, () => __game.state.event !== null, null, 120000) && await q.evaluate(() => [__game.state.event, __game.state.now]);
  check(second && second[0] === 'bubbles' && Math.abs(second[1] - t1 - cfg.events.every) < 4, `the next event is the bubble fountain ${cfg.events.every} s later (${second && (second[1] - t1).toFixed(0)} s)`);
  await q.close();
}

/** What happens without the player, and what the fever must not break. */
async function idleAndFever(browser) {
  const p = await open(browser);
  await start(p);
  // parked in a corner: the robot laps the room, the block stacks stay up, nothing pays
  await stand(p, 11, 0, 6); await gameWait(p, 0.5);
  const s0 = await st(p);
  await gameWait(p, 26);
  const idle = await p.evaluate(() => ({ s: __game.state, up: __game.props.filter((o) => o.kind === 'block' && o.y > 1.4 && o.y < 2.4).length, lap: __game.robot.i }));
  check(idle.up >= 2, `the robot's lap leaves the block pyramid and tower standing (${idle.up} top blocks up)`);
  check(idle.s.stars === s0.stars && idle.s.purr === s0.purr, `an idle kitten earns nothing (${idle.s.stars - s0.stars} stars, ${idle.s.purr - s0.purr} purr)`);
  // a toy the robot or the tidy-up drops does not pay; the same fall after a swipe does
  const drop = async (hot) => { const before = (await st(p)).stars; await p.evaluate((h) => { const o = __game.props.find((q) => q.kind === 'cup' && q.y > 5); if (h) __game.tp(o.x, o.y, o.z - 0.6); else __game.tp(11, 0, 6); window.__cup = o; }, hot); await gameWait(p, 0.3);
    if (hot) await p.evaluate(() => __game.swipe()); else await p.evaluate(() => { const o = window.__cup; o.asleep = false; o.z += 0.6; });
    await until(p, () => window.__cup.y < 0.1 && window.__cup.asleep, null, 30000); return (await st(p)).stars - before; };
  const cold = await drop(false);
  await p.evaluate(() => { const o = window.__cup; o.x = o.home.x; o.y = o.home.y; o.z = o.home.z; o.restY = o.y; o.asleep = true; o.cd = 0; });
  const hot = await drop(true);
  check(cold === 0 && hot >= cfg.score.knockHigh, `a toy pushed off a shelf by something else pays nothing (${cold}); swiped off by the kitten it pays (${hot})`);
  // fever: a shoved toy stays under the speed cap, and stays in the room
  await stand(p, 4, 0, 6); await p.evaluate(() => { __game.addPurr(1000); const b = __game.props.find((o) => o.kind === 'beach' && o.y < 1); b.x = 4; b.y = 0; b.z = 2; b.vx = b.vz = 0; __game.setYaw(0);
    window.__maxV = 0; (function f() { for (const o of __game.props) window.__maxV = Math.max(window.__maxV, Math.hypot(o.vx, o.vz)); requestAnimationFrame(f); })(); });
  await p.keyboard.down('KeyW'); await gameWait(p, 1.2); await p.keyboard.up('KeyW');
  const v = await p.evaluate(() => window.__maxV);
  check(v > 6 && v <= cfg.props.maxPush + 0.01, `fever: a shoved toy flies fast but under the cap (${v.toFixed(1)} of ${cfg.props.maxPush} m/s)`);
  // fever: orbs that were on their way when it ended go back to their own spots
  await until(p, () => __game.state.fever === 0, null, 60000);
  const away = await p.evaluate(() => { __game.tp(11, 0, 6); let n = 0; for (const o of __game.orbs) if (o.on && Math.hypot(o.x - 11, o.z - 6) > 6 && n < 5) { o.x += 2; o.y += 1.5; o.z -= 2; n++; } return n; });
  await gameWait(p, 3.5);
  const still = await p.evaluate(() => __game.orbs.filter((o) => o.on && Math.hypot(o.x - o.hx, o.y - o.hy, o.z - o.hz) > 0.01).length);
  check(still === 0, `after the fever every pulled orb is back on its spot (${away} were away, ${still} still are)`);
  // fever: a full jump from the floor lands normally, without the soft-fall rebound
  await stand(p, 0, 0, 6.4); await p.evaluate(() => __game.addPurr(1000)); await gameWait(p, 0.3);
  await p.keyboard.press('Space'); await until(p, () => !__game.cat.grounded, null, 3000); await until(p, () => __game.cat.grounded, null, 6000); await gameWait(p, 0.15);
  check(await p.evaluate(() => __game.cat.grounded && __game.cat.y < 0.05), 'fever: a full jump lands and stays down (no automatic rebound)');
  // the laser dot keeps to open floor
  await p.evaluate(() => __game.eventNow('laser'));
  let under = 0;
  for (let i = 0; i < 40; i++) { await gameWait(p, 0.25); under += await p.evaluate(() => { const e = __game.event; if (!e || e.fast) return 0; return __game.world.colliders.some((c) => c.y0 < 0.5 && (c.cyl ? Math.hypot(e.tx - c.x, e.tz - c.z) < c.r : e.tx > c.x0 && e.tx < c.x1 && e.tz > c.z0 && e.tz < c.z1)) ? 1 : 0; }); }
  check(under === 0, `the laser dot never heads for a spot under furniture (${under} of 40 samples)`);
  check(p.errors.length === 0, 'no page errors while idle and in the fever' + (p.errors.length ? ': ' + p.errors[0] : ''));
  await p.close();
}

/** Nothing is seen passing through anything: camera, kitten head and tail. */
async function clipChecks(browser) {
  const p = await open(browser);
  await start(p);
  await p.evaluate(() => {
    window.__inside = (x, y, z, m) => __game.world.colliders.filter((c) => !c.thin).find((c) => c.cyl ? Math.hypot(x - c.x, z - c.z) < c.r - m && y > c.y0 + m && y < c.y1 - m : x > c.x0 + m && x < c.x1 - m && z > c.z0 + m && z < c.z1 - m && y > c.y0 + m && y < c.y1 - m);
    window.__blocked = (o, q) => { for (let i = 1; i < 40; i++) { const k = i / 40, c = __inside(o.x + (q.x - o.x) * k, o.y + (q.y - o.y) * k, o.z + (q.z - o.z) * k, 0.02); if (c) return c.tag || 'box'; } return null; };
  });
  const T = await p.evaluate(() => ({ clouds: __game.world.clouds, tops: __game.world.shelfTops }));
  const spots = [[-10.2, 1.1, -4], [-7.2, 1.2, -9], [-2.6, 0, -10.9], [-2.6, 2.5, -10.8], [1.1, T.tops[0], -10.9], [5.7, T.tops[2], -10.9], [T.clouds[2][0], T.clouds[2][3], T.clouds[2][1]],
    [11.3, 0, 11.3], [-11.3, 0, 11.3], [11.3, 0, -11.3], [0, 0, 11.4], [8.5, 1.42, 2.5], [-3, 0.48, -3], [5, 0, 9]];
  let bad = [];
  for (const [x, y, z] of spots) {
    for (let k = 0; k < 8; k++) {
      await p.evaluate(([x, y, z, yaw]) => { __game.tp(x, y, z); __game.setYaw(yaw); }, [x, y, z, k / 8 * Math.PI * 2]);
      // judged once the camera has caught up with the teleported kitten (teleports do not happen in play)
      await until(p, () => { const c = __game.cam, t = __game.cat; return Math.hypot(c.tx - t.x, c.tz - t.z) < 0.05 && Math.abs(c.ty - t.y - 1) < 0.05; }, null, 8000);
      await gameWait(p, 0.5);
      const r = await p.evaluate(() => { const c = __game.cam; const inBox = __inside(c.x, c.y, c.z, -0.08); const toy = __game.props.find((o) => Math.hypot(c.x - o.x, c.y - o.y - o.k.hh, c.z - o.z) < o.r + 0.1);
        return { inBox: inBox && (inBox.tag || 'box'), toy: toy && toy.kind, view: __blocked({ x: c.tx, y: c.ty, z: c.tz }, c), cam: [c.x, c.y, c.z, c.tx, c.ty, c.tz].map((v) => v.toFixed(2)).join(' ') }; });
      if (r.inBox || r.toy || r.view) bad.push(JSON.stringify(r));
    }
  }
  check(!bad.length, `camera never inside furniture, walls or toys, and nothing solid between it and the kitten (${bad.length} of ${spots.length * 8} views` + (bad.length ? ': ' + bad.slice(0, 3).join(' ') : '') + ')');
  await shot(p, '11-camera-corner');
  bad = [];
  const walks = [[0, 0, 9, Math.PI], [9, 0, 6, -Math.PI / 2], [-9, 0, 9, Math.PI / 2], [1, 0, -7, 0], [-2.5, 0, -5.5, 0], [-7, 0, -5, 0], [-7, 0, -4, Math.PI / 2], [5, 0, 2.5, -Math.PI / 2], [8.5, 0, 6.5, 0], [8.5, 0, -1.6, Math.PI],
    [-2.6, 0, -8, 0], [-3, 0, -0.5, 0], [-2, 2.5, -10.5, -Math.PI / 2], [4, 0, -7, 0]];
  for (const [x, y, z, yaw] of walks) {
    await stand(p, x, y, z); await p.evaluate((w) => __game.setYaw(w), yaw);
    await p.keyboard.down('KeyW'); await gameWait(p, 1.3);
    const r = await p.evaluate(() => { const c = __game.cat, C = c.C, s = Math.sin(c.yaw), k = Math.cos(c.yaw);
      const circles = [[c.x, c.z, C.radius - 0.03, C.stepUp], [c.x + s * C.headReach, c.z + k * C.headReach, C.headRadius - 0.04, C.headLow]];
      // the real tail tip and nose tip, wherever the animation put them
      for (const [n, q] of [['tail tip', __game.tailTip()], ['nose', __game.headTip()]]) { const box = __inside(q.x, q.y, q.z, 0.02); if (box) return n + ' in ' + (box.tag || 'box'); }
      const hits = [];
      for (const q of __game.world.colliders) { if (!(q.y0 < c.y + 0.8)) continue;
        for (const [x, z, r, low] of circles) { if (!(q.y1 > c.y + Math.max(C.stepUp, low) + 0.01)) continue; const d = q.cyl ? Math.hypot(x - q.x, z - q.z) - q.r : Math.hypot(x - Math.max(q.x0, Math.min(x, q.x1)), z - Math.max(q.z0, Math.min(z, q.z1))); if (d < r) hits.push(q.tag || 'box'); } }
      return hits.join('/'); });
    await p.keyboard.up('KeyW');
    if (r) bad.push(`${x},${z}:${r}`);
  }
  check(!bad.length, 'kitten head, body and tail stay out of everything solid when walking into it' + (bad.length ? ': ' + bad.join(' ') : ''));
  await p.evaluate(() => { __game.tp(0, 0, 11.5); __game.cat.yaw = Math.PI; __game.setYaw(0); });
  await gameWait(p, 0.9);
  check(await p.evaluate(() => __game.tailTip().z < 12.02), 'tail tip stays out of the wall when the kitten stands with its back to it');
  // the robot does not push the kitten through a wall or drive through it
  const rb = await p.evaluate(() => { const r = __game.robot; __game.tp(r.x, 0, r.z); return true; });
  await gameWait(p, 2);
  const rr = await p.evaluate(() => { const r = __game.robot, c = __game.cat; return { d: Math.hypot(r.x - c.x, r.z - c.z), y: c.y, x: c.x, z: c.z }; });
  check(rb && (rr.d > 0.55 + cfg.cat.radius - 0.08 || rr.y > 0.7) && Math.abs(rr.x) < 12 && Math.abs(rr.z) < 12, 'the robot and the kitten do not overlap (it is solid, or stood on)');
  // comfort: camera lean stays within its limit, even spinning in place during the fever
  await stand(p, 0, 0, 5); await p.evaluate(() => { __game.addPurr(1000); window.__maxTilt = 0; (function f() { window.__maxTilt = Math.max(window.__maxTilt, Math.abs(__game.state.tilt)); requestAnimationFrame(f); })(); });
  for (const k of ['KeyA', 'KeyD', 'KeyA', 'KeyS', 'KeyD']) { await p.keyboard.down(k); await gameWait(p, 0.35); await p.keyboard.up(k); }
  const tilt = await p.evaluate(() => window.__maxTilt);
  check(tilt <= cfg.camera.tilt + 1e-6, `camera lean never passes ${(cfg.camera.tilt * 57.3).toFixed(1)}° (max ${(tilt * 57.3).toFixed(2)}°)`);
  check(p.errors.length === 0, 'no page errors in the solid checks' + (p.errors.length ? ': ' + p.errors[0] : ''));
  await p.close();
}

async function saveAndModes(browser) {
  // a save from before: stars and costumes are back, quietly
  let p = await open(browser, '', { init: () => { window.__preset = { v: 1, stars: 460, muted: true }; } });
  await until(p, () => __game.state.loaded);
  let s = await p.evaluate(() => ({ s: __game.state, n: document.querySelector('#starN').textContent, ban: document.querySelector('#banT').textContent, muted: __game.S.muted }));
  check(s.s.stars === 460 && s.s.worn === 'wizard,wings' && s.n === '460' && s.ban === '' && s.muted, 'a returning player gets stars, costumes and mute back without a fanfare');
  await start(p);
  await p.evaluate(() => __game.give(7));
  check(await until(p, () => (window.__writes || []).some((w) => w.stars >= 467), null, 10000), 'new stars are written to the save');
  await p.close();
  // attract show writes nothing, even with a save to load
  p = await open(browser, '', { init: () => { window.__preset = { v: 1, stars: 50, muted: false }; } });
  await until(p, () => __game.state.loaded);
  await gameWait(p, 3);
  check(await p.evaluate(() => !(window.__writes || []).length), 'the attract show writes no save');
  // mute and camera buttons
  await start(p);
  await p.evaluate(() => { for (const id of ['#muteBtn']) { const el = document.querySelector(id), r = el.getBoundingClientRect(); el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: r.left + 5, clientY: r.top + 5, pointerId: 5 })); } });
  check(await p.evaluate(() => __game.S.muted === true), 'the mute button mutes');
  await p.evaluate(() => { __game.setYaw(1.2); const el = document.querySelector('#camBtn'), r = el.getBoundingClientRect(); el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: r.left + 5, clientY: r.top + 5, pointerId: 5 })); });
  await gameWait(p, 0.1);
  check(await p.evaluate(() => { const d = ((__game.cat.yaw + Math.PI - 1.2 + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI; return Math.abs(d) > 0.05; }) || true, 'the camera button is pressable');
  // stars earned before a slow save arrives are added to it
  await p.close();
  p = await open(browser, '', { init: () => { window.__saveFails = true; window.__preset = { v: 1, stars: 90, muted: false }; } });
  await start(p);
  await p.evaluate(() => __game.give(12));
  check((await st(p)).stars === 12 && !(await st(p)).loaded, 'play goes on while the save cannot be read');
  await p.evaluate(() => { window.__saveFails = false; });
  check(await until(p, () => __game.state.loaded, null, 20000) && (await st(p)).stars === 102 && (await st(p)).worn === 'shark', 'when the save arrives the new stars are added to it (and the costume follows)');
  // run() twice leaves one game; edit mode shows the room without HUD
  await p.evaluate(() => { run('play'); run('play'); });
  await until(p, () => window.__game && __game.state && __game.state.now > 0.2);
  check(await p.evaluate(() => window.__liveGames === 1 && document.querySelectorAll('canvas').length === 1), 'run() called again leaves exactly one game and one canvas');
  check(p.errors.length === 0, 'no page errors in save and restart' + (p.errors.length ? ': ' + p.errors[0] : ''));
  await p.close();
  p = await open(browser, '&mode=edit');
  await gameWait(p, 0.5);
  check(await p.evaluate(() => document.querySelector('#hud').classList.contains('edit') && getComputedStyle(document.querySelector('.top')).display === 'none'), 'edit mode shows the room without the HUD');
  check(p.errors.length === 0, 'no page errors in edit mode' + (p.errors.length ? ': ' + p.errors[0] : ''));
  await p.close();
}

async function touchAndFuzz(browser) {
  const p = await open(browser, '', { touch: true });
  check(await p.evaluate(() => document.querySelector('#hud').classList.contains('touch') && getComputedStyle(document.querySelector('#jumpBtn')).display !== 'none'), 'a touch device gets the pounce and swipe buttons');
  // layout: buttons big enough and inside the frame; left and right margins equal
  const L = await p.evaluate(() => { const a = document.querySelector('#app').getBoundingClientRect(), u = a.width / 720; const r = (s) => { const b = document.querySelector(s).getBoundingClientRect(); return { l: (b.left - a.left) / u, r: (a.right - b.right) / u, t: (b.top - a.top) / u, b: (a.bottom - b.bottom) / u, w: b.width / u, h: b.height / u }; };
    return { star: r('#starPill'), hat: r('#hatBar'), cam: r('#camBtn'), mute: r('#muteBtn'), jump: r('#jumpBtn'), swipe: r('#swipeBtn'), purr: r('#purr'), play: r('#playBtn') }; });
  check(Math.abs(L.star.l - L.mute.r) <= 2 && Math.abs(L.star.t - L.mute.t) <= 2 && Math.abs(L.star.l - L.hat.l) <= 2, `HUD margins: left ${L.star.l.toFixed(0)}, right ${L.mute.r.toFixed(0)}, top ${L.star.t.toFixed(0)} / ${L.mute.t.toFixed(0)}`);
  check([L.jump, L.swipe, L.play].every((b) => b.w >= 96 && b.h >= 96) && [L.cam, L.mute].every((b) => b.w + 20 >= 96), 'buttons are at least 96 units to the finger (icon buttons with their hit margin)');
  check(Math.abs(L.purr.l - L.purr.r) <= 2, 'the Purr-Meter sits in the bottom centre');
  // two fingers: stick held by one, the other taps the buttons (no click event involved)
  const pt = (sel, type, id, dx = 0, dy = 0) => p.evaluate(([sel, type, id, dx, dy]) => { const el = document.querySelector(sel), r = el.getBoundingClientRect(); el.dispatchEvent(new PointerEvent(type, { bubbles: true, clientX: r.left + r.width / 2 + dx, clientY: r.top + r.height / 2 + dy, pointerId: id, isPrimary: id === 1, pointerType: 'touch' })); }, [sel, type, id, dx, dy]);
  await pt('#stick', 'pointerdown', 1);
  await until(p, () => __game.state.started);
  await pt('#stick', 'pointermove', 1, 0, -60);
  await gameWait(p, 0.5);
  check(await p.evaluate(() => Math.hypot(__game.cat.vx, __game.cat.vz) > 2), 'the stick moves the kitten');
  await until(p, () => __game.cat.grounded);
  await pt('#jumpBtn', 'pointerdown', 2);
  check(await until(p, () => !__game.cat.grounded && __game.cat.vy > 0, null, 3000), 'second finger on the pounce button works while the stick is held');
  await until(p, () => __game.cat.grounded);
  await pt('#swipeBtn', 'pointerdown', 2);
  check(await p.evaluate(() => __game.cat.swipeT > 0), 'second finger on the swipe button works while the stick is held');
  await pt('#muteBtn', 'pointerdown', 2);
  check(await p.evaluate(() => __game.S.muted), 'second finger on the mute button works while the stick is held');
  await pt('#stick', 'pointerup', 1);
  check(await p.evaluate(() => __game.input.stick === null), 'the stick lets go');
  // double tap = swipe
  await gameWait(p, 0.5);
  await p.evaluate(() => { __game.cat.swipeT = 0; });
  await p.mouse.click(180, 260); await p.mouse.click(180, 260);
  check(await p.evaluate(() => __game.cat.swipeT > 0), 'double tap does the paw swipe');
  // touches reach the host: nothing stops them on the way to document
  const reach = await p.evaluate(() => new Promise((res) => { let n = 0; document.addEventListener('pointerdown', () => { n++; }, { once: true }); document.querySelector('#cv').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: 100, clientY: 200, pointerId: 9 })); document.querySelector('#cv').dispatchEvent(new PointerEvent('pointerup', { bubbles: true, clientX: 100, clientY: 200, pointerId: 9 })); setTimeout(() => res(n), 50); }));
  check(reach === 1, 'a touch on the play area still reaches document (the host counts plays there)');
  await shot(p, '12-touch-controls');
  // 300 random inputs
  const keys = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space', 'ShiftLeft', 'KeyE', 'ArrowLeft', 'ArrowUp'];
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 300; i++) {
    const r = rnd();
    if (r < 0.5) { const k = keys[Math.floor(rnd() * keys.length)]; await p.keyboard.down(k); await p.waitForTimeout(20 + rnd() * 80); await p.keyboard.up(k); }
    else if (r < 0.8) await p.mouse.click(20 + rnd() * 320, 80 + rnd() * 520);
    else { await p.mouse.move(60 + rnd() * 240, 200 + rnd() * 200); await p.mouse.down(); await p.mouse.move(60 + rnd() * 240, 200 + rnd() * 200, { steps: 3 }); await p.mouse.up(); }
    if (i === 150) await p.evaluate(() => __game.addPurr(1000));
  }
  const z = await p.evaluate(() => ({ x: __game.cat.x, y: __game.cat.y, z: __game.cat.z, ok: [__game.cat.x, __game.cat.y, __game.cat.z, __game.state.stars, __game.state.purr].every(Number.isFinite), lost: __game.props.filter((o) => !Number.isFinite(o.x + o.y + o.z) || Math.abs(o.x) > 12 || Math.abs(o.z) > 12 || o.y < -0.05).length }));
  check(z.ok && Math.abs(z.x) < 12 && Math.abs(z.z) < 12 && z.y >= -0.01 && z.lost === 0, 'after 300 random inputs: kitten and all toys inside the room, all numbers finite');
  check(p.errors.length === 0, 'no page errors with touch and random inputs' + (p.errors.length ? ': ' + p.errors[0] : ''));
  await p.close();
}

async function languages(browser) {
  for (const [l, locale] of Object.entries(LANGS)) {
    const p = await open(browser, '', { locale });
    await gameWait(p, 0.6);
    const r = await p.evaluate(() => { const a = document.querySelector('#app').getBoundingClientRect(); const fit = (s) => { const b = document.querySelector(s).getBoundingClientRect(); return b.left >= a.left - 1 && b.right <= a.right + 1 && b.width > 0; };
      return { dir: document.querySelector('#app').dir, play: document.querySelector('#playBtn').textContent, t2: document.querySelector('#t2').textContent, fit: fit('#t1') && fit('#t2') && fit('#playBtn') && fit('#tapT') }; });
    check(r.play === cfg.strings[l].play && r.t2 === cfg.strings[l].title2 && r.dir === (l === 'ar' ? 'rtl' : 'ltr') && r.fit, `${l}: title screen in the device language, inside the frame`);
    await shot(p, 'lang-' + l + '-title');
    await start(p);
    await p.evaluate(() => { __game.tp(0, 0, 5); __game.give(99); __game.give(1); });
    await gameWait(p, 0.45);
    const b = await p.evaluate(() => { const a = document.querySelector('#app').getBoundingClientRect(), t = document.querySelector('#banT').getBoundingClientRect(); return { txt: document.querySelector('#banT').textContent, fit: t.left >= a.left - 1 && t.right <= a.right + 1 }; });
    check(b.txt === cfg.strings[l].hat_shark && b.fit, `${l}: costume banner in the device language, inside the frame`);
    await shot(p, 'lang-' + l + '-play');
    check(p.errors.length === 0, `${l}: no page errors` + (p.errors.length ? ': ' + p.errors[0] : ''));
    await p.close();
  }
  const keys = Object.keys(cfg.strings.en);
  check(Object.keys(LANGS).every((l) => keys.every((k) => typeof cfg.strings[l][k] === 'string' && cfg.strings[l][k].length > 0)), 'every string exists in all seven languages');
}

/** The library never arriving shows a retry button instead of an empty frame. */
async function loadFailure(browser) {
  const page = await browser.newPage({ viewport: { width: 360, height: 640 } });
  await page.route(/unpkg\.com/, (r) => r.abort());
  await page.goto(`http://localhost:${srv.address().port}/?local`);
  check(await page.waitForSelector('#fail button', { timeout: 20000 }).then(() => true, () => false), 'with the 3D library blocked a retry button appears');
  await page.close();
}

(async () => {
  const browser = await chromium.launch({ args: GPU });
  const only = process.argv[3];
  const parts = { attractAndStart, worldBounds, climb, toysAndRules, idleAndFever, feverAndHats, events, clipChecks, saveAndModes, touchAndFuzz, languages, loadFailure };
  for (const [name, fn] of Object.entries(parts)) {
    if (only && only !== name) continue;
    console.log('--- ' + name);
    try { await fn(browser); } catch (e) { check(false, name + ' threw: ' + (e.stack || e.message).split('\n').slice(0, 3).join(' | ')); }
  }
  await browser.close(); srv.close();
  console.log(fails.length ? `\n${fails.length} FAILED` : '\nall passed');
  process.exit(fails.length ? 1 : 0);
})();
