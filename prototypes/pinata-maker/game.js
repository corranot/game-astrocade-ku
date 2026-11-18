// PROTOTYPE - NOT FOR PRODUCTION
/*
 * Pinata Maker: Smash Party
 * Make a pinata in four steps (shape, paper, decorate, fill with candy), hang it up and smash it.
 * Candy rains down, and a surprise capsule holds a toy for the album.
 *
 * Reasons to make another one:
 *  - a party guest orders a shape in a colour; filling the order pays extra coins;
 *  - toys fill a 16-slot album in four rarities; a full album switches to gold toys;
 *  - a reward bar in the HUD always shows the next unlock (shape, colour, sticker, candy);
 *  - coins buy new sticks in the shop;
 *  - every third pinata is a party round: it swings, and a hit in the middle counts double;
 *  - surprises: a golden pinata (better toy) and a mega candy rain;
 *  - after two pinatas a "smash only" button skips the making for children who just want to hit.
 * There is no fail state. A tap does the same as a drag.
 *
 * The yard is 3D (scene.js, Three.js); the HUD is a 2D canvas on top, cut into fixed lanes (LANE)
 * so nothing covers anything else. In debug the game records the box of every HUD element and the
 * playtest fails on any overlap.
 *
 * The game shows the player's device language when cfg.strings has it, else English.
 * Tunable numbers and all player-facing text live in game_config.json. Art and sound come from
 * asset_map.json; a missing asset falls back to emoji or a synthesized sound.
 */
import * as scene from './scene.js';

const W = 720, H = 1280, TAU = Math.PI * 2;
const THREE_URLS = ['https://cdn.jsdelivr.net/npm/three@0.187.0/+esm', 'https://cdn.jsdelivr.net/npm/three@0.187.0/build/three.module.min.js', 'https://cdn.jsdelivr.net/npm/three@0.187.0/build/three.module.js', 'https://unpkg.com/three@0.187.0/build/three.module.js'];
// Lanes (centre y of each row of the HUD). The pinata lives between `order` and `row`.
const LANE = { hud: 70, steps: 164, bar: 222, say: 280, toast: 346, order: 448, row: 985, btn: 1150 };
const PLAY = { x: 130, y: 480, w: 460, h: 420 };
const PAPER = [0xff4fa3, 0xffc928, 0x2fb4ff, 0x3fd47a, 0x9b5cff];
const css = n => '#' + n.toString(16).padStart(6, '0');
const SHAPE_E = ['🦙', '🦄', '🦖', '⭐', '🍩', '🚀'];
const STEP_E = ['🦙', '🎨', '⭐', '🍬', '💥'];
const THEME_E = ['🌳', '🏖️', '⛄', '🍭'];
const STICKERS = [['stk_star', '⭐'], ['stk_heart', '💗'], ['stk_flower', '🌸'], ['stk_pompom', '🧶'], ['stk_bow', '🎀']];
const CANDY = [['candy_lolly', '🍭'], ['candy_wrap', '🍬'], ['candy_gummy', '🐻'], ['candy_coin', '🟡'], ['candy_bean', '🍡']];
const BATS = [['bat_wood', '🏏'], ['bat_hammer', '🔨'], ['bat_wand', '✨'], ['bat_sword', '🗡️'], ['bat_lolly', '🍭']];
const GUESTS = [['guest_bunny', '🐰'], ['guest_cat', '🐱'], ['guest_bear', '🐻'], ['guest_panda', '🐼'], ['guest_fox', '🦊'], ['guest_frog', '🐸']];
const OPEN = { shape: 3, color: 4, sticker: 3, candy: 3, perk: 0, theme: 1 }; // how many of each are open from the start
const RARITY = ['#27a8ff', '#a352ff', '#ff7a00', '#f08a00'];
const TOYS = [
  ['toy_ball', '🏀', 0], ['toy_yoyo', '🔴', 0], ['toy_car', '🚗', 0], ['toy_ducky', '🦆', 0], ['toy_top', '🌀', 0], ['toy_whistle', '🎺', 0],
  ['toy_teddy', '🧸', 1], ['toy_robot', '🤖', 1], ['toy_dino', '🦖', 1], ['toy_kite', '🎏', 1], ['toy_rocket', '🚀', 1],
  ['toy_unicorn', '🦄', 2], ['toy_dragon', '🐉', 2], ['toy_crown', '👑', 2],
  ['toy_llama', '🌈', 3], ['toy_diamond', '💎', 3],
].map(([id, e, tier], i) => ({ id, e, tier, i }));
const IMAGE_IDS = [...TOYS.map(t => t.id), ...STICKERS.map(s => s[0]), ...CANDY.map(s => s[0]), ...BATS.map(s => s[0]), ...GUESTS.map(s => s[0])];
const SOUND_IDS = ['sfx_paper', 'sfx_sticker', 'sfx_candy', 'sfx_hit', 'sfx_crack', 'sfx_burst', 'sfx_rain', 'sfx_cheer', 'sfx_win', 'sfx_coin', 'sfx_pop', 'music'];
// Per-sound start offset (seconds of silence before the sound) and gain, measured with ffmpeg on the generated files.
// A tap sound that starts 0.1 s late feels like lag, so the silence is skipped.
const SOUND_FIX = { sfx_paper: { skip: 0.1, gain: 1.4 }, sfx_crack: { skip: 0.1 }, sfx_candy: { skip: 0.07 }, sfx_coin: { gain: 3.2 }, sfx_rain: { gain: 1.8 }, sfx_hit: { skip: 0.1 } };
const DEBUG = location.search.includes('local');

let cv, gl, g, cfg, mode, S, raf = 0, last = 0, bound = false, touched = false, ready3d = false, loadFail = false;
let loaded = false, loading3d = false, tries3d = 0;
let ac = null, master = null, lang = 'en', quality = 1, slow = 0, grouped = 0, R = Math.random, coinSound = 0;
let save = { owned: [], gold: [], bats: [0], bat: 0, made: 0, smashed: 0, stars: 0, dupes: 0, coins: 0, candies: 0, shape: 0, day: 0, streak: 0, muted: false, lang: null, seen: {} };
let board = null;
const IMG = {}, GOLD = {}, BUF = {}, LOOPS = {}, BOXES = [], TXT = new Map(), EMO = new Map();

const rnd = (a, b) => a + Math.random() * (b - a);
const backOut = t => 1 + 2.7 * Math.pow(t - 1, 3) + 1.7 * Math.pow(t - 1, 2);
const clamp01 = v => Math.max(0, Math.min(1, v));
/** Player-facing text for key `k` in the current language; English when the language lacks it. All text lives in cfg.strings. */
const T = k => (cfg.strings[lang] && cfg.strings[lang][k]) || cfg.strings.en[k] || k;
/** The first device language the game has strings for, else English. */
function detectLang() {
  for (const l of navigator.languages || [navigator.language || 'en']) { const base = String(l).toLowerCase().split('-')[0]; if (cfg.strings[base]) return base; }
  return 'en';
}
const rtl = () => cfg.rtl.includes(lang);
/** Mirror an x position (mx) or the left edge of a box of width w (hx) for right-to-left languages. */
const mx = x => rtl() ? W - x : x;
const hx = (x, w) => rtl() ? W - x - w : x;
const gap = n => n > 5 ? 112 : 128;
const slotX = (i, n) => mx(360 - gap(n) * (n - 1) / 2 + i * gap(n));
const slotAt = (p, n) => { if (Math.abs(p.y - LANE.row) > 70) return -1; const i = Math.round((mx(p.x) - (360 - gap(n) * (n - 1) / 2)) / gap(n)); return i >= 0 && i < n ? i : -1; };
const inBtn = p => Math.abs(p.x - 360) < 210 && Math.abs(p.y - LANE.btn) < 72;
const inPlay = p => p.y > 400 && p.y < 915;
const first = () => save.made === 0 && !S.free;
/** A number from cfg, or its shorter first-pinata value. */
const need = k => first() && cfg.first[k] !== undefined ? cfg.first[k] : cfg[k];
const pinatasUntil = (kind, i) => i < OPEN[kind] ? 0 : Math.max(0, ...cfg.unlocks.filter(u => u.kind === kind && u.i === i).map(u => u.at - save.made));
const isOpen = (kind, i) => pinatasUntil(kind, i) === 0;
const perk = i => cfg.unlocks.some(u => u.kind === 'perk' && u.i === i) && isOpen('perk', i);
const albumDone = () => save.owned.length >= TOYS.length;
const seen = k => !!(save.seen && save.seen[k]);
const rowCount = () => [scene.SHAPE_COUNT, PAPER.length, STICKERS.length, CANDY.length][S.step] || 0;
const rowKind = () => ['shape', 'color', 'sticker', 'candy'][S.step];

/** The next unlock and how far along it is, for the reward bar. After the last unlock: a coin gift every cfg.giftEvery pinatas. */
function nextReward(made = save.made) {
  const u = cfg.unlocks.find(x => x.at > made);
  if (u) { const prev = Math.max(0, ...cfg.unlocks.filter(x => x.at <= made).map(x => x.at)); return { u, left: u.at - made, frac: (made - prev) / (u.at - prev) }; }
  const lastAt = Math.max(0, ...cfg.unlocks.map(x => x.at)), k = (made - lastAt) % cfg.giftEvery;
  return { u: { kind: 'coins' }, left: cfg.giftEvery - k, frac: k / cfg.giftEvery };
}
/** What finishing pinata number `made` unlocks, if anything. */
function rewardAt(made) {
  const u = cfg.unlocks.find(x => x.at === made); if (u) return u;
  const lastAt = Math.max(0, ...cfg.unlocks.map(x => x.at));
  return made > lastAt && (made - lastAt) % cfg.giftEvery === 0 ? { kind: 'coins' } : null;
}
/** A save from the server laid over the defaults, so an old save without a new field still works. */
function mergeSave(a, b) {
  const out = { ...a, ...b };
  for (const k of ['owned', 'gold', 'bats']) out[k] = Array.isArray(out[k]) ? [...new Set(out[k])].filter(Number.isInteger) : a[k];
  if (!out.bats.includes(0)) out.bats.unshift(0);
  if (!out.bats.includes(out.bat)) out.bat = 0;
  out.seen = { ...(a.seen || {}), ...(b.seen || {}) };
  for (const k of ['made', 'smashed', 'stars', 'dupes', 'coins', 'candies', 'shape', 'day', 'streak']) out[k] = Number.isFinite(+out[k]) ? +out[k] : 0;
  return out;
}
/** Write the save. Until the player's own save has been read, nothing is written: a default save must never replace real progress. */
const persist = () => { if (loaded) lib.saveUserGameState(save).catch(() => {}); };

/* ---------- daily gift ---------- */
/** A day as a number (20261118), `offset` days from now, in the player's own time zone. */
const dayKey = (offset = 0) => { const d = new Date(); d.setDate(d.getDate() + offset); return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate(); };
/**
 * The first pinata of a day pays a gift that grows with the streak of days played (up to cfg.dailyMaxStreak).
 * @returns {number} coins paid now; 0 when today's gift was already taken
 */
function claimDaily(today = dayKey(), yesterday = dayKey(-1)) {
  if (today <= save.day) return 0; // the same day, or a clock that was set back
  save.streak = save.day === yesterday ? Math.min(cfg.dailyMaxStreak, save.streak + 1) : 1; save.day = today;
  const coins = cfg.dailyCoins * save.streak; save.coins += coins; return coins;
}

/* ---------- round ---------- */
/** A guest asks for a shape in a colour (only things the player has unlocked). */
function newOrder() {
  const shapes = [...Array(scene.SHAPE_COUNT).keys()].filter(i => isOpen('shape', i)), cols = PAPER.map((_, i) => i).filter(i => isOpen('color', i));
  const fresh = rewardAt(save.made), o = { shape: shapes[R() * shapes.length | 0], color: cols[R() * cols.length | 0], guest: R() * GUESTS.length | 0 };
  if (fresh && fresh.kind === 'shape') o.shape = fresh.i; if (fresh && fresh.kind === 'color') o.color = fresh.i;
  return o;
}
const orderMet = () => !!S.order && S.shape === S.order.shape && scene.patchColors().includes(S.order.color);

/** Start a pinata. o.free: a ready-made one, straight to smashing. */
function newRound(o = {}) {
  // the very first thing a new player does is smash a ready-made pinata: the payoff comes before the making
  if (save.made === 0 && save.smashed === 0 && !o.free) o = { free: true, intro: true };
  const made = save.made, isFirst = made === 0 && !o.free;
  S = {
    step: isFirst ? 1 : o.free ? 4 : 0, t: 0, stepT: 0, idle: 0, acted: false, free: !!o.free, opening: !!o.intro,
    shape: isFirst ? 0 : save.shape || 0, color: 0, sticker: 0, total: 1, stuck: 0, fill: 0, mix: [0, 0, 0, 0, 0],
    hp: 1, hpMax: 1, stage: 0, hoist: 0, pushT: 0, party: false, gold: false, goldStars: false, mega: false,
    order: null, intro: null, introT: 0, guests: [], F: [], parts: [], flash: 0, slowT: 0, done: 0, doneMsg: '',
    collectT: 0, got: 0, capReady: false, capT: 0, reveal: 0, prizes: null, earned: null, gift: null, giftOpen: false,
    panel: null, tab: 0, drag: null, autoStick: 0, burstAt: 0,
  };
  if (!isFirst && !o.intro) {
    S.goldStars = save.stars >= cfg.starsForGolden; S.gold = S.goldStars || R() < cfg.goldenChance;
    S.mega = R() < cfg.megaChance; S.party = !o.free && (made + 1) % cfg.partyEvery === 0;
    if (!o.free && made >= 1) { S.order = newOrder(); if (!seen('order')) { S.intro = 'order'; S.introT = cfg.introSeconds; } }
  }
  const pool = GUESTS.map((_, i) => i); if (S.order) pool.splice(S.order.guest, 1);
  for (let i = pool.length - 1; i > 0; i--) { const j = R() * (i + 1) | 0; [pool[i], pool[j]] = [pool[j], pool[i]]; }
  S.guests = (S.order ? [S.order.guest] : []).concat(pool).slice(0, 4);
  if (o.free) { const shapes = [...Array(scene.SHAPE_COUNT).keys()].filter(i => isOpen('shape', i)); S.shape = shapes[R() * shapes.length | 0]; S.mix = S.mix.map((_, i) => isOpen('candy', i) ? 1 + (R() * 2 | 0) : 0); S.fill = cfg.fillTaps; }
  if (o.intro) { S.shape = 0; S.mix = [2, 2, 1, 0, 0]; }
  coinSound = 0; // the throttle compares against this round's clock
  if (ready3d) stage();
}
/** Put the round into the 3D yard. */
function stage() {
  scene.clearCandy(); scene.hideCapsule(); scene.setBat(save.bat); scene.showBat(false);
  const themes = THEME_E.map((_, i) => i).filter(i => isOpen('theme', i)); scene.setTheme(themes[(save.made + save.smashed) % themes.length]);
  scene.setGuests(S.guests.map(i => ({ id: GUESTS[i][0], emoji: GUESTS[i][1] })));
  S.total = scene.buildPinata(S.shape, [], PAPER);
  if (first()) S.total = scene.buildPinata(S.shape, Array.from({ length: S.total }, (_, i) => i < cfg.first.paperLeft ? -1 : (i % 2 ? 1 : 0)), PAPER);
  if (S.free || mode === 'edit') {
    const cols = PAPER.map((_, i) => i).filter(i => isOpen('color', i)), a = S.opening ? 0 : cols[R() * cols.length | 0], b = S.opening ? 1 : cols[(cols.indexOf(a) + 1 + (R() * (cols.length - 1) | 0)) % cols.length];
    S.total = scene.buildPinata(S.shape, Array.from({ length: S.total }, (_, i) => i % 2 ? a : b), PAPER);
    scene.addFace(); S.autoStick = 4;
  }
  scene.setView('craft');
  if (S.free) { enterSmash(); if (S.opening) { scene.snapView(); S.hoist = 0.35; } }
}
function buildShape(i) { S.shape = i; S.total = scene.buildPinata(i, [], PAPER); }

/* ---------- prizes ---------- */
/** Pick a toy by rarity weight, at least tier `minTier`, from `pool`. */
function pickToy(minTier = 0, pool = TOYS) {
  const w = cfg.rarityWeights.map((v, t) => t >= minTier && pool.some(x => x.tier === t) ? v : 0), sum = w.reduce((a, b) => a + b, 0);
  let r = R() * sum, tier = w.findIndex(v => v > 0);
  for (let t = 0; t < w.length; t++) { if (w[t] <= 0) continue; if (r < w[t]) { tier = t; break; } r -= w[t]; }
  const list = pool.filter(x => x.tier === tier);
  return list[R() * list.length | 0];
}
/** The toy inside this pinata. A golden pinata gives rare or better; after cfg.pityDupes duplicates in a row the toy is a missing one. */
function drawPrize() {
  const goldSet = albumDone(), have = goldSet ? save.gold : save.owned, missing = TOYS.filter(t => !have.includes(t.i));
  const pity = save.dupes >= cfg.pityDupes && missing.length > 0;
  const rareMissing = missing.filter(t => t.tier >= 1);
  const toy = S.gold && rareMissing.length ? pickToy(1, rareMissing) : (pity || S.gold) && missing.length ? pickToy(0, missing) : pickToy(S.gold ? 1 : 0);
  return { toy, gold: goldSet, isNew: !have.includes(toy.i) };
}

/* ---------- sound ---------- */
function initAudio() {
  if (ac) return;
  try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { ac = null; return; }
  master = ac.createGain(); master.gain.value = save.muted ? 0 : 1; master.connect(ac.destination);
  for (const id of SOUND_IDS) {
    const a = lib.getAsset(id);
    if (!a) continue;
    fetch(a.url).then(r => r.arrayBuffer()).then(b => ac.decodeAudioData(b)).then(buf => { BUF[id] = buf; if (id === 'music' && touched) hum('music', true, 0.28); }).catch(() => {});
  }
}
function beep(f, d = 0.08, type = 'sine', v = 0.12, slide = 0) {
  if (!ac) return;
  const o = ac.createOscillator(), a = ac.createGain(), t = ac.currentTime;
  o.type = type; o.frequency.setValueAtTime(f, t);
  if (slide) o.frequency.linearRampToValueAtTime(Math.max(30, f + slide), t + d);
  a.gain.setValueAtTime(v, t); a.gain.exponentialRampToValueAtTime(0.001, t + d);
  o.connect(a).connect(master); o.start(t); o.stop(t + d);
}
function voice(id, vol, loop, rate = 1) {
  const src = ac.createBufferSource(), a = ac.createGain();
  const fix = SOUND_FIX[id] || {};
  src.buffer = BUF[id]; a.gain.value = vol * (fix.gain || 1); src.playbackRate.value = rate;
  // shortcut: decoding leaves a few ms of silence at both ends, so loops skip 40 ms each side; re-export as wav if a seam is still audible
  if (loop) { src.loop = true; src.loopStart = 0.04; src.loopEnd = Math.max(0.1, BUF[id].duration - 0.04); }
  src.connect(a).connect(master); src.start(0, loop ? 0 : fix.skip || 0);
  return src;
}
/** Play a recorded sound if it is loaded, else the synthesized fallback. */
function sfx(id, fallback, vol = 0.8, rate = 1) { if (ac && BUF[id]) voice(id, vol, false, rate); else fallback(); }
function hum(id, on, vol = 0.6) {
  if (!ac || !BUF[id]) return false;
  if (on && !LOOPS[id]) LOOPS[id] = voice(id, vol, true);
  else if (!on && LOOPS[id]) { LOOPS[id].stop(); delete LOOPS[id]; }
  return true;
}
function setMuted(m) { save.muted = m; if (master) master.gain.value = m ? 0 : 1; }
const fanfare = n => [523, 659, 784, 1047, 1319].slice(0, n).forEach((f, i) => setTimeout(() => beep(f, 0.16, 'triangle', 0.14), i * 90));

/* ---------- feedback ---------- */
const toast = (txt, c = '#ff2d8a') => { S.F = [{ txt, c, life: 1.4 }]; };
/** 2D sparkles at a screen point. */
function burst2d(x, y, n, col, speed = 320) {
  for (let i = 0; i < Math.ceil(n * quality); i++) { const a = rnd(0, TAU), v = rnd(0.3, 1) * speed; S.parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 120, life: rnd(0.4, 0.8), r: rnd(5, 11), col, kind: i % 3 ? 'dot' : 'star' }); }
}
/** A coin that flies from a screen point to the coin counter. */
function coinFly(x, y) { S.parts.push({ x, y, sx: x, sy: y, life: 0.55, max: 0.55, kind: 'coin' }); }
function complete(msg) { if (S.done > 0) return; S.done = 0.8; toast(T(msg), '#12a454'); fanfare(3); lib.haptics.play('success'); }

/* ---------- steps ---------- */
function advance() {
  S.step++; S.stepT = 0; S.idle = 0; S.acted = false; S.done = 0;
  if (S.step === 2) { scene.addFace(); sfx('sfx_pop', () => beep(700, 0.1, 'sine', 0.12, 300)); }
  if (S.step === 4) enterSmash();
}
function enterSmash() {
  S.step = 4; S.stepT = 0; S.hoist = 1.2; S.hpMax = S.hp = S.opening ? cfg.first.openingHits : need('hitsNeeded'); S.stage = 0;
  save.shape = S.shape;
  scene.setView('smash');
  if (S.gold) { scene.setGold(true); toast(T('golden'), '#e08a00'); fanfare(5); }
  else if (S.party) toast(T('party'), '#7a3cff');
}
function pickShape(i) {
  if (!isOpen('shape', i)) return locked('shape', i);
  S.acted = true; buildShape(i); sfx('sfx_pop', () => beep(520, 0.08)); lib.haptics.play('tick');
}
function locked(kind, i) { toast('🔒 💥×' + pinatasUntil(kind, i), '#7a3cff'); beep(200, 0.1, 'square', 0.06); }
function paint(p, nearest) {
  if (S.done > 0) return;
  const at = scene.paintAt(p.x, p.y, S.color, nearest);
  if (!at) return;
  S.acted = true; S.idle = 0;
  sfx('sfx_paper', () => beep(rnd(500, 800), 0.05, 'triangle', 0.08), 0.6, rnd(0.9, 1.2)); lib.haptics.play('tick');
  burst2d(at.x, at.y, 5, css(PAPER[S.color]), 220);
  if (scene.coveredCount() >= S.total) complete('d1');
}
function stick(p) {
  if (S.stuck >= cfg.maxStickers) return;
  const at = scene.stickerAt(p.x, p.y, STICKERS[S.sticker][0], STICKERS[S.sticker][1]);
  if (!at) return;
  S.acted = true; S.idle = 0; S.stuck++;
  sfx('sfx_sticker', () => beep(880, 0.07, 'sine', 0.12, 400), 0.7, rnd(0.9, 1.3)); lib.haptics.play('tap');
  burst2d(at.x, at.y, 6, '#ffd21f', 240);
  if (S.stuck === need('stickersNeeded')) { toast(T('d2'), '#12a454'); fanfare(2); }
}
function addCandy(i) {
  if (!isOpen('candy', i)) return locked('candy', i);
  if (S.done > 0 || S.fill >= need('fillTaps')) return;
  S.acted = true; S.idle = 0; S.fill++; S.mix[i]++; S.lastCandy = i;
  scene.dropIn(i, cfg.candiesPerTap);
  sfx('sfx_candy', () => beep(rnd(300, 420), 0.09, 'square', 0.07), 0.7, rnd(0.9, 1.2)); lib.haptics.play('tap');
  if (S.fill >= need('fillTaps')) complete('d3');
}
function hitNow() {
  if (S.hoist > 0 || S.hp <= 0) return;
  S.acted = true; S.idle = 0;
  const perfect = S.party && Math.abs(scene.swingAngle()) < cfg.perfectZone, power = perfect ? 2 : 1;
  S.hp -= power; scene.hit(power); scene.cheer(1);
  const at = scene.pinataAt();
  burst2d(at.x + 40, at.y, 10, '#ffffff', 420); S.parts.push({ x: at.x + 50, y: at.y, life: 0.28, max: 0.28, kind: 'pow' });
  sfx('sfx_hit', () => beep(150, 0.12, 'square', 0.16, -90), 0.9, [1, 0.8, 1.25, 1.1, 0.9][save.bat] * rnd(0.95, 1.08));
  lib.haptics.play(perfect ? 'thud' : 'tap');
  const frac = S.hp / S.hpMax, types = S.mix.flatMap((n, i) => n ? [i] : []);
  if (!types.length) types.push(0); // an empty pinata still leaks and rains something
  if (perfect) { toast(T('perfect'), '#ff7a00'); scene.leak(types, 2); }
  S.stopT = perfect ? 0.11 : 0.06; // a held frame on impact makes the hit land
  beep(perfect ? 95 : 120, 0.11, 'sine', 0.22, -50);
  if (S.stage < 1 && frac <= 0.67) { S.stage = 1; scene.cheer(2); scene.shed(2); scene.leak(types, 2); sfx('sfx_crack', () => beep(260, 0.15, 'sawtooth', 0.1, -150)); }
  if (S.stage < 2 && frac <= 0.34) { S.stage = 2; scene.shed(3); scene.leak(types, 3); sfx('sfx_crack', () => beep(220, 0.18, 'sawtooth', 0.12, -150), 0.9, 0.85); }
  if (S.hp <= 0) burstNow();
}
function burstNow() {
  const types = [];
  S.mix.forEach((n, i) => { for (let k = 0; k < n * cfg.rainPerTap * (S.mega || S.party ? 2 : 1); k++) types.push(i); });
  const open = S.mix.flatMap((n, i) => n ? [i] : []); for (let k = 0; k < cfg.batBonusCandy[save.bat] && open.length; k++) types.push(open[k % open.length]); // a better stick shakes out more candy
  if (!types.length) for (let k = 0; k < cfg.rainPerTap * 2; k++) types.push(0);
  for (let i = types.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [types[i], types[j]] = [types[j], types[i]]; }
  scene.burst(types, S.mega ? cfg.megaScale : 1); scene.showBat(false);
  S.slowT = cfg.slowMoSeconds; S.flash = 1; S.prizes = [drawPrize()];
  sfx('sfx_burst', () => { beep(90, 0.5, 'sawtooth', 0.22, -50); fanfare(5); }, 1); sfx('sfx_rain', () => {}, 0.8); sfx('sfx_cheer', () => {}, 0.7);
  lib.haptics.play([{ intensity: 1, sharpness: 0.2 }, { intensity: 0.8, sharpness: 0.6, delay: 80 }, { intensity: 1, sharpness: 0.9, delay: 80 }]);
  if (S.mega) toast(T('mega'), '#ff2d8a');
  S.step = 5; S.stepT = 0; S.idle = 0; S.acted = false; S.collectT = S.opening ? cfg.first.collectSeconds : need('collectSeconds');
}
/** Coins for candy picked up at these screen points. */
function grabbed(list) {
  if (!list.length) return;
  S.acted = true; S.idle = 0; S.got += list.length; save.coins += list.length * cfg.coinsPerCandy; save.candies += list.length;
  for (const c of list.slice(0, 14)) coinFly(c.x, c.y);
  if (S.t - coinSound > 0.07) { coinSound = S.t; sfx('sfx_coin', () => beep(rnd(900, 1300), 0.06, 'triangle', 0.09), 0.45, rnd(0.95, 1.3)); lib.haptics.play('tick'); }
}
function openCapsule() {
  if (S.reveal > 0) return;
  scene.openCapsule(); S.reveal = 0.001; S.acted = true;
  sfx('sfx_pop', () => beep(500, 0.2, 'sine', 0.16, 600)); lib.haptics.play('thud');
}
/** The toy is out: book it, pay the coins, pick the gift. */
function reveal() {
  const pz = S.prizes[0], list = pz.gold ? save.gold : save.owned;
  pz.isNew = !list.includes(pz.toy.i); // the save may have loaded since the pinata burst
  if (pz.isNew) { list.push(pz.toy.i); save.dupes = 0; } else { save.stars++; save.dupes++; }
  if (S.goldStars) save.stars = Math.max(0, save.stars - cfg.starsForGolden);
  const met = orderMet();
  S.earned = { base: cfg.coinsPerPinata, order: met ? cfg.orderCoins : 0, candy: S.got, met };
  save.coins += S.earned.base + S.earned.order; S.earned.daily = claimDaily();
  if (S.free) save.smashed++; else { save.made++; S.gift = rewardAt(save.made); if (S.gift && S.gift.kind === 'coins') save.coins += cfg.giftCoins; }
  S.giftOpen = !S.gift; S.btnAt = cfg.revealButtonDelay; S.step = 6; S.stepT = 0;
  persist(); lib.addPlayerScoreToLeaderboard(save.candies).catch(() => {});
  sfx('sfx_win', () => fanfare(5), 0.9); lib.haptics.play('success'); scene.cheer(2);
}

/* ---------- help ---------- */
/** What to spotlight: the thing to touch on the first pinata until the player acts, and after cfg.idleHelp idle seconds on any pinata. */
function helpTarget() {
  if (S.panel || S.done > 0 || S.step === 6 || !ready3d) return null;
  if (S.intro === 'order') return { x: 130, y: LANE.order - 56, w: 460, h: 112, hand: 'tap' };
  const show = ((first() || S.opening) && !S.acted && S.stepT > 0.6) || S.idle > cfg.idleHelp;
  if (!show) return null;
  const n = rowCount(), row = i => ({ x: slotX(i, n) - 62, y: LANE.row - 62, w: 124, h: 124, hand: 'tap' });
  if (S.step === 0) return S.order && S.shape !== S.order.shape ? row(S.order.shape) : { x: 150, y: LANE.btn - 66, w: 420, h: 132, hand: 'tap' };
  if (S.step === 1) return S.order && S.shape === S.order.shape && S.color !== S.order.color && !orderMet() ? row(S.order.color) : { ...PLAY, hand: 'rub' };
  if (S.step === 2) return S.stuck >= need('stickersNeeded') ? { x: 150, y: LANE.btn - 66, w: 420, h: 132, hand: 'tap' } : { ...PLAY, hand: 'tap' };
  if (S.step === 3) return row(0);
  if (S.step === 4) return S.hoist > 0 ? null : { x: 150, y: 430, w: 420, h: 400, hand: 'tap' };
  if (S.step === 5) { if (S.reveal > 0) return null; const c = scene.capsuleAt(); return S.capReady && c ? { x: c.x - 90, y: c.y - 90, w: 180, h: 180, hand: 'tap' } : { x: 60, y: 900, w: 600, h: 330, hand: 'rub' }; }
  return null;
}
function endIntro() { save.seen[S.intro] = 1; S.intro = null; S.idle = 0; persist(); }

/* ---------- input ---------- */
function onDown(p) {
  if (mode !== 'play') return;
  if (!touched) { touched = true; if (ac) { ac.resume(); hum('music', true, 0.28); } }
  S.idle = 0;
  if (!ready3d) { if (loadFail) load3d(); return; }
  if (S.panel) return panelTap(p);
  if (S.step !== 6 && Math.hypot(p.x - mx(664), p.y - LANE.hud) < 52) { setMuted(!save.muted); persist(); return; }
  if (bookShown() && Math.hypot(p.x - mx(556), p.y - LANE.hud) < 52) { S.panel = 'book'; S.tab = canBuy() ? 1 : 0; beep(600, 0.06); return; }
  if (S.intro) endIntro(); // any tap ends the introduction and still does what it was aimed at
  if (S.step === 6) return prizeTap(p);
  const slot = slotAt(p, rowCount());
  if (S.step === 0) {
    if (slot >= 0) return pickShape(slot);
    if (inBtn(p)) { S.acted = true; beep(660, 0.08); return advance(); }
  } else if (S.step === 1) {
    if (slot >= 0) { if (!isOpen('color', slot)) return locked('color', slot); S.color = slot; beep(500 + slot * 60, 0.06); return; }
    if (inPlay(p)) { S.drag = { x: p.x, paint: true }; return paint(p, true); }
  } else if (S.step === 2) {
    if (slot >= 0) { if (!isOpen('sticker', slot)) return locked('sticker', slot); S.sticker = slot; beep(500 + slot * 60, 0.06); return; }
    if (inBtn(p) && S.stuck >= need('stickersNeeded')) { beep(660, 0.08); return advance(); }
    if (inPlay(p)) return stick(p);
  } else if (S.step === 3) {
    if (slot >= 0) return addCandy(slot);
    if (inPlay(p)) return addCandy(S.lastCandy || 0);
  } else if (S.step === 4) {
    if (p.y > 300) return hitNow();
  } else if (S.step === 5) {
    const c = scene.capsuleAt();
    if (S.capReady && c && Math.hypot(p.x - c.x, p.y - c.y) < 130) return openCapsule();
    S.drag = { x: p.x, grab: true }; return grabbed(scene.collectAt(p.x, p.y, cfg.collectRadius));
  }
  if (S.step < 4 && inPlay(p)) S.drag = { x: p.x, turn: true };
}
function onMove(p) {
  if (mode !== 'play' || !S.drag || !ready3d) return;
  S.idle = 0;
  if (S.drag.paint) paint(p, false);
  else if (S.drag.grab && S.step === 5) grabbed(scene.collectAt(p.x, p.y, cfg.collectRadius));
  else if (S.drag.turn) { scene.turn(p.x - S.drag.x); S.drag.x = p.x; }
}
function onUp() { S.drag = null; }
/** One bonus smash is banked for every pinata made, so smash-only is a treat and never a faster way to play. */
const canSmash = () => perk(0) && save.smashed < save.made;
function openGift() { if (S.giftOpen) return; S.giftOpen = true; S.btnAt = S.stepT + 0.4; fanfare(4); burst2d(360, LANE.row, 24, '#ffd21f'); lib.haptics.play('success'); }
/** The album button is there from the second pinata on, while making (one rule for drawing it and for tapping it). */
const bookShown = () => save.made >= 1 && S.step < 4 && !(S.done > 0 && S.step === 3);
/** True when the player can afford a stick they do not own yet. */
const canBuy = () => BATS.some((_, i) => !save.bats.includes(i) && save.coins >= cfg.batPrices[i]);
function prizeTap(p) {
  if (S.stepT < 0.8) return;
  if (!S.giftOpen) return openGift();
  if (S.stepT < S.btnAt) return;
  const smash = canSmash(), onGift = S.gift && Math.hypot(p.x - 360, p.y - LANE.row) < 90;
  if (smash && (Math.hypot(p.x - mx(610), p.y - LANE.btn) < 62 || (onGift && S.gift.kind === 'perk'))) { beep(700, 0.08); return newRound({ free: true }); }
  if (onGift || (Math.abs(p.x - (smash ? mx(300) : 360)) < (smash ? 200 : 210) && Math.abs(p.y - LANE.btn) < 72)) { beep(660, 0.08); newRound(); }
}
/** Fetch the top candy collectors for the third tab of the book. */
function loadBoard() { board = board || { entries: [], userRank: null }; lib.getTopNEntriesFromLeaderboard(8).then(r => { board = { entries: (r && r.entries) || [], userRank: r ? r.userRank : null }; }).catch(() => { board = { entries: [], userRank: null }; }); }
function panelTap(p) {
  if (Math.hypot(p.x - mx(600), p.y - 1190) < 64) { S.panel = null; beep(400, 0.06); return; }
  if (Math.hypot(p.x - mx(120), p.y - 1190) < 64) { const ls = Object.keys(cfg.strings); lang = ls[(ls.indexOf(lang) + 1) % ls.length]; save.lang = lang; persist(); beep(700, 0.06); return; }
  if (Math.abs(p.y - 125) < 56) { S.tab = Math.max(0, Math.min(2, Math.floor(mx(p.x) / 240))); if (S.tab === 2) loadBoard(); beep(520, 0.05); return; }
  if (S.tab === 0 && Math.abs(p.y - 1076) < 48 && Math.abs(p.x - 360) < 190) {
    // coins always have something to buy: a golden pinata (a missing rare-or-better toy)
    if (save.stars >= cfg.starsForGolden) beep(660, 0.08);
    else if (save.coins >= cfg.goldenPrice) { save.coins -= cfg.goldenPrice; save.stars = cfg.starsForGolden; fanfare(5); lib.haptics.play('success'); burst2d(360, 1076, 30, '#ffd21f'); persist(); }
    else { beep(200, 0.1, 'square', 0.06); S.shakeRow = { i: -1, t: 0.4 }; }
    return;
  }
  if (S.tab === 1) {
    const i = Math.floor((p.y - 200) / 180);
    if (i < 0 || i >= BATS.length || p.y > 1100) return;
    if (save.bats.includes(i)) { save.bat = i; scene.setBat(i); beep(660, 0.08); persist(); }
    else if (save.coins >= cfg.batPrices[i]) { save.coins -= cfg.batPrices[i]; save.bats.push(i); save.bat = i; scene.setBat(i); fanfare(4); lib.haptics.play('success'); burst2d(360, 290 + i * 180, 24, '#ffd21f'); persist(); }
    else { beep(200, 0.1, 'square', 0.06); S.shakeRow = { i, t: 0.4 }; }
  }
}
function bindInput() {
  if (bound) return; bound = true;
  const pos = e => { const r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) * W / r.width, y: (e.clientY - r.top) * H / r.height }; };
  cv.addEventListener('pointerdown', e => { e.preventDefault(); try { cv.setPointerCapture(e.pointerId); } catch (err) { /* synthetic pointers have no capture */ } onDown(pos(e)); });
  cv.addEventListener('pointermove', e => { if (e.buttons || e.pointerType === 'touch') onMove(pos(e)); });
  const up = () => onUp(); cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
  document.addEventListener('visibilitychange', () => { if (!ac) return; if (document.hidden) ac.suspend(); else if (touched) ac.resume(); });
}

/* ---------- update ---------- */
function update(dt) {
  S.t += dt; S.stepT += dt; if (!S.panel) S.idle += dt;
  for (const f of S.F) f.life -= dt; S.F = S.F.filter(f => f.life > 0);
  for (const q of S.parts) { q.life -= dt; if (q.kind === 'dot' || q.kind === 'star') { q.vy += 700 * dt; q.x += q.vx * dt; q.y += q.vy * dt; } }
  S.parts = S.parts.filter(q => q.life > 0);
  S.flash = Math.max(0, S.flash - dt * 2.2);
  if (S.shakeRow) { S.shakeRow.t -= dt; if (S.shakeRow.t <= 0) S.shakeRow = null; }
  if (!ready3d) return;
  if (S.intro) { S.introT -= dt; if (S.introT <= 0) endIntro(); }
  if (S.done > 0) { S.done -= dt; if (S.done <= 0) advance(); }
  if (S.autoStick > 0 && S.stepT > 0.25) { S.autoStick--; const k = STICKERS.filter((_, i) => isOpen('sticker', i)); const s = k[Math.random() * k.length | 0]; scene.stickerAt(-99, -99, s[0], s[1]); }
  if (S.step === 4) {
    if (S.hoist > 0) { S.hoist -= dt; if (S.hoist <= 0) { scene.showBat(true); if (S.party) scene.pushSwing(cfg.partyPush); } }
    else if (S.party) { S.pushT -= dt; if (S.pushT <= 0 && Math.abs(scene.swingAngle()) < 0.08) { scene.pushSwing(cfg.partyPush * (Math.random() < 0.5 ? 1 : -1)); S.pushT = 1.5; } }
  }
  if (S.step === 6 && !S.giftOpen && S.stepT > 3.2) openGift(); // a gift nobody taps opens itself
  if (S.step === 5) {
    S.collectT -= dt;
    // candy that is still there when the time is up (or after the last one is grabbed) is picked up for the player: nothing is lost
    if (!S.capReady && S.stepT > 1.4 && (S.collectT <= 0 || scene.candyLeft() === 0)) { grabbed(scene.collectAll()); S.capReady = true; S.capT = 5; S.idle = cfg.idleHelp; }
    if (S.capReady && !S.reveal) { S.capT -= dt; if (S.capT <= 0) openCapsule(); }
    if (S.reveal > 0) { S.reveal += dt; if (S.reveal > 0.9) reveal(); }
  }
  if (S.t % 0.5 < dt && S.step < 4) scene.ambient();
}

/* ---------- drawing helpers ---------- */
/** Record the box of a top-level HUD element (debug only); the playtest fails when two boxes overlap. */
function box(n, x, y, w, h) { if (DEBUG && !grouped) BOXES.push({ n, x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(h) }); }
/** One HUD element made of several drawn parts: record its outer box once, not each part. */
function group(n, x, y, w, h, drawParts) { box(n, x, y, w, h); grouped++; drawParts(); grouped--; }
function rr(x, y, w, h, r) { g.beginPath(); g.roundRect(x, y, w, h, r); }
/** Centred text. A string wider than maxW is drawn smaller, so a long translation never runs off its space. */
function txt(s, x, y, size, fill = '#5a1e86', stroke = '#fff', sw = 12, maxW = 660) {
  // Stroked text is slow to rasterise, so each distinct string is drawn once to its own small canvas and copied after that.
  const key = s + '|' + size + '|' + fill + '|' + stroke + '|' + sw + '|' + maxW + '|' + lang;
  let c = TXT.get(key);
  if (!c) {
    const font = px => `900 ${px}px "Trebuchet MS", "Arial Rounded MT Bold", Arial, sans-serif`;
    g.font = font(size);
    let wide = g.measureText(s).width;
    if (wide > maxW) { size *= maxW / wide; wide = maxW; }
    const cvs = document.createElement('canvas'), k = cvs.getContext('2d'), pad = (stroke ? sw : 0) + 6;
    cvs.width = Math.ceil(wide + pad * 2); cvs.height = Math.ceil(size * 1.5 + pad * 2);
    k.font = font(size); k.textAlign = 'center'; k.textBaseline = 'middle'; k.lineJoin = 'round';
    k.direction = rtl() ? 'rtl' : 'ltr'; // so the "!" of an Arabic sentence lands at its left end
    if (stroke) { k.lineWidth = sw; k.strokeStyle = stroke; k.strokeText(s, cvs.width / 2, cvs.height / 2); }
    k.fillStyle = fill; k.fillText(s, cvs.width / 2, cvs.height / 2);
    if (TXT.size > 90) TXT.clear();
    TXT.set(key, c = { cvs, wide, size });
  }
  g.drawImage(c.cvs, x - c.cvs.width / 2, y - c.cvs.height / 2);
  if (DEBUG) box('text ' + s, x - c.wide / 2, y - c.size * 0.55, c.wide, c.size * 1.1);
}
/** An emoji, drawn once per size step to a sprite and scaled from there (colour emoji are slow to draw as text). */
function emo(s, x, y, size, rot = 0) {
  const q = Math.ceil(size / 24) * 24, key = s + q;
  let c = EMO.get(key);
  if (!c) { c = document.createElement('canvas'); c.width = c.height = Math.ceil(q * 1.5); const k = c.getContext('2d'); k.font = `${q}px sans-serif`; k.textAlign = 'center'; k.textBaseline = 'middle'; k.fillStyle = '#000'; k.fillText(s, c.width / 2, c.height / 2); if (EMO.size > 120) EMO.clear(); EMO.set(key, c); }
  const d = c.width * size / q;
  if (rot) { g.save(); g.translate(x, y); g.rotate(rot); g.drawImage(c, -d / 2, -d / 2, d, d); g.restore(); } else g.drawImage(c, x - d / 2, y - d / 2, d, d);
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
/** Draw image asset `id` centred at x,y (or the emoji fallback). o: sx, sy scale, rot, gold tint, dim (silhouette). */
function pic(id, fallback, x, y, size, o = {}) {
  g.save(); g.translate(x, y); g.rotate(o.rot || 0); g.scale(o.sx || 1, o.sy || 1); if (o.dim) g.globalAlpha = 0.18;
  if (ready(id)) {
    const im = o.gold ? goldCopy(id) : IMG[id], k = size * 1.1 / Math.max(im.width, im.height);
    g.drawImage(im, -im.width * k / 2, -im.height * k / 2, im.width * k, im.height * k);
  } else { emo(fallback, 0, 0, size * 0.8); if (o.gold) emo('✨', size * 0.36, -size * 0.36, size * 0.36); }
  g.restore();
}
/** A gold coin drawn by hand (the coin emoji is missing on older phones). */
function coin(x, y, r) {
  g.fillStyle = '#e39a00'; g.beginPath(); g.arc(x, y + r * 0.1, r, 0, TAU); g.fill();
  g.fillStyle = '#ffd21f'; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
  g.fillStyle = '#fff3a6'; g.beginPath(); g.arc(x - r * 0.3, y - r * 0.3, r * 0.28, 0, TAU); g.fill();
  g.strokeStyle = '#e39a00'; g.lineWidth = r * 0.16; g.beginPath(); g.arc(x, y, r * 0.62, 0, TAU); g.stroke();
}
function star(x, y, r, col, rot = 0) {
  g.fillStyle = col; g.beginPath();
  for (let i = 0; i < 10; i++) { const a = rot + i * Math.PI / 5 - Math.PI / 2, q = i % 2 ? r * 0.45 : r; g.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q); }
  g.closePath(); g.fill();
}
function pill(x, y, w, h, line = '#5a1e86', fill = '#fff') { rr(x, y, w, h, h / 2); g.fillStyle = fill; g.fill(); g.lineWidth = 6; g.strokeStyle = line; g.stroke(); }
function button(label, col, cx = 360, w = 420, icon = 'next') {
  const y = LANE.btn, s = 1 + Math.sin(S.t * 5) * 0.025;
  group('button', cx - w / 2, y - 60, w, 120, () => {
    g.save(); g.translate(cx, y); g.scale(s, s);
    rr(-w / 2, -52, w, 116, 58); g.fillStyle = 'rgba(90,30,134,0.28)'; g.fill();
    rr(-w / 2, -60, w, 112, 56); g.fillStyle = col; g.fill(); g.lineWidth = 8; g.strokeStyle = '#fff'; g.stroke();
    const dir = rtl() ? -1 : 1, ix = -dir * (w / 2 - 62);
    g.fillStyle = '#fff'; g.strokeStyle = '#fff'; g.lineWidth = 9; g.lineCap = 'round';
    if (icon === 'again') { g.beginPath(); g.arc(ix, -4, 22, 0.6, TAU - 0.5); g.stroke(); g.beginPath(); g.moveTo(ix + 30, -22); g.lineTo(ix + 14, -4); g.lineTo(ix + 36, 2); g.closePath(); g.fill(); }
    else { g.beginPath(); g.moveTo(ix - dir * 16, -30); g.lineTo(ix + dir * 22, -4); g.lineTo(ix - dir * 16, 22); g.closePath(); g.fill(); }
    txt(label, dir * 44, -4, 46, '#fff', 'rgba(0,0,0,0.25)', 8, w - 156);
    g.restore();
  });
}
function roundBtn(n, x, y, r, col, face) {
  group(n, x - r, y - r, r * 2, r * 2, () => { g.fillStyle = 'rgba(90,30,134,0.25)'; g.beginPath(); g.arc(x, y + 5, r, 0, TAU); g.fill(); g.fillStyle = col; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); g.lineWidth = 6; g.strokeStyle = '#fff'; g.stroke(); face(); });
}
/** A pinata-shape icon for orders and the shape row. */
function rewardIcon(u, x, y, r) {
  if (u.kind === 'shape') emo(SHAPE_E[u.i], x, y + 2, r * 1.5);
  else if (u.kind === 'color') { g.fillStyle = css(PAPER[u.i]); g.beginPath(); g.arc(x, y, r * 0.8, 0, TAU); g.fill(); g.lineWidth = 5; g.strokeStyle = '#fff'; g.stroke(); }
  else if (u.kind === 'sticker') pic(STICKERS[u.i][0], STICKERS[u.i][1], x, y, r * 1.7);
  else if (u.kind === 'candy') pic(CANDY[u.i][0], CANDY[u.i][1], x, y, r * 1.7);
  else if (u.kind === 'perk') emo('💥', x, y + 2, r * 1.5);
  else if (u.kind === 'theme') emo(THEME_E[u.i], x, y + 2, r * 1.5);
  else coin(x, y, r * 0.8);
}

/* ---------- HUD ---------- */
function drawHud() {
  const y = LANE.hud;
  roundBtn('mute', mx(664), y, 48, save.muted ? '#b9b3c6' : '#7a3cff', () => { emo(save.muted ? '🔇' : '🔊', mx(664), y + 3, 50); });
  if (save.made < 1 && save.smashed < 1 && S.step < 5) return; // the opening pinata shows only the steps, until there are coins to count
  group('coins', hx(24, 170), y - 40, 170, 80, () => {
    pill(hx(24, 170), y - 40, 170, 80); coin(mx(66), y, 26);
    g.font = '900 40px "Trebuchet MS", Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#5a1e86'; g.fillText(String(Math.min(save.coins, 99999)), mx(136), y + 2, 96);
  });
  const nr = nextReward();
  group('reward', hx(210, 276), y - 40, 276, 80, () => {
    pill(hx(210, 276), y - 40, 276, 80);
    // one chunk per pinata still to make, filled as they are made: no number to read
    const total = Math.min(6, Math.max(nr.left, Math.round(nr.left / Math.max(0.01, 1 - nr.frac)))), done = total - Math.min(total, nr.left), cw = (150 - (total - 1) * 6) / total;
    for (let i = 0; i < total; i++) { rr(hx(232 + i * (cw + 6), cw), y - 15, cw, 30, 10); g.fillStyle = i < done ? '#ff5aa8' : '#fff'; g.fill(); g.lineWidth = 4; g.strokeStyle = i < done ? '#d6297f' : '#b9a3e0'; g.stroke(); }
    rewardIcon(nr.u, mx(438), y, nr.left === 1 ? 30 + Math.sin(S.t * 6) * 4 : 30);
  });
  if (bookShown()) { const buy = canBuy(), r = 48 + (buy ? Math.sin(S.t * 6) * 3 : 0); roundBtn('book', mx(556), y, 48, '#ff8a00', () => { emo('🧸', mx(556), y + 2, r); if (buy) coin(mx(556) + 32, y - 32, 17); }); }
}
function drawSteps() {
  const y = LANE.steps;
  if (!S.opening) group('steps', 100, y - 42, 520, 84, () => {
    for (let i = 0; i < 5; i++) {
      const x = mx(140 + i * 110), cur = i === Math.min(S.step, 4), done = i < S.step, r = cur ? 40 : 30;
      if (i < 4) { g.strokeStyle = done ? '#12c36b' : 'rgba(255,255,255,0.8)'; g.lineWidth = 10; g.beginPath(); g.moveTo(x + (rtl() ? -34 : 34), y); g.lineTo(x + (rtl() ? -76 : 76), y); g.stroke(); }
      g.fillStyle = cur ? '#ff2d8a' : done ? '#12c36b' : '#ffffff'; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); g.lineWidth = 5; g.strokeStyle = cur ? '#fff' : '#5a2ca0'; g.stroke();
      if (done) txt('✓', x, y + 2, 34, '#fff', null); else emo(STEP_E[i], x, y + 3, cur ? 44 : 30);
    }
  });
  const p = stepProgress();
  if (p !== null) group('bar', 160, LANE.bar - 13, 400, 26, () => {
    rr(160, LANE.bar - 13, 400, 26, 13); g.fillStyle = 'rgba(255,255,255,0.9)'; g.fill(); g.lineWidth = 4; g.strokeStyle = '#5a1e86'; g.stroke();
    const w = 392 * clamp01(p); if (w > 6) { rr(rtl() ? 556 - w : 164, LANE.bar - 9, w, 18, 9); g.fillStyle = S.step === 4 ? '#ff7a00' : '#12c36b'; g.fill(); }
  });
}
/** How far the current step is, 0..1 (null when the step has no bar). */
function stepProgress() {
  if (S.step === 1) return ready3d ? scene.coveredCount() / S.total : 0;
  if (S.step === 2) return S.stuck / need('stickersNeeded');
  if (S.step === 3) return S.fill / need('fillTaps');
  if (S.step === 4) return 1 - S.hp / S.hpMax;
  if (S.step === 5) return S.capReady ? 1 : 1 - clamp01(S.collectT / need('collectSeconds'));
  return null;
}
function drawOrder() {
  const o = S.order, y = LANE.order; if (!o || S.step > 3) return;
  const met = ready3d && orderMet();
  group('order', 150, y - 52, 420, 104, () => {
    pill(150, y - 52, 420, 104, met ? '#12a454' : '#5a1e86', met ? '#e2ffe9' : '#fff');
    pic(GUESTS[o.guest][0], GUESTS[o.guest][1], mx(212), y, 88);
    emo(SHAPE_E[o.shape], mx(310), y + 3, 62);
    g.fillStyle = css(PAPER[o.color]); g.beginPath(); g.arc(mx(388), y, 28, 0, TAU); g.fill(); g.lineWidth = 5; g.strokeStyle = '#5a1e86'; g.stroke();
    if (met) txt('✓', mx(500), y + 2, 60, '#12a454', '#fff', 8);
    else { coin(mx(470), y, 22); g.font = '900 34px Arial'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#5a1e86'; g.fillText('+' + cfg.orderCoins, mx(522), y + 2); }
  });
}
function drawRow() {
  const n = rowCount(), kind = rowKind(); if (!n || S.step > 3) return;
  const sel = [S.shape, S.color, S.sticker, -1][S.step];
  for (let i = 0; i < n; i++) {
    const x = slotX(i, n), y = LANE.row, open = isOpen(kind, i), on = i === sel, r = on ? 56 : 50;
    group('slot' + i, x - 56, y - 56, 112, 112, () => {
      g.fillStyle = 'rgba(90,30,134,0.25)'; g.beginPath(); g.arc(x, y + 6, r, 0, TAU); g.fill();
      g.fillStyle = open ? '#fff' : '#d8d2e2'; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
      g.lineWidth = on ? 9 : 5; g.strokeStyle = on ? '#ff2d8a' : '#5a1e86'; g.stroke();
      g.save(); if (!open) g.globalAlpha = 0.7;
      if (kind === 'shape') emo(SHAPE_E[i], x, y + 3, 58);
      else if (kind === 'color') { g.fillStyle = css(PAPER[i]); g.beginPath(); g.arc(x, y, r - 14, 0, TAU); g.fill(); }
      else if (kind === 'sticker') pic(STICKERS[i][0], STICKERS[i][1], x, y, 76);
      else pic(CANDY[i][0], CANDY[i][1], x, y, 76);
      g.restore();
      if (!open) { g.fillStyle = '#7a3cff'; g.beginPath(); g.arc(x + 36, y - 36, 21, 0, TAU); g.fill(); emo('🔒', x + 36, y - 35, 24); rr(x - 34, y + 22, 68, 32, 16); g.fillStyle = '#fff'; g.fill(); g.lineWidth = 3; g.strokeStyle = '#7a3cff'; g.stroke(); emo('💥', x - 15, y + 39, 22); g.font = '900 24px Arial'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#5a1e86'; g.fillText(String(pinatasUntil(kind, i)), x + 14, y + 39); }
      else if (kind === 'candy' && S.mix[i]) { g.fillStyle = '#ff2d8a'; g.beginPath(); g.arc(x + 38, y - 38, 20, 0, TAU); g.fill(); g.font = '900 26px Arial'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#fff'; g.fillText(String(S.mix[i]), x + 38, y - 37); }
    });
  }
}
function drawControls() {
  if (S.done > 0) return;
  if (S.step === 0) button(T('next'), '#12c36b');
  else if (S.step === 2 && S.stuck >= need('stickersNeeded')) button(T('next'), '#12c36b');
}
function drawParts() {
  for (const q of S.parts) {
    if (q.kind === 'coin') { const k = 1 - q.life / q.max, e = k * k, tx = mx(66), ty = LANE.hud; coin(q.sx + (tx - q.sx) * e, q.sy + (ty - q.sy) * e - Math.sin(k * Math.PI) * 90, 20 - k * 6); }
    else if (q.kind === 'pow') { const k = 1 - q.life / q.max; g.save(); g.globalAlpha = 1 - k; star(q.x, q.y, 60 + k * 90, '#fff', k); star(q.x, q.y, 36 + k * 60, '#ffd21f', -k); g.restore(); }
    else if (q.kind === 'star') { g.globalAlpha = clamp01(q.life * 3); star(q.x, q.y, q.r * 1.6, q.col, q.life * 6); g.globalAlpha = 1; }
    else { g.globalAlpha = clamp01(q.life * 3); g.fillStyle = q.col; g.beginPath(); g.arc(q.x, q.y, q.r, 0, TAU); g.fill(); g.globalAlpha = 1; }
  }
}
function ghostHand(kind, cx, cy, size) {
  const t = S.t; let fx = cx, fy = cy + 8;
  g.strokeStyle = '#ff2d8a'; g.lineWidth = 8; g.lineCap = 'round';
  if (kind === 'rub') { fx = cx + Math.sin(t * 4) * 110; fy = cy + Math.sin(t * 8) * 28; }
  else { const k = (t % 0.7) / 0.7; g.globalAlpha = 1 - k; g.beginPath(); g.arc(cx, cy - 26, 14 + k * 34, 0, TAU); g.stroke(); g.globalAlpha = 1; fy += Math.sin(k * Math.PI) * -14; }
  emo('👆', fx, fy, size);
}
/** Spotlight: dim the screen except the thing to touch, and show the gesture right on it. An overlay by design, so it records no box. */
function drawHelp() {
  const t = helpTarget();
  if (!t) return;
  g.fillStyle = 'rgba(60,20,90,0.14)'; g.beginPath(); g.rect(0, 0, W, H); g.roundRect(t.x - 12, t.y - 12, t.w + 24, t.h + 24, 44); g.fill('evenodd');
  g.lineWidth = 8; g.strokeStyle = `rgba(255,255,255,${0.6 + Math.sin(S.t * 6) * 0.35})`; rr(t.x - 12, t.y - 12, t.w + 24, t.h + 24, 44); g.stroke();
  ghostHand(t.hand, t.x + t.w / 2, t.h > 200 ? t.y + t.h * 0.62 + 24 : t.y + t.h + 44, 104); // under a small target, so the hand never covers it
  if (!S.intro) { grouped++; txt(sayText(), 360, LANE.say, 54); grouped--; } // the instruction stays bright above the dimming
}
const sayText = () => T(S.step === 5 && S.capReady ? 's5b' : 's' + S.step);

/* ---------- prize screen ---------- */
function drawPrizeScreen() {
  const pz = S.prizes[0], toy = pz.toy, k = clamp01(S.stepT / 0.45), sc = backOut(k), e = S.earned;
  const card = g.createLinearGradient(0, 130, 0, 1240); card.addColorStop(0, '#ffffff'); card.addColorStop(1, '#fff1b8');
  g.fillStyle = card; rr(40, 130, 640, 1110, 60); g.fill(); g.lineWidth = 8; g.strokeStyle = RARITY[toy.tier]; g.stroke();
  box('card', 40, 130, 640, 1110);
  grouped++;
  // rays
  g.save(); rr(44, 134, 632, 1102, 56); g.clip(); g.translate(360, 500); g.rotate(S.t * 0.5);
  for (let i = 0; i < 12; i++) { g.rotate(TAU / 12); g.globalAlpha = i % 2 ? 0.34 : 0.16; g.fillStyle = RARITY[toy.tier]; g.beginPath(); g.moveTo(0, 0); g.lineTo(-52, -380); g.lineTo(52, -380); g.fill(); }
  g.restore();
  txt(pz.isNew ? T(albumDone() && save.owned.length === TOYS.length && !pz.gold ? 'albumDone' : 'newToy') : T('r' + toy.tier), 360, 215, 62, pz.isNew ? '#ff2d8a' : RARITY[toy.tier], '#fff', 12, 560);
  pic(toy.id, toy.e, 360, 500 - (1 - k) * 200 + Math.sin(S.t * 3) * 10, 400, { sx: sc, sy: sc, gold: pz.gold });
  pill(240, 742, 240, 56, RARITY[toy.tier], RARITY[toy.tier]); txt(T('r' + toy.tier), 360, 771, 32, '#fff', null, 0, 210);
  // earnings: coins for the pinata (+ order), candy grabbed, stars toward a golden pinata
  const cells = [[() => coin(0, 0, 30), '+' + (e.base + e.order + e.candy * cfg.coinsPerCandy)]]; // candy is coins, so one number
  if (!pz.isNew) cells.push([() => star(0, 0, 28, '#ffc928'), save.stars + '/' + cfg.starsForGolden]);
  if (e.daily) cells.push([() => { emo('📅', 0, 2, 58); g.font = '900 22px Arial'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#ff2d8a'; g.fillText(String(save.streak), 0, 12); }, '+' + e.daily]);
  cells.forEach(([icon, label], i) => {
    const x = mx(360 + (i - (cells.length - 1) / 2) * (cells.length > 2 ? 190 : 220) + (e.met ? 30 : 0)), y = 866;
    g.save(); g.translate(x - 44, y); icon(); g.restore();
    g.font = '900 44px "Trebuchet MS", Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#5a1e86'; g.fillText(label, x + 34, y + 2);
  });
  if (e.met) { pic(GUESTS[S.order.guest][0], GUESTS[S.order.guest][1], mx(112), 866, 96); emo('💗', mx(152), 812, 40); }
  if (S.gift) {
    const y = LANE.row;
    if (!S.giftOpen) { const w = Math.sin(S.t * 9) * 0.1; emo('🎁', 360, y, 150, w); ghostHand('tap', 440, y + 30, 80); }
    else { g.fillStyle = '#fff6c9'; g.beginPath(); g.arc(360, y, 76, 0, TAU); g.fill(); g.lineWidth = 6; g.strokeStyle = '#ffb300'; g.stroke(); rewardIcon(S.gift, 360, y, 52); if (S.gift.kind === 'coins') txt('+' + cfg.giftCoins, 360, y + 62, 34, '#5a1e86', '#fff', 8); }
  } else if (save.stars >= cfg.starsForGolden) txt(T('nextGolden'), 360, LANE.row, 40, '#e08a00', '#fff', 10, 560);
  grouped--;
  if (S.giftOpen && S.stepT >= S.btnAt) {
    if (canSmash()) { button(T('again'), '#12c36b', mx(300), 380, 'again'); roundBtn('smash', mx(610), LANE.btn, 58, '#ff7a00', () => emo('💥', mx(610), LANE.btn + 3, 66)); }
    else button(T(S.opening ? 'make' : 'again'), '#12c36b', 360, 420, S.opening ? 'next' : 'again');
  }
}

/* ---------- book: toy album and stick shop ---------- */
function drawBook() {
  g.fillStyle = 'rgba(255,255,255,0.96)'; rr(24, 40, 672, 1216, 60); g.fill(); g.lineWidth = 8; g.strokeStyle = '#7a3cff'; g.stroke();
  box('card', 24, 40, 672, 1216); grouped++;
  for (let i = 0; i < 3; i++) { const x = mx(136 + i * 224), on = S.tab === i; pill(x - 100, 75, 200, 100, '#7a3cff', on ? '#7a3cff' : '#fff'); if (i === 1) pic(BATS[save.bat][0], BATS[save.bat][1], x, 125, 78); else emo(i ? '🏆' : '🧸', x, 128, 66); }
  if (S.tab === 2) {
    // top collectors: rank, name, candy grabbed; the player's own total underneath
    const list = board ? board.entries.slice(0, 8) : [];
    list.forEach((en, i) => {
      const y = 262 + i * 96;
      rr(70, y - 42, 580, 84, 30); g.fillStyle = i < 3 ? ['#fff3b0', '#eef1f6', '#ffe1c4'][i] : '#fff'; g.fill(); g.lineWidth = 5; g.strokeStyle = '#7a3cff'; g.stroke();
      g.textBaseline = 'middle'; g.fillStyle = '#5a1e86'; g.font = '900 40px Arial'; g.textAlign = 'center'; g.fillText(String(i + 1), mx(120), y + 2);
      g.font = '900 34px "Trebuchet MS", Arial, sans-serif'; g.textAlign = rtl() ? 'right' : 'left'; g.fillText(String(en.username || '?').slice(0, 14), mx(165), y + 2, 290);
      pic(CANDY[0][0], CANDY[0][1], mx(500), y, 52); g.font = '900 34px Arial'; g.textAlign = 'center'; g.fillText(String(en.score), mx(580), y + 2, 110);
    });
    if (!list.length) emo('🏆', 360, 520, 220);
    pill(180, 1032, 360, 88, '#ff2d8a', '#fff'); pic(CANDY[0][0], CANDY[0][1], mx(250), 1076, 62);
    g.font = '900 46px Arial'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#5a1e86'; g.fillText(String(save.candies), mx(390), 1078, 200);
  } else if (S.tab === 0) {
    const goldSet = albumDone(), have = goldSet ? save.gold : save.owned;
    txt(have.length + ' / ' + TOYS.length, 360, 222, 44, goldSet ? '#e08a00' : '#5a1e86');
    { const y = 1076, got = save.stars >= cfg.starsForGolden, can = save.coins >= cfg.goldenPrice, sh = S.shakeRow && S.shakeRow.i === -1 ? Math.sin(S.t * 60) * 8 : 0;
      pill(180 + sh, y - 44, 360, 88, got ? '#12a454' : can ? '#e08a00' : '#b9b3c6', got ? '#e2ffe9' : can ? '#ffd21f' : '#e6e1ee');
      star(mx(236) + sh, y, 30, '#ffb300'); emo(SHAPE_E[0], mx(236) + sh, y + 2, 30);
      if (got) txt('✓', mx(400) + sh, y + 2, 60, '#12a454', null);
      else { coin(mx(350) + sh, y, 26); g.font = '900 44px Arial'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = can ? '#5a1e86' : '#8d86a0'; g.fillText(String(cfg.goldenPrice), mx(436) + sh, y + 2); } }
    TOYS.forEach((t, i) => {
      const x = mx(126 + (i % 4) * 156), y = 356 + (i / 4 | 0) * 186, got = have.includes(t.i);
      rr(x - 68, y - 78, 136, 160, 28); g.fillStyle = got ? '#fff' : '#efe9f6'; g.fill(); g.lineWidth = 6; g.strokeStyle = RARITY[t.tier]; g.stroke();
      if (got) pic(t.id, t.e, x, y - 4, 112, { gold: goldSet });
      else if (goldSet) pic(t.id, t.e, x, y - 4, 112, { dim: true });
      else txt('?', x, y, 80, '#cbbfe0', null);
    });
  } else {
    BATS.forEach((b, i) => {
      const y = 290 + i * 180, own = save.bats.includes(i), on = save.bat === i, sh = S.shakeRow && S.shakeRow.i === i ? Math.sin(S.t * 60) * 8 : 0;
      rr(70 + sh, y - 76, 580, 152, 40); g.fillStyle = on ? '#e2ffe9' : '#fff'; g.fill(); g.lineWidth = 6; g.strokeStyle = on ? '#12a454' : '#7a3cff'; g.stroke();
      pic(b[0], b[1], mx(170) + sh, y, 124);
      if (cfg.batBonusCandy[i]) { pic(CANDY[0][0], CANDY[0][1], mx(290) + sh, y, 56); g.font = '900 36px Arial'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#5a1e86'; g.fillText('+' + cfg.batBonusCandy[i], mx(346) + sh, y + 2); }
      if (on) txt('✓', mx(500) + sh, y + 2, 76, '#12a454', null);
      else if (own) { pill(mx(500) - 90 + sh, y - 40, 180, 80, '#7a3cff', '#fff'); emo('👆', mx(500) + sh, y + 2, 48); }
      else { const can = save.coins >= cfg.batPrices[i]; pill(mx(500) - 100 + sh, y - 40, 200, 80, can ? '#12a454' : '#b9b3c6', can ? '#12c36b' : '#e6e1ee'); coin(mx(500) - 54 + sh, y, 24); g.font = '900 40px Arial'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = can ? '#fff' : '#8d86a0'; g.fillText(String(cfg.batPrices[i]), mx(500) + 26 + sh, y + 2); }
    });
  }
  grouped--;
  roundBtn('lang', mx(120), 1190, 52, '#2fb4ff', () => emo('🌐', mx(120), 1193, 56));
  txt(T('name'), 360, 1190, 38, '#5a1e86', null, 0, 280);
  roundBtn('close', mx(600), 1190, 52, '#ff4d6d', () => txt('✕', mx(600), 1192, 52, '#fff', null));
}

/* ---------- frame ---------- */
function drawLoading() {
  const s = g.createLinearGradient(0, 0, 0, H); s.addColorStop(0, '#39b8ff'); s.addColorStop(0.7, '#a8e6ff'); s.addColorStop(1, '#8be36a'); g.fillStyle = s; g.fillRect(0, 0, W, H);
  const y = 560 + Math.sin(S.t * 4) * 30;
  g.strokeStyle = '#f2e2c4'; g.lineWidth = 8; g.beginPath(); g.moveTo(360, 0); g.lineTo(360 + Math.sin(S.t * 2) * 40, y - 120); g.stroke();
  g.save(); g.translate(360 + Math.sin(S.t * 2) * 40, y); g.rotate(Math.sin(S.t * 2) * 0.25);
  for (let i = 0; i < 5; i++) star(0, 0, 170 - i * 30, css(PAPER[i]), 0);
  g.restore();
  txt(T('tip'), 360, 900, 52, '#ff2d8a', '#fff', 12, 640);
  txt(loadFail ? '⚠' : T('loading'), 360, 1000, 36, '#5a1e86', '#fff', 8, 600);
}
function draw() {
  BOXES.length = 0;
  g.clearRect(0, 0, W, H);
  if (!ready3d) { drawLoading(); debugOut(); return; }
  scene.render();
  if (mode === 'edit') { debugOut(); return; }
  if (S.panel) { drawBook(); drawParts(); debugOut(); return; }
  if (S.step === 6) { drawPrizeScreen(); drawParts(); debugOut(); return; }
  drawHud(); drawSteps();
  if (!helpTarget() || S.intro) txt(sayText(), 360, LANE.say, 54);
  for (const f of S.F) { g.globalAlpha = clamp01(f.life * 3); txt(f.txt, 360, LANE.toast + (1.4 - f.life) * 8, 58, f.c, '#fff', 14, 640); g.globalAlpha = 1; }
  drawOrder(); drawRow(); drawControls(); drawParts(); drawHelp();
  if (S.flash > 0) { g.fillStyle = `rgba(255,255,255,${S.flash * 0.85})`; g.fillRect(0, 0, W, H); }
  debugOut();
}
function debugOut() {
  if (!DEBUG) return;
  window.__boxes = BOXES.slice();
  Object.assign(cv.dataset, { ready: ready3d ? 1 : 0, step: S.step, toy: S.step === 6 && S.prizes ? S.prizes[0].toy.id : '', made: save.made, muted: save.muted ? 1 : 0, lang, rtl: rtl() ? 1 : 0, quality, coins: save.coins, hp: S.hp, cap: S.capReady ? 1 : 0, prog: (stepProgress() || 0).toFixed(3) });
}
function frame(now) {
  const dt = Math.min((now - last) / 1000, 0.11); last = now;
  // Auto-detect a slow device: under 40 FPS for cfg.lowFpsSeconds halves confetti and candy.
  // shortcut: quality never climbs back in a session; add a recovery timer if a brief stall proves too costly.
  slow = dt > 1 / 40 ? slow + dt : Math.max(0, slow - dt);
  if (slow > cfg.lowFpsSeconds && quality === 1) { quality = 0.5; scene.setQuality(0.5); }
  if (mode === 'play') update(dt); else S.t += dt; // edit mode: a live picture, no gameplay
  if (ready3d) { let k = 1; if (S.slowT > 0) { S.slowT -= dt; k = cfg.slowMoScale; } if (S.stopT > 0) { S.stopT -= dt; k = 0; } scene.update(dt * k, dt); }
  draw();
  raf = requestAnimationFrame(frame);
}
/** Cache every image that asset_map.json provides. Missing ones fall back to emoji. */
function loadImages() {
  for (const id of IMAGE_IDS) { const a = lib.getAsset(id); if (a && !IMG[id]) { IMG[id] = new Image(); IMG[id].crossOrigin = 'anonymous'; IMG[id].src = a.url; } }
}
/** Load Three.js from the first CDN that answers, then build the yard. */
async function load3d() {
  let three = null;
  if (loading3d || ready3d) return;
  loading3d = true; loadFail = false;
  // a browser may remember a failed module fetch, so every retry asks under a new query string
  for (const url of THREE_URLS) { try { three = await import(tries3d ? url + '?retry=' + tries3d : url); break; } catch (e) { three = null; } }
  tries3d++;
  try {
    if (!three) throw new Error('3D library did not load');
    scene.initScene(three, gl, { quality, image: id => ready(id) ? IMG[id] : null });
    ready3d = true;
  } catch (e) { loadFail = true; lib.log('3D start failed: ' + (e && e.stack || e)); if (DEBUG) window.__loadErr = String(e && e.stack || e); setTimeout(load3d, 4000); } // try again by itself; a tap tries at once
  loading3d = false;
  if (ready3d) stage(); // outside the try: a mistake in the game's own code must show as an error, not as a quiet retry
}

/** Read the player's save. A failed read is tried again (2 s apart, then every 10 s); the game stays playable but writes nothing until one succeeds. */
function loadSave(tries) {
  lib.getUserGameState().then(r => {
    if (r && r.state && Array.isArray(r.state.owned)) {
      save = mergeSave(save, r.state); setMuted(save.muted); lang = save.lang || detectLang();
      if (!touched) newRound(); // pick up what this player has already unlocked
    }
    loaded = true;
  }).catch(() => { setTimeout(() => loadSave(tries + 1), tries < 5 ? 2000 : 10000); });
}

/** Entry point. The host calls this on start and on every reload. */
function run(m) {
  mode = m; cfg = window.gameConfig;
  const wrap = document.getElementById('stage') || document.body;
  const make = (id, z) => document.getElementById(id) || wrap.appendChild(Object.assign(document.createElement('canvas'), { id, style: `position:absolute;left:0;top:0;width:100%;height:100%;z-index:${z}` }));
  gl = make('gl', 1); cv = make('game', 2);
  cv.width = W; cv.height = H; cv.style.touchAction = 'none';
  g = cv.getContext('2d');
  const slider = (key, min, max, step) => ({ key, type: 'slider', min, max, step });
  lib.showGameParameters({
    name: 'Pinata Settings',
    params: {
      'Hits to smash': slider('hitsNeeded', 3, 25, 1), 'Stickers needed': slider('stickersNeeded', 1, 10, 1), 'Candy taps to fill': slider('fillTaps', 2, 12, 1),
      'Candy rain per tap': slider('rainPerTap', 2, 8, 1), 'Seconds to grab candy': slider('collectSeconds', 3, 15, 1), 'Coins per candy': slider('coinsPerCandy', 1, 5, 1),
      'Coins per pinata': slider('coinsPerPinata', 0, 50, 5), 'Coins for a filled order': slider('orderCoins', 0, 100, 5),
      'Golden pinata chance': slider('goldenChance', 0, 1, 0.01), 'Mega candy rain chance': slider('megaChance', 0, 1, 0.01),
      'Stars for a golden pinata': slider('starsForGolden', 1, 10, 1), 'Duplicates before a sure new toy': slider('pityDupes', 1, 10, 1),
      'Party round every N pinatas': slider('partyEvery', 2, 10, 1), 'Slow motion length (s)': slider('slowMoSeconds', 0, 2, 0.1),
    },
  });
  lang = save.lang || detectLang();
  loadImages();
  cancelAnimationFrame(raf); newRound(); // stages the round itself when the yard is ready
  if (!ready3d) load3d();
  if (mode === 'play') {
    initAudio(); bindInput();
    loadSave(0);
  }
  if (DEBUG) window.__game = { get S() { return S; }, get save() { return save; }, set save(v) { save = mergeSave(save, v); }, scene, cfg, newRound, seed(n) { let a = n >>> 0; R = () => { a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }, pickToy, drawPrize, nextReward, rewardAt, isOpen, perk, TOYS, hitNow, reveal, advance, enterSmash, helpTarget, orderMet, mergeSave, detectLang, setLang(l) { lang = l; }, claimDaily, canSmash, loadBoard, bookShown, get loaded() { return loaded; }, get ready3d() { return ready3d; } };
  last = performance.now(); raf = requestAnimationFrame(frame);
}
window.run = run;

/* ---------- local preview (index.html?local): a stand-in for the Astrocade host ---------- */
if (DEBUG && !window.lib) (async () => {
  const q = location.search, json = f => fetch(f).then(r => r.json());
  const [config, assets] = await Promise.all([json('./game_config.json'), q.includes('noassets') ? {} : json('./asset_map.json').catch(() => ({}))]);
  delete config.persistent_storage_config;
  let slot = window.__seedSave || null; const hap = { n: 0 };
  window.lib = {
    getAsset: id => assets[id], log: () => {}, showGameParameters: () => {}, shouldUseTouchControls: () => true,
    saveUserGameState: async s => { slot = JSON.parse(JSON.stringify(s)); window.__saved = slot; return { success: true }; },
    getUserGameState: async () => { if (window.__saveFails > 0) { window.__saveFails--; throw new Error('save service down'); } return { state: slot }; }, deleteUserGameState: async () => { slot = null; return { success: true }; },
    addPlayerScoreToLeaderboard: async () => ({ entries: [], userRank: null }), getTopNEntriesFromLeaderboard: async () => ({ entries: [['Luna', 940], ['محمد', 815], ['Diego', 702], ['Ánh', 655], ['आरव', 590]].map(([username, score]) => ({ username, score, profilePicture: null })), userRank: null }),
    haptics: { supported: false, play: () => { hap.n++; window.__haptics = hap.n; }, start: () => {}, stop: () => {} },
  };
  window.gameConfig = config; run(q.includes('edit') ? 'edit' : 'play');
})();
