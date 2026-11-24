// PROTOTYPE - NOT FOR PRODUCTION
// Snip It screen parts: the small HUD over the stage. Words come from the string table; almost everything is an icon.
// Three flex zones lay themselves out from the spacing tokens in index.html (--m, --g, --h): the top row, the
// centred column under it, and the bar after a win. Every word sits in a [data-fit] box and shrinks to fit it.

const STAR = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 1.8l3 6.5 7.1.8-5.3 4.8 1.5 7L12 17.3l-6.3 3.6 1.5-7L1.9 9.1 9 8.3z" fill="#ffb300" stroke="#b87400" stroke-width="1.3" stroke-linejoin="round"/></svg>';

export const HTML = `
<canvas id="cv"></canvas>
<div id="hud" class="hud">
  <div class="top">
    <button id="lvl" class="pill gloss" aria-label="levels"><b id="lvlN" class="num">1</b><i class="ic">${STAR}</i><b id="starN" class="num">0</b></button>
    <span class="grow"></span>
    <button id="book" class="pill gloss" aria-label="stickers"><i class="ic">🎭</i><b id="gagN" class="num">0</b></button>
    <button id="mute" class="pill sq gloss" aria-label="sound"><i class="ic">🔊</i></button>
  </div>
  <div class="mid">
    <div id="prompt" class="prompt out" data-fit></div>
    <div class="slot"><div id="toast" class="toast gloss" hidden><i id="toastI" class="ic"></i><b id="toastT" data-fit></b></div></div>
  </div>
  <div id="hand" class="hand" hidden>👆</div>
  <div id="cheer" class="cheer out" data-fit hidden></div>
  <div id="bar" class="bar" hidden>
    <div class="got gloss"><span id="barStars" class="set"><i class="ic">${STAR}</i><i class="ic">${STAR}</i><i class="ic">${STAR}</i></span><span id="barGags" class="set"></span></div>
    <div class="btns">
      <button id="again" class="again gloss" aria-label="again"><i class="ic">↻</i><b id="againT" data-fit></b></button>
      <button id="next" class="next" aria-label="next"><b id="nextT" data-fit></b><i id="nextI" class="ic">▶</i></button>
    </div>
  </div>
  <div id="sheet" class="sheet" hidden><div class="panel gloss">
    <div class="head"><i id="sheetI" class="ic"></i><b id="sheetT" class="num"></b><span class="grow"></span><button id="close" class="pill sq gloss" aria-label="close"><i class="ic">✕</i></button></div>
    <div id="sheetB" class="body"></div>
  </div></div>
</div>`;

/** Shrinks the words of a [data-fit] box until they fit on one line (never below half size). */
export function fit(el) {
  if (!el || el.hidden || !el.clientWidth) return;
  let k = 1; el.style.setProperty('--k', '1');
  for (let i = 0; i < 4 && el.scrollWidth > el.clientWidth + 0.5 && k > 0.5; i++) { k = Math.max(0.5, k * el.clientWidth / el.scrollWidth * 0.98); el.style.setProperty('--k', String(k)); }
}

/** Handles to the HUD inside `root`, with the few things the game changes. */
export function createUi(root) {
  const $ = (id) => root.querySelector('#' + id);
  let toastTimer = 0, cheerTimer = 0;
  const again = (e) => { e.classList.remove('in'); void e.offsetWidth; e.classList.add('in'); };
  const el = (tag, cls, text) => { const e = document.createElement(tag); e.className = cls; if (text !== undefined) e.textContent = text; return e; };
  return {
    $,
    /** Top row: level number (1-based) of total, stars and stickers found. */
    top(level, total, stars, gags) { $('lvlN').textContent = level + '/' + total; $('starN').textContent = String(stars); $('gagN').textContent = String(gags); },
    /** The words under the top row, shrunk until they fit one line; '' hides them. */
    prompt(text) { const p = $('prompt'); p.textContent = text; p.hidden = !text; fit(p); again(p); },
    /** Fits every word again (the frame, the font or the language changed). */
    refit() { root.querySelectorAll('[data-fit]').forEach(fit); },
    /** The swipe hint over frame point (x, y); null hides it. */
    hand(at) { const h = $('hand'); h.hidden = !at; if (at) { h.style.left = `calc(var(--u)*${at[0]}px)`; h.style.top = `calc(var(--u)*${at[1]}px)`; } },
    /** A sticker card that pops in under the words and leaves by itself. */
    toast(icon, text) { const t = $('toast'); $('toastI').textContent = icon; $('toastT').textContent = text; t.hidden = false; fit($('toastT')); again(t); clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.hidden = true; }, 1700); },
    cheer(text) { const c = $('cheer'); c.textContent = text; c.hidden = false; fit(c); again(c); clearTimeout(cheerTimer); cheerTimer = setTimeout(() => { c.hidden = true; }, 1100); },
    /** The bar after a win: words for the buttons, stickers found in this level as icons (❔ for the rest). */
    bar(show, words, found, rtl) {
      const b = $('bar'); b.hidden = !show; if (!show) return;
      $('nextT').textContent = words.next; $('againT').textContent = words.again; $('nextI').textContent = rtl ? '◀' : '▶';
      const gags = $('barGags'); gags.textContent = '';
      for (const f of found) { const i = document.createElement('i'); i.className = 'ic'; i.textContent = f.got ? f.icon : '❔'; gags.appendChild(i); }
      fit($('nextT')); fit($('againT'));
    },
    /**
     * The level map: a row per world, a button per level. worlds: [{ icon, levels: [{ n, stars, open, here }] }];
     * pick(n) is called with the level number (1-based) of an open level that was tapped.
     */
    map(worlds, starsTotal, pick) {
      $('sheetI').innerHTML = STAR; $('sheetT').textContent = String(starsTotal);
      const body = $('sheetB'); body.textContent = ''; body.className = 'body';
      for (const w of worlds) {
        const row = el('div', 'wrow'); row.appendChild(el('i', 'wic', w.icon));
        for (const l of w.levels) {
          const b = el('button', 'lv gloss' + (l.open ? '' : ' lock') + (l.here ? ' here' : '')); b.dataset.n = String(l.n);
          b.appendChild(el('b', 'num', l.open ? String(l.n) : '🔒'));
          const st = el('span', 'st'); for (let i = 0; i < 3; i++) { const s = el('i', 'ic' + (i < l.stars ? '' : ' off')); s.innerHTML = STAR; st.appendChild(s); } b.appendChild(st);
          if (l.open) b.addEventListener('click', (e) => { e.stopPropagation(); pick(l.n); });
          row.appendChild(b);
        }
        body.appendChild(row);
      }
      $('sheet').hidden = false;
      const here = body.querySelector('.here'); if (here) here.scrollIntoView({ block: 'center' });
    },
    /** The sticker book: a row per world with every sticker of its levels, found or not. worlds: [{ icon, stickers: [{ icon, got }] }]. */
    book(worlds, found, total) {
      $('sheetI').textContent = '🎭'; $('sheetT').textContent = found + '/' + total;
      const body = $('sheetB'); body.textContent = ''; body.className = 'body';
      for (const w of worlds) {
        const row = el('div', 'wrow w-book'); row.appendChild(el('i', 'wic', w.icon));
        const slots = el('div', 'slots'); for (const s of w.stickers) slots.appendChild(el('i', 'stk' + (s.got ? '' : ' no'), s.got ? s.icon : '❔'));
        row.appendChild(slots); body.appendChild(row);
      }
      $('sheet').hidden = false; body.scrollTop = 0;
    },
    closeSheet() { $('sheet').hidden = true; },
    muteIcon(muted) { $('mute').firstElementChild.textContent = muted ? '🔇' : '🔊'; },
    /** Takes the sticker card and the cheer off at once (a new level starts). */
    wipe() { clearTimeout(toastTimer); clearTimeout(cheerTimer); $('toast').hidden = true; $('cheer').hidden = true; },
    clear() { clearTimeout(toastTimer); clearTimeout(cheerTimer); },
  };
}
