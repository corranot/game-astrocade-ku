// PROTOTYPE - NOT FOR PRODUCTION
/*
 * Fizzy Bath Bomb Maker
 * Make a bath bomb in six steps: pour powder, add color, stir, press, decorate,
 * then drop it in the bath. It fizzes away and a surprise toy pops out. Toys go
 * into a 16-slot album; once it is full, the same toys come back in gold.
 * Reasons to make another one: each finished bomb can unlock a mold, color,
 * topping or charm; decorating fills a Luck meter that raises rare-toy odds; a
 * duplicate toy pays a star, and stars buy a golden bomb (rare toy guaranteed).
 * There is no fail state: a step that is not finished only asks for a bit more.
 * The game shows the player's device language when it has strings for it (cfg.strings), else English.
 * Tunable numbers and all player-facing text live in game_config.json. Art and sound come from asset_map.json
 * when an asset exists; otherwise the game draws emoji and synthesizes sound.
 */
const W = 720, H = 1280, TAU = Math.PI * 2;
const BOWL = { x: 360, y: 660 }, ROW_Y = 960, BTN_Y = 1150, BALL = { x: 360, y: 560, r: 180 }, WATER_Y = 800;
const MUTE = { x: 478, y: 70 }, LANG_BTN = { y: 1100 };
const COLORS = [
  { n: 'Pink', c: [255, 92, 168] }, { n: 'Yellow', c: [255, 200, 0] }, { n: 'Blue', c: [64, 190, 255] },
  { n: 'Purple', c: [160, 110, 255] }, { n: 'Green', c: [70, 215, 120] },
];
const TOPS = [
  { e: '✨', n: 'Sparkle', id: 'top_sparkle' }, { e: '⭐', n: 'Star', id: 'top_star' }, { e: '💗', n: 'Heart', id: 'top_heart' },
  { e: '🌸', n: 'Flower', id: 'top_flower' }, { e: '🍬', n: 'Candy', id: 'top_candy' },
];
const MOLDS = ['Ball', 'Heart', 'Star', 'Donut', 'Flower'];
const PERKS = ['Twin charm', 'Golden charm']; // each doubles the chance of a double toy / a golden bomb
const RARITY = [{ c: '#27a8ff' }, { c: '#a352ff' }, { c: '#ff7a00' }, { c: '#f08a00' }];
const TOYS = [
  ['🦆', 'Ducky', 0], ['🐸', 'Froggy', 0], ['🐟', 'Fishy', 0], ['🐢', 'Turtle', 0], ['🐙', 'Octo', 0], ['🦀', 'Crabby', 0],
  ['🐳', 'Whale', 0], ['🐥', 'Chick', 0], ['🦄', 'Unicorn', 1], ['🐬', 'Dolphin', 1], ['🦈', 'Sharky', 1], ['🧸', 'Teddy', 1],
  ['🦋', 'Butterfly', 1], ['🐉', 'Dragon', 2], ['👑', 'Crown', 2], ['💎', 'Diamond', 3],
].map(([e, n, r]) => ({ e, n, r, id: 'toy_' + n.toLowerCase() }));
const IMAGE_IDS = [...TOYS.map(t => t.id), ...TOPS.map(t => t.id), 'bg_bathroom', 'jar_powder'];
const SOUND_IDS = ['sfx_pour', 'sfx_drop', 'sfx_stir', 'sfx_press', 'sfx_pop', 'sfx_splash', 'sfx_fizz', 'sfx_win', 'sfx_squeak', 'music'];
const DEBUG = location.search.includes('local');

let cv, g, cfg, mode, S, raf = 0, last = 0, bound = false, touched = false, board = null;
let ac = null, master = null;
let save = { owned: [], gold: [], made: 0, stars: 0, dupes: 0, muted: false, lang: null };
let lang = 'en', quality = 1, slow = 0;
const IMG = {}, GOLD = {}, BUF = {}, LOOPS = {};

const rnd = (a, b) => a + Math.random() * (b - a);
const rgb = (c, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
const backOut = t => 1 + 2.7 * Math.pow(t - 1, 3) + 1.7 * Math.pow(t - 1, 2);
/** Player-facing text for key `k` in the current language; English when the language lacks it. All text lives in cfg.strings. */
const T = k => (cfg.strings[lang] && cfg.strings[lang][k]) || cfg.strings.en[k] || k;
/** The first device language the game has strings for, else English. */
function detectLang() {
  for (const l of navigator.languages || [navigator.language || 'en']) { const base = String(l).toLowerCase().split('-')[0]; if (cfg.strings[base]) return base; }
  return 'en';
}
const rtl = () => cfg.rtl.includes(lang);
/** Mirror an x position for right-to-left languages, so rows and the HUD read from the right. */
const mx = x => rtl() ? W - x : x;
const slotX = i => mx(104 + i * 128);
const slotAt = p => Math.abs(p.y - ROW_Y) < 75 ? Math.round((mx(p.x) - 104) / 128) : -1;
const inBtn = p => Math.abs(p.x - 360) < 200 && Math.abs(p.y - BTN_Y) < 75;
const fillRule = kind => kind === 3 ? 'evenodd' : 'nonzero';
const albumDone = () => save.owned.length >= TOYS.length;
/** Bombs still to make before a mold, color, topping or charm opens. 0 means it is open. */
const bombsUntil = (kind, i) => Math.max(0, ...cfg.unlocks.filter(u => u.kind === kind && u.i === i).map(u => u.at - save.made));
const isOpen = (kind, i) => bombsUntil(kind, i) === 0;
const perk = i => cfg.unlocks.some(u => u.kind === 'perk' && u.i === i) && isOpen('perk', i) ? 2 : 1;
const luck = () => Math.min(1, S.tops.length / cfg.luckToppings);

/** Combine two saves so a late load never drops a toy won in this session. */
function mergeSave(a, b) {
  const union = (x, y) => [...new Set([...(x || []), ...(y || [])])];
  return {
    owned: union(a.owned, b.owned), gold: union(a.gold, b.gold), made: Math.max(a.made || 0, b.made || 0),
    stars: Math.max(a.stars || 0, b.stars || 0), dupes: Math.max(a.dupes || 0, b.dupes || 0), muted: !!(a.muted || b.muted), lang: a.lang || b.lang || null,
  };
}
const persist = () => { lib.saveUserGameState(save).catch(() => {}); };

/** Start a fresh bath bomb. The album in `save` is kept. Enough stars buy a golden bomb. */
function newBomb() {
  let mold = 0;
  for (let i = 0; i < MOLDS.length; i++) if (isOpen('mold', i)) mold = i; // newest mold first, so the next bomb looks new
  let golden = false;
  if (save.made >= 1) {
    if (save.stars >= cfg.starsForGolden) { save.stars -= cfg.starsForGolden; golden = true; }
    else golden = Math.random() < cfg.goldenChance * perk(1);
  }
  stopLoops();
  S = {
    step: 0, prog: 0, ok: false, okT: 0, t: 0, idle: 99, shake: 0,
    col: [255, 255, 255], cols: [], drops: 0, spots: [], falling: [], tops: [], top: 0, mold, golden,
    jar: 0, pourT: 0, tick: 0, swirl: 0, squash: 0, lastStamp: null, poke: 0,
    ball: { x: 360, y: 400, vy: 0, r: 110, held: false, loose: false, wet: false },
    fizz: 0, prizes: null, unlock: null, note: '', reveal: 0, album: false,
    ptr: { x: 0, y: 0, down: false }, P: [], F: [],
  };
}

/**
 * Pick a toy from `pool`. Rarity comes from cfg.rarityWeights; luck (0..1) scales the
 * rare tiers by up to 1 + cfg.luckBoost; minTier removes the tiers below it. When the
 * pool has no toy of the rolled tier, any toy of the pool is returned.
 * @param {() => number} random source of numbers in [0, 1)
 */
function pickToy(random = Math.random, luckNow = 0, minTier = 0, pool = TOYS) {
  const w = cfg.rarityWeights.map((v, i) => i < minTier ? 0 : i ? v * (1 + luckNow * cfg.luckBoost) : v);
  let r = random() * w.reduce((a, b) => a + b, 0), tier = minTier;
  while (tier < 3 && (r -= w[tier]) > 0) tier++;
  const same = pool.filter(t => t.r === tier), from = same.length ? same : pool;
  return from[random() * from.length | 0];
}
/**
 * Decide the prize of one bomb. A full album switches to the gold set. A toy already
 * owned gets one free reroll, and after cfg.pityDupes duplicates in a row the prize is
 * drawn only from the toys still missing.
 */
function drawPrize(random = Math.random) {
  const gold = albumDone(), have = gold ? save.gold : save.owned;
  const missing = TOYS.filter(t => !have.includes(t.e)), minTier = S.golden ? 1 : 0;
  const pity = save.dupes >= cfg.pityDupes && missing.length > 0;
  let toy = pickToy(random, luck(), minTier, pity ? missing : TOYS);
  if (!pity && have.includes(toy.e)) toy = pickToy(random, luck(), minTier);
  return { toy, gold, isNew: !have.includes(toy.e) };
}

/* ---------- sound ---------- */
function initAudio() {
  if (ac) return;
  try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { ac = null; return; }
  master = ac.createGain(); master.gain.value = save.muted ? 0 : 1; master.connect(ac.destination);
  for (const id of SOUND_IDS) {
    const a = lib.getAsset(id);
    if (!a) continue;
    fetch(a.url).then(r => r.arrayBuffer()).then(b => ac.decodeAudioData(b)).then(buf => { BUF[id] = buf; if (id === 'music' && touched) hum('music', true, 0.3); }).catch(() => {});
  }
}
function beep(f, d = 0.08, type = 'sine', v = 0.12, slide = 0) {
  if (!ac) return;
  const o = ac.createOscillator(), a = ac.createGain(), t = ac.currentTime;
  o.type = type; o.frequency.setValueAtTime(f, t);
  if (slide) o.frequency.linearRampToValueAtTime(f + slide, t + d);
  a.gain.setValueAtTime(v, t); a.gain.exponentialRampToValueAtTime(0.001, t + d);
  o.connect(a).connect(master); o.start(t); o.stop(t + d);
}
function voice(id, vol, loop) {
  const src = ac.createBufferSource(), a = ac.createGain();
  src.buffer = BUF[id]; a.gain.value = vol;
  // shortcut: mp3 decoding leaves a few ms of silence at both ends, so loops skip 40 ms each side; re-export as wav if a seam is still audible
  if (loop) { src.loop = true; src.loopStart = 0.04; src.loopEnd = Math.max(0.1, BUF[id].duration - 0.04); }
  src.connect(a).connect(master); src.start();
  return src;
}
/** Play a recorded sound if it is loaded, else the synthesized fallback. */
function sfx(id, fallback, vol = 0.8) { if (ac && BUF[id]) voice(id, vol, false); else fallback(); }
/** Keep a looping sound running while `on` is true. Returns false when the sound is not loaded. */
function hum(id, on, vol = 0.6) {
  if (!ac || !BUF[id]) return false;
  if (on && !LOOPS[id]) LOOPS[id] = voice(id, vol, true);
  else if (!on && LOOPS[id]) { LOOPS[id].stop(); delete LOOPS[id]; }
  return true;
}
function stopLoops() { for (const id of Object.keys(LOOPS)) if (id !== 'music') hum(id, false); lib.haptics.stop(); }
function setMuted(m) { save.muted = m; if (master) master.gain.value = m ? 0 : 1; }

/* ---------- feedback ---------- */
const toast = (txt, c = '#ff2d8a') => { S.F = [{ txt, c, life: 1.3 }]; };
function burst(x, y, n, col, speed = 320, grav = 700, r = 9) {
  n = Math.ceil(n * quality);
  for (let i = 0; i < n; i++) {
    const a = rnd(0, TAU), v = rnd(0.3, 1) * speed;
    S.P.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - speed * 0.4, g: grav, r: rnd(0.5, 1) * r, c: col || rgb(COLORS[i % 5].c), life: rnd(0.5, 1), max: 1 });
  }
}
const fanfare = n => [523, 659, 784, 1047, 1319].slice(0, n).forEach((f, i) => setTimeout(() => beep(f, 0.16, 'triangle', 0.14), i * 85));
function complete() {
  S.ok = true; S.okT = 0;
  const gold = S.step === 3 && S.golden;
  toast(gold ? T('goldenBomb') : T('d' + S.step), gold ? '#ffb800' : '#ff2d8a');
  burst(360, 520, gold ? 90 : 40, gold ? '#ffd000' : null, 520);
  sfx('sfx_pop', () => fanfare(gold ? 5 : 3));
  lib.haptics.play('success');
}
function advance() {
  hum('sfx_pour', false); hum('sfx_stir', false);
  S.step++; S.prog = 0; S.ok = false; S.okT = 0; S.idle = 0;
  beep(880, 0.1, 'triangle', 0.1, 300);
}
function locked(kind, i) { toast('🔒 ' + bombsUntil(kind, i), '#7a3cff'); beep(200, 0.1, 'square', 0.06); }

/* ---------- input ---------- */
function onDown(p) {
  if (ac && ac.state === 'suspended') ac.resume();
  if (!touched) { touched = true; if (S.step === 0) S.prog = 0; hum('music', true, 0.3); }
  S.ptr = { ...p, down: true }; S.idle = 0;
  if (S.album) {
    if (Math.abs(p.y - LANG_BTN.y) < 55 && Math.abs(p.x - 360) < 210) { const all = Object.keys(cfg.strings); lang = save.lang = all[(all.indexOf(lang) + 1) % all.length]; persist(); beep(700, 0.06); }
    else S.album = false;
    return;
  }
  if (p.y < 130 && Math.abs(p.x - mx(MUTE.x)) < 52) { setMuted(!save.muted); persist(); beep(700, 0.06); return; }
  if (p.y < 130 && Math.abs(p.x - mx(623)) < 90) { openAlbum(); return; }
  if (S.prizes) {
    if (S.reveal > cfg.revealButtonDelay && inBtn(p)) { newBomb(); beep(660, 0.12, 'triangle', 0.12, 400); }
    else if (S.reveal > 0.3) { S.poke = 1; burst(360, 560, 12, 'rgba(120,210,255,0.9)', 300, 500, 10); sfx('sfx_squeak', () => beep(900, 0.12, 'square', 0.08, 500)); lib.haptics.play('tap'); }
    return;
  }
  if (S.ok && (S.step === 1 || S.step === 4) && inBtn(p)) { advance(); return; }
  const slot = slotAt(p);
  if (S.step === 0 && !S.ok) S.pourT = cfg.tapPourSeconds; // a quick tap pours too: small kids tap, they do not hold
  else if (S.step === 1 && slot >= 0 && slot < COLORS.length) {
    if (!isOpen('color', slot)) return locked('color', slot);
    if (S.drops + S.falling.length >= cfg.maxDrops) return toast(T('bowlFull'), '#7a3cff');
    S.falling.push({ x: 360, y: 300, vy: 0, i: slot }); beep(500 + slot * 60, 0.07);
  } else if (S.step === 3 && !S.ok) {
    if (slot >= 0 && slot < MOLDS.length) { if (!isOpen('mold', slot)) return locked('mold', slot); S.mold = slot; beep(600 + slot * 70, 0.06); return; }
    S.prog += 1 / cfg.pressTaps; S.squash = 1; S.shake = 8;
    burst(360, 640, 10, rgb(S.col), 260, 500, 7);
    sfx('sfx_press', () => beep(180 + S.prog * 200, 0.1, 'square', 0.1)); lib.haptics.play('tap');
    if (S.prog > 0.999) { S.prog = 1; complete(); } // six taps of 1/6 sum to just under 1
  } else if (S.step === 4) {
    if (slot >= 0 && slot < TOPS.length) { if (!isOpen('top', slot)) return locked('top', slot); S.top = slot; beep(600 + slot * 70, 0.06); }
    else stamp(p);
  } else if (S.step === 5) {
    if (S.ball.wet) { S.fizz += cfg.tapFizzBoost; burst(S.ball.x, S.ball.y, 14, 'rgba(255,255,255,0.9)', 300, -500, 10); beep(rnd(900, 1500), 0.05, 'sine', 0.08); }
    else S.ball.held = true;
  }
}
function onMove(p) {
  if (!S.ptr.down) return;
  const dist = Math.hypot(p.x - S.ptr.x, p.y - S.ptr.y);
  S.ptr.x = p.x; S.ptr.y = p.y; S.idle = 0;
  if (S.step === 2 && !S.ok && Math.hypot(p.x - BOWL.x, p.y - BOWL.y) < 330) {
    // Any movement inside the bowl stirs: circles and back-and-forth scrubbing both count.
    S.swirl += dist / 120; S.prog = Math.min(1, S.prog + dist / (TAU * 120 * cfg.mixTurns));
    if (!hum('sfx_stir', true) && (S.tick += dist) > 90) { S.tick = 0; beep(300 + S.prog * 300, 0.05, 'sine', 0.06); }
    if (S.prog >= 1) complete();
  } else if (S.step === 4) stamp(p);
}
function onUp() {
  if (!S.ptr.down) return;
  S.ptr.down = false; S.lastStamp = null; hum('sfx_stir', false);
  if (S.step === 0 && !S.ok && S.prog > 0) toast(T('keepPouring'), '#7a3cff');
  if (S.step === 2 && !S.ok && S.prog > 0) toast(T('keepStirring'), '#7a3cff');
  if (S.step === 5 && S.ball.held) { S.ball.held = false; S.ball.loose = true; }
}
function stamp(p) {
  shapePath(S.mold, BALL.x, BALL.y, BALL.r * 0.92);
  if (!g.isPointInPath(p.x, p.y, fillRule(S.mold))) return;
  if (S.lastStamp && Math.hypot(p.x - S.lastStamp.x, p.y - S.lastStamp.y) < 46) return;
  S.lastStamp = { x: p.x, y: p.y };
  const before = luck();
  S.tops.push({ i: S.top, dx: (p.x - BALL.x) / BALL.r, dy: (p.y - BALL.y) / BALL.r, rot: rnd(-0.5, 0.5), pop: 1 });
  if (S.tops.length > cfg.maxToppings) S.tops.shift();
  burst(p.x, p.y, 5, '#fff', 160, 300, 5); sfx('sfx_drop', () => beep(rnd(700, 1100), 0.05, 'triangle', 0.08), 0.5); lib.haptics.play('tick');
  if (!S.ok && S.tops.length >= cfg.toppingsNeeded) complete();
  else if (before < 1 && luck() >= 1) { toast(T('maxLuck'), '#22b455'); burst(360, 280, 40, '#35d07f', 420); fanfare(4); }
}
function openAlbum() {
  S.album = true; beep(700, 0.06);
  lib.getTopNEntriesFromLeaderboard(3).then(r => { if (r && Array.isArray(r.entries)) board = r.entries.slice(0, 3); }).catch(() => {});
}
function bindInput() {
  if (bound) return; bound = true;
  const pos = e => { const r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) * W / r.width, y: (e.clientY - r.top) * H / r.height }; };
  cv.addEventListener('pointerdown', e => { try { cv.setPointerCapture(e.pointerId); } catch (x) { /* synthetic pointer */ } onDown(pos(e)); });
  cv.addEventListener('pointermove', e => onMove(pos(e)));
  cv.addEventListener('pointerup', onUp); cv.addEventListener('pointercancel', onUp);
  // Leaving the game silences it; coming back resumes.
  document.addEventListener('visibilitychange', () => { if (ac) { if (document.hidden) ac.suspend(); else ac.resume(); } });
}

/* ---------- update ---------- */
function update(dt) {
  S.t += dt; S.idle += dt; S.shake *= Math.pow(0.001, dt); S.squash *= Math.pow(0.0005, dt); S.poke *= Math.pow(0.002, dt);
  if (S.ok) { S.okT += dt; if (S.okT > 0.9 && [0, 2, 3].includes(S.step)) advance(); }
  if (S.step === 0) {
    // Before the first touch the jar pours by itself in a loop, so the game looks alive behind the Play card.
    const cycle = (S.t % 3) / 3, demo = !touched && cycle < 0.6;
    if (!touched) S.prog = Math.min(cycle, 0.6);
    S.pourT = Math.max(0, S.pourT - dt);
    const pouring = (S.ptr.down || S.pourT > 0 || demo) && !S.ok;
    S.jar += ((pouring ? 2.2 : 0) - S.jar) * Math.min(1, dt * 14);
    const flowing = pouring && S.jar > 1.2;
    if (flowing) {
      if (touched) S.prog = Math.min(1, S.prog + dt / cfg.pourSeconds);
      for (let i = 0; i < 4 * quality; i++) S.P.push({ x: 384 + rnd(-10, 10), y: 450, vx: rnd(-40, 40), vy: rnd(250, 380), g: 900, r: rnd(4, 9), c: '#ffffff', life: 0.42, max: 0.42 });
      if (S.prog >= 1) complete();
    }
    if (!hum('sfx_pour', flowing && touched) && flowing && touched && (S.tick += dt) > 0.07) { S.tick = 0; beep(rnd(500, 900), 0.04, 'sine', 0.05); }
  }
  for (const d of S.falling) { d.vy += 2400 * dt; d.y += d.vy * dt; }
  S.falling = S.falling.filter(d => {
    if (d.y < BOWL.y - 10) return true;
    const k = COLORS[d.i];
    // Averaging three paints gives mud, so the bomb keeps its last three colors as bright stripes instead.
    S.col = k.c; S.cols = [...S.cols.filter(c => c !== k.c), k.c].slice(-3); S.drops++;
    S.spots.push({ x: rnd(-150, 150), y: rnd(-18, 18), c: k.c });
    burst(360, BOWL.y, 16, rgb(k.c), 300, 800, 10); sfx('sfx_drop', () => beep(400, 0.12, 'sine', 0.12, -200)); lib.haptics.play('tap');
    if (S.drops <= cfg.dropsNeeded) toast(`${S.drops}/${cfg.dropsNeeded}`, rgb(k.c));
    if (!S.ok && S.step === 1 && S.drops >= cfg.dropsNeeded) complete();
    return false;
  });
  for (const t of S.tops) t.pop *= Math.pow(0.001, dt);
  if (S.step === 5) updateBath(dt);
  for (const p of S.P) { p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; }
  S.P = S.P.filter(p => p.life > 0);
  if (S.P.length > 600) S.P.splice(0, S.P.length - 600);
  for (const f of S.F) f.life -= dt;
  S.F = S.F.filter(f => f.life > 0);
}
function updateBath(dt) {
  const b = S.ball;
  if (S.prizes) { S.reveal += dt; return; }
  if (b.wet) {
    b.y += (900 + Math.sin(S.t * 5) * 8 - b.y) * Math.min(1, dt * 6);
    S.fizz = Math.min(1, S.fizz + dt / cfg.fizzSeconds);
    b.r = 110 * (1 - S.fizz * 0.8); S.shake = Math.max(S.shake, 3);
    for (let i = 0; i < 3 * quality; i++) S.P.push({ x: b.x + rnd(-b.r, b.r), y: b.y, vx: rnd(-60, 60), vy: rnd(-260, -120), g: -200, r: rnd(5, 16), c: Math.random() < 0.5 ? 'rgba(255,255,255,0.85)' : rgb(S.golden ? [255, 208, 0] : S.col, 0.8), life: rnd(0.4, 0.9), max: 0.9 });
    if (!hum('sfx_fizz', true) && (S.tick += dt) > 0.06) { S.tick = 0; beep(rnd(1200, 2600), 0.03, 'sine', 0.04); }
    if (S.fizz >= 1) reveal();
    return;
  }
  if (b.held) { b.x += (S.ptr.x - b.x) * Math.min(1, dt * 18); b.y += (S.ptr.y - b.y) * Math.min(1, dt * 18); b.vy = 0; }
  else if (b.loose) { b.vy += 2600 * dt; b.y += b.vy * dt; }
  else b.y = 400 + Math.sin(S.t * 3) * 12;
  b.x = Math.max(170, Math.min(550, b.x));
  if (b.y > WATER_Y) {
    b.wet = true; b.held = false; S.shake = 22;
    burst(b.x, WATER_Y, 40, 'rgba(255,255,255,0.95)', 620, 1100, 12);
    sfx('sfx_splash', () => beep(220, 0.3, 'sine', 0.2, -150)); lib.haptics.play('thud'); lib.haptics.start({ intensity: 0.3, sharpness: 0.8 });
  }
}
/** The bomb has fizzed away: hand out the prize(s), update the album, stars and unlocks, and save. */
function reveal() {
  const wasDone = albumDone();
  S.prizes = [drawPrize()];
  if (save.made >= 2 && Math.random() < cfg.twinChance * perk(0)) {
    const second = drawPrize();
    if (second.toy !== S.prizes[0].toy) S.prizes.push(second);
  }
  for (const p of S.prizes) {
    const have = p.gold ? save.gold : save.owned;
    if (have.includes(p.toy.e)) { p.isNew = false; save.stars++; save.dupes++; } else { p.isNew = true; have.push(p.toy.e); save.dupes = 0; }
  }
  save.made++;
  S.unlock = cfg.unlocks.find(u => u.at === save.made) || null;
  S.note = !wasDone && albumDone() ? T('albumDone') + ' 👑' : S.unlock ? '🔓' : save.stars >= cfg.starsForGolden ? T('nextGolden') : '';
  S.reveal = 0; S.shake = 18;
  stopLoops(); lib.haptics.play('success');
  burst(360, 600, S.note ? 140 : 90, null, 760, 800, 12);
  sfx('sfx_win', () => fanfare(3 + Math.max(...S.prizes.map(p => p.toy.r))));
  persist();
  lib.addPlayerScoreToLeaderboard(save.owned.length + save.gold.length).catch(() => {}); // guests cannot post a score
}

/* ---------- drawing ---------- */
function rr(x, y, w, h, r) { g.beginPath(); g.roundRect(x, y, w, h, r); }
/** Centred text. A string wider than maxW is drawn smaller, so a long translation never runs off the screen. */
function txt(s, x, y, size, fill = '#5a1e86', stroke = '#fff', sw = 12, maxW = 660) {
  const font = px => `900 ${px}px "Trebuchet MS", "Arial Rounded MT Bold", Arial, sans-serif`;
  g.font = font(size);
  const wide = g.measureText(s).width;
  if (wide > maxW) g.font = font(size * maxW / wide);
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
  if (stroke) { g.lineWidth = sw; g.strokeStyle = stroke; g.strokeText(s, x, y); }
  g.fillStyle = fill; g.fillText(s, x, y);
}
function emo(s, x, y, size, rot = 0) {
  g.save(); g.translate(x, y); g.rotate(rot); g.font = `${size}px sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(s, 0, 0); g.restore();
}
const ready = id => IMG[id] && IMG[id].complete && IMG[id].naturalWidth > 0;
/** A gold-tinted copy of image `id`, made once on an offscreen canvas. */
function goldCopy(id) {
  if (GOLD[id]) return GOLD[id];
  const im = IMG[id], c = document.createElement('canvas'), k = c.getContext('2d');
  c.width = im.naturalWidth; c.height = im.naturalHeight;
  k.drawImage(im, 0, 0); k.globalCompositeOperation = 'source-atop'; k.fillStyle = 'rgba(255,190,0,0.62)'; k.fillRect(0, 0, c.width, c.height);
  return GOLD[id] = c;
}
/** Draw image asset `id` centred at x,y (or the emoji fallback). o: sx, sy scale, rot, gold tint. */
function pic(id, fallback, x, y, size, o = {}) {
  g.save(); g.translate(x, y); g.rotate(o.rot || 0); g.scale(o.sx || 1, o.sy || 1);
  if (ready(id)) {
    const im = o.gold ? goldCopy(id) : IMG[id], k = size * 1.15 / Math.max(im.width, im.height);
    g.drawImage(im, -im.width * k / 2, -im.height * k / 2, im.width * k, im.height * k);
  } else { emo(fallback, 0, 0, size); if (o.gold) emo('✨', size * 0.4, -size * 0.4, size * 0.4); }
  g.restore();
}
/** Trace the outline of mold `kind` (0 ball, 1 heart, 2 star, 3 donut, 4 flower). Fill with fillRule(kind). */
function shapePath(kind, x, y, r) {
  g.beginPath();
  if (kind === 1) {
    g.moveTo(x, y + r * 0.95);
    g.bezierCurveTo(x - r * 1.55, y - r * 0.05, x - r * 0.8, y - r * 1.2, x, y - r * 0.45);
    g.bezierCurveTo(x + r * 0.8, y - r * 1.2, x + r * 1.55, y - r * 0.05, x, y + r * 0.95);
  } else if (kind === 2) {
    for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, q = i % 2 ? r * 0.58 : r * 1.1; g.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q); }
    g.closePath();
  } else if (kind === 4) {
    for (let i = 0; i < 6; i++) { const a = i * TAU / 6, px = x + Math.cos(a) * r * 0.58, py = y + Math.sin(a) * r * 0.58; g.moveTo(px + r * 0.48, py); g.arc(px, py, r * 0.48, 0, TAU); }
    g.moveTo(x + r * 0.5, y); g.arc(x, y, r * 0.5, 0, TAU);
  } else {
    g.arc(x, y, r, 0, TAU);
    if (kind === 3) { g.moveTo(x + r * 0.3, y); g.arc(x, y, r * 0.3, 0, TAU); }
  }
}
function button(label, col) {
  const s = 1 + Math.sin(S.t * 6) * 0.04;
  g.save(); g.translate(360, BTN_Y); g.scale(s, s);
  g.fillStyle = 'rgba(90,30,134,0.35)'; rr(-190, -55, 380, 130, 60); g.fill();
  g.fillStyle = col; rr(-190, -65, 380, 130, 60); g.fill();
  g.fillStyle = 'rgba(255,255,255,0.3)'; rr(-170, -55, 340, 46, 30); g.fill();
  txt(label, 0, 2, 58, '#fff', '#5a1e86', 10, 330); g.restore();
}
function bombBall(x, y, r) {
  const cols = S.cols.length ? S.cols : [S.col], gr = g.createLinearGradient(x - r, y - r, x + r, y + r);
  cols.forEach((c, i) => { gr.addColorStop(i / cols.length, rgb(c)); gr.addColorStop((i + 0.999) / cols.length, rgb(mix(c, [255, 255, 255], 0.25))); });
  shapePath(S.mold, x, y, r); g.lineJoin = 'round';
  g.lineWidth = S.golden ? 22 : 12; g.strokeStyle = S.golden ? '#ffc400' : rgb(mix(S.col, [90, 30, 134], 0.35)); g.stroke();
  g.fillStyle = gr; g.fill(fillRule(S.mold)); // fill after stroke so the flower's inner petal lines stay hidden
  const shine = g.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.05, x - r * 0.35, y - r * 0.4, r * 0.9);
  shine.addColorStop(0, 'rgba(255,255,255,0.55)'); shine.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = shine; g.fill(fillRule(S.mold));
  for (const t of S.tops) pic(TOPS[t.i].id, TOPS[t.i].e, x + t.dx * r, y + t.dy * r, r * 0.3 * (1 + t.pop * 0.8), { rot: t.rot });
  if (S.golden) for (let i = 0; i < 4; i++) emo('✨', x + Math.cos(S.t * 2 + i * 1.57) * r * 1.2, y + Math.sin(S.t * 2 + i * 1.57) * r * 1.2, r * 0.3);
}
/** Top or bottom half of the press mold, in the shape of the chosen mold. */
function moldHalf(top, y) {
  g.save(); g.beginPath(); g.rect(0, top ? y - 400 : y, W, 400); g.clip();
  shapePath(S.mold, 360, y, 172); g.lineJoin = 'round';
  g.lineWidth = 12; g.strokeStyle = '#5c74e6'; g.stroke();
  g.fillStyle = '#9fb4ff'; g.fill('nonzero'); g.restore();
  g.lineWidth = 10; g.strokeStyle = '#5c74e6'; g.beginPath(); g.moveTo(170, y); g.lineTo(550, y); g.stroke();
}
/** A row of round choice buttons. `face(i, x)` draws what is inside button i; a locked one shows how many bombs to go. */
function choiceRow(n, selected, kind, face) {
  for (let i = 0; i < n; i++) {
    const x = slotX(i), left = bombsUntil(kind, i);
    g.fillStyle = left ? '#e6dcef' : i === selected ? '#ffd000' : '#fff';
    g.beginPath(); g.arc(x, ROW_Y, i === selected ? 64 : 58, 0, TAU); g.fill();
    if (!left) face(i, x); else { emo('🔒', x, ROW_Y - 12, 44); txt(String(left), x, ROW_Y + 30, 34, '#7a3cff', null); }
  }
}
function drawBowl() {
  const { x, y } = BOWL;
  g.fillStyle = '#ff5fa8'; g.beginPath(); g.moveTo(x - 250, y);
  g.bezierCurveTo(x - 240, y + 150, x - 170, y + 200, x - 120, y + 200); g.lineTo(x + 120, y + 200);
  g.bezierCurveTo(x + 170, y + 200, x + 240, y + 150, x + 250, y); g.fill();
  g.fillStyle = 'rgba(255,255,255,0.35)'; g.beginPath(); g.ellipse(x - 150, y + 90, 26, 60, 0.4, 0, TAU); g.fill();
  g.fillStyle = '#ffe3f1'; g.beginPath(); g.ellipse(x, y, 250, 56, 0, 0, TAU); g.fill();
  g.lineWidth = 10; g.strokeStyle = '#ff5fa8'; g.stroke();
  const fill = S.step === 0 ? S.prog : 1;
  if (fill > 0.02) {
    const even = S.step === 2 ? S.prog : S.step > 2 ? 1 : 0;
    g.fillStyle = rgb(mix([255, 255, 255], S.col, even)); g.beginPath(); g.ellipse(x, y + 6, 50 + 180 * fill, 10 + 34 * fill, 0, 0, TAU); g.fill();
    for (const s of S.spots) { g.fillStyle = rgb(s.c, 1 - even); g.beginPath(); g.ellipse(x + s.x, y + 6 + s.y, 44, 16, 0, 0, TAU); g.fill(); }
    if (S.step === 2) {
      g.lineWidth = 8; g.strokeStyle = 'rgba(255,255,255,0.8)';
      for (let i = 0; i < 3; i++) { g.beginPath(); g.ellipse(x, y + 6, 70 + i * 55, 12 + i * 10, 0, S.swirl + i * 2, S.swirl + i * 2 + 1.6); g.stroke(); }
    }
  }
}
function drawScene() {
  if (S.step <= 2) drawBowl();
  if (S.step === 0) {
    g.save(); g.translate(290, 380 + Math.sin(S.t * 3) * 6); g.rotate(S.jar);
    if (ready('jar_powder')) { const jh = 180 * IMG.jar_powder.naturalHeight / IMG.jar_powder.naturalWidth; g.drawImage(IMG.jar_powder, -90, -jh / 2, 180, jh); }
    else {
      g.fillStyle = '#38c6ff'; rr(-75, -100, 150, 200, 30); g.fill();
      g.fillStyle = '#fff'; rr(-55, -40, 110, 100, 18); g.fill(); emo('✨', 0, 12, 64);
      g.fillStyle = '#ffd000'; rr(-60, -128, 120, 34, 12); g.fill();
    }
    g.restore();
  } else if (S.step === 1) {
    for (const d of S.falling) { g.fillStyle = rgb(COLORS[d.i].c); g.beginPath(); g.arc(d.x, d.y, 22, 0, TAU); g.fill(); }
    choiceRow(COLORS.length, -1, 'color', (i, x) => {
      g.fillStyle = rgb(COLORS[i].c); g.beginPath(); g.arc(x, ROW_Y, 48, 0, TAU); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.5)'; g.beginPath(); g.arc(x - 16, ROW_Y - 18, 13, 0, TAU); g.fill();
    });
  } else if (S.step === 2) {
    // The spoon rests in the bowl until it is grabbed, so the tool is visible before the first touch.
    const sx = S.ptr.down ? S.ptr.x : BOWL.x + 90, sy = S.ptr.down ? S.ptr.y : BOWL.y + 10;
    g.lineCap = 'round'; g.lineWidth = 22; g.strokeStyle = '#ffd000';
    g.beginPath(); g.moveTo(sx, sy); g.lineTo(sx + 70, sy - 190); g.stroke();
    g.fillStyle = '#ffd000'; g.beginPath(); g.ellipse(sx, sy, 40, 28, 0.3, 0, TAU); g.fill();
  } else if (S.step === 3) {
    const open = S.ok ? S.okT * 420 : 0, gap = 130 * (1 - S.prog) + open, cy = 640 + S.squash * 14;
    if (S.ok) bombBall(360, cy - 60, 140 * Math.min(1, backOut(Math.min(1, S.okT * 2))));
    else { g.fillStyle = rgb(S.col); rr(250, cy - gap - 20, 220, gap + 40, 40); g.fill(); }
    moldHalf(false, cy + open); moldHalf(true, cy - gap - S.squash * 20);
    if (!S.ok) choiceRow(MOLDS.length, S.mold, 'mold', (i, x) => { shapePath(i, x, ROW_Y + (i === 1 ? 4 : 0), 30); g.fillStyle = '#ff2d8a'; g.fill(fillRule(i)); });
  } else if (S.step === 4) {
    bombBall(BALL.x, BALL.y, BALL.r);
    choiceRow(TOPS.length, S.top, 'top', (i, x) => pic(TOPS[i].id, TOPS[i].e, x, ROW_Y + 2, 64));
  } else if (S.step === 5) {
    const water = mix([110, 215, 255], S.golden ? [255, 208, 0] : S.col, S.fizz * 0.75);
    if (!S.ball.wet) bombBall(S.ball.x, S.ball.y, S.ball.r);
    g.fillStyle = '#fff'; rr(40, 760, 640, 440, 70); g.fill();
    g.fillStyle = rgb(water); rr(64, WATER_Y, 592, 376, 54); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.45)';
    for (let i = 0; i < 6; i++) { g.beginPath(); g.ellipse(110 + i * 100 + Math.sin(S.t * 2 + i) * 14, WATER_Y + 6, 46, 10, 0, 0, TAU); g.fill(); }
    if (S.ball.wet && !S.prizes) bombBall(S.ball.x, S.ball.y, S.ball.r);
  }
}
function drawHud() {
  for (let i = 0; i < 6; i++) {
    const x = mx(46 + i * 62), cur = i === S.step;
    g.fillStyle = i < S.step ? '#35d07f' : cur ? '#ff2d8a' : '#fff';
    g.beginPath(); g.arc(x, 70, cur ? 30 : 24, 0, TAU); g.fill();
    g.lineWidth = 6; g.strokeStyle = '#5a1e86'; g.stroke();
    txt(i < S.step ? '✓' : String(i + 1), x, 72, cur ? 36 : 28, i <= S.step ? '#fff' : '#5a1e86', null);
  }
  g.fillStyle = '#fff'; g.beginPath(); g.arc(mx(MUTE.x), MUTE.y, 44, 0, TAU); g.fill(); g.lineWidth = 6; g.strokeStyle = '#5a1e86'; g.stroke();
  emo(save.muted ? '🔇' : '🔊', mx(MUTE.x), MUTE.y + 3, 46);
  const chip = mx(623) - 83;
  g.fillStyle = '#fff'; rr(chip, 28, 166, 84, 42); g.fill(); g.lineWidth = 6; g.strokeStyle = '#5a1e86'; g.stroke();
  emo(albumDone() ? '👑' : '🎁', chip + 42, 72, 42);
  txt(`${albumDone() ? save.gold.length : save.owned.length}/${TOYS.length}`, chip + 112, 72, 34, '#5a1e86', null);
  if (!S.prizes) txt(T('s' + S.step), 360, 200, 62);
  if (!S.prizes && (S.step > 0 || S.prog > 0)) {
    const isLuck = S.step === 4;
    const p = S.step === 1 ? S.drops / cfg.dropsNeeded : isLuck ? luck() : S.step === 5 ? S.fizz : S.prog;
    g.fillStyle = '#fff'; rr(160, 250, 400, 34, 17); g.fill();
    const fillW = 400 * Math.min(1, p);
    g.fillStyle = isLuck && p >= 1 ? '#ffc400' : '#35d07f'; rr(rtl() ? 560 - fillW : 160, 250, fillW, 34, 17); g.fill();
    g.lineWidth = 6; g.strokeStyle = '#5a1e86'; rr(160, 250, 400, 34, 17); g.stroke();
    // Luck needs no words: a clover on the left, and the rarest toy growing on the right as the bar fills.
    if (isLuck) { emo('🍀', mx(118), 268, 64); pic('toy_diamond', '💎', mx(612), 266, 60 + p * 30 + (p >= 1 ? Math.sin(S.t * 8) * 6 : 0)); }
  }
  if (S.ok && S.step === 1) button(T('next'), '#35d07f');
  if (S.ok && S.step === 4) button(T('dropIt'), '#ff2d8a');
  for (const f of S.F) {
    const k = Math.min(1, (1.3 - f.life) * 6);
    g.save(); g.globalAlpha = Math.min(1, f.life * 3); g.translate(360, 390 - (1.3 - f.life) * 30); g.scale(backOut(k), backOut(k));
    txt(f.txt, 0, 0, 68, f.c, '#fff', 14); g.restore();
  }
  if (!S.prizes && !S.ok && S.idle > cfg.hintDelay && !S.ptr.down) drawHint();
}
function drawHint() {
  const b = Math.sin(S.t * 5) * 14;
  let x = 360, y = 520;
  if (S.step === 0) { x = 300; y = 470; }
  if (S.step === 1) { x = slotX(0) + 20; y = ROW_Y + 60; }
  if (S.step === 2) { x = BOWL.x + Math.cos(S.t * 3) * 120; y = BOWL.y + 60 + Math.sin(S.t * 3) * 40; }
  if (S.step === 3) { y = 640; }
  if (S.step === 4) { y = BALL.y + 60; }
  if (S.step === 5) { x = S.ball.x + 20; y = S.ball.y + 70 + (S.ball.wet ? 0 : (S.t * 160) % 200); }
  emo('👆', x, y + b, 110);
}
function drawReveal() {
  const k = Math.min(1, S.reveal * 1.8), top = Math.max(...S.prizes.map(p => p.toy.r)), best = RARITY[top], two = S.prizes.length > 1;
  const anyNew = S.prizes.some(p => p.isNew), dupes = S.prizes.filter(p => !p.isNew).length, gold = S.prizes[0].gold;
  g.fillStyle = `rgba(255,255,255,${0.75 * k})`; g.fillRect(0, 0, W, H);
  g.save(); g.translate(360, 560); g.rotate(S.t * 0.6); g.fillStyle = gold ? '#ffb800' : best.c; g.globalAlpha = 0.28 * k;
  for (let i = 0; i < 12; i++) { g.rotate(TAU / 12); g.beginPath(); g.moveTo(0, 0); g.lineTo(-46, -520); g.lineTo(46, -520); g.fill(); }
  g.restore();
  const size = (two ? 190 : 260) * Math.max(0.01, backOut(k));
  S.prizes.forEach((p, i) => pic(p.toy.id, p.toy.e, 360 + (two ? (i ? 140 : -140) : 0), 900 - 340 * backOut(k) + Math.sin(S.t * 4 + i) * 8, size, { sx: 1 + S.poke * 0.25, sy: 1 - S.poke * 0.3, gold: p.gold }));
  txt((gold ? T('gold') + ' · ' : '') + T('r' + top), 360, 300, gold ? 52 : 60, gold ? '#f08a00' : best.c, '#fff', 14);
  if (S.reveal > 0.5) {
    // A duplicate is never a loss: it pays a star toward a golden bomb.
    txt(two ? T('doubleToy') : anyNew ? T('newToy') : '+1 ⭐', 360, 800, 70, anyNew || two ? '#ff2d8a' : '#ff9d00');
    txt(`${albumDone() ? '👑 ' + save.gold.length : '🎁 ' + save.owned.length}/${TOYS.length}` + (save.stars || dupes ? `   ⭐ ${save.stars}/${cfg.starsForGolden}` : ''), 360, 885, 48);
    // An unlock is shown as a picture (open padlock + the new thing), so it needs no translation.
    if (S.note) txt(S.note, S.unlock ? mx(300) : 360, 968, S.unlock ? 64 : 50, '#22b455', '#fff', 14);
    if (S.unlock) drawUnlock(S.unlock, mx(410), 968);
  }
  if (S.reveal > cfg.revealButtonDelay) button(T('again'), '#35d07f');
}
/** What a bomb unlocked, as a picture instead of words. */
function drawUnlock(u, x, y) {
  g.fillStyle = '#fff'; g.beginPath(); g.arc(x, y, 50, 0, TAU); g.fill(); g.lineWidth = 6; g.strokeStyle = '#22b455'; g.stroke();
  if (u.kind === 'mold') { shapePath(u.i, x, y + (u.i === 1 ? 4 : 0), 28); g.fillStyle = '#ff2d8a'; g.fill(fillRule(u.i)); }
  else if (u.kind === 'color') { g.fillStyle = rgb(COLORS[u.i].c); g.beginPath(); g.arc(x, y, 34, 0, TAU); g.fill(); }
  else if (u.kind === 'top') pic(TOPS[u.i].id, TOPS[u.i].e, x, y, 58);
  else emo(u.i ? '✨' : '🍀', x, y + 3, 56);
}
function drawAlbum() {
  g.fillStyle = 'rgba(90,30,134,0.6)'; g.fillRect(0, 0, W, H);
  g.fillStyle = '#fff'; rr(50, 150, 620, 1010, 50); g.fill();
  txt(`${T('myToys')} ${save.owned.length}/${TOYS.length}`, 360, 218, 54, '#5a1e86', null, 12, 560);
  TOYS.forEach((t, i) => {
    const x = mx(140 + (i % 4) * 147), y = 330 + (i / 4 | 0) * 138, has = save.owned.includes(t.e), gold = save.gold.includes(t.e);
    g.fillStyle = gold ? '#ffe680' : has ? '#fff3c4' : '#ece6f2'; rr(x - 62, y - 62, 124, 124, 26); g.fill();
    g.lineWidth = gold ? 10 : 6; g.strokeStyle = gold ? '#ffb800' : has ? RARITY[t.r].c : '#cfc4dc'; g.stroke();
    if (has) pic(t.id, t.e, x, y + 4, 86, { gold }); else txt('?', x, y + 4, 64, '#b9aacb', null);
  });
  txt(albumDone() ? `👑 ${T('gold')} ${save.gold.length}/${TOYS.length}` : `⭐ ${save.stars}/${cfg.starsForGolden} = ${T('goldenBomb')}`, 360, 860, 38, '#ff9d00', null, 12, 560);
  if (board && board.length) {
    txt(T('top'), 360, 915, 34, '#5a1e86', null, 12, 560);
    board.forEach((e, i) => txt(`${i + 1}. ${String(e.username).slice(0, 14)}  ${e.score}`, 360, 955 + i * 35, 30, '#7a3cff', null));
  }
  // Language is detected from the device; this button lets the player step through the others.
  g.fillStyle = '#eef7ff'; rr(160, LANG_BTN.y - 42, 400, 84, 42); g.fill(); g.lineWidth = 6; g.strokeStyle = '#27a8ff'; g.stroke();
  txt('🌐 ' + T('name'), 360, LANG_BTN.y + 2, 40, '#1877c9', null, 12, 340);
}
function draw() {
  g.direction = rtl() ? 'rtl' : 'ltr';
  const bg = g.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#ffe36e'); bg.addColorStop(0.55, '#ffb3d9'); bg.addColorStop(1, '#8fe0ff');
  g.fillStyle = bg; g.fillRect(0, 0, W, H);
  if (ready('bg_bathroom')) { const im = IMG.bg_bathroom, k = Math.max(W / im.naturalWidth, H / im.naturalHeight); g.drawImage(im, (W - im.naturalWidth * k) / 2, (H - im.naturalHeight * k) / 2, im.naturalWidth * k, im.naturalHeight * k); g.fillStyle = 'rgba(255,255,255,0.3)'; g.fillRect(0, 0, W, H); } // washed out so the HUD and choices stay readable
  g.fillStyle = 'rgba(255,255,255,0.35)';
  for (let i = 0; i < 14 * quality; i++) { g.beginPath(); g.arc((i * 173) % W, (i * 311 + S.t * 30) % H, 14 + (i % 3) * 8, 0, TAU); g.fill(); }
  g.save(); g.translate(rnd(-1, 1) * S.shake, rnd(-1, 1) * S.shake);
  drawScene();
  for (const p of S.P) { g.globalAlpha = Math.max(0, Math.min(1, p.life / p.max * 2)); g.fillStyle = p.c; g.beginPath(); g.arc(p.x, p.y, p.r, 0, TAU); g.fill(); }
  g.globalAlpha = 1; g.restore();
  if (S.prizes) drawReveal();
  drawHud();
  if (S.album) drawAlbum();
  if (DEBUG) Object.assign(cv.dataset, { step: S.step, toy: S.prizes ? S.prizes.map(p => p.toy.n).join('+') : '', made: save.made, muted: save.muted ? 1 : 0, prog: S.prog.toFixed(3), lang, rtl: rtl() ? 1 : 0, quality });
}
function frame(now) {
  const dt = Math.min((now - last) / 1000, 0.11); last = now;
  // Auto-detect a slow device: under 40 FPS for cfg.lowFpsSeconds halves particles and background bubbles.
  // shortcut: quality never climbs back in a session; add a recovery timer if a brief stall proves too costly.
  slow = dt > 1 / 40 ? slow + dt : Math.max(0, slow - dt);
  if (slow > cfg.lowFpsSeconds) quality = 0.5;
  if (mode === 'play') update(dt); else S.t += dt; // edit mode: a live picture, no gameplay
  draw();
  raf = requestAnimationFrame(frame);
}
/** Cache every image that asset_map.json provides. Missing ones fall back to emoji. */
function loadImages() {
  for (const id of IMAGE_IDS) { const a = lib.getAsset(id); if (a && !IMG[id]) { IMG[id] = new Image(); IMG[id].src = a.url; } }
}

/** Entry point. The host calls this on start and on every reload. */
function run(m) {
  mode = m; cfg = window.gameConfig;
  cv = document.getElementById('game') || document.body.appendChild(Object.assign(document.createElement('canvas'), { id: 'game' }));
  cv.width = W; cv.height = H; cv.style.touchAction = 'none';
  g = cv.getContext('2d');
  const slider = (key, min, max, step) => ({ key, type: 'slider', min, max, step });
  lib.showGameParameters({
    name: 'Bath Bomb Settings',
    params: {
      'Pour time (s)': slider('pourSeconds', 1, 6, 0.5), 'Color drops needed': slider('dropsNeeded', 1, 6, 1),
      'Stir turns': slider('mixTurns', 1, 8, 1), 'Press taps': slider('pressTaps', 2, 12, 1),
      'Toppings needed': slider('toppingsNeeded', 1, 15, 1), 'Toppings for max luck': slider('luckToppings', 5, 40, 1),
      'Fizz time (s)': slider('fizzSeconds', 1, 8, 0.5), 'Golden bomb chance': slider('goldenChance', 0, 1, 0.01),
      'Double toy chance': slider('twinChance', 0, 1, 0.01), 'Stars for a golden bomb': slider('starsForGolden', 1, 10, 1),
      'Duplicates before a sure new toy': slider('pityDupes', 1, 10, 1),
    },
  });
  lang = save.lang || detectLang();
  loadImages();
  cancelAnimationFrame(raf); newBomb();
  if (mode === 'play') {
    initAudio(); bindInput();
    lib.getUserGameState().then(r => {
      if (!(r && r.state && Array.isArray(r.state.owned))) return;
      save = mergeSave(save, r.state); setMuted(save.muted); lang = save.lang || detectLang();
      if (!touched) newBomb(); // pick up the molds this player has already unlocked
    }).catch(() => {});
  }
  last = performance.now(); raf = requestAnimationFrame(frame);
}
window.run = run;

// Local preview outside Astrocade: open index.html?local to stub the host.
if (DEBUG) {
  const none = async () => ({});
  window.lib = { showGameParameters() {}, log() {}, getAsset: id => window.__assets[id], getUserGameState: none, saveUserGameState: none, addPlayerScoreToLeaderboard: none, getTopNEntriesFromLeaderboard: none, haptics: { play() {}, start() {}, stop() {} } };
  window.__game = { pickToy, drawPrize, mergeSave, newBomb, bombsUntil, detectLang, get S() { return S; }, get save() { return save; }, set save(v) { save = v; } };
  const q = new URLSearchParams(location.search);
  Promise.all(['game_config.json', 'asset_map.json'].map(f => fetch(f).then(r => r.json()))).then(([c, assets]) => {
    window.__assets = q.has('noassets') ? {} : assets;
    window.gameConfig = { ...c, ...JSON.parse(q.get('cfg') || '{}') };
    run(q.get('mode') || 'play');
  });
}
