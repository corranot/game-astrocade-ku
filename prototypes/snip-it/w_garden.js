// PROTOTYPE - NOT FOR PRODUCTION
// Snip It world 3: the garden. Pack shape: see w_room.js; level fields: see levels.js. This world brings the
// balloon cage: a thing lighter than air tied to a floor peg, which flies away when its rope is cut.
import { RED, BLUE, YELLOW, X3, rope, thing, at } from './palette.js';

const FENCE = { model: 'fence', x: 0, y: 0 };

export default {
  id: 'garden', icon: '🌻', sky: 0x5ec8ff, floor: [0x7fd85a, 0x8a5a33], beam: 0x9b6431, ambient: ['mote', 1.2, 1],
  wall(g, w, h) {
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#5ec8ff'); gr.addColorStop(0.75, '#c9f1ff'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.fillStyle = '#fff3a8'; g.beginPath(); g.arc(w * 0.8, h * 0.2, 60, 0, 7); g.fill(); g.fillStyle = '#ffe14d'; g.beginPath(); g.arc(w * 0.8, h * 0.2, 44, 0, 7); g.fill();
    g.fillStyle = '#fff'; for (const [x, y, s] of [[0.2, 0.3, 1], [0.55, 0.42, 0.8], [0.3, 0.55, 0.7]]) { g.beginPath(); g.arc(w * x, h * y, 30 * s, 0, 7); g.arc(w * x + 34 * s, h * y - 10 * s, 38 * s, 0, 7); g.arc(w * x + 72 * s, h * y, 28 * s, 0, 7); g.fill(); }
    g.fillStyle = '#8ede6a'; g.beginPath(); g.ellipse(w * 0.25, h * 0.92, w * 0.5, h * 0.14, 0, 0, 7); g.fill(); g.fillStyle = '#6fcf55'; g.beginPath(); g.ellipse(w * 0.8, h * 0.95, w * 0.5, h * 0.15, 0, 0, 7); g.fill();
  },
  models: {
    fence(g, K) { const w = K.mat(0xffffff, 0.7); for (let i = -4; i <= 4; i++) { if (Math.abs(i) < 1) continue; K.add(g, 'box', w, [i * 0.7, 0.55, -0.9], [0.4, 1.1, 0.1]); K.add(g, 'cone', w, [i * 0.7, 1.2, -0.9], [0.24, 0.26, 0.07]); } K.add(g, 'box', w, [-1.9, 0.7, -0.92], [2.6, 0.14, 0.06]); K.add(g, 'box', w, [1.9, 0.7, -0.92], [2.6, 0.14, 0.06]); },
    pond(g, K) { K.add(g, 'tube', K.mat(0x8a5a33, 0.9), [0, 0.12, 0.2], [1.5, 0.24, 1.0]); K.add(g, 'tube', K.mat(0x4fb4ff, 0.15), [0, 0.2, 0.2], [1.3, 0.2, 0.84]); K.add(g, 'ball', K.mat(0x4fbf4a), [0.7, 0.32, 0.5], [0.3, 0.03, 0.26]); K.add(g, 'ball', K.mat(0xff8fb1), [0.7, 0.4, 0.5], 0.09); },
    // a sunflower with a face; wilted until it gets water (flag 'bloom')
    flower(g, K, o) {
      const green = K.mat(0x4fbf4a), leaf = K.mat(0x3aa63f), petal = K.mat(0xffd21f), core = K.mat(0x8a4f22), white = K.mat(0xffffff, 0.3), black = K.mat(0x2a1b2e, 0.3);
      K.add(g, 'tube', green, [0, 1.2, 0], [0.09, 2.4, 0.09]);
      K.add(g, 'ball', leaf, [-0.4, 0.9, 0.05], [0.42, 0.1, 0.2], [0, 0, 0.5]); K.add(g, 'ball', leaf, [0.42, 1.4, 0.05], [0.42, 0.1, 0.2], [0, 0, -0.5]);
      K.add(g, 'tube', K.mat(0xc8763a), [0, 0.22, 0], [0.5, 0.44, 0.5]); K.add(g, 'tube', K.mat(0xe08d4c), [0, 0.46, 0], [0.58, 0.1, 0.58]);
      const head = K.group(); head.position.set(0, 2.45, 0); g.add(head);
      for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; K.add(head, 'ball', petal, [Math.cos(a) * 0.62, Math.sin(a) * 0.62, 0], [0.3, 0.16, 0.07], [0, 0, a]); }
      K.add(head, 'ball', core, [0, 0, 0.05], [0.5, 0.5, 0.16]);
      const eyes = [-0.18, 0.18].map((x) => { const e = K.add(head, 'ball', white, [x, 0.08, 0.2], [0.11, 0.13, 0.05]); K.add(e, 'ball', black, [0, 0, 0.6], 0.55); return e; });
      const mouth = K.add(head, 'ball', black, [0, -0.18, 0.2], [0.1, 0.04, 0.03]);
      let up = o.wilted ? 0 : 1;
      return { tinted: [petal, green, leaf], spin: false, update(A, dt) {
        if (A.flags.bloom && up < 1) { up = Math.min(1, up + dt * 1.6); A.clean(); }
        const d = 1 - up; head.rotation.x = d * 0.95; head.rotation.z = d * 0.5 + Math.sin(A.time * 1.5) * 0.05; head.position.set(d * 0.25, 2.45 - d * 0.35, d * 0.35);
        const blink = (A.time % 2.7) > 2.58 ? 0.12 : 1; for (const e of eyes) e.scale.set(0.11, 0.13 * blink * (A.mood === 'wow' ? 1.3 : 1), 0.05);
        mouth.scale.set(up > 0.9 || A.mood === 'happy' ? 0.17 : 0.1, A.mood === 'wow' ? 0.12 : up > 0.9 ? 0.09 : 0.04, 0.03);
      } };
    },
  },
  levels: [
    { id: 'garden', prompt: 'p_garden', hero: { model: 'flower', x: 0, y: 0, s: 1, wilted: true, tint: 0x9c9468 }, props: [FENCE],
      items: [
        { id: 'ball', result: 'gag', rope: rope(-1.9, RED), body: thing('ball', -1.9, 6.0, 0.48, { m: 0.7, rest: 0.75 }), goal: at(-0.1, 3.0), fx: 'stars', sound: 'boing', react: 'dizzy', sticker: '💫' },
        { id: 'seeds', result: 'gag', rope: rope(0, YELLOW), body: thing('sack', 0, 6.4, 0.44), goal: at(0, 3.0), fx: 'birds', sound: 'chirp', react: 'wow', pop: true, sticker: '🐦' },
        { id: 'can', result: 'win', rope: rope(1.9, BLUE), body: thing('can', 1.9, 6.1, 0.48, { m: 1 }), goal: at(0.1, 3.0), fx: 'rain', sound: 'splash', react: 'happy', set: 'bloom', pop: true, sticker: '🌻' },
      ] },
    { id: 'carrot', prompt: 'p_snack', hero: { model: 'bunny', x: 0, y: 1.0, s: 1 }, props: [FENCE],
      items: [
        { id: 'carrot', result: 'win', rope: rope(X3[0], RED), body: thing('carrot', X3[0], 6.0, 0.46), goal: at(-0.05, 2.5), fx: 'hearts', sound: 'munch', react: 'happy', pop: true, sticker: '🥕' },
        { id: 'fish', result: 'gag', rope: rope(X3[1], BLUE), body: thing('fish', X3[1], 6.3, 0.44), goal: at(0, 2.5), fx: 'stars', sound: 'squeak', react: 'wow', pop: true, sticker: '🐟' },
        { id: 'ball', result: 'gag', rope: rope(X3[2], YELLOW), body: thing('ball', X3[2], 6.0, 0.46, { m: 0.7, rest: 0.75 }), goal: at(0.1, 2.5), fx: 'stars', sound: 'boing', react: 'dizzy', sticker: '💫' },
      ] },
    { id: 'chick', prompt: 'p_free', hero: { model: 'chick', x: 0, y: 0.72, s: 0.72 }, props: [FENCE],
      items: [
        { id: 'bucket', result: 'gag', rope: rope(-1.9, BLUE), body: thing('bucket', -1.9, 6.2, 0.46), goal: at(-0.05, 3.1), fx: 'splash', sound: 'splash', react: 'shiver', pop: true, sticker: '💦' },
        { id: 'cage', result: 'win', rope: rope(2.2, RED, 0.12), body: thing('liftCage', 0, 1.0, 1.0, { m: 1, lift: 30 }), goal: at(0, 10.5, 1.4), fx: 'hearts', sound: 'boing', react: 'happy', pop: true, fxAt: [0, 1.2], sticker: '🐥' },
        { id: 'apple', result: 'gag', rope: rope(1.9, YELLOW), body: thing('apple', 1.9, 6.2, 0.42, { rest: 0.5 }), goal: at(-2.0, 0.42, 0.5), fx: 'stars', sound: 'boing', react: 'wow', sticker: '🍎' },
      ] },
    { id: 'hot', prompt: 'p_cool', hero: { model: 'puppy', x: 0, y: 1.0, s: 1, tint: 0xff7a5a }, props: [FENCE],
      items: [
        { id: 'hat', result: 'gag', rope: rope(X3[0], RED), body: thing('hat', X3[0], 6.0, 0.46), goal: at(-0.05, 2.5), fx: 'stars', sound: 'puff', react: 'dizzy', pop: true, sticker: '🥵' },
        { id: 'cloud', result: 'win', rope: rope(X3[1], BLUE), body: thing('cloud', X3[1], 6.3, 0.5, { m: 0.7 }), goal: at(0, 3.0), fx: 'rain', sound: 'splash', react: 'happy', untint: true, pop: true, sticker: '⛅' },
        { id: 'scarf', result: 'gag', rope: rope(X3[2], YELLOW), body: thing('scarf', X3[2], 6.0, 0.46), goal: at(0.05, 2.5), fx: 'stars', sound: 'puff', react: 'sneeze', pop: true, sticker: '🧣' },
      ] },
    { id: 'duck', prompt: 'p_land', hero: 'duck', props: [FENCE, { model: 'pond', x: 0, y: 0 }],
      boxes: [{ x0: -1.3, y0: 0, x1: 1.3, y1: 0.3, rest: 0.2 }],
      items: [
        { id: 'duck', result: 'win', rope: rope(0, YELLOW), body: thing('duck', 0, 5.6, 0.56, { m: 1, rest: 0.2 }), goal: at(0, 0.86, 0.5), fx: 'splash', sound: 'squeak', react: 'happy', sticker: '🦆' },
        { id: 'sack', result: 'gag', rope: rope(-2.2, RED), body: thing('sack', -2.2, 6.0, 0.44), goal: at(-2.2, 0.44, 0.45), fx: 'birds', sound: 'chirp', react: 'wow', pop: true, sticker: '🐦' },
        { id: 'anvil', result: 'gag', rope: rope(2.2, BLUE), body: thing('anvil', 2.2, 6.1, 0.48, { m: 2, rest: 0.1 }), goal: at(2.2, 0.48, 0.45), fx: 'stars', sound: 'thud', react: 'shiver', sticker: '😱' },
      ] },
  ],
};
