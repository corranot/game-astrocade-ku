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

/** Display scale of the hammer at size L: s = base + k * ln(1 + L), so growth feels fast early and the hammer
 * stays on screen when L reaches tens of thousands. */
export function hammerScale(cfg, L) {
  return cfg.hammer.baseScale + cfg.hammer.scaleK * Math.log(1 + Math.max(0, L));
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

/** Growth an object gives when broken, before the run multiplier: its own v when the zone sets one, else small
 * objects give cfg.growth.smallValue and labelled ones part of their req. */
export function valueOf(cfg, req, v = 0) {
  if (v > 0) return v;
  return req <= 1 ? cfg.growth.smallValue : Math.max(2, Math.round(req * cfg.growth.labelValue));
}

/** Places a zone's objects on a jittered grid inside its w x d area, biggest first, never overlapping. */
export function layoutZone(cfg, zi, random) {
  const Z = cfg.zones[zi], out = [];
  const list = [];
  for (const it of Z.items) for (let k = 0; k < it.n; k++) list.push({ kind: it.kind, req: it.req, r: cfg.kinds[it.kind].r, hp: it.hp || 1, boss: !!it.boss, v: it.v || 0 });
  list.sort((a, b) => b.r - a.r);
  for (const o of list) {
    if (o.boss) { out.push({ ...o, x: 0, z: Z.z - Z.d * 0.12 }); continue; } // the finale sits in the middle
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

/**
 * The zones of world wi: the base zones (cfg.zones) with the items of the zones the world replaces. Sizes,
 * positions and clear shares stay, so the island and the pacing are the same in every world.
 */
export function worldZones(cfg, base, wi) {
  const W = cfg.worlds && cfg.worlds[wi % cfg.worlds.length];
  return base.map((Z, i) => (W && W.zones && W.zones[i] ? { ...Z, items: W.zones[i] } : Z));
}

/** A fresh run. mult multiplies every gain (1 on the first run, then x2 per rebirth). */
export function createRun(cfg, random, mult = 1) {
  const objects = [];
  cfg.zones.forEach((Z, zi) => {
    for (const o of layoutZone(cfg, zi, random)) objects.push({ id: objects.length, zone: zi, alive: true, maxHp: o.hp, ...o });
  });
  return { L: 1, mult, zone: 0, objects, broken: 0, combo: 0, comboT: 0, t: 0, done: false, tier: 0, slams: 0 };
}

/** Objects of zone zi. */
export const zoneObjects = (R, zi) => R.objects.filter((o) => o.zone === zi);

/** Small objects (req 1) grow back, so a zone never runs out of things to hit. */
export const isSmall = (o) => o.req <= 1 && !o.boss;

/** Share (0..1) of the current zone's numbered objects that are broken (small ones grow back, so they don't count). */
export function zoneProgress(R) {
  const list = zoneObjects(R, R.zone).filter((o) => !isSmall(o));
  return list.length ? list.filter((o) => !o.alive).length / list.length : 1;
}

/** True when the current zone is cleared: enough broken, and its boss (if any) broken. */
export function zoneCleared(cfg, R) {
  const list = zoneObjects(R, R.zone);
  return zoneProgress(R) >= cfg.zones[R.zone].clear && !list.some((o) => o.boss && o.alive);
}

/** Advances the run clock: the combo lapses after cfg.growth.combo seconds without a break, and broken small
 * objects of the current zone grow back after cfg.growth.respawn seconds. Returns the ids that grew back. */
export function tick(cfg, R, dt) {
  R.t += dt;
  if (R.comboT > 0) { R.comboT -= dt; if (R.comboT <= 0) R.combo = 0; }
  const back = [];
  for (const o of R.objects) {
    if (o.alive || !(o.regrow > 0)) continue;
    o.regrow -= dt;
    if (o.regrow <= 0) { if (o.zone === R.zone && !R.done) { o.alive = true; o.hp = o.maxHp; back.push(o.id); } else o.regrow = 0; }
  }
  return back;
}

/**
 * A slam landing at (x, z). Returns the events in order:
 * hit {id, hp} (a multi-hit object took a hit and holds), break {id, gain, d, splash} (splash: a small object
 * broken by the shockwave, outside the direct reach), bonk {id} (in reach but too big), grow {L, from}, tier {tier}, open {id} (a labelled object is
 * now breakable), clear {zone}, done. Only the current zone's objects can be hit.
 */
export function slam(cfg, R, x, z) {
  const ev = [];
  if (R.done) return ev;
  R.slams++;
  const r = reach(cfg, R.L), from = R.L, rs = r * (cfg.growth.splash || 1);
  const hit = [], bonk = [], dist = new Map();
  for (const o of R.objects) {
    if (!o.alive || o.zone !== R.zone) continue;
    const d = Math.hypot(o.x - x, o.z - z);
    if (d <= r + o.r * 0.6) (o.req <= R.L ? hit : bonk).push(o);
    else if (isSmall(o) && d <= rs + o.r * 0.6) hit.push(o); // the shockwave: small things around the hit break too
    else continue;
    dist.set(o.id, d);
  }
  for (const o of bonk) ev.push({ type: 'bonk', id: o.id, req: o.req });
  if (!hit.length) return ev;
  R.combo++; R.comboT = cfg.growth.combo;
  let gain = 0;
  for (const o of hit) {
    if (--o.hp > 0) { ev.push({ type: 'hit', id: o.id, hp: o.hp }); continue; }
    o.alive = false; R.broken++;
    if (isSmall(o)) o.regrow = cfg.growth.respawn;
    const g = valueOf(cfg, o.req, o.v) * R.mult;
    gain += g;
    ev.push({ type: 'break', id: o.id, gain: g, d: dist.get(o.id), splash: dist.get(o.id) > r + o.r * 0.6 });
  }
  if (!gain) return ev;
  const wasOpen = new Set(R.objects.filter((o) => o.alive && o.req <= R.L).map((o) => o.id));
  R.L += gain;
  ev.push({ type: 'grow', L: R.L, from });
  const t = tierOf(cfg, R.L);
  if (t > R.tier) { R.tier = t; ev.push({ type: 'tier', tier: t }); }
  for (const o of R.objects) if (o.alive && o.req > 1 && o.req <= R.L && !wasOpen.has(o.id)) ev.push({ type: 'open', id: o.id });
  if (zoneCleared(cfg, R)) {
    ev.push({ type: 'clear', zone: R.zone });
    if (R.zone + 1 < cfg.zones.length) R.zone++;
    else { R.done = true; ev.push({ type: 'done' }); }
  }
  return ev;
}

/** The best spot to slam right now for an autopilot: the point that breaks the most growth, numbered objects
 * first (they move the zone on, as a player would go for them), or null. */
export function bestSlam(cfg, R) {
  const r = reach(cfg, R.L);
  let best = null, bestV = 0;
  const live = R.objects.filter((o) => o.alive && o.zone === R.zone && o.req <= R.L);
  for (const c of live) {
    let v = 0;
    for (const o of live) if (Math.hypot(o.x - c.x, o.z - c.z) <= r + o.r * 0.6) v += (valueOf(cfg, o.req, o.v) + (isSmall(o) ? 0 : 1000)) / o.hp;
    if (v > bestV) { bestV = v; best = { x: c.x, z: c.z }; }
  }
  return best;
}

/** Day number of a local date (days since 1970-01-01 in the player's own calendar), so the goal turns at midnight. */
export function dayNumber(d) { return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 864e5); }

/** The daily goal for day number day: one of cfg.daily.goals. Each day steps 1 to len-1 places on from the day
 * before (the step comes from the seeded rng of that day), counted from a fixed anchor day, so the type never
 * repeats two days running and every player gets the same goal on the same date. Returns { type, n }. */
export function dailyGoal(cfg, day) {
  const G = cfg.daily.goals, n = G.length, anchor = 20000; // 2024-10-04
  let i = 0;
  for (let d = anchor + 1; d <= day; d++) i = (i + 1 + Math.floor(rng(cfg.seed * 7919 + d)() * (n - 1))) % n;
  return { type: G[i].type, n: G[i].n };
}

// ---------------------------------------------------------------- cutscenes and adaptive quality

/** Smootherstep easing of k (clamped to 0..1): starts and ends at rest. */
export function ease(k) { k = Math.max(0, Math.min(1, k)); return k * k * k * (k * (k * 6 - 15) + 10); }

/** Length in seconds of a cutscene track: the time of its last key. */
export function cineLen(keys) { return keys.length ? keys[keys.length - 1].t : 0; }

/**
 * Camera pose at time t on a cutscene track. keys = [{ t, pos: [x, y, z], look: [x, y, z], fov }], sorted by t.
 * The whole track's time is eased (it leaves and arrives at rest), and the path runs through every key on a
 * Catmull-Rom curve, so it never stops at a middle key. Before the first key: the first; after the last: the last.
 * Writes into out ({ pos, look, fov }) and returns it.
 */
export function cinePose(keys, t, out = { pos: [0, 0, 0], look: [0, 0, 0], fov: 0 }) {
  const n = keys.length, T = cineLen(keys);
  if (n === 1 || T <= 0) { const k = keys[0]; out.pos = k.pos.slice(); out.look = k.look.slice(); out.fov = k.fov; return out; }
  const tt = ease(t / T) * T;
  let i = 0; while (i < n - 2 && tt > keys[i + 1].t) i++;
  const a = keys[i], b = keys[i + 1], p0 = keys[Math.max(0, i - 1)], p3 = keys[Math.min(n - 1, i + 2)];
  const u = Math.max(0, Math.min(1, (tt - a.t) / Math.max(1e-6, b.t - a.t))), u2 = u * u, u3 = u2 * u;
  const cr = (q0, q1, q2, q3) => 0.5 * (2 * q1 + (-q0 + q2) * u + (2 * q0 - 5 * q1 + 4 * q2 - q3) * u2 + (-q0 + 3 * q1 - 3 * q2 + q3) * u3);
  for (let j = 0; j < 3; j++) { out.pos[j] = cr(p0.pos[j], a.pos[j], b.pos[j], p3.pos[j]); out.look[j] = cr(p0.look[j], a.look[j], b.look[j], p3.look[j]); }
  out.fov = a.fov + (b.fov - a.fov) * u;
  return out;
}

/**
 * How long a cutscene may play: its full length the first time, cfg.cine.repeat of it after that, and never past
 * what is left of the run's cutscene time (cfg.cine.maxPerRun). Below cfg.cine.minLen it is not worth playing: 0.
 */
export function cineFit(cfg, len, seen, used) {
  const C = cfg.cine, d = Math.min(seen ? len * C.repeat : len, C.maxPerRun - used);
  return d >= C.minLen ? d : 0;
}

/**
 * Adaptive quality, once per check window of win seconds with that window's median frame time (ms).
 * Slow (over q.dropMs): the render scale steps down by q.resStep to q.resMin, then the tier drops (scale back to 1).
 * Fast (under q.upMs) for q.upAfter seconds: the scale steps back up, then the tier climbs, but never to a tier
 * that has failed twice and never past start. Returns a new state { tier, rs, okT, fails }; s is not changed.
 */
export function adaptQuality(q, s, ms, win) {
  const n = { tier: s.tier, rs: s.rs, okT: s.okT, fails: s.fails.slice() };
  const step = (v, d) => Math.round((v + d) * 100) / 100;
  if (ms > q.dropMs) {
    n.okT = 0;
    if (n.rs > q.resMin) n.rs = Math.max(q.resMin, step(n.rs, -q.resStep));
    else if (n.tier > 0) { n.fails[n.tier] = (n.fails[n.tier] || 0) + 1; n.tier--; n.rs = 1; }
  } else if (ms < q.upMs) {
    n.okT += win;
    if (n.okT >= q.upAfter) {
      n.okT = 0;
      if (n.rs < 1) n.rs = Math.min(1, step(n.rs, q.resStep));
      else if (n.tier < q.start && (n.fails[n.tier + 1] || 0) < 2) { n.tier++; n.rs = q.resMin; }
    }
  } else n.okT = 0;
  return n;
}
