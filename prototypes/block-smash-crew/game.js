// PROTOTYPE - NOT FOR PRODUCTION
// Genre: voxel destruction / demolition action for kids (ages 5-12), 3D, one finger, portrait.
// Block Smash Crew: Voxel Demolition. A demolition kid in a hard hat smashes cheerful block buildings (cottage, candy
// shop, castle, lighthouse, toy factory, ice palace, jungle temple, space base) to find 3 stars in each: one in the
// treasure chest inside a steel vault, one high up, one deep inside. Tap or hold where to smash: the hero runs there
// and smashes everything in the way; drag to turn the camera. Anything left without support falls and shatters.
// Tools: hammer, bomb, rocket, wrecking ball, black hole, meteor. All stars found = SMASH TIME (every tool, no wait,
// double coins). Stars for wrecking 50% and 80%; coins unlock tools. No timer, no losing. 7 languages.
// Modules: voxels.js (grid, mesher, collapse), levels.js (buildings), world.js (play rules), logic.js (numbers),
// scene.js (3D look; Three.js r187 loaded by index.html).
/* global THREE */ // set on window by index.html before run() starts the game
import * as L from './logic.js';
import * as WD from './world.js';
import { createScene } from './scene.js';

const LANGS = ['en', 'ar', 'es', 'vi', 'hi', 'bn', 'id'];
const STAR_SVG = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff7b0"/><stop offset=".5" stop-color="#ffd21f"/><stop offset="1" stop-color="#ff9f00"/></linearGradient></defs><path d="M50 6 61 37 94 37 67 57 77 90 50 70 23 90 33 57 6 37 39 37Z" fill="url(#g)" stroke="#7a4a00" stroke-width="7" stroke-linejoin="round"/><ellipse cx="40" cy="34" rx="7" ry="4" fill="#fff" opacity=".7" transform="rotate(-35 40 34)"/></svg>');
const TROPHY_SVG = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><linearGradient id="t" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff3a0"/><stop offset=".55" stop-color="#ffc21f"/><stop offset="1" stop-color="#e08a00"/></linearGradient></defs><g stroke="#7a4a00" stroke-width="6" stroke-linejoin="round" fill="url(#t)"><path d="M26 12h48v22c0 16-10 28-24 28S26 50 26 34z"/><path d="M26 18H12c0 16 8 24 18 24M74 18h14c0 16-8 24-18 24" fill="none"/><path d="M44 60h12v14H44z"/><path d="M30 76h40v12H30z"/></g><ellipse cx="40" cy="26" rx="5" ry="9" fill="#fff" opacity=".6"/></svg>');
const buzz = (kind) => { try { lib.haptics.play(kind); } catch (e) { /* no vibration here */ } };

// ---------------------------------------------------------------- sound: all made in code, no files to load
const Sound = (() => {
  let ctx = null, master = null, music = null, muted = false, noise = null, seq = 0, step = 0, nextT = 0, tempo = 118, lastCoin = 0;
  const ensure = () => {
    if (ctx) return ctx;
    try { ctx = new (window.AudioContext || window.webkitAudioContext)(); master = ctx.createGain(); master.gain.value = 0.75; master.connect(ctx.destination); music = ctx.createGain(); music.gain.value = 0.13; music.connect(master); } catch (e) { ctx = null; }
    if (ctx) { noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate); const d = noise.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
    return ctx;
  };
  function tone(type, f0, f1, dur, vol, at = 0, dest = master) {
    const t = ctx.currentTime + at, o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(dest); o.start(t); o.stop(t + dur + 0.02);
  }
  function hiss(f0, f1, dur, vol, type = 'bandpass', at = 0, q = 1.2) {
    const t = ctx.currentTime + at, s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noise; f.type = type; f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(f1, t + dur); f.Q.value = q;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f).connect(g).connect(master); s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.02);
  }
  const fx = {
    swing() { hiss(500, 2200, 0.14, 0.12); },
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
    blip(f = 660) { tone('square', f, f, 0.06, 0.1); },
    unlock() { [659, 784, 988, 1319, 1568].forEach((f, i) => tone('sine', f, f * 1.01, 0.16, 0.3, i * 0.06)); },
    no() { tone('square', 220, 160, 0.14, 0.12); },
    throwS() { hiss(700, 1800, 0.18, 0.18); },
    rocket() { hiss(400, 3000, 0.5, 0.3); },
    roll() { tone('sine', 55, 45, 0.25, 0.3); hiss(400, 200, 0.2, 0.2, 'lowpass'); },
    hole() { tone('sine', 120, 40, 1.6, 0.4); tone('sine', 600, 90, 1.4, 0.12); },
    meteor() { tone('sine', 2200, 300, 0.85, 0.15); },
    step() { hiss(600, 300, 0.05, 0.06); },
  };
  // a bouncy loop: bass on the beat, a marimba-ish melody
  const BASS = [45, 45, 52, 52, 50, 50, 47, 52], MEL = [69, 0, 72, 76, 0, 72, 69, 0, 71, 0, 74, 79, 0, 76, 74, 0];
  const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);
  function tick() {
    if (!ctx || muted || ctx.state !== 'running') return;
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
  return {
    unlock() { ensure(); if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {}); if (ctx && !seq) seq = setInterval(tick, 100); },
    play(id, a = 1) { if (!ctx || muted || ctx.state !== 'running') return; if (id === 'coinS') { const n = ctx.currentTime; if (n - lastCoin < 0.05) return; lastCoin = n; } fx[id](a); },
    setTempo(t) { tempo = t; },
    get muted() { return muted; },
    setMuted(v) { muted = !!v; },
    suspend(v) { if (!ctx) return; if (v) ctx.suspend().catch(() => {}); else ctx.resume().catch(() => {}); },
    stop() { clearInterval(seq); seq = 0; },
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
  const setDir = () => { root.dir = lang === 'ar' ? 'rtl' : 'ltr'; root.lang = lang; const np = root.querySelector('#nextpill'); if (np) np.textContent = lang === 'ar' ? '◀◀' : '▶▶'; };
  setDir();

  // ---- save: one slot; nothing is written until the player's own save has been read
  const save = { v: 1, coins: 0, total: 0, level: 0, best: {}, owned: ['hammer', 'bomb'], learned: { bomb: false, drag: false }, muted: false, lang: null, blocks: 0, levels: 0, day: 0 };
  let saveLoaded = false, persistT = 0, dirtySave = false;
  const persist = () => { if (mode === 'play' && saveLoaded) { dirtySave = false; Promise.resolve().then(() => lib.saveUserGameState(JSON.parse(JSON.stringify(save)))).catch(() => {}); } };
  const persistSoon = () => { dirtySave = true; };

  // ---- scene and world
  const scene = createScene($('cv'), cfg);
  let W = null, demo = true, touched = false, sel = 'hammer', resultsOpen = false, paidStars = null, lastLevelShown = -1, demoT = 0, tipKey = null, hardHint = null, dailyChecked = false;
  function newLevel(n, opts = {}) {
    W = WD.createWorld(cfg, n, { demo: !!opts.demo, owned: save.owned });
    demo = !!opts.demo;
    scene.setLevel(W);
    sel = 'hammer'; resultsOpen = false; paidStars = null; hardHint = null; ptr = null; // a finger from the last level does not steer this one
    toolEls.bomb.classList.remove('hint');
    $('panel').hidden = true; $('nextpill').hidden = true; $('fever').hidden = true; $('ftime').hidden = true;
    Sound.setTempo(118);
    renderTools(); renderTop();
    if (!demo && lastLevelShown !== n) { lastLevelShown = n; banner(`${T('level', n + 1)}`, 'p-mid', -60); setTimeout(() => { if (alive && W && W.n === n) banner(T(W.kind), 'p-mid', 20); }, 350); }
    setTip(demo ? 'tap' : 'find');
  }

  // ---- HUD
  const toolEls = {};
  $('tools').innerHTML = cfg.tools.map((t) => `<button class="tool gloss" data-t="${t.id}" aria-label="${t.id}"><span class="ic">${t.icon}</span><i class="cd"></i><span class="free" hidden></span><span class="lock" hidden><i class="coin"></i><b></b></span></button>`).join('');
  for (const b of $('tools').querySelectorAll('.tool')) toolEls[b.dataset.t] = b;
  $('stars').innerHTML = '<img class="st" alt=""><img class="st" alt=""><img class="st" alt="">';
  $('stars').querySelectorAll('img').forEach((i) => { i.src = STAR_SVG; });
  $('bar').innerHTML = `<b></b><i style="left:${cfg.stars.wreck1 * 100}%"></i><i style="left:${cfg.stars.wreck2 * 100}%"></i><span class="pct"></span>`;
  $('bar').querySelectorAll('i').forEach((i) => { const im = document.createElement('img'); im.src = TROPHY_SVG; im.style.width = '100%'; i.appendChild(im); });
  const shown = { coins: -1, got: -1, wreck: -1, tools: '' };
  const usable = (id) => save.owned.includes(id) || (W && (W.fever > 0 || !W.tried.has(id)));
  function renderTools() {
    for (const t of cfg.tools) {
      const el = toolEls[t.id], owned = save.owned.includes(t.id), fever = W && W.fever > 0;
      el.classList.toggle('sel', sel === t.id);
      el.classList.toggle('locked', !owned && !fever);
      const lock = el.querySelector('.lock'); lock.hidden = owned || fever; lock.querySelector('b').textContent = fmt(t.cost);
      const free = el.querySelector('.free'); free.hidden = owned || fever || !W || W.tried.has(t.id); if (free.textContent !== T('tryFree')) { free.textContent = T('tryFree'); if (!free.hidden) fitText(free, 100, 18); }
      el.classList.toggle('can', !owned && save.coins >= t.cost);
    }
  }
  function renderTop() {
    const coins = save.coins;
    if (coins !== shown.coins) { const el = $('coins'); el.querySelector('b').textContent = fmt(coins); if (shown.coins >= 0 && coins > shown.coins) { el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); } shown.coins = coins; renderTools(); }
    const got = W ? Math.min(3, W.got) : 0;
    if (got !== shown.got) { $('stars').querySelectorAll('img').forEach((im, i) => im.classList.toggle('on', i < got)); shown.got = got; }
    const wr = W ? Math.round(WD.wreck(W) * 100) : 0;
    if (wr !== shown.wreck) { const bar = $('bar'); bar.querySelector('b').style.width = wr + '%'; bar.querySelector('.pct').textContent = wr + '%'; const is = bar.querySelectorAll('i'); is[0].classList.toggle('on', wr >= cfg.stars.wreck1 * 100); is[1].classList.toggle('on', wr >= cfg.stars.wreck2 * 100); if (shown.wreck >= 0 && W && !demo) { if (shown.wreck < cfg.stars.wreck1 * 100 && wr >= cfg.stars.wreck1 * 100) starPop(); if (shown.wreck < cfg.stars.wreck2 * 100 && wr >= cfg.stars.wreck2 * 100) starPop(); } shown.wreck = wr; }
    $('langs').querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.l === lang));
  }
  const fmt = (n) => (n >= 10000 ? (Math.floor(n / 100) / 10).toFixed(n >= 100000 ? 0 : 1).replace(/\.0$/, '') + 'k' : String(n));
  function starPop() { const p = document.createElement('img'); p.src = TROPHY_SVG; p.className = 'pop trophy'; p.style.left = 'calc(var(--u)*360px)'; p.style.top = 'calc(var(--u)*600px)'; $('pops').appendChild(p); setTimeout(() => p.remove(), 950); Sound.play('star'); buzz('success'); }
  /** A word at frame point (x, y). */
  function pop(text, x, y, cls = '', color) {
    const p = document.createElement('div'); p.className = `pop out ${cls}`; p.textContent = text;
    p.style.left = `calc(var(--u)*${Math.max(110, Math.min(610, x))}px)`; p.style.top = `calc(var(--u)*${Math.max(150, Math.min(980, y))}px)`;
    if (color) p.style.color = color;
    $('pops').appendChild(p); setTimeout(() => p.remove(), 950);
    const base = cls.includes('p-big') ? 88 : cls.includes('p-mid') ? 62 : cls.includes('p-coin') ? 38 : 44; fitText(p, 690, base);
    const w = p.offsetWidth / (root.getBoundingClientRect().width / 720 || 1); // keep long words inside the frame
    if (w) p.style.left = `calc(var(--u)*${Math.max(w / 2 + 12, Math.min(708 - w / 2, x))}px)`;
  }
  const banner = (text, cls = 'p-big', dy = 0) => pop(text, 360, 560 + dy, cls);
  /** Shrinks an element's font until it is at most maxW frame units wide (long translations). */
  function fitText(el, maxW, base) {
    el.style.fontSize = ''; const k = root.getBoundingClientRect().width / 720 || 1;
    const w = el.offsetWidth / k; if (w > maxW) el.style.fontSize = `calc(var(--u)*${Math.floor(base * maxW / w)}px)`;
  }
  let coinPopT = 0;
  const coinPop = (n, x, y, z) => { if (!n || coinPopT > 0) return; coinPopT = 0.12; const [sx, sy, behind] = scene.screenOf(x, y, z); if (!behind) pop('+' + fmt(n), sx, sy - 40, 'p-coin'); };
  function setTip(k) {
    tipKey = k; const tip = $('tip'), hand = $('hand');
    tip.hidden = !k; if (k) { tip.textContent = T(k); fitText(tip, 620, 50); } // room for its pulse
    hand.hidden = !(k === 'tap' || k === 'tooHard');
  }

  // ---- input: tap/hold to smash, drag to turn, tools on tap
  const toFrame = (e) => { const r = root.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * 720, (e.clientY - r.top) / r.height * 1280]; };
  let ptr = null; // the one finger that steers {id, x, y, sx, sy, drag, t}
  function firstTouch() {
    if (!demo) return;
    // the demo becomes the real game on the level the player is at
    touched = true;
    newLevel(saveLoaded ? save.level : W.n);
  }
  function onDown(e) {
    if (mode !== 'play' || !W) return;
    if (e.target.closest && e.target.closest('button, .settings, #panel')) return;
    Sound.unlock(); $('settings').hidden = true;
    if (ptr && ptr.id !== e.pointerId) return; // a second finger is ignored
    const [x, y] = toFrame(e);
    if (demo) firstTouch();
    ptr = { id: e.pointerId, x, y, sx: x, sy: y, cx: e.clientX, cy: e.clientY, drag: false, t: performance.now() };
    if (sel === 'hammer') { const t = scene.pick(e.clientX, e.clientY); if (t) { WD.aimHammer(W, t, true); if (tipKey === 'find' || tipKey === 'tap') setTip(null); } }
    e.preventDefault();
  }
  function onMove(e) {
    if (!ptr || e.pointerId !== ptr.id || !W) return;
    const [x, y] = toFrame(e), dx = x - ptr.x;
    ptr.cx = e.clientX; ptr.cy = e.clientY;
    if (!ptr.drag && Math.hypot(x - ptr.sx, y - ptr.sy) > 26) { ptr.drag = true; WD.aimHammer(W, null); if (!save.learned.drag) { save.learned.drag = true; persistSoon(); } }
    if (ptr.drag) scene.orbit(-dx * 0.0085);
    ptr.x = x; ptr.y = y;
  }
  function onUp(e) {
    if (!ptr || e.pointerId !== ptr.id) return;
    const p = ptr; ptr = null;
    if (!W) return;
    WD.release(W);
    if (!p.drag && sel !== 'hammer') useSelected(e.clientX, e.clientY);
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
    if (mode !== 'play' || !W) return;
    Sound.unlock(); if (demo) firstTouch();
    const t = cfg.tools.find((x) => x.id === id), owned = save.owned.includes(id);
    if (!owned && !usable(id) && save.coins >= t.cost) { // buy it, only once its free try is used (and never in smash time, which lends it)
      save.coins -= t.cost; save.owned.push(id); W.owned.push(id); persist();
      Sound.play('unlock'); buzz('success'); banner(T('newTool'), 'p-mid'); pop(t.icon, 360, 700, 'p-big');
      root.appendChild(Object.assign(document.createElement('div'), { className: 'flash' })); setTimeout(() => { const f = root.querySelector('.flash'); if (f) f.remove(); }, 460);
      sel = id; renderTools(); renderTop(); return;
    }
    if (!usable(id)) { Sound.play('no'); const el = toolEls[id]; el.classList.remove('no'); void el.offsetWidth; el.classList.add('no'); return; }
    sel = sel === id && id !== 'hammer' ? 'hammer' : id; Sound.play('blip', 760); buzz('tap');
    toolEls[id].classList.remove('hint');
    renderTools();
  }
  $('tools').addEventListener('click', (e) => { const b = e.target.closest('.tool'); if (!b) return; e.stopPropagation(); try { b.blur(); } catch (er) { /* fine */ } pickTool(b.dataset.t); });
  const onCancel = (e) => { if (!ptr || e.pointerId !== ptr.id) return; ptr = null; if (W) WD.release(W); }; // a cancelled touch never fires a tool
  root.addEventListener('pointerdown', onDown); window.addEventListener('pointermove', onMove); window.addEventListener('pointerup', onUp); window.addEventListener('pointercancel', onCancel);
  const noMenu = (e) => e.preventDefault(); root.addEventListener('contextmenu', noMenu);
  const onKey = (e) => {
    if (mode !== 'play' || !W || e.type !== 'keydown') return;
    const i = '123456'.indexOf(e.key); if (i >= 0 && cfg.tools[i]) { pickTool(cfg.tools[i].id); e.preventDefault(); }
    if (e.key === 'ArrowLeft' || e.key === 'a') scene.orbit(0.25); if (e.key === 'ArrowRight' || e.key === 'd') scene.orbit(-0.25);
  };
  window.addEventListener('keydown', onKey);

  // ---- world events → sounds, words, coins
  let hitSnd = 0;
  function onEvent(e) {
    scene.event(e);
    if (e.type === 'smash') {
      const n = e.removed.length, mat = cfg.materials[(e.removed[0] || {}).m - 1] || {};
      if (e.by === 'hammer') { Sound.play(mat.snd === 'wood' || mat.snd === 'glass' || mat.snd === 'soft' ? mat.snd : mat.snd === 'metal' ? 'brick' : 'brick', 0.8); buzz('tap'); }
      else if (e.by === 'hole' || e.by === 'ball') { if ((hitSnd -= 1) <= 0) { hitSnd = 3; Sound.play('brick', 0.5); } }
      if (mat.snd === 'glass' && e.by !== 'hammer') Sound.play('glass', 0.7);
      if (e.gold) Sound.play('gem');
      if (!demo) {
        save.coins += e.coins; save.total += e.coins; save.blocks += n; persistSoon();
        coinPop(e.coins, e.x, e.y, e.z);
        if (e.word && e.by !== 'hole') { const [sx, sy] = scene.screenOf(e.x, e.y, e.z); pop(T(e.word) + (e.mult > 1 ? ` ×${e.mult}` : ''), sx, sy - 120, e.word === 'mega' ? 'p-big' : 'p-mid', e.word === 'mega' ? '#ff6ad5' : e.word === 'kaboom' ? '#ffb02e' : '#fff'); }
        else if (e.mult >= 3 && e.by === 'hammer') { const [sx, sy] = scene.screenOf(e.x, e.y, e.z); pop(`×${e.mult}`, sx + 60, sy - 90, 'p-mid', '#ffe14a'); }
        if (!dailyChecked && saveLoaded) daily();
      }
    } else if (e.type === 'swing') Sound.play('swing');
    else if (e.type === 'clang') { Sound.play('metal'); buzz('warning'); }
    else if (e.type === 'tooHard') {
      if (demo) return;
      const teach = sel === 'hammer' && usable('bomb') && !save.learned.bomb; // the first times: the tip line + hand say it
      if (!teach) { const [sx, sy] = scene.screenOf(e.x, e.y, e.z); pop(T('tooHard'), sx, sy - 100, 'p-mid', '#ffd0d0'); }
      if (sel === 'hammer' && usable('bomb')) { toolEls.bomb.classList.add('hint'); hardHint = { x: e.x, y: e.y, z: e.z, t: 4 }; if (teach) setTip('tooHard'); }
    } else if (e.type === 'boom') { Sound.play('boom', Math.min(1, e.r / 5)); buzz('thud'); }
    else if (e.type === 'throw') { Sound.play(e.shot.kind === 'rocket' ? 'rocket' : e.shot.kind === 'hole' ? 'hole' : e.shot.kind === 'meteor' ? 'meteor' : 'throwS'); toolEls.bomb.classList.remove('hint'); }
    else if (e.type === 'roll') Sound.play('roll');
    else if (e.type === 'fall') { /* the crash comes when it lands */ }
    else if (e.type === 'land') {
      Sound.play('crash', Math.min(1, e.n / 300)); buzz('thud');
      if (!demo) { save.coins += e.coins; save.total += e.coins; save.blocks += e.n; persistSoon(); const [sx, sy] = scene.screenOf(e.x, e.y, e.z); if (e.n >= 12) pop(T('crash'), sx, sy - 120, e.n > 120 ? 'p-big' : 'p-mid', '#ffb02e'); coinPop(e.coins, e.x, e.y + 1, e.z); }
    } else if (e.type === 'step') Sound.play('step');
    else if (e.type === 'treasure') { Sound.play('treasure'); buzz('success'); if (!demo) { save.coins += e.coins; save.total += e.coins; persistSoon(); banner(T('treasure'), 'p-big', -40); } }
    else if (e.type === 'star') { if (!demo) { Sound.play('star'); buzz('success'); const [sx, sy] = scene.screenOf(e.x, e.y, e.z); if (!e.chest) pop(T('star'), sx, sy - 80, 'p-mid', '#ffe14a'); persist(); } } // the chest's star: TREASURE! says it
    else if (e.type === 'fever') { Sound.play('fever'); Sound.setTempo(150); banner(T('smashTime'), 'p-big'); $('fever').hidden = false; $('ftime').hidden = false; sel = 'bomb'; renderTools(); setTip(null); }
    else if (e.type === 'clear') { $('fever').hidden = true; $('ftime').hidden = true; Sound.setTempo(118); sel = 'hammer'; renderTools(); results(); }
    else if (e.type === 'pop') { /* the look handles it */ }
  }
  function daily() {
    dailyChecked = true;
    const today = L.dayNum(new Date());
    if (!save.day) { save.day = today; persistSoon(); return; } // never on the first day
    if (L.dailyDue(save.day, today)) { save.day = today; save.coins += cfg.coins.daily; save.total += cfg.coins.daily; persist(); setTimeout(() => { if (alive) { banner(T('daily'), 'p-mid', -120); pop('+' + fmt(cfg.coins.daily), 360, 560, 'p-big', '#ffe14a'); Sound.play('unlock'); } }, 600); }
  }

  // ---- results: stars, coins, next tool, NEXT
  function results() {
    if (!W || demo) return;
    WD.aimHammer(W, null); WD.release(W); // a finger still down stops smashing behind the card
    const wr = WD.wreck(W), stars = L.starsFor(cfg, wr), cups = stars.filter(Boolean).length - 1; // trophies for wrecking 50% and 80%
    // the level bonus is paid once; later visits (after smashing more) only add the stars' difference
    const bonus = paidStars === null ? L.levelBonus(cfg, W.n, stars) : (stars.every(Boolean) && !paidStars.every(Boolean) ? L.levelBonus(cfg, W.n, stars) / 2 : 0);
    paidStars = stars;
    save.coins += bonus; save.total += bonus;
    const key = String(W.n); save.best[key] = Math.max(save.best[key] || 0, cups);
    if (save.level <= W.n) { save.level = W.n + 1; save.levels++; }
    persist(); renderTop();
    try { if (saveLoaded) lib.addPlayerScoreToLeaderboard(save.blocks).catch(() => {}); } catch (er) { /* no board here */ }
    const nt = L.nextTool(cfg, save.owned, save.coins);
    const share = typeof lib !== 'undefined' && typeof lib.share === 'function';
    $('panel').innerHTML = `<div class="card"><div class="rays"></div>
      <div class="title out">${T('clear')}</div>
      <div class="bigstars">${[0, 1, 2].map((i) => `<img src="${STAR_SVG}" class="on" style="animation-delay:${0.15 + i * 0.15}s" alt="">`).join('')}</div>
      <div class="cups"><span class="pct out">💥 ${Math.round(wr * 100)}%</span>${[1, 2].map((i) => `<img src="${TROPHY_SVG}" class="${stars[i] ? 'on' : ''}" style="animation-delay:${0.6 + i * 0.2}s" alt="">`).join('')}</div>
      <div class="stat out"><i class="coin"></i>+${fmt(W.coins + (bonus || 0))}</div>
      ${nt ? `<div class="nexttool out"><span class="hi">${nt.tool.icon}</span><i><b style="width:${Math.round(nt.have / nt.need * 100)}%"></b></i><span>${fmt(nt.have)}/${fmt(nt.need)}</span></div>` : ''}
      <div class="btns"><button id="nextBtn" class="big out">${T('next')} ${lang === 'ar' ? '◀' : '▶'}</button><button id="keepBtn" class="small out">🔨 ${T('keep')}</button>${share ? `<button id="shareBtn" class="small out">✈️</button>` : ''}</div></div>`;
    $('panel').hidden = false; resultsOpen = true; $('nextpill').hidden = true;
    Sound.play('clear'); buzz('success');
    $('nextBtn').addEventListener('click', (ev) => { ev.stopPropagation(); nextLevel(); });
    $('keepBtn').addEventListener('click', (ev) => { ev.stopPropagation(); $('panel').hidden = true; resultsOpen = false; $('nextpill').hidden = false; Sound.play('blip'); });
    if (share) $('shareBtn').addEventListener('click', (ev) => { ev.stopPropagation(); Promise.resolve().then(() => lib.share({ text: T('share') })).catch(() => {}); });
  }
  function nextLevel() { if (!W) return; Sound.unlock(); Sound.play('blip', 880); newLevel(Math.max(W.n + 1, save.level)); } // a save that came late still counts
  $('nextpill').addEventListener('click', (e) => { e.stopPropagation(); results(); });
  $('panel').addEventListener('pointerdown', (e) => e.stopPropagation());

  // ---- top bar
  let muteTouched = false;
  const blur = (e) => { try { e.currentTarget.blur(); } catch (er) { /* fine */ } };
  $('gear').addEventListener('click', (e) => { e.stopPropagation(); blur(e); Sound.unlock(); Sound.play('blip'); $('settings').hidden = !$('settings').hidden; renderTop(); });
  $('mute').addEventListener('click', (e) => { e.stopPropagation(); blur(e); muteTouched = true; Sound.unlock(); Sound.setMuted(!Sound.muted); save.muted = Sound.muted; $('mute').textContent = Sound.muted ? '🔇' : '🔊'; persist(); });
  $('langs').innerHTML = LANGS.map((l) => `<button data-l="${l}" class="gloss">${cfg.langNames[l]}</button>`).join('');
  $('langs').addEventListener('click', (e) => { e.stopPropagation(); const l = e.target.dataset && e.target.dataset.l; if (!l) return; try { e.target.blur(); } catch (er) { /* fine */ } lang = l; save.lang = l; setDir(); $('settings').hidden = true; renderTools(); renderTop(); if (tipKey) setTip(tipKey); persist(); });
  $('settings').addEventListener('pointerdown', (e) => e.stopPropagation());

  // ---- frame loop
  let fpsT = 0, fpsN = 0, slow = 0, fast = 0, quality = 1, coinTickT = 0, arrowKey = '';
  function frame(now) {
    if (!alive) return;
    raf = requestAnimationFrame(frame);
    const real = Math.min(0.1, (now - last) / 1000); last = now;
    if (document.hidden) return;
    fpsT += real; fpsN++;
    if (fpsT >= 1) { const fps = fpsN / fpsT; fpsT = 0; fpsN = 0; if (fps < 40) { slow++; fast = 0; } else if (fps > 55) { fast++; slow = 0; } if (slow >= 3 && quality > 0.7) { quality = 0.7; scene.setQuality(quality); slow = 0; } if (fast >= 6 && quality < 1) { quality = 1; scene.setQuality(quality); fast = 0; } }
    const dt = real * speed;
    coinPopT -= dt;
    if (mode === 'play' && W) {
      if (demo) { // attract: the hero smashes the fence by himself
        demoT -= dt;
        if (demoT <= 0) { demoT = 0.5; const t = demoTarget(); if (t) WD.aimHammer(W, t, false); }
      } else if (ptr && sel === 'hammer' && !ptr.drag && !resultsOpen) { // holding: keep aiming at what is under the finger
        const t = scene.pick(ptr.cx, ptr.cy); if (t) WD.aimHammer(W, t, true);
      }
      const sub = dt > 1 / 45 ? 2 : 1;
      for (let i = 0; i < sub; i++) for (const e of WD.step(W, dt / sub)) onEvent(e);
      if (W.fever > 0) $('ftime').textContent = '⏱ ' + Math.ceil(W.fever);
      // cooldown rings
      for (const t of cfg.tools) { const c = W.cool[t.id] ? W.cool[t.id] / L.cooldownOf(cfg, t.id, W.fever > 0) : 0; const el = toolEls[t.id], v = Math.round(Math.min(1, c) * 30) / 30; if (el._c !== v) { el._c = v; el.style.setProperty('--c', String(v)); } }
      if (hardHint) { hardHint.t -= dt; if (hardHint.t <= 0) { hardHint = null; toolEls.bomb.classList.remove('hint'); } }
      placeHand(); placeArrows();
      if (dirtySave && (persistT -= dt) <= 0) { persistT = 2; persist(); }
    }
    scene.update(W, mode === 'play' ? dt : real * 0.3);
    coinTickT -= dt; if (scene.coinArrive && coinTickT <= 0) { coinTickT = 0.05; Sound.play('coinS'); }
    renderTop();
  }
  function demoTarget() {
    const h = W.hero; let best = null, bd = 1e9;
    for (let y = 0; y < 3; y++) for (let z = Math.floor(h.z - 8); z < h.z; z++) for (let x = Math.floor(h.x - 5); x <= h.x + 5; x++) { if (!W.g.get(x, y, z)) continue; const d = Math.hypot(x + 0.5 - h.x, z + 0.5 - h.z); if (d < bd) { bd = d; best = { type: 'block', x, y, z, nx: 0, ny: 0, nz: 1 }; } }
    return best;
  }
  function placeHand() {
    const hand = $('hand'); if (hand.hidden) return;
    let x, y;
    if (tipKey === 'tooHard') { const r = toolEls.bomb.getBoundingClientRect(), a = root.getBoundingClientRect(); x = (r.left + r.width / 2 - a.left) / a.width * 720; y = (r.top - a.top) / a.height * 1280 - 10; }
    else { const [sx, sy] = scene.screenOf(W.hero.x, 1.5, W.hero.z - 5); x = sx; y = sy; }
    const k = `${Math.round(x / 4)},${Math.round(y / 4)}`; if (hand._k !== k) { hand._k = k; hand.style.left = `calc(var(--u)*${x}px)`; hand.style.top = `calc(var(--u)*${y}px)`; }
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
        const dx = sx - 360, dy = sy - 630, a = Math.atan2(dy, dx), k = Math.min(300 / Math.abs(Math.cos(a) || 1e-3), 280 / Math.abs(Math.sin(a) || 1e-3)); // inside y 350..910: clear of the top bar, the tip line and the tools
        list.push([Math.round(360 + Math.cos(a) * k), Math.round(630 + Math.sin(a) * k), Math.round(a * 180 / Math.PI + 90)]);
      }
    }
    const key = list.map((l) => l.map((v) => Math.round(v / 6)).join(',')).join(';');
    if (key === arrowKey) return; arrowKey = key;
    box.innerHTML = list.map(([x, y, a]) => `<div class="arrow" style="left:calc(var(--u)*${x}px);top:calc(var(--u)*${y}px);--a:${a}deg"><i></i><img src="${STAR_SVG}" alt=""></div>`).join('');
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
        const earned = save.coins, earnedTotal = save.total, blocks = save.blocks, owned = save.owned.slice(), picked = save.lang, learned = { ...save.learned }, mutedLocal = Sound.muted, levelLocal = save.level, levelsLocal = save.levels, best = { ...save.best }, dayLocal = save.day;
        const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
        save.coins = Math.max(0, num(st.coins)) + earned; save.total = num(st.total) + earnedTotal; save.blocks = num(st.blocks) + blocks;
        save.level = Math.max(num(st.level), levelLocal); save.levels = num(st.levels) + levelsLocal;
        save.owned = [...new Set(['hammer', 'bomb', ...(Array.isArray(st.owned) ? st.owned : []), ...owned])].filter((id) => cfg.tools.some((t) => t.id === id));
        save.best = { ...(st.best && typeof st.best === 'object' ? st.best : {}) }; for (const [k, v] of Object.entries(best)) save.best[k] = Math.max(num(save.best[k]), v);
        save.learned = { bomb: !!(st.learned && st.learned.bomb) || learned.bomb, drag: !!(st.learned && st.learned.drag) || learned.drag };
        save.day = Math.max(num(st.day), dayLocal);
        save.lang = picked || (LANGS.includes(st.lang) ? st.lang : null);
        if (save.lang) { lang = save.lang; setDir(); }
        save.muted = muteTouched ? mutedLocal : !!st.muted; Sound.setMuted(save.muted); $('mute').textContent = Sound.muted ? '🔇' : '🔊';
        if (W) for (const id of save.owned) if (!W.owned.includes(id)) W.owned.push(id);
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
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if (alive && tipKey) setTip(tipKey); }); // measure again with the real font
  renderTop(); renderTools();
  if (window.__load) window.__load.done();
  raf = requestAnimationFrame((t) => { last = t; frame(t); });

  return {
    destroy() {
      alive = false; cancelAnimationFrame(raf); Sound.stop();
      if (dirtySave) persist();
      root.removeEventListener('pointerdown', onDown); window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp); window.removeEventListener('pointercancel', onCancel);
      root.removeEventListener('contextmenu', noMenu); window.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', onResize); document.removeEventListener('visibilitychange', onVis);
      scene.dispose(); root.innerHTML = '';
    },
    debug: {
      get W() { return W; }, get demo() { return demo; }, get save() { return save; }, get saveLoaded() { return saveLoaded; }, get lang() { return lang; }, get sel() { return sel; }, get resultsOpen() { return resultsOpen; },
      scene, T, Sound, WD, newLevel, results, nextLevel, pickTool, onEvent, setLang(l) { lang = l; setDir(); renderTools(); renderTop(); if (tipKey) setTip(tipKey); },
      /** Client position of a frame point, for tests that touch like a finger. */
      client(x, y) { const r = root.getBoundingClientRect(); return [r.left + x / 720 * r.width, r.top + y / 1280 * r.height]; },
      get textures() { return scene.renderer.info.memory.textures; }, get geometries() { return scene.renderer.info.memory.geometries; },
    },
  };
}

const HTML = `
<canvas id="cv"></canvas>
<div id="hud" class="hud">
  <div class="top">
    <div id="coins" class="pill coins gloss"><i class="coin"></i><b>0</b></div>
    <div class="mid"><div id="stars" class="pill stars gloss"></div><div id="bar" class="bar"></div><button id="nextpill" class="nextpill out" hidden>▶▶</button></div>
    <button id="gear" class="round gloss" aria-label="settings">⚙️</button>
  </div>
  <div id="settings" class="settings gloss" hidden><button id="mute" class="round gloss" aria-label="sound">🔊</button><div id="langs" class="langs"></div></div>
  <div id="fever" class="fever" hidden></div>
  <div id="ftime" class="ftime out" hidden></div>
  <div id="arrows"></div>
  <div id="tip" class="tip out" hidden></div>
  <div id="tools" class="tools"></div>
  <div id="pops" class="pops"></div>
  <div id="hand" class="hand" hidden>👆</div>
  <div id="panel" class="panel" hidden></div>
</div>`;

window.run = run;

// Outside Astrocade (?local): stand in for the host, read the config file and start.
if (typeof location !== 'undefined' && new URLSearchParams(location.search).has('local') && !window.lib) {
  const none = async () => ({});
  const store = { state: window.__preset || null };
  window.lib = { showGameParameters() {}, log() {}, getUserGameState: async () => { if (window.__saveDelay) await new Promise((r) => setTimeout(r, window.__saveDelay)); return window.__saveFails ? Promise.reject(new Error('offline')) : { state: store.state }; },
    saveUserGameState: async (s) => { store.state = s; (window.__writes = window.__writes || []).push(s); }, addPlayerScoreToLeaderboard: none, getTopNEntriesFromLeaderboard: none,
    shouldUseTouchControls: () => matchMedia('(pointer: coarse)').matches, haptics: { play() {}, start() {}, stop() {} }, getAsset: () => undefined };
  fetch('./game_config.json').then((r) => r.json()).then((c) => { window.gameConfig = c; run(new URLSearchParams(location.search).get('mode') || 'play'); });
}
