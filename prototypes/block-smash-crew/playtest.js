// PROTOTYPE - NOT FOR PRODUCTION
// Playtest: serves this folder and plays Block Smash Crew like a child does: the demo before any touch, the first
// tap, holding, dragging the camera, the tools (free try, cooldown, buying), a whole level to the result card and
// NEXT, keep smashing, the save (late, failing, from before), every language, edit mode, run() again and again,
// 600 random touches, and the camera (never inside a block, no jumps, the hero in view). Screens go to the out folder.
// Usage: [ONLY=bugs] node playtest.js <out folder>   (Playwright; SwiftShader GPU, so FPS here is not a phone's)
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const types = { '.js': 'text/javascript', '.mjs': 'text/javascript', '.html': 'text/html', '.json': 'application/json', '.webp': 'image/webp', '.mp3': 'audio/mpeg' };
const serve = () => http.createServer((q, s) => {
  const f = path.join(__dirname, q.url.split('?')[0] === '/' ? 'index.html' : q.url.split('?')[0]);
  fs.readFile(f, (e, d) => { if (e) { s.writeHead(404); return s.end(); } s.writeHead(200, { 'content-type': types[path.extname(f)] || 'text/plain' }); s.end(d); });
}).listen(0);
const GPU = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'];
const fails = [];
const check = (ok, msg) => { console.log((ok ? 'ok   ' : 'FAIL ') + msg); if (!ok) fails.push(msg); };

/** In-page bot: taps like a player who wants the stars (hammer at the chest, bombs on steel), through the real game. */
const BOT = `window.__bot = (on) => { clearInterval(window.__botI); if (!on) return; window.__botI = setInterval(() => { const G = __game; if (!G || !G.W || G.resultsOpen) return; const W = G.W; const b = G.WD.botTap(W); if (!b) return; if (b.tool === 'hammer') G.WD.aimHammer(W, b.t, true); else G.WD.useTool(W, b.tool, b.p); }, 250 / (window.__speed || 1)); };`;

async function open(browser, q = '', opts = {}) {
  const page = await browser.newPage({ viewport: { width: 360, height: 640 }, deviceScaleFactor: opts.dpr || 1, locale: opts.locale || 'en-US', hasTouch: !!opts.touch, isMobile: !!opts.touch }); // touch: a phone (coarse pointer → stick + HIT)
  const errors = []; page.on('pageerror', (e) => errors.push(e.message)); page.on('console', (m) => { if (m.type() === 'error' && !/favicon/.test(m.text())) errors.push(m.text()); });
  if (opts.init) await page.addInitScript(opts.init);
  await page.addInitScript(`window.__speed = ${opts.speed || 1};` + BOT);
  await page.goto(`http://localhost:${opts.port}/?local${q}`);
  await page.waitForFunction(() => window.__game && window.__game.W && document.fonts.status === 'loaded', null, { timeout: 40000 });
  return { page, errors };
}
const g = (page, fn, a) => page.evaluate(fn, a);
async function tapAt(page, x, y, ms = 60) { const [cx, cy] = await g(page, ([x, y]) => __game.client(x, y), [x, y]); await page.mouse.move(cx, cy); await page.mouse.down(); await page.waitForTimeout(ms); await page.mouse.up(); }
/** Frame point (720×1280) of a world point, for tapping a block. */
const screenOf = (page, x, y, z) => g(page, ([x, y, z]) => __game.scene.screenOf(x, y, z), [x, y, z]);
const waitFor = (page, fn, a, ms = 30000) => page.waitForFunction(fn, a, { timeout: ms, polling: 50 });

async function main() {
  const out = process.argv[2] || fs.mkdtempSync(path.join(require('os').tmpdir(), 'bsc-'));
  fs.mkdirSync(out, { recursive: true });
  const shot = (page, n) => page.screenshot({ path: path.join(out, n + '.png') });
  const server = serve(), port = server.address().port;
  const browser = await chromium.launch({ args: GPU });

  if (!process.env.ONLY) {
  // ---- 1. the demo: the hero smashes the fence before any touch; nothing counts or is saved
  {
    const { page, errors } = await open(browser, '', { port });
    const y0d = await g(page, () => __game.scene.yaw);
    await page.waitForTimeout(2500);
    const st = await g(page, () => ({ demo: __game.demo, h: [__game.W.hero.x, __game.W.hero.z], wreck: __game.WD.wreck(__game.W), writes: (window.__writes || []).filter((w) => w.total > 0).length, coins: __game.save.coins, hand: !document.querySelector('#hand').hidden, tip: document.querySelector('#tip').textContent }));
    const y1d = await g(page, () => __game.scene.yaw);
    check(st.demo && st.wreck > 0 && Math.abs(y1d - y0d) > 0.01, 'demo: rockets hit the roof and the view sweeps before any touch');
    check(st.coins === 0 && st.writes === 0, 'demo: no coins, no save writes');
    check(st.hand && st.tip === 'TAP TO SMASH!', 'demo: hand + "TAP TO SMASH!"');
    await shot(page, '01-demo');
    // ---- 2. the first tap on the building: smashing within a second
    const box = await g(page, () => __game.W.box);
    const [sx, sy] = await screenOf(page, (box.x0 + box.x1) / 2 + 0.5, 2, box.z1 + 1);
    const t0 = Date.now(); await tapAt(page, sx, sy, 80);
    await waitFor(page, () => !__game.demo && __game.WD.wreck(__game.W) > 0, null, 4000).catch(() => {});
    const a = await g(page, () => ({ demo: __game.demo, goal: !!(__game.W.hero.goal || __game.W.hero.aim || __game.W.hero.swingT >= 0 || __game.W.smashed > 0), n: __game.W.n, tip: document.querySelector('#tip').hidden ? '' : document.querySelector('#tip').textContent }));
    check(!a.demo && a.goal, 'first tap: the real level starts and the hero heads for the tapped block');
    await waitFor(page, () => __game.save.coins > 0, null, 5000).catch(() => {});
    const dt = Date.now() - t0, coins = await g(page, () => __game.save.coins);
    check(coins > 0 && dt < 4000, `first tap → first coins in ${dt} ms`);
    await shot(page, '02-first-tap');
    // ---- 3. hold: keeps smashing what is under the finger
    const w0 = await g(page, () => __game.WD.wreck(__game.W));
    const [cx, cy] = await g(page, ([x, y]) => __game.client(x, y), [sx, sy]);
    await page.mouse.move(cx, cy); await page.mouse.down(); await page.waitForTimeout(2500);
    const holding = await g(page, () => __game.W.hero.hold);
    await page.mouse.up();
    const w1 = await g(page, () => __game.WD.wreck(__game.W));
    check(holding && w1 > w0, `hold: smashing goes on while held (wreck ${(w0 * 100).toFixed(1)} → ${(w1 * 100).toFixed(1)}%)`);
    // ---- 4. drag: turns the camera, smashes nothing
    const y0 = await g(page, () => __game.scene.yaw);
    const [mx, my] = await g(page, () => __game.client(360, 560)); // from the middle: the tap point may sit near an edge
    await page.mouse.move(mx - 80, my); await page.mouse.down();
    for (let i = 1; i <= 10; i++) await page.mouse.move(mx - 80 + i * 16, my, { steps: 2 });
    const mid = await g(page, () => ({ aim: __game.W.hero.aim, goal: __game.W.hero.goal }));
    await page.mouse.up();
    const y1 = await g(page, () => __game.scene.yaw);
    check(Math.abs(y1 - y0) > 0.3 && !mid.aim && !mid.goal, `drag: the camera turns (${(y1 - y0).toFixed(2)} rad) and the hero stops`);
    await g(page, () => { __game.scene.look(-__game.scene.yaw, 0); });
    // ---- 5. bomb: button, then tap the world; back to the hammer, cooldown ring shows
    await g(page, () => document.querySelector('.tool[data-t=bomb]').click());
    check(await g(page, () => __game.sel === 'bomb'), 'bomb button selects the bomb');
    await tapAt(page, sx, sy - 80);
    const b = await g(page, () => ({ shots: __game.W.shots.length, sel: __game.sel, cool: __game.W.cool.bomb }));
    check(b.shots === 1 && b.sel === 'hammer' && b.cool > 0, 'a tap throws the bomb, then the hammer is back and the bomb cools down');
    await page.waitForTimeout(900); await shot(page, '03-bomb');
    // ---- 6. a locked tool: one free try, then it shakes
    await g(page, () => document.querySelector('.tool[data-t=rocket]').click());
    await tapAt(page, sx, sy - 60);
    const r1 = await g(page, () => ({ tried: __game.W.tried.has('rocket'), free: document.querySelector('.tool[data-t=rocket] .free').hidden }));
    await g(page, () => document.querySelector('.tool[data-t=rocket]').click());
    const r2 = await g(page, () => ({ sel: __game.sel, shake: document.querySelector('.tool[data-t=rocket]').classList.contains('no') }));
    check(r1.tried && r1.free && r2.sel === 'hammer' && r2.shake, 'locked rocket: one free try (ribbon gone), then it shakes and stays locked');
    // ---- 7. buying: enough coins → unlocked, paid, saved
    await waitFor(page, () => __game.saveLoaded, null, 5000);
    await g(page, () => { __game.save.coins = 9000; });
    await g(page, () => document.querySelector('.tool[data-t=rocket]').click());
    const buy = await g(page, () => ({ owned: __game.save.owned.includes('rocket'), coins: __game.save.coins, sel: __game.sel, saved: (window.__writes || []).slice(-1)[0] }));
    check(buy.owned && buy.coins === 1000 && buy.sel === 'rocket' && buy.saved && buy.saved.owned.includes('rocket'), 'rocket bought: 8000 paid, selected, saved');
    check(errors.length === 0, 'no page errors (sections 1–7): ' + (errors.join(' | ') || 'none'));
    await page.close();
  }

  // ---- 8. a whole level with the bot: stars → smash time → card → NEXT is instant; keep smashing pays no bonus twice
  {
    const { page, errors } = await open(browser, '&speed=2', { port, speed: 2 });
    await tapAt(page, 360, 500); await g(page, () => __bot(true));
    await waitFor(page, () => __game.W.phase === 'fever', null, 40000).catch(() => {});
    const fev = await g(page, () => ({ ph: __game.W.phase, fever: !document.querySelector('#fever').hidden, locks: [...document.querySelectorAll('.tool .lock')].filter((l) => !l.hidden).length, got: __game.W.got }));
    check(fev.ph === 'fever' && fev.fever && fev.locks === 0 && fev.got === 3, 'all 3 stars → SMASH TIME: golden frame, every tool unlocked');
    await shot(page, '04-smash-time');
    await waitFor(page, () => __game.resultsOpen, null, 30000).catch(() => {});
    const card = await g(page, () => ({ open: __game.resultsOpen, stars: document.querySelectorAll('.bigstars img.on').length, cups: document.querySelectorAll('.cups img').length, lvl: __game.save.level, coins: __game.save.coins, w: (window.__writes || []).slice(-1)[0] }));
    check(card.open && card.stars === 3 && card.cups === 2 && card.lvl === 1 && card.w && card.w.level === 1, 'result card: 3 stars, 2 trophies, level 1 done and saved');
    await shot(page, '05-result');
    await g(page, () => __bot(false));
    await g(page, () => document.querySelector('#keepBtn').click());
    const keep = await g(page, () => ({ panel: document.querySelector('#panel').hidden, pill: !document.querySelector('#nextpill').hidden }));
    check(keep.panel && keep.pill, 'keep smashing: the card goes, a NEXT pill stays at the top');
    const c0 = await g(page, () => __game.save.coins);
    await g(page, () => document.querySelector('#nextpill').click());
    const c1 = await g(page, () => __game.save.coins);
    check(c1 - c0 < 1000, `opening the card again does not pay the level bonus twice (+${c1 - c0})`);
    const t = await g(page, () => { const t0 = performance.now(); document.querySelector('#nextBtn').click(); return { ms: performance.now() - t0, n: __game.W.n, panel: document.querySelector('#panel').hidden, demo: __game.demo }; });
    check(t.n === 1 && t.panel && !t.demo && t.ms < 150, `NEXT builds level 2 at once (${t.ms.toFixed(0)} ms)`);
    await page.waitForTimeout(500); await shot(page, '06-level-2');
    check(errors.length === 0, 'no page errors (section 8): ' + (errors.join(' | ') || 'none'));
    await page.close();
  }

  // ---- 9. the save: from before, late (coins earned meanwhile kept), failing (never written blind)
  {
    const preset = { v: 1, coins: 777, total: 900, level: 3, owned: ['hammer', 'bomb', 'rocket'], best: { 0: 2 }, learned: { bomb: true, drag: true }, muted: true, lang: 'id', blocks: 50, levels: 3, day: 20200101 };
    const { page, errors } = await open(browser, '', { port, init: `window.__preset = ${JSON.stringify(preset)};` });
    await waitFor(page, () => __game.saveLoaded, null, 5000);
    const s = await g(page, () => ({ lvl: __game.W.n, demo: __game.demo, rocket: !document.querySelector('.tool[data-t=rocket] .lock').hidden, lang: __game.lang, muted: __game.Sound.muted, coins: __game.save.coins }));
    check(s.lvl === 3 && s.demo && !s.rocket && s.lang === 'id' && s.muted && s.coins === 777, 'an old save: the demo shows level 4, rocket owned, Indonesian, muted, coins kept');
    await page.close();
    const late = await open(browser, '', { port, init: `window.__preset = ${JSON.stringify(preset)}; window.__saveDelay = 7000;` });
    await tapAt(late.page, 360, 520); await late.page.waitForTimeout(1500);
    const before = await g(late.page, () => ({ c: __game.save.coins, w: (window.__writes || []).length, n: __game.W.n }));
    await waitFor(late.page, () => __game.saveLoaded, null, 12000);
    const after = await g(late.page, () => ({ c: __game.save.coins, lvl: __game.save.level, n: __game.W.n }));
    check(before.w === 0 && after.c >= 777 + before.c && after.lvl === 3 && after.n === before.n, `late save: nothing written before it came, coins earned meanwhile added (${before.c} + 777), the level being played is not swapped ${JSON.stringify([before, after])}`);
    await late.page.close();
    const bad = await open(browser, '', { port, init: 'window.__saveFails = true;' });
    await tapAt(bad.page, 360, 520); await bad.page.waitForTimeout(2500);
    const b = await g(bad.page, () => ({ w: (window.__writes || []).length, c: __game.save.coins }));
    check(b.w === 0 && b.c > 0, 'a failing save: play goes on, nothing is ever written blind');
    check(errors.length + late.errors.length + bad.errors.length === 0, 'no page errors (section 9)');
    await bad.page.close();
  }

  // ---- 10. every language: text shown, Arabic right to left, HUD inside the frame and apart
  for (const lang of ['en', 'ar', 'es', 'vi', 'hi', 'bn', 'id']) {
    const { page, errors } = await open(browser, '', { port, locale: lang });
    const r = await g(page, (lang) => {
      const app = document.getElementById('app').getBoundingClientRect(), tip = document.querySelector('#tip');
      const boxes = ['#coins', '#stars', '#bar', '#gear', '#tools', '#tip'].map((s) => [s, document.querySelector(s).getBoundingClientRect()]);
      const outside = boxes.filter(([, b]) => b.width && (b.left < app.left - 1 || b.right > app.right + 1 || b.top < app.top - 1)).map(([s]) => s);
      const ov = (a, b) => a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1;
      const pairs = []; for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) if (ov(boxes[i][1], boxes[j][1]) && !(boxes[i][0] === '#stars' && boxes[j][0] === '#bar')) pairs.push(boxes[i][0] + boxes[j][0]);
      return { lang: __game.lang, dir: document.getElementById('app').dir, tip: tip.textContent, want: window.gameConfig.strings[lang].tap, outside, pairs };
    }, lang);
    check(r.lang === lang && r.tip === r.want && (lang === 'ar') === (r.dir === 'rtl') && !r.outside.length && !r.pairs.length, `${lang}: "${r.tip}", ${r.dir}, HUD inside the frame${r.outside.length ? ' OUT ' + r.outside : ''}${r.pairs.length ? ' OVERLAP ' + r.pairs : ''}`);
    check(errors.length === 0, `${lang}: no page errors`);
    await page.close();
  }

  // ---- 11. edit mode: a still showcase, touches do nothing, nothing saved
  {
    const { page, errors } = await open(browser, '&mode=edit', { port });
    const w0 = await g(page, () => __game.WD.wreck(__game.W));
    await tapAt(page, 360, 500); await page.waitForTimeout(1200);
    const e = await g(page, () => ({ w: __game.WD.wreck(__game.W), writes: (window.__writes || []).length, edit: document.querySelector('#hud').classList.contains('edit') }));
    check(e.edit && e.w === w0 && e.writes === 0, 'edit mode: tools hidden, a tap smashes nothing, no save');
    check(errors.length === 0, 'edit mode: no page errors');
    await page.close();
  }

  // ---- 12. run() again and again: one canvas, no errors, plays after
  {
    const { page, errors } = await open(browser, '', { port });
    await g(page, async () => { for (const m of ['edit', 'play', 'edit', 'play', 'play']) { window.run(m); await new Promise((r) => setTimeout(r, 150)); } });
    await page.waitForTimeout(500);
    await tapAt(page, 360, 520); await page.waitForTimeout(1500);
    const r = await g(page, () => ({ canvases: document.querySelectorAll('canvas').length, demo: __game.demo, hud: document.querySelectorAll('#hud').length }));
    check(r.canvases === 1 && r.hud === 1 && !r.demo, 'run() 5×: one canvas, one HUD, the game plays');
    check(errors.length === 0, 'run() 5×: no page errors: ' + (errors.join(' | ') || 'none'));
    await page.close();
  }
  } // end of the non-bug sections

  // ---- 13. 600 random touches (seeded) and the camera through a bot level: never inside a block, no jumps, hero in view
  {
    const { page, errors } = await open(browser, '', { port });
    await g(page, async () => {
      let s = 12345; const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
      const root = document.getElementById('app'), rect = root.getBoundingClientRect();
      for (let i = 0; i < 600; i++) {
        const x = rect.left + r() * rect.width, y = rect.top + r() * rect.height, k = r();
        if (k < 0.12) { const b = document.querySelectorAll('.tool')[Math.floor(r() * 6)]; b.click(); continue; }
        const el = document.elementFromPoint(x, y) || root;
        el.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 1, clientX: x, clientY: y, bubbles: true }));
        if (k < 0.3) for (let j = 0; j < 4; j++) window.dispatchEvent(new PointerEvent('pointermove', { pointerId: 1, clientX: x + j * 15, clientY: y, bubbles: true }));
        window.dispatchEvent(new PointerEvent('pointerup', { pointerId: 1, clientX: x, clientY: y, bubbles: true }));
        if (i % 20 === 0) await new Promise((res) => requestAnimationFrame(res));
        if (document.querySelector('#nextBtn') && !document.querySelector('#panel').hidden && r() < 0.5) document.querySelector('#nextBtn').click();
      }
    });
    const st = await g(page, () => { const h = __game.W.hero; return { ok: h.x > -5 && h.z > -5 && h.x < 45 && h.z < 50 && Number.isFinite(h.y), shots: __game.W.shots.length }; });
    check(st.ok, '600 random touches: the hero stays in the world');
    check(errors.length === 0, '600 random touches: no page errors: ' + (errors.join(' | ') || 'none'));
    // the camera, every 0.1 s through a bot level
    await g(page, () => { __game.newLevel(2); __bot(true); });
    const cam = await g(page, async () => {
      const S = []; let last = null;
      for (let i = 0; i < 160; i++) {
        await new Promise((r) => setTimeout(r, 100));
        const c = __game.scene.camera, W = __game.W, p = c.position, up = new THREE.Vector3(0, 1, 0).applyQuaternion(c.quaternion);
        const inSolid = !!W.g.get(Math.floor(p.x), Math.floor(p.y), Math.floor(p.z));
        const gt = W.t - (last ? last[3] : W.t), jump = last && gt > 0 ? Math.hypot(p.x - last[0], p.y - last[1], p.z - last[2]) / gt * 0.1 : 0; last = [p.x, p.y, p.z, W.t]; // per 0.1 s of game time (a busy machine samples late)
        const right = new THREE.Vector3(1, 0, 0).applyQuaternion(c.quaternion);
        S.push({ inSolid, jump, roll: Math.abs(right.y), seen: Math.hypot(p.x - W.hero.x, p.z - W.hero.z) < 0.4 }); // first person: the camera is the hero's eye
        if (W.phase === 'free') break;
      }
      return { n: S.length, solid: S.filter((s) => s.inSolid).length, maxJump: Math.max(...S.map((s) => s.jump)), roll: Math.max(...S.map((s) => s.roll)), seen: S.filter((s) => s.seen).length / S.length };
    });
    check(cam.solid === 0, `camera never inside a shown block (${cam.n} samples)`);
    check(cam.maxJump < 2.5 && cam.roll < 0.02, `camera: no jumps (max ${cam.maxJump.toFixed(2)} per 0.1 s), no roll (${cam.roll.toFixed(3)})`);
    check(cam.seen >= 0.95, `the camera stays at the hero's eye ${(cam.seen * 100).toFixed(0)}% of the time`);
    await page.close();
  }

  // ---- 14. bugs found by reading the code (each check failed before its fix)
  {
    const { page, errors } = await open(browser, '', { port });
    await tapAt(page, 360, 520); await page.waitForTimeout(300);
    // b1: a thrown bomb is seen flying (its throw event reaches the look)
    await g(page, () => document.querySelector('.tool[data-t=bomb]').click());
    await tapAt(page, 360, 420);
    await page.waitForTimeout(80);
    const b1 = await g(page, () => ({ shots: __game.W.shots.length, meshes: __game.scene.counts.shots, hint: document.querySelector('.tool[data-t=bomb]').classList.contains('hint') }));
    check(b1.meshes >= 1 && b1.meshes === b1.shots, `b1 a thrown bomb has a mesh in flight (${b1.meshes}/${b1.shots})`);
    // b2: throws share their shapes: 20 bombs in smash time leave GPU geometries flat
    await page.waitForTimeout(1500);
    await g(page, () => { const W = __game.W; W.phase = 'fever'; W.fever = 99; W.got = 3; });
    const geo0 = await g(page, () => __game.geometries);
    for (let i = 0; i < 20; i++) { await g(page, () => { const W = __game.W; W.cool.bomb = 0; __game.WD.useTool(W, 'bomb', { x: W.hero.x, y: 1, z: W.hero.z - 4 }); }); await page.waitForTimeout(60); }
    await page.waitForTimeout(1500);
    const geo1 = await g(page, () => __game.geometries);
    check(geo1 - geo0 <= 6, `b2 20 bombs: GPU geometries ${geo0} → ${geo1} (no new shapes per throw)`);
    // b4: in smash time a lent tool is used, never bought
    await g(page, () => { __game.save.coins = 9000; __game.pickTool('rocket'); });
    const b4 = await g(page, () => ({ coins: __game.save.coins, sel: __game.sel, owned: __game.save.owned.includes('rocket') }));
    check(b4.coins === 9000 && b4.sel === 'rocket' && !b4.owned, 'b4 smash time: tapping a lent tool selects it, takes no coins');
    await g(page, () => { __game.newLevel(1); __game.save.coins = 9000; __game.pickTool('rocket'); });
    const b4b = await g(page, () => ({ coins: __game.save.coins, sel: __game.sel }));
    check(b4b.coins === 9000 && b4b.sel === 'rocket', 'b4 a tool showing FREE: the tap is the free try, not a purchase');
    // b6: the bomb hint does not follow to the next level
    await g(page, () => { __game.pickTool('hammer'); const W = __game.W; __game.onEvent({ type: 'tooHard', x: W.chest.x, y: 1, z: W.chest.z + 2 }); });
    const hinted = await g(page, () => document.querySelector('.tool[data-t=bomb]').classList.contains('hint'));
    await g(page, () => __game.newLevel(2));
    check(hinted && !(await g(page, () => document.querySelector('.tool[data-t=bomb]').classList.contains('hint'))), 'b6 TOO HARD lights the bomb; a new level starts without that hint');
    // b8: a cancelled touch fires nothing
    await g(page, () => { __game.pickTool('bomb'); const W = __game.W; W.cool.bomb = 0; });
    const shots8 = await g(page, () => { const a = document.getElementById('app').getBoundingClientRect(), x = a.left + a.width / 2, y = a.top + a.height * 0.35;
      a && document.getElementById('app').dispatchEvent(new PointerEvent('pointerdown', { pointerId: 7, clientX: x, clientY: y, bubbles: true }));
      window.dispatchEvent(new PointerEvent('pointercancel', { pointerId: 7, clientX: x, clientY: y, bubbles: true })); return __game.W.shots.length + (__game.W.queued || []).length; });
    check(shots8 === 0, 'b8 a cancelled touch throws nothing');
    // b7: a finger still down when the card opens stops smashing; the next level does not take it over
    await g(page, () => { __game.pickTool('hammer'); __game.newLevel(2); });
    const [hx, hy] = await g(page, () => { const W = __game.W; const p = __game.scene.screenOf(W.hero.x, 1.2, W.box.z1); return __game.client(p[0], p[1]); });
    await page.mouse.move(hx, hy); await page.mouse.down(); await page.waitForTimeout(1200);
    await g(page, () => { const W = __game.W; W.got = 3; W.phase = 'free'; __game.onEvent({ type: 'clear' }); });
    await page.waitForTimeout(300);
    await page.waitForTimeout(600);
    const hb = await g(page, () => ({ aim: __game.W.hero.aim, goal: __game.W.hero.goal, hold: __game.W.hero.hold, swing: __game.W.hero.swingT }));
    await g(page, () => document.querySelector('#nextBtn').click()); await page.waitForTimeout(400);
    const after = await g(page, () => ({ goal: __game.W.hero.goal, aim: __game.W.hero.aim, hold: __game.W.hero.hold }));
    await page.mouse.up();
    check(!hb.aim && !hb.goal && !hb.hold && hb.swing < 0, `b7 the card is open: the held finger smashes nothing more (${JSON.stringify(hb)})`);
    check(!after.goal && !after.aim, 'b7 NEXT: the finger from the last level does not steer the new one');
    check(errors.length === 0, 'bug checks: no page errors: ' + (errors.join(' | ') || 'none'));
    await page.close();
    // b3: a save that comes after the first tap: NEXT goes on from the saved level, no bonus paid again
    const preset = { v: 1, coins: 500, total: 500, level: 3, owned: ['hammer', 'bomb'], best: {}, learned: { bomb: true, drag: true }, blocks: 9, levels: 3, day: 20200101 };
    const late = await open(browser, '', { port, init: `window.__preset = ${JSON.stringify(preset)}; window.__saveDelay = 7000;` });
    await tapAt(late.page, 360, 520);
    await waitFor(late.page, () => __game.saveLoaded, null, 12000);
    await g(late.page, () => { const W = __game.W; W.got = 3; W.phase = 'free'; __game.onEvent({ type: 'clear' }); document.querySelector('#nextBtn').click(); });
    const b3 = await g(late.page, () => __game.W.n);
    check(b3 === 3, `b3 late save: NEXT goes on at the saved level 4 (built level ${b3 + 1})`);
    await late.page.close();
    // b5: a returning player watching the attract mode: nothing is written
    const ret = await open(browser, '', { port, init: `window.__preset = ${JSON.stringify(preset)};` });
    await waitFor(ret.page, () => __game.saveLoaded, null, 5000); await ret.page.waitForTimeout(1500);
    const b5 = await g(ret.page, () => ({ demo: __game.demo, w: (window.__writes || []).length }));
    check(b5.demo && b5.w === 0, `b5 attract mode with an old save: no save written (${b5.w})`);
    await ret.page.close();
  }

  // ---- 15. first person and the device: phone = stick + HIT, desktop = keys + mouse
  if (!process.env.ONLY) {
    const ctx = await browser.newContext({ viewport: { width: 360, height: 640 }, isMobile: true, hasTouch: true });
    const page = await ctx.newPage(); const errors = []; page.on('pageerror', (e) => errors.push(e.message));
    await page.addInitScript('window.__speed = 1;' + BOT); await page.goto(`http://localhost:${port}/?local`);
    await waitFor(page, () => window.__game && __game.W && document.fonts.status === 'loaded', null, 40000);
    const ui = await g(page, () => ({ touch: document.getElementById('app').classList.contains('touch'), hit: getComputedStyle(document.getElementById('hit')).display !== 'none', keys: getComputedStyle(document.getElementById('keys')).display === 'none' }));
    check(ui.touch && ui.hit && ui.keys, 'phone: found by itself; HIT button shown, key hint hidden');
    const [sx, sy] = await g(page, () => __game.client(170, 860));
    const z0 = await g(page, () => __game.W.hero.z);
    await g(page, ([x, y]) => { const a = document.getElementById('app'); a.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 3, pointerType: 'touch', clientX: x, clientY: y, bubbles: true })); window.dispatchEvent(new PointerEvent('pointermove', { pointerId: 3, pointerType: 'touch', clientX: x, clientY: y - 40, bubbles: true })); }, [sx, sy]);
    await page.waitForTimeout(700);
    const st = await g(page, () => ({ z: __game.W.hero.z, stick: !document.getElementById('stick').hidden, demo: __game.demo }));
    await g(page, () => window.dispatchEvent(new PointerEvent('pointerup', { pointerId: 3, pointerType: 'touch', bubbles: true })));
    check(!st.demo && st.stick && st.z < z0 - 1, `phone: the stick walks the hero forward (z ${z0.toFixed(1)} → ${st.z.toFixed(1)})`);
    await page.screenshot({ path: path.join(out, '07-phone-fps.png') });
    // HIT held at a block in reach: the hammer keeps swinging at the crosshair
    await g(page, () => { const W = __game.W; W.hero.x = W.box.x0 + 4.5; W.hero.z = W.box.z1 + 2.2; __game.scene.look(-__game.scene.yaw, -__game.scene.pitch - 0.25); });
    await page.waitForTimeout(200);
    const w0 = await g(page, () => __game.W.smashed);
    await g(page, () => document.getElementById('hit').dispatchEvent(new PointerEvent('pointerdown', { pointerId: 4, pointerType: 'touch', bubbles: true })));
    await page.waitForTimeout(1500);
    await g(page, () => document.getElementById('hit').dispatchEvent(new PointerEvent('pointerup', { pointerId: 4, bubbles: true })));
    const w1 = await g(page, () => __game.W.smashed);
    check(w1 > w0 + 8, `phone: HIT held smashes what the crosshair shows (${w0} → ${w1} blocks)`);
    check(errors.length === 0, 'phone: no page errors: ' + (errors.join(' | ') || 'none'));
    await ctx.close();
    const d = await open(browser, '', { port });
    const dui = await g(d.page, () => ({ desk: document.getElementById('app').classList.contains('desk'), hit: getComputedStyle(document.getElementById('hit')).display === 'none' }));
    check(dui.desk && dui.hit, 'desktop: found by itself; HIT button hidden, key hint shown');
    const dz0 = await g(d.page, () => __game.W.hero.z);
    await d.page.keyboard.down('w'); await d.page.waitForTimeout(700); await d.page.keyboard.up('w');
    const dz1 = await g(d.page, () => ({ z: __game.W.hero.z, demo: __game.demo }));
    check(!dz1.demo && dz1.z < dz0 - 1, `desktop: W walks forward (z ${dz0.toFixed(1)} → ${dz1.z.toFixed(1)})`);
    await g(d.page, () => { const W = __game.W; W.hero.x = W.box.x0 + 4.5; W.hero.z = W.box.z1 + 2.2; __game.scene.look(-__game.scene.yaw, -__game.scene.pitch - 0.25); });
    await d.page.waitForTimeout(200);
    const s0 = await g(d.page, () => __game.W.smashed);
    await d.page.keyboard.down(' '); await d.page.waitForTimeout(1200); await d.page.keyboard.up(' ');
    const s1 = await g(d.page, () => __game.W.smashed);
    check(s1 > s0 + 8, `desktop: Space held smashes at the crosshair (${s0} → ${s1})`);
    await g(d.page, () => __game.pickTool('bomb')); await d.page.keyboard.press(' ');
    check(await g(d.page, () => __game.W.shots.length + (__game.W.queued || []).length) === 1, 'desktop: Space with the bomb throws it at the crosshair');
    check(d.errors.length === 0, 'desktop: no page errors: ' + (d.errors.join(' | ') || 'none'));
    await d.page.close();
  }

  await browser.close(); server.close();
  console.log(fails.length ? `\n${fails.length} FAILED` : '\nall passed');
  process.exit(fails.length ? 1 : 0);
}

module.exports = { serve, open, GPU, BOT };
if (require.main === module) main().catch((e) => { console.error(e); process.exit(1); });
