// PROTOTYPE - NOT FOR PRODUCTION
// All sound is made in code (Web Audio): a cozy music box with a soft pad and pizzicato at 76 BPM that warms at
// dusk and turns to celesta and shimmer at night, the wind, snow crunch footsteps, the camera (click, clack,
// spring, develop whirr), rising pentatonic chimes for stars, animal voices by family and the stings.
// The graph is built on the first gesture; a preview stays silent.

const PENTA = [0, 2, 4, 7, 9];
const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);

/** The sound engine. `muted` persists across runs through the save. */
export const Sound = {
  ctx: null, muted: false, master: null, bus: {}, nightK: 0, nextBeat: 0, beat: 0, wind: null, ok: false,
  /** Builds the graph on the first gesture (browsers block audio before one). */
  unlock() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    try { this.ctx = new AC(); } catch (e) { console.warn('audio', e); return; }
    const c = this.ctx;
    const comp = c.createDynamicsCompressor(); comp.threshold.value = -12; comp.ratio.value = 4; comp.connect(c.destination);
    this.master = c.createGain(); this.master.gain.value = this.muted ? 0 : 0.85; this.master.connect(comp);
    for (const [k, v] of [['music', 0.32], ['sfx', 0.9], ['voice', 0.7], ['ui', 0.6], ['amb', 0.25]]) { const g = c.createGain(); g.gain.value = v; g.connect(this.master); this.bus[k] = g; }
    // the music passes one more gain that dips while the viewfinder is up, so animal calls and the shutter read clearly
    this.lens = c.createGain(); this.lens.connect(this.master); this.bus.music.disconnect(); this.bus.music.connect(this.lens);
    // a short reverb for the music box and chimes
    const len = c.sampleRate * 1.6, ir = c.createBuffer(2, len, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3); }
    this.verb = c.createConvolver(); this.verb.buffer = ir; const vg = c.createGain(); vg.gain.value = 0.35; this.verb.connect(vg); vg.connect(this.master);
    this.noise = c.createBuffer(1, c.sampleRate, c.sampleRate); const nd = this.noise.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    // wind: filtered noise that breathes
    const w = c.createBufferSource(); w.buffer = this.noise; w.loop = true; const wf = c.createBiquadFilter(); wf.type = 'bandpass'; wf.frequency.value = 500; wf.Q.value = 0.6;
    const wg = c.createGain(); wg.gain.value = 0.35; w.connect(wf); wf.connect(wg); wg.connect(this.bus.amb); w.start(); this.wind = { f: wf, g: wg };
    this.nextBeat = c.currentTime + 0.2; this.ok = true;
  },
  setMuted(m) { this.muted = m; if (this.master) this.master.gain.setTargetAtTime(m ? 0 : 0.85, this.ctx.currentTime, 0.05); },
  /** Music level under the viewfinder: k 0 (lens down) .. 1 (lens up) dips it to cfg's share. */
  lensDuck(k, to = 0.3) { if (!this.ok || !this.lens) return; const v = 1 - (1 - to) * (k > 0.5 ? 1 : 0); if (v !== this.lensV) { this.lensV = v; this.lens.gain.setTargetAtTime(v, this.ctx.currentTime, 0.25); } },
  /** Ducks the music under a sting. */
  duck(s = 0.6) { if (!this.ok) return; const g = this.bus.music.gain, t = this.ctx.currentTime; g.cancelScheduledValues(t); g.setTargetAtTime(0.32 * 0.6, t, 0.03); g.setTargetAtTime(0.32, t + s, 0.4); },
  tone(f, t, d, { type = 'sine', g = 0.2, bus = 'sfx', a = 0.005, verb = 0, slide = 0, q = 0 } = {}) {
    const c = this.ctx, o = c.createOscillator(), e = c.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t); if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f * slide), t + d);
    e.gain.setValueAtTime(0, t); e.gain.linearRampToValueAtTime(g, t + a); e.gain.exponentialRampToValueAtTime(0.0008, t + d);
    let node = o; if (q) { const fl = c.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = q; o.connect(fl); node = fl; }
    node.connect(e); e.connect(this.bus[bus]); if (verb) { const s = c.createGain(); s.gain.value = verb; e.connect(s); s.connect(this.verb); }
    o.start(t); o.stop(t + d + 0.05);
  },
  hiss(t, d, { f = 2000, type = 'bandpass', g = 0.2, bus = 'sfx', Q = 1, to = 0 } = {}) {
    const c = this.ctx, s = c.createBufferSource(); s.buffer = this.noise; const fl = c.createBiquadFilter(); fl.type = type; fl.frequency.setValueAtTime(f, t); if (to) fl.frequency.exponentialRampToValueAtTime(to, t + d); fl.Q.value = Q;
    const e = c.createGain(); e.gain.setValueAtTime(g, t); e.gain.exponentialRampToValueAtTime(0.0008, t + d); s.connect(fl); fl.connect(e); e.connect(this.bus[bus]);
    s.start(t, Math.random() * 0.5); s.stop(t + d + 0.05);
  },
  /** Called every frame: schedules the next music beats and follows the night. */
  /** Per frame: night (0..1) and the area Pip stands in (0 meadow, 1 lake, 2 caves) shape the music layers. */
  update(night, area = 0) {
    if (!this.ok) return;
    const c = this.ctx; this.nightK += (night - this.nightK) * 0.02; this.area = area;
    this.wind.f.frequency.value = 420 + Math.sin(c.currentTime * 0.3) * 160; this.wind.g.gain.value = 0.25 + Math.sin(c.currentTime * 0.17) * 0.12 + this.nightK * 0.1 + (this.gk = (this.gk || 0) + ((this.gustUntil > c.currentTime ? 0.35 : 0) - (this.gk || 0)) * 0.04);
    const spb = 60 / 76 / 2; // eighth notes
    while (this.nextBeat < c.currentTime + 0.25) { this.musicBeat(this.nextBeat, this.beat++); this.nextBeat += spb; }
  },
  musicBeat(t, i) {
    const bar = Math.floor(i / 8) % 8, step = i % 8, n = this.nightK;
    const roots = [60, 57, 62, 55, 60, 57, 65, 55]; const root = roots[bar];
    // music box melody: a gentle pattern over the pentatonic, with rests
    const pat = [0, -1, 2, -1, 4, 3, -1, 1];
    if (pat[step] >= 0 && (bar % 2 === 0 || step < 6)) {
      const deg = (pat[step] + bar) % 5, oct = n > 0.5 ? 84 : 79;
      const f = midi(oct + PENTA[deg] + (root - 60) * 0);
      this.tone(f, t, n > 0.5 ? 1.6 : 0.9, { type: 'sine', g: 0.08, bus: 'music', verb: 0.6 });
      this.tone(f * 2.01, t, 0.35, { type: 'sine', g: 0.02, bus: 'music' });
    }
    // pizzicato bass on 1 and 5 by day, a soft pad by night
    if (step === 0 || step === 4) this.tone(midi(root - 24 + (step === 4 ? 7 : 0)), t, 0.5, { type: 'triangle', g: 0.09 * (1 - n * 0.6), bus: 'music', q: 900 });
    if (step === 0) for (const k of [0, 4, 7]) this.tone(midi(root - 12 + k), t, 3.2, { type: 'sine', g: 0.025 + n * 0.02, bus: 'music', a: 0.8, verb: 0.3 });
    if (n > 0.3 && step % 2 === 1) this.tone(midi(91 + PENTA[(i * 3) % 5]), t, 1.2, { type: 'sine', g: 0.015 * n, bus: 'music', verb: 1 });
    // area layers: glassy ice bells over the lake, low echoing plinks and drips in the caves
    if (this.area === 1 && step === 6 && bar % 2 === 1) for (let k = 0; k < 3; k++) this.tone(midi(88 + PENTA[(bar + k * 2) % 5]), t + k * 0.11, 1.4, { type: 'sine', g: 0.03, bus: 'music', verb: 0.9 });
    if (this.area === 1 && step === 2) this.tone(midi(root - 12 + 7), t, 1.8, { type: 'triangle', g: 0.02, bus: 'music', a: 0.3, q: 1200 });
    if (this.area === 2 && (step === 3 || step === 7) && (i * 7) % 3 === 0) this.tone(midi(72 + PENTA[(i * 5) % 5]), t, 0.25, { type: 'sine', g: 0.05, bus: 'music', verb: 1, slide: 0.92 });
    if (this.area === 2 && step === 0) this.tone(midi(root - 36 + 12), t, 3.5, { type: 'sine', g: 0.05, bus: 'music', a: 0.6, verb: 0.6 });
  },
  step() { if (!this.ok) return; const t = this.ctx.currentTime; this.hiss(t, 0.09, { f: 1400 + Math.random() * 600, type: 'bandpass', g: 0.12, Q: 0.8 }); this.hiss(t + 0.01, 0.06, { f: 4000, type: 'highpass', g: 0.03 }); },
  shutter() {
    if (!this.ok) return; const t = this.ctx.currentTime; this.duck(0.5);
    this.hiss(t, 0.03, { f: 5000, type: 'highpass', g: 0.5 }); this.tone(1800, t, 0.03, { type: 'square', g: 0.08 });
    this.hiss(t + 0.07, 0.05, { f: 2500, g: 0.35, Q: 2 }); this.tone(900, t + 0.07, 0.06, { type: 'square', g: 0.05, slide: 0.5 });
    this.tone(320, t + 0.14, 0.18, { type: 'triangle', g: 0.06, slide: 1.8 });
  },
  develop() { if (!this.ok) return; const t = this.ctx.currentTime; this.hiss(t, 0.5, { f: 800, to: 2200, g: 0.08, Q: 4 }); this.hiss(t + 0.55, 0.08, { f: 3000, g: 0.12 }); },
  star(i) { if (!this.ok) return; const t = this.ctx.currentTime; const f = midi(76 + PENTA[i % 5] + 12 * Math.floor(i / 5)); this.tone(f, t, 0.8, { g: 0.16, verb: 0.6, bus: 'ui' }); this.tone(f * 3, t, 0.3, { g: 0.03, bus: 'ui' }); },
  coin(k = 0) { if (!this.ok) return; const t = this.ctx.currentTime; this.tone(midi(88 + Math.min(12, k)), t, 0.12, { type: 'triangle', g: 0.05, bus: 'ui' }); },
  pop() { if (!this.ok) return; const t = this.ctx.currentTime; this.tone(520, t, 0.1, { g: 0.12, slide: 1.8, bus: 'ui' }); },
  whoosh() { if (!this.ok) return; const t = this.ctx.currentTime; this.hiss(t, 0.35, { f: 600, to: 2400, g: 0.12, Q: 1.5 }); },
  plop() { if (!this.ok) return; const t = this.ctx.currentTime; this.tone(260, t, 0.16, { g: 0.16, slide: 0.5 }); this.hiss(t, 0.1, { f: 900, g: 0.1 }); },
  /** An animal call by body family: squeak, hoot, honk, bleat or purr, pitch varied ±10%. */
  voice(sp, pan = 0, vol = 1) {
    if (!this.ok) return; const t = this.ctx.currentTime, r = 0.9 + Math.random() * 0.2, s = 1 / (sp.scale || 1);
    // each call goes through its own panner and level: animals to the left sound from the left, far ones softer
    { const c = this.ctx, g = c.createGain(); g.gain.value = vol; g.connect(this.bus.voice); let out = g;
      if (c.createStereoPanner) { const pn = c.createStereoPanner(); pn.pan.value = Math.max(-1, Math.min(1, pan)); pn.connect(g); out = pn; }
      this.bus.vp = out; setTimeout(() => { try { out.disconnect(); if (out !== g) g.disconnect(); } catch (e) { /* gone */ } }, 3000); }
    const fam = sp.type === 'bird' ? (sp.id.includes('owl') ? 'hoot' : 'chirp') : sp.type === 'biped' ? 'honk' : sp.type === 'seal' || sp.type === 'whale' ? 'bark' : sp.id === 'goat' || sp.id === 'reindeer' || sp.id === 'moose' ? 'bleat' : (sp.body[0] < 0.35 ? 'squeak' : 'purr');
    if (fam === 'squeak') { this.tone(1400 * r * s, t, 0.12, { g: 0.08, slide: 1.4, bus: 'vp' }); this.tone(1700 * r * s, t + 0.13, 0.1, { g: 0.06, slide: 1.3, bus: 'vp' }); }
    if (fam === 'chirp') for (let i = 0; i < 3; i++) this.tone(2400 * r, t + i * 0.07, 0.06, { g: 0.05, slide: 1.3, bus: 'vp' });
    if (fam === 'hoot') { this.tone(420 * r, t, 0.3, { g: 0.12, bus: 'vp', a: 0.05, verb: 0.4 }); this.tone(380 * r, t + 0.35, 0.45, { g: 0.12, bus: 'vp', a: 0.05, verb: 0.4 }); }
    if (fam === 'honk') { this.tone(520 * r, t, 0.16, { type: 'sawtooth', g: 0.04, q: 1500, bus: 'vp', slide: 1.2 }); this.tone(560 * r, t + 0.18, 0.14, { type: 'sawtooth', g: 0.035, q: 1500, bus: 'vp' }); }
    if (fam === 'bark') { this.tone(300 * r * s, t, 0.18, { type: 'sawtooth', g: 0.05, q: 900, bus: 'vp', slide: 1.3 }); }
    if (fam === 'bleat') this.tone(360 * r * s, t, 0.4, { type: 'sawtooth', g: 0.04, q: 1300, bus: 'vp' });
    if (fam === 'purr') for (let i = 0; i < 4; i++) this.tone(140 * r * s, t + i * 0.06, 0.07, { type: 'triangle', g: 0.07, bus: 'vp', q: 600 });
  },
  /** A distant ambient one-shot through its own panner on the ambience bus: chirp (meadow), creak (lake ice), drip (caves), hoot (night). */
  amb(kind, pan = 0) {
    if (!this.ok) return; const c = this.ctx, t = c.currentTime, r = 0.9 + Math.random() * 0.2, g = c.createGain(); g.gain.value = 1; g.connect(this.bus.amb); let out = g;
    if (c.createStereoPanner) { const pn = c.createStereoPanner(); pn.pan.value = Math.max(-1, Math.min(1, pan)); pn.connect(g); out = pn; }
    this.bus.ap = out; setTimeout(() => { try { out.disconnect(); if (out !== g) g.disconnect(); } catch (e) { /* gone */ } }, 3000);
    if (kind === 'chirp') { const n = 2 + Math.floor(Math.random() * 3); for (let i = 0; i < n; i++) this.tone(3000 * r + i * 120, t + i * 0.09, 0.07, { g: 0.09, slide: 1.25, bus: 'ap', verb: 0.3 }); }
    if (kind === 'creak') { this.tone(70 * r, t, 1.1, { type: 'sawtooth', g: 0.12, q: 380, slide: 1.6, a: 0.25, bus: 'ap', verb: 0.6 }); this.hiss(t + 0.1, 0.6, { f: 900, to: 300, g: 0.05, Q: 4, bus: 'ap' }); }
    if (kind === 'drip') { this.tone(1500 * r, t, 0.12, { g: 0.12, slide: 0.55, bus: 'ap', verb: 1 }); }
    if (kind === 'hoot') { this.tone(400 * r, t, 0.35, { g: 0.07, a: 0.06, bus: 'ap', verb: 0.8 }); this.tone(360 * r, t + 0.42, 0.5, { g: 0.07, a: 0.06, bus: 'ap', verb: 0.8 }); }
  },
  /** A wind gust: the wind bed swells and a soft whoosh of snow passes by over d seconds. */
  gust(d = 2.5) {
    if (!this.ok) return; const t = this.ctx.currentTime; this.gustUntil = t + d;
    this.hiss(t, d, { f: 500, to: 1400, g: 0.05, Q: 0.7, bus: 'amb' });
  },
  /** A soft UI tick for buttons and tabs. */
  tick() { if (!this.ok) return; const t = this.ctx.currentTime; this.tone(1100, t, 0.05, { g: 0.06, bus: 'ui', type: 'triangle' }); },
  crack() { if (!this.ok) return; const t = this.ctx.currentTime; this.duck(1.2); for (let i = 0; i < 5; i++) this.hiss(t + i * 0.05, 0.12, { f: 3000 - i * 300, g: 0.25, Q: 3 }); this.tone(60, t, 1.2, { type: 'sine', g: 0.4, slide: 0.6 }); for (const k of [0, 4, 7, 12]) this.tone(midi(72 + k), t + 0.4, 1.8, { g: 0.06, verb: 0.8, bus: 'ui' }); },
  shimmer() { if (!this.ok) return; const t = this.ctx.currentTime; for (let i = 0; i < 8; i++) this.tone(midi(84 + PENTA[i % 5] + (i > 4 ? 12 : 0)), t + i * 0.06, 1.1, { g: 0.05, verb: 0.9, bus: 'ui' }); },
  /** Stings for key moments. */
  sting(kind) {
    if (!this.ok) return; const t = this.ctx.currentTime; this.duck(1.4);
    const seq = { friend: [0, 4, 7, 12], page: [0, 4, 7, 11, 14], area: [0, 7, 12, 16, 19], rare: [0, 3, 7, 10, 14, 19], night: [0, 7, 14] }[kind] || [0, 7];
    seq.forEach((k, i) => this.tone(midi(72 + k), t + i * 0.09, 1.4, { g: 0.09, verb: 0.7, bus: 'ui' }));
  },
};
