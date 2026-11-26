/* Rub It Away sound: generated Astrocade audio (three music tracks by world, a background loop per world, a payoff sound per level, the sound each wrong-rub speech bubble names, rub loop, pop, boing, plop, win, star, tap, whoosh) decoded in the background through Web Audio, the level sounds when a level that needs them opens, with the old synth as fallback until a file is decoded or if it fails. Context is created on the first tap; silent if the browser has no audio. */
let ctx = null, master = null, rubGain = null, rubFilter = null, noise = null;
let musicGain = null, musicSrc = null, rubSrc = null, rubFileGain = null, unlocked = false, duckT = 0;
let ambGain = null, ambSrc = null, ambId = null, musicId = 'ria_music', wantMusic = 'ria_music', wantAmb = null, voices = 0;
let musicEnabled = true, effectsEnabled = true, currentRubAsset = 'ria_rub';
const bufs = {}, raw = {}, failed = {};
const dev = () => (window.__RUB_DEV ? (window.__RUB_AUDIO = window.__RUB_AUDIO || { decoded: [], played: {}, failed: [] }) : null);

// sfx name -> asset id, level (files differ a lot in loudness), pitch jitter
const MAP = {
  pop: { id: 'ria_pop', g: 0.9, j: 0.14 }, boing: { id: 'ria_boing', g: 0.8, j: 0.05 }, win: { id: 'ria_win', g: 0.85, j: 0 },
  star: { id: 'ria_star', g: 0.7, j: 0.04 }, tick: { id: 'ria_tap', g: 0.8, j: 0.05 }, tap: { id: 'ria_tap', g: 0.8, j: 0.05 },
  plop: { id: 'ria_plop', g: 0.8, j: 0.06 }, whoosh: { id: 'ria_whoosh', g: 0.7, j: 0 },
  // the same files played lower or higher: a soft low blip when a wrong rub counts, a ticklish two-note giggle
  lost: { id: 'ria_tap', g: 0.5, j: 0.03, r: 0.55 }, tickle: { id: 'ria_tap', g: 0.65, j: 0.06, r: 1.7 },
  snow_bell: { id: 'snow_bell', g: 0.65, j: 0 },
};
const LOOPS = { rub: { id: 'ria_rub', g: 1.4 }, music: { id: 'ria_music', g: 0.2 } };
// GAINS-BEGIN (levels measured by tools/audio_levels.py; files differ a lot in loudness)
const XG = { f_bubbles: 1.5, f_carousel: 1.5, f_cheer: 0.77, f_creak: 0.77, f_firework: 0.77, f_hiss: 0.94, f_honk: 0.77, f_horn: 0.77, f_power: 0.92, f_purr: 0.92, f_rocket: 0.77, f_rooster: 0.81, f_sparkle: 1.08, f_splash: 0.77, f_tada: 0.77, f_tweet: 0.84, f_ufo: 0.94, g_beep: 1.6, g_buzz: 1.11, g_clang: 0.77, g_creak: 1.24, g_croak: 0.77, g_ding: 1.6, g_drip: 1.1, g_drum: 1.6, g_flap: 0.77, g_ghiss: 1.52, g_giggle: 0.77, g_hoot: 0.77, g_snap: 0.77, g_sneeze: 0.77, g_snore: 0.77, g_squawk: 0.77, g_squeak: 1.02, g_strum: 0.77, g_thud: 0.81, g_toot: 0.77, g_uhoh: 0.77, g_woof: 0.77, g_zap: 0.77 };
const MG = { 'ria_music': 0.2, 'ria_music_adv': 0.19, 'ria_music_fun': 0.21 };
const AG = { 'ria_amb_birds': 0.35, 'ria_amb_fair': 0.6, 'ria_amb_jungle': 0.6, 'ria_amb_kitchen': 0.6, 'ria_amb_night': 0.25, 'ria_amb_sea': 0.15, 'ria_amb_space': 0.1, 'ria_amb_waves': 0.25, 'ria_amb_wind': 0.45 };
// GAINS-END
// payoff sounds (f_*: what happens in the picture when the level is fixed) and gag sounds (g_*: the sound a wrong-rub speech bubble names); fetched when a level that uses them opens
const EXTRA = {};
for (const k of Object.keys(XG)) EXTRA[k] = { id: 'ria_' + k, g: XG[k], j: k[0] === 'g' ? 0.06 : 0.02 };
// speech bubble key (r_<word>) -> sound; words without an entry keep the level's own boing or pop
export const SAY = {
  oops: 'g_uhoh', lost: 'g_uhoh', grumpy: 'g_uhoh', hi: 'g_giggle', whee: 'g_giggle', peek: 'g_giggle', haha: 'g_giggle', creak: 'g_creak', croak: 'g_croak', boom: 'g_drum',
  cool: 'g_strum', strum: 'g_strum', eek: 'g_squeak', squeak: 'g_squeak', drip: 'g_drip', splash: 'f_splash', squawk: 'g_squawk', caw: 'g_squawk', snap: 'g_snap', flap: 'g_flap',
  tweet: 'f_tweet', buzz: 'g_buzz', hoot: 'g_hoot', coo: 'g_hoot', boo: 'g_hoot', woof: 'g_woof', beep: 'g_beep', zoom: 'whoosh', whoosh: 'whoosh', zap: 'g_zap', clang: 'g_clang',
  wow: 'f_sparkle', bow: 'f_sparkle', twinkle: 'f_sparkle', bloom: 'f_sparkle', bob: 'plop', splat: 'plop', thud: 'g_thud', toot: 'g_toot', honk: 'g_toot', ding: 'g_ding', jingle: 'g_ding',
  achoo: 'g_sneeze', zzz: 'g_snore', gift: 'f_horn', tada: 'f_tada', glug: 'f_bubbles', blub: 'f_bubbles', hiss: 'g_ghiss',
};
// level number -> payoff sound, index 0 = level 1
export const FIX = ('f_sparkle f_purr g_woof f_tweet f_sparkle f_cheer f_hiss f_tada f_tada f_splash f_horn f_splash ' +
  'f_splash f_tada g_giggle f_splash f_tada f_splash f_honk f_rooster f_creak f_sparkle f_cheer f_firework ' +
  'f_rocket f_sparkle f_tada f_sparkle f_power f_ufo f_cheer f_tada g_woof f_splash f_cheer f_firework ' +
  'f_creak g_flap f_tada f_cheer f_sparkle f_tada f_bubbles f_tada f_power f_bubbles f_creak f_firework ' +
  'f_carousel f_horn f_tada g_clang f_power f_firework f_cheer f_tweet f_tada f_splash f_sparkle f_creak').split(' ');
// world -> music track and background sound; a night or evening level swaps the background for crickets
const WORLD = {
  garden: ['ria_music', 'ria_amb_birds'], kitchen: ['ria_music', 'ria_amb_kitchen'], pond: ['ria_music', 'ria_amb_wind'], zoo: ['ria_music', 'ria_amb_birds'], town: ['ria_music', 'ria_amb_birds'],
  space: ['ria_music_adv', 'ria_amb_space'], castle: ['ria_music_adv', 'ria_amb_birds'], sea: ['ria_music_adv', 'ria_amb_sea'], jungle: ['ria_music_adv', 'ria_amb_jungle'],
  beach: ['ria_music_fun', 'ria_amb_waves'], fair: ['ria_music_fun', 'ria_amb_fair'], snow: ['ria_music', 'ria_amb_wind'],
};
const NIGHT = 'ria_amb_night';
const ORDER = ['ria_pop', 'ria_rub', 'ria_music', 'ria_win', 'ria_star', 'ria_boing', 'ria_tap', 'ria_plop', 'ria_whoosh'];

function urlOf(id) { try { const a = window.lib && window.lib.getAsset(id); return a && a.url ? a.url : null; } catch (e) { return null; } }

// bytes are fetched at once (no gesture needed), decoded as soon as the context exists; never blocks boot
function prefetch() {
  ORDER.forEach((id) => {
    if (raw[id] || failed[id]) return;
    const u = urlOf(id); if (!u) return;
    raw[id] = fetch(u).then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(r.status)))).then((b) => { raw[id] = b; decodeAll(); }).catch(() => { failed[id] = 1; const d = dev(); if (d) d.failed.push(id); });
  });
}

function decodeAll() {
  if (!ctx) return;
  ORDER.forEach((id) => {
    const b = raw[id];
    if (!(b instanceof ArrayBuffer) || bufs[id]) return;
    raw[id] = null;
    const done = (buf) => { bufs[id] = buf; const d = dev(); if (d) d.decoded.push(id); if (id === 'ria_music') startMusic(); };
    const bad = () => { failed[id] = 1; const d = dev(); if (d) d.failed.push(id); };
    try { const p = ctx.decodeAudioData(b, done, bad); if (p && p.catch) p.catch(bad); } catch (e) { bad(); }
  });
}

function startMusic() {
  if (!ctx || !unlocked || !musicEnabled || musicSrc || !bufs.ria_music) return;
  musicSrc = ctx.createBufferSource(); musicSrc.buffer = bufs.ria_music; musicSrc.loop = true;
  musicGain.gain.value = 0; musicGain.gain.setTargetAtTime(musicEnabled ? LOOPS.music.g : 0, ctx.currentTime, 0.6);
  musicSrc.connect(musicGain); musicSrc.start(); musicId = 'ria_music';
  const d = dev(); if (d) d.music = musicId;
  syncScene();
}

// one file on demand: fetched once, decoded once the context exists; cb runs when its buffer is ready (never blocks play)
const lazy = {};
function load(id, cb) {
  if (bufs[id]) { if (cb) cb(); return; }
  if (failed[id]) return;
  if (!lazy[id]) {
    const u = urlOf(id); if (!u) { failed[id] = 1; return; }
    lazy[id] = { cbs: [], raw: null };
    fetch(u).then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(r.status)))).then((b) => { lazy[id].raw = b; decodeLazy(); }).catch(() => { failed[id] = 1; const d = dev(); if (d) d.failed.push(id); });
  }
  if (cb) lazy[id].cbs.push(cb);
}
function decodeLazy() {
  if (!ctx) return;
  Object.keys(lazy).forEach((id) => {
    const L = lazy[id];
    if (!L.raw || bufs[id]) return;
    const b = L.raw; L.raw = null;
    const done = (buf) => { bufs[id] = buf; const d = dev(); if (d) d.decoded.push(id); L.cbs.splice(0).forEach((f) => f()); };
    const bad = () => { failed[id] = 1; const d = dev(); if (d) d.failed.push(id); };
    try { const p = ctx.decodeAudioData(b, done, bad); if (p && p.catch) p.catch(bad); } catch (e) { bad(); }
  });
}

// the scene's music track and background loop follow the level: cross-fade (0.5 s) once the wanted file is decoded
function syncScene() {
  if (!ctx || !unlocked) return;
  const t = ctx.currentTime;
  if (wantMusic !== musicId && musicSrc && bufs[wantMusic]) {
    const old = musicSrc, og = musicGain;
    og.gain.cancelScheduledValues(t); og.gain.setTargetAtTime(0, t, 0.18); old.stop(t + 1);
    musicGain = ctx.createGain(); musicGain.gain.value = 0; musicGain.connect(master);
    musicSrc = ctx.createBufferSource(); musicSrc.buffer = bufs[wantMusic]; musicSrc.loop = true; musicSrc.connect(musicGain); musicSrc.start(t + 0.2);
    LOOPS.music.g = MG[wantMusic] || 0.2; musicGain.gain.setTargetAtTime(musicEnabled ? LOOPS.music.g : 0, t + 0.2, 0.5);
    musicId = wantMusic; const d = dev(); if (d) d.music = musicId;
  }
  if (wantAmb !== ambId && (!wantAmb || bufs[wantAmb])) {
    if (ambSrc) { const og = ambGain; og.gain.setTargetAtTime(0, t, 0.18); ambSrc.stop(t + 1); ambSrc = null; }
    ambId = wantAmb; const d = dev(); if (d) d.amb = ambId;
    if (wantAmb) {
      ambGain = ctx.createGain(); ambGain.gain.value = 0; ambGain.connect(master);
      ambSrc = ctx.createBufferSource(); ambSrc.buffer = bufs[wantAmb]; ambSrc.loop = true; ambSrc.connect(ambGain); ambSrc.start(t);
      ambGain.gain.setTargetAtTime(AG[wantAmb] || 0.2, t, 0.5);
    }
  }
}

// called when a level opens: world = garden, kitchen ...; n = level number; says = the speech-bubble keys of its wrong-rub gags
export function scene(world, night, n, says) {
  const w = WORLD[world] || WORLD.garden, nextRubAsset = world === 'snow' ? 'snow_rub' : 'ria_rub';
  if (nextRubAsset !== currentRubAsset) {
    if (rubSrc && ctx) { try { rubSrc.stop(ctx.currentTime + 0.03); } catch (e) { /* already stopped */ } rubSrc = null; }
    currentRubAsset = nextRubAsset;
  }
  wantMusic = w[0]; wantAmb = night ? NIGHT : w[1];
  const d = dev(); if (d) d.want = [wantMusic, wantAmb];
  load(wantMusic, syncScene); load(wantAmb, syncScene);
  [FIX[n - 1]].concat((says || []).map((k) => SAY[k])).forEach((k) => { if (k && EXTRA[k]) load(EXTRA[k].id); });
  load(currentRubAsset); if (world === 'snow') load('snow_bell');
  syncScene();
}
// the payoff sound of level n (played with the win jingle); false while its file is not ready
export function fixSfx(n) { const k = FIX[n - 1]; if (k) sfx(k); }

export function configureAudio(prefs = {}) {
  musicEnabled = prefs.music !== false;
  effectsEnabled = prefs.effects !== false;
  if (!ctx) return;
  const now = ctx.currentTime;
  if (musicGain) {
    const level = musicEnabled ? (MG[wantMusic] || LOOPS.music.g) : 0;
    musicGain.gain.cancelScheduledValues(now);
    musicGain.gain.setTargetAtTime(level, now, 0.12);
  }
  if (!effectsEnabled) {
    rubGain && rubGain.gain.setTargetAtTime(0, now, 0.02);
    rubFileGain && rubFileGain.gain.setTargetAtTime(0, now, 0.02);
    if (rubSrc) { const src = rubSrc; rubSrc = null; try { src.stop(now + 0.05); } catch (e) { /* already stopped */ } }
  }
  if (musicEnabled) { startMusic(); syncScene(); }
}

export function unlock() {
  try {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
      const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -10; comp.ratio.value = 6; comp.connect(ctx.destination);
      master = ctx.createGain(); master.gain.value = 0.55; master.connect(comp);
      musicGain = ctx.createGain(); musicGain.gain.value = 0; musicGain.connect(master);
      noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const d = noise.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      const src = ctx.createBufferSource(); src.buffer = noise; src.loop = true;
      rubFilter = ctx.createBiquadFilter(); rubFilter.type = 'bandpass'; rubFilter.frequency.value = 2200; rubFilter.Q.value = 0.9;
      rubGain = ctx.createGain(); rubGain.gain.value = 0;
      src.connect(rubFilter); rubFilter.connect(rubGain); rubGain.connect(master); src.start();
      rubFileGain = ctx.createGain(); rubFileGain.gain.value = 0; rubFileGain.connect(master);
      document.addEventListener('visibilitychange', () => { try { if (document.hidden) ctx.suspend(); else ctx.resume(); } catch (e) { return; } });
    }
    if (ctx.state === 'suspended') ctx.resume();
    unlocked = true;
    prefetch(); decodeAll(); decodeLazy(); startMusic(); syncScene();
  } catch (e) { ctx = null; }
}

// speed in px/s, prog = erase progress 0..1 of the thing under the finger: the loop rises in pitch the faster and the further along the rub is
export function rub(speed, prog = 0) {
  if (!ctx) return;
  if (!effectsEnabled) {
    const t = ctx.currentTime; rubGain && rubGain.gain.setTargetAtTime(0, t, 0.02); rubFileGain && rubFileGain.gain.setTargetAtTime(0, t, 0.02);
    if (rubSrc) { const src = rubSrc; rubSrc = null; try { src.stop(t + 0.05); } catch (e) { /* already stopped */ } }
    return;
  }
  const k = Math.min(1, speed / 1100), t = ctx.currentTime;
  if (bufs[currentRubAsset]) {
    if (!rubSrc && k > 0) {
      rubSrc = ctx.createBufferSource(); rubSrc.buffer = bufs[currentRubAsset]; rubSrc.loop = true;
      rubSrc.connect(rubFileGain); rubSrc.start(); const d = dev(); if (d) d.played.rub = (d.played.rub || 0) + 1;
    }
    rubGain.gain.setTargetAtTime(0, t, 0.02);
    rubFileGain.gain.setTargetAtTime(k > 0 ? (0.25 + 0.75 * k) * LOOPS.rub.g * 0.55 : 0, t, k > 0 ? 0.04 : 0.06);
    if (rubSrc && k === 0) { const s = rubSrc; rubSrc = null; s.stop(t + 0.35); }
    rubSrc && (rubSrc.playbackRate.setTargetAtTime(0.82 + 0.26 * k + 0.4 * Math.min(1, prog), t, 0.05));
    return;
  }
  rubGain.gain.setTargetAtTime(k * 0.42, t, 0.03);
  rubFilter.frequency.setTargetAtTime(1500 + k * 2400, t, 0.04);
}

function tone(type, f0, f1, dur, vol, delay = 0) {
  if (!ctx) return;
  const t0 = ctx.currentTime + delay;
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.setValueAtTime(f0, t0); o.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t0 + dur);
  g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g); g.connect(master); o.start(t0); o.stop(t0 + dur + 0.05);
}

function burst(dur, vol, f) {
  if (!ctx) return;
  const t0 = ctx.currentTime;
  const s = ctx.createBufferSource(); s.buffer = noise;
  const fl = ctx.createBiquadFilter(); fl.type = 'bandpass'; fl.frequency.value = f; fl.Q.value = 1.2;
  const g = ctx.createGain(); g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  s.connect(fl); fl.connect(g); g.connect(master); s.start(t0); s.stop(t0 + dur + 0.05);
}

function duck(secs) {
  if (!ctx || !musicSrc || !musicEnabled) return;
  const t = ctx.currentTime;
  musicGain.gain.cancelScheduledValues(t); musicGain.gain.setTargetAtTime(LOOPS.music.g * 0.25, t, 0.05);
  musicGain.gain.setTargetAtTime(LOOPS.music.g, t + secs, 0.5);
}

function playFile(name, rate = 1, gain = 1, delay = 0) {
  const m = MAP[name] || EXTRA[name], b = m && bufs[m.id];
  if (!b) return false;
  if (voices >= 8) return true;   // voice cap: at most 8 one-shots at once
  const s = ctx.createBufferSource(), g = ctx.createGain();
  voices++; s.onended = () => { voices--; };
  s.buffer = b; s.playbackRate.value = (m.r || 1) * rate * (m.j ? 1 + (Math.random() * 2 - 1) * m.j : 1);
  g.gain.value = m.g * gain; s.connect(g); g.connect(master); s.start(ctx.currentTime + delay);
  const d = dev(); if (d) d.played[m.id] = (d.played[m.id] || 0) + 1;
  return true;
}

// rate = pitch family multiplier (4 families keep neighbouring decoys from sounding alike), gain = level multiplier
export function sfx(name, rate = 1, gain = 1) {
  if (!ctx || !effectsEnabled) return;
  if (name === 'win') duck(2.6);
  if (name === 'arp') { playFile('win', 1.26, 0.34, 0.11); playFile('win', 1.5, 0.3, 0.22); return; }
  if (name === 'tickle') { playFile('tickle', rate, gain); playFile('tickle', rate * 1.26, gain * 0.8, 0.09); return; }
  if (playFile(name, rate, gain)) return;
  if (name === 'pop') { tone('sine', 420 * (0.92 + Math.random() * 0.2), 980, 0.12, 0.5); burst(0.06, 0.25, 3000); }
  else if (name === 'tick') tone('triangle', 700, 520, 0.07, 0.3);
  else if (name === 'boing') { tone('sine', 190, 420, 0.5, 0.6); tone('sine', 380, 160, 0.4, 0.25, 0.08); }
  else if (name === 'croak') { tone('square', 110, 80, 0.14, 0.25); tone('square', 120, 70, 0.16, 0.25, 0.17); }
  else if (name === 'sneeze') { tone('sine', 300, 700, 0.12, 0.3); burst(0.22, 0.5, 1600); }
  else if (name === 'win') [523, 659, 784, 1046, 1318].forEach((f, i) => tone('triangle', f, f * 1.002, 0.34, 0.4, i * 0.1));
  else if (name === 'star') tone('triangle', 880, 1320, 0.2, 0.35);
  else if (name === 'plop') tone('sine', 300, 600, 0.1, 0.3);
}

// a wrong-rub gag: the sound its speech bubble names (say = the key without r_), or the level's own boing / pop while that file is not ready
export function gag(say, fallback, rate = 1) {
  if (!ctx || !effectsEnabled) return;
  const k = SAY[say];
  if (k && playFile(k, 0.94 + (rate - 1) * 0.5)) return;
  sfx(fallback, rate);
}

try { prefetch(); } catch (e) { /* lib not ready yet: unlock() retries */ }
