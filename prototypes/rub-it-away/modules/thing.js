/* Rub It Away Thing: one picture on the stage with its idle motion, kick effects (hop, shake, wobble, spin, swing, shiver), its own erase mask and coverage grid, and the reveal sprite plus speech bubble of a decoy reaction. */
import { sprite, isReal } from './assets.js';
import * as AU from './audio.js';
import { clamp, ease, rr, fillStroke, label, fitSize, INK, STAGE, FONT, COL, hash } from './util.js';

const CELL = 10;
export const BRUSH = 46;
// RUB PACE: the eraser of a TARGET grows with the size of the thing (big things get a wider brush: BRUSH * clamp((w * h / SIZE0) ^ POW, 1, KMAX)); a target never finishes before MIN_T s of rubbing and MIN_LEN px of finger travel (a slow child at 300 px/s needs 1.9 s, a quick one 1.2 s)
export const RB = { size0: 55000, pow: 1.2, kmax: 3.6 }, MIN_T = 1.2, MIN_LEN = 560, SLOW = 300;
export const REGROW = { wait: 1.2, dur: 0.4 };   // a decoy rubbed only partly grows back: 1.2 s after the last rub the erased area refills over 0.4 s (no error, no star lost)
export const MINW = 100;                          // a thin decoy (opaque width under MINW px) gets a wider brush so a normal rub still triggers it
export const CLUE = { at: 2.5, every: 3.5, len: 0.5 };   // fair clue of a hiding spot: first tell 2.5 s after the level opens, then every 3.5 s, 0.5 s long

export const WHEEL = { ids: ['wheel_rim', 'wheel_cabins', 'wheel_stand'], pic: [924, 1024], hub: [462, 441.7], rCab: 385, cell: [150, 162], stand: [156, 491] };   // geometry printed by tools/wheel_parts.py

export class Thing {
  constructor(d) {
    this.d = d; this.id = d.id; this.role = d.role; this.x = d.x; this.y = d.y; this.w = d.w; this.ay = d.ay == null ? 0.5 : d.ay;
    this.asset = d.asset; this.seed = hash(d.id + d.asset) % 100 / 10; this.state = 'alive';
    this.wheelA = 0; this.wp = null; this.popT = 9; this.enterT = 9; this.fixT = -1; this.kick = null; this.react = null; this.rev = null; this.cluster = null;
    // idle life 2.0: a decoy or target with no idle of its own breathes and twitches now and then; fl = flinch of the main actor; rub* = finger wobble; melt = finish magnet; fmT = fixMove clamped to stay in view
    this.noIdle = !d.idle || Object.keys(d.idle).length === 0; this.fl = null; this.rubAt = -9; this.rubDx = 0; this.rubDy = 0; this.melt = -1; this.meltDur = 0.3; this.rubSec = 0; this.rubLen = 0; this.mag = 0; this.fmT = null; this.rb = BRUSH;
    this.build();
  }

  build() {
    let sp = sprite(this.asset, this.cluster ? this.cluster.fw : this.w, this.d.ar);
    if (this.cluster) {
      // n equal copies of one picture side by side (level 18: three equal flies); each is drawn on its own in draw()
      const k = this.cluster, cc = document.createElement('canvas');
      cc.width = Math.ceil(k.fw + (k.n - 1) * k.gap); cc.height = Math.ceil(sp.h);
      const cg = cc.getContext('2d');
      for (let i = 0; i < k.n; i++) cg.drawImage(sp.src, i * k.gap, 0, k.fw, sp.h);
      this.w = cc.width; sp = { src: cc, w: cc.width, h: cc.height, real: sp.real };
    }
    this.rubSec = 0; this.rubLen = 0; this.sp = sp; this.h = sp.h; this.mask = null; this.hit = 0; this.total = 1; this.hole = null; this.off = null;
    if (this.d.show === 'peek') { const oc = document.createElement('canvas'); oc.width = Math.ceil(this.w); oc.height = Math.ceil(this.h); this.off = oc; this.og = oc.getContext('2d'); }
    if (!this.d.erasable) return;
    const c = document.createElement('canvas');
    c.width = Math.ceil(this.w); c.height = Math.ceil(this.h);
    const m = c.getContext('2d');
    m.drawImage(sp.src, 0, 0, c.width, c.height);
    this.mask = c; this.mg = m;
    if (this.role === 'target') { const hc = document.createElement('canvas'); hc.width = c.width; hc.height = c.height; this.hole = hc; this.hg = hc.getContext('2d'); this.hg.strokeStyle = '#fff'; this.hg.lineCap = this.hg.lineJoin = 'round'; }
    this.cols = Math.ceil(c.width / CELL); this.rows = Math.ceil(c.height / CELL);
    this.cov = new Uint8Array(this.cols * this.rows); this.opq = new Uint8Array(this.cols * this.rows);
    let data = null;
    try { data = m.getImageData(0, 0, c.width, c.height).data; } catch (e) { data = null; }
    let total = 0;
    for (let j = 0; j < this.rows; j++) {
      for (let i = 0; i < this.cols; i++) {
        let on = 0;
        if (data) {
          let n = 0, k = 0;
          for (let y = j * CELL; y < Math.min(c.height, (j + 1) * CELL); y += 2) for (let x = i * CELL; x < Math.min(c.width, (i + 1) * CELL); x += 2) { k++; if (data[(y * c.width + x) * 4 + 3] > 40) n++; }
          on = k && n / k > 0.3 ? 1 : 0;
        } else {
          const nx = ((i + 0.5) * CELL - c.width / 2) / (c.width / 2), ny = ((j + 0.5) * CELL - c.height / 2) / (c.height / 2);
          on = nx * nx + ny * ny < 0.8 ? 1 : 0;
        }
        this.opq[j * this.cols + i] = on; total += on;
      }
    }
    this.total = Math.max(1, total);
    // a target's brush grows with its size so a slow rub finishes every thing in about 2 to 3.5 s; decoys keep the plain brush (a light brush stays fair)
    this.rb = this.role === 'target' ? BRUSH * clamp(Math.pow(this.w * this.h / RB.size0, RB.pow), 1, RB.kmax) : BRUSH;
    if (this.role !== 'target') {
      let c0 = this.cols, c1 = -1;
      for (let i = 0; i < this.cols; i++) for (let j = 0; j < this.rows; j++) if (this.opq[j * this.cols + i]) { if (i < c0) c0 = i; if (i > c1) c1 = i; }
      this.ow = c1 < c0 ? this.w : (c1 - c0 + 1) * CELL;
      this.rb = BRUSH * clamp(MINW / Math.max(1, this.ow), 1, 1.5);
    }
  }

  // PARTLY RUBBED DECOY GROWS BACK: 1.2 s after the last rub the erased area refills (the full sticker fades back over 0.4 s with a small wobble); nothing is counted
  maybeRegrow(lv) {
    if (this.rg) { this.rg.t += lv.dtNow; if (this.rg.t >= REGROW.dur) this.rg = null; return; }
    if (this.role === 'target' || !this.mask || this.state !== 'alive' || this.melt >= 0 || this.hit <= 0 || lv.t - this.rubAt < REGROW.wait) return;
    const old = document.createElement('canvas'); old.width = this.mask.width; old.height = this.mask.height;
    old.getContext('2d').drawImage(this.mask, 0, 0);
    this.mg.clearRect(0, 0, this.mask.width, this.mask.height); this.mg.drawImage(this.sp.src, 0, 0, this.mask.width, this.mask.height);
    this.cov.fill(0); this.hit = 0; this.mag = 0; this.rubSec = 0; this.rubLen = 0;
    this.rg = { t: 0, old }; this.bump('wobble', 0.5);
    const c = this.center(lv.t); lv.fx.puff(c.x, c.y, 4, '#ffffff', 160);
  }

  // seconds of rubbing still owed before a target may finish: at least MIN_T of rubbing and MIN_LEN px of finger travel (read at the slow child's SLOW px/s)
  holdLeft() { return this.role === 'target' ? Math.max(MIN_T - this.rubSec, (MIN_LEN - this.rubLen) / SLOW) : 0; }

  progress() { const p = this.mask ? this.hit / this.total : 0; return this.melt > 0 ? p + (1 - p) * this.melt : p; }

  motion(t) {
    if (this.reducedMotion) t = 0;
    const i = this.d.idle || {};
    let dx = 0, dy = 0, rot = 0, sx = 1, sy = 1;
    const s = this.seed;
    if (i.bob) dy += Math.sin(t * i.bob[1] + s) * i.bob[0];
    if (i.sway) rot += Math.sin(t * i.sway[1] + s) * i.sway[0];
    if (i.orbit) { const a = t * i.orbit[1] + s; dx += Math.cos(a) * i.orbit[0]; dy += Math.sin(a * 1.3) * i.orbit[2]; }
    if (i.breathe) { const b = Math.sin(t * i.breathe[1] + s) * i.breathe[0]; sx += b; sy -= b; }
    if (i.jitter) { dx += Math.sin(t * 37 + s) * i.jitter; dy += Math.cos(t * 41 + s) * i.jitter; }
    if (this.noIdle && this.role !== 'actor') {
      const b = Math.sin(t * 1.9 + s) * 0.012; sx += b; sy -= b;
      const per = 4.6 + (s % 3), tp = (t + s * 3.1) % per;
      if (tp < 0.3 && this.state === 'alive') { const u = tp / 0.3, q = Math.sin(u * Math.PI); rot += Math.sin(u * Math.PI * 3) * 0.035 * (1 - u); dy -= q * 5; sx += q * 0.025; sy -= q * 0.025; }
    }
    const cu = this.clueAt(t);
    if (cu >= 0) { const q = Math.sin(Math.PI * cu); rot += Math.sin(cu * Math.PI * 6) * 0.07 * q; dy -= q * 14; sx += q * 0.04; sy -= q * 0.04; }
    if (this.rubAt > t - 0.14 && this.state === 'alive') {
      // the rubbed thing wobbles under the finger and leans along the rub direction
      const w = 1 - (t - this.rubAt) / 0.14;
      dx += (Math.sin(t * 52) * 1.6 + this.rubDx * 3) * w; dy += this.rubDy * 3 * w; rot += Math.sin(t * 41) * 0.012 * w; sx += Math.sin(t * 47) * 0.008 * w;
    }
    const dl = this.d.afterDelay || 0, ft = this.fixT - dl;
    if (this.d.mood === 'sad' && ft < 0) { dx += Math.sin(t * 29 + s) * 1.6; rot += Math.sin(t * 17 + s) * 0.006; }
    if (ft >= 0 && this.role === 'actor' && !this.d.fall) {
      // payoff squash and stretch: anticipation squat (0-0.1 s), launch stretch (to 0.3 s), damped overshoot that has settled by 1.2 s
      let ax, ay;
      if (ft < 0.1) { const u = ft / 0.1; ax = 1 + 0.12 * u * u; ay = 1 - 0.14 * u * u; }
      else if (ft < 0.3) { const u = ease.out((ft - 0.1) / 0.2); ax = 1.12 - 0.24 * u; ay = 0.86 + 0.36 * u; }
      else { const u = ft - 0.3, e = Math.exp(-5.5 * u) * Math.cos(u * 17); ax = 1 - 0.12 * e; ay = 1 + 0.22 * e; }
      sx *= ax; sy *= ay;
      if (this.d.main) dy += this.h * (1 - this.ay) * (1 - ay);
      if (this.d.main && !this.d.steady && ft > 0.9) rot += Math.sin(t * 3.2) * 0.06;
      const fm = this.fmT || this.d.fixMove;
      if (fm) { const m = ease.out(clamp(this.fixT / 1.3)); dx += (fm.dx || 0) * m; dy += (fm.dy || 0) * m; if (fm.walk && this.fixT < 1.3) { const q = Math.abs(Math.sin(this.fixT * 13)); dy -= q * 14 * (1 - m * 0.5); rot += Math.sin(this.fixT * 13) * 0.05; } }
    }
    const k = this.kick;
    if (k) {
      const u = clamp(k.t / k.dur);
      if (k.type === 'hop') { const q = Math.abs(Math.sin(u * Math.PI * 2)); dy -= q * 60 * (1 - u * 0.4); const sq = (1 - q) * 0.14 * (1 - u); sx += sq; sy -= sq; }
      else if (k.type === 'shake') { rot += Math.sin(u * 40) * 0.14 * (1 - u); dx += Math.sin(u * 50) * 8 * (1 - u); }
      else if (k.type === 'wobble') { const b = Math.sin(u * 18) * 0.14 * (1 - u); sx += b; sy -= b; }
      else if (k.type === 'tip') rot += Math.sin(Math.min(1, u * 1.6) * Math.PI) * 1.2;
      else if (k.type === 'spin') rot += ease.out(u) * Math.PI * 2;
      else if (k.type === 'swing') { rot += Math.sin(u * 14) * 0.2 * (1 - u); dy += Math.sin(Math.PI * Math.min(1, u * 3)) * 30; }
      else if (k.type === 'shiver') { dx += Math.sin(k.t * 60) * 5 * (1 - u); rot += Math.sin(k.t * 50) * 0.03 * (1 - u); }
    }
    const f = this.fl;
    if (f) {
      // the main actor's flinch at a wrong rub (0.6 s): startle hop, head shake wobble, lean away
      const u = clamp(f.t / f.dur), q = Math.sin(Math.PI * u);
      if (f.type === 'startle') { dy -= q * 34; sx -= q * 0.09; sy += q * 0.12; }
      else if (f.type === 'headshake') { rot += Math.sin(u * 38) * 0.12 * (1 - u); sx += Math.sin(u * 30) * 0.03 * (1 - u); }
      else if (f.type === 'lean') { const l = Math.sin(Math.PI * Math.min(1, u * 1.15)); rot += f.dir * l * 0.17; dx += f.dir * l * 16; }
      else if (f.type === 'giggle') { rot += Math.sin(u * 34) * 0.07 * (1 - u); const b = Math.sin(u * 26) * 0.06 * (1 - u); sx += b; sy -= b; dy -= Math.abs(Math.sin(u * 17)) * 9 * (1 - u); }
    }
    if (this.enterT < 0.8) dy += (1 - ease.out(this.enterT / 0.8)) * 520;
    return { dx, dy, rot, sx, sy };
  }

  // CLUE: only the right hiding spot (d.clue = 'heart' | 'zzz' | 'sparkle' | 'dust') tells: a wiggle and a small hint glyph above it; returns 0..1 inside the 0.5 s tell window, else -1; silent while it is being rubbed
  clueAt(t) {
    if (!this.d.clue || this.state !== 'alive' || this.hit > 0 || t - this.rubAt < 1.5 || t < CLUE.at) return -1;
    const u = (t - CLUE.at) % CLUE.every;
    return u < CLUE.len ? u / CLUE.len : -1;
  }

  drawClue(g, t) {
    const cu = this.clueAt(t);
    if (cu < 0) return;
    this.clueN = (this.clueN || 0) + 1;
    const m = this.motion(t), q = Math.sin(Math.PI * cu), kind = this.d.clue;
    g.save(); g.translate(this.x + m.dx, this.y + m.dy - this.h * this.ay - 16 - cu * 24); g.globalAlpha = Math.min(1, q * 2.2); g.lineJoin = g.lineCap = 'round';
    const s = 1 + 0.3 * q;
    if (kind === 'heart') {
      for (const [hx, hy, k] of [[-14, 6, 1], [20, -12, 0.7]]) {
        g.save(); g.translate(hx, hy); g.scale(s * k, s * k); g.beginPath(); g.moveTo(0, 22); g.bezierCurveTo(-34, -2, -20, -26, 0, -10); g.bezierCurveTo(20, -26, 34, -2, 0, 22); g.closePath(); g.lineWidth = 18; g.lineJoin = 'round'; g.strokeStyle = '#ffffff'; g.stroke(); fillStroke(g, COL.red, 6); g.restore();
      }
    } else if (kind === 'zzz') {
      [[-26, 8, 15], [2, -8, 20], [32, -28, 26]].forEach(([zx, zy, r]) => {
        g.beginPath(); g.moveTo(zx - r * 0.6, zy - r * 0.6); g.lineTo(zx + r * 0.6, zy - r * 0.6); g.lineTo(zx - r * 0.6, zy + r * 0.6); g.lineTo(zx + r * 0.6, zy + r * 0.6);
        g.lineWidth = 25; g.strokeStyle = '#ffffff'; g.stroke(); g.lineWidth = 15; g.strokeStyle = INK; g.stroke(); g.lineWidth = 8; g.strokeStyle = COL.blue; g.stroke();
      });
    } else if (kind === 'sparkle') {
      [[-34, 12, 19], [4, -14, 28], [40, 10, 17]].forEach(([sx0, sy0, r], i) => {
        const w = 1 + 0.25 * Math.sin(t * 22 + i * 2);
        g.save(); g.translate(sx0, sy0); g.scale(w, w); g.beginPath();
        g.moveTo(0, -r); g.lineTo(r * 0.3, -r * 0.3); g.lineTo(r, 0); g.lineTo(r * 0.3, r * 0.3); g.lineTo(0, r); g.lineTo(-r * 0.3, r * 0.3); g.lineTo(-r, 0); g.lineTo(-r * 0.3, -r * 0.3); g.closePath(); g.lineWidth = 15; g.lineJoin = 'round'; g.strokeStyle = '#ffffff'; g.stroke(); fillStroke(g, COL.gold, 5); g.restore();
      });
    } else {
      // dust shaken off the spot: five little puffs flying out to both sides in its own crumb colour
      for (let i = 0; i < 5; i++) {
        const sd = i % 2 ? 1 : -1, k = 0.3 + 0.7 * ((i * 0.37 + cu) % 1), x = sd * (20 + i * 11 + k * 26), y = 56 - i * 4 - k * 14;
        g.beginPath(); g.arc(x, y, 10 + (i % 3) * 4, 0, 7); fillStroke(g, this.d.crumb || COL.gold, 5);
      }
    }
    g.restore();
  }

  update(dt, lv) {
    if (this.fl) { this.fl.t += dt; if (this.fl.t >= this.fl.dur) this.fl = null; }
    if (this.melt >= 0 && this.melt < 1) this.melt = Math.min(1, this.melt + dt / this.meltDur);
    if (this.mask && lv.t - this.rubAt < 0.1) this.rubSec += dt;
    if (this.kick) { this.kick.t += dt; if (this.kick.t >= this.kick.dur) this.kick = null; }
    if (this.popT < 9) this.popT += dt;
    if (this.enterT < 9) this.enterT += dt;
    if (this.fixT >= 0) this.fixT += dt;
    if (this.d.wheel && this.fixT >= 0 && this.d.spinSec > 0 && !this.reducedMotion) this.wheelA += dt * (Math.PI * 2 / this.d.spinSec) * ease.out(clamp(this.fixT / 1.5));   // reduced-motion keeps decorative scenery still
    if (this.exit) this.exit.t += dt;
    lv.dtNow = dt; this.maybeRegrow(lv);
    if (this.d.show === 'fix' && this.waitHop && this.popT >= 0) { this.waitHop = false; this.bump('hop', 0.8); lv.fx.spark(this.x, this.y - this.h * 0.6, 12); AU.sfx('plop'); }
    const fw = this.d.fixMove;
    if (fw && fw.walk && !this.cheered && this.fixT >= 1.3) { this.cheered = true; this.bump('hop', 0.8); lv.fx.spark(this.x + (this.fmT || fw).dx, this.y - this.h * 0.8, 10); lv.fx.confetti(this.x + (this.fmT || fw).dx, this.y - this.h, 24); AU.sfx('pop'); }
    if (this.pend && this.fixT >= (this.d.afterDelay || 0)) {
      // delayed after-picture: the sad actor waits until the thing that fixes it has arrived (level 23: the cone lands in the child's hand)
      this.pend = false; this.asset = this.d.after; this.w = this.d.afterW || this.w; this.build();
      this.bump('hop', 0.8); lv.fx.spark(this.x, this.y - this.h * 0.6, 14); lv.fx.puff(this.x, this.y - this.h * 0.5, 6, '#ffffff', 260);
    }
    if (this.react) { this.react.t += dt; if (this.react.t >= 1.5) lv.regrow(this); }
  }

  bump(type, dur = 0.9) { this.kick = { type, t: 0, dur }; }

  flinch(type, dir = 1, dur = 0.6) { this.fl = { type, t: 0, dur, dir }; }

  contains(p, t) {
    const m = this.motion(t);
    const x = this.x + m.dx - this.w / 2, y = this.y + m.dy - this.h * this.ay;
    return p.x >= x && p.x <= x + this.w && p.y >= y && p.y <= y + this.h;
  }

  center(t) { const m = this.motion(t); return { x: this.x + m.dx, y: this.y + m.dy - this.h * (this.ay - 0.5) }; }

  scrub(a, b, t) {
    if (!this.mask || this.state !== 'alive' || this.popT < 0.3 || this.enterT < 0.8) return false;
    const m = this.motion(t), r = this.rb;
    const ox = this.x + m.dx - this.w / 2, oy = this.y + m.dy - this.h * this.ay;
    const ax = a.x - ox, ay = a.y - oy, bx = b.x - ox, by = b.y - oy;
    if (Math.max(ax, bx) < -r || Math.min(ax, bx) > this.w + r || Math.max(ay, by) < -r || Math.min(ay, by) > this.h + r) return false;
    this.rg = null; this.rubAt = t; this.rubLen += Math.hypot(bx - ax, by - ay);
    const g = this.mg;
    g.globalCompositeOperation = 'destination-out'; g.lineCap = g.lineJoin = 'round'; g.lineWidth = r * 2;
    g.beginPath(); g.moveTo(ax, ay); g.lineTo(bx, by); g.stroke(); g.globalCompositeOperation = 'source-over';
    if (this.hg) { const h = this.hg; h.lineWidth = r * 2; h.beginPath(); h.moveTo(ax, ay); h.lineTo(bx, by); h.stroke(); }
    const dx = bx - ax, dy = by - ay, len2 = dx * dx + dy * dy || 1, rr2 = r * 0.85 * r * 0.85;
    const i0 = Math.max(0, Math.floor((Math.min(ax, bx) - r) / CELL)), i1 = Math.min(this.cols - 1, Math.floor((Math.max(ax, bx) + r) / CELL));
    const j0 = Math.max(0, Math.floor((Math.min(ay, by) - r) / CELL)), j1 = Math.min(this.rows - 1, Math.floor((Math.max(ay, by) + r) / CELL));
    for (let j = j0; j <= j1; j++) {
      for (let i = i0; i <= i1; i++) {
        const k = j * this.cols + i;
        if (this.cov[k]) continue;
        const cx = (i + 0.5) * CELL, cy = (j + 0.5) * CELL;
        const u = clamp(((cx - ax) * dx + (cy - ay) * dy) / len2);
        const px = ax + dx * u - cx, py = ay + dy * u - cy;
        if (px * px + py * py <= rr2) { this.cov[k] = 1; if (this.opq[k]) this.hit++; }
      }
    }
    return true;
  }

  // EXIT 'topple': when the target is gone its full sticker comes back for a beat, tips over about its lower right corner, bounces with a clatter (three pops at three pitches) and slides out
  drawExit(g, lv) {
    const e = this.exit, tt = e.t;
    if (tt >= 1.95) { e.done = true; return; }
    const MAX = 1.45;
    let rot = 0, a = 1, sc = 1, sl = 0;
    if (tt < 0.35) { const u = tt / 0.35; sc = 0.9 + 0.1 * ease.back(Math.min(1, u * 2)); rot = Math.sin(u * 22) * 0.05 * u; }
    else if (tt < 0.95) { const u = (tt - 0.35) / 0.6; rot = MAX * u * u; }
    else if (tt < 1.3) rot = MAX - 0.28 * Math.sin(Math.PI * (tt - 0.95) / 0.35);
    else if (tt < 1.5) rot = MAX - 0.09 * Math.sin(Math.PI * (tt - 1.3) / 0.2);
    else { rot = MAX; sl = (tt - 1.5) / 0.45; a = 1 - sl; }
    if (!e.maxRot || rot > e.maxRot) e.maxRot = rot;
    [[0.95, 0.75], [1.3, 1], [1.5, 1.35]].forEach(([at, r], i) => { if (!e['c' + i] && tt >= at) { e['c' + i] = 1; AU.sfx('pop', r); const c = this.center(lv.t); lv.fx.puff(this.x + this.w * 0.5 + 40 * i, this.y, 4, '#e9e2d0', 220); lv.fx.spark(c.x + this.w * 0.5, this.y - 10, 6); } });
    g.save(); g.globalAlpha = a; g.translate(this.x + this.w / 2 + sl * 90, this.y + this.h * (1 - this.ay)); g.rotate(rot); g.scale(sc, sc);
    g.drawImage(this.sp.src, -this.w, -this.h, this.w, this.h); g.restore();
  }

  draw(g, t, lv) {
    if (this.exit && lv.fixed) { if (!this.exit.done) this.drawExit(g, lv); return; }
    if (this.state !== 'alive' && this.state !== 'static') return;
    const d = this.d;
    if (d.show === 'fix' && this.popT < 0) return;
    if ((d.show === 'fix' && !lv.fixed) || (d.hideOnFix && lv.fixed)) return;
    const m = this.motion(t), motionT = this.reducedMotion ? 0 : t;
    if (d.fall) {
      // a thing that drops in from another place (the ice cream from the gull to the child's hand) and is gone when it lands
      const f = clamp(this.fixT / d.fall.dur);
      if (f >= 1) return;
      m.dx += (1 - f * f) * d.fall.dx; m.dy += (1 - f * f) * d.fall.dy; m.rot += (1 - f) * 0.6;
    }
    let s = 1;
    if (this.popT < 0.45) s *= Math.max(0.02, ease.back(this.popT / 0.45));
    if (this.melt > 0) s *= 1 - 0.1 * this.melt;
    if (d.show === 'peek' && !lv.fixed && d.peekScale) s *= d.peekScale + (1 - d.peekScale) * lv.progress();
    g.save();
    if (this.melt > 0) g.globalAlpha = 1 - ease.out(this.melt) * 0.9;
    g.translate(this.x + m.dx, this.y + m.dy); g.rotate(m.rot); g.scale(m.sx * s * (d.flip && this.asset === d.asset ? -1 : 1), m.sy * s);
    if (d.swing && lv.fixed) { const k = 1 - 0.86 * ease.out(clamp(this.fixT / 0.7)); g.translate(-this.w / 2, 0); g.scale(k, 1); g.translate(this.w / 2, 0); }   // a gate leaf swings open: squeezed toward its hinge side
    if (this.cluster) {
      const k = this.cluster, src = this.peekSrc(lv);
      for (let i = 0; i < k.n; i++) {
        // out of phase buzz: every copy bobs and drifts on its own beat
        const bx = Math.cos(motionT * 7 + i * 2.1) * 3, by = Math.sin(motionT * 9 + i * 1.7) * 4;
        g.drawImage(src, i * k.gap, 0, k.fw, this.h, -this.w / 2 + i * k.gap + bx, -this.h * this.ay + by, k.fw, this.h);
      }
    } else if (d.turns && lv.fixed && this.fixT > 0.5) {
      // the friends hop in turns: the picture is cut into its three animals (with a small overlap) and each hops on its own beat
      const src = this.peekSrc(lv), n = d.turns, sw = src.width / n, ov = 6;
      for (let i = 0; i < n; i++) {
        const u = ((this.fixT - 0.5 - i * 0.32) % (0.32 * n + 0.5)), q = u >= 0 && u < 0.5 ? Math.abs(Math.sin(u / 0.5 * Math.PI)) : 0;
        const x0 = Math.max(0, i * sw - ov), x1 = Math.min(src.width, (i + 1) * sw + ov);
        g.drawImage(src, x0, 0, x1 - x0, src.height, -this.w / 2 + x0 / src.width * this.w, -this.h * this.ay - q * 40, (x1 - x0) / src.width * this.w, this.h);
      }
    } else if (d.wheel && lv.fixed && this.asset === d.after && WHEEL.ids.every(isReal)) {
      this.drawWheel(g);
    } else {
      if (d.rim && this.state === 'alive' && !lv.fixed) this.drawRim(g, lv);
      if (this.rg) { g.drawImage(this.rg.old, -this.w / 2, -this.h * this.ay, this.w, this.h); g.globalAlpha *= ease.out(clamp(this.rg.t / REGROW.dur)); }
      g.drawImage(this.peekSrc(lv), -this.w / 2, -this.h * this.ay, this.w, this.h);
    }
    g.restore();
  }

  // the lit big wheel (level 53) from its parts: rim + spokes + hub turn about the hub, the 8 cabins ride the rim and stay upright, the stand does not move and stays in front. Numbers are picture pixels (924 wide, built by tools/wheel_parts.py); this.wp keeps the pose of the last frame for the play proof.
  drawWheel(g) {
    const k = this.w / WHEEL.pic[0], ox = -this.w / 2, oy = -this.h * this.ay, a = this.wheelA, d = this.d;
    const [hx, hy] = WHEEL.hub, [rim, cab, st] = WHEEL.ids.map((id) => sprite(id, 1).src);
    const X = (px) => ox + px * k, Y = (py) => oy + py * k;
    g.save(); g.translate(X(hx), Y(hy)); g.rotate(a); g.drawImage(rim, -405 * k, -405 * k, 810 * k, 810 * k); g.restore();
    const [cw, ch] = WHEEL.cell, pose = [];
    for (let i = 0; i < 8; i++) {
      const ang = i * Math.PI / 4 + a, cx = hx + WHEEL.rCab * Math.sin(ang), cy = hy - WHEEL.rCab * Math.cos(ang), rot = d.cabinFollow ? a : 0;
      g.save(); g.translate(X(cx), Y(cy)); g.rotate(rot); g.drawImage(cab, (i % 4) * cw, Math.floor(i / 4) * ch, cw, ch, -cw / 2 * k, -ch / 2 * k, cw * k, ch * k); g.restore();
      pose.push({ x: cx, y: cy, rot });
    }
    const sr = d.standFollow ? a : 0;
    g.save(); g.translate(X(hx), Y(hy)); g.rotate(sr); g.drawImage(st, (WHEEL.stand[0] - hx) * k, (WHEEL.stand[1] - hy) * k, st.width * k, st.height * k); g.restore();
    this.wp = { a, hub: [hx, hy], rCab: WHEEL.rCab, cabins: pose, stand: { x: WHEEL.stand[0], y: WHEEL.stand[1], rot: sr } };
  }

  // a light rim round a target that is hard to spot on its own colour (code-drawn from the sticker's own shape, fades as it is rubbed away)
  drawRim(g, lv) {
    if (!this.rimC) {
      const c = document.createElement('canvas'); c.width = Math.ceil(this.w); c.height = Math.ceil(this.h);
      const q = c.getContext('2d'); q.drawImage(this.sp.src, 0, 0, c.width, c.height); q.globalCompositeOperation = 'source-in'; q.fillStyle = this.d.rim; q.fillRect(0, 0, c.width, c.height);
      this.rimC = c;
    }
    const pulse = 0.75 + 0.25 * Math.sin(lv.t * 5), k = 7, a = (1 - clamp(this.progress() / 0.5)) * pulse;
    if (a <= 0.01) return;
    g.save(); g.globalAlpha = (g.globalAlpha || 1) * a;
    for (let i = 0; i < 8; i++) g.drawImage(this.rimC, -this.w / 2 + Math.cos(i * 0.785) * k, -this.h * this.ay + Math.sin(i * 0.785) * k, this.w, this.h);
    g.restore();
  }

  // A hidden reveal is drawn only through the holes the finger has rubbed in its cover (never by the cover's alpha).
  peekSrc(lv) {
    if (this.d.show !== 'peek' || lv.fixed || !this.off) return this.mask || this.sp.src;
    const c = lv.target, o = this.og;
    o.globalCompositeOperation = 'source-over'; o.clearRect(0, 0, this.off.width, this.off.height);
    if (!c || !c.hole || c.state !== 'alive' || c.hit === 0) return this.off;
    o.drawImage(this.sp.src, 0, 0, this.off.width, this.off.height);
    o.globalCompositeOperation = 'destination-in';
    o.drawImage(c.hole, (c.x - c.w / 2) - (this.x - this.w / 2), (c.y - c.h * c.ay) - (this.y - this.h * this.ay));
    o.globalCompositeOperation = 'source-over';
    return this.off;
  }

  // Melting drops that belong to another thing: they hang at its cone and follow its drawn position (level 23: the gull's own ice cream drips).
  drawDrip(g, t, tt, o) {
    const c = o.center(t), rot = o.motion(t).rot, cs = Math.cos(rot), sn = Math.sin(rot);
    const src = [[-0.068, -0.026], [0.07, -0.026], [-0.004, 0.3]];
    this.dripAt = null;
    src.forEach((q, i) => {
      const lx = q[0] * o.w, ly = q[1] * o.h, x = c.x + lx * cs - ly * sn, y = c.y + lx * sn + ly * cs;
      if (i === 2) this.dripAt = { x, y };
      const p = (tt * 1.5 + i * 0.37) % 1, r = 9 * (1 - p * 0.3), fy = y + p * p * 95;
      g.save(); g.globalAlpha = Math.min(1, (1 - p * p * p) * 1.4); g.translate(x, fy);
      g.beginPath(); g.moveTo(0, -r * 2); g.quadraticCurveTo(r * 1.1, -r * 0.4, r, 0); g.arc(0, 0, r, 0, Math.PI); g.quadraticCurveTo(-r * 1.1, -r * 0.4, 0, -r * 2); g.closePath();
      fillStroke(g, '#e8486a', 4);
      g.restore();
    });
  }

  drawReveal(g, t, lv) {
    const r = this.react;
    if (!r) return;
    const def = r.def, tt = r.t, c = this.center(t);
    let top = c.y - this.h / 2;
    if (def.rain) {
      // three raindrops fall from the small cloud (level 35)
      for (let i = 0; i < 3; i++) {
        const p = (tt * 1.6 + i * 0.33) % 1, x = c.x + (i - 1) * 40, y = c.y + this.h * 0.3 + p * 150;
        g.save(); g.globalAlpha = Math.min(1, (1 - p * p) * 1.5); g.translate(x, y); g.beginPath(); g.moveTo(0, -16); g.quadraticCurveTo(11, 0, 0, 8); g.quadraticCurveTo(-11, 0, 0, -16); fillStroke(g, '#3d8fd2', 4); g.restore();
      }
    }
    if (def.drip && lv && lv.by[def.drip.on]) this.drawDrip(g, t, tt, lv.by[def.drip.on]);
    if (this.rev) {
      const sc = tt < 0.35 ? Math.max(0.02, ease.back(tt / 0.35)) : tt > 1.35 ? Math.max(0, 1 - (tt - 1.35) / 0.15) : 1;
      const hop = tt > 0.35 ? Math.abs(Math.sin((tt - 0.35) * 8)) * 50 * Math.max(0, 1 - (tt - 0.35) / 1.1) : 0;
      const rv = def.reveal;
      let cx = c.x + (rv.dx || 0), y = c.y + (rv.dy || 0) - (rv.base || rv.arc ? 0 : hop), rot = 0, pv = 0;
      if (rv.base || rv.arc) {
        // anchored to the thing's base (the pile): grows out of it from the bottom edge, no hop in the air; arc = a short jump up and a dive back
        const bot = c.y + this.h / 2 - 6;
        y = bot - this.rev.h / 2 + (rv.dy || 0); pv = this.rev.h / 2;
        if (rv.arc) { const u = clamp((tt - 0.3) / 1.0); y -= Math.sin(Math.PI * u) * rv.arc; rot = (u - 0.5) * 0.9; }
      }
      if (rv.at) { cx = rv.at.x; y = rv.at.y; }
      if (rv.to) {
        // the picture hops away to a spot of the stage (the pigeon lands on the bus roof)
        const u = ease.out(clamp((tt - 0.35) / 0.55)), q = rv.to;
        cx += (q.x - cx) * u; y += (q.y - y) * u - Math.sin(u * Math.PI) * 130;
      }
      const cnt = rv.n || 1, gap = rv.gap || 0;
      for (let i = 0; i < cnt; i++) {
        g.save(); g.translate(cx + (i - (cnt - 1) / 2) * gap, y - (cnt > 1 ? Math.abs(Math.sin((tt - 0.35) * 8 + i * 1.3)) * 18 * (tt > 0.35 ? 1 : 0) : 0) + pv); g.rotate(rot); g.scale(sc, sc);
        g.drawImage(this.rev.src, -this.rev.w / 2, -this.rev.h / 2 - pv, this.rev.w, this.rev.h);
        g.restore();
      }
      top = y - this.rev.h / 2;
    }
    if (def.say && tt > 0.15 && tt < 1.45) bubble(g, this.say, c.x, top - 36, ease.back(clamp((tt - 0.15) / 0.25)));
  }
}

export function bubble(g, text, x, y, sc) {
  const size = fitSize(g, text, 36, 300);
  g.font = '900 ' + size + 'px ' + FONT;
  const w = Math.max(110, g.measureText(text).width + 56), h = 66;
  const cx = clamp(x, STAGE.x + w / 2 + 12, STAGE.x + STAGE.w - w / 2 - 12), cy = Math.max(STAGE.y + 125, y);
  g.save(); g.translate(cx, cy); g.scale(sc, sc);
  rr(g, -w / 2, -h / 2, w, h, 30); fillStroke(g, '#fff6df', 6);
  g.beginPath(); g.moveTo(-14, h / 2 - 3); g.lineTo(0, h / 2 + 22); g.lineTo(14, h / 2 - 3); g.closePath(); fillStroke(g, '#fff6df', 6);
  g.fillStyle = '#fff6df'; g.fillRect(-12, h / 2 - 8, 24, 8);
  label(g, text, 0, 2, size, INK, { stroke: 0 });
  g.restore();
}
