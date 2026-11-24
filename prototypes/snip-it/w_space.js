// PROTOTYPE - NOT FOR PRODUCTION
// Snip It world: the moon base. Pack shape: see w_room.js; level fields: see levels.js. This world is about fixing
// things: a robot and a rocket that are switched off until the battery reaches them. Its later levels hang
// four ropes, and one of them wants two cuts in the right order (the bubble helmet first, then the snack).
import { RED, BLUE, YELLOW, GREEN, PURPLE, X3, X4, rope, thing, at } from './palette.js';

const FLAG = { model: 'spaceCrater', x: -2.3, y: 0, z: -1.3, flag: true };
const PARKED = { model: 'spaceRocket', x: 2.5, y: 0, z: -1.4, s: 0.62 };

export default {
  id: 'space', icon: '🚀', sky: 0x5a48c2, floor: [0xdcd6f0, 0xa9a0d4], beam: 0x8f84d6, ambient: ['mote', 1.2, 1],
  wall(g, w, h) {
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#4a3bb5'); gr.addColorStop(0.6, '#7d63dc'); gr.addColorStop(1, '#b9a2f5'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    // big friendly stars
    const star = (x, y, r, c) => { g.fillStyle = c; g.beginPath(); for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2 - Math.PI / 2, k = i % 2 ? r * 0.45 : r; g.lineTo(x + Math.cos(a) * k, y + Math.sin(a) * k); } g.closePath(); g.fill(); };
    for (const [x, y, r, c] of [[0.14, 0.2, 26, '#fff06a'], [0.4, 0.3, 16, '#ffffff'], [0.3, 0.52, 22, '#fff06a'], [0.9, 0.16, 18, '#ffffff'], [0.62, 0.6, 14, '#fff06a'], [0.08, 0.62, 13, '#ffffff'], [0.9, 0.66, 20, '#fff06a'], [0.52, 0.14, 12, '#fff06a']]) star(w * x, h * y, r, c);
    g.fillStyle = 'rgba(255,255,255,.85)'; for (const [x, y] of [[0.22, 0.38], [0.5, 0.46], [0.7, 0.2], [0.82, 0.52], [0.06, 0.44], [0.44, 0.66], [0.26, 0.12], [0.6, 0.34]]) { g.beginPath(); g.arc(w * x, h * y, 4, 0, 7); g.fill(); }
    // the ringed planet
    const px = w * 0.72, py = h * 0.4;
    g.strokeStyle = '#ffe9a8'; g.lineWidth = 12; g.beginPath(); g.ellipse(px, py, 112, 30, -0.35, Math.PI, Math.PI * 2); g.stroke();
    g.fillStyle = '#ff9d5c'; g.beginPath(); g.arc(px, py, 66, 0, 7); g.fill();
    g.fillStyle = '#ffc07a'; g.beginPath(); g.ellipse(px - 6, py - 24, 52, 12, -0.35, 0, 7); g.fill(); g.fillStyle = '#f77f4a'; g.beginPath(); g.ellipse(px + 8, py + 26, 46, 10, -0.35, 0, 7); g.fill();
    g.strokeStyle = '#ffe9a8'; g.beginPath(); g.ellipse(px, py, 112, 30, -0.35, 0, Math.PI); g.stroke();
    // pale moon hills with craters
    g.fillStyle = '#cfc6ee'; g.beginPath(); g.ellipse(w * 0.2, h * 0.93, w * 0.55, h * 0.13, 0, 0, 7); g.fill();
    g.fillStyle = '#e2dcf6'; g.beginPath(); g.ellipse(w * 0.8, h * 0.96, w * 0.55, h * 0.14, 0, 0, 7); g.fill();
    g.fillStyle = '#b9aee0'; for (const [x, y, r] of [[0.16, 0.88, 26], [0.42, 0.93, 16], [0.74, 0.9, 30], [0.92, 0.95, 14]]) { g.beginPath(); g.ellipse(w * x, h * y, r, r * 0.4, 0, 0, 7); g.fill(); }
  },
  models: {
    // a boxy robot with a face. With `off` it hangs its head, grey and dark-eyed, until the battery arrives (flag 'on')
    spaceRobot(g, K, o) {
      const body = K.mat(0x5fd0ff, 0.35), dark = K.mat(0x3f7fe0, 0.35), eye = K.mat(0xfff06a, 0.2), light = K.mat(0x57e86b, 0.2), black = K.mat(0x2a1b2e, 0.3);
      for (const s of [-1, 1]) { K.add(g, 'box', dark, [s * 0.28, 0.1, 0.06], [0.38, 0.2, 0.52]); K.add(g, 'tube', dark, [s * 0.28, 0.4, 0], [0.1, 0.44, 0.1]); K.add(g, 'box', dark, [s * 0.7, 1.02, 0], [0.2, 0.72, 0.26]); }
      K.add(g, 'box', body, [0, 1.02, 0], [1.1, 0.9, 0.8]); K.add(g, 'box', K.mat(0xffffff, 0.4), [0, 1.02, 0.4], [0.62, 0.5, 0.04]);
      const chest = K.add(g, 'ball', light, [0, 1.02, 0.43], 0.13);
      const head = K.group(); head.position.set(0, 1.86, 0); g.add(head);
      K.add(head, 'box', body, [0, 0, 0], [0.92, 0.68, 0.72]); K.add(head, 'box', dark, [-0.5, 0, 0], [0.1, 0.3, 0.3]); K.add(head, 'box', dark, [0.5, 0, 0], [0.1, 0.3, 0.3]);
      const eyes = [-0.2, 0.2].map((x) => K.add(head, 'ball', eye, [x, 0.06, 0.36], [0.14, 0.14, 0.06]));
      const mouth = K.add(head, 'box', black, [0, -0.18, 0.37], [0.3, 0.06, 0.03]);
      K.add(head, 'tube', dark, [0, 0.46, 0], [0.03, 0.26, 0.03]); const bulb = K.add(head, 'ball', light, [0, 0.64, 0], 0.1);
      let up = o.off ? 0 : 1;
      return { tinted: [body, dark], spin: false, update(A, dt) {
        if (A.flags.on && up < 1) { up = Math.min(1, up + dt * 2); A.tint(null, false); }
        const d = 1 - up, lit = up > 0.5;
        head.rotation.x = d * 0.45; head.rotation.z = d * 0.2 + Math.sin(A.time * 1.6) * 0.05 * up; head.position.set(d * 0.06, 1.86 - d * 0.08, d * 0.12);
        eye.color.setHex(lit ? 0xfff06a : 0x3a3f52); eye.emissive.setHex(lit ? 0xb88a00 : 0x000000); light.color.setHex(lit ? 0x57e86b : 0x5a5f72); light.emissive.setHex(lit ? 0x1f9a35 : 0x000000);
        const blink = lit && (A.time % 2.9) > 2.78 ? 0.12 : 1, wide = A.mood === 'wow' || A.mood === 'happy' ? 1.3 : 1;
        for (const e of eyes) e.scale.set(0.14, (lit ? 0.14 : 0.03) * blink * wide, 0.06);
        mouth.scale.set(A.mood === 'happy' || A.mood === 'laugh' ? 0.4 : 0.3, A.mood === 'happy' || A.mood === 'wow' ? 0.16 : 0.06, 0.03);
        const pulse = lit ? 1 + Math.sin(A.time * 6) * 0.12 : 0.8; chest.scale.setScalar(0.13 * pulse); bulb.scale.setScalar(0.1 * pulse);
      } };
    },
    // a small rocket. `off`: grey, dark window, leaning on its fins. `on`: bright, hovering on its flame. Neither: parked
    spaceRocket(g, K, o) {
      const r = K.group(); g.add(r);
      const body = K.mat(o.off ? 0xa9aec0 : 0xffffff, 0.4), trim = K.mat(o.off ? 0x8388a0 : 0xff4d5e, 0.45), glass = K.mat(o.off ? 0x4a4f63 : 0x8fe6ff, 0.15);
      K.add(r, 'ball', body, [0, 1.55, 0], [0.62, 1.3, 0.62]); K.add(r, 'cone', trim, [0, 2.78, 0], [0.4, 0.62, 0.4]);
      K.add(r, 'box', trim, [-0.62, 0.52, 0], [0.5, 0.74, 0.1], [0, 0, 0.35]); K.add(r, 'box', trim, [0.62, 0.52, 0], [0.5, 0.74, 0.1], [0, 0, -0.35]); K.add(r, 'box', trim, [0, 0.52, 0.56], [0.1, 0.74, 0.44], [-0.3, 0, 0]);
      K.add(r, 'tube', K.mat(0x5a6078, 0.4), [0, 0.3, 0], [0.32, 0.3, 0.32]);
      K.add(r, 'ring', K.mat(o.off ? 0x8388a0 : 0xffc61a, 0.3), [0, 1.85, 0.52], 0.25); K.add(r, 'ball', glass, [0, 1.85, 0.5], [0.22, 0.22, 0.1]);
      if (!o.off) { glass.emissive.setHex(0x2a7fa8); K.add(r, 'ring', K.mat(0xffc61a, 0.4), [0, 1.0, 0], [0.56, 0.56, 0.4], [Math.PI / 2, 0, 0]); }
      let flame = null;
      if (o.on) { flame = K.group(); flame.position.set(0, 0.1, 0); r.add(flame); const hot = K.mat(0xff8a1f, 0.3), core = K.mat(0xfff06a, 0.3); hot.emissive.setHex(0xc24a00); core.emissive.setHex(0xc9a800); K.add(flame, 'cone', hot, [0, -0.34, 0], [0.3, 0.7, 0.3], [Math.PI, 0, 0]); K.add(flame, 'cone', core, [0, -0.24, 0.02], [0.17, 0.46, 0.17], [Math.PI, 0, 0]); }
      if (o.off) r.rotation.z = 0.16;
      return { spin: false, update(A) { if (!flame) return; r.position.y = 0.55 + Math.sin(A.time * 3) * 0.08; const k = 1 + Math.sin(A.time * 22) * 0.16; flame.scale.set(1, k, 1); } };
    },
    // a moon buggy with a soft seat in the middle
    spaceBuggy(g, K) {
      const m = K.mat(0xffb23d, 0.6), d = K.mat(0x4a4f63, 0.8), seat = K.mat(0xff7fa8, 0.9), w = K.mat(0xffffff, 0.4);
      K.add(g, 'box', m, [0, 0.5, 0], [2.0, 0.3, 1.1]); K.add(g, 'box', seat, [0, 0.67, 0.05], [1.3, 0.1, 0.8]); K.add(g, 'box', seat, [0, 1.05, -0.5], [1.3, 0.8, 0.14]);
      for (const s of [-1, 1]) { K.add(g, 'box', m, [s * 0.9, 0.82, 0], [0.16, 0.36, 1.0]); for (const z of [-0.56, 0.56]) { K.add(g, 'tube', d, [s * 0.72, 0.32, z], [0.32, 0.18, 0.32], [Math.PI / 2, 0, 0]); K.add(g, 'tube', w, [s * 0.72, 0.32, z + Math.sign(z) * 0.02], [0.13, 0.19, 0.13], [Math.PI / 2, 0, 0]); } K.add(g, 'ball', K.mat(0xfff06a, 0.2), [s * 0.9, 0.82, 0.52], 0.1); }
      K.add(g, 'tube', d, [-0.9, 1.4, -0.5], [0.03, 0.8, 0.03]); K.add(g, 'cone', w, [-0.9, 1.84, -0.5], [0.26, 0.16, 0.26], [Math.PI, 0, 0]); K.add(g, 'ball', K.mat(0xff4d5e), [-0.9, 1.9, -0.5], 0.06);
    },
    // a shallow crater in the moon dust; with `flag` a little flag stands in it
    spaceCrater(g, K, o) {
      K.add(g, 'ring', K.mat(0xbdb4e2, 0.95), [0, 0.04, 0], [0.9, 0.9, 0.5], [Math.PI / 2, 0, 0]); K.add(g, 'tube', K.mat(0xa59bd2, 0.95), [0, 0.02, 0], [0.84, 0.04, 0.84]);
      K.add(g, 'ball', K.mat(0xc9c1ea, 0.95), [0.95, 0.1, 0.5], [0.2, 0.14, 0.18]);
      if (o.flag) { K.add(g, 'tube', K.mat(0xffffff, 0.4), [0, 1.0, 0], [0.04, 2.0, 0.04]); K.add(g, 'box', K.mat(0xff4d5e, 0.7), [0.36, 1.72, 0], [0.7, 0.46, 0.04]); K.add(g, 'ball', K.mat(0xfff06a, 0.5), [0.36, 1.72, 0.03], [0.13, 0.13, 0.02]); K.add(g, 'ball', K.mat(0xffc61a), [0, 2.02, 0], 0.07); }
    },
    // a see-through bubble helmet that sits over an astronaut's head
    spaceHelmet(g, K) {
      const glass = K.mat(0xd8f4ff, 0.05); glass.transparent = true; glass.opacity = 0.36; glass.depthWrite = false;
      K.add(g, 'ball', glass, [0, 0, 0], 1.0); K.add(g, 'ring', K.mat(0xffffff, 0.4), [0, -0.62, 0], [0.74, 0.74, 0.6], [Math.PI / 2, 0, 0]);
      K.add(g, 'ball', K.mat(0xffffff, 0.1), [-0.42, 0.5, 0.74], [0.2, 0.1, 0.04], [0, 0, 0.6]); K.add(g, 'ball', K.mat(0xffffff, 0.1), [-0.62, 0.22, 0.74], [0.07, 0.07, 0.03]);
    },
  },
  levels: [
    // the robot is switched off: the battery wakes it up
    { id: 'space_robot', prompt: 'p_fix', hero: { model: 'spaceRobot', x: 0, y: 0, s: 1, off: true, tint: 0x8a8ea3 }, props: [FLAG, PARKED],
      items: [
        { id: 'water', result: 'gag', rope: rope(X3[0], BLUE), body: thing('waterBalloon', X3[0], 6.0, 0.44, { m: 0.8 }), goal: at(-0.05, 3.0), fx: 'splash', sound: 'splash', react: 'shiver', pop: true, sticker: '💦' },
        { id: 'star', result: 'gag', rope: rope(X3[1], YELLOW), body: thing('star', X3[1], 6.3, 0.44), goal: at(0, 3.0), fx: 'stars', sound: 'bell', react: 'dizzy', pop: true, sticker: '🌟' },
        { id: 'battery', result: 'win', rope: rope(X3[2], RED), body: thing('battery', X3[2], 6.0, 0.46, { m: 1 }), goal: at(0.05, 3.0), fx: 'spark', sound: 'bell', react: 'happy', set: 'on', untint: true, pop: true, burst: 2, sticker: '🤖' },
      ] },
    // the little alien comes down from its rope into the buggy seat
    { id: 'space_buggy', prompt: 'p_land', hero: 'alien',
      props: [{ model: 'spaceBuggy', x: 0, y: 0 }, { id: 'bot', model: 'spaceRobot', x: -2.3, y: 0, s: 0.6 }, { model: 'spaceCrater', x: 2.3, y: 0, z: 0.2 }],
      boxes: [{ x0: -0.95, y0: 0, x1: 0.95, y1: 0.7, rest: 0.3 }, { x0: -2.7, y0: 0, x1: -1.9, y1: 1.4 }],
      items: [
        { id: 'gift', result: 'gag', rope: rope(-2.3, YELLOW), body: thing('gift', -2.3, 6.1, 0.44, { m: 0.8, rest: 0.5 }), goal: at(-2.3, 1.84, 0.55), fx: 'confetti', sound: 'horn', react: 'wow', pop: true, propReact: ['bot', 'bounce'], sticker: '🎉' },
        { id: 'alien', result: 'win', rope: rope(0, GREEN), body: thing('alien', 0, 5.6, 0.56, { m: 1, rest: 0.3 }), goal: at(0, 1.26, 0.5), fx: 'hearts', sound: 'land', react: 'happy', sticker: '👽' },
        { id: 'anvil', result: 'gag', rope: rope(2.3, RED), body: thing('anvil', 2.3, 6.0, 0.48, { m: 2, rest: 0.1 }), goal: at(2.3, 0.48, 0.45), fx: 'stars', sound: 'thud', react: 'shiver', sticker: '😱' },
      ] },
    // the monkey astronaut is hungry, but the bubble helmet is in the way: pop the bubble first, then the apple
    { id: 'space_snack', prompt: 'p_first', hero: { model: 'monkey', x: 0, y: 1.0, s: 1 },
      props: [{ id: 'helmet', model: 'spaceHelmet', x: 0, y: 1.42, z: 0.1 }, FLAG, PARKED],
      boxes: [{ x0: -0.5, y0: 0, x1: 0.5, y1: 2.4, rest: 0.55 }],
      items: [
        { id: 'ice', result: 'gag', rope: rope(X4[0], BLUE), body: thing('ice', X4[0], 6.0, 0.46, { m: 1.2, rest: 0.15 }), goal: at(-2.3, 0.46, 0.45), fx: 'stars', sound: 'thud', react: 'shiver', sticker: '🧊' },
        { id: 'star', result: 'gag', rope: rope(X4[1], YELLOW), body: thing('star', X4[1], 6.3, 0.44), goal: at(0, 3.1), fx: 'bubbles', sound: 'puff', react: 'wow', pop: true, burst: 2, hide: ['helmet'], sticker: '🫧' },
        { id: 'apple', result: 'win', rope: rope(X4[2], RED), body: thing('apple', X4[2], 6.0, 0.42, { rest: 0.55 }), goal: at(0, 2.6), fx: 'hearts', sound: 'munch', react: 'happy', pop: true, sticker: '🍎', needs: 'star',
          early: { goal: at(0, 2.82, 0.3), fx: 'stars', sound: 'boing', react: 'dizzy', sticker: '💫', untint: false, pop: false, burst: 1 } },
        { id: 'ball', result: 'gag', rope: rope(X4[3], PURPLE), body: thing('ball', X4[3], 6.3, 0.46, { m: 0.7, rest: 0.75 }), goal: at(2.3, 0.46, 0.5), fx: 'stars', sound: 'boing', react: 'laugh', sticker: '⚽' },
      ] },
    // the alien's rocket will not start: the battery lights it up and it lifts off its fins
    { id: 'space_rocket', prompt: 'p_fix', hero: { model: 'alien', x: 0.7, y: 1.0, s: 1 },
      props: [{ id: 'off', model: 'spaceRocket', x: -2.0, y: 0, z: -0.3, s: 0.9, off: true }, { id: 'on', model: 'spaceRocket', x: -2.0, y: 0, z: -0.3, s: 0.9, on: true, hidden: true }, { model: 'spaceCrater', x: 2.4, y: 0, z: -1.2 }],
      items: [
        { id: 'bell', result: 'gag', rope: rope(X4[0], YELLOW), body: thing('bell', X4[0], 6.2, 0.44), goal: at(-2.0, 3.4), fx: 'stars', sound: 'bell', react: 'laugh', pop: true, propReact: ['off', 'dizzy'], sticker: '🔔' },
        { id: 'battery', result: 'win', rope: rope(X4[1], RED), body: thing('battery', X4[1], 5.9, 0.46, { m: 1 }), goal: at(-2.0, 3.4), fx: 'spark', sound: 'horn', react: 'happy', pop: true, burst: 2, show: ['on'], hide: ['off'], sticker: '🚀' },
        { id: 'cake', result: 'gag', rope: rope(X4[2], PURPLE), body: thing('cake', X4[2], 6.2, 0.48), goal: at(0.7, 2.5), fx: 'flour', sound: 'puff', react: 'sneeze', tint: 0xffd9e6, pop: true, sticker: '🍰' },
        { id: 'crate', result: 'gag', rope: rope(X4[3], BLUE), body: thing('crate', X4[3], 5.9, 0.46, { m: 1.4, rest: 0.2 }), goal: at(2.4, 0.46, 0.45), fx: 'stars', sound: 'thud', react: 'wow', sticker: '📦' },
      ] },
    // the frog is grey with moon dust: a bucket of water washes it green again
    { id: 'space_dust', prompt: 'p_wash', hero: { model: 'frog', x: 0, y: 1.0, s: 1, tint: 0xa9a3bd }, props: [FLAG, PARKED],
      items: [
        { id: 'bucket', result: 'win', rope: rope(X4[0], BLUE), body: thing('bucket', X4[0], 6.0, 0.48), goal: at(-0.1, 2.6), fx: 'splash', sound: 'splash', react: 'happy', untint: true, pop: true, burst: 2, sticker: '🐸' },
        { id: 'sack', result: 'gag', rope: rope(X4[1], YELLOW), body: thing('sack', X4[1], 6.3, 0.44), goal: at(-0.05, 2.5), fx: 'flour', sound: 'puff', react: 'sneeze', pop: true, sticker: '🤧' },
        { id: 'hat', result: 'gag', rope: rope(X4[2], RED), body: thing('hat', X4[2], 6.0, 0.46), goal: at(0.05, 2.5), fx: 'stars', sound: 'puff', react: 'dizzy', pop: true, sticker: '🎩' },
        { id: 'yarn', result: 'gag', rope: rope(X4[3], GREEN), body: thing('yarn', X4[3], 6.3, 0.44, { rest: 0.55 }), goal: at(2.3, 0.44, 0.5), fx: 'stars', sound: 'boing', react: 'laugh', sticker: '🧶' },
      ] },
  ],
};
