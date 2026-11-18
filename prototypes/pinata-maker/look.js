// PROTOTYPE - NOT FOR PRODUCTION
// Full-size look at every screen: renders the game at exactly 720 x 1280 and saves one image per state.
// Usage: node look.js <game-dir> <out-dir> [craft|smash|all]. Then open each image at full size: this is the step automated checks cannot do.
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const DIR = process.argv[2], OUT = process.argv[3], GROUP = process.argv[4] || 'all';
const PAPER = [0xff4fa3, 0xffc928, 0x2fb4ff, 0x3fd47a, 0x9b5cff];

(async () => {
  const MIME = { '.js': 'text/javascript', '.html': 'text/html', '.json': 'application/json' };
  const srv = http.createServer((q, r) => { const f = q.url.split('?')[0]; fs.readFile(path.join(DIR, f), (e, d) => { if (e) { r.statusCode = 404; return r.end(); } r.setHeader('content-type', MIME[path.extname(f)] || 'application/octet-stream'); r.end(d); }); }).listen(0);
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const c = await b.newContext({ viewport: { width: 720, height: 1280 }, deviceScaleFactor: 1, hasTouch: true }), p = await c.newPage();
  p.on('pageerror', e => console.log('PAGEERR', e.message));
  await p.addInitScript(() => { window.__seedSave = { owned: [0, 6, 11], gold: [], bats: [0], bat: 0, made: 12, smashed: 3, stars: 1, dupes: 0, coins: 240, candies: 500, shape: 0, day: 0, streak: 0, muted: false, lang: null, seen: { order: 1 } }; });
  await p.goto(`http://localhost:${srv.address().port}/index.html?local`);
  await p.waitForFunction(() => document.getElementById('game').dataset.ready === '1', null, { timeout: 30000 });
  await p.waitForTimeout(500);
  const game = (fn, arg) => p.evaluate(fn, arg);
  const shot = n => p.screenshot({ path: path.join(OUT, n + '.jpg'), type: 'jpeg', quality: 78 });
  const tap = async (x, y, w = 150) => { await p.mouse.move(x, y); await p.mouse.down(); await p.mouse.up(); await p.waitForTimeout(w); };
  /** A fresh pinata of `shape` at the given step, with an order showing. */
  const setup = (shape, step) => game(({ shape, step, PAPER }) => {
    const G = window.__game; G.newRound(); G.S.intro = null; G.S.acted = true; G.S.order = { shape, color: shape % 4, guest: shape % 6 };
    G.S.shape = shape; G.S.total = G.scene.buildPinata(shape, [], PAPER);
    if (step >= 1) { let k = 0; while (G.scene.paintAt(-1, -1, (k++ % 2) ? (shape + 1) % 5 : shape % 5, true)); }
    if (step >= 2) G.scene.addFace();
    G.S.step = Math.min(step, 3); G.S.done = 0; G.S.idle = 0;
  }, { shape, step, PAPER });

  if (GROUP === 'all' || GROUP === 'craft') {
    for (let s = 0; s < 6; s++) {
      await setup(s, 0); await p.waitForTimeout(900); await shot(`craft-${s}-0-shape`);
      await setup(s, 2); await p.waitForTimeout(700);
      // real taps on the pinata place the stickers, like a child would
      for (const [x, y] of [[300, 640], [420, 640], [360, 720], [300, 780], [430, 760], [360, 600]]) await tap(x, y, 120);
      await p.waitForTimeout(500); await shot(`craft-${s}-2-decorate`);
    }
    await setup(0, 1); await game(() => { window.__game.S.step = 1; }); await p.waitForTimeout(500); await shot('craft-0-1-paper');
    await setup(1, 2); await game(() => { const G = window.__game; G.S.step = 3; G.S.mix = [2, 1, 0, 0, 0]; G.S.fill = 3; G.scene.dropIn(0, 3); }); await p.waitForTimeout(350); await shot('craft-1-3-fill');
  }
  if (GROUP === 'all' || GROUP === 'smash') {
    for (const s of [0, 1, 3, 5]) {
      await setup(s, 2); for (const [x, y] of [[300, 640], [420, 640], [360, 720]]) await tap(x, y, 100);
      await game(() => { const G = window.__game; G.S.mix = [2, 2, 1, 0, 0]; G.enterSmash(); }); await p.waitForTimeout(2300); await shot(`smash-${s}-hang`);
      await tap(360, 700, 60); await shot(`smash-${s}-hit`); await p.waitForTimeout(250);
      if (s === 0) { for (let i = 0; i < 12; i++) await tap(360, 700, 170); await p.waitForTimeout(450); await shot('smash-0-burst'); await p.waitForTimeout(1500); await shot('smash-0-grab'); }
    }
  }
  await b.close(); srv.close();
})();
