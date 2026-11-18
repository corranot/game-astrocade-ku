// PROTOTYPE - NOT FOR PRODUCTION
/*
 * The 3D party yard for Pinata Maker: the yard, the pinata built from paper-covered patches,
 * the stick, candy with simple bounce physics, confetti, the surprise capsule and the guests.
 * game.js owns the rules; this file only shows things and answers "what is under this finger".
 * Screen positions are in the game's 720 x 1280 pixels.
 */
const W = 720, H = 1280, TAU = Math.PI * 2;
let T3, renderer, scene, camera, ray, quality = 1;
let P = null;                      // the current pinata
let swing, rope, table, blob, batPivot, capsule, guests = [], balloons = [];
let candyMesh = [], candies = [], conf = null, confP = [];
let view = { pos: [0, 3.0, 12], look: [0, 2.56, 0] }, cam = { pos: [0, 3.0, 12], look: [0, 2.56, 0] };
let shake = 0, punch = 0, clock = 0, getImage = () => null, batKind = 0;
let decor = [], skirtTex = null, swoosh = null, shock = null, groundMat = null, lawnMat = null, sea = null, theme = 0, hills = [];
const tmp = {};

const CRAFT = { pos: [0, 3.0, 12], look: [0, 2.56, 0] }, SMASH = { pos: [0, 3.0, 11.2], look: [0, 2.75, 0] };
const TABLE_TOP = 1.0, ROPE = 3.6, BEAM_Y = 7.2;
const FIT_HEIGHT = 2.35; // the tallest a pinata may stand on the craft table, so its head stays under the order and its feet above the choices
const CARD = 0xf2c078, GOLD = 0xffc928;
export const CANDY_COLORS = [[0xff5aa8, 0xff8a00, 0x9b5cff], [0x35b6ff, 0xff4d6d, 0x9b5cff], [0xff3b3b, 0xffb300, 0x35b6ff], [0xffc928], [0xff5aa8, 0x35b6ff, 0xff8a00]]; // no greens: they vanish on the lawn

/*
 * Shapes. Each part is a box (size, bands stacked along y), a stack of cylinders (radii profile),
 * a cone or a torus arc. Every band is one patch the player covers with paper.
 * foot: distance from the origin down to the lowest point. face: where the eyes go.
 */
const box = (p, s, bands = 1, r) => ({ k: 'box', p, s, bands, r });
const SHAPES = [
  { // burro
    foot: 1.1, top: 1.8, hatch: [0, 0.45, 0], eyes: [[0.98, 1.27, 0.27], [0.98, 1.27, -0.27]], eyeN: [0, 0, 1],
    parts: [box([0, 0, 0], [1.5, 0.8, 0.75], 3), box([0.6, 0.72, 0], [0.42, 0.66, 0.5], 2), box([0.84, 1.22, 0], [0.74, 0.46, 0.52], 2),
      box([0.6, 1.62, 0.17], [0.14, 0.36, 0.1]), box([0.6, 1.62, -0.17], [0.14, 0.36, 0.1]),
      box([0.55, -0.75, 0.22], [0.26, 0.7, 0.26], 2), box([0.55, -0.75, -0.22], [0.26, 0.7, 0.26], 2),
      box([-0.55, -0.75, 0.22], [0.26, 0.7, 0.26], 2), box([-0.55, -0.75, -0.22], [0.26, 0.7, 0.26], 2),
      box([-0.84, 0.05, 0], [0.16, 0.5, 0.16], 1, [0, 0, -0.35])],
  },
  { // unicorn: the burro plus a mane and a golden horn
    foot: 1.1, top: 1.95, hatch: [0, 0.45, 0], eyes: [[0.98, 1.27, 0.27], [0.98, 1.27, -0.27]], eyeN: [0, 0, 1],
    parts: [box([0, 0, 0], [1.5, 0.8, 0.75], 3), box([0.6, 0.72, 0], [0.42, 0.66, 0.5], 2), box([0.84, 1.22, 0], [0.74, 0.46, 0.52], 2),
      box([0.6, 1.62, 0.17], [0.14, 0.36, 0.1]), box([0.6, 1.62, -0.17], [0.14, 0.36, 0.1]),
      box([0.55, -0.75, 0.22], [0.26, 0.7, 0.26], 2), box([0.55, -0.75, -0.22], [0.26, 0.7, 0.26], 2),
      box([-0.55, -0.75, 0.22], [0.26, 0.7, 0.26], 2), box([-0.55, -0.75, -0.22], [0.26, 0.7, 0.26], 2),
      box([0.34, 1.3, 0], [0.2, 0.3, 0.24]), box([0.3, 0.98, 0], [0.2, 0.3, 0.24]), box([0.26, 0.66, 0], [0.2, 0.3, 0.24]),
      box([-0.86, 0.0, 0], [0.2, 0.7, 0.2], 2, [0, 0, -0.4])],
    extra: [{ k: 'cone', p: [1.02, 1.68, 0], r: 0.09, h: 0.5, c: GOLD, rot: [0, 0, -0.35] }],
  },
  { // dino
    foot: 1.0, top: 1.65, hatch: [0, 0.45, 0], eyes: [[0.86, 1.48, 0.26], [0.86, 1.48, -0.26]], eyeN: [0, 0, 1],
    parts: [box([0, 0, 0], [1.3, 0.8, 0.8], 3), box([0.55, 0.8, 0], [0.4, 0.82, 0.46], 3), box([0.76, 1.42, 0], [0.66, 0.42, 0.5], 2),
      box([-0.86, 0.05, 0], [0.46, 0.5, 0.5]), box([-1.24, -0.03, 0], [0.38, 0.36, 0.36]), box([-1.54, -0.1, 0], [0.28, 0.22, 0.22]),
      box([0.42, -0.7, 0.25], [0.32, 0.6, 0.3]), box([0.42, -0.7, -0.25], [0.32, 0.6, 0.3]),
      box([-0.42, -0.7, 0.25], [0.32, 0.6, 0.3]), box([-0.42, -0.7, -0.25], [0.32, 0.6, 0.3])],
    extra: [-0.45, -0.05, 0.35].map(x => ({ k: 'cone', p: [x, 0.55, 0], r: 0.13, h: 0.3, c: 0xffffff }))
      .concat([{ k: 'cone', p: [0.55, 1.33, 0], r: 0.1, h: 0.24, c: 0xffffff, rot: [0, 0, 0.5] }]),
  },
  { // star: a ball with five cones
    foot: 1.42, top: 1.42, hatch: [0, 0.7, 0], eyes: [[-0.22, 0.12, 0.72], [0.22, 0.12, 0.72]], eyeN: [0, 0, 1], yaw: -0.15, smile: [0, -0.16, 0.73],
    parts: [{ k: 'cyl', p: [0, 0, 0], prof: [[-0.72, 0.2], [-0.36, 0.63], [0, 0.74], [0.36, 0.63], [0.72, 0.2]] }]
      .concat([0, 1, 2, 3, 4].map(i => { const a = Math.PI / 2 + i * TAU / 5; return { k: 'cone', p: [Math.cos(a) * 1.02, Math.sin(a) * 1.02, 0], r: 0.32, h: 0.8, rot: [0, 0, a - Math.PI / 2] }; })),
  },
  { // donut: a ring made of six arcs
    foot: 1.1, top: 1.1, hatch: [0, 1.0, 0], eyes: [[-0.2, 0.8, 0.33], [0.2, 0.8, 0.33]], eyeN: [0, 0, 1], yaw: -0.2, smile: [0, 0.58, 0.35],
    parts: [0, 1, 2, 3, 4, 5].map(i => ({ k: 'arc', p: [0, 0, 0], R: 0.74, tube: 0.36, a: i * TAU / 6 })),
  },
  { // rocket
    foot: 1.15, top: 1.5, hatch: [0, 0.8, 0], eyes: [[-0.17, 0.3, 0.47], [0.17, 0.3, 0.47]], eyeN: [0, 0, 1], yaw: -0.2, smile: [0, 0.08, 0.5],
    parts: [{ k: 'cyl', p: [0, 0, 0], prof: [[-0.8, 0.44], [-0.4, 0.5], [0, 0.5], [0.4, 0.5], [0.8, 0.44]] },
      { k: 'cone', p: [0, 1.15, 0], r: 0.44, h: 0.7 },
      box([0.56, -0.8, 0], [0.34, 0.6, 0.1], 1, [0, 0, 0.3]), box([-0.56, -0.8, 0], [0.34, 0.6, 0.1], 1, [0, 0, -0.3]), box([0, -0.8, 0.52], [0.1, 0.6, 0.3], 1, [0.3, 0, 0])],
  },
];
export const SHAPE_COUNT = SHAPES.length;

/* ---------- small helpers ---------- */
const V = (x = 0, y = 0, z = 0) => new T3.Vector3(x, y, z);
const lambert = (color, o = {}) => new T3.MeshLambertMaterial({ color, ...o });
function mesh(geo, mat, p, parent) { const m = new T3.Mesh(geo, mat); if (p) m.position.set(p[0], p[1], p[2]); (parent || scene).add(m); return m; }
function canvasTex(w, h, paint) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; paint(c.getContext('2d'), w, h);
  const t = new T3.CanvasTexture(c); t.colorSpace = T3.SRGBColorSpace; return t;
}
/** A texture for image asset `id`; until that image has loaded, the emoji drawn on a canvas. */
function picTex(id, emoji) {
  const im = getImage(id);
  if (im) { const t = new T3.Texture(im); t.colorSpace = T3.SRGBColorSpace; t.needsUpdate = true; t.userData.real = true; return t; }
  return canvasTex(128, 128, (g) => { g.font = '96px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(emoji, 64, 70); });
}
/** Screen position (game pixels) of a world point. */
export function project(v) {
  const q = (tmp.proj || (tmp.proj = V())).copy(v).project(camera);
  return { x: (q.x + 1) / 2 * W, y: (1 - q.y) / 2 * H, z: q.z };
}
function setRay(px, py) { ray.setFromCamera(new T3.Vector2(px / W * 2 - 1, 1 - py / H * 2), camera); }
/** One geometry from several, each with its own colour baked into vertex colours (so one instanced draw shows a two-colour candy). */
function merged(list) {
  const pos = [], nor = [], col = [];
  for (const [geo, matrix, color] of list) {
    const g = geo.toNonIndexed(); g.applyMatrix4(matrix);
    const c = new T3.Color(color), n = g.attributes.position.count;
    pos.push(...g.attributes.position.array); nor.push(...g.attributes.normal.array);
    for (let i = 0; i < n; i++) col.push(c.r, c.g, c.b);
  }
  const out = new T3.BufferGeometry();
  out.setAttribute('position', new T3.Float32BufferAttribute(pos, 3)); out.setAttribute('normal', new T3.Float32BufferAttribute(nor, 3)); out.setAttribute('color', new T3.Float32BufferAttribute(col, 3));
  return out;
}
const M = (x, y, z, rx = 0, ry = 0, rz = 0, s = 1) => new T3.Matrix4().compose(V(x, y, z), new T3.Quaternion().setFromEuler(new T3.Euler(rx, ry, rz)), V(s, s, s));

/* ---------- the yard ---------- */
function buildYard() {
  setTheme(0);
  scene.add(new T3.HemisphereLight(0xffffff, 0xffe9c4, 2.6));
  const sun = new T3.DirectionalLight(0xffffff, 2.0); sun.position.set(4, 8, 8); scene.add(sun);
  groundMat = lambert(0x7ddc55); const ground = mesh(new T3.CircleGeometry(30, 40), groundMat); ground.rotation.x = -Math.PI / 2;
  lawnMat = lambert(0x97ea68); const lawn = mesh(new T3.CircleGeometry(4.2, 40), lawnMat, [0, 0.01, 0.4]); lawn.rotation.x = -Math.PI / 2;
  sea = mesh(new T3.PlaneGeometry(60, 5), new T3.MeshBasicMaterial({ color: 0x1fa8ff }), [0, 1.2, -12]); sea.visible = false;
  shock = mesh(new T3.RingGeometry(0.8, 1, 32), new T3.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false, side: T3.DoubleSide }), [0, 0, 0]); shock.visible = false;
  blob = mesh(new T3.CircleGeometry(1, 24), new T3.MeshBasicMaterial({ color: 0x1d7a2a, transparent: true, opacity: 0.3, depthWrite: false }), [0, 0.03, 0]); blob.rotation.x = -Math.PI / 2;
  // fence, bunting and presents: one vertex-coloured mesh instead of forty-seven
  const bits = [];
  for (let i = -9; i <= 9; i++) bits.push([new T3.BoxGeometry(0.5, 1.5 + (i % 2 ? 0.12 : 0), 0.08), M(i * 0.62, 0.75, -4.2), 0xffffff]);
  bits.push([new T3.BoxGeometry(12, 0.14, 0.1), M(0, 1.0, -4.15), 0xf1f1f1]);
  const flagCols = [0xff5aa8, 0xffc928, 0x35b6ff, 0x35d07f, 0x9b5cff, 0xff8a00];
  for (let i = 0; i < 15; i++) { const x = -4.2 + i * 0.6, flag = new T3.ConeGeometry(0.24, 0.5, 3); flag.scale(1, 1, 0.15); bits.push([flag, M(x * 1.15, 5.5 - Math.cos(x / 4.2 * 1.5) * 0.55, -3.2, Math.PI), flagCols[i % 6]]); }
  for (const [x, sz, c, r] of [[-1.9, 0.6, 0xff5aa8, 0xffffff], [-1.25, 0.42, 0x35b6ff, 0xffc928], [1.5, 0.52, 0x9b5cff, 0xffc928], [2.15, 0.7, 0x35d07f, 0xffffff]]) {
    bits.push([new T3.BoxGeometry(sz, sz, sz), M(x, sz / 2, -3.4), c], [new T3.BoxGeometry(sz * 1.03, sz * 1.03, sz * 0.18), M(x, sz / 2, -3.4), r], [new T3.BoxGeometry(sz * 0.18, sz * 1.03, sz * 1.03), M(x, sz / 2, -3.4), r]);
  }
  decor = [mesh(merged(bits), new T3.MeshLambertMaterial({ vertexColors: true }))];
  // clouds
  const white = new T3.MeshBasicMaterial({ color: 0xffffff });
  for (const [x, y, s] of [[-4.6, 6.2, 0.7], [4.8, 7.0, 0.8]]) for (const [dx, dy, k] of [[0, 0, 1], [-0.9, -0.15, 0.7], [0.95, -0.12, 0.75]]) { const c = mesh(new T3.SphereGeometry(1, 12, 8), white, [x + dx * s, y + dy * s, -9]); c.scale.set(1.2 * s * k, 0.7 * s * k, 1); }
  hills = [mesh(new T3.SphereGeometry(6, 24, 12), lambert(0x3fbf52), [-5, 0, -12]), mesh(new T3.SphereGeometry(6, 24, 12), lambert(0x2fae5a), [6, 0, -15])]; for (const h of hills) h.scale.y = 0.35;
  // beam and posts the pinata hangs from
  const wood = lambert(0xb9814a);
  mesh(new T3.BoxGeometry(8.4, 0.22, 0.22), wood, [0, BEAM_Y, 0]);
  mesh(new T3.BoxGeometry(0.24, BEAM_Y, 0.24), wood, [-4.1, BEAM_Y / 2, 0]); mesh(new T3.BoxGeometry(0.24, BEAM_Y, 0.24), wood, [4.1, BEAM_Y / 2, 0]);
  // balloons
  for (const [x, y, z, c] of [[-3.3, 3.6, -2.6, 0xff5aa8], [-2.8, 4.2, -3, 0xffc928], [-3.7, 4.5, -3.2, 0x35b6ff], [3.3, 3.8, -2.6, 0x9b5cff], [2.8, 4.5, -3, 0x35d07f], [3.8, 4.4, -3.2, 0xff8a00]]) {
    const b = mesh(new T3.SphereGeometry(0.42, 16, 12), lambert(c), [x, y, z]); b.scale.y = 1.2;
    mesh(new T3.CylinderGeometry(0.008, 0.008, 2.6), new T3.MeshBasicMaterial({ color: 0xffffff }), [0, -1.5, 0], b);
    balloons.push({ m: b, y, ph: x * 3 });
  }
  // craft table
  table = new T3.Group(); scene.add(table);
  mesh(new T3.BoxGeometry(3.4, 0.16, 1.9), lambert(0xfff4dc), [0, TABLE_TOP - 0.08, 0], table);
  mesh(new T3.BoxGeometry(3.42, 0.5, 0.04), lambert(0xff8a00), [0, TABLE_TOP - 0.33, 0.96], table);
  for (let i = 0; i < 7; i++) { const sc = mesh(new T3.CircleGeometry(0.245, 16, Math.PI, Math.PI), new T3.MeshBasicMaterial({ color: 0xffffff }), [-1.47 + i * 0.49, TABLE_TOP - 0.58, 0.985], table); sc.scale.y = 0.7; }
  for (const [x, z] of [[-1.5, -0.8], [1.5, -0.8], [-1.5, 0.8], [1.5, 0.8]]) mesh(new T3.BoxGeometry(0.16, TABLE_TOP - 0.16, 0.16), lambert(0xd89a5b), [x, (TABLE_TOP - 0.16) / 2, z], table);
  // rope and the swinging pivot
  swing = new T3.Group(); swing.position.set(0, BEAM_Y, 0); scene.add(swing);
  rope = mesh(new T3.CylinderGeometry(0.025, 0.025, 1), lambert(0xf2e2c4), [0, -0.5, 0], swing);
}

/* ---------- party themes ---------- */
const THEMES = [
  { sky: ['#1e9bff', '#4fc3ff', '#a6e6ff'], ground: 0x58cc48, lawn: 0x8fe45c, sea: false },  // garden
  { sky: ['#2aa9ff', '#8fe0ff', '#dff8ff'], ground: 0xffd774, lawn: 0xffe59a, sea: true },   // beach
  { sky: ['#5cc4ff', '#bfeaff', '#ffffff'], ground: 0xeaf7ff, lawn: 0xffffff, sea: false },  // snow
  { sky: ['#6fc6ff', '#ffc9ec', '#fff0fa'], ground: 0xff9fd0, lawn: 0xffc2e3, sea: false },  // candy land
];
export const THEME_COUNT = THEMES.length;
/** Dress the yard for party theme i (0 garden, 1 beach, 2 snow, 3 candy land). */
export function setTheme(i) {
  theme = i; const t = THEMES[i] || THEMES[0];
  if (scene.background && scene.background.dispose) scene.background.dispose();
  scene.background = canvasTex(8, 256, (g, w, h) => { const s = g.createLinearGradient(0, 0, 0, h); s.addColorStop(0, t.sky[0]); s.addColorStop(0.6, t.sky[1]); s.addColorStop(1, t.sky[2]); g.fillStyle = s; g.fillRect(0, 0, w, h); });
  if (groundMat) { groundMat.color.setHex(t.ground); lawnMat.color.setHex(t.lawn); sea.visible = t.sea; for (const h of hills) h.visible = i === 0; }
}

/* ---------- guests ---------- */
const guestTexes = {};
/** The texture of guest `id`, uploaded once and kept (the emoji stand-in is replaced when the picture has loaded). */
function guestTex(id, emoji) { const t = guestTexes[id]; if (t && (t.userData.real || !getImage(id))) return t; if (t) t.dispose(); return guestTexes[id] = picTex(id, emoji); }
/** Put the party guests in the yard. list: [{id, emoji}] in the order left-near, right-near, left-far, right-far. */
export function setGuests(list) {
  for (const g of guests) { scene.remove(g.s); scene.remove(g.sh); g.sh.geometry.dispose(); g.s.material.dispose(); }
  // smash: two in the front corners, two by the fence between them
  const spots = [[-1.62, 1.0], [1.62, 1.0], [-0.95, -2.2], [0.95, -2.2]], craft = [[-2.05, -0.3, 0.6], [2.05, -0.3, 0.6], [-3.6, -0.9, 0], [3.6, -0.9, 0]]; // craft: x, z, and the height of the stool they stand on (the back two wait off stage)
  guests = list.slice(0, 4).map((it, i) => {
    const s = new T3.Sprite(new T3.SpriteMaterial({ map: guestTex(it.id, it.emoji) })); s.center.set(0.5, 0);
    s.position.set(spots[i][0], 0, spots[i][1]); scene.add(s);
    const sh = mesh(new T3.CircleGeometry(0.42, 16), blob.material, [0, 0.02, 0]); sh.rotation.x = -Math.PI / 2; sh.scale.y = 0.5;
    return { s, id: it.id, emoji: it.emoji, jump: 0, ph: i * 1.7, size: i < 2 ? 1.25 : 1.35, smash: spots[i], craft: craft[i], rush: 0, sh };
  });
}
/** Guests jump. power 1 is a small hop, 3 a party. */
export function cheer(power = 1) { for (const g of guests) g.jump = Math.max(g.jump, 0.35 * power + Math.random() * 0.2); }

/* ---------- pinata ---------- */
let fringeTex = null;
function patchMaterial() { return lambert(CARD, { map: fringeTex }); }
/** A paper fringe for a box band: four flared strips hanging from just under its top edge, as one geometry. */
function boxSkirt(w, d, top, len, flare) {
  const pos = [], nor = [], uv = [], out = Math.sin(flare) * len, down = Math.cos(flare) * len;
  const side = (ax, az, bx, bz, nx, nz, width) => {
    const rep = Math.max(1, Math.round(width / 0.45));
    const quad = [[ax, top, az, 0, 1], [bx, top, bz, rep, 1], [bx + nx * out, top - down, bz + nz * out, rep, 0], [ax, top, az, 0, 1], [bx + nx * out, top - down, bz + nz * out, rep, 0], [ax + nx * out, top - down, az + nz * out, 0, 0]];
    for (const q of quad) { pos.push(q[0], q[1], q[2]); nor.push(nx, 0.3, nz); uv.push(q[3], q[4]); }
  };
  const x = w / 2, z = d / 2;
  side(-x, z, x, z, 0, 1, w); side(x, -z, -x, -z, 0, -1, w); side(x, z, x, -z, 1, 0, d); side(-x, -z, -x, z, -1, 0, d);
  const g = new T3.BufferGeometry();
  g.setAttribute('position', new T3.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new T3.Float32BufferAttribute(nor, 3)); g.setAttribute('uv', new T3.Float32BufferAttribute(uv, 2));
  return g;
}
/** A paper fringe for a round band: an open, flared ring. */
function roundSkirt(rTop, rBottom, len) {
  const g = new T3.CylinderGeometry(rTop, rBottom, len, 20, 1, true), uv = g.attributes.uv, rep = Math.max(3, Math.round(rTop * 6.28 / 0.45));
  for (let i = 0; i < uv.count; i++) uv.setX(i, uv.getX(i) * rep);
  return g;
}
/** Hang fringe `geo` on a patch. It shows only once the patch has paper on it. */
function addSkirt(pt, geo, y = 0) {
  const mat = new T3.MeshLambertMaterial({ map: skirtTex, alphaTest: 0.5, side: T3.DoubleSide });
  pt.skirt = new T3.Mesh(geo, mat); pt.skirt.position.y = y; pt.skirt.visible = false; pt.m.add(pt.skirt);
}
function addPatch(geo, p, rot) {
  const m = mesh(geo, patchMaterial(), p, P.body); if (rot) m.rotation.set(rot[0], rot[1], rot[2]);
  const patch = { m, color: -1, home: m.position.clone(), homeQ: m.quaternion.clone(), pop: 0, off: false, v: V(), w: V(), life: 0 };
  m.userData.patch = patch; P.patches.push(patch); return patch;
}
/**
 * Build pinata `shape`. colors: one paper colour index per patch, or -1 for bare cardboard.
 * @returns {number} how many patches it has
 */
export function buildPinata(shape, colors = [], palette) {
  if (P) { for (const pt of P.patches) if (pt.off) { scene.remove(pt.m); pt.m.traverse(o => { if (o.isMesh) { o.geometry.dispose(); o.material.dispose(); } }); } // paper that fell off lives in the yard, not in the group
    swing.remove(P.group); P.group.traverse(o => { if (o.isMesh) { o.geometry.dispose(); if (o.material.dispose) o.material.dispose(); } }); }
  const def = SHAPES[shape];
  P = { def, shape, fit: Math.min(1, FIT_HEIGHT / (def.foot + def.top)), group: new T3.Group(), body: new T3.Group(), patches: [], extras: [], eyes: null, palette, yaw: def.yaw === undefined ? -0.55 : def.yaw, yawT: 0, squash: 0, theta: 0, omega: 0, hang: 0, gold: false, burst: false, stickers: 0, stuck: [], appear: 0 };
  P.yawT = P.yaw; P.group.add(P.body); swing.add(P.group);
  for (const part of def.parts) {
    if (part.k === 'box') {
      const n = part.bands, bh = part.s[1] / n, holder = new T3.Group(); holder.position.set(part.p[0], part.p[1], part.p[2]); if (part.r) holder.rotation.set(part.r[0], part.r[1], part.r[2]); P.body.add(holder);
      for (let i = 0; i < n; i++) { const pt = addPatch(new T3.BoxGeometry(part.s[0], bh * 0.98, part.s[2]), [0, -part.s[1] / 2 + bh * (i + 0.5), 0]); holder.add(pt.m); addSkirt(pt, boxSkirt(part.s[0], part.s[2], bh * 0.2, Math.min(0.3, bh * 0.85), 0.32)); }
    } else if (part.k === 'cyl') {
      for (let i = 0; i < part.prof.length - 1; i++) { const [y0, r0] = part.prof[i], [y1, r1] = part.prof[i + 1]; const h = y1 - y0, pt = addPatch(new T3.CylinderGeometry(r1, r0, h * 0.98, 20), [part.p[0], part.p[1] + (y0 + y1) / 2, part.p[2]]); addSkirt(pt, roundSkirt((r0 + r1) / 2 + 0.01, r0 + 0.07, h * 0.6), -h * 0.2); }
    } else if (part.k === 'cone') { const pt = addPatch(new T3.ConeGeometry(part.r, part.h, 14), part.p, part.rot); addSkirt(pt, roundSkirt(part.r * 0.72, part.r * 1.12, part.h * 0.3), -part.h * 0.36); }
    else if (part.k === 'arc') { const geo = new T3.TorusGeometry(part.R, part.tube, 10, 8, TAU / 6 * 0.97); addPatch(geo, part.p, [0, 0, part.a]); }
  }
  for (const e of def.extra || []) { const m = mesh(new T3.ConeGeometry(e.r, e.h, 12), lambert(e.c), e.p, P.body); if (e.rot) m.rotation.set(e.rot[0], e.rot[1], e.rot[2]); P.extras.push(m); }
  P.patches.forEach((pt, i) => { if (colors[i] >= 0) setPatch(pt, colors[i], false); });
  P.appear = 1;
  layoutPinata(0);
  return P.patches.length;
}
function setPatch(pt, color, pop = true) {
  const hex = P.gold ? GOLD : P.palette[color];
  pt.color = color; pt.m.material.color.setHex(hex); if (pop) pt.pop = 1;
  if (pt.skirt) { pt.skirt.material.color.setHex(hex); pt.skirt.visible = true; }
}
export const patchCount = () => P ? P.patches.length : 0;
export const coveredCount = () => P ? P.patches.filter(p => p.color >= 0).length : 0;
export const patchColors = () => P ? P.patches.map(p => p.color) : [];
/** True when the finger is on the pinata. */
export function overPinata(px, py) { if (!P) return false; setRay(px, py); return ray.intersectObjects(P.patches.filter(p => !p.off).map(p => p.m), false).length > 0; }
/**
 * Paste paper of `color` where the finger is. With `nearest`, a finger that misses the pinata still
 * covers the bare patch closest to it (small children tap next to things).
 * @returns {{x:number,y:number}|null} where the paper landed on screen, or null when nothing changed
 */
export function paintAt(px, py, color, nearest) {
  if (!P) return null;
  setRay(px, py);
  const hit = ray.intersectObjects(P.patches.map(p => p.m), false)[0];
  let pt = hit ? hit.object.userData.patch : null;
  if (pt && pt.color === color) pt = null;
  if (!pt && nearest && (!hit || hit.object.userData.patch.color >= 0)) {
    let best = 1e9;
    for (const q of P.patches) { if (q.color >= 0) continue; const s = project(q.m.getWorldPosition(V())); const d = (s.x - px) ** 2 + (s.y - py) ** 2; if (d < best) { best = d; pt = q; } }
  }
  if (!pt) return null;
  setPatch(pt, color);
  const s = project(pt.m.getWorldPosition(V())); chips(pt.m.getWorldPosition(V()), 5, [P.palette[color]], 1.6);
  return { x: s.x, y: s.y };
}
/** Turn the pinata by a finger drag of dx pixels. */
export function turn(dx) { if (P) P.yawT += dx * 0.012; }
/** Give the pinata its face: two big eyes (and a smile on shapes without a head). */
export function addFace() {
  if (!P || P.eyes) return;
  P.eyes = new T3.Group(); P.body.add(P.eyes); P.eyes.userData.pop = 1;
  const white = new T3.MeshBasicMaterial({ color: 0xffffff }), black = new T3.MeshBasicMaterial({ color: 0x2b1b4a });
  for (const e of P.def.eyes) {
    const side = Math.sign(e[2]) || 1, g = new T3.Group(); g.position.set(e[0], e[1], e[2]); P.eyes.add(g);
    mesh(new T3.SphereGeometry(0.115, 16, 12), white, [0, 0, 0], g).scale.z = 0.5;
    mesh(new T3.SphereGeometry(0.07, 14, 10), black, [0.015, -0.005, 0.045 * side], g).scale.z = 0.5;
    mesh(new T3.SphereGeometry(0.028, 8, 6), white, [0.045, 0.03, 0.075 * side], g).scale.z = 0.5;
  }
  if (P.def.smile) { const s = mesh(new T3.TorusGeometry(0.12, 0.022, 6, 14, Math.PI), black, P.def.smile, P.eyes); s.rotation.z = Math.PI; }
}
const stickerTex = {};
/**
 * Stick sticker `id` where the finger is; a finger that misses puts it on a random patch facing the player.
 * @returns {{x:number,y:number}} where it landed on screen
 */
export function stickerAt(px, py, id, emoji) {
  setRay(px, py);
  const live = P.patches.filter(p => !p.off), hit = ray.intersectObjects(live.map(p => p.m), false)[0];
  let target, point, normal;
  if (hit) { target = hit.object; point = target.worldToLocal(hit.point.clone()); normal = hit.face.normal.clone(); }
  else {
    // the finger missed (a tap beside the pinata, or in the hole of the donut): look around it in widening rings for the nearest paper
    const mid = project(P.group.getWorldPosition(V())), far = px < 0 || py < 0;
    for (let i = 0; i < 40 && !target; i++) {
      const r = far ? Math.random() * 150 : 16 + i * 9, a = Math.random() * TAU;
      setRay((far ? mid.x : px) + Math.cos(a) * r, (far ? mid.y : py) + Math.sin(a) * r);
      const h = ray.intersectObjects(live.map(p => p.m), false)[0];
      if (h) { target = h.object; point = target.worldToLocal(h.point.clone()); normal = h.face.normal.clone(); }
    }
    if (!target) return null;
  }
  let tex = stickerTex[id];
  if (!tex || (!tex.userData.real && getImage(id))) { if (tex) tex.dispose(); tex = stickerTex[id] = picTex(id, emoji); }
  const s = new T3.Mesh(new T3.PlaneGeometry(0.44, 0.44), new T3.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, side: T3.DoubleSide }));
  normal.normalize(); s.position.copy(point).addScaledVector(normal, 0.13 + P.stickers * 0.002); // beyond the widest flare of the fringe, or the paper strips cover it
  s.quaternion.setFromUnitVectors(V(0, 0, 1), normal); s.rotateZ((Math.random() - 0.5) * 0.7); s.renderOrder = 2;
  s.userData.pop = 1; s.scale.setScalar(0.01); target.add(s); P.stickers++; P.stuck.push(s);
  return project(s.getWorldPosition(V()));
}
/** Candy falling into the pinata through its top (a visual only). */
export function dropIn(type, n) {
  const top = P.group.localToWorld(V(...P.def.hatch));
  for (let i = 0; i < n; i++) spawnCandy(type, top.x + (Math.random() - 0.5) * 0.5, top.y + 1.5 + i * 0.28, top.z + 0.25, 0, -1, 0, { into: top.y, scale: 0.8 });
}
/** Turn every paper golden (the golden pinata). */
export function setGold(on) { if (!P) return; P.gold = on; for (const pt of P.patches) if (pt.color >= 0) { const hex = on ? GOLD : P.palette[pt.color]; pt.m.material.color.setHex(hex); if (pt.skirt) pt.skirt.material.color.setHex(hex); } if (on) chips(P.group.getWorldPosition(V()), 40, [GOLD, 0xfff3b0], 3); }

/* ---------- views ---------- */
/** Jump straight to the current view, with no camera glide and no hoist (the opening pinata is already hanging). */
export function snapView() { cam.pos = view.pos.slice(); cam.look = view.look.slice(); if (P) { P.hang = P.hangT; layoutPinata(0); } }
/** 'craft': on the table, close up. 'smash': hanging from the beam, the whole yard in view. */
export function setView(name) { view = name === 'smash' ? SMASH : CRAFT; if (P) P.hangT = name === 'smash' ? 1 : 0; }
function layoutPinata(dt) {
  if (!P) return;
  if (P.hangT === undefined) P.hangT = 0;
  P.hang += (P.hangT - P.hang) * Math.min(1, dt * 3.2); if (dt === 0) P.hang = P.hangT;
  const k = P.hang, restY = TABLE_TOP + P.def.foot * P.fit, hangY = BEAM_Y - ROPE - 0.9;
  const y = restY + (hangY - restY) * k;
  P.group.position.set(0, y - BEAM_Y, 0);
  const topY = y + (P.def.hatch[1] + 0.3);
  rope.visible = k > 0.02 && !P.burst; rope.scale.y = Math.max(0.01, BEAM_Y - topY); rope.position.y = -(BEAM_Y - topY) / 2;
  table.position.z = -k * 3.0; table.position.y = -k * 1.4; table.visible = k < 0.98;
  blob.position.y = k < 0.5 ? TABLE_TOP + 0.012 : 0.03; blob.scale.setScalar(1.25 - k * 0.3); blob.visible = !P.burst;
  blob.position.x = Math.sin(P.theta) * (BEAM_Y - y);
}

/* ---------- stick ---------- */
/** Build stick `kind` (0 bat, 1 squeaky hammer, 2 wand, 3 foam sword, 4 giant lollipop). */
export function setBat(kind) {
  batKind = kind; const shown = !!batPivot && batPivot.visible;
  if (batPivot) { batPivot.traverse(o => { if (o.isMesh) { o.geometry.dispose(); o.material.dispose(); } }); scene.remove(batPivot); }
  batPivot = new T3.Group(); batPivot.position.set(1.3, 2.0, 1.5); scene.add(batPivot); batPivot.userData = { t: 1 };
  const b = new T3.Group(); batPivot.add(b);
  const cyl = (r0, r1, h, c, y) => mesh(new T3.CylinderGeometry(r1, r0, h, 12), lambert(c), [0, y, 0], b);
  if (kind === 0) { cyl(0.05, 0.11, 1.5, 0xe2a35c, 0.75); cyl(0.06, 0.06, 0.3, 0xff5aa8, 0.15); }
  else if (kind === 1) { cyl(0.05, 0.05, 1.1, 0xffc928, 0.55); const h = mesh(new T3.CylinderGeometry(0.26, 0.26, 0.7, 14), lambert(0xff3b3b), [0, 1.2, 0], b); h.rotation.z = Math.PI / 2; mesh(new T3.CylinderGeometry(0.27, 0.27, 0.16, 14), lambert(0xffc928), [0, 1.2, 0], b).rotation.z = Math.PI / 2; }
  else if (kind === 2) { cyl(0.035, 0.035, 1.3, 0x9b5cff, 0.65); const s = mesh(new T3.OctahedronGeometry(0.24), lambert(GOLD), [0, 1.42, 0], b); s.scale.z = 0.5; }
  else if (kind === 3) { mesh(new T3.BoxGeometry(0.2, 1.3, 0.07), lambert(0x35b6ff), [0, 0.95, 0], b); mesh(new T3.BoxGeometry(0.5, 0.09, 0.1), lambert(0xffc928), [0, 0.3, 0], b); cyl(0.05, 0.05, 0.3, 0x9b5cff, 0.13); }
  else { cyl(0.035, 0.035, 1.2, 0xffffff, 0.6); const d = mesh(new T3.CylinderGeometry(0.36, 0.36, 0.1, 20), lambert(0xff5aa8), [0, 1.42, 0], b); d.rotation.x = Math.PI / 2; mesh(new T3.TorusGeometry(0.2, 0.05, 6, 16), lambert(0xffffff), [0, 1.42, 0.06], b); }
  batPivot.visible = shown;
  if (!swoosh) { swoosh = mesh(new T3.RingGeometry(0.85, 1.55, 16, 1, 1.07, 1.75), new T3.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false, side: T3.DoubleSide }), [1.3, 2.0, 1.5]); swoosh.rotation.x = 0.25; }
}
/**
 * One hit: the stick swings, the pinata rocks, paper chips fly.
 * @param {number} power 1 normal, 2 a perfect hit
 */
export function hit(power = 1) {
  if (!P || P.burst) return;
  batPivot.userData.t = 0;
  P.omega += (P.theta < -0.14 ? 0.4 : -0.8) * power; P.squash = 1;
  const at = P.group.getWorldPosition(V()); at.x += 0.7; at.z += 0.5;
  const cols = P.patches.filter(p => !p.off && p.color >= 0).map(p => P.gold ? GOLD : P.palette[p.color]);
  chips(at, 8 * power, cols.length ? cols : [CARD], 2.4);
  shake = Math.max(shake, 0.07 * power); punch = 1;
  // each hit leaves a mark: two patches get knocked out of line and stay that way
  const live = P.patches.filter(p => !p.off);
  for (let i = 0; i < 2 && live.length; i++) { const pt = live[Math.random() * live.length | 0]; pt.m.position.x += (Math.random() - 0.5) * 0.1; pt.m.position.z += (Math.random() - 0.5) * 0.1; pt.m.rotation.z += (Math.random() - 0.5) * 0.28; pt.m.rotation.x += (Math.random() - 0.5) * 0.2; pt.pop = 0.6; }
}
/** Paper patches fall off as the pinata breaks: `n` of them drop to the ground. */
export function shed(n) {
  const live = P.patches.filter(p => !p.off);
  for (let i = 0; i < n && live.length > 2; i++) flyOff(live.splice(Math.random() * live.length | 0, 1)[0], 1.5);
}
function flyOff(pt, speed) {
  const wp = pt.m.getWorldPosition(V()), wq = pt.m.getWorldQuaternion(new T3.Quaternion()), c = P.group.getWorldPosition(V());
  scene.attach(pt.m); pt.m.position.copy(wp); pt.m.quaternion.copy(wq);
  pt.off = true; pt.life = 2.2;
  pt.v.copy(wp).sub(c).normalize().multiplyScalar(speed * (1.5 + Math.random())); pt.v.y += speed * 1.2; pt.v.z += speed * 0.6;
  pt.w.set((Math.random() - 0.5) * 9, (Math.random() - 0.5) * 9, (Math.random() - 0.5) * 9);
}
/** Candy leaks out of a cracked pinata. */
export function leak(types, n) { const c = P.group.getWorldPosition(V()); for (let i = 0; i < n; i++) spawnCandy(types[Math.random() * types.length | 0], c.x + (Math.random() - 0.5) * 0.6, c.y - 0.5, c.z + 0.3, (Math.random() - 0.5) * 2.5, 1 + Math.random() * 2, 0.8 + Math.random() * 1.5); }
/**
 * The pinata bursts: every patch flies, candy rains, the capsule drops.
 * @param {number[]} types candy type of each piece to rain
 * @param {number} scale candy size (a mega rain is bigger)
 */
export function burst(types, scale = 1) {
  if (!P || P.burst) return;
  const c = P.group.getWorldPosition(V());
  for (const pt of P.patches) { if (!pt.off) flyOff(pt, 3.4); pt.life = Math.min(pt.life, 1.1); } // paper is gone before the grabbing starts
  for (const e of P.extras) e.visible = false; if (P.eyes) P.eyes.visible = false;
  P.burst = true; rope.visible = false; blob.visible = false;
  types.forEach((t, i) => spawnCandy(t, c.x + (Math.random() - 0.5) * 1.2, c.y + (Math.random() - 0.5) * 0.9, c.z + (Math.random() - 0.5) * 0.6, (Math.random() - 0.5) * 6.5, 2 + Math.random() * 5.5, 0.4 + Math.random() * 3.2, { scale, delay: i * 0.012 }));
  const all = [0xff5aa8, 0xffc928, 0x35b6ff, 0x35d07f, 0x9b5cff, 0xff8a00, 0xffffff];
  chips(c, 130, all, 6.5); chips(V(c.x, c.y + 1, c.z), 50, all, 3);
  shock.visible = true; shock.position.copy(c); shock.scale.setScalar(0.3); shock.material.opacity = 0.9; shock.lookAt(camera.position);
  guests.forEach((g, i) => { if (i >= 2) g.rush = 1; }); // only the two at the back step in; the front two would cover the candy
  capsule.g.visible = true; capsule.g.position.copy(c); capsule.v.set(0.2, 4.2, 1.2); capsule.rest = false; capsule.open = 0; capsule.top.position.set(0, 0, 0); capsule.top.rotation.set(0, 0, 0);
  shake = 0.4; cheer(3);
}

/* ---------- candy ---------- */
function buildCandy() {
  const S = (r, w = 10, h = 8) => new T3.SphereGeometry(r, w, h), C = (r0, r1, h, s = 10) => new T3.CylinderGeometry(r1, r0, h, s), wt = 0xffffff;
  const geos = [
    merged([[C(0.15, 0.15, 0.06, 14), M(0, 0.1, 0, Math.PI / 2), wt], [C(0.012, 0.012, 0.3, 6), M(0, -0.12, 0), 0xdddddd]]),            // lollipop
    merged([[S(0.11), M(0, 0, 0), wt], [new T3.ConeGeometry(0.08, 0.13, 8), M(0.15, 0, 0, 0, 0, Math.PI / 2), wt], [new T3.ConeGeometry(0.08, 0.13, 8), M(-0.15, 0, 0, 0, 0, -Math.PI / 2), wt]]), // wrapped
    merged([[S(0.1), M(0, -0.03, 0, 0, 0, 0, 1), wt], [S(0.075), M(0, 0.12, 0), wt], [S(0.03, 6, 5), M(0.06, 0.19, 0), wt], [S(0.03, 6, 5), M(-0.06, 0.19, 0), wt]]),                      // gummy bear
    merged([[C(0.14, 0.14, 0.04, 16), M(0, 0, 0, Math.PI / 2), wt]]),                                                                                    // chocolate coin
    merged([[S(0.1), new T3.Matrix4().makeScale(1.5, 0.85, 0.85), wt]]),                                                                                  // jelly bean
  ];
  const cap = 44;
  candyMesh = geos.map(geo => { const im = new T3.InstancedMesh(geo, new T3.MeshLambertMaterial({ vertexColors: true }), cap); im.count = 0; im.frustumCulled = false; scene.add(im); return im; });
}
function spawnCandy(type, x, y, z, vx, vy, vz, o = {}) {
  const im = candyMesh[type]; let same = 0; for (const c of candies) if (c.type === type) same++;
  if (same >= im.instanceMatrix.count * (quality < 1 ? 0.5 : 1)) return;
  const cols = CANDY_COLORS[type];
  candies.push({ type, p: V(x, y, z), v: V(vx, vy, vz), r: new T3.Euler(Math.random() * 6, Math.random() * 6, Math.random() * 6), w: V((Math.random() - 0.5) * 12, (Math.random() - 0.5) * 12, (Math.random() - 0.5) * 12),
    col: new T3.Color(cols[Math.random() * cols.length | 0]), into: o.into, scale: (o.scale || 1) * (o.into === undefined ? 1.35 : 1), delay: o.delay || 0, rest: false, grow: o.into === undefined ? 0 : 1 });
}
function updateCandy(dt) {
  const counts = [0, 0, 0, 0, 0], m4 = tmp.m4 || (tmp.m4 = new T3.Matrix4()), q = tmp.q || (tmp.q = new T3.Quaternion()), s = tmp.s || (tmp.s = V());
  for (let i = candies.length - 1; i >= 0; i--) {
    const c = candies[i];
    if (c.delay > 0) { c.delay -= dt; continue; }
    c.grow = Math.min(1, c.grow + dt * 6);
    if (!c.rest) {
      c.v.y -= 15 * dt; c.p.addScaledVector(c.v, dt);
      c.r.x += c.w.x * dt; c.r.y += c.w.y * dt; c.r.z += c.w.z * dt;
      if (c.into !== undefined) { if (c.p.y < c.into) { candies.splice(i, 1); if (P) P.squash = Math.max(P.squash, 0.5); continue; } }
      else {
        if (c.p.y < 0.13 * c.scale) { c.p.y = 0.13 * c.scale; if (Math.abs(c.v.y) < 1.2) { c.v.set(0, 0, 0); c.rest = true; } else { c.v.y *= -0.42; c.v.x *= 0.7; c.v.z *= 0.7; c.w.multiplyScalar(0.6); } }
        if (Math.abs(c.p.x) > 1.2) { c.p.x = Math.sign(c.p.x) * 1.2; c.v.x *= -0.5; } // candy lands between the guests, never behind them
        if (c.p.z > 2.3) { c.p.z = 2.3; c.v.z *= -0.5; } if (c.p.z < -1.4) { c.p.z = -1.4; c.v.z *= -0.5; }
      }
    }
  }
  for (const c of candies) {
    if (c.delay > 0) continue;
    const im = candyMesh[c.type], n = counts[c.type]++;
    m4.compose(c.p, q.setFromEuler(c.r), s.setScalar(c.scale * c.grow)); im.setMatrixAt(n, m4); im.setColorAt(n, c.col);
  }
  candyMesh.forEach((im, t) => { if (!counts[t] && !im.count) return; im.count = counts[t]; im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true; });
}
/** How many candies are lying in the yard (not the ones falling into the pinata). */
export const candyLeft = () => candies.filter(c => c.into === undefined).length;
/**
 * Pick up every candy within `radius` pixels of the finger.
 * @returns {{x:number,y:number,type:number}[]} where each one was on screen
 */
export function collectAt(px, py, radius) {
  const out = [];
  for (let i = candies.length - 1; i >= 0; i--) {
    const c = candies[i]; if (c.into !== undefined || c.delay > 0) continue;
    const s = project(c.p);
    if ((s.x - px) ** 2 + (s.y - py) ** 2 < radius * radius) { out.push({ x: s.x, y: s.y, type: c.type }); candies.splice(i, 1); }
  }
  return out;
}
/** Pick up everything that is left. */
export function collectAll() { const out = candies.filter(c => c.into === undefined).map(c => { const s = project(c.p); return { x: s.x, y: s.y, type: c.type }; }); candies = candies.filter(c => c.into !== undefined); return out; }
export function clearCandy() { candies = []; }

/* ---------- capsule ---------- */
function buildCapsule() {
  const g = new T3.Group(); scene.add(g); g.visible = false;
  const half = (c, flip) => { const m = mesh(new T3.SphereGeometry(0.5, 20, 10, 0, TAU, 0, Math.PI / 2), lambert(c, { side: T3.DoubleSide }), null, g); if (flip) m.rotation.x = Math.PI; return m; };
  const top = half(0xff3b7f, false), bottom = half(0xffc928, true);
  mesh(new T3.TorusGeometry(0.5, 0.045, 8, 24), lambert(0x7a3cff), null, bottom).rotation.x = Math.PI / 2;
  const mark = new T3.Sprite(new T3.SpriteMaterial({ map: canvasTex(64, 64, (k) => { k.font = '900 54px Arial'; k.textAlign = 'center'; k.textBaseline = 'middle'; k.lineWidth = 8; k.strokeStyle = '#fff'; k.strokeText('?', 32, 34); k.fillStyle = '#ff2d8a'; k.fillText('?', 32, 34); }), depthTest: false }));
  mark.scale.setScalar(0.62); mark.position.set(0, 0.02, 0.52); g.add(mark);
  capsule = { g, top, bottom, mark, v: V(), rest: false, open: 0 };
}
/** Screen position of the capsule, or null while it is hidden. */
export function capsuleAt() { if (!capsule.g.visible) return null; const s = project(capsule.g.position); return { x: s.x, y: s.y - 20, rest: capsule.rest, open: capsule.open > 0 }; }
/** Pop the capsule open. */
export function openCapsule() { if (capsule.open) return; capsule.open = 0.001; capsule.mark.visible = false; chips(capsule.g.position.clone(), 30, [0xffc928, 0xffffff, 0xff5aa8], 3.5); }
function updateCapsule(dt) {
  const c = capsule; if (!c.g.visible) return;
  if (!c.rest) {
    c.v.y -= 15 * dt; c.g.position.addScaledVector(c.v, dt); c.g.rotation.z += dt * 5;
    c.g.position.z = Math.min(c.g.position.z, 1.6); if (c.g.position.y < 0.52) { c.g.position.y = 0.52; if (Math.abs(c.v.y) < 1.4) { c.rest = true; c.g.rotation.z = 0; } else { c.v.y *= -0.5; c.v.x *= 0.6; c.v.z *= 0.6; } }
  } else if (!c.open) { c.g.position.y = 0.52 + Math.abs(Math.sin(clock * 5)) * 0.22; c.g.rotation.z = Math.sin(clock * 5) * 0.12; }
  if (c.open) { c.open += dt; c.top.position.y += dt * 2.2; c.top.rotation.z += dt * 5; c.top.position.x += dt * 1.2; if (c.open > 1.2) c.g.visible = false; }
}
export function hideCapsule() { capsule.g.visible = false; capsule.mark.visible = true; }

/* ---------- confetti ---------- */
function buildConfetti() {
  const cap = 260;
  conf = new T3.InstancedMesh(new T3.PlaneGeometry(0.09, 0.15), new T3.MeshBasicMaterial({ side: T3.DoubleSide }), cap); conf.count = 0; conf.frustumCulled = false; scene.add(conf);
}
/** Paper chips: n pieces from point `at`, in the given colours. */
export function chips(at, n, cols, speed = 2.5) {
  n = Math.ceil(n * quality);
  for (let i = 0; i < n; i++) {
    if (confP.length >= conf.instanceMatrix.count * (quality < 1 ? 0.5 : 1)) confP.shift();
    const a = Math.random() * TAU, u = Math.random();
    confP.push({ p: at.clone(), v: V(Math.cos(a) * speed * u, speed * (0.4 + Math.random()), Math.sin(a) * speed * u * 0.7 + speed * 0.2), r: new T3.Euler(Math.random() * 6, Math.random() * 6, 0), w: 4 + Math.random() * 8, life: 1.6 + Math.random() * 1.6, col: new T3.Color(cols[Math.random() * cols.length | 0]) });
  }
}
function updateConfetti(dt) {
  const m4 = tmp.m4, q = tmp.q, s = tmp.s; let n = 0;
  for (let i = confP.length - 1; i >= 0; i--) {
    const c = confP[i]; c.life -= dt; if (c.life <= 0) { confP.splice(i, 1); continue; }
    c.v.y -= 5 * dt; c.v.multiplyScalar(1 - 1.4 * dt); c.p.addScaledVector(c.v, dt); c.r.x += c.w * dt; c.r.y += c.w * 0.7 * dt;
    if (c.p.y < 0.03) { c.p.y = 0.03; c.v.set(0, 0, 0); c.w = 0; c.r.x = Math.PI / 2; }
  }
  for (const c of confP) { m4.compose(c.p, q.setFromEuler(c.r), s.setScalar(Math.min(1, c.life * 3))); conf.setMatrixAt(n, m4); conf.setColorAt(n, c.col); n++; }
  if (!n && !conf.count) return;
  conf.count = n; conf.instanceMatrix.needsUpdate = true; if (conf.instanceColor) conf.instanceColor.needsUpdate = true;
}

/* ---------- frame ---------- */
/** Swing of the hanging pinata, radians; 0 is straight down. */
export const swingAngle = () => P ? P.theta : 0;
/**
 * For the playtest: how many stickers the camera can actually see (nothing of the pinata, fringe included, in front of their middle),
 * and the screen box of the whole pinata.
 */
export function seen() {
  const solid = []; P.group.traverse(o => { if (o.isMesh && !P.stuck.includes(o) && o.visible) solid.push(o); });
  let visible = 0, top = 1e9, bottom = -1e9, left = 1e9, right = -1e9;
  for (const s of P.stuck) {
    const at = s.getWorldPosition(V()), dir = at.clone().sub(camera.position), dist = dir.length();
    ray.set(camera.position, dir.normalize());
    const hit = ray.intersectObjects(solid, false)[0];
    if (!hit || hit.distance > dist - 0.01) visible++;
  }
  const box = new T3.Box3();
  for (const pt of P.patches) { if (pt.off) continue; box.setFromObject(pt.m, true); // true: measure the real corners, not a loose box around a tilted part
    for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z]) { const q = project(V(x, y, z)); top = Math.min(top, q.y); bottom = Math.max(bottom, q.y); left = Math.min(left, q.x); right = Math.max(right, q.x); } }
  return { stickers: P.stuck.length, visible, top, bottom, left, right };
}
/** Screen position of the middle of the pinata. */
export function pinataAt() { return P ? project(P.group.getWorldPosition(V())) : { x: W / 2, y: H / 2, z: 0 }; }
/** Push the pinata into a wide swing (the party round). */
export function pushSwing(amount) { if (P) P.omega += amount; }
export function showBat(on) { if (batPivot) batPivot.visible = on; }
/**
 * Advance the yard by dt seconds.
 * @param {number} dt seconds, already slowed during slow motion
 * @param {number} idle seconds for ambient motion that should not slow down
 */
export function update(dt, idle = dt) {
  clock += idle;
  if (P) {
    // pendulum
    const k = P.hang;
    P.omega += (-9 * Math.sin(P.theta) - P.omega * 0.9) * dt; P.theta = Math.max(-0.24, Math.min(0.24, P.theta + P.omega * dt * k));
    if (k < 0.5) { P.theta *= 0.9; P.omega *= 0.9; }
    swing.rotation.z = P.theta;
    layoutPinata(dt);
    P.yaw += (P.yawT - P.yaw) * Math.min(1, dt * 10); if (k < 0.5 && !P.drag) P.yawT += (((P.def.yaw === undefined ? -0.55 : P.def.yaw)) - P.yawT) * dt * 0.5;
    P.squash = Math.max(0, P.squash - dt * 5); P.appear = Math.max(0, P.appear - dt * 3.5);
    const sq = Math.sin(P.squash * Math.PI) * 0.16, ap = (1 - P.appear * P.appear * 0.6) * (P.fit + (1 - P.fit) * k); // table size while making, full size once it hangs
    P.group.rotation.y = P.yaw + Math.sin(clock * 1.3) * 0.05 * (1 - k);
    P.group.scale.set((1 + sq) * ap, (1 - sq) * ap, (1 + sq) * ap);
    for (const pt of P.patches) {
      if (pt.off) {
        pt.life -= dt; pt.v.y -= 12 * dt; pt.m.position.addScaledVector(pt.v, dt); pt.m.rotation.x += pt.w.x * dt; pt.m.rotation.y += pt.w.y * dt;
        if (pt.m.position.y < 0.08) { pt.m.position.y = 0.08; pt.v.set(0, 0, 0); pt.w.set(0, 0, 0); }
        pt.m.scale.setScalar(Math.max(0.001, Math.min(1, pt.life * 2))); pt.m.visible = pt.life > 0;
      } else if (pt.pop > 0) { pt.pop = Math.max(0, pt.pop - dt * 5); pt.m.scale.setScalar(1 + Math.sin(pt.pop * Math.PI) * 0.28); }
      if (pt.skirt && pt.skirt.visible) pt.skirt.scale.set(1 + P.squash * 0.12, 1 + Math.sin(clock * 3 + pt.home.y * 4) * 0.04 - P.squash * 0.25, 1 + P.squash * 0.12);
    }
    P.group.traverse(o => { if (o.userData.pop > 0) { o.userData.pop = Math.max(0, o.userData.pop - dt * 4); const t = 1 - o.userData.pop; o.scale.setScalar(t < 1 ? 1 + Math.sin(t * Math.PI) * 0.5 * (1 - t) + (t - 1) * (1 - t) : 1); if (o.userData.pop === 0) o.scale.setScalar(1); } });
  }
  // stick
  if (batPivot && batPivot.visible) {
    const u = batPivot.userData; u.t = Math.min(1, u.t + dt * 5.5);
    const sw = u.t < 0.35 ? u.t / 0.35 : 1 - (u.t - 0.35) / 0.65;
    batPivot.rotation.set(0.25, 0, -0.5 + sw * 1.75 + Math.sin(clock * 2.2) * 0.04);
    swoosh.visible = u.t < 0.5; swoosh.material.opacity = Math.max(0, 0.55 * (1 - u.t / 0.5));
  } else if (swoosh) swoosh.visible = false;
  for (const g of guests) {
    if (!g.s.material.map.userData.real && getImage(g.id)) g.s.material.map = guestTex(g.id, g.emoji);
    g.jump = Math.max(0, g.jump - idle * 1.1);
    const im = g.s.material.map.image, asp = im && im.width ? im.width / im.height : 1, bob = 1 + Math.sin(clock * 3 + g.ph) * 0.025;
    const k = P ? P.hang : 0, rush = Math.sin(Math.min(1, g.rush) * Math.PI) * 0.28; g.rush = Math.max(0, g.rush - idle * 0.9); // a short step toward the candy, never over it
    g.s.position.x = (g.craft[0] + (g.smash[0] - g.craft[0]) * k) * (1 - rush); g.s.position.z = g.craft[1] + (g.smash[1] - g.craft[1]) * k;
    g.s.position.y = g.craft[2] * (1 - k) + Math.abs(Math.sin(g.jump * 9)) * g.jump * 1.4;
    g.sh.position.set(g.s.position.x, 0.02, g.s.position.z); g.sh.visible = k > 0.6;
    g.s.scale.set(g.size * asp / bob, g.size * bob, 1);
  }
  for (const b of balloons) { b.m.position.y = b.y + Math.sin(clock * 0.9 + b.ph) * 0.12; b.m.rotation.z = Math.sin(clock * 0.7 + b.ph) * 0.06; }
  updateCandy(dt); updateCapsule(dt); updateConfetti(dt);
  // camera
  const e = Math.min(1, idle * 2.6);
  for (let i = 0; i < 3; i++) { cam.pos[i] += (view.pos[i] - cam.pos[i]) * e; cam.look[i] += (view.look[i] - cam.look[i]) * e; }
  shake = Math.max(0, shake - idle * 1.6); punch = Math.max(0, punch - idle * 7);
  if (shock.visible) { shock.scale.multiplyScalar(1 + dt * 9); shock.material.opacity -= dt * 2.2; if (shock.material.opacity <= 0) shock.visible = false; }
  if (camera.fov !== 38 - punch * 1.5) { camera.fov = 38 - punch * 1.5; camera.updateProjectionMatrix(); }
  camera.position.set(cam.pos[0] + (Math.random() - 0.5) * shake, cam.pos[1] + (Math.random() - 0.5) * shake, cam.pos[2]);
  camera.lookAt(cam.look[0], cam.look[1], cam.look[2]);
}
export function render() { renderer.render(scene, camera); }
/** Counts for the long-session check: GPU objects alive, draw calls of the last frame, objects in the yard. */
export const stats = () => ({ geometries: renderer.info.memory.geometries, textures: renderer.info.memory.textures, calls: renderer.info.render.calls, children: scene.children.length });
/** Halve confetti and candy when the device is slow. */
export function setQuality(q) { quality = q; if (renderer) renderer.setPixelRatio(q < 1 ? 0.75 : 1); }
/** Slow confetti falling from the sky, so the first screen moves before any touch. */
export function ambient() { chips(V((Math.random() - 0.5) * 5, 6.5, (Math.random() - 0.5) * 2), 1, [0xff5aa8, 0xffc928, 0x35b6ff, 0x35d07f, 0x9b5cff], 0.4); }

/**
 * Create the yard on `canvas`.
 * @param {object} three the Three.js module
 * @param {HTMLCanvasElement} canvas
 * @param {{quality:number, image:(id:string)=>HTMLImageElement|null}} o
 */
export function initScene(three, canvas, o) {
  T3 = three; quality = o.quality; getImage = o.image; swoosh = null; balloons = []; batPivot = null;
  renderer = new T3.WebGLRenderer({ canvas, antialias: quality >= 1, powerPreference: 'high-performance' });
  renderer.setPixelRatio(1); renderer.setSize(W, H, false);
  scene = new T3.Scene(); camera = new T3.PerspectiveCamera(38, W / H, 0.1, 80); ray = new T3.Raycaster();
  tmp.m4 = new T3.Matrix4(); tmp.q = new T3.Quaternion(); tmp.s = V();
  fringeTex = canvasTex(64, 64, (g) => {
    g.fillStyle = '#fff'; g.fillRect(0, 0, 64, 64);
    for (let row = 0; row < 2; row++) {
      const y = row * 32; g.fillStyle = 'rgba(0,0,0,0.16)'; g.fillRect(0, y + 28, 64, 4); g.fillStyle = 'rgba(255,255,255,0.6)'; g.fillRect(0, y, 64, 3);
      g.fillStyle = 'rgba(0,0,0,0.07)'; for (let x = row * 4; x < 64; x += 8) g.fillRect(x, y + 12, 2, 16);
    }
  });
  fringeTex.wrapS = fringeTex.wrapT = T3.RepeatWrapping;
  skirtTex = canvasTex(64, 64, (g) => {
    g.fillStyle = '#fff'; g.fillRect(0, 0, 64, 64);
    g.fillStyle = 'rgba(0,0,0,0.12)'; g.fillRect(0, 0, 64, 10);                       // shade under the band above
    g.globalCompositeOperation = 'destination-out';
    for (let x = 0; x < 64; x += 8) { g.beginPath(); g.moveTo(x + 4, 46); g.lineTo(x + 8.4, 64); g.lineTo(x - 0.4, 64); g.closePath(); g.fill(); g.fillRect(x + 3.4, 22, 1.2, 26); } // small teeth and slits
    g.globalCompositeOperation = 'source-over';
  });
  skirtTex.wrapS = T3.RepeatWrapping;
  buildYard(); setTheme(theme); buildCandy(); buildCapsule(); buildConfetti(); setBat(0);
  candies = []; confP = []; guests = []; P = null;
  // compile every material now, so the first candy drop and the burst do not stall on a weak phone
  const white = new T3.Color(0xffffff); for (const im of candyMesh.concat(conf)) { im.setColorAt(0, white); im.count = 1; }
  capsule.g.visible = true; shock.visible = true; sea.visible = true;
  camera.position.set(0, 3, 11); camera.lookAt(0, 2.7, 0); renderer.compile(scene, camera);
  for (const im of candyMesh.concat(conf)) im.count = 0; capsule.g.visible = false; shock.visible = false; sea.visible = THEMES[theme].sea;
}
