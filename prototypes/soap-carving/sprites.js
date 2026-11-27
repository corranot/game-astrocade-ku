/**
 * The painted art: the studio table (seen from above), four customers (each a 2x2 sheet of moods: calm, happy,
 * wow, oops), the tools, the gems, the charms and the bath bowl. Images come from the platform's asset map;
 * each sheet's crop boxes are measured once and kept in game_config.json (sprites). Every draw returns false
 * while its image is missing, so the caller draws a simple shape instead and the game always runs.
 */
const IMG = {};
let SP = {};
const CACHE = new Map(); // sheet cells pre-scaled to the size they are drawn at: a plain copy per frame, not a scaled one

/** Ask for image id once. */
function want(id) {
  if (IMG[id]) return;
  let a = null; try { a = lib.getAsset(id); } catch (e) { /* no asset map here */ }
  if (!a || !a.url) return;
  const im = new Image(); im.crossOrigin = 'anonymous'; im.decoding = 'async'; im.src = a.url; IMG[id] = im;
}
let PREV = null;
/**
 * Start loading images: only the ones the first picture needs (first), so they do not share the connection with
 * the rest. loadRest() asks for everything else. preview: a tiny inline copy of the table shown until it arrives.
 */
export function loadSprites(sprites, first = [], preview = '') {
  SP = sprites || {};
  if (preview && !PREV) { PREV = new Image(); PREV.src = preview; }
  for (const id of first) want(id);
}
/** How many images have arrived: a change redraws cached layers that used stand-ins. */
export const loadedN = () => Object.values(IMG).reduce((n, im) => n + (im.complete && im.naturalWidth > 0 ? 1 : 0), 0);
/** Whether the tiny table preview has decoded. */
export const previewIn = () => !!(PREV && PREV.complete && PREV.naturalWidth);
/** Load every other image. Safe to call again. */
export function loadRest() { for (const id of Object.keys(SP).concat('studio_bg', 'bath_bowl')) want(id); }
/** Whether image id has arrived. */
export const ready = (id) => { const im = IMG[id]; return !!(im && im.complete && im.naturalWidth > 0); };
/** Whether every image has arrived or failed (all of them asked for). */
export const settled = () => Object.keys(IMG).length >= Object.keys(SP).length + 2 && Object.values(IMG).every((im) => im.complete);

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
/** The studio table, covering w x h. The flat lay is wider than tall, so it is turned a quarter. 'preview' while only the tiny copy is in, false before that. */
export function drawTable(g, w, h) {
  const im = ready('studio_bg') ? IMG.studio_bg : previewIn() ? PREV : null;
  if (!im) return false;
  const iw = im.naturalHeight, ih = im.naturalWidth, k = Math.max(w / iw, h / ih);
  g.save(); g.imageSmoothingQuality = 'high'; g.translate(w / 2, h / 2); g.rotate(Math.PI / 2); g.drawImage(im, -ih * k / 2, -iw * k / 2, ih * k, iw * k); g.restore();
  return im === IMG.studio_bg ? true : 'preview';
}
/** The bath bowl, diameter d, centred on (x, y). False while loading. */
export function drawBowl(g, x, y, d) {
  if (!ready('bath_bowl')) return false;
  const key = 'bowl@' + Math.round(d); let c = CACHE.get(key);
  if (!c) { c = document.createElement('canvas'); c.width = c.height = Math.round(d); const q = c.getContext('2d'); q.imageSmoothingQuality = 'high'; q.drawImage(IMG.bath_bowl, 0, 0, c.width, c.height); CACHE.set(key, c); }
  g.drawImage(c, Math.round(x - d / 2), Math.round(y - d / 2));
  return true;
}

