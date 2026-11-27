// PROTOTYPE - NOT FOR PRODUCTION
// Headless pacing bot: builds the real gameplay, kingdom and VFX modules without a canvas and plays like a
// child (a fling every few seconds at a target, a SUPER NOVA tap now and then, hatches, plants, evolves).
// Usage: node tests/sim.mjs [minutes] [seed]   or import { simulate } for tests.
import fs from 'fs';
import { EventBus, makeRng, readConfig, freshState } from '../m0-orchestrator.js';
import { createGameplay, isSweet } from '../m3-physics-gameplay.js';
import { createKingdom } from '../m4-kingdom-critters.js';
import { createVfx } from '../m5-vfx-kinematics.js';
import { createGoals } from '../m7-garden-goals.js';

const cfgFile = JSON.parse(fs.readFileSync(new URL('../game_config.json', import.meta.url)));
globalThis.window = globalThis.window || { lib: { log() {}, saveUserGameState: async () => ({}), addPlayerScoreToLeaderboard: async () => ({}) } };

/** Plays `minutes` of game time; returns the time (s) of each milestone. */
export function simulate(minutes = 15, seed = 7, opts = {}) {
  const cfg = readConfig(cfgFile, {});
  for (const [sec, vals] of Object.entries(opts.tune || {})) Object.assign(cfg[sec], vals);
  const bus = new EventBus(), rng = makeRng(seed), botRng = makeRng(seed * 31 + 1);
  const w = { bus, cfg, rng, state: freshState(0), mode: 'play', pointer: [0, 0], magnet: false, art: {}, saver: { now() {}, soon() {}, tick() {} } };
  w.audio = new Proxy({}, { get: () => () => {} });
  w.ui = { lang: 'en', ftue: null, logo: 0, open: null, sheet: false, toasts: [] };
  w.gameplay = createGameplay(w); w.kingdom = createKingdom(w); w.vfx = createVfx(w);
  // garden goals pay gems and gift eggs like in the real game (opts.goals === false turns them off)
  if (opts.goals !== false) w.goals = createGoals(w);
  const log = { landmarks: [], hatches: [], evolves: [], raids: [], rewards: [], heroStages: [], flings: 0, novas: 0, goals: [] };
  let T = 0;
  bus.on('landmark:built', (e) => log.landmarks.push(+T.toFixed(1)));
  bus.on('egg:hatch', () => log.hatches.push(+T.toFixed(1)));
  bus.on('evolve', (e) => { log.evolves.push(+T.toFixed(1)); if (e && e.hero) log.heroStages.push(+T.toFixed(1)); });
  bus.on('raid:break', () => log.raids.push(+T.toFixed(1)));
  bus.on('nova', () => log.novas++);
  bus.on('goal:done', () => log.goals.push(+T.toFixed(1)));
  bus.on('launch', () => { log.flings++; w.state.stats.flings++; });
  for (const ev of ['hit', 'burst', 'nova', 'egg:drop', 'egg:hatch', 'landmark:built']) bus.on(ev, () => log.rewards.push(+T.toFixed(1)));
  w.kingdom.onLoaded(0);
  const G = w.gameplay, K = w.kingdom, s = () => w.state, dt = 1 / 60;
  let nextFling = opts.firstFlingSec ?? 1.2, nextTap = 6, think = 0;
  const flingEvery = opts.flingEvery ?? 3.4, novaSkill = opts.novaSkill ?? 0.35;
  while (T < minutes * 60) {
    T += dt; G.update(dt); K.update(dt); w.vfx.update(dt); if (w.goals) w.goals.update(dt);
    if (G.hero.mode === 'rest' && T >= nextFling) {
      const ts = G.targets.filter((t) => t.alive && t.type !== 'tree'), extra = G.raid && G.raid.phase === 'stay' ? G.raid.weak.filter((k) => k.hp > 0) : [];
      const pool = extra.length && botRng() < 0.7 ? extra : ts;
      const t = pool[Math.floor(botRng() * pool.length)] || { x: 360, y: 500 };
      const ox = 360, oy = 836, dx = t.x - ox, dy = t.y - oy, d = Math.hypot(dx, dy) || 1, mag = 90 + botRng() * 80;
      const err = (botRng() - 0.5) * 0.35, a = Math.atan2(dy, dx) + err;
      G.launch(-Math.cos(a) * mag, -Math.sin(a) * mag);
      nextFling = T + flingEvery * (0.7 + botRng() * 0.6);
    }
    if (T >= nextTap) {
      nextTap = T + 0.25;
      const g = G.targets.find((k) => k.alive && (k.type === 'geode' || k.type === 'pinata') && isSweet(k.phase, cfg.rhythm));
      if (g && botRng() < novaSkill * 0.25) { G.tapTarget(g); nextTap = T + 4 + botRng() * 4; }
      const wk = G.raid && G.raid.phase === 'stay' && G.raid.weak.find((k) => k.hp > 0);
      if (wk && botRng() < 0.12) { G.tapTarget(wk); nextTap = T + 1.2; }
    }
    think += dt;
    if (think > 1) {
      think = 0;
      if (K.eggReady()) { K.tapEgg(); K.tapEgg(); K.tapEgg(); }
      if (!s().planted && s().activeLandmark < 6 && botRng() < 0.3) K.plant();
      const hero = K.hero(); if (K.canEvolve(hero) && botRng() < 0.5) K.evolve(hero.id);
      for (const id of s().activeCritterIds) { const c = K.critter(id); if (c && K.canEvolve(c) && s().starGems > K.evolveCost(c) * 2 && botRng() < 0.2) K.evolve(id); }
      if (!s().eggs.length && s().critters.length < 5 && s().starGems > cfg.economy.eggCost.meadow * 3 && botRng() < 0.2) K.buyEgg('meadow');
    }
  }
  log.gems = Math.round(s().starGems); log.lifetime = Math.round(s().stats.lifetime); log.critters = s().critters.map((c) => c.species + c.stage).join(' ');
  return log;
}

if (process.argv[1] && process.argv[1].endsWith('sim.mjs')) {
  const r = simulate(+(process.argv[2] || 15), +(process.argv[3] || 7));
  const gaps = []; for (let i = 1; i < r.rewards.length; i++) gaps.push(r.rewards[i] - r.rewards[i - 1]);
  console.log(JSON.stringify({ hero: r.heroStages, landmarks: r.landmarks, hatches: r.hatches, evolves: r.evolves, raids: r.raids, goals: r.goals, flings: r.flings, novas: r.novas, gems: r.gems, lifetime: r.lifetime, critters: r.critters, firstRewards: r.rewards.slice(0, 8), maxGapFirstMin: Math.max(...gaps.filter((_, i) => r.rewards[i] < 60)) }, null, 1));
}
