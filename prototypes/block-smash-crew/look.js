// PROTOTYPE - NOT FOR PRODUCTION
// Screens in every language at 720×1280 for the full-size look check: the demo, playing outside, inside the building
// (first person, looking at the vault), TOO HARD with the bomb hint, SMASH TIME, and the result card. Fails when text leaves the frame.
// Usage: node look.js <out folder> [langs comma-separated]
const fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const { serve, open, GPU } = require('./playtest.js');
const out = process.argv[2]; const langs = (process.argv[3] || 'en,ar,es,vi,hi,bn,id').split(',');
/**
 * Runs in the page: measures every open panel card (result card, shop, album, settings) in 720-unit design space.
 * One spacing system: the card centred with the page margin left and right and clear of the top bar and the tool
 * bar; every child the same distance from both sides; rows on the card's inner margin (2 × margin + border); the
 * first and last child the inner margin from the top and the bottom (+ the button shadow); cards and buttons that
 * share a row are one height and columns share their edges; the close button in the far corner; one primary button.
 * Returns the list of what is off by more than 2 units. `expect` = a panel must be on screen.
 */
const panelGeo = (expect) => {
  const app = document.getElementById('app').getBoundingClientRect(), k = 720 / app.width, bad = [], TOL = 2, M = 20, INNER = 48, DROP = 7, GAPIN = 12;
  const R = (e) => { const r = e.getBoundingClientRect(); return { l: (r.left - app.left) * k, r: (r.right - app.left) * k, t: (r.top - app.top) * k, b: (r.bottom - app.top) * k, h: r.height * k }; };
  const vis = (e) => !e.closest('[hidden]') && !e.closest('.ghost') && e.offsetParent !== null;
  const off = (a, b) => Math.abs(a - b) > TOL, f = (v) => v.toFixed(1);
  const cards = [...document.querySelectorAll('.panel .card')].filter(vis);
  if (expect && !cards.length) bad.push('no panel on this screen');
  for (const card of cards) {
    card.style.animation = 'none'; for (const e of card.querySelectorAll('*')) e.style.animation = 'none';
    const name = card.parentElement.id + (card.querySelector('.agrid') ? ' album' : ''), c = R(card), say = (m) => bad.push(`${name}: ${m}`);
    if (off(c.l, M) || off(720 - c.r, M)) say(`card not centred on the page margin (${f(c.l)} / ${f(720 - c.r)})`);
    const top = R(document.getElementById('bar')).b, tools = Math.min(...[...document.querySelectorAll('.tool, .tool .free')].filter(vis).map((e) => R(e).t));
    if (c.t < top - TOL) say(`card covers the top bar (card top ${f(c.t)}, bar bottom ${f(top)})`);
    if (c.b > tools + TOL) say(`card covers the tool bar (card bottom ${f(c.b)}, tools top ${f(tools)})`);
    const kids = [...card.children].filter((e) => vis(e) && !e.classList.contains('rays')).map((e) => [e, R(e)]);
    for (const [e, r] of kids) if (off(r.l - c.l, c.r - r.r)) say(`${e.className.split(' ')[0]} left ${f(r.l - c.l)} ≠ right ${f(c.r - r.r)}`);
    if (kids.length) { const a = kids[0][1], z = kids[kids.length - 1][1]; if (off(a.t - c.t, INNER)) say(`top inner margin ${f(a.t - c.t)} ≠ ${INNER}`); if (off(c.b - z.b, INNER + DROP)) say(`bottom inner margin ${f(c.b - z.b)} ≠ ${INNER + DROP}`); }
    for (const e of [...card.querySelectorAll('.phead, .pbody, .meter, .btns, .brow, .sgrid, .agrid, .langs, #mute')].filter(vis)) { const r = R(e); if (off(r.l - c.l, INNER) || off(c.r - r.r, INNER)) say(`${e.id || e.className.split(' ')[0]} edges ${f(r.l - c.l)} / ${f(c.r - r.r)} ≠ ${INNER}`); }
    for (const grid of [...card.querySelectorAll('.sgrid, .agrid, .langs, .brow')].filter(vis)) {
      const g = R(grid), cells = [...grid.children].filter(vis).map(R), gn = grid.className.split(' ')[0], rows = {}, cols = {};
      for (const r of cells) { (rows[Math.round(r.t / 4)] = rows[Math.round(r.t / 4)] || []).push(r); (cols[Math.round(r.l / 4)] = cols[Math.round(r.l / 4)] || []).push(r); }
      for (const row of Object.values(rows)) { const hs = row.map((r) => r.h); if (Math.max(...hs) - Math.min(...hs) > 1) say(`${gn}: a row's heights differ (${hs.map(f).join(' / ')})`); }
      for (const col of Object.values(cols)) if (col.some((r) => off(r.l, col[0].l) || off(r.r, col[0].r))) say(`${gn}: a column's edges differ`);
      if (cells.length && (off(Math.min(...cells.map((r) => r.l)), g.l) || off(Math.max(...cells.map((r) => r.r)), g.r))) say(`${gn}: cells do not reach both edges`);
    }
    const prices = [...card.querySelectorAll('.pbtn')].filter(vis).map((e) => [R(e), R(e.closest('.tile'))]);
    for (const [b, t] of prices) { if (off(b.l - t.l, GAPIN) || off(t.r - b.r, GAPIN) || off(t.b - b.b, GAPIN)) say(`price button margins in its card ${f(b.l - t.l)} / ${f(t.r - b.r)} / ${f(t.b - b.b)} ≠ ${GAPIN}`); if (Math.abs(b.h - prices[0][0].h) > 1) say(`price buttons differ in height (${f(b.h)} / ${f(prices[0][0].h)})`); }
    const px = card.querySelector('.px');
    if (px && vis(px)) { const r = R(px), h = R(card.querySelector('.phead')), rtl = getComputedStyle(card).direction === 'rtl', end = rtl ? r.l - c.l : c.r - r.r; if (off(end, INNER)) say(`close button ${f(end)} from its corner ≠ ${INNER}`); if (off((r.t + r.b) / 2, (h.t + h.b) / 2)) say('close button off the header line'); }
    const pri = [...card.querySelectorAll('.btn.pri')].filter(vis).length;
    if (pri > 1) say(`${pri} primary buttons`);
  }
  return bad;
};
const main = async () => {
  const server = serve(), browser = await chromium.launch({ args: GPU }); let bad = 0;
  for (const lang of langs) {
    // a host that can share: the ✈️ button shows
    const { page, errors } = await open(browser, '', { port: server.address().port, locale: lang, dpr: 2, touch: true, init: 'window.__share = true;' }); // phone layout: stick + HIT
    const g = (fn, a) => page.evaluate(fn, a), shot = (n) => page.screenshot({ path: path.join(out, `${lang}-${n}.jpg`), type: 'jpeg', quality: 82 });
    const overflow = () => g(() => { const a = document.getElementById('app').getBoundingClientRect(); return [...document.querySelectorAll('.pop, .tip, .title, .card, .btn, .meter, .stat, .tool, .pill, .bar, .srow, .pbtn, .atile, .anm, .snm, .wavebn, .brag, .dot, .hitbtn')].filter((el) => !el.closest('[hidden]') && !el.closest('.ghost') && el.offsetParent !== null).map((el) => [el.className, el.getBoundingClientRect()]).filter(([, r]) => r.width && (r.left < a.left - 1 || r.right > a.right + 1)).map(([c]) => c); });
    // every text inside its own box (not clipped, not spilling), no text under 12 units, the result buttons one
    // width; the panels' own geometry (centred, even margins, shared edges) is panelGeo's
    const textOk = () => g(() => {
      const bad = [], a = document.getElementById('app').getBoundingClientRect(), k = 720 / a.width;
      for (const el of document.querySelectorAll('.tip, .clabel, .title, .btn .tx, .tab, .anm, .snm, .pbtn, .need, .stry, .fx, .lvnm, .lvtag, .free, .ptitle .tx, .plabel .tx, .mlab, .mval, .stat, .hl, .brag, .wavebn, .slv b')) {
        if (el.closest('[hidden]') || el.closest('.ghost') || !el.offsetParent || !el.textContent.trim()) continue;
        const fs = parseFloat(getComputedStyle(el).fontSize);
        // sideways only: a line-height 1 box always lets accents and outlines stand out above and below
        if (el.scrollWidth > el.clientWidth + 1) bad.push(`text spills: ${el.className} "${el.textContent.trim().slice(0, 16)}" ${el.scrollWidth}>${el.clientWidth}`);
        if (fs * k < 12) bad.push(`text too small: ${el.className} ${(fs * k).toFixed(1)}`);
      }
      // offsetWidth: NEXT pulses (a scale), its layout width does not
      // every touch target at least 96×96 units (Astrocade), counting the invisible tap area of smaller pills
      for (const el of document.querySelectorAll('button, .coins, .tool')) {
        if (el.closest('[hidden]') || el.closest('.ghost') || !el.offsetParent || getComputedStyle(el).pointerEvents === 'none' || el.closest('.hud.edit')) continue;
        const r = el.getBoundingClientRect(), af = getComputedStyle(el, '::after'), aw = af.content !== 'none' ? parseFloat(af.width) || 0 : 0, ah = af.content !== 'none' ? parseFloat(af.height) || 0 : 0;
        const w = Math.max(el.offsetWidth, aw) * k, h = Math.max(el.offsetHeight, ah) * k;
        if (w < 95.5 || h < 95.5) bad.push(`touch target ${el.id || el.className} ${w.toFixed(0)}×${h.toFixed(0)}`);
      }
      // the quiet buttons under NEXT share one row: one width, one height (panelGeo measures the rest of every panel)
      const bs = [...document.querySelectorAll('#panel .brow .btn')].filter((b) => !b.closest('[hidden]') && !b.closest('.ghost')).map((b) => Math.round(b.offsetWidth * k));
      if (bs.length > 1 && Math.max(...bs) - Math.min(...bs) > 1) bad.push('result buttons differ: ' + bs.join('/'));
      return bad;
    });
    const over = [];
    await page.waitForTimeout(1500); await shot('1-demo'); over.push(...await overflow(), ...await textOk());
    // a player who has done the walk / look / smash lessons (the coach screens are journey.js's)
    await g(() => { Object.assign(__game.save.learned, { walk: true, drag: true, hit: true }); __game.newLevel(0); const W = __game.W; __game.WD.aimHammer(W, { type: 'block', x: Math.floor(W.chest.x), y: 1, z: W.box.z1, nx: 0, ny: 0, nz: 1 }, true); });
    // enough coins for something in the shop: the red "!" on the coins
    await g(() => { __game.save.coins = 12000; });
    await page.waitForTimeout(1800); await shot('2-play'); over.push(...await overflow(), ...await textOk());
    // the wave close by: robots facing the hero, signs raised, in this language
    await g(() => { const W = __game.W; __game.WD.aimHammer(W, null); W.hero.x = (W.box.x0 + W.box.x1) / 2 + 0.5; W.hero.z = W.box.z1 + 7; W.hero.yaw = Math.PI; __game.scene.look(-__game.scene.yaw, -__game.scene.pitch - 0.05); for (const b of W.bots) if (b.state === 'march') { b.x = W.hero.x + (b.x - W.hero.x) * 0.5; b.z = Math.min(W.hero.z - 1.5, b.z); } });
    await page.waitForFunction(() => __game.W.bots.filter((b) => b.near && b.sign >= 0).length >= 3, null, { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(1500); await shot('2b-crowd'); over.push(...await overflow(), ...await textOk());
    const signs = await g((l) => { const W = __game.W, list = window.gameConfig.signs[l]; return W.bots.filter((b) => b.sign >= 0).map((b) => __game.scene.signOf(b.id)).filter(Boolean).map((x) => x.text === list[x.k]); }, lang);
    if (!signs.length || signs.some((x) => !x)) over.push(`signs not in ${lang}: ${signs.join(',')}`);
    // inside: the hero in the room in front of the vault, roof peeled away
    await g(() => { const W = __game.W; __game.WD.aimHammer(W, null); W.hero.x = W.chest.x + 0.5; W.hero.z = W.chest.z + 4; __game.scene.look(-__game.scene.yaw, -__game.scene.pitch - 0.2); });
    await page.waitForTimeout(1600); await shot('3-inside'); over.push(...await overflow(), ...await textOk());
    await g(() => { const W = __game.W; __game.onEvent({ type: 'tooHard', x: W.chest.x, y: 1, z: W.chest.z + 2 }); });
    await page.waitForTimeout(350); await shot('4-too-hard'); over.push(...await overflow(), ...await textOk());
    await g(() => { const W = __game.W; W.got = 3; W.phase = 'fever'; W.fever = 8; __game.onEvent({ type: 'fever' }); __game.WD.useTool(W, 'bomb', { x: W.chest.x, y: 1, z: W.chest.z }); });
    await page.waitForTimeout(700); await shot('5-smash-time'); over.push(...await overflow(), ...await textOk());
    // the next wave's banner and a celebration (wave cleared: fanfare, big words, confetti)
    await g(() => { const W = __game.W; W.wave.t = window.gameConfig.waves.every; __game.onEvent({ type: 'waveClear', n: 1, coins: 300 }); });
    await page.waitForTimeout(80); await g(() => __game.WD.step(__game.W, 0.05).forEach((e) => __game.onEvent(e)));
    await page.waitForTimeout(900); await shot('5b-wave'); over.push(...await overflow(), ...await textOk());
    // the fullest result card: NEXT, KEEP SMASHING, the daily challenge and the share button
    await g(() => { const W = __game.W; __game.save.level = Math.max(2, __game.save.level); __game.save.dailyDone = 0; W.fever = 0; W.phase = 'free'; __game.onEvent({ type: 'clear' }); });
    await page.waitForTimeout(1200); await shot('6-result'); over.push(...await overflow(), ...await textOk(), ...await g(panelGeo, true));
    await g(() => { document.querySelector('#keepBtn').click(); const s = __game.save; s.coins = 30000; s.owned = ['hammer', 'bomb', 'rocket']; s.lv = { hammer: window.gameConfig.upgrade.max, bomb: 1, rocket: 6 }; __game.W.tried.add('hole'); s.best = { 0: 2, 1: 1, 3: 2 }; document.querySelector('#coins').click(); document.querySelectorAll('.card, .card *').forEach((e) => { e.style.animation = 'none'; }); });
    await page.waitForTimeout(400); await shot('7-shop'); over.push(...await overflow(), ...await textOk(), ...await g(panelGeo, true));
    await g(() => { document.querySelector('[data-tab=album]').click(); document.querySelectorAll('.card, .card *').forEach((e) => { e.style.animation = 'none'; }); });
    await page.waitForTimeout(400); await shot('8-album'); over.push(...await overflow(), ...await textOk(), ...await g(panelGeo, true));
    // the settings panel (sound and the languages): its buttons too
    await g(() => { document.querySelector('#shopX').click(); document.querySelector('#gear').click(); document.querySelectorAll('.card, .card *').forEach((e) => { e.style.animation = 'none'; }); });
    await page.waitForTimeout(300); await shot('9-settings'); over.push(...await overflow(), ...await textOk(), ...await g(panelGeo, true));
    if (over.length || errors.length) { bad++; console.log(`FAIL ${lang}: ${[...new Set(over)].join(' | ')} errors ${errors.join('|')}`); } else console.log(`ok   ${lang}: 11 screens, everything inside the frame, text fits, touch targets ≥ 96, 4 panels on one spacing system`);
    await page.close();
  }
  await browser.close(); server.close(); process.exit(bad ? 1 : 0);
};
module.exports = { panelGeo };
if (require.main === module) {
  if (!out) { console.error('usage: node look.js <out folder> [langs]'); process.exit(1); }
  fs.mkdirSync(out, { recursive: true });
  main().catch((e) => { console.error(e); process.exit(1); });
}
