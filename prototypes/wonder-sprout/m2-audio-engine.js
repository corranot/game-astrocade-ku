// PROTOTYPE - NOT FOR PRODUCTION
/**
 * Module 2: procedural Web Audio engine. Every sound is synthesized: sling stretch, impact thump with
 * pentatonic kalimba notes that climb with the combo, harp glissando, hatch heartbeat and shell cracks,
 * evolution fanfare, raid horn and a toggleable music-box loop. One master with music, sfx and ui buses,
 * a limiter, ducking under stings, and at most 24 voices at once.
 */
import { clamp } from './m0-orchestrator.js';

/** Major pentatonic from C5 (Hz), the combo ladder. */
export const PENTA = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66, 1318.51];
const MELODY = [0, 2, 4, 2, 3, 1, 2, 0, 4, 3, 2, 3, 1, 0, 1, 2]; // music box, steps on PENTA

/** Note index for a combo count: climbs the ladder and wraps with a small octave lift. */
export function comboNote(n) { const i = Math.max(0, n - 1); return PENTA[i % PENTA.length] * (i >= PENTA.length ? 2 : 1); }

export function createAudio() {
  let ctx = null, master, music, sfx, ui, voices = 0, on = true, musicOn = true, nextNote = 0, step = 0, stretch = null, duckUntil = 0;
  const A = {};
  /** Build the graph on the first gesture (resume + silent buffer unlocks iOS). */
  A.unlock = () => {
    try {
      if (!ctx) {
        const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
        ctx = new AC();
        master = ctx.createGain(); master.gain.value = on ? 0.9 : 0;
        const lim = ctx.createDynamicsCompressor(); lim.threshold.value = -10; lim.knee.value = 6; lim.ratio.value = 12; lim.attack.value = 0.003; lim.release.value = 0.2;
        master.connect(lim); lim.connect(ctx.destination);
        music = ctx.createGain(); music.gain.value = 0.32; music.connect(master);
        sfx = ctx.createGain(); sfx.gain.value = 0.8; sfx.connect(master);
        ui = ctx.createGain(); ui.gain.value = 0.5; ui.connect(master);
        const b = ctx.createBuffer(1, 1, 22050), src = ctx.createBufferSource(); src.buffer = b; src.connect(ctx.destination); src.start(0);
        nextNote = ctx.currentTime + 0.3;
      }
      if (ctx.state === 'suspended') ctx.resume();
    } catch (e) { ctx = null; }
  };
  A.ready = () => !!ctx;
  A.setOn = (v) => { on = v; if (ctx) master.gain.setTargetAtTime(v ? 0.9 : 0, ctx.currentTime, 0.05); if (!v) A.stretchEnd(); };
  A.setMusic = (v) => { musicOn = v; };
  A.isOn = () => on;

  /** One enveloped oscillator voice. */
  function tone(bus, type, f0, f1, dur, vol, delay = 0, attack = 0.005) {
    if (!ctx || !on || voices >= 24) return;
    const t = ctx.currentTime + delay, o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t); if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + attack); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(bus); o.start(t); o.stop(t + dur + 0.02); voices++; o.onended = () => { voices--; };
  }
  /** Kalimba / marimba pluck: sine fundamental plus a quick bright partial. */
  function pluck(f, vol, delay = 0, bus = sfx) { tone(bus, 'sine', f, f, 0.6, vol, delay); tone(bus, 'triangle', f * 3.01, f * 3.01, 0.12, vol * 0.35, delay); }
  /** Short filtered noise burst (cracks, whooshes, sparkle). */
  function noise(dur, vol, freq, q = 1, delay = 0, type = 'bandpass') {
    if (!ctx || !on || voices >= 24) return;
    const t = ctx.currentTime + delay, len = Math.ceil(ctx.sampleRate * dur), buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len); // audio noise only, never gameplay
    const src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    src.buffer = buf; f.type = type; f.frequency.value = freq; f.Q.value = q; g.gain.value = vol;
    src.connect(f); f.connect(g); g.connect(sfx); src.start(t); voices++; src.onended = () => { voices--; };
  }
  const duck = (sec) => { if (!ctx) return; duckUntil = ctx.currentTime + sec; music.gain.setTargetAtTime(0.1, ctx.currentTime, 0.05); };

  /** Sling stretch: a filtered triangle whose pitch follows the pull tension (0..1). */
  A.stretch = (k) => {
    if (!ctx || !on) return;
    if (!stretch) {
      const o = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain();
      o.type = 'triangle'; f.type = 'lowpass'; f.frequency.value = 900; g.gain.value = 0.0001;
      o.connect(f); f.connect(g); g.connect(sfx); o.start(); stretch = { o, f, g };
    }
    const t = ctx.currentTime;
    stretch.o.frequency.setTargetAtTime(150 + k * 420, t, 0.03); stretch.f.frequency.setTargetAtTime(600 + k * 2200, t, 0.03); stretch.g.gain.setTargetAtTime(0.03 + k * 0.08, t, 0.03);
  };
  A.stretchEnd = () => { if (!stretch || !ctx) return; const s = stretch; stretch = null; s.g.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.02); s.o.stop(ctx.currentTime + 0.15); };
  A.launch = (k) => { noise(0.25, 0.25 + k * 0.2, 1400, 0.8); tone(sfx, 'triangle', 300 + k * 300, 900 + k * 500, 0.18, 0.12); };
  /** Impact: warm sub thump (130 to 55 Hz) and a kalimba note on the combo ladder. */
  A.impact = (combo, big) => { tone(sfx, 'sine', 130, 55, big ? 0.32 : 0.2, big ? 0.6 : 0.4); pluck(comboNote(combo), big ? 0.32 : 0.22); };
  A.bumper = (combo) => { tone(sfx, 'sine', 220, 90, 0.18, 0.35); tone(sfx, 'square', 660, 990, 0.06, 0.04); pluck(comboNote(combo), 0.2); };
  A.shatter = () => { noise(0.35, 0.3, 4200, 2); for (let i = 0; i < 4; i++) pluck(PENTA[4 + (i % 4)] * 2, 0.08, i * 0.04); };
  /** SUPER NOVA: thump, rising shimmer, bright chord. */
  A.nova = () => { duck(0.8); tone(sfx, 'sine', 160, 40, 0.5, 0.7); noise(0.6, 0.18, 6000, 0.7, 0, 'highpass'); [0, 2, 4, 5].forEach((k, i) => pluck(PENTA[k] * 2, 0.18, 0.05 + i * 0.05)); };
  A.orb = (() => { let last = 0; return (k = 0) => { if (!ctx) return; const t = ctx.currentTime; if (t - last < 0.045) return; last = t; tone(ui, 'sine', 1800 + (k % 5) * 160, 2400 + (k % 5) * 160, 0.07, 0.05); }; })();
  A.click = () => tone(ui, 'triangle', 700, 520, 0.08, 0.12);
  A.open = () => { tone(ui, 'sine', 420, 640, 0.12, 0.12); tone(ui, 'sine', 640, 960, 0.12, 0.08, 0.05); };
  /** Harp glissando up the pentatonic ladder (landmark built). */
  A.harp = () => { duck(1.8); for (let i = 0; i < 12; i++) pluck(PENTA[i % 8] * (i >= 8 ? 2 : 1), 0.16, i * 0.055); tone(sfx, 'sine', 130, 65, 0.6, 0.4, 0.62); };
  A.heartbeat = () => { tone(sfx, 'sine', 70, 50, 0.14, 0.5); tone(sfx, 'sine', 70, 50, 0.14, 0.4, 0.18); };
  A.crack = (k) => { noise(0.08, 0.35, 2500 + k * 900, 3); tone(sfx, 'square', 1200 + k * 300, 400, 0.04, 0.05); };
  A.hatch = () => { duck(1.2); noise(0.3, 0.3, 3000, 1); [0, 2, 4, 7].forEach((k, i) => pluck(PENTA[k % 8] * (k >= 8 ? 2 : 1), 0.2, 0.08 + i * 0.09)); };
  /** Celestial fanfare (evolution, world done). */
  A.fanfare = () => { duck(2.2); const ch = [[0, 2, 4], [1, 3, 5], [2, 4, 7]]; ch.forEach((c, i) => c.forEach((k) => { tone(sfx, 'triangle', PENTA[k % 8] * (k >= 8 ? 2 : 1), PENTA[k % 8], 0.7, 0.07, i * 0.28, 0.02); pluck(PENTA[k % 8] * 2, 0.08, i * 0.28); })); noise(1.2, 0.08, 8000, 0.5, 0.3, 'highpass'); };
  A.horn = () => { tone(sfx, 'sawtooth', 196, 196, 0.5, 0.06, 0, 0.05); tone(sfx, 'sawtooth', 294, 294, 0.6, 0.05, 0.35, 0.05); tone(sfx, 'triangle', 392, 392, 0.7, 0.08, 0.35, 0.05); };
  A.pop = () => { tone(sfx, 'sine', 500, 1200, 0.1, 0.25); noise(0.1, 0.15, 3000, 1); };
  A.sting = () => { pluck(PENTA[7], 0.14); pluck(PENTA[4], 0.1, 0.06); };
  A.coin = () => { pluck(PENTA[5] * 2, 0.12); pluck(PENTA[7] * 2, 0.1, 0.06); };

  /** Schedules the music-box loop a little ahead; call every frame. */
  A.tick = () => {
    if (!ctx || !on) return;
    if (duckUntil && ctx.currentTime > duckUntil) { duckUntil = 0; music.gain.setTargetAtTime(0.32, ctx.currentTime, 0.3); }
    if (!musicOn) { nextNote = Math.max(nextNote, ctx.currentTime + 0.1); return; }
    while (nextNote < ctx.currentTime + 0.25) {
      const k = MELODY[step % MELODY.length], d = nextNote - ctx.currentTime;
      if (d > -0.05) { pluck(PENTA[k] * 0.5, 0.16, Math.max(0, d), music); if (step % 4 === 0) tone(music, 'sine', PENTA[(k + 5) % 8] * 0.25, PENTA[(k + 5) % 8] * 0.25, 1.2, 0.05, Math.max(0, d), 0.05); }
      nextNote += step % 8 === 7 ? 0.72 : 0.36; step++;
    }
  };
  A.volumeFor = (k) => clamp(k, 0, 1);
  return A;
}
