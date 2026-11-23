// PROTOTYPE - NOT FOR PRODUCTION
// Paws & Chaos: Sunbeam Kingdom — 3D cozy sandbox for kids: play a kitten in a giant sunny house, knock toys
// off tables for mischief stars, chase the red dot, push yarn into the basket, climb the bookshelf for golden fish,
// dress up at the magic mirror and open the garden. No fail states. Three.js (global THREE), sound made in code.
// Sections: helpers · AudioEngine · Particles · WorldBuilder · PhysicsProps · CatController · CameraRig ·
// QuestManager · UIManager · Game (loop, save, quality) · run().

const LANGS = ['en', 'ar', 'es', 'vi', 'hi', 'bn', 'id'];
const TAU = Math.PI * 2;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const damp = (k, dt) => 1 - Math.exp(-k * dt);
const rand = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

/** First supported language in the device list, else English. */
function detectLang(list) {
  for (const l of list || []) { const b = String(l || '').toLowerCase().split('-')[0]; if (LANGS.includes(b)) return b; }
  return 'en';
}

const buzz = (kind) => { try { lib.haptics.play(kind); } catch (e) { /* no vibration here */ } };

// ---------------------------------------------------------------- icons (SVG, same on every phone)
const SVG = {
  fish: '<svg viewBox="0 0 64 64"><path d="M6 32c8-13 22-18 34-14l14-9-3 23 3 23-14-9C28 50 14 45 6 32z" fill="#ffb11f" stroke="#a65a00" stroke-width="4" stroke-linejoin="round"/><circle cx="20" cy="29" r="4" fill="#4a2a3a"/><path d="M30 24c4 4 4 12 0 16" stroke="#e07d00" stroke-width="3" fill="none" stroke-linecap="round"/></svg>',
  star: '<svg viewBox="0 0 64 64"><path d="M32 5l8 17 19 2-14 13 4 19-17-10-17 10 4-19L5 24l19-2z" fill="#ffd23f" stroke="#c77800" stroke-width="4" stroke-linejoin="round"/></svg>',
  dot: '<svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="28" fill="#fff" stroke="#e5b98a" stroke-width="3"/><circle cx="32" cy="32" r="15" fill="#ff2d4a" opacity=".35"/><circle cx="32" cy="32" r="9" fill="#ff2d4a"/></svg>',
  yarn: '<svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="28" fill="#fff" stroke="#e5b98a" stroke-width="3"/><circle cx="25" cy="26" r="12" fill="#ff6fa8"/><path d="M15 22c6 2 13 9 15 15M18 33c5-6 10-11 17-12" stroke="#d63f7f" stroke-width="2.4" fill="none"/><path d="M34 44h18l-3 12H37z" fill="#c98a4b" stroke="#8a5528" stroke-width="2.4"/><path d="M38 38l6 5" stroke="#4a2a3a" stroke-width="3" stroke-linecap="round"/></svg>',
  shelf: '<svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="28" fill="#fff" stroke="#e5b98a" stroke-width="3"/><path d="M14 50h10V40h10V30h10V20h8" stroke="#c98a4b" stroke-width="6" fill="none" stroke-linejoin="round"/><path d="M47 9l3 6 6 1-4 4 1 6-6-3-6 3 1-6-4-4 6-1z" fill="#ffd23f" stroke="#c77800" stroke-width="2"/></svg>',
  sound: '<svg viewBox="0 0 64 64"><path d="M10 24h10l14-12v40L20 40H10z" fill="#4a2a3a"/><path d="M42 22c5 5 5 15 0 20M48 16c9 9 9 23 0 32" stroke="#4a2a3a" stroke-width="5" fill="none" stroke-linecap="round"/></svg>',
  mute: '<svg viewBox="0 0 64 64"><path d="M10 24h10l14-12v40L20 40H10z" fill="#4a2a3a"/><path d="M42 24l16 16M58 24L42 40" stroke="#e0435f" stroke-width="5" stroke-linecap="round"/></svg>',
  globe: '<svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="26" fill="#8fd8ff" stroke="#4a2a3a" stroke-width="4"/><path d="M6 32h52M32 6c-10 12-10 40 0 52M32 6c10 12 10 40 0 52" stroke="#4a2a3a" stroke-width="3.5" fill="none"/></svg>',
  paw: '<svg viewBox="0 0 64 64"><ellipse cx="32" cy="42" rx="14" ry="12" fill="#ff8fb3"/><circle cx="14" cy="28" r="6.5" fill="#ff8fb3"/><circle cx="24" cy="17" r="6.5" fill="#ff8fb3"/><circle cx="40" cy="17" r="6.5" fill="#ff8fb3"/><circle cx="50" cy="28" r="6.5" fill="#ff8fb3"/><path d="M32 6l-8 9h16z" fill="#fff" opacity=".9"/></svg>',
  meow: '<svg viewBox="0 0 64 64"><path d="M12 22l6-14 9 9h10l9-9 6 14c4 6 4 20-6 27-10 6-22 6-32 0C4 42 8 28 12 22z" fill="#ffb067" stroke="#4a2a3a" stroke-width="3.5" stroke-linejoin="round"/><circle cx="24" cy="32" r="3.6" fill="#4a2a3a"/><circle cx="40" cy="32" r="3.6" fill="#4a2a3a"/><ellipse cx="32" cy="43" rx="5" ry="6" fill="#d6456b"/></svg>',
  none: '<svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="22" fill="none" stroke="#c9a7a0" stroke-width="6"/><path d="M17 47L47 17" stroke="#c9a7a0" stroke-width="6" stroke-linecap="round"/></svg>',
  wizard: '<svg viewBox="0 0 64 64"><path d="M32 4L18 46h28z" fill="#7a5cff" stroke="#3d2a8a" stroke-width="3" stroke-linejoin="round"/><ellipse cx="32" cy="48" rx="24" ry="7" fill="#5b3fd8" stroke="#3d2a8a" stroke-width="3"/><path d="M30 22l2-5 2 5 5 1-4 3 1 5-4-3-4 3 1-5-4-3z" fill="#ffe27a"/></svg>',
  pirate: '<svg viewBox="0 0 64 64"><path d="M6 40c8-22 44-22 52 0-14-6-38-6-52 0z" fill="#2e2b36" stroke="#111" stroke-width="3" stroke-linejoin="round"/><circle cx="32" cy="30" r="5" fill="#fff"/><path d="M26 37l12-3M26 34l12 3" stroke="#fff" stroke-width="2.4"/></svg>',
  crown: '<svg viewBox="0 0 64 64"><path d="M8 46l4-28 12 12 8-18 8 18 12-12 4 28z" fill="#ffd23f" stroke="#b07a00" stroke-width="3.5" stroke-linejoin="round"/><circle cx="32" cy="38" r="4.5" fill="#ff4d7a"/><rect x="8" y="46" width="48" height="7" rx="2" fill="#ffb11f" stroke="#b07a00" stroke-width="3"/></svg>',
  propeller: '<svg viewBox="0 0 64 64"><path d="M12 46a20 18 0 0 1 40 0z" fill="#ff5d6c" stroke="#a8303f" stroke-width="3"/><path d="M22 46a10 16 0 0 1 10-17v17z" fill="#ffd23f"/><rect x="30" y="16" width="4" height="14" fill="#555"/><path d="M14 14h36" stroke="#3bb6ff" stroke-width="6" stroke-linecap="round"/></svg>',
  wings: '<svg viewBox="0 0 64 64"><path d="M32 30C22 6 4 10 8 26c2 8 14 10 24 6zM32 30C42 6 60 10 56 26c-2 8-14 10-24 6z" fill="#7fd8ff" stroke="#2c88c0" stroke-width="3"/><path d="M32 32c-8 4-18 10-14 18 3 5 11 1 14-10 3 11 11 15 14 10 4-8-6-14-14-18z" fill="#ff9ef0" stroke="#c0459f" stroke-width="3"/></svg>',
};
/** A round cat face in the skin's colours, for the wardrobe. */
function catIcon(s) {
  const id = 'g' + s.id;
  const fill = s.pattern === 'galaxy' ? `url(#${id})` : s.base;
  const stripes = s.pattern === 'tabby' ? `<path d="M26 14v8M32 12v9M38 14v8" stroke="${s.stripe}" stroke-width="3.5" stroke-linecap="round"/>` : s.pattern === 'patches' ? `<circle cx="22" cy="24" r="7" fill="${s.stripe}"/><circle cx="43" cy="20" r="6" fill="${s.point}"/>` : s.pattern === 'galaxy' ? '<circle cx="22" cy="22" r="1.6" fill="#fff"/><circle cx="42" cy="27" r="1.3" fill="#fff"/><circle cx="34" cy="16" r="1.1" fill="#fff"/>' : '';
  const ear = s.id === 'siamese' ? s.point : s.base;
  return `<svg class="ic" viewBox="0 0 64 64"><defs><radialGradient id="${id}"><stop offset="0" stop-color="${s.stripe}"/><stop offset="1" stop-color="${s.base}"/></radialGradient></defs><path d="M10 26L12 6l14 10zM54 26L52 6 38 16z" fill="${ear}" stroke="#4a2a3a" stroke-width="3" stroke-linejoin="round"/><ellipse cx="32" cy="36" rx="24" ry="22" fill="${fill}" stroke="#4a2a3a" stroke-width="3"/>${stripes}<ellipse cx="32" cy="45" rx="11" ry="8" fill="${s.muzzle || s.belly}"/><circle cx="23" cy="35" r="4" fill="#4a2a3a"/><circle cx="41" cy="35" r="4" fill="#4a2a3a"/><circle cx="24.4" cy="33.6" r="1.4" fill="#fff"/><circle cx="42.4" cy="33.6" r="1.4" fill="#fff"/><path d="M29 42h6l-3 3z" fill="#ff7a9c"/></svg>`;
}

// ---------------------------------------------------------------- AudioEngine
/** All sound is synthesised with Web Audio; the context starts on the first gesture. */
class AudioEngine {
  constructor() { this.ctx = null; this.muted = false; this.next = 0; this.step = 0; this.mel = 5; this.bar = 0; this.combo = 0; }
  unlock() {
    if (this.ctx) { if (this.ctx.state === 'suspended' && !document.hidden) this.ctx.resume().catch(() => {}); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try { this.ctx = new AC(); } catch (e) { this.ctx = null; return; }
    const c = this.ctx;
    this.master = c.createGain(); this.master.gain.value = this.muted ? 0 : 0.9;
    const comp = c.createDynamicsCompressor(); comp.threshold.value = -16; comp.ratio.value = 5;
    this.master.connect(comp); comp.connect(c.destination);
    this.sfx = c.createGain(); this.sfx.gain.value = 0.85; this.sfx.connect(this.master);
    this.mus = c.createGain(); this.mus.gain.value = 0.15; this.mus.connect(this.master);
    const n = c.createBuffer(1, Math.floor(c.sampleRate * 0.6), c.sampleRate), d = n.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    this.noiseBuf = n;
    this.next = c.currentTime + 0.15;
  }
  setMuted(m) { this.muted = m; if (this.master) this.master.gain.setTargetAtTime(m ? 0 : 0.9, this.ctx.currentTime, 0.04); }
  suspend(hidden) { if (!this.ctx) return; (hidden ? this.ctx.suspend() : this.ctx.resume()).catch(() => {}); }
  get live() { return !!this.ctx && !this.muted && this.ctx.state === 'running'; }
  close() { if (this.ctx) this.ctx.close().catch(() => {}); this.ctx = null; }
  /** One enveloped oscillator, optional pitch glide and low-pass. */
  osc(type, f0, f1, t, dur, vol, out, lp) {
    const c = this.ctx, o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t);
    if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + dur * 0.9);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + Math.min(0.02, dur * 0.2)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    let node = o;
    if (lp) { const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = lp; o.connect(f); node = f; }
    node.connect(g); g.connect(out || this.sfx); o.start(t); o.stop(t + dur + 0.05);
    return o;
  }
  noise(t, dur, vol, type, freq, q, f1) {
    const c = this.ctx, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    s.buffer = this.noiseBuf; f.type = type; f.frequency.setValueAtTime(freq, t); if (f1) f.frequency.exponentialRampToValueAtTime(f1, t + dur); f.Q.value = q || 1;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(this.sfx); s.start(t, Math.random() * 0.3); s.stop(t + dur + 0.05);
  }
  /** Kitten meow: two detuned voices sweep up then down through a warm low-pass. */
  meow() {
    if (!this.live) return;
    const c = this.ctx, t = c.currentTime, p = rand(0.92, 1.1), d = rand(0.42, 0.55);
    const f = c.createBiquadFilter(); f.type = 'lowpass'; f.Q.value = 5;
    f.frequency.setValueAtTime(900, t); f.frequency.linearRampToValueAtTime(2600, t + 0.12); f.frequency.exponentialRampToValueAtTime(700, t + d);
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.32, t + 0.04); g.gain.setValueAtTime(0.3, t + d * 0.6); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    f.connect(g); g.connect(this.sfx);
    for (const [type, det, v] of [['sawtooth', 1, 0.5], ['triangle', 1.006, 0.9]]) {
      const o = c.createOscillator(), og = c.createGain(); o.type = type; og.gain.value = v;
      o.frequency.setValueAtTime(520 * p * det, t); o.frequency.linearRampToValueAtTime(880 * p * det, t + 0.13); o.frequency.exponentialRampToValueAtTime(470 * p * det, t + d);
      o.connect(og); og.connect(f); o.start(t); o.stop(t + d + 0.05);
    }
  }
  thud(k) { if (!this.live) return; const t = this.ctx.currentTime, v = clamp(k, 0.15, 1); this.osc('sine', rand(130, 160), 60, t, 0.16, 0.35 * v); this.noise(t, 0.09, 0.22 * v, 'lowpass', 500, 1); }
  /** Marimba note n on the pentatonic ladder (rises with the combo). */
  chime(n) {
    if (!this.live) return;
    const sc = [0, 2, 4, 7, 9], o = Math.floor(n / 5), f = 523.25 * Math.pow(2, (sc[((n % 5) + 5) % 5] + 12 * Math.min(o, 2)) / 12), t = this.ctx.currentTime;
    this.osc('sine', f, f, t, 0.5, 0.28); this.osc('sine', f * 4, f * 4, t, 0.12, 0.06);
  }
  pop() { if (!this.live) return; const t = this.ctx.currentTime; this.osc('sine', 420, 1350, t, 0.11, 0.35); this.osc('triangle', 900, 1800, t + 0.05, 0.12, 0.15); }
  boing(k) { if (!this.live) return; const t = this.ctx.currentTime, b = rand(0.9, 1.1) * (k || 1); const o = this.osc('sine', 160 * b, 520 * b, t, 0.42, 0.33); const l = this.ctx.createOscillator(), lg = this.ctx.createGain(); l.frequency.value = 22; lg.gain.value = 40; l.connect(lg); lg.connect(o.frequency); l.start(t); l.stop(t + 0.45); }
  squeak() { if (!this.live) return; const t = this.ctx.currentTime; this.osc('square', 1100, 1900, t, 0.12, 0.12, null, 2600); this.osc('square', 1800, 1000, t + 0.12, 0.16, 0.12, null, 2600); }
  swish() { if (!this.live) return; this.noise(this.ctx.currentTime, 0.18, 0.18, 'bandpass', 600, 2, 3200); }
  splash() { if (!this.live) return; const t = this.ctx.currentTime; this.noise(t, 0.45, 0.32, 'lowpass', 2400, 0.7, 400); this.osc('sine', 300, 900, t, 0.1, 0.12); }
  rustle() { if (!this.live) return; this.noise(this.ctx.currentTime, 0.3, 0.16, 'highpass', 2500, 0.5); }
  snore() { if (!this.live) return; const t = this.ctx.currentTime; this.osc('sawtooth', 70, 90, t, 0.6, 0.08, null, 350); }
  fanfare() { if (!this.live) return; const t = this.ctx.currentTime; [0, 4, 7, 12, 16].forEach((s, i) => { const f = 523.25 * Math.pow(2, s / 12); this.osc('triangle', f, f, t + i * 0.09, 0.45, 0.2); this.osc('sine', f * 2, f * 2, t + i * 0.09, 0.3, 0.07); }); }
  sparkle() { if (!this.live) return; const t = this.ctx.currentTime; for (let i = 0; i < 4; i++) { const f = 1568 * Math.pow(2, i * 4 / 12); this.osc('sine', f, f, t + i * 0.05, 0.25, 0.08); } }
  /** Generative pentatonic kalimba: a random walk melody over a four-chord bass, scheduled ahead. */
  music() {
    if (!this.ctx || this.ctx.state !== 'running') return;
    const c = this.ctx, beat = 60 / 100 / 2;
    if (this.next < c.currentTime - 0.3) this.next = c.currentTime + 0.05;
    while (this.next < c.currentTime + 0.25) {
      const t = this.next, s = this.step % 8, roots = [130.81, 110, 87.31, 98];
      if (s === 0) this.bar++;
      const root = roots[this.bar % 4];
      if (s === 0 || s === 4) this.kal(root, t, 0.22, 1.2);
      const dense = (Math.floor(this.bar / 8) % 3) === 1 ? 0.8 : 0.6;
      if (s === 0 || Math.random() < dense) {
        this.mel = clamp(this.mel + pick([-2, -1, -1, 1, 1, 2, 0]), 0, 9);
        const sc = [0, 2, 4, 7, 9], f = 392 * Math.pow(2, (sc[this.mel % 5] + 12 * Math.floor(this.mel / 5)) / 12);
        this.kal(f, t, 0.16, 0.9);
        if (Math.random() < 0.12) this.kal(f * 2, t + beat * 0.5, 0.06, 0.6);
      }
      this.next += beat; this.step++;
    }
  }
  kal(f, t, v, dur) { this.osc('sine', f, f, t, dur, v, this.mus); this.osc('triangle', f * 3.01, f * 3.01, t, dur * 0.25, v * 0.18, this.mus); }
}

// ---------------------------------------------------------------- Particles
/** One pooled point cloud: stars, dust, confetti, soil, water. */
class Particles {
  constructor(scene, n) {
    this.n = n; this.limit = n; this.i = 0;
    this.p = new Float32Array(n * 3); this.v = new Float32Array(n * 3); this.c = new Float32Array(n * 3);
    this.s = new Float32Array(n); this.a = new Float32Array(n); this.k = new Float32Array(n);
    this.life = new Float32Array(n); this.max = new Float32Array(n); this.size0 = new Float32Array(n); this.g = new Float32Array(n);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.p, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('pcol', new THREE.BufferAttribute(this.c, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('psize', new THREE.BufferAttribute(this.s, 1).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('palpha', new THREE.BufferAttribute(this.a, 1).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('pkind', new THREE.BufferAttribute(this.k, 1));
    this.geo = geo;
    this.mat = new THREE.ShaderMaterial({
      uniforms: { scale: { value: 600 } }, transparent: true, depthWrite: false,
      vertexShader: 'attribute vec3 pcol; attribute float psize; attribute float palpha; attribute float pkind; varying vec3 vC; varying float vA; varying float vK; uniform float scale;\nvoid main(){ vC=pcol; vA=palpha; vK=pkind; vec4 mv=modelViewMatrix*vec4(position,1.0); gl_PointSize=psize*scale/max(0.1,-mv.z); gl_Position=projectionMatrix*mv; }',
      fragmentShader: 'varying vec3 vC; varying float vA; varying float vK;\nvoid main(){ vec2 q=gl_PointCoord*2.0-1.0; float r=length(q); float a=atan(q.y,q.x); float lim = vK>0.5 ? 0.5+0.5*pow(abs(cos(a*2.5+1.57)),2.0) : 1.0; float d=r/lim; float al=smoothstep(1.0,0.75,d)*vA; if(al<0.01) discard; vec3 col=mix(vC, vec3(1.0), (1.0-d)*0.35*step(0.5,vK)); gl_FragColor=vec4(col,al);\n#include <colorspace_fragment>\n}',
    });
    this.pts = new THREE.Points(geo, this.mat); this.pts.frustumCulled = false; this.pts.renderOrder = 5;
    scene.add(this.pts);
    this.col = new THREE.Color();
  }
  /** kind 0 = soft round, 1 = star. */
  emit(x, y, z, count, o) {
    const n = Math.min(count, Math.ceil(count * this.limit / this.n));
    for (let j = 0; j < n; j++) {
      const i = this.i; this.i = (this.i + 1) % this.n;
      const sp = o.speed || 3, a = Math.random() * TAU, up = o.up != null ? o.up : 2;
      this.p[i * 3] = x + rand(-1, 1) * (o.spread || 0.2); this.p[i * 3 + 1] = y + rand(0, 1) * (o.spreadY || 0.1); this.p[i * 3 + 2] = z + rand(-1, 1) * (o.spread || 0.2);
      const h = sp * rand(0.3, 1);
      this.v[i * 3] = Math.cos(a) * h; this.v[i * 3 + 1] = up * rand(0.5, 1.3); this.v[i * 3 + 2] = Math.sin(a) * h;
      this.col.set(Array.isArray(o.color) ? pick(o.color) : o.color || '#ffffff');
      this.c[i * 3] = this.col.r; this.c[i * 3 + 1] = this.col.g; this.c[i * 3 + 2] = this.col.b;
      this.max[i] = this.life[i] = (o.life || 0.8) * rand(0.7, 1.2); this.size0[i] = (o.size || 0.25) * rand(0.7, 1.3); this.g[i] = o.g != null ? o.g : 6; this.k[i] = o.kind || 0;
    }
    this.geo.attributes.pkind.needsUpdate = true;
  }
  update(dt) {
    for (let i = 0; i < this.n; i++) {
      if (this.life[i] <= 0) { if (this.a[i] !== 0) { this.a[i] = 0; this.s[i] = 0; } continue; }
      this.life[i] -= dt;
      this.v[i * 3 + 1] -= this.g[i] * dt;
      const fr = Math.exp(-1.2 * dt); this.v[i * 3] *= fr; this.v[i * 3 + 2] *= fr;
      this.p[i * 3] += this.v[i * 3] * dt; this.p[i * 3 + 1] += this.v[i * 3 + 1] * dt; this.p[i * 3 + 2] += this.v[i * 3 + 2] * dt;
      if (this.p[i * 3 + 1] < 0.03) { this.p[i * 3 + 1] = 0.03; this.v[i * 3 + 1] *= -0.3; }
      const t = this.life[i] / this.max[i];
      this.a[i] = Math.min(1, t * 3); this.s[i] = this.size0[i] * (0.4 + 0.6 * Math.min(1, t * 2));
    }
    const at = this.geo.attributes;
    at.position.needsUpdate = true; at.pcol.needsUpdate = true; at.psize.needsUpdate = true; at.palpha.needsUpdate = true;
  }
}

// ---------------------------------------------------------------- WorldBuilder
/** Collects many static pieces into one vertex-coloured mesh (one draw call). */
class Batch {
  constructor() { this.parts = []; this.m = new THREE.Matrix4(); this.q = new THREE.Quaternion(); this.e = new THREE.Euler(); this.c = new THREE.Color(); }
  add(geo, color, x, y, z, rx, ry, rz, sx, sy, sz) {
    this.q.setFromEuler(this.e.set(rx || 0, ry || 0, rz || 0));
    this.m.compose(new THREE.Vector3(x, y, z), this.q, new THREE.Vector3(sx || 1, sy || 1, sz || 1));
    const g = geo.index ? geo.toNonIndexed() : geo.clone();
    g.applyMatrix4(this.m);
    const n = g.attributes.position.count, col = new Float32Array(n * 3);
    this.c.set(color);
    for (let i = 0; i < n; i++) { col[i * 3] = this.c.r; col[i * 3 + 1] = this.c.g; col[i * 3 + 2] = this.c.b; }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    this.parts.push(g);
  }
  build(mat) {
    let n = 0; for (const g of this.parts) n += g.attributes.position.count;
    const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), col = new Float32Array(n * 3);
    let o = 0;
    for (const g of this.parts) { pos.set(g.attributes.position.array, o * 3); nor.set(g.attributes.normal.array, o * 3); col.set(g.attributes.color.array, o * 3); o += g.attributes.position.count; g.dispose(); }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    geo.computeBoundingSphere();
    this.parts = [];
    return new THREE.Mesh(geo, mat);
  }
}

function canvasTex(w, h, draw, repeat) {
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  draw(cv.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
  return t;
}

/** Builds the living room and the garden: meshes, colliders, spots for the red dot and fish. */
class WorldBuilder {
  constructor(scene, cfg) {
    this.scene = scene; this.cfg = cfg;
    this.colliders = []; this.disposables = []; this.anim = []; this.laserSpots = [];
    this.gardenOpen = false;
    const G = this.G = {
      box: new THREE.BoxGeometry(1, 1, 1), cyl: new THREE.CylinderGeometry(1, 1, 1, 24), cyl8: new THREE.CylinderGeometry(1, 1, 1, 8),
      sph: new THREE.SphereGeometry(1, 20, 14), lo: new THREE.SphereGeometry(1, 10, 7), cone: new THREE.ConeGeometry(1, 1, 18), torus: new THREE.TorusGeometry(1, 0.12, 10, 32),
    };
    for (const k in G) this.disposables.push(G[k]);
    this.solidMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.72, metalness: 0 });
    this.shellMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, metalness: 0 });
    this.disposables.push(this.solidMat, this.shellMat);
    this.solid = new Batch(); this.shell = new Batch();
  }
  mat(o) { const m = new THREE.MeshStandardMaterial(Object.assign({ roughness: 0.6 }, o)); this.disposables.push(m); return m; }
  /** Solid box collider + optional batched look. */
  box(x0, x1, y0, y1, z0, z1, color, opt) {
    const o = opt || {};
    const c = { x0, x1, y0, y1, z0, z1, bounce: o.bounce || null, tag: o.tag || null, gate: !!o.gate, zone: o.zone || (z1 <= -12 ? 'garden' : 'room') };
    if (!o.noCollide) this.colliders.push(c);
    if (color) (o.shell ? this.shell : this.solid).add(this.G.box, color, (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, 0, 0, 0, x1 - x0, y1 - y0, z1 - z0);
    return c;
  }
  cylc(x, z, r, y0, y1, opt) { const o = opt || {}; const c = { cyl: true, x, z, r, y0, y1, bounce: o.bounce || null, tag: o.tag || null, zone: z < -12 ? 'garden' : 'room' }; this.colliders.push(c); return c; }
  addMesh(m, cast) { m.castShadow = cast !== false; m.receiveShadow = true; this.scene.add(m); return m; }

  build() {
    const S = this.solid, H = this.shell, G = this.G;
    // ---- room shell: honey floor, cream walls with a coral stripe, sun window
    const floorTex = canvasTex(512, 512, (g, w, h) => {
      g.fillStyle = '#e3a865'; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? '#dc9d58' : '#e8b06e'; g.fillRect(0, i * 64, w, 62); g.fillStyle = 'rgba(120,60,20,.25)'; g.fillRect(0, i * 64 + 62, w, 2); g.fillRect(((i * 197) % 400) + 40, i * 64, 2, 62); }
    }, [6, 6]);
    this.disposables.push(floorTex);
    const floor = this.addMesh(new THREE.Mesh(new THREE.PlaneGeometry(24.8, 24.8), this.mat({ map: floorTex, roughness: 0.55 })), false);
    floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0, 0);
    this.disposables.push(floor.geometry);
    const rugTex = canvasTex(512, 512, (g, w) => {
      const cols = ['#9fd8ef', '#fff3e0', '#ffb3c7', '#fff3e0', '#b8e6b0', '#fff3e0', '#ffd98a'];
      for (let i = 0; i < cols.length; i++) { g.fillStyle = cols[i]; g.beginPath(); g.arc(w / 2, w / 2, w / 2 - i * 34, 0, TAU); g.fill(); }
      g.fillStyle = '#ffb3c7'; for (let a = 0; a < 24; a++) { g.beginPath(); g.arc(w / 2 + Math.cos(a / 24 * TAU) * 226, w / 2 + Math.sin(a / 24 * TAU) * 226, 9, 0, TAU); g.fill(); }
    });
    this.disposables.push(rugTex);
    const rug = this.addMesh(new THREE.Mesh(new THREE.CircleGeometry(5.6, 48), this.mat({ map: rugTex, roughness: 0.95 })), false);
    rug.rotation.x = -Math.PI / 2; rug.position.set(0, 0.015, 1.5);
    this.disposables.push(rug.geometry);

    const wall = '#fff1dc', stripe = '#ffb3a0', base = '#c98a4b';
    const wallPiece = (x0, x1, z0, z1, y0, y1) => {
      this.box(x0, x1, y0, y1, z0, z1, wall, { shell: true });
      if (y0 < 0.1) { H.add(G.box, base, (x0 + x1) / 2, 0.25, (z0 + z1) / 2, 0, 0, 0, x1 - x0 + 0.08, 0.5, z1 - z0 + 0.08); }
      if (y0 < 2.6 && y1 > 2.8) H.add(G.box, stripe, (x0 + x1) / 2, 2.7, (z0 + z1) / 2, 0, 0, 0, x1 - x0 + 0.06, 0.3, z1 - z0 + 0.06);
    };
    wallPiece(-12.4, -12, -12.4, 12.4, 0, 9); // left (window cut visually by panes)
    wallPiece(12, 12.4, -12.4, 12.4, 0, 9);
    wallPiece(-12.4, 12.4, 12, 12.4, 0, 9);
    wallPiece(-14.4, -8.1, -12.4, -12, 0, 9);
    wallPiece(-5.9, 14.4, -12.4, -12, 0, 9);
    this.box(-8.1, -5.9, 1.9, 9, -12.4, -12, wall, { shell: true });
    // window on the left wall: bright panes and a sun shaft
    H.add(G.box, '#ffffff', -11.96, 5.5, 6.5, 0, 0, 0, 0.1, 4.4, 5.4);
    H.add(G.box, '#fff8d0', -11.9, 5.5, 6.5, 0, 0, 0, 0.06, 4.0, 5.0);
    H.add(G.box, '#ffffff', -11.86, 5.5, 6.5, 0, 0, 0, 0.08, 4.0, 0.18);
    H.add(G.box, '#ffffff', -11.86, 5.5, 6.5, 0, 0, 0, 0.08, 0.18, 5.0);
    const paneMat = new THREE.MeshBasicMaterial({ color: 0xfff6c8 }); this.disposables.push(paneMat);
    const pane = new THREE.Mesh(new THREE.PlaneGeometry(4.8, 3.8), paneMat); pane.position.set(-11.84, 5.5, 6.5); pane.rotation.y = Math.PI / 2; this.scene.add(pane); this.disposables.push(pane.geometry);
    const shaftTex = canvasTex(64, 256, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgba(255,240,190,0.55)'); gr.addColorStop(1, 'rgba(255,240,190,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
    this.disposables.push(shaftTex);
    const shaftMat = new THREE.MeshBasicMaterial({ map: shaftTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
    this.disposables.push(shaftMat);
    const shaftGeo = new THREE.PlaneGeometry(4.6, 11); this.disposables.push(shaftGeo);
    this.shafts = [];
    for (let i = 0; i < 2; i++) {
      const sh = new THREE.Mesh(shaftGeo, shaftMat);
      sh.position.set(-7.6, 3.4, 6.4 + (i - 0.5) * 1.2); sh.rotation.set(0, Math.PI / 2 + (i ? 0.15 : -0.1), -0.95);
      sh.renderOrder = 4; this.scene.add(sh); this.shafts.push(sh);
    }
    // wall art
    H.add(G.box, '#ffffff', 4, 6.4, 11.94, 0, 0, 0, 3.2, 2.4, 0.1); H.add(G.box, '#9fd8ef', 4, 6.4, 11.9, 0, 0, 0, 2.8, 2.0, 0.08); H.add(G.sph, '#ffd23f', 4.6, 6.8, 11.85, 0, 0, 0, 0.45, 0.45, 0.05);
    H.add(G.box, '#ffffff', -5, 6, 11.94, 0, 0, 0, 2.4, 3, 0.1); H.add(G.box, '#ffc7d6', -5, 6, 11.9, 0, 0, 0, 2.0, 2.6, 0.08);

    // ---- sofa (bouncy cushions)
    const sofa = '#ff8f80', sofaD = '#e86f64', cush = '#ffb8a8';
    this.box(-10, -6.6, 0, 0.75, -5, 1, sofaD);
    this.box(-10, -6.6, 0.75, 1.2, -5, 1, null, { bounce: 'sofa', tag: 'sofa' });
    for (let i = 0; i < 2; i++) S.add(G.box, cush, -8.3, 0.98, -3.5 + i * 3, 0, 0, 0, 3.3, 0.46, 2.9);
    this.box(-10.6, -9.6, 0, 2.7, -5.6, 1.6, sofa, { tag: 'sofaBack' });
    this.box(-10, -6.6, 0, 1.8, -5.6, -5, sofa); this.box(-10, -6.6, 0, 1.8, 1, 1.6, sofa);
    for (const z of [-5.3, 1.3]) S.add(G.cyl, sofa, -8.3, 1.8, z, Math.PI / 2, 0, 0, 0.3, 0.6, 0.3);
    for (const [x, z] of [[-9.8, -5.4], [-6.8, -5.4], [-9.8, 1.4], [-6.8, 1.4]]) S.add(G.cyl8, '#8a5528', x, 0.08, z, 0, 0, 0, 0.12, 0.16, 0.12);
    // pillow
    S.add(G.sph, '#ffe27a', -9.4, 1.8, -3.9, 0.3, 0.4, 0, 0.5, 0.6, 0.18);

    // ---- coffee table
    const wood = '#d9944f', woodD = '#b9763a';
    this.box(-5.4, -2.6, 1.35, 1.6, -8.6, -6.6, wood, { tag: 'table' });
    this.box(-5.4, -2.6, 0, 1.35, -8.6, -6.6, null);
    for (const [x, z] of [[-5.15, -8.35], [-2.85, -8.35], [-5.15, -6.85], [-2.85, -6.85]]) S.add(G.cyl8, woodD, x, 0.68, z, 0, 0, 0, 0.14, 1.36, 0.14);

    // ---- stepped bookshelf tower (parkour): four cubbies rising to the top perch
    const tops = [2.6, 3.6, 4.6, 5.6], shelfC = ['#c98a4b', '#d9944f', '#c98a4b', '#e0a35c'];
    const bookC = ['#ff6f91', '#6ac8ff', '#ffd23f', '#7fe08a', '#b28dff', '#ff9f43'];
    for (let i = 0; i < 4; i++) {
      const x0 = -2 + i * 2, x1 = x0 + 2;
      this.box(x0, x1, 0, tops[i], -12, -9.8, shelfC[i], { tag: i === 3 ? 'perch' : 'shelf' + i });
      for (let r = 0; r * 1.1 + 0.9 < tops[i] - 0.2; r++) {
        const y = 0.25 + r * 1.1;
        S.add(G.box, '#8a5528', (x0 + x1) / 2, y + 0.82, -9.78, 0, 0, 0, 1.9, 0.08, 0.06);
        for (let b = 0; b < 5; b++) { const hh = 0.55 + ((b * 7 + i * 3 + r) % 4) * 0.08; S.add(G.box, bookC[(b + i + r) % 6], x0 + 0.28 + b * 0.36, y + hh / 2 + 0.05, -9.76, 0, 0, (b % 3 === 2 ? 0.12 : 0), 0.28, hh, 0.05); }
      }
    }
    // ---- dog bed
    S.add(G.cyl, '#9fd8ef', 7.6, 0.12, -5, 0, 0, 0, 2.6, 0.24, 2.0);
    S.add(G.torus, '#7cc2e0', 7.6, 0.3, -5, Math.PI / 2, 0, 0, 2.5, 1.9, 2.2);
    this.box(5.6, 9.4, 0, 1.2, -6.5, -3.5, null, { bounce: 'dog', tag: 'dog' });
    this.box(9.4, 10.8, 0, 1.4, -5.8, -4.2, null, { tag: 'dogHead' });
    // ---- plants (wobble, spill soil)
    this.plants = [];
    for (const [x, z] of [[-10.6, -10.6], [10.6, 10.4], [-10.6, 10.4], [10.6, -10.4]]) this.makePlant(x, z);
    // ---- mirror wardrobe on the right wall
    S.add(G.box, '#e0a35c', 11.85, 3.4, 4, 0, 0, 0, 0.3, 5.4, 3.4);
    S.add(G.box, '#ffd23f', 11.75, 3.4, 4, 0, 0, 0, 0.2, 5.0, 3.0);
    S.add(G.sph, '#ff9ef0', 11.7, 6.25, 4, 0, 0, 0, 0.3, 0.3, 0.3);
    this.mirrorPos = new THREE.Vector3(11.62, 3.4, 4);
    this.padPos = new THREE.Vector3(9.9, 0, 4);
    // ---- yarn basket
    this.basketPos = new THREE.Vector3(6, 0, 7.5);
    S.add(G.cyl, '#c98a4b', 6, 0.04, 7.5, 0, 0, 0, 1.0, 0.08, 1.0);
    for (let i = 0; i < 18; i++) { const a = i / 18 * TAU; S.add(G.box, i % 2 ? '#c98a4b' : '#b06e33', 6 + Math.cos(a) * 1.02, 0.36, 7.5 + Math.sin(a) * 1.02, 0, -a, 0, 0.12, 0.72, 0.38); }
    S.add(G.torus, '#e0a35c', 6, 0.72, 7.5, Math.PI / 2, 0, 0, 1.04, 1.04, 1.4);
    // ---- toy chest and side table for decoration
    S.add(G.box, '#7fc8ff', 10.4, 0.6, 9.5, 0, -0.3, 0, 1.6, 1.2, 1.1); S.add(G.box, '#ffd23f', 10.4, 1.25, 9.5, 0, -0.3, 0, 1.7, 0.14, 1.2);
    this.box(9.5, 11.3, 0, 1.3, 8.9, 10.1, null);
    // ---- pet door on the back wall
    this.gate = this.box(-8.1, -5.9, 0, 1.9, -12.4, -12, null, { gate: true });
    S.add(G.box, '#ffffff', -7, 2.0, -11.98, 0, 0, 0, 2.6, 0.2, 0.12);
    S.add(G.box, '#ffffff', -8.2, 1.0, -11.98, 0, 0, 0, 0.2, 2.0, 0.12);
    S.add(G.box, '#ffffff', -5.8, 1.0, -11.98, 0, 0, 0, 0.2, 2.0, 0.12);
    const flapMat = this.mat({ color: 0x9fd8ef, roughness: 0.5 });
    this.flap = new THREE.Group(); this.flap.position.set(-7, 1.9, -12.2);
    const fm = new THREE.Mesh(G.box, flapMat); fm.scale.set(2.2, 1.9, 0.12); fm.position.y = -0.95; this.flap.add(fm);
    const pawM = new THREE.Mesh(G.sph, this.mat({ color: 0xffffff })); pawM.scale.set(0.3, 0.3, 0.05); pawM.position.set(0, -0.9, 0.08); this.flap.add(pawM);
    this.scene.add(this.flap); this.flapAng = 0; this.flapVel = 0;
    // fish counter sign above the door (drawn once per change)
    this.signCv = document.createElement('canvas'); this.signCv.width = 256; this.signCv.height = 128;
    this.signTex = new THREE.CanvasTexture(this.signCv); this.signTex.colorSpace = THREE.SRGBColorSpace; this.disposables.push(this.signTex);
    const signMat = new THREE.SpriteMaterial({ map: this.signTex, depthWrite: false }); this.disposables.push(signMat);
    this.sign = new THREE.Sprite(signMat); this.sign.scale.set(2.4, 1.2, 1); this.sign.position.set(-7, 3.1, -11.6); this.scene.add(this.sign);

    this.buildGarden();
    this.makeLaserSpots();

    const solid = this.addMesh(this.solid.build(this.solidMat), true);
    const shell = this.addMesh(this.shell.build(this.shellMat), false);
    this.disposables.push(solid.geometry, shell.geometry);
  }

  makePlant(x, z) {
    // pot and leaves are one vertex-coloured mesh each (two draw calls per plant)
    const g = new THREE.Group(); g.position.set(x, 0, z);
    const pb = new Batch();
    pb.add(this.G.cyl, '#e07a52', 0, 0.65, 0, 0, 0, 0, 0.7, 1.3, 0.7); pb.add(this.G.cyl, '#f08f68', 0, 1.3, 0, 0, 0, 0, 0.8, 0.2, 0.8); pb.add(this.G.cyl, '#6b4226', 0, 1.4, 0, 0, 0, 0, 0.66, 0.05, 0.66);
    const pot = pb.build(this.solidMat); g.add(pot); this.disposables.push(pot.geometry);
    const lb = new Batch();
    for (let i = 0; i < 7; i++) { const a = i / 7 * TAU; lb.add(this.G.lo, i % 2 ? '#4fc06a' : '#2f9a52', Math.cos(a) * 0.35, 0.8 + (i % 3) * 0.15, Math.sin(a) * 0.35, Math.sin(a) * 0.5, -a, -Math.cos(a) * 0.5, 0.28, 0.9, 0.12); }
    const top = lb.build(this.solidMat); top.position.y = 1.35; g.add(top); this.disposables.push(top.geometry);
    g.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
    this.scene.add(g);
    this.cylc(x, z, 0.75, 0, 1.4, { tag: 'plant' });
    this.plants.push({ g, top, x, z, ang: 0, vel: 0, ax: 0, az: 0, cd: 0 });
  }

  buildGarden() {
    const S = this.solid, H = this.shell, G = this.G;
    const grass = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#7ccf6a'; g.fillRect(0, 0, w, h); for (let i = 0; i < 500; i++) { g.fillStyle = Math.random() < 0.5 ? '#6fc25e' : '#8ddb78'; g.fillRect(Math.random() * w, Math.random() * h, 3, 7); } }, [10, 10]);
    this.disposables.push(grass);
    const lawn = this.addMesh(new THREE.Mesh(new THREE.PlaneGeometry(60, 40), this.mat({ map: grass, roughness: 0.95 })), false);
    lawn.rotation.x = -Math.PI / 2; lawn.position.set(0, -0.005, -32.4); this.disposables.push(lawn.geometry);
    // sky dome
    const skyMat = new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, uniforms: {},
      vertexShader: 'varying vec3 vP; void main(){ vP=normalize(position); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
      fragmentShader: 'varying vec3 vP; void main(){ float h=clamp(vP.y,0.0,1.0); vec3 c=mix(vec3(1.0,0.86,0.66), vec3(0.45,0.74,1.0), pow(h,0.55)); gl_FragColor=vec4(c,1.0);\n#include <colorspace_fragment>\n}' });
    this.disposables.push(skyMat);
    const sky = new THREE.Mesh(new THREE.SphereGeometry(90, 24, 12), skyMat); sky.position.set(0, 0, -20); this.scene.add(sky); this.disposables.push(sky.geometry);
    const sunM = new THREE.Mesh(G.sph, new THREE.MeshBasicMaterial({ color: 0xfff2b0 })); sunM.scale.setScalar(5); sunM.position.set(-40, 40, -70); this.scene.add(sunM); this.disposables.push(sunM.material);
    // fence + hedges
    this.box(-14.4, -14, 0, 3, -34.4, -12.4, null); this.box(14, 14.4, 0, 3, -34.4, -12.4, null); this.box(-14.4, 14.4, 0, 3, -34.4, -34, null);
    for (let x = -14; x <= 14; x += 1.4) S.add(G.box, '#fff6e8', x, 1.0, -34.2, 0, 0, 0, 0.3, 2, 0.15);
    for (let z = -33; z <= -13; z += 1.4) { S.add(G.box, '#fff6e8', -14.2, 1.0, z, 0, 0, 0, 0.15, 2, 0.3); S.add(G.box, '#fff6e8', 14.2, 1.0, z, 0, 0, 0, 0.15, 2, 0.3); }
    for (const z of [-34.2]) S.add(G.box, '#fff6e8', 0, 1.5, z, 0, 0, 0, 28.6, 0.2, 0.12);
    for (let i = 0; i < 9; i++) H.add(G.lo, i % 2 ? '#5fb85a' : '#6cc764', -16 + i * 4, 1.4, -37, 0, 0, 0, 2.6, 2.2, 1.8);
    for (const [x, z, s] of [[-20, -26, 1], [20, -20, 1.2], [-21, -16, 0.9], [22, -31, 1.1]]) { H.add(G.cyl8, '#a8703e', x, 2, z, 0, 0, 0, 0.5 * s, 4, 0.5 * s); H.add(G.sph, '#5fb85a', x, 5 * s, z, 0, 0, 0, 3 * s, 2.6 * s, 3 * s); }
    // fountain with lily pads
    this.fountain = { x: 0, z: -22.5 };
    S.add(G.cyl, '#e8e2f5', 0, 0.38, -22.5, 0, 0, 0, 2.8, 0.76, 2.8);
    S.add(G.torus, '#ffffff', 0, 0.78, -22.5, Math.PI / 2, 0, 0, 2.7, 2.7, 1.5);
    S.add(G.cyl, '#d8d0ee', 0, 1.5, -22.5, 0, 0, 0, 0.45, 1.6, 0.45);
    S.add(G.cyl, '#e8e2f5', 0, 2.35, -22.5, 0, 0, 0, 1.0, 0.18, 1.0);
    const water = new THREE.Mesh(new THREE.CircleGeometry(2.55, 40), this.mat({ color: 0x6fd3ff, roughness: 0.15, metalness: 0.1, transparent: true, opacity: 0.85 }));
    water.rotation.x = -Math.PI / 2; water.position.set(0, 0.74, -22.5); this.scene.add(water); this.disposables.push(water.geometry); this.water = water;
    this.cylc(0, -22.5, 2.75, 0, 0.72, { bounce: 'water', tag: 'water' });
    this.cylc(0, -22.5, 0.5, 0, 2.44, { tag: 'spout' });
    this.lilies = [];
    const lilyM = this.mat({ color: 0x5cc76a, roughness: 0.6 }), flowerM = this.mat({ color: 0xff9ec4 });
    for (let i = 0; i < 3; i++) {
      const a = i / 3 * TAU + 0.4, x = Math.cos(a) * 1.65, z = -22.5 + Math.sin(a) * 1.65;
      const g = new THREE.Group(); g.position.set(x, 0.8, z);
      const pad = new THREE.Mesh(G.cyl, lilyM); pad.scale.set(0.62, 0.06, 0.62); g.add(pad);
      const fl = new THREE.Mesh(G.sph, flowerM); fl.scale.set(0.14, 0.1, 0.14); fl.position.set(0.25, 0.08, 0.1); g.add(fl);
      g.traverse((m) => { if (m.isMesh) m.castShadow = true; });
      this.scene.add(g);
      const c = this.cylc(x, z, 0.62, 0.72, 0.86, { bounce: 'lily', tag: 'lily' });
      this.lilies.push({ g, c, t: i, sink: 0 });
    }
    // giant daisies, a staircase of flower heads to the treehouse
    for (const [x, z, h] of [[-8, -17, 1.3], [-10.5, -21.5, 2.3], [-8.5, -26, 3.3], [-4.8, -29.4, 4.3]]) {
      S.add(G.cyl8, '#4caf50', x, h / 2, z, 0, 0, 0, 0.14, h, 0.14);
      S.add(G.sph, '#4caf50', x + 0.4, h * 0.4, z, 0, 0, 0.4, 0.5, 0.1, 0.22);
      for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; S.add(G.lo, '#ffffff', x + Math.cos(a) * 0.72, h - 0.02, z + Math.sin(a) * 0.72, 0, -a, 0, 0.42, 0.07, 0.2); }
      S.add(G.cyl, '#ffc93a', x, h, z, 0, 0, 0, 0.5, 0.1, 0.5);
      this.cylc(x, z, 1.05, h - 0.12, h + 0.05, { tag: 'daisy' });
    }
    // treehouse platform on posts with stairs from the lawn
    this.box(-1.5, 4.5, 4.9, 5.3, -33.8, -30, '#c98a4b', { tag: 'tree' });
    for (const [x, z] of [[-1.2, -33.5], [4.2, -33.5], [-1.2, -30.3], [4.2, -30.3]]) this.box(x - 0.2, x + 0.2, 0, 4.9, z - 0.2, z + 0.2, '#8a5528');
    this.box(1, 4.2, 5.3, 7.4, -33.8, -32, '#ff9f80');
    S.add(G.cone, '#ff6f61', 2.6, 8.1, -32.9, 0, Math.PI / 4, 0, 2.6, 1.4, 1.6);
    S.add(G.box, '#5a3a28', 2.6, 6.1, -31.98, 0, 0, 0, 0.9, 1.4, 0.06);
    for (let k = 1; k <= 17; k++) { const x0 = 4.5 + (17 - k) * 0.45; this.box(x0, x0 + 0.45, 0, k * 5.3 / 17, -32.6, -31.2, k % 2 ? '#d9944f' : '#c98a4b', { tag: 'stair' }); }
    S.add(G.box, '#8a5528', 8.3, 3.3, -32.7, 0, 0, Math.atan2(5.3, 7.65), 9.3, 0.12, 0.12);
    S.add(G.box, '#8a5528', 8.3, 3.3, -31.1, 0, 0, Math.atan2(5.3, 7.65), 9.3, 0.12, 0.12);
    // flowers dotted on the lawn
    const fc = ['#ff7aa8', '#ffd23f', '#b28dff', '#ff9f43', '#6ac8ff'];
    for (let i = 0; i < 40; i++) { const x = rand(-13, 13), z = rand(-33, -13.5); if (Math.hypot(x, z + 22.5) < 3.4) continue; S.add(G.cyl8, '#4caf50', x, 0.18, z, 0, 0, 0, 0.04, 0.36, 0.04); S.add(G.lo, fc[i % 5], x, 0.4, z, 0, 0, 0, 0.16, 0.1, 0.16); }
  }

  /** Points where the red dot may sit: open floor and furniture tops, per zone. */
  makeLaserSpots() {
    const free = (x, z) => !this.colliders.some((c) => (c.cyl ? Math.hypot(x - c.x, z - c.z) < c.r + 0.6 : x > c.x0 - 0.6 && x < c.x1 + 0.6 && z > c.z0 - 0.6 && z < c.z1 + 0.6));
    for (let x = -10.5; x <= 10.5; x += 1.5) for (let z = -9; z <= 10.5; z += 1.5) if (free(x, z) && Math.hypot(x - 6, z - 7.5) > 1.6) this.laserSpots.push({ x, y: 0, z, zone: 'room' });
    for (let x = -12.5; x <= 12.5; x += 1.7) for (let z = -32.5; z <= -14; z += 1.7) if (free(x, z)) this.laserSpots.push({ x, y: 0, z, zone: 'garden' });
    for (const c of this.colliders) {
      if (c.tag === 'sofa') for (const z of [-3.5, -0.5]) this.laserSpots.push({ x: -8.3, y: c.y1, z, zone: 'room' });
      if (c.tag === 'table' || (c.tag && c.tag.startsWith('shelf')) || c.tag === 'tree') this.laserSpots.push({ x: (c.x0 + c.x1) / 2, y: c.y1, z: (c.z0 + c.z1) / 2 + (c.tag === 'tree' ? 1 : 0), zone: c.zone });
    }
  }

  drawSign(n, m, open) {
    const g = this.signCv.getContext('2d'); g.clearRect(0, 0, 256, 128);
    g.fillStyle = open ? '#7fe08a' : '#fff6e8'; g.strokeStyle = open ? '#2a8a3c' : '#c98a4b'; g.lineWidth = 8;
    g.beginPath(); g.roundRect(8, 8, 240, 112, 40); g.fill(); g.stroke();
    if (open) { g.fillStyle = '#fff'; g.beginPath(); g.moveTo(70, 64); g.lineTo(110, 100); g.lineTo(190, 30); g.lineWidth = 18; g.strokeStyle = '#fff'; g.stroke(); }
    else {
      g.fillStyle = '#ffb11f'; g.strokeStyle = '#a65a00'; g.lineWidth = 5;
      g.beginPath(); g.moveTo(24, 64); g.quadraticCurveTo(50, 30, 82, 50); g.lineTo(104, 34); g.lineTo(100, 64); g.lineTo(104, 94); g.lineTo(82, 78); g.quadraticCurveTo(50, 98, 24, 64); g.fill(); g.stroke();
      g.fillStyle = '#4a2a3a'; g.font = 'bold 58px "Baloo 2", system-ui, sans-serif'; g.textAlign = 'left'; g.textBaseline = 'middle';
      g.fillText(`${Math.min(n, m)}/${m}`, 114, 68);
    }
    this.signTex.needsUpdate = true;
  }

  dispose() {
    for (const d of this.disposables) d.dispose();
  }
}

// ---------------------------------------------------------------- shared collision
/**
 * Moves body s ({x,y,z,vx,vy,vz,r,h,py}) out of solid colliders and onto the highest surface under it.
 * y is the body's bottom; py its bottom last frame. Returns the collider it stands on, FLOOR, or null.
 */
const FLOOR = { tag: 'floor', bounce: null, y1: 0 };
function collide(s, cols, stepUp, open, extra) {
  const list = extra ? cols.concat(extra) : cols;
  // sides first: anything whose top is above our step height (measured from where the feet were or are, whichever
  // is higher, so a long frame's fall below the floor does not make a small step a wall)
  const base = Math.max(s.y, Math.min(s.py, s.y + 0.5));
  for (let pass = 0; pass < 2; pass++) {
    for (const c of list) {
      if (c.gate && open) continue;
      if (c.y1 <= base + stepUp || c.y0 >= s.y + s.h) continue;
      if (c.cyl) {
        const dx = s.x - c.x, dz = s.z - c.z, d = Math.hypot(dx, dz), m = c.r + s.r;
        if (d < m && d > 1e-6) { const nx = dx / d, nz = dz / d; s.x = c.x + nx * m; s.z = c.z + nz * m; const vn = s.vx * nx + s.vz * nz; if (vn < 0) { s.vx -= vn * nx; s.vz -= vn * nz; } s.hit = c; }
        continue;
      }
      const cx = clamp(s.x, c.x0, c.x1), cz = clamp(s.z, c.z0, c.z1), dx = s.x - cx, dz = s.z - cz, d2 = dx * dx + dz * dz;
      if (d2 >= s.r * s.r) continue;
      s.hit = c;
      if (d2 > 1e-8) {
        const d = Math.sqrt(d2), nx = dx / d, nz = dz / d; s.x += nx * (s.r - d); s.z += nz * (s.r - d);
        const vn = s.vx * nx + s.vz * nz; if (vn < 0) { s.vx -= vn * nx; s.vz -= vn * nz; }
      } else {
        const l = s.x - c.x0, r = c.x1 - s.x, b = s.z - c.z0, f = c.z1 - s.z, m = Math.min(l, r, b, f);
        if (m === l) { s.x = c.x0 - s.r; s.vx = Math.min(0, s.vx); } else if (m === r) { s.x = c.x1 + s.r; s.vx = Math.max(0, s.vx); }
        else if (m === b) { s.z = c.z0 - s.r; s.vz = Math.min(0, s.vz); } else { s.z = c.z1 + s.r; s.vz = Math.max(0, s.vz); }
      }
    }
  }
  // then the surface under us: highest top we passed through this frame
  let best = FLOOR, top = 0;
  const reach = Math.max(s.py, s.y) + stepUp, foot = s.r * 0.55;
  for (const c of list) {
    if (c.gate && open) continue;
    if (c.y1 > reach || c.y1 <= top) continue;
    const over = c.cyl ? Math.hypot(s.x - c.x, s.z - c.z) < c.r + foot * 0.5 : s.x > c.x0 - foot && s.x < c.x1 + foot && s.z > c.z0 - foot && s.z < c.z1 + foot;
    if (over) { best = c; top = c.y1; }
  }
  s.support = top;
  if (s.y <= top + 0.001 && s.vy <= 0.001) { s.y = top; return best; }
  if (s.y < top) { s.y = top; return best; } // stepped up a small ledge
  return null;
}

// ---------------------------------------------------------------- PhysicsProps
const PROP_KINDS = {
  yarn: { r: 0.5, hh: 0.5, mass: 1, rest: 0.25, roll: true, sound: 'soft' },
  beach: { r: 0.62, hh: 0.62, mass: 0.45, rest: 0.72, roll: true, sound: 'boing' },
  block: { r: 0.38, hh: 0.38, mass: 0.7, rest: 0.25, roll: false, sound: 'wood' },
  cup: { r: 0.26, hh: 0.34, mass: 0.3, rest: 0.2, roll: false, sound: 'paper' },
  pencil: { r: 0.16, hh: 0.13, mass: 0.4, rest: 0.3, roll: true, sound: 'wood', pencil: true },
};
const YARN_COLORS = ['#ff6fa8', '#6ac8ff', '#ffd23f', '#9b7bff', '#7fe08a', '#ff9f43'];

/** Light toy physics: gravity, surfaces, pushes, stacks that sleep until disturbed. */
class PhysicsProps {
  constructor(scene, world, cfg) {
    this.scene = scene; this.world = world; this.cfg = cfg; this.list = []; this.disposables = [];
    this.tmp = { x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, r: 0, h: 0, py: 0 };
    this.q = new THREE.Quaternion(); this.v3 = new THREE.Vector3(); this.up = new THREE.Vector3(0, 1, 0);
    this.events = [];
    this.makeAssets();
  }
  makeAssets() {
    const D = this.disposables, A = this.A = {};
    const yarnTex = (col) => canvasTex(256, 128, (g, w, h) => {
      g.fillStyle = col; g.fillRect(0, 0, w, h);
      g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 4;
      for (let i = 0; i < 26; i++) { g.beginPath(); g.moveTo(Math.random() * w, 0); g.bezierCurveTo(Math.random() * w, h * 0.3, Math.random() * w, h * 0.7, Math.random() * w, h); g.stroke(); }
      g.strokeStyle = 'rgba(0,0,0,.14)'; for (let i = 0; i < 14; i++) { g.beginPath(); g.moveTo(0, Math.random() * h); g.lineTo(w, Math.random() * h); g.stroke(); }
    });
    A.yarnMats = YARN_COLORS.map((c) => { const t = yarnTex(c); D.push(t); const m = new THREE.MeshStandardMaterial({ map: t, roughness: 0.95 }); D.push(m); return m; });
    A.sphere = new THREE.SphereGeometry(1, 24, 16); D.push(A.sphere);
    const beachTex = canvasTex(256, 128, (g, w, h) => { const c = ['#ff5d6c', '#ffffff', '#ffd23f', '#ffffff', '#3bb6ff', '#ffffff']; for (let i = 0; i < 6; i++) { g.fillStyle = c[i]; g.fillRect(i * w / 6, 0, w / 6 + 1, h); } g.fillStyle = '#fff'; g.fillRect(0, 0, w, 10); g.fillRect(0, h - 10, w, 10); });
    D.push(beachTex);
    A.beachMat = new THREE.MeshStandardMaterial({ map: beachTex, roughness: 0.35 }); D.push(A.beachMat);
    A.box = new THREE.BoxGeometry(1, 1, 1); D.push(A.box);
    const bc = ['#ff6f91', '#6ac8ff', '#ffd23f', '#7fe08a', '#b28dff', '#ff9f43'], letters = 'ABCDEF';
    A.blockMats = bc.map((c, i) => { const t = canvasTex(128, 128, (g, w) => { g.fillStyle = c; g.fillRect(0, 0, w, w); g.fillStyle = '#fff'; g.beginPath(); g.roundRect(14, 14, 100, 100, 18); g.fill(); g.fillStyle = c; g.font = 'bold 80px "Baloo 2", system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(letters[i], 64, 70); }); D.push(t); const m = new THREE.MeshStandardMaterial({ map: t, roughness: 0.5 }); D.push(m); return m; });
    A.cupGeo = new THREE.CylinderGeometry(0.28, 0.2, 0.68, 18, 1, true); D.push(A.cupGeo);
    A.cupBot = new THREE.CircleGeometry(0.2, 18); D.push(A.cupBot);
    const cupTex = canvasTex(128, 64, (g, w, h) => { g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h); g.fillStyle = '#ff9ec4'; for (let i = 0; i < 8; i++) g.fillRect(i * 16, 0, 7, h); g.fillStyle = '#ffe27a'; g.fillRect(0, h - 10, w, 6); });
    D.push(cupTex);
    A.cupMat = new THREE.MeshStandardMaterial({ map: cupTex, roughness: 0.6, side: THREE.DoubleSide }); D.push(A.cupMat);
    A.pencilGeo = new THREE.CylinderGeometry(0.13, 0.13, 1.3, 6); D.push(A.pencilGeo);
    A.tipGeo = new THREE.ConeGeometry(0.13, 0.28, 6); D.push(A.tipGeo);
    A.pencilMats = ['#ffd23f', '#ff6f91', '#6ac8ff', '#7fe08a'].map((c) => { const m = new THREE.MeshStandardMaterial({ color: c, roughness: 0.5, flatShading: true }); D.push(m); return m; });
    A.woodMat = new THREE.MeshStandardMaterial({ color: 0xf2c58a, roughness: 0.6 }); D.push(A.woodMat);
  }
  add(kind, x, y, z, o) {
    const k = PROP_KINDS[kind], A = this.A, opt = o || {};
    let mesh;
    if (kind === 'yarn') { mesh = new THREE.Mesh(A.sphere, A.yarnMats[opt.color || 0]); mesh.scale.setScalar(k.r); }
    else if (kind === 'beach') { mesh = new THREE.Mesh(A.sphere, A.beachMat); mesh.scale.setScalar(k.r); }
    else if (kind === 'block') { mesh = new THREE.Mesh(A.box, A.blockMats[(opt.color || 0) % 6]); mesh.scale.setScalar(k.r * 2); }
    else if (kind === 'cup') { mesh = new THREE.Group(); const w = new THREE.Mesh(A.cupGeo, A.cupMat); const b = new THREE.Mesh(A.cupBot, A.cupMat); b.rotation.x = -Math.PI / 2; b.position.y = -0.34; mesh.add(w, b); }
    else { mesh = new THREE.Group(); const p = new THREE.Mesh(A.pencilGeo, A.pencilMats[(opt.color || 0) % 4]); p.rotation.z = Math.PI / 2; const t = new THREE.Mesh(A.tipGeo, A.woodMat); t.rotation.z = -Math.PI / 2; t.position.x = 0.79; mesh.add(p, t); }
    mesh.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
    this.scene.add(mesh);
    const yaw = opt.yaw != null ? opt.yaw : rand(0, TAU);
    const p = {
      kind, k, mesh, x, y, z, vx: 0, vy: 0, vz: 0, r: k.r, h: k.hh * 2, py: y,
      asleep: true, sleepT: 0, restY: y, home: { x, y, z, yaw }, yaw, q: new THREE.Quaternion().setFromAxisAngle(this.up, yaw),
      av: new THREE.Vector3(), roll: 0, support: null, grounded: true, floorT: 0, cd: 0, wig: 0, color: opt.color || 0, scored: false, id: this.list.length,
    };
    p.mesh.quaternion.copy(p.q);
    this.list.push(p);
    this.place(p);
    return p;
  }
  place(p) { p.mesh.position.set(p.x, p.y + p.k.hh, p.z); }
  /** Solid boxes for sleeping props, so stacks stay stacked and fallen toys can be stood on by other toys. */
  sleepers(except) {
    const out = [];
    for (const o of this.list) if (o.asleep && o !== except) { const f = o.r * (o.k.roll ? 0.7 : 0.95); out.push({ x0: o.x - f, x1: o.x + f, z0: o.z - f, z1: o.z + f, y0: o.y, y1: o.y + o.h, prop: o }); }
    return out;
  }
  wake(p) {
    if (!p.asleep) return;
    p.asleep = false; p.sleepT = 0;
    for (const o of this.list) if (o.asleep && o.support === p) this.wake(o);
  }
  impulse(p, vx, vy, vz) { this.wake(p); const m = Math.sqrt(p.k.mass); p.vx += vx / m; p.vy += vy / m; p.vz += vz / m; if (!p.k.roll) p.av.set(rand(-1, 1), rand(-1, 1), rand(-1, 1)).multiplyScalar(6 + Math.hypot(vx, vz)); }
  update(dt, catPos, zoneOpen) {
    const C = this.cfg.props, s = this.tmp, cols = this.world.colliders;
    for (const p of this.list) {
      p.cd = Math.max(0, p.cd - dt); p.wig = Math.max(0, p.wig - dt);
      if (p.asleep) {
        // a sleeper whose support went away falls
        if (p.support && !p.support.asleep && Math.hypot(p.support.x - p.x, p.support.z - p.z) > 0.2) this.wake(p);
        if (!p.asleep) continue;
        p.floorT = p.y < 0.05 ? p.floorT + dt : 0;
        continue;
      }
      p.py = p.y;
      p.vy -= C.gravity * dt;
      Object.assign(s, { x: p.x + p.vx * dt, y: p.y + p.vy * dt, z: p.z + p.vz * dt, vx: p.vx, vy: p.vy, vz: p.vz, r: p.r * (p.k.pencil ? 2.5 : 1), h: p.h, py: p.py, hit: null });
      const landVy = p.vy;
      const g = collide(s, cols, 0.12, zoneOpen, this.sleepers(p));
      p.x = s.x; p.y = s.y; p.z = s.z; p.vx = s.vx; p.vz = s.vz;
      if (g) {
        if (!p.grounded && landVy < -2.2) {
          p.vy = -landVy * p.k.rest;
          this.events.push({ type: 'land', p, speed: -landVy });
          if (p.vy < 1.2) p.vy = 0;
        } else p.vy = 0;
        p.grounded = p.vy === 0;
        p.support = g.prop || null;
        const fr = Math.exp(-(p.k.roll ? C.rollFriction : C.slideFriction) * dt);
        p.vx *= fr; p.vz *= fr;
        if (g.bounce && landVy < -3) { p.vy = Math.max(p.vy, 6); p.grounded = false; }
      } else p.grounded = false;
      if (s.hit && s.hit.tag === 'plant') this.events.push({ type: 'plant', c: s.hit });
      // spin: balls roll with travel, blocks tumble in the air and settle flat
      const sp = Math.hypot(p.vx, p.vz);
      if (p.k.pencil) { p.roll += (Math.cos(p.yaw) * p.vz - Math.sin(p.yaw) * p.vx) * dt / 0.13; p.q.setFromAxisAngle(this.up, p.yaw); this.v3.set(1, 0, 0); p.q.multiply(new THREE.Quaternion().setFromAxisAngle(this.v3, p.roll)); }
      else if (p.k.roll) { if (sp > 0.01) { this.v3.set(p.vz, 0, -p.vx).normalize(); this.q.setFromAxisAngle(this.v3, sp * dt / p.r); p.q.premultiply(this.q); } }
      else if (!p.grounded) { const a = p.av.length(); if (a > 0.01) { this.v3.copy(p.av).divideScalar(a); this.q.setFromAxisAngle(this.v3, a * dt); p.q.premultiply(this.q); } }
      else { p.av.multiplyScalar(0.8); const e = new THREE.Euler().setFromQuaternion(p.q, 'YXZ'); this.q.setFromAxisAngle(this.up, e.y); p.q.slerp(this.q, damp(10, dt)); }
      // sleep when still
      if (p.grounded && sp < C.sleepSpeed) { p.sleepT += dt; if (p.sleepT > C.sleepTime) this.sleep(p); } else p.sleepT = 0;
      if (p.y < -3 || Math.abs(p.x) > 16 || p.z > 13 || p.z < -36) this.sendHome(p, false);
    }
    // toy against toy
    const L = this.list;
    for (let i = 0; i < L.length; i++) for (let j = i + 1; j < L.length; j++) {
      const a = L[i], b = L[j];
      if (a.asleep && b.asleep) continue;
      const ay = a.y + a.k.hh, by = b.y + b.k.hh, dx = b.x - a.x, dy = by - ay, dz = b.z - a.z, d = Math.hypot(dx, dy, dz), m = a.r + b.r;
      if (d >= m || d < 1e-5) continue;
      const nx = dx / d, ny = dy / d, nz = dz / d, rv = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny + (b.vz - a.vz) * nz;
      if (a.asleep || b.asleep) {
        const mover = a.asleep ? b : a, still = a.asleep ? a : b, sg = mover === b ? 1 : -1;
        if (Math.abs(rv) > 1.6) this.wake(still);
        else { mover.x += nx * sg * (m - d); mover.z += nz * sg * (m - d); if (rv < 0) { mover.vx -= sg * nx * rv * 1.2; mover.vz -= sg * nz * rv * 1.2; } continue; }
      }
      const ma = a.k.mass, mb = b.k.mass, tot = ma + mb, ov = m - d;
      a.x -= nx * ov * mb / tot; a.z -= nz * ov * mb / tot; b.x += nx * ov * ma / tot; b.z += nz * ov * ma / tot;
      if (rv < 0) {
        const jn = -(1.3) * rv / (1 / ma + 1 / mb);
        a.vx -= jn * nx / ma; a.vy -= jn * ny / ma; a.vz -= jn * nz / ma; b.vx += jn * nx / mb; b.vy += jn * ny / mb; b.vz += jn * nz / mb;
        if (-rv > 2) this.events.push({ type: 'clack', p: b, speed: -rv });
      }
    }
    for (const p of this.list) {
      if (p.asleep && p.wig <= 0) continue;
      this.place(p);
      p.mesh.quaternion.copy(p.q);
      if (p.wig > 0) { const w = Math.sin(p.wig * 40) * p.wig * 0.5; p.mesh.rotation.z += w; p.mesh.position.y += Math.abs(w) * 0.3; }
    }
  }
  sleep(p) {
    p.asleep = true; p.vx = p.vy = p.vz = 0; p.av.set(0, 0, 0);
    const drop = p.restY - p.y;
    if (drop > this.cfg.props.knockDrop) this.events.push({ type: 'knock', p, drop });
    p.restY = p.y;
    this.place(p); p.mesh.quaternion.copy(p.q);
  }
  /** Back to the toy's own spot, dropped in gently so stacks rebuild themselves. */
  sendHome(p, poof) {
    const h = p.home;
    if (poof) this.events.push({ type: 'poof', x: p.x, y: p.y, z: p.z });
    p.x = h.x; p.y = h.y + 0.25; p.z = h.z; p.vx = p.vy = p.vz = 0; p.yaw = h.yaw; p.q.setFromAxisAngle(this.up, h.yaw); p.roll = 0;
    p.restY = h.y; p.asleep = false; p.grounded = false; p.sleepT = 0; p.floorT = 0; p.scored = false; p.support = null;
    this.place(p);
    if (poof) this.events.push({ type: 'poof', x: h.x, y: h.y, z: h.z });
  }
  dispose() { for (const p of this.list) this.scene.remove(p.mesh); for (const d of this.disposables) d.dispose(); }
}

// ---------------------------------------------------------------- CatController
/** The kitten: procedural rig, controls with coyote time and jump buffer, pounce with soft aim. */
class CatController {
  constructor(scene, cfg) {
    this.scene = scene; this.cfg = cfg; this.C = cfg.cat; this.disposables = [];
    this.x = 0; this.y = 0; this.z = 4; this.vx = 0; this.vy = 0; this.vz = 0; this.py = 0;
    this.yaw = Math.PI; this.grounded = true; this.lastGround = 0; this.jumpAt = -9; this.peak = 0; this.ground = FLOOR;
    this.pounce = null; this.t = 0; this.meowT = 0; this.blinkT = 2; this.earT = 1.5; this.squash = 0; this.squashV = 0;
    this.phase = 0; this.run = 0; this.hatId = null; this.skinId = null; this.previewT = 0;
    this.build();
  }
  m(o) { const m = new THREE.MeshStandardMaterial(Object.assign({ roughness: 0.55 }, o)); this.disposables.push(m); return m; }
  build() {
    const sph = new THREE.SphereGeometry(1, 22, 16), cone = new THREE.ConeGeometry(1, 1, 4), cyl = new THREE.CylinderGeometry(1, 1, 1, 10);
    this.disposables.push(sph, cone, cyl);
    this.mats = { body: this.m({ color: 0xffffff }), belly: this.m({ color: 0xfff3e0 }), point: this.m({ color: 0xf4a24c }), muzzle: this.m({ color: 0xfff3e0 }),
      pink: this.m({ color: 0xff8fb3, roughness: 0.4 }), eye: this.m({ color: 0x241826, roughness: 0.08, metalness: 0.1 }), white: new THREE.MeshBasicMaterial({ color: 0xffffff }), mouth: this.m({ color: 0xb8324f, roughness: 0.6 }), rim: this.m({ color: 0xfff6e6, roughness: 0.4 }) };
    this.disposables.push(this.mats.white);
    const M = this.mats, mesh = (g, m, sx, sy, sz, x, y, z, parent) => { const o = new THREE.Mesh(g, m); o.scale.set(sx, sy, sz); o.position.set(x, y, z); o.castShadow = true; (parent || this.root).add(o); return o; };
    this.root = new THREE.Group(); this.scene.add(this.root);
    this.body = new THREE.Group(); this.body.position.y = 0.48; this.root.add(this.body);
    this.torso = mesh(sph, M.body, 0.36, 0.33, 0.5, 0, 0, 0, this.body);
    mesh(sph, M.belly, 0.27, 0.24, 0.38, 0, -0.1, 0.06, this.body);
    // head
    this.head = new THREE.Group(); this.head.position.set(0, 0.42, 0.4); this.body.add(this.head);
    this.skull = mesh(sph, M.body, 0.36, 0.32, 0.33, 0, 0, 0, this.head);
    mesh(sph, M.muzzle, 0.11, 0.085, 0.09, -0.065, -0.1, 0.27, this.head); mesh(sph, M.muzzle, 0.11, 0.085, 0.09, 0.065, -0.1, 0.27, this.head);
    this.ears = [];
    for (const sx of [-1, 1]) {
      const e = new THREE.Group(); e.position.set(sx * 0.19, 0.24, -0.02); e.rotation.z = -sx * 0.32; this.head.add(e);
      const outer = mesh(cone, M.point, 0.13, 0.27, 0.07, 0, 0.11, 0, e); outer.rotation.y = Math.PI / 4;
      const inner = mesh(cone, M.pink, 0.075, 0.17, 0.03, 0, 0.09, 0.035, e); inner.rotation.y = Math.PI / 4;
      this.ears.push(e);
    }
    this.eyes = [];
    for (const sx of [-1, 1]) {
      const e = new THREE.Group(); e.position.set(sx * 0.135, 0.03, 0.26); this.head.add(e);
      mesh(sph, M.rim, 0.1, 0.116, 0.05, 0, 0, -0.012, e);
      mesh(sph, M.eye, 0.085, 0.1, 0.06, 0, 0, 0, e);
      mesh(sph, M.white, 0.03, 0.03, 0.02, sx * 0.025 + 0.012, 0.035, 0.045, e);
      mesh(sph, M.white, 0.013, 0.013, 0.01, -sx * 0.02, -0.03, 0.05, e);
      this.eyes.push(e);
    }
    mesh(sph, M.pink, 0.045, 0.03, 0.03, 0, -0.045, 0.33, this.head);
    this.mouth = mesh(sph, M.mouth, 0.05, 0.01, 0.03, 0, -0.15, 0.29, this.head);
    // whiskers
    const wp = [];
    for (const sx of [-1, 1]) for (let i = 0; i < 3; i++) { wp.push(sx * 0.1, -0.08, 0.3, sx * 0.42, -0.04 + (i - 1) * 0.06, 0.26); }
    const wg = new THREE.BufferGeometry(); wg.setAttribute('position', new THREE.Float32BufferAttribute(wp, 3)); this.disposables.push(wg);
    const wm = new THREE.LineBasicMaterial({ color: 0xffffff }); this.disposables.push(wm);
    this.head.add(new THREE.LineSegments(wg, wm));
    // legs: hip pivots
    this.legs = [];
    for (const [sx, sz] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) {
      const hip = new THREE.Group(); hip.position.set(sx * 0.17, 0.42, sz * 0.27); this.root.add(hip);
      mesh(cyl, M.body, 0.075, 0.3, 0.075, 0, -0.17, 0, hip);
      mesh(sph, M.point, 0.1, 0.075, 0.12, 0, -0.34, 0.02, hip);
      this.legs.push({ hip, front: sz > 0, side: sx });
    }
    // tail: a chain of segments
    this.tail = [];
    let parent = new THREE.Group(); parent.position.set(0, 0.06, -0.46); this.body.add(parent);
    for (let i = 0; i < 6; i++) {
      const seg = new THREE.Group(); seg.position.set(0, i ? 0.02 : 0, i ? -0.14 : 0); parent.add(seg);
      const r = 0.085 - i * 0.006;
      mesh(sph, i >= 4 ? M.point : M.body, r, r, 0.15, 0, 0, -0.07, seg);
      this.tail.push(seg); parent = seg;
    }
    this.hatAnchor = new THREE.Group(); this.hatAnchor.position.set(0, 0.29, -0.02); this.head.add(this.hatAnchor);
    this.backAnchor = new THREE.Group(); this.backAnchor.position.set(0, 0.32, -0.08); this.body.add(this.backAnchor);
    this.hatCache = {}; this.texCache = {};
  }
  /** Fur pattern on a sphere: tabby stripes, calico patches or a starry galaxy. */
  skinTex(s) {
    if (this.texCache[s.id] !== undefined) return this.texCache[s.id];
    let t = null;
    if (s.pattern !== 'plain') {
      t = canvasTex(256, 128, (g, w, h) => {
        g.fillStyle = s.base; g.fillRect(0, 0, w, h);
        if (s.pattern === 'tabby') { g.fillStyle = s.stripe; for (let i = 0; i < 10; i++) { const x = i * w / 10; g.beginPath(); g.moveTo(x, 0); g.quadraticCurveTo(x + 10, h * 0.35, x - 2, h * 0.62); g.lineTo(x + 7, h * 0.62); g.quadraticCurveTo(x + 18, h * 0.3, x + 9, 0); g.fill(); } }
        else if (s.pattern === 'patches') { for (let i = 0; i < 9; i++) { g.fillStyle = i % 2 ? s.stripe : s.point; g.beginPath(); g.ellipse(Math.random() * w, Math.random() * h * 0.7, rand(14, 30), rand(10, 22), Math.random(), 0, TAU); g.fill(); } }
        else { const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, s.base); gr.addColorStop(0.5, s.stripe); gr.addColorStop(1, s.base); g.fillStyle = gr; g.fillRect(0, 0, w, h); for (let i = 0; i < 70; i++) { g.fillStyle = i % 5 ? '#ffffff' : '#ffe27a'; g.beginPath(); g.arc(Math.random() * w, Math.random() * h, rand(0.6, 2.2), 0, TAU); g.fill(); } }
      });
      this.disposables.push(t);
    }
    this.texCache[s.id] = t;
    return t;
  }
  setSkin(s) {
    if (this.skinId === s.id) return;
    this.skinId = s.id;
    const t = this.skinTex(s), M = this.mats;
    M.body.map = t; M.body.color.set(t ? '#ffffff' : s.base); M.body.needsUpdate = true;
    M.belly.color.set(s.belly); M.point.color.set(s.point); M.muzzle.color.set(s.muzzle || s.belly);
    M.body.emissive.set(s.pattern === 'galaxy' ? '#2a1a5a' : '#000000');
  }
  /** Hats are made the first time they are worn and kept. */
  setHat(id) {
    if (this.hatId === id) return;
    this.hatId = id;
    for (const k in this.hatCache) this.hatCache[k].visible = false;
    if (!id || id === 'none') return;
    if (!this.hatCache[id]) this.hatCache[id] = this.makeHat(id);
    this.hatCache[id].visible = true;
  }
  makeHat(id) {
    const g = new THREE.Group(), add = (geo, col, sx, sy, sz, x, y, z, rx, ry, rz, extra) => { const m = new THREE.Mesh(geo, this.m(Object.assign({ color: col }, extra))); m.scale.set(sx, sy, sz); m.position.set(x, y, z); m.rotation.set(rx || 0, ry || 0, rz || 0); m.castShadow = true; g.add(m); this.disposables.push(geo); return m; };
    if (id === 'wizard') {
      add(new THREE.CylinderGeometry(1, 1, 1, 24), 0x5b3fd8, 0.36, 0.03, 0.36, 0, 0, 0);
      add(new THREE.ConeGeometry(1, 1, 20), 0x7a5cff, 0.22, 0.55, 0.22, 0, 0.28, 0, -0.15);
      add(new THREE.OctahedronGeometry(1), 0xffe27a, 0.05, 0.05, 0.05, 0, 0.32, 0.12, 0, 0, 0, { emissive: 0x806000 });
      add(new THREE.OctahedronGeometry(1), 0xffe27a, 0.035, 0.035, 0.035, 0.08, 0.12, 0.16, 0, 0, 0, { emissive: 0x806000 });
      this.hatAnchor.add(g);
    } else if (id === 'crown') {
      add(new THREE.CylinderGeometry(1, 1, 1, 16, 1, true), 0xffc93a, 0.2, 0.12, 0.2, 0, 0.06, 0, 0, 0, 0, { metalness: 0.6, roughness: 0.25, side: THREE.DoubleSide });
      const sp = new THREE.ConeGeometry(1, 1, 4);
      for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; add(sp, 0xffc93a, 0.045, 0.1, 0.045, Math.cos(a) * 0.19, 0.16, Math.sin(a) * 0.19, 0, 0, 0, { metalness: 0.6, roughness: 0.25 }); }
      add(new THREE.SphereGeometry(1, 10, 8), 0xff3d71, 0.04, 0.04, 0.03, 0, 0.07, 0.2, 0, 0, 0, { emissive: 0x500010 });
      this.hatAnchor.add(g);
    } else if (id === 'pirate') {
      const brim = add(new THREE.SphereGeometry(1, 20, 10, 0, TAU, 0, Math.PI / 2), 0x2e2b36, 0.36, 0.2, 0.26, 0, 0.02, 0);
      brim.scale.y = 0.24;
      add(new THREE.CylinderGeometry(1, 1, 1, 20), 0x2e2b36, 0.4, 0.025, 0.24, 0, 0.01, 0, 0, 0, 0);
      add(new THREE.SphereGeometry(1, 10, 8), 0xffffff, 0.05, 0.05, 0.02, 0, 0.1, 0.24);
      add(new THREE.BoxGeometry(1, 1, 1), 0xff5d6c, 0.4, 0.03, 0.26, 0, 0.045, 0);
      this.hatAnchor.add(g);
    } else if (id === 'propeller') {
      add(new THREE.SphereGeometry(1, 20, 10, 0, TAU, 0, Math.PI / 2), 0xff5d6c, 0.24, 0.18, 0.24, 0, 0, 0);
      add(new THREE.CylinderGeometry(1, 1, 1, 12), 0xffd23f, 0.25, 0.02, 0.3, 0, 0.01, 0.1);
      add(new THREE.CylinderGeometry(1, 1, 1, 6), 0x555555, 0.015, 0.14, 0.015, 0, 0.24, 0);
      const prop = new THREE.Group(); prop.position.y = 0.31; g.add(prop);
      const blade = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), this.m({ color: 0x3bb6ff })); blade.scale.set(0.5, 0.015, 0.07); prop.add(blade); this.disposables.push(blade.geometry);
      const b2 = blade.clone(); b2.rotation.y = Math.PI / 2; b2.material = this.m({ color: 0x7fe08a }); prop.add(b2);
      g.userData.spin = prop;
      this.hatAnchor.add(g);
    } else if (id === 'wings') {
      const shape = new THREE.Shape(); shape.moveTo(0, 0); shape.bezierCurveTo(0.1, 0.5, 0.6, 0.6, 0.55, 0.2); shape.bezierCurveTo(0.6, -0.1, 0.3, -0.35, 0, 0);
      const geo = new THREE.ShapeGeometry(shape, 10); this.disposables.push(geo);
      const mat = this.m({ color: 0x7fd8ff, side: THREE.DoubleSide, transparent: true, opacity: 0.9, emissive: 0x1a4060 });
      const mat2 = this.m({ color: 0xff9ef0, side: THREE.DoubleSide, transparent: true, opacity: 0.9, emissive: 0x401040 });
      g.userData.wings = [];
      for (const sx of [-1, 1]) {
        const piv = new THREE.Group(); g.add(piv);
        const w1 = new THREE.Mesh(geo, mat); w1.scale.set(sx * 0.9, 0.9, 1); w1.position.y = 0.02; piv.add(w1);
        const w2 = new THREE.Mesh(geo, mat2); w2.scale.set(sx * 0.6, -0.6, 1); piv.add(w2);
        piv.rotation.x = -Math.PI / 2 + 0.3;
        g.userData.wings.push({ piv, sx });
      }
      this.backAnchor.add(g);
    }
    return g;
  }
  get pos() { return { x: this.x, y: this.y, z: this.z }; }
  /** Jump if allowed now or within the buffer; returns true when the kitten left the ground. */
  tryJump(now) {
    const C = this.C;
    if (now - this.jumpAt > C.buffer) return false;
    if (!(this.grounded || now - this.lastGround < C.coyote)) return false;
    this.vy = C.jump; this.grounded = false; this.lastGround = -9; this.jumpAt = -9; this.squashV = 6;
    return true;
  }
  /** Leap to a point, arriving in a short arc. */
  pounceTo(tx, ty, tz, now) {
    if (!(this.grounded || now - this.lastGround < this.C.coyote)) return false;
    const dx = tx - this.x, dz = tz - this.z, d = Math.hypot(dx, dz), g = this.C.gravity;
    const T = clamp(d / 7.5, 0.32, 0.62), dy = ty - this.y;
    this.vy = clamp((dy + 0.5 * g * T * T) / T, 4.5, 12.5);
    const hv = Math.min(d / T, 10.5);
    this.vx = d > 0.01 ? dx / d * hv : 0; this.vz = d > 0.01 ? dz / d * hv : 0;
    this.pounce = { tx, ty, tz, t: T + 0.15 };
    this.yaw = Math.atan2(dx, dz);
    this.grounded = false; this.lastGround = -9; this.squashV = 7;
    return true;
  }
  /** Movement and collision; returns landing info for effects. */
  step(dt, ix, iz, cols, open, now) {
    const C = this.C;
    this.py = this.y;
    const want = Math.hypot(ix, iz);
    if (this.pounce) {
      this.pounce.t -= dt;
      if (this.pounce.t <= 0) this.pounce = null;
    } else {
      const ctl = this.grounded ? 1 : C.airControl, a = C.accel * ctl * dt;
      const tvx = ix * C.speed, tvz = iz * C.speed;
      this.vx += clamp(tvx - this.vx, -a, a); this.vz += clamp(tvz - this.vz, -a, a);
      if (want > 0.1) this.yaw = this.turn(this.yaw, Math.atan2(ix, iz), dt * 12);
    }
    if (this.pounce) this.yaw = this.turn(this.yaw, Math.atan2(this.vx, this.vz), dt * 14);
    this.vy -= C.gravity * dt;
    const s = { x: this.x + this.vx * dt, y: this.y + this.vy * dt, z: this.z + this.vz * dt, vx: this.vx, vy: this.vy, vz: this.vz, r: C.radius, h: C.height, py: this.py, hit: null };
    const wasGround = this.grounded, landVy = this.vy;
    const g = collide(s, cols, this.grounded ? C.stepUp : 0.18, open);
    this.x = s.x; this.y = s.y; this.z = s.z; this.vx = s.vx; this.vz = s.vz;
    let ev = null;
    if (g) {
      this.vy = 0; this.grounded = true; this.lastGround = now; this.ground = g;
      if (!wasGround) {
        const fall = this.peak - this.y;
        ev = { type: 'land', fall, speed: -landVy, g };
        this.squashV = -clamp(-landVy * 0.6, 2, 9);
        this.pounce = null;
        const B = this.cfg.bounce;
        if (g.bounce && -landVy > 2.5) { this.vy = B[g.bounce]; this.grounded = false; ev.bounce = g.bounce; this.squashV = 8; }
        else if (g === FLOOR && fall > C.softFall) { this.vy = C.softBounce; this.grounded = false; ev.soft = true; }
      }
    } else {
      if (wasGround) this.peak = this.y;
      this.grounded = false;
    }
    if (!this.grounded) this.peak = Math.max(this.peak, this.y); else this.peak = this.y;
    if (this.grounded && !this.pounce) { const f = want > 0.1 ? 1 : Math.exp(-14 * dt); this.vx *= f; this.vz *= f; }
    if (!(this.y > -4) || !isFinite(this.x) || !isFinite(this.z)) { this.x = 0; this.y = 0.5; this.z = 4; this.vx = this.vy = this.vz = 0; }
    this.hit = s.hit;
    return ev;
  }
  turn(a, b, k) { let d = ((b - a + Math.PI) % TAU + TAU) % TAU - Math.PI; return a + d * Math.min(1, k); }
  meow() { this.meowT = 0.55; }
  /** Procedural animation: breathing, ears, blinking, run cycle, squash & stretch, tail sway, meow. */
  animate(dt) {
    this.t += dt;
    const t = this.t, sp = Math.hypot(this.vx, this.vz);
    this.run = lerp(this.run, this.grounded ? clamp(sp / this.C.speed, 0, 1) : 0, damp(10, dt));
    const run = this.run;
    this.phase += dt * (4 + sp * 2.2);
    // squash & stretch spring
    this.squashV += (-180 * this.squash - 16 * this.squashV) * dt; this.squash += this.squashV * dt;
    const k = clamp(this.squash * 0.09, -0.32, 0.32), br = Math.sin(t * 2.4) * 0.025 * (1 - run);
    this.root.position.set(this.x, this.y, this.z);
    this.root.rotation.y = this.yaw;
    this.root.scale.set(1 - k * 0.5, 1 + k + br, 1 - k * 0.5);
    this.body.rotation.x = run * 0.14 + (this.grounded ? 0 : clamp(-this.vy * 0.04, -0.35, 0.35));
    this.body.position.y = 0.48 + Math.abs(Math.sin(this.phase)) * 0.07 * run;
    // legs
    const air = this.grounded ? 0 : 1;
    for (const L of this.legs) {
      const ph = this.phase + (L.front === (L.side > 0) ? 0 : Math.PI);
      const tuck = L.front ? -0.9 : 0.8;
      L.hip.rotation.x = lerp(Math.sin(ph) * 0.9 * run, tuck, air * 0.8);
    }
    // head: look a little, meow tilts it back and opens the mouth
    this.meowT = Math.max(0, this.meowT - dt);
    const mw = this.meowT > 0 ? Math.sin((1 - this.meowT / 0.55) * Math.PI) : 0;
    this.head.rotation.x = -mw * 0.55 + Math.sin(t * 0.7) * 0.05;
    this.head.rotation.y = Math.sin(t * 0.45) * 0.18 * (1 - run);
    this.mouth.scale.y = 0.01 + mw * 0.09;
    // blink
    this.blinkT -= dt;
    if (this.blinkT < 0) this.blinkT = rand(2, 5);
    const bl = this.blinkT < 0.12 ? 0.12 : 1;
    for (const e of this.eyes) e.scale.y = bl;
    // ear twitches
    this.earT -= dt;
    if (this.earT < 0) { this.earT = rand(1.5, 4); this.earFlick = 0.25; this.earSide = Math.random() < 0.5 ? 0 : 1; }
    this.earFlick = Math.max(0, (this.earFlick || 0) - dt);
    this.ears.forEach((e, i) => { e.rotation.x = (i === this.earSide && this.earFlick > 0 ? Math.sin(this.earFlick * 40) * 0.35 : 0) - mw * 0.3; });
    // tail: lazy figure-eight when idle, quick wave when running
    this.tail.forEach((s, i) => {
      s.rotation.x = (i === 0 ? -0.9 : 0.12) + Math.sin(t * 3.2 + i * 0.6) * 0.1 * (1 - run) - run * (i === 0 ? -0.4 : 0.02);
      s.rotation.y = Math.sin(t * 1.6 + i * 0.5) * 0.28 * (1 - run) + Math.sin(t * 10 + i * 0.8) * 0.22 * run;
    });
    // hats that move
    const h = this.hatCache[this.hatId];
    if (h && h.userData.spin) h.userData.spin.rotation.y += dt * (8 + sp * 3);
    if (h && h.userData.wings) for (const w of h.userData.wings) w.piv.rotation.y = w.sx * (0.4 + Math.sin(t * (air ? 18 : 5)) * (air ? 0.6 : 0.25));
  }
  dispose() { this.scene.remove(this.root); for (const d of this.disposables) d.dispose(); }
}

// ---------------------------------------------------------------- CameraRig
/** Damped third-person follow with drag orbit, gentle auto-align and height-aware pitch. */
class CameraRig {
  constructor(camera, cfg) {
    this.cam = camera; this.C = cfg.camera; this.yaw = 0; this.pitch = this.C.pitch; this.dist = this.C.dist;
    this.target = new THREE.Vector3(0, 1, 4); this.pos = new THREE.Vector3(0, 4, 12); this.trauma = 0; this.dragT = 9; this.t = 0;
    this.want = new THREE.Vector3();
  }
  drag(dx, dy) { this.yaw -= dx * this.C.dragSpeed; this.pitchOff = clamp((this.pitchOff || 0) + dy * this.C.dragSpeed * 0.6, -0.2, 0.45); this.dragT = 0; }
  shake(k) { this.trauma = Math.min(0.6, this.trauma + k); }
  update(dt, cat, moving, snap) {
    const C = this.C;
    this.t += dt; this.dragT += dt;
    if (moving && this.dragT > 1.5) { const behind = cat.yaw + Math.PI; let d = ((behind - this.yaw + Math.PI) % TAU + TAU) % TAU - Math.PI; if (Math.abs(d) < 2.2) this.yaw += d * damp(C.autoAlign, dt); }
    const high = clamp((cat.y - 1) / 4, 0, 1);
    const pitch = lerp(C.pitch, C.pitchHigh, high) + (this.pitchOff || 0), dist = lerp(C.dist, C.distHigh, high);
    this.target.x = lerp(this.target.x, cat.x, snap ? 1 : damp(10, dt));
    this.target.z = lerp(this.target.z, cat.z, snap ? 1 : damp(10, dt));
    this.target.y = lerp(this.target.y, cat.y + 1.0, snap ? 1 : damp(cat.grounded ? 5 : 2.2, dt));
    const w = this.want.set(this.target.x + Math.sin(this.yaw) * Math.cos(pitch) * dist, this.target.y + Math.sin(pitch) * dist, this.target.z + Math.cos(this.yaw) * Math.cos(pitch) * dist);
    // stay inside the space the kitten is in, under the ceiling
    if (cat.z > -12.2) { w.x = clamp(w.x, -11.6, 11.6); w.z = clamp(w.z, -11.6, 11.6); w.y = Math.min(w.y, 8.6); }
    else { w.x = clamp(w.x, -13.6, 13.6); w.z = clamp(w.z, -33.6, -12.7); }
    const hd = Math.hypot(w.x - this.target.x, w.z - this.target.z), want = Math.cos(pitch) * dist;
    if (hd < want) w.y = Math.min(cat.z > -12.2 ? 8.6 : 14, w.y + (want - hd) * 0.9);
    this.pos.lerp(w, snap ? 1 : damp(C.follow, dt));
    this.cam.position.copy(this.pos);
    this.trauma = Math.max(0, this.trauma - dt * 1.4);
    const s = this.trauma * this.trauma * 0.25;
    this.cam.position.x += (Math.sin(this.t * 37) + Math.sin(this.t * 23.3)) * s; this.cam.position.y += (Math.sin(this.t * 31.7) + Math.sin(this.t * 19.1)) * s;
    this.cam.lookAt(this.target);
  }
}

// ---------------------------------------------------------------- QuestManager
/** The diegetic activities: red dot, yarn basket, fish paths, butterflies, garden door. */
class QuestManager {
  constructor(scene, world, cfg) {
    this.scene = scene; this.world = world; this.cfg = cfg; this.disposables = []; this.fish = []; this.butterflies = [];
    this.laser = { on: false, t: cfg.laser.firstDelay, x: 0, y: 0, z: 0, from: null, to: null, mt: 0, darts: 0, life: 0 };
    const glowTex = canvasTex(64, 64, (g) => { const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.3, 'rgba(255,255,255,.5)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); });
    this.glowTex = glowTex; this.disposables.push(glowTex);
    this.buildLaser(); this.buildFish(); this.buildButterflies(); this.buildArrows();
  }
  sprite(color, s) { const m = new THREE.SpriteMaterial({ map: this.glowTex, color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }); this.disposables.push(m); const sp = new THREE.Sprite(m); sp.scale.setScalar(s); return sp; }
  buildLaser() {
    const g = new THREE.Group();
    const dotM = new THREE.MeshBasicMaterial({ color: 0xff1a3c }); this.disposables.push(dotM);
    const dg = new THREE.CircleGeometry(0.16, 20); this.disposables.push(dg);
    const dot = new THREE.Mesh(dg, dotM); dot.rotation.x = -Math.PI / 2; g.add(dot);
    const glow = this.sprite(0xff3355, 1.1); glow.position.y = 0.05; g.add(glow);
    this.laserGlow = glow; this.laserMesh = g; g.visible = false; this.scene.add(g);
  }
  buildFish() {
    const W = this.world, body = new THREE.SphereGeometry(1, 16, 12), tail = new THREE.ConeGeometry(1, 1, 3);
    this.disposables.push(body, tail);
    const gold = new THREE.MeshStandardMaterial({ color: 0xffb11f, emissive: 0x7a3d00, roughness: 0.3, metalness: 0.3 });
    const big = new THREE.MeshStandardMaterial({ color: 0xffe27a, emissive: 0x9a6a00, roughness: 0.2, metalness: 0.5 });
    this.disposables.push(gold, big);
    const spots = [
      [0.2, 0.6, 2.2, 'room', 1], [-2.6, 0.6, 5.4, 'room', 1], [-8.3, 1.9, -2, 'room', 1], [-10.1, 3.3, -2, 'room', 1], [-4, 2.2, -7.6, 'room', 1],
      [-1, 3.2, -10.9, 'room', 1], [1, 4.2, -10.9, 'room', 1], [3, 5.2, -10.9, 'room', 1], [5, 6.3, -10.9, 'room', 3], [7.5, 4.8, -5, 'room', 1],
      [-8, 1.9, -17, 'garden', 1], [-10.5, 2.9, -21.5, 'garden', 1], [-8.5, 3.9, -26, 'garden', 1], [-4.8, 4.9, -29.4, 'garden', 1],
      [0, 3.0, -22.5, 'garden', 1], [1.6, 1.5, -21.1, 'garden', 1], [0.8, 6.0, -31.2, 'garden', 3], [9.5, 0.7, -18, 'garden', 1],
    ];
    for (const [x, y, z, zone, v] of spots) {
      const g = new THREE.Group(); g.position.set(x, y, z);
      const s = v > 1 ? 1.5 : 1, mat = v > 1 ? big : gold;
      const b = new THREE.Mesh(body, mat); b.scale.set(0.3 * s, 0.2 * s, 0.11 * s); g.add(b);
      const tl = new THREE.Mesh(tail, mat); tl.scale.set(0.16 * s, 0.2 * s, 0.07 * s); tl.rotation.z = Math.PI / 2; tl.position.x = -0.36 * s; g.add(tl);
      const glow = this.sprite(v > 1 ? 0xffe27a : 0xffc85a, 1.3 * s); g.add(glow);
      g.traverse((m) => { if (m.isMesh) m.castShadow = true; });
      this.scene.add(g);
      this.fish.push({ g, x, y, z, zone, value: v, on: true, t: 0, ph: Math.random() * 6 });
    }
  }
  buildButterflies() {
    const shape = new THREE.Shape(); shape.moveTo(0, 0); shape.bezierCurveTo(0.05, 0.4, 0.5, 0.45, 0.45, 0.12); shape.bezierCurveTo(0.5, -0.15, 0.2, -0.3, 0, 0);
    const geo = new THREE.ShapeGeometry(shape, 8); this.disposables.push(geo);
    const cols = [0xff7aa8, 0x6ac8ff, 0xffd23f, 0xb28dff, 0xff9f43, 0x7fe08a];
    for (let i = 0; i < 6; i++) {
      const m = new THREE.MeshStandardMaterial({ color: cols[i], side: THREE.DoubleSide, emissive: cols[i], emissiveIntensity: 0.25, roughness: 0.5 }); this.disposables.push(m);
      const g = new THREE.Group(), wings = [];
      for (const sx of [-1, 1]) { const p = new THREE.Group(); const w = new THREE.Mesh(geo, m); w.scale.set(sx * 0.7, 0.7, 1); w.rotation.x = -Math.PI / 2; p.add(w); g.add(p); wings.push({ p, sx }); }
      this.scene.add(g);
      const cx = rand(-10, 10), cz = rand(-30, -15);
      this.butterflies.push({ g, wings, cx, cz, cy: rand(1.2, 2.8), ax: rand(1.5, 3.5), az: rand(1.5, 3.5), w: rand(0.3, 0.6), ph: Math.random() * TAU, away: 0, x: cx, y: 2, z: cz });
    }
  }
  buildArrows() {
    const geo = new THREE.ConeGeometry(0.32, 0.6, 4); this.disposables.push(geo);
    const m = new THREE.MeshStandardMaterial({ color: 0xffd23f, emissive: 0x806000, roughness: 0.4 }); this.disposables.push(m);
    this.basketArrow = new THREE.Mesh(geo, m); this.basketArrow.rotation.x = Math.PI; this.scene.add(this.basketArrow);
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.85, 1.05, 40), new THREE.MeshBasicMaterial({ color: 0xffe27a, transparent: true, opacity: 0.6, depthWrite: false }));
    ring.rotation.x = -Math.PI / 2; ring.position.copy(this.world.basketPos).setY(0.03); this.scene.add(ring); this.basketRing = ring; this.disposables.push(ring.geometry, ring.material);
    const pad = new THREE.Mesh(new THREE.RingGeometry(0.6, 1.25, 40), new THREE.MeshBasicMaterial({ color: 0xc49bff, transparent: true, opacity: 0.7, depthWrite: false }));
    pad.rotation.x = -Math.PI / 2; pad.position.copy(this.world.padPos).setY(0.03); this.scene.add(pad); this.padRing = pad; this.disposables.push(pad.geometry, pad.material);
    const gm = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffc93a, emissiveIntensity: 0.6, roughness: 0.4 }); this.disposables.push(gm);
    const gg = new THREE.ConeGeometry(0.18, 0.42, 4); this.disposables.push(gg);
    this.guide = new THREE.Mesh(gg, gm); this.guide.visible = false; this.scene.add(this.guide);
  }
  spotsNear(zone, x, z, minD, maxD, avoid) {
    const S = this.world.laserSpots.filter((s) => s.zone === zone);
    const ok = S.filter((s) => { const d = Math.hypot(s.x - x, s.z - z); return d >= minD && d <= maxD && (!avoid || Math.hypot(s.x - avoid.x, s.z - avoid.z) > 1.2); });
    return ok.length ? pick(ok) : S.length ? pick(S) : null;
  }
  /** Red dot: appears near the kitten, darts away a few times when approached, then can be caught. */
  updateLaser(dt, cat, ev) {
    const L = this.laser, C = this.cfg.laser;
    if (!L.on) {
      L.t -= dt;
      if (L.t <= 0) {
        const s = this.spotsNear(cat.zone, cat.x, cat.z, 3.5, 8);
        if (s) { Object.assign(L, { on: true, x: s.x, y: s.y, z: s.z, from: null, to: null, darts: C.darts, life: C.life }); ev.push({ type: 'laserOn' }); }
        else L.t = 3;
      }
      this.laserMesh.visible = false;
      return;
    }
    L.life -= dt;
    if (L.to) {
      L.mt += dt / 0.38;
      const e = Math.min(1, L.mt), k = e * e * (3 - 2 * e);
      L.x = lerp(L.from.x, L.to.x, k) + Math.sin(e * 18) * 0.3 * (1 - e); L.z = lerp(L.from.z, L.to.z, k) + Math.cos(e * 15) * 0.3 * (1 - e); L.y = e < 0.5 ? L.from.y : L.to.y;
      if (e >= 1) L.to = null;
    } else {
      const d = Math.hypot(cat.x - L.x, cat.z - L.z);
      if (L.darts > 0 && d < C.flee) {
        const s = this.spotsNear(cat.zone, cat.x, cat.z, 2.6, 5.5, cat);
        if (s) { L.from = { x: L.x, y: L.y, z: L.z }; L.to = s; L.mt = 0; L.darts--; ev.push({ type: 'laserDart' }); }
      }
      // tired dot wiggles in place
      if (L.darts <= 0) { L.x += Math.sin(cat.t * 9) * dt * 0.6; L.z += Math.cos(cat.t * 7) * dt * 0.6; }
    }
    const dx = cat.x - L.x, dz = cat.z - L.z;
    if (!L.to && Math.hypot(dx, dz) < C.catchDist && Math.abs(cat.y - L.y) < 0.6) {
      ev.push({ type: 'laserCaught', x: L.x, y: L.y, z: L.z }); L.on = false; L.t = rand(C.gapMin, C.gapMax);
    } else if (L.life <= 0) { L.on = false; L.t = rand(C.gapMin * 0.5, C.gapMax * 0.5); ev.push({ type: 'laserOff' }); }
    this.laserMesh.visible = L.on;
    this.laserMesh.position.set(L.x, L.y + 0.03, L.z);
    this.laserGlow.scale.setScalar(0.9 + Math.sin(cat.t * 14) * 0.2);
  }
  update(dt, cat, ev, demo) {
    const t = cat.t;
    this.updateLaser(dt, cat, ev);
    for (const f of this.fish) {
      if (!f.on) { f.t -= dt; if (f.t <= 0) { f.on = true; f.g.visible = true; f.g.scale.setScalar(0.01); ev.push({ type: 'fishBack', f }); } continue; }
      f.g.visible = f.zone === cat.zone;
      f.g.rotation.y += dt * 2;
      f.g.position.y = f.y + Math.sin(t * 2.5 + f.ph) * 0.12;
      if (f.g.scale.x < 1) f.g.scale.setScalar(Math.min(1, f.g.scale.x + dt * 3));
      if (f.zone !== cat.zone) continue;
      const d = Math.hypot(cat.x - f.x, cat.y + 0.45 - f.y, cat.z - f.z);
      if (d < 0.95 && !demo) {
        f.on = false; f.g.visible = false; f.t = f.value > 1 ? this.cfg.fish.goldRespawn : this.cfg.fish.respawn;
        ev.push({ type: 'fish', f, x: f.x, y: f.y, z: f.z, value: f.value });
      }
    }
    for (const b of this.butterflies) {
      b.ph += dt * b.w;
      if (b.away > 0) { b.away -= dt; b.y += dt * 2.5; if (b.away <= 0) b.y = b.cy; }
      const tx = b.cx + Math.sin(b.ph * 1.3) * b.ax, tz = b.cz + Math.sin(b.ph * 0.9 + 1) * b.az, ty = b.away > 0 ? b.y : b.cy + Math.sin(b.ph * 2.1) * 0.6;
      b.x = lerp(b.x, tx, damp(2, dt)); b.z = lerp(b.z, tz, damp(2, dt)); b.y = lerp(b.y, ty, damp(3, dt));
      b.g.visible = cat.zone === 'garden';
      b.g.position.set(b.x, b.y, b.z);
      b.g.rotation.y = Math.atan2(tx - b.x, tz - b.z);
      for (const w of b.wings) w.p.rotation.z = w.sx * (0.2 + Math.sin(t * 16 + b.ph) * 0.8);
      if (b.away <= 0 && cat.zone === 'garden' && !demo && Math.hypot(cat.x - b.x, cat.y + 0.5 - b.y, cat.z - b.z) < this.cfg.butterfly.catchDist) {
        b.away = this.cfg.butterfly.back; ev.push({ type: 'butterfly', x: b.x, y: b.y, z: b.z });
      }
    }
    // the basket arrow bobs and the pad glows
    const bp = this.world.basketPos;
    this.basketArrow.position.set(bp.x, 2.2 + Math.sin(t * 3) * 0.25, bp.z); this.basketArrow.rotation.y = t * 1.5;
    this.basketRing.material.opacity = 0.35 + Math.sin(t * 3) * 0.25;
    this.padRing.material.opacity = 0.45 + Math.sin(t * 2.4) * 0.25; this.padRing.rotation.z = t * 0.5;
  }
  /** Small gold arrow floating ahead of the kitten toward the suggested goal. */
  pointGuide(cat, goal, show) {
    const G = this.guide;
    if (!show || !goal) { G.visible = false; return; }
    const dx = goal.x - cat.x, dz = goal.z - cat.z, d = Math.hypot(dx, dz);
    if (d < 2.5) { G.visible = false; return; }
    G.visible = true;
    const nx = dx / d, nz = dz / d;
    G.position.set(cat.x + nx * 1.2, cat.y + 0.4 + Math.sin(cat.t * 5) * 0.06, cat.z + nz * 1.2);
    G.rotation.set(0, 0, 0); G.rotateY(Math.atan2(nx, nz)); G.rotateX(Math.PI / 2);
  }
  dispose() { for (const d of this.disposables) d.dispose(); }
}

// ---------------------------------------------------------------- UIManager
const HTML = `
<canvas id="cv"></canvas>
<div class="hud" id="hud">
  <div class="top">
    <div class="stats">
      <div class="pill fishpill" id="fishPill">${SVG.fish}<span id="fishN">0</span></div>
      <div class="pill starbar">${SVG.star}<div class="track"><div class="fill" id="starFill"></div></div></div>
    </div>
    <div class="right">
      <div class="pill quests"><div class="q" id="qDot">${SVG.dot}<b></b></div><div class="q" id="qYarn">${SVG.yarn}<b></b></div><div class="q" id="qTop">${SVG.shelf}<b></b></div></div>
      <button class="pill icon" id="muteBtn" aria-label="sound">${SVG.sound}</button>
      <button class="pill icon" id="langBtn" aria-label="language">${SVG.globe}</button>
    </div>
  </div>
  <div class="pill langs" id="langs" hidden></div>
  <div class="banner" id="banner"><div class="t out" id="banT"></div><button class="share" id="shareBtn" hidden></button></div>
  <div id="floats"></div>
  <div class="stick" id="stick"><div class="base" id="stickBase"><div class="knob" id="knob"></div></div></div>
  <button class="btn meow" id="meowBtn" aria-label="meow">${SVG.meow}</button>
  <button class="btn jump" id="jumpBtn" aria-label="jump">${SVG.paw}</button>
  <div class="pill ward" id="ward" hidden>
    <div class="head"><div class="tt" id="wardT"></div><button class="x" id="wardX" aria-label="close">✕</button></div>
    <div class="row" id="skinRow"></div>
    <div class="row" id="hatRow"></div>
    <div class="msg" id="wardMsg"></div>
  </div>
  <div class="title keep" id="title"><div class="t1 out" id="t1"></div><div class="t2 out" id="t2"></div><button class="play" id="playBtn"></button><div class="tap out" id="tapT"></div></div>
</div>`;

/** DOM HUD: counters, quest icons, banners, floating +N, controls and the wardrobe card. */
class UIManager {
  constructor(root, game) {
    this.root = root; this.game = game;
    root.innerHTML = HTML;
    this.$ = (id) => root.querySelector('#' + id);
    this.floats = [];
    const fl = this.$('floats');
    for (let i = 0; i < 14; i++) { const d = document.createElement('div'); d.className = 'float out'; fl.appendChild(d); this.floats.push({ el: d, t: 0, x: 0, y: 0, z: 0 }); }
    this.fi = 0; this.shown = {}; this.v3 = new THREE.Vector3();
  }
  T(k, v) { const g = this.game; const tab = g.cfg.strings[g.lang] || {}; let s = String(tab[k] || g.cfg.strings.en[k] || k); if (v) for (const n in v) s = s.replace('{' + n + '}', v[n]); return s; }
  texts() {
    const $ = this.$;
    $('t1').textContent = this.T('title1'); $('t2').textContent = this.T('title2'); $('playBtn').textContent = this.T('play'); $('tapT').textContent = this.T('tap');
    $('wardT').textContent = this.T('mirror'); $('shareBtn').textContent = '📸 ' + this.T('share');
    this.root.dir = this.game.lang === 'ar' ? 'rtl' : 'ltr'; this.root.lang = this.game.lang;
    this.fitTitle();
  }
  /** Long titles shrink to fit the frame. */
  fitTitle() {
    for (const [id, base] of [['t1', 92], ['t2', 52], ['banT', 76]]) {
      const el = this.$(id); el.style.fontSize = '';
      const u = this.root.getBoundingClientRect().width / 720 || 1, max = 660 * u;
      if (el.scrollWidth > max) el.style.fontSize = Math.max(base * 0.6, base * max / el.scrollWidth) * u + 'px';
    }
  }
  set(id, k, v) { if (this.shown[id + k] === v) return false; this.shown[id + k] = v; return true; }
  fish(n, bump) {
    if (this.set('fish', '', n)) this.$('fishN').textContent = String(n);
    if (bump) { const p = this.$('fishPill'); p.classList.remove('bump'); void p.offsetWidth; p.classList.add('bump'); }
  }
  stars(f) { if (this.set('star', '', Math.round(f * 100))) this.$('starFill').style.transform = `scaleX(${clamp(f, 0, 1)})`; }
  quest(id, n, hot) {
    const el = this.$(id);
    if (this.set(id, 'n', n)) el.querySelector('b').textContent = n > 0 ? String(n) : '';
    if (this.set(id, 'h', !!hot)) el.classList.toggle('hot', !!hot);
  }
  banner(text, small, share) {
    const t = this.$('banT');
    t.textContent = text; t.classList.toggle('small', !!small);
    t.classList.remove('go'); void t.offsetWidth; t.classList.add('go');
    this.fitTitle();
    const sb = this.$('shareBtn');
    clearTimeout(this.shareTo);
    sb.hidden = !share;
    if (share) this.shareTo = setTimeout(() => { sb.hidden = true; }, 6000);
  }
  /** Floating "+N" with an icon at a world point. */
  float(x, y, z, html) {
    const f = this.floats[this.fi]; this.fi = (this.fi + 1) % this.floats.length;
    f.el.innerHTML = html; f.t = 1; f.x = x; f.y = y; f.z = z;
  }
  updateFloats(dt, camera, w, h) {
    for (const f of this.floats) {
      if (f.t <= 0) continue;
      f.t -= dt;
      if (f.t <= 0) { f.el.style.opacity = '0'; continue; }
      this.v3.set(f.x, f.y + (1 - f.t) * 1.4, f.z).project(camera);
      if (this.v3.z > 1) { f.el.style.opacity = '0'; continue; }
      const sx = (this.v3.x * 0.5 + 0.5) * w, sy = (-this.v3.y * 0.5 + 0.5) * h, sc = f.t > 0.85 ? 1 + (f.t - 0.85) * 3 : 1;
      f.el.style.transform = `translate(${sx}px,${sy}px) translate(-50%,-50%) scale(${sc})`;
      f.el.style.opacity = String(Math.min(1, f.t * 3));
    }
  }
}

// ---------------------------------------------------------------- Game
let app = null;

function run(mode) {
  if (app) { app.destroy(); app = null; }
  const start = () => {
    try { app = new Game(mode === 'edit' ? 'edit' : 'play'); window.__started = true; }
    catch (e) { console.error(e); app = null; }
    // dev:start
    window.__game = app && app.debug;
    // dev:end
  };
  if (window.THREE) start(); else window.addEventListener('three-ready', start, { once: true });
}

/** The whole session: loop, input, rules glue, save, quality. */
class Game {
  constructor(mode) {
    this.mode = mode; this.cfg = window.gameConfig; this.alive = true;
    const cfg = this.cfg;
    this.root = document.getElementById('app') || document.body;
    this.qs = new URLSearchParams(location.search);
    this.speed = Number(this.qs.get('speed')) || 1;
    this.lang = detectLang(typeof navigator !== 'undefined' ? navigator.languages || [navigator.language] : []);
    // save: one slot; nothing is written until the player's own save was read
    this.S = { v: 1, fish: 0, total: 0, skins: ['ginger'], hats: ['none'], skin: 'ginger', hat: 'none', garden: false, gardenSeen: false, muted: false, lang: null, laser: 0, goals: 0, tops: 0, stars: 0 };
    this.pend = { fish: 0, total: 0, laser: 0, goals: 0, tops: 0, stars: 0 };
    this.loaded = false; this.saveDue = 0;
    this.started = mode === 'play' ? false : true; this.demo = mode === 'play';
    this.now = 0; this.lastFishAt = 0; this.meter = 0; this.meterMax = cfg.mischief.first; this.combo = 0; this.comboT = 0;
    this.input = { x: 0, z: 0, keys: {}, stick: null, cam: null };
    this.ui = new UIManager(this.root, this);
    this.audio = new AudioEngine();
    this.setupRenderer();
    this.world = new WorldBuilder(this.scene, cfg); this.world.build();
    this.props = new PhysicsProps(this.scene, this.world, cfg); this.makeProps();
    this.cat = new CatController(this.scene, cfg); this.cat.zone = 'room';
    this.rig = new CameraRig(this.camera, cfg);
    this.quests = new QuestManager(this.scene, this.world, cfg);
    this.fx = new Particles(this.scene, 420);
    this.rings = [];
    const rg = new THREE.RingGeometry(0.86, 1, 40); this.ringGeo = rg;
    for (let i = 0; i < 6; i++) { const m = new THREE.Mesh(rg, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide })); m.visible = false; this.scene.add(m); this.rings.push({ m, t: 0 }); }
    this.setupMirror();
    this.applyLook();
    this.ui.texts();
    this.refreshHud();
    this.world.drawSign(0, cfg.garden.unlock, false);
    if (mode === 'edit') { this.ui.$('hud').classList.add('edit'); this.ui.$('title').classList.add('gone'); }
    else { this.bindInput(); this.loadSave(0); }
    this.showParams();
    this.onResize = () => this.fit(); window.addEventListener('resize', this.onResize);
    this.onVis = () => { this.audio.suspend(document.hidden); if (document.hidden) this.flushSave(); };
    document.addEventListener('visibilitychange', this.onVis);
    this.fit();
    this.renderer.compile(this.scene, this.camera);
    this.last = performance.now(); this.perf = { acc: 0, n: 0, slow: 0, tier: 2 };
    this.frame = this.frame.bind(this);
    this.raf = requestAnimationFrame(this.frame);
    this.debug = this.makeDebug();
  }

  setupRenderer() {
    const cv = this.root.querySelector('#cv');
    const r = this.renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true, powerPreference: 'high-performance' });
    r.outputColorSpace = THREE.SRGBColorSpace; r.toneMapping = THREE.NeutralToneMapping; r.toneMappingExposure = 1.05;
    r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFShadowMap;
    this.dpr = Math.min(window.devicePixelRatio || 1, 1.5); r.setPixelRatio(this.dpr);
    const sc = this.scene = new THREE.Scene(); sc.background = new THREE.Color(0xffe9c9);
    sc.fog = new THREE.Fog(0xfff0da, 40, 95);
    this.camera = new THREE.PerspectiveCamera(this.cfg.camera.fov, 9 / 16, 0.1, 200);
    sc.add(new THREE.HemisphereLight(0xfff4e0, 0xe8b58a, 1.5));
    const sun = this.sun = new THREE.DirectionalLight(0xffdca8, 2.7);
    sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024);
    const sc2 = sun.shadow.camera; sc2.left = -14; sc2.right = 14; sc2.top = 14; sc2.bottom = -14; sc2.near = 1; sc2.far = 50; sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.03;
    sc.add(sun); sc.add(sun.target);
    const rim = new THREE.DirectionalLight(0xa9d8ff, 1.1); rim.position.set(6, 6, -12); sc.add(rim);
    sc.add(new THREE.AmbientLight(0xfff0e0, 0.25));
  }
  /** The magic mirror shows the kitten face-on while the wardrobe is open; otherwise a soft shimmer. */
  setupMirror() {
    this.mirrorRT = new THREE.WebGLRenderTarget(256, 384);
    this.mirrorCam = new THREE.PerspectiveCamera(36, 2.6 / 4.6, 0.1, 30);
    this.shimmer = new THREE.ShaderMaterial({ uniforms: { t: { value: 0 } },
      vertexShader: 'varying vec2 vU; void main(){ vU=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
      fragmentShader: 'varying vec2 vU; uniform float t; void main(){ vec2 p=vU-0.5; float a=sin(p.x*9.0+t)+sin(p.y*7.0-t*1.3)+sin((p.x+p.y)*6.0+t*0.7); vec3 c=mix(vec3(0.82,0.9,1.0), vec3(1.0,0.82,0.95), 0.5+0.5*sin(a)); c+=0.25*smoothstep(0.96,1.0,sin(a*3.0+t*2.0)); gl_FragColor=vec4(c,1.0);\n#include <colorspace_fragment>\n}' });
    this.mirrorView = new THREE.MeshBasicMaterial({ map: this.mirrorRT.texture });
    this.mirrorRT.texture.wrapS = THREE.RepeatWrapping; this.mirrorRT.texture.repeat.x = -1;
    const plane = new THREE.PlaneGeometry(2.6, 4.6);
    this.mirror = new THREE.Mesh(plane, this.shimmer); this.mirror.position.copy(this.world.mirrorPos); this.mirror.rotation.y = -Math.PI / 2;
    this.scene.add(this.mirror); this.mirrorGeo = plane;
  }
  makeProps() {
    const P = this.props;
    // block pyramid on the rug, a tower by the sofa, a stack on the table
    let c = 0;
    const s = 0.76;
    const pyr = [];
    for (let row = 0; row < 3; row++) for (let i = 0; i < 3 - row; i++) pyr.push(P.add('block', 2 + (i - (2 - row) / 2) * s, row * s, 1.6, { color: c++, yaw: 0 }));
    for (const b of pyr) if (b.y > 0) b.support = pyr.find((o) => o.y === b.y - s && Math.abs(o.x - b.x) < s * 0.6) || pyr.find((o) => o.y === b.y - s);
    const tower = [0, 1, 2].map((i) => P.add('block', -5, i * s, 3.2, { color: c++, yaw: 0.2 }));
    tower[1].support = tower[0]; tower[2].support = tower[1];
    const tbl = [0, 1, 2].map((i) => P.add('block', -3.4, 1.6 + i * s, -7.2, { color: c++, yaw: -0.3 }));
    tbl[1].support = tbl[0]; tbl[2].support = tbl[1];
    // yarn, balls, cups on edges, pencils
    [[-1, 4.2], [3.4, 5.4], [5.2, 2.6], [-3.4, 0.4]].forEach(([x, z], i) => P.add('yarn', x, 0, z, { color: i }));
    [[1, -3], [-4, 6.8], [8.6, 0.4]].forEach(([x, z]) => P.add('beach', x, 0, z));
    [[-2.85, -6.85], [-5.1, -8.3]].forEach(([x, z]) => P.add('cup', x, 1.6, z));
    P.add('cup', -0.25, 2.6, -10), P.add('cup', 1.75, 3.6, -10), P.add('cup', 3.75, 4.6, -10);
    for (let i = 0; i < 3; i++) P.add('pencil', -4.4 + i * 0.6, 1.6, -7.9 + (i % 2) * 0.25, { color: i, yaw: 0.1 * i });
    P.add('pencil', 0.5, 0, 6.5, { color: 3, yaw: 1.2 });
    [[6, -18], [-5, -24]].forEach(([x, z]) => P.add('beach', x, 0, z));
  }

  // ---------------- save
  loadSave(tries) {
    Promise.resolve().then(() => lib.getUserGameState()).then((r) => {
      if (!this.alive) return;
      const st = r && r.state;
      if (st && typeof st === 'object') {
        const S = this.S;
        for (const k in S) if (st[k] !== undefined && st[k] !== null && (S[k] === null || typeof st[k] === typeof S[k])) S[k] = st[k];
        if (!Array.isArray(S.skins) || !S.skins.includes('ginger')) S.skins = ['ginger'].concat(Array.isArray(S.skins) ? S.skins : []);
        if (!Array.isArray(S.hats) || !S.hats.includes('none')) S.hats = ['none'].concat(Array.isArray(S.hats) ? S.hats : []);
        if (!S.skins.includes(S.skin)) S.skin = 'ginger';
        if (!S.hats.includes(S.hat)) S.hat = 'none';
      }
      for (const k in this.pend) this.S[k] += this.pend[k];
      this.pend = { fish: 0, total: 0, laser: 0, goals: 0, tops: 0, stars: 0 };
      this.loaded = true;
      if (this.S.lang && LANGS.includes(this.S.lang)) this.lang = this.S.lang;
      this.audio.setMuted(this.S.muted);
      if (this.S.garden) this.openGarden(true);
      this.applyLook(); this.ui.texts(); this.refreshHud(); this.checkGarden();
    }).catch(() => { if (this.alive) setTimeout(() => this.loadSave(tries + 1), Math.min(8000, 600 * (tries + 1))); });
  }
  /** Adds to the live save, or to a pending pot if the save has not arrived yet. */
  gain(k, n) { if (this.demo) return; (this.loaded ? this.S : this.pend)[k] += n; this.saveDue = this.saveDue || this.now + 1; }
  get fish() { return this.S.fish + this.pend.fish; }
  get total() { return this.S.total + this.pend.total; }
  flushSave() {
    if (!this.loaded || this.mode !== 'play' || this.demo) return;
    this.saveDue = 0;
    const snap = JSON.parse(JSON.stringify(this.S));
    Promise.resolve().then(() => lib.saveUserGameState(snap)).catch(() => {});
  }
  showParams() {
    try {
      lib.showGameParameters({ name: 'Paws & Chaos', params: {
        'Kitten speed': { key: 'cat.speed', type: 'slider', min: 3, max: 10, step: 0.1 },
        'Jump power': { key: 'cat.jump', type: 'slider', min: 6, max: 12, step: 0.1 },
        'Dog trampoline': { key: 'bounce.dog', type: 'slider', min: 8, max: 20, step: 0.5 },
        'Stars per fish reward': { key: 'mischief.first', type: 'slider', min: 4, max: 30, step: 1 },
        'Fish to open garden': { key: 'garden.unlock', type: 'slider', min: 3, max: 60, step: 1 },
        'Red dot reward': { key: 'laser.reward', type: 'slider', min: 1, max: 10, step: 1 },
      } });
    } catch (e) { /* host without a settings panel */ }
  }

  // ---------------- input
  bindInput() {
    const $ = this.ui.$, root = this.root, inp = this.input;
    const u = () => this.root.getBoundingClientRect().width / 720 || 1;
    this.listeners = [];
    const on = (el, ev, fn, o) => { el.addEventListener(ev, fn, o); this.listeners.push([el, ev, fn, o]); };
    const tapBtn = (id, fn) => on($(id), 'pointerdown', (e) => { this.gesture(); e.preventDefault(); const b = $(id); b.classList.add('down'); setTimeout(() => b.classList.remove('down'), 120); fn(e); });
    tapBtn('jumpBtn', () => { this.cat.jumpAt = this.now; });
    tapBtn('meowBtn', () => this.action(null));
    tapBtn('playBtn', () => this.action(null));
    tapBtn('muteBtn', () => { this.S.muted = !this.S.muted; this.audio.setMuted(this.S.muted); this.refreshHud(); this.saveDue = this.now + 0.5; });
    tapBtn('langBtn', () => { const L = $('langs'); L.hidden = !L.hidden; if (!L.hidden) this.drawLangs(); });
    tapBtn('wardX', () => { this.closedOnPad = true; this.setWard(false); });
    tapBtn('shareBtn', () => this.share());
    // stick: floating base inside the bottom-left zone
    const stick = $('stick'), base = $('stickBase'), knob = $('knob');
    const restBase = () => { base.style.left = 170 * u() + 'px'; base.style.top = 250 * u() + 'px'; knob.style.transform = ''; };
    restBase(); this.restBase = restBase;
    on(stick, 'pointerdown', (e) => {
      this.gesture(); e.preventDefault();
      if (inp.stick) return;
      const r = stick.getBoundingClientRect(), k = u();
      const cx = clamp(e.clientX - r.left, 100 * k, r.width - 60 * k), cy = clamp(e.clientY - r.top, 100 * k, r.height - 100 * k);
      inp.stick = { id: e.pointerId, cx, cy, r };
      base.style.left = cx + 'px'; base.style.top = cy + 'px';
      try { stick.setPointerCapture(e.pointerId); } catch (er) { /* fine */ }
    });
    const stickMove = (e) => {
      const s = inp.stick; if (!s || s.id !== e.pointerId) return;
      const k = u(), dx = e.clientX - s.r.left - s.cx, dy = e.clientY - s.r.top - s.cy, d = Math.hypot(dx, dy), m = 72 * k, cl = Math.min(d, m);
      const nx = d > 0 ? dx / d * cl : 0, ny = d > 0 ? dy / d * cl : 0;
      knob.style.transform = `translate(${nx}px,${ny}px)`;
      const mag = cl / m < 0.15 ? 0 : cl / m;
      s.vx = d > 0 ? dx / d * mag : 0; s.vy = d > 0 ? dy / d * mag : 0;
    };
    const stickUp = (e) => { const s = inp.stick; if (!s || s.id !== e.pointerId) return; inp.stick = null; restBase(); };
    on(stick, 'pointermove', stickMove); on(stick, 'pointerup', stickUp); on(stick, 'pointercancel', stickUp);
    // the rest of the frame: drag = turn the camera, tap = pounce at what was tapped
    on(root, 'pointerdown', (e) => {
      if (e.target.closest('button') || e.target.closest('#stick') || e.target.closest('#ward') || e.target.closest('#langs')) { this.gesture(); return; }
      this.gesture();
      if (!$('langs').hidden) $('langs').hidden = true;
      if (inp.cam) return;
      inp.cam = { id: e.pointerId, x: e.clientX, y: e.clientY, t: performance.now(), moved: 0, btn: e.button };
      try { root.setPointerCapture(e.pointerId); } catch (er) { /* fine */ }
    });
    on(root, 'pointermove', (e) => {
      const c = inp.cam; if (!c || c.id !== e.pointerId) return;
      const dx = e.clientX - c.x, dy = e.clientY - c.y; c.x = e.clientX; c.y = e.clientY; c.moved += Math.hypot(dx, dy);
      if (c.moved > 10 * u()) this.rig.drag(dx / u(), dy / u());
    });
    const camUp = (e, cancel) => {
      const c = inp.cam; if (!c || c.id !== e.pointerId) return;
      inp.cam = null;
      if (!cancel && c.moved <= 10 * u() && performance.now() - c.t < 450 && c.btn === 0) this.tapAt(e.clientX, e.clientY);
    };
    on(root, 'pointerup', (e) => camUp(e, false)); on(root, 'pointercancel', (e) => camUp(e, true));
    on(root, 'contextmenu', (e) => e.preventDefault());
    on(window, 'keydown', (e) => {
      if (e.repeat && (e.code === 'Space' || e.code === 'KeyE')) return;
      inp.keys[e.code] = true;
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
      this.gesture();
      if (e.code === 'Space') this.cat.jumpAt = this.now;
      if (e.code === 'KeyE' || e.code === 'Enter') this.action(null);
      if (e.code === 'Escape' && this.wardOpen) { this.closedOnPad = true; this.setWard(false); }
    });
    on(window, 'keyup', (e) => { inp.keys[e.code] = false; });
    on(window, 'blur', () => { inp.keys = {}; });
  }
  drawLangs() {
    const L = this.ui.$('langs'); L.innerHTML = '';
    for (const l of LANGS) {
      const b = document.createElement('button'); b.textContent = this.cfg.langNames[l]; b.className = l === this.lang ? 'on' : ''; b.dir = l === 'ar' ? 'rtl' : 'ltr';
      b.addEventListener('pointerdown', (e) => { e.preventDefault(); this.lang = l; this.S.lang = l; this.saveDue = this.now + 0.5; L.hidden = true; this.ui.texts(); this.buildWard(); });
      L.appendChild(b);
    }
  }
  /** Every gesture: sound on, and the first one turns the attract show into the player's game. */
  gesture() {
    this.audio.unlock();
    if (this.mode !== 'play' || this.started) return;
    this.started = true; this.demo = false;
    this.ui.$('title').classList.add('gone');
    this.cat.pounce = null; this.demoT = 0;
    this.lastFishAt = this.now;
  }
  tapAt(cx, cy) {
    const r = this.root.getBoundingClientRect();
    const ndc = new THREE.Vector2(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
    const ray = this.ray || (this.ray = new THREE.Raycaster());
    ray.setFromCamera(ndc, this.camera);
    let best = null, bd = 1e9;
    const c = this.cat, maxR = this.cfg.cat.pickRange;
    const cands = [];
    if (this.quests.laser.on) cands.push({ x: this.quests.laser.x, y: this.quests.laser.y, z: this.quests.laser.z, r: 0.9, laser: true });
    for (const p of this.props.list) cands.push({ x: p.x, y: p.y + p.k.hh, z: p.z, r: Math.max(0.55, p.r * 1.3), prop: p });
    for (const b of this.quests.butterflies) if (b.away <= 0) cands.push({ x: b.x, y: b.y, z: b.z, r: 0.8, bf: b });
    const v = new THREE.Vector3();
    for (const o of cands) {
      if (Math.hypot(o.x - c.x, o.z - c.z) > maxR) continue;
      v.set(o.x, o.y, o.z);
      const d = ray.ray.distanceSqToPoint(v);
      if (d < o.r * o.r && d < bd) { bd = d; best = o; }
    }
    this.action(best);
  }
  /** Meow, and pounce at a target (the tapped thing, the red dot, a butterfly or a nearby toy) or swipe. */
  action(target) {
    if (this.mode !== 'play') return;
    const c = this.cat, C = this.cfg.cat;
    c.meow(); this.audio.meow(); this.ring(); this.meowWiggle();
    let tg = target;
    if (!tg) {
      const L = this.quests.laser;
      if (L.on && Math.hypot(L.x - c.x, L.z - c.z) < 6.5) tg = { x: L.x, y: L.y, z: L.z, laser: true };
      if (!tg) for (const b of this.quests.butterflies) if (b.away <= 0 && Math.hypot(b.x - c.x, b.z - c.z) < 4.5) { tg = { x: b.x, y: Math.max(0, b.y - 0.8), z: b.z, bf: b }; break; }
      if (!tg) {
        let bd = C.pounceRange;
        for (const p of this.props.list) { const d = Math.hypot(p.x - c.x, p.z - c.z); if (d < bd && Math.abs(p.y - c.y) < 2.2) { bd = d; tg = { x: p.x, y: p.y, z: p.z, prop: p }; } }
      }
    }
    if (tg) {
      const ty = tg.prop ? Math.max(tg.prop.y, c.y - 1) : tg.bf ? Math.max(0, tg.y - 0.8) : tg.y;
      const tx = tg.prop ? tg.x - (tg.x - c.x) * 0.25 / Math.max(0.3, Math.hypot(tg.x - c.x, tg.z - c.z)) : tg.x;
      const tz = tg.prop ? tg.z - (tg.z - c.z) * 0.25 / Math.max(0.3, Math.hypot(tg.x - c.x, tg.z - c.z)) : tg.z;
      if (c.pounceTo(tx, ty, tz, this.now)) { this.audio.swish(); this.pounceTarget = tg; this.fx.emit(c.x, c.y + 0.05, c.z, 8, { color: '#ffffff', speed: 2, up: 1, life: 0.5, size: 0.3 }); return; }
    }
    this.swipe();
  }
  swipe() {
    const c = this.cat, C = this.cfg.cat, fx = Math.sin(c.yaw), fz = Math.cos(c.yaw);
    this.audio.swish();
    for (const p of this.props.list) {
      const dx = p.x - c.x, dz = p.z - c.z, d = Math.hypot(dx, dz);
      if (d > C.swipeRange + p.r || Math.abs(p.y + p.k.hh - (c.y + 0.4)) > 1.2) continue;
      if (d > 0.3 && (dx * fx + dz * fz) / d < -0.2) continue;
      const nx = d > 0.01 ? dx / d : fx, nz = d > 0.01 ? dz / d : fz;
      this.props.impulse(p, (nx * 0.6 + fx * 0.4) * C.swipePower, 3.2, (nz * 0.6 + fz * 0.4) * C.swipePower);
      this.mischief(1, p.x, p.y + 0.6, p.z, true);
    }
  }
  ring() {
    const r = this.rings.find((o) => o.t <= 0) || this.rings[0], r2 = this.rings.find((o) => o.t <= 0 && o !== r) || this.rings[1];
    const c = this.cat;
    r.t = 0.6; r.m.visible = true; r.m.position.set(c.x, c.y + 0.9, c.z); r.m.rotation.set(-Math.PI / 2, 0, 0); r.kind = 0;
    r2.t = 0.5; r2.m.visible = true; r2.m.position.set(c.x + Math.sin(c.yaw) * 0.6, c.y + 1.0, c.z + Math.cos(c.yaw) * 0.6); r2.m.rotation.set(0, c.yaw, 0); r2.kind = 1;
  }
  meowWiggle() {
    const c = this.cat, R = this.cfg.meow.radius;
    for (const p of this.props.list) {
      const d = Math.hypot(p.x - c.x, p.z - c.z);
      if (d > R) continue;
      if (p.k.roll && !p.k.pencil) this.props.impulse(p, rand(-0.6, 0.6), this.cfg.meow.wiggle * (1 - d / R) + 0.8, rand(-0.6, 0.6));
      else p.wig = 0.5;
    }
    for (const pl of this.world.plants) if (Math.hypot(pl.x - c.x, pl.z - c.z) < R) pl.vel += 1.2;
    for (const b of this.quests.butterflies) if (Math.hypot(b.x - c.x, b.z - c.z) < 3 && b.away <= 0) { b.cy = clamp(b.cy + 0.8, 1, 3.5); }
  }

  // ---------------- rules glue
  /** Mischief stars: rising chime combo, +N stars, a fish reward when the meter fills. */
  mischief(n, x, y, z, small) {
    if (this.demo) { this.audio.chime(this.combo); this.fx.emit(x, y, z, 5, { color: ['#ffd23f', '#ffffff'], kind: 1, size: 0.35, speed: 2, up: 3 }); return; }
    this.combo = this.comboT > 0 ? this.combo + 1 : 0; this.comboT = this.cfg.mischief.comboWindow;
    this.audio.chime(this.combo);
    const add = n + (this.combo >= 4 ? 1 : 0);
    this.gain('stars', add);
    this.meter += add;
    this.ui.float(x, y, z, `+${add} ${SVG.star}`);
    this.fx.emit(x, y, z, small ? 6 : 12, { color: ['#ffd23f', '#ffffff', '#ff9ec4'], kind: 1, size: 0.4, speed: 2.5, up: 4 });
    if (this.combo >= 3 && this.combo % 3 === 0) this.ui.banner(this.T('combo', { n: this.combo + 1 }), true);
    if (this.meter >= this.meterMax) {
      this.meter = 0; this.meterMax = Math.min(this.cfg.mischief.max, this.meterMax + this.cfg.mischief.grow);
      const f = this.cfg.mischief.fishReward;
      this.giveFish(f, this.cat.x, this.cat.y + 1.2, this.cat.z);
      this.ui.banner(this.T('mischief')); this.audio.fanfare(); buzz('success');
      this.fx.emit(this.cat.x, this.cat.y + 1, this.cat.z, 40, { color: ['#ff6f91', '#6ac8ff', '#ffd23f', '#7fe08a', '#b28dff'], speed: 5, up: 7, life: 1.4, size: 0.32, g: 9 });
    }
    this.ui.stars(this.meter / this.meterMax);
  }
  giveFish(n, x, y, z) {
    if (this.demo) return;
    this.gain('fish', n); this.gain('total', n);
    this.lastFishAt = this.now;
    this.ui.float(x, y, z, `+${n} ${SVG.fish}`);
    this.ui.fish(this.fish, true);
    this.refreshWard();
    this.checkGarden();
    this.world.drawSign(this.total, this.cfg.garden.unlock, this.world.gardenOpen);
    if (this.loaded && (this.total % 5 === 0 || n >= 3)) { try { lib.addPlayerScoreToLeaderboard(this.total).catch(() => {}); } catch (e) { /* no board here */ } }
  }
  checkGarden() {
    if (!this.loaded || this.world.gardenOpen || this.total < this.cfg.garden.unlock) return;
    this.S.garden = true; this.saveDue = this.now + 0.3;
    this.openGarden(false);
  }
  openGarden(quiet) {
    this.world.gardenOpen = true;
    this.world.drawSign(this.total, this.cfg.garden.unlock, true);
    if (quiet) { this.world.flapAng = -1.3; return; }
    this.world.flapVel = -9;
    this.ui.banner(this.T('garden'), false, this.canShare());
    this.audio.fanfare(); buzz('success'); this.rig.shake(0.3);
    this.fx.emit(-7, 1, -11.6, 50, { color: ['#7fe08a', '#ffd23f', '#ffffff', '#ff9ec4'], speed: 4, up: 6, life: 1.5, size: 0.35, kind: 1 });
  }
  canShare() { return typeof lib !== 'undefined' && typeof lib.share === 'function'; }
  share() {
    if (!this.canShare()) return;
    let image;
    try { this.renderer.render(this.scene, this.camera); image = this.renderer.domElement.toDataURL('image/jpeg', 0.8); } catch (e) { image = undefined; }
    Promise.resolve().then(() => lib.share({ image, title: 'Paws & Chaos', text: 'Look at my kitten in Paws & Chaos: Sunbeam Kingdom!' })).catch(() => {});
  }
  T(k, v) { return this.ui.T(k, v); }
  refreshHud() {
    this.ui.fish(this.fish);
    this.ui.stars(this.meter / this.meterMax);
    const S = this.S, P = this.pend;
    this.ui.quest('qDot', S.laser + P.laser, this.quests && this.quests.laser.on);
    this.ui.quest('qYarn', S.goals + P.goals, false);
    this.ui.quest('qTop', S.tops + P.tops, false);
    this.ui.$('muteBtn').innerHTML = S.muted ? SVG.mute : SVG.sound;
  }
  applyLook() {
    const skin = this.cfg.skins.find((s) => s.id === (this.preview && this.preview.skin || this.S.skin)) || this.cfg.skins[0];
    this.cat.setSkin(skin);
    this.cat.setHat(this.preview && this.preview.hat || this.S.hat);
  }

  // ---------------- wardrobe
  buildWard() {
    const $ = this.ui.$;
    const row = (el, list, type) => {
      el.innerHTML = '';
      for (const it of list) {
        const b = document.createElement('button'); b.className = 'card'; b.dataset.id = it.id; b.dataset.type = type;
        b.innerHTML = (type === 'skin' ? catIcon(it) : SVG[it.id].replace('<svg', '<svg class="ic"')) + `<div class="pr">${it.cost ? SVG.fish + it.cost : ''}</div>`;
        b.addEventListener('pointerdown', (e) => { e.preventDefault(); this.gesture(); this.pickItem(type, it, b); });
        el.appendChild(b);
      }
    };
    row($('skinRow'), this.cfg.skins, 'skin');
    row($('hatRow'), this.cfg.hats, 'hat');
    this.refreshWard();
  }
  refreshWard() {
    if (!this.wardBuilt) return;
    const S = this.S;
    for (const b of this.root.querySelectorAll('.card')) {
      const type = b.dataset.type, id = b.dataset.id, list = type === 'skin' ? this.cfg.skins : this.cfg.hats, it = list.find((o) => o.id === id);
      const owned = (type === 'skin' ? S.skins : S.hats).includes(id), on = (type === 'skin' ? S.skin : S.hat) === id;
      b.classList.toggle('on', on); b.classList.toggle('lock', !owned); b.classList.toggle('can', !owned && this.loaded && this.fish >= it.cost);
      b.querySelector('.pr').innerHTML = owned ? '' : SVG.fish + it.cost;
    }
  }
  /** Owned: wear it. Affordable: buy and wear. Too dear: try it on for a moment and show how many fish are missing. */
  pickItem(type, it, el) {
    const S = this.S, own = type === 'skin' ? S.skins : S.hats, key = type === 'skin' ? 'skin' : 'hat';
    if (own.includes(it.id)) { S[key] = it.id; this.preview = null; this.audio.pop(); this.saveDue = this.now + 0.4; }
    else if (this.loaded && this.fish >= it.cost) {
      S.fish -= it.cost; own.push(it.id); S[key] = it.id; this.preview = null;
      this.ui.fish(this.fish, true); this.ui.banner(this.T('newLook'), true, this.canShare()); this.audio.fanfare(); buzz('success');
      this.fx.emit(this.cat.x, this.cat.y + 1, this.cat.z, 36, { color: ['#ff9ef0', '#ffd23f', '#7fd8ff', '#ffffff'], speed: 3.5, up: 5, life: 1.3, size: 0.32, kind: 1 });
      this.saveDue = this.now + 0.3;
    } else {
      this.preview = { [key]: it.id, t: 3 }; this.audio.sparkle();
      el.classList.remove('no'); void el.offsetWidth; el.classList.add('no');
      this.ui.$('wardMsg').innerHTML = `${SVG.fish.replace('<svg', '<svg style="width:1em;height:1em;vertical-align:-.15em"')} ${this.T('more', { n: Math.max(0, it.cost - this.fish) })}`;
    }
    this.applyLook(); this.refreshWard();
  }
  setWard(open) {
    if (open === this.wardOpen) return;
    this.wardOpen = open;
    if (open && !this.wardBuilt) { this.wardBuilt = true; this.buildWard(); }
    this.ui.$('ward').hidden = !open;
    this.ui.$('wardMsg').textContent = '';
    this.mirror.material = open ? this.mirrorView : this.shimmer;
    if (open) { this.audio.sparkle(); this.refreshWard(); }
    else if (this.preview) { this.preview = null; this.applyLook(); }
  }

  // ---------------- loop
  frame(now) {
    if (!this.alive) return;
    this.raf = requestAnimationFrame(this.frame);
    const raw = (now - this.last) / 1000; this.last = now;
    const dt = Math.min(Math.max(raw, 0), 0.05) * this.speed;
    if (dt > 0) this.update(dt);
    this.render();
    this.tunePerf(raw);
  }
  readMove() {
    const k = this.input.keys, s = this.input.stick;
    let ix = (k.KeyD || k.ArrowRight ? 1 : 0) - (k.KeyA || k.ArrowLeft ? 1 : 0), iy = (k.KeyW || k.ArrowUp ? 1 : 0) - (k.KeyS || k.ArrowDown ? 1 : 0);
    if (s && s.vx !== undefined) { ix = s.vx; iy = -s.vy; }
    const m = Math.hypot(ix, iy); if (m > 1) { ix /= m; iy /= m; }
    const yaw = this.rig.yaw, fx = -Math.sin(yaw), fz = -Math.cos(yaw), rx = Math.cos(yaw), rz = -Math.sin(yaw);
    return { x: fx * iy + rx * ix, z: fz * iy + rz * ix, fwd: Math.abs(iy) >= Math.abs(ix) && m > 0.2 };
  }
  /** Attract show before the first touch: the kitten chases the dot and pounces toys by itself. */
  demoThink(dt) {
    const c = this.cat; this.demoT = (this.demoT || 0) - dt;
    const L = this.quests.laser;
    let goal = L.on ? L : null;
    if (!goal) {
      if (!this.demoGoal || this.demoT <= 0) { this.demoGoal = pick(this.props.list.filter((p) => p.y < 2 && Math.hypot(p.x - c.x, p.z - c.z) < 9)) || this.props.list[0]; this.demoT = 5; }
      goal = this.demoGoal;
    }
    const dx = goal.x - c.x, dz = goal.z - c.z, d = Math.hypot(dx, dz);
    if (d < 2.6 && c.grounded && (this.demoCd || 0) <= 0) { this.demoCd = 1.6; this.action(goal === L ? null : { x: goal.x, y: goal.y, z: goal.z, prop: goal }); this.demoT = Math.min(this.demoT, 1.2); }
    this.demoCd = (this.demoCd || 0) - dt;
    return d > 1.2 ? { x: dx / d * 0.85, z: dz / d * 0.85, fwd: true } : { x: 0, z: 0, fwd: false };
  }
  update(dt) {
    this.now += dt;
    const c = this.cat, ev = this.props.events, qev = [];
    c.zone = c.z < -12.2 ? 'garden' : 'room';
    let mv = { x: 0, z: 0, fwd: false };
    if (this.mode === 'play') mv = this.demo ? this.demoThink(dt) : this.readMove();
    if (this.mode === 'play') c.tryJump(this.now);
    // pounce assist toward a moving target
    if (c.pounce && this.pounceTarget && (this.pounceTarget.laser || this.pounceTarget.bf)) {
      const L = this.pounceTarget.laser ? this.quests.laser : this.pounceTarget.bf;
      if (!L.laser || L.on) { const dx = L.x - c.x, dz = L.z - c.z; c.vx = lerp(c.vx, dx / Math.max(0.15, c.pounce.t), damp(4, dt)); c.vz = lerp(c.vz, dz / Math.max(0.15, c.pounce.t), damp(4, dt)); }
    }
    const land = c.step(dt, mv.x, mv.z, this.world.colliders, this.world.gardenOpen, this.now);
    if (this.wardOpen && Math.hypot(mv.x, mv.z) < 0.1) c.yaw = c.turn(c.yaw, Math.atan2(this.camera.position.x - c.x, this.camera.position.z - c.z), dt * 5);
    if (land) this.onLand(land);
    if (c.hit && c.hit.gate && !this.world.gardenOpen && (this.gateBumpT || 0) < this.now) { this.gateBumpT = this.now + 2; this.ui.float(-7, 2.2, -11.8, `${SVG.fish} ${this.T('door', { n: Math.min(this.total, this.cfg.garden.unlock), m: this.cfg.garden.unlock })}`); this.audio.thud(0.4); }
    c.animate(dt);
    this.pushProps(dt);
    this.props.update(dt, c, this.world.gardenOpen);
    this.handleProps();
    this.quests.update(dt, c, qev, this.demo);
    for (const e of qev) this.onQuest(e);
    this.updateWorld(dt);
    this.updateRings(dt);
    this.fx.update(dt);
    if (this.demo) this.rig.yaw += dt * 0.12 * Math.sin(this.now * 0.2);
    this.rig.update(dt, c, mv.fwd && Math.hypot(c.vx, c.vz) > 1, this.now < 0.05);
    this.sun.position.set(c.x - 9, 15, c.z + 6); this.sun.target.position.set(c.x, 0, c.z);
    this.ui.updateFloats(dt, this.camera, this.w || 1, this.h || 1);
    if (this.preview) { this.preview.t -= dt; if (this.preview.t <= 0) { this.preview = null; this.applyLook(); } }
    // wardrobe pad
    const onPad = this.mode === 'play' && !this.demo && c.zone === 'room' && Math.hypot(c.x - this.world.padPos.x, c.z - this.world.padPos.z) < 1.35 && c.y < 0.3;
    if (!onPad) this.closedOnPad = false;
    this.setWard(onPad && !this.closedOnPad);
    // first visit to the garden; top shelf
    if (c.zone === 'garden' && !this.demo && this.loaded && !this.S.gardenSeen) { this.S.gardenSeen = true; this.saveDue = this.now + 0.5; this.ui.banner(this.T('gardenHi'), true); this.audio.sparkle(); }
    const onPerch = c.grounded && c.ground && c.ground.tag === 'perch';
    if (onPerch && !this.wasPerch && !this.demo) {
      this.gain('tops', 1); this.refreshHud();
      this.ui.banner(this.T('top')); this.audio.fanfare(); buzz('success');
      this.fx.emit(c.x, c.y + 0.5, c.z, 30, { color: ['#ffd23f', '#ffffff'], kind: 1, speed: 3, up: 5, life: 1.2, size: 0.4 });
    }
    this.wasPerch = onPerch;
    this.comboT = Math.max(0, this.comboT - dt);
    // the helper arrow appears when no fish came for a while
    const L = this.quests.laser;
    let goal = null;
    if (L.on) goal = L;
    else if (this.world.gardenOpen && !this.S.gardenSeen && c.zone === 'room') goal = { x: -7, z: -12 };
    else { let bd = 1e9; for (const f of this.quests.fish) if (f.on && f.zone === c.zone) { const d = Math.hypot(f.x - c.x, f.z - c.z) + Math.abs(f.y - c.y) * 1.5; if (d < bd) { bd = d; goal = f; } } }
    this.quests.pointGuide(c, goal, !this.demo && this.mode === 'play' && (L.on || this.now - this.lastFishAt > 10 || (goal && goal.x === -7)));
    this.ui.$('meowBtn').classList.toggle('hint', !!(L.on && Math.hypot(L.x - c.x, L.z - c.z) < 5));
    if (this.mode === 'play' && !this.demo) this.audio.music();
    if (this.saveDue && this.now >= this.saveDue) this.flushSave();
  }
  onLand(e) {
    const c = this.cat;
    if (e.bounce) {
      this.audio.boing(e.bounce === 'dog' ? 0.8 : 1.1);
      if (e.bounce === 'water') this.audio.splash();
      this.ui.float(c.x, c.y + 1.2, c.z, this.T('boing'));
      this.fx.emit(c.x, c.y + 0.1, c.z, 14, { color: e.bounce === 'water' ? ['#6fd3ff', '#ffffff'] : ['#ffffff', '#ffd9b0'], speed: 3, up: 3, life: 0.6, size: 0.3, kind: e.bounce === 'water' ? 0 : 1 });
      if (e.bounce === 'dog') { this.dogSquish = 1; this.audio.snore(); }
      if (e.bounce === 'sofa') this.sofaSquish = 1;
      if (e.bounce === 'lily') { const l = this.world.lilies.find((o) => o.c === e.g); if (l) l.sink = 1; }
      buzz('tap');
    } else if (e.soft) {
      this.audio.squeak(); this.ui.float(c.x, c.y + 1.2, c.z, this.T('boing')); this.rig.shake(0.25);
      this.fx.emit(c.x, c.y + 0.05, c.z, 18, { color: ['#ffffff', '#ffe27a'], kind: 1, speed: 3.5, up: 3, life: 0.8, size: 0.35 });
    } else if (e.speed > 4) {
      this.audio.thud(e.speed / 12);
      this.fx.emit(c.x, c.y + 0.05, c.z, 8, { color: '#ffffff', speed: 2.2, up: 1.2, life: 0.5, size: 0.28 });
    }
    // a pounce that lands next to a toy bats it
    const tg = this.pounceTarget; this.pounceTarget = null;
    if (tg && tg.prop) {
      const p = tg.prop, dx = p.x - c.x, dz = p.z - c.z, d = Math.hypot(dx, dz) || 1;
      if (d < 1.6 + p.r && Math.abs(p.y - c.y) < 1.5) { this.props.impulse(p, dx / d * this.cfg.cat.swipePower, 3.5, dz / d * this.cfg.cat.swipePower); this.mischief(1, p.x, p.y + 0.6, p.z, true); }
    }
  }
  /** The kitten shoves the toys it runs into. */
  pushProps() {
    const c = this.cat, C = this.cfg;
    for (const p of this.props.list) {
      const py = p.y + p.k.hh;
      if (py < c.y - 0.3 || p.y > c.y + C.cat.height) continue;
      const dx = p.x - c.x, dz = p.z - c.z, d = Math.hypot(dx, dz), m = C.cat.radius + p.r * (p.k.pencil ? 2.5 : 1);
      if (d >= m || d < 1e-4) continue;
      const nx = dx / d, nz = dz / d, rel = c.vx * nx + c.vz * nz - (p.vx * nx + p.vz * nz);
      this.props.wake(p);
      p.x += nx * (m - d) * 0.8; p.z += nz * (m - d) * 0.8;
      if (rel > 0) { const k = 1.3 / Math.sqrt(p.k.mass); p.vx += nx * rel * k; p.vz += nz * rel * k; p.vy += rel * 0.25; }
      if (rel > C.props.pushStar && p.cd <= 0) { p.cd = 1.2; this.mischief(1, p.x, py + 0.5, p.z, true); }
    }
  }
  handleProps() {
    const ev = this.props.events, C = this.cfg;
    for (const e of ev) {
      if (e.type === 'land' || e.type === 'clack') {
        const snd = e.p.k.sound, k = clamp(e.speed / 10, 0, 1);
        if (snd === 'boing') this.audio.boing(1.3); else if (snd === 'wood') this.audio.thud(k); else this.audio.thud(k * 0.6);
        if (e.type === 'land' && e.speed > 5) this.fx.emit(e.p.x, e.p.y + 0.05, e.p.z, 5, { color: '#ffffff', speed: 1.8, up: 1, life: 0.4, size: 0.24 });
      } else if (e.type === 'knock') {
        this.mischief(e.drop > 2.4 ? 3 : 2, e.p.x, e.p.y + 0.8, e.p.z, false);
        if (e.drop > 2.4) this.rig.shake(0.12);
      } else if (e.type === 'poof') {
        this.fx.emit(e.x, e.y + 0.3, e.z, 10, { color: ['#ffffff', '#ffe9f5'], speed: 1.5, up: 2, life: 0.7, size: 0.4, g: 1 });
      } else if (e.type === 'plant') this.wobblePlant(e.c);
    }
    ev.length = 0;
    // yarn into the basket; tidy-up of toys left far from home
    const bp = this.world.basketPos, cat = this.cat;
    for (const p of this.props.list) {
      if (p.kind === 'yarn' && !p.scored && Math.hypot(p.x - bp.x, p.z - bp.z) < C.basket.radius && p.y < 0.5) this.score(p);
      if (p.asleep && p.floorT > C.props.tidyAfter && Math.hypot(p.x - p.home.x, p.z - p.home.z) > 2 && Math.hypot(p.x - cat.x, p.z - cat.z) > C.props.tidyFar) this.props.sendHome(p, true);
    }
  }
  score(p) {
    p.scored = true;
    const bp = this.world.basketPos;
    this.fx.emit(bp.x, 0.9, bp.z, 45, { color: ['#ff6f91', '#6ac8ff', '#ffd23f', '#7fe08a', '#b28dff'], speed: 4.5, up: 8, life: 1.5, size: 0.32, g: 9 });
    this.audio.fanfare(); buzz('success');
    if (!this.demo) { this.gain('goals', 1); this.ui.banner(this.T('goal')); this.giveFish(this.cfg.basket.reward, bp.x, 1.4, bp.z); this.refreshHud(); }
    // the same ball comes back as a new colour, dropped in from above
    p.color = (p.color + 1 + Math.floor(Math.random() * (YARN_COLORS.length - 1))) % YARN_COLORS.length;
    p.mesh.material = this.props.A.yarnMats[p.color];
    const s = this.quests.spotsNear('room', bp.x, bp.z, 3, 7) || { x: 0, z: 2 };
    this.props.sendHome(p, false);
    p.x = s.x; p.z = s.z; p.y = 4; p.vy = 0; this.props.place(p);
    this.fx.emit(s.x, 4, s.z, 12, { color: ['#ffffff', YARN_COLORS[p.color]], kind: 1, speed: 2, up: 1, life: 0.8, size: 0.35, g: 1 });
  }
  wobblePlant(c) {
    const pl = this.world.plants.find((o) => Math.hypot(o.x - c.x, o.z - c.z) < 0.1);
    if (!pl || pl.cd > 0) return;
    pl.cd = 2.5; pl.vel += 3.5;
    const a = Math.atan2(pl.z - this.cat.z, pl.x - this.cat.x); pl.ax = Math.cos(a); pl.az = Math.sin(a);
    this.audio.rustle();
    this.fx.emit(pl.x, 1.45, pl.z, 14, { color: ['#6b4226', '#8a5a36'], speed: 2.5, up: 3, life: 0.9, size: 0.18, g: 12 });
    this.mischief(1, pl.x, 2.3, pl.z, true);
  }
  onQuest(e) {
    if (e.type === 'fish') { this.audio.pop(); if (e.value > 1) this.audio.fanfare(); this.giveFish(e.value, e.x, e.y, e.z); this.fx.emit(e.x, e.y, e.z, e.value > 1 ? 30 : 12, { color: ['#ffd23f', '#ffffff', '#ffb11f'], kind: 1, speed: 2.5, up: 3, life: 0.8, size: 0.34 }); buzz('tap'); }
    else if (e.type === 'laserOn') { this.refreshHud(); if (!this.demo) this.ui.banner(this.T('laserHint'), true); }
    else if (e.type === 'laserDart') this.audio.swish();
    else if (e.type === 'laserOff') this.refreshHud();
    else if (e.type === 'laserCaught') {
      this.fx.emit(e.x, e.y + 0.5, e.z, 60, { color: ['#ff6f91', '#6ac8ff', '#ffd23f', '#7fe08a', '#b28dff', '#ffffff'], speed: 5, up: 8, life: 1.6, size: 0.32, g: 9 });
      this.audio.fanfare(); this.rig.shake(0.2); buzz('success');
      if (!this.demo) { this.gain('laser', 1); this.ui.banner(this.T('laser')); this.giveFish(this.cfg.laser.reward, e.x, e.y + 1, e.z); }
      this.refreshHud();
    } else if (e.type === 'butterfly') { this.audio.sparkle(); this.ui.banner(this.T('flutter'), true); this.giveFish(this.cfg.butterfly.reward, e.x, e.y, e.z); this.fx.emit(e.x, e.y, e.z, 20, { color: ['#ff9ef0', '#7fd8ff', '#ffffff'], kind: 1, speed: 2, up: 2, life: 1, size: 0.3, g: 1 }); }
    else if (e.type === 'fishBack') this.fx.emit(e.f.x, e.f.y, e.f.z, 8, { color: ['#ffd23f', '#ffffff'], kind: 1, speed: 1.5, up: 1, life: 0.6, size: 0.3, g: 0 });
  }
  updateWorld(dt) {
    const W = this.world, t = this.now;
    for (const pl of W.plants) {
      pl.cd = Math.max(0, pl.cd - dt);
      pl.vel += (-60 * pl.ang - 5 * pl.vel) * dt; pl.ang += pl.vel * dt;
      pl.top.rotation.set(pl.az * pl.ang * 0.25, 0, -pl.ax * pl.ang * 0.25);
      pl.g.rotation.set(pl.az * pl.ang * 0.06, 0, -pl.ax * pl.ang * 0.06);
      if (this.cat.hit && this.cat.hit.tag === 'plant' && Math.hypot(this.cat.hit.x - pl.x, this.cat.hit.z - pl.z) < 0.1 && Math.hypot(this.cat.vx, this.cat.vz) > 2) this.wobblePlant(this.cat.hit);
    }
    // door flap
    const open = W.gardenOpen, c = this.cat, near = open && Math.abs(c.x + 7) < 1.3 && Math.abs(c.z + 12.2) < 1.2;
    const target = open ? (near ? -1.3 * Math.sign(c.z + 12.2 || 1) : 0) : 0;
    W.flapVel += ((target - W.flapAng) * 50 - 6 * W.flapVel) * dt; W.flapAng += W.flapVel * dt;
    W.flap.rotation.x = W.flapAng;
    W.sign.position.y = 3.1 + Math.sin(t * 2) * 0.06;
    for (const l of W.lilies) { l.sink = Math.max(0, l.sink - dt * 2); l.g.position.y = 0.8 + Math.sin(t * 1.5 + l.t * 2) * 0.03 - l.sink * 0.12; l.g.rotation.y += dt * 0.1; }
    for (const s of W.shafts) s.material.opacity = 0.8 + Math.sin(t * 0.6) * 0.15;
    if (c.zone === 'garden' && Math.random() < dt * 20) this.fx.emit(rand(-0.3, 0.3), 2.5, -22.5 + rand(-0.3, 0.3), 1, { color: '#bfeaff', speed: 1.4, up: 3, life: 0.9, size: 0.22, g: 9 });
    this.shimmer.uniforms.t.value = t;
    // dog: breathing, squish on bounce, z's
    if (!this.dog) this.makeDog();
    this.dogSquish = Math.max(0, (this.dogSquish || 0) - dt * 3);
    this.dog.body.scale.y = 1 + Math.sin(t * 1.4) * 0.04 - this.dogSquish * 0.25;
    this.dog.body.scale.x = this.dog.body.scale.z = 1 + this.dogSquish * 0.08;
    this.zT = (this.zT || 0) - dt;
    if (this.zT <= 0) { this.zT = 2.4; const z = this.dog.zs.find((o) => o.t <= 0); if (z) { z.t = 2.2; } }
    for (const z of this.dog.zs) { if (z.t <= 0) { z.s.visible = false; continue; } z.t -= dt; z.s.visible = true; const k = 1 - z.t / 2.2; z.s.position.set(10 + Math.sin(k * 6) * 0.3, 2 + k * 1.6, -5); z.s.material.opacity = Math.min(1, z.t); z.s.scale.setScalar(0.4 + k * 0.4); }
    this.sofaSquish = Math.max(0, (this.sofaSquish || 0) - dt * 3);
  }
  /** The sleeping golden dog whose belly is a trampoline. */
  makeDog() {
    const g = new THREE.Group(); g.position.set(7.5, 0, -5);
    // two vertex-coloured meshes: the breathing body, and head + paws + tail
    const sph = this.props.A.sphere, fur = '#f2b45c', light = '#ffd9a0', dark = '#4a2a1a';
    const bb = new Batch(), hb = new Batch();
    bb.add(sph, fur, 0, 0.6, 0, 0, 0, 0, 2.0, 0.75, 1.45); bb.add(sph, light, 0.2, 0.75, 0.35, 0, 0, 0, 1.5, 0.5, 1.1);
    const hx = 2.3, hy = 0.85, hz = 0.1;
    hb.add(sph, fur, hx, hy, hz, 0, 0, 0, 0.72, 0.62, 0.7); hb.add(sph, light, hx + 0.55, hy - 0.15, hz, 0, 0, 0, 0.45, 0.32, 0.4);
    hb.add(sph, dark, hx + 0.95, hy - 0.05, hz, 0, 0, 0, 0.12, 0.09, 0.12);
    hb.add(sph, fur, hx - 0.05, hy - 0.15, hz + 0.62, 0.3, 0, 0.2, 0.2, 0.55, 0.3); hb.add(sph, fur, hx - 0.05, hy - 0.15, hz - 0.62, -0.3, 0, 0.2, 0.2, 0.55, 0.3);
    hb.add(sph, dark, hx + 0.5, hy + 0.18, hz + 0.28, 0, 0, 0, 0.04, 0.015, 0.14); hb.add(sph, dark, hx + 0.5, hy + 0.18, hz - 0.28, 0, 0, 0, 0.04, 0.015, 0.14);
    hb.add(sph, fur, 2.6, 0.22, 0.85, 0, 0, 0, 0.6, 0.28, 0.3); hb.add(sph, fur, 2.6, 0.22, -0.65, 0, 0, 0, 0.6, 0.28, 0.3);
    hb.add(sph, fur, -2.2, 0.35, -0.9, 0, 0.6, 0, 0.7, 0.22, 0.22);
    const dogMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.75 });
    const body = bb.build(dogMat), rest = hb.build(dogMat);
    body.position.y = 0.05;
    for (const m of [body, rest]) { m.castShadow = true; m.receiveShadow = true; g.add(m); }
    this.scene.add(g);
    const zs = [];
    const zTex = canvasTex(64, 64, (c) => { c.fillStyle = '#7a5cff'; c.font = 'bold 54px "Baloo 2", system-ui, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('z', 32, 34); });
    for (let i = 0; i < 3; i++) { const m = new THREE.SpriteMaterial({ map: zTex, transparent: true, depthWrite: false }); const s = new THREE.Sprite(m); s.visible = false; this.scene.add(s); zs.push({ s, t: 0 }); this.world.disposables.push(m); }
    this.world.disposables.push(dogMat, body.geometry, rest.geometry, zTex);
    this.dog = { g, body, zs };
  }
  updateRings(dt) {
    for (const r of this.rings) {
      if (r.t <= 0) { r.m.visible = false; continue; }
      r.t -= dt;
      const k = 1 - r.t / (r.kind ? 0.5 : 0.6);
      r.m.scale.setScalar(r.kind ? 0.2 + k * 1.2 : 0.3 + k * 4.2);
      r.m.material.opacity = (1 - k) * 0.8;
    }
  }
  render() {
    const cp = this.camera.position;
    for (const p of this.props.list) p.mesh.visible = Math.hypot(p.x - cp.x, p.y + p.k.hh - cp.y, p.z - cp.z) > p.r + 1.1;
    if (this.wardOpen) {
      const c = this.cat, mp = this.world.mirrorPos;
      this.mirrorCam.position.set(mp.x - 0.1, c.y + 1.0, clamp(c.z, mp.z - 1, mp.z + 1));
      this.mirrorCam.lookAt(c.x, c.y + 0.75, c.z);
      this.mirror.visible = false;
      this.renderer.setRenderTarget(this.mirrorRT); this.renderer.render(this.scene, this.mirrorCam); this.renderer.setRenderTarget(null);
      this.mirror.visible = true;
    }
    this.renderer.render(this.scene, this.camera);
  }
  /** Quality steps down on slow devices: resolution, then shadows, then particles. */
  tunePerf(raw) {
    const P = this.perf;
    if (raw <= 0 || raw > 0.5 || this.now < 2) return;
    P.acc += raw; P.n++;
    if (P.acc < 1.5) return;
    const fps = P.n / P.acc; P.acc = 0; P.n = 0;
    P.slow = fps < 38 ? P.slow + 1 : 0;
    if (P.slow >= 2 && P.tier > 0) {
      P.slow = 0; P.tier--;
      if (P.tier === 1) { this.dpr = Math.max(0.75, this.dpr * 0.75); this.renderer.setPixelRatio(this.dpr); this.fit(); }
      else { this.renderer.shadowMap.enabled = false; this.sun.castShadow = false; this.fx.limit = this.fx.n / 2; this.dpr = Math.max(0.6, this.dpr * 0.85); this.renderer.setPixelRatio(this.dpr); this.fit(); this.scene.traverse((o) => { if (o.material) { const ms = Array.isArray(o.material) ? o.material : [o.material]; for (const m of ms) m.needsUpdate = true; } }); }
    }
  }
  fit() {
    const r = this.root.getBoundingClientRect(), w = Math.max(1, r.width), h = Math.max(1, r.height);
    this.w = w; this.h = h;
    this.root.style.setProperty('--u', String(w / 720));
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
    this.fx.mat.uniforms.scale.value = h * this.dpr * 0.5;
    if (this.restBase) this.restBase();
    this.ui.fitTitle();
  }
  makeDebug() {
    const g = this;
    return {
      get S() { return g.S; }, get cat() { return g.cat; }, get props() { return g.props.list; }, get quests() { return g.quests; }, get world() { return g.world; },
      get state() { return { demo: g.demo, started: g.started, loaded: g.loaded, fish: g.fish, total: g.total, meter: g.meter, meterMax: g.meterMax, ward: !!g.wardOpen, garden: g.world.gardenOpen, zone: g.cat.zone, tier: g.perf.tier, now: g.now }; },
      tp(x, y, z) { const c = g.cat; c.x = x; c.y = y; c.z = z; c.vx = c.vy = c.vz = 0; c.py = y; },
      give(n) { g.giveFish(n, g.cat.x, g.cat.y + 1, g.cat.z); },
      laserNow() { g.quests.laser.t = 0; g.quests.laser.on = false; },
      action(t) { g.action(t || null); },
      info() { return { geometries: g.renderer.info.memory.geometries, textures: g.renderer.info.memory.textures, calls: g.renderer.info.render.calls, tris: g.renderer.info.render.triangles }; },
      setYaw(y) { g.rig.yaw = y; },
      get yarnMats() { return g.props.A.yarnMats; },
    };
  }
  destroy() {
    this.alive = false;
    cancelAnimationFrame(this.raf);
    this.flushSave();
    for (const [el, ev, fn, o] of this.listeners || []) el.removeEventListener(ev, fn, o);
    window.removeEventListener('resize', this.onResize);
    document.removeEventListener('visibilitychange', this.onVis);
    clearTimeout(this.ui.shareTo);
    this.audio.close();
    this.props.dispose(); this.cat.dispose(); this.quests.dispose(); this.world.dispose();
    this.fx.geo.dispose(); this.fx.mat.dispose(); this.ringGeo.dispose(); for (const r of this.rings) r.m.material.dispose();
    this.mirrorRT.dispose(); this.mirrorGeo.dispose(); this.shimmer.dispose(); this.mirrorView.dispose();
    this.renderer.dispose(); try { this.renderer.forceContextLoss(); } catch (e) { /* already gone */ }
    this.root.innerHTML = '';
  }
}

window.run = run;

// dev:start
// Outside the host (?local): stand in for it, read the config file and start.
if (typeof location !== 'undefined' && new URLSearchParams(location.search).has('local') && !window.lib) {
  const none = async () => ({});
  const store = { state: window.__preset || null };
  window.lib = { showGameParameters() {}, log() {}, getUserGameState: async () => (window.__saveFails ? Promise.reject(new Error('offline')) : { state: store.state }),
    saveUserGameState: async (s) => { store.state = s; (window.__writes = window.__writes || []).push(s); }, addPlayerScoreToLeaderboard: none, getTopNEntriesFromLeaderboard: none,
    shouldUseTouchControls: () => matchMedia('(pointer: coarse)').matches, haptics: { play() {}, start() {}, stop() {} }, getAsset: () => undefined };
  if (window.__shareStub) window.lib.share = async (o) => { window.__shared = o; };
  fetch('./game_config.json').then((r) => r.json()).then((c) => { window.gameConfig = c; run(new URLSearchParams(location.search).get('mode') || 'play'); });
}
// dev:end
