// PROTOTYPE - NOT FOR PRODUCTION
// Bonbon's moves. Stomp is always on (Bonbon breaks what it bumps); one other move sits on the big button.
// Tail Spin is free from stage 3; the rest are bought in the shop. Each move is a short script over the effects
// game.js provides (fx): blast(x, z, r) breaks what is in reach, later(sec, fn) schedules, jump(...) lifts Bonbon
// in an arc and lands it, spin(), roar(), fwd() Bonbon's facing, sc its size, at(dist) a point ahead.

/** What each move does when the button is pressed. */
export const MOVES = {
  // Tail Spin: arms out like a top, one full turn, a white whoosh ring
  spin(fx) { fx.pose('spin', 0.6); fx.spin(); fx.ring(fx.x(), fx.z(), 0xffffff, 4.8 * fx.sc(), 0.45); fx.blast(fx.x(), fx.z(), 4.5 * fx.sc()); },
  // Belly Flop: a hop that tips onto the belly in the air and lands flat with a pink shock ring
  flop(fx) {
    fx.pose('flop', 0.8);
    fx.jump(0.6, 3.5, 1.5, () => { fx.ring(fx.x(), fx.z(), 0xff6fae, 6.5 * fx.sc(), 0.55); puffRing(fx, 10, 3.5); fx.blast(fx.x(), fx.z(), 5.5 * fx.sc(), 0.3); });
  },
  // Bubble Breath: cheeks puffed, a stream of bubbles from the mouth that pop on what they hit
  bubble(fx) {
    fx.pose('bubble', 0.8);
    for (let k = 1; k <= 5; k++) fx.later(0.1 * k - 0.08, () => {
      const m = fx.mouth(), p = fx.at(2.4 * k), t = 0.18;
      for (let j = 0; j < 3; j++) fx.ball('bubble', m.x, m.y, m.z, (p.x - m.x) / t + (j - 1) * 2, (1.2 - m.y) / t + j, (p.z - m.z) / t, (0.35 + j * 0.15) * fx.sc(), t + 0.05);
      fx.later(0.08, () => fx.blast(p.x, p.z, 2.4 * fx.sc(), 0, 'bubble'));
    });
  },
  // Storm Roar: leans back and roars; shock rings roll forward
  roar(fx) {
    fx.pose('roar', 0.9); fx.roar(); fx.ring(fx.x(), fx.z(), 0x8fe3ff, 9 * fx.sc(), 0.6);
    for (let k = 1; k <= 7; k++) fx.later(0.06 * k, () => { const p = fx.at(2.4 * k); fx.ring(p.x, p.z, 0xcfefff, 2.6 * fx.sc(), 0.35); fx.blast(p.x, p.z, 2.6 * fx.sc(), 0.05); });
  },
  // Jelly Bounce: three wobbly hops, a green splat ring at each landing
  jelly(fx) {
    fx.pose('jelly', 1.5);
    const hop = (n) => fx.jump(0.42, 2.5, 4.5, () => { fx.ring(fx.x(), fx.z(), 0x7ff0c0, 4.4 * fx.sc(), 0.4); fx.blast(fx.x(), fx.z(), 3.8 * fx.sc(), 0.15); if (n < 3) hop(n + 1); });
    hop(1);
  },
  // Magnet Hug: arms wide, a ring sucks everything in, then a big hug that breaks it all
  magnet(fx) {
    fx.pose('magnet', 1.0); fx.ring(fx.x(), fx.z(), 0xff5a4f, 12 * fx.sc(), 0.5, true); fx.pull(12 * fx.sc());
    fx.later(0.5, () => { fx.ring(fx.x(), fx.z(), 0x3fa9ff, 5 * fx.sc(), 0.4); fx.blast(fx.x(), fx.z(), 4 * fx.sc(), 0.2); });
  },
  // Rainbow Eyes: eyes glow in rainbow colours and shoot a rainbow beam that sweeps the street
  rainbow(fx) {
    fx.pose('rainbow', 0.95); fx.beam(20, 0.8);
    for (let k = 1; k <= 9; k++) fx.later(0.07 * k, () => { const p = fx.at(2.2 * k); fx.blast(p.x, p.z, 2.1 * fx.sc(), 0, 'rainbow'); });
  },
  // Giant Sneeze: ah... ah... CHOO! A burst of puffs out of the mouth blows away what is ahead
  sneeze(fx) {
    fx.pose('sneeze', 0.95); fx.roar();
    fx.later(0.5, () => {
      const m = fx.mouth(), f = fx.fwd();
      for (let j = 0; j < 14; j++) { const a = (j / 13 - 0.5) * 1.2, ca = Math.cos(a), sa = Math.sin(a), sp = (14 + (j % 3) * 4) * Math.sqrt(fx.sc());
        fx.ball('puff', m.x, m.y, m.z, (f.x * ca - f.z * sa) * sp, 1 + (j % 4), (f.z * ca + f.x * sa) * sp, (0.5 + (j % 3) * 0.2) * fx.sc(), 0.7); }
      const p = fx.at(3.5); fx.ring(p.x, p.z, 0xffffff, 8 * fx.sc(), 0.5); fx.blast(p.x, p.z, 8 * fx.sc(), 0.35);
    });
  },
  // Moon Jump: arms up to the sky, a huge slow jump, a golden crater ring on landing
  moon(fx) {
    fx.pose('moon', 1.4);
    fx.jump(1.4, 12, 14, () => { fx.ring(fx.x(), fx.z(), 0xffc531, 9.5 * fx.sc(), 0.7); puffRing(fx, 14, 6); fx.blast(fx.x(), fx.z(), 7.5 * fx.sc(), 0.45); });
  },
};

/** A ring of puffs bursting out from Bonbon's feet. */
function puffRing(fx, n, speed) {
  for (let j = 0; j < n; j++) { const a = (j / n) * Math.PI * 2; fx.ball('puff', fx.x(), 0.6, fx.z(), Math.cos(a) * speed * Math.sqrt(fx.sc()), 1.5, Math.sin(a) * speed * Math.sqrt(fx.sc()), 0.6 * fx.sc(), 0.6); }
}

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
