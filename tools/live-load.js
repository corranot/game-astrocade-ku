// First-frame timing of a game as Astrocade serves it, on a phone profile. Input: a captured srcdoc (the exact
// page the host puts in the game iframe) and the host's RUN_WITH_CONFIG message. A local parent page fetches the
// srcdoc gzipped over the throttled link (as the host fetches play.json.gz), sets it on an iframe, answers the lib's
// requests, and sends RUN_WITH_CONFIG on IFRAME_READY. "first" = first canvas draw call (WebGL draw* or 2D
// drawImage/fill*) seen in the iframe, "frame" = the rAF after it, both ms from parent navigation start.
// Profile: 390x844 phone, 4x CPU, 4G 60 ms / 9 Mbps (PROFILE=slow4g: 150 ms / 1.6 Mbps). Software GL here, so GPU
// work is slower than a phone; compare runs with each other.
// GONE=<selector> adds "gone": when the game's loading overlay is hidden (the real time to play).
// Usage: node tools/live-load.js <srcdoc.html> <msgs.json> [runs] [shot-prefix]   -> one JSON line per run
const { chromium } = require('playwright'); const http = require('http'), fs = require('fs'), zlib = require('zlib');
const [sdPath, msgPath, runsArg, shot] = process.argv.slice(2); const runs = +runsArg || 1;
const sd = zlib.gzipSync(fs.readFileSync(sdPath), { level: 9 });
const rwc = JSON.parse(fs.readFileSync(msgPath, 'utf8')).find(m => m.type === 'RUN_WITH_CONFIG');
const prof = process.env.PROFILE === 'slow4g' ? [150, 1.6e6] : [60, 9e6];
const parent = `<!doctype html><meta name=viewport content="width=device-width,initial-scale=1"><style>html,body{margin:0;height:100%;background:#000}iframe{border:0;width:100%;height:100%;display:block}</style><body><script>
const RWC = ${JSON.stringify(rwc)}; const R = { USER_GAME_STATE_GET: 'USER_GAME_STATE_RESPONSE', USER_GAME_STATE_SET: 'USER_GAME_STATE_RESPONSE', USER_GAME_STATE_DELETE: 'USER_GAME_STATE_RESPONSE', LEADERBOARD_ADD_SCORE: 'LEADERBOARD_RESPONSE', LEADERBOARD_GET_ENTRIES: 'LEADERBOARD_RESPONSE', DEVICE_REQUEST: 'DEVICE_RESPONSE', SHARE_REQUEST: 'SHARE_RESPONSE' };
fetch('/sd').then(r => r.text()).then(t => { window.__sdAt = performance.now(); const f = document.createElement('iframe'); f.allow = 'autoplay; fullscreen'; f.sandbox = 'allow-scripts allow-same-origin allow-pointer-lock allow-popups'; f.srcdoc = t; document.body.appendChild(f);
 addEventListener('message', e => { const d = e.data || {}; if (d.type === 'IFRAME_READY') { window.__readyAt = performance.now();
   // HANDOVER=1: feed handover, the host first runs the game in edit mode, then switches to play
   if (${!!process.env.HANDOVER}) { f.contentWindow.postMessage({ ...RWC, mode: 'edit', runId: 'e' + Date.now() }, '*'); setTimeout(() => f.contentWindow.postMessage({ ...RWC, runId: 'r' + Date.now() }, '*'), 1500); }
   else f.contentWindow.postMessage({ ...RWC, runId: 'r' + Date.now() }, '*'); }
  else if (R[d.type] && d.messageId) f.contentWindow.postMessage({ type: R[d.type], messageId: d.messageId, response: d.type === 'USER_GAME_STATE_GET' ? { data: { success: true, state: ${process.env.SAVE || 'null'} } } : {} }, '*'); // a new player's empty save (SAVE=<json>: a returning player's), in the shape the lib unwraps
  else if (d.type === 'GAME_ERROR') (window.__errs = window.__errs || []).push(String(d.error && d.error.message).slice(0, 160)); }); });
</script>`;
const srv = http.createServer((q, r) => { if (q.url === '/sd') { r.writeHead(200, { 'content-type': 'text/html', 'content-encoding': 'gzip' }); return r.end(sd); }
  r.writeHead(200, { 'content-type': 'text/html' }); r.end(parent); }).listen(0, async () => {
  const port = srv.address().port, b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
  for (let i = 0; i < runs; i++) {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    await ctx.addInitScript(([GONE, MATCH]) => { if (window === top) return; const o = performance.timeOrigin - top.performance.timeOrigin; const T = top.__ft = top.__ft || {};
      const hit = () => { if (T.first) return; T.first = performance.now() + o; requestAnimationFrame(() => requestAnimationFrame(() => { T.frame = performance.now() + o; })); };
      // glMs: main-thread time inside WebGL calls before "frame". Swiftshader does its compile and raster work in the
      // GPU process, so it shows up as the first->frame gap, not in glMs. hwEst = first + 150 ms (one real-GPU frame
      // with its shader compiles) is the hardware-GPU estimate of the first picture.
      T.gl = T.gl || 0; for (const P of [window.WebGLRenderingContext, window.WebGL2RenderingContext].filter(Boolean).map(c => c.prototype)) for (const k of Object.getOwnPropertyNames(P)) { const d = Object.getOwnPropertyDescriptor(P, k); if (!d || typeof d.value !== 'function' || k === 'constructor') continue; const f = d.value; P[k] = function () { if (T.frame) return f.apply(this, arguments); const t = performance.now(); try { return f.apply(this, arguments); } finally { T.gl += performance.now() - t; } }; }
      for (const P of [window.WebGLRenderingContext, window.WebGL2RenderingContext].filter(Boolean).map(c => c.prototype)) for (const k of ['drawArrays', 'drawElements', 'drawArraysInstanced', 'drawElementsInstanced', 'drawRangeElements']) if (P[k]) { const f = P[k]; P[k] = function () { hit(); return f.apply(this, arguments); }; }
      // GONE=<css selector>: also record when that loader overlay is gone (hidden, faded or removed) as "gone"
      const G = GONE; if (G) { let seen = false; const iv = setInterval(() => { const el = document.querySelector(G); if (el) seen = true;
        const cs = el && getComputedStyle(el); if (seen && (!el || cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity < 0.05 || el.classList.contains('done'))) { T.gone = performance.now() + o; clearInterval(iv); } }, 50); }
      // MATCH=<css selector>: also record when that element first exists, e.g. '#loader.ready' (tap-to-play shown), as "match"
      const M = MATCH; if (M) { const iv2 = setInterval(() => { if (document.querySelector(M)) { T.match = performance.now() + o; clearInterval(iv2); } }, 50); }
      const C = CanvasRenderingContext2D.prototype; for (const k of ['drawImage', 'fill', 'fillRect', 'fillText', 'stroke', 'putImageData']) { const f = C[k]; C[k] = function () { if (this.canvas.width > 64 && this.canvas.isConnected) hit(); return f.apply(this, arguments); }; } }, [process.env.GONE || '', process.env.MATCH || '']);
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message.slice(0, 160)));
    const c = await ctx.newCDPSession(p); await c.send('Network.enable');
    await c.send('Network.emulateNetworkConditions', { offline: false, latency: prof[0], downloadThroughput: prof[1] / 8, uploadThroughput: 750e3 / 8 });
    await c.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    let bytes = 0, bytesAtFrame = null; c.on('Network.loadingFinished', e => bytes += e.encodedDataLength);
    // WF=1: print the request waterfall (ms from navigation, kB on the wire)
    const wf = {}, nav = Date.now(); if (process.env.WF) { c.on('Network.requestWillBeSent', e => wf[e.requestId] = { u: e.request.url.slice(0, 110), s: Date.now() - nav });
      c.on('Network.loadingFinished', e => { if (wf[e.requestId]) Object.assign(wf[e.requestId], { e: Date.now() - nav, kB: Math.round(e.encodedDataLength / 1024) }); }); }
    // the iframe is same-process; CDP of the page sees its requests too (srcdoc frames share the renderer)
    // PROF=file.cpuprofile: CPU profile of the first 8 s (summarize with tools/prof-top.py)
    if (process.env.PROF) { await c.send('Profiler.enable'); await c.send('Profiler.setSamplingInterval', { interval: 500 }); await c.send('Profiler.start'); }
    await p.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'commit' });
    const t0 = Date.now(); let shot2 = false;
    // FRAMES=dir: a screenshot about every 250 ms for 10 s (file name = ms since navigation), to find when the
    // picture settles (tools/visual-ready.py)
    if (process.env.FRAMES) { fs.mkdirSync(process.env.FRAMES, { recursive: true });
      while (Date.now() - t0 < 10000) { const ms = Date.now() - t0; await p.screenshot({ path: `${process.env.FRAMES}/${String(ms).padStart(5, '0')}.jpg`, quality: 50, scale: 'css' }); await p.waitForTimeout(150); } }
    while (Date.now() - t0 < 30000) { await p.waitForTimeout(100);
      const ft = await p.evaluate(() => window.__ft || {}); if (ft.frame && bytesAtFrame === null) bytesAtFrame = bytes;
      if (shot && !shot2 && Date.now() - t0 >= 2000) { shot2 = true; await p.screenshot({ path: `${shot}-2s.jpg`, quality: 60, scale: 'css' }); }
      if (ft.frame && (!process.env.GONE || ft.gone) && Date.now() - t0 > Math.max(ft.frame, ft.gone || 0, 2000) + 500) break; }
    await p.waitForTimeout(6000); if (shot) await p.screenshot({ path: `${shot}-8s.jpg`, quality: 60, scale: 'css' });
    if (process.env.PROF) { const { profile } = await c.send('Profiler.stop'); fs.writeFileSync(process.env.PROF, JSON.stringify(profile)); }
    const t = await p.evaluate(() => ({ ...(window.__ft || {}), sd: window.__sdAt, ready: window.__readyAt, gameErrs: window.__errs || [] }));
    const r = { run: i, sdKB: Math.round(sd.length / 1024), kBframe: bytesAtFrame === null ? null : Math.round(bytesAtFrame / 1024), kB8s: Math.round(bytes / 1024), sdAt: Math.round(t.sd), ready: Math.round(t.ready), first: t.first ? Math.round(t.first) : null, frame: t.frame ? Math.round(t.frame) : null, gone: t.gone ? Math.round(t.gone) : undefined, match: t.match ? Math.round(t.match) : undefined, glMs: Math.round(t.gl || 0), hwEst: t.first ? Math.round(t.first + 150) : null, errs: [...errs, ...t.gameErrs].slice(0, 4) };
    if (process.env.EVAL) r.eval = await p.evaluate(process.env.EVAL); // EVAL=<js>: read a probe value from the top page
    if (process.env.WF) for (const w of Object.values(wf).sort((a, b) => a.s - b.s)) console.log('WF', w.s, w.e, w.kB, w.u);
    console.log(JSON.stringify(r)); await ctx.close();
  }
  await b.close(); srv.close();
});
