// Short Dragon playtest on the served page: boot (fresh profile auto-flies), hold TAME on the auto-targeted wild
// dragon, release on RED, repeat; records page errors, physics readiness and whether a tame card appeared.
const { chromium } = require('playwright'); const fs = require('fs');
const sd = fs.readFileSync(process.argv[2], 'utf8'), out = process.argv[3];
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 405, height: 720 }, hasTouch: true, isMobile: true });
  const p = await ctx.newPage(); const errs = [], logs = [];
  p.on('pageerror', e => errs.push(e.message.slice(0, 200))); p.on('console', m => { const t = m.text(); if (/physics|error|fail|tame/i.test(t)) logs.push(t.slice(0, 160)); });
  await p.route('http://game.test/', r => r.fulfill({ contentType: 'text/html', body: sd }));
  await p.goto('http://game.test/'); await p.evaluate(() => { window.__ov = 0; window.__tc = 0; setInterval(() => { const tc = document.getElementById('tcard'), nc = document.getElementById('newCard'); if (tc) window.__tc++; if (tc && nc && +getComputedStyle(nc).opacity > 0.1) window.__ov++; }, 100); });
  await p.waitForTimeout(9000); await p.screenshot({ path: out + '-a.jpg', quality: 60, type: 'jpeg' });
  const st = await p.evaluate(() => ({ tameBtn: !!document.querySelector('#tame'), card: !!document.querySelector('#newCard.on, #newCard.show') }));
  let cards = 0;
  for (let k = 0; k < 6; k++) {
    const btn = await p.$('#tame'); if (!btn) break; const bb = await btn.boundingBox(); if (!bb) break;
    await p.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2); await p.mouse.down();
    for (let i = 0; i < 40; i++) { await p.waitForTimeout(150); const red = await p.evaluate(() => { const e = document.querySelector('#tame'); return e && /red/.test(e.className); }); if (red) { await p.mouse.up(); for (let j = 0; j < 20 && await p.evaluate(() => /red/.test(document.querySelector('#tame').className)); j++) await p.waitForTimeout(80); await p.mouse.down(); } }
    await p.mouse.up(); await p.waitForTimeout(1500);
    if (await p.evaluate(() => { const c = document.querySelector('#newCard'); return !!c && getComputedStyle(c).display !== 'none' && getComputedStyle(c).opacity > 0.5; })) { cards++; console.log('DOM', JSON.stringify(await p.evaluate(() => { const t = document.querySelector('#title'), c = document.querySelector('#newCard .in').getBoundingClientRect(); const cs = getComputedStyle(t); return { titleCls: t.className, stageCls: document.querySelector('#stage').className, op: cs.opacity, vis: cs.visibility, disp: cs.display, ncT: document.querySelector('#ncT').textContent, at: document.elementsFromPoint(c.x + c.width / 2, c.y + 12).slice(0, 5).map(e => e.id || e.className) }; }))); await p.screenshot({ path: out + '-card' + cards + '.jpg', quality: 60, type: 'jpeg' }); await p.mouse.click(200, 650); await p.waitForTimeout(800); }
  }
  await p.screenshot({ path: out + '-b.jpg', quality: 60, type: 'jpeg' });
  console.log(JSON.stringify({ ov: await p.evaluate(() => window.__ov), tc: await p.evaluate(() => window.__tc), st, cards, errs, logs: logs.slice(-8) })); await b.close();
})();
