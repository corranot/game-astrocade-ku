// PROTOTYPE - NOT FOR PRODUCTION
// The toy army and the Wind-Up Robot boss. Chaos raises heat; heat gives wanted stars (1-4); each star lets more
// toys roll in: wind-up cars that bump Bonbon's feet, foam-dart tanks, bubble helicopters. Their hits only lower
// Bonbon's Spirit (never a game over). Bonbon squashes or swats them for points. At full size (or when the city
// is nearly flat) the Wind-Up Robot drops in: three phases (walk and stomp, foam volleys, jump slam with a
// landing ring on the ground), then it unwinds into a shower of gears. Kid-safe: toys, foam, bubbles; nobody hurt.
/* global THREE */ // Three.js r187, loaded by index.html (import map) and set on window before run()
import { toon } from './toon.js';

const UNITS = 12, SHOTS = 24;

/**
 * Creates the army for one round. ctx functions come from game.js: puff, confetti (city effects).
 * Returns { update(dt, bon), heat(points), stars, units, boss, hitArea, hitBoss, events, dispose }.
 */
export function createArmy(scene, cfg, rng, quality, city, opts = {}) {
  const A = cfg.army, B = cfg.boss;
  const group = new THREE.Group(); scene.add(group);
  const disposables = [];
  const keep = (x) => { disposables.push(x); return x; };
  const mtx = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), s3 = new THREE.Vector3(), e = new THREE.Euler(), yAxis = new THREE.Vector3(0, 1, 0);
  const std = (c, r = 0.35) => keep(toon({ color: c, roughness: r }));
  const inst = (geo, mat, n, shadow = true) => {
    const m = new THREE.InstancedMesh(keep(geo), mat, n); m.frustumCulled = false; m.castShadow = shadow; m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    for (let i = 0; i < n; i++) m.setMatrixAt(i, mtx.makeScale(0, 0, 0));
    group.add(m); return m;
  };
  // parts, one InstancedMesh each (a handful of draw calls for the whole army)
  const carBody = inst(new THREE.BoxGeometry(1.8, 0.8, 1.1), std(0xff5a4f, 0.25), UNITS);
  const carKey = inst(new THREE.TorusGeometry(0.32, 0.1, 8, 16), std(0xffc531, 0.2), UNITS);
  const tankBody = inst(new THREE.BoxGeometry(2.2, 0.8, 1.6), std(0x6fd64b), UNITS);
  const tankTurret = inst(new THREE.CylinderGeometry(0.55, 0.65, 0.5, 14), std(0x4cc35a), UNITS);
  const barrelGeo = new THREE.CylinderGeometry(0.16, 0.16, 1.4, 10); barrelGeo.rotateZ(Math.PI / 2); barrelGeo.translate(0.8, 0, 0);
  const tankBarrel = inst(barrelGeo, std(0xffc531), UNITS);
  const heliBody = inst(new THREE.SphereGeometry(0.85, 16, 12), std(0x3fa9ff, 0.2), UNITS);
  const heliRotor = inst(new THREE.BoxGeometry(3.2, 0.06, 0.3), std(0x24123f), UNITS, false);
  const tailGeo = new THREE.CylinderGeometry(0.12, 0.2, 1.6, 8); tailGeo.rotateZ(Math.PI / 2); tailGeo.translate(-1.2, 0.1, 0);
  const heliTail = inst(tailGeo, std(0x3fa9ff, 0.2), UNITS);
  const dartGeo = new THREE.CapsuleGeometry(0.18, 0.5, 4, 8); dartGeo.rotateZ(Math.PI / 2);
  const darts = inst(dartGeo, std(0xff9b54, 0.4), SHOTS, false);
  const bubbles = inst(new THREE.SphereGeometry(0.5, 14, 10), keep(toon({ color: 0xbfeaff, roughness: 0.05, transparent: true, opacity: 0.55 })), SHOTS, false);
  const ring = new THREE.Mesh(keep(new THREE.RingGeometry(0.85, 1, 48)), keep(new THREE.MeshBasicMaterial({ color: 0xff5a4f, transparent: true, opacity: 0.75, depthWrite: false })));
  ring.rotation.x = -Math.PI / 2; ring.position.y = 0.25; ring.visible = false; group.add(ring);

  // boss: one group of meshes (it is a single big actor)
  const boss = { spawned: false, alive: false, hp: B.hp, phase: 0, x: 0, z: 0, y: 0, yaw: 0, t: 0, act: 'idle', actT: 0, jump: null, down: false, scale: 1 };
  const bossG = new THREE.Group(); bossG.visible = false; group.add(bossG);
  const inkMat = keep(new THREE.MeshBasicMaterial({ color: 0x24123f, side: THREE.BackSide }));
  const bpart = (geo, c, x, y, z, parent = bossG) => {
    const m = new THREE.Mesh(keep(geo), std(c, 0.25)); m.position.set(x, y, z); m.castShadow = true; parent.add(m);
    const hull = new THREE.Mesh(geo, inkMat); hull.scale.setScalar(1.012); m.add(hull); return m;
  };
  // each city has its own robot: colours and a topper from game_config.themes[].boss (the Wind-Up Robot by default)
  const hx = (v, d) => { const n = parseInt(String(v === undefined ? '' : v).replace('#', '').replace(/^0x/, ''), 16); return Number.isFinite(n) ? n : d; };
  const BC = opts.boss || {}, P = { body: hx(BC.body, 0xb8c2d6), head: hx(BC.head, 0xd5dbe8), limb: hx(BC.limb, 0x8e99b0), accent: hx(BC.accent, 0xffc531), eye: hx(BC.eye, 0xff5a4f), fist: hx(BC.fist, 0xff5a4f), dark: 0x24123f };
  const bTorso = bpart(new THREE.BoxGeometry(3.2, 3.2, 2.4), P.body, 0, 4.6, 0);
  bpart(new THREE.BoxGeometry(2.2, 1.7, 2.0), P.head, 0, 7.0, 0);
  const eyesG = new THREE.Group(); eyesG.position.set(0, 7.1, 1.02); bossG.add(eyesG);
  const eyeMat = keep(new THREE.MeshBasicMaterial({ color: P.eye }));
  for (const sx of [-0.5, 0.5]) { const m = new THREE.Mesh(keep(new THREE.BoxGeometry(0.42, 0.32, 0.05)), eyeMat); m.position.x = sx; eyesG.add(m); }
  bpart(new THREE.BoxGeometry(1.6, 0.25, 0.05), 0x24123f, 0, 6.55, 1.02);
  bpart(new THREE.CylinderGeometry(0.9, 0.9, 0.3, 24), P.accent, 0, 4.8, 1.3).rotation.x = Math.PI / 2; // chest dial
  const arms = [-1, 1].map((sx) => { const g = new THREE.Group(); g.position.set(2.1 * sx, 5.6, 0); bossG.add(g); bpart(new THREE.BoxGeometry(0.9, 2.6, 0.9), P.limb, 0, -1.2, 0, g); bpart(new THREE.BoxGeometry(1.2, 0.9, 1.2), P.fist, 0, -2.6, 0, g); return g; });
  const legs = [-1, 1].map((sx) => { const g = new THREE.Group(); g.position.set(0.9 * sx, 3.0, 0); bossG.add(g); bpart(new THREE.BoxGeometry(1.1, 2.6, 1.2), P.limb, 0, -1.3, 0, g); bpart(new THREE.BoxGeometry(1.4, 0.5, 1.9), 0x24123f, 0, -2.75, 0.25, g); return g; });
  const key = new THREE.Group(); key.position.set(0, 4.8, -1.4); bossG.add(key);
  bpart(new THREE.CylinderGeometry(0.2, 0.2, 1.2, 10), P.accent, 0, 0, -0.5, key).rotation.x = Math.PI / 2;
  bpart(new THREE.TorusGeometry(0.75, 0.25, 10, 20), P.accent, 0, 0, -1.3, key);
  // toppers: what makes each city's robot its own character
  const top = BC.top;
  if (top === 'duck') { // a rubber-duck beak and a curl of hair
    bpart(new THREE.BoxGeometry(1.5, 0.45, 0.9), 0xff8a3d, 0, 6.75, 1.35);
    bpart(new THREE.TorusGeometry(0.3, 0.1, 8, 14, Math.PI * 1.4), P.body, 0, 8.1, 0);
  } else if (top === 'snow') { // carrot nose, top hat, scarf
    bpart(new THREE.ConeGeometry(0.22, 1.0, 10), 0xff8a3d, 0, 6.95, 1.5).rotation.x = Math.PI / 2;
    bpart(new THREE.CylinderGeometry(1.3, 1.3, 0.15, 24), P.dark, 0, 7.92, 0); bpart(new THREE.CylinderGeometry(0.85, 0.85, 1.1, 24), P.dark, 0, 8.5, 0);
    bpart(new THREE.BoxGeometry(3.5, 0.55, 2.7), P.accent, 0, 6.2, 0); bpart(new THREE.BoxGeometry(0.6, 1.4, 0.3), P.accent, 0.9, 5.4, 1.35); // scarf and its loose end
  } else if (top === 'lolly') { // a lollipop antenna
    bpart(new THREE.CylinderGeometry(0.09, 0.09, 0.8, 8), 0xffffff, 1.0, 8.15, 0);
    bpart(new THREE.CylinderGeometry(0.65, 0.65, 0.25, 24), P.accent, 1.0, 8.85, 0).rotation.x = Math.PI / 2; // low and to the side, so it shows under the boss bar
  } else if (top === 'spikes') { // dino plates down the back
    for (let k = 0; k < 3; k++) bpart(new THREE.ConeGeometry(0.42, 0.9, 4), P.accent, 0, 7.9 - k * 1.25, -1.15 - (k ? 0.1 : -0.15)).rotation.x = -0.5; // above the wind-up key
  } else if (top === 'antenna') { // two antennas with glowing tips
    for (const sx of [-0.65, 0.65]) { bpart(new THREE.CylinderGeometry(0.07, 0.07, 1.1, 6), P.limb, sx, 8.35, 0); bpart(new THREE.SphereGeometry(0.25, 12, 8), P.eye, sx, 9.0, 0); }
  }

  // ---------- state
  const units = [], shots = [], events = [];
  let heatV = 0, stars = 0, calmT = 0, spawnT = 1;
  const C = cfg.city, pitch = C.lotSize + C.road, half = city.half;
  const roadLine = (p) => { const i = Math.round((p + half - C.road / 2) / pitch); return -half + THREE.MathUtils.clamp(i, 0, C.lots) * pitch + C.road / 2; };

  function spawnUnit(type, bon) {
    if (units.length >= Math.min(UNITS, quality.maxUnits || UNITS, A.maxUnits[stars] || 0)) return;
    // come in on a road from the side of the city away from the camera's view (ahead of or beside Bonbon)
    const side = Math.floor(rng() * 3), along = roadLine(bon.x + (rng() - 0.5) * 60);
    let x, z, axis;
    if (side === 0) { x = THREE.MathUtils.clamp(along, -half, half); z = -half + C.road / 2; axis = 'z'; }
    else { x = side === 1 ? -half + C.road / 2 : half - C.road / 2; z = roadLine(bon.z - 10 - rng() * 30); axis = 'x'; }
    if (type === 'heli') { x = bon.x + (rng() - 0.5) * 50; z = bon.z - 45; }
    units.push({ type, x, z, y: 0, yaw: 0, axis, line: axis === 'z' ? x : z, cool: 1 + rng() * 1.5, spin: 0, dead: 0 });
  }

  function fire(kind, fromX, fromY, fromZ, toX, toZ, dmg, flight = 1.1) {
    if (shots.length >= SHOTS) return;
    shots.push({ kind, x: fromX, y: fromY, z: fromZ, sx: fromX, sy: fromY, sz: fromZ, tx: toX, tz: toZ, t: 0, flight, dmg });
  }

  /** Adds heat from points scored; stars follow heat. */
  function heat(points) { heatV += points * A.heatPerPoint; calmT = 0; }

  function startBoss(bon) {
    boss.spawned = true; boss.alive = true; boss.hp = B.hp; boss.phase = 1; boss.down = false; boss.t = 0;
    // as big as Bonbon will be (not the size mid-growth), landing ahead and a little to the side so the camera
    // behind Bonbon sees it
    boss.scale = Math.max(1.2, (bon.size || bon.scale) * 0.48); // the robot model is ~8 tall; Bonbon ~2.8 x its size: about 1.4x Bonbon
    const side = rng() < 0.5 ? -1 : 1;
    boss.x = THREE.MathUtils.clamp(bon.x + side * 6 * Math.sqrt(boss.scale), -half + 10, half - 10); boss.z = THREE.MathUtils.clamp(bon.z - 14 * Math.sqrt(boss.scale) - 8, -half + 8, half - 8);
    boss.y = 60; boss.act = 'drop';
    bossG.visible = true; bossG.scale.setScalar(boss.scale);
    events.push({ type: 'bossIntro' });
  }

  function damageBoss(n, how) {
    if (!boss.alive || boss.down || boss.act === 'drop') return false;
    boss.hp = Math.max(0, boss.hp - n);
    events.push({ type: 'bossHit', how, x: boss.x, z: boss.z });
    const ph = boss.hp > B.hp * 0.66 ? 1 : boss.hp > B.hp * 0.33 ? 2 : 3;
    if (ph !== boss.phase) { boss.phase = ph; boss.act = 'idle'; boss.actT = 0.8; events.push({ type: 'bossPhase', phase: ph }); }
    if (boss.hp <= 0) { boss.down = true; boss.act = 'unwind'; boss.actT = 2.2; events.push({ type: 'bossDown', x: boss.x, z: boss.z }); }
    return true;
  }

  // ---------- per step
  function update(dt, bon) {
    // stars from heat; heat cools after a calm spell
    calmT += dt;
    if (calmT > A.decaySec && heatV > 0) { heatV = Math.max(0, heatV - A.stars[Math.max(0, stars - 1)] * dt * 0.5); }
    let st = 0; for (const h of A.stars) if (heatV >= h) st++;
    if (st !== stars) { if (st > stars) events.push({ type: 'stars', stars: st }); stars = st; }
    // spawn
    spawnT -= dt;
    if (spawnT <= 0 && stars > 0 && !(boss.alive && !boss.down)) {
      spawnT = A.spawnSec;
      const pick = stars >= 3 && rng() < 0.35 ? 'heli' : stars >= 2 && rng() < 0.5 ? 'tank' : 'car';
      spawnUnit(pick, bon);
    }
    // boss trigger: full size, or the city is nearly flat
    if (!boss.spawned && (bon.stage >= B.atStage || city.intactLeft() / city.buildings.length < B.orCityBelow)) startBoss(bon);

    const R = bon.r;
    for (let i = units.length - 1; i >= 0; i--) {
      const u = units[i];
      if (u.dead > 0) { u.dead -= dt; if (u.dead <= 0) units.splice(i, 1); continue; }
      const dx = bon.x - u.x, dz = bon.z - u.z, d = Math.hypot(dx, dz) || 1;
      if (u.type === 'heli') {
        u.y = THREE.MathUtils.lerp(u.y || 12, bon.height * 0.85, dt * 1.5);
        const want = 9 + bon.scale * 1.5;
        const sp = A.heli.speed * Math.sqrt(bon.scale) * dt;
        if (d > want) { u.x += dx / d * sp; u.z += dz / d * sp; } else { u.x += -dz / d * sp * 0.6; u.z += dx / d * sp * 0.6; } // circle
        u.yaw = Math.atan2(dx, dz) - Math.PI / 2; u.spin += dt * 25;
        u.cool -= dt; if (u.cool <= 0 && d < want * 1.6) { u.cool = A.heli.fireSec; fire('bubble', u.x, u.y, u.z, bon.x, bon.z, A.heli.dmg, 1.3); }
      } else {
        // drive along the road grid toward Bonbon
        const sp = (u.type === 'car' ? A.car.speed : A.tank.speed) * Math.sqrt(bon.scale) * dt;
        const range = u.type === 'tank' ? A.tank.range * Math.sqrt(bon.scale) : 0;
        if (d > range + 0.5) {
          if (u.free || d < pitch * 0.9) { u.free = true; u.x += dx / d * sp; u.z += dz / d * sp; u.yaw = Math.atan2(-dz, dx); } // close: leave the road and go straight at Bonbon
          else if (u.axis === 'x') { const tx = roadLine(bon.x); const ddx = tx - u.x; if (Math.abs(ddx) < sp + 0.05) { u.x = tx; u.axis = 'z'; u.line = tx; } else u.x += Math.sign(ddx) * sp; u.z = u.line; u.yaw = Math.sign(ddx) > 0 ? 0 : Math.PI; }
          else { const tz = Math.abs(bon.x - u.line) > pitch * 0.6 ? roadLine(bon.z) : bon.z; const ddz = tz - u.z; if (Math.abs(ddz) < sp + 0.05) { if (Math.abs(bon.x - u.line) > pitch * 0.6) { u.axis = 'x'; u.line = roadLine(bon.z); } } else u.z += Math.sign(ddz) * sp; u.x = u.line; u.yaw = Math.sign(ddz) > 0 ? -Math.PI / 2 : Math.PI / 2; }
        }
        if (u.type === 'tank') { u.cool -= dt; u.aim = Math.atan2(-dz, dx); if (u.cool <= 0 && d < range * 1.4) { u.cool = A.tank.fireSec; fire('dart', u.x, 1.2, u.z, bon.x, bon.z, A.tank.dmg); } }
        if (u.type === 'car') { u.spin += dt * 8; if (d < R + 1.2) { events.push({ type: 'hitBonbon', dmg: A.car.dmg, x: u.x, z: u.z }); kill(u, true); continue; } }
      }
      // Bonbon squashes or swats anything it reaches
      if (d < R * 0.95 + (u.type === 'heli' ? 1.5 : 1) && (u.type !== 'heli' || Math.abs(u.y - bon.height * 0.85) < 3 * bon.scale)) kill(u, true);
    }

    // shots fly in an arc and land where Bonbon was; they hit if it is still there
    for (let i = shots.length - 1; i >= 0; i--) {
      const s = shots[i]; s.t += dt; const k = Math.min(1, s.t / s.flight);
      s.x = THREE.MathUtils.lerp(s.sx, s.tx, k); s.z = THREE.MathUtils.lerp(s.sz, s.tz, k);
      s.y = THREE.MathUtils.lerp(s.sy, 0.6, k) + Math.sin(k * Math.PI) * (s.kind === 'dart' ? 5 : 1.5);
      if (k >= 1) {
        if (Math.hypot(bon.x - s.tx, bon.z - s.tz) < R + 0.8) events.push({ type: 'hitBonbon', dmg: s.dmg, x: s.tx, z: s.tz, kind: s.kind });
        events.push({ type: 'splat', kind: s.kind, x: s.tx, z: s.tz });
        shots.splice(i, 1);
      }
    }

    updateBoss(dt, bon);
  }

  function kill(u, byBonbon) {
    if (u.dead > 0) return;
    u.dead = 0.25;
    if (byBonbon) events.push({ type: 'unitDown', unit: u.type, x: u.x, y: u.y || 1, z: u.z, points: A[u.type].points });
  }

  /** Bonbon's skill or a big move hits every unit within r of (x, z). */
  function hitArea(x, z, r) {
    for (const u of units) if (u.dead <= 0 && Math.hypot(u.x - x, u.z - z) < r + 1) kill(u, true);
  }

  function updateBoss(dt, bon) {
    if (!boss.alive) { ring.visible = false; return; }
    boss.t += dt; boss.actT -= dt;
    const dx = bon.x - boss.x, dz = bon.z - boss.z, d = Math.hypot(dx, dz) || 1, sc = boss.scale;
    if (boss.act === 'drop') {
      boss.y = Math.max(0, boss.y - dt * 70);
      if (boss.y <= 0) { boss.act = 'idle'; boss.actT = 1.0; events.push({ type: 'bossLand', x: boss.x, z: boss.z }); }
    } else if (boss.act === 'unwind') {
      ring.visible = false; boss.y = Math.max(0, boss.y - dt * 20);
      key.rotation.z += dt * 30 * Math.max(0, boss.actT / 2.2);
      bossG.rotation.z = Math.sin(boss.t * 9) * 0.06 * Math.max(0, boss.actT);
      if (boss.actT <= 0) { boss.alive = false; bossG.visible = false; events.push({ type: 'bossGone', x: boss.x, z: boss.z }); }
    } else if (boss.act === 'jump') {
      const J = boss.jump; J.t += dt; const k = Math.min(1, J.t / J.dur);
      boss.x = THREE.MathUtils.lerp(J.sx, J.tx, k); boss.z = THREE.MathUtils.lerp(J.sz, J.tz, k); boss.y = Math.sin(k * Math.PI) * 14 * Math.sqrt(sc);
      ring.position.set(J.tx, 0.25, J.tz); ring.scale.setScalar(4 * sc * (0.6 + 0.4 * k)); ring.visible = true;
      if (k >= 1) {
        boss.act = 'idle'; boss.actT = 1.3; boss.y = 0; ring.visible = false;
        events.push({ type: 'bossSlam', x: J.tx, z: J.tz });
        if (Math.hypot(bon.x - J.tx, bon.z - J.tz) < 4 * sc + bon.r) events.push({ type: 'hitBonbon', dmg: B.slamDmg, x: J.tx, z: J.tz });
      }
    } else if (boss.act === 'stomp') {
      if (boss.actT <= 0) {
        boss.act = 'idle'; boss.actT = 1.2; events.push({ type: 'bossSlam', x: boss.x, z: boss.z });
        if (d < 5 * sc + bon.r) events.push({ type: 'hitBonbon', dmg: B.stompDmg, x: boss.x, z: boss.z });
      }
    } else {
      ring.visible = false;
      // walk toward Bonbon (phase 1) or keep a distance and fire (phase 2), then pick the next action
      boss.yaw = Math.atan2(dx, dz);
      const keepAway = boss.phase === 2 ? 16 * Math.sqrt(sc) : 4 * sc;
      const sp = 3.2 * Math.sqrt(sc) * dt;
      if (d > keepAway + 1) { boss.x += dx / d * sp; boss.z += dz / d * sp; }
      else if (boss.phase === 2 && d < keepAway - 2) { boss.x -= dx / d * sp; boss.z -= dz / d * sp; }
      if (boss.actT <= 0) {
        if (boss.phase === 1 && d < 7 * sc) { boss.act = 'stomp'; boss.actT = 0.7; ring.position.set(boss.x, 0.25, boss.z); ring.scale.setScalar(5 * sc); ring.visible = true; }
        else if (boss.phase === 2) { boss.actT = 2.6; for (let k = -2; k <= 2; k++) fire('dart', boss.x, 6 * sc, boss.z, bon.x + k * 2.2, bon.z + Math.abs(k) * 1.2, B.dartDmg, 1.2); events.push({ type: 'bossShoot' }); }
        else if (boss.phase === 3) { boss.act = 'jump'; boss.jump = { t: 0, dur: 1.3, sx: boss.x, sz: boss.z, tx: bon.x, tz: bon.z }; }
        else boss.actT = 0.4;
      }
    }
    boss.x = THREE.MathUtils.clamp(boss.x, -half, half); boss.z = THREE.MathUtils.clamp(boss.z, -half, half);
    // pose
    bossG.position.set(boss.x, boss.y, boss.z); bossG.rotation.y = boss.yaw;
    const walk = boss.act === 'idle' && boss.y === 0 ? Math.sin(boss.t * 5) : 0;
    legs[0].rotation.x = walk * 0.4; legs[1].rotation.x = -walk * 0.4;
    arms[0].rotation.x = -walk * 0.4 + (boss.act === 'stomp' ? -2.2 : 0); arms[1].rotation.x = walk * 0.4 + (boss.act === 'stomp' ? -2.2 : 0);
    bTorso.rotation.y = boss.phase === 2 ? Math.sin(boss.t * 3) * 0.15 : 0;
    if (!boss.down) key.rotation.z += dt * (2 + boss.phase);
    eyeMat.color.setHex(boss.down ? 0x8e99b0 : boss.phase === 3 ? 0xff2a6d : 0xff5a4f);
  }

  // ---------- draw instanced parts
  const hide = (m, i) => m.setMatrixAt(i, mtx.makeScale(0, 0, 0));
  const place = (m, i, x, y, z, yaw, sx = 1, sy = 1, sz = 1, pitch = 0, roll = 0) => {
    q.setFromEuler(e.set(pitch, yaw, roll, 'YXZ')); m.setMatrixAt(i, mtx.compose(v.set(x, y, z), q, s3.set(sx, sy, sz)));
  };
  const UNIT_PARTS = [carBody, carKey, tankBody, tankTurret, tankBarrel, heliBody, heliRotor, heliTail], ALL = [...UNIT_PARTS, darts, bubbles];
  function draw() {
    for (let i = 0; i < UNITS; i++) {
      const u = units[i];
      for (const m of UNIT_PARTS) hide(m, i);
      if (!u) continue;
      const pop = u.dead > 0 ? u.dead / 0.25 : 1, sc = 1.2 * pop;
      if (u.type === 'car') {
        place(carBody, i, u.x, 0.6 * sc, u.z, u.yaw, sc, sc, sc);
        place(carKey, i, u.x, 1.45 * sc, u.z, u.yaw + Math.PI / 2, sc, sc, sc, 0, u.spin);
      } else if (u.type === 'tank') {
        place(tankBody, i, u.x, 0.55 * sc, u.z, u.yaw, sc, sc, sc);
        place(tankTurret, i, u.x, 1.2 * sc, u.z, u.aim || 0, sc, sc, sc);
        place(tankBarrel, i, u.x, 1.25 * sc, u.z, u.aim || 0, sc, sc, sc);
      } else {
        place(heliBody, i, u.x, u.y, u.z, u.yaw, sc, sc * 0.85, sc);
        place(heliTail, i, u.x, u.y, u.z, u.yaw, sc, sc, sc);
        place(heliRotor, i, u.x, u.y + 0.95 * sc, u.z, u.spin, sc, sc, sc);
      }
    }
    for (let i = 0; i < SHOTS; i++) {
      const s = shots[i];
      hide(darts, i); hide(bubbles, i);
      if (!s) continue;
      if (s.kind === 'dart') place(darts, i, s.x, s.y, s.z, Math.atan2(-(s.tz - s.sz), s.tx - s.sx), 1, 1, 1);
      else place(bubbles, i, s.x, s.y, s.z, 0, 1 + Math.sin(s.t * 12) * 0.08, 1 - Math.sin(s.t * 12) * 0.08, 1);
    }
    for (const m of ALL) m.instanceMatrix.needsUpdate = true;
  }

  /** At the finish: every toy and shot pops away, so nothing hangs in the air behind the result card. */
  function clearAll() { for (const u of units) if (u.dead <= 0) u.dead = 0.25; shots.length = 0; }
  /** Settles popping units after the finish (no new spawns, no attacks). */
  function settle(dt) { for (let i = units.length - 1; i >= 0; i--) { const u = units[i]; if (u.dead > 0) { u.dead -= dt; if (u.dead <= 0) units.splice(i, 1); } } }

  return {
    update, settle, draw, clearAll, heat, hitArea, damageBoss, events, boss, units,
    get stars() { return stars; },
    /** Point of the boss Bonbon can reach, for contact tests. */
    bossReach(bon) { if (!boss.alive || boss.down || boss.act === 'drop' || boss.y > 2) return null; return { x: boss.x, z: boss.z, r: 1.8 * boss.scale }; },
    dispose() { scene.remove(group); group.traverse((o) => { if (o.isInstancedMesh) o.dispose(); }); for (const d of disposables) d.dispose(); },
  };
}
