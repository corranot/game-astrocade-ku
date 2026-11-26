/* Play-mode runtime: a portrait 720×1280 one-touch puzzle with explicit result-card pacing, optional settings, permanent progress and no date-based rewards or leaderboard pressure. */
import { W, H, COL, INK } from './util.js';
import { LEVEL_ASSETS } from './levels.js';
import { loadMany } from './assets.js';
import { Level } from './level.js';
import * as UI from './ui.js';
import * as AU from './audio.js';
import { S, LEVEL_COUNT, HINT_MAX, totalStars, startRead, commit } from './save.js';
import { startEditor } from './editor.js';

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
  const info = () => ({ reached: S.reached, stars: S.stars, total: totalStars(), hints: S.hints, returning: S.reached > 1, playN: playN(), below: S.stars.filter((v) => v < 3).length, gags: S.gags, prefs: S.prefs, snowWorldSeen: S.snowWorldSeen });

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

  async function openLevel(n) {
    AU.sfx('whoosh');
    if (busy) return;
    busy = true;
    if (!ready.has(n)) { show('loading'); pct = 0; await loadMany(LEVEL_ASSETS[n - 1], (p) => { pct = p; }); if (!active) return; ready.add(n); }
    if (!active) return;
    lv = new Level(n, onSolve, onGag, window.gameConfig, S.prefs);
    if (n >= 61 && !S.snowWorldSeen) { S.snowWorldSeen = true; commit(); }
    if (S.reached > 1) lv.touched = true;
    busy = false; show('play');
  }

  function onGag(n, ix) {
    if (S.gags[n - 1] & (1 << ix)) return false;
    S.gags[n - 1] |= (1 << ix); commit(); return true;
  }

  function onSolve(n, stars) {
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
    next: () => { if (lv && lv.n >= LEVEL_COUNT) show('end'); else if (lv) openLevel(lv.n + 1); },
    replay: () => { if (lv) openLevel(lv.n); },
    share: () => {
      if (!lv || !lv.worldEnd) return;
      const report = (e) => { try { window.lib.log('world share failed: ' + String(e)); } catch (ignored) { /* optional log */ } };
      try { Promise.resolve(UI.shareWorld(lv)).catch(report); } catch (e) { report(e); }
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
    const dt = Math.min(0.11, (now - prev) / 1000);
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
      UI.drawHud(g, lv, uiTime, info(), go); UI.drawResult(g, lv, uiTime, go, info());
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
    window.__rubS = S; window.__rubGo = (n) => { S.reached = Math.max(S.reached, n); openLevel(n); };
  }

  startRead().then(() => { if (active) applyPrefs(); });
  applyPrefs();
  return loadMany(LEVEL_ASSETS[0], (p) => { pct = p; }).then(() => {
    if (!active) return;
    ready.add(1); show('menu');
    (async () => { for (let n = 2; n <= LEVEL_COUNT && active; n++) { await loadMany(LEVEL_ASSETS[n - 1]); if (active) ready.add(n); } })();
  });
}
