/* Rub It Away level engine: reads an immutable authored scene plus creator overrides, runs one-touch rubbing, welcoming decoy reactions and hints, and renders the portrait stage. Exploration never reduces completion stars; optional effects respect player preferences. */
import { LEVELS } from './levels.js';
import { Thing, BRUSH } from './thing.js';
import { Fx, Weather } from './fx.js';
import { background, sprite } from './assets.js';
import { STAGE, INK, COL, clamp, ease, rr, fillStroke, label, fitSize } from './util.js';
import { drawHand } from './hand.js';
import { t } from './strings.js';
import * as AU from './audio.js';
import { effectiveLevelDefinition, starsForSolvedLevel } from './rules.js';

export const NEED = 0.72;
const COACH_WAIT = 6;

const FAM = [1, 1.26, 0.84, 1.5];            // four reaction pitch families (by decoy index) so neighbouring decoys never sound alike
const FLINCH = ['startle', 'headshake', 'lean'];  // the main actor's flinch variants, cycled per level; each has its own emote
const AMB_N = 14, GLOW = { blob: null, dot: null }, CONF = ['#d93030', '#2d6cc2', '#ebb439', '#2d9f25'];

// cached soft sprites for the ambient layer (built once, never per frame)
function soft(kind) {
  if (GLOW[kind]) return GLOW[kind];
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d'), gr = g.createRadialGradient(64, 64, 2, 64, 64, 62);
  if (kind === 'blob') { gr.addColorStop(0, 'rgba(40,64,96,0.55)'); gr.addColorStop(1, 'rgba(40,64,96,0)'); } else { gr.addColorStop(0, 'hsla(58,88%,62%,0.95)'); gr.addColorStop(0.35, 'hsla(58,88%,56%,0.35)'); gr.addColorStop(1, 'hsla(58,88%,56%,0)'); }
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  return (GLOW[kind] = c);
}

function mixHex(a, b, k) {
  const q = (h, i) => parseInt(h.slice(1 + i * 2, 3 + i * 2), 16), c = (i) => Math.round(q(a, i) + (q(b, i) - q(a, i)) * k);
  return 'rgb(' + c(0) + ',' + c(1) + ',' + c(2) + ')';
}

function haptic(o, enabled = true) { if (!enabled) return; try { window.lib.haptics.play(o); } catch (e) { return; } }

export class Level {
  constructor(n, onSolve, onGag, config = null, prefs = null) {
    this.n = n; this.def = effectiveLevelDefinition(LEVELS, n, config); this.onSolve = onSolve; this.onGag = onGag; this.gagT = -9;
    this.reducedMotion = !!(prefs && prefs.reduceMotion); this.hapticsEnabled = !prefs || prefs.haptics !== false;
    window.__lv = this;
    this.things = this.def.things.map((d) => { const thing = new Thing(d); thing.reducedMotion = this.reducedMotion; return thing; });
    this.by = {}; this.things.forEach((th) => { this.by[th.id] = th; });
    this.main = this.things.find((th) => th.d.main) || null;
    this.target = this.things.find((th) => th.role === 'target');
    const world = ['kitchen', 'pond', 'zoo', 'town', 'space', 'beach', 'castle', 'sea', 'fair', 'jungle', 'snow'].find((w) => this.def.bg.indexOf(w) >= 0) || 'garden';
    this.world = world; this.worldEnd = n % 6 === 0;
    this.bg = background(this.def.bg, world);
    this.fx = new Fx(this.reducedMotion); this.wx = new Weather(this.def.weather, this.reducedMotion);
    this.t = 0; this.s = 0; this.fixed = false; this.errors = 0; this.stars = 0; this.touched = false; this.idle = 0;
    this.cur = null; this.last = null; this.ek = 1; this.moveT = -9; this.hintT = 0; this.jing = false; this.lift = 0; this.curLift = 0; this.snowPuffT = -9;
    this.hold = 0; this.pt = -1; this.emote = null; this.flN = 0; this.giggles = 0; this.gigT = -9; this.ep = null; this.etilt = 0; this.main0 = this.main;
    this.patches = [].concat(this.def.patch || []); this.tossT = -1; this.dtNow = 0;
    // finale (level 60): the result card waits `hold` s so the whole scene can celebrate; rain = a confetti layer drawn over the card
    this.cardHold = this.def.finale ? this.def.finale.hold : 0; this.finN = 0; this.rainAcc = 0; this.arp2 = false; this.splashed = false; this.rain = this.def.finale ? new Fx(this.reducedMotion) : null;
    this.decoyIx = this.things.filter((th) => th.role === 'decoy').map((th) => th.id);
    AU.scene(world, !!(this.def.night || this.def.evening), n, this.things.filter((th) => th.d.react && th.d.react.say).map((th) => th.d.react.say.slice(2)));
    // ambient life per world, drawn behind the things: motes (garden, kitchen, pond, castle), drifting confetti (fair), falling leaves (jungle), cloud shadows + glints (zoo, town, beach), stars (space), bubbles (sea, dark), fireflies (evening, night)
    this.ambK = this.def.night || this.def.evening ? 'fire' : world === 'space' ? 'stars' : world === 'fair' ? 'confetti' : world === 'jungle' ? 'leaves' : world === 'sea' || this.def.dark ? 'bubbles' : world === 'zoo' || world === 'town' || world === 'beach' ? 'shadow' : 'motes';
    this.amb = [];
    for (let i = 0; i < AMB_N; i++) { const u = (i * 0.618034) % 1, v = (i * 0.381966 + 0.13) % 1; this.amb.push({ x: STAGE.x + 20 + u * (STAGE.w - 40), y: 290 + v * 800, p: i * 1.7, v: 18 + (i % 5) * 9, r: 3 + (i % 4) * 1.6 }); }
  }

  // read-only handle for the UI: the target's live drawn centre in canvas coordinates (it follows the idle motion and the scene pan)
  targetPos() {
    const c = this.target ? this.target.center(this.t) : { x: 360, y: 520 };
    return { x: c.x, y: c.y - this.curLift };
  }

  progress() { return this.target ? this.target.progress() : 0; }
  starsNow() { return this.fixed ? starsForSolvedLevel() : 0; }
  resultReady() { return this.fixed && this.s > 1.1 + this.cardHold; }

  // the coach points at the answer (the bulb, or free after 3 wrong rubs): ring + hand + the word
  hint(dur = 3.2) { this.hintT = dur; AU.sfx('tick'); window.__qaMark?.('hint'); }

  update(dt) {
    // hit-stop: the whole world freezes for a beat when the target is fully rubbed
    if (this.hold > 0) { this.hold -= dt; this.pt += dt; return; }
    if (this.pt >= 0) this.pt += dt;
    this.t += dt;
    for (const th of this.things) th.update(dt, this);
    this.fx.update(dt); this.wx.update(dt); if (this.rain && !this.reducedMotion) this.rain.update(dt);
    if (!this.reducedMotion) this.updateAmb(dt);
    this.magnet(dt);
    if (this.emote) { this.emote.t += dt; if (this.emote.t > 0.95) this.emote = null; }
    if (this.cur) {
      // the eraser follows the brush of the thing under the finger: a big target has a wide brush, everything else the plain one
      let ek = 1;
      for (const th of this.things) if (th.mask && th.state === 'alive' && th.rb > BRUSH * ek && this.cur.x > th.x - th.w / 2 - th.rb && this.cur.x < th.x + th.w / 2 + th.rb && this.cur.y > th.y - th.h * th.ay - th.rb && this.cur.y < th.y + th.h * (1 - th.ay) + th.rb) ek = th.rb / BRUSH;
      this.ek += (ek - this.ek) * (1 - Math.exp(-dt * 14));
    } else this.ek = 1;
    if (this.cur && this.ep) {
      const k = 1 - Math.exp(-dt * 26), tx = this.cur.x + 34, ty = this.cur.y - 30;
      this.etilt += (clamp((tx - this.ep.x) * 0.006, -0.4, 0.4) - this.etilt) * (1 - Math.exp(-dt * 12));
      this.ep.x += (tx - this.ep.x) * k; this.ep.y += (ty - this.ep.y) * k;
    }
    if (this.hintT > 0) this.hintT -= dt;
    this.idle = this.cur ? 0 : this.idle + dt;
    if (this.fixed) {
      this.s += dt;
      const ts = this.def.toss;
      if (ts && this.tossT < 0 && this.s >= ts.at + ts.dur) {
        // the letter has landed: the mailbox pops (hop, sparkles, plop)
        this.tossT = this.s; const mb = this.by[ts.to]; mb.bump('hop', 0.7); const c = mb.center(this.t); this.fx.spark(c.x, c.y - 20, 12); this.fx.puff(c.x, c.y, 5, '#ffffff', 220); AU.sfx('plop'); AU.sfx('pop');
      }
      if (this.s > 0.25 && !this.jing) { this.jing = true; AU.sfx('win'); AU.sfx('arp'); }
      for (let i = this.dings || 0; i < this.stars; i++) if (this.s > 1.5 + this.cardHold + i * 0.22) { this.dings = i + 1; AU.sfx('star'); }
      if (this.def.finale) this.finale(dt);
      const sp = this.def.splash;
      if (sp && !this.splashed && this.s >= sp.at) { this.splashed = true; this.fx.burst(sp.x, sp.y - this.curLift, 26, ['#2f93da', '#4cbfe6', '#1a5c9e'], { ang: [-2.5, -0.64], v: [380, 700], g: 900, dec: 0.8, r: 9 }); AU.sfx('plop'); AU.sfx('pop', 1.2); }
    }
    if (this.cur && this.t - this.moveT > 0.08) AU.rub(0);
  }

  // THE FINALE (level 60): five firework bursts in turn beside the temple (clear of the prompt pill), a confetti rain over the whole card, one more win arpeggio; the card itself waits for the hold
  finale(dt) {
    const f = this.def.finale, s = this.s;
    while (this.finN < f.bursts.length && s >= f.bursts[this.finN].at) {
      const b = f.bursts[this.finN++];
      this.fx.burst(b.x, b.y, b.n || 44, b.cols, { v: b.v || [90, 250], dec: 0.9, r: b.r || 9 }); AU.sfx('pop', 0.8 + (this.finN % 3) * 0.28); AU.sfx('plop', 1.4);
    }
    if (s >= 0.5 && s < 5.5) { this.rainAcc += dt * 46; while (this.rainAcc >= 1) { this.rainAcc -= 1; this.rain.rain(STAGE.x, STAGE.x + STAGE.w, -16, 1); } }
    if (!this.arp2 && s >= 0.9) { this.arp2 = true; AU.sfx('arp'); AU.sfx('star', 1.2); }
  }

  // FINISH MAGNET: a thing rubbed to 60 % dissolves by itself after 0.4 s more of rubbing; the target also when the finger lifts or stops. A decoy never dissolves from a lifted finger (a light brush stays fair).
  magnet(dt) {
    if (this.fixed) return;
    for (const th of this.things) {
      if (!th.mask || th.state !== 'alive' || th.melt >= 0) continue;
      if (th.hit / th.total < 0.6) { th.mag = 0; continue; }
      const on = this.cur && this.t - th.rubAt < 0.1;
      if (on) th.mag += dt; else if (th.role === 'target') th.mag = 9;
      if (th.mag >= 0.4) this.startMelt(th);
    }
    for (const th of this.things) if (th.melt >= 1) { th.melt = -1; th.hit = th.total; th.mag = 0; this.erased(th); }
  }

  // the last part of a thing dissolves by itself; a target never completes before MIN_T s of rubbing and MIN_LEN px of finger travel, so a small one is not over on the first touch
  startMelt(th) {
    th.melt = 0; th.meltDur = th.role === 'target' ? clamp(th.holdLeft(), 0.3, 1.4) : 0.3;
    const c = th.center(this.t); this.fx.spark(c.x, c.y, 5);
  }

  updateAmb(dt) {
    const k = this.ambK, X0 = STAGE.x + 10, X1 = STAGE.x + STAGE.w - 10;
    for (const a of this.amb) {
      if (k === 'bubbles') { a.y -= a.v * 2.2 * dt; if (a.y < 270) { a.y = 1110; a.x = X0 + (a.p * 97) % (X1 - X0); } }
      else if (k === 'shadow') { a.x += a.v * 0.6 * dt; if (a.x > X1 + 150) a.x = X0 - 150; }
      else if (k === 'fire') { a.x += Math.sin(this.t * 0.7 + a.p) * 22 * dt; a.y += Math.cos(this.t * 0.9 + a.p * 1.3) * 16 * dt; }
      else if (k === 'confetti') { a.y += a.v * 0.5 * dt; a.x += Math.sin(this.t * 0.8 + a.p) * 16 * dt; if (a.y > 1100) a.y = 270; }
      else if (k === 'leaves') { a.y += a.v * 0.42 * dt; a.x += Math.sin(this.t * 0.7 + a.p) * 12 * dt; if (a.y > 1100) a.y = 270; }
      else if (k === 'motes') { a.y -= a.v * 0.35 * dt; a.x += Math.sin(this.t * 0.6 + a.p) * 14 * dt; if (a.y < 270) a.y = 1100; }
    }
  }

  actorAt(p) { return this.things.find((th) => th.role === 'actor' && th.d.show !== 'fix' && th.contains(p, this.t)); }

  down(p) {
    this.cur = this.last = p;
    if (!this.ep) this.ep = { x: p.x + 34, y: p.y - 30 }; else { this.ep.x = p.x + 34; this.ep.y = p.y - 30; } this.touched = true; this.idle = 0;
    if (this.fixed) {
      const q = { x: p.x, y: p.y + this.curLift };
      const actor = this.things.find((th) => th.role === 'actor' && th.d.show !== 'fix' && th.contains(q, this.t));
      if (actor) { actor.bump('hop', 0.55); AU.sfx('tick'); this.fx.spark(p.x, p.y, 6); }
      return;
    }
    const over = this.things.some((th) => th.d.erasable && th.state === 'alive' && th.contains(p, this.t));
    if (!over) {
      const actor = this.things.find((th) => th.role === 'actor' && th.d.show !== 'fix' && th.contains(p, this.t));
      if (actor) { actor.bump('hop', 0.55); AU.sfx('tick'); this.fx.spark(p.x, p.y, 6); }
    }
  }

  giggle(p) {
    if (this.t - this.gigT < 0.8) return;
    const ac = this.actorAt({ x: p.x, y: p.y + this.curLift });
    if (!ac || !ac.d.main || ac.d.show) return;
    ac.flinch('giggle', 1, 0.7); this.gigT = this.t; this.giggles++;
    AU.sfx('tickle', 0.96 + Math.random() * 0.1); this.fx.spark(p.x, p.y, 4); haptic({ intensity: 0.25, sharpness: 0.5 }, this.hapticsEnabled);
  }

  move(p) {
    if (!this.cur) return;
    const a = this.last || p;
    this.last = this.cur = p;
    if (this.fixed) { this.giggle(p); return; }
    const sp = Math.hypot(p.x - a.x, p.y - a.y);
    this.moveT = this.t;
    const nx = sp > 0.5 ? (p.x - a.x) / sp : 0, ny = sp > 0.5 ? (p.y - a.y) / sp : 0;
    let pr = 0, over = false;
    for (const th of this.things) {
      if (!th.d.erasable) continue;
      if (th.scrub(a, p, this.t)) {
        th.rubDx = nx; th.rubDy = ny;
        if (sp > 2) this.fx.crumb(p.x, p.y, th.d.crumb || '#4174d3', nx, ny, sp / 0.016);
        if (this.world === 'snow' && !this.reducedMotion && sp > 2 && this.t - this.snowPuffT > 0.09) { this.snowPuffT = this.t; this.fx.puff(p.x, p.y, 2, '#f1fbff', 100); }
      }
      if (th.state === 'alive') { if (this.t - th.rubAt < 0.1) pr = Math.max(pr, th.progress()); if (th.contains(p, this.t)) over = true; }
      if (th.state === 'alive' && th.melt < 0 && th.progress() >= NEED) { if (th.holdLeft() > 0.05) this.startMelt(th); else this.erased(th); }
    }
    AU.rub(sp / 0.016, pr);
    if (!over) this.giggle(p);
  }

  up() { this.cur = null; this.last = null; AU.rub(0); }

  erased(th) {
    if (this.fixed) return;
    if (th.role === 'target') this.solve(th); else this.startReact(th);
  }

  solve(th) {
    this.fixed = true; this.s = 0; th.state = 'gone';
    this.stars = this.starsNow();
    if (th.d.exit === 'topple') th.exit = { t: 0 };
    const c = th.center(this.t);
    // payoff director: 80 ms hit-stop, camera punch (pt clock), confetti and sparkles burst from the main actor's head
    this.hold = 0.08; this.pt = 0;
    const m = this.main0 || this.things.find((q) => q.role === 'actor' && !q.d.show), hx = m ? m.x : 360, hy = m ? m.y - m.h * m.ay - 6 : 520;
    this.fx.puff(c.x, c.y, 9, '#ffffff'); this.fx.confetti(hx, hy, 56); this.fx.spark(hx, hy, 8);
    // the payoff effect matches the payoff sound: water fans up (splash), bubbles rise, a ring of sparkles (sparkle, lights on, found), a second confetti pop (cheer, party horn)
    const fk = AU.FIX[this.n - 1] || '';
    if (fk === 'f_splash' && !this.def.splash) this.fx.burst(c.x, c.y, 22, ['#2f93da', '#4cbfe6', '#1a5c9e'], { ang: [-2.5, -0.64], v: [320, 620], g: 900, dec: 0.8, r: 8 });
    else if (fk === 'f_bubbles') this.fx.burst(c.x, c.y, 18, ['#4cbfe6', '#2f93da'], { ang: [-2.2, -0.9], v: [140, 320], g: -120, dec: 0.95, r: 8 });
    else if (fk === 'f_sparkle' || fk === 'f_power' || fk === 'f_tada') for (let i = 0; i < 10; i++) { const a = i / 10 * 6.283; this.fx.spark(hx + Math.cos(a) * 110, hy + 70 + Math.sin(a) * 110, 2); }
    else if (fk === 'f_cheer' || fk === 'f_horn') this.fx.confetti(c.x, c.y, 40);
    for (const o of this.things) {
      if (o.role !== 'actor') continue;
      if (o.d.after && o.d.afterDelay) o.pend = true;
      else if (o.d.after) { o.asset = o.d.after; o.w = o.d.afterW || o.w; o.build(); } else if (!o.d.fall && !o.d.still) o.bump('hop', 0.8);
      o.fixT = 0;
      if (o.d.show === 'fix') { o.popT = -(o.d.showDelay || 0); o.waitHop = !!o.d.showDelay; }
    }
    // stayInView: a mover (bus, boat, rocket, submarine) stops inside the card instead of leaving it; fixMove.leave = true keeps the old exit
    for (const o of this.things) {
      const fm = o.d.fixMove;
      if (o.role !== 'actor' || !fm || fm.leave) continue;
      const w = Math.max(o.w, o.d.afterW || 0), L = STAGE.x + 26 - (o.x - w / 2), R = STAGE.x + STAGE.w - 26 - (o.x + w / 2);
      o.fmT = { dx: clamp(fm.dx || 0, Math.min(L, 0), Math.max(R, 0)), dy: fm.dy || 0 };
    }
    this.lift = this.calcLift();
    // what is left of the decoys must not end up under the prompt pill (y < 245) or the result card (y > 866) once the scene pans up
    for (const o of this.things) {
      if (o.role === 'actor' || o.state !== 'alive') continue;
      const edge = o.d.goneOnFix;
      if (!edge && this.def.keep) continue;
      const q = o.center(this.t);
      if (edge || q.y - o.h / 2 - this.lift < 245 || q.y + o.h / 2 - this.lift > 866) { o.state = 'gone'; this.fx.puff(q.x, q.y, 6, '#ffffff', 260); }
    }
    haptic({ intensity: 0.65, sharpness: 0.5 }, this.hapticsEnabled);
    if (this.world === 'snow') AU.sfx('snow_bell');
    AU.fixSfx(this.n);
    if (this.onSolve) this.onSolve(this.n, this.stars);
  }

  // The result card covers the stage below y 866: after the fix the whole scene pans up so every actor stays above it and below the prompt pill.
  calcLift() {
    if (this.def.lift != null) return this.def.lift;
    let bot = 0, top = 9999;
    for (const o of this.things) {
      if (o.role !== 'actor') continue;
      const fm = o.d.fixMove || {};
      bot = Math.max(bot, o.y + o.h * (1 - o.ay) + (fm.dy || 0));
      top = Math.min(top, o.y - o.h * o.ay + (fm.dy || 0));
    }
    return Math.max(0, Math.min(bot - 836, top - 245));
  }

  startReact(th) {
    const def = th.d.react || {};
    th.state = 'react'; th.react = { t: 0, def };
    th.say = def.say ? t(def.say) : '';
    th.rev = def.reveal ? sprite(def.reveal.asset, def.reveal.w, def.reveal.ar) : null;
    this.errors++;
    if (this.errors >= 3 && !this.auto3) { this.auto3 = true; this.hint(4.5); }   // 3 wrong rubs in one level: the coach hand points at the right thing by itself, free of charge
    // Wrong objects stay playful discoveries; they never remove earned/completion stars.
    // the main actor flinches too (startle hop, head shake or lean away, cycled per level) with a small emote above its head
    const ac = this.main0;
    if (ac && !ac.d.show && ac.state === 'alive') { const k = this.flN++ % 3; ac.flinch(FLINCH[k], ac.x >= th.x ? 1 : -1); this.emote = { t: 0, k, dir: ac.x >= th.x ? 1 : -1 }; }
    const c = th.center(this.t);
    this.fx.puff(c.x, c.y, 7, '#e9e2d0', 300);
    AU.gag(def.say ? def.say.slice(2) : '', def.sfx || 'boing', FAM[Math.max(0, this.decoyIx.indexOf(th.id)) % 4]); haptic({ intensity: 0.35, sharpness: 0.55 }, this.hapticsEnabled);
    // a gag seen for the first time joins the sticker collection: sparkles, a chime, the counter in the header pops
    const gi = this.decoyIx.indexOf(th.id);
    if (this.onGag && gi >= 0 && this.onGag(this.n, gi)) { this.gagT = this.t; this.fx.spark(c.x, c.y - 30, 12); AU.sfx('star', 1.3, 0.8); }
    const k = def.kick;
    if (k && k.on !== 'self') { const o = k.on === 'actor' ? this.main : this.by[k.on]; if (o) o.bump(k.type, 1.1); }
  }

  regrow(th) {
    AU.sfx('plop');
    const def = th.react ? th.react.def : {};
    th.react = null; th.rev = null;
    if (def.swap) { th.asset = def.swap.asset; if (def.swap.w) th.w = def.swap.w; th.cluster = def.swap.n ? { n: def.swap.n, fw: def.swap.w, gap: def.swap.gap } : null; }
    if (def.grow) th.w *= def.grow;
    th.build(); th.state = this.fixed && th.d.goneOnFix ? 'gone' : 'alive';
    if (def.regrow === 'float') { th.enterT = 0; th.popT = 9; } else th.popT = 0;
    if (def.kick && def.kick.on === 'self') th.bump(def.kick.type, 0.9);
    const c = th.center(this.t);
    this.fx.puff(c.x, c.y, 6, '#ffffff', 260); AU.sfx('pop');
  }

  draw(g) {
    const S = STAGE, t0 = this.reducedMotion ? 0 : this.t;
    g.save(); rr(g, S.x, S.y, S.w, S.h, S.r); g.clip();
    const iw = this.bg.width || this.bg.naturalWidth, ih = this.bg.height || this.bg.naturalHeight;
    const sc = Math.max((S.w + 40) / iw, S.h / ih), bw = iw * sc, bh = ih * sc;
    const lift = this.fixed ? this.lift * ease.out(clamp((this.s - 0.3) / 0.8)) : 0;
    this.curLift = lift;
    g.save(); g.translate(0, -lift);
    // camera punch (about 1.06x, eased) around the main actor just before the pan up
    const pu = this.reducedMotion || this.pt < 0 ? 0 : this.pt < 0.1 ? ease.out(this.pt / 0.1) : this.pt < 0.4 ? 1 - ease.out((this.pt - 0.1) / 0.3) : 0;
    if (pu > 0.001) { const m = this.main0, px = m ? m.x : 360, py = m ? m.y - m.h * m.ay * 0.5 : 600; g.translate(px, py); g.scale(1 + 0.06 * pu, 1 + 0.06 * pu); g.translate(-px, -py); }
    const bx = S.x + S.w / 2 - bw / 2 + Math.sin(t0 * 0.3) * 6;
    g.drawImage(this.bg, bx, S.y + S.h - bh, bw, bh);
    if (this.def.bgHide === 'wheel') this.hideBgWheel(g, bx, S.y + S.h - bh, bw / 1024);
    if (lift > 0.5) {
      // the pan up opens a gap below the picture: fill it with the picture's own bottom edge mirrored (no stretched streaks)
      const hh = Math.min(ih, (lift + 3) / sc);
      g.save(); g.translate(0, S.y + S.h - 1 + lift + 3); g.scale(1, -1); g.drawImage(this.bg, 0, ih - hh, iw, hh, bx, 0, bw, lift + 3); g.restore();
    }
    const k = this.fixed ? clamp(this.s / 0.8) : 0, prog = this.progress();
    if (this.def.gloom) { g.fillStyle = 'rgba(96,108,130,' + 0.5 * (1 - ease.out(k)) * (1 - prog * 0.5) + ')'; g.fillRect(S.x, S.y, S.w, S.h); }
    if (this.def.night) { g.fillStyle = 'rgba(24,32,96,' + 0.62 * (1 - ease.out(k)) + ')'; g.fillRect(S.x, S.y, S.w, S.h); }
    if (this.def.dark) { g.fillStyle = 'rgba(4,22,58,' + 0.66 * (1 - ease.out(k)) + ')'; g.fillRect(S.x, S.y, S.w, S.h + this.lift + 3); }
    if (this.def.evening) {
      // dusk stays through the result; the lit fire adds a warm glow (gold, orange) around itself
      // dusk: stays through the result (campfire) or lifts away on the fix (dusk: 'lift', the big wheel); the lit thing named by def.glow adds a warm glow (gold, orange) around itself
      g.fillStyle = 'rgba(120,40,70,' + (this.def.dusk === 'lift' ? 0.5 * (1 - 0.85 * ease.out(k)) : 0.5 - 0.12 * ease.out(k)) + ')'; g.fillRect(S.x, S.y, S.w, S.h + lift + 3);
      const gl0 = this.def.glow || 'campfire_lit', fl = this.fixed ? this.things.find((q) => q.asset === gl0) : null;
      if (fl) {
        const gr = g.createRadialGradient(fl.x, fl.y - fl.h * (fl.ay - 0.6), 20, fl.x, fl.y - fl.h * (fl.ay - 0.6), 420), a = ease.out(k) * (0.78 + Math.sin(t0 * 7) * 0.06);
        gr.addColorStop(0, 'rgba(235,180,57,' + 0.55 * a + ')'); gr.addColorStop(0.5, 'rgba(232,116,59,' + 0.25 * a + ')'); gr.addColorStop(1, 'rgba(232,116,59,0)');
        g.fillStyle = gr; g.fillRect(S.x, S.y, S.w, S.h + lift + 3);
      }
    }
    if (!this.reducedMotion) this.drawAmb(g, t0, lift);
    this.drawPatches(g, t0, false);
    for (const th of this.things) if (th.d.tie && th.state === 'alive') this.drawTie(g, th, t0);
    const kind = this.wx.k;
    this.wx.draw(g, kind === 'rain' ? (1 - prog) * (1 - k) : kind === 'steam' ? 1 - k : 1, t0);
    for (const th of this.things) th.draw(g, t0, this);
    if (this.def.finale && this.fixed) this.drawGlow(g, t0);
    if (this.def.warmReveal && this.fixed) this.drawWarmReveal(g, t0);
    for (const th of this.things) th.drawReveal(g, t0, this);
    if (this.main0 && this.main0.d.breath && !this.reducedMotion) this.drawFrostBreath(g, t0);
    this.drawPatches(g, t0, true);
    for (const th of this.things) th.drawClue(g, t0);
    this.drawToss(g);
    if (!this.reducedMotion) this.drawEmote(g, t0);
    if (this.fixed && !this.reducedMotion) this.drawTwinkle(g, t0);
    this.fx.drawLow(g);
    g.restore(); g.restore();
    rr(g, S.x, S.y, S.w, S.h, S.r); g.lineWidth = 9; g.strokeStyle = INK; g.stroke();
    this.drawHint(g);
    if (this.firstFix && this.fixed && this.s > 0.5 && this.s < 2.4) { g.save(); g.globalAlpha = clamp((this.s - 0.5) / 0.3) * clamp((2.4 - this.s) / 0.3); label(g, t('coachNice'), 360, 310, 64, COL.orange, { lw: 12 }); g.restore(); }   // the first fix ever: one word of praise
    this.drawProgress(g);
    if (this.cur && !this.fixed) this.drawEraser(g);
    this.fx.drawHigh(g);
  }

  // the fair picture has its own big wheel; on the level whose actor IS the wheel the painted one is covered with the picture's own sky (its clean left pixel column, stretched sideways) and its own left bush (drawn again, its right end closed by a drawn curve that runs behind the level's wheel base); the tent stays outside the clip. Numbers are picture pixels at 1024 wide (q = screen px per picture px).
  hideBgWheel(g, bx, by, q) {
    const u = (this.bg.width || this.bg.naturalWidth) / 1024, X = (x) => bx + x * q, Y = (y) => by + y * q;
    const part = (x, y, w, h) => g.drawImage(this.bg, x * u, y * u, w * u, h * u, X(x), Y(y), w * q + 0.5, h * q + 0.5);
    g.save(); g.beginPath();
    [[0, 320], [629, 320], [629, 735], [591, 772], [583, 800], [597, 835], [606, 860], [583, 940], [562, 1000], [555, 1019], [0, 1019]].forEach((p, i) => g[i ? 'lineTo' : 'moveTo'](X(p[0]), Y(p[1])));
    g.closePath(); g.clip();
    g.drawImage(this.bg, 6 * u, 320 * u, 4 * u, 580 * u, X(0) - 8, Y(320), 650 * q, 580 * q);
    g.drawImage(this.bg, 6 * u, 890 * u, 4 * u, 10 * u, X(0) - 8, Y(900) - 1, 650 * q, 119 * q + 2);
    g.beginPath(); g.moveTo(X(140), Y(938)); g.quadraticCurveTo(X(172), Y(946), X(184), Y(1019)); g.lineTo(X(100), Y(1019)); g.lineTo(X(100), Y(950)); g.closePath();
    g.fillStyle = '#52635f'; g.fill();
    g.beginPath(); g.moveTo(X(140), Y(938)); g.quadraticCurveTo(X(172), Y(946), X(184), Y(1019)); g.strokeStyle = '#321a30'; g.lineWidth = 9 * q; g.lineCap = 'round'; g.stroke();
    part(0, 900, 143, 60); part(0, 960, 104, 59);
    g.restore();
  }
  // the open temple doorway pulses a warm glow (gold and orange, additive) while the finale and the result card last
  drawGlow(g, t0) {
    const tp = this.by.temple, a = ease.out(clamp((this.s - 0.4) / 0.6));
    if (!tp || a <= 0) return;
    const x = tp.x - tp.w * 0.015, y = tp.y - tp.h * 0.35, pu = 0.72 + 0.28 * Math.sin(t0 * 5.5), R = 210 + 40 * pu;
    g.save(); g.globalCompositeOperation = 'lighter';
    const gr = g.createRadialGradient(x, y, 14, x, y, R);
    gr.addColorStop(0, 'rgba(235,180,57,' + 0.5 * a * pu + ')'); gr.addColorStop(0.5, 'rgba(232,116,59,' + 0.22 * a * pu + ')'); gr.addColorStop(1, 'rgba(232,116,59,0)');
    g.fillStyle = gr; g.fillRect(x - R, y - R, R * 2, R * 2);
    g.restore();
  }

  drawWarmReveal(g, t0) {
    const actor = this.main0 || this.target; if (!actor) return;
    const a = ease.out(clamp((this.s - 0.15) / 0.75)); if (a <= 0) return;
    const x = actor.x, y = actor.y - actor.h * 0.55, pulse = this.reducedMotion ? 1 : 0.88 + 0.12 * Math.sin(t0 * 4);
    const r = 250 * pulse;
    g.save(); g.globalCompositeOperation = 'lighter';
    const glow = g.createRadialGradient(x, y, 10, x, y, r);
    glow.addColorStop(0, 'rgba(255,220,140,' + 0.26 * a + ')'); glow.addColorStop(0.42, 'rgba(255,190,100,' + 0.12 * a + ')'); glow.addColorStop(1, 'rgba(255,190,100,0)');
    g.fillStyle = glow; g.fillRect(x - r, y - r, r * 2, r * 2); g.restore();
  }

  drawFrostBreath(g, t0) {
    const actor = this.main0; if (!actor || !actor.state || actor.state === 'gone') return;
    const phase = (t0 % 3.5) / 3.5; if (phase > 0.35) return;
    const k = phase / 0.35, x = actor.x + actor.w * 0.17 + k * 24, y = actor.y - actor.h * 0.7 - k * 30;
    g.save(); g.globalAlpha = 0.34 * (1 - k); g.fillStyle = '#effaff';
    for (let i = 0; i < 3; i++) { g.beginPath(); g.ellipse(x + i * 12, y - i * 4, 14 - i * 2, 7 - i, -0.12, 0, Math.PI * 2); g.fill(); }
    g.restore();
  }

  // a short rope from one thing to another (level 34: the anchor hangs from the boat's bow), drawn under both in the outline colour
  drawTie(g, th, t0) {
    const a = this.by[th.d.tie], ma = a.motion(t0), c = th.center(t0);
    const at = th.d.tieAt, x0 = a.x + ma.dx + a.w * (at ? at[0] : -0.22), y0 = at ? a.y + ma.dy - a.h * (a.ay - 0.5) + a.h * at[1] : a.y + ma.dy - a.h * 0.1, x1 = c.x, y1 = c.y - th.h * 0.4;
    g.save(); g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo((x0 + x1) / 2 + 14, (y0 + y1) / 2 + 6, x1, y1);
    g.lineWidth = 7; g.lineCap = 'round'; g.strokeStyle = INK; g.stroke(); g.restore();
  }

  // a code-drawn scene patch behind the things (pond, snow field, sand mound): ellipse, darker rim, two highlight arcs; front = a water lip over the lower part of the things standing in it, and an onFix patch only shows after the fix
  drawPatches(g, t0, front) {
    for (const p of this.patches) {
      if (p.onFix && !this.fixed) continue;
      if (!front) { if (!p.front) this.patchShape(g, p, t0, 1); continue; }
      if (p.front) this.patchShape(g, p, t0, ease.out(clamp(this.s / 0.5)));
      if (!p.lip) continue;
      const [x0, x1, y0] = p.lip;
      g.save(); g.beginPath(); g.ellipse(p.x, p.y, p.w / 2, p.h / 2, 0, 0, 7); g.clip();
      g.beginPath(); g.rect(x0, y0, x1 - x0, 400); g.clip();
      g.globalAlpha = 0.5; g.fillStyle = p.c[0]; g.fillRect(x0, y0, x1 - x0, 400);
      g.globalAlpha = 1; g.lineWidth = 6; g.lineCap = 'round'; g.strokeStyle = p.c[2]; g.beginPath(); g.moveTo(x0, y0 + 4);
      for (let x = x0; x <= x1; x += 16) g.lineTo(x, y0 + Math.sin(x * 0.05 + t0 * 2.4) * 4);
      g.stroke(); g.restore();
    }
  }

  patchShape(g, p, t0, a) {
    // a patch with `mud` starts as a small dry mud puddle and fills to its water colours and full size over 0.9 s after the fix
    const m = p.mud, k = m ? (this.fixed ? ease.out(clamp(this.s / 0.9)) : 0) : 1, mix = (i) => (m ? mixHex(m.c[i], p.c[i], k) : p.c[i]);
    const px = m ? m.x + (p.x - m.x) * k : p.x, py = m ? m.y + (p.y - m.y) * k : p.y, rx = (m ? m.w + (p.w - m.w) * k : p.w) / 2 * a, ry = (m ? m.h + (p.h - m.h) * k : p.h) / 2 * a;
    g.save(); g.globalAlpha = a; g.lineCap = 'round';
    g.beginPath(); g.ellipse(px, py, rx, ry, 0, 0, 7); g.fillStyle = mix(0); g.fill();
    g.lineWidth = 9; g.strokeStyle = mix(1); g.stroke();
    g.lineWidth = 6; g.strokeStyle = mix(2);
    p = { x: px, y: py };
    const w = Math.sin(t0 * 1.6) * 6;
    g.beginPath(); g.ellipse(p.x - rx * 0.38 + w, p.y - ry * 0.3, rx * 0.2, ry * 0.18, 0, Math.PI * 1.05, Math.PI * 1.75); g.stroke();
    g.beginPath(); g.ellipse(p.x + rx * 0.3 - w, p.y + ry * 0.2, rx * 0.14, ry * 0.12, 0, Math.PI * 1.1, Math.PI * 1.7); g.stroke();
    g.restore();
  }

  // the letter of level 21: after the fix it arcs from the postman's hand into the mailbox
  drawToss(g) {
    const ts = this.def.toss;
    if (!ts || !this.fixed || this.s < ts.at || this.tossT >= 0) return;
    const u = clamp((this.s - ts.at) / ts.dur), a = this.by[ts.from], b = this.by[ts.to], ca = a.center(this.t), cb = b.center(this.t);
    const x0 = ca.x + a.w * 0.2, y0 = ca.y - a.h * 0.1, x1 = cb.x, y1 = cb.y - b.h * 0.3;
    this.tossN = (this.tossN || 0) + 1;
    g.save(); g.translate(x0 + (x1 - x0) * u, y0 + (y1 - y0) * u - Math.sin(Math.PI * u) * 130); g.rotate((u - 0.5) * 1.6); g.scale(1 - 0.3 * u, 1 - 0.3 * u);
    rr(g, -30, -21, 60, 42, 6); fillStroke(g, '#fff6df', 6);
    g.beginPath(); g.moveTo(-28, -18); g.lineTo(0, 4); g.lineTo(28, -18); g.lineWidth = 5; g.strokeStyle = INK; g.stroke();
    g.restore();
  }

  drawHint(g) {
    if (this.fixed || !this.target || this.target.state !== 'alive') return;
    const c = this.target.center(this.reducedMotion ? 0 : this.t), animT = this.reducedMotion ? 0 : this.t;
    if (this.hintT > 0) {
      const a = Math.min(1, this.hintT), pulse = this.reducedMotion ? 0.5 : 0.5 + 0.5 * Math.sin(animT * 8);
      g.save(); g.translate(c.x, c.y); g.globalAlpha = a * (0.5 + pulse * 0.4);
      g.beginPath(); g.ellipse(0, 0, this.target.w * 0.58 + pulse * 10, this.target.h * 0.58 + pulse * 10, 0, 0, 7);
      g.lineWidth = 12; g.strokeStyle = COL.gold; g.stroke(); g.restore();
    }
    if ((this.n <= 2 && (!this.touched || this.idle > 6)) || this.hintT > 0) {
      // levels 1-2 and the hint bulb: rub back and forth over the target itself
      const h = this.reducedMotion ? 0.5 : (animT % 1.6) / 1.6, w = Math.min(this.target.w * 0.25, 52);
      drawHand(g, c.x - w + h * w * 2, c.y + (this.reducedMotion ? 0 : Math.sin(h * 6.28) * 36), 0.9, this.reducedMotion ? 0 : Math.sin(animT * 10) * 0.5);
      this.coachWord(g, this.hintT > 0 ? 'coachHere' : this.n === 1 ? 'coachRub' : '', c);
    } else if (!this.reducedMotion && this.n >= 3 && this.idle > COACH_WAIT && !this.cur) {
      // from level 3: after 6 s without a touch the hand sweeps gently over the erasable things one after another (left to right and back), rubbing a little on each, following their live positions; it never points at the answer alone
      const al = this.things.filter((th) => th.d.erasable && th.state === 'alive').map((th) => th.center(this.t)).sort((p, q) => p.x - q.x);
      if (al.length < 2) return;
      const n = al.length, m = 2 * n - 2, per = 1.1, ph = (this.t / per) % m, i0 = Math.floor(ph), f = ph - i0, ix = (i) => (i < n ? i : m - i);
      const A = al[ix(i0)], B = al[ix((i0 + 1) % m)], mv = f < 0.62 ? 0 : (f - 0.62) / 0.38, e = mv * mv * (3 - 2 * mv), wob = Math.sin(this.t * 10), k = clamp((this.idle - COACH_WAIT) / 0.5);
      g.save(); g.globalAlpha = k;
      drawHand(g, clamp(A.x + (B.x - A.x) * e + wob * 22 * (1 - e), STAGE.x + 50, STAGE.x + STAGE.w - 50), A.y + (B.y - A.y) * e - 10 + Math.abs(wob) * 8, 0.9, wob * 0.5);
      g.restore();
    }
  }

  // the coach speaks 1-2 words above the target (never above y 285, never outside the stage card)
  coachWord(g, key, c) {
    if (!key) return;
    const s = t(key), p = this.reducedMotion ? 1 : 1 + Math.sin(this.t * 6) * 0.05, x = clamp(c.x, STAGE.x + 130, STAGE.x + STAGE.w - 130), y = Math.max(300, c.y - this.target.h * 0.5 - 48);
    g.save(); g.translate(x, y); g.scale(p, p); label(g, s, 0, 0, fitSize(g, s, 60, 240), COL.orange, { lw: 12 }); g.restore();
  }

  drawProgress(g) {
    const prog = this.progress();
    if (this.fixed || prog < 0.03) return;
    const w = 420, x = 360 - w / 2, y = 1090;
    rr(g, x, y, w, 30, 15); fillStroke(g, '#f7e9c8', 5);
    rr(g, x, y, Math.max(30, w * clamp(prog / NEED)), 30, 15); fillStroke(g, COL.green, 5);
  }

  // ambient life behind the things (cached sprites and plain arcs, nothing allocated per frame); fades out before it reaches the prompt pill
  drawAmb(g, t0, lift) {
    const k = this.ambK;
    g.save();
    for (let i = 0; i < this.amb.length; i++) {
      const a = this.amb[i], fade = clamp((a.y - lift - 275) / 70);
      if (fade <= 0) continue;
      const tw = 0.5 + 0.5 * Math.sin(t0 * (1.1 + (i % 4) * 0.35) + a.p);
      if (k === 'shadow') {
        if (i < 4) { g.globalAlpha = 0.16 * fade; g.drawImage(soft('blob'), a.x - 190, a.y - 90 + (i % 2) * 120, 380, 180); continue; }
        g.globalAlpha = 0.55 * tw * fade; g.fillStyle = COL.gold; g.beginPath(); g.arc(a.x, a.y, a.r, 0, 7); g.fill();
      } else if (k === 'fire') {
        g.globalAlpha = (0.25 + 0.75 * tw) * fade; g.drawImage(soft('dot'), a.x - 22, a.y - 22, 44, 44);
      } else if (k === 'confetti') {
        g.globalAlpha = (0.45 + 0.4 * tw) * fade; g.fillStyle = CONF[i % 4]; g.save(); g.translate(a.x, a.y); g.rotate(t0 * 0.9 + a.p); g.fillRect(-a.r * 1.1, -a.r * 0.6, a.r * 2.2, a.r * 1.2); g.restore();
      } else if (k === 'leaves') {
        g.globalAlpha = (0.4 + 0.3 * tw) * fade; g.fillStyle = '#2d9f25'; g.beginPath(); g.ellipse(a.x, a.y, a.r * 2.6, a.r * 1.2, Math.sin(t0 * 0.9 + a.p) * 1.1, 0, 7); g.fill();
      } else if (k === 'stars') {
        const r = a.r * (0.5 + tw * 0.9); g.globalAlpha = (0.35 + 0.65 * tw) * fade; g.fillStyle = COL.gold;
        g.beginPath(); g.moveTo(a.x, a.y - r * 1.8); g.lineTo(a.x + r * 0.4, a.y - r * 0.4); g.lineTo(a.x + r * 1.8, a.y); g.lineTo(a.x + r * 0.4, a.y + r * 0.4); g.lineTo(a.x, a.y + r * 1.8); g.lineTo(a.x - r * 0.4, a.y + r * 0.4); g.lineTo(a.x - r * 1.8, a.y); g.lineTo(a.x - r * 0.4, a.y - r * 0.4); g.closePath(); g.fill();
      } else if (k === 'bubbles') {
        g.globalAlpha = 0.5 * fade; g.lineWidth = 3; g.strokeStyle = COL.blue; g.beginPath(); g.arc(a.x + Math.sin(t0 * 1.3 + a.p) * 10, a.y, a.r * 2.2, 0, 7); g.stroke();
      } else {
        g.globalAlpha = (0.25 + 0.5 * tw) * fade; g.fillStyle = COL.gold; g.beginPath(); g.arc(a.x, a.y, a.r, 0, 7); g.fill();
      }
    }
    g.restore();
  }

  // the small code-drawn emote above the main actor's head after a wrong rub: "!" (startle), "?" (head shake), sweat drop (lean away)
  drawEmote(g, t0) {
    const e = this.emote, m = this.main0;
    if (!e || !m) return;
    const mo = m.motion(t0), sc = (e.t < 0.2 ? Math.max(0.02, ease.back(e.t / 0.2)) : 1) * (e.t > 0.75 ? Math.max(0, 1 - (e.t - 0.75) / 0.2) : 1);
    // above the head on the side away from the decoy, so it never sits under the decoy's speech bubble
    const x = clamp(m.x + mo.dx + e.dir * m.w * 0.3, STAGE.x + 50, STAGE.x + STAGE.w - 50), y = Math.max(290, m.y + mo.dy - m.h * m.ay * mo.sy - 26 - ease.out(clamp(e.t / 0.5)) * 14);
    g.save(); g.translate(x, y); g.scale(sc * 1.3, sc * 1.3); g.lineJoin = g.lineCap = 'round';
    // a small white backing disc with the dark-plum outline, so the glyph reads on any colour (orange wheel, green jungle)
    g.beginPath(); g.arc(0, -2, 50, 0, 7); fillStroke(g, '#ffffff', 7);
    if (e.k === 0) {
      rr(g, -10, -34, 20, 42, 9); fillStroke(g, COL.gold, 6);
      g.beginPath(); g.arc(0, 24, 9, 0, 7); fillStroke(g, COL.gold, 6);
    } else if (e.k === 1) {
      g.beginPath(); g.moveTo(-17, -16); g.bezierCurveTo(-17, -42, 19, -42, 19, -16); g.bezierCurveTo(19, 0, 0, 2, 0, 16);
      g.lineWidth = 20; g.strokeStyle = INK; g.stroke(); g.lineWidth = 8; g.strokeStyle = COL.gold; g.stroke();
      g.beginPath(); g.arc(0, 32, 9, 0, 7); fillStroke(g, COL.gold, 6);
    } else {
      g.beginPath(); g.moveTo(0, -34); g.quadraticCurveTo(24, -6, 18, 8); g.arc(0, 8, 18, 0, Math.PI); g.quadraticCurveTo(-24, -6, 0, -34); g.closePath(); fillStroke(g, COL.blue, 6);
    }
    g.restore();
  }

  // while the result card is up the main actor keeps a lasting twinkle: four glints on a ring around it, out of phase
  drawTwinkle(g, t0) {
    const m = this.main0 || this.things.find((q) => q.role === 'actor' && !q.d.show);
    if (!m || m.state !== 'alive' || this.s < 0.5) return;
    const mo = m.motion(t0), cx = m.x + mo.dx, cy = m.y + mo.dy - m.h * (m.ay - 0.5), fade = clamp((this.s - 0.5) / 0.4);
    g.save(); g.fillStyle = COL.gold;
    for (let i = 0; i < 4; i++) {
      const ph = (t0 * 0.85 + i * 0.25) % 1, q = Math.sin(Math.PI * ph), a = i * 1.7 + 0.6, r = 9 + q * 13;
      const x = cx + Math.cos(a) * (m.w * 0.5 + 8), y = cy + Math.sin(a) * (m.h * 0.5 + 8) * 0.9;
      g.globalAlpha = q * 0.95 * fade; g.beginPath();
      g.moveTo(x, y - r); g.lineTo(x + r * 0.28, y - r * 0.28); g.lineTo(x + r, y); g.lineTo(x + r * 0.28, y + r * 0.28); g.lineTo(x, y + r); g.lineTo(x - r * 0.28, y + r * 0.28); g.lineTo(x - r, y); g.lineTo(x - r * 0.28, y - r * 0.28); g.closePath(); g.fill();
    }
    g.restore();
  }

  drawEraser(g) {
    const p = this.ep || { x: this.cur.x + 34, y: this.cur.y - 30 }, mv = this.t - this.moveT < 0.1;
    if (this.ek > 1.12) {
      // the true footprint of a wide brush: a soft ring of its radius around the finger
      g.save(); g.beginPath(); g.arc(this.cur.x, this.cur.y, this.ek * BRUSH, 0, 7); g.lineWidth = 6; g.strokeStyle = 'rgba(255,255,255,0.55)'; g.stroke(); g.lineWidth = 2; g.strokeStyle = 'rgba(58,47,69,0.4)'; g.stroke(); g.restore();
    }
    g.save(); g.translate(p.x, p.y); g.rotate(0.55 + this.etilt + (mv ? Math.sin(this.t * 30) * 0.05 : 0));
    const es = Math.min(1.9, 1 + (this.ek - 1) * 0.45); g.scale(es, es);
    if (mv) g.scale(1.04, 0.96);
    rr(g, -40, -64, 80, 138, 18); fillStroke(g, '#e07a7a', 7);
    rr(g, -40, -8, 80, 40, 6); fillStroke(g, COL.blue, 7);
    rr(g, -40, -64, 80, 138, 18); g.lineWidth = 7; g.stroke();
    g.restore();
  }
}
