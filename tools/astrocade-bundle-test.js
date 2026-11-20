// Runs a multi-file game the way Astrocade does, to catch errors that only show up there:
// esbuild bundles game.js and its imports into one classic script, the page goes into an iframe srcdoc,
// and the host's lib + gameConfig are present before the bundle runs, while three.js still loads from the CDN.
// Usage: node tools/astrocade-bundle-test.js <game folder> [screenshot.png]
// Prints observations (errors seen, whether the game started); it does not judge the game.
const { execFileSync } = require('child_process');
const fs = require('fs'), path = require('path');
const { chromium } = require('playwright');

const dir = path.resolve(process.argv[2] || '.'), shot = process.argv[3];
const bundle = execFileSync('npx', ['--yes', 'esbuild@0.24.0', path.join(dir, 'game.js'), '--bundle', '--format=iife'], { encoding: 'utf8', maxBuffer: 64 << 20 });
const config = fs.readFileSync(path.join(dir, 'game_config.json'), 'utf8');
const assets = fs.existsSync(path.join(dir, 'asset_map.json')) ? fs.readFileSync(path.join(dir, 'asset_map.json'), 'utf8') : '{}';
const host = `<script>
window.__errs = []; addEventListener('error', (e) => __errs.push(String(e.message))); addEventListener('unhandledrejection', (e) => __errs.push('rejection: ' + (e.reason && e.reason.message || e.reason)));
const assets = ${assets}, none = async () => ({});
window.gameConfig = ${config};
window.lib = { showGameParameters() {}, log() {}, getUserGameState: none, saveUserGameState: none, addPlayerScoreToLeaderboard: none, getTopNEntriesFromLeaderboard: none,
  shouldUseTouchControls: () => true, haptics: { play() {}, start() {}, stop() {} }, getAsset: (id) => assets[id] };
addEventListener('load', () => window.run && window.run('play'));
</script>`;
let page = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');
const tag = /<script type="module" src="\.\/game\.js"><\/script>/;
if (!tag.test(page)) throw new Error('index.html has no <script type="module" src="./game.js">');
page = page.replace(tag, () => `<script>${bundle.replace(/<\/script/gi, '<\\/script')}</script>`).replace(/<head>/i, (m) => m + host);
const outer = `<!doctype html><html><body style="margin:0"><iframe id="g" style="border:0;width:100vw;height:100vh" srcdoc="${page.replace(/&/g, '&amp;').replace(/"/g, '&quot;')}"></iframe></body></html>`;

(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 405, height: 720 } });
  const console_ = []; p.on('console', (m) => m.type() === 'error' && console_.push(m.text())); p.on('pageerror', (e) => console_.push(e.message));
  await p.setContent(outer);
  const f = p.frames().find((x) => x !== p.mainFrame());
  let started = false;
  for (let i = 0; i < 40 && !started; i++) { await p.waitForTimeout(500); started = await f.evaluate(() => { // the game's debug hook is set, or a 2D canvas on screen has been drawn on (not one flat colour)
    if (window.__game) return true;
    for (const c of document.querySelectorAll('canvas')) { if (!c.width || !c.getBoundingClientRect().width) continue; const g = c.getContext('2d'); if (!g) continue;
      const d = g.getImageData(0, 0, c.width, c.height).data, seen = new Set(); for (let k = 0; k < d.length; k += 4 * 997) seen.add(d[k] << 16 | d[k + 1] << 8 | d[k + 2]); if (seen.size > 8) return true; }
    return false; }).catch(() => false); }
  if (started) await p.waitForTimeout(3000);
  const errs = await f.evaluate(() => window.__errs).catch(() => ['frame not reachable']);
  if (shot) await p.screenshot({ path: shot });
  console.log(JSON.stringify({ bundleKB: Math.round(bundle.length / 1024), started, errors: [...new Set([...errs, ...console_])] }, null, 1));
  await b.close();
})();
