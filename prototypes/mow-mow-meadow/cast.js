// PROTOTYPE - NOT FOR PRODUCTION
// The cast and the things found in the grass: bales, twelve small friends, thirty-six lost toys, twelve animal
// neighbours on a light jointed rig, the gift box, Nilo's hats and Buzzy's ornaments, and the upgrade pads.
// Everything is built from the kit's profiles and painted with vertex colours. THREE is read at call time.
import { paint, xf, merge, lathe, rbox, blob, cyl, mesh } from './kit.js';

const T = () => window.THREE;
const B = (r, s, p, c, t, d = 2) => paint(xf(blob(r, s[0], s[1], s[2], d), p), c, t);
const C = (r0, r1, h, p, rot, col, top, seg = 10) => paint(xf(cyl(r0, r1, h, seg), p, rot || [0, 0, 0]), col, top);
const X = (w, h, d, r, p, rot, col, top) => paint(xf(rbox(w, h, d, Math.min(r, w / 2 - 0.002, d / 2 - 0.002), 2), p, rot || [0, 0, 0]), col, top);
const LA = (pts, p, rot, col, top, seg = 14) => paint(xf(lathe(pts, seg), p, rot || [0, 0, 0]), col, top);
const TO = (R, r, p, rot, col, top, arc = 6.2832) => paint(xf(new (T().TorusGeometry)(R, r, 6, 14, arc), p, rot || [0, 0, 0]), col, top);
/** An extruded flat shape from [x, y] points, centred on z, standing in the xy plane. */
function EX(pts, depth, p, rot, col, top, s = 1) {
  const THREE = T(), sh = new THREE.Shape(); pts.forEach((q, i) => (i ? sh.lineTo(q[0], q[1]) : sh.moveTo(q[0], q[1])));
  const g = new THREE.ExtrudeGeometry(sh, { depth, bevelEnabled: true, bevelThickness: depth * 0.3, bevelSize: depth * 0.3, bevelSegments: 2, curveSegments: 8 }); g.translate(0, 0, -depth / 2);
  return paint(xf(g, p, rot || [0, 0, 0], s), col, top);
}
const starPts = (n, R, r) => Array.from({ length: n * 2 }, (_, i) => { const a = i / (n * 2) * 6.2832 + Math.PI / 2, q = i % 2 ? r : R; return [Math.cos(a) * q, Math.sin(a) * q]; });
const heartPts = () => Array.from({ length: 24 }, (_, i) => { const t = i / 24 * 6.2832; return [0.011 * 16 * Math.sin(t) ** 3, 0.011 * (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t))]; });
const CORAL = '#e9795b', SUN = '#f6b93b', CREAM = '#f4ead2', TEAL = '#3aa79c', LILAC = '#b79ae0', SKY = '#7fb7ee', LEAF = '#6fb64c', WOOD = '#b98a5e', DARK = '#3a3f4d', PINK = '#f3a0b8', RED = '#e2533c';
const eyes = (x, y, z, r = 0.022) => [B(r, [1, 1, 0.7], [-x, y, z], '#2a2d38'), B(r, [1, 1, 0.7], [x, y, z], '#2a2d38'), B(r * 0.4, [1, 1, 1], [-x + r * 0.3, y + r * 0.35, z + r * 0.6], '#fffdf2', null, 0), B(r * 0.4, [1, 1, 1], [x + r * 0.3, y + r * 0.35, z + r * 0.6], '#fffdf2', null, 0)];

// ---------------------------------------------------------------- toys

const TOYS = {
  ball: () => [B(0.16, [1, 1, 1], [0, 0.16, 0], CORAL, SUN, 3), TO(0.158, 0.014, [0, 0.16, 0], [1.2, 0, 0.4], CREAM)],
  kite: () => [EX([[0, 0.2], [0.13, 0.04], [0, -0.18], [-0.13, 0.04]], 0.02, [0, 0.26, 0], [-0.5, 0, 0], RED, SUN), C(0.006, 0.006, 0.2, [0, 0.02, 0.08], [0.9, 0, 0], CREAM), B(0.03, [1.6, 1, 0.6], [0, 0.03, 0.2], SKY), B(0.03, [1.6, 1, 0.6], [0.03, 0.03, 0.28], SUN)],
  boat: () => [X(0.34, 0.1, 0.15, 0.06, [0, 0, 0], null, '#a8734a', WOOD), X(0.26, 0.03, 0.11, 0.04, [0, 0.09, 0], null, CREAM), C(0.01, 0.01, 0.28, [0, 0.1, 0], null, WOOD), EX([[0, 0], [0.14, 0.02], [0, 0.22]], 0.012, [0.012, 0.13, 0], null, CREAM, '#fffdf2')],
  top: () => [LA([[0, 0], [0.03, 0.02], [0.14, 0.14], [0.13, 0.19], [0.03, 0.22], [0.025, 0.32], [0, 0.33]], [0, 0, 0], [0, 0, 0.25], CORAL, SUN), TO(0.135, 0.012, [-0.04, 0.16, 0], [Math.PI / 2, 0.25, 0], TEAL)],
  teacup: () => [LA([[0, 0.02], [0.17, 0.02], [0.18, 0.035], [0.06, 0.05], [0, 0.05]], [0, 0, 0], null, CREAM, '#fffdf2'), LA([[0.05, 0.05], [0.07, 0.06], [0.11, 0.17], [0.115, 0.2], [0.1, 0.2], [0.09, 0.08], [0, 0.07]], [0, 0, 0], null, SKY, '#d5e8fa'), TO(0.045, 0.012, [0.14, 0.13, 0], null, SKY), B(0.02, [1, 1, 0.5], [0, 0.14, 0.105], CORAL)],
  boot: () => [X(0.14, 0.1, 0.27, 0.05, [0, 0, 0.03], null, '#d8a01f', SUN), C(0.065, 0.075, 0.22, [0, 0.08, -0.04], null, SUN, '#f8d15a'), TO(0.075, 0.012, [0, 0.3, -0.04], [Math.PI / 2, 0, 0], CREAM), X(0.15, 0.025, 0.28, 0.02, [0, 0, 0.03], null, DARK)],
  can: () => [LA([[0, 0], [0.1, 0], [0.11, 0.02], [0.1, 0.2], [0.09, 0.22], [0, 0.22]], [0, 0, 0], null, TEAL, '#7fd2c6'), C(0.02, 0.014, 0.22, [0.1, 0.08, 0], [0, 0, -0.9], TEAL), B(0.035, [1, 0.5, 1], [0.27, 0.215, 0], '#7fd2c6'), TO(0.07, 0.012, [-0.08, 0.15, 0], null, CREAM, null, 3.6)],
  marbles: () => [B(0.07, [1, 1, 1], [-0.07, 0.07, 0.02], SKY, '#d5e8fa', 3), B(0.06, [1, 1, 1], [0.06, 0.06, -0.04], CORAL, '#f8c0aa', 3), B(0.05, [1, 1, 1], [0.03, 0.05, 0.09], LEAF, '#c4e8a0', 3)],
  crown: () => [LA([[0.1, 0], [0.12, 0.01], [0.115, 0.1], [0.1, 0.1]], [0, 0, 0], null, '#d8a01f', SUN, 16), ...[0, 1, 2, 3, 4].map((i) => C(0.03, 0.004, 0.09, [Math.cos(i * 1.2566) * 0.105, 0.09, Math.sin(i * 1.2566) * 0.105], null, SUN, '#f8d15a', 6)), ...[0, 1, 2, 3, 4].map((i) => B(0.018, [1, 1, 1], [Math.cos(i * 1.2566 + 0.63) * 0.12, 0.05, Math.sin(i * 1.2566 + 0.63) * 0.12], i % 2 ? RED : SKY))],
  duckie: () => [B(0.13, [1, 0.8, 1.2], [0, 0.11, 0], '#f2c230', '#fbe07a', 3), B(0.085, [1, 1, 1], [0, 0.26, 0.09], '#f6cf4a', '#fbe07a', 3), B(0.035, [1.2, 0.5, 1.4], [0, 0.245, 0.18], CORAL), B(0.05, [0.5, 1, 1.4], [0, 0.16, -0.14], '#f2c230'), ...eyes(0.04, 0.285, 0.15, 0.014)],
  block: () => [X(0.22, 0.22, 0.22, 0.03, [0, 0, 0], [0, 0.4, 0], SKY, '#b5d6f5'), X(0.14, 0.14, 0.02, 0.01, [0.043, 0.04, 0.102], [0, 0.4, 0], CREAM), EX(starPts(5, 0.045, 0.02), 0.012, [0.047, 0.11, 0.112], [0, 0.4, 0], CORAL)],
  bell: () => [LA([[0.13, 0], [0.135, 0.02], [0.1, 0.07], [0.07, 0.17], [0.03, 0.21], [0, 0.215]], [0, 0.04, 0], null, '#d8a01f', '#f8d15a'), B(0.03, [1, 1, 1], [0, 0.04, 0], '#b97f1c'), TO(0.03, 0.01, [0, 0.27, 0], null, WOOD)],
  yoyo: () => [LA([[0, 0], [0.11, 0], [0.13, 0.025], [0.11, 0.05], [0, 0.05]], [-0.035, 0.13, 0], [0, 0, Math.PI / 2], RED, CORAL), LA([[0, 0], [0.11, 0], [0.13, 0.025], [0.11, 0.05], [0, 0.05]], [0.085, 0.13, 0], [0, 0, Math.PI / 2], RED, CORAL), B(0.03, [0.4, 1, 1], [0.09, 0.13, 0], SUN), C(0.005, 0.005, 0.16, [0, 0.24, 0], [0.3, 0, 0.2], CREAM, null, 4)],
  spoon: () => [C(0.012, 0.016, 0.24, [0, 0.03, 0.05], [1.35, 0, 0], '#b8bfcd', '#e3e7ef'), B(0.055, [1, 0.35, 1.4], [0, 0.05, -0.07], '#c9cfdc', '#eef1f6')],
  key: () => [TO(0.05, 0.016, [0, 0.07, 0.11], [0.3, 0, 0], '#d8a01f', SUN), C(0.014, 0.014, 0.2, [0, 0.05, 0.06], [-1.3, 0, 0], SUN), X(0.05, 0.02, 0.02, 0.008, [0.03, 0.1, -0.1], null, SUN), X(0.04, 0.02, 0.02, 0.008, [0.025, 0.09, -0.06], null, SUN)],
  shell: () => [B(0.14, [1, 0.45, 0.9], [0, 0.05, 0], '#f3c0a8', '#fde6d8', 3), ...[-2, -1, 0, 1, 2].map((i) => C(0.012, 0.022, 0.2, [i * 0.012, 0.085, 0.09], [-1.45, i * 0.32, 0], '#e89a80', '#f8cdb8', 5)), B(0.04, [1.4, 0.7, 0.7], [0, 0.05, 0.12], '#e89a80')],
  robot: () => [X(0.2, 0.2, 0.14, 0.03, [0, 0.06, 0], null, '#8d94a6', '#c9cfdc'), X(0.16, 0.13, 0.13, 0.03, [0, 0.27, 0], null, TEAL, '#7fd2c6'), C(0.008, 0.008, 0.07, [0, 0.4, 0], null, DARK, null, 4), B(0.02, [1, 1, 1], [0, 0.48, 0], RED), ...eyes(0.04, 0.34, 0.066, 0.02), X(0.05, 0.06, 0.05, 0.015, [-0.07, 0, 0], null, DARK), X(0.05, 0.06, 0.05, 0.015, [0.07, 0, 0], null, DARK), B(0.03, [1, 1, 0.5], [0, 0.16, 0.07], SUN)],
  drum: () => [C(0.13, 0.13, 0.16, [0, 0.02, 0], null, RED, CORAL, 16), TO(0.132, 0.014, [0, 0.03, 0], [Math.PI / 2, 0, 0], SUN), TO(0.132, 0.014, [0, 0.17, 0], [Math.PI / 2, 0, 0], SUN), C(0.125, 0.125, 0.012, [0, 0.175, 0], null, CREAM, null, 16), C(0.008, 0.008, 0.2, [0.05, 0.2, 0.02], [0.2, 0, 1.2], WOOD, null, 4), B(0.02, [1, 1, 1], [-0.045, 0.235, 0.03], CREAM)],
  whistle: () => [C(0.06, 0.06, 0.07, [0, 0.05, 0], [Math.PI / 2, 0, 0], SUN, '#f8d15a', 14), X(0.06, 0.045, 0.14, 0.015, [0, 0.085, 0.09], null, SUN), TO(0.025, 0.007, [0, 0.14, -0.02], null, '#8d94a6'), B(0.02, [1, 0.4, 1], [0, 0.13, 0.06], DARK)],
  button: () => [LA([[0, 0], [0.13, 0], [0.15, 0.02], [0.13, 0.045], [0.1, 0.03], [0, 0.03]], [0, 0.02, 0], [0.25, 0, 0], LILAC, '#dccbf5', 18), ...[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([a, c]) => B(0.016, [1, 0.5, 1], [a * 0.035, 0.058 - c * 0.009, c * 0.035], '#6a4fa0'))],
  acorn: () => [B(0.09, [1, 1.25, 1], [0, 0.12, 0], '#b9824e', '#e0b07a', 3), LA([[0.1, 0], [0.105, 0.03], [0.07, 0.075], [0, 0.09]], [0, 0.17, 0], null, '#7a5232', '#9c6e46'), C(0.012, 0.008, 0.05, [0, 0.25, 0], [0, 0, 0.3], '#7a5232', null, 5)],
  ring: () => [TO(0.07, 0.016, [0, 0.09, 0], [0.2, 0, 0], '#d8a01f', SUN), LA([[0, 0], [0.04, 0.03], [0.025, 0.06], [0, 0.06]], [0, 0.165, -0.015], [0.2, 0, 0], '#49c7b8', '#b5f0e6', 6)],
  car: () => [X(0.18, 0.08, 0.32, 0.04, [0, 0.05, 0], null, RED, CORAL), X(0.15, 0.08, 0.16, 0.04, [0, 0.12, 0.02], null, SKY, '#d5e8fa'), ...[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([a, c]) => LA([[0, -0.02], [0.05, -0.02], [0.055, 0], [0.05, 0.02], [0, 0.02]], [a * 0.09, 0.055, c * 0.1], [0, 0, Math.PI / 2], DARK, null, 10)), B(0.018, [1, 1, 0.5], [-0.05, 0.09, -0.16], '#fff3c4'), B(0.018, [1, 1, 0.5], [0.05, 0.09, -0.16], '#fff3c4')],
  dice: () => [X(0.2, 0.2, 0.2, 0.04, [0, 0, 0], [0, 0.5, 0], CREAM, '#fffdf2'), ...[[0, 0], [-0.05, 0.05], [0.05, -0.05]].map(([a, c]) => B(0.018, [1, 0.4, 1], [a, 0.2, c], RED)), B(0.02, [1, 1, 0.4], [0.048, 0.1, 0.088], DARK)],
  plane: () => [B(0.07, [1, 1, 2.6], [0, 0.12, 0], SKY, '#d5e8fa', 3), X(0.44, 0.02, 0.1, 0.01, [0, 0.12, -0.03], null, CREAM), X(0.16, 0.015, 0.06, 0.01, [0, 0.13, 0.15], null, CREAM), X(0.015, 0.08, 0.06, 0.005, [0, 0.13, 0.15], null, RED), X(0.18, 0.012, 0.025, 0.005, [0, 0.11, -0.19], [0, 0, 0.5], WOOD), B(0.025, [1, 1, 1], [0, 0.12, -0.185], RED)],
  bucket: () => [LA([[0, 0], [0.085, 0], [0.09, 0.015], [0.125, 0.2], [0.135, 0.205], [0.115, 0.205], [0.08, 0.03], [0, 0.03]], [0, 0, 0], null, CORAL, '#f8b9a2'), TO(0.12, 0.008, [0, 0.2, 0], [0, 0, 0], '#8d94a6', null, 3.1416)],
  comb: () => [X(0.3, 0.05, 0.03, 0.012, [0, 0.12, 0], null, PINK, '#fbd0dc'), ...Array.from({ length: 9 }, (_, i) => C(0.01, 0.006, 0.12, [-0.12 + i * 0.03, 0.01, 0], null, PINK, null, 4))],
  medal: () => [LA([[0, 0], [0.09, 0], [0.1, 0.012], [0.09, 0.025], [0, 0.025]], [0, 0.11, 0], [Math.PI / 2 - 0.2, 0, 0], '#d8a01f', '#f8d15a', 18), EX(starPts(5, 0.05, 0.022), 0.012, [0, 0.11, 0.03], [-0.2, 0, 0], '#fff3c4'), X(0.05, 0.14, 0.012, 0.005, [-0.035, 0.18, -0.03], [-0.2, 0, 0.3], RED), X(0.05, 0.14, 0.012, 0.005, [0.035, 0.18, -0.03], [-0.2, 0, -0.3], SKY)],
  horn: () => [LA([[0.02, 0], [0.03, 0.08], [0.07, 0.17], [0.12, 0.21], [0.11, 0.21], [0.06, 0.16], [0, 0.02]], [0, 0.1, 0.02], [1.1, 0, 0], '#d8a01f', '#f8d15a'), B(0.07, [1, 1, 1], [0, 0.085, -0.04], RED, CORAL, 3)],
  lamp: () => [C(0.07, 0.08, 0.03, [0, 0, 0], null, DARK), LA([[0.06, 0], [0.075, 0.08], [0.06, 0.16], [0, 0.16]], [0, 0.03, 0], null, '#f8d15a', '#fff3c4'), LA([[0.085, 0], [0.03, 0.05], [0, 0.055]], [0, 0.19, 0], null, DARK), TO(0.03, 0.007, [0, 0.27, 0], null, DARK)],
  star: () => [EX(starPts(5, 0.16, 0.075), 0.05, [0, 0.17, 0], [-0.2, 0, 0], SUN, '#fbe07a')],
  rocket: () => [LA([[0, 0], [0.06, 0], [0.08, 0.08], [0.075, 0.2], [0.04, 0.3], [0, 0.35]], [0, 0.04, 0], null, CREAM, '#fffdf2'), LA([[0.045, 0], [0.042, 0.09], [0, 0.15]], [0, 0.26, 0], null, RED, CORAL), ...[0, 1, 2].map((i) => EX([[0, 0], [0.09, 0], [0, 0.12]], 0.015, [Math.cos(i * 2.094) * 0.06, 0.02, Math.sin(i * 2.094) * 0.06], [0, -i * 2.094, 0], RED)), B(0.03, [1, 1, 0.5], [0, 0.2, 0.072], SKY)],
  dino: () => [B(0.12, [1, 0.85, 1.4], [0, 0.15, 0], LEAF, '#c4e8a0', 3), C(0.05, 0.04, 0.16, [0, 0.2, 0.12], [0.5, 0, 0], LEAF, null, 8), B(0.065, [1, 0.85, 1.3], [0, 0.37, 0.22], LEAF, '#c4e8a0'), C(0.05, 0.005, 0.2, [0, 0.14, -0.13], [-1.3, 0, 0], LEAF, null, 8), ...[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([a, c]) => C(0.03, 0.035, 0.1, [a * 0.07, 0, c * 0.08], null, '#4f9a43', null, 8)), ...[0, 1, 2].map((i) => C(0.025, 0.003, 0.05, [0, 0.25, -0.08 + i * 0.07], null, SUN, null, 4)), ...eyes(0.035, 0.39, 0.28, 0.014)],
  bear: () => [B(0.11, [1, 1.1, 0.9], [0, 0.13, 0], '#b9824e', '#d9a877', 3), B(0.1, [1, 0.95, 0.95], [0, 0.31, 0], '#c08a56', '#d9a877', 3), B(0.035, [1, 1, 0.6], [-0.075, 0.39, 0], '#b9824e'), B(0.035, [1, 1, 0.6], [0.075, 0.39, 0], '#b9824e'), B(0.04, [1, 0.8, 0.8], [0, 0.285, 0.08], CREAM), B(0.014, [1, 0.8, 0.6], [0, 0.3, 0.115], DARK), ...eyes(0.04, 0.33, 0.085, 0.014), B(0.04, [1, 1, 1], [-0.11, 0.16, 0.03], '#b9824e'), B(0.04, [1, 1, 1], [0.11, 0.16, 0.03], '#b9824e'), B(0.045, [1, 0.8, 1.2], [-0.06, 0.03, 0.07], '#b9824e'), B(0.045, [1, 0.8, 1.2], [0.06, 0.03, 0.07], '#b9824e')],
  heart: () => [EX(heartPts(), 0.07, [0, 0.2, 0], [-0.15, 0, 0], RED, PINK)],
  gem: () => [LA([[0, 0], [0.13, 0.13], [0.075, 0.21], [0, 0.21]], [0, 0.02, 0], [0, 0, 0.12], '#3aa79c', '#b5f0e6', 6)],
};

/** Turns a painted geometry gold, keeping its light and dark. */
function gild(g) { const c = g.getAttribute('color'); for (let i = 0; i < c.count; i++) { const l = 0.3 * c.getX(i) + 0.59 * c.getY(i) + 0.11 * c.getZ(i), k = 0.45 + 0.75 * l; c.setXYZ(i, 0.95 * k, 0.72 * k, 0.2 * k); } return g; }
/** A toy as one mesh (about 0.3 m, origin on the ground). */
export function buildToy(world, id, golden) { const g = merge((TOYS[id] || TOYS.ball)()); return mesh(golden ? gild(g) : g, world.M.enamel); }

// ---------------------------------------------------------------- small friends

/** A rounded wing lying flat, root at the origin, reaching out along +x: a large front lobe, a smaller back lobe and two spots. */
const wing = (w, h, col, top) => merge([B(1, [w * 0.5, 0.007, h * 0.4], [w * 0.52, 0, h * 0.2], col), B(1, [w * 0.36, 0.007, h * 0.3], [w * 0.38, 0, -h * 0.26], col),
  B(1, [w * 0.2, 0.009, h * 0.16], [w * 0.68, 0, h * 0.24], top), B(1, [w * 0.13, 0.009, h * 0.11], [w * 0.46, 0, -h * 0.32], top)]);
const FRIENDS = {
  ladybird: () => ({ body: [B(0.11, [1, 0.7, 1.15], [0, 0.07, 0], RED, '#f08a6c', 3), B(0.06, [1, 0.8, 0.9], [0, 0.07, 0.11], DARK), ...[[-0.05, 0.03], [0.05, 0.03], [-0.06, -0.06], [0.06, -0.06], [0, -0.015]].map(([a, c]) => B(0.022, [1, 0.45, 1], [a, 0.07 + 0.077 * Math.sqrt(Math.max(0, 1 - (a / 0.11) ** 2 - (c / 0.1265) ** 2)), c], DARK)), ...eyes(0.03, 0.09, 0.155, 0.014)] }),
  snail: () => ({ body: [B(0.07, [0.8, 0.6, 2.2], [0, 0.04, 0.02], '#e8c9a0', '#f8e6c8'), LA([[0, -0.05], [0.09, -0.05], [0.12, 0], [0.09, 0.05], [0, 0.05]], [0, 0.14, -0.04], [0, 0, Math.PI / 2], '#c98a4e', SUN, 14), TO(0.06, 0.012, [0.052, 0.14, -0.04], [0, Math.PI / 2, 0], '#a86a34'), C(0.008, 0.006, 0.09, [-0.025, 0.07, 0.15], [0.3, 0, 0.15], '#e8c9a0', null, 4), C(0.008, 0.006, 0.09, [0.025, 0.07, 0.15], [0.3, 0, -0.15], '#e8c9a0', null, 4), ...eyes(0.035, 0.165, 0.185, 0.014)] }),
  butterfly: () => ({ fly: 1, body: [B(0.03, [1, 1, 3.4], [0, 0, 0], DARK), ...eyes(0.015, 0.015, 0.09, 0.01)], wings: [wing(0.2, 0.22, CORAL, SUN), wing(0.2, 0.22, CORAL, SUN)] }),
  frog: () => ({ hop: 1, body: [B(0.1, [1.1, 0.75, 1.1], [0, 0.08, 0], '#6fb64c', '#b5e08a', 3), B(0.035, [1, 1, 1], [-0.05, 0.16, 0.05], '#6fb64c'), B(0.035, [1, 1, 1], [0.05, 0.16, 0.05], '#6fb64c'), ...eyes(0.05, 0.168, 0.075, 0.016), B(0.05, [1.3, 0.5, 1.4], [-0.1, 0.03, -0.03], '#5a9a3e'), B(0.05, [1.3, 0.5, 1.4], [0.1, 0.03, -0.03], '#5a9a3e'), B(0.03, [2.2, 0.3, 0.5], [0, 0.07, 0.105], '#4f8a36')] }),
  mouse: () => ({ body: [B(0.085, [1, 0.9, 1.4], [0, 0.08, 0], '#b8a79a', '#e6dccf', 3), B(0.035, [1, 1, 0.4], [-0.055, 0.17, 0.04], PINK), B(0.035, [1, 1, 0.4], [0.055, 0.17, 0.04], PINK), B(0.016, [1, 1, 1], [0, 0.08, 0.125], PINK), ...eyes(0.03, 0.11, 0.1, 0.013), C(0.008, 0.003, 0.18, [0, 0.04, -0.11], [-1.2, 0, 0], PINK, null, 4)] }),
  cricket: () => ({ hop: 1, body: [B(0.05, [1, 0.9, 2.4], [0, 0.07, 0], '#7fa83c', '#c4dc7a'), B(0.04, [1, 1, 1], [0, 0.09, 0.12], '#7fa83c'), C(0.008, 0.006, 0.16, [-0.05, 0.02, -0.06], [0.9, 0, 0.5], '#5f8a2c', null, 4), C(0.008, 0.006, 0.16, [0.05, 0.02, -0.06], [0.9, 0, -0.5], '#5f8a2c', null, 4), C(0.004, 0.003, 0.14, [-0.015, 0.11, 0.13], [0.7, 0, 0.3], DARK, null, 3), C(0.004, 0.003, 0.14, [0.015, 0.11, 0.13], [0.7, 0, -0.3], DARK, null, 3), ...eyes(0.022, 0.105, 0.15, 0.011)] }),
  bee: () => ({ fly: 1, body: [B(0.07, [1, 0.95, 1.5], [0, 0, 0], SUN, '#fbe07a', 3), TO(0.066, 0.014, [0, 0, -0.01], null, DARK), TO(0.055, 0.014, [0, 0, -0.06], null, DARK), ...eyes(0.03, 0.02, 0.09, 0.014), C(0.008, 0.001, 0.04, [0, 0, -0.1], [-1.57, 0, 0], DARK, null, 4)], wings: [wing(0.13, 0.1, '#dff3ff', '#ffffff'), wing(0.13, 0.1, '#dff3ff', '#ffffff')] }),
  dragonfly: () => ({ fly: 1, body: [C(0.016, 0.01, 0.3, [0, 0, 0.06], [-1.57, 0, 0], '#3aa79c', '#7fd2c6', 6), B(0.035, [1, 1, 1.2], [0, 0, 0.09], '#3aa79c'), ...eyes(0.02, 0.012, 0.115, 0.014)], wings: [wing(0.24, 0.09, '#cfeef5', '#f2fbff'), wing(0.24, 0.09, '#cfeef5', '#f2fbff')] }),
  caterpillar: () => ({ body: [...[0, 1, 2, 3].map((i) => B(0.05 - i * 0.004, [1, 1, 1], [0, 0.05 + (i % 2) * 0.015, 0.1 - i * 0.075], i % 2 ? '#8fcf5a' : '#6fb64c', '#c4e8a0')), ...eyes(0.02, 0.07, 0.14, 0.012), C(0.004, 0.003, 0.05, [-0.015, 0.09, 0.11], [0.2, 0, 0.3], DARK, null, 3), C(0.004, 0.003, 0.05, [0.015, 0.09, 0.11], [0.2, 0, -0.3], DARK, null, 3)] }),
  moth: () => ({ fly: 1, body: [B(0.035, [1, 1, 2.6], [0, 0, 0], '#b8a79a', '#e6dccf'), ...eyes(0.016, 0.015, 0.08, 0.01)], wings: [wing(0.17, 0.2, '#e6dccf', LILAC), wing(0.17, 0.2, '#e6dccf', LILAC)] }),
  firefly: () => ({ fly: 1, glow: 1, body: [B(0.035, [1, 1, 2], [0, 0, 0.02], DARK), ...eyes(0.016, 0.012, 0.075, 0.01)], wings: [wing(0.1, 0.08, '#d5e8fa', '#ffffff'), wing(0.1, 0.08, '#d5e8fa', '#ffffff')] }),
  bluefly: () => ({ fly: 1, body: [B(0.03, [1, 1, 3.4], [0, 0, 0], DARK), ...eyes(0.015, 0.015, 0.09, 0.01)], wings: [wing(0.21, 0.24, '#4f8fe0', '#a8d0ff'), wing(0.21, 0.24, '#4f8fe0', '#a8d0ff')] }),
};
/**
 * A small friend. Returns { group, update(t), fly, hop }: wings flap, crawlers bob, hoppers hop. About 0.25 m,
 * made a little larger than life so a child can read it.
 */
export function buildFriend(world, id) {
  const THREE = T(), d = (FRIENDS[id] || FRIENDS.ladybird)(), group = new THREE.Group(), inner = new THREE.Group(); group.add(inner);
  inner.add(mesh(merge(d.body), world.M.enamel)); const wings = [];
  if (d.wings) d.wings.forEach((w, i) => { const m = mesh(i ? xf(w, [0, 0, 0], [0, 0, 0], [-1, 1, 1]) : w, world.M.matte, false); m.material = world.M.wing; m.position.set(i ? -0.02 : 0.02, 0.02, 0); inner.add(m); wings.push(m); });
  if (d.glow) { const g = new THREE.Mesh(blob(0.035, 1, 1, 1.2, 1), world.M.glow); g.position.set(0, 0, -0.06); inner.add(g); }
  inner.scale.setScalar(1.5);
  return { group, inner, fly: !!d.fly, hop: !!d.hop, id,
    update(t) {
      if (d.fly) { const f = Math.sin(t * 26) * 0.8; wings[0].rotation.z = 0.25 + f; wings[1].rotation.z = -0.25 - f; inner.position.y = Math.sin(t * 3.1) * 0.05; inner.rotation.z = Math.sin(t * 2.3) * 0.12; }
      else if (d.hop) { const h = Math.max(0, Math.sin(t * 3.4)); inner.position.y = h * h * 0.12; inner.scale.set(1.5, 1.5 * (1 + h * 0.15), 1.5); }
      else { inner.position.y = Math.abs(Math.sin(t * 4)) * 0.012; inner.rotation.z = Math.sin(t * 4) * 0.06; }
    } };
}

// ---------------------------------------------------------------- neighbours

const SPECIES = {
  hedgehog: { fur: '#b08a62', belly: '#f1ddbf', ear: 'round', snout: 'point', tail: 'none', extra: 'spikes', h: 0.85 },
  rabbit: { fur: '#e9e2d6', belly: '#fffaf0', ear: 'long', snout: 'round', tail: 'ball', h: 0.95 },
  duck: { fur: '#f6f1e4', belly: '#fffdf5', ear: 'none', snout: 'beak', tail: 'up', h: 0.9 },
  mole: { fur: '#5a5266', belly: '#8a8296', ear: 'none', snout: 'pink', tail: 'short', h: 0.8 },
  squirrel: { fur: '#c9743a', belly: '#f6e2c4', ear: 'tuft', snout: 'round', tail: 'bushy', h: 0.9 },
  fox: { fur: '#e2773a', belly: '#fff3e0', ear: 'point', snout: 'point', tail: 'bushy', h: 1.0 },
  sheep: { fur: '#f3efe6', belly: '#f3efe6', ear: 'side', snout: 'round', tail: 'ball', extra: 'wool', face: '#4a4450', h: 0.95 },
  goat: { fur: '#d9d0c0', belly: '#f6f0e2', ear: 'side', snout: 'round', tail: 'short', extra: 'horns', h: 1.0 },
  frog: { fur: '#6fb64c', belly: '#d8f0b0', ear: 'none', snout: 'wide', tail: 'none', extra: 'bulge', h: 0.85 },
  owl: { fur: '#8a6a4e', belly: '#e8d6b8', ear: 'tuft', snout: 'beak', tail: 'short', extra: 'discs', h: 0.9 },
  fawn: { fur: '#c98e5a', belly: '#f8ead2', ear: 'side', snout: 'round', tail: 'short', extra: 'spots', h: 1.05 },
  badger: { fur: '#6a6a72', belly: '#e9e6df', ear: 'round', snout: 'point', tail: 'short', extra: 'mask', h: 1.0 },
};
const lighten = (hex, k) => { const c = new (T().Color)(hex); c.lerp(new (T().Color)('#ffffff'), k); return '#' + c.getHexString(); };

/**
 * An animal neighbour on a light jointed rig (body, head, two arms, two legs, tail, ears). Returns
 * { group, update(dt, t, mode) } with mode 'idle' | 'wave' | 'cheer' | 'dance' | 'run' | 'sleep'.
 */
export function buildNeighbour(world, id) {
  const THREE = T(), S = SPECIES[id] || SPECIES.rabbit, M = world.M, g = new THREE.Group(), body = new THREE.Group(), head = new THREE.Group(), fur = S.fur, fur2 = lighten(fur, 0.3), face = S.face || fur;
  const part = (geos, mat = M.felt) => mesh(merge(geos), mat);
  // torso: a soft pear with a belly patch and a little scarf or apron band as the material break
  const torso = [LA([[0, 0], [0.2, 0.02], [0.27, 0.16], [0.25, 0.34], [0.17, 0.5], [0.1, 0.56], [0, 0.57]], [0, 0.16, 0], null, fur, fur2, 18), B(0.19, [0.85, 1.15, 0.55], [0, 0.4, 0.14], S.belly, lighten(S.belly, 0.4), 3), TO(0.125, 0.035, [0, 0.68, 0], [Math.PI / 2, 0, 0], CORAL, '#f8b9a2')];
  if (S.extra === 'spikes') for (let i = 0; i < 26; i++) { const a = (i % 6) / 5 * 2.2 - 1.1, r = Math.floor(i / 6); torso.push(C(0.04, 0.003, 0.14, [Math.sin(a) * 0.22, 0.3 + r * 0.11, -Math.cos(a) * 0.2 - 0.02], [-0.9 - r * 0.1, 0, -a * 0.7], '#7a5c40', '#c9a880', 5)); }
  if (S.extra === 'wool') for (let i = 0; i < 14; i++) { const a = i / 14 * 6.283; torso.push(B(0.11, [1, 1, 1], [Math.cos(a) * 0.2, 0.3 + (i % 3) * 0.1, Math.sin(a) * 0.19 - 0.02], '#f3efe6', '#ffffff')); }
  if (S.extra === 'spots') for (let i = 0; i < 6; i++) torso.push(B(0.028, [1, 1, 0.4], [(i % 3 - 1) * 0.11, 0.38 + Math.floor(i / 3) * 0.1, -0.235], '#fff3e0'));
  body.add(part(torso));
  // head: a big round head with glossy eyes, cheeks, snout and ears
  const hd = [B(0.27, [1.08, 0.94, 0.98], [0, 0.2, 0], face, lighten(face, 0.3), 3), B(0.05, [1, 0.7, 0.5], [-0.17, 0.12, 0.2], '#f3a0b8'), B(0.05, [1, 0.7, 0.5], [0.17, 0.12, 0.2], '#f3a0b8'), ...eyes(0.105, 0.24, 0.235, 0.042)];
  if (S.extra === 'wool') for (let i = 0; i < 7; i++) hd.push(B(0.1, [1, 1, 1], [Math.cos(i / 7 * 3.14) * 0.2, 0.36 + Math.sin(i / 7 * 3.14) * 0.08, -0.02 + (i % 2) * 0.06], '#f3efe6', '#ffffff'));
  if (S.extra === 'mask') hd.push(B(0.085, [0.8, 1.5, 0.5], [-0.11, 0.26, 0.2], '#3a3a42'), B(0.085, [0.8, 1.5, 0.5], [0.11, 0.26, 0.2], '#3a3a42'), B(0.08, [0.7, 1.8, 0.6], [0, 0.3, 0.2], '#f4f1ea'));
  if (S.extra === 'discs') hd.push(LA([[0, 0], [0.1, 0.005], [0.105, 0.02], [0, 0.02]], [-0.105, 0.24, 0.2], [Math.PI / 2 - 0.1, 0, 0], '#f1e2c4', '#fff6e0', 14), LA([[0, 0], [0.1, 0.005], [0.105, 0.02], [0, 0.02]], [0.105, 0.24, 0.2], [Math.PI / 2 - 0.1, 0, 0], '#f1e2c4', '#fff6e0', 14));
  if (S.extra === 'bulge') hd.push(B(0.085, [1, 1, 1], [-0.12, 0.4, 0.08], fur), B(0.085, [1, 1, 1], [0.12, 0.4, 0.08], fur));
  if (S.extra === 'horns') hd.push(C(0.03, 0.008, 0.16, [-0.09, 0.4, -0.02], [-0.5, 0, 0.3], '#cdbf9d', CREAM, 6), C(0.03, 0.008, 0.16, [0.09, 0.4, -0.02], [-0.5, 0, -0.3], '#cdbf9d', CREAM, 6), C(0.02, 0.004, 0.09, [0, 0.03, 0.2], [0.4, 0, 0], '#f6f0e2', null, 5));
  if (S.snout === 'round') hd.push(B(0.09, [1.1, 0.8, 0.8], [0, 0.13, 0.23], S.belly), B(0.028, [1.2, 0.8, 0.7], [0, 0.165, 0.305], '#5a3a3a'));
  if (S.snout === 'point') hd.push(B(0.1, [0.9, 0.75, 1.5], [0, 0.13, 0.25], S.belly), B(0.03, [1, 0.9, 0.9], [0, 0.15, 0.4], '#3a2f2f'));
  if (S.snout === 'pink') hd.push(B(0.085, [1, 0.8, 1.3], [0, 0.13, 0.25], '#f3a0b8'), B(0.03, [1, 1, 1], [0, 0.14, 0.36], '#e2718f'));
  if (S.snout === 'beak') hd.push(B(0.075, [1.3, 0.5, 1.5], [0, 0.14, 0.27], SUN, '#f8d15a'));
  if (S.snout === 'wide') hd.push(B(0.05, [3.2, 0.3, 1], [0, 0.1, 0.24], '#4f8a36'));
  if (S.extra === 'bulge' || S.extra === 'discs') { /* eyes already sit in the bulges or discs */ }
  head.add(part(hd));
  const ears = [];
  const earGeo = { round: () => [B(0.085, [1, 1, 0.5], [0, 0.04, 0], fur), B(0.05, [1, 1, 0.4], [0, 0.04, 0.03], '#f3a0b8')], long: () => [B(0.07, [0.9, 3.4, 0.5], [0, 0.22, 0], fur, fur2), B(0.04, [0.8, 3.6, 0.4], [0, 0.21, 0.025], '#f3a0b8')], point: () => [C(0.085, 0.01, 0.2, [0, 0, 0], null, fur, '#3a2f2f', 6), C(0.05, 0.006, 0.13, [0, 0.01, 0.03], null, '#fff3e0', null, 6)], tuft: () => [C(0.06, 0.008, 0.16, [0, 0, 0], null, fur, fur2, 6)], side: () => [B(0.07, [2.1, 0.8, 0.5], [0.1, 0, 0], fur, fur2), B(0.04, [2, 0.6, 0.4], [0.1, 0, 0.02], '#f3a0b8')] }[S.ear];
  if (earGeo) for (const sd of [-1, 1]) { const e = new THREE.Group(), m = part(earGeo()); if (S.ear === 'side') { m.scale.x = sd; e.position.set(sd * 0.24, 0.3, 0); } else e.position.set(sd * (S.ear === 'long' ? 0.1 : 0.17), S.ear === 'long' ? 0.4 : 0.39, 0); e.rotation.z = -sd * (S.ear === 'long' ? 0.12 : 0.3); e.add(m); head.add(e); ears.push(e); }
  head.position.y = 0.74; body.add(head);
  const limb = (len, r, col, tip) => part([C(r, r * 0.85, len, [0, -len, 0], null, col, null, 8), B(r * 1.35, [1, 0.8, 1.2], [0, -len, r * 0.3], tip)]);
  const arms = [-1, 1].map((sd) => { const a = new THREE.Group(); a.position.set(sd * 0.2, 0.62, 0.02); a.add(limb(0.26, 0.05, fur, S.belly)); a.rotation.z = sd * 0.35; body.add(a); return a; });
  const legs = [-1, 1].map((sd) => { const l = new THREE.Group(); l.position.set(sd * 0.1, 0.2, 0); l.add(limb(0.18, 0.065, fur, S.snout === 'beak' ? SUN : S.belly)); g.add(l); return l; });
  const tail = new THREE.Group(); tail.position.set(0, 0.3, -0.24);
  const tg = { ball: () => [B(0.09, [1, 1, 1], [0, 0, -0.03], '#fffaf0')], bushy: () => [B(0.15, [0.9, 2.1, 0.9], [0, 0.22, -0.1], fur, S.belly, 3)], up: () => [C(0.08, 0.01, 0.16, [0, 0, 0], [-0.9, 0, 0], fur, null, 6)], short: () => [B(0.06, [0.8, 0.8, 1.6], [0, 0, -0.05], fur)] }[S.tail];
  if (tg) tail.add(part(tg())); body.add(tail);
  g.add(body); g.scale.setScalar(S.h / 1.1);
  let ph = 0;
  return { group: g, id, head, arms, body,
    update(dt, t, mode = 'idle') {
      ph += dt; const br = Math.sin(t * 2.2) * 0.012;
      body.position.y = br; body.rotation.set(0, 0, 0); head.rotation.set(Math.sin(t * 1.1) * 0.04, Math.sin(t * 0.7) * 0.12, Math.sin(t * 1.3) * 0.04);
      arms[0].rotation.set(0, 0, -0.35); arms[1].rotation.set(0, 0, 0.35); legs[0].rotation.x = legs[1].rotation.x = 0; g.position.y = 0;
      tail.rotation.y = Math.sin(t * 3) * 0.25; ears.forEach((e, i) => { e.rotation.x = Math.max(0, Math.sin(t * 0.9 + i * 2.4) - 0.9) * 3; });
      if (mode === 'wave') { arms[1].rotation.set(0, 0, 2.5 + Math.sin(t * 9) * 0.35); head.rotation.z = 0.12; }
      else if (mode === 'cheer') { const h = Math.abs(Math.sin(t * 6)); g.position.y = h * 0.16; arms[0].rotation.z = -2.6; arms[1].rotation.z = 2.6; body.scale.y = 1 + (0.5 - h) * 0.08; }
      else if (mode === 'dance') { const h = Math.abs(Math.sin(t * 5)); g.position.y = h * 0.1; body.rotation.z = Math.sin(t * 5) * 0.16; body.rotation.y = Math.sin(t * 2.5) * 0.6; arms[0].rotation.z = -1.4 - Math.sin(t * 5) * 0.8; arms[1].rotation.z = 1.4 - Math.sin(t * 5) * 0.8; legs[0].rotation.x = Math.sin(t * 10) * 0.4; legs[1].rotation.x = -Math.sin(t * 10) * 0.4; }
      else if (mode === 'run') { g.position.y = Math.abs(Math.sin(t * 11)) * 0.07; legs[0].rotation.x = Math.sin(t * 11) * 0.9; legs[1].rotation.x = -Math.sin(t * 11) * 0.9; arms[0].rotation.x = -Math.sin(t * 11) * 0.8; arms[1].rotation.x = Math.sin(t * 11) * 0.8; body.rotation.x = 0.15; }
      else if (mode === 'sleep') { head.rotation.set(0.5, 0, 0.2); body.position.y = Math.sin(t * 1.2) * 0.015; }
      if (mode !== 'cheer') body.scale.y = 1;
    } };
}

// ---------------------------------------------------------------- hats and ornaments (head-bone space: the head
// is an ellipsoid of about 0.3 around (0, 0.2, 0), front at +z)

const HATS = {
  straw: () => [LA([[0.4, 0.0], [0.38, 0.03], [0.3, 0.05], [0.28, 0.2], [0.2, 0.3], [0, 0.32]], [0, 0.34, -0.04], [-0.22, 0, 0], '#d9b566', '#f3dc9a', 20), TO(0.285, 0.035, [0, 0.41, -0.05], [Math.PI / 2 - 0.22, 0, 0], RED, CORAL)],
  flowercrown: () => [TO(0.29, 0.03, [0, 0.36, 0], [Math.PI / 2 - 0.15, 0, 0], LEAF, '#b5e08a'), ...Array.from({ length: 9 }, (_, i) => { const a = i / 9 * 6.283; return B(0.06, [1, 0.7, 1], [Math.cos(a) * 0.29, 0.39 + Math.sin(a) * 0.04, Math.sin(a) * 0.29], [PINK, SUN, CREAM, LILAC][i % 4], '#fffdf2'); })],
  beecap: () => [LA([[0.31, 0], [0.3, 0.1], [0.22, 0.22], [0, 0.27]], [0, 0.3, -0.01], [-0.12, 0, 0], SUN, '#fbe07a', 18), TO(0.3, 0.03, [0, 0.34, -0.01], [Math.PI / 2 - 0.12, 0, 0], DARK), TO(0.25, 0.03, [0, 0.45, -0.03], [Math.PI / 2 - 0.12, 0, 0], DARK), C(0.008, 0.006, 0.14, [-0.08, 0.54, 0.02], [0.2, 0, 0.3], DARK, null, 4), C(0.008, 0.006, 0.14, [0.08, 0.54, 0.02], [0.2, 0, -0.3], DARK, null, 4), B(0.03, [1, 1, 1], [-0.125, 0.68, 0.05], SUN), B(0.03, [1, 1, 1], [0.125, 0.68, 0.05], SUN)],
  raincoat: () => [LA([[0.44, 0], [0.4, 0.04], [0.3, 0.09], [0.27, 0.22], [0.15, 0.31], [0, 0.33]], [0, 0.31, -0.03], [-0.2, 0, 0], '#f2c230', '#fbe07a', 20)],
  bandana: () => [LA([[0.31, 0], [0.305, 0.1], [0.24, 0.2], [0, 0.25]], [0, 0.31, -0.01], [-0.1, 0, 0], RED, CORAL, 18), B(0.06, [1, 0.7, 1.4], [0.27, 0.3, -0.16], RED), C(0.04, 0.01, 0.18, [0.3, 0.14, -0.2], [0.3, 0, -0.3], RED, null, 5), ...[0, 1, 2, 3, 4].map((i) => B(0.025, [1, 0.5, 1], [Math.sin(i * 1.3) * 0.2, 0.47 + Math.cos(i * 2) * 0.03, Math.cos(i * 1.3) * 0.18], CREAM))],
  bearhood: () => [LA([[0.335, 0], [0.34, 0.12], [0.27, 0.27], [0, 0.34]], [0, 0.22, -0.04], [-0.3, 0, 0], '#b9824e', '#d9a877', 18), B(0.09, [1, 1, 0.6], [-0.2, 0.52, -0.02], '#b9824e'), B(0.09, [1, 1, 0.6], [0.2, 0.52, -0.02], '#b9824e'), B(0.05, [1, 1, 0.5], [-0.2, 0.52, 0.02], '#f1ddbf'), B(0.05, [1, 1, 0.5], [0.2, 0.52, 0.02], '#f1ddbf')],
  crown: () => [LA([[0.2, 0], [0.22, 0.02], [0.21, 0.12], [0.19, 0.12]], [0, 0.44, 0], [-0.1, 0, 0], '#d8a01f', SUN, 16), ...[0, 1, 2, 3, 4, 5].map((i) => C(0.05, 0.006, 0.12, [Math.cos(i * 1.047) * 0.2, 0.55, Math.sin(i * 1.047) * 0.2 - 0.01], null, SUN, '#fbe07a', 6)), ...[0, 1, 2, 3, 4, 5].map((i) => B(0.028, [1, 1, 1], [Math.cos(i * 1.047 + 0.52) * 0.215, 0.5, Math.sin(i * 1.047 + 0.52) * 0.215], i % 2 ? RED : SKY))],
  cap: () => [LA([[0.31, 0], [0.3, 0.1], [0.22, 0.22], [0, 0.27]], [0, 0.3, -0.01], [-0.12, 0, 0], TEAL, '#7fd2c6', 18), B(0.2, [1, 0.12, 0.9], [0, 0.33, 0.3], CREAM), B(0.03, [1, 0.6, 1], [0, 0.575, -0.04], CREAM)],
  scarf: () => [TO(0.2, 0.06, [0, -0.02, 0.02], [Math.PI / 2, 0, 0], LILAC, '#dccbf5'), X(0.1, 0.26, 0.04, 0.02, [0.12, -0.3, 0.17], [0, 0, -0.15], LILAC, '#dccbf5')],
  wizard: () => [LA([[0.46, 0], [0.42, 0.04], [0.28, 0.07], [0.2, 0.3], [0.08, 0.6], [0, 0.72]], [0, 0.32, -0.02], [-0.16, 0, 0.06], '#5f5ab5', '#9a8fe0', 18), TO(0.275, 0.03, [0, 0.4, -0.03], [Math.PI / 2 - 0.16, 0, 0], SUN), EX(starPts(5, 0.07, 0.03), 0.02, [0, 0.62, 0.17], [-0.3, 0, 0], SUN)],
  goldhat: () => [LA([[0.5, 0.0], [0.47, 0.03], [0.3, 0.06], [0.28, 0.2], [0.2, 0.3], [0, 0.32]], [0, 0.33, -0.02], [-0.12, 0, 0], '#c9962a', '#f3d77a', 20), TO(0.285, 0.035, [0, 0.4, -0.03], [Math.PI / 2 - 0.12, 0, 0], '#fff3c4'), EX(starPts(5, 0.07, 0.03), 0.02, [0, 0.45, 0.27], [-0.2, 0, 0], '#fff3c4')],
};
const ORNAMENTS = { 'ornament-duck': () => TOYS.duckie(), 'ornament-star': () => [C(0.012, 0.012, 0.1, [0, 0, 0], null, '#8d94a6', null, 5), EX(starPts(5, 0.11, 0.05), 0.04, [0, 0.2, 0], null, SUN, '#fbe07a')] };
export const isOrnament = (id) => id in ORNAMENTS;
/** A hat for the chibi's head bone, or a bonnet ornament for Buzzy. Returns a mesh. */
export function buildGift(world, id) { const f = HATS[id] || ORNAMENTS[id] || HATS.straw; return mesh(merge(f()), world.M.matte); }

// ---------------------------------------------------------------- bale, gift box, pads

/** A round bale of clippings (radius 0.36 at scale 1), lying on its side. */
export function buildBale(world) {
  const g = merge([LA([[0, -0.3], [0.3, -0.3], [0.36, -0.24], [0.36, 0.24], [0.3, 0.3], [0, 0.3]], [0, 0, 0], [0, 0, Math.PI / 2], '#8fb84e', '#c4d870', 18), TO(0.365, 0.02, [-0.12, 0, 0], [0, Math.PI / 2, 0], '#e9d7ad'), TO(0.365, 0.02, [0.12, 0, 0], [0, Math.PI / 2, 0], '#e9d7ad'), TO(0.16, 0.03, [0.3, 0, 0], [0, Math.PI / 2, 0], '#a8c860'), TO(0.16, 0.03, [-0.3, 0, 0], [0, Math.PI / 2, 0], '#a8c860')]);
  return mesh(g, world.M.matte);
}
/** A wrapped gift box with a lid that can lift: { group, lid }. */
export function buildGiftBox(world) {
  const THREE = T(), group = new THREE.Group(), lid = mesh(merge([X(0.5, 0.12, 0.5, 0.04, [0, 0, 0], null, CORAL, '#f8b9a2'), X(0.52, 0.125, 0.12, 0.03, [0, 0, 0], null, CREAM), X(0.12, 0.125, 0.52, 0.03, [0, 0, 0], null, CREAM), B(0.09, [1.5, 0.8, 0.7], [-0.1, 0.16, 0], SUN, '#fbe07a'), B(0.09, [1.5, 0.8, 0.7], [0.1, 0.16, 0], SUN, '#fbe07a'), B(0.05, [1, 1, 1], [0, 0.15, 0], '#d8a01f')]), world.M.enamel);
  group.add(mesh(merge([X(0.46, 0.36, 0.46, 0.04, [0, 0, 0], null, '#d8644a', CORAL), X(0.47, 0.36, 0.11, 0.03, [0, 0.002, 0], null, CREAM), X(0.11, 0.36, 0.47, 0.03, [0, 0.002, 0], null, CREAM)]), world.M.enamel)); lid.position.y = 0.36; group.add(lid);
  return { group, lid };
}
/** An upgrade pad on the lane: a low round plinth with the upgrade's emblem and level pips. kind: deck | engine | baler. */
export function buildPad(world, kind) {
  const THREE = T(), group = new THREE.Group(), col = { deck: TEAL, engine: SUN, baler: LEAF }[kind];
  group.add(mesh(merge([LA([[0, 0], [0.95, 0], [1.0, 0.04], [0.92, 0.1], [0.8, 0.11], [0, 0.11]], [0, 0, 0], null, '#e9d7ad', CREAM, 28), TO(0.86, 0.035, [0, 0.11, 0], [Math.PI / 2, 0, 0], col)]), world.M.matte, false));
  const em = { deck: () => [X(0.9, 0.16, 0.34, 0.08, [0, 0, 0], null, TEAL, '#7fd2c6'), X(0.92, 0.06, 0.08, 0.02, [0, 0.05, -0.16], null, CREAM)], engine: () => [EX([[0.06, 0.3], [-0.16, -0.02], [-0.02, -0.02], [-0.08, -0.3], [0.16, 0.04], [0.02, 0.04]], 0.1, [0, 0.34, 0], null, '#e8a41f', '#fbe07a')], baler: () => [LA([[0, -0.2], [0.2, -0.2], [0.26, -0.15], [0.26, 0.15], [0.2, 0.2], [0, 0.2]], [0, 0.28, 0], [0, 0, Math.PI / 2], '#8fb84e', '#c4d870', 16), TO(0.265, 0.016, [0, 0.28, 0], [0, Math.PI / 2, 0], '#e9d7ad')] }[kind];
  const emblem = mesh(merge(em()), world.M.enamel); emblem.position.y = 0.3; group.add(emblem);
  const ringG = new THREE.RingGeometry(0.62, 0.78, 40, 1, 0, 6.2832); ringG.rotateX(-Math.PI / 2); const ring = new THREE.Mesh(ringG, new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.9, depthWrite: false })); ring.position.y = 0.125; group.add(ring);
  return { group, emblem, ring, kind, setFill(v) { ringG.setDrawRange(0, Math.round(40 * v) * 6); ring.visible = v > 0.01; } };
}

/**
 * Draws a model into a small canvas (for the album, the receipt and the lane map). The model is framed from the
 * front and above; `size` is the canvas edge in pixels.
 */
export function portrait(world, obj, size = 128, o = {}) {
  const THREE = T(), r = world.renderer;
  if (!world._pt) { const s = new THREE.Scene(); s.add(new THREE.HemisphereLight(0xffffff, 0xc8d4b4, 1.25)); const d = new THREE.DirectionalLight(0xfff4e0, 1.5); d.position.set(2, 4, 3); s.add(d); world._pt = { s, cam: new THREE.PerspectiveCamera(26, 1, 0.05, 20), rt: Object.assign(new THREE.WebGLRenderTarget(256, 256), {}), buf: new Uint8Array(256 * 256 * 4) }; }
  world._pt.rt.texture.colorSpace = THREE.SRGBColorSpace; // read back as display colours
  const P = world._pt, box = new THREE.Box3().setFromObject(obj), c = box.getCenter(new THREE.Vector3()), sz = box.getSize(new THREE.Vector3()), rad = Math.max(sz.x, sz.y, sz.z) * 0.5 + 0.02, dist = rad / Math.tan(13 * Math.PI / 180) * 1.08;
  const yaw = o.yaw ?? 0.5, pitch = o.pitch ?? 0.35; P.cam.position.set(c.x + Math.sin(yaw) * Math.cos(pitch) * dist, c.y + Math.sin(pitch) * dist, c.z + Math.cos(yaw) * Math.cos(pitch) * dist); P.cam.lookAt(c);
  const parent = obj.parent; P.s.add(obj);
  const tm = r.toneMapping, ca = r.getClearAlpha(), cc = r.getClearColor(new THREE.Color()), sh = r.shadowMap.autoUpdate, was = r.getRenderTarget(); r.toneMapping = THREE.NoToneMapping; r.shadowMap.autoUpdate = false; r.setClearColor(0x000000, 0);
  r.setRenderTarget(P.rt); r.clear(); r.render(P.s, P.cam); r.readRenderTargetPixels(P.rt, 0, 0, 256, 256, P.buf);
  r.setRenderTarget(was); r.toneMapping = tm; r.setClearColor(cc, ca); r.shadowMap.autoUpdate = sh;
  P.s.remove(obj); if (parent) parent.add(obj);
  const cv = document.createElement('canvas'); cv.width = cv.height = 256; const ctx = cv.getContext('2d'), img = ctx.createImageData(256, 256);
  for (let y = 0; y < 256; y++) img.data.set(P.buf.subarray((255 - y) * 1024, (256 - y) * 1024), y * 1024);
  for (let i = 0; i < img.data.length; i += 4) { const a = img.data[i + 3]; if (a > 0 && a < 255) { img.data[i] = Math.min(255, img.data[i] * 255 / a); img.data[i + 1] = Math.min(255, img.data[i + 1] * 255 / a); img.data[i + 2] = Math.min(255, img.data[i + 2] * 255 / a); } }
  ctx.putImageData(img, 0, 0); void size;
  return cv;
}
export const TOY_IDS = Object.keys(TOYS), FRIEND_IDS = Object.keys(FRIENDS), SPECIES_IDS = Object.keys(SPECIES), HAT_IDS = Object.keys(HATS);
