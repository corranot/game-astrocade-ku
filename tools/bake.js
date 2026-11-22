// Bakes a game's canvas-drawn sprites (registered with sprite() from its bake.js, see tools/kit/bake.js) into
// one sheet, using the game's own drawing code in a real browser: writes <game>/baked.webp and
// <game>/bake-manifest.js. With --check it writes nothing and fails when the bake is stale: a sprite is missing
// from the manifest or drawn differently, the sheet is missing or the wrong size, or a sprite read back from the
// sheet does not match its live drawing.
// After baking, upload baked.webp as asset id 'baked' (tools/assets.js lists it as changed).
// Usage: node tools/bake.js <game folder> [--check]
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path'), http = require('http');
const [dir, flag] = process.argv.slice(2);
if (!dir) { console.error('usage: node tools/bake.js <game folder> [--check]'); process.exit(2); }
const check = flag === '--check';
const root = path.resolve(dir);
if (!fs.existsSync(path.join(root, 'bake.js'))) { console.error(`no bake.js in ${dir}: copy tools/kit/bake.js and tools/kit/bake-manifest.js there first`); process.exit(2); }
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.mp3': 'audio/mpeg', '.glb': 'model/gltf-binary', '.woff2': 'font/woff2' };

// The page as Astrocade would load it, minus the host: config from the file, a lib that has no assets, and
// run() never called (sprites are registered when their modules load, before any game starts).
const cfg = fs.existsSync(path.join(root, 'game_config.json')) ? fs.readFileSync(path.join(root, 'game_config.json'), 'utf8') : '{}';
const host = `<script>window.gameConfig=${cfg};window.mode='edit';window.lib={getAsset(){return null},log(){},showGameParameters(){},haptics:{play(){},start(){},stop(){}},shouldUseTouchControls(){return true},async getUserGameState(){return{state:null}},async saveUserGameState(){},async addPlayerScoreToLeaderboard(){return{}},async getTopNEntriesFromLeaderboard(){return{}}};</script>`;
const server = http.createServer((q, r) => {
  const rel = decodeURIComponent(q.url.split('?')[0]).replace(/^\/+/, '') || 'index.html';
  const f = path.resolve(root, rel);
  if (!f.startsWith(root + path.sep) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); }
  let body = fs.readFileSync(f);
  if (rel === 'index.html') body = body.toString().replace(/<head[^>]*>/i, (m) => m + host);
  r.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); r.end(body);
});

(async () => {
  await new Promise((ok) => server.listen(0, '127.0.0.1', ok));
  const url = `http://127.0.0.1:${server.address().port}/`;
  const b = await chromium.launch();
  const p = await b.newPage();
  const errors = []; p.on('pageerror', (e) => errors.push(e.message));
  await p.goto(url, { waitUntil: 'load' });
  await p.waitForTimeout(800); // module graph and any import map settle
  const res = await p.evaluate(async (check) => {
    const B = await import('./bake.js'), M = await import('./bake-manifest.js');
    const list = B.bakeList(), baked = M.BAKED;
    const draw = (s) => { const c = document.createElement('canvas'); c.width = Math.ceil(s.w * s.scale); c.height = Math.ceil(s.h * s.scale); const x = c.getContext('2d'); x.scale(s.scale, s.scale); s.paint(x, s.w, s.h); return c; };
    if (check) {
      const problems = [];
      if (!list.length) problems.push('no sprite registered (define them with sprite() at module top level)');
      if (list.length && !baked) problems.push('never baked');
      if (baked) {
        for (const s of list) { const it = baked.items[s.name]; if (!it) problems.push(`${s.name}: not in the manifest`); else if (it.hash !== s.hash) problems.push(`${s.name}: drawn differently since the bake`); }
        for (const n of Object.keys(baked.items)) if (!list.some((s) => s.name === n)) problems.push(`${n}: in the manifest but no longer registered`);
        const ok = await B.bakeReady(5000);
        if (!ok) problems.push('baked.webp missing, unreadable or not the manifest size');
        else for (const s of list) {
          const it = baked.items[s.name]; if (!it || it.hash !== s.hash) continue;
          const src = s.source(); if (!src.baked) { problems.push(`${s.name}: not read from the sheet`); continue; }
          const a = draw(s), bb = document.createElement('canvas'); bb.width = a.width; bb.height = a.height;
          bb.getContext('2d').drawImage(src.img, src.sx, src.sy, src.sw, src.sh, 0, 0, a.width, a.height);
          const da = a.getContext('2d').getImageData(0, 0, a.width, a.height).data, db = bb.getContext('2d').getImageData(0, 0, a.width, a.height).data;
          let sum = 0; for (let i = 0; i < da.length; i++) sum += Math.abs(da[i] - db[i]);
          const mean = sum / da.length; if (mean > 6) problems.push(`${s.name}: sheet pixels differ from the live drawing (mean ${mean.toFixed(1)}/255)`);
        }
      }
      return { problems, count: list.length };
    }
    const canv = list.map((s) => ({ s, c: draw(s) }));
    const P = B.pack(canv.map(({ s, c }) => ({ name: s.name, w: c.width, h: c.height })));
    const sheet = document.createElement('canvas'); sheet.width = Math.max(1, P.width); sheet.height = Math.max(1, P.height);
    const sx = sheet.getContext('2d'), items = {};
    for (const { s, c } of canv) { const at = P.at[s.name]; sx.drawImage(c, at.x, at.y); items[s.name] = { ...at, hash: s.hash }; }
    return { width: sheet.width, height: sheet.height, items, data: sheet.toDataURL('image/webp', 0.92).split(',')[1], count: list.length };
  }, check);
  await b.close(); server.close();
  if (errors.length) { console.error('page errors:\n' + errors.join('\n')); process.exit(1); }
  if (check) {
    if (res.problems.length) { console.error(`FAIL bake ${dir}\n  ` + res.problems.join('\n  ') + `\n  fix: node tools/bake.js ${dir}`); process.exit(1); }
    console.log(`ok bake ${dir}: ${res.count} sprites match baked.webp`); return;
  }
  if (!res.count) { console.error('no sprite registered: nothing to bake'); process.exit(1); }
  const webp = Buffer.from(res.data, 'base64');
  fs.writeFileSync(path.join(root, 'baked.webp'), webp);
  const manifest = { width: res.width, height: res.height, items: res.items };
  fs.writeFileSync(path.join(root, 'bake-manifest.js'), `// PROTOTYPE - NOT FOR PRODUCTION\n// Written by tools/bake.js: where each sprite sits in baked.webp. Do not edit by hand; run the bake again.\nexport const BAKED = ${JSON.stringify(manifest)};\n`);
  console.log(`baked ${res.count} sprites into ${dir}/baked.webp (${res.width}x${res.height}, ${webp.length} bytes); upload it as asset 'baked' (node tools/assets.js ${dir})`);
})().catch((e) => { console.error(e); server.close(); process.exit(1); });
