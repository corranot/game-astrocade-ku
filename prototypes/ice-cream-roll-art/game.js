// PROTOTYPE - NOT FOR PRODUCTION
// Genre: step-by-step food maker / rolled ice cream ASMR for kids (ages 5-12), one finger.
// Ice Cream Roll Art: pour the milk on an ice-cold steel plate, add and chop fruit, spread it thin, draw on it with
// syrup, freeze it, then scrape it into real spiral rolls that carry your drawing inside, stand them in a cup, add
// toppings and serve cute animal customers for stars and coins. Coins unlock flavours, fruit, toppings and syrups.
// Modules: logic.js (rules), roll.js (spiral math), sheet.js (the painted cream sheet), scene.js (the 3D stall).
/* global THREE */ // Three.js r187, loaded by index.html (import map) and set on window before run()
import * as R from './logic.js';
import { createSheet, RECT, stencilPath } from './sheet.js';
import { createScene, PW } from './scene.js';
import { spiralTheta } from './roll.js';

const LANGS = ['en', 'ar', 'es', 'vi', 'hi', 'bn', 'id'];
const FULL = ['pour', 'fruit', 'chop', 'spread', 'draw', 'freeze', 'roll', 'cup', 'topping', 'serve'];
const HOOK = ['roll', 'cup', 'topping', 'serve'];
const STEP_ICONS = { pour: '🥛', fruit: '🍓', chop: '🔪', spread: '🌀', draw: '🎨', freeze: '❄️', roll: '🍥', topping: '🍒' };
const buzz = (kind) => { try { lib.haptics.play(kind); } catch (e) { /* no vibration here */ } };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// ---------------------------------------------------------------- sound: recorded ASMR clips, synthesised stand-ins
const Sound = (() => {
  let ctx = null, master = null, muted = false, noise = null; const buf = {}, gain = {}; let asked = false;
  const ensure = () => { if (ctx) return ctx; try { ctx = new (window.AudioContext || window.webkitAudioContext)(); master = ctx.createGain(); master.gain.value = 0.7; master.connect(ctx.destination); } catch (e) { ctx = null; } return ctx; };
  function load(cfg) {
    if (asked || !ctx) return; asked = true;
    for (const [id, [skip, peak]] of Object.entries(cfg.sounds || {})) {
      gain[id] = { skip, k: Math.pow(10, (-3 - peak) / 20) };
      let a = null; try { a = lib.getAsset(id); } catch (e) { /* no asset map */ }
      if (!a || !a.url) continue;
      fetch(a.url).then((r) => r.arrayBuffer()).then((d) => ctx.decodeAudioData(d)).then((b) => { buf[id] = b; }).catch(() => { /* stays synthesised */ });
    }
  }
  function synth(kind) {
    if (!ctx) return; const t = ctx.currentTime;
    if (!noise) { noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate); const d = noise.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
    const o = ctx.createOscillator(), g = ctx.createGain(); o.connect(g).connect(master);
    const f = { sfx_pop: [520, 900, 0.09], sfx_coin: [988, 1480, 0.18], sfx_win: [523, 1046, 0.5], sfx_chop: [180, 90, 0.06] }[kind] || [300, 200, 0.08];
    o.type = kind === 'sfx_coin' || kind === 'sfx_win' ? 'triangle' : 'sine'; o.frequency.setValueAtTime(f[0], t); o.frequency.exponentialRampToValueAtTime(f[1], t + f[2]);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.25, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + f[2] + 0.05); o.start(t); o.stop(t + f[2] + 0.08);
  }
  /** Play clip id once at volume vol and speed rate. */
  function play(id, vol = 0.6, rate = 1) {
    if (!ctx || muted) return;
    if (!buf[id]) { synth(id); return; }
    const s = ctx.createBufferSource(), g = ctx.createGain(); s.buffer = buf[id]; s.playbackRate.value = rate * (0.94 + Math.random() * 0.12);
    g.gain.value = vol * (gain[id] ? gain[id].k : 1); s.connect(g).connect(master); s.start(0, gain[id] ? gain[id].skip : 0);
  }
  /** A looping clip that runs while `on` is true; returns a setter. */
  function loop(id, vol = 0.5) {
    let src = null, g = null;
    return (on) => {
      if (on && !src && ctx && !muted && buf[id]) { src = ctx.createBufferSource(); g = ctx.createGain(); src.buffer = buf[id]; src.loop = true; src.loopStart = gain[id] ? gain[id].skip : 0; g.gain.value = vol * (gain[id] ? gain[id].k : 1); src.connect(g).connect(master); src.start(0, src.loopStart); }
      else if ((!on || muted) && src) { try { g.gain.setTargetAtTime(0, ctx.currentTime, 0.04); src.stop(ctx.currentTime + 0.2); } catch (e) { /* already stopped */ } src = null; }
    };
  }
  return {
    unlock(cfg) { ensure(); if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {}); load(cfg); },
    play, loop, get muted() { return muted; }, setMuted(v) { muted = !!v; },
    suspend(v) { if (!ctx) return; if (v) ctx.suspend().catch(() => {}); else ctx.resume().catch(() => {}); },
    get ready() { return Object.keys(buf).length; },
  };
})();

let app = null, pendingMode = null;
function showRetry() {
  const root = document.getElementById('app') || document.body;
  if (window.__load) window.__load.done();
  root.innerHTML = '<button style="position:absolute;inset:0;margin:auto;width:40%;aspect-ratio:1;border-radius:50%;border:6px solid #5b2a4a;background:#ff6fa8;color:#fff;font-size:12vmin;cursor:pointer" aria-label="Retry">↻</button>';
  root.querySelector('button').onclick = () => location.reload();
}
function run(mode) {
  // the host may call run() before Three.js has arrived from the CDN: start as soon as it is there
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
  if (window.__load) window.__load.step(70);
  const root = document.getElementById('app') || document.body;
  root.innerHTML = HTML;
  const $ = (id) => root.querySelector('#' + id);
  const qs = new URLSearchParams(location.search);
  const speed = Number(qs.get('speed')) || 1;
  let alive = true, raf = 0, last = performance.now();

  // ---- language
  let lang = R.detectLang(typeof navigator !== 'undefined' ? navigator.languages || [navigator.language] : [], LANGS);
  const T = (k) => ((cfg.strings[lang] || {})[k] || cfg.strings.en[k] || k);
  const setDir = () => { root.dir = lang === 'ar' ? 'rtl' : 'ltr'; root.lang = lang; };
  setDir();

  // ---- save (one slot, read before any write)
  const save = { coins: 0, cups: 0, owned: [], learned: {}, lastDaily: 0, lang: null, muted: false, shelf: [], cupStyle: 'pink', todayDone: 0 };
  const snaps = []; // photos of this session's cups (the save keeps only the recipes)
  let saveLoaded = false;
  const persist = () => { if (mode === 'play' && saveLoaded) Promise.resolve().then(() => lib.saveUserGameState(JSON.parse(JSON.stringify(save)))).catch(() => {}); };
  const postScore = () => { if (mode === 'play' && saveLoaded) Promise.resolve().then(() => lib.addPlayerScoreToLeaderboard(save.cups)).catch(() => {}); };

  // ---- scene
  const sheet = createSheet();
  const scene = createScene($('cv'), cfg, sheet);
  const thumbs = scene.thumbs();
  const custImg = {};
  for (const id of cfg.customers) { let a = null; try { a = lib.getAsset(id); } catch (e) { /* none */ } if (a && a.url) custImg[id] = a.url; }
  { let a = null; try { a = lib.getAsset('shop_bg'); } catch (e) { /* none */ } if (a && a.url) $('shop').style.backgroundImage = `url("${a.url}")`; }

  // ---- state
  const rng = R.mulberry32((Date.now() & 0xffff) || 1);
  let S = null;
  const loops = { pour: Sound.loop('sfx_pour', 0.55), freeze: Sound.loop('sfx_freeze', 0.6) };
  const syrupById = Object.fromEntries(cfg.syrups.map((s) => [s.id, s]));
  const fruitById = Object.fromEntries(cfg.fruits.map((f) => [f.id, f]));
  const baseById = Object.fromEntries(cfg.bases.map((b) => [b.id, b]));
  const owned = (list, id) => { const it = (cfg[list] || []).find((x) => x.id === id); return !!it && (!it.cost || save.owned.includes(id) || (S && S.trial.includes(id))); };

  function newCup() {
    const n = save.cups, today = R.dayNum(new Date());
    let order = R.makeOrder(cfg, save.owned, n, rng);
    // once a day (from the third cup, never on a VIP cup) the order is today's special, the same for everyone
    if (saveLoaded && n >= 2 && !order.special && (Number(save.todayDone) || 0) < today) order = R.dailyOrder(cfg, today);
    S = {
      n, order, steps: n === 0 ? HOOK : FULL, si: 0, step: null, t: 0, idle: 0, busy: false, trial: [],
      made: { base: order.base, fruits: [], pour: 0, cover: 0, rolls: 1, toppings: [], art: null },
      pouring: false, at: null, chopT: 0, combo: 0, syrup: cfg.syrups[0].id, stencil: null, drawing: false, freezing: false,
      lane: null, rolled: 0, hops: [], show: 0, served: false, result: null, scrapeT: 0, squeezeT: 0, fleck: null, mix: null,
      tune: R.tuned(cfg, save.learned, n), style: null,
    };
    applyStyle(save.cupStyle);
    sheet.reset(n + 1); scene.clearFruit(); scene.clearLanes(); scene.clearToppings();
    // the cup comes out when the rolls are ready for it
    scene.cup.visible = false; scene.cup.position.copy(scene.cupHome); scene.cup.rotation.set(0, 0, 0); scene.cup.scale.setScalar(1);
    scene.frostMat.opacity = 0; scene.creamMat.roughness = 0.32; scene.pose('plate'); scene.orbit(false);
    for (const t of [scene.jug, scene.stream, scene.spatA, scene.spatB, scene.scraper, scene.bottle]) t.visible = false;
    if (n === 0) {
      const col = R.creamColour(cfg, 'strawberry', ['strawberry']);
      sheet.preset(col, fruitById.strawberry.flesh, syrupById.chocsyrup.color, 'heart'); S.creamCol = col;
      S.made = { base: 'strawberry', fruits: ['strawberry', 'strawberry', 'strawberry'], pour: 1, cover: 1, rolls: 1, toppings: [], art: 'heart' };
      scene.frostMat.opacity = 0.15; scene.creamMat.roughness = 0.8;
    }
    $('panel').hidden = true;
    renderOrder(); setMood(0); go(0);
    if (order.special) { pop(T(order.special), 'gold'); Sound.play('sfx_coin', 0.5, 1.2); }
  }
  /** Paint the cup with a style (a free try counts for this cup only). */
  function applyStyle(id) {
    const st = (cfg.cupStyles || []).find((c) => c.id === id) || (cfg.cupStyles || [])[0];
    if (!st || (S && S.style === st.id)) return;
    if (S) S.style = st.id; scene.paintStripes(st.cols);
  }

  // ---------------------------------------------------------------- steps
  function go(i) {
    S.si = i; S.step = S.steps[i]; S.t = 0; S.idle = 0; S.busy = false; S.wait = undefined; S.slow = false;
    // a finger still down from the last step starts nothing in this one
    S.pouring = S.spreading = S.drawing = S.freezing = S.holdBtn = false; S.lane = null; sheet.lift(); loops.pour(false); loops.freeze(false);
    if (window.__trace) window.__trace.push([S.n, S.step, Math.round(performance.now()), new Error().stack.split('\n')[2].trim()]);
    hideHint(); $('bar').hidden = true; $('action').hidden = true; $('hold').hidden = true; setTray([]);
    for (const t of [scene.jug, scene.stream, scene.spatA, scene.spatB, scene.scraper, scene.bottle]) t.visible = false;
    renderSteps(); renderOrder();
    const st = S.step;
    banner(st === 'serve' ? '' : T(st));
    if (st === 'pour') { setTray(cfg.bases.map((b) => ({ id: b.id, list: 'bases', html: bottleIcon(b.color), on: b.id === S.made.base }))); scene.jug.visible = true; jugColour(); showBar(0); }
    if (st === 'fruit') setTray(trayList('fruits').map((f) => ({ id: f.id, list: 'fruits', img: thumbs[f.id] })));
    if (st === 'chop') { scene.spatA.visible = scene.spatB.visible = true; }
    if (st === 'spread') { S.mix = S.creamCol = R.creamColour(cfg, S.made.base, S.made.fruits); S.fleck = (fruitById[S.made.fruits[0]] || cfg.fruits[0]).flesh; scene.spatA.visible = true; scene.spatB.visible = false; showBar(0); }
    if (st === 'draw') {
      // start with the syrup that stands out most on this cream
      S.syrup = R.bestSyrup(cfg, S.mix || R.creamColour(cfg, S.made.base, S.made.fruits), cfg.syrups.filter((x) => owned('syrups', x.id)).map((x) => x.id), S.made.base === 'chocolate' ? ['chocsyrup'] : []);
      setTray([...cfg.syrups.map((s) => ({ id: s.id, list: 'syrups', html: dropIcon(s.color), on: s.id === S.syrup })), ...cfg.stencils.map((id) => ({ id, list: 'stencils', html: stencilIcon(id) }))]);
      showAction(T('done'), () => go(S.si + 1)); scene.bottle.visible = true; bottleColour();
    }
    if (st === 'freeze') { $('hold').hidden = false; showBar(0); }
    if (st === 'roll') { scene.spatA.visible = scene.spatB.visible = false; scene.buildLanes(); scene.cup.visible = true; S.cupIn = 0; S.stand = []; }
    if (st === 'cup') { startCup(); setMood(3); }
    if (st === 'topping') { setTray(trayList('toppings').map((t) => ({ id: t.id, list: 'toppings', img: thumbs['t_' + t.id] }))); }
    if (st === 'serve') startServe();
  }
  const next = (delay = 0.5) => { S.busy = true; S.wait = delay; };
  /** What a tray shows: everything the player can use, then the cheapest locked ones as teasers, six at most. */
  function trayList(list) {
    const all = cfg[list] || [], open = all.filter((it) => owned(list, it.id)), shut = all.filter((it) => !owned(list, it.id)).sort((a, b) => a.cost - b.cost);
    return [...open, ...shut.slice(0, Math.max(0, 6 - open.length))];
  }

  /** Pop a big word at eye level (centre of the plate area). */
  function pop(text, cls = '') {
    // one big word at a time: a new one replaces what is still showing (two overlapping words read as garbage)
    for (const old of [...$('pops').children]) if (!old.classList.contains('small') || cls !== 'small') old.remove();
    const el = document.createElement('div'); el.className = 'pop out ' + cls; el.textContent = text; $('pops').appendChild(el);
    const len = [...text].length; if (len > 11) el.style.fontSize = `calc(var(--u)*${Math.max(34, Math.round((cls === 'small' ? 50 : 76) * 11 / len))}px)`;
    setTimeout(() => el.remove(), 1100);
  }

  // ---------------------------------------------------------------- input
  let pid = null;
  function down(e) {
    if (mode !== 'play' || !S) return;
    Sound.unlock(cfg);
    if (e.target && e.target.closest && e.target.closest('button')) return; // buttons keep their own click (no capture)
    if (pid !== null && e.pointerId !== pid) return; // one finger at a time
    pid = e.pointerId; try { root.setPointerCapture(e.pointerId); } catch (err) { /* synthetic */ }
    S.idle = 0; hideHint();
    const p = scene.pick(e.clientX, e.clientY); S.at = p;
    const on = p && p.u > 0.02 && p.u < 0.98 && p.v > 0.02 && p.v < 0.98;
    const st = S.step;
    if (S.busy) return;
    if (st === 'pour' && on) S.pouring = true;
    if (st === 'chop' && on) chop(p);
    if (st === 'spread' && on) { S.spreading = true; spreadAt(p); }
    if (st === 'draw' && on && !S.stencil) { S.drawing = true; sheet.lift(); drawAt(p); }
    if (st === 'freeze' && on) S.freezing = true;
    if (st === 'roll' && on) grabLane(p);
  }
  function move(e) {
    if (e.pointerId !== pid || !S) return;
    const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
    for (const ev of evs.length ? evs : [e]) {
      const p = scene.pick(ev.clientX, ev.clientY); if (!p) continue; S.at = p;
      if (S.spreading) spreadAt(p);
      if (S.drawing) drawAt(p);
      if (S.lane) dragLane(p);
    }
    S.idle = 0;
  }
  function up(e) {
    if (e.pointerId !== pid) return; pid = null;
    if (!S) return;
    if (S.pouring) { S.pouring = false; endPour(); }
    if (S.spreading) { S.spreading = false; sheet.lift(); }
    if (S.drawing) { S.drawing = false; sheet.lift(); }
    S.freezing = false;
    if (S.lane) { S.lane.auto = true; S.lane = null; }
  }

  // ---- pour
  function jugColour() { const c = baseById[S.made.base].color; scene.jug.userData.liquid.material.color.set(c); scene.stream.material.color.set(c); }
  function updatePour(dt) {
    const pouring = S.pouring && !S.busy && S.at;
    loops.pour(pouring);
    const target = S.at ? { u: clamp(S.at.u, 0.25, 0.75), v: clamp(S.at.v, 0.25, 0.75) } : { u: 0.5, v: 0.5 };
    const wp = scene.uvToWorld(target.u, target.v);
    const jug = scene.jug; const tilt = pouring ? -1.15 : -0.25;
    jug.rotation.z += (tilt - jug.rotation.z) * Math.min(1, dt * 10);
    const goal = new THREE.Vector3(wp.x - 0.7, pouring ? 1.05 : 1.25, wp.z + 0.25);
    jug.position.lerp(goal, Math.min(1, dt * 12));
    jug.userData.liquid.scale.y = Math.max(0.15, 1 - S.made.pour / cfg.pour.max);
    if (pouring) {
      S.made.pour = Math.min(cfg.pour.max, S.made.pour + S.tune.pourRate * dt);
      const rad = cfg.pour.blob + cfg.pour.blobGrow * Math.min(1, S.made.pour);
      sheet.pourAt(target.u + (Math.random() - 0.5) * 0.02, target.v + (Math.random() - 0.5) * 0.02, baseById[S.made.base].color, rad);
      sheet.compose();
      jug.updateMatrixWorld();
      const spout = jug.localToWorld(new THREE.Vector3(0.5, 0.86, 0)); const end = new THREE.Vector3(wp.x, 0.02, wp.z);
      const mid = spout.clone().add(end).multiplyScalar(0.5), len = spout.distanceTo(end);
      scene.stream.visible = true; scene.stream.position.copy(mid); scene.stream.scale.set(1 + Math.sin(S.t * 30) * 0.08, len, 1);
      scene.stream.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), spout.clone().sub(end).normalize());
      showBar(S.made.pour / cfg.pour.max);
      if (S.made.pour >= cfg.pour.max) { S.pouring = false; endPour(); }
    } else scene.stream.visible = false;
  }
  function endPour() {
    scene.stream.visible = false; loops.pour(false);
    const p = S.made.pour, b = cfg.pour.band;
    if (p < b[0]) { if (p > 0.05) pop(T('more')); return; }
    if (p <= b[1]) { pop(T('perfect'), 'gold'); buzz('success'); Sound.play('sfx_coin', 0.4); scene.sparkle(new THREE.Vector3(0, 0.3, 0), 16); react(2, '✨'); }
    else { pop(T('tooMuch')); buzz('tick'); react(2, '😮'); }
    learn('pour'); next(0.7);
  }

  // ---- fruit
  function slotUV(k, n) {
    if (n === 3) return [[0.36, 0.42], [0.64, 0.42], [0.5, 0.64]][k];
    return [[0.37, 0.4], [0.63, 0.4], [0.37, 0.63], [0.63, 0.63]][k] || [0.5, 0.5];
  }
  const totalPieces = () => S.order.fruits.length * R.piecesFor(S.order);
  function addFruit(id) {
    const n = totalPieces(); if (S.made.fruits.length >= n) return;
    const [u, v] = slotUV(S.made.fruits.length, n);
    scene.dropFruit(id, u, v); S.made.fruits.push(id); if (S.made.fruits.length === 1) react(3, '😋');
    Sound.play('sfx_pop', 0.6, 0.9 + S.made.fruits.length * 0.08); buzz('tap');
    renderOrder();
    if (S.made.fruits.length >= n) { learn('fruit'); next(0.9); }
  }

  // ---- chop
  function chop(p) {
    const left = scene.placed.filter((f) => !f.burst && f.y <= 0.001); if (!left.length) return;
    let best = left[0], bd = 1e9; for (const f of left) { const d = (f.u - p.u) ** 2 + (f.v - p.v) ** 2; if (d < bd) { bd = d; best = f; } }
    best.hits++; best.sq = 1; S.chopT = 0.18; S.chopAt = best; S.chopSide = !S.chopSide; S.combo++;
    Sound.play('sfx_chop', 0.7, 0.9 + Math.random() * 0.25); buzz('tap');
    const f = fruitById[best.id]; const wp = scene.uvToWorld(best.u, best.v);
    scene.spawnChunks(wp, [f.flesh, f.cream], 2);
    if (best.hits >= S.tune.chopHits) {
      best.burst = true; best.m.visible = false;
      scene.spawnChunks(wp, [f.flesh, f.cream, '#ffffff'], 16); sheet.splat(best.u, best.v, f.cream, 0.07); sheet.compose();
      scene.sparkle(wp.clone().setY(0.3), 6); Sound.play('sfx_pop', 0.5, 0.8); react(1, '');
    }
    if (S.combo % 3 === 0) pop(T('chopWord') + ' ×' + S.combo, 'small');
    if (scene.placed.every((x) => x.burst)) { learn('chop'); pop(T('great'), 'gold'); buzz('success'); next(0.7); }
  }
  function updateChop(dt) {
    S.chopT = Math.max(0, S.chopT - dt);
    const tgt = S.chopAt || scene.placed.find((f) => !f.burst) || { u: 0.5, v: 0.5 };
    const wp = scene.uvToWorld(tgt.u, tgt.v);
    const k = S.chopT / 0.18, lift = (s) => (s ? 0.05 + (1 - k) * 0.5 : 0.55 + Math.sin(S.t * 6) * 0.04);
    for (const [sp, side] of [[scene.spatA, true], [scene.spatB, false]]) {
      const hitting = S.chopT > 0 && S.chopSide === side;
      sp.position.set(wp.x + (side ? -0.32 : 0.32), hitting ? lift(true) : lift(false), wp.z + 0.32);
      sp.rotation.set(0.25, side ? 0.5 : -0.5, side ? -1.25 : 1.25);
    }
  }

  // ---- spread
  function spreadAt(p) {
    if (S.step !== 'spread') return;
    const cov = sheet.spreadAt(p.u, p.v, S.mix, S.fleck, cfg.spread.brush);
    const wp = scene.uvToWorld(p.u, p.v); scene.absorbChunks(wp.x, wp.z, cfg.spread.brush * PW * 1.3);
    S.made.cover = cov; showBar(cov / S.tune.spreadDone);
    if (S.scrapeT <= 0) { Sound.play('sfx_scrape', 0.25, 1.2); S.scrapeT = 0.28; }
    if (cov >= S.tune.spreadDone && !S.busy) finishSpread();
  }
  function finishSpread() {
    sheet.finishSpread(S.mix, S.fleck); scene.absorbChunks(0, 0, 99); sheet.compose(); S.made.cover = 1; showBar(1);
    pop(T('perfect'), 'gold'); buzz('success'); scene.sparkle(new THREE.Vector3(0, 0.2, 0), 18); learn('spread'); react(2, '👍'); next(0.6);
  }
  function updateSpread(dt) {
    S.scrapeT -= dt;
    const p = S.at || { u: 0.5, v: 0.6 }; const wp = scene.uvToWorld(p.u, p.v);
    const sp = scene.spatA; const y = S.spreading ? 0.03 : 0.35;
    sp.position.lerp(new THREE.Vector3(wp.x, y, wp.z + 0.3), Math.min(1, dt * 18)); sp.rotation.set(0.35, 0, 0);
    if (scene.chunkCount) sheet.compose();
    // kids who keep going get there: after a while most-covered counts as done
    if (!S.busy && S.t > 14 && S.made.cover > 0.6) finishSpread();
  }

  // ---- draw
  function bottleColour() { const c = syrupById[S.syrup].color; scene.bottle.userData.body.material.color.set(c === 'rainbow' ? '#ff6fd0' : c); }
  function drawAt(p) {
    sheet.strokeTo(p.u, p.v, syrupById[S.syrup].color); sheet.compose();
    if (!S.made.art) S.made.art = 'free';
    if (S.squeezeT <= 0) { Sound.play('sfx_squeeze', 0.3); S.squeezeT = 0.35; }
  }
  function updateDraw(dt) {
    S.squeezeT -= dt;
    let tgt = S.at;
    if (S.stencil) {
      S.stencil.t += dt / 1.1;
      sheet.stencil(S.stencil.id, syrupById[S.syrup].color, S.stencil.t); sheet.compose();
      const pts = stencilPath(S.stencil.id), q = pts[Math.min(pts.length - 1, Math.floor(pts.length * Math.min(1, S.stencil.t)))];
      tgt = { u: 0.5 + q[0] * 0.3, v: 0.5 + q[1] * 0.3 };
      if (S.stencil.t >= 1) { S.stencil = null; pop(T('great'), 'gold'); scene.sparkle(new THREE.Vector3(0, 0.2, 0), 10); react(2, '💖'); }
    }
    const wp = scene.uvToWorld((tgt || { u: 0.75 }).u, (tgt || { v: 0.75 }).v);
    const low = S.drawing || S.stencil;
    scene.bottle.position.lerp(new THREE.Vector3(wp.x, low ? 0.03 : 0.5, wp.z), Math.min(1, dt * 20));
    scene.bottle.rotation.set(0.25, 0, 0);
  }
  function useStencil(id) {
    if (S.stencil) return;
    sheet.clearArt(); S.stencil = { id, t: 0 }; S.made.art = id; Sound.play('sfx_squeeze', 0.5); buzz('tap'); learn('draw');
  }

  // ---- freeze
  function updateFreeze(dt) {
    const on = (S.freezing || S.holdBtn) && !S.busy;
    loops.freeze(on);
    if (on) {
      const f = Math.min(1, sheet.freeze + dt / S.tune.freezeTime);
      sheet.setFreeze(f); sheet.compose(); showBar(f);
      scene.frostMat.opacity = 0.22 * f; scene.creamMat.roughness = 0.32 + 0.5 * f;
      if (Math.random() < dt * 24) { const a = Math.random() * Math.PI * 2; scene.fog(new THREE.Vector3(Math.cos(a) * 1.8, 0.1, Math.sin(a) * 1.8)); }
      if (Math.random() < dt * 6) buzz('tick');
      if (f >= 1) { loops.freeze(false); pop(T('frozen'), 'blue'); buzz('success'); Sound.play('sfx_pop', 0.5, 1.3); scene.sparkle(new THREE.Vector3(0, 0.3, 0), 18, [0xffffff, 0xbfe9ff, 0x8fd8ff]); learn('freeze'); react(2, '❄️'); next(0.6); }
    }
  }

  // ---- roll
  function laneAt(p) {
    if (p.v < RECT.v0 - 0.05 || p.v > RECT.v1 + 0.08) return null;
    const i = Math.floor(((p.u - RECT.u0) / (RECT.u1 - RECT.u0)) * scene.lanes.length);
    return scene.lanes[clamp(i, 0, scene.lanes.length - 1)];
  }
  function grabLane(p) {
    let ln = laneAt(p);
    if (!ln || ln.done || ln.auto) ln = scene.lanes.find((l) => !l.done && !l.auto && Math.abs(l.x - scene.uvToWorld(p.u, p.v).x) < scene.laneW * 1.2) || null;
    if (!ln) return;
    S.lane = ln; ln.grab = (RECT.v1 - p.v) * PW - ln.p; ln.target = Math.max(ln.target || 0, ln.p); buzz('tap');
  }
  function dragLane(p) {
    const ln = S.lane; const want = clamp((RECT.v1 - p.v) * PW - Math.max(0, ln.grab), 0, scene.L);
    ln.target = Math.max(ln.target || 0, want);
  }
  /** Move a lane's scraper to p: shavings fly, the scrape sound follows the speed, a tick for every full turn. */
  function advance(ln, p, dt) {
    const dp = p - ln.p; if (dp <= 0) return;
    const RA = cfg.roll.inner, RB = cfg.roll.thick / (2 * Math.PI);
    const turns0 = Math.floor(spiralTheta(ln.p, RA, RB) / (2 * Math.PI));
    scene.setLane(ln, p);
    const z = (RECT.v1 - 0.5) * PW - p;
    for (let i = 0, n = Math.min(4, Math.round(dp * 18 + Math.random())); i < n; i++) scene.shave(new THREE.Vector3(ln.x + (Math.random() - 0.5) * scene.laneW, 0.06, z), Math.random() < 0.5 ? 0xffffff : (S.creamCol || '#ffd1e6'));
    if (Math.floor(spiralTheta(p, RA, RB) / (2 * Math.PI)) > turns0) buzz('tick');
    const speedNow = dp / Math.max(dt, 1 / 240);
    if (S.scrapeT <= 0) { Sound.play('sfx_scrape', 0.4 + Math.min(0.3, speedNow * 0.06), 0.85 + Math.min(0.5, speedNow * 0.12)); S.scrapeT = 0.26; }
  }
  function updateRoll(dt) {
    S.scrapeT -= dt;
    let shown = null;
    // before the first touch the first lane curls and uncurls by itself, so the screen is alive at once
    if (S.n === 0 && !S.touched && scene.lanes[0] && !scene.lanes[0].done && !scene.lanes[0].auto && scene.lanes[0].p <= scene.L * 0.31) {
      const ln = scene.lanes[0]; scene.setLane(ln, scene.L * 0.3 * (0.5 - 0.5 * Math.cos(S.t * 1.7))); shown = ln; S.attract = true;
      if (Math.random() < dt * 3) { const a = Math.random() * Math.PI * 2; scene.fog(new THREE.Vector3(Math.cos(a) * 1.9, 0.1, Math.sin(a) * 1.9)); }
    } else if (S.attract) { S.attract = false; const l0 = scene.lanes[0]; if (!l0.done && !l0.auto && S.lane !== l0 && l0.p <= scene.L * 0.31) scene.setLane(l0, 0); }
    for (const ln of scene.lanes) {
      if (ln.done) continue;
      if (ln.auto) advance(ln, Math.min(scene.L, Math.max(ln.p + cfg.roll.speed * dt, ln.target || 0)), dt);
      else if (ln.target > ln.p) advance(ln, ln.p + (ln.target - ln.p) * Math.min(1, dt * cfg.roll.follow), dt);
      // the last roll goes slow-motion with the camera leaning in
      if (S.rolled === scene.lanes.length - 1 && ln.p > scene.L * 0.55 && !S.slowDone) { if (!S.slow) scene.pose('last'); S.slow = true; }
      if (ln === S.lane || ln.auto) shown = ln;
      if (ln.p >= scene.L - 1e-4) {
        ln.done = true; ln.auto = false; if (S.lane === ln) S.lane = null; S.rolled++;
        scene.liftLane(ln); scene.sparkle(ln.pivot.position.clone(), 10); S.stand.push({ pv: ln.pivot, t: 0, y0: ln.pivot.position.y }); Sound.play('sfx_pop', 0.6, 1 + S.rolled * 0.1); buzz('success');
        pop(S.rolled === scene.lanes.length ? T('perfect') : ['', T('great'), T('yummy'), T('great')][S.rolled % 4] || T('great'), S.rolled === scene.lanes.length ? 'gold' : 'small');
        react(1, S.rolled === scene.lanes.length ? '😍' : '');
        if (S.rolled === scene.lanes.length) { learn('roll'); S.slow = false; S.slowDone = true; S.busy = true; S.peek = 0; }
      }
    }
    // a finished roll hops up and stands on its end, spiral to the sky
    for (const st of S.stand) {
      if (st.t >= 1) continue; st.t = Math.min(1, st.t + dt * 3.2); const e = 1 - Math.pow(1 - st.t, 3);
      st.pv.rotation.set(0, 0, e * Math.PI / 2, 'YXZ'); st.pv.position.y = st.y0 + (scene.laneW * 0.48 - st.y0 + 0.008) * e + Math.sin(st.t * Math.PI) * 0.45;
    }
    // all rolled: a close look at the spirals (the drawing is inside), then on to the cup
    if (S.peek !== undefined) {
      const t0 = S.peek; S.peek += dt;
      if (t0 < 0.35 && S.peek >= 0.35) { scene.pose('peek'); banner(''); hideHint(); pop(T('look'), 'gold'); buzz('success'); }
      if (t0 < 1.9 && S.peek >= 1.9) { scene.pose('plate'); S.peek = undefined; next(0.35); }
    }
    S.cupIn = Math.min(1, (S.cupIn || 0) + dt * 2.5); { const e = S.cupIn; scene.cup.scale.setScalar(Math.max(0.01, e < 1 ? e * (1 + Math.sin(e * Math.PI) * 0.25) : 1)); }
    const sc = scene.scraper;
    if (shown) { sc.visible = true; const z0 = (RECT.v1 - 0.5) * PW; sc.position.set(shown.x, 0.03, z0 - shown.p + 0.47); sc.rotation.set(0.3, 0, 0); }
    else sc.visible = false;
  }

  // ---- cup
  function startCup() {
    scene.scraper.visible = false;
    const cup = scene.cup; cup.visible = true; S.cupPop = 0;
    const n = scene.lanes.length;
    S.hops = scene.lanes.filter((ln) => ln.pivot).map((ln, k) => ({ ln, k, t: -0.35 - k * 0.28, from: ln.pivot.position.clone(), r0: ln.pivot.rotation.clone(), landed: false }));
    S.hopN = n;
  }
  function updateCup(dt) {
    const cup = scene.cup; S.cupPop = Math.min(1, S.cupPop + dt * 3);
    cup.scale.setScalar(1 + Math.sin(S.cupPop * Math.PI) * 0.12);
    let done = true;
    for (const h of S.hops) {
      if (h.landed) continue; done = false;
      h.t += dt / 0.55; if (h.t < 0) continue;
      const t = Math.min(1, h.t), sl = cup.localToWorld(scene.slot(h.k, S.hopN).add(new THREE.Vector3(0, scene.laneW * 0.48, 0)));
      const p = h.from.clone().lerp(sl, t); p.y += Math.sin(t * Math.PI) * 1.3;
      const pv = h.ln.pivot; pv.position.copy(p); pv.rotation.set(0, t * Math.PI * 2 + h.k * 0.6 * t, Math.PI / 2, 'YXZ');
      if (t >= 1) {
        h.landed = true; cup.attach(pv); pv.scale.set(1.15, 0.85, 1.15); h.sq = 1;
        Sound.play('sfx_pop', 0.6, 1.1 + h.k * 0.08); buzz('tap'); scene.sparkle(sl.clone(), 6);
      }
    }
    for (const h of S.hops) if (h.landed && h.sq > 0) { h.sq = Math.max(0, h.sq - dt * 5); h.ln.pivot.scale.set(1 + h.sq * 0.15, 1 - h.sq * 0.15, 1 + h.sq * 0.15); }
    if (done && !S.busy) { pop(T('yummy'), 'gold'); scene.shake(0.35); scene.pose('cup'); next(0.7); }
  }

  // ---- toppings
  function addTop(id) {
    if (S.made.toppings.includes(id)) { buzz('tick'); return; }
    S.made.toppings.push(id); scene.addTopping(id, S.made.fruits[0] || 'strawberry');
    Sound.play({ whip: 'sfx_whip', choco: 'sfx_squeeze', berrysauce: 'sfx_squeeze', sprinkles: 'sfx_sprinkle' }[id] || 'sfx_pop', 0.6); buzz('tap');
    renderOrder(); learn('topping');
    showAction(T('serve'), () => go(S.si + 1));
  }

  // ---- serve and rating
  function startServe() {
    hideHint(); banner(''); setTray([]); S.show = 0; S.result = R.scoreCup(cfg, S.order, S.made);
    scene.pose('show'); scene.orbit(true); setMood(2); pop(T('yummy'), 'gold'); Sound.play('sfx_win', 0.6); buzz('success');
    scene.sparkle(scene.cup.localToWorld(new THREE.Vector3(0, 1, 0)), 30); scene.shake(0.3);
  }
  function updateServe(dt) {
    S.show += dt; const cup = scene.cup;
    cup.rotation.y += dt * 1.4;
    if (S.show > 0.4 && S.show < 1.6 && Math.random() < dt * 5) scene.sparkle(cup.localToWorld(new THREE.Vector3(0, 1.1, 0)), 8);
    if (S.show > 0.9 && !S.snapped) {
      // a photo for the shelf, with a camera flash
      S.snapped = true; try { snaps.unshift({ img: scene.snapshot(), s: S.result.stars }); snaps.length = Math.min(snaps.length, 8); } catch (e) { /* no photo this time */ }
      const fl = document.createElement('div'); fl.className = 'flash'; $('hud').appendChild(fl); setTimeout(() => fl.remove(), 450); Sound.play('sfx_pop', 0.5, 1.7);
    }
    if (S.show > 1.3 && !S.backOut) { S.backOut = true; scene.orbit(false); scene.pose('cup'); }
    if (S.show > 1.9) {
      // the cup flies to the customer and shrinks, drawn in front of them
      const k = clamp((S.show - 1.9) / 0.7, 0, 1), e = k * k * (3 - 2 * k);
      if (!S.flyTo) { const r = root.querySelector('#cust').getBoundingClientRect(), c = root.getBoundingClientRect(); S.flyTo = scene.worldAt((r.left + r.width / 2 - c.left) / c.width, (r.top + r.height * 0.6 - c.top) / c.height, 4.5); }
      cup.position.lerpVectors(scene.cupHome, S.flyTo, e); cup.scale.setScalar(1 - e * 0.75);
      if (k >= 1 && !S.served) { S.served = true; cup.visible = false; react(1, '😋'); buzz('success'); Sound.play('sfx_pop', 0.6, 0.8); finishCup(); }
    }
  }
  function finishCup() {
    const res = S.result, drew = !!S.made.art;
    const coins = R.coinsFor(cfg, res.stars, drew && S.n > 0, S.order.special);
    save.coins += coins; save.cups += 1;
    if (S.order.special === 'today') save.todayDone = Math.max(Number(save.todayDone) || 0, R.dayNum(new Date()));
    save.shelf = [...(save.shelf || []), { b: S.made.base, f: S.made.fruits[0], s: res.stars, a: S.made.art, c: S.style }].slice(-24);
    if (snaps[0] && S.snapped) snaps[0].saved = true;
    persist(); postScore();
    // a short beat for the customer to enjoy it before the card comes up
    const cupNow = S; setTimeout(() => { if (alive && S === cupNow) showRating(res, coins); }, 550);
  }
  function showRating(res, coins) {
    S.ratingUp = true; const p = $('panel'); p.hidden = false;
    const cell = custCell(S.order.customer, 1);
    p.innerHTML = `<div class="card"><div class="rays"></div><div class="face" style="${cell}"></div>
      <div class="stars">${[0, 1, 2].map((i) => `<span class="star ${i < res.stars ? 'on' : ''}" style="animation-delay:${0.15 + i * 0.22}s">★</span>`).join('')}</div>
      <div class="parts${S.order.fruits.length + S.order.toppings.length + (S.order.art ? 1 : 0) + 3 > 7 ? ' many' : ''}">${partsHtml(res.parts)}</div>
      <div class="earn out"><i class="coin"></i>+<b id="earnN">0</b></div>
      <button id="nextBtn" class="big gloss out">${T('next')} ▶</button></div>`;
    for (let i = 0; i < res.stars; i++) setTimeout(() => { if (alive) { Sound.play('sfx_coin', 0.5, 1 + i * 0.15); buzz('tick'); } }, 250 + i * 220);
    let shown = 0; const step = () => { if (!alive || $('panel').hidden) return; shown = Math.min(coins, shown + Math.ceil(coins / 12)); const el = $('earnN'); if (el) el.textContent = shown; if (shown < coins) setTimeout(step, 50); };
    setTimeout(step, 600);
    renderCoins();
    let gone = false; const goOn = () => { if (gone || !alive) return; gone = true; afterRating(); };
    $('nextBtn').addEventListener('click', (e) => { e.stopPropagation(); goOn(); });
    // the card moves on by itself, so play never stops at a menu (the 30-second mark counts)
    const cupNow = S; setTimeout(() => { if (S === cupNow && !$('panel').hidden && $('nextBtn')) goOn(); }, (cfg.ratingAutoNext || 6) * 1000);
  }
  /** One round icon per thing the customer checks, with a tick or a cross. */
  // the customer's own order, item by item (the topping they asked for, not a generic icon): what was right, what was missed
  function partsHtml(pt) {
    const o = S.order, got = new Set(S.made.toppings), img = (src) => `<img src="${src}" alt="">`;
    const each = (S.result && S.result.fruitEach) || {};
    const list = [[bottleIcon(baseById[o.base].color), Math.min(pt.base, pt.pour)], ...o.fruits.map((f) => [img(thumbs[f]), each[f] === undefined ? pt.fruit : each[f]]), ['🌀', pt.spread], ['🍥', pt.rolls],
      ...o.toppings.map((t) => [img(thumbs['t_' + t]), got.has(t) ? 1 : 0])];
    if (o.art) list.push([stencilIcon(o.art), pt.art]);
    return list.map(([ic, v]) => `<span class="part ${v >= 0.85 ? 'ok' : 'no'}">${ic}<i>${v >= 0.85 ? '✓' : '✗'}</i></span>`).join('');
  }
  function afterRating() {
    // gift box every few cups, daily gift once per day after the first cup, then the next cup at once
    if (R.giftDue(save.cups, cfg.gift.every) && !S.giftShown) { S.giftShown = true; return showGift(R.giftContent(cfg, save.owned), T('gift')); }
    const today = R.dayNum(new Date());
    // the daily gift waits for the save: its day mark lives there (a late read must not pay it twice)
    if (saveLoaded && R.dailyDue(today, save.lastDaily, save.cups, cfg.coins.dailyFrom || 1) && !S.dailyShown) { S.dailyShown = true; save.lastDaily = today; return showGift({ kind: 'coins', amount: cfg.coins.daily }, T('daily')); }
    const first = S.n === 0;
    newCup();
    if (first) pop(T('makeOwn'), 'gold');
  }
  function showGift(g, title) {
    // paid now, in the same save as its day mark: closing before it is opened loses nothing
    if (g.kind === 'item') { if (!save.owned.includes(g.id)) save.owned.push(g.id); } else save.coins += g.amount;
    persist();
    const p = $('panel'); p.hidden = false;
    p.innerHTML = `<div class="card"><div class="rays"></div><div class="gtitle out">${title}</div><button id="giftBox" class="giftbox" aria-label="gift">🎁</button><div class="tap out">${T('tapOpen')}</div></div>`;
    let opened = false;
    const open = () => {
      if (opened || !alive) return; opened = true; Sound.play('sfx_win', 0.5); buzz('success');
      const inner = g.kind === 'item' ? itemIcon(g.list, g.id) : `<span class="earn out"><i class="coin"></i>+${g.amount}</span>`;
      renderCoins();
      p.querySelector('.card').innerHTML = `<div class="rays"></div><div class="gtitle out">${g.kind === 'item' ? T('new') : title}</div><div class="prize">${inner}</div><button id="nextBtn" class="big gloss out">${T('next')} ▶</button>`;
      let gone = false; const goOn = () => { if (gone || !alive) return; gone = true; afterRating(); };
      $('nextBtn').addEventListener('click', (e) => { e.stopPropagation(); goOn(); });
      const cupNow = S; setTimeout(() => { if (S === cupNow && !$('panel').hidden && $('nextBtn')) goOn(); }, (cfg.ratingAutoNext || 6) * 1000);
    };
    $('giftBox').addEventListener('click', (e) => { e.stopPropagation(); open(); });
    setTimeout(open, 3000); // a gift opens itself after a few seconds
  }

  // ---------------------------------------------------------------- HUD
  function bottleIcon(col) { return `<span class="bottle" style="--c:${col}"></span>`; }
  function dropIcon(col) { return `<span class="drop" style="--c:${col === 'rainbow' ? '#ff6fd0' : col};${col === 'rainbow' ? 'background:conic-gradient(#ff4f6b,#ffc93c,#5fd16b,#4fa8ff,#b27bff,#ff4f6b)' : ''}"></span>`; }
  function stencilIcon(id) { return `<span class="sten">${{ heart: '❤', star: '★', smile: '☺' }[id]}</span>`; }
  function itemIcon(list, id) {
    if (list === 'fruits') return `<img src="${thumbs[id]}" alt="">`;
    if (list === 'toppings') return `<img src="${thumbs['t_' + id]}" alt="">`;
    if (list === 'bases') return bottleIcon(baseById[id].color);
    if (list === 'syrups') return dropIcon(syrupById[id].color);
    if (list === 'cupStyles') return styleIcon(id);
    return '';
  }
  function styleIcon(id) {
    const st = (cfg.cupStyles || []).find((c) => c.id === id); if (!st) return '';
    const stops = st.cols.map((c, i) => `${c} ${i * 7}px ${(i + 1) * 7}px`).join(',');
    return `<span class="cupico" style="background:repeating-linear-gradient(90deg,${stops})"></span>`;
  }
  function setTray(items) {
    // stencils sit beside the Done button; everything else in the tray row
    const tr = $('tray'), sten = $('stencils'); tr.innerHTML = ''; sten.innerHTML = ''; S && (S.trayItems = items);
    for (const it of items) {
      // the highlight always follows the current choice (a re-render after a language change must not move it)
      const on = it.list === 'bases' ? S && it.id === S.made.base : it.list === 'syrups' ? S && it.id === S.syrup : it.on;
      const b = document.createElement('button'); b.className = 'slot gloss' + (on ? ' on' : ''); b.dataset.id = it.id;
      const def = (cfg[it.list] || []).find((x) => x.id === it.id), locked = def && def.cost && !owned(it.list, it.id);
      b.innerHTML = (it.img ? `<img src="${it.img}" alt="">` : it.html) + (locked ? `<span class="lock">🔒<b>${save.coins >= def.cost ? def.cost : T('try')}</b></span>` : '');
      b.addEventListener('pointerdown', (e) => e.stopPropagation());
      b.addEventListener('click', (e) => { e.stopPropagation(); Sound.unlock(cfg); trayTap(it, b); });
      (it.list === 'stencils' ? sten : tr).appendChild(b);
    }
    tr.classList.toggle('many', tr.children.length > 6);
  }
  function trayTap(it, b0) {
    let b = b0;
    if (!S || S.busy || mode !== 'play') return;
    S.idle = 0; hideHint();
    const def = (cfg[it.list] || []).find((x) => x.id === it.id);
    // a tap that cannot do anything now spends nothing (pouring started, fruit count full, topping already on)
    const st0 = S.step;
    const usable = st0 === 'pour' ? it.list === 'bases' && S.made.pour === 0 : st0 === 'fruit' ? it.list === 'fruits' && S.made.fruits.length < totalPieces()
      : st0 === 'draw' ? it.list === 'syrups' || it.list === 'stencils' : st0 === 'topping' ? it.list === 'toppings' && !S.made.toppings.includes(it.id) : false;
    if (!usable) { buzz('tick'); return; }
    if (def && def.cost && !owned(it.list, it.id)) {
      // anything locked opens when tapped: bought when the coins are there, a free try for this cup otherwise
      const left = R.buy(cfg, it.list, it.id, save.coins, save.owned);
      if (left >= 0) { save.coins = left; save.owned.push(it.id); persist(); renderCoins(); pop(T('new'), 'gold'); Sound.play('sfx_coin', 0.6); }
      else { S.trial.push(it.id); pop(T('try'), 'small'); Sound.play('sfx_pop', 0.5); }
      // every price label is redrawn against the new coin count
      buzz('success'); setTray(S.trayItems || []);
      b = root.querySelector(`#hud .slot[data-id="${it.id}"]`) || b;
    }
    b.classList.remove('bump'); void b.offsetWidth; b.classList.add('bump');
    const st = S.step;
    if (st === 'pour' && it.list === 'bases') { if (S.made.pour > 0) return; S.made.base = it.id; jugColour(); for (const x of $('tray').children) x.classList.toggle('on', x.dataset.id === it.id); Sound.play('sfx_pop', 0.4); }
    if (st === 'fruit' && it.list === 'fruits') addFruit(it.id);
    if (st === 'draw' && it.list === 'syrups') { S.syrup = it.id; bottleColour(); for (const x of $('tray').children) if (cfg.syrups.some((s) => s.id === x.dataset.id)) x.classList.toggle('on', x.dataset.id === it.id); Sound.play('sfx_pop', 0.4); }
    if (st === 'draw' && it.list === 'stencils') useStencil(it.id);
    if (st === 'topping' && it.list === 'toppings') addTop(it.id);
  }
  function showAction(text, fn) { const a = $('action'); a.hidden = false; a.textContent = text + ' ✓'; a.onclick = (e) => { e.stopPropagation(); if (!S.busy && !S.stencil) { Sound.play('sfx_pop', 0.5); fn(); } }; }
  function showBar(k) { const b = $('bar'); b.hidden = false; b.querySelector('i').style.width = clamp(k, 0, 1) * 100 + '%'; const band = b.querySelector('em'); band.hidden = S.step !== 'pour'; if (S.step === 'pour') { band.style.insetInlineStart = (cfg.pour.band[0] / cfg.pour.max) * 100 + '%'; band.style.width = ((cfg.pour.band[1] - cfg.pour.band[0]) / cfg.pour.max) * 100 + '%'; } }
  function banner(text) { const b = $('banner'); b.hidden = !text; b.textContent = text; b.style.fontSize = ''; if (text) { const len = [...text].length; if (len > 18) b.style.fontSize = `calc(var(--u)*${Math.max(30, 44 - (len - 18) * 1.2)}px)`; } }
  function renderSteps() {
    const list = S.steps.filter((s) => STEP_ICONS[s]);
    $('steps').innerHTML = list.map((s) => { const i = S.steps.indexOf(s); return `<span class="${i < S.si ? 'done' : i === S.si ? 'now' : ''}">${STEP_ICONS[s]}</span>`; }).join('');
  }
  function renderCoins() { $('coins').querySelector('b').textContent = save.coins; renderUnlock(); }
  /** The next thing to unlock, with how close the coins are: always a goal in sight. */
  function renderUnlock() {
    const u = R.nextUnlock(cfg, save.owned, ['cupStyles']), el = $('unlock');
    el.hidden = !u || mode !== 'play'; if (!u) return;
    const k = Math.min(1, save.coins / u.cost);
    el.innerHTML = `<span class="ui">${itemIcon(u.list, u.id)}</span><i><b style="width:${k * 100}%"></b></i>`;
    el.classList.toggle('ready', k >= 1);
  }
  /** My cups: photos of this session's cups, the older ones as recipe cards, cup styles to pick, the top makers. */
  function openShelf() {
    // not while a cup is being served: the rating card is about to take the panel
    if (!$('panel').hidden || mode !== 'play' || (S && S.step === 'serve' && !S.ratingUp)) return;
    const p = $('panel'); p.hidden = false;
    const older = (save.shelf || []).slice(-8).reverse().slice(snaps.filter((x) => x.saved).length);
    const cards = [...snaps.map((x) => `<div class="cell"><img src="${x.img}" alt=""><span class="cs">${'★'.repeat(x.s)}</span></div>`),
      ...older.map((x) => `<div class="cell rec">${baseById[x.b] ? bottleIcon(baseById[x.b].color) : ''}${thumbs[x.f] ? `<img src="${thumbs[x.f]}" alt="">` : ''}<span class="cs">${'★'.repeat(Math.max(1, Math.min(3, Number(x.s) || 1)))}</span></div>`)].slice(0, 8);
    while (cards.length < 8) cards.push('<div class="cell empty"></div>');
    const styles = (cfg.cupStyles || []).map((st) => { const own = !st.cost || save.owned.includes(st.id), on = (S && S.style) === st.id;
      return `<button class="sw gloss${on ? ' on' : ''}" data-st="${st.id}">${styleIcon(st.id)}${own ? '' : `<span class="lock">🔒<b>${st.cost}</b></span>`}</button>`; }).join('');
    p.innerHTML = `<div class="card shelf"><div class="gtitle out">${T('shelf')}</div><div class="grid">${cards.join('')}</div><div class="styles">${styles}</div><ol id="board" class="board" hidden></ol><button id="closeShelf" class="round gloss close" aria-label="close">✕</button></div>`;
    $('closeShelf').addEventListener('click', (e) => { e.stopPropagation(); p.hidden = true; p.innerHTML = ''; Sound.play('sfx_pop', 0.4); });
    p.querySelector('.styles').addEventListener('click', (e) => {
      const b = e.target.closest('[data-st]'); if (!b) return; e.stopPropagation();
      const id = b.dataset.st, st = cfg.cupStyles.find((c) => c.id === id);
      if (st.cost && !save.owned.includes(id)) {
        // locked opens when tapped: bought if the coins are there, else tried on this cup
        const left = R.buy(cfg, 'cupStyles', id, save.coins, save.owned);
        if (left >= 0) { save.coins = left; save.owned.push(id); save.cupStyle = id; pop(T('new'), 'gold'); Sound.play('sfx_coin', 0.6); }
        else { pop(T('try'), 'small'); Sound.play('sfx_pop', 0.5); if (S) S.styleTry = id; }
      } else { save.cupStyle = id; if (S) S.styleTry = null; Sound.play('sfx_pop', 0.5); }
      if (S) S.style = null; applyStyle(id); buzz('success'); persist(); renderCoins(); p.hidden = true; openShelf();
    });
    Promise.resolve().then(() => lib.getTopNEntriesFromLeaderboard(3)).then((res) => {
      const list = res && Array.isArray(res.entries) ? res.entries.slice(0, 3) : [], box = $('board');
      if (!alive || !box || !list.length) return;
      box.innerHTML = `<li class="bt">${T('top')}</li>`;
      list.forEach((en, i) => { const li = document.createElement('li'), nm = document.createElement('span'), sc = document.createElement('b'); nm.textContent = ['🥇', '🥈', '🥉'][i] + ' ' + Array.from(String(en.username || '?')).slice(0, 14).join(''); nm.dir = 'auto'; sc.textContent = String(Number(en.score) || 0); sc.dir = 'ltr'; li.append(nm, sc); box.appendChild(li); });
      box.hidden = false;
    }).catch(() => {});
  }
  function custCell(id, mood) {
    const sp = cfg.sprites[id]; const url = custImg[id];
    if (!sp || !url) return 'background:radial-gradient(circle at 40% 35%,#fff,#ffd1e6);border-radius:50%';
    const [x, y, w, h] = sp.cells[mood];
    return `aspect-ratio:${w}/${h};background-image:url('${url}');background-size:${(sp.w / w) * 100}% ${(sp.h / h) * 100}%;background-position:${(x / Math.max(1, sp.w - w)) * 100}% ${(y / Math.max(1, sp.h - h)) * 100}%`;
  }
  /** The customer reacts: a face, and an emoji that floats up from them. */
  function react(m, emo) {
    setMood(m);
    if (!emo) return;
    const el = document.createElement('div'); el.className = 'emo'; el.textContent = emo; $('hud').appendChild(el);
    setTimeout(() => el.remove(), 1300);
  }
  function setMood(m) { $('cust').setAttribute('style', custCell(S.order.customer, m)); $('cust').classList.remove('bob'); void $('cust').offsetWidth; $('cust').classList.add('bob'); }
  function renderOrder() {
    const o = S.order, per = R.piecesFor(o);
    // the item the current step is about pulses, so the order reads as a to-do list
    const st = S.step, now = (k, ok) => (ok ? 'ok' : st === k ? 'now' : '');
    const fruitHtml = o.fruits.map((f) => { const got = S.made.fruits.filter((x) => x === f).length; return `<span class="oi ${now('fruit', got >= per)}"><img src="${thumbs[f]}" alt=""><b>${Math.min(got, per)}/${per}</b></span>`; }).join('');
    const topHtml = o.toppings.map((t) => `<span class="oi ${now('topping', S.made.toppings.includes(t))}"><img src="${thumbs['t_' + t]}" alt=""></span>`).join('');
    const art = o.art ? `<span class="oi ${now('draw', S.made.art === o.art)}">${stencilIcon(o.art)}</span>` : '';
    const baseOk = S.made.base === o.base && S.made.pour >= cfg.pour.band[0];
    const badge = o.special ? `<span class="badge ${o.special}">${o.special === 'vip' ? '👑' : '⭐'}</span>` : '';
    $('bubble').innerHTML = `${badge}<div class="row"><span class="oi ${now('pour', baseOk)}">${bottleIcon(baseById[o.base].color)}</span>${fruitHtml}</div><div class="row">${topHtml}${art}</div>`;
  }
  function learn(k) { if (!save.learned[k]) { save.learned[k] = 1; persist(); } }

  // ---- hint hand: shown on new gestures and after a few idle seconds; it never blocks a tap
  function hideHint() { $('hand').hidden = true; }
  function hint() {
    if (!S || S.busy || mode !== 'play' || !$('panel').hidden) return hideHint();
    const st = S.step; const learned = save.learned[st] && S.n > 0;
    if (S.idle < (learned ? cfg.hintAfter : 0.6)) return hideHint();
    const h = $('hand'), r = root.getBoundingClientRect();
    const at = (fx, fy, cls) => { h.hidden = false; h.className = 'hand h-' + cls; h.style.left = fx * 100 + '%'; h.style.top = fy * 100 + '%'; };
    const sc = (u, v) => scene.screenOf(scene.uvToWorld(u, v));
    const btn = (id) => { const b = root.querySelector(`#hud .slot[data-id="${id}"]`); if (!b) return null; const q = b.getBoundingClientRect(); return [(q.left + q.width * 0.6 - r.left) / r.width, (q.top + q.height * 0.6 - r.top) / r.height]; };
    const elAt = (el) => { const q = el.getBoundingClientRect(); return [(q.left + q.width * 0.6 - r.left) / r.width, (q.top + q.height * 0.55 - r.top) / r.height]; };
    if (st === 'pour') { const [x, y] = sc(0.5, 0.5); at(x, y, 'hold'); }
    else if (st === 'fruit') { const need = S.order.fruits.find((f) => S.made.fruits.filter((x) => x === f).length < R.piecesFor(S.order)); const p = need && btn(need); if (p) at(p[0], p[1], 'tap'); }
    else if (st === 'chop') { const f = scene.placed.find((x) => !x.burst); if (f) { const [x, y] = sc(f.u, f.v); at(x, y, 'tap'); } }
    else if (st === 'spread') { const [x, y] = sc(0.5, 0.5); at(x, y, 'swipe-x'); }
    else if (st === 'draw') { const p = S.order.art && S.made.art !== S.order.art ? btn(S.order.art) : null; if (p) at(p[0], p[1], 'tap'); else if (!S.made.art) { const [x, y] = sc(0.5, 0.5); at(x, y, 'swipe-x'); } else { const [x, y] = elAt($('action')); at(x, y, 'tap'); } }
    else if (st === 'freeze') { const [x, y] = elAt($('hold')); at(x, y, 'hold'); }
    else if (st === 'roll') { const ln = scene.lanes.find((l) => !l.done && !l.auto); if (ln) { const u = ln.x / PW + 0.5; const [x, y] = sc(u, RECT.v1 - 0.08); at(x, y, 'swipe-up'); } }
    else if (st === 'topping') { const t = S.order.toppings.find((x) => !S.made.toppings.includes(x)); const p = t ? btn(t) : null; if (p) at(p[0], p[1], 'tap'); else if (!$('action').hidden) { const [x, y] = elAt($('action')); at(x, y, 'tap'); } }
    else hideHint();
  }

  // ---------------------------------------------------------------- loop
  function frame(now) {
    if (!alive) return;
    raf = requestAnimationFrame(frame);
    const rawDt = Math.min(0.05, (now - last) / 1000); last = now;
    const dt = rawDt * speed * (S && S.slow ? cfg.roll.slowMo || 0.4 : 1);
    if (S && mode === 'play') {
      S.t += dt; S.idle = S.pouring || S.freezing || S.holdBtn || S.drawing || S.spreading || S.lane || S.stencil ? 0 : S.idle + dt;
      if (S.busy && S.wait !== undefined) { S.wait -= dt; if (S.wait <= 0) { S.wait = undefined; go(S.si + 1); } }
      const st = S.step;
      if (st === 'pour') updatePour(dt);
      if (st === 'chop') updateChop(dt);
      if (st === 'spread') updateSpread(dt);
      if (st === 'draw') updateDraw(dt);
      if (st === 'freeze') updateFreeze(dt);
      if (st === 'roll') updateRoll(dt);
      if (st === 'cup') updateCup(dt);
      if (st === 'serve') updateServe(dt);
      hint();
    }
    if (mode === 'edit') scene.cup.rotation.y += rawDt * 0.6;
    scene.frame(dt);
  }

  // ---------------------------------------------------------------- wiring
  const onDown = (e) => down(e), onMove = (e) => move(e), onUp = (e) => up(e);
  const noMenu = (e) => e.preventDefault();
  root.addEventListener('pointerdown', onDown); window.addEventListener('pointermove', onMove); window.addEventListener('pointerup', onUp); window.addEventListener('pointercancel', onUp);
  root.addEventListener('contextmenu', noMenu);
  const onVis = () => {
    Sound.suspend(document.hidden);
    if (document.hidden && S) {
      // the page went away mid-gesture: end it as if the finger lifted (a lost pointerup must not lock the plate)
      if (pid !== null) up({ pointerId: pid });
      S.pouring = false; S.freezing = false; S.holdBtn = false; loops.pour(false); loops.freeze(false);
    }
  };
  const onLost = (e) => { if (e.pointerId === pid) up(e); };
  root.addEventListener('lostpointercapture', onLost);
  document.addEventListener('visibilitychange', onVis);
  const onResize = () => { scene.resize(); fit(); };
  window.addEventListener('resize', onResize);
  function fit() { const r = root.getBoundingClientRect(); root.style.setProperty('--u', String(r.width / 720)); }
  const hold = $('hold');
  hold.addEventListener('pointerdown', (e) => { e.stopPropagation(); Sound.unlock(cfg); if (S && S.step === 'freeze') { S.holdBtn = true; S.idle = 0; hideHint(); try { hold.setPointerCapture(e.pointerId); } catch (err) { /* synthetic */ } } });
  const holdOff = () => { if (S) S.holdBtn = false; };
  hold.addEventListener('pointerup', holdOff); hold.addEventListener('pointercancel', holdOff);
  $('mute').addEventListener('pointerdown', (e) => e.stopPropagation());
  $('mute').textContent = Sound.muted ? '🔇' : '🔊'; save.muted = Sound.muted; let muteTouched = false;
  $('mute').addEventListener('click', (e) => { e.stopPropagation(); muteTouched = true; Sound.unlock(cfg); Sound.setMuted(!Sound.muted); loops.pour(false); loops.freeze(false); save.muted = Sound.muted; $('mute').textContent = Sound.muted ? '🔇' : '🔊'; persist(); });
  $('langBtn').addEventListener('pointerdown', (e) => e.stopPropagation());
  $('langBtn').addEventListener('click', (e) => { e.stopPropagation(); const m = $('langs'); m.hidden = !m.hidden; });
  $('langs').innerHTML = LANGS.map((l) => `<button data-l="${l}" class="gloss">${cfg.langNames[l]}</button>`).join('');
  $('langs').addEventListener('pointerdown', (e) => e.stopPropagation());
  $('langs').addEventListener('click', (e) => { e.stopPropagation(); const l = e.target.dataset && e.target.dataset.l; if (!l) return; lang = l; save.lang = l; setDir(); $('langs').hidden = true; persist(); if (S) { banner(S.step === 'serve' || S.peek !== undefined ? '' : T(S.step)); if (S.step === 'draw' || S.step === 'topping') showAction(T(S.step === 'draw' ? 'done' : 'serve'), () => go(S.si + 1)); if (S.step === 'topping' && !S.made.toppings.length) $('action').hidden = true; setTray(S.trayItems || []); } });
  $('panel').addEventListener('pointerdown', (e) => e.stopPropagation());
  for (const id of ['shelfBtn', 'unlock']) { $(id).addEventListener('pointerdown', (e) => e.stopPropagation()); $(id).addEventListener('click', (e) => { e.stopPropagation(); Sound.unlock(cfg); Sound.play('sfx_pop', 0.4); openShelf(); }); }
  fit(); scene.resize();

  try {
    lib.showGameParameters({ name: 'Ice Cream Roll Art', params: {
      'Pour speed': { key: 'pour.rate', type: 'slider', min: 0.2, max: 1, step: 0.02 },
      'Chops per fruit': { key: 'chop.hits', type: 'slider', min: 1, max: 6, step: 1 },
      'Freeze time (s)': { key: 'freeze.time', type: 'slider', min: 0.8, max: 5, step: 0.2 },
      'Roll lanes': { key: 'roll.lanes', type: 'slider', min: 3, max: 5, step: 1 },
      'Coins per star': { key: 'coins.perStar', type: 'slider', min: 1, max: 20, step: 1 },
    } });
  } catch (e) { /* host without a settings panel */ }

  if (mode === 'edit') {
    // a still showcase: the frozen sheet with a heart, and a finished cup beside nothing interactive
    newCup(); $('hud').classList.add('edit');
  } else {
    newCup();
    // the player's save: coins earned before it arrived are added on top, never overwritten
    const read = (tries) => Promise.resolve().then(() => lib.getUserGameState()).then((r) => {
      if (!alive) return;
      const st = r && r.state; const earned = save.coins, cups = save.cups, picked = save.lang, ownedBefore = save.owned.slice(), learnedBefore = { ...save.learned }, lastDailyBefore = Number(save.lastDaily) || 0, shelfBefore = (save.shelf || []).slice(), todayBefore = Number(save.todayDone) || 0, styleBefore = save.cupStyle, styleTouched = save.cupStyle !== 'pink';
      if (st && typeof st === 'object') {
        Object.assign(save, st);
        save.coins = (Number(st.coins) || 0) + earned; save.cups = (Number(st.cups) || 0) + cups;
        save.owned = [...new Set([...(Array.isArray(st.owned) ? st.owned : []), ...ownedBefore])];
        save.learned = { ...(st.learned && typeof st.learned === 'object' ? st.learned : {}), ...learnedBefore };
        save.shelf = [...(Array.isArray(st.shelf) ? st.shelf : []), ...shelfBefore].slice(-24);
        if (picked) save.lang = picked;
        if (save.lang && LANGS.includes(save.lang)) { lang = save.lang; setDir(); if (S) { banner(S.step === 'serve' || S.peek !== undefined ? '' : T(S.step)); setTray(S.trayItems || []); } }
        if (muteTouched) save.muted = Sound.muted; else { Sound.setMuted(!!st.muted); $('mute').textContent = Sound.muted ? '🔇' : '🔊'; }
        save.lastDaily = Math.max(Number(st.lastDaily) || 0, lastDailyBefore);
        save.todayDone = Math.max(Number(st.todayDone) || 0, todayBefore);
        if (styleTouched) save.cupStyle = styleBefore; else if (!(cfg.cupStyles || []).some((c) => c.id === save.cupStyle)) save.cupStyle = 'pink';
        if (S) { S.style = null; applyStyle(S.styleTry || save.cupStyle); }
        // a returning player who has not touched yet skips the short first cup
        if (cups === 0 && save.cups > 0 && S && S.n === 0 && S.t < 30 && !S.touched) newCup();
      }
      saveLoaded = true; renderCoins(); if (S && S.trayItems) setTray(S.trayItems);
      if (earned || cups || picked) persist();
    }).catch(() => { if (alive && tries < 4) setTimeout(() => read(tries + 1), 1500 * (tries + 1)); /* never write blind */ });
    read(0);
  }
  const onTouched = () => { if (S) S.touched = true; };
  root.addEventListener('pointerdown', onTouched, true);
  if (window.__load) window.__load.done();
  raf = requestAnimationFrame((t) => { last = t; frame(t); });

  return {
    destroy() {
      alive = false; cancelAnimationFrame(raf); loops.pour(false); loops.freeze(false);
      root.removeEventListener('pointerdown', onDown); window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp); window.removeEventListener('pointercancel', onUp);
      root.removeEventListener('contextmenu', noMenu); root.removeEventListener('pointerdown', onTouched, true); root.removeEventListener('lostpointercapture', onLost); document.removeEventListener('visibilitychange', onVis); window.removeEventListener('resize', onResize);
      scene.dispose(); root.innerHTML = '';
    },
    debug: {
      get S() { return S; }, get save() { return save; }, get lang() { return lang; }, scene, sheet, T, Sound, newCup, go, addFruit, addTop, useStencil,
      setLang(l) { lang = l; setDir(); }, get saveLoaded() { return saveLoaded; }, openShelf, get snaps() { return snaps; },
      /** Client coordinates of plate point (u, v), for tests that touch like a finger. */
      client(u, v) { const [x, y] = scene.screenOf(scene.uvToWorld(u, v)); const r = root.querySelector('#cv').getBoundingClientRect(); return [r.left + x * r.width, r.top + y * r.height]; },
      get textures() { return scene.renderer.info.memory.textures; }, get geometries() { return scene.renderer.info.memory.geometries; },
    },
  };
}

const HTML = `
<div id="shop"><div id="cust" class="cust"></div><div id="bubble" class="bubble"></div></div>
<canvas id="cv"></canvas>
<div id="hud" class="hud">
  <div class="top"><div id="coins" class="pill gloss"><i class="coin"></i><b>0</b></div><button id="unlock" class="unlock gloss" aria-label="next unlock" hidden></button><span class="sp"></span><button id="shelfBtn" class="round gloss" aria-label="my cups">🍨</button><button id="langBtn" class="round gloss" aria-label="language">🌐</button><button id="mute" class="round gloss" aria-label="sound">🔊</button></div>
  <div id="langs" class="langs" hidden></div>
  <div id="pops" class="pops"></div>
  <div id="bar" class="bar" hidden><em></em><i></i></div>
  <div class="low">
    <div id="steps" class="steps"></div>
    <div id="banner" class="banner out"></div>
    <div class="say"><div id="stencils" class="tray"></div><button id="action" class="big gloss out" hidden></button></div>
    <div id="tray" class="tray"></div>
    <button id="hold" class="hold gloss" hidden aria-label="freeze">❄️</button>
  </div>
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
    shouldUseTouchControls: () => matchMedia('(pointer: coarse)').matches, haptics: { play() {}, start() {}, stop() {} } };
  Promise.all([fetch('./game_config.json').then((r) => r.json()), fetch('./asset_map.json').then((r) => r.json()).catch(() => ({}))]).then(([c, assets]) => {
    window.lib.getAsset = (id) => (window.__noAssets ? undefined : assets[id] ? { ...assets[id], url: './' + id + (assets[id].type === 'audio' ? '.mp3' : '.webp') } : undefined);
    window.gameConfig = c; run(new URLSearchParams(location.search).get('mode') || 'play');
  });
}
