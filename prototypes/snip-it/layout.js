// PROTOTYPE - NOT FOR PRODUCTION
// Layout check: measures the HUD in 720-unit frame space on three screens (start, sticker card, win bar) in all
// 8 languages and reports spacing that is not on the one system: page margin M, gap G, control height H.
// Rules: left margin = right margin = M; the top row on one line and one height; neighbours G apart; the win bar's
// buttons from margin to margin with room for the shadow; centred things centred; every word inside its box; every
// icon centred in its box; touch targets at least 96; no two boxes touching. Animations are off while measuring.
// Prints observations; exits 1 when a rule is off by more than 2 units.
// Usage: node layout.js [out folder for screens]
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const out = process.argv[2];
const types = { '.js': 'text/javascript', '.html': 'text/html', '.json': 'application/json' };
const server = http.createServer((q, s) => { const f = path.join(__dirname, q.url.split('?')[0] === '/' ? 'index.html' : q.url.split('?')[0]); fs.readFile(f, (e, d) => { if (e) { s.writeHead(404); return s.end(); } s.writeHead(200, { 'content-type': types[path.extname(f)] || 'text/plain' }); s.end(d); }); }).listen(0);
const TOL = 2, M = 20, G = 12, H = 96, SHADOW = 8, BORDER = 4;
const LANGS = { en: 'en-US', id: 'id-ID', es: 'es-ES', hi: 'hi-IN', ar: 'ar-SA', vi: 'vi-VN', bn: 'bn-BD', pt: 'pt-BR' };
const fails = []; let oks = 0;
const note = (ok, m) => { if (ok) oks++; else { console.log('OFF  ' + m); fails.push(m); } };
const near = (a, b) => Math.abs(a - b) <= TOL;
const f = (n) => (Math.round(n * 10) / 10).toString();

/** Boxes of the HUD in frame units: { id: { l, t, r, b, w, h, cx, cy } } for what is shown, plus words and icons. */
const MEASURE = () => {
  const root = document.querySelector('#app'), R = root.getBoundingClientRect(), u = R.width / 720;
  const box = (e) => { const r = e.getBoundingClientRect(); return { l: (r.left - R.left) / u, t: (r.top - R.top) / u, r: (r.right - R.left) / u, b: (r.bottom - R.top) / u, w: r.width / u, h: r.height / u, cx: (r.left + r.width / 2 - R.left) / u, cy: (r.top + r.height / 2 - R.top) / u }; };
  const shown = (e) => e && !e.hidden && e.offsetParent !== null && e.getBoundingClientRect().width > 0;
  const boxes = {};
  for (const id of ['lvl', 'book', 'mute', 'prompt', 'toast', 'bar', 'again', 'next']) { const e = root.querySelector('#' + id); if (shown(e)) boxes[id] = box(e); }
  const got = root.querySelector('.got'); if (shown(got)) boxes.got = box(got);
  const words = [...root.querySelectorAll('[data-fit]')].filter(shown).map((e) => ({ id: e.id, over: e.scrollWidth - e.clientWidth, size: parseFloat(getComputedStyle(e).fontSize) / u, box: box(e) }));
  const icons = [...root.querySelectorAll('.ic')].filter(shown).map((e) => ({ of: e.parentElement.closest('.pill,.toast,.got,.again,.next').id || 'got', box: box(e), host: box(e.parentElement.closest('.pill,.toast,.got,.again,.next')) }));
  // the first and last child of each padded box, to compare its inner margins
  const inner = {}; for (const [id, sel] of [['lvl', '#lvl'], ['book', '#book'], ['toast', '#toast'], ['got', '.got'], ['again', '#again'], ['next', '#next']]) { const e = root.querySelector(sel); if (!shown(e)) continue; const kids = [...e.children].filter(shown).map(box); if (kids.length) inner[id] = { l: Math.min(...kids.map((k) => k.l)) - box(e).l, r: box(e).r - Math.max(...kids.map((k) => k.r)) }; }
  return { boxes, words, icons, inner, rtl: root.dir === 'rtl' };
};

function rules(tag, m) {
  const B = m.boxes, say = (ok, msg) => note(ok, `${tag}: ${msg}`);
  // top row
  const top = ['lvl', 'book', 'mute'].map((k) => B[k]).sort((a, b) => a.l - b.l);
  say(near(top[0].l, M) && near(720 - top[2].r, M), `top row margins left ${f(top[0].l)} / right ${f(720 - top[2].r)} (want ${M})`);
  say(top.every((b) => near(b.t, M) && near(b.h, H)), `top row on one line, one height (tops ${top.map((b) => f(b.t)).join('/')}, heights ${top.map((b) => f(b.h)).join('/')})`);
  const pair = m.rtl ? [top[0], top[1]] : [top[1], top[2]];
  say(near(pair[1].l - pair[0].r, G), `sticker and sound buttons ${f(pair[1].l - pair[0].r)} apart (want ${G})`);
  say(near(B.mute.w, H) && B.book.w >= H - TOL, `touch targets on top: sound ${f(B.mute.w)}, stickers ${f(B.book.w)} (at least ${H})`);
  // the centred column
  let under = M + H;
  if (B.prompt) { say(near(B.prompt.t - under, G) && near(B.prompt.cx, 360), `prompt ${f(B.prompt.t - under)} under the top row (want ${G}), centre ${f(B.prompt.cx)}`); under = B.prompt.b; }
  if (B.toast) say(near(B.toast.t - under, G) && near(B.toast.cx, 360) && near(B.toast.h, H) && B.toast.l >= M - TOL && B.toast.r <= 720 - M + TOL, `sticker card ${f(B.toast.t - under)} under its neighbour (want ${G}), centre ${f(B.toast.cx)}, height ${f(B.toast.h)}, inside the margins`);
  // the win bar
  if (B.bar) {
    const row = [B.again, B.next].sort((a, b) => a.l - b.l);
    say(near(row[0].l, M) && near(720 - row[1].r, M), `buttons from margin to margin (left ${f(row[0].l)}, right ${f(720 - row[1].r)})`);
    say(near(row[1].l - row[0].r, G), `buttons ${f(row[1].l - row[0].r)} apart (want ${G})`);
    say(near(row[0].t, row[1].t) && near(row[0].h, row[1].h) && near(row[0].h, H * 1.25), `buttons one line, one height (${f(row[0].h)} / ${f(row[1].h)}, want ${H * 1.25})`);
    say(near(1280 - B.next.b, M + SHADOW), `button to the bottom edge ${f(1280 - B.next.b)} (want ${M} + shadow ${SHADOW})`);
    say(near(B.again.t - B.got.b, G) && near(B.got.cx, 360), `result pill ${f(B.again.t - B.got.b)} above the buttons (want ${G}), centre ${f(B.got.cx)}`);
    say(B.again.w >= H - TOL && B.next.w >= H - TOL, `touch targets: again ${f(B.again.w)}, next ${f(B.next.w)}`);
    say((m.rtl ? B.next.l < B.again.l : B.next.l > B.again.l), 'NEXT sits on the reading-end side');
  }
  // inner margins of padded boxes: the same on both sides, and the page margin where the box is not centred content
  for (const [id, v] of Object.entries(m.inner)) say(near(v.l, v.r) && v.l >= M + BORDER - TOL, `${id} inner margins ${f(v.l)} / ${f(v.r)} (equal, at least ${M + BORDER})`);
  // words and icons
  for (const w of m.words) say(w.over <= 1 && w.size >= 16, `words of ${w.id} fit their box (over by ${w.over}, size ${f(w.size)})`);
  for (const i of m.icons) say(near(i.box.cy, i.host.cy) && near(i.box.w, i.box.h), `icon in ${i.of} centred (${f(i.box.cy - i.host.cy)} off) and square (${f(i.box.w)} x ${f(i.box.h)})`);
  // nothing touches
  const names = Object.keys(B).filter((k) => k !== 'bar');
  for (let i = 0; i < names.length; i++) for (let j = i + 1; j < names.length; j++) { const a = B[names[i]], b = B[names[j]]; say(a.r <= b.l || b.r <= a.l || a.b <= b.t || b.b <= a.t, `${names[i]} and ${names[j]} do not touch`); }
}

(async () => {
  if (out) fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const port = server.address().port;
  for (const [lang, locale] of Object.entries(LANGS)) {
    const page = await browser.newPage({ viewport: { width: 360, height: 640 }, deviceScaleFactor: 2, locale });
    const errors = []; page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(`http://localhost:${port}/?local`);
    await page.waitForFunction(() => window.__game && window.__game.W && document.fonts.status === 'loaded', null, { timeout: 40000 });
    await page.addStyleTag({ content: '.hud *{animation:none!important;transition:none!important}' });
    await page.waitForTimeout(300);
    const shot = (n) => (out ? page.screenshot({ path: path.join(out, `${lang}-${n}.jpg`), type: 'jpeg', quality: 80 }) : null);
    const swipe = async (id) => { const [x, y] = await page.evaluate((id) => { const p = __game.ropeAt(id); return __game.client(p[0], p[1]); }, id); await page.mouse.move(x - 40, y); await page.mouse.down(); await page.mouse.move(x + 40, y, { steps: 5 }); await page.mouse.up(); };
    const ids = await page.evaluate(() => ({ gag: __game.level.items.find((x) => x.result === 'gag').id, win: __game.level.items.find((x) => x.result === 'win').id }));
    rules(`${lang} start`, await page.evaluate(MEASURE)); await shot('1-start');
    await swipe(ids.gag); await page.waitForFunction(() => !document.querySelector('#toast').hidden, null, { timeout: 9000 });
    rules(`${lang} sticker card`, await page.evaluate(MEASURE)); await shot('2-card');
    await page.waitForFunction(() => !__game.busy, null, { timeout: 9000 });
    await swipe(ids.win); await page.waitForFunction(() => !document.querySelector('#bar').hidden, null, { timeout: 9000 }); await page.waitForTimeout(200);
    rules(`${lang} win bar`, await page.evaluate(MEASURE)); await shot('3-bar');
    // the level map and the sticker book
    const SHEET = () => { const root = document.querySelector('#app'), R = root.getBoundingClientRect(), u = R.width / 720; const box = (e) => { const r = e.getBoundingClientRect(); return { l: (r.left - R.left) / u, t: (r.top - R.top) / u, r: (r.right - R.left) / u, b: (r.bottom - R.top) / u, w: r.width / u, h: r.height / u }; };
      const q = (s) => [...root.querySelectorAll(s)].map(box); const body = root.querySelector('#sheetB');
      return { panel: box(root.querySelector('.panel')), head: box(root.querySelector('.head')), close: box(root.querySelector('#close')), rows: q('.wrow'), wic: q('.wic'), lv: q('.wrow:first-child .lv'), stk: q('.wrow:first-child .stk'), over: body.scrollWidth - body.clientWidth, rtl: root.dir === 'rtl' }; };
    const sheet = (tag, m, kind) => { const say = (ok, msg) => note(ok, `${lang} ${tag}: ${msg}`);
      say(near(m.panel.l, M) && near(720 - m.panel.r, M) && near(m.panel.t, M) && near(1280 - m.panel.b, M), `sheet margins ${f(m.panel.l)}/${f(720 - m.panel.r)}/${f(m.panel.t)}/${f(1280 - m.panel.b)} (want ${M})`);
      say(near(m.head.h, H) && near(m.head.t - m.panel.t, M + BORDER) && near(m.close.w, H) && near(m.close.h, H), `head row height ${f(m.head.h)}, ${f(m.head.t - m.panel.t)} from the edge, close button ${f(m.close.w)} x ${f(m.close.h)}`);
      say(near(m.rtl ? m.close.l - m.panel.l : m.panel.r - m.close.r, M + BORDER), 'close button on the inner margin');
      say(near(m.rows[0].t - m.head.b, G) && m.rows.slice(1).every((r, i) => near(r.t - m.rows[i].b, G)), `rows ${G} apart (first ${f(m.rows[0].t - m.head.b)})`);
      say(m.wic.every((w) => near(w.w, H) && near(w.h, H)) && m.over <= 1, `world icons ${H} square, nothing spills sideways (${m.over})`);
      const cells = (kind === 'map' ? m.lv : m.stk).sort((a, b) => a.t - b.t || a.l - b.l), row = cells.filter((c) => near(c.t, cells[0].t));
      if (kind === 'map') say(row.length === 5 && row.every((c) => near(c.h, H) && c.w >= H - TOL) && row.slice(1).every((c, i) => near(c.l - row[i].r, G)), `five level buttons, ${f(row[0].w)} x ${f(row[0].h)}, ${G} apart`);
      else say(row.length === 8 && row.every((c) => near(c.w, c.h) && near(c.w, row[0].w)) && row.slice(1).every((c, i) => near(c.l - row[i].r, G / 2)), `eight square sticker slots of ${f(row[0].w)}, ${G / 2} apart`);
    };
    await page.setViewportSize({ width: 360, height: 640 }); await page.waitForTimeout(200);
    await page.click('#lvl', { force: true }); await page.waitForTimeout(150); sheet('map', await page.evaluate(SHEET), 'map'); await shot('4-map'); await page.click('#close', { force: true });
    await page.click('#book', { force: true }); await page.waitForTimeout(150); sheet('book', await page.evaluate(SHEET), 'book'); await shot('5-book'); await page.click('#close', { force: true });
    // a narrow and a wide window: the frame scales, the rules hold
    await page.setViewportSize({ width: 300, height: 700 }); await page.waitForTimeout(250); rules(`${lang} win bar, narrow window`, await page.evaluate(MEASURE));
    note(errors.length === 0, `${lang}: no errors ${errors.join(' | ')}`);
    await page.close();
  }
  await browser.close(); server.close();
  console.log(fails.length ? `\n${fails.length} OFF (${oks} ok)` : `\nall ${oks} measurements on the system (M ${M}, G ${G}, H ${H}; tolerance ${TOL})`);
  process.exit(fails.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
