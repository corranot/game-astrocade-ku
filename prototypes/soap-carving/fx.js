// PROTOTYPE - NOT FOR PRODUCTION
/**
 * Things that fly: soap curls peeled by the knife, chunks that break off, crumbs, glitter specks, foam bubbles,
 * twinkles, confetti and water rings. Curls, chunks and crumbs fall in a fake height (z) above the table and,
 * once they come to rest, are painted for good into the pile layer, so a growing heap costs nothing per frame.
 */
const TAU = Math.PI * 2;

/** A curl's shape: a ribbon that winds into a spiral, as local points. */
function curlShape(r, len, turns) {
  const pts = [];
  for (let i = 0; i <= 14; i++) {
    const t = i / 14, a = t * turns * TAU, rad = len * (1 - t * 0.8) * 0.5;
    pts.push([Math.cos(a) * rad + (1 - t) * len * 0.35, Math.sin(a) * rad * 0.8]);
  }
  return pts;
}
function strokeCurl(g, p, x, y, sc) {
  g.save(); g.translate(x, y); g.rotate(p.rot); g.scale(sc, sc);
  g.lineCap = 'round'; g.lineJoin = 'round';
  g.beginPath(); for (let i = 0; i < p.pts.length; i++) { const [a, b] = p.pts[i]; i ? g.lineTo(a, b) : g.moveTo(a, b); }
  g.strokeStyle = p.c2; g.lineWidth = p.wide + 3; g.stroke(); // the darker underside
  g.strokeStyle = p.c; g.lineWidth = p.wide; g.stroke();
  g.strokeStyle = 'rgba(255,255,255,0.55)'; g.lineWidth = Math.max(1, p.wide * 0.3); g.stroke(); // the shine along the ribbon
  g.restore();
}

/** The fx system. pile = the canvas everything lands into. */
export function createFx(pile) {
  const P = []; let pg = pile.getContext('2d');
  const fx = {
    P, pile,
    /** A soap curl leaving (x, y) with ground velocity (vx, vy), colours c (top) and c2 (underside). */
    curl(x, y, vx, vy, c, c2, r, size = 1) {
      if (P.length > 400) return;
      P.push({ k: 'curl', x, y, z: 10 + r() * 14, vx, vy, vz: 160 + r() * 140, rot: r() * TAU, vr: (r() - 0.5) * 9, c, c2, wide: (5 + r() * 4) * size, pts: curlShape(r, (16 + r() * 16) * size, 1.2 + r() * 1.1), land: null });
    },
    /** A chunk of soap (a canvas) falling from (x, y), its top-left corner. */
    chunk(canvas, x, y, vx, vy, r) {
      P.push({ k: 'chunk', canvas, x: x + canvas.width / 2, y: y + canvas.height / 2, z: 6, vx, vy, vz: 120 + r() * 60, rot: 0, vr: (r() - 0.5) * 3, bounced: 0 });
    },
    /** A small piece (crumb, glitter speck) dropped from height z; land(x, y) decides what happens when it lands. */
    speck(x, y, z, vx, vy, c, s, land) { if (P.length < 900) P.push({ k: 'speck', x, y, z, vx, vy, vz: 0, c, s, land }); },
    /** A foam bubble that swells and pops. */
    foam(x, y, r0, life) { if (P.length < 700) P.push({ k: 'foam', x, y, r0, t: 0, life }); },
    /** A four-point twinkle. */
    twinkle(x, y, s, life = 0.5, c = '#FFFFFF') { if (P.length < 800) P.push({ k: 'twinkle', x, y, s, t: 0, life, c }); },
    /** A confetti piece. */
    confetti(x, y, vx, vy, c, r) { if (P.length < 800) P.push({ k: 'conf', x, y, vx, vy, c, rot: r() * TAU, vr: (r() - 0.5) * 12, t: 0, life: 2.2 + r() }); },
    /** A ring of water spreading out. */
    ring(x, y, r0, life) { P.push({ k: 'ring', x, y, r0, t: 0, life }); },
    /** A rising bubble with a rainbow sheen. */
    bubble(x, y, r0, vy, life) { if (P.length < 800) P.push({ k: 'bubble', x, y, r0, vy, t: 0, life }); },

    /** Move everything; landing pieces are painted into the pile. */
    step(dt) {
      for (let i = P.length - 1; i >= 0; i--) {
        const p = P[i];
        if (p.k === 'curl' || p.k === 'chunk' || p.k === 'speck') {
          p.vz -= 900 * dt; p.z += p.vz * dt; p.x += p.vx * dt; p.y += p.vy * dt; if (p.vr) p.rot += p.vr * dt;
          if (p.z <= 0) {
            p.z = 0;
            if (p.k === 'speck') { P.splice(i, 1); if (p.land) p.land(p.x, p.y); else { pg.fillStyle = p.c; pg.beginPath(); pg.arc(p.x, p.y, p.s / 2, 0, TAU); pg.fill(); pg.fillStyle = 'rgba(255,255,255,0.6)'; pg.fillRect(p.x - p.s * 0.25, p.y - p.s * 0.3, p.s * 0.25, p.s * 0.25); } continue; }
            if ((p.bounced = (p.bounced || 0) + 1) < 2 && p.vz < -80) { p.vz = -p.vz * 0.28; p.vx *= 0.5; p.vy *= 0.5; p.vr *= 0.5; continue; }
            P.splice(i, 1); fx.bake(p); continue;
          }
        } else if (p.k === 'conf') { p.t += dt; p.vy += 600 * dt; p.vx *= 0.99; p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt; if (p.t > p.life || p.y > 1320) P.splice(i, 1); }
        else if (p.k === 'bubble') { p.t += dt; p.y += p.vy * dt; p.x += Math.sin(p.t * 5 + p.r0) * 20 * dt; if (p.t > p.life) P.splice(i, 1); }
        else { p.t += dt; if (p.t > p.life) P.splice(i, 1); }
      }
    },
    /** Paint a resting curl or chunk into the pile for good. */
    bake(p) {
      if (p.k === 'curl') { pg.save(); pg.globalAlpha = 0.25; pg.fillStyle = '#5C3446'; pg.beginPath(); pg.ellipse(p.x + 3, p.y + 4, 12 * (p.wide / 7), 8, 0, 0, TAU); pg.fill(); pg.restore(); strokeCurl(pg, p, p.x, p.y, 1); }
      else if (p.k === 'chunk') { pg.save(); pg.translate(p.x, p.y); pg.rotate(p.rot); pg.drawImage(p.canvas, -p.canvas.width / 2, -p.canvas.height / 2); pg.restore(); }
    },
    /** Everything in the air or on show, drawn above the soap. */
    draw(g) {
      for (const p of P) {
        if (p.k === 'curl') {
          if (p.z > 1) { g.fillStyle = 'rgba(92,52,70,0.18)'; g.beginPath(); g.ellipse(p.x, p.y, 12, 7, 0, 0, TAU); g.fill(); }
          strokeCurl(g, p, p.x, p.y - p.z, 1 + p.z / 300);
        } else if (p.k === 'chunk') {
          const sc = 1 + p.z / 500;
          g.fillStyle = 'rgba(92,52,70,0.2)'; g.beginPath(); g.ellipse(p.x, p.y + p.canvas.height * 0.3, p.canvas.width * 0.45, p.canvas.height * 0.25, 0, 0, TAU); g.fill();
          g.save(); g.translate(p.x, p.y - p.z); g.rotate(p.rot); g.scale(sc, sc); g.drawImage(p.canvas, -p.canvas.width / 2, -p.canvas.height / 2); g.restore();
        } else if (p.k === 'speck') { g.fillStyle = p.c; if (p.s > 4) { g.beginPath(); g.arc(p.x, p.y - p.z, p.s / 2, 0, TAU); g.fill(); } else g.fillRect(p.x - p.s / 2, p.y - p.z - p.s / 2, p.s, p.s); }
        else if (p.k === 'foam') {
          const k = p.t / p.life, r = p.r0 * (0.4 + 0.6 * Math.min(1, k * 4)) * (k > 0.85 ? 1 + (k - 0.85) * 3 : 1);
          g.globalAlpha = k > 0.85 ? (1 - k) / 0.15 : 0.95;
          g.fillStyle = 'rgba(255,255,255,0.75)'; g.beginPath(); g.arc(p.x, p.y, r, 0, TAU); g.fill();
          g.strokeStyle = 'rgba(160,210,255,0.9)'; g.lineWidth = 1.5; g.stroke();
          g.fillStyle = '#FFFFFF'; g.beginPath(); g.arc(p.x - r * 0.35, p.y - r * 0.35, r * 0.25, 0, TAU); g.fill();
          g.globalAlpha = 1;
        } else if (p.k === 'twinkle') {
          const k = p.t / p.life, s = p.s * Math.sin(k * Math.PI);
          g.fillStyle = p.c; g.beginPath(); g.moveTo(p.x, p.y - s); g.quadraticCurveTo(p.x, p.y, p.x + s, p.y); g.quadraticCurveTo(p.x, p.y, p.x, p.y + s); g.quadraticCurveTo(p.x, p.y, p.x - s, p.y); g.quadraticCurveTo(p.x, p.y, p.x, p.y - s); g.fill();
        } else if (p.k === 'conf') {
          g.save(); g.translate(p.x, p.y); g.rotate(p.rot); g.fillStyle = p.c; g.fillRect(-7, -4, 14, 8); g.restore();
        } else if (p.k === 'ring') {
          const k = p.t / p.life; g.strokeStyle = `rgba(255,255,255,${0.7 * (1 - k)})`; g.lineWidth = 4 * (1 - k) + 1;
          g.beginPath(); g.ellipse(p.x, p.y, p.r0 * (1 + k * 0.8), p.r0 * 0.9 * (1 + k * 0.8), 0, 0, TAU); g.stroke();
        } else if (p.k === 'bubble') {
          const k = p.t / p.life, r = p.r0;
          g.globalAlpha = k > 0.8 ? (1 - k) * 5 : 1;
          const gr = g.createLinearGradient(p.x - r, p.y - r, p.x + r, p.y + r);
          gr.addColorStop(0, 'rgba(255,150,220,0.55)'); gr.addColorStop(0.5, 'rgba(150,240,255,0.35)'); gr.addColorStop(1, 'rgba(255,240,140,0.55)');
          g.strokeStyle = gr; g.lineWidth = 3; g.fillStyle = 'rgba(255,255,255,0.18)';
          g.beginPath(); g.arc(p.x, p.y, r, 0, TAU); g.fill(); g.stroke();
          g.fillStyle = 'rgba(255,255,255,0.9)'; g.beginPath(); g.arc(p.x - r * 0.4, p.y - r * 0.4, r * 0.2, 0, TAU); g.fill();
          g.globalAlpha = 1;
        }
      }
    },
    /** Count of a kind (or of all). */
    count(k) { return k ? P.filter((p) => p.k === k).length : P.length; },
    /** Drop everything in the air. */
    clear() { P.length = 0; },
    /** Land things on another canvas from now on. */
    setPile(c) { fx.pile = pile = c; pg = c.getContext('2d'); },
  };
  return fx;
}
