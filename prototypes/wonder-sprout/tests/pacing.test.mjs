// PROTOTYPE - NOT FOR PRODUCTION
// Pacing: a bot that plays like a child must reach each milestone inside the plan's windows (plan section 6).
import test from 'node:test';
import assert from 'node:assert/strict';
import { simulate } from './sim.mjs';

for (const seed of [7, 11, 23]) {
  test('pacing seed ' + seed, () => {
    const r = simulate(15, seed);
    assert.equal(r.landmarks.length, 6, 'all six landmarks in 15 min');
    assert.ok(r.landmarks[0] <= 120, 'first landmark within 2 min: ' + r.landmarks[0]);
    assert.ok(r.landmarks[5] >= 540 && r.landmarks[5] <= 900, 'last landmark 9-15 min: ' + r.landmarks[5]);
    assert.ok(r.hatches[0] <= 40, 'first hatch early: ' + r.hatches[0]);
    assert.ok(r.heroStages[0] >= 90 && r.heroStages[0] <= 360, 'hero stage 2 at 1.5-6 min: ' + r.heroStages[0]);
    assert.ok(r.heroStages[1] >= 360 && r.heroStages[1] <= 840, 'hero stage 3 at 6-14 min: ' + r.heroStages[1]);
    assert.ok(r.raids.length >= 1, 'at least one sky pirate raid is broken');
    const gaps = []; for (let i = 1; i < r.rewards.length; i++) if (r.rewards[i] < 60) gaps.push(r.rewards[i] - r.rewards[i - 1]);
    assert.ok(r.rewards[0] <= 3 && Math.max(...gaps) <= 8, 'a reward every few seconds in the first minute');
  });
}
