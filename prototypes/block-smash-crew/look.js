// PROTOTYPE - NOT FOR PRODUCTION
// Screens in every language at 720×1280 for the full-size look check: the demo, playing outside, inside the building
// (first person, looking at the vault), TOO HARD with the bomb hint, SMASH TIME, the result card and the panels; then the
// in-play HUD with every conditional element forced on screen (level cards, coach steps, many words at once, the
// smash-time clock with a tip and a wave banner, the NEXT pill). Fails when text leaves the frame or the HUD is off.
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
/**
 * Runs in the page: measures the in-play HUD in 720-unit design space, at rest (animations off while it measures).
 * The top bar starts and ends on the page margin with its tops on one line and its middle on the centre line; the
 * tool row runs from margin to margin with equal gaps on its bottom line, the price badges on the bottom margin;
 * HIT and the stick mirror each other about the centre line (HIT stays right in every language: the stick owns the
 * left thumb); no two HUD boxes overlap (top bar, tools with their badges, HIT, stick, the status lines, the level
 * card, the coach's label, the arrows to stars out of view, every word, the crosshair's clear zone, an open card); words stay in the eye-level band
 * with room for their way up; every tappable is at least 96 units. `expect` = names that must be on screen,
 * `words` = how many words at least, `hold` = leave the animations off (for the screenshot). Returns what is off.
 */
const hudGeo = (o = {}) => {
  const app = document.getElementById('app').getBoundingClientRect(), k = 720 / app.width, bad = [], TOL = 2, M = 20, TAP = 96, TOOL = 104, TOOLS_B = 34;
  if (!document.getElementById('freeze')) { const st = document.createElement('style'); st.id = 'freeze'; st.textContent = '.hud *, .hud *::before, .hud *::after{animation:none!important;transition:none!important}'; document.head.appendChild(st); }
  const $ = (s) => document.querySelector(s), $$ = (s) => [...document.querySelectorAll(s)];
  const vis = (e) => !!e && !e.closest('[hidden]') && !e.closest('.ghost') && e.offsetParent !== null && getComputedStyle(e).visibility !== 'hidden';
  const R = (e) => { const r = e.getBoundingClientRect(); return { l: (r.left - app.left) * k, r: (r.right - app.left) * k, t: (r.top - app.top) * k, b: (r.bottom - app.top) * k }; };
  const U = (rs) => ({ l: Math.min(...rs.map((r) => r.l)), r: Math.max(...rs.map((r) => r.r)), t: Math.min(...rs.map((r) => r.t)), b: Math.max(...rs.map((r) => r.b)) });
  const f = (v) => v.toFixed(1), off = (a, b) => Math.abs(a - b) > TOL, mid = (r) => (r.l + r.r) / 2;
  const boxes = [], add = (name, els) => { const rs = els.filter(vis).map(R).filter((r) => r.r > r.l && r.b > r.t); if (rs.length) boxes.push([name, U(rs)]); };
  const B = (n) => (boxes.find(([m]) => m === n) || [])[1];
  add('coins', [$('#coins'), $('#dot')]); add('stars', [$('#stars')]); add('wreck bar', [$('#bar')]); add('gear', [$('#gear')]); add('next pill', [$('#nextpill')]);
  for (const t of $$('.tool')) add('tool ' + t.dataset.t, [t, t.querySelector('.free'), t.querySelector('.lock')]);
  // a card is modal: it may stand over the control row (HIT and the stick wait behind its scrim), never over the bars
  const open = $$('.panel .card').some(vis);
  if (!open) { add('HIT', [$('#hit')]); add('stick', [$('#stickHome'), $('#stick')]); }
  add('smash-time clock', [$('#ftime')]); add('tip', [$('#tip')]); add('wave banner', [$('#wavebn')]); add('level card', [...$('#lvcard').children]); add('coach label', [$('#coach .clabel')]);
  $$('#arrows .arrow').forEach((a, i) => add('star arrow ' + i, [a]));
  $$('#pops .pop').forEach((p, i) => add(`word ${i} "${p.textContent.trim().slice(0, 14)}"`, [p]));
  for (const c of $$('.panel .card')) add('card ' + c.parentElement.id, [c]);
  if (vis($('#cross')) && !open) boxes.push(['crosshair zone', { l: 300, r: 420, t: 580, b: 700 }]);
  for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
    const [an, a] = boxes[i], [bn, b] = boxes[j], w = Math.min(a.r, b.r) - Math.max(a.l, b.l), h = Math.min(a.b, b.b) - Math.max(a.t, b.t);
    // a word may pass over an arrow to a star for its 0.9 s (a big one is as wide as the frame)
    if (w > 1 && h > 1 && !(an.startsWith('star arrow') && bn.startsWith('word'))) bad.push(`${an} and ${bn} overlap by ${f(w)} × ${f(h)}`);
  }
  for (const [n, r] of boxes) if (n.startsWith('word')) {
    const up = (r.b - r.t) * 0.4;
    if (r.l < 11 || r.r > 709) bad.push(`${n} leaves the frame sideways (${f(r.l)}…${f(r.r)})`);
    if (r.t - up < 155 || r.b > 921) bad.push(`${n} outside the eye-level band (${f(r.t - up)}…${f(r.b)})`);
  }
  for (const n of o.expect || []) if (!boxes.some(([m]) => m.startsWith(n))) bad.push(`${n} is not on screen`);
  const nw = boxes.filter(([m]) => m.startsWith('word')).length;
  if (o.words && nw < o.words) bad.push(`only ${nw} of ${o.words} words on screen`);
  const coins = vis($('#coins')) && R($('#coins')), gear = B('gear');
  if (coins && gear) {
    const l = Math.min(coins.l, gear.l), r = Math.max(coins.r, gear.r);
    if (off(l, M) || off(720 - r, M)) bad.push(`top bar margins ${f(l)} / ${f(720 - r)} ≠ ${M}`);
    if (off(coins.t, M) || off(gear.t, M)) bad.push(`top bar tops ${f(coins.t)} / ${f(gear.t)} ≠ ${M}`);
  }
  for (const n of ['stars', 'wreck bar', 'next pill', 'smash-time clock', 'tip', 'wave banner', 'level card']) { const r = B(n); if (r && off(mid(r), 360)) bad.push(`${n} not on the centre line (${f(mid(r))})`); }
  const tools = $$('.tool').filter(vis).map(R).sort((a, b) => a.l - b.l);
  if (tools.length) {
    const l = tools[0].l, r = tools[tools.length - 1].r, gaps = tools.slice(1).map((t, i) => t.l - tools[i].r), bot = Math.max(...tools.map((t) => t.b));
    if (off(l, M) || off(720 - r, M)) bad.push(`tool row margins ${f(l)} / ${f(720 - r)} ≠ ${M}`);
    if (off((l + r) / 2, 360)) bad.push(`tool row not centred (${f((l + r) / 2)})`);
    if (off(bot, 1280 - TOOLS_B)) bad.push(`tool row bottom ${f(1280 - bot)} ≠ ${TOOLS_B}`);
    if (Math.max(...gaps) - Math.min(...gaps) > 1) bad.push(`tool gaps differ (${gaps.map(f).join(' / ')})`);
    if (tools.some((t) => off(t.r - t.l, TOOL) || off(t.b - t.t, TOOL))) bad.push('a tool is not ' + TOOL + ' square');
    const locks = $$('.tool .lock').filter(vis).map(R);
    if (locks.length && off(1280 - Math.max(...locks.map((x) => x.b)), M)) bad.push(`price badges ${f(1280 - Math.max(...locks.map((x) => x.b)))} from the bottom ≠ ${M}`);
  }
  const hit = B('HIT'), st = !open && vis($('#stickHome')) && R($('#stickHome'));
  if (hit && st) {
    if (off(mid(hit) + mid(st), 720)) bad.push(`HIT (${f(mid(hit))}) and the stick (${f(mid(st))}) are not mirrored about the centre line`);
    if (off((hit.t + hit.b) / 2, (st.t + st.b) / 2)) bad.push(`HIT and the stick are not on one line (${f((hit.t + hit.b) / 2)} / ${f((st.t + st.b) / 2)})`);
    if (mid(hit) < 360) bad.push('HIT is not on the right');
  }
  for (const el of $$('.tool, #hit, #gear, #coins, #nextpill').filter(vis)) {
    const af = getComputedStyle(el, '::after'), has = af.content !== 'none', w = Math.max(el.offsetWidth, has ? parseFloat(af.width) || 0 : 0) * k, h = Math.max(el.offsetHeight, has ? parseFloat(af.height) || 0 : 0) * k;
    if (w < TAP - 0.5 || h < TAP - 0.5) bad.push(`tappable ${el.id || el.className} ${w.toFixed(0)}×${h.toFixed(0)} < ${TAP}`);
  }
  if (!o.hold) document.getElementById('freeze').remove();
  return bad;
};
/**
 * Runs in the page: the six shop cards share one rhythm. Each has its icon, a name, three stat lines and something
 * where the level stands (an owned tool's level and bar, a locked tool's FREE / LOCKED state); the stat lines start
 * at the same height in the cards of a row; the header shows the coins in hand.
 */
const shopGeo = () => {
  const bad = [], app = document.getElementById('app').getBoundingClientRect(), k = 720 / app.width, rows = [...document.querySelectorAll('#shop .srow')];
  if (rows.length !== 6) bad.push(`shop: ${rows.length} cards`);
  const tops = rows.map((r) => { const fx = [...r.querySelectorAll('.fx')], lv = r.querySelector('.slv'); if (fx.length !== 3) bad.push(`shop card ${r.querySelector('.snm').textContent}: ${fx.length} stat lines, not 3`); if (!lv || !lv.children.length || lv.getBoundingClientRect().height < 8) bad.push(`shop card ${r.querySelector('.snm').textContent}: nothing where the level stands`); return fx.length ? [(fx[0].getBoundingClientRect().top - r.getBoundingClientRect().top) * k, (lv.getBoundingClientRect().top - r.getBoundingClientRect().top) * k] : [0, 0]; });
  for (let i = 0; i + 1 < tops.length; i += 2) { if (Math.abs(tops[i][0] - tops[i + 1][0]) > 2) bad.push(`shop row ${i / 2 + 1}: stat lines start at ${tops[i][0].toFixed(1)} / ${tops[i + 1][0].toFixed(1)}`); if (Math.abs(tops[i][1] - tops[i + 1][1]) > 2) bad.push(`shop row ${i / 2 + 1}: level / state at ${tops[i][1].toFixed(1)} / ${tops[i + 1][1].toFixed(1)}`); }
  const bal = document.querySelector('#shop .phead .pbal b');
  if (!bal || bal.textContent.trim() !== document.querySelector('#coins b').textContent.trim()) bad.push(`shop header coins "${bal && bal.textContent}" ≠ the top bar's`);
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
    // the in-play HUD's geometry; with a name for the screenshot the animations stay off until it is taken
    const hud = async (name, expect, shotName, words) => { const r = await g(hudGeo, { expect, words, hold: !!shotName }); if (shotName) { await shot(shotName); await g(() => { const st = document.getElementById('freeze'); if (st) st.remove(); }); } return r.map((m) => `${name}: ${m}`); };
    const settle = (ms) => page.waitForTimeout(ms);
    await page.waitForTimeout(1500); await shot('1-demo'); over.push(...await overflow(), ...await textOk());
    // a player who has done the walk / look / smash lessons (the coach screens are journey.js's)
    await g(() => { Object.assign(__game.save.learned, { walk: true, drag: true, hit: true }); __game.newLevel(0); const W = __game.W; __game.WD.aimHammer(W, { type: 'block', x: Math.floor(W.chest.x), y: 1, z: W.box.z1, nx: 0, ny: 0, nz: 1 }, true); });
    // enough coins for something in the shop: the red "!" on the coins
    await g(() => { __game.save.coins = 12000; });
    await page.waitForTimeout(1800); await shot('2-play'); over.push(...await overflow(), ...await textOk(), ...await hud('play', ['tip', 'coins', 'stars', 'wreck bar', 'gear', 'HIT', 'stick', 'tool hammer']));
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
    await page.waitForTimeout(350); await shot('4-too-hard'); over.push(...await overflow(), ...await textOk(), ...await hud('too hard', []));
    await g(() => { const W = __game.W; W.got = 3; W.phase = 'fever'; W.fever = 8; __game.onEvent({ type: 'fever' }); __game.WD.useTool(W, 'bomb', { x: W.chest.x, y: 1, z: W.chest.z }); });
    await page.waitForTimeout(700); await shot('5-smash-time'); over.push(...await overflow(), ...await textOk(), ...await hud('smash time', ['smash-time clock']));
    // the next wave's banner and a celebration (wave cleared: fanfare, big words, confetti)
    await g(() => { const W = __game.W; W.wave.t = window.gameConfig.waves.every; __game.onEvent({ type: 'waveClear', n: 1, coins: 300 }); });
    await page.waitForTimeout(80); await g(() => __game.WD.step(__game.W, 0.05).forEach((e) => __game.onEvent(e)));
    await page.waitForTimeout(900); await shot('5b-wave'); over.push(...await overflow(), ...await textOk(), ...await hud('wave', ['smash-time clock', 'wave banner']));
    // the fullest result card: NEXT, KEEP SMASHING, the daily challenge and the share button
    await g(() => { const W = __game.W; __game.save.level = Math.max(2, __game.save.level); __game.save.dailyDone = 0; W.fever = 0; W.phase = 'free'; __game.onEvent({ type: 'clear' }); });
    await page.waitForTimeout(1200); await shot('6-result'); over.push(...await overflow(), ...await textOk(), ...await g(panelGeo, true), ...await hud('result', ['card panel']));
    await g(() => { document.querySelector('#keepBtn').click(); const s = __game.save; s.coins = 30000; s.owned = ['hammer', 'bomb', 'rocket']; s.lv = { hammer: window.gameConfig.upgrade.max, bomb: 1, rocket: 6 }; __game.W.tried.add('hole'); s.best = { 0: 2, 1: 1, 3: 2 }; document.querySelector('#coins').click(); document.querySelectorAll('.card, .card *').forEach((e) => { e.style.animation = 'none'; }); });
    await page.waitForTimeout(400); await shot('7-shop'); over.push(...await overflow(), ...await textOk(), ...await g(panelGeo, true), ...await hud('shop', ['card shop']), ...await g(shopGeo));
    await g(() => { document.querySelector('[data-tab=album]').click(); document.querySelectorAll('.card, .card *').forEach((e) => { e.style.animation = 'none'; }); });
    await page.waitForTimeout(400); await shot('8-album'); over.push(...await overflow(), ...await textOk(), ...await g(panelGeo, true));
    // the settings panel (sound and the languages): its buttons too
    await g(() => { document.querySelector('#shopX').click(); document.querySelector('#gear').click(); document.querySelectorAll('.card, .card *').forEach((e) => { e.style.animation = 'none'; }); });
    await page.waitForTimeout(300); await shot('9-settings'); over.push(...await overflow(), ...await textOk(), ...await g(panelGeo, true));
    // ---- the in-play HUD with every conditional element forced on screen, measured and looked at
    // the fewest things a result card can hold: every tool owned (one meter), today's challenge done (two quiet buttons)
    await g(() => { const G = __game, s = G.save; G.newLevel(1); s.owned = window.gameConfig.tools.map((t) => t.id); s.dailyDone = 1e9; G.W.fever = 0; G.W.phase = 'free'; G.onEvent({ type: 'clear' }); });
    await settle(1300); over.push(...await overflow(), ...await textOk(), ...await g(panelGeo, true), ...await hud('result (smallest)', ['card panel'], '6b-result-min'));
    // level cards: plain, boss, daily; words stay up long enough to be measured and photographed
    await g(() => { const G = __game, s = G.save; s.owned = ['hammer', 'bomb']; s.dailyDone = 0; s.coins = 12000; Object.assign(s.learned, { walk: true, drag: true, hit: true, bomb: true }); G.words.life = 8000; G.newLevel(2); });
    await settle(700); over.push(...await textOk(), ...await hud('level card', ['level card', 'tip', 'HIT', 'stick', 'coins', 'gear'], 'h1-card'));
    await g(() => __game.newLevel(4));
    await settle(700); over.push(...await textOk(), ...await hud('boss card', ['level card', 'tip'], 'h1b-card-boss'));
    if (!await g(() => !!__game.W.boss && !!document.querySelector('#lvcard .lvtag svg.ico'))) over.push('boss card: no BOSS tag with its crown');
    await g(() => __game.newLevel(33, { daily: true }));
    await settle(700); over.push(...await textOk(), ...await hud('daily card', ['level card', 'tip'], 'h1c-card-daily'));
    if (!await g(() => !!document.querySelector('#lvcard .lvtag.d svg.ico'))) over.push('daily card: no DAILY tag with its calendar');
    // the four coach steps, each held on screen
    await g(() => { __game.newLevel(2); document.getElementById('lvcard').hidden = true; });
    for (const step of ['walk', 'look', 'hit', 'bomb']) { await g((s) => __game.coachHold(s), step); await settle(300); over.push(...await textOk(), ...await hud('coach ' + step, ['coach label'], step === 'look' ? 'h2-coach-look' : step === 'bomb' ? 'h2b-coach-bomb' : null)); }
    await g(() => __game.coachHold(null)); await settle(200);
    // many words at once: three banners, three words and four coin counts on one spot, one on the crosshair, one on
    // the tool bar, the thumbs-up, the trophy and a tool's icon
    await g(() => { const G = __game, T = G.T; G.words.up.length = 0; document.querySelectorAll('#pops .pop').forEach((p) => p.remove()); G.banner(T('kaboom'), 'p-big', -80); G.banner(T('timber'), 'p-big', -80); G.banner(T('record', '1,234'), 'p-big', -40); for (let i = 0; i < 3; i++) G.pop(T('bonk'), 360, 530, 'p-mid', '#7dfcff'); for (let i = 0; i < 4; i++) G.pop('+30', 360, 600, 'p-coin'); G.pop(T('crash'), 360, 640, 'p-mid', '#ffb02e'); G.pop(T('star'), 200, 1100, 'p-mid', '#ffe14a'); G.pop(T('great'), 360, 470, 'p-mid', '#7dff9a', 'thumb'); G.starPop(); G.popIcon('rocket', 360, 830); });
    over.push(...await hud('many words', ['tip'], 'h3-words', 8));
    await g(() => { __game.words.up.length = 0; document.querySelectorAll('#pops .pop').forEach((p) => p.remove()); });
    // smash time with its clock, a tip and the wave banner at once (three status lines) and its own big words
    await g(() => { const G = __game, W = G.W; W.got = 3; W.phase = 'fever'; W.fever = 8; G.onEvent({ type: 'fever' }); G.setTip('find'); G.waveBanner(2); });
    await settle(500); over.push(...await textOk(), ...await hud('smash time + tip + wave', ['smash-time clock', 'tip', 'wave banner', 'word'], 'h4-fever-wave'));
    // KEEP SMASHING: the NEXT pill under the wreck bar pushes the status lines down
    await g(() => { const G = __game, W = G.W; G.words.up.length = 0; document.querySelectorAll('#pops .pop').forEach((p) => p.remove()); W.fever = 0; W.phase = 'free'; G.onEvent({ type: 'clear' }); document.querySelector('#keepBtn').click(); G.setTip('find'); G.waveBanner(3); G.banner(G.T('kaboom'), 'p-big', -80); });
    await settle(500); over.push(...await textOk(), ...await hud('keep smashing', ['next pill', 'tip', 'wave banner', 'word'], 'h5-keep'));
    // reduced motion: words and banners still stand on screen for their time
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const still = await g(async () => { const G = __game; G.words.life = 950; G.words.up.length = 0; document.querySelectorAll('#pops .pop').forEach((p) => p.remove()); G.banner(G.T('kaboom'), 'p-big', -80); G.waveBanner(2); G.newLevel(5); await new Promise((r) => setTimeout(r, 450)); const o = (s) => { const e = document.querySelector(s); return e ? +(+getComputedStyle(e).opacity).toFixed(2) : -1; }; return [o('#pops .pop'), o('#wavebn'), o('#lvcard')]; });
    if (still.some((v) => v < 0.9)) over.push(`reduced motion: a word, the wave banner or the level card cannot be read (opacity ${still.join(' / ')})`);
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    if (over.length || errors.length) { bad++; console.log(`FAIL ${lang}: ${[...new Set(over)].join(' | ')} errors ${errors.join('|')}`); } else console.log(`ok   ${lang}: 20 screens, everything inside the frame, text fits, touch targets ≥ 96, 4 panels on one spacing system, the in-play HUD measured in 16 states (no overlap, margins, mirror, words clear of the crosshair), six shop cards on one rhythm`);
    await page.close();
  }
  await browser.close(); server.close(); process.exit(bad ? 1 : 0);
};
module.exports = { panelGeo, hudGeo, shopGeo };
if (require.main === module) {
  if (!out) { console.error('usage: node look.js <out folder> [langs]'); process.exit(1); }
  fs.mkdirSync(out, { recursive: true });
  main().catch((e) => { console.error(e); process.exit(1); });
}
