// Bakes a game's canvas-drawn sprites (registered with sprite() from its bake.js, see tools/kit/bake.js) into
// one lossless sheet, using the game's own drawing code in a real browser: writes <game>/baked.webp and
// <game>/bake-manifest.js. After baking, upload baked.webp as asset id 'baked' (tools/assets.js lists it).
// With --check it writes nothing and fails when:
//   - a sprite is missing from the manifest, or listed there but no longer registered;
//   - the sheet is missing or not the manifest size;
//   - a sprite read from the sheet differs from its live drawing (pixel by pixel, so constants and helpers the
//     draw function reads count too). Sprites that draw text or emoji are listed instead of compared: their
//     live drawing depends on this machine's fonts (a CI runner's differ), which is what baking freezes;
//   - in the esbuild bundle Astrocade runs (same pin as tools/astrocade-bundle-test.js), with the sheet served
//     as the 'baked' asset, any sprite is still drawn live instead of read from the sheet.
// Usage: node tools/bake.js <game folder> [--check]
const { chromium } = require('playwright');
const { execFileSync } = require('child_process');
const fs = require('fs'), path = require('path'), http = require('http');
const [dir, flag] = process.argv.slice(2);
if (!dir) { console.error('usage: node tools/bake.js <game folder> [--check]'); process.exit(2); }
const check = flag === '--check';
const root = path.resolve(dir);
if (!fs.existsSync(path.join(root, 'bake.js'))) { console.error(`no bake.js in ${dir}: copy tools/kit/bake.js and tools/kit/bake-manifest.js there first`); process.exit(2); }
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.mp3': 'audio/mpeg', '.glb': 'model/gltf-binary', '.woff2': 'font/woff2' };

const cfg = fs.existsSync(path.join(root, 'game_config.json')) ? fs.readFileSync(path.join(root, 'game_config.json'), 'utf8') : '{}';
/** A stand-in host: config from the file, no saves, and asset 'baked' pointing at `sheet` (or none). */
const host = (sheet) => `<script>window.gameConfig=${cfg};window.mode='edit';window.lib={getAsset(id){return id==='baked'&&${JSON.stringify(sheet || '')}?{url:${JSON.stringify(sheet || '')},type:'image'}:null},log(){},showGameParameters(){},haptics:{play(){},start(){},stop(){}},shouldUseTouchControls(){return true},async getUserGameState(){return{state:null}},async saveUserGameState(){},async addPlayerScoreToLeaderboard(){return{}},async getTopNEntriesFromLeaderboard(){return{}}};</script>`;
const withHost = (html, sheet) => html.replace(/<head(\s[^>]*)?>/i, (m) => m + host(sheet));

let bundled = null; // the esbuild page, built only for --check
const server = http.createServer((q, r) => {
  let rel;
  try { rel = decodeURIComponent(q.url.split('?')[0]).replace(/^\/+/, '') || 'index.html'; } catch (e) { r.writeHead(400); return r.end(); }
  if (rel === '__bundled.html' && bundled) { r.writeHead(200, { 'content-type': 'text/html' }); return r.end(bundled); }
  const f = path.resolve(root, rel);
  if (!f.startsWith(root + path.sep) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); }
  let body = fs.readFileSync(f);
  if (rel === 'index.html') body = withHost(body.toString(), '');
  r.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); r.end(body);
});

/** In the page: compares every sprite read from the sheet with its live drawing; returns the problems found and the sprites that draw text. */
async function comparePixels() {
  const K = window.__bakeKit, list = K.bakeList(), baked = K.manifest, problems = [], fontSprites = [];
  // text and emoji come out in whatever fonts this machine has, so a sprite that draws them cannot be compared
  // with a sheet baked elsewhere (that difference is what baking freezes); it is noted instead
  const live = (s) => {
    const c = document.createElement('canvas'); c.width = Math.ceil(s.w * s.scale); c.height = Math.ceil(s.h * s.scale);
    const x = c.getContext('2d'), P = CanvasRenderingContext2D.prototype; let text = false;
    x.fillText = function () { text = true; return P.fillText.apply(this, arguments); };
    x.strokeText = function () { text = true; return P.strokeText.apply(this, arguments); };
    x.scale(s.scale, s.scale); s.paint(x, s.w, s.h); c.text = text; return c;
  };
  if (!list.length) problems.push('no sprite registered (define them with sprite() at module top level)');
  if (list.length && !baked) problems.push('never baked');
  if (!baked) return { problems, fontSprites };
  for (const s of list) { const it = baked.items[s.name]; if (!it) problems.push(`${s.name}: not in the manifest`); else if (it.key !== s.key) problems.push(`${s.name}: size or options changed since the bake`); }
  for (const n of Object.keys(baked.items)) if (!list.some((s) => s.name === n)) problems.push(`${n}: in the manifest but no longer registered`);
  if (!(await K.bakeReady(5000))) { problems.push('baked.webp missing, unreadable or not the manifest size'); return { problems, fontSprites }; }
  for (const s of list) {
    const src = s.source(); if (!src.baked) continue; // already reported above
    const a = live(s);
    if (a.text) { fontSprites.push(s.name); continue; }
    const b = document.createElement('canvas'); b.width = a.width; b.height = a.height;
    b.getContext('2d').drawImage(src.img, src.sx, src.sy, src.sw, src.sh, 0, 0, a.width, a.height);
    const da = a.getContext('2d').getImageData(0, 0, a.width, a.height).data, db = b.getContext('2d').getImageData(0, 0, a.width, a.height).data;
    // compared as shown on screen (colour times alpha): a nearly transparent edge pixel can come back with a very
    // different colour after encoding without looking any different
    let off = 0;
    for (let i = 0; i < da.length; i += 4) {
      let d = Math.abs(da[i + 3] - db[i + 3]);
      for (let k = 0; k < 3; k++) d = Math.max(d, Math.abs(da[i + k] * da[i + 3] - db[i + k] * db[i + 3]) / 255);
      if (d > 8) off++;
    }
    if (off) problems.push(`${s.name}: ${off} pixels differ from the live drawing (drawing or something it reads changed)`);
  }
  return { problems, fontSprites };
}

(async () => {
  await new Promise((ok) => server.listen(0, '127.0.0.1', ok));
  const base = `http://127.0.0.1:${server.address().port}/`;
  const b = await chromium.launch();
  const open = async (url) => { const p = await b.newPage(), errors = []; p.on('pageerror', (e) => errors.push(e.message)); await p.goto(url, { waitUntil: 'load' }); await p.waitForTimeout(800); return { p, errors }; };
  const { p, errors } = await open(base);
  const kit = await p.evaluate(() => !!window.__bakeKit);
  if (!kit) { await b.close(); server.close(); console.error(`FAIL bake ${dir}: the page never loaded bake.js (page errors: ${errors.join('; ') || 'none'})`); process.exit(1); }

  if (check) {
    const { problems, fontSprites } = await p.evaluate(comparePixels);
    if (!problems.length) { // the same sprites, run the way Astrocade runs the game
      const js = execFileSync('npx', ['--yes', 'esbuild@0.24.0', path.join(root, 'game.js'), '--bundle', '--format=iife'], { encoding: 'utf8', maxBuffer: 64 << 20 });
      const page = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
      const tag = /<script type="module" src="\.\/game\.js"><\/script>/;
      if (!tag.test(page)) problems.push('index.html has no <script type="module" src="./game.js"> to bundle');
      else {
        bundled = withHost(page.replace(tag, () => `<script>${js.replace(/<\/script/gi, '<\\/script')}</script>`), base + 'baked.webp');
        const q = await open(base + '__bundled.html');
        const live = await q.p.evaluate(async () => { const K = window.__bakeKit; if (!K) return ['bundle: bake.js not found']; await K.bakeReady(5000); return K.bakeList().filter((s) => !s.source().baked).map((s) => s.name); });
        if (live.length) problems.push(`bundle: still drawn live instead of from the sheet: ${live.join(', ')}`);
        if (q.errors.length) problems.push('bundle page errors: ' + q.errors.join('; '));
      }
    }
    await b.close(); server.close();
    if (errors.length) problems.push('page errors: ' + errors.join('; '));
    if (problems.length) { console.error(`FAIL bake ${dir}\n  ` + problems.join('\n  ') + `\n  fix: node tools/bake.js ${dir}`); process.exit(1); }
    console.log(`ok bake ${dir}: sprites match baked.webp, and the bundle reads them from it` + (fontSprites.length ? `\n  not pixel-checked (they draw text, which differs with each machine's fonts): ${fontSprites.join(', ')}` : '')); return;
  }

  const res = await p.evaluate(() => {
    const K = window.__bakeKit, list = K.bakeList();
    const canv = list.map((s) => { const c = document.createElement('canvas'); c.width = Math.ceil(s.w * s.scale); c.height = Math.ceil(s.h * s.scale); const x = c.getContext('2d'); x.scale(s.scale, s.scale); s.paint(x, s.w, s.h); return { s, c }; });
    if (!canv.length) return { count: 0 };
    const P = K.pack(canv.map(({ s, c }) => ({ name: s.name, w: c.width, h: c.height })));
    const sheet = document.createElement('canvas'); sheet.width = P.width; sheet.height = P.height;
    const sx = sheet.getContext('2d'), items = {};
    for (const { s, c } of canv) { const at = P.at[s.name]; sx.drawImage(c, at.x, at.y); items[s.name] = { ...at, key: s.key }; }
    return { width: sheet.width, height: sheet.height, items, data: sheet.toDataURL('image/webp', 1).split(',')[1], count: list.length }; // quality 1: lossless
  });
  await b.close(); server.close();
  if (errors.length) { console.error('page errors:\n' + errors.join('\n')); process.exit(1); }
  if (!res.count) { console.error('no sprite registered: nothing to bake'); process.exit(1); }
  const webp = Buffer.from(res.data, 'base64');
  fs.writeFileSync(path.join(root, 'baked.webp'), webp);
  const manifest = { width: res.width, height: res.height, items: res.items };
  fs.writeFileSync(path.join(root, 'bake-manifest.js'), `// PROTOTYPE - NOT FOR PRODUCTION\n// Written by tools/bake.js: where each sprite sits in baked.webp. Do not edit by hand; run the bake again.\nexport const BAKED = ${JSON.stringify(manifest)};\n`);
  console.log(`baked ${res.count} sprites into ${dir}/baked.webp (${res.width}x${res.height}, ${webp.length} bytes); upload it as asset 'baked' (node tools/assets.js ${dir})`);
})().catch((e) => { console.error(e); server.close(); process.exit(1); });
