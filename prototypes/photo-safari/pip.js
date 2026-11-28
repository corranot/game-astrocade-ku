// PROTOTYPE - NOT FOR PRODUCTION
// Pip on the chibi rig: the anatomical skinned chibi dressed in the shop outfit (parka, hat and mitts), with the
// instant camera on the chest and a lantern on the belt. Built after the first frame (see game.js); until then the
// group is empty. The outer group keeps the game's hero contract: position and yaw on `group`, `mats.cam` and
// `mats.lamp` tinted by the game. THREE is read from the global only inside functions (never at import).
import { buildChibi, animateChibi, attach, POSES } from './chibi.js';
import { merge } from './critters.js';

const M4 = (x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1, rx = 0, ry = 0, rz = 0) => new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(sx, sy, sz));
const sph = (seg) => new THREE.SphereGeometry(1, seg, Math.round(seg * 0.75));
const cyl = (seg) => new THREE.CylinderGeometry(1, 1, 1, seg, 1);
const ARM_REST = 0.27, PUFF = 0.45; // a kid in a puffy parka holds the arms a little out, so the sleeves never sink into it
const CAM_Z = 0.275; // chest-bone depth of the camera's centre: its back sits on the quilted parka front (0.2), never inside it
const lerp = (a, b, k) => a + (b - a) * k;
const armsUp = (vf) => Math.min(1, vf * 1.7); // the hero hides at vf 0.55, by then the camera is at the eye

/** The chibi look for a shop look { parka, hat, cam }: quilted parka and sleeves in the parka colour, hat and mitts. */
export function pipLook(l) {
  return {
    skin: '#ffd9bf', hair: { style: 'bob', color: '#6b3a26' }, eyes: { color: '#4a2e1e', size: 1.05 }, mouth: 'smile',
    top: { color: l.parka, sleeve: 1 }, bottom: { color: '#3a4a6a', length: 0.8 }, shoes: '#6a3e2a', mitts: l.hat,
    hat: { style: 'beanie', color: l.hat, cuff: l.hat, pom: '#fff4e6' }, coat: { color: l.parka, trim: '#fff8ef' },
  };
}

/**
 * Fills the game's hero shell P = { group, mats: { cam, lamp } } (made before the first frame, while this module
 * loads after it). `P.build(look)` makes (or remakes, for an outfit change) the chibi inside the group.
 * heightM: the head-top height to scale to, so Pip reads the same size from the back camera as before.
 */
export function makePip(heightM, P) {
  const group = P.group, matCam = P.mats.cam, matLamp = P.mats.lamp;
  const matDark = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8 });
  const W = new THREE.Color('#ffffff');
  Object.assign(P, { ready: false, c: null, cam: null, lantern: null, vf: 0, idle: null, scale: 1, inT: 1 });
  // camera: body tinted by the shop colour, dark lens, blue glass, flash, red shutter, strap to the collar
  const camGeo = merge([
    { g: new THREE.BoxGeometry(1, 1, 1, 2, 2, 2), m: M4(0, 0, 0, 0.3, 0.2, 0.13), col: W },
    { g: cyl(16), m: M4(0, -0.01, 0.08, 0.07, 0.06, 0.07, Math.PI / 2), col: new THREE.Color('#2b2f38') },
    { g: cyl(16), m: M4(0, -0.01, 0.112, 0.05, 0.008, 0.05, Math.PI / 2), col: new THREE.Color('#6ab8ff') },
    { g: new THREE.BoxGeometry(1, 1, 1), m: M4(0.09, 0.06, 0.066, 0.06, 0.035, 0.01), col: new THREE.Color('#fff8ef') },
    { g: new THREE.BoxGeometry(1, 1, 1), m: M4(-0.09, 0.11, 0, 0.06, 0.03, 0.05), col: new THREE.Color('#e8513a') },
  ]);
  // the neck strap: per side, two cord segments from the camera's top corner, under the big chin, to the shoulder top;
  // re-laid every frame (layStrap) so it follows the camera and never cuts through the head or the parka
  const strapGeo = merge([{ g: cyl(6), m: M4(0, 0, 0, 0.009, 1, 0.009), col: new THREE.Color('#3a2c22') }]);
  const lampGeo = merge([
    { g: cyl(8), m: M4(0, 0.1, 0, 0.055, 0.03, 0.055), col: new THREE.Color('#3a2c22') },
    { g: cyl(8), m: M4(0, -0.085, 0, 0.07, 0.024, 0.07), col: new THREE.Color('#3a2c22') },
    { g: new THREE.TorusGeometry(0.04, 0.008, 6, 12), m: M4(0, 0.15, 0), col: new THREE.Color('#3a2c22') },
  ]);
  const glowGeo = sph(10).scale(0.058, 0.078, 0.058);

  P.build = (look) => {
    if (P.c) { group.remove(P.c.group); P.c.group.traverse((o) => o.geometry && o.geometry !== camGeo && o.geometry !== strapGeo && o.geometry !== lampGeo && o.geometry !== glowGeo && o.geometry.dispose()); }
    const c = buildChibi(pipLook(look));
    const cam = new THREE.Group(); cam.position.set(0, 0.02, CAM_Z); // rests on the parka front, clear of the quilting
    const cm = new THREE.Mesh(camGeo, matCam); cm.castShadow = true; cam.add(cm);
    attach(c, 'spine3', cam);
    const strap = []; for (let i = 0; i < 4; i++) { const m = new THREE.Mesh(strapGeo, matDark); m.castShadow = true; strap.push(m); attach(c, 'spine3', m); }
    const lantern = new THREE.Group(); lantern.position.set(-0.27, -0.06, 0.07); // on the belt, the character's right hip
    const lm = new THREE.Mesh(lampGeo, matDark); lm.castShadow = true; lantern.add(lm); lantern.add(new THREE.Mesh(glowGeo, matLamp));
    attach(c, 'pelvis', lantern);
    if (!P.ready) { // scale once, from the rest pose with the hat on
      c.group.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(c.group);
      P.scale = heightM / Math.max(0.5, box.max.y);
    }
    c.group.scale.setScalar(P.scale);
    group.add(c.group);
    Object.assign(P, { c, cam, lantern, strap, ready: true }); layStrap(P);
    return P;
  };
  return P;
}

const LUG = [0.135, 0.09, -0.045], SHOULDER = [0.22, 0.13, -0.03], SAG = [0.1, -0.1, 0]; // spine3 space; LUG is on the camera
const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _m = new THREE.Vector3(), _up = new THREE.Vector3(0, 1, 0);
/** Strap points per side [lug, sag, shoulder] in spine3 space, for the current camera position. */
export function strapPoints(P) {
  const c = P.cam.position, r = P.cam.rotation.x;
  return [1, -1].map((sx) => {
    const ly = LUG[1] * Math.cos(r) - LUG[2] * Math.sin(r), lz = LUG[1] * Math.sin(r) + LUG[2] * Math.cos(r);
    const a = [c.x + sx * LUG[0], c.y + ly, c.z + lz], b = [sx * SHOULDER[0], SHOULDER[1], SHOULDER[2]];
    return [a, [(a[0] + b[0]) / 2 + sx * SAG[0], (a[1] + b[1]) / 2 + SAG[1], (a[2] + b[2]) / 2 + SAG[2]], b];
  });
}
function layStrap(P) {
  strapPoints(P).forEach((pts, k) => { for (let i = 0; i < 2; i++) {
    const m = P.strap[k * 2 + i]; _a.fromArray(pts[i]); _b.fromArray(pts[i + 1]);
    m.position.copy(_m.addVectors(_a, _b).multiplyScalar(0.5)); const d = _b.sub(_a), len = d.length();
    m.quaternion.setFromUnitVectors(_up, d.divideScalar(len || 1)); m.scale.set(1, len, 1);
  } });
}

/** Arm targets per pose (radians), checked by the no-clip self test: r = camera raise, w = warm, p = peek. */
export const T = { rUx: -1.35, rUz: 0.35, rFx: -1.0, wUx: -0.7, wUz: 0.55, wFx: -0.8, pUx: -0.9, pUz: 0.45, pFx: -1.2 };

// the hero's own pose layer, run inside animateChibi before the joint clamp (so every value stays anatomical)
let cur = null;
POSES.pipHero = (B, w, t) => {
  const P = cur, vf = P.vf, idle = P.idle;
  const sides = [['L', 1], ['R', -1]];
  for (const [k, m] of sides) B['upperArm' + k].rotation.z += m * PUFF * (k === 'R' ? 1 - (P.wave || 0) : 1); // the waving arm keeps its own path
  if (vf > 0) { // raise the camera to the eye: upper arms forward, elbows bent, palms facing the camera's sides
    const a = armsUp(vf); // the arms lead and the camera rides in the mitts
    for (const [k, m] of sides) {
      B['upperArm' + k].rotation.x = lerp(B['upperArm' + k].rotation.x, T.rUx, a);
      B['upperArm' + k].rotation.z = lerp(B['upperArm' + k].rotation.z, m * T.rUz, a);
      B['forearm' + k].rotation.x = lerp(B['forearm' + k].rotation.x, T.rFx, a);
      B['hand' + k].rotation.z = lerp(B['hand' + k].rotation.z, m * 0.25, a); // a little wrist extension
    }
    B.head.rotation.x -= 0.12 * vf; // eye to the viewfinder
  }
  if (idle && vf < 0.05) {
    const q = idle.p, u = Math.sin(Math.PI * q);
    if (idle.k === 'warm') { // rub the mitts together in front of the tummy
      const r = Math.sin(q * 40) * 0.12 * u;
      for (const [k, m] of sides) { B['upperArm' + k].rotation.x = T.wUx * u + m * r; B['upperArm' + k].rotation.z = m * ((ARM_REST + PUFF) * (1 - u) + T.wUz * u); B['forearm' + k].rotation.x = T.wFx * u - 0.18 * (1 - u); B['forearmTwist' + k].rotation.y = -0.5 * u * m; } // mitts meet under the camera, palms together
      B.head.rotation.x += 0.15 * u;
    } else if (idle.k === 'stamp') { // stamp the boots
      const s = Math.sin(q * Math.PI * 4);
      for (const [k, sg] of [['L', 1], ['R', -1]]) { const a = Math.max(0, sg * s) * u; B['thigh' + k].rotation.x = -0.55 * a; B['shin' + k].rotation.x = 0.9 * a; B['foot' + k].rotation.x = 0.2 * a; }
    } else if (idle.k === 'peek') { // lift the camera and peek at its screen
      for (const [k, m] of sides) { B['upperArm' + k].rotation.x = T.pUx * u; B['upperArm' + k].rotation.z = m * ((ARM_REST + PUFF) * (1 - u) + T.pUz * u); B['forearm' + k].rotation.x = T.pFx * u - 0.18 * (1 - u); }
      B.head.rotation.x += 0.25 * u;
    }
  }
};

/** Per-frame hero animation: walk 0..1, vf (viewfinder) 0..1, look -1..1 (head turn), idle { k, p } or null. */
export function animatePip(P, t, dt, walk, vf, look = 0, idle = null) {
  if (!P.ready) return;
  P.vf = vf; P.idle = idle; cur = P;
  if (P.inT < 1) { // entrance: Pip pops up out of the snow with a soft overshoot
    P.inT = Math.min(1, P.inT + dt / 0.35); const k = P.inT, b = 1 + 2.2 * Math.pow(k - 1, 3) + 1.2 * Math.pow(k - 1, 2);
    P.c.group.scale.setScalar(P.scale * Math.max(0.01, b));
  }
  animateChibi(P.c, t, dt, { walk, wave: P.wave || 0, look: look * (1 - vf), pose: 'pipHero', poseW: 1 });
  // the camera lifts off the chest toward the eye with the arms (and a little for a peek)
  const pk = idle && idle.k === 'peek' && vf < 0.05 ? Math.sin(Math.PI * idle.p) : 0;
  const up = armsUp(vf); P.cam.position.set(0, 0.02 + up * 0.2 + pk * 0.08, CAM_Z + up * 0.16 + pk * 0.16); // held up at the chin in both mitts (chibi arms are short for the big head)
  P.cam.rotation.x = -0.25 * pk; layStrap(P);
  P.lantern.rotation.z = Math.sin(t * 9) * 0.3 * walk;
  P.lantern.rotation.x = Math.sin(t * 2.2) * 0.04;
}
