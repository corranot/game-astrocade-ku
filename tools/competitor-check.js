// Plays one Astrocade game as a guest at phone size and records what it is built with, for the side-by-side
// visual check before choosing or drawing a game (ASTROCADE.md §0.13). Passive: the page's own requests only.
// Writes <out>/<id>/: screenshots of the first seconds and of a few taps and drags, stack.json (libraries,
// code size, asset list, remix flag) from the game's own context file. Plays made by a bot are flagged as
// automated by Astrocade, so this does not inflate anyone's plays.
// Usage: node tools/competitor-check.js <game id> <out folder>
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path'), zlib = require('zlib');
const [id, outRoot] = process.argv.slice(2);
if (!id || !outRoot) { console.error('usage: node tools/competitor-check.js <game id> <out folder>'); process.exit(1); }
const out = path.join(outRoot, id); fs.mkdirSync(out, { recursive: true });

(async () => {
  const b = await chromium.launch();
  const p = await (await b.newContext({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true })).newPage();
  let game = null;
  p.on('response', async (r) => { try { if (/v3\/games\?gameId=/.test(r.url())) game = (await r.json()).game || game; } catch (e) { /* not json */ } });
  await p.goto(`https://www.astrocade.com/games/x/${id}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await p.waitForTimeout(4000);
  for (const sel of ['button:has-text("Play")', 'text=Play']) { const el = p.locator(sel).first(); if (await el.count()) { await el.click({ timeout: 3000 }).catch(() => {}); break; } }
  const shot = (n) => p.screenshot({ path: path.join(out, n + '.png') });
  for (const [ms, n] of [[1500, 'a-01s'], [2000, 'a-03s'], [4000, 'a-07s']]) { await p.waitForTimeout(ms); await shot(n); }
  const box = await p.evaluate(() => { const f = [...document.querySelectorAll('iframe')].sort((a, c) => c.getBoundingClientRect().height - a.getBoundingClientRect().height)[0]; if (!f) return null; const r = f.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; });
  if (box) {
    const at = (fx, fy) => [box.x + box.w * fx, box.y + box.h * fy];
    let k = 0;
    for (const [fx, fy] of [[0.5, 0.73], [0.5, 0.85], [0.5, 0.5], [0.86, 0.9]]) { const [x, y] = at(fx, fy); await p.mouse.click(x, y); await p.waitForTimeout(1500); await shot(`b-tap${++k}`); }
    for (let s = 0; s < 3; s++) { const [x0, y0] = at(0.2, 0.45 + s * 0.05), [x1] = at(0.8, 0.5); await p.mouse.move(x0, y0); await p.mouse.down(); for (let j = 0; j <= 16; j++) await p.mouse.move(x0 + (x1 - x0) * j / 16, y0 + Math.sin(j / 2) * 25, { steps: 2 }); await p.mouse.up(); await p.waitForTimeout(900); await shot(`c-drag${s + 1}`); }
  }
  await b.close();
  const stack = { id, title: game && game.title, by: game && game.username, plays: game && game.plays, likes: game && game.likeCount, disableRemix: game && game.disableRemix };
  const url = game && JSON.stringify(game).match(/https:[^"]*full\.json\.gz/);
  if (url) {
    const raw = Buffer.from(await (await fetch(url[0])).arrayBuffer()); // the CDN may already have undone the gzip
    const ctx = JSON.parse((raw[0] === 0x1f && raw[1] === 0x8b ? zlib.gunzipSync(raw) : raw).toString());
    const code = typeof ctx.game_code === 'string' ? ctx.game_code : JSON.stringify(ctx.game_code || ctx.workspace || '');
    const count = (w) => code.split(w).length - 1;
    stack.codeKB = Math.round(code.length / 1024);
    stack.libs = { three: count('THREE'), pixi: count('PIXI'), phaser: count('Phaser'), spine: count('spine'), canvas2d: count('getContext("2d")') + count("getContext('2d')"), webgl: count('webgl') };
    stack.assets = Object.entries(ctx.asset_map || {}).map(([k, v]) => `${k} (${v.type})`);
    stack.hasDesignDoc = !!ctx.game_design_document;
  }
  fs.writeFileSync(path.join(out, 'stack.json'), JSON.stringify(stack, null, 1));
  console.log(JSON.stringify(stack, null, 1));
})().catch((e) => { console.error(e); process.exit(1); });
