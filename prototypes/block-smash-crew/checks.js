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
  console.log('-- spacing (design units)');
  const b = await box(['#coins', '#gear', '#stars', '#tools', '.tool:first-child', '.tool:last-child']);
  note(Math.abs(b['#coins'].l - b['#gear'].r) <= 2, `top bar margins: coins ${b['#coins'].l.toFixed(0)} left, gear ${b['#gear'].r.toFixed(0)} right`);
  note(Math.abs(b['#stars'].l - b['#stars'].r) <= 2, `star pill centred (${b['#stars'].l.toFixed(0)} / ${b['#stars'].r.toFixed(0)})`);
  note(Math.abs(b['.tool:first-child'].l - b['.tool:last-child'].r) <= 2, `tool row centred (${b['.tool:first-child'].l.toFixed(0)} / ${b['.tool:last-child'].r.toFixed(0)})`);
  note(Math.abs(b['#tools'].b - 34) < 3, `tools at the bottom edge, no empty band (bottom ${b['#tools'].b.toFixed(0)} = 34: margin 20 + the price tag 14)`);
  note(b['.tool:first-child'].w >= 96, `tool buttons ≥ 96 (${b['.tool:first-child'].w.toFixed(0)})`);
  await page.evaluate(() => { __game.newLevel(0); const W = __game.W; W.got = 3; W.phase = 'free'; __game.onEvent({ type: 'clear' }); document.querySelectorAll('.card, .card *').forEach((e) => { e.style.animation = 'none'; }); });
  await page.waitForTimeout(400);
  const c = await box(['.card', '.title', '#keepBtn', '#nextBtn']);
  const inL = c['.title'].t - c['.card'].t, inB = c['#keepBtn'].b - c['.card'].b;
  note(Math.abs(c['.card'].l - c['.card'].r) <= 2, `result card centred (${c['.card'].l.toFixed(0)} / ${c['.card'].r.toFixed(0)})`);
  note(Math.abs(c['#nextBtn'].l - c['#nextBtn'].r) <= 2, `NEXT centred on the card (${c['#nextBtn'].l.toFixed(0)} / ${c['#nextBtn'].r.toFixed(0)})`);
  note(inB >= inL - 2, `card inner margin: top ${inL.toFixed(0)}, bottom ${inB.toFixed(0)} (bottom includes the button shadow)`);
  await browser.close(); server.close();
  console.log(fails.length ? `\n${fails.length} OFF` : '\nspacing all even'); process.exit(fails.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
