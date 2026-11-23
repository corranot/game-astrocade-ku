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
const cfg = JSON.parse(fs.readFileSync(path.join(__dirname, 'game_config.json')));
const check = (ok, msg) => { console.log((ok ? 'ok   ' : 'FAIL ') + msg); if (!ok) fails.push(msg); };

/** In-page bot: taps like a player who wants the stars (hammer at the chest, bombs on steel), through the real game. */
const BOT = `window.__bot = (on) => { clearInterval(window.__botI); if (!on) return; window.__botI = setInterval(() => { const G = __game; if (!G || !G.W || G.resultsOpen) return; const W = G.W; const b = G.WD.botTap(W); if (!b) return; if (b.tool === 'hammer') G.WD.aimHammer(W, b.t, true); else G.WD.useTool(W, b.tool, b.p); }, 250 / (window.__speed || 1)); };`;

async function open(browser, q = '', opts = {}) {
  const page = await browser.newPage({ viewport: { width: 360, height: 640 }, deviceScaleFactor: opts.dpr || 1, locale: opts.locale || 'en-US', hasTouch: !!opts.touch, isMobile: !!opts.touch }); // touch: a phone (coarse pointer → stick + HIT)
  const errors = []; page.on('pageerror', (e) => errors.push(e.message)); page.on('console', (m) => { if (m.type() === 'error' && !/favicon/.test(m.text())) errors.push(m.text()); });
  if (opts.init) await page.addInitScript(opts.init);
  await page.addInitScript(`window.__speed = ${opts.speed || 1};` + BOT);
  await page.goto(`http://localhost:${opts.port}/?local${q}`);
  // (the edit showcase draws no text, so the game's font is never asked for there)
  await page.waitForFunction((still) => window.__game && window.__game.W && [...document.querySelectorAll('link[data-font]')].every((l) => l.media !== 'print') && (still || document.fonts.check('800 20px "Baloo 2"')) && document.fonts.status === 'loaded', /mode=edit/.test(q), { timeout: 40000 }).catch(async (e) => {
    // which part of the start never came (the bare timeout says nothing)
    const st = await page.evaluate(() => ({ game: !!window.__game, world: !!(window.__game && window.__game.W), links: [...document.querySelectorAll('link[data-font]')].map((l) => l.media), baloo: document.fonts.check('800 20px "Baloo 2"'), fonts: document.fonts.status, pending: [...document.fonts].filter((f) => f.status === 'loading').map((f) => f.family + ' ' + f.unicodeRange.slice(0, 20)) })).catch(() => null);
    console.log(`start never came for "${q}": ${JSON.stringify(st)} | errors: ${JSON.stringify(errors.slice(0, 3))}`); throw e;
  });
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
    // the attract show: the HUD is put away (the gear stays), the game's name stands in the top band and the call to action in the bottom band
    const at = await g(page, () => { const cs = (q) => getComputedStyle(document.querySelector(q)), r = (q) => document.querySelector(q).getBoundingClientRect(), f = document.querySelector('#app').getBoundingClientRect(), u = f.height / 1280; return { attract: document.querySelector('#hud').classList.contains('attract'), tools: cs('#tools').display, tip: cs('#tip').display, coins: cs('#coins').visibility, title: document.querySelector('#title').textContent, tTop: (r('#title').top - f.top) / u, tBot: (r('#title').bottom - f.top) / u, cta: document.querySelector('#cta').textContent, cTop: (r('#cta').top - f.top) / u, cBot: (r('#cta').bottom - f.top) / u, show: __game.scene.show.on }; });
    check(at.attract && at.show && at.tools === 'none' && at.tip === 'none' && at.coins === 'hidden', 'demo: the show runs and the HUD is put away for it');
    check(at.title.replace(/\s+/g, ' ').trim() === 'BLOCK SMASH CREW' && at.tTop >= 24 && at.tBot <= 1280 * 0.29, `demo: the game's name in the top band (${at.tTop.toFixed(0)}–${at.tBot.toFixed(0)} of 1280)`);
    check(at.cta === 'TAP TO SMASH!' && at.cTop >= 1280 * 0.82 && at.cBot <= 1280 - 40, `demo: "TAP TO SMASH!" in the bottom band (${at.cTop.toFixed(0)}–${at.cBot.toFixed(0)} of 1280)`);
    await shot(page, '01-demo');
    // ---- 2. the first tap anywhere: the real level starts and the hammer hits the boom barrel straight ahead (no walking)
    const box = await g(page, () => __game.W.box);
    const [sx, sy] = await screenOf(page, (box.x0 + box.x1) / 2 + 0.5, 2, box.z1 + 1);
    const t0 = Date.now(); await tapAt(page, sx, sy, 80);
    const h0 = await g(page, () => [__game.W.hero.x, __game.W.hero.z]);
    await waitFor(page, () => !__game.demo && __game.WD.wreck(__game.W) > 0, null, 4000).catch(() => {});
    const a = await g(page, () => ({ demo: __game.demo, hit: __game.W.smashed > 0 || __game.W.fuses.length > 0, h: [__game.W.hero.x, __game.W.hero.z], goal: __game.W.hero.goal }));
    check(!a.demo && a.hit, 'first tap: the real level starts and the hammer hits the boom barrel ahead');
    check(!a.goal && Math.hypot(a.h[0] - h0[0], a.h[1] - h0[1]) < 0.01, 'first tap: the hero does not walk by itself');
    await waitFor(page, () => __game.save.coins > 0, null, 5000).catch(() => {});
    const dt = Date.now() - t0, coins = await g(page, () => __game.save.coins);
    check(coins > 0 && dt < 4000, `first tap → first coins in ${dt} ms`);
    await shot(page, '02-first-tap');
    // ---- 3. hold: keeps smashing the block in reach under the finger (the hero is put at the wall, looking at it)
    await g(page, () => { const W = __game.W; W.hero.x = W.box.x0 + 4.5; W.hero.z = W.box.z1 + 2.2; __game.scene.look(-__game.scene.yaw, -__game.scene.pitch - 0.25); });
    await page.waitForTimeout(200);
    const w0 = await g(page, () => __game.WD.wreck(__game.W));
    const [cx, cy] = await g(page, () => __game.client(360, 640));
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
    // the price is read in the same step as the click: pieces still falling from the free try may pay coins meanwhile
    // (the save is written a microtask after the click: wait one before reading it)
    const buy = await g(page, async () => { __game.save.coins = 9000; document.querySelector('.tool[data-t=rocket]').click(); const r = { owned: __game.save.owned.includes('rocket'), paid: 9000 - __game.save.coins, sel: __game.sel }; await new Promise((ok) => setTimeout(ok, 0)); r.saved = (window.__writes || []).slice(-1)[0]; return r; });
    check(buy.owned && buy.paid === 8000 && buy.sel === 'rocket' && buy.saved && buy.saved.owned.includes('rocket'), `rocket bought: 8000 paid (${buy.paid}), selected, saved`);
    check(errors.length === 0, 'no page errors (sections 1–7): ' + (errors.join(' | ') || 'none'));
    await page.close();
  }

  // ---- 8. whole levels with the bot: stars → smash time → the next building follows by itself (no card); the card
  // comes every flow.cardEvery buildings once flow.cardAfterSec are played; NEXT is instant; no bonus paid twice
  {
    const { page, errors } = await open(browser, '&speed=2', { port, speed: 2 });
    const F = await g(page, () => window.gameConfig.flow);
    await tapAt(page, 360, 500); await g(page, () => __bot(true));
    // any result card from here on is noticed, however briefly it shows
    await g(page, () => { window.__cards = 0; setInterval(() => { if (__game.resultsOpen || !document.querySelector('#panel').hidden) window.__cards++; }, 30); });
    await waitFor(page, () => __game.W.phase === 'fever', null, 40000).catch(() => {});
    const fev = await g(page, () => ({ ph: __game.W.phase, fever: !document.querySelector('#fever').hidden, locks: [...document.querySelectorAll('.tool .lock')].filter((l) => !l.hidden).length, got: __game.W.got }));
    check(fev.ph === 'fever' && fev.fever && fev.locks === 0 && fev.got === 3, 'all 3 stars → SMASH TIME: golden frame, every tool unlocked');
    await shot(page, '04-smash-time');
    // smash time ends: paid and saved at once, a big word, then level 2 by itself
    await waitFor(page, () => __game.flow.chainT > 0, null, 60000).catch(() => {});
    const end = await g(page, () => ({ wait: __game.flow.chainT, open: __game.resultsOpen, panel: document.querySelector('#panel').hidden, n: __game.W.n, lvl: __game.save.level, w: (window.__writes || []).slice(-1)[0], words: [...document.querySelectorAll('#pops .pop')].map((p) => p.textContent), clear: __game.T('clear'), flat: __game.T('flat'), pill: document.querySelector('#nextpill').hidden, clock: document.querySelector('#ftime').hidden }));
    check(end.wait > 0 && end.wait <= F.nextDelay && !end.open && end.panel && end.pill && end.clock && end.n === 0 && end.lvl === 1 && end.w && end.w.level === 1, `smash time over: level 1 done and saved, no card, no NEXT pill, the next building ${end.wait.toFixed(1)} s away`);
    check(end.words.some((w) => w === end.clear || w === end.flat), `...with a big word at eye level (${end.words.join(' / ')})`);
    await shot(page, '05a-chain-word');
    await waitFor(page, () => __game.W.n === 1, null, 10000).catch(() => {});
    const two = await g(page, () => ({ n: __game.W.n, demo: __game.demo, cards: window.__cards, card: document.getElementById('lvcard').textContent, lv: !document.getElementById('lvcard').hidden, fl: __game.flow, coins: __game.save.coins }));
    check(two.n === 1 && !two.demo && two.cards === 0 && two.lv && /2/.test(two.card) && two.fl.n === 1 && two.fl.coins > 0 && two.fl.smashed > 0, `level 2 starts by itself with its level card; no result card was ever up (${two.cards}); the chain remembers ${two.fl.coins} coins, ${two.fl.smashed} blocks`);
    await shot(page, '05b-chain-level-2');
    // the card is due only with both: enough buildings AND enough seconds played
    await g(page, () => { __bot(false); __game.cardDue(); __game.setPlayT(window.gameConfig.flow.cardAfterSec - 20); const W = __game.W; W.got = 3; W.phase = 'free'; __game.onEvent({ type: 'clear' }); });
    const early = await g(page, () => ({ open: __game.resultsOpen, wait: __game.flow.chainT }));
    check(!early.open && early.wait > 0, `building ${F.cardEvery} of a chain before ${F.cardAfterSec} s of play: still no card`);
    await waitFor(page, () => __game.W.n === 2, null, 10000).catch(() => {});
    await g(page, () => { __game.cardDue(); __bot(true); });
    await waitFor(page, () => __game.resultsOpen, null, 90000).catch(() => {});
    const card = await g(page, () => ({ open: __game.resultsOpen, stars: document.querySelectorAll('.bigstars img.on').length, cups: document.querySelectorAll('.cups img').length, lvl: __game.save.level, coins: __game.save.coins, w: (window.__writes || []).slice(-1)[0], fl: __game.flow, here: __game.W.smashed, brag: document.querySelector('#panel .brag').textContent }));
    check(card.open && card.stars === 3 && card.cups === 2 && card.lvl === 3 && card.w && card.w.level === 3, `result card after ${F.cardEvery} buildings and ${F.cardAfterSec} s: 3 stars, 2 trophies, level 3 done and saved`);
    // (pieces still falling land behind the card: this building's count read now may be above what the card froze)
    const bragN = Number(card.brag.replace(/\D/g, ''));
    check(card.fl.smashed > 0 && bragN > card.fl.smashed && bragN <= card.fl.smashed + card.here, `the card sums the chain's buildings (${card.fl.smashed} before + up to ${card.here} here: "${card.brag}")`);
    await shot(page, '05-result');
    await g(page, () => __bot(false));
    await g(page, () => document.querySelector('#keepBtn').click());
    const keep = await g(page, () => ({ panel: document.querySelector('#panel').hidden, pill: !document.querySelector('#nextpill').hidden }));
    check(keep.panel && keep.pill, 'keep smashing: the card goes, a NEXT pill stays at the top');
    const c0 = await g(page, () => __game.save.coins);
    await g(page, () => document.querySelector('#nextpill').click());
    const c1 = await g(page, () => __game.save.coins);
    check(c1 - c0 < 1000, `opening the card again does not pay the level bonus twice (+${c1 - c0})`);
    const t = await g(page, () => { const t0 = performance.now(); document.querySelector('#nextBtn').click(); return { ms: performance.now() - t0, n: __game.W.n, panel: document.querySelector('#panel').hidden, demo: __game.demo, fl: __game.flow }; });
    check(t.n === 3 && t.panel && !t.demo && t.ms < 150 && t.fl.n === 0 && t.fl.coins === 0, `NEXT builds level 4 at once (${t.ms.toFixed(0)} ms); the next card counts from zero`);
    // enough seconds but a fresh chain: no card either
    await g(page, () => { const W = __game.W; W.got = 3; W.phase = 'free'; __game.onEvent({ type: 'clear' }); });
    const fresh = await g(page, () => ({ open: __game.resultsOpen, wait: __game.flow.chainT, t: __game.flow.playT }));
    check(!fresh.open && fresh.wait > 0 && fresh.t >= F.cardAfterSec, `the first building after a card: no card again (played ${fresh.t.toFixed(0)} s)`);
    // an open shop holds the next building back; it starts once the shop closes
    await g(page, () => document.querySelector('#coins').click());
    await page.waitForTimeout(F.nextDelay * 1000 + 600);
    const held = await g(page, () => ({ n: __game.W.n, shop: !document.querySelector('#shop').hidden }));
    await g(page, () => document.querySelector('#shopX').click());
    await waitFor(page, () => __game.W.n === 4, null, 10000).catch(() => {});
    const went = await g(page, () => __game.W.n);
    check(held.shop && held.n === 3 && went === 4, `the next building waits for an open shop (level ${held.n + 1} → ${went + 1} after closing)`);
    await page.waitForTimeout(500); await shot(page, '06-next-level');
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
    await tapAt(bad.page, 360, 520); await bad.page.waitForTimeout(3500); // the first tap is the boom barrel boom
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
    await g(page, () => { const W = __game.W; W.got = 3; W.phase = 'free'; __game.cardDue(); __game.onEvent({ type: 'clear' }); });
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
    await g(late.page, () => { const W = __game.W; W.got = 3; W.phase = 'free'; __game.cardDue(); __game.onEvent({ type: 'clear' }); document.querySelector('#nextBtn').click(); });
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
    // the attract show puts the HUD away: the in-play layout is read with its class lifted for the moment of the reading
    const ui = await g(page, () => { const hud = document.getElementById('hud'), at = hud.classList.contains('attract'); hud.classList.remove('attract'); const r = { touch: document.getElementById('app').classList.contains('touch'), hit: getComputedStyle(document.getElementById('hit')).display !== 'none', keys: getComputedStyle(document.getElementById('keys')).display === 'none' }; hud.classList.toggle('attract', at); return r; });
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
    // a quick still touch in the stick zone is a tap (taps are the main control for small children)
    await g(page, () => { __game.newLevel(0); __game.scene.look(-__game.scene.yaw, -__game.scene.pitch); });
    await page.waitForTimeout(300);
    await g(page, () => { const W = __game.W; W.hero.x = W.box.x0 + 4.5; W.hero.z = W.box.z1 + 2.2; __game.scene.look(0.35, -0.45); });
    await page.waitForTimeout(200);
    const hp = await g(page, () => [__game.W.hero.x, __game.W.hero.z]);
    const [tx, ty] = await g(page, () => { for (let y = 1100; y > 620; y -= 20) for (let x = 40; x < 340; x += 20) { const c = __game.client(x, y), t = __game.scene.pick(c[0], c[1]); const h = __game.W.hero; if (t && t.type === 'block' && Math.hypot(t.x + 0.5 - h.x, t.y + 0.5 - h.y - 1.3, t.z + 0.5 - h.z) <= __game.W.cfg.hero.reach - 0.2) return c; } return __game.client(200, 900); });
    await g(page, ([x, y]) => { const a = document.getElementById('app'); a.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 5, pointerType: 'touch', clientX: x, clientY: y, bubbles: true })); window.dispatchEvent(new PointerEvent('pointerup', { pointerId: 5, pointerType: 'touch', clientX: x, clientY: y, bubbles: true })); }, [tx, ty]);
    const tap = await g(page, () => ({ aim: !!(__game.W.hero.aim || __game.W.hero.swingT >= 0), goal: __game.W.hero.goal, stick: !document.getElementById('stick').hidden }));
    await page.waitForTimeout(400);
    const hp1 = await g(page, () => [__game.W.hero.x, __game.W.hero.z]);
    check(tap.aim && !tap.goal && !tap.stick && Math.hypot(hp1[0] - hp[0], hp1[1] - hp[1]) < 0.01, 'phone: a still touch in the stick zone is a tap on the block in reach (a swing, no walking, no stick shown)');
    // a tap on a far block: nothing walks, the resting stick pulses
    await g(page, () => { const W = __game.W; W.hero.x = W.box.x0 + 4.5; W.hero.z = W.box.z1 + 9; __game.scene.look(-__game.scene.yaw, -__game.scene.pitch); });
    await page.waitForTimeout(200);
    const far0 = await g(page, () => [__game.W.hero.x, __game.W.hero.z]);
    const [fx, fy] = await g(page, () => __game.client(360, 560));
    await g(page, ([x, y]) => { const a = document.getElementById('app'); a.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 6, pointerType: 'touch', clientX: x, clientY: y, bubbles: true })); window.dispatchEvent(new PointerEvent('pointerup', { pointerId: 6, pointerType: 'touch', clientX: x, clientY: y, bubbles: true })); }, [fx, fy]);
    await page.waitForTimeout(600);
    const far = await g(page, () => ({ h: [__game.W.hero.x, __game.W.hero.z], goal: __game.W.hero.goal, nudge: document.getElementById('stickHome').classList.contains('nudge') }));
    check(!far.goal && Math.hypot(far.h[0] - far0[0], far.h[1] - far0[1]) < 0.01 && far.nudge, `phone: a tap on a far block walks nowhere; the resting stick pulses ${JSON.stringify([far, far0])}`);
    // after the stick was used, a swipe anywhere else still turns the view (a stick touch once also became the look
    // finger and was never let go: every later swipe and tap was ignored as a "third finger")
    const yawA = await g(page, () => __game.scene.yaw);
    await g(page, () => { const a = document.getElementById('app'), c = __game.client(520, 520); a.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 7, pointerType: 'touch', clientX: c[0], clientY: c[1], bubbles: true })); for (let i = 1; i <= 8; i++) window.dispatchEvent(new PointerEvent('pointermove', { pointerId: 7, pointerType: 'touch', clientX: c[0] - i * 8, clientY: c[1], bubbles: true })); window.dispatchEvent(new PointerEvent('pointerup', { pointerId: 7, pointerType: 'touch', clientX: c[0] - 64, clientY: c[1], bubbles: true })); });
    const yawB = await g(page, () => __game.scene.yaw);
    check(Math.abs(yawB - yawA) > 0.05, `phone: after using the stick, a swipe elsewhere turns the view (yaw ${yawA.toFixed(2)} → ${yawB.toFixed(2)})`);
    // a slow press (250 ms) on a far block is still a tap on release: the resting stick pulses (a still press once
    // counted as a hold and did nothing)
    await g(page, () => { const W = __game.W; W.hero.x = W.box.x0 + 4.5; W.hero.z = W.box.z1 + 9; __game.scene.look(-__game.scene.yaw, -__game.scene.pitch); document.getElementById('stickHome').classList.remove('nudge'); });
    await page.waitForTimeout(200);
    await g(page, () => { const c = __game.client(360, 560); document.getElementById('app').dispatchEvent(new PointerEvent('pointerdown', { pointerId: 8, pointerType: 'touch', clientX: c[0], clientY: c[1], bubbles: true })); });
    await page.waitForTimeout(250);
    await g(page, () => { const c = __game.client(360, 560); window.dispatchEvent(new PointerEvent('pointerup', { pointerId: 8, pointerType: 'touch', clientX: c[0], clientY: c[1], bubbles: true })); });
    const slow = await g(page, () => document.getElementById('stickHome').classList.contains('nudge'));
    check(slow, 'phone: a slow press on a far block is still a tap (the resting stick pulses)');
    // the next level shows the resting stick even if a stick thumb was down when it started
    await g(page, () => { const a = document.getElementById('app'), c = __game.client(170, 900); a.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 9, pointerType: 'touch', clientX: c[0], clientY: c[1], bubbles: true })); window.dispatchEvent(new PointerEvent('pointermove', { pointerId: 9, pointerType: 'touch', clientX: c[0], clientY: c[1] - 40, bubbles: true })); });
    await g(page, () => __game.newLevel(1)); await page.waitForTimeout(150);
    await g(page, () => window.dispatchEvent(new PointerEvent('pointerup', { pointerId: 9, pointerType: 'touch', bubbles: true })));
    const home = await g(page, () => !document.getElementById('stickHome').hidden);
    check(home, 'phone: a new level started under a held stick still shows the resting stick');
    // the first touch is a swipe: a later tap at the sky does not swing at the boom barrel (the first-tap boom is only for a tap)
    {
      const c2 = await browser.newContext({ viewport: { width: 360, height: 640 }, isMobile: true, hasTouch: true });
      const p2 = await c2.newPage(); await p2.addInitScript('window.__speed = 1;' + BOT); await p2.goto(`http://localhost:${port}/?local`);
      await waitFor(p2, () => window.__game && __game.W && document.fonts.status === 'loaded', null, 40000);
      await p2.evaluate(() => { const a = document.getElementById('app'), c = __game.client(520, 520); a.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 1, pointerType: 'touch', clientX: c[0], clientY: c[1], bubbles: true })); for (let i = 1; i <= 8; i++) window.dispatchEvent(new PointerEvent('pointermove', { pointerId: 1, pointerType: 'touch', clientX: c[0] - i * 8, clientY: c[1], bubbles: true })); window.dispatchEvent(new PointerEvent('pointerup', { pointerId: 1, pointerType: 'touch', bubbles: true })); });
      await p2.evaluate(() => { __game.scene.look(0, -__game.scene.pitch + 0.6); const a = document.getElementById('app'), c = __game.client(360, 300); a.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 2, pointerType: 'touch', clientX: c[0], clientY: c[1], bubbles: true })); window.dispatchEvent(new PointerEvent('pointerup', { pointerId: 2, pointerType: 'touch', clientX: c[0], clientY: c[1], bubbles: true })); });
      await p2.waitForTimeout(800);
      const ft = await p2.evaluate(() => ({ s: __game.W.smashed, f: __game.W.fuses.length, demo: __game.demo }));
      check(!ft.demo && ft.s === 0 && ft.f === 0, `phone: after a swipe as the first touch, a tap at the sky smashes nothing (${JSON.stringify(ft)})`);
      await c2.close();
    }
    // Space with the shop open: no tool is thrown behind it
    {
      const { page: p3 } = await open(browser, '', { port });
      await p3.evaluate(() => { __game.newLevel(0); __game.save.owned.push('bomb'); __game.pickTool('bomb'); document.querySelector('#coins').click(); });
      await p3.waitForTimeout(200);
      const shopOpen = await p3.evaluate(() => !document.getElementById('shop').hidden);
      await p3.keyboard.press('Space'); await p3.waitForTimeout(200);
      const sp = await p3.evaluate(() => ({ shots: (__game.W.shots || []).length, cool: __game.W.cool.bomb || 0 }));
      check(shopOpen && sp.shots === 0 && sp.cool === 0, `Space with the shop open throws nothing (${JSON.stringify(sp)})`);
      await p3.close();
    }
    // a tap on a shining star throws the free star bomb at it
    await g(page, () => { __game.newLevel(3); __game.scene.look(-__game.scene.yaw, 0.35 - __game.scene.pitch); });
    await page.waitForTimeout(500);
    const mk = await g(page, () => __game.scene.starMarks()[0]);
    if (mk) { const [mx2, my2] = await g(page, ([x, y]) => __game.client(x, y), [mk.x, mk.y]); await page.touchscreen.tap(mx2, my2); }
    await page.waitForTimeout(100);
    const star = await g(page, () => ({ shots: __game.W.shots.filter((s) => s.star).length + (__game.W.queued || []).filter((e) => e.shot && e.shot.star).length, hand: __game.scene.heldTool }));
    check(!!mk && star.shots === 1, `phone: tapping a star mark throws a star bomb (${mk ? 'mark seen' : 'no mark in view'})`);
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

  // ---- 17. sounds: the recorded ones load after the first touch; with no assets the game plays on with code-made sounds
  if (!process.env.ONLY) {
    for (const none of [false, true]) {
      const { page, errors } = await open(browser, '', { port, init: none ? 'window.__noAssets = true;' : '' });
      await tapAt(page, 360, 600); await page.waitForTimeout(none ? 1500 : 6000);
      await g(page, () => { const W = __game.W; __game.WD.useTool(W, 'bomb', { x: W.hero.x, y: 1, z: W.hero.z - 5 }); });
      await page.waitForTimeout(1200);
      const r = await g(page, () => ({ rec: __game.Sound.recorded, smashed: __game.W.smashed }));
      check(errors.length === 0 && (none ? r.rec === 0 : r.rec >= 10), none ? `no assets: the game plays on with code-made sounds (${r.smashed} blocks)` : `recorded sounds loaded after the first touch (${r.rec})`);
      await page.close();
    }
  }

  // ---- 18. shop, upgrades, album, daily challenge
  if (!process.env.ONLY) {
    const { page, errors } = await open(browser, '', { port });
    await tapAt(page, 360, 600); await waitFor(page, () => __game.saveLoaded, null, 5000);
    await g(page, () => { __game.save.coins = 50000; document.querySelector('#coins').click(); });
    const open1 = await g(page, () => !document.querySelector('#shop').hidden && document.querySelectorAll('.srow').length);
    const r0 = await g(page, () => __game.W.cfg.tools.find((t) => t.id === 'bomb').r);
    await g(page, () => document.querySelector('[data-buy=bomb]').click());
    const up = await g(page, () => ({ lv: __game.save.lv.bomb, coins: __game.save.coins, r: __game.W.cfg.tools.find((t) => t.id === 'bomb').r, saved: (window.__writes || []).slice(-1)[0], label: (document.querySelector('[data-buy=bomb]').closest('.srow').querySelector('.slv b') || {}).textContent }));
    const price = cfg.upgrade.c0.bomb;
    check(open1 === 6 && up.lv === 2 && up.coins === 50000 - price && up.r > r0 && up.saved && up.saved.lv && up.saved.lv.bomb === 2 && /2/.test(up.label || ''), `shop: 6 tools; bomb upgraded to level 2, paid ${price}, bigger now (r ${r0} → ${up.r}), saved, the row says "${up.label}"`);
    await g(page, () => document.querySelector('[data-buy=rocket]').click());
    check(await g(page, () => __game.save.owned.includes('rocket') && __game.W.owned.includes('rocket')), 'shop: a locked tool is bought from the shop');
    await g(page, () => { __game.save.best = { 0: 2, 3: 1 }; document.querySelector('[data-tab=album]').click(); });
    const al = await g(page, () => ({ tiles: document.querySelectorAll('.atile').length, off: document.querySelectorAll('.atile.off').length, lit: document.querySelectorAll('.acups img.on').length }));
    check(al.tiles === 8 && al.off === 6 && al.lit === 3, `album: 8 buildings, 2 seen, their trophies lit (${JSON.stringify(al)})`);
    await g(page, () => document.querySelector('#shopX').click());
    // the daily challenge: from the card, double coins, the path's level unchanged, NEXT goes back to it
    await g(page, () => { __game.save.level = 3; __game.save.dailyDone = 0; __game.newLevel(3); const W = __game.W; W.got = 3; W.phase = 'free'; __game.cardDue(); __game.onEvent({ type: 'clear' }); });
    const hasDaily = await g(page, () => !!document.querySelector('#dailyBtn'));
    await g(page, () => document.querySelector('#dailyBtn').click());
    const d = await g(page, () => ({ daily: __game.W.daily, n: __game.W.n, mult: __game.W.coinMult, lvl: __game.save.level }));
    await g(page, () => { const W = __game.W; W.got = 3; W.phase = 'free'; __game.cardDue(); __game.onEvent({ type: 'clear' }); });
    const after = await g(page, () => ({ lvl: __game.save.level, done: __game.save.dailyDone, btn: !!document.querySelector('#dailyBtn') }));
    await g(page, () => document.querySelector('#nextBtn').click());
    const back = await g(page, () => ({ n: __game.W.n, daily: __game.W.daily }));
    check(hasDaily && d.daily && d.mult === 2 && d.n >= 32 && after.lvl === 4 && after.done > 20000000 && !after.btn && back.n === 4 && !back.daily, `daily: big building ×2 coins, done for today, NEXT back to level ${back.n + 1} (${JSON.stringify({ d, after })})`);
    check(errors.length === 0, 'shop/album/daily: no page errors: ' + (errors.join(' | ') || 'none'));
    await page.close();
  }

  // ---- 19. upgrade bugs found by reading the code (each check failed before its fix)
  {
    const { page, errors } = await open(browser, '', { port, init: `window.__preset = ${JSON.stringify({ v: 1, coins: 50000, total: 50000, level: 3, owned: ['hammer', 'bomb'], lv: { bomb: 5 }, muted: true, learned: { bomb: true, drag: true, shop: true }, day: 20200101 })};` });
    await waitFor(page, () => __game.saveLoaded, null, 5000);
    // g4: the coins pill opens the shop and throws nothing
    await g(page, () => { __game.newLevel(3); __game.pickTool('bomb'); const W = __game.W; W.hero.x = W.box.x0 + 6.5; W.hero.z = W.box.z1 + 1.6; __game.scene.look(-__game.scene.yaw, 0.25 - __game.scene.pitch); }); // a wall fills the view: the pill's corner points at blocks
    await page.waitForTimeout(200);
    const behind = await g(page, () => { const r = document.querySelector('#coins').getBoundingClientRect(); const t = __game.scene.pick(r.left + r.width / 2, r.top + r.height / 2); return t && t.type; });
    const [px, py] = await g(page, () => { const r = document.querySelector('#coins').getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; });
    await page.mouse.click(px, py); await page.waitForTimeout(150);
    const g4 = await g(page, () => ({ shop: !document.querySelector('#shop').hidden, shots: __game.W.shots.length + (__game.W.queued || []).length, sel: __game.sel }));
    check(behind === 'block' && g4.shop && g4.shots === 0 && g4.sel === 'bomb', `g4 the coins pill opens the shop and throws nothing (behind it: ${behind}; ${JSON.stringify(g4)})`);
    // g7: a number key behind the open shop buys nothing
    await g(page, () => { __game.W.tried.add('rocket'); window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Digit3', key: '3', bubbles: true })); });
    check(await g(page, () => !__game.save.owned.includes('rocket') && __game.save.coins === 50000), 'g7 a number key behind the open shop buys nothing');
    // g6: smash time does not run out behind the shop
    await g(page, () => { const W = __game.W; W.got = 3; W.phase = 'fever'; W.fever = 3; });
    const f0 = await g(page, () => __game.W.fever); await page.waitForTimeout(1200); const f1 = await g(page, () => __game.W.fever);
    check(Math.abs(f1 - f0) < 0.05, `g6 smash time pauses while the shop is open (${f0.toFixed(2)} → ${f1.toFixed(2)})`);
    await g(page, () => { document.querySelector('#shopX').click(); });
    // g10: an upgraded tool's ring starts full
    await g(page, () => { const W = __game.W; W.phase = 'free'; W.fever = 0; W.cool.bomb = 0; __game.WD.useTool(W, 'bomb', { x: W.hero.x, y: 1, z: W.hero.z - 6 }); });
    await page.waitForTimeout(60);
    const ring = await g(page, () => Number(document.querySelector('.tool[data-t=bomb]').style.getPropertyValue('--c')));
    check(ring > 0.9, `g10 an upgraded bomb's cooldown ring starts full (${ring})`);
    // g1: a tipping tower is drawn as it tips (and its old blocks are gone from the picture)
    await g(page, () => { __game.newLevel(3); const W = __game.W, cx = (W.box.x0 + W.box.x1) / 2 + 0.5, cz = W.box.z0 + 6.5; for (let z = Math.floor(cz - 6); z <= cz + 6; z++) for (let x = Math.floor(cx - 6); x <= cx + 6; x++) for (let y = 0; y < 2; y++) if (W.g.get(x, y, z) && Math.hypot(x + 0.5 - cx, z + 0.5 - cz) < 5) W.g.set(x, y, z, 0); W.cool.bomb = 0; __game.WD.useTool(W, 'bomb', { x: cx, y: 2.5, z: cz + 3.5 }); });
    await waitFor(page, () => __game.W.falls.some((f) => f.topple), null, 4000).catch(() => {});
    await page.waitForTimeout(100);
    const g1 = await g(page, () => ({ world: __game.W.falls.filter((f) => f.topple).length, drawn: __game.scene.counts.falls }));
    check(g1.world >= 1 && g1.drawn >= 1, `g1 a tipping tower is drawn while it tips (${JSON.stringify(g1)})`);
    // g9: snow falls around the player
    await g(page, () => __game.newLevel(2)); await page.waitForTimeout(400);
    const fl = await g(page, () => { const a = __game.scene.flakesAt, c = __game.scene.camera.position; return a ? Math.hypot(a[0] - c.x, a[1] - c.z) : -1; });
    check(fl >= 0 && fl < 1, `g9 the snow's box is around the player (${fl.toFixed ? fl.toFixed(2) : fl})`);
    // g2: a muted save stays muted when the recorded music arrives
    await tapAt(page, 360, 600); await page.waitForTimeout(5000);
    const g2 = await g(page, () => __game.Sound.musicLevel);
    check(g2 === 0, `g2 a muted save keeps the music silent (gain ${g2})`);
    // g3: after run() again the recorded music comes back
    await g(page, () => { __game.Sound.setMuted(false); window.run('play'); }); await page.waitForTimeout(400); await tapAt(page, 360, 600); await page.waitForTimeout(800);
    check(await g(page, () => __game.Sound.songOn), 'g3 after run() again the recorded music plays again');
    check(errors.length === 0, 'upgrade bug checks: no page errors: ' + (errors.join(' | ') || 'none'));
    await page.close();
    // g5: no shop (so no purchase) before the save has been read
    const late = await open(browser, '', { port, init: 'window.__saveDelay = 6000;' });
    await tapAt(late.page, 360, 600); await g(late.page, () => document.querySelector('#coins').click());
    check(await g(late.page, () => document.querySelector('#shop').hidden && !__game.saveLoaded), 'g5 the shop waits for the save (nothing bought that a late save would undo)');
    await late.page.close();
  }

  // ---- 16. first-person bugs found by reading the code (each check failed before its fix)
  {
    const { page, errors } = await open(browser, '', { port });
    const key = (type, code, k) => g(page, ([type, code, k]) => window.dispatchEvent(new KeyboardEvent(type, { code, key: k, bubbles: true })), [type, code, k]);
    // f6: an Arabic layout walks with the W key's position
    const z0 = await g(page, () => __game.W.hero.z);
    await key('keydown', 'KeyW', 'ص'); await page.waitForTimeout(600); await key('keyup', 'KeyW', 'ص');
    const z1 = await g(page, () => __game.W.hero.z);
    check(z1 < z0 - 1, `f6 Arabic keyboard: the W position walks (z ${z0.toFixed(1)} → ${z1.toFixed(1)})`);
    // f2: a key still held when the card opens does not walk the hero behind it
    await g(page, () => { const W = __game.W; W.hero.x = W.g.W / 2; W.hero.z = W.g.D - 4; __game.scene.look(Math.PI - __game.scene.yaw, 0); }); // face away from the building: open lawn ahead
    await key('keydown', 'KeyW', 'w'); await page.waitForTimeout(200);
    await g(page, () => { const W = __game.W; W.got = 3; W.phase = 'free'; __game.cardDue(); __game.onEvent({ type: 'clear' }); });
    const zc = await g(page, () => __game.W.hero.z); await key('keyup', 'KeyW', 'w'); await page.waitForTimeout(600);
    const zd = await g(page, () => __game.W.hero.z);
    check(Math.abs(zd - zc) < 0.05 && zc < 51.9, `f2 the card is open: the hero stands still (z ${zc.toFixed(2)} → ${zd.toFixed(2)})`);
    // f7: keys 1-6 buy nothing behind the card
    await g(page, () => { __game.save.coins = 50000; __game.W.tried.add('rocket'); }); // free try used: a tap would buy
    await key('keydown', 'Digit3', '3'); await key('keyup', 'Digit3', '3');
    const f7 = await g(page, () => ({ coins: __game.save.coins, owned: __game.save.owned.includes('rocket') }));
    check(f7.coins === 50000 && !f7.owned, 'f7 the card is open: number keys buy nothing');
    await g(page, () => __game.nextLevel()); await page.waitForTimeout(300);
    // f5: a thrown bomb shows the bomb in the hand, not the hammer
    await g(page, () => __game.pickTool('bomb'));
    await key('keydown', 'Space', ' '); await page.waitForTimeout(80); const held = await g(page, () => __game.scene.heldTool); await key('keyup', 'Space', ' ');
    check(held === 'bomb', `f5 the hand shows the thrown tool (${held})`);
    // f4: a quick look-drag that starts on a near block smashes nothing
    await page.waitForTimeout(500);
    await g(page, () => { const W = __game.W; W.hero.x = W.box.x0 + 4.5; W.hero.z = W.box.z1 + 2.2; __game.scene.look(-__game.scene.yaw, -__game.scene.pitch - 0.25); W.hero.cool = 0; });
    // nothing from earlier still flying, falling or burning (its landing would count as smashed)
    await waitFor(page, () => { const W = __game.W; return !W.shots.length && !W.falls.length && !W.fuses.length; }, null, 6000).catch(() => {});
    await page.waitForTimeout(200);
    const s0 = await g(page, () => __game.W.smashed);
    const [mx, my] = await g(page, () => __game.client(360, 640));
    // in the page, timed by frames (not by the machine's speed): down, two frames, then a drag; a touch, since the keys used above put the mouse on the lock path
    await g(page, async ([x, y]) => {
      const fire = (t, dx) => (t === 'pointerdown' ? document.getElementById('app') : window).dispatchEvent(new PointerEvent(t, { pointerId: 11, pointerType: 'touch', clientX: x + dx, clientY: y, bubbles: true }));
      const frame = () => new Promise((r) => requestAnimationFrame(r));
      fire('pointerdown', 0); await frame(); await frame();
      for (let i = 1; i <= 6; i++) fire('pointermove', i * 12);
      fire('pointerup', 72);
    }, [mx, my]);
    await page.waitForTimeout(700);
    const s1 = await g(page, () => __game.W.smashed);
    check(s1 === s0, `f4 a look-drag starting on a near block smashes nothing (${s0} → ${s1})`);
    // f8: a tap near the horizon walks at most to the lot's edge
    const f8 = await g(page, () => { const W = __game.W; __game.WD.aimHammer(W, { type: 'ground', x: -150, z: 170 }, false); const gl = W.hero.goal; __game.WD.aimHammer(W, null); return gl; });
    check(f8 && f8.x >= -12 && f8.z <= 40 + 12, `f8 a far ground tap walks at most to the edge (${JSON.stringify(f8)})`);
    // f3: the click that asks for mouse lock (lock coming before the button is let go) leaves no finger behind
    await key('keydown', 'KeyD', 'd'); await key('keyup', 'KeyD', 'd');
    await g(page, () => { const cv = document.getElementById('cv'); cv.requestPointerLock = () => { Object.defineProperty(document, 'pointerLockElement', { get: () => cv, configurable: true }); setTimeout(() => document.dispatchEvent(new Event('pointerlockchange')), 0); }; }); // the lock comes a moment later, before the button is let go (as in Chrome)
    await page.mouse.move(mx - 100, my - 200); await page.mouse.down(); await page.waitForTimeout(60); await page.mouse.up(); await page.waitForTimeout(800);
    const f3 = await g(page, () => ({ hold: __game.W.hero.hold, goal: __game.W.hero.goal }));
    check(!f3.hold && !f3.goal, `f3 the mouse-lock click leaves no finger: the hero does not walk or smash by himself (${JSON.stringify(f3)})`);
    // f1: the card gives the cursor back so NEXT can be clicked
    let exited = false; await g(page, () => { document.exitPointerLock = () => { Object.defineProperty(document, 'pointerLockElement', { get: () => null, configurable: true }); document.dispatchEvent(new Event('pointerlockchange')); window.__exited = true; }; });
    await g(page, () => { const W = __game.W; W.got = 3; W.phase = 'free'; __game.cardDue(); __game.onEvent({ type: 'clear' }); });
    exited = await g(page, () => !!window.__exited && document.pointerLockElement === null);
    check(exited, 'f1 the result card releases the mouse lock (the cursor comes back for NEXT)');
    check(errors.length === 0, 'first-person bug checks: no page errors: ' + (errors.join(' | ') || 'none'));
    await page.close();
  }

  // panels (found by the bug hunt on the new panel system)
  {
    const { page, errors } = await open(browser, '', { port });
    // p1: the gear on the attract screen pauses the world; the demo must not pile up rockets meanwhile
    // the show keeps several shots in the air by design: what counts is that none are added while the panel is open
    await page.click('#gear'); await page.waitForTimeout(300);
    const s0 = await g(page, () => __game.W.shots.length + (__game.W.queued || []).length);
    await page.waitForTimeout(6000);
    const p1 = await g(page, () => ({ open: !document.querySelector('#settings').hidden, shots: __game.W.shots.length + (__game.W.queued || []).length, demo: __game.demo }));
    check(p1.open && p1.shots <= s0, `p1 settings open on the attract screen: no shots pile up behind the pause (${s0} → ${p1.shots})`);
    // p3: Escape closes the open panel
    await page.keyboard.press('Escape'); await page.waitForTimeout(400);
    check(await g(page, () => document.querySelector('#settings').hidden), 'p3 Escape closes the settings panel');
    // p4: a new level never starts behind an open settings panel
    await page.click('#gear'); await page.waitForTimeout(300);
    await g(page, () => __game.newLevel(1)); await page.waitForTimeout(300);
    check(await g(page, () => document.querySelector('#settings').hidden), 'p4 a level change closes the settings panel');
    // p2: a double tap on a price buys once (it unlocked the rocket and then upgraded it: 29,000 coins for an 8,000 tap)
    await g(page, () => { __game.save.coins = 60000; });
    // (the coins pill pulses while something is affordable, so it is clicked from the page)
    await g(page, () => document.querySelector('#coins').click()); await page.waitForTimeout(400);
    const p2 = await g(page, () => { const q = () => document.querySelector('#shop [data-buy="rocket"]'); q().click(); const again = q(); if (again) again.click(); return { coins: __game.save.coins, owned: __game.save.owned.includes('rocket'), lv: (__game.save.lv || {}).rocket || 1 }; });
    check(p2.owned && p2.lv === 1 && p2.coins === 60000 - 8000, `p2 a double tap on a price buys once (${JSON.stringify(p2)})`);
    await page.waitForTimeout(500);
    const p2b = await g(page, () => { document.querySelector('#shop [data-buy="rocket"]').click(); return (__game.save.lv || {}).rocket || 1; });
    check(p2b === 2, `p2 a second, separate tap a moment later does buy the upgrade (level ${p2b})`);
    // w1: a big word always shows, also while the status column is tall (clock + wave banner + NEXT pill) and in the
    // languages whose words wrap to two lines (they were dropped with only the fanfare left)
    const dropped = [];
    for (const lang of ['en', 'es', 'ar', 'id']) {
      await g(page, (l) => { const G = __game; G.setLang(l); G.newLevel(5); }, lang); await page.waitForTimeout(400);
      for (const key of ['record', 'waveClear', 'smashTime', 'treasure']) {
        await g(page, () => { document.querySelector('#ftime').hidden = false; document.querySelector('#nextpill').hidden = false; __game.waveBanner(3); document.querySelector('#pops').innerHTML = ''; });
        await page.waitForTimeout(250);
        const text = await g(page, (k) => { const t = k === 'record' ? __game.T('record', '1,234') : __game.T(k); __game.banner(t); return t; }, key);
        const shown = await page.waitForFunction((t) => [...document.querySelectorAll('#pops .pop')].some((e) => e.textContent.replace(/\s+/g, ' ').trim() === t.replace(/\s+/g, ' ').trim()), text, { timeout: 1500, polling: 30 }).then(() => true, () => false);
        if (!shown) dropped.push(`${lang}:${key}`);
        await page.waitForTimeout(1000);
      }
    }
    check(dropped.length === 0, `w1 big words show with a full status column in en, es, ar, id (dropped: ${dropped.join(', ') || 'none'})`);
    check(errors.length === 0, 'panel bug checks: no page errors: ' + (errors.join(' | ') || 'none'));
    await page.close();
  }

  // ---- 20. bugs found by the fourth hunt (each check failed before its fix)
  if (!process.env.ONLY || process.env.ONLY === 'hunt4') {
    const LANGS = Object.keys(cfg.langNames);
    // the text's own box (not its element's) in frame units as drawn (the pulse included), its laid-out width and its font size
    const textBox = (page, sel) => g(page, (sel) => { const f = document.querySelector('#app').getBoundingClientRect(), e = document.querySelector(sel), rg = document.createRange(); rg.selectNodeContents(e); const r = rg.getBoundingClientRect(), k = 720 / f.width; return { l: Math.round((r.left - f.left) * k), r: Math.round((r.right - f.left) * k), w: Math.round(e.offsetWidth * k), fs: Math.round(parseFloat(getComputedStyle(e).fontSize) * k) }; }, sel);
    const fits = (b, w) => b.l >= 0 && b.r <= 720 && b.w <= w + 1;
    // h1: the call to action and the game's name fit the frame in every language, from the save and picked in settings
    {
      const CT = cfg.demo.cta, off = [], sizes = {};
      const a = await open(browser, '', { port }); await a.page.waitForTimeout(500); await a.page.click('#gear'); await a.page.waitForTimeout(300);
      for (const l of LANGS) {
        await g(a.page, (l) => document.querySelector(`#settings [data-l="${l}"]`).click(), l); await a.page.waitForTimeout(400);
        const c = await textBox(a.page, '#cta'), t = await textBox(a.page, '#title');
        if (!fits(c, CT.width) || !fits(t, 720)) off.push(`${l} picked in settings: words ${c.l}..${c.r} at ${c.fs}, name ${t.l}..${t.r}`);
        if (l === 'id') await shot(a.page, '20-attract-id');
      }
      await a.page.close();
      for (const l of LANGS) {
        const b = await open(browser, '', { port, init: `window.__preset = ${JSON.stringify({ lang: l, level: 0 })};` }); await waitFor(b.page, () => __game.saveLoaded); await b.page.waitForTimeout(500);
        const c = await textBox(b.page, '#cta'), t = await textBox(b.page, '#title'); sizes[l] = c.fs;
        if (!fits(c, CT.width) || !fits(t, 720)) off.push(`${l} from the save: words ${c.l}..${c.r} at ${c.fs}, name ${t.l}..${t.r}`);
        await b.page.close();
      }
      check(off.length === 0, `h1 the attract show's words and name fit the frame in ${LANGS.length} languages, both ways (sizes ${JSON.stringify(sizes)}; off: ${off.join(' | ') || 'none'})`);
      check(Object.values(sizes).every((v) => v >= Math.floor(CT.size * CT.min)) && sizes.en > sizes.id, `h1 short words stay bigger than long ones, none under ${Math.floor(CT.size * CT.min)} (en ${sizes.en}, id ${sizes.id})`);
    }
    const { page, errors } = await open(browser, '', { port });
    await waitFor(page, () => __game.saveLoaded); await tapAt(page, 360, 500); await waitFor(page, () => !__game.demo);
    const toFever = () => g(page, () => { const W = __game.W; W.got = W.need; W.phase = 'fever'; W.fever = W.cfg.fever.dur; W.feverT = 0; __game.onEvent({ type: 'fever' }); });
    // counts, frame by frame, how many words with this text are up at once
    const watch = (key) => g(page, (key) => { const c = window.__cnt = { max: 0, frames: 0, on: true }, t = __game.T(key); const tick = () => { const n = [...document.querySelectorAll('#pops .pop')].filter((p) => p.textContent === t).length; if (n) c.frames++; c.max = Math.max(c.max, n); if (c.on) requestAnimationFrame(tick); }; tick(); }, key);
    const flatten = () => g(page, () => { const W = __game.W; W.left = Math.floor(W.total * 0.03); });
    // h2: a building flattened in smash time says FLATTENED once (the second trophy said it too, under the first)
    await g(page, () => __game.newLevel(2)); await page.waitForTimeout(2600); await toFever(); await page.waitForTimeout(1500);
    await watch('flat'); await flatten(); await page.waitForTimeout(400); await shot(page, '20-flattened');
    const wasFlat = await g(page, () => __game.W.flat === true);
    await page.waitForTimeout(2200);
    const fl = await g(page, () => { window.__cnt.on = false; return { ...window.__cnt }; }); fl.flat = wasFlat;
    check(fl.flat && fl.frames > 0 && fl.max === 1, `h2 FLATTENED stands on screen once (most at one time: ${fl.max}, frames seen: ${fl.frames})`);
    // h3: when the result card is due the card itself says FLATTENED (the word under it was never seen)
    await g(page, () => { __game.newLevel(3); __game.cardDue(); }); await page.waitForTimeout(2600); await toFever(); await page.waitForTimeout(1200);
    await flatten(); await waitFor(page, () => __game.resultsOpen, null, 5000); await page.waitForTimeout(2200);
    const figure = (t) => (/k$/.test(t) ? parseFloat(t) * 1000 : /M$/.test(t) ? parseFloat(t) * 1e6 : +t);
    const c1 = await g(page, () => ({ seen: document.querySelector('#panel .title').offsetHeight > 0, title: document.querySelector('#panel .title').textContent, flat: __game.T('flat'), clear: __game.T('clear'), cnt: document.querySelector('#panel .cnt').textContent, was: __game.W.flat }));
    check(c1.was && c1.seen && c1.title === c1.flat && c1.title !== c1.clear, `h3 a flattened building's result card is titled "${c1.flat}" (it says "${c1.title}")`);
    await shot(page, '20-card-flattened');
    // h4: KEEP SMASHING and the card again: the coin figure never drops (the level bonus was left out the second time)
    await g(page, () => document.querySelector('#keepBtn').click()); await page.waitForTimeout(400);
    await g(page, () => document.querySelector('#nextpill').click()); await page.waitForTimeout(2200);
    const c2 = await g(page, () => ({ open: __game.resultsOpen, cnt: document.querySelector('#panel .cnt').textContent, title: document.querySelector('#panel .title').textContent }));
    check(c2.open && figure(c2.cnt) >= figure(c1.cnt) && c2.title === c1.flat, `h4 the card's coins are the same or more when it opens again (${c1.cnt} → ${c2.cnt})`);
    // h6: words never stand on each other, also when the view is full for a second: a small word that found no place
    // goes, a big one takes the place of the words under it
    await g(page, () => { __game.setLang('en'); __game.newLevel(2); document.getElementById('lvcard').hidden = true; }); await page.waitForTimeout(400);
    const pairs = () => g(page, () => { const k = 720 / document.querySelector('#app').getBoundingClientRect().width, ps = [...document.querySelectorAll('#pops .pop')].map((p) => ({ t: p.textContent, l: (p.offsetLeft - p.offsetWidth / 2) * k, r: (p.offsetLeft + p.offsetWidth / 2) * k, t0: (p.offsetTop - p.offsetHeight / 2) * k, b: (p.offsetTop + p.offsetHeight / 2) * k })), bad = []; for (let i = 0; i < ps.length; i++) for (let j = i + 1; j < ps.length; j++) { const a = ps[i], b = ps[j]; if (Math.min(a.r, b.r) - Math.max(a.l, b.l) > 1 && Math.min(a.b, b.b) - Math.max(a.t0, b.t0) > 1) bad.push(`${a.t} on ${b.t}`); } return { n: ps.length, bad, big: ps.some((p) => p.t === 'KABOOM!') }; });
    await g(page, () => { const G = __game; G.words.life = 4000; G.words.up.length = 0; document.querySelectorAll('#pops .pop').forEach((p) => p.remove()); for (let i = 0; i < 40; i++) G.pop('BONK! BONK!', 360, 530, 'p-mid'); });
    await page.waitForTimeout(1600);
    const w6 = await pairs();
    check(w6.n >= 4 && w6.bad.length === 0, `h6 forty words asked for at once: ${w6.n} stand, none on another (${w6.bad.slice(0, 3).join(' | ') || 'none'})`);
    await g(page, () => __game.banner('KABOOM!', 'p-big', -80)); await page.waitForTimeout(1600);
    const w6b = await pairs();
    check(w6b.big && w6b.bad.length === 0, `h6 a big word into the full view still shows, with nothing under it (${w6b.bad.slice(0, 3).join(' | ') || 'none'})`);
    await g(page, () => { const G = __game; G.words.life = 950; G.words.up.length = 0; document.querySelectorAll('#pops .pop').forEach((p) => p.remove()); });
    check(errors.length === 0, 'hunt 4 checks: no page errors: ' + (errors.join(' | ') || 'none'));
    await page.close();
    // h5: a save that comes late leaves the settings panel open over the show (the show moves to the player's building)
    const late = await open(browser, '', { port, init: `window.__saveDelay = 6000; window.__preset = ${JSON.stringify({ level: 3, levels: 3, coins: 500, total: 500, owned: ['hammer', 'bomb'], lang: 'id' })};` });
    await late.page.click('#gear'); await late.page.waitForTimeout(300);
    const s0 = await g(late.page, () => ({ open: !document.querySelector('#settings').hidden, loaded: __game.saveLoaded }));
    await waitFor(late.page, () => __game.saveLoaded, null, 20000); await late.page.waitForTimeout(400);
    const s1 = await g(late.page, () => ({ open: !document.querySelector('#settings').hidden, n: __game.W.n, demo: __game.demo, title: document.querySelector('#settings .ptitle .tx').textContent, want: __game.T('settings'), lang: __game.lang }));
    check(s0.open && !s0.loaded && s1.open && s1.n === 3 && s1.demo, `h5 a late save leaves the settings open over the show (${JSON.stringify(s1)})`);
    check(s1.lang === 'id' && s1.title === s1.want, `h5 ...and the panel then speaks the save's language ("${s1.title}")`);
    await late.page.close();
  }

  // 21 "aaa1": the coach steps go by themselves and dim less, one BONK word at a time, no dust in the camera's face
  if (!process.env.ONLY || process.env.ONLY === 'aaa1') {
    const CO = cfg.coach, LK = cfg.look, { page, errors } = await open(browser, '', { port, touch: true });
    const pause = (ms) => page.waitForTimeout(ms);
    // the coach step on screen: '' (none), 'drag' (walk), 'swipe' (look) or 'press' (smash, bomb)
    const coachNow = () => g(page, () => { const c = document.getElementById('coach'); return c.hidden ? '' : c.className.replace('coach ', ''); });
    // nothing is in reach in the sky: the camera turns up (whichever sign that is) and the tap goes to the middle of the view
    const skyKind = () => g(page, () => { const G = __game, c = G.client(360, 500), t = G.scene.pick(c[0], c[1]); return t ? t.type : 'none'; });
    const lookSky = async () => { for (const s of [3, -6]) { await g(page, (s) => __game.scene.look(0, s), s); await pause(250); const k = await skyKind(); if (k === 'none' || k === 'air') return k; } return null; };
    await pause(600); await tapAt(page, 360, 420); await pause(450); await shot(page, '21-first-tap');
    await waitFor(page, () => { const W = __game.W; return !__game.demo && W.phase === 'play' && W.t > 1.6 && document.getElementById('lvcard').hidden; }, null, 20000).catch(() => {});
    await pause(500);
    // a1: a player who only taps is not asked to walk; the first step is the look, under a light dim
    const first = await coachNow(), dim = await g(page, () => Math.max(0, ...[...getComputedStyle(document.getElementById('coach')).backgroundImage.matchAll(/rgba\(18, 28, 70, ([\d.]+)\)/g)].map((m) => +m[1])));
    check(first === 'swipe', `a1 after the first tap the coach shows the look step, not the walk step ("${first}")`);
    check(dim === CO.dim, `a1 ...and dims the game by coach.dim ${CO.dim} (${dim})`);
    // a2: the step goes by itself after coach.maxSec, without the lesson counting as learned in the save
    await pause(CO.maxSec * 1000 + 700);
    const a2 = { now: await coachNow(), drag: await g(page, () => __game.save.learned.drag) };
    check(a2.now !== 'swipe' && a2.drag === false, `a2 the look step hides by itself after ${CO.maxSec} s, the save's lesson untouched (${JSON.stringify(a2)})`);
    await pause(1200); const a2b = await coachNow();
    check(a2b !== 'swipe' && a2b !== 'drag', `a2 ...and does not come back in this session, nor does the walk step show unasked ("${a2b}")`);
    // a3: a tap on something out of reach asks for the walk step (the stick's nudge fires there)
    const far = await lookSky(); if (far) await tapAt(page, 360, 500);
    const asked = await waitFor(page, () => /drag/.test(document.getElementById('coach').className) && !document.getElementById('coach').hidden, null, 2000).then(() => true, () => false);
    check(!!far && asked, `a3 a tap out of reach (the sky: ${far}) shows the walk step`);
    // a4: the walk step goes by itself too, and a second far tap does not bring it back
    await pause(CO.maxSec * 1000 + 700); const a4 = await coachNow(); if (far) await tapAt(page, 360, 500); await pause(600);
    const a4b = { now: await coachNow(), walk: await g(page, () => __game.save.learned.walk) };
    check(a4 !== 'drag' && a4b.now !== 'drag' && a4b.walk === false, `a4 the walk step hides by itself after ${CO.maxSec} s and stays away ("${a4}", ${JSON.stringify(a4b)})`);
    // the camera level again: the words below need a point of the yard in view
    await g(page, () => __game.scene.look(0, -__game.scene.pitch)); await pause(250);
    // b: four robots knocked over at once give one BONK word (and all their coins); the next word comes after words.bonkGap
    const bonk = await g(page, async (gap) => { const G = __game, h = G.W.hero, word = G.T('bonk'), wait = (ms) => new Promise((r) => setTimeout(r, ms));
      const clear = () => { G.words.up.length = 0; document.querySelectorAll('#pops .pop').forEach((p) => p.remove()); }, n = () => [...document.querySelectorAll('#pops .pop')].filter((p) => p.textContent === word).length;
      let at = null; for (let i = 0; i < 64 && !at; i++) { const a = i / 64 * 6.283, x = h.x + Math.sin(a) * 4, z = h.z + Math.cos(a) * 4, s = G.scene.screenOf(x, 1.5, z); if (!s[2] && s[0] > 150 && s[0] < 570 && s[1] > 300 && s[1] < 900) at = [x, 1.5, z]; }
      if (!at) return null; const ev = () => G.onEvent({ type: 'bonk', x: at[0], y: at[1], z: at[2], coins: 5, by: 'boom', again: false });
      await wait(gap * 1000 + 200); clear(); const c0 = G.save.coins; for (let i = 0; i < 4; i++) ev(); const coins = G.save.coins - c0;
      await wait(150); const out = { at, dir: [(at[0] - h.x) / 4, (at[2] - h.z) / 4], first: n(), coins };
      await wait(gap * 1000 + 100); clear(); ev(); await wait(150); out.later = n(); return out; }, cfg.words.bonkGap);
    // (a bonk mission may pay its prize on top of the robots' 4 x 5 coins)
    check(bonk && bonk.first === 1 && bonk.coins >= 20, `b four bonks at once: one BONK word, every coin paid (${JSON.stringify(bonk)})`);
    check(bonk && bonk.later === 1, `b ...and a bonk after words.bonkGap ${cfg.words.bonkGap} s has its word again (${bonk && bonk.later})`);
    // c: dust in the camera's face is not drawn (look.puffNear), dust beyond look.puffFar is drawn whole
    const dustAt = (f) => g(page, async ([f, dir]) => { const G = __game, p = G.scene.show.pos; G.scene.event({ type: 'star', x: p[0] + dir[0] * f, y: p[1] - 0.3, z: p[2] + dir[1] * f }); await new Promise((r) => setTimeout(r, 200)); return G.scene.dustNear; }, [f, bonk ? bonk.dir : [0, 1]]);
    const near = (await dustAt(0.3)).filter((x) => x.d < LK.puffNear - 0.1), mid = (await dustAt((LK.puffNear + LK.puffFar) / 2)).filter((x) => x.d > LK.puffNear + 0.3 && x.d < LK.puffFar - 0.3), farD = (await dustAt(LK.puffFar + 3)).filter((x) => x.d > LK.puffFar + 0.1);
    const worst = (l, f) => l.length ? +f(...l.map((x) => x.k)).toFixed(2) : null;
    check(near.length > 0 && near.every((x) => x.k < 0.02), `c ${near.length} puffs within look.puffNear ${LK.puffNear} of the camera are not drawn (largest share ${worst(near, Math.max)})`);
    check(mid.every((x) => x.k > 0.01 && x.k < 0.99), `c ${mid.length} puffs between near and far are drawn smaller (${worst(mid, Math.min)}..${worst(mid, Math.max)})`);
    check(farD.length > 0 && farD.every((x) => x.k > 0.98), `c ${farD.length} puffs beyond look.puffFar ${LK.puffFar} are drawn whole (smallest share ${worst(farD, Math.min)})`);
    check(!errors.length, `aaa1 no errors (${errors.slice(0, 2).join(' | ')})`);
    await page.close();
  }

  // 22 "aaa2": the result card's goal row is a button that buys (or opens the shop), also for upgrades once every tool
  // is owned; smash time's frame is two still layers cross-faded by opacity, the red one only in the last seconds
  if (!process.env.ONLY || process.env.ONLY === 'aaa2') {
    const FV = cfg.fever, { page, errors } = await open(browser, '', { port, touch: true });
    const pause = (ms) => page.waitForTimeout(ms);
    await pause(600); await tapAt(page, 360, 420);
    await waitFor(page, () => { const W = __game.W; return !__game.demo && W.phase === 'play' && W.t > 1.6 && document.getElementById('lvcard').hidden && __game.saveLoaded; }, null, 20000).catch(() => {});
    // what animates on an element and its two pseudo-elements: the name, the properties its keyframes change, the cycle
    const anims = (sel, cls) => g(page, ([sel, cls]) => { const el = document.querySelector(sel), rules = {}; if (cls) el.classList.add(cls);
      for (const sh of document.styleSheets) { let list = []; try { list = sh.cssRules; } catch (er) { /* a sheet from elsewhere (the font) */ } for (const r of list) if (r.type === CSSRule.KEYFRAMES_RULE) rules[r.name] = [...new Set([...r.cssRules].flatMap((k) => [...k.style]))]; }
      return [null, '::before', '::after'].map((p) => { const cs = getComputedStyle(el, p); return { name: cs.animationName, props: cs.animationName.split(', ').flatMap((n) => rules[n] || []), sec: parseFloat(cs.animationDuration), opacity: +cs.opacity, shadow: cs.boxShadow, bg: cs.backgroundImage.slice(0, 15), filter: cs.filter }; }); }, [sel, cls]);
    const cheap = (l) => l.every((x) => x.props.every((p) => p === 'opacity' || p === 'transform'));
    const brief = (l) => JSON.stringify(l.map((x) => [x.name, x.props.join('+'), x.sec, x.opacity]));
    // c1: smash time: nothing but opacity animates, on a still gradient layer, one cycle per fever.pulseSec; no red yet
    await g(page, () => { const W = __game.W; W.got = W.need; W.phase = 'fever'; W.fever = W.cfg.fever.dur; W.feverT = 0; __game.onEvent({ type: 'fever' }); });
    await pause(1600); await shot(page, '22-smash-time');
    const f1 = await anims('#fever'), w1 = await g(page, () => document.getElementById('fever').classList.contains('warn'));
    check(f1[0].name === 'none' && f1[0].shadow === 'none' && f1[1].name !== 'none' && cheap(f1) && /gradient/.test(f1[1].bg) && /gradient/.test(f1[2].bg), `c1 the smash-time frame animates only opacity/transform of still gradient layers, no box-shadow (${brief(f1)}, shadow ${f1[0].shadow.slice(0, 40)})`);
    check(f1[1].sec === FV.pulseSec, `c1 ...one cycle per fever.pulseSec ${FV.pulseSec} s (${f1[1].sec})`);
    check(!w1 && f1[2].opacity === 0, `c1 ...and the red layer is not shown with ${FV.dur} s left (warn ${w1}, opacity ${f1[2].opacity})`);
    // c2: the last fever.warnSec seconds: the red layer comes in; time won back takes it away again
    await g(page, (s) => { __game.W.fever = s - 0.4; }, FV.warnSec); await pause(700); await shot(page, '22-smash-time-last');
    const f2 = await anims('#fever'), w2 = await g(page, () => document.getElementById('fever').classList.contains('warn'));
    check(w2 && f2[2].opacity > 0.3 && cheap(f2), `c2 in the last fever.warnSec ${FV.warnSec} s the red layer shows (warn ${w2}, opacity ${f2[2].opacity})`);
    await g(page, () => { __game.W.fever = __game.W.cfg.fever.dur; }); await pause(700);
    const w3 = await g(page, () => document.getElementById('fever').classList.contains('warn'));
    check(w2 && w3 === false, `c2 ...and leaves when time is won back (warn ${w2} then ${w3})`);
    // c3: HIT when ready: the button itself does not animate (no filter, no box-shadow); a pseudo-element does, cheaply
    const h1 = await anims('#hit', 'ready');
    check(h1[0].name === 'none' && (h1[1].name !== 'none' || h1[2].name !== 'none') && cheap(h1), `c3 a ready HIT animates only transform/opacity of a pseudo-element (${brief(h1)})`);
    // c4: reduced motion: nothing pulses, the tint stays
    await page.emulateMedia({ reducedMotion: 'reduce' }); await pause(200);
    const f4 = await anims('#fever'), h4 = await anims('#hit', 'ready');
    check(f4.every((x) => x.name === 'none') && /gradient/.test(f4[1].bg) && f4[1].opacity > 0.3 && [h4[1], h4[2]].every((x) => x.name === 'none'), `c4 reduced motion: no pulsing, a still tint (${brief(f4)}; HIT ${brief(h4)})`);
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    // b: the result card's goal row
    const all = cfg.tools.map((t) => t.id), rocket = cfg.tools.find((t) => t.id === 'rocket');
    const card = async (coins, owned, lv) => { await g(page, ([coins, owned, lv]) => { const G = __game, s = G.save, W = G.W; s.coins = coins; s.owned = owned.slice(); W.owned.length = 0; W.owned.push(...owned); s.lv = lv; W.fever = 0; W.phase = 'free'; G.cardDue(); G.onEvent({ type: 'clear' }); document.querySelectorAll('.card, .card *').forEach((e) => { e.style.animation = 'none'; }); }, [coins, owned, lv]); await pause(500); };
    const row = () => g(page, () => { const b = document.getElementById('goalBtn'), k = document.getElementById('app').getBoundingClientRect().width / 720; if (!b) return null; const r = b.getBoundingClientRect(), lab = b.querySelector('.mlab').getBoundingClientRect(), val = b.querySelector('.mval').getBoundingClientRect();
      return { tag: b.tagName, h: Math.round(r.height / k), text: b.textContent, can: b.classList.contains('can'), fits: lab.right <= val.left + 1 && val.right <= r.right && lab.left >= r.left, coins: __game.save.coins, card: !document.getElementById('panel').hidden && __game.resultsOpen, shop: !document.getElementById('shop').hidden }; });
    const press = async () => { await g(page, () => document.getElementById('goalBtn').click()); await pause(450); };
    // b1: not enough coins: a real button, tall enough for a finger, that opens the shop over the card
    await card(0, ['hammer', 'bomb'], {});
    const b1 = await row(), nm = await g(page, () => __game.T('nRocket'));
    check(b1 && b1.tag === 'BUTTON' && b1.h >= 96 && !b1.can && b1.text.includes(nm) && b1.fits, `b1 the next-tool row is a button at least 96 units tall (${JSON.stringify(b1)})`);
    if (b1) await press(); const b1s = await g(page, () => ({ shop: !document.getElementById('shop').hidden, cards: document.querySelectorAll('#shop .srow').length, card: __game.resultsOpen }));
    await shot(page, '22-card-shop');
    check(b1s.shop && b1s.cards === all.length && b1s.card, `b1 ...too expensive: it opens the shop, the card still open under it (${JSON.stringify(b1s)})`);
    await g(page, () => { const x = document.getElementById('shopX'); if (x) x.click(); }); await pause(300);
    // b2: enough coins: it buys the tool right there (the shop's purchase) and shows the next goal
    await card(rocket.cost + 500, ['hammer', 'bomb'], {});
    const b2 = await row(); await shot(page, '22-card-can'); if (b2) await press();
    const b2a = await row(), own2 = await g(page, () => ({ save: __game.save.owned.includes('rocket'), world: __game.W.owned.includes('rocket') })), nb = await g(page, () => __game.T('nBall'));
    check(b2 && b2.can && b2a && own2.save && own2.world && b2a.coins === b2.coins - rocket.cost && b2a.card && !b2a.shop, `b2 with the coins in hand a tap buys the rocket on the card (${JSON.stringify({ before: b2 && b2.coins, after: b2a && b2a.coins, own2, card: b2a && b2a.card, shop: b2a && b2a.shop })})`);
    check(b2a && b2a.text.includes(nb) && !b2a.can, `b2 ...and the row moves on to the next tool ("${b2a && b2a.text}")`);
    // b2d (hunt 6): a double tap buys one thing: the row changes to the next goal under the finger, and the second
    // tap must not buy that one too
    const ballT = cfg.tools.find((t) => t.id === 'ball');
    await card(rocket.cost + ballT.cost + 2000, ['hammer', 'bomb'], {});
    const d0 = await row(); if (d0) { await g(page, async () => { document.getElementById('goalBtn').click(); await new Promise((r) => setTimeout(r, 90)); const b = document.getElementById('goalBtn'); if (b) b.click(); }); await pause(500); }
    const d1 = await row(), ownD = await g(page, () => __game.save.owned.slice());
    check(d0 && d1 && ownD.includes('rocket') && !ownD.includes('ball') && d1.coins === d0.coins - rocket.cost, `b2d a double tap on the goal row buys one tool, not two (${JSON.stringify({ before: d0 && d0.coins, after: d1 && d1.coins, owned: ownD })})`);
    // b3: every tool owned: the cheapest upgrade is the goal, and a tap buys it
    const lv3 = Object.fromEntries(all.map((id) => [id, id === 'hammer' ? 7 : 12]));
    await card(1e6, all, lv3);
    const b3 = await row(), want = await g(page, () => [__game.T('nHammer'), __game.T('lv', 7)]); await shot(page, '22-card-upgrade'); if (b3) await press();
    const b3a = await row(), lvNow = await g(page, () => __game.save.lv.hammer);
    check(b3 && b3.tag === 'BUTTON' && b3.h >= 96 && b3.can && b3.text.includes(want[0]) && b3.text.includes(want[1]) && b3.text.includes('8') && b3.fits, `b3 every tool owned: the row shows the cheapest upgrade, "${want[0]} ${want[1]} → 8" (${JSON.stringify(b3)})`);
    check(b3a && lvNow === 8 && b3a.coins < b3.coins && b3a.card, `b3 ...and a tap upgrades it (hammer level ${lvNow}, coins ${b3 && b3.coins} → ${b3a && b3a.coins})`);
    check(!errors.length, `aaa2 no errors (${errors.slice(0, 2).join(' | ')})`);
    await page.close();
  }

  // 23 "boss1": a boss building (every 5th) has a boss: one giant crowned BONK-BOT in the front yard, in view from the
  // spawn; three hammer knocks bring it down (a crown point off per knock, BOSS DOWN! and the prize); none next level
  if (!process.env.ONLY || process.env.ONLY === 'boss1') {
    const BS = cfg.boss, { page, errors } = await open(browser, '', { port, touch: true });
    const pause = (ms) => page.waitForTimeout(ms);
    await pause(600); await tapAt(page, 360, 420);
    await waitFor(page, () => !__game.demo && __game.saveLoaded, null, 20000).catch(() => {});
    await g(page, () => __game.newLevel(4));
    await pause(700); await shot(page, '23-boss-card');
    await waitFor(page, () => { const W = __game.W; return W.n === 4 && W.t > 1.6 && document.getElementById('lvcard').hidden; }, null, 20000).catch(() => {});
    // the boss as the world has it and as it is drawn: its crown tip and feet in frame units, the HUD's edges, the hero
    const view = () => g(page, () => { const G = __game, W = G.W, b = W.bots.find((x) => x.boss), k = 720 / document.getElementById('app').getBoundingClientRect().width, top0 = document.getElementById('app').getBoundingClientRect().top;
      const tools = Math.min(...[...document.querySelectorAll('.tool')].filter((e) => e.offsetParent !== null).map((e) => (e.getBoundingClientRect().top - top0) * k)), bar = (document.getElementById('bar').getBoundingClientRect().bottom - top0) * k;
      const base = { n: W.n, boss: W.boss, bots: W.bots.length, look: G.scene.bossLook, bar: Math.round(bar), tools: Math.round(tools), coins: W.coins, saved: G.save.coins, down: !!W.bossDown };
      if (!b) return base;
      const r = (a) => a.slice(0, 2).map(Math.round).concat(a[2]);
      return { ...base, tip: r(G.scene.screenOf(b.x, b.h * 1.33, b.z)), head: r(G.scene.screenOf(b.x, b.h * 0.9, b.z)), feet: r(G.scene.screenOf(b.x, 0, b.z)), hp: b.hp, state: b.state, h: b.h, dist: Math.hypot(b.x - W.hero.x, b.z - W.hero.z), moved: W.hero.moving }; });
    const v0 = await view(); await shot(page, '23-boss-start');
    const inX = (p) => p && !p[2] && p[0] > 40 && p[0] < 680;
    check(v0.boss && v0.hp === BS.hits && v0.look && v0.look.points === BS.hits && Math.abs(v0.look.scale - BS.botScale) < 0.01, `boss1 a boss building has its boss: ${BS.botScale}× a robot, ${BS.hits} crown points (${JSON.stringify(v0)})`);
    check(v0.tip && inX(v0.tip) && inX(v0.feet) && v0.tip[1] > 0 && v0.head[1] > v0.bar && v0.feet[1] < v0.tools && v0.feet[1] - v0.tip[1] > 250, `boss1 ...on screen from the spawn in portrait: crown tip ${v0.tip}, head ${v0.head} under the bar (${v0.bar}), feet ${v0.feet} over the tools (${v0.tools})`);
    // a knock with the hammer through the world API (the swing lands a moment later); then what is on screen
    const knockTo = async (hp) => { await waitFor(page, () => { const G = __game, W = G.W, b = W.bots.find((x) => x.boss); return b && b.state === 'guard' && G.WD.swingBot(W, W.bots.indexOf(b)); }, null, 15000).catch(() => {});
      await waitFor(page, (hp) => { const b = __game.W.bots.find((x) => x.boss); return b && b.hp === hp; }, hp, 8000).catch(() => {}); };
    const words = () => g(page, () => [...document.querySelectorAll('#pops .pop')].map((p) => p.textContent.trim()));
    const T = (k) => g(page, (k) => __game.T(k), k);
    await knockTo(BS.hits - 1); await pause(250); const w1 = await words(), v1 = await view(); await shot(page, '23-boss-knock1');
    const stage = Math.round(BS.hitCoins * cfg.boss.mult);
    check(v1.hp === BS.hits - 1 && v1.look.points === BS.hits - 1 && w1.includes(await T('bonk')) && v1.coins - v0.coins >= stage && v1.saved - v0.saved >= stage, `boss1 knock 1: a crown point is off, BONK! over it, boss.hitCoins paid (hp ${v1.hp}, points ${v1.look.points}, words ${JSON.stringify(w1)}, +${v1.coins - v0.coins} of ${stage})`);
    await waitFor(page, () => __game.W.bots.find((x) => x.boss).state === 'guard', null, 8000).catch(() => {}); await pause(200); await shot(page, '23-boss-up');
    const vu = await view();
    check(vu.state === 'guard' && vu.look.points === BS.hits - 1, `boss1 ...it stands up again with ${BS.hits - 1} points (${vu.state})`);
    for (let hp = BS.hits - 2; hp > 0; hp--) await knockTo(hp);
    const v2 = await view(); await knockTo(0); await pause(350); const w3 = await words(), v3 = await view(), cel = await g(page, () => ({ last: __game.lastCelebration, confetti: !document.getElementById('confetti').hidden })); await shot(page, '23-boss-down');
    const prize = Math.max(Math.round(BS.downCoins * cfg.boss.mult), Math.round(BS.downShare * v2.coins));
    check(v3.hp === 0 && v3.down && v3.look.points === 0 && w3.includes(await T('bossDown')) && cel.last === 'boss' && cel.confetti, `boss1 knock ${BS.hits}: BOSS DOWN! with confetti, no crown point left (hp ${v3.hp}, words ${JSON.stringify(w3)}, ${JSON.stringify(cel)})`);
    check(v3.coins - v2.coins >= prize && v3.saved - v2.saved >= prize && v3.coins - v2.coins < prize + 600, `boss1 ...and the prize is paid: +${v3.coins - v2.coins} in the world, +${v3.saved - v2.saved} saved, of ${prize}`);
    await pause(4500); const v4 = await view();
    check(v4.state === 'down' && v4.hp === 0, `boss1 ...and it stays down (${v4.state} after 4.5 s)`);
    await shot(page, '23-boss-after');
    await g(page, () => __game.nextLevel());
    await waitFor(page, () => __game.W.n === 5 && __game.W.t > 0.5, null, 15000).catch(() => {}); await pause(300);
    const v5 = await view();
    check(v5.n === 5 && !v5.boss && v5.hp === undefined && v5.look === null, `boss1 the next building has no boss (level ${v5.n}, boss ${v5.boss}, drawn ${JSON.stringify(v5.look)})`);
    check(!errors.length, `boss1 no errors (${errors.slice(0, 2).join(' | ')})`);
    await page.close();
  }

  // boot1: the first paint is the show's own opening (HTML/CSS in index.html), and the 3D show takes over under the same title without a seam
  if (!process.env.ONLY || process.env.ONLY === 'boot1') {
    const TI = cfg.demo.title, rgb = (h) => `rgb(${[1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)).join(', ')})`;
    const INIT = () => {
      const M = window.__m = { samples: [] }; addEventListener('three-ready', () => { M.three = performance.now(); });
      const r = (e) => { const b = e.getBoundingClientRect(); return [b.left, b.top, b.width, b.height]; };
      const snap = () => {
        const el = document.getElementById('title'), boot = document.getElementById('boot');
        if (el && !M.node) { M.node = el; el.__bootMark = 1; }
        const s = { t: performance.now(), boot: !!boot, same: !!el && el === M.node && el.__bootMark === 1, shown: !!el && getComputedStyle(el).display !== 'none', box: el ? r(el) : null,
          words: el ? [...el.querySelectorAll('.tw')].map((w) => { const a = w.getAnimations()[0]; return { o: +getComputedStyle(w).opacity, r: r(w), ct: a ? a.currentTime : null, done: !a || a.playState === 'finished' }; }) : [],
          blocks: boot ? [...boot.querySelectorAll('i')].filter((b) => getComputedStyle(b).display !== 'none').map((b) => r(b)[1]) : [] };
        if (M.samples.length < 30 && el) s.extra = { bg: boot ? getComputedStyle(boot).backgroundImage : '', ts: el.style.getPropertyValue('--ts'), tt: el.style.getPropertyValue('--tt'), text: el.textContent.replace(/\s+/g, ' ').trim(),
          delays: [...el.querySelectorAll('.tw')].map((w) => parseFloat(w.style.animationDelay)), load: !!document.getElementById('load'), jig: [...document.querySelectorAll('body *')].filter((e) => /jig|spin/.test(getComputedStyle(e).animationName)).length, loading: /loading/i.test(document.body.innerText) };
        return s;
      };
      const loop = () => { if (document.body) M.samples.push(snap()); if (!M.draw || performance.now() < M.draw + 1200) requestAnimationFrame(loop); }; requestAnimationFrame(loop);
      // the first 3D frame: the animation frame with the first draw call to the game's canvas itself (not to a render target, not the warm-up while the scene is built); its time is when that frame's work ended
      const raf0 = window.requestAnimationFrame.bind(window); let inRaf = false;
      window.requestAnimationFrame = (cb) => raf0((t) => { inRaf = true; try { cb(t); } finally { inRaf = false; if (M.drew && !M.draw) M.draw = performance.now(); } });
      for (const C of [window.WebGL2RenderingContext, window.WebGLRenderingContext]) if (C) for (const fn of ['drawElements', 'drawArrays', 'drawElementsInstanced', 'drawArraysInstanced']) {
        const o = C.prototype[fn]; if (!o) continue;
        C.prototype[fn] = function (...a) { if (!M.drew && inRaf && this.canvas && this.canvas.id === 'cv' && this.getParameter(this.FRAMEBUFFER_BINDING) === null) M.drew = performance.now(); return o.apply(this, a); };
      }
    };
    const near = (a, b) => Math.max(...a.map((v, i) => Math.abs(v - b[i])));
    const pause = (ms) => new Promise((ok) => setTimeout(ok, ms));
    // one load first, unchecked: a browser's very first page pays for its own start (first frame at ~120 ms instead of ~85)
    { const w = await browser.newPage({ viewport: { width: 360, height: 640 } }); await w.goto(`http://localhost:${port}/?local`); await w.waitForFunction(() => window.__game && window.__game.W, null, { timeout: 40000 }); await w.close(); }
    for (const run of [{ name: 'normal', delay: 0 }, { name: 'slow', delay: 2000 }, { name: 'tap', delay: 2000, tap: true }, { name: 'reduced', delay: 0, reduced: true }]) {
      const page = await browser.newPage({ viewport: { width: 360, height: 640 }, hasTouch: true, isMobile: true, reducedMotion: run.reduced ? 'reduce' : 'no-preference' });
      const errors = [], three = []; page.on('pageerror', (e) => errors.push(e.message)); page.on('console', (m) => { if (m.type() === 'error' && !/favicon/.test(m.text())) errors.push(m.text()); });
      page.on('request', (q) => { if (/cdnjs\.cloudflare\.com/.test(q.url())) three.push(q.url()); });
      await page.addInitScript(INIT);
      // Three.js held back: the opening has to carry the wait
      if (run.delay) await page.route(/cdnjs\.cloudflare\.com/, async (route) => { await pause(run.delay); await route.continue(); });
      const at = async (ms, n) => { await page.waitForFunction((ms) => performance.now() >= ms, ms, { polling: 10 }); await shot(page, `boot1-${run.name}-${n}`); };
      await page.goto(`http://localhost:${port}/?local`, { waitUntil: 'commit' });
      if (run.name === 'slow' || run.name === 'reduced') await at(100, '100ms');
      if (run.name === 'slow') { await at(1000, '1s'); await at(2500, '2500ms'); }
      if (run.tap) { await page.waitForFunction(() => performance.now() >= 300, null, { polling: 10 }); await page.touchscreen.tap(180, 330); }
      await page.waitForFunction(() => window.__m.draw && performance.now() > window.__m.draw + 50, null, { timeout: 60000, polling: 10 });
      await shot(page, `boot1-${run.name}-handover`);
      await pause(1300);
      const R = await page.evaluate(() => ({ draw: window.__m.draw, drew: window.__m.drew, three: window.__m.three, S: window.__m.samples, fcp: (performance.getEntriesByType('paint').find((p) => p.name === 'first-contentful-paint') || {}).startTime, attract: document.getElementById('hud').classList.contains('attract'), cta: getComputedStyle(document.getElementById('cta')).display }));
      const S = R.S, tag = `boot1 ${run.name}:`, s100 = S.find((s) => s.t >= 100) || S[S.length - 1], s160 = S.find((s) => s.t >= s100.t + 60), X = (S.find((s) => s.extra) || {}).extra || {};
      const pre = [...S].reverse().find((s) => s.t < R.draw), post = S.filter((s) => s.t >= R.draw), gone = S.find((s) => !s.boot);
      console.log(`     ${tag} first frame ${Math.round(S[0].t)} ms, Three.js ready ${Math.round(R.three)} ms, first 3D frame ${Math.round(R.draw)} ms (its work began at ${Math.round(R.drew)} ms), backdrop gone ${gone ? Math.round(gone.t) : 'never'} ms`);
      const w0 = s100.words[0];
      if (run.reduced) {
        check(s100.words.length === 3 && s100.words.every((w, i) => w.o === 1 && near(w.r, s160.words[i].r) < 0.5) && s100.blocks.length === 0, `${tag} reduced motion: the whole title stands still at ${Math.round(s100.t)} ms, no falling blocks (${s100.blocks.length})`);
      } else {
        check(!!w0 && w0.o > 0 && w0.r[1] + w0.r[3] > 0 && w0.r[1] < 640 && w0.r[0] < 360 && w0.r[0] + w0.r[2] > 0, `${tag} at ${Math.round(s100.t)} ms the title's first word is on screen (opacity ${w0 && w0.o.toFixed(2)}, box ${w0 && w0.r.map(Math.round)})`);
        const moving = s100.blocks.filter((y, i) => Math.abs(y - s160.blocks[i]) > 1).length;
        check(moving >= 6, `${tag} ${moving} of ${s100.blocks.length} blocks are moving between ${Math.round(s100.t)} and ${Math.round(s160.t)} ms`);
      }
      check(!X.load && X.jig === 0 && !X.loading && X.bg.includes(rgb(cfg.demo.look.top)) && X.bg.includes(rgb(cfg.demo.look.low)), `${tag} no loader (#load ${X.load}, jiggling or spinning ${X.jig}, the word loading ${X.loading}); the backdrop is the show's sky (${X.bg})`);
      check(X.text === TI.lines.flat().join(' ') && +X.ts === TI.size && +X.tt === TI.top && X.delays.every((d, i) => Math.abs(d - X.delays[0] - (TI.at[i] - TI.at[0])) < 0.001), `${tag} the opening's title copies demo.title ("${X.text}", size ${X.ts}, top ${X.tt}, word times ${X.delays})`);
      check(!!pre && pre.boot && pre.same && post.every((s) => s.same), `${tag} the title at the first 3D frame is the node the opening painted (${post.length} frames after it)`);
      if (!run.tap) {
        const dBox = Math.max(...post.map((s) => near(s.box, pre.box))), landed = pre.words.map((w, i) => (w.done ? i : -1)).filter((i) => i >= 0), dW = Math.max(0, ...post.slice(0, 20).flatMap((s) => landed.map((i) => near(s.words[i].r, pre.words[i].r))));
        check(post.every((s) => s.shown) && dBox < 2 && dW < 2, `${tag} the title stays put over the hand-over (box moved ${dBox.toFixed(2)} px, the ${landed.length} landed words ${dW.toFixed(2)} px)`);
        let back = 0; for (let i = 1; i < S.length; i++) S[i].words.forEach((w, k) => { const p = S[i - 1].words[k]; if (p && p.ct != null && (w.ct == null || w.ct < p.ct - 1)) back++; });
        check(run.reduced || back === 0, `${tag} no word starts its slam again (${back} restarts)`);
        check(R.attract && R.cta !== 'none', `${tag} the show goes on under it (attract ${R.attract}, call to action ${R.cta})`);
      } else check(!R.attract, `${tag} a touch at 300 ms, long before the game could listen, started the game (attract ${R.attract})`);
      // the backdrop is taken away in the animation frame that draws the first 3D picture, so the two reach the screen together: the very next
      // frame has no backdrop. On this software GPU that next frame can come late (the GPU is still drawing the first picture: nothing at all
      // is shown in between), so the rule is "the next frame", and "within 200 ms" only once the page makes frames again
      const next = post[0], after = post.find((s) => s.t >= (next ? next.t : 0) + 1) || next;
      console.log(`     ${tag} frames around the hand-over (ms): ${S.filter((s) => s.t < R.draw).slice(-3).map((s) => Math.round(s.t) + (s.boot ? ' backdrop' : ' 3D')).join(', ')} | drawn ${Math.round(R.draw)} | ${post.slice(0, 3).map((s) => Math.round(s.t) + (s.boot ? ' backdrop' : ' 3D')).join(', ')}`);
      check(!!gone && !!next && gone === next && after.t - next.t <= 200, `${tag} the backdrop is gone in the first frame after the one that drew the 3D picture (${gone && next ? Math.round(gone.t - next.t) : '?'} ms from that frame, ≤ 200; ${gone ? Math.round(gone.t - R.draw) : '?'} ms after the drawing ended)`);
      check(three.length > 0 && new Set(three).size === three.length, `${tag} each Three.js file is fetched once (${three.map((u) => u.split('/').pop()).join(', ')})`);
      check(!errors.length, `${tag} no errors (${errors.slice(0, 2).join(' | ')})`);
      await page.close();
    }
  }

  await browser.close(); server.close();
  console.log(fails.length ? `\n${fails.length} FAILED` : '\nall passed');
  process.exit(fails.length ? 1 : 0);
}

module.exports = { serve, open, GPU, BOT };
if (require.main === module) main().catch((e) => { console.error(e); process.exit(1); });
