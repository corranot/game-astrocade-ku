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
  const { page, errors } = await open(browser, '', { port: server.address().port, locale: lang, dpr: 2, touch: true });
  const g = (fn, a) => page.evaluate(fn, a), shot = (n) => page.screenshot({ path: path.join(out, `${lang}-j${n}.jpg`), type: 'jpeg', quality: 82 });
  // the coach's label (and the level card) must sit inside the frame, clear of the stick / HIT row (top 934)
  const coach = () => g(() => { const c = document.getElementById('coach'); if (c.hidden) return null; const a = document.getElementById('app').getBoundingClientRect(), r = c.querySelector('.clabel').getBoundingClientRect(), k = 720 / a.width; return { cls: c.className, text: c.querySelector('.clabel').textContent, inside: r.left >= a.left - 1 && r.right <= a.right + 1 && (r.bottom - a.top) * k <= 934 }; });
  const until = (fn, ms = 6000) => page.waitForFunction(fn, null, { timeout: ms, polling: 50 }).then(() => true, () => false);
  const touch = (id, type, x, y) => g(([id, type, x, y]) => { const c = __game.client(x, y); (type === 'pointerdown' ? document.getElementById('app') : window).dispatchEvent(new PointerEvent(type, { pointerId: id, pointerType: 'touch', clientX: c[0], clientY: c[1], bubbles: true })); }, [id, type, x, y]);
  await page.waitForTimeout(1200); await shot('01-demo');
  // the first tap anywhere: the real level starts with its card and the TNT ahead blows up
  await touch(1, 'pointerdown', 360, 420); await touch(1, 'pointerup', 360, 420);
  await page.waitForTimeout(450);
  const card = await g(() => { const e = document.getElementById('lvcard'), a = document.getElementById('app').getBoundingClientRect(); return !e.hidden && [...e.children].every((x) => { const r = x.getBoundingClientRect(); return r.left >= a.left - 1 && r.right <= a.right + 1; }) && e.textContent; });
  await shot('02-first-tap');
  check(!!card, `first level: the level card shows (${card})`);
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
  // smashing by holding a finger on the block in reach also completes the lesson
  const cross = await g(() => { const a = document.getElementById('app').getBoundingClientRect(), r = document.getElementById('cross').getBoundingClientRect(), k = 720 / a.width; return [(r.left - a.left + r.width / 2) * k, (r.top - a.top + r.height / 2) * k]; });
  await touch(4, 'pointerdown', cross[0], cross[1]); const held = await until(() => __game.save.learned.hit, 2500); await touch(4, 'pointerup', cross[0], cross[1]);
  check(held, 'holding a finger on the block in reach completes the smash lesson');
  await until(() => document.getElementById('coach').hidden, 2000);
  const c4 = await coach(); check(!c4, 'after smashing: no coach left on screen');
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
  await g(() => document.querySelector('#nextBtn').click());
  await page.waitForTimeout(120); await shot('11-next-flash');
  await page.waitForTimeout(500); await shot('12-next-card');
  const card2 = await g(() => document.getElementById('lvcard').textContent);
  check(/2/.test(card2), `NEXT: level 2's card (${card2})`);
  // the same daily level opened again (it was the last card shown) still shows its card
  const daily = await g(() => { __game.newLevel(33, { daily: true }); const e = document.getElementById('lvcard'); e.hidden = true; __game.newLevel(33, { daily: true }); return !e.hidden && e.textContent; });
  check(daily && daily.includes('📅'), `the daily challenge has its card with the DAILY tag (${daily})`);
  check(errors.length === 0, 'no page errors: ' + (errors.join(' | ') || 'none'));
  await browser.close(); server.close();
  console.log(fails.length ? `\n${fails.length} FAILED` : '\nall passed'); process.exit(fails.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
