// Audit capture for Soap Carving: serves a build folder, plays key moments, saves JPGs and numbers.
// Usage: node audit-capture.js <build dir> <out dir> <tag>
// Read only: plays a local copy of the build with the host stubbed (index.html?local).
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const [dir, out, tag] = process.argv.slice(2); fs.mkdirSync(out, { recursive: true });
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.webp': 'image/webp', '.mp3': 'audio/mpeg' };
const server = http.createServer((q, r) => {
  const f = path.join(dir, decodeURIComponent(q.url.split('?')[0]).replace(/^\/$/, '/index.html'));
  fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); } else { r.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' }); r.end(d); } });
});
const cfg = JSON.parse(fs.readFileSync(path.join(dir, 'game_config.json'), 'utf8')), BAR = cfg.bar;
const res = { errors: [] };

(async () => {
  await new Promise((r) => server.listen(0, r));
  const base = `http://127.0.0.1:${server.address().port}/index.html?local`;
  const browser = await chromium.launch();
  let cur = null;
  const open = async (vp = { width: 720, height: 1280 }, init, arg) => {
    if (cur) await cur.context().close();
    const c = await browser.newContext({ viewport: vp }); if (init) await c.addInitScript(init, arg);
    const p = cur = await c.newPage(); p.on('pageerror', (e) => res.errors.push(String(e)));
    return p;
  };
  const ready0 = (p) => p.waitForFunction(() => window.__game && window.__game.S && window.__frames > 3 && !window.__game.booting(), null, { timeout: 20000 });
  const G = (p, f, a) => p.evaluate(f, a);
  const shot = (p, n) => p.screenshot({ path: path.join(out, `${tag}-${n}.jpg`), quality: 80 });
  const wait = (p, f, a, timeout = 15000) => p.waitForFunction(f, a, { timeout });
  const ready = (p) => wait(p, () => window.__game.S.enter <= 0 && !window.__game.S.trim);
  const drag = async (p, pts, ms = 16) => { await p.mouse.move(pts[0][0], pts[0][1]); await p.mouse.down(); for (const q of pts.slice(1)) { await p.mouse.move(q[0], q[1]); await p.waitForTimeout(ms); } await p.mouse.up(); };
  const row = (y) => Array.from({ length: 16 }, (_, j) => [BAR.x - 24 + (BAR.w + 48) * j / 15, y + (j % 2) * 6]);
  const carveAll = async (p) => { for (let y = BAR.y - 6; y < BAR.y + BAR.h + 12 && await G(p, () => window.__game.S.k === 'carve' && !window.__game.S.trim); y += 26) await drag(p, row(y)); };
  const smoothAll = async (p) => {
    for (let k = 0; k < 12 && await G(p, () => window.__game.S.k === 'smooth'); k++) {
      const pts = await G(p, () => { const S = window.__game.S, s = S.soap, c = window.__game.cfg.bar, e = S.edges, o = []; let cx = 0, cy = 0;
        for (let i = 0; i < e.length; i += 9) { const x = e[i] % s.w, y = (e[i] - x) / s.w; o.push([x, y]); cx += x; cy += y; }
        cx /= o.length; cy /= o.length; o.sort((a, b) => Math.atan2(a[1] - cy, a[0] - cx) - Math.atan2(b[1] - cy, b[0] - cx));
        return o.filter((_, i) => i % 3 === 0).map(([x, y]) => [c.x + x, c.y + y]); });
      await drag(p, pts.concat(pts.slice(0, 3)), 12);
    }
  };
  const tapCheck = async (p) => { const c = await G(p, () => window.__game.CHECK()); await p.mouse.click(c.x + 56, c.y + 56); };
  const zig = (cx, cy, w, h, n) => Array.from({ length: n }, (_, j) => [cx - w / 2 + w * ((j % 2) ? 1 : 0) + Math.sin(j) * 20, cy - h / 2 + h * j / (n - 1)]);
  const serve = async (p, name) => {
    await ready(p); const t0 = Date.now();
    await carveAll(p); await shot(p, name + '-1-carved');
    await wait(p, () => window.__game.S.k === 'smooth' && !window.__game.S.trim); await smoothAll(p);
    if (await G(p, () => window.__game.S.k === 'smooth')) await tapCheck(p);
    await wait(p, () => window.__game.S.k === 'sparkle'); await p.waitForTimeout(300); await shot(p, name + '-2-sparkle');
    await drag(p, zig(360, 640, 200, 220, 40), 30);
    for (let i = 0; i < 2; i++) { const [x, y] = await G(p, () => window.__game.slotXY(1, 0)); await p.mouse.click(x, y); await p.mouse.click(330 + i * 60, 620); }
    await tapCheck(p); await wait(p, () => window.__game.S.k === 'bath');
    const ms = Date.now() - t0;
    for (const [t, n] of [[0.4, '3-bath-drop'], [1.8, '4-bath-mid'], [4.0, '5-bath-stars']]) { await wait(p, (t) => window.__game.S.reveal.t > t, t); await shot(p, `${name}-${n}`); }
    return ms;
  };

  // 1. load on a throttled phone profile (4x CPU, 1.6 Mbps, 150 ms)
  let p = await open();
  const cdp = await p.context().newCDPSession(p);
  await cdp.send('Network.enable'); await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: 1.6e6 / 8, uploadThroughput: 750e3 / 8 });
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  const t0 = Date.now(); await p.goto(base, { waitUntil: 'commit' });
  await p.waitForFunction(() => window.__frames > 0, null, { timeout: 30000 }); res.firstFrameMs = Date.now() - t0;
  await p.waitForTimeout(300); await shot(p, '00-first-frame-300ms');
  await ready0(p); res.bootDoneMs = Date.now() - t0; await shot(p, '01-boot-done');
  res.idleFrame = await G(p, () => new Promise((ok) => { const ts = []; let q = performance.now(); const f = (n) => { ts.push(n - q); q = n; if (ts.length < 120) requestAnimationFrame(f); else { ts.sort((a, b) => a - b); ok({ p50: +ts[60].toFixed(1), p90: +ts[108].toFixed(1) }); } }; requestAnimationFrame(f); }));

  // 2. fresh player, normal speed: feed handover, order 1 by real gestures
  p = await open(); await p.goto(base); await ready0(p);
  await G(p, () => { window.run('edit'); window.run('play'); }); await p.waitForTimeout(600); await shot(p, '02-after-feed-handover');
  res.handover = await G(p, () => ({ n: window.__game.S.n, step: window.__game.S.k, shape: window.__game.S.order.shape }));
  res.order1Ms = await serve(p, '03-order1');
  // share from the star reveal, when the build has one (button spans x 210-510 or 300-600)
  const shareB = await G(p, () => typeof window.__game.fillShare === 'function');
  if (shareB) {
    await p.mouse.click(400, 1195); await p.waitForTimeout(1500);
    res.share = await G(p, () => { const s = window.__shared; if (!s) return null; const img = s.image; return { title: s.title, text: s.text, hasImage: !!img, w: img && img.width, h: img && img.height }; });
    const url = await G(p, () => { const i = window.__shared && window.__shared.image; return i && i.toDataURL ? i.toDataURL('image/jpeg', 0.85) : null; });
    if (url) fs.writeFileSync(path.join(out, `${tag}-08-share-card.jpg`), Buffer.from(url.split(',')[1], 'base64'));
  }
  const nx = await G(p, () => window.__game.NEXT); await p.waitForTimeout(800); await p.mouse.click(nx.x, nx.y);
  await wait(p, () => window.__game.S.n === 1);
  // 3. order 2 is made from scratch: one shot per making step
  res.makeSteps = [];
  for (let i = 0; i < 9 && await G(p, () => window.__game.isMake(window.__game.S.k)); i++) {
    await ready(p).catch(() => {}); await p.waitForTimeout(400);
    const k = await G(p, () => window.__game.S.k); res.makeSteps.push(k); await shot(p, `04-order2-make-${i}-${k}`);
    await G(p, () => window.__game.nextStep()); await p.waitForTimeout(300);
  }
  await ready(p).catch(() => {}); await shot(p, '05-order2-carve');

  // 4. a returning player after soap 6 (free carve, gift, seasonal shapes in the draft)
  p = await open(undefined, () => { window.__saved = { n: 6, coins: 120, stars: 18 }; }); await p.goto(base); await ready0(p);
  await wait(p, () => window.__game.S.n === 6).catch(() => {}); await p.waitForTimeout(800); await shot(p, '06-order7-start');
  res.order7 = await G(p, () => ({ step: window.__game.S.k, shape: window.__game.S.order.shape }));
  await G(p, () => { const g = window.__game; while (g.isMake(g.S.k)) g.nextStep(); });
  await ready(p).catch(() => {}); await p.waitForTimeout(300); await shot(p, '07-order7-carve');
  await p.waitForTimeout(600);
  // shelf
  await G(p, () => { window.__game.view = 'shelf'; }); await p.waitForTimeout(500); await shot(p, '09-shelf');

  // 5. HUD on small, mid and large phones and a tablet (CSS px, first frame and a making step)
  for (const vp of [[360, 640], [390, 844], [430, 932], [768, 1024]]) {
    p = await open({ width: vp[0], height: vp[1] }); await p.goto(base); await ready0(p); await p.waitForTimeout(500);
    await shot(p, `10-hud-${vp[0]}x${vp[1]}`);
  }
  res.errors = [...new Set(res.errors)];
  fs.writeFileSync(path.join(out, `numbers-${tag}.json`), JSON.stringify(res, null, 1));
  console.log(JSON.stringify(res));
  await browser.close(); server.close();
})().catch((e) => { console.error(e); process.exit(1); });
