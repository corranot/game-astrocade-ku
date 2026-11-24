// PROTOTYPE - NOT FOR PRODUCTION
// Voxel Wonderland: Sky Realms — 3D voxel sandbox adventure for kids 6–12. Explore four floating sky islands, mine
// blocks with a pickaxe that evolves (wood → crystal → golden star → cosmic rainbow), build bridges between islands,
// fill glowing Wonder Blueprint pads that self-assemble a treehouse, fountain, rainbow bridge and dragon castle, and
// hatch golden eggs into voxel pets that follow you and mine ores. No fail state. Every texture, mesh and sound is
// made in code. Three.js arrives as global THREE.
// Sections: helpers · blocks · TextureFactory · VoxelWorld · SoundEngine · VFXSystem · PetManager ·
// BlueprintSystem · PlayerController (body, input, viewmodel) · Sky · GameApp (HUD, save, quality) · run().

const LANGS = ['en', 'ar', 'es', 'vi', 'hi', 'bn', 'id'];
const TAU = Math.PI * 2;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const damp = (k, dt) => 1 - Math.exp(-k * dt);
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

/** Seeded random generator (mulberry32): same seed, same world. */
function mulberry(seed) {
  let s = seed >>> 0;
  return () => { s = (s + 0x6D2B79F5) >>> 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
/** Smooth 2D value noise in 0..1 built from an integer hash. */
function makeNoise(seed) {
  const h = (x, y) => { let n = (x * 374761393 + y * 668265263 + seed * 982451653) | 0; n = Math.imul(n ^ (n >>> 13), 1274126177); return ((n ^ (n >>> 16)) >>> 0) / 4294967296; };
  const n2 = (x, y) => {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    return lerp(lerp(h(xi, yi), h(xi + 1, yi), u), lerp(h(xi, yi + 1), h(xi + 1, yi + 1), u), v);
  };
  return (x, y, oct = 3) => { let a = 0, f = 1, amp = 1, sum = 0; for (let i = 0; i < oct; i++) { a += n2(x * f, y * f) * amp; sum += amp; amp *= 0.5; f *= 2; } return a / sum; };
}

/** First supported language in the device list, else English. */
function detectLang(list) {
  for (const l of list || []) { const b = String(l || '').toLowerCase().split('-')[0]; if (LANGS.includes(b)) return b; }
  return 'en';
}
const buzz = (kind) => { try { lib.haptics.play(kind); } catch (e) { /* no vibration here */ } };

// ---------------------------------------------------------------- blocks
/** Block ids. 0 is air. */
const B = { AIR: 0, GRASS: 1, SOIL: 2, COBBLE: 3, LOG: 4, PLANK: 5, CHERRY: 6, CRYORE: 7, GOLDORE: 8, CANDY: 9, MAGMA: 10, WATER: 11, GLASS: 12, RAINBOW: 13, CLOUD: 14, BASALT: 15, LEAF: 16, CRYSTAL: 17, LANTERN: 18, PAD: 19 };
const TILES = ['grass_top', 'grass_side', 'soil', 'cobble', 'log_side', 'log_top', 'plank', 'cherry', 'cryore', 'goldore', 'candy', 'magma', 'water', 'glass', 'rainbow', 'cloud', 'basalt', 'leaf', 'crystal', 'lantern', 'pad'];
const T = Object.fromEntries(TILES.map((n, i) => [n, i]));
/** Per block: tiles [top, side, bottom], render kind (solid / cut = alpha cutout / water), sound family. */
const BLOCKS = [];
const defBlock = (id, tiles, kind, snd) => { BLOCKS[id] = { id, tiles: tiles.map((n) => T[n]), kind, snd }; };
defBlock(B.GRASS, ['grass_top', 'grass_side', 'soil'], 'solid', 'soft');
defBlock(B.SOIL, ['soil', 'soil', 'soil'], 'solid', 'soft');
defBlock(B.COBBLE, ['cobble', 'cobble', 'cobble'], 'solid', 'stone');
defBlock(B.LOG, ['log_top', 'log_side', 'log_top'], 'solid', 'wood');
defBlock(B.PLANK, ['plank', 'plank', 'plank'], 'solid', 'wood');
defBlock(B.CHERRY, ['cherry', 'cherry', 'cherry'], 'cut', 'soft');
defBlock(B.CRYORE, ['cryore', 'cryore', 'cryore'], 'solid', 'crystal');
defBlock(B.GOLDORE, ['goldore', 'goldore', 'goldore'], 'solid', 'crystal');
defBlock(B.CANDY, ['candy', 'candy', 'candy'], 'solid', 'stone');
defBlock(B.MAGMA, ['magma', 'magma', 'magma'], 'solid', 'stone');
defBlock(B.WATER, ['water', 'water', 'water'], 'water', 'soft');
defBlock(B.GLASS, ['glass', 'glass', 'glass'], 'cut', 'crystal');
defBlock(B.RAINBOW, ['rainbow', 'rainbow', 'rainbow'], 'solid', 'crystal');
defBlock(B.CLOUD, ['cloud', 'cloud', 'cloud'], 'solid', 'soft');
defBlock(B.BASALT, ['basalt', 'basalt', 'basalt'], 'solid', 'stone');
defBlock(B.LEAF, ['leaf', 'leaf', 'leaf'], 'cut', 'soft');
defBlock(B.CRYSTAL, ['crystal', 'crystal', 'crystal'], 'solid', 'crystal');
defBlock(B.LANTERN, ['lantern', 'lantern', 'lantern'], 'solid', 'wood');
defBlock(B.PAD, ['pad', 'cobble', 'cobble'], 'solid', 'stone');
const isOre = (t) => t === B.CRYORE || t === B.GOLDORE;
const solidT = (t) => t !== B.AIR && t !== B.WATER;
const opaqueT = (t) => t !== B.AIR && BLOCKS[t].kind === 'solid';

// ---------------------------------------------------------------- TextureFactory
/** Paints every 16×16 pixel-art tile into one atlas (plus a glow atlas for emissive pixels, crack frames,
 *  a tiling water texture, and isometric hotbar icons). Pure Canvas2D; no image files. */
class TextureFactory {
  constructor(seed) {
    this.S = 16; this.COLS = 8; this.ROWS = Math.ceil(TILES.length / 8);
    const W = this.S * this.COLS, H = this.S * this.ROWS;
    this.canvas = document.createElement('canvas'); this.canvas.width = W; this.canvas.height = H;
    this.glowCanvas = document.createElement('canvas'); this.glowCanvas.width = W; this.glowCanvas.height = H;
    const ctx = this.canvas.getContext('2d'), gctx = this.glowCanvas.getContext('2d');
    const img = ctx.createImageData(W, H), gimg = gctx.createImageData(W, H);
    for (let i = 3; i < gimg.data.length; i += 4) gimg.data[i] = 255;
    this.avg = [];
    TILES.forEach((name, ti) => {
      const ox = (ti % this.COLS) * 16, oy = Math.floor(ti / this.COLS) * 16, r = mulberry(seed + ti * 7919);
      const g = {
        r, pick: (a) => a[Math.floor(r() * a.length)],
        set(x, y, c, a = 255) { x &= 15; y &= 15; const i = ((oy + y) * W + ox + x) * 4; img.data[i] = (c >> 16) & 255; img.data[i + 1] = (c >> 8) & 255; img.data[i + 2] = c & 255; img.data[i + 3] = a; },
        glow(x, y, c, k = 1) { x &= 15; y &= 15; const i = ((oy + y) * W + ox + x) * 4; gimg.data[i] = ((c >> 16) & 255) * k; gimg.data[i + 1] = ((c >> 8) & 255) * k; gimg.data[i + 2] = (c & 255) * k; },
        get(x, y) { x &= 15; y &= 15; const i = ((oy + y) * W + ox + x) * 4; return (img.data[i] << 16) | (img.data[i + 1] << 8) | img.data[i + 2]; },
      };
      PAINT[name](g);
      let rs = 0, gs = 0, bs = 0, n = 0;
      for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const i = ((oy + y) * W + ox + x) * 4; if (img.data[i + 3] > 100) { rs += img.data[i]; gs += img.data[i + 1]; bs += img.data[i + 2]; n++; } }
      this.avg[ti] = [rs / n / 255, gs / n / 255, bs / n / 255];
    });
    ctx.putImageData(img, 0, 0); gctx.putImageData(gimg, 0, 0);
    this.makeCracks(seed); this.makeWater(seed);
    this.icons = {};
  }
  /** UV rectangle of a tile, inset a hair so neighbours never bleed. */
  uv(ti) {
    const e = 0.02 / this.COLS, c = ti % this.COLS, r = Math.floor(ti / this.COLS);
    return [c / this.COLS + e, 1 - (r + 1) / this.ROWS + e * 2, (c + 1) / this.COLS - e, 1 - r / this.ROWS - e * 2];
  }
  /** Average colour of a block (side tile) for particles. */
  color(t) { return this.avg[BLOCKS[t].tiles[1]]; }
  makeCracks(seed) {
    const c = document.createElement('canvas'); c.width = 16 * 6; c.height = 16;
    const x = c.getContext('2d'), r = mulberry(seed + 5);
    const segs = [];
    for (let k = 0; k < 7; k++) { let px = 8, py = 8; const a0 = r() * TAU; for (let s = 0; s < 5; s++) { const a = a0 + (r() - 0.5) * 1.4, nx = px + Math.cos(a) * 2, ny = py + Math.sin(a) * 2; segs.push([px, py, nx, ny, s]); px = nx; py = ny; } }
    for (let f = 0; f < 6; f++) {
      const lim = (f + 1) * 0.8;
      for (const [ax, ay, bx, by, s] of segs) {
        if (s > lim) continue;
        const n = 4; for (let i = 0; i <= n; i++) {
          const px = Math.round(lerp(ax, bx, i / n)), py = Math.round(lerp(ay, by, i / n));
          if (px < 0 || py < 0 || px > 15 || py > 15) continue;
          x.fillStyle = 'rgba(30,18,40,0.6)'; x.fillRect(f * 16 + px, py, 1, 1);
          x.fillStyle = 'rgba(255,255,255,0.35)'; if (px < 15) x.fillRect(f * 16 + px + 1, py, 1, 1);
        }
      }
    }
    this.crackCanvas = c;
  }
  makeWater(seed) {
    const c = document.createElement('canvas'); c.width = 32; c.height = 32;
    const x = c.getContext('2d'), r = mulberry(seed + 11);
    for (let y = 0; y < 32; y++) for (let i = 0; i < 32; i++) {
      const w = Math.sin((i + y * 0.5) * 0.4) + Math.sin((i * 0.7 - y) * 0.33);
      const col = w > 1.3 ? '#8fcbef' : w > 0.7 ? '#6bbbe8' : r() < 0.5 ? '#3ea9f5' : '#3399ea';
      x.fillStyle = col; x.fillRect(i, y, 1, 1);
    }
    this.waterCanvas = c;
  }
  /** 64×64 isometric picture of a block, cached; used by the hotbar and floating cost cards. */
  icon(t) {
    if (this.icons[t]) return this.icons[t];
    const c = document.createElement('canvas'); c.width = 64; c.height = 64;
    const x = c.getContext('2d'); x.imageSmoothingEnabled = false;
    const [top, side] = BLOCKS[t].tiles;
    const src = (ti) => [(ti % this.COLS) * 16, Math.floor(ti / this.COLS) * 16];
    const face = (ti, m, shade) => {
      x.setTransform(...m); const [sx, sy] = src(ti);
      x.drawImage(this.canvas, sx, sy, 16, 16, 0, 0, 16, 16);
      if (shade) { x.globalCompositeOperation = 'source-atop'; x.fillStyle = `rgba(20,10,40,${shade})`; x.fillRect(0, 0, 16, 16); x.globalCompositeOperation = 'source-over'; }
    };
    const k = 28 / 16;
    face(side, [k, 14 / 16, 0, k, 4, 18], 0.16);
    face(side, [k, -14 / 16, 0, k, 32, 32], 0.32);
    face(top, [k, 14 / 16, -k, 14 / 16, 32, 4], 0);
    x.setTransform(1, 0, 0, 1, 0, 0);
    this.icons[t] = c;
    return c;
  }
}

/** Shade a 0xRRGGBB colour by factor f. */
function sh(c, f) { const r = clamp(((c >> 16) & 255) * f, 0, 255), g = clamp(((c >> 8) & 255) * f, 0, 255), b = clamp((c & 255) * f, 0, 255); return (r << 16) | (g << 8) | b; }
/** Cobblestone made of wrapped Voronoi stones with dark mortar and lit top-left edges. */
function stones(g, n, cols, mortar) {
  const pts = []; for (let i = 0; i < n; i++) pts.push([g.r() * 16, g.r() * 16, g.pick(cols)]);
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    let d1 = 99, d2 = 99, best = null;
    for (const p of pts) { let dx = Math.abs(x + 0.5 - p[0]), dy = Math.abs(y + 0.5 - p[1]); dx = Math.min(dx, 16 - dx); dy = Math.min(dy, 16 - dy); const d = Math.hypot(dx, dy); if (d < d1) { d2 = d1; d1 = d; best = p; } else if (d < d2) d2 = d; }
    if (d2 - d1 < 1.1) g.set(x, y, mortar);
    else { let c = best[2]; const up = y + 0.5 < best[1] ? 1.1 : 0.92; c = sh(c, up * (0.95 + g.r() * 0.1)); g.set(x, y, c); }
  }
}
const PAINT = {
  grass_top(g) {
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) g.set(x, y, sh(g.pick([0x6fd14f, 0x63c447, 0x7fdc5a, 0x5ab83f, 0x74d652]), 0.95 + g.r() * 0.1));
    for (let i = 0; i < 5; i++) { const x = Math.floor(g.r() * 16), y = Math.floor(g.r() * 16), c = g.pick([0xff8fc8, 0xffe066, 0xffffff, 0xb48cff]); g.set(x, y, c); g.set(x + 1, y, c); g.set(x, y + 1, c); g.set(x + 1, y + 1, sh(c, 0.85)); }
  },
  soil(g) {
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) g.set(x, y, g.pick([0x9a6a43, 0x8e603b, 0xa8774c, 0x87593a]));
    for (let i = 0; i < 7; i++) { const x = Math.floor(g.r() * 16), y = Math.floor(g.r() * 16); g.set(x, y, g.pick([0xc29d78, 0x6b452a])); }
  },
  grass_side(g) {
    PAINT.soil(g);
    for (let x = 0; x < 16; x++) {
      const d = 3 + (g.r() < 0.45 ? 1 : 0) + (g.r() < 0.18 ? 1 : 0);
      for (let y = 0; y < d; y++) g.set(x, y, y === d - 1 ? 0x4fa83a : y === 0 ? 0x86e062 : g.pick([0x6fd14f, 0x63c447]));
    }
    g.set(5, 0, 0xffe066); g.set(12, 1, 0xff8fc8);
  },
  cobble(g) { stones(g, 8, [0xa7a8b2, 0x9b9ca8, 0xb3b4bd, 0x9196a4], 0x62636e); },
  log_side(g) {
    for (let x = 0; x < 16; x++) { const base = g.pick([0x8a5a32, 0x7d5130, 0x9b6a3d, 0xa47243]); for (let y = 0; y < 16; y++) g.set(x, y, sh(base, 0.92 + g.r() * 0.16)); }
    for (let i = 0; i < 10; i++) { const x = Math.floor(g.r() * 16), y = Math.floor(g.r() * 14); g.set(x, y, 0x5e3a1e); g.set(x, y + 1, 0x5e3a1e); }
    for (let y = 0; y < 16; y++) g.set(2, y, sh(g.get(2, y), 1.2));
  },
  log_top(g) {
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const d = Math.hypot(x - 7.5, y - 7.5);
      g.set(x, y, d > 6.6 ? 0x7d5130 : Math.floor(d * 0.9) % 2 ? 0xd9ab6c : 0xc4925a);
    }
  },
  plank(g) {
    for (let b = 0; b < 4; b++) {
      const base = g.pick([0xe6b673, 0xd9a865, 0xeec184, 0xdcae6c]), j = Math.floor(g.r() * 16);
      for (let y = b * 4; y < b * 4 + 4; y++) for (let x = 0; x < 16; x++) {
        let c = sh(base, 0.95 + g.r() * 0.08);
        if (y === b * 4 + 3) c = 0xa77738; else if (x === j) c = 0xb6843f; else if (g.r() < 0.06) c = sh(base, 0.85);
        g.set(x, y, c);
      }
      g.set((j + 2) & 15, b * 4 + 1, 0x8c6a4a);
    }
  },
  cherry(g) {
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      if (g.r() < 0.13) { g.set(x, y, 0xff9ec4, 0); continue; }
      const n = Math.sin(x * 0.9) + Math.cos(y * 1.1);
      g.set(x, y, n > 0.8 ? 0xffc6de : n < -0.8 ? 0xe9789f : g.pick([0xffb3d1, 0xff9ec4, 0xf990b8]));
    }
    for (let i = 0; i < 6; i++) g.set(Math.floor(g.r() * 16), Math.floor(g.r() * 16), 0xfff3f8);
  },
  leaf(g) {
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      if (g.r() < 0.12) { g.set(x, y, 0x4fb347, 0); continue; }
      const n = Math.sin(x * 1.1 + 1) + Math.cos(y * 0.9);
      g.set(x, y, n > 0.8 ? 0x7fdb6a : n < -0.8 ? 0x3a8f39 : g.pick([0x4fb347, 0x5ec254, 0x56b84a]));
    }
  },
  cryore(g) {
    PAINT.cobble(g);
    const gem = (cx, cy, s) => {
      for (let dy = -s; dy <= s; dy++) for (let dx = -s; dx <= s; dx++) {
        if (Math.abs(dx) + Math.abs(dy) > s) continue;
        const c = dx + dy < -s / 2 ? 0xbff3ff : dx + dy > s / 2 ? 0x1aa8c8 : 0x5ff3ff;
        g.set(cx + dx, cy + dy, c); g.glow(cx + dx, cy + dy, c, 0.6);
      }
    };
    gem(4, 4, 2); gem(11, 6, 2); gem(6, 11, 2); gem(12, 12, 1);
  },
  goldore(g) {
    PAINT.cobble(g);
    const star = (cx, cy) => {
      for (const [dx, dy, c] of [[0, 0, 0xfff3a0], [1, 0, 0xffd23f], [-1, 0, 0xffd23f], [0, 1, 0xffd23f], [0, -1, 0xffd23f], [2, 0, 0xc98a00], [-2, 0, 0xc98a00], [0, 2, 0xc98a00], [0, -2, 0xc98a00], [1, 1, 0xe0a400], [-1, -1, 0xffe27a]]) { g.set(cx + dx, cy + dy, c); g.glow(cx + dx, cy + dy, c, 0.85); }
    };
    star(4, 5); star(11, 4); star(8, 11); star(13, 12);
  },
  candy(g) {
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const row = y >> 2, off = row % 2 ? 4 : 0, mortar = y % 4 === 3 || (x + off) % 8 === 7;
      g.set(x, y, mortar ? 0xd99ab8 : sh(row % 2 ? 0xe0679f : 0xe877ab, 0.95 + g.r() * 0.08));
    }
    for (let i = 0; i < 7; i++) { const x = Math.floor(g.r() * 16), y = Math.floor(g.r() * 16); if (y % 4 !== 3) g.set(x, y, g.pick([0x66c9ef, 0xf2d85a, 0xb9e8a0, 0x9b7bff])); }
  },
  magma(g) {
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) g.set(x, y, g.pick([0x2a1838, 0x23142f, 0x351f45, 0x2d1a3d]));
    for (let k = 0; k < 4; k++) {
      let x = g.r() * 16, y = g.r() * 16, a = g.r() * TAU;
      for (let s = 0; s < 12; s++) {
        const c = s % 3 === 0 ? 0xffd23f : 0xff7a1f;
        g.set(Math.floor(x), Math.floor(y), c); g.glow(Math.floor(x), Math.floor(y), c, 1);
        a += (g.r() - 0.5) * 1.2; x += Math.cos(a); y += Math.sin(a);
      }
    }
  },
  water(g) { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) g.set(x, y, Math.sin(x * 0.8 + y * 0.4) > 0.9 ? 0x8fcbef : g.pick([0x3ea9f5, 0x46b0ff, 0x3399ea])); },
  glass(g) {
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const edge = x === 0 || y === 0 || x === 15 || y === 15, inner = x === 1 || y === 1 || x === 14 || y === 14;
      if (edge) g.set(x, y, 0xcfe8f5); else if (inner) g.set(x, y, 0x9fd2ea); else g.set(x, y, 0xffffff, 0);
    }
    for (const [x, y] of [[3, 5], [4, 4], [5, 3], [3, 8], [4, 7], [5, 6], [6, 5], [7, 4], [8, 3]]) g.set(x, y, 0xd6f0fb, 200);
  },
  rainbow(g) {
    const hues = [0xff5d7a, 0xffa94d, 0xffe066, 0x7ee07e, 0x5fc9ff, 0x9b7bff];
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const c = hues[Math.floor((x + y) / 3) % 6]; g.set(x, y, sh(c, 0.95 + g.r() * 0.1)); g.glow(x, y, c, 0.28); }
    for (let i = 0; i < 6; i++) { const x = Math.floor(g.r() * 16), y = Math.floor(g.r() * 16); g.set(x, y, 0xfff3c0); g.glow(x, y, 0xfff3c0, 0.5); }
  },
  cloud(g) {
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const n = Math.sin(x * 0.7) * Math.cos(y * 0.6) + (x + y) / 30;
      g.set(x, y, n > 0.9 ? 0x9eabd6 : n > 0.5 ? 0xacb8e0 : g.pick([0xb9c3e8, 0xb3bee6, 0xbec8ea]));
    }
  },
  basalt(g) {
    for (let x = 0; x < 16; x++) {
      const col = Math.floor(x / 4), base = [0x4a4651, 0x55505e, 0x403c47, 0x4e4958][col];
      for (let y = 0; y < 16; y++) g.set(x, y, x % 4 === 3 ? 0x2e2b34 : (y + col * 5) % 9 === 0 ? 0x34303b : sh(base, 0.93 + g.r() * 0.14));
    }
  },
  crystal(g) {
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const f = (x + y) % 8 < 4 ? 0 : 1, d = (x - y + 16) % 6 < 2;
      const c = d ? 0xb4eef8 : f ? 0x46dff5 : 0x7ff6ff;
      g.set(x, y, c); g.glow(x, y, c, 0.45);
    }
    for (let i = 0; i < 4; i++) { const x = Math.floor(g.r() * 16), y = Math.floor(g.r() * 16); g.set(x, y, 0xcff6fc); g.glow(x, y, 0xcff6fc, 0.5); }
  },
  lantern(g) {
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const frame = x < 2 || y < 2 || x > 13 || y > 13 || x === 7 || x === 8 || y === 7 || y === 8;
      if (frame) g.set(x, y, x < 1 || y < 1 || x > 14 || y > 14 ? 0x3a2818 : 0x5a3e25);
      else { const c = Math.hypot(x - 7.5, y - 7.5) < 4 ? 0xfff1a8 : 0xffc24a; g.set(x, y, c); g.glow(x, y, c, 1); }
    }
  },
  pad(g) {
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const edge = x === 0 || y === 0 || x === 15 || y === 15, line = x % 5 === 2 || y % 5 === 2;
      const c = edge ? 0xc9bfff : line ? 0x7fd6ee : 0x4a3c8c;
      g.set(x, y, c); if (edge || line) g.glow(x, y, c, 0.45);
    }
  },
};

// ---------------------------------------------------------------- VoxelWorld
// Face table: normal and the 4 corners (bottom-left, bottom-right, top-right, top-left seen from outside, CCW).
const FACES = [
  { n: [1, 0, 0], c: [[1, 0, 1], [1, 0, 0], [1, 1, 0], [1, 1, 1]], tile: 1, shade: 0.9 },
  { n: [-1, 0, 0], c: [[0, 0, 0], [0, 0, 1], [0, 1, 1], [0, 1, 0]], tile: 1, shade: 0.9 },
  { n: [0, 1, 0], c: [[0, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0]], tile: 0, shade: 1 },
  { n: [0, -1, 0], c: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]], tile: 2, shade: 0.7 },
  { n: [0, 0, 1], c: [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]], tile: 1, shade: 0.84 },
  { n: [0, 0, -1], c: [[1, 0, 0], [0, 0, 0], [0, 1, 0], [1, 1, 0]], tile: 1, shade: 0.84 },
];
const AO_LEVEL = [0.52, 0.7, 0.86, 1];
const CH = 16;

/** The block grid: generation of the four islands, edits (saved as a diff against the generated world),
 *  chunked face-culled meshing with per-vertex ambient occlusion, DDA raycast and box collision. */
class VoxelWorld {
  constructor(cfg) {
    this.cfg = cfg;
    const w = cfg.world;
    this.W = w.w; this.H = w.h; this.D = w.d;
    this.cells = new Uint8Array(this.W * this.H * this.D);
    this.CX = this.W / CH; this.CY = this.H / CH; this.CZ = this.D / CH;
    this.dirty = new Set();
    this.edits = new Map();
    this.hidden = new Set();
    this.ores = new Set();
    this.listeners = [];
    this.pads = {};
  }
  idx(x, y, z) { return x + this.W * (z + this.D * y); }
  inside(x, y, z) { return x >= 0 && y >= 0 && z >= 0 && x < this.W && y < this.H && z < this.D; }
  get(x, y, z) { return x >= 0 && y >= 0 && z >= 0 && x < this.W && y < this.H && z < this.D ? this.cells[x + this.W * (z + this.D * y)] : 0; }
  xyz(i) { const x = i % this.W, r = (i - x) / this.W, z = r % this.D; return [x, (r - z) / this.D, z]; }
  /** Raw write used by generation: no edit record, no remesh. */
  put(x, y, z, t) { if (this.inside(x, y, z)) this.cells[this.idx(x, y, z)] = t; }
  /** Gameplay write: records the edit, marks the chunk (and touching neighbours) for remeshing. */
  set(x, y, z, t) {
    if (!this.inside(x, y, z)) return false;
    const i = this.idx(x, y, z), old = this.cells[i];
    if (old === t) return false;
    this.cells[i] = t;
    if (this.base) { if (this.base[i] === t) this.edits.delete(i); else this.edits.set(i, t); }
    if (isOre(t)) this.ores.add(i); else this.ores.delete(i);
    this.markAround(x, y, z);
    for (const fn of this.listeners) fn(i, x, y, z, t, old);
    return true;
  }
  markAround(x, y, z) {
    const cx = Math.floor(x / CH), cy = Math.floor(y / CH), cz = Math.floor(z / CH);
    this.mark(cx, cy, cz);
    const lx = x % CH, ly = y % CH, lz = z % CH;
    if (lx === 0) this.mark(cx - 1, cy, cz); if (lx === CH - 1) this.mark(cx + 1, cy, cz);
    if (ly === 0) this.mark(cx, cy - 1, cz); if (ly === CH - 1) this.mark(cx, cy + 1, cz);
    if (lz === 0) this.mark(cx, cy, cz - 1); if (lz === CH - 1) this.mark(cx, cy, cz + 1);
  }
  mark(cx, cy, cz) { if (cx >= 0 && cy >= 0 && cz >= 0 && cx < this.CX && cy < this.CY && cz < this.CZ) this.dirty.add(cx + this.CX * (cz + this.CZ * cy)); }
  solid(x, y, z) { return solidT(this.get(x, y, z)); }
  /** Highest solid block at or below y in a column, or -1. */
  groundY(x, z, from = this.H - 1) { for (let y = Math.min(from, this.H - 1); y >= 0; y--) if (this.solid(x, y, z)) return y; return -1; }

  // ---------------- generation
  generate() {
    const seed = this.cfg.world.seed, rnd = mulberry(seed), noise = makeNoise(seed);
    this.rnd = rnd;
    this.flowerSpots = [];
    for (const isl of this.cfg.islands) this.island(isl, noise, rnd);
    const I = Object.fromEntries(this.cfg.islands.map((i) => [i.id, i]));
    this.decorate(I, rnd);
    // stepping clouds from the meadow north to the candy island
    for (const [x, y, z] of [[64, 31, 52], [65, 32, 48], [66, 33, 44]]) for (let dx = 0; dx < 2; dx++) for (let dz = 0; dz < 2; dz++) this.put(x + dx, y, z + dz, B.CLOUD);
    this.base = this.cells.slice();
    for (let i = 0; i < this.cells.length; i++) if (isOre(this.cells[i])) this.ores.add(i);
  }
  island(isl, noise, rnd) {
    const { x: cx, y: cy, z: cz, r } = isl, ph = rnd() * TAU, ph2 = rnd() * TAU;
    const pal = {
      meadow: [B.GRASS, B.SOIL, B.COBBLE], crystal: [B.GRASS, B.SOIL, B.COBBLE],
      candy: [B.CANDY, B.CANDY, B.COBBLE], volcano: [B.BASALT, B.BASALT, B.BASALT],
    }[isl.id];
    const tops = new Map();
    for (let x = cx - r - 4; x <= cx + r + 4; x++) for (let z = cz - r - 4; z <= cz + r + 4; z++) {
      const dx = x - cx, dz = z - cz, a = Math.atan2(dz, dx);
      const rr = r * (1 + 0.1 * Math.sin(3 * a + ph) + 0.06 * Math.sin(5 * a + ph2));
      const d = Math.hypot(dx, dz) / rr;
      if (d >= 1) continue;
      const hill = (noise(x * 0.09, z * 0.09) - 0.5) * 2 * isl.amp * (1 - d * d);
      const top = cy + Math.round(hill + (1 - d) * 1.2);
      const bottom = cy - Math.round(Math.pow(1 - d, 0.6) * r * 0.85 + noise(x * 0.2 + 50, z * 0.2) * 3);
      for (let y = bottom; y <= top; y++) {
        let t = y === top ? pal[0] : y > top - 3 ? pal[1] : pal[2];
        if (t === pal[2] && rnd() < 0.035) t = isl.id === 'volcano' ? (rnd() < 0.5 ? B.MAGMA : B.GOLDORE) : isl.id === 'candy' ? B.GOLDORE : B.CRYORE;
        this.put(x, y, z, t);
      }
      tops.set(x + ',' + z, top);
    }
    isl.tops = tops;
  }
  topAt(isl, x, z) { const t = isl.tops.get(x + ',' + z); return t === undefined ? -1 : t; }
  /** Flatten a disc to height y with the island's surface; clears everything above. */
  flatten(isl, px, pz, rad, y, surf, sub) {
    for (let x = px - rad; x <= px + rad; x++) for (let z = pz - rad; z <= pz + rad; z++) {
      if (Math.hypot(x - px, z - pz) > rad + 0.3) continue;
      if (this.topAt(isl, x, z) < 0) continue;
      for (let yy = y + 1; yy < y + 16; yy++) this.put(x, yy, z, B.AIR);
      for (let yy = y - 3; yy < y; yy++) if (!this.get(x, yy, z) || yy >= y - 2) this.put(x, yy, z, sub);
      this.put(x, y, z, surf);
      isl.tops.set(x + ',' + z, y);
    }
  }
  spots(isl, n, rnd, minGap, avoid) {
    const out = [], keys = [...isl.tops.keys()];
    for (let tries = 0; tries < n * 60 && out.length < n; tries++) {
      const [x, z] = keys[Math.floor(rnd() * keys.length)].split(',').map(Number);
      const d = Math.hypot(x - isl.x, z - isl.z);
      if (d > isl.r * 0.82) continue;
      if (avoid && avoid.some(([ax, az, ar]) => Math.hypot(x - ax, z - az) < ar)) continue;
      if (out.some(([ox, oz]) => Math.hypot(x - ox, z - oz) < minGap)) continue;
      out.push([x, z]);
    }
    return out;
  }
  tree(x, y, z, trunk, leaf, h, rad, rnd) {
    for (let i = 1; i <= h; i++) this.put(x, y + i, z, trunk);
    const top = y + h;
    for (let dx = -rad; dx <= rad; dx++) for (let dy = -1; dy <= rad; dy++) for (let dz = -rad; dz <= rad; dz++) {
      const d = Math.hypot(dx, dy * 1.25, dz);
      if (d > rad + 0.35 || (d > rad - 0.4 && rnd() < 0.35)) continue;
      if (!this.get(x + dx, top + dy, z + dz)) this.put(x + dx, top + dy, z + dz, leaf);
    }
  }
  outcrop(x, y, z, ore, rnd, shell = B.COBBLE) {
    for (let dx = 0; dx < 2; dx++) for (let dz = 0; dz < 2; dz++) for (let dy = 1; dy <= 2; dy++) {
      if (dy === 2 && rnd() < 0.45) continue;
      this.put(x + dx, y + dy, z + dz, rnd() < 0.55 ? ore : shell);
    }
    this.put(x, y + 1, z, ore);
  }
  decorate(I, rnd) {
    const pads = this.pads;
    // ---- meadow: pad + flat lawn, pond, oaks, cherries, outcrops, lanterns
    const M = I.meadow, [mpx, mpz] = M.pad;
    this.flatten(M, mpx + 3, mpz - 1, 7, M.y + 1, B.GRASS, B.SOIL);
    pads.meadow = this.makePad(mpx, M.y + 1, mpz);
    const mPond = [M.x - 6, M.z + 6];
    this.flatten(M, mPond[0], mPond[1], 3, M.y + 1, B.GRASS, B.SOIL);
    for (let x = -2; x <= 2; x++) for (let z = -2; z <= 1; z++) { if (Math.abs(x) === 2 && Math.abs(z) > 0) continue; const X = mPond[0] + x, Z = mPond[1] + z; this.put(X, M.y + 1, Z, B.WATER); if (Math.abs(x) < 2 && z > -2 && z < 1) this.put(X, M.y, Z, B.WATER); }
    const spawn = this.cfg.world.spawn;
    const mAvoid = [[mpx + 3, mpz - 1, 8.5], [mPond[0], mPond[1], 4], [spawn[0], spawn[2], 6.5]];
    const ms = this.spots(M, 9, rnd, 4.2, mAvoid);
    ms.forEach(([x, z], i) => { const y = this.topAt(M, x, z); if (i < 5) this.tree(x, y, z, B.LOG, B.LEAF, 4 + Math.floor(rnd() * 2), 2, rnd); else this.tree(x, y, z, B.LOG, B.CHERRY, 4, 3, rnd); });
    const mo = this.spots(M, 4, rnd, 4, mAvoid.concat(ms.map(([x, z]) => [x, z, 3])));
    mo.forEach(([x, z], i) => this.outcrop(x, this.topAt(M, x, z), z, i === 3 ? B.GOLDORE : B.CRYORE, rnd));
    // the first ore sits right in front of the spawn so the first minute pays at once
    { const ox = Math.floor(spawn[0]), oz = Math.floor(spawn[2]) - 4; this.outcrop(ox, this.groundY(ox, oz), oz, B.CRYORE, rnd); }
    this.putLanterns(M, 3, rnd, mAvoid);
    this.flowers(M, 40, rnd, B.GRASS);
    // ---- crystal isle: crystal trees, glass geodes full of crystal ore
    const C = I.crystal, [cpx, cpz] = C.pad;
    this.flatten(C, cpx + 4, cpz, 6, C.y + 1, B.GRASS, B.SOIL);
    pads.crystal = this.makePad(cpx, C.y + 1, cpz);
    const cAvoid = [[cpx + 4, cpz, 7.5]];
    const cs = this.spots(C, 7, rnd, 4, cAvoid);
    cs.forEach(([x, z], i) => {
      const y = this.topAt(C, x, z);
      if (i < 4) this.tree(x, y, z, B.LOG, B.CRYSTAL, 4, 2, rnd);
      else if (i < 6) this.geode(x, y, z, rnd); else this.outcrop(x, y, z, B.CRYORE, rnd);
    });
    for (const [x, z] of this.spots(C, 5, rnd, 3, cAvoid.concat(cs.map(([x, z]) => [x, z, 3])))) this.outcrop(x, this.topAt(C, x, z), z, B.CRYORE, rnd);
    this.putLanterns(C, 2, rnd, cAvoid);
    this.flowers(C, 18, rnd, B.GRASS);
    // ---- candy & cloud haven: candy ground, bouncy cloud mounds, gold outcrops, cherry trees
    const N = I.candy, [npx, npz] = N.pad;
    this.flatten(N, npx, npz, 3, N.y + 1, B.CANDY, B.CANDY);
    pads.candy = this.makePad(npx, N.y + 1, npz);
    const nAvoid = [[npx, npz, 4]];
    const ns = this.spots(N, 9, rnd, 3.6, nAvoid);
    ns.forEach(([x, z], i) => {
      const y = this.topAt(N, x, z);
      if (i < 3) this.tree(x, y, z, B.LOG, B.CHERRY, 4, 2, rnd);
      else if (i < 6) { for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) { this.put(x + dx, y + 1, z + dz, B.CLOUD); if (!dx || !dz) this.put(x + dx, y + 2, z + dz, B.CLOUD); } }
      else this.outcrop(x, y, z, B.GOLDORE, rnd, B.CANDY);
    });
    this.putLanterns(N, 2, rnd, nAvoid);
    // floating cloud puffs above the haven to bounce between
    for (const [x, y, z] of [[60, 41, 26], [72, 43, 38], [58, 45, 36]]) for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) this.put(x + dx, y, z + dz, B.CLOUD);
    // ---- volcano forge: basalt cone with a magma crater, lava veins, ores
    const V = I.volcano, [vpx, vpz] = V.pad;
    this.flatten(V, vpx + 6, vpz + 6, 8, V.y + 1, B.BASALT, B.BASALT);
    pads.volcano = this.makePad(vpx, V.y + 1, vpz);
    const kx = V.x - 6, kz = V.z - 6;
    for (let x = kx - 7; x <= kx + 7; x++) for (let z = kz - 7; z <= kz + 7; z++) {
      const d = Math.hypot(x - kx, z - kz); if (d > 7.2) continue;
      const base = this.topAt(V, x, z); if (base < 0) continue;
      const h = Math.round((7.2 - d) * 2.1);
      for (let y = base + 1; y <= base + h; y++) this.put(x, y, z, d < 1.6 ? B.MAGMA : rnd() < 0.06 ? B.MAGMA : B.BASALT);
      if (d < 2.3) this.put(x, base + h, z, B.MAGMA);
    }
    for (let k = 0; k < 5; k++) {
      let x = kx, z = kz; const a0 = rnd() * TAU;
      for (let s = 0; s < 14; s++) { const a = a0 + Math.sin(s * 0.7) * 0.5; x += Math.cos(a); z += Math.sin(a); const X = Math.round(x), Z = Math.round(z), y = this.groundY(X, Z); if (y > 0 && this.get(X, y, Z) === B.BASALT) this.put(X, y, Z, B.MAGMA); }
    }
    const vAvoid = [[vpx + 6, vpz + 6, 9], [kx, kz, 8]];
    for (const [x, z] of this.spots(V, 6, rnd, 3.2, vAvoid)) this.outcrop(x, this.topAt(V, x, z), z, rnd() < 0.5 ? B.GOLDORE : B.CRYORE, rnd, B.BASALT);
    this.putLanterns(V, 3, rnd, vAvoid);
  }
  geode(x, y, z, rnd) {
    const R = 2.4;
    for (let dx = -3; dx <= 3; dx++) for (let dy = -2; dy <= 3; dy++) for (let dz = -3; dz <= 3; dz++) {
      const d = Math.hypot(dx, dy, dz); if (d > R + 0.4) continue;
      this.put(x + dx, y + dy, z + dz, d > R - 0.6 ? B.GLASS : rnd() < 0.7 ? B.CRYORE : B.AIR);
    }
  }
  putLanterns(isl, n, rnd, avoid) { for (const [x, z] of this.spots(isl, n, rnd, 5, avoid)) { const y = this.topAt(isl, x, z); if (!this.get(x, y + 1, z)) { this.put(x, y + 1, z, B.LOG); this.put(x, y + 2, z, B.LANTERN); } } }
  flowers(isl, n, rnd, onType) {
    for (let k = 0; k < n * 3 && n > 0; k++) {
      const keys = [...isl.tops.keys()], [x, z] = keys[Math.floor(rnd() * keys.length)].split(',').map(Number);
      const y = this.groundY(x, z);
      if (this.get(x, y, z) !== onType || this.get(x, y + 1, z) || this.flowerSpots.some((f) => f[0] === x && f[2] === z)) continue;
      this.flowerSpots.push([x, y, z, Math.floor(rnd() * 4)]); n--;
    }
  }
  makePad(px, y, pz) {
    for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) { this.put(px + dx, y, pz + dz, B.PAD); for (let yy = y + 1; yy < y + 4; yy++) this.put(px + dx, yy, pz + dz, B.AIR); }
    return { x: px, y, z: pz };
  }

  // ---------------- edits (save diff)
  exportEdits() { const out = []; for (const [i, t] of this.edits) out.push(i, t); return out; }
  importEdits(list) {
    if (!Array.isArray(list)) return;
    const N = this.cells.length;
    for (let k = 0; k + 1 < list.length; k += 2) {
      const i = Math.floor(list[k]), t = Math.floor(list[k + 1]);
      if (!(i >= 0 && i < N) || !(t >= 0 && t < BLOCKS.length) || (t && !BLOCKS[t])) continue;
      const [x, y, z] = this.xyz(i); this.set(x, y, z, t);
    }
  }

  // ---------------- queries
  /** Amanatides–Woo grid walk. Water is passed through. Returns the first hit with its face normal. */
  raycast(ox, oy, oz, dx, dy, dz, max) {
    let x = Math.floor(ox), y = Math.floor(oy), z = Math.floor(oz);
    const sx = dx > 0 ? 1 : -1, sy = dy > 0 ? 1 : -1, sz = dz > 0 ? 1 : -1;
    const tdx = Math.abs(1 / (dx || 1e-9)), tdy = Math.abs(1 / (dy || 1e-9)), tdz = Math.abs(1 / (dz || 1e-9));
    let tx = (sx > 0 ? x + 1 - ox : ox - x) * tdx, ty = (sy > 0 ? y + 1 - oy : oy - y) * tdy, tz = (sz > 0 ? z + 1 - oz : oz - z) * tdz;
    let nx = 0, ny = 0, nz = 0, t = 0;
    for (let i = 0; i < 256 && t <= max; i++) {
      if (i > 0) { const b = this.get(x, y, z); if (b && b !== B.WATER) return { x, y, z, nx, ny, nz, t, type: b }; }
      if (tx < ty && tx < tz) { x += sx; t = tx; tx += tdx; nx = -sx; ny = 0; nz = 0; }
      else if (ty < tz) { y += sy; t = ty; ty += tdy; nx = 0; ny = -sy; nz = 0; }
      else { z += sz; t = tz; tz += tdz; nx = 0; ny = 0; nz = -sz; }
    }
    return null;
  }
  /** True if an axis-aligned box (min corner x,y,z; size w,h,w) touches any solid block. */
  boxHits(x, y, z, w, h) {
    const x0 = Math.floor(x), x1 = Math.floor(x + w - 1e-6), y0 = Math.floor(y), y1 = Math.floor(y + h - 1e-6), z0 = Math.floor(z), z1 = Math.floor(z + w - 1e-6);
    for (let yy = y0; yy <= y1; yy++) for (let zz = z0; zz <= z1; zz++) for (let xx = x0; xx <= x1; xx++) if (this.solid(xx, yy, zz)) return true;
    return false;
  }

  // ---------------- meshing
  /** Builds the geometry arrays of one chunk: opaque/cutout faces (atlas) and water faces (own tiling texture). */
  meshChunk(cx, cy, cz, tex) {
    const o = { p: [], n: [], u: [], c: [], i: [] }, w = { p: [], n: [], u: [], i: [] };
    const X0 = cx * CH, Y0 = cy * CH, Z0 = cz * CH;
    for (let y = Y0; y < Y0 + CH; y++) for (let z = Z0; z < Z0 + CH; z++) for (let x = X0; x < X0 + CH; x++) {
      const i = this.idx(x, y, z), t = this.cells[i];
      if (!t || this.hidden.has(i)) continue;
      const kind = BLOCKS[t].kind;
      for (let f = 0; f < 6; f++) {
        const F = FACES[f], ax = x + F.n[0], ay = y + F.n[1], az = z + F.n[2];
        let nb = this.get(ax, ay, az);
        if (nb && this.hidden.has(this.idx(ax, ay, az))) nb = 0;
        if (kind === 'water') { if (nb) continue; this.waterFace(w, x, y, z, f); continue; }
        if (nb) { const nk = BLOCKS[nb].kind; if (nk === 'solid') continue; if (nb === t && t === B.GLASS) continue; }
        this.solidFace(o, x, y, z, f, t, tex);
      }
    }
    return { o, w };
  }
  solidFace(o, x, y, z, f, t, tex) {
    const F = FACES[f], [u0, v0, u1, v1] = tex.uv(BLOCKS[t].tiles[F.tile]);
    const base = o.p.length / 3, ax = x + F.n[0], ay = y + F.n[1], az = z + F.n[2];
    const ao = [0, 0, 0, 0];
    for (let k = 0; k < 4; k++) {
      const c = F.c[k];
      // tangent offsets: on each axis where the normal is 0, the corner says -1 or +1
      let s1 = [0, 0, 0], s2 = [0, 0, 0], first = true;
      for (let a = 0; a < 3; a++) { if (F.n[a]) continue; const v = c[a] ? 1 : -1; if (first) { s1[a] = v; first = false; } else s2[a] = v; }
      const A = opaqueT(this.get(ax + s1[0], ay + s1[1], az + s1[2])) ? 1 : 0;
      const Bq = opaqueT(this.get(ax + s2[0], ay + s2[1], az + s2[2])) ? 1 : 0;
      const C = opaqueT(this.get(ax + s1[0] + s2[0], ay + s1[1] + s2[1], az + s1[2] + s2[2])) ? 1 : 0;
      ao[k] = A && Bq ? 0 : 3 - (A + Bq + C);
      o.p.push(x + c[0], y + c[1], z + c[2]); o.n.push(F.n[0], F.n[1], F.n[2]);
      const l = AO_LEVEL[ao[k]] * F.shade; o.c.push(l, l, l);
    }
    o.u.push(u0, v0, u1, v0, u1, v1, u0, v1);
    if (ao[0] + ao[2] < ao[1] + ao[3]) o.i.push(base + 1, base + 2, base + 3, base + 1, base + 3, base);
    else o.i.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }
  waterFace(w, x, y, z, f) {
    const F = FACES[f], base = w.p.length / 3, low = !this.get(x, y + 1, z) ? 0.86 : 1;
    for (const c of F.c) { w.p.push(x + c[0], y + (c[1] ? low : 0), z + c[2]); w.n.push(F.n[0], F.n[1], F.n[2]); }
    for (const c of F.c) { if (F.n[1]) w.u.push((x + c[0]) * 0.5, (z + c[2]) * 0.5); else w.u.push((x + c[0] + z + c[2]) * 0.5, (y + c[1]) * 0.5); }
    w.i.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }
}

// ---------------------------------------------------------------- SoundEngine
const SCALE = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5];
const PENTA = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33, 659.25, 783.99, 880.0, 1046.5, 1174.66, 1318.5];
/** Every sound is synthesised with Web Audio. The context starts on the first gesture and pauses when hidden. */
class SoundEngine {
  constructor() { this.ctx = null; this.muted = false; this.music = true; this.combo = 0; this.lastHarvest = -9; this.nextNote = 0; this.beat = 0; }
  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      try { this.ctx = new AC(); } catch (e) { return; }
      const c = this.ctx;
      this.comp = c.createDynamicsCompressor(); this.comp.threshold.value = -14; this.comp.ratio.value = 4; this.comp.connect(c.destination);
      this.master = c.createGain(); this.master.gain.value = this.muted ? 0 : 0.8; this.master.connect(this.comp);
      this.sfx = c.createGain(); this.sfx.gain.value = 0.9; this.sfx.connect(this.master);
      this.mus = c.createGain(); this.mus.gain.value = this.music ? 0.16 : 0; this.mus.connect(this.master);
      const len = c.sampleRate * 0.5, buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      this.noise = buf;
    }
    if (this.ctx.state === 'suspended' && !document.hidden) this.ctx.resume().catch(() => {});
  }
  get ok() { return !!this.ctx && this.ctx.state === 'running'; }
  setMuted(m) { this.muted = m; if (this.master) this.master.gain.setTargetAtTime(m ? 0 : 0.8, this.ctx.currentTime, 0.03); }
  setMusic(on) { this.music = on; if (this.mus) this.mus.gain.setTargetAtTime(on ? 0.16 : 0, this.ctx.currentTime, 0.2); }
  pause(h) { if (!this.ctx) return; if (h) this.ctx.suspend().catch(() => {}); else this.ctx.resume().catch(() => {}); }
  close() { if (this.ctx) this.ctx.close().catch(() => {}); this.ctx = null; }
  /** One enveloped oscillator. */
  tone(f, dur, { type = 'sine', gain = 0.25, at = 0, attack = 0.004, bend = 0, dest } = {}) {
    if (!this.ok) return;
    const c = this.ctx, t0 = c.currentTime + at, o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t0);
    if (bend) o.frequency.exponentialRampToValueAtTime(Math.max(30, f * bend), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(gain, t0 + attack); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(dest || this.sfx); o.start(t0); o.stop(t0 + dur + 0.05);
  }
  noiseHit(dur, freq, gain, at = 0, q = 1.2) {
    if (!this.ok) return;
    const c = this.ctx, t0 = c.currentTime + at, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    s.buffer = this.noise; f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q;
    g.gain.setValueAtTime(gain, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    s.connect(f); f.connect(g); g.connect(this.sfx); s.start(t0, Math.random() * 0.3); s.stop(t0 + dur + 0.02);
  }
  jit() { return 0.92 + Math.random() * 0.16; }
  marimba(f, at = 0, gain = 0.3, dest) { this.tone(f, 0.55, { gain, at, dest }); this.tone(f * 4, 0.09, { gain: gain * 0.35, at, dest }); this.tone(f * 2.01, 0.2, { gain: gain * 0.2, at, type: 'triangle', dest }); }
  /** A tool strike while mining: woody knock tuned by material. */
  hit(snd) { const j = this.jit(); if (snd === 'crystal') { this.tone(1800 * j, 0.08, { gain: 0.08, type: 'triangle' }); this.noiseHit(0.05, 4000, 0.12); } else if (snd === 'wood') { this.tone(240 * j, 0.07, { gain: 0.2, bend: 0.7 }); this.noiseHit(0.05, 1200, 0.15); } else if (snd === 'soft') this.noiseHit(0.07, 700 * j, 0.22, 0, 0.8); else { this.tone(160 * j, 0.06, { gain: 0.16, type: 'triangle', bend: 0.6 }); this.noiseHit(0.06, 2200 * j, 0.2); } }
  /** Block harvested: marimba note climbs the C-major pentatonic with consecutive harvests (reset after a pause). */
  harvest(now, snd, resetAfter) {
    if (now - this.lastHarvest > resetAfter) this.combo = 0;
    this.lastHarvest = now;
    const f = SCALE[Math.min(this.combo, SCALE.length - 1)];
    this.combo++;
    this.marimba(f);
    if (snd === 'crystal') this.chime(); else this.noiseHit(0.12, snd === 'stone' ? 1600 : 900, 0.18);
    return this.combo;
  }
  chime() { for (const [f, a] of [[2093, 0], [2637, 0.04], [3136, 0.08], [4186, 0.12]]) this.tone(f * this.jit() * 0.5 + f * 0.5, 0.7, { gain: 0.06, at: a, type: 'triangle' }); }
  place() { this.tone(210 * this.jit(), 0.13, { gain: 0.32, bend: 0.6 }); this.noiseHit(0.06, 500, 0.12); }
  harp(i) { const f = PENTA[i % PENTA.length] * (i >= PENTA.length ? 2 : 1); this.tone(f, 0.5, { gain: 0.1, type: 'triangle' }); this.tone(f * 2, 0.25, { gain: 0.04 }); }
  fanfare() { [[523.25, 0], [659.25, 0.12], [783.99, 0.24], [1046.5, 0.38]].forEach(([f, a]) => { this.tone(f, 0.42, { gain: 0.14, at: a, type: 'square' }); this.tone(f, 0.6, { gain: 0.16, at: a, type: 'triangle' }); }); this.tone(1046.5, 0.9, { gain: 0.12, at: 0.38 }); this.tone(1318.5, 0.9, { gain: 0.1, at: 0.5 }); }
  hatch() { [[659.25, 0], [783.99, 0.1], [1046.5, 0.2], [1318.5, 0.32], [1567.98, 0.44]].forEach(([f, a]) => this.marimba(f, a, 0.22)); this.chime(); }
  boing() { this.tone(170, 0.4, { gain: 0.3, bend: 3.6 }); this.tone(340, 0.3, { gain: 0.08, type: 'triangle', bend: 2.6, at: 0.02 }); }
  crack() { this.noiseHit(0.08, 3000, 0.2); this.tone(900 * this.jit(), 0.05, { gain: 0.06, type: 'square' }); }
  pop() { this.tone(700, 0.12, { gain: 0.15, bend: 1.8 }); }
  whoosh() { this.noiseHit(0.5, 600, 0.12, 0, 0.6); }
  sparkle() { for (let i = 0; i < 5; i++) this.tone(2000 + i * 400 + Math.random() * 200, 0.2, { gain: 0.04, at: i * 0.05, type: 'triangle' }); }
  step() { this.noiseHit(0.05, 500 * this.jit(), 0.06, 0, 0.7); }
  /** Gentle procedural lullaby: soft marimba arpeggios over I–vi–IV–V, scheduled slightly ahead. */
  tickMusic(night) {
    if (!this.ok || !this.music) return;
    const c = this.ctx, beat = 0.42;
    if (this.nextNote < c.currentTime) this.nextNote = c.currentTime + 0.05;
    const chords = [[0, 2, 4], [5, 7, 9], [3, 5, 7], [4, 6, 8]].map((ch) => ch.map((k) => [261.63, 293.66, 329.63, 349.23, 392.0, 440.0, 493.88, 523.25, 587.33, 659.25][k]));
    while (this.nextNote < c.currentTime + 0.3) {
      const bar = Math.floor(this.beat / 8) % 4, s = this.beat % 8, ch = chords[bar];
      const at = this.nextNote - c.currentTime;
      if (s === 0) this.tone(ch[0] / 2, beat * 7, { gain: 0.22, at, dest: this.mus, attack: 0.08 });
      const pat = [0, 1, 2, 1, 0, 2, 1, 2];
      if (!(night && s % 2)) this.marimba(ch[pat[s]] * (s >= 4 ? 2 : 1), at, 0.18, this.mus);
      this.nextNote += beat; this.beat++;
    }
  }
}

// ---------------------------------------------------------------- VFXSystem
/** Pooled effects: textured voxel shards (instanced, gravity + bounce), soft points (dust, sparkles, confetti,
 *  fireworks), rising "+N" popups, the shockwave ring and the night fireflies. Nothing allocates per frame. */
class VFXSystem {
  constructor(scene, tex, atlas, world) {
    this.scene = scene; this.tex = tex; this.world = world; this.half = false;
    // shards
    const N = 360, geo = new THREE.BoxGeometry(1, 1, 1);
    this.tileAttr = new THREE.InstancedBufferAttribute(new Float32Array(N * 2), 2);
    geo.setAttribute('aTile', this.tileAttr);
    const mat = new THREE.MeshLambertMaterial({ map: atlas });
    const tw = 1 / tex.COLS, th = 1 / tex.ROWS;
    mat.onBeforeCompile = (s) => {
      s.vertexShader = s.vertexShader.replace('#include <common>', '#include <common>\nattribute vec2 aTile;')
        .replace('#include <uv_vertex>', `#include <uv_vertex>\nvMapUv = aTile + uv * vec2(${(tw * 0.5).toFixed(5)}, ${(th * 0.5).toFixed(5)}) + vec2(${(tw * 0.25).toFixed(5)}, ${(th * 0.25).toFixed(5)});`);
    };
    this.shardMesh = new THREE.InstancedMesh(geo, mat, N); this.shardMesh.count = 0; this.shardMesh.frustumCulled = false;
    this.shardMesh.castShadow = false; scene.add(this.shardMesh);
    this.shards = []; this.shardFree = []; for (let i = 0; i < N; i++) this.shardFree.push({ p: new THREE.Vector3(), v: new THREE.Vector3(), r: new THREE.Euler(), w: new THREE.Vector3(), life: 0, max: 1, s: 0.2, tile: [0, 0] });
    this.m4 = new THREE.Matrix4(); this.q = new THREE.Quaternion(); this.sv = new THREE.Vector3();
    // points
    const P = 1600;
    this.pPos = new Float32Array(P * 3); this.pCol = new Float32Array(P * 3); this.pSize = new Float32Array(P); this.pAlpha = new Float32Array(P);
    const pg = new THREE.BufferGeometry();
    pg.setAttribute('position', new THREE.BufferAttribute(this.pPos, 3).setUsage(THREE.DynamicDrawUsage));
    pg.setAttribute('color', new THREE.BufferAttribute(this.pCol, 3).setUsage(THREE.DynamicDrawUsage));
    pg.setAttribute('size', new THREE.BufferAttribute(this.pSize, 1).setUsage(THREE.DynamicDrawUsage));
    pg.setAttribute('alpha', new THREE.BufferAttribute(this.pAlpha, 1).setUsage(THREE.DynamicDrawUsage));
    this.pMat = new THREE.ShaderMaterial({
      uniforms: { scale: { value: 600 } }, transparent: true, depthWrite: false, vertexColors: true,
      vertexShader: 'attribute float size; attribute float alpha; varying vec3 vC; varying float vA; uniform float scale; void main(){ vC = color; vA = alpha; vec4 mv = modelViewMatrix * vec4(position,1.0); gl_PointSize = min(size * scale / max(0.5, -mv.z), scale * 0.07); gl_Position = projectionMatrix * mv; }',
      fragmentShader: 'varying vec3 vC; varying float vA; void main(){ vec2 d = gl_PointCoord - 0.5; float r = dot(d,d); if (r > 0.25) discard; float a = vA * smoothstep(0.25, 0.08, r); gl_FragColor = vec4(vC * (1.0 + 0.25 * smoothstep(0.08, 0.0, r)), a * 0.9);\n#include <colorspace_fragment>\n}',
    });
    this.points = new THREE.Points(pg, this.pMat); this.points.frustumCulled = false; this.points.renderOrder = 5; scene.add(this.points);
    this.parts = []; this.partFree = []; for (let i = 0; i < P; i++) this.partFree.push({ p: new THREE.Vector3(), v: new THREE.Vector3(), c: new THREE.Color(), life: 0, max: 1, s: 0.1, g: 0, drag: 0, kind: 0 });
    // popups
    this.pops = [];
    for (let i = 0; i < 10; i++) {
      const c = document.createElement('canvas'); c.width = 160; c.height = 80;
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthTest: false, fog: false }));
      s.scale.set(1.2, 0.6, 1); s.visible = false; s.renderOrder = 10; scene.add(s);
      this.pops.push({ s, c, t, life: 0 });
    }
    // shockwave ring
    this.ring = new THREE.Mesh(new THREE.RingGeometry(0.85, 1, 48), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false, fog: false }));
    this.ring.rotation.x = -Math.PI / 2; this.ring.visible = false; scene.add(this.ring); this.ringT = 0;
    // fireflies / pollen (persist around the player)
    const F = 70; this.ff = []; const fg = new THREE.BufferGeometry(); this.fPos = new Float32Array(F * 3);
    fg.setAttribute('position', new THREE.BufferAttribute(this.fPos, 3).setUsage(THREE.DynamicDrawUsage));
    this.fMat = new THREE.PointsMaterial({ color: 0xffe27a, size: 0.16, transparent: true, opacity: 0.6, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
    this.fireflies = new THREE.Points(fg, this.fMat); this.fireflies.frustumCulled = false; scene.add(this.fireflies);
    for (let i = 0; i < F; i++) this.ff.push({ o: new THREE.Vector3((Math.random() - 0.5) * 30, Math.random() * 8, (Math.random() - 0.5) * 30), ph: Math.random() * TAU, sp: 0.4 + Math.random() * 0.8 });
    this.flashes = [];
  }
  // ---- spawners
  shard(x, y, z, t, vx, vy, vz, size, life) {
    const s = this.shardFree.pop(); if (!s) return;
    const ti = BLOCKS[t].tiles[1], [u0, v0] = this.tex.uv(ti);
    s.p.set(x, y, z); s.v.set(vx, vy, vz); s.r.set(Math.random() * 3, Math.random() * 3, 0); s.w.set((Math.random() - 0.5) * 14, (Math.random() - 0.5) * 14, (Math.random() - 0.5) * 14);
    s.life = 0; s.max = life; s.s = size; s.tile[0] = u0; s.tile[1] = v0;
    this.shards.push(s);
  }
  /** 3D voxel shatter: 10–14 textured mini cubes burst from the block. */
  shatter(x, y, z, t, power = 1) {
    const n = (this.half ? 6 : 10) + Math.floor(Math.random() * 5);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU, sp = (1.5 + Math.random() * 2.5) * power;
      this.shard(x + 0.2 + Math.random() * 0.6, y + 0.2 + Math.random() * 0.6, z + 0.2 + Math.random() * 0.6, t, Math.cos(a) * sp, 2.5 + Math.random() * 3.5 * power, Math.sin(a) * sp, 0.12 + Math.random() * 0.12, 0.9 + Math.random() * 0.6);
    }
  }
  part(x, y, z, vx, vy, vz, col, size, life, g = 0, drag = 0) {
    const p = this.partFree.pop(); if (!p) return;
    p.p.set(x, y, z); p.v.set(vx, vy, vz); p.c.set(col); p.s = size; p.life = 0; p.max = life; p.g = g; p.drag = drag;
    this.parts.push(p);
  }
  sparkles(x, y, z, col, n = 12, sp = 2, size = 0.14) { if (this.half) n = Math.ceil(n / 2); for (let i = 0; i < n; i++) { const a = Math.random() * TAU, b = Math.random() * Math.PI - Math.PI / 2, s = sp * (0.4 + Math.random() * 0.8); this.part(x, y, z, Math.cos(a) * Math.cos(b) * s, Math.sin(b) * s + 0.6, Math.sin(a) * Math.cos(b) * s, col, size * (0.7 + Math.random() * 0.6), 0.5 + Math.random() * 0.5, -1, 2); } }
  /** Soft dust ring at the base of a placed block. */
  dust(x, y, z, col) { const n = this.half ? 8 : 16; for (let i = 0; i < n; i++) { const a = (i / n) * TAU; this.part(x + 0.5 + Math.cos(a) * 0.5, y + 0.05, z + 0.5 + Math.sin(a) * 0.5, Math.cos(a) * 2.2, 0.3, Math.sin(a) * 2.2, col, 0.22, 0.45, 0, 5); } }
  confetti(x, y, z, n = 120) {
    const cols = [0xff5d7a, 0xffa94d, 0xf5c84a, 0x6fcf6f, 0x4fb4ea, 0x8f6fef, 0xff8fc8];
    if (this.half) n = Math.ceil(n / 2);
    for (let i = 0; i < n; i++) { const a = Math.random() * TAU, s = 2 + Math.random() * 6; this.part(x, y, z, Math.cos(a) * s, 4 + Math.random() * 7, Math.sin(a) * s, cols[i % cols.length], 0.16 + Math.random() * 0.1, 1.6 + Math.random() * 1.2, -7, 1.6); }
  }
  /** Fireworks: a few bursts above a point, staggered. */
  fireworks(x, y, z, bursts = 5) {
    const cols = [0xff5d7a, 0xffe066, 0x5fc9ff, 0x9b7bff, 0x7ee07e, 0xffa94d];
    for (let b = 0; b < bursts; b++) this.flashes.push({ t: b * 0.28 + 0.15, x: x + (Math.random() - 0.5) * 8, y: y + 6 + Math.random() * 5, z: z + (Math.random() - 0.5) * 8, c: cols[b % cols.length] });
  }
  starShower(x, y, z) { for (let i = 0; i < (this.half ? 30 : 60); i++) this.part(x + (Math.random() - 0.5) * 3, y + 3 + Math.random() * 3, z + (Math.random() - 0.5) * 3, (Math.random() - 0.5) * 1.5, -2 - Math.random() * 2, (Math.random() - 0.5) * 1.5, i % 2 ? 0xf5c84a : 0xff9fd0, 0.2, 1.2, 0, 0.5); }
  shock(x, y, z) { this.ring.position.set(x, y, z); this.ringT = 0.001; this.ring.visible = true; }
  /** Floating "+N" with a block icon; rises and fades where it was made (never toward the camera). */
  popup(x, y, z, text, t) {
    const P = this.pops.find((p) => p.life <= 0) || this.pops.reduce((a, b) => (a.life < b.life ? a : b));
    const x2 = P.c.getContext('2d'); x2.clearRect(0, 0, 160, 80);
    if (t) x2.drawImage(this.tex.icon(t), 4, 8, 64, 64);
    x2.font = '900 50px "Baloo 2", system-ui, sans-serif'; x2.textBaseline = 'middle'; x2.lineWidth = 10; x2.strokeStyle = '#3a2160'; x2.lineJoin = 'round';
    x2.strokeText(text, 72, 42); x2.fillStyle = '#fff4a8'; x2.fillText(text, 72, 42);
    P.t.needsUpdate = true; P.s.position.set(x, y, z); P.s.visible = true; P.life = 1; P.y0 = y;
  }
  update(dt, now, cam, night) {
    // shards
    const W = this.world; let n = 0;
    for (let i = this.shards.length - 1; i >= 0; i--) {
      const s = this.shards[i]; s.life += dt;
      if (s.life >= s.max) { this.shards[i] = this.shards[this.shards.length - 1]; this.shards.pop(); this.shardFree.push(s); continue; }
      s.v.y -= 22 * dt; s.p.addScaledVector(s.v, dt);
      if (W.solid(Math.floor(s.p.x), Math.floor(s.p.y - s.s * 0.5), Math.floor(s.p.z)) && s.v.y < 0) { s.p.y = Math.floor(s.p.y - s.s * 0.5) + 1 + s.s * 0.5; s.v.y *= -0.35; s.v.x *= 0.6; s.v.z *= 0.6; s.w.multiplyScalar(0.6); }
      s.r.x += s.w.x * dt; s.r.y += s.w.y * dt; s.r.z += s.w.z * dt;
      const k = s.life > s.max - 0.3 ? (s.max - s.life) / 0.3 : 1, sz = s.s * k;
      this.q.setFromEuler(s.r); this.sv.set(sz, sz, sz); this.m4.compose(s.p, this.q, this.sv);
      this.shardMesh.setMatrixAt(n, this.m4); this.tileAttr.array[n * 2] = s.tile[0]; this.tileAttr.array[n * 2 + 1] = s.tile[1]; n++;
    }
    this.shardMesh.count = n;
    if (n) { this.shardMesh.instanceMatrix.needsUpdate = true; this.tileAttr.needsUpdate = true; }
    // firework bursts
    for (let i = this.flashes.length - 1; i >= 0; i--) {
      const f = this.flashes[i]; f.t -= dt;
      if (f.t <= 0) { this.flashes.splice(i, 1); const m = this.half ? 24 : 44; for (let k = 0; k < m; k++) { const a = Math.random() * TAU, b = Math.acos(2 * Math.random() - 1), s = 5 + Math.random() * 2; this.part(f.x, f.y, f.z, Math.sin(b) * Math.cos(a) * s, Math.cos(b) * s, Math.sin(b) * Math.sin(a) * s, f.c, 0.22, 1.1 + Math.random() * 0.4, -4, 2.2); } if (this.onBurst) this.onBurst(); }
    }
    // points
    let m = 0;
    for (let i = this.parts.length - 1; i >= 0; i--) {
      const p = this.parts[i]; p.life += dt;
      if (p.life >= p.max) { this.parts[i] = this.parts[this.parts.length - 1]; this.parts.pop(); this.partFree.push(p); continue; }
      p.v.y += p.g * dt; if (p.drag) p.v.multiplyScalar(Math.exp(-p.drag * dt)); p.p.addScaledVector(p.v, dt);
      const k = p.life / p.max;
      this.pPos[m * 3] = p.p.x; this.pPos[m * 3 + 1] = p.p.y; this.pPos[m * 3 + 2] = p.p.z;
      this.pCol[m * 3] = p.c.r; this.pCol[m * 3 + 1] = p.c.g; this.pCol[m * 3 + 2] = p.c.b;
      this.pSize[m] = p.s * (k < 0.1 ? k * 10 : 1); this.pAlpha[m] = k > 0.6 ? (1 - k) / 0.4 : 1; m++;
    }
    const g = this.points.geometry; g.setDrawRange(0, m);
    if (m) for (const a of ['position', 'color', 'size', 'alpha']) g.attributes[a].needsUpdate = true;
    // popups
    for (const P of this.pops) { if (P.life <= 0) continue; P.life -= dt / 1.0; P.s.position.y = P.y0 + (1 - P.life) * 1.1; P.s.material.opacity = clamp(P.life * 2.5, 0, 1); const sc = 1 + Math.max(0, 0.3 - (1 - P.life)) * 1.5; P.s.scale.set(1.2 * sc, 0.6 * sc, 1); if (P.life <= 0) P.s.visible = false; }
    // ring
    if (this.ringT > 0) { this.ringT += dt; const k = this.ringT / 0.7, r = 1 + k * 14; this.ring.scale.set(r, r, r); this.ring.material.opacity = (1 - k) * 0.42; this.ring.material.color.setHex(0xd2b6ff); if (k >= 1) { this.ringT = 0; this.ring.visible = false; } }
    // fireflies: golden pollen by day, glowing fireflies at dusk and night
    const fp = this.fPos;
    for (let i = 0; i < this.ff.length; i++) { const f = this.ff[i], t = now * f.sp + f.ph; fp[i * 3] = cam.x + f.o.x + Math.sin(t) * 1.5; fp[i * 3 + 1] = cam.y - 2 + f.o.y + Math.sin(t * 1.7) * 0.6; fp[i * 3 + 2] = cam.z + f.o.z + Math.cos(t * 0.8) * 1.5; }
    this.fireflies.geometry.attributes.position.needsUpdate = true;
    this.fMat.size = lerp(0.07, 0.2, night); this.fMat.opacity = lerp(0.45, 0.95, night) * (0.8 + 0.2 * Math.sin(now * 3));
    this.fMat.color.setHex(night > 0.5 ? 0xc8ff6a : 0xffe27a);
  }
  dispose() {
    this.shardMesh.geometry.dispose(); this.shardMesh.material.dispose(); this.points.geometry.dispose(); this.pMat.dispose();
    for (const P of this.pops) { P.t.dispose(); P.s.material.dispose(); }
    this.ring.geometry.dispose(); this.ring.material.dispose(); this.fireflies.geometry.dispose(); this.fMat.dispose();
  }
}

// ---------------------------------------------------------------- shared little meshes
/** Box geometry of one block with its atlas tiles (all six faces), cached per type. */
function blockGeo(tex, t, cache) {
  if (cache[t]) return cache[t];
  const p = [], n = [], u = [], idx = [], col = [];
  FACES.forEach((F, f) => {
    for (let k = 0; k < 4; k++) col.push(F.shade, F.shade, F.shade);
    const [u0, v0, u1, v1] = tex.uv(BLOCKS[t].tiles[F.tile]), b = p.length / 3;
    for (const c of F.c) { p.push(c[0] - 0.5, c[1] - 0.5, c[2] - 0.5); n.push(...F.n); }
    u.push(u0, v0, u1, v0, u1, v1, u0, v1); idx.push(b, b + 1, b + 2, b, b + 2, b + 3);
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(n, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(u, 2)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx);
  cache[t] = g; return g;
}
/** A group of coloured boxes: [w,h,d, x,y,z, colour, name?]. */
function boxes(list, matCache, emissive) {
  const g = new THREE.Group();
  for (const [w, h, d, x, y, z, col, name] of list) {
    const key = col + (emissive ? 'e' : '');
    const mat = matCache[key] || (matCache[key] = new THREE.MeshLambertMaterial({ color: col, emissive: emissive ? col : 0x000000, emissiveIntensity: emissive ? 0.35 : 0 }));
    const m = new THREE.Mesh(matCache.__box || (matCache.__box = new THREE.BoxGeometry(1, 1, 1)), mat);
    m.scale.set(w, h, d); m.position.set(x, y, z); m.castShadow = true;
    if (name) m.name = name;
    g.add(m);
  }
  return g;
}

// ---------------------------------------------------------------- PetManager
const PET_LOOK = {
  fox: { body: 0xff7a2f, belly: 0xfff1e0, ear: 0xff7a2f, tip: 0xfff1e0, eye: 0x2a1838, trail: 0xffa040 },
  bunny: { body: 0xffffff, belly: 0xffe0ef, ear: 0xffffff, tip: 0xffa8d0, eye: 0x2a1838, trail: 0xbfe6ff },
  turtle: { body: 0x6fd36a, belly: 0xc9f29a, ear: 0x2f9e5a, tip: 0x2f9e5a, eye: 0x1a2a20, trail: 0x7dff9a },
  dragon: { body: 0x9b7bff, belly: 0xffe27a, ear: 0xffd23f, tip: 0xffe27a, eye: 0x1a1030, trail: 0xffe066 },
};
/** Golden eggs (wiggle, crack, hatch) and up to three articulated voxel pets that hop after the player with
 *  spring physics, leave a sparkle trail and fly off to mine nearby ores for bonus blocks. */
class PetManager {
  constructor(game) { this.g = game; this.cfg = game.cfg.pets; this.pets = []; this.eggs = []; this.mats = {}; }
  build(kind) {
    const L = PET_LOOK[kind], root = new THREE.Group(), body = new THREE.Group();
    root.add(body);
    let parts;
    if (kind === 'turtle') {
      parts = [[0.7, 0.32, 0.8, 0, 0.32, 0, 0x2f9e5a, 'shell'], [0.56, 0.12, 0.64, 0, 0.52, 0, 0x7dff9a], [0.62, 0.12, 0.7, 0, 0.16, 0, L.belly]];
    } else if (kind === 'dragon') {
      parts = [[0.48, 0.42, 0.62, 0, 0.38, 0, L.body], [0.36, 0.2, 0.5, 0, 0.26, 0.04, L.belly], [0.5, 0.05, 0.3, 0.38, 0.55, -0.05, 0xffb3f0, 'wingL'], [0.5, 0.05, 0.3, -0.38, 0.55, -0.05, 0xffb3f0, 'wingR']];
    } else parts = [[0.46, 0.4, 0.62, 0, 0.36, 0, L.body], [0.34, 0.22, 0.4, 0, 0.26, 0.12, L.belly]];
    body.add(boxes(parts, this.mats, kind === 'dragon'));
    const head = boxes([[0.44, 0.4, 0.4, 0, 0, 0, L.body], [0.08, 0.1, 0.03, 0.11, 0.04, 0.21, L.eye], [0.08, 0.1, 0.03, -0.11, 0.04, 0.21, L.eye], [0.04, 0.04, 0.03, 0.13, 0.07, 0.225, 0xffffff], [0.04, 0.04, 0.03, -0.09, 0.07, 0.225, 0xffffff], [0.16, 0.1, 0.1, 0, -0.08, 0.22, L.belly], [0.08, 0.05, 0.04, 0.14, -0.04, 0.215, 0xff9ec4], [0.08, 0.05, 0.04, -0.14, -0.04, 0.215, 0xff9ec4]], this.mats);
    head.position.set(0, kind === 'turtle' ? 0.42 : 0.68, kind === 'turtle' ? 0.5 : 0.28); body.add(head);
    const ears = kind === 'bunny' ? [[0.1, 0.36, 0.06, 0.1, 0.36, 0, L.ear], [0.1, 0.36, 0.06, -0.1, 0.36, 0, L.ear], [0.05, 0.24, 0.07, 0.1, 0.36, 0.005, L.tip], [0.05, 0.24, 0.07, -0.1, 0.36, 0.005, L.tip]]
      : kind === 'turtle' ? [] : kind === 'dragon' ? [[0.07, 0.18, 0.07, 0.12, 0.28, -0.05, L.ear], [0.07, 0.18, 0.07, -0.12, 0.28, -0.05, L.ear]]
        : [[0.14, 0.18, 0.06, 0.14, 0.27, 0, L.ear], [0.14, 0.18, 0.06, -0.14, 0.27, 0, L.ear], [0.07, 0.08, 0.07, 0.14, 0.33, 0.005, L.tip], [0.07, 0.08, 0.07, -0.14, 0.33, 0.005, L.tip]];
    if (ears.length) head.add(boxes(ears, this.mats));
    const legs = [];
    for (const [x, z] of [[0.16, 0.2], [-0.16, 0.2], [0.16, -0.2], [-0.16, -0.2]]) { const l = boxes([[0.13, 0.2, 0.13, 0, -0.1, 0, kind === 'turtle' ? 0x4cc05a : L.body]], this.mats); l.position.set(x * (kind === 'turtle' ? 1.7 : 1), 0.2, z * (kind === 'turtle' ? 1.6 : 1)); body.add(l); legs.push(l); }
    const tail = boxes(kind === 'fox' ? [[0.2, 0.2, 0.4, 0, 0, -0.2, L.body], [0.2, 0.2, 0.14, 0, 0, -0.46, L.tip]] : kind === 'bunny' ? [[0.18, 0.18, 0.14, 0, 0, -0.05, 0xffffff]] : kind === 'dragon' ? [[0.14, 0.14, 0.4, 0, 0, -0.2, L.body], [0.2, 0.16, 0.12, 0, 0.04, -0.44, L.tip]] : [[0.1, 0.08, 0.16, 0, 0, -0.06, 0x4cc05a]], this.mats);
    tail.position.set(0, kind === 'turtle' ? 0.26 : 0.44, kind === 'turtle' ? -0.42 : -0.3); body.add(tail);
    root.scale.setScalar(0.9);
    return { root, body, head, legs, tail, wings: [body.getObjectByName('wingL'), body.getObjectByName('wingR')] };
  }
  /** Adds a pet right where the egg hatched. */
  add(kind, pos, silent) {
    const rig = this.build(kind);
    rig.root.position.copy(pos);
    this.g.scene.add(rig.root);
    const p = { kind, rig, p: rig.root.position, v: new THREE.Vector3(), hop: 0, yaw: 0, job: null, seekT: 3 + Math.random() * 4, trailT: 0, lvl: this.g.S.petLvl ? 1 : 0 };
    if (p.lvl) rig.root.scale.setScalar(1.08);
    this.pets.push(p);
    while (this.pets.length > this.cfg.maxActive) { const old = this.pets.shift(); this.g.scene.remove(old.rig.root); }
    if (!silent) this.g.vfx.confetti(pos.x, pos.y + 0.6, pos.z, 90);
    return p;
  }
  egg(x, y, z) {
    const g = boxes([[0.34, 0.12, 0.34, 0, 0.06, 0, 0xf2b91c], [0.44, 0.16, 0.44, 0, 0.2, 0, 0xffd23f], [0.46, 0.16, 0.46, 0, 0.36, 0, 0xffe066], [0.38, 0.12, 0.38, 0, 0.5, 0, 0xffe680], [0.24, 0.08, 0.24, 0, 0.6, 0, 0xfff3b0], [0.08, 0.08, 0.02, 0.12, 0.3, 0.235, 0xff8fc8], [0.08, 0.08, 0.02, -0.1, 0.42, 0.235, 0x5fc9ff]], this.mats, true);
    g.position.set(x + 0.5, y, z + 0.5); this.g.scene.add(g);
    this.eggs.push({ g, t: 0, vy: 4, y0: y });
    this.g.sound.pop();
  }
  update(dt, now) {
    const G = this.g, P = G.player, W = G.world;
    // eggs: pop up, settle, wiggle harder, hatch
    for (let i = this.eggs.length - 1; i >= 0; i--) {
      const e = this.eggs[i]; e.t += dt;
      let gy = W.groundY(Math.floor(e.g.position.x), Math.floor(e.g.position.z), Math.floor(e.y0)) + 1;
      if (gy <= 0) gy = e.y0;
      e.vy -= 20 * dt; e.g.position.y += e.vy * dt; if (e.g.position.y < gy) { e.g.position.y = gy; e.vy = Math.abs(e.vy) > 2 ? -e.vy * 0.3 : 0; }
      const k = clamp(e.t / G.cfg.eggs.hatchTime, 0, 1);
      e.g.rotation.z = Math.sin(e.t * (10 + 26 * k)) * 0.25 * k; e.g.scale.setScalar(1 + Math.sin(e.t * 20) * 0.04 * k);
      if (Math.random() < dt * 8 * k) G.vfx.sparkles(e.g.position.x, e.g.position.y + 0.4, e.g.position.z, 0xffe066, 2, 1.2);
      if (e.t >= G.cfg.eggs.hatchTime) { G.scene.remove(e.g); this.eggs.splice(i, 1); G.hatch(e.g.position.clone()); }
    }
    // pets
    const fw = P.forward2();
    this.pets.forEach((p, i) => {
      let tx, ty, tz;
      if (p.job) {
        const [x, y, z] = W.xyz(p.job.i);
        if (W.cells[p.job.i] !== p.job.t || p.job.time > 6) p.job = null;
        else {
          tx = x + 0.5 + (p.p.x > x + 0.5 ? 0.9 : -0.9); ty = y + 1.05; tz = z + 0.5;
          if (Math.hypot(p.p.x - tx, p.p.z - tz) < 0.6) { p.job.dig += dt; if (Math.random() < dt * 6) { G.vfx.sparkles(x + 0.5, y + 0.8, z + 0.5, PET_LOOK[p.kind].trail, 3, 1.5); G.sound.hit('crystal'); } }
          p.job.time += dt;
          if (p.job && p.job.dig >= this.cfg.mineTime * (p.lvl ? 0.6 : 1)) { G.mineCell(x, y, z, { byPet: true }); p.job = null; }
        }
      }
      if (!p.job) {
        const side = (i - 1) * 1.1;
        tx = P.pos.x - fw.x * (1.6 + (i % 2) * 0.6) + fw.z * side; tz = P.pos.z - fw.z * (1.6 + (i % 2) * 0.6) - fw.x * side;
        const gy = W.groundY(Math.floor(tx), Math.floor(tz), Math.floor(P.pos.y + 2));
        ty = gy >= 0 && P.pos.y - gy < 4 ? gy + 1 : P.pos.y;
        p.seekT -= dt;
        if (p.seekT <= 0 && G.started) { p.seekT = this.cfg.seekEvery * (0.7 + Math.random() * 0.6); this.seek(p); }
      }
      // spring toward the target (critically damped-ish), then hop
      const k = this.cfg.follow, c = this.cfg.damping, far = Math.hypot(tx - p.p.x, tz - p.p.z);
      if (far > 18) { p.p.set(tx, ty + 1, tz); p.v.set(0, 0, 0); }
      p.v.x += ((tx - p.p.x) * k - p.v.x * c) * dt; p.v.z += ((tz - p.p.z) * k - p.v.z * c) * dt;
      const sp = Math.hypot(p.v.x, p.v.z);
      p.p.x += p.v.x * dt; p.p.z += p.v.z * dt;
      p.hop += dt * (sp > 0.5 ? 11 : 3);
      const hopH = sp > 0.5 ? Math.abs(Math.sin(p.hop)) * 0.35 : Math.abs(Math.sin(p.hop)) * 0.04;
      const fly = p.kind === 'dragon' ? 0.6 + Math.sin(now * 3) * 0.15 : 0;
      p.p.y = lerp(p.p.y, ty + hopH + fly, damp(14, dt));
      if (sp > 0.3) p.yaw = Math.atan2(p.v.x, p.v.z);
      else if (!p.job) p.yaw = Math.atan2(P.pos.x - p.p.x, P.pos.z - p.p.z);
      const r = p.rig; r.root.rotation.y += (((p.yaw - r.root.rotation.y + Math.PI * 3) % TAU) - Math.PI) * damp(10, dt);
      r.body.scale.set(1 + hopH * 0.25, 1 - hopH * 0.3, 1 + hopH * 0.25);
      r.legs.forEach((l, j) => { l.rotation.x = sp > 0.5 ? Math.sin(p.hop * 2 + j * Math.PI) * 0.6 : 0; });
      r.tail.rotation.y = Math.sin(now * 6 + i) * 0.4;
      r.head.rotation.x = p.job ? Math.sin(now * 14) * 0.25 : Math.sin(now * 1.6 + i) * 0.06;
      if (r.wings[0]) { r.wings[0].rotation.z = Math.sin(now * 12) * 0.5; r.wings[1].rotation.z = -Math.sin(now * 12) * 0.5; }
      p.trailT -= dt;
      if (p.trailT <= 0 && sp > 0.8) { p.trailT = 0.06; G.vfx.part(p.p.x, p.p.y + 0.3, p.p.z, (Math.random() - 0.5) * 0.4, 0.6, (Math.random() - 0.5) * 0.4, PET_LOOK[p.kind].trail, 0.12, 0.6, 0, 1); }
    });
  }
  /** Picks the nearest ore near the player that no other pet is working on. */
  seek(p) {
    const W = this.g.world, P = this.g.player.pos, R = this.cfg.seekRadius;
    let best = -1, bd = 1e9;
    for (const i of W.ores) {
      const [x, y, z] = W.xyz(i);
      const d = Math.hypot(x - P.x, y - P.y, z - P.z);
      if (d > R || d >= bd) continue;
      if (W.solid(x, y + 1, z) && W.solid(x + 1, y, z) && W.solid(x - 1, y, z) && W.solid(x, y, z + 1) && W.solid(x, y, z - 1)) continue;
      if (W.edits.has(i) || this.pets.some((o) => o.job && o.job.i === i)) continue;
      best = i; bd = d;
    }
    if (best >= 0) p.job = { i: best, t: W.cells[best], dig: 0, time: 0 };
  }
  powerUp() { for (const p of this.pets) { p.lvl = 1; p.rig.root.scale.setScalar(1.08); } }
  dispose() { for (const p of this.pets) this.g.scene.remove(p.rig.root); for (const e of this.eggs) this.g.scene.remove(e.g); for (const k in this.mats) this.mats[k].dispose(); }
}

// ---------------------------------------------------------------- BlueprintSystem
/** Block lists [dx,dy,dz,type] of each wonder, relative to its pad centre (on top of the pad). */
const STRUCTURES = {
  tree(W, pad) {
    const L = [], ox = 5, oz = -1;
    for (let y = 0; y < 6; y++) for (const [dx, dz] of [[0, 0], [1, 0], [0, 1], [1, 1]]) L.push([ox + dx, y, oz + dz, B.LOG]);
    for (let x = -2; x <= 3; x++) for (let z = -2; z <= 3; z++) L.push([ox + x, 6, oz + z, B.PLANK]);
    for (let y = 7; y <= 9; y++) for (let x = -2; x <= 3; x++) for (let z = -2; z <= 3; z++) {
      const edge = x === -2 || x === 3 || z === -2 || z === 3; if (!edge) continue;
      const win = y === 8 && (x === 0 || x === 1 || z === 0 || z === 1);
      if (x === -2 && (z === 0 || z === 1) && y < 9) continue;
      L.push([ox + x, y, oz + z, win ? B.GLASS : B.PLANK]);
    }
    for (let k = 0; k < 4; k++) for (let x = -3 + k; x <= 4 - k; x++) for (let z = -3 + k; z <= 4 - k; z++) if (k === 3 || x === -3 + k || x === 4 - k || z === -3 + k || z === 4 - k) L.push([ox + x, 10 + k, oz + z, B.CHERRY]);
    // a straight staircase outside the west wall up to the door (one block per step)
    for (let s = 0; s < 6; s++) L.push([ox - 3, s, oz + 5 - s, B.PLANK]);
    L.push([ox + 4, 7, oz + 1, B.LANTERN]);
    return L;
  },
  fountain() {
    const L = [], ox = 5, oz = 0;
    for (let x = -3; x <= 3; x++) for (let z = -3; z <= 3; z++) {
      const d = Math.hypot(x, z); if (d > 3.4) continue;
      L.push([ox + x, 0, oz + z, B.COBBLE]);
      if (d > 2.4) L.push([ox + x, 1, oz + z, B.COBBLE]); else if (d > 0.5) L.push([ox + x, 1, oz + z, B.WATER]);
    }
    for (let y = 1; y <= 5; y++) L.push([ox, y, oz, B.CRYSTAL]);
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { L.push([ox + dx, 5, oz + dz, B.GLASS]); L.push([ox + dx * 2, 6, oz + dz * 2, B.CRYSTAL]); }
    L.push([ox, 6, oz, B.CRYSTAL], [ox, 7, oz, B.LANTERN]);
    return L;
  },
  bridge(W, pad, I) {
    // a three-wide rainbow arc from the candy haven down to the volcano forge, with cloud rails
    const L = [], V = I.volcano, s = [pad.x - 5, pad.y, pad.z + 6], e = [V.x + 9, V.y + 1, V.z - 7];
    const len = Math.ceil(Math.hypot(e[0] - s[0], e[2] - s[2]));
    const dx = (e[0] - s[0]) / len, dz = (e[2] - s[2]) / len, px = -dz, pz = dx, seen = new Set();
    let lastY = s[1];
    for (let k = 0; k <= len; k++) {
      const t = k / len, y = Math.round(lerp(s[1], e[1], t) + Math.sin(t * Math.PI) * 4);
      const yy = clamp(y, lastY - 1, lastY + 1); lastY = yy;
      for (let w = -1; w <= 2; w++) {
        const x = Math.round(s[0] + dx * k + px * w), z = Math.round(s[2] + dz * k + pz * w), key = x + ',' + z;
        const rail = w === -1 || w === 2;
        if (seen.has(key + (rail ? 'r' : ''))) continue; seen.add(key + (rail ? 'r' : ''));
        if (rail) { if (k % 2 === 0) L.push([x - pad.x, yy + 1 - pad.y, z - pad.z, B.CLOUD]); }
        else L.push([x - pad.x, yy - pad.y, z - pad.z, B.RAINBOW]);
      }
    }
    return L;
  },
  castle() {
    const L = [], ox = 7, oz = 7;
    for (let x = -4; x <= 4; x++) for (let z = -4; z <= 4; z++) {
      L.push([ox + x, 0, oz + z, B.BASALT]);
      const edge = Math.abs(x) === 4 || Math.abs(z) === 4;
      if (edge) for (let y = 1; y <= 5; y++) { if (z === -4 && Math.abs(x) <= 1 && y <= 3) continue; L.push([ox + x, y, oz + z, y === 3 && (x + z) % 3 === 0 ? B.MAGMA : B.BASALT]); }
      if (edge && (x + z) % 2 === 0) L.push([ox + x, 6, oz + z, B.BASALT]);
    }
    for (const [tx, tz] of [[-4, -4], [4, -4], [-4, 4], [4, 4]]) {
      for (let y = 1; y <= 9; y++) for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) if (Math.abs(a) === 1 || Math.abs(b) === 1) L.push([ox + tx + a, y, oz + tz + b, y === 9 ? B.GOLDORE : B.BASALT]);
      L.push([ox + tx, 10, oz + tz, B.MAGMA], [ox + tx, 11, oz + tz, B.LANTERN]);
    }
    // the dragon head over the gate: gold snout, magma eyes, crystal horns
    for (let x = -2; x <= 2; x++) for (let y = 6; y <= 8; y++) L.push([ox + x, y, oz - 5, B.GOLDORE]);
    L.push([ox - 1, 7, oz - 6, B.MAGMA], [ox + 1, 7, oz - 6, B.MAGMA], [ox, 6, oz - 6, B.GOLDORE], [ox - 2, 9, oz - 5, B.CRYSTAL], [ox + 2, 9, oz - 5, B.CRYSTAL], [ox - 2, 10, oz - 5, B.CRYSTAL], [ox + 2, 10, oz - 5, B.CRYSTAL]);
    for (let k = 0; k < 3; k++) for (let x = -2 + k; x <= 2 - k; x++) for (let z = -2 + k; z <= 2 - k; z++) L.push([ox + x, 7 + k, oz + z, B.GOLDORE]);
    L.push([ox, 10, oz, B.RAINBOW]);
    return L;
  },
};

/** Wonder Blueprint pads: hologram of the wonder, floating cost card, light beacon; standing on the pad and pressing
 *  build makes blocks fly from the player along curved paths and assemble the wonder one by one. */
class BlueprintSystem {
  constructor(game) {
    this.g = game; this.list = []; this.flying = []; this.queue = []; this.cache = {};
    const W = game.world, I = Object.fromEntries(game.cfg.islands.map((i) => [i.id, i]));
    this.holoMat = new THREE.MeshBasicMaterial({ color: 0x5fb8d8, transparent: true, opacity: 0.1, depthWrite: false, fog: false });
    this.boxGeo = new THREE.BoxGeometry(0.92, 0.92, 0.92);
    for (const bp of game.cfg.blueprints) {
      const isl = I[bp.island], pad = W.pads[bp.island];
      const cells = STRUCTURES[bp.id](W, pad, I).map(([dx, dy, dz, t]) => [pad.x + dx, pad.y + 1 + dy, pad.z + dz, t])
        .filter(([x, y, z]) => W.inside(x, y, z));
      cells.sort((a, b) => a[1] - b[1] || Math.hypot(a[0] - pad.x, a[2] - pad.z) - Math.hypot(b[0] - pad.x, b[2] - pad.z));
      const holo = new THREE.InstancedMesh(this.boxGeo, this.holoMat, cells.length);
      const m = new THREE.Matrix4(); cells.forEach(([x, y, z], k) => { m.makeTranslation(x + 0.5, y + 0.5, z + 0.5); holo.setMatrixAt(k, m); });
      holo.frustumCulled = false; game.scene.add(holo);
      const beamMat = new THREE.MeshBasicMaterial({ color: isl.beam, transparent: true, opacity: 0.1, depthWrite: false, side: THREE.DoubleSide, fog: false });
      const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.9, 60, 12, 1, true), beamMat); beam.position.set(pad.x + 0.5, pad.y + 31, pad.z + 0.5); game.scene.add(beam);
      const cv = document.createElement('canvas'); cv.width = 512; cv.height = 160;
      const ct = new THREE.CanvasTexture(cv); ct.colorSpace = THREE.SRGBColorSpace;
      const card = new THREE.Sprite(new THREE.SpriteMaterial({ map: ct, transparent: true, depthTest: false, fog: false })); card.scale.set(4.8, 1.5, 1); card.renderOrder = 9;
      card.position.set(pad.x + 0.5, pad.y + 4, pad.z + 0.5); game.scene.add(card);
      this.list.push({ id: bp.id, cost: bp.cost, pad, island: bp.island, cells, holo, beam, card, cv, ct, done: false, building: false, key: '' });
    }
  }
  /** Marks a wonder as already built (from the save): its blocks are in the saved edits already. */
  markDone(id, unfinished) {
    const b = this.list.find((x) => x.id === id); if (!b) return;
    // saved in the middle of assembling: put the missing blocks in place
    if (unfinished) { const W = this.g.world; for (const [x, y, z, t] of b.cells) if (W.get(x, y, z) !== t) W.set(x, y, z, t); }
    this.finish(b, true);
  }
  finish(b, silent) { if (!this.g.S.done.includes(b.id)) this.g.S.done.push(b.id); b.done = true; b.building = false; b.holo.visible = false; b.beam.visible = false; b.card.visible = false; if (!silent) this.g.wonderDone(b); }
  /** The pad the player stands on (feet on its top), or null. */
  padUnder(pos) { for (const b of this.list) { if (b.done || b.building) continue; if (Math.abs(pos.x - (b.pad.x + 0.5)) < 1.7 && Math.abs(pos.z - (b.pad.z + 0.5)) < 1.7 && Math.abs(pos.y - (b.pad.y + 1)) < 0.6) return b; } return null; }
  missing(b) { const inv = this.g.S.inv, out = {}; for (const k in b.cost) { const lack = b.cost[k] - (inv[k] || 0); if (lack > 0) out[k] = lack; } return out; }
  affordable(b) { return Object.keys(this.missing(b)).length === 0; }
  /** Pays the cost and starts the self-assembly. */
  start(b) {
    if (b.done || b.building || !this.affordable(b)) return false;
    const inv = this.g.S.inv; for (const k in b.cost) inv[k] -= b.cost[k];
    b.building = true; b.card.visible = false; b.beam.visible = false;
    if (!this.g.S.built.includes(b.id)) this.g.S.built.push(b.id);
    const W = this.g.world;
    b.cells.forEach((c, k) => this.queue.push({ b, c, at: k * this.g.cfg.build.stagger, last: k === b.cells.length - 1 }));
    // clear anything standing in the way (trees grown on the spot, a block the player placed)
    for (const [x, y, z] of b.cells) { const cur = W.get(x, y, z); if (!cur || cur === B.PAD) continue; if (W.base[W.idx(x, y, z)] !== cur && cur !== B.WATER) this.g.addInv(cur, 1); W.set(x, y, z, B.AIR); }
    this.g.sound.whoosh(); this.g.hudDirty = true;
    return true;
  }
  update(dt, now) {
    const G = this.g, cfg = G.cfg.build;
    // launch queued blocks (staggered, capped in flight)
    for (const q of this.queue) q.at -= dt;
    while (this.queue.length && this.queue[0].at <= 0 && this.flying.length < cfg.maxFlying) {
      const q = this.queue.shift(), [x, y, z, t] = q.c;
      const m = new THREE.Mesh(blockGeo(G.tex, t, this.cache), G.world.mats.solid);
      const from = G.player.pos.clone(); from.y += 1.1;
      const to = new THREE.Vector3(x + 0.5, y + 0.5, z + 0.5);
      const mid = from.clone().lerp(to, 0.5); mid.y += 3 + from.distanceTo(to) * 0.25;
      m.position.copy(from); m.scale.setScalar(0.4); G.scene.add(m);
      this.flying.push({ q, m, from, mid, to, t: 0 });
    }
    for (let i = this.flying.length - 1; i >= 0; i--) {
      const f = this.flying[i]; f.t += dt / cfg.fly;
      const k = Math.min(1, f.t), a = (1 - k) * (1 - k), b2 = 2 * (1 - k) * k, c = k * k;
      f.m.position.set(a * f.from.x + b2 * f.mid.x + c * f.to.x, a * f.from.y + b2 * f.mid.y + c * f.to.y, a * f.from.z + b2 * f.mid.z + c * f.to.z);
      f.m.rotation.set(k * 6, k * 4, 0); f.m.scale.setScalar(0.4 + 0.6 * k);
      if (k >= 1) {
        G.scene.remove(f.m); this.flying.splice(i, 1);
        const [x, y, z, t] = f.q.c, cur = G.world.get(x, y, z);
        if (cur && cur !== t && cur !== B.WATER && G.world.base[G.world.idx(x, y, z)] !== cur) G.addInv(cur, 1);
        G.world.set(x, y, z, t);
        if (Math.random() < 0.35) G.vfx.sparkles(x + 0.5, y + 0.5, z + 0.5, 0xf5c84a, 4, 2);
        G.harpN = (G.harpN || 0) + 1; if (G.harpN % 2 === 0) G.sound.harp(Math.floor(G.harpN / 2) % 13);
        if (f.q.last) this.finish(f.q.b);
      }
    }
    // holograms pulse; the next wonder's beacon is brightest; cost cards redraw when the inventory changes
    const next = this.next();
    for (const b of this.list) {
      if (b.done) continue;
      this.holoMat.opacity = 0.09 + Math.sin(now * 3) * 0.03;
      const pd = Math.hypot(G.player.pos.x - b.pad.x - 0.5, G.player.pos.z - b.pad.z - 0.5);
      b.beam.material.opacity = ((b === next ? 0.14 : 0.05) + Math.sin(now * 2) * 0.02) * smooth(3, 12, pd);
      b.card.position.y = b.pad.y + 4.2 + Math.sin(now * 2) * 0.15;
      const miss = this.missing(b), key = JSON.stringify(miss);
      if (key !== b.key) { b.key = key; this.drawCard(b, miss); }
    }
  }
  next() { return this.list.find((b) => !b.done) || null; }
  drawCard(b, miss) {
    const x = b.cv.getContext('2d'), inv = this.g.S.inv, keys = Object.keys(b.cost);
    x.clearRect(0, 0, 512, 160);
    x.fillStyle = 'rgba(40,24,90,0.78)'; x.strokeStyle = '#ffffff'; x.lineWidth = 6;
    x.beginPath(); x.roundRect(4, 4, 504, 152, 34); x.fill(); x.stroke();
    const w = 496 / keys.length;
    keys.forEach((k, i) => {
      const cx = 8 + w * i + w / 2, have = Math.min(inv[k] || 0, b.cost[k]), ok = !miss[k];
      x.drawImage(this.g.tex.icon(+k), cx - 56, 20, 64, 64);
      x.font = '900 40px "Baloo 2", system-ui, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
      x.lineWidth = 8; x.strokeStyle = '#2a1650'; x.fillStyle = ok ? '#8dff8a' : '#ffffff';
      const s = ok ? '✓' : `${have}/${b.cost[k]}`;
      x.strokeText(s, cx + 6, 118); x.fillText(s, cx + 6, 118);
      if (ok) { x.fillStyle = '#8dff8a'; x.beginPath(); x.arc(cx + 22, 30, 14, 0, TAU); x.fill(); }
    });
    b.ct.needsUpdate = true;
  }
  dispose() {
    for (const b of this.list) { this.g.scene.remove(b.holo, b.beam, b.card); b.holo.dispose(); b.beam.geometry.dispose(); b.beam.material.dispose(); b.ct.dispose(); b.card.material.dispose(); }
    for (const f of this.flying) this.g.scene.remove(f.m);
    for (const k in this.cache) this.cache[k].dispose();
    this.holoMat.dispose(); this.boxGeo.dispose();
  }
}

// ---------------------------------------------------------------- PlayerController
const TOOL_LOOK = [
  { head: 0xc98a4b, edge: 0xe8b273, glow: false },
  { head: 0x5ff3ff, edge: 0xe6ffff, glow: true },
  { head: 0xffd23f, edge: 0xfff3a0, glow: true },
  { head: 0xff5d7a, edge: 0xffffff, glow: true, rainbow: true },
];
/** First-person body: box collision against the voxel grid, coyote time, jump buffer, auto-step over one-block
 *  ledges, bouncy clouds, swimming; plus the viewmodel (voxel arm + pickaxe drawn in its own pass so it never
 *  clips into walls) with idle sway, walk bob and swing anticipation / follow-through. */
class PlayerController {
  constructor(game) {
    this.g = game; this.c = game.cfg.player;
    this.pos = new THREE.Vector3(); this.vel = new THREE.Vector3();
    this.yaw = 0; this.pitch = -0.15; this.onGround = false; this.tGround = 0; this.jumpBuf = 0; this.stepOff = 0;
    this.walk = 0; this.inWater = false; this.landT = 0;
    this.calm = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.hw = 0.3; this.Hh = 1.75;
    // viewmodel
    this.vmScene = new THREE.Scene();
    this.vmCam = new THREE.PerspectiveCamera(55, 1, 0.01, 10);
    this.vmScene.add(new THREE.HemisphereLight(0xfff4e0, 0x8a7aa8, 1.6));
    const d = new THREE.DirectionalLight(0xffffff, 1.6); d.position.set(1, 2, 1.5); this.vmScene.add(d);
    this.vmLights = this.vmScene.children.slice();
    this.vm = new THREE.Group(); this.vmScene.add(this.vm);
    this.mats = {};
    this.arm = boxes([[0.15, 0.15, 0.56, 0, 0, 0.16, 0x5aa9ff], [0.165, 0.165, 0.08, 0, 0, -0.12, 0x3d86e0], [0.13, 0.14, 0.13, 0, 0, -0.21, 0xffcf9e]], this.mats);
    this.vm.add(this.arm);
    this.tool = null; this.setTier(0);
    this.swing = 0; this.swingOn = false; this.swingOnce = 0; this.hitPulse = 0;
  }
  /** Builds the pickaxe of a tier: handle + curved head of blocks (cosmic = shifting rainbow). */
  setTier(t) {
    if (this.tool) { this.vm.remove(this.tool); this.tool.traverse((o) => { if (o.material && o.material.userData.own) o.material.dispose(); }); }
    const L = TOOL_LOOK[t], g = new THREE.Group();
    const handle = boxes([[0.05, 0.56, 0.05, 0, 0.16, 0, t === 3 ? 0xffffff : 0x8a5a32], [0.06, 0.06, 0.06, 0, -0.1, 0, t === 3 ? 0xff9bf0 : 0x6b4424]], this.mats); g.add(handle);
    const head = new THREE.Group();
    this.rainbow = [];
    for (let i = 0; i < 5; i++) {
      const x = (i - 2) * 0.1, col = L.rainbow ? [0xff5d7a, 0xffa94d, 0xffe066, 0x5fc9ff, 0x9b7bff][i] : i === 0 || i === 4 ? L.edge : L.head;
      const mat = new THREE.MeshLambertMaterial({ color: col, emissive: L.glow ? col : 0, emissiveIntensity: L.glow ? (L.rainbow ? 0.3 : 0.5) : 0 }); mat.userData.own = true;
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.105, i === 2 ? 0.1 : 0.08, 0.08), mat); m.position.set(x, -x * x * 3.2, 0); m.rotation.z = -x * 2.2; head.add(m);
      if (L.rainbow) this.rainbow.push(mat);
    }
    if (t === 2) { const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.06), new THREE.MeshBasicMaterial({ color: 0xffffff })); star.material.userData.own = true; star.position.set(0, 0.08, 0); head.add(star); }
    head.position.set(0, 0.44, 0); g.add(head);
    g.position.set(0, 0, -0.21); g.rotation.set(-0.55, 0, 0.3);
    this.tool = g; this.vm.add(g); this.tier = t;
  }
  forward2() { return { x: -Math.sin(this.yaw), z: -Math.cos(this.yaw) }; }
  eye() { return new THREE.Vector3(this.pos.x, this.pos.y + this.c.eye - this.stepOff, this.pos.z); }
  hits(x, y, z) { return this.g.world.boxHits(x - this.hw, y, z - this.hw, this.hw * 2, this.Hh); }
  /** True if the block cell overlaps the player's body (placing there is refused). */
  overlaps(x, y, z) { const p = this.pos; return x + 1 > p.x - this.hw && x < p.x + this.hw && z + 1 > p.z - this.hw && z < p.z + this.hw && y + 1 > p.y && y < p.y + this.Hh; }
  spawnAt(x, z) {
    const W = this.g.world, fx = Math.floor(x), fz = Math.floor(z);
    let gy = W.groundY(fx, fz);
    // the column was dug out to the void: a fluffy cloud catches the player instead of an endless fall
    if (gy < 0) { gy = this.g.cfg.islands[0].y; W.set(fx, gy, fz, B.CLOUD); }
    this.pos.set(x, gy + 1, z); this.vel.set(0, 0, 0); this.stepOff = 0;
    for (let k = 0; k < 8 && this.hits(this.pos.x, this.pos.y, this.pos.z); k++) this.pos.y += 1;
  }
  update(dt, input) {
    const c = this.c, W = this.g.world, p = this.pos, v = this.vel;
    // wish direction in world space
    const f = this.forward2(), rx = -f.z, rz = f.x;
    let mx = f.x * input.fwd + rx * input.side, mz = f.z * input.fwd + rz * input.side;
    const ml = Math.hypot(mx, mz); if (ml > 1) { mx /= ml; mz /= ml; }
    const feet = W.get(Math.floor(p.x), Math.floor(p.y + 0.2), Math.floor(p.z)), head = W.get(Math.floor(p.x), Math.floor(p.y + 1.2), Math.floor(p.z));
    this.inWater = feet === B.WATER || head === B.WATER;
    const sp = c.speed * (this.inWater ? 0.6 : 1), acc = this.onGround ? c.accel : c.airAccel;
    v.x = lerp(v.x, mx * sp, damp(acc, dt)); v.z = lerp(v.z, mz * sp, damp(acc, dt));
    // jump: buffered press + coyote time
    if (input.jumpPressed) this.jumpBuf = c.jumpBuffer;
    this.jumpBuf -= dt; this.tGround += dt;
    if (this.inWater) { v.y -= c.gravity * 0.3 * dt; v.y = Math.max(v.y, -3); if (input.jump) v.y = Math.min(v.y + 20 * dt, 3.4); }
    else {
      v.y -= c.gravity * dt; v.y = Math.max(v.y, -40);
      if (this.jumpBuf > 0 && this.tGround <= c.coyote) { v.y = c.jump; this.jumpBuf = 0; this.tGround = 1; this.onGround = false; }
    }
    // move with sub-steps, y first then x and z (with auto-step)
    const n = Math.max(1, Math.ceil(Math.max(Math.abs(v.x), Math.abs(v.y), Math.abs(v.z)) * dt / 0.3));
    const wasGround = this.onGround; this.onGround = false;
    let landV = 0;
    for (let s = 0; s < n; s++) {
      const dy = v.y * dt / n;
      p.y += dy;
      if (this.hits(p.x, p.y, p.z)) {
        if (dy < 0) { p.y = Math.floor(p.y) + 1; landV = Math.max(landV, -v.y); this.onGround = true; this.tGround = 0; v.y = 0; }
        else { p.y = Math.floor(p.y + this.Hh) - this.Hh - 1e-4; v.y = Math.min(0, v.y); }
      }
      this.axis('x', v.x * dt / n);
      this.axis('z', v.z * dt / n);
    }
    if (!this.onGround && v.y <= 0 && this.hits(p.x, p.y - 0.05, p.z)) { this.onGround = true; this.tGround = 0; }
    // landing: clouds bounce, other ground thumps softly
    if (this.onGround && !wasGround && landV > 0) {
      const under = W.get(Math.floor(p.x), Math.floor(p.y - 0.5), Math.floor(p.z));
      if (under === B.CLOUD && landV > 4) { v.y = clamp(Math.max(c.cloudBounce, landV * 0.85), c.cloudBounce, 17); this.onGround = false; this.tGround = 1; this.g.onBounce(p); }
      else if (landV > 6) { this.landT = Math.min(0.25, landV * 0.02); this.g.sound.step(); }
    }
    this.stepOff *= 1 - damp(12, dt);
    // walk bob + footsteps
    const hs = Math.hypot(v.x, v.z);
    if (this.onGround && hs > 0.8) { const before = Math.floor(this.walk / Math.PI); this.walk += dt * hs * 2.1; if (Math.floor(this.walk / Math.PI) !== before) this.g.sound.step(); }
    this.landT = Math.max(0, this.landT - dt);
    if (p.y < this.g.cfg.world.voidY) this.g.respawn();
  }
  /** Moves along one horizontal axis; a blocked move first tries to step up one block. */
  axis(a, d) {
    if (!d) return;
    const p = this.pos; p[a] += d;
    if (!this.hits(p.x, p.y, p.z)) return;
    if ((this.onGround || this.tGround < 0.1) && this.vel.y <= 0.5 && !this.inWater) {
      const up = Math.floor(p.y + 1e-3) + 1;
      if (up - p.y <= 1.05 && !this.hits(p.x, up, p.z)) { this.stepOff += up - p.y; p.y = up; return; }
    }
    if (d > 0) p[a] = Math.floor(p[a] + this.hw) - this.hw - 1e-4; else p[a] = Math.floor(p[a] - this.hw) + 1 + this.hw + 1e-4;
    this.vel[a] = 0;
  }
  /** Camera follows the eye; bob, landing dip and micro shake are added here. */
  applyCamera(cam, trauma, now) {
    const e = this.eye(), hs = Math.hypot(this.vel.x, this.vel.z), bob = this.onGround ? Math.sin(this.walk * 2) * 0.045 * clamp(hs / 4, 0, 1) : 0;
    const sk = this.calm ? 0 : trauma * trauma * 0.12;
    cam.position.set(e.x + Math.sin(now * 15.3) * sk * 0.5, e.y + bob - this.landT * 0.4 + Math.sin(now * 17.9 + 1) * sk * 0.5, e.z + Math.sin(now * 13.1 + 2) * sk * 0.5);
    cam.rotation.set(this.pitch + Math.sin(now * 12.7) * sk * 0.15, this.yaw + Math.sin(now * 14.3 + 3) * sk * 0.15, 0, 'YXZ');
  }
  /** Swing: wind-up (raise), fast strike, follow-through; idle breathing + walk sway otherwise. */
  animate(dt, now, mining, rate) {
    if (mining) { this.swing += dt * rate; }
    else if (this.swingOnce > 0) { this.swing += dt * 4.2; this.swingOnce -= dt * 4.2; }
    else if (this.swing % 1 > 0.001) this.swing = Math.min(Math.ceil(this.swing), this.swing + dt * 4);
    const ph = this.swing % 1;
    // 0–0.35 anticipation (back), 0.35–0.55 strike, 0.55–1 recover
    const k = ph < 0.35 ? -smooth(0, 0.35, ph) * 0.6 : ph < 0.55 ? lerp(-0.6, 1.05, smooth(0.35, 0.55, ph)) : lerp(1.05, 0, smooth(0.55, 1, ph));
    const hs = Math.hypot(this.vel.x, this.vel.z), walk = this.onGround ? clamp(hs / 4, 0, 1) : 0;
    const breathe = Math.sin(now * 1.8) * 0.012, sway = Math.sin(this.walk) * 0.05 * walk, bob = Math.abs(Math.cos(this.walk)) * 0.04 * walk;
    const aspect = this.vmCam.aspect, x = aspect < 1 ? 0.25 : 0.5;
    this.vm.position.set(x + sway, -0.4 + breathe - bob - this.landT * 0.3, -0.62);
    this.vm.rotation.set(-k * 0.8 - 0.1, 0.3 - k * 0.12, -0.05 + k * 0.08);
    this.hitPulse = Math.max(0, this.hitPulse - dt * 6);
    const s = 0.8 * (1 + this.hitPulse * 0.08); this.vm.scale.set(s, s, s);
    if (this.rainbow.length) this.rainbow.forEach((m, i) => { m.color.setHSL((now * 0.4 + i * 0.15) % 1, 1, 0.5); m.emissive.copy(m.color); });
    return ph;
  }
  dispose() { this.vm.traverse((o) => { if (o.geometry && o.geometry !== this.mats.__box) o.geometry.dispose(); if (o.material && o.material.userData.own) o.material.dispose(); }); for (const k in this.mats) this.mats[k].dispose(); }
}

// ---------------------------------------------------------------- Sky
const SKY_KEYS = [
  // [sun elevation, top colour, horizon colour]
  [-1.0, 0x0a1236, 0x241f5c], [-0.22, 0x0c1438, 0x2b2a6a], [-0.04, 0x3b3f8f, 0xff8f9a],
  [0.1, 0x6a84e8, 0xeaa978], [0.3, 0x58a6ee, 0xe3bfd8], [1.0, 0x4a9ae8, 0xa9d3f0],
];
/** Sky dome gradient, sun and voxel moon on their orbit, stars, drifting puffy clouds, the ocean far below,
 *  and the sun/moon light (one shadow-casting directional light that follows the player). */
class Sky {
  constructor(scene, tex) {
    this.scene = scene;
    this.top = new THREE.Color(); this.hor = new THREE.Color(); this.ca = new THREE.Color(); this.cb = new THREE.Color();
    this.dome = new THREE.Mesh(new THREE.SphereGeometry(390, 32, 16), new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false,
      uniforms: { top: { value: this.top }, hor: { value: this.hor }, sun: { value: new THREE.Vector3(0, 1, 0) }, glow: { value: 1 } },
      vertexShader: 'varying vec3 vD; void main(){ vD = normalize(position); vec4 p = projectionMatrix * modelViewMatrix * vec4(position,1.0); gl_Position = p.xyww; }',
      fragmentShader: 'uniform vec3 top; uniform vec3 hor; uniform vec3 sun; uniform float glow; varying vec3 vD; void main(){ float h = clamp(vD.y, -1.0, 1.0); vec3 c = mix(hor, top, smoothstep(-0.05, 0.55, h)); c = mix(c, hor * 0.85, smoothstep(0.0, -0.4, h)); float s = max(0.0, dot(normalize(vD), sun)); c += vec3(1.0, 0.8, 0.55) * pow(s, 24.0) * 0.18 * glow + vec3(1.0, 0.7, 0.5) * pow(s, 4.0) * 0.06 * glow; gl_FragColor = vec4(c, 1.0);\n#include <colorspace_fragment>\n}',
    }));
    this.dome.renderOrder = -10; this.dome.frustumCulled = false; scene.add(this.dome);
    // stars
    const N = 500, sp = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) { const a = Math.random() * TAU, z = Math.random() * 0.95 + 0.05, r = Math.sqrt(1 - z * z); sp[i * 3] = Math.cos(a) * r * 360; sp[i * 3 + 1] = z * 360; sp[i * 3 + 2] = Math.sin(a) * r * 360; }
    const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(sp, 3));
    this.starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 2.2, sizeAttenuation: false, transparent: true, opacity: 0, depthWrite: false, fog: false });
    this.stars = new THREE.Points(sg, this.starMat); this.stars.frustumCulled = false; this.stars.renderOrder = -9; scene.add(this.stars);
    // sun + voxel moon
    this.sun = new THREE.Mesh(new THREE.BoxGeometry(18, 18, 18), new THREE.MeshBasicMaterial({ color: 0xf2c25a, fog: false }));
    this.moon = new THREE.Group();
    const mm = new THREE.MeshBasicMaterial({ color: 0xc9d0ee, fog: false }), cm = new THREE.MeshBasicMaterial({ color: 0x9aa3cf, fog: false });
    this.moonMats = [mm, cm];
    this.moon.add(new THREE.Mesh(new THREE.BoxGeometry(14, 14, 14), mm));
    for (const [x, y, s] of [[-3, 3, 3], [3, -2, 4], [2, 4, 2]]) { const c = new THREE.Mesh(new THREE.BoxGeometry(s, s, 1), cm); c.position.set(x, y, 7.1); this.moon.add(c); }
    for (const o of [this.sun, this.moon]) { o.renderOrder = -8; scene.add(o); }
    // clouds: one instanced mesh of puffy box clusters, drifting and wrapping
    const cg = new THREE.BoxGeometry(1, 1, 1);
    this.cloudMat = new THREE.MeshLambertMaterial({ color: 0xeef2fb, emissive: 0xeef2fb, emissiveIntensity: 0.08, transparent: true, opacity: 0.9 });
    const puffs = [], r = mulberry(77);
    for (let c = 0; c < 16; c++) {
      const cx = (r() - 0.5) * 300, cz = (r() - 0.5) * 300, cy = 74 + r() * 26, s = 5 + r() * 5;
      for (let k = 0; k < 6; k++) puffs.push([cx + (r() - 0.5) * s * 2.4, cy + (r() - 0.3) * s * 0.6, cz + (r() - 0.5) * s * 1.6, s * (0.8 + r() * 0.8), s * (0.5 + r() * 0.4), s * (0.8 + r() * 0.7)]);
    }
    this.puffs = puffs;
    this.clouds = new THREE.InstancedMesh(cg, this.cloudMat, puffs.length); this.clouds.frustumCulled = false; scene.add(this.clouds);
    this.cm = new THREE.Matrix4(); this.drift = 0;
    // ocean far below
    this.oceanTex = new THREE.CanvasTexture(tex.waterCanvas); this.oceanTex.wrapS = this.oceanTex.wrapT = THREE.RepeatWrapping;
    this.oceanTex.magFilter = THREE.NearestFilter; this.oceanTex.repeat.set(220, 220); this.oceanTex.colorSpace = THREE.SRGBColorSpace;
    this.ocean = new THREE.Mesh(new THREE.PlaneGeometry(1600, 1600), new THREE.MeshLambertMaterial({ map: this.oceanTex, color: 0x86c6ec, emissive: 0x1a6aa8, emissiveIntensity: 0.15 }));
    this.ocean.rotation.x = -Math.PI / 2; this.ocean.position.y = -26; scene.add(this.ocean);
    // lights
    this.hemi = new THREE.HemisphereLight(0xbfe3ff, 0xb8d98a, 1.5); scene.add(this.hemi);
    this.dir = new THREE.DirectionalLight(0xfff1d6, 2.4);
    this.dir.castShadow = true; const sc = this.dir.shadow.camera; sc.left = -34; sc.right = 34; sc.top = 34; sc.bottom = -34; sc.near = 1; sc.far = 220;
    this.dir.shadow.bias = -0.0006; this.dir.shadow.normalBias = 0.04; this.dir.shadow.mapSize.set(2048, 2048);
    scene.add(this.dir); scene.add(this.dir.target);
    this.sunDir = new THREE.Vector3(); this.ld = new THREE.Vector3();
  }
  colorAt(e, out, which) {
    let i = 0; while (i < SKY_KEYS.length - 2 && e > SKY_KEYS[i + 1][0]) i++;
    const a = SKY_KEYS[i], b = SKY_KEYS[i + 1], t = clamp((e - a[0]) / (b[0] - a[0]), 0, 1);
    this.ca.setHex(a[which]); this.cb.setHex(b[which]); return out.copy(this.ca).lerp(this.cb, t);
  }
  /** Moves everything for a day phase (0..1); returns how night-ish (0..1) and golden it is. */
  update(phase, cam, focus, dt, fog) {
    const ang = phase * TAU, e = Math.sin(ang);
    this.sunDir.set(Math.cos(ang) * 0.82, e, 0.38).normalize();
    this.colorAt(e, this.top, 1); this.colorAt(e, this.hor, 2);
    const night = smooth(0.05, -0.2, e), golden = smooth(0.32, 0.12, e) * smooth(-0.08, 0.06, e);
    this.dome.position.copy(cam); this.stars.position.copy(cam);
    this.dome.material.uniforms.sun.value.copy(this.sunDir); this.dome.material.uniforms.glow.value = 1 - night;
    this.sun.position.copy(cam).addScaledVector(this.sunDir, 300); this.sun.lookAt(cam);
    this.moon.position.copy(cam).addScaledVector(this.sunDir, -300); this.moon.lookAt(cam);
    this.sun.material.color.setHex(golden > 0.3 ? 0xe89a4a : 0xf2c25a);
    this.starMat.opacity = night * 0.95; this.stars.rotation.y += dt * 0.004;
    fog.color.copy(this.hor);
    // light: sun by day, a soft blue moon by night
    const sunUp = smooth(-0.06, 0.2, e), moonUp = smooth(-0.02, -0.2, e);
    const ld = this.ld.copy(this.sunDir); if (sunUp <= 0.01) ld.negate();
    this.dir.position.copy(focus).addScaledVector(ld, 90); this.dir.target.position.copy(focus);
    this.dir.intensity = (2.25 * sunUp + 0.55 * moonUp) * (this.sunScale || 1);
    this.dir.color.setHex(golden > 0.25 ? 0xffc890 : sunUp > 0.01 ? 0xfff1d6 : 0x9fb4ff);
    this.hemi.intensity = lerp(1.4, 0.55, night);
    this.hemi.color.setHex(night > 0.5 ? 0x7d8cd8 : golden > 0.3 ? 0xffd6b0 : 0xbfe3ff);
    this.hemi.groundColor.setHex(night > 0.5 ? 0x3a3a6a : 0xb8d98a);
    // clouds drift and wrap around the camera; tinted by the sky
    this.drift += dt * 1.6;
    this.puffs.forEach(([x, y, z, sx, sy, sz], i) => {
      let px = ((x + this.drift - cam.x + 160) % 320 + 320) % 320 - 160 + cam.x;
      this.cm.makeScale(sx, sy, sz); this.cm.setPosition(px, y, z); this.clouds.setMatrixAt(i, this.cm);
    });
    this.clouds.instanceMatrix.needsUpdate = true;
    this.cloudMat.color.copy(this.hor).lerp(this.cb.setHex(0xe8eef8), 0.45); this.cloudMat.emissive.copy(this.cloudMat.color); this.cloudMat.emissiveIntensity = lerp(0.08, 0.03, night);
    this.ocean.position.x = cam.x; this.ocean.position.z = cam.z; this.oceanTex.offset.set(cam.x / 1600 * 220 + this.drift * 0.004, -cam.z / 1600 * 220);
    this.ocean.material.emissiveIntensity = lerp(0.15, 0.08, night);
    return { night, golden, e };
  }
  dispose() {
    for (const o of [this.dome, this.stars, this.sun, this.clouds, this.ocean]) { o.geometry.dispose(); o.material.dispose(); }
    this.moon.traverse((o) => { if (o.geometry) o.geometry.dispose(); }); this.moonMats.forEach((m) => m.dispose());
    this.oceanTex.dispose(); this.dir.dispose();
  }
}

// ---------------------------------------------------------------- GameApp
const SVG = {
  sound: '<svg viewBox="0 0 64 64"><path d="M10 24h10l14-12v40L20 40H10z" fill="#fff"/><path d="M42 22c5 5 5 15 0 20M48 16c9 9 9 23 0 32" stroke="#fff" stroke-width="5" fill="none" stroke-linecap="round"/></svg>',
  mute: '<svg viewBox="0 0 64 64"><path d="M10 24h10l14-12v40L20 40H10z" fill="#fff"/><path d="M42 24l16 16M58 24L42 40" stroke="#ff6b8a" stroke-width="5" stroke-linecap="round"/></svg>',
  music: '<svg viewBox="0 0 64 64"><path d="M24 46V14l28-6v32" stroke="#fff" stroke-width="5" fill="none" stroke-linejoin="round"/><ellipse cx="18" cy="46" rx="8" ry="6" fill="#fff"/><ellipse cx="46" cy="40" rx="8" ry="6" fill="#fff"/></svg>',
  nomusic: '<svg viewBox="0 0 64 64" opacity=".55"><path d="M24 46V14l28-6v32" stroke="#fff" stroke-width="5" fill="none"/><ellipse cx="18" cy="46" rx="8" ry="6" fill="#fff"/><ellipse cx="46" cy="40" rx="8" ry="6" fill="#fff"/><path d="M8 8l48 48" stroke="#ff6b8a" stroke-width="5" stroke-linecap="round"/></svg>',
  home: '<svg viewBox="0 0 64 64"><path d="M8 32L32 10l24 22" stroke="#fff" stroke-width="6" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M16 30v24h12V40h8v14h12V30" fill="#fff"/><path d="M48 6l2 5 5 1-4 3 1 5-4-3-4 3 1-5-4-3 5-1z" fill="#ffe066"/></svg>',
  globe: '<svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="25" fill="none" stroke="#fff" stroke-width="5"/><path d="M7 32h50M32 7c-10 12-10 38 0 50M32 7c10 12 10 38 0 50" stroke="#fff" stroke-width="4" fill="none"/></svg>',
  paw: '<svg viewBox="0 0 64 64"><ellipse cx="32" cy="42" rx="14" ry="12" fill="#ffb3d1"/><circle cx="14" cy="28" r="6.5" fill="#ffb3d1"/><circle cx="24" cy="17" r="6.5" fill="#ffb3d1"/><circle cx="40" cy="17" r="6.5" fill="#ffb3d1"/><circle cx="50" cy="28" r="6.5" fill="#ffb3d1"/></svg>',
  jump: '<svg viewBox="0 0 64 64"><path d="M32 8L12 32h12v22h16V32h12z" fill="#fff"/></svg>',
  pick: '<svg viewBox="0 0 64 64"><path d="M10 22C22 8 42 8 54 22L48 26C40 18 24 18 16 26z" fill="#9fe8ff" stroke="#fff" stroke-width="3"/><path d="M30 20l6 0 -4 38h-6z" fill="#c98a4b" stroke="#fff" stroke-width="3"/></svg>',
  brick: '<svg viewBox="0 0 64 64"><path d="M32 6l24 12v28L32 58 8 46V18z" fill="#ffb3d1" stroke="#fff" stroke-width="4" stroke-linejoin="round"/><path d="M8 18l24 12 24-12M32 30v28" stroke="#fff" stroke-width="4" fill="none"/></svg>',
  hand: '<svg viewBox="0 0 64 64"><path d="M26 6c3 0 5 2 5 5v18l3-1c3 0 5 2 5 4l3-1c3 0 4 2 4 4l3-1c3 0 4 2 4 5v12c0 7-6 13-14 13h-6c-5 0-9-3-12-7L10 42c-2-3 0-6 3-6 2 0 4 1 5 3l3 4V11c0-3 2-5 5-5z" fill="#fff" stroke="#3a2160" stroke-width="3.5" stroke-linejoin="round"/></svg>',
};

/** Owns the renderer, scene, every system, the HUD, input, save and the frame loop. */
class GameApp {
  constructor(root, cfg, mode) {
    this.root = root; this.cfg = cfg; this.mode = mode; this.alive = true;
    this.now = 0; this.demo = true; this.started = false; this.loaded = false; this.trauma = 0;
    this.lang = detectLang(navigator.languages || [navigator.language]);
    this.touch = (() => { try { return !!lib.shouldUseTouchControls(); } catch (e) { return matchMedia('(pointer: coarse)').matches; } })();
    this.S = { v: 1, inv: { [B.PLANK]: 6 }, bar: [B.PLANK, 0, 0, 0, 0, 0, 0, 0, 0], sel: 0, gauge: 0, built: [], pets: [], ore: 0, edits: [], pos: null, yaw: 0, muted: false, music: true, lang: '', phase: cfg.day.start, mined: 0, learned: 0, petLvl: 0, done: [] };
    this.listeners = [];
    this.buildDom();
    // renderer
    const R = this.renderer = new THREE.WebGLRenderer({ canvas: this.cv, antialias: !this.touch, powerPreference: 'high-performance' });
    R.outputColorSpace = THREE.SRGBColorSpace; R.toneMapping = THREE.ACESFilmicToneMapping; R.toneMappingExposure = 0.92;
    R.shadowMap.enabled = true; R.shadowMap.type = THREE.PCFShadowMap; R.shadowMap.autoUpdate = false; R.autoClear = false;
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0xd8f0ff, 0.0075);
    this.camera = new THREE.PerspectiveCamera(70, 1, 0.08, 420); this.camera.rotation.order = 'YXZ';
    // textures
    const tex = this.tex = new TextureFactory(cfg.world.seed);
    const mk = (c, rep) => { const t = new THREE.CanvasTexture(c); t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; t.colorSpace = THREE.SRGBColorSpace; if (rep) t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; };
    this.atlas = mk(tex.canvas); this.glowTex = mk(tex.glowCanvas); this.waterTex = mk(tex.waterCanvas, true); this.crackTex = mk(tex.crackCanvas);
    this.crackTex.repeat.set(1 / 6, 1);
    // world
    const W = this.world = new VoxelWorld(cfg); W.generate();
    W.mats = {
      solid: new THREE.MeshLambertMaterial({ map: this.atlas, emissiveMap: this.glowTex, emissive: 0xffffff, emissiveIntensity: 0.4, vertexColors: true, alphaTest: 0.5 }),
      water: new THREE.MeshLambertMaterial({ map: this.waterTex, transparent: true, opacity: 0.8, depthWrite: false, color: 0xcdeeff }),
    };
    this.chunks = new Map();
    for (let cy = 0; cy < W.CY; cy++) for (let cz = 0; cz < W.CZ; cz++) for (let cx = 0; cx < W.CX; cx++) this.buildChunk(cx, cy, cz);
    W.dirty.clear();
    W.listeners.push((i, x, y, z, t) => this.onCell(i, x, y, z, t));
    // systems
    this.sky = new Sky(this.scene, tex);
    this.sound = new SoundEngine();
    this.vfx = new VFXSystem(this.scene, tex, this.atlas, W);
    this.player = new PlayerController(this);
    this.pets = new PetManager(this);
    this.blueprints = new BlueprintSystem(this);
    this.makeFlowers(); this.makeCursor();
    this.pops = []; this.popCache = {};
    const sp = cfg.world.spawn; this.player.spawnAt(sp[0], sp[2]); this.player.yaw = 0.35;
    this.input = { fwd: 0, side: 0, jump: false, jumpPressed: false, mine: false };
    this.keys = new Set(); this.placeMode = false; this.tapMine = 0; this.mineKey = -1; this.mineP = 0; this.hitT = 0;
    this.phase = cfg.day.start; this.saveT = cfg.save.every; this.hudDirty = true; this.dpr = 1;
    this.perf = { tier: this.touch ? 1 : 0, acc: 0, n: 0, t: 0, warm: 0 };
    this.applyTier();
    this.bindInput();
    this.onResize = () => this.fit(); window.addEventListener('resize', this.onResize);
    this.onVis = () => { this.sound.pause(document.hidden); if (document.hidden) this.flushSave(); }; document.addEventListener('visibilitychange', this.onVis);
    this.fit(); this.texts(); this.refreshHud();
    try { R.compile(this.scene, this.camera); } catch (e) { /* compiled on first draw */ }
    if (mode === 'edit') { this.hud.classList.add('edit'); } else this.loadSave(0);
    this.showParams();
    this.last = performance.now();
    const loop = (t) => { if (!this.alive) return; this.raf = requestAnimationFrame(loop); const dt = Math.min(0.05, Math.max(0, (t - this.last) / 1000)); this.last = t; this.frame(dt); };
    this.raf = requestAnimationFrame(loop);
    window.__started = true;
    // dev:start
    window.__liveGames = (window.__liveGames || 0) + 1;
    // dev:end
  }
  T(k) { const s = this.cfg.strings; return (s[this.lang] && s[this.lang][k]) || s.en[k] || k; }

  // ---------------- DOM
  buildDom() {
    const r = this.root;
    r.innerHTML = `<canvas id="cv"></canvas>
<div class="hud">
  <div class="tl"><div class="toolbox glass"><canvas class="ticon" width="64" height="64"></canvas><div class="gauge"><div class="fill"></div></div></div>
    <div class="petbox glass">${SVG.paw}<span class="pn">0/3</span></div></div>
  <div class="tr"><button class="hb b-sound glass" aria-label="sound"></button><button class="hb b-music glass" aria-label="music"></button><button class="hb b-home glass" aria-label="home">${SVG.home}</button><button class="hb b-lang glass" aria-label="language">${SVG.globe}</button></div>
  <div class="goal"><div class="garrow"><svg viewBox="0 0 64 64"><path d="M32 6L56 50 32 40 8 50z" fill="#ffe066" stroke="#3a2160" stroke-width="5" stroke-linejoin="round"/></svg></div></div>
  <div class="cross"></div>
  <div class="toast out"></div>
  <div class="hint"><div class="hhand">${SVG.hand}</div><div class="htext out"></div></div>
  <button class="bbuild" hidden><span class="bt"></span><span class="bcost"></span></button>
  <div class="hotbar glass"></div>
  <div class="touch" hidden><div class="stick"><div class="knob"></div></div><button class="tb b-jump glass" aria-label="jump">${SVG.jump}</button><button class="tb b-mode glass" aria-label="mode"></button></div>
  <div class="title"><div class="logo out"><div class="l1"></div><div class="l2"></div></div><button class="play"><span></span></button></div>
  <div class="fade"></div>
</div>`;
    this.cv = r.querySelector('#cv'); this.hud = r.querySelector('.hud');
    const q = (s) => r.querySelector(s);
    this.el = { ticon: q('.ticon'), fill: q('.gauge .fill'), pn: q('.pn'), petbox: q('.petbox'), sound: q('.b-sound'), music: q('.b-music'), home: q('.b-home'), langB: q('.b-lang'), goal: q('.goal'), garrow: q('.garrow'), toast: q('.toast'), hint: q('.hint'), htext: q('.htext'), build: q('.bbuild'), bt: q('.bbuild .bt'), bcost: q('.bcost'), hotbar: q('.hotbar'), touch: q('.touch'), stick: q('.stick'), knob: q('.knob'), jumpB: q('.b-jump'), modeB: q('.b-mode'), title: q('.title'), play: q('.play'), l1: q('.l1'), l2: q('.l2'), fade: q('.fade'), cross: q('.cross'), toolbox: q('.toolbox') };
    this.slots = [];
    for (let i = 0; i < 9; i++) {
      const s = document.createElement('button'); s.className = 'slot'; s.innerHTML = '<canvas width="64" height="64"></canvas><span class="cnt"></span><span class="key">' + (i + 1) + '</span>';
      this.el.hotbar.appendChild(s); this.slots.push({ el: s, cv: s.firstChild, cnt: s.children[1], t: -1 });
    }
  }
  texts() {
    const e = this.el, rtl = this.lang === 'ar';
    this.hud.dir = rtl ? 'rtl' : 'ltr';
    e.l1.textContent = this.T('title'); e.l2.textContent = this.T('sub'); e.play.firstChild.textContent = this.T('play'); e.bt.textContent = this.T('build');
    e.sound.innerHTML = this.S.muted ? SVG.mute : SVG.sound; e.music.innerHTML = this.S.music ? SVG.music : SVG.nomusic;
    e.modeB.innerHTML = this.placeMode ? SVG.brick : SVG.pick; e.modeB.classList.toggle('on', this.placeMode);
  }
  // ---------------- chunks
  buildChunk(cx, cy, cz) {
    const W = this.world, key = cx + W.CX * (cz + W.CZ * cy), old = this.chunks.get(key);
    if (old) { for (const m of old) { this.scene.remove(m); m.geometry.dispose(); } this.chunks.delete(key); }
    const { o, w } = W.meshChunk(cx, cy, cz, this.tex), list = [];
    const mesh = (d, mat, colors) => {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(d.p, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(d.n, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(d.u, 2));
      if (colors) g.setAttribute('color', new THREE.Float32BufferAttribute(d.c, 3));
      g.setIndex(d.p.length / 3 > 65535 ? new THREE.Uint32BufferAttribute(d.i, 1) : new THREE.Uint16BufferAttribute(d.i, 1));
      g.computeBoundingSphere();
      const m = new THREE.Mesh(g, mat); m.matrixAutoUpdate = false; this.scene.add(m); list.push(m); return m;
    };
    if (o.i.length) { const m = mesh(o, W.mats.solid, true); m.castShadow = true; m.receiveShadow = true; }
    if (w.i.length) { const m = mesh(w, W.mats.water, false); m.receiveShadow = true; m.renderOrder = 2; }
    if (list.length) this.chunks.set(key, list);
  }
  remesh(max) {
    const W = this.world; if (!W.dirty.size) return;
    const p = this.player.pos, arr = [...W.dirty].map((k) => { const cx = k % W.CX, r = (k - cx) / W.CX, cz = r % W.CZ, cy = (r - cz) / W.CZ; return [k, cx, cy, cz, Math.hypot(cx * CH + 8 - p.x, cy * CH + 8 - p.y, cz * CH + 8 - p.z)]; }).sort((a, b) => a[4] - b[4]);
    for (let i = 0; i < Math.min(max, arr.length); i++) { const [k, cx, cy, cz] = arr[i]; W.dirty.delete(k); this.buildChunk(cx, cy, cz); }
  }
  onCell(i, x, y, z, t) {
    const f = this.flowerAt.get(i);
    if (f !== undefined && (this.flowerList[f].ground === i ? t === B.AIR : t !== B.AIR)) this.hideFlower(f);
  }
  makeFlowers() {
    const spots = this.world.flowerSpots, n = spots.length;
    const stemG = new THREE.BoxGeometry(0.07, 0.36, 0.07); stemG.translate(0, 0.18, 0);
    const headG = new THREE.BoxGeometry(0.24, 0.1, 0.24); headG.translate(0, 0.4, 0);
    this.flowerTime = { value: 0 };
    const sway = (m) => { m.onBeforeCompile = (s) => { s.uniforms.uTime = this.flowerTime; s.vertexShader = 'uniform float uTime;\n' + s.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvec4 ip = instanceMatrix[3]; transformed.x += sin(uTime * 2.2 + ip.x * 0.7 + ip.z * 0.5) * 0.09 * position.y; transformed.z += cos(uTime * 1.7 + ip.x * 0.4) * 0.05 * position.y;'); }; return m; };
    this.stems = new THREE.InstancedMesh(stemG, sway(new THREE.MeshLambertMaterial({ color: 0x3f9e3c })), n);
    this.heads = new THREE.InstancedMesh(headG, sway(new THREE.MeshLambertMaterial({ color: 0xffffff, emissive: 0x332233, emissiveIntensity: 0.4 })), n);
    const cols = [0xff8fc8, 0xffe066, 0xffffff, 0xb48cff], m = new THREE.Matrix4(), c = new THREE.Color();
    this.flowerAt = new Map(); this.flowerList = [];
    spots.forEach(([x, y, z, k], i) => {
      m.makeTranslation(x + 0.3 + (i % 3) * 0.2, y + 1, z + 0.3 + ((i >> 1) % 3) * 0.2); this.stems.setMatrixAt(i, m); this.heads.setMatrixAt(i, m);
      this.heads.setColorAt(i, c.setHex(cols[k]));
      const g = this.world.idx(x, y, z), a = this.world.idx(x, y + 1, z);
      this.flowerAt.set(g, i); this.flowerAt.set(a, i); this.flowerList.push({ ground: g });
    });
    for (const o of [this.stems, this.heads]) { o.castShadow = false; o.frustumCulled = false; this.scene.add(o); }
  }
  hideFlower(i) { const m = new THREE.Matrix4().makeScale(0, 0, 0); this.stems.setMatrixAt(i, m); this.heads.setMatrixAt(i, m); this.stems.instanceMatrix.needsUpdate = true; this.heads.instanceMatrix.needsUpdate = true; }
  makeCursor() {
    const box = new THREE.BoxGeometry(1.006, 1.006, 1.006);
    this.hl = new THREE.LineSegments(new THREE.EdgesGeometry(box), new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, fog: false }));
    this.hl.visible = false; this.hl.renderOrder = 4; this.scene.add(this.hl);
    this.ghost = new THREE.Mesh(box, new THREE.MeshBasicMaterial({ color: 0x8dff8a, transparent: true, opacity: 0.18, depthWrite: false, fog: false }));
    this.ghost.visible = false; this.scene.add(this.ghost);
    this.crack = new THREE.Mesh(new THREE.BoxGeometry(1.012, 1.012, 1.012), new THREE.MeshBasicMaterial({ map: this.crackTex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, fog: false }));
    this.crack.visible = false; this.scene.add(this.crack);
    this.boxGeo = box;
  }

  // ---------------- input
  on(el, ev, fn, o) { el.addEventListener(ev, fn, o); this.listeners.push([el, ev, fn, o]); }
  /** Button helper: fires on click and on a second finger's pointerdown→pointerup (no click comes then). */
  tap(el, fn) {
    let id = null;
    this.on(el, 'pointerdown', (e) => { id = e.pointerId; if (!e.isPrimary) e.preventDefault(); });
    this.on(el, 'pointerup', (e) => { if (e.pointerId === id && !e.isPrimary) { id = null; fn(e); } });
    this.on(el, 'click', (e) => { fn(e); });
  }
  bindInput() {
    const E = this.el, cv = this.cv;
    this.on(this.root, 'contextmenu', (e) => e.preventDefault());
    // start: a tap anywhere over the live title starts play (and counts as the first action)
    this.on(this.root, 'pointerdown', (e) => {
      if (this.mode !== 'play') return;
      if (e.pointerType === 'touch' && !this.touch) { this.touch = true; this.refreshHud(); }
      this.sound.unlock();
      if (!this.started) { this.start(e); }
    }, true);
    this.tap(E.sound, () => { this.S.muted = !this.S.muted; this.sound.setMuted(this.S.muted); this.texts(); this.saveDue(); });
    this.tap(E.music, () => { this.S.music = !this.S.music; this.sound.setMusic(this.S.music); this.texts(); this.saveDue(); });
    this.tap(E.home, () => this.respawn());
    this.tap(E.langB, () => { this.lang = LANGS[(LANGS.indexOf(this.lang) + 1) % LANGS.length]; this.S.lang = this.lang; this.texts(); this.saveDue(); this.toast(this.cfg.langNames[this.lang]); });
    this.tap(E.build, () => this.tryBuild());
    this.tap(E.modeB, () => { this.placeMode = !this.placeMode; this.texts(); });
    this.slots.forEach((s, i) => this.tap(s.el, () => this.select(i)));
    // jump button: held
    this.on(E.jumpB, 'pointerdown', (e) => { e.preventDefault(); this.touchJump = true; this.input.jumpPressed = true; });
    for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) this.on(E.jumpB, ev, () => { this.touchJump = false; });
    // keyboard
    this.on(window, 'keydown', (e) => {
      if (!this.started || this.mode !== 'play') return;
      if (e.code === 'Space') { e.preventDefault(); if (!e.repeat) this.input.jumpPressed = true; }
      this.keys.add(e.code);
      if (e.repeat) return;
      if (/^Digit[1-9]$/.test(e.code)) this.select(+e.code.slice(5) - 1);
      if (e.code === 'KeyE' || e.code === 'KeyF') this.placeOrBuild(null);
    });
    this.on(window, 'keyup', (e) => this.keys.delete(e.code));
    this.on(window, 'blur', () => { this.keys.clear(); this.mouseMine = false; });
    this.on(cv, 'wheel', (e) => { if (!this.started) return; e.preventDefault(); const d = e.deltaY > 0 ? 1 : -1; this.select((this.S.sel + d + 9) % 9); }, { passive: false });
    // mouse with pointer lock (desktop)
    this.on(document, 'pointerlockchange', () => { this.locked = document.pointerLockElement === cv; if (this.locked) { this.dragLook = false; this.ptrs.clear(); this.refreshHud(); } else this.mouseMine = false; });
    this.on(document, 'pointerlockerror', () => { this.dragLook = true; this.refreshHud(); });
    this.on(cv, 'mousedown', (e) => {
      if (!this.started || this.touch) return;
      if (!this.locked && (!this.dragLook || this.now - (this.lockTry || -9) > 3)) { this.lockTry = this.now; this.lock(); if (!this.dragLook) return; }
      if (!this.locked) return;
      if (e.button === 0) this.mouseMine = true;
      if (e.button === 2) this.placeOrBuild(null);
    });
    this.on(window, 'mouseup', (e) => { if (e.button === 0) this.mouseMine = false; });
    this.on(document, 'mousemove', (e) => {
      if (!this.locked) return;
      const k = this.cfg.player.lookSpeed; this.look(e.movementX * k, e.movementY * k);
    });
    // touch / drag-look: stick on the lower left, drag elsewhere to look, hold on a block to mine, tap to act
    this.ptrs = new Map();
    this.on(cv, 'pointerdown', (e) => {
      if (!this.started || (!this.touch && !this.dragLook)) return;
      const r = this.root.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
      if (this.touch && !this.stick && x < r.width * 0.45 && y > r.height * 0.5) { this.stick = { id: e.pointerId, x0: x, y0: y, x, y }; this.placeStick(); return; }
      if (e.pointerType === 'mouse' && e.button === 2) { this.placeOrBuild(this.ndc(x, y)); return; }
      if ([...this.ptrs.values()].some((p) => p.look)) return;
      this.ptrs.set(e.pointerId, { look: true, x0: x, y0: y, x, y, t0: this.now, drag: false });
      try { cv.setPointerCapture(e.pointerId); } catch (er) { /* fine */ }
    });
    this.on(cv, 'pointermove', (e) => {
      const r = this.root.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
      if (this.stick && this.stick.id === e.pointerId) { this.stick.x = x; this.stick.y = y; this.placeStick(); return; }
      const p = this.ptrs.get(e.pointerId); if (!p) return;
      if (!p.drag && Math.hypot(x - p.x0, y - p.y0) > 14 * (r.width / 720)) p.drag = true;
      if (p.drag) { const k = this.cfg.player.touchLook * (720 / r.width); this.look((x - p.x) * k, (y - p.y) * k); }
      p.x = x; p.y = y;
    });
    const up = (e) => {
      if (this.stick && this.stick.id === e.pointerId) { this.stick = null; this.placeStick(); return; }
      const p = this.ptrs.get(e.pointerId); if (!p) return;
      this.ptrs.delete(e.pointerId);
      if (e.type === 'pointercancel' || p.drag) return;
      if (this.now - p.t0 < 0.3) {
        const ndc = this.ndc(p.x, p.y);
        if (this.placeMode) this.placeOrBuild(ndc); else { this.tapMine = 0.45; this.tapNdc = ndc; this.player.swingOnce = 1; }
      }
    };
    this.on(cv, 'pointerup', up); this.on(cv, 'pointercancel', up);
  }
  lock() { try { const p = this.cv.requestPointerLock(); if (p && p.catch) p.catch(() => { this.dragLook = true; this.refreshHud(); }); } catch (e) { this.dragLook = true; this.refreshHud(); } }
  look(dx, dy) { const P = this.player; P.yaw -= dx; P.pitch = clamp(P.pitch - dy, -1.5, 1.5); }
  ndc(x, y) { const r = this.root.getBoundingClientRect(); return [(x / r.width) * 2 - 1, -(y / r.height) * 2 + 1]; }
  placeStick() {
    const s = this.stick, E = this.el, u = this.u;
    if (!s) { E.stick.classList.remove('on'); E.knob.style.translate = '0px 0px'; this.input.stickX = 0; this.input.stickY = 0; return; }
    const R = 80 * u, dx = s.x - s.x0, dy = s.y - s.y0, l = Math.hypot(dx, dy), k = l > R ? R / l : 1;
    E.stick.classList.add('on');
    E.stick.style.left = (s.x0 - 110 * u) + 'px'; E.stick.style.top = (s.y0 - 110 * u) + 'px'; E.stick.style.bottom = 'auto';
    E.knob.style.translate = `${dx * k}px ${dy * k}px`;
    this.input.stickX = (dx * k) / R; this.input.stickY = (dy * k) / R;
  }
  select(i) { this.S.sel = i; this.hudDirty = true; this.sound.tone(880, 0.05, { gain: 0.06, type: 'triangle' }); }
  selType() { const t = this.S.bar[this.S.sel]; return t && (this.S.inv[t] || 0) > 0 ? t : 0; }
  /** Aim ray: screen centre (crosshair) or a touch point in normalized device coordinates. */
  aim(ndc) {
    const c = this.camera, d = new THREE.Vector3();
    if (ndc) d.set(ndc[0], ndc[1], 0.5).unproject(c).sub(c.position).normalize(); else c.getWorldDirection(d);
    return this.world.raycast(c.position.x, c.position.y, c.position.z, d.x, d.y, d.z, this.cfg.player.reach + (ndc ? 1 : 0));
  }

  // ---------------- flow
  start(e) {
    this.started = true; this.demo = false;
    this.el.title.classList.add('gone');
    this.flash(0.35);
    this.sound.unlock(); this.sound.setMuted(this.S.muted); this.sound.setMusic(this.S.music);
    if (!this.touch && e && e.pointerType === 'mouse') this.lock();
    this.refreshHud();
    this.hint(this.T('mine'));
  }
  frame(dt) {
    this.now += dt;
    this.phase = (this.phase + dt / this.cfg.day.length) % 1;
    const P = this.player, cam = this.camera;
    if (this.demo || this.mode === 'edit') {
      const a = this.now * 0.08 + 0.6, c = [62, 34, 56];
      cam.position.set(c[0] + Math.sin(a) * 66, c[1] + 18 + Math.sin(this.now * 0.3) * 3, c[2] + Math.cos(a) * 66);
      cam.lookAt(c[0], c[1] - 2, c[2]);
    } else {
      this.gather(dt);
      P.update(dt, this.input);
      this.input.jumpPressed = false;
      P.applyCamera(cam, this.trauma, this.now);
      this.act(dt);
      this.blueprints.update(dt, this.now);
      this.padCheck();
      this.saveT -= dt; if (this.saveT <= 0) { this.saveT = this.cfg.save.every; this.flushSave(); }
    }
    this.trauma = Math.max(0, this.trauma - dt * 2.2);
    const focus = this.demo ? (this.demoFocus || (this.demoFocus = new THREE.Vector3(62, 32, 56))) : P.pos;
    const L = this.sky.update(this.phase, cam.position, focus, dt, this.scene.fog);
    this.night = L.night;
    this.world.mats.solid.emissiveIntensity = lerp(0.32, 1.0, L.night);
    this.scene.fog.density = lerp(0.0072, 0.0095, L.night);
    if (L.night > 0.75 && !this.saidNight && this.started) { this.saidNight = true; this.toast(this.T('night')); }
    if (L.night < 0.2) this.saidNight = false;
    this.waterTex.offset.set(this.now * 0.05, Math.sin(this.now * 0.6) * 0.08);
    this.flowerTime.value = this.now;
    this.pets.update(dt, this.now);
    this.vfx.update(dt, this.now, cam.position, L.night);
    this.updatePops(dt);
    this.remesh(this.demo ? 1 : 3);
    if (this.started && this.S.music) this.sound.tickMusic(L.night > 0.5);
    if (this.hudDirty) this.refreshHud();
    this.updateGoal();
    // render: world, then the viewmodel on a fresh depth buffer so the tool never clips into blocks
    const R = this.renderer;
    this.frameN = (this.frameN || 0) + 1;
    if (R.shadowMap.enabled) R.shadowMap.needsUpdate = this.frameN % (this.perf.tier + 2) === 0;
    R.clear(); R.render(this.scene, cam);
    if (this.started && !this.demo) {
      P.animate(dt, this.now, this.mining, this.miningRate || 4);
      R.clearDepth(); R.render(P.vmScene, P.vmCam);
    }
    this.perfTick(dt);
  }
  gather(dt) {
    const k = this.keys, I = this.input;
    let f = (k.has('KeyW') || k.has('ArrowUp') ? 1 : 0) - (k.has('KeyS') || k.has('ArrowDown') ? 1 : 0);
    let s = (k.has('KeyD') || k.has('ArrowRight') ? 1 : 0) - (k.has('KeyA') || k.has('ArrowLeft') ? 1 : 0);
    if (I.stickX || I.stickY) { f = -I.stickY; s = I.stickX; }
    I.fwd = f; I.side = s; I.jump = k.has('Space') || !!this.touchJump;
  }
  /** Mining (hold), tap-mining, highlight and the crack overlay. */
  act(dt) {
    const P = this.player;
    this.tapMine = Math.max(0, this.tapMine - dt);
    let ndc = null, want = false;
    if (this.locked) want = this.mouseMine;
    else if (this.touch || this.dragLook) {
      const hold = [...this.ptrs.values()].find((p) => p.look && !p.drag && this.now - p.t0 > 0.18);
      if (hold && !this.placeMode) { want = true; ndc = this.ndc(hold.x, hold.y); }
      else if (this.tapMine > 0) { want = true; ndc = this.tapNdc; }
    }
    const hit = this.aim(ndc), show = ndc ? hit || this.aim(null) : hit;
    this.target = show;
    if (show) {
      this.hl.visible = true; this.hl.position.set(show.x + 0.5, show.y + 0.5, show.z + 0.5);
      this.hl.material.opacity = 0.55 + Math.sin(this.now * 8) * 0.35;
      this.hl.material.color.setHex(show.type === B.PAD ? 0x8ff0ff : 0xffffff);
      const gx = show.x + show.nx, gy = show.y + show.ny, gz = show.z + show.nz, t = this.selType();
      const can = t && show.type !== B.PAD && !solidT(this.world.get(gx, gy, gz)) && !P.overlaps(gx, gy, gz);
      this.ghost.visible = !!can && (!this.touch || this.placeMode); this.ghost.position.set(gx + 0.5, gy + 0.5, gz + 0.5);
    } else { this.hl.visible = false; this.ghost.visible = false; }
    this.mining = false;
    if (want && hit && hit.type === B.PAD) { if (!this.padPress) { this.padPress = true; this.tryBuild(this.blueprints.list.find((b) => !b.done && b.pad.y === hit.y && Math.abs(b.pad.x - hit.x) <= 1 && Math.abs(b.pad.z - hit.z) <= 1)); } }
    else if (!want) this.padPress = false;
    if (want && hit && hit.type !== B.PAD) {
      const i = this.world.idx(hit.x, hit.y, hit.z);
      if (i !== this.mineKey) { this.mineKey = i; this.mineP = 0; this.hitT = 0; }
      const tool = this.cfg.tools[this.tier()], hard = this.cfg.mining.hard[hit.type] ?? 0.5, dur = Math.max(0.06, hard / tool.speed);
      this.mineP += dt / dur; this.mining = true; this.miningRate = clamp(1 / Math.max(0.2, Math.min(dur, this.cfg.mining.hitEvery * 1.6)), 2.5, 5);
      this.hitT -= dt;
      if (this.hitT <= 0) {
        this.hitT = this.cfg.mining.hitEvery; this.sound.hit(BLOCKS[hit.type].snd); P.hitPulse = 1; this.trauma = Math.min(0.3, this.trauma + 0.04);
        const c = this.tex.color(hit.type); this.vfx.sparkles(hit.x + 0.5 + hit.nx * 0.55, hit.y + 0.5 + hit.ny * 0.55, hit.z + 0.5 + hit.nz * 0.55, new THREE.Color(c[0], c[1], c[2]).getHex(), 5, 2.2, 0.1);
      }
      if (this.mineP >= 1) { this.mineCell(hit.x, hit.y, hit.z, { face: hit }); this.mineP = 0; this.mineKey = -1; this.tapMine = 0; }
    } else { this.mineP = Math.max(0, this.mineP - dt * 2); if (this.mineP === 0) this.mineKey = -1; }
    if (this.mineP > 0 && this.mineKey >= 0) {
      const [x, y, z] = this.world.xyz(this.mineKey);
      this.crack.visible = true; this.crack.position.set(x + 0.5, y + 0.5, z + 0.5); this.crackTex.offset.x = Math.min(5, Math.floor(this.mineP * 6)) / 6;
    } else this.crack.visible = false;
  }
  tier() { const g = this.S.gauge, T = this.cfg.tools; let t = 0; for (let i = 0; i < T.length; i++) if (g >= T[i].at) t = i; return t; }
  /** Breaks a block and pays for it: shards, +N popup, combo note, tool gauge, eggs, splash for big tools. */
  mineCell(x, y, z, o = {}) {
    const W = this.world, t = W.get(x, y, z);
    if (!t || t === B.PAD || t === B.WATER) return false;
    const placed = W.base[W.idx(x, y, z)] !== t;
    W.set(x, y, z, B.AIR);
    this.vfx.shatter(x, y, z, t, o.splash ? 0.7 : 1);
    const n = placed ? 1 : this.cfg.mining.yield[t] || 1;
    this.addInv(t, n);
    this.vfx.popup(x + 0.5, y + 1.1, z + 0.5, '+' + n, t);
    if (!o.splash) this.sound.harvest(this.now, BLOCKS[t].snd, this.cfg.mining.comboReset);
    const before = this.tier();
    if (!placed) this.S.gauge += this.cfg.mining.gaugePts[t] || 1; this.S.mined++;
    if (this.tier() !== before) this.toolUp(this.tier());
    if (!o.splash) this.trauma = Math.max(this.trauma, Math.min(0.3, this.trauma + 0.1));
    if (isOre(t)) { this.vfx.sparkles(x + 0.5, y + 0.5, z + 0.5, t === B.CRYORE ? 0x6ff3ff : 0xffe066, 18, 3); if (!o.byPet && !placed) this.eggRoll(x, y, z); }
    if (!o.byPet && !o.splash) {
      if (!(this.S.learned & 1)) { this.S.learned |= 1; this.hint(null); setTimeout(() => { if (this.alive && !this.blueprints.list[0].done) this.hint(this.T('find'), 5); }, 6000); }
      const tool = this.cfg.tools[this.tier()];
      if (tool.splash && o.face) {
        const { nx, ny, nz } = o.face, ax = nx ? 0 : ny ? 1 : 2, [t0, t1] = [0, 1, 2].filter((k) => k !== ax);
        for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) {
          if (!a && !b) continue;
          const off = [0, 0, 0]; off[t0] = a; off[t1] = b;
          const X = x + off[0], Y = y + off[1], Z = z + off[2], tt = W.get(X, Y, Z);
          if (tt && tt !== B.PAD && tt !== B.WATER && tt !== B.LANTERN) this.mineCell(X, Y, Z, { splash: true });
        }
      }
      if (tool.shock && this.now - (this.lastShock || -9) > 1.0 && !this.vfx.ringT) { this.lastShock = this.now; this.vfx.shock(x + 0.5, y + 0.6, z + 0.5); this.vfx.sparkles(x + 0.5, y + 0.5, z + 0.5, 0xff9bf0, 20, 5); }
    }
    if (o.byPet) this.sound.harvest(this.now, BLOCKS[t].snd, this.cfg.mining.comboReset);
    buzz('light'); this.hudDirty = true; this.saveDue();
    return true;
  }
  addInv(t, n) {
    const S = this.S; S.inv[t] = (S.inv[t] || 0) + n;
    if (!S.bar.includes(t)) {
      let i = S.bar.indexOf(0);
      if (i < 0) i = S.bar.findIndex((b, k) => k !== S.sel && !(S.inv[b] > 0));
      if (i >= 0) { S.bar[i] = t; if (!this.selType()) S.sel = i; }
    } else if (!this.selType()) S.sel = S.bar.indexOf(t);
    this.hudDirty = true;
  }
  eggRoll(x, y, z) {
    const E = this.cfg.eggs; this.S.ore++;
    if (this.pets.eggs.length) return;
    if (this.S.ore >= E.pity || Math.random() < E.chance) { this.S.ore = 0; this.pets.egg(x, y, z); this.toast(this.T('egg')); }
  }
  hatch(pos) {
    const S = this.S, all = this.cfg.pets.species, left = all.filter((k) => !S.pets.includes(k));
    this.sound.hatch(); this.vfx.fireworks(pos.x, pos.y, pos.z, 3); this.vfx.confetti(pos.x, pos.y + 0.5, pos.z, 110); this.flash(0.15);
    if (!left.length) { this.pets.powerUp(); S.petLvl = 1; const before = this.tier(); S.gauge += 10; if (this.tier() !== before) this.toolUp(this.tier()); this.toast(this.T('petUp')); }
    else { const k = left[Math.floor(Math.random() * left.length)]; S.pets.push(k); this.pets.add(k, pos); this.toast(this.T('p_' + k)); }
    buzz('success'); this.hudDirty = true; this.saveDue(); this.flushSave();
  }
  toolUp(t) {
    this.player.setTier(t); this.sound.fanfare(); this.drawToolIcon();
    const p = this.player.pos; this.vfx.confetti(p.x, p.y + 1.6, p.z, 140); this.vfx.shock(p.x, p.y + 0.2, p.z); this.flash(0.2);
    this.toast(this.T('t_' + this.cfg.tools[t].id)); buzz('success'); this.saveDue();
  }
  placeOrBuild(ndc) {
    const b = this.blueprints.padUnder(this.player.pos);
    if (b && !ndc) { this.tryBuild(b); return; }
    const hit = this.aim(ndc); if (!hit) return;
    if (hit.type === B.PAD) { this.tryBuild(this.blueprints.list.find((q) => !q.done && Math.abs(q.pad.x - hit.x) <= 1 && Math.abs(q.pad.z - hit.z) <= 1)); return; }
    const t = this.selType();
    if (!t) { this.bumpHotbar(); return; }
    const x = hit.x + hit.nx, y = hit.y + hit.ny, z = hit.z + hit.nz, W = this.world;
    if (!W.inside(x, y, z) || solidT(W.get(x, y, z)) || this.player.overlaps(x, y, z)) return;
    const i = W.idx(x, y, z);
    W.hidden.add(i); W.set(x, y, z, t);
    this.S.inv[t]--; this.player.swingOnce = 1; this.sound.place(); this.vfx.dust(x, y, z, 0xffffff);
    const m = new THREE.Mesh(blockGeo(this.tex, t, this.popCache), W.mats.solid); m.position.set(x + 0.5, y + 0.5, z + 0.5); m.scale.setScalar(0.001); this.scene.add(m);
    this.pops.push({ m, i, t: 0, x, y, z });
    this.hudDirty = true; this.saveDue();
  }
  /** Elastic placement: scale 0 → 1.18 → 1 in 180 ms, then the block joins its chunk mesh. */
  updatePops(dt) {
    for (let k = this.pops.length - 1; k >= 0; k--) {
      const p = this.pops[k]; p.t += dt / 0.18;
      const s = p.t < 0.6 ? 1.18 * (1 - Math.pow(1 - p.t / 0.6, 3)) : 1.18 - 0.18 * smooth(0.6, 1, p.t);
      p.m.scale.setScalar(Math.max(0.001, s));
      if (p.t >= 1) { this.scene.remove(p.m); this.pops.splice(k, 1); this.world.hidden.delete(p.i); this.world.markAround(p.x, p.y, p.z); }
    }
  }
  bumpHotbar() { const h = this.el.hotbar; h.classList.remove('nope'); void h.offsetWidth; h.classList.add('nope'); this.sound.tone(180, 0.12, { gain: 0.12, type: 'triangle' }); }
  tryBuild(b) {
    if (!b) return;
    if (this.blueprints.start(b)) { this.toast('✨'); this.el.build.hidden = true; return; }
    if (!b.done && !b.building) { this.toast(this.T('need')); b.card.scale.set(5.4, 1.7, 1); setTimeout(() => b.card.scale.set(4.8, 1.5, 1), 200); this.sound.tone(200, 0.15, { gain: 0.12, type: 'triangle' }); }
  }
  padCheck() {
    const b = this.blueprints.padUnder(this.player.pos), E = this.el.build;
    const show = !!b; if (E.hidden === show) E.hidden = !show;
    if (b) {
      E.classList.toggle('ready', this.blueprints.affordable(b));
      // the cost, with what is still missing, right on the button
      const key = b.id + JSON.stringify(this.blueprints.missing(b)) + this.lang;
      if (key !== this.costKey) {
        this.costKey = key; const box = this.el.bcost; box.innerHTML = '';
        for (const k in b.cost) {
          const have = Math.min(this.S.inv[k] || 0, b.cost[k]), chip = document.createElement('span'), cv = document.createElement('canvas');
          chip.className = 'chip' + (have >= b.cost[k] ? ' ok' : ''); cv.width = cv.height = 64; cv.getContext('2d').drawImage(this.tex.icon(+k), 0, 0);
          chip.appendChild(cv); chip.appendChild(document.createTextNode(have >= b.cost[k] ? '✓' : `${have}/${b.cost[k]}`)); box.appendChild(chip);
        }
      }
    }
  }
  wonderDone(b) {
    if (!this.S.built.includes(b.id)) this.S.built.push(b.id);
    const p = b.pad, c = b.cells.reduce((a, [x, y, z]) => { a[0] += x; a[1] += y; a[2] += z; return a; }, [0, 0, 0]).map((v) => v / b.cells.length + 0.5);
    this.vfx.fireworks(c[0], c[1] + 4, c[2], 7); this.vfx.confetti(c[0], c[1] + 2, c[2], 160);
    this.sound.fanfare(); this.toast(this.T('b_' + b.id)); this.flash(0.2); buzz('success');
    const before = this.tier(); this.S.gauge += this.cfg.build.gaugeBonus; if (this.tier() !== before) this.toolUp(this.tier());
    this.pets.egg(p.x + 1, p.y + 1, p.z + 1);
    this.hudDirty = true; this.saveDue(); this.flushSave();
    try { Promise.resolve(lib.addPlayerScoreToLeaderboard(this.S.built.length * 1000 + this.S.mined)).catch(() => {}); } catch (e) { /* no board here */ }
  }
  onBounce(p) { this.sound.boing(); this.vfx.sparkles(p.x, p.y, p.z, 0xb9c8f0, 14, 3, 0.18); this.trauma = Math.min(1, this.trauma + 0.15); buzz('light'); }
  respawn() {
    if (this.now - (this.lastRespawn || -9) < 1) return;
    this.lastRespawn = this.now;
    const sp = this.cfg.world.spawn; this.player.spawnAt(sp[0], sp[2]);
    this.flash(0.5, 'sky'); this.vfx.starShower(sp[0], this.player.pos.y, sp[2]); this.sound.sparkle(); this.toast(this.T('home'));
  }

  /** Glare of the 3D picture: share of near-white pixels, share of very bright pixels, mean luminance (0..255). */
  glare() {
    const R = this.renderer, gl = R.getContext(); R.clear(); R.render(this.scene, this.camera);
    const w = gl.drawingBufferWidth, h = gl.drawingBufferHeight, px = new Uint8Array(w * h * 4);
    gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px);
    let white = 0, bright = 0, lum = 0;
    for (let i = 0; i < px.length; i += 4) { const L = 0.2126 * px[i] + 0.7152 * px[i + 1] + 0.0722 * px[i + 2]; lum += L; if (px[i] > 235 && px[i + 1] > 235 && px[i + 2] > 235) white++; if (L > 215) bright++; }
    const n = w * h; return { white: white / n, bright: bright / n, meanL: lum / n };
  }

  // ---------------- HUD
  /** Soft tinted vignette pulse for big moments (never a white full-screen flash; skipped with reduced motion). */
  flash(a, tint = 'gold') {
    const f = this.el.fade, k = Math.min(0.12, a * 0.35);
    this.flashPeak = k;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    f.dataset.tint = tint; f.style.transition = 'none'; f.style.opacity = String(k); void f.offsetWidth; f.style.transition = 'opacity .7s'; f.style.opacity = '0';
  }
  toast(s) { const t = this.el.toast; t.textContent = s; t.classList.remove('show'); void t.offsetWidth; t.classList.add('show'); clearTimeout(this.toastTo); this.toastTo = setTimeout(() => t.classList.remove('show'), 1900); }
  hint(s, secs) { clearTimeout(this.hintTo); const h = this.el.hint; if (!s) { h.classList.remove('show'); return; } this.el.htext.textContent = s; h.classList.add('show'); if (secs) this.hintTo = setTimeout(() => h.classList.remove('show'), secs * 1000); }
  drawToolIcon() {
    const x = this.el.ticon.getContext('2d'), t = this.tier(), L = TOOL_LOOK[t];
    x.clearRect(0, 0, 64, 64);
    x.save(); x.translate(32, 34); x.rotate(-0.7);
    x.fillStyle = '#8a5a32'; x.fillRect(-4, -6, 8, 34);
    const cols = L.rainbow ? ['#ff5d7a', '#ffa94d', '#ffe066', '#5fc9ff', '#9b7bff'] : null;
    for (let i = 0; i < 5; i++) { x.fillStyle = cols ? cols[i] : '#' + (i === 0 || i === 4 ? L.edge : L.head).toString(16).padStart(6, '0'); const a = (i - 2) * 0.42; x.fillRect(Math.sin(a) * 22 - 5, -14 - Math.cos(a) * 6 + 6 - 5, 10, 10); }
    x.restore();
  }
  refreshHud() {
    this.hudDirty = false;
    const S = this.S, E = this.el, T = this.cfg.tools, t = this.tier();
    const lo = T[t].at, hi = T[t + 1] ? T[t + 1].at : lo + 1, k = T[t + 1] ? clamp((S.gauge - lo) / (hi - lo), 0, 1) : 1;
    E.fill.style.transform = `scaleX(${k})`; E.toolbox.classList.toggle('max', !T[t + 1]);
    if (this.drawnTier !== t) { this.drawnTier = t; this.drawToolIcon(); }
    E.pn.textContent = `${Math.min(S.pets.length, this.cfg.pets.maxActive)}/${this.cfg.pets.maxActive}`;
    this.slots.forEach((s, i) => {
      const ty = S.bar[i], n = ty ? S.inv[ty] || 0 : 0;
      if (s.t !== ty) { s.t = ty; const x = s.cv.getContext('2d'); x.clearRect(0, 0, 64, 64); if (ty) x.drawImage(this.tex.icon(ty), 0, 0); }
      s.cnt.textContent = ty ? String(n) : ''; s.el.classList.toggle('sel', i === S.sel); s.el.classList.toggle('empty', !ty || n <= 0);
    });
    const play = this.started && !this.demo;
    E.touch.hidden = !(play && this.touch);
    this.hud.classList.toggle('playing', play);
    this.hud.classList.toggle('touchui', this.touch || !!this.dragLook);
  }
  updateGoal() {
    const b = this.blueprints.next(), g = this.el.goal;
    if (!b || !this.started || this.demo) { g.classList.remove('show'); return; }
    const P = this.player.pos, dx = b.pad.x + 0.5 - P.x, dz = b.pad.z + 0.5 - P.z, d = Math.hypot(dx, dz);
    g.classList.toggle('show', d > 4);
    const ang = Math.atan2(dx, dz) - Math.atan2(-Math.sin(this.player.yaw), -Math.cos(this.player.yaw));
    this.el.garrow.style.rotate = `${-ang}rad`;
  }
  fit() {
    const r = this.root.getBoundingClientRect(), w = Math.max(1, r.width), h = Math.max(1, r.height);
    this.u = Math.min(w / 720, h / 720, 1.6) || 1; this.root.style.setProperty('--u', String(this.u));
    this.renderer.setPixelRatio(this.dpr); this.renderer.setSize(w, h, false);
    const a = w / h; this.camera.aspect = a;
    this.camera.fov = clamp((2 * Math.atan(Math.tan((78 * Math.PI) / 360) / a) * 180) / Math.PI, 66, 96);
    this.camera.updateProjectionMatrix();
    const vm = this.player.vmCam; vm.aspect = a; vm.fov = a < 1 ? 70 : 55; vm.updateProjectionMatrix();
    this.vfx.pMat.uniforms.scale.value = h * this.dpr * 0.5;
  }
  applyTier() {
    const t = this.perf.tier, dev = Math.min(window.devicePixelRatio || 1, 2);
    this.dpr = [Math.min(dev, 1.75), Math.min(dev, 1.25), Math.min(dev, 0.85)][t];
    const sm = [2048, 1024, 0][t];
    this.renderer.shadowMap.needsUpdate = true;
    this.sky.dir.castShadow = sm > 0; this.renderer.shadowMap.enabled = sm > 0;
    if (sm && this.sky.dir.shadow.mapSize.x !== sm) { this.sky.dir.shadow.mapSize.set(sm, sm); if (this.sky.dir.shadow.map) { this.sky.dir.shadow.map.dispose(); this.sky.dir.shadow.map = null; } }
    this.vfx.half = t >= 2;
    this.sky.sunScale = sm ? 1 : 0.85;
    if (this.root.isConnected) this.fit();
  }
  /** Steps quality down when the frame rate stays low (after a warm-up), and once back up if it recovers. */
  perfTick(dt) {
    const p = this.perf; p.warm += dt; if (p.warm < 4) return;
    p.acc += dt; p.n++;
    if (p.acc >= 2) {
      const fps = p.n / p.acc; p.acc = 0; p.n = 0;
      if (fps < 42 && p.tier < 2) { p.tier++; this.applyTier(); p.up = 0; }
      else if (fps > 58 && p.tier > (this.touch ? 1 : 0) && !p.raised) { p.up = (p.up || 0) + 1; if (p.up >= 5) { p.tier--; p.raised = true; this.applyTier(); } }
    }
  }

  // ---------------- save
  saveDue() { this.dirtySave = true; }
  snapshot() {
    const S = this.S, P = this.player;
    S.edits = this.world.exportEdits(); S.pos = [+P.pos.x.toFixed(2), +P.pos.y.toFixed(2), +P.pos.z.toFixed(2)]; S.yaw = +P.yaw.toFixed(3); S.phase = +this.phase.toFixed(4);
    return JSON.parse(JSON.stringify(S));
  }
  flushSave() {
    if (!this.loaded || this.mode !== 'play' || !this.started) return;
    this.dirtySave = false;
    const snap = this.snapshot();
    lastWrite = lastWrite.then(() => lib.saveUserGameState(snap)).catch(() => {});
  }
  loadSave(tries) {
    const read = () => Promise.race([Promise.resolve().then(() => lib.getUserGameState()), new Promise((res, rej) => setTimeout(() => rej(new Error('save read timed out')), 8000))]);
    lastWrite.then(read).then((r) => {
      if (!this.alive) return;
      const st = r && r.state;
      if (st && typeof st === 'object' && st.v === 1) this.applySave(st);
      this.loaded = true;
    }).catch(() => { if (this.alive) setTimeout(() => this.loadSave(tries + 1), Math.min(8000, 600 * (tries + 1))); });
  }
  /** Merges a saved state in (also when it arrives after play started: counts add up, nothing is lost). */
  applySave(st) {
    const S = this.S, num = (v, d) => (typeof v === 'number' && isFinite(v) ? v : d);
    const late = this.started;
    if (!late) S.inv = {};
    if (st.inv && typeof st.inv === 'object') for (const k in st.inv) { const n = Math.max(0, Math.floor(num(st.inv[k], 0))); if (/^\d+$/.test(k) && BLOCKS[+k] && +k !== B.PAD && n) S.inv[k] = Math.min(99999, (S.inv[k] || 0) + n); }
    if (Array.isArray(st.bar) && st.bar.length === 9 && !late) S.bar = st.bar.map((t) => (Number.isInteger(t) && BLOCKS[t] && t !== B.PAD ? t : 0));
    S.sel = clamp(Math.floor(num(st.sel, 0)), 0, 8);
    S.gauge = Math.max(S.gauge, clamp(Math.floor(num(st.gauge, 0)), 0, 1e6));
    S.mined = Math.max(S.mined, Math.floor(num(st.mined, 0))); S.ore = Math.floor(clamp(num(st.ore, 0), 0, 99)); S.learned |= Math.floor(num(st.learned, 0)) & 255;
    if (st.petLvl === 1) { S.petLvl = 1; this.pets.powerUp(); }
    for (const k of ['muted', 'music']) if (typeof st[k] === 'boolean') S[k] = st[k];
    if (typeof st.lang === 'string' && LANGS.includes(st.lang)) { S.lang = st.lang; this.lang = st.lang; }
    this.world.importEdits(st.edits);
    const fin = Array.isArray(st.done) ? st.done : st.built || [];
    if (Array.isArray(st.built)) for (const id of st.built) if (this.cfg.blueprints.some((b) => b.id === id) && !S.built.includes(id)) { S.built.push(id); this.blueprints.markDone(id, !fin.includes(id)); }
    if (Array.isArray(st.pets)) for (const k of st.pets) if (this.cfg.pets.species.includes(k) && !S.pets.includes(k)) S.pets.push(k);
    const P = this.player;
    for (const k of S.pets.slice(-this.cfg.pets.maxActive)) if (!this.pets.pets.some((p) => p.kind === k)) this.pets.add(k, P.pos.clone().add(new THREE.Vector3(1, 0.5, 1)), true);
    if (!late) {
      if (Array.isArray(st.pos) && st.pos.length === 3 && st.pos.every((v) => typeof v === 'number' && isFinite(v)) && st.pos[1] > this.cfg.world.voidY + 2) {
        P.pos.set(clamp(st.pos[0], 1, this.world.W - 2), clamp(st.pos[1], 1, this.world.H - 2), clamp(st.pos[2], 1, this.world.D - 2));
        for (let k = 0; k < 10 && P.hits(P.pos.x, P.pos.y, P.pos.z); k++) P.pos.y += 1;
      }
      P.yaw = num(st.yaw, P.yaw); this.phase = clamp(num(st.phase, this.phase), 0, 1);
    }
    const t = this.tier(); if (t !== P.tier) P.setTier(t);
    this.sound.setMuted(S.muted); this.sound.setMusic(S.music);
    this.texts(); this.hudDirty = true;
  }
  showParams() {
    try {
      lib.showGameParameters({ name: 'Voxel Wonderland', params: {
        'Walk speed': { key: 'player.speed', type: 'slider', min: 2, max: 9, step: 0.1 },
        'Jump power': { key: 'player.jump', type: 'slider', min: 6, max: 12, step: 0.1 },
        'Cloud bounce': { key: 'player.cloudBounce', type: 'slider', min: 8, max: 17, step: 0.5 },
        'Egg chance': { key: 'eggs.chance', type: 'slider', min: 0, max: 1, step: 0.05 },
        'Day length (s)': { key: 'day.length', type: 'slider', min: 60, max: 900, step: 10 },
      } });
    } catch (e) { /* host without parameters */ }
  }
  destroy() {
    this.alive = false; this.flushSave();
    // dev:start
    window.__liveGames--;
    // dev:end
    cancelAnimationFrame(this.raf);
    for (const [el, ev, fn, o] of this.listeners) el.removeEventListener(ev, fn, o);
    window.removeEventListener('resize', this.onResize); document.removeEventListener('visibilitychange', this.onVis);
    if (document.pointerLockElement === this.cv) document.exitPointerLock();
    clearTimeout(this.toastTo); clearTimeout(this.hintTo);
    this.sound.close();
    for (const list of this.chunks.values()) for (const m of list) m.geometry.dispose();
    for (const k in this.world.mats) this.world.mats[k].dispose();
    for (const k in this.popCache) this.popCache[k].dispose();
    this.vfx.dispose(); this.sky.dispose(); this.pets.dispose(); this.blueprints.dispose(); this.player.dispose();
    for (const o of [this.stems, this.heads, this.hl, this.ghost, this.crack]) { o.geometry.dispose(); o.material.dispose(); }
    for (const t of [this.atlas, this.glowTex, this.waterTex, this.crackTex]) t.dispose();
    this.renderer.dispose(); try { this.renderer.forceContextLoss(); } catch (e) { /* already gone */ }
    this.root.innerHTML = '';
  }
}

// ---------------------------------------------------------------- run
let lastWrite = Promise.resolve();
let game = null, pendingGo = null;
/** Host entry point: run('play') or run('edit'); may be called more than once. */
function run(mode) {
  if (game) { game.destroy(); game = null; }
  const go = () => {
    if (game) { game.destroy(); game = null; }
    const root = document.getElementById('app');
    try { game = new GameApp(root, window.gameConfig, mode === 'edit' ? 'edit' : 'play'); }
    catch (e) { console.warn('start failed', e); root.innerHTML = '<div id="fail"><button aria-label="retry" onclick="location.reload()">&#8635;</button></div>'; }
    // dev:start
    window.__game = game;
    // dev:end
  };
  if (window.THREE) go(); else { window.removeEventListener('three-ready', pendingGo); pendingGo = go; window.addEventListener('three-ready', go, { once: true }); }
}
window.run = run;

// dev:start
// Outside the host (?local): stand in for it, read the config file and start.
if (typeof location !== 'undefined' && new URLSearchParams(location.search).has('local') && !window.lib) {
  const none = async () => ({});
  const store = { state: window.__preset || null };
  window.lib = { showGameParameters() {}, log() {}, getUserGameState: async () => { if (window.__saveFails) throw new Error('offline'); if (window.__holdSave) await new Promise((r) => { window.__releaseSave = r; }); return { state: store.state }; },
    saveUserGameState: async (s) => { store.state = s; (window.__writes = window.__writes || []).push(s); }, addPlayerScoreToLeaderboard: none, getTopNEntriesFromLeaderboard: none,
    shouldUseTouchControls: () => matchMedia('(pointer: coarse)').matches, haptics: { play() {}, start() {}, stop() {} } };
  fetch('./game_config.json').then((r) => r.json()).then((c) => { window.gameConfig = c; run(new URLSearchParams(location.search).get('mode') || 'play'); });
}
// dev:end
