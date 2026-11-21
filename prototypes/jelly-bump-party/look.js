// PROTOTYPE - NOT FOR PRODUCTION
// Screens in every language at 720x1280 for the full-size look check: demo, a round banner on a special floor,
// a bump word, a power-up word, four players (turned words for the top seats) and the result card with a new hat.
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
    const { page, errors } = await open(browser, '', { port: server.address().port, locale: lang });
    const g = (fn, a) => page.evaluate(fn, a), shot = (n) => page.screenshot({ path: path.join(out, `${lang}-${n}.png`) });
    await page.waitForTimeout(1200); await shot('1-demo');
    // a solo match, round 2 on the icy floor, frozen just after its banners
    await g(() => { __game.newMatch([0], { firstGo: 0 }); const M = __game.M; M.round = 1; M.blobs.forEach((b) => { if (b.seat > 1) { b.out = true; b.fall = 1; } }); });
    await page.waitForFunction(() => __game.M.round === 2, null, { timeout: 20000 });
    await page.waitForTimeout(450); await shot('2-round');
    // words over blobs: a power-up and a bump
    await page.waitForFunction(() => __game.M.phase === 'play', null, { timeout: 5000 });
    await g(() => { const M = __game.M; M.items = [{ kind: 'star', x: M.blobs[0].x, z: M.blobs[0].z, t: 0 }]; });
    await page.waitForTimeout(250); await shot('3-power');
    // four people: banners turned for the top seats
    await g(() => { __game.newMatch([0, 1, 2, 3], { firstGo: 1.2 }); });
    await page.waitForTimeout(200); await g(() => { const M = __game.M; M.timer = 0.01; });
    await page.waitForTimeout(250); await shot('4-four-players');
    // the result card with a new hat
    await g(() => { const M = __game.M; __game.save.total = 11; M.blobs.forEach((b, i) => { b.crowns = [3, 1, 0, 2][i]; b.kos = [4, 2, 1, 0][i]; b.human = i === 0; }); M.phase = 'done'; M.matchWinner = 0; M.timer = 99; __game.results(); });
    await page.waitForTimeout(700); await shot('5-result');
    // every visible text box stays inside the frame
    const over = await g(() => { const a = document.getElementById('app').getBoundingClientRect(); return [...document.querySelectorAll('.pop, .title, .row, .newhat, .big, .share, .tip:not([hidden]), .join')].filter((el) => !el.closest('[hidden]') && el.offsetParent !== null).map((el) => [el.className, el.getBoundingClientRect()]).filter(([, r]) => r.width && (r.left < a.left - 1 || r.right > a.right + 1)).map(([c]) => c); });
    if (over.length || errors.length) { bad++; console.log(`FAIL ${lang}: outside frame ${over.join(',')} errors ${errors.join('|')}`); } else console.log(`ok   ${lang}: 5 screens, text inside the frame`);
    await page.close();
  }
  await browser.close(); server.close(); process.exit(bad ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
