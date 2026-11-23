// PROTOTYPE - NOT FOR PRODUCTION
// Playtest: serves this folder and plays Paws & Chaos like a child would: the attract show before any touch, the first
// tap, walking, jumping (coyote time, buffer), knocking toys, the red dot, yarn into the basket, fish on the shelf
// path, the garden door, the wardrobe, soft falls, the save (late, failing, from before), edit mode, run() twice,
// two fingers, 600 random inputs and every language. Screens go to the out folder.
// Usage: node playtest.js <out folder>   (Playwright; SwiftShader GPU, so FPS here is not a phone's)
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const out = process.argv[2] || fs.mkdtempSync(path.join(require('os').tmpdir(), 'pac-'));
fs.mkdirSync(out, { recursive: true });
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
  const page = await browser.newPage({ viewport: { width: 360, height: 640 }, deviceScaleFactor: 2, locale: opts.locale || 'en-US', hasTouch: !!opts.touch });
  const errors = [];
  page.on('pageerror', (e) => errors.push((e.stack || e.message).split('\n').slice(0, 3).join(' | ')));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  if (opts.init) await page.addInitScript(opts.init);
  await page.goto(`http://localhost:${srv.address().port}/?local${q}`);
  await page.waitForFunction(() => window.__game && window.__game.state, null, { timeout: 40000 });
  page.errors = errors;
  return page;
}
const st = (p) => p.evaluate(() => __game.state);
const until = (p, fn, arg, t) => p.waitForFunction(fn, arg, { timeout: t || 15000 }).then(() => true, () => false);
/** A finger down on an element (the game acts on pointerdown); fails loudly if the element is hidden. */
const tapEl = async (p, sel) => { const ok = await p.evaluate((s) => { const el = document.querySelector(s); if (!el || !el.offsetParent) return false; const r = el.getBoundingClientRect(); el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2, pointerId: 77 })); el.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 77 })); return true; }, sel); check(ok, 'tap target visible: ' + sel); };
const start = async (p) => { await p.mouse.click(180, 380); await until(p, () => __game.state.started); };

/** Nothing is seen passing through anything: camera, kitten head, toys, basket. */
async function clipChecks(browser) {
  const p = await open(browser);
  await start(p);
  await p.evaluate(() => __game.give(20));
  // in-page geometry helpers: point inside a collider, segment crossing a collider
  await p.evaluate(() => {
    window.__inside = (x, y, z, m) => __game.world.colliders.filter((c) => !(c.gate && __game.world.gardenOpen)).find((c) => c.cyl ? Math.hypot(x - c.x, z - c.z) < c.r - m && y > c.y0 + m && y < c.y1 - m : x > c.x0 + m && x < c.x1 - m && z > c.z0 + m && z < c.z1 - m && y > c.y0 + m && y < c.y1 - m);
    window.__blocked = (o, q) => { for (let i = 1; i < 40; i++) { const k = i / 40, c = __inside(o.x + (q.x - o.x) * k, o.y + (q.y - o.y) * k, o.z + (q.z - o.z) * k, 0.02); if (c) return c.tag || 'box'; } return null; };
  });
  const spots = [[-8.3, 1.2, -2], [-6, 0, -4], [-3.4, 1.6, -7.6], [0.5, 2.6, -10.4], [5, 5.6, -10.6], [7.5, 1.2, -5], [11.2, 0, 4], [-11.2, 0, 11.2], [11.3, 0, -11.2], [0, 0, 11.3], [-7, 0, -11], [0, 0, -14], [-10.5, 2.3, -21.5], [0, 0.72, -20.2], [2, 5.3, -31.5], [13.2, 0, -31.9]];
  let bad = [];
  for (const [x, y, z] of spots) {
    for (let k = 0; k < 8; k++) {
      await p.evaluate(([x, y, z, yaw]) => { __game.tp(x, y, z); __game.setYaw(yaw); }, [x, y, z, k / 8 * Math.PI * 2]);
      // judged once the camera has caught up with the teleported kitten (teleports do not happen in play)
      await until(p, () => { const c = __game.cam, t = __game.cat; return Math.hypot(c.tx - t.x, c.tz - t.z) < 0.05 && Math.abs(c.ty - t.y - 1) < 0.05; }, null, 8000);
      await p.waitForTimeout(500);
      const r = await p.evaluate(() => { const c = __game.cam, cat = __game.cat; const inBox = __inside(c.x, c.y, c.z, -0.08); const inToy = __game.props.some((o) => Math.hypot(c.x - o.x, c.y - o.y - o.k.hh, c.z - o.z) < o.r + 0.1);
        return { inBox: inBox && (inBox.tag || 'box'), inToy, view: __blocked({ x: c.tx, y: c.ty, z: c.tz }, c), cam: [c.x, c.y, c.z, c.tx, c.ty, c.tz].map((v) => v.toFixed(2)).join(' '), yaw: __game.rig ? 0 : 0, at: [cat.x.toFixed(1), cat.y.toFixed(1), cat.z.toFixed(1)] }; });
      if (r.inBox || r.inToy || r.view) bad.push(JSON.stringify(Object.assign(r, { toy: r.inToy && await p.evaluate(() => { const c = __game.cam; const o = __game.props.find((o) => Math.hypot(c.x - o.x, c.y - o.y - o.k.hh, c.z - o.z) < o.r + 0.1); return o && [o.kind, o.x.toFixed(2), o.y.toFixed(2), o.z.toFixed(2), o.asleep, c.x.toFixed(2), c.y.toFixed(2), c.z.toFixed(2)].join(' '); }) })));
    }
  }
  check(!bad.length, `camera never inside furniture, walls or toys, and nothing solid between it and the kitten (${bad.length} of ${spots.length * 8} views` + (bad.length ? ': ' + bad.slice(0, 3).join(' ') : '') + ')');
  await p.screenshot({ path: out + '/13-camera-wall.png' });
  // the kitten's head, body and tail never enter walls, furniture, the fountain rim, flower stems or the dog
  bad = [];
  const walks = [[0, 9, Math.PI], [9, 0, Math.PI / 2], [-9, 7, -Math.PI / 2], [1, -8, 0], [-4, -4, 0], [-5.5, -2, -Math.PI / 2], [6.5, -1.5, 0], [7.6, -1.2, 0], [3.6, -5.2, -Math.PI / 2],
    [-8.3, 1.2, -1], [0, -18.6, 0], [-8, -14.8, 0], [8.2, -29.6, 0], [8.2, -33.3, Math.PI]];
  for (const [x, z, yaw] of walks) {
    await p.evaluate(([x, z, yaw]) => { __game.tp(x, z === -1 ? 1.2 : 0, z === -1 ? -1 : z); __game.setYaw(yaw); }, [x, z, yaw]);
    await p.keyboard.down('KeyW'); await p.waitForTimeout(1400);
    const r = await p.evaluate(() => { const c = __game.cat, C = c.C, s = Math.sin(c.yaw), k = Math.cos(c.yaw);
      const circles = [[c.x, c.z, C.radius - 0.03, C.stepUp], [c.x + s * C.headReach, c.z + k * C.headReach, C.headRadius - 0.04, C.headLow]];
      // the real tail tip and nose tip, wherever the animation put them
      for (const [n, q] of [['tail tip', __game.tailTip()], ['nose', __game.headTip()]]) { const box = __inside(q.x, q.y, q.z, 0.02); if (box) return n + ' in ' + (box.tag || 'box'); }
      const hits = [];
      for (const q of __game.world.colliders) { if (q.gate && __game.world.gardenOpen) continue; if (!(q.y0 < c.y + 0.8)) continue;
        for (const [x, z, r, low] of circles) { if (!(q.y1 > c.y + Math.max(C.stepUp, low) + 0.01)) continue; const d = q.cyl ? Math.hypot(x - q.x, z - q.z) - q.r : Math.hypot(x - Math.max(q.x0, Math.min(x, q.x1)), z - Math.max(q.z0, Math.min(z, q.z1))); if (d < r) hits.push(q.tag || 'box'); } }
      return hits.join('/'); });
    await p.keyboard.up('KeyW');
    if (r) bad.push(`${x},${z}:${r}`);
  }
  check(!bad.length, 'kitten head, body and tail stay out of everything solid when walking into it' + (bad.length ? ': ' + bad.join(' ') : ''));
  // backed up against a wall, the tail curls up instead of going into it
  await p.evaluate(() => { __game.tp(0, 0, 11.5); __game.cat.yaw = Math.PI; __game.setYaw(0); });
  await p.waitForTimeout(900);
  const tip = await p.evaluate(() => { const q = __game.tailTip(); return q.z < 11.98 + 0.02; });
  check(tip, 'tail tip stays out of the wall when the kitten stands with its back to it');
  // walking into the fountain stops at its stone rim
  await p.evaluate(() => { __game.tp(0, 0, -18.4); __game.setYaw(0); });
  await p.keyboard.down('KeyW'); await p.waitForTimeout(1500); await p.keyboard.up('KeyW');
  check(await p.evaluate(() => Math.hypot(__game.cat.x, __game.cat.z + 22.5) > 3.02 + 0.42 - 0.06 || __game.cat.y > 0.8), 'kitten stops at the fountain rim (or hops onto it) instead of walking into the stone');
  // the dog bed is stepped onto, not walked through
  await p.evaluate(() => { __game.tp(7.6, 0, -1.2); __game.setYaw(0); });
  await p.keyboard.down('KeyW'); await p.waitForTimeout(700); await p.keyboard.up('KeyW');
  check(await p.evaluate(() => __game.cat.y > 0.3 || Math.hypot(__game.cat.x - 7.6, __game.cat.z + 5) > 2.8), 'kitten steps up onto the dog bed rim instead of through it');
  // garden flowers lean away from the kitten
  const fl = await p.evaluate(() => { const f = __game.world.flowers[0]; __game.tp(f.x + 0.2, 0, f.z); return [f.x, f.z]; });
  await p.waitForTimeout(500);
  check(await p.evaluate(() => __game.world.flowers[0].lean > 0.3), 'a flower the kitten stands next to bends away');
  // butterflies never fly through anything solid
  let bf = 0;
  await p.evaluate(() => __game.tp(0, 0, -16));
  for (let i = 0; i < 20; i++) { await p.waitForTimeout(150); bf += await p.evaluate(() => __game.quests.butterflies.filter((b) => __game.world.colliders.some((c) => (c.cyl ? Math.hypot(b.x - c.x, b.z - c.z) < c.r : b.x > c.x0 && b.x < c.x1 && b.z > c.z0 && b.z < c.z1) && b.y > c.y0 && b.y < c.y1)).length); }
  check(bf === 0, `butterflies never inside anything solid (${bf} samples inside)`);
  await p.screenshot({ path: out + '/14-head-wall.png' });
  // a block shoved at a wall stops with its corners outside it
  await p.evaluate(() => { __game.tp(0, 0, 0); const b = __game.props.find((o) => o.kind === 'block'); b.asleep = false; b.x = 10.5; b.y = 0.2; b.z = 2; b.vx = 9; b.vz = 0; b.vy = 0; b.yaw = Math.PI / 4; b.q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 4); b.support = null; b.floorT = 0; b.grounded = false; window.__blk = b; });
  await until(p, () => __blk.asleep && __blk.x > 10.8, null, 8000);
  const bx = await p.evaluate(() => new THREE.Box3().setFromObject(__blk.mesh).max.x);
  check(bx <= 12.03, `a turned block thrown at a wall stops with its corners outside it (reaches x ${bx.toFixed(2)}, wall at 12)`);
  // yarn rolls into the basket through the opening, not through the wicker
  await p.evaluate(() => { const y = __game.props.find((o) => o.kind === 'yarn'); y.asleep = false; y.x = 6; y.z = 9.8; y.y = 0; y.vx = 0; y.vz = -5; y.vy = 0; window.__yb = y; window.__g0 = __game.S.goals; });
  await p.waitForTimeout(1500);
  check(await p.evaluate(() => __game.S.goals === __g0 && Math.hypot(__yb.x - 6, __yb.z - 7.5) > 1.2), 'yarn hitting the back of the basket bounces off the wicker');
  await p.evaluate(() => { const y = __yb, a = Math.atan2(-7.5, -6); y.asleep = false; y.x = 6 + Math.cos(a) * 2.6; y.z = 7.5 + Math.sin(a) * 2.6; y.y = 0; y.vx = -Math.cos(a) * 5; y.vz = -Math.sin(a) * 5; y.vy = 0; });
  check(await until(p, () => __game.S.goals > __g0, null, 4000), 'yarn rolling through the basket opening scores');
  check(!p.errors.length, 'no errors in the pass-through checks' + (p.errors.length ? ': ' + p.errors[0] : ''));
  await p.close();
}

/** One test per bug the code readers found; each fails with its fix taken out. */
async function bugChecks(browser) {
  let p = await open(browser);
  await start(p);
  // the kitten cannot leave the garden over the back fence from the treehouse
  await p.evaluate(() => { __game.give(20); __game.tp(0, 5.35, -33.4); __game.setYaw(0); });
  await p.keyboard.down('KeyW'); await p.waitForTimeout(1500); await p.keyboard.up('KeyW');
  await p.waitForTimeout(800);
  check(await p.evaluate(() => __game.cat.z > -34 && Math.abs(__game.cat.x) < 14), 'bug: walking off the treehouse never leaves the garden');
  // a toy on the bouncy sofa settles instead of bouncing forever
  await p.evaluate(() => { const b = __game.props.find((o) => o.kind === 'beach'); b.asleep = false; b.x = -8.3; b.y = 2.5; b.z = -2; b.vx = b.vz = b.vy = 0; window.__sb = b; __game.tp(3, 0, 6); });
  check(await until(p, () => __sb.asleep, null, 25000), 'bug: a ball on the sofa stops bouncing and sleeps');
  // meowing near a butterfly does not lift it out of reach
  const cy = await p.evaluate(() => { const b = __game.quests.butterflies[1]; __game.tp(b.x + 2, 0, b.z); return b.cy; });
  for (let i = 0; i < 6; i++) { await p.evaluate(() => __game.action()); await p.waitForTimeout(150); }
  check(await p.evaluate((c) => __game.quests.butterflies[1].cy === c, cy), 'bug: meowing does not lift butterflies');
  // the leaderboard hears about every 5 fish crossed
  await p.evaluate(() => { window.__board = 0; const f = lib.addPlayerScoreToLeaderboard; lib.addPlayerScoreToLeaderboard = async (n) => { window.__board++; return f(n); }; });
  // land on 4 past a multiple of 5, then step over the next one with 2 fish (never landing on it)
  await p.evaluate(() => { while (__game.state.total % 5 !== 4) __game.give(1); window.__board = 0; __game.give(2); });
  check(await p.evaluate(() => __board >= 1), 'bug: crossing a multiple of 5 fish sends the score');
  // a lost window focus releases the stick
  await p.evaluate(() => { const st = document.getElementById('stick'), r = st.getBoundingClientRect(); st.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 31, clientX: r.left + 150, clientY: r.top + 200, bubbles: true })); window.dispatchEvent(new Event('blur')); });
  check(await p.evaluate(() => __game.input.stick === null), 'bug: losing focus releases the stick');
  check(!p.errors.length, 'bug section: no errors' + (p.errors.length ? ': ' + p.errors[0] : ''));
  await p.close();
  // the first tap does not pay for the attract show's pounce
  p = await open(browser);
  await until(p, () => !!__game.pounceTarget, null, 12000);
  await p.evaluate(() => { window.__dt = __game.pounceTarget; });
  await p.mouse.click(180, 380);
  check(await p.evaluate(() => __game.pounceTarget !== __dt), 'bug: first tap drops the attract show pounce target');
  await p.close();
  // the save never answers: the garden still opens at 15 fish
  p = await open(browser, '', { init: 'window.__saveFails = true;' });
  await start(p);
  await p.evaluate(() => __game.give(16));
  check(await p.evaluate(() => __game.state.garden && !(window.__writes || []).length), 'bug: garden opens with no save, and nothing is written blind');
  await p.close();
  // mute chosen before a late save survives it; the door sign shows the saved count
  p = await open(browser, '', { init: `window.__preset = { v: 1, fish: 3, total: 10, muted: false }; Object.defineProperty(window, 'lib', { configurable: true, set(v) { const g = v.getUserGameState; v.getUserGameState = () => new Promise((res) => setTimeout(() => res(g()), 6000)); Object.defineProperty(window, 'lib', { value: v, writable: true }); } });` });
  await start(p);
  check(await p.evaluate(() => !__game.state.loaded), 'save still on its way when mute is tapped');
  await p.evaluate(() => document.getElementById('muteBtn').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })));
  await until(p, () => __game.state.loaded, null, 20000);
  check(await p.evaluate(() => __game.S.muted === true), 'bug: mute tapped before the save arrives stays muted');
  check(await p.evaluate(() => __game.state.total >= 10 && __game.world.signArgs[0] === __game.state.total), 'bug: door sign shows the saved fish count');
  await p.close();
  // run() twice before the 3D library arrives makes one game, not two
  p = await open(browser);
  await p.evaluate(() => { const T = window.THREE; window.THREE = undefined; run('play'); run('play'); window.THREE = T; window.dispatchEvent(new Event('three-ready')); });
  await p.waitForTimeout(800);
  check(await p.evaluate(() => window.__liveGames === 1), 'bug: two run() calls before the library loads leave one live game');
  await p.close();
  // browsers without canvas roundRect still start
  p = await open(browser, '', { init: 'delete CanvasRenderingContext2D.prototype.roundRect;' }).catch(() => null);
  check(p && !p.errors.length, 'bug: no canvas roundRect still starts');
  if (p) await p.close();
}

(async () => {
  const browser = await chromium.launch({ args: GPU });
  try {
    await clipChecks(browser);
    if (process.env.ONLY === 'clip') return;
    await bugChecks(browser);
    if (process.env.ONLY === 'bugs') return;
    // 1. attract show, first tap, walking and jumping
    let p = await open(browser);
    const a0 = await p.evaluate(() => [__game.cat.x, __game.cat.z]);
    await p.waitForTimeout(2500);
    const a1 = await p.evaluate(() => [__game.cat.x, __game.cat.z, __game.state]);
    check(Math.hypot(a1[0] - a0[0], a1[1] - a0[1]) > 0.3, 'kitten moves by itself before any touch');
    check(a1[2].demo && a1[2].fish === 0, 'attract show counts nothing');
    await p.screenshot({ path: out + '/01-attract.png' });
    await p.mouse.click(180, 380);
    const s1 = await p.evaluate(() => ({ st: __game.state, meow: __game.cat.meowT }));
    check(s1.st.started && !s1.st.demo, 'first tap starts the game');
    check(s1.meow > 0, 'first tap is already an action (meow)');
    const titleGone = await p.evaluate(() => document.getElementById('title').classList.contains('gone'));
    check(titleGone, 'title card leaves on the first tap');
    await p.evaluate(() => { __game.tp(0, 0, 4); __game.setYaw(0); });
    await p.keyboard.down('KeyW');
    check(await until(p, () => __game.cat.z < 3, null, 3000), 'W walks the kitten forward (away from the camera)');
    await p.keyboard.up('KeyW');
    await p.evaluate(() => __game.tp(0, 0, 4)); await p.waitForTimeout(200);
    await p.keyboard.press('Space');
    check(await until(p, () => __game.cat.y > 0.8, null, 3000), 'Space jumps');
    // coyote time and jump buffer on the controller itself
    const cj = await p.evaluate(() => { const c = __game.cat, n = __game.state.now; const save = [c.grounded, c.lastGround, c.jumpAt, c.vy];
      c.grounded = false; c.lastGround = n - 0.1; c.jumpAt = n; const a = c.tryJump(n);
      c.grounded = false; c.lastGround = n - 0.3; c.jumpAt = n; const b = c.tryJump(n);
      c.grounded = true; c.jumpAt = n - 0.1; const d = c.tryJump(n);
      c.grounded = true; c.jumpAt = n - 0.3; const e = c.tryJump(n);
      [c.grounded, c.lastGround, c.jumpAt, c.vy] = save; c.vy = 0; return [a, b, d, e]; });
    check(cj[0] && !cj[1], 'coyote time: jump 0.1 s after leaving a ledge works, 0.3 s does not');
    check(cj[2] && !cj[3], 'jump buffer: a press 0.1 s before landing counts, 0.3 s does not');
    await p.screenshot({ path: out + '/02-play.png' });

    // 2. knocking toys off the table fills the mischief meter
    await p.evaluate(() => { __game.tp(-4, 1.6, -6.9); __game.setYaw(0); });
    await p.waitForTimeout(300);
    const m0 = await p.evaluate(() => __game.S.stars);
    for (let i = 0; i < 4; i++) { await p.evaluate(() => __game.action()); await p.waitForTimeout(450); }
    await until(p, () => __game.props.some((o) => o.restY < 0.1 && o.home.y > 1), null, 8000);
    const m1 = await p.evaluate(() => ({ stars: __game.S.stars, fell: __game.props.filter((o) => o.restY < 0.1 && o.home.y > 1).length }));
    check(m1.stars > m0, `swiping toys gives mischief stars (${m0} -> ${m1.stars})`);
    check(m1.fell > 0, `toys fall off the table (${m1.fell})`);
    await p.screenshot({ path: out + '/03-mischief.png' });

    // 3. fish on the path
    const f0 = await p.evaluate(() => __game.state.fish);
    await p.evaluate(() => __game.tp(-1, 2.6, -10.9));
    await p.waitForTimeout(500);
    check((await p.evaluate(() => __game.state.fish)) > f0, 'fish on the bookshelf is collected');
    await p.evaluate(() => __game.tp(5, 5.6, -10.9));
    await p.waitForTimeout(600);
    const top = await p.evaluate(() => ({ tops: __game.S.tops, fish: __game.state.fish }));
    check(top.tops >= 1, 'standing on the top perch counts the top shelf');
    check(top.fish >= f0 + 4, 'golden fish on the perch is worth 3');
    await p.screenshot({ path: out + '/04-perch.png' });

    // 4. soft fall from high up bounces with no harm
    await p.evaluate(() => { __game.tp(0, 6, 2); });
    check(await until(p, () => __game.cat.y < 0.05 || __game.cat.vy > 3, null, 4000) && await until(p, () => __game.cat.y > 0.4 && __game.cat.vy > 0, null, 3000), 'falling from high up bounces softly on the rug');

    // 5. the red dot: appears, darts, gets caught for 3 fish
    await p.evaluate(() => __game.tp(0, 0, 3));
    await p.evaluate(() => __game.laserNow());
    check(await until(p, () => __game.quests.laser.on, null, 3000), 'red dot appears');
    await p.screenshot({ path: out + '/05-laser.png' });
    const l0 = await p.evaluate(() => __game.state.fish);
    await p.evaluate(() => { const L = __game.quests.laser; L.darts = 0; L.to = null; __game.tp(L.x, L.y, L.z); });
    check(await until(p, () => !__game.quests.laser.on, null, 3000), 'standing on the dot catches it');
    check((await p.evaluate(() => __game.state.fish)) >= l0 + 3, 'caught dot gives 3 fish');
    // pounce reaches the dot from a distance
    await p.evaluate(() => { __game.tp(0, 0, 3); __game.laserNow(); });
    await until(p, () => __game.quests.laser.on, null, 3000);
    await p.evaluate(() => { const L = __game.quests.laser; L.darts = 0; const c = __game.cat; __game.tp(L.x + 2.5, L.y, L.z); });
    await p.waitForTimeout(200);
    await p.evaluate(() => __game.action());
    check(await until(p, () => !__game.quests.laser.on, null, 5000), 'meow button pounces onto a nearby dot');

    // 6. yarn into the basket
    const g0 = await p.evaluate(() => __game.S.goals);
    await p.evaluate(() => { const y = __game.props.find((o) => o.kind === 'yarn'); y.asleep = false; y.x = 6; y.z = 7.5; y.y = 1; y.vx = y.vz = 0; });
    check(await until(p, (g) => __game.S.goals > g, g0, 4000), 'yarn ball in the basket scores a goal');
    const yarnBack = await p.evaluate(() => __game.props.filter((o) => o.kind === 'yarn').every((o) => Math.hypot(o.x - 6, o.z - 7.5) > 1.2));
    check(yarnBack, 'scored yarn comes back somewhere else (no ball stuck in the basket)');
    await p.waitForTimeout(400); await p.screenshot({ path: out + '/06-goal.png' });

    // 7. pushing a ball by walking into it
    await p.evaluate(() => { const b = __game.props.find((o) => o.kind === 'beach' && o.z > -12); __game.tp(b.x, 0, b.z + 1.5); __game.setYaw(0); window.__ball = b; window.__b0 = [b.x, b.z]; });
    await p.keyboard.down('KeyW'); await p.waitForTimeout(900); await p.keyboard.up('KeyW');
    check(await p.evaluate(() => Math.hypot(__ball.x - __b0[0], __ball.z - __b0[1]) > 0.5), 'walking into a ball pushes it');

    // 8. the garden door: closed before 15 fish, open after, the kitten walks through
    await p.evaluate(() => { __game.tp(-7, 0, -10.6); __game.setYaw(0); });
    const before = await p.evaluate(() => __game.state);
    if (!before.garden) {
      await p.keyboard.down('KeyW'); await p.waitForTimeout(900); await p.keyboard.up('KeyW');
      check(await p.evaluate(() => __game.cat.z > -12.1), 'closed pet door blocks the kitten');
    }
    await p.evaluate(() => __game.give(20));
    check(await p.evaluate(() => __game.state.garden && __game.S.garden), 'garden opens at 15 fish and is saved');
    await p.screenshot({ path: out + '/07-garden-open.png' });
    await p.evaluate(() => { __game.tp(-7, 0, -10.6); __game.setYaw(0); });
    await p.keyboard.down('KeyW'); await p.waitForTimeout(1600); await p.keyboard.up('KeyW');
    check(await p.evaluate(() => __game.state.zone === 'garden'), 'kitten walks through the open pet door into the garden');
    await p.waitForTimeout(800); await p.screenshot({ path: out + '/08-garden.png' });
    // butterflies
    const b0 = await p.evaluate(() => __game.state.fish);
    await p.evaluate(() => { const b = __game.quests.butterflies[0]; __game.tp(b.x, Math.max(0, b.y - 0.6), b.z); });
    check(await until(p, (f) => __game.state.fish > f, b0, 2000), 'touching a butterfly gives a fish');
    // treehouse stairs walk up
    await p.evaluate(() => { __game.tp(13.2, 0, -31.9); __game.setYaw(Math.PI / 2); });
    await p.keyboard.down('KeyW'); await until(p, () => __game.cat.y > 2, null, 5000); await p.keyboard.up('KeyW');
    check(await p.evaluate(() => __game.cat.y > 2), `stairs carry the kitten up toward the treehouse (y ${(await p.evaluate(() => __game.cat.y)).toFixed(2)})`);

    // 9. wardrobe
    await p.evaluate(() => { __game.tp(9.9, 0, 4); });
    check(await until(p, () => __game.state.ward, null, 3000), 'standing on the glowing pad opens the magic mirror');
    await p.waitForTimeout(500); await p.screenshot({ path: out + '/09-wardrobe.png' });
    const w0 = await p.evaluate(() => __game.state.fish);
    await tapEl(p, '.card[data-id="tuxedo"]');
    const w1 = await p.evaluate(() => ({ skins: __game.S.skins, skin: __game.S.skin, fish: __game.state.fish }));
    check(w1.skins.includes('tuxedo') && w1.skin === 'tuxedo' && w1.fish === w0 - 5, 'buying the tuxedo spends 5 fish and wears it');
    await tapEl(p, '.card[data-id="cosmic"]');
    const w2 = await p.evaluate(() => ({ skins: __game.S.skins, fish: __game.state.fish, msg: document.getElementById('wardMsg').textContent }));
    if (w2.fish < 40) check(!w2.skins.includes('cosmic') && /\d/.test(w2.msg), 'a too-dear skin is only tried on, with the fish still needed');
    await tapEl(p, '.card[data-id="crown"]');
    check(await p.evaluate(() => __game.S.hat === 'crown'), 'buying the crown wears it');
    await p.waitForTimeout(400); await p.screenshot({ path: out + '/10-crown.png' });
    await tapEl(p, '#wardX');
    check(await p.evaluate(() => !__game.state.ward), '✕ closes the mirror');
    await p.waitForTimeout(400);
    check(await p.evaluate(() => !__game.state.ward), 'mirror stays closed while still on the pad');
    // the save
    await p.waitForTimeout(1500);
    const saved = await p.evaluate(() => (window.__writes || []).slice(-1)[0]);
    check(saved && saved.skins.includes('tuxedo') && saved.hat === 'crown' && saved.garden, 'save holds bought looks and the garden');
    check(!p.errors.length, 'no page errors in the main run' + (p.errors.length ? ': ' + p.errors.slice(0, 3).join(' || ') : ''));
    await p.close();

    // 10. a saved game comes back; a late save merges fish earned meanwhile
    p = await open(browser, '', { init: `window.__preset = ${JSON.stringify({ v: 1, fish: 7, total: 30, skins: ['ginger', 'calico'], hats: ['none', 'wizard'], skin: 'calico', hat: 'wizard', garden: true, muted: true, lang: 'es', laser: 2, goals: 1, tops: 1, stars: 9 })};` });
    await until(p, () => __game.state.loaded);
    const r = await p.evaluate(() => ({ s: __game.S, g: __game.state, t1: document.getElementById('t1').textContent, mute: document.getElementById('muteBtn').innerHTML.includes('e0435f') }));
    check(r.s.skin === 'calico' && r.s.hat === 'wizard' && r.g.garden && r.g.fish === 7, 'saved look, fish and garden come back');
    check(r.t1 === 'Patitas y Caos' && r.mute, 'saved language and mute come back');
    await p.screenshot({ path: out + '/11-saved.png' });
    await p.close();
    p = await open(browser, '', { init: `window.__preset = { v: 1, fish: 10, total: 10 }; (() => { let n = 0; Object.defineProperty(window, 'lib', { configurable: true, set(v) { const g = v.getUserGameState; v.getUserGameState = () => new Promise((res) => setTimeout(() => res(g()), 2500)); Object.defineProperty(window, 'lib', { value: v, writable: true }); } }); })();` });
    await start(p);
    await p.evaluate(() => __game.tp(0.2, 0, 2.2));
    await until(p, () => __game.state.fish >= 1, null, 2000);
    check(await p.evaluate(() => !(window.__writes || []).length), 'nothing is written before the save is read');
    await until(p, () => __game.state.loaded, null, 6000);
    const late = await p.evaluate(() => __game.S.fish);
    check(late >= 11, `late save keeps fish earned meanwhile (fish ${late}, expected 11+)`);
    await p.close();
    p = await open(browser, '', { init: 'window.__saveFails = true;' });
    await start(p);
    await p.evaluate(() => __game.tp(0.2, 0, 2.2)); await p.waitForTimeout(800);
    check(await p.evaluate(() => !(window.__writes || []).length && __game.state.fish >= 1), 'failing save: game plays on, nothing is written blind');
    check(!p.errors.length, 'no errors with a failing save');
    await p.close();

    // 11. edit mode, run() twice
    p = await open(browser, '&mode=edit');
    await p.waitForTimeout(1200);
    const ed = await p.evaluate(() => ({ hud: document.getElementById('hud').classList.contains('edit'), s: __game.state }));
    check(ed.hud && ed.s.started, 'edit mode draws the room with no HUD or input');
    await p.mouse.click(180, 400); await p.waitForTimeout(300);
    check(await p.evaluate(() => __game.cat.meowT === 0), 'a tap in edit mode does nothing');
    await p.screenshot({ path: out + '/12-edit.png' });
    await p.evaluate(() => { run('play'); run('play'); run('edit'); run('play'); });
    await p.waitForTimeout(1500);
    const twice = await p.evaluate(() => ({ canv: document.querySelectorAll('canvas').length, s: __game.state }));
    check(twice.canv === 1 && twice.s.demo, 'run() again leaves one canvas and a fresh attract show');
    check(!p.errors.length, 'no errors across run() calls' + (p.errors.length ? ': ' + p.errors[0] : ''));
    await p.close();

    // 12. touch: stick + a second finger on the jump button; tap on a toy pounces
    p = await open(browser, '', { touch: true });
    await start(p);
    await p.evaluate(() => __game.tp(0, 0, 4));
    const r2 = await p.evaluate(() => { const s = document.getElementById('stick').getBoundingClientRect(), j = document.getElementById('jumpBtn').getBoundingClientRect();
      const fire = (el, type, id, x, y, prim) => el.dispatchEvent(new PointerEvent(type, { pointerId: id, clientX: x, clientY: y, bubbles: true, isPrimary: prim, pointerType: 'touch' }));
      const st = document.getElementById('stick'); const x = s.left + s.width / 2, y = s.top + s.height / 2;
      fire(st, 'pointerdown', 11, x, y, true); fire(st, 'pointermove', 11, x, y - 60, true);
      const before = __game.cat.jumpAt;
      fire(document.getElementById('jumpBtn'), 'pointerdown', 12, j.left + j.width / 2, j.top + j.height / 2, false);
      return { before, after: __game.cat.jumpAt, x, y }; });
    check(r2.after !== r2.before, 'second finger on the jump button jumps while the first holds the stick');
    await p.waitForTimeout(500);
    const moved = await p.evaluate(() => __game.cat.z);
    check(moved < 3.8, 'stick held up walks the kitten forward');
    await p.evaluate((o) => document.getElementById('stick').dispatchEvent(new PointerEvent('pointerup', { pointerId: 11, clientX: o.x, clientY: o.y - 60, bubbles: true, pointerType: 'touch' })), r2);
    check(!p.errors.length, 'no errors with two fingers');
    await p.close();

    // 13. 600 seeded random inputs
    p = await open(browser);
    await start(p);
    await p.evaluate(() => { let s = 7; const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647); window.__rnd = rnd; });
    for (let i = 0; i < 600; i++) {
      const k = await p.evaluate(() => Math.floor(__rnd() * 8)), x = await p.evaluate(() => 10 + __rnd() * 340), y = await p.evaluate(() => 10 + __rnd() * 620);
      if (k < 3) await p.mouse.click(x, y);
      else if (k === 3) { await p.mouse.move(x, y); await p.mouse.down(); await p.mouse.move(x + 40, y + 10); await p.mouse.up(); }
      else if (k === 4) await p.keyboard.press('Space');
      else if (k === 5) await p.keyboard.press('KeyE');
      else await p.keyboard.press(['KeyW', 'KeyA', 'KeyS', 'KeyD'][i % 4]);
      if (i % 150 === 149) await p.waitForTimeout(400);
    }
    await p.waitForTimeout(800);
    const rs = await p.evaluate(() => { const c = __game.cat; return { ok: [c.x, c.y, c.z].every(Number.isFinite), props: __game.props.every((o) => Number.isFinite(o.x + o.y + o.z)), langs: document.getElementById('langs').hidden }; });
    check(rs.ok && rs.props, '600 random inputs: kitten and toys stay valid');
    check(!p.errors.length, 'no errors in 600 random inputs' + (p.errors.length ? ': ' + p.errors[0] : ''));
    await p.close();

    // 14. every language: title and banner inside the frame, real glyphs
    for (const [l, loc] of Object.entries(LANGS)) {
      p = await open(browser, '', { locale: loc });
      await p.waitForTimeout(800);
      const fit = await p.evaluate(() => { const W = document.getElementById('app').getBoundingClientRect(); return ['t1', 't2', 'playBtn', 'tapT'].map((id) => { const r = document.getElementById(id).getBoundingClientRect(); return r.left >= W.left - 1 && r.right <= W.right + 1; }); });
      check(fit.every(Boolean), `${l}: opening card fits the frame`);
      await p.screenshot({ path: `${out}/lang-${l}-title.png` });
      await start(p);
      await p.evaluate(() => { __game.tp(9.9, 0, 4); });
      await until(p, () => __game.state.ward, null, 3000);
      await p.evaluate(() => __game.laserNow());
      await p.waitForTimeout(400);
      const hud = await p.evaluate(() => { const W = document.getElementById('app').getBoundingClientRect(); return [...document.querySelectorAll('.top, .ward, .banner .t')].every((e) => { const r = e.getBoundingClientRect(); return r.width === 0 || (r.left >= W.left - 1 && r.right <= W.right + 1); }); });
      check(hud, `${l}: HUD, mirror card and banner fit the frame`);
      await p.screenshot({ path: `${out}/lang-${l}-play.png` });
      check(!p.errors.length, `${l}: no errors`);
      await p.close();
    }
  } finally {
    await browser.close(); srv.close();
    console.log(fails.length ? `\n${fails.length} FAILED` : '\nall passed');
    process.exit(fails.length ? 1 : 0);
  }
})();
