// PROTOTYPE - NOT FOR PRODUCTION
// A new player's first minutes on a phone, one screen per step: the demo, the first tap, each coach step (walk, look,
// smash, bomb), a found star flying to its slot, the result card counting up, and the next level's card after NEXT.
// Prints what each step showed; screens go to the out folder. Usage: node journey.js <out folder> [lang]
const fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const { serve, open, GPU } = require('./playtest.js');
const out = process.argv[2], lang = process.argv[3] || 'en';
if (!out) { console.error('usage: node journey.js <out folder> [lang]'); process.exit(1); }
fs.mkdirSync(out, { recursive: true });
const fails = []; const check = (ok, msg) => { console.log((ok ? 'ok   ' : 'FAIL ') + msg); if (!ok) fails.push(msg); };
(async () => {
  const server = serve(), browser = await chromium.launch({ args: GPU });
  // a host that can share (Astrocade has lib.share): the result card shows its ✈️ button
  // the host's vibration and leaderboard are counted (celebrations use both)
  const { page, errors } = await open(browser, '', { port: server.address().port, locale: lang, dpr: 2, touch: true, init: 'window.__share = true; window.__buzz = []; window.__board = [];' });
  await page.waitForFunction(() => window.lib && window.__game, null, { timeout: 20000 });
  await page.evaluate(() => { lib.haptics.play = (k) => window.__buzz.push(k); const a = lib.addPlayerScoreToLeaderboard; lib.addPlayerScoreToLeaderboard = (n) => { window.__board.push(n); return a(n); }; });
  const g = (fn, a) => page.evaluate(fn, a), shot = (n) => page.screenshot({ path: path.join(out, `${lang}-j${n}.jpg`), type: 'jpeg', quality: 82 });
  // the coach's label (and the level card) must sit inside the frame, clear of the stick / HIT row (top 934)
  const coach = () => g(() => { const c = document.getElementById('coach'); if (c.hidden) return null; const a = document.getElementById('app').getBoundingClientRect(), r = c.querySelector('.clabel').getBoundingClientRect(), k = 720 / a.width; return { cls: c.className, text: c.querySelector('.clabel').textContent, inside: r.left >= a.left - 1 && r.right <= a.right + 1 && (r.bottom - a.top) * k <= 934 }; });
  const until = (fn, ms = 6000) => page.waitForFunction(fn, null, { timeout: ms, polling: 50 }).then(() => true, () => false);
  const touch = (id, type, x, y) => g(([id, type, x, y]) => { const c = __game.client(x, y); (type === 'pointerdown' ? document.getElementById('app') : window).dispatchEvent(new PointerEvent(type, { pointerId: id, pointerType: 'touch', clientX: c[0], clientY: c[1], bubbles: true })); }, [id, type, x, y]);
  // the feed preview (before any touch): the first rocket sends the front-yard robot flying within 2.5 s
  const preview = await until(() => __game.demo && __game.W.t < 2.5 && __game.W.bots[0] && __game.W.bots[0].state === 'down', 4000);
  check(preview, 'feed preview: a robot flies in the first 2.5 s, before any touch');
  await page.waitForTimeout(300); await shot('01-demo');
  // the first tap anywhere: the real level starts with its card and the TNT ahead blows up
  await touch(1, 'pointerdown', 360, 420); await touch(1, 'pointerup', 360, 420);
  await page.waitForTimeout(450);
  const card = await g(() => { const e = document.getElementById('lvcard'), a = document.getElementById('app').getBoundingClientRect(); return !e.hidden && [...e.children].every((x) => { const r = x.getBoundingClientRect(); return r.left >= a.left - 1 && r.right <= a.right + 1; }) && e.textContent; });
  await shot('02-first-tap');
  check(!!card, `first level: the level card shows (${card})`);
  // the first boom also sends the robot strolling in the front yard flying (BONK!)
  const hook = await until(() => __game.W.bots[0] && __game.W.bots[0].state === 'down', 3000);
  check(hook, 'the first tap: the TNT boom knocks the front-yard robot flying');
  // the first wave: robots marching in, about half with a dare sign in this language, wearing the wave's costume
  const wave = await g((l) => { const W = __game.W, list = window.gameConfig.signs[l], w1 = W.bots.filter((b) => b.wave === 1);
    const signs = w1.filter((b) => b.sign >= 0).map((b) => __game.scene.signOf(b.id)).filter(Boolean);
    return { n: w1.length, marching: w1.filter((b) => b.state === 'march').length, signs: signs.length, inLang: signs.every((x) => x.text === list[x.k]), costumes: w1.filter((b) => b.costume === 0).length, drawn: __game.scene.botsDrawn, sample: signs[0] && signs[0].text }; }, lang);
  check(wave.n >= 13 && wave.marching >= 9 && wave.signs >= 4 && wave.inLang && wave.costumes >= 3 && wave.drawn >= wave.n, `wave 1: ${wave.n} robots (${wave.marching} marching, ${wave.drawn} drawn), ${wave.signs} signs in ${lang} ("${wave.sample}"), ${wave.costumes} party hats`);
  // the HIT button names the hammer's verb and pulses while ready
  const hit = await g(() => { const b = document.getElementById('hit'), l = b.querySelector('.hl'); return { t: l.textContent, ready: b.classList.contains('ready'), fits: l.scrollWidth <= l.clientWidth + 1 && l.getBoundingClientRect().width <= b.getBoundingClientRect().width, anim: getComputedStyle(b).animationName }; });
  check(hit.t === await g(() => __game.T('vHammer')) && hit.ready && hit.fits && /hbright/.test(hit.anim), `HIT says "${hit.t}", fits its button and pulses (${hit.anim})`);
  // the coach: walk
  await until(() => !document.getElementById('coach').hidden); const c1 = await coach(); await shot('03-coach-walk');
  check(c1 && /drag/.test(c1.cls) && c1.inside, `coach 1: walk, spotlight on the stick (${c1 && c1.text})`);
  await touch(2, 'pointerdown', 111, 1029); for (let i = 1; i <= 6; i++) await touch(2, 'pointermove', 111, 1029 - i * 12);
  // keep walking until the lesson is learned (slow machines walk fewer blocks per second)
  const walked = await until(() => __game.save.learned.walk); await touch(2, 'pointerup', 111, 960);
  await until(() => /swipe/.test(document.getElementById('coach').className)); await shot('04-cheer');
  const c2 = await coach(); check(walked, 'walking with the stick completes the walk lesson');
  check(c2 && /swipe/.test(c2.cls) && c2.inside, `coach 2: look after walking (${c2 && c2.text})`);
  await page.waitForTimeout(500); await shot('05-coach-look');
  await touch(3, 'pointerdown', 520, 560); for (let i = 1; i <= 8; i++) await touch(3, 'pointermove', 520 - i * 10, 560); await touch(3, 'pointerup', 440, 560);
  check(await until(() => __game.save.learned.drag, 2000), 'a swipe completes the look lesson');
  // the coach: smash, once a block in reach sits under the crosshair
  await g(() => { const W = __game.W; W.hero.x = W.box.x0 + 4.5; W.hero.z = W.box.z1 + 2.2; __game.scene.look(-__game.scene.yaw, -__game.scene.pitch - 0.25); });
  await until(() => /press/.test(document.getElementById('coach').className)); const c3 = await coach(); await shot('06-coach-hit');
  check(c3 && /press/.test(c3.cls) && c3.inside, `coach 3: smash with the HIT button (${c3 && c3.text})`);
  // a new language redraws the label on screen
  const other = lang === 'es' ? 'id' : 'es';
  const relabel = await g((o) => { const a = document.querySelector('#coach .clabel').textContent; __game.setLang(o); const b = document.querySelector('#coach .clabel').textContent; return [a, b]; }, other);
  await g((l) => __game.setLang(l), lang);
  check(relabel[0] !== relabel[1], `the coach label follows a language change (${relabel.join(' → ')})`);
  // a long label wraps across the full room (up to 600 units, two lines), not into the half frame left of centre
  const wrapT = await g(() => { const el = document.querySelector('#coach .clabel'), k = 720 / document.getElementById('app').getBoundingClientRect().width, old = el.textContent;
    el.textContent = 'SMASH THE BIG WALL AND FIND THE STARS'; __game.fitText(el, 600, 44, 2);
    const cs = getComputedStyle(el), lh = parseFloat(cs.lineHeight), r = { w: Math.round(el.offsetWidth * k), rows: Math.round((el.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom)) / lh), fs: +(parseFloat(cs.fontSize) * k).toFixed(1) };
    el.textContent = old; __game.fitText(el, 600, 44, 2); return r; });
  check(wrapT.w >= 480 && wrapT.w <= 601 && wrapT.rows <= 2 && wrapT.fs >= 30.7, `a long label wraps wide: ${JSON.stringify(wrapT)}`);
  // smashing by holding a finger on the block in reach also completes the lesson
  const cross = await g(() => { const a = document.getElementById('app').getBoundingClientRect(), r = document.getElementById('cross').getBoundingClientRect(), k = 720 / a.width; return [(r.left - a.left + r.width / 2) * k, (r.top - a.top + r.height / 2) * k]; });
  await touch(4, 'pointerdown', cross[0], cross[1]); const held = await until(() => __game.save.learned.hit, 2500); await touch(4, 'pointerup', cross[0], cross[1]);
  check(held, 'holding a finger on the block in reach completes the smash lesson');
  await until(() => document.getElementById('coach').hidden, 2000);
  const c4 = await coach(); check(!c4, 'after smashing: no coach left on screen');
  // a tap on a robot in reach: the hammer knocks it flying, BONK!, coins
  const bonk = await g(() => { const W = __game.W, i = W.bots.findIndex((b) => b.state === 'walk' || b.state === 'march'); if (i < 0) return null; const b = W.bots[i]; b.goal = [b.x, b.z]; W.hero.x = b.x; W.hero.z = b.z + 2.2; __game.scene.look(-__game.scene.yaw, -__game.scene.pitch - 0.2); return { i, c0: __game.save.coins }; });
  await page.waitForTimeout(300);
  if (bonk) {
    const pt = await g((i) => { const b = __game.W.bots[i], p = __game.scene.screenOf(b.x, 1.0, b.z); return p; }, bonk.i);
    await touch(7, 'pointerdown', pt[0], pt[1]); await touch(7, 'pointerup', pt[0], pt[1]);
    const flew = await until(() => __game.W.bots.some((b) => b.state === 'down'), 1500);
    await page.waitForTimeout(150); await shot('06b-bonk');
    const c1 = await g(() => __game.save.coins);
    check(flew && c1 > bonk.c0, `a tap on a robot in reach knocks it flying and pays (${bonk.c0} → ${c1})`);
  } else check(false, 'a walking robot to tap');
  // the robot's face: X or dizzy eyes while it flies, a happy smile when it gets up, BEEP!
  await g(() => { const W = __game.W, i = W.bots.findIndex((b) => b.state === 'march' || b.state === 'walk'); if (i < 0) return; const b = W.bots[i]; W.hero.x = b.x; W.hero.z = b.z + 1.5; __game.WD.swingBot(W, i); window.__faceId = b.id; });
  await until(() => { const b = __game.W.bots.find((x) => x.id === window.__faceId); return b && b.state === 'down'; }, 2000); await page.waitForTimeout(150);
  const faces = await g(() => { const b = __game.W.bots.find((x) => x.id === window.__faceId); return b ? { id: b.id, fk: __game.scene.faceOf(b.id) } : null; });
  const up = faces && await until(`(() => { const b = __game.W.bots.find((x) => x.id === ${faces.id}); return b && (b.state === 'reboot' || b.state === 'leave') && __game.scene.faceOf(b.id) >= 15; })()`, 9000);
  const beep = await g(() => [...document.querySelectorAll('#pops .pop')].some((p) => p.textContent === __game.T('beep')));
  check(faces && faces.fk >= 5 && faces.fk < 15 && up, `a knocked robot's face: dizzy (${faces && faces.fk}), then a smile on getting up (${up ? 'yes' : 'no'}), BEEP! ${beep ? 'shown' : 'gone already'}`);
  await shot('06c-reboot');
  // the bomb: the HIT button says BOOM; after a throw it dims while the bomb cools down
  const boom = await g(() => { __game.pickTool('bomb'); const l = document.querySelector('#hit .hl').textContent; return { l, want: __game.T('vBomb') }; });
  await page.waitForTimeout(100); await touch(9, 'pointerdown', 360, 560); await touch(9, 'pointerup', 360, 560);
  const dim = await until(() => __game.hitState === 'cool' || (__game.sel === 'hammer' && document.querySelector('#hit .hl').textContent === __game.T('vHammer')), 1500);
  check(boom.l === boom.want && dim, `HIT says "${boom.l}" with the bomb; after the throw it dims or goes back to the hammer`);
  // (the bomb lesson stays for the coach step below)
  await g(() => { __game.save.learned.bomb = false; });
  // something to buy: the red "!" (38 units) on the coins, gone when nothing is affordable
  const dot = await g(() => { const L = window.gameConfig, s = __game.save; s.coins = 0; __game.newLevel(__game.W.n); const off = document.getElementById('dot').hidden; s.coins = 200000; __game.newLevel(__game.W.n); const d = document.getElementById('dot'), a = document.getElementById('app').getBoundingClientRect(), r = d.getBoundingClientRect(), k = 720 / a.width; return { off, on: !d.hidden, size: Math.round(r.width * k), inside: r.right <= a.right + 1 && r.top >= a.top - 1 }; });
  await page.waitForTimeout(200); await shot('06d-dot');
  check(dot.off && dot.on && Math.abs(dot.size - 38) <= 2 && dot.inside, `the red "!" on the coins: hidden with 0 coins, shown when something is affordable (${dot.size} units, inside the frame)`);
  // the next wave: WAVE 2 ARRIVING! at eye level for a few seconds, the old robots leave
  await g(() => { __game.W.wave.t = window.gameConfig.waves.every - 0.05; });
  const wb = await until(() => !document.getElementById('wavebn').hidden, 2000);
  const wtxt = await g(() => document.getElementById('wavebn').textContent); await page.waitForTimeout(500); await shot('06e-wave');
  const gone = await until(() => document.getElementById('wavebn').hidden, 5000);
  check(wb && wtxt === await g(() => __game.T('wave', 2)) && gone && await g(() => __game.W.wave.n === 2), `"${wtxt}" shows, then goes after ~${await g(() => window.gameConfig.waves.banner)} s`);
  // a cleared wave: coins, fanfare words, confetti, a buzz and the leaderboard
  const c0w = await g(() => { window.__buzz.length = 0; window.__board.length = 0; return __game.save.coins; });
  await g(() => { const W = __game.W; for (const b of W.bots.filter((x) => x.wave === 2)) { b.goal = null; } __game.onEvent({ type: 'waveClear', n: 2, coins: 400 }); });
  // (celebrations queue one after another: wait for this one's words, not a fixed time)
  const conf = await until(() => [...document.querySelectorAll('#pops .pop')].some((p) => p.textContent === __game.T('waveClear')) && !document.getElementById('confetti').hidden && document.querySelectorAll('#confetti i.go').length > 10, 6000);
  await shot('06f-celebrate');
  const cel = await g(() => ({ c: __game.save.coins, buzz: window.__buzz.includes('success'), board: window.__board.length, last: __game.lastCelebration, words: [...document.querySelectorAll('#pops .pop')].map((p) => p.textContent) }));
  check(conf && cel.c === c0w + 400 && cel.buzz && cel.last === 'wave' && cel.words.includes(await g(() => __game.T('waveClear'))), `a cleared wave: +400 coins, "${cel.words.join(' / ')}", confetti, buzz, leaderboard ${cel.board}`);
  // a record needs a margin over the old one; a celebration still queued when the level changes is dropped
  const rec = await g(() => { const s = __game.save, fall = { id: -1, cells: [] }, land = (n) => __game.onEvent({ type: 'land', fall, n, coins: 0, x: __game.W.hero.x, y: 1, z: __game.W.hero.z - 6 }); s.bestBlast = 100; land(110); const a = s.bestBlast; land(130); return [a, s.bestBlast]; });
  check(rec[0] === 100 && rec[1] === 130, `a new record needs ${await g(() => window.gameConfig.celebrate.recordMargin)}× the old (100: 110 no, 130 yes → ${rec.join(', ')})`);
  await page.waitForTimeout(1500);
  const dropq = await g(async () => { __game.celebrate('A', 'qa'); __game.celebrate('B', 'qb'); __game.newLevel(__game.W.n); await new Promise((r) => setTimeout(r, 2200)); return __game.lastCelebration; });
  check(dropq !== 'qb', `a celebration queued behind another is dropped when the level changes (last: ${dropq})`);
  // a full sign pool never repaints a sign a robot already holds
  const pool = await g(async () => { const W = __game.W, base = W.bots[1], sc = __game.scene; const extra = [];
    for (let k = 0; k < 24; k++) extra.push({ ...base, id: 5000 + k, sign: k, pts: null, x: base.x + (k % 6) * 0.3, z: base.z + Math.floor(k / 6) * 0.3, state: 'march', near: false });
    W.bots.push(...extra.slice(0, 20)); sc.update(W, 0.016); const before = extra.slice(0, 20).map((b) => sc.signOf(b.id).text);
    W.bots.push(...extra.slice(20)); sc.update(W, 0.016); const after = extra.slice(0, 20).map((b) => sc.signOf(b.id).text);
    const n = sc.signCount; W.bots.splice(W.bots.length - 24, 24); sc.update(W, 0.016); return { same: before.every((t, i) => t === after[i]), n }; });
  check(pool.same && pool.n <= 18, `a full sign pool (${pool.n} cards) shares a card as it is, never repainting one already held`);
  // hit-stop: a meteor stops the world longer than the hammer, at the configured slow-down
  await until(() => __game.stopT <= 0, 2000);
  const hs = await g(() => { __game.onEvent({ type: 'hit', n: 3, x: 0, y: 0, z: 0 }); const a = __game.stopT; __game.onEvent({ type: 'boom', kind: 'meteor', r: 5, x: __game.W.hero.x, y: 1, z: __game.W.hero.z - 30 }); return [a, __game.stopT]; });
  check(Math.abs(hs[0] - 0.04) < 0.005 && Math.abs(hs[1] - 0.09) < 0.005, `hit-stop: hammer ${hs[0]} s, meteor ${hs[1]} s`);
  // shake fades with distance: a blast 40 m away does not shake, one close by does
  const sk = await g(() => { const sc = __game.scene, W = __game.W; for (let i = 0; i < 60; i++) sc.update(W, 0.05); sc.event({ type: 'clang', x: W.hero.x + 40, y: 1, z: W.hero.z }); const far = sc.trauma; sc.event({ type: 'clang', x: W.hero.x + 1, y: 1, z: W.hero.z }); return [far, sc.trauma]; });
  check(sk[0] < 0.001 && sk[1] > 0.03, `shake fades with distance (40 m: ${sk[0].toFixed(3)}, 1 m: ${sk[1].toFixed(3)})`);
  // steel: the bomb coach
  await g(() => { const W = __game.W; __game.onEvent({ type: 'tooHard', x: W.chest.x, y: 1, z: W.chest.z + 2 }); });
  await page.waitForTimeout(400); const c5 = await coach(); await shot('07-coach-bomb');
  check(c5 && /press/.test(c5.cls) && c5.inside, `coach 4: TOO HARD shows the bomb (${c5 && c5.text})`);
  // a star found flies to its slot
  // two stars found in one step: each flies to its own slot and lands there
  const flying = await g(() => { const W = __game.W; W.got += 2; for (const c of W.starCells.slice(0, 2)) { __game.onEvent({ type: 'star', x: c.x + 0.5, y: c.y + 0.5, z: c.z + 0.5 }); } return document.querySelectorAll('#flies .fly').length; });
  await page.waitForTimeout(200); await shot('08-star-fly');
  await page.waitForTimeout(600);
  const landed = await g(() => [...document.querySelectorAll('#stars img')].map((i) => i.classList.contains('land')));
  check(flying >= 2 && landed[0] && landed[1], `two found stars fly to two slots (${flying} in flight, landed ${landed})`);
  // the result card counts its coins up, then NEXT shows the next level's card under a white flash
  await page.waitForTimeout(800);
  await g(() => { const W = __game.W; W.got = 3; W.phase = 'free'; W.coins = 1200; __game.onEvent({ type: 'clear' }); });
  await page.waitForTimeout(700); const mid = await g(() => document.querySelector('#panel .cnt').textContent); await shot('09-result-counting');
  await page.waitForTimeout(900); const end = await g(() => document.querySelector('#panel .cnt').textContent); await shot('10-result');
  check(mid !== end, `result coins count up (${mid} → ${end})`);
  // the brag line has a number and goes out with the share
  const brag = await g(() => document.querySelector('#panel .brag').textContent);
  check(/\d/.test(brag), `the result card brags with a number: "${brag}"`);
  // the ✈️ button says what it does and shares when tapped
  const sh = await g(() => { const b = document.getElementById('shareBtn'); if (!b) return null; const t = b.textContent; b.click(); return t; });
  await page.waitForTimeout(100);
  const shared = await g(() => (window.__shared || []).length);
  const stext = await g(() => (window.__shared || [])[0] && window.__shared[0].text);
  check(!!sh && sh.trim().length > 3 && shared === 1 && stext && stext.includes(brag), `share button has its words and shares the brag (${sh}: "${stext}")`);
  await g(() => document.querySelector('#nextBtn').click());
  await page.waitForTimeout(120); await shot('11-next-flash');
  await page.waitForTimeout(500); await shot('12-next-card');
  const card2 = await g(() => document.getElementById('lvcard').textContent);
  check(/2/.test(card2), `NEXT: level 2's card (${card2})`);
  // the same daily level opened again (it was the last card shown) still shows its card
  const daily = await g(() => { __game.newLevel(33, { daily: true }); const e = document.getElementById('lvcard'); e.hidden = true; __game.newLevel(33, { daily: true }); return !e.hidden && { text: e.textContent, tag: !!e.querySelector('.lvtag.d svg.ico'), words: e.querySelector('.lvtag.d .tx').textContent === __game.T('dailyGo') }; });
  check(daily && daily.tag && daily.words, `the daily challenge has its card with the DAILY tag: calendar icon + words (${daily && daily.text})`);
  // an old save with trophies for levels 2, 18 and 100: kept per building kind (8 entries at most, never growing)
  {
    const { page: p2 } = await open(browser, '', { port: server.address().port, init: 'window.__preset = { v: 1, level: 101, best: { 1: 1, 17: 2, 99: 1 } };' });
    await p2.waitForFunction(() => window.__game && __game.saveLoaded, null, { timeout: 15000 });
    const best = await p2.evaluate(() => ({ ...__game.save.best }));
    check(Object.keys(best).every((k) => +k >= 0 && +k < 8) && best[1] === 2 && best[3] === 1, `saved trophies stay per building kind: ${JSON.stringify(best)}`);
    await p2.close();
  }
  // a save from the 5-level shop: its levels still count (hammer 5, bomb 3), the shop shows them, junk is dropped
  {
    const { page: p3 } = await open(browser, '', { port: server.address().port, locale: lang, init: 'window.__preset = { v: 1, level: 2, coins: 100, owned: ["hammer", "bomb"], lv: { hammer: 5, bomb: 3, laser: 9, rocket: "x" } };' });
    await p3.waitForFunction(() => window.__game && __game.saveLoaded, null, { timeout: 15000 });
    const m = await p3.evaluate(() => { const c = window.gameConfig, ham = c.tools[0], W = __game.W, t = W.cfg.tools.find((x) => x.id === 'hammer'); __game.newLevel(W.n); document.querySelector('#coins').click(); const row = document.querySelector('[data-buy=hammer]').closest('.srow'); return { lv: { ...__game.save.lv }, r: __game.W.cfg.tools[0].r, r1: ham.r, label: row.querySelector('.slv b').textContent, price: row.querySelector('[data-buy]').textContent.replace(/\D/g, '') }; });
    const want = await p3.evaluate(() => __game.T('lv', 5));
    check(m.lv.hammer === 5 && m.lv.bomb === 3 && !('laser' in m.lv) && m.r > m.r1 && m.label === want, `an old save keeps its upgrade levels (${JSON.stringify(m.lv)}), the hammer is bigger (r ${m.r1} → ${m.r}), the shop says "${m.label}", next price ${m.price}`);
    await p3.close();
  }
  check(errors.length === 0, 'no page errors: ' + (errors.join(' | ') || 'none'));
  await browser.close(); server.close();
  console.log(fails.length ? `\n${fails.length} FAILED` : '\nall passed'); process.exit(fails.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
