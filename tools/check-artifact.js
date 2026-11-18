// Opens a page built by single-file.js the way an artifact shows it, at phone size, and plays the first level
// with a real drag. Fails on any page error or a blank canvas. Usage: node tools/check-artifact.js <page.html> <screenshot.png>
const { chromium } = require('playwright'), fs = require('fs');
const [file, shot] = process.argv.slice(2);
(async () => {
  const b = await chromium.launch();
  const p = await (await b.newContext({ viewport: { width: 400, height: 780 }, hasTouch: true, isMobile: true })).newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(String(e)));
  await p.setContent(`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"></head><body>${fs.readFileSync(file, 'utf8')}</body></html>`);
  await p.waitForTimeout(1200);
  const box = await p.evaluate(() => { const r = document.getElementById('game').getBoundingClientRect(); return [r.left, r.top, r.width]; });
  const painted = await p.evaluate(() => { const d = document.getElementById('game').getContext('2d').getImageData(0, 0, 720, 1280).data; let n = 0; for (let i = 0; i < d.length; i += 4000) if (d[i + 3]) n++; return n; });
  const k = box[2] / 720; await p.mouse.move(box[0] + 290 * k, box[1] + 700 * k); await p.mouse.down(); await p.mouse.move(box[0] + 430 * k, box[1] + 702 * k, { steps: 8 }); await p.mouse.up();
  await p.waitForTimeout(1500); await p.screenshot({ path: shot });
  await b.close();
  const ok = !errs.length && painted > 100;
  console.log(ok ? 'ARTIFACT PAGE OK' : 'ARTIFACT PAGE FAIL', JSON.stringify({ errors: errs, painted }));
  process.exit(ok ? 0 : 1);
})();
