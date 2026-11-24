// PROTOTYPE - NOT FOR PRODUCTION
// Snip It world: the farm. Pack shape: see w_room.js; level fields: see levels.js. The last two levels of this
// world hang FOUR things: one fixes the scene, the others end in a funny mess.
import { RED, BLUE, YELLOW, GREEN, PURPLE, X3, X4, rope, thing, at } from './palette.js';

const RAIL = { model: 'farmRail', x: 0, y: 0 };
// the hero's head is solid, so a bouncy thing hops off it
const head = (top) => ({ x0: -0.45, y0: 0, x1: 0.45, y1: top, rest: 0.6 });

export default {
  id: 'farm', icon: '🚜', sky: 0x7fd0ff, floor: [0x9bdc5c, 0x8a5a33], beam: 0x9b6431, ambient: ['mote', 1.2, 1],
  wall(g, w, h) {
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#7fd0ff'); gr.addColorStop(0.8, '#d6f4ff'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    // sun and clouds
    g.fillStyle = '#fff3a8'; g.beginPath(); g.arc(w * 0.82, h * 0.3, 56, 0, 7); g.fill(); g.fillStyle = '#ffe14d'; g.beginPath(); g.arc(w * 0.82, h * 0.3, 40, 0, 7); g.fill();
    g.fillStyle = '#fff'; for (const [x, y, s] of [[0.12, 0.34, 0.9], [0.48, 0.44, 0.7]]) { g.beginPath(); g.arc(w * x, h * y, 30 * s, 0, 7); g.arc(w * x + 34 * s, h * y - 10 * s, 38 * s, 0, 7); g.arc(w * x + 72 * s, h * y, 28 * s, 0, 7); g.fill(); }
    // far hills
    g.fillStyle = '#a5e67a'; g.beginPath(); g.ellipse(w * 0.75, h * 0.86, w * 0.5, h * 0.14, 0, 0, 7); g.fill();
    g.fillStyle = '#8ede6a'; g.beginPath(); g.ellipse(w * 0.15, h * 0.9, w * 0.5, h * 0.15, 0, 0, 7); g.fill();
    // the red barn
    const bx = w * 0.12, bw = w * 0.34, by = h * 0.63, bh = h * 0.2;
    g.fillStyle = '#e2483d'; g.fillRect(bx, by, bw, bh);
    g.beginPath(); g.moveTo(bx - 10, by + 2); g.lineTo(bx + bw * 0.22, by - h * 0.07); g.lineTo(bx + bw * 0.78, by - h * 0.07); g.lineTo(bx + bw + 10, by + 2); g.closePath(); g.fill();
    g.strokeStyle = '#fff'; g.lineWidth = 7; g.lineJoin = 'round'; g.beginPath(); g.moveTo(bx - 10, by + 2); g.lineTo(bx + bw * 0.22, by - h * 0.07); g.lineTo(bx + bw * 0.78, by - h * 0.07); g.lineTo(bx + bw + 10, by + 2); g.stroke();
    const dx = bx + bw * 0.3, dw = bw * 0.4, dy = by + bh * 0.35, dh = bh * 0.65;
    g.fillStyle = '#b8332b'; g.fillRect(dx, dy, dw, dh); g.strokeRect(dx, dy, dw, dh);
    g.lineWidth = 5; g.beginPath(); g.moveTo(dx, dy); g.lineTo(dx + dw, dy + dh); g.moveTo(dx + dw, dy); g.lineTo(dx, dy + dh); g.stroke();
    g.fillStyle = '#fff'; g.beginPath(); g.arc(bx + bw * 0.5, by - h * 0.012, 17, 0, 7); g.fill(); g.fillStyle = '#5a3a2a'; g.beginPath(); g.arc(bx + bw * 0.5, by - h * 0.012, 11, 0, 7); g.fill();
    // a round tree and the near hill
    g.fillStyle = '#8a5a33'; g.fillRect(w * 0.74, h * 0.68, 16, h * 0.14); g.fillStyle = '#4fbf4a'; g.beginPath(); g.arc(w * 0.74 + 8, h * 0.66, 46, 0, 7); g.fill();
    g.fillStyle = '#ff5f5f'; for (const [x, y] of [[-18, -10], [16, 6], [-2, 22]]) { g.beginPath(); g.arc(w * 0.74 + 8 + x, h * 0.66 + y, 7, 0, 7); g.fill(); }
    g.fillStyle = '#6fcf55'; g.beginPath(); g.ellipse(w * 0.5, h * 1.0, w * 0.8, h * 0.19, 0, 0, 7); g.fill();
  },
  models: {
    // a wooden fence along the back
    farmRail(g, K) { const m = K.mat(0xc98a4e, 0.8), d = K.mat(0xa56a35, 0.8); for (let i = -4; i <= 4; i++) K.add(g, 'box', d, [i * 0.8, 0.55, -1.0], [0.22, 1.1, 0.14]); K.add(g, 'box', m, [0, 0.82, -0.94], [6.8, 0.16, 0.08]); K.add(g, 'box', m, [0, 0.42, -0.94], [6.8, 0.16, 0.08]); },
    // a bale of straw, soft to land on
    hayBale(g, K) { const m = K.mat(0xf2cf5a, 0.95), d = K.mat(0xd9a93a, 0.95), band = K.mat(0xc94f3d, 0.7); K.add(g, 'box', m, [0, 0.45, 0], [2.0, 0.9, 1.3]); for (const x of [-0.55, 0.55]) K.add(g, 'box', band, [x, 0.45, 0], [0.1, 0.94, 1.34]); for (const [x, y] of [[-0.8, 0.3], [0, 0.62], [0.82, 0.24], [-0.2, 0.2]]) K.add(g, 'box', d, [x, y, 0.66], [0.3, 0.04, 0.02]); K.add(g, 'ball', m, [-1.15, 0.1, 0.4], [0.3, 0.1, 0.2]); K.add(g, 'ball', m, [1.2, 0.08, 0.2], [0.26, 0.08, 0.2]); },
    // a drinking trough full of water
    farmTrough(g, K) { const m = K.mat(0xb07a45, 0.8), d = K.mat(0x8a5a33, 0.8); K.add(g, 'box', m, [0, 0.42, 0], [1.2, 0.5, 0.8]); K.add(g, 'box', K.mat(0x4fb4ff, 0.15), [0, 0.66, 0], [1.04, 0.06, 0.64]); for (const x of [-0.48, 0.48]) for (const z of [-0.3, 0.3]) K.add(g, 'box', d, [x, 0.1, z], [0.14, 0.2, 0.14]); },
    // a mud puddle (o.dry: a dried-up pond, pale and cracked)
    mudPuddle(g, K, o) {
      const rim = K.mat(o.dry ? 0xc9a66b : 0x7a5230, 0.9), mid = K.mat(o.dry ? 0xe8cf9a : 0x5e3d22, o.dry ? 0.95 : 0.3), line = K.mat(0xa5804a, 0.9);
      K.add(g, 'tube', rim, [0, 0.05, 0.2], [1.5, 0.1, 1.0]); K.add(g, 'tube', mid, [0, 0.08, 0.2], [1.25, 0.1, 0.8]);
      if (o.dry) for (const [x, z, r] of [[-0.6, 0.5, 0.5], [0.5, 0.6, -0.6], [0.75, 0.1, 0.3], [-0.8, 0.0, -0.4], [0.1, 0.75, 0.1]]) K.add(g, 'box', line, [x, 0.135, z], [0.4, 0.01, 0.04], [0, r, 0]);
      else for (const [x, z, s] of [[-1.5, 0.7, 0.22], [1.45, 0.75, 0.16], [1.7, 0.3, 0.12]]) K.add(g, 'tube', mid, [x, 0.03, z], [s, 0.05, s * 0.7]);
    },
    // the water that fills the pond again
    farmWater(g, K) { K.add(g, 'tube', K.mat(0x4fb4ff, 0.12), [0, 0.13, 0.2], [1.27, 0.12, 0.82]); K.add(g, 'ball', K.mat(0xbfe9ff, 0.1), [-0.7, 0.2, 0.6], [0.26, 0.02, 0.1]); K.add(g, 'ball', K.mat(0xbfe9ff, 0.1), [0.75, 0.2, 0.45], [0.2, 0.02, 0.08]); },
  },
  levels: [
    // a muddy pig in its puddle: the rain cloud washes it
    { id: 'farm_mud', prompt: 'p_wash', hero: { model: 'pig', x: 0, y: 1.0, s: 1, muddy: true }, props: [RAIL, { model: 'mudPuddle', x: 0, y: 0 }],
      boxes: [head(1.85)],
      items: [
        { id: 'cloud', result: 'win', rope: rope(X3[0], BLUE), body: thing('cloud', X3[0], 6.0, 0.5, { m: 0.7 }), goal: at(-0.05, 3.0), fx: 'rain', sound: 'splash', react: 'happy', untint: true, pop: true, burst: 2, sticker: '🐷' },
        { id: 'pillow', result: 'gag', rope: rope(X3[1], YELLOW), body: thing('pillow', X3[1], 6.3, 0.5), goal: at(0, 2.5), fx: 'flour', sound: 'puff', react: 'sneeze', pop: true, sticker: '🪶' },
        { id: 'ball', result: 'gag', rope: rope(X3[2], RED), body: thing('ball', X3[2], 6.0, 0.46, { m: 0.7, rest: 0.75 }), goal: at(0.1, 2.5), fx: 'stars', sound: 'boing', react: 'dizzy', sticker: '💫' },
      ] },
    // a hungry bunny: only the carrot is bunny food
    { id: 'farm_carrot', prompt: 'p_snack', hero: { model: 'bunny', x: 0, y: 1.0, s: 1 }, props: [RAIL, { model: 'hayBale', x: -2.2, y: 0, z: -0.5, s: 0.8 }],
      items: [
        { id: 'bone', result: 'gag', rope: rope(X3[0], RED), body: thing('bone', X3[0], 6.0, 0.46), goal: at(-0.05, 2.5), fx: 'stars', sound: 'squeak', react: 'wow', pop: true, sticker: '🦴' },
        { id: 'honey', result: 'gag', rope: rope(X3[1], BLUE), body: thing('honey', X3[1], 6.3, 0.46), goal: at(0, 2.5), fx: 'splash', sound: 'puff', react: 'shiver', tint: 0xffc61a, pop: true, sticker: '🍯' },
        { id: 'carrot', result: 'win', rope: rope(X3[2], YELLOW), body: thing('carrot', X3[2], 6.0, 0.46), goal: at(0.05, 2.5), fx: 'hearts', sound: 'munch', react: 'happy', pop: true, sticker: '🥕' },
      ] },
    // a chick hangs over a hay bale: its own rope gives it a soft landing
    { id: 'farm_hay', prompt: 'p_land', hero: 'chick', props: [RAIL, { model: 'hayBale', x: 0, y: 0 }, { id: 'trough', model: 'farmTrough', x: -2.1, y: 0 }],
      boxes: [{ x0: -1.0, y0: 0, x1: 1.0, y1: 0.9, rest: 0.2 }, { x0: -2.7, y0: 0, x1: -1.5, y1: 0.7 }],
      items: [
        { id: 'bucket', result: 'gag', rope: rope(-2.1, BLUE), body: thing('bucket', -2.1, 6.0, 0.46), goal: at(-2.1, 1.16, 0.55), fx: 'splash', sound: 'splash', react: 'laugh', pop: true, burst: 2, propReact: ['trough', 'bounce'], sticker: '💦' },
        { id: 'chick', result: 'win', rope: rope(0, RED), body: thing('chick', 0, 5.6, 0.56, { m: 1, rest: 0.2 }), goal: at(0, 1.46, 0.5), fx: 'hearts', sound: 'land', react: 'happy', sticker: '🐥' },
        { id: 'apple', result: 'gag', rope: rope(2.2, YELLOW), body: thing('apple', 2.2, 6.1, 0.42, { rest: 0.5 }), goal: at(2.2, 0.42, 0.5), fx: 'stars', sound: 'boing', react: 'wow', sticker: '🍎' },
      ] },
    // a sleepy owl on a hay bale: four ropes, only the bell wakes it
    { id: 'farm_owl', prompt: 'p_wake', hero: { model: 'owl', x: 0, y: 1.75, s: 0.85, asleep: true }, props: [RAIL, { model: 'hayBale', x: 0, y: 0 }],
      boxes: [{ x0: -1.0, y0: 0, x1: 1.0, y1: 0.9, rest: 0.3 }, head(2.45)],
      items: [
        { id: 'pillow', result: 'gag', rope: rope(X4[0], BLUE), body: thing('pillow', X4[0], 6.0, 0.48), goal: at(-0.05, 3.1), fx: 'flour', sound: 'puff', react: 'sleep', pop: true, sticker: '😴' },
        { id: 'bell', result: 'win', rope: rope(X4[1], YELLOW), body: thing('bell', X4[1], 6.3, 0.44), goal: at(0, 3.1), fx: 'stars', sound: 'bell', react: 'happy', set: 'wake', pop: true, sticker: '🦉' },
        { id: 'cake', result: 'gag', rope: rope(X4[3], RED), body: thing('cake', X4[3], 6.0, 0.46), goal: at(0, 3.1), fx: 'flour', sound: 'puff', react: 'sneeze', tint: 0xffd9e6, pop: true, sticker: '🍰' },
        { id: 'ball', result: 'gag', rope: rope(X4[2], GREEN), body: thing('ball', X4[2], 6.3, 0.44, { m: 0.7, rest: 0.75 }), goal: at(0.4, 3.1, 0.7), fx: 'stars', sound: 'boing', react: 'dizzy', sticker: '💫' },
      ] },
    // a thirsty duck in a dried-up pond: four ropes, only the bucket of water fills it
    { id: 'farm_pond', prompt: 'p_water', hero: { model: 'duck', x: 0, y: 0.95, s: 0.85, tint: 0xd9a05a }, props: [RAIL, { model: 'mudPuddle', x: 0, y: 0, dry: true }, { id: 'water', model: 'farmWater', x: 0, y: 0, hidden: true }],
      items: [
        { id: 'ice', result: 'gag', rope: rope(X4[0], PURPLE), body: thing('ice', X4[0], 6.0, 0.44, { m: 1.2 }), goal: at(-0.05, 2.35), fx: 'stars', sound: 'thud', react: 'shiver', pop: true, sticker: '🥶' },
        { id: 'hat', result: 'gag', rope: rope(X4[1], RED), body: thing('hat', X4[1], 6.3, 0.46), goal: at(0, 2.35), fx: 'confetti', sound: 'horn', react: 'laugh', pop: true, sticker: '🎩' },
        { id: 'sack', result: 'gag', rope: rope(X4[2], YELLOW), body: thing('sack', X4[2], 6.3, 0.44), goal: at(0, 2.35), fx: 'flour', sound: 'puff', react: 'sneeze', pop: true, sticker: '🤧' },
        { id: 'bucket', result: 'win', rope: rope(X4[3], BLUE), body: thing('bucket', X4[3], 6.0, 0.48, { m: 1 }), goal: at(0.05, 2.35), fx: 'splash', sound: 'splash', react: 'happy', untint: true, show: ['water'], pop: true, burst: 2, sticker: '🦆' },
      ] },
  ],
};
