// PROTOTYPE - NOT FOR PRODUCTION
/**
 * The WebGL layer (PixiJS 8): the painted room, light rays, the painted messy mop, the child, and the hair.
 * Every strand of the simulation (hair.js) is drawn as painted locks: MeshRopes that follow its points, three
 * per run of one colour (a white silhouette tinted the dye's light tone, a strand-detail layer tinted its dark
 * tone, and a sheen), each cut from the matching stretch of one painted lock texture, so a cut strand ends
 * blunt where it was cut. The 2D canvas on top keeps the HUD, the scalp, lather and accessories.
 * When PixiJS or WebGL is not available nothing here runs and the 2D canvas draws everything.
 */
import { colorOf } from './hair.js';
import { ready, imageOf, bustCanvas } from './sprites.js';

let P = null, app = null, root = null, layers = null, tex = null, state = 'off'; // off, starting, on, failed
const strandViews = new Map(); // strand object -> { sig, runs: [{ pts, ropes }] }
const pieceViews = new Map();
let shown = {};

/** Turn the WebGL layer off for good (too slow here): the 2D canvas draws everything again. */
export function stopGL() {
  if (state !== 'on' || /[?&]keepgl/.test(location.search)) return;
  state = 'failed'; strandViews.clear(); pieceViews.clear(); fan.length = 0; shown = {};
  try { app.canvas.remove(); app.destroy(true, { children: true }); } catch (e) { /* already gone */ }
}
/** Start PixiJS on a canvas placed under the 2D one, when the library is there. Safe to call every frame. */
export function startGL(stage, under, W, H) {
  if (state !== 'off' || !window.PIXI || /[?&]nogl/.test(location.search)) return;
  P = window.PIXI; state = 'starting';
  const canvas = document.createElement('canvas'); canvas.id = 'gl';
  canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;pointer-events:none';
  stage.insertBefore(canvas, under);
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  app = new P.Application();
  app.init({ canvas, width: W, height: H, resolution: dpr, autoDensity: false, antialias: dpr < 2, backgroundColor: 0xf3e8ff, preference: 'webgl', autoStart: false, sharedTicker: false })
    .then(() => {
      root = new P.Container(); app.stage.addChild(root);
      layers = {}; for (const k of ['room', 'rays', 'mop', 'bust', 'hair', 'scalp', 'mopFront', 'pieces']) { layers[k] = new P.Container(); root.addChild(layers[k]); }
      state = 'on';
    })
    .catch(() => { state = 'failed'; canvas.remove(); });
}
/** Whether the WebGL layer draws the scene this frame. */
export const glOn = () => state === 'on' && !!lockTex();

function lockTex() {
  if (tex) return tex;
  const im = imageOf('hair_lock'); if (!im) return null;
  const src = P.Texture.from(im).source, frame = (y) => new P.Texture({ source: src, frame: new P.Rectangle(0, y, 512, 48) });
  tex = { src, base: frame(0), shade: frame(52), sheen: frame(104) };
  return tex;
}
const hex = (c) => parseInt(c.replace('#', ''), 16);
/** The light and dark tones of a dye: the dye itself, and the dye pushed toward black. */
function tones(c) {
  const n = hex(c), r = n >> 16, g = (n >> 8) & 255, b = n & 255, d = (x) => Math.round(x * 0.42);
  const lift = (x) => Math.min(255, Math.round(x * 1.08 + 10));
  return [(lift(r) << 16) | (lift(g) << 8) | lift(b), (d(r) << 16) | (d(g) << 8) | d(b)];
}

/** Three ropes (silhouette, detail, sheen) for points i0..i1 of a strand with P points in all, in colour c. */
function lockRopes(points, i0, i1, total, c, parent) {
  const t = lockTex(), u0 = Math.max(0, (i0 / (total - 1)) * 512), u1 = Math.min(512, (i1 / (total - 1)) * 512), w = Math.max(2, u1 - u0);
  const part = (base, y) => new P.Texture({ source: t.src, frame: new P.Rectangle(u0, y, w, 48) });
  const [light, dark] = tones(c);
  const ropes = [[part(t.base, 0), light, 1], [part(t.shade, 52), dark, 0.95], [part(t.sheen, 104), 0xffffff, 0.55]].map(([tx, tint, alpha]) => {
    const r = new P.MeshRope({ texture: tx, points, textureScale: 0 }); r.tint = tint; r.alpha = alpha; parent.addChild(r); return r;
  });
  return ropes;
}
const free = (ropes) => { for (const r of ropes) { r.texture.destroy(false); r.destroy(); } };

/** Bring the hair ropes in line with the simulation: rebuild a strand's ropes only when its colours or length changed. */
function syncHair(h) {
  const total = h.strands[0].x.length, seen = new Set();
  for (const s of h.strands) {
    seen.add(s);
    let sig = String(s.len), runs = [];
    for (let i = 1; i <= s.len;) { const c = colorOf(s.col[i], i); let j = i; while (j + 1 <= s.len && colorOf(s.col[j + 1], j + 1) === c) j++; runs.push([i - 1, j, c]); sig += '|' + i + c; i = j + 1; }
    let v = strandViews.get(s);
    if (!v || v.sig !== sig) {
      if (v) for (const r of v.runs) free(r.ropes);
      v = { sig, runs: runs.map(([a, b, c]) => { const pts = []; for (let k = a; k <= b; k++) pts.push(new P.Point(s.x[k], s.y[k])); return { a, pts, ropes: lockRopes(pts, a, b, total, c, layers.hair) }; }) };
      strandViews.set(s, v);
    }
    for (const r of v.runs) for (let k = 0; k < r.pts.length; k++) { r.pts[k].x = s.x[r.a + k]; r.pts[k].y = s.y[r.a + k]; }
  }
  for (const [s, v] of strandViews) if (!seen.has(s)) { for (const r of v.runs) free(r.ropes); strandViews.delete(s); }
  // falling cut ends
  const live = new Set(h.pieces);
  for (const p of h.pieces) {
    let v = pieceViews.get(p);
    if (!v) { const pts = []; for (let k = 0; k < p.x.length; k++) pts.push(new P.Point(p.x[k], p.y[k])); v = { pts, ropes: lockRopes(pts, p.i0 || 0, (p.i0 || 0) + p.x.length - 1, total, colorOf(p.col[1] ?? p.col[0], 1), layers.pieces) }; pieceViews.set(p, v); }
    for (let k = 0; k < v.pts.length; k++) { v.pts[k].x = p.x[k]; v.pts[k].y = p.y[k]; }
    for (const r of v.ropes) r.alpha = Math.min(1, p.life * 1.5) * (r === v.ropes[2] ? 0.55 : 1);
  }
  for (const [p, v] of pieceViews) if (!live.has(p)) { free(v.ropes); pieceViews.delete(p); }
}

/**
 * The scalp: a fan of painted locks combed from a middle parting over the crown to the temples, in front of the
 * hanging strands. Each lock takes the root colour of the strand nearest its end, so dye shows on the scalp too.
 */
const FAN = 34, fan = [];
function syncScalp(h, head) {
  const t = lockTex();
  if (!fan.length) for (let k = 0; k < FAN; k++) {
    const pts = []; for (let j = 0; j < 9; j++) pts.push(new P.Point(0, 0));
    const ropes = [[0, 1], [52, 0.45], [104, 0.6]].map(([y, a]) => { const r = new P.MeshRope({ texture: new P.Texture({ source: t.src, frame: new P.Rectangle(70, y, 260, 48) }), points: pts, textureScale: 0 }); r.alpha = a; layers.scalp.addChild(r); return r; });
    fan.push({ pts, ropes });
  }
  const { x: cx, y: cy, R } = head, st = h.strands, vol = 1 + h.volume * 0.05;
  fan.forEach((f, k) => {
    const side = k < FAN / 2 ? -1 : 1, u = (k < FAN / 2 ? FAN / 2 - 1 - k : k - FAN / 2) / (FAN / 2 - 1); // 0 at the parting, 1 at the temple
    const end = -Math.PI / 2 + side * (0.25 + u * 1.2), er = R * (0.97 + 0.04 * vol);
    const p0x = cx + side * (4 + u * 10), p0y = cy - R * (0.64 + 0.05 * (1 - u)), ex = cx + Math.cos(end) * er, ey = cy + Math.sin(end) * er;
    const qx = cx + side * R * (0.25 + u * 0.55), qy = cy - R * (1.0 - u * 0.25);
    for (let j = 0; j < 9; j++) { const s = j / 8, a = (1 - s) * (1 - s), b = 2 * (1 - s) * s, c = s * s; f.pts[j].x = a * p0x + b * qx + c * ex; f.pts[j].y = a * p0y + b * qy + c * ey; }
    let best = st[0], bd = 9; for (const s of st) { const d = Math.abs(s.a - end); if (d < bd) { bd = d; best = s; } }
    const [light, dark] = tones(colorOf(best.col[1], 1)), mid = ((((light >> 16) + (dark >> 16) * 0.35) / 1.35) << 16) | (((((light >> 8) & 255) + ((dark >> 8) & 255) * 0.35) / 1.35) << 8) | (((light & 255) + (dark & 255) * 0.35) / 1.35);
    f.ropes[0].tint = mid; f.ropes[1].tint = dark; f.ropes[2].tint = 0xffffff;
  });
}

/** Forget every rope (a new customer). */
export function clearHair() { for (const v of strandViews.values()) for (const r of v.runs) free(r.ropes); strandViews.clear(); for (const v of pieceViews.values()) free(v.ropes); pieceViews.clear(); }

function sprite(layer, key, im) {
  if (!im) { if (shown[key]) shown[key].visible = false; return null; }
  if (!shown[key] || shown[key]._im !== im) { if (shown[key]) shown[key].destroy(); const s = new P.Sprite(P.Texture.from(im)); s._im = im; layers[layer].addChild(s); shown[key] = s; }
  shown[key].visible = true; return shown[key];
}
let raysCanvas = null;
function raysImage() {
  if (raysCanvas) return raysCanvas;
  const c = document.createElement('canvas'); c.width = c.height = 1040; const q = c.getContext('2d'), r = 520;
  const gr = q.createRadialGradient(r, r, 40, r, r, r); gr.addColorStop(0, 'rgba(255,244,200,0.95)'); gr.addColorStop(1, 'rgba(255,244,200,0)'); q.fillStyle = gr;
  for (let i = 0; i < 12; i++) { q.beginPath(); q.moveTo(r, r); q.arc(r, r, r, i * Math.PI / 6, i * Math.PI / 6 + 0.16); q.closePath(); q.fill(); }
  q.beginPath(); q.arc(r, r, r * 0.55, 0, 7); q.fill();
  return (raysCanvas = c);
}

/**
 * Draw the scene for this frame. scene: { W, H, punch, head, kid, mood, hair, showMop, mopAlpha, rays (0..1),
 * raysT, hideStrands }.
 */
export function drawGL(sc) {
  root.scale.set(sc.punch); root.position.set(sc.W / 2 * (1 - sc.punch), sc.H / 2 * (1 - sc.punch));
  const room = sprite('room', 'room', imageOf('salon_bg'));
  if (room) { const k = Math.max(sc.W / room.texture.width, sc.H / room.texture.height); room.scale.set(k); room.position.set((sc.W - room.texture.width * k) / 2, (sc.H - room.texture.height * k) / 2); }
  const rays = sprite('rays', 'rays', sc.rays > 0 ? raysImage() : null);
  if (rays) { rays.anchor.set(0.5); rays.position.set(sc.head.x, sc.head.y - 40); rays.rotation = sc.raysT * 0.4; rays.alpha = sc.rays; }
  const w = sc.head.R * 3.3 * (1 + Math.sin(sc.t * 2.2) * 0.012);
  for (const [layer, key] of [['mop', 'mop'], ['mopFront', 'mopFront']]) { // the painted bed-head behind the head, and again over the crown
    const m = sprite(layer, key, sc.showMop ? imageOf('messy_hair') : null);
    if (m) { m.anchor.set(0.5); m.scale.set(w / m.texture.width); m.position.set(sc.head.x, sc.head.y - sc.head.R * 0.05); m.alpha = sc.mopAlpha; }
  }
  if (shown.mopFront) { // only the crown, down to a soft hairline above the brows
    const { x, y, R } = sc.head;
    if (!shown.crown || shown.crown._R !== R) {
      if (shown.crown) shown.crown.destroy();
      const c = document.createElement('canvas'); c.width = Math.ceil(R * 3.2); c.height = Math.ceil(R * 1.8); const q = c.getContext('2d');
      const lin = q.createLinearGradient(0, 0, 0, c.height); // opaque over the crown, fading out to the hairline above the brows
      lin.addColorStop(0, '#fff'); lin.addColorStop(0.3, '#fff'); lin.addColorStop(0.42, 'rgba(255,255,255,0)'); lin.addColorStop(1, 'rgba(255,255,255,0)');
      q.fillStyle = lin; q.fillRect(0, 0, c.width, c.height);
      shown.crown = new P.Sprite(P.Texture.from(c)); shown.crown._R = R; layers.mopFront.addChild(shown.crown); shown.mopFront.mask = shown.crown;
    }
    shown.crown.position.set(x - R * 1.6, y - R * 1.0);
  }
  const b = bustCanvas(sc.kid, sc.mood, sc.head.R);
  const bust = sprite('bust', 'bustSprite', b ? b.canvas : null);
  if (bust) bust.position.set(Math.round(sc.head.x - b.ox), Math.round(sc.head.y - b.oy));
  syncHair(sc.hair); syncScalp(sc.hair, sc.head);
  layers.hair.alpha = sc.hairAlpha; layers.pieces.alpha = sc.hairAlpha; layers.scalp.alpha = sc.hairAlpha;
  app.renderer.render(app.stage);
}
/** Whether the WebGL layer has the room and the child to draw (else the 2D fallback draws them). */
export const glHasArt = (kid) => ready('salon_bg') && ready('kid_' + kid);
