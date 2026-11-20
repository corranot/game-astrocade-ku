// PROTOTYPE - NOT FOR PRODUCTION
/**
 * The painted art: the salon room, four children (each a 2x2 sheet of moods), hair accessories and salon tools.
 * Images come from the platform's asset map; their crop boxes and each child's skull circle are measured once
 * and kept in game_config.json (sprites). Every draw returns false while its image is missing, so the caller
 * falls back to the art drawn in code (art.js) and the game always runs.
 */
const IMG = {};
const MOODS = { grumpy: 0, happy: 1, eek: 2, wow: 3, giggle: 3, sleepy: 1 };
const BUSTS = new Map(); // a child's mood pre-scaled to the head size: one plain copy per frame instead of a scaled one
let SP = {};

/** Start loading every image the config measures. Safe to call again; images already asked for are kept. */
export function loadSprites(sprites) {
  SP = sprites || {};
  for (const id of Object.keys(SP).concat('salon_bg')) {
    if (IMG[id]) continue;
    let a = null; try { a = lib.getAsset(id); } catch (e) { /* no asset map here */ }
    if (!a || !a.url) continue;
    const im = new Image(); im.crossOrigin = 'anonymous'; im.decoding = 'async'; im.src = a.url; IMG[id] = im;
  }
}
/** Whether image id has arrived. */
export const ready = (id) => { const im = IMG[id]; return !!(im && im.complete && im.naturalWidth > 0); };
/** Whether every image has arrived or failed (nothing is still on its way). */
export const settled = () => Object.values(IMG).every((im) => im.complete);

/**
 * A child, head and shoulders, in mood m, with the skull circle at (x, y) and radius R. Returns false when the
 * sheet is not loaded.
 */
export function drawBust(g, kid, mood, x, y, R) {
  const id = 'kid_' + kid; if (!ready(id) || !SP[id]) return false;
  const i = MOODS[mood] ?? 1, [bx, by, bw, bh] = SP[id].cells[i], [sx, sy, sr] = SP[id].skull[i], k = R / sr;
  const key = id + i + '@' + Math.round(R);
  let c = BUSTS.get(key);
  if (!c) {
    c = document.createElement('canvas'); c.width = Math.ceil(bw * k); c.height = Math.ceil(bh * k);
    const q = c.getContext('2d'); q.imageSmoothingQuality = 'high'; q.drawImage(IMG[id], bx, by, bw, bh, 0, 0, c.width, c.height);
    if (R > 60) { // the shoulders fade out instead of ending in a cut edge
      const f = q.createLinearGradient(0, c.height * 0.8, 0, c.height); f.addColorStop(0, 'rgba(0,0,0,0)'); f.addColorStop(1, 'rgba(0,0,0,1)');
      q.globalCompositeOperation = 'destination-out'; q.fillStyle = f; q.fillRect(0, c.height * 0.8, c.width, c.height * 0.2); q.globalCompositeOperation = 'source-over';
    }
    if (BUSTS.size > 24) BUSTS.clear();
    BUSTS.set(key, c);
  }
  g.drawImage(c, Math.round(x - sx * k), Math.round(y - sy * k));
  return true;
}

/** Cell n of a sheet drawn to fit a box of size s centred on (x, y), turned by rot. False when not loaded. */
function cell(g, id, n, x, y, s, rot = 0) {
  if (!ready(id) || !SP[id] || !SP[id].cells[n]) return false;
  const [bx, by, bw, bh] = SP[id].cells[n], k = s / Math.max(bw, bh);
  g.save(); g.translate(x, y); if (rot) g.rotate(rot);
  g.drawImage(IMG[id], bx, by, bw, bh, -bw * k / 2, -bh * k / 2, bw * k, bh * k);
  g.restore(); return true;
}
/** A whole image (crop box from the config) centred on (x, y) at width w, faded to alpha. False when not loaded. */
export function drawWhole(g, id, x, y, w, alpha = 1) {
  if (!ready(id) || !SP[id]) return false;
  const [bx, by, bw, bh] = SP[id].cells[0], k = w / bw;
  g.globalAlpha = alpha; g.drawImage(IMG[id], bx, by, bw, bh, x - w / 2, y - bh * k / 2, w, bh * k); g.globalAlpha = 1;
  return true;
}
const ACC = ['bow', 'flower', 'starclip', 'crown', 'butterfly', 'heart', 'tiara', 'cherry'];
const TOOLS = { foam: 0, scissors: 1, brush: 2, dryer: 3, bowl: 4, comb: 5 };
/** A painted hair accessory. */
export const drawAccSprite = (g, id, x, y, s, rot) => cell(g, 'accessories_sheet', ACC.indexOf(id), x, y, s, rot);
/** A painted salon tool: foam (shampoo), scissors, brush, dryer, bowl, comb. */
export const drawToolSprite = (g, kind, x, y, s, rot) => kind in TOOLS && cell(g, 'tools_sheet', TOOLS[kind], x, y, s, rot);

/** The salon room, covering w x h. False when not loaded. */
export function drawRoom(g, w, h) {
  if (!ready('salon_bg')) return false;
  const im = IMG.salon_bg, k = Math.max(w / im.naturalWidth, h / im.naturalHeight), dw = im.naturalWidth * k, dh = im.naturalHeight * k;
  g.drawImage(im, (w - dw) / 2, (h - dh) / 2, dw, dh);
  return true;
}
