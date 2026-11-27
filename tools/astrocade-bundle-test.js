// Runs a multi-file game the way Astrocade's feed does, to catch what only shows up there. The host's own code
// (captured 2026-11-22, production/market/2026-11-22-platform/) was followed:
// - esbuild bundles game.js and its imports into one classic script (format iife), and the page goes into an
//   iframe srcdoc with sandbox="allow-scripts allow-pointer-lock" (origin null: browser storage throws),
//   exactly 720x1280 CSS px scaled down with a transform; three.js still loads from the CDN;
// - lib is the web host's: share exists, device features (haptics, motion, camera, mic) report supported:false;
// - run('play') is called once; gestures are counted by touch listeners on document (bubble phase), so a game
//   that stops touch events before document plays as "no interaction" for the host.
// It then plays like a feed visitor: watches the first frames untouched, taps once with a real touch, and
// measures the frame rate from second 5 (when Astrocade starts grading it; headless SwiftShader is far slower
// than a phone, so the number only compares runs).
// Usage: node tools/astrocade-bundle-test.js <game folder> [screenshot.png]
// Prints JSON observations (feed.gpu: draw calls and triangles per frame; feed.pixels: colour, edge and contrast
// metrics of the view after the tap, read with the threejs-qa-release skill). `fail` lists breaks of the platform's hard rules (CI fails on them): the game did
// not start, threw errors, or hid the player's tap from the host.
const { execFileSync } = require('child_process');
const fs = require('fs'), path = require('path');
const { chromium } = require('playwright');

const dir = path.resolve(process.argv[2] || '.'), shot = process.argv[3];
const bundle = execFileSync('npx', ['--yes', 'esbuild@0.24.0', path.join(dir, 'game.js'), '--bundle', '--format=iife'], { encoding: 'utf8', maxBuffer: 64 << 20 });
const config = fs.readFileSync(path.join(dir, 'game_config.json'), 'utf8');
const assets = fs.existsSync(path.join(dir, 'asset_map.json')) ? fs.readFileSync(path.join(dir, 'asset_map.json'), 'utf8') : '{}';
const host = `<script>
window.__errs = []; addEventListener('error', (e) => __errs.push(String(e.message))); addEventListener('unhandledrejection', (e) => __errs.push('rejection: ' + (e.reason && e.reason.message || e.reason)));
// what the host counts: touch gestures on document (bubble), console.error reports, rAF cadence
window.__g = { touchstart: 0, touchend: 0 }; for (const t of ['touchstart', 'touchend']) document.addEventListener(t, () => __g[t]++);
window.__consoleErrors = 0; { const ce = console.error.bind(console); console.error = (...a) => { __consoleErrors++; ce(...a); }; }
// WebGL work per frame, counted at the draw calls (any renderer, no game hook): [calls, triangles] per rAF tick
window.__gl = { calls: 0, tris: 0, frames: [] };
for (const C of [window.WebGLRenderingContext, window.WebGL2RenderingContext]) if (C) for (const [m, ci, ii] of [['drawArrays', 2, -1], ['drawElements', 1, -1], ['drawArraysInstanced', 2, 3], ['drawElementsInstanced', 1, 4]]) {
  const o = C.prototype[m]; if (!o) continue;
  C.prototype[m] = function (...a) { const n = a[ci], k = ii < 0 ? 1 : a[ii]; __gl.calls++; __gl.tris += (a[0] === 4 ? n / 3 : a[0] === 5 || a[0] === 6 ? Math.max(0, n - 2) : 0) * k; return o.apply(this, a); };
}
window.__fr = []; (function f(t) { __fr.push(t); if (__gl.calls) __gl.frames.push([__gl.calls, __gl.tris]); __gl.calls = __gl.tris = 0; requestAnimationFrame(f); })(0);
window.__calls = { save: 0, share: 0, score: 0, device: 0 };
const assets = ${assets}, none = async () => ({});
const off = { supported: false, async start() { __calls.device++; return 'unavailable'; }, stop() {} };
window.gameConfig = ${config};
window.lib = { showGameParameters() {}, log() {}, getUserGameState: none, deleteUserGameState: none,
  async saveUserGameState() { __calls.save++; return {}; }, async addPlayerScoreToLeaderboard() { __calls.score++; return {}; }, getTopNEntriesFromLeaderboard: none,
  async share() { __calls.share++; }, shouldUseTouchControls: () => true, getAsset: (id) => assets[id],
  haptics: { supported: false, play() {}, start() {}, stop() {} },
  motion: Object.assign({ tilt: { x: 0, y: 0, source: 'touch' }, rotationRate: { x: 0, y: 0, z: 0 }, recenter() {}, onShake: () => () => {}, onSample: () => () => {} }, off),
  camera: Object.assign({ video: null, stream: null, async snapshot() { return null; } }, off),
  mic: Object.assign({ level: 0, stream: null, onPeak: () => () => {}, onWord: () => () => {}, async wordSupport() { return 'unavailable'; } }, off) };
addEventListener('load', () => window.run && window.run('play'));
</script>`;
let page = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');
// the entry tag may be a module or a classic script (older multi-file games); the host bundles game.js either way
const tag = /<script(?: type="module")? src="\.\/game\.js"><\/script>/;
if (!tag.test(page)) throw new Error('index.html has no <script src="./game.js"> entry tag');
page = page.replace(tag, () => `<script>${bundle.replace(/<\/script/gi, '<\\/script')}</script>`).replace(/<head>/i, (m) => m + host);
const W = 405, H = 720, scale = W / 720;
const outer = `<!doctype html><html><body style="margin:0;overflow:hidden"><iframe id="g" sandbox="allow-scripts allow-pointer-lock" allow="autoplay *" style="border:0;width:720px;height:1280px;transform:scale(${scale});transform-origin:0 0" srcdoc="${page.replace(/&/g, '&amp;').replace(/"/g, '&quot;')}"></iframe></body></html>`;

// What the code says it does (observations, not checks of behaviour)
let cfgJson = {}; try { cfgJson = JSON.parse(config); } catch (e) { /* reported by ci-checks */ }
const code = {
  leaderboard: !!(cfgJson.persistent_storage_config && cfgJson.persistent_storage_config.leaderboard) && /addPlayerScoreToLeaderboard/.test(bundle),
  share: /lib\.share\s*\(/.test(bundle),
  savesOnHide: /visibilitychange|pagehide/.test(bundle),
  deviceFeatures: ['motion', 'camera', 'mic'].filter((k) => new RegExp(`lib\\.${k}\\.`).test(bundle)),
  consoleErrorCalls: (bundle.match(/console\.error\s*\(/g) || []).length,
};

// Pixel metrics of the phone view a player sees (game + HUD), ported from threejs-game-skills' canvas inspector (MIT):
// low colorEntropyBits / high dominantColorShare = flat sparse scene, low edgeDensity = empty or primitive framing,
// low luminance.contrast = fog or darkness compressing the image. Runs in the page, so no PNG decoder is needed.
async function pixelMetrics(b64) {
  const img = await createImageBitmap(await (await fetch('data:image/png;base64,' + b64)).blob());
  const cols = 90, rows = 160, c = new OffscreenCanvas(cols, rows), g = c.getContext('2d');
  g.drawImage(img, 0, 0, cols, rows); const d = g.getImageData(0, 0, cols, rows).data;
  const lum = new Float64Array(cols * rows), buckets = new Map();
  for (let i = 0; i < cols * rows; i++) { const r = d[i * 4], gr = d[i * 4 + 1], bl = d[i * 4 + 2];
    lum[i] = 0.2126 * r + 0.7152 * gr + 0.0722 * bl; const k = (r >> 4) * 256 + (gr >> 4) * 16 + (bl >> 4); buckets.set(k, (buckets.get(k) || 0) + 1); }
  const n = cols * rows, sorted = Array.from(lum).sort((x, y) => x - y); let entropy = 0, dominant = 0, edges = 0;
  for (const v of buckets.values()) { entropy -= (v / n) * Math.log2(v / n); dominant = Math.max(dominant, v); }
  for (let y = 0; y < rows - 1; y++) for (let x = 0; x < cols - 1; x++) { const i = y * cols + x; if (Math.max(Math.abs(lum[i] - lum[i + 1]), Math.abs(lum[i] - lum[i + cols])) > 12) edges++; }
  const r1 = (v, k) => Math.round(v * 10 ** k) / 10 ** k;
  return { colorEntropyBits: r1(entropy, 2), dominantColorShare: r1(dominant / n, 3), edgeDensity: r1(edges / ((cols - 1) * (rows - 1)), 3),
    luminance: { mean: r1(sorted.reduce((a, v) => a + v, 0) / n, 1), contrast: r1(sorted[Math.floor(n * 0.95)] - sorted[Math.floor(n * 0.05)], 1) } };
}

(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await (await b.newContext({ viewport: { width: W, height: H }, hasTouch: true })).newPage();
  const console_ = []; p.on('console', (m) => m.type() === 'error' && console_.push(m.text())); p.on('pageerror', (e) => console_.push(e.message));
  const t0 = Date.now();
  await p.setContent(outer);
  const f = p.frames().find((x) => x !== p.mainFrame());
  let started = false;
  for (let i = 0; i < 40 && !started; i++) { await p.waitForTimeout(500); started = await f.evaluate(() => { // the game's debug hook is set, or a canvas on screen has been drawn on
    if (window.__game) return true;
    // never getContext() here: a context of the wrong type would stop the game creating its own (WebGL fails)
    for (const c of document.querySelectorAll('canvas')) { if (!c.width || !c.getBoundingClientRect().width) continue;
      try { if (c.toDataURL('image/png').length > 6000) return true; } catch (e) { return true; } } // a blank canvas encodes tiny; a tainted one has drawn CDN images
    return false; }).catch(() => false); }
  const startSec = (Date.now() - t0) / 1000;
  const feed = { startSec: +startSec.toFixed(1), code };
  if (started) {
    // a slow CI runner can take longer than Playwright's 30 s default to capture a busy WebGL page; a capture that
    // still fails leaves the visual observations null instead of ending the run (the tap check needs no capture)
    let slowShots = 0;
    const view = async () => { try { return await p.screenshot({ clip: { x: 0, y: 0, width: W, height: H }, timeout: 60000 }); } catch (e) { slowShots++; return null; } };
    const differ = (x, y) => (x && y ? !x.equals(y) : null);
    await p.waitForTimeout(1500);
    const a = await view(); await p.waitForTimeout(700); const bShot = await view();
    feed.movesBeforeTouch = differ(a, bShot); // the muted preview is the first screen: it should already be alive
    const g0 = await f.evaluate(() => ({ ...__g }));
    const before = await view();
    await p.touchscreen.tap(W * 0.5, H * 0.62); // a feed visitor's first tap, in the play area
    await p.waitForTimeout(400);
    const after = await view();
    const g1 = await f.evaluate(() => ({ ...__g }));
    feed.tapReachedHost = g1.touchstart > g0.touchstart && g1.touchend > g0.touchend;
    feed.tapChangedScreen = differ(before, after); // also true for an animated scene; read it with movesBeforeTouch
    if (slowShots) feed.screenshotsTimedOut = slowShots;
    await p.waitForTimeout(Math.max(0, 7500 - (Date.now() - t0 - startSec * 1000)));
    const r = await f.evaluate(() => { const fr = __fr.filter((t) => t > performance.now() - 2000); return { fps: fr.length > 2 ? (fr.length - 1) * 1000 / (fr[fr.length - 1] - fr[0]) : 0, calls: __calls, consoleErrors: __consoleErrors }; });
    feed.fpsAfter5s = Math.round(r.fps); feed.calls = r.calls; feed.consoleErrorsLogged = r.consoleErrors;
    // median over the last 60 drawn frames; null for a game that draws no WebGL (2D canvas). Mobile budget: 150 / 300k
    feed.gpu = await f.evaluate(() => { const fr = __gl.frames.slice(-60); if (!fr.length) return null; const med = (i) => fr.map((x) => x[i]).sort((x, y) => x - y)[fr.length >> 1];
      return { drawCallsPerFrame: med(0), trianglesPerFrame: Math.round(med(1)), frames: fr.length }; });
    if (after) feed.pixels = await p.evaluate(pixelMetrics, after.toString('base64'));
  }
  const errs = await f.evaluate(() => window.__errs).catch(() => ['frame not reachable']);
  const canvases = started ? undefined : await f.evaluate(() => [...document.querySelectorAll('canvas')].map((c) => { let n = -1; try { n = c.toDataURL('image/png').length; } catch (e) { n = 'tainted'; } return `${c.id || '?'} ${c.width}x${c.height} shown ${Math.round(c.getBoundingClientRect().width)} png ${n}`; })).catch(() => ['frame not reachable']);
  if (shot) await p.screenshot({ path: shot });
  const errors = [...new Set([...errs, ...console_])];
  const fail = [];
  if (!started) fail.push('did not start');
  if (errors.length) fail.push('errors: ' + errors.length);
  if (started && !feed.tapReachedHost) fail.push('a tap in the game never reached document touch listeners: the host counts no gesture, so plays look like 0 interaction');
  console.log(JSON.stringify({ bundleKB: Math.round(bundle.length / 1024), started, errors, fail, feed, canvases }, null, 1)); // canvases: only when it did not start, to see why
  await b.close();
})();
