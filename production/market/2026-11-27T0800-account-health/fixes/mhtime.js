const { chromium } = require('playwright'); const http = require('http'), fs = require('fs'), path = require('path');
const dir = process.argv[2], out = process.argv[3];
const T = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json' };
const srv = http.createServer((q, r) => { let f = path.join(dir, q.url.split('?')[0] === '/' ? 'index.html' : decodeURIComponent(q.url.split('?')[0])); fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); } else { r.writeHead(200, { 'content-type': T[path.extname(f)] || 'application/octet-stream' }); r.end(d); } }); });
const cfg = fs.readFileSync(path.join(dir, 'game_config.json'), 'utf8'), assets = fs.readFileSync(path.join(dir, 'asset_map.json'), 'utf8');
(async () => {
  await new Promise(r => srv.listen(0, r)); const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const c = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  await c.addInitScript(`window.__errs=[];addEventListener('error',e=>__errs.push(String(e.message)));const A=${assets},none=async()=>({});window.gameConfig=${cfg};window.lib={showGameParameters(){},log(){},getUserGameState:none,deleteUserGameState:none,saveUserGameState:none,addPlayerScoreToLeaderboard:none,getTopNEntriesFromLeaderboard:async()=>[],async share(){},shouldUseTouchControls:()=>true,getAsset:id=>A[id],haptics:{supported:false,play(){},start(){},stop(){}}};`);
  const p = await c.newPage(); const pe = []; p.on('pageerror', e => pe.push(String(e).slice(0, 160)));
  await p.goto(`http://127.0.0.1:${srv.address().port}/`); await p.waitForFunction(() => typeof window.run === 'function', null, { timeout: 30000 });
  await p.waitForTimeout(3000); await p.evaluate(() => { window.run('edit'); window.run('play'); }); const t0 = Date.now(); const log = [];
  for (let i = 0; i < 20; i++) { await p.waitForTimeout(500); const s = await p.evaluate(() => { const g = window.__game || window.__mh || window.__dbg; try { const k = Object.keys(window).find(k => k.startsWith('__') && window[k] && typeof window[k] === 'object' && 'cine' in window[k]); const o = k && window[k]; return { k, cine: o && o.cine, iw: o && o.introWait }; } catch (e) { return String(e); } }); log.push([((Date.now() - t0) / 1000).toFixed(1), JSON.stringify(s)]); if (i === 3 || i === 9) await p.screenshot({ path: `${out}-${i}.jpg`, quality: 70 }); }
  console.log(log.map(l => l.join(' ')).join('\n')); console.log('errors', pe, await p.evaluate(() => __errs)); await b.close(); srv.close();
})();
