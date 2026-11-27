// Live check: public page on phone, grep served code for version markers, tap, collect errors.
const { chromium } = require('playwright');
const G = {
  REEL: ['01M6H8H0CNN2WGAA3VE9GEAFF9', ['shareRareCatch'], ['image:canvas']],
  PIN: ['01M7KYFYEV5SHEP0X8YKQCG2NP', ['description: W.sharePrompt, text: W.sharePrompt'], []],
  PAWS: ['01M864715VW2G1XCCDYA262YEZ', ['golden fish!` });'], ['image: card']],
  NEKO: ['01M86DW148VER9R37N1CN95PEH', ['description: this.shareCaption, text: this.shareCaption })'], []],
  ICE: ['01M7Y5W8MM2NWA5KPRQN4GNRC8', ["description: T('shareCaption') })"], []],
  GRAB: ['01M5E0WJN48YN5H2H0979RMT4P', ['L.desc(lastStats.parked'], ['await snapshot(lastStats)']],
  MEGA: ['01M88DAAFTWX92H6DF0Q73H0MM', ['wallDt'], []],
  VOXEL: ['01M87H6GDS3KK07Q3Z38MZNGXE', ['Sky Island Builder'], ['"sub": "Sky Realms"']],
  DRAW: ['01M7S3R108GQ3T2VKX5P9412MT', ['Snowy'], []],
  SOAP: ['01M7XNBZ4G6HXCWJ8QW902Q4ES', ['Carve away the outside'], []],
};
const only = process.argv[2] ? process.argv[2].split(',') : Object.keys(G); const out = '/tmp/claude-0/live2';
(async () => {
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  await Promise.all(only.map(async k => {
    const [id, must, mustNot] = G[k];
    const c = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, userAgent: 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36' });
    const p = await c.newPage(); const errs = []; const bodies = [];
    p.on('pageerror', e => errs.push('page: ' + String(e).slice(0, 140)));
    p.on('console', m => { if (m.type() === 'error' && !/GSI_LOGGER|FedCM|favicon|Failed to load resource/.test(m.text())) errs.push('console: ' + m.text().slice(0, 140)); });
    p.on('response', async r => { const t = r.headers()['content-type'] || ''; if (/javascript|html|json|text/.test(t)) { try { bodies.push(await r.text()); } catch (e) {} } });
    const r = { };
    try {
      await p.goto('https://www.astrocade.com/games/x/' + id, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await p.waitForTimeout(15000);
      for (const f of p.frames()) { try { bodies.push(await f.content()); } catch (e) {} }
      await p.screenshot({ path: `${out}/${k}-load.jpg`, quality: 70 });
      await p.touchscreen.tap(195, 520); await p.waitForTimeout(3000);
      for (const f of p.frames()) { try { bodies.push(await f.content()); } catch (e) {} }
      await p.screenshot({ path: `${out}/${k}-tap.jpg`, quality: 70 });
      const all = bodies.join('\n'); require('fs').writeFileSync(out + '/' + k + '-served.txt', all);
      const N = x => x.replace(/\s+/g, '').replace(/'/g, '"').replace(/\\"/g, '"'); const na = N(all); r.found = must.map(m => na.includes(N(m))); r.absent = mustNot.map(m => !na.includes(N(m))); r.shareCalls = [...new Set((na.match(/lib\??\.share\??\.?\(\{[^}]{0,200}\}/g) || []))].map(x => x.slice(0, 90) + (x.includes('image') ? ' [IMAGE]' : '')); r.bytes = all.length; r.frames = p.frames().length;
    } catch (e) { r.fail = String(e).slice(0, 150); }
    r.errs = errs.slice(0, 5); console.log(k, JSON.stringify(r)); await c.close();
  }));
  await b.close();
})();
