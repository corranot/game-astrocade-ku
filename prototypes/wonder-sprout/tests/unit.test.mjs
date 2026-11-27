// PROTOTYPE - NOT FOR PRODUCTION
// Unit tests for the pure rules. Run: node --test prototypes/wonder-sprout/tests/
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import { classifyTouch, launchVelocity, aimAssist, isSweet, ringScale, stepBody, collide } from '../m3-physics-gameplay.js';
import { landmarkCost, evolveCost, rollSpecies, offlineGems, gardenStars, comboBonus } from '../m4-kingdom-critters.js';
import { validateState, freshState, readConfig, frameDt, makeRng, SCHEMA_VERSION } from '../m0-orchestrator.js';
import { nextFtue, FTUE, fmt } from '../m6-kids-portrait-ui.js';
import { pickBeat } from '../m5-vfx-kinematics.js';
import { STR, LANGS, detectLang } from '../strings.js';

const CFG = JSON.parse(fs.readFileSync(new URL('../game_config.json', import.meta.url)));
const P = CFG.physics, R = CFG.rhythm, E = CFG.economy;

test('a short still touch on a target is a tap, anything else a drag', () => {
  assert.equal(classifyTouch(P.tapMovePx - 1, P.tapMs, true, P), 'tap');
  assert.equal(classifyTouch(P.tapMovePx + 1, 100, true, P), 'drag');
  assert.equal(classifyTouch(2, P.tapMs + 1, true, P), 'drag');
  assert.equal(classifyTouch(2, 100, false, P), 'drag');
});

test('launch goes opposite the pull, is capped by maxPull and maxSpeed', () => {
  const v = launchVelocity(0, 100, P);
  assert.ok(v.vy < 0 && Math.abs(v.vx) < 1e-9);
  const a = launchVelocity(0, P.maxPull, P), b = launchVelocity(0, P.maxPull * 3, P);
  assert.equal(Math.round(a.vy), Math.round(b.vy));
  const fast = launchVelocity(0, P.maxPull, P, 9);
  assert.ok(Math.hypot(fast.vx, fast.vy) <= P.maxSpeed * 9 + 1e-6);
});

test('aim assist bends at most assistDeg toward a target in the cone', () => {
  const t = [{ alive: true, x: 100, y: -1000 }];
  const v = aimAssist(0, -1000, 0, 0, t, P);
  const bend = Math.abs(Math.atan2(v.vx, -v.vy)) * 180 / Math.PI;
  assert.ok(bend > 0 && bend <= P.assistDeg + 1e-9);
  assert.deepEqual(aimAssist(0, -1000, 0, 0, [{ alive: true, x: 1000, y: 0 }], P), { vx: 0, vy: -1000 });
});

test('gold ring: sweet only at the end of a period, ring shrinks to 1', () => {
  assert.equal(isSweet(R.period * 0.5, R), false);
  assert.equal(isSweet(R.period * (1 - R.window / 2), R), true);
  assert.ok(Math.abs(ringScale(R.period - 1e-6, R) - 1) < 1e-3);
  assert.ok(Math.abs(ringScale(0, R) - R.ringStart) < 1e-9);
});

test('a body at max speed never leaves the arena (no tunnelling)', () => {
  const box = { l: 36, r: 684, t: 440, b: 968 }, b = { x: 360, y: 700, vx: P.maxSpeed, vy: -P.maxSpeed, r: P.critterRadius };
  for (let i = 0; i < 2000; i++) {
    stepBody(b, P.substep, box, P);
    assert.ok(b.x >= box.l + b.r - 1e-6 && b.x <= box.r - b.r + 1e-6 && b.y >= box.t + b.r - 1e-6 && b.y <= box.b - b.r + 1e-6);
  }
  assert.ok(Math.hypot(b.vx, b.vy) < P.restSpeed, 'drag and friction bring it to rest');
});

test('collide pushes a body out and reflects it', () => {
  const b = { x: 10, y: 0, vx: -100, vy: 0, r: 10 };
  assert.ok(collide(b, 0, 0, 10, 0.8));
  assert.equal(b.x, 20); assert.ok(b.vx > 0);
  assert.equal(collide({ x: 100, y: 0, vx: 0, vy: 0, r: 5 }, 0, 0, 10, 1), null);
});

test('landmark costs grow, every landmark needs gems and wood', () => {
  let prev = 0;
  for (let i = 0; i < 6; i++) { const c = landmarkCost(i, E); assert.ok(c.gems > prev && c.wood >= 1); prev = c.gems; }
  assert.equal(landmarkCost(0, E).gems, E.landmarkGems);
});

test('evolve cost grows by stage and stops at stage 3', () => {
  assert.equal(evolveCost(1, 'fox', E), E.evolveBase);
  assert.ok(evolveCost(2, 'fox', E) > evolveCost(1, 'fox', E));
  assert.ok(evolveCost(1, 'dragon', E) > evolveCost(1, 'bunny', E));
  assert.equal(evolveCost(3, 'fox', E), Infinity);
});

test('first hatch is always a bunny; v1 eggs give only v1 species', () => {
  const rng = makeRng(3);
  assert.equal(rollSpecies('meadow', rng, 0), 'bunny');
  for (let i = 0; i < 200; i++) for (const k of ['meadow', 'coral', 'gift']) assert.ok(['bunny', 'dragon'].includes(rollSpecies(k, rng, 1)));
});

test('offline gems need the Ferris Wheel and are capped', () => {
  assert.equal(offlineGems(3600, E, false), 0);
  assert.equal(offlineGems(30, E, true), 0);
  assert.equal(offlineGems(1e9, E, true), offlineGems(E.offlineCapHours * 3600, E, true));
  assert.ok(offlineGems(3600, E, true) > 0);
});

test('combo bonus and garden stars', () => {
  assert.equal(comboBonus(0), 1); assert.equal(comboBonus(3), 1.1); assert.equal(comboBonus(99), 2);
  assert.equal(gardenStars(129), 12);
});

test('a damaged save never crashes and is clamped', () => {
  assert.deepEqual(validateState(null, 5), freshState(5));
  assert.deepEqual(validateState({ schemaVersion: 999, starGems: 5 }, 5), freshState(5));
  const s = validateState({ schemaVersion: SCHEMA_VERSION, starGems: -5, critters: [{ id: 4, species: 'cat', stage: 9 }, { id: 7, species: 'fox', stage: 9 }], heroId: 4, eggs: [{ kind: 'x' }, { kind: 'meadow', taps: 99 }], landmarks: 'no', stats: { lifetime: NaN } }, 1);
  assert.equal(s.starGems, 0);
  assert.equal(s.critters.length, 1); assert.equal(s.critters[0].stage, 3); assert.equal(s.heroId, 7); assert.equal(s.nextId, 8);
  assert.equal(s.eggs.length, 1); assert.equal(s.eggs[0].taps, 9);
  assert.equal(s.stats.lifetime, 0); assert.equal(s.landmarks.length, 6);
  assert.doesNotThrow(() => JSON.stringify(s));
});

test('config merge keeps defaults for missing values', () => {
  const c = readConfig({ a: { x: 1, y: 2 }, b: 3 }, { a: { y: 5 } });
  assert.deepEqual(c, { a: { x: 1, y: 5 }, b: 3 });
});

test('frame dt is clamped to [0, 0.05]', () => {
  assert.equal(frameDt(-1), 0); assert.equal(frameDt(NaN), 0); assert.equal(frameDt(1), 0.05); assert.equal(frameDt(0.016), 0.016);
});

test('FTUE picks the first step not done whose condition holds; skip ends it', () => {
  const yes = FTUE.map(() => () => true);
  assert.equal(nextFtue(0, false, yes), 0);
  assert.equal(nextFtue(1, false, yes), 1);
  assert.equal(nextFtue((1 << FTUE.length) - 1, false, yes), null);
  assert.equal(nextFtue(0, true, yes), null);
  assert.equal(nextFtue(1, false, FTUE.map((_, i) => () => i === 3)), 3);
});

test('cinematic beats run highest priority first and wait for the cooldown', () => {
  const q = [{ pri: 1, id: 'a' }, { pri: 5, id: 'b' }];
  assert.equal(pickBeat(q, 0, 1), null);
  assert.equal(pickBeat(q, 2, 1).id, 'b');
  assert.equal(pickBeat(q, 2, 1).id, 'a');
});

test('every language has every word; commands stay short', () => {
  const keys = Object.keys(STR.en);
  for (const l of LANGS) {
    for (const k of keys) assert.ok(STR[l][k] !== undefined, l + '.' + k);
    for (const k of ['fling', 'hatch', 'plant', 'evolve']) assert.ok(STR[l][k].split(/\s+/).length <= 5, l + '.' + k);
    assert.equal(STR[l].lm.length, 6);
  }
  assert.equal(detectLang(['ar-EG']), 'ar'); assert.equal(detectLang(['de-DE']), 'en'); assert.equal(fmt(12345), '12K');
});
