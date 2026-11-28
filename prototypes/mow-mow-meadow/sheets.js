// PROTOTYPE - NOT FOR PRODUCTION
// The two bottom sheets. Album: friends, lost toys, wardrobe, stickers and the lane map. Workshop: the three
// upgrades, Buzzy's paint, stripe tints and trails, and the settings. Pictures are drawn from the real models in
// small batches so opening a sheet never stalls the world. `G` is the game's shared handle.
import { ICONS } from './ui.js';

const pics = new Map();
/** A model's picture, drawn once and reused as an image. `make` builds the model; it is released after the shot. */
function pic(G, key, make, opt) {
  if (!pics.has(key)) { const m = make(), obj = m.group || m; if (m.update) m.update(0, 0, 'idle'); const cv = G.Cast.portrait(G.world, opt && opt.part ? m[opt.part] : obj, 128, opt); obj.traverse((o) => { if (o.geometry) o.geometry.dispose(); }); pics.set(key, cv); }
  const c = document.createElement('canvas'); c.width = c.height = 128; c.getContext('2d').drawImage(pics.get(key), 0, 0, 128, 128); return c;
}
/** Fills cells with pictures a few per tick. */
function lazy(G, jobs) { let i = 0; const run = () => { for (let k = 0; k < 5 && i < jobs.length; k++, i++) { const [cell, fn] = jobs[i]; if (cell.isConnected) cell.prepend(fn()); } if (i < jobs.length) G.later(run, 16); }; run(); }
const el = (tag, cls, html) => { const d = document.createElement(tag); if (cls) d.className = cls; if (html !== undefined) d.innerHTML = html; return d; };
const head = (body, icon, text, count) => { const h = el('h3', '', `${ICONS[icon] ? `<i style="width:1.2em;height:1.2em;display:inline-block">${ICONS[icon]}</i>` : ''}<b></b>${count ? `<span>${count}</span>` : ''}`); h.querySelector('b').textContent = text; body.appendChild(h); return h; };
const tap = (node, fn) => node.addEventListener('click', (e) => { e.stopPropagation(); fn(e); });

/** Opens the album sheet. */
export function openAlbum(G, first) {
  const { S, cfg, T, Cast, world, ui } = G, sv = S.save;
  ui.sheet('album', [{ id: 'friends', icon: 'paw' }, { id: 'toys', icon: 'toy' }, { id: 'hats', icon: 'hat' }, { id: 'stickers', icon: 'ribbon' }, { id: 'map', icon: 'map' }], (body, tab, redraw) => {
    const jobs = [];
    if (tab === 'friends') {
      head(body, 'paw', T('friends'), `${sv.neighbours.length + sv.friends.length}/${cfg.gardens.length + cfg.friends.length}`);
      const grid = el('div', 'grid'); body.appendChild(grid);
      for (const g of cfg.gardens) { const has = sv.neighbours.includes(g.id), c = el('div', 'cell' + (has ? '' : ' no')); grid.appendChild(c); jobs.push([c, () => pic(G, 'n_' + g.id, () => Cast.buildNeighbour(world, g.id), { yaw: 0.3, pitch: 0.12 })]); }
      for (const id of cfg.friends) {
        const has = sv.friends.includes(id), c = el('button', 'cell' + (has ? '' : ' no') + (sv.ride.includes(id) ? ' use' : '')); grid.appendChild(c); jobs.push([c, () => pic(G, 'f_' + id, () => Cast.buildFriend(world, id), { yaw: 0.6, pitch: 0.5 })]);
        if (has) tap(c, () => { sv.ride = sv.ride.includes(id) ? sv.ride.filter((x) => x !== id) : [...sv.ride, id].slice(-3); G.syncRiders(); G.audio.sfx('pop'); G.persist(); redraw(); });
      }
    } else if (tab === 'toys') {
      head(body, 'toy', T('toys'), `${sv.toys.length}/${cfg.toys.length}`);
      const grid = el('div', 'grid'); body.appendChild(grid);
      for (const id of cfg.toys) { const has = sv.toys.includes(id), gold = sv.golden.includes(id), c = el('div', 'cell' + (has ? '' : ' no') + (gold ? ' gold' : '')); grid.appendChild(c); jobs.push([c, () => pic(G, 't_' + id + (gold ? 'g' : ''), () => Cast.buildToy(world, id, gold), { yaw: 0.6, pitch: 0.45 })]); }
    } else if (tab === 'hats') {
      head(body, 'hat', T('hats'), `${sv.gifts.length}/${cfg.gifts.length}`);
      const grid = el('div', 'grid'); body.appendChild(grid);
      for (const id of ['straw', ...cfg.gifts]) {
        const has = id === 'straw' || sv.gifts.includes(id), on = id === 'straw' ? !sv.wear : sv.wear === id, c = el('button', 'cell' + (has ? '' : ' no') + (on ? ' use' : '')); grid.appendChild(c);
        jobs.push([c, () => pic(G, 'h_' + id, () => Cast.buildGift(world, id), { yaw: 0.4, pitch: 0.3 })]);
        if (has) tap(c, () => { sv.wear = id === 'straw' ? null : id; G.wear(sv.wear); G.audio.sfx('pop'); G.persist(); redraw(); });
      }
    } else if (tab === 'stickers') {
      head(body, 'ribbon', T('stickers'), `${sv.gardens.reduce((a, g) => a + (g ? g.rib.length : 0), 0)}`);
      for (const [n, g] of cfg.gardens.entries()) {
        const r = sv.gardens[n] || { stars: 0, rib: [] }, open = n <= sv.cur, c = el('div', 'card' + (open ? '' : ' no'), `<div class="mid"><div class="nm"></div><div class="pips" style="gap:calc(var(--u)*12);color:var(--coral)">${['gentle', 'style', 'flow'].map((k) => `<i style="width:calc(var(--u)*44);height:calc(var(--u)*44);background:none;opacity:${r.rib.includes(k) ? 1 : 0.2}">${ICONS.ribbon}</i>`).join('')}</div></div>`);
        c.style.opacity = open ? 1 : 0.5; c.querySelector('.nm').textContent = T('g_' + g.id); body.appendChild(c); jobs.push([c, () => { const f = G.face(n); f.style.cssText = 'width:calc(var(--u)*88);height:calc(var(--u)*88);border-radius:50%;flex:none;background:var(--paper)'; return f; }]);
      }
    } else {
      head(body, 'map', T('map'));
      const lane = el('div', 'lane'); body.appendChild(lane);
      for (const [n, g] of cfg.gardens.entries()) {
        const r = sv.gardens[n] || { stars: 0 }, open = n <= sv.cur, b = el('button', 'badge' + (open ? '' : ' no') + (n === S.cur ? ' cur' : ''), `<div class="st">${[0, 1, 2].map((i) => ICONS.star.replace('<svg', `<svg class="${i < r.stars ? 'on' : ''}"`)).join('')}</div><small></small>`);
        b.querySelector('small').textContent = T('g_' + g.id); lane.appendChild(b); jobs.push([b, () => (open ? G.face(n) : el('i', '', `<span style="display:block;width:calc(var(--u)*96);height:calc(var(--u)*96);padding:calc(var(--u)*24);box-sizing:border-box;opacity:.5">${ICONS.lock}</span>`))]);
        if (open) tap(b, () => G.travel(n, r.stars > 0 && r.stars < 3 && n !== S.cur));
      }
      if (G.daily) G.daily(body, el, tap);
    }
    lazy(G, jobs);
  }, first);
}

/** Opens the workshop sheet. */
export function openShop(G, first) {
  const { S, cfg, T, L, ui } = G, sv = S.save;
  ui.sheet('shop', [{ id: 'up', icon: 'tool' }, { id: 'look', icon: 'brush' }, { id: 'set', icon: 'gear' }], (body, tab, redraw) => {
    if (tab === 'up') {
      for (const kind of ['deck', 'engine', 'baler']) {
        const lv = sv.up[kind], price = L.upPrice(cfg, kind, lv), max = price === Infinity, can = sv.coins >= price;
        const c = el('div', 'card', `<div class="ic">${ICONS[kind]}</div><div class="mid"><div class="nm"></div><div class="pips">${Array.from({ length: cfg.upgrades.levels }, (_, i) => `<i class="${i < lv ? 'on' : ''}"></i>`).join('')}</div></div><button class="buy ${max ? 'done' : can ? '' : 'no'}">${max ? ICONS.check : `${ICONS.coin}<span class="num">${price}</span>`}</button>`);
        c.querySelector('.nm').textContent = T('up_' + kind); body.appendChild(c);
        tap(c.querySelector('button'), () => { if (G.buy(kind, false)) redraw(); else G.audio.sfx('oops'); });
      }
    } else if (tab === 'look') {
      const SW = { paint: { teal: ['#1f9c96', '#49c7b8'], coral: ['#e2644a', '#f59a7c'], sunflower: ['#e8a41f', '#f8d15a'], lilac: ['#9274d0', '#c1a8ee'], mint: ['#4fb787', '#93e0b4'], sky: ['#3f8fd8', '#86c2f2'], berry: ['#c2417e', '#ee86b0'], gold: ['#c9962a', '#f3d77a'] },
        tint: { classic: ['#8ac564', '#69aa4e'], mint: ['#9fd8a8', '#7cc08e'], clover: ['#7fc86a', '#5fae52'], goldtip: ['#b5cc5a', '#8fb04a'], lilac: ['#a8c898', '#8fb0a8'], sunset: ['#c8c070', '#a8a058'] },
        trail: { petals: ['#f3a0b8', '#fbd0dc'], daisies: ['#f1e6cf', '#f6b93b'], leaves: ['#86c85a', '#c9b245'], bubbles: ['#9fd8ee', '#e6f6fb'], stars: ['#f6b93b', '#fbe07a'], hearts: ['#e2533c', '#f3a0b8'] } };
      for (const [kind, from] of [['paint', 2], ['tint', 4], ['trail', 6]]) {
        const locked = sv.cur < from; head(body, locked ? 'lock' : null, T(kind));
        const g = el('div', 'sw'); g.style.opacity = locked ? 0.45 : 1; body.appendChild(g);
        for (const [id, price] of cfg.shop[kind]) {
          const own = sv.own[kind].includes(id), use = sv.use[kind] === id, c = SW[kind][id], b = el('button', use ? 'use' : '', `<small>${own ? (use ? ICONS.check : '') : `${ICONS.coin}${price}`}</small>`);
          b.style.background = kind === 'tint' ? `repeating-linear-gradient(90deg,${c[0]} 0 25%,${c[1]} 25% 50%)` : `linear-gradient(135deg,${c[0]} 0 55%,${c[1]} 55%)`; if (own && !use) b.querySelector('small').style.display = 'none';
          g.appendChild(b);
          tap(b, () => {
            if (locked) { G.audio.sfx('oops'); return; }
            if (!own) { if (sv.coins < price) { G.audio.sfx('oops'); return; } sv.coins -= price; S.shown = sv.coins; ui.setCoins(S.shown, true); sv.own[kind].push(id); G.audio.sfx('upgrade'); }
            sv.use[kind] = id; if (kind === 'paint') G.dressBuzzy(); if (kind === 'tint') G.retint(); G.audio.sfx('pop'); G.persist(); redraw();
          });
        }
      }
    } else {
      const row = el('div', 'set'); body.appendChild(el('h3', '', '&nbsp;')); body.appendChild(row);
      const tog = (icon, on, fn, label) => { const b = el('button', 'tab on' + (on ? '' : ' off'), ICONS[icon]); b.setAttribute('aria-label', label); row.appendChild(b); tap(b, () => { fn(); G.audio.sfx('click'); G.persist(); redraw(); }); };
      tog('snd', !sv.mute, () => { sv.mute = !sv.mute; G.audio.setMute(sv.mute); ui.setMute(sv.mute); }, T('sound'));
      tog('music', sv.music, () => { sv.music = !sv.music; G.audio.setMusic(sv.music); }, T('music'));
      tog('calm', sv.calm, () => { sv.calm = !sv.calm; }, T('calm'));
      tog('flip', sv.lefty, () => { sv.lefty = !sv.lefty; ui.setLefty(sv.lefty); }, T('lefty'));
      tog('redo', true, () => { sv.ftue = 0; sv.ftueDone = false; }, T('redo'));
      head(body, 'globe', T('lang'));
      const lg = el('div', 'langs'); body.appendChild(lg);
      const names = { en: 'English', ar: 'العربية', es: 'Español', vi: 'Tiếng Việt', hi: 'हिन्दी', bn: 'বাংলা', id: 'Indonesia' };
      for (const code of [null, ...G.LANGS]) { const b = el('button', (sv.lang || null) === code ? 'on' : ''); b.textContent = code ? names[code] : T('auto'); lg.appendChild(b); tap(b, () => { sv.lang = code; G.setLang(); G.audio.sfx('click'); G.persist(); redraw(); }); }
    }
  }, first);
}
