// Load timeline of a multi-module Three game as Astrocade serves it (game.js bundled inline, gzip), on a phone
// profile: 390x844, 4x CPU slowdown, slow 4G (150 ms, 1.6 Mbps) and 4G (60 ms, 9 Mbps). Prints transferred kB and
// ms from navigation to three-ready, to the game's __load.done() and to its first drawn frame. Software GL here, so
// the shader-compile share is slower than on a phone GPU; compare runs with each other, not with a device.
// Usage: node tools/load-time.js prototypes/<name> [runs]   (env PROF=1: top self-time functions; ONLY4G=1)
const { chromium } = require('playwright'); const http = require('http'), fs = require('fs'), path = require('path'), zlib = require('zlib');
const { execFileSync } = require('child_process');
const dir = path.resolve(process.argv[2]), runs = +process.argv[3] || 2, T3 = path.join(require('os').tmpdir(), 'three-r187');
const CDN = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/0.187.0/';
fs.mkdirSync(T3, { recursive: true });
for (const f of ['three.module.min.js', 'three.core.min.js', 'three.core.js']) if (!fs.existsSync(path.join(T3, f))) execFileSync('curl', ['-sfo', path.join(T3, f), CDN + f]);
const bundle = execFileSync('npx', ['--yes', 'esbuild@0.24.0', path.join(dir, 'game.js'), '--bundle', '--format=iife', ...(process.env.MIN ? ['--minify'] : [])], { encoding: 'utf8', maxBuffer: 64 << 20 });
const host = `<script>const none = async () => ({}); window.gameConfig = ${fs.readFileSync(path.join(dir, 'game_config.json'), 'utf8')};
window.lib = { showGameParameters() {}, log() {}, getUserGameState: none, deleteUserGameState: none, saveUserGameState: none, addPlayerScoreToLeaderboard: none, getTopNEntriesFromLeaderboard: none, share: none, shouldUseTouchControls: () => true, getAsset: () => null,
 haptics: { supported: false, play() {}, start() {}, stop() {} } };
addEventListener('load', () => window.run && window.run('play'));</script>`;
const page = String(fs.readFileSync(path.join(dir, 'index.html'))).split(CDN).join('/three/')
  .replace(/<script type="module" src="\.\/game\.js"><\/script>/, () => '<script>' + bundle.replace(/<\/script/gi, '<\\/script') + '</script>').replace(/<head>/i, (m) => m + host);
console.log('page kB', Math.round(page.length / 1024), 'gz', Math.round(zlib.gzipSync(page).length / 1024));
const types = { '.js': 'text/javascript', '.json': 'application/json', '.html': 'text/html' };
const srv = http.createServer((q, r) => { let u = decodeURIComponent(q.url.split('?')[0]); if (u === '/') u = '/index.html';
  const f = u.startsWith('/three/') ? path.join(T3, u.slice(7)) : path.join(dir, u);
  if (!fs.existsSync(f)) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream', 'content-encoding': 'gzip', 'access-control-allow-origin': '*' });
  let body = u === '/index.html' ? Buffer.from(page) : fs.readFileSync(f);
  r.end(zlib.gzipSync(body, { level: 9 }));
}).listen(0, async () => {
  const port = srv.address().port, b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  for (const prof of (process.env.ONLY4G ? [['4G', 60, 9e6]] : [['slow4G', 150, 1.6e6], ['4G', 60, 9e6]])) for (let i = 0; i < runs; i++) {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.addInitScript(() => { const t = {}; window.__t = t; addEventListener('three-ready', () => t.three = performance.now());
      Object.defineProperty(window, '__load', { configurable: true, set(v) { const d = v.done; v.done = () => { t.done = performance.now(); requestAnimationFrame(() => requestAnimationFrame(() => t.frame = performance.now())); d(); }; this.__l = v; }, get() { return this.__l; } }); });
    const c = await ctx.newCDPSession(p); await c.send('Network.enable');
    await c.send('Network.emulateNetworkConditions', { offline: false, latency: prof[1], downloadThroughput: prof[2] / 8, uploadThroughput: 750e3 / 8 });
    await c.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    let bytes = 0;
    c.on('Network.loadingFinished', e => bytes += e.encodedDataLength);
    if (process.env.PROF) { await c.send('Profiler.enable'); await c.send('Profiler.setSamplingInterval', { interval: 500 }); await c.send('Profiler.start'); }
    await p.goto(`http://127.0.0.1:${port}/?nointro`, { waitUntil: 'commit' });
    p.on('console', m => process.env.DBG && console.log('console', m.text())); try { await p.waitForFunction(() => window.__t && window.__t.frame, null, { timeout: 60000 }); } catch (e) { console.log('timeout', await p.evaluate(() => JSON.stringify({ t: window.__t, g: !!window.__game, l: !!window.__load, app: document.getElementById('app').innerHTML.slice(0, 80) }))); }
    const t = await p.evaluate(() => ({ ...window.__t, dcl: performance.getEntriesByType('navigation')[0].domContentLoadedEventEnd }));
    if (process.env.PROF) { const { profile } = await c.send('Profiler.stop'); const self = {}; const dt = profile.timeDeltas; const byId = {}; for (const n of profile.nodes) byId[n.id] = n;
      profile.samples.forEach((id, k) => { const n = byId[id], cf = n.callFrame, key = (cf.functionName || '(anon)') + ' ' + cf.url.split('/').pop() + ':' + cf.lineNumber; self[key] = (self[key] || 0) + (dt[k] || 0) / 1000; });
      console.log(Object.entries(self).sort((a, b) => b[1] - a[1]).slice(0, 25).map(([k, v]) => Math.round(v) + 'ms ' + k).join('\n')); }
    console.log(prof[0], 'run', i, 'kB', Math.round(bytes / 1024), Object.entries(t).map(([k, v]) => k + ' ' + Math.round(v)).join('  '), errs.join('|'));
    await ctx.close();
  }
  await b.close(); srv.close();
});
