// PROTOTYPE - NOT FOR PRODUCTION
/**
 * Module 6: portrait kids UI. Top HUD (velvet-glass pills on one 8 px grid: Star-Gems, Magic Wood, world
 * track, sound), the bottom dock (Hatchery, Kingdom, Evolution) with bouncing badges, spring drawers, the
 * settings sheet (language, music), eye-level toasts with an optional share pill, the floating logo and the
 * first-time spotlight tutorial (dim + soft cutout, icon-first hint, advances only on the real action,
 * follows moving targets, skippable, saved). Text comes from strings.js in the device language.
 */
import { W, H, LAYOUT, HUD, HUD_TARGET, DOCK, clamp, lerp, easeOutBack } from './m0-orchestrator.js';
import { put, PAL, rgba, mix, LANDMARK_X, LANDMARK_BASE } from './m1-art-bakery.js';
import { STR, LANGS, LANG_NAMES, detectLang } from './strings.js';

const FONT = (w, px) => `${w} ${px}px system-ui, -apple-system, "Segoe UI", Roboto, "Noto Sans", sans-serif`;
/** 1234 -> "1.2K". */
export function fmt(n) { n = Math.floor(n); if (n < 1000) return String(n); if (n < 1e6) return (n / 1000).toFixed(n < 1e4 ? 1 : 0) + 'K'; return (n / 1e6).toFixed(1) + 'M'; }
/** Damped spring step toward target (drawers, presses). */
export function spring(s, target, dt, k = 260, d = 22) { s.v += ((target - s.x) * k - s.v * d) * dt; s.x += s.v * dt; return s.x; }
/** FTUE step ids in order, saved as a bitmask. */
export const FTUE = ['fling', 'nova', 'hatch', 'plant', 'evolve'];
/** First FTUE step that is not done and whose condition holds, or null when skipped/finished. */
export function nextFtue(done, skipped, conds) { if (skipped) return null; for (let i = 0; i < FTUE.length; i++) if (!(done & (1 << i)) && conds[i]()) return i; return null; }

function rr(ctx, x, y, w, h, r) { ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h); }
const inR = (p, r) => r && p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;

export function createUI(world) {
  const { bus } = world;
  const U = { open: null, drawer: { x: 0, v: 0 }, sheet: false, sheetS: { x: 0, v: 0 }, toasts: [], press: {}, ftue: null, ftueT: 0, logo: 1, logoGone: false, rects: {}, lang: 'en', sessionT: 0, lastShare: -99 };
  const S = () => world.state, K = () => world.kingdom, A = () => world.art;
  U.T = (k) => (STR[U.lang] && STR[U.lang][k]) || STR.en[k];
  U.setLang = (l) => {
    U.lang = STR[l] ? l : 'en'; S().lang = U.lang;
    const ar = U.lang === 'ar';
    HUD_TARGET.gem[0] = ar ? W - 60 : 60; HUD_TARGET.honey[0] = HUD_TARGET.gem[0]; HUD_TARGET.wood[0] = ar ? W - 276 : 276;
  };
  U.setLang(S().lang || detectLang(typeof navigator !== 'undefined' ? navigator.languages || [navigator.language] : []));
  const mir = (x, w) => (U.lang === 'ar' ? W - x - w : x);
  const text = (ctx, s, x, y, px, col = PAL.cream, w = 900, align = 'center', maxW = 0) => {
    ctx.font = FONT(w, px); ctx.textAlign = align; ctx.textBaseline = 'middle';
    if (maxW) { const m = ctx.measureText(s).width; if (m > maxW) { ctx.font = FONT(w, Math.max(14, Math.floor(px * maxW / m))); } }
    ctx.lineJoin = 'round'; ctx.lineWidth = Math.max(4, px * 0.22); ctx.strokeStyle = rgba(PAL.plum, 0.9); ctx.strokeText(s, x, y); ctx.fillStyle = col; ctx.fillText(s, x, y);
  };
  U.text = text;
  /** A name that may take two lines: split at the space nearest the middle when one line would shrink too much. */
  const text2 = (ctx, str, x, y, px, col, maxW) => {
    ctx.font = FONT(800, px); const sp = str.split(' ');
    if (ctx.measureText(str).width <= maxW || sp.length < 2) { text(ctx, str, x, y, px, col, 800, 'center', maxW); return; }
    let best = 1, bd = 1e9; for (let i = 1; i < sp.length; i++) { const d = Math.abs(sp.slice(0, i).join(' ').length - sp.slice(i).join(' ').length); if (d < bd) { bd = d; best = i; } }
    text(ctx, sp.slice(0, best).join(' '), x, y - px * 0.55, px, col, 800, 'center', maxW); text(ctx, sp.slice(best).join(' '), x, y + px * 0.55, px, col, 800, 'center', maxW);
  };
  /** Velvet-glass pill. */
  const pill = (ctx, x, y, w, h, pulse = 0, col = PAL.plum) => {
    ctx.save(); const s = 1 + pulse * 0.08; ctx.translate(x + w / 2, y + h / 2); ctx.scale(s, s); ctx.translate(-x - w / 2, -y - h / 2);
    ctx.shadowColor = rgba(PAL.plum, 0.35); ctx.shadowBlur = 12; ctx.shadowOffsetY = 4;
    rr(ctx, x, y, w, h, h / 2); ctx.fillStyle = rgba(col, 0.62); ctx.fill(); ctx.shadowColor = 'transparent';
    const g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, rgba(PAL.cream, 0.22)); g.addColorStop(0.5, rgba(PAL.cream, 0.04)); g.addColorStop(1, rgba(PAL.plum, 0.1)); ctx.fillStyle = g; ctx.fill();
    ctx.lineWidth = 2.5; ctx.strokeStyle = rgba(mix(PAL.gold, PAL.cream, 0.4), 0.7); ctx.stroke();
    ctx.restore();
  };
  /** Satin button tile. */
  const tile = (ctx, x, y, w, h, base, pressed = 0, dim = false) => {
    ctx.save(); const s = 1 - pressed * 0.06; ctx.translate(x + w / 2, y + h / 2); ctx.scale(s, s); ctx.translate(-x - w / 2, -y - h / 2);
    rr(ctx, x, y + 8, w, h, 36); ctx.fillStyle = rgba(PAL.plum, 0.55); ctx.fill();
    rr(ctx, x, y, w, h, 36); const g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, mix(base, PAL.cream, 0.35)); g.addColorStop(0.45, base); g.addColorStop(1, mix(base, PAL.plum, 0.3)); ctx.fillStyle = g; ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = rgba(PAL.plum, 0.6); ctx.stroke();
    rr(ctx, x + 10, y + 8, w - 20, h * 0.36, 26); ctx.fillStyle = rgba(PAL.cream, 0.16); ctx.fill();
    if (dim) { rr(ctx, x, y, w, h, 36); ctx.fillStyle = rgba(PAL.plum, 0.45); ctx.fill(); }
    ctx.restore();
  };
  const badge = (ctx, x, y, t, n) => {
    const b = Math.abs(Math.sin(t * 5)) * 8; ctx.save(); ctx.translate(x, y - b);
    ctx.fillStyle = PAL.coral; ctx.beginPath(); ctx.arc(0, 0, 22, 0, Math.PI * 2); ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = PAL.cream; ctx.stroke();
    text(ctx, n ? String(n) : '!', 0, 1, 26, PAL.cream); ctx.restore();
  };
  const gemIcon = (ctx, x, y, s = 1.5) => put(ctx, A().gem, x, y, s);

  // ---------- badges ----------
  U.badges = () => {
    const s = S(), k = K(), E = world.cfg.economy;
    const hatch = (k.eggReady() ? 1 : 0) || (s.eggs.length === 0 && s.starGems >= E.eggCost.meadow ? 1 : 0);
    const kingdom = (!s.planted && s.activeLandmark < 6) || (k.activeNeeds() && s.starGems >= 50);
    const evo = s.critters.some((c) => k.canEvolve(c));
    return [hatch, kingdom, evo];
  };
  // ---------- layout ----------
  const dockRect = (i) => ({ x: mir(DOCK.x0 + i * (DOCK.w + DOCK.gap), DOCK.w), y: DOCK.top, w: DOCK.w, h: DOCK.bh });
  U.dockRect = dockRect;
  const DRAWER_TOP = 520;
  const drawerY = () => lerp(H + 20, DRAWER_TOP, U.drawer.x);

  // ---------- toasts ----------
  U.toast = (o) => { U.toasts.push(Object.assign({ t: 0, dur: 2.6 }, o)); if (U.toasts.length > 3) U.toasts.splice(1, 1); };
  const shareable = () => U.sessionT > 60 && U.sessionT - U.lastShare > 20 && world.mode === 'play' && !!(window.lib && window.lib.share);
  U.doShare = () => {
    U.lastShare = U.sessionT;
    try { const p = window.lib.share && window.lib.share({ title: 'Wonder Sprout', text: U.T('shareText') }); if (p && p.catch) p.catch(() => {}); } catch (e) { /* older host */ }
    bus.emit('ui:share', {});
  };
  bus.on('landmark:built', (e) => U.toast({ text: U.T('built'), sub: (STR[U.lang] || STR.en).lm[e.i], icon: 'landmark' + e.i, share: e.i === 5 && shareable(), dur: e.i === 5 ? 6 : 2.8 }));
  bus.on('egg:hatch', (e) => { if (e.critter) U.toast({ text: U.T('friend'), sub: (STR[U.lang] || STR.en).cr[e.critter.species], critter: e.critter, dur: 2.8 }); });
  bus.on('evolve', (e) => U.toast({ text: U.T('evolve'), sub: (STR[U.lang] || STR.en).cr[e.critter.species], critter: e.critter, share: shareable(), dur: 5 }));
  bus.on('raid:start', () => U.toast({ text: U.T('raid'), icon: 'airship', dur: 2.2 }));
  bus.on('welcome', (e) => U.toast({ text: U.T('welcome'), sub: '+' + fmt(e.gems), icon: 'gem', dur: 3 }));
  bus.on('gift', () => setTimeout(() => U.toast({ text: U.T('gift'), icon: 'giftEgg', dur: 3 }), 1900));
  bus.on('world:done', () => U.toast({ text: U.T('soon'), icon: 'landmark5', share: shareable(), dur: 6 }));
  bus.on('launch', () => { U.logoGone = true; });

  // ---------- FTUE ----------
  const ftueConds = [
    () => true,
    () => S().stats.flings >= 1 && world.gameplay.targets.some((t) => t.alive && (t.type === 'geode' || t.type === 'pinata')),
    () => K().eggReady(),
    () => !S().planted && S().activeLandmark < 6 && K().built(0),
    () => K().canEvolve(K().hero()),
  ];
  const markFtue = (i) => { const f = S().ftue; if (!(f.done & (1 << i))) { f.done |= 1 << i; world.saver.soon(); U.ftueT = 0; } };
  bus.on('launch', () => markFtue(0));
  bus.on('nova', () => markFtue(1));
  bus.on('hit', (e) => { if (e.by === 'tap') markFtue(1); });
  bus.on('egg:hatch', () => markFtue(2));
  bus.on('landmark:planted', () => markFtue(3));
  bus.on('evolve', () => markFtue(4));
  /** Where the current FTUE step points: a stage point and radius. */
  U.ftueTarget = (i) => {
    const G = world.gameplay;
    if (i === 0) return { x: G.hero.x, y: G.hero.y - 30, r: 86 };
    if (i === 1) { const ts = G.targets.filter((t) => t.alive && (t.type === 'geode' || t.type === 'pinata')).sort((a, b) => Math.hypot(a.x - G.hero.x, a.y - G.hero.y) - Math.hypot(b.x - G.hero.x, b.y - G.hero.y)); const t = ts[0]; return t ? { x: t.x, y: t.y, r: t.r * 1.9, ring: t } : null; }
    if (i === 2) return { x: LAYOUT.nestX, y: LAYOUT.nestY - 40, r: 84 };
    if (i === 3) { if (U.open === 'kingdom' && U.rects.plant) { const r = U.rects.plant; return { x: r.x + r.w / 2, y: r.y + r.h / 2, r: Math.max(r.w, r.h) * 0.62, rw: r.w, rh: r.h }; } const d = dockRect(1); return { x: d.x + d.w / 2, y: d.y + d.h / 2, r: 120 }; }
    if (i === 4) { if (U.open === 'evolution' && U.rects.evo0) { const r = U.rects.evo0; return { x: r.x + r.w / 2, y: r.y + r.h / 2, r: Math.max(r.w, r.h) * 0.62, rw: r.w, rh: r.h }; } const d = dockRect(2); return { x: d.x + d.w / 2, y: d.y + d.h / 2, r: 120 }; }
    return null;
  };
  const ftueHint = ['fling', 'nova', 'hatch', 'plant', 'evolve'];

  // ---------- input ----------
  /** Returns true when the UI took the press (the game must not start a fling). */
  U.down = (p) => {
    const s = S();
    if (U.sheet) { U.sheetTap(p); return true; }
    if (U.open) { U.drawerTap(p); return true; }
    for (const t of U.toasts) if (t.shareRect && inR(p, t.shareRect)) { U.doShare(); t.share = false; t.t = Math.max(t.t, t.dur - 0.4); return true; }
    if (U.ftue != null && U.rects.skip && inR(p, U.rects.skip)) { s.ftue.skipped = true; U.ftue = null; world.saver.soon(); world.audio.click(); return true; }
    if (inR(p, U.rects.sound)) { s.sound = !s.sound; world.audio.setOn(s.sound); world.audio.click(); world.saver.soon(); U.press.sound = 1; return true; }
    if (inR(p, U.rects.track)) { U.sheet = true; world.audio.open(); return true; }
    if (p.y >= DOCK.y) {
      for (let i = 0; i < 3; i++) if (inR(p, dockRect(i))) { U.openDrawer(['hatchery', 'kingdom', 'evolution'][i]); U.press['d' + i] = 1; return true; }
      return true; // the dock strip is not part of the island
    }
    if (inR(p, U.rects.gemPill) || inR(p, U.rects.woodPill)) return true;
    return false;
  };
  U.openDrawer = (k) => { U.open = k; world.audio.open(); bus.emit('ui:open', { k }); };
  U.closeDrawer = () => { U.open = null; world.audio.click(); };
  U.drawerTap = (p) => {
    const R = U.rects;
    if (p.y < drawerY() - 10 || inR(p, R.close)) { U.closeDrawer(); return; }
    const k = K(), s = S(), E = world.cfg.economy;
    if (U.open === 'hatchery') {
      if (inR(p, R.buyMeadow)) { if (k.buyEgg('meadow')) world.audio.coin(); else world.audio.click(); return; }
      if (inR(p, R.buyCoral)) { if (k.buyEgg('coral')) world.audio.coin(); else world.audio.click(); return; }
      for (const c of s.critters) if (inR(p, R['cr' + c.id])) { if (k.setHero(c.id)) world.audio.pop(); return; }
    } else if (U.open === 'kingdom') {
      if (inR(p, R.plant)) { if (k.plant()) { world.audio.coin(); U.closeDrawer(); } return; }
      if (inR(p, R.rush)) { if (k.rush() > 0) { world.audio.coin(); U.closeDrawer(); } return; }
    } else if (U.open === 'evolution') {
      const list = U.evoList();
      for (let i = 0; i < list.length; i++) if (inR(p, R['evo' + i])) { if (k.evolve(list[i].id)) { world.audio.fanfare(); U.closeDrawer(); } else world.audio.click(); return; }
    }
    void E;
  };
  U.sheetTap = (p) => {
    const R = U.rects;
    for (const l of LANGS) if (inR(p, R['lang_' + l])) { U.setLang(l); world.audio.click(); world.saver.soon(); return; }
    if (inR(p, R.music)) { world.state.musicOff = !world.state.musicOff; world.audio.setMusic(!world.state.musicOff); world.audio.click(); return; }
    U.sheet = false; world.audio.click();
  };
  U.evoList = () => { const s = S(); const ids = [s.heroId, ...s.activeCritterIds]; return ids.map((id) => K().critter(id)).filter(Boolean).slice(0, 4); };

  // ---------- frame ----------
  U.update = (dt) => {
    U.sessionT += dt;
    spring(U.drawer, U.open ? 1 : 0, dt); spring(U.sheetS, U.sheet ? 1 : 0, dt);
    for (const k of Object.keys(U.press)) U.press[k] = Math.max(0, U.press[k] - dt * 5);
    // one toast at a time: the next waits for the current one to finish
    if (U.toasts.length) { U.toasts[0].t += dt; if (U.toasts[0].t > U.toasts[0].dur) U.toasts.shift(); }
    if (U.logoGone) U.logo = Math.max(0, U.logo - dt * 1.4);
    const f = S().ftue, nxt = world.mode === 'play' ? nextFtue(f.done, f.skipped, ftueConds) : null;
    if (nxt !== U.ftue) { U.ftue = nxt; U.ftueT = 0; } else U.ftueT += dt;
  };

  // ---------- drawing ----------
  U.drawHUD = (ctx, t, V) => {
    const s = S(), R = U.rects;
    const g = { x: mir(HUD.gem.x, HUD.gem.w), y: HUD.y, w: HUD.gem.w, h: HUD.h }; R.gemPill = g;
    pill(ctx, g.x, g.y, g.w, g.h, V.pills.gem); gemIcon(ctx, g.x + 40, g.y + 36, 1.7); text(ctx, fmt(s.starGems), g.x + 76, g.y + 38, 34, PAL.cream, 900, 'left', g.w - 92);
    const w = { x: mir(HUD.wood.x, HUD.wood.w), y: HUD.y, w: HUD.wood.w, h: HUD.h }; R.woodPill = w;
    pill(ctx, w.x, w.y, w.w, w.h, V.pills.wood); if (A().log) put(ctx, A().log, w.x + 40, w.y + 36, 1.6); text(ctx, fmt(s.magicWood), w.x + 72, w.y + 38, 34, PAL.cream, 900, 'left', w.w - 88);
    const k = { x: mir(HUD.track.x, HUD.track.w), y: HUD.y, w: HUD.track.w, h: HUD.h }; R.track = k;
    pill(ctx, k.x, k.y, k.w, k.h, 0);
    ctx.save(); ctx.strokeStyle = rgba(PAL.cream, 0.5); ctx.lineWidth = 4; ctx.setLineDash([4, 8]); ctx.beginPath(); ctx.moveTo(k.x + 44, k.y + 36); ctx.lineTo(k.x + k.w - 44, k.y + 36); ctx.stroke(); ctx.restore();
    for (let i = 0; i < 3; i++) {
      const cx = k.x + 44 + i * (k.w - 88) / 2, cur = i === s.worldIndex, done = i < s.worldIndex;
      ctx.fillStyle = cur ? PAL.gold : done ? PAL.sage : rgba(PAL.cream, 0.35); ctx.beginPath(); ctx.arc(cx, k.y + 36, cur ? 17 : 12, 0, Math.PI * 2); ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = rgba(PAL.plum, 0.6); ctx.stroke();
      if (cur) { ctx.strokeStyle = PAL.gold; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(cx, k.y + 36, 22, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (s.landmarks.filter((l) => l.built).length / 6)); ctx.stroke(); }
      text(ctx, String(i + 1), cx, k.y + 37, cur ? 20 : 16, cur ? PAL.plum : PAL.cream, 900);
    }
    const so = { x: mir(HUD.sound.x, HUD.sound.w), y: HUD.y, w: HUD.sound.w, h: HUD.h }; R.sound = so;
    pill(ctx, so.x, so.y, so.w, so.h, U.press.sound || 0);
    drawSpeaker(ctx, so.x + 36, so.y + 36, s.sound);
  };
  function drawSpeaker(ctx, x, y, on) {
    ctx.save(); ctx.fillStyle = PAL.cream; ctx.beginPath(); ctx.moveTo(x - 16, y - 7); ctx.lineTo(x - 7, y - 7); ctx.lineTo(x + 3, y - 16); ctx.lineTo(x + 3, y + 16); ctx.lineTo(x - 7, y + 7); ctx.lineTo(x - 16, y + 7); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = PAL.cream; ctx.lineWidth = 3.5; ctx.lineCap = 'round';
    if (on) { ctx.beginPath(); ctx.arc(x + 4, y, 9, -0.9, 0.9); ctx.stroke(); ctx.beginPath(); ctx.arc(x + 4, y, 16, -0.9, 0.9); ctx.stroke(); }
    else { ctx.strokeStyle = PAL.coral; ctx.beginPath(); ctx.moveTo(x + 9, y - 8); ctx.lineTo(x + 21, y + 8); ctx.moveTo(x + 21, y - 8); ctx.lineTo(x + 9, y + 8); ctx.stroke(); }
    ctx.restore();
  }
  U.drawDock = (ctx, t) => {
    const g = ctx.createLinearGradient(0, DOCK.y - 30, 0, H); g.addColorStop(0, rgba(PAL.velvet, 0)); g.addColorStop(0.12, rgba(PAL.velvet, 0.86)); g.addColorStop(1, PAL.velvet); ctx.fillStyle = g; ctx.fillRect(0, DOCK.y - 30, W, H - DOCK.y + 30);
    const bad = U.badges(), cols = [PAL.sage, PAL.lav, PAL.coral];
    for (let i = 0; i < 3; i++) {
      const r = dockRect(i), cx = r.x + r.w / 2, cy = r.y + r.h / 2;
      tile(ctx, r.x, r.y, r.w, r.h, cols[i], U.press['d' + i] || 0);
      const A_ = A();
      if (i === 0 && A_.eggs) put(ctx, A_.eggs.meadow, cx, cy + 40, 1.25, 1.25, Math.sin(t * 2) * 0.06);
      if (i === 1) { const sp = A_.landmark5 || A_.landmark0; if (sp) put(ctx, sp, cx, cy + 74, 0.72, 0.72); }
      if (i === 2) { const c = K().hero(); world.vfx.drawCritter(ctx, { id: -1, species: c.species, stage: c.stage }, cx, cy + 54, { size: 0.95, idle: true, look: world.pointer }); }
      if (bad[i]) badge(ctx, r.x + r.w - 26, r.y + 22, t + i, 0);
    }
  };
  U.drawLogo = (ctx, t) => {
    if (U.logo <= 0) return;
    ctx.save(); ctx.globalAlpha = U.logo; const b = Math.sin(t * 2) * 4;
    ctx.translate(W / 2, 214 + b); ctx.rotate(-0.03);
    text(ctx, 'Wonder', 0, -44, 92, PAL.gold); text(ctx, 'Sprout', 0, 44, 92, mix(PAL.gold, PAL.cream, 0.45));
    text(ctx, 'Royal Sky-Garden', 0, 116, 30, PAL.cream, 800);
    ctx.restore();
  };
  U.drawToasts = (ctx, t) => {
    const y = HUD.y + HUD.h + 16 + 60;
    for (const o of U.toasts.slice(0, 1)) {
      const u = o.t / o.dur, inK = clamp(o.t / 0.35, 0, 1), outK = clamp((o.dur - o.t) / 0.3, 0, 1), k = Math.min(easeOutBack(inK), outK);
      if (k <= 0) continue;
      ctx.save(); ctx.translate(W / 2, y); ctx.scale(k, k); ctx.globalAlpha = Math.min(1, outK * 1.5);
      const w = 416, h = o.sub ? 120 : 96;
      rr(ctx, -w / 2, -h / 2, w, h, 44); ctx.fillStyle = rgba(PAL.plum, 0.82); ctx.fill(); ctx.lineWidth = 4; ctx.strokeStyle = rgba(PAL.gold, 0.85); ctx.stroke();
      const ix = -w / 2 + 60, A_ = A();
      if (o.critter) world.vfx.drawCritter(ctx, o.critter, ix, 40, { size: 0.72, happy: true, idle: true });
      else if (o.icon === 'gem') put(ctx, A_.gem, ix, 0, 2.2, 2.2, Math.sin(t * 3) * 0.2);
      else if (o.icon === 'giftEgg' && A_.eggs) put(ctx, A_.eggs.gift, ix, 34, 0.85);
      else if (o.icon && A_[o.icon]) put(ctx, A_[o.icon], ix, o.icon === 'airship' ? 0 : 50, o.icon === 'airship' ? 0.3 : 0.48, o.icon === 'airship' ? 0.3 : 0.48);
      const tx = o.share ? 0 : 44, tw = o.share ? 180 : 260;
      text(ctx, o.text, tx, o.sub ? -20 : 0, 40, PAL.gold, 900, 'center', tw);
      if (o.sub) text(ctx, o.sub, tx, 28, 28, PAL.cream, 800, 'center', tw);
      o.shareRect = null;
      if (o.share) {
        const bx = w / 2 - 96, by = -36, bw = 80, bh = 72;
        tile(ctx, bx, by, bw, bh, PAL.teal); drawShareIcon(ctx, bx + bw / 2, by + bh / 2);
        o.shareRect = { x: W / 2 + (bx) * k, y: y + by * k, w: bw * k, h: bh * k };
      }
      ctx.restore();
      void u;
    }
  };
  function drawShareIcon(ctx, x, y) {
    ctx.save(); ctx.strokeStyle = PAL.cream; ctx.fillStyle = PAL.cream; ctx.lineWidth = 4;
    const pts = [[x + 14, y - 16], [x - 14, y], [x + 14, y + 16]];
    ctx.beginPath(); ctx.moveTo(...pts[0]); ctx.lineTo(...pts[1]); ctx.lineTo(...pts[2]); ctx.stroke();
    for (const p of pts) { ctx.beginPath(); ctx.arc(p[0], p[1], 8, 0, Math.PI * 2); ctx.fill(); }
    ctx.restore();
  }
  /** Spotlight tutorial: dim with a soft cutout, a hint pill, and a guide from the hero to the goal. */
  U.drawFtue = (ctx, t) => {
    U.rects.skip = null;
    const i = U.ftue; if (i == null || U.ftueT < (i === 0 ? 1.2 : 0.5) || U.sheet) return;
    if (U.open && U.open !== (i === 3 ? 'kingdom' : i === 4 ? 'evolution' : '')) return;
    const tg = U.ftueTarget(i); if (!tg) return;
    const a = clamp((U.ftueT - (i === 0 ? 1.2 : 0.5)) / 0.4, 0, 1);
    ctx.save(); ctx.globalAlpha = a;
    const pulse = 1 + Math.sin(t * 4) * 0.05, r = tg.r * pulse;
    const g = ctx.createRadialGradient(tg.x, tg.y, r * 0.78, tg.x, tg.y, r * 1.25); g.addColorStop(0, rgba(PAL.velvet, 0)); g.addColorStop(1, rgba(PAL.velvet, i === 0 ? 0.22 : 0.36));
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = rgba(PAL.gold, 0.85); ctx.lineWidth = 4; ctx.setLineDash([10, 10]); ctx.lineDashOffset = -t * 30; ctx.beginPath(); ctx.arc(tg.x, tg.y, r, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
    const G = world.gameplay, h = G.hero;
    if (i === 0) {
      // ghost finger pulls back from the hero, then the dotted path flies from the hero toward a crystal
      const cyc = (t * 0.7) % 1, pull = Math.min(1, cyc / 0.55), fx = h.x, fy = h.y + pull * 120;
      const goal = G.targets.find((k) => k.alive && k.type === 'pinata') || G.targets.find((k) => k.alive);
      if (goal && cyc > 0.55) { const u = (cyc - 0.55) / 0.45; for (let k = 0; k < 8; k++) { const q = k / 8; if (q > u) break; ctx.fillStyle = k % 2 ? PAL.cream : PAL.gold; ctx.beginPath(); ctx.arc(lerp(h.x, goal.x, q), lerp(h.y - 30, goal.y, q), 7, 0, Math.PI * 2); ctx.fill(); } }
      if (cyc <= 0.6) drawFinger(ctx, fx + 40, fy + 10);
    } else if (i === 1 && tg.ring) {
      // the guide flows from the hero to the crystal; the finger taps when the ring meets the core
      ctx.strokeStyle = rgba(PAL.gold, 0.8); ctx.lineWidth = 5; ctx.setLineDash([4, 14]); ctx.lineDashOffset = -t * 40; ctx.beginPath(); ctx.moveTo(h.x, h.y - 40); ctx.lineTo(tg.x, tg.y + tg.ring.r); ctx.stroke(); ctx.setLineDash([]);
      const sweet = world.vfx ? ((tg.ring.phase % world.cfg.rhythm.period) / world.cfg.rhythm.period) : 0;
      drawFinger(ctx, tg.x + 34, tg.y + 30 - (sweet > 0.85 ? 0 : 14));
    } else if (tg.rw) drawFinger(ctx, tg.x + (U.lang === 'ar' ? -1 : 1) * (tg.rw * 0.5 - 6), tg.y + tg.rh * 0.5 - Math.abs(Math.sin(t * 4)) * 10);
    else drawFinger(ctx, tg.x + tg.r * 0.5, tg.y + tg.r * 0.42 - Math.abs(Math.sin(t * 4)) * 16);
    // hint pill above or below the target, never under the HUD
    const label = U.T(ftueHint[i]); ctx.font = FONT(900, 34); const tw = Math.min(520, ctx.measureText(label).width + 60);
    let py = tg.y - r - 58; if (py < HUD.y + HUD.h + 40) py = tg.y + r + 58;
    if (py > DOCK.y - 40 && tg.y < DOCK.y) py = tg.y - r - 58;
    const px = clamp(tg.x, tw / 2 + 24, W - tw / 2 - 24);
    rr(ctx, px - tw / 2, py - 34, tw, 68, 34); ctx.fillStyle = rgba(PAL.plum, 0.9); ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = PAL.gold; ctx.stroke();
    text(ctx, label, px, py + 1, 34, PAL.cream, 900, 'center', tw - 40);
    // skip, small, on the margin under the HUD
    const sk = { x: mir(24, 120), y: HUD.y + HUD.h + 16, w: 120, h: 56 }; U.rects.skip = sk;
    rr(ctx, sk.x, sk.y, sk.w, sk.h, 28); ctx.fillStyle = rgba(PAL.plum, 0.7); ctx.fill(); text(ctx, U.T('skip') + ' »', sk.x + sk.w / 2, sk.y + 29, 24, PAL.cream, 800, 'center', sk.w - 20);
    ctx.restore();
  };
  function drawFinger(ctx, x, y) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(-0.5);
    ctx.fillStyle = rgba(PAL.plum, 0.25); ctx.beginPath(); ctx.ellipse(6, 8, 26, 34, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = PAL.cream; ctx.strokeStyle = PAL.plum; ctx.lineWidth = 4;
    rr(ctx, -13, -50, 26, 62, 13); ctx.fill(); ctx.stroke();
    rr(ctx, -24, -2, 48, 44, 18); ctx.fill(); ctx.stroke();
    ctx.fillStyle = rgba(PAL.coral, 0.35); ctx.beginPath(); ctx.ellipse(0, -40, 7, 6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  /** Drawers slide up with spring overshoot. */
  U.drawDrawer = (ctx, t) => {
    if (U.drawer.x < 0.01 && !U.open) return;
    const y0 = drawerY(), R = U.rects, s = S(), k = K(), E = world.cfg.economy, A_ = A();
    ctx.save(); ctx.fillStyle = rgba(PAL.velvet, 0.45 * clamp(U.drawer.x, 0, 1)); ctx.fillRect(0, 0, W, H);
    rr(ctx, 16, y0, W - 32, H - y0 + 60, 44); const g = ctx.createLinearGradient(0, y0, 0, H); g.addColorStop(0, mix(PAL.plum, PAL.lav, 0.32)); g.addColorStop(1, PAL.plum); ctx.fillStyle = g; ctx.fill(); ctx.lineWidth = 4; ctx.strokeStyle = rgba(PAL.gold, 0.7); ctx.stroke();
    rr(ctx, W / 2 - 50, y0 + 14, 100, 10, 5); ctx.fillStyle = rgba(PAL.cream, 0.4); ctx.fill();
    R.close = { x: mir(W - 120, 96), y: y0 + 24, w: 96, h: 96 };
    ctx.save(); ctx.translate(R.close.x + 48, R.close.y + 48); ctx.strokeStyle = PAL.cream; ctx.lineWidth = 7; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-14, -14); ctx.lineTo(14, 14); ctx.moveTo(14, -14); ctx.lineTo(-14, 14); ctx.stroke(); ctx.restore();
    const top = y0 + 128;
    if (U.open === 'hatchery' || (!U.open && U.lastOpen === 'hatchery')) {
      const cards = [['meadow', 'buyMeadow'], ['coral', 'buyCoral']];
      cards.forEach(([kind, key], i) => {
        const r = { x: mir(40 + i * 328, 312), y: top, w: 312, h: 200 }; R[key] = r; const ok = s.starGems >= E.eggCost[kind] && s.eggs.length < E.maxEggs;
        tile(ctx, r.x, r.y, r.w, r.h, i ? PAL.coral : PAL.sage, 0, !ok);
        if (A_.eggs) put(ctx, A_.eggs[kind], r.x + 78, r.y + 168, 1.25, 1.25, Math.sin(t * 2 + i) * 0.05);
        gemIcon(ctx, r.x + 176, r.y + 124, 1.6); text(ctx, fmt(E.eggCost[kind]), r.x + 238, r.y + 126, 40, ok ? PAL.cream : rgba(PAL.cream, 0.6));
        text(ctx, (STR[U.lang] || STR.en).egg[kind], r.x + 210, r.y + 52, 26, PAL.cream, 800, 'center', 180);
      });
      const cs = s.critters, cw = 148, gap = 16, cols = 4;
      cs.slice(0, 8).forEach((c, i) => {
        const col = i % cols, row = Math.floor(i / cols), r = { x: mir(40 + col * (cw + gap), cw), y: top + 224 + row * (cw + gap), w: cw, h: cw }; R['cr' + c.id] = r;
        rr(ctx, r.x, r.y, r.w, r.h, 30); ctx.fillStyle = rgba(PAL.cream, c.id === s.heroId ? 0.2 : 0.08); ctx.fill(); ctx.lineWidth = c.id === s.heroId ? 5 : 2; ctx.strokeStyle = c.id === s.heroId ? PAL.gold : rgba(PAL.cream, 0.3); ctx.stroke();
        world.vfx.drawCritter(ctx, c, r.x + cw / 2, r.y + cw - 22, { size: 0.82, idle: true, look: world.pointer });
        for (let k2 = 0; k2 < 3; k2++) { ctx.fillStyle = k2 < c.stage ? PAL.gold : rgba(PAL.cream, 0.25); ctx.beginPath(); ctx.arc(r.x + cw / 2 - 22 + k2 * 22, r.y + cw - 10, 6, 0, Math.PI * 2); ctx.fill(); }
        if (c.id === s.heroId && A_.critters.fox) put(ctx, A_.critters.fox.crown, r.x + 26, r.y + 34, 0.6);
      });
    } else if (U.open === 'kingdom' || (!U.open && U.lastOpen === 'kingdom')) {
      R.plant = null; R.rush = null;
      for (let i = 0; i < 6; i++) {
        const col = i % 3, row = Math.floor(i / 3), r = { x: mir(40 + col * 216, 200), y: top + row * 232, w: 200, h: 216 }, l = s.landmarks[i];
        const active = i === s.activeLandmark && s.planted, next = i === s.activeLandmark && !s.planted;
        rr(ctx, r.x, r.y, r.w, r.h, 30); ctx.fillStyle = rgba(PAL.cream, l.built ? 0.16 : 0.07); ctx.fill(); ctx.lineWidth = active || next ? 4 : 2; ctx.strokeStyle = active || next ? PAL.gold : rgba(PAL.cream, 0.25); ctx.stroke();
        const sp = A_['landmark' + i]; if (sp) put(ctx, sp, r.x + r.w / 2, r.y + 170, 0.78, 0.78, 0, l.built ? 1 : active ? 0.55 : 0.25);
        if (l.built) { ctx.fillStyle = PAL.sage; ctx.beginPath(); ctx.arc(r.x + r.w - 30, r.y + r.h - 30, 20, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = PAL.cream; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(r.x + r.w - 40, r.y + r.h - 30); ctx.lineTo(r.x + r.w - 32, r.y + r.h - 22); ctx.lineTo(r.x + r.w - 20, r.y + r.h - 38); ctx.stroke(); }
        if (active) { const p = k.progress(i); rr(ctx, r.x + 20, r.y + r.h - 34, r.w - 40, 16, 8); ctx.fillStyle = rgba(PAL.plum, 0.6); ctx.fill(); rr(ctx, r.x + 20, r.y + r.h - 34, (r.w - 40) * p, 16, 8); ctx.fillStyle = PAL.gold; ctx.fill(); }
        text2(ctx, (STR[U.lang] || STR.en).lm[i], r.x + r.w / 2, r.y + 36, 26, l.built || active || next ? PAL.cream : rgba(PAL.cream, 0.55), r.w - 28);
        if (next) { const b = { x: r.x + 16, y: r.y + r.h - 84, w: r.w - 32, h: 72 }; R.plant = b; tile(ctx, b.x, b.y, b.w, b.h, PAL.gold, 0); text(ctx, U.T('plant'), b.x + b.w / 2, b.y + 36, 26, PAL.cream, 900, 'center', b.w - 20); }
      }
      const need = k.activeNeeds();
      if (need && (s.starGems >= 1 || s.magicWood >= 1)) { const b = { x: mir(160, 400), y: top + 480, w: 400, h: 96 }; R.rush = b; tile(ctx, b.x, b.y, b.w, b.h, PAL.teal); gemIcon(ctx, b.x + 60, b.y + 48, 1.8); text(ctx, U.T('rush'), b.x + 230, b.y + 50, 38, PAL.cream, 900, 'center', 260); }
    } else if (U.open === 'evolution' || (!U.open && U.lastOpen === 'evolution')) {
      const list = U.evoList();
      list.forEach((c, i) => {
        const r = { x: mir(40, W - 80), y: top + i * 148, w: W - 80, h: 132 };
        rr(ctx, r.x, r.y, r.w, r.h, 30); ctx.fillStyle = rgba(PAL.cream, i === 0 ? 0.16 : 0.08); ctx.fill(); ctx.lineWidth = i === 0 ? 4 : 2; ctx.strokeStyle = i === 0 ? PAL.gold : rgba(PAL.cream, 0.25); ctx.stroke();
        world.vfx.drawCritter(ctx, c, r.x + 80, r.y + 118, { size: 0.86, idle: true, look: world.pointer });
        text(ctx, (STR[U.lang] || STR.en).cr[c.species], r.x + 260, r.y + 40, 28, PAL.cream, 800, 'center', 230);
        for (let k2 = 0; k2 < 3; k2++) { ctx.fillStyle = k2 < c.stage ? PAL.gold : rgba(PAL.cream, 0.25); ctx.beginPath(); ctx.arc(r.x + 220 + k2 * 40, r.y + 92, 13, 0, Math.PI * 2); ctx.fill(); }
        const cost = k.evolveCost(c), ok = k.canEvolve(c), b = { x: r.x + r.w - 236, y: r.y + 22, w: 216, h: 88 }; R['evo' + i] = c.stage < 3 ? b : null;
        if (c.stage < 3) { tile(ctx, b.x, b.y, b.w, b.h, PAL.coral, 0, !ok); gemIcon(ctx, b.x + 46, b.y + 44, 1.6); text(ctx, fmt(cost), b.x + 136, b.y + 46, 36, ok ? PAL.cream : rgba(PAL.cream, 0.6), 900, 'center', 130); }
        else if (A_.critters.fox) put(ctx, A_.critters.fox.crown, b.x + b.w / 2, b.y + 70, 1.2);
      });
    }
    if (U.open) U.lastOpen = U.open;
    ctx.restore();
  };
  U.drawSheet = (ctx) => {
    if (U.sheetS.x < 0.01 && !U.sheet) return;
    const k = clamp(U.sheetS.x, 0, 1.1), R = U.rects;
    ctx.save(); ctx.fillStyle = rgba(PAL.velvet, 0.5 * Math.min(1, k)); ctx.fillRect(0, 0, W, H);
    ctx.translate(W / 2, 640); ctx.scale(k, k); ctx.translate(-W / 2, -640);
    rr(ctx, 64, 260, W - 128, 760, 44); ctx.fillStyle = mix(PAL.plum, PAL.lav, 0.25); ctx.fill(); ctx.lineWidth = 4; ctx.strokeStyle = PAL.gold; ctx.stroke();
    text(ctx, '🌐 ' + U.T('lang'), W / 2, 316, 34, PAL.gold, 900, 'center', 400);
    LANGS.forEach((l, i) => {
      const r = { x: 96 + (i % 2) * 272, y: 364 + Math.floor(i / 2) * 112, w: 256, h: 96 }; R['lang_' + l] = U.sheet ? r : null;
      tile(ctx, r.x, r.y, r.w, r.h, l === U.lang ? PAL.gold : PAL.lav); text(ctx, LANG_NAMES[l], r.x + r.w / 2, r.y + 48, 30, PAL.cream, 800, 'center', r.w - 24);
    });
    const m = { x: 96, y: 832, w: W - 192, h: 96 }; R.music = U.sheet ? m : null;
    tile(ctx, m.x, m.y, m.w, m.h, world.state.musicOff ? PAL.plum : PAL.teal); text(ctx, '♪ ' + U.T('music') + (world.state.musicOff ? ' ✕' : ' ✓'), m.x + m.w / 2, m.y + 48, 32, PAL.cream, 900, 'center', m.w - 40);
    ctx.restore();
  };
  /** World-side markers: a soft arrow over an off-screen-ish nest egg is not needed; the landmark pulse is. */
  U.drawWorldMarks = (ctx, t, V) => {
    const s = S(); if (s.activeLandmark >= 6 || !s.planted || !V.landPulse) return;
    const x = LANDMARK_X[s.activeLandmark], y = LANDMARK_BASE - 70; ctx.save(); ctx.globalAlpha = V.landPulse; ctx.strokeStyle = PAL.gold; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(x, y, 54 + (1 - V.landPulse) * 14, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
  };
  return U;
}
