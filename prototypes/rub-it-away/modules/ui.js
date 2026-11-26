/* Touch-first canvas screens for play, the permanent level/sticker map, settings and results. All visible controls have generous hit areas and share one layout system. */
import { W, H, STAGE, INK, COL, FONT, clamp, ease, rr, fillStroke, label, fitSize, fitLines, labelLines, drawStar, drawBulb, drawTrophy } from './util.js';
import { drawHand } from './hand.js';
import { sprite, background } from './assets.js';
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
export function button(g, cx, cy, w, h, text, fn, time, size, pulse = 0.03, kind = 'green') {
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
  g.restore();
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
  const pt = info.returning ? t('level', { n: info.playN }) : t('play');
  button(g, 360, 1060, 440, 130, pt, go.play, time, 76, 0.04);
  button(g, 130, 1205, 190, 96, t('map'), go.map, time, 44, 0);
  pill(g, 250, 1165, 220, 80); label(g, t('levels_count', { n: LEVEL_COUNT }), 360, 1206, fitSize(g, t('levels_count', { n: LEVEL_COUNT }), 30, 190), INK, { stroke: 0 });
  pill(g, 500, 1165, 190, 80); drawStar(g, 548, 1205, 26, true); label(g, t('total_stars', { n: info.total }), 622, 1207, 36, INK, { stroke: 0 });
}

const WORLDS = ['garden', 'kitchen', 'zoo', 'town', 'space', 'beach', 'castle', 'sea', 'fair', 'jungle', 'snow'], PER = 6, TABS = 5;
const WCOL = [COL.green, COL.orange, COL.blue, COL.plum, '#4a2fd0', '#14a3a3', '#c42b2b', '#1f6fb5', '#d02a88', '#25a35a', '#398db8'];
let mapWorld = 0;
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
  // Eleven world tabs in three rows; the last row holds the new snow island. Six level tiles remain a 3×2 grid.
  const tw = 132, tg = 6, tx0 = (W - TABS * tw - (TABS - 1) * tg) / 2;
  WORLDS.forEach((w, wi) => {
    const col = wi === 10 ? 2 : (rtl ? TABS - 1 - (wi % TABS) : wi % TABS);
    const isSnow = w === 'snow', cardW = tw;
    const x = isSnow ? (W - cardW) / 2 : tx0 + col * (tw + tg), ty = 140 + Math.floor(wi / TABS) * 110, on = wi === mapWorld, y = on ? ty : ty + 6, name = t('world_' + w);
    tap(x, ty, cardW, 104, () => { mapWorld = wi; });
    rr(g, x, y + 8, cardW, 96, 28); fillStroke(g, INK, 0);
    rr(g, x, y, cardW, 96, 28); fillStroke(g, on ? WCOL[wi] : '#fbefd0', 7);
    if (isSnow) {
      const titleY = y + (!info.snowWorldSeen ? 64 : 50), fit = fitLines(g, name, 38, cardW - 18, true);
      labelLines(g, fit, x + cardW / 2, titleY, on ? '#fff' : INK, { stroke: on ? INK : 0, lw: 6 }, 1.0);
    } else {
      label(g, name, x + cardW / 2, y + 50, fitSize(g, name, 40, cardW - 16), on ? '#fff' : INK, { stroke: on ? INK : 0, lw: 8 });
    }
    if (isSnow && !info.snowWorldSeen) { rr(g, x + cardW - 52, y + 4, 44, 30, 12); fillStroke(g, COL.red, 3); label(g, t('new_badge'), x + cardW - 30, y + 20, 15, '#fff', { stroke: INK, lw: 4 }); }
  });
  const tile = 170, gap = 22, x0 = (W - 3 * tile - 2 * gap) / 2, y0 = 470;
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
      label(g, String(n), x + tile / 2, y + 57, 70, '#fff', { lw: 12 });
      for (let q = 0; q < 3; q++) drawStar(g, x + tile / 2 + (q - 1) * 42, y + 108, 17, info.stars[i] > q);
      const gl = GAGS[i].length, left = gl - bits(info.gags[i]), pu = 0.5 + 0.5 * Math.sin(time * 7);
      GAGS[i].forEach((gag, q) => {
        const found = !!(info.gags[i] & (1 << q)), ring = !found && left === 1 ? 'near' : '';
        sticker(g, x + tile / 2 + (q - (gl - 1) / 2) * 34, y + 145, 13, gag, found, ring, !found && left === 1 ? pu : 0);
      });
    } else {
      rr(g, x + tile / 2 - 30, y + 52, 60, 48, 12); fillStroke(g, '#6e6475', 6);
      g.beginPath(); g.arc(x + tile / 2, y + 54, 21, Math.PI, 0); g.lineWidth = 9; g.strokeStyle = INK; g.stroke();
      label(g, String(n), x + tile / 2, y + 135, 48, '#fff', { lw: 10 });
    }
    g.restore();
  }
  let got = 0; for (let k = 0; k < PER; k++) got += info.stars[mapWorld * PER + k] || 0;
  const wn = t('world_' + WORLDS[mapWorld]);
  label(g, wn, 360, 930, fitSize(g, wn, 84, 560), WCOL[mapWorld], { lw: 14 });
  let sf = 0, sn = 0; for (let k = 0; k < PER; k++) { sf += bits(info.gags[mapWorld * PER + k]); sn += GAGS[mapWorld * PER + k].length; }
  drawStar(g, 150, 1040, 34, true); label(g, '\u202A' + got + ' / ' + PER * 3 + '\u202C', 262, 1042, 52, INK, { stroke: 0 });
  sticker(g, 420, 1040, 30, GAGS[mapWorld * PER + 1][0] || GAGS[mapWorld * PER + 2][0], sf > 0); label(g, '\u202A' + sf + ' / ' + sn + '\u202C', 540, 1042, 52, INK, { stroke: 0 });
  pill(g, 235, 1156, 250, 84); drawStar(g, 290, 1198, 28, true); label(g, t('total_stars', { n: info.total }), 400, 1200, 42, INK, { stroke: 0 });
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
  label(g, t('level', { n: lv.n }), 385, 74, fitSize(g, t('level', { n: lv.n }), 50, 270), COL.orange, { lw: 10 });
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
  if (s <= 1.1) return;
  const u = lv.reducedMotion ? 1 : ease.back(clamp((s - 1.1) / 0.5)), y0 = 1300 - u * 434;
  rr(g, 40, y0 + 12, 640, 372, 44); fillStroke(g, INK, 0);
  rr(g, 40, y0, 640, 372, 44); fillStroke(g, '#fbefd0', 8);
  const tf = fitLines(g, t(lv.def.win), 62, 560);
  labelLines(g, tf, 360, y0 + (tf.lines.length > 1 ? 56 : 64), COL.orange, { lw: 12 });
  const rtl = isRtl(), sy = y0 + 158, sr = 50, starX = lv.worldEnd ? (rtl ? [310, 425, 540] : [180, 295, 410]) : [230, 360, 490];
  for (let i = 0; i < 3; i++) {
    const on = i < lv.stars, q = on ? (lv.reducedMotion ? 1 : ease.back(clamp((s - 1.5 - i * 0.22) / 0.35))) : 1;
    if (q <= 0) continue;
    drawStar(g, starX[i], sy, sr * q, on, (i - 1) * 0.12 + (1 - q) * 2);
  }
  if (lv.worldEnd) button(g, rtl ? 155 : 565, sy, 150, 96, t('share'), go.share, time, 27, 0, 'blue');
  // Permanent world progress stays visible; finishing a world grants a non-timed hint.
  if (info) {
    const w0 = Math.floor((lv.n - 1) / PER) * PER, dy = y0 + 222, pop = ease.back(clamp((s - 1.7) / 0.4)), left = info.stars.slice(w0, w0 + PER).filter((v) => !(v > 0)).length;
    for (let i = 0; i < PER; i++) {
      const done = info.stars[w0 + i] > 0, me = w0 + i === lv.n - 1, last = !done && left === 1, pu = last ? 0.5 + 0.5 * Math.sin(time * 8) : 0, r = (11 + pu * 5) * (me ? pop : 1);
      g.beginPath(); g.arc(360 - 85 + i * 34, dy, Math.max(0.5, r), 0, 7); fillStroke(g, done ? COL.orange : last ? COL.gold : '#d9c9a3', 4);   // one level left in this world: the missing dot pulses (A4)
    }
    if (lv.worldDone && !lv.worldEnd) { const q = ease.back(clamp((s - 2.1) / 0.4)); if (q > 0) { g.save(); g.translate(516, dy - 10); g.scale(0.4 * q, 0.4 * q); drawBulb(g, 0, 0, 0.9, true); label(g, '+1', 78, 4, 56, COL.orange, { lw: 12 }); g.restore(); } }
  }
  if (lv.stars >= 3) { button(g, 360, y0 + 295, 560, 106, t('next'), go.next, time, 54); return; }
  // 1-2 stars: REPLAY beside NEXT in one row (NEXT is the big green primary on the forward side, mirrored in ar and ur)
  button(g, rtl ? 240 : 480, y0 + 295, 320, 106, t('next'), go.next, time, 54);
  button(g, rtl ? 540 : 180, y0 + 295, 240, 106, t('replay'), go.replay, time, 44, 0, 'blue');
}

export function shareWorld(lv) {
  const worldKey = WORLDS[Math.floor((lv.n - 1) / PER)], worldName = t('world_' + worldKey);
  const scene = document.createElement('canvas'); scene.width = 720; scene.height = 1280;
  lv.draw(scene.getContext('2d'));
  const card = document.createElement('canvas'); card.width = 720; card.height = 1080;
  const g = card.getContext('2d');
  const bg = g.createLinearGradient(0, 0, 0, 1080); bg.addColorStop(0, '#e8f7ff'); bg.addColorStop(1, '#fbefd0'); g.fillStyle = bg; g.fillRect(0, 0, 720, 1080);
  label(g, worldName, 360, 62, fitSize(g, worldName, 58, 650), WCOL[Math.floor((lv.n - 1) / PER)], { lw: 10 });
  const x = 78, y = 124, w = 564, h = 846;
  g.save(); rr(g, x, y, w, h, 28); g.clip();
  g.drawImage(scene, STAGE.x, STAGE.y, STAGE.w, STAGE.h, x, y, w, h); g.restore();
  rr(g, x, y, w, h, 28); g.lineWidth = 8; g.strokeStyle = INK; g.stroke();
  for (const sx of [270, 360, 450]) drawStar(g, sx, 1024, 38, true);
  const api = window.lib && window.lib.share;
  if (typeof api !== 'function') return Promise.resolve();
  const text = t('world_share', { world: worldName });
  try { return Promise.resolve(api({ image: card, title: worldName, description: text, text })); }
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
