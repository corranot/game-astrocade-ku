// PROTOTYPE - NOT FOR PRODUCTION
// Finds things drawn in nearly the colour of what is behind them. For each level (start and payoff) the
// canvas is split into same-colour regions; a region is flagged when its colour is close (CIE Lab distance)
// to a large backdrop region (the sky or the ground) it sits on. Prints observations, one line per flag.
// Usage: node contrast.js [out folder for marked screenshots] [maxDistance]
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const out = process.argv[2], maxD = +process.argv[3] || 22;
if (out) fs.mkdirSync(out, { recursive: true });
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json' };
const server = http.createServer((q, r) => {
  const f = path.join(__dirname, decodeURIComponent(q.url.split('?')[0]).replace(/^\/$/, '/index.html'));
  fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); } else { r.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' }); r.end(d); } });
});

/** Runs in the page: regions of near-equal colour, and the ones that blend into a backdrop. */
function scan(maxD) {
  const c = document.getElementById('game'), W = c.width, H = c.height, S = 4; // sample every 4 px
  const d = c.getContext('2d').getImageData(0, 0, W, H).data, w = W / S, h = H / S;
  const lab = (r, g, b) => { // sRGB to CIE Lab
    const f = (v) => { v /= 255; return v > 0.04045 ? ((v + 0.055) / 1.055) ** 2.4 : v / 12.92; };
    const R = f(r), G = f(g), B = f(b), X = (R * 0.4124 + G * 0.3576 + B * 0.1805) / 0.95047, Y = R * 0.2126 + G * 0.7152 + B * 0.0722, Z = (R * 0.0193 + G * 0.1192 + B * 0.9505) / 1.08883;
    const t = (v) => (v > 0.008856 ? Math.cbrt(v) : 7.787 * v + 16 / 116);
    return [116 * t(Y) - 16, 500 * (t(X) - t(Y)), 200 * (t(Y) - t(Z))];
  };
  const px = new Array(w * h), id = new Int32Array(w * h).fill(-1);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = (y * S * W + x * S) * 4; px[y * w + x] = [d[i], d[i + 1], d[i + 2]]; }
  const same = (a, b) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]) < 18;
  const regions = [];
  for (let s = 0; s < w * h; s++) {
    if (id[s] >= 0) continue;
    const reg = { n: 0, col: px[s], minx: 1e9, miny: 1e9, maxx: 0, maxy: 0, edge: false, near: new Map() }, st = [s]; id[s] = regions.length;
    while (st.length) {
      const k = st.pop(), x = k % w, y = (k / w) | 0; reg.n++;
      reg.minx = Math.min(reg.minx, x); reg.maxx = Math.max(reg.maxx, x); reg.miny = Math.min(reg.miny, y); reg.maxy = Math.max(reg.maxy, y);
      if (x === 0 || y === 0 || x === w - 1 || y === h - 1) reg.edge = true;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const j = ny * w + nx;
        if (id[j] < 0 && same(px[j], reg.col)) { id[j] = regions.length; st.push(j); }
      }
    }
    regions.push(reg);
  }
  // which regions touch which (through a white border of up to 4 samples)
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const a = id[y * w + x];
    for (let k = 1; k <= 4; k++) { if (x + k < w) { const b = id[y * w + x + k]; if (b !== a) { regions[a].near.set(b, 1); regions[b].near.set(a, 1); } } if (y + k < h) { const b = id[(y + k) * w + x]; if (b !== a) { regions[a].near.set(b, 1); regions[b].near.set(a, 1); } } }
  }
  const white = (c) => c[0] > 235 && c[1] > 235 && c[2] > 235;
  const backdrop = regions.map((r, i) => i).filter((i) => regions[i].n > w * h * 0.06 && !white(regions[i].col));
  const flags = [];
  regions.forEach((r, i) => {
    if (r.n < 40 || backdrop.includes(i) || white(r.col)) return; // tiny bits and the backdrops themselves
    for (const b of backdrop) {
      if (!r.near.has(b)) continue;
      const A = lab(...r.col), B = lab(...regions[b].col), dist = Math.hypot(A[0] - B[0], A[1] - B[1], A[2] - B[2]);
      if (dist < maxD) flags.push({ col: r.col, on: regions[b].col, dist: Math.round(dist), box: [r.minx * S, r.miny * S, (r.maxx + 1) * S, (r.maxy + 1) * S], area: r.n * S * S });
    }
  });
  return flags;
}

(async () => {
  await new Promise((r) => server.listen(0, r));
  const browser = await chromium.launch(), hex = (c) => '#' + c.map((v) => v.toString(16).padStart(2, '0')).join('');
  const page = await (await browser.newContext({ viewport: { width: 720, height: 1280 } })).newPage();
  await page.goto(`http://127.0.0.1:${server.address().port}/index.html?local&cfg=${encodeURIComponent('{"celebrateLater":99,"celebrateSeconds":99,"confetti":0}')}`);
  await page.waitForFunction(() => window.__game && window.__frames > 3);
  let total = 0;
  const report = async (name) => {
    const flags = await page.evaluate(scan, maxD);
    for (const f of flags) console.log(`${name}: ${hex(f.col)} on ${hex(f.on)} distance ${f.dist}, ${f.area} px at ${f.box.join(',')}`);
    total += flags.length;
    if (out && flags.length) {
      await page.evaluate((flags) => { const g = document.getElementById('game').getContext('2d'); g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.lineWidth = 6; g.strokeStyle = '#FF00FF'; for (const f of flags) g.strokeRect(f.box[0] - 4, f.box[1] - 4, f.box[2] - f.box[0] + 8, f.box[3] - f.box[1] + 8); g.restore(); }, flags);
      await page.screenshot({ path: path.join(out, name + '.png') });
    }
  };
  const n = await page.evaluate(() => window.__game.LEVELS.length);
  for (let i = 0; i < n; i++) {
    await page.evaluate((i) => { const g = window.__game; g.save.level = i; g.newLevel(i); }, i);
    await page.waitForTimeout(120); await page.evaluate(() => { window.__frames = 0; }); await page.waitForFunction(() => window.__frames > 1);
    await report(`L${i + 1}-start`);
    // solve every part with its own hidden path, then look at the scene late in its payoff
    for (let k = 0; k < 2; k++) {
      if (await page.evaluate(() => window.__game.S.won >= 0)) break;
      const t = await page.evaluate(() => window.__game.target.filter((_, j) => j % 3 === 0).concat([window.__game.target.at(-1)]));
      await page.mouse.move(t[0][0], t[0][1]); await page.mouse.down(); for (const q of t.slice(1)) await page.mouse.move(q[0], q[1], { steps: 2 }); await page.mouse.up();
      await page.waitForFunction(() => !window.__game.S.pen);
    }
    await page.waitForFunction(() => window.__game.S.won > 2.6, null, { timeout: 8000 }).catch(() => {});
    await report(`L${i + 1}-payoff`);
  }
  console.log(total ? `${total} places where a thing is close to the colour behind it (distance < ${maxD})` : 'no thing close to the colour behind it');
  await browser.close(); server.close();
})();
