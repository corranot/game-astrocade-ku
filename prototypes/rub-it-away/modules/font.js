/* Rub It Away font: registers the embedded subset faces (fontdata.js, base64 woff2, family RubFont) with document.fonts, no network. fontsOk() turns true when every face is decoded (or failed, so text never stays hidden); the first frames skip text until then. */
import { FACES } from './fontdata.js';

export const FAMILY = 'RubFont';
let ok = false;

export const fontsReady = (async () => {
  try {
    const faces = FACES.map((f) => new FontFace(FAMILY, 'url(data:font/woff2;base64,' + f.b64 + ')', { weight: '800 900', unicodeRange: f.range, display: 'block' }));
    faces.forEach((f) => document.fonts.add(f));
    await Promise.all(faces.map((f) => f.load()));
  } catch (e) { /* fall back to the generic face */ }
  ok = true;
})();

export const fontsOk = () => ok;
