// PROTOTYPE - NOT FOR PRODUCTION
/*
 * Fizzy Bath Bomb Maker
 * Make a bath bomb in six steps: pour powder, add color, stir, press, decorate,
 * then drop it in the bath. It fizzes away and a surprise toy pops out. Toys go
 * into a 16-slot album, which is the reason to make another one.
 * Each finished bomb can unlock a new mold, color or topping, decorating fills a
 * Luck meter that raises the odds of rare toys, and now and then a bomb is golden
 * (rare toy guaranteed) or holds two toys.
 * There is no fail state: a step that is not finished only asks for a bit more.
 * Tunable numbers live in game_config.json. Art and sound come from asset_map.json
 * when an asset exists; otherwise the game draws emoji and synthesizes sound.
 */
const W = 720, H = 1280, TAU = Math.PI * 2;
const BOWL = { x: 360, y: 660 }, ROW_Y = 960, BTN_Y = 1150, BALL = { x: 360, y: 560, r: 180 }, WATER_Y = 800;
const STEPS = [
  { say: 'Hold to pour!', done: 'Nice pour!' },
  { say: 'Tap a color!', done: 'So pretty!' },
  { say: 'Stir in circles!', done: 'All mixed!' },
  { say: 'Tap to press!', done: 'Perfect!' },
  { say: 'Decorate it!', done: 'Gorgeous!' },
  { say: 'Drop it in the bath!', done: '' },
];
const COLORS = [
  { n: 'Pink', c: [255, 92, 168] }, { n: 'Yellow', c: [255, 200, 0] }, { n: 'Blue', c: [64, 190, 255] },
  { n: 'Purple', c: [160, 110, 255] }, { n: 'Green', c: [70, 215, 120] },
];
const TOPS = ['✨', '⭐', '💗', '🌸', '🍬'];
const MOLDS = ['Ball', 'Heart', 'Star', 'Donut'];
const RARITY = [{ n: 'COMMON', c: '#27a8ff' }, { n: 'RARE', c: '#a352ff' }, { n: 'EPIC', c: '#ff7a00' }, { n: 'LEGENDARY', c: '#ffb800' }];
const TOYS = [
  ['🦆', 'Ducky', 0], ['🐸', 'Froggy', 0], ['🐟', 'Fishy', 0], ['🐢', 'Turtle', 0], ['🐙', 'Octo', 0], ['🦀', 'Crabby', 0],
  ['🐳', 'Whale', 0], ['🐥', 'Chick', 0], ['🦄', 'Unicorn', 1], ['🐬', 'Dolphin', 1], ['🦈', 'Sharky', 1], ['🧸', 'Teddy', 1],
  ['🦋', 'Butterfly', 1], ['🐉', 'Dragon', 2], ['👑', 'Crown', 2], ['💎', 'Diamond', 3],
].map(([e, n, r]) => ({ e, n, r, id: 'toy_' + n.toLowerCase() }));
const SOUND_IDS = ['sfx_pour', 'sfx_drop', 'sfx_stir', 'sfx_press', 'sfx_pop', 'sfx_splash', 'sfx_fizz', 'sfx_win', 'sfx_squeak', 'music'];

let cv, g, cfg, mode, S, raf = 0, last = 0, ac = null, bound = false, touched = false;
let save = { owned: [], made: 0 };
const IMG = {}, SND = {};

const rnd = (a, b) => a + Math.random() * (b - a);
const rgb = (c, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
const backOut = t => 1 + 2.7 * Math.pow(t - 1, 3) + 1.7 * Math.pow(t - 1, 2);
const slotX = i => 104 + i * 128;
const slotAt = p => Math.abs(p.y - ROW_Y) < 75 ? Math.round((p.x - 104) / 128) : -1;
const inBtn = p => Math.abs(p.x - 360) < 200 && Math.abs(p.y - BTN_Y) < 75;
/** A mold, color or topping is open unless cfg.unlocks holds it back until more bombs are made. */
const isOpen = (kind, i) => !cfg.unlocks.some(u => u.kind === kind && u.i === i && save.made < u.at);
const unlockName = u => u.kind === 'mold' ? MOLDS[u.i] + ' mold' : u.kind === 'color' ? COLORS[u.i].n + ' color' : TOPS[u.i] + ' topping';

/** Start a fresh bath bomb. The album in `save` is kept. */
function newBomb() {
  let mold = 0;
  for (let i = 0; i < MOLDS.length; i++) if (isOpen('mold', i)) mold = i; // newest mold first, so the next bomb looks new
  S = {
    step: 0, prog: 0, ok: false, okT: 0, t: 0, idle: 99, shake: 0,
    col: [255, 255, 255], drops: 0, spots: [], falling: [], tops: [], top: 0, mold,
    golden: save.made >= 1 && Math.random() < cfg.goldenChance,
    jar: 0, tick: 0, ang: null, swirl: 0, squash: 0, lastStamp: null, poke: 0,
    ball: { x: 360, y: 400, vy: 0, r: 110, held: false, loose: false, wet: false },
    fizz: 0, toys: null, isNew: false, unlock: null, reveal: 0, album: false,
    ptr: { x: 0, y: 0, down: false }, P: [], F: [],
  };
}
const luck = () => Math.min(1, S.tops.length / cfg.luckToppings);

/**
 * Pick a surprise toy. Rarity comes from cfg.rarityWeights; luck (0..1) scales the
 * rare tiers by up to 1 + cfg.luckBoost; minTier removes the tiers below it. An
 * already owned toy gets one free reroll so the album fills faster.
 * @param {() => number} random source of numbers in [0, 1)
 */
function pickToy(random = Math.random, luckNow = 0, minTier = 0) {
  const w = cfg.rarityWeights.map((v, i) => i < minTier ? 0 : i ? v * (1 + luckNow * cfg.luckBoost) : v);
  const roll = () => {
    let r = random() * w.reduce((a, b) => a + b, 0), tier = minTier;
    while (tier < 3 && (r -= w[tier]) > 0) tier++;
    const pool = TOYS.filter(t => t.r === tier);
    return pool[random() * pool.length | 0];
  };
  const t = roll();
  return save.owned.includes(t.e) ? roll() : t;
}

/* ---------- feedback ---------- */
function beep(f, d = 0.08, type = 'sine', v = 0.12, slide = 0) {
  if (!ac) return;
  const o = ac.createOscillator(), a = ac.createGain(), t = ac.currentTime;
  o.type = type; o.frequency.setValueAtTime(f, t);
  if (slide) o.frequency.linearRampToValueAtTime(f + slide, t + d);
  a.gain.setValueAtTime(v, t); a.gain.exponentialRampToValueAtTime(0.001, t + d);
  o.connect(a).connect(ac.destination); o.start(t); o.stop(t + d);
}
/** Play a recorded sound if asset_map has it, else the synthesized fallback. */
function sfx(id, fallback) {
  const a = SND[id];
  if (!a) { fallback(); return; }
  a.currentTime = 0; a.play().catch(() => {});
}
/** Keep a looping sound running while `on` is true. Returns false when there is no such asset. */
function hum(id, on) {
  const a = SND[id];
  if (!a) return false;
  if (on && a.paused) { a.loop = true; a.play().catch(() => {}); } else if (!on && !a.paused) a.pause();
  return true;
}
const toast = (txt, c = '#ff2d8a') => { S.F = [{ txt, c, life: 1.3 }]; };
function burst(x, y, n, col, speed = 320, grav = 700, r = 9) {
  for (let i = 0; i < n; i++) {
    const a = rnd(0, TAU), v = rnd(0.3, 1) * speed;
    S.P.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - speed * 0.4, g: grav, r: rnd(0.5, 1) * r, c: col || rgb(COLORS[i % 5].c), life: rnd(0.5, 1), max: 1 });
  }
}
const fanfare = n => [523, 659, 784, 1047, 1319].slice(0, n).forEach((f, i) => setTimeout(() => beep(f, 0.16, 'triangle', 0.14), i * 85));
function complete() {
  S.ok = true; S.okT = 0;
  const gold = S.step === 3 && S.golden;
  toast(gold ? 'GOLDEN BOMB!' : STEPS[S.step].done, gold ? '#ffb800' : '#ff2d8a');
  burst(360, 520, gold ? 90 : 40, gold ? '#ffd000' : null, 520);
  sfx('sfx_pop', () => fanfare(gold ? 5 : 3));
  lib.haptics.play('success');
}
function advance() {
  hum('sfx_pour', false); hum('sfx_stir', false);
  S.step++; S.prog = 0; S.ok = false; S.okT = 0; S.idle = 0; S.ang = null;
  beep(880, 0.1, 'triangle', 0.1, 300);
}

/* ---------- input ---------- */
function onDown(p) {
  if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { /* no sound here */ } }
  if (!touched) { touched = true; if (S.step === 0) S.prog = 0; hum('music', true); }
  S.ptr = { ...p, down: true }; S.idle = 0;
  if (S.album) { S.album = false; return; }
  if (p.x > 540 && p.y < 130) { S.album = true; beep(700, 0.06); return; }
  if (S.toys) {
    if (S.reveal > 0.8 && inBtn(p)) { newBomb(); beep(660, 0.12, 'triangle', 0.12, 400); }
    else { S.poke = 1; burst(360, 560, 12, 'rgba(120,210,255,0.9)', 300, 500, 10); sfx('sfx_squeak', () => beep(900, 0.12, 'square', 0.08, 500)); lib.haptics.play('tap'); }
    return;
  }
  if (S.ok && (S.step === 1 || S.step === 4) && inBtn(p)) { advance(); return; }
  const slot = slotAt(p);
  if (S.step === 1 && slot >= 0 && slot < 5 && S.drops < 8) {
    if (!isOpen('color', slot)) return locked();
    S.falling.push({ x: 360, y: 300, vy: 0, i: slot }); beep(500 + slot * 60, 0.07);
  } else if (S.step === 3 && !S.ok) {
    if (slot >= 0 && slot < MOLDS.length) { if (!isOpen('mold', slot)) return locked(); S.mold = slot; beep(600 + slot * 70, 0.06); return; }
    S.prog += 1 / cfg.pressTaps; S.squash = 1; S.shake = 8;
    burst(360, 640, 10, rgb(S.col), 260, 500, 7);
    sfx('sfx_press', () => beep(180 + S.prog * 200, 0.1, 'square', 0.1)); lib.haptics.play('tap');
    if (S.prog > 0.999) { S.prog = 1; complete(); } // six taps of 1/6 sum to just under 1
  } else if (S.step === 4) {
    if (slot >= 0 && slot < 5) { if (!isOpen('top', slot)) return locked(); S.top = slot; beep(600 + slot * 70, 0.06); }
    else stamp(p);
  } else if (S.step === 5) {
    if (S.ball.wet) { S.fizz += cfg.tapFizzBoost; burst(S.ball.x, S.ball.y, 14, 'rgba(255,255,255,0.9)', 300, -500, 10); beep(rnd(900, 1500), 0.05, 'sine', 0.08); }
    else S.ball.held = true;
  }
}
function locked() { toast('Make more bombs!', '#7a3cff'); beep(200, 0.1, 'square', 0.06); }
function onMove(p) {
  if (!S.ptr.down) return;
  S.ptr.x = p.x; S.ptr.y = p.y; S.idle = 0;
  if (S.step === 2 && !S.ok) {
    const a = Math.atan2(p.y - BOWL.y, p.x - BOWL.x);
    if (S.ang !== null) {
      let d = a - S.ang; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU;
      S.swirl += d; S.prog = Math.min(1, S.prog + Math.abs(d) / (TAU * cfg.mixTurns));
      if (!hum('sfx_stir', true) && (S.tick += Math.abs(d)) > 0.8) { S.tick = 0; beep(300 + S.prog * 300, 0.05, 'sine', 0.06); }
      if (S.prog >= 1) complete();
    }
    S.ang = a;
  } else if (S.step === 4) stamp(p);
}
function onUp() {
  S.ptr.down = false; S.ang = null; S.lastStamp = null; hum('sfx_stir', false);
  if (S.step === 0 && !S.ok && S.prog > 0) toast('Keep pouring!', '#7a3cff');
  if (S.step === 2 && !S.ok && S.prog > 0) toast('Keep stirring!', '#7a3cff');
  if (S.step === 5 && S.ball.held) { S.ball.held = false; S.ball.loose = true; }
}
function stamp(p) {
  shapePath(S.mold, BALL.x, BALL.y, BALL.r * 0.92);
  if (!g.isPointInPath(p.x, p.y, 'evenodd')) return;
  if (S.lastStamp && Math.hypot(p.x - S.lastStamp.x, p.y - S.lastStamp.y) < 46) return;
  S.lastStamp = { x: p.x, y: p.y };
  const before = luck();
  S.tops.push({ e: TOPS[S.top], dx: (p.x - BALL.x) / BALL.r, dy: (p.y - BALL.y) / BALL.r, rot: rnd(-0.5, 0.5), pop: 1 });
  if (S.tops.length > 60) S.tops.shift();
  burst(p.x, p.y, 5, '#fff', 160, 300, 5); sfx('sfx_drop', () => beep(rnd(700, 1100), 0.05, 'triangle', 0.08)); lib.haptics.play('tick');
  if (!S.ok && S.tops.length >= cfg.toppingsNeeded) complete();
  else if (before < 1 && luck() >= 1) { toast('MAX LUCK!', '#22b455'); burst(360, 280, 40, '#35d07f', 420); fanfare(4); }
}
function bindInput() {
  if (bound) return; bound = true;
  const pos = e => { const r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) * W / r.width, y: (e.clientY - r.top) * H / r.height }; };
  cv.addEventListener('pointerdown', e => { try { cv.setPointerCapture(e.pointerId); } catch (x) { /* synthetic pointer */ } onDown(pos(e)); });
  cv.addEventListener('pointermove', e => onMove(pos(e)));
  cv.addEventListener('pointerup', onUp); cv.addEventListener('pointercancel', onUp);
}

/* ---------- update ---------- */
function update(dt) {
  S.t += dt; S.idle += dt; S.shake *= Math.pow(0.001, dt); S.squash *= Math.pow(0.0005, dt); S.poke *= Math.pow(0.002, dt);
  if (S.ok) { S.okT += dt; if (S.okT > 0.9 && [0, 2, 3].includes(S.step)) advance(); }
  if (S.step === 0) {
    // Before the first touch the jar pours by itself in a loop, so the game looks alive behind the Play card.
    const cycle = (S.t % 3) / 3, demo = !touched && cycle < 0.6;
    if (!touched) S.prog = Math.min(cycle, 0.6);
    const pouring = (S.ptr.down || demo) && !S.ok;
    S.jar += ((pouring ? 2.2 : 0) - S.jar) * Math.min(1, dt * 9);
    const flowing = pouring && S.jar > 1.4;
    if (flowing) {
      if (touched) S.prog = Math.min(1, S.prog + dt / cfg.pourSeconds);
      for (let i = 0; i < 4; i++) S.P.push({ x: 384 + rnd(-10, 10), y: 450, vx: rnd(-40, 40), vy: rnd(250, 380), g: 900, r: rnd(4, 9), c: '#ffffff', life: 0.42, max: 0.42 });
      if (S.prog >= 1) complete();
    }
    if (!hum('sfx_pour', flowing && touched) && flowing && (S.tick += dt) > 0.07) { S.tick = 0; beep(rnd(500, 900), 0.04, 'sine', 0.05); }
  }
  for (const d of S.falling) { d.vy += 2400 * dt; d.y += d.vy * dt; }
  S.falling = S.falling.filter(d => {
    if (d.y < BOWL.y - 10) return true;
    const k = COLORS[d.i];
    S.col = S.drops ? mix(S.col, k.c, 0.5) : k.c.slice(); S.drops++;
    S.spots.push({ x: rnd(-150, 150), y: rnd(-18, 18), c: k.c });
    burst(360, BOWL.y, 16, rgb(k.c), 300, 800, 10); sfx('sfx_drop', () => beep(400, 0.12, 'sine', 0.12, -200)); lib.haptics.play('tap');
    if (S.drops <= cfg.dropsNeeded) toast(`${k.n}! ${S.drops}/${cfg.dropsNeeded}`, rgb(k.c));
    if (!S.ok && S.drops >= cfg.dropsNeeded) complete();
    return false;
  });
  for (const t of S.tops) t.pop *= Math.pow(0.001, dt);
  if (S.step === 5) updateBath(dt);
  for (const p of S.P) { p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; }
  S.P = S.P.filter(p => p.life > 0);
  for (const f of S.F) f.life -= dt;
  S.F = S.F.filter(f => f.life > 0);
}
function updateBath(dt) {
  const b = S.ball;
  if (S.toys) { S.reveal += dt; return; }
  if (b.wet) {
    b.y += (900 + Math.sin(S.t * 5) * 8 - b.y) * Math.min(1, dt * 6);
    S.fizz = Math.min(1, S.fizz + dt / cfg.fizzSeconds);
    b.r = 110 * (1 - S.fizz * 0.8); S.shake = Math.max(S.shake, 3);
    for (let i = 0; i < 3; i++) S.P.push({ x: b.x + rnd(-b.r, b.r), y: b.y, vx: rnd(-60, 60), vy: rnd(-260, -120), g: -200, r: rnd(5, 16), c: Math.random() < 0.5 ? 'rgba(255,255,255,0.85)' : rgb(S.golden ? [255, 208, 0] : S.col, 0.8), life: rnd(0.4, 0.9), max: 0.9 });
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
function reveal() {
  const first = pickToy(Math.random, luck(), S.golden ? 1 : 0);
  S.toys = [first];
  if (save.made >= 2 && Math.random() < cfg.twinChance) {
    const second = pickToy(Math.random, luck());
    if (second !== first) S.toys.push(second);
  }
  S.isNew = S.toys.some(t => !save.owned.includes(t.e));
  for (const t of S.toys) if (!save.owned.includes(t.e)) save.owned.push(t.e);
  save.made++;
  S.unlock = cfg.unlocks.find(u => u.at === save.made) || null;
  S.reveal = 0; S.shake = 18;
  hum('sfx_fizz', false); lib.haptics.stop(); lib.haptics.play('success');
  burst(360, 600, 90, null, 760, 800, 12);
  sfx('sfx_win', () => fanfare(3 + Math.max(...S.toys.map(t => t.r))));
  lib.saveUserGameState(save).catch(() => {});
  lib.addPlayerScoreToLeaderboard(save.owned.length).catch(() => {}); // guests cannot post a score
}

/* ---------- drawing ---------- */
function rr(x, y, w, h, r) { g.beginPath(); g.roundRect(x, y, w, h, r); }
function txt(s, x, y, size, fill = '#5a1e86', stroke = '#fff', sw = 12) {
  g.font = `900 ${size}px "Trebuchet MS", "Arial Rounded MT Bold", Arial, sans-serif`;
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
  if (stroke) { g.lineWidth = sw; g.strokeStyle = stroke; g.strokeText(s, x, y); }
  g.fillStyle = fill; g.fillText(s, x, y);
}
function emo(s, x, y, size, rot = 0) {
  g.save(); g.translate(x, y); g.rotate(rot); g.font = `${size}px sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(s, 0, 0); g.restore();
}
const ready = id => IMG[id] && IMG[id].complete && IMG[id].naturalWidth > 0;
/** Draw an image asset centred at x,y, or the emoji fallback when the asset is missing. */
function pic(id, fallback, x, y, size, sx = 1, sy = 1) {
  const im = IMG[id];
  if (!ready(id)) { g.save(); g.translate(x, y); g.scale(sx, sy); emo(fallback, 0, 0, size); g.restore(); return; }
  const k = size * 1.15 / Math.max(im.naturalWidth, im.naturalHeight);
  g.save(); g.translate(x, y); g.scale(sx * k, sy * k); g.drawImage(im, -im.naturalWidth / 2, -im.naturalHeight / 2); g.restore();
}
/** Trace the outline of mold `kind` (0 ball, 1 heart, 2 star, 3 donut). Fill with 'evenodd'. */
function shapePath(kind, x, y, r) {
  g.beginPath();
  if (kind === 1) {
    g.moveTo(x, y + r * 0.95);
    g.bezierCurveTo(x - r * 1.55, y - r * 0.05, x - r * 0.8, y - r * 1.2, x, y - r * 0.45);
    g.bezierCurveTo(x + r * 0.8, y - r * 1.2, x + r * 1.55, y - r * 0.05, x, y + r * 0.95);
  } else if (kind === 2) {
    for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, q = i % 2 ? r * 0.58 : r * 1.1; g.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q); }
    g.closePath();
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
  txt(label, 0, 2, label.length > 8 ? 44 : 58, '#fff', '#5a1e86', 10); g.restore();
}
function bombBall(x, y, r) {
  const gr = g.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r * 1.1);
  gr.addColorStop(0, rgb(mix(S.col, [255, 255, 255], 0.6))); gr.addColorStop(1, rgb(S.col));
  shapePath(S.mold, x, y, r); g.lineJoin = 'round';
  g.fillStyle = gr; g.fill('evenodd');
  g.lineWidth = S.golden ? 16 : 8; g.strokeStyle = S.golden ? '#ffc400' : rgb(mix(S.col, [90, 30, 134], 0.35)); g.stroke();
  for (const t of S.tops) emo(t.e, x + t.dx * r, y + t.dy * r, r * 0.3 * (1 + t.pop * 0.8), t.rot);
  if (S.golden) for (let i = 0; i < 4; i++) emo('✨', x + Math.cos(S.t * 2 + i * 1.57) * r * 1.2, y + Math.sin(S.t * 2 + i * 1.57) * r * 1.2, r * 0.3);
}
/** A row of round choice buttons. `face(i, x)` draws what is inside button i. */
function choiceRow(n, selected, kind, face) {
  for (let i = 0; i < n; i++) {
    const x = slotX(i), open = isOpen(kind, i);
    g.fillStyle = !open ? '#e6dcef' : i === selected ? '#ffd000' : '#fff';
    g.beginPath(); g.arc(x, ROW_Y, i === selected ? 64 : 58, 0, TAU); g.fill();
    if (open) face(i, x); else emo('🔒', x, ROW_Y + 4, 54);
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
    if (ready('jar_powder')) { const jh = 180 * IMG.jar_powder.naturalHeight / IMG.jar_powder.naturalWidth; g.drawImage(IMG.jar_powder, -90, -jh / 2, 180, jh); g.restore(); return; }
    g.fillStyle = '#38c6ff'; rr(-75, -100, 150, 200, 30); g.fill();
    g.fillStyle = '#fff'; rr(-55, -40, 110, 100, 18); g.fill(); emo('✨', 0, 12, 64);
    g.fillStyle = '#ffd000'; rr(-60, -128, 120, 34, 12); g.fill(); g.restore();
  } else if (S.step === 1) {
    for (const d of S.falling) { g.fillStyle = rgb(COLORS[d.i].c); g.beginPath(); g.arc(d.x, d.y, 22, 0, TAU); g.fill(); }
    choiceRow(5, -1, 'color', (i, x) => {
      g.fillStyle = rgb(COLORS[i].c); g.beginPath(); g.arc(x, ROW_Y, 48, 0, TAU); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.5)'; g.beginPath(); g.arc(x - 16, ROW_Y - 18, 13, 0, TAU); g.fill();
    });
  } else if (S.step === 2 && S.ptr.down) {
    g.lineCap = 'round'; g.lineWidth = 22; g.strokeStyle = '#ffd000';
    g.beginPath(); g.moveTo(S.ptr.x, S.ptr.y); g.lineTo(S.ptr.x + 70, S.ptr.y - 190); g.stroke();
    g.fillStyle = '#ffd000'; g.beginPath(); g.ellipse(S.ptr.x, S.ptr.y, 40, 28, 0.3, 0, TAU); g.fill();
  } else if (S.step === 3) {
    const open = S.ok ? S.okT * 420 : 0, gap = 130 * (1 - S.prog) + open, cy = 640 + S.squash * 14;
    if (S.ok) bombBall(360, cy - 60, 140 * Math.min(1, backOut(Math.min(1, S.okT * 2))));
    else { g.fillStyle = rgb(S.col); g.beginPath(); g.arc(360, cy - gap / 2, 150, 0, TAU); g.fill(); }
    g.fillStyle = '#9fb4ff'; g.strokeStyle = '#5c74e6'; g.lineWidth = 10;
    g.beginPath(); g.arc(360, cy + open, 172, 0, Math.PI); g.closePath(); g.fill(); g.stroke();
    g.beginPath(); g.arc(360, cy - gap - S.squash * 20, 172, Math.PI, TAU); g.closePath(); g.fill(); g.stroke();
    if (!S.ok) choiceRow(MOLDS.length, S.mold, 'mold', (i, x) => { shapePath(i, x, ROW_Y + (i === 1 ? 4 : 0), 30); g.fillStyle = '#ff2d8a'; g.fill('evenodd'); });
  } else if (S.step === 4) {
    bombBall(BALL.x, BALL.y, BALL.r);
    choiceRow(5, S.top, 'top', (i, x) => emo(TOPS[i], x, ROW_Y + 4, 64));
  } else if (S.step === 5) {
    const water = mix([110, 215, 255], S.golden ? [255, 208, 0] : S.col, S.fizz * 0.75);
    if (!S.ball.wet) bombBall(S.ball.x, S.ball.y, S.ball.r);
    g.fillStyle = '#fff'; rr(40, 760, 640, 440, 70); g.fill();
    g.fillStyle = rgb(water); rr(64, WATER_Y, 592, 376, 54); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.45)';
    for (let i = 0; i < 6; i++) { g.beginPath(); g.ellipse(110 + i * 100 + Math.sin(S.t * 2 + i) * 14, WATER_Y + 6, 46, 10, 0, 0, TAU); g.fill(); }
    if (S.ball.wet && !S.toys) bombBall(S.ball.x, S.ball.y, S.ball.r);
  }
}
function drawHud() {
  for (let i = 0; i < 6; i++) {
    const x = 70 + i * 76, cur = i === S.step;
    g.fillStyle = i < S.step ? '#35d07f' : cur ? '#ff2d8a' : '#fff';
    g.beginPath(); g.arc(x, 70, cur ? 28 : 20, 0, TAU); g.fill();
    g.lineWidth = 6; g.strokeStyle = '#5a1e86'; g.stroke();
    if (i < S.step) txt('✓', x, 72, 26, '#fff', null);
    else txt(String(i + 1), x, 72, cur ? 32 : 22, cur ? '#fff' : '#5a1e86', null);
  }
  g.fillStyle = '#fff'; rr(548, 30, 152, 80, 40); g.fill(); g.lineWidth = 6; g.strokeStyle = '#5a1e86'; g.stroke();
  emo('🎁', 588, 72, 40); txt(`${save.owned.length}/${TOYS.length}`, 650, 72, 30, '#5a1e86', null);
  if (!S.toys) txt(STEPS[S.step].say, 360, 200, 62);
  if (!S.toys && (S.step > 0 || S.prog > 0)) {
    const isLuck = S.step === 4;
    const p = S.step === 1 ? S.drops / cfg.dropsNeeded : isLuck ? luck() : S.step === 5 ? S.fizz : S.prog;
    g.fillStyle = '#fff'; rr(160, 250, 400, 30, 15); g.fill();
    g.fillStyle = isLuck && p >= 1 ? '#ffc400' : '#35d07f'; rr(160, 250, 400 * Math.min(1, p), 30, 15); g.fill();
    g.lineWidth = 6; g.strokeStyle = '#5a1e86'; rr(160, 250, 400, 30, 15); g.stroke();
    if (isLuck) { emo('🍀', 130, 266, 54); txt('LUCK', 620, 266, 30); }
  }
  if (S.ok && S.step === 1) button('NEXT', '#35d07f');
  if (S.ok && S.step === 4) button('DROP IT!', '#ff2d8a');
  for (const f of S.F) {
    const k = Math.min(1, (1.3 - f.life) * 6);
    g.save(); g.globalAlpha = Math.min(1, f.life * 3); g.translate(360, 390 - (1.3 - f.life) * 30); g.scale(backOut(k), backOut(k));
    txt(f.txt, 0, 0, 68, f.c, '#fff', 14); g.restore();
  }
  if (!S.toys && !S.ok && S.idle > cfg.hintDelay && !S.ptr.down) drawHint();
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
  const k = Math.min(1, S.reveal * 1.8), best = RARITY[Math.max(...S.toys.map(t => t.r))], two = S.toys.length > 1;
  g.fillStyle = `rgba(255,255,255,${0.75 * k})`; g.fillRect(0, 0, W, H);
  g.save(); g.translate(360, 560); g.rotate(S.t * 0.6); g.fillStyle = best.c; g.globalAlpha = 0.28 * k;
  for (let i = 0; i < 12; i++) { g.rotate(TAU / 12); g.beginPath(); g.moveTo(0, 0); g.lineTo(-46, -520); g.lineTo(46, -520); g.fill(); }
  g.restore();
  const size = (two ? 190 : 260) * Math.max(0.01, backOut(k));
  S.toys.forEach((t, i) => pic(t.id, t.e, 360 + (two ? (i ? 140 : -140) : 0), 900 - 340 * backOut(k) + Math.sin(S.t * 4 + i) * 8, size, 1 + S.poke * 0.25, 1 - S.poke * 0.3));
  txt(best.n, 360, 300, 60, best.c, '#fff', 14);
  if (S.reveal > 0.5) {
    txt(S.toys.map(t => t.n).join(' + ') + '!', 360, 790, two ? 58 : 84);
    txt(two ? 'DOUBLE TOY!' : S.isNew ? 'NEW TOY!' : 'You have this one', 360, 872, two || S.isNew ? 52 : 40, two || S.isNew ? '#ff2d8a' : '#7a6a8a');
    txt(`🎁 ${save.owned.length}/${TOYS.length}`, 360, 942, 46);
    if (S.unlock) txt('NEW: ' + unlockName(S.unlock) + '!', 360, 1020, 50, '#22b455', '#fff', 14);
  }
  if (S.reveal > 0.8) button('MAKE ANOTHER', '#35d07f');
}
function drawAlbum() {
  g.fillStyle = 'rgba(90,30,134,0.6)'; g.fillRect(0, 0, W, H);
  g.fillStyle = '#fff'; rr(50, 220, 620, 800, 50); g.fill();
  txt(`MY TOYS ${save.owned.length}/${TOYS.length}`, 360, 300, 56, '#5a1e86', null);
  TOYS.forEach((t, i) => {
    const x = 140 + (i % 4) * 147, y = 430 + (i / 4 | 0) * 150, has = save.owned.includes(t.e);
    g.fillStyle = has ? '#fff3c4' : '#ece6f2'; rr(x - 62, y - 62, 124, 124, 26); g.fill();
    g.lineWidth = 6; g.strokeStyle = has ? RARITY[t.r].c : '#cfc4dc'; g.stroke();
    if (has) pic(t.id, t.e, x, y + 4, 78); else txt('?', x, y + 4, 64, '#b9aacb', null);
  });
}
function draw() {
  const bg = g.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#ffe36e'); bg.addColorStop(0.55, '#ffb3d9'); bg.addColorStop(1, '#8fe0ff');
  g.fillStyle = bg; g.fillRect(0, 0, W, H);
  if (ready('bg_bathroom')) { const im = IMG.bg_bathroom, k = Math.max(W / im.naturalWidth, H / im.naturalHeight); g.drawImage(im, (W - im.naturalWidth * k) / 2, (H - im.naturalHeight * k) / 2, im.naturalWidth * k, im.naturalHeight * k); g.fillStyle = 'rgba(255,255,255,0.3)'; g.fillRect(0, 0, W, H); } // washed out so the HUD and choices stay readable
  g.fillStyle = 'rgba(255,255,255,0.35)';
  for (let i = 0; i < 14; i++) { g.beginPath(); g.arc((i * 173) % W, (i * 311 + S.t * 30) % H, 14 + (i % 3) * 8, 0, TAU); g.fill(); }
  g.save(); g.translate(rnd(-1, 1) * S.shake, rnd(-1, 1) * S.shake);
  drawScene();
  for (const p of S.P) { g.globalAlpha = Math.max(0, Math.min(1, p.life / p.max * 2)); g.fillStyle = p.c; g.beginPath(); g.arc(p.x, p.y, p.r, 0, TAU); g.fill(); }
  g.globalAlpha = 1; g.restore();
  if (S.toys) drawReveal();
  drawHud();
  if (S.album) drawAlbum();
  cv.dataset.step = S.step; cv.dataset.toy = S.toys ? S.toys.map(t => t.n).join('+') : ''; cv.dataset.made = save.made;
}
function frame(now) {
  const dt = Math.min((now - last) / 1000, 0.11); last = now;
  if (mode === 'play') update(dt); else S.t += dt; // edit mode: a live picture, no gameplay
  draw();
  raf = requestAnimationFrame(frame);
}
/** Cache every image and sound that asset_map.json provides. Missing ones fall back to emoji and synth. */
function loadAssets() {
  for (const id of [...TOYS.map(t => t.id), 'bg_bathroom', 'jar_powder']) { const a = lib.getAsset(id); if (a && !IMG[id]) { IMG[id] = new Image(); IMG[id].src = a.url; } }
  for (const id of SOUND_IDS) { const a = lib.getAsset(id); if (a && !SND[id]) { SND[id] = new Audio(a.url); SND[id].preload = 'auto'; SND[id].volume = id === 'music' ? 0.35 : 0.8; } }
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
      'Double toy chance': slider('twinChance', 0, 1, 0.01),
    },
  });
  loadAssets();
  cancelAnimationFrame(raf); newBomb();
  if (mode === 'play') {
    bindInput();
    lib.getUserGameState().then(r => {
      if (!(r && r.state && Array.isArray(r.state.owned))) return;
      save = { owned: r.state.owned, made: r.state.made || 0 };
      if (!touched) newBomb(); // pick up the molds this player has already unlocked
    }).catch(() => {});
  }
  last = performance.now(); raf = requestAnimationFrame(frame);
}
window.run = run;

// Local preview outside Astrocade: open index.html?local to stub the host.
if (location.search.includes('local')) {
  const none = async () => ({});
  window.lib = { showGameParameters() {}, log() {}, getAsset: id => window.__assets[id], getUserGameState: none, saveUserGameState: none, addPlayerScoreToLeaderboard: none, haptics: { play() {}, start() {}, stop() {} } };
  window.__pickToy = pickToy;
  Promise.all(['game_config.json', 'asset_map.json'].map(f => fetch(f).then(r => r.json()))).then(([c, assets]) => {
    window.__assets = assets;
    window.gameConfig = { ...c, ...JSON.parse(new URLSearchParams(location.search).get('cfg') || '{}') }; run(new URLSearchParams(location.search).get('mode') || 'play'); });
}
