// PROTOTYPE - NOT FOR PRODUCTION
// Quick look: a handful of phone screens for a fast visual check while iterating.
// Usage: node prototypes/wonder-sprout/tests/quick.js <outDir>
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
  const box = await pg.evaluate(() => { const r = document.getElementById('c').getBoundingClientRect(), v = __ws.VIEW, k = r.width / v.w; return { x: r.left + v.dx * k, y: r.top + v.dy * k, k }; });
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
  let pg = await page(b, 390, 844, null, 1); await pg.waitForTimeout(800); await pg.shot('q-first');
  await pg.ev(() => { __ws.ui.skipFtue && __ws.ui.skipFtue(); __ws.state.ftue.skipped = true; __ws.ui.ftue = null; __ws.ui.logo = 0; });
  const hero = await pg.ev(() => ({ x: __ws.gameplay.hero.x, y: __ws.gameplay.hero.y }));
  await pg.drag(hero.x, hero.y, hero.x + 40, hero.y + 160, false); await pg.shot('q-aim'); await pg.mouse.up();
  await pg.waitForTimeout(160); await pg.shot('q-fly'); await pg.waitForTimeout(260); await pg.shot('q-hit');
  await pg.context().close();
  pg = await page(b, 390, 844, late('en'), 1); await pg.waitForTimeout(600); await pg.ev(() => { __ws.ui.toasts.length = 0; }); await pg.waitForTimeout(400); await pg.shot('q-late');
  await pg.ev(() => { __ws.state.quest = { i: 0, p: 7 }; __ws.bus.emit('hit', { type: 'mushroom', x: 470, y: 548, by: 'hero', combo: 1 }); }); await pg.waitForTimeout(250); await pg.shot('q-goal');
  await pg.context().close();
  console.log('errors', JSON.stringify(errs.slice(0, 5)));
  await b.close(); server.close();
})();
