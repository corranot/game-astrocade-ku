/* Rub It Away particles: crumbs under the finger, confetti, dust puffs and sparkles in one pooled Fx class, plus the Weather emitter (rain, snow, steam) that fades out when a level is fixed. */
import { STAGE } from './util.js';

const CONFETTI = ['#e8743b', '#ebb439', '#2dbe45', '#3d8fd2', '#9951d6'];
const MAX = 420;

export class Fx {
  constructor(reducedMotion = false) { this.reducedMotion = reducedMotion; this.crumbs = []; this.conf = []; this.puffs = []; this.sparks = []; this.shots = []; this.burstN = 0; }

  // crumbs fly off in the rub direction (dx, dy = unit vector of the finger move); without a direction they burst upward as before
  crumb(x, y, col, dx = 0, dy = 0, sp = 0) {
    if (this.reducedMotion || this.crumbs.length > MAX) return;
    const dir = dx !== 0 || dy !== 0, k = 160 + Math.min(1, sp / 1500) * 260;
    for (let j = 0; j < 2; j++) {
      this.crumbs.push(dir
        ? { x: x + (Math.random() - 0.5) * 36, y: y + (Math.random() - 0.5) * 36, vx: dx * k * (0.6 + Math.random() * 0.8) + (Math.random() - 0.5) * 110, vy: dy * k * (0.6 + Math.random() * 0.8) - 50 - Math.random() * 90, r: 4 + Math.random() * 7, life: 1, col }
        : { x: x + (Math.random() - 0.5) * 60, y: y + (Math.random() - 0.5) * 60, vx: (Math.random() - 0.5) * 160, vy: -60 - Math.random() * 120, r: 4 + Math.random() * 7, life: 1, col });
    }
  }

  confetti(x, y, n = 90) {
    if (this.reducedMotion) return;
    for (let i = 0; i < n && this.conf.length < MAX; i++) this.conf.push({ x: x + (Math.random() - 0.5) * 120, y, vx: (i % 2 ? 1 : -1) * (130 + Math.random() * 420), vy: -380 - Math.random() * 600, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 12, c: CONFETTI[i % 5] });
  }

  puff(x, y, n = 9, col = '#ffffff', speed = 420) {
    for (let i = 0; i < n; i++) this.puffs.push({ x, y, a: i / n * 6.28, r: 0, v: speed, life: 1, col });
  }

  spark(x, y, n = 8) {
    if (this.reducedMotion) return;
    for (let i = 0; i < n; i++) this.sparks.push({ x, y, vx: (Math.random() - 0.5) * 500, vy: -200 - Math.random() * 300, life: 1 });
  }

  // BURST: a ring (or fan) of glowing dots that fly out, fall and fade over about 1.1 s: a firework (default full ring) or a splash (o.ang = fan of angles, o.g = gravity); drawn in screen space
  burst(x, y, n = 22, cols = CONFETTI, o = {}) {
    if (this.reducedMotion) return;
    const a0 = o.ang ? o.ang[0] : 0, a1 = o.ang ? o.ang[1] : Math.PI * 2, v0 = o.v ? o.v[0] : 260, v1 = o.v ? o.v[1] : 380;
    for (let i = 0; i < n; i++) {
      const a = a0 + (a1 - a0) * (i + 0.5) / n, v = (v0 + (v1 - v0) * ((i * 0.618) % 1)) * (o.ang || i % 2 === 0 ? 1 : 0.55);   // a full ring is two shells (every second dot slower), so a firework reads as a burst, not a hoop
      this.shots.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: o.g == null ? 420 : o.g, life: 1, dec: (o.dec || 0.95) * (0.8 + 0.4 * ((i * 0.37) % 1)), r: o.r || 8, col: cols[i % cols.length] });
    }
    this.burstN++;
  }

  // RAIN: confetti pieces that drift down from above the card (gentle fall, sideways sway), used by the level 60 finale
  rain(x0, x1, y, n) {
    if (this.reducedMotion) return;
    for (let i = 0; i < n; i++) this.conf.push({ x: x0 + Math.random() * (x1 - x0), y, vx: (Math.random() - 0.5) * 120, vy: 120 + Math.random() * 160, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 9, c: CONFETTI[i % 5], soft: 1 });
  }

  update(dt) {
    for (const p of this.shots) { p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 1 - dt * 0.8; p.life -= dt * p.dec; }
    this.shots = this.shots.filter((p) => p.life > 0);
    for (const p of this.crumbs) { p.vy += 500 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt * 1.5; }
    for (const p of this.conf) { p.vy += (p.soft ? 40 : 1500) * dt; if (p.soft) p.x += Math.sin(p.rot * 2) * 30 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt; }
    for (const p of this.puffs) { p.r += p.v * dt; p.life -= dt * 1.6; }
    for (const p of this.sparks) { p.vy += 700 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt * 1.8; }
    this.crumbs = this.crumbs.filter((p) => p.life > 0);
    this.conf = this.conf.filter((p) => p.y < 1400);
    this.puffs = this.puffs.filter((p) => p.life > 0);
    this.sparks = this.sparks.filter((p) => p.life > 0);
  }

  drawLow(g) {
    if (this.reducedMotion) return;
    for (const p of this.puffs) { g.globalAlpha = Math.max(0, p.life); g.fillStyle = p.col; g.beginPath(); g.arc(p.x + Math.cos(p.a) * p.r, p.y + Math.sin(p.a) * p.r * 0.6, 26 * p.life + 8, 0, 7); g.fill(); }
    for (const p of this.crumbs) { g.globalAlpha = Math.max(0, p.life); g.fillStyle = p.col; g.beginPath(); g.arc(p.x, p.y, p.r, 0, 7); g.fill(); }
    g.globalAlpha = 1;
  }

  drawHigh(g) {
    if (this.reducedMotion) return;
    for (const p of this.shots) { g.globalAlpha = Math.max(0, Math.min(1, p.life * 1.6)); g.fillStyle = p.col; g.beginPath(); g.arc(p.x, p.y, p.r * (0.35 + 0.65 * p.life), 0, 7); g.fill(); g.globalAlpha *= 0.4; g.beginPath(); g.arc(p.x - p.vx * 0.04, p.y - p.vy * 0.04, p.r * 0.55 * p.life, 0, 7); g.fill(); }
    for (const p of this.sparks) { g.globalAlpha = Math.max(0, p.life); g.fillStyle = '#ebb439'; g.beginPath(); g.arc(p.x, p.y, 6 * p.life + 2, 0, 7); g.fill(); }
    g.globalAlpha = 1;
    for (const p of this.conf) { g.save(); g.translate(p.x, p.y); g.rotate(p.rot); g.fillStyle = p.c; g.fillRect(-9, -4, 18, 8); g.restore(); }
  }
}

export class Weather {
  constructor(def, reducedMotion = false) {
    this.reducedMotion = reducedMotion; this.d = def; this.k = def ? def.kind : null; this.p = [];
    const n = this.k === 'rain' ? 26 : this.k === 'snow' ? 40 : this.k === 'steam' ? 12 : 0;
    for (let i = 0; i < n; i++) this.p.push(this.fresh(true, i, n));
  }

  fresh(first, i, n) {
    const d = this.d, u = (i + 0.5) / n;
    if (this.k === 'rain') return { x: d.x - d.w / 2 + (i * 53) % d.w, y: d.y + (i * 97) % d.h, v: 420 + (i * 31) % 200 };
    if (this.k === 'snow') return { x: STAGE.x + (i * 67) % STAGE.w, y: first ? STAGE.y + (i * 131) % STAGE.h : STAGE.y - 10, v: 60 + (i * 17) % 60, ph: i, r: 4 + (i % 4) * 1.5 };
    return { x: d.x - d.w / 2 + u * d.w, y: first ? d.y - (i * 37) % 160 : d.y, v: 50 + (i * 13) % 40, ph: i, life: first ? ((i * 29) % 100) / 100 : 0 };
  }

  update(dt) {
    const d = this.d;
    if (!this.k || this.reducedMotion) return;
    this.p.forEach((p, i) => {
      if (this.k === 'rain') { p.y += p.v * dt; if (p.y > d.y + d.h) p.y = d.y; }
      else if (this.k === 'snow') { p.y += p.v * dt; p.x += Math.sin(p.ph + p.y * 0.01) * 20 * dt; if (p.y > STAGE.y + STAGE.h) Object.assign(p, this.fresh(false, i, this.p.length)); }
      else { p.y -= p.v * dt; p.life += dt * 0.5; if (p.life >= 1) Object.assign(p, this.fresh(false, i, this.p.length)); }
    });
  }

  draw(g, a, t) {
    if (!this.k || this.reducedMotion || a <= 0.01) return;
    if (this.k === 'rain') {
      g.strokeStyle = 'rgba(63,125,180,' + a + ')'; g.lineWidth = 8; g.lineCap = 'round';
      for (const p of this.p) { g.beginPath(); g.moveTo(p.x, p.y); g.lineTo(p.x - 6, p.y + 26); g.stroke(); }
    } else if (this.k === 'snow') {
      g.fillStyle = 'rgba(255,255,255,' + a * 0.95 + ')';
      for (const p of this.p) { g.beginPath(); g.arc(p.x, p.y, p.r, 0, 7); g.fill(); }
    } else {
      for (const p of this.p) { g.fillStyle = 'rgba(230,236,244,' + a * 0.7 * (1 - p.life) + ')'; g.beginPath(); g.arc(p.x + Math.sin(t * 2 + p.ph) * 12, p.y, 14 + p.life * 26, 0, 7); g.fill(); }
    }
  }
}
