// PROTOTYPE - NOT FOR PRODUCTION
// Screens in every language at 720×1280 for the full-size look check: the demo, playing outside, inside the building
// (first person, looking at the vault), TOO HARD with the bomb hint, SMASH TIME, and the result card. Fails when text leaves the frame.
// Usage: node look.js <out folder> [langs comma-separated]
const fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const { serve, open, GPU } = require('./playtest.js');
const out = process.argv[2]; const langs = (process.argv[3] || 'en,ar,es,vi,hi,bn,id').split(',');
if (!out) { console.error('usage: node look.js <out folder> [langs]'); process.exit(1); }
fs.mkdirSync(out, { recursive: true });
(async () => {
  const server = serve(), browser = await chromium.launch({ args: GPU }); let bad = 0;
  for (const lang of langs) {
    const { page, errors } = await open(browser, '', { port: server.address().port, locale: lang, dpr: 2, touch: true }); // phone layout: stick + HIT
    const g = (fn, a) => page.evaluate(fn, a), shot = (n) => page.screenshot({ path: path.join(out, `${lang}-${n}.jpg`), type: 'jpeg', quality: 82 });
    const overflow = () => g(() => { const a = document.getElementById('app').getBoundingClientRect(); return [...document.querySelectorAll('.pop, .tip, .title, .card, .big, .small, .cups, .stat, .nexttool, .tool, .pill, .bar, .round, .srow, .sbtn, .tab, .atile, .anm')].filter((el) => !el.closest('[hidden]') && el.offsetParent !== null).map((el) => [el.className, el.getBoundingClientRect()]).filter(([, r]) => r.width && (r.left < a.left - 1 || r.right > a.right + 1)).map(([c]) => c); });
    const over = [];
    await page.waitForTimeout(1500); await shot('1-demo'); over.push(...await overflow());
    // a player who has done the walk / look / smash lessons (the coach screens are journey.js's)
    await g(() => { Object.assign(__game.save.learned, { walk: true, drag: true, hit: true }); __game.newLevel(0); const W = __game.W; __game.WD.aimHammer(W, { type: 'block', x: Math.floor(W.chest.x), y: 1, z: W.box.z1, nx: 0, ny: 0, nz: 1 }, true); });
    await page.waitForTimeout(1800); await shot('2-play'); over.push(...await overflow());
    // inside: the hero in the room in front of the vault, roof peeled away
    await g(() => { const W = __game.W; __game.WD.aimHammer(W, null); W.hero.x = W.chest.x + 0.5; W.hero.z = W.chest.z + 4; __game.scene.look(-__game.scene.yaw, -__game.scene.pitch - 0.2); });
    await page.waitForTimeout(1600); await shot('3-inside'); over.push(...await overflow());
    await g(() => { const W = __game.W; __game.onEvent({ type: 'tooHard', x: W.chest.x, y: 1, z: W.chest.z + 2 }); });
    await page.waitForTimeout(350); await shot('4-too-hard'); over.push(...await overflow());
    await g(() => { const W = __game.W; W.got = 3; W.phase = 'fever'; W.fever = 8; __game.onEvent({ type: 'fever' }); __game.WD.useTool(W, 'bomb', { x: W.chest.x, y: 1, z: W.chest.z }); });
    await page.waitForTimeout(700); await shot('5-smash-time'); over.push(...await overflow());
    await g(() => { const W = __game.W; W.fever = 0; W.phase = 'free'; __game.onEvent({ type: 'clear' }); });
    await page.waitForTimeout(1200); await shot('6-result'); over.push(...await overflow());
    await g(() => { document.querySelector('#keepBtn').click(); __game.save.coins = 30000; __game.save.best = { 0: 2, 1: 1, 3: 2 }; document.querySelector('#coins').click(); document.querySelectorAll('.card, .card *').forEach((e) => { e.style.animation = 'none'; }); });
    await page.waitForTimeout(400); await shot('7-shop'); over.push(...await overflow());
    await g(() => { document.querySelector('[data-tab=album]').click(); document.querySelectorAll('.card, .card *').forEach((e) => { e.style.animation = 'none'; }); });
    await page.waitForTimeout(400); await shot('8-album'); over.push(...await overflow());
    if (over.length || errors.length) { bad++; console.log(`FAIL ${lang}: outside the frame ${[...new Set(over)].join(',')} errors ${errors.join('|')}`); } else console.log(`ok   ${lang}: 8 screens, everything inside the frame`);
    await page.close();
  }
  await browser.close(); server.close(); process.exit(bad ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
