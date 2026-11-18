// PROTOTYPE - NOT FOR PRODUCTION
/*
 * Fizzy Bath Bomb Maker
 * Make a bath bomb in six steps: pour powder, add color, stir, press, decorate,
 * then drop it in the bath. It fizzes away and a surprise toy pops out.
 *
 * Reasons to make another one:
 *  - a customer orders a shape and a color; filling the order pays extra coins;
 *  - every mold x color made is a new page in the recipe book (25 recipes);
 *  - toys fill a 16-slot album; a full album switches to gold toys;
 *  - a reward bar in the HUD always shows the next unlock and how close it is;
 *  - coins buy bathtubs in the shop, and every third bomb ends with a bubble-popping bonus round;
 *  - decorating fills a Luck meter; duplicate toys pay stars toward a golden bomb.
 * First minutes: the first bomb is a short one; the HUD chips, the customer, the Luck meter and the
 * shop appear one at a time, each introduced by a spotlight that waits for one tap; a ghost hand shows
 * the gesture on the real object during the first bomb and whenever the player is idle.
 * There is no fail state: a step that is not finished only asks for a bit more.
 *
 * Layout: the 720 x 1280 screen is cut into fixed lanes (LANE below). Every UI
 * element lives in one lane, so nothing can cover anything else; in debug the
 * game records the box of each element and the playtest fails on any overlap.
 *
 * The game shows the player's device language when it has strings for it
 * (cfg.strings), else English. Tunable numbers and all player-facing text live
 * in game_config.json. Art and sound come from asset_map.json when an asset
 * exists; otherwise the game draws emoji and synthesizes sound.
 */
const W = 720, H = 1280, TAU = Math.PI * 2;
// Lanes, top to bottom: HUD, step bar, instruction, toast, customer order, play area (430-915), choice row, action button.
const LANE = { hud: 70, steps: 140, say: 205, toast: 283, order: 375, row: 985, btn: 1150 };
const BOWL = { x: 360, y: 720 }, BALL = { x: 360, y: 672, r: 180 }, WATER_Y = 690, PRESS_Y = 690;
const COLORS = [[255, 92, 168], [255, 200, 0], [64, 190, 255], [160, 110, 255], [70, 215, 120]];
const TOPS = [{ e: '✨', id: 'top_sparkle' }, { e: '⭐', id: 'top_star' }, { e: '💗', id: 'top_heart' }, { e: '🌸', id: 'top_flower' }, { e: '🍬', id: 'top_candy' }];
const MOLDS = 5; // ball, heart, star, donut, flower
const CUSTOMERS = [['🐱', 'cat'], ['🐶', 'dog'], ['🐰', 'bunny'], ['🐻', 'bear'], ['🐼', 'panda'], ['🦊', 'fox'], ['🐸', 'frog'], ['🐵', 'monkey']].map(([e, n]) => ({ e, id: 'cust_' + n }));
// Bathtubs sold in the shop for coins (prices in cfg.skinPrices). The first one is free.
const SKINS = [['#ffffff', '#cfe6ff'], ['#ffd0e6', '#ff8fc4'], ['#c9f7e2', '#5fd6a0'], ['#e3d6ff', '#a98bff'], ['#ffe9a3', '#ffb800'], ['#ffd0e6', '#7a3cff']];
const RARITY = ['#27a8ff', '#a352ff', '#ff7a00', '#f08a00'];
const TOYS = [
  ['🦆', 'Ducky', 0], ['🐸', 'Froggy', 0], ['🐟', 'Fishy', 0], ['🐢', 'Turtle', 0], ['🐙', 'Octo', 0], ['🦀', 'Crabby', 0],
  ['🐳', 'Whale', 0], ['🐥', 'Chick', 0], ['🦄', 'Unicorn', 1], ['🐬', 'Dolphin', 1], ['🦈', 'Sharky', 1], ['🧸', 'Teddy', 1],
  ['🦋', 'Butterfly', 1], ['🐉', 'Dragon', 2], ['👑', 'Crown', 2], ['💎', 'Diamond', 3],
].map(([e, n, r]) => ({ e, n, r, id: 'toy_' + n.toLowerCase() }));
const IMAGE_IDS = [...TOYS.map(t => t.id), ...TOPS.map(t => t.id), ...CUSTOMERS.map(c => c.id), 'bg_bathroom', 'jar_powder'];
const SOUND_IDS = ['sfx_pour', 'sfx_drop', 'sfx_stir', 'sfx_press', 'sfx_pop', 'sfx_splash', 'sfx_fizz', 'sfx_win', 'sfx_squeak', 'music'];
const DEBUG = location.search.includes('local');

let cv, g, cfg, mode, S, raf = 0, last = 0, bound = false, touched = false, board = null;
let ac = null, master = null, lang = 'en', quality = 1, slow = 0, grouped = 0;
let save = { owned: [], gold: [], recipes: [], skins: [0], skin: 0, made: 0, stars: 0, dupes: 0, coins: 0, muted: false, lang: null, seen: {} };
const IMG = {}, GOLD = {}, BUF = {}, LOOPS = {}, BOXES = [];

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
/** Mirror an x position (mx) or the left edge of a box of width w (hx) for right-to-left languages. */
const mx = x => rtl() ? W - x : x;
const hx = (x, w) => rtl() ? W - x - w : x;
const slotX = i => mx(104 + i * 128);
const slotAt = p => Math.abs(p.y - LANE.row) < 70 ? Math.round((mx(p.x) - 104) / 128) : -1;
const inBtn = p => Math.abs(p.x - 360) < 200 && Math.abs(p.y - LANE.btn) < 72;
const fillRule = kind => kind === 3 ? 'evenodd' : 'nonzero';
const albumDone = () => save.owned.length >= TOYS.length;
/** Bombs still to make before a mold, color, topping or charm opens. 0 means it is open. */
const bombsUntil = (kind, i) => Math.max(0, ...cfg.unlocks.filter(u => u.kind === kind && u.i === i).map(u => u.at - save.made));
const isOpen = (kind, i) => bombsUntil(kind, i) === 0;
const perk = i => cfg.unlocks.some(u => u.kind === 'perk' && u.i === i) && isOpen('perk', i) ? 2 : 1;
const luck = () => Math.min(1, S.tops.length / cfg.luckToppings);
/** Later bombs pour and stir faster, so the loop does not drag once the player knows it. */
const pace = () => save.made >= cfg.fastAfter ? cfg.fastFactor : 1;
const recipeKey = (mold, color) => mold + '-' + color;
/** True once feature `k` has been introduced to this player. A save from before introductions existed has no `seen` at all. */
const seen = k => !!(save.seen && save.seen[k]);
/** A step length. The very first bomb uses the shorter cfg.first values, so the first toy arrives in about 15 seconds. */
const need = k => save.made === 0 && cfg.first[k] !== undefined ? cfg.first[k] : cfg[k];
/** The reward the HUD bar is filling toward: the next unlock, or a coin gift every cfg.giftEvery bombs once unlocks run out. */
function nextReward(made = save.made) {
  const ats = cfg.unlocks.map(u => u.at).sort((a, b) => a - b), lastAt = ats[ats.length - 1] || 0;
  const u = cfg.unlocks.filter(x => x.at > made).sort((a, b) => a.at - b.at)[0];
  if (u) return { ...u, from: Math.max(0, ...ats.filter(a => a <= made)) };
  const at = (Math.floor(made / cfg.giftEvery) + 1) * cfg.giftEvery;
  return { kind: 'coins', at, from: Math.max(lastAt, at - cfg.giftEvery) };
}
/** What finishing bomb number `made` unlocks, if anything. */
const rewardAt = made => cfg.unlocks.find(u => u.at === made) || (made > Math.max(0, ...cfg.unlocks.map(u => u.at)) && made % cfg.giftEvery === 0 ? { kind: 'coins' } : null);

/** Combine two saves so a late load never drops anything won in this session. */
function mergeSave(a, b) {
  const union = (x, y) => [...new Set([...(x || []), ...(y || [])])], max = k => Math.max(a[k] || 0, b[k] || 0);
  return {
    owned: union(a.owned, b.owned), gold: union(a.gold, b.gold), recipes: union(a.recipes, b.recipes), skins: union([0], union(a.skins, b.skins)), skin: a.skin || b.skin || 0, seen: { ...(b.seen || {}), ...(a.seen || {}) },
    made: max('made'), stars: max('stars'), dupes: max('dupes'), coins: max('coins'), muted: !!(a.muted || b.muted), lang: a.lang || b.lang || null,
  };
}
const persist = () => { lib.saveUserGameState(save).catch(() => {}); };

/** A customer's order: a mold and a color among the open ones, preferring a recipe not made yet. The first bomb has no customer: orders arrive from the second. */
function newOrder(random = Math.random) {
  if (!save.made) return null;
  const all = [];
  for (let m = 0; m < MOLDS; m++) for (let c = 0; c < COLORS.length; c++) if (isOpen('mold', m) && isOpen('color', c)) all.push({ mold: m, color: c });
  const fresh = all.filter(o => !save.recipes.includes(recipeKey(o.mold, o.color))), pool = fresh.length ? fresh : all;
  return { who: random() * CUSTOMERS.length | 0, ...pool[random() * pool.length | 0] };
}
/** True when the bomb being made has the ordered shape and contains the ordered color. */
const orderMet = () => !!S.order && S.mold === S.order.mold && S.cols.includes(S.order.color);

/** Start a fresh bath bomb. Progress in `save` is kept. Enough stars buy a golden bomb. */
function newBomb() {
  let mold = 0;
  for (let i = 0; i < MOLDS; i++) if (isOpen('mold', i)) mold = i; // newest mold first, so the next bomb looks new
  let golden = false;
  if (save.made >= 1) {
    if (save.stars >= cfg.starsForGolden) { save.stars -= cfg.starsForGolden; golden = true; }
    else golden = Math.random() < cfg.goldenChance * perk(1);
  }
  stopLoops();
  // A feature seen for the first time is introduced alone: the game waits for one tap on it.
  const intro = save.made === 1 && !seen('order') ? 'order' : save.made >= 2 && !seen('shop') && SKINS.some((_, i) => !save.skins.includes(i) && save.coins >= cfg.skinPrices[i]) ? 'shop' : null;
  S = {
    step: 0, prog: 0, ok: false, okT: 0, t: 0, shake: 0, idle: 0, acted: false, intro: null, introT: 0, gift: false, pulse: 0, enter: 0,
    col: -1, cols: [], drops: 0, spots: [], falling: [], tops: [], top: 0, mold, golden, order: newOrder(),
    jar: 0, pourT: 0, tick: 0, swirl: 0, squash: 0, lastStamp: null, poke: 0,
    ball: { x: 360, y: 520, vy: 0, r: 78, held: false, loose: false, wet: false },
    fizz: 0, pop: null, popDone: false, popCoins: 0, prizes: null, earned: null, unlock: null, note: '', reveal: 0, book: null,
    ptr: { x: 0, y: 0, down: false }, P: [], F: [],
  };
  S.intro = intro;
}
/** The bomb's main paint (the last color dropped), white before any color. */
const paint = () => S.col < 0 ? [255, 255, 255] : COLORS[S.col];

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
    S.P.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - speed * 0.4, g: grav, r: rnd(0.5, 1) * r, c: col || rgb(COLORS[i % 5]), life: rnd(0.5, 1), max: 1, s: col ? 0 : i % 3, a: rnd(0, TAU) });
  }
}
const fanfare = n => [523, 659, 784, 1047, 1319].slice(0, n).forEach((f, i) => setTimeout(() => beep(f, 0.16, 'triangle', 0.14), i * 85));
function complete() {
  S.ok = true; S.okT = 0; S.acted = false; S.idle = 0;
  const gold = S.step === 3 && S.golden;
  toast(gold ? T('goldenBomb') : T('d' + S.step), gold ? '#ffb800' : '#ff2d8a');
  burst(360, 660, gold ? 90 : 40, gold ? '#ffd000' : null, 520);
  sfx('sfx_pop', () => fanfare(gold ? 5 : 3));
  lib.haptics.play('success');
}
function advance() {
  hum('sfx_pour', false); hum('sfx_stir', false);
  S.step++; S.prog = 0; S.ok = false; S.okT = 0; S.acted = false; S.idle = 0; S.enter = 0;
  if (S.step === 4 && save.made >= 1 && !seen('luck')) { S.intro = 'luck'; S.introT = 0; }
  beep(880, 0.1, 'triangle', 0.1, 300);
}
/**
 * Where help is needed right now, as a box plus the gesture to show there; null when none is.
 * Help shows for a feature being introduced, during the first bomb until the player acts on a step,
 * and on any bomb after cfg.idleHelp seconds without a touch.
 */
function helpTarget() {
  if (S.book || S.prizes) return null;
  if (S.intro === 'order') return { x: 130, y: LANE.order - 46, w: 460, h: 92, hand: 'tap' };
  if (S.intro === 'luck') return { x: mx(56) - 34, y: 438, w: 68, h: 462, hand: 'tap' };
  if (S.intro === 'shop') return { x: hx(536, 170), y: 28, w: 170, h: 84, hand: 'tap' };
  if (S.pop || !((save.made === 0 && !S.acted) || S.idle > cfg.idleHelp)) return null;
  if (S.ok) return S.step === 1 || S.step === 4 ? { x: 170, y: LANE.btn - 65, w: 380, h: 130, hand: 'tap' } : null;
  return [
    { x: 120, y: 440, w: 480, h: 462, hand: 'hold' }, { x: slotX(0) - 70, y: LANE.row - 70, w: 140, h: 140, hand: 'tap' },
    { x: 110, y: 640, w: 500, h: 270, hand: 'stir' }, { x: 200, y: 440, w: 320, h: 420, hand: 'tap' },
    { x: 150, y: 462, w: 420, h: 424, hand: 'tap' }, S.ball.wet ? { x: 60, y: 640, w: 600, h: 270, hand: 'tap' } : { x: 60, y: 432, w: 600, h: 478, hand: 'drag' },
  ][S.step];
}
function endIntro(tapped) {
  const t = helpTarget(), what = S.intro;
  save.seen = { ...(save.seen || {}), [what]: true }; S.intro = null; S.idle = 0; persist();
  if (tapped) { burst(t.x + t.w / 2, t.y + t.h / 2, 30, null, 420); fanfare(3); lib.haptics.play('success'); if (what === 'shop') openBook('shop'); }
}
function locked(kind, i) { toast('🔒 ' + bombsUntil(kind, i), '#7a3cff'); beep(200, 0.1, 'square', 0.06); }

/* ---------- input ---------- */
function onDown(p) {
  if (ac && ac.state === 'suspended') ac.resume();
  if (!touched) { touched = true; if (S.step === 0) S.prog = 0; hum('music', true, 0.3); }
  S.ptr = { ...p, down: true }; S.idle = 0;
  if (S.book) return bookTap(p);
  if (p.y < 125) {
    if (Math.abs(p.x - mx(478)) < 50) { setMuted(!save.muted); persist(); beep(700, 0.06); return; }
    if (!S.intro && save.made >= 1 && Math.abs(p.x - mx(621)) < 90) { openBook('toys'); return; }
  }
  // While a feature is being introduced only that feature (and the mute button above) answers.
  if (S.intro) { const t = helpTarget(); if (p.x > t.x - 24 && p.x < t.x + t.w + 24 && p.y > t.y - 24 && p.y < t.y + t.h + 24) endIntro(true); return; }
  if (S.prizes) {
    if (S.gift) { if (S.reveal > 0.8 && Math.abs(p.y - 1010) < 70 && Math.abs(p.x - 360) < 180) { S.gift = false; burst(360, 1010, 50, null, 520); fanfare(4); lib.haptics.play('success'); } return; }
    if (S.reveal > cfg.revealButtonDelay && inBtn(p)) { newBomb(); beep(660, 0.12, 'triangle', 0.12, 400); }
    else if (S.reveal > 0.3) { S.poke = 1; burst(360, 470, 12, 'rgba(120,210,255,0.9)', 300, 500, 10); sfx('sfx_squeak', () => beep(900, 0.12, 'square', 0.08, 500)); lib.haptics.play('tap'); }
    return;
  }
  if (S.ok && (S.step === 1 || S.step === 4) && inBtn(p)) { advance(); return; }
  S.acted = true;
  const slot = slotAt(p);
  if (S.step === 0 && !S.ok) S.pourT = cfg.tapPourSeconds; // a quick tap pours too: small kids tap, they do not hold
  else if (S.step === 1 && slot >= 0 && slot < COLORS.length) {
    if (!isOpen('color', slot)) return locked('color', slot);
    if (S.drops + S.falling.length >= cfg.maxDrops) return toast(T('bowlFull'), '#7a3cff');
    S.falling.push({ x: 360, y: 445, vy: 0, i: slot }); beep(500 + slot * 60, 0.07);
  } else if (S.step === 3 && !S.ok) {
    if (slot >= 0 && slot < MOLDS) { if (!isOpen('mold', slot)) return locked('mold', slot); S.mold = slot; beep(600 + slot * 70, 0.06); return; }
    S.prog += 1 / need('pressTaps'); S.squash = 1; S.shake = 8;
    burst(360, PRESS_Y - 40, 10, rgb(paint()), 260, 500, 7);
    sfx('sfx_press', () => beep(180 + S.prog * 200, 0.1, 'square', 0.1)); lib.haptics.play('tap');
    if (S.prog > 0.999) { S.prog = 1; complete(); } // six taps of 1/6 sum to just under 1
  } else if (S.step === 4) {
    if (slot >= 0 && slot < TOPS.length) { if (!isOpen('top', slot)) return locked('top', slot); S.top = slot; beep(600 + slot * 70, 0.06); }
    else stamp(p);
  } else if (S.step === 5) {
    if (S.pop) popAt(p);
    else if (S.ball.wet) { S.fizz += cfg.tapFizzBoost; burst(S.ball.x, S.ball.y, 14, 'rgba(255,255,255,0.9)', 300, -500, 10); beep(rnd(900, 1500), 0.05, 'sine', 0.08); }
    else S.ball.held = true;
  }
}
function onMove(p) {
  if (!S.ptr.down) return;
  const dist = Math.hypot(p.x - S.ptr.x, p.y - S.ptr.y);
  S.ptr.x = p.x; S.ptr.y = p.y; S.idle = 0;
  if (S.book || S.prizes || S.intro) return;
  if (S.step === 2 && !S.ok && Math.hypot(p.x - BOWL.x, p.y - BOWL.y) < 420) {
    // Any movement near the bowl stirs: circles and back-and-forth scrubbing both count.
    S.swirl += dist / 120; S.prog = Math.min(1, S.prog + dist / (TAU * 120 * need('mixTurns') * pace()));
    if (!hum('sfx_stir', true) && (S.tick += dist) > 90) { S.tick = 0; beep(300 + S.prog * 300, 0.05, 'sine', 0.06); }
    if (S.prog >= 1) complete();
  } else if (S.step === 4) stamp(p);
}
function onUp() {
  if (!S.ptr.down) return;
  S.ptr.down = false; S.lastStamp = null; hum('sfx_stir', false);
  if (S.book || S.prizes || S.intro) return;
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
  S.pulse = 1;
  S.tops.push({ i: S.top, dx: (p.x - BALL.x) / BALL.r, dy: (p.y - BALL.y) / BALL.r, rot: rnd(-0.5, 0.5), pop: 1 });
  if (S.tops.length > cfg.maxToppings) S.tops.shift();
  burst(p.x, p.y, 5, '#fff', 160, 300, 5); sfx('sfx_drop', () => beep(rnd(700, 1100), 0.05, 'triangle', 0.08), 0.5); lib.haptics.play('tick');
  if (!S.ok && S.tops.length >= need('toppingsNeeded')) complete();
  else if (before < 1 && luck() >= 1) { toast(T('maxLuck'), '#22b455'); burst(360, 660, 40, '#35d07f', 420); fanfare(4); }
}
function openBook(tab) {
  S.book = tab; beep(700, 0.06);
  lib.getTopNEntriesFromLeaderboard(3).then(r => { if (r && Array.isArray(r.entries)) board = r.entries.slice(0, 3); }).catch(() => {});
}
/** Taps inside the book: the tabs on top, the language and close buttons at the bottom. */
function bookTap(p) {
  if (p.y < 150) { const i = Math.round((mx(p.x) - 130) / 230); if (i >= 0 && i < 3) { S.book = ['toys', 'recipes', 'shop'][i]; beep(600 + i * 80, 0.06); } }
  else if (S.book === 'shop' && p.y > 290 && p.y < 1070) shopTap((p.y - 290) / 260 | 0, mx(p.x) < 360 ? 0 : 1);
  else if (p.y > 1125) {
    if (Math.abs(p.x - mx(625)) < 70) { S.book = null; beep(500, 0.06); }
    else if (Math.abs(p.x - mx(250)) < 230) { const all = Object.keys(cfg.strings); lang = save.lang = all[(all.indexOf(lang) + 1) % all.length]; persist(); beep(700, 0.06); }
  }
}
/** Tap a bathtub in the shop: use it if owned, buy it if the coins are there, otherwise nothing is lost. */
function shopTap(row, col) {
  const i = row * 2 + col;
  if (i < 0 || i >= SKINS.length) return;
  if (!save.skins.includes(i)) {
    if (save.coins < cfg.skinPrices[i]) { beep(200, 0.1, 'square', 0.06); S.shake = 6; return; }
    save.coins -= cfg.skinPrices[i]; save.skins.push(i); fanfare(4); lib.haptics.play('success');
  } else beep(700, 0.06);
  save.skin = i; persist();
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
  S.t += dt; S.idle += dt; S.pulse *= Math.pow(0.0005, dt); S.enter = Math.min(1, S.enter + dt / 0.4); S.shake *= Math.pow(0.001, dt);
  if (S.intro && (S.introT += dt) > cfg.introSeconds) endIntro(false); // never leave a child stuck on an introduction
  S.squash *= Math.pow(0.0005, dt); S.poke *= Math.pow(0.002, dt);
  if (S.ok) { S.okT += dt; if (S.okT > 0.9 && [0, 2, 3].includes(S.step)) advance(); }
  if (S.step === 0) {
    // Before the first touch the jar pours by itself in a loop, so the game looks alive behind the Play card.
    const cycle = (S.t % 3) / 3, demo = !touched && cycle < 0.6;
    if (!touched) S.prog = Math.min(cycle, 0.6);
    S.pourT = Math.max(0, S.pourT - dt);
    const pouring = (S.ptr.down || S.pourT > 0 || demo) && !S.ok && !S.book && !S.intro;
    S.jar += ((pouring ? 2.2 : 0) - S.jar) * Math.min(1, dt * 14);
    const flowing = pouring && S.jar > 1.2;
    if (flowing) {
      if (touched) S.prog = Math.min(1, S.prog + dt / (need('pourSeconds') * pace()));
      for (let i = 0; i < 4 * quality; i++) S.P.push({ x: 367 + rnd(-10, 10), y: 622, vx: rnd(-40, 40), vy: rnd(250, 380), g: 900, r: rnd(4, 9), c: '#ffffff', life: 0.3, max: 0.3 });
      if (S.prog >= 1) complete();
    }
    if (!hum('sfx_pour', flowing && touched) && flowing && touched && (S.tick += dt) > 0.07) { S.tick = 0; beep(rnd(500, 900), 0.04, 'sine', 0.05); }
  }
  for (const d of S.falling) { d.vy += 2400 * dt; d.y += d.vy * dt; }
  S.falling = S.falling.filter(d => {
    if (d.y < BOWL.y - 10) return true;
    // Averaging three paints gives mud, so the bomb keeps its last three colors as bright stripes instead.
    S.col = d.i; S.cols = [...S.cols.filter(c => c !== d.i), d.i].slice(-3); S.drops++;
    S.spots.push({ x: rnd(-150, 150), y: rnd(-18, 18), c: COLORS[d.i] });
    burst(360, BOWL.y, 16, rgb(COLORS[d.i]), 300, 800, 10); sfx('sfx_drop', () => beep(400, 0.12, 'sine', 0.12, -200)); lib.haptics.play('tap');
    if (S.drops <= need('dropsNeeded')) toast(`${S.drops}/${need('dropsNeeded')}`, rgb(COLORS[d.i]));
    if (!S.ok && S.step === 1 && S.drops >= need('dropsNeeded')) complete();
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
  if (S.pop) return updatePop(dt);
  if (b.wet) {
    b.y += (800 + Math.sin(S.t * 5) * 8 - b.y) * Math.min(1, dt * 6);
    S.fizz = Math.min(1, S.fizz + dt / need('fizzSeconds'));
    b.r = 78 * (1 - S.fizz * 0.8); S.shake = Math.max(S.shake, 3);
    for (let i = 0; i < 3 * quality; i++) S.P.push({ x: b.x + rnd(-b.r, b.r), y: b.y, vx: rnd(-60, 60), vy: rnd(-240, -110), g: -200, r: rnd(5, 15), c: Math.random() < 0.5 ? 'rgba(255,255,255,0.85)' : rgb(S.golden ? [255, 208, 0] : paint(), 0.8), life: rnd(0.3, 0.7), max: 0.7 });
    if (!hum('sfx_fizz', true) && (S.tick += dt) > 0.06) { S.tick = 0; beep(rnd(1200, 2600), 0.03, 'sine', 0.04); }
    // Every cfg.bubbleEvery-th bomb ends with a bubble-popping bonus round before the prize.
    if (S.fizz >= 1) { if (!S.popDone && (save.made + 1) % cfg.bubbleEvery === 0) S.pop = { t: cfg.bubbleSeconds, next: 0, list: [] }; else reveal(); }
    return;
  }
  if (b.held) { b.x += (S.ptr.x - b.x) * Math.min(1, dt * 18); b.y += (S.ptr.y - b.y) * Math.min(1, dt * 18); b.vy = 0; }
  else if (b.loose) { b.vy += 2600 * dt; b.y += b.vy * dt; }
  else b.y = 520 + Math.sin(S.t * 3) * 10;
  b.x = Math.max(170, Math.min(550, b.x)); b.y = Math.max(480, b.y);
  if (b.y > WATER_Y) {
    b.wet = true; b.held = false; S.shake = 22;
    burst(b.x, WATER_Y, 40, 'rgba(255,255,255,0.95)', 560, 1100, 12);
    sfx('sfx_splash', () => beep(220, 0.3, 'sine', 0.2, -150)); lib.haptics.play('thud'); lib.haptics.start({ intensity: 0.3, sharpness: 0.8 });
  }
}
function updatePop(dt) {
  const q = S.pop;
  q.t -= dt; q.next -= dt;
  if (q.next <= 0 && q.t > 1) { q.next = cfg.bubbleGap; q.list.push({ x: rnd(100, 620), y: 860, vy: -rnd(110, 170), w: rnd(0, 6) }); }
  for (const u of q.list) { u.y += u.vy * dt; u.x += Math.sin(S.t * 3 + u.w) * 30 * dt; }
  q.list = q.list.filter(u => u.y > 492);
  if (q.t <= 0) { S.pop = null; S.popDone = true; reveal(); }
}
/** Pop the bubble under the finger: each one pays cfg.bubbleCoins. */
function popAt(p) {
  const i = S.pop.list.findIndex(u => Math.hypot(u.x - p.x, u.y - p.y) < 62);
  if (i < 0) return;
  const u = S.pop.list.splice(i, 1)[0];
  S.popCoins += cfg.bubbleCoins;
  burst(u.x, u.y, 14, 'rgba(255,255,255,0.95)', 300, 300, 9); beep(rnd(900, 1500), 0.07, 'sine', 0.1, 400); lib.haptics.play('tick');
  toast('+' + S.popCoins, '#c97a00');
}
/** The bomb has fizzed away: hand out the prize(s), pay coins, update album, recipes, stars and unlocks, and save. */
function reveal() {
  const wasDone = albumDone();
  S.prizes = [drawPrize()];
  if (save.made >= 2 && Math.random() < cfg.twinChance * perk(0)) {
    let second = drawPrize();
    for (let i = 0; i < 8 && second.toy === S.prizes[0].toy; i++) second = drawPrize(); // a double is two different toys
    if (second.toy !== S.prizes[0].toy) S.prizes.push(second);
  }
  for (const p of S.prizes) {
    const have = p.gold ? save.gold : save.owned;
    if (have.includes(p.toy.e)) { p.isNew = false; save.stars++; save.dupes++; } else { p.isNew = true; have.push(p.toy.e); save.dupes = 0; }
  }
  const key = recipeKey(S.mold, Math.max(0, S.col)), newRecipe = !save.recipes.includes(key), met = orderMet();
  if (newRecipe) save.recipes.push(key);
  save.made++;
  S.unlock = rewardAt(save.made);
  const coins = cfg.coinsPerBomb + (met ? cfg.orderCoins : 0) + (newRecipe ? cfg.recipeCoins : 0) + (S.unlock && S.unlock.kind === 'coins' ? cfg.giftCoins : 0) + S.popCoins;
  save.coins += coins;
  S.earned = { coins, met, newRecipe };
  S.gift = !!S.unlock; // an unlock arrives as a gift box the player taps open
  S.note = !wasDone && albumDone() ? T('albumDone') + ' 👑' : S.unlock ? '🔓' : save.stars >= cfg.starsForGolden ? T('nextGolden') : '';
  S.reveal = 0; S.shake = 18;
  stopLoops(); lib.haptics.play('success');
  burst(360, 470, S.note ? 140 : 90, null, 760, 800, 12);
  sfx('sfx_win', () => fanfare(3 + Math.max(...S.prizes.map(p => p.toy.r))));
  persist();
  lib.addPlayerScoreToLeaderboard(save.owned.length + save.gold.length).catch(() => {}); // guests cannot post a score
}

/* ---------- drawing helpers ---------- */
/** Record the box of a top-level UI element (debug only); the playtest fails when two boxes overlap. */
function box(n, x, y, w, h) { if (DEBUG && !grouped) BOXES.push({ n, x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(h) }); }
/** One UI element made of several drawn parts: record its outer box once, not each part. */
function group(n, x, y, w, h, drawParts) { box(n, x, y, w, h); grouped++; drawParts(); grouped--; }
function rr(x, y, w, h, r) { g.beginPath(); g.roundRect(x, y, w, h, r); }
/** Centred text. A string wider than maxW is drawn smaller, so a long translation never runs off its space. */
function txt(s, x, y, size, fill = '#5a1e86', stroke = '#fff', sw = 12, maxW = 660) {
  const font = px => `900 ${px}px "Trebuchet MS", "Arial Rounded MT Bold", Arial, sans-serif`;
  g.font = font(size);
  let wide = g.measureText(s).width;
  if (wide > maxW) { size *= maxW / wide; g.font = font(size); wide = maxW; }
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
  if (stroke) { g.lineWidth = sw; g.strokeStyle = stroke; g.strokeText(s, x, y); }
  g.fillStyle = fill; g.fillText(s, x, y);
  box('text ' + s, x - wide / 2, y - size * 0.55, wide, size * 1.1);
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
/** Particles: plain dots for powder and bubbles, stars and hearts mixed in for celebrations. */
function drawParticles() {
  for (const p of S.P) {
    g.globalAlpha = Math.max(0, Math.min(1, p.life / p.max * 2)); g.fillStyle = p.c;
    if (p.s) { g.save(); g.translate(p.x, p.y); g.rotate(p.a + p.life * 4); shapePath(p.s, 0, 0, p.r * 1.5); g.fill(); g.restore(); }
    else { g.beginPath(); g.arc(p.x, p.y, p.r, 0, TAU); g.fill(); }
  }
  g.globalAlpha = 1;
}
/** A soft shadow on the table under an object, so it sits in the scene instead of floating. */
function shadow(x, y, rx, ry = rx * 0.16) { g.fillStyle = 'rgba(90,30,134,0.18)'; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, TAU); g.fill(); }
/** A drawn coin, so the currency looks the same on every device (the coin emoji is missing on older phones). */
function coin(x, y, r) {
  g.fillStyle = '#e09a00'; g.beginPath(); g.arc(x, y + r * 0.08, r, 0, TAU); g.fill();
  g.fillStyle = '#ffd23c'; g.beginPath(); g.arc(x, y - r * 0.06, r * 0.94, 0, TAU); g.fill();
  g.fillStyle = '#fff3b0'; g.beginPath(); g.arc(x - r * 0.25, y - r * 0.3, r * 0.3, 0, TAU); g.fill();
  g.lineWidth = r * 0.14; g.strokeStyle = '#e09a00'; g.beginPath(); g.arc(x, y - r * 0.06, r * 0.6, 0, TAU); g.stroke();
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
/** A small mold shape filled with one color: the picture of a recipe or an order. */
function recipeIcon(mold, color, x, y, r) {
  shapePath(mold, x, y + (mold === 1 ? r * 0.12 : 0), r); g.lineJoin = 'round';
  g.lineWidth = r * 0.22; g.strokeStyle = rgb(mix(COLORS[color], [90, 30, 134], 0.35)); g.stroke();
  g.fillStyle = rgb(COLORS[color]); g.fill(fillRule(mold));
}
function button(label, col) {
  group('button', 170, LANE.btn - 65, 380, 130, () => {
    const s = 1 + Math.sin(S.t * 6) * 0.03;
    g.save(); g.translate(360, LANE.btn); g.scale(s, s);
    g.fillStyle = 'rgba(90,30,134,0.35)'; rr(-180, -50, 360, 120, 58); g.fill();
    g.fillStyle = col; rr(-180, -60, 360, 120, 58); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.3)'; rr(-160, -50, 320, 42, 28); g.fill();
    txt(label, 0, 2, 56, '#fff', '#5a1e86', 10, 310); g.restore();
  });
}
/** A white pill with a dark outline: the base of every HUD chip. */
function pill(x, y, w, h, line = '#5a1e86', fill = '#fff') {
  g.fillStyle = 'rgba(90,30,134,0.2)'; rr(x, y + 6, w, h, h / 2); g.fill();
  g.fillStyle = fill; rr(x, y, w, h, h / 2); g.fill(); g.lineWidth = 6; g.strokeStyle = line; g.stroke();
  g.fillStyle = 'rgba(255,255,255,0.55)'; rr(x + h * 0.3, y + 7, w - h * 0.6, h * 0.22, h * 0.11); g.fill();
}
function bombBall(x, y, r) {
  const cols = S.cols.length ? S.cols.map(i => COLORS[i]) : [paint()], gr = g.createLinearGradient(x - r, y - r, x + r, y + r);
  cols.forEach((c, i) => { gr.addColorStop(i / cols.length, rgb(c)); gr.addColorStop((i + 0.999) / cols.length, rgb(mix(c, [255, 255, 255], 0.25))); });
  shapePath(S.mold, x, y, r); g.lineJoin = 'round';
  g.lineWidth = S.golden ? 22 : 12; g.strokeStyle = S.golden ? '#ffc400' : rgb(mix(paint(), [90, 30, 134], 0.35)); g.stroke();
  g.fillStyle = gr; g.fill(fillRule(S.mold)); // fill after stroke so the flower's inner petal lines stay hidden
  const shine = g.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.05, x - r * 0.35, y - r * 0.4, r * 0.9);
  shine.addColorStop(0, 'rgba(255,255,255,0.55)'); shine.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = shine; g.fill(fillRule(S.mold));
  // Volume and powder: a darker far side and a scatter of fixed specks, both clipped to the shape.
  const shade = g.createRadialGradient(x - r * 0.3, y - r * 0.35, r * 0.4, x, y, r * 1.25);
  shade.addColorStop(0, 'rgba(90,30,134,0)'); shade.addColorStop(1, 'rgba(90,30,134,0.32)'); g.fillStyle = shade; g.fill(fillRule(S.mold));
  g.save(); g.clip(fillRule(S.mold));
  for (let i = 0; i < 34; i++) { const a = i * 2.399, d = Math.sqrt((i + 0.5) / 34) * r; g.fillStyle = i % 2 ? 'rgba(255,255,255,0.3)' : 'rgba(90,30,134,0.12)'; g.beginPath(); g.arc(x + Math.cos(a) * d, y + Math.sin(a) * d, r * (0.018 + (i % 3) * 0.008), 0, TAU); g.fill(); }
  g.restore();
  for (const t of S.tops) pic(TOPS[t.i].id, TOPS[t.i].e, x + t.dx * r, y + t.dy * r, r * 0.3 * (1 + t.pop * 0.8), { rot: t.rot });
  if (S.golden) for (let i = 0; i < 4; i++) emo('✨', x + Math.cos(S.t * 2 + i * 1.57) * r * 0.95, y + Math.sin(S.t * 2 + i * 1.57) * r * 0.95, r * 0.28);
}
/** Top or bottom half of the press mold, in the shape of the chosen mold. */
function moldHalf(top, y) {
  g.save(); g.beginPath(); g.rect(0, top ? y - 400 : y, W, 400); g.clip();
  shapePath(S.mold, 360, y, 138); g.lineJoin = 'round';
  g.lineWidth = 12; g.strokeStyle = '#5c74e6'; g.stroke();
  const mg = g.createLinearGradient(220, y - 140, 500, y + 140); mg.addColorStop(0, '#c4d2ff'); mg.addColorStop(1, '#7f97f5');
  g.fillStyle = mg; g.fill('nonzero');
  g.fillStyle = 'rgba(255,255,255,0.45)'; g.beginPath(); g.ellipse(300, top ? y - 70 : y + 40, 22, 46, 0.5, 0, TAU); g.fill(); g.restore();
  g.lineWidth = 10; g.strokeStyle = '#5c74e6'; g.beginPath(); g.moveTo(200, y); g.lineTo(520, y); g.stroke();
}
/** The choice row lane: five round buttons. `face(i, x)` draws what is inside button i; a locked one shows how many bombs to go. */
function choiceRow(n, selected, kind, face) {
  group('choice row', 40, LANE.row - 64, 640, 128, () => {
    for (let i = 0; i < n; i++) {
      const x = slotX(i), left = bombsUntil(kind, i);
      g.fillStyle = left ? '#e6dcef' : i === selected ? '#ffd000' : '#fff';
      g.beginPath(); g.arc(x, LANE.row, i === selected ? 62 : 56, 0, TAU); g.fill();
      g.lineWidth = 5; g.strokeStyle = left ? '#cfc4dc' : '#5a1e86'; g.stroke();
      if (!left) face(i, x); else { emo('🔒', x, LANE.row - 12, 42); txt(String(left), x, LANE.row + 30, 34, '#7a3cff', null); }
    }
  });
}
/** An animated finger showing one gesture (hold, tap, stir, drag) centred at cx, cy. */
function ghostHand(kind, cx, cy, size) {
  const t = S.t; let fx = cx, fy = cy + 8;
  g.strokeStyle = '#ff2d8a'; g.lineWidth = 8; g.lineCap = 'round';
  if (kind === 'hold') { const k = (t % 1.4) / 1.4; g.globalAlpha = 1 - k; g.beginPath(); g.arc(cx, cy - 26, 20 + k * 46, 0, TAU); g.stroke(); g.globalAlpha = 1; fy += Math.min(1, k * 4) * 6; }
  else if (kind === 'stir') { g.globalAlpha = 0.5; g.beginPath(); g.ellipse(cx, cy - 20, 70, 34, 0, 0, TAU); g.stroke(); g.globalAlpha = 1; fx = cx + Math.cos(t * 4) * 70; fy = cy + 18 + Math.sin(t * 4) * 34; }
  else if (kind === 'drag') { const k = (t % 1.2) / 1.2; fy = cy - 50 + k * 100; g.globalAlpha = 0.5; g.beginPath(); g.moveTo(cx - 70, cy - 40); g.lineTo(cx - 70, cy + 40); g.lineTo(cx - 88, cy + 20); g.moveTo(cx - 70, cy + 40); g.lineTo(cx - 52, cy + 20); g.stroke(); g.globalAlpha = 1; }
  else { const k = (t % 0.7) / 0.7; g.globalAlpha = 1 - k; g.beginPath(); g.arc(cx, cy - 26, 14 + k * 34, 0, TAU); g.stroke(); g.globalAlpha = 1; fy += Math.sin(k * Math.PI) * -14; }
  emo('👆', fx, fy, size);
}
/** The gesture coach in its own lane, so on later bombs the hint never covers the thing to touch. */
function coach(kind, x, y, w, h) {
  group('coach', x, y, w, h, () => { g.fillStyle = 'rgba(255,255,255,0.7)'; rr(x, y, w, h, 40); g.fill(); ghostHand(kind, x + w / 2, y + h / 2, Math.min(96, h * 0.72)); });
}
/** Spotlight: dim the screen except the thing to touch, and show the gesture right on it. An overlay by design, so it records no box. */
function drawHelp() {
  const t = helpTarget();
  if (!t) return;
  g.fillStyle = 'rgba(60,20,90,0.5)'; g.beginPath(); g.rect(0, 0, W, H); g.roundRect(t.x - 12, t.y - 12, t.w + 24, t.h + 24, 44); g.fill('evenodd');
  g.lineWidth = 8; g.strokeStyle = `rgba(255,255,255,${0.6 + Math.sin(S.t * 6) * 0.35})`; rr(t.x - 12, t.y - 12, t.w + 24, t.h + 24, 44); g.stroke();
  let cx = t.x + t.w / 2, cy = t.y + t.h / 2;
  if (t.hand === 'hold') { cx = 270; cy = 590; } else if (t.hand === 'drag') { cx = S.ball.x + 90; cy = 600; } else if (t.w < 120) cy = t.y + t.h * 0.6;
  ghostHand(t.hand, cx, cy + 30, 104);
  grouped++; txt(T(S.pop ? 'pop' : 's' + S.step), 360, LANE.say, 54); grouped--; // the instruction stays bright above the dimming
}
/** What a bomb unlocked or the HUD bar is filling toward, as a picture instead of words. */
function rewardIcon(u, x, y, r) {
  if (u.kind === 'mold') { shapePath(u.i, x, y + (u.i === 1 ? r * 0.12 : 0), r * 0.8); g.fillStyle = '#ff2d8a'; g.fill(fillRule(u.i)); }
  else if (u.kind === 'color') { g.fillStyle = rgb(COLORS[u.i]); g.beginPath(); g.arc(x, y, r * 0.85, 0, TAU); g.fill(); }
  else if (u.kind === 'top') pic(TOPS[u.i].id, TOPS[u.i].e, x, y, r * 1.6);
  else if (u.kind === 'coins') coin(x, y, r * 0.85);
  else emo(u.i ? '✨' : '🍀', x, y + 2, r * 1.5);
}

/* ---------- lanes ---------- */
function drawHud() {
  if (save.coins > 0 || save.made > 0) group('coins', hx(16, 160), 28, 160, 84, () => {
    const x = hx(16, 160); pill(x, 28, 160, 84, '#e09a00', '#fff3c4'); coin(x + 44, 70, 26); txt(String(save.coins), x + 108, 72, 36, '#5a1e86', null, 12, 84);
  });
  if (save.made >= 1) group('reward bar', hx(190, 230), 28, 230, 84, () => {
    const x = hx(190, 230), nx = nextReward(), p = (save.made - nx.from) / (nx.at - nx.from), bw = 124 * Math.max(0.04, Math.min(1, p));
    pill(x, 28, 230, 84, '#22b455', '#effff4');
    g.fillStyle = '#ece6f2'; rr(x + 18, 58, 124, 24, 12); g.fill();
    g.fillStyle = '#35d07f'; rr(rtl() ? x + 18 + 124 - bw : x + 18, 58, bw, 24, 12); g.fill();
    g.fillStyle = '#fff7d6'; g.beginPath(); g.arc(x + 186, 70, 32, 0, TAU); g.fill(); g.lineWidth = 5; g.strokeStyle = '#ffb800'; g.stroke();
    rewardIcon(nx, x + 186, 70, 24);
  });
  group('mute', mx(478) - 42, 28, 84, 84, () => { g.fillStyle = '#fff'; g.beginPath(); g.arc(mx(478), 70, 42, 0, TAU); g.fill(); g.lineWidth = 6; g.strokeStyle = '#5a1e86'; g.stroke(); emo(save.muted ? '🔇' : '🔊', mx(478), 73, 44); });
  if (save.made >= 1) group('book chip', hx(536, 170), 28, 170, 84, () => {
    const x = hx(536, 170); pill(x, 28, 170, 84, '#7a3cff', '#f3ecff'); emo(albumDone() ? '👑' : '🎁', x + 44, 72, 42);
    txt(`${albumDone() ? save.gold.length : save.owned.length}/${TOYS.length}`, x + 114, 72, 34, '#5a1e86', null, 12, 96);
  });
  // Step bar: six segments; the current one fills with the progress of the step.
  group('step bar', 40, LANE.steps - 14, 640, 28, () => {
    const p = S.step === 1 ? S.drops / need('dropsNeeded') : S.step === 4 ? S.tops.length / need('toppingsNeeded') : S.pop ? S.pop.t / cfg.bubbleSeconds : S.step === 5 ? S.fizz : S.prog;
    for (let i = 0; i < 6; i++) {
      const x = hx(40 + i * 108, 100), f = i < S.step || S.prizes ? 1 : i === S.step ? Math.min(1, p) : 0;
      g.fillStyle = '#fff'; rr(x, LANE.steps - 14, 100, 28, 14); g.fill();
      if (f > 0) { g.fillStyle = i === S.step && !S.prizes ? '#ff2d8a' : '#35d07f'; rr(rtl() ? x + 100 - 100 * f : x, LANE.steps - 14, Math.max(28, 100 * f), 28, 14); g.fill(); }
      g.lineWidth = 5; g.strokeStyle = '#5a1e86'; rr(x, LANE.steps - 14, 100, 28, 14); g.stroke();
    }
  });
}
/** The customer lane: who is asking, the bomb they want (shape in color), and the coins it pays. A tick shows when the bomb matches. */
function drawOrder(y) {
  if (S.order) group('order', 130, y - 46, 460, 92, () => {
    pill(130, y - 46, 460, 92, '#ff8fc4', '#fff6fb');
    // The customer bobs while waiting and bounces with hearts once the bomb matches the order.
    const who = CUSTOMERS[S.order.who], glad = S.cols.length > 0 && orderMet() && S.step >= 3;
    pic(who.id, who.e, mx(196), y - 2 - Math.abs(Math.sin(S.t * (glad ? 7 : 2.5))) * (glad ? 10 : 4), 76);
    if (glad) emo('💗', mx(160), y - 30 - (S.t * 30) % 14, 26);
    g.fillStyle = '#ff8fc4'; g.beginPath(); g.moveTo(mx(246), y); g.lineTo(mx(270), y - 12); g.lineTo(mx(270), y + 12); g.fill();
    recipeIcon(S.order.mold, S.order.color, mx(326), y, 28);
    if (S.cols.length && orderMet() && (S.step > 3 || S.prizes || (S.step === 3 && !S.ok))) { g.fillStyle = '#22b455'; g.beginPath(); g.arc(mx(358), y - 24, 18, 0, TAU); g.fill(); txt('✓', mx(358), y - 22, 24, '#fff', null); }
    txt('+' + cfg.orderCoins, mx(450), y + 2, 40, '#c97a00', null, 12, 90); coin(mx(528), y, 24);
  });
}
function drawScene() {
  if (S.step <= 2) {
    box('scene', 110, 432, 500, 470);
    const { x, y } = BOWL;
    shadow(x, y + 172, 210);
    const body = g.createLinearGradient(x - 240, y, x + 240, y + 170); body.addColorStop(0, '#ff8cc6'); body.addColorStop(0.55, '#ff5fa8'); body.addColorStop(1, '#e23f8c');
    g.fillStyle = body; g.beginPath(); g.moveTo(x - 240, y);
    g.bezierCurveTo(x - 230, y + 128, x - 165, y + 170, x - 115, y + 170); g.lineTo(x + 115, y + 170);
    g.bezierCurveTo(x + 165, y + 170, x + 230, y + 128, x + 240, y); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.35)'; g.beginPath(); g.ellipse(x - 145, y + 78, 24, 52, 0.4, 0, TAU); g.fill();
    g.fillStyle = '#ffe3f1'; g.beginPath(); g.ellipse(x, y, 240, 52, 0, 0, TAU); g.fill();
    g.lineWidth = 12; g.strokeStyle = '#ff5fa8'; g.stroke();
    g.lineWidth = 4; g.strokeStyle = 'rgba(255,255,255,0.7)'; g.beginPath(); g.ellipse(x, y - 3, 236, 50, 0, Math.PI * 1.05, Math.PI * 1.6); g.stroke();
    const fill = S.step === 0 ? S.prog : 1;
    if (fill > 0.02) {
      const even = S.step === 2 ? S.prog : 0;
      g.fillStyle = rgb(mix([255, 255, 255], paint(), even)); g.beginPath(); g.ellipse(x, y + 5, 48 + 172 * fill, 9 + 32 * fill, 0, 0, TAU); g.fill();
      for (const s of S.spots) { g.fillStyle = rgb(s.c, 1 - even); g.beginPath(); g.ellipse(x + s.x, y + 5 + s.y, 42, 15, 0, 0, TAU); g.fill(); }
      if (S.step === 2) { g.lineWidth = 8; g.strokeStyle = 'rgba(255,255,255,0.8)'; for (let i = 0; i < 3; i++) { g.beginPath(); g.ellipse(x, y + 5, 66 + i * 52, 11 + i * 9, 0, S.swirl + i * 2, S.swirl + i * 2 + 1.6); g.stroke(); } }
    }
  }
  if (S.step === 0) {
    g.save(); g.translate(270, 545 + Math.sin(S.t * 3) * 5); g.rotate(S.jar);
    if (ready('jar_powder')) { const jh = 150 * IMG.jar_powder.naturalHeight / IMG.jar_powder.naturalWidth; g.drawImage(IMG.jar_powder, -75, -jh / 2, 150, jh); }
    else { g.fillStyle = '#38c6ff'; rr(-70, -95, 140, 190, 28); g.fill(); g.fillStyle = '#fff'; rr(-50, -38, 100, 92, 16); g.fill(); emo('✨', 0, 10, 58); g.fillStyle = '#ffd000'; rr(-56, -120, 112, 32, 12); g.fill(); }
    g.restore();
  } else if (S.step === 1) {
    for (const d of S.falling) { g.fillStyle = rgb(COLORS[d.i]); g.beginPath(); g.arc(d.x, d.y, 22, 0, TAU); g.fill(); }
  } else if (S.step === 2) {
    // The spoon rests in the bowl until it is grabbed, so the tool is visible before the first touch.
    const grab = S.ptr.down && !S.book, sx = grab ? S.ptr.x : BOWL.x + 90, sy = grab ? Math.min(S.ptr.y, 880) : BOWL.y + 10;
    g.lineCap = 'round'; g.lineWidth = 24; g.strokeStyle = '#e8a800';
    g.beginPath(); g.moveTo(sx, sy); g.lineTo(sx + 64, sy - 170); g.stroke();
    g.lineWidth = 16; g.strokeStyle = '#ffd638'; g.beginPath(); g.moveTo(sx, sy); g.lineTo(sx + 64, sy - 170); g.stroke();
    g.lineWidth = 5; g.strokeStyle = 'rgba(255,255,255,0.75)'; g.beginPath(); g.moveTo(sx + 10, sy - 40); g.lineTo(sx + 56, sy - 160); g.stroke();
    g.fillStyle = '#e8a800'; g.beginPath(); g.ellipse(sx, sy + 3, 40, 28, 0.3, 0, TAU); g.fill();
    g.fillStyle = '#ffd638'; g.beginPath(); g.ellipse(sx, sy, 38, 26, 0.3, 0, TAU); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.6)'; g.beginPath(); g.ellipse(sx - 10, sy - 8, 14, 8, 0.3, 0, TAU); g.fill();
  } else if (S.step === 3) {
    box('scene', 200, 440, 320, 420);
    shadow(360, PRESS_Y + 150, 150);
    const open = S.ok ? Math.min(1, S.okT * 2) * 60 : 0, gap = 100 * (1 - S.prog), cy = PRESS_Y + S.squash * 12;
    if (S.ok) bombBall(360, cy - 20, 128 * Math.min(1, backOut(Math.min(1, S.okT * 2))));
    else { g.fillStyle = rgb(paint()); rr(262, cy - gap - 16, 196, gap + 32, 36); g.fill(); moldHalf(false, cy); moldHalf(true, cy - gap - S.squash * 16); }
    if (S.ok && open < 60) { g.globalAlpha = 1 - open / 60; moldHalf(false, cy + open); moldHalf(true, cy - open); g.globalAlpha = 1; }
  } else if (S.step === 4) {
    box('scene', 160, 468, 400, 410);
    shadow(BALL.x, BALL.y + BALL.r * 1.06, BALL.r * 0.8);
    bombBall(BALL.x, BALL.y, BALL.r * (1 + S.pulse * 0.05));
    // Luck meter beside the bomb: a clover at the bottom, the rarest toy on top, filling upward as toppings go on.
    if (save.made >= 1) group('luck', mx(56) - 34, 438, 68, 462, () => {
      const p = luck(), x = mx(56);
      g.fillStyle = '#fff'; rr(x - 17, 500, 34, 340, 17); g.fill();
      g.fillStyle = p >= 1 ? '#ffc400' : '#35d07f'; rr(x - 17, 840 - 340 * p, 34, Math.max(34, 340 * p), 17); g.fill();
      g.lineWidth = 6; g.strokeStyle = '#5a1e86'; rr(x - 17, 500, 34, 340, 17); g.stroke();
      emo('🍀', x, 872, 48); pic('toy_diamond', '💎', x, 468, 46 + p * 10 + (p >= 1 ? Math.sin(S.t * 8) * 4 : 0));
    });
  } else if (S.step === 5) {
    box('scene', 60, 440, 600, 468);
    const water = mix([110, 215, 255], S.golden ? [255, 208, 0] : paint(), S.fizz * 0.75);
    if (!S.ball.wet) bombBall(S.ball.x, S.ball.y, S.ball.r);
    // In the last stretch of the fizz a glow builds under the bomb: the prize is coming.
    tub(60, 650, 600, 255, save.skin, water, S.fizz);
    if (S.fizz > 0.6 && !S.pop) { const q = (S.fizz - 0.6) / 0.4, gl = g.createRadialGradient(S.ball.x, 800, 10, S.ball.x, 800, 60 + q * 220); gl.addColorStop(0, `rgba(255,255,255,${0.9 * q})`); gl.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gl; g.fillRect(60, 560, 600, 360); }
    // The player's newest toys float in their bath, so the collection is part of the scene.
    save.owned.slice(-4).forEach((e, i) => { const t = TOYS.find(o => o.e === e); pic(t.id, t.e, [140, 235, 485, 580][i], WATER_Y + 26 + Math.sin(S.t * 2.5 + i * 2) * 6, 64); });
    if (S.ball.wet && !S.pop) bombBall(S.ball.x, S.ball.y, S.ball.r);
    if (S.pop) for (const u of S.pop.list) {
      g.fillStyle = 'rgba(170,225,255,0.55)'; g.beginPath(); g.arc(u.x, u.y, 48, 0, TAU); g.fill(); g.lineWidth = 5; g.strokeStyle = '#fff'; g.stroke();
      g.fillStyle = 'rgba(255,255,255,0.85)'; g.beginPath(); g.arc(u.x - 16, u.y - 18, 11, 0, TAU); g.fill();
    }
  }
}
/** A bathtub in shop style `skin`, filled with water of color `water`. */
function tub(x, y, w, h, skin, water, foam = 0) {
  const [body, trim] = SKINS[skin], k = w / 600;
  const tg = g.createLinearGradient(x, y, x, y + h); tg.addColorStop(0, body); tg.addColorStop(1, rgb(mix([255, 255, 255], [200, 190, 230], 0.5)));
  g.fillStyle = 'rgba(90,30,134,0.16)'; rr(x + 10 * k, y + 14 * k, w - 20 * k, h, 60 * k); g.fill();
  g.fillStyle = tg; rr(x, y, w, h, 60 * k); g.fill(); g.lineWidth = Math.max(3, 8 * k); g.strokeStyle = trim; g.stroke();
  if (skin === 5) { const gr = g.createLinearGradient(x, y, x + w, y); COLORS.forEach((c, i) => gr.addColorStop(i / 4, rgb(c))); g.strokeStyle = gr; g.stroke(); }
  const wx = x + 22 * k, wy = y + 40 * k, ww = w - 44 * k, wh = h - 62 * k;
  g.save(); rr(wx, wy, ww, wh, 42 * k); g.clip();
  g.fillStyle = rgb(water); g.beginPath(); g.moveTo(wx, wy + wh);
  for (let i = 0; i <= 24; i++) g.lineTo(wx + ww * i / 24, wy + (7 + Math.sin(S.t * 2.4 + i * 0.9) * 5) * k);
  g.lineTo(wx + ww, wy + wh); g.fill();
  g.fillStyle = rgb(mix(water, [255, 255, 255], 0.35)); g.beginPath(); g.moveTo(wx, wy + wh * 0.5);
  for (let i = 0; i <= 24; i++) g.lineTo(wx + ww * i / 24, wy + wh * 0.5 + Math.sin(S.t * 1.7 + i * 0.7) * 6 * k);
  g.lineTo(wx + ww, wy + wh); g.lineTo(wx, wy + wh); g.globalAlpha = 0.35; g.fill(); g.globalAlpha = 1;
  g.fillStyle = 'rgba(255,255,255,0.9)';
  for (let i = 0; i < 6 + foam * 22; i++) { g.beginPath(); g.arc(wx + ((i * 97) % 100) / 100 * ww, wy + (8 + Math.sin(S.t * 2.4 + i) * 4) * k, (8 + (i % 4) * 4 + foam * 6) * k, 0, TAU); g.fill(); }
  g.restore();
}
/** Everything below the play area: the choice row and, under it, either the action button or the gesture coach. */
function drawControls() {
  g.fillStyle = 'rgba(255,255,255,0.78)'; rr(20, 915, 680, 325, 44); g.fill(); // a plain tray, so controls never sit on background clutter
  if (S.step === 1) choiceRow(COLORS.length, -1, 'color', (i, x) => {
    g.fillStyle = rgb(COLORS[i]); g.beginPath(); g.arc(x, LANE.row, 44, 0, TAU); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.5)'; g.beginPath(); g.arc(x - 15, LANE.row - 16, 12, 0, TAU); g.fill();
  });
  if (S.step === 3 && !S.ok) choiceRow(MOLDS, S.mold, 'mold', (i, x) => { shapePath(i, x, LANE.row + (i === 1 ? 4 : 0), 28); g.fillStyle = '#ff2d8a'; g.fill(fillRule(i)); });
  if (S.step === 4) choiceRow(TOPS.length, S.top, 'top', (i, x) => pic(TOPS[i].id, TOPS[i].e, x, LANE.row + 2, 60));
  if (S.ok && S.step === 1) button(T('next'), '#35d07f');
  else if (S.ok && S.step === 4) button(T('dropIt'), '#ff2d8a');
  else if (!S.ok && !helpTarget()) {
    const rowed = S.step === 1 || S.step === 3 || S.step === 4, kind = ['hold', 'tap', 'stir', 'tap', 'tap', S.ball.wet ? 'tap' : 'drag'][S.step];
    if (rowed) coach(kind, 250, LANE.btn - 62, 220, 124); else coach(kind, 210, 948, 300, 258);
  }
}
function drawPrizeScreen() {
  const k = Math.min(1, S.reveal * 1.8), top = Math.max(...S.prizes.map(p => p.toy.r)), two = S.prizes.length > 1;
  const anyNew = S.prizes.some(p => p.isNew), dupes = S.prizes.filter(p => !p.isNew).length, gold = S.prizes[0].gold, tint = gold ? '#f08a00' : RARITY[top];
  // A full panel of its own: nothing from the bath scene shows through.
  const bg = g.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#fff8e0'); bg.addColorStop(1, '#ffe3f3'); g.fillStyle = bg; g.fillRect(0, 0, W, H);
  g.save(); g.translate(360, 470); g.rotate(S.t * 0.6); g.fillStyle = tint; g.globalAlpha = 0.22 * k;
  for (let i = 0; i < 12; i++) { g.rotate(TAU / 12); g.beginPath(); g.moveTo(0, 0); g.lineTo(-40, -300); g.lineTo(40, -300); g.fill(); }
  g.restore();
  txt((gold ? T('gold') + ' · ' : '') + T('r' + top), 360, 215, 58, tint, '#fff', 14);
  box('prize toys', 90, 300, 540, 340);
  const size = (two ? 200 : 280) * Math.max(0.01, backOut(k));
  const leap = (1 - backOut(k)) * 300, halo = g.createRadialGradient(360, 470, 20, 360, 470, 260);
  halo.addColorStop(0, 'rgba(255,255,255,0.95)'); halo.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = halo; g.fillRect(60, 200, 600, 540);
  S.prizes.forEach((p, i) => pic(p.toy.id, p.toy.e, 360 + (two ? (i ? 140 : -140) : 0), 470 + leap + Math.sin(S.t * 4 + i) * 8, size, { sx: 1 + S.poke * 0.25, sy: 1 - S.poke * 0.3, gold: p.gold }));
  drawParticles();
  g.globalAlpha = 1;
  if (S.reveal > 0.5) {
    // A duplicate is never a loss: it pays a star toward a golden bomb.
    txt(two ? T('doubleToy') : anyNew ? T('newToy') : '+1 ⭐', 360, 700, 64, anyNew || two ? '#ff2d8a' : '#ff9d00');
    const chips = [{ t: `${albumDone() ? '👑 ' + save.gold.length : '🎁 ' + save.owned.length}/${TOYS.length}`, hot: anyNew }, { t: `📖 ${save.recipes.length}/${MOLDS * COLORS.length}`, hot: S.earned.newRecipe }, { t: '+' + S.earned.coins, coin: true, hot: true }];
    if (save.stars || dupes) chips.push({ t: `⭐ ${save.stars}/${cfg.starsForGolden}`, hot: dupes > 0 });
    const cw = 152, gap = 12, x0 = 360 - (chips.length * cw + (chips.length - 1) * gap) / 2;
    chips.forEach((c, i) => {
      const x = hx(x0 + i * (cw + gap), cw);
      group('chip ' + c.t, x, 760, cw, 80, () => {
        pill(x, 760, cw, 80, c.hot ? '#ffb800' : '#cfc4dc', c.hot ? '#fff7d6' : '#fff');
        if (c.coin) { coin(x + 40, 800, 22); txt(c.t, x + 98, 802, 34, '#c97a00', null, 12, 80); } else txt(c.t, x + cw / 2, 802, 32, '#5a1e86', null, 12, cw - 24);
      });
    });
    drawOrder(905);
    if (S.note) {
      if (S.gift) group('gift', 250, 962, 220, 96, () => { pill(250, 968, 220, 84, '#ff2d8a', '#fff0f7'); emo('🎁', 330, 1012, 62, Math.sin(S.t * 9) * 0.08); emo('👆', 420, 1024 + Math.sin(S.t * 6) * 6, 50); });
      else if (S.unlock) group('unlock', 250, 968, 220, 84, () => { pill(250, 968, 220, 84, '#22b455', '#effff4'); emo('🔓', mx(310), 1012, 46); rewardIcon(S.unlock, mx(410), 1010, 30); });
      else txt(S.note, 360, 1010, 46, '#22b455', '#fff', 14);
    }
  }
  if (S.reveal > cfg.revealButtonDelay && !S.gift) button(T('again'), '#35d07f');
  if (S.reveal < 0.4) { g.fillStyle = `rgba(255,255,255,${1 - S.reveal / 0.4})`; g.fillRect(0, 0, W, H); } // the flash the toy bursts out of
}
/** The book: a full screen with two tabs (toy album, recipe book), the language button and a close button. */
function drawBook() {
  g.fillStyle = '#efe6ff'; g.fillRect(0, 0, W, H);
  ['🎁', '📖', '🛁'].forEach((e, i) => {
    const on = S.book === ['toys', 'recipes', 'shop'][i], x = mx(130 + i * 230) - 105;
    group('tab ' + i, x, 30, 210, 100, () => { pill(x, 30, 210, 100, on ? '#ff2d8a' : '#cfc4dc', on ? '#fff' : '#f7f2ff'); emo(e, x + 105, 84, 58); });
  });
  if (S.book === 'toys') {
    txt(`${T('myToys')} ${save.owned.length}/${TOYS.length}`, 360, 205, 52, '#5a1e86', null, 12, 600);
    group('toy grid', 60, 262, 600, 586, () => TOYS.forEach((t, i) => {
      const x = mx(135 + (i % 4) * 150), y = 330 + (i / 4 | 0) * 150, has = save.owned.includes(t.e), gold = save.gold.includes(t.e);
      g.fillStyle = gold ? '#ffe680' : has ? '#fff3c4' : '#fff'; rr(x - 64, y - 64, 128, 128, 26); g.fill();
      g.lineWidth = gold ? 10 : 6; g.strokeStyle = gold ? '#ffb800' : has ? RARITY[t.r] : '#cfc4dc'; g.stroke();
      if (has) pic(t.id, t.e, x, y + 4, 90, { gold }); else txt('?', x, y + 4, 64, '#b9aacb', null);
    }));
    txt(albumDone() ? `👑 ${T('gold')} ${save.gold.length}/${TOYS.length}` : `⭐ ${save.stars}/${cfg.starsForGolden} = ${T('goldenBomb')}`, 360, 900, 38, '#ff9d00', null, 12, 600);
    if (board && board.length) {
      txt(T('top'), 360, 958, 32, '#5a1e86', null, 12, 600);
      board.forEach((e, i) => txt(`${i + 1}. ${String(e.username).slice(0, 14)}  ${e.score}`, 360, 1000 + i * 38, 28, '#7a3cff', null, 12, 600));
    }
  } else if (S.book === 'shop') {
    group('shop coins', 240, 164, 240, 84, () => { pill(240, 164, 240, 84); coin(mx(296), 206, 26); txt(String(save.coins), mx(390), 208, 40, '#5a1e86', null, 12, 130); });
    SKINS.forEach((sk, i) => {
      const x = mx(200 + (i % 2) * 320) - 140, y = 290 + (i / 2 | 0) * 260, own = save.skins.includes(i), on = save.skin === i, price = cfg.skinPrices[i];
      group('skin ' + i, x, y, 280, 240, () => {
        g.fillStyle = on ? '#fff7d6' : '#fff'; rr(x, y, 280, 240, 34); g.fill(); g.lineWidth = on ? 9 : 6; g.strokeStyle = on ? '#ffb800' : '#cfc4dc'; g.stroke();
        tub(x + 40, y + 28, 200, 96, i, [110, 215, 255]);
        if (on) { g.fillStyle = '#22b455'; g.beginPath(); g.arc(x + 140, y + 182, 34, 0, TAU); g.fill(); txt('✓', x + 140, y + 184, 44, '#fff', null); }
        else if (own) { g.lineWidth = 7; g.strokeStyle = '#cfc4dc'; g.beginPath(); g.arc(x + 140, y + 182, 30, 0, TAU); g.stroke(); }
        else { pill(x + 50, y + 146, 180, 72, save.coins >= price ? '#ffb800' : '#cfc4dc', save.coins >= price ? '#fff7d6' : '#f3eff7'); coin(x + 92, y + 182, 22); txt(String(price), x + 162, y + 184, 36, save.coins >= price ? '#c97a00' : '#a79bb5', null, 12, 96); }
      });
    });
  } else {
    txt(`${T('recipes')} ${save.recipes.length}/${MOLDS * COLORS.length}`, 360, 205, 52, '#5a1e86', null, 12, 600);
    // Rows are molds, columns are colors; a made recipe shows its bomb, a locked row or column shows a padlock.
    group('recipe grid', 54, 264, 612, 632, () => {
      for (let m = 0; m < MOLDS; m++) for (let c = 0; c < COLORS.length; c++) {
        const x = mx(120 + c * 120), y = 330 + m * 125, made = save.recipes.includes(recipeKey(m, c)), shut = !isOpen('mold', m) || !isOpen('color', c);
        g.fillStyle = made ? '#fff7d6' : '#fff'; rr(x - 52, y - 52, 104, 104, 22); g.fill(); g.lineWidth = 5; g.strokeStyle = made ? '#ffb800' : '#cfc4dc'; g.stroke();
        if (made) recipeIcon(m, c, x, y, 30); else if (shut) emo('🔒', x, y + 2, 40); else txt('?', x, y + 3, 52, '#b9aacb', null);
      }
    });
    group('recipe coins', 250, 930, 220, 76, () => { pill(250, 930, 220, 76, '#ffb800', '#fff7d6'); txt('📖 +' + cfg.recipeCoins, mx(330), 970, 34, '#c97a00', null, 12, 120); coin(mx(430), 968, 22); });
  }
  // Language is detected from the device; this button steps through the others. The round button closes the book.
  group('language', hx(40, 420), 1140, 420, 96, () => { const x = hx(40, 420); pill(x, 1140, 420, 96, '#27a8ff', '#eef7ff'); txt('🌐 ' + T('name'), x + 210, 1190, 42, '#1877c9', null, 12, 360); });
  group('close', mx(625) - 52, 1136, 104, 104, () => { g.fillStyle = '#ff2d8a'; g.beginPath(); g.arc(mx(625), 1188, 52, 0, TAU); g.fill(); txt('✕', mx(625), 1190, 56, '#fff', null); });
}
function draw() {
  BOXES.length = 0;
  g.direction = rtl() ? 'rtl' : 'ltr';
  if (S.book) { drawBook(); return debugOut(); }
  if (S.prizes) { drawPrizeScreen(); return debugOut(); }
  const bg = g.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#ffe36e'); bg.addColorStop(0.55, '#ffb3d9'); bg.addColorStop(1, '#8fe0ff');
  g.fillStyle = bg; g.fillRect(0, 0, W, H);
  if (ready('bg_bathroom')) { const im = IMG.bg_bathroom, k = Math.max(W / im.naturalWidth, H / im.naturalHeight); g.drawImage(im, (W - im.naturalWidth * k) / 2, (H - im.naturalHeight * k) / 2, im.naturalWidth * k, im.naturalHeight * k); g.fillStyle = 'rgba(255,255,255,0.18)'; g.fillRect(0, 0, W, H); } // a light veil so the game reads first
  drawControls();
  g.save(); g.translate(rnd(-1, 1) * S.shake + (1 - backOut(S.enter)) * (rtl() ? -W : W), rnd(-1, 1) * S.shake);
  drawScene();
  drawParticles();
  g.globalAlpha = 1; g.restore();
  drawHud();
  txt(T(S.pop ? 'pop' : 's' + S.step), 360, LANE.say, 54);
  drawOrder(LANE.order);
  for (const f of S.F) {
    const k = Math.min(1, (1.3 - f.life) * 6);
    g.save(); g.globalAlpha = Math.min(1, f.life * 3); g.translate(360, LANE.toast); g.scale(backOut(k), backOut(k));
    grouped++; txt(f.txt, 0, 0, 56, f.c, '#fff', 14, 600); grouped--; g.restore();
    g.font = '900 56px "Trebuchet MS", "Arial Rounded MT Bold", Arial, sans-serif';
    const wide = Math.min(600, g.measureText(f.txt).width); box('toast', 360 - wide / 2, LANE.toast - 32, wide, 64);
  }
  drawHelp();
  debugOut();
}
function debugOut() {
  if (!DEBUG) return;
  window.__boxes = BOXES.slice();
  Object.assign(cv.dataset, { step: S.step, toy: S.prizes ? S.prizes.map(p => p.toy.n).join('+') : '', made: save.made, muted: save.muted ? 1 : 0, prog: S.prog.toFixed(3), lang, rtl: rtl() ? 1 : 0, quality, coins: save.coins });
}
function frame(now) {
  const dt = Math.min((now - last) / 1000, 0.11); last = now;
  // Auto-detect a slow device: under 40 FPS for cfg.lowFpsSeconds halves particles.
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
      'Duplicates before a sure new toy': slider('pityDupes', 1, 10, 1), 'Coins per bomb': slider('coinsPerBomb', 0, 50, 5),
      'Coins for a filled order': slider('orderCoins', 0, 100, 5), 'Coins for a new recipe': slider('recipeCoins', 0, 50, 5),
      'Bubble round every N bombs': slider('bubbleEvery', 1, 10, 1), 'Bubble round length (s)': slider('bubbleSeconds', 3, 20, 1), 'Coins per bubble': slider('bubbleCoins', 1, 10, 1),
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
      if (!touched) newBomb(); // pick up what this player has already unlocked
    }).catch(() => {});
  }
  last = performance.now(); raf = requestAnimationFrame(frame);
}
window.run = run;

// Local preview outside Astrocade: open index.html?local to stub the host.
if (DEBUG) {
  const none = async () => ({});
  window.lib = { showGameParameters() {}, log() {}, getAsset: id => window.__assets[id], getUserGameState: none, saveUserGameState: none, addPlayerScoreToLeaderboard: none, getTopNEntriesFromLeaderboard: none, haptics: { play() {}, start() {}, stop() {} } };
  window.__game = { pickToy, drawPrize, mergeSave, newBomb, newOrder, nextReward, rewardAt, bombsUntil, detectLang, toast, T, openBook, shopTap, helpTarget, setLang(l) { lang = save.lang = l; }, get S() { return S; }, get save() { return save; }, set save(v) { save = v; } };
  const q = new URLSearchParams(location.search);
  Promise.all(['game_config.json', 'asset_map.json'].map(f => fetch(f).then(r => r.json()))).then(([c, assets]) => {
    window.__assets = q.has('noassets') ? {} : assets;
    window.gameConfig = { ...c, ...JSON.parse(q.get('cfg') || '{}') };
    run(q.get('mode') || 'play');
  });
}
