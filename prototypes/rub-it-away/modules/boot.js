/* Play-mode runtime: a portrait 720×1280 one-touch puzzle with explicit result-card pacing, optional settings, permanent progress, today's picture, golden pictures and session gifts (nothing is ever lost, no streaks, no leaderboard pressure). */
import { W, H, COL, INK } from './util.js';
import { LEVEL_ASSETS } from './levels.js';
import { loadMany } from './assets.js';
import { Level } from './level.js';
import * as UI from './ui.js';
import { isRtl as isRtlNow } from './strings.js';
import * as AU from './audio.js';
import { S, LEVEL_COUNT, HINT_MAX, totalStars, startRead, commit } from './save.js';
import { startEditor } from './editor.js';
import { TUNE, dayKey, nextDayKey, dailyLevel, giftDue, goldenLevel } from './rules.js';

export function start(mode = 'play') {
  if (typeof window.__RUB_CLEANUP === 'function') { try { window.__RUB_CLEANUP(); } catch (e) { /* stale run cleanup is best-effort */ } }
  window.__RUB_CLEANUP = null;
  if (mode === 'edit') return startEditor();
  const cv = document.getElementById('c');
  const g = cv.getContext('2d');
  let scr = 'loading', from = 'menu', settingsFrom = 'menu', pct = 0, time = 0, fade = 0, lv = null, busy = false, down = false, consumed = false, shownAt = -1e9, active = true, raf = 0;
  const ready = new Set();

  const resize = () => {
    const s = Math.min(window.innerWidth / W, window.innerHeight / H);
    cv.style.width = Math.floor(W * s) + 'px'; cv.style.height = Math.floor(H * s) + 'px';
  };
  resize(); window.addEventListener('resize', resize);

  const show = (name) => { scr = name; fade = 0.24; shownAt = performance.now(); };
  const firstBelow = () => { const i = S.stars.findIndex((v) => v < 3); return i < 0 ? 0 : i + 1; };
  const playN = () => (S.reached > LEVEL_COUNT ? firstBelow() || 1 : Math.min(S.reached, LEVEL_COUNT));
  let solvedHere = 0;   // levels solved in this session: drives the surprise gift
  // today's picture, worked out once per day (info() runs every frame); dayKey only changes at midnight, checked once a second
  let dayC = null, dayAt = -1;
  const daily = () => {
    const now = Math.floor(performance.now() / 1000);
    if (!dayC || now !== dayAt) { dayAt = now; const key = dayKey(); if (!dayC || dayC.key !== key) dayC = { key, n: dailyLevel(key, LEVEL_COUNT), tomorrowN: dailyLevel(nextDayKey(key), LEVEL_COUNT) }; }
    return { key: dayC.key, n: dayC.n, tomorrowN: dayC.tomorrowN, done: S.dailyDay === dayC.key, count: S.dailyN };
  };
  const info = () => ({ rec: S.rec, reached: S.reached, stars: S.stars, total: totalStars(), hints: S.hints, returning: S.reached > 1, playN: playN(), below: S.stars.filter((v) => v < 3).length, gags: S.gags, prefs: S.prefs, snowWorldSeen: S.snowWorldSeen, daily: daily(), ftue: S.ftue, pullAfter: TUNE.pullAfter });

  function applyPrefs() {
    AU.configureAudio(S.prefs);
    if (lv) {
      lv.hapticsEnabled = S.prefs.haptics;
      lv.reducedMotion = S.prefs.reduceMotion;
      lv.fx.reducedMotion = S.prefs.reduceMotion; lv.wx.reducedMotion = S.prefs.reduceMotion;
      if (lv.rain) lv.rain.reducedMotion = S.prefs.reduceMotion;
      for (const thing of lv.things) thing.reducedMotion = S.prefs.reduceMotion;
    }
  }

  async function openLevel(n, mode = '') {
    AU.sfx('whoosh');
    if (busy) return;
    busy = true;
    if (!ready.has(n)) { show('loading'); pct = 0; await loadMany(LEVEL_ASSETS[n - 1], (p) => { pct = p; }); if (!active) return; ready.add(n); }
    if (!active) return;
    lv = new Level(n, onSolve, onGag, window.gameConfig, S.prefs);
    lv.daily = mode === 'daily'; lv.ftue = n === 1 && !S.ftue && !lv.daily && S.stars[0] === 0;   // once level 1 is solved the tour never returns, however the card was left
    lv.golden = !lv.daily && goldenLevel(n, dayKey());
    if (n >= 61 && !S.snowWorldSeen) { S.snowWorldSeen = true; commit(); }
    if (S.reached > 1) lv.touched = true;
    busy = false; show('play');
  }

  function onGag(n, ix) {
    if (S.gags[n - 1] & (1 << ix)) return false;
    S.gags[n - 1] |= (1 << ix); commit(); return true;
  }

  function onSolve(n, stars) {
    solvedHere++;
    // personal bests: a NEW RECORD moment for the fastest rub (from level 3, beating an earlier best) or for beating the best day's picture count
    if (lv) {
      const key = dayKey(), r = S.rec, took = Math.round(Math.max(0.1, lv.t - (lv.touchT0 == null ? 0 : lv.touchT0)) * 10) / 10;
      if (r.day !== key) { r.day = key; r.dayN = 0; }
      r.dayN++;
      if (n >= 3 && took < 600) { if (r.fast && took < r.fast) lv.record = { k: 'rec_fast', v: { s: took.toFixed(1) } }; if (!r.fast || took < r.fast) r.fast = took; }
      if (r.dayN > r.dayBest) { if (r.dayBest >= 3 && r.dayN === r.dayBest + 1 && !lv.record) lv.record = { k: 'rec_day', v: { n: r.dayN } }; r.dayBest = r.dayN; }
    }
    if (lv && giftDue(solvedHere)) lv.gift = { open: false, t: 0, n: TUNE.giftHints };
    if (lv && lv.golden) {
      // a golden picture pays one hint, once per level per day (replaying it is still golden, but free)
      const key = dayKey(), got = S.goldDay.slice(0, 10) === key ? S.goldDay.slice(11).split(',').filter(Boolean) : [];
      lv.goldPaid = !got.includes(String(n));
      if (lv.goldPaid) { got.push(String(n)); S.goldDay = key + ':' + got.join(','); S.hints = Math.min(HINT_MAX, S.hints + 1); }
    }
    if (lv && lv.daily) {
      // today's picture adds to the album count and a hint; it never changes campaign progress or stars
      const key = dayKey();
      lv.dailyGot = S.dailyDay !== key;
      if (lv.dailyGot) { S.dailyDay = key; S.dailyN++; S.hints = Math.min(HINT_MAX, S.hints + TUNE.dailyHints); }
      commit(); return;
    }
    const worldStart = Math.floor((n - 1) / 6) * 6;
    const worldWasDone = S.stars.slice(worldStart, worldStart + 6).every((v) => v > 0);
    const first = S.stars[n - 1] === 0;
    S.stars[n - 1] = Math.max(S.stars[n - 1], stars);
    const worldNowDone = S.stars.slice(worldStart, worldStart + 6).every((v) => v > 0);
    if (lv) { lv.worldDone = !worldWasDone && worldNowDone; lv.firstFix = first && n === 1; }
    if (lv && lv.worldDone) S.hints = Math.min(HINT_MAX, S.hints + 1);
    S.reached = Math.max(S.reached, Math.min(LEVEL_COUNT + 1, n + 1));
    commit();
  }

  const go = {
    play: () => openLevel(playN()),
    map: () => { if (!busy) { UI.mapFocus(scr === 'play' && lv ? lv.n : Math.min(S.reached, LEVEL_COUNT)); show('map'); } },
    menu: () => { if (!busy) show('menu'); },
    settings: () => { if (!busy) { settingsFrom = scr; show('settings'); } },
    toggle: (key) => { if (Object.prototype.hasOwnProperty.call(S.prefs, key)) { S.prefs[key] = !S.prefs[key]; applyPrefs(); commit(); } },
    back: () => { if (!busy) show(scr === 'settings' ? settingsFrom : 'menu'); },
    level: (n) => openLevel(n),
    next: () => {
      if (lv && lv.ftue) { S.ftue = true; commit(); }
      if (lv && lv.daily) openLevel(playN()); else if (lv && lv.n >= LEVEL_COUNT) show('end'); else if (lv) openLevel(lv.n + 1);
    },
    daily: () => { if (busy) return; const d = daily(); if (!d.done) openLevel(d.n, 'daily'); },
    gift: () => {
      if (!lv || !lv.gift || lv.gift.open) return;
      lv.gift.open = true; lv.gift.t = lv.s; S.hints = Math.min(HINT_MAX, S.hints + lv.gift.n); commit();
      lv.fx.confetti(isRtlNow() ? 110 : 610, 760, 50); lv.fx.spark(isRtlNow() ? 110 : 610, 780, 14); AU.sfx('arp'); AU.sfx('star', 1.2);
    },
    skipFtue: () => { S.ftue = true; if (lv) lv.ftue = false; commit(); },
    replay: () => { if (lv) openLevel(lv.n); },
    share: () => {
      if (!lv || !lv.worldEnd) return;
      const report = (e) => { try { window.lib.log('world share failed: ' + String(e)); } catch (ignored) { /* optional log */ } };
      try { Promise.resolve(UI.shareWorld(lv, S.rec)).catch(report); } catch (e) { report(e); }
    },
    more: () => { const n = firstBelow(); if (!busy && n) { UI.mapFocus(n); show('map'); } },
    hint: () => { if (lv && !lv.fixed && S.hints > 0) { S.hints--; lv.hint(); commit(); } },
  };

  const pos = (e) => {
    const r = cv.getBoundingClientRect();
    return { x: (e.clientX - r.left) * W / r.width, y: (e.clientY - r.top) * H / r.height };
  };

  const onDown = (e) => {
    AU.unlock(); down = true; consumed = false;
    try { cv.setPointerCapture(e.pointerId); } catch (err) { /* pointer capture is optional */ }
    if (busy || scr === 'loading') { consumed = true; return; }
    const p = pos(e), h = UI.pick(p);
    if (h) { consumed = true; if (h.fn !== go.play && performance.now() - shownAt < 320) return; AU.sfx('tap'); h.fn(); return; }
    if (scr === 'menu') { consumed = true; go.play(); return; }
    if (scr === 'play' && lv) lv.down(p);
  };
  const onMove = (e) => { if (down && !consumed && scr === 'play' && lv) lv.move(pos(e)); };
  const release = () => { down = false; if (lv) lv.up(); };
  cv.addEventListener('pointerdown', onDown); cv.addEventListener('pointermove', onMove);
  cv.addEventListener('pointerup', release); cv.addEventListener('pointercancel', release);

  let prev = performance.now();
  function frame(now) {
    if (!active) return;
    const dt = Math.max(0, Math.min(0.11, (now - prev) / 1000));   // a first frame stamped before prev must not run time backwards
    prev = now; time += dt;
    UI.hits.length = 0;
    const uiTime = S.prefs.reduceMotion ? (scr === 'menu' ? 3.5 : 0) : time;
    g.fillStyle = scr === 'loading' ? INK : COL.bg; g.fillRect(0, 0, W, H);
    if (scr === 'loading') UI.drawLoading(g, pct, uiTime);
    else if (scr === 'menu') UI.drawMenu(g, uiTime, info(), go);
    else if (scr === 'map') UI.drawMap(g, uiTime, info(), go);
    else if (scr === 'settings') UI.drawSettings(g, uiTime, S.prefs, go);
    else if (scr === 'end') UI.drawEnd(g, uiTime, dt, info(), go);
    else if (scr === 'play' && lv) {
      lv.update(dt); lv.draw(g);
      const inf = info();
      UI.drawHud(g, lv, uiTime, inf, go); UI.drawResult(g, lv, uiTime, go, inf);
      if (lv.ftue && !S.ftue) UI.drawFtue(g, lv, uiTime, go);
    }
    if (fade > 0) { fade -= dt; g.globalAlpha = Math.max(0, fade / 0.24); g.fillStyle = INK; g.fillRect(0, 0, W, H); g.globalAlpha = 1; }
    raf = requestAnimationFrame(frame);
  }
  raf = requestAnimationFrame(frame);
  window.__RUB_CLEANUP = () => {
    active = false; down = false; cancelAnimationFrame(raf); window.removeEventListener('resize', resize);
    cv.removeEventListener('pointerdown', onDown); cv.removeEventListener('pointermove', onMove);
    cv.removeEventListener('pointerup', release); cv.removeEventListener('pointercancel', release);
    AU.configureAudio({ music: false, effects: false });
  };

  if (window.__RUB_DEV) {
    window.__rub = () => ({ scr, n: lv ? lv.n : 0, fixed: lv ? lv.fixed : false, result: lv ? lv.resultReady() : false, errors: lv ? lv.errors : 0, stars: lv ? lv.stars : 0, progress: lv ? lv.progress() : 0, reached: S.reached, prefs: { ...S.prefs } });
    window.__rubS = S; window.__rubGo = (n, mode) => { if (mode !== 'daily') S.reached = Math.max(S.reached, n); openLevel(n, mode); }; window.__rubGoFn = go;
  }

  startRead().then(() => { if (active) applyPrefs(); });
  applyPrefs();
  return loadMany(LEVEL_ASSETS[0], (p) => { pct = p; }).then(() => {
    if (!active) return;
    ready.add(1); show('menu');
    // the level PLAY opens and today's picture (and tomorrow's teaser) load first, then the rest in order
    (async () => {
      const d = daily(), first = [playN(), d.n, d.tomorrowN].filter((n) => n > 1), order = [...new Set([...first, ...Array.from({ length: LEVEL_COUNT - 1 }, (_, i) => i + 2)])];
      for (const n of order) { if (!active) return; if (ready.has(n)) continue; await loadMany(LEVEL_ASSETS[n - 1]); if (active) ready.add(n); }
    })();
  });
}
