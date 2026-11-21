// PROTOTYPE - NOT FOR PRODUCTION
/**
 * The cream sheet on the cold plate, painted on 2D canvases and shown as one texture on the plate:
 *  - puddle: the poured base and the fruit juice, before spreading (fades out as the spread layer covers),
 *  - spread: the mixed cream levelled into the target rectangle (with fruit flecks),
 *  - art: the player's syrup drawing and stencils,
 *  - frost: ice crystals revealed while freezing.
 * Coordinates are plate uv in 0..1 (u right, v toward the player). No THREE here.
 */
const N = 512;

/** The rectangle the cream is spread into, in uv. */
export const RECT = { u0: 0.12, v0: 0.13, u1: 0.88, v1: 0.87 };
const GRID = 20;

const mk = () => { const c = document.createElement('canvas'); c.width = c.height = N; return c; };
const shade = (hex, k) => { // k < 0 darker, > 0 lighter
  const p = parseInt(hex.slice(1), 16); const f = (v) => Math.max(0, Math.min(255, Math.round(k < 0 ? v * (1 + k) : v + (255 - v) * k)));
  return `rgb(${f(p >> 16 & 255)},${f(p >> 8 & 255)},${f(p & 255)})`;
};

/** Seeded random (the flecks are stable between reloads of the same cup). */
function rnd(seed) { let s = seed >>> 0 || 1; return () => (s = (s * 16807) % 2147483647) / 2147483647; }

/** A new sheet. `onDirty` is called when the texture must be re-uploaded. */
export function createSheet() {
  const out = mk(), puddle = mk(), spread = mk(), art = mk(), frost = mk(), artDone = mk();
  const gd = artDone.getContext('2d');
  let cur = []; // the syrup stroke in progress, in canvas pixels
  const g = out.getContext('2d'), gp = puddle.getContext('2d'), gs = spread.getContext('2d'), ga = art.getContext('2d'), gf = frost.getContext('2d');
  const S = { dirty: true, cover: 0, freeze: 0, cells: new Uint8Array(GRID * GRID), last: null, artUsed: false, poured: 0 };
  let R = rnd(7);

  // ice crystals, drawn once: feathery white branches with a soft frosted wash
  (function drawFrost() {
    const r = rnd(99);
    gf.fillStyle = 'rgba(255,255,255,0.22)'; gf.fillRect(0, 0, N, N);
    gf.lineCap = 'round';
    for (let i = 0; i < 40; i++) {
      const x = r() * N, y = r() * N, len = 8 + r() * 22, a0 = r() * Math.PI * 2;
      gf.strokeStyle = `rgba(255,255,255,${0.16 + r() * 0.24})`; gf.lineWidth = 1 + r() * 1.2;
      for (let k = 0; k < 6; k++) {
        const a = a0 + (k * Math.PI) / 3; gf.beginPath(); gf.moveTo(x, y); gf.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len); gf.stroke();
        for (const t of [0.45, 0.7]) { const bx = x + Math.cos(a) * len * t, by = y + Math.sin(a) * len * t; for (const s of [-0.6, 0.6]) { gf.beginPath(); gf.moveTo(bx, by); gf.lineTo(bx + Math.cos(a + s) * len * 0.28, by + Math.sin(a + s) * len * 0.28); gf.stroke(); } }
      }
    }
    for (let i = 0; i < 900; i++) { gf.fillStyle = `rgba(255,255,255,${0.2 + r() * 0.5})`; gf.fillRect(r() * N, r() * N, 1.5, 1.5); }
  })();

  const api = {
    canvas: out, RECT,
    get dirty() { return S.dirty; }, set dirty(v) { S.dirty = v; },
    get cover() { return S.cover; }, get freeze() { return S.freeze; }, get artUsed() { return S.artUsed; },

    /** Clear everything for a new cup. */
    reset(seed = 7) {
      for (const c of [gp, gs, ga, gd]) c.clearRect(0, 0, N, N); cur = [];
      S.cells.fill(0); S.cover = 0; S.freeze = 0; S.lastSpread = null; S.artUsed = false; S.poured = 0; R = rnd(seed); api.compose();
    },
    /** Pour: a soft round blob of base colour at (u, v); the blob grows with how much has been poured there. */
    pourAt(u, v, col, rad) {
      const x = u * N, y = v * N, r = rad * N;
      const gr = gp.createRadialGradient(x, y, r * 0.2, x, y, r);
      gr.addColorStop(0, col); gr.addColorStop(0.82, col); gr.addColorStop(1, 'rgba(255,255,255,0)');
      gp.fillStyle = gr; gp.beginPath(); gp.arc(x, y, r, 0, Math.PI * 2); gp.fill();
      S.dirty = true;
    },
    /** A juice splat when a fruit bursts: blotches of the fruit colour mixed into the puddle. */
    splat(u, v, col, rad) {
      const x = u * N, y = v * N;
      gp.globalAlpha = 0.55; gp.fillStyle = col;
      for (let i = 0; i < 9; i++) { const a = R() * Math.PI * 2, d = R() * rad * N, r = (0.25 + R() * 0.5) * rad * N; gp.beginPath(); gp.arc(x + Math.cos(a) * d, y + Math.sin(a) * d, r, 0, Math.PI * 2); gp.fill(); }
      gp.globalAlpha = 1; S.dirty = true;
    },
    /** Spread brush at (u, v): paints the mixed cream (and a few fruit flecks) inside the rectangle; returns coverage. */
    spreadAt(u, v, col, fleck, rad) {
      const x = u * N, y = v * N, r = rad * N;
      const L = S.lastSpread;
      const pts = L ? Math.max(1, Math.ceil(Math.hypot(x - L[0], y - L[1]) / (r * 0.35))) : 1;
      gs.save(); gs.beginPath(); gs.rect(RECT.u0 * N, RECT.v0 * N, (RECT.u1 - RECT.u0) * N, (RECT.v1 - RECT.v0) * N); gs.clip();
      for (let i = 1; i <= pts; i++) {
        const t = i / pts, px = L ? L[0] + (x - L[0]) * t : x, py = L ? L[1] + (y - L[1]) * t : y;
        gs.fillStyle = col; gs.beginPath(); gs.arc(px, py, r, 0, Math.PI * 2); gs.fill();
        if (fleck) { gs.fillStyle = fleck; for (let k = 0; k < 3; k++) { const a = R() * 6.28, d = R() * r * 0.9; gs.fillRect(px + Math.cos(a) * d, py + Math.sin(a) * d, 2 + R() * 4, 2 + R() * 3); } }
        // grid cells this dab covers
        const cu = (px / N - RECT.u0) / (RECT.u1 - RECT.u0), cv = (py / N - RECT.v0) / (RECT.v1 - RECT.v0), cr = r / N / (RECT.u1 - RECT.u0);
        for (let gy = Math.max(0, Math.floor((cv - cr) * GRID)); gy <= Math.min(GRID - 1, Math.floor((cv + cr) * GRID)); gy++) {
          for (let gx = Math.max(0, Math.floor((cu - cr) * GRID)); gx <= Math.min(GRID - 1, Math.floor((cu + cr) * GRID)); gx++) {
            const dx = (gx + 0.5) / GRID - cu, dy = (gy + 0.5) / GRID - cv; if (dx * dx + dy * dy <= cr * cr) S.cells[gy * GRID + gx] = 1;
          }
        }
      }
      gs.restore();
      S.lastSpread = [x, y];
      let n = 0; for (const c of S.cells) n += c; S.cover = n / S.cells.length;
      S.dirty = true; return S.cover;
    },
    /** The finger left the plate: the next brush dab starts fresh (no line across the gap). */
    lift() { S.lastSpread = null; if (cur.length) { gd.clearRect(0, 0, N, N); gd.drawImage(art, 0, 0); } cur = []; },
    /** Finish spreading: the whole rectangle becomes neat even cream (flecks kept) and the puddle is gone. */
    finishSpread(col, fleck) {
      const x = RECT.u0 * N, y = RECT.v0 * N, w = (RECT.u1 - RECT.u0) * N, h = (RECT.v1 - RECT.v0) * N;
      gs.save(); gs.globalCompositeOperation = 'destination-over'; gs.fillStyle = col; gs.fillRect(x, y, w, h); gs.restore();
      if (fleck) { gs.fillStyle = fleck; for (let i = 0; i < 160; i++) gs.fillRect(x + 6 + R() * (w - 12), y + 6 + R() * (h - 12), 2 + R() * 4, 2 + R() * 3); }
      S.cells.fill(1); S.cover = 1; S.dirty = true;
    },
    /** Syrup drawing: extend the stroke in progress to (u, v), kept inside the rectangle, and repaint it whole. */
    strokeTo(u, v, col, width = 0.026) {
      const x = Math.max(RECT.u0 + 0.02, Math.min(RECT.u1 - 0.02, u)) * N, y = Math.max(RECT.v0 + 0.02, Math.min(RECT.v1 - 0.02, v)) * N;
      const q = cur[cur.length - 1]; if (q && Math.hypot(q[0] - x, q[1] - y) < 2) return;
      cur.push([x, y]); ga.clearRect(0, 0, N, N); ga.drawImage(artDone, 0, 0); syrupPath(ga, [cur], col, width * N);
      S.artUsed = true; S.dirty = true;
    },
    /** A ready-made shape ('heart' | 'star' | 'smile') drawn up to fraction t (0..1) of its path. */
    stencil(id, col, t) {
      const pts = stencilPath(id), n = Math.max(2, Math.floor(pts.length * Math.min(1, t))), paths = [[]];
      for (let i = 0; i < n; i++) { const [pu, pv, lift] = pts[i]; if (lift && paths[paths.length - 1].length) paths.push([]); paths[paths.length - 1].push([(0.5 + pu * 0.3) * N, (0.5 + pv * 0.3) * N]); }
      ga.clearRect(0, 0, N, N); ga.drawImage(artDone, 0, 0); syrupPath(ga, paths, col, 0.03 * N);
      if (t >= 1) { gd.clearRect(0, 0, N, N); gd.drawImage(art, 0, 0); }
      S.artUsed = true; S.dirty = true;
    },
    /** Clear the drawing only. */
    clearArt() { ga.clearRect(0, 0, N, N); gd.clearRect(0, 0, N, N); cur = []; S.artUsed = false; S.dirty = true; },
    /** Freezing progress 0..1: the frost grows in from the edges of the rectangle. */
    setFreeze(k) { S.freeze = Math.max(0, Math.min(1, k)); S.dirty = true; },
    /** Paint the final texture from the layers. Call once per frame when dirty. */
    compose() {
      g.clearRect(0, 0, N, N);
      const fade = Math.max(0, 1 - S.cover * 1.15);
      if (fade > 0) { g.globalAlpha = fade; g.drawImage(puddle, 0, 0); g.globalAlpha = 1; }
      g.drawImage(spread, 0, 0);
      g.drawImage(art, 0, 0);
      if (S.freeze > 0) {
        const cx = 0.5 * N, cy = 0.5 * N, R0 = 0.62 * N * (1 - S.freeze), R1 = R0 + 0.25 * N;
        g.save();
        g.beginPath(); g.rect(RECT.u0 * N, RECT.v0 * N, (RECT.u1 - RECT.u0) * N, (RECT.v1 - RECT.v0) * N); g.clip();
        // frost creeps from the cold edges toward the middle
        const m = g.createRadialGradient(cx, cy, Math.max(0, R0), cx, cy, R1);
        m.addColorStop(0, 'rgba(0,0,0,0)'); m.addColorStop(1, 'rgba(0,0,0,1)');
        g.globalCompositeOperation = 'source-atop';
        g.globalAlpha = 0.32 * S.freeze; g.fillStyle = '#ffffff'; g.fillRect(0, 0, N, N); // the cream goes matte and paler
        g.globalAlpha = 1;
        const tmp = api._tmp || (api._tmp = mk()); const gt = tmp.getContext('2d');
        gt.clearRect(0, 0, N, N); gt.drawImage(frost, 0, 0); gt.globalCompositeOperation = 'destination-in'; gt.fillStyle = m; gt.fillRect(0, 0, N, N); gt.globalCompositeOperation = 'source-over';
        if (S.freeze >= 1) { gt.clearRect(0, 0, N, N); gt.drawImage(frost, 0, 0); }
        g.drawImage(tmp, 0, 0);
        g.restore();
      }
      S.dirty = true;
    },
    /** Paint a ready-made frozen sheet (the first-ever cup starts at the rolling step). */
    preset(col, fleck, artCol, stencilId) {
      api.reset(3);
      api.finishSpread(col, fleck);
      if (stencilId) api.stencil(stencilId, artCol, 1);
      S.freeze = 1; api.compose();
    },
  };
  api.compose();
  return api;
}

/** Paint polylines as glossy syrup: a darker rim, the colour, then a thin shine, each pass over whole lines. */
function syrupPath(g, paths, col, w) {
  g.lineCap = 'round'; g.lineJoin = 'round';
  const pass = (style, lw, dx, dy, each) => {
    for (const p of paths) {
      if (!p.length) continue;
      if (each) { for (let i = 1; i < p.length; i++) { g.strokeStyle = each(i); g.lineWidth = lw; g.beginPath(); g.moveTo(p[i - 1][0], p[i - 1][1]); g.lineTo(p[i][0], p[i][1]); g.stroke(); } continue; }
      g.strokeStyle = style; g.lineWidth = lw; g.beginPath(); g.moveTo(p[0][0] + dx, p[0][1] + dy);
      for (let i = 1; i < p.length; i++) g.lineTo(p[i][0] + dx, p[i][1] + dy);
      if (p.length === 1) g.lineTo(p[0][0] + dx + 0.01, p[0][1] + dy);
      g.stroke();
    }
  };
  if (col === 'rainbow') { pass('#5b2a4a', w + 4, 0, 1.5); pass(null, w, 0, 0, (i) => `hsl(${(i * 9) % 360},95%,62%)`); }
  else { pass(shade(col, col === '#fffaf0' ? -0.18 : -0.35), w + 4, 0, 1.5); pass(col, w, 0, 0); }
  pass('rgba(255,255,255,0.5)', w * 0.26, -w * 0.16, -w * 0.16);
}

/** Points of a stencil in -1..1 (y down); a third value true lifts the pen before that point. */
export function stencilPath(id) {
  const pts = [];
  if (id === 'heart') {
    for (let i = 0; i <= 60; i++) { const t = (i / 60) * Math.PI * 2; const x = 16 * Math.pow(Math.sin(t), 3), y = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)); pts.push([x / 17, y / 17 + 0.05]); }
  } else if (id === 'star') {
    for (let i = 0; i <= 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, r = i % 2 ? 0.42 : 1; const p = [Math.cos(a) * r, Math.sin(a) * r + 0.06]; if (i) { const q = pts[pts.length - 1]; for (let k = 1; k <= 5; k++) pts.push([q[0] + (p[0] - q[0]) * k / 5, q[1] + (p[1] - q[1]) * k / 5]); } else pts.push(p); }
  } else { // smile
    for (let i = 0; i <= 48; i++) { const t = (i / 48) * Math.PI * 2; pts.push([Math.cos(t) * 0.95, Math.sin(t) * 0.95]); }
    for (const ex of [-0.35, 0.35]) for (let i = 0; i <= 10; i++) { const t = (i / 10) * Math.PI * 2; pts.push([ex + Math.cos(t) * 0.1, -0.3 + Math.sin(t) * 0.1, i === 0]); }
    for (let i = 0; i <= 16; i++) { const t = Math.PI * (0.15 + 0.7 * i / 16); pts.push([Math.cos(t) * 0.55, 0.05 + Math.sin(t) * 0.45, i === 0]); }
  }
  return pts;
}
