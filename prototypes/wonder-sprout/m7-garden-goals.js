// PROTOTYPE - NOT FOR PRODUCTION
/**
 * Module 7: garden goals. One small goal at a time, icon-first (no words to read): pop mushrooms, crack
 * crystals, hit SUPER NOVAs, reach a combo, gather gems or wood, break the pinata, hatch an egg. Each goal
 * pays star gems that fly to the counter; every fourth pays a gift egg. Goals grow a little each lap, so there
 * is always a next thing a minute away. The chip sits under the gem counter and hides during the tutorial,
 * toasts and drawers so it never covers anything.
 */
import { W, HUD, VIEW, clamp, easeOutBack } from './m0-orchestrator.js';
import { put, PAL, rgba, mix } from './m1-art-bakery.js';

/** Goal kinds in order: event, icon, base target. */
export const GOALS = [
  { ev: 'pop', icon: 'mushroom', n: 8 }, { ev: 'crystal', icon: 'geode', n: 3 }, { ev: 'gems', icon: 'gem', n: 150 },
  { ev: 'nova', icon: 'nova', n: 2 }, { ev: 'combo', icon: 'combo', n: 4 }, { ev: 'wood', icon: 'log', n: 2 },
  { ev: 'pinata', icon: 'pinata', n: 1 }, { ev: 'hatch', icon: 'egg', n: 1 },
];
/** The goal at chain index i: kind, target (grows 50% per lap of the list) and gem reward. */
export function goalAt(i, E) {
  const g = GOALS[i % GOALS.length], lap = Math.floor(i / GOALS.length);
  const n = g.ev === 'combo' ? g.n + lap : g.ev === 'hatch' || g.ev === 'pinata' ? g.n : Math.round(g.n * (1 + lap * 0.5));
  return { ...g, n, reward: Math.round((E.goalGems || 60) * (1 + i * 0.15)), egg: (i + 1) % 4 === 0 };
}

export function createGoals(world) {
  const { bus } = world, S = () => world.state;
  const G = { pulse: 0, show: { x: 0 }, done: 0, swap: 0 };
  const cur = () => goalAt(S().quest.i, world.cfg.economy);
  const add = (ev, k = 1) => {
    const q = S().quest, g = cur(); if (g.ev !== ev || G.done > 0) return;
    q.p = ev === 'combo' ? Math.max(q.p, k) : q.p + k; G.pulse = 1;
    if (q.p >= g.n) finish(g);
  };
  const finish = (g) => {
    const q = S().quest; G.done = 1.2; q.p = g.n;
    const r = G.rect(); const x = r.x + r.w / 2, y = r.y + r.h / 2;
    world.kingdom.loot(x, y, 'gem', g.reward, 0.6);
    if (g.egg) world.kingdom.addEgg('gift', x, y);
    world.vfx.confetti(x, y, 24); world.vfx.sparks(x, y, 12, 'star', 300);
    world.audio.goal(); bus.emit('goal:done', { i: q.i });
    world.saver.soon();
  };
  bus.on('hit', (e) => { if (e.type === 'mushroom' && e.by !== 'helper') add('pop'); if (e.by === 'hero' && e.combo) add('combo', e.combo); });
  bus.on('burst', (e) => add(e.type === 'pinata' ? 'pinata' : 'crystal'));
  bus.on('nova', () => add('nova'));
  bus.on('orb:arrive', (o) => { if (o.kind === 'gem') add('gems', o.value || 1); if (o.kind === 'wood') add('wood', o.value || 1); });
  bus.on('egg:hatch', () => add('hatch'));

  G.rect = () => { const w = 264, h = 64, x = world.ui.lang === 'ar' ? W - 24 - w : 24; return { x, y: HUD.y + HUD.h + 16, w, h }; };
  G.visible = () => { const U = world.ui, f = S().ftue; return world.mode === 'play' && (f.skipped || (f.done & 31) === 31) && U.ftue == null && U.logo <= 0.05 && !U.open && !U.sheet && !U.toasts.length; };
  G.update = (dt) => {
    G.pulse = Math.max(0, G.pulse - dt * 3);
    if (G.done > 0) { G.done -= dt; if (G.done <= 0) { const q = S().quest; q.i++; q.p = 0; G.swap = 1; } }
    G.swap = Math.max(0, G.swap - dt * 2.5);
    G.show.x += ((G.visible() ? 1 : 0) - G.show.x) * Math.min(1, dt * 8);
  };
  G.draw = (ctx, t) => {
    const k = G.show.x; if (k < 0.02) return;
    const g = cur(), q = S().quest, r = G.rect(), A = world.art, p = clamp(q.p / g.n, 0, 1);
    const sc = (1 + G.pulse * 0.06) * (G.swap > 0 ? easeOutBack(1 - G.swap) : 1) * (0.6 + 0.4 * k);
    ctx.save(); ctx.globalAlpha = k; ctx.translate(r.x + r.w / 2, r.y + r.h / 2); ctx.scale(sc, sc); ctx.translate(-r.w / 2, -r.h / 2);
    // body: velvet pill with a gold rim that glows while the goal is complete
    ctx.shadowColor = rgba(PAL.plum, 0.35); ctx.shadowBlur = 12; ctx.shadowOffsetY = 4;
    rr(ctx, 0, 0, r.w, r.h, r.h / 2); ctx.fillStyle = rgba(PAL.plum, 0.7); ctx.fill(); ctx.shadowColor = 'transparent';
    ctx.lineWidth = 3; ctx.strokeStyle = G.done > 0 ? PAL.gold : rgba(mix(PAL.gold, PAL.cream, 0.4), 0.75); ctx.stroke();
    // icon disc
    ctx.fillStyle = mix(PAL.cream, PAL.gold, 0.25); ctx.beginPath(); ctx.arc(32, 32, 24, 0, Math.PI * 2); ctx.fill();
    const ic = g.icon;
    if (ic === 'mushroom' && A.mushroom) put(ctx, A.mushroom[0], 32, 38, 0.42);
    else if (ic === 'geode' && A.geode) put(ctx, A.geode, 32, 38, 0.42);
    else if (ic === 'pinata' && A.pinata) put(ctx, A.pinata, 32, 36, 0.36);
    else if (ic === 'gem' && A.gem) put(ctx, A.gem, 32, 32, 1.4);
    else if (ic === 'log' && A.log) put(ctx, A.log, 32, 32, 1.3);
    else if (ic === 'egg' && A.eggs) put(ctx, A.eggs.meadow, 32, 50, 0.42);
    else if (ic === 'nova') { ctx.strokeStyle = PAL.gold; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(32, 32, 14, 0, Math.PI * 2); ctx.stroke(); if (A.star) put(ctx, A.star, 32, 32, 0.9, 0.9, t); }
    else if (ic === 'combo') world.ui.text(ctx, '×', 32, 32, 34, PAL.coral);
    // progress bar with the count on it
    const bx = 64, bw = r.w - 64 - 72, by = 22;
    rr(ctx, bx, by, bw, 20, 10); ctx.fillStyle = rgba(PAL.velvet, 0.7); ctx.fill();
    if (p > 0) { rr(ctx, bx, by, Math.max(20, bw * p), 20, 10); ctx.fillStyle = p >= 1 ? mix(PAL.gold, PAL.cream, 0.3) : PAL.gold; ctx.fill(); }
    world.ui.text(ctx, g.ev === 'combo' ? '×' + g.n : (q.p > 999 ? Math.floor(q.p) : Math.floor(q.p)) + '/' + g.n, bx + bw / 2, by + 11, 18, PAL.cream, 900, 'center', bw - 8);
    // reward
    if (g.egg && A.eggs) put(ctx, A.eggs.gift, r.w - 40, 48, 0.4, 0.4, Math.sin(t * 3) * 0.1);
    else if (A.gem) { put(ctx, A.gem, r.w - 52, 32, 1.1, 1.1, Math.sin(t * 3) * 0.2); world.ui.text(ctx, String(g.reward), r.w - 22, 33, 18, PAL.gold, 900, 'center', 40); }
    ctx.restore();
  };
  return G;
}
function rr(ctx, x, y, w, h, r) { ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h); }
