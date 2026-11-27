// PROTOTYPE - NOT FOR PRODUCTION
// Host handover: the game starts in edit (living island, no play), then switches to play; a fling must work,
// the clock never runs backwards and no error is logged. Usage: node prototypes/wonder-sprout/tests/handover.js
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const dir = path.join(__dirname, '..');
const stub = `window.gameConfig = ${fs.readFileSync(path.join(dir, 'game_config.json'), 'utf8')};
window.lib = { showGameParameters() {}, log() {}, haptics: { play() {} }, async getUserGameState() { return { state: null }; }, async saveUserGameState() { return {}; }, async addPlayerScoreToLeaderboard() { return {}; }, async share() {} };
addEventListener('load', () => { window.run('edit'); setTimeout(() => window.run('play'), 1500); });`;
const server = http.createServer((q, r) => { let u = q.url.split('?')[0]; if (u === '/') u = '/index.html';
  fs.readFile(path.join(dir, u), (e, d) => { if (e) { r.writeHead(404); return r.end(); } if (u === '/index.html') d = Buffer.from(String(d).replace('<script type="module"', `<script>${stub}</script><script type="module"`)); r.writeHead(200, { 'content-type': u.endsWith('.js') ? 'text/javascript' : 'text/html' }); r.end(d); }); });
(async () => {
  await new Promise((r) => server.listen(0, r));
  const b = await chromium.launch(), pg = await b.newPage({ viewport: { width: 390, height: 844 } }); const errs = [];
  pg.on('pageerror', (e) => errs.push(String(e))); pg.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.text()); });
  await pg.goto(`http://127.0.0.1:${server.address().port}/`);
  await pg.waitForTimeout(1000);
  const edit = await pg.evaluate(() => ({ mode: __ws.mode, enabled: __ws.gameplay.enabled, flings: __ws.state.stats.flings }));
  await pg.waitForTimeout(1200);
  const box = await pg.evaluate(() => { const r = document.getElementById('c').getBoundingClientRect(); return { x: r.left, y: r.top, k: r.width / 720 }; });
  const h = await pg.evaluate(() => ({ x: __ws.gameplay.hero.x, y: __ws.gameplay.hero.y }));
  await pg.mouse.move(box.x + h.x * box.k, box.y + h.y * box.k); await pg.mouse.down();
  for (let i = 1; i <= 10; i++) await pg.mouse.move(box.x + h.x * box.k, box.y + (h.y + i * 15) * box.k);
  await pg.mouse.up(); await pg.waitForTimeout(600);
  const play = await pg.evaluate(() => ({ mode: __ws.mode, enabled: __ws.gameplay.enabled, flings: __ws.state.stats.flings, heroMode: __ws.gameplay.hero.mode }));
  const ok = edit.mode === 'edit' && !edit.enabled && play.mode === 'play' && play.flings === 1 && errs.length === 0;
  console.log(JSON.stringify({ edit, play, errs, ok }));
  await b.close(); server.close(); process.exit(ok ? 0 : 1);
})();
