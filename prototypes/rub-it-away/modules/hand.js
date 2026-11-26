/* Rub It Away coach hand: draws the generated pointing-hand sticker (asset id hand_point) so its fingertip, not its centre, sits on the given point; soft dark-plum drop shadow, press bounce, nothing at all while the picture is not loaded. */
import { sprite, isReal } from './assets.js';

export const HAND_ID = 'hand_point';
const WIDTH = 150;
let tip = null;

/* The fingertip is the topmost opaque point of the sticker (the finger points up); read once from the loaded picture, with a safe guess if the pixels cannot be read. */
function findTip(im) {
  if (tip) return tip;
  tip = { x: 0.5, y: 0.03 };
  try {
    const c = document.createElement('canvas'); const w = 96, h = Math.max(8, Math.round(96 * im.naturalHeight / im.naturalWidth));
    c.width = w; c.height = h;
    const q = c.getContext('2d'); q.drawImage(im, 0, 0, w, h);
    const d = q.getImageData(0, 0, w, h).data;
    for (let y = 0; y < h; y++) {
      let sx = 0, n = 0;
      for (let x = 0; x < w; x++) if (d[(y * w + x) * 4 + 3] > 100) { sx += x; n++; }
      if (n > 1) {
        let sx2 = 0, n2 = 0;
        for (let yy = y; yy < Math.min(h, y + 4); yy++) for (let x = 0; x < w; x++) if (d[(yy * w + x) * 4 + 3] > 100) { sx2 += x; n2++; }
        tip = { x: sx2 / n2 / w, y: (y + 1.5) / h };
        break;
      }
    }
  } catch (e) { /* keep the guess */ }
  return tip;
}

export function drawHand(g, x, y, s = 1, press = 0) {
  if (!isReal(HAND_ID)) return;
  const sp = sprite(HAND_ID, WIDTH * s, 1), k = findTip(sp.src), dip = press * 7;
  g.save();
  g.translate(x, y + dip);
  g.rotate(press * 0.04);
  g.shadowColor = 'rgba(58,47,69,0.5)'; g.shadowBlur = 14; g.shadowOffsetX = 5; g.shadowOffsetY = 10;
  g.drawImage(sp.src, -sp.w * k.x, -sp.h * k.y, sp.w, sp.h);
  g.restore();
}
