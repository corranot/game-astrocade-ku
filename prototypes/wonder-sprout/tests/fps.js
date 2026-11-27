// PROTOTYPE - NOT FOR PRODUCTION
// Frame rate on a phone profile (390x844 @2x, CPU slowed 4x) through a busy stretch: a grown island, three
// friends, sky pirates and repeated flings. Prints fps per second and the quality tier the watchdog chose.
// Usage: node prototypes/wonder-sprout/tests/fps.js
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const dir = path.join(__dirname, '..');
const saved = { schemaVersion: 1, starGems: 5000, landmarks: [0, 1, 2, 3, 4, 5].map((i) => ({ gems: 0, wood: 0, built: i < 5 })), activeLandmark: 5, planted: true,
  critters: [{ id: 1, species: 'fox', stage: 3 }, { id: 2, species: 'bunny', stage: 2 }, { id: 3, species: 'dragon', stage: 3 }, { id: 4, species: 'bunny', stage: 1 }], heroId: 1, activeCritterIds: [2, 3, 4], nextId: 5,
  stats: { lifetime: 9000, flings: 50 }, ftue: { done: 31 } };
const stub = `window.gameConfig = ${fs.readFileSync(path.join(dir, 'game_config.json'), 'utf8')}; window.__saved = ${JSON.stringify(saved)};
window.lib = { showGameParameters() {}, log() {}, haptics: { play() {} }, async getUserGameState() { return { state: window.__saved }; }, async saveUserGameState() { return {}; }, async addPlayerScoreToLeaderboard() { return {}; }, async share() {} };
addEventListener('load', () => window.run('play'));`;
const server = http.createServer((q, r) => { let u = q.url.split('?')[0]; if (u === '/') u = '/index.html';
  fs.readFile(path.join(dir, u), (e, d) => { if (e) { r.writeHead(404); return r.end(); } if (u === '/index.html') d = Buffer.from(String(d).replace('<script type="module"', `<script>${stub}</script><script type="module"`)); r.writeHead(200, { 'content-type': u.endsWith('.js') ? 'text/javascript' : 'text/html' }); r.end(d); }); });
(async () => {
  await new Promise((r) => server.listen(0, r));
  const b = await chromium.launch(), ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 }), pg = await ctx.newPage();
  const cdp = await ctx.newCDPSession(pg); await cdp.send('Emulation.setCPUThrottlingRate', { rate: +(process.env.RATE || 4) });
  await pg.goto(`http://127.0.0.1:${server.address().port}/`); await pg.waitForFunction(() => window.__ws && window.__ws.loaded); await pg.waitForTimeout(1500);
  await pg.evaluate(() => { __ws.gameplay.startRaid(); window.__fr = []; let last = performance.now(); const f = (n) => { __fr.push(n - last); last = n; requestAnimationFrame(f); }; requestAnimationFrame(f);
    setInterval(() => { const G = __ws.gameplay; if (G.hero.mode === 'rest') G.launch((Math.random() - 0.5) * 120, 150); }, 400); });
  const per = [];
  for (let s = 0; s < 8; s++) { await pg.waitForTimeout(1000); per.push(await pg.evaluate(() => { const n = __fr.length; __fr = []; return n; })); }
  const tier = await pg.evaluate(() => __ws.quality.tier);
  console.log(JSON.stringify({ fpsPerSecond: per, tier }));
  await b.close(); server.close();
})();
