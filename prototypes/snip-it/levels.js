// PROTOTYPE - NOT FOR PRODUCTION
// Snip It levels as data. The stage is 6.4 wide (x -3.2..3.2), the floor is y = 0 and the hooks hang near y = 8.7.
// Each level has three roped things: one "win" that fixes the scene and two "gag" ones that end in a funny, harmless
// mess. Every thing has a goal it lands on, an effect, a reaction of the hero and a sticker.
//   item: { id, result, rope: { ax, ay, color }, body: { model, x, y, r, m, rest }, goal: { x, y, r },
//           fx, sound, react, tint?, pop?, sticker }
//   hero: an item id (the hero hangs on a rope) or { model, x, y, s } standing on the stage.
//   props: [{ id?, model, x, y, s?, react? }] scenery; boxes: solid blocks for the physics.

const RED = 0xff4d5e, BLUE = 0x2f9bff, YELLOW = 0xffc61a;

export const LEVELS = [
  {
    id: 'kitty', theme: 'room', prompt: 'p_kitty', hero: 'cat',
    props: [{ model: 'sofa', x: 0, y: 0 }, { id: 'robot', model: 'robot', x: -2.15, y: 0 }, { id: 'drum', model: 'drum', x: 2.15, y: 0 }],
    boxes: [{ x0: -1.15, y0: 0, x1: 1.15, y1: 1.0, rest: 0.45 }, { x0: -2.6, y0: 0, x1: -1.7, y1: 1.25 }, { x0: 1.6, y0: 0, x1: 2.7, y1: 0.85, rest: 0.6 }],
    items: [
      { id: 'cat', result: 'win', rope: { ax: 0, ay: 8.7, color: RED }, body: { model: 'cat', x: 0, y: 5.5, r: 0.56, m: 1, rest: 0.35 },
        goal: { x: 0, y: 1.56, r: 0.5 }, fx: 'hearts', sound: 'land', react: 'happy', sticker: '😻' },
      { id: 'water', result: 'gag', rope: { ax: -2.15, ay: 8.7, color: BLUE }, body: { model: 'waterBalloon', x: -2.15, y: 5.9, r: 0.42, m: 0.8 },
        goal: { x: -2.15, y: 1.67, r: 0.55 }, fx: 'splash', sound: 'splash', react: 'laugh', pop: true, propReact: ['robot', 'dizzy'], sticker: '🤖' },
      { id: 'gift', result: 'gag', rope: { ax: 2.15, ay: 8.7, color: YELLOW }, body: { model: 'gift', x: 2.15, y: 6.1, r: 0.44, m: 0.8, rest: 0.5 },
        goal: { x: 2.15, y: 1.29, r: 0.55 }, fx: 'confetti', sound: 'horn', react: 'wow', pop: true, propReact: ['drum', 'bounce'], sticker: '🎉' },
    ],
  },
  {
    id: 'bath', theme: 'bath', prompt: 'p_bath', hero: { model: 'puppy', x: 0, y: 1.45, z: -0.15, s: 0.95, muddy: true },
    props: [{ model: 'tub', x: 0, y: 0 }],
    boxes: [],
    items: [
      { id: 'flour', result: 'gag', rope: { ax: -1.9, ay: 8.7, color: YELLOW }, body: { model: 'sack', x: -1.9, y: 5.9, r: 0.46, m: 0.9 },
        goal: { x: -0.05, y: 2.9, r: 0.6 }, fx: 'flour', sound: 'puff', react: 'sneeze', tint: 0xffffff, pop: true, sticker: '👻' },
      { id: 'shower', result: 'win', rope: { ax: 0, ay: 8.7, color: BLUE }, body: { model: 'bucket', x: 0, y: 6.3, r: 0.48, m: 1 },
        goal: { x: 0, y: 2.9, r: 0.6 }, fx: 'bubbles', sound: 'splash', react: 'happy', clean: true, pop: true, sticker: '🛁' },
      { id: 'ducks', result: 'gag', rope: { ax: 1.9, ay: 8.7, color: RED }, body: { model: 'crate', x: 1.9, y: 6.0, r: 0.46, m: 0.9 },
        goal: { x: 0.05, y: 2.9, r: 0.6 }, fx: 'ducks', sound: 'squeak', react: 'laugh', pop: true, sticker: '🦆' },
    ],
  },
  {
    id: 'garden', theme: 'garden', prompt: 'p_garden', hero: { model: 'flower', x: 0, y: 0, s: 1, wilted: true },
    props: [{ model: 'fence', x: 0, y: 0 }],
    boxes: [],
    items: [
      { id: 'ball', result: 'gag', rope: { ax: -1.9, ay: 8.7, color: RED }, body: { model: 'ball', x: -1.9, y: 6.0, r: 0.48, m: 0.7, rest: 0.75 },
        goal: { x: -0.1, y: 3.0, r: 0.6 }, fx: 'stars', sound: 'boing', react: 'dizzy', sticker: '💫' },
      { id: 'seeds', result: 'gag', rope: { ax: 0, ay: 8.7, color: YELLOW }, body: { model: 'sack', x: 0, y: 6.4, r: 0.44, m: 0.9 },
        goal: { x: 0, y: 3.0, r: 0.6 }, fx: 'birds', sound: 'chirp', react: 'wow', pop: true, sticker: '🐦' },
      { id: 'can', result: 'win', rope: { ax: 1.9, ay: 8.7, color: BLUE }, body: { model: 'can', x: 1.9, y: 6.1, r: 0.48, m: 1 },
        goal: { x: 0.1, y: 3.0, r: 0.6 }, fx: 'rain', sound: 'splash', react: 'happy', bloom: true, pop: true, sticker: '🌻' },
    ],
  },
];

/** Sticker id of an item: level id + item id. */
export const stickerId = (level, item) => level.id + '_' + item.id;

/** All stickers in book order: [{ id, icon, level }]. */
export function allStickers() { const out = []; LEVELS.forEach((l, i) => l.items.forEach((it) => out.push({ id: stickerId(l, it), icon: it.sticker, level: i }))); return out; }

/**
 * A playable copy of level i with the creator's edits applied.
 * edits: { [levelId]: { [itemId]: { ax?, ay?, x?, y? } } } - moved hooks and things.
 */
export function buildLevel(i, edits = {}) {
  const src = LEVELS[((i % LEVELS.length) + LEVELS.length) % LEVELS.length], e = edits[src.id] || {};
  const level = JSON.parse(JSON.stringify(src));
  for (const it of level.items) {
    const m = e[it.id]; if (!m) continue;
    for (const k of ['ax', 'ay']) if (Number.isFinite(m[k])) it.rope[k] = m[k];
    for (const k of ['x', 'y']) if (Number.isFinite(m[k])) it.body[k] = m[k];
  }
  return level;
}
