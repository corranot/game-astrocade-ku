/* Rub It Away image store: loads every picture through lib.getAsset(id).url with a real progress callback, and hands out stickers that fall back to a labelled rounded placeholder when an asset is missing or fails to load. */
import { INK, FONT, rr, hash } from './util.js';

const store = new Map();
const pending = new Map();

function assetUrl(id) {
  try { const a = window.lib && window.lib.getAsset(id); return a && a.url ? a.url : null; } catch (e) { return null; }
}

function loadImage(url, cors) {
  return new Promise((res) => {
    const im = new Image();
    let done = false;
    const fin = (v) => { if (!done) { done = true; res(v); } };
    if (cors) im.crossOrigin = 'anonymous';
    im.onload = () => fin(im);
    im.onerror = () => fin(null);
    setTimeout(() => fin(null), 9000);
    im.src = url;
  });
}

export function loadAsset(id) {
  if (store.has(id)) return Promise.resolve(store.get(id));
  if (pending.has(id)) return pending.get(id);
  const url = assetUrl(id);
  const p = (async () => {
    let img = null;
    if (url) { img = await loadImage(url, true); if (!img) img = await loadImage(url, false); }
    if (!img) { try { window.lib.log('asset missing: ' + id); } catch (e) { img = null; } }
    store.set(id, img);
    pending.delete(id);
    return img;
  })();
  pending.set(id, p);
  return p;
}

export async function loadMany(ids, onProgress) {
  let n = 0;
  const total = ids.length || 1;
  await Promise.all(ids.map((id) => loadAsset(id).then(() => { n++; if (onProgress) onProgress(n / total); })));
  if (onProgress) onProgress(1);
}

export function isReal(id) { return !!store.get(id); }

function placeholder(id, w, h, bg) {
  const c = document.createElement('canvas');
  c.width = Math.max(8, Math.round(w)); c.height = Math.max(8, Math.round(h));
  const g = c.getContext('2d');
  const hue = hash(id) % 360;
  if (!bg) {
    rr(g, 5, 5, c.width - 10, c.height - 10, Math.min(36, c.width / 4));
    g.fillStyle = 'hsl(' + hue + ',55%,46%)'; g.fill();
    g.lineWidth = 8; g.strokeStyle = INK; g.stroke();
  }
  const words = id.replace(/_/g, ' ');
  const size = Math.max(16, Math.min(40, c.width * 0.9 / Math.max(4, words.length) * 1.9));
  g.font = '900 ' + size + 'px ' + FONT; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.lineWidth = size * 0.2; g.lineJoin = 'round'; g.strokeStyle = INK; g.strokeText(words, c.width / 2, c.height / 2);
  g.fillStyle = '#fff'; g.fillText(words, c.width / 2, c.height / 2);
  if (bg) {
    const gr = g.createLinearGradient(0, 0, 0, c.height);
    g.globalCompositeOperation = 'destination-over';
    gr.addColorStop(0, bg[0]); gr.addColorStop(1, bg[1]);
    g.fillStyle = gr; g.fillRect(0, 0, c.width, c.height);
  }
  return c;
}

const phCache = new Map();
export function sprite(id, w, ar) {
  const im = store.get(id);
  if (im) return { src: im, w, h: w * im.naturalHeight / im.naturalWidth, real: true };
  const h = w / (ar || 1), key = id + '|' + Math.round(w) + '|' + Math.round(h);
  if (!phCache.has(key)) phCache.set(key, placeholder(id, w, h));
  return { src: phCache.get(key), w, h, real: false };
}

const bgCache = new Map();
export function background(id, world) {
  const im = store.get(id);
  if (im) return im;
  if (bgCache.has(id)) return bgCache.get(id);
  const grad = world === 'kitchen' ? ['#d8b27a', '#8a5a32'] : world === 'pond' ? ['#7fb0d8', '#d9e4ee'] : world === 'zoo' ? ['#4aa5e0', '#4a9a3a'] : world === 'town' ? ['#4aa5e0', '#8a8f99'] : world === 'space' ? ['#1c1850', '#6a5f8a'] : world === 'beach' ? ['#4aa5e0', '#e8b84a'] : world === 'castle' ? ['#4aa5e0', '#4a9a3a'] : world === 'sea' ? ['#2a8fc0', '#d9b46a'] : world === 'fair' ? ['#4aa5e0', '#d9a05a'] : world === 'jungle' ? ['#2f8f4a', '#5a7a3a'] : world === 'snow' ? ['#a8dff7', '#eef9ff'] : world === 'candy' ? ['#9fd8f5', '#ffc2dc'] : ['#7fb6d6', '#5a9a46'];
  const c = placeholder(id, 720, 1080, grad);
  bgCache.set(id, c);
  return c;
}
