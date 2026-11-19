// PROTOTYPE - NOT FOR PRODUCTION
// Playtest: serves this folder, plays one whole round on the game's own autopilot (sped up), checks the rules
// that matter (growth, dominoes, finish, replay), and saves screenshots.
// Usage: node playtest.js <out folder> [--lang xx]   (needs Playwright; swiftshader GPU, so FPS here is not a phone's)
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const out = process.argv[2] || '.', lang = (process.argv.indexOf('--lang') > 0 && process.argv[process.argv.indexOf('--lang') + 1]) || 'en';
fs.mkdirSync(out, { recursive: true });
const types = { '.js': 'text/javascript', '.html': 'text/html', '.json': 'application/json' };
const server = http.createServer((q, s) => {
  const f = path.join(__dirname, q.url.split('?')[0] === '/' ? 'index.html' : q.url.split('?')[0]);
  fs.readFile(f, (e, d) => { if (e) { s.writeHead(404); return s.end(); } s.writeHead(200, { 'content-type': types[path.extname(f)] || 'text/plain' }); s.end(d); });
}).listen(0);

(async () => {
  const port = server.address().port, fails = [];
  const check = (ok, msg) => { console.log((ok ? 'ok   ' : 'FAIL ') + msg); if (!ok) fails.push(msg); };
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  // screen comfort, on its own page at normal speed: hold a wandering drag with a big Bonbon, record the camera
  {
    const cp = await browser.newPage({ viewport: { width: 405, height: 720 } });
    await cp.goto(`http://localhost:${port}/?local&tier=0`);
    await cp.waitForFunction(() => window.__game && window.__game.S, null, { timeout: 30000 });
    await cp.evaluate(() => { for (let i = 0; i < 4; i++) __game.grow(); });
    await cp.waitForTimeout(1500);
    await cp.evaluate(() => { window.__cam = []; const c = __game.camera; const loop = () => { if (!window.__cam) return; __cam.push([c.position.x, c.position.y, c.position.z, c.rotation.z]); requestAnimationFrame(loop); }; loop(); });
    await cp.mouse.move(200, 500); await cp.mouse.down();
    for (const [x, y] of [[200, 430], [140, 440], [200, 430], [260, 440], [200, 560]]) { await cp.mouse.move(x, y, { steps: 4 }); await cp.waitForTimeout(1000); }
    await cp.mouse.up();
    const cam = await cp.evaluate(() => { const a = __cam; window.__cam = null; let maxJ = 0, roll = 0;
      for (let i = 2; i < a.length; i++) { maxJ = Math.max(maxJ, Math.hypot(...[0, 1, 2].map((k) => a[i][k] - 2 * a[i - 1][k] + a[i - 2][k]))); roll = Math.max(roll, Math.abs(a[i][3] - a[i - 1][3])); }
      return { maxJ, roll, n: a.length }; });
    check(cam.roll < 0.002 && cam.maxJ < 1.0, `screen comfort at stage 5: camera roll change ${cam.roll.toFixed(4)} per frame, biggest jolt ${cam.maxJ.toFixed(2)} (< 1.0) over ${cam.n} frames`);
    await cp.close();
  }
  const page = await browser.newPage({ viewport: { width: 405, height: 720 }, locale: lang });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(`http://localhost:${port}/?local&tier=0&speed=6`);
  await page.waitForFunction(() => window.__game && window.__game.S, null, { timeout: 30000 });
  const g = (fn, arg) => page.evaluate(fn, arg);
  check(await g(() => __game.lang) === (['en', 'ar', 'es', 'vi', 'hi', 'bn', 'id'].includes(lang.slice(0, 2)) ? lang.slice(0, 2) : 'en'), 'language follows the device: ' + lang);
  await page.waitForTimeout(1500);
  check(await g(() => __game.S.points > 0), 'autopilot breaks something before any touch');
  await page.screenshot({ path: path.join(out, `01-start-${lang}.png`) });
  check(await g(() => __game.S.time === 0), 'attract mode (no touch yet) does not run the clock');
  {
    const box = await page.$('#app'); const bb = await box.boundingBox(); await page.mouse.click(bb.x + bb.width / 2, bb.y + bb.height * 0.6); // a first tap unlocks sound
    await page.waitForFunction(() => __game.Sound.loaded.length >= 8, null, { timeout: 30000 }).catch(() => {});
    const got = await g(() => __game.Sound.loaded);
    check(got.length === 8, `recorded sounds and music load from the asset map after the first tap (${got.length}/8)`);
    // the host may start the game again (edit, then play): the music must come back after the next tap
    await g(() => window.run('play'));
    await page.waitForFunction(() => window.__game && window.__game.S, null, { timeout: 10000 });
    await page.mouse.click(bb.x + bb.width / 2, bb.y + bb.height * 0.6);
    await page.waitForTimeout(500);
    check(await g(() => __game.Sound.musicOn), 'music plays again after the game is started a second time');
  }
  // --city N plays the Nth city (0 = the first, tuned one; later ones are shuffled)
  const cityN = Number(process.argv[process.argv.indexOf('--city') + 1]) || 0;
  await g((n) => { __game.save.rounds = n; __game.newRound(); __game.S.touched = true; __game.S.idle = 99; }, process.argv.includes('--city') ? cityN : 0); // a fresh round as a child who touched once then let go: autopilot plays on and the round counts

  // play on autopilot; note when things happen
  const seen = { stage3: false, domino: false, grow1: null, dom1: null, units: 0, stars: 0, boss: false, bossShot: false, hurt: false, armyShot: false };
  const t0 = Date.now();
  while (Date.now() - t0 < 420000) {
    const s = await g(() => ({ cracked: __game.city.buildings.some((b) => b.cracked), units: __game.army.units.length, stars: __game.army.stars, boss: __game.army.boss.alive, spirit: __game.S.spirit, hits: __game.S.hits, stage: __game.S.stage, fin: __game.S.finished, time: __game.S.time, left: __game.city.intactLeft(), dom: __game.S.chainShown, pts: __game.S.points }));
    if (s.cracked) seen.cracked = true; seen.units = Math.max(seen.units, s.units); seen.stars = Math.max(seen.stars, s.stars); if (s.hits > 0) seen.hurt = true;
    if (!seen.armyShot && s.units >= 3) { seen.armyShot = true; await page.screenshot({ path: path.join(out, `05-army-${lang}.png`) }); }
    if (s.boss) { seen.boss = true; if (!seen.bossShot) { seen.bossShot = true; await page.waitForTimeout(400); await page.screenshot({ path: path.join(out, `06-boss-${lang}.png`) }); } }
    if (seen.grow1 === null && s.stage >= 2) seen.grow1 = s.time;
    if (seen.dom1 === null && s.dom >= 2) seen.dom1 = s.time;
    if (!seen.stage3 && s.stage >= 3) { seen.stage3 = true; await page.screenshot({ path: path.join(out, `02-grown-${lang}.png`) }); console.log('     stage 3 at', s.time.toFixed(0), 's'); }
    if (!seen.domino && s.dom >= 2) { seen.domino = true; await page.screenshot({ path: path.join(out, `03-domino-${lang}.png`) }); console.log('     domino x' + s.dom + ' at', s.time.toFixed(0), 's'); }
    if (s.fin) { console.log(`     finished at ${s.time.toFixed(0)} s game time, stage ${s.stage}, ${s.pts} points`); break; }
    await page.waitForTimeout(250);
  }
  const end = await g(() => ({ fin: __game.S.finished, stage: __game.S.stage, time: __game.S.time, coins: __game.S.coins, best: __game.S.bestCombo }));
  check(end.fin, 'the city is flattened and the round finishes');
  check(end.stage >= 5, 'Bonbon grows to stage 5+ in one round (got ' + end.stage + ')');
  check(end.time > 60 && end.time < 300, 'autopilot round from the first touch (the shortest path; a child wanders) takes 60-300 game s: ' + end.time.toFixed(0) + ' s');
  check(seen.domino, 'at least one domino chain happens');
  check(seen.cracked, 'badly hit buildings crack before they fall');
  check(seen.stars >= 2 && seen.units >= 2, `the toy army comes (most stars ${seen.stars}, most units at once ${seen.units})`);
  check(seen.hurt, 'army hits lower Spirit at least once');
  check(seen.boss && await g(() => __game.S.bossDone && !__game.army.boss.alive), 'the Wind-Up Robot appears, is beaten before the finish, and does not come back');
  check(seen.grow1 !== null && seen.grow1 <= 10, `first GROW within 10 s of the first touch (${seen.grow1 === null ? 'never' : seen.grow1.toFixed(1) + ' s'})`);
  check(seen.dom1 !== null && seen.dom1 <= 30, `first domino within 30 s (${seen.dom1 === null ? 'never' : seen.dom1.toFixed(1) + ' s'})`);
  await page.waitForTimeout(2500);
  check(await g(() => !document.querySelector('#result').hidden), 'result screen shows');
  await page.screenshot({ path: path.join(out, `04-result-${lang}.png`) });
  const sig = 'const cl = __game.city.buildings.find((b) => b.k === 5); return { clock: cl.x0 + "," + cl.z0, layout: __game.city.buildings.map((b) => b.k + ":" + b.x0 + "," + b.z0).join() };';
  const city1 = await g(new Function(sig)), saved1 = await g(() => ({ rounds: __game.save.rounds, smashed: __game.save.smashed, blocks: __game.city.totalBlocks }));
  check(saved1.rounds === (process.argv.includes('--city') ? cityN : 0) + 1 && saved1.smashed === saved1.blocks, `the finished city is saved: ${saved1.rounds} city, ${saved1.smashed} blocks smashed all-time`);
  check(/\d/.test(await g(() => document.querySelector('#blk').textContent)) && await g(() => document.querySelector('#blk').textContent !== '0'), 'the result counts the blocks smashed up from 0');
  const { ms, reset } = await g(() => { const t = performance.now(); document.querySelector('#again').click(); const ms = performance.now() - t;
    return { ms, reset: { fin: __game.S.finished, stage: __game.S.stage, left: __game.city.intactLeft(), n: __game.city.buildings.length } }; });
  check(!reset.fin && reset.stage === 1 && reset.left === reset.n && ms < 100, `replay resets the round in ${ms.toFixed(0)} ms`);
  const city2 = await g(new Function(sig));
  check(city2.layout !== city1.layout && city2.clock !== city1.clock, `the next city is a new one (clock tower ${city1.clock} -> ${city2.clock})`);
  // one settings button holds sound and languages
  const gear = await g(() => { document.querySelector('#gear').click(); const box = document.querySelector('#langs'), m0 = __game.Sound.muted;
    box.querySelector('#snd').click(); const m1 = __game.Sound.muted; box.querySelector('#snd').click();
    const r = { open: !box.hidden, langs: box.querySelectorAll('[data-l]').length, toggled: m1 !== m0, back: __game.Sound.muted === m0 }; document.querySelector('#gear').click(); return { ...r, closed: box.hidden }; });
  check(gear.open && gear.langs === 7 && gear.toggled && gear.back && gear.closed, `the settings button opens sound + 7 languages and closes again (${JSON.stringify(gear)})`);
  // shop: a locked card refuses, a bought move goes on the big button and breaks things when used
  {
    const r1 = await g(() => { __game.save.coins = 100; __game.save.owned = []; __game.save.equipped = 'spin'; __game.openShop(); const c = document.querySelector('.mcard[data-id="flop"]'); c.click(); return { cls: c.className, owned: __game.save.owned.slice() }; });
    check(r1.owned.length === 0 && /shake/.test(r1.cls), 'a move the coins do not cover stays locked and its card shakes');
    await page.screenshot({ path: path.join(out, `07-shop-${lang}.png`) });
    const r2 = await g(() => { __game.save.coins = 400; document.querySelector('.mcard[data-id="flop"]').click(); return { owned: __game.save.owned.slice(), eq: __game.save.equipped, coins: __game.save.coins }; });
    check(r2.owned.includes('flop') && r2.eq === 'flop' && r2.coins === 250, `buying Belly Flop takes 150 coins and puts it on the button (${JSON.stringify(r2)})`);
    await g(() => document.querySelector('#shopPlay').click());
    const before = await g(() => ({ vis: !document.querySelector('#skill').hidden, pts: __game.S.points }));
    check(before.vis, 'the big button shows the bought move from stage 1');
    await g(() => { __game.S.touched = true; __game.useSkill(); });
    await page.waitForTimeout(1500);
    const after = await g(() => ({ pts: __game.S.points, air: !!__game.S.jump, cd: __game.S.skillCd }));
    check(after.pts > before.pts && !after.air && after.cd > 0, `Belly Flop lands and breaks something (+${after.pts - before.pts} points)`);
  }
  // every move, one by one, on a fresh city: it must land, cool down and break something
  for (const id of ['spin', 'flop', 'bubble', 'roar', 'jelly', 'magnet', 'rainbow', 'sneeze', 'moon']) {
    const r = await page.evaluate((id) => { __game.newRound(); const S = __game.S; S.touched = true; S.idle = -999; while (S.stage < 3) __game.grow();
      __game.save.owned = ['flop', 'bubble', 'roar', 'jelly', 'magnet', 'rainbow', 'sneeze', 'moon']; __game.save.equipped = id;
      S.x = 10; S.z = -5; S.skillCd = 0; const p0 = S.points; __game.useSkill(); return { p0, cd: S.skillCd }; }, id);
    await page.waitForFunction(() => !__game.S.jump, null, { timeout: 8000 }).catch(() => {}); // a landing that makes Bonbon grow plays in slow motion
    await page.waitForTimeout(400);
    const r2 = await g(() => ({ pts: __game.S.points, air: !!__game.S.jump }));
    check(r.cd > 0 && r2.pts > r.p0 && !r2.air, `move ${id}: used, landed, +${r2.pts - r.p0} points`);
  }
  // missions: a fresh player gets the tutorial, starting with houses, and finishing missions pays coins
  {
    const m0 = await g(() => { __game.save.tutorialDone = false; __game.newRound(); const m = __game.missions.current; return { icon: m && m.icon, tut: __game.missions.tutorial }; });
    check(m0.icon === '🏠' && m0.tut, `the first mission of a new player is the tutorial's houses (${m0.icon})`);
    await g(() => { __game.S.touched = true; __game.S.idle = 99; });
    await page.waitForFunction(() => __game.S.bonusCoins > 0, null, { timeout: 60000 }).catch(() => {});
    const m1 = await g(() => ({ bonus: __game.S.bonusCoins, cur: __game.missions.current && __game.missions.current.icon }));
    check(m1.bonus >= 60, `a finished mission pays coins (+${m1.bonus}), next one ${m1.cur}`);
    await page.screenshot({ path: path.join(out, `08-mission-${lang}.png`) });
  }
  // Rainbow Mode: squash the three ice-cream trucks
  {
    for (let k = 0; k < 3; k++) {
      await g(() => { const t = __game.city.iceTrucks()[0]; if (t) { __game.S.x = t.x; __game.S.z = t.z; } });
      await page.waitForTimeout(300);
    }
    const rb = await g(() => ({ t: __game.S.rainbowT, trucks: __game.S.trucks }));
    check(rb.trucks >= 3 && rb.t > 0, `three ice-cream trucks squashed start Rainbow Mode (${rb.trucks} trucks, ${rb.t.toFixed(1)} s left)`);
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(out, `09-rainbow-${lang}.png`) });
  }
  // Rainbow Mode is once per round: squashing a truck again after it ends does not restart it
  {
    await g(() => { __game.S.rainbowT = 0.01; });
    await page.waitForTimeout(1500); // trucks pop back after 5 game seconds (sped up here)
    for (let k = 0; k < 3; k++) { await g(() => { const t = __game.city.iceTrucks()[0]; if (t) { __game.S.x = t.x; __game.S.z = t.z; } }); await page.waitForTimeout(250); }
    const again = await g(() => __game.S.rainbowT);
    check(again <= 0, `Rainbow Mode does not restart in the same round (${again.toFixed(1)} s)`);
  }
  // a tutorial "grow" step Bonbon already passed is skipped, not left stuck
  {
    const r = await g(() => { __game.save.tutorialDone = false; __game.newRound(); const S = __game.S; S.touched = true; S.idle = -999; __game.grow(); __game.missions.on('house', 3); const m = __game.missions; return { stage: S.stage, next: m.current ? m.current.icon : 'wait' }; });
    await page.waitForFunction(() => __game.missions.current, null, { timeout: 8000 }).catch(() => {}); // after the short pause between missions
    const nx = await g(() => __game.missions.current && __game.missions.current.icon);
    check(r.stage >= 2 && nx === '🚗', `after houses, a grow-to-2 step already met is skipped (next: ${nx})`);
  }
  check(errors.length === 0, 'no page errors' + (errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''));
  await browser.close(); server.close();
  console.log(fails.length ? `\n${fails.length} FAILED` : '\nall passed');
  process.exit(fails.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
