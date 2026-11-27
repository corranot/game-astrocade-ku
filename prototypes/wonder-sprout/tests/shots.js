// PROTOTYPE - NOT FOR PRODUCTION
// Phone-portrait screenshots of every screen, FTUE step and key moment, driven by real taps and drags where
// the game allows it. Usage: node prototypes/wonder-sprout/tests/shots.js <outDir>
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const dir = path.join(__dirname, '..'), out = path.resolve(process.argv[2] || 'shots'); fs.mkdirSync(out, { recursive: true });
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json' };
const cfgJson = fs.readFileSync(path.join(dir, 'game_config.json'), 'utf8');
const stub = `window.gameConfig = ${cfgJson}; window.__calls = { share: 0, score: 0, save: 0 };
window.lib = { showGameParameters() {}, log(m) { console.log('LIB', m); }, haptics: { play() {}, start() {}, stop() {} },
  async getUserGameState() { return { state: window.__saved || null }; }, async saveUserGameState(s) { __calls.save++; return {}; },
  async addPlayerScoreToLeaderboard() { __calls.score++; return {}; }, async share(o) { __calls.share++; window.__share = o; } };
addEventListener('load', () => window.run('play'));`;
const server = http.createServer((q, r) => {
  let u = decodeURIComponent(q.url.split('?')[0]); if (u === '/') u = '/index.html';
  fs.readFile(path.join(dir, u), (e, d) => {
    if (e) { r.writeHead(404); return r.end(); }
    if (u === '/index.html') d = Buffer.from(String(d).replace('<script type="module"', `<script>${stub}</script><script type="module"`));
    r.writeHead(200, { 'content-type': TYPES[path.extname(u)] || 'application/octet-stream' }); r.end(d);
  });
});
const errs = [];
const late = (lang) => ({ schemaVersion: 1, starGems: 123456, magicWood: 40, lang, worldIndex: 0,
  landmarks: [0, 1, 2, 3, 4, 5].map((i) => ({ gems: 0, wood: 0, built: i < 5 })), activeLandmark: 5, planted: true,
  critters: [{ id: 1, species: 'fox', stage: 3 }, { id: 2, species: 'bunny', stage: 2 }, { id: 3, species: 'dragon', stage: 3 }, { id: 4, species: 'bunny', stage: 1 }],
  heroId: 1, activeCritterIds: [2, 3, 4], nextId: 5, eggs: [{ kind: 'coral', warm: 99, taps: 0 }],
  stats: { lifetime: 98000, flings: 300, crits: 20, hatched: 3, bestCombo: 9, playSec: 900, raids: 3 }, ftue: { done: 31, skipped: false }, lastSeen: Date.now() - 60000, giftDay: new Date().toISOString().slice(0, 10) });

async function page(b, vw, vh, saved, dsf = 2) {
  const ctx = await b.newContext({ viewport: { width: vw, height: vh }, deviceScaleFactor: dsf, hasTouch: false });
  const pg = await ctx.newPage();
  pg.on('pageerror', (e) => errs.push(String(e.stack || e)));
  pg.on('console', (m) => { if (m.type() === 'warning' || m.type() === 'error') errs.push(m.type() + ': ' + m.text()); });
  if (saved) await pg.addInitScript((s) => { window.__saved = s; }, saved);
  await pg.goto(base); await pg.waitForFunction(() => window.__ws && window.__ws.loaded); await pg.waitForTimeout(1500);
  const box = await pg.evaluate(() => { const r = document.getElementById('c').getBoundingClientRect(); return { x: r.left, y: r.top, k: r.width / 720 }; });
  const P = (x, y) => [box.x + x * box.k, box.y + y * box.k];
  pg.shot = (n) => pg.screenshot({ path: path.join(out, n + '.jpg'), type: 'jpeg', quality: 82 });
  pg.tap = async (x, y) => { const [a, c] = P(x, y); await pg.mouse.click(a, c); };
  pg.drag = async (x0, y0, x1, y1, release = true) => { const [a, c] = P(x0, y0), [d, e] = P(x1, y1); await pg.mouse.move(a, c); await pg.mouse.down(); for (let i = 1; i <= 12; i++) { await pg.mouse.move(a + (d - a) * i / 12, c + (e - c) * i / 12); await pg.waitForTimeout(16); } if (release) await pg.mouse.up(); };
  pg.ev = (f, a) => pg.evaluate(f, a);
  pg.rect = (k) => pg.ev((k) => window.__ws.ui.rects[k], k);
  return pg;
}
let base;
(async () => {
  await new Promise((r) => server.listen(0, r)); base = `http://127.0.0.1:${server.address().port}/`;
  const b = await chromium.launch();
  // 1. first screen on small, mid and large phones and a tablet
  for (const [w, h] of [[360, 640], [390, 844], [430, 932], [768, 1024]]) { const pg = await page(b, w, h); await pg.shot(`size-${w}x${h}`); await pg.context().close(); }

  // 2. FTUE, step by step, with the real actions
  let pg = await page(b, 390, 844);
  await pg.shot('ftue1-fling');
  const hero = await pg.ev(() => ({ x: __ws.gameplay.hero.x, y: __ws.gameplay.hero.y }));
  await pg.drag(hero.x, hero.y, hero.x + 30, hero.y + 160, false); await pg.shot('aim-pull'); await pg.mouse.up();
  await pg.waitForTimeout(140); await pg.shot('fling-flight');
  await pg.waitForFunction(() => __ws.gameplay.hero.mode === 'rest', null, { timeout: 15000 }); await pg.waitForTimeout(700);
  await pg.shot('ftue2-nova');
  const t = await pg.ev(() => new Promise((res) => { const R = __ws.cfg.rhythm; const f = () => { const g = __ws.gameplay.targets.filter((k) => k.alive && (k.type === 'geode' || k.type === 'pinata')).sort((a, b) => a.y - b.y).pop(); const u = (g.phase % R.period) / R.period; if (u > 1 - R.window + 0.03) res({ x: g.x, y: g.y }); else requestAnimationFrame(f); }; f(); }));
  await pg.tap(t.x, t.y); await pg.waitForTimeout(90); await pg.shot('nova-burst'); await pg.waitForTimeout(500); await pg.shot('nova-orbs');
  await pg.ev(() => { if (!__ws.state.eggs.length) __ws.kingdom.addEgg('meadow', 360, 700); }); await pg.waitForTimeout(700); await pg.shot('egg-drop');
  await pg.waitForFunction(() => __ws.kingdom.eggReady(), null, { timeout: 12000 }); await pg.waitForTimeout(800); await pg.shot('ftue3-hatch');
  const L = await pg.ev(() => ({ nx: 128, ny: 912 - 34 }));
  for (let i = 0; i < 3; i++) { await pg.tap(L.nx, L.ny); await pg.waitForTimeout(260); }
  await pg.waitForTimeout(200); await pg.shot('hatch-beat'); await pg.waitForTimeout(900); await pg.shot('hatch-friend');
  await pg.ev(() => __ws.kingdom.build(0)); await pg.waitForTimeout(250); await pg.shot('landmark-pop-a'); await pg.waitForTimeout(600); await pg.shot('landmark-pop-b'); await pg.waitForTimeout(1500);
  await pg.waitForTimeout(800); await pg.shot('ftue4-plant-dock');
  const d1 = await pg.ev(() => { const r = { y: 1040, h: 176, w: 208, x0: 24, gap: 24 }; return { x: r.x0 + 208 + 24 + 104, y: 1040 + 88 }; });
  await pg.tap(d1.x, d1.y); await pg.waitForTimeout(700); await pg.shot('ftue4-plant-drawer');
  const pr = await pg.rect('plant'); if (pr) { await pg.tap(pr.x + pr.w / 2, pr.y + pr.h / 2); await pg.waitForTimeout(500); await pg.shot('planted'); }
  await pg.ev(() => { __ws.ui.closeDrawer(); __ws.state.starGems += 5000; }); await pg.waitForTimeout(1200); await pg.shot('ftue5-evolve-dock');
  await pg.tap(24 + 2 * 232 + 104, 1040 + 88); await pg.waitForTimeout(700); await pg.shot('ftue5-evolve-drawer');
  const er = await pg.rect('evo0'); if (er) { await pg.tap(er.x + er.w / 2, er.y + er.h / 2); await pg.waitForTimeout(300); await pg.shot('evolve-beat'); await pg.waitForTimeout(1200); await pg.shot('evolve-after'); }
  await pg.ev(() => __ws.ui.closeDrawer()); await pg.waitForTimeout(800); await pg.shot('ftue-done');
  const ftue = await pg.ev(() => __ws.state.ftue); console.log('ftue', JSON.stringify(ftue));

  // 3. sky pirates
  await pg.ev(() => __ws.gameplay.startRaid()); await pg.waitForTimeout(800); await pg.shot('raid-enter'); await pg.waitForTimeout(2200); await pg.shot('raid-stay');
  for (let i = 0; i < 6; i++) { const wk = await pg.ev(() => { const r = __ws.gameplay.raid; const k = r && r.weak.find((q) => q.hp > 0); return k ? { x: k.x, y: k.y } : null; }); if (!wk) break; await pg.tap(wk.x, wk.y); await pg.waitForTimeout(220); }
  await pg.shot('raid-break'); await pg.waitForTimeout(900); await pg.shot('raid-after');

  // 4. hero at the far corners of the stage (camera must keep it framed)
  await pg.waitForTimeout(1500);
  for (const [n, x, y] of [['tl', 70, 474], ['tr', 650, 474], ['bl', 70, 934], ['br', 650, 934]]) {
    await pg.ev(([x, y]) => { const G = __ws.gameplay; G._u = G._u || G.update; G.update = () => {}; Object.assign(G.hero, { x, y, vx: 0, vy: -1, mode: 'fly' }); }, [x, y]);
    await pg.waitForTimeout(250); await pg.shot('hero-' + n);
  }
  await pg.ev(() => { const G = __ws.gameplay; G.update = G._u; G.hero.mode = 'return'; });
  await pg.context().close();

  // 5. a grown island, its drawers and the end of the world
  pg = await page(b, 390, 844, late('en'));
  await pg.waitForTimeout(1500); await pg.shot('late-island');
  for (const [i, n] of [[0, 'hatchery'], [1, 'kingdom'], [2, 'evolution']]) { await pg.tap(24 + i * 232 + 104, 1128); await pg.waitForTimeout(700); await pg.shot('drawer-' + n); await pg.ev(() => __ws.ui.closeDrawer()); await pg.waitForTimeout(500); }
  const tr = await pg.rect('track'); if (tr) { await pg.tap(tr.x + tr.w / 2, tr.y + tr.h / 2); await pg.waitForTimeout(700); await pg.shot('sheet-language'); await pg.ev(() => { __ws.ui.sheet = false; }); }
  await pg.ev(() => { __ws.state.planted = true; __ws.kingdom.build(5); }); await pg.waitForTimeout(700); await pg.shot('lighthouse-pop'); await pg.waitForTimeout(2600); await pg.shot('world-done');
  await pg.context().close();

  // 6. every language, with the HUD and a hint, Arabic mirrored
  for (const l of ['en', 'id', 'es', 'vi', 'hi', 'bn', 'ar']) {
    const s = late(l); s.ftue = { done: 1 | 4 | 8 | 16, skipped: false }; s.starGems = 900; s.critters = s.critters.slice(0, 2);
    pg = await page(b, 390, 844, s); await pg.waitForTimeout(2200); await pg.shot('lang-' + l);
    if (l === 'ar' || l === 'hi') { await pg.tap(24 + 232 + 104, 1128); await pg.waitForTimeout(700); await pg.shot('lang-' + l + '-kingdom'); }
    await pg.context().close();
  }
  console.log('errors', JSON.stringify(errs.slice(0, 20), null, 1));
  console.log('shots', fs.readdirSync(out).length, out);
  await b.close(); server.close();
})().catch((e) => { console.error(e); process.exit(1); });
