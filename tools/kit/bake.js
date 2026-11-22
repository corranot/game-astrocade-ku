// PROTOTYPE - NOT FOR PRODUCTION
// (this header line is dropped from the upload set; the copy in each game must stay byte-identical to tools/kit/bake.js)
// Baked sprites: art a game draws with canvas code, drawn once by tools/bake.js into one lossless sheet
// (baked.webp + bake-manifest.js) and read back from it at run time. Copy this file unchanged into a game
// folder as bake.js; tools/ci-checks.sh fails when a copy differs from tools/kit/bake.js.
//
//   import { sprite, bakeReady } from './bake.js';
//   const COIN = sprite('coin', 96, 96, (ctx, w, h) => { ... });   // at module top level, so tools/bake.js sees it
//   await bakeReady();                                              // in run(), before the first frame
//   COIN.draw(ctx, x, y, w, h);
//
// The sheet is used for a sprite when the manifest holds its name, size and options. Whether the baked pixels
// still match the drawing code is checked by `node tools/bake.js <game> --check`, which compares every sprite
// pixel by pixel (so constants, palettes and helpers a draw function reads count too) and also runs the
// esbuild bundle to prove the sheet is really read there. Without a usable sheet every sprite is drawn live from
// its own code, exactly as before baking: a player never sees a broken sprite.
import { BAKED } from './bake-manifest.js';

const recipes = new Map();
let sheet = null, sheetOk = false, loading = null;

/** A sprite's identity in the manifest: name, size and options (bump opts.v to force a re-bake). */
export function recipeKey(name, w, h, opts) {
  return `${name}|${w}|${h}|${JSON.stringify(opts || {})}`;
}

/**
 * Shelf packing: tallest first, rows left to right. Each item gets `pad` empty pixels on every side so
 * filtering never bleeds a neighbour in. Returns placements and the sheet size; throws if it cannot fit.
 * @param {{name:string,w:number,h:number}[]} items
 */
export function pack(items, maxW = 2048, maxH = 4096, pad = 4) {
  const order = items.slice().sort((a, b) => b.h - a.h || b.w - a.w || (a.name < b.name ? -1 : 1));
  const out = {}; let x = 0, y = 0, rowH = 0, width = 0;
  for (const it of order) {
    const cw = it.w + pad * 2, ch = it.h + pad * 2;
    if (cw > maxW) throw new Error(`bake: ${it.name} is wider than the sheet`);
    if (x + cw > maxW) { y += rowH; x = 0; rowH = 0; }
    out[it.name] = { x: x + pad, y: y + pad, w: it.w, h: it.h };
    x += cw; rowH = Math.max(rowH, ch); width = Math.max(width, x);
  }
  const height = y + rowH;
  if (height > maxH) throw new Error(`bake: sprites need ${height}px, the sheet holds ${maxH}`);
  return { width, height, at: out };
}

const say = (m) => { try { if (typeof lib !== 'undefined' && lib.log) lib.log(m); } catch (e) { /* no host */ } };

/** The sheet's URL, read when loading starts: the uploaded asset 'baked' on Astrocade, the local file elsewhere. */
function sheetUrl() {
  try { const a = typeof lib !== 'undefined' && lib.getAsset && lib.getAsset('baked'); if (a && a.url) return a.url; } catch (e) { /* no host */ }
  return './baked.webp';
}

/**
 * Loads the sheet (once; again after a failure). Resolves true when it is usable, false when it failed or
 * `timeout` ms passed (sprites are drawn live meanwhile). Never rejects. Call it from run(), not at import.
 */
export function bakeReady(timeout = 1500) {
  if (!BAKED || !BAKED.items || typeof Image === 'undefined') return Promise.resolve(false);
  if (!loading) loading = new Promise((done) => {
    const img = new Image(); img.crossOrigin = 'anonymous';
    img.onload = () => {
      sheet = img; sheetOk = img.naturalWidth === BAKED.width && img.naturalHeight === BAKED.height;
      if (!sheetOk) { say(`bake: sheet is ${img.naturalWidth}x${img.naturalHeight}, manifest says ${BAKED.width}x${BAKED.height}; drawing live`); loading = null; }
      done(sheetOk);
    };
    img.onerror = () => { say('bake: sheet did not load; drawing live'); loading = null; done(false); };
    img.src = sheetUrl();
  });
  let timer;
  return Promise.race([loading, new Promise((r) => { timer = setTimeout(() => r(sheetOk), timeout); })]).finally(() => clearTimeout(timer));
}

/**
 * Registers a sprite. `draw(ctx, w, h)` paints it at w×h design pixels; `opts.scale` bakes it sharper
 * (e.g. 2 for art shown large). Returns { draw(ctx, x, y, w?, h?), source() }.
 */
export function sprite(name, w, h, draw, opts) {
  if (recipes.has(name)) throw new Error(`bake: two sprites are named ${name}`);
  const scale = (opts && opts.scale) || 1, key = recipeKey(name, w, h, opts);
  let live = null;
  const liveCanvas = () => {
    if (!live) {
      live = document.createElement('canvas'); live.width = Math.ceil(w * scale); live.height = Math.ceil(h * scale);
      const c = live.getContext('2d'); c.scale(scale, scale); draw(c, w, h);
    }
    return live;
  };
  const s = {
    name, w, h, scale, key, paint: draw,
    /** Where to read the pixels from now: the sheet when it holds this sprite, else the live drawing. */
    source() {
      const it = BAKED && BAKED.items && BAKED.items[name];
      if (sheetOk && it && it.key === key) return { img: sheet, sx: it.x, sy: it.y, sw: it.w, sh: it.h, baked: true };
      const c = liveCanvas();
      return { img: c, sx: 0, sy: 0, sw: c.width, sh: c.height, baked: false };
    },
    draw(ctx, x, y, dw = w, dh = h) { const p = s.source(); ctx.drawImage(p.img, p.sx, p.sy, p.sw, p.sh, x, y, dw, dh); },
  };
  recipes.set(name, s);
  return s;
}

/** Every registered sprite. */
export function bakeList() { return [...recipes.values()]; }

// tools/bake.js reads the sprites through this, in the module page and inside the esbuild bundle alike
if (typeof globalThis !== 'undefined') globalThis.__bakeKit = { bakeList, bakeReady, pack, manifest: BAKED };
