// PROTOTYPE - NOT FOR PRODUCTION
// Rules of +1 Mega Hammer, with no Three.js and no DOM so they run under node --test.
// A run is a list of zones. Each zone holds breakable objects; an object breaks when a slam lands within the
// hammer's reach and the hammer's size L is at least the object's req. Every break adds to L, so the hammer grows
// and objects that were too big open up. A zone is cleared at cfg.zones[i].clear of its objects broken.

/** Seeded random numbers in [0, 1) (mulberry32). Gameplay randomness goes through this, never Math.random. */
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Display scale of the hammer at size L: s = base + k * sqrt(L), so growth feels fast early and stays on screen late. */
export function hammerScale(cfg, L) {
  return cfg.hammer.baseScale + cfg.hammer.scaleK * Math.sqrt(Math.max(0, L));
}

/** Reach of a slam in world units at size L. */
export function reach(cfg, L) {
  return cfg.hammer.hitR * hammerScale(cfg, L);
}

/** Evolution tier (0-based) for size L: the last threshold in cfg.hammer.tiers that L has reached. */
export function tierOf(cfg, L) {
  const t = cfg.hammer.tiers;
  let i = 0;
  while (i + 1 < t.length && L >= t[i + 1]) i++;
  return i;
}

/** Growth an object gives when broken, before the run multiplier. Labelled objects give part of their req. */
export function valueOf(cfg, req) {
  return req <= 1 ? cfg.growth.smallValue : Math.max(1, Math.round(req * cfg.growth.labelValue));
}

/** Places a zone's objects on a jittered grid inside its w x d area, biggest first, never overlapping. */
export function layoutZone(cfg, zi, random) {
  const Z = cfg.zones[zi], out = [];
  const list = [];
  for (const it of Z.items) for (let k = 0; k < it.n; k++) list.push({ kind: it.kind, req: it.req, r: cfg.kinds[it.kind].r });
  list.sort((a, b) => b.r - a.r);
  for (const o of list) {
    let best = null, bestGap = -Infinity;
    for (let tries = 0; tries < 400; tries++) {
      const x = (random() - 0.5) * (Z.w - 2 * o.r), z = Z.z + (random() - 0.5) * (Z.d - 2 * o.r);
      let gap = Infinity;
      for (const p of out) gap = Math.min(gap, Math.hypot(p.x - x, p.z - z) - p.r - o.r);
      if (gap > 0.08) { best = { x, z }; break; }
      if (gap > bestGap) { bestGap = gap; best = { x, z }; }
    }
    out.push({ ...o, x: best.x, z: best.z });
  }
  return out;
}

/** A fresh run. mult multiplies every gain (1 on the first run, then x2 per rebirth). */
export function createRun(cfg, random, mult = 1) {
  const objects = [];
  cfg.zones.forEach((Z, zi) => {
    for (const o of layoutZone(cfg, zi, random)) objects.push({ id: objects.length, zone: zi, alive: true, ...o });
  });
  return { L: 1, mult, zone: 0, objects, broken: 0, combo: 0, comboT: 0, t: 0, done: false, tier: 0, slams: 0 };
}

/** Objects of zone zi. */
export const zoneObjects = (R, zi) => R.objects.filter((o) => o.zone === zi);

/** Share (0..1) of the current zone that is broken. */
export function zoneProgress(R) {
  const list = zoneObjects(R, R.zone);
  return list.length ? list.filter((o) => !o.alive).length / list.length : 1;
}

/** Advances the run clock: the combo lapses after cfg.growth.combo seconds without a break. */
export function tick(cfg, R, dt) {
  R.t += dt;
  if (R.comboT > 0) { R.comboT -= dt; if (R.comboT <= 0) R.combo = 0; }
}

/**
 * A slam landing at (x, z). Returns the events in order:
 * break {id, gain}, bonk {id} (in reach but too big), grow {L, from}, tier {tier}, open {id} (a labelled object is
 * now breakable), clear {zone}, done. Only the current zone's objects can be hit.
 */
export function slam(cfg, R, x, z) {
  const ev = [];
  if (R.done) return ev;
  R.slams++;
  const r = reach(cfg, R.L), from = R.L;
  const hit = [], bonk = [];
  for (const o of R.objects) {
    if (!o.alive || o.zone !== R.zone) continue;
    if (Math.hypot(o.x - x, o.z - z) > r + o.r * 0.6) continue;
    (o.req <= R.L ? hit : bonk).push(o);
  }
  for (const o of bonk) ev.push({ type: 'bonk', id: o.id, req: o.req });
  if (!hit.length) return ev;
  R.combo++; R.comboT = cfg.growth.combo;
  let gain = 0;
  for (const o of hit) {
    o.alive = false; R.broken++;
    const g = valueOf(cfg, o.req) * R.mult;
    gain += g;
    ev.push({ type: 'break', id: o.id, gain: g });
  }
  const wasOpen = new Set(R.objects.filter((o) => o.alive && o.req <= R.L).map((o) => o.id));
  R.L += gain;
  ev.push({ type: 'grow', L: R.L, from });
  const t = tierOf(cfg, R.L);
  if (t > R.tier) { R.tier = t; ev.push({ type: 'tier', tier: t }); }
  for (const o of R.objects) if (o.alive && o.req > 1 && o.req <= R.L && !wasOpen.has(o.id)) ev.push({ type: 'open', id: o.id });
  if (zoneProgress(R) >= cfg.zones[R.zone].clear) {
    ev.push({ type: 'clear', zone: R.zone });
    if (R.zone + 1 < cfg.zones.length) R.zone++;
    else { R.done = true; ev.push({ type: 'done' }); }
  }
  return ev;
}

/** The best spot to slam right now for an autopilot: the point that breaks the most growth, or null. */
export function bestSlam(cfg, R) {
  const r = reach(cfg, R.L);
  let best = null, bestV = 0;
  const live = R.objects.filter((o) => o.alive && o.zone === R.zone && o.req <= R.L);
  for (const c of live) {
    let v = 0;
    for (const o of live) if (Math.hypot(o.x - c.x, o.z - c.z) <= r + o.r * 0.6) v += valueOf(cfg, o.req);
    if (v > bestV) { bestV = v; best = { x: c.x, z: c.z }; }
  }
  return best;
}
