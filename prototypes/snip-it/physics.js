// PROTOTYPE - NOT FOR PRODUCTION
// Snip It physics: ropes and hanging things in one upright plane (x right, y up, metres). No rendering, no globals:
// the same code runs in the game and in the Node tests. Everything is a point with a mass; a rope is a chain of
// light points held by length links, a hanging thing is one heavy point with a radius. Fixed 1/60 s steps.

export const STEP = 1 / 60;
const ITER = 10, WALL = 3.2;

/** Distance between segment a-b and segment c-d, with the closest point on c-d. */
export function segDist(ax, ay, bx, by, cx, cy, dx, dy) {
  const ux = bx - ax, uy = by - ay, vx = dx - cx, vy = dy - cy, wx = ax - cx, wy = ay - cy;
  const a = ux * ux + uy * uy, b = ux * vx + uy * vy, c = vx * vx + vy * vy, d = ux * wx + uy * wy, e = vx * wx + vy * wy;
  const den = a * c - b * b;
  let s = den > 1e-9 ? (b * e - c * d) / den : 0; s = Math.max(0, Math.min(1, s));
  let t = c > 1e-9 ? (b * s + e) / c : 0; t = Math.max(0, Math.min(1, t));
  s = a > 1e-9 ? Math.max(0, Math.min(1, (b * t - d) / a)) : 0;
  const px = ax + ux * s, py = ay + uy * s, qx = cx + vx * t, qy = cy + vy * t;
  return { d: Math.hypot(px - qx, py - qy), x: qx, y: qy };
}

/**
 * Builds the world of one level.
 * level.items: [{ id, rope: { ax, ay, n? }, body: { x, y, r, m?, lift?, rest? }, goal: { x, y, r? } }]
 * level.boxes: [{ x0, y0, x1, y1, rest? }] solid blocks things land on; the floor is y = 0.
 * tune.gravityScale scales gravity (creator setting).
 */
export function createWorld(level, tune = {}) {
  const W = { g: 17 * (tune.gravityScale || 1), t: 0, pts: [], links: [], ropes: [], bodies: [], boxes: level.boxes || [] };
  const pt = (x, y, im, r) => { W.pts.push({ x, y, px: x, py: y, im, r, hx: x, hy: y, him: im }); return W.pts.length - 1; };
  level.items.forEach((it, k) => {
    const b = it.body, n = it.rope.n || 7, r = b.r;
    const dx = it.rope.ax - b.x, dy = it.rope.ay - b.y, len = Math.hypot(dx, dy), seg = (len - r) / n;
    const body = { id: it.id, p: pt(b.x, b.y, 1 / (b.m || 1), r), r, ang: 0, w: 0, lift: (b.lift || 0) * (tune.gravityScale || 1), rest: b.rest === undefined ? 0.3 : b.rest,
      goal: it.goal || null, goal0: it.goal || null, x0: b.x, y0: b.y, free: false, freeT: 0, done: false, gone: false, phase: k * 2.1, grounded: false };
    const rope = { id: it.id, links: [], pts: [body.p], cut: false, cutAt: -1 };
    // chain from the hook (fixed) down to the top of the thing; the last link reaches its centre
    let prev = pt(it.rope.ax, it.rope.ay, 0, 0); rope.pts.push(prev);
    for (let i = 1; i < n; i++) {
      const f = (seg * i) / len, cur = pt(it.rope.ax - dx * f, it.rope.ay - dy * f, 20, 0);
      rope.links.push(W.links.push({ a: prev, b: cur, len: seg, cut: false }) - 1); prev = cur; rope.pts.push(cur);
    }
    rope.links.push(W.links.push({ a: prev, b: body.p, len: seg + r, cut: false }) - 1);
    W.bodies.push(body); W.ropes.push(rope);
  });
  return W;
}

/** Cuts rope id at link index seg (clamped). Returns false when it was already cut or unknown. */
export function cut(W, id, seg) {
  const rope = W.ropes.find((r) => r.id === id), body = W.bodies.find((b) => b.id === id);
  if (!rope || rope.cut) return false;
  const k = Math.max(0, Math.min(rope.links.length - 1, seg | 0));
  rope.cut = true; rope.cutAt = k; W.links[rope.links[k]].cut = true;
  body.free = true; body.freeT = 0; body.w = (body.phase % 2 > 1 ? 1 : -1) * 2.2;
  // the upper end springs up, the lower end flicks sideways
  for (let i = 0; i <= k; i++) { const p = W.pts[W.links[rope.links[i]].b]; if (p.im && p.r === 0) p.py -= 0.07; }
  return true;
}

/** The first uncut rope the swipe a-b passes within tol of: { id, seg, x, y }, or null. */
export function hitRope(W, ax, ay, bx, by, tol) {
  let best = null;
  for (const rope of W.ropes) {
    if (rope.cut) continue;
    for (let i = 0; i < rope.links.length; i++) {
      const l = W.links[rope.links[i]], p = W.pts[l.a], q = W.pts[l.b];
      const h = segDist(ax, ay, bx, by, p.x, p.y, q.x, q.y);
      if (h.d <= tol && (!best || h.d < best.d)) best = { id: rope.id, seg: i, x: h.x, y: h.y, d: h.d };
    }
  }
  return best;
}

/** Sends the cut thing `id` to another landing place (a thing cut before its turn). null = its own goal again. */
export function setGoal(W, id, goal) { const b = W.bodies.find((x) => x.id === id); if (b) b.goal = goal || b.goal0; }

/** Hangs thing `id` back on its hook with a whole rope, as the level started. */
export function reset(W, id) {
  const rope = W.ropes.find((r) => r.id === id), b = W.bodies.find((x) => x.id === id); if (!rope || !b) return;
  for (const i of rope.pts) { const p = W.pts[i]; p.x = p.px = p.hx; p.y = p.py = p.hy; p.im = p.him; }
  for (const li of rope.links) W.links[li].cut = false;
  rope.cut = false; rope.cutAt = -1; b.free = false; b.freeT = 0; b.done = false; b.gone = false; b.w = 0; b.ang = 0; b.goal = b.goal0;
}

/** Takes a thing out of the world (it popped or was used up). */
export function remove(W, id) { const b = W.bodies.find((x) => x.id === id); if (b) { b.gone = true; const p = W.pts[b.p]; p.im = 0; p.y = p.py = -50; } }

/** One fixed step. Returns the events of this step: { type: 'arrive' | 'bump', id, speed? }. */
export function step(W, dt = STEP) {
  const ev = [], dt2 = dt * dt;
  W.t += dt;
  for (const p of W.pts) {
    if (!p.im) continue;
    const vx = (p.x - p.px) * 0.995, vy = (p.y - p.py) * 0.995;
    p.px = p.x; p.py = p.y; p.x += vx; p.y += vy - W.g * dt2;
  }
  for (const b of W.bodies) {
    if (b.gone) continue;
    const p = W.pts[b.p];
    p.y += b.lift * dt2;
    if (!b.free && b.lift) { p.x += ((b.x0 - p.x) * 60 - (p.x - p.px) / dt * 6) * dt2; p.y += ((b.y0 - p.y) * 40 - (p.y - p.py) / dt * 5 - b.lift + W.g) * dt2 + Math.sin(W.t * 2 + b.phase) * 0.6 * dt2; } // a tied balloon tugs at its peg, in place
    else if (!b.free) p.x += Math.sin(W.t * 1.3 + b.phase) * 0.9 * dt2; // a little sway keeps the stage alive
    else {
      b.freeT += dt;
      if (b.goal && !b.done) { // drift towards where this thing is meant to land, so every cut ends the same way
        const ax = Math.max(-40, Math.min(40, (b.goal.x - p.x) * 14)) - (p.x - p.px) / dt * 3.5;
        p.x += ax * dt2;
      }
    }
  }
  for (let it = 0; it < ITER; it++) {
    for (const l of W.links) {
      if (l.cut) continue;
      const a = W.pts[l.a], b = W.pts[l.b], dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1e-6, w = a.im + b.im;
      if (!w) continue;
      const k = (d - l.len) / d / w;
      a.x += dx * k * a.im; a.y += dy * k * a.im; b.x -= dx * k * b.im; b.y -= dy * k * b.im;
    }
  }
  for (const p of W.pts) if (p.im && p.r === 0 && p.y < 0.04) { p.y = 0.04; p.px = p.x - (p.x - p.px) * 0.6; }
  for (const b of W.bodies) {
    if (b.gone) continue;
    const p = W.pts[b.p];
    let hit = 0; b.grounded = false;
    const bounce = (nx, ny, rest) => { // reflect the speed along the normal, rub it along the surface
      const vx = p.x - p.px, vy = p.y - p.py, vn = vx * nx + vy * ny;
      if (vn < 0) { const tx = vx - vn * nx, ty = vy - vn * ny; p.px = p.x - (tx * 0.86 - vn * rest * nx); p.py = p.y - (ty * 0.86 - vn * rest * ny); hit = Math.max(hit, -vn / dt); }
      if (ny > 0.7) b.grounded = true;
    };
    if (p.y - b.r < 0) { p.y = b.r; bounce(0, 1, b.rest); }
    if (p.x - b.r < -WALL) { p.x = b.r - WALL; bounce(1, 0, 0.3); } else if (p.x + b.r > WALL) { p.x = WALL - b.r; bounce(-1, 0, 0.3); } // the sides of the stage
    for (const bx of W.boxes) {
      const cx = Math.max(bx.x0, Math.min(bx.x1, p.x)), cy = Math.max(bx.y0, Math.min(bx.y1, p.y));
      const dx = p.x - cx, dy = p.y - cy, d = Math.hypot(dx, dy);
      if (d >= b.r) continue;
      if (d < 1e-6) { p.y = bx.y1 + b.r; bounce(0, 1, bx.rest === undefined ? b.rest : bx.rest); continue; }
      p.x = cx + dx / d * b.r; p.y = cy + dy / d * b.r; bounce(dx / d, dy / d, bx.rest === undefined ? b.rest : bx.rest);
    }
    if (hit > 2.5) ev.push({ type: 'bump', id: b.id, speed: hit });
    const vx = (p.x - p.px) / dt;
    if (b.grounded && b.done) p.px = p.x - (p.x - p.px) * 0.93; // a thing that has had its ending rolls to a stop
    if (b.grounded) b.w = -vx / b.r; else b.w *= 0.995;
    b.ang += b.w * dt;
    if (b.free && b.goal && !b.done) {
      const near = Math.hypot(p.x - b.goal.x, p.y - b.goal.y) <= (b.goal.r || 0.6);
      if (near || b.freeT > 2.4) { b.done = true; ev.push({ type: 'arrive', id: b.id, late: !near }); }
    }
  }
  return ev;
}
