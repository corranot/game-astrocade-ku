// PROTOTYPE - NOT FOR PRODUCTION
// Genre: first-person voxel destruction / demolition action for kids (ages 5-12), 3D, portrait, phone and computer.
// Block Smash Crew: Voxel Demolition. A demolition kid in a hard hat smashes cheerful block buildings (cottage, candy
// shop, castle, lighthouse, toy factory, ice palace, jungle temple, space base) to find 3 stars in each: one in the
// treasure chest inside a steel vault, one high up, one deep inside. First person with the hammer in hand; the device
// is found by itself: phone = stick + drag to look + HIT button, computer = WASD + mouse + click/Space. Only the stick
// or the keys walk; a tap smashes a block in reach. Anything left without support falls and shatters.
// Tools: hammer, bomb, rocket, wrecking ball, black hole, meteor. All stars found = SMASH TIME (every tool, no wait,
// double coins). Stars for wrecking 50% and 80%; coins unlock tools. No timer, no losing. 7 languages.
// Modules: voxels.js (grid, mesher, collapse), levels.js (buildings), world.js (play rules), logic.js (numbers),
// scene.js (3D look; Three.js r187 loaded by index.html).
/* global THREE */ // set on window by index.html before run() starts the game
import * as L from './logic.js';
import * as WD from './world.js';
import { createScene } from './scene.js';
import * as UI from './ui.js';

const LANGS = ['en', 'ar', 'es', 'vi', 'hi', 'bn', 'id'];
const STAR_SVG = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff7b0"/><stop offset=".5" stop-color="#ffd21f"/><stop offset="1" stop-color="#ff9f00"/></linearGradient></defs><path d="M50 6 61 37 94 37 67 57 77 90 50 70 23 90 33 57 6 37 39 37Z" fill="url(#g)" stroke="#7a4a00" stroke-width="7" stroke-linejoin="round"/><ellipse cx="40" cy="34" rx="7" ry="4" fill="#fff" opacity=".7" transform="rotate(-35 40 34)"/></svg>');
const TROPHY_SVG = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><linearGradient id="t" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff3a0"/><stop offset=".55" stop-color="#ffc21f"/><stop offset="1" stop-color="#e08a00"/></linearGradient></defs><g stroke="#7a4a00" stroke-width="6" stroke-linejoin="round" fill="url(#t)"><path d="M26 12h48v22c0 16-10 28-24 28S26 50 26 34z"/><path d="M26 18H12c0 16 8 24 18 24M74 18h14c0 16-8 24-18 24" fill="none"/><path d="M44 60h12v14H44z"/><path d="M30 76h40v12H30z"/></g><ellipse cx="40" cy="26" rx="5" ry="9" fill="#fff" opacity=".6"/></svg>');
const buzz = (kind) => { try { lib.haptics.play(kind); } catch (e) { /* no vibration here */ } };

// ---------------------------------------------------------------- sound: all made in code, no files to load
const Sound = (() => {
  let ctx = null, master = null, music = null, muted = false, noise = null, seq = 0, step = 0, nextT = 0, tempo = 118, lastCoin = 0;
  // det: the pitch of the code-made sound being started (1 = as written); lastRate: the last hammer hit's pitch
  let det = 1, lastRate = 1, comp = null;
  const buf = {}; let loading = false, song = null; // recorded sounds (from the asset map), the music loop playing
  const ensure = (cfg) => {
    if (ctx) return ctx;
    // the music gain starts at 0 for a muted save (setMuted may have run before the context existed)
    try { ctx = new (window.AudioContext || window.webkitAudioContext)(); master = ctx.createGain(); master.gain.value = 0.75; limit(cfg); music = ctx.createGain(); music.gain.value = muted ? 0 : 0.13; music.connect(master); } catch (e) { ctx = null; }
    if (ctx) { noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate); const d = noise.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
    return ctx;
  };
  /** The master bus ends in a limiter (feel.mix.limiter): stacked layers and chains of blasts cannot clip. */
  function limit(cfg) {
    const M = cfg && cfg.feel && cfg.feel.mix && cfg.feel.mix.limiter;
    if (!M || !ctx.createDynamicsCompressor) { master.connect(ctx.destination); return; }
    comp = ctx.createDynamicsCompressor();
    comp.threshold.value = M.threshold; comp.knee.value = M.knee; comp.ratio.value = M.ratio; comp.attack.value = M.attack; comp.release.value = M.release;
    master.connect(comp); comp.connect(ctx.destination);
  }
  function tone(type, f0, f1, dur, vol, at = 0, dest = master) {
    const t = ctx.currentTime + at, o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f0 * det, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1 * det), t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(dest); o.start(t); o.stop(t + dur + 0.02);
  }
  function hiss(f0, f1, dur, vol, type = 'bandpass', at = 0, q = 1.2) {
    const t = ctx.currentTime + at, s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noise; f.type = type; f.frequency.setValueAtTime(f0 * det, t); f.frequency.exponentialRampToValueAtTime(f1 * det, t + dur); f.Q.value = q;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f).connect(g).connect(master); s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.02);
  }
  const fx = {
    // a toy robot knocked flying: a springy boing over a tin clank; back on its feet: a happy rising beep
    boing() { tone('sine', 180, 720, 0.28, 0.45); tone('triangle', 900, 300, 0.12, 0.18); hiss(2500, 900, 0.08, 0.16); },
    reboot() { [660, 880, 1320].forEach((f, i) => tone('square', f, f, 0.07, 0.07, i * 0.07)); },
    swing(k = 1) { hiss(500, 2200, 0.14, 0.12 * k); },
    wood(k) { hiss(900, 300, 0.16, 0.45 * k); tone('sine', 190, 80, 0.12, 0.5 * k); },
    brick(k) { hiss(1300, 200, 0.22, 0.5 * k, 'lowpass'); tone('sine', 120, 50, 0.16, 0.55 * k); },
    glass(k) { hiss(5000, 3000, 0.25, 0.25 * k, 'highpass'); for (let i = 0; i < 4; i++) tone('sine', 1800 + Math.random() * 1800, 1500, 0.18, 0.12 * k, i * 0.035); },
    metal() { [523, 784, 1175].forEach((f, i) => tone('triangle', f, f * 0.99, 0.5, 0.18 / (i + 1))); hiss(3000, 1500, 0.08, 0.2); },
    soft(k) { tone('sine', 300, 650, 0.1, 0.4 * k); hiss(1200, 500, 0.1, 0.25 * k); },
    coinS() { tone('triangle', 1319, 1319, 0.06, 0.12); tone('triangle', 1760, 1760, 0.12, 0.12, 0.05); },
    gem() { [1047, 1319, 1568, 2093].forEach((f, i) => tone('sine', f, f, 0.14, 0.2, i * 0.05)); },
    boom(k) { hiss(1600, 60, 0.6 + k * 0.5, 0.75, 'lowpass', 0, 0.8); tone('sine', 90, 30, 0.5 + k * 0.4, 0.8); tone('square', 60, 30, 0.2, 0.15); },
    crash(k) { hiss(900, 70, 0.5 + k * 0.6, 0.6 * Math.min(1, 0.5 + k), 'lowpass', 0, 0.7); tone('sine', 70, 35, 0.4, 0.6); for (let i = 0; i < 4; i++) hiss(1500, 400, 0.12, 0.25, 'bandpass', 0.05 + i * 0.07); },
    star() { [784, 988, 1175, 1568].forEach((f, i) => tone('triangle', f, f, 0.18, 0.28, i * 0.07)); },
    treasure() { [523, 659, 784, 1047, 1319].forEach((f, i) => tone('triangle', f, f, 0.22, 0.3, i * 0.08)); hiss(6000, 3000, 0.6, 0.12, 'highpass', 0.1); },
    fever() { for (let i = 0; i < 8; i++) tone('square', 400 + i * 120, 500 + i * 140, 0.08, 0.12, i * 0.05); },
    clear() { [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => tone('triangle', f, f, 0.22, 0.3, i * 0.1)); },
    fanfare() { [784, 988, 1175, 1568, 1319, 1568].forEach((f, i) => tone('square', f, f, 0.16, 0.09, i * 0.08)); [392, 523].forEach((f, i) => tone('triangle', f, f, 0.6, 0.25, i * 0.16)); hiss(7000, 4000, 0.7, 0.1, 'highpass', 0.2); },
    horn() { [392, 392, 523].forEach((f, i) => tone('sawtooth', f, f * 1.01, 0.18, 0.07, i * 0.2)); },
    blip(f = 660) { tone('square', f, f, 0.06, 0.1); },
    unlock() { [659, 784, 988, 1319, 1568].forEach((f, i) => tone('sine', f, f * 1.01, 0.16, 0.3, i * 0.06)); },
    no() { tone('square', 220, 160, 0.14, 0.12); },
    throwS() { hiss(700, 1800, 0.18, 0.18); },
    rocket() { hiss(400, 3000, 0.5, 0.3); },
    roll() { tone('sine', 55, 45, 0.25, 0.3); hiss(400, 200, 0.2, 0.2, 'lowpass'); },
    hole() { tone('sine', 120, 40, 1.6, 0.4); tone('sine', 600, 90, 1.4, 0.12); },
    meteor() { tone('sine', 2200, 300, 0.85, 0.15); },
    step() { hiss(600, 300, 0.05, 0.06); },
    timber() { tone('sawtooth', 140, 90, 0.5, 0.08); hiss(900, 200, 1.1, 0.25, 'lowpass', 0.4); },
    fuse() { hiss(4000, 2500, 0.5, 0.12, 'highpass'); },
  };
  // a bouncy loop: bass on the beat, a marimba-ish melody
  const BASS = [45, 45, 52, 52, 50, 50, 47, 52], MEL = [69, 0, 72, 76, 0, 72, 69, 0, 71, 0, 74, 79, 0, 76, 74, 0];
  const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);
  function tick() {
    if (!ctx || muted || ctx.state !== 'running' || song) return; // the recorded music plays instead
    const spb = 60 / tempo / 2;
    if (nextT < ctx.currentTime) nextT = ctx.currentTime + 0.05;
    while (nextT < ctx.currentTime + 0.3) {
      const at = nextT - ctx.currentTime, s = step % 16;
      if (s % 2 === 0) tone('triangle', midi(BASS[(step >> 2) % 8] - 12), midi(BASS[(step >> 2) % 8] - 12), spb * 1.6, 0.5, at, music);
      if (MEL[s]) tone('sine', midi(MEL[s]), midi(MEL[s]), spb * 1.2, 0.3, at, music);
      if (s % 4 === 0) tone('sine', 120, 45, 0.12, 0.6, at, music);
      if (s % 4 === 2) { const t = ctx.currentTime + at, src = ctx.createBufferSource(), g = ctx.createGain(), f = ctx.createBiquadFilter(); src.buffer = noise; f.type = 'highpass'; f.frequency.value = 6000; g.gain.setValueAtTime(0.2, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05); src.connect(f).connect(g).connect(music); src.start(t); src.stop(t + 0.06); }
      nextT += spb; step++;
    }
  }
  /** Loads the recorded sounds named in cfg.sounds; until one arrives (or if it never does) its sound is made in code. */
  function load(cfg) {
    if (loading || !ctx || !cfg.sounds) return; loading = true;
    for (const [name, sd] of Object.entries(cfg.sounds)) {
      let a = null; try { a = lib.getAsset(sd.id); } catch (e) { /* no asset map */ }
      if (!a || !a.url) continue;
      fetch(a.url).then((r) => r.arrayBuffer()).then((b) => new Promise((res, rej) => ctx.decodeAudioData(b, res, rej))).then((b) => { buf[name] = { b, ...sd }; if (name === 'music') startSong(); }).catch(() => { /* keep the code-made sound */ });
    }
  }
  function playBuf(id, vol, rate) {
    const sd = buf[id], src = ctx.createBufferSource(), g = ctx.createGain();
    src.buffer = sd.b; src.playbackRate.value = rate || 0.94 + Math.random() * 0.12; g.gain.value = sd.gain * Math.min(1.2, vol);
    src.connect(g).connect(master);
    const end = sd.end ? sd.end - sd.skip : undefined;
    // end is buffer time: at playback rate r the source stops after end / r seconds, so the fade-out is timed by that
    if (end) { const t = ctx.currentTime, r = src.playbackRate.value; g.gain.setValueAtTime(sd.gain * Math.min(1.2, vol), t + end * 0.8 / r); g.gain.linearRampToValueAtTime(0.0001, t + end / r); }
    src.start(0, sd.skip || 0, end);
  }
  /**
   * The hammer landing, in three layers: a sharp click, the body of the material hit (its recorded sound, or the
   * code-made one), and a low thump that grows with the n blocks broken. Each hit gets its own pitch within
   * ±H.pitch, never the last hit's. H = cfg.feel.hammer.sound; clang = it bounced off steel.
   */
  function hammer(H, body, n, clang) {
    let rate = 1 + (Math.random() * 2 - 1) * H.pitch;
    if (Math.abs(rate - lastRate) < H.pitch * 0.3) rate += (rate >= lastRate ? 1 : -1) * H.pitch * 0.45;
    lastRate = rate;
    const C = H.click, T = H.thump, k = clang ? H.clang.body : H.body;
    // the pitch is put back even when a layer throws (it would detune every code-made sound after it)
    det = rate;
    try {
      // 1. the click: a few milliseconds of bright noise and a tick
      hiss(C.f * 1.6, C.f, C.dur, C.gain, 'highpass'); tone('square', C.f * 0.5, C.f * 0.22, C.dur, C.gain * 0.5);
      // 2. the body
      if (buf[body]) playBuf(body, k, rate); else fx[body](k);
      // 3. the thump: low, longer and louder the more blocks broke
      const g = clang ? H.clang.thump : Math.min(T.max, T.gain + T.per * n), d = Math.min(T.durMax, T.dur + T.durPer * n);
      tone('sine', T.f0, T.f1, d, g); if (n > 6) hiss(260, 70, d, g * 0.5, 'lowpass');
    } finally { det = 1; }
  }
  /**
   * A sound made of layers from config (S = {pitch, layers}): each layer is a tone, a filtered noise, or a sound id
   * (recorded if it has arrived, else code-made). k (0..1, a blast's size) scales the layers marked k. The whole
   * sound gets its own pitch within ±S.pitch, never the last one's.
   */
  function layers(S, k) {
    let rate = 1 + (Math.random() * 2 - 1) * S.pitch;
    if (Math.abs(rate - lastRate) < S.pitch * 0.3) rate += (rate >= lastRate ? 1 : -1) * S.pitch * 0.45;
    lastRate = rate; det = rate;
    try {
      for (const l of S.layers) {
        const g = l.g * (l.k ? k : 1), d = l.d ? l.d * (l.k ? 0.6 + 0.8 * k : 1) : 0;
        if (l.t === 'tone') tone(l.w || 'sine', l.f0, l.f1, d, Math.max(0.0002, g), l.at || 0);
        else if (l.t === 'hiss') hiss(l.f0, l.f1, d, Math.max(0.0002, g), l.ft || 'bandpass', l.at || 0, l.q || 1.2);
        else if (buf[l.id]) playBuf(l.id, g, rate);
        else if (fx[l.id]) fx[l.id](g);
      }
    } finally { det = 1; }
  }
  function startSong() {
    if (!buf.music || song || !ctx) return;
    song = ctx.createBufferSource(); song.buffer = buf.music.b; song.loop = true; song.playbackRate.value = tempo / 118;
    const g = ctx.createGain(); g.gain.value = buf.music.gain * 0.5; song.connect(g).connect(music); song.start();
  }
  return {
    unlock(cfg) { ensure(cfg); if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {}); if (ctx && !seq) seq = setInterval(tick, 100); if (cfg) load(cfg); if (buf.music && !song) startSong(); }, // after run() again the recorded music comes back
    play(id, a = 1) { if (!ctx || muted || ctx.state !== 'running') return; if (id === 'coinS') { const n = ctx.currentTime; if (n - lastCoin < 0.05) return; lastCoin = n; } if (buf[id]) playBuf(id, a); else fx[id](a); },
    /** The hammer's hit sound (see hammer above); silent like play() while muted or before the first touch. */
    hammer(H, body, n = 0, clang = false) { if (!ctx || muted || ctx.state !== 'running') return; hammer(H, body, n, clang); },
    get lastRate() { return lastRate; },
    /** A layered sound from config (see layers above); silent like play() while muted or before the first touch. */
    layers(S, k = 1) { if (!ctx || muted || ctx.state !== 'running' || !S) return; layers(S, k); },
    /** The limiter on the master bus: its settings and how many dB it is taking off right now (null without one). */
    get limiter() { return comp ? { threshold: comp.threshold.value, knee: comp.knee.value, ratio: comp.ratio.value, attack: comp.attack.value, release: comp.release.value, reduction: comp.reduction } : null; },
    setTempo(t) { tempo = t; if (song) song.playbackRate.value = t / 118; },
    get recorded() { return Object.keys(buf).length; },
    get musicLevel() { return music ? music.gain.value : null; }, get songOn() { return !!song; },
    get muted() { return muted; },
    setMuted(v) { muted = !!v; if (music && ctx) music.gain.setTargetAtTime(muted ? 0 : 0.13, ctx.currentTime, 0.05); },
    suspend(v) { if (!ctx) return; if (v) ctx.suspend().catch(() => {}); else ctx.resume().catch(() => {}); },
    stop() { clearInterval(seq); seq = 0; if (song) { try { song.stop(); } catch (e) { /* stopped */ } song = null; } },
    get running() { return !!ctx && ctx.state === 'running'; },
  };
})();

let app = null, pendingMode = null;
function showRetry() {
  const root = document.getElementById('app') || document.body;
  if (window.__load) window.__load.done();
  root.innerHTML = '<button style="position:absolute;inset:0;margin:auto;width:40%;aspect-ratio:1;border-radius:50%;border:6px solid #fff;background:#ff6a2a;color:#fff;font-size:12vmin;cursor:pointer" aria-label="Retry">↻</button>';
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
  window.__game = app.debug;
}

function startGame(mode) {
  const cfg = window.gameConfig || {};
  const root = document.getElementById('app') || document.body;
  root.innerHTML = HTML;
  const $ = (id) => root.querySelector('#' + id);
  const qs = new URLSearchParams(location.search);
  const speed = Number(qs.get('speed')) || 1;
  let alive = true, raf = 0, last = performance.now();

  // ---- language
  let lang = L.detectLang(typeof navigator !== 'undefined' ? navigator.languages || [navigator.language] : [], LANGS);
  const T = (k, v) => String((cfg.strings[lang] || {})[k] || cfg.strings.en[k] || k).replace('{n}', v);
  const setDir = () => { root.dir = lang === 'ar' ? 'rtl' : 'ltr'; root.lang = lang; const np = root.querySelector('#nextpill'); if (np && !np.firstChild) np.innerHTML = UI.icon('play', 'flip') + UI.icon('play', 'flip'); };
  setDir();

  // ---- save: one slot; nothing is written until the player's own save has been read
  const LESSONS = ['bomb', 'drag', 'shop', 'walk', 'hit'];
  const save = { v: 1, coins: 0, total: 0, level: 0, best: {}, owned: ['hammer', 'bomb'], lv: {}, learned: { bomb: false, drag: false, shop: false, walk: false, hit: false }, muted: false, lang: null, blocks: 0, levels: 0, day: 0, dailyDone: 0, bestBlast: 0 };
  let saveLoaded = false, persistT = 0, dirtySave = false;
  const persist = () => { if (mode === 'play' && saveLoaded) { dirtySave = false; Promise.resolve().then(() => lib.saveUserGameState(JSON.parse(JSON.stringify(save)))).catch(() => {}); } };
  const persistSoon = () => { dirtySave = true; };

  // ---- scene and world
  const cv = $('cv'), scene = createScene(cv, cfg);
  const signLang = () => scene.setSignLang(lang, (cfg.signs || {})[lang] || (cfg.signs || {}).en || []);
  signLang();
  let W = null, demo = true, touched = false, sel = 'hammer', resultsOpen = false, paidStars = null, lastLevelShown = -1, demoT = 0, tipKey = null, hardHint = null, dailyChecked = false;
  function newLevel(n, opts = {}) {
    celGen++; celAt = 0;
    W = WD.createWorld(cfg, n, { demo: !!opts.demo, owned: save.owned, lv: save.lv, daily: !!opts.daily, coinMult: opts.daily ? cfg.daily.mult : 1 });
    demo = !!opts.demo;
    // the attract mode: a beat to see the robot strolling, then the first rocket goes to it
    if (demo) { demoT = 0.7; demoN = 0; }
    scene.setLevel(W);
    sel = 'hammer'; resultsOpen = false; paidStars = null; hardHint = null; ptr = null; stick = null; idleT = 0; hitHeld = false; firstTap = false; if ($('stick')) { $('stick').hidden = true; $('stickHome').hidden = false; } // a finger from the last level does not steer this one
    toolEls.bomb.classList.remove('hint');
    $('panel').hidden = true; $('shop').hidden = true; $('settings').hidden = true; $('nextpill').hidden = true; $('fever').hidden = true; $('ftime').hidden = true;
    Sound.setTempo(118);
    renderTools(); renderTop();
    if (!demo && lastLevelShown !== n && W.boss) setTimeout(() => { if (alive && W && W.n === n) Sound.play('fever'); }, 500);
    if (!demo && (lastLevelShown !== n || W.daily)) { lastLevelShown = n; levelCard(n); }
    coachK = '-'; showCoach(null); walkD = 0; aimT = 0; lostT = 0; starsFlown = 0; lastHX = W.hero.x; lastHZ = W.hero.z;
    setTip(demo ? 'tap' : 'find');
  }

  // ---- HUD
  const toolEls = {};
  $('tools').innerHTML = cfg.tools.map((t) => `<button class="tool gloss" data-t="${t.id}" aria-label="${t.id}"><span class="ic">${UI.icon(t.id)}</span><i class="cd"></i><span class="free" hidden></span><span class="lock" hidden><i class="coin"></i><b></b></span></button>`).join('');
  for (const b of $('tools').querySelectorAll('.tool')) toolEls[b.dataset.t] = b;
  // the HIT button's verb follows the tool (BONK, BOOM, FIRE, SWING, PULL, CRASH); its ready pulse is tuned in the config
  const VERB = { hammer: 'vHammer', bomb: 'vBomb', rocket: 'vRocket', ball: 'vBall', hole: 'vHole', meteor: 'vMeteor' };
  { const hp = cfg.hitPulse; root.style.setProperty('--wave-dur', cfg.waves.banner + 's'); root.style.setProperty('--hp-cycle', hp.cycle + 's'); root.style.setProperty('--hp-glow', String(hp.glow)); root.style.setProperty('--hp-bright', String(hp.bright)); root.style.setProperty('--hp-dim', String(hp.dim)); }
  let hitLabel = '';
  function labelHit() { const el = $('hit').querySelector('.hl'), t = T(VERB[sel] || 'vHammer'); if (hitLabel === t + lang) return; hitLabel = t + lang; el.textContent = t; fitText(el, 132, 28); }
  $('stars').innerHTML = '<img class="st" alt=""><img class="st" alt=""><img class="st" alt="">';
  $('stars').querySelectorAll('img').forEach((i) => { i.src = STAR_SVG; });
  $('bar').innerHTML = `<b></b><i style="left:${cfg.stars.wreck1 * 100}%"></i><i style="left:${cfg.stars.wreck2 * 100}%"></i><span class="pct"></span>`;
  $('bar').querySelectorAll('i').forEach((i) => { const im = document.createElement('img'); im.src = TROPHY_SVG; im.style.width = '100%'; i.appendChild(im); });
  const shown = { coins: -1, got: -1, wreck: -1, tools: '' };
  /** A panel that pauses the world is open (the shop and album, the settings). */
  const modalOpen = () => !$('shop').hidden || !$('settings').hidden;
  const usable = (id) => save.owned.includes(id) || (W && (W.fever > 0 || !W.tried.has(id)));
  function renderTools() {
    for (const t of cfg.tools) {
      const el = toolEls[t.id], owned = save.owned.includes(t.id), fever = W && W.fever > 0;
      el.classList.toggle('sel', sel === t.id);
      el.classList.toggle('locked', !owned && !fever);
      const lock = el.querySelector('.lock'); lock.hidden = owned || fever; lock.querySelector('b').textContent = fmt(t.cost);
      const free = el.querySelector('.free'); free.hidden = owned || fever || !W || W.tried.has(t.id); if (free.textContent !== T('tryFree')) free.textContent = T('tryFree');
      // fitted once per language, when it shows (a badge hidden during a language change keeps no stale size)
      if (!free.hidden && free.dataset.l !== lang) { free.dataset.l = lang; fitText(free, 100, 18); }
      el.classList.toggle('can', !owned && save.coins >= t.cost);
    }
    labelHit();
  }
  function renderTop() {
    const coins = save.coins;
    // something to buy: a red "!" on the coins (always), and the pulse until the shop has been opened once
    if (coins !== shown.coins || shown.dot === undefined) { const can = saveLoaded && L.canBuy(cfg, save.owned, save.lv, coins); $('coins').classList.toggle('can', can && !save.learned.shop); $('dot').hidden = !can; shown.dot = can; }
    if (coins !== shown.coins) { const el = $('coins'); el.querySelector('b').textContent = fmt(coins); if (shown.coins >= 0 && coins > shown.coins) { el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); } shown.coins = coins; renderTools(); }
    const got = W ? Math.min(3, W.got) : 0;
    if (got !== shown.got) { $('stars').querySelectorAll('img').forEach((im, i) => im.classList.toggle('on', i < got)); shown.got = got; }
    const wr = W ? Math.round(WD.wreck(W) * 100) : 0;
    if (wr !== shown.wreck) { const bar = $('bar'); bar.querySelector('b').style.width = wr + '%'; bar.querySelector('.pct').textContent = wr + '%'; const is = bar.querySelectorAll('i'); is[0].classList.toggle('on', wr >= cfg.stars.wreck1 * 100); is[1].classList.toggle('on', wr >= cfg.stars.wreck2 * 100); if (shown.wreck >= 0 && W && !demo) { if (shown.wreck < cfg.stars.wreck1 * 100 && wr >= cfg.stars.wreck1 * 100) starPop(); if (shown.wreck < cfg.stars.wreck2 * 100 && wr >= cfg.stars.wreck2 * 100) { starPop(); celebrate(T('flat'), 'flat'); } } shown.wreck = wr; }
  }
  const fmt = (n) => (n >= 1e6 ? (Math.floor(n / 1e5) / 10).toFixed(n >= 1e7 ? 0 : 1).replace(/\.0$/, '') + 'M' : n >= 10000 ? (Math.floor(n / 100) / 10).toFixed(n >= 100000 ? 0 : 1).replace(/\.0$/, '') + 'k' : String(n));
  /** A whole number with thousands commas (1,234), for the brag line. */
  const commas = (n) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  function starPop() { const p = document.createElement('img'); p.src = TROPHY_SVG; p.className = 'pop trophy'; p.style.left = 'calc(var(--u)*360px)'; p.style.top = 'calc(var(--u)*600px)'; $('pops').appendChild(p); setTimeout(() => p.remove(), 950); Sound.play('star'); buzz('success'); }
  /** A word at frame point (x, y). */
  function pop(text, x, y, cls = '', color) {
    const p = document.createElement('div'); p.className = `pop out ${cls}`; p.textContent = text;
    p.style.left = `calc(var(--u)*${Math.max(110, Math.min(610, x))}px)`; p.style.top = `calc(var(--u)*${Math.max(150, Math.min(920, y))}px)`;
    if (color) p.style.color = color;
    $('pops').appendChild(p); setTimeout(() => p.remove(), 950);
    const base = cls.includes('p-big') ? 88 : cls.includes('p-mid') ? 62 : cls.includes('p-coin') ? 38 : 44; fitText(p, 690, base, cls.includes('p-big') ? 2 : 1);
    const w = p.offsetWidth / (root.getBoundingClientRect().width / 720 || 1); // keep long words inside the frame
    if (w) p.style.left = `calc(var(--u)*${Math.max(w / 2 + 12, Math.min(708 - w / 2, x))}px)`;
  }
  /** One of the game's own icons, big, at frame point (x, y). */
  function popIcon(name, x, y) { const p = document.createElement('div'); p.className = 'pop p-ico'; p.innerHTML = UI.icon(name); p.style.left = `calc(var(--u)*${x}px)`; p.style.top = `calc(var(--u)*${y}px)`; $('pops').appendChild(p); setTimeout(() => p.remove(), 950); }
  const banner = (text, cls = 'p-big', dy = 0) => pop(text, 360, 560 + dy, cls);
  /**
   * Fits a text to its room, the box following its text: one line when it fits in maxW frame units; else (lines > 1)
   * balanced lines inside maxW; only then a smaller font, never below 70% of base (long translations).
   */
  function fitText(el, maxW, base, lines = 1) {
    const k = root.getBoundingClientRect().width / 720 || 1;
    el.style.fontSize = ''; el.style.whiteSpace = 'nowrap'; el.style.maxWidth = ''; el.classList.remove('wrap');
    if (el.style.width === 'max-content') el.style.width = '';
    if (el.offsetWidth / k <= maxW + 0.5 && el.scrollWidth <= el.clientWidth + 1) return;
    // a box centred with left:50% only gets half the frame when it wraps: max-content up to maxW gives it the full room
    if (lines > 1) { el.style.whiteSpace = 'normal'; el.style.maxWidth = `calc(var(--u)*${maxW}px)`; if (!el.style.width) el.style.width = 'max-content'; el.classList.add('wrap'); }
    // lines counted from the text's own height (a button's min-height would read as extra lines)
    const rows = () => { const mh = el.style.minHeight; el.style.minHeight = '0'; const cs = getComputedStyle(el), lh = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.2, n = Math.round((el.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom)) / lh); el.style.minHeight = mh; return n; };
    const over = () => el.scrollWidth > el.clientWidth + 1 || el.offsetWidth / k > maxW + 0.5 || (lines > 1 && rows() > lines);
    for (let f = base; over() && f > base * 0.7; ) { f = Math.max(base * 0.7, f * 0.94); el.style.fontSize = `calc(var(--u)*${f.toFixed(1)}px)`; }
  }
  /** One row of buttons or tabs that must fit side by side: all shrink together (same size), at most to 70%. */
  function fitRow(row, items, base) {
    for (const b of items) b.style.fontSize = '';
    for (let f = base; row.scrollWidth > row.clientWidth + 1 && f > base * 0.7; ) { f = Math.max(base * 0.7, f * 0.94); for (const b of items) b.style.fontSize = `calc(var(--u)*${f.toFixed(1)}px)`; }
  }
  let coinPopT = 0;
  const coinPop = (n, x, y, z) => {
    if (!n || coinPopT > 0) return; coinPopT = 0.12; const [sx, sy, behind] = scene.screenOf(x, y, z); if (behind) return;
    pop('+' + fmt(n), sx, sy - 40, 'p-coin');
    // a coin flies into the coins pill (one every quarter second at most)
    if (coinFlyT <= 0) { coinFlyT = 0.25; fly('<i class="coin"></i>', sx, sy - 40, $('coins')); }
  };
  let coinFlyT = 0;
  function setTip(k) {
    tipKey = k; const tip = $('tip'), hand = $('hand');
    tip.hidden = !k; if (k) { tip.textContent = T(k); fitText(tip, 600, 50, 2); } // room for its pulse
    if (coachK && coachK !== '-') tip.hidden = true;
    hand.hidden = !(k === 'tap' || k === 'tooHard');
  }

  // ---- input, picked by device: phone/tablet = stick (lower left) + look by dragging + HIT button;
  // desktop = WASD + mouse look (pointer lock when allowed) + click. On both, only the stick or the keys walk: a tap
  // smashes a block in reach (a far one nudges the stick) or throws a tool there, and holding keeps smashing.
  const toFrame = (e) => { const r = root.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * 720, (e.clientY - r.top) / r.height * 1280]; };
  let touchUI = false; try { touchUI = typeof lib !== 'undefined' && typeof lib.shouldUseTouchControls === 'function' ? !!lib.shouldUseTouchControls() : matchMedia('(pointer: coarse)').matches; } catch (e) { touchUI = false; }
  root.classList.toggle('touch', touchUI); root.classList.toggle('desk', !touchUI);
  let idleT = 0; // seconds since the last smash in a level still hunting stars (the hand then points at a star)
  let ptr = null; // the look/tap finger {id, x, y, sx, sy, cx, cy, drag, t, hold}
  let stick = null; // the walking thumb {id, bx, by, dx, dy}
  let hitHeld = false, locked = false, usedKeys = false, lockRefused = false;
  let firstTap = false; // the touch that ended the demo: its tap is the first boom
  const keys = new Set();
  const STICK_R = 80;
  // the stick zone ends just above the tool bar (the tools sit at the bottom edge)
  const STICK_Y1 = 1126;
  function firstTouch() {
    if (!demo) return;
    // the demo becomes the real game on the level the player is at
    touched = true;
    newLevel(saveLoaded ? save.level : W.n);
    firstTap = true;
    scene.follow = false;
  }
  function onDown(e) {
    if (mode !== 'play' || !W) return;
    if (e.target.closest && e.target.closest('button, #settings, #panel, #shop, .pill')) return; // the coins pill opens the shop, it is not a tap on the world
    Sound.unlock(cfg); $('settings').hidden = true;
    const [x, y] = toFrame(e);
    if (demo) firstTouch();
    if (touchUI && e.pointerType !== 'mouse' && !stick && x < 360 && y > 600 && y < STICK_Y1) { // the walking thumb
      // shown once it moves: a still touch here is a tap
      stick = { id: e.pointerId, bx: x, by: y, dx: 0, dy: 0, t: performance.now(), moved: false, cx: e.clientX, cy: e.clientY };
      if (tipKey === 'find' || tipKey === 'tap') setTip(null);
      e.preventDefault(); return;
    }
    // mouse look once the player walks with the keys; before that a click is a tap
    if (!touchUI && usedKeys && e.pointerType === 'mouse' && !locked && cv.requestPointerLock) {
      // this click only asks for the lock: it makes no finger (its pointerup may come after the lock)
      let asked = false; try { const r = cv.requestPointerLock(); asked = true; if (r && r.catch) r.catch(() => { lockRefused = true; }); } catch (er) { lockRefused = true; }
      if (asked && !lockRefused) { e.preventDefault(); return; }
    }
    if (locked) { onHitDown(); e.preventDefault(); return; }
    if (ptr && ptr.id !== e.pointerId) return; // a third finger is ignored
    ptr = { id: e.pointerId, x, y, sx: x, sy: y, cx: e.clientX, cy: e.clientY, drag: false, t: performance.now() };
    if (sel === 'hammer' && (tipKey === 'find' || tipKey === 'tap')) setTip(null);
    // the hammer waits: a quick tap aims on release, a still hold after 120 ms; a drag only looks (it never swings)
    e.preventDefault();
  }
  function onMove(e) {
    if (locked && e.pointerType === 'mouse') { scene.look(-(e.movementX || 0) * cfg.camera.lookMouse, -(e.movementY || 0) * cfg.camera.lookMouse); if (!save.learned.drag && Math.abs(e.movementX || 0) > 2) { save.learned.drag = true; persistSoon(); } return; }
    if (stick && e.pointerId === stick.id) { const [x, y] = toFrame(e); let dx = x - stick.bx, dy = y - stick.by; const d = Math.hypot(dx, dy); if (d > 18 && !stick.moved) { stick.moved = true; firstTap = false; } if (d > STICK_R) { dx *= STICK_R / d; dy *= STICK_R / d; } stick.dx = dx; stick.dy = dy; showStick(); return; }
    if (!ptr || e.pointerId !== ptr.id || !W) return;
    const [x, y] = toFrame(e), dx = x - ptr.x, dy = y - ptr.y;
    ptr.cx = e.clientX; ptr.cy = e.clientY;
    if (!ptr.drag && Math.hypot(x - ptr.sx, y - ptr.sy) > 26) { ptr.drag = true; firstTap = false; WD.aimHammer(W, null); if (!save.learned.drag) { save.learned.drag = true; persistSoon(); } }
    if (ptr.drag) scene.look(-dx * cfg.camera.lookTouch, -dy * cfg.camera.lookTouch);
    ptr.x = x; ptr.y = y;
  }
  function onUp(e) {
    if (stick && e.pointerId === stick.id) {
      const st = stick; stick = null; showStick();
      // a quick still touch in the stick zone is a tap on what is under it (taps are the main control on phones)
      if (!st.moved && performance.now() - st.t < 400 && W && !resultsOpen) tapWorld(st.cx, st.cy);
      firstTap = false; return;
    }
    if (locked && e.pointerType === 'mouse') { hitHeld = false; return; }
    if (!ptr || e.pointerId !== ptr.id) return;
    const p = ptr; ptr = null;
    if (!W) return;
    WD.release(W);
    if (!p.drag && !p.held && !resultsOpen) tapWorld(e.clientX, e.clientY);
    firstTap = false;
  }
  /** A tap on the world: the hammer smashes a block in reach (never walks); a tool is thrown there. */
  function tapWorld(cx, cy) {
    // a tap on (or near) a shining star throws a free star bomb at it: what children tap first
    const r = root.getBoundingClientRect(), fx = (cx - r.left) / r.width * 720, fy = (cy - r.top) / r.height * 1280;
    const mk = scene.starMarks().find((m) => Math.hypot(m.x - fx, m.y - fy) < 80);
    if (mk && WD.starShot(W, mk.cell)) { idleT = 0; return; }
    if (sel !== 'hammer') { useSelected(cx, cy); return; }
    const t = scene.pick(cx, cy);
    // a bot in reach: the hammer swings at it (a far one, like a far block: nothing walks, the stick pulses)
    if (t && t.type === 'bot' && !firstTap) { if (t.dist <= cfg.hero.reach + 0.6) { WD.swingBot(W, t.i); firstTap = false; if (!save.learned.hit) { save.learned.hit = true; persistSoon(); } return; } }
    else if (t && t.type !== 'bot') WD.aimHammer(W, t, false, false);
    if (W.hero.aim && !firstTap && !save.learned.hit) { save.learned.hit = true; persistSoon(); }
    // the very first tap of the game is a boom: the hammer swings at the TNT barrel straight ahead (in reach of the start)
    if (!W.hero.aim && firstTap) { const c = frontTnt(); if (c) WD.aimHammer(W, { type: 'block', ...c, nx: 0, ny: 0, nz: 1 }, false, false); }
    firstTap = false;
    // too far for the hammer: the stick at home pulses (walk there with it)
    if (!W.hero.aim) { const el = $(touchUI ? 'stickHome' : 'keys'); el.classList.remove('nudge'); void el.offsetWidth; el.classList.add('nudge'); }
  }
  /** The TNT cell nearest the hero, when it is still there and in reach of the hammer. */
  function frontTnt() {
    const h = W.hero; let best = null, bd = cfg.hero.reach;
    for (const c of W.tntCells) { if (W.g.get(c.x, c.y, c.z) !== W.ids.tnt) continue; const d = Math.hypot(c.x + 0.5 - h.x, c.y + 0.5 - (h.y + 1.3), c.z + 0.5 - h.z); if (d <= bd) { bd = d; best = c; } }
    return best;
  }
  function showStick() {
    const el = $('stick'); el.hidden = !stick || !stick.moved; $('stickHome').hidden = !el.hidden; if (el.hidden) return;
    el.style.left = `calc(var(--u)*${stick.bx}px)`; el.style.top = `calc(var(--u)*${stick.by}px)`;
    el.querySelector('i').style.transform = `translate(calc(var(--u)*${stick.dx}px),calc(var(--u)*${stick.dy}px))`;
  }
  /** HIT (button, held mouse, space): the hammer swings at the crosshair while held; a tool is thrown there once. */
  function onHitDown() { if (mode !== 'play' || !W || resultsOpen || modalOpen()) return; firstTap = false; if (!demo && !save.learned.hit) { save.learned.hit = true; persistSoon(); } Sound.unlock(cfg); if (demo) firstTouch(); if (sel === 'hammer') hitHeld = true; else useCrosshair(); if (tipKey === 'find' || tipKey === 'tap') setTip(null); }
  function useCrosshair() {
    const t = scene.target || scene.pickCenter(); if (!t) return;
    const id = sel, wasOwned = save.owned.includes(id);
    if (WD.useTool(W, id, t.p)) { if (id === 'bomb' && !save.learned.bomb) { save.learned.bomb = true; persistSoon(); } if (tipKey === 'tooHard') setTip(null); if (W.fever <= 0) sel = 'hammer'; renderTools(); }
    else { Sound.play('no'); const el = toolEls[id]; el.classList.remove('no'); void el.offsetWidth; el.classList.add('no'); }
    void wasOwned;
  }
  function hammerAtCrosshair() {
    const t = scene.target;
    if (t && t.type === 'bot') { if (t.dist <= cfg.hero.reach + 0.6) WD.swingBot(W, t.i); else WD.hitBlock(W, null); return; }
    if (t && t.type === 'block' && W.g.get(t.x, t.y, t.z) === W.ids.star && t.dist > cfg.hero.reach && WD.starShot(W, t)) return; // aiming at a far star: the star bomb
    WD.hitBlock(W, t && t.type === 'block' && t.dist <= cfg.hero.reach ? t : null);
  }
  function useSelected(cx, cy) {
    const t = scene.pick(cx, cy); if (!t) return;
    const id = sel, wasOwned = save.owned.includes(id);
    if (WD.useTool(W, id, t.p)) {
      if (id === 'bomb' && !save.learned.bomb) { save.learned.bomb = true; persistSoon(); }
      if (tipKey === 'tooHard') setTip(null);
      if (!wasOwned && W.fever <= 0) { sel = 'hammer'; }
      else if (W.fever <= 0) sel = 'hammer'; // one throw, then back to the hammer (smash time keeps the tool)
      renderTools();
    } else { Sound.play('no'); const el = toolEls[id]; el.classList.remove('no'); void el.offsetWidth; el.classList.add('no'); }
  }
  function pickTool(id) {
    if (mode !== 'play' || !W || resultsOpen) return; // nothing is bought or picked behind the result card
    Sound.unlock(cfg); if (demo) firstTouch();
    const t = cfg.tools.find((x) => x.id === id), owned = save.owned.includes(id);
    if (!owned && !usable(id) && save.coins >= t.cost && saveLoaded) { // buy it, only once its free try is used (and never in smash time, which lends it)
      save.coins -= t.cost; save.owned.push(id); W.owned.push(id); persist();
      Sound.play('unlock'); buzz('success'); banner(T('newTool'), 'p-mid'); popIcon(t.id, 360, 700);
      root.appendChild(Object.assign(document.createElement('div'), { className: 'flash' })); setTimeout(() => { const f = root.querySelector('.flash'); if (f) f.remove(); }, 460);
      sel = id; renderTools(); renderTop(); return;
    }
    if (!usable(id)) { Sound.play('no'); const el = toolEls[id]; el.classList.remove('no'); void el.offsetWidth; el.classList.add('no'); return; }
    sel = sel === id && id !== 'hammer' ? 'hammer' : id; Sound.play('blip', 760); buzz('tap');
    toolEls[id].classList.remove('hint');
    renderTools();
  }
  $('tools').addEventListener('click', (e) => { const b = e.target.closest('.tool'); if (!b) return; e.stopPropagation(); try { b.blur(); } catch (er) { /* fine */ } pickTool(b.dataset.t); });
  const hitBtn = $('hit');
  hitBtn.addEventListener('pointerdown', (e) => { e.stopPropagation(); e.preventDefault(); hitBtn.classList.add('down'); onHitDown(); });
  const hitUp = () => { hitHeld = false; hitBtn.classList.remove('down'); };
  hitBtn.addEventListener('pointerup', hitUp); hitBtn.addEventListener('pointercancel', hitUp); hitBtn.addEventListener('pointerleave', hitUp);
  const onCancel = (e) => { if (stick && e.pointerId === stick.id) { stick = null; showStick(); } if (!ptr || e.pointerId !== ptr.id) return; ptr = null; if (W) WD.release(W); }; // a cancelled touch never fires a tool
  const onLock = () => { locked = document.pointerLockElement === cv; if (!locked) hitHeld = false; else if (ptr) { ptr = null; if (W) { WD.release(W); WD.aimHammer(W, null); } } };
  root.addEventListener('pointerdown', onDown); window.addEventListener('pointermove', onMove); window.addEventListener('pointerup', onUp); window.addEventListener('pointercancel', onCancel);
  document.addEventListener('pointerlockchange', onLock);
  // a host that refuses the lock: clicks are taps and a drag looks, from now on
  const onLockError = () => { lockRefused = true; };
  document.addEventListener('pointerlockerror', onLockError);
  const noMenu = (e) => e.preventDefault(); root.addEventListener('contextmenu', noMenu);
  const onWheel = (e) => { if (mode !== 'play' || !W || modalOpen()) return; const ids = cfg.tools.map((t) => t.id).filter(usable); const i = ids.indexOf(sel); if (ids.length) pickTool(ids[(i + (e.deltaY > 0 ? 1 : -1) + ids.length) % ids.length]); };
  root.addEventListener('wheel', onWheel, { passive: true });
  const MOVE_KEYS = ['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'shift'];
  const onKey = (e) => {
    // physical keys (e.code): an Arabic or any other layout still walks with the W A S D positions
    const CODE = { KeyW: 'w', KeyA: 'a', KeyS: 's', KeyD: 'd', ArrowUp: 'arrowup', ArrowDown: 'arrowdown', ArrowLeft: 'arrowleft', ArrowRight: 'arrowright', ShiftLeft: 'shift', ShiftRight: 'shift', Space: ' ' };
    const k = CODE[e.code] || (e.key || '').toLowerCase();
    if (e.type === 'keyup') { keys.delete(k); if (k === ' ') hitHeld = false; return; }
    if (mode !== 'play' || !W) return;
    // Escape closes the open shop or settings panel
    if (e.code === 'Escape' && modalOpen()) { for (const id of ['shop', 'settings']) if (!$(id).hidden) hidePanel($(id)); Sound.play('blip'); renderTop(); e.preventDefault(); return; }
    if (MOVE_KEYS.includes(k)) { keys.add(k); usedKeys = true; if (demo) firstTouch(); firstTap = false; Sound.unlock(cfg); e.preventDefault(); return; }
    if (k === ' ') { e.preventDefault(); if (!e.repeat) onHitDown(); return; }
    // nothing is picked or bought behind an open panel
    if (modalOpen()) return;
    const dm = /^Digit([1-6])$/.exec(e.code || ''), i = dm ? Number(dm[1]) - 1 : '123456'.indexOf(e.key); if (i >= 0 && cfg.tools[i]) { pickTool(cfg.tools[i].id); e.preventDefault(); }
  };
  window.addEventListener('keydown', onKey); window.addEventListener('keyup', onKey);
  const onBlur = () => { keys.clear(); hitHeld = false; };
  window.addEventListener('blur', onBlur);

  // ---- world events → sounds, words, coins
  let hitSnd = 0, beepT = 0;
  /** Hit-stop: the world runs at feel.stopScale for a moment sized by the tool (hammer short, ball and meteor long). */
  const hitStop = (kind) => { if (!demo) stopT = Math.max(stopT, cfg.feel.stop[kind] || cfg.feel.stop.bomb); };
  /** A batch of n blocks: the biggest ever (from a minimum size on) is a new record. */
  function recordCheck(n) {
    // a new record beats the old one by a margin (no fanfare for every slightly bigger blast)
    if (demo || !saveLoaded || n < cfg.celebrate.recordMin || n < save.bestBlast * cfg.celebrate.recordMargin) return;
    save.bestBlast = n; persistSoon(); celebrate(T('record', commas(n)), 'record');
  }
  // ---- big moments: fanfare, big words at eye level, confetti, a buzz and the score on the leaderboard
  let celAt = 0, boardAt = -1e9, celGen = 0;
  function celebrate(text, kind) {
    if (demo) return;
    const now = performance.now(), at = Math.max(now, celAt + cfg.celebrate.gap * 1000), gen = celGen;
    // never a long queue: one waiting too long is dropped
    if (at - now > cfg.celebrate.maxWait * 1000) return;
    celAt = at;
    // a celebration still waiting when the level changes or the result card opens is dropped
    const go = () => { if (!alive || gen !== celGen || resultsOpen) return; Sound.play('fanfare'); buzz('success'); banner(text, 'p-big', -40); confetti(); lastCelebration = kind; board(); };
    if (at <= now) go(); else setTimeout(go, at - now);
  }
  let lastCelebration = '';
  /** The blocks smashed so far go to the leaderboard (at most once every boardGap seconds). */
  function board() { const now = performance.now(); if (!saveLoaded || now - boardAt < cfg.celebrate.boardGap * 1000) return; boardAt = now; try { Promise.resolve(lib.addPlayerScoreToLeaderboard(save.blocks)).catch(() => {}); } catch (er) { /* no board here */ } }
  /** A burst of paper confetti from the middle of the view (a fixed pool of pieces, moved with translate). */
  function confetti() {
    const box = $('confetti'), N = cfg.celebrate.confetti, cols = ['#ff5fa8', '#ffd23c', '#4fd1c5', '#7aa8ff', '#9be15d', '#ff9a3c'];
    while (box.children.length < N) box.appendChild(document.createElement('i'));
    [...box.children].forEach((el, i) => {
      const a = (i / N) * Math.PI * 2 + Math.random() * 0.4, d = 180 + Math.random() * 220;
      el.style.setProperty('--dx', String(Math.round(Math.cos(a) * d))); el.style.setProperty('--dy', String(Math.round(Math.sin(a) * d * 0.7 - 120))); el.style.setProperty('--r', Math.round(Math.random() * 720 - 360) + 'deg');
      el.style.background = cols[i % cols.length]; el.classList.remove('go'); void el.offsetWidth; el.classList.add('go');
    });
    box.hidden = false; clearTimeout(confetti.t); confetti.t = setTimeout(() => { box.hidden = true; }, 1700);
  }
  /** WAVE n ARRIVING! for a few seconds at eye level. */
  function waveBanner(n) {
    const el = $('wavebn'); el.textContent = T('wave', n); el.hidden = false; el.classList.remove('go'); void el.offsetWidth; el.classList.add('go'); fitText(el, 640, 64, 2);
    clearTimeout(waveBanner.t); waveBanner.t = setTimeout(() => { el.hidden = true; }, cfg.waves.banner * 1000);
  }
  function onEvent(e) {
    scene.event(e);
    if (e.type === 'smash') {
      idleT = 0;
      const n = e.removed.length, mat = cfg.materials[(e.removed[0] || {}).m - 1] || {};
      if (e.by === 'hammer') { Sound.hammer(cfg.feel.hammer.sound, mat.snd === 'wood' || mat.snd === 'glass' || mat.snd === 'soft' ? mat.snd : 'brick', n); buzz('tap'); }
      else if (e.by === 'hole' || e.by === 'ball') { if ((hitSnd -= 1) <= 0) { hitSnd = 3; Sound.play('brick', 0.5); } }
      if (mat.snd === 'glass' && e.by !== 'hammer') Sound.play('glass', 0.7);
      if (e.gold) Sound.play('gem');
      recordCheck(n);
      if (!demo) {
        save.coins += e.coins; save.total += e.coins; save.blocks += n; persistSoon();
        coinPop(e.coins, e.x, e.y, e.z);
        if (e.word && e.by !== 'hole') { const [sx, sy] = scene.screenOf(e.x, e.y, e.z); pop(T(e.word) + (e.mult > 1 ? ` ×${e.mult}` : ''), sx, sy - 120, e.word === 'mega' ? 'p-big' : 'p-mid', e.word === 'mega' ? '#ff6ad5' : e.word === 'kaboom' ? '#ffb02e' : '#fff'); }
        else if (e.mult >= 3 && e.by === 'hammer') { const [sx, sy] = scene.screenOf(e.x, e.y, e.z); pop(`×${e.mult}`, sx + 60, sy - 90, 'p-mid', '#ffe14a'); }
        if (!dailyChecked && saveLoaded) daily();
      }
    } else if (e.type === 'swing') Sound.play('swing', W.hero.swingCell || W.hero.swingBot ? 1 : cfg.feel.hammer.sound.whiff);
    else if (e.type === 'hit') { if (e.n > 0 && !demo) hitStop('hammer'); }
    else if (e.type === 'topple') { Sound.play('timber'); buzz('warning'); if (!demo) { slowT = Math.max(slowT, cfg.feel.toppleSlow); banner(T('timber'), 'p-big', -80); } }
    else if (e.type === 'fuse') Sound.play('fuse');
    else if (e.type === 'detonate') { buzz('success'); if (!demo && e.n > 0) banner(T('kaboom'), 'p-big', -80); }
    else if (e.type === 'clang') { Sound.hammer(cfg.feel.hammer.sound, 'metal', 0, true); buzz('warning'); }
    else if (e.type === 'super') { Sound.play('boom', 0.5); buzz('success'); const [sx, sy] = scene.screenOf(e.x, e.y, e.z); pop(T('super'), sx, sy - 110, 'p-mid', '#ffd23c'); toolEls.bomb.classList.remove('hint'); if (tipKey === 'tooHard') setTip(null); }
    else if (e.type === 'tooHard') {
      if (demo) return;
      const teach = sel === 'hammer' && usable('bomb') && !save.learned.bomb; // the first times: the tip line + hand say it
      if (!teach) { const [sx, sy] = scene.screenOf(e.x, e.y, e.z); pop(T('tooHard'), sx, sy - 100, 'p-mid', '#ffd0d0'); }
      if (sel === 'hammer' && usable('bomb')) { toolEls.bomb.classList.add('hint'); hardHint = { x: e.x, y: e.y, z: e.z, t: 4 }; if (teach) setTip('tooHard'); }
    } else if (e.type === 'boom') { const ts = cfg.feel[e.kind] && cfg.feel[e.kind].sound; if (ts) Sound.layers(ts.impact, Math.min(1, e.r / 5)); else Sound.play('boom', Math.min(1, e.r / 5)); buzz('thud'); hitStop(e.kind); }
    else if (e.type === 'throw') { const ts = !e.shot.from && cfg.feel[e.shot.kind] && cfg.feel[e.shot.kind].sound; if (ts) Sound.layers(ts.launch); else Sound.play(e.shot.kind === 'rocket' ? 'rocket' : e.shot.kind === 'hole' ? 'hole' : e.shot.kind === 'meteor' ? 'meteor' : 'throwS'); toolEls.bomb.classList.remove('hint'); }
    else if (e.type === 'roll') { if (e.first) Sound.layers(cfg.feel.ball.sound.impact); else Sound.play('roll'); if (e.first) hitStop('ball'); }
    else if (e.type === 'fall') { /* the crash comes when it lands */ }
    else if (e.type === 'land') {
      Sound.play('crash', Math.min(1, e.n / 300)); buzz('thud'); if (!demo && e.n >= 120) slowT = Math.max(slowT, cfg.feel.landSlow);
      recordCheck(e.n);
      if (!demo) { save.coins += e.coins; save.total += e.coins; save.blocks += e.n; persistSoon(); const [sx, sy] = scene.screenOf(e.x, e.y, e.z); if (e.n >= 12) pop(T('crash'), sx, sy - 120, e.n > 120 ? 'p-big' : 'p-mid', '#ffb02e'); coinPop(e.coins, e.x, e.y + 1, e.z); }
    } else if (e.type === 'step') Sound.play('step');
    else if (e.type === 'treasure') { Sound.play('treasure'); buzz('success'); if (!demo) { save.coins += e.coins; save.total += e.coins; persistSoon(); banner(T('treasure'), 'p-big', -40); } }
    else if (e.type === 'bonk') {
      Sound.play('boing', e.again ? 0.6 : 1); buzz(e.again ? 'tap' : 'thud'); if (e.by === 'hammer' && !e.again) hitStop('hammer');
      if (!demo && !e.again) {
        save.coins += e.coins; save.total += e.coins; persistSoon(); idleT = 0;
        const [sx, sy, behind] = scene.screenOf(e.x, e.y, e.z); if (!behind) { pop(T('bonk'), sx, sy - 110, 'p-mid', '#7dfcff'); coinPop(e.coins, e.x, e.y, e.z); }
      }
    }
    else if (e.type === 'reboot') {
      if (demo) return; Sound.play('reboot', 0.7);
      // back up and happy: BEEP! (one word at a time when many get up together)
      if (beepT <= 0) { const [sx, sy, behind] = scene.screenOf(e.x, e.y + 1, e.z); if (!behind && sx > 0 && sx < 720 && sy > 0 && sy < 1280) { beepT = 0.4; pop(T('beep'), sx, sy - 60, 'p-coin', '#7dfcff'); } }
    }
    else if (e.type === 'wave') { if (!demo && e.n > 1) { waveBanner(e.n); Sound.play('horn'); buzz('warning'); } }
    else if (e.type === 'waveClear') { if (!demo) { save.coins += e.coins; save.total += e.coins; persistSoon(); celebrate(T('waveClear'), 'wave'); setTimeout(() => { if (alive) pop('+' + fmt(e.coins), 360, 640, 'p-mid', '#ffe14a'); }, 300); } }
    else if (e.type === 'star') { if (!demo) { Sound.play('star'); buzz('success'); const [sx, sy] = scene.screenOf(e.x, e.y, e.z); if (!e.chest) pop(T('star'), sx, sy - 80, 'p-mid', '#ffe14a'); flyStar(sx, sy); persist(); } } // the chest's star: TREASURE! says it
    else if (e.type === 'fever') { Sound.play('fever'); Sound.setTempo(150); celebrate(T('smashTime'), 'fever'); $('fever').hidden = false; $('ftime').hidden = false; sel = 'bomb'; renderTools(); setTip(null); }
    else if (e.type === 'clear') { $('fever').hidden = true; $('ftime').hidden = true; Sound.setTempo(118); sel = 'hammer'; renderTools(); results(); }
    else if (e.type === 'pop') { if (e.kind === 'hole') Sound.layers(cfg.feel.hole.sound.impact); }
  }
  function daily() {
    dailyChecked = true;
    const today = L.dayNum(new Date());
    if (!save.day) { save.day = today; persistSoon(); return; } // never on the first day
    if (L.dailyDue(save.day, today)) { save.day = today; save.coins += cfg.coins.daily; save.total += cfg.coins.daily; persist(); setTimeout(() => { if (alive) { banner(T('daily'), 'p-mid', -120); pop('+' + fmt(cfg.coins.daily), 360, 560, 'p-big', '#ffe14a'); Sound.play('unlock'); } }, 600); }
  }

  // ---- panels: the result card, the shop and album, the settings share one shell (ui.js) and one way in and out
  /** Closes a panel at once (the game reads `hidden`); a copy without ids plays the way out and is then removed. */
  function hidePanel(el) {
    if (el.hidden) return;
    const gh = el.cloneNode(true); gh.removeAttribute('id'); for (const n of gh.querySelectorAll('[id]')) n.removeAttribute('id');
    gh.classList.add('ghost'); gh.setAttribute('aria-hidden', 'true'); el.hidden = true; el.after(gh);
    setTimeout(() => gh.remove(), 180);
  }
  /** The room inside an element, in frame units (its width without its padding). */
  const roomIn = (el) => { const cs = getComputedStyle(el); return (el.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight)) / (root.getBoundingClientRect().width / 720 || 1); };
  /** Fits every element matching sel inside box to the room of its parent (or its own box when it fills a row). */
  const fitAll = (box, sel, base, lines = 1, own = false) => { for (const n of box.querySelectorAll(sel)) if (n.textContent) fitText(n, own ? roomIn(n) : roomIn(n.parentElement), base, lines); };
  const NAME = { hammer: 'nHammer', bomb: 'nBomb', rocket: 'nRocket', ball: 'nBall', hole: 'nHole', meteor: 'nMeteor' };

  // ---- results: stars, coins, the wreck figure, the next tool, NEXT and the quiet row under it
  function results() {
    if (!W || demo) return;
    $('shop').hidden = true; $('settings').hidden = true;
    // a finger, key or stick still down stops behind the card
    WD.aimHammer(W, null); WD.release(W); WD.setMove(W, 0, 0); hitHeld = false;
    // the cursor comes back for NEXT
    try { if (document.pointerLockElement) document.exitPointerLock(); } catch (er) { /* fine */ }
    // trophies for wrecking 50% and 80%
    const wr = WD.wreck(W), stars = L.starsFor(cfg, wr), cups = stars.filter(Boolean).length - 1;
    // the level bonus is paid once; later visits (after smashing more) only add the stars' difference
    const bonus = paidStars === null ? L.levelBonus(cfg, W.n, stars) : (stars.every(Boolean) && !paidStars.every(Boolean) ? L.levelBonus(cfg, W.n, stars) / 2 : 0);
    paidStars = stars;
    save.coins += bonus; save.total += bonus;
    // today's challenge: done for today
    if (W.daily) { if (save.dailyDone < L.dayNum(new Date())) save.dailyDone = L.dayNum(new Date()); }
    else { const key = String(W.n % WD.KINDS.length); save.best[key] = Math.max(save.best[key] || 0, cups); if (save.level <= W.n) { save.level = W.n + 1; save.levels++; } }
    persist(); renderTop();
    try { if (saveLoaded) lib.addPlayerScoreToLeaderboard(save.blocks).catch(() => {}); } catch (er) { /* no board here */ }
    const nt = L.nextTool(cfg, save.owned, save.coins), miss = nt ? nt.need - nt.have : 0;
    const share = typeof lib !== 'undefined' && typeof lib.share === 'function';
    // the wreck figure: its name, the share wrecked, and a bar with the two trophies standing at their thresholds
    const marks = `<span class="cups">${[1, 2].map((i) => `<img src="${TROPHY_SVG}" class="${stars[i] ? 'on' : ''}" style="inset-inline-start:${cfg.stars['wreck' + i] * 100}%;animation-delay:${0.6 + i * 0.2}s" alt="">`).join('')}</span>`;
    const quiet = [UI.secondary('keepBtn', 'hammer', T('keep'))];
    if (!W.daily && save.level >= 2 && save.dailyDone < L.dayNum(new Date())) quiet.push(UI.secondary('dailyBtn', 'calendar', T('dailyGo')));
    if (share) quiet.push(UI.secondary('shareBtn', 'plane', T('shareCta')));
    $('panel').innerHTML = `<div class="card rcard"><div class="rays"></div>
      <div class="title out">${T('clear')}</div>
      <div class="bigstars">${[0, 1, 2].map((i) => `<img src="${STAR_SVG}" class="on" style="animation-delay:${0.15 + i * 0.15}s" alt="">`).join('')}</div>
      <div class="stat out">${UI.COIN}+<b class="cnt">${fmt(W.coins + (bonus || 0))}</b></div>
      <div class="brag">${T('brag', commas(W.smashed))}</div>
      ${UI.meter({ ic: 'burst', label: T('wrecked'), value: `<b>${Math.round(wr * 100)}%</b>`, part: wr, marks })}
      ${nt ? UI.meter({ ic: nt.tool.id, label: T(NAME[nt.tool.id]), value: miss > 0 ? `${UI.COIN}<bdi>${T('need', fmt(miss))}</bdi>` : `${UI.icon('check')}${UI.COIN}<b>${fmt(nt.need)}</b>`, part: nt.have / nt.need, cls: 'ntool' }) : ''}
      <div class="btns">${UI.primary('nextBtn', T('next'), UI.icon('play', 'flip'))}<div class="brow">${quiet.join('')}</div></div></div>`;
    $('panel').hidden = false; resultsOpen = true; $('nextpill').hidden = true;
    Sound.play('clear'); buzz('success');
    countUp($('panel').querySelector('.cnt'), W.coins + (bonus || 0));
    layoutCard($('panel'));
    $('nextBtn').addEventListener('click', (ev) => { ev.stopPropagation(); nextLevel(); });
    if ($('dailyBtn')) $('dailyBtn').addEventListener('click', (ev) => { ev.stopPropagation(); startDaily(); });
    $('keepBtn').addEventListener('click', (ev) => { ev.stopPropagation(); hidePanel($('panel')); resultsOpen = false; $('nextpill').hidden = false; Sound.play('blip'); });
    if (share) $('shareBtn').addEventListener('click', (ev) => { ev.stopPropagation(); Promise.resolve().then(() => lib.share({ text: T('brag', commas(W.smashed)) + ' ' + T('share') })).catch(() => {}); });
  }
  // a save that came late still counts; after the daily, back to the path
  function nextLevel() { if (!W) return; Sound.unlock(cfg); Sound.play('blip', 880); const n = W.daily ? save.level : Math.max(W.n + 1, save.level); wipeTo(() => newLevel(n)); }
  function startDaily() { Sound.unlock(cfg); Sound.play('unlock'); const n = L.dailyLevel(cfg, L.dayNum(new Date())); wipeTo(() => newLevel(n, { daily: true })); }

  // ---- the shop (tap the coins): a card per tool to unlock and upgrade, and the album of buildings
  let shopTab = 'tools';
  const lvOf = (id) => L.clampLv(cfg, save.lv[id] || 1);
  /** Two numbers as text with just enough decimals to tell them apart ([now, next]; next null when there is none). */
  const pair = (a, b) => { if (b == null) return [String(+a.toFixed(1)), null]; for (const d of [1, 2, 3]) if (a.toFixed(d) !== b.toFixed(d)) return [a.toFixed(d), b.toFixed(d)]; return [a.toFixed(1), null]; };
  /**
   * One tool's card: icon, name, level, what the next level changes (size, wait, coins: now → next) and the price
   * button in one of its states: can pay (green), too expensive (grey, says how much is missing), max.
   * A locked tool shows its lock and, while its free try of this level is unused, the tool bar's FREE badge.
   */
  function shopCard(t) {
    const owned = save.owned.includes(t.id), lv = lvOf(t.id), cost = owned ? L.upgradeCost(cfg, t.id, lv) : t.cost;
    const now = L.toolAt(cfg, t, owned ? lv : 1), nx = owned && cost !== null ? L.toolAt(cfg, t, lv + 1) : null;
    const times = (p) => '×' + (+p.toFixed(1));
    const fx = UI.change('size', ...pair(now.r, nx && nx.r)) + UI.change('clock', ...pair(now.cd, nx && nx.cd)) + (owned ? UI.change(UI.COIN, times(now.power), nx && times(nx.power)) : '');
    const tryIt = !owned && W && W.fever <= 0 && !W.tried.has(t.id) ? `<span class="stry">${T('tryFree')}</span>` : '';
    const miss = cost === null ? 0 : cost - save.coins, lead = UI.icon(owned ? 'up' : 'lock');
    const btn = cost === null ? `<span class="pbtn max">${UI.icon('check')}<span class="tx">${T('max')}</span></span>`
      : miss <= 0 ? `<button class="btn pbtn can" data-buy="${t.id}">${lead}${UI.COIN}<b>${fmt(cost)}</b></button>`
        : `<button class="btn pbtn no" data-buy="${t.id}"><span class="pl">${lead}${UI.COIN}<b>${fmt(cost)}</b></span><span class="need"><bdi>${T('need', fmt(miss))}</bdi></span></button>`;
    // the level as a number (30 levels: pips would not fit), with a thin bar towards the top
    const level = owned ? `<b>${T('lv', lv)}</b><i><u style="width:${Math.round(lv / cfg.upgrade.max * 100)}%"></u></i>` : '';
    return `<div class="srow tile${owned ? '' : ' locked'}"><span class="sic">${UI.icon(t.id)}${owned ? '' : `<i class="slock">${UI.icon('lock')}</i>`}</span><span class="slv">${level}${tryIt}</span><span class="sinfo"><span class="snm">${T(NAME[t.id])}</span><span class="sfx">${fx}</span></span>${btn}</div>`;
  }
  function openShop(tab) {
    // nothing is bought before the save is read: a late save would undo it
    if (mode !== 'play' || !W || resultsOpen || !saveLoaded) return;
    shopTab = tab || shopTab; save.learned.shop = true; $('coins').classList.remove('can');
    let body = '';
    if (shopTab === 'tools') body = `<div class="sgrid">${cfg.tools.map(shopCard).join('')}</div>`;
    else {
      const seen = {}; for (const [k, v] of Object.entries(save.best)) { const n = Number(k); if (!Number.isFinite(n)) continue; const kind = WD.KINDS[n % WD.KINDS.length]; seen[kind] = Math.max(seen[kind] || 0, v); }
      body = `<div class="agrid">${WD.KINDS.map((k) => { const has = k in seen; return `<div class="atile tile ${has ? '' : 'off'}"><span class="aic">${UI.icon(has ? k : 'unknown')}</span><span class="ainfo"><span class="anm">${has ? T(k) : ''}</span><span class="acups">${[1, 2].map((i) => `<img src="${TROPHY_SVG}" class="${has && seen[k] >= i ? 'on' : ''}" alt="">`).join('')}</span></span></div>`; }).join('')}</div>`;
    }
    const sh = $('shop'), still = !sh.hidden;
    $('settings').hidden = true;
    sh.innerHTML = UI.panel({ head: UI.tabs([{ id: 'tools', icon: 'hammer', text: T('tools'), on: shopTab === 'tools' }, { id: 'album', icon: 'book', text: T('album'), on: shopTab === 'album' }]), body, closeId: 'shopX', cls: 'shopcard', still });
    sh.hidden = false; Sound.play('blip');
    const tabsEl = sh.querySelector('.tabs'); fitRow(tabsEl, [...tabsEl.querySelectorAll('.tab')], 30);
    // names: two balanced lines in their card before a smaller font
    fitAll(sh, '.snm, .anm', 24, 2); fitAll(sh, '.slv b', 20); for (const n of sh.querySelectorAll('.stry')) fitText(n, 100, 18); fitAll(sh, '.need', 18); fitAll(sh, '.pbtn.max .tx', 30);
  }
  let boughtAt = -1e9, boughtId = null;
  function buyOrUpgrade(id) {
    // a double tap lands on the fresh button of the same tool: one purchase per tap, not two (another tool is free to buy)
    if (id === boughtId && performance.now() - boughtAt < 350) return false;
    const t = cfg.tools.find((x) => x.id === id), owned = save.owned.includes(id), lv = lvOf(id), cost = owned ? L.upgradeCost(cfg, id, lv) : t.cost;
    if (cost === null || save.coins < cost) { Sound.play('no'); const b = $('shop').querySelector(`[data-buy="${id}"]`); if (b) { b.classList.remove('shk'); void b.offsetWidth; b.classList.add('shk'); } return false; }
    save.coins -= cost; boughtAt = performance.now(); boughtId = id;
    if (!owned) { save.owned.push(id); W.owned.push(id); } else { save.lv[id] = lv + 1; Object.assign(W.cfg.tools.find((x) => x.id === id), L.toolAt(cfg, t, lv + 1)); }
    persist(); Sound.play('unlock'); buzz('success'); renderTools(); renderTop(); openShop('tools');
    return true;
  }
  $('shop').addEventListener('pointerdown', (e) => e.stopPropagation());
  $('shop').addEventListener('click', (e) => {
    e.stopPropagation();
    const b = e.target.closest('button'); if (!b) { if (!e.target.closest('.card')) hidePanel($('shop')); return; }
    try { b.blur(); } catch (er) { /* fine */ }
    if (b.id === 'shopX') { hidePanel($('shop')); Sound.play('blip'); return; }
    if (b.dataset.tab) { openShop(b.dataset.tab); return; }
    if (b.dataset.buy) buyOrUpgrade(b.dataset.buy);
  });
  $('coins').addEventListener('click', (e) => { e.stopPropagation(); Sound.unlock(cfg); if (demo) firstTouch(); openShop('tools'); });
  $('nextpill').addEventListener('click', (e) => { e.stopPropagation(); results(); });
  $('panel').addEventListener('pointerdown', (e) => e.stopPropagation());

  // ---- settings (the gear): sound and the language, in the same panel shell
  let muteTouched = false;
  /** The sound button shows the sound's state. */
  function syncMute() { const m = $('mute'); if (m) m.querySelector('.ico').outerHTML = UI.icon(Sound.muted ? 'soundOff' : 'soundOn'); }
  function openSettings() {
    const st = $('settings'), still = !st.hidden;
    $('shop').hidden = true;
    const body = `<button id="mute" class="btn sec wide" aria-label="sound">${UI.icon(Sound.muted ? 'soundOff' : 'soundOn')}<span class="tx">${T('sound')}</span></button>
      <div class="plabel">${UI.icon('globe')}<span class="tx">${T('language')}</span></div>
      <div id="langs" class="langs">${LANGS.map((l) => `<button data-l="${l}" class="btn sec${l === lang ? ' on' : ''}"><span class="tx">${cfg.langNames[l]}</span></button>`).join('')}</div>`;
    st.innerHTML = UI.panel({ head: UI.title(T('settings'), 'gear'), body, closeId: 'setX', cls: 'setcard', still });
    st.hidden = false;
    fitAll(st, '.ptitle .tx', 44); fitAll(st, '#mute .tx', 30); fitAll(st, '.plabel .tx', 24); fitAll(st, '.langs .tx', 30);
  }
  $('gear').addEventListener('click', (e) => { e.stopPropagation(); try { e.currentTarget.blur(); } catch (er) { /* fine */ } Sound.unlock(cfg); Sound.play('blip'); if ($('settings').hidden) openSettings(); else hidePanel($('settings')); renderTop(); });
  $('settings').addEventListener('pointerdown', (e) => e.stopPropagation());
  $('settings').addEventListener('click', (e) => {
    e.stopPropagation();
    const b = e.target.closest('button'); if (!b) { if (!e.target.closest('.card')) hidePanel($('settings')); return; }
    try { b.blur(); } catch (er) { /* fine */ }
    if (b.id === 'setX') { hidePanel($('settings')); Sound.play('blip'); return; }
    if (b.id === 'mute') { muteTouched = true; Sound.unlock(cfg); Sound.setMuted(!Sound.muted); save.muted = Sound.muted; syncMute(); persist(); return; }
    const l = b.dataset.l; if (!l) return;
    lang = l; save.lang = l; setDir(); signLang(); hidePanel($('settings')); renderTools(); renderTop(); if (tipKey) setTip(tipKey); relabel(); persist();
  });

  // ---- frame loop
  let stopT = 0, slowT = 0;
  let qT = 0, qN = 0, coinTickT = 0, arrowKey = '', hitState = '';
  // quality: a weak phone starts on the low tier (no shadows, half the particles, a lower resolution); everywhere the
  // resolution follows the average frame over a window: slow → down a step, fast → up a step
  const Q = cfg.quality; let qs8 = { dpr: scene.dpr, max: scene.dprBase, low: false, capped: false, dropped: null, slow: 0 };
  { let weak = false; try { weak = touchUI && ((navigator.hardwareConcurrency || 8) <= Q.weakCores || (navigator.deviceMemory || 8) <= Q.weakMemory); } catch (e) { weak = false; } if (weak || qs.has('low')) { qs8.low = true; qs8.max = Math.min(scene.dprBase, Q.lowMax); qs8.dpr = Math.min(qs8.max, Q.minDpr); scene.setLow(true); scene.setDpr(qs8.dpr); } }
  function frame(now) {
    if (!alive) return;
    raf = requestAnimationFrame(frame);
    const real = Math.min(0.1, (now - last) / 1000); last = now;
    if (document.hidden) return;
    qT += real; qN++;
    if (qT >= Q.window) {
      const avg = qT / qN; qT = 0; qN = 0;
      qs8 = L.qualityStep(Q, qs8, avg); scene.setDpr(qs8.dpr); if (qs8.low !== scene.low) scene.setLow(qs8.low);
    }
    // hit-stop on a solid hit (time slowed to feel.stopScale), slow motion while a tower tips and as a big piece lands
    if (stopT > 0) stopT -= real; if (slowT > 0) slowT -= real;
    const dt = real * speed * (stopT > 0 ? cfg.feel.stopScale : slowT > 0 ? 0.4 : 1);
    beepT -= real;
    coinPopT -= dt; coinFlyT -= dt;
    if (mode === 'play' && W) {
      if (demo) { // attract: the hero smashes the fence by himself
        // a panel pauses the world: the demo waits too (it piled up rockets and fired them all when the panel closed)
        if (!modalOpen()) demoT -= dt;
        if (demoT <= 0) { demoT = 1.6; const t = demoTarget(); if (t) { W.cool.rocket = 0; WD.useTool(W, 'rocket', t); } }
        // the view follows the front-yard robot for the first seconds (it is the one the first rocket sends flying)
        const b0 = W.bots[0], fb = b0 && W.t < 4 && (b0.state === 'walk' || (b0.state === 'down' && b0.t < 1.1)) ? (b0.pts ? { x: b0.pts[1][0], y: b0.pts[1][1], z: b0.pts[1][2] } : { x: b0.x, y: 0.9, z: b0.z }) : null;
        scene.demoLook(W.box, fb);
      } else if (resultsOpen) WD.setMove(W, 0, 0);
      else {
        // walking: the stick or the keys, turned by where the view looks
        let fx = 0, sx = 0;
        if (stick) { sx = stick.dx / STICK_R; fx = -stick.dy / STICK_R; }
        if (keys.has('w') || keys.has('arrowup')) fx += 1; if (keys.has('s') || keys.has('arrowdown')) fx -= 1;
        if (keys.has('d') || keys.has('arrowright')) sx += 1; if (keys.has('a') || keys.has('arrowleft')) sx -= 1;
        const len = Math.hypot(fx, sx), run = keys.has('shift') ? 1.35 : 1;
        if (len > 0.08) { const y = scene.yaw, k = Math.min(1, len) / len * run; WD.setMove(W, (Math.cos(y) * sx - Math.sin(y) * fx) * k, (-Math.sin(y) * sx - Math.cos(y) * fx) * k); scene.follow = false; } else WD.setMove(W, 0, 0);
        // a tap walk is over: the view stays where it ended up
        if (scene.follow && !ptr && !W.hero.goal && !W.hero.aim && W.hero.swingT < 0) scene.follow = false;
        if (!scene.follow) W.hero.yaw = scene.yaw + Math.PI; // the hero faces where the player looks
        if (hitHeld && sel === 'hammer') hammerAtCrosshair();
      }
      if (ptr && sel === 'hammer' && !ptr.drag && !resultsOpen && performance.now() - ptr.t > 120) { // holding on a block: keep aiming at what is under the finger
        // only a block in reach makes it a hold: a slow press on a far block or a star is still a tap on release
        const t = scene.pick(ptr.cx, ptr.cy);
        if (t && t.type === 'bot' && t.dist <= cfg.hero.reach + 0.6) { WD.swingBot(W, t.i); ptr.held = true; if (!save.learned.hit) { save.learned.hit = true; persistSoon(); } }
        else if (t) { WD.aimHammer(W, t, true, false); if (W.hero.aim) { ptr.held = true; if (!save.learned.hit) { save.learned.hit = true; persistSoon(); } } }
      }
      const sub = dt > 1 / 45 ? 2 : 1;
      // the shop pauses the world (smash time does not run out behind it)
      W.frozen = stopT > 0;
      if (!modalOpen()) for (let i = 0; i < sub; i++) for (const e of WD.step(W, dt / sub)) onEvent(e);
      if (W.fever > 0) $('ftime').textContent = '⏱ ' + Math.ceil(W.fever);
      // cooldown rings
      for (const t of cfg.tools) { const c = W.cool[t.id] ? W.cool[t.id] / L.cooldownOf(W.cfg, t.id, W.fever > 0) : 0; const el = toolEls[t.id], v = Math.round(Math.min(1, c) * 30) / 30; if (el._c !== v) { el._c = v; el.style.setProperty('--c', String(v)); } }
      // HIT pulses when the tool is ready, dims while it cools down
      const hs = W.phase === 'done' || resultsOpen ? '' : sel === 'hammer' || ((W.cool[sel] || 0) <= 0 && usable(sel)) ? 'ready' : 'cool';
      if (hs !== hitState) { hitState = hs; hitBtn.classList.toggle('ready', hs === 'ready'); hitBtn.classList.toggle('cool', hs === 'cool'); }
      if (hardHint) { hardHint.t -= dt; if (hardHint.t <= 0) { hardHint = null; toolEls.bomb.classList.remove('hint'); } }
      idleT = W.phase === 'play' && !demo ? idleT + dt : 0;
      placeHand(); placeArrows(); coachTick(dt);
      if (dirtySave && (persistT -= dt) <= 0) { persistT = 2; persist(); }
    }
    scene.tool = sel;
    scene.update(W, mode === 'play' ? dt : real * 0.3);
    coinTickT -= dt; if (scene.coinArrive && coinTickT <= 0) { coinTickT = 0.05; Sound.play('coinS'); }
    renderTop();
  }
  /** The attract mode's next rocket target: a block high on the building's front, picked in turn left to right. */
  let demoN = 0;
  function demoTarget() {
    // the attract mode's opening: the first rocket (and every third) goes to the robot strolling in the front yard
    const bot = W.bots.find((o) => o.state === 'walk' && Math.hypot(o.x - W.hero.x, o.z - W.hero.z) < 9);
    // just in front of it (towards the hero): the blast throws it away from the view, towards the building
    if (bot && demoN % 3 === 0) { demoN++; const dx = bot.x - W.hero.x, dz = bot.z - W.hero.z, d = Math.hypot(dx, dz) || 1; return { x: bot.x - dx / d * 0.7, y: 0.7, z: bot.z - dz / d * 0.7 }; }
    const b = W.box, xs = [b.x0 + 2, (b.x0 + b.x1) >> 1, b.x1 - 2], x = xs[demoN++ % 3];
    for (let y = W.g.H - 1; y >= 3; y--) for (let z = b.z1 + 2; z >= b.z0; z--) if (W.g.get(x, y, z)) return { x: x + 0.5, y: y + 0.5, z: z + 0.5 };
    return null;
  }
  function placeHand() {
    const hand = $('hand');
    if (coachK) { hand.hidden = true; hand._k = ''; return; }
    // stuck for a while: the hand points at a shining star (tapping it throws a star bomb)
    const help = idleT > 8 && !demo && tipKey !== 'tooHard' ? scene.starMarks()[0] : null;
    if (help) { hand.hidden = false; const k = `s${Math.round(help.x / 4)},${Math.round(help.y / 4)}`; if (hand._k !== k) { hand._k = k; hand.style.translate = `calc(var(--u)*${help.x}px) calc(var(--u)*${help.y + 30}px)`; } return; }
    if (hand._k && hand._k[0] === 's') { hand._k = ''; hand.hidden = !(tipKey === 'tap' || tipKey === 'tooHard'); }
    if (hand.hidden) return;
    let x, y;
    if (tipKey === 'tooHard') { const r = toolEls.bomb.getBoundingClientRect(), a = root.getBoundingClientRect(); x = (r.left + r.width / 2 - a.left) / a.width * 720; y = (r.top - a.top) / a.height * 1280 - 10; }
    else { x = 400; y = 560; } // first person: point at the middle of the view
    const k = `${Math.round(x / 4)},${Math.round(y / 4)}`; if (hand._k !== k) { hand._k = k; hand.style.translate = `calc(var(--u)*${x}px) calc(var(--u)*${y}px)`; }
  }
  // ---- coach: the first times, a spotlight shows each control (walk, look, smash, bomb) until it has been used once
  let coachK = null, walkD = 0, lastHX = 0, lastHZ = 0, aimT = 0, lostT = 0;
  /** An element's centre and size in frame units. */
  const frameRect = (el) => { const r = el.getBoundingClientRect(), a = root.getBoundingClientRect(), k = 720 / (a.width || 720); return { x: (r.left - a.left + r.width / 2) * k, y: (r.top - a.top + r.height / 2) * k, w: r.width * k, h: r.height * k }; };
  /** Shows the coach step k (null hides it): a dimmed screen with a lit hole on the control, a label and a moving hand. */
  function showCoach(k) {
    if (coachK === k) return;
    coachK = k; const c = $('coach');
    if (!k) { c.hidden = true; if (tipKey) $('tip').hidden = false; return; }
    const desk = !touchUI; let cx, cy, cr, hx, hy, text, how;
    if (k === 'walk') { const r = desk ? frameRect($('keys')) : { x: 111, y: 1029, w: 190 }; cx = r.x; cy = r.y; cr = desk ? r.w / 2 + 24 : 118; hx = cx; hy = cy + (desk ? 10 : 30); text = T(desk ? 'cWalkKeys' : 'cWalk'); how = desk ? 'press' : 'drag'; }
    else if (k === 'look') { cx = 400; cy = 560; cr = 210; hx = 400; hy = 600; text = T(desk ? 'cLookMouse' : 'cLook'); how = 'swipe'; }
    else if (k === 'hit') { const r = frameRect($(desk ? 'cross' : 'hit')); cx = r.x; cy = r.y; cr = desk ? 90 : r.w / 2 + 26; hx = cx; hy = cy + 20; text = T(desk ? 'cHitClick' : 'cHit'); how = 'press'; }
    else { const r = frameRect(toolEls.bomb); cx = r.x; cy = r.y; cr = r.w / 2 + 22; hx = cx; hy = cy - 10; text = T('tooHard'); how = 'press'; }
    const ly = k === 'look' ? 300 : Math.max(330, Math.min(860, cy - cr - 70));
    for (const [n, v] of [['cx', cx], ['cy', cy], ['cr', cr], ['hx', hx], ['hy', hy], ['ly', ly]]) c.style.setProperty('--' + n, String(Math.round(v)));
    c.className = 'coach ' + how; const lb = c.querySelector('.clabel'); lb.textContent = text;
    c.hidden = false; fitText(lb, 600, 44, 2); $('tip').hidden = true;
  }
  function coachTick(dt) {
    if (demo || resultsOpen || modalOpen() || W.phase === 'free') { showCoach(null); return; }
    const h = W.hero, d = Math.hypot(h.x - lastHX, h.z - lastHZ); lastHX = h.x; lastHZ = h.z;
    if (h.move && (h.move.x || h.move.z)) walkD += Math.min(d, 1);
    if (!save.learned.walk && walkD > 2) { save.learned.walk = true; persistSoon(); }
    const t = scene.target, near = t && ((t.type === 'block' && t.dist <= cfg.hero.reach) || (t.type === 'bot' && t.dist <= cfg.hero.reach + 0.6));
    aimT = near ? aimT + dt : 0; lostT = near ? 0 : lostT + dt;
    let k = null;
    if (tipKey === 'tooHard' && !save.learned.bomb && sel === 'hammer' && usable('bomb')) k = 'bomb';
    else if (W.phase !== 'play' || W.t < 1.2) k = null;
    else if (!save.learned.walk) k = 'walk';
    else if (!save.learned.drag) k = 'look';
    // the smash step stays up while the target only flickers away (a block breaking under the crosshair)
    else if (!save.learned.hit && (aimT > 0.6 || (coachK === 'hit' && lostT < 0.6))) k = 'hit';
    // the step on screen was just done: a thumbs-up
    if (coachK && coachK !== k && ['walk', 'look', 'hit', 'bomb'].includes(coachK) && save.learned[coachK === 'look' ? 'drag' : coachK]) cheer();
    showCoach(k);
  }
  /** A lesson done: a thumbs-up and a bright note. */
  /** The coach step on screen, drawn again (a new language). */
  function relabel() { if (coachK && coachK !== '-') { const k = coachK; coachK = '-'; showCoach(k); } }
  function cheer() { pop('👍 ' + T('great'), 360, 470, 'p-mid', '#7dff9a'); Sound.play('blip', 990); buzz('tap'); }
  /** A new level: a card with the building's icon, its number and name (and BOSS / DAILY). */
  function levelCard(n) {
    const el = $('lvcard'), tag = W.daily ? `<span class="lvtag d">📅 ${T('dailyGo')}</span>` : W.boss ? `<span class="lvtag">👑 ${T('boss')}</span>` : '';
    el.innerHTML = `<span class="lvic">${UI.icon(W.kind in UI.ICONS ? W.kind : 'cottage')}</span><b class="out">${T('level', n + 1)}</b><span class="lvnm">${T(W.kind)}</span>${tag}`;
    el.hidden = false; el.classList.remove('go'); void el.offsetWidth; el.classList.add('go');
    clearTimeout(levelCard.t); levelCard.t = setTimeout(() => { el.hidden = true; }, 2300);
    for (const x of el.querySelectorAll('b, .lvnm, .lvtag')) fitText(x, 600, x.tagName === 'B' ? 72 : 40, x.classList.contains('lvnm') ? 2 : 1);
  }
  /** Builds the next level at once under a white flash that fades away. */
  function wipeTo(fn) { $('panel').hidden = true; fn(); const w = $('wipe'); w.hidden = false; w.classList.remove('go'); void w.offsetWidth; w.classList.add('go'); clearTimeout(wipeTo.t); wipeTo.t = setTimeout(() => { w.hidden = true; }, 650); }
  /** Something flies from frame point (sx, sy) into a HUD element, which bumps when it lands. */
  function fly(html, sx, sy, target, land = 'bump') {
    const r = frameRect(target), el = document.createElement('div'); el.className = 'fly'; el.innerHTML = html;
    el.style.left = `calc(var(--u)*${Math.round(sx)}px)`; el.style.top = `calc(var(--u)*${Math.round(sy)}px)`;
    el.style.setProperty('--dx', String(Math.round(r.x - sx))); el.style.setProperty('--dy', String(Math.round(r.y - sy)));
    $('flies').appendChild(el);
    setTimeout(() => { el.remove(); target.classList.remove(land); void target.offsetWidth; target.classList.add(land); }, 620);
  }
  // each found star has its own slot, even when two are found in one step
  let starsFlown = 0;
  const flyStar = (sx, sy) => { const slots = $('stars').querySelectorAll('img'), i = Math.min(2, starsFlown++); fly(`<img class="fst" src="${STAR_SVG}" alt="">`, sx, sy, slots[i], 'land'); };
  /**
   * The result card's text follows its length: the title and the brag line fit the card, a meter's label fits beside
   * its value, NEXT fits the card, and the quiet buttons (equal shares of one row) wrap their words in two lines.
   */
  function layoutCard(panel) {
    const card = panel.querySelector('.card'); if (!card) return;
    const inner = roomIn(card);
    const title = card.querySelector('.title'); if (title) fitText(title, inner, 60, 2);
    const brag = card.querySelector('.brag'); if (brag) fitText(brag, inner, 30, 2);
    fitAll(card, '.mlab', 24, 1, true);
    const nx = card.querySelector('.pri .tx'); if (nx) fitText(nx, roomIn(nx.parentElement) - 60, 52);
    fitAll(card, '.brow .tx', 24, 2);
  }
  /** The result card's coins count up from 0. */
  function countUp(el, to) {
    if (!el || to <= 0) return; const t0 = performance.now() + 450, dur = 700; el.textContent = '0';
    const tick = () => { if (!alive || !el.isConnected) return; const k = Math.max(0, Math.min(1, (performance.now() - t0) / dur)); el.textContent = fmt(Math.round(to * (1 - Math.pow(1 - k, 3)))); if (k < 1) requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  }
  /** An arrow at the frame's edge towards each star that is out of view. */
  function placeArrows() {
    const box = $('arrows'), list = [];
    if (!demo && W.phase === 'play') {
      const pts = W.starCells.filter((c) => W.g.get(c.x, c.y, c.z) === W.ids.star).map((c) => [c.x + 0.5, c.y + 0.5, c.z + 0.5]);
      if (!W.chest.open) pts.push([W.chest.x, 0.8, W.chest.z]);
      for (const [x, y, z] of pts) {
        let [sx, sy, behind] = scene.screenOf(x, y, z);
        if (!behind && sx > 30 && sx < 690 && sy > 60 && sy < 1100) continue; // in view: its beacon shows it
        if (behind) { sx = 720 - sx; sy = 1280 - sy; }
        const dx = sx - 360, dy = sy - 560, a = Math.atan2(dy, dx), k = Math.min(300 / Math.abs(Math.cos(a) || 1e-3), 210 / Math.abs(Math.sin(a) || 1e-3)); // inside y 350..770: clear of the top bar, the tip line, the stick and HIT
        list.push([Math.round(360 + Math.cos(a) * k), Math.round(560 + Math.sin(a) * k), Math.round(a * 180 / Math.PI + 90)]);
      }
    }
    const key = list.map((l) => l.map((v) => Math.round(v / 6)).join(',')).join(';');
    if (key === arrowKey) return; arrowKey = key;
    // a pool of arrows moved with translate (no new elements, no left/top while the view turns)
    while (box.children.length < list.length) box.insertAdjacentHTML('beforeend', `<div class="arrow"><i></i><img src="${STAR_SVG}" alt=""></div>`);
    [...box.children].forEach((el, i) => { const l = list[i]; el.hidden = !l; if (l) { el.style.translate = `calc(var(--u)*${l[0]}px) calc(var(--u)*${l[1]}px)`; el.style.setProperty('--a', l[2] + 'deg'); } });
  }

  function fit() { const r = root.getBoundingClientRect(); root.style.setProperty('--u', String(r.width / 720)); scene.resize(r.width, r.height); }
  const onResize = () => fit();
  window.addEventListener('resize', onResize);
  const onVis = () => { Sound.suspend(document.hidden); if (document.hidden && dirtySave) persist(); };
  document.addEventListener('visibilitychange', onVis);

  try {
    lib.showGameParameters({ name: 'Block Smash Crew', params: {
      'Hammer size': { key: 'tools.0.r', type: 'slider', min: 0.8, max: 3, step: 0.05 },
      'Bomb size': { key: 'tools.1.r', type: 'slider', min: 1.5, max: 6, step: 0.1 },
      'Hero speed': { key: 'hero.speed', type: 'slider', min: 2, max: 10, step: 0.1 },
      'Smash time (s)': { key: 'fever.dur', type: 'slider', min: 3, max: 20, step: 1 },
      'Coins per level': { key: 'coins.level', type: 'slider', min: 0, max: 5000, step: 50 },
      'Wreck for star 3 (%)': { key: 'stars.wreck2', type: 'slider', min: 0.5, max: 1, step: 0.05 },
      'Robots per wave': { key: 'waves.count', type: 'slider', min: 5, max: 20, step: 1 },
      'Next wave (s)': { key: 'waves.every', type: 'slider', min: 12, max: 60, step: 1 },
    } });
  } catch (e) { /* host without a settings panel */ }

  fit();
  if (mode === 'edit') {
    // a still showcase: the first building and the hero, nothing moves or counts
    newLevel(0, { demo: true }); $('hud').classList.add('edit'); setTip(null);
  } else {
    newLevel(0, { demo: true });
    let localGain = false;
    const read = (tries) => Promise.resolve().then(() => lib.getUserGameState()).then((r) => {
      if (!alive) return;
      const st = r && r.state;
      if (st && typeof st === 'object') {
        // what was earned before the save arrived is added on top, never lost
        const earned = save.coins, earnedTotal = save.total, blocks = save.blocks, owned = save.owned.slice(), picked = save.lang, learned = { ...save.learned }, mutedLocal = Sound.muted, levelLocal = save.level, levelsLocal = save.levels, best = { ...save.best }, dayLocal = save.day, dailyLocal = save.dailyDone, lvLocal = { ...save.lv }, bestLocal = save.bestBlast;
        const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
        save.coins = Math.max(0, num(st.coins)) + earned; save.total = num(st.total) + earnedTotal; save.blocks = num(st.blocks) + blocks;
        save.level = Math.max(num(st.level), levelLocal); save.levels = num(st.levels) + levelsLocal;
        save.owned = [...new Set(['hammer', 'bomb', ...(Array.isArray(st.owned) ? st.owned : []), ...owned])].filter((id) => cfg.tools.some((t) => t.id === id));
        save.best = { ...(st.best && typeof st.best === 'object' ? st.best : {}) }; for (const [k, v] of Object.entries(best)) save.best[k] = Math.max(num(save.best[k]), v);
        // trophies are kept per building kind (8 entries at most, however many levels are played)
        { const f = {}; for (const [k, v] of Object.entries(save.best)) { const n = Number(k); if (Number.isFinite(n) && n >= 0) f[n % WD.KINDS.length] = Math.max(f[n % WD.KINDS.length] || 0, num(v)); } save.best = f; }
        // every lesson learned on either side stays learned (the coach never comes back for it)
        save.learned = {}; for (const k of LESSONS) save.learned[k] = !!(st.learned && st.learned[k]) || !!learned[k];
        save.day = Math.max(num(st.day), dayLocal); save.dailyDone = Math.max(num(st.dailyDone), dailyLocal); save.bestBlast = Math.max(num(st.bestBlast), bestLocal);
        save.lv = { ...(st.lv && typeof st.lv === 'object' ? st.lv : {}) }; for (const [k, v] of Object.entries(lvLocal)) save.lv[k] = Math.max(num(save.lv[k]) || 1, v);
        // a save from the 5-level shop keeps its levels; only known tools, whole levels inside 1..max (bounded)
        { const f = {}; for (const t of cfg.tools) if (save.lv[t.id] != null) f[t.id] = L.clampLv(cfg, num(save.lv[t.id])); save.lv = f; }
        // lessons learned on another day: the coach on screen goes quietly (no thumbs-up for them)
        coachK = '-'; showCoach(null);
        save.lang = picked || (LANGS.includes(st.lang) ? st.lang : null);
        if (save.lang) { lang = save.lang; setDir(); signLang(); }
        save.muted = muteTouched ? mutedLocal : !!st.muted; Sound.setMuted(save.muted); syncMute();
        if (W) { for (const id of save.owned) if (!W.owned.includes(id)) W.owned.push(id); for (const t of W.cfg.tools) Object.assign(t, L.toolAt(cfg, cfg.tools.find((x) => x.id === t.id), save.lv[t.id] || 1)); } // the saved upgrades apply to the level already running
        localGain = earnedTotal > 0 || levelsLocal > 0 || blocks > 0;
      }
      saveLoaded = true;
      if (demo && !touched && save.level !== W.n) newLevel(save.level, { demo: true }); // the attract mode shows the player's next building
      renderTools(); renderTop(); if (tipKey) setTip(tipKey);
      if (localGain) persist(); // only what was earned before the save came needs writing (never during the attract mode)
    }).catch(() => { if (alive) setTimeout(() => read(tries + 1), Math.min(10000, 1500 * (tries + 1))); /* keep trying; never write blind */ });
    read(0);
  }
  scene.compile();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if (!alive) return; if (tipKey) setTip(tipKey); scene.redrawSigns(); hitLabel = ''; labelHit(); }); // measure again with the real font
  renderTop(); renderTools();
  if (window.__load) window.__load.done();
  raf = requestAnimationFrame((t) => { last = t; frame(t); });

  return {
    destroy() {
      alive = false; cancelAnimationFrame(raf); Sound.stop();
      if (dirtySave) persist();
      root.removeEventListener('pointerdown', onDown); window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp); window.removeEventListener('pointercancel', onCancel);
      root.removeEventListener('contextmenu', noMenu); window.removeEventListener('keydown', onKey); window.removeEventListener('keyup', onKey); window.removeEventListener('blur', onBlur); root.removeEventListener('wheel', onWheel); document.removeEventListener('pointerlockchange', onLock); document.removeEventListener('pointerlockerror', onLockError); try { if (document.pointerLockElement === cv) document.exitPointerLock(); } catch (er) { /* fine */ }
      window.removeEventListener('resize', onResize); document.removeEventListener('visibilitychange', onVis);
      scene.dispose(); root.innerHTML = '';
    },
    debug: {
      get W() { return W; }, get demo() { return demo; }, get save() { return save; }, get saveLoaded() { return saveLoaded; }, get lang() { return lang; }, get sel() { return sel; }, get resultsOpen() { return resultsOpen; },
      fitText, scene, T, Sound, WD, newLevel, results, nextLevel, pickTool, onEvent, setLang(l) { lang = l; setDir(); signLang(); renderTools(); renderTop(); if (tipKey) setTip(tipKey); relabel(); }, celebrate, get lastCelebration() { return lastCelebration; }, canBuy: () => L.canBuy(cfg, save.owned, save.lv, save.coins),
      /** Client position of a frame point, for tests that touch like a finger. */
      client(x, y) { const r = root.getBoundingClientRect(); return [r.left + x / 720 * r.width, r.top + y / 1280 * r.height]; },
      get hitState() { return hitState; }, get stopT() { return stopT; }, get quality() { return { ...qs8, base: scene.dprBase }; },
      get textures() { return scene.renderer.info.memory.textures; }, get geometries() { return scene.renderer.info.memory.geometries; },
    },
  };
}

const HTML = `
<canvas id="cv"></canvas>
<div id="hud" class="hud">
  <div class="top">
    <div id="coins" class="pill coins gloss"><i class="coin"></i><b>0</b><span id="dot" class="dot" hidden>!</span></div>
    <div class="mid"><div id="stars" class="pill stars gloss"></div><div id="bar" class="bar"></div><button id="nextpill" class="nextpill out" hidden></button></div>
    <button id="gear" class="btn ibtn" aria-label="settings">${UI.icon('gear')}</button>
  </div>
  <div id="fever" class="fever" hidden></div>
  <div id="ftime" class="ftime out" hidden></div>
  <div id="arrows"></div>
  <div id="cross" class="cross"></div>
  <div id="stickHome" class="stick home"><i></i></div>
  <div id="stick" class="stick" hidden><i></i></div>
  <button id="hit" class="hitbtn gloss" aria-label="hit"><span class="hic">${UI.icon('burst')}</span><span class="hl out"></span></button>
  <div id="keys" class="keys out">WASD · 🖱️ · 1-6</div>
  <div id="tip" class="tip out" hidden></div>
  <div id="tools" class="tools"></div>
  <div id="coach" class="coach" hidden><i class="cring"></i><div class="clabel"></div><div class="chand">👆</div></div>
  <div id="lvcard" class="lvcard" hidden></div>
  <div id="pops" class="pops"></div>
  <div id="wavebn" class="wavebn out" hidden></div>
  <div id="confetti" class="confetti" hidden></div>
  <div id="flies" class="flies"></div>
  <div id="hand" class="hand" hidden>👆</div>
  <div id="panel" class="panel" hidden></div>
  <div id="shop" class="panel" hidden></div>
  <div id="settings" class="panel" hidden></div>
  <div id="wipe" class="wipe" hidden></div>
</div>`;

window.run = run;

// Outside Astrocade (?local): stand in for the host, read the config file and start.
if (typeof location !== 'undefined' && new URLSearchParams(location.search).has('local') && !window.lib) {
  const none = async () => ({});
  const store = { state: window.__preset || null };
  window.lib = { showGameParameters() {}, log() {}, getUserGameState: async () => { if (window.__saveDelay) await new Promise((r) => setTimeout(r, window.__saveDelay)); return window.__saveFails ? Promise.reject(new Error('offline')) : { state: store.state }; },
    saveUserGameState: async (s) => { store.state = s; (window.__writes = window.__writes || []).push(s); }, addPlayerScoreToLeaderboard: none, getTopNEntriesFromLeaderboard: none,
    shouldUseTouchControls: () => matchMedia('(pointer: coarse)').matches, ...(window.__share ? { share: async (o) => { (window.__shared = window.__shared || []).push(o); } } : {}), haptics: { play() {}, start() {}, stop() {} }, getAsset: () => undefined };
  Promise.all([fetch('./game_config.json').then((r) => r.json()), fetch('./asset_map.json').then((r) => r.json()).catch(() => ({}))]).then(([c, assets]) => {
    window.lib.getAsset = (id) => (window.__noAssets ? undefined : assets[id]);
    window.gameConfig = c; run(new URLSearchParams(location.search).get('mode') || 'play');
  });
}
