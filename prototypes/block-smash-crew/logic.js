// PROTOTYPE - NOT FOR PRODUCTION
// Rules of Block Smash Crew that are only numbers: coins for smashed blocks, the smash combo, stars, tool unlocks,
// language pick and the daily gift. Pure, so they are tested in Node (logic.test.mjs).

/** Picks the first device language we have, else English. */
export function detectLang(list, langs) {
  for (const l of list || []) { const c = String(l || '').toLowerCase().split('-')[0]; if (langs.includes(c)) return c; }
  return 'en';
}

/** Coins for a batch of removed blocks: sum of material values × the combo multiplier (× 2 in smash time). */
export function coinsFor(cfg, removed, mult = 1) {
  let n = 0; for (const c of removed) n += (cfg.materials[c.m - 1] || {}).value || 0;
  return Math.round(n * mult);
}

/** The combo: each smash inside the window adds one; the multiplier is 1 + floor(k / step), capped. */
export function createCombo(cfg) { return { k: 0, t: 0, mult: 1, cfg: cfg.combo }; }
export function comboHit(c) {
  c.k = c.t > 0 ? c.k + 1 : 1; c.t = c.cfg.window;
  c.mult = Math.min(c.cfg.max, 1 + Math.floor(c.k / c.cfg.step));
  return c.mult;
}
export function comboTick(c, dt) { if (c.t > 0) { c.t -= dt; if (c.t <= 0) { c.t = 0; c.k = 0; c.mult = 1; } } }

/** Word for a batch of n blocks, or null for a small one. */
export function smashWord(cfg, n) { const w = cfg.words; return n >= w.mega ? 'mega' : n >= w.kaboom ? 'kaboom' : n >= w.smash ? 'smash' : null; }

/** Stars for a finished level: found all stars, then wrecked ≥ wreck1 and ≥ wreck2 of the blocks. */
export function starsFor(cfg, wreck) { return [true, wreck >= cfg.stars.wreck1, wreck >= cfg.stars.wreck2]; }

/** Share of the level's blocks gone, 0..1. */
export const wreckOf = (total, left) => (total > 0 ? Math.max(0, Math.min(1, 1 - left / total)) : 0);

/** The next tool to unlock (cheapest not owned) and how far the coins are, or null when all are owned. */
export function nextTool(cfg, owned, coins) {
  const t = cfg.tools.filter((x) => !owned.includes(x.id)).sort((a, b) => a.cost - b.cost)[0];
  return t ? { tool: t, have: Math.min(coins, t.cost), need: t.cost } : null;
}

/** A level's finish bonus: base + per level step, × 2 on the 3-star finish. */
export function levelBonus(cfg, n, stars) { const b = cfg.coins.level + cfg.coins.levelStep * n; return stars.every(Boolean) ? b * 2 : b; }

/** Calendar day as a number YYYYMMDD in local time. */
export const dayNum = (d) => d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
/** The daily gift is due when today is after the last day it was given (a clock turned back never pays). */
export const dailyDue = (lastDay, today) => !lastDay || today > lastDay;

/** Seconds of cooldown for a tool; smash time cuts them to a fraction. */
export function cooldownOf(cfg, id, fever) { const t = cfg.tools.find((x) => x.id === id); return t ? t.cd * (fever ? cfg.fever.cdScale : 1) : 0; }

/** A tool at upgrade level lv (1..max): bigger and quicker. Returns {r, cd} (and len for the ball). */
export function toolAt(cfg, t, lv) {
  const u = cfg.upgrade, k = Math.max(1, Math.min(u.max, lv)) - 1;
  const out = { r: +(t.r * (1 + u.rStep * k)).toFixed(3), cd: +(t.cd * (1 - u.cdStep * k)).toFixed(3) };
  if (t.len) out.len = Math.round(t.len * (1 + u.rStep * k));
  return out;
}
/** Coins for the next upgrade of tool id from level lv, or null at the top level. */
export function upgradeCost(cfg, id, lv) { const u = cfg.upgrade; return lv >= u.max ? null : Math.round(u.base[id] * Math.pow(u.growth, lv - 1) / 100) * 100; }
/** Today's challenge: the biggest step of one of the 8 buildings, the kind changing every day. */
export const dailyLevel = (cfg, day) => 8 * cfg.level.maxStep + (day % 8);
