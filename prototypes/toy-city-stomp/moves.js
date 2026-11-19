// PROTOTYPE - NOT FOR PRODUCTION
// Bonbon's moves. Stomp is always on (Bonbon breaks what it bumps); one other move sits on the big button.
// Tail Spin is free from stage 3; the rest are bought in the shop. Each move is a short script over the effects
// game.js provides (fx): blast(x, z, r) breaks what is in reach, later(sec, fn) schedules, jump(...) lifts Bonbon
// in an arc and lands it, spin(), roar(), fwd() Bonbon's facing, sc its size, at(dist) a point ahead.

/** What each move does when the button is pressed. */
export const MOVES = {
  spin(fx) { fx.spin(); fx.blast(fx.x(), fx.z(), 4.5 * fx.sc()); },
  flop(fx) { fx.jump(0.6, 3.5, 0, () => fx.blast(fx.x(), fx.z(), 5.5 * fx.sc(), 0.3)); },
  bubble(fx) { for (let k = 1; k <= 5; k++) fx.later(0.1 * k, () => { const p = fx.at(2.4 * k); fx.blast(p.x, p.z, 2.4 * fx.sc(), 0, 'bubble'); }); },
  roar(fx) { fx.roar(); for (let k = 1; k <= 7; k++) fx.later(0.06 * k, () => { const p = fx.at(2.4 * k); fx.blast(p.x, p.z, 2.6 * fx.sc(), 0.05); }); },
  jelly(fx) { const hop = (n) => fx.jump(0.42, 2.5, 4.5, () => { fx.blast(fx.x(), fx.z(), 3.8 * fx.sc(), 0.15); if (n < 3) hop(n + 1); }); hop(1); },
  magnet(fx) { fx.pull(12 * fx.sc()); fx.later(0.5, () => fx.blast(fx.x(), fx.z(), 4 * fx.sc(), 0.2)); },
  rainbow(fx) { for (let k = 1; k <= 9; k++) fx.later(0.07 * k, () => { const p = fx.at(2.2 * k); fx.blast(p.x, p.z, 2.1 * fx.sc(), 0, 'rainbow'); }); },
  sneeze(fx) { fx.roar(); fx.later(0.35, () => fx.blast(fx.x(), fx.z(), 8 * fx.sc(), 0.35)); },
  moon(fx) { fx.jump(1.4, 12, 14, () => fx.blast(fx.x(), fx.z(), 7.5 * fx.sc(), 0.45)); },
};

/** The move's entry in the config list, or null. */
export function moveInfo(cfg, id) { return (cfg.moves || []).find((m) => m.id === id) || null; }

/** Can Bonbon use this move now (owned, and big enough for Tail Spin)? */
export function moveReady(cfg, id, owned, stage) {
  const m = moveInfo(cfg, id);
  return !!m && (m.price === 0 || owned.includes(id)) && stage >= (m.stage || 1);
}

/** Buys a move if there are enough coins. Returns { ok, need } and changes save in place. */
export function buyMove(cfg, save, id) {
  const m = moveInfo(cfg, id);
  if (!m || save.owned.includes(id)) return { ok: false, need: 0 };
  if (save.coins < m.price) return { ok: false, need: m.price - save.coins };
  save.coins -= m.price; save.owned.push(id); save.equipped = id;
  return { ok: true, need: 0 };
}
