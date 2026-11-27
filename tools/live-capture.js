// Usage: node tools/live-capture.js <gameId>... -> cap/<id>/srcdoc.html (served page) + cap/<id>/msgs.json (host RUN_WITH_CONFIG)
// Capture each live game's served srcdoc and the host's RUN_WITH_CONFIG message (guest, phone).
const { chromium } = require('playwright'); const fs = require('fs');
const ids = process.argv.slice(2);
(async () => {
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const one = async (id) => {
    const dir = 'cap/' + id; fs.mkdirSync(dir, { recursive: true });
    const c = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    await c.addInitScript(() => { if (window === top) return; addEventListener('message', e => { const d = e.data; if (d && d.type && /RUN|CONFIG|INIT|START/.test(d.type)) { (window.__msgs = window.__msgs || []).push(JSON.stringify(d)); } }, true); });
    const p = await c.newPage();
    try {
      await p.goto('https://www.astrocade.com/games/x/' + id, { waitUntil: 'domcontentloaded', timeout: 45000 });
      let got = null;
      for (let i = 0; i < 40 && !got; i++) {
        await p.waitForTimeout(500);
        for (const f of p.frames()) { if (f === p.mainFrame()) continue; try { const m = await f.evaluate(() => window.__msgs || null); if (m && m.some(x => x.includes('RUN_WITH_CONFIG'))) got = { f, m }; } catch {} }
      }
      const sd = await p.evaluate(() => { const f = [...document.querySelectorAll('iframe')].find(f => f.srcdoc && f.srcdoc.length > 1000); return f ? f.srcdoc : null; });
      if (sd) fs.writeFileSync(dir + '/srcdoc.html', sd);
      if (got) fs.writeFileSync(dir + '/msgs.json', JSON.stringify(got.m.map(x => JSON.parse(x)), null, 1));
      console.log(id, 'srcdoc', sd ? sd.length : 0, 'msgs', got ? got.m.length : 0);
    } catch (e) { console.log(id, 'ERR', String(e).slice(0, 120)); }
    await c.close();
  };
  const q = [...ids]; await Promise.all([0, 1, 2, 3].map(async () => { while (q.length) await one(q.shift()); }));
  await b.close();
})();
