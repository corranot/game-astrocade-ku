// PROTOTYPE - NOT FOR PRODUCTION
// Snip It world: the beach. Pack shape: see w_room.js; level fields: see levels.js. The last level is a
// "one first" level: a sunshade floats over the hero on a peg rope, and the water only reaches the hero once
// the sunshade has been cut loose and has flown off.
import { RED, BLUE, YELLOW, GREEN, PURPLE, X3, rope, thing, at } from './palette.js';

const PALM = { model: 'palm', x: -2.75, y: 0 };
const CASTLE = { model: 'castle', x: 2.45, y: 0 };

export default {
  id: 'beach', icon: '🏖️', sky: 0x6fd0ff, floor: [0xf6d78b, 0xe0b765], beam: 0xc98a4e, ambient: ['mote', 1.2, 1],
  wall(g, w, h) {
    const gr = g.createLinearGradient(0, 0, 0, h * 0.62); gr.addColorStop(0, '#49b8ff'); gr.addColorStop(1, '#c8f0ff'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.fillStyle = '#fff3a8'; g.beginPath(); g.arc(w * 0.22, h * 0.24, 66, 0, 7); g.fill(); g.fillStyle = '#ffd92e'; g.beginPath(); g.arc(w * 0.22, h * 0.24, 48, 0, 7); g.fill();
    g.fillStyle = '#fff'; for (const [x, y, s] of [[0.58, 0.3, 1], [0.3, 0.47, 0.7], [0.72, 0.5, 0.6]]) { g.beginPath(); g.arc(w * x, h * y, 30 * s, 0, 7); g.arc(w * x + 34 * s, h * y - 10 * s, 38 * s, 0, 7); g.arc(w * x + 72 * s, h * y, 28 * s, 0, 7); g.fill(); }
    const sea = g.createLinearGradient(0, h * 0.62, 0, h * 0.88); sea.addColorStop(0, '#1f8fe0'); sea.addColorStop(1, '#5fd6e8'); g.fillStyle = sea; g.fillRect(0, h * 0.62, w, h * 0.26);
    g.fillStyle = 'rgba(255,255,255,.75)'; for (const [x, y, l] of [[0.1, 0.68, 70], [0.55, 0.71, 90], [0.3, 0.77, 60], [0.75, 0.8, 80], [0.05, 0.83, 90]]) g.fillRect(w * x, h * y, l, 5);
    g.fillStyle = '#ff5f5f'; g.beginPath(); g.moveTo(w * 0.8, h * 0.66); g.lineTo(w * 0.92, h * 0.66); g.lineTo(w * 0.89, h * 0.69); g.lineTo(w * 0.83, h * 0.69); g.fill();
    g.fillStyle = '#fff'; g.beginPath(); g.moveTo(w * 0.86, h * 0.57); g.lineTo(w * 0.86, h * 0.655); g.lineTo(w * 0.915, h * 0.655); g.fill();
    g.fillStyle = '#f6d78b'; g.fillRect(0, h * 0.87, w, h * 0.13); g.fillStyle = '#fff'; g.fillRect(0, h * 0.865, w, 6);
  },
  models: {
    palm(g, K) {
      const bark = K.mat(0xa9713f, 0.9), leaf = K.mat(0x3fbf5a, 0.7), dark = K.mat(0x2f9a48, 0.7);
      for (let i = 0; i < 6; i++) K.add(g, 'tube', bark, [i * 0.07, 0.3 + i * 0.58, -0.9], [0.2 - i * 0.012, 0.62, 0.2 - i * 0.012], [0, 0, -0.12]);
      for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; K.add(g, 'ball', i % 2 ? leaf : dark, [0.42 + Math.cos(a) * 0.7, 3.55 - Math.abs(Math.cos(a)) * 0.2, -0.9 + Math.sin(a) * 0.5], [0.85, 0.12, 0.3], [0, -a, -Math.cos(a) * 0.45]); }
      K.add(g, 'ball', K.mat(0x7a4a26, 0.8), [0.3, 3.4, -0.7], 0.16); K.add(g, 'ball', K.mat(0x7a4a26, 0.8), [0.58, 3.38, -0.75], 0.16);
    },
    castle(g, K) {
      const s = K.mat(0xf0c46a, 0.95), d = K.mat(0xd9a548, 0.95);
      K.add(g, 'box', s, [0, 0.3, -0.7], [1.3, 0.6, 0.8]);
      for (const x of [-0.6, 0.6]) { K.add(g, 'tube', s, [x, 0.5, -0.7], [0.28, 1.0, 0.28]); K.add(g, 'cone', d, [x, 1.2, -0.7], [0.32, 0.4, 0.32]); }
      K.add(g, 'tube', s, [0, 0.75, -0.75], [0.3, 1.5, 0.3]); K.add(g, 'cone', d, [0, 1.72, -0.75], [0.36, 0.46, 0.36]);
      K.add(g, 'box', K.mat(0x8a5a33, 0.9), [0, 0.2, -0.29], [0.3, 0.4, 0.02]);
      K.add(g, 'tube', K.mat(0xffffff, 0.5), [0, 2.1, -0.75], [0.02, 0.4, 0.02]); K.add(g, 'box', K.mat(0xff4d5e, 0.6), [0.13, 2.2, -0.75], [0.24, 0.16, 0.02]);
    },
    beachMat(g, K) {
      K.add(g, 'box', K.mat(0xff7a5a, 0.95), [0, 0.03, 0.2], [2.6, 0.06, 1.5]);
      for (const x of [-0.9, -0.3, 0.3, 0.9]) K.add(g, 'box', K.mat(0xffffff, 0.95), [x, 0.04, 0.2], [0.22, 0.06, 1.5]);
    },
    deckChair(g, K) {
      const wood = K.mat(0xc98a4e, 0.8), cloth = K.mat(0x2fb8c9, 0.9), white = K.mat(0xffffff, 0.9);
      K.add(g, 'box', cloth, [0, 0.42, -0.5], [0.9, 0.08, 1.0], [0.25, 0, 0]); K.add(g, 'box', cloth, [0, 0.95, -1.05], [0.9, 1.0, 0.08], [-0.45, 0, 0]);
      K.add(g, 'box', white, [0, 0.47, -0.5], [0.3, 0.08, 1.0], [0.25, 0, 0]); K.add(g, 'box', white, [0, 0.97, -1.02], [0.3, 1.0, 0.08], [-0.45, 0, 0]);
      for (const x of [-0.5, 0.5]) { K.add(g, 'box', wood, [x, 0.3, -0.6], [0.08, 0.08, 1.4], [0.5, 0, 0]); K.add(g, 'box', wood, [x, 0.3, -0.6], [0.08, 0.08, 1.4], [-0.5, 0, 0]); }
    },
    paddlePool(g, K) {
      K.add(g, 'tube', K.mat(0xff8fb1, 0.5), [0, 0.22, 0.1], [1.5, 0.44, 1.1]); K.add(g, 'ring', K.mat(0xffc61a, 0.5), [0, 0.44, 0.1], [1.45, 1.06, 0.5], [Math.PI / 2, 0, 0]);
      K.add(g, 'tube', K.mat(0x4fc4ff, 0.15), [0, 0.42, 0.1], [1.36, 0.1, 0.96]);
      K.add(g, 'ball', K.mat(0xffffff, 0.3), [-0.6, 0.48, 0.5], [0.3, 0.02, 0.12]); K.add(g, 'ball', K.mat(0xffffff, 0.3), [0.5, 0.48, -0.2], [0.26, 0.02, 0.1]);
    },
  },
  levels: [
    { id: 'beach_banana', prompt: 'p_snack', hero: { model: 'monkey', x: 0, y: 0.95, s: 0.95 }, props: [PALM, CASTLE],
      items: [
        { id: 'banana', result: 'win', rope: rope(X3[0], YELLOW), body: thing('banana', X3[0], 6.0, 0.46), goal: at(-0.05, 2.45), fx: 'hearts', sound: 'munch', react: 'happy', pop: true, sticker: '🍌' },
        { id: 'fish', result: 'gag', rope: rope(X3[1], BLUE), body: thing('fish', X3[1], 6.3, 0.44), goal: at(0, 2.45), fx: 'stars', sound: 'squeak', react: 'wow', pop: true, sticker: '🐟' },
        { id: 'bucket', result: 'gag', rope: rope(X3[2], RED), body: thing('bucket', X3[2], 6.0, 0.48), goal: at(0.05, 2.55), fx: 'splash', sound: 'splash', react: 'shiver', tint: 0x8fd0ff, pop: true, sticker: '💦' },
      ] },
    { id: 'beach_pool', prompt: 'p_land', hero: 'frog', props: [PALM, { model: 'paddlePool', x: 0, y: 0 }],
      boxes: [{ x0: -1.35, y0: 0, x1: 1.35, y1: 0.45, rest: 0.2 }],
      items: [
        { id: 'sack', result: 'gag', rope: rope(-2.3, GREEN), body: thing('sack', -2.3, 6.0, 0.44), goal: at(-2.3, 0.44, 0.45), fx: 'birds', sound: 'chirp', react: 'wow', pop: true, sticker: '🐦' },
        { id: 'frog', result: 'win', rope: rope(0, RED), body: thing('frog', 0, 5.6, 0.56, { m: 1, rest: 0.2 }), goal: at(0, 1.01, 0.5), fx: 'splash', sound: 'splash', react: 'happy', burst: 2, sticker: '🐸' },
        { id: 'ball', result: 'gag', rope: rope(2.3, PURPLE), body: thing('ball', 2.3, 6.1, 0.48, { m: 0.7, rest: 0.75 }), goal: at(2.3, 0.48, 0.45), fx: 'stars', sound: 'boing', react: 'laugh', sticker: '🏐' },
      ] },
    { id: 'beach_nap', prompt: 'p_wake', hero: { model: 'puppy', x: 0, y: 1.0, s: 1, asleep: true }, props: [{ model: 'beachMat', x: 0, y: 0 }, { model: 'deckChair', x: -2.3, y: 0 }, CASTLE],
      items: [
        { id: 'pillow', result: 'gag', rope: rope(X3[0], BLUE), body: thing('pillow', X3[0], 6.0, 0.5), goal: at(-0.05, 2.5), fx: 'flour', sound: 'puff', react: 'sleep', pop: true, sticker: '😴' },
        { id: 'hat', result: 'gag', rope: rope(X3[1], RED), body: thing('hat', X3[1], 6.3, 0.46), goal: at(0, 2.5), fx: 'stars', sound: 'puff', react: 'sneeze', pop: true, sticker: '👒' },
        { id: 'bell', result: 'win', rope: rope(X3[2], YELLOW), body: thing('bell', X3[2], 6.0, 0.44), goal: at(0.05, 2.5), fx: 'stars', sound: 'bell', react: 'happy', set: 'wake', pop: true, sticker: '🔔' },
      ] },
    { id: 'beach_ice', prompt: 'p_cool', hero: { model: 'penguin', x: 0, y: 0.95, s: 0.95, tint: 0xff6a4a }, props: [PALM, { model: 'deckChair', x: 2.3, y: 0 }],
      items: [
        { id: 'ice', result: 'win', rope: rope(X3[0], BLUE), body: thing('ice', X3[0], 6.0, 0.46, { m: 1.1 }), goal: at(-0.05, 2.45), fx: 'bubbles', sound: 'splash', react: 'happy', untint: true, pop: true, sticker: '🧊' },
        { id: 'scarf', result: 'gag', rope: rope(X3[1], RED), body: thing('scarf', X3[1], 6.3, 0.46), goal: at(0, 2.45), fx: 'stars', sound: 'puff', react: 'dizzy', pop: true, sticker: '🥵' },
        { id: 'ball', result: 'gag', rope: rope(X3[2], YELLOW), body: thing('ball', X3[2], 6.0, 0.46, { m: 0.7, rest: 0.75 }), goal: at(0.1, 2.45), fx: 'stars', sound: 'boing', react: 'wow', sticker: '💫' },
      ] },
    // the sunshade keeps the water off the sandy panda: cut its peg rope first, then the bucket
    { id: 'beach_shade', prompt: 'p_first', hero: { model: 'panda', x: 0, y: 0.9, s: 0.9, muddy: true }, props: [{ model: 'beachMat', x: 0, y: 0 }, CASTLE],
      items: [
        { id: 'shade', result: 'gag', rope: rope(-2.4, RED, 0.12), body: thing('umbrella', 0, 3.0, 1.0, { m: 1, lift: 30 }), goal: at(0, 10.5, 1.4), fx: 'stars', sound: 'boing', react: 'wow', pop: true, fxAt: [0, 3.2], sticker: '⛱️' },
        { id: 'bucket', result: 'win', needs: 'shade', rope: rope(0, BLUE), body: thing('bucket', 0, 6.5, 0.48, { m: 1 }), goal: at(0, 2.4), fx: 'splash', sound: 'splash', react: 'happy', untint: true, pop: true, burst: 2, sticker: '🐼',
          early: { goal: at(0, 4.1, 0.5), fx: 'splash', sound: 'splash', react: 'laugh', untint: false, burst: 1, sticker: '☔' } },
        { id: 'ball', result: 'gag', rope: rope(2.1, YELLOW), body: thing('ball', 2.1, 6.0, 0.46, { m: 0.7, rest: 0.75 }), goal: at(1.5, 0.46, 0.5), fx: 'stars', sound: 'boing', react: 'dizzy', sticker: '💫' },
      ] },
  ],
};
