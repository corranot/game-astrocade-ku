// PROTOTYPE - NOT FOR PRODUCTION
// Snip It screen parts: the small HUD over the stage. Words come from the string table; almost everything is an icon.
// All sizes are in frame units (--u = frame width / 720), set by the game on resize.

export const HTML = `
<canvas id="cv"></canvas>
<div id="hud" class="hud">
  <div id="lvl" class="pill gloss"><b id="lvlN">1</b><i class="star">★</i><b id="starN">0</b></div>
  <button id="book" class="pill gloss" aria-label="stickers"><i>🎭</i><b id="gagN">0</b></button>
  <button id="mute" class="round gloss" aria-label="sound">🔊</button>
  <div id="prompt" class="prompt out"></div>
  <div id="hand" class="hand" hidden>👆</div>
  <div id="toast" class="toast gloss" hidden><i id="toastI"></i><b id="toastT"></b></div>
  <div id="cheer" class="cheer out" hidden></div>
  <div id="bar" class="bar" hidden>
    <div class="got gloss"><span id="barStars">★★★</span><span id="barGags"></span></div>
    <div class="btns">
      <button id="again" class="again gloss" aria-label="again"><i>↻</i><b id="againT"></b></button>
      <button id="next" class="next" aria-label="next"><b id="nextT"></b><i id="nextI">▶</i></button>
    </div>
  </div>
</div>`;

/** Handles to the HUD inside `root`, with the few things the game changes. */
export function createUi(root) {
  const $ = (id) => root.querySelector('#' + id);
  let toastTimer = 0, cheerTimer = 0;
  return {
    $,
    /** Top row: level number (1-based) of total, stars and stickers found. */
    top(level, total, stars, gags) { $('lvlN').textContent = level + '/' + total; $('starN').textContent = String(stars); $('gagN').textContent = String(gags); },
    /** The words under the top row, shrunk until they fit one line; '' hides them. */
    prompt(text) { const p = $('prompt'); p.textContent = text; p.hidden = !text; p.style.setProperty('--k', '1'); if (text && p.scrollWidth > p.clientWidth) p.style.setProperty('--k', String(Math.max(0.4, p.clientWidth / p.scrollWidth * 0.97))); p.classList.remove('in'); void p.offsetWidth; p.classList.add('in'); },
    /** Fits the words again (the frame or the font changed). */
    refit() { const p = $('prompt'); if (!p.hidden) this.prompt(p.textContent); },
    /** The swipe hint over frame point (x, y); null hides it. */
    hand(at) { const h = $('hand'); h.hidden = !at; if (at) { h.style.left = `calc(var(--u)*${at[0]}px)`; h.style.top = `calc(var(--u)*${at[1]}px)`; } },
    /** A sticker card that pops in near the top and leaves by itself. */
    toast(icon, text) { const t = $('toast'); $('toastI').textContent = icon; $('toastT').textContent = text; t.hidden = false; t.classList.remove('in'); void t.offsetWidth; t.classList.add('in'); clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.hidden = true; }, 1700); },
    cheer(text) { const c = $('cheer'); c.textContent = text; c.hidden = false; c.classList.remove('in'); void c.offsetWidth; c.classList.add('in'); clearTimeout(cheerTimer); cheerTimer = setTimeout(() => { c.hidden = true; }, 1100); },
    /** The bottom bar after a win: words for the buttons, stickers found in this level as shown icons. */
    bar(show, words, found, rtl) {
      const b = $('bar'); b.hidden = !show; if (!show) return;
      $('nextT').textContent = words.next; $('againT').textContent = words.again; $('nextI').textContent = rtl ? '◀' : '▶';
      $('barGags').textContent = found.map((f) => (f.got ? f.icon : '❔')).join(' ');
    },
    muteIcon(muted) { $('mute').textContent = muted ? '🔇' : '🔊'; },
    clear() { clearTimeout(toastTimer); clearTimeout(cheerTimer); },
  };
}
