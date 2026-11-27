// PROTOTYPE - NOT FOR PRODUCTION
/**
 * Wonder Sprout: Royal Sky-Garden. A portrait slingshot-bounce toy for kids 6 to 12 with a pet and kingdom
 * meta: drag anywhere to pull the critter back on the golden sling, let go to bounce it through jelly
 * mushrooms, crystal geodes, star-fruit trees and pinatas, tap a crystal when its ring meets the core for a
 * SUPER NOVA, and watch the star-gems fly into the next landmark of the floating island. Eggs hatch helpers
 * that keep the gems coming; star-gems evolve every critter through three stages. No fail state.
 *
 * Seven modules talk only through one EventBus and one serializable GameState:
 * m0 orchestrator core, m1 art bakery, m2 audio, m3 physics and gameplay, m4 kingdom and critters,
 * m5 VFX and kinematics, m6 kids portrait UI. This file builds them, routes input, runs the frame loop
 * and maps game events to sound and vibration. Everything is drawn by code; there are no image, font or
 * audio files. Tunable numbers live in game_config.json.
 */
import { W, H, VIEW, LAYOUT, EventBus, makeRng, readConfig, freshState, validateState, makeSaver, loadSaved, fitCanvas, toStage, frameDt, makeQuality, guessTier, warn } from './m0-orchestrator.js';
import { createBakery, drawBackdrop, drawTerrace, drawForeground, drawGrain } from './m1-art-bakery.js';
import { createAudio } from './m2-audio-engine.js';
import { createGameplay } from './m3-physics-gameplay.js';
import { createKingdom } from './m4-kingdom-critters.js';
import { createVfx } from './m5-vfx-kinematics.js';
import { createUI } from './m6-kids-portrait-ui.js';
import { createGoals } from './m7-garden-goals.js';

const DEFAULTS = {
  settings: { music: true, effects: true, haptics: true },
  physics: { critterRadius: 34, maxPull: 170, launchPower: 13.5, maxSpeed: 2300, drag: 0.62, restSpeed: 70, friction: 260, wallBounce: 0.82, bumperBoost: 1.18, bumperMin: 900, substep: 1 / 120, hitboxScale: 1.45, assistDeg: 6, assistConeDeg: 20, tapMovePx: 14, tapMs: 220, returnSec: 0.45 },
  rhythm: { period: 2.6, ringStart: 2.3, window: 0.13, critMult: 5 },
  economy: { landmarkGems: 240, landmarkWood: 3, landmarkGrowth: 1.85, toLandmarkShare: 0.65, gemsPerHit: { mushroom: 1, geode: 3, tree: 1, pinata: 2, raid: 4 }, woodPerTreeHit: 1, geodeHp: 3, geodeBurst: 8, pinataHp: 5, pinataBurst: 18, pinataEggChance: 0.12, goalGems: 20, goalGrowth: 0.04, goalEggEvery: 6, respawnSec: { geode: 3.5, pinata: 7 }, eggCost: { meadow: 300, coral: 1200 }, incubateSec: 5, hatchTaps: 3, evolveBase: 900, evolveGrowth: 2.3, stageMult: [1, 1.7, 2.8], helperEverySec: [4.2, 3.2, 2.4], helperGems: 2, honeyEverySec: 6, ferrisGemsPerSec: 0.8, observatoryPower: 1.15, observatoryCrit: 1.4, offlineCapHours: 8, offlineShare: 0.25, maxCritters: 12, maxEggs: 6 },
  raid: { firstSec: 75, everySec: 75, staySec: 22, weakHp: 3, burstGems: 50 },
  fx: { hitstopMs: 45, shake: 1, beatCooldownSec: 8, particleCap: [180, 350, 600] },
  quality: { scale: [0.8, 1, 1.25], downFps: 45, upFps: 58, upAfterSec: 10 },
};

let world = null;

/** Creator settings panel (both modes, once). */
function registerParameters() {
  if (registerParameters.done) return;
  try {
    window.lib.showGameParameters({
      name: 'Wonder Sprout',
      params: {
        'Music on': { key: 'settings.music', type: 'checkbox' },
        'Sky pirates every (s)': { key: 'raid.everySec', type: 'slider', min: 40, max: 180, step: 5 },
        'First landmark cost': { key: 'economy.landmarkGems', type: 'slider', min: 60, max: 600, step: 20 },
        'Gold ring speed (s)': { key: 'rhythm.period', type: 'slider', min: 1.6, max: 4, step: 0.1 },
        'Egg warm-up (s)': { key: 'economy.incubateSec', type: 'slider', min: 2, max: 15, step: 1 },
      },
    });
    registerParameters.done = true;
  } catch (e) { warn('parameters: ' + e); }
}

/** Copy the creator's live config into the shared cfg object (sections stay the same objects). */
function refreshConfig(cfg) {
  const fresh = readConfig(DEFAULTS, window.gameConfig || {});
  for (const k of Object.keys(fresh)) { if (cfg[k] && typeof cfg[k] === 'object' && !Array.isArray(cfg[k])) Object.assign(cfg[k], fresh[k]); else cfg[k] = fresh[k]; }
  return cfg;
}

function build() {
  const canvas = document.getElementById('c') || Object.assign(document.body.appendChild(document.createElement('canvas')), { id: 'c' });
  const ctx = canvas.getContext('2d', { alpha: false });
  const cfg = refreshConfig({});
  const bus = new EventBus(), clock = () => performance.now() / 1000;
  const w = { bus, cfg, rng: makeRng((Date.now() ^ 0x5eed) >>> 0), state: freshState(Date.now()), mode: 'play', pointer: [360, 700], magnet: false, canvas, ctx };
  w.saver = makeSaver(() => w.state, clock);
  w.quality = makeQuality(cfg.quality, guessTier());
  const resize = () => { const s = w.quality.scale; fitCanvas(canvas); canvas.width = Math.round(VIEW.w * s); canvas.height = Math.round(VIEW.h * s); };
  resize();
  w.art = createBakery(w.quality.scale); w.art.lite = w.quality.tier === 0;
  w.audio = createAudio(); w.audio.setOn(w.state.sound);
  w.gameplay = createGameplay(w);
  w.kingdom = createKingdom(w);
  w.vfx = createVfx(w); w.vfx.setTier(w.quality.tier);
  w.ui = createUI(w);
  w.goals = createGoals(w);
  wireEvents(w);
  wireInput(w);
  addEventListener('resize', () => resize());
  document.addEventListener('visibilitychange', () => { if (document.hidden) w.saver.now(); });
  w.resize = resize;
  // saved progress arrives a moment later; the island is playable meanwhile
  loadSaved().then((raw) => adopt(w, raw));
  return w;
}

/** Take the saved state, keeping anything earned in the seconds before it arrived. */
function adopt(w, raw) {
  const now = Date.now(), cur = w.state;
  if (raw) {
    const s = validateState(raw, now);
    if (s.stats.lifetime > 0 || s.critters.length > 1) {
      s.starGems += cur.starGems; s.magicWood += cur.magicWood; s.stats.lifetime += cur.stats.lifetime; s.stats.flings += cur.stats.flings;
      s.ftue.done |= cur.ftue.done; s.ftue.skipped = s.ftue.skipped || cur.ftue.skipped;
      for (const e of cur.eggs) if (s.eggs.length < w.cfg.economy.maxEggs) s.eggs.push(e);
      w.state = s; w.ui.setLang(s.lang || w.ui.lang); w.audio.setOn(s.sound); w.audio.setMusic(!s.musicOff && w.cfg.settings.music !== false);
      if (s.stats.flings > 0) w.ui.logoGone = true;
    }
  }
  w.kingdom.onLoaded(now);
  w.loaded = true;
}

function wireEvents(w) {
  const { bus, audio } = w;
  const buzz = (p) => { try { if (w.cfg.settings.haptics !== false) window.lib.haptics.play(p); } catch (e) { /* no motor */ } };
  bus.on('aim', (e) => audio.stretch(e.tension));
  bus.on('aim:cancel', () => audio.stretchEnd());
  bus.on('launch', (e) => { audio.stretchEnd(); audio.launch(e.tension); buzz('tap'); w.state.stats.flings++; w.saver.soon(); });
  bus.on('hit', (e) => { if (e.by === 'helper') { audio.impact(1, false); return; } if (e.type === 'mushroom') audio.bumper(e.combo); else audio.impact(e.combo || 1, e.type === 'pinata'); if (e.by === 'hero') buzz('tap'); w.state.comboCount = e.combo || 0; });
  bus.on('burst', (e) => { audio.shatter(); buzz('thud'); });
  bus.on('nova', () => { audio.nova(); buzz('thud'); w.state.stats.crits++; });
  bus.on('land', (e) => { w.state.stats.bestCombo = Math.max(w.state.stats.bestCombo, e.combo); w.state.comboCount = 0; });
  bus.on('landmark:built', (e) => { audio.harp(); buzz('success'); w.saver.now(); if (e.i === 5) setTimeout(() => bus.emit('world:done', {}), 1800); });
  bus.on('landmark:planted', () => w.saver.soon());
  bus.on('egg:tap', (e) => { audio.heartbeat(); audio.crack(e.n); buzz('tap'); });
  bus.on('egg:poke', () => audio.click());
  bus.on('egg:hatch', () => { audio.hatch(); buzz('success'); });
  bus.on('evolve', () => { audio.fanfare(); buzz('success'); });
  bus.on('raid:start', () => audio.horn());
  bus.on('raid:weak', () => { audio.shatter(); buzz('thud'); });
  bus.on('raid:break', () => { audio.nova(); buzz('success'); w.saver.now(); });
  bus.on('world:done', () => audio.fanfare());
  bus.on('wallet', () => w.saver.soon());
}

function wireInput(w) {
  const c = w.canvas;
  let active = null;
  c.addEventListener('pointerdown', (e) => {
    w.audio.unlock();
    if (active !== null && active !== e.pointerId) return;
    const p = toStage(c, e); w.pointer = [p.x, p.y];
    if (w.ui.down(p)) return;
    if (w.mode !== 'play') return;
    if (w.kingdom.eggAt(p.x, p.y)) { w.kingdom.tapEgg(); return; }
    if (w.gameplay.down(p)) { active = e.pointerId; try { c.setPointerCapture(e.pointerId); } catch (err) { /* old browser */ } }
  });
  c.addEventListener('pointermove', (e) => { const p = toStage(c, e); w.pointer = [p.x, p.y]; if (e.pointerId === active) w.gameplay.move(p); });
  const end = (e) => { if (e.pointerId !== active) return; active = null; w.gameplay.up(); };
  c.addEventListener('pointerup', end);
  c.addEventListener('pointercancel', (e) => { if (e.pointerId !== active) return; active = null; w.gameplay.cancel(); });
  c.addEventListener('contextmenu', (e) => e.preventDefault());
  // keyboard: Space flings at the last aim, 1-3 open drawers, Esc closes, M toggles sound
  let lastPull = { x: 0, y: 120 };
  w.bus.on('launch', (e) => { lastPull = { x: -e.vx / w.cfg.physics.launchPower, y: -e.vy / w.cfg.physics.launchPower }; });
  addEventListener('keydown', (e) => {
    w.audio.unlock();
    if (w.mode !== 'play') return;
    if (e.code === 'Space' && w.gameplay.hero.mode === 'rest' && !w.ui.open) { w.gameplay.launch(lastPull.x, lastPull.y); e.preventDefault(); }
    else if (e.key === '1' || e.key === '2' || e.key === '3') w.ui.openDrawer(['hatchery', 'kingdom', 'evolution'][+e.key - 1]);
    else if (e.key === 'Escape') { if (w.ui.open) w.ui.closeDrawer(); w.ui.sheet = false; w.gameplay.cancel(); }
    else if (e.key === 'm' || e.key === 'M') { w.state.sound = !w.state.sound; w.audio.setOn(w.state.sound); }
  });
}

function frame(w, now) {
  const raw = w.last ? (now - w.last) / 1000 : 0; w.last = now;
  const dt = frameDt(raw);
  // FPS watchdog: a lower tier renders smaller, caps particles and drops grain and far parallax layers
  if (w.quality.sample(raw > 0 && raw < 1 ? raw : 0)) { w.resize(); w.art.rescale(w.quality.scale); w.vfx.setTier(w.quality.tier); w.art.lite = w.quality.tier === 0; }
  const V = w.vfx;
  let wdt = dt;
  if (V.hitstop > 0) { V.hitstop -= dt; wdt = 0; } else wdt = dt * V.timeScale;
  if (w.mode === 'play') w.gameplay.update(wdt); else w.gameplay.time += dt;
  w.kingdom.update(wdt);
  V.update(V.hitstop > 0 ? 0 : dt);
  w.ui.update(dt);
  w.goals.update(dt);
  w.audio.tick();
  if (w.art.queue.length) w.art.pump(w.firstFrames > 2 ? 4 : 0);
  w.saver.tick();
  w.firstFrames = (w.firstFrames || 0) + 1;
  render(w, V.time);
  // dev:start
  if (w.firstFrames === 1 && window.__load) window.__load.done();
  // dev:end
}

function render(w, t) {
  const { ctx, art, gameplay: G, kingdom: K, vfx: V, ui: U, state: s } = w, sc = w.canvas.width / VIEW.w;
  const px = (G.hero.x - LAYOUT.slingX) / 360;
  ctx.setTransform(sc, 0, 0, sc, VIEW.dx * sc, VIEW.dy * sc);
  ctx.save(); V.applyCamera(ctx);
  drawBackdrop(ctx, art, t, px);
  V.drawRainbow(ctx, t);
  K.drawLandmarks(ctx, art, t);
  drawTerrace(ctx, art, t, px);
  U.drawWorldMarks(ctx, t, V);
  if (art.nest) K.drawNest(ctx, art, t);
  V.drawTargets(ctx, G, t, w.mode === 'play');
  V.drawRaid(ctx, G, t);
  for (const h of G.helpers) { const c = K.critter(h.id); if (c) V.drawCritter(ctx, c, h.x, h.y + 26, { vx: h.vx, vy: h.vy, fly: h.mode === 'dash', idle: h.mode === 'wander', size: 0.78, look: w.pointer, air: Math.abs(Math.sin(h.hop * 9)) * (h.mode === 'wander' ? 8 : 0) }); }
  V.drawSlingBack(ctx, G);
  const hero = K.hero(), h = G.hero;
  V.drawTrail(ctx, h, t);
  V.drawCritter(ctx, hero, h.x, h.y + 30, { vx: h.vx, vy: h.vy, fly: h.mode === 'fly', idle: h.mode === 'rest', look: w.pointer, happy: h.mode !== 'fly', size: 1.2, pull: G.tension() });
  V.drawSlingFront(ctx, G);
  V.drawEggFly(ctx);
  V.drawOrbs(ctx);
  V.drawParticles(ctx);
  drawForeground(ctx, art, t);
  ctx.restore();
  drawGrain(ctx, art);
  V.drawOverlay(ctx);
  U.drawLogo(ctx, t);
  U.drawHUD(ctx, t, V);
  w.goals.draw(ctx, t);
  U.drawDock(ctx, t);
  U.drawToasts(ctx, t);
  U.drawDrawer(ctx, t);
  U.drawFtue(ctx, t);
  U.drawSheet(ctx);
  void s;
}

/** Host entry point: called on start and on every reload; Edit shows the living island without play. */
function run(mode) {
  try {
    registerParameters();
    if (!world) {
      world = build();
      const loop = (now) => { try { frame(world, now); } catch (e) { warn('frame: ' + (e && e.stack || e)); } requestAnimationFrame(loop); };
      requestAnimationFrame(loop);
      const card = document.getElementById('boot'); if (card) requestAnimationFrame(() => { card.style.opacity = '0'; setTimeout(() => card.remove(), 300); });
      // dev:start
      window.__ws = world; world.VIEW = VIEW;
      if ('__load' in window) window.__load = { done() {} };
      // dev:end
    } else refreshConfig(world.cfg);
    world.mode = mode === 'edit' ? 'edit' : 'play';
    world.gameplay.enabled = world.mode === 'play';
    world.audio.setMusic(world.cfg.settings.music !== false && !world.state.musicOff);
    if (world.mode === 'edit') { world.art.finish(); world.gameplay.cancel(); }
  } catch (e) { warn('run: ' + (e && e.stack || e)); }
}
window.run = run;
