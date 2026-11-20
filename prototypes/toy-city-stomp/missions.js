// PROTOTYPE - NOT FOR PRODUCTION
// Missions: one at a time, shown as an icon and a count (no sentence to read). The first round runs a short
// tutorial in a fixed order; after that each new mission is drawn from three tiers (50 / 35 / 15 %) worth
// 60 / 140 / 300 coins. game.js reports what happens with on(event, amount) and shows the card.
// Events: house (a small house down), tower (a tall building down), car, prop, toy (army unit), domino (chain
// length), combo (combo multiplier reached), move (the button move used), grow (stage reached), stars.

/** Templates: icon, event, target, whether the event reports a level (reach) or adds up (count). */
export const MISSIONS = {
  tutorial: [
    { icon: '🏠', ev: 'house', n: 3 },
    { icon: '⬆️', ev: 'grow', n: 2, reach: true },
    { icon: '🚗', ev: 'car', n: 2 },
    { icon: '🏢', ev: 'tower', n: 1 },
  ],
  tiers: [
    [{ icon: '🏠', ev: 'house', n: 5 }, { icon: '🚗', ev: 'car', n: 3 }, { icon: '🌳', ev: 'prop', n: 6 }, { icon: '🪖', ev: 'toy', n: 2 }],
    [{ icon: '🏢', ev: 'tower', n: 2 }, { icon: '🔥', ev: 'combo', n: 4, reach: true }, { icon: '🎳', ev: 'domino', n: 2, reach: true }, { icon: '✨', ev: 'move', n: 3 }, { icon: '⭐', ev: 'stars', n: 2, reach: true }],
    [{ icon: '🎳', ev: 'domino', n: 3, reach: true }, { icon: '🪖', ev: 'toy', n: 8 }, { icon: '🔥', ev: 'combo', n: 6, reach: true }],
  ],
  rewards: [60, 140, 300],
  odds: [0.5, 0.35, 0.15],
};

/**
 * Creates the mission tracker for one round. tutorialDone says whether the tutorial was finished before;
 * rng is the seeded random. onDone(mission) is called when one completes.
 */
export function createMissions(rng, tutorialDone, onDone, levelOf = () => 0) {
  let step = tutorialDone ? -1 : 0, cur = null, waitT = 0, last = null;
  // a "reach" mission already met (e.g. "grow to 2" when Bonbon is already 2) is skipped, never left stuck
  const met = (m) => m.reach && levelOf(m.ev) >= m.n;
  function next() {
    while (step >= 0 && step < MISSIONS.tutorial.length && met(MISSIONS.tutorial[step])) step++;
    if (step >= 0 && step < MISSIONS.tutorial.length) { cur = { ...MISSIONS.tutorial[step], tier: 0, tutorial: true, have: 0 }; return; }
    step = -1;
    let r = rng(), tier = 0;
    for (; tier < 2 && r > MISSIONS.odds[tier]; tier++) r -= MISSIONS.odds[tier];
    let list = MISSIONS.tiers[tier].filter((m) => m !== last && !met(m));
    if (!list.length) list = MISSIONS.tiers[tier].filter((m) => !m.reach);
    const pick = list[Math.floor(rng() * list.length)];
    last = pick; cur = { ...pick, tier, have: pick.reach ? levelOf(pick.ev) : 0 };
  }
  next();
  return {
    get current() { return waitT > 0 ? null : cur; },
    get tutorial() { return step >= 0; },
    reward(m) { return MISSIONS.rewards[m.tier]; },
    /** Reports an event; amount is added (count) or compared (reach). */
    on(ev, amount = 1) {
      if (!cur || waitT > 0 || cur.ev !== ev) return;
      cur.have = cur.reach ? Math.max(cur.have, amount) : cur.have + amount;
      if (cur.have >= cur.n) {
        const done = cur; done.have = done.n;
        if (step >= 0) step++;
        waitT = 1.2; next(); onDone(done);
      }
    },
    /** Returns true on the step the pause between missions ends (the card should show again). */
    update(dt) { const was = waitT > 0; waitT = Math.max(0, waitT - dt); return was && waitT === 0; },
  };
}
