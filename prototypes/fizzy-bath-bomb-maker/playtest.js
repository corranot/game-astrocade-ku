// PROTOTYPE - NOT FOR PRODUCTION
// Plays the whole loop in a phone-sized browser and fails loudly if a step does not advance.
// Usage: node playtest.js [screenshot-dir]
const { chromium, devices } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path'), assert = require('assert');
(async () => {
  const shots = process.argv[2];
  const srv = http.createServer((q, r) => fs.readFile(path.join(__dirname, q.url.split('?')[0]), (e, d) => e ? (r.statusCode = 404, r.end()) : r.end(d))).listen(0);
  const b = await chromium.launch(), c = await b.newContext({ ...devices['Pixel 7'], deviceScaleFactor: shots ? 2 : 1 }), p = await c.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
  await p.goto(`http://localhost:${srv.address().port}/index.html?local`);
  await p.waitForFunction(() => document.getElementById('game').dataset.step === '0');
  const box = await p.locator('#game').boundingBox(), X = x => box.x + x * box.width / 720, Y = y => box.y + y * box.height / 1280;
  const step = () => p.evaluate(() => +document.getElementById('game').dataset.step);
  const shot = async n => { if (shots) await p.screenshot({ path: path.join(shots, n + '.png') }); };
  const tap = async (x, y) => { await p.mouse.move(X(x), Y(y)); await p.mouse.down(); await p.mouse.up(); await p.waitForTimeout(120); };
  const until = async (n, ms = 4000) => { await p.waitForFunction(k => +document.getElementById('game').dataset.step === k, n, { timeout: ms }); };

  await p.waitForTimeout(600); await shot('0-first-screen');
  await p.mouse.move(X(360), Y(600)); await p.mouse.down(); await p.waitForTimeout(1500); await shot('1-pour'); await p.waitForTimeout(1600); await p.mouse.up();
  await until(1);
  for (const i of [0, 2, 2]) await tap(104 + i * 128, 960);
  await p.waitForTimeout(900); await shot('2-color'); await tap(360, 1150); await until(2);
  await p.mouse.move(X(480), Y(700)); await p.mouse.down();
  for (let a = 0; a < 26; a += 0.3) { await p.mouse.move(X(360 + Math.cos(a) * 120), Y(700 + Math.sin(a) * 50)); if (Math.abs(a - 6) < 0.15) await shot('3-stir'); }
  await p.mouse.up(); await until(3);
  for (let i = 0; i < 6; i++) { await tap(360, 650); if (i === 2) await shot('4-press'); }
  await until(4);
  for (let i = 0; i < 6; i++) { if (i === 3) await tap(104 + 2 * 128, 960); await tap(280 + i * 30, 500 + (i % 3) * 60); }
  await p.waitForTimeout(500); await shot('5-decorate'); await tap(360, 1150); await until(5);
  await p.mouse.move(X(360), Y(400)); await p.mouse.down(); await p.mouse.move(X(360), Y(700), { steps: 8 }); await p.mouse.up();
  await p.waitForTimeout(1500); await shot('6-fizz');
  await p.waitForFunction(() => document.getElementById('game').dataset.toy !== '', null, { timeout: 8000 });
  await p.waitForTimeout(1300); await shot('7-reveal');
  await tap(630, 70); await p.waitForTimeout(300); await shot('8-album'); await tap(360, 600);
  const t0 = Date.now(); await tap(360, 1150); await until(0, 1000);
  console.log('replay reset ms', Date.now() - t0);
  // toy picker: rarity follows the weights, and every roll returns a toy
  const tiers = await p.evaluate(() => { const n = {}; for (let i = 0; i < 4000; i++) { const t = window.__pickToy(); n[t.r] = (n[t.r] || 0) + 1; } return n; });
  console.log('rarity over 4000 rolls', tiers);
  assert(tiers[0] > tiers[1] && tiers[1] > tiers[2] && tiers[2] > (tiers[3] || 0), 'rarity order');
  assert.deepStrictEqual(errs, [], 'page errors');
  assert.strictEqual(await step(), 0);
  console.log('PLAYTEST PASS');
  await b.close(); srv.close();
})().catch(e => { console.error('PLAYTEST FAIL', e.message); process.exit(1); });
