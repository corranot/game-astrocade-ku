// PROTOTYPE - NOT FOR PRODUCTION
/**
 * Everything the salon draws by code: the room, the four customers, tool and HUD icons, hair accessories,
 * dye pots, the helper hand and stars. No image files, no emoji. Shapes are built from paths, each with a
 * soft navy outline so they read as glossy toy stickers on the pastel room.
 */
export const W = 720, H = 1280;
export const NAVY = '#1F2A6B', WHITE = '#FFFFFF', CORAL = '#FF5C7A', SUNNY = '#FFD23F', MINT = '#3DDC97', SKY = '#3EC5FF', VIOLET = '#9B6BFF', ORANGE = '#FF9F1C', PEACH = '#FFD9C2';
export const SHADOW = 'rgba(31,42,107,0.22)';

/** A rounded rectangle path. */
export function rr(g, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}
/** A filled rounded rectangle. */
export function box(g, x, y, w, h, r, fill) { rr(g, x, y, w, h, r); g.fillStyle = fill; g.fill(); }
/** A filled ellipse with an optional outline. */
export function oval(g, x, y, rx, ry, fill, line = 0, rot = 0) {
  g.beginPath(); g.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot, 0, Math.PI * 2);
  if (fill) { g.fillStyle = fill; g.fill(); }
  if (line) { g.lineWidth = line; g.strokeStyle = NAVY; g.stroke(); }
}
/** Fill the current path, then outline it in navy. */
function ink(g, fill, line = 5) { g.fillStyle = fill; g.fill(); g.lineWidth = line; g.strokeStyle = NAVY; g.lineJoin = 'round'; g.stroke(); }

/** A five-point star. */
export function star(g, x, y, r, fill, line = 4, rot = -Math.PI / 2) {
  g.beginPath();
  for (let i = 0; i < 10; i++) { const a = rot + i * Math.PI / 5, k = i % 2 ? r * 0.46 : r; g.lineTo(x + Math.cos(a) * k, y + Math.sin(a) * k); }
  g.closePath(); ink(g, fill, line);
}
/** A heart, point down, centred on (x, y). */
export function heart(g, x, y, s, fill, line = 4) {
  g.beginPath(); g.moveTo(x, y + s * 0.45);
  g.bezierCurveTo(x - s * 0.9, y - s * 0.1, x - s * 0.45, y - s * 0.75, x, y - s * 0.3);
  g.bezierCurveTo(x + s * 0.45, y - s * 0.75, x + s * 0.9, y - s * 0.1, x, y + s * 0.45);
  ink(g, fill, line);
}

// ---------- the room ----------
/** The salon behind the customer: striped wall, a big round mirror, shelves of bottles, a checked floor. Drawn once into a layer. */
export function drawSalon(g) {
  g.fillStyle = '#C9F5E6'; g.fillRect(0, 0, W, H);
  for (let x = -40; x < W; x += 96) { g.fillStyle = '#B5EDDB'; g.fillRect(x, 0, 44, 1010); }
  // shelf with bottles, left and right, behind the head
  for (const sx of [24, 548]) {
    box(g, sx, 520, 148, 18, 8, '#F7B38A');
    const cols = sx < 100 ? [CORAL, VIOLET, SKY] : [SUNNY, MINT, '#FF8FC7'];
    cols.forEach((c, i) => { const bx = sx + 14 + i * 46; rr(g, bx, 446 - (i % 2) * 18, 34, 74 + (i % 2) * 18, 10); ink(g, c, 4); box(g, bx + 10, 434 - (i % 2) * 18, 14, 16, 4, NAVY); oval(g, bx + 11, 470, 5, 14, 'rgba(255,255,255,0.55)'); });
  }
  // lamp bulbs along the top, like a dressing-room mirror
  for (let i = 0; i < 7; i++) { const x = 90 + i * 90; oval(g, x, 322 - Math.sin(i / 6 * Math.PI) * 46, 15, 15, '#FFF3B0', 4); }
  // floor
  g.fillStyle = '#FFE1EC'; g.fillRect(0, 1010, W, H - 1010);
  for (let y = 1010; y < H; y += 60) for (let x = ((y - 1010) / 60) % 2 ? 0 : 60; x < W; x += 120) { g.fillStyle = '#FFC9DC'; g.fillRect(x, y, 60, 60); }
  g.fillStyle = '#F7A8C4'; g.fillRect(0, 1004, W, 10);
}

/** The salon chair: a tall back behind the customer and arm rests in front. Front part only when front is true. */
export function drawChair(g, cx, top, front) {
  if (!front) {
    rr(g, cx - 200, top, 400, 460, 70); ink(g, '#FFFFFF', 6); // white leather: no dye colour can hide on it
    rr(g, cx - 168, top + 30, 336, 400, 54); g.fillStyle = '#EDF1F8'; g.fill();
    for (let i = 0; i < 3; i++) oval(g, cx - 90 + i * 90, top + 60, 10, 10, '#D5DDEB');
    return;
  }
  rr(g, cx - 250, top + 330, 92, 150, 36); ink(g, '#F4F6FB', 6);
  rr(g, cx + 158, top + 330, 92, 150, 36); ink(g, '#F4F6FB', 6);
}

// ---------- customers ----------
export const CUSTOMERS = {
  maya: { fur: '#B9774F', belly: '#C98A62', cape: '#FFFFFF', dots: CORAL },
  leo: { fur: '#F3C6A2', belly: '#F7D3B6', cape: '#FFFFFF', dots: SKY },
  hana: { fur: '#F8D9C2', belly: '#FBE3D2', cape: '#FFFFFF', dots: VIOLET },
  kofi: { fur: '#7B4A2E', belly: '#8C5838', cape: '#FFFFFF', dots: MINT },
};
export const CUSTOMER_TYPES = Object.keys(CUSTOMERS);

/** The cape and shoulders under the head. */
export function drawBody(g, c) {
  const k = CUSTOMERS[c.type], cx = c.x, y = c.y + c.R * 0.82;
  g.beginPath(); g.moveTo(cx - 70, y); g.quadraticCurveTo(cx - 250, y + 80, cx - 270, y + 330); g.lineTo(cx + 270, y + 330); g.quadraticCurveTo(cx + 250, y + 80, cx + 70, y); g.closePath();
  ink(g, k.cape, 6);
  for (let i = -2; i <= 2; i++) oval(g, cx + i * 80, y + 200 + Math.abs(i) * 12, 14, 14, k.dots); // pale cape, small dots: every dye colour shows on it
  box(g, cx - 64, y - 30, 128, 54, 24, k.fur); rr(g, cx - 64, y - 30, 128, 54, 24); g.lineWidth = 5; g.strokeStyle = NAVY; g.stroke();
  rr(g, cx - 92, y + 10, 184, 40, 20); ink(g, WHITE, 5); // the cape collar
}

/** Kept for callers: the children's ears are part of the head (drawHead), under the hair. */
export function drawEars() {}

/**
 * The head and face. c.mood picks the face: grumpy, happy, giggle, eek, wow, sleepy. c.look is the point the
 * eyes follow; c.blink (0..1) closes them.
 */
export function drawHead(g, c) {
  const k = CUSTOMERS[c.type], { x, y, R } = c;
  for (const sd of [-1, 1]) oval(g, x + sd * R * 0.98, y + R * 0.1, R * 0.2, R * 0.26, k.fur, 5); // ears
  oval(g, x, y, R, R * 0.96, k.fur, 6);
  oval(g, x, y + R * 0.34, R * 0.62, R * 0.42, k.belly); // muzzle / cheeks area
  const mood = c.mood, lx = c.look ? Math.max(-1, Math.min(1, (c.look[0] - x) / 260)) : 0, ly = c.look ? Math.max(-1, Math.min(1, (c.look[1] - y) / 260)) : 0;
  const eyes = [[-0.36, -0.02, 1], [0.36, -0.02, 1]];
  for (const [ex, ey, big] of eyes) {
    const cx = x + ex * R, cy = y + ey * R, r = 30 * big;
    if (mood === 'giggle' || c.blink > 0.5) { g.beginPath(); g.arc(cx, cy + 6, r * 0.7, Math.PI * 1.1, Math.PI * 1.9); g.lineWidth = 7; g.strokeStyle = NAVY; g.lineCap = 'round'; g.stroke(); continue; }
    const open = mood === 'eek' || mood === 'wow' ? 1.15 : mood === 'grumpy' ? 0.8 : 1;
    oval(g, cx, cy, r, r * open, WHITE, 5);
    oval(g, cx + lx * r * 0.35, cy + ly * r * 0.3, r * 0.55, r * 0.6 * open, NAVY);
    oval(g, cx + lx * r * 0.35 - r * 0.18, cy + ly * r * 0.3 - r * 0.22, r * 0.18, r * 0.18, WHITE);
    if (mood === 'wow') star(g, cx + lx * r * 0.35, cy + ly * r * 0.3, r * 0.32, SUNNY, 0);
    if (mood === 'grumpy') { g.beginPath(); g.moveTo(cx - r, cy - r * 1.05 + (ex < 0 ? -6 : 10)); g.lineTo(cx + r, cy - r * 1.05 + (ex < 0 ? 10 : -6)); g.lineWidth = 8; g.strokeStyle = NAVY; g.lineCap = 'round'; g.stroke(); }
  }
  oval(g, x - R * 0.62, y + R * 0.28, 22, 13, 'rgba(255,110,150,0.45)'); oval(g, x + R * 0.62, y + R * 0.28, 22, 13, 'rgba(255,110,150,0.45)');
  // nose
  oval(g, x, y + R * 0.2, 14, 10, 'rgba(120,60,40,0.35)'); // nose
  // mouth
  const my = y + R * 0.44;
  g.lineWidth = 7; g.strokeStyle = NAVY; g.lineCap = 'round';
  if (mood === 'grumpy') { g.beginPath(); g.arc(x, my + 26, 26, Math.PI * 1.2, Math.PI * 1.8); g.stroke(); }
  else if (mood === 'eek') oval(g, x, my + 6, 18, 24, '#B3264A', 6);
  else if (mood === 'wow' || mood === 'giggle') {
    g.beginPath(); g.moveTo(x - 44, my - 6); g.quadraticCurveTo(x, my + 70, x + 44, my - 6); g.closePath(); ink(g, '#B3264A', 6);
    g.save(); g.clip(); oval(g, x, my + 40, 22, 14, '#FF7FA3'); g.restore();
  } else if (mood === 'sleepy') { g.beginPath(); g.moveTo(x - 18, my + 4); g.lineTo(x + 18, my + 4); g.stroke(); }
  else { g.beginPath(); g.arc(x, my - 8, 30, Math.PI * 0.18, Math.PI * 0.82); g.stroke(); }
}

// ---------- accessories ----------
/** Accessory ids, in tray order. The last three start locked. */
export const ACCESSORIES = ['bow', 'flower', 'starclip', 'crown', 'butterfly', 'heart', 'tiara', 'cherry'];

/** One hair accessory centred on (x, y) at size s. */
export function drawAcc(g, id, x, y, s, rot = 0) {
  g.save(); g.translate(x, y); g.rotate(rot); const u = s / 100;
  g.scale(u, u);
  if (id === 'bow') {
    for (const d of [-1, 1]) { g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(d * 60, -56, d * 52, 0); g.quadraticCurveTo(d * 60, 50, 0, 0); ink(g, CORAL, 6); }
    oval(g, 0, 0, 16, 18, '#FF8FA8', 6);
  } else if (id === 'flower') {
    for (let i = 0; i < 5; i++) { const a = i * Math.PI * 2 / 5 - Math.PI / 2; oval(g, Math.cos(a) * 30, Math.sin(a) * 30, 24, 24, '#FF8FC7', 6); }
    oval(g, 0, 0, 20, 20, SUNNY, 6);
  } else if (id === 'starclip') { rr(g, -44, -8, 88, 16, 8); ink(g, SKY, 5); star(g, 0, 0, 40, SUNNY, 6); }
  else if (id === 'crown') {
    g.beginPath(); g.moveTo(-48, 30); g.lineTo(-52, -30); g.lineTo(-24, 0); g.lineTo(0, -44); g.lineTo(24, 0); g.lineTo(52, -30); g.lineTo(48, 30); g.closePath(); ink(g, SUNNY, 6);
    oval(g, 0, 12, 9, 9, CORAL, 3); oval(g, -28, 16, 7, 7, SKY, 3); oval(g, 28, 16, 7, 7, MINT, 3);
  } else if (id === 'butterfly') {
    for (const d of [-1, 1]) { oval(g, d * 28, -14, 28, 24, VIOLET, 6, d * 0.4); oval(g, d * 22, 20, 18, 16, '#C7A8FF', 6, -d * 0.4); }
    oval(g, 0, 2, 8, 30, NAVY);
  } else if (id === 'heart') { heart(g, 0, 4, 64, '#FF4F8B', 6); oval(g, -14, -10, 9, 6, 'rgba(255,255,255,0.7)'); }
  else if (id === 'tiara') {
    g.beginPath(); g.moveTo(-56, 26); g.quadraticCurveTo(0, -10, 56, 26); g.lineWidth = 18; g.strokeStyle = NAVY; g.stroke(); g.lineWidth = 10; g.strokeStyle = '#FF8FC7'; g.stroke();
    for (const [dx, h] of [[-30, 24], [0, 40], [30, 24]]) { g.beginPath(); g.moveTo(dx - 12, 14 - (dx ? 0 : 6)); g.lineTo(dx, 14 - h); g.lineTo(dx + 12, 14 - (dx ? 0 : 6)); g.closePath(); ink(g, SUNNY, 5); }
    oval(g, 0, -10, 9, 9, SKY, 3); oval(g, -30, -2, 6, 6, CORAL, 3); oval(g, 30, -2, 6, 6, MINT, 3);
  } else if (id === 'cherry') {
    g.beginPath(); g.moveTo(-18, 10); g.quadraticCurveTo(-6, -40, 14, -50); g.moveTo(22, 14); g.quadraticCurveTo(18, -30, 14, -50); g.lineWidth = 6; g.strokeStyle = '#2E9E5B'; g.stroke();
    oval(g, -22, 20, 22, 22, '#E8304A', 6); oval(g, 24, 22, 22, 22, '#E8304A', 6); oval(g, -28, 12, 6, 5, 'rgba(255,255,255,0.7)');
  }
  g.restore();
}

// ---------- tools and HUD icons ----------
/** A tool or HUD icon centred on (x, y) at size s: foam, scissors, brush, dryer, bow, wall, sound, mute, globe, check, next, back, coin, lock, camera. */
export function icon(g, kind, x, y, s, extra) {
  g.save(); g.translate(x, y); const u = s / 100; g.scale(u, u); g.lineCap = 'round'; g.lineJoin = 'round';
  if (kind === 'foam') { rr(g, -26, -14, 52, 62, 14); ink(g, SKY, 6); box(g, -12, -34, 24, 22, 6, NAVY); rr(g, -8, -50, 30, 14, 6); ink(g, WHITE, 4); for (const [bx, by, r] of [[-30, -40, 14], [-44, -18, 10], [34, -36, 12]]) oval(g, bx, by, r, r, '#E6F7FF', 4); }
  else if (kind === 'scissors') {
    const o = extra || 0; // 0 open .. 1 closed
    for (const d of [-1, 1]) { g.save(); g.rotate(d * (0.32 - o * 0.3)); rr(g, -6, -56, 12, 64, 6); ink(g, '#DDE3F0', 5); oval(g, d * 6, 26, 18, 18, CORAL, 6); oval(g, d * 6, 26, 7, 7, '#FFE1EC'); g.restore(); }
    oval(g, 0, 0, 6, 6, NAVY);
  } else if (kind === 'brush') {
    rr(g, -10, -6, 20, 58, 8); ink(g, '#F7B38A', 5); rr(g, -14, -22, 28, 18, 4); ink(g, '#C9D1E0', 4);
    g.beginPath(); g.moveTo(-14, -22); g.quadraticCurveTo(0, -70, 14, -22); g.closePath(); ink(g, extra || CORAL, 5);
  } else if (kind === 'dryer') {
    rr(g, -48, -34, 74, 50, 24); ink(g, '#FF8FC7', 6); oval(g, 30, -9, 16, 26, '#FFE1EC', 6); rr(g, -34, 10, 22, 46, 8); ink(g, '#FF8FC7', 5);
    g.lineWidth = 5; g.strokeStyle = SKY; for (const d of [-14, 0, 14]) { g.beginPath(); g.moveTo(52, -9 + d); g.lineTo(70, -9 + d * 1.4); g.stroke(); }
  } else if (kind === 'bow') drawAcc(g, 'bow', 0, 0, 80);
  else if (kind === 'wall') { rr(g, -40, -36, 80, 72, 10); ink(g, '#F7B38A', 6); box(g, -28, -24, 56, 48, 4, '#BDEBFF'); oval(g, -6, -4, 10, 10, SUNNY); g.beginPath(); g.moveTo(-28, 24); g.lineTo(-6, 4); g.lineTo(10, 18); g.lineTo(28, 2); g.lineTo(28, 24); g.closePath(); g.fillStyle = MINT; g.fill(); }
  else if (kind === 'sound' || kind === 'mute') {
    g.beginPath(); g.moveTo(-36, -14); g.lineTo(-16, -14); g.lineTo(6, -34); g.lineTo(6, 34); g.lineTo(-16, 14); g.lineTo(-36, 14); g.closePath(); ink(g, SUNNY, 5);
    g.lineWidth = 6; g.strokeStyle = NAVY;
    if (kind === 'sound') for (const r of [18, 32]) { g.beginPath(); g.arc(8, 0, r, -0.8, 0.8); g.stroke(); }
    else { g.beginPath(); g.moveTo(18, -16); g.lineTo(42, 16); g.moveTo(42, -16); g.lineTo(18, 16); g.stroke(); }
  } else if (kind === 'globe') {
    oval(g, 0, 0, 38, 38, SKY, 6); g.lineWidth = 4; g.strokeStyle = NAVY;
    oval(g, 0, 0, 16, 38, null, 4); g.beginPath(); g.moveTo(-38, 0); g.lineTo(38, 0); g.moveTo(-32, -18); g.lineTo(32, -18); g.moveTo(-32, 18); g.lineTo(32, 18); g.stroke();
  } else if (kind === 'check') { g.beginPath(); g.moveTo(-30, 2); g.lineTo(-8, 26); g.lineTo(32, -24); g.lineWidth = 18; g.strokeStyle = NAVY; g.stroke(); g.lineWidth = 9; g.strokeStyle = WHITE; g.stroke(); }
  else if (kind === 'next') { g.beginPath(); g.moveTo(-22, -34); g.lineTo(30, 0); g.lineTo(-22, 34); g.closePath(); ink(g, WHITE, 6); }
  else if (kind === 'back') { g.beginPath(); g.moveTo(22, -34); g.lineTo(-30, 0); g.lineTo(22, 34); g.closePath(); ink(g, WHITE, 6); }
  else if (kind === 'coin') { oval(g, 0, 0, 40, 40, SUNNY, 6); oval(g, 0, 0, 26, 26, '#FFE680'); star(g, 0, 0, 18, ORANGE, 0); }
  else if (kind === 'lock') { g.beginPath(); g.arc(0, -10, 22, Math.PI, 0); g.lineWidth = 10; g.strokeStyle = NAVY; g.stroke(); rr(g, -32, -12, 64, 50, 10); ink(g, SUNNY, 6); oval(g, 0, 10, 7, 9, NAVY); }
  else if (kind === 'camera') { rr(g, -44, -26, 88, 60, 14); ink(g, '#8A9BD0', 6); rr(g, -18, -38, 36, 14, 5); ink(g, '#8A9BD0', 4); oval(g, 0, 4, 20, 20, '#BDEBFF', 6); }
  g.restore();
}

/** A dye pot in colour c (a CSS colour, or a function of the pot's x for the rainbow pot). */
export function pot(g, c, x, y, s, rainbow) {
  g.save(); g.translate(x, y); const u = s / 100; g.scale(u, u);
  rr(g, -36, -18, 72, 58, 16); ink(g, WHITE, 6);
  g.beginPath(); g.ellipse(0, -18, 36, 14, 0, 0, Math.PI * 2);
  if (rainbow) { const gr = g.createLinearGradient(-36, 0, 36, 0); ['#FF3B3B', '#FF9F1C', '#FFD23F', '#22C55E', '#3B82F6', '#8B5CF6'].forEach((k, i) => gr.addColorStop(i / 5, k)); g.fillStyle = gr; } else g.fillStyle = c;
  g.fill(); g.lineWidth = 5; g.strokeStyle = NAVY; g.stroke();
  g.beginPath(); g.moveTo(-14, -18); g.quadraticCurveTo(-22, 8, -14, 26); g.lineWidth = 12; g.strokeStyle = rainbow ? '#FF9F1C' : c; g.stroke();
  g.restore();
}

/** The helper hand, fingertip at (x, y); pressed makes it smaller, as if touching. */
export function hand(g, x, y, pressed) {
  g.save(); g.translate(x, y); const k = pressed ? 0.9 : 1; g.scale(k, k); g.rotate(-0.35);
  g.beginPath(); g.moveTo(-12, 0); g.quadraticCurveTo(-14, -10, 0, -12); g.quadraticCurveTo(14, -10, 12, 0); g.lineTo(14, 56); g.quadraticCurveTo(40, 54, 44, 74); g.quadraticCurveTo(46, 120, 18, 132); g.lineTo(-22, 132); g.quadraticCurveTo(-44, 110, -40, 78); g.quadraticCurveTo(-34, 60, -12, 62); g.closePath();
  g.fillStyle = 'rgba(31,42,107,0.25)'; g.translate(5, 6); g.fill(); g.translate(-5, -6);
  ink(g, WHITE, 6);
  g.restore();
}
