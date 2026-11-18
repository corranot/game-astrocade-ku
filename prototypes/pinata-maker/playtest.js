// PROTOTYPE - NOT FOR PRODUCTION
// Plays the game in a phone-sized browser and fails loudly on any broken step, rule, overlap or page error.
// Usage: node playtest.js [screenshot-dir]
const { chromium, devices } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path'), assert = require('assert');
const LANGS = ['en', 'ar', 'es', 'vi', 'hi', 'bn', 'id'];

(async () => {
  const shots = process.argv[2];
  const MIME = { '.js': 'text/javascript', '.html': 'text/html', '.json': 'application/json' }; // module scripts refuse to load without a JavaScript type
  const srv = http.createServer((q, r) => { const f = q.url.split('?')[0]; fs.readFile(path.join(__dirname, f), (e, d) => { if (e) { r.statusCode = 404; return r.end(); } r.setHeader('content-type', MIME[path.extname(f)] || 'application/octet-stream'); r.end(d); }); }).listen(0);
  const url = q => `http://localhost:${srv.address().port}/index.html?local${q || ''}`;
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const errs = [];
  let c, p, box;
  /** Open the game. o.save: a saved game to start from. o.locale: the device language. */
  const open = async (query = '', o = {}) => {
    if (c) await c.close();
    c = await b.newContext({ ...devices['Pixel 7'], deviceScaleFactor: 1, locale: o.locale || 'en-US' }); p = await c.newPage();
    p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
    if (o.save) await p.addInitScript(s => { window.__seedSave = s; }, o.save);
    await p.goto(url(query)); await p.waitForFunction(() => document.getElementById('game').dataset.ready === '1', null, { timeout: 30000 });
    box = await p.locator('#game').boundingBox();
    assert(Math.abs(box.width / box.height - 9 / 16) < 0.01, 'the stage keeps its 9:16 shape on a phone screen');
  };
  const X = x => box.x + x * box.width / 720, Y = y => box.y + y * box.height / 1280;
  const data = k => p.evaluate(key => document.getElementById('game').dataset[key], k);
  const game = (fn, arg) => p.evaluate(fn, arg);
  const shot = async n => { if (shots) await p.screenshot({ path: path.join(shots, n + '.jpg'), type: 'jpeg', quality: 72 }); };
  const tap = async (x, y, wait = 110) => { await p.mouse.move(X(x), Y(y)); await p.mouse.down(); await p.mouse.up(); await p.waitForTimeout(wait); };
  const until = (n, ms = 9000) => p.waitForFunction(k => +document.getElementById('game').dataset.step === k, n, { timeout: ms });
  const ok = name => console.log('  ok  ' + name);
  const fresh = o => ({ owned: [], gold: [], bats: [0], bat: 0, made: 0, smashed: 0, stars: 0, dupes: 0, coins: 0, candies: 0, shape: 0, muted: false, lang: null, seen: {}, ...o });

  /** Play one whole pinata by taps and one drag, up to the prize screen. o.shots names screenshots, o.shape / o.color pick from the rows. */
  const pinata = async (o = {}) => {
    const s = async n => { if (o.shots) await shot(o.shots + n); };
    if (await game(() => window.__game.S.intro)) await tap(360, 448, 250); // a feature being introduced waits for one tap on it
    if ((await data('step')) === '0') {
      if (o.shape !== undefined) await tap(360 - 112 * 2.5 + o.shape * 112, 985, 250);
      await p.waitForTimeout(300); await s('0-shape'); await tap(360, 1150, 300); await until(1);
    }
    if (o.color !== undefined) await tap(104 + o.color * 128, 985);
    await p.mouse.move(X(200), Y(560)); await p.mouse.down(); for (let k = 0; k < 24; k++) await p.mouse.move(X(200 + (k % 8) * 45), Y(560 + (k / 8 | 0) * 80)); await p.mouse.up();
    await s('1-paper');
    for (let i = 0; i < 50 && (await data('step')) === '1'; i++) await tap(360, 700, 100);
    await until(2); await p.waitForTimeout(350);
    for (let i = 0; i < 6; i++) await tap(300 + (i % 3) * 60, 620 + (i / 3 | 0) * 90, 120);
    await p.waitForTimeout(300); await s('2-decorate'); await tap(360, 1150, 250); await until(3);
    for (let i = 0; i < 10 && (await data('step')) === '3'; i++) { await tap(104 + 128 * (i % 3), 985, 200); if (i === 1) await s('3-fill'); }
    await until(4); await p.waitForTimeout(1700); await s('4-hang');
    for (let i = 0; i < 50 && (await data('step')) === '4'; i++) { await tap(360, 700, 200); if (i === 2) await s('4-hit'); }
    await until(5); await p.waitForTimeout(300); await s('5-burst'); await p.waitForTimeout(1300);
    await p.mouse.move(X(120), Y(1050)); await p.mouse.down(); for (let x = 120; x < 620; x += 25) await p.mouse.move(X(x), Y(1050 + Math.sin(x / 40) * 80)); await p.mouse.up();
    await s('5-grab');
    await p.waitForFunction(() => document.getElementById('game').dataset.cap === '1', null, { timeout: 14000 }); await p.waitForTimeout(700); await s('5-capsule');
    const at = await game(() => window.__game.scene.capsuleAt()); await tap(at.x, at.y, 200);
    await until(6); await p.waitForTimeout(1900); await s('6-prize');
    return data('toy');
  };
  const again = async () => { await tap(360, 985, 500); await tap(300, 1150, 500); await until(await game(() => window.__game.save.made === 0 ? 1 : 0), 3000); }; // open the gift box if there is one, then replay

  console.log('1. whole loop, gift, replay');
  await open(); await p.waitForTimeout(1200); await shot('a0-first-screen');
  assert.strictEqual(await data('step'), '1', 'the first pinata starts at the paper step, with no menu');
  assert(+(await data('prog')) > 0.5, 'the first pinata arrives mostly covered');
  const a1 = await p.screenshot(); await p.waitForTimeout(500); const a2 = await p.screenshot();
  assert(!a1.equals(a2), 'the first screen moves before any touch');
  const toy1 = await pinata({ shots: 'a' });
  let st = await game(() => ({ save: window.__game.save, earned: window.__game.S.earned, gift: window.__game.S.gift }));
  assert.strictEqual(st.save.made, 1); assert.strictEqual(st.save.owned.length, 1); assert(toy1.startsWith('toy_'));
  assert.strictEqual(st.earned.met, false, 'the first pinata has no order'); assert(st.earned.candy > 0, 'candy was grabbed');
  assert.strictEqual(st.save.coins, 10 + st.earned.candy, '10 for the pinata + 1 per candy'); assert.deepStrictEqual(st.gift, { at: 1, kind: 'sticker', i: 3 });
  await again(); assert.strictEqual(await data('step'), '0', 'the second pinata starts with the shape step'); ok('five steps, prize, coins, gift, replay');

  console.log('2. second pinata: order, HUD, book and shop');
  await p.waitForTimeout(400); await shot('b0-order-intro');
  assert.strictEqual(await game(() => window.__game.S.intro), 'order', 'the first order is introduced');
  const want = await game(() => window.__game.S.order);
  await pinata({ shots: 'b', shape: want.shape, color: want.color });
  st = await game(() => ({ save: window.__game.save, earned: window.__game.S.earned }));
  assert.strictEqual(st.earned.met, true, 'a pinata of the ordered shape and colour fills the order'); assert.strictEqual(st.earned.order, 20);
  await tap(360, 985, 500); await shot('b7-gift-open');
  assert.strictEqual(await game(() => window.__game.perk(0)), true, 'smash-only opens after two pinatas');
  await tap(610, 1150, 600); await until(4, 3000); await p.waitForTimeout(1600); await shot('c0-smash-only');
  for (let i = 0; i < 50 && (await data('step')) === '4'; i++) await tap(360, 700, 200);
  await until(5); await p.waitForFunction(() => document.getElementById('game').dataset.step === '6', null, { timeout: 25000 }); // no touch at all: candy and capsule collect themselves
  st = await game(() => window.__game.save); assert.strictEqual(st.made, 2, 'smash-only does not count as a made pinata'); assert.strictEqual(st.smashed, 1);
  await p.waitForTimeout(1800); await tap(300, 1150, 500); await until(0, 3000);
  await tap(556, 70, 400); await shot('c1-book-toys'); await tap(520, 120, 300); await shot('c2-book-sticks');
  const coins = (await game(() => window.__game.save)).coins;
  await tap(360, 290 + 180, 300); st = await game(() => window.__game.save);
  if (coins >= 60) { assert.deepStrictEqual(st.bats, [0, 1]); assert.strictEqual(st.bat, 1); assert.strictEqual(st.coins, coins - 60); } else assert.deepStrictEqual(st.bats, [0]);
  await tap(360, 290 + 180 * 4, 300); assert(!(await game(() => window.__game.save)).bats.includes(4), 'a stick that costs more than the coins is not sold');
  await tap(120, 1190, 300); assert.strictEqual(await data('lang'), 'ar', 'the globe button steps to the next language'); await shot('c3-book-arabic');
  await tap(720 - 600, 1190, 300); assert.strictEqual(await game(() => window.__game.S.panel), null, 'close button (mirrored in Arabic)');
  ok('order, smash-only, hands-off collecting, book, shop, language button');

  console.log('3. mashing where the button will appear does not skip the prize');
  await open('', { save: fresh({ made: 4, coins: 50 }) });
  await game(() => { const G = window.__game; G.seed(7); G.newRound(); });
  await game(() => { const G = window.__game; G.S.intro = null; G.S.mix = [2, 1, 0, 0, 0]; G.enterSmash(); G.S.hoist = 0; });
  for (let i = 0; i < 30 && (await data('step')) === '4'; i++) await tap(360, 1150, 60);
  await until(5); for (let i = 0; i < 160 && (await data('step')) !== '6'; i++) await tap(360, 1150, 60);
  assert.strictEqual(await data('step'), '6'); const madeNow = (await game(() => window.__game.save)).made;
  for (let i = 0; i < 6; i++) await tap(360, 1150, 60);
  assert.strictEqual(await data('step'), '6', 'the replay button waits before it accepts a tap'); assert.strictEqual(madeNow, 5); ok('prize screen survives mashing');

  console.log('4. rules: rarity, pity, golden, unlocks, old saves');
  await open();
  const rules = await game(() => {
    const G = window.__game, out = {}; G.seed(42);
    const tiers = [0, 0, 0, 0]; for (let i = 0; i < 4000; i++) tiers[G.pickToy().tier]++; out.tiers = tiers;
    out.minTier = Math.min(...Array.from({ length: 300 }, () => G.pickToy(1).tier));
    G.save = { owned: G.TOYS.filter(t => t.i !== 15).map(t => t.i), dupes: 3 }; out.pity = G.drawPrize();
    G.save = { dupes: 0 }; G.S.gold = true; out.goldMin = Math.min(...Array.from({ length: 300 }, () => G.drawPrize().toy.tier)); G.S.gold = false;
    G.save = { owned: G.TOYS.map(t => t.i), gold: [] }; out.goldSet = G.drawPrize();
    out.next0 = G.nextReward(0); out.next20 = G.nextReward(20); out.gift12 = G.rewardAt(12); out.gift13 = G.rewardAt(13); out.gift3 = G.rewardAt(3);
    out.open = [G.isOpen('shape', 2), G.isOpen('shape', 3), G.isOpen('color', 4), G.isOpen('candy', 2)];
    out.old = G.mergeSave({ owned: [], gold: [], bats: [0], bat: 0, made: 0, coins: 0, seen: {} }, { owned: [1, 2], made: '3', bat: 4 });
    return out;
  });
  assert(rules.tiers[0] > rules.tiers[1] && rules.tiers[1] > rules.tiers[2] && rules.tiers[2] > rules.tiers[3] && rules.tiers[3] > 0, 'rarer tiers come up less often: ' + rules.tiers);
  assert.strictEqual(rules.minTier, 1); assert.strictEqual(rules.pity.toy.i, 15, 'after three duplicates the toy is a missing one'); assert.strictEqual(rules.pity.isNew, true);
  assert(rules.goldMin >= 1, 'a golden pinata gives rare or better'); assert.strictEqual(rules.goldSet.gold, true, 'a full album switches to the gold set'); assert.strictEqual(rules.goldSet.isNew, true);
  assert.strictEqual(rules.next0.left, 1); assert.strictEqual(rules.next20.u.kind, 'coins'); assert.strictEqual(rules.gift13.kind, 'coins'); assert.strictEqual(rules.gift12, null); assert.strictEqual(rules.gift3.kind, 'shape');
  assert.deepStrictEqual(rules.open, [true, true, false, true].map((v, i) => i === 1 ? false : v).map((v, i) => i === 1 ? false : v)); // fresh save: 3 shapes, 4 colours, 3 candies open
  assert.strictEqual(rules.old.made, 3); assert.strictEqual(rules.old.bat, 0, 'a stick the save does not own is not equipped'); assert.deepStrictEqual(rules.old.bats, [0]); ok('toy and unlock rules');

  console.log('5. golden pinata, mega rain and a party round');
  await open('', { save: fresh({ made: 2, stars: 3, coins: 10, seen: { order: 1 } }) });
  await game(() => { const G = window.__game; G.seed(3); G.newRound(); });
  st = await game(() => ({ gold: window.__game.S.gold, party: window.__game.S.party, stars: window.__game.S.goldStars }));
  assert.strictEqual(st.gold, true, 'three stars make the next pinata golden'); assert.strictEqual(st.party, true, 'every third pinata is a party round');
  await game(() => { window.__game.S.mega = true; });
  await pinata({ shots: 'd' });
  st = await game(() => ({ save: window.__game.save, tier: window.__game.S.prizes[0].toy.tier, hpMax: window.__game.S.hpMax }));
  assert(st.tier >= 1); assert.strictEqual(st.save.stars <= 1, true, 'the golden pinata spends the stars'); assert.strictEqual(st.hpMax, 12, 'a party pinata takes three more hits'); ok('golden + mega + party');

  console.log('6. no assets: emoji and synthesized sound');
  await open('&noassets'); await pinata({ shots: 'e' }); ok('whole loop without asset_map.json');

  console.log('7. edit mode: a live picture, no gameplay');
  await open('&edit'); await p.waitForTimeout(800); await tap(360, 700); await tap(360, 1150); await shot('f-edit');
  assert.strictEqual((await game(() => window.__game.S.acted)), false); ok('edit mode');

  console.log('8. 600 seeded random taps and drags');
  await open('', { save: fresh({ made: 6, coins: 500, seen: { order: 1 } }) });
  let seed = 12345; const rand = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
  for (let i = 0; i < 600; i++) {
    const x = rand() * 720, y = rand() * 1280;
    await p.mouse.move(X(x), Y(y)); await p.mouse.down(); if (rand() < 0.3) await p.mouse.move(X(rand() * 720), Y(rand() * 1280), { steps: 3 }); await p.mouse.up();
    if (i % 40 === 0) await p.waitForTimeout(120);
  }
  const stepNow = +(await data('step')); assert(stepNow >= 0 && stepNow <= 6); ok('random input, step ' + stepNow + ', made ' + (await data('made')));

  console.log('9. device language');
  for (const [locale, wantLang] of [['en-US', 'en'], ['ar-SA', 'ar'], ['es-MX', 'es'], ['vi-VN', 'vi'], ['hi-IN', 'hi'], ['bn-BD', 'bn'], ['id-ID', 'id'], ['tr-TR', 'en'], ['fr-FR', 'en'], ['pt-BR', 'en']]) {
    await open('', { locale }); assert.strictEqual(await data('lang'), wantLang, locale); assert.strictEqual(await data('rtl'), wantLang === 'ar' ? '1' : '0');
  }
  ok('seven languages, others fall back to English');

  console.log('10. layout: no HUD element overlaps another or leaves the screen, every screen x every language');
  /** Jump to a screen by state, then return the recorded boxes. */
  const screens = {
    shape: () => { const G = window.__game; G.newRound(); G.S.intro = null; },
    paper: () => { const G = window.__game; G.S.step = 1; G.S.idle = 0; G.S.acted = true; },
    decorate: () => { const G = window.__game; while (G.scene.paintAt(-1, -1, 0, true)); G.S.step = 2; G.scene.addFace(); G.S.stuck = 9; G.S.done = 0; G.S.F = [{ txt: G.cfg.strings[document.getElementById('game').dataset.lang].d2, c: '#12a454', life: 1.4 }]; },
    fill: () => { const G = window.__game; G.S.step = 3; G.S.mix = [2, 1, 0, 0, 0]; G.S.fill = 3; },
    smash: () => { const G = window.__game; G.S.party = true; G.enterSmash(); G.S.hoist = 0.01; },
    grab: () => { const G = window.__game; G.S.hoist = 0; for (let i = 0; i < 40 && G.S.step === 4; i++) G.hitNow(); },
    prize: () => { const G = window.__game; G.reveal(); G.S.stepT = 5; },
    prizeOpen: () => { const G = window.__game; G.S.giftOpen = true; G.S.stepT = 5; },
    book: () => { const G = window.__game; G.S.panel = 'book'; G.S.tab = 0; },
    sticks: () => { const G = window.__game; G.S.tab = 1; },
  };
  let checked = 0;
  for (const l of LANGS) {
    await open('', { save: fresh({ made: 2, coins: 77, lang: l, owned: [0, 6, 11], bats: [0, 1], seen: { order: 1 } }) });
    for (const [name, jump] of Object.entries(screens)) {
      await game(jump); await p.waitForTimeout(name === 'grab' ? 500 : 350);
      const boxes = await game(() => window.__boxes);
      for (const q of boxes) assert(q.x >= -1 && q.y >= -1 && q.x + q.w <= 721 && q.y + q.h <= 1281, `${l}/${name}: "${q.n}" leaves the screen ${JSON.stringify(q)}`);
      const top = boxes.filter(q => q.n !== 'card');
      for (let i = 0; i < top.length; i++) for (let j = i + 1; j < top.length; j++) {
        const u = top[i], v = top[j], hit = u.x < v.x + v.w - 2 && v.x < u.x + u.w - 2 && u.y < v.y + v.h - 2 && v.y < u.y + u.h - 2;
        assert(!hit, `${l}/${name}: "${u.n}" overlaps "${v.n}" ${JSON.stringify([u, v])}`);
      }
      checked++; await shot(`lang-${l}-${name}`);
    }
  }
  ok(checked + ' screens');

  console.log('11. first minutes: short first pinata, spotlight, idle help');
  await open();
  st = await game(() => ({ help: window.__game.helpTarget(), first: window.__game.cfg.first }));
  await p.waitForTimeout(900); st = await game(() => ({ help: window.__game.helpTarget(), left: window.__game.S.total - window.__game.scene.coveredCount() }));
  assert(st.help && st.help.hand === 'rub', 'a ghost hand shows the gesture on the pinata before the first touch'); assert.strictEqual(st.left, 4, 'only four patches are left to cover on the first pinata');
  await tap(360, 700, 300); assert.strictEqual(await game(() => window.__game.helpTarget()), null, 'the spotlight leaves once the player acts');
  await game(() => { window.__game.S.idle = 4.5; }); assert((await game(() => window.__game.helpTarget())) !== null, 'help returns after four idle seconds');
  const t0 = Date.now(); await game(() => { window.__game.S.idle = 0; });
  for (let i = 0; i < 50 && (await data('step')) === '1'; i++) await tap(360, 700, 80);
  await until(2); for (let i = 0; i < 2; i++) await tap(330 + i * 60, 640, 100); await tap(360, 1150, 200); await until(3);
  for (let i = 0; i < 3; i++) await tap(104, 985, 150);
  await until(4); await p.waitForTimeout(1300); let hits = 0; while ((await data('step')) === '4' && hits < 20) { await tap(360, 700, 150); hits++; }
  assert.strictEqual(hits, 5, 'the first pinata bursts after five hits');
  console.log('      first burst after ' + ((Date.now() - t0) / 1000).toFixed(1) + ' s of play (slow software rendering included)');
  ok('first minutes');

  await b.close(); srv.close();
  if (errs.length) { console.log('PAGE ERRORS:\n' + [...new Set(errs)].join('\n')); process.exit(1); }
  console.log('ALL CHECKS PASSED');
})().catch(e => { console.error('FAILED: ' + e.message); process.exit(1); });
