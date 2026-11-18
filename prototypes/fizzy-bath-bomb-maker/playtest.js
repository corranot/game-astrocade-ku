// PROTOTYPE - NOT FOR PRODUCTION
// Plays the game in a phone-sized browser and fails loudly on any broken step, rule, overlap or page error.
// Usage: node playtest.js [screenshot-dir]
const { chromium, devices } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path'), assert = require('assert');
const ALL = ['🦆', '🐸', '🐟', '🐢', '🐙', '🦀', '🐳', '🐥', '🦄', '🐬', '🦈', '🧸', '🦋', '🐉', '👑', '💎'];

(async () => {
  const shots = process.argv[2];
  const srv = http.createServer((q, r) => fs.readFile(path.join(__dirname, q.url.split('?')[0]), (e, d) => e ? (r.statusCode = 404, r.end()) : r.end(d))).listen(0);
  const url = q => `http://localhost:${srv.address().port}/index.html?local${q || ''}`;
  const b = await chromium.launch(), c = await b.newContext({ ...devices['Pixel 7'], deviceScaleFactor: 1 }), p = await c.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
  let box;
  const open = async (query = '') => { await p.goto(url(query)); await p.waitForFunction(() => document.getElementById('game').dataset.step === '0'); box = await p.locator('#game').boundingBox(); };
  const X = x => box.x + x * box.width / 720, Y = y => box.y + y * box.height / 1280;
  const data = k => p.evaluate(key => document.getElementById('game').dataset[key], k);
  const game = fn => p.evaluate(fn);
  const shot = async n => { if (shots) await p.screenshot({ path: path.join(shots, n + '.jpg'), type: 'jpeg', quality: 72 }); };
  const tap = async (x, y, wait = 120) => { await p.mouse.move(X(x), Y(y)); await p.mouse.down(); await p.mouse.up(); await p.waitForTimeout(wait); };
  const until = async (n, ms = 6000) => { await p.waitForFunction(k => +document.getElementById('game').dataset.step === k, n, { timeout: ms }); };
  const toyShown = () => p.waitForFunction(() => document.getElementById('game').dataset.toy !== '', null, { timeout: 9000 });
  const ok = name => console.log('  ok  ' + name);
  const fresh = o => ({ owned: [], gold: [], recipes: [], skins: [0], skin: 0, made: 0, stars: 0, dupes: 0, coins: 0, muted: false, lang: null, ...o });

  /** Play one whole bomb up to the prize screen. o.mold picks a mold, o.colors the color slots, o.shots names screenshots. */
  const bomb = async (o = {}) => {
    const s = async n => { if (o.shots && (!o.only || o.only.includes(n))) await shot(o.shots + n); };
    await p.mouse.move(X(360), Y(700)); await p.mouse.down(); await p.waitForTimeout(1500); await s('1-pour'); await p.waitForTimeout(1700); await p.mouse.up(); await until(1);
    for (const i of o.colors || [0, 2, 1]) await tap(104 + i * 128, 985);
    await p.waitForTimeout(900); await s('2-color'); await tap(360, 1150); await until(2);
    await s('3-stir');
    await p.mouse.move(X(480), Y(740)); await p.mouse.down();
    for (let a = 0; a < 45; a += 0.3) await p.mouse.move(X(360 + Math.cos(a) * 120), Y(740 + Math.sin(a) * 50));
    await p.mouse.up(); await until(3);
    if (o.mold !== undefined) await tap(104 + o.mold * 128, 985);
    await tap(360, 690); await tap(360, 690); await s('4-press');
    for (let i = 0; i < 4; i++) await tap(360, 690);
    await until(4);
    for (let i = 0; i < 16; i++) { if (i === 8) await tap(104 + 1 * 128, 985); await tap(300 + (i % 4) * 40, 612 + (i / 4 | 0) * 40, 60); }
    await p.waitForTimeout(400); await s('5-decorate'); await tap(360, 1150); await until(5);
    await s('6-ready');
    await p.mouse.move(X(360), Y(520)); await p.mouse.down(); await p.mouse.move(X(360), Y(800), { steps: 8 }); await p.mouse.up();
    await p.waitForTimeout(1200); await s('6-fizz');
    // every third bomb has a bubble round first: pop what is on screen, then wait for the prize
    for (let i = 0; i < 14 && (await data('toy')) === ''; i++) { const u = await game(() => { const q = window.__game.S.pop; return q && q.list.length ? { x: q.list[0].x, y: q.list[0].y } : null; }); if (u) await tap(u.x, u.y, 60); else await p.waitForTimeout(500); }
    await toyShown(); await p.waitForTimeout(1900); await tap(360, 470); await s('7-prize');
    return data('toy');
  };
  const again = async () => { await tap(360, 1150); await until(0, 1500); };

  console.log('1. whole loop, book, replay');
  await open(); await p.waitForTimeout(1500); await shot('0-first-screen');
  assert(+(await data('prog')) > 0, 'the jar pours by itself before the first touch');
  await bomb({ shots: 'a', colors: [0, 0, 0] });
  let st = await game(() => ({ coins: window.__game.save.coins, recipes: window.__game.save.recipes, earned: window.__game.S.earned }));
  assert.deepStrictEqual(st.recipes, ['0-0']); assert.strictEqual(st.earned.met, true, 'the first order (pink ball) is filled'); assert.strictEqual(st.coins, 40, '10 base + 20 order + 10 new recipe');
  await tap(621, 70); await p.waitForTimeout(300); await shot('a8-book-toys'); await tap(360, 80); await p.waitForTimeout(300); await shot('a9-book-recipes'); await tap(625, 1190);
  await again(); assert.strictEqual(await data('made'), '1'); ok('six steps, prize, coins, recipe, book, replay');

  console.log('2. quick taps pour too (kids tap, they do not hold)');
  await open();
  for (let i = 0; i < 30 && (await data('step')) === '0'; i++) await tap(360, 700, 200);
  assert.strictEqual(await data('step'), '1', 'taps alone must finish the pour step'); ok('tap-only pour');

  console.log('3. mashing where the button will appear does not skip the prize');
  await open();
  await game(() => { const G = window.__game; G.S.step = 5; G.S.col = 0; G.S.cols = [0]; G.S.ball.loose = true; });
  for (let i = 0; i < 80 && (await data('toy')) === ''; i++) await tap(360, 1150, 80);
  assert.notStrictEqual(await data('toy'), '', 'prize shown');
  for (let i = 0; i < 10; i++) await tap(360, 1150, 80); // about one second of extra mashing
  assert.strictEqual(await data('step'), '5', 'still on the prize screen after mashing');
  await p.waitForTimeout(900); await again(); ok('button waits, then works');

  console.log('4. mute button');
  await tap(478, 70); assert.strictEqual(await data('muted'), '1');
  await tap(478, 70); assert.strictEqual(await data('muted'), '0'); ok('toggles');

  console.log('5. rules');
  const r = await p.evaluate(all => {
    const G = window.__game, cfg = window.gameConfig, out = {};
    const fresh = o => ({ owned: [], gold: [], recipes: [], skins: [0], skin: 0, made: 0, stars: 0, dupes: 0, coins: 0, muted: false, lang: null, ...o });
    out.merge = G.mergeSave(fresh({ owned: ['🦆'], made: 1, coins: 30, recipes: ['0-0'] }), { owned: ['🐸'], made: 4, stars: 2, coins: 10, recipes: ['1-2'] });
    G.save = fresh({ owned: all.slice(0, 15), dupes: cfg.pityDupes, made: 30 }); G.newBomb();
    out.pity = [...new Set(Array.from({ length: 50 }, () => { const d = G.drawPrize(); return d.toy.e + d.isNew + d.gold; }))];
    G.save = fresh({ owned: all, made: 40 }); G.newBomb(); out.gold = G.drawPrize().gold;
    G.save = fresh({ made: 2, stars: cfg.starsForGolden }); G.newBomb(); out.starGolden = G.S.golden; out.starsLeft = G.save.stars;
    G.save = fresh({ made: 5 }); out.until = [G.bombsUntil('mold', 4), G.bombsUntil('mold', 0), G.bombsUntil('perk', 0)];
    out.next5 = G.nextReward(); out.next40 = G.nextReward(40); out.gift42 = G.rewardAt(42); out.gift41 = G.rewardAt(41);
    G.save = fresh({}); G.newBomb(); out.firstGolden = G.S.golden; out.firstOrder = G.newOrder();
    G.save = fresh({ made: 3, recipes: ['0-0', '0-1', '0-2', '1-0', '1-1'] });
    out.orders = [...new Set(Array.from({ length: 200 }, () => { const o = G.newOrder(); return o.mold + '-' + o.color; }))].sort();
    const n = [0, 0, 0, 0]; for (let i = 0; i < 4000; i++) n[G.pickToy().r]++; out.tiers = n;
    const lucky = [0, 0, 0, 0]; for (let i = 0; i < 4000; i++) lucky[G.pickToy(Math.random, 1).r]++; out.lucky = lucky;
    out.goldenMin = Math.min(...Array.from({ length: 300 }, () => G.pickToy(Math.random, 0, 1).r));
    G.save = fresh({ coins: 100 }); G.shopTap(0, 1); out.buy = { coins: G.save.coins, skins: G.save.skins, skin: G.save.skin };
    G.shopTap(1, 0); out.poor = { coins: G.save.coins, skins: G.save.skins, skin: G.save.skin };
    G.shopTap(0, 0); out.back = G.save.skin;
    out.badUnlocks = cfg.unlocks.filter(u => !({ mold: 5, color: 5, top: 5, perk: 2 }[u.kind] > u.i)).length;
    G.save = fresh({}); G.newBomb();
    return out;
  }, ALL);
  assert.deepStrictEqual(r.merge.owned, ['🦆', '🐸']); assert.strictEqual(r.merge.made, 4); assert.strictEqual(r.merge.coins, 30); assert.deepStrictEqual(r.merge.recipes, ['0-0', '1-2']); ok('a late save load merges, never overwrites');
  assert.deepStrictEqual(r.pity, ['💎truefalse'], 'pity gives the one missing toy'); ok('after 3 duplicates the next toy is a missing one');
  assert.strictEqual(r.gold, true); ok('a full album switches to gold toys');
  assert.strictEqual(r.starGolden, true); assert.strictEqual(r.starsLeft, 0); ok('3 stars buy a golden bomb');
  assert.deepStrictEqual(r.until, [3, 0, 5]); ok('locks count the bombs to go');
  assert.strictEqual(r.next5.at, 6); assert.strictEqual(r.next5.from, 5); assert.strictEqual(r.next40.kind, 'coins'); assert.strictEqual(r.next40.at, 42); assert.strictEqual(r.gift42.kind, 'coins'); assert.strictEqual(r.gift41, null); ok('the reward bar always has a next reward, even after the unlocks run out');
  assert.strictEqual(r.firstGolden, false); assert.deepStrictEqual(r.firstOrder, { who: 0, mold: 0, color: 0 }); ok('the first bomb is never golden and its order is the easiest');
  assert.deepStrictEqual(r.orders, ['1-2', '2-0', '2-1', '2-2']); ok('orders ask for open molds and colors, and only for recipes not made yet');
  assert(r.tiers[0] > r.tiers[1] && r.tiers[1] > r.tiers[2] && r.tiers[2] > r.tiers[3], 'rarity order ' + r.tiers);
  assert(r.lucky[0] < r.tiers[0] * 0.75, 'full luck lowers the common share ' + r.lucky); ok('rarity follows the weights, luck shifts it');
  assert(r.goldenMin >= 1); ok('a golden bomb never gives a common toy');
  assert.deepStrictEqual(r.buy, { coins: 40, skins: [0, 1], skin: 1 }); assert.deepStrictEqual(r.poor, { coins: 40, skins: [0, 1], skin: 1 }); assert.strictEqual(r.back, 0); ok('the shop sells a bathtub for coins, refuses when coins are short, and lets an owned one be picked again');
  assert.strictEqual(r.badUnlocks, 0); ok('every unlock in the config points at something real');

  console.log('6. three bombs with golden and double forced on; a missed order still pays the base coins');
  await open('&cfg=' + encodeURIComponent('{"goldenChance":1,"twinChance":1}'));
  await bomb({ colors: [1, 1, 1] }); st = await game(() => window.__game.S.earned); assert.strictEqual(st.met, false); assert.strictEqual(st.coins, 20, '10 base + 10 new recipe, no order bonus'); await again();
  await bomb({ mold: 1, shots: 'b', only: ['4-press', '5-decorate', '6-ready'] }); await again();
  const third = await bomb({ mold: 0, shots: 'c', only: ['7-prize'] });
  assert(third.includes('+'), 'third bomb holds two toys, got ' + third); assert.strictEqual(await data('made'), '3');
  st = await game(() => ({ popCoins: window.__game.S.popCoins, done: window.__game.S.popDone })); assert.strictEqual(st.done, true, 'the third bomb had a bubble round'); assert(st.popCoins >= 2, 'popped bubbles paid coins, got ' + st.popCoins); ok('unlocks, golden, double, bubble round');

  console.log('7. duplicate pays a star; last toy completes the album; then gold');
  await open('&cfg=' + encodeURIComponent('{"goldenChance":0,"twinChance":0}'));
  await p.evaluate(all => { const G = window.__game; G.save = { owned: all.slice(0, 15), gold: [], recipes: [], skins: [0], skin: 0, made: 21, stars: 0, dupes: 3, coins: 0, muted: false, lang: null }; G.newBomb(); }, ALL);
  assert.strictEqual(await bomb({ shots: 'd', only: ['7-prize'] }), 'Diamond');
  assert.strictEqual(await game(() => window.__game.S.note), 'ALBUM COMPLETE! 👑'); await again();
  await bomb({ shots: 'e', only: ['7-prize'] });
  assert.deepStrictEqual(await game(() => ({ gold: window.__game.save.gold.length, isGold: window.__game.S.prizes[0].gold })), { gold: 1, isGold: true });
  await tap(621, 70); await p.waitForTimeout(300); await shot('e8-book-gold'); await tap(625, 1190); await again();
  await p.evaluate(all => { const G = window.__game; G.save.owned = all.slice(0, 8); G.save.gold = []; G.save.dupes = 0; G.save.stars = 0; G.newBomb(); }, ALL);
  let star = false;
  for (let i = 0; i < 6 && !star; i++) { await bomb({ shots: 'f', only: ['7-prize'] }); star = await game(() => window.__game.S.prizes.some(x => !x.isNew)); if (!star) await again(); }
  assert(star, 'a duplicate turned up within six bombs'); assert(await game(() => window.__game.save.stars >= 1)); ok('star, album complete, gold set');

  console.log('8. no assets at all: emoji and synthesized sound');
  await open('&noassets'); await bomb({ shots: 'g', only: ['5-decorate', '7-prize'] }); await again(); ok('fallback path plays through');

  console.log('9. edit mode shows a picture and ignores play input');
  await open('&mode=edit'); for (let i = 0; i < 12; i++) await tap(100 + i * 45, 300 + i * 70, 30);
  assert.strictEqual(await data('step'), '0'); ok('edit mode');

  console.log('10. monkey: 600 random taps and drags');
  await open('&cfg=' + encodeURIComponent('{"fizzSeconds":1.5,"pourSeconds":1}'));
  let seed = 12345; const rand = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648; // fixed seed: the same run every time
  let made = 0;
  for (let i = 0; i < 600; i++) {
    await p.mouse.move(X(20 + rand() * 680), Y(20 + rand() * 1240)); await p.mouse.down();
    if (rand() < 0.5) for (let k = 0; k < 6; k++) await p.mouse.move(X(20 + rand() * 680), Y(200 + rand() * 1000));
    if (rand() < 0.3) await p.waitForTimeout(250);
    await p.mouse.up();
    if (i % 50 === 49) {
      const m = await game(() => { const G = window.__game; return { step: G.S.step, made: G.save.made, parts: G.S.P.length, prog: G.S.prog, tops: G.S.tops.length, coins: G.save.coins }; });
      assert(m.step >= 0 && m.step <= 5 && m.made >= made && m.parts <= 600 && m.prog >= 0 && m.prog <= 1.2 && m.tops <= 60 && m.coins >= 0, 'bad state ' + JSON.stringify(m));
      made = m.made;
    }
  }
  console.log('  bombs finished by the monkey:', made); ok('no errors, state stays valid');

  console.log('11. device language is detected; seven languages; anything else falls back to English');
  const want = { 'en-US': 'en', 'ar-SA': 'ar', 'es-MX': 'es', 'vi-VN': 'vi', 'hi-IN': 'hi', 'bn-BD': 'bn', 'id-ID': 'id', 'de-DE': 'en', 'pt-BR': 'en', 'ja-JP': 'en' };
  for (const [locale, code] of Object.entries(want)) {
    const cx = await b.newContext({ ...devices['Pixel 7'], deviceScaleFactor: 1, locale }), q = await cx.newPage();
    q.on('pageerror', e => errs.push(locale + ': ' + e.message));
    await q.goto(url()); await q.waitForFunction(() => document.getElementById('game').dataset.step === '0');
    const d = await q.evaluate(() => ({ ...document.getElementById('game').dataset }));
    assert.strictEqual(d.lang, code, locale + ' should show ' + code); assert.strictEqual(d.rtl, code === 'ar' ? '1' : '0', locale + ' text direction');
    await cx.close();
  }
  ok('seven languages detected, three unsupported locales fall back to English, Arabic is right-to-left');
  await open();
  st = await game(() => { const s = window.gameConfig.strings, en = Object.keys(s.en); return { langs: Object.keys(s), gaps: Object.entries(s).flatMap(([l, v]) => en.filter(k => !v[k] || !String(v[k]).trim()).map(k => l + '.' + k)), extra: Object.entries(s).flatMap(([l, v]) => Object.keys(v).filter(k => !en.includes(k)).map(k => l + '.' + k)) }; });
  assert.deepStrictEqual(st.langs, ['en', 'ar', 'es', 'vi', 'hi', 'bn', 'id']); assert.deepStrictEqual(st.gaps, []); assert.deepStrictEqual(st.extra, []); ok('every language has every string');
  await tap(621, 70); await tap(250, 1190); assert.strictEqual(await data('lang'), 'ar'); assert.strictEqual(await game(() => window.__game.save.lang), 'ar');
  await tap(95, 1190); assert.strictEqual(await game(() => window.__game.S.book), null, 'mirrored close button closes the book');
  await tap(99, 70); assert.strictEqual(await game(() => window.__game.S.book), 'toys', 'mirrored book chip opens the book');
  for (let i = 0; i < 6; i++) await tap(470, 1190); assert.strictEqual(await data('lang'), 'en'); await tap(625, 1190); ok('language button cycles and is saved; mirrored HUD works');

  console.log('12. layout: no two elements overlap and nothing leaves the screen, on every screen in every language');
  // Each state is set directly, a toast is shown where the screen can have one, and the boxes the game recorded are compared pairwise.
  const states = {
    pour: () => { const G = window.__game; G.S.step = 0; G.toast(G.T('keepPouring')); },
    colors: () => { const G = window.__game; G.S.step = 1; G.toast(G.T('bowlFull')); },
    'colors done': () => { const G = window.__game; G.S.step = 1; G.S.col = 0; G.S.cols = [0]; G.S.drops = 3; G.S.ok = true; G.toast(G.T('d1')); },
    stir: () => { const G = window.__game; G.S.step = 2; G.S.col = 0; G.S.cols = [0]; G.toast(G.T('keepStirring')); },
    press: () => { const G = window.__game; G.S.step = 3; G.S.col = 0; G.S.cols = [0]; G.toast(G.T('goldenBomb')); },
    decorate: () => { const G = window.__game; G.S.step = 4; G.S.col = 0; G.S.cols = [0, 2]; G.S.mold = 2; G.toast(G.T('maxLuck')); },
    'decorate done': () => { const G = window.__game; G.S.step = 4; G.S.col = 0; G.S.cols = [0, 2]; G.S.mold = 4; for (let i = 0; i < 15; i++) G.S.tops.push({ i: i % 3, dx: (i % 5 - 2) * 0.25, dy: ((i / 5 | 0) - 1) * 0.3, rot: 0, pop: 0 }); G.S.ok = true; G.toast(G.T('d4')); },
    bath: () => { const G = window.__game; G.S.step = 5; G.S.col = 0; G.S.cols = [0]; G.toast('🔒 12'); },
    prize: () => { const G = window.__game; G.save.made = 1; G.save.owned = ['🦆']; G.S.step = 5; G.S.prizes = [{ toy: { e: '🦆', n: 'Ducky', r: 0, id: 'toy_ducky' }, gold: false, isNew: true }]; G.S.earned = { coins: 40, met: true, newRecipe: true }; G.S.unlock = { kind: 'mold', i: 1 }; G.S.note = '🔓'; G.S.reveal = 5; },
    'prize double': () => { const G = window.__game; G.save.made = 9; G.save.stars = 2; G.save.owned = ['🦆', '💎']; G.S.step = 5; G.S.prizes = [{ toy: { e: '🦆', n: 'Ducky', r: 0, id: 'toy_ducky' }, gold: false, isNew: false }, { toy: { e: '💎', n: 'Diamond', r: 3, id: 'toy_diamond' }, gold: false, isNew: true }]; G.S.earned = { coins: 80, met: false, newRecipe: false }; G.S.unlock = null; G.S.note = G.T('nextGolden'); G.S.reveal = 5; },
    'prize gold': () => { const G = window.__game; G.save.made = 30; G.save.stars = 1; G.save.owned = ['🦆', '🐸', '🐟', '🐢', '🐙', '🦀', '🐳', '🐥', '🦄', '🐬', '🦈', '🧸', '🦋', '🐉', '👑', '💎']; G.save.gold = ['💎']; G.S.step = 5; G.S.prizes = [{ toy: { e: '💎', n: 'Diamond', r: 3, id: 'toy_diamond' }, gold: true, isNew: true }]; G.S.earned = { coins: 70, met: true, newRecipe: false }; G.S.unlock = { kind: 'coins' }; G.S.note = G.T('albumDone') + ' 👑'; G.S.reveal = 5; },
    bubbles: () => { const G = window.__game; G.S.step = 5; G.S.col = 0; G.S.cols = [0]; G.S.ball.wet = true; G.S.fizz = 1; G.S.pop = { t: 6, next: 9, list: [{ x: 200, y: 600, vy: 0, w: 0 }, { x: 500, y: 760, vy: 0, w: 1 }] }; G.save.owned = ['🦆', '🐸', '🐟', '🐢']; G.toast('+12', '#c97a00'); },
    'book shop': () => { const G = window.__game; G.save.coins = 12345; G.save.skins = [0, 1]; G.save.skin = 1; G.S.book = 'shop'; },
    'book toys': () => { const G = window.__game; G.openBook('toys'); },
    'book recipes': () => { const G = window.__game; G.save.recipes = ['0-0', '1-2']; G.S.book = 'recipes'; },
  };
  let checked = 0;
  for (const code of ['en', 'ar', 'es', 'vi', 'hi', 'bn', 'id']) {
    for (const [name, set] of Object.entries(states)) {
      await open();
      await p.evaluate(l => {
        const G = window.__game;
        window.lib.getTopNEntriesFromLeaderboard = async () => ({ entries: [{ username: 'LongCollectorName99', score: 32 }, { username: 'kid_two', score: 20 }, { username: 'x', score: 3 }] });
        G.setLang(l); G.save.made = 3; G.newBomb();
      }, code);
      await p.evaluate(set); await p.waitForTimeout(260);
      const boxes = await game(() => window.__boxes);
      const bad = [];
      for (const a of boxes) if (a.x < -2 || a.y < -2 || a.x + a.w > 722 || a.y + a.h > 1282) bad.push(`${a.n} leaves the screen ${JSON.stringify(a)}`);
      for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i], z = boxes[j], ox = Math.min(a.x + a.w, z.x + z.w) - Math.max(a.x, z.x), oy = Math.min(a.y + a.h, z.y + z.h) - Math.max(a.y, z.y);
        if (ox > 2 && oy > 2) bad.push(`"${a.n}" overlaps "${z.n}" by ${ox}x${oy}`);
      }
      if (shots && (code === 'en' || ['pour', 'decorate done', 'prize', 'book recipes'].includes(name))) await p.screenshot({ path: path.join(shots, `layout-${code}-${name.replace(/ /g, '-')}.jpg`), type: 'jpeg', quality: 60 });
      assert.deepStrictEqual(bad, [], `${code} / ${name}`);
      assert(boxes.length >= 5, `${code} / ${name}: only ${boxes.length} boxes recorded`);
      checked++;
    }
  }
  ok(`${checked} screens checked (15 screens x 7 languages)`);

  console.log('11. device language is detected; seven languages; anything else falls back to English');
  const want = { 'en-US': 'en', 'ar-SA': 'ar', 'es-MX': 'es', 'vi-VN': 'vi', 'hi-IN': 'hi', 'bn-BD': 'bn', 'id-ID': 'id', 'de-DE': 'en', 'pt-BR': 'en', 'ja-JP': 'en' };
  for (const [locale, code] of Object.entries(want)) {
    const cx = await b.newContext({ ...devices['Pixel 7'], deviceScaleFactor: 1, locale }), q = await cx.newPage();
    q.on('pageerror', e => errs.push(locale + ': ' + e.message));
    await q.goto(`http://localhost:${srv.address().port}/index.html?local`);
    await q.waitForFunction(() => document.getElementById('game').dataset.step === '0');
    const d = await q.evaluate(() => ({ ...document.getElementById('game').dataset }));
    assert.strictEqual(d.lang, code, locale + ' should show ' + code);
    assert.strictEqual(d.rtl, code === 'ar' ? '1' : '0', locale + ' text direction');
    if (shots && locale.startsWith(code)) {
      const snap = async n => { await q.waitForTimeout(700); await q.screenshot({ path: path.join(shots, `lang-${code}-${n}.jpg`), type: 'jpeg', quality: 70 }); };
      await snap('1-pour');
      await q.evaluate(() => { const G = window.__game; G.S.step = 1; G.S.idle = 0; }); await snap('2-colors');
      await q.evaluate(() => { const G = window.__game; G.S.step = 4; G.S.col = [255, 92, 168]; G.S.cols = [[255, 92, 168], [64, 190, 255]]; for (let i = 0; i < 15; i++) G.S.tops.push({ i: i % 3, dx: (i % 5 - 2) * 0.25, dy: ((i / 5 | 0) - 1) * 0.3, rot: 0, pop: 0 }); G.S.ok = true; G.S.idle = 0; }); await snap('3-decorate');
      await q.evaluate(() => { const G = window.__game; G.S.step = 5; G.S.ok = false; G.S.ball.loose = true; });
      await q.waitForFunction(() => document.getElementById('game').dataset.toy !== '', null, { timeout: 9000 }); await q.waitForTimeout(1500); await snap('4-prize');
      await q.evaluate(() => { window.__game.S.album = true; }); await snap('5-album');
    }
    await cx.close();
  }
  ok('seven languages detected, three unsupported locales fall back to English, Arabic is right-to-left');
  await open();
  const st = await p.evaluate(() => { const s = window.gameConfig.strings, en = Object.keys(s.en); return { langs: Object.keys(s), gaps: Object.entries(s).flatMap(([l, v]) => en.filter(k => !v[k] || !String(v[k]).trim()).map(k => l + '.' + k)), extra: Object.entries(s).flatMap(([l, v]) => Object.keys(v).filter(k => !en.includes(k)).map(k => l + '.' + k)) }; });
  assert.deepStrictEqual(st.langs, ['en', 'ar', 'es', 'vi', 'hi', 'bn', 'id']); assert.deepStrictEqual(st.gaps, []); assert.deepStrictEqual(st.extra, []); ok('every language has every string');
  await tap(630, 70); await tap(360, 1100); assert.strictEqual(await data('lang'), 'ar'); assert.strictEqual(await p.evaluate(() => window.__game.save.lang), 'ar');
  await tap(97, 500); await tap(97, 70); await p.waitForTimeout(200); assert.strictEqual(await p.evaluate(() => window.__game.S.album), true, 'mirrored album chip opens the album');
  for (let i = 0; i < 6; i++) await tap(360, 1100); assert.strictEqual(await data('lang'), 'en'); await tap(360, 500); ok('language button cycles and is saved; mirrored HUD works');

  assert.deepStrictEqual(errs, [], 'page errors');
  console.log('PLAYTEST PASS');
  await b.close(); srv.close();
})().catch(e => { console.error('PLAYTEST FAIL', e.message); process.exit(1); });
