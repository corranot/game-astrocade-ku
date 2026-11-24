// PROTOTYPE - NOT FOR PRODUCTION
// Snip It world 1: the living room. A world pack is { id, sky, floor: [top, side], beam, ambient, wall(g, w, h),
// models: { name(g, K, o) }, levels: [5] }. Level and item fields are described in levels.js.
import { RED, BLUE, YELLOW, X3, rope, thing, at } from './palette.js';

export default {
  id: 'room', icon: '🛋️', sky: 0xffe9b8, floor: [0xf2a65a, 0xd98a3d], beam: 0xc98a4e, ambient: ['mote', 1.2, 1],
  wall(g, w, h) {
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#ffe9b8'); gr.addColorStop(1, '#ffd08a'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(255,255,255,.28)'; for (let x = 0; x < w; x += 64) g.fillRect(x, 0, 28, h);
    g.fillStyle = '#fff'; g.fillRect(w * 0.6, h * 0.3, w * 0.28, h * 0.2); g.fillStyle = '#9fe2ff'; g.fillRect(w * 0.62, h * 0.31, w * 0.24, h * 0.18);
    g.fillStyle = '#fff'; g.fillRect(w * 0.735, h * 0.31, w * 0.012, h * 0.18); g.beginPath(); g.arc(w * 0.68, h * 0.37, 22, 0, 7); g.arc(w * 0.71, h * 0.36, 28, 0, 7); g.arc(w * 0.75, h * 0.37, 20, 0, 7); g.fill();
    g.fillStyle = '#ff8fb1'; g.fillRect(w * 0.14, h * 0.34, w * 0.18, h * 0.11); g.fillStyle = '#fff6c9'; g.fillRect(w * 0.155, h * 0.35, w * 0.15, h * 0.09);
    g.fillStyle = '#ffc61a'; g.beginPath(); g.arc(w * 0.23, h * 0.395, 26, 0, 7); g.fill();
    g.fillStyle = '#f2a65a'; g.fillRect(0, h * 0.86, w, h * 0.14);
  },
  models: {
    sofa(g, K) { const m = K.mat(0xff8fb1, 0.8), d = K.mat(0xf2678f, 0.8); K.add(g, 'box', m, [0, 0.5, 0], [2.3, 1.0, 1.5]); K.add(g, 'box', d, [0, 1.25, -0.6], [2.5, 1.5, 0.4]); K.add(g, 'tube', d, [-1.2, 0.75, 0], [0.34, 1.5, 0.34], [Math.PI / 2, 0, 0]); K.add(g, 'tube', d, [1.2, 0.75, 0], [0.34, 1.5, 0.34], [Math.PI / 2, 0, 0]); K.add(g, 'ball', K.mat(0xfff06a, 0.8), [-0.6, 1.1, 0.2], [0.42, 0.3, 0.2]); },
    robot(g, K) { const m = K.mat(0xb8c4d6, 0.35), d = K.mat(0x6f7f99, 0.35); K.add(g, 'box', m, [0, 0.45, 0], [0.8, 0.7, 0.6]); K.add(g, 'box', m, [0, 1.02, 0], [0.62, 0.46, 0.5]); K.add(g, 'ball', K.mat(0x39f0ff, 0.1), [-0.14, 1.05, 0.26], 0.08); K.add(g, 'ball', K.mat(0x39f0ff, 0.1), [0.14, 1.05, 0.26], 0.08); K.add(g, 'tube', d, [0, 1.36, 0], [0.03, 0.22, 0.03]); K.add(g, 'ball', K.mat(0xff4d5e), [0, 1.5, 0], 0.07); K.add(g, 'box', d, [-0.5, 0.5, 0], [0.16, 0.5, 0.2]); K.add(g, 'box', d, [0.5, 0.5, 0], [0.16, 0.5, 0.2]); K.add(g, 'box', d, [-0.2, 0.06, 0.05], [0.26, 0.12, 0.4]); K.add(g, 'box', d, [0.2, 0.06, 0.05], [0.26, 0.12, 0.4]); },
    drum(g, K) { K.add(g, 'tube', K.mat(0xff5f5f), [0, 0.42, 0], [0.56, 0.8, 0.56]); K.add(g, 'tube', K.mat(0xfff7e6), [0, 0.84, 0], [0.58, 0.05, 0.58]); K.add(g, 'ring', K.mat(0xffc61a), [0, 0.8, 0], [0.56, 0.56, 0.3], [Math.PI / 2, 0, 0]); K.add(g, 'ring', K.mat(0xffc61a), [0, 0.06, 0], [0.56, 0.56, 0.3], [Math.PI / 2, 0, 0]); },
    rug(g, K) { K.add(g, 'tube', K.mat(0x7fc8ff, 0.95), [0, 0.03, 0.3], [1.9, 0.06, 1.2]); K.add(g, 'tube', K.mat(0xffffff, 0.95), [0, 0.04, 0.3], [1.5, 0.06, 0.9]); K.add(g, 'tube', K.mat(0xff8fb1, 0.95), [0, 0.05, 0.3], [1.0, 0.06, 0.6]); },
    pillows(g, K) { const cs = [0xbfe3ff, 0xffd9e6, 0xfff1a8]; cs.forEach((c, i) => K.add(g, 'ball', K.mat(c, 0.9), [(i - 1) * 0.55, 0.3 + (i === 1 ? 0.22 : 0), i === 1 ? 0.1 : 0], [0.7, 0.34, 0.6], [0, 0, (i - 1) * 0.15])); },
  },
  levels: [
    { id: 'kitty', prompt: 'p_kitty', hero: 'cat',
      props: [{ model: 'sofa', x: 0, y: 0 }, { id: 'robot', model: 'robot', x: -2.15, y: 0 }, { id: 'drum', model: 'drum', x: 2.15, y: 0 }],
      boxes: [{ x0: -1.15, y0: 0, x1: 1.15, y1: 1.0, rest: 0.45 }, { x0: -2.6, y0: 0, x1: -1.7, y1: 1.25 }, { x0: 1.6, y0: 0, x1: 2.7, y1: 0.85, rest: 0.6 }],
      items: [
        { id: 'cat', result: 'win', rope: rope(0, RED), body: thing('cat', 0, 5.5, 0.56, { m: 1, rest: 0.35 }), goal: at(0, 1.56, 0.5), fx: 'hearts', sound: 'land', react: 'happy', sticker: '😻' },
        { id: 'water', result: 'gag', rope: rope(-2.15, BLUE), body: thing('waterBalloon', -2.15, 5.9, 0.42, { m: 0.8 }), goal: at(-2.15, 1.67, 0.55), fx: 'splash', sound: 'splash', react: 'laugh', pop: true, propReact: ['robot', 'dizzy'], sticker: '🤖' },
        { id: 'gift', result: 'gag', rope: rope(2.15, YELLOW), body: thing('gift', 2.15, 6.1, 0.44, { m: 0.8, rest: 0.5 }), goal: at(2.15, 1.29, 0.55), fx: 'confetti', sound: 'horn', react: 'wow', pop: true, propReact: ['drum', 'bounce'], sticker: '🎉' },
      ] },
    { id: 'nap', prompt: 'p_wake', hero: { model: 'bear', x: 0, y: 1.0, s: 1, asleep: true },
      props: [{ model: 'rug', x: 0, y: 0 }],
      items: [
        { id: 'pillow', result: 'gag', rope: rope(X3[0], BLUE), body: thing('pillow', X3[0], 6.0, 0.5), goal: at(-0.05, 2.5), fx: 'flour', sound: 'puff', react: 'sleep', pop: true, sticker: '😴' },
        { id: 'bell', result: 'win', rope: rope(X3[1], YELLOW), body: thing('bell', X3[1], 6.3, 0.44), goal: at(0, 2.5), fx: 'stars', sound: 'bell', react: 'happy', set: 'wake', pop: true, sticker: '🔔' },
        { id: 'cake', result: 'gag', rope: rope(X3[2], RED), body: thing('cake', X3[2], 6.0, 0.48), goal: at(0.05, 2.5), fx: 'flour', sound: 'puff', react: 'laugh', tint: 0xffd9e6, pop: true, sticker: '🍰' },
      ] },
    { id: 'cheese', prompt: 'p_snack', hero: { model: 'mouse', x: 0, y: 0.82, s: 0.82 },
      props: [{ model: 'rug', x: 0, y: 0 }],
      items: [
        { id: 'anvil', result: 'gag', rope: rope(X3[0], RED), body: thing('anvil', X3[0], 6.0, 0.5, { m: 2, rest: 0.1 }), goal: at(X3[0], 0.5, 0.45), fx: 'stars', sound: 'thud', react: 'shiver', sticker: '😱' },
        { id: 'cheese', result: 'win', rope: rope(X3[1], YELLOW), body: thing('cheese', X3[1], 6.3, 0.44), goal: at(0, 1.9), fx: 'hearts', sound: 'munch', react: 'happy', pop: true, sticker: '🧀' },
        { id: 'ball', result: 'gag', rope: rope(X3[2], BLUE), body: thing('ball', X3[2], 6.0, 0.46, { m: 0.7, rest: 0.75 }), goal: at(0.1, 1.95), fx: 'stars', sound: 'boing', react: 'dizzy', sticker: '💫' },
      ] },
    { id: 'yarn', prompt: 'p_play', hero: { model: 'cat', x: 0, y: 1.0, s: 1 },
      props: [{ model: 'rug', x: 0, y: 0 }],
      boxes: [{ x0: -0.45, y0: 0, x1: 0.45, y1: 1.85, rest: 0.15 }],
      items: [
        { id: 'bucket', result: 'gag', rope: rope(X3[0], BLUE), body: thing('bucket', X3[0], 6.0, 0.48), goal: at(-0.05, 2.6), fx: 'splash', sound: 'splash', react: 'shiver', tint: 0x8fd0ff, pop: true, sticker: '💦' },
        { id: 'pot', result: 'gag', rope: rope(X3[1], RED), body: thing('pot', X3[1], 6.3, 0.46, { m: 1.2, rest: 0.1 }), goal: at(0, 2.31, 0.3), fx: 'stars', sound: 'thud', react: 'dizzy', sticker: '🍲' },
        { id: 'yarn', result: 'win', rope: rope(X3[2], YELLOW), body: thing('yarn', X3[2], 6.0, 0.44, { rest: 0.55 }), goal: at(1.15, 0.44, 0.5), fx: 'hearts', sound: 'boing', react: 'happy', sticker: '🧶' },
      ] },
    { id: 'monkey', prompt: 'p_land', hero: 'monkey',
      props: [{ model: 'pillows', x: 0, y: 0 }, { id: 'robot', model: 'robot', x: -2.15, y: 0 }, { id: 'drum', model: 'drum', x: 2.15, y: 0 }],
      boxes: [{ x0: -1.0, y0: 0, x1: 1.0, y1: 0.62, rest: 0.5 }, { x0: -2.6, y0: 0, x1: -1.7, y1: 1.25 }, { x0: 1.6, y0: 0, x1: 2.7, y1: 0.85, rest: 0.6 }],
      items: [
        { id: 'star', result: 'gag', rope: rope(-2.15, YELLOW), body: thing('star', -2.15, 6.0, 0.42), goal: at(-2.15, 1.67, 0.55), fx: 'stars', sound: 'bell', react: 'wow', pop: true, propReact: ['robot', 'dizzy'], sticker: '🌟' },
        { id: 'monkey', result: 'win', rope: rope(0, BLUE), body: thing('monkey', 0, 5.6, 0.56, { m: 1, rest: 0.4 }), goal: at(0, 1.18, 0.5), fx: 'hearts', sound: 'land', react: 'happy', sticker: '🐵' },
        { id: 'anvil', result: 'gag', rope: rope(2.15, RED), body: thing('anvil', 2.15, 6.1, 0.48, { m: 2, rest: 0.55 }), goal: at(2.15, 1.33, 0.55), fx: 'stars', sound: 'thud', react: 'laugh', propReact: ['drum', 'bounce'], sticker: '🥁' },
      ] },
  ],
};
