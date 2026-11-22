// PROTOTYPE - NOT FOR PRODUCTION
// The look of the menus in one place: the game's own icons (drawn here, so every phone shows the same shapes at the
// same size) and the small builders every panel and the in-play HUD are made of (one panel shell, one button system, one meter).
// Icons share one style: a 48 × 48 box, a thick dark outline with round corners, two or three flat colours.
// Nothing here touches the page or the game: every function returns a string of HTML.

const INK = '#2b1d4f';
const S = `stroke="${INK}" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round"`;
/** A line drawn twice: a dark wide one under a coloured narrow one (an outlined stroke). */
const line = (d, color, w = 3) => `<path d="${d}" fill="none" stroke="${INK}" stroke-width="${w + 5}" stroke-linecap="round" stroke-linejoin="round"/><path d="${d}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
/** A star-burst path around (24, 24): n points, outer radius R, inner radius r. */
const burst = (n, R, r, rot = 0) => { let d = ''; for (let i = 0; i < n * 2; i++) { const a = rot + Math.PI * i / n - Math.PI / 2, q = i % 2 ? r : R; d += `${i ? 'L' : 'M'}${(24 + Math.cos(a) * q).toFixed(1)} ${(24 + Math.sin(a) * q).toFixed(1)}`; } return d + 'z'; };

/** The drawings, by name: the six tools, the eight buildings and the panel furniture. */
export const ICONS = {
  // ---- tools
  hammer: `<g transform="rotate(42 24 24)"><rect x="20.5" y="17" width="7" height="28" rx="3.5" fill="#e0a25a" ${S}/><rect x="10" y="7" width="28" height="14" rx="4" fill="#9fabc0" ${S}/><path d="M14.5 11.5h19" fill="none" stroke="#e3e9f2" stroke-width="3" stroke-linecap="round"/></g>`,
  bomb: `${line('M33 14c1-6 4-8 8-6', '#e0a25a', 2.5)}<rect x="25.5" y="11" width="10" height="9" rx="2.5" transform="rotate(40 30.5 15.5)" fill="#8a93b4" ${S}/><circle cx="21" cy="30" r="14" fill="#454a6b" ${S}/><path d="M12 28a9.5 9.5 0 0 1 6-7" fill="none" stroke="#aab2d6" stroke-width="3.5" stroke-linecap="round"/><path d="${burst(4, 6, 2.6).replace(/(-?\d+\.?\d*) (-?\d+\.?\d*)/g, (m, x, y) => `${(+x + 16).toFixed(1)} ${(+y - 16).toFixed(1)}`)}" fill="#ffd23c" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/>`,
  rocket: `<g transform="rotate(45 24 24)"><path d="M24 47c-3.2-2-4.8-5.5-4.8-9h9.6c0 3.5-1.6 7-4.8 9z" fill="#ff9a2e" ${S}/><path d="M15.5 25l-7.5 8.5 1 6 7.5-3.5z" fill="#ff4d5e" ${S}/><path d="M32.5 25l7.5 8.5-1 6-7.5-3.5z" fill="#ff4d5e" ${S}/><path d="M24 1.500c7 6 9.5 15 8 36.500H16C14.5 16.5 17 7.5 24 1.500z" fill="#f4f7fb" ${S}/><path d="M24 1.500c3.2 2.7 5.3 6 6.6 10H17.400c1.3-4 3.4-7.3 6.6-10z" fill="#ff4d5e" ${S}/><circle cx="24" cy="21" r="4.5" fill="#5cc8ff" ${S}/></g>`,
  ball: `<rect x="12" y="2.5" width="24" height="7" rx="3" fill="#ffc531" ${S}/>${line('M24 10v9', '#c9d2de', 2)}<circle cx="24" cy="31.5" r="13.5" fill="#6f7f99" ${S}/><path d="M15 29a10 10 0 0 1 6-7" fill="none" stroke="#bcc8da" stroke-width="3.5" stroke-linecap="round"/><circle cx="24" cy="19" r="2.8" fill="#c9d2de" stroke="${INK}" stroke-width="2.5"/>`,
  hole: `<circle cx="24" cy="24" r="20" fill="#7f45f0" ${S}/><path d="M24 8.500A15.5 15.5 0 0 1 39.5 24M24 39.500A15.5 15.5 0 0 1 8.5 24" fill="none" stroke="#d2bcff" stroke-width="3.5" stroke-linecap="round"/><path d="M12.5 17.500A13 13 0 0 1 20 11.500M35.5 30.500A13 13 0 0 1 28 36.5" fill="none" stroke="#a983ff" stroke-width="3" stroke-linecap="round"/><circle cx="24" cy="24" r="9" fill="#1a1030" ${S}/><circle cx="21" cy="21" r="2" fill="#7f45f0"/>`,
  meteor: `<path d="M45.5 2.500C33 5.5 19 10 9.5 22.500l16 16C37 28.5 42 16 45.5 2.500z" fill="#ff8a1f" ${S}/><path d="M38.5 9.500c-8 3-15 7-20 14l7 7c6-5 10-12 13-21z" fill="#ffd23c"/><circle cx="17" cy="31" r="12" fill="#a8623a" ${S}/><circle cx="12.5" cy="28.5" r="2.6" fill="#7d4426"/><circle cx="20" cy="35.5" r="3.2" fill="#7d4426"/><circle cx="21.5" cy="26" r="1.8" fill="#7d4426"/>`,
  // ---- buildings
  cottage: `<rect x="10" y="22" width="28" height="21" rx="2" fill="#ffe2a8" ${S}/><path d="M4.5 24.500L24 5.500l19.5 19z" fill="#ff6a4d" ${S}/><rect x="20" y="30" width="8" height="13" rx="1.5" fill="#a8623a" ${S}/>`,
  candy: `<path d="M14 24L3.5 15.500v17z" fill="#ffd23c" ${S}/><path d="M34 24l10.5-8.500v17z" fill="#ffd23c" ${S}/><circle cx="24" cy="24" r="12" fill="#ff7ab8" ${S}/><path d="M17.5 24a6.5 6.5 0 0 1 13 0" fill="none" stroke="#fff" stroke-width="3.5" stroke-linecap="round"/>`,
  castle: `<path d="M7 43.500V14.500h7v5.500h6.500v-5.500h7v5.500H34v-5.500h7v29z" fill="#c9d2de" ${S}/><path d="M18.5 43.500V34a5.5 5.5 0 0 1 11 0v9.500z" fill="#7d4426" ${S}/><path d="M24 14.500V4l8 3.5-8 3.5" fill="#ff4d5e" ${S}/>`,
  lighthouse: `<path d="M16 43.500l3.5-27h9l3.5 27z" fill="#fff" ${S}/><path d="M18.2 26.500h11.600l.9 7H17.300z" fill="#ff4d5e" ${S}/><rect x="17.5" y="9.5" width="13" height="7" rx="1.5" fill="#ffd23c" ${S}/><path d="M15 9.500L24 3l9 6.500z" fill="#ff4d5e" ${S}/>`,
  factory: `<path d="M4.5 43.500V25l10 6v-6l10 6v-6l8.5 5V7.500h9.500v36z" fill="#ffb347" ${S}/><rect x="10" y="35" width="6" height="5" rx="1" fill="#5cc8ff" stroke="${INK}" stroke-width="2.5"/><rect x="21" y="35" width="6" height="5" rx="1" fill="#5cc8ff" stroke="${INK}" stroke-width="2.5"/><path d="M33 14h9.5" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>`,
  ice: `<path d="M5.5 43.500V28l6-9.5 6 9.500v-8.500L24 6l6.5 13.500V28l6-9.5 6 9.500v15.500z" fill="#bfeaff" ${S}/><path d="M24 15v9M11.5 27v6M36.5 27v6" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round"/><path d="M20 43.500V37a4 4 0 0 1 8 0v6.500z" fill="#5cc8ff" ${S}/>`,
  temple: `<path d="M4 43.500v-8.500h6.500v-8.500H17V18h6v-7.500h2V18h6v8.500h6.500V35H44v8.500z" fill="#d6bd7c" ${S}/><path d="M20.5 43.500V36h7v7.500z" fill="#5a3a1c" ${S}/><path d="M24 10.500c-5-1-7-4-7-7 4 0 7 2 7 7zc5-1 7-4 7-7-4 0-7 2-7 7z" fill="#4bd67c" ${S}/>`,
  space: `<path d="M5.5 43.500V34a18.5 18.5 0 0 1 37 0v9.500z" fill="#e6ecf4" ${S}/><circle cx="24" cy="31" r="6.5" fill="#5cc8ff" ${S}/><path d="M24 15.500V7" fill="none" ${S}/><circle cx="24" cy="5.5" r="3" fill="#ff4d5e" stroke="${INK}" stroke-width="2.5"/>`,
  unknown: `<circle cx="24" cy="24" r="19.5" fill="#dfe8f0" ${S}/><path d="M17.5 19a6.5 6.5 0 1 1 10 5.500c-2.3 1.5-3.5 2.8-3.5 5.5" fill="none" stroke="${INK}" stroke-width="4.5" stroke-linecap="round"/><circle cx="24" cy="36.5" r="2.8" fill="${INK}"/>`,
  // ---- panel furniture
  burst: `<path d="${burst(10, 22, 13.5)}" fill="#ff5a3c" ${S}/><path d="${burst(10, 14, 8, Math.PI / 10)}" fill="#ffd23c"/>`,
  close: `<path d="M13 13l22 22M35 13L13 35" fill="none" stroke="${INK}" stroke-width="7" stroke-linecap="round"/>`,
  lock: `${line('M16 22v-6.500a8 8 0 0 1 16 0V22', '#c9d2de', 3.5)}<rect x="9.5" y="21" width="29" height="22.5" rx="5.5" fill="#ffc531" ${S}/><circle cx="24" cy="30.5" r="3.2" fill="${INK}"/><path d="M24 31v6" fill="none" stroke="${INK}" stroke-width="3.5" stroke-linecap="round"/>`,
  soundOn: `<path d="M5.5 18.500h8.500l10-9v29l-10-9H5.500z" fill="#5cc8ff" ${S}/><path d="M31 17a9.5 9.5 0 0 1 0 14M36.5 10.500a18 18 0 0 1 0 27" fill="none" ${S}/>`,
  soundOff: `<path d="M5.5 18.500h8.500l10-9v29l-10-9H5.500z" fill="#c9d2de" ${S}/>${line('M31.5 18.500l11 11M42.5 18.500l-11 11', '#ff4d5e', 3.5)}`,
  calendar: `<rect x="6" y="9" width="36" height="33.5" rx="6" fill="#fff" ${S}/><path d="M6 19.500V15a6 6 0 0 1 6-6h24a6 6 0 0 1 6 6v4.500z" fill="#ff4d5e" ${S}/><path d="M15.5 4.500v8M32.5 4.500v8" fill="none" ${S}/><path d="${burst(5, 8, 3.6).replace(/(-?\d+\.?\d*) (-?\d+\.?\d*)/g, (m, x, y) => `${x} ${(+y + 7).toFixed(1)}`)}" fill="#ffd23c" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/>`,
  plane: `<path d="M4 21.500L44.5 4.5 33 43.5 21.5 29z" fill="#fff" ${S}/><path d="M44.5 4.500L21.5 29v11.500l6.5-7" fill="#bfe6ff" ${S}/>`,
  gear: `${[0, 45, 90, 135, 180, 225, 270, 315].map((a) => `<rect x="19.5" y="2.5" width="9" height="11" rx="2.5" transform="rotate(${a} 24 24)" fill="#8fa3bd" ${S}/>`).join('')}<circle cx="24" cy="24" r="14.5" fill="#8fa3bd" ${S}/><circle cx="24" cy="24" r="5.5" fill="#fff" ${S}/>`,
  play: `<path d="M13.5 6.500l26 17.5-26 17.500z" fill="#fff" ${S}/>`,
  up: `<path d="M24 4.500l16.5 17.500H30.500v21.500h-13V22H7.500z" fill="#fff" ${S}/>`,
  check: line('M9.5 25.500l9.5 9.5 19.5-21.5', '#3ccf6f', 5),
  arrow: `<path d="M6 24h32M27 12l12 12-12 12" fill="none" stroke="${INK}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>`,
  globe: `<circle cx="24" cy="24" r="19.5" fill="#5cc8ff" ${S}/><ellipse cx="24" cy="24" rx="8.5" ry="19.5" fill="none" ${S}/><path d="M4.5 24h39" fill="none" ${S}/>`,
  book: `<path d="M24 11.500C18 7.5 11 7.5 5 10v30c6-2.5 13-2.5 19 1.500z" fill="#fff" ${S}/><path d="M24 11.500c6-4 13-4 19-1.500v30c-6-2.5-13-2.5-19 1.500z" fill="#ffd23c" ${S}/><path d="M10.5 19c3-.8 6-.6 8.5.500M10.5 27c3-.8 6-.6 8.5.5" fill="none" stroke="#8fa3bd" stroke-width="3" stroke-linecap="round"/>`,
  size: `<circle cx="24" cy="24" r="19.5" fill="#ffe2b8" stroke="${INK}" stroke-width="3.5" stroke-dasharray="7 6.5" stroke-linecap="round"/><circle cx="24" cy="24" r="8.5" fill="#ff8a1f" ${S}/>`,
  clock: `<circle cx="24" cy="24" r="19.5" fill="#fff" ${S}/><path d="M24 12.500V24l8 5" fill="none" ${S}/>`,
  // ---- HUD furniture: the smash-time stopwatch, the boss crown, the pointing hand, the thumbs-up, the mouse
  timer: `<rect x="19.5" y="2.5" width="9" height="8" rx="2.5" fill="#ff4d5e" ${S}/><path d="M37 12.5l3-3" fill="none" ${S}/><circle cx="24" cy="27.5" r="16.5" fill="#fff" ${S}/><path d="M24 17.5v10l6.5 4" fill="none" ${S}/>`,
  crown: `<path d="M7 37.5L4.5 13.5l11 9.5L24 6.5l8.5 16.5 11-9.5L41 37.5z" fill="#ffd23c" ${S}/><rect x="6.5" y="35" width="35" height="8.5" rx="3" fill="#ff9a2e" ${S}/><circle cx="24" cy="26.5" r="3" fill="#ff4d5e" stroke="${INK}" stroke-width="2.5"/>`,
  hand: `<path d="M10.5 9.5a4.5 4.5 0 0 1 9 0V21h14a5 5 0 0 1 5 5v8.5a9.5 9.5 0 0 1-9.5 9.5H20a9.5 9.5 0 0 1-9.5-9.5z" fill="#fff" ${S}/><path d="M26.5 21.5v6M32.5 21.5v6" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round"/><path d="M13.5 37.5h22" fill="none" stroke="#ffc531" stroke-width="4" stroke-linecap="round"/>`,
  thumb: `<rect x="4.5" y="21" width="10.5" height="22.5" rx="3" fill="#5cc8ff" ${S}/><path d="M15 22.5l7-15.5a4.5 4.5 0 0 1 8 3.5l-2 8.5h10.5a4.5 4.5 0 0 1 4.4 5.5l-3 14a6 6 0 0 1-5.9 4.7H15z" fill="#ffd23c" ${S}/>`,
  mouse: `<rect x="11.5" y="4.5" width="25" height="39" rx="12.5" fill="#fff" ${S}/><path d="M11.5 20v-3A12.5 12.5 0 0 1 24 4.5V20z" fill="#5cc8ff" ${S}/><path d="M11.5 20h25" fill="none" ${S}/>`,
};

/** One icon as inline SVG; cls adds classes (a size, "flip" to mirror it in right-to-left). */
export const icon = (name, cls = '') => `<svg class="ico${cls ? ' ' + cls : ''}" viewBox="0 0 48 48" aria-hidden="true" focusable="false">${ICONS[name] || ICONS.unknown}</svg>`;
/** The coin (drawn in CSS). */
export const COIN = '<i class="coin"></i>';

/**
 * The one panel shell: a header (a title or tabs at the start, the close button always in the far corner, which is
 * the left one in right-to-left) over a body. `still` skips the entrance (the panel is already open).
 */
export const panel = ({ head, body, closeId, cls = '', still = false }) => `<div class="card pcard${cls ? ' ' + cls : ''}${still ? ' still' : ''}"><div class="phead">${head}<button id="${closeId}" class="btn ibtn px" aria-label="close">${icon('close')}</button></div><div class="pbody">${body}</div></div>`;
/** A panel title for the header. */
export const title = (text, ic) => `<div class="ptitle">${ic ? icon(ic) : ''}<span class="tx">${text}</span></div>`;
/** The coins in hand, for a panel's header. */
export const balance = (text) => `<span class="pbal">${COIN}<b>${text}</b></span>`;
/** Tabs for the header: [{ id, icon, text, on }]. */
export const tabs = (list) => `<div class="tabs">${list.map((t) => `<button class="btn tab${t.on ? ' on' : ''}" data-tab="${t.id}">${icon(t.icon)}<span class="tx">${t.text}</span></button>`).join('')}</div>`;
/** The primary button: one per screen. `after` is HTML behind the words (an arrow). */
export const primary = (id, text, after = '') => `<button id="${id}" class="btn pri out"><span class="tx">${text}</span>${after}</button>`;
/** A secondary button: quiet, its icon above its words. */
export const secondary = (id, ic, text, cls = '') => `<button id="${id}" class="btn sec${cls ? ' ' + cls : ''}">${icon(ic)}<span class="tx">${text}</span></button>`;
/**
 * A meter: icon + label at the start, a value at the end, a bar under them. `marks` are things standing on the bar
 * ([{ at: 0..1, html }]), e.g. the two trophies of the wreck figure.
 */
export const meter = ({ ic, label, value, part, marks = null, cls = '' }) => `<div class="meter tile${cls ? ' ' + cls : ''}"><div class="mhead">${icon(ic)}<span class="mlab">${label}</span><span class="mval">${value}</span></div><div class="track${marks ? ' marks' : ''}"><b style="width:${Math.round(Math.max(0, Math.min(1, part)) * 100)}%"></b>${marks || ''}</div></div>`;
/** One "now → next" line: a stat icon, the value now and (when there is one) the value after the upgrade. */
export const change = (ic, now, next) => `<span class="fx">${ic[0] === '<' ? ic : icon(ic)}<b dir="ltr">${now}</b>${next != null && next !== now ? `${icon('arrow', 'flip')}<b class="nx" dir="ltr">${next}</b>` : ''}</span>`;
