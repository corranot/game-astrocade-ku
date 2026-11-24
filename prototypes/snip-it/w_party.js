// PROTOTYPE - NOT FOR PRODUCTION
// Snip It world: the birthday party. Pack shape: see w_room.js; level fields: see levels.js. This world brings the
// wrapped surprise: a cake hidden in a big gift box, which wants its candle only after the box has been opened.
import { RED, BLUE, YELLOW, X3, rope, thing, at } from './palette.js';

const BALLOONS_L = { model: 'balloons', x: -2.65, y: 0, z: -0.9 }, BALLOONS_R = { model: 'balloons', x: 2.65, y: 0, z: -0.9 };
const PILE_L = { model: 'presents', x: -2.3, y: 0, z: -0.7, s: 0.62 }, PILE_R = { model: 'presents', x: 2.3, y: 0, z: -0.7, s: 0.62 };

export default {
  id: 'party', icon: '🎂', sky: 0xffd3ea, floor: [0xb58cff, 0x8a62d9], beam: 0xff7fb0, ambient: ['mote', 1.2, 1],
  wall(g, w, h) {
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#ffd3ea'); gr.addColorStop(1, '#ffeeb8'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    // happy dots
    const dots = ['#ff8fb1', '#7fd4ff', '#ffe14d', '#9be37a', '#c9a6ff'];
    for (let i = 0; i < 26; i++) { g.fillStyle = dots[i % 5]; g.globalAlpha = 0.55; g.beginPath(); g.arc((i * 149 + 40) % w, h * 0.42 + ((i * 97) % (h * 0.42)), 10 + (i % 3) * 5, 0, 7); g.fill(); }
    g.globalAlpha = 1;
    // two rows of bunting
    const flags = ['#ff4d5e', '#ffc61a', '#2f9bff', '#3fcf6a', '#a86bff'];
    for (const [y0, sag, n] of [[h * 0.3, 46, 9], [h * 0.4, 34, 8]]) {
      const yAt = (t) => y0 + Math.sin(t * Math.PI) * sag;
      g.strokeStyle = '#fff'; g.lineWidth = 5; g.beginPath(); for (let i = 0; i <= 32; i++) { const t = i / 32; if (i) g.lineTo(w * t, yAt(t)); else g.moveTo(0, yAt(0)); } g.stroke();
      for (let i = 0; i < n; i++) { const t = (i + 0.5) / n, x = w * t, y = yAt(t); g.fillStyle = flags[(i + (n % 2)) % 5]; g.beginPath(); g.moveTo(x - 22, y); g.lineTo(x + 22, y); g.lineTo(x, y + 46); g.fill(); }
    }
    g.fillStyle = '#ffb3d4'; g.fillRect(0, h * 0.86, w, h * 0.14); g.fillStyle = '#fff'; g.fillRect(0, h * 0.86, w, 8);
  },
  models: {
    // a round table in a party cloth; its top is at y = 1
    partyTable(g, K) {
      K.add(g, 'tube', K.mat(0xff8fb1, 0.9), [0, 0.5, 0], [0.8, 0.94, 0.62]); K.add(g, 'tube', K.mat(0xffffff, 0.8), [0, 0.96, 0], [0.86, 0.08, 0.68]);
      for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; K.add(g, 'ball', K.mat(i % 2 ? 0xffe14d : 0x7fd4ff, 0.7), [Math.cos(a) * 0.8, 0.78, Math.sin(a) * 0.62], 0.1); }
    },
    // a pile of wrapped presents, flat on top (0.75 high) so somebody can land on it
    presents(g, K) {
      const bow = K.mat(0xfff06a, 0.5), white = K.mat(0xffffff, 0.5);
      K.add(g, 'box', K.mat(0xff5f6d, 0.7), [-0.52, 0.375, 0], [1.0, 0.75, 0.9]); K.add(g, 'box', bow, [-0.52, 0.375, 0], [0.2, 0.77, 0.92]);
      K.add(g, 'box', K.mat(0x4fb4ff, 0.7), [0.52, 0.375, 0], [1.0, 0.75, 0.9]); K.add(g, 'box', white, [0.52, 0.375, 0], [0.2, 0.77, 0.92]);
      K.add(g, 'box', K.mat(0x6fd86a, 0.7), [0.1, 0.6, -0.75], [0.9, 1.2, 0.5]); K.add(g, 'box', bow, [0.1, 0.6, -0.75], [0.18, 1.22, 0.52]);
      K.add(g, 'box', K.mat(0xc27cff, 0.7), [-0.2, 0.2, 0.7], [0.5, 0.4, 0.4]); K.add(g, 'box', white, [-0.2, 0.2, 0.7], [0.12, 0.42, 0.42]);
    },
    // three balloons on strings, tied to a little weight
    balloons(g, K) {
      K.add(g, 'box', K.mat(0xffc61a, 0.5), [0, 0.15, 0], [0.4, 0.3, 0.4]);
      [[-0.5, 2.7, 0xff4d5e], [0.05, 3.25, 0x2f9bff], [0.55, 2.8, 0x3fcf6a]].forEach(([x, y, c]) => {
        K.add(g, 'ball', K.mat(c, 0.2), [x, y, 0], [0.42, 0.5, 0.42]); K.add(g, 'cone', K.mat(c, 0.2), [x, y - 0.52, 0], [0.08, 0.1, 0.08]);
        K.add(g, 'ball', K.mat(0xffffff, 0.2), [x - 0.14, y + 0.18, 0.34], [0.08, 0.12, 0.04]);
        const len = Math.hypot(x, y - 0.85); K.add(g, 'tube', K.mat(0xffffff, 0.8), [x / 2, 0.3 + (y - 0.85) / 2, 0], [0.015, len, 0.015], [0, 0, -Math.atan2(x, y - 0.85)]);
      });
    },
    // a birthday candle with a flame, standing on a little plate (a roped thing)
    candle(g, K) {
      const wax = K.mat(0x7fd4ff, 0.5);
      K.add(g, 'tube', K.mat(0xffffff, 0.4), [0, -0.9, 0], [0.6, 0.12, 0.6]); K.add(g, 'tube', wax, [0, -0.25, 0], [0.26, 1.2, 0.26]);
      for (const y of [-0.6, -0.25, 0.1]) K.add(g, 'tube', K.mat(0xffffff, 0.5), [0, y, 0], [0.275, 0.12, 0.275]);
      K.add(g, 'ball', K.mat(0xff9a1f, 0.2), [0, 0.55, 0], [0.2, 0.26, 0.2]); K.add(g, 'cone', K.mat(0xffe14d, 0.2), [0, 0.72, 0], [0.17, 0.4, 0.17]);
      K.knot(g, wax);
      return { spin: false };
    },
    // the surprise on the table: a big gift box, or (cake: true) the tall cake that was inside; both 1.1 high
    surprise(g, K, o) {
      if (!o.cake) {
        const r = K.mat(0xfff06a, 0.5);
        K.add(g, 'box', K.mat(0xa86bff, 0.7), [0, 0.55, 0], [1.16, 1.1, 1.0]); K.add(g, 'box', r, [0, 0.55, 0], [0.22, 1.12, 1.02]); K.add(g, 'box', r, [0, 0.55, 0], [1.18, 0.2, 1.02]);
        K.add(g, 'ball', r, [-0.2, 1.16, 0], [0.24, 0.1, 0.16], [0, 0, -0.4]); K.add(g, 'ball', r, [0.2, 1.16, 0], [0.24, 0.1, 0.16], [0, 0, 0.4]);
        return;
      }
      const cream = K.mat(0xfff1d6, 0.7), pink = K.mat(0xff8fb1, 0.6), red = K.mat(0xff4d5e, 0.3);
      K.add(g, 'tube', cream, [0, 0.3, 0], [0.56, 0.6, 0.56]); K.add(g, 'tube', pink, [0, 0.62, 0], [0.6, 0.1, 0.6]);
      K.add(g, 'tube', cream, [0, 0.86, 0], [0.4, 0.4, 0.4]); K.add(g, 'tube', pink, [0, 1.06, 0], [0.44, 0.1, 0.44]);
      for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; K.add(g, 'ball', red, [Math.cos(a) * 0.5, 0.72, Math.sin(a) * 0.5], 0.08); }
    },
  },
  levels: [
    // a birthday bunny and no cake yet
    { id: 'party_cake', prompt: 'p_party', hero: { model: 'bunny', x: 0, y: 1.0, s: 1 }, props: [BALLOONS_L, PILE_R],
      items: [
        { id: 'cake', result: 'win', rope: rope(X3[0], RED), body: thing('cake', X3[0], 6.0, 0.5), goal: at(-0.05, 2.5), fx: 'confetti', burst: 2, sound: 'munch', react: 'happy', pop: true, sticker: '🍰' },
        { id: 'hat', result: 'gag', rope: rope(X3[1], BLUE), body: thing('hat', X3[1], 6.3, 0.46), goal: at(0, 2.5), fx: 'stars', sound: 'puff', react: 'laugh', pop: true, sticker: '🧢' },
        { id: 'bucket', result: 'gag', rope: rope(X3[2], YELLOW), body: thing('bucket', X3[2], 6.0, 0.48), goal: at(0.05, 2.6), fx: 'splash', sound: 'splash', react: 'shiver', tint: 0x8fd0ff, pop: true, sticker: '💦' },
      ] },
    // a bear dangles over the presents: a fine place to land
    { id: 'party_bear', prompt: 'p_land', hero: 'bear',
      props: [{ model: 'presents', x: 0, y: 0 }, { id: 'table', model: 'partyTable', x: -2.2, y: 0 }, BALLOONS_R],
      boxes: [{ x0: -1.02, y0: 0, x1: 1.02, y1: 0.75, rest: 0.4 }, { x0: -3.0, y0: 0, x1: -1.4, y1: 1.0 }],
      items: [
        { id: 'star', result: 'gag', rope: rope(-2.2, YELLOW), body: thing('star', -2.2, 6.0, 0.42), goal: at(-2.2, 1.42, 0.55), fx: 'stars', sound: 'bell', react: 'wow', pop: true, propReact: ['table', 'bounce'], sticker: '🌟' },
        { id: 'bear', result: 'win', rope: rope(0, RED), body: thing('bear', 0, 5.6, 0.56, { m: 1, rest: 0.4 }), goal: at(0, 1.31, 0.5), fx: 'confetti', sound: 'land', react: 'happy', sticker: '🐻' },
        { id: 'anvil', result: 'gag', rope: rope(2.2, BLUE), body: thing('anvil', 2.2, 6.1, 0.48, { m: 2, rest: 0.1 }), goal: at(2.2, 0.48, 0.45), fx: 'stars', sound: 'thud', react: 'shiver', sticker: '😱' },
      ] },
    // the panda fell asleep at the party
    { id: 'party_panda', prompt: 'p_wake', hero: { model: 'panda', x: 0, y: 1.0, s: 1, asleep: true }, props: [PILE_L, BALLOONS_R],
      items: [
        { id: 'pillow', result: 'gag', rope: rope(X3[0], BLUE), body: thing('pillow', X3[0], 6.0, 0.5), goal: at(-0.05, 2.5), fx: 'flour', sound: 'puff', react: 'sleep', pop: true, sticker: '😴' },
        { id: 'gift', result: 'gag', rope: rope(X3[1], RED), body: thing('gift', X3[1], 6.3, 0.44), goal: at(0, 2.5), fx: 'confetti', sound: 'puff', react: 'sneeze', pop: true, sticker: '🎁' },
        { id: 'bell', result: 'win', rope: rope(X3[2], YELLOW), body: thing('bell', X3[2], 6.0, 0.44), goal: at(0.05, 2.5), fx: 'stars', sound: 'bell', react: 'happy', set: 'wake', pop: true, sticker: '🔔' },
      ] },
    // a chick under a cage that three balloons want to carry away
    { id: 'party_chick', prompt: 'p_free', hero: { model: 'chick', x: 0, y: 0.72, s: 0.72 }, props: [PILE_L, PILE_R],
      items: [
        { id: 'water', result: 'gag', rope: rope(-1.9, BLUE), body: thing('waterBalloon', -1.9, 6.2, 0.44), goal: at(-0.05, 3.1), fx: 'splash', sound: 'splash', react: 'shiver', pop: true, sticker: '💦' },
        { id: 'cage', result: 'win', rope: rope(-2.2, RED, 0.12), body: thing('liftCage', 0, 1.0, 1.0, { m: 1, lift: 30 }), goal: at(0, 10.5, 1.4), fx: 'confetti', sound: 'boing', react: 'happy', pop: true, fxAt: [0, 1.2], sticker: '🎈' },
        { id: 'banana', result: 'gag', rope: rope(1.9, YELLOW), body: thing('banana', 1.9, 6.2, 0.44, { rest: 0.5 }), goal: at(1.9, 0.44, 0.5), fx: 'stars', sound: 'boing', react: 'wow', sticker: '🍌' },
      ] },
    // the cake is still wrapped: the ball opens the box, then the candle can go on the cake
    { id: 'party_first', prompt: 'p_first', hero: { model: 'bunny', x: -1.2, y: 1.0, s: 1 },
      props: [{ model: 'partyTable', x: 1.3, y: 0 }, { id: 'box', model: 'surprise', x: 1.3, y: 1.0 }, { id: 'cake', model: 'surprise', cake: true, x: 1.3, y: 1.0, hidden: true }, BALLOONS_L],
      boxes: [{ x0: 0.5, y0: 0, x1: 2.1, y1: 1.0 }, { x0: 0.75, y0: 1.0, x1: 1.85, y1: 2.1, rest: 0.1 }],
      items: [
        { id: 'honey', result: 'gag', rope: rope(X3[0], RED), body: thing('honey', X3[0], 6.0, 0.44), goal: at(-1.2, 2.5), fx: 'stars', sound: 'munch', react: 'laugh', tint: 0xffc93c, pop: true, sticker: '🍯' },
        { id: 'ball', result: 'gag', rope: rope(X3[1], BLUE), body: thing('ball', X3[1], 6.3, 0.44, { m: 0.7, rest: 0.3 }), goal: at(1.3, 2.54, 0.5), fx: 'confetti', burst: 2, sound: 'horn', react: 'wow', pop: true, hide: ['box'], show: ['cake'], sticker: '🎁' },
        { id: 'candle', result: 'win', rope: rope(X3[2], YELLOW), body: thing('candle', X3[2], 6.0, 0.42, { rest: 0.05 }), goal: at(1.3, 2.52, 0.45), fx: 'hearts', sound: 'bell', react: 'happy', sticker: '🎂',
          needs: 'ball', early: { goal: at(1.3, 2.52, 0.45), fx: 'spark', sound: 'thud', react: 'dizzy', sticker: '🕯️' } },
      ] },
  ],
};
