// PROTOTYPE - NOT FOR PRODUCTION
// Snip It world 2: the bathroom. Pack shape: see w_room.js; level fields: see levels.js.
import { RED, BLUE, YELLOW, X3, rope, thing, at } from './palette.js';

const TUB = { model: 'tub', x: 0, y: 0 };

export default {
  id: 'bath', icon: '🛁', sky: 0xbfeaff, floor: [0x9fd8ff, 0x6fb7e6], beam: 0xffffff, ambient: ['bubbles', 2.5, 0.04],
  wall(g, w, h) {
    g.fillStyle = '#bfeaff'; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(255,255,255,.75)'; g.lineWidth = 5; for (let x = 0; x <= w; x += 64) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); } for (let y = 0; y <= h; y += 64) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
    g.fillStyle = '#8fd0f2'; for (let i = 0; i < 9; i++) g.fillRect(((i * 197) % w) & ~63, ((i * 331) % (h * 0.8)) & ~63, 64, 64);
    g.fillStyle = '#fff'; g.beginPath(); g.ellipse(w * 0.74, h * 0.36, 70, 92, 0, 0, 7); g.fill(); g.fillStyle = '#e3f6ff'; g.beginPath(); g.ellipse(w * 0.74, h * 0.36, 58, 80, 0, 0, 7); g.fill();
    g.fillStyle = '#ffb3cf'; g.fillRect(w * 0.12, h * 0.4, w * 0.16, h * 0.15); g.fillStyle = '#ff8fb1'; g.fillRect(w * 0.12, h * 0.4, w * 0.16, 14);
  },
  models: {
    tub(g, K) { const w = K.mat(0xffffff, 0.25); K.add(g, 'ball', w, [0, 0.62, 0], [1.6, 0.62, 0.9]); K.add(g, 'ball', K.mat(0xd9ecff, 0.3), [0, 0.86, 0.06], [1.42, 0.3, 0.74]); K.add(g, 'tube', w, [0, 1.02, 0], [1.56, 0.12, 0.88]); for (const x of [-1, 1]) K.add(g, 'ball', K.mat(0xffc61a, 0.3), [x * 1.0, 0.1, 0.4], 0.14); K.add(g, 'tube', K.mat(0xb8c4d6, 0.3), [-1.5, 1.5, -0.2], [0.06, 1.1, 0.06]); K.add(g, 'ball', K.mat(0xb8c4d6, 0.3), [-1.5, 2.05, -0.2], 0.12); },
    mat(g, K) { K.add(g, 'box', K.mat(0xffd9e6, 0.95), [0, 0.04, 0.3], [2.6, 0.08, 1.5]); K.add(g, 'box', K.mat(0xffffff, 0.95), [0, 0.05, 0.3], [2.1, 0.08, 1.1]); },
    towel(g, K) { const m = K.mat(0xff9db5, 0.95); K.add(g, 'box', m, [0, 0, 0], [1.3, 1.5, 0.3]); for (const y of [-0.45, 0, 0.45]) K.add(g, 'box', K.mat(0xffffff, 0.95), [0, y, 0.16], [1.3, 0.12, 0.02]); K.knot(g, m); },
    soap(g, K) { K.add(g, 'ball', K.mat(0xc9a6ff, 0.3), [0, 0, 0], [0.95, 0.6, 0.6]); K.add(g, 'ball', K.mat(0xffffff, 0.2), [-0.3, 0.2, 0.5], [0.2, 0.12, 0.06]); for (const [x, y, r] of [[0.7, 0.5, 0.2], [-0.75, 0.45, 0.15], [0.3, 0.7, 0.12]]) K.add(g, 'ball', K.mat(0xe8f8ff, 0.05), [x, y, 0.2], r); },
  },
  levels: [
    { id: 'bath', prompt: 'p_bath', hero: { model: 'puppy', x: 0, y: 1.45, z: -0.15, s: 0.95, muddy: true }, props: [TUB],
      items: [
        { id: 'flour', result: 'gag', rope: rope(-1.9, YELLOW), body: thing('sack', -1.9, 5.9, 0.46), goal: at(-0.05, 2.9), fx: 'flour', sound: 'puff', react: 'sneeze', tint: 0xffffff, pop: true, sticker: '👻' },
        { id: 'shower', result: 'win', rope: rope(0, BLUE), body: thing('bucket', 0, 6.3, 0.48, { m: 1 }), goal: at(0, 2.9), fx: 'bubbles', sound: 'splash', react: 'happy', untint: true, pop: true, sticker: '🛁' },
        { id: 'ducks', result: 'gag', rope: rope(1.9, RED), body: thing('crate', 1.9, 6.0, 0.46), goal: at(0.05, 2.9), fx: 'ducks', sound: 'squeak', react: 'laugh', pop: true, sticker: '🦆' },
      ] },
    { id: 'dry', prompt: 'p_dry', hero: { model: 'bear', x: 0, y: 1.0, s: 1, tint: 0x7fc4ff }, props: [{ model: 'mat', x: 0, y: 0 }],
      items: [
        { id: 'towel', result: 'win', rope: rope(X3[0], RED), body: thing('towel', X3[0], 6.0, 0.48), goal: at(-0.05, 2.5), fx: 'hearts', sound: 'puff', react: 'happy', untint: true, pop: true, sticker: '🧸' },
        { id: 'ice', result: 'gag', rope: rope(X3[1], BLUE), body: thing('ice', X3[1], 6.3, 0.44, { m: 1.2 }), goal: at(0, 2.5), fx: 'stars', sound: 'thud', react: 'shiver', pop: true, sticker: '🥶' },
        { id: 'water', result: 'gag', rope: rope(X3[2], YELLOW), body: thing('waterBalloon', X3[2], 6.0, 0.42), goal: at(0.05, 2.5), fx: 'splash', sound: 'splash', react: 'laugh', pop: true, sticker: '💦' },
      ] },
    { id: 'bubbles', prompt: 'p_bubbles', hero: { model: 'bunny', x: 0, y: 1.45, z: -0.15, s: 0.9 }, props: [TUB],
      items: [
        { id: 'fish', result: 'gag', rope: rope(X3[0], BLUE), body: thing('fish', X3[0], 6.0, 0.46), goal: at(-0.05, 2.9), fx: 'splash', sound: 'splash', react: 'wow', pop: true, sticker: '🐟' },
        { id: 'anvil', result: 'gag', rope: rope(X3[1], RED), body: thing('anvil', X3[1], 6.3, 0.48, { m: 2 }), goal: at(1.7, 0.48, 0.45), fx: 'stars', sound: 'thud', react: 'shiver', sticker: '😱' },
        { id: 'soap', result: 'win', rope: rope(X3[2], YELLOW), body: thing('soap', X3[2], 6.0, 0.44), goal: at(0.05, 2.9), fx: 'bubbles', sound: 'squeak', react: 'happy', pop: true, burst: 3, sticker: '🫧' },
      ] },
    { id: 'pig', prompt: 'p_wash', hero: { model: 'pig', x: 0, y: 1.0, s: 1, muddy: true }, props: [{ model: 'mat', x: 0, y: 0 }],
      items: [
        { id: 'apple', result: 'gag', rope: rope(X3[0], RED), body: thing('apple', X3[0], 6.0, 0.42), goal: at(-0.05, 2.5), fx: 'hearts', sound: 'munch', react: 'laugh', pop: true, sticker: '🍎' },
        { id: 'cake', result: 'gag', rope: rope(X3[1], YELLOW), body: thing('cake', X3[1], 6.3, 0.48), goal: at(0, 2.5), fx: 'flour', sound: 'puff', react: 'sneeze', tint: 0xffe3ec, pop: true, sticker: '🍰' },
        { id: 'cloud', result: 'win', rope: rope(X3[2], BLUE), body: thing('cloud', X3[2], 6.0, 0.5, { m: 0.7 }), goal: at(0.05, 3.0), fx: 'rain', sound: 'splash', react: 'happy', untint: true, pop: true, sticker: '🐷' },
      ] },
    { id: 'frog', prompt: 'p_land', hero: 'frog', props: [TUB],
      boxes: [{ x0: -1.4, y0: 0, x1: 1.4, y1: 0.95, rest: 0.25 }],
      items: [
        { id: 'star', result: 'gag', rope: rope(-2.3, YELLOW), body: thing('star', -2.3, 6.0, 0.42, { rest: 0.6 }), goal: at(-2.3, 0.42, 0.45), fx: 'stars', sound: 'bell', react: 'wow', sticker: '🌟' },
        { id: 'frog', result: 'win', rope: rope(0, RED), body: thing('frog', 0, 5.6, 0.56, { m: 1, rest: 0.25 }), goal: at(0, 1.51, 0.5), fx: 'splash', sound: 'splash', react: 'happy', sticker: '🐸' },
        { id: 'anvil', result: 'gag', rope: rope(2.3, BLUE), body: thing('anvil', 2.3, 6.1, 0.48, { m: 2, rest: 0.1 }), goal: at(2.3, 0.48, 0.45), fx: 'stars', sound: 'thud', react: 'shiver', sticker: '😱' },
      ] },
  ],
};
