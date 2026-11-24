// PROTOTYPE - NOT FOR PRODUCTION
// Snip It world: the snow day. Pack shape: see w_room.js; level fields: see levels.js. This world is about cold
// and warm: a shivering animal is blue until a scarf or a hat warms it for good. Its last levels hang four
// ropes: one fixes the scene, the others end in a funny mess.
import { RED, BLUE, YELLOW, GREEN, PURPLE, X3, X4, rope, thing, at } from './palette.js';

const PINES = { model: 'snowPines', x: 0, y: 0 };
const COLD = 0x8fd0ff;

export default {
  id: 'snow', icon: '⛄', sky: 0xbfe6ff, floor: [0xe6f4ff, 0xa9cfe8], beam: 0x8a5a33, ambient: ['mote', 1.2, 1],
  wall(g, w, h) {
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#9fd6ff'); gr.addColorStop(0.7, '#e4f5ff'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.fillStyle = '#fffbe0'; g.beginPath(); g.arc(w * 0.2, h * 0.24, 56, 0, 7); g.fill(); g.fillStyle = '#fff3a8'; g.beginPath(); g.arc(w * 0.2, h * 0.24, 40, 0, 7); g.fill();
    g.fillStyle = '#fff'; for (const [x, y, s] of [[0.55, 0.3, 1], [0.12, 0.45, 0.7], [0.7, 0.5, 0.6]]) { g.beginPath(); g.arc(w * x, h * y, 30 * s, 0, 7); g.arc(w * x + 34 * s, h * y - 10 * s, 38 * s, 0, 7); g.arc(w * x + 72 * s, h * y, 28 * s, 0, 7); g.fill(); }
    // far hills, then near hills with painted pines and a frozen pond
    g.fillStyle = '#cfe6f7'; g.beginPath(); g.ellipse(w * 0.3, h * 0.84, w * 0.5, h * 0.2, 0, 0, 7); g.fill(); g.beginPath(); g.ellipse(w * 0.85, h * 0.86, w * 0.45, h * 0.24, 0, 0, 7); g.fill();
    const pine = (x, y, s) => {
      g.fillStyle = '#8a5a33'; g.fillRect(x - 4 * s, y - 6 * s, 8 * s, 14 * s);
      for (let i = 0; i < 3; i++) { const b = y - 6 * s - i * 20 * s, r = (26 - i * 6) * s; g.fillStyle = '#3fa56c'; g.beginPath(); g.moveTo(x - r, b); g.lineTo(x + r, b); g.lineTo(x, b - 30 * s); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.moveTo(x - r * 0.45, b - 16 * s); g.lineTo(x + r * 0.45, b - 16 * s); g.lineTo(x, b - 30 * s); g.fill(); }
    };
    for (const [x, y, s] of [[0.08, 0.7, 1.1], [0.2, 0.67, 0.8], [0.42, 0.66, 0.9], [0.66, 0.65, 0.8], [0.8, 0.64, 1.2], [0.94, 0.67, 0.9]]) pine(w * x, h * y, s);
    g.fillStyle = '#fff'; g.beginPath(); g.ellipse(w * 0.2, h * 0.95, w * 0.5, h * 0.2, 0, 0, 7); g.fill(); g.beginPath(); g.ellipse(w * 0.8, h * 0.97, w * 0.5, h * 0.2, 0, 0, 7); g.fill();
    g.fillStyle = '#a9dcf7'; g.beginPath(); g.ellipse(w * 0.55, h * 0.8, 70, 14, 0, 0, 7); g.fill(); g.fillStyle = '#d9f1ff'; g.beginPath(); g.ellipse(w * 0.53, h * 0.798, 30, 4, 0, 0, 7); g.fill();
    // snowflakes
    g.fillStyle = 'rgba(255,255,255,.95)'; for (let i = 0; i < 40; i++) { g.beginPath(); g.arc((i * 137) % w, (i * 251) % (h * 0.62), 3 + (i % 3), 0, 7); g.fill(); }
  },
  models: {
    // a row of snowy pines along the back, the middle left open
    snowPines(g, K) {
      const trunk = K.mat(0x8a5a33, 0.9), green = K.mat(0x3fa56c, 0.8), dark = K.mat(0x2f8f5b, 0.8), white = K.mat(0xffffff, 0.9);
      for (const [x, k] of [[-2.8, 1.0], [-1.6, 0.8], [1.6, 0.85], [2.8, 1.05]]) {
        K.add(g, 'tube', trunk, [x, 0.3 * k, -0.9], [0.13 * k, 0.6 * k, 0.13 * k]);
        K.add(g, 'cone', dark, [x, 1.0 * k, -0.9], [0.75 * k, 1.0 * k, 0.75 * k]); K.add(g, 'cone', green, [x, 1.6 * k, -0.9], [0.58 * k, 0.9 * k, 0.58 * k]); K.add(g, 'cone', green, [x, 2.15 * k, -0.9], [0.42 * k, 0.8 * k, 0.42 * k]);
        K.add(g, 'cone', white, [x, 2.42 * k, -0.9], [0.2 * k, 0.32 * k, 0.2 * k]);
        K.add(g, 'ball', white, [x - 0.3 * k, 0.95 * k, -0.6], [0.2 * k, 0.07 * k, 0.14 * k]); K.add(g, 'ball', white, [x + 0.25 * k, 1.5 * k, -0.65], [0.18 * k, 0.06 * k, 0.12 * k]);
      }
    },
    snowIgloo(g, K) {
      const white = K.mat(0xffffff, 0.85), blue = K.mat(0xbfe0f5, 0.85), dark = K.mat(0x3a4a6b, 0.9);
      K.add(g, 'ball', white, [0, 0, 0], [1.25, 1.15, 1.0]);
      K.add(g, 'tube', blue, [0, 0.3, 0.95], [0.55, 0.5, 0.55], [Math.PI / 2, 0, 0]);
      K.add(g, 'disc', dark, [0, 0.3, 1.21], [0.4, 0.42, 1]);
      for (const [x, y] of [[-0.75, 0.55], [0.75, 0.55], [-0.4, 0.95], [0.4, 0.95]]) K.add(g, 'box', blue, [x, y, 0.62 - y * 0.3], [0.36, 0.04, 0.3]);
    },
    // a snowman with a face, a top hat and a red scarf
    snowMan(g, K) {
      const white = K.mat(0xffffff, 0.9), black = K.mat(0x2a1b2e, 0.4), orange = K.mat(0xff8a1f), twig = K.mat(0x8a5a33, 0.9), red = K.mat(0xff4d5e, 0.8);
      K.add(g, 'ball', white, [0, 0.55, 0], 0.62); K.add(g, 'ball', white, [0, 1.38, 0], 0.46); K.add(g, 'ball', white, [0, 2.0, 0], 0.34);
      K.add(g, 'ball', black, [-0.12, 2.08, 0.3], 0.05); K.add(g, 'ball', black, [0.12, 2.08, 0.3], 0.05);
      K.add(g, 'cone', orange, [0, 1.98, 0.46], [0.07, 0.3, 0.07], [Math.PI / 2, 0, 0]);
      K.add(g, 'ball', black, [0, 1.5, 0.44], 0.05); K.add(g, 'ball', black, [0, 1.28, 0.45], 0.05);
      K.add(g, 'ring', red, [0, 1.74, 0], [0.3, 0.3, 0.45], [Math.PI / 2, 0, 0]); K.add(g, 'box', red, [0.2, 1.52, 0.36], [0.14, 0.4, 0.06]);
      K.add(g, 'tube', twig, [-0.62, 1.5, 0], [0.035, 0.6, 0.035], [0, 0, 1.0]); K.add(g, 'tube', twig, [0.62, 1.5, 0], [0.035, 0.6, 0.035], [0, 0, -1.0]);
      K.add(g, 'tube', black, [0, 2.3, 0], [0.32, 0.04, 0.32]); K.add(g, 'tube', black, [0, 2.46, 0], [0.21, 0.3, 0.21]);
    },
    snowSled(g, K) {
      const red = K.mat(0xff4d5e, 0.6), wood = K.mat(0xc98a4e, 0.8);
      K.add(g, 'box', red, [0, 0.4, 0.2], [1.3, 0.1, 0.7]);
      for (const z of [-0.08, 0.48]) { K.add(g, 'box', wood, [0, 0.06, z], [1.5, 0.1, 0.09]); K.add(g, 'box', wood, [-0.45, 0.22, z], [0.08, 0.3, 0.08]); K.add(g, 'box', wood, [0.45, 0.22, z], [0.08, 0.3, 0.08]); K.add(g, 'ring', wood, [0.75, 0.24, z], [0.18, 0.18, 0.22]); }
    },
    // a soft heap of snow to land in
    snowDrift(g, K) {
      const white = K.mat(0xffffff, 0.95), shade = K.mat(0xd3eaf9, 0.95);
      K.add(g, 'ball', shade, [0, 0.05, 0.2], [0.98, 0.3, 0.62]);
      K.add(g, 'ball', white, [0, 0.1, 0.2], [0.78, 0.72, 0.58]); K.add(g, 'ball', white, [-0.55, 0.1, 0.3], [0.42, 0.42, 0.42]); K.add(g, 'ball', white, [0.55, 0.1, 0.25], [0.44, 0.46, 0.42]);
    },
  },
  levels: [
    // a shivering penguin: the scarf warms it; ice and a snow cloud only make it colder
    { id: 'snow_scarf', prompt: 'p_warm', hero: { model: 'penguin', x: 0, y: 1.0, s: 1, tint: COLD },
      props: [PINES, { model: 'snowIgloo', x: -2.2, y: 0, z: -0.5, s: 0.75 }],
      items: [
        { id: 'scarf', result: 'win', rope: rope(X3[0], RED), body: thing('scarf', X3[0], 6.0, 0.46), goal: at(-0.05, 2.5), fx: 'hearts', sound: 'puff', react: 'happy', untint: true, pop: true, sticker: '🧣' },
        { id: 'ice', result: 'gag', rope: rope(X3[1], BLUE), body: thing('ice', X3[1], 6.3, 0.44, { m: 1.2 }), goal: at(0, 2.5), fx: 'stars', sound: 'thud', react: 'shiver', pop: true, sticker: '🥶' },
        { id: 'cloud', result: 'gag', rope: rope(X3[2], YELLOW), body: thing('cloud', X3[2], 6.0, 0.5, { m: 0.7 }), goal: at(0.05, 2.6), fx: 'flour', sound: 'puff', react: 'sneeze', pop: true, burst: 2, sticker: '🌨️' },
      ] },
    // a hungry puppy: the bone is the snack; a water balloon turns it blue for a moment, a carrot is no dog food
    { id: 'snow_bone', prompt: 'p_snack', hero: { model: 'puppy', x: 0, y: 1.0, s: 1 },
      props: [PINES, { model: 'snowSled', x: 2.2, y: 0, z: -0.3, s: 0.9 }],
      items: [
        { id: 'water', result: 'gag', rope: rope(X3[0], BLUE), body: thing('waterBalloon', X3[0], 6.0, 0.42), goal: at(-0.05, 2.5), fx: 'splash', sound: 'splash', react: 'shiver', tint: COLD, pop: true, sticker: '💦' },
        { id: 'carrot', result: 'gag', rope: rope(X3[1], YELLOW), body: thing('carrot', X3[1], 6.3, 0.44), goal: at(0, 2.5), fx: 'stars', sound: 'squeak', react: 'sneeze', pop: true, sticker: '🥕' },
        { id: 'bone', result: 'win', rope: rope(X3[2], RED), body: thing('bone', X3[2], 6.0, 0.46), goal: at(0.05, 2.5), fx: 'hearts', sound: 'munch', react: 'happy', pop: true, sticker: '🦴' },
      ] },
    // a hanging owl lands softly in the snow heap; the anvil thumps the ground, the gift pops on the sled and the
    // star knocks the snowman silly
    { id: 'snow_owl', prompt: 'p_land', hero: 'owl',
      props: [PINES, { model: 'snowDrift', x: X4[1], y: 0 }, { model: 'snowSled', x: X4[2] + 0.1, y: 0, z: -0.2, s: 0.75 }, { id: 'snowman', model: 'snowMan', x: X4[3], y: 0, z: -0.2 }],
      boxes: [{ x0: -1.6, y0: 0, x1: 0.0, y1: 0.5, rest: 0.2 }, { x0: 0.4, y0: 0, x1: 1.4, y1: 0.36, rest: 0.3 }, { x0: 1.95, y0: 0, x1: 2.85, y1: 2.55 }],
      items: [
        { id: 'anvil', result: 'gag', rope: rope(X4[0], RED), body: thing('anvil', X4[0], 6.1, 0.48, { m: 2, rest: 0.1 }), goal: at(X4[0], 0.48, 0.45), fx: 'stars', sound: 'thud', react: 'shiver', sticker: '😱' },
        { id: 'owl', result: 'win', rope: rope(X4[1], YELLOW), body: thing('owl', X4[1], 5.6, 0.56, { m: 1, rest: 0.2 }), goal: at(X4[1], 1.06, 0.5), fx: 'flour', sound: 'land', react: 'happy', sticker: '🦉' },
        { id: 'gift', result: 'gag', rope: rope(X4[2], GREEN), body: thing('gift', X4[2], 6.3, 0.44, { m: 0.8, rest: 0.4 }), goal: at(X4[2] + 0.1, 0.8, 0.55), fx: 'confetti', sound: 'horn', react: 'wow', pop: true, sticker: '🎁' },
        { id: 'star', result: 'gag', rope: rope(X4[3], BLUE), body: thing('star', X4[3], 6.0, 0.42), goal: at(X4[3], 2.97, 0.55), fx: 'stars', sound: 'bell', react: 'laugh', pop: true, propReact: ['snowman', 'dizzy'], sticker: '⛄' },
      ] },
    // a shivering bunny: the hat warms it; ice, a cold fish and a burst pillow do not
    { id: 'snow_hat', prompt: 'p_warm', hero: { model: 'bunny', x: 0, y: 1.0, s: 1, tint: COLD },
      props: [PINES, { model: 'snowIgloo', x: 2.3, y: 0, z: -0.5, s: 0.7 }, { model: 'snowMan', x: -2.5, y: 0, z: -0.5, s: 0.8 }],
      items: [
        { id: 'ice', result: 'gag', rope: rope(X4[0], BLUE), body: thing('ice', X4[0], 6.0, 0.44, { m: 1.2 }), goal: at(-0.1, 2.5), fx: 'stars', sound: 'thud', react: 'shiver', pop: true, sticker: '🧊' },
        { id: 'fish', result: 'gag', rope: rope(X4[1], YELLOW), body: thing('fish', X4[1], 6.3, 0.44), goal: at(-0.05, 2.5), fx: 'splash', sound: 'squeak', react: 'wow', pop: true, sticker: '🐟' },
        { id: 'hat', result: 'win', rope: rope(X4[2], RED), body: thing('hat', X4[2], 6.0, 0.46), goal: at(0.05, 2.5), fx: 'hearts', sound: 'puff', react: 'happy', untint: true, pop: true, sticker: '🎩' },
        { id: 'pillow', result: 'gag', rope: rope(X4[3], PURPLE), body: thing('pillow', X4[3], 6.3, 0.5), goal: at(0.1, 2.5), fx: 'flour', sound: 'puff', react: 'laugh', pop: true, sticker: '🪶' },
      ] },
    // a bear cub under a balloon cage tied to a peg: cut the peg rope and the cage flies off
    { id: 'snow_cub', prompt: 'p_free', hero: { model: 'bear', x: 0, y: 0.72, s: 0.72 },
      props: [PINES],
      items: [
        { id: 'crate', result: 'gag', rope: rope(X4[0], YELLOW), body: thing('crate', X4[0], 6.0, 0.46), goal: at(X4[0], 0.46, 0.45), fx: 'birds', sound: 'chirp', react: 'wow', pop: true, sticker: '🐦' },
        { id: 'bucket', result: 'gag', rope: rope(X4[1], BLUE), body: thing('bucket', X4[1], 6.3, 0.46), goal: at(-0.05, 3.1), fx: 'splash', sound: 'splash', react: 'shiver', pop: true, sticker: '🪣' },
        { id: 'bell', result: 'gag', rope: rope(X4[2], GREEN), body: thing('bell', X4[2], 6.0, 0.44), goal: at(0.05, 3.1), fx: 'stars', sound: 'bell', react: 'dizzy', pop: true, sticker: '🔔' },
        { id: 'cage', result: 'win', rope: rope(X4[3], RED, 0.12), body: thing('liftCage', 0, 1.0, 1.0, { m: 1, lift: 30 }), goal: at(0, 10.5, 1.4), fx: 'hearts', sound: 'boing', react: 'happy', pop: true, fxAt: [0, 1.2], sticker: '🐻' },
      ] },
  ],
};
