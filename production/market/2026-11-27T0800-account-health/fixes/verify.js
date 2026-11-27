// Verify a pulled draft folder: serve it, stub lib, feed handover run('edit')->run('play'), tap, screenshots at phone/tablet sizes.
// Usage: node verify.js <dir> <outdir> <tag>
const { chromium } = require('playwright'); const http = require('http'), fs = require('fs'), path = require('path');
const [dir, out, tag] = process.argv.slice(2); fs.mkdirSync(out, { recursive: true });
const T = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.css': 'text/css' };
const srv = http.createServer((q, r) => { let f = path.join(dir, decodeURIComponent(q.url.split('?')[0])); if (q.url.split('?')[0] === '/') f = path.join(dir, fs.existsSync(path.join(dir, 'index.html')) ? 'index.html' : 'game_code.html');
  fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); } else { r.writeHead(200, { 'content-type': T[path.extname(f)] || 'application/octet-stream' }); r.end(d); } }); });
const cfg = fs.existsSync(path.join(dir, 'game_config.json')) ? fs.readFileSync(path.join(dir, 'game_config.json'), 'utf8') : '{}';
const assets = fs.existsSync(path.join(dir, 'asset_map.json')) ? fs.readFileSync(path.join(dir, 'asset_map.json'), 'utf8') : '{}';
const stub = `window.__errs=[];addEventListener('error',e=>__errs.push(String(e.message)));addEventListener('unhandledrejection',e=>__errs.push('rej: '+(e.reason&&e.reason.message||e.reason)));
window.__share=[];const A=${assets},none=async()=>({});const off={supported:false,async start(){return 'unavailable'},stop(){}};window.gameConfig=${cfg};
window.lib={showGameParameters(){},log(){},getUserGameState:none,deleteUserGameState:none,saveUserGameState:none,addPlayerScoreToLeaderboard:none,getTopNEntriesFromLeaderboard:async()=>[],
async share(o){__share.push({keys:Object.keys(o||{}),hasImage:!!(o&&o.image),title:o&&o.title})},shouldUseTouchControls:()=>true,getAsset:id=>A[id],
haptics:{supported:false,play(){},start(){},stop(){}},motion:Object.assign({tilt:{x:0,y:0},rotationRate:{x:0,y:0,z:0},recenter(){},onShake:()=>()=>{},onSample:()=>()=>{}},off),
camera:Object.assign({video:null,stream:null,async snapshot(){return null}},off),mic:Object.assign({level:0,stream:null,onPeak:()=>()=>{},onWord:()=>()=>{},async wordSupport(){return 'unavailable'}},off)};`;
(async () => {
  await new Promise(r => srv.listen(0, r)); const url = `http://127.0.0.1:${srv.address().port}/`;
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] }); const res = {};
  for (const [w, h] of [[390, 844], [360, 640], [768, 1024]]) {
    const c = await b.newContext({ viewport: { width: w, height: h }, hasTouch: true, isMobile: w < 700, locale: process.env.LOCALE || 'en-US' }); await c.addInitScript(stub);
    const p = await c.newPage(); const pe = []; p.on('pageerror', e => pe.push(String(e).slice(0, 200)));
    await p.goto(url); await p.waitForFunction(() => typeof window.run === 'function', null, { timeout: 30000 }).catch(() => pe.push('no window.run'));
    await p.waitForTimeout(2500);
    await p.evaluate(async () => { try { await window.run('edit'); } catch (e) { __errs.push('edit: ' + e); } try { window.run('play'); } catch (e) { __errs.push('play: ' + e); } });
    await p.waitForTimeout(6000); await p.screenshot({ path: `${out}/${tag}-${w}x${h}-start.jpg`, quality: 75 });
    await p.touchscreen.tap(w / 2, h * 0.6); await p.waitForTimeout(3000);
    await p.screenshot({ path: `${out}/${tag}-${w}x${h}-tap.jpg`, quality: 75 });
    res[`${w}x${h}`] = { pageErrors: pe, errs: await p.evaluate(() => __errs.slice(0, 6)), share: await p.evaluate(() => __share) };
    await c.close();
  }
  console.log(JSON.stringify(res)); await b.close(); srv.close();
})();
