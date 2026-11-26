/* Touch-first canvas screens for play, the permanent level/sticker map, settings and results. All visible controls have generous hit areas and share one layout system. */
import { W, H, INK, COL, FONT, clamp, ease, rr, fillStroke, label, fitSize, fitLines, labelLines, drawStar, drawBulb, drawTrophy } from './util.js';
import { drawHand } from './hand.js';
import { sprite, background, isReal } from './assets.js';
import { t, isJoined, isRtl } from './strings.js';
import { Fx } from './fx.js';
import { LEVEL_COUNT } from './save.js';
import { LEVELS } from './levels.js';

export const hits = [];
export const tap = (x, y, w, h, fn) => hits.push({ x, y, w, h, fn });
export function pick(p) {
  for (let i = hits.length - 1; i >= 0; i--) { const h = hits[i]; if (p.x >= h.x && p.x <= h.x + h.w && p.y >= h.y && p.y <= h.y + h.h) return h; }
  return null;
}

const EDGE = { green: COL.greenDk, blue: '#1f5f9c' };
export function button(g, cx, cy, w, h, text, fn, time, size, pulse = 0.03, kind = 'green', deco = null) {
  const edge = EDGE[kind];
  const p = 1 + Math.sin(time * 5) * pulse;
  tap(cx - w / 2, cy - h / 2, w, h, fn);
  g.save(); g.translate(cx, cy); g.scale(p, p);
  rr(g, -w / 2, -h / 2 + 10, w, h, 32); fillStroke(g, edge, 7);
  rr(g, -w / 2, -h / 2, w, h, 32);
  const gr = g.createLinearGradient(0, -h / 2, 0, h / 2); gr.addColorStop(0, '#4ad45c'); gr.addColorStop(1, '#27a53c');
  const gb = g.createLinearGradient(0, -h / 2, 0, h / 2); gb.addColorStop(0, '#4a9ee0'); gb.addColorStop(1, '#2f7fc4');
  fillStroke(g, kind === 'blue' ? gb : gr, 7);
  label(g, text, 0, 2, fitSize(g, text, size || h * 0.48, w - 56), '#fff', { stroke: edge, lw: 9 });
  if (deco) deco(g, w, h);
  g.restore();
}

const worldOf = (bg) => ['kitchen', 'pond', 'zoo', 'town', 'space', 'beach', 'castle', 'sea', 'fair', 'jungle', 'snow'].find((w) => bg.indexOf(w) >= 0) || 'garden';
/** A small framed picture of level n's scene (cover-cropped background); a scene not loaded yet shows a plain card, never a text placeholder. */
// a scene's cover crop, drawn once into a small canvas at 2x and reused every frame (a full background scaled down each frame is costly on phones)
const thumbCache = new Map();
function thumbCanvas(bg, w, h) {
  const key = bg + '|' + w + '|' + h;
  let c = thumbCache.get(key);
  if (!c) {
    c = document.createElement('canvas'); c.width = w * 2; c.height = h * 2;
    const im = background(bg, worldOf(bg)), iw = im.width || im.naturalWidth, ih = im.height || im.naturalHeight, sc = Math.max(c.width / iw, c.height / ih);
    c.getContext('2d').drawImage(im, c.width / 2 - iw * sc / 2, c.height / 2 - ih * sc * 0.42, iw * sc, ih * sc);
    thumbCache.set(key, c);
  }
  return c;
}

export function thumb(g, n, x, y, w, h, r, o = {}) {
  const bg = LEVELS[n - 1].bg;
  g.save(); rr(g, x, y, w, h, r); g.clip();
  if (isReal(bg)) g.drawImage(thumbCanvas(bg, w, h), x, y, w, h);
  else { g.fillStyle = '#d9c9a3'; g.fillRect(x, y, w, h); }
  if (o.dim) { g.fillStyle = 'rgba(58,47,69,' + o.dim + ')'; g.fillRect(x, y, w, h); }
  g.restore();
  rr(g, x, y, w, h, r); g.lineWidth = o.lw || 5; g.strokeStyle = o.edge || INK; g.stroke();
  if (o.mark) label(g, o.mark, x + w / 2, y + h / 2 + 2, Math.min(w, h) * 0.55, '#fff', { lw: 7 });
}

function pill(g, x, y, w, h) { rr(g, x, y + 6, w, h, h / 2); fillStroke(g, INK, 0); rr(g, x, y, w, h, h / 2); fillStroke(g, '#fbefd0', 6); }

function cover(g, img, a) {
  const iw = img.width || img.naturalWidth, ih = img.height || img.naturalHeight;
  const sc = Math.max((W + 60) / iw, H / ih);
  g.drawImage(img, W / 2 - iw * sc / 2 + a, H - ih * sc, iw * sc, ih * sc);
}

export function settingsButton(g, x, y, go, size = 96) {
  tap(x, y, size, size, go.settings);
  rr(g, x, y, size, size, 26); fillStroke(g, '#fbefd0', 6);
  const cx = x + size / 2, cy = y + size / 2;
  g.save(); g.translate(cx, cy); g.strokeStyle = INK; g.fillStyle = COL.orange; g.lineWidth = 8; g.lineCap = 'round';
  for (let i = 0; i < 8; i++) { g.save(); g.rotate(i * Math.PI / 4); g.beginPath(); g.moveTo(0, -31); g.lineTo(0, -41); g.stroke(); g.restore(); }
  g.beginPath(); g.arc(0, 0, 30, 0, 7); g.fill(); g.stroke();
  g.beginPath(); g.arc(0, 0, 11, 0, 7); g.fillStyle = '#fbefd0'; g.fill(); g.stroke(); g.restore();
}

export function drawLoading(g, pct, time) {
  g.fillStyle = INK; g.fillRect(0, 0, W, H);
  g.save(); g.translate(360, 420); g.rotate(time * 1.2);
  for (let i = 0; i < 8; i++) { g.rotate(Math.PI / 4); g.fillStyle = i % 2 ? COL.gold : COL.orange; g.beginPath(); g.arc(0, -90, 20, 0, 7); g.fill(); }
  g.restore();
  label(g, t('loading'), 360, 640, fitSize(g, t('loading'), 92, 640), COL.gold, { lw: 14 });
  rr(g, 110, 740, 500, 56, 28); fillStroke(g, '#fbefd0', 6);
  rr(g, 110, 740, Math.max(56, 500 * pct), 56, 28); fillStroke(g, COL.green, 6);
  label(g, Math.round(pct * 100) + '%', 360, 850, 54, '#fff', { lw: 10 });
}

const menuSp = {};
export function drawMenu(g, time, info, go) {
  cover(g, background('bg_garden', 'garden'), Math.sin(time * 0.3) * 8);
  g.fillStyle = 'rgba(58,47,69,0.16)'; g.fillRect(0, 0, W, H);
  const sp = (id, w, ar) => menuSp[id] || (menuSp[id] = sprite(id, w, ar));
  const sun = sp('sun', 190, 0.994), cl = sp('cloud', 460, 1.34), fl = sp('flower_sad', 230, 0.627), fh = sp('flower_happy', 250, 0.627);
  g.save(); g.translate(580, 560); g.rotate(Math.sin(time * 0.8) * 0.12); g.drawImage(sun.src, -sun.w / 2, -sun.h / 2, sun.w, sun.h); g.restore();
  const cyc = (time % 4) / 4, rub = clamp((cyc - 0.15) / 0.55), happy = cyc > 0.75;
  g.save(); g.globalAlpha = happy ? clamp(1 - (cyc - 0.75) * 8) : 1 - 0.8 * ease.out(rub);
  g.translate(360, 640 + Math.sin(time * 1.7) * 6); g.drawImage(cl.src, -cl.w / 2, -cl.h / 2, cl.w, cl.h); g.restore();
  const f = happy ? fh : fl, js = happy ? ease.el(clamp((cyc - 0.75) * 6)) : 1;
  g.save(); g.translate(360, 1000); g.rotate(Math.sin(time * 1.1) * 0.03); g.scale(happy ? 1.2 - 0.2 * js : 1, happy ? 0.8 + 0.2 * js : 1 + Math.sin(time * 2) * 0.015);
  g.drawImage(f.src, -f.w / 2, -f.h, f.w, f.h); g.restore();
  if (!happy && cyc > 0.15 && !info.returning) drawHand(g, 250 + rub * 220, 650 + Math.sin(rub * 12) * 34, 0.9, Math.sin(time * 14) * 0.5);
  const lines = [[t('title1'), 230, 150, COL.orange], [t('title2'), 390, 180, COL.gold]];
  for (const [s, y, size, col] of lines) {
    const fs = fitSize(g, s, size, 580), whole = isJoined();
    g.font = '900 ' + fs + 'px ' + FONT;
    if (whole) { label(g, s, 360, y + Math.sin(time * 3 + y) * 9, fs, col, { lw: fs * 0.14 }); continue; }
    let x = 360 - g.measureText(s).width / 2;
    for (let i = 0; i < s.length; i++) {
      const cw = g.measureText(s[i]).width;
      label(g, s[i], x + cw / 2, y + Math.sin(time * 3 + i * 0.7 + y) * 9, fs, col, { lw: fs * 0.14 });
      x += cw;
    }
  }
  settingsButton(g, isRtl() ? 24 : 600, 26, go);
  if (info.returning && info.daily) drawDailyButton(g, time, info.daily, go);
  const pt = info.returning ? t('level', { n: info.playN }) : t('play');
  button(g, 360, 1060, 440, 130, pt, go.play, time, 76, 0.04);
  button(g, 130, 1205, 190, 96, t('map'), go.map, time, 44, 0);
  pill(g, 250, 1165, 220, 80); label(g, t('levels_count', { n: LEVEL_COUNT }), 360, 1206, fitSize(g, t('levels_count', { n: LEVEL_COUNT }), 30, 190), INK, { stroke: 0 });
  pill(g, 500, 1165, 190, 80); drawStar(g, 548, 1205, 26, true); label(g, t('total_stars', { n: info.total }), 622, 1207, 36, INK, { stroke: 0 });
}

// Today's picture: top corner opposite Settings, same 96 px height as every HUD button. Open = the picture pulses; collected = tomorrow's scene waits behind a lock.
function drawDailyButton(g, time, d, go) {
  const w = 248, h = 96, x = isRtl() ? W - 24 - w : 24, y = 26, pu = d.done ? 0 : 0.5 + 0.5 * Math.sin(time * 4);
  tap(x, y, w, h, go.daily);
  if (pu) { g.save(); g.globalAlpha = 0.35 * pu; rr(g, x - 6, y - 6, w + 12, h + 12, 32); g.fillStyle = COL.gold; g.fill(); g.restore(); }
  rr(g, x, y + 6, w, h, 26); fillStroke(g, INK, 0);
  rr(g, x, y, w, h, 26); fillStroke(g, '#fbefd0', 6);
  const tx = isRtl() ? x + w - 84 : x + 12;
  thumb(g, d.done ? d.tomorrowN : d.n, tx, y + 12, 72, 72, 16, d.done ? { dim: 0.55, mark: '?' } : { edge: COL.orange });
  const cx = isRtl() ? x + (w - 84) / 2 : x + 84 + (w - 84) / 2, l1 = t('daily_short'), l2 = d.done ? t('tomorrow') : t('play');
  label(g, l1, cx, y + 34, fitSize(g, l1, 36, w - 104), d.done ? INK : COL.orange, { stroke: 0 });
  label(g, l2, cx, y + 68, fitSize(g, l2, 32, w - 104), d.done ? '#8f8496' : COL.greenDk, { stroke: 0 });
  if (d.done) { g.save(); g.translate(isRtl() ? x + w - 74 : x + 74, y + 18); g.beginPath(); g.arc(0, 0, 15, 0, 7); fillStroke(g, COL.green, 4); g.beginPath(); g.moveTo(-7, 0); g.lineTo(-2, 6); g.lineTo(8, -6); g.lineWidth = 5; g.strokeStyle = '#fff'; g.lineCap = 'round'; g.stroke(); g.restore(); }
}

const WORLDS = ['garden', 'kitchen', 'zoo', 'town', 'space', 'beach', 'castle', 'sea', 'fair', 'jungle', 'snow'], PER = 6, TABS = 5;
const WCOL = [COL.green, COL.orange, COL.blue, COL.plum, '#4a2fd0', '#14a3a3', '#c42b2b', '#1f6fb5', '#d02a88', '#25a35a', '#398db8'];
let mapWorld = 0;
const tabLabels = new Map();
// sticker collection: every wrong-rub gag of a level is one sticker (the picture it reveals or swaps to, else the thing itself); the map shows the found ones and an empty slot for each one not found yet
const GAGS = LEVELS.map((l) => l.things.filter((q) => q.role === 'decoy').map((q) => { const r = q.react || {}, a = r.reveal || r.swap; return { id: a ? a.asset : q.asset, ar: (a && a.ar) || q.ar || 1 }; }));
export const GAG_TOTAL = GAGS.reduce((a, l) => a + l.length, 0);
export const gagCount = (n) => GAGS[n - 1].length;
const bits = (v) => { let c = 0; for (let b = v; b; b >>= 1) c += b & 1; return c; };
const stickSp = {};
function sticker(g, x, y, r, gag, found, ring, pulse) {
  g.beginPath(); g.arc(x, y, r, 0, 7); fillStroke(g, found ? '#fff' : '#cdbd98', 4);
  // Optional orange ring draws attention to the final unrevealed funny reaction in this world.
  if (ring) { g.save(); g.beginPath(); g.arc(x, y, r + 3 + (pulse || 0) * 3, 0, 7); g.lineWidth = 4; g.strokeStyle = COL.orange; g.stroke(); g.restore(); }
  if (!found) { label(g, '?', x, y + 1, r * 1.3, '#8f8496', { stroke: 0 }); return; }
  const sp = stickSp[gag.id] || (stickSp[gag.id] = sprite(gag.id, 64, gag.ar)), k = (r * 1.5) / Math.max(sp.w, sp.h);
  g.save(); g.beginPath(); g.arc(x, y, r - 2, 0, 7); g.clip(); g.drawImage(sp.src, x - sp.w * k / 2, y - sp.h * k / 2, sp.w * k, sp.h * k); g.restore();
}
export function mapFocus(n) { mapWorld = clamp(Math.floor((n - 1) / PER), 0, WORLDS.length - 1); }

let lockHit = { n: 0, t: -9 };

export function drawMap(g, time, info, go) {
  g.fillStyle = COL.bg; g.fillRect(0, 0, W, H);
  const rtl = isRtl(), mx = (x) => (rtl ? W - x : x);
  tap(rtl ? 600 : 24, 26, 96, 96, go.menu);
  rr(g, rtl ? 600 : 24, 26, 96, 96, 26); fillStroke(g, '#fbefd0', 6);
  g.beginPath(); g.moveTo(mx(84), 54); g.lineTo(mx(56), 74); g.lineTo(mx(84), 94); g.lineWidth = 12; g.lineCap = g.lineJoin = 'round'; g.strokeStyle = INK; g.stroke();
  settingsButton(g, rtl ? 24 : 600, 26, go);
  label(g, t('levels'), 360, 74, fitSize(g, t('levels'), 62, 440), COL.orange, { lw: 11 });
  // Eleven world tabs on one 4-column grid (rows of 4, 4, 3; the short row centred), one shared label size, the NEW badge on the tab's top edge (never over the words). Six 200 px level tiles below.
  const COLS = 4, tw = 160, th = 92, tg = 8, rowH = 104, tx0 = (W - COLS * tw - (COLS - 1) * tg) / 2;
  // tab names, their two-line splits and the one shared label size depend only on the language: measured once per language
  const names = WORLDS.map((w) => t('world_' + w)), mk = names.join('|');
  let tl = tabLabels.get(mk);
  if (!tl) {
    // one shared label size: the largest at which every name fits its tab, on one line or (names of two or more words) split over two lines
    const split = (nm) => { const ws = nm.split(' '); let b = null; g.font = '900 100px ' + FONT; for (let i = 1; i < ws.length; i++) { const a = ws.slice(0, i).join(' '), c = ws.slice(i).join(' '), w = Math.max(g.measureText(a).width, g.measureText(c).width); if (!b || w < b.w) b = { lines: [a, c], w }; } return b; };
    const sizeFor = (nm) => { const one = fitSize(g, nm, 38, tw - 22), sp = split(nm); return sp ? Math.max(one, Math.min(36, Math.floor(100 * (tw - 22) / sp.w))) : one; };
    let ts = 38;
    for (const nm of names) ts = Math.min(ts, sizeFor(nm));
    ts = Math.max(22, Math.floor(ts));
    tl = { ts, splits: names.map((nm) => (nm.indexOf(' ') < 0 ? null : split(nm))) }; tabLabels.set(mk, tl);
  }
  const ts = tl.ts;
  WORLDS.forEach((w, wi) => {
    const row = Math.floor(wi / COLS), inRow = Math.min(COLS, WORLDS.length - row * COLS), c0 = wi % COLS, col = rtl ? inRow - 1 - c0 : c0;
    const x = (W - inRow * tw - (inRow - 1) * tg) / 2 + col * (tw + tg), ty = 140 + row * rowH, on = wi === mapWorld, y = on ? ty : ty + 6, name = names[wi];
    tap(x, ty, tw, th + 8, () => { mapWorld = wi; });
    rr(g, x, y + 8, tw, th, 26); fillStroke(g, INK, 0);
    rr(g, x, y, tw, th, 26); fillStroke(g, on ? WCOL[wi] : '#fbefd0', 7);
    g.font = '900 ' + ts + 'px ' + FONT;
    const fit = g.measureText(name).width <= tw - 22 || name.indexOf(' ') < 0 ? { lines: [name], size: Math.min(ts, fitSize(g, name, ts, tw - 22)) } : { lines: tl.splits[wi].lines, size: ts };
    labelLines(g, fit, x + tw / 2, y + th / 2 + 2, on ? '#fff' : INK, { stroke: on ? INK : 0, lw: 7 }, 1.0);
    if (w === 'snow' && !info.snowWorldSeen) { const bw = 64, bx = rtl ? x + 8 : x + tw - bw - 8, by = y - 14; rr(g, bx, by, bw, 28, 14); fillStroke(g, COL.red, 4); label(g, t('new_badge'), bx + bw / 2, by + 15, fitSize(g, t('new_badge'), 17, bw - 10), '#fff', { stroke: 0 }); }
  });
  const tile = 200, gap = 24, x0 = (W - 3 * tile - 2 * gap) / 2, y0 = 470;
  for (let k = 0; k < PER; k++) {
    const n = mapWorld * PER + k + 1, i = n - 1, col = rtl ? 2 - (k % 3) : k % 3, x = x0 + col * (tile + gap), y = y0 + Math.floor(k / 3) * (tile + gap);
    const open = n <= info.reached, cur = n === Math.min(info.reached, LEVEL_COUNT);
    const bob = cur ? Math.sin(time * 4) * 5 : 0;
    const lt = time - lockHit.t, shake = !open && lockHit.n === n && lt < 0.4 ? Math.sin(lt * 60) * 12 * (1 - lt / 0.4) : 0;
    if (open) tap(x, y, tile, tile, () => go.level(n)); else tap(x, y, tile, tile, () => { lockHit = { n, t: time }; });
    g.save(); g.translate(shake, bob);
    rr(g, x, y + 10, tile, tile, 34); fillStroke(g, INK, 0);
    rr(g, x, y, tile, tile, 34); fillStroke(g, open ? WCOL[mapWorld] : '#8f8496', 7);
    if (open) {
      label(g, String(n), x + tile / 2, y + 66, 84, '#fff', { lw: 13 });
      for (let q = 0; q < 3; q++) drawStar(g, x + tile / 2 + (q - 1) * 50, y + 128, 20, info.stars[i] > q);
      const gl = GAGS[i].length, left = gl - bits(info.gags[i]), pu = 0.5 + 0.5 * Math.sin(time * 7);
      GAGS[i].forEach((gag, q) => {
        const found = !!(info.gags[i] & (1 << q)), ring = !found && left === 1 ? 'near' : '';
        sticker(g, x + tile / 2 + (q - (gl - 1) / 2) * 44, y + 172, 17, gag, found, ring, !found && left === 1 ? pu : 0);
      });
    } else {
      rr(g, x + tile / 2 - 34, y + 64, 68, 52, 12); fillStroke(g, '#6e6475', 6);
      g.beginPath(); g.arc(x + tile / 2, y + 64, 24, Math.PI, 0); g.lineWidth = 10; g.strokeStyle = INK; g.stroke();
      label(g, String(n), x + tile / 2, y + 156, 56, '#fff', { lw: 11 });
    }
    g.restore();
  }
  let got = 0; for (let k = 0; k < PER; k++) got += info.stars[mapWorld * PER + k] || 0;
  const wn = t('world_' + WORLDS[mapWorld]);
  label(g, wn, 360, 966, fitSize(g, wn, 72, 560), WCOL[mapWorld], { lw: 13 });
  let sf = 0, sn = 0; for (let k = 0; k < PER; k++) { sf += bits(info.gags[mapWorld * PER + k]); sn += GAGS[mapWorld * PER + k].length; }
  drawStar(g, 150, 1058, 34, true); label(g, '\u202A' + got + ' / ' + PER * 3 + '\u202C', 262, 1060, 52, INK, { stroke: 0 });
  sticker(g, 420, 1058, 30, GAGS[mapWorld * PER + 1][0] || GAGS[mapWorld * PER + 2][0], sf > 0); label(g, '\u202A' + sf + ' / ' + sn + '\u202C', 540, 1060, 52, INK, { stroke: 0 });
  pill(g, 235, 1160, 250, 84); drawStar(g, 290, 1202, 28, true); label(g, t('total_stars', { n: info.total }), 400, 1204, 42, INK, { stroke: 0 });
}

export function drawSettings(g, time, prefs, go) {
  g.fillStyle = COL.bg; g.fillRect(0, 0, W, H);
  const rtl = isRtl(), backX = rtl ? 600 : 24;
  tap(backX, 26, 96, 96, go.back);
  rr(g, backX, 26, 96, 96, 26); fillStroke(g, '#fbefd0', 6);
  g.lineWidth = 9; g.lineCap = 'round'; g.strokeStyle = INK;
  g.beginPath();
  if (rtl) { g.moveTo(backX + 38, 54); g.lineTo(backX + 66, 74); g.lineTo(backX + 38, 94); }
  else { g.moveTo(backX + 60, 54); g.lineTo(backX + 32, 74); g.lineTo(backX + 60, 94); }
  g.stroke();
  label(g, t('settings'), 360, 74, fitSize(g, t('settings'), 62, 470), COL.orange, { lw: 11 });
  const rows = [['music', 'music'], ['effects', 'effects'], ['haptics', 'haptics'], ['reduce_motion', 'reduceMotion']];
  rows.forEach(([key, pref], i) => {
    const cy = 370 + i * 180, on = !!prefs[pref];
    rr(g, 48, cy - 58, 624, 116, 30); fillStroke(g, '#fbefd0', 7);
    const switchX = rtl ? 78 : 498, onKnob = rtl ? switchX + 42 : switchX + 102, offKnob = rtl ? switchX + 102 : switchX + 42;
    label(g, t(key), rtl ? 448 : 272, cy, fitSize(g, t(key), 38, 380), INK, { stroke: 0 });
    rr(g, switchX, cy - 42, 144, 84, 42); fillStroke(g, on ? COL.greenDk : '#8f8496', 5);
    g.beginPath(); g.arc(on ? onKnob : offKnob, cy, 30, 0, 7); fillStroke(g, '#fff', 4);
    const stateX = on ? (rtl ? switchX + 100 : switchX + 42) : (rtl ? switchX + 42 : switchX + 100);
    label(g, on ? t('on') : t('off'), stateX, cy, 24, '#fff', { stroke: INK, lw: 5 });
    tap(48, cy - 58, 624, 116, () => go.toggle(pref));
  });
}

// After a quiet stretch, a free-to-tap hint bulb gently calls attention to itself; no timer grants or spends rewards.
const HINT_IDLE = 12;
const watch = { lv: null, p: 0, e: 0, t0: 0 };
function stalled(lv) {
  const p = lv.progress();
  if (watch.lv !== lv || Math.abs(p - watch.p) > 0.004 || lv.errors !== watch.e || lv.hintT > 0) { watch.lv = lv; watch.p = p; watch.e = lv.errors; watch.t0 = lv.t; }
  return lv.n >= 3 && !lv.fixed && lv.t - watch.t0 > HINT_IDLE;
}

export function drawHud(g, lv, time, info, go) {
  tap(24, 26, 96, 96, go.map);
  rr(g, 24, 26, 96, 96, 26); fillStroke(g, '#fbefd0', 6);
  settingsButton(g, 140, 26, go);
  g.lineWidth = 9; g.lineCap = 'round'; g.strokeStyle = INK;
  for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(50, 56 + i * 18); g.lineTo(94, 56 + i * 18); g.stroke(); }
  const head = lv.daily ? t('daily_short') : t('level', { n: lv.n });
  label(g, head, 385, 74, fitSize(g, head, 50, 270), COL.orange, { lw: 10 });
  pill(g, 540, 40, 156, 84);
  const now = lv.fixed ? lv.stars : lv.starsNow();
  for (let i = 0; i < 3; i++) drawStar(g, 580 + i * 40, 82, 17, i < now);
  // sticker counter of this level under the star pill (levels with wrong-rub gags): found / all, it pops when a new one is found
  const gl = GAGS[lv.n - 1];
  if (gl.length && !lv.fixed) {
    const gp = clamp((lv.t - lv.gagT) / 0.5), fnd = bits(info.gags[lv.n - 1]), sc = lv.reducedMotion ? 1 : 1 + (gp < 1 ? Math.sin(gp * Math.PI) * 0.35 : fnd === gl.length - 1 ? 0.08 + 0.08 * Math.sin(time * 7) : 0);
    g.save(); g.translate(628, 158); g.scale(sc, sc); pill(g, -62, -24, 124, 48); sticker(g, -34, 0, 16, gl[0], fnd > 0); label(g, '\u202A' + fnd + ' / ' + gl.length + '\u202C', 18, 2, 28, INK, { stroke: 0 }); g.restore();
  }
  const prompt = t(lv.def.prompt), fit = fitLines(g, prompt, 34, 560), ph = fit.lines.length > 1 ? 100 : 66;
  g.font = '900 ' + fit.size + 'px ' + FONT;
  const pw = Math.min(600, Math.max(...fit.lines.map((l) => g.measureText(l).width)) + 80), pb = lv.reducedMotion || lv.fixed ? 1 : 1 + Math.sin(time * 3) * 0.015;
  g.save(); g.translate(360, 207 + (ph - 66) / 2); g.scale(pb, pb); rr(g, -pw / 2, -ph / 2, pw, ph, ph / 2 > 40 ? 40 : ph / 2); fillStroke(g, '#fbefd0', 6); labelLines(g, fit, 0, 2, INK, { stroke: 0 }); g.restore();
  if (!lv.fixed) {
    const on = info.hints > 0, k = stalled(lv) && on ? (lv.reducedMotion ? 0.35 : 0.5 + 0.5 * Math.sin(time * 6)) : 0;
    tap(300, 1156, 120, 112, go.hint);
    g.save(); g.translate(360, 1212);
    if (k) { const gl = g.createRadialGradient(0, 0, 30, 0, 0, 104); gl.addColorStop(0, 'rgba(232,116,59,' + 0.8 * k + ')'); gl.addColorStop(0.55, 'rgba(235,180,57,' + 0.45 * k + ')'); gl.addColorStop(1, 'rgba(235,180,57,0)'); g.fillStyle = gl; g.beginPath(); g.arc(0, 0, 104, 0, 7); g.fill(); g.scale(1 + 0.13 * k, 1 + 0.13 * k); }
    g.beginPath(); g.arc(0, 0, 52, 0, 7); fillStroke(g, '#fbefd0', 6);
    drawBulb(g, 0, 4, 0.9, on);
    g.beginPath(); g.arc(38, -38, 20, 0, 7); fillStroke(g, COL.red, 5); label(g, String(info.hints), 38, -37, 24, '#fff', { stroke: 0 });
    g.restore();
  }
}

export function drawResult(g, lv, time, go, info) {
  const rawS = lv.s - lv.cardHold, s = lv.reducedMotion && rawS > 1.1 ? 10 : rawS;   // the level 60 finale holds the card back so the whole scene can celebrate first
  if (lv.rain && lv.fixed) { lv.rain.drawHigh(g); }
  if (lv.worldDone && rawS > 0.9) drawWorldBanner(g, lv, rawS, time);
  if (s <= 1.1) return;
  const u = lv.reducedMotion ? 1 : ease.back(clamp((s - 1.1) / 0.5)), y0 = 1300 - u * 434, rtl = isRtl();
  rr(g, 40, y0 + 12, 640, 380, 44); fillStroke(g, INK, 0);
  rr(g, 40, y0, 640, 380, 44); fillStroke(g, '#fbefd0', 8);
  const tf = fitLines(g, t(lv.def.win), 56, 560);
  labelLines(g, tf, 360, y0 + (tf.lines.length > 1 ? 50 : 56), COL.orange, { lw: 11 });
  const sy = y0 + 140, sr = 42, starX = lv.worldEnd ? (rtl ? [330, 430, 530] : [190, 290, 390]) : [250, 360, 470];
  for (let i = 0; i < 3; i++) {
    const on = i < lv.stars, q = on ? (lv.reducedMotion ? 1 : ease.back(clamp((s - 1.5 - i * 0.22) / 0.35))) : 1;
    if (q <= 0) continue;
    drawStar(g, starX[i], sy, sr * q, on, (i - 1) * 0.12 + (1 - q) * 2);
  }
  if (lv.worldEnd && !lv.daily) {
    button(g, rtl ? 165 : 555, sy + 6, 170, 84, t('share'), go.share, time, 27, 0.06, 'blue');
  }
  const ry = y0 + 214;
  if (lv.daily) {
    // today's picture: collected, and tomorrow's scene waits behind a question mark (no countdown, no streak)
    const msg = lv.dailyGot ? t('daily_got') : t('daily_tomorrow'), tx = rtl ? 556 : 108;
    thumb(g, info.daily.tomorrowN, tx, ry - 30, 60, 60, 14, { dim: 0.55, mark: '?' });
    label(g, msg, rtl ? 320 : 400, ry, fitSize(g, msg, 30, 400), lv.dailyGot ? COL.greenDk : INK, { stroke: 0 });
  } else if (info) {
    // the world poster: one framed picture per level of this world; a solved level shows its scene, the one just solved pops in, the last missing one pulses
    const w0 = Math.floor((lv.n - 1) / PER) * PER, fw = 56, fg = 10, fx0 = 360 - (PER * fw + (PER - 1) * fg) / 2, pop = lv.reducedMotion ? 1 : ease.back(clamp((s - 1.7) / 0.4));
    const left = info.stars.slice(w0, w0 + PER).filter((v) => !(v > 0)).length, full = left === 0;
    for (let k = 0; k < PER; k++) {
      const n = w0 + k + 1, done = info.stars[n - 1] > 0, me = n === lv.n, last = !done && left === 1, col = rtl ? PER - 1 - k : k;
      const x = fx0 + col * (fw + fg), sc = me ? pop : 1, pu = last && !lv.reducedMotion ? 0.5 + 0.5 * Math.sin(time * 8) : 0;
      if (sc <= 0.02) continue;
      g.save(); g.translate(x + fw / 2, ry); g.scale(sc * (1 + pu * 0.08), sc * (1 + pu * 0.08));
      if (done) thumb(g, n, -fw / 2, -fw / 2, fw, fw, 12, { edge: full ? COL.gold : INK, lw: full ? 6 : 5 });
      else { rr(g, -fw / 2, -fw / 2, fw, fw, 12); fillStroke(g, last ? '#f6dc8c' : '#e4d4b4', 5); label(g, '?', 0, 2, 30, '#8f8496', { stroke: 0 }); }
      g.restore();
    }
    if (full && !lv.reducedMotion) { const sw = ((time * 0.6) % 1.6) - 0.3; g.save(); g.globalAlpha = 0.5; g.fillStyle = '#fff'; g.fillRect(fx0 + sw * (PER * (fw + fg)), ry - fw / 2, 10, fw); g.restore(); }
    if (lv.worldDone && !lv.worldEnd) { const q = ease.back(clamp((s - 2.1) / 0.4)); if (q > 0) { g.save(); g.translate(rtl ? 92 : 628, ry); g.scale(0.32 * q, 0.32 * q); drawBulb(g, 0, 0, 0.9, true); label(g, '+1', 78, 4, 56, COL.orange, { lw: 12 }); g.restore(); } }
  }
  // NEXT carries a peek at the next scene; once the card has settled it pulses a little stronger (a soft pull, never an automatic move)
  const pull = s > 1.6 + (info && info.pullAfter || 2.4) && !lv.reducedMotion ? 0.055 : 0.025;
  const nextN = lv.daily ? info && info.playN : lv.n < LEVEL_COUNT ? lv.n + 1 : 0;
  const deco = nextN ? (gg, w, h) => thumb(gg, nextN, (rtl ? w / 2 - 18 - 72 : -w / 2 + 18), -36, 72, 72, 16, { edge: '#fff', lw: 5 }) : null;
  if (lv.stars >= 3) button(g, 360, y0 + 306, 560, 100, t('next'), go.next, time, 54, pull, 'green', deco);
  else {
    // 1-2 stars: REPLAY beside NEXT in one row (NEXT is the big green primary on the forward side, mirrored in ar and ur)
    button(g, rtl ? 240 : 480, y0 + 306, 320, 100, t('next'), go.next, time, 54, pull);
    button(g, rtl ? 540 : 180, y0 + 306, 240, 100, t('replay'), go.replay, time, 44, 0, 'blue');
  }
  if (lv.gift) drawGift(g, lv, y0, time, go);
}

// WORLD COMPLETE: a gold ribbon with turning rays over the top of the scene for about 2.5 s, then it fades
function drawWorldBanner(g, lv, s, time) {
  const a = clamp((s - 0.9) / 0.25) * clamp((3.6 - s) / 0.5);
  if (a <= 0) return;
  const k = lv.reducedMotion ? 1 : ease.back(clamp((s - 0.9) / 0.4)), y = 318;
  g.save(); g.globalAlpha = a;
  if (!lv.reducedMotion) {
    g.save(); g.translate(360, y); g.rotate(time * 0.5); g.globalAlpha = a * 0.35; g.fillStyle = COL.gold;
    for (let i = 0; i < 12; i++) { g.rotate(Math.PI / 6); g.beginPath(); g.moveTo(0, 0); g.lineTo(-30, -300); g.lineTo(30, -300); g.closePath(); g.fill(); }
    g.restore();
  }
  g.translate(360, y); g.scale(k, k);
  const msg = t('world_done');
  rr(g, -270, -40, 540, 88, 40); fillStroke(g, INK, 0);
  rr(g, -270, -48, 540, 88, 40); fillStroke(g, COL.gold, 7);
  label(g, msg, 0, -2, fitSize(g, msg, 50, 480), '#fff', { lw: 10 });
  g.restore();
}

// the surprise gift on the result card (every few levels in one session): a wrapped box bobs beside the card; a tap opens it for free hints
function drawGift(g, lv, y0, time, go) {
  const gf = lv.gift, rtl = isRtl(), x = rtl ? 110 : 610, y = y0 - 64;
  if (!gf.open) {
    const b = lv.reducedMotion ? 0 : Math.sin(time * 5) * 8, wob = lv.reducedMotion ? 0 : Math.sin(time * 9) * 0.08;
    tap(x - 70, y - 80, 140, 140, go.gift);
    const msg = t('gift');
    label(g, msg, clamp(x, 120, 600), y - 70 + b, fitSize(g, msg, 30, 220), COL.red, { stroke: '#fff', lw: 8 });
    g.save(); g.translate(x, y + b); g.rotate(wob);
    rr(g, -44, -30, 88, 72, 12); fillStroke(g, COL.red, 6);
    rr(g, -52, -44, 104, 24, 10); fillStroke(g, '#e86a6a', 6);
    g.fillStyle = COL.gold; g.fillRect(-9, -44, 18, 86); g.lineWidth = 5; g.strokeStyle = INK; g.strokeRect(-9, -44, 18, 86);
    g.beginPath(); g.ellipse(-18, -52, 18, 11, -0.5, 0, 7); fillStroke(g, COL.gold, 5);
    g.beginPath(); g.ellipse(18, -52, 18, 11, 0.5, 0, 7); fillStroke(g, COL.gold, 5);
    g.restore();
    return;
  }
  const k = clamp((lv.s - gf.t) / 1.6);
  if (k >= 1) return;
  g.save(); g.globalAlpha = 1 - k * k;
  const msg = t('gift_got', { n: gf.n });
  label(g, msg, clamp(x, 140, 580), y - 20 - k * 60, fitSize(g, msg, 40, 260), COL.orange, { lw: 10 });
  g.restore();
}

// share the finished world: title and text only, so the host card shows the game's live thumbnail
export function shareWorld(lv, rec) {
  const worldName = t('world_' + WORLDS[Math.floor((lv.n - 1) / PER)]);
  const api = window.lib && window.lib.share;
  if (typeof api !== 'function') return Promise.resolve();
  const text = t('world_share', { world: worldName }) + (rec && rec.fast ? ' ' + t('rec_fast', { s: rec.fast.toFixed(1) }) : '');
  try { return Promise.resolve(api({ title: worldName, description: text, text })); }
  catch (e) { return Promise.reject(e); }
}

let endFx = new Fx(), endSeen = -9, endT = 0, endBurst = 0, endReduced = false;

export function drawEnd(g, time, dt, info, go) {
  const reduced = !!(info.prefs && info.prefs.reduceMotion);
  if (time < endSeen || time - endSeen > 0.3 || reduced !== endReduced) { endFx = new Fx(reduced); endT = 0; endBurst = 0; endReduced = reduced; }
  endSeen = time; endT = reduced ? 4 : endT + dt;
  const max = LEVEL_COUNT * 3, perfect = info.total >= max, frac = info.total / max, k = ease.out(clamp(endT / 1.3));
  // celebration: one confetti burst up from the card, the perfect state repeats it every 2.4 s
  if (endT > 0.2 && (endBurst === 0 || (perfect && endT > endBurst * 2.4))) { endFx.confetti(360, 900, perfect ? 110 : 80); endFx.spark(360, 520, 14); endBurst++; }
  endFx.update(dt);
  // the backdrop is the world of the last level the player finished (the jungle after level 60)
  const lastBg = LEVELS[clamp(info.reached - 1, 1, LEVEL_COUNT) - 1].bg, lastWorld = WORLDS.find((w) => lastBg.indexOf(w) >= 0) || 'garden';
  cover(g, background(lastBg, lastWorld), Math.sin(time * 0.3) * 8);
  g.fillStyle = 'rgba(58,47,69,0.4)'; g.fillRect(0, 0, W, H);
  rr(g, 50, 182, 620, 1010, 48); fillStroke(g, INK, 0);
  rr(g, 50, 170, 620, 1010, 48); fillStroke(g, '#fbefd0', 8);
  const head = perfect ? t('end_perfect') : t('end_sub', { n: LEVEL_COUNT }), hf = fitLines(g, head, perfect ? 88 : 62, 540);
  labelLines(g, hf, 360, 268, COL.orange, { lw: 12 });
  // star ring: the share of all 198 stars, filling up; gold rays turn behind it when it is full
  const cx = 360, cy = 530, R = 150, a0 = -Math.PI / 2, GAP = 0.55;   // before full completion the ring leaves a visible grey gap
  const a1 = a0 + (perfect ? Math.PI * 2 * k : Math.min(Math.PI * 2 * frac * k, Math.PI * 2 - GAP));
  if (perfect) {
    g.save(); g.translate(cx, cy); g.rotate(time * 0.35); g.globalAlpha = 0.5; g.fillStyle = COL.gold;
    for (let i = 0; i < 12; i++) { g.rotate(Math.PI / 6); g.beginPath(); g.moveTo(0, 0); g.lineTo(-26, -R - 52); g.lineTo(26, -R - 52); g.closePath(); g.fill(); }
    g.restore();
  }
  g.save(); g.translate(cx, cy); const pz = perfect ? 1 + Math.sin(time * 4) * 0.025 : 1; g.scale(pz, pz); g.translate(-cx, -cy);
  g.lineCap = 'round';
  g.beginPath(); g.arc(cx, cy, R, 0, 7); g.lineWidth = 50; g.strokeStyle = INK; g.stroke();
  g.beginPath(); g.arc(cx, cy, R, 0, 7); g.lineWidth = 34; g.strokeStyle = '#e4d4b4'; g.stroke();
  if (!perfect) { g.lineCap = 'butt'; g.beginPath(); g.arc(cx, cy, R, a1, a0 + Math.PI * 2); g.lineWidth = 34; g.strokeStyle = '#8f8496'; g.stroke(); g.lineCap = 'round'; }   // the missing stars: the darker grey of the locked tiles
  if (frac > 0) {
    const ae = a1;
    g.beginPath(); g.arc(cx, cy, R, a0, ae); g.lineWidth = 50; g.strokeStyle = INK; g.stroke();
    g.beginPath(); g.arc(cx, cy, R, a0, ae); g.lineWidth = 34; g.strokeStyle = COL.gold; g.stroke();
  }
  g.restore();
  drawStar(g, cx, cy - 52, 40 + Math.sin(time * 3) * 2, true, Math.sin(time * 2) * 0.12);
  const shown = '\u202A' + Math.round(info.total * k) + ' / ' + max + '\u202C'; // left-to-right run so ar and ur read 140 / 180
  label(g, shown, cx, cy + 36, fitSize(g, shown, 66, 190), INK, { stroke: 0 });
  if (perfect) drawTrophy(g, 360, 788 + Math.sin(time * 3) * 8, 1.9);
  else button(g, 360, 810, 540, 120, t('end_more', { n: info.below }), go.more, time, 50, 0.04);
  const rtl = isRtl();
  button(g, rtl ? 505 : 215, 950, 270, 96, t('map'), go.map, time, 46, 0, 'blue');
  button(g, rtl ? 215 : 505, 950, 270, 96, t('menu'), go.menu, time, 46, 0, 'blue');
  button(g, 360, 1084, 560, 96, t('settings'), go.settings, time, 46, 0, 'blue');
  endFx.drawLow(g); endFx.drawHigh(g);
}

// FIRST-TIME TOUR (level 1 only, saved, skippable): the screen dims except a soft window around the one thing to do.
// Step 1 = the thing to rub (follows it as it moves), step 2 = NEXT. It is only a picture: every tap still reaches the game.
export function drawFtue(g, lv, time, go) {
  let shape = null;
  if (!lv.fixed) { const c = lv.targetPos(), r = Math.max(lv.target.w, lv.target.h) * 0.62 + 34; shape = { kind: 'circle', x: c.x, y: c.y, r }; }
  else if (lv.s - lv.cardHold > 1.8) shape = { kind: 'rect', x: 72, y: 1116, w: 576, h: 116, r: 50 };
  if (!shape) return;
  const a = lv.fixed ? clamp((lv.s - lv.cardHold - 1.8) / 0.3) : clamp(lv.t / 0.6), pu = lv.reducedMotion ? 0 : Math.sin(time * 4) * 6;
  const cut = (grow) => {
    g.beginPath(); g.rect(0, 0, W, H);
    if (shape.kind === 'circle') { g.moveTo(shape.x + shape.r + grow, shape.y); g.arc(shape.x, shape.y, shape.r + grow, 0, Math.PI * 2, true); }
    else { const x = shape.x - grow, y = shape.y - grow, w = shape.w + grow * 2, h = shape.h + grow * 2, r = shape.r + grow; g.moveTo(x + r, y); g.arcTo(x, y, x, y + h, r); g.arcTo(x, y + h, x + w, y + h, r); g.arcTo(x + w, y + h, x + w, y, r); g.arcTo(x + w, y, x, y, r); g.closePath(); }
  };
  g.save();
  // soft edge: three stacked dims, each a little wider
  for (const [grow, al] of [[0, 0.2], [14, 0.16], [30, 0.16]]) { cut(grow + pu); g.fillStyle = 'rgba(30,22,40,' + al * a + ')'; g.fill('evenodd'); }
  g.restore();
  // the window's own bright rim
  g.save(); g.globalAlpha = a; g.lineWidth = 6; g.strokeStyle = COL.gold;
  if (shape.kind === 'circle') { g.beginPath(); g.arc(shape.x, shape.y, shape.r + pu, 0, 7); g.stroke(); }
  else { rr(g, shape.x - pu, shape.y - pu, shape.w + pu * 2, shape.h + pu * 2, shape.r + pu); g.stroke(); }
  g.restore();
  // SKIP: a small pill in the bottom corner, clear of the hint bulb; on the result card NEXT itself is the way on, so no SKIP there
  if (lv.fixed) return;
  const sx = isRtl() ? 24 : W - 24 - 150, sy = 1180;
  tap(sx, sy, 150, 64, go.skipFtue);
  g.save(); g.globalAlpha = a; rr(g, sx, sy, 150, 64, 32); fillStroke(g, '#fbefd0', 5); label(g, t('skip'), sx + 75, sy + 33, fitSize(g, t('skip'), 28, 120), INK, { stroke: 0 }); g.restore();
}
