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
  // Astrocade bundles every module into one script that runs before three.js arrives from the CDN: importing a
  // module must not touch THREE (a top-level new THREE.Color() broke the draft once)
  {
    const bad = [], url = require('url');
    globalThis.window = globalThis; // game.js registers window.run when imported
    for (const f of ['toon', 'shapes', 'movefx', 'moves', 'missions', 'bonbon', 'army', 'city', 'game']) {
      try { await import(url.pathToFileURL(path.join(__dirname, f + '.js')).href); } catch (e) { bad.push(`${f}.js: ${e.message}`); }
    }
    delete globalThis.window; delete globalThis.run;
    check(bad.length === 0, `no module touches THREE when imported (${bad.join('; ') || 'all 9 load'})`);
  }
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
  // themed cities: finishing the newest city opens the next one and picks it; the map can pick an older one
  {
    const r = await g(() => { const s = __game.save; s.unlocked = 1; s.theme = 0; __game.newRound(); const S = __game.S; S.touched = true; __game.finish();
      return { un: s.unlocked, th: s.theme }; });
    await page.waitForFunction(() => !document.querySelector('#result').hidden, null, { timeout: 15000 }); // shown (and wired) after a short pause
    const m = await g(() => { const cities = [...document.querySelectorAll('#map .city:not(.daily)')]; const pick = cities[0]; pick.click();
      return { n: cities.length, locked: cities.filter((c) => c.disabled).length, picked: __game.save.theme, name: document.querySelector('#cityName').textContent }; });
    const next = await g(() => { __game.save.theme = 1; document.querySelector('#again').click(); return { theme: __game.S.theme, sky: __game.skyTop }; });
    check(r.un === 2 && r.th === 1 && m.n === 6 && m.locked === 4 && m.picked === 0 && next.theme === 1 && next.sky !== '3f9dff',
      `finishing Toy Town opens Candy Town and picks it; the map shows 6 cities (4 locked) and picks another (${JSON.stringify({ ...r, ...m, ...next })})`);
  }
  // costumes: a hat bought in the LOOKS tab is worn; one the coins do not cover refuses
  {
    const r = await g(() => { const s = __game.save; s.coins = 200; s.wardrobe = []; s.hat = 'none'; __game.openShop(); document.querySelector('[data-tab=looks]').click();
      document.querySelector('[data-look=crown]').click(); const refused = !s.wardrobe.includes('crown') && s.coins === 200;
      document.querySelector('[data-look=party]').click(); return { refused, owned: s.wardrobe.slice(), hat: s.hat, coins: s.coins, worn: __game.hatOn }; });
    check(r.refused && r.owned.includes('party') && r.hat === 'party' && r.coins === 80 && r.worn === 'party', `buying the party hat (120) puts it on Bonbon; the crown (420) refuses (${JSON.stringify(r)})`);
  }
  // sticker book: the n-th building knocked down after the first touch gives this city's next sticker
  {
    const before = await g(() => { const s = __game.save; s.stickers = []; s.theme = 0; __game.newRound(); const S = __game.S; S.touched = true; S.idle = -999;
      S.stickerAt = S.collapses + 1; const b = __game.city.buildings.find((x) => x.state === 'intact'); __game.city.collapse(b, { x: 0, z: 1 }, 0); return s.stickers.length; });
    await page.waitForFunction(() => __game.save.stickers.length > 0, null, { timeout: 8000 }).catch(() => {});
    const r = await g(() => { const b = document.querySelector('#banner'), s = __game.S.newSticker; return { got: __game.save.stickers.slice(), sticker: s, banner: b.textContent + (b.querySelector(`[data-e="${s}"]`) ? s : '') }; });
    const al = await g(() => { __game.openAlbum(); const box = document.querySelector('#album'); const r = { open: !box.hidden, got: box.querySelectorAll('.slot.got').length, slots: box.querySelectorAll('.slot').length }; box.querySelector('#albumClose').click(); return { ...r, closed: box.hidden }; });
    check(before === 0 && r.got.length === 1 && r.got[0] === 'toy0' && r.sticker && r.banner.includes(r.sticker), `a building gives the first Toy Town sticker with a banner (${JSON.stringify(r)})`);
    check(al.open && al.got === 1 && al.slots === 18 && al.closed, `the sticker book shows 1 of 18 and closes (${JSON.stringify(al)})`);
  }
  // the settings close at a new round; what the attract mode broke before the first touch is not the child's
  {
    const r = await g(() => { document.querySelector('#gear').click(); const open = !document.querySelector('#langs').hidden; __game.newRound(); return { open, closed: document.querySelector('#langs').hidden }; });
    check(r.open && r.closed, 'the settings panel closes when a new round starts');
    const pre = await g(() => { const S = __game.S, b = __game.city.buildings[0]; __game.city.collapse(b, { x: 0, z: 1 }, 0); S.coins = 40; return b.total; });
    const bb = await page.locator('#app').boundingBox();
    await page.mouse.move(bb.x + bb.width / 2, bb.y + bb.height * 0.6); await page.mouse.down(); await page.mouse.up();
    const t = await g(() => ({ b0: __game.S.blocks0, coins: __game.S.coins, touched: __game.S.touched }));
    check(t.touched && t.b0 >= pre && t.coins < 40, `the first touch starts the child's count: ${t.b0} blocks already down left out (>= ${pre}), coins ${t.coins} (the 40 from before are gone), touched ${t.touched}`);
  }
  // growing: Bonbon turns to face the player for a moment (the camera does not move)
  {
    const r = await g(async () => { __game.newRound(); const S = __game.S; S.touched = true; S.idle = -999; const cam0 = __game.camera.position.clone(); __game.grow();
      await new Promise((res) => setTimeout(res, 500)); const c = __game.camera.position; let d = Math.atan2(c.x - S.x, c.z - S.z) - S.yaw; d = Math.atan2(Math.sin(d), Math.cos(d));
      return { facing: Math.abs(d) < 0.5, pose: S.poseT > 0 }; });
    check(r.facing, `growing turns Bonbon to face the player (${JSON.stringify(r)})`);
  }
  // a quick tap on a car near Bonbon throws it at a building on screen: it lands with a comic word and breaks things
  {
    const car = await g(() => { const S = __game.S; S.idle = -999; const c = __game.city.cars.find((x) => x.squash <= 0 && !x.fly); c.speed = 0; S.x = c.x; S.z = c.z + 7; window.__car = c; return true; });
    await page.waitForTimeout(2500); // the camera settles on Bonbon's new place
    const at = await g(() => __game.screenOfCar(window.__car)), p0 = await g(() => __game.S.points);
    await page.mouse.click(at[0], at[1]);
    const word = await page.waitForFunction(() => document.querySelector('.comic'), null, { timeout: 5000 }).then(() => g(() => document.querySelector('.comic').textContent)).catch(() => '');
    await page.waitForTimeout(600);
    const r = await g((p0) => ({ thrown: __game.S.thrown, landed: !!window.__car.land, pts: __game.S.points - p0 }), p0);
    check(r.thrown === 1 && r.landed && r.pts > 0 && word, `tapping a car throws it; it lands with "${word}" and breaks things (+${r.pts}) ${JSON.stringify(r)}`);
  }
  // switching cities rebuilds the sky's reflections without leaving the old ones on the GPU
  {
    const t = await g(async () => { const s = __game.save; s.unlocked = 6; const counts = [];
      for (const th of [1, 0, 1, 0, 1]) { s.theme = th; __game.newRound(); await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))); counts.push(__game.textures); }
      s.theme = 0; s.unlocked = 1; return counts; });
    check(t[4] <= t[0], `switching cities does not pile up GPU textures (${t.join(' -> ')})`);
  }
  // a save that arrives after a city was finished: the map shows what is really open, a hat picked now stays on
  {
    const p3 = await browser.newPage({ viewport: { width: 405, height: 720 }, locale: 'en' });
    await p3.addInitScript(() => {
      window.lib = { showGameParameters() {}, log() {}, getAsset: () => undefined, haptics: { play() {}, start() {}, stop() {} }, shouldUseTouchControls: () => false,
        getUserGameState: () => new Promise((r) => { window.__deliver = r; }), saveUserGameState: async () => {},
        addPlayerScoreToLeaderboard: async () => ({}), getTopNEntriesFromLeaderboard: async () => ({}) };
      addEventListener('load', async () => { window.gameConfig = await (await fetch('./game_config.json')).json(); window.run('play'); });
    });
    await p3.goto(`http://localhost:${port}/?speed=6`);
    await p3.waitForFunction(() => window.__game && window.__game.S && window.__deliver, null, { timeout: 30000 });
    await p3.evaluate(() => { const S = __game.S; S.touched = true; __game.finish(); const s = __game.save; s.coins = 500; s.wardrobe = ['party']; s.hat = 'party'; __game.wear(); });
    await p3.waitForFunction(() => !document.querySelector('#result').hidden, null, { timeout: 15000 });
    const r = await p3.evaluate(async () => { window.__deliver({ state: { rounds: 5, unlocked: 4, theme: 3, hat: 'crown', wardrobe: ['crown'], coins: 50 } });
      await new Promise((res) => setTimeout(res, 200));
      return { locked: document.querySelectorAll('#map .city.locked').length, on: [...document.querySelectorAll('#map .city')].findIndex((c) => c.classList.contains('on')),
        name: document.querySelector('#cityName').textContent, hat: __game.hatOn, theme: __game.save.theme }; });
    check(r.locked === 2 && r.on === 3 && r.name === 'Snow Town' && r.hat === 'party', `a late save fixes the city map (4 open, Snow Town picked, no fake NEW CITY) and keeps the hat picked now (${JSON.stringify(r)})`);
    await p3.close();
  }
  // daily gift: the next day grows the streak, a missed day starts again, the same day pays nothing (?local&daily turns it on)
  {
    const p5 = await browser.newPage({ viewport: { width: 405, height: 720 } });
    await p5.goto(`http://localhost:${port}/?local&daily&tier=0`);
    await p5.waitForFunction(() => window.__game && window.__game.S, null, { timeout: 30000 });
    await p5.waitForFunction(() => !document.querySelector('#gift').hidden, null, { timeout: 8000 }).catch(() => {});
    const r = await p5.evaluate(() => { const s = __game.save, d = __game.today(), out = { first: s.streak };
      s.coins = 0; __game.dailyGift(); out.sameDay = s.coins;
      s.lastDay = d - 1; s.streak = 6; __game.dailyGift(); out.day7 = [s.streak, s.coins];
      s.lastDay = d - 3; s.coins = 0; __game.dailyGift(); out.missed = [s.streak, s.coins];
      s.lastDay = d - 1; s.streak = 7; s.coins = 0; __game.dailyGift(); out.day8 = s.coins; // stays at the top after a week
      s.lastDay = d + 1; s.coins = 0; __game.dailyGift(); out.future = s.coins; // a clock set back pays nothing
      s.lastDay = d - 1; s.streak = -3; s.coins = 10; __game.dailyGift(); out.corrupt = s.coins; // a broken streak never makes NaN
      document.querySelector('#gift').hidden = true; const S = __game.S; S.touched = true; S.finished = false; s.lastDay = d - 1; s.streak = 1; s.coins = 0; __game.dailyGift();
      out.midRound = { shown: !document.querySelector('#gift').hidden, coins: s.coins }; S.finished = true; return out; });
    check(r.first === 1 && r.sameDay === 0 && r.day7[0] === 7 && r.day7[1] === 400 && r.missed[0] === 1 && r.missed[1] === 50 && r.day8 === 400 && r.future === 0 && r.corrupt === 60 && !r.midRound.shown && r.midRound.coins === 0,
      `daily gift: day 1, once a day, day 7-8 pay 400, a missed day restarts, a clock set back pays nothing, a broken streak gives day 1, never mid-round (${JSON.stringify(r)})`);
    await p5.close();
  }
  // the Daily City: picked on the map, today's seed, a bonus the first time today, never opens a city
  {
    const r = await g(async () => { const s = __game.save; s.unlocked = 2; s.theme = 1; s.dailyDay = null; s.coins = 0; __game.wantDaily = true; __game.newRound();
      const S = __game.S, a = { daily: S.daily, theme: S.theme, day: __game.today() }; S.touched = true; S.time = 80; __game.finish();
      a.after = { un: s.unlocked, bonus: S.dailyBonus, best: s.dailyBest, coins: s.coins };
      __game.wantDaily = true; __game.newRound(); const S2 = __game.S; S2.touched = true; S2.time = 70; __game.finish(); a.again = { bonus: S2.dailyBonus, best: s.dailyBest }; s.dailyDay = null; return a; });
    check(r.daily && r.theme === r.day % 6 && r.after.un === 2 && r.after.bonus === 100 && r.after.best === 80 && r.again.bonus === 0 && r.again.best === 70,
      `Daily City: today's city, +100 once, best time kept, no city opened (${JSON.stringify(r)})`);
  }
  // each city's boss has its own name
  {
    const names = await g(() => { const s = __game.save; s.unlocked = 6; const out = []; for (let i = 0; i < 6; i++) { s.theme = i; __game.newRound(); out.push(__game.bossName()); } s.theme = 0; s.unlocked = 1; return out; });
    check(new Set(names).size === 6, `every city has its own boss (${names.join(', ')})`);
  }
  // shaders are compiled before the first frame, for the target the scene really draws into (no first-frame stall)
  {
    const p4 = await browser.newPage({ viewport: { width: 405, height: 720 } });
    await p4.goto(`http://localhost:${port}/?local&tier=1`);
    await p4.waitForFunction(() => window.__game && window.__game.renderer, null, { timeout: 30000 });
    const r = await p4.evaluate(async () => { const n0 = __game.renderer.info.programs.length; for (let i = 0; i < 4; i++) await new Promise((res) => requestAnimationFrame(res)); return { before: n0, after: __game.renderer.info.programs.length }; });
    check(r.after - r.before <= 3, `shaders are ready before the first frames (${r.before} programs, ${r.after - r.before} more in the first frames)`);
    await p4.close();
  }
  // the move button works while another finger steers (phones send no click for a second finger)
  {
    const ctx2 = await browser.newContext({ viewport: { width: 405, height: 720 }, hasTouch: true, isMobile: true });
    const p6 = await ctx2.newPage();
    await p6.goto(`http://localhost:${port}/?local&tier=0`);
    await p6.waitForFunction(() => window.__game && window.__game.S, null, { timeout: 30000 });
    await p6.evaluate(() => { const S = __game.S; S.touched = true; S.idle = -999; while (S.stage < 3) __game.grow(); document.querySelector('#hint').hidden = true; });
    await p6.waitForFunction(() => __game.S.poseT <= 0 && !__game.posing && !__game.S.jump && __game.S.slowT <= 0, null, { timeout: 30000 }); // the grow pose is over (slow machines take longer)
    const btn = await p6.evaluate(() => { const r = document.querySelector('#skill').getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; });
    const cdp = await ctx2.newCDPSession(p6);
    const touch = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map(([x, y], i) => ({ x, y, id: i + 1 })) });
    await touch('touchStart', [[150, 500]]); await touch('touchMove', [[150, 440]]); await p6.waitForTimeout(600);
    const walking = await p6.evaluate(() => __game.S.moving);
    await touch('touchStart', [[150, 440], btn]); await touch('touchEnd', [[150, 440]]); await p6.waitForTimeout(200);
    const cd = await p6.evaluate(() => __game.S.skillCd); await touch('touchEnd', []);
    check(walking && cd > 0, `the move button works with a second finger while walking (walking ${walking}, cooldown ${cd.toFixed(1)})`);
    await ctx2.close();
  }
  // drawn icons replace the emoji everywhere in the HUD (shop, result, album)
  {
    const r = await g(async () => { __game.openShop(); await new Promise((res) => setTimeout(res, 100));
      const hud = document.querySelector('.hud'), left = (hud.innerText.match(/[\u{1F300}-\u{1FAFF}\u2600-\u27BF]/gu) || []);
      const ic = hud.querySelectorAll('.ic').length, bg = getComputedStyle(hud.querySelector('.ic')).backgroundImage;
      document.querySelector('#shop').hidden = true; return { left: left.slice(0, 5), ic, atlas: /icons|cloudfront/.test(bg) }; });
    check(r.ic > 10 && r.left.length === 0 && r.atlas, `drawn icons replace the emoji (${r.ic} icons, emoji left: ${r.left.join(' ') || 'none'})`);
  }
  // surprises: the golden building pays when knocked down in time, the giant candy makes Bonbon MEGA, a long combo starts FEVER
  {
    const p7 = await browser.newPage({ viewport: { width: 405, height: 720 } });
    await p7.goto(`http://localhost:${port}/?local&tier=0`);
    await p7.waitForFunction(() => window.__game && window.__game.S, null, { timeout: 30000 });
    const r = await p7.evaluate(async () => { const S = __game.S, w = (ms) => new Promise((res) => setTimeout(res, ms));
      document.querySelector('#hint').hidden = true; S.touched = true; S.idle = -1e9; S.time = 20; S.goldenAt = 20.01; for (let i = 0; i < 40 && !S.golden; i++) await w(100);
      const gold = S.golden, c0 = S.coins; if (gold) __game.city.collapse(gold, { x: 1, z: 0 }, 0); for (let i = 0; i < 40 && S.golden; i++) await w(100); await w(100);
      const paid = S.coins - c0, cleared = !S.golden && !document.querySelector('.emark');
      S.candyAt = S.time; for (let i = 0; i < 40 && !S.candy; i++) await w(100); const candy = !!S.candy; if (S.candy) { S.x = S.candy.x; S.z = S.candy.z; } for (let i = 0; i < 40 && S.megaT <= 0; i++) await w(100);
      const mega = S.megaT > 0 && S.scaleTarget > S.scale * 0.99;
      S.combo = 30; __game.feverCheck(); const fever = S.feverT > 0 && document.querySelector('.hud').classList.contains('fever');
      S.feverT = 0.01; S.combo = 30; await w(200); __game.feverCheck(); const cool = S.feverT <= 0;
      return { gold: !!gold, paid, cleared, candy, mega, fever, cool }; });
    await p7.close();
    check(r.gold && r.paid >= 80 && r.cleared && r.candy && r.mega && r.fever && r.cool, `surprises: golden building pays when knocked down (+${r.paid}), giant candy makes MEGA, combo starts FEVER and waits its cooldown (${JSON.stringify(r)})`);
  }
  // audit fixes: no FEVER before the first touch, a slow round shows empty stars, Bonbon is back to size after MEGA, a skin-toned emoji stays whole
  {
    const p8 = await browser.newPage({ viewport: { width: 405, height: 720 } });
    await p8.goto(`http://localhost:${port}/?local&tier=0`);
    await p8.waitForFunction(() => window.__game && window.__game.S, null, { timeout: 30000 });
    const r = await p8.evaluate(async () => { const S = __game.S, w = (ms) => new Promise((res) => setTimeout(res, ms));
      S.combo = 30; __game.feverCheck(); const attractFever = S.feverT > 0;
      document.querySelector('#hint').hidden = true; S.touched = true; S.megaT = 5; __game.eventsUpdate(0.016); const big = S.scaleTarget;
      S.time = 9999; __game.finish(); await w(600);
      const empty = document.querySelectorAll('.stars .ic[data-e="☆"]').length, back = S.scaleTarget < big;
      const d = document.createElement('div'); d.textContent = 'x👸🏽y'; document.querySelector('.hud').appendChild(d); await w(50);
      const whole = d.textContent.includes('👸🏽') && !d.querySelector('.ic'); d.remove();
      return { attractFever, empty, back, whole }; });
    check(!r.attractFever && r.empty === 2 && r.back && r.whole, `audit fixes: no FEVER before the first touch, a 1-star round shows 2 empty stars, MEGA size ends at the finish, a skin-toned emoji stays whole (${JSON.stringify(r)})`);
    await p8.close();
  }
  // tahap 9: the loading screen goes once the game draws; tapping Bonbon tickles it; left alone it waves; growing plays a framed shot with letterbox bars
  {
    const p9 = await browser.newPage({ viewport: { width: 405, height: 720 } });
    await p9.goto(`http://localhost:${port}/?local&tier=0`);
    await p9.waitForFunction(() => window.__game && window.__game.S, null, { timeout: 30000 });
    const loadGone = await p9.waitForFunction(() => !document.getElementById('load'), null, { timeout: 20000 }).then(() => true, () => false);
    const r = await p9.evaluate(async () => { const S = __game.S, w = (ms) => new Promise((res) => setTimeout(res, ms));
      document.querySelector('#hint').hidden = true; S.touched = true; S.idle = 0;
      const v = new THREE.Vector3(S.x, 1.5 * S.scale, S.z).project(__game.camera), rc = document.getElementById('app').getBoundingClientRect();
      __game.tapAt(rc.left + (v.x + 1) / 2 * rc.width, rc.top + (1 - v.y) / 2 * rc.height); const tickle = __game.posing;
      for (let i = 0; i < 40 && __game.posing; i++) await w(100);
      S.idle = 2.5; await w(400); const wave = S.fidgeted && __game.posing;
      for (let i = 0; i < 40 && __game.posing; i++) await w(100);
      S.idle = -99; __game.grow(); const shot = __game.cine.kind; let bars = false;
      __game.cine.kind = ''; __game.startCine('grow', S.x, S.z, 6); // a longer shot, so a slow test machine still sees its bars
      for (let i = 0; i < 30 && !bars; i++) { await w(100); bars = document.querySelector('.hud').classList.contains('cine'); }
      for (let i = 0; i < 60 && __game.cine.kind; i++) await w(100);
      return { tickle, wave, shot, bars, ended: !__game.cine.kind && !document.querySelector('.hud').classList.contains('cine') }; });
    check(loadGone && r.tickle && r.wave && r.shot === 'grow' && r.bars && r.ended, `tahap 9: loading screen goes, a tap tickles Bonbon, it waves when left alone, growing plays a framed shot with bars that ends (${JSON.stringify({ loadGone, ...r })})`);
    await p9.close();
  }
  // no WebGL: a retry button shows and the loading screen goes (never a page stuck at 90%)
  {
    const pw = await browser.newPage({ viewport: { width: 405, height: 720 } });
    await pw.addInitScript(() => { const g = HTMLCanvasElement.prototype.getContext; HTMLCanvasElement.prototype.getContext = function (k, ...a) { return /webgl/.test(k) ? null : g.call(this, k, ...a); }; });
    await pw.goto(`http://localhost:${port}/?local`);
    const ok = await pw.waitForFunction(() => !document.getElementById('load') && document.querySelector('#app button[aria-label="Retry"]'), null, { timeout: 20000 }).then(() => true, () => false);
    check(ok, `with no WebGL the loading screen goes and a retry button shows (${ok})`);
    await pw.close();
  }
  // Bonbon is always in the frame: while playing and during every cinematic shot (feet, chest and head on screen, never behind the camera)
  {
    const pv = await browser.newPage({ viewport: { width: 405, height: 720 } });
    await pv.goto(`http://localhost:${port}/?local&tier=0&speed=3`);
    await pv.waitForFunction(() => window.__game && window.__game.S && !document.getElementById('load'), null, { timeout: 30000 });
    await pv.evaluate(() => { window.__vis = {}; const S = __game.S; S.touched = true; document.querySelector('#hint').hidden = true; const v = new THREE.Vector3();
      window.__visT = setInterval(() => { const S = __game.S; let w = 0; for (const h of [0.4, 1.5, 2.6]) { v.set(S.x, h * S.scale, S.z).project(__game.camera); w = Math.max(w, Math.abs(v.x), Math.abs(v.y), v.z > 1 ? 9 : 0); }
        const k = __game.cine.kind || 'play'; window.__vis[k] = Math.max(window.__vis[k] || 0, +w.toFixed(2)); }, 100); });
    const step = async (js, ms) => { await pv.evaluate(js); await pv.waitForTimeout(ms); };
    await step('__game.grow()', 3000);
    await step('(() => { const S = __game.S; __game.cine.kind = ""; __game.startCine("boss", S.x - 40, S.z - 30, 2.4); })()', 3200);
    await step('(() => { const S = __game.S; __game.cine.kind = ""; __game.startCine("boss", S.x + 10, S.z + 45, 2.4); })()', 3200);
    await step('(() => { const S = __game.S; __game.cine.kind = ""; __game.startCine("collapse", S.x + 9, S.z - 28, 1.3); })()', 2200);
    await step('(() => { const S = __game.S; __game.cine.kind = ""; __game.startCine("mega", S.x, S.z, 1.4); })()', 2200);
    await step('__game.S.idle = 99', 3500);
    const vis = await pv.evaluate(() => { clearInterval(window.__visT); return window.__vis; });
    check(Object.values(vis).every((w) => w <= 1) && vis.play !== undefined, `Bonbon stays on screen while playing and in every shot (furthest from centre: ${JSON.stringify(vis)})`);
    await pv.close();
  }
  // a save that fails to load is never written over (it would wipe coins, moves and the all-time total)
  {
    const p2 = await browser.newPage({ viewport: { width: 405, height: 720 } });
    await p2.addInitScript(() => {
      window.__saves = [];
      window.lib = { showGameParameters() {}, log() {}, getAsset: () => undefined, haptics: { play() {}, start() {}, stop() {} }, shouldUseTouchControls: () => false,
        getUserGameState: () => Promise.reject(new Error('offline')), saveUserGameState: async (s) => { window.__saves.push(s); },
        addPlayerScoreToLeaderboard: async () => ({}), getTopNEntriesFromLeaderboard: async () => ({}) };
      addEventListener('load', async () => { window.gameConfig = await (await fetch('./game_config.json')).json(); window.run('play'); });
    });
    await p2.goto(`http://localhost:${port}/?speed=6`);
    await p2.waitForFunction(() => window.__game && window.__game.S, null, { timeout: 30000 });
    const n = await p2.evaluate(async () => { const S = __game.S; S.touched = true; __game.save.coins = 500; __game.finish(); await new Promise((r) => setTimeout(r, 300)); return window.__saves.length; });
    check(n === 0, `a save that failed to load is not overwritten (${n} writes)`);
    await p2.close();
  }
  check(errors.length === 0, 'no page errors' + (errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''));
  await browser.close(); server.close();
  console.log(fails.length ? `\n${fails.length} FAILED` : '\nall passed');
  process.exit(fails.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
