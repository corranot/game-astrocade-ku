// PROTOTYPE - NOT FOR PRODUCTION
// Snip It screen parts: the small HUD over the stage. Words come from the string table; almost everything is an icon.
// Three flex zones lay themselves out from the spacing tokens in index.html (--m, --g, --h): the top row, the
// centred column under it, and the bar after a win. Every word sits in a [data-fit] box and shrinks to fit it.

const STAR = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 1.8l3 6.5 7.1.8-5.3 4.8 1.5 7L12 17.3l-6.3 3.6 1.5-7L1.9 9.1 9 8.3z" fill="#ffb300" stroke="#b87400" stroke-width="1.3" stroke-linejoin="round"/></svg>';

export const HTML = `
<canvas id="cv"></canvas>
<div id="hud" class="hud">
  <div class="top">
    <div id="lvl" class="pill gloss"><b id="lvlN" class="num">1</b><i class="ic">${STAR}</i><b id="starN" class="num">0</b></div>
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
  const again = (el) => { el.classList.remove('in'); void el.offsetWidth; el.classList.add('in'); };
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
    muteIcon(muted) { $('mute').firstElementChild.textContent = muted ? '🔇' : '🔊'; },
    clear() { clearTimeout(toastTimer); clearTimeout(cheerTimer); },
  };
}
