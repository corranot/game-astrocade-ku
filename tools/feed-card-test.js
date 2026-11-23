// What a feed visitor sees of a game BEFORE playing: the Astrocade card shows the live, muted game behind a 50% black
// layer with a blur, and the thumbnail plus the Play button cover the middle (measured on the live card 2026-11-23:
// thumbnail 235x352 at x 98, y 220 of the 430x764 game box, Play button right under it). Only a ring shows: the top
// band, two side strips and the bottom band. This plays a game untouched for a few seconds, builds that card view
// for every frame and measures the ring: how bright it is, how colourful, how much it moves, how often it flashes.
// Usage: node tools/feed-card-test.js <game folder> [strip.png]        (our game, served locally with ?local)
//        node tools/feed-card-test.js --id <astrocade game id> [strip.png]   (a live card, watched as a guest: no taps)
// Prints JSON observations (numbers to compare between games and versions), never a verdict.
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');

const args = process.argv.slice(2), live = args[0] === '--id';
const target = live ? args[1] : args[0], strip = live ? args[2] : args[1];
if (!target) { console.error('usage: node tools/feed-card-test.js <game folder> [strip.png] | --id <game id> [strip.png]'); process.exit(1); }

// the card in fractions of the game box
const CARD = { thumb: { l: 98 / 430, t: 220 / 764, r: 333 / 430, b: 572 / 764 }, play: { l: 98 / 430, t: 580 / 764, r: 333 / 430, b: 620 / 764 }, dim: 0.5, blur: 1 / 120 };
const SECONDS = 6, EVERY = 250, W = 180, H = 320;
const types = { '.js': 'text/javascript', '.mjs': 'text/javascript', '.html': 'text/html', '.json': 'application/json', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.mp3': 'audio/mpeg' };

(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const shots = [];
  let server = null, startedAfter = null;
  if (live) {
    const page = await (await browser.newContext({ viewport: { width: 430, height: 932 }, isMobile: true, hasTouch: true })).newPage();
    const t0 = Date.now();
    await page.goto(`https://www.astrocade.com/games/x/${target}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    // the card counts from the moment the game's frame is on screen
    await page.waitForSelector('iframe', { timeout: 30000 });
    startedAfter = Date.now() - t0;
    const t1 = Date.now();
    for (let i = 0; i < SECONDS * 1000 / EVERY; i++) { await page.waitForTimeout(Math.max(0, i * EVERY - (Date.now() - t1))); shots.push({ t: Date.now() - t1, png: await page.screenshot({ clip: { x: 0, y: 32, width: 430, height: 764 } }) }); }
  } else {
    const dir = path.resolve(target);
    server = http.createServer((q, s) => { const f = path.join(dir, q.url.split('?')[0] === '/' ? 'index.html' : q.url.split('?')[0]); fs.readFile(f, (e, d) => { if (e) { s.writeHead(404); return s.end(); } s.writeHead(200, { 'content-type': types[path.extname(f)] || 'text/plain' }); s.end(d); }); }).listen(0);
    const page = await browser.newPage({ viewport: { width: 360, height: 640 }, hasTouch: true, isMobile: true });
    const t0 = Date.now();
    await page.goto(`http://localhost:${server.address().port}/?local`);
    // the same starting point as the live card: the first frame the game draws
    await page.waitForFunction(() => document.querySelector('canvas'), null, { timeout: 60000 });
    startedAfter = Date.now() - t0;
    const t1 = Date.now();
    for (let i = 0; i < SECONDS * 1000 / EVERY; i++) { await page.waitForTimeout(Math.max(0, i * EVERY - (Date.now() - t1))); shots.push({ t: Date.now() - t1, png: await page.screenshot() }); }
  }

  // build the card view of every frame in a blank page (canvas does the blur and the dim) and read the ring
  const lab = await browser.newPage({ viewport: { width: W * 6, height: H } });
  await lab.setContent('<!doctype html><body style="margin:0;background:#000"><canvas id="c"></canvas><canvas id="s"></canvas></body>');
  const res = await lab.evaluate(async ({ frames, CARD, W, H, live }) => {
    const c = document.getElementById('c'); c.width = W; c.height = H; const x = c.getContext('2d', { willReadFrequently: true });
    const s = document.getElementById('s'); s.width = W * 6; s.height = H; const sx = s.getContext('2d');
    const inBox = (px, py, b) => px >= b.l * W && px < b.r * W && py >= b.t * H && py < b.b * H;
    const ring = []; for (let py = 0; py < H; py++) for (let px = 0; px < W; px++) if (!inBox(px, py, CARD.thumb) && !inBox(px, py, CARD.play)) ring.push((py * W + px) * 4);
    const out = []; let prev = null;
    for (let i = 0; i < frames.length; i++) {
      const img = new Image(); img.src = 'data:image/png;base64,' + frames[i]; await img.decode();
      x.filter = live ? 'none' : `blur(${(W * CARD.blur).toFixed(2)}px)`; x.globalAlpha = 1; x.drawImage(img, 0, 0, W, H); x.filter = 'none';
      // a live card is already dimmed and blurred by the host
      if (!live) { x.globalAlpha = CARD.dim; x.fillStyle = '#000'; x.fillRect(0, 0, W, H); x.globalAlpha = 1; }
      const d = x.getImageData(0, 0, W, H).data; const lum = new Float32Array(ring.length); let L = 0, S = 0;
      for (let k = 0; k < ring.length; k++) { const j = ring[k], r = d[j], g = d[j + 1], b = d[j + 2], mx = Math.max(r, g, b), mn = Math.min(r, g, b); lum[k] = 0.2126 * r + 0.7152 * g + 0.0722 * b; L += lum[k]; S += mx ? (mx - mn) / mx : 0; }
      let M = 0, moved = 0; if (prev) for (let k = 0; k < lum.length; k++) { const dd = Math.abs(lum[k] - prev[k]); M += dd; if (dd > 10) moved++; }
      out.push({ luma: L / ring.length, sat: S / ring.length, motion: prev ? M / lum.length : 0, moved: prev ? moved / lum.length : 0 });
      prev = lum;
      // six frames across the run, as the card shows them, for the eye
      const slot = Math.round(i * 5 / (frames.length - 1));
      if (Math.round(slot * (frames.length - 1) / 5) === i) { x.fillStyle = '#46465a'; const t = CARD.thumb, p = CARD.play; x.fillRect(t.l * W, t.t * H, (t.r - t.l) * W, (t.b - t.t) * H); x.fillStyle = '#fff'; x.fillRect(p.l * W, p.t * H, (p.r - p.l) * W, (p.b - p.t) * H); sx.drawImage(c, slot * W, 0); }
    }
    return out;
  }, { frames: shots.map((f) => f.png.toString('base64')), CARD, W, H, live });
  if (strip) await lab.locator('#s').screenshot({ path: strip });

  const r1 = (v) => +v.toFixed(1), r3 = (v) => +v.toFixed(3);
  const avg = (a) => a.reduce((p, q) => p + q, 0) / (a.length || 1);
  const lum = res.map((f) => f.luma), mot = res.slice(1).map((f) => f.motion);
  // a flash: the whole ring gets clearly brighter from one frame to the next
  const flashes = res.filter((f, i) => i > 0 && f.luma - res[i - 1].luma >= 8).length;
  const firstMove = res.findIndex((f, i) => i > 0 && f.moved >= 0.08);
  const obs = {
    target, live, frames: res.length, seconds: SECONDS, gameOnScreenAfterMs: startedAfter,
    ring: {
      lumaMean: r1(avg(lum)), lumaMin: r1(Math.min(...lum)), lumaMax: r1(Math.max(...lum)),
      saturationMean: r3(avg(res.map((f) => f.sat))),
      motionMean: r1(avg(mot)), motionPeak: r1(Math.max(...mot)),
      movingShareMean: r3(avg(res.slice(1).map((f) => f.moved))),
      framesWithMotion: res.filter((f, i) => i > 0 && f.moved >= 0.08).length,
      flashes, firstBigMotionAtSec: firstMove < 0 ? null : r1(shots[firstMove].t / 1000),
    },
    note: 'ring = what shows around the thumbnail and Play button; luma 0-255 after the 50% dim; motion = mean brightness change per ring pixel between frames 0.25 s apart; movingShare = share of ring pixels that changed by more than 10; SwiftShader frame rate is lower than a phone, so motion here is a floor',
  };
  console.log(JSON.stringify(obs, null, 1));
  await browser.close(); if (server) server.close();
})().catch((e) => { console.error(e); process.exit(1); });
