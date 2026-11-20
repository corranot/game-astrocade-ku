// PROTOTYPE - NOT FOR PRODUCTION
// Serves many customers in one page and fails on errors, a broken save, lost feedback or things that keep growing.
// Usage: node soak.js [customers]
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const customers = +process.argv[2] || 14;
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.webp': 'image/webp' };
const server = http.createServer((q, r) => {
  const f = path.join(__dirname, decodeURIComponent(q.url.split('?')[0]).replace(/^\/$/, '/index.html'));
  fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); } else { r.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' }); r.end(d); } });
});
let failed = 0;
const ok = (cond, what) => { console.log((cond ? '  ok  ' : '  FAIL ') + what); if (!cond) failed++; };
(async () => {
  await new Promise((r) => server.listen(0, r));
  const browser = await chromium.launch();
  const page = await (await browser.newContext({ viewport: { width: 720, height: 1280 } })).newPage();
  const errors = []; page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(`http://127.0.0.1:${server.address().port}/index.html?local&cfg=${encodeURIComponent(JSON.stringify({ revealSeconds: 2 }))}`);
  await page.waitForFunction(() => window.__game && window.__game.S && window.__frames > 3);
  // count sounds that are started, so feedback lost in later customers shows up
  await page.evaluate(() => { window.__snd = 0; for (const k of ['createOscillator', 'createBufferSource']) { const o = AudioContext.prototype[k]; AudioContext.prototype[k] = function () { window.__snd++; return o.call(this); }; } });
  await page.mouse.click(700, 1250); // the first touch starts the sound
  const G = (f, a) => page.evaluate(f, a);
  const swipe = async (pts) => { await page.mouse.move(pts[0][0], pts[0][1]); await page.mouse.down(); for (const p of pts.slice(1)) await page.mouse.move(p[0], p[1], { steps: 3 }); await page.mouse.up(); };
  const step = (n) => page.waitForFunction((n) => window.__game.S.step === n && window.__game.S.enter === 0, n, { timeout: 15000 });
  const perCustomer = [];
  for (let c = 0; c < customers; c++) {
    await page.waitForFunction((c) => window.__game.S.n === c && window.__game.view === 'play', c, { timeout: 15000 }); await step(0);
    const s0 = await G(() => window.__snd);
    for (let k = 0; k < 40 && await G(() => window.__game.S.step === 0 && window.__game.S.rinse < 0); k++) await swipe(Array.from({ length: 13 }, (_, j) => [60 + 50 * j, 300 + (k % 8) * 85 + Math.sin(j) * 30]));
    await step(1);
    for (let k = 0; k < 8 && await G(() => window.__game.S.step === 1); k++) { const y = await G(() => window.__game.guide()[0][1]); await swipe(Array.from({ length: 13 }, (_, j) => [50 + 52 * j, y - 6])); }
    await step(2);
    for (let k = 0; k < 40 && await G(() => window.__game.S.step === 2); k++) {
      for (const col of await G(() => window.__game.S.order.cols)) {
        for (let t = 0; t < 3; t++) { const j = await G((col) => window.__game.pageItems().items.findIndex((it) => it.id === col), col); const [x, y] = await G((j) => window.__game.slotXY(j >= 0 ? j : 11), j); await page.mouse.click(x, y); if (j >= 0) break; }
        const pts = await G((col) => { const g = window.__game, out = []; for (const s of g.S.hair.strands) for (let i = 1; i <= s.len; i++) if (g.wantedAt(s, i) === col && (s.col[i] !== col || !s.mark[i]) && s.y[i] < g.TRAY_Y - 10) out.push([Math.round(s.x[i]), Math.round(s.y[i])]); const k = Math.max(1, Math.ceil(out.length / 40)); return out.filter((_, i) => i % k === 0); }, col);
        if (pts.length > 1) await swipe(pts);
        if (!await G(() => window.__game.S.step === 2)) break;
      }
    }
    await step(3); await page.mouse.move(360, 440); await page.mouse.down(); await step(4); await page.mouse.up();
    const j = await G(() => window.__game.pageItems().items.findIndex((it) => it.id === window.__game.S.order.acc));
    const [ax, ay] = await G((j) => window.__game.slotXY(Math.max(0, j)), j); await page.mouse.click(ax, ay);
    const ck = await G(() => window.__game.CHECK); await page.mouse.click(ck.x + 56, ck.y + 56);
    await page.waitForFunction(() => window.__game.S.reveal > 1.0, null, { timeout: 15000 });
    perCustomer.push(await G((s0) => window.__snd - s0, s0));
    if (c === 2 || c === 9) { await page.mouse.click(552, 68); await page.waitForTimeout(200); await page.mouse.click(360, 1010); await page.waitForTimeout(150); } // visit the wall and come back
  }
  const st = await G(() => ({ save: JSON.parse(JSON.stringify(window.__game.save)), photos: window.__game.photos, parts: window.__game.parts, pieces: window.__game.S.hair.pieces.length }));
  ok(errors.length === 0, 'no page errors ' + errors.join(' | '));
  ok(st.save.n === customers, `the save counts every customer (${st.save.n})`);
  ok(st.save.wall.length === Math.min(9, customers) && st.photos <= 9, `the wall keeps the last 9 photos and no more canvases (${st.save.wall.length}, ${st.photos})`);
  ok(JSON.stringify(st.save).length < 40000, `the save stays small (${JSON.stringify(st.save).length} bytes)`);
  ok(st.parts <= 200 && st.pieces <= 40, `particles and falling hair stay capped (${st.parts}, ${st.pieces})`);
  ok(st.save.stars >= customers * 2, `stars keep coming (${st.save.stars} for ${customers})`);
  const first = perCustomer.slice(0, 3), last = perCustomer.slice(-3);
  ok(last.every((n, i) => n > 10 && n >= first[i] * 0.5), `sounds still play for the last customers (first ${first} / last ${last})`);
  await browser.close(); server.close();
  console.log(failed ? `SOAK FAIL (${failed})` : 'SOAK PASS'); process.exit(failed ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
