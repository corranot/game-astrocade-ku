// QA harness: serve pulled draft, stub lib, play through screens, screenshot.
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = process.argv[2], OUT = process.argv[3], VW = +process.argv[4], VH = +process.argv[5], TAG = `${VW}x${VH}`;
const types = { '.js': 'text/javascript', '.html': 'text/html', '.json': 'application/json' };
const srv = http.createServer((q, r) => { const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0]) === '/' ? 'index.html' : decodeURIComponent(q.url.split('?')[0])); fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' }); r.end(d); }); });
const assetMap = fs.readFileSync(path.join(ROOT, 'asset_map.json'), 'utf8');
const report = []; const note = (k, ok, d = '') => { report.push({ k, ok, d }); console.log((ok ? 'PASS ' : 'FAIL ') + k + ' ' + d); };
(async () => {
  await new Promise((r) => srv.listen(0, r)); const port = srv.address().port;
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: VW, height: VH }, deviceScaleFactor: 2, hasTouch: false });
  const p = await ctx.newPage(); const errs = [];
  p.on('pageerror', (e) => errs.push('pageerror ' + e.message)); p.on('console', (m) => { if (m.type() === 'error') errs.push('console ' + m.text()); });
  await p.addInitScript((am) => {
    const A = JSON.parse(am); window.__RUB_DEV = 1; window.__shares = []; window.__logs = []; let st = null;
    window.lib = { getAsset: (id) => A[id] || null, log: (m) => window.__logs.push(String(m)), haptics: () => {},
      getUserGameState: async () => ({ state: st }), saveUserGameState: async (s) => { st = s; return { success: true }; },
      share: async (o) => { window.__shares.push(o); return { success: true }; }, showGameParameters: () => {} };
    window.addEventListener('load', () => setTimeout(() => window.run('play'), 50));
  }, assetMap);
  const t0 = Date.now();
  await p.goto(`http://127.0.0.1:${port}/index.html`);
  await p.waitForFunction(() => window.__rub && window.__rub().scr === 'menu', null, { timeout: 30000 });
  note('load-to-menu', true, `${Date.now() - t0} ms (local, unthrottled)`);
  const go = (fnName) => p.evaluate(async (n) => { const ui = await import('./modules/ui.js'); const g = window.__rubGoFn; const h = ui.hits.find((h) => h.fn === g[n]); return h ? { x: h.x + h.w / 2, y: h.y + h.h / 2, w: h.w, h: h.h } : null; }, fnName);
  const toClient = (pt) => p.evaluate((pt) => { const r = document.getElementById('c').getBoundingClientRect(); return { x: r.left + pt.x * r.width / 720, y: r.top + pt.y * r.height / 1280 }; }, pt);
  const click = async (pt) => { const c = await toClient(pt); await p.mouse.click(c.x, c.y); };
  const tapFn = async (n) => { const h = await go(n); if (!h) return false; await p.waitForTimeout(400); await click(h); await p.waitForTimeout(700); return true; };
  const shot = async (name) => { await p.screenshot({ path: path.join(OUT, `${name}-${TAG}.jpg`), type: 'jpeg', quality: 82 }); };
  const hitsNow = () => p.evaluate(async () => { const ui = await import('./modules/ui.js'); const g = window.__rubGoFn; const names = Object.keys(g); return ui.hits.map((h) => ({ x: h.x, y: h.y, w: h.w, h: h.h, n: names.find((k) => g[k] === h.fn) || 'anon' })); });
  const overlaps = (hs) => { const o = []; for (let i = 0; i < hs.length; i++) for (let j = i + 1; j < hs.length; j++) { const a = hs[i], c = hs[j]; if (a.x < c.x + c.w && c.x < a.x + a.w && a.y < c.y + c.h && c.y < a.y + a.h) o.push(`${a.n}x${c.n}`); } return o; };
  const rub = async () => {
    for (let k = 0; k < 40; k++) {
      const st = await p.evaluate(() => { const l = window.__lv; return l && l.target ? { fixed: l.fixed, c: l.target.center(l.t), w: l.target.w, h: l.target.h } : null; });
      if (!st) return false; if (st.fixed) return true;
      const r = Math.min(st.w, st.h) * 0.3; const s = await toClient(st.c); await p.mouse.move(s.x, s.y); await p.mouse.down();
      for (let a = 0; a < 24; a++) { const q = await toClient({ x: st.c.x + Math.cos(a) * r, y: st.c.y + Math.sin(a * 1.3) * r }); await p.mouse.move(q.x, q.y, { steps: 2 }); }
      await p.mouse.up();
    }
    return false;
  };
  const nextLv = async () => { const n0 = (await st()).n; for (let i = 0; i < 8; i++) { await tapFn('next'); await p.waitForTimeout(500); const s1 = await st(); if (s1.n !== n0 || s1.scr !== 'play') return true; } return false; };
  const waitResult = () => p.waitForFunction(() => window.__rub().result, null, { timeout: 15000 }).then(() => true, () => false);
  const st = () => p.evaluate(() => window.__rub());

  if (process.env.STICKER) {
    await p.evaluate(() => { window.__rubS.ftue = true; window.__rubGo(3); }); await p.waitForTimeout(1500);
    for (let k = 0; k < 6; k++) {
      const d = await p.evaluate(() => { const l = window.__lv; const q = (l.things || []).find((t) => t.role === 'decoy'); return q ? Object.assign(q.center(l.t), { r: Math.min(q.w, q.h) * 0.3 }) : null; }); console.log('decoy', JSON.stringify(d));
      if (!d) break; const c = await toClient(d); await p.mouse.move(c.x, c.y); await p.mouse.down();
      for (let a = 0; a < 60; a++) { const q = await toClient({ x: d.x + Math.cos(a) * d.r, y: d.y + Math.sin(a * 1.3) * d.r }); await p.mouse.move(q.x, q.y, { steps: 2 }); } await p.mouse.up(); await p.waitForTimeout(600);
      const g = await p.evaluate(() => window.__rubS.gags[2]); if (g) break;
    }
    const g = await p.evaluate(() => window.__rubS.gags[2]); note('sticker-found-by-wrong-rub', g > 0, 'bits ' + g);
    await p.waitForTimeout(2500); await shot('20-hud-sticker-found');
    await p.evaluate(() => { window.__rubGoFn.map(); }); await p.waitForTimeout(2500); await shot('21-map-sticker-icon');
  } else {
  await shot('01-menu-first');
  // FTUE: tap play
  await click({ x: 360, y: 640 }); await p.waitForTimeout(1500);
  let s = await st(); note('ftue-level1-opens', s.scr === 'play' && s.n === 1, JSON.stringify({ scr: s.scr, n: s.n }));
  const ftueOn = await p.evaluate(() => !!(window.__lv && window.__lv.ftue)); note('ftue-active', ftueOn);
  await shot('02-ftue-spotlight');
  const skipH = await go('skipFtue'); note('ftue-skip-button', !!skipH);
  // a miss to show the guide line
  await click({ x: 120, y: 1100 }); await p.waitForTimeout(800); await shot('03-ftue-after-miss');
  note('L1-rub-fix', await rub()); note('L1-result', await waitResult()); await p.waitForTimeout(1200); await shot('04-ftue-next-spotlight');
  for (let n = 2; n <= 6; n++) {
    await nextLv(); await p.waitForTimeout(900); s = await st();
    if (s.n !== n) { note(`open-L${n}`, false, JSON.stringify(s)); break; }
    const ok = await rub() && await waitResult(); if (!ok) note(`L${n}-solve`, false);
  }
  await p.waitForTimeout(2500); await shot('05-world-end-card');
  let hs = await hitsNow(); const nx = hs.find((h) => h.n === 'next'), sh = hs.find((h) => h.n === 'share');
  note('worldend-next+share-present', !!(nx && sh), JSON.stringify({ nx, sh }));
  if (nx && sh) note('worldend-share-beside-next', Math.abs((nx.y + nx.h / 2) - (sh.y + sh.h / 2)) < 2 && nx.h === sh.h, `next y${nx.y} h${nx.h} / share y${sh.y} h${sh.h}; gap ${Math.round(Math.max(sh.x - (nx.x + nx.w), nx.x - (sh.x + sh.w)))}; margins L${Math.round(Math.min(nx.x, sh.x))} R${Math.round(720 - Math.max(nx.x + nx.w, sh.x + sh.w))}`);
  note('worldend-no-hit-overlap', overlaps(hs).length === 0, overlaps(hs).join(','));
  await tapFn('share'); await p.waitForTimeout(500);
  let shares = await p.evaluate(() => window.__shares); note('worldend-share-no-image', shares.length === 1 && !('image' in shares[0]), JSON.stringify(shares));
  // levels 7-10 for the surprise gift
  for (let n = 7; n <= 10; n++) { await nextLv(); await p.waitForTimeout(900); const ok = await rub() && await waitResult(); if (!ok) note(`L${n}-solve`, false); }
  await p.waitForTimeout(1500); const gift = await p.evaluate(() => !!(window.__lv && window.__lv.gift)); note('gift-after-10-solves', gift);
  await shot('06-gift-surprise-pill'); hs = await hitsNow(); note('gift-no-hit-overlap', overlaps(hs).length === 0, overlaps(hs).join(','));
  if (gift) { await tapFn('gift'); await p.waitForTimeout(1200); await shot('07-gift-open'); }
  // map
  await tapFn('map'); await p.waitForTimeout(900); s = await st(); note('map-opens', s.scr === 'map'); await shot('08-map');
  hs = await hitsNow(); note('map-no-hit-overlap', overlaps(hs).length === 0, overlaps(hs).join(','));
  // menu returning
  await tapFn('menu'); await p.waitForTimeout(900); await shot('09-menu-returning');
  hs = await hitsNow(); note('menu-no-hit-overlap', overlaps(hs).length === 0, overlaps(hs).join(',')); console.log('menu hits', JSON.stringify(hs));
  // settings
  await tapFn('settings'); await p.waitForTimeout(900); s = await st(); note('settings-opens', s.scr === 'settings'); await shot('10-settings');
  await tapFn('back'); await p.waitForTimeout(700);
  // today's picture
  const d = await tapFn('daily'); s = await st(); note('daily-opens', d && s.scr === 'play', JSON.stringify({ n: s.n }));
  await shot('11-daily-level'); const dok = await rub() && await waitResult(); note('daily-solve', dok); await p.waitForTimeout(1500); await shot('12-daily-result');
  await tapFn('next'); await p.waitForTimeout(700); await tapFn('menu'); await p.waitForTimeout(900); await shot('13-menu-today-collected');
  // finale: level 72 then end screen
  await p.evaluate(() => { const S = window.__rubS; for (let i = 0; i < 71; i++) S.stars[i] = Math.max(1, S.stars[i]); window.__rubGo(72); }); await p.waitForTimeout(1200);
  const fok = await rub() && await waitResult(); note('L72-solve', fok); await p.waitForTimeout(2500); await shot('14-L72-world-end');
  await nextLv(); await p.waitForTimeout(1500); s = await st(); note('end-screen', s.scr === 'end'); await shot('15-end-72');
  hs = await hitsNow(); note('end-has-share', hs.some((h) => h.n === 'shareAll')); note('end-no-hit-overlap', overlaps(hs).length === 0, overlaps(hs).join(','));
  await tapFn('shareAll'); await p.waitForTimeout(500); shares = await p.evaluate(() => window.__shares); const last = shares[shares.length - 1]; note('end-share-no-image', !!last && !('image' in last) && /72/.test(JSON.stringify(last)), JSON.stringify(last));
  // feed handover: edit then play (intro on)
  await p.evaluate(() => window.run('edit')); await p.waitForTimeout(1500); await shot('16-edit-mode');
  await p.evaluate(() => window.run('play')); const ho = await p.waitForFunction(() => window.__rub && ['menu', 'loading'].includes(window.__rub().scr), null, { timeout: 15000 }).then(() => true, () => false);
  await p.waitForTimeout(2000); s = await st(); note('feed-handover-edit-then-play', ho && s.scr === 'menu', s.scr); await shot('17-after-handover');
  await click({ x: 360, y: 640 }); await p.waitForTimeout(1200); s = await st(); note('handover-play-works', s.scr === 'play', `n=${s.n}`);
  }
  note('no-console-errors', errs.length === 0, errs.slice(0, 5).join(' | '));
  const logs = await p.evaluate(() => window.__logs); console.log('lib.log', JSON.stringify(logs.slice(0, 10)));
  fs.writeFileSync(path.join(OUT, `report-${TAG}.json`), JSON.stringify(report, null, 1));
  await b.close(); srv.close();
})().catch((e) => { console.error('HARNESS', e); process.exit(1); });
