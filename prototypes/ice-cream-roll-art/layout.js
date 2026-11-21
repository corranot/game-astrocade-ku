// PROTOTYPE - NOT FOR PRODUCTION
// Layout check: measures the HUD on the main screens (720-unit design space) and reports spacing that is not
// even: outer margins left vs right, the top bar's heights and gaps, the order bubble and progress bar edges,
// the bottom block and tray centring, row gaps. Prints observations; exits 1 when a rule is off by more than 2 units.
// Usage: node layout.js
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const types = { '.js': 'text/javascript', '.html': 'text/html', '.json': 'application/json', '.webp': 'image/webp', '.mp3': 'audio/mpeg' };
const server = http.createServer((q, s) => { const f = path.join(__dirname, q.url.split('?')[0] === '/' ? 'index.html' : q.url.split('?')[0]); fs.readFile(f, (e, d) => { if (e) { s.writeHead(404); return s.end(); } s.writeHead(200, { 'content-type': types[path.extname(f)] || 'text/plain' }); s.end(d); }); }).listen(0);
const TOL = 2;
const fails = []; const note = (ok, m) => { console.log((ok ? 'ok   ' : 'OFF  ') + m); if (!ok) fails.push(m); };

/** Boxes of the named elements in design units (720 wide). */
const measure = (page, sels) => page.evaluate((sels) => {
  const a = document.querySelector('#app').getBoundingClientRect(), k = 720 / a.width, out = {};
  for (const [name, sel] of Object.entries(sels)) {
    const els = [...document.querySelectorAll(sel)].filter((e) => e.offsetParent && e.getBoundingClientRect().width);
    out[name] = els.map((e) => { const r = e.getBoundingClientRect(); return { l: (r.left - a.left) * k, r: (r.right - a.left) * k, t: (r.top - a.top) * k, b: (r.bottom - a.top) * k }; });
  }
  return out;
}, sels);
const near = (x, y) => Math.abs(x - y) <= TOL;

(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 360, height: 640 } });
  await page.addInitScript(() => { window.__preset = { cups: 2, coins: 70, owned: [], lastDaily: 29991231, todayDone: 29991231 }; });
  await page.goto(`http://localhost:${server.address().port}/?local`);
  await page.waitForFunction(() => window.__game && window.__game.saveLoaded && __game.S.step === 'pour', null, { timeout: 40000 });
  await page.evaluate(() => document.fonts.ready); await page.waitForTimeout(800);
  // measure the resting layout, not a pulse or bounce caught mid-animation
  await page.addStyleTag({ content: '*,*::before,*::after{animation:none!important;transition:none!important}' });
  const top = await measure(page, { items: '#hud .top > *:not(.sp)', bubble: '#bubble', bar: '#bar', cust: '#cust' });
  const it = top.items, H = it.map((b) => b.b - b.t), C = it.map((b) => (b.t + b.b) / 2);
  note(near(it[0].l, 720 - it[it.length - 1].r), `top bar: left margin ${it[0].l.toFixed(1)} = right margin ${(720 - it[it.length - 1].r).toFixed(1)}`);
  note(Math.max(...H) - Math.min(...H) <= TOL, `top bar: every item the same height (${H.map((h) => h.toFixed(0)).join(', ')})`);
  note(Math.max(...C) - Math.min(...C) <= TOL, 'top bar: items share one centre line');
  const gaps = []; for (let i = 1; i < it.length; i++) if (it[i].l - it[i - 1].r < 60) gaps.push(it[i].l - it[i - 1].r);
  note(gaps.length && Math.max(...gaps) - Math.min(...gaps) <= TOL, `top bar: equal gaps between neighbours (${gaps.map((g) => g.toFixed(1)).join(', ')})`);
  const bub = top.bubble[0], bar = top.bar[0];
  note(near(720 - bub.r, it[0].l), `order bubble: right margin ${(720 - bub.r).toFixed(1)} = page margin ${it[0].l.toFixed(1)}`);
  note(near(bub.t - Math.max(...it.map((b) => b.b)), gaps[0]), `order bubble: gap under the top bar ${(bub.t - Math.max(...it.map((b) => b.b))).toFixed(1)} = item gap`);
  note(near(bar.r, bub.r) && near(bar.l, bub.l), `progress bar: same left/right edges as the bubble (${bar.l.toFixed(1)}–${bar.r.toFixed(1)} vs ${bub.l.toFixed(1)}–${bub.r.toFixed(1)})`);
  note(near(bar.t - bub.b, gaps[0]), `progress bar: gap under the bubble ${(bar.t - bub.b).toFixed(1)} = item gap`);
  note(near(top.cust[0].l, it[0].l), `customer: left edge ${top.cust[0].l.toFixed(1)} = page margin`);
  for (const [step, label] of [[0, 'pour'], [4, 'draw'], [8, 'topping']]) {
    await page.evaluate((s) => { __game.go(s); if (s === 8) __game.addTop('whip'); }, step); await page.waitForTimeout(400);
    const low = await measure(page, { block: '#hud .low', rows: '#hud .low > *', slots: '#tray .slot', say: '#hud .say > *:not(:empty)' });
    const blk = low.block[0];
    note(near(blk.l, 720 - blk.r) && near(blk.l, it[0].l), `${label}: bottom block margins ${blk.l.toFixed(1)} / ${(720 - blk.r).toFixed(1)} = page margin`);
    const rows = low.rows.sort((a, b) => a.t - b.t), rg = []; for (let i = 1; i < rows.length; i++) rg.push(rows[i].t - rows[i - 1].b);
    note(rg.every((g) => near(g, gaps[0])), `${label}: gaps between rows = item gap (${rg.map((g) => g.toFixed(1)).join(', ')})`);
    if (low.slots.length) {
      const s = low.slots, mid = (Math.min(...s.map((b) => b.l)) + Math.max(...s.map((b) => b.r))) / 2, sg = [];
      for (let i = 1; i < s.length; i++) if (near(s[i].t, s[i - 1].t)) sg.push(s[i].l - s[i - 1].r);
      note(near(mid, 360), `${label}: tray centred (${mid.toFixed(1)})`);
      note(sg.every((g) => near(g, gaps[0])), `${label}: gaps between tray buttons = item gap (${[...new Set(sg.map((g) => g.toFixed(1)))].join(', ')})`);
    }
    if (low.say.length > 1) {
      const h = low.say.flatMap((b) => [b.b - b.t]);
      note(true, `${label}: action row heights ${h.map((x) => x.toFixed(0)).join(', ')}`);
    }
  }
  await browser.close(); server.close();
  console.log(fails.length ? `\n${fails.length} OFF` : '\nall even');
  process.exit(fails.length ? 1 : 0);
})().catch((e) => { console.error(e); server.close(); process.exit(1); });
