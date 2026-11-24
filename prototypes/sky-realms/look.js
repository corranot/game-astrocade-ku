// PROTOTYPE - NOT FOR PRODUCTION
// Look: renders the screens a player sees at 720×1280 (and one desktop 1280×720) into a folder: title, first view,
// mining, each island, golden hour, night, a wonder assembling and done, an egg hatching, the touch HUD, and the
// title in all seven languages. Usage: node look.js <out folder> [only-name]
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const out = process.argv[2], only = process.argv[3];
fs.mkdirSync(out, { recursive: true });
const types = { '.js': 'text/javascript', '.html': 'text/html', '.json': 'application/json' };
const srv = http.createServer((q, s) => { const f = path.join(__dirname, q.url.split('?')[0] === '/' ? 'index.html' : q.url.split('?')[0]); fs.readFile(f, (e, d) => { if (e) { s.writeHead(404); return s.end(); } s.writeHead(200, { 'content-type': types[path.extname(f)] || 'text/plain' }); s.end(d); }); }).listen(0);
const GPU = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'];
const errors = [];
async function open(b, o = {}) {
  const p = await b.newPage({ viewport: o.vp || { width: 720, height: 1280 }, locale: o.locale || 'en-US', hasTouch: !!o.touch, isMobile: !!o.touch });
  p.on('pageerror', (e) => errors.push(e.stack));
  p.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await p.goto(`http://localhost:${srv.address().port}/?local`);
  await p.waitForFunction(() => window.__game && window.__game.alive && window.__game.loaded, null, { timeout: 60000 });
  await p.evaluate(() => { __game.perf.warm = -1e9; });
  return p;
}
const shot = async (p, name) => { if (only && only !== name) return; await p.screenshot({ path: path.join(out, name + '.jpg'), quality: 82, type: 'jpeg' }); console.log('shot', name); };
const settle = (p, s = 1.2) => p.evaluate((s) => new Promise((r) => { const g = __game, t = g.now + s; const f = () => (g.now >= t ? r() : requestAnimationFrame(f)); f(); }), s);
const begin = async (p) => { const v = p.viewportSize(); await p.mouse.click(v.width / 2, v.height * 0.3); await p.waitForFunction(() => __game.started); };
const tp = (p, x, z, yaw, pitch) => p.evaluate(([x, z, yaw, pitch]) => { const g = __game; g.player.spawnAt(x, z); g.player.yaw = yaw; g.player.pitch = pitch; }, [x, z, yaw, pitch]);
(async () => {
  const b = await chromium.launch({ args: GPU });
  let p = await open(b);
  await settle(p, 2); await shot(p, '01-title');
  await begin(p); await settle(p, 1); await shot(p, '02-first-view');
  await p.evaluate(() => { const g = __game; g.locked = true; g.mouseMine = true; g.player.pitch = -0.32; });
  await settle(p, 0.45); await shot(p, '03-mining-crack');
  await settle(p, 2.5); await p.evaluate(() => { __game.mouseMine = false; }); await shot(p, '04-after-mining');
  await tp(p, 88, 74, 0.9, -0.12); await settle(p); await shot(p, '05-crystal-isle');
  await tp(p, 66, 40, -0.5, -0.05); await settle(p); await shot(p, '06-candy-haven');
  await tp(p, 34, 55, -1.2, 0.05); await settle(p); await shot(p, '07-volcano');
  await tp(p, 64, 84, 0, 0.05); await p.evaluate(() => { __game.phase = 0.47; }); await settle(p, 1); await shot(p, '08-golden-hour');
  await p.evaluate(() => { __game.phase = 0.72; }); await settle(p, 1); await shot(p, '09-night');
  await p.evaluate(() => { __game.phase = 0.15; });
  // a wonder: stand on the meadow pad with everything it costs
  await p.evaluate(() => { const g = __game, b = g.blueprints.list[0]; for (const k in b.cost) g.S.inv[k] = b.cost[k] + 2; g.player.spawnAt(b.pad.x + 0.5, b.pad.z + 0.5); g.player.yaw = -Math.PI / 2 - 0.25; g.player.pitch = 0.12; g.hudDirty = true; });
  await settle(p, 0.6); await shot(p, '10-on-pad-ready');
  await p.evaluate(() => __game.placeOrBuild(null)); await settle(p, 2.2); await shot(p, '11-wonder-assembling');
  await p.waitForFunction(() => __game.blueprints.list[0].done, null, { timeout: 120000 });
  await p.evaluate(() => { const g = __game, b = g.blueprints.list[0]; g.player.spawnAt(b.pad.x - 3.5, b.pad.z + 7.5); g.player.yaw = -0.75; g.player.pitch = 0.22; });
  await settle(p, 0.6); await shot(p, '12-wonder-done');
  await settle(p, 2.6); await p.evaluate(() => { const g = __game, q = g.pets.pets[0]; if (q) { const P = g.player; q.p.set(P.pos.x - Math.sin(P.yaw) * 2.2, P.pos.y, P.pos.z - Math.cos(P.yaw) * 2.2); q.v.set(0, 0, 0); } g.player.pitch = -0.35; });
  await settle(p, 0.3); await shot(p, '13-pet-hatched');
  // the four pets lined up in front of the camera (follow logic paused for the photo)
  await p.evaluate(() => { const g = __game, P = g.player; g.player.spawnAt(62.5, 80.5); P.yaw = 0; P.pitch = -0.62; for (const k of ['fox', 'bunny', 'turtle', 'dragon']) if (!g.pets.pets.some((q) => q.kind === k)) { g.cfg.pets.maxActive = 4; g.pets.add(k, P.pos.clone(), true); } g.pets.update = () => {}; g.pets.pets.forEach((q, i) => { const x = P.pos.x - 1.55 + i * 1.05, z = P.pos.z - 3.3, y = g.world.groundY(Math.floor(x), Math.floor(z)) + 1; q.p.set(x, y + (q.kind === 'dragon' ? 0.5 : 0), z); q.rig.root.rotation.y = 0; }); });
  await settle(p, 0.4); await shot(p, '13b-pets');
  await p.evaluate(() => { __game.cfg.pets.maxActive = 3; __game.hudDirty = true; });
  await p.evaluate(() => { const g = __game; g.S.gauge = 230; g.toolUp(3); g.player.setTier(3); g.hudDirty = true; }); await settle(p, 0.5); await shot(p, '14-cosmic-tool');
  await p.close();
  // touch HUD
  p = await open(b, { touch: true });
  await p.touchscreen.tap(360, 400); await p.waitForFunction(() => __game.started); await settle(p, 1); await shot(p, '15-touch-hud');
  await p.close();
  // desktop
  p = await open(b, { vp: { width: 1280, height: 720 } }); await settle(p, 1.5); await shot(p, '16-desktop-title');
  await begin(p); await settle(p, 1); await shot(p, '17-desktop-play'); await p.close();
  for (const [l, loc] of [['ar', 'ar-SA'], ['hi', 'hi-IN'], ['bn', 'bn-BD'], ['vi', 'vi-VN'], ['es', 'es-ES'], ['id', 'id-ID']]) {
    if (only && only !== 'lang-' + l) continue;
    p = await open(b, { locale: loc }); await settle(p, 1); await shot(p, 'lang-' + l); await p.close();
  }
  console.log(errors.length ? 'ERRORS\n' + errors.join('\n') : 'no page errors');
  await b.close(); srv.close();
})().catch((e) => { console.error(e); process.exit(1); });
