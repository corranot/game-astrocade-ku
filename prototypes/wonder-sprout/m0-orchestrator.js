// PROTOTYPE - NOT FOR PRODUCTION
/**
 * Module 0: orchestrator core. The EventBus, the one serializable GameState, its schema check, seeded
 * randomness, small maths helpers, the portrait viewport and pointer mapping, and the save scheduler.
 * It imports nothing, so every other module may import it; game.js wires the modules together.
 */

/** Logical stage size: the Astrocade iframe is exactly 720 x 1280 CSS px. */
export const W = 720;
export const H = 1280;
/** Stage areas in logical px (plan section 8): HUD row on top, play arena, bottom dock. */
export const LAYOUT = { margin: 24, pill: 72, hudY: 24, arenaTop: 140, arenaBottom: 968, arenaLeft: 36, arenaRight: 684, dockY: 1000, slingX: 360, slingY: 896, nestX: 128, nestY: 912 };
export const SCHEMA_VERSION = 1;
/** Top HUD on one 8 px grid: equal 24 px margins, one 72 px pill height, 16 px gaps. */
export const HUD = { y: 24, h: 72, gem: { x: 24, w: 200 }, wood: { x: 240, w: 168 }, track: { x: 424, w: 184 }, sound: { x: 624, w: 72 } };
/** Where flying resources land on the HUD (icon centres). */
export const HUD_TARGET = { gem: [60, 60], honey: [60, 60], wood: [276, 60] };
/** Bottom dock: three big buttons on the same grid, 24 px margins and gaps. */
export const DOCK = { y: 1000, h: 280, w: 208, bh: 176, gap: 24, x0: 24, top: 1040 };

/** Minimal pub/sub. Handlers run in subscription order; a throwing handler is logged and skipped. */
export class EventBus {
  constructor() { this.map = new Map(); }
  /** Subscribe; returns an unsubscribe function. */
  on(type, fn) { if (!this.map.has(type)) this.map.set(type, []); this.map.get(type).push(fn); return () => this.off(type, fn); }
  /** Remove one handler. */
  off(type, fn) { const l = this.map.get(type); if (l) { const i = l.indexOf(fn); if (i >= 0) l.splice(i, 1); } }
  /** Call every handler of a type with the payload. */
  emit(type, data) {
    const l = this.map.get(type); if (!l) return;
    for (const fn of l.slice()) { try { fn(data); } catch (e) { warn('bus ' + type + ': ' + (e && e.stack || e)); } }
  }
  /** Drop every handler (used when run() is called again). */
  clear() { this.map.clear(); }
}

/** Host log without ever throwing; console.warn, never console.error (error = crash report to the host). */
export function warn(m) { try { window.lib.log(String(m)); } catch (e) { /* no host */ } try { console.warn(String(m)); } catch (e) { /* none */ } }

/** Seeded PRNG (mulberry32): gameplay randomness never uses Math.random. */
export function makeRng(seed) {
  let a = seed >>> 0;
  return function rng() { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const easeOutBack = (t) => { const c = 1.70158; const u = t - 1; return 1 + (c + 1) * u * u * u + c * u * u; };
export const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
export const easeOut = (t) => 1 - (1 - t) * (1 - t) * (1 - t);
export const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
/** Local calendar day as YYYY-MM-DD (daily gift egg). */
export function dayKey(ms) { const d = new Date(ms); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }

/** Merge user config over defaults, one level of sections deep (missing keys keep defaults). */
export function readConfig(defaults, user) {
  const out = {};
  for (const k of Object.keys(defaults)) {
    const d = defaults[k], u = user && user[k];
    out[k] = d && typeof d === 'object' && !Array.isArray(d) ? Object.assign({}, d, u && typeof u === 'object' ? u : {}) : (u !== undefined ? u : d);
  }
  return out;
}

/** A fresh GameState (plan section 9). Only plain data: it is saved as JSON. */
export function freshState(now) {
  return {
    schemaVersion: SCHEMA_VERSION,
    starGems: 0, magicWood: 0, royalCrowns: 0, comboCount: 0, worldIndex: 0,
    landmarks: [0, 0, 0, 0, 0, 0].map(() => ({ gems: 0, wood: 0, built: false })),
    activeLandmark: 0, planted: true,
    eggs: [],
    critters: [{ id: 1, species: 'fox', stage: 1, xp: 0 }],
    heroId: 1, activeCritterIds: [], nextId: 2,
    bossState: null, weatherEvent: null, rebirthCount: 0,
    stats: { lifetime: 0, flings: 0, crits: 0, hatched: 0, bestCombo: 0, playSec: 0, raids: 0 },
    ftue: { done: 0, skipped: false }, lastSeen: now || 0, giftDay: '', firstDay: now ? dayKey(now) : '', lang: '', sound: true,
  };
}

const SPECIES = ['fox', 'bunny', 'dragon', 'owl', 'unicorn'];
const EGG_KINDS = ['meadow', 'coral', 'royal', 'gift'];
const num = (v, lo, hi, d) => (Number.isFinite(v) ? clamp(v, lo, hi) : d);
const int = (v, lo, hi, d) => Math.floor(num(v, lo, hi, d));

/** Schema check on load: every field is clamped or replaced, so a damaged save can never crash the game. */
export function validateState(raw, now) {
  const s = freshState(now);
  if (!raw || typeof raw !== 'object' || raw.schemaVersion !== SCHEMA_VERSION) return s;
  s.starGems = num(raw.starGems, 0, 1e12, 0); s.magicWood = num(raw.magicWood, 0, 1e9, 0); s.royalCrowns = num(raw.royalCrowns, 0, 1e9, 0);
  s.worldIndex = int(raw.worldIndex, 0, 2, 0); s.rebirthCount = int(raw.rebirthCount, 0, 999, 0);
  if (Array.isArray(raw.landmarks)) for (let i = 0; i < 6; i++) { const l = raw.landmarks[i]; if (l && typeof l === 'object') s.landmarks[i] = { gems: num(l.gems, 0, 1e12, 0), wood: num(l.wood, 0, 1e9, 0), built: l.built === true }; }
  s.activeLandmark = int(raw.activeLandmark, 0, 6, 0); s.planted = raw.planted !== false;
  if (Array.isArray(raw.eggs)) s.eggs = raw.eggs.slice(0, 6).filter((e) => e && EGG_KINDS.includes(e.kind)).map((e) => ({ kind: e.kind, warm: num(e.warm, 0, 1e6, 0), taps: int(e.taps, 0, 9, 0) }));
  if (Array.isArray(raw.critters)) {
    const cs = raw.critters.slice(0, 12).filter((c) => c && SPECIES.includes(c.species) && Number.isFinite(c.id)).map((c) => ({ id: Math.floor(c.id), species: c.species, stage: int(c.stage, 1, 3, 1), xp: num(c.xp, 0, 1e12, 0) }));
    if (cs.length) s.critters = cs;
  }
  s.nextId = Math.max(int(raw.nextId, 1, 1e9, 2), ...s.critters.map((c) => c.id + 1));
  s.heroId = s.critters.some((c) => c.id === raw.heroId) ? raw.heroId : s.critters[0].id;
  if (Array.isArray(raw.activeCritterIds)) s.activeCritterIds = raw.activeCritterIds.filter((id) => id !== s.heroId && s.critters.some((c) => c.id === id)).slice(0, 3);
  const st = raw.stats || {};
  for (const k of Object.keys(s.stats)) s.stats[k] = num(st[k], 0, 1e12, 0);
  if (raw.ftue && typeof raw.ftue === 'object') s.ftue = { done: int(raw.ftue.done, 0, 1023, 0), skipped: raw.ftue.skipped === true };
  s.lastSeen = num(raw.lastSeen, 0, 1e14, now || 0);
  s.giftDay = typeof raw.giftDay === 'string' ? raw.giftDay.slice(0, 10) : '';
  s.firstDay = typeof raw.firstDay === 'string' ? raw.firstDay.slice(0, 10) : s.firstDay;
  s.lang = typeof raw.lang === 'string' ? raw.lang.slice(0, 5) : '';
  s.sound = raw.sound !== false;
  return s;
}

/**
 * Save scheduler on the host's save API (browser storage is blocked in the sandbox).
 * now(): saves right away (milestones); soon(): after a 3 s settle; never more than once every 8 s.
 */
export function makeSaver(getState, clock) {
  let last = -1e9, pending = 0, busy = false;
  const write = async () => {
    if (busy) { pending = clock() + 1; return; }
    busy = true; last = clock(); pending = 0;
    try { const st = getState(); st.lastSeen = Date.now(); await window.lib.saveUserGameState(JSON.parse(JSON.stringify(st))); }
    catch (e) { warn('save failed: ' + e); }
    busy = false;
  };
  return {
    now() { if (clock() - last >= 1) write(); else pending = last + 1; },
    soon() { const t = Math.max(clock() + 3, last + 8); if (!pending || t < pending) pending = t; },
    tick() { if (pending && clock() >= pending) write(); },
  };
}

/** Load the saved state with a time limit; any failure gives null (fresh game). */
export async function loadSaved() {
  try {
    const r = await Promise.race([window.lib.getUserGameState(), new Promise((res) => setTimeout(() => res(null), 5000))]);
    return r && r.state ? r.state : null;
  } catch (e) { warn('load failed: ' + e); return null; }
}

/** Fit the 720 x 1280 canvas to the window (outside Astrocade the page may be any size). */
export function fitCanvas(canvas) {
  const vw = window.innerWidth || W, vh = window.innerHeight || H;
  const k = Math.min(vw / W, vh / H);
  canvas.style.width = Math.round(W * k) + 'px'; canvas.style.height = Math.round(H * k) + 'px';
}

/** Pointer position in logical stage px. */
export function toStage(canvas, e) {
  const r = canvas.getBoundingClientRect();
  return { x: (e.clientX - r.left) * W / (r.width || W), y: (e.clientY - r.top) * H / (r.height || H) };
}

/** Frame clock: clamped delta (never negative, at most 0.05 s) so physics never tunnels after a tab switch. */
export function frameDt(rawSec) { return clamp(Number.isFinite(rawSec) ? rawSec : 0, 0, 0.05); }

/**
 * Adaptive quality: tier from the device, a watchdog that steps down under downFps (2 s average)
 * and back up after upAfterSec above upFps.
 */
export function makeQuality(q, startTier) {
  let tier = startTier, acc = 0, n = 0, good = 0;
  return {
    get tier() { return tier; },
    get scale() { return q.scale[tier]; },
    /** Take one frame's dt; returns true when the tier changed. */
    sample(dt) {
      if (dt <= 0) return false;
      acc += dt; n++;
      if (acc < 2) return false;
      const fps = n / acc; acc = 0; n = 0;
      if (fps < q.downFps && tier > 0) { tier--; good = 0; return true; }
      if (fps > q.upFps) { good += 2; if (good >= q.upAfterSec && tier < q.scale.length - 1) { tier++; good = 0; return true; } } else good = 0;
      return false;
    },
  };
}

/** Starting tier from cores, memory and touch (0 low, 1 mid, 2 high). */
export function guessTier() {
  try {
    const c = navigator.hardwareConcurrency || 4, m = navigator.deviceMemory || 4;
    const touch = window.lib && typeof window.lib.shouldUseTouchControls === 'function' ? window.lib.shouldUseTouchControls() : ('ontouchstart' in window);
    if (c <= 4 || m <= 2) return 0;
    if (touch && (c <= 6 || m <= 4)) return 1;
    return touch ? 1 : 2;
  } catch (e) { return 1; }
}
