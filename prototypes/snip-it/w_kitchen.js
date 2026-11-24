// PROTOTYPE - NOT FOR PRODUCTION
// Snip It world: the kitchen. Pack shape: see w_room.js; level fields: see levels.js. A bright pastel kitchen with
// a tiled wall, a fridge and a stove at the back, a stool things can land on and a big soft pudding to fall into.
import { RED, BLUE, YELLOW, GREEN, PURPLE, X3, rope, thing, at } from './palette.js';

const FRIDGE = { model: 'fridge', x: -2.45, y: 0, z: -1.15 }, STOVE = { model: 'stove', x: 2.35, y: 0, z: -1.15 };
const TABLE = { model: 'table', x: -2.35, y: 0, z: -1.1 };
// the top of the hero's head, so that a hard thing can come to rest on it
const HEAD = { x0: -0.45, y0: 0, x1: 0.45, y1: 1.85, rest: 0.15 };

export default {
  id: 'kitchen', icon: '🍳', sky: 0xfff3dc, floor: [0xbfe8d8, 0x8fcdb6], beam: 0xffb48a, ambient: ['mote', 1.2, 1],
  wall(g, w, h) {
    // pastel tiles
    g.fillStyle = '#fff6e6'; g.fillRect(0, 0, w, h);
    const tiles = ['#ffe3ec', '#fff6e6', '#dff5ec', '#fff6e6', '#fff1b8', '#fff6e6'];
    for (let j = 0; j < 11; j++) for (let i = 0; i < 8; i++) { g.fillStyle = tiles[(i + j * 2) % tiles.length]; g.fillRect(i * 64 + 3, j * 64 + 3, 58, 58); }
    // a window with the sky, a sun and a cloud
    g.fillStyle = '#ffffff'; g.fillRect(w * 0.56, h * 0.3, w * 0.34, h * 0.2);
    g.fillStyle = '#9fe2ff'; g.fillRect(w * 0.58, h * 0.312, w * 0.3, h * 0.176);
    g.fillStyle = '#ffe14d'; g.beginPath(); g.arc(w * 0.82, h * 0.36, 24, 0, 7); g.fill();
    g.fillStyle = '#ffffff'; g.beginPath(); g.arc(w * 0.63, h * 0.44, 18, 0, 7); g.arc(w * 0.67, h * 0.425, 24, 0, 7); g.arc(w * 0.71, h * 0.44, 17, 0, 7); g.fill();
    g.fillRect(w * 0.725, h * 0.312, w * 0.012, h * 0.176); g.fillRect(w * 0.58, h * 0.395, w * 0.3, h * 0.008);
    // short curtains
    g.fillStyle = '#ff9fbd'; g.fillRect(w * 0.55, h * 0.285, w * 0.36, h * 0.022);
    for (let i = 0; i < 6; i++) { g.beginPath(); g.arc(w * (0.58 + i * 0.06), h * 0.307, w * 0.03, 0, Math.PI); g.fill(); }
    // two shelves with jars
    for (const sy of [0.36, 0.5]) {
      g.fillStyle = '#e8a56a'; g.fillRect(w * 0.08, h * sy, w * 0.38, h * 0.014);
      const jars = sy < 0.4 ? ['#ff8fb1', '#ffd21f', '#8fd9a8'] : ['#9fd0ff', '#ffb48a', '#c9a6ff'];
      jars.forEach((c, i) => {
        const x = w * (0.11 + i * 0.12), jw = w * 0.075, jh = h * (0.05 + (i % 2) * 0.012);
        g.fillStyle = c; g.fillRect(x, h * sy - jh, jw, jh);
        g.fillStyle = 'rgba(255,255,255,.55)'; g.fillRect(x + jw * 0.15, h * sy - jh * 0.85, jw * 0.18, jh * 0.6);
        g.fillStyle = '#fff'; g.fillRect(x - 3, h * sy - jh - 9, jw + 6, 10);
      });
    }
    // the skirting above the floor
    g.fillStyle = '#ffd3a6'; g.fillRect(0, h * 0.84, w, h * 0.16); g.fillStyle = '#ffe9c9'; g.fillRect(0, h * 0.84, w, h * 0.012);
  },
  models: {
    fridge(g, K) {
      const m = K.mat(0xa8e6d4, 0.35), d = K.mat(0x7fcdb8, 0.35), s = K.mat(0xffffff, 0.3);
      K.add(g, 'box', m, [0, 1.65, 0], [1.35, 3.3, 1.0]); K.add(g, 'box', d, [0, 2.3, 0.5], [1.35, 0.06, 0.04]);
      K.add(g, 'box', s, [-0.48, 2.75, 0.54], [0.1, 0.5, 0.08]); K.add(g, 'box', s, [-0.48, 1.6, 0.54], [0.1, 0.8, 0.08]);
      K.add(g, 'ball', K.mat(0xff8fb1), [0.3, 2.8, 0.52], [0.14, 0.14, 0.04]); K.add(g, 'ball', K.mat(0xffd21f), [0.1, 1.9, 0.52], [0.12, 0.12, 0.04]);
    },
    stove(g, K) {
      const m = K.mat(0xffffff, 0.4), d = K.mat(0x5a6478, 0.3), pot = K.mat(0xff7a8c, 0.3);
      K.add(g, 'box', m, [0, 0.7, 0], [1.5, 1.4, 1.0]); K.add(g, 'box', K.mat(0xffd9e6, 0.5), [0, 1.44, 0], [1.56, 0.1, 1.06]);
      K.add(g, 'box', d, [0, 0.55, 0.5], [1.0, 0.6, 0.04]); K.add(g, 'box', K.mat(0xffc46b, 0.2), [0, 0.55, 0.52], [0.8, 0.4, 0.02]);
      for (const x of [-0.5, 0, 0.5]) K.add(g, 'ball', K.mat(0xff8fb1), [x, 1.14, 0.52], [0.09, 0.09, 0.05]);
      K.add(g, 'tube', pot, [0.3, 1.74, 0], [0.4, 0.5, 0.4]); K.add(g, 'tube', K.mat(0xffffff, 0.3), [0.3, 2.02, 0], [0.43, 0.06, 0.43]); K.add(g, 'ball', pot, [0.3, 2.1, 0], 0.08);
    },
    stool(g, K) {
      const w = K.mat(0xffc46b, 0.7), c = K.mat(0xff8fb1, 0.8);
      K.add(g, 'tube', c, [0, 0.84, 0], [0.5, 0.12, 0.5]); K.add(g, 'tube', w, [0, 0.75, 0], [0.44, 0.08, 0.44]);
      for (let i = 0; i < 3; i++) { const a = i / 3 * Math.PI * 2 + 0.5; K.add(g, 'tube', w, [Math.cos(a) * 0.32, 0.37, Math.sin(a) * 0.32], [0.06, 0.74, 0.06]); }
    },
    table(g, K) {
      const w = K.mat(0xffc46b, 0.7), c = K.mat(0x9fd0ff, 0.9);
      K.add(g, 'tube', w, [0, 0.55, 0], [0.12, 1.1, 0.12]); K.add(g, 'tube', w, [0, 0.05, 0], [0.5, 0.1, 0.5]);
      K.add(g, 'tube', c, [0, 1.14, 0], [0.85, 0.12, 0.85]); K.add(g, 'tube', K.mat(0xffffff, 0.9), [0, 1.16, 0], [0.6, 0.1, 0.6]);
      K.add(g, 'ball', K.mat(0xff8fb1, 0.3), [0, 1.5, 0], [0.34, 0.3, 0.34]); K.add(g, 'ball', K.mat(0xffffff, 0.3), [0, 1.82, 0], 0.07);
      K.add(g, 'tube', K.mat(0xff8fb1, 0.3), [0.36, 1.56, 0], [0.05, 0.3, 0.05], [0, 0, -0.9]);
    },
    // a big wobbly pudding on a plate: the soft place to land
    pudding(g, K) {
      const pink = K.mat(0xff9fbd, 0.5), cream = K.mat(0xfffaf0, 0.6), red = K.mat(0xff4d5e, 0.25);
      K.add(g, 'tube', K.mat(0xffffff, 0.3), [0, 0.05, 0], [1.3, 0.1, 1.0]);
      K.add(g, 'tube', pink, [0, 0.45, 0], [1.08, 0.72, 0.85]); K.add(g, 'tube', cream, [0, 0.86, 0], [1.14, 0.16, 0.9]);
      for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; K.add(g, 'ball', cream, [Math.cos(a) * 1.08, 0.74, Math.sin(a) * 0.85], [0.2, 0.26, 0.16]); }
      for (const x of [-0.85, 0.85]) K.add(g, 'ball', red, [x, 1.02, 0.25], 0.13);
      return { spin: false, update(A) { const k = 1 + Math.sin(A.time * 3) * 0.015; g.scale.set(A.base * (2 - k), A.base * k, A.base * (2 - k)); } };
    },
  },
  levels: [
    // a hungry bear: the honey is the snack; the pot becomes a hat and the flour makes a sneeze
    { id: 'kitchen_honey', prompt: 'p_snack', hero: { model: 'bear', x: 0, y: 1.0, s: 1 }, props: [FRIDGE, STOVE], boxes: [HEAD],
      items: [
        { id: 'honey', result: 'win', rope: rope(X3[0], YELLOW), body: thing('honey', X3[0], 6.0, 0.46), goal: at(-0.05, 2.5), fx: 'hearts', sound: 'munch', react: 'happy', pop: true, sticker: '🍯' },
        { id: 'pot', result: 'gag', rope: rope(X3[1], RED), body: thing('pot', X3[1], 6.3, 0.46, { m: 1.2, rest: 0.1 }), goal: at(0, 2.31, 0.3), fx: 'stars', sound: 'thud', react: 'dizzy', sticker: '🍲' },
        { id: 'flour', result: 'gag', rope: rope(X3[2], BLUE), body: thing('sack', X3[2], 6.0, 0.44), goal: at(0.05, 2.5), fx: 'flour', sound: 'puff', react: 'sneeze', tint: 0xffffff, pop: true, burst: 2, sticker: '🤧' },
      ] },
    // a sleepy cat: only the bell wakes it; the pillow and the little shower let it sleep on
    { id: 'kitchen_nap', prompt: 'p_wake', hero: { model: 'cat', x: 0, y: 1.0, s: 1, asleep: true }, props: [TABLE, STOVE],
      items: [
        { id: 'pillow', result: 'gag', rope: rope(X3[0], PURPLE), body: thing('pillow', X3[0], 6.0, 0.5), goal: at(-0.05, 2.5), fx: 'flour', sound: 'puff', react: 'sleep', pop: true, sticker: '😴' },
        { id: 'cloud', result: 'gag', rope: rope(X3[1], BLUE), body: thing('cloud', X3[1], 6.3, 0.5, { m: 0.7 }), goal: at(0, 3.0), fx: 'rain', sound: 'splash', react: 'shiver', tint: 0x8fd0ff, pop: true, sticker: '🌧️' },
        { id: 'bell', result: 'win', rope: rope(X3[2], YELLOW), body: thing('bell', X3[2], 6.0, 0.44), goal: at(0.05, 2.5), fx: 'stars', sound: 'bell', react: 'happy', set: 'wake', pop: true, sticker: '🔔' },
      ] },
    // a mouse hangs over the pudding: a soft landing. The flour puffs on the floor, the pot clangs on the stool
    { id: 'kitchen_mouse', prompt: 'p_land', hero: 'mouse',
      props: [FRIDGE, { model: 'pudding', x: 0, y: 0 }, { id: 'stool', model: 'stool', x: 2.2, y: 0 }],
      boxes: [{ x0: -1.1, y0: 0, x1: 1.1, y1: 0.94, rest: 0.25 }, { x0: 1.7, y0: 0, x1: 2.7, y1: 0.9, rest: 0.1 }],
      items: [
        { id: 'flour', result: 'gag', rope: rope(-2.2, BLUE), body: thing('sack', -2.2, 6.0, 0.44), goal: at(-2.2, 0.44, 0.45), fx: 'flour', sound: 'puff', react: 'sneeze', pop: true, burst: 2, sticker: '🤧' },
        { id: 'mouse', result: 'win', rope: rope(0, GREEN), body: thing('mouse', 0, 5.6, 0.56, { m: 1, rest: 0.25 }), goal: at(0, 1.5, 0.5), fx: 'hearts', sound: 'land', react: 'happy', sticker: '🐭' },
        { id: 'pot', result: 'gag', rope: rope(2.2, RED), body: thing('pot', 2.2, 6.1, 0.46, { m: 1.2, rest: 0.1 }), goal: at(2.2, 1.36, 0.5), fx: 'stars', sound: 'thud', react: 'laugh', propReact: ['stool', 'bounce'], sticker: '🥁' },
      ] },
    // a panda with a dirty face: the water washes it; cake and honey only make it messier
    { id: 'kitchen_panda', prompt: 'p_wash', hero: { model: 'panda', x: 0, y: 1.0, s: 1, muddy: true }, props: [FRIDGE, { model: 'stool', x: 2.4, y: 0, z: -1.0 }],
      items: [
        { id: 'cake', result: 'gag', rope: rope(X3[0], RED), body: thing('cake', X3[0], 6.0, 0.48), goal: at(-0.05, 2.5), fx: 'flour', sound: 'puff', react: 'laugh', pop: true, sticker: '🍰' },
        { id: 'honey', result: 'gag', rope: rope(X3[1], YELLOW), body: thing('honey', X3[1], 6.3, 0.46), goal: at(0, 2.5), fx: 'stars', sound: 'squeak', react: 'dizzy', pop: true, sticker: '🍯' },
        { id: 'water', result: 'win', rope: rope(X3[2], BLUE), body: thing('bucket', X3[2], 6.0, 0.48), goal: at(0.05, 2.6), fx: 'splash', sound: 'splash', react: 'happy', untint: true, pop: true, burst: 2, sticker: '🐼' },
      ] },
    // a chick under a balloon cage tied to a floor peg: cut the peg rope and the cage flies away
    { id: 'kitchen_chick', prompt: 'p_free', hero: { model: 'chick', x: 0, y: 0.72, s: 0.72 }, props: [TABLE, STOVE],
      items: [
        { id: 'cage', result: 'win', rope: rope(-2.2, RED, 0.12), body: thing('liftCage', 0, 1.0, 1.0, { m: 1, lift: 30 }), goal: at(0, 10.5, 1.4), fx: 'hearts', sound: 'boing', react: 'happy', pop: true, fxAt: [0, 1.2], sticker: '🐥' },
        { id: 'flour', result: 'gag', rope: rope(-1.9, BLUE), body: thing('sack', -1.9, 6.2, 0.44), goal: at(-0.05, 3.1), fx: 'flour', sound: 'puff', react: 'sneeze', pop: true, burst: 2, sticker: '🤧' },
        { id: 'cheese', result: 'gag', rope: rope(1.9, YELLOW), body: thing('cheese', 1.9, 6.2, 0.44, { rest: 0.4 }), goal: at(1.9, 0.44, 0.5), fx: 'stars', sound: 'boing', react: 'wow', sticker: '🧀' },
      ] },
  ],
};
