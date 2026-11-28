// PROTOTYPE - NOT FOR PRODUCTION
// Mow Mow Meadow: the game loop. Gardens are stacked northward along a lane; the kart drives with one thumb, the
// deck cuts the mask of the garden it is in, bales pop, the grass hides friends, toys, coins and a gift, and the
// gate opens at 90%. Rules live in logic.js, tuning and strings in game_config.json.
import * as L from './logic.js';
import { createWorld, dressGarden, lanePiece } from './world.js';
import { createLawn } from './lawn.js';
import { buildBuzzy } from './buzzy.js';
import { createFx, createDirector } from './fx.js';
import { createAudio } from './audio.js';
import { createUI, ICONS } from './ui.js';
import * as Cast from './cast.js';
import { openAlbum, openShop } from './sheets.js';

const LANE_M = 10, LANE_HALF_W = 3.4, PAD_R = 0.95;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v)), lerp = (a, b, t) => a + (b - a) * t, ease = (t) => t * t * (3 - 2 * t);
const LANGS = ['en', 'ar', 'es', 'vi', 'hi', 'bn', 'id'];

/** Starts the game in mode 'play' or 'edit' (edit: the living garden with Buzzy mowing by itself, no input, no save). Returns { destroy }. */
export function run(mode = 'play') {
  if (window.__mm) { try { window.__mm.destroy(); } catch (e) { console.warn('previous run', e); } }
  if (!window.THREE) {
    const again = () => { removeEventListener('three-ready', again); window.__mm = run(mode); };
    addEventListener('three-ready', again);
    const wait = { destroy() { removeEventListener('three-ready', again); if (window.__mm === wait) window.__mm = null; } };
    window.__mm = wait; return wait;
  }
  const cfg = JSON.parse(JSON.stringify(window.gameConfig || {})); // a copy: the host's config is never written
  const hasLib = typeof lib !== 'undefined', play = mode === 'play', root = document.getElementById('app'), qs = new URLSearchParams(location.search);
  if (hasLib && lib.showGameParameters) lib.showGameParameters({ name: 'Mow Mow Meadow', params: {
    'Mower speed': { key: 'upgrades.engine.from', type: 'slider', min: 2, max: 5, step: 0.1 },
    'Deck width': { key: 'upgrades.deck.from', type: 'slider', min: 0.8, max: 2, step: 0.1 },
    'Grass height': { key: 'lawn.tallM', type: 'slider', min: 0.3, max: 0.8, step: 0.05 },
    'Camera distance': { key: 'camera.dist.0', type: 'slider', min: 10, max: 20, step: 0.5 },
  } });
  root.innerHTML = '<canvas id="cv"></canvas>'; root.classList.remove('live');
  const canvas = root.querySelector('#cv');
  let world;
  try { world = createWorld(canvas, cfg, { keep: qs.has('keep') }); } catch (e) { console.warn('webgl', e); window.__load && window.__load.fail('GL'); return { destroy() {} }; }
  const THREE = window.THREE, dead = { v: false }, offs = [], timers = new Set();
  const on = (el, ev, fn, opt) => { el.addEventListener(ev, fn, opt); offs.push(() => el.removeEventListener(ev, fn, opt)); };
  const later = (fn, ms) => { const id = setTimeout(() => { timers.delete(id); if (!dead.v) fn(); }, ms); timers.add(id); };
  const calm = () => S.save.calm || (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);

  // ---- state
  const S = { save: L.newSave(cfg), slots: new Map(), cuts: {}, cur: 0, kart: { x: 0, z: 0, ang: 0, vx: 0, vz: 0, speed: 0, turn: 0 }, flow: L.newFlow(), t: 0, stick: { on: false, id: -1, ox: 0, oy: 0, sx: 0, sy: 0, dx: 0, dz: 0, mag: 0, moved: 0, t0: 0 }, keys: {}, cutting: 0, fresh: 0, frames: 0, ms: 16, slow: 0, fast: 0,
    shown: 0, bale: { m2: 0, fs: 0, wet: 0 }, bales: [], ents: [], riders: [], noProg: 0, guide: null, guideT: 0, m2Note: 0, lastReward: 0, scale: 1, loaded: false, late: false, dirty: false, saveT: 0, moved: 0, puffT: 0, idle: 0, firstBale: false, hat: null, orn: null, touched: false, events: [], milestone: 0, pads: [], sheet: null, clock: { last: 0, kinds: {} } };
  const zSouth = []; { let z = 0; for (let n = 0; n < cfg.gardens.length; n++) { zSouth.push(z); z -= cfg.gardens[n].d + LANE_M; } }
  let lang = 'en';
  const T = (k) => (cfg.strings[lang] && cfg.strings[lang][k]) || (cfg.strings.en && cfg.strings.en[k]) || k;
  function detectLang() { if (S.save.lang && LANGS.includes(S.save.lang)) return S.save.lang; for (const l of navigator.languages || [navigator.language || 'en']) { const c = String(l).slice(0, 2).toLowerCase(); if (LANGS.includes(c)) return c; } return 'en'; }
  function setLang() { lang = detectLang(); ui.setDir(lang === 'ar'); }

  const fx = createFx(world, cfg), audio = createAudio(cfg);
  const director = createDirector(cfg, { calm, sting() {} });
  const ui = createUI(root, cfg, {
    mute() { S.save.mute = !S.save.mute; audio.setMute(S.save.mute); ui.setMute(S.save.mute); audio.unlock(); audio.sfx('click'); persist(); },
    album() { audio.sfx('rustle'); ui.dot('album', false); S.newAlbum = false; openAlbum(G); if (S.save.ftue === 6) ftueNext(7); },
    shop() { audio.sfx('rustle'); ui.dot('shop', false); openShop(G); },
    skip() { S.save.ftueDone = true; ui.showSkip(false); ui.spot(null); audio.sfx('click'); persist(); },
    click() { audio.sfx('click'); },
    sheet(name, open) { S.sheet = open ? name : null; if (!open) audio.sfx('rustle'); },
  });
  setLang();

  // ---- the lane: gardens, pads, neighbours
  /** Builds (once) garden n: its data, lawn, dressing and neighbour, north of the one before it. */
  function slot(n) {
    if (S.slots.has(n)) return S.slots.get(n);
    const rec = cfg.gardens[n], g = L.makeGarden(cfg, n, cfg.seed + n * 7919 + (S.replay && S.replay[n] ? S.replay[n] * 31 : 0)), ox = -rec.w / 2, oz = zSouth[n] - rec.d, d = L.districtOf(n), sr = S.save.gardens[n];
    if (S.cuts[n]) L.unpackCut(g, S.cuts[n]); else if (sr && sr.stars > 0 && !(S.replay && S.replay[n])) L.unpackCut(g, '0.' + g.grassCount.toString(36)); // finished earlier: shown mown
    for (const f of g.finds) if (cellCut(g, f.x, f.z)) f.found = true;
    const tint = TINTS[S.save.use.tint], pal = tint ? [cfg.districts[d].grass[0], cfg.districts[d].grass[1], tint[0], tint[1]] : cfg.districts[d].grass;
    const lawn = createLawn(THREE, g, cfg, ox, oz, pal, world.tier, L.rng(g.seed + 99)); world.scene.add(lawn.group);
    const dress = dressGarden(world, g, ox, oz, cfg, d), lane = lanePiece(world, 0, oz, oz - LANE_M);
    const nb = Cast.buildNeighbour(world, rec.id); nb.group.position.set(4.05, 0, oz - 1.3); nb.group.rotation.y = -0.35; world.scene.add(nb.group);
    const st = L.starsFor(cfg, g), s = { n, g, ox, oz, lawn, dress, lane, nb, nbMode: 'wave', nbT: 0, gateOpen: st > 0, gateT: st > 0 ? 1 : 0, stars: st, grow: 1, bloom: st > 0 && S.cuts[n] ? 1.2 : -1, finale: st > 0 && !!S.cuts[n], pads: [], box: null };
    if (st > 0) dress.gate.set(1);
    if (n < cfg.gardens.length - 1) for (const [i, kind] of ['deck', 'engine', 'baler'].entries()) { const p = Cast.buildPad(world, kind); p.x = i === 1 ? 2.2 : -2.2; p.z = oz - 3 - i * 2; p.group.position.set(p.x, 0, p.z); p.t = 0; p.setFill(0); world.scene.add(p.group); s.pads.push(p); }
    S.slots.set(n, s); return s;
  }
  function drop(n) {
    const s = S.slots.get(n); if (!s) return; S.cuts[n] = L.packCut(s.g);
    for (const b of S.bales.filter((q) => q.n === n)) collect(b, true);
    world.scene.remove(s.lawn.group, s.lane, s.nb.group); s.lawn.dispose(); s.dress.dispose(); s.lane.geometry.dispose(); disposeTree(s.nb.group);
    for (const p of s.pads) { world.scene.remove(p.group); disposeTree(p.group); } if (s.box) { world.scene.remove(s.box.group); disposeTree(s.box.group); }
    S.slots.delete(n);
  }
  const disposeTree = (o) => o.traverse((m) => { if (m.geometry) m.geometry.dispose(); if (m.material && m.material.userData.own) m.material.dispose(); });
  const cellCut = (g, x, z) => { const c = clamp(Math.floor(x / g.cell), 0, g.cols - 1), r = clamp(Math.floor(z / g.cell), 0, g.rows - 1); return g.mask[(r * g.cols + c) * 4] === L.H.CUT && g.mask[(r * g.cols + c) * 4 + 3] > 0; };
  const TRAILS = { petals: ['petal'], daisies: ['petal', '#f1e6cf'], leaves: ['leaf'], bubbles: ['drop', '#c4e8f5'], stars: ['spark'], hearts: ['petal', '#e2533c'] };
  const TINTS = { classic: null, mint: ['#9fd8a8', '#7cc08e'], clover: ['#7fc86a', '#5fae52'], goldtip: ['#b5cc5a', '#8fb04a'], lilac: ['#a8c898', '#8fb0a8'], sunset: ['#c8c070', '#a8a058'] };

  const southLane = lanePiece(world, 0, 4.4, 0.6); // the way in to the first garden
  const buzzy = buildBuzzy(world, { paint: S.save.use.paint }); world.scene.add(buzzy.group);
  const deckW = () => L.upValue(cfg, 'deck', S.save.up.deck), topSpeed = () => L.upValue(cfg, 'engine', S.save.up.engine) * (S.flow.v >= 1 ? cfg.flow.speedMul : 1);
  const cur = () => S.slots.get(S.cur), rec = (n) => S.save.gardens[n] || (S.save.gardens[n] = { stars: 0, best: 0, rib: [] });
  function dressBuzzy() { buzzy.setDeck(deckW()); buzzy.setLevels(S.save.up); buzzy.setPaint(S.save.use.paint); wear(S.save.wear); }
  /** Puts a hat on Nilo (or an ornament on the bonnet); null puts the straw sun hat back. */
  function wear(id) {
    const hatId = id && !Cast.isOrnament(id) ? id : 'straw', ornId = id && Cast.isOrnament(id) ? id : null;
    if (!S.hat || S.hat.userData.id !== hatId) { if (S.hat) { S.hat.parent.remove(S.hat); S.hat.geometry.dispose(); } S.hat = Cast.buildGift(world, hatId); S.hat.userData.id = hatId; buzzy.chibi.bones.head.add(S.hat); }
    if ((S.orn ? S.orn.userData.id : null) !== ornId) { if (S.orn) { S.orn.parent.remove(S.orn); S.orn.geometry.dispose(); S.orn = null; } if (ornId) { S.orn = Cast.buildGift(world, ornId); S.orn.userData.id = ornId; S.orn.position.set(0, 0, -0.3); S.orn.scale.setScalar(0.8); buzzy.bonnet.add(S.orn); } }
  }
  function enter(n, atStart) {
    const first = S.cur !== n || atStart; S.cur = n; const s = slot(n);
    if (atStart) { S.kart.x = s.ox + s.g.start.x; S.kart.z = s.oz + s.g.start.z; S.kart.ang = 0; S.kart.vx = S.kart.vz = 0; }
    if (n > S.save.cur && rec(n - 1).stars > 0) S.save.cur = n;
    world.setDistrict(L.districtOf(n), 1); audio.setDistrict(L.districtOf(n)); buzzy.setDeck(deckW());
    for (const k of [...S.slots.keys()]) if (k < n - 1 || k > n + 1) drop(k);
    if (first) { S.flow.ribbon = false; S.touched = false; S.milestone = Math.floor(L.coverage(s.g) * 4); s.nbMode = s.stars > 0 ? 'dance' : 'wave'; if (play && S.loaded && s.stars === 0 && n > 0) greet(s); }
    refreshHud();
  }
  /** The neighbour's request chip at the start of a garden: the face, the name and the pattern asked for, if any. */
  function greet(s) { const c = ui.chip(`<span></span>`, 3); c.prepend(face(s.n)); c.querySelector('span').textContent = T('g_' + s.g.id) + (s.g.pattern ? '  ' + ({ long: '║', cross: '═', diag: '⟋', chequer: '▦' }[s.g.pattern]) : ''); }
  const faces = {};
  function face(n) { const id = cfg.gardens[n].id; if (!faces[id]) { const m = Cast.buildNeighbour(world, id); m.update(0, 0, 'idle'); faces[id] = Cast.portrait(world, m.head, 128, { yaw: 0.25, pitch: 0.1 }); disposeTree(m.group); } const c = document.createElement('canvas'); c.width = c.height = 128; c.getContext('2d').drawImage(faces[id], 0, 0, 128, 128); return c; }
  function refreshHud() { const s = cur(); ui.setProgress(L.coverage(s.g), L.percent(s.g), s.stars); ui.showButtons(S.save.friends.length + S.save.toys.length + S.save.gifts.length > 0, S.save.cur > 0 || S.save.up.deck + S.save.up.engine + S.save.up.baler > 0); ui.setMute(S.save.mute); }

  // ---- stage and projection
  let W = 1, H = 1; const v3 = new THREE.Vector3();
  /** World point to stage pixels: { x, y, on } (on = inside the frame). */
  function toScreen(x, y, z) { v3.set(x, y, z).project(world.camera); return { x: (v3.x * 0.5 + 0.5) * W, y: (-v3.y * 0.5 + 0.5) * H, on: v3.z < 1 && Math.abs(v3.x) < 1 && Math.abs(v3.y) < 1 }; }
  function camDist() { const s = cur(), k = clamp((s.g.w - 8) / 20, 0, 1), up = (S.save.up.deck + S.save.up.engine) / 18; return lerp(cfg.camera.dist[0], cfg.camera.dist[1], Math.max(k, up)); }

  // ---- save: no write before the first read; a late read is merged once
  let lastWrite = window.__mmWrite || Promise.resolve();
  function snapshot() { const s = cur(), o = JSON.parse(JSON.stringify(S.save)); o.cut = L.packCut(s.g); o.cutFor = S.cur; o.cur = S.cur <= S.save.cur ? S.cur : S.save.cur; for (const b of S.bales) o.coins += b.coins; return o; }
  function persist() { if (!play || !hasLib || !lib.saveUserGameState) return; if (!S.loaded) { S.dirty = true; return; } S.dirty = false; const snap = snapshot(); lastWrite = window.__mmWrite = lastWrite.then(() => lib.saveUserGameState(snap)).catch(() => { S.dirty = true; }); }
  function applySave(raw, late) {
    S.save = late ? L.mergeSave(cfg, S.save, raw) : L.cleanSave(cfg, raw); S.shown = S.save.coins;
    if (!late) { // the first read, before the player has moved: rebuild the lane at the saved garden with its saved lawn
      for (const k of [...S.slots.keys()]) dropQuiet(k); S.cuts = {};
      const at = S.save.cut && S.save.cutFor >= 0 ? S.save.cutFor : S.save.cur; if (S.save.cut && S.save.cutFor >= 0) S.cuts[at] = S.save.cut;
      enter(at, true); world.follow(S.kart.x, S.kart.z, 0, 0, camDist(), 0, true);
    }
    audio.setMute(S.save.mute); audio.setMusic(S.save.music); setLang(); ui.setLefty(S.save.lefty); dressBuzzy(); ui.setCoins(S.shown); refreshHud(); syncRiders();
  }
  function dropQuiet(n) { const keep = S.cuts[n]; drop(n); if (keep === undefined) delete S.cuts[n]; else S.cuts[n] = keep; }
  function load() {
    if (!play) return; if (!hasLib || !lib.getUserGameState) { S.loaded = true; return; }
    const read = () => Promise.race([Promise.resolve().then(() => lib.getUserGameState()), new Promise((res, rej) => setTimeout(() => rej(new Error('save read timed out')), 8000))]);
    const got = (r) => { if (dead.v) return; const raw = r && r.state !== undefined ? r.state : r; if (S.loaded) { if (!S.late && raw) { S.late = true; applySave(raw, true); persist(); } return; } S.loaded = true; if (raw && S.moved < 1) applySave(raw, false); else if (raw) { S.late = true; applySave(raw, true); } if (S.dirty) persist(); };
    lastWrite.then(read).then(got).catch(() => { later(() => read().then(got).catch(() => { S.loaded = true; }), 1500); });
    later(() => { if (!S.loaded) { S.loaded = true; } }, 9000);
  }

  // ---- coins
  /** Adds coins: the save has them at once, the pill counts up as the flying coins land. */
  function award(n, wx, wy, wz, label = true) {
    n = Math.round(n); if (n <= 0) return; S.save.coins += n; reward('coins');
    const p = toScreen(wx, wy, wz), k = Math.min(8, Math.max(1, Math.round(n / 4))), per = n / k; let i = 0;
    if (label && p.on) ui.floatText(p.x, p.y - 30 * ui.unit(), `${ICONS.coin}+${n}`);
    ui.coinFly(clamp(p.x, 0, W), clamp(p.y, 0, H), k, () => { i++; S.shown = Math.min(S.save.coins, S.shown + per); if (i >= k) S.shown = S.save.coins; ui.setCoins(S.shown, true); audio.sfx('coin', { i }); });
  }
  /** The reward clock: remembers when something good last happened and which kinds were seen. */
  function reward(kind) { S.clock.last = S.t; S.clock.kinds[kind] = S.t; S.events.push({ t: +S.t.toFixed(2), kind }); if (S.events.length > 400) S.events.shift(); }

  // ---- bales
  function popBale(force) {
    const b = S.bale; if (b.m2 < 1) return; const kt = S.kart, s = cur(), lv = S.save.up.baler, bx = Math.sin(kt.ang), bz = Math.cos(kt.ang);
    const m = Cast.buildBale(world); m.scale.setScalar(0.75 + 0.05 * lv); world.scene.add(m);
    const o = { m, n: S.cur, x: kt.x + bx * 1.0, z: kt.z + bz * 1.0, y: 0.7, vx: bx * 2.5 + kt.vx * 0.2, vz: bz * 2.5 + kt.vz * 0.2, vy: 4.2, state: 'air', age: 0, bounces: 0, r: 0.36 * (0.75 + 0.05 * lv), coins: L.baleCoins(cfg, b.m2, b.fs / b.m2, b.wet / b.m2), spin: 0, first: !S.firstBale };
    S.bales.push(o); b.m2 = b.fs = b.wet = 0; buzzy.popBale(); audio.sfx('bale'); fx.burst('dust', o.x, 0.3, o.z, 8, { spread: 0.3 }); fx.burst('straw', o.x, 0.6, o.z, 10); fx.ring(o.x, o.z, '#f1e6cf', 0.3, 1.4, 0.45); reward('bale');
    if (o.first) { S.firstBale = true; director.play({ id: 'bale', pri: 2, len: 0.8, at: () => ({ x: o.x, z: o.z }), dist: camDist() * 0.74, slow: [0.08, 0.07] }); }
    void s; void force;
  }
  function collect(b, quiet) {
    const i = S.bales.indexOf(b); if (i < 0) return; S.bales.splice(i, 1); world.scene.remove(b.m); b.m.geometry.dispose();
    if (quiet) { S.save.coins += b.coins; S.shown = S.save.coins; ui.setCoins(S.shown); return; }
    fx.burst('straw', b.x, 0.4, b.z, 14); fx.burst('spark', b.x, 0.5, b.z, 5); fx.ring(b.x, b.z, '#f6b93b', 0.3, 1.6, 0.4, 0.5); award(b.coins, b.x, 0.6, b.z); audio.sfx('pop');
    if (S.save.ftue === 2) ftueNext(3); persist();
  }
  function stepBales(dt) {
    const kt = S.kart, reach = L.baleReach(cfg, S.save.up.baler);
    for (const b of [...S.bales]) {
      b.age += dt;
      if (b.state === 'air') {
        b.vy -= 14 * dt; b.x += b.vx * dt; b.z += b.vz * dt; b.y += b.vy * dt; b.spin += dt * 7;
        const s = S.slots.get(b.n); if (s) { b.x = clamp(b.x, s.ox + 0.6, s.ox + s.g.w - 0.6); b.z = clamp(b.z, s.oz + 0.6, s.oz + s.g.d - 0.6); }
        if (b.y <= b.r) { b.y = b.r; b.bounces++; if (b.bounces > 2) { b.state = 'rest'; b.vx = b.vz = 0; } else { b.vy = -b.vy * 0.42; b.vx *= 0.5; b.vz *= 0.5; fx.burst('dust', b.x, 0.1, b.z, 4, { spread: 0.2 }); } }
      } else {
        const d = Math.hypot(kt.x - b.x, kt.z - b.z);
        if (d < 1.05) { collect(b); continue; }
        if (d < reach + 0.4 && b.age > 0.9) { const k = Math.min(1, 7 * dt / d); b.x += (kt.x - b.x) * k; b.z += (kt.z - b.z) * k; b.spin += dt * 9; }
        if (b.n !== S.cur && Math.abs(b.n - S.cur) >= 1 && b.age > 2 && cur().g && d > 14) { collect(b); continue; }
      }
      const sq = b.state === 'air' ? 1 : 1 + Math.sin(Math.min(1, b.age * 4) * Math.PI) * 0.0;
      b.m.position.set(b.x, b.y, b.z); b.m.rotation.set(b.spin, 0.6, 0); b.m.scale.y = b.m.scale.x * sq;
    }
  }

  // ---- finds
  function reveal(s, f) {
    if (f.found) return; f.found = true; const wx = s.ox + f.x, wz = s.oz + f.z, kt = S.kart;
    fx.burst('leaf', wx, 0.3, wz, 10); fx.ring(wx, wz, '#fff1d6', 0.2, 1.3, 0.4);
    if (f.kind === 'coins') { fx.burst('spark', wx, 0.5, wz, 6); award(L.findCoins(cfg, s.n + 1), wx, 0.5, wz); audio.sfx('pop'); return; }
    if (f.kind === 'friend') {
      const isNew = !S.save.friends.includes(f.id); if (isNew) { S.save.friends.push(f.id); S.save.ride = [...S.save.ride.filter((x) => x !== f.id), f.id].slice(-3); noteAlbum(); }
      const fr = Cast.buildFriend(world, f.id); fr.group.position.set(wx, 0.2, wz); world.scene.add(fr.group); audio.sfx('friend'); fx.burst('spark', wx, 0.6, wz, 10); reward('friend');
      director.play({ id: 'friend', pri: 2, len: 0.9, at: () => ({ x: fr.group.position.x, z: fr.group.position.z }), dist: camDist() * 0.7 });
      S.ents.push({ t: 0, step(dt) { this.t += dt; const t = this.t; if (t < 0.7) { const k = t / 0.7; fr.group.position.y = 0.2 + Math.sin(k * Math.PI) * 1.3; fr.group.rotation.y = k * 12.56; fr.group.scale.setScalar(1 + Math.sin(k * Math.PI) * 0.8); } else { const k = ease(Math.min(1, (t - 0.7) / 0.5)); fr.group.position.set(lerp(wx, kt.x, k), 0.2 + k * 0.9, lerp(wz, kt.z, k)); } fr.update(S.t); if (t > 1.2) { world.scene.remove(fr.group); disposeTree(fr.group); syncRiders(); if (S.save.ftue === 3) ftueNext(4); persist(); return false; } return true; } });
      return;
    }
    if (f.kind === 'toy') {
      const isNew = !S.save.toys.includes(f.id); if (isNew) { S.save.toys.push(f.id); noteAlbum(); } if (f.golden && !S.save.golden.includes(f.id)) { S.save.golden.push(f.id); noteAlbum(); }
      const m = Cast.buildToy(world, f.id, f.golden); m.position.set(wx, 0.1, wz); world.scene.add(m); audio.sfx(f.golden ? 'rare' : 'toy'); reward(f.golden ? 'rare' : 'toy'); fx.burst('dust', wx, 0.2, wz, 6);
      if (f.golden) { director.play({ id: 'rare', pri: 4, len: 1.4, at: () => ({ x: kt.x, z: kt.z }), dist: camDist() * 0.75, yaw: 0.7, orbit: true }); fx.ring(wx, wz, '#f6c95a', 0.4, 4.5, 0.9, 0.6); }
      const c = ui.chip(`${ICONS.toy}<span class="num">${S.save.toys.length}/${cfg.toys.length}</span>`, 2); void c;
      S.ents.push({ t: 0, step(dt) { this.t += dt; const t = this.t; if (f.golden && Math.random() < 0.5) fx.burst('gold', m.position.x, m.position.y, m.position.z, 1, { spread: 0.25 });
        if (t < 0.6) { const k = t / 0.6; m.position.y = 0.1 + Math.sin(k * Math.PI) * 1.5 + k * 0.9; m.rotation.x = k * 9; m.rotation.y = k * 5; m.scale.setScalar(1 + k * 0.5); }
        else if (t < 1.0) { const k = ease((t - 0.6) / 0.4), bp = buzzy.bonnetWorld(v3); m.position.set(lerp(wx, bp.x, k), lerp(1.0, bp.y + 0.05, k), lerp(wz, bp.z, k)); m.rotation.x *= 0.8; }
        else if (t < 2.0) { const bp = buzzy.bonnetWorld(v3); m.position.set(bp.x, bp.y + 0.05 + Math.abs(Math.sin(t * 8)) * 0.04, bp.z); m.rotation.set(0, t * 2, 0); }
        else { const k = (t - 2) / 0.35, bp = buzzy.bonnetWorld(v3); m.position.set(bp.x, bp.y + k * 2.2, bp.z); m.scale.setScalar(Math.max(0.01, 1.5 * (1 - k))); if (k >= 1) { world.scene.remove(m); m.geometry.dispose(); fx.burst('spark', bp.x, bp.y + 2, bp.z, 4); persist(); return false; } }
        return true; } });
      return;
    }
    if (f.kind === 'gift') {
      const isNew = !S.save.gifts.includes(f.id), box = Cast.buildGiftBox(world), hat = Cast.buildGift(world, f.id); box.group.position.set(wx, 0, wz); box.group.scale.setScalar(0.01); world.scene.add(box.group); hat.visible = false; world.scene.add(hat);
      if (isNew) { S.save.gifts.push(f.id); noteAlbum(); } audio.sfx('toy'); reward('gift');
      director.play({ id: 'gift', pri: 3, len: 1.5, at: () => ({ x: lerp(wx, kt.x, 0.5), z: lerp(wz, kt.z, 0.5) }), dist: camDist() * 0.66, bars: true });
      S.ents.push({ t: 0, step(dt) { this.t += dt; const t = this.t;
        if (t < 0.35) { const k = t / 0.35; box.group.scale.setScalar(k * (1 + Math.sin(k * Math.PI) * 0.3)); }
        else if (t < 0.8) { const k = (t - 0.35) / 0.45; box.lid.position.set(k * 0.7, 0.36 + Math.sin(k * Math.PI) * 0.9, 0); box.lid.rotation.z = -k * 2.4; if (!hat.visible) { hat.visible = true; audio.sfx('chime'); fx.burst('spark', wx, 0.8, wz, 12); fx.burst('confetti', wx, 0.6, wz, 14); } hat.position.set(wx, 0.3 + k * 1.3, wz); hat.rotation.y = k * 6; hat.scale.setScalar(0.3 + k * 0.5); }
        else if (t < 1.5) { const k = ease((t - 0.8) / 0.7), hp = buzzy.chibi.bones.head.getWorldPosition(v3); hat.position.set(lerp(wx, hp.x, k), lerp(1.6, hp.y - 0.1, k) + Math.sin(k * Math.PI) * 0.6, lerp(wz, hp.z, k)); hat.rotation.y += dt * 8; box.group.scale.setScalar(Math.max(0.01, 1 - k)); }
        else { world.scene.remove(hat, box.group); hat.geometry.dispose(); disposeTree(box.group); S.save.wear = f.id; wear(f.id); S.wave = 1.2; fx.burst('spark', kt.x, 1.6, kt.z, 8); audio.sfx('ribbon'); persist(); return false; }
        return true; } });
    }
  }
  function noteAlbum() { S.newAlbum = true; ui.showButtons(true, S.save.cur > 0 || S.save.up.deck + S.save.up.engine + S.save.up.baler > 0); ui.dot('album', true); }
  /** Up to three found friends ride along: crawlers sit on the bonnet, fliers circle Buzzy. */
  function syncRiders() {
    const want = S.save.ride.filter((id) => S.save.friends.includes(id)).slice(-3);
    for (const r of S.riders.filter((q) => !want.includes(q.id))) { r.f.group.parent.remove(r.f.group); disposeTree(r.f.group); } S.riders = S.riders.filter((q) => want.includes(q.id));
    for (const id of want) if (!S.riders.some((q) => q.id === id)) { const f = Cast.buildFriend(world, id); (f.fly ? buzzy.group : buzzy.bonnet).add(f.group); S.riders.push({ id, f }); }
    let sit = 0, fl = 0; for (const r of S.riders) { if (r.f.fly) r.k = fl++; else { r.f.group.position.set([-0.2, 0.2, 0][sit % 3], 0, [0, 0.02, -0.26][sit % 3]); r.f.group.rotation.y = Math.PI; sit++; } }
  }

  // ---- stars, gate, finale
  function onStar(s, k) {
    const r = rec(s.n), g = s.g, paid = r.stars < k; r.stars = Math.max(r.stars, k); r.best = Math.max(r.best, L.percent(g)); reward('star');
    const gx = s.dress.gate.x, gz = s.dress.gate.z; audio.sfx('star'); if (paid) later(() => award(L.tip(cfg, g, k), s.nb.group.position.x, 1, s.nb.group.position.z), 500);
    if (k === 1) {
      s.gateOpen = true; audio.sfx('gate'); fx.burst('spark', gx, 1, gz, 12); fx.burst('petal', gx, 1.2, gz, 16, { dz: 2 }); s.nbMode = 'cheer'; s.nbT = 0;
      if (!S.save.neighbours.includes(g.id)) { S.save.neighbours.push(g.id); noteAlbum(); }
      director.play({ id: 'gate', pri: 3, len: 1.2, at: () => ({ x: gx, z: gz + 1.5 }), dist: camDist() * 0.82, bars: true });
      if (s.n < cfg.gardens.length - 1) { const nx = slot(s.n + 1); if (nx.stars === 0 && !S.cuts[s.n + 1]) { nx.grow = 0; nx.lawn.setGrow(0); } }
    }
    if (k === 3) { fx.burst('confetti', S.kart.x, 1, S.kart.z, 30); director.play({ id: 'stars3', pri: 4, len: 1.8, at: () => ({ x: s.ox + g.w / 2, z: s.oz + g.d / 2 }), dist: Math.max(camDist(), g.d * 1.25, g.w * 2.3), pitch: 1.2, slow: [0.5, 0.4], bars: true, force: true }); if (!s.finale) finale(s, false); else if (s.n > 0) slip(s); }
    persist();
  }
  /** The flowers bloom across the lawn in the order it was mown; from garden 2 the receipt slips in. */
  function finale(s, cam = true) {
    if (s.finale) return; s.finale = true; s.bloom = 0; s.nbMode = 'run'; s.nbT = 0; audio.sfx('grow'); reward('finale');
    const g = s.g, r = rec(s.n);
    if (g.beds.length && !S.touched && !r.rib.includes('gentle')) r.rib.push('gentle');
    if (S.flow.ribbon && !r.rib.includes('flow')) r.rib.push('flow');
    if (g.pattern && L.styleShare(g, g.pattern) >= 0.8 && !r.rib.includes('style')) r.rib.push('style');
    if (cam) director.play({ id: 'finale', pri: 3, len: 1.6, at: () => ({ x: s.ox + g.w / 2, z: s.oz + g.d * 0.45 }), dist: Math.max(camDist() * 1.15, g.d * 1.05), pitch: 1.05, force: true });
    if (s.n > 0) slip(s);
    if (hasLib && lib.addPlayerScoreToLeaderboard && play) { try { Promise.resolve(lib.addPlayerScoreToLeaderboard(Math.floor(S.save.m2))).catch(() => {}); } catch (e) { /* guests cannot post */ } }
    persist();
  }
  const canShare = play && hasLib && typeof lib.share === 'function';
  function slip(s) {
    const r = rec(s.n), pct = L.percent(s.g), tip = [1, 2, 3].filter((k) => k <= s.stars).reduce((a, k) => a + L.tip(cfg, s.g, k), 0);
    ui.receipt({ face: face(s.n), name: T('g_' + s.g.id), pct, stars: s.stars, ribbons: r.rib, tip, onStar: () => audio.sfx('star'), share: canShare && s.stars === 3 ? () => { audio.sfx('click'); Promise.resolve().then(() => lib.share({ title: T('title'), text: T('share').replace('{g}', T('g_' + s.g.id)) })).catch(() => {}); } : null }, 3.2);
    S.slipAt = S.t; audio.sfx('rustle');
  }

  // ---- upgrades
  /** Buys the next level of an upgrade if the coins are there. Returns true when bought. */
  function buy(kind, fromPad) {
    const lv = S.save.up[kind], price = L.upPrice(cfg, kind, lv); if (!(S.save.coins >= price)) return false;
    S.save.coins -= price; S.shown = S.save.coins; ui.setCoins(S.shown, true); S.save.up[kind] = lv + 1; const kt = S.kart; reward('upgrade');
    audio.sfx('upgrade'); fx.burst('cloud', kt.x, 0.8, kt.z, 22, { spread: 0.7 }); fx.ring(kt.x, kt.z, '#fff1d6', 0.5, 3.2, 0.6); later(() => { dressBuzzy(); buzzy.honk(); fx.burst('spark', S.kart.x, 1.2, S.kart.z, 12); }, 380);
    const firstKind = lv === 0, big = lv + 1 === 5 || lv + 1 === 9;
    if (fromPad && (firstKind || big)) director.play({ id: 'upgrade', pri: 3, len: 1.2, at: () => ({ x: S.kart.x, z: S.kart.z }), dist: camDist() * 0.6, pitch: 0.62, bars: true });
    if (S.save.ftue === 5) ftueNext(6); ui.showButtons(S.save.friends.length + S.save.toys.length + S.save.gifts.length > 0, true); persist(); return true;
  }
  function stepPads(dt) {
    const kt = S.kart; let near = null;
    for (const s of S.slots.values()) for (const p of s.pads) {
      const lv = S.save.up[p.kind], price = L.upPrice(cfg, p.kind, lv), can = S.save.coins >= price && s.gateOpen, d = Math.hypot(kt.x - p.x, kt.z - p.z), onIt = d < PAD_R && can;
      p.t = onIt ? p.t + dt : Math.max(0, p.t - dt * 2); p.setFill(clamp(p.t / cfg.upgrades.padStayS, 0, 1));
      p.emblem.position.y = 0.3 + (can ? Math.sin(S.t * 3 + p.x) * 0.07 + 0.08 : 0); p.emblem.rotation.y += dt * (can ? 1.2 : 0.2); p.can = can; p.price = price;
      if (p.t >= cfg.upgrades.padStayS) { p.t = 0; buy(p.kind, true); }
      if (d < 9) near = near || s;
    }
    S.padSlot = near;
  }

  // ---- FTUE: an interactive spotlight; each step ends when the player does the real thing
  function ftueNext(n) { if (S.save.ftue < n) { S.save.ftue = n; audio.sfx('ribbon'); if (n >= 7) { S.save.ftueDone = true; ui.showSkip(false); } } }
  function ftueTarget() {
    if (!play || S.save.ftueDone || S.sheet) return null; const s = cur(), kt = S.kart, f = S.save.ftue, u = ui.unit();
    if (f === 0) { const p = toScreen(kt.x, 0.6, kt.z - 1); return { x: p.x, y: p.y, r: 250 * u, hint: S.stick.on ? null : 'thumb', hx: p.x, hy: p.y + 330 * u, dim: 0.4, world: null }; }
    if (f === 1) { const p = toScreen(kt.x, 0.5, kt.z - 1.2); return { x: p.x, y: p.y, r: 330 * u, dim: 0.3 }; }
    if (f === 2) { const b = S.bales.find((q) => q.state === 'rest'); if (!b) return null; const p = toScreen(b.x, 0.4, b.z); return { x: p.x, y: p.y, r: 120 * u, hint: 'ring', dim: 0.4, world: b, on: p.on }; }
    if (f === 3) { const fd = s.g.finds.find((q) => q.kind === 'friend' && !q.found); if (!fd) { if (!S.ents.length) S.save.ftue = 4; return null; } if (L.coverage(s.g) < 0.3) return null; const w = { x: s.ox + fd.x, z: s.oz + fd.z }, p = toScreen(w.x, 0.4, w.z); return { x: p.x, y: p.y, r: 120 * u, hint: 'ring', dim: 0.35, world: w, on: p.on }; }
    if (f === 4) { if (!s.gateOpen || S.cur > 0) { if (S.cur > 0) S.save.ftue = 5; return null; } const w = { x: s.dress.gate.x, z: s.dress.gate.z }, p = toScreen(w.x, 0.6, w.z); return { x: p.x, y: p.y, r: 170 * u, dim: 0.3, world: w, on: p.on }; }
    if (f === 5) { const ps = [...S.slots.values()].flatMap((q) => q.pads).filter((p) => p.can); if (!ps.length) return null; const w = ps.sort((a, b) => Math.hypot(a.x - kt.x, a.z - kt.z) - Math.hypot(b.x - kt.x, b.z - kt.z))[0]; if (Math.hypot(w.x - kt.x, w.z - kt.z) > 12) return null; const p = toScreen(w.x, 0.4, w.z); return { x: p.x, y: p.y, r: 130 * u, hint: 'ring', dim: 0.35, world: w, on: p.on }; }
    if (f === 6) { if (!S.newAlbum) return null; const r = ui.E.album.getBoundingClientRect(), rr = root.getBoundingClientRect(); return { x: r.left - rr.left + r.width / 2, y: r.top - rr.top + r.height / 2, r: 70 * u, hint: 'ring', dim: 0.3 }; }
    return null;
  }

  // ---- guidance: a dotted petal trail from Buzzy to the goal, and an arrow beside Buzzy when the goal is off screen
  const dotGeo = new THREE.CircleGeometry(0.11, 10); dotGeo.rotateX(-Math.PI / 2);
  const dotMat = new THREE.MeshBasicMaterial({ color: 0xfff1d6, transparent: true, opacity: 0.95, depthWrite: false }), dots = [];
  for (let i = 0; i < 12; i++) { const m = new THREE.Mesh(dotGeo, dotMat); m.visible = false; m.renderOrder = 3; world.scene.add(m); dots.push(m); }
  function stepGuide(dt, ft) {
    const s = cur(), kt = S.kart, cov = L.coverage(s.g); let goal = null;
    if (ft && ft.world) goal = ft.world;
    else if (play && !S.sheet) {
      if (cov >= cfg.guide.missFrom && cov < 1 && S.noProg > cfg.guide.missAfterS && Math.abs(kt.z - s.oz - s.g.d / 2) < s.g.d / 2 + 1) { S.guideT -= dt; if (S.guideT <= 0 || !S.patch) { S.guideT = 0.8; const p = L.nearestUncut(s.g, kt.x - s.ox, kt.z - s.oz); S.patch = p ? { x: s.ox + p.x, z: s.oz + p.z } : null; if (S.patch) fx.burst('spark', S.patch.x, 0.3, S.patch.z, 3, { spread: 0.2 }); } goal = S.patch; }
      else if (s.gateOpen && S.cur < cfg.gardens.length - 1 && (cov >= 1 || S.noProg > 8) && kt.z > s.oz) goal = { x: s.dress.gate.x, z: s.dress.gate.z - 1.5 };
      else if (S.cur < cfg.gardens.length - 1 && s.gateOpen && kt.z <= s.oz && kt.z > s.oz - LANE_M) { const nx = S.slots.get(S.cur + 1); if (nx) goal = { x: 0, z: nx.oz + nx.g.d - 1 }; }
    }
    S.guide = goal; let shown = 0;
    if (goal) {
      const dx = goal.x - kt.x, dz = goal.z - kt.z, d = Math.hypot(dx, dz), n = Math.min(dots.length, Math.floor((d - 1.4) / 0.75));
      for (let i = 0; i < n; i++) { const k = 1.2 + (i + (S.t * 1.6) % 1) * 0.75, m = dots[i]; if (k > d - 0.3) continue; m.position.set(kt.x + dx / d * k, 0.16, kt.z + dz / d * k); m.scale.setScalar(0.7 + 0.3 * Math.sin((i / n) * Math.PI)); m.visible = true; shown = Math.max(shown, i + 1); }
      const p = toScreen(goal.x, 0.3, goal.z), top = (32 + 80 + 16) * ui.unit();
      if (!p.on || p.y < top) { const h = toScreen(kt.x, 0.8, kt.z), a = Math.atan2(p.x - h.x, -(p.y - h.y)), rr = 130 * ui.unit(); ui.arrow(true, h.x + Math.sin(a) * rr, Math.max(top + 40 * ui.unit(), h.y - Math.cos(a) * rr), a); } else ui.arrow(false);
    } else ui.arrow(false);
    for (let i = 0; i < dots.length; i++) if (i >= shown || !goal) dots[i].visible = false;
  }

  // ---- input: a floating one-thumb stick anywhere on the screen, or the arrow keys / WASD
  const K = cfg.kart;
  if (play) {
    const pt = (e) => { const r = root.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
    on(canvas, 'pointerdown', (e) => { audio.unlock(); if (S.stick.on) return; const [x, y] = pt(e), st = S.stick; st.on = true; st.id = e.pointerId; st.ox = st.sx = x; st.oy = st.sy = y; st.mag = 0; st.moved = 0; st.t0 = performance.now(); try { canvas.setPointerCapture(e.pointerId); } catch (er) { /* synthetic pointer */ } });
    on(canvas, 'pointermove', (e) => {
      const st = S.stick; if (!st.on || e.pointerId !== st.id) return;
      const u = ui.unit(), [x, y] = pt(e); let dx = x - st.ox, dy = y - st.oy; const len = Math.hypot(dx, dy), drift = K.stickDriftPx * u * 2;
      st.moved = Math.max(st.moved, Math.hypot(x - st.sx, y - st.sy));
      if (len > drift) { st.ox += dx / len * (len - drift); st.oy += dy / len * (len - drift); dx = x - st.ox; dy = y - st.oy; } // the base follows a long drag
      const l2 = Math.hypot(dx, dy); st.mag = l2 < K.stickDeadPx * u * 2 ? 0 : clamp(l2 / (K.stickFullPx * u * 2), 0, 1); st.dx = l2 ? dx / l2 : 0; st.dz = l2 ? dy / l2 : 0;
      if (st.moved > cfg.cine.cancelDragPx * u * 2 && director.active() && director.id() !== 'stars3') director.cancel();
    });
    const up = (e) => { const st = S.stick; if (e.pointerId !== st.id || !st.on) return; st.on = false; st.mag = 0; if (e.type === 'pointerup' && st.moved < 10 && performance.now() - st.t0 < 350) tapAt(st.sx, st.sy); };
    on(canvas, 'pointerup', up); on(canvas, 'pointercancel', up);
    on(window, 'keydown', (e) => { if (e.repeat) return; audio.unlock(); S.keys[e.code] = true; if (e.code === 'Space') honk(); if (e.code === 'KeyM') ui.E.mute.click(); if (e.code === 'Tab') { e.preventDefault(); if (ui.sheetOpen()) ui.closeSheet(); else if (!ui.E.album.hidden) ui.E.album.click(); } if (e.code === 'Escape') ui.closeSheet(); });
    on(window, 'keyup', (e) => { S.keys[e.code] = false; }); on(window, 'blur', () => { S.keys = {}; S.stick.on = false; S.stick.mag = 0; });
    on(document, 'visibilitychange', () => { if (document.hidden) { S.keys = {}; S.stick.on = false; S.stick.mag = 0; persist(); } });
  }
  function tapAt(x, y) { const h = toScreen(S.kart.x, 0.7, S.kart.z); if (Math.hypot(x - h.x, y - h.y) < 110 * ui.unit()) honk(); }
  function honk() { if (S.honkT > 0) return; S.honkT = K.honkCooldownS; buzzy.honk(); audio.sfx('honk'); fx.ring(S.kart.x, S.kart.z, '#fff1d6', 0.6, 2.6, 0.5, 0.5, 0.5); fx.ring(S.kart.x, S.kart.z, '#fff1d6', 0.4, 1.9, 0.6, 0.4, 0.5); S.jump = 0.5; const s = cur(); if (s.nbMode === 'idle' || s.nbMode === 'wave') { s.nbMode = 'wave'; s.nbT = 0; } }
  function wish() {
    if (S.sheet) return [0, 0];
    let dx = S.stick.dx * S.stick.mag, dz = S.stick.dz * S.stick.mag; const k = S.keys;
    const kx = (k.ArrowRight || k.KeyD ? 1 : 0) - (k.ArrowLeft || k.KeyA ? 1 : 0), kz = (k.ArrowDown || k.KeyS ? 1 : 0) - (k.ArrowUp || k.KeyW ? 1 : 0);
    if (kx || kz) { const l = Math.hypot(kx, kz); dx = kx / l; dz = kz / l; }
    if (S.auto) { dx = S.auto.dx; dz = S.auto.dz; }
    return [dx, dz];
  }

  // ---- collision: the garden's own rule inside the fence, a wide lane outside, the gaps at the fence lines
  function blockedAt(s, lx, lz) {
    const g = s.g, rad = K.radiusM, off = Math.abs(lx - g.w / 2), inGap = off < L.GATE_HALF_M - rad * 0.6, last = s.n === cfg.gardens.length - 1;
    if (lz < -rad) return off > LANE_HALF_W - rad || lz < (last ? -LANE_M / 2 : -LANE_M - 1);
    if (lz > g.d + rad) return off > LANE_HALF_W - rad || lz > g.d + (s.n === 0 ? 3 : LANE_M + 1);
    if (lz < rad) return !(inGap && s.gateOpen);
    if (lz > g.d - rad) return !inGap;
    return L.blocked(g, lx, lz, rad, s.gateOpen);
  }
  function slide(s, x, z, dx, dz) {
    const n = Math.max(1, Math.ceil(Math.hypot(dx, dz) / (s.g.cell * 2))); let hit = false;
    for (let i = 0; i < n; i++) {
      const sx = dx / n, sz = dz / n;
      if (!blockedAt(s, x + sx, z + sz)) { x += sx; z += sz; continue; }
      hit = true;
      if (!blockedAt(s, x + sx, z)) x += sx; else if (!blockedAt(s, x, z + sz)) z += sz;
      else if (blockedAt(s, x, z)) { // already inside something (a rounding edge): any step that gains clearance is allowed, so Buzzy is never stuck
        const c0 = L.clearAt(s.g, x, z); if (L.clearAt(s.g, x + sx, z + sz) > c0) { x += sx; z += sz; } else if (L.clearAt(s.g, x + sx, z) > c0) x += sx; else if (L.clearAt(s.g, x, z + sz) > c0) z += sz;
      }
    }
    return { x, z, hit };
  }

  // ---- one step of the game
  function step(dt) {
    S.t += dt; S.save.playS += dt; const kt = S.kart, s = cur(), g = s.g;
    const [wx, wz] = wish(), wm = Math.hypot(wx, wz), top = topSpeed();
    const ka = 1 - Math.exp(-dt / (wm > 0.01 ? K.accelS : K.stopS) * 3);
    kt.vx += (wx * top - kt.vx) * ka; kt.vz += (wz * top - kt.vz) * ka; kt.speed = Math.hypot(kt.vx, kt.vz);
    let turn = 0;
    if (wm > 0.05) { const want = Math.atan2(-wx, -wz); let da = want - kt.ang; da = Math.atan2(Math.sin(da), Math.cos(da)); kt.ang += clamp(da, -K.turnRate * dt, K.turnRate * dt); turn = clamp(da * 1.5, -1, 1); }
    kt.turn += (turn - kt.turn) * Math.min(1, dt * 10);
    const lx0 = kt.x - s.ox, lz0 = kt.z - s.oz, r = slide(s, lx0, lz0, kt.vx * dt, kt.vz * dt), lx = r.x, lz = r.z, went = Math.hypot(lx - lx0, lz - lz0);
    if (r.hit) { kt.vx *= 0.7; kt.vz *= 0.7; }
    kt.x = s.ox + lx; kt.z = s.oz + lz; S.moved += went; S.idle = went > 0.002 ? 0 : S.idle + dt;
    if (S.save.ftue === 0 && S.moved >= cfg.ftue.driveM) ftueNext(1);
    // cut
    S.fresh = 0; let share = 0;
    if ((went > 0.0005 || wm > 0.05) && lz > -1 && lz < g.d + 1) { // pushing against a rock or the fence still cuts what the deck faces
      const c = L.cutSweep(cfg, g, lx0, lz0, lx, lz, kt.ang, deckW(), K.deckAheadM);
      share = c.cells ? c.met / c.cells : 0;
      if (c.rect) s.lawn.dirty();
      if (c.cut > 0) {
        const m2 = c.cut * g.cell * g.cell, fxn = -Math.sin(kt.ang), fzn = -Math.cos(kt.ang); S.fresh = c.cut; S.save.m2 += m2; S.noProg = 0; S.patch = null;
        S.bale.m2 += m2; S.bale.fs += m2 * S.flow.v; S.bale.wet += c.wet * g.cell * g.cell;
        S.m2Note += m2; if (S.m2Note >= 1) { S.m2Note -= 1; audio.note(); reward('note'); }
        const n = Math.min(6, 1 + c.cut / 14), hw = deckW() / 2;
        for (let i = 0; i < 2; i++) { const sd = i ? 1 : -1, px = kt.x + fxn * 0.9 + fzn * sd * hw * Math.random(), pz = kt.z + fzn * 0.9 - fxn * sd * hw * Math.random(); fx.burst('clip', px, 0.25, pz, n / 2, { dx: -fxn * 1.5 + kt.vx * 0.4, dz: -fzn * 1.5 + kt.vz * 0.4 }); }
        if (Math.random() < 0.35) fx.burst('mist', kt.x + fxn * 1.0, 0.2, kt.z + fzn * 1.0, 1, { spread: hw });
        if (L.districtOf(S.cur) === 2 && Math.random() < 0.08) fx.burst('fly', kt.x + fxn, 0.3, kt.z + fzn, 1, { spread: hw });
        audio.sfx('cut');
        for (const f of g.finds) if (!f.found && cellCut(g, f.x, f.z)) reveal(s, f);
        const size = L.upValue(cfg, 'baler', S.save.up.baler); if (S.bale.m2 >= size || (!S.firstBale && S.save.ftue <= 2 && S.cur === 0 && S.bale.m2 >= cfg.finds.firstBaleM2)) popBale();
        const cov = L.coverage(g); if (S.save.ftue === 1 && cov >= cfg.ftue.cutAt) ftueNext(2);
        const ms = Math.floor(cov * 4); if (ms > S.milestone && ms < 4) { S.milestone = ms; audio.sfx('chime'); fx.ring(kt.x, kt.z, '#f6b93b', 0.6, 2.4, 0.6, 0.4); reward('milestone'); }
        const st = L.starsFor(cfg, g); for (let k = s.stars + 1; k <= st; k++) { s.stars = k; onStar(s, k); }
        ui.setProgress(cov, L.percent(g), s.stars);
      }
    }
    if (S.fresh === 0) S.noProg += dt;
    S.cutting += ((S.fresh > 0 ? 1 : 0) - S.cutting) * Math.min(1, dt * 8);
    const wasFull = S.flow.v >= 1, hadRibbon = S.flow.ribbon; L.flowStep(cfg, S.flow, share, dt);
    if (!wasFull && S.flow.v >= 1) { audio.sfx('ribbon'); fx.ring(kt.x, kt.z, '#f3a0b8', 0.5, 2.2, 0.5, 0.5); reward('flow'); }
    if (!hadRibbon && S.flow.ribbon) { ui.chip(`${ICONS.ribbon}`, 2); audio.sfx('chime'); reward('ribbon'); }
    if (S.flow.v >= 1 && kt.speed > 1 && Math.random() < dt * 14) { const tr = TRAILS[S.save.use.trail] || TRAILS.petals; fx.burst(tr[0], kt.x + Math.sin(kt.ang) * 0.7, 0.3, kt.z + Math.cos(kt.ang) * 0.7, 1, { spread: 0.4, up: 0.5, col: tr[1] }); }
    // flower beds bow when driven through
    for (const b of s.dress.beds) { const inx = Math.abs(kt.x - b.x) < b.w / 2 + 0.3 && Math.abs(kt.z - b.z) < b.d / 2 + 0.3; if (inx && b.bow < 0.2) { if (!S.touched) audio.sfx('oops'); S.touched = true; fx.burst('petal', b.x, 0.4, b.z, 6, { spread: 0.5 }); } b.bow = inx ? 1 : Math.max(0, b.bow - dt / 2); b.mesh.scale.y = 1 - 0.6 * ease(b.bow); }
    // gate, grow wave, finale at the gate
    if (s.gateOpen && s.gateT < 1) { s.gateT = Math.min(1, s.gateT + dt / 0.8); const e = s.gateT; s.dress.gate.set(1 - Math.pow(1 - e, 3) + Math.sin(e * Math.PI) * 0.12); }
    for (const q of S.slots.values()) { if (q.grow < 1) { q.grow = Math.min(1, q.grow + dt / 1.4); q.lawn.setGrow(ease(q.grow)); } if (q.bloom >= 0 && q.bloom < 1.2) { q.bloom = Math.min(1.2, q.bloom + dt / 1.6 * 1.2); q.lawn.setBloom(q.bloom); } }
    if (s.gateOpen && !s.finale && lz < 2.2 && Math.abs(lx - g.w / 2) < 2.5) finale(s);
    if (S.save.ftue === 4 && S.cur === 0 && lz < -0.5) ftueNext(5);
    if (ui.receiptOpen() && S.t - S.slipAt > 0.8 && wm > 0.3) ui.receipt(null);
    // into the next garden (or back into the one before) once past the middle of the lane
    const lastG = S.cur === cfg.gardens.length - 1;
    if (!lastG && lz < -LANE_M / 2) enter(S.cur + 1, false); else if (S.cur > 0 && lz > g.d + LANE_M / 2) enter(S.cur - 1, false);
    stepBales(dt); stepPads(dt);
    for (let i = S.ents.length - 1; i >= 0; i--) if (!S.ents[i].step(dt)) S.ents.splice(i, 1);
    S.honkT = Math.max(0, (S.honkT || 0) - dt); S.jump = Math.max(0, (S.jump || 0) - dt); S.wave = Math.max(0, (S.wave || 0) - dt);
    // exhaust puffs in rhythm with the engine
    S.puffT -= dt * (0.6 + kt.speed / top * 1.6); if (S.puffT <= 0) { S.puffT = 0.22; const ch = buzzy.chimneyWorld(v3); fx.burst('puff', ch.x, ch.y, ch.z, 1); }
    S.saveT += dt; if (S.saveT > cfg.save.everyS && S.cutting > 0.1) { S.saveT = 0; persist(); }
  }

  // ---- edit mode (the feed card): Buzzy mows a tidy zigzag by itself
  const demo = { dir: -1, shift: 0 };
  function demoDrive() { const s = cur(), lz = S.kart.z - s.oz, lx = S.kart.x - s.ox; if (demo.shift > 0) { S.auto = { dx: lx > s.g.w - 1.5 ? -0.7 : 0.7, dz: 0 }; demo.shift--; } else { S.auto = { dx: 0, dz: demo.dir * 0.7 }; if ((demo.dir < 0 && lz < 1.3) || (demo.dir > 0 && lz > s.g.d - 1.3)) { demo.dir = -demo.dir; demo.shift = 40; } } }

  // ---- frame
  let raf = 0, prev = 0; const padLabels = [];
  /** True when a world label would sit under the HUD's button column (labels never go under the HUD). */
  let colBox = null, colAt = -99;
  function underButtons(q) {
    if (S.frames - colAt > 30) { colAt = S.frames; const a = ui.E.mute.getBoundingClientRect(), b = ui.E.shop.getBoundingClientRect(), rr = root.getBoundingClientRect(), pad = 48 * ui.unit(); colBox = { x0: a.left - rr.left - pad, x1: a.right - rr.left + pad, y1: (b.height ? b.bottom : a.bottom + 2 * (a.height + 16 * ui.unit())) - rr.top + pad * 0.6 }; }
    return q.x > colBox.x0 && q.x < colBox.x1 && q.y < colBox.y1;
  }
  function frame(now) {
    if (dead.v) return; raf = requestAnimationFrame(frame);
    const raw = prev ? (now - prev) / 1000 : 0.016; prev = now; const real = clamp(raw, 0, 0.05);
    const w = root.clientWidth, h = root.clientHeight; if (w < 2 || h < 2) return; if (w !== W || h !== H) { W = w; H = h; ui.resize(w, h); } world.resize(w, h);
    const beat = director.update(real), dt = real * (beat ? beat.scale : 1);
    if (!play && !S.auto0) demoDrive();
    // dev:start
    for (let i = 0; i < (S.turbo | 0); i++) { if (window.__botTick) window.__botTick(); step(1 / 60); fx.update(1 / 60); }
    if (window.__botTick && S.turbo !== undefined) window.__botTick();
    // dev:end
    step(dt);
    const kt = S.kart; buzzy.group.position.set(kt.x, 0, kt.z); buzzy.group.rotation.y = kt.ang;
    buzzy.update(dt, S.t, { speed: kt.speed, turn: kt.turn, cutting: S.cutting, flow: S.flow.v, wave: S.wave > 0 ? Math.min(1, S.wave * 3) : 0, fill: clamp(S.bale.m2 / L.upValue(cfg, 'baler', S.save.up.baler), 0, 1), idle: S.idle });
    for (const r of S.riders) { r.f.update(S.t + r.k * 1.7 || S.t); if (r.f.fly) { const a = S.t * 1.1 + r.k * 2.1; r.f.group.position.set(Math.cos(a) * 1.0, 1.5 + Math.sin(a * 1.7) * 0.2, Math.sin(a) * 1.0); r.f.group.rotation.y = -a; } else r.f.group.position.y = S.jump > 0 ? Math.sin((0.5 - S.jump) / 0.5 * Math.PI) * 0.25 : 0; }
    for (const s of S.slots.values()) {
      s.lawn.update(S.t, kt.x, kt.z, clamp(kt.speed / 2, 0.35, 1));
      s.nbT += dt; if (s.nbMode === 'cheer' && s.nbT > 2) { s.nbMode = s.finale ? 'run' : 'wave'; s.nbT = 0; }
      if (s.nbMode === 'run') { const tx = s.ox + s.g.w / 2 + 1.2, tz = s.oz + Math.min(4, s.g.d * 0.4), p = s.nb.group.position, d = Math.hypot(tx - p.x, tz - p.z); if (d < 0.2) { s.nbMode = 'dance'; } else { const sp = Math.min(d, 3.2 * dt); p.x += (tx - p.x) / d * sp; p.z += (tz - p.z) / d * sp; s.nb.group.rotation.y = Math.atan2(tx - p.x, tz - p.z); } }
      else if (s.nbMode !== 'dance') s.nb.group.rotation.y = Math.atan2(kt.x - s.nb.group.position.x, kt.z - s.nb.group.position.z) * 0.6;
      s.nb.update(dt, S.t, s.nbMode);
    }
    if (L.districtOf(S.cur) === 2) cur().lawn.setLamp(kt.x - Math.sin(kt.ang) * 2.2, kt.z - Math.cos(kt.ang) * 2.2, 4.2, 1);
    const top = topSpeed();
    // dev:start
    if (S.camHold) { const c = S.camHold; world.placeCamera(c.x, c.z, c.dist, c.pitch, c.yaw || 0, c.lift || 0); } else
    // dev:end
    {
      // keep the garden in the frame: near a side fence the camera stops sliding and Buzzy drifts off-centre instead
      const cs = cur(), halfW = camDist() * Math.tan(cfg.camera.fov * Math.PI / 360) * world.camera.aspect, lo = cs.ox + halfW - cfg.camera.sideM, hi = cs.ox + cs.g.w - halfW + cfg.camera.sideM;
      const inG = kt.z > cs.oz - 1 && kt.z < cs.oz + cs.g.d + 1, cx = !inG ? kt.x : lo > hi ? cs.ox + cs.g.w / 2 : clamp(kt.x, lo, hi), fx = clamp(cx, kt.x - halfW * 0.55, kt.x + halfW * 0.55);
      world.follow(fx, kt.z, kt.vx / top, kt.vz / top, camDist() * (1 + cfg.camera.flowPull * (S.flow.v >= 1 && !calm() ? 1 : 0)), real, S.frames < 2);
      if (beat && beat.w > 0.001) { const c = world.cam, k = beat.w; world.placeCamera(lerp(c.x, beat.x, k), lerp(c.z, beat.z, k), lerp(c.dist, beat.dist || c.dist, k), lerp(world.pitch, beat.pitch || world.pitch, k), (beat.yaw || 0) * k, 0); }
    }
    ui.bars(beat ? beat.bars : 0);
    fx.update(dt); world.render(real);
    audio.tick(real, kt.speed / top, S.flow.v, S.cutting);
    if (play) {
      const st = S.stick; ui.stick(st.on && !S.sheet, st.ox, st.oy, st.dx * st.mag, st.dz * st.mag);
      const ft = ftueTarget(); ui.spot(ft && (ft.on !== false) ? ft : null); ui.showSkip(!S.save.ftueDone && S.save.ftue > 0 && S.save.ftue < 7); stepGuide(dt, ft);
      // price labels over the pads in view
      let li = 0; if (S.padSlot) for (const p of S.padSlot.pads) { const q = toScreen(p.x, 1.25, p.z); if (!q.on || q.y < (32 + 80 + 16 + 30) * ui.unit() || underButtons(q)) continue; let el = padLabels[li]; if (!el) { el = padLabels[li] = document.createElement('div'); el.className = 'padl paper'; ui.el.insertBefore(el, ui.el.firstChild); } li++; const key = p.kind + S.save.up[p.kind] + (p.can ? 1 : 0); if (el.dataset.k !== key) { el.dataset.k = key; el.innerHTML = p.price === Infinity ? ICONS.check : `${ICONS.coin}<span class="num">${p.price}</span>`; el.classList.toggle('no', !p.can); } el.style.display = 'flex'; el.style.translate = `${Math.round(q.x)}px ${Math.round(q.y)}px`; }
      for (; li < padLabels.length; li++) padLabels[li].style.display = 'none';
    }
    // adaptive quality: step down after a slow stretch, up after a long smooth one
    S.ms += (raw * 1000 - S.ms) * 0.05; S.frames++; world.smoothFrame(raw < 0.03);
    const Q = cfg.quality, bud = Q.budgetMs[world.tier];
    if (S.frames > 20 && !S.fixTier) { if (S.ms > bud) { S.slow += raw; S.fast = 0; } else { S.fast += raw; S.slow = Math.max(0, S.slow - raw); } }
    if (S.slow > Q.downAfterS && world.tier > 0) { setTier(world.tier - 1); S.slow = 0; } else if (S.fast > Q.upAfterS && world.tier < 2 && S.ms < Q.budgetMs[world.tier + 1] * 0.7 && !S.noUp) { setTier(world.tier + 1); S.fast = 0; }
    if (S.frames === 2) { root.classList.add('live'); S.firstFrameMs = performance.now(); if (window.__load && window.__load.done) window.__load.done(); }
  }
  function setTier(k) { if (k < world.tier) S.noUp = (S.downs = (S.downs || 0) + 1) > 1; world.setTier(k); fx.setTier(k); for (const s of S.slots.values()) s.lawn.setTier(k); }

  const G = { S, cfg, world, L, ui, fx, audio, T, Cast, buzzy, face, buy, wear, persist, setLang, dressBuzzy, syncRiders, later, award, LANGS,
    /** Rebuilds the gardens in view (after a stripe tint change), keeping every lawn as it is. */
    retint() { const x = S.kart.x, z = S.kart.z; for (const k of [...S.slots.keys()]) drop(k); enter(S.cur, false); S.kart.x = x; S.kart.z = z; },
    /** Drives Buzzy to garden n through a leaf wipe (the lane map). */
    travel(n, replay) { ui.closeSheet(); audio.sfx('whoosh'); ui.wipe(() => { for (const k of [...S.slots.keys()]) drop(k); if (replay) { S.replay = S.replay || {}; S.replay[n] = (S.replay[n] || 0) + 1; delete S.cuts[n]; } for (const b of [...S.bales]) collect(b, true); enter(n, true); world.follow(S.kart.x, S.kart.z, 0, 0, camDist(), 0, true); persist(); }); },
  };
  enter(S.save.cur, true); dressBuzzy(); fx.setTier(world.tier);
  ui.resize(root.clientWidth || 360, root.clientHeight || 640); ui.setCoins(0); refreshHud();
  world.follow(S.kart.x, S.kart.z, 0, 0, camDist(), 0, true);
  load();
  raf = requestAnimationFrame(frame);

  const api = {
    destroy() {
      if (dead.v) return; if (play && S.loaded && S.moved > 0.5) persist();
      dead.v = true; cancelAnimationFrame(raf); for (const f of offs) f(); for (const id of timers) clearTimeout(id);
      for (const k of [...S.slots.keys()]) drop(k); for (const b of S.bales) { world.scene.remove(b.m); b.m.geometry.dispose(); }
      world.scene.remove(southLane); southLane.geometry.dispose();
      for (const m of dots) world.scene.remove(m); dotGeo.dispose(); dotMat.dispose();
      fx.dispose(); audio.destroy(); ui.destroy(); world.destroy(); if (window.__mm === api) window.__mm = null;
    },
  };
  // dev:start
  window.__game = Object.assign(G, { step, setTier, slot: cur, director, toScreen, popBale, reveal, onStar, blockedAt, enter, ftueTarget, snapshot });
  if (qs.has('tier')) { S.fixTier = true; setTier(+qs.get('tier')); }
  // dev:end
  window.__mm = api;
  return api;
}

window.run = run;

// Outside Astrocade (?local): stand in for the host, read the config file and start.
if (typeof location !== 'undefined' && new URLSearchParams(location.search).has('local') && !window.lib) {
  const none = async () => ({});
  const store = { state: window.__seedSave || null }; window.__store = store;
  window.lib = { showGameParameters() {}, log() {}, getUserGameState: async () => ({ state: store.state }), saveUserGameState: async (s) => { store.state = JSON.parse(JSON.stringify(s)); }, addPlayerScoreToLeaderboard: none, getTopNEntriesFromLeaderboard: none,
    shouldUseTouchControls: () => matchMedia('(pointer: coarse)').matches, share: async (o) => { (window.__shares = window.__shares || []).push(o); }, haptics: { play() {}, start() {}, stop() {} }, getAsset: () => undefined };
  fetch('./game_config.json').then((r) => r.json()).then((c) => { window.gameConfig = c; run(new URLSearchParams(location.search).get('mode') || 'play'); });
}
