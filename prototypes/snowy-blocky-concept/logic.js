// PROTOTYPE - NOT FOR PRODUCTION
// Snowy Snapshot rules: pure functions (no THREE, no DOM) so node tests can run them.
// Terrain height, walkable areas, the day clock, photo rating, the book, stamps, unlocks, the economy, daily
// requests and rare visitors, save round trip, the guide target, the edge arrow, the tap/drag classifier and the
// adaptive quality step.

/** Seeded random number generator (mulberry32). Returns a function giving 0..1. */
export function rng(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

const hash2 = (x, z) => { const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453; return s - Math.floor(s); };
/** Smooth value noise in about -1..1. */
export function noise2(x, z) {
  const xi = Math.floor(x), zi = Math.floor(z), xf = x - xi, zf = z - zi;
  const u = xf * xf * (3 - 2 * xf), v = zf * zf * (3 - 2 * zf);
  const a = hash2(xi, zi), b = hash2(xi + 1, zi), c = hash2(xi, zi + 1), d = hash2(xi + 1, zi + 1);
  return (a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v) * 2 - 1;
}

/** Signed distance (metres, about) from the edge of area ellipse `a`: negative inside. */
export function areaDist(a, x, z) {
  const dx = (x - a.c[0]) / a.r[0], dz = (z - a.c[1]) / a.r[1];
  return (Math.sqrt(dx * dx + dz * dz) - 1) * Math.min(a.r[0], a.r[1]);
}

/** Distance from the corridor through gate g (negative inside a 10 m wide, 20 m long strip that overlaps both areas). */
export function gateDist(g, x, z) { return Math.max(Math.abs(x) - 5, Math.abs(z - g.z) - 10); }

/** Index of the area at (x, z), or -1 outside every area. */
export function areaAt(cfg, x, z) {
  let best = -1, bd = 1e9;
  cfg.areas.forEach((a, i) => { const d = areaDist(a, x, z); if (d < 0 && d < bd) { bd = d; best = i; } });
  return best;
}

/** Ground height at (x, z): gentle drifts inside the valley, walls outside it, a flat lake. */
export function terrainH(cfg, x, z) {
  let d = 1e9;
  for (const a of cfg.areas) d = Math.min(d, areaDist(a, x, z));
  for (const g of cfg.gates) d = Math.min(d, gateDist(g, x, z));
  let h = noise2(x * 0.06, z * 0.06) * 0.9 + noise2(x * 0.17 + 7, z * 0.17) * 0.25;
  if (d > -4) { const k = Math.min(1, (d + 4) / 16); h += k * k * (16 + noise2(x * 0.09, z * 0.09) * 6); }
  const lake = cfg.areas[1] && cfg.areas[1].lake;
  if (lake) { const r = Math.hypot(x - lake[0], z - lake[1]); if (r < lake[2] + 4) { const k = Math.max(0, Math.min(1, (r - lake[2]) / 4)); h = h * k - 0.15 * (1 - k); } }
  return h;
}

/** Is (x, z) a place the hero may stand, given how many areas are open? */
export function walkable(cfg, open, x, z) {
  for (let i = 0; i < cfg.areas.length && i < open; i++) if (areaDist(cfg.areas[i], x, z) < -1.5) return true;
  for (const g of cfg.gates) if (g.area < open && gateDist(g, x, z) < -0.5) return true;
  return false;
}

/** Moves from (x, z) by (dx, dz), sliding along the edge when the full step is blocked. */
export function slide(cfg, open, x, z, dx, dz) {
  if (walkable(cfg, open, x + dx, z + dz)) return [x + dx, z + dz];
  if (walkable(cfg, open, x + dx, z)) return [x + dx, z];
  if (walkable(cfg, open, x, z + dz)) return [x, z + dz];
  return [x, z];
}

// ---- day clock

/** Phase of the in-game day at clock seconds t: { name, k (0..1 inside the phase), night, w (blend weights by name) }. */
export function clockAt(cfg, t) {
  const day = cfg.clock.dayS, ph = cfg.clock.phases;
  let s = ((t % day) + day) % day, i = 0;
  while (i < ph.length - 1 && s >= ph[i][1]) { s -= ph[i][1]; i++; }
  const name = ph[i][0], k = Math.min(1, s / ph[i][1]);
  const w = { day: 0, dusk: 0, night: 0, dawn: 0 };
  // blend 25% into the next phase at the end of each phase so the light never jumps
  const next = ph[(i + 1) % ph.length][0], edge = 0.75;
  if (k > edge) { const b = (k - edge) / (1 - edge); w[name] = 1 - b; w[next] += b; } else w[name] = 1;
  return { name, k, night: name === 'night', w };
}

/** Local calendar day as a number YYYYMMDD. */
export function dateKey(ms) { const d = new Date(ms); return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate(); }

// ---- book data

/** Species of one area, in book order. */
export function areaSpecies(cfg, area) { return cfg.species.filter((s) => s.area === area); }
export function speciesById(cfg, id) { return cfg.species.find((s) => s.id === id) || null; }
export function rareById(cfg, id) { return cfg.rares.find((r) => r.id === id) || null; }

/** The rare visitor of calendar day `key`, the same for every player that day. */
export function dailyRare(cfg, key) { const n = Math.min(cfg.daily.rareCount, cfg.rares.length); return cfg.rares[Math.floor(rng(key * 7 + 3)() * 1e6) % n].id; }

const REQ_TYPES = ['species', 'stars3', 'night', 'two', 'pose', 'area'];
/** Today's photo requests: `n` different kinds, seeded by the date, only things the player can do now. */
export function dailyRequests(cfg, key, open) {
  const r = rng(key * 13 + 5), kinds = REQ_TYPES.filter((k) => k !== 'area' || open > 1), out = [];
  while (out.length < cfg.daily.requests && kinds.length) {
    const k = kinds.splice(Math.floor(r() * kinds.length), 1)[0];
    let arg = null;
    if (k === 'species') { const pool = cfg.species.filter((s) => s.area < open && !s.night && !s.shy); arg = pool[Math.floor(r() * pool.length)].id; }
    if (k === 'area') arg = 1 + Math.floor(r() * (open - 1));
    out.push({ type: k, arg, done: false });
  }
  return out;
}

// ---- photo rating

/** Share of the frame height an object of `radius` at `dist` fills with a vertical field of view of `fovDeg`. */
export function coverage(dist, radius, fovDeg) { return (2 * Math.atan(radius / Math.max(0.1, dist))) / (fovDeg * Math.PI / 180); }

/** True when a trunk (circle r 0.9 at [x, z]) blocks the ground line from the camera to the subject. */
export function occluded(trees, cx, cz, tx, tz) {
  const dx = tx - cx, dz = tz - cz, L2 = dx * dx + dz * dz || 1;
  for (const t of trees) {
    const u = ((t[0] - cx) * dx + (t[1] - cz) * dz) / L2;
    if (u < 0.15 || u > 0.85) continue;
    const px = cx + dx * u - t[0], pz = cz + dz * u - t[1];
    if (px * px + pz * pz < 0.9 * 0.9) return true;
  }
  return false;
}

/**
 * Stars for a shot: 1 + framing + pose, max 3. Every photo of something is at least 1 star.
 * shot = { cover, occluded, inPose, night, flash }
 */
export function rate(cfg, shot) {
  const framed = !shot.occluded && shot.cover >= cfg.photo.minCover && shot.cover <= cfg.photo.maxCover ? 1 : 0;
  let s = 1 + framed + (shot.inPose ? 1 : 0);
  if (shot.night && !shot.flash) s = Math.min(s, cfg.photo.nightCapNoFlash);
  return Math.max(1, Math.min(3, s));
}

// ---- state

/** A fresh game. */
export function createState(cfg, now = 0) {
  return {
    flakes: 0, slots: {}, rare: {}, open: 1, entered: 1, owned: [], outfit: null, cam: null,
    halves: [], pages: [], ftue: 0, ftueDone: false, clock: cfg.clock.startS,
    day: 0, req: [], rareDay: 0, mailDay: 0, photos: 0, scenery: [], started: now, hints: 0, // hints: bit flags of one-time tips already shown
  };
}

/** Stamps earned: one per filled slot (3 per species) and one per rare visitor. */
export function stamps(S) {
  let n = 0;
  for (const k in S.slots) { const b = S.slots[k] | 0; n += (b & 1) + ((b >> 1) & 1) + ((b >> 2) & 1); }
  for (const k in S.rare) if (S.rare[k]) n++;
  return n;
}

/** Number of areas open for this many stamps. */
export function openFor(cfg, n) { let o = 0; for (const a of cfg.areas) if (n >= a.unlock) o++; return Math.max(1, o); }

/** Brings the daily state up to calendar day `key`. Returns { newDay, mail } (mail: a returning player's first session today). */
export function rollDay(cfg, S, key) {
  if (S.day === key) return { newDay: false, mail: false };
  const mail = S.day > 0 && S.mailDay !== key && S.photos > 0;
  S.day = key; S.req = dailyRequests(cfg, key, S.open);
  return { newDay: true, mail };
}

/**
 * Applies a photo. shot = { id (species or rare id, or null for scenery), stars, inPose, night, area, others, now }.
 * Returns what happened: { flakes, filled: [slot names], newSpecies, rare, half, page, opened (area index or -1), requests: [indices] }.
 */
export function applyPhoto(cfg, S, shot) {
  const e = cfg.economy, out = { flakes: 0, filled: [], newSpecies: false, rare: false, half: -1, page: -1, opened: -1, requests: [] };
  S.photos++;
  if (!shot.id) {
    const now = shot.now || 0;
    S.scenery = S.scenery.filter((t) => now - t < 60000);
    if (S.scenery.length < cfg.photo.sceneryPerMin) { S.scenery.push(now); out.flakes = e.scenery; }
    S.flakes += out.flakes; return out;
  }
  const before = stamps(S);
  const rare = rareById(cfg, shot.id);
  let mul = 1;
  if (rare) {
    if (!S.rare[shot.id]) { S.rare[shot.id] = 1; out.filled.push('rare'); out.newSpecies = true; }
    // the big bonus is for today's first photo of the visitor; later shots of it pay like any repeat
    out.rare = true; mul = S.rareDay !== S.day ? e.rareMul : e.repeatK; S.rareDay = S.day;
  } else {
    const b = S.slots[shot.id] | 0;
    let nb = b | 1; if (shot.inPose) nb |= 2; if (shot.stars >= 3) nb |= 4;
    if (!(b & 1)) { out.filled.push('hello'); out.newSpecies = true; }
    if ((nb & 2) && !(b & 2)) out.filled.push('pose');
    if ((nb & 4) && !(b & 4)) out.filled.push('star');
    S.slots[shot.id] = nb;
    mul = out.filled.length ? e.firstSlotMul : e.repeatK; // a repeat of a slot already filled pays a little
    // half pages (4 species) and pages (one area) complete when every species in them has its first photo
    const sp = speciesById(cfg, shot.id);
    if (sp && out.newSpecies) {
      const list = areaSpecies(cfg, sp.area), idx = list.findIndex((s) => s.id === sp.id), h = sp.area * 2 + (idx < 4 ? 0 : 1);
      const half = list.slice(idx < 4 ? 0 : 4, idx < 4 ? 4 : 8);
      if (!S.halves.includes(h) && half.every((s) => S.slots[s.id] & 1)) { S.halves.push(h); out.half = h; out.flakes += e.halfPage; }
      if (!S.pages.includes(sp.area) && list.every((s) => S.slots[s.id] & 1)) { S.pages.push(sp.area); out.page = sp.area; out.flakes += e.page; }
    }
  }
  out.flakes += Math.max(1, Math.round(e.photo[shot.stars] * mul));
  S.req.forEach((q, i) => {
    if (q.done) return;
    const ok = (q.type === 'species' && q.arg === shot.id) || (q.type === 'stars3' && shot.stars >= 3) || (q.type === 'night' && shot.night)
      || (q.type === 'two' && shot.others >= 1) || (q.type === 'pose' && shot.inPose) || (q.type === 'area' && shot.area === q.arg);
    if (ok) { q.done = true; out.requests.push(i); out.flakes += e.request; }
  });
  S.flakes += out.flakes;
  const after = stamps(S), o = openFor(cfg, after);
  if (after > before && o > S.open) { out.opened = o - 1; S.open = o; }
  return out;
}

/** Shop item by id. */
export function item(cfg, id) { return cfg.economy.shop.find((s) => s.id === id) || null; }

/** Can the player buy `id` now? Returns 'ok', 'owned', 'needs' or 'poor'. */
export function canBuy(cfg, S, id) {
  const it = item(cfg, id); if (!it) return 'needs';
  if (S.owned.includes(id)) return 'owned';
  if (it.needs && !S.owned.includes(it.needs)) return 'needs';
  return S.flakes >= it.price ? 'ok' : 'poor';
}

/** Buys `id` (outfits and camera colours are worn at once). Returns true on success. */
export function buy(cfg, S, id) {
  if (canBuy(cfg, S, id) !== 'ok') return false;
  const it = item(cfg, id); S.flakes -= it.price; S.owned.push(id);
  if (it.kind === 'outfit') S.outfit = id; if (it.kind === 'cam') S.cam = id;
  return true;
}

/** Which treat brings out species `sp` ('carrot' is free). */
export const treatOwned = (S, t) => t === 'carrot' || S.owned.includes(t);

/** Photo range and field of view from the lenses owned. */
export function lens(cfg, S) {
  const p = cfg.photo;
  if (S.owned.includes('zoom3')) return { range: p.rangeZoom3, fov: p.fovZoom3, zoom: 3 };
  if (S.owned.includes('zoom2')) return { range: p.rangeZoom2, fov: p.fovZoom2, zoom: 2 };
  return { range: p.range, fov: cfg.camera.vfFov, zoom: 1 };
}

// ---- save

/** The save record (a few hundred bytes). */
export function serialize(cfg, S) {
  return { v: cfg.save.version, flakes: Math.floor(S.flakes), slots: S.slots, rare: S.rare, open: S.open, entered: S.entered, owned: S.owned, outfit: S.outfit, cam: S.cam,
    halves: S.halves, pages: S.pages, ftue: S.ftue, ftueDone: S.ftueDone, clock: Math.round(S.clock), day: S.day, req: S.req, rareDay: S.rareDay, mailDay: S.mailDay, photos: S.photos, hints: S.hints };
}

const int = (v, max = 1e9) => Math.max(0, Math.min(max, Math.floor(Number(v) || 0)));
const ids = (cfg) => new Set([...cfg.species.map((s) => s.id), ...cfg.rares.map((r) => r.id)]);

/** Rebuilds a state from a save, dropping any bad field (never throws). */
export function restore(cfg, st) {
  const S = createState(cfg);
  if (!st || typeof st !== 'object' || st.v !== cfg.save.version) return S;
  const known = ids(cfg), shop = new Set(cfg.economy.shop.map((s) => s.id));
  S.flakes = int(st.flakes);
  if (st.slots && typeof st.slots === 'object') for (const k in st.slots) if (known.has(k)) S.slots[k] = int(st.slots[k], 7);
  if (st.rare && typeof st.rare === 'object') for (const k in st.rare) if (known.has(k) && st.rare[k]) S.rare[k] = 1;
  if (Array.isArray(st.owned)) S.owned = st.owned.filter((x) => shop.has(x));
  S.outfit = S.owned.includes(st.outfit) ? st.outfit : null; S.cam = S.owned.includes(st.cam) ? st.cam : null;
  if (Array.isArray(st.halves)) S.halves = st.halves.map((x) => int(x, 99)); if (Array.isArray(st.pages)) S.pages = st.pages.map((x) => int(x, 99));
  S.ftue = int(st.ftue, 99); S.ftueDone = !!st.ftueDone; S.hints = int(st.hints, 255); S.clock = int(st.clock, 1e7); S.photos = int(st.photos);
  S.day = int(st.day, 99991231); S.rareDay = int(st.rareDay, 99991231); S.mailDay = int(st.mailDay, 99991231);
  const argOk = (q) => q.type === 'area' ? Number.isInteger(q.arg) && q.arg >= 1 && q.arg < cfg.areas.length : q.type === 'species' ? known.has(q.arg) : true;
  if (Array.isArray(st.req)) S.req = st.req.filter((q) => q && REQ_TYPES.includes(q.type) && argOk(q)).slice(0, cfg.daily.requests).map((q) => ({ type: q.type, arg: q.arg == null ? null : q.arg, done: !!q.done }));
  S.open = Math.max(1, Math.min(cfg.areas.length, int(st.open, 9), openFor(cfg, stamps(S))));
  S.entered = Math.max(1, Math.min(S.open, int(st.entered, 9)));
  return S;
}

/** Joins a late-arriving save with what this session already did (nothing earned is lost). */
export function merge(cfg, saved, now) {
  const S = restore(cfg, saved);
  S.flakes += now.flakes; S.photos += now.photos;
  for (const k in now.slots) S.slots[k] = (S.slots[k] | 0) | now.slots[k];
  for (const k in now.rare) if (now.rare[k]) S.rare[k] = 1;
  for (const o of now.owned) if (!S.owned.includes(o)) S.owned.push(o);
  for (const h of now.halves) if (!S.halves.includes(h)) S.halves.push(h);
  for (const p of now.pages) if (!S.pages.includes(p)) S.pages.push(p);
  S.ftue = (S.ftue | now.ftue) >>> 0; S.ftueDone = S.ftueDone || now.ftueDone;
  // what the player did before the save arrived: today's finished requests, the rare's day, what they wear
  if (S.day === now.day && S.req.length === now.req.length) S.req.forEach((q, i) => { if (now.req[i] && now.req[i].type === q.type && now.req[i].done) q.done = true; });
  S.rareDay = Math.max(S.rareDay, now.rareDay | 0);
  if (now.outfit) S.outfit = now.outfit; if (now.cam) S.cam = now.cam;
  S.open = Math.max(S.open, now.open, openFor(cfg, stamps(S))); S.entered = Math.max(S.entered, now.entered);
  return S;
}

// ---- tutorial

/** Tutorial steps, in order. Each advances only on the real action (see game.js `ftueDid`). */
export const FTUE = ['walk', 'snap', 'book', 'treat', 'pose', 'gate'];

/** Marks step `name` done and moves past every step already done. Returns the current step name or null when finished. */
export function ftueDo(S, name) {
  const i = FTUE.indexOf(name);
  if (i >= 0) S.ftue |= 1 << i;
  return ftueNow(S);
}
/** The current tutorial step (first not done), or null. */
export function ftueNow(S) {
  if (S.ftueDone) return null;
  for (let i = 0; i < FTUE.length; i++) if (!(S.ftue & (1 << i))) return FTUE[i];
  S.ftueDone = true; return null;
}

// ---- input

/** 'tap' for a short, small touch, else 'drag'. */
export function tapOrDrag(cfg, movedPx, ms) { return movedPx < cfg.hero.tapMaxPx && ms < cfg.hero.tapMaxMs ? 'tap' : 'drag'; }

// ---- guide

/**
 * The goal the guide trail points to. ctx = { hero: [x, z], ftue: target or null, rare: {x, z} or null,
 * gate: {x, z} or null (an open gate not yet walked through), animals: [{ id, x, z, avail }] }.
 * Order: tutorial target, today's rare visitor, a new gate, the nearest available animal with an empty slot.
 */
export function guideTarget(S, ctx) {
  if (ctx.ftue) return ctx.ftue;
  if (ctx.rare) return ctx.rare;
  if (ctx.gate) return ctx.gate;
  let best = null, bd = 1e9;
  // night visitors only come out for a short while, so while one still has an empty slot it goes first
  // at night without the flash a photo tops out at 2 stars, so the 3-star slot cannot be filled now and does not count
  const done = (a) => ((S.slots[a.id] | 0) | (ctx.noStar ? 4 : 0)) & 7;
  const nightLeft = ctx.animals.some((a) => a.avail && a.night && done(a) !== 7);
  for (const a of ctx.animals) {
    if (!a.avail) continue;
    const full = done(a) === 7;
    const d = Math.hypot(a.x - ctx.hero[0], a.z - ctx.hero[1]) + (full ? 200 : 0) + (nightLeft && !a.night ? 150 : 0);
    if (d < bd) { bd = d; best = a; }
  }
  return best;
}

/**
 * Areas join only through the gate corridors, so a goal in another area is reached through the gate between.
 * Returns the goal itself, or a waypoint { x, z, via: true }: the corridor mouth on the hero's side, then (once
 * inside the corridor) a point just inside the next area.
 */
export function routeVia(cfg, hero, goal) {
  const [hx, hz] = hero, dir = goal.z < hz ? -1 : 1;
  const g = cfg.gates.filter((q) => (q.z - hz) * dir > -8 && (goal.z - q.z) * dir > 0).sort((a, b) => (a.z - b.z) * dir)[0];
  if (!g || Math.abs(goal.z - hz) < 1) return goal;
  const inCorr = Math.abs(hx) < 4.5 && Math.abs(hz - g.z) < 8;
  return inCorr ? { x: 0, z: g.z + dir * 9, via: true } : { x: 0, z: g.z - dir * 7, via: true };
}

/**
 * Edge arrow for an off-screen goal. Screen positions in 0..1 (x right, y down).
 * Returns null when the goal is on screen, else { x, y, a } with the arrow on the edge along the ray from the hero
 * toward the goal and `a` its angle in radians (0 = pointing right).
 */
export function edgeArrow(hero, goal, margin = 0.08) {
  const on = goal[0] > margin && goal[0] < 1 - margin && goal[1] > margin && goal[1] < 1 - margin && goal[2] !== false;
  if (on) return null;
  let dx = goal[0] - hero[0], dy = goal[1] - hero[1];
  if (goal[2] === false) { dx = -dx; dy = -dy; } // behind the camera: projection flips
  const len = Math.hypot(dx, dy) || 1; dx /= len; dy /= len;
  const lo = margin, hi = 1 - margin;
  let t = 1e9;
  if (dx > 0) t = Math.min(t, (hi - hero[0]) / dx); if (dx < 0) t = Math.min(t, (lo - hero[0]) / dx);
  if (dy > 0) t = Math.min(t, (hi - hero[1]) / dy); if (dy < 0) t = Math.min(t, (lo - hero[1]) / dy);
  t = Math.max(0, t);
  return { x: hero[0] + dx * t, y: hero[1] + dy * t, a: Math.atan2(dy, dx) };
}

// ---- adaptive quality

/** Steps the tier down when the 2 s average is under `downFps`, up after `upAfterS` above `upFps`. q = { tier, low, high, t } */
export function qualityStep(cfg, q, fps, dt, maxTier = 2) {
  const Q = cfg.quality;
  if (fps < Q.downFps) { q.low += dt; q.high = 0; } else if (fps > Q.upFps) { q.high += dt; q.low = 0; } else { q.low = 0; q.high = 0; }
  if (q.low > 2 && q.tier > 0) { q.tier--; q.low = 0; q.capped = true; return true; }
  if (q.high > Q.upAfterS && q.tier < maxTier && !q.capped) { q.tier++; q.high = 0; return true; }
  return false;
}
