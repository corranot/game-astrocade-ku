// PROTOTYPE - NOT FOR PRODUCTION
// Genre: local multiplayer party game, sumo / bumper brawl for kids (ages 5-12), 1 to 4 players on one screen.
// Jelly Bump Party: four jelly blobs on a round cake floating in the sea. Each player has one big button in their
// corner. A blob's aim arrow spins by itself: hold the button to stop it and charge, let go to dash and bump the
// others off the cake. The last blob on the cake wins the round and a crown; three crowns win the match.
// Playing alone, the other three are computer blobs; a friend joins any time by tapping the + on a corner.
// Rounds change the cake: plain, icy, spinning, tiny. Candy makes a blob giant, a star gives a super push.
// Coins from bumps and wins unlock hats. 7 languages follow the device.
// Modules: logic.js (rules, computer players), scene.js (3D look, Three.js r187 loaded by index.html).
/* global THREE */ // set on window by index.html before run() starts the game
import * as L from './logic.js';
import { createScene } from './scene.js';

const LANGS = ['en', 'ar', 'es', 'vi', 'hi', 'bn', 'id'];
const HAT_ICON = { party: '🎉', crown: '👑', top: '🎩', chef: '🧁', propeller: '🚁', bunny: '🐰', viking: '⚔️', halo: '😇' };
// button centres in the 720 x 1280 frame: 98 units in from each corner, on the sea the floor's round corner leaves
const SEAT_POS = [[622, 1182], [98, 98], [622, 98], [98, 1182]];
const SEAT_CSS = [['#f4473b', '#b92d23'], ['#18a5f0', '#0e73ac'], ['#57c232', '#3a8a1e'], ['#ffbe2b', '#c98b00']];
const FLIP = [false, true, true, false];
const PIP_SIDE = ['l', 'l', 'r', 'r']; // towards the middle once the seat is turned
const MEDAL = ['🥇', '🥈', '🥉', '🍩'];
const buzz = (kind) => { try { lib.haptics.play(kind); } catch (e) { /* no vibration here */ } };

// ---------------------------------------------------------------- sound: all made in code, no files to load
const Sound = (() => {
  let ctx = null, master = null, music = null, muted = false, noise = null, seq = 0, step = 0, nextT = 0;
  const holds = {};
  const ensure = () => {
    if (ctx) return ctx;
    try { ctx = new (window.AudioContext || window.webkitAudioContext)(); master = ctx.createGain(); master.gain.value = 0.8; master.connect(ctx.destination); music = ctx.createGain(); music.gain.value = 0.16; music.connect(master); } catch (e) { ctx = null; }
    if (ctx) { noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate); const d = noise.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
    return ctx;
  };
  function tone(type, f0, f1, dur, vol, at = 0, dest = master) {
    const t = ctx.currentTime + at, o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(dest); o.start(t); o.stop(t + dur + 0.02);
  }
  function hiss(f0, f1, dur, vol, type = 'bandpass', at = 0) {
    const t = ctx.currentTime + at, s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noise; f.type = type; f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(f1, t + dur); f.Q.value = 1.2;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f).connect(g).connect(master); s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.02);
  }
  const fx = {
    bump(k) { tone('sine', 180 + k * 120, 520 + k * 300, 0.16, 0.5); tone('sine', 90, 50, 0.12, 0.45); },
    rim() { tone('sine', 300, 180, 0.14, 0.25); },
    dash(p) { hiss(600, 2400 + p * 2000, 0.16 + p * 0.08, 0.22); },
    splash() { hiss(1400, 260, 0.55, 0.5, 'lowpass'); for (let i = 0; i < 4; i++) tone('sine', 500 + i * 160, 900 + i * 200, 0.06, 0.12, 0.08 + i * 0.07); },
    pop() { tone('sine', 620, 1240, 0.09, 0.35); },
    coin() { tone('triangle', 988, 988, 0.09, 0.3); tone('triangle', 1319, 1319, 0.22, 0.3, 0.08); },
    crown() { [523, 659, 784].forEach((f, i) => tone('triangle', f, f, 0.16, 0.3, i * 0.08)); },
    win() { [523, 659, 784, 1047, 784, 1047].forEach((f, i) => tone('triangle', f, f, 0.2, 0.32, i * 0.11)); },
    blip(f = 660) { tone('square', f, f, 0.07, 0.12); },
    power() { [784, 988, 1175, 1568].forEach((f, i) => tone('sine', f, f * 1.02, 0.1, 0.28, i * 0.05)); },
  };
  // a bouncy loop: bass on the beat, a marimba-ish melody, 112 bpm
  const BASS = [48, 48, 55, 55, 57, 57, 53, 53], MEL = [72, 0, 76, 79, 0, 76, 72, 0, 74, 0, 77, 81, 0, 77, 74, 0];
  const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);
  function tick() {
    if (!ctx || muted || ctx.state !== 'running') return;
    const spb = 60 / 112 / 2;
    if (nextT < ctx.currentTime) nextT = ctx.currentTime + 0.05;
    while (nextT < ctx.currentTime + 0.3) {
      const at = nextT - ctx.currentTime, s = step % 16;
      if (s % 2 === 0) tone('triangle', midi(BASS[(step >> 2) % 8] - 12), midi(BASS[(step >> 2) % 8] - 12), spb * 1.6, 0.5, at, music);
      if (MEL[s]) tone('sine', midi(MEL[s]), midi(MEL[s]), spb * 1.2, 0.32, at, music);
      if (s % 4 === 2) { const t = ctx.currentTime + at, src = ctx.createBufferSource(), g = ctx.createGain(), f = ctx.createBiquadFilter(); src.buffer = noise; f.type = 'highpass'; f.frequency.value = 6000; g.gain.setValueAtTime(0.18, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05); src.connect(f).connect(g).connect(music); src.start(t); src.stop(t + 0.06); }
      nextT += spb; step++;
    }
  }
  return {
    unlock() { ensure(); if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {}); if (ctx && !seq) seq = setInterval(tick, 100); },
    play(id, a) { if (ctx && !muted && ctx.state === 'running') fx[id](a); },
    /** A rising whine for seat s while it charges (0..1); null stops it. */
    charge(s, c) {
      if (!ctx) return;
      if (c == null || muted) { const h = holds[s]; if (h) { try { h.g.gain.setTargetAtTime(0, ctx.currentTime, 0.03); h.o.stop(ctx.currentTime + 0.15); } catch (e) { /* stopped */ } delete holds[s]; } return; }
      let h = holds[s];
      if (!h) { const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'triangle'; g.gain.value = 0.0001; o.connect(g).connect(master); o.start(); h = holds[s] = { o, g }; }
      h.o.frequency.setTargetAtTime(220 + s * 30 + c * 520, ctx.currentTime, 0.03); h.g.gain.setTargetAtTime(0.06 + c * 0.06, ctx.currentTime, 0.03);
    },
    get muted() { return muted; },
    setMuted(v) { muted = !!v; if (muted) for (const s of Object.keys(holds)) this.charge(s, null); },
    suspend(v) { if (!ctx) return; if (v) ctx.suspend().catch(() => {}); else ctx.resume().catch(() => {}); },
    stop() { clearInterval(seq); seq = 0; for (const s of Object.keys(holds)) this.charge(s, null); },
    get running() { return !!ctx && ctx.state === 'running'; },
    get whines() { return Object.keys(holds).length; },
  };
})();

let app = null, pendingMode = null;
function showRetry() {
  const root = document.getElementById('app') || document.body;
  if (window.__load) window.__load.done();
  root.innerHTML = '<button style="position:absolute;inset:0;margin:auto;width:40%;aspect-ratio:1;border-radius:50%;border:6px solid #fff;background:#f4473b;color:#fff;font-size:12vmin;cursor:pointer" aria-label="Retry">↻</button>';
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
  const setDir = () => { root.dir = lang === 'ar' ? 'rtl' : 'ltr'; root.lang = lang; };
  setDir();

  // ---- save: one slot; nothing is written until the player's own save has been read
  const save = { v: 1, coins: 0, total: 0, hats: ['party'], hat: 'party', kos: 0, wins: 0, matches: 0, lang: null, muted: false, learned: false };
  let saveLoaded = false;
  const persist = () => { if (mode === 'play' && saveLoaded) Promise.resolve().then(() => lib.saveUserGameState(JSON.parse(JSON.stringify(save)))).catch(() => {}); };

  // ---- scene
  const scene = createScene($('cv'), cfg);
  let M = null, demo = true, seed = (Date.now() & 0xffff) || 7, quality = 1;
  const ptr = new Map(), seatDown = [0, 0, 0, 0];
  let pendingHat = null, resultTimer = 0, touched = false, rumbling = false, roundWords = null, stopT = 0, slowT = 0;
  const stopRumble = () => { rumbling = false; try { lib.haptics.stop(); } catch (er) { /* none */ } };

  function newMatch(humans, opts = {}) {
    for (let s = 0; s < 4; s++) Sound.charge(s, null);
    M = L.createMatch(cfg, L.rng(seed++), humans, opts);
    demo = !!opts.demo;
    scene.setTheme(M.mod); scene.setHat(0, save.hat);
    for (let s = 1; s < 4; s++) scene.setHat(s, null);
    // fingers already down keep holding in the new match
    for (let s = 0; s < 4; s++) if (seatDown[s] > 0 && M.blobs[s].human) L.setHold(M, s, true);
    renderSeats(); $('panel').hidden = true; resultTimer = 0; touched = false; stopRumble();
  }
  const humans = () => (M ? M.blobs.filter((b) => b.human).map((b) => b.seat) : []);

  // ---- HUD
  for (let s = 0; s < 4; s++) {
    const el = document.createElement('div');
    el.className = 'seat' + (FLIP[s] ? ' flip' : ''); el.id = 'seat' + s; el.dataset.seat = s;
    el.style.left = `calc(var(--u)*${SEAT_POS[s][0]}px)`; el.style.top = `calc(var(--u)*${SEAT_POS[s][1]}px)`;
    el.style.setProperty('--c', SEAT_CSS[s][0]); el.style.setProperty('--d', SEAT_CSS[s][1]);
    el.innerHTML = `<div class="pips ${PIP_SIDE[s]}">${'<i class="pip">👑</i>'.repeat(3)}</div><div class="tip out ${PIP_SIDE[s]}" hidden></div><button class="pad" aria-label="player ${s + 1}"><span class="ic"></span></button><button class="join" aria-label="join"><b>+</b><span></span></button>`;
    $('seats').appendChild(el);
  }
  function renderSeats() {
    for (let s = 0; s < 4; s++) {
      const el = $('seat' + s), b = M && M.blobs[s], human = !!(b && b.human);
      el.classList.toggle('cpu', !human);
      el.querySelector('.ic').textContent = human ? '💥' : '🤖';
      el.querySelector('.join span').textContent = T('join');
      el.querySelectorAll('.pip').forEach((p, i) => p.classList.toggle('on', !!b && !demo && b.crowns > i));
    }
    renderTips();
  }
  function renderTips() {
    const red = $('seat0').querySelector('.tip');
    const showTap = demo, showHold = !demo && !save.learned && M && M.blobs[0].human && M.round <= 3;
    red.hidden = !(showTap || showHold); red.textContent = showTap ? T('tap') : T('hold'); red.classList.toggle('demo', showTap);
    for (let s = 0; s < 4; s++) $('seat' + s).querySelector('.join').classList.toggle('nojoin', demo); // the demo: any touch makes you red
    const hand = $('hand'); hand.hidden = !demo;
    if (demo) { hand.style.left = `calc(var(--u)*${SEAT_POS[0][0] - 30}px)`; hand.style.top = `calc(var(--u)*${SEAT_POS[0][1] - 10}px)`; }
  }
  function renderTop() {
    $('bag').querySelector('b').textContent = save.coins;
    const n = L.nextHat(cfg, save.hats, save.total), nx = $('next');
    nx.hidden = !n;
    $('langs').querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.l === lang));
    if (n) { nx.querySelector('.hi').textContent = HAT_ICON[n.hat.id]; nx.querySelector('b').style.width = Math.round(n.have / n.need * 100) + '%'; }
    $('hatBtn').textContent = HAT_ICON[save.hat] || '🎉';
  }
  /** A word at frame point (x, y); turned for a top seat's players. */
  function pop(text, x, y, cls = '', flip = false, color) {
    const p = document.createElement('div'); p.className = `pop out ${cls}${flip ? ' flip' : ''}`; p.textContent = text;
    p.style.left = `calc(var(--u)*${Math.max(130, Math.min(590, x))}px)`; p.style.top = `calc(var(--u)*${y}px)`;
    if (color) p.style.color = color;
    $('pops').appendChild(p); setTimeout(() => p.remove(), 1050);
    const w = p.offsetWidth / (root.getBoundingClientRect().width / 720 || 1); // keep long words inside the frame
    if (w) p.style.left = `calc(var(--u)*${Math.max(w / 2 + 12, Math.min(708 - w / 2, x))}px)`;
  }
  /** A word for everyone: in the middle, and turned for the top players when someone sits there. */
  function banner(text, cls = 'p-big', dy = 0) {
    const top = M && (M.blobs[1].human || M.blobs[2].human);
    pop(text, 360, (top ? 760 : 640) + dy, cls);
    if (top) pop(text, 360, 520 - dy, cls, true);
  }
  /** A word over a blob, turned towards the player it is meant for (by default that blob's own player). */
  const popAtBlob = (seat, text, cls = '', color, forSeat = seat) => { const b = M.blobs[seat], [x, y] = scene.screenOf(b.x, b.z); pop(text, x, y - 70, cls, FLIP[forSeat] && M.blobs[forSeat].human, color); };

  // ---- input: every finger belongs to one seat until it lifts
  const toFrame = (e) => { const r = root.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * 720, (e.clientY - r.top) / r.height * 1280]; };
  function seatFor(x, y, e) {
    if (demo) return { seat: 0, join: true }; // the first touch anywhere, any corner too, makes the player red
    const join = e.target.closest && e.target.closest('.join, .pad');
    if (join) { const s = Number(join.closest('.seat').dataset.seat); return { seat: s, join: !M.blobs[s].human }; }
    for (let s = 0; s < 4; s++) if (Math.hypot(x - SEAT_POS[s][0], y - SEAT_POS[s][1]) < 110) return { seat: s, join: !M.blobs[s].human };
    const q = (x > 360 ? 1 : 0) + (y > 640 ? 2 : 0), qs2 = [1, 2, 3, 0][q]; // quadrant → seat
    const hs = humans();
    if (M.blobs[qs2].human) return { seat: qs2 };
    if (hs.length <= 1) return { seat: hs[0] != null ? hs[0] : 0, join: !hs.length };
    let best = hs[0], bd = 1e9; for (const s of hs) { const d = Math.hypot(x - SEAT_POS[s][0], y - SEAT_POS[s][1]); if (d < bd) { bd = d; best = s; } }
    return { seat: best };
  }
  function join(seat) {
    if (!demo && (M.phase === 'done' || !$('panel').hidden)) return false; // the match is decided: no taking over its result
    if (demo) { newMatch([seat], { easy: save.matches === 0, firstGo: 0 }); }
    else { const b = M.blobs[seat]; b.human = true; b.kos0 = b.kos; b.crowns0 = b.crowns; renderSeats(); }
    root.appendChild(Object.assign(document.createElement('div'), { className: 'flash' }));
    setTimeout(() => { const f = root.querySelector('.flash'); if (f) f.remove(); }, 460);
    Sound.play('crown'); buzz('success');
    return true;
  }
  function onDown(e) {
    if (mode !== 'play' || !M) return;
    if (e.target.closest && e.target.closest('.bag, .settings, #panel')) return;
    if (ptr.has(e.pointerId)) onUp(e); // its pointerup never came: let go before taking it again
    $('settings').hidden = true; Sound.unlock(); touched = true;
    const [x, y] = toFrame(e), s = seatFor(x, y, e);
    if (s.join && !join(s.seat)) return;
    ptr.set(e.pointerId, s.seat);
    if (seatDown[s.seat]++ === 0) { L.setHold(M, s.seat, true); $('seat' + s.seat).querySelector('.pad').classList.add('down'); }
    e.preventDefault();
  }
  function onUp(e) {
    const s = ptr.get(e.pointerId); if (s == null) return;
    ptr.delete(e.pointerId);
    if (--seatDown[s] <= 0) { seatDown[s] = 0; if (M) L.setHold(M, s, false); $('seat' + s).querySelector('.pad').classList.remove('down'); Sound.charge(s, null); try { lib.haptics.stop(); } catch (er) { /* none */ } }
  }
  const noMenu = (e) => e.preventDefault();
  root.addEventListener('pointerdown', onDown); window.addEventListener('pointerup', onUp); window.addEventListener('pointercancel', onUp);
  root.addEventListener('contextmenu', noMenu);
  const keys = { ' ': 0, Enter: 0, a: 3, l: 0, q: 1, p: 2 }; // keyboard: space/enter/L red, A yellow, Q blue, P green
  const kdown = [false, false, false, false];
  const onKey = (e) => { if (mode !== 'play' || !M || !(e.key in keys)) return; e.preventDefault(); if (e.repeat) return; const s = demo ? 0 : keys[e.key]; const down = e.type === 'keydown'; Sound.unlock();
    if (down && !kdown[s]) { if (!M.blobs[s].human && !join(s)) return; touched = true; kdown[s] = true; if (seatDown[s]++ === 0) L.setHold(M, s, true); }
    else if (!down && kdown[s]) { kdown[s] = false; if (seatDown[s] > 0 && --seatDown[s] === 0) { L.setHold(M, s, false); Sound.charge(s, null); } } };
  window.addEventListener('keydown', onKey); window.addEventListener('keyup', onKey);

  // ---- events from the rules → words, sounds, effects, coins
  function onEvent(e) {
    scene.event(e, M);
    const human = (s) => s >= 0 && M.blobs[s].human;
    if (e.type === 'bump') { const k = Math.min(1, e.force / 14); Sound.play('bump', k); if (k > 0.7 && !demo) stopT = 0.06; if (human(e.a) || human(e.b)) buzz(k > 0.6 ? 'thud' : 'tap'); if (human(e.a) && k > 0.55) popAtBlob(e.b, T('bump'), 'p-mid', undefined, e.a); }
    else if (e.type === 'rim') Sound.play('rim');
    else if (e.type === 'dash') { Sound.play('dash', e.power); Sound.charge(e.seat, null); }
    else if (e.type === 'out') { if (M.blobs.filter((b) => !b.out).length <= 1) { slowT = 0.7; scene.focusOn(e.x, e.z, 0.9); } Sound.play('splash'); popAtBlob(e.seat, T('out'), 'p-mid', SEAT_CSS[e.seat][0]); if (human(e.seat)) { buzz('thud'); Sound.charge(e.seat, null); } if (human(e.by) && !demo) setTimeout(() => { if (alive) Sound.play('coin'); }, 250); }
    else if (e.type === 'power') { Sound.play('power'); popAtBlob(e.seat, T(e.kind), 'p-mid'); if (human(e.seat)) buzz('success'); }
    else if (e.type === 'item') Sound.play('pop');
    else if (e.type === 'shrink') { if (!demo) { banner(T('hurry'), 'p-mid'); if (humans().length) buzz('warning'); } }
    else if (e.type === 'go') { if (!demo) { banner(T('go')); Sound.play('blip', 990); } }
    else if (e.type === 'round') { scene.setTheme(e.mod); for (let s = 0; s < 4; s++) if (seatDown[s] > 0 && M.blobs[s].human) L.setHold(M, s, true); if (!demo) { roundWords = [T('round', e.n), e.mod !== 'cake' ? T(e.mod) : null]; banner(roundWords[0]); if (roundWords[1]) setTimeout(() => { if (alive) banner(roundWords[1], 'p-mid', 105); }, 350); Sound.play('blip'); } renderSeats(); }
    else if (e.type === 'roundEnd') {
      stopRumble(); for (let s = 0; s < 4; s++) Sound.charge(s, null);
      if (e.winner >= 0) { scene.confetti(e.winner); if (!demo) { Sound.play(e.done ? 'win' : 'crown'); popAtBlob(e.winner, '👑', 'p-big'); if (human(e.winner)) buzz('success'); } }
      else if (!demo) banner(T('draw'), 'p-mid');
      renderSeats();
      if (e.done && !demo) setTimeout(() => { if (alive && M && M.phase === 'done') results(); }, 900);
    }
  }

  function results() {
    const st = L.standings(M), hs = humans(), solo = hs.length === 1 && hs[0] === 0;
    // a seat that joined mid-match is paid only for what it did after joining
    const mine = (b) => ({ kos: b.kos - (b.kos0 || 0), crowns: b.crowns - (b.crowns0 || 0) });
    let earned = 0; for (const s of hs) earned += L.coinsFor(cfg, mine(M.blobs[s]), M.matchWinner === s);
    for (const s of hs) save.kos += mine(M.blobs[s]).kos;
    save.coins += earned; save.total += earned; save.matches++; if (hs.includes(M.matchWinner)) save.wins++;
    const before = save.hats.slice();
    for (const h of cfg.hats) if (save.total >= h.cost && !save.hats.includes(h.id)) save.hats.push(h.id);
    const fresh = save.hats.filter((h) => !before.includes(h));
    if (fresh.length) { save.hat = fresh[fresh.length - 1]; pendingHat = save.hat; }
    const freshIcons = fresh.map((h) => HAT_ICON[h]).join('');
    if (save.matches >= 1 && M.blobs[0].human) save.learned = save.learned || save.matches >= 2;
    persist(); renderTop();
    try { if (saveLoaded && hs.length) lib.addPlayerScoreToLeaderboard(save.kos).catch(() => {}); } catch (er) { /* no board here */ }
    const title = solo ? (M.matchWinner === 0 ? T('youWin') : `${T('wins')}`) : T('wins');
    const winC = SEAT_CSS[M.matchWinner];
    const rows = st.map(({ seat, place }) => { const b = M.blobs[seat]; return `<div class="row" style="--c:${SEAT_CSS[seat][0]};--d:${SEAT_CSS[seat][1]}"><span class="medal">${MEDAL[place - 1]}</span><i class="dot"></i><span class="who">${b.human ? '😀' : '🤖'}</span><span class="sp"></span><span class="cr">${'👑'.repeat(b.crowns)}</span></div>`; }).join('');
    const share = typeof lib !== 'undefined' && typeof lib.share === 'function';
    $('panel').innerHTML = `<div class="card"><div class="rays"></div>
      <div class="title out" style="color:${solo && M.matchWinner === 0 ? '#ffe14a' : winC[0]}">${title}</div>
      <div class="rows">${rows}</div>
      ${earned ? `<div class="earn out"><i class="coin"></i>+${earned}</div>` : ''}
      ${pendingHat ? `<div class="newhat out"><span class="hi">${freshIcons}</span>${T('newHat')}</div>` : ''}
      <div class="btns"><button id="again" class="big out">${T('again')}<i class="tm"></i></button>${share ? `<button id="shareBtn" class="share out">${T('share')} ✈️</button>` : ''}</div></div>`;
    $('panel').hidden = false; resultTimer = 8;
    if (M.matchWinner === 0 && solo) buzz('success');
    $('again').addEventListener('click', (ev) => { ev.stopPropagation(); touched = true; again(); });
    if (share) $('shareBtn').addEventListener('click', (ev) => { ev.stopPropagation(); Promise.resolve().then(() => lib.share({ text: 'Play Jelly Bump Party with me! Up to 4 players on one screen.' })).catch(() => {}); });
  }
  function again() {
    if (!M) return; Sound.unlock(); Sound.play('pop');
    const hs = humans(); newMatch(hs.length ? hs : [0], { firstGo: cfg.match.go });
    if (pendingHat) { const h = pendingHat; pendingHat = null; setTimeout(() => { if (alive && M) { popAtBlob(0, T('newHat'), 'p-mid', '#ffe14a'); scene.confetti(0); Sound.play('power'); } }, 300); scene.setHat(0, h); }
  }

  // ---- top bar
  let muteTouched = false, hatTouched = false;
  const blur = (e) => { try { e.currentTarget.blur(); } catch (er) { /* fine */ } };
  $('bag').addEventListener('click', (e) => { e.stopPropagation(); blur(e); Sound.unlock(); Sound.play('pop'); $('settings').hidden = !$('settings').hidden; renderTop(); });
  $('mute').addEventListener('click', (e) => { e.stopPropagation(); blur(e); muteTouched = true; Sound.unlock(); Sound.setMuted(!Sound.muted); save.muted = Sound.muted; $('mute').textContent = Sound.muted ? '🔇' : '🔊'; persist(); });
  $('langs').innerHTML = LANGS.map((l) => `<button data-l="${l}" class="gloss">${cfg.langNames[l]}</button>`).join('');
  $('langs').addEventListener('click', (e) => { e.stopPropagation(); const l = e.target.dataset && e.target.dataset.l; if (!l) return; try { e.target.blur(); } catch (er) { /* fine */ } lang = l; save.lang = l; setDir(); $('settings').hidden = true; renderSeats(); renderTop(); persist(); });
  $('hatBtn').addEventListener('click', (e) => { e.stopPropagation(); blur(e); hatTouched = true; Sound.unlock(); const i = save.hats.indexOf(save.hat); save.hat = save.hats[(i + 1) % save.hats.length]; scene.setHat(0, save.hat); renderTop(); Sound.play('pop'); persist(); });
  $('panel').addEventListener('pointerdown', (e) => e.stopPropagation());

  // ---- frame loop
  const pads = [0, 1, 2, 3].map((s) => $('seat' + s).querySelector('.pad')), shownCharge = [-1, -1, -1, -1];
  let fpsT = 0, fpsN = 0, slow = 0, fast = 0;
  function frame(now) {
    if (!alive) return;
    raf = requestAnimationFrame(frame);
    const real = Math.min(0.11, (now - last) / 1000); last = now;
    if (document.hidden) return;
    // quality: a slow phone drops resolution and half the particles, and gets them back when it recovers
    fpsT += real; fpsN++;
    if (fpsT >= 1) { const fps = fpsN / fpsT; fpsT = 0; fpsN = 0; if (fps < 40) { slow++; fast = 0; } else if (fps > 55) { fast++; slow = 0; } if (slow >= 3 && quality > 0.7) { quality = 0.7; scene.setQuality(quality); slow = 0; } if (fast >= 6 && quality < 1) { quality = 1; scene.setQuality(quality); fast = 0; } }
    // hit-stop on a hard bump, slow motion as a round's last blob falls
    if (stopT > 0) stopT -= real; if (slowT > 0) slowT -= real;
    const dt = real * speed * (stopT > 0 ? 0.05 : slowT > 0 ? 0.35 : 1);
    if (mode === 'play' && M) {
      const sub = dt > 1 / 50 ? 2 : 1;
      for (let i = 0; i < sub; i++) for (const e of L.step(M, dt / sub)) onEvent(e);
      for (let s = 0; s < 4; s++) {
        const b = M.blobs[s], c = b.holding ? b.holdT / cfg.blob.chargeTime : 0;
        const cr = Math.round(c * 50) / 50; if (cr !== shownCharge[s]) { shownCharge[s] = cr; pads[s].style.setProperty('--charge', String(cr)); }
        if (b.human && b.holding && M.phase === 'play' && !b.out) { Sound.charge(s, c); if (s === 0 || humans().length === 1) { rumbling = true; try { lib.haptics.start({ intensity: 0.15 + c * 0.45, sharpness: 0.3 }); } catch (er) { /* none */ } } }
        else { Sound.charge(s, null); if (rumbling && (s === 0 || humans().length === 1)) stopRumble(); }
        if (b.human && b.holding && c > 0.6 && !save.learned) { save.learned = true; renderTips(); }
      }
      if (M.phase === 'play' && M.s < M.s0 && Math.random() < dt * 6) scene.crumbs(M);
      if (demo && M.phase === 'done' && M.timer <= 0) newMatch([], { demo: true, firstGo: 0 });
      if (!demo && M.phase === 'done' && !$('panel').hidden) {
        resultTimer -= dt;
        const tm = $('panel').querySelector('.tm'); if (tm) tm.style.transform = `scaleX(${Math.max(0, resultTimer / 8)})`;
        // nobody touched the whole match and its result: back to the demo instead of playing on alone
        if (resultTimer <= 0) { if (touched) again(); else newMatch([], { demo: true, firstGo: 0 }); }
      }
    }
    scene.update(M, mode === 'play' ? dt : real * 0.4);
  }

  function fit() { const r = root.getBoundingClientRect(); root.style.setProperty('--u', String(r.width / 720)); scene.resize(r.width, r.height); }
  const onResize = () => fit();
  window.addEventListener('resize', onResize);
  const onVis = () => { Sound.suspend(document.hidden); };
  document.addEventListener('visibilitychange', onVis);

  try {
    lib.showGameParameters({ name: 'Jelly Bump Party', params: {
      'Crowns to win': { key: 'match.crowns', type: 'slider', min: 1, max: 7, step: 1 },
      'Dash power': { key: 'blob.dashMax', type: 'slider', min: 8, max: 20, step: 0.5 },
      'Aim spin speed': { key: 'blob.spin', type: 'slider', min: 1, max: 5, step: 0.1 },
      'Floor shrinks after (s)': { key: 'arena.shrinkAt', type: 'slider', min: 3, max: 30, step: 1 },
      'Computer reaction (s)': { key: 'cpu.react', type: 'slider', min: 0.2, max: 1.5, step: 0.05 },
      'Coins per knock-out': { key: 'coins.ko', type: 'slider', min: 0, max: 10, step: 1 },
    } });
  } catch (e) { /* host without a settings panel */ }

  if (mode === 'edit') {
    // a still showcase: the four blobs on the cake, nothing moves or counts
    M = L.createMatch(cfg, L.rng(3), [], { demo: true }); demo = true; scene.setHat(0, save.hat); $('hud').classList.add('edit'); renderSeats();
  } else {
    newMatch([], { demo: true, firstGo: 0 });
    const read = (tries) => Promise.resolve().then(() => lib.getUserGameState()).then((r) => {
      if (!alive) return;
      const st = r && r.state;
      if (st && typeof st === 'object') {
        const earned = save.coins, earnedTotal = save.total, kos = save.kos, wins = save.wins, matches = save.matches, hatsBefore = save.hats.slice(), picked = save.lang, hatLocal = save.hat, hatPicked = hatTouched || save.hat !== 'party', learned = save.learned, mutedLocal = Sound.muted;
        Object.assign(save, st);
        const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
        save.coins = num(st.coins) + earned; save.total = num(st.total) + earnedTotal; save.kos = num(st.kos) + kos; save.wins = num(st.wins) + wins; save.matches = num(st.matches) + matches;
        save.hats = [...new Set([...(Array.isArray(st.hats) ? st.hats : []), ...hatsBefore])].filter((h) => cfg.hats.some((x) => x.id === h));
        if (!save.hats.includes('party')) save.hats.unshift('party');
        if (hatPicked) save.hat = hatLocal;
        if (!save.hats.includes(save.hat)) save.hat = 'party';
        save.learned = !!st.learned || learned;
        if (picked) save.lang = picked;
        if (save.lang && LANGS.includes(save.lang)) { lang = save.lang; setDir(); }
        if (muteTouched) save.muted = mutedLocal; Sound.setMuted(!!save.muted); $('mute').textContent = Sound.muted ? '🔇' : '🔊';
        scene.setHat(0, pendingHat || save.hat);
      }
      saveLoaded = true; renderTop(); renderSeats();
      if (save.matches || save.coins) persist();
    }).catch(() => { if (alive) setTimeout(() => read(tries + 1), Math.min(10000, 1500 * (tries + 1))); /* keep trying; never write blind */ });
    read(0);
  }
  fit(); renderTop(); renderSeats();
  if (window.__load) window.__load.done();
  raf = requestAnimationFrame((t) => { last = t; frame(t); });

  return {
    destroy() {
      alive = false; cancelAnimationFrame(raf); Sound.stop(); stopRumble();
      root.removeEventListener('pointerdown', onDown); window.removeEventListener('pointerup', onUp); window.removeEventListener('pointercancel', onUp);
      root.removeEventListener('contextmenu', noMenu); window.removeEventListener('keydown', onKey); window.removeEventListener('keyup', onKey);
      window.removeEventListener('resize', onResize); document.removeEventListener('visibilitychange', onVis);
      scene.dispose(); root.innerHTML = '';
    },
    debug: {
      get M() { return M; }, get demo() { return demo; }, get save() { return save; }, get saveLoaded() { return saveLoaded; }, get lang() { return lang; },
      scene, T, Sound, newMatch, results, again, onEvent, get touched() { return touched; }, setLang(l) { lang = l; setDir(); renderSeats(); renderTop(); },
      /** Client position of a frame point, for tests that touch like a finger. */
      client(x, y) { const r = root.getBoundingClientRect(); return [r.left + x / 720 * r.width, r.top + y / 1280 * r.height]; },
      seatPos: SEAT_POS, get textures() { return scene.renderer.info.memory.textures; }, get geometries() { return scene.renderer.info.memory.geometries; },
    },
  };
}

const HTML = `
<canvas id="cv"></canvas>
<div id="hud" class="hud">
  <button id="bag" class="bag gloss" aria-label="coins and settings"><i class="coin"></i><b>0</b></button>
  <div id="settings" class="settings gloss" hidden><div id="next" class="next"><span class="hi"></span><i><b></b></i></div><div class="row1"><button id="hatBtn" class="round gloss" aria-label="hat">🎉</button><button id="mute" class="round gloss" aria-label="sound">🔊</button></div><div id="langs" class="langs"></div></div>
  <div id="seats"></div>
  <div id="pops" class="pops"></div>
  <div id="hand" class="hand" hidden>👆</div>
  <div id="panel" class="panel" hidden></div>
</div>`;

window.run = run;

// Outside Astrocade (?local): stand in for the host, read the config file and start.
if (typeof location !== 'undefined' && new URLSearchParams(location.search).has('local') && !window.lib) {
  const none = async () => ({});
  const store = { state: window.__preset || null };
  window.lib = { showGameParameters() {}, log() {}, getUserGameState: async () => (window.__saveFails ? Promise.reject(new Error('offline')) : { state: store.state }),
    saveUserGameState: async (s) => { store.state = s; (window.__writes = window.__writes || []).push(s); }, addPlayerScoreToLeaderboard: none, getTopNEntriesFromLeaderboard: none,
    shouldUseTouchControls: () => matchMedia('(pointer: coarse)').matches, haptics: { play() {}, start() {}, stop() {} }, getAsset: () => undefined };
  fetch('./game_config.json').then((r) => r.json()).then((c) => { window.gameConfig = c; run(new URLSearchParams(location.search).get('mode') || 'play'); });
}
