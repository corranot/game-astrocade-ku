// Share-button test: handover run('edit')->run('play'), open the game's share card, click the real button, record lib.share args.
// Usage: node sharetest.js <dir> <outdir> <tag> <kind>   (test-only instrumentation is applied in memory at serve time)
const { chromium } = require('playwright'); const http = require('http'), fs = require('fs'), path = require('path');
const [dir, out, tag, kind] = process.argv.slice(2); fs.mkdirSync(out, { recursive: true });
const T = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.css': 'text/css' };
const patch = (f, s) => {
  if (!f.endsWith('/game.js')) return s;
  if (kind === 'neko' || kind === 'paws') return s.replace('app = new Game(', 'app = window.__app = new Game(');
  if (kind === 'ice') return s.replace('shareCup, makeShareImage,', 'shareCup, makeShareImage, finishCup, R, cfg,');
  if (kind === 'reel') return s.replace('function shareRareCatch(creature,', 'window.__srs=(...a)=>shareRareCatch(...a);function shareRareCatch(creature,');
  return s;
};
const srv = http.createServer((q, r) => { let f = path.join(dir, decodeURIComponent(q.url.split('?')[0])); if (q.url.split('?')[0] === '/') f = path.join(dir, 'index.html');
  fs.readFile(f, 'utf8', (e, d) => { if (e) { r.writeHead(404); r.end(); } else { r.writeHead(200, { 'content-type': T[path.extname(f)] || 'text/plain' }); r.end(patch(f, d)); } }); });
const cfg = fs.readFileSync(path.join(dir, 'game_config.json'), 'utf8');
const stub = `window.__errs=[];addEventListener('error',e=>__errs.push(String(e.message)));addEventListener('unhandledrejection',e=>__errs.push('rej: '+(e.reason&&e.reason.message||e.reason)));
window.__share=[];const none=async()=>({});const off={supported:false,async start(){return 'unavailable'},stop(){}};window.gameConfig=${cfg};
window.lib={showGameParameters(){},log(){},getUserGameState:none,deleteUserGameState:none,saveUserGameState:none,addPlayerScoreToLeaderboard:none,getTopNEntriesFromLeaderboard:async()=>[],
share(o){__share.push({keys:Object.keys(o||{}),hasImage:!!(o&&o.image),activation:navigator.userActivation?navigator.userActivation.isActive:null,title:o&&o.title,text:o&&(o.text||o.description)});return Promise.resolve()},shouldUseTouchControls:()=>true,getAsset:()=>undefined,
haptics:{supported:false,play(){},start(){},stop(){}},motion:Object.assign({tilt:{x:0,y:0},rotationRate:{x:0,y:0,z:0},recenter(){},onShake:()=>()=>{},onSample:()=>()=>{}},off),
camera:Object.assign({video:null,stream:null,async snapshot(){return null}},off),mic:Object.assign({level:0,stream:null,onPeak:()=>()=>{},onWord:()=>()=>{},async wordSupport(){return 'unavailable'}},off)};`;
(async () => {
  await new Promise(r => srv.listen(0, r)); const url = `http://127.0.0.1:${srv.address().port}/`;
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const c = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true }); await c.addInitScript(stub);
  const p = await c.newPage(); const pe = []; p.on('pageerror', e => pe.push(String(e).slice(0, 200)));
  await p.goto(url); await p.waitForFunction(() => typeof window.run === 'function', null, { timeout: 30000 });
  await p.waitForTimeout(2500);
  await p.evaluate(async () => { await window.run('edit'); window.run('play'); });
  await p.waitForTimeout(5000);
  let sel;
  if (kind === 'neko') { await p.locator('.title .play').first().click({ force: true }).catch(() => {}); await p.waitForTimeout(2500); await p.evaluate(() => __app.showShareMoment('MEGA ZOOMIES!')); sel = '#shareBtn'; }
  if (kind === 'paws') { await p.evaluate(() => __app.showShareCard()); sel = '#shareBtn'; }
  if (kind === 'ice') { await p.evaluate(() => { const g = __game; g.S.result = g.R.scoreCup(g.cfg, g.S.order, g.S.made); g.finishCup(); }); await p.waitForTimeout(1500); sel = '#shareBtn'; }
  if (kind === 'pin') { await p.waitForFunction(() => window.__pin && __pin.ready(), null, { timeout: 30000 }).catch(() => pe.push('pin not ready'));
    await p.evaluate(() => { __pin.startBonus(); const b = __pin.S.bonus; b.grow = [1,1,1,1,1]; b.bloom = [1,1,1,1,1]; b.doneT = 2; __pin.S.fade = 0; });
    for (let i = 0; i < 40; i++) { const sc = await p.evaluate(() => __pin.S.screen); if (sc === 'share') break; { const bx = await p.locator('canvas').first().boundingBox(); await p.touchscreen.tap(bx.x + bx.width * 330 / 720, bx.y + bx.height * 1150 / 1280); } await p.waitForTimeout(400); }
    const st = await p.evaluate(() => __pin.S.screen); pe.push('screen=' + st);
    const box = await p.locator('canvas').first().boundingBox(); await p.waitForTimeout(1200);
    await p.screenshot({ path: `${out}/${tag}-sharecard.jpg`, quality: 75 });
    await p.touchscreen.tap(box.x + box.width * 205 / 720, box.y + box.height * 1150 / 1280); await p.waitForTimeout(800);
    console.log(JSON.stringify({ tag, share: await p.evaluate(() => __share), errs: await p.evaluate(() => __errs.slice(0, 5)), pageErrors: pe })); await b.close(); srv.close(); return; }
  if (kind === 'reel') { await p.evaluate(() => __srs({ name: 'Puddlefin Pip', rarity: 'rare', biome: 1 }, 1)); sel = '.rs-share'; }
  if (kind === 'grab') { await p.evaluate(() => __sacShareMoment({ parked: 12, coins: 3400 })); sel = '#share-moment .sm-button'; }
  await p.waitForTimeout(1200);
  const vis = await p.locator(sel).first().isVisible().catch(() => false);
  await p.screenshot({ path: `${out}/${tag}-sharecard.jpg`, quality: 75 });
  await p.locator(sel).first().click({ timeout: 5000, force: true }).catch(e => pe.push('click: ' + String(e).slice(0, 120)));
  await p.waitForTimeout(800);
  console.log(JSON.stringify({ tag, buttonVisible: vis, share: await p.evaluate(() => __share), errs: await p.evaluate(() => __errs.slice(0, 5)), pageErrors: pe }));
  await b.close(); srv.close();
})();
