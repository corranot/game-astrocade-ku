// PROTOTYPE - NOT FOR PRODUCTION
// Buzzy the ride-on mower and Nilo on the seat. The model faces -z (north at heading 0); the deck in front widens
// with the deck upgrade, the wheels spin, the body leans into turns and bounces, the antenna ball lags behind.
// THREE is read when the kart is built.
import { paint, xf, merge, lathe, rbox, blob, cyl, mesh } from './kit.js';
import { buildChibi, animateChibi } from './chibi.js';

export const PAINTS = { teal: ['#1f9c96', '#49c7b8'], coral: ['#e2644a', '#f59a7c'], sunflower: ['#e8a41f', '#f8d15a'], lilac: ['#9274d0', '#c1a8ee'], mint: ['#4fb787', '#93e0b4'], sky: ['#3f8fd8', '#86c2f2'], berry: ['#c2417e', '#ee86b0'], gold: ['#c9962a', '#f3d77a'] };
const CREAM = '#f4ead2', DARK = '#3a3f4d', CORAL = '#e9795b';

function wheelGeo(r, w) {
  const tyre = lathe([[r * 0.55, -w / 2], [r * 0.9, -w / 2], [r, -w * 0.3], [r, w * 0.3], [r * 0.9, w / 2], [r * 0.55, w / 2]], 14);
  const hub = lathe([[0, -w * 0.56], [r * 0.5, -w * 0.56], [r * 0.58, -w * 0.4], [r * 0.58, w * 0.4], [r * 0.5, w * 0.56], [0, w * 0.56]], 10);
  const nuts = []; for (let i = 0; i < 5; i++) { const a = i / 5 * 6.283; nuts.push(paint(xf(blob(r * 0.09, 1, 1, 1, 0), [Math.cos(a) * r * 0.3, w * 0.58, Math.sin(a) * r * 0.3]), CORAL), paint(xf(blob(r * 0.09, 1, 1, 1, 0), [Math.cos(a) * r * 0.3, -w * 0.58, Math.sin(a) * r * 0.3]), CORAL)); }
  const g = merge([paint(tyre, '#2c2f3a', '#454957'), paint(hub, CREAM), ...nuts]); g.rotateZ(Math.PI / 2); return g;
}

/**
 * Builds Buzzy. `look` = { paint: key of PAINTS, hero: chibi look }. Returns { group, setDeck(widthM), setPaint(key),
 * update(dt, t, s), honk(), chibi }, where s = { speed (m/s), turn (-1..1), cutting 0..1, flow 0..1, wave 0..1 }.
 */
export function buildBuzzy(world, look = {}) {
  const THREE = window.THREE, M = world.M, group = new THREE.Group(), body = new THREE.Group(), tilt = new THREE.Group();
  group.add(tilt); tilt.add(body); tilt.position.z = -0.12; tilt.scale.setScalar(0.92); // centres the body on the collision circle and keeps the nose inside it
  let [c0, c1] = PAINTS[look.paint] || PAINTS.teal;
  // chassis, hood with a friendly face, fenders, seat, tail hopper
  const shell = () => merge([
    paint(xf(rbox(0.84, 0.3, 1.36, 0.16, 3), [0, 0.2, 0.08]), c0, c1),
    paint(xf(blob(0.44, 0.92, 0.62, 1.0, 3), [0, 0.56, -0.36]), c0, c1),
    paint(xf(blob(0.3, 0.62, 0.8, 1.05, 2), [-0.47, 0.4, 0.48]), c0, c1), paint(xf(blob(0.3, 0.62, 0.8, 1.05, 2), [0.47, 0.4, 0.48]), c0, c1),
  ]);
  const hopGeo = () => merge([paint(xf(rbox(0.7, 0.34, 0.5, 0.14, 3), [0, -0.17, -0.25]), c0, c1), paint(xf(rbox(0.72, 0.08, 0.08, 0.03, 2), [0, 0.15, -0.05]), CREAM), paint(xf(blob(0.07, 1, 1, 1, 1), [-0.3, -0.03, 0.02]), '#f25c4a'), paint(xf(blob(0.07, 1, 1, 1, 1), [0.3, -0.03, 0.02]), '#f25c4a')]);
  const paintMesh = mesh(shell(), M.enamel); body.add(paintMesh);
  const trim = merge([
    paint(xf(rbox(0.5, 0.14, 0.46, 0.06, 3), [0, 0.5, 0.42]), CREAM, '#fff8e6'), paint(xf(rbox(0.5, 0.5, 0.14, 0.06, 3), [0, 0.52, 0.68], [-0.14, 0, 0]), CREAM, '#fff8e6'),
    paint(xf(rbox(0.9, 0.08, 0.1, 0.035, 2), [0, 0.2, -0.64]), CREAM),
    paint(xf(blob(0.105, 1, 1, 0.6, 2), [-0.19, 0.66, -0.72]), '#fffdf2'), paint(xf(blob(0.105, 1, 1, 0.6, 2), [0.19, 0.66, -0.72]), '#fffdf2'),
    paint(xf(blob(0.05, 1, 1, 0.6, 1), [-0.19, 0.655, -0.775]), DARK), paint(xf(blob(0.05, 1, 1, 0.6, 1), [0.19, 0.655, -0.775]), DARK),
    paint(xf(blob(0.05, 1.6, 0.5, 0.5, 1), [0, 0.53, -0.79]), DARK),
    paint(xf(cyl(0.035, 0.035, 0.5, 8), [0, 0.6, -0.16], [0.75, 0, 0]), DARK), paint(xf(lathe([[0.15, -0.025], [0.185, 0], [0.15, 0.025], [0.125, 0]], 14), [0, 0.98, 0.18], [0.75 - Math.PI / 2, 0, 0]), DARK, '#5a6072'),
    paint(xf(cyl(0.012, 0.008, 0.7, 5), [-0.36, 0.6, 0.86]), '#8d94a6'),
  ]);
  body.add(mesh(trim, M.matte));
  const hopper = mesh(hopGeo(), M.enamel); hopper.position.set(0, 0.47, 1.17); body.add(hopper);
  const chimney = mesh(merge([paint(cyl(0.05, 0.05, 0.5, 8), '#8d94a6', '#c9cfdc'), paint(xf(lathe([[0.05, 0], [0.075, 0.03], [0.07, 0.1], [0.05, 0.1]], 10), [0, 0.46, 0]), CORAL)]), M.matte); chimney.position.set(0.5, 0.42, -0.1); body.add(chimney);
  const bonnet = new THREE.Group(); bonnet.position.set(0, 0.83, -0.42); body.add(bonnet);
  // eyelids that droop when Buzzy is idle and blink now and then
  const lids = [-0.19, 0.19].map((x) => { const l = mesh(paint(blob(0.112, 1, 1, 0.62, 2), c0, c1), M.enamel, false); l.position.set(x, 0.665, -0.722); l.scale.y = 0.01; body.add(l); return l; });
  const ball = mesh(paint(blob(0.07, 1, 1, 1, 1), '#f6b93b', '#ffd97a'), M.matte); ball.position.set(-0.36, 1.33, 0.86); body.add(ball);
  // the cutting deck: one unit wide, scaled on x to the deck width
  const DECK_Z = -0.78; // the deck's centre ahead of the body; its front corners sit kart.deckFrontM ahead of the mower's centre
  const deckGeo = merge([
    paint(xf(rbox(1, 0.2, 0.62, 0.1, 3), [0, 0.03, 0]), c0, c1),
    paint(xf(rbox(1.02, 0.07, 0.1, 0.03, 2), [0, 0.09, -0.3]), CREAM),
    paint(xf(blob(0.1, 1, 0.5, 1, 1), [-0.3, 0.22, 0]), '#f6b93b'), paint(xf(blob(0.1, 1, 0.5, 1, 1), [0.3, 0.22, 0]), '#f6b93b'),
  ]);
  const deck = mesh(deckGeo, M.enamel); deck.position.set(0, 0, DECK_Z); tilt.add(deck);
  // wheels: big at the back, small in front
  const wheels = [];
  for (const [x, z, r, w] of [[-0.5, 0.5, 0.27, 0.2], [0.5, 0.5, 0.27, 0.2], [-0.46, -0.4, 0.18, 0.15], [0.46, -0.4, 0.18, 0.15]]) { const m = mesh(wheelGeo(r, w), M.rubber); m.position.set(x, r, z); m.userData.r = r; tilt.add(m); wheels.push(m); }
  // Nilo on the seat (the chibi faces +z, so it is turned to face the front of the mower)
  let chibi = null, deckW = 1, squash = 1;
  /** Seats Nilo. With look.lazy the caller does this a frame after the first picture; otherwise it happens at once. */
  function seat() {
    if (chibi) return chibi;
    chibi = buildChibi(Object.assign({ top: { color: '#f6c443', sleeve: 0.4 }, bottom: { color: '#3f6fa8', length: 0.5 }, shoes: '#e2533c', hair: { style: 'short', color: '#6a4028' } }, look.hero || {}));
    chibi.group.scale.setScalar(0.72); chibi.group.rotation.y = Math.PI; chibi.group.position.set(0, 0.37, 0.5); body.add(chibi.group);
    chibi.group.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    return chibi;
  }
  if (!look.lazy) seat();

  let hopBase = 1, popT = 0, blinkT = 3;
  let bob = 0, lean = 0, pitchV = 0, pitch = 0, ballX = 0, ballV = 0, honkT = 0, lastSpeed = 0;
  return {
    group, seat, get chibi() { return chibi; }, deck,
    /** Sets the cutting width in metres. */
    setDeck(w) { deckW = w; deck.scale.x = w * squash; },
    /** Squeezes the deck's width (1 = full) and slides it back `pull` metres under the body, so its corners spring in beside a fence or a rock instead of passing through. */
    setSquash(k, pull = 0) { squash = k; deck.scale.x = deckW * k; deck.position.z = DECK_Z + pull / 0.92; },
    setPaint(key) { const p = PAINTS[key] || PAINTS.teal; if (c0 === p[0]) return; [c0, c1] = p; paintMesh.geometry.dispose(); paintMesh.geometry = shell(); hopper.geometry.dispose(); hopper.geometry = hopGeo(); },
    /** Shows the upgrade levels on the model: a taller chimney for the engine, a bigger hopper for the baler. */
    setLevels(up) { chimney.scale.set(1 + up.engine * 0.05, 1 + up.engine * 0.07, 1 + up.engine * 0.05); hopBase = 1 + up.baler * 0.035; },
    popBale() { popT = 0.3; },
    bonnet,
    /** World position of the bonnet top (for things that land on it) and of the chimney top (for puffs). */
    bonnetWorld(v) { return bonnet.getWorldPosition(v); },
    chimneyWorld(v) { return v.set(0, 0.55, 0).applyMatrix4(chimney.matrixWorld); },
    honk() { honkT = 0.35; },
    update(dt, t, s) {
      const sp = s.speed || 0, acc = (sp - lastSpeed) / Math.max(dt, 0.001); lastSpeed = sp;
      for (const w of wheels) w.rotation.x -= sp * dt / w.userData.r;
      lean += ((s.turn || 0) * 0.14 - lean) * Math.min(1, dt * 8);
      pitchV += ((-acc * 0.012 - pitch) * 90 - pitchV * 10) * dt; pitch += pitchV * dt; pitch = Math.max(-0.12, Math.min(0.12, pitch));
      bob = Math.sin(t * 22) * 0.008 * (0.4 + (s.cutting || 0)) + Math.sin(t * 9) * 0.006 * Math.min(1, sp);
      honkT = Math.max(0, honkT - dt); const hk = honkT > 0 ? 1 + Math.sin(honkT / 0.35 * Math.PI) * 0.12 : 1;
      tilt.rotation.z = -lean; body.rotation.x = pitch; body.position.y = bob; body.scale.set(hk, 2 - hk, hk);
      deck.position.y = Math.sin(t * 30) * 0.004 * (s.cutting || 0);
      ballV += ((-(s.turn || 0) * 0.5 - acc * 0.0 - ballX) * 60 - ballV * 5) * dt; ballX += ballV * dt; ball.position.x = -0.36 + ballX * 0.12; ball.position.y = 1.33 - Math.abs(ballX) * 0.03;
      // the hopper swells as it fills and snaps back when the bale pops; a shiver at full Flow; sleepy lids when idle
      popT = Math.max(0, popT - dt); const sw = hopBase * (0.86 + 0.26 * (s.fill || 0)) * (1 - Math.sin(popT / 0.3 * Math.PI) * 0.25); hopper.scale.set(sw, sw, sw);
      if ((s.flow || 0) >= 1) body.position.x = Math.sin(t * 47) * 0.004; else body.position.x = 0;
      blinkT -= dt; if (blinkT < -0.12) blinkT = 2 + Math.random() * 3; const droop = Math.min(0.55, Math.max(0, ((s.idle || 0) - 6) * 0.3)), lid = blinkT < 0 ? 1 : droop; for (const l of lids) l.scale.y = Math.max(0.01, lid);
      if (chibi) animateChibi(chibi, t, dt, { pose: 'drive', poseW: 1, seat: true, wave: s.wave || 0, look: -(s.turn || 0) * 0.4 + (s.glance || 0) }); // Nilo glances toward the camera, so the face reads even when driving away
      if (chibi) { chibi.bones.spine2.rotation.z += lean * 0.8; chibi.bones.upperArmL.rotation.x += (s.turn || 0) * 0.18; chibi.bones.upperArmR.rotation.x -= (s.turn || 0) * 0.18; }
    },
  };
}
