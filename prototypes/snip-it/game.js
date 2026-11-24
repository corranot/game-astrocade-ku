// PROTOTYPE - NOT FOR PRODUCTION
// Genre: one-finger physics puzzle for kids (ages 5-11), cut-the-right-rope, funny wrong answers, sticker collecting.
// Snip It: Cut to Fix. Each level is a small toy-box stage with three things hanging on ropes. Swipe across one
// rope to cut it: the right one fixes the scene (the kitten lands on the sofa, the muddy puppy gets its bath, the
// thirsty flower gets water); the other two end in a harmless, funny mess. Nothing is ever lost: every ending is a
// sticker to collect, and the right rope can still be cut afterwards. Levels take about ten seconds.
// Modules: physics.js (ropes and falling things), levels.js (level data), scene3d.js (Three.js r187 stage, loaded by
// index.html), models3d.js (characters and props), vfx.js (bursts), slicer.js (finger to cut), audio.js (sound made
// in code), i18n.js (8 languages), ui.js (HUD).
/* global THREE */ // set on window by index.html before run() starts the game
import { createWorld, step, cut, remove, STEP } from './physics.js';
import { LEVELS, buildLevel, stickerId, allStickers } from './levels.js';
import { createScene } from './scene3d.js';
import { createSlicer } from './slicer.js';
import { createSound } from './audio.js';
import { LANGS, detectLang, makeT, isRtl } from './i18n.js';
import { HTML, createUi } from './ui.js';

let app = null, pendingMode = null;
function showRetry() {
  const root = document.getElementById('app') || document.body;
  if (window.__load) window.__load.done();
  root.innerHTML = '<button style="position:absolute;inset:0;margin:auto;width:40%;aspect-ratio:1;border-radius:50%;border:6px solid #fff;background:#ff4d5e;color:#fff;font-size:12vmin;cursor:pointer" aria-label="Retry">↻</button>';
  root.querySelector('button').onclick = () => location.reload();
}
/** Host entry: 'play' or 'edit'; may come before Three.js has arrived and may come more than once. */
function run(mode) {
  if (!window.THREE) {
    const first = pendingMode === null; pendingMode = mode;
    if (first) {
      window.addEventListener('three-ready', () => { const m = pendingMode; pendingMode = null; run(m); }, { once: true });
      setTimeout(() => { if (!window.THREE) showRetry(); }, 12000); // never a blank screen forever
    }
    return;
  }
  if (app) app.destroy();
  try { app = startGame(mode === 'edit' ? 'edit' : 'play'); } catch (e) { app = null; console.error(e); showRetry(); return; }
  // dev:start
  window.__game = app.debug;
  // dev:end
}

function startGame(mode) {
  const cfg = window.gameConfig || {}, set = cfg.settings || {};
  const root = document.getElementById('app') || document.body;
  root.innerHTML = HTML;
  const ui = createUi(root), $ = ui.$;
  let speed = 1;
  // dev:start
  speed = Number(new URLSearchParams(location.search).get('speed')) || 1;
  // dev:end
  let alive = true, raf = 0, last = performance.now();

  // ---- language
  let lang = detectLang(typeof navigator !== 'undefined' ? navigator.languages || [navigator.language] : [], LANGS);
  const T = makeT(cfg.strings, () => lang);
  const setDir = () => { root.dir = isRtl(lang) ? 'rtl' : 'ltr'; root.lang = lang; };
  setDir();

  // ---- save: one slot; nothing is written until the player's own save has been read
  const save = { v: 1, lvl: 0, at: 0, stars: [], gags: [], lang: null, muted: false, learned: false };
  let saveLoaded = false, dirty = false, saveAt = 0, sentScore = -1;
  const persistSoon = () => { dirty = true; };
  const flush = () => { if (!dirty || mode !== 'play' || !saveLoaded) return; dirty = false; Promise.resolve().then(() => lib.saveUserGameState(JSON.parse(JSON.stringify(save)))).catch(() => { dirty = true; }); };
  const starCount = () => save.stars.reduce((a, b) => a + (b || 0), 0);
  const score = () => starCount() + save.gags.length;
  const sendScore = () => { const s = score(); if (mode !== 'play' || !saveLoaded || s <= sentScore || s <= 0) return; sentScore = s; Promise.resolve().then(() => lib.addPlayerScoreToLeaderboard(s)).catch(() => {}); };

  const sound = createSound({ music: set.music, sfx: set.sfx });
  const buzz = (kind) => { if (set.haptics === false || set.haptics === 0) return; try { lib.haptics.play(kind); } catch (e) { /* no vibration here */ } };
  const scene = createScene($('cv'));
  scene.setMotion(set.reduceMotion ? 0 : 1);

  // ---- the level being played
  let index = 0, level = null, W = null, view = null, busy = null, won = false, touched = false, stopT = 0, acc = 0, idle = 0, barAt = -1, freeAt = -1, clock = 0;
  const timers = []; // things due later on the game clock: [time, fn]
  const later = (sec, fn) => timers.push([clock + sec, fn]);

  function renderTop() { ui.top((index % LEVELS.length) + 1, LEVELS.length, starCount(), save.gags.length); }
  function found() { return level.items.map((it) => ({ icon: it.sticker, got: save.gags.includes(stickerId(level, it)) })); }
  function placeHand() {
    const show = mode === 'play' && !won && !busy && (!save.learned || idle > 6) && W;
    if (!show) return ui.hand(null);
    const it = !save.learned ? level.items.find((x) => x.result === 'win') : level.items.find((x) => !W.ropes.find((r) => r.id === x.id).cut);
    if (!it) return ui.hand(null);
    ui.hand(scene.screenOf(it.rope.ax, it.rope.ay - 1.25));
  }
  function loadLevel(i) {
    index = ((i % LEVELS.length) + LEVELS.length) % LEVELS.length;
    level = buildLevel(index, cfg.levelEdits || {}); W = createWorld(level, { gravityScale: Number(set.gravityScale) || 1 }); view = scene.loadLevel(level);
    busy = null; won = false; acc = 0; idle = 0; barAt = -1; freeAt = -1; timers.length = 0; slicer.reset();
    ui.bar(false); ui.prompt(T(level.prompt)); renderTop(); placeHand();
    if (mode === 'play' && saveLoaded && save.at !== index) { save.at = index; persistSoon(); }
  }

  function onCut(hit, ang) {
    if (mode !== 'play' || busy || !W) return;
    if (!cut(W, hit.id, hit.seg)) return;
    busy = hit.id; idle = 0; stopT = 0.045 * (Number(set.cutSlowMo) || 0);
    sound.play('snip'); buzz('tap'); scene.fx.emit('spark', hit.x, hit.y); scene.snip(hit.x, hit.y, ang);
    if (!save.learned) { save.learned = true; persistSoon(); }
    ui.prompt(''); placeHand();
  }
  function onTouch() {
    sound.start();
    if (!touched) { touched = true; }
    idle = 0; buzz('tick'); sound.play('swish');
  }
  const slicer = createSlicer(root, scene, () => (mode === 'play' ? W : null), onCut, onTouch);

  /** A cut thing reached its goal: play its ending. */
  function arrive(id) {
    const it = level.items.find((x) => x.id === id), g = it.goal, hero = view.hero, sid = stickerId(level, it), win = it.result === 'win';
    scene.fx.emit(it.fx, g.x, g.y); scene.fx.ring(g.x, Math.max(0, g.y - it.body.r), win ? 0xfff06a : 0xffffff); scene.shake(win ? 0.5 : 0.8);
    sound.play(it.sound); buzz(win ? 'thud' : 'warning');
    if (it.pop) { view.actors[id].group.visible = false; remove(W, id); }
    hero.react(it.react);
    if (it.tint !== undefined) { hero.tint(it.tint, true); later(2.4, () => hero.tint(null, false)); }
    if (it.clean) hero.tint(null, false);
    if (it.bloom) hero.set('bloom');
    if (it.propReact && view.props[it.propReact[0]]) view.props[it.propReact[0]].react(it.propReact[1]);
    if (!save.gags.includes(sid)) { save.gags.push(sid); later(0.35, () => { ui.toast(it.sticker, T('new_sticker')); sound.play('sticker'); }); }
    if (win) {
      won = true; save.stars[index] = 3; save.lvl = Math.max(save.lvl, Math.min(LEVELS.length - 1, index + 1));
      later(0.25, () => { ui.cheer(T('great')); sound.play('win'); buzz('success'); scene.fx.emit('confetti', 0, 5.5); scene.fx.emit('stars', g.x, g.y + 0.6); });
      barAt = clock + 0.9;
    }
    freeAt = clock + 0.7; // the next rope can be cut once this ending has been seen
    renderTop(); persistSoon(); sendScore();
  }

  function onEvent(e) {
    if (e.type === 'arrive') arrive(e.id);
    else if (e.type === 'bump') { const a = view.actors[e.id]; if (a && e.speed > 4) { a.react('bounce'); sound.play(a === view.hero ? 'land' : 'thud'); buzz('thud'); } }
  }

  // ---- buttons
  const press = (id, fn) => $(id).addEventListener('click', (e) => { e.stopPropagation(); sound.start(); sound.play('tap'); buzz('tap'); fn(); });
  press('next', () => loadLevel(index + 1));
  press('again', () => loadLevel(index));
  press('mute', () => { save.muted = !sound.muted; sound.setMuted(save.muted); ui.muteIcon(save.muted); persistSoon(); });
  press('book', () => {});

  // ---- frame loop
  let fpsT = 0, fpsN = 0, slow = 0, fast = 0, quality = 1;
  function frame(now) {
    if (!alive) return;
    raf = requestAnimationFrame(frame);
    const real = Math.min(0.05, (now - last) / 1000); last = now;
    if (document.hidden) return;
    // quality: a slow phone drops resolution and half the particles, and gets them back when it recovers
    fpsT += real; fpsN++;
    if (fpsT >= 1) { const fps = fpsN / fpsT; fpsT = 0; fpsN = 0; if (fps < 44) { slow++; fast = 0; } else if (fps > 55) { fast++; slow = 0; } if (slow >= 3 && quality > 0.7) { quality = 0.7; scene.setQuality(quality); slow = 0; } if (fast >= 6 && quality < 1) { quality = 1; scene.setQuality(quality); fast = 0; } }
    if (stopT > 0) stopT -= real; // the tiny freeze on a cut
    const dt = stopT > 0 ? 0 : real * speed;
    if (W) {
      acc = Math.min(acc + dt, STEP * 5);
      while (acc >= STEP) { acc -= STEP; for (const e of step(W)) onEvent(e); }
      clock += dt; idle += dt;
      for (let i = timers.length - 1; i >= 0; i--) if (timers[i][0] <= clock) { const fn = timers[i][1]; timers.splice(i, 1); fn(); }
      if (freeAt >= 0 && clock >= freeAt) { freeAt = -1; busy = null; placeHand(); }
      if (barAt >= 0 && clock >= barAt) { barAt = -1; ui.bar(true, { next: T('next'), again: T('again') }, found(), isRtl(lang)); }
      if (mode === 'play' && !busy && !won && idle > 6 && $('hand').hidden) placeHand();
      if (theme() !== 'bath' ? Math.random() < dt * 1.2 : Math.random() < dt * 2.5) scene.fx.emit(theme() === 'bath' ? 'bubbles' : 'mote', (Math.random() - 0.5) * 6, 1 + Math.random() * 7, theme() === 'bath' ? 0.04 : 1);
    }
    scene.update(W, mode === 'play' ? dt : real * 0.4);
    if (dirty && now - saveAt > 2000) { saveAt = now; flush(); }
  }
  const theme = () => (level ? level.theme : 'room');

  function fit() { const r = root.getBoundingClientRect(); root.style.setProperty('--u', String(r.width / 720)); scene.resize(r.width, r.height); }
  const onResize = () => { fit(); ui.refit(); placeHand(); };
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if (alive) ui.refit(); });
  window.addEventListener('resize', onResize);
  const onVis = () => { sound.suspend(document.hidden); if (document.hidden) flush(); };
  document.addEventListener('visibilitychange', onVis);

  try {
    lib.showGameParameters({ name: 'Snip It Settings', params: {
      'Gravity': { key: 'settings.gravityScale', type: 'slider', min: 0.6, max: 1.6, step: 0.05 },
      'Freeze on a cut': { key: 'settings.cutSlowMo', type: 'slider', min: 0, max: 3, step: 0.25 },
      'Music (0 off, 1 on)': { key: 'settings.music', type: 'slider', min: 0, max: 1, step: 1 },
      'Sound effects (0 off, 1 on)': { key: 'settings.sfx', type: 'slider', min: 0, max: 1, step: 1 },
      'Vibration (0 off, 1 on)': { key: 'settings.haptics', type: 'slider', min: 0, max: 1, step: 1 },
      'Calm camera (0 off, 1 on)': { key: 'settings.reduceMotion', type: 'slider', min: 0, max: 1, step: 1 },
    } });
  } catch (e) { /* host without a settings panel */ }

  fit();
  if (mode === 'edit') {
    // a still showcase of the first level: nothing can be cut, nothing is saved
    $('hud').classList.add('edit'); loadLevel(0);
  } else {
    loadLevel(0);
    const read = (tries) => Promise.resolve().then(() => lib.getUserGameState()).then((r) => {
      if (!alive) return;
      const st = r && r.state;
      if (st && typeof st === 'object') {
        // what was earned before the read finished is kept on top of the stored save
        const gags = save.gags.slice(), stars = save.stars.slice(), lvl = save.lvl, learned = save.learned, mutedNow = sound.muted, mutedTouched = save.muted !== false || mutedNow;
        save.gags = [...new Set([...(Array.isArray(st.gags) ? st.gags : []), ...gags])].filter((id) => allStickers().some((s) => s.id === id));
        save.stars = Array.from({ length: LEVELS.length }, (_, i) => Math.max(Number((Array.isArray(st.stars) ? st.stars : [])[i]) || 0, stars[i] || 0));
        save.lvl = Math.max(0, Math.min(LEVELS.length - 1, Math.max(Number(st.lvl) || 0, lvl)));
        save.learned = !!st.learned || learned;
        if (!mutedTouched) save.muted = !!st.muted;
        sound.setMuted(save.muted); ui.muteIcon(save.muted);
        if (typeof st.lang === 'string' && LANGS.includes(st.lang)) { save.lang = st.lang; lang = st.lang; setDir(); }
        const at = Math.max(0, Math.min(save.lvl, Number(st.at) || 0));
        if (!touched && at !== index) loadLevel(at); else { ui.prompt(T(level.prompt)); renderTop(); placeHand(); }
      }
      saveLoaded = true; save.at = index;
      if (touched) { persistSoon(); sendScore(); }
    }).catch(() => { if (alive) setTimeout(() => read(tries + 1), Math.min(10000, 1500 * (tries + 1))); /* keep trying; never write blind */ });
    read(0);
  }
  if (window.__load) window.__load.done();
  raf = requestAnimationFrame((t) => { last = t; frame(t); });

  return {
    destroy() {
      alive = false; cancelAnimationFrame(raf); flush(); sound.stop(); ui.clear(); slicer.destroy();
      window.removeEventListener('resize', onResize); document.removeEventListener('visibilitychange', onVis);
      scene.dispose(); root.innerHTML = '';
    },
    // dev:start
    debug: {
      get W() { return W; }, get level() { return level; }, get index() { return index; }, get busy() { return busy; }, get won() { return won; }, get save() { return save; },
      get saveLoaded() { return saveLoaded; }, get lang() { return lang; }, get touched() { return touched; }, get clock() { return clock; }, mode, scene, T, sound, loadLevel, flush,
      setLang(l) { lang = l; setDir(); if (!$('prompt').hidden) ui.prompt(T(level.prompt)); if (won) ui.bar(true, { next: T('next'), again: T('again') }, found(), isRtl(lang)); },
      /** Client position of a frame point, for tests that touch like a finger. */
      client(x, y) { const r = root.getBoundingClientRect(); return [r.left + x / 720 * r.width, r.top + y / 1280 * r.height]; },
      /** Frame position of the middle of rope `id`, where a finger would cross it. */
      ropeAt(id) { const rope = W.ropes.find((r) => r.id === id), l = W.links[rope.links[2]], a = W.pts[l.a], b = W.pts[l.b]; return scene.screenOf((a.x + b.x) / 2, (a.y + b.y) / 2); },
      get textures() { return scene.renderer.info.memory.textures; }, get geometries() { return scene.renderer.info.memory.geometries; },
    },
    // dev:end
  };
}

window.run = run;

// dev:start
// Outside the host (?local): stand in for it, read the config file and start.
if (typeof location !== 'undefined' && new URLSearchParams(location.search).has('local') && !window.lib) {
  const none = async () => ({});
  const store = { state: window.__preset || null };
  window.lib = { showGameParameters() {}, log() {}, getUserGameState: async () => (window.__saveFails ? Promise.reject(new Error('offline')) : new Promise((ok) => setTimeout(() => ok({ state: store.state }), window.__saveDelay || 0))),
    saveUserGameState: async (s) => { store.state = s; (window.__writes = window.__writes || []).push(s); }, addPlayerScoreToLeaderboard: async (s) => { (window.__scores = window.__scores || []).push(s); return {}; }, getTopNEntriesFromLeaderboard: none,
    shouldUseTouchControls: () => matchMedia('(pointer: coarse)').matches, haptics: { play(k) { (window.__buzz = window.__buzz || []).push(k); }, start() {}, stop() {} }, getAsset: () => undefined };
  fetch('./game_config.json').then((r) => r.json()).then((c) => { window.gameConfig = c; run(new URLSearchParams(location.search).get('mode') || 'play'); });
}
// dev:end
