// PROTOTYPE - NOT FOR PRODUCTION
// Snip It levels: the worlds in order, each a pack file (w_*.js) with its wall, scenery models and five levels.
// Each level hangs things on ropes: one "win" that fixes the scene and the rest "gag" ones that end in a funny,
// harmless mess. Every thing has a goal it lands on, an effect, a reaction of the hero and a sticker.
//   level: { id, prompt, hero, props, boxes, items }   (id is unique in the whole game)
//   hero: an item id (the hero hangs on a rope) or { model, x, y, z?, s, asleep?, muddy?, tint?, wilted? }
//   props: [{ id?, model, x, y, z?, s?, hidden? }] scenery; boxes: [{ x0, y0, x1, y1, rest? }] solid blocks
//   item: { id, result: 'win' | 'gag', rope: { ax, ay, color }, body: { model, x, y, r, m, rest, lift, color },
//           goal: { x, y, r }, fx, sound, react, sticker,
//           pop? (the thing is used up on landing), tint? (colours the hero for a moment), untint? (cleans the hero
//           for good), set? (a flag for the hero: 'wake', 'bloom'), propReact? [propId, reaction], show? / hide?
//           [propIds], fxAt? [x, y] (effect elsewhere than the goal), burst? (effect size),
//           needs? itemId (cut before that one is cut: it plays `early` and is hung back),
//           early? { goal, fx, sound, react, sticker } }
import room from './w_room.js';
import bath from './w_bath.js';
import garden from './w_garden.js';
import kitchen from './w_kitchen.js';
import beach from './w_beach.js';
import party from './w_party.js';
import farm from './w_farm.js';
import snow from './w_snow.js';
import space from './w_space.js';
import toyshop from './w_toyshop.js';

export const WORLDS = [room, bath, garden, kitchen, beach, party, farm, snow, space, toyshop];
export const PER_WORLD = 5;
export const LEVELS = WORLDS.flatMap((w) => w.levels.map((l) => ({ ...l, theme: w.id })));

/** Sticker id of an ending: level id + item id (+ '_early' for a thing cut before its turn). */
export const stickerId = (level, item, early) => level.id + '_' + item.id + (early ? '_early' : '');

/** All stickers in book order: [{ id, icon, level }]. */
export function allStickers() {
  const out = [];
  LEVELS.forEach((l, i) => l.items.forEach((it) => { out.push({ id: stickerId(l, it), icon: it.sticker, level: i }); if (it.early) out.push({ id: stickerId(l, it, true), icon: it.early.sticker, level: i }); }));
  return out;
}

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
