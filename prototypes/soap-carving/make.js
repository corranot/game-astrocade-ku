// PROTOTYPE - NOT FOR PRODUCTION
/**
 * Making the soap bar before it is carved, seven short steps with a different gesture each:
 * chop the soap base (tap the cubes), add colour (tap the bottles), stir (circles in the pot), pick a scent
 * (tap a flower), pour into the mould (hold, let go at the line), cool it (rub), and pop it out (swipe down).
 * The liquid shows the soap's own marble, so what comes out of the mould is what was mixed in the pot.
 * The game gives this module its helpers once (initMake); every function works on the soap in progress S.
 */
export const MAKE_STEPS = ['chop', 'color', 'stir', 'scent', 'pour', 'cool', 'pop'];
const TAU = Math.PI * 2;
const POT = { x: 360, y: 640, r: 196, liquid: 160 };
const POT_SIDE = { x: 600, y: 520, r: 96 }; // beside the mould, fully on screen in both reading directions
const SCENTS = [{ id: 'lavender', c: '#B57BFF', c2: '#E3CCFF' }, { id: 'rose', c: '#FF6FA8', c2: '#FFD0E2' }, { id: 'lemon', c: '#FFD23F', c2: '#FFF3B0' }];
let C = null; // { cfg, fx, SFX, buzz, burst, R, reward, done, glossDisc, roundRect, tint, PLUM, mx }

/** Give this module the game's helpers. */
export function initMake(ctx) { C = ctx; }
export const isMake = (k) => MAKE_STEPS.includes(k);
const ease = (k) => 1 - Math.pow(1 - Math.max(0, Math.min(1, k)), 3);

/** The making state for a new soap: the marble as a picture, the cubes, drops, stir, pour level, cooling. */
export function makeState(S) {
  const { w, h, alb } = S.soap, c = document.createElement('canvas'); c.width = w; c.height = h;
  const q = c.getContext('2d'), img = q.createImageData(w, h);
  for (let i = 0; i < w * h; i++) { img.data[i * 4] = alb[i * 3]; img.data[i * 4 + 1] = alb[i * 3 + 1]; img.data[i * 4 + 2] = alb[i * 3 + 2]; img.data[i * 4 + 3] = 255; }
  q.putImageData(img, 0, 0);
  const mb = C.cfg().marbles.find((m) => m.id === S.order.marble) || C.cfg().marbles[0];
  return {
    marble: c, base: mb.kind === 'layers' ? '#FFB3E0' : mb.base, swirl: mb.kind === 'layers' ? '#7FD6FF' : mb.swirl, mb,
    cubes: Array.from({ length: C.cfg().chopCubes }, (_, j) => ({ j, cut: false })), bits: [], melt: 0,
    drops: 0, baseDrops: 0, blobs: [], fall: [],
    stir: 0, lastAng: null, scent: -1, petals: [], scentT: -1,
    move: 0, level: 0, pouring: false, poured: false, perfect: false, spillT: 0,
    cool: 0, pop: 0, popT: -1, popDrag: null, t: 0, stepT: 0,
  };
}

// ---------- the tray: cubes, bottles, flowers ----------
const cubeXY = (j, n) => [C.mx(360 + (j - (n - 1) / 2) * 130), 994];
const bottleXY = (j) => [C.mx(j ? 460 : 260), 994];
const flowerXY = (j) => [C.mx(200 + j * 160), 994];
/** Whether the make step k shows the tray. */
export const makeTray = (k) => k === 'chop' || k === 'color' || k === 'scent';

// ---------- input ----------
/** A touch at p during make step k. Returns true when it was used. */
export function makeDown(S, p) {
  const M = S.make, k = S.k, cfg = C.cfg();
  M.stepUsed = true;
  if (k === 'chop') {
    const n = M.cubes.length;
    let hit = M.cubes.find((c) => !c.cut && Math.hypot(p[0] - cubeXY(c.j, n)[0], p[1] - cubeXY(c.j, n)[1]) < 64);
    if (!hit && p[1] > 900) hit = M.cubes.find((c) => !c.cut); // a tap anywhere on the tray chops the next cube
    if (!hit) return false;
    hit.cut = true; const [x, y] = cubeXY(hit.j, n);
    for (let i = 0; i < 4; i++) M.bits.push({ x: x + (i % 2 - 0.5) * 30, y: y + (i > 1 ? 15 : -15), sx: x, sy: y, tx: POT.x + (C.R() - 0.5) * 140, ty: POT.y + (C.R() - 0.5) * 120, t: -i * 0.05, s: 30 + C.R() * 8 });
    C.SFX.crunch(1200); C.buzz('tap'); C.burst(x, y, 6, false); C.shake(0.12);
    return true;
  }
  if (k === 'color') {
    let j = [0, 1].find((b) => Math.hypot(p[0] - bottleXY(b)[0], p[1] - bottleXY(b)[1]) < 70);
    if (j === undefined) { if (p[1] < 900) return false; j = M.baseDrops < 2 ? 0 : 1; }
    if (M.drops + M.fall.filter((f) => !f.in).length >= cfg.colorDrops) return true; // drops still falling count, landed ones are in M.drops
    M.fall.push({ c: j ? M.swirl : M.base, swirl: !!j, x: POT.x + (C.R() - 0.5) * 120, y: POT.y - 260, t: 0 });
    C.SFX.pick(); C.buzz('tap');
    return true;
  }
  if (k === 'scent') {
    if (M.scent >= 0) return true;
    let j = [0, 1, 2].find((f) => Math.hypot(p[0] - flowerXY(f)[0], p[1] - flowerXY(f)[1]) < 70);
    if (j === undefined) { if (p[1] < 900) return false; j = 0; }
    M.scent = j; M.scentT = 0; S.scent = SCENTS[j].id;
    for (let i = 0; i < 12; i++) M.petals.push({ a: C.R() * TAU, r: 30 + C.R() * 110, rot: C.R() * TAU, c: i % 3 ? SCENTS[j].c : SCENTS[j].c2, t: -i * 0.04, sx: flowerXY(j)[0], sy: flowerXY(j)[1] });
    C.SFX.shimmer(); C.buzz('success'); C.burst(flowerXY(j)[0], flowerXY(j)[1], 14, false);
    return true;
  }
  if (k === 'pour') { M.held = true; return true; } // pouring starts as soon as the pot is in place, even if the finger came first
  if (k === 'pop') { if (M.popT < 0) M.popDrag = { y: p[1], taps: (M.popDrag ? M.popDrag.taps : 0) + 1 }; if (M.popDrag && M.popDrag.taps >= 3) popOut(S); return true; }
  return k === 'stir' || k === 'cool';
}
/** The finger moved from (ax, ay) to (bx, by). */
export function makeMove(S, ax, ay, bx, by) {
  const M = S.make, k = S.k, cfg = C.cfg();
  if (k === 'stir') {
    const r = Math.hypot(bx - POT.x, by - POT.y); if (r < 24 || r > POT.r + 60) { M.lastAng = null; return; }
    const a = Math.atan2(by - POT.y, bx - POT.x);
    if (M.lastAng !== null) { let d = a - M.lastAng; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; M.stir += Math.abs(d); M.spin = (M.spin || 0) + d; }
    M.lastAng = a;
    if (C.every('swish', 160)) { C.SFX.swish(); C.buzz('tick'); C.fx.ring(bx, by, 14, 0.5); }
  } else if (k === 'cool') {
    const d = Math.hypot(bx - ax, by - ay), b = cfg.bar;
    if (bx < b.x - 20 || bx > b.x + b.w + 20 || by < b.y - 20 || by > b.y + b.h + 20) return;
    M.cool = Math.min(1, M.cool + d / cfg.coolDist);
    if (C.every('frost', 70)) C.fx.twinkle(bx + (C.R() - 0.5) * 60, by + (C.R() - 0.5) * 60, 10 + C.R() * 10, 0.6, C.R() < 0.5 ? '#FFFFFF' : '#BFE9FF');
    if (C.every('crackle', 170)) { C.SFX.crackle(); C.buzz('tick'); }
  } else if (k === 'pop' && M.popDrag && M.popT < 0 && by - M.popDrag.y > 90) popOut(S);
}
/** The finger lifted. */
export function makeUp(S) {
  const M = S.make; if (!M) return;
  M.lastAng = null; M.held = false;
  if (S.k === 'pour' && M.pouring) {
    M.pouring = false;
    if (M.level >= C.cfg().pourMin) finishPour(S);
    else { M.lowT = 0.8; C.SFX.no(); C.buzz('warning'); } // too early: the gauge shakes and points at the green band
  }
}
/** Stop any pour or stir in progress (the host restarted, the finger is gone). */
export function makeStop(S) { const M = S && S.make; if (M) { M.pouring = false; M.held = false; M.lastAng = null; } }
/** How much of the mould the liquid covers at fill level v: full exactly when the level reaches the green band. */
export const fillShare = (v) => Math.min(1, Math.sqrt(Math.max(0, v) / C.cfg().pourLo));
/** The pot's place beside the mould while pouring. */
export const potSide = () => ({ x: C.mx(POT_SIDE.x), y: POT_SIDE.y, r: POT_SIDE.r });
function finishPour(S) {
  const M = S.make, cfg = C.cfg(); if (M.poured) return;
  M.poured = true; M.pouring = false;
  M.perfect = M.level >= cfg.pourLo && M.level <= cfg.pourHi;
  if (M.perfect) { M.perfectT = 0; C.SFX.wow(); C.buzz('success'); C.burst(360, 560, 40, true); C.reward(360, 560, cfg.perfectCoins); }
  else C.SFX.step();
  M.level = Math.max(M.level, 0.9); // the mould is always full enough: no fail
  M.doneAt = M.stepT + (M.perfect ? 0.9 : 0.35); // a beat to see the result, counted in game time
}
function popOut(S) {
  const M = S.make; if (M.popT >= 0) return;
  M.popT = 0; C.SFX.thud(); C.buzz('thud'); C.shake(0.3); C.burst(C.cfg().bar.x + C.cfg().bar.w / 2, C.cfg().bar.y + C.cfg().bar.h / 2, 24, false);
}

// ---------- time ----------
/** Advance the making animations and finish the step when its goal is reached. */
export function makeUpdate(S, dt) {
  const M = S.make, k = S.k, cfg = C.cfg(); M.t += dt; M.stepT += dt;
  let flying = 0;
  for (const b of M.bits) {
    b.t += dt; if (b.in) continue;
    if (b.t < 0.45) { flying++; continue; }
    b.in = true; M.melt = Math.min(1, M.melt + 1 / (M.cubes.length * 4)); if (C.every('plop', 90)) { C.SFX.plop(); C.fx.ring(b.tx, b.ty, 26, 0.7); }
  }
  for (const f of M.fall) {
    f.t += dt; if (f.in || f.t < 0.4) continue;
    f.in = true; M.drops++; if (!f.swirl) M.baseDrops++;
    M.blobs.push({ c: f.c, x: f.x - POT.x, y: f.y + 260 - POT.y, r: 20, swirl: f.swirl });
    C.SFX.pop(); C.fx.ring(f.x, POT.y + (f.y + 260 - POT.y), 30, 0.8); C.burst(f.x, POT.y, 4, false);
  }
  for (const b of M.blobs) b.r = Math.min(b.swirl ? 70 : 150, b.r + dt * 160);
  for (const p of M.petals) p.t += dt;
  if (M.scentT >= 0) M.scentT += dt;
  if (M.perfectT !== undefined) M.perfectT += dt;
  if (k === 'chop' && !flying && M.bits.length === M.cubes.length * 4) C.done();
  else if (k === 'color' && M.drops >= cfg.colorDrops) C.done();
  else if (k === 'stir' && M.stir >= cfg.stirTurns * TAU) C.done();
  else if (k === 'scent' && M.scentT > 0.9) C.done();
  else if (k === 'pour') {
    M.move = Math.min(1, M.move + dt * 2.2);
    if (M.held && M.move >= 1 && !M.poured) M.pouring = true;
    if (M.lowT > 0) M.lowT -= dt;
    if (M.pouring) {
      M.level += dt * cfg.pourRate;
      if (C.every('pourS', 120)) { C.SFX.pour(); C.buzz('tick'); }
      if (M.level >= 1.04) { M.spillT = 0.6; C.SFX.oops(); finishPour(S); }
    }
    if (M.spillT > 0) M.spillT -= dt;
    if (M.doneAt !== undefined && M.stepT >= M.doneAt) C.done();
  } else if (k === 'cool') {
    if (M.cool >= 1) C.done();
    else if (C.every('steam', 260) && M.cool < 0.8) C.fx.foam(cfg.bar.x + C.R() * cfg.bar.w, cfg.bar.y + C.R() * cfg.bar.h, 10 + C.R() * 10, 0.9);
  } else if (k === 'pop' && M.popT >= 0) { M.popT += dt; if (M.popT > 0.55) C.done(); }
}
/** Progress of the step (0..1) for the ring on the step icon. */
export function makeProgress(S) {
  const M = S.make, k = S.k, cfg = C.cfg();
  return k === 'chop' ? M.bits.length / (M.cubes.length * 4) : k === 'color' ? M.drops / cfg.colorDrops : k === 'stir' ? M.stir / (cfg.stirTurns * TAU)
    : k === 'scent' ? (M.scent >= 0 ? 1 : 0) : k === 'pour' ? Math.min(1, M.level) : k === 'cool' ? M.cool : M.popT >= 0 ? 1 : 0;
}

// ---------- drawing ----------
let POT_IMG = null, CUBE_IMG = null, MOULD_IMG = null;
/** The pot, drawn once at full size; smaller pots are this picture scaled. */
function potBody(g, x, y, r) {
  if (!POT_IMG) { const R = POT.r, c = document.createElement('canvas'); c.width = c.height = Math.ceil(R * 2.7); potDraw(c.getContext('2d'), c.width / 2, c.height / 2, R); POT_IMG = c; }
  const k = r / POT.r, w = POT_IMG.width * k; g.drawImage(POT_IMG, x - w / 2, y - w / 2, w, w);
}
function potDraw(g, x, y, r) {
  g.fillStyle = 'rgba(92,52,70,0.22)'; g.beginPath(); g.ellipse(x + 10, y + 18, r * 1.02, r * 0.98, 0, 0, TAU); g.fill();
  // handles
  for (const s of [-1, 1]) { g.fillStyle = '#3BBFA0'; C.roundRect(g, x + s * r * 0.92 - (s > 0 ? 0 : r * 0.3), y - r * 0.12, r * 0.3, r * 0.24, r * 0.1); g.fill(); g.fillStyle = 'rgba(255,255,255,0.5)'; g.fillRect(x + s * r * 0.92 - (s > 0 ? -r * 0.04 : r * 0.26), y - r * 0.08, r * 0.2, r * 0.05); }
  const gr = g.createRadialGradient(x - r * 0.3, y - r * 0.4, r * 0.2, x, y, r); gr.addColorStop(0, '#9FF0DA'); gr.addColorStop(0.7, '#4FD1B0'); gr.addColorStop(1, '#2FAE90');
  g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); g.lineWidth = 6; g.strokeStyle = '#FFFFFF'; g.stroke();
  const inside = g.createRadialGradient(x - r * 0.2, y - r * 0.25, r * 0.1, x, y, r * 0.86); inside.addColorStop(0, '#E4F1F6'); inside.addColorStop(1, '#AFC9D6');
  g.fillStyle = inside; g.beginPath(); g.arc(x, y, r * 0.86, 0, TAU); g.fill(); // the steel inside, so the creamy melt shows against it
  g.strokeStyle = 'rgba(92,52,70,0.15)'; g.lineWidth = 4; g.beginPath(); g.arc(x, y, r * 0.86, 0, TAU); g.stroke();
}
/** The liquid in the pot: melted base, colour, the marble stirred in, petals. */
function liquid(g, S, x, y, r) {
  const M = S.make, melt = Math.max(M.melt, S.k === 'chop' ? 0 : 1);
  if (melt <= 0) return;
  g.save(); g.beginPath(); g.arc(x, y, r * (0.55 + 0.45 * melt), 0, TAU); g.clip();
  g.fillStyle = M.baseDrops ? C.mix('#FFF1DC', M.base, Math.min(1, M.baseDrops / 2)) : '#FFF1DC'; g.fillRect(x - r, y - r, r * 2, r * 2);
  if (S.k === 'chop' || S.k === 'color') for (let i = 0; i < 9; i++) { // the melt bubbles while it is still hot
    const a = i * 2.4 + M.t * 0.7, rr = r * (0.2 + (i % 4) * 0.18), bs = 5 + (i % 3) * 4 + Math.sin(M.t * 3 + i) * 2;
    g.fillStyle = 'rgba(255,255,255,0.75)'; g.beginPath(); g.arc(x + Math.cos(a) * rr, y + Math.sin(a) * rr, bs, 0, TAU); g.fill();
    g.strokeStyle = 'rgba(200,150,110,0.45)'; g.lineWidth = 2; g.stroke();
  }
  const k = r / POT.liquid;
  for (const b of M.blobs) { g.globalAlpha = b.swirl ? 0.85 : 0.55; g.fillStyle = b.c; g.beginPath(); g.arc(x + b.x * k, y + b.y * k, b.r * k, 0, TAU); g.fill(); }
  g.globalAlpha = 1;
  const mixd = Math.min(1, M.stir / (C.cfg().stirTurns * TAU));
  if (mixd > 0) { g.save(); g.globalAlpha = mixd; g.translate(x, y); g.rotate((M.spin || 0) * 0.5); g.drawImage(M.marble, -r * 1.2, -r * 1.2 * M.marble.height / M.marble.width, r * 2.4, r * 2.4 * M.marble.height / M.marble.width); g.restore(); }
  for (const p of M.petals) { if (p.t < 0.5) continue; const a = p.a + M.t * 0.4, px = x + Math.cos(a) * p.r * k, py = y + Math.sin(a) * p.r * k; g.save(); g.translate(px, py); g.rotate(p.rot + M.t); g.fillStyle = p.c; g.beginPath(); g.ellipse(0, 0, 11 * k, 6 * k, 0, 0, TAU); g.fill(); g.restore(); }
  const sh = g.createLinearGradient(x - r, y - r, x + r, y + r); sh.addColorStop(0, 'rgba(255,255,255,0.45)'); sh.addColorStop(0.4, 'rgba(255,255,255,0)'); sh.addColorStop(1, 'rgba(255,255,255,0.08)');
  g.fillStyle = sh; g.fillRect(x - r, y - r, r * 2, r * 2);
  g.restore();
  g.strokeStyle = 'rgba(200,150,110,0.5)'; g.lineWidth = 3; g.beginPath(); g.arc(x, y, r * (0.55 + 0.45 * melt), 0, TAU); g.stroke(); // the melt's edge
}
/** A cube of soap base: one picture made once, drawn at size s. */
function cube(g, x, y, s, a = 1) {
  if (!CUBE_IMG) { const c = document.createElement('canvas'); c.width = c.height = 100; cubeDraw(c.getContext('2d'), 46, 44, 84); CUBE_IMG = c; }
  const k = s / 84; g.globalAlpha = a; g.drawImage(CUBE_IMG, x - 46 * k, y - 44 * k, 100 * k, 100 * k); g.globalAlpha = 1;
}
function cubeDraw(g, x, y, s, a = 1) {
  g.globalAlpha = a;
  g.fillStyle = 'rgba(92,52,70,0.2)'; C.roundRect(g, x - s / 2 + 5, y - s / 2 + 8, s, s, s * 0.2); g.fill();
  const gr = g.createLinearGradient(x - s / 2, y - s / 2, x + s / 2, y + s / 2); gr.addColorStop(0, '#FFFFFF'); gr.addColorStop(1, '#E6E9F2');
  g.fillStyle = gr; C.roundRect(g, x - s / 2, y - s / 2, s, s, s * 0.2); g.fill(); g.lineWidth = 3; g.strokeStyle = 'rgba(160,170,200,0.6)'; g.stroke();
  g.fillStyle = 'rgba(255,255,255,0.9)'; C.roundRect(g, x - s * 0.34, y - s * 0.38, s * 0.4, s * 0.14, s * 0.07); g.fill();
  g.globalAlpha = 1;
}
function bottle(g, x, y, c, wob) {
  g.save(); g.translate(x, y); g.rotate(wob);
  g.fillStyle = 'rgba(92,52,70,0.2)'; g.beginPath(); g.ellipse(4, 46, 34, 10, 0, 0, TAU); g.fill();
  g.fillStyle = 'rgba(255,255,255,0.85)'; C.roundRect(g, -30, -30, 60, 76, 18); g.fill();
  g.fillStyle = c; C.roundRect(g, -25, -8, 50, 50, 14); g.fill();
  g.fillStyle = 'rgba(255,255,255,0.85)'; g.fillRect(-12, -48, 24, 20);
  g.fillStyle = C.tint(c, -0.2); C.roundRect(g, -15, -62, 30, 18, 6); g.fill();
  g.lineWidth = 3; g.strokeStyle = '#FFFFFF'; C.roundRect(g, -30, -30, 60, 76, 18); g.stroke();
  g.fillStyle = 'rgba(255,255,255,0.7)'; C.roundRect(g, -22, -22, 10, 50, 5); g.fill();
  g.restore();
}
function flower(g, x, y, sc, r) {
  for (let i = 0; i < 6; i++) { const a = i * TAU / 6; g.fillStyle = i % 2 ? sc.c : C.tint(sc.c, 0.2); g.beginPath(); g.ellipse(x + Math.cos(a) * r * 0.55, y + Math.sin(a) * r * 0.55, r * 0.45, r * 0.3, a, 0, TAU); g.fill(); }
  g.fillStyle = '#FFF3B0'; g.beginPath(); g.arc(x, y, r * 0.3, 0, TAU); g.fill(); g.lineWidth = 3; g.strokeStyle = '#FFFFFF'; g.stroke();
}
function spoon(g, x, y, ang) {
  g.save(); g.translate(x, y); g.rotate(ang + 0.6);
  g.fillStyle = 'rgba(92,52,70,0.2)'; C.roundRect(g, 6, -6, 150, 18, 9); g.fill();
  g.fillStyle = '#E7B377'; C.roundRect(g, 0, -10, 150, 18, 9); g.fill(); g.fillStyle = 'rgba(255,255,255,0.4)'; g.fillRect(10, -7, 130, 4);
  g.fillStyle = '#DDA463'; g.beginPath(); g.ellipse(-8, -1, 30, 22, 0, 0, TAU); g.fill(); g.lineWidth = 3; g.strokeStyle = '#FFFFFF'; g.stroke();
  g.restore();
}
function snowflake(g, x, y, r) {
  g.save(); g.translate(x, y); g.strokeStyle = '#FFFFFF'; g.lineCap = 'round';
  g.fillStyle = 'rgba(120,200,255,0.9)'; g.beginPath(); g.arc(0, 0, r, 0, TAU); g.fill();
  g.lineWidth = 6; for (let i = 0; i < 3; i++) { g.rotate(Math.PI / 3); g.beginPath(); g.moveTo(-r * 0.7, 0); g.lineTo(r * 0.7, 0); g.stroke(); }
  g.lineWidth = 4; g.strokeStyle = 'rgba(255,255,255,0.9)'; g.beginPath(); g.arc(0, 0, r, 0, TAU); g.stroke();
  g.restore();
}
/** The mould on the mat: a pink silicone tray around the bar's place, the liquid in it, the frost, the gauge. */
function mould(g, S, lift = 0, alpha = 1) {
  const M = S.make, b = C.cfg().bar, pad = 22;
  g.save(); g.globalAlpha = alpha; g.translate(0, lift);
  if (!MOULD_IMG) { // the silicone tray, drawn once
    const c = document.createElement('canvas'); c.width = b.w + pad * 2 + 20; c.height = b.h + pad * 2 + 24; const q = c.getContext('2d'); q.translate(pad - b.x, pad - b.y);
    q.fillStyle = 'rgba(92,52,70,0.22)'; C.roundRect(q, b.x - pad + 8, b.y - pad + 14, b.w + pad * 2, b.h + pad * 2, b.r + pad); q.fill();
    const gr = q.createLinearGradient(b.x - pad, b.y - pad, b.x + b.w + pad, b.y + b.h + pad); gr.addColorStop(0, '#FFB7D5'); gr.addColorStop(1, '#F27BB0');
    q.fillStyle = gr; C.roundRect(q, b.x - pad, b.y - pad, b.w + pad * 2, b.h + pad * 2, b.r + pad); q.fill(); q.lineWidth = 5; q.strokeStyle = '#FFFFFF'; q.stroke();
    q.fillStyle = '#E2669F'; C.roundRect(q, b.x, b.y, b.w, b.h, b.r); q.fill(); // the cavity
    q.fillStyle = 'rgba(255,255,255,0.35)'; C.roundRect(q, b.x - pad + 14, b.y - pad + 6, b.w + pad * 2 - 28, 8, 4); q.fill();
    MOULD_IMG = c;
  }
  g.drawImage(MOULD_IMG, b.x - pad, b.y - pad);
  const level = S.k === 'pour' ? M.level : 1;
  if (level > 0) {
    g.save(); C.roundRect(g, b.x, b.y, b.w, b.h, b.r); g.clip();
    const px = b.x + b.w * 0.62, py = b.y + b.h * 0.35, R = Math.hypot(b.w, b.h) * fillShare(level);
    g.beginPath(); g.arc(px, py, R, 0, TAU); g.clip();
    g.drawImage(M.marble, b.x, b.y);
    const wet = S.k === 'cool' ? 1 - M.cool : S.k === 'pop' ? 0 : 1;
    if (wet > 0) { const sh = g.createLinearGradient(b.x, b.y, b.x + b.w, b.y + b.h); sh.addColorStop(0, `rgba(255,255,255,${0.55 * wet})`); sh.addColorStop(0.35, 'rgba(255,255,255,0)'); sh.addColorStop(0.7, `rgba(255,255,255,${0.2 * wet})`); sh.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = sh; g.fillRect(b.x, b.y, b.w, b.h); }
    if (S.k === 'cool' || S.k === 'pop') { g.fillStyle = `rgba(225,245,255,${0.28 * (S.k === 'pop' ? 1 : M.cool)})`; g.fillRect(b.x, b.y, b.w, b.h); }
    g.restore();
  }
  g.restore();
}
function gauge(g, S) {
  const M = S.make, b = C.cfg().bar, cfg = C.cfg(), x = C.mx(b.x - 56, 30) + (M.lowT > 0 ? Math.sin(M.lowT * 50) * 6 : 0), y0 = b.y + 20, h = b.h - 40;
  g.fillStyle = 'rgba(255,255,255,0.9)'; C.roundRect(g, x, y0, 30, h, 15); g.fill(); g.lineWidth = 4; g.strokeStyle = '#FFFFFF'; g.stroke();
  g.fillStyle = M.lowT > 0 && Math.sin(M.lowT * 20) > 0 ? 'rgba(59,209,111,0.95)' : 'rgba(59,209,111,0.45)'; g.fillRect(x + 3, y0 + h * (1 - cfg.pourHi), 24, h * (cfg.pourHi - cfg.pourLo)); // the target band
  g.fillStyle = M.level > cfg.pourHi ? '#FF5F7E' : M.base; const lv = Math.min(1, M.level); C.roundRect(g, x + 5, y0 + h * (1 - lv), 20, h * lv, 10); g.fill();
  g.strokeStyle = '#2FAE5C'; g.lineWidth = 4; for (const v of [cfg.pourLo, cfg.pourHi]) { g.beginPath(); g.moveTo(x - 8, y0 + h * (1 - v)); g.lineTo(x + 38, y0 + h * (1 - v)); g.stroke(); }
}
/** Everything of the making steps under the HUD. */
export function drawMake(g, S) {
  const M = S.make, k = S.k, b = C.cfg().bar;
  if (k === 'chop' || k === 'color' || k === 'stir' || k === 'scent') {
    potBody(g, POT.x, POT.y, POT.r); liquid(g, S, POT.x, POT.y, POT.liquid);
    for (const bt of M.bits) { if (bt.in) continue; const t = Math.max(0, bt.t / 0.45), x = bt.sx + (bt.tx - bt.sx) * t, y = bt.sy + (bt.ty - bt.sy) * t - Math.sin(t * Math.PI) * 160; cube(g, x, y, bt.s * (1 - t * 0.3)); }
    for (const f of M.fall) { if (f.in) continue; const t = Math.min(1, f.t / 0.4), y = f.y + 260 * t * t; g.fillStyle = f.c; g.beginPath(); g.ellipse(f.x, y, 14, 18, 0, 0, TAU); g.fill(); g.fillStyle = 'rgba(255,255,255,0.7)'; g.beginPath(); g.arc(f.x - 4, y - 6, 4, 0, TAU); g.fill(); }
    for (const p of M.petals) { if (p.t >= 0.5 || p.t < 0) continue; const t = p.t / 0.5, x = p.sx + (POT.x + Math.cos(p.a) * p.r - p.sx) * t, y = p.sy + (POT.y + Math.sin(p.a) * p.r - p.sy) * t - Math.sin(t * Math.PI) * 120; g.fillStyle = p.c; g.beginPath(); g.ellipse(x, y, 11, 6, p.rot, 0, TAU); g.fill(); }
  } else {
    const lift = k === 'pop' && M.popT >= 0 ? -ease(M.popT / 0.5) * 120 : 0, a = k === 'pop' && M.popT >= 0 ? 1 - ease(M.popT / 0.5) : 1;
    if (k === 'pop' && M.popT >= 0) { const sq = 1 + Math.sin(Math.min(1, M.popT / 0.5) * Math.PI) * 0.06; g.save(); g.translate(b.x + b.w / 2, b.y + b.h); g.scale(1 / sq, sq); g.translate(-(b.x + b.w / 2), -(b.y + b.h)); g.drawImage(S.soap.canvas, b.x - C.cfg().margin, b.y - C.cfg().margin); g.restore(); }
    mould(g, S, lift, a);
    if (k === 'pour') {
      const pm = ease(M.move), px = POT.x + (potSide().x - POT.x) * pm, py = POT.y + (POT_SIDE.y - POT.y) * pm, pr = POT.r + (POT_SIDE.r - POT.r) * pm;
      if (M.pouring) { // the stream from the pot's lip to the mould
        const sx = px + (C.mx(0) > 0 ? pr * 0.7 : -pr * 0.7), sy = py + pr * 0.2, tx = b.x + b.w * 0.62, ty = b.y + b.h * 0.35;
        g.lineCap = 'round'; g.strokeStyle = M.base; g.lineWidth = 22; g.beginPath(); g.moveTo(sx, sy); g.quadraticCurveTo((sx + tx) / 2, sy - 30 + Math.sin(M.t * 20) * 6, tx, ty); g.stroke();
        g.strokeStyle = 'rgba(255,255,255,0.5)'; g.lineWidth = 6; g.stroke();
      }
      potBody(g, px, py, pr); liquid(g, S, px, py, pr * POT.liquid / POT.r);
      gauge(g, S);
      if (M.spillT > 0) for (let i = 0; i < 6; i++) { g.fillStyle = M.base; g.beginPath(); g.arc(b.x + b.w / 2 + Math.cos(i) * (b.w * 0.55 + (0.6 - M.spillT) * 80), b.y + b.h / 2 + Math.sin(i) * (b.h * 0.55), 10, 0, TAU); g.fill(); }
    }
  }
}
/** The tray of the step: cubes, bottles or flowers. Drawn over the tray panel. */
export function drawMakeTray(g, S) {
  const M = S.make, k = S.k;
  if (k === 'chop') { const n = M.cubes.length; for (const c of M.cubes) if (!c.cut) { const [x, y] = cubeXY(c.j, n); cube(g, x, y, 84); } }
  if (k === 'color') for (const j of [0, 1]) { const [x, y] = bottleXY(j); bottle(g, x, y, j ? M.swirl : M.base, Math.sin(M.t * 3 + j) * 0.05); }
  if (k === 'scent') for (let j = 0; j < 3; j++) { const [x, y] = flowerXY(j); if (M.scent === j) { g.fillStyle = 'rgba(255,95,162,0.25)'; g.beginPath(); g.arc(x, y, 56, 0, TAU); g.fill(); } flower(g, x, y, SCENTS[j], 44); }
}
/** The tool under the finger: spoon, snowflake. */
export function drawMakeTool(g, S, x, y) {
  if (S.k === 'stir') spoon(g, x, y, Math.atan2(y - POT.y, x - POT.x));
  else if (S.k === 'cool') snowflake(g, x, y, 34);
}
/** Where the helper hand acts out the step. */
export function makeHand(S, t) {
  const M = S.make, k = S.k, b = C.cfg().bar;
  if (k === 'chop') { const c = M.cubes.find((q) => !q.cut); return c ? cubeXY(c.j, M.cubes.length) : [360, 994]; }
  if (k === 'color') return bottleXY(M.baseDrops < 2 ? 0 : 1);
  if (k === 'stir') return [POT.x + Math.cos(t * TAU) * 90, POT.y + Math.sin(t * TAU) * 90];
  if (k === 'scent') return flowerXY(1);
  if (k === 'pour') return [b.x + b.w * 0.5, b.y + b.h * 0.5];
  if (k === 'cool') return [b.x + b.w * (0.3 + 0.4 * Math.abs(Math.sin(t * Math.PI))), b.y + b.h * 0.5 + Math.sin(t * TAU * 2) * 40];
  return [b.x + b.w / 2, b.y + b.h * 0.3 + ease(t) * 160];
}
/** The perfect-pour banner time, or -1. */
export const perfectAge = (S) => (S.make && S.make.perfectT !== undefined ? S.make.perfectT : -1);
