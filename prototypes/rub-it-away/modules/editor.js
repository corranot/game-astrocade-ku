/* Visual creator editor: static scene preview with select/drag/resize/reset. It never calls the gameplay update loop, save hooks, scoring or rubbing input. */
import { W, H, COL, INK, STAGE, rr, fillStroke, label, fitSize, clamp } from './util.js';
import { LEVELS, LEVEL_ASSETS } from './levels.js';
import { loadMany } from './assets.js';
import { Level } from './level.js';
import * as UI from './ui.js';
import { t } from './strings.js';
import { EDIT_LIMITS } from './rules.js';

export function startEditor() {
  const cv = document.getElementById('c');
  const g = cv.getContext('2d');
  if (!window.gameConfig || typeof window.gameConfig !== 'object') window.gameConfig = {};
  if (!window.gameConfig.levelEdits || typeof window.gameConfig.levelEdits !== 'object') window.gameConfig.levelEdits = {};
  if (!window.gameConfig.settings || typeof window.gameConfig.settings !== 'object') window.gameConfig.settings = { music: true, effects: true, haptics: true, reduceMotion: false };

  let n = 1, level = null, selected = -1, loading = false, pct = 0, dragging = false, previous = null, time = 0, active = true, raf = 0;
  const pos = (e) => { const r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) * W / r.width, y: (e.clientY - r.top) * H / r.height }; };
  const resize = () => { const s = Math.min(window.innerWidth / W, window.innerHeight / H); cv.style.width = Math.floor(W * s) + 'px'; cv.style.height = Math.floor(H * s) + 'px'; };
  resize(); window.addEventListener('resize', resize);

  function clampThingToStage(th) {
    const minX = STAGE.x + th.w / 2, maxX = STAGE.x + STAGE.w - th.w / 2;
    th.x = clamp(th.x, Math.min(minX, maxX), Math.max(minX, maxX));
    const minY = STAGE.y + th.h * th.ay, maxY = STAGE.y + STAGE.h - th.h * (1 - th.ay);
    th.y = clamp(th.y, Math.min(minY, maxY), Math.max(minY, maxY));
    th.d.x = th.x; th.d.y = th.y;
  }

  function persistThing(index) {
    if (index < 0 || !level) return;
    const th = level.things[index], edits = window.gameConfig.levelEdits;
    if (!edits[n] || typeof edits[n] !== 'object') edits[n] = {};
    edits[n][String(index)] = { x: th.x, y: th.y, w: th.w };
  }

  async function open(n1) {
    n = clamp(Math.floor(n1), 1, LEVELS.length); loading = true; pct = 0;
    await loadMany(LEVEL_ASSETS[n - 1], (p) => { pct = p; });
    if (!active) return;
    level = new Level(n, null, null, window.gameConfig, { reduceMotion: true, haptics: false });
    level.touched = true; level.idle = 0;
    selected = level.things.findIndex((th) => th.role === 'target');
    loading = false;
  }

  function adjustWidth(delta) {
    if (!level || selected < 0) return;
    const th = level.things[selected];
    th.w = clamp(th.w + delta, EDIT_LIMITS.minW, EDIT_LIMITS.maxW);
    th.d.w = th.w; th.build(); clampThingToStage(th); persistThing(selected);
  }

  function resetLevel() {
    delete window.gameConfig.levelEdits[n];
    open(n);
  }

  function draw(timeNow) {
    time = timeNow; UI.hits.length = 0;
    g.fillStyle = COL.bg; g.fillRect(0, 0, W, H);
    if (loading) { UI.drawLoading(g, pct, time); return; }
    if (!level) return;
    level.draw(g);

    // A clean editor-only selection frame; artwork itself is not altered.
    const th = level.things[selected];
    if (th) {
      const m = th.motion(0), x = th.x + m.dx - th.w / 2, y = th.y + m.dy - th.h * th.ay;
      g.save(); g.setLineDash([12, 8]); g.lineWidth = 5; g.strokeStyle = '#fff'; g.strokeRect(x - 5, y - 5, th.w + 10, th.h + 10);
      g.setLineDash([]); g.lineWidth = 4; g.strokeStyle = COL.plum; g.strokeRect(x - 5, y - 5, th.w + 10, th.h + 10); g.restore();
    }

    g.fillStyle = 'rgba(58,47,69,0.96)'; g.fillRect(0, 0, W, 140);
    UI.button(g, 86, 68, 100, 96, '‹', () => open(n - 1), time, 64, 0, 'blue');
    UI.button(g, 634, 68, 100, 96, '›', () => open(n + 1), time, 64, 0, 'blue');
    const title = t('level', { n }) + '  /  ' + LEVELS.length;
    label(g, fitSize(g, title, 48, 390) < 24 ? 'EDIT' : title, 360, 64, fitSize(g, title, 48, 390), '#fff', { stroke: 0 });
    const toolLabel = t('move') + '  •  ' + t('resize') + '  •  ' + (th ? th.id : '');
    label(g, toolLabel, 360, 1155, fitSize(g, toolLabel, 22, 660), INK, { stroke: 0 });
    UI.button(g, 150, 1222, 190, 96, t('reset'), resetLevel, time, 30, 0, 'blue');
    UI.button(g, 425, 1222, 96, 96, '−', () => adjustWidth(-20), time, 52, 0, 'blue');
    UI.button(g, 555, 1222, 96, 96, '+', () => adjustWidth(20), time, 52, 0, 'blue');
  }

  const onDown = (e) => {
    const p = pos(e), hit = UI.pick(p);
    try { cv.setPointerCapture(e.pointerId); } catch (err) { /* pointer capture is optional */ }
    if (hit) { hit.fn(); return; }
    if (!level) return;
    for (let i = level.things.length - 1; i >= 0; i--) {
      const th = level.things[i];
      if (th.d.show === 'fix' || !th.contains(p, 0)) continue;
      selected = i; dragging = true; previous = p; return;
    }
    selected = -1; dragging = false; previous = null;
  };
  const onMove = (e) => {
    if (!dragging || selected < 0 || !level) return;
    const p = pos(e), dx = p.x - previous.x, dy = p.y - previous.y, th = level.things[selected];
    th.x += dx; th.y += dy; clampThingToStage(th);
    previous = p; persistThing(selected);
  };
  const release = () => { dragging = false; previous = null; };
  cv.addEventListener('pointerdown', onDown); cv.addEventListener('pointermove', onMove);
  cv.addEventListener('pointerup', release); cv.addEventListener('pointercancel', release);

  let prev = performance.now();
  function frame(now) { if (!active) return; const dt = Math.min(0.11, (now - prev) / 1000); prev = now; draw(time + dt); raf = requestAnimationFrame(frame); }
  raf = requestAnimationFrame(frame);
  window.__RUB_CLEANUP = () => {
    active = false; cancelAnimationFrame(raf); window.removeEventListener('resize', resize);
    cv.removeEventListener('pointerdown', onDown); cv.removeEventListener('pointermove', onMove);
    cv.removeEventListener('pointerup', release); cv.removeEventListener('pointercancel', release);
  };
  if (window.__RUB_DEV) window.__rubEditor = () => ({ level: n, selected, edits: window.gameConfig.levelEdits });
  return open(1);
}
