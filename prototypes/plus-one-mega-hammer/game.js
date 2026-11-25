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
  const MAT = { fruit: [900, 2, 0.12], wood: [420, 4, 0.16], cloth: [1300, 1.5, 0.12], toy: [1700, 3, 0.1], stone: [260, 1.2, 0.3], cake: [650, 0.8, 0.2], sand: [500, 0.7, 0.18], snow: [700, 0.6, 0.2], ice: [2600, 3, 0.14] };
  return {
    unlock() { if (ensure() && ctx.state === 'suspended') ctx.resume(); },
    get muted() { return muted; },
    setMuted(m) { muted = m; if (master) master.gain.value = m ? 0 : 0.8; },
    /** Slam thud: deeper as the hammer grows (scale s): 140 Hz down to 48 Hz. */
    thud(s) { if (!ctx) return; const f = Math.max(48, 140 - (s - 1) * 30); tone('sine', f * 1.6, f * 0.6, 0.28, 0.55); hiss(180, 1, 0.18, 0.25); },
    breakMat(m, i) { if (!ctx) return; const [f, q, d] = MAT[m] || MAT.wood; hiss(f * (0.9 + (i % 3) * 0.08), q, d, 0.35, i * 0.012); if (m === 'fruit') tone('sine', 520, 180, 0.09, 0.12, i * 0.012); else if (m === 'toy') tone('square', 880, 520, 0.06, 0.05, i * 0.012); else if (m === 'stone') tone('sine', 110, 50, 0.3, 0.2, i * 0.012); else if (m === 'cake') tone('sine', 300, 120, 0.2, 0.15, i * 0.012); else if (m === 'ice') tone('triangle', 2400, 1800, 0.12, 0.06, i * 0.012); },
    /** A vault hit that does not break it yet: heavy clang, higher as the vault weakens (hp left). */
    clang(hp) { if (!ctx) return; const f = 180 + (6 - hp) * 40; tone('triangle', f * 2, f, 0.4, 0.22); tone('sine', f * 3.01, f * 2.9, 0.5, 0.06); hiss(2400, 2, 0.25, 0.12); },
    bonk() { if (!ctx) return; tone('square', 210, 150, 0.1, 0.08); tone('sine', 330, 240, 0.12, 0.1); },
    ding(combo) { if (!ctx) return; const n = PENTA[Math.min(PENTA.length - 1, combo - 1)]; tone('triangle', 660 * 2 ** (n / 12), 660 * 2 ** (n / 12), 0.22, 0.14); tone('sine', 1320 * 2 ** (n / 12), 1320 * 2 ** (n / 12), 0.12, 0.05); },
    grow() { if (!ctx) return; tone('sine', 90, 55, 0.35, 0.3); },
    /** Tier-up "WHOOM": a noise sweep rising from 180 Hz to 2.6 kHz over a sub drop. */
    whoom() {
      if (!ctx) return; const t = ctx.currentTime, s = ctx.createBufferSource(), fl = ctx.createBiquadFilter(), g = ctx.createGain();
      s.buffer = noise; fl.type = 'bandpass'; fl.Q.value = 1.4; fl.frequency.setValueAtTime(180, t); fl.frequency.exponentialRampToValueAtTime(2600, t + 0.55);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.5, t + 0.35); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.75);
      s.connect(fl).connect(g).connect(master); s.start(t); s.stop(t + 0.8); tone('sine', 120, 38, 0.7, 0.45);
    },
    /** A gem lands in the hammer: a bright tick that climbs with each gem of the burst (k). */
    gem(k) { if (!ctx) return; const n = PENTA[k % PENTA.length]; tone('sine', 1760 * 2 ** (n / 12), 1760 * 2 ** (n / 12), 0.08, 0.05); },
    /** A boss wakes: a low growl (saw sweep over a sub) with a breathy rumble. */
    roar() { if (!ctx) return; tone('sawtooth', 110, 52, 0.75, 0.16); tone('sine', 70, 34, 0.9, 0.4); hiss(380, 0.8, 0.7, 0.22, 0.05); },
    /** A boss breaks: a rising major arpeggio over a deep boom. */
    bossDown() { if (!ctx) return; tone('sine', 90, 30, 1.0, 0.5); [0, 4, 7, 12, 16, 19, 24].forEach((n, i) => { tone('triangle', 392 * 2 ** (n / 12), 392 * 2 ** (n / 12), 0.35, 0.12, 0.12 + i * 0.07); tone('sine', 196 * 2 ** (n / 12), 196 * 2 ** (n / 12), 0.4, 0.06, 0.12 + i * 0.07); }); hiss(3200, 0.6, 0.9, 0.08, 0.5); },
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
  let qa = { tier, rs: 1, okT: 0, fails: [] }; // adaptive quality state (L.adaptQuality)
  const speed = Math.max(1, Number(qs.get('speed')) || 1);

  const today = L.dayNumber(new Date()), goal = L.dailyGoal(cfg, today);
  const save = { best: 0, runs: 0, tier: 0, gems: 0, owned: ['classic'], skin: 'classic', worlds: 1, seen: 0, daily: { day: today, p: 0, done: false } };
  const baseZones = cfg.zones, NW = cfg.worlds.length;
  let world = 0; // run n plays world n mod NW: Toy Town, Sunny Beach, Candy Land, Snow Peak
  const SK = Object.fromEntries(cfg.skins.map((k) => [k.id, k]));
  let saveLoaded = false;
  const persist = () => { if (mode === 'play' && saveLoaded) Promise.resolve().then(() => lib.saveUserGameState({ ...save, owned: [...save.owned] })).catch(() => {}); };

  let mult = 1, R = null, touched = false, alive = true, raf = 0, last = 0, hitstop = 0, banner = 0, frames = [], tierCheckT = 0;
  const swing = { phase: 'idle', t: 0, x: 0, z: 0, queued: null, ang: 1.35, from: 1.35 };
  const TOP = 1.75; // the wind-up lifts the hammer past its rest angle (1.35 rad) before it comes down
  const aim = { x: 0, z: 0, tx: 0, tz: 0 };
  const hold = { on: false, sx: 0.5, sy: 0.6, t: 0 };
  let demoT = 0;

  function newRun() {
    pend.length = 0; bossT = 0; shownCombo = 0; comboT = 0; if ($('combo')) $('combo').hidden = true;
    cfg.zones = L.worldZones(cfg, baseZones, world); scene.setWorld(cfg.worlds[world]);
    R = L.createRun(cfg, random, mult);
    scene.setObjects(R.objects, R.L);
    scene.hammer.setTier(0);
    const first = L.bestSlam(cfg, R) || { x: 0, z: 0 };
    aim.x = aim.tx = first.x; aim.z = aim.tz = first.z + 0.6;
    renderTop(true); if (scene.prewarm) scene.prewarm();
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
  /** A "+N" from screen point (sx, sy) to (tx, ty), all 0..1. */
  function popAt(sx, sy, tx, ty, text) {
    const d = pops[popNext]; popNext = (popNext + 1) % pops.length;
    d.textContent = text; d.className = 'pop out big';
    d.style.left = (sx * 100) + '%'; d.style.top = (sy * 100) + '%';
    d.style.setProperty('--dx', ((tx - sx) * 100) + 'cqw'); d.style.setProperty('--dy', ((ty - sy) * 100) + 'cqh');
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
    $('cSize').textContent = fmt(R.L); $('cGems').textContent = '+' + fmt(gemsGot); $('cBest').textContent = T('best', { n: fmt(Math.max(save.best, R.L)) });
    $('cAgain').textContent = T('again', { m: mult * cfg.rebirth.mult }); $('cShare').textContent = T('share');
    $('cShare').hidden = !(window.lib && typeof lib.share === 'function');
    $('cTitle').textContent = T('size'); $('cHam').firstChild.textContent = T('hammers'); showGems(false); renderDaily();
    $('card').hidden = false; void $('card').offsetWidth; $('card').classList.add('show');
    Sound.fanfare(); buzz('success');
  }
  function again() {
    if (card) { card = false; $('card').classList.remove('show'); $('card').hidden = true; }
    mult *= cfg.rebirth.mult; gemsGot = 0; world = (world + 1) % NW;
    if (mode === 'play') { save.worlds = Math.max(save.worlds, Math.min(NW, world + 1)); persist(); }
    cineUsed = 0; newRun(); showBanner(T('world_' + cfg.worlds[world].id), 'gold world', 'x' + mult + '!'); Sound.fanfare();
    playCine('world');
  }
  // ---------------------------------------------------------------- gems and the hammer collection
  /** Gem total in the HUD chip and the collection; a dot on the hammer buttons when a new hammer is affordable. */
  function showGems(bump) {
    $('gemN').textContent = fmt(save.gems); $('collG').textContent = fmt(save.gems);
    if (bump) { const c = $('gemchip'); c.classList.remove('bump'); void c.offsetWidth; c.classList.add('bump'); }
    const can = cfg.skins.some((k) => !save.owned.includes(k.id) && k.cost <= save.gems);
    for (const d of root.querySelectorAll('.dot')) d.hidden = !can;
  }
  /** Puts the saved skin on the 3D hammer and every icon. */
  function wear() {
    const sk = SK[save.skin] || SK.classic; scene.hammer.setSkin(sk);
    $('hudHam').innerHTML = hamIcon(1, sk); $('cardHam').innerHTML = hamIcon(2, sk); $('hamBtnI').innerHTML = hamIcon(3, sk);
  }
  let collOpen = false;
  function renderColl() {
    $('collT').textContent = T('hammers'); showGems(false);
    $('grid').innerHTML = cfg.skins.map((k, i) => {
      const own = save.owned.includes(k.id), on = save.skin === k.id, can = !own && k.cost <= save.gems;
      const tag = on ? `<span class="skc on">${T('equipped')}</span>` : own ? `<span class="skc use">${T('equip')}</span>` : `<span class="skc cost${can ? ' can' : ''}"><i class="gemi" aria-hidden="true"></i>${fmt(k.cost)}</span>`;
      return `<button class="sk${on ? ' on' : ''}${own ? '' : ' locked'}" data-id="${k.id}"><span class="ham">${hamIcon(10 + i, k)}</span><b class="skn">${T('skin_' + k.id)}</b>${tag}</button>`;
    }).join('');
  }
  function openColl() { if (mode !== 'play') return; collOpen = true; hold.on = false; renderColl(); const c = $('coll'); c.hidden = false; void c.offsetWidth; c.classList.add('show'); Sound.unlock(); }
  function closeColl() { collOpen = false; const c = $('coll'); c.classList.remove('show'); c.hidden = true; }
  /** A tap on a collection card: equip an owned hammer, buy an affordable one, or shake when gems are short. */
  function pick(id) {
    const k = SK[id]; if (!k) return;
    if (save.owned.includes(id)) { if (save.skin !== id) { save.skin = id; wear(); persist(); Sound.ding(5); buzz('light'); } renderColl(); return; }
    if (save.gems < k.cost) { const b = $('grid').querySelector(`[data-id="${id}"]`); if (b) { b.classList.remove('no'); void b.offsetWidth; b.classList.add('no'); } Sound.bonk(); buzz('light'); return; }
    save.gems -= k.cost; save.owned.push(id); save.skin = id; wear(); persist(); renderColl();
    const b = $('grid').querySelector(`[data-id="${id}"]`); if (b) b.classList.add('got');
    Sound.evolve(); Sound.fanfare(); buzz('success'); showBanner(T('unlocked'), 'gold');
  }

  // ---------------------------------------------------------------- daily goal
  /** Draws the daily goal (start screen chip and results card): what to do today and how far along it is. */
  function renderDaily() {
    const D = save.daily, p = Math.min(goal.n, D.p), txt = T('daily_' + goal.type, { n: fmt(goal.n) });
    for (const el of root.querySelectorAll('.daily')) {
      el.querySelector('.dt').textContent = T('daily'); el.querySelector('.dg').textContent = txt;
      el.querySelector('.dn').textContent = D.done ? '\u2713' : fmt(p) + '/' + fmt(goal.n);
      el.querySelector('.dbar b').style.width = (D.done ? 100 : p / goal.n * 100) + '%'; el.classList.toggle('done', D.done);
    }
  }
  /** Moves the daily goal on: add (counted goals) or reach (best-of goals). Pays cfg.daily.reward gems once. */
  function daily(type, v, add) {
    if (mode !== 'play' || !touched || goal.type !== type) return;
    const D = save.daily; if (D.day !== today) { D.day = today; D.p = 0; D.done = false; }
    if (D.done) return;
    D.p = add ? D.p + v : Math.max(D.p, v);
    if (D.p >= goal.n) {
      D.done = true; save.gems += cfg.daily.reward; showGems(true); persist();
      showBanner(T('daily_done'), 'jade', '+' + cfg.daily.reward); Sound.fanfare(); buzz('success'); gems2hud(cfg.daily.reward);
    }
  }
  /** A burst of gems from the screen centre into the gem chip (the daily reward), as flying "+N" numbers. */
  function gems2hud(n) { const c = $('gemchip').getBoundingClientRect(), r = rect(); popAt(0.5, 0.42, (c.left + c.width / 2 - r.left) / r.width, (c.top + c.height / 2 - r.top) / r.height, '+' + n); }

  function showBanner(text, cls, sub) { const b = $('banner'); b.textContent = text; if (sub) { const sm = document.createElement('small'); sm.textContent = sub; b.prepend(sm); } b.className = 'banner out ' + (cls || ''); void b.offsetWidth; b.classList.add('show'); banner = 1.6; }

  // ---------------------------------------------------------------- slams
  function startSlam(x, z) {
    if (swing.phase === 'down' || swing.phase === 'wind') { swing.queued = { x, z }; return; }
    swing.phase = 'wind'; swing.t = 0; swing.from = swing.ang; swing.x = x; swing.z = z; aim.tx = x; aim.tz = z;
  }
  function land() {
    const s = L.hammerScale(cfg, R.L), reach = L.reach(cfg, R.L);
    const ev = L.slam(cfg, R, swing.x, swing.z);
    let broke = 0, bigHit = false, gainSum = 0, splashSum = 0;
    Sound.thud(s);
    for (const e of ev) {
      if (e.type === 'break' && e.splash) {
        // the shockwave: small things around the hit pop outward in a ripple, one "+N" for all of them
        const o = R.objects[e.id]; pend.push({ id: e.id, t: (e.d - reach) / reach * cfg.fx.splashDelay * 2 + 0.02, mat: cfg.kinds[o.kind].mat });
        splashSum += e.gain; gainSum += e.gain; broke++;
      } else if (e.type === 'break') {
        const o = R.objects[e.id]; scene.burst(e.id); Sound.breakMat(cfg.kinds[o.kind].mat, broke); broke++; gainSum += e.gain;
        if (o.req > 1) { daily('smash', 1, true); if (o.boss) { daily('boss', 1, true); defeatOf = o; } }
        if (o.req > 1) { bigHit = true; scene.gems(o.x, o.z, o.boss ? cfg.gems.vault : Math.min(cfg.gems.max, 1 + Math.floor(Math.log10(o.req))), cfg.kinds[o.kind].r * 1.4); }
        popNumber(o.x, cfg.kinds[o.kind].r * 2, o.z, e.gain, o.req > 1);
      } else if (e.type === 'bonk') { scene.bonk(e.id); Sound.bonk(); }
      else if (e.type === 'hit') { scene.hit(e.id, R.L); Sound.clang(e.hp); bigHit = true; buzz('heavy'); }
      else if (e.type === 'open') scene.open(e.id, R.L);
      else if (e.type === 'tier') {
        // the tier-up moment: slow motion, a camera punch-in, a golden ring three reaches wide, the hammer overshoots
        scene.hammer.setTier(e.tier); evolveFx = 1; slowT = cfg.fx.tierSlowMo; scene.punch(1); scene.ring(swing.x, swing.z, reach * cfg.fx.tierRing, 0.9);
        Sound.evolve(); Sound.whoom(); showBanner(T('evolve'), 'gold'); buzz('heavy'); if (touched && mode === 'play') { save.tier = Math.max(save.tier, e.tier); persist(); } }
      else if (e.type === 'clear') {
        if (touched) persist(); const Z = cfg.zones[e.zone]; scene.confetti(0, Z.z); Sound.fanfare(); showBanner(T('clear'), 'jade');
        // the zone before the boss is done: the boss cutscene follows a moment later
        if (e.zone === cfg.zones.length - 2 && R.objects.some((b) => b.boss && b.alive && b.zone === R.zone)) bossT = cfg.cine.boss.delay;
      }
      else if (e.type === 'done') doneT = cfg.results.delay;
    }
    if (defeatOf) { playCine('defeat', 0, defeatOf); defeatOf = null; }
    if (splashSum) popNumber(swing.x, 0.6, swing.z, splashSum, false);
    scene.impact(swing.x, swing.z, reach, bigHit);
    squashT = 1; if (bigHit) { scene.kick(1); scene.scare(swing.x, swing.z, reach * cfg.fx.scare); }
    scene.shake(broke || bigHit ? (bigHit ? 0.75 : 0.45) : 0.25);
    hitstop = broke || bigHit ? (bigHit ? cfg.fx.hitstopBig : cfg.fx.hitstop) : 0;
    if (broke) { Sound.ding(R.combo); Sound.grow(); growFx = 1; buzz(bigHit ? 'medium' : 'light'); showCombo(); daily('size', R.L, false); daily('combo', R.combo, false); }
    // every label that is now within reach of the new size turns green
    for (const o of R.objects) if (o.alive && o.req > 1) scene.relabel(o.id, R.L);
    renderTop();
    if (touched && mode === 'play' && R.L > save.best) save.best = R.L;
  }
  let defeatOf = null, bossT = 0, evolveFx = 0, growFx = 0, doneT = 0, sessT = 0, card = false, gemsGot = 0, gemTick = 0, slowT = 0, squashT = 0, comboT = 0, shownCombo = 0;
  const pend = []; // splash breaks waiting for their ripple delay
  /** The combo chip under the progress bar: shown from cfg.fx.comboShow breaks in a row, pops on every step. */
  function showCombo() {
    if (R.combo < cfg.fx.comboShow || R.combo === shownCombo) return;
    shownCombo = R.combo; const c = $('combo'); c.textContent = '\u00d7' + R.combo + ' ' + T('combo');
    c.hidden = false; c.classList.remove('pop2'); void c.offsetWidth; c.classList.add('pop2'); comboT = cfg.growth.combo;
  }

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
    if (mode !== 'play' || card || collOpen || e.target.closest('button')) return;
    if (e.button !== undefined && e.button !== 0 && e.pointerType === 'mouse') return;
    if (cine) { if (cine.t >= cfg.cine.skipAfter) endCine(); return; }
    const r = rect(), sx = (e.clientX - r.left) / r.width, sy = (e.clientY - r.top) / r.height;
    Sound.unlock(); Sound.loadSong(cfg.music.id, cfg.music.volume);
    if (!touched) { touched = true; $('hint').hidden = true; $('hamBtn').hidden = true; $('daily').hidden = true; }
    hold.on = true; hold.sx = sx; hold.sy = sy; hold.t = cfg.hammer.repeat; hold.id = e.pointerId;
    const p = target(sx, sy); if (p) startSlam(p.x, p.z);
  }
  function onMove(e) { if (!hold.on || e.pointerId !== hold.id) return; const r = rect(); hold.sx = (e.clientX - r.left) / r.width; hold.sy = (e.clientY - r.top) / r.height; }
  function onUp(e) { if (e.pointerId === hold.id) hold.on = false; }
  function onKey(e) {
    if (mode !== 'play' || e.code !== 'Space' || e.repeat || collOpen) return;
    e.preventDefault();
    if (card) { again(); return; } if (cine) { if (cine.t >= cfg.cine.skipAfter) endCine(); return; } Sound.unlock(); Sound.loadSong(cfg.music.id, cfg.music.volume); touched = true; $('hint').hidden = true; $('hamBtn').hidden = true; $('daily').hidden = true;
    const p = L.bestSlam(cfg, R) || target(hold.sx, hold.sy); if (p) startSlam(p.x, p.z);
  }
  const noMenu = (e) => e.preventDefault();
  root.addEventListener('pointerdown', onDown); window.addEventListener('pointermove', onMove); window.addEventListener('pointerup', onUp); window.addEventListener('pointercancel', onUp);
  root.addEventListener('contextmenu', noMenu); window.addEventListener('keydown', onKey);
  $('cAgain').addEventListener('click', () => { Sound.unlock(); again(); });
  $('cShare').addEventListener('click', () => { Promise.resolve().then(() => lib.share({ text: T('brag', { n: fmt(Math.max(save.best, R ? R.L : 0)) }) })).catch(() => {}); });
  $('hamBtn').addEventListener('click', openColl); $('cHam').addEventListener('click', openColl); $('collX').addEventListener('click', closeColl);
  $('grid').addEventListener('click', (e) => { const b = e.target.closest('.sk'); if (b) pick(b.dataset.id); });
  $('mute').addEventListener('click', () => { Sound.unlock(); Sound.setMuted(!Sound.muted); $('mute').textContent = Sound.muted ? '🔇' : '🔊'; });
  // safe area: the phone's notch and home bar insets, minus what the letterbox around the 9:16 stage already leaves
  const probe = document.createElement('div'); probe.style.cssText = 'position:fixed;visibility:hidden;pointer-events:none;padding:env(safe-area-inset-top,0px) 0 env(safe-area-inset-bottom,0px)'; document.body.appendChild(probe);
  function fit() {
    const r = rect(), cs = getComputedStyle(probe);
    root.style.setProperty('--st', Math.max(0, parseFloat(cs.paddingTop) - r.top) + 'px'); root.style.setProperty('--sb', Math.max(0, parseFloat(cs.paddingBottom) - (innerHeight - r.bottom)) + 'px');
    root.style.setProperty('--u', String(r.width / 720)); root.style.containerType = 'size'; scene.resize(Math.max(1, Math.round(r.width)), Math.max(1, Math.round(r.height))); }
  const onResize = () => fit();
  window.addEventListener('resize', onResize);
  const onVis = () => { last = performance.now(); };
  document.addEventListener('visibilitychange', onVis);

  // ---------------------------------------------------------------- frame
  function step(dt) {
    for (const id of L.tick(cfg, R, dt)) scene.regrow(id);
    if (touched && !cine) sessT += dt; // cutscenes never eat play time
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
    if (swing.phase === 'wind') {
      swing.t += dt; const k = Math.min(1, swing.t / cfg.hammer.windup); ang = swing.from + (TOP - swing.from) * (1 - (1 - k) * (1 - k));
      if (k >= 1) { swing.phase = 'down'; swing.t = 0; }
    } else if (swing.phase === 'down') {
      swing.t += dt; const k = Math.min(1, swing.t / cfg.hammer.swing); ang = TOP * (1 - k * k);
      if (k >= 1) { land(); swing.phase = 'up'; swing.t = 0; }
    } else if (swing.phase === 'up') {
      swing.t += dt; const k = Math.min(1, swing.t / cfg.hammer.recover); ang = 1.35 * (1 - (1 - k) * (1 - k)) - Math.sin(k * Math.PI) * 0.1;
      if (k >= 1) { swing.phase = 'idle'; if (swing.queued) { const q = swing.queued; swing.queued = null; startSlam(q.x, q.z); } }
    } else if (swing.phase === 'demo') {
      swing.t += dt; const k = Math.min(1, swing.t / 0.5); ang = 1.35 - Math.sin(k * Math.PI) * 1.0;
      if (k >= 1) swing.phase = 'idle';
    }
    swing.ang = ang;
    growFx = Math.max(0, growFx - dt * 3); evolveFx = Math.max(0, evolveFx - dt * 1.2); squashT = Math.max(0, squashT - dt / cfg.fx.squash);
    const over = 1 + Math.sin(growFx * Math.PI) * 0.12 + Math.sin(evolveFx * Math.PI) * 0.35;
    // the drawn hammer grows a little faster than its reach (s ^ visExp), so it reads as giant as the camera pulls back
    H.root.position.set(aim.x, dropY, aim.z); H.root.rotation.y = cfg.hammer.yaw; H.root.scale.setScalar(Math.pow(s, cfg.hammer.visExp) * over * cfg.hammer.model); H.pivot.rotation.x = ang;
    // the head squashes flat on impact and springs back
    const q = Math.sin(squashT * Math.PI) * squashT; H.head.scale.set(1 + 0.22 * q, 1 - 0.3 * q, 1 + 0.22 * q);
    for (let i = pend.length - 1; i >= 0; i--) { const p = pend[i]; p.t -= dt; if (p.t <= 0) { scene.burst(p.id); Sound.breakMat(p.mat, i % 4); pend.splice(i, 1); } }
    if (comboT > 0) { comboT -= dt; if (comboT <= 0 || R.combo === 0) { comboT = 0; shownCombo = 0; $('combo').hidden = true; } }
    H.gem.rotation.y += dt * 2;
    scene.updateObjects(dt, R.zone);
    scene.updateFx(dt);
    const got = scene.updateGems(dt);
    if (got) { gemsGot += got; Sound.gem(gemTick++); if (mode === 'play') { save.gems += got; showGems(true); daily('gems', got, true); } }
    scene.updateWorld(dt, R.zone);
    // the view leans towards the hammer (aimW in depth, aimX sideways, at most 0.3 of the zone width), so the head stays in frame
    stepCine(dt);
    const Zc = cfg.zones[R.zone], fx = Math.max(-Zc.w * 0.3, Math.min(Zc.w * 0.3, aim.x * cfg.camera.aimX));
    scene.updateCamera(dt, Zc.z * (1 - cfg.camera.aimW) + aim.z * cfg.camera.aimW, s, fx);
    if (banner > 0) { banner -= dt; if (banner <= 0) $('banner').classList.remove('show'); }
    if (bossT > 0 && !cine) { bossT -= dt; if (bossT <= 0) playCine('boss'); }
    if (doneT > 0 && !cine) {
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
    // a rAF timestamp can sit just before the last one (first frame, a page clock reset): never step backwards
    let dt = Math.max(0, Math.min(0.05, (now - last) / 1000)); last = now;
    frames.push(dt);
    if (hitstop > 0) { hitstop -= dt; dt = 0; }
    if (slowT > 0) { slowT -= dt; dt *= cfg.fx.tierSlowScale; } // the tier-up slow motion runs on real time
    for (let i = 0; i < speed; i++) step(dt);
    if (touched) Sound.music();
    // adaptive quality: after 3 s, once per window, the median frame steers the render scale first, then the tier,
    // down when slow and back up when it has been fast for a while (L.adaptQuality)
    tierCheckT += Math.min(0.05, frames[frames.length - 1]);
    if (tierCheckT > cfg.quality.window && performance.now() > 3000 && !qs.has('tier')) {
      const f = frames.slice().sort((a, b) => a - b), med = f[f.length >> 1] * 1000, n = L.adaptQuality(cfg.quality, qa, med, tierCheckT);
      if (n.tier !== qa.tier) { tier = n.tier; scene.setTier(tier); scene.setScale(n.rs); fit(); } else if (n.rs !== qa.rs) scene.setScale(n.rs);
      qa = n; frames = []; tierCheckT = 0;
    }
    if (frames.length > 400) frames = frames.slice(-200);
    scene.render();
  }

  // ---------------------------------------------------------------- cutscenes
  // A cutscene flies the camera along cfg.cine[id].keys (L.cinePose), with letterbox bars and the HUD faded out.
  // One tap skips it to its end state. Its length comes from L.cineFit: shorter when seen before this session, and
  // never past cfg.cine.maxPerRun seconds a run. The session clock stops while one plays.
  const reduce = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const seenCine = new Set(), cineLog = [];
  let cine = null, cineUsed = 0, cineOut = 0, dropY = 0, introWait = -1;
  /** Starts cutscene id; len overrides its length. Returns false when there is no time left for it this run. */
  function playCine(id, len, o) {
    const C = cfg.cine[id]; if (!C || mode !== 'play') return false;
    // a boss cutscene's keys are offsets from its boss (o, else the run's boss)
    if (C.rel && !o) o = R.objects.find((b) => b.boss && b.alive) || R.objects.find((b) => b.boss);
    if (C.rel && !o) return false;
    const full = L.cineLen(C.keys), d = len || L.cineFit(cfg, full, seenCine.has(id), cineUsed);
    if (!d) return false;
    if (cine) endCine(true);
    seenCine.add(id); cineLog.push(id); cineUsed += d; hold.on = false;
    const keys = C.rel ? C.keys.map((q) => ({ ...q, pos: [q.pos[0] + o.x, q.pos[1], q.pos[2] + o.z], look: [q.look[0] + o.x, q.look[1], q.look[2] + o.z] })) : C.keys;
    cine = { id, t: 0, d, k: full / d, C, keys, o, landed: false, woke: false, wave: false };
    // reduce motion: the camera stays at play, only the bars and the titles show; a blended one eases in from play
    scene.cineCam.w = reduce || C.blend ? 0 : 1; cineOut = 0;
    if (id === 'defeat') { slowT = C.slow; showBanner(T('boss_down'), 'gold', T('boss_' + o.kind)); Sound.bossDown(); buzz('heavy'); scene.confetti(o.x, o.z); scene.ring(o.x, o.z, cfg.kinds[o.kind].r * 6, 0.9); }
    root.style.setProperty('--bars', String(cfg.cine.bars));
    root.classList.add('cine'); root.classList.toggle('intro', id === 'intro'); scene.labels(!C.rel);
    return true;
  }
  /** Ends the cutscene now (a skip lands on the same end state as a full play) and hands the camera back. */
  function endCine(quiet) {
    if (!cine) return;
    const c = cine; cine = null; dropY = 0;
    if (c.id === 'intro' && !c.landed) introLand(quiet);
    if (c.id === 'boss' && !c.woke) bossWake(c, true);
    root.classList.remove('cine', 'intro', 'landed'); scene.labels(true);
    cineOut = reduce ? 0 : cfg.cine.blendOut;
  }
  function introLand(quiet) {
    const s = L.hammerScale(cfg, R.L);
    scene.impact(aim.x, aim.z, L.reach(cfg, R.L), true); scene.puff(aim.x, aim.z, 14, 0.9); scene.shake(0.6);
    if (!quiet) { Sound.thud(s * 2.2); buzz('heavy'); }
  }
  /** The boss cutscene's beat: the boss wobbles awake with a growl and its name comes up. */
  function bossWake(c, quiet) {
    c.woke = true; scene.wake(c.o.id); showBanner(T('boss'), 'gold', T('boss_' + c.o.kind));
    if (!quiet) { Sound.roar(); buzz('heavy'); }
  }
  function stepCine(dt) {
    if (introWait >= 0) {
      // the first frames hold on the sky until the save says whether this player has seen the long intro
      introWait += dt; if (saveLoaded || introWait > 1.2) { introWait = -1; startIntro(); }
      else { L.cinePose(cfg.cine.intro.keys, 0, scene.cineCam); scene.cineCam.w = reduce ? 0 : 1; dropY = cfg.cine.intro.dropFrom; return; }
    }
    if (!cine) { if (cineOut > 0) { cineOut -= dt; scene.cineCam.w = reduce ? 0 : Math.max(0, cineOut / cfg.cine.blendOut); } else scene.cineCam.w = 0; return; }
    cine.t += dt; const tau = Math.min(cine.t * cine.k, L.cineLen(cine.keys));
    if (!reduce) { L.cinePose(cine.keys, tau, scene.cineCam); if (cine.C.blend) scene.cineCam.w = L.ease(Math.min(1, cine.t / cfg.cine.blendIn)); }
    if (cine.id === 'boss' && !cine.woke && tau >= cine.C.wakeAt) bossWake(cine, false);
    if (cine.id === 'defeat' && !cine.wave && tau >= cine.C.waveAt) { cine.wave = true; const r = cfg.kinds[cine.o.kind].r; scene.ring(cine.o.x, cine.o.z, r * 9, 1.1); scene.puff(cine.o.x, cine.o.z, 6, r); scene.shake(0.5); }
    if (cine.id === 'intro') {
      const I = cine.C, u = Math.max(0, Math.min(1, (tau - I.dropAt) / (I.dropLand - I.dropAt)));
      dropY = tau < I.dropAt ? I.dropFrom : I.dropFrom * (1 - u * u);
      if (u >= 1 && !cine.landed) { cine.landed = true; dropY = 0; introLand(false); root.classList.add('landed'); }
    }
    if (cine.t >= cine.d) endCine();
  }
  function startIntro() {
    if (mode !== 'play' || touched) { dropY = 0; scene.cineCam.w = 0; return; }
    // a returning player gets the new world's fly-over instead; a new player the long intro once, then the short one
    if (save.runs > 0) { dropY = 0; if (!playCine('world')) scene.cineCam.w = 0; return; }
    playCine('intro', save.seen ? cfg.cine.intro.short : 0);
    save.seen = 1;
  }

  newRun();
  fit();
  scene.prewarm();
  if (mode === 'play') introWait = 0;
  wear(); showGems(false); renderDaily();
  if (mode === 'play') {
    const read = (tries) => Promise.resolve().then(() => lib.getUserGameState()).then((r) => {
      if (!alive) return;
      const st = r && r.state;
      if (st && typeof st === 'object') {
        const num = (v) => (Number.isFinite(Number(v)) ? Math.max(0, Number(v)) : 0);
        save.best = Math.max(save.best, num(st.best)); save.runs = num(st.runs) + save.runs; save.tier = Math.min(7, Math.max(save.tier, Math.floor(num(st.tier))));
        // gems earned before the save arrived add to the saved ones; owned hammers merge; a saved skin is worn if owned
        save.gems = Math.floor(num(st.gems)) + save.gems; save.seen = save.seen || (st.seen ? 1 : 0);
        if (Array.isArray(st.owned)) for (const id of st.owned) if (SK[id] && !save.owned.includes(id)) save.owned.push(id);
        if (save.skin === 'classic' && SK[st.skin] && save.owned.includes(st.skin)) save.skin = st.skin;
        const sd = st.daily;
        if (sd && typeof sd === 'object' && Number(sd.day) === today) { save.daily.p = Math.max(save.daily.p, num(sd.p)); save.daily.done = save.daily.done || !!sd.done; }
        renderDaily();
        save.worlds = Math.min(NW, Math.max(save.worlds, Math.floor(num(st.worlds)) || 1));
        // a returning player starts in the next world, as long as the first touch has not come yet
        if (!touched && save.runs > 0 && save.runs % NW !== world) { world = save.runs % NW; newRun(); showBanner(T('world_' + cfg.worlds[world].id), 'gold world'); }
        wear(); showGems(false); if (collOpen) renderColl();
      }
      saveLoaded = true;
    }).catch(() => { if (alive) setTimeout(() => read(tries + 1), Math.min(10000, 1500 * (tries + 1))); /* keep trying; never write blind */ });
    read(0);
  } else { $('hint').hidden = true; $('hamBtn').hidden = true; $('gemchip').hidden = true; $('daily').hidden = true; }
  if (window.__load) window.__load.done();
  last = performance.now();
  raf = requestAnimationFrame(frame);

  const api = {
    destroy() {
      alive = false; cancelAnimationFrame(raf);
      root.removeEventListener('pointerdown', onDown); window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp); window.removeEventListener('pointercancel', onUp);
      root.removeEventListener('contextmenu', noMenu); window.removeEventListener('keydown', onKey); window.removeEventListener('resize', onResize); document.removeEventListener('visibilitychange', onVis);
      Sound.stopSong(); scene.dispose(); root.innerHTML = ''; probe.remove(); if (window.__mh === api) window.__mh = null;
    },
    debug: {
      get R() { return R; }, get touched() { return touched; }, get mult() { return mult; }, get save() { return save; }, get saveLoaded() { return saveLoaded; }, get lang() { return lang; },
      get tier() { return tier; }, get world() { return world; }, scene, cfg, L, Sound, get collOpen() { return collOpen; }, openColl, closeColl, pick,
      setLang(l) { lang = l; setDir(); renderDaily(); },
      get goal() { return goal; },
      get cine() { return cine && { id: cine.id, t: cine.t, d: cine.d }; }, get cineUsed() { return cineUsed; }, get introWait() { return introWait; }, get cineLog() { return cineLog; }, get quality() { return qa; },
      playCine, endCine,
      // dev:start
      /** Test shortcut: finish today's goal (as if played). */
      dailyFinish() { daily(goal.type, goal.n, false); },
      /** Test shortcut: start a fresh run in world w. */
      setWorld(w) { world = w % NW; cineUsed = 0; seenCine.clear(); newRun(); },
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
      get busy() { return swing.phase === 'wind' || swing.phase === 'down' || swing.phase === 'up'; },
    },
  };
  window.__mh = api;
  window.__game = api.debug;
  return api;
}

/**
 * The hammer icon (HUD, results card, collection): a gold medallion with the game's mallet mid-swing. With a skin
 * from the config it takes that skin's colours and pattern; without one it is the classic steel head, gold bands,
 * wooden handle and red grip. k makes the SVG ids unique per copy on the page.
 */
function hamIcon(k, sk) {
  const s = sk && sk.head ? sk : null, band = s ? s.band : '#f2c96a', grip = s ? s.grip : '#e06356';
  const handle = s ? s.handle : `url(#hw${k})`, head = s ? (s.pattern === 'rainbow' ? `url(#hr${k})` : s.head) : `url(#hs${k})`;
  let deco = '';
  if (s && s.pattern === 'stripes') deco = [15, 25, 35, 45].map((x) => `<path d="M${x} 9l6 0l-8 20l-6 0z" fill="${s.p2}" stroke="none"/>`).join('');
  else if (s && s.pattern === 'drips') deco = `<path d="M11 15.5V15a6 6 0 0 1 6-6h30a6 6 0 0 1 6 6v.5c-2 0-2 6-4.5 6s-2.5-4-4.5-4-2 8-4.5 8-2-6-4.5-6-2.5 4-5 4-2-6-4.5-6-2.5 3-4.5 3-2-3-4-3z" fill="${s.p2}" stroke="none"/>`;
  else if (s && s.pattern === 'bolts') deco = `<rect x="24" y="12" width="16" height="6" rx="2.5" fill="${s.p2}" stroke="none"/>` + [14, 50].map((x) => `<circle cx="${x}" cy="13" r="1.6" fill="#e8ecf6" stroke="none"/><circle cx="${x}" cy="25" r="1.6" fill="#e8ecf6" stroke="none"/>`).join('');
  else if (s && s.pattern === 'scales') deco = [[16, 14], [26, 20], [36, 14], [46, 20], [21, 24], [41, 24]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2" fill="${s.p2}" stroke="none"/>`).join('');
  const spikes = s && s.spikes ? `<path d="M16 9.5l3.5-7l3.5 7M27 9.5l4-8.5l4 8.5M39 9.5l3.5-7l3.5 7" fill="${s.band}" stroke-width="2.2"/>` : '';
  return `<svg viewBox="0 0 64 64" aria-hidden="true">
  <defs>
    <radialGradient id="hb${k}" cx="38%" cy="30%" r="75%"><stop offset="0" stop-color="#ffe6a6"/><stop offset=".55" stop-color="#f0b847"/><stop offset="1" stop-color="#b67a20"/></radialGradient>
    <linearGradient id="hs${k}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#a9b0c8"/><stop offset=".5" stop-color="#6e7491"/><stop offset="1" stop-color="#454a63"/></linearGradient>
    <linearGradient id="hw${k}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#d39a58"/><stop offset="1" stop-color="#9a6430"/></linearGradient>
    <linearGradient id="hr${k}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#ff5d6c"/><stop offset=".2" stop-color="#ff9f43"/><stop offset=".4" stop-color="#ffd84a"/><stop offset=".6" stop-color="#5fd38a"/><stop offset=".8" stop-color="#4cb8ff"/><stop offset="1" stop-color="#9b7bff"/></linearGradient>
  </defs>
  <circle cx="32" cy="32" r="29.5" fill="url(#hb${k})" stroke="#23263a" stroke-width="3.5"/>
  <circle cx="32" cy="32" r="24.5" fill="none" stroke="#fff3cf" stroke-opacity=".45" stroke-width="1.5"/>
  <g transform="rotate(-38 32 33)" stroke="#23263a" stroke-linejoin="round">
    <rect x="28.6" y="27" width="6.8" height="29" rx="3" fill="${handle}" stroke-width="2.6"/>
    <rect x="28" y="44" width="8" height="11" rx="2.6" fill="${grip}" stroke-width="2.4"/>
    <path d="M28.6 47.5h6.8M28.6 51h6.8" stroke="#23263a" stroke-opacity=".35" stroke-width="1.4"/>
    ${spikes}
    <rect x="11" y="9" width="42" height="20" rx="6.5" fill="${head}" stroke-width="3"/>
    ${deco}
    <rect x="19" y="9" width="5" height="20" fill="${band}" stroke-width="2"/>
    <rect x="40" y="9" width="5" height="20" fill="${band}" stroke-width="2"/>
    <rect x="8.5" y="11.5" width="6" height="15" rx="2.5" fill="#dfe3ee" stroke-width="2.4"/>
    <rect x="49.5" y="11.5" width="6" height="15" rx="2.5" fill="#dfe3ee" stroke-width="2.4"/>
    <rect x="15" y="12" width="34" height="3.4" rx="1.7" fill="#fff" fill-opacity=".45" stroke="none"/>
    <rect x="27" y="27.5" width="10" height="4.5" rx="1.6" fill="${band}" stroke-width="2"/>
  </g>
</svg>`;
}

const HTML = `
<canvas id="cv"></canvas>
<div class="hud">
  <i class="lb t" aria-hidden="true"></i><i class="lb b" aria-hidden="true"></i>
  <div id="logo" class="logo out" aria-hidden="true"><b>+1</b>MEGA<br>HAMMER</div>
  <svg class="skip" viewBox="0 0 48 48" aria-hidden="true"><path d="M10 12l14 12-14 12zM26 12l14 12-14 12z"/></svg>
  <div id="gemchip" class="gemchip"><i class="gemi" aria-hidden="true"></i><b id="gemN" class="out">0</b></div>
  <div id="counter" class="counter"><span id="hudHam" class="ham" aria-hidden="true">${hamIcon(1)}</span><b id="size" class="out">1</b><i id="mult" class="mult out" hidden></i></div>
  <div class="prog"><span id="zone" class="zone out">1/2</span><i><b id="bar"></b></i></div>
  <div id="combo" class="combo out" hidden></div>
  <button id="mute" class="mute" aria-label="sound">🔊</button>
  <div id="pops"></div>
  <div id="banner" class="banner out"></div>
  <div id="hint" class="hint out">TAP!</div>
  <div id="daily" class="daily"><i class="dicon" aria-hidden="true"></i><span class="dtx"><b class="dt out"></b><span class="dg out"></span><i class="dbar"><b></b></i></span><b class="dn out"></b></div>
  <button id="hamBtn" class="hambtn" aria-label="hammers"><span id="hamBtnI" class="ham">${hamIcon(3)}</span><i class="dot" hidden></i></button>
  <div id="card" class="card" hidden><div class="cbox"><p id="cTitle" class="ctitle out"></p><span id="cardHam" class="ham big" aria-hidden="true">${hamIcon(2)}</span><b id="cSize" class="csize out">1</b><span class="cgem"><i class="gemi" aria-hidden="true"></i><b id="cGems" class="out">0</b></span><p id="cBest" class="cbest out"></p><div class="daily in"><i class="dicon" aria-hidden="true"></i><span class="dtx"><b class="dt out"></b><span class="dg out"></span><i class="dbar"><b></b></i></span><b class="dn out"></b></div>
    <button id="cAgain" class="cbtn out"></button><div class="crow"><button id="cHam" class="cbtn alt2 out"><span></span><i class="dot" hidden></i></button><button id="cShare" class="cbtn alt out"></button></div></div></div>
  <div id="coll" class="coll" hidden><div class="cpanel"><div class="chead"><p id="collT" class="ctitle out"></p><button id="collX" class="xbtn out" aria-label="close">\u2715</button></div>
    <div class="cgem total"><i class="gemi" aria-hidden="true"></i><b id="collG" class="out">0</b></div><div id="grid" class="grid"></div></div></div>
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
