// PROTOTYPE - NOT FOR PRODUCTION
// Snip It last world: the toy shop. Pack shape: see w_room.js; level fields: see levels.js. Every level here has
// four ropes. Two levels ask for one rope before another ("One first!"), one has a rocket that is lighter than
// air and tied to a floor peg, and the last one is the big party that ends the game.
import { RED, BLUE, YELLOW, GREEN, PURPLE, X4, rope, thing, at } from './palette.js';

const BLOCKS_L = { model: 'toyBlocks', x: -2.55, y: 0, z: -1.2 }, BLOCKS_R = { model: 'toyBlocks', x: 2.55, y: 0, z: -1.2 };
const TRAIN_BACK = { model: 'toyTrain', x: 1.9, y: 0, z: -1.3, awake: true };

export default {
  id: 'toyshop', icon: '🧸', sky: 0xffd27a, floor: [0xffe2b0, 0xe8604f], beam: 0xd9483b, ambient: ['mote', 1.2, 1],
  wall(g, w, h) {
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#ffd27a'); gr.addColorStop(1, '#ff9f6b'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(255,255,255,.16)'; for (let x = 0; x < w; x += 48) g.fillRect(x, 0, 22, h);
    // three shelves of toys: balls, block stacks and teddies
    const toys = ['#ff4d5e', '#2f9bff', '#ffc61a', '#3fcf6a', '#a86bff', '#ff8fb1'];
    g.globalAlpha = 0.42;
    [0.36, 0.52, 0.68].forEach((sy, row) => {
      const y = h * sy; g.fillStyle = '#a8622d'; g.fillRect(w * 0.16, y, w * 0.68, 12); g.fillStyle = '#8a4a1f'; g.fillRect(w * 0.16, y + 12, w * 0.68, 5);
      for (let i = 0; i < 6; i++) {
        const x = w * (0.21 + i * 0.116), k = (i + row) % 3; g.fillStyle = toys[(i + row * 2) % 6];
        if (k === 0) { g.beginPath(); g.arc(x, y - 20, 20, 0, 7); g.fill(); g.fillStyle = 'rgba(255,255,255,.55)'; g.beginPath(); g.arc(x - 7, y - 27, 6, 0, 7); g.fill(); }
        else if (k === 1) { g.fillRect(x - 18, y - 30, 36, 30); g.fillStyle = toys[(i + row * 2 + 3) % 6]; g.fillRect(x - 11, y - 52, 22, 22); }
        else { g.beginPath(); g.arc(x, y - 18, 18, 0, 7); g.fill(); g.beginPath(); g.arc(x, y - 44, 13, 0, 7); g.fill(); g.beginPath(); g.arc(x - 11, y - 55, 6, 0, 7); g.fill(); g.beginPath(); g.arc(x + 11, y - 55, 6, 0, 7); g.fill(); }
      }
    });
    g.globalAlpha = 1;
    // checkered tiles along the bottom of the wall
    for (let i = 0; i < 16; i++) for (let j = 0; j < 3; j++) { g.fillStyle = (i + j) % 2 ? '#fff3d6' : '#ff6b5e'; g.fillRect(i * 32, h * 0.75 + j * 32, 32, 32); }
  },
  models: {
    // a toy train with a sleepy face; it wakes up for good when it is made 'happy' (or starts awake: o.awake)
    toyTrain(g, K, o) {
      const t = K.group(); g.add(t);
      const red = K.mat(0xff4d5e, 0.5), blue = K.mat(0x2f9bff, 0.5), yel = K.mat(0xffc61a, 0.5), dark = K.mat(0x3a3350, 0.5), white = K.mat(0xffffff, 0.3), black = K.mat(0x2a1b2e, 0.3), lamp = K.mat(0x8a94a6, 0.3);
      K.add(t, 'box', red, [0, 0.42, 0], [1.6, 0.34, 0.7]);
      K.add(t, 'tube', K.mat(0x3fcf6a, 0.5), [0.25, 0.86, 0], [0.3, 0.95, 0.3], [0, 0, Math.PI / 2]);
      K.add(t, 'box', blue, [-0.5, 0.95, 0], [0.56, 0.75, 0.72]); K.add(t, 'box', yel, [-0.5, 1.36, 0], [0.7, 0.1, 0.8]); K.add(t, 'box', white, [-0.5, 1.05, 0.37], [0.32, 0.3, 0.02]);
      K.add(t, 'tube', dark, [0.5, 1.28, 0], [0.1, 0.3, 0.1]); K.add(t, 'tube', yel, [0.5, 1.45, 0], [0.14, 0.08, 0.14]);
      for (const x of [-0.5, 0.05, 0.55]) { K.add(t, 'tube', dark, [x, 0.22, 0.36], [0.22, 0.1, 0.22], [Math.PI / 2, 0, 0]); K.add(t, 'ball', yel, [x, 0.22, 0.42], 0.07); }
      K.add(t, 'ball', lamp, [0.74, 0.86, 0], 0.13);
      const eyes = [0.08, 0.44].map((x) => { const e = K.add(t, 'ball', white, [x, 0.94, 0.3], [0.1, 0.12, 0.05]); K.add(e, 'ball', black, [0, 0, 0.6], 0.5); return e; });
      const mouth = K.add(t, 'ball', black, [0.26, 0.74, 0.31], [0.07, 0.025, 0.03]);
      const cell = K.add(t, 'tube', K.mat(0x57d86b, 0.3), [-0.5, 1.52, 0], [0.11, 0.5, 0.11], [0, 0, Math.PI / 2]); cell.visible = false;
      let go = !!o.awake, on = go ? 1 : 0;
      return { spin: false, update(A, dt) {
        if (A.mood === 'happy') go = true;
        if (go && on < 1) on = Math.min(1, on + dt * 3);
        for (const e of eyes) e.scale.set(0.1, 0.12 * (0.15 + 0.85 * on), 0.05);
        mouth.scale.set(0.07 + 0.06 * on, 0.025 + 0.05 * on, 0.03);
        lamp.color.setHex(on > 0.5 ? 0xfff06a : 0x8a94a6); cell.visible = go && !o.awake;
        t.position.set(go ? Math.sin(A.time * 3) * 0.1 : 0, go ? Math.abs(Math.sin(A.time * 9)) * 0.04 : 0, 0);
      } };
    },
    toyChest(g, K) {
      const y = K.mat(0xffc61a, 0.4);
      K.add(g, 'box', K.mat(0xff9a3c, 0.7), [0, 0.36, 0], [1.7, 0.72, 0.9]); K.add(g, 'box', K.mat(0xff4d5e, 0.7), [0, 0.76, 0], [1.8, 0.12, 1.0]);
      for (const x of [-0.6, 0.6]) K.add(g, 'box', y, [x, 0.4, 0.46], [0.14, 0.82, 0.02]);
      K.add(g, 'ball', y, [0, 0.6, 0.48], 0.1);
    },
    toyBlocks(g, K) {
      K.add(g, 'box', K.mat(0xff4d5e), [-0.28, 0.25, 0], 0.5); K.add(g, 'box', K.mat(0x2f9bff), [0.28, 0.25, 0], 0.5);
      K.add(g, 'box', K.mat(0xffc61a), [0, 0.75, 0], 0.5, [0, 0.4, 0]); K.add(g, 'box', K.mat(0x3fcf6a), [0.03, 1.25, 0], 0.5, [0, -0.3, 0]);
      K.add(g, 'cone', K.mat(0xa86bff), [0.03, 1.75, 0], [0.32, 0.5, 0.32]);
    },
    // a toy rocket, lighter than air: tied to a floor peg, it shows its flame once it is off the ground
    toyRocket(g, K) {
      const red = K.mat(0xff4d5e, 0.4), blue = K.mat(0x2f9bff, 0.3);
      K.add(g, 'tube', K.mat(0xffffff, 0.35), [0, -0.2, 0], [0.36, 1.1, 0.36]); K.add(g, 'cone', red, [0, 0.62, 0], [0.36, 0.56, 0.36]);
      K.add(g, 'tube', blue, [0, -0.62, 0], [0.37, 0.12, 0.37]);
      K.add(g, 'ball', K.mat(0xffc61a, 0.3), [0, 0.02, 0.3], [0.19, 0.19, 0.08]); K.add(g, 'ball', blue, [0, 0.02, 0.34], [0.13, 0.13, 0.07]);
      for (const s of [-1, 1]) K.add(g, 'box', red, [s * 0.44, -0.7, 0], [0.3, 0.5, 0.08], [0, 0, s * 0.4]);
      K.add(g, 'box', red, [0, -0.7, 0.4], [0.08, 0.5, 0.3], [-0.4, 0, 0]);
      const flame = K.group(); flame.position.set(0, -0.78, 0); g.add(flame); flame.visible = false;
      K.add(flame, 'cone', K.mat(0xff8a1f, 0.3), [0, -0.3, 0], [0.24, 0.6, 0.24], [Math.PI, 0, 0]); K.add(flame, 'cone', K.mat(0xfff06a, 0.3), [0, -0.2, 0.05], [0.13, 0.36, 0.13], [Math.PI, 0, 0]);
      let y0 = null;
      return { spin: false, update(A) {
        const y = A.group.position.y; if (y0 === null) y0 = y;
        flame.visible = y > y0 + 0.4; flame.scale.y = 1 + Math.sin(A.time * 40) * 0.25;
      } };
    },
    // party dress for the shop: a line of flags and two bunches of balloons
    toyParty(g, K) {
      const cs = [0xff4d5e, 0xffc61a, 0x2f9bff, 0x3fcf6a, 0xa86bff], ms = cs.map((c) => K.mat(c, 0.3)), white = K.mat(0xffffff);
      K.add(g, 'box', white, [0, 7.55, -1], [6.6, 0.04, 0.04]);
      for (let i = 0; i < 11; i++) K.add(g, 'cone', ms[i % 5], [-3 + i * 0.6, 7.3, -1], [0.24, 0.46, 0.04], [Math.PI, 0, 0]);
      for (const s of [-1, 1]) for (let i = 0; i < 3; i++) {
        const x = s * (2.95 - i * 0.3), y = 3.4 + (i % 2) * 0.55 + i * 0.1;
        K.add(g, 'tube', white, [x, y / 2, -0.9], [0.014, y, 0.014]); K.add(g, 'ball', ms[(i + (s > 0 ? 2 : 0)) % 5], [x, y + 0.3, -0.9], [0.32, 0.4, 0.32]);
      }
    },
  },
  levels: [
    // the toy train is asleep: only the battery wakes it up
    { id: 'toyshop_train', prompt: 'p_fix', hero: { model: 'cat', x: 1.1, y: 0.9, s: 0.9 },
      props: [BLOCKS_R, { id: 'train', model: 'toyTrain', x: -1.3, y: 0 }],
      boxes: [{ x0: -2.1, y0: 0, x1: -0.5, y1: 1.2, rest: 0.2 }],
      items: [
        { id: 'water', result: 'gag', rope: rope(X4[0], BLUE), body: thing('waterBalloon', X4[0], 6.0, 0.42, { m: 0.8 }), goal: at(-1.6, 1.62, 0.5), fx: 'splash', sound: 'splash', react: 'laugh', pop: true, propReact: ['train', 'dizzy'], sticker: '💦' },
        { id: 'battery', result: 'win', rope: rope(X4[1], GREEN), body: thing('battery', X4[1], 6.3, 0.44), goal: at(-1.1, 1.64, 0.5), fx: 'stars', sound: 'horn', react: 'happy', pop: true, burst: 2, propReact: ['train', 'happy'], sticker: '🚂' },
        { id: 'cake', result: 'gag', rope: rope(X4[2], RED), body: thing('cake', X4[2], 6.0, 0.48), goal: at(1.1, 2.3), fx: 'flour', sound: 'puff', react: 'laugh', tint: 0xffd9e6, pop: true, sticker: '🍰' },
        { id: 'ball', result: 'gag', rope: rope(X4[3], YELLOW), body: thing('ball', X4[3], 6.3, 0.46, { m: 0.7, rest: 0.75 }), goal: at(2.6, 0.46, 0.5), fx: 'stars', sound: 'boing', react: 'wow', sticker: '⚽' },
      ] },
    // the rocket wants to fly: the rope on the floor peg holds it down
    { id: 'toyshop_rocket', prompt: 'p_free', hero: { model: 'mouse', x: -1.6, y: 0.82, s: 0.82 },
      props: [BLOCKS_L, TRAIN_BACK],
      items: [
        { id: 'cake', result: 'gag', rope: rope(X4[0], YELLOW), body: thing('cake', X4[0], 6.0, 0.46), goal: at(-1.65, 2.2), fx: 'flour', sound: 'puff', react: 'laugh', tint: 0xffd9e6, pop: true, sticker: '🍰' },
        { id: 'water', result: 'gag', rope: rope(X4[1], BLUE), body: thing('waterBalloon', X4[1], 6.3, 0.42, { m: 0.8 }), goal: at(-1.55, 2.2), fx: 'splash', sound: 'splash', react: 'shiver', tint: 0x8fd0ff, pop: true, sticker: '💦' },
        { id: 'rocket', result: 'win', rope: rope(1.9, RED, 0.12), body: thing('toyRocket', 0, 1.2, 1.1, { m: 1, lift: 30 }), goal: at(0, 10.5, 1.4), fx: 'stars', sound: 'puff', react: 'happy', pop: true, burst: 2, fxAt: [0, 0.8], sticker: '🚀' },
        { id: 'ball', result: 'gag', rope: rope(X4[3], GREEN), body: thing('ball', X4[3], 6.0, 0.46, { m: 0.7, rest: 0.75 }), goal: at(2.6, 0.46, 0.5), fx: 'stars', sound: 'boing', react: 'wow', sticker: '⚽' },
      ] },
    // the panda is covered in paint, but the umbrella keeps the water off: the ball must knock it away first
    { id: 'toyshop_paint', prompt: 'p_first', hero: { model: 'panda', x: 0, y: 1.0, s: 1, tint: 0x6fd36f },
      props: [BLOCKS_L, BLOCKS_R, { id: 'umb', model: 'umbrella', x: 0, y: 2.75, s: 1.05 }],
      items: [
        { id: 'bucket', result: 'win', rope: rope(X4[0], BLUE), body: thing('bucket', X4[0], 6.3, 0.48, { m: 1 }), goal: at(-0.05, 2.5), fx: 'splash', sound: 'splash', react: 'happy', untint: true, pop: true, burst: 2, sticker: '🐼',
          needs: 'ball', early: { goal: at(-1.8, 0.48, 0.5), fx: 'splash', sound: 'splash', react: 'laugh', sticker: '☂️', untint: false, pop: false, burst: 1 } },
        { id: 'ball', result: 'gag', rope: rope(X4[1], RED), body: thing('ball', X4[1], 6.0, 0.46, { m: 0.7 }), goal: at(0, 3.5, 0.5), fx: 'stars', sound: 'boing', react: 'wow', pop: true, hide: ['umb'], sticker: '💫' },
        { id: 'ducks', result: 'gag', rope: rope(X4[2], YELLOW), body: thing('crate', X4[2], 6.3, 0.46), goal: at(1.7, 0.46, 0.5), fx: 'ducks', sound: 'squeak', react: 'laugh', pop: true, sticker: '🦆' },
        { id: 'anvil', result: 'gag', rope: rope(X4[3], PURPLE), body: thing('anvil', X4[3], 6.0, 0.48, { m: 2, rest: 0.1 }), goal: at(2.5, 0.48, 0.45), fx: 'stars', sound: 'thud', react: 'shiver', sticker: '😱' },
      ] },
    // the teddy wants down, but the chest is hard: the pillow must be on it first (it settles there as a cushion)
    { id: 'toyshop_jump', prompt: 'p_first', hero: 'bear',
      props: [BLOCKS_L, { model: 'toyChest', x: 0.8, y: 0 }, { id: 'soft', model: 'pillow', x: 0.8, y: 1.04, z: 0.1, s: 0.8, hidden: true }],
      boxes: [{ x0: -0.05, y0: 0, x1: 1.65, y1: 0.72, rest: 0.2 }],
      items: [
        { id: 'anvil', result: 'gag', rope: rope(X4[0], PURPLE), body: thing('anvil', X4[0], 6.0, 0.48, { m: 2, rest: 0.1 }), goal: at(-2.4, 0.48, 0.45), fx: 'stars', sound: 'thud', react: 'shiver', sticker: '😱' },
        { id: 'pillow', result: 'gag', rope: rope(X4[1], BLUE), body: thing('pillow', X4[1], 6.3, 0.6, { m: 0.8, rest: 0.1 }), goal: at(0.8, 1.32, 0.5), fx: 'flour', sound: 'puff', react: 'wow', pop: true, show: ['soft'], sticker: '🛏️' },
        { id: 'bear', result: 'win', rope: rope(X4[2], YELLOW), body: thing('bear', X4[2], 5.6, 0.56, { m: 1, rest: 0.2 }), goal: at(0.8, 1.28, 0.5), fx: 'hearts', sound: 'land', react: 'happy', burst: 2, sticker: '🧸',
          needs: 'pillow', early: { goal: at(0.8, 1.28, 0.5), fx: 'stars', sound: 'thud', react: 'dizzy', sticker: '💫', untint: false, pop: false, burst: 1 } },
        { id: 'water', result: 'gag', rope: rope(X4[3], RED), body: thing('waterBalloon', X4[3], 6.1, 0.42, { m: 0.8 }), goal: at(2.6, 0.42, 0.45), fx: 'splash', sound: 'splash', react: 'laugh', pop: true, sticker: '💦' },
      ] },
    // the last level of the game: the gift starts the party, and all the friends come out
    { id: 'toyshop_party', prompt: 'p_party', hero: { model: 'bunny', x: 0, y: 1.0, s: 1 },
      props: [{ model: 'toyBlocks', x: 2.6, y: 0, z: -1.5 }, { model: 'toyTrain', x: -1.9, y: 0, z: -1.5, awake: true },
        { id: 'party', model: 'toyParty', x: 0, y: 0, hidden: true },
        { id: 'pal1', model: 'monkey', x: -2.45, y: 0.8, z: -0.7, s: 0.8, hidden: true }, { id: 'pal2', model: 'bear', x: -1.3, y: 0.85, z: -0.7, s: 0.85, hidden: true },
        { id: 'pal3', model: 'cat', x: 1.3, y: 0.8, z: -0.7, s: 0.8, hidden: true }, { id: 'pal4', model: 'panda', x: 2.45, y: 0.8, z: -0.7, s: 0.8, hidden: true }],
      items: [
        { id: 'flour', result: 'gag', rope: rope(X4[0], YELLOW), body: thing('sack', X4[0], 6.3, 0.46), goal: at(-0.05, 2.5), fx: 'flour', sound: 'puff', react: 'sneeze', tint: 0xffffff, pop: true, sticker: '👻' },
        { id: 'ducks', result: 'gag', rope: rope(X4[1], BLUE), body: thing('crate', X4[1], 6.0, 0.46), goal: at(0, 2.5), fx: 'ducks', sound: 'squeak', react: 'laugh', pop: true, sticker: '🦆' },
        { id: 'ice', result: 'gag', rope: rope(X4[2], PURPLE), body: thing('ice', X4[2], 6.3, 0.44, { m: 1.2 }), goal: at(0, 2.5), fx: 'stars', sound: 'thud', react: 'shiver', tint: 0x8fd0ff, pop: true, sticker: '🥶' },
        { id: 'gift', result: 'win', rope: rope(X4[3], RED), body: thing('gift', X4[3], 6.0, 0.46), goal: at(0.05, 2.5), fx: 'confetti', sound: 'horn', react: 'happy', untint: true, pop: true, burst: 3, show: ['party', 'pal1', 'pal2', 'pal3', 'pal4'], sticker: '🎉' },
      ] },
  ],
};
