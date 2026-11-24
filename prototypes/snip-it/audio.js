// PROTOTYPE - NOT FOR PRODUCTION
// Snip It sound: every effect and the marimba tune are made in code with Web Audio, no files to load.
// Sound starts with the first touch and pauses while the page is hidden.

const TUNE = [0, 4, 7, 4, 9, 7, 4, 2, 0, 4, 7, 12, 9, 7, 4, -1, 2, 5, 9, 5, 7, 4, 0, -1, 0, 2, 4, 7, 9, 7, 4, -1];

/** opts: { music, sfx } switches from the game settings. */
export function createSound(opts = {}) {
  let ctx = null, master = null, musicGain = null, timer = 0, step = 0, nextAt = 0, muted = false;
  const want = { music: opts.music !== false, sfx: opts.sfx !== false };
  const hz = (semi) => 261.63 * Math.pow(2, semi / 12);

  function start() {
    if (ctx) { if (ctx.state === 'suspended' && !document.hidden) ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    ctx = new AC(); master = ctx.createGain(); master.gain.value = muted ? 0 : 0.9; master.connect(ctx.destination);
    musicGain = ctx.createGain(); musicGain.gain.value = 0.16; musicGain.connect(master);
    nextAt = ctx.currentTime + 0.1; timer = setInterval(tune, 120);
  }
  /** One note: type, start and end pitch, length, loudness, delay. */
  function tone(type, f0, f1, len, vol, at = 0, out = master) {
    if (!ctx) return; const t = ctx.currentTime + at, o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + len);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    o.connect(g); g.connect(out); o.start(t); o.stop(t + len + 0.02);
  }
  /** A burst of filtered noise: filter type, start and end cutoff, length, loudness. */
  function noise(kind, f0, f1, len, vol, at = 0) {
    if (!ctx) return; const t = ctx.currentTime + at, n = Math.ceil(ctx.sampleRate * len), buf = ctx.createBuffer(1, n, ctx.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain(); s.buffer = buf; f.type = kind;
    f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(Math.max(40, f1), t + len);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    s.connect(f); f.connect(g); g.connect(master); s.start(t);
  }
  function tune() {
    if (!ctx || !want.music || ctx.state !== 'running') return;
    while (nextAt < ctx.currentTime + 0.3) {
      const n = TUNE[step % TUNE.length], at = nextAt - ctx.currentTime;
      if (n >= 0) { tone('sine', hz(n + 12), hz(n + 12), 0.32, 0.5, at, musicGain); tone('triangle', hz(n + 24), hz(n + 24), 0.09, 0.18, at, musicGain); }
      if (step % 4 === 0) tone('sine', hz(TUNE[(step - step % 8) % TUNE.length] - 12 < -13 ? -12 : -12 + (step % 16 < 8 ? 0 : 5)), hz(-12), 0.4, 0.35, at, musicGain);
      step++; nextAt += 0.21;
    }
  }
  const FX = {
    tick: () => tone('square', 1400, 900, 0.03, 0.08),
    swish: () => noise('bandpass', 900, 3200, 0.14, 0.22),
    snip: () => { noise('highpass', 5000, 7000, 0.035, 0.5); noise('highpass', 6000, 4000, 0.04, 0.5, 0.06); tone('triangle', 520, 1100, 0.12, 0.2, 0.05); },
    thud: () => { tone('sine', 150, 55, 0.16, 0.6); noise('lowpass', 500, 120, 0.1, 0.3); },
    land: () => { tone('sine', 170, 60, 0.18, 0.6); tone('sine', 700, 1300, 0.09, 0.25, 0.08); tone('sine', 1300, 800, 0.1, 0.2, 0.17); },
    boing: () => { tone('sine', 220, 520, 0.12, 0.45); tone('sine', 520, 180, 0.3, 0.4, 0.1); },
    splash: () => { noise('lowpass', 3500, 300, 0.45, 0.55); tone('sine', 500, 160, 0.2, 0.25); },
    puff: () => noise('lowpass', 1400, 200, 0.4, 0.5),
    horn: () => { tone('sawtooth', 311, 311, 0.14, 0.3); tone('sawtooth', 415, 415, 0.3, 0.3, 0.14); noise('highpass', 3000, 6000, 0.25, 0.25); },
    squeak: () => { for (let i = 0; i < 3; i++) { tone('sine', 900, 1500, 0.07, 0.3, i * 0.16); tone('sine', 1500, 800, 0.08, 0.25, i * 0.16 + 0.07); } },
    chirp: () => { for (let i = 0; i < 5; i++) tone('sine', 2200 + (i % 2) * 500, 3200, 0.06, 0.2, i * 0.09); },
    sticker: () => { tone('triangle', hz(19), hz(19), 0.12, 0.3); tone('triangle', hz(24), hz(24), 0.2, 0.3, 0.1); },
    win: () => { [0, 4, 7, 12, 16].forEach((n, i) => tone('triangle', hz(n + 12), hz(n + 12), i === 4 ? 0.45 : 0.14, 0.32, i * 0.09)); },
    tap: () => tone('sine', 700, 500, 0.06, 0.25),
    bell: () => { for (let i = 0; i < 3; i++) { tone('sine', 1760, 1740, 0.35, 0.3, i * 0.16); tone('sine', 2640, 2600, 0.2, 0.12, i * 0.16); } },
    munch: () => { for (let i = 0; i < 3; i++) noise('bandpass', 900, 500, 0.07, 0.5, i * 0.13); tone('sine', 500, 800, 0.12, 0.2, 0.42); },
  };

  return {
    start,
    /** Plays effect `name` (unknown names are silent). */
    play(name) { if (ctx && want.sfx && !muted && FX[name]) FX[name](); },
    get muted() { return muted; }, get running() { return !!ctx && ctx.state === 'running'; },
    setMuted(m) { muted = !!m; if (master) master.gain.value = muted ? 0 : 0.9; },
    set(key, on) { want[key] = !!on; },
    suspend(hidden) { if (!ctx) return; if (hidden) ctx.suspend(); else ctx.resume(); },
    stop() { clearInterval(timer); if (ctx) { ctx.close().catch(() => {}); ctx = null; } },
  };
}
