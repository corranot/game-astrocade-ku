// PROTOTYPE - NOT FOR PRODUCTION
// Snip It finger: turns touches into cuts. A swipe that crosses a rope cuts it; a tap right beside a rope cuts it
// too, so a small finger never misses. Listeners sit on the game root and never stop the event, so the host page
// still sees every touch.
import { hitRope } from './physics.js';

const SWIPE_TOL = 0.14, TAP_TOL = 0.5, TAP_MOVE = 0.3;

/**
 * root: the game element; scene: the stage (worldAt, fx); getWorld: () => the physics world or null;
 * onCut(hit, angle): called with { id, seg, x, y } when a rope is hit; onTouch(): any touch on the stage.
 */
export function createSlicer(root, scene, getWorld, onCut, onTouch) {
  const fingers = new Map();
  const skip = (e) => e.target && e.target.closest && e.target.closest('button,.sheet');

  function down(e) {
    if (skip(e)) return;
    const [x, y] = scene.worldAt(e.clientX, e.clientY);
    fingers.set(e.pointerId, { x, y, x0: x, y0: y, moved: 0 });
    onTouch();
  }
  function move(e) {
    const f = fingers.get(e.pointerId); if (!f) return;
    const [x, y] = scene.worldAt(e.clientX, e.clientY), W = getWorld();
    f.moved += Math.hypot(x - f.x, y - f.y);
    if (f.moved > 0.05) scene.fx.emit('trail', x, y);
    const hit = W && hitRope(W, f.x, f.y, x, y, SWIPE_TOL);
    if (hit) onCut(hit, Math.atan2(y - f.y, x - f.x));
    f.x = x; f.y = y;
  }
  function up(e) {
    const f = fingers.get(e.pointerId); if (!f) return;
    fingers.delete(e.pointerId);
    const W = getWorld();
    if (W && f.moved < TAP_MOVE) { const hit = hitRope(W, f.x, f.y, f.x, f.y, TAP_TOL); if (hit) onCut(hit, 0); }
  }
  const menu = (e) => e.preventDefault();
  root.addEventListener('pointerdown', down); window.addEventListener('pointermove', move);
  window.addEventListener('pointerup', up); window.addEventListener('pointercancel', up); root.addEventListener('contextmenu', menu);

  return {
    /** Forget every finger (the level changed under them). */
    reset() { fingers.clear(); },
    destroy() {
      root.removeEventListener('pointerdown', down); window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up); root.removeEventListener('contextmenu', menu);
    },
  };
}
