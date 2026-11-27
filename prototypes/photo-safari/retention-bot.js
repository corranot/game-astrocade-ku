// PROTOTYPE - NOT FOR PRODUCTION
// Retention bot: plays a fresh save on the real clock like an eager kid (follows the guide trail, snaps every new
// animal, waits for poses, tosses treats, buys the next treat or lens), logs every reward moment, then feeds the
// timeline to a simple quit model to estimate session lengths (share over 300 s, p50, p75). The quit model is an
// estimate, not player data: each simulated player quits after a reward-free gap longer than their patience, or
// at a small steady rate.  Usage: node retention-bot.js <minutes> <out.json>
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const MIN = +process.argv[2] || 15, OUT = process.argv[3] || 'bot.json', KID = process.env.KID !== '0';
const types = { '.js': 'text/javascript', '.html': 'text/html', '.json': 'application/json' };
const srv = http.createServer((q, s) => { const u = q.url.split('?')[0], f = path.join(__dirname, u === '/' ? 'index.html' : u);
  fs.readFile(f, (e, d) => { if (e) { s.writeHead(404); return s.end(); } s.writeHead(200, { 'content-type': types[path.extname(f)] || 'text/plain' }); s.end(d); }); }).listen(0);

(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 240, height: 520 } });
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(`http://localhost:${srv.address().port}/?local&tier=0`);
  await p.waitForFunction(() => window.__game && window.__game.loaded, null, { timeout: 60000 });
  await p.mouse.click(120, 260); // the first gesture
  const t0 = Date.now(), events = [], samples = [];
  let last = null;
  while (Date.now() - t0 < MIN * 60000) {
    const st = await p.evaluate((KID) => {
      const g = __game, S = g.S, h = g.hero, now = performance.now();
      // kid mode: slower hands. Pauses to look at each new photo and around, reacts late, misses some poses
      const k = (window.__kid = window.__kid || { idle: 0, stamps: 0 });
      if (document.getElementById('book') && !document.getElementById('book').hidden) g.closeBook();
      else if (g.ftue === 'book') g.openBook(); // the tutorial's book step: open it once, as the spotlight asks
      const stamps = Object.values(S.slots).reduce((n, v) => n + (v & 1) + ((v >> 1) & 1) + ((v >> 2) & 1), 0) + Object.keys(S.rare).length;
      const out = { ftue: g.ftue, hx: +h.x.toFixed(1), hz: +h.z.toFixed(1), stamps, flakes: S.flakes, open: S.open, entered: S.entered, night: g.night() > 0.5, owned: S.owned.length, photos: S.photos, halves: S.halves.length, pages: S.pages.length, rare: Object.keys(S.rare).length, beat: !!g.beat, act: '' };
      if (g.beat) return out;
      if (KID) {
        if (stamps > k.stamps) { k.stamps = stamps; k.idle = now + 3000 + Math.random() * 4000; }
        if (now < k.idle) { out.act = 'look'; return out; }
        if (Math.random() < 0.08) { k.idle = now + 1500 + Math.random() * 3000; }
      }
      // a pulsing moon button appears when only night animals are left; kids tap it after a moment
      const nb = document.getElementById('nightB');
      if (nb && !nb.hidden && (!KID || Math.random() < 0.1)) { nb.click(); out.act = 'night-button'; out.skip = 1; return out; }
      const goal = g.guide();
      // the nearest animal in reach that still has an empty slot
      let near = null, nd = 1e9;
      for (const a of g.animals) { if (!a.present || (a.hide || 0) > 0.6) continue; const d = Math.hypot(a.x - h.x, a.z - h.z); const full = a.rare ? !!S.rare[a.id] : (((S.slots[a.id] | 0) | (g.night() > 0.5 && !S.owned.includes('flash') ? 4 : 0)) & 7) === 7; /* no 3 stars at night without the flash */ if (!full && d < 9 && d < nd) { nd = d; near = a; } }
      if (near) {
        const slots = S.slots[near.id] | 0, wantPose = (!(slots & 2) || !(slots & 4)) && !near.rare; // the 3-star slot needs a pose too
        window.__bw = window.__bw || {}; const w = (window.__bw[near.id] = (window.__bw[near.id] || 0) + 1);
        const inPose = near.pose && near.poseT >= 0;
        if ((!(slots & 1) || inPose || !wantPose || w > 40) && (!KID || Math.random() < 0.45)) { g.snap(); out.act = 'snap'; window.__bw[near.id] = 0; }
        else out.act = 'wait-pose';
        if (near.sp && near.sp.shy) { g.toss(); }
        if (nd > 6) g.walkTo(near.x, near.z);
      } else if (goal) { g.walkTo(goal.x, goal.z); out.act = 'walk'; out.gx = +goal.x.toFixed(1); out.gz = +goal.z.toFixed(1); }
      else { g.walkTo(h.x + Math.sin(performance.now() / 4000) * 10, h.z - 6); out.act = 'wander'; }
      // shy animals nearby: toss a treat; buy the next treat or lens once it is affordable
      g.toss();
      for (const id of ['fish', 'berries', 'zoom2', 'yarn', 'flash', 'slow', 'zoom3']) if (!S.owned.includes(id) && g.buy(id)) { out.bought = id; break; }
      return out;
    }, KID);
    const t = (Date.now() - t0) / 1000; st.t = +t.toFixed(1); samples.push(st);
    if (last) {
      const ev = (k, v) => events.push({ t: st.t, k, v });
      if (st.stamps > last.stamps) ev('stamp', st.stamps);
      if (st.open > last.open) ev('area', st.open);
      if (st.night && !last.night) ev('night', 1);
      if (st.halves > last.halves) ev('half', st.halves);
      if (st.pages > last.pages) ev('page', st.pages);
      if (st.rare > last.rare) ev('rare', st.rare);
      if (st.bought) ev('buy', st.bought);
      if (st.skip) ev('skip', 1);
      if (st.photos > last.photos && st.stamps === last.stamps) ev('photo', st.photos);
    }
    last = st;
    await p.waitForTimeout(300);
  }
  const fps = await p.evaluate(() => __game.fps());
  // what is still missing at the end, and why the bot could not get it
  const left = await p.evaluate(() => { const g = __game, S = g.S; return { flakes: S.flakes, owned: S.owned, day: S.day, night: g.night(), missing: g.animals.filter((a) => !a.rare && ((S.slots[a.id] | 0) & 7) !== 7).map((a) => [a.id, S.slots[a.id] | 0, +a.x.toFixed(0), +a.z.toFixed(0), !!a.present]) }; });
  await b.close(); srv.close();

  // reward moments: anything that fills the book, opens a place, turns night, completes a page or buys something
  const wow = events.filter((e) => e.k !== 'photo' && e.k !== 'skip').map((e) => e.t), gaps = [];
  let prev = 0; for (const t of wow) { gaps.push([prev, t - prev]); prev = t; } gaps.push([prev, MIN * 60 - prev]);
  // quit model: patience ~ lognormal (median 45 s, sigma 0.6) for a reward-free stretch, plus a 3%/min steady quit
  // rate after the first minute. 4000 simulated players, seeded.
  let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const norm = () => Math.sqrt(-2 * Math.log(rnd() + 1e-9)) * Math.cos(2 * Math.PI * rnd());
  const lens = [];
  for (let i = 0; i < 4000; i++) {
    const pat = 45 * Math.exp(0.6 * norm()); let end = MIN * 60;
    for (const [s0, g] of gaps) if (g > pat) { end = Math.min(end, s0 + pat); break; }
    const hz = 0.03 / 60, steady = 60 + -Math.log(rnd() + 1e-9) / hz; end = Math.min(end, steady);
    lens.push(end);
  }
  lens.sort((a, c) => a - c);
  const q = (k) => Math.round(lens[Math.floor(lens.length * k)]);
  const res = {
    minutes: MIN, left, fps, errors: errs.slice(0, 5), events, trace: samples.filter((s, i) => i % 5 === 0).map((s) => [s.t, s.stamps, s.act, s.open, s.entered, s.ftue, s.hx, s.hz, s.gx, s.gz]),
    firstStamp: (events.find((e) => e.k === 'stamp') || {}).t, area2: (events.find((e) => e.k === 'area') || {}).t, firstNight: (events.find((e) => e.k === 'night') || {}).t,
    stampsAt: Object.fromEntries([3, 5, 8, 12, 15].map((m) => [m + 'min', (samples.filter((s) => s.t <= m * 60).pop() || {}).stamps])),
    longestGaps: gaps.slice().sort((a, c) => c[1] - a[1]).slice(0, 6).map(([s, g]) => ({ from: Math.round(s), gapS: Math.round(g) })),
    model: { over300: +(lens.filter((x) => x > 300).length / lens.length).toFixed(3), p50: q(0.5), p75: q(0.75) },
  };
  fs.writeFileSync(OUT, JSON.stringify(res, null, 1));
  console.log(JSON.stringify({ ...res, events: res.events.length }, null, 1));
})();
