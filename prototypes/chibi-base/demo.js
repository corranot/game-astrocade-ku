// PROTOTYPE - NOT FOR PRODUCTION
// Viewer for the chibi base: renders turnarounds, look variants, animation frames and the Pip comparison into one
// canvas with a viewport per cell. ?shot=turn|pip|compare|looks|anim|phone  (&t=seconds for animation time)
import { buildChibi, animateChibi, attach, DEFAULT_LOOK } from './chibi.js';
import { buildHero, animateHero, critterMaterials } from '../photo-safari/critters.js';

const q = new URLSearchParams(location.search), shot = q.get('shot') || 'turn', T0 = +(q.get('t') || 1.3);
const W = innerWidth, H = innerHeight;
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(devicePixelRatio); renderer.setSize(W, H); renderer.setScissorTest(true);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.NeutralToneMapping; renderer.toneMappingExposure = 1.05;
document.body.appendChild(renderer.domElement);

/** A small snowy stage in Snowy Snapshot's palette: sky gradient, snow disc, cool fill and a warm key with soft shadow. */
function stage() {
  const s = new THREE.Scene();
  const cv = document.createElement('canvas'); cv.width = 2; cv.height = 256; const g = cv.getContext('2d'), gr = g.createLinearGradient(0, 0, 0, 256);
  gr.addColorStop(0, '#9cc8f0'); gr.addColorStop(0.62, '#dcebf8'); gr.addColorStop(1, '#f4f7fb'); g.fillStyle = gr; g.fillRect(0, 0, 2, 256);
  const bg = new THREE.CanvasTexture(cv); bg.colorSpace = THREE.SRGBColorSpace; s.background = bg;
  s.add(new THREE.HemisphereLight(0xcfe6ff, 0x9cb4d8, 1.15));
  const sun = new THREE.DirectionalLight(0xfff4e2, 2.4); sun.position.set(2.5, 5, 4); sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024); Object.assign(sun.shadow.camera, { left: -3, right: 3, top: 3, bottom: -3 }); sun.shadow.radius = 4; sun.shadow.bias = -0.0005; s.add(sun);
  const back = new THREE.DirectionalLight(0xa8c8ff, 0.9); back.position.set(-3, 3, -4); s.add(back);
  const snow = new THREE.Mesh(new THREE.CircleGeometry(6, 64), new THREE.MeshStandardMaterial({ color: 0xf2f6fc, roughness: 0.95 }));
  snow.rotation.x = -Math.PI / 2; snow.receiveShadow = true; s.add(snow);
  return s;
}

/** Rounded box: a segmented box with its corners pulled onto spheres of radius r. */
function rbox(w, h, d, r) {
  const g = new THREE.BoxGeometry(w, h, d, 6, 6, 6), P = g.attributes.position, v = new THREE.Vector3(), c = new THREE.Vector3();
  for (let i = 0; i < P.count; i++) { v.fromBufferAttribute(P, i); c.set(Math.max(-w / 2 + r, Math.min(w / 2 - r, v.x)), Math.max(-h / 2 + r, Math.min(h / 2 - r, v.y)), Math.max(-d / 2 + r, Math.min(d / 2 - r, v.z))); v.sub(c).normalize().multiplyScalar(r).add(c); P.setXYZ(i, v.x, v.y, v.z); }
  g.computeVertexNormals(); return g;
}

/** Pip on the chibi base: red quilted parka, cream beanie and mitts, navy trousers, boots, the instant camera. */
const PIP = { skin: '#ffd9bf', hair: { style: 'bob', color: '#6b3a26' }, eyes: { color: '#4a2e1e', size: 1.05 }, mouth: 'smile', top: { color: '#e8513a', sleeve: 1 }, bottom: { color: '#3a4a6a', length: 0.8 }, shoes: '#6a3e2a', mitts: '#fff4e6', hat: { style: 'beanie', color: '#fff4e6', cuff: '#f3e6d4', pom: '#ffffff' }, coat: { color: '#e8513a', trim: '#fff8ef' } };
function pipCamera(c) {
  const g = new THREE.Group(), m = (col, r = 0.4) => new THREE.MeshStandardMaterial({ color: col, roughness: r });
  const body = new THREE.Mesh(rbox(0.3, 0.2, 0.13, 0.04), m(0x7fe0c8, 0.35)); body.castShadow = true; g.add(body);
  const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.07, 0.06, 24).rotateX(Math.PI / 2), m(0x2b2f38, 0.3)); lens.position.set(0, -0.01, 0.08); g.add(lens);
  const glass = new THREE.Mesh(new THREE.CircleGeometry(0.048, 24), new THREE.MeshStandardMaterial({ color: 0x6ab8ff, roughness: 0.05, emissive: 0x1a3a66 })); glass.position.set(0, -0.01, 0.111); g.add(glass);
  const btn = new THREE.Mesh(rbox(0.06, 0.03, 0.05, 0.01), m(0xe8513a)); btn.position.set(-0.09, 0.11, 0); g.add(btn);
  const flash = new THREE.Mesh(rbox(0.06, 0.035, 0.01, 0.005), m(0xfff8ef, 0.2)); flash.position.set(0.09, 0.06, 0.066); g.add(flash);
  for (const sx of [-1, 1]) { const st = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.16, 6), m(0x3a2c22, 0.8)); st.position.set(sx * 0.12, 0.15, -0.04); st.rotation.set(-0.5, 0, sx * 0.35); g.add(st); } // strap up to the collar
  g.position.set(0, -0.02, 0.24); attach(c, 'chest', g); return g;
}

const LOOKS = [
  {},
  { skin: '#f1c3a0', hair: { style: 'short', color: '#2a2230' }, eyes: { color: '#2d6a9a' }, mouth: 'open', top: { color: '#ffd166', sleeve: 0.35 }, bottom: { color: '#5a8f5a', length: 0.3 }, shoes: '#e8513a' },
  { skin: '#8d5a3c', blush: '#d06a5a', hair: { style: 'pigtails', color: '#1e1410' }, eyes: { color: '#6a3a1a', size: 1.12 }, mouth: 'cat', top: { color: '#c58cff', sleeve: 0.9 }, bottom: { color: '#ffffff', length: 0.25 }, shoes: '#7a4a32', mitts: null },
  { skin: '#ffe2cc', hair: { style: 'bob', color: '#f2c86a' }, eyes: { color: '#3a8a5a', size: 0.95 }, top: { color: '#6ad0b0', sleeve: 1 }, bottom: { color: '#2f3a58', length: 0.85 }, shoes: '#2a2a35', mitts: '#ff8fb0', hat: { style: 'beanie', color: '#ff8fb0', pom: '#ffffff' } },
  { skin: '#ffd9bf', hair: { style: 'none' }, top: null, bottom: null, shoes: '#ffd9bf', mitts: null },
  { build: 'tall' },
];

const cells = []; // { scene, cam, x, y, w, h, tick }
function cell(x, y, w, h, chars, view, label) {
  if (label) document.body.insertAdjacentHTML('beforeend', `<span style="position:fixed;top:${y + h - 34}px;left:${x}px;width:${w}px;text-align:center">${label}</span>`);
  const sc = stage(); chars.forEach(([obj, px]) => { obj.position.x = px; sc.add(obj); });
  const cam = new THREE.PerspectiveCamera(view.fov || 26, w / h, 0.1, 50);
  cam.position.set(view.pos[0], view.pos[1], view.pos[2]); cam.lookAt(view.look[0], view.look[1], view.look[2]);
  cells.push({ sc, cam, x, y, w, h });
}
const orbit = (a, d = 5.2, y = 1.05, ty = 0.98) => ({ pos: [Math.sin(a) * d, y, Math.cos(a) * d], look: [0, ty, 0] });
const anims = [];
const chibi = (look, st = {}, extra) => { const c = buildChibi(look); if (extra) extra(c); anims.push([c, st]); return c; };

if (shot === 'turn' || shot === 'pip') {
  const look = shot === 'pip' ? PIP : {}, w = W / 4;
  [0, Math.PI / 4, Math.PI / 2, Math.PI].forEach((a, i) => {
    const c = chibi(look, {}, shot === 'pip' ? pipCamera : null);
    cell(i * w, 0, w, H, [[c.group, 0]], orbit(a), ['front', '3/4', 'side', 'back'][i]);
  });
} else if (shot === 'compare') {
  const mats = critterMaterials(), w = W / 4;
  [0, Math.PI / 4].forEach((a, i) => {
    const old = buildHero({ parka: '#e8513a', hat: '#fff4e6', cam: '#7fe0c8' }, mats); animateHero(old, T0, 0.016, 0, 0, 0);
    cell(i * w, 0, w, H, [[old.group, 0]], orbit(a), i ? 'Pip now 3/4' : 'Pip now');
    const c = chibi(PIP, {}, pipCamera);
    cell((i + 2) * w, 0, w, H, [[c.group, 0]], orbit(a), i ? 'chibi Pip 3/4' : 'chibi Pip');
  });
} else if (shot === 'looks') {
  const w = W / LOOKS.length;
  LOOKS.forEach((l, i) => { const c = chibi(l, {}); cell(i * w, 0, w, H, [[c.group, 0]], orbit(0.35), ['default', 'short', 'pigtails', 'beanie', 'bare base', 'tall build'][i]); });
} else if (shot === 'anim') {
  const w = W / 4, sts = [{ t: 0 }, { walk: 1, t: 0.17 }, { walk: 1, t: 0.52 }, { wave: 1, t: 1.1 }];
  sts.forEach((s, i) => { const c = chibi(PIP, s, pipCamera); c.blinkOff = 1; cell(i * w, 0, w, H, [[c.group, 0]], orbit(0.5), ['idle', 'walk A', 'walk B', 'wave'][i]); });
} else if (shot === 'hands') {
  // close-ups of the left mitten (the character's left, +x): front, 3/4 from the body side, walk and wave
  const w = W / 4, sts = [[{ t: 0 }, [0.32, 0.55, 1.3], [0.2, 0.5, 0]], [{ t: 0 }, [0.95, 0.55, 0.9], [0.2, 0.5, 0]], [{ walk: 1, t: 0.52 }, [0.5, 0.6, 1.3], [0.2, 0.55, 0]], [{ wave: 1, t: 1.1 }, [-0.4, 1.2, 1.3], [-0.3, 1.05, 0]]];
  sts.forEach(([s, pos, look], i) => { const c = chibi({ mitts: '#fff4e6', top: { color: '#e8513a', sleeve: 1 } }, s); cell(i * w, 0, w, H, [[c.group, 0]], { pos, look, fov: 30 }, ['front', 'body side', 'walk', 'wave'][i]); });
} else if (shot === 'phone') {
  const c = chibi(PIP, { wave: 1, t: 1.1 }, pipCamera); c.group.rotation.y = -0.3;
  cell(0, 0, W, H, [[c.group, 0]], { pos: [1.6, 2.6, 5.4], look: [0, 0.95, 0], fov: 30 });
}

let last = performance.now(), live = q.has('live');
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  for (const [c, s] of anims) animateChibi(c, live ? now / 1000 : (s.t ?? T0), dt, s);
  for (const k of cells) { const y = H - k.y - k.h; renderer.setViewport(k.x, y, k.w, k.h); renderer.setScissor(k.x, y, k.w, k.h); renderer.render(k.sc, k.cam); }
  if (live) requestAnimationFrame(frame);
}
// settle the springs, then draw once (or loop with ?live)
for (let i = 0; i < 30; i++) for (const [c, s] of anims) animateChibi(c, s.t ?? T0, 0.016, s);
frame(performance.now());
window.__stats = anims[0] ? anims[0][0].stats : null;
window.__ready = true;
