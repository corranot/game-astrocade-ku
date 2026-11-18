// PROTOTYPE - NOT FOR PRODUCTION
// Long-session check: plays many pinatas in a row in one page and reports what grows.
// Fails on a page error, a broken save, or GPU objects that keep growing from round to round.
// Usage: node soak.js [rounds=14] [screenshot-dir]
const { chromium, devices } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path'), assert = require('assert');

(async () => {
  const ROUNDS = +process.argv[2] || 14, shots = process.argv[3];
  const MIME = { '.js': 'text/javascript', '.html': 'text/html', '.json': 'application/json' };
  const srv = http.createServer((q, r) => { const f = q.url.split('?')[0]; fs.readFile(path.join(__dirname, f), (e, d) => { if (e) { r.statusCode = 404; return r.end(); } r.setHeader('content-type', MIME[path.extname(f)] || 'application/octet-stream'); r.end(d); }); }).listen(0);
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-precise-memory-info'] });
  const c = await b.newContext({ ...devices['Pixel 7'], deviceScaleFactor: 1 }), p = await c.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
  await p.goto(`http://localhost:${srv.address().port}/index.html?local`);
  await p.waitForFunction(() => document.getElementById('game').dataset.ready === '1', null, { timeout: 30000 });
  const box = await p.locator('#game').boundingBox();
  const X = x => box.x + x * box.width / 720, Y = y => box.y + y * box.height / 1280;
  const data = k => p.evaluate(key => document.getElementById('game').dataset[key], k);
  const game = (fn, arg) => p.evaluate(fn, arg);
  const tap = async (x, y, wait = 100) => { await p.mouse.move(X(x), Y(y)); await p.mouse.down(); await p.mouse.up(); await p.waitForTimeout(wait); };
  const until = (n, ms = 12000) => p.waitForFunction(k => +document.getElementById('game').dataset.step === k, n, { timeout: ms });
  const state = () => game(() => { const G = window.__game; return { save: JSON.parse(JSON.stringify(G.save)), gpu: G.scene.stats(), heap: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : 0, parts: G.S.parts.length }; });

  /** From the smash step to the prize screen, then on to the next pinata. smash: press the smash-only button if it is offered. */
  const finish = async (smash) => {
    await until(4); await p.waitForTimeout(1500);
    for (let i = 0; i < 60 && (await data('step')) === '4'; i++) await tap(360, 700, 160);
    await until(5); await p.waitForTimeout(1200);
    const h0 = await game(() => window.__haptics || 0);
    await p.mouse.move(X(120), Y(1050)); await p.mouse.down(); for (let x = 120; x < 620; x += 30) await p.mouse.move(X(x), Y(1050 + Math.sin(x / 40) * 80)); await p.mouse.up();
    await p.waitForFunction(() => document.getElementById('game').dataset.cap === '1', null, { timeout: 15000 }); await p.waitForTimeout(600);
    assert((await game(() => window.__haptics || 0)) > h0, 'grabbing candy ticks (sound and haptic) in every round, not only the first');
    const at = await game(() => window.__game.scene.capsuleAt()); if (at) await tap(at.x, at.y, 200);
    await until(6); await p.waitForTimeout(1900);
    const st = await state();
    await tap(360, 985, 800); // open the gift, if there is one
    const canSmash = await game(() => window.__game.canSmash());
    if (smash && canSmash) await tap(610, 1150, 600); else await tap(canSmash ? 300 : 360, 1150, 600);
    return { ...st, smashed: smash && canSmash };
  };
  /** Make one pinata with real taps. */
  const make = async (n) => {
    if ((await data('step')) === '0') { await tap(360 - 112 * 2.5 + (n % 6) * 112, 985, 200); await tap(360, 1150, 300); await until(1); }
    await tap(104 + (n % 4) * 128, 985, 80);
    await p.mouse.move(X(200), Y(560)); await p.mouse.down(); for (let k = 0; k < 24; k++) await p.mouse.move(X(200 + (k % 8) * 45), Y(560 + (k / 8 | 0) * 80)); await p.mouse.up();
    for (let i = 0; i < 60 && (await data('step')) === '1'; i++) await tap(360, 700, 90);
    await until(2); await p.waitForTimeout(300);
    for (let i = 0; i < 8; i++) await tap(280 + (i % 4) * 50, 600 + (i / 4 | 0) * 110, 90);
    await tap(360, 1150, 250); await until(3);
    for (let i = 0; i < 12 && (await data('step')) === '3'; i++) await tap(104 + 128 * (i % 3), 985, 180);
  };

  const rows = [];
  rows.push({ round: 'open', ...(await finish(false)) }); // the opening pinata
  for (let n = 1; n <= ROUNDS; n++) {
    await p.waitForTimeout(400);
    if ((await data('step')) === '4') { rows.push({ round: n + ' smash', ...(await finish(false)) }); await p.waitForTimeout(400); } // a bonus smash chosen last time
    await make(n);
    const r = await finish(n % 2 === 0); rows.push({ round: String(n), ...r });
    if (n % 4 === 1 && n > 1) { // look through the book and buy what the coins allow
      await p.waitForTimeout(500);
      if ((await data('step')) !== '4') {
        await tap(556, 70, 300); for (const x of [120, 360, 600]) await tap(x, 125, 250);
        await tap(360, 125, 200); for (let i = 1; i < 5; i++) await tap(360, 290 + 180 * i, 200);
        await tap(120, 125, 200); await tap(360, 1076, 300);
        if (shots) await p.screenshot({ path: path.join(shots, `soak-book-${n}.jpg`), type: 'jpeg', quality: 70 });
        await tap(600, 1190, 300);
      }
    }
    if (shots && n % 5 === 0) await p.screenshot({ path: path.join(shots, `soak-round-${n}.jpg`), type: 'jpeg', quality: 70 });
  }

  console.log('round      made smashed coins toys stars bats | geometries textures calls children | heapMB');
  for (const r of rows) console.log([r.round.padEnd(10), r.save.made, r.save.smashed, r.save.coins, r.save.owned.length + r.save.gold.length, r.save.stars, r.save.bats.length, '|', r.gpu.geometries, r.gpu.textures, r.gpu.calls, r.gpu.children, '|', r.heap].join(' '));

  const last = rows[rows.length - 1].save;
  assert.strictEqual(last.made, ROUNDS, 'every pinata made was counted'); assert(last.bats.length > 1, 'the shop sold a stick during the session');
  for (const r of rows) {
    const s = r.save;
    assert(Number.isInteger(s.coins) && s.coins >= 0, 'coins stay a whole, non-negative number');
    assert(new Set(s.owned).size === s.owned.length && s.owned.length <= 16, 'no toy is owned twice');
    assert(s.stars >= 0 && s.stars <= 3 && s.smashed <= s.made + 1, 'stars and bonus smashes stay in range');
    assert(new Set(s.bats).size === s.bats.length && s.bats.includes(s.bat), 'the stick in hand is one the player owns');
    assert(JSON.stringify(s).length < 2000, 'the save stays small');
  }
  // GPU objects on the prize screen must level off: compare the middle of the session with its end
  const made = rows.filter(r => /^\d+$/.test(r.round)), mid = made[Math.floor(made.length / 3)], end = made[made.length - 1];
  const maxGeo = Math.max(...made.slice(Math.floor(made.length / 3)).map(r => r.gpu.geometries)), maxTex = Math.max(...made.slice(Math.floor(made.length / 3)).map(r => r.gpu.textures));
  console.log(`geometries: round ${mid.round} = ${mid.gpu.geometries}, end = ${end.gpu.geometries}, peak = ${maxGeo}; textures: ${mid.gpu.textures} -> ${end.gpu.textures}, peak = ${maxTex}`);
  assert(maxGeo <= mid.gpu.geometries + 30, 'geometries do not keep growing');
  assert(maxTex <= mid.gpu.textures + 6, 'textures do not keep growing');

  await b.close(); srv.close();
  if (errs.length) { console.log('PAGE ERRORS:\n' + [...new Set(errs)].join('\n')); process.exit(1); }
  console.log('SOAK PASSED');
})().catch(e => { console.error('FAILED: ' + e.message); process.exit(1); });
