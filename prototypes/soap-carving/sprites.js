/**
 * The painted art: the studio table (seen from above), four customers (each a 2x2 sheet of moods: calm, happy,
 * wow, oops), the tools, the gems, the charms and the bath bowl. Images come from the platform's asset map;
 * each sheet's crop boxes are measured once and kept in game_config.json (sprites). Every draw returns false
 * while its image is missing, so the caller draws a simple shape instead and the game always runs.
 */
const IMG = {};
let SP = {};
const CACHE = new Map(); // sheet cells pre-scaled to the size they are drawn at: a plain copy per frame, not a scaled one

/** Start loading every image. Safe to call again; images already asked for are kept. */
export function loadSprites(sprites) {
  SP = sprites || {};
  for (const id of Object.keys(SP).concat('studio_bg', 'bath_bowl')) {
    if (IMG[id]) continue;
    let a = null; try { a = lib.getAsset(id); } catch (e) { /* no asset map here */ }
    if (!a || !a.url) continue;
    const im = new Image(); im.crossOrigin = 'anonymous'; im.decoding = 'async'; im.src = a.url; IMG[id] = im;
  }
}
/** Whether image id has arrived. */
export const ready = (id) => { const im = IMG[id]; return !!(im && im.complete && im.naturalWidth > 0); };
/** Whether every image has arrived or failed. */
export const settled = () => Object.values(IMG).every((im) => im.complete);

/** Cell n of sheet id scaled to fit a box of size s: a cached canvas, or null while loading. */
export function cellCanvas(id, n, s) {
  if (!ready(id) || !SP[id] || !SP[id].cells[n]) return null;
  const key = id + n + '@' + Math.round(s); let c = CACHE.get(key);
  if (!c) {
    const [bx, by, bw, bh] = SP[id].cells[n], k = s / Math.max(bw, bh);
    c = document.createElement('canvas'); c.width = Math.max(1, Math.round(bw * k)); c.height = Math.max(1, Math.round(bh * k));
    const q = c.getContext('2d'); q.imageSmoothingQuality = 'high'; q.drawImage(IMG[id], bx, by, bw, bh, 0, 0, c.width, c.height);
    if (CACHE.size > 80) CACHE.clear();
    CACHE.set(key, c);
  }
  return c;
}
/** Cell n of sheet id fitted to a box of size s, centred on (x, y), turned by rot. False while loading. */
export function drawCell(g, id, n, x, y, s, rot = 0) {
  const c = cellCanvas(id, n, s); if (!c) return false;
  if (rot) { g.save(); g.translate(x, y); g.rotate(rot); g.drawImage(c, -c.width / 2, -c.height / 2); g.restore(); }
  else g.drawImage(c, Math.round(x - c.width / 2), Math.round(y - c.height / 2));
  return true;
}
/** Like drawCell, for a size that changes every frame (a pop or a pulse): one cached copy at size base, scaled. */
export function drawCellAt(g, id, n, x, y, s, base = 96) {
  const c = cellCanvas(id, n, base); if (!c) return false;
  const k = s / base; g.drawImage(c, x - c.width * k / 2, y - c.height * k / 2, c.width * k, c.height * k);
  return true;
}
/** The studio table, covering w x h. The flat lay is wider than tall, so it is turned a quarter. False while loading. */
export function drawTable(g, w, h) {
  if (!ready('studio_bg')) return false;
  const im = IMG.studio_bg, iw = im.naturalHeight, ih = im.naturalWidth, k = Math.max(w / iw, h / ih);
  g.save(); g.translate(w / 2, h / 2); g.rotate(Math.PI / 2); g.drawImage(im, -ih * k / 2, -iw * k / 2, ih * k, iw * k); g.restore();
  return true;
}
/** The bath bowl, diameter d, centred on (x, y). False while loading. */
export function drawBowl(g, x, y, d) {
  if (!ready('bath_bowl')) return false;
  const key = 'bowl@' + Math.round(d); let c = CACHE.get(key);
  if (!c) { c = document.createElement('canvas'); c.width = c.height = Math.round(d); const q = c.getContext('2d'); q.imageSmoothingQuality = 'high'; q.drawImage(IMG.bath_bowl, 0, 0, c.width, c.height); CACHE.set(key, c); }
  g.drawImage(c, Math.round(x - d / 2), Math.round(y - d / 2));
  return true;
}

