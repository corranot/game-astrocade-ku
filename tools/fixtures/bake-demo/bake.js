// PROTOTYPE - NOT FOR PRODUCTION
// (the header is here so the copies in prototypes/ carry it; tools/astrocade-upload-set.sh drops it)
// Baked sprites: art a game draws with canvas code, drawn once by tools/bake.js into one sheet (baked.webp +
// bake-manifest.js) and read back from it at run time. Copy this file unchanged into a game folder as bake.js;
// tools/ci-checks.sh fails when a copy differs from tools/kit/bake.js.
//
//   import { sprite, bakeReady } from './bake.js';
//   const COIN = sprite('coin', 96, 96, (ctx, w, h) => { ... });   // at module top level, so tools/bake.js sees it
//   await bakeReady();                                              // in run(), before the first frame (optional)
//   COIN.draw(ctx, x, y, w, h);
//
// A sprite whose recipe changed since the last bake (or a sheet that never loaded) is drawn live from its own
// code, exactly as before baking: a player never sees a broken sprite. `node tools/bake.js <game> --check` is
// what fails on a stale bake.
import { BAKED } from './bake-manifest.js';

const recipes = new Map();
let sheet = null, sheetOk = false, loading = null;

/** FNV-1a over a recipe's name, size, options and drawing code: changes whenever the drawn pixels can. */
export function recipeHash(name, w, h, draw, opts) {
  const s = `${name}|${w}|${h}|${JSON.stringify(opts || {})}|${String(draw)}`;
  let x = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { x ^= s.charCodeAt(i); x = Math.imul(x, 0x01000193) >>> 0; }
  return x.toString(16).padStart(8, '0');
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

/** The sheet's URL: the uploaded asset 'baked' on Astrocade, the local file elsewhere. */
function sheetUrl() {
  try { const a = typeof lib !== 'undefined' && lib.getAsset && lib.getAsset('baked'); if (a && a.url) return a.url; } catch (e) { /* no host */ }
  return './baked.webp';
}

/** Starts loading the sheet once; resolves when it is usable, failed, or after `timeout` ms (never rejects). */
export function bakeReady(timeout = 1500) {
  if (!BAKED || !BAKED.items || typeof Image === 'undefined') return Promise.resolve(false);
  if (!loading) loading = new Promise((done) => {
    sheet = new Image(); sheet.crossOrigin = 'anonymous';
    sheet.onload = () => { sheetOk = sheet.naturalWidth === BAKED.width && sheet.naturalHeight === BAKED.height; done(sheetOk); };
    sheet.onerror = () => done(false);
    sheet.src = sheetUrl();
  });
  return Promise.race([loading, new Promise((r) => setTimeout(() => r(sheetOk), timeout))]);
}

/**
 * Registers a sprite. `draw(ctx, w, h)` paints it at w×h design pixels; `opts.scale` bakes it sharper
 * (e.g. 2 for art shown large). Returns { draw(ctx, x, y, w?, h?), source() }.
 */
export function sprite(name, w, h, draw, opts) {
  if (recipes.has(name)) throw new Error(`bake: two sprites are named ${name}`);
  const scale = (opts && opts.scale) || 1, hash = recipeHash(name, w, h, draw, opts);
  let live = null;
  const liveCanvas = () => {
    if (!live) {
      live = document.createElement('canvas'); live.width = Math.ceil(w * scale); live.height = Math.ceil(h * scale);
      const c = live.getContext('2d'); c.scale(scale, scale); draw(c, w, h);
    }
    return live;
  };
  const s = {
    name, w, h, scale, hash, paint: draw,
    /** Where to read the pixels from now: the sheet when it holds this exact recipe, else the live drawing. */
    source() {
      const it = BAKED && BAKED.items && BAKED.items[name];
      if (sheetOk && it && it.hash === hash) return { img: sheet, sx: it.x, sy: it.y, sw: it.w, sh: it.h, baked: true };
      const c = liveCanvas();
      return { img: c, sx: 0, sy: 0, sw: c.width, sh: c.height, baked: false };
    },
    draw(ctx, x, y, dw = w, dh = h) { const p = s.source(); ctx.drawImage(p.img, p.sx, p.sy, p.sw, p.sh, x, y, dw, dh); },
  };
  recipes.set(name, s);
  if (typeof Image !== 'undefined') bakeReady(0);
  return s;
}

/** Every registered sprite (tools/bake.js reads it through the page). */
export function bakeList() { return [...recipes.values()]; }
