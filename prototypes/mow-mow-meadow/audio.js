// PROTOTYPE - NOT FOR PRODUCTION
// Sound, made in the browser with Web Audio (no files). The lawn plays the tune: every square metre cut plays the
// melody's next note; a pad, a bass and light percussion come in with Flow. Effects are short synth voices with a
// little pitch variation, rate-limited, under a limiter. The graph is created on the first gesture.

const PENTA = [0, 2, 4, 7, 9];
const KEYS = [60, 62, 57]; // district keys: C, D, A (major pentatonic)
const CHORDS = [[0, 4, 7], [9, 0, 4], [5, 9, 0], [7, 11, 2]]; // I vi IV V, as semitones above the key
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

/** Builds the sound engine. Every method is safe to call before `unlock()`: it does nothing until then. */
export function createAudio(cfg, rnd = Math.random) {
  const A = cfg.audio; let ctx = null, master, musicBus, sfxBus, noiseBuf, eng = null, mute = false, music = true, district = 0;
  let melody = [], mi = 0, lastNote = 0, beat = 0, nextBeat = 0, flowLv = 0, moving = 0, counts = {}, countT = 0, ambT = 2, duck = 1;

  function makeMelody(d) {
    // a 64-step phrase that walks the pentatonic scale in small steps, with a lift every eighth step
    const out = []; let deg = 2 + d, s = 7 + d * 13; const r = () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
    for (let i = 0; i < 64; i++) { const k = r(); deg += k < 0.34 ? 1 : k < 0.68 ? -1 : k < 0.8 ? 2 : k < 0.92 ? -2 : 0; if (i % 8 === 7) deg += 1; if (i % 16 === 15) deg = 2 + Math.floor(r() * 3); deg = Math.max(0, Math.min(9, deg)); out.push(deg); }
    return out;
  }
  const degToMidi = (deg) => KEYS[district] + 12 * Math.floor(deg / 5) + PENTA[deg % 5];

  function unlock() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume().catch(() => {}); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    try { ctx = new AC(); } catch (e) { ctx = null; return; }
    const lim = ctx.createDynamicsCompressor(); lim.threshold.value = -14; lim.knee.value = 10; lim.ratio.value = 12; lim.attack.value = 0.003; lim.release.value = 0.2;
    master = ctx.createGain(); master.gain.value = mute ? 0 : A.master; master.connect(lim); lim.connect(ctx.destination);
    musicBus = ctx.createGain(); musicBus.gain.value = music ? A.music : 0; musicBus.connect(master);
    sfxBus = ctx.createGain(); sfxBus.gain.value = 0.9; sfxBus.connect(master);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    // engine: a low purr (filtered noise plus a soft tone)
    const n = ctx.createBufferSource(); n.buffer = noiseBuf; n.loop = true; const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 180; const g = ctx.createGain(); g.gain.value = 0;
    const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = 55; const og = ctx.createGain(); og.gain.value = 0.5; o.connect(og); og.connect(f); n.connect(f); f.connect(g); g.connect(sfxBus); n.start(); o.start();
    eng = { f, g, o };
    melody = makeMelody(district); nextBeat = ctx.currentTime + 0.1;
  }

  function tone(freq, t0, dur, type = 'sine', gain = 0.2, o = {}) {
    if (!ctx) return; const osc = ctx.createOscillator(), g = ctx.createGain(), bus = o.bus || sfxBus;
    osc.type = type; osc.frequency.setValueAtTime(freq, t0); if (o.to) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.to), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(gain, t0 + (o.att || 0.008)); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    let node = osc; if (o.lp) { const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = o.lp; osc.connect(f); node = f; }
    node.connect(g); g.connect(bus); osc.start(t0); osc.stop(t0 + dur + 0.05);
  }
  function noise(t0, dur, gain = 0.2, o = {}) {
    if (!ctx) return; const n = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain(); n.buffer = noiseBuf; n.loop = true;
    f.type = o.type || 'bandpass'; f.frequency.setValueAtTime(o.f || 2000, t0); if (o.to) f.frequency.exponentialRampToValueAtTime(o.to, t0 + dur); f.Q.value = o.q || 1;
    g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(gain, t0 + (o.att || 0.005)); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    n.connect(f); f.connect(g); g.connect(o.bus || sfxBus); n.start(t0, Math.random() * 0.5); n.stop(t0 + dur + 0.05);
  }
  /** At most A.maxPerS of one effect per second. */
  function allow(name, max = A.maxPerS) { counts[name] = (counts[name] || 0) + 1; return counts[name] <= max; }
  const v = (amt = 0.1) => 1 + (rnd() - 0.5) * 2 * amt;

  const SFX = {
    cut(t) { noise(t, 0.07, 0.05, { f: 3800 * v(0.2), q: 0.8, type: 'highpass' }); },
    bale(t) { tone(160, t, 0.16, 'sawtooth', 0.05, { to: 240, lp: 900 }); tone(190 * v(), t + 0.16, 0.22, 'sine', 0.32, { to: 90 }); noise(t + 0.16, 0.12, 0.12, { f: 500, q: 0.7 }); tone(150, t + 0.42, 0.1, 'sine', 0.12, { to: 100 }); tone(140, t + 0.58, 0.08, 'sine', 0.07, { to: 100 }); },
    coin(t, o) { const k = Math.min(10, o.i || 0); tone(mtof(84 + PENTA[k % 5] + 12 * Math.floor(k / 5)) * v(0.01), t, 0.16, 'sine', 0.12); tone(mtof(96 + PENTA[k % 5]), t, 0.08, 'triangle', 0.04); },
    friend(t) { noise(t, 0.15, 0.08, { f: 2600, q: 0.6, to: 5000 }); const b = 900 * v(0.12); tone(b, t + 0.1, 0.09, 'sine', 0.16, { to: b * 1.4 }); tone(b * 1.5, t + 0.22, 0.12, 'sine', 0.16, { to: b * 1.9 }); for (let i = 0; i < 5; i++) tone(mtof(degToMidi(i + 2) + 12), t + 0.34 + i * 0.055, 0.3, 'triangle', 0.07); },
    toy(t) { tone(240 * v(), t, 0.3, 'sine', 0.2, { to: 620 }); tone(480, t, 0.3, 'triangle', 0.05, { to: 1240 }); for (let i = 0; i < 4; i++) noise(t + 0.3 + i * 0.045, 0.03, 0.06, { f: 3200 + i * 300, q: 3 }); },
    rare(t) { for (let i = 0; i < 3; i++) tone(mtof(KEYS[district] + CHORDS[0][i] + 12), t + i * 0.09, 1.4, 'sine', 0.1, { att: 0.25 }); noise(t, 1.2, 0.05, { f: 6000, q: 2, to: 9000, att: 0.4 }); for (let i = 0; i < 8; i++) tone(mtof(degToMidi(i) + 24), t + 0.3 + i * 0.07, 0.25, 'sine', 0.035); },
    chime(t) { for (let i = 0; i < 3; i++) tone(mtof(KEYS[district] + CHORDS[0][i] + 12), t + i * 0.04, 0.7, 'triangle', 0.09); },
    gate(t) { noise(t, 0.03, 0.14, { f: 2400, q: 4 }); tone(120, t + 0.05, 0.5, 'sawtooth', 0.04, { to: 180, lp: 700 }); for (let i = 0; i < 3; i++) tone(mtof(degToMidi(2 + i * 2) + 12), t + 0.3 + i * 0.13, 0.4, 'triangle', 0.13); },
    star(t) { tone(150, t, 0.14, 'sine', 0.3, { to: 70 }); noise(t, 0.06, 0.1, { f: 900, q: 0.6 }); tone(mtof(degToMidi(4) + 12), t + 0.02, 0.35, 'triangle', 0.08); },
    upgrade(t) { for (let i = 0; i < 6; i++) noise(t + i * 0.05, 0.025, 0.08, { f: 2200 + i * 150, q: 5 }); noise(t + 0.34, 0.3, 0.1, { f: 700, q: 0.5, to: 300 }); tone(mtof(KEYS[district] - 5), t + 0.6, 0.16, 'square', 0.07, { lp: 1400 }); tone(mtof(KEYS[district]), t + 0.78, 0.34, 'square', 0.08, { lp: 1600 }); },
    oops(t) { tone(420, t, 0.16, 'sine', 0.1, { to: 300 }); noise(t, 0.12, 0.04, { f: 3000, q: 0.5 }); },
    honk(t) { tone(330, t, 0.2, 'square', 0.09, { lp: 1200, to: 300 }); tone(415, t, 0.2, 'square', 0.07, { lp: 1200, to: 380 }); },
    click(t) { tone(600, t, 0.05, 'sine', 0.1, { to: 380 }); },
    rustle(t) { noise(t, 0.2, 0.07, { f: 3200, q: 0.4, to: 1800, att: 0.05 }); },
    pop(t) { tone(500 * v(), t, 0.09, 'sine', 0.15, { to: 900 }); },
    ribbon(t) { tone(mtof(degToMidi(4) + 12), t, 0.3, 'triangle', 0.1); tone(mtof(degToMidi(6) + 12), t + 0.09, 0.4, 'triangle', 0.1); },
    apple(t) { tone(300 * v(), t, 0.1, 'sine', 0.14, { to: 160 }); },
    splash(t) { noise(t, 0.25, 0.1, { f: 1500, q: 0.6, to: 500 }); },
    party(t) { for (let i = 0; i < 8; i++) tone(mtof(degToMidi(i) + 12), t + i * 0.09, 0.5, 'triangle', 0.1); for (let i = 0; i < 3; i++) tone(mtof(KEYS[district] + CHORDS[0][i]), t + 0.72, 1.4, 'sine', 0.1, { att: 0.05 }); },
    whoosh(t) { noise(t, 0.35, 0.08, { f: 600, q: 0.8, to: 2400, att: 0.12 }); },
    grow(t) { tone(200, t, 0.5, 'sine', 0.06, { to: 520, att: 0.1 }); },
  };

  return {
    unlock,
    /** Plays an effect by name; opts are passed to it. */
    sfx(name, o = {}) { if (!ctx || mute || !SFX[name] || !allow(name)) return; duck = name === 'rare' || name === 'party' || name === 'gate' ? 0.6 : duck; SFX[name](ctx.currentTime + (o.delay || 0), o); },
    /** The melody's next note: called once per square metre cut. */
    note() {
      if (!ctx || mute) return; const t = ctx.currentTime; if (t - lastNote < 1 / A.maxPerS) return; lastNote = t;
      const m = degToMidi(melody[mi++ % melody.length]) + 12, f = mtof(m);
      if (district === 2) { tone(f * 2, t, 0.5, 'sine', 0.1); tone(f * 4.01, t, 0.2, 'sine', 0.025); } else { tone(f, t, 0.32, 'triangle', 0.13, { lp: 2600 }); tone(f * 2, t, 0.12, 'sine', 0.03); }
    },
    /** Per frame: engine pitch from speed (0..1), layers from Flow (0..1), the beat scheduler and the ambience. */
    tick(dt, speed01, flow, cutting) {
      countT += dt; if (countT > 1) { countT = 0; counts = {}; }
      if (!ctx) return; const t = ctx.currentTime;
      flowLv += (flow - flowLv) * Math.min(1, dt * 2); moving += ((speed01 > 0.1 ? 1 : 0) - moving) * Math.min(1, dt * 1.5); duck += (1 - duck) * Math.min(1, dt * 0.8);
      eng.g.gain.setTargetAtTime(mute ? 0 : 0.035 + 0.05 * speed01 + 0.02 * cutting, t, 0.08); eng.f.frequency.setTargetAtTime(150 + 260 * speed01 + (flow >= 1 ? 60 : 0), t, 0.1); eng.o.frequency.setTargetAtTime(48 + 34 * speed01 + (flow >= 1 ? 6 * Math.sin(t * 30) : 0), t, 0.05);
      musicBus.gain.setTargetAtTime(music && !mute ? A.music * duck : 0, t, 0.2);
      const spb = 60 / A.bpm[district] / 2; // eighth notes
      while (nextBeat < t + 0.12) {
        const b = beat++, bar = Math.floor(b / 8), ch = CHORDS[[0, 0, 1, 1, 2, 2, 3, 0][bar % 8]], k = KEYS[district], at = nextBeat; nextBeat += spb;
        const lv = 0.25 + 0.75 * moving;
        if (b % 8 === 0) for (let i = 0; i < 3; i++) tone(mtof(k + ch[i] - (ch[i] > 7 ? 12 : 0)), at, spb * 8.4, 'sine', 0.045 * lv, { att: 0.5, bus: musicBus });
        if (moving > 0.3 && (b % 8 === 0 || b % 8 === 5)) tone(mtof(k + ch[0] - 24 + (ch[0] > 6 ? -12 : 0) + 12), at, spb * 2.4, 'sine', 0.16 * moving, { bus: musicBus });
        if (flowLv > 0.35 && b % 2 === 1) noise(at, 0.04, 0.035 * flowLv, { f: 7000, q: 1.5, type: 'highpass', bus: musicBus });
        if (flowLv > 0.7 && (b % 8 === 2 || b % 8 === 6)) tone(900, at, 0.05, 'sine', 0.05 * flowLv, { to: 700, bus: musicBus });
        if (flowLv > 0.95 && b % 4 === 0) tone(mtof(k + ch[(b / 4) % 3 | 0] + 12), at, spb * 1.6, 'triangle', 0.04, { bus: musicBus });
      }
      // ambience: birds in the morning, crickets in the afternoon, frogs and chimes at dusk
      ambT -= dt;
      if (ambT <= 0 && !mute) {
        ambT = 2.5 + Math.random() * 5;
        if (district === 0) { const f = 2400 + Math.random() * 1400; for (let i = 0; i < 2 + Math.floor(Math.random() * 3); i++) tone(f * (1 + i * 0.06), t + i * 0.11, 0.08, 'sine', 0.025, { to: f * 1.25 }); }
        else if (district === 1) { for (let i = 0; i < 6; i++) tone(4300, t + i * 0.05, 0.03, 'sine', 0.012); }
        else { if (Math.random() < 0.5) tone(170, t, 0.22, 'square', 0.02, { to: 120, lp: 600 }); else tone(mtof(degToMidi(Math.floor(Math.random() * 5)) + 24), t, 1.4, 'sine', 0.02); }
      }
    },
    setDistrict(d) { if (d === district) return; district = d; melody = makeMelody(d); mi = 0; },
    setMute(m) { mute = m; if (ctx) master.gain.setTargetAtTime(m ? 0 : A.master, ctx.currentTime, 0.05); },
    setMusic(m) { music = m; },
    get ready() { return !!ctx; },
    destroy() { if (ctx) { try { ctx.close(); } catch (e) { /* closing */ } ctx = null; } },
  };
}
