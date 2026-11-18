// PROTOTYPE - NOT FOR PRODUCTION
// Plays the game in a phone-sized browser and fails loudly on any broken step, rule or page error.
// Usage: node playtest.js [screenshot-dir]
const { chromium, devices } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path'), assert = require('assert');

(async () => {
  const shots = process.argv[2];
  const srv = http.createServer((q, r) => fs.readFile(path.join(__dirname, q.url.split('?')[0]), (e, d) => e ? (r.statusCode = 404, r.end()) : r.end(d))).listen(0);
  const b = await chromium.launch(), c = await b.newContext({ ...devices['Pixel 7'], deviceScaleFactor: 1 }), p = await c.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
  let box;
  const open = async (query = '') => {
    await p.goto(`http://localhost:${srv.address().port}/index.html?local${query}`);
    await p.waitForFunction(() => document.getElementById('game').dataset.step === '0');
    box = await p.locator('#game').boundingBox();
  };
  const X = x => box.x + x * box.width / 720, Y = y => box.y + y * box.height / 1280;
  const data = k => p.evaluate(key => document.getElementById('game').dataset[key], k);
  const shot = async n => { if (shots) await p.screenshot({ path: path.join(shots, n + '.png') }); };
  const tap = async (x, y, wait = 120) => { await p.mouse.move(X(x), Y(y)); await p.mouse.down(); await p.mouse.up(); await p.waitForTimeout(wait); };
  const until = async (n, ms = 5000) => { await p.waitForFunction(k => +document.getElementById('game').dataset.step === k, n, { timeout: ms }); };
  const toyShown = () => p.waitForFunction(() => document.getElementById('game').dataset.toy !== '', null, { timeout: 9000 });
  const ok = name => console.log('  ok  ' + name);

  /** Play one whole bomb up to the prize screen. o.mold picks a mold, o.shots names screenshots. */
  const bomb = async (o = {}) => {
    const s = async n => { if (o.shots && (!o.only || o.only.includes(n))) await shot(o.shots + n); };
    await p.mouse.move(X(360), Y(600)); await p.mouse.down(); await p.waitForTimeout(1500); await s('1-pour'); await p.waitForTimeout(1700); await p.mouse.up(); await until(1);
    for (const i of [0, 2, 1]) await tap(104 + i * 128, 960);
    await p.waitForTimeout(900); await s('2-color'); await tap(360, 1150); await until(2);
    await s('3-spoon-rest');
    await p.mouse.move(X(480), Y(700)); await p.mouse.down();
    for (let a = 0; a < 45; a += 0.3) await p.mouse.move(X(360 + Math.cos(a) * 120), Y(700 + Math.sin(a) * 50));
    await p.mouse.up(); await until(3);
    if (o.mold !== undefined) await tap(104 + o.mold * 128, 960);
    await tap(360, 600); await tap(360, 600); await s('4-press');
    for (let i = 0; i < 4; i++) await tap(360, 600);
    await until(4);
    for (let i = 0; i < 16; i++) { if (i === 8) await tap(104 + 1 * 128, 960); await tap(300 + (i % 4) * 40, 520 + (i / 4 | 0) * 40, 60); }
    await p.waitForTimeout(400); await s('5-decorate'); await tap(360, 1150); await until(5);
    await p.mouse.move(X(360), Y(400)); await p.mouse.down(); await p.mouse.move(X(360), Y(700), { steps: 8 }); await p.mouse.up();
    await p.waitForTimeout(1200); await s('6-fizz');
    await toyShown(); await p.waitForTimeout(1800); await tap(360, 560); await s('7-reveal');
    return data('toy');
  };
  const again = async () => { await tap(360, 1150); await until(0, 1500); };

  console.log('1. whole loop, album, replay');
  await open(); await p.waitForTimeout(1500); await shot('0-first-screen');
  assert(+(await data('prog')) > 0, 'the jar pours by itself before the first touch');
  await bomb({ shots: 'a' });
  await tap(630, 70); await p.waitForTimeout(300); await shot('a8-album'); await tap(360, 600);
  await again(); assert.strictEqual(await data('made'), '1'); ok('six steps, prize, album, replay');

  console.log('2. quick taps pour too (kids tap, they do not hold)');
  await open();
  for (let i = 0; i < 30 && (await data('step')) === '0'; i++) await tap(360, 600, 200);
  assert.strictEqual(await data('step'), '1', 'taps alone must finish the pour step'); ok('tap-only pour');

  console.log('3. mashing where the button will appear does not skip the prize');
  await open();
  await p.evaluate(() => { const G = window.__game; G.S.step = 5; G.S.col = [255, 92, 168]; G.S.ball.loose = true; });
  for (let i = 0; i < 80 && (await data('toy')) === ''; i++) await tap(360, 1150, 80);
  assert.notStrictEqual(await data('toy'), '', 'prize shown');
  for (let i = 0; i < 10; i++) await tap(360, 1150, 80); // about one second of extra mashing
  assert.strictEqual(await data('step'), '5', 'still on the prize screen after mashing');
  await p.waitForTimeout(900); await again(); ok('button waits, then works');

  console.log('4. mute button');
  await tap(478, 70); assert.strictEqual(await data('muted'), '1');
  await tap(478, 70); assert.strictEqual(await data('muted'), '0'); ok('toggles');

  console.log('5. rules');
  const r = await p.evaluate(() => {
    const G = window.__game, cfg = window.gameConfig, out = {};
    const all = ['🦆', '🐸', '🐟', '🐢', '🐙', '🦀', '🐳', '🐥', '🦄', '🐬', '🦈', '🧸', '🦋', '🐉', '👑', '💎'];
    const fresh = o => ({ owned: [], gold: [], made: 0, stars: 0, dupes: 0, muted: false, ...o });
    out.merge = G.mergeSave(fresh({ owned: ['🦆'], made: 1 }), { owned: ['🐸'], made: 4, stars: 2 });
    G.save = fresh({ owned: all.slice(0, 15), dupes: cfg.pityDupes, made: 30 }); G.newBomb();
    out.pity = [...new Set(Array.from({ length: 50 }, () => { const d = G.drawPrize(); return d.toy.e + d.isNew + d.gold; }))];
    G.save = fresh({ owned: all, made: 40 }); G.newBomb(); out.gold = G.drawPrize().gold;
    G.save = fresh({ made: 2, stars: cfg.starsForGolden }); G.newBomb(); out.starGolden = G.S.golden; out.starsLeft = G.save.stars;
    G.save = fresh({ made: 5 }); out.until = [G.bombsUntil('mold', 4), G.bombsUntil('mold', 0), G.bombsUntil('perk', 0)];
    G.save = fresh({}); G.newBomb(); out.firstGolden = G.S.golden;
    const n = [0, 0, 0, 0]; for (let i = 0; i < 4000; i++) n[G.pickToy().r]++; out.tiers = n;
    const lucky = [0, 0, 0, 0]; for (let i = 0; i < 4000; i++) lucky[G.pickToy(Math.random, 1).r]++; out.lucky = lucky;
    out.goldenMin = Math.min(...Array.from({ length: 300 }, () => G.pickToy(Math.random, 0, 1).r));
    out.badUnlocks = cfg.unlocks.filter(u => !({ mold: 5, color: 5, top: 5, perk: 2 }[u.kind] > u.i)).length;
    G.save = fresh({}); G.newBomb();
    return out;
  });
  assert.deepStrictEqual(r.merge.owned, ['🦆', '🐸']); assert.strictEqual(r.merge.made, 4); assert.strictEqual(r.merge.stars, 2); ok('a late save load merges, never overwrites');
  assert.deepStrictEqual(r.pity, ['💎truefalse'], 'pity gives the one missing toy'); ok('after 3 duplicates the next toy is a missing one');
  assert.strictEqual(r.gold, true); ok('a full album switches to gold toys');
  assert.strictEqual(r.starGolden, true); assert.strictEqual(r.starsLeft, 0); ok('3 stars buy a golden bomb');
  assert.deepStrictEqual(r.until, [3, 0, 5]); ok('locks count the bombs to go');
  assert.strictEqual(r.firstGolden, false); ok('the first bomb is never golden');
  assert(r.tiers[0] > r.tiers[1] && r.tiers[1] > r.tiers[2] && r.tiers[2] > r.tiers[3], 'rarity order ' + r.tiers);
  assert(r.lucky[0] < r.tiers[0] * 0.75, 'full luck lowers the common share ' + r.lucky); ok('rarity follows the weights, luck shifts it');
  assert(r.goldenMin >= 1); ok('a golden bomb never gives a common toy');
  assert.strictEqual(r.badUnlocks, 0); ok('every unlock in the config points at something real');

  console.log('6. three bombs with golden and double forced on');
  await open('&cfg=' + encodeURIComponent('{"goldenChance":1,"twinChance":1}'));
  await bomb(); await again();
  await bomb({ mold: 1, shots: 'b', only: ['4-press', '5-decorate'] }); await again();
  const third = await bomb({ mold: 0, shots: 'c', only: ['7-reveal'] });
  assert(third.includes('+'), 'third bomb holds two toys, got ' + third); assert.strictEqual(await data('made'), '3'); ok('unlocks, golden, double');

  console.log('7. duplicate pays a star; last toy completes the album; then gold');
  await open('&cfg=' + encodeURIComponent('{"goldenChance":0,"twinChance":0}'));
  await p.evaluate(() => { const G = window.__game; G.save = { owned: ['🦆', '🐸', '🐟', '🐢', '🐙', '🦀', '🐳', '🐥', '🦄', '🐬', '🦈', '🧸', '🦋', '🐉', '👑'], gold: [], made: 20, stars: 0, dupes: 3, muted: false }; G.newBomb(); });
  assert.strictEqual(await bomb({ shots: 'd', only: ['7-reveal'] }), 'Diamond');
  assert.strictEqual(await p.evaluate(() => window.__game.S.note), 'ALBUM COMPLETE! 👑'); await again();
  await bomb({ shots: 'e', only: ['7-reveal'] });
  const g2 = await p.evaluate(() => ({ gold: window.__game.save.gold.length, isGold: window.__game.S.prizes[0].gold }));
  assert.deepStrictEqual(g2, { gold: 1, isGold: true });
  await tap(630, 70); await p.waitForTimeout(300); await shot('e8-album-gold'); await tap(360, 600); await again();
  await p.evaluate(() => { const G = window.__game; G.save.owned = ['🦆', '🐸', '🐟', '🐢', '🐙', '🦀', '🐳', '🐥']; G.save.gold = []; G.save.dupes = 0; G.save.stars = 0; G.newBomb(); });
  let star = false;
  for (let i = 0; i < 6 && !star; i++) { await bomb({ shots: 'f', only: ['7-reveal'] }); star = await p.evaluate(() => window.__game.S.prizes.some(x => !x.isNew)); if (!star) await again(); }
  assert(star, 'a duplicate turned up within six bombs'); assert(await p.evaluate(() => window.__game.save.stars >= 1)); ok('star, album complete, gold set');

  console.log('8. no assets at all: emoji and synthesized sound');
  await open('&noassets'); await bomb({ shots: 'g', only: ['5-decorate', '7-reveal'] }); await again(); ok('fallback path plays through');

  console.log('9. edit mode shows a picture and ignores play input');
  await open('&mode=edit'); for (let i = 0; i < 12; i++) await tap(100 + i * 45, 300 + i * 70, 30);
  assert.strictEqual(await data('step'), '0'); await shot('h-edit-mode'); ok('edit mode');

  console.log('10. monkey: 600 random taps and drags');
  await open('&cfg=' + encodeURIComponent('{"fizzSeconds":1.5,"pourSeconds":1}'));
  let seed = 12345; const rand = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648; // fixed seed: the same run every time
  let made = 0;
  for (let i = 0; i < 600; i++) {
    const x = 20 + rand() * 680, y = 20 + rand() * 1240;
    await p.mouse.move(X(x), Y(y)); await p.mouse.down();
    if (rand() < 0.5) for (let k = 0; k < 6; k++) await p.mouse.move(X(20 + rand() * 680), Y(200 + rand() * 1000));
    if (rand() < 0.3) await p.waitForTimeout(250);
    await p.mouse.up();
    if (i % 50 === 49) {
      const st = await p.evaluate(() => { const G = window.__game; return { step: G.S.step, made: G.save.made, parts: G.S.P.length, prog: G.S.prog, tops: G.S.tops.length }; });
      assert(st.step >= 0 && st.step <= 5 && st.made >= made && st.parts <= 600 && st.prog >= 0 && st.prog <= 1.2 && st.tops <= 60, 'bad state ' + JSON.stringify(st));
      made = st.made;
    }
  }
  console.log('  bombs finished by the monkey:', made); await shot('i-after-monkey'); ok('no errors, state stays valid');

  assert.deepStrictEqual(errs, [], 'page errors');
  console.log('PLAYTEST PASS');
  await b.close(); srv.close();
})().catch(e => { console.error('PLAYTEST FAIL', e.message); process.exit(1); });
