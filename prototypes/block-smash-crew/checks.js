// PROTOTYPE - NOT FOR PRODUCTION
// Look checks that are numbers. (1) Colour: CIE Lab distance of every building material against the lawn and the
// sky, the star block against every material it can sit in, the hero's vest and hat against the walls. (2) Spacing
// on the HUD and the result card in 720-unit design space: margins left = right, the tool row centred and above the
// guest login sheet, the card's inner margins even. Prints observations; exits 1 when a spacing rule is off by more
// than 2 units (colour lines are observations only).
// Usage: node checks.js
const fs = require('fs');
const { chromium } = require('playwright');
const { serve, open, GPU } = require('./playtest.js');
const cfg = JSON.parse(fs.readFileSync(__dirname + '/game_config.json'));
const lab = (hex) => { const n = parseInt(hex.slice(1), 16), f = (c) => { c /= 255; return c > 0.04045 ? Math.pow((c + 0.055) / 1.055, 2.4) : c / 12.92; };
  const r = f(n >> 16), g = f((n >> 8) & 255), b = f(n & 255); const X = (r * 0.4124 + g * 0.3576 + b * 0.1805) / 0.95047, Y = r * 0.2126 + g * 0.7152 + b * 0.0722, Z = (r * 0.0193 + g * 0.1192 + b * 0.9505) / 1.08883;
  const h = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116); return [116 * h(Y) - 16, 500 * (h(X) - h(Y)), 200 * (h(Y) - h(Z))]; };
const dE = (a, b) => { const p = lab(a), q = lab(b); return Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]); };
const GRASS = '#6fd14a', SKY = '#3aa8ff', HORIZON = '#d9f3ff', VEST = '#ff8a1f', HAT = '#ffd21f';
const col = Object.fromEntries(cfg.materials.map((m) => [m.id, m.color]));
console.log('-- colour (ΔE Lab; under 22 = may blend)');
for (const m of cfg.materials) { const g = dE(m.color, GRASS), s = Math.min(dE(m.color, SKY), dE(m.color, HORIZON)); if (g < 22 || s < 22) console.log(`note ${m.id}: vs lawn ${g.toFixed(0)}, vs sky ${s.toFixed(0)}`); }
const starLow = cfg.materials.filter((m) => m.id !== 'star').map((m) => [m.id, dE(col.star, m.color)]).filter(([, d]) => d < 22);
console.log(starLow.length ? `note star block close to: ${starLow.map(([i, d]) => `${i} ${d.toFixed(0)}`).join(', ')} (its beacon and floating mark still show it)` : 'ok   the star block stands out from every material');
const heroLow = cfg.materials.filter((m) => dE(VEST, m.color) < 22 && dE(HAT, m.color) < 22).map((m) => m.id);
console.log(heroLow.length ? `note hero vest AND hat close to: ${heroLow.join(', ')}` : 'ok   the hero (vest or hat) stands out from every material');

(async () => {
  const server = serve(), browser = await chromium.launch({ args: GPU }); const fails = [];
  const note = (ok, m) => { console.log((ok ? 'ok   ' : 'OFF  ') + m); if (!ok) fails.push(m); };
  const { page } = await open(browser, '', { port: server.address().port });
  const box = (sels) => page.evaluate((sels) => { const a = document.querySelector('#app').getBoundingClientRect(), k = 720 / a.width, o = {}; for (const s of sels) { const e = document.querySelector(s); if (!e) continue; const r = e.getBoundingClientRect(); o[s] = { l: (r.left - a.left) * k, r: (a.right - r.right) * k, t: (r.top - a.top) * k, b: (a.bottom - r.bottom) * k, w: r.width * k, h: r.height * k }; } return o; }, sels);
  // the HUD is measured in play: the attract show before the first touch puts it away
  await page.evaluate(() => __game.newLevel(0)); await page.waitForTimeout(400);
  console.log('-- spacing (design units)');
  const b = await box(['#coins', '#gear', '#stars', '#tools', '.tool:first-child', '.tool:last-child']);
  note(Math.abs(b['#coins'].l - b['#gear'].r) <= 2, `top bar margins: coins ${b['#coins'].l.toFixed(0)} left, gear ${b['#gear'].r.toFixed(0)} right`);
  note(Math.abs(b['#stars'].l - b['#stars'].r) <= 2, `star pill centred (${b['#stars'].l.toFixed(0)} / ${b['#stars'].r.toFixed(0)})`);
  note(Math.abs(b['.tool:first-child'].l - b['.tool:last-child'].r) <= 2, `tool row centred (${b['.tool:first-child'].l.toFixed(0)} / ${b['.tool:last-child'].r.toFixed(0)})`);
  note(Math.abs(b['#tools'].b - 34) < 3, `tools at the bottom edge, no empty band (bottom ${b['#tools'].b.toFixed(0)} = 34: margin 20 + the price tag 14)`);
  note(b['.tool:first-child'].w >= 96, `tool buttons ≥ 96 (${b['.tool:first-child'].w.toFixed(0)})`);
  await page.evaluate(() => { __game.newLevel(0); const W = __game.W; W.got = 3; W.phase = 'free'; __game.cardDue(); __game.onEvent({ type: 'clear' }); document.querySelectorAll('.card, .card *').forEach((e) => { e.style.animation = 'none'; }); });
  await page.waitForTimeout(400);
  const c = await box(['.card', '.title', '#keepBtn', '#nextBtn']);
  const inL = c['.title'].t - c['.card'].t, inB = c['#keepBtn'].b - c['.card'].b;
  note(Math.abs(c['.card'].l - c['.card'].r) <= 2, `result card centred (${c['.card'].l.toFixed(0)} / ${c['.card'].r.toFixed(0)})`);
  note(Math.abs(c['#nextBtn'].l - c['#nextBtn'].r) <= 2, `NEXT centred on the card (${c['#nextBtn'].l.toFixed(0)} / ${c['#nextBtn'].r.toFixed(0)})`);
  note(inB >= inL - 2, `card inner margin: top ${inL.toFixed(0)}, bottom ${inB.toFixed(0)} (bottom includes the button shadow)`);
  // every special barrel is drawn in its own colour where it stands: seen from a free cell next to it, the patch of
  // screen at the barrel holds pixels of that colour (the barrels were once culled away inside buildings)
  console.log('-- special barrels (drawn, in their colour)');
  const hueOf = (hex) => { const n = parseInt(hex.slice(1), 16), r = (n >> 16) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255, mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn || 1; return ((mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4) * 60 + 360) % 360; };
  for (const lv of [0, 2]) {
    await page.evaluate((n) => __game.newLevel(n), lv); await page.waitForTimeout(900);
    for (const c of await page.evaluate(() => __game.W.kegCells.filter((c) => c.k))) {
      const stood = await page.evaluate(([c]) => { const G = __game, W = G.W, h = W.hero; let best = null;
        for (let dz = -4; dz <= 4; dz++) for (let dx = -4; dx <= 4; dx++) { const d = Math.hypot(dx, dz); if (d < 2.2 || d > 4) continue; const x = c.x + dx, z = c.z + dz; let ok = true;
          for (let y = 0; y < 3; y++) if (W.g.get(x, y, z)) ok = false;
          for (let k = 1; k < 8 && ok; k++) { const px = Math.floor(x + 0.5 + (c.x - x) * k / 8), pz = Math.floor(z + 0.5 + (c.z - z) * k / 8); if ((px !== c.x || pz !== c.z) && (W.g.get(px, 0, pz) || W.g.get(px, 1, pz))) ok = false; }
          if (ok && (!best || d < best[2])) best = [x, z, d]; }
        if (!best) return false; h.x = best[0] + 0.5; h.z = best[1] + 0.5;
        let d = Math.atan2(c.x + 0.5 - h.x, c.z + 0.5 - h.z) - Math.PI - G.scene.yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); G.scene.look(d, -0.42 - G.scene.pitch); return true; }, [c]);
      if (!stood) { note(false, `level ${lv + 1} ${c.k} barrel: no free cell with a clear view next to it`); continue; }
      await page.waitForTimeout(700);
      const [cx, cy] = await page.evaluate(([c]) => { const G = __game; return G.client(...G.scene.screenOf(c.x + 0.5, c.y + 0.5, c.z + 0.5)); }, [c]);
      const png = await page.screenshot({ clip: { x: Math.max(0, cx - 22), y: Math.max(0, cy - 22), width: 44, height: 44 } });
      const want = hueOf(cfg.keg.kinds.find((k) => k.id === c.k).color);
      const share = await page.evaluate(async ([b64, want]) => { const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode();
        const cv = document.createElement('canvas'); cv.width = img.width; cv.height = img.height; const x = cv.getContext('2d'); x.drawImage(img, 0, 0);
        const d = x.getImageData(0, 0, cv.width, cv.height).data; let n = 0;
        for (let i = 0; i < d.length; i += 4) { const r = d[i] / 255, g = d[i + 1] / 255, b = d[i + 2] / 255, mx = Math.max(r, g, b), mn = Math.min(r, g, b), dl = mx - mn; if (dl < 0.25 * mx || mx < 0.25) continue;
          const h = ((mx === r ? ((g - b) / dl) % 6 : mx === g ? (b - r) / dl + 2 : (r - g) / dl + 4) * 60 + 360) % 360, off = Math.abs(((h - want + 540) % 360) - 180); if (off < 28) n++; }
        return n / (d.length / 4); }, [png.toString('base64'), want]);
      // a barrel that is not drawn gives 0%; the hammer in the hand and the white band cover part of a drawn one
      note(share > 0.05, `level ${lv + 1} ${c.k} barrel shows its colour (${Math.round(share * 100)}% of the patch at the barrel)`);
    }
  }
  await browser.close(); server.close();
  console.log(fails.length ? `\n${fails.length} OFF` : '\nspacing all even'); process.exit(fails.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
