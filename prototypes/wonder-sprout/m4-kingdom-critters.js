// PROTOTYPE - NOT FOR PRODUCTION
/**
 * Module 4: living kingdom, egg hatchery and 3-stage evolution. Turns gameplay hits into loot, fills the
 * active landmark pedestal (resources fly there on Bezier arcs, drawn by module 5) and pops it up when
 * full; runs the nest (incubate, tap to hatch, roll a critter), evolution, landmark effects, the daily
 * gift egg, offline growth and the Garden Stars leaderboard. Draws the landmark row and the nest.
 */
import { LAYOUT, clamp, easeOutBack, dayKey } from './m0-orchestrator.js';
import { put, PAL, rgba, mix, LANDMARK_X, LANDMARK_BASE } from './m1-art-bakery.js';

/** Landmark ids in build order (plan section 4). */
export const LANDMARKS = ['bakery', 'grove', 'observatory', 'ferris', 'fountain', 'lighthouse'];
const TIER = { fox: 1, bunny: 1, dragon: 1.3, owl: 1.6, unicorn: 2 };

// ---------- pure formulas (unit tested) ----------
/** Landmark n (0-based) costs gemsBase * growth^n gems and woodBase * growth^n wood. */
export function landmarkCost(i, E) { const k = Math.pow(E.landmarkGrowth, i); return { gems: Math.round(E.landmarkGems * k), wood: Math.round(E.landmarkWood * k) }; }
/** Stage s to s+1 costs evolveBase * evolveGrowth^(s-1) * species tier; Infinity at stage 3. */
export function evolveCost(stage, species, E) { return stage >= 3 ? Infinity : Math.round(E.evolveBase * Math.pow(E.evolveGrowth, stage - 1) * (TIER[species] || 1)); }
/** Species from an egg. The very first egg is always a Cloud-Bunny so the first hatch is predictable. */
export function rollSpecies(kind, rng, hatched) {
  if (hatched === 0) return 'bunny';
  const r = rng();
  if (kind === 'coral' || kind === 'gift') return r < 0.6 ? 'dragon' : 'bunny';
  return r < 0.62 ? 'bunny' : 'dragon';
}
/** Gems grown while away: ferris income for the capped time, at the offline share. */
export function offlineGems(elapsedSec, E, ferrisBuilt) { if (!ferrisBuilt || !(elapsedSec > 60)) return 0; return Math.floor(Math.min(elapsedSec, E.offlineCapHours * 3600) * E.ferrisGemsPerSec * E.offlineShare); }
/** Leaderboard number: lifetime star-gems / 10. */
export function gardenStars(lifetime) { return Math.floor(lifetime / 10); }
/** Combo bonus: +10% per hit after the second, at most double. */
export function comboBonus(combo) { return clamp(1 + Math.max(0, combo - 2) * 0.1, 1, 2); }

export function createKingdom(world) {
  const { bus, cfg, rng } = world, E = cfg.economy;
  const K = { anim: [0, 0, 0, 0, 0, 0], eggWob: 0, eggPop: 0, honeyT: 0, ferrisT: 0, wheelA: 0, plantT: 0, lastBoard: -1, boardT: 0, hatchFx: 0 };
  const S = () => world.state;
  const built = (i) => S().landmarks[i].built;
  K.built = built;
  K.critter = (id) => S().critters.find((c) => c.id === id);
  K.hero = () => K.critter(S().heroId) || S().critters[0];
  K.mult = () => E.stageMult[K.hero().stage - 1] * (1 + S().rebirthCount);
  K.cost = (i) => landmarkCost(i, E);
  K.activeNeeds = () => {
    const s = S(), i = s.activeLandmark; if (i >= 6 || !s.planted) return null;
    const c = K.cost(i), l = s.landmarks[i]; return { i, gems: Math.max(0, c.gems - l.gems), wood: Math.max(0, c.wood - l.wood) };
  };
  K.progress = (i) => { const c = K.cost(i), l = S().landmarks[i]; return clamp((l.gems + l.wood * 10) / (c.gems + c.wood * 10), 0, 1); };
  /** Where the next orb of a kind should fly: the active pedestal while it still needs it, else the HUD. */
  let toggle = 0;
  const dest = (kind) => {
    const need = K.activeNeeds(); if (!need) return 'wallet';
    // the very first wood lands on the HUD so the wood counter appears and the child sees where wood comes from
    if (kind === 'wood') return need.wood > 0 && S().stats.wood > 0 ? 'landmark' : 'wallet';
    if (need.gems <= 0) return 'wallet';
    toggle = (toggle + E.toLandmarkShare) % 1; return toggle < E.toLandmarkShare ? 'landmark' : 'wallet';
  };
  /** Split an amount into a few orbs and send them on their way. */
  K.loot = (x, y, kind, amount, spread = 1) => {
    if (amount <= 0) return;
    const n = clamp(Math.round(Math.sqrt(amount) * 1.6), 1, 14), v = amount / n;
    for (let k = 0; k < n; k++) bus.emit('orb', { x, y, kind, value: v, dest: dest(kind), spread });
  };
  K.lootFor = (e) => {
    const g = E.gemsPerHit, m = K.mult();
    if (e.by === 'tap') { K.loot(e.x, e.y, 'gem', 1 * m); return; }
    const helperMult = e.helper ? E.stageMult[(K.critter(e.helper) || { stage: 1 }).stage - 1] : 1;
    const base = (g[e.type] || 1) * (e.helper ? E.helperGems / 2 * helperMult : m * comboBonus(e.combo));
    K.loot(e.x, e.y, 'gem', base);
    if (e.type === 'tree') K.loot(e.x, e.y - 40, 'wood', E.woodPerTreeHit * (e.helper ? 1 : Math.max(1, Math.round(m))));
  };
  bus.on('hit', (e) => { if (world.mode === 'play') K.lootFor(e); });
  bus.on('burst', (e) => {
    const m = K.mult() * e.mult;
    if (e.type === 'geode') K.loot(e.x, e.y, 'gem', E.geodeBurst * m, 1.6);
    if (e.type === 'pinata') {
      K.loot(e.x, e.y, 'gem', E.pinataBurst * m, 1.8);
      if (!K.firstEggGiven || rng() < E.pinataEggChance) { K.firstEggGiven = true; K.addEgg('meadow', e.x, e.y); }
    }
  });
  bus.on('raid:hit', (e) => K.loot(e.x, e.y, 'gem', E.gemsPerHit.raid * K.mult()));
  bus.on('raid:break', (e) => { K.loot(e.x, e.y, 'gem', cfg.raid.burstGems * K.mult(), 2.4); K.addEgg('coral', e.x, e.y + 40); S().stats.raids++; });
  bus.on('raid:escape', (e) => K.loot(e.x, e.y + 60, 'gem', 8 * K.mult(), 2));
  bus.on('orb:arrive', (o) => K.credit(o));

  /** An orb reached its destination. */
  K.credit = (o) => {
    const s = S();
    if (o.kind === 'gem') { s.stats.lifetime += o.value; }
    if (o.dest === 'landmark') {
      const need = K.activeNeeds();
      if (need) {
        const l = s.landmarks[need.i], c = K.cost(need.i);
        if (o.kind === 'wood') { const take = Math.min(o.value, need.wood); l.wood += take; s.magicWood += o.value - take; }
        else { const take = Math.min(o.value, need.gems); l.gems += take; s.starGems += o.value - take; }
        bus.emit('landmark:progress', { i: need.i, p: K.progress(need.i) });
        if (l.gems >= c.gems && l.wood >= c.wood) K.build(need.i);
        return;
      }
    }
    if (o.kind === 'wood') { s.magicWood += o.value; if (!s.stats.wood) bus.emit('wood:first', {}); s.stats.wood += o.value; } else s.starGems += o.value;
    bus.emit('wallet', {});
  };
  K.build = (i) => {
    const s = S(); if (s.landmarks[i].built) return;
    s.landmarks[i].built = true; s.activeLandmark = i + 1; s.planted = i + 1 < 6 ? false : true; K.anim[i] = 0.0001; K.plantT = 0;
    bus.emit('landmark:built', { i, x: LANDMARK_X[i], y: LANDMARK_BASE - 70 });
    K.applyEffects(); K.submitScore(true);
  };
  /** Choose the next landmark to plant (Kingdom drawer). */
  K.plant = () => { const s = S(); if (s.planted || s.activeLandmark >= 6) return false; s.planted = true; bus.emit('landmark:planted', { i: s.activeLandmark, x: LANDMARK_X[s.activeLandmark], y: LANDMARK_BASE - 40 }); return true; };
  /** Spend wallet gems to fill the active landmark faster (Kingdom drawer). */
  K.rush = () => {
    const need = K.activeNeeds(), s = S(); if (!need) return 0;
    const g = Math.min(Math.floor(s.starGems), need.gems), w = Math.min(Math.floor(s.magicWood), need.wood); if (g <= 0 && w <= 0) return 0;
    s.starGems -= g; s.magicWood -= w;
    const from = { x: 120, y: 60 };
    for (let k = 0; k < Math.min(10, Math.ceil(g / 10)); k++) bus.emit('orb', { x: from.x, y: from.y, kind: 'gem', value: g / Math.min(10, Math.ceil(g / 10)), dest: 'landmark', spread: 0.6, noLife: true });
    for (let k = 0; k < Math.min(5, w); k++) bus.emit('orb', { x: 260, y: 60, kind: 'wood', value: w / Math.min(5, w), dest: 'landmark', spread: 0.6, noLife: true });
    return g + w;
  };
  K.applyEffects = () => {
    const G = world.gameplay;
    if (built(1)) G.addGrove();
    G.power = built(2) ? E.observatoryPower : 1; G.critMult = cfg.rhythm.critMult * (built(2) ? E.observatoryCrit : 1);
    world.magnet = built(4);
  };

  // ---------- eggs and critters ----------
  K.addEgg = (kind, x, y) => {
    const s = S(); if (s.eggs.length >= E.maxEggs) { K.loot(x, y, 'gem', 20); return; }
    s.eggs.push({ kind, warm: 0, taps: 0 }); bus.emit('egg:drop', { kind, x, y, tx: LAYOUT.nestX, ty: LAYOUT.nestY - 30 }); world.saver.now();
  };
  K.buyEgg = (kind) => { const s = S(), c = E.eggCost[kind]; if (s.starGems < c || s.eggs.length >= E.maxEggs) return false; s.starGems -= c; K.addEgg(kind, 360, 1040); return true; };
  K.eggReady = () => { const e = S().eggs[0]; return !!e && e.warm >= E.incubateSec; };
  K.eggAt = (x, y) => { const e = S().eggs[0]; return e && Math.hypot(x - LAYOUT.nestX, y - (LAYOUT.nestY - 34)) < 46 * cfg.physics.hitboxScale; };
  K.tapEgg = () => {
    const s = S(), e = s.eggs[0]; if (!e) return false;
    K.eggWob = 1;
    if (e.warm < E.incubateSec) { bus.emit('egg:poke', { x: LAYOUT.nestX, y: LAYOUT.nestY - 34 }); return true; }
    e.taps++;
    bus.emit('egg:tap', { n: e.taps, x: LAYOUT.nestX, y: LAYOUT.nestY - 34 });
    if (e.taps >= E.hatchTaps) K.hatch();
    return true;
  };
  K.hatch = () => {
    const s = S(), e = s.eggs.shift(); if (!e) return;
    const species = rollSpecies(e.kind, rng, s.stats.hatched);
    const c = { id: s.nextId++, species, stage: 1, xp: 0 };
    if (s.critters.length >= E.maxCritters) { K.loot(LAYOUT.nestX, LAYOUT.nestY - 40, 'gem', 60); bus.emit('egg:hatch', { critter: null, x: LAYOUT.nestX, y: LAYOUT.nestY - 34, kind: e.kind }); return; }
    s.critters.push(c); s.stats.hatched++;
    if (s.activeCritterIds.length < 3) s.activeCritterIds.push(c.id);
    world.gameplay.setHelpers(s.activeCritterIds);
    K.eggPop = 1;
    bus.emit('egg:hatch', { critter: c, x: LAYOUT.nestX, y: LAYOUT.nestY - 34, kind: e.kind });
    world.saver.now();
  };
  K.evolveCost = (c) => evolveCost(c.stage, c.species, E);
  K.canEvolve = (c) => c.stage < 3 && S().starGems >= K.evolveCost(c);
  K.evolve = (id) => {
    const c = K.critter(id), s = S(); if (!c || !K.canEvolve(c)) return false;
    s.starGems -= K.evolveCost(c); c.stage++;
    bus.emit('evolve', { critter: c, hero: id === s.heroId });
    world.saver.now(); K.submitScore(true); return true;
  };
  K.setHero = (id) => {
    const s = S(); if (!K.critter(id) || id === s.heroId) return false;
    const old = s.heroId; s.heroId = id; s.activeCritterIds = s.activeCritterIds.filter((k) => k !== id);
    if (s.activeCritterIds.length < 3) s.activeCritterIds.push(old);
    world.gameplay.setHelpers(s.activeCritterIds); bus.emit('hero', { id }); world.saver.now(); return true;
  };

  // ---------- arrival, daily gift, offline growth ----------
  K.onLoaded = (now) => {
    const s = S(), today = dayKey(now);
    K.applyEffects(); world.gameplay.setHelpers(s.activeCritterIds);
    K.firstEggGiven = s.stats.hatched > 0 || s.eggs.length > 0;
    const away = s.lastSeen ? (now - s.lastSeen) / 1000 : 0, grown = offlineGems(away, E, built(3));
    if (grown > 0) { setTimeout(() => { K.loot(LANDMARK_X[3], LANDMARK_BASE - 90, 'gem', grown, 2.2); bus.emit('welcome', { gems: grown }); }, 1200); }
    if (s.firstDay && s.firstDay !== today && s.giftDay !== today) { s.giftDay = today; setTimeout(() => K.addEgg('gift', 360, 200), 1800); bus.emit('gift', {}); }
    if (!s.giftDay) s.giftDay = today;
  };
  K.submitScore = (force) => {
    const v = gardenStars(S().stats.lifetime); if (v === K.lastBoard || (!force && v - K.lastBoard < 5)) return;
    K.lastBoard = v;
    try { const p = window.lib.addPlayerScoreToLeaderboard(v, 5); if (p && p.catch) p.catch(() => {}); } catch (e) { /* not signed in */ }
  };

  // ---------- frame ----------
  K.update = (dt) => {
    const s = S();
    for (let i = 0; i < 6; i++) if (K.anim[i] > 0 && K.anim[i] < 2) K.anim[i] += dt;
    K.eggWob = Math.max(0, K.eggWob - dt * 2.2); K.eggPop = Math.max(0, K.eggPop - dt * 1.5);
    if (s.eggs[0]) s.eggs[0].warm += dt;
    if (world.mode !== 'play') return;
    if (!s.planted && s.activeLandmark < 6) { K.plantT += dt; if (K.plantT > 24) K.plant(); }
    if (built(0)) { K.honeyT += dt; if (K.honeyT > E.honeyEverySec) { K.honeyT = 0; K.loot(LANDMARK_X[0], LANDMARK_BASE - 110, 'honey', 3 * K.mult()); } }
    if (built(3)) { K.ferrisT += dt; if (K.ferrisT > 2.5) { K.ferrisT = 0; K.loot(LANDMARK_X[3], LANDMARK_BASE - 120, 'gem', E.ferrisGemsPerSec * 2.5 * K.mult()); } }
    K.wheelA += dt * (built(3) ? 0.6 : 0);
    s.stats.playSec += dt;
    K.boardT += dt; if (K.boardT > 90) { K.boardT = 0; K.submitScore(false); }
  };

  // ---------- drawing ----------
  /** Landmark row: pedestals, the goal ghost, fill rings, built landmarks with their origami pop-up. */
  K.drawLandmarks = (ctx, art, t) => {
    const s = S();
    for (let i = 0; i < 6; i++) {
      const x = LANDMARK_X[i], y = LANDMARK_BASE, l = s.landmarks[i], sp = art['landmark' + i];
      if (!l.built) {
        // empty spot: a stone plinth carrying a little model of what will grow there
        put(ctx, art.pedestal, x, y - 6);
        const active = i === s.activeLandmark && s.planted, next = i === s.activeLandmark && !s.planted;
        if (active) {
          // growing: a gold meter ring around the model, filling as gems arrive
          const p = K.progress(i), r = 44, cy = y - 66;
          if (art.glow) put(ctx, art.glow, x, cy, 1.4, 1.4, 0, 0.25 + 0.15 * Math.sin(t * 4));
          ctx.save(); ctx.lineCap = 'round';
          ctx.fillStyle = rgba(PAL.cream, 0.55); ctx.beginPath(); ctx.arc(x, cy, r - 6, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = PAL.plum; ctx.lineWidth = 13; ctx.beginPath(); ctx.arc(x, cy, r, 0, Math.PI * 2); ctx.stroke();
          ctx.strokeStyle = mix(PAL.cream, PAL.lav, 0.3); ctx.lineWidth = 8; ctx.beginPath(); ctx.arc(x, cy, r, 0, Math.PI * 2); ctx.stroke();
          if (p > 0) { ctx.strokeStyle = PAL.gold; ctx.lineWidth = 8; ctx.beginPath(); ctx.arc(x, cy, r, -Math.PI / 2, -Math.PI / 2 + p * Math.PI * 2); ctx.stroke(); }
          ctx.restore();
          if (sp) put(ctx, sp, x, cy + 30, 0.3, 0.3, 0, 1);
        } else if (sp) put(ctx, sp, x, y - 14, 0.3 + (next ? 0.03 * Math.sin(t * 5) : 0), 0.3 + (next ? 0.03 * Math.sin(t * 5) : 0), 0, i < s.activeLandmark + 2 ? 0.95 : 0.6);
        continue;
      }
      if (!sp) continue;
      const a = K.anim[i];
      if (a > 0 && a < 1.2) K.drawPopup(ctx, sp, x, y - 10, a); else put(ctx, sp, x, y - 10, 1, 1 + Math.sin(t * 1.3 + i) * 0.006);
      K.drawLive(ctx, art, i, x, y - 10, t);
    }
  };
  /** Three-tier origami unfold: each third of the sprite hinges up from its bottom, staggered. */
  K.drawPopup = (ctx, sp, x, y, a) => {
    const img = sp.img, sx = img.width / sp.w;
    for (let k = 0; k < 3; k++) {
      const u = clamp((a - k * 0.16) / 0.5, 0, 1); if (u <= 0) continue;
      const e = easeOutBack(u), hh = sp.h / 3, srcY = (2 - k) * hh, bottom = y - sp.h * sp.ay + srcY + hh, dh = hh * e;
      ctx.drawImage(img, 0, srcY * sx, img.width, hh * sx, x - sp.w * sp.ax, bottom - dh, sp.w, dh);
    }
  };
  /** Moving parts on finished landmarks. */
  K.drawLive = (ctx, art, i, x, y, t) => {
    if (i === 3 && art.wheel) {
      const cx = x, cy = y - 104; put(ctx, art.wheel, cx, cy, 0.8, 0.8, K.wheelA);
      if (art.cabins) for (let k = 0; k < 8; k++) { const a = K.wheelA + k / 8 * Math.PI * 2; put(ctx, art.cabins[k % 4], cx + Math.cos(a) * 48, cy + Math.sin(a) * 48, 0.9); }
    }
    if (i === 4) { ctx.save(); ctx.strokeStyle = rgba(mix(PAL.teal, PAL.cream, 0.5), 0.75); ctx.lineWidth = 3; for (let k = -1; k <= 1; k += 2) { ctx.beginPath(); ctx.moveTo(x, y - 82); ctx.quadraticCurveTo(x + k * 30, y - 112 - Math.sin(t * 5) * 4, x + k * 40, y - 26); ctx.stroke(); } ctx.restore(); if (art.glowTeal) put(ctx, art.glowTeal, x, y - 112, 0.7, 0.7, 0, 0.5 + 0.3 * Math.sin(t * 3)); }
    if (i === 5 && art.glow) { put(ctx, art.glow, x, y - 146, 1.2, 1.2, 0, 0.6 + 0.3 * Math.sin(t * 2.5)); ctx.save(); ctx.globalAlpha = 0.18; ctx.fillStyle = PAL.gold; ctx.translate(x, y - 146); ctx.rotate(Math.sin(t * 0.8) * 0.8); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(260, -40); ctx.lineTo(260, 40); ctx.fill(); ctx.restore(); }
    if (i === 2 && art.star) put(ctx, art.star, x - 20, y - 160 + Math.sin(t * 2) * 3, 0.8 + 0.2 * Math.sin(t * 5), 0.8 + 0.2 * Math.sin(t * 5), t, 0.9);
  };
  /** Nest with the first egg: warm glow, spring wobble, crack lines, light rays when ready. */
  K.drawNest = (ctx, art, t) => {
    const s = S(), x = LAYOUT.nestX, y = LAYOUT.nestY;
    put(ctx, art.nest, x, y);
    const e = s.eggs[0];
    if (!e || !art.eggs) return;
    const ready = e.warm >= E.incubateSec, wob = Math.sin(t * 30) * K.eggWob * 0.18 + (ready ? Math.sin(t * 6) * 0.05 : 0);
    if (ready && art.glow) put(ctx, art.glow, x, y - 38, 1.6, 1.6, 0, 0.5 + 0.3 * Math.sin(t * 4));
    if (ready && e.taps > 0) { ctx.save(); ctx.globalAlpha = 0.25 + e.taps * 0.12; ctx.fillStyle = mix(PAL.gold, PAL.cream, 0.4); for (let k = 0; k < 6; k++) { const a = t * 0.6 + k * Math.PI / 3; ctx.beginPath(); ctx.moveTo(x, y - 40); ctx.lineTo(x + Math.cos(a) * 110, y - 40 + Math.sin(a) * 110); ctx.lineTo(x + Math.cos(a + 0.16) * 110, y - 40 + Math.sin(a + 0.16) * 110); ctx.fill(); } ctx.restore(); }
    const sq = 1 + K.eggWob * 0.08;
    put(ctx, art.eggs[e.kind], x, y - 6, 1 / sq, sq, wob);
    if (e.taps > 0) {
      ctx.save(); ctx.translate(x, y - 46); ctx.rotate(wob); ctx.strokeStyle = PAL.plum; ctx.lineWidth = 2.5; ctx.lineJoin = 'round';
      const cracks = [[[-14, -6], [-6, 2], [-10, 10], [0, 16]], [[16, -14], [8, -4], [14, 4], [6, 12]], [[-4, -24], [2, -16], [-2, -8], [6, -2]]];
      for (let k = 0; k < Math.min(e.taps, 3); k++) { ctx.beginPath(); cracks[k].forEach(([a, b], j) => (j ? ctx.lineTo(a, b) : ctx.moveTo(a, b))); ctx.stroke(); ctx.strokeStyle = rgba(PAL.gold, 0.9); ctx.lineWidth = 1.2; ctx.stroke(); ctx.strokeStyle = PAL.plum; ctx.lineWidth = 2.5; }
      ctx.restore();
    }
    if (!ready) { const u = e.warm / E.incubateSec; ctx.save(); ctx.strokeStyle = rgba(PAL.gold, 0.85); ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(x, y - 44, 54, -Math.PI / 2, -Math.PI / 2 + u * Math.PI * 2); ctx.stroke(); ctx.restore(); }
  };
  return K;
}
