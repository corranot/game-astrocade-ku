// PROTOTYPE - NOT FOR PRODUCTION
// Genre: "+1" smash-and-grow for kids. +1 Mega Hammer: tap to slam a giant hammer; every object it breaks adds to
// the hammer's size, so it grows on screen and can break the bigger, numbered things it bounced off before.
// Milestone 2: six zones (fruit stand, market, street, park, city, cake vault finale), growth, 8 evolution looks,
// camera pull-back, hit effects and sound. Finishing the vault starts again with every gain doubled (x2, x4, ...);
// once the session is 60 s or longer, a results card shows the size first.
// Modules: logic.js (rules), models.js (geometry), scene.js (3D look, Three.js r187 loaded by index.html).
/* global THREE */ // set on window by index.html before run() starts the game
import * as L from './logic.js';
import { createScene } from './scene.js';

const LANGS = ['en', 'ar', 'es', 'vi', 'hi', 'bn', 'id'];
const PENTA = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24];

// ---------------------------------------------------------------- sound: all made in code, no files to load
const Sound = (() => {
  let ctx = null, master = null, music = null, noise = null, muted = false, step = 0, nextT = 0, song = null, songBuf = null, songLoading = false, songVol = 0.3;
  const ensure = () => {
    if (ctx) return ctx;
    try { ctx = new (window.AudioContext || window.webkitAudioContext)(); master = ctx.createGain(); master.gain.value = 0.8; master.connect(ctx.destination); music = ctx.createGain(); music.gain.value = 0.13; music.connect(master); } catch (e) { ctx = null; }
    if (ctx) { noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate); const d = noise.getChannelData(0); let s = 1; for (let i = 0; i < d.length; i++) { s = (s * 16807) % 2147483647; d[i] = s / 1073741823.5 - 1; } }
    return ctx;
  };
  function tone(type, f0, f1, dur, vol, at = 0, dest = master) {
    const t = ctx.currentTime + at, o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(dest); o.start(t); o.stop(t + dur + 0.02);
  }
  function hiss(f, q, dur, vol, at = 0) {
    const t = ctx.currentTime + at, s = ctx.createBufferSource(), fl = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noise; fl.type = 'bandpass'; fl.frequency.value = f; fl.Q.value = q;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(fl).connect(g).connect(master); s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.02);
  }
  function playSong() {
    if (!ctx || ctx.state === 'closed' || !songBuf || song) return;
    const src = ctx.createBufferSource(), g = ctx.createGain(); src.buffer = songBuf; src.loop = true; g.gain.value = 0.0001;
    g.gain.exponentialRampToValueAtTime(songVol, ctx.currentTime + 1.2); src.connect(g).connect(master); src.start(); song = src;
  }
  const MAT = { fruit: [900, 2, 0.12], wood: [420, 4, 0.16], cloth: [1300, 1.5, 0.12], toy: [1700, 3, 0.1], stone: [260, 1.2, 0.3], cake: [650, 0.8, 0.2] };
  return {
    unlock() { if (ensure() && ctx.state === 'suspended') ctx.resume(); },
    get muted() { return muted; },
    setMuted(m) { muted = m; if (master) master.gain.value = m ? 0 : 0.8; },
    /** Slam thud: deeper as the hammer grows (scale s): 140 Hz down to 48 Hz. */
    thud(s) { if (!ctx) return; const f = Math.max(48, 140 - (s - 1) * 30); tone('sine', f * 1.6, f * 0.6, 0.28, 0.55); hiss(180, 1, 0.18, 0.25); },
    breakMat(m, i) { if (!ctx) return; const [f, q, d] = MAT[m] || MAT.wood; hiss(f * (0.9 + (i % 3) * 0.08), q, d, 0.35, i * 0.012); if (m === 'fruit') tone('sine', 520, 180, 0.09, 0.12, i * 0.012); else if (m === 'toy') tone('square', 880, 520, 0.06, 0.05, i * 0.012); else if (m === 'stone') tone('sine', 110, 50, 0.3, 0.2, i * 0.012); else if (m === 'cake') tone('sine', 300, 120, 0.2, 0.15, i * 0.012); },
    /** A vault hit that does not break it yet: heavy clang, higher as the vault weakens (hp left). */
    clang(hp) { if (!ctx) return; const f = 180 + (6 - hp) * 40; tone('triangle', f * 2, f, 0.4, 0.22); tone('sine', f * 3.01, f * 2.9, 0.5, 0.06); hiss(2400, 2, 0.25, 0.12); },
    bonk() { if (!ctx) return; tone('square', 210, 150, 0.1, 0.08); tone('sine', 330, 240, 0.12, 0.1); },
    ding(combo) { if (!ctx) return; const n = PENTA[Math.min(PENTA.length - 1, combo - 1)]; tone('triangle', 660 * 2 ** (n / 12), 660 * 2 ** (n / 12), 0.22, 0.14); tone('sine', 1320 * 2 ** (n / 12), 1320 * 2 ** (n / 12), 0.12, 0.05); },
    grow() { if (!ctx) return; tone('sine', 90, 55, 0.35, 0.3); },
    /** A gem lands in the hammer: a bright tick that climbs with each gem of the burst (k). */
    gem(k) { if (!ctx) return; const n = PENTA[k % PENTA.length]; tone('sine', 1760 * 2 ** (n / 12), 1760 * 2 ** (n / 12), 0.08, 0.05); },
    fanfare() { if (!ctx) return; [0, 4, 7, 12].forEach((n, i) => { tone('triangle', 523 * 2 ** (n / 12), 523 * 2 ** (n / 12), 0.3, 0.13, i * 0.09); tone('sine', 261 * 2 ** (n / 12), 261 * 2 ** (n / 12), 0.35, 0.08, i * 0.09); }); },
    evolve() { if (!ctx) return; [0, 7, 12, 16, 19, 24].forEach((n, i) => tone('triangle', 392 * 2 ** (n / 12), 392 * 2 ** (n / 12), 0.25, 0.12, i * 0.06)); hiss(3000, 0.7, 0.6, 0.08, 0.1); },
    /**
     * Loads the generated music track (asset id from the config) and loops it; until it arrives, or if it never
     * does (no asset map, offline), the code-made loop below plays instead.
     */
    loadSong(id, vol) {
      songVol = vol;
      if (songBuf && !song) { playSong(); return; }
      if (songLoading || !ctx || !id) return; songLoading = true;
      let a = null; try { a = lib.getAsset(id); } catch (e) { /* no asset map */ }
      if (!a || !a.url) return;
      fetch(a.url).then((r) => r.arrayBuffer()).then((b) => new Promise((res, rej) => ctx.decodeAudioData(b, res, rej))).then((b) => {
        songBuf = b; playSong();
      }).catch(() => { /* keep the code-made loop */ });
    },
    /** Stops the recorded song (the run ended); the next touch in a new run starts it again from the kept buffer. */
    stopSong() { if (song) { try { song.stop(); } catch (e) { /* already stopped */ } song = null; } },
    /** Toy-funk loop at 120 bpm: bass and marimba, scheduled ahead (only while no recorded song plays). */
    music() {
      if (!ctx || muted || song) return;
      const beat = 0.25, BASS = [0, 0, 7, 0, 5, 5, 7, 4], MEL = [12, 16, 19, 16, 14, 12, 9, 12];
      if (nextT < ctx.currentTime) nextT = ctx.currentTime + 0.05;
      while (nextT < ctx.currentTime + 0.3) {
        const at = nextT - ctx.currentTime, b = step % 8;
        if (step % 2 === 0) tone('triangle', 98 * 2 ** (BASS[b] / 12), 98 * 2 ** (BASS[b] / 12), 0.22, 0.5, at, music);
        if (step % 4 === 1 || step % 8 === 6) tone('sine', 392 * 2 ** (MEL[(step >> 1) % 8] / 12), 392 * 2 ** (MEL[(step >> 1) % 8] / 12), 0.16, 0.28, at, music);
        nextT += beat / 2; step++;
      }
    },
  };
})();

const buzz = (kind) => { try { lib.haptics.play(kind); } catch (e) { /* no vibration on web */ } };
const fmt = (n) => (n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e4 ? (n / 1e3).toFixed(1) + 'K' : String(Math.floor(n)));

/** Starts the game in mode 'play' or 'edit' (edit: live picture, no input, no saving). Returns { destroy, debug }. */
export function run(mode = 'play') {
  if (window.__mh) { try { window.__mh.destroy(); } catch (e) { console.warn('previous run', e); } }
  if (typeof THREE === 'undefined') {
    // a second run() while waiting replaces this wait (the destroy above), so only the last mode starts
    const again = () => { removeEventListener('three-ready', again); window.__mh = run(mode); };
    addEventListener('three-ready', again);
    const wait = { destroy() { removeEventListener('three-ready', again); if (window.__mh === wait) window.__mh = null; } };
    window.__mh = wait;
    return wait;
  }
  const cfg = JSON.parse(JSON.stringify(window.gameConfig || {}));
  const qs = new URLSearchParams(location.search);
  const root = document.getElementById('app');
  root.innerHTML = HTML;
  const $ = (id) => root.querySelector('#' + id);
  $('mute').textContent = Sound.muted ? '🔇' : '🔊'; // the sound module outlives a run: show its state
  const detect = () => { for (const l of navigator.languages || [navigator.language || 'en']) { const k = String(l).slice(0, 2).toLowerCase(); if (LANGS.includes(k)) return k; } return 'en'; };
  let lang = detect();
  const T = (k, v = {}) => String((cfg.strings[lang] || cfg.strings.en)[k] || cfg.strings.en[k] || k).replace(/\{(\w+)\}/g, (_, n) => v[n]);
  const setDir = () => { root.dir = lang === 'ar' ? 'rtl' : 'ltr'; $('hint').textContent = T('tap'); };
  setDir();

  const random = L.rng(cfg.seed);
  let scene;
  try { scene = createScene($('cv'), cfg, L.rng(cfg.seed + 101)); } catch (e) {
    // no WebGL2 (or the context was refused): a retry button with a reason code, never a blank screen or a thrown error
    console.warn('webgl', e); root.innerHTML = '';
    if (window.__load) window.__load.fail('GL'); return { destroy() {} };
  }
  let tier = qs.has('tier') ? Number(qs.get('tier')) : cfg.quality.start;
  scene.setTier(tier);
  const speed = Math.max(1, Number(qs.get('speed')) || 1);

  const save = { best: 0, runs: 0, tier: 0 };
  let saveLoaded = false;
  const persist = () => { if (mode === 'play' && saveLoaded) Promise.resolve().then(() => lib.saveUserGameState({ ...save })).catch(() => {}); };

  let mult = 1, R = null, touched = false, alive = true, raf = 0, last = 0, hitstop = 0, banner = 0, frames = [], tierCheckT = 0;
  const swing = { phase: 'idle', t: 0, x: 0, z: 0, queued: null };
  const aim = { x: 0, z: 0, tx: 0, tz: 0 };
  const hold = { on: false, sx: 0.5, sy: 0.6, t: 0 };
  let demoT = 0;

  function newRun() {
    R = L.createRun(cfg, random, mult);
    scene.setObjects(R.objects, R.L);
    scene.hammer.setTier(0);
    const first = L.bestSlam(cfg, R) || { x: 0, z: 0 };
    aim.x = aim.tx = first.x; aim.z = aim.tz = first.z + 0.6;
    renderTop(true);
  }

  // ---------------------------------------------------------------- HUD
  const pops = [];
  for (let i = 0; i < cfg.fx.numbersMax; i++) { const d = document.createElement('div'); d.className = 'pop out'; $('pops').appendChild(d); pops.push(d); }
  let popNext = 0;
  /** A "+N" that jumps from the break towards the counter (CSS animation; one DOM write on spawn). */
  function popNumber(x, y, z, n, big) {
    const [sx, sy] = scene.toScreen(x, y, z), d = pops[popNext]; popNext = (popNext + 1) % pops.length;
    d.textContent = '+' + fmt(n); d.className = 'pop out' + (big ? ' big' : '');
    d.style.left = (sx * 100) + '%'; d.style.top = (sy * 100) + '%';
    d.style.setProperty('--dx', ((0.5 - sx) * 100) + 'cqw'); d.style.setProperty('--dy', ((0.08 - sy) * 100) + 'cqh');
    void d.offsetWidth; d.classList.add('go');
  }
  let shownL = -1, shownP = -1;
  function renderTop(force) {
    const Lr = Math.floor(R.L), p = Math.round(L.zoneProgress(R) * 100) / 100;
    if (force || Lr !== shownL) { $('size').textContent = fmt(Lr); shownL = Lr; if (!force) { const c = $('counter'); c.classList.remove('bump'); void c.offsetWidth; c.classList.add('bump'); } }
    if (force || p !== shownP) { $('bar').style.width = Math.min(100, p / cfg.zones[R.zone].clear * 100) + '%'; shownP = p; }
    $('zone').textContent = (R.zone + 1) + '/' + cfg.zones.length; $('mult').textContent = mult > 1 ? 'x' + mult : ''; $('mult').hidden = mult <= 1;
  }
  /** Results card: final hammer size, best, the next multiplier on the again button, and share when the host has it. */
  function showCard() {
    card = true; hold.on = false;
    $('cSize').textContent = fmt(R.L); $('cGems').textContent = fmt(gemsGot); $('cBest').textContent = T('best', { n: fmt(Math.max(save.best, R.L)) });
    $('cAgain').textContent = T('again', { m: mult * cfg.rebirth.mult }); $('cShare').textContent = T('share');
    $('cShare').hidden = !(window.lib && typeof lib.share === 'function');
    $('cTitle').textContent = T('size');
    $('card').hidden = false; void $('card').offsetWidth; $('card').classList.add('show');
    Sound.fanfare(); buzz('success');
  }
  function again() {
    if (card) { card = false; $('card').classList.remove('show'); $('card').hidden = true; }
    mult *= cfg.rebirth.mult; gemsGot = 0; newRun(); showBanner('x' + mult + '!', 'gold'); Sound.fanfare();
  }
  function showBanner(text, cls) { const b = $('banner'); b.textContent = text; b.className = 'banner out ' + (cls || ''); void b.offsetWidth; b.classList.add('show'); banner = 1.6; }

  // ---------------------------------------------------------------- slams
  function startSlam(x, z) {
    if (swing.phase === 'down') { swing.queued = { x, z }; return; }
    swing.phase = 'down'; swing.t = 0; swing.x = x; swing.z = z; aim.tx = x; aim.tz = z;
  }
  function land() {
    const s = L.hammerScale(cfg, R.L), reach = L.reach(cfg, R.L);
    const ev = L.slam(cfg, R, swing.x, swing.z);
    let broke = 0, bigHit = false, gainSum = 0;
    Sound.thud(s);
    for (const e of ev) {
      if (e.type === 'break') {
        const o = R.objects[e.id]; scene.burst(e.id); Sound.breakMat(cfg.kinds[o.kind].mat, broke); broke++; gainSum += e.gain;
        if (o.req > 1) { bigHit = true; scene.gems(o.x, o.z, o.boss ? cfg.gems.vault : Math.min(cfg.gems.max, 1 + Math.floor(Math.log10(o.req))), cfg.kinds[o.kind].r * 1.4); }
        popNumber(o.x, cfg.kinds[o.kind].r * 2, o.z, e.gain, o.req > 1);
      } else if (e.type === 'bonk') { scene.bonk(e.id); Sound.bonk(); }
      else if (e.type === 'hit') { scene.hit(e.id, R.L); Sound.clang(e.hp); bigHit = true; buzz('heavy'); }
      else if (e.type === 'open') scene.open(e.id, R.L);
      else if (e.type === 'tier') { scene.hammer.setTier(e.tier); evolveFx = 1; Sound.evolve(); showBanner(T('evolve'), 'gold'); buzz('heavy'); if (touched && mode === 'play') { save.tier = Math.max(save.tier, e.tier); persist(); } }
      else if (e.type === 'clear') { const Z = cfg.zones[e.zone]; scene.confetti(0, Z.z); Sound.fanfare(); showBanner(T('clear'), 'jade'); }
      else if (e.type === 'done') doneT = cfg.results.delay;
    }
    scene.impact(swing.x, swing.z, reach, bigHit);
    scene.shake(broke || bigHit ? (bigHit ? 0.75 : 0.45) : 0.25);
    hitstop = broke || bigHit ? (bigHit ? cfg.fx.hitstopBig : cfg.fx.hitstop) : 0;
    if (broke) { Sound.ding(R.combo); Sound.grow(); growFx = 1; buzz(bigHit ? 'medium' : 'light'); }
    // every label that is now within reach of the new size turns green
    for (const o of R.objects) if (o.alive && o.req > 1) scene.relabel(o.id, R.L);
    renderTop();
    if (touched && mode === 'play' && R.L > save.best) save.best = R.L;
  }
  let evolveFx = 0, growFx = 0, doneT = 0, sessT = 0, card = false, gemsGot = 0, gemTick = 0;

  // ---------------------------------------------------------------- input: tap = slam there, hold = slam again
  const rect = () => root.getBoundingClientRect();
  function target(sx, sy) {
    // forgiving aim: snap to the live object drawn nearest the finger, else the ground point
    let best = null, bd = 0.09;
    for (const o of R.objects) {
      if (!o.alive || o.zone !== R.zone) continue;
      const [ox, oy] = scene.toScreen(o.x, cfg.kinds[o.kind].r, o.z), d = Math.hypot(ox - sx, (oy - sy) * 16 / 9);
      if (d < bd) { bd = d; best = o; }
    }
    if (best) return { x: best.x, z: best.z };
    return scene.toGround(sx, sy);
  }
  function onDown(e) {
    if (mode !== 'play' || card || e.target.closest('button')) return;
    if (e.button !== undefined && e.button !== 0 && e.pointerType === 'mouse') return;
    const r = rect(), sx = (e.clientX - r.left) / r.width, sy = (e.clientY - r.top) / r.height;
    Sound.unlock(); Sound.loadSong(cfg.music.id, cfg.music.volume);
    if (!touched) { touched = true; $('hint').hidden = true; }
    hold.on = true; hold.sx = sx; hold.sy = sy; hold.t = cfg.hammer.repeat; hold.id = e.pointerId;
    const p = target(sx, sy); if (p) startSlam(p.x, p.z);
  }
  function onMove(e) { if (!hold.on || e.pointerId !== hold.id) return; const r = rect(); hold.sx = (e.clientX - r.left) / r.width; hold.sy = (e.clientY - r.top) / r.height; }
  function onUp(e) { if (e.pointerId === hold.id) hold.on = false; }
  function onKey(e) {
    if (mode !== 'play' || e.code !== 'Space' || e.repeat) return;
    e.preventDefault();
    if (card) { again(); return; } Sound.unlock(); Sound.loadSong(cfg.music.id, cfg.music.volume); touched = true; $('hint').hidden = true;
    const p = L.bestSlam(cfg, R) || target(hold.sx, hold.sy); if (p) startSlam(p.x, p.z);
  }
  const noMenu = (e) => e.preventDefault();
  root.addEventListener('pointerdown', onDown); window.addEventListener('pointermove', onMove); window.addEventListener('pointerup', onUp); window.addEventListener('pointercancel', onUp);
  root.addEventListener('contextmenu', noMenu); window.addEventListener('keydown', onKey);
  $('cAgain').addEventListener('click', () => { Sound.unlock(); again(); });
  $('cShare').addEventListener('click', () => { Promise.resolve().then(() => lib.share({ text: T('brag', { n: fmt(Math.max(save.best, R ? R.L : 0)) }) })).catch(() => {}); });
  $('mute').addEventListener('click', () => { Sound.unlock(); Sound.setMuted(!Sound.muted); $('mute').textContent = Sound.muted ? '🔇' : '🔊'; });
  function fit() { const r = rect(); root.style.setProperty('--u', String(r.width / 720)); root.style.containerType = 'size'; scene.resize(Math.max(1, Math.round(r.width)), Math.max(1, Math.round(r.height))); }
  const onResize = () => fit();
  window.addEventListener('resize', onResize);
  const onVis = () => { last = performance.now(); };
  document.addEventListener('visibilitychange', onVis);

  // ---------------------------------------------------------------- frame
  function step(dt) {
    for (const id of L.tick(cfg, R, dt)) scene.regrow(id);
    if (touched) sessT += dt;
    // attract mode before the first touch: the hammer taps the ground next to the first apple, breaking nothing
    if (!touched) {
      demoT += dt;
      if (demoT > 1.3 && swing.phase === 'idle') { demoT = 0; swing.phase = 'demo'; swing.t = 0; }
    }
    if (hold.on && touched && swing.phase === 'idle') { hold.t -= dt; if (hold.t <= 0) { hold.t = cfg.hammer.repeat; const p = target(hold.sx, hold.sy); if (p) startSlam(p.x, p.z); } }
    const H = scene.hammer, s = L.hammerScale(cfg, R.L);
    aim.x += (aim.tx - aim.x) * Math.min(1, dt * 14); aim.z += (aim.tz - aim.z) * Math.min(1, dt * 14);
    // swing curve: raised at 1.35 rad, down to 0 in cfg.hammer.swing, back up in cfg.hammer.recover
    let ang = 1.35 + Math.sin(R.t * 2.2) * 0.06;
    if (swing.phase === 'down') {
      swing.t += dt; const k = Math.min(1, swing.t / cfg.hammer.swing); ang = 1.35 * (1 - k * k);
      if (k >= 1) { land(); swing.phase = 'up'; swing.t = 0; }
    } else if (swing.phase === 'up') {
      swing.t += dt; const k = Math.min(1, swing.t / cfg.hammer.recover); ang = 1.35 * (1 - (1 - k) * (1 - k)) - Math.sin(k * Math.PI) * 0.1;
      if (k >= 1) { swing.phase = 'idle'; if (swing.queued) { const q = swing.queued; swing.queued = null; startSlam(q.x, q.z); } }
    } else if (swing.phase === 'demo') {
      swing.t += dt; const k = Math.min(1, swing.t / 0.5); ang = 1.35 - Math.sin(k * Math.PI) * 1.0;
      if (k >= 1) swing.phase = 'idle';
    }
    growFx = Math.max(0, growFx - dt * 3); evolveFx = Math.max(0, evolveFx - dt * 1.2);
    const over = 1 + Math.sin(growFx * Math.PI) * 0.12 + Math.sin(evolveFx * Math.PI) * 0.35;
    H.root.position.set(aim.x, 0, aim.z); H.root.rotation.y = cfg.hammer.yaw; H.root.scale.setScalar(s * over * cfg.hammer.model); H.pivot.rotation.x = ang;
    H.gem.rotation.y += dt * 2;
    scene.updateObjects(dt, R.zone);
    scene.updateFx(dt);
    const got = scene.updateGems(dt);
    if (got) { gemsGot += got; Sound.gem(gemTick++); }
    scene.updateWorld(dt);
    scene.updateCamera(dt, (cfg.zones[R.zone].z + aim.z) / 2, s);
    if (banner > 0) { banner -= dt; if (banner <= 0) $('banner').classList.remove('show'); }
    if (doneT > 0) {
      doneT -= dt;
      if (doneT <= 0) {
        if (touched && mode === 'play') { save.runs++; persist(); Promise.resolve().then(() => lib.addPlayerScoreToLeaderboard(Math.floor(save.best))).catch(() => {}); }
        // no end screen before cfg.results.minSession: a short session goes straight on into the x2 run
        if (touched && mode === 'play' && sessT >= cfg.results.minSession) showCard(); else again();
      }
    }
  }
  function frame(now) {
    if (!alive) return;
    raf = requestAnimationFrame(frame);
    let dt = Math.min(0.05, (now - last) / 1000); last = now;
    frames.push(dt);
    if (hitstop > 0) { hitstop -= dt; dt = 0; }
    for (let i = 0; i < speed; i++) step(dt);
    if (touched) Sound.music();
    // adaptive quality: after 3 s, every 2 s, drop a tier when the median frame is slower than cfg.quality.dropMs
    tierCheckT += Math.min(0.05, frames[frames.length - 1]);
    if (tierCheckT > 2 && performance.now() > 3000 && !qs.has('tier')) {
      const f = frames.slice().sort((a, b) => a - b), med = f[f.length >> 1] * 1000;
      if (med > cfg.quality.dropMs && tier > 0) { tier--; scene.setTier(tier); fit(); }
      frames = []; tierCheckT = 0;
    }
    if (frames.length > 400) frames = frames.slice(-200);
    scene.render();
  }

  newRun();
  fit();
  if (mode === 'play') {
    const read = (tries) => Promise.resolve().then(() => lib.getUserGameState()).then((r) => {
      if (!alive) return;
      const st = r && r.state;
      if (st && typeof st === 'object') {
        const num = (v) => (Number.isFinite(Number(v)) ? Math.max(0, Number(v)) : 0);
        save.best = Math.max(save.best, num(st.best)); save.runs = num(st.runs) + save.runs; save.tier = Math.min(7, Math.max(save.tier, Math.floor(num(st.tier))));
      }
      saveLoaded = true;
    }).catch(() => { if (alive) setTimeout(() => read(tries + 1), Math.min(10000, 1500 * (tries + 1))); /* keep trying; never write blind */ });
    read(0);
  } else { $('hint').hidden = true; }
  if (window.__load) window.__load.done();
  last = performance.now();
  raf = requestAnimationFrame(frame);

  const api = {
    destroy() {
      alive = false; cancelAnimationFrame(raf);
      root.removeEventListener('pointerdown', onDown); window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp); window.removeEventListener('pointercancel', onUp);
      root.removeEventListener('contextmenu', noMenu); window.removeEventListener('keydown', onKey); window.removeEventListener('resize', onResize); document.removeEventListener('visibilitychange', onVis);
      Sound.stopSong(); scene.dispose(); root.innerHTML = ''; if (window.__mh === api) window.__mh = null;
    },
    debug: {
      get R() { return R; }, get touched() { return touched; }, get mult() { return mult; }, get save() { return save; }, get saveLoaded() { return saveLoaded; }, get lang() { return lang; },
      get tier() { return tier; }, scene, cfg, L, Sound,
      setLang(l) { lang = l; setDir(); },
      // dev:start
      /** Test shortcut: earlier zones gone, play at zone z with hammer size size (the finale test uses it). */
      skipTo(z, size) {
        for (const o of R.objects) if (o.zone < z && o.alive) { o.alive = false; o.regrow = 0; scene.burst(o.id); }
        R.zone = z; R.L = size; R.tier = L.tierOf(cfg, size); scene.hammer.setTier(R.tier);
        for (const o of R.objects) if (o.alive && o.req > 1) scene.relabel(o.id, R.L);
        const b = L.bestSlam(cfg, R) || { x: 0, z: cfg.zones[z].z }; aim.x = aim.tx = b.x; aim.z = aim.tz = b.z;
        renderTop(true);
      },
      // dev:end
      /** Client position of a world point, for tests that touch like a finger. */
      client(x, y, z) { const [sx, sy] = scene.toScreen(x, y, z), r = rect(); return [r.left + sx * r.width, r.top + sy * r.height]; },
      get card() { return card; }, get gemsGot() { return gemsGot; }, get sessT() { return sessT; },
      get busy() { return swing.phase === 'down' || swing.phase === 'up'; },
    },
  };
  window.__mh = api;
  window.__game = api.debug;
  return api;
}

const HTML = `
<canvas id="cv"></canvas>
<div class="hud">
  <div id="counter" class="counter"><span class="ham" aria-hidden="true"></span><b id="size" class="out">1</b><i id="mult" class="mult out" hidden></i></div>
  <div class="prog"><span id="zone" class="zone out">1/2</span><i><b id="bar"></b></i></div>
  <button id="mute" class="mute" aria-label="sound">🔊</button>
  <div id="pops"></div>
  <div id="banner" class="banner out"></div>
  <div id="hint" class="hint out">TAP!</div>
  <div id="card" class="card" hidden><div class="cbox"><p id="cTitle" class="ctitle out"></p><span class="ham big" aria-hidden="true"></span><b id="cSize" class="csize out">1</b><span class="cgem"><i class="gemi" aria-hidden="true"></i><b id="cGems" class="out">0</b></span><p id="cBest" class="cbest out"></p>
    <button id="cAgain" class="cbtn out"></button><button id="cShare" class="cbtn alt out"></button></div></div>
</div>`;

window.run = run;

// Outside Astrocade (?local): stand in for the host, read the config file and start.
if (typeof location !== 'undefined' && new URLSearchParams(location.search).has('local') && !window.lib) {
  const none = async () => ({});
  const store = { state: window.__preset || null };
  window.lib = { showGameParameters() {}, log() {}, getUserGameState: async () => (window.__saveFails ? Promise.reject(new Error('offline')) : { state: store.state }),
    saveUserGameState: async (s) => { store.state = s; (window.__writes = window.__writes || []).push(s); }, addPlayerScoreToLeaderboard: none, getTopNEntriesFromLeaderboard: none, share: async () => { window.__shares = (window.__shares || 0) + 1; },
    shouldUseTouchControls: () => matchMedia('(pointer: coarse)').matches, haptics: { play() {}, start() {}, stop() {} }, getAsset: () => undefined };
  fetch('./game_config.json').then((r) => r.json()).then((c) => { window.gameConfig = c; run(new URLSearchParams(location.search).get('mode') || 'play'); });
}
