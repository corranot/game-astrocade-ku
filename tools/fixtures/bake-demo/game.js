// PROTOTYPE - NOT FOR PRODUCTION
// Smallest game that uses baked sprites: the fixture for `node tools/bake.js tools/fixtures/bake-demo --check`
// in CI (a code-drawn coin, a sharper star baked at 2x, and a plain badge), drawn each frame from the sheet.
import { sprite, bakeReady } from './bake.js';

const COIN = sprite('coin', 96, 96, (c, w, h) => {
  c.fillStyle = '#ffcc00'; c.beginPath(); c.arc(w / 2, h / 2, w * 0.45, 0, Math.PI * 2); c.fill();
  c.lineWidth = 6; c.strokeStyle = '#b8860b'; c.stroke();
  c.fillStyle = '#b8860b'; c.font = 'bold 48px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('$', w / 2, h / 2 + 2);
});
const STAR = sprite('star', 128, 128, (c, w, h) => {
  c.fillStyle = '#ff5fa2'; c.beginPath();
  for (let i = 0; i < 10; i++) { const r = i % 2 ? w * 0.2 : w * 0.46, a = -Math.PI / 2 + i * Math.PI / 5; c.lineTo(w / 2 + Math.cos(a) * r, h / 2 + Math.sin(a) * r); }
  c.closePath(); c.fill();
}, { scale: 2 });
const BADGE = sprite('badge', 200, 64, (c, w, h) => {
  c.fillStyle = '#2e7d32'; c.fillRect(0, 0, w, h); c.fillStyle = '#fff'; c.fillRect(8, 8, w - 16, h - 16);
});

/** Draws the three sprites; the host calls this. */
async function run() {
  const ctx = document.getElementById('game').getContext('2d');
  await bakeReady();
  const frame = (t) => {
    ctx.fillStyle = '#3ec5ff'; ctx.fillRect(0, 0, 720, 1280);
    COIN.draw(ctx, 312 + Math.sin(t / 400) * 120, 400);
    STAR.draw(ctx, 296, 600);
    BADGE.draw(ctx, 260, 800);
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}
window.run = run;
