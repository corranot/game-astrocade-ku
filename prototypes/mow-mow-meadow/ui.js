// PROTOTYPE - NOT FOR PRODUCTION
// HUD and overlays, drawn as garden stationery (cream paper, dark teal ink, coral for the one thing to press).
// Grid in 720-wide design units (--u): margin 32 plus the safe area, one height of 80 for every pill and button,
// gaps of 16, icons 48, one number size. Top row: coin pill, progress pill, then the button column on the same
// margin. Nothing sits in the bottom half during play. The layer ignores touches except on its buttons.

const I = {
  coin: '<svg viewBox="0 0 48 48"><circle cx="24" cy="24" r="20" fill="#f6b93b" stroke="#b97f1c" stroke-width="4"/><circle cx="24" cy="24" r="12" fill="none" stroke="#fbe08e" stroke-width="4"/><path d="M24 15c-5 3-5 12 0 18 5-6 5-15 0-18z" fill="#fff3c4"/></svg>',
  star: '<svg viewBox="0 0 48 48"><path d="M24 4l6.2 12.6 13.8 2-10 9.8 2.4 13.8L24 35.6 11.6 42.2 14 28.4 4 18.6l13.8-2z" stroke-width="4" stroke-linejoin="round"/></svg>',
  book: '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"><path d="M24 12c-4-3-10-4-16-3v27c6-1 12 0 16 3 4-3 10-4 16-3V9c-6-1-12 0-16 3zM24 12v27"/></svg>',
  tool: '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"><path d="M30 8a9 9 0 0 0-8.6 11.8L8 33.2a4.8 4.8 0 0 0 6.8 6.8l13.4-13.4A9 9 0 0 0 40 18l-6 6-6-2-2-6 6-6c-.7-1.3-1.3-2-2-2z"/></svg>',
  snd: '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"><path d="M8 19v10h7l9 8V11l-9 8z" fill="currentColor"/><path class="w" d="M31 17c3 4 3 10 0 14M36 12c6 7 6 17 0 24"/><path class="x" d="M31 19l10 10M41 19L31 29"/></svg>',
  x: '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="5.5" stroke-linecap="round"><path d="M13 13l22 22M35 13L13 35"/></svg>',
  hand: '<svg viewBox="0 0 64 64"><path d="M24 30V12a5 5 0 0 1 10 0v14l12 3a7 7 0 0 1 5 8l-2 12a9 9 0 0 1-9 7H30a9 9 0 0 1-7-4L12 38a4.5 4.5 0 0 1 7-5z" fill="#fff6e3" stroke="#1f4f4a" stroke-width="4" stroke-linejoin="round"/></svg>',
  map: '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 12l12-4 12 4 12-4v28l-12 4-12-4-12 4zM18 8v28M30 12v28"/></svg>',
  lock: '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"><rect x="10" y="21" width="28" height="20" rx="5" fill="currentColor"/><path d="M16 21v-6a8 8 0 0 1 16 0v6"/></svg>',
  share: '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"><path d="M24 30V8M15 16l9-9 9 9M10 26v12h28V26"/></svg>',
  check: '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"><path d="M10 25l10 10 18-22"/></svg>',
  deck: '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="18" width="36" height="14" rx="7"/><path d="M2 25h4M42 25h4M12 12l-4-4M36 12l4-4"/></svg>',
  engine: '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"><path d="M27 5L11 27h11l-3 16 18-24H25z"/></svg>',
  baler: '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="24" cy="24" r="17"/><circle cx="24" cy="24" r="9"/><circle cx="24" cy="24" r="2" fill="currentColor"/></svg>',
  gear: '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="24" cy="24" r="7"/><path d="M24 5v6M24 37v6M5 24h6M37 24h6M10.5 10.5l4.3 4.3M33.2 33.2l4.3 4.3M10.5 37.5l4.3-4.3M33.2 14.8l4.3-4.3"/></svg>',
  hat: '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 30c0-10 4-18 12-18s12 8 12 18"/><ellipse cx="24" cy="31" rx="20" ry="6"/></svg>',
  paw: '<svg viewBox="0 0 48 48" fill="currentColor"><ellipse cx="24" cy="31" rx="11" ry="9"/><circle cx="10" cy="20" r="5"/><circle cx="19" cy="11" r="5"/><circle cx="30" cy="11" r="5"/><circle cx="39" cy="20" r="5"/></svg>',
  toy: '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="24" cy="24" r="17"/><path d="M8 20c10 6 22 6 32 0M24 7c-6 10-6 24 0 34"/></svg>',
  ribbon: '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="24" cy="18" r="11"/><path d="M17 27l-4 15 11-6 11 6-4-15"/></svg>',
  brush: '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"><path d="M40 7L21 26l5 5L43 10z" fill="currentColor"/><path d="M19 28c-6 0-8 4-8 8 0 3-3 4-5 4 3 3 16 4 18-7z" fill="currentColor"/></svg>',
  sun: '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="4.5" stroke-linecap="round"><circle cx="24" cy="24" r="8" fill="currentColor"/><path d="M24 5v5M24 38v5M5 24h5M38 24h5M11 11l3.5 3.5M33.5 33.5L37 37M11 37l3.5-3.5M33.5 14.5L37 11"/></svg>',
  music: '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 34V12l20-4v22"/><circle cx="13" cy="34" r="5" fill="currentColor"/><circle cx="33" cy="30" r="5" fill="currentColor"/></svg>',
  calm: '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 18c6-6 12 6 18 0s12 6 18 0M6 30c6-6 12 6 18 0s12 6 18 0"/></svg>',
  globe: '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="4.5" stroke-linecap="round"><circle cx="24" cy="24" r="18"/><path d="M6 24h36M24 6c-8 10-8 26 0 36M24 6c8 10 8 26 0 36"/></svg>',
  flip: '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"><path d="M8 16h30l-7-7M40 32H10l7 7"/></svg>',
  redo: '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"><path d="M38 24a14 14 0 1 1-5-10.7M38 8v9h-9"/></svg>',
};
export const ICONS = I;

const CSS = `
#app{--u:.5px;--ink:#1f4f4a;--paper:#fff6e3;--edge:#e9d7ad;--coral:#e9795b;--gold:#f6b93b;--leaf:#7cc25a;--m:calc(var(--u)*32);--h:calc(var(--u)*80);--g:calc(var(--u)*16);
 --st:calc(var(--m) + env(safe-area-inset-top,0px));--sb:calc(var(--m) + env(safe-area-inset-bottom,0px));--sl:calc(var(--m) + env(safe-area-inset-left,0px));--sr:calc(var(--m) + env(safe-area-inset-right,0px));
 font-family:"Baloo 2","Arial Rounded MT Bold","Nunito","Varela Round","Noto Sans","Noto Sans Arabic","Noto Sans Devanagari","Noto Sans Bengali",system-ui,sans-serif;font-weight:800;color:var(--ink)}
.hud{position:absolute;inset:0;pointer-events:none;overflow:hidden}
.hud button{pointer-events:auto;cursor:pointer;font:inherit;color:inherit;border:0;padding:0;margin:0;-webkit-tap-highlight-color:transparent;touch-action:manipulation}
.hud svg{display:block}
.paper{background:linear-gradient(#fffaf0,var(--paper));border:calc(var(--u)*4) solid var(--edge);box-shadow:0 calc(var(--u)*6) 0 rgba(31,79,74,.28),0 calc(var(--u)*12) calc(var(--u)*24) rgba(31,79,74,.18);box-sizing:border-box}
.row{position:absolute;top:var(--st);left:50%;width:min(100%,calc(var(--u)*720));transform:translateX(-50%);height:var(--h);box-sizing:border-box;padding:0 var(--sr) 0 var(--sl);display:flex;gap:var(--g);align-items:flex-start}
.pill{height:var(--h);border-radius:calc(var(--u)*40);display:flex;align-items:center;gap:calc(var(--u)*8);padding:0 calc(var(--u)*20) 0 calc(var(--u)*12);flex:none}
.pill>svg,.pill>i{width:calc(var(--u)*48);height:calc(var(--u)*48);flex:none}
.num{font-size:calc(var(--u)*38);line-height:1;font-variant-numeric:tabular-nums;direction:ltr;letter-spacing:0}
.coins{min-width:calc(var(--u)*168)}
.coins.bump,.btn.bump,.prog.bump{animation:bump .3s ease-out}
.prog{flex:1;min-width:0;padding:0 calc(var(--u)*20) 0 calc(var(--u)*20);gap:calc(var(--u)*12)}
.bar{position:relative;flex:1;margin-inline-end:calc(var(--u)*16);height:calc(var(--u)*24);border-radius:calc(var(--u)*12);background:#dfe9c8;box-shadow:inset 0 calc(var(--u)*3) 0 rgba(31,79,74,.18)}
.bar b{position:absolute;left:0;top:0;bottom:0;width:0;border-radius:inherit;background:repeating-linear-gradient(90deg,#8ccb62 0 calc(var(--u)*16),#74b84e calc(var(--u)*16) calc(var(--u)*32));transition:width .25s ease-out}
.bar i{position:absolute;top:50%;width:calc(var(--u)*36);height:calc(var(--u)*36);margin:calc(var(--u)*-18);fill:#fff6e3;stroke:#b9c59a;transition:fill .2s,stroke .2s}
.bar i svg{width:100%;height:100%}
.bar i.on{fill:var(--gold);stroke:#b97f1c;animation:stamp .45s ease-out}
.pct{min-width:calc(var(--u)*88);text-align:end}
.col{display:flex;flex-direction:column;gap:var(--g);flex:none}
.btn{width:var(--h);height:var(--h);border-radius:50%;display:grid;place-items:center;position:relative;transition:transform .08s,opacity .2s}
.btn svg{width:calc(var(--u)*48);height:calc(var(--u)*48)}
.btn:active{transform:translateY(calc(var(--u)*4))}
.btn[hidden]{display:none}
.btn em{position:absolute;top:calc(var(--u)*-6);inset-inline-end:calc(var(--u)*-6);width:calc(var(--u)*24);height:calc(var(--u)*24);border-radius:50%;background:var(--coral);border:calc(var(--u)*4) solid var(--paper);display:none}
.btn.dot em{display:block;animation:pulse 1.2s ease-in-out infinite}
.mute .x{display:none}.mute.off .w{display:none}.mute.off .x{display:block}
.skip{position:absolute;top:calc(var(--st) + var(--h) + var(--g));inset-inline-start:var(--sl)}
.row2{position:absolute;top:calc(var(--st) + var(--h) + var(--g));left:50%;transform:translateX(-50%);max-width:calc(100% - var(--h)*2 - var(--g)*2 - var(--sl) - var(--sr));pointer-events:none}
.chip{height:var(--h);border-radius:calc(var(--u)*40);display:flex;align-items:center;gap:calc(var(--u)*12);padding:0 calc(var(--u)*24) 0 calc(var(--u)*12);font-size:calc(var(--u)*30);white-space:nowrap;animation:drop .22s cubic-bezier(.3,1.5,.5,1)}
.chip.out{animation:lift .16s ease-in forwards}
.chip canvas,.chip svg{width:calc(var(--u)*56);height:calc(var(--u)*56);flex:none}
.stick{position:absolute;width:calc(var(--u)*176);height:calc(var(--u)*176);margin:calc(var(--u)*-88);border-radius:50%;border:calc(var(--u)*5) solid rgba(255,246,227,.75);background:rgba(31,79,74,.14);box-sizing:border-box;opacity:0;transition:opacity .12s}
.stick.on{opacity:1}
.stick i{position:absolute;left:50%;top:50%;width:calc(var(--u)*72);height:calc(var(--u)*72);margin:calc(var(--u)*-36);border-radius:50%;background:radial-gradient(circle at 40% 35%,#fffaf0,#e9d7ad);box-shadow:0 0 0 calc(var(--u)*4) rgba(31,79,74,.6)}
.fly{position:absolute;left:0;top:0;width:calc(var(--u)*44);height:calc(var(--u)*44);margin:calc(var(--u)*-22);will-change:transform;display:none}
.fly svg{width:100%;height:100%}
.ft{position:absolute;left:0;top:0;font-size:calc(var(--u)*40);color:#fff6e3;-webkit-text-stroke:calc(var(--u)*7) var(--ink);paint-order:stroke fill;white-space:nowrap;transform:translate(-50%,-50%);animation:rise .9s ease-out forwards;display:flex;align-items:center;gap:calc(var(--u)*6)}
.ft svg{width:calc(var(--u)*40);height:calc(var(--u)*40)}
.barsT,.barsB{position:absolute;left:0;right:0;height:9%;background:#17332f;transform:scaleY(0);transition:none}
.barsT{top:0;transform-origin:50% 0}.barsB{bottom:0;transform-origin:50% 100%}
.spot{position:absolute;inset:0;opacity:0;transition:opacity .2s;background:radial-gradient(circle at var(--sx,50%) var(--sy,50%),transparent 0,transparent var(--srr,80px),rgba(18,44,40,var(--dim,.55)) calc(var(--srr,80px) + 48px))}
.spot.on{opacity:1}
.hint{position:absolute;left:0;top:0;width:calc(var(--u)*112);height:calc(var(--u)*112);margin:calc(var(--u)*-20) 0 0 calc(var(--u)*-44);display:none;filter:drop-shadow(0 calc(var(--u)*6) 0 rgba(31,79,74,.3))}
.hint.thumb{display:block;animation:drag 1.5s ease-in-out infinite}
.hint svg{width:100%;height:100%}
.pulse{position:absolute;left:0;top:0;width:calc(var(--u)*160);height:calc(var(--u)*160);margin:calc(var(--u)*-80);border-radius:50%;border:calc(var(--u)*8) solid var(--paper);box-sizing:border-box;display:none}
.pulse.on{display:block;animation:ringp 1.2s ease-out infinite}
/* price labels above the upgrade pads */
.padl{position:absolute;left:0;top:0;height:calc(var(--u)*56);border-radius:calc(var(--u)*28);padding:0 calc(var(--u)*16) 0 calc(var(--u)*8);display:none;align-items:center;gap:calc(var(--u)*6);transform:translate(-50%,-50%);border-width:calc(var(--u)*3)}
.padl svg{width:calc(var(--u)*36);height:calc(var(--u)*36)}
.padl .kind{display:flex;align-items:center;justify-content:center;width:calc(var(--u)*44);height:calc(var(--u)*44);border-radius:50%;background:var(--ink,#3d4a3a);color:#fff8e6}
.padl .kind svg{width:calc(var(--u)*30);height:calc(var(--u)*30)}
.padl .num{font-size:calc(var(--u)*30)}
.padl.no{opacity:.75;filter:saturate(.4)}
.arrow{position:absolute;left:0;top:0;width:calc(var(--u)*88);height:calc(var(--u)*88);margin:calc(var(--u)*-44);display:none}
.arrow.on{display:block}
.arrow svg{width:100%;height:100%;filter:drop-shadow(0 calc(var(--u)*5) 0 rgba(31,79,74,.4));animation:arrowgo .7s ease-in-out infinite alternate}
@keyframes arrowgo{from{transform:translateY(calc(var(--u)*10))}to{transform:translateY(calc(var(--u)*-10))}}
.dimmer{position:absolute;inset:0;background:rgba(18,44,40,.2);opacity:0;transition:opacity .2s;pointer-events:none}
.dimmer.on{opacity:1;pointer-events:auto}
.sheet{position:absolute;left:50%;bottom:0;width:min(100%,calc(var(--u)*720));max-height:70%;transform:translate(-50%,105%);transition:transform .22s cubic-bezier(.3,1.25,.5,1);border-radius:calc(var(--u)*40) calc(var(--u)*40) 0 0;border-bottom:0;display:flex;flex-direction:column;pointer-events:auto;padding-bottom:env(safe-area-inset-bottom,0px)}
.sheet.on{transform:translate(-50%,0)}
.sheet .head{display:flex;align-items:center;gap:var(--g);padding:var(--g) var(--m);flex:none}
.sheet .tabs{display:flex;gap:var(--g);flex:1}
.tab{width:var(--h);height:var(--h);border-radius:50%;display:grid;place-items:center;background:#f0e3c2;opacity:.7}
.tab svg{width:calc(var(--u)*48);height:calc(var(--u)*48)}
.tab.on{background:var(--coral);color:#fff6e3;opacity:1}
.sheet .body{overflow-y:auto;overflow-x:hidden;padding:0 var(--m) var(--m);flex:1;-webkit-overflow-scrolling:touch;overscroll-behavior:contain}
.sheet h3{margin:var(--g) 0 calc(var(--u)*8);font-size:calc(var(--u)*30);line-height:1.5;display:flex;align-items:center;gap:calc(var(--u)*8)}
.sheet h3 span{opacity:.6;font-variant-numeric:tabular-nums;direction:ltr}
.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:var(--g)}
.cell{aspect-ratio:1;border-radius:calc(var(--u)*24);background:#f3e7c8;position:relative;display:grid;place-items:center;overflow:hidden;border:calc(var(--u)*4) solid transparent;box-sizing:border-box}
.cell canvas,.cell img{width:100%;height:100%;display:block}
.cell.no canvas,.cell.no img{filter:brightness(0) opacity(.16)}
.cell.new{border-color:var(--coral)}
.cell.use{border-color:var(--ink)}
.cell.gold{background:linear-gradient(135deg,#ffe9a8,#f6c95a)}
.cell small{position:absolute;left:0;right:0;bottom:calc(var(--u)*4);text-align:center;font-size:calc(var(--u)*22);line-height:1.2;direction:ltr}
.cell .tag{position:absolute;inset-inline-end:calc(var(--u)*6);top:calc(var(--u)*6);width:calc(var(--u)*32);height:calc(var(--u)*32)}
.cell .tag svg{width:100%;height:100%}
.card{display:flex;align-items:center;gap:var(--g);padding:calc(var(--u)*12) calc(var(--u)*16);border-radius:calc(var(--u)*28);background:#f3e7c8;margin-bottom:var(--g);min-height:calc(var(--u)*112);box-sizing:border-box}
.card .ic{width:var(--h);height:var(--h);border-radius:50%;background:var(--paper);display:grid;place-items:center;flex:none}
.card .ic svg{width:calc(var(--u)*48);height:calc(var(--u)*48)}
.card .mid{flex:1;min-width:0}
.card .nm{font-size:calc(var(--u)*30);line-height:1.4;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.pips{display:flex;gap:calc(var(--u)*6);margin-top:calc(var(--u)*8)}
.pips i{width:calc(var(--u)*24);height:calc(var(--u)*16);border-radius:calc(var(--u)*8);background:#dccfa8}
.pips i.on{background:var(--leaf)}
.buy{height:var(--h);min-width:calc(var(--u)*176);border-radius:calc(var(--u)*40);background:var(--coral);color:#fff6e3;display:flex;align-items:center;justify-content:center;gap:calc(var(--u)*8);padding:0 calc(var(--u)*20);box-shadow:0 calc(var(--u)*6) 0 #b9553c;flex:none;box-sizing:border-box}
.buy svg{width:calc(var(--u)*40);height:calc(var(--u)*40)}
.buy:active{transform:translateY(calc(var(--u)*4));box-shadow:0 calc(var(--u)*2) 0 #b9553c}
.buy.no{background:#cfc4a4;box-shadow:0 calc(var(--u)*6) 0 #a89d80;color:#6f6a55}
.buy.done{background:var(--leaf);box-shadow:0 calc(var(--u)*6) 0 #5a9a3e}
.sw{display:grid;grid-template-columns:repeat(4,1fr);gap:var(--g)}
.sw button{aspect-ratio:1;border-radius:calc(var(--u)*24);position:relative;border:calc(var(--u)*6) solid #f3e7c8;box-sizing:border-box;display:grid;place-items:end center;overflow:hidden}
.sw button.use{border-color:var(--ink)}
.sw button small{background:rgba(255,246,227,.92);border-radius:calc(var(--u)*14);padding:0 calc(var(--u)*10);margin-bottom:calc(var(--u)*6);font-size:calc(var(--u)*24);line-height:1.5;display:flex;align-items:center;gap:calc(var(--u)*4);direction:ltr}
.sw button small svg{width:calc(var(--u)*24);height:calc(var(--u)*24)}
.set{display:flex;gap:var(--g);flex-wrap:wrap}
.set .tab{opacity:1}.set .tab.off{opacity:.45}
.langs{display:flex;gap:calc(var(--u)*8);flex-wrap:wrap;margin-top:var(--g)}
.langs button{height:calc(var(--u)*64);padding:0 calc(var(--u)*20);border-radius:calc(var(--u)*32);background:#f0e3c2;font-size:calc(var(--u)*26)}
.langs button.on{background:var(--ink);color:#fff6e3}
.lane{position:relative;display:grid;grid-template-columns:repeat(3,1fr);gap:var(--g)}
.badge{position:relative;border-radius:calc(var(--u)*28);background:#f3e7c8;padding:calc(var(--u)*12) calc(var(--u)*8);display:flex;flex-direction:column;align-items:center;gap:calc(var(--u)*4);min-height:calc(var(--u)*176);box-sizing:border-box}
.badge canvas{width:calc(var(--u)*96);height:calc(var(--u)*96)}
.badge.no{opacity:.5}
.badge.day{background:#ffe9a8;box-shadow:inset 0 0 0 calc(var(--u)*4) var(--gold)}
.badge.cur{box-shadow:inset 0 0 0 calc(var(--u)*6) var(--coral)}
.badge .st{display:flex;gap:calc(var(--u)*2)}
.badge .st svg{width:calc(var(--u)*28);height:calc(var(--u)*28);fill:#fff6e3;stroke:#b9c59a}
.badge .st svg.on{fill:var(--gold);stroke:#b97f1c}
.badge small{font-size:calc(var(--u)*22);line-height:1.3;text-align:center}
.rcpt{position:absolute;left:50%;top:calc(var(--st) + var(--h) + var(--g));width:min(calc(100% - var(--sl) - var(--sr)),calc(var(--u)*520));transform:translate(-50%,-140%) rotate(-1.5deg);transition:transform .22s cubic-bezier(.3,1.35,.5,1);border-radius:calc(var(--u)*28);padding:calc(var(--u)*16) calc(var(--u)*24);display:flex;align-items:center;gap:var(--g);pointer-events:none}
.rcpt.on{transform:translate(-50%,0) rotate(-1.5deg)}
.rcpt:not(.on){visibility:hidden;transition:transform .16s ease-in,visibility 0s .16s}
.rcpt canvas{width:calc(var(--u)*112);height:calc(var(--u)*112);flex:none;border-radius:50%;background:#f3e7c8}
.rcpt .mid{flex:1;min-width:0}
.rcpt .big{font-size:calc(var(--u)*64);line-height:1;direction:ltr;font-variant-numeric:tabular-nums}
.rcpt .nm{font-size:calc(var(--u)*26);line-height:1.4;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;opacity:.75}
.rcpt .stars{display:flex;gap:calc(var(--u)*4);margin-top:calc(var(--u)*4)}
.rcpt .stars svg{width:calc(var(--u)*48);height:calc(var(--u)*48);fill:#f3e7c8;stroke:#d5c79d}
.rcpt .stars svg.on{fill:var(--gold);stroke:#b97f1c;animation:stamp .45s ease-out}
.rcpt .rb{display:flex;gap:calc(var(--u)*4);color:var(--coral)}
.rcpt .rb svg{width:calc(var(--u)*40);height:calc(var(--u)*40)}
.rcpt .side{display:flex;flex-direction:column;align-items:flex-end;gap:calc(var(--u)*8);flex:none}
.rcpt .tip{display:flex;align-items:center;gap:calc(var(--u)*6);font-size:calc(var(--u)*38);direction:ltr}
.rcpt .tip svg{width:calc(var(--u)*40);height:calc(var(--u)*40)}
.rcpt button{pointer-events:auto;width:var(--h);height:var(--h);border-radius:50%;background:var(--coral);color:#fff6e3;display:grid;place-items:center}
.rcpt button svg{width:calc(var(--u)*44);height:calc(var(--u)*44)}
.wipe{position:absolute;inset:0;background:radial-gradient(circle at 20% 30%,#8ccb62 0 12%,transparent 13%),radial-gradient(circle at 70% 60%,#74b84e 0 14%,transparent 15%),#7cc25a;transform:translateX(-105%);pointer-events:none}
.wipe.go{animation:wipe .9s ease-in-out}
[dir=rtl] .hint{transform:scaleX(-1)}
.hud.lefty .row{flex-direction:row-reverse}
@keyframes bump{40%{transform:scale(1.12)}}
@keyframes stamp{0%{transform:scale(2.2);opacity:0}55%{transform:scale(.86);opacity:1}100%{transform:scale(1)}}
@keyframes pulse{50%{transform:scale(1.18)}}
@keyframes drop{from{transform:translateY(-120%);opacity:0}}
@keyframes lift{to{transform:translateY(-120%);opacity:0}}
@keyframes rise{0%{opacity:0;margin-top:0}15%{opacity:1}100%{opacity:0;margin-top:calc(var(--u)*-120)}}
@keyframes drag{0%{transform:translateY(calc(var(--u)*70));opacity:0}18%{opacity:1}75%{transform:translateY(calc(var(--u)*-70));opacity:1}100%{transform:translateY(calc(var(--u)*-70));opacity:0}}
@keyframes ringp{0%{transform:scale(.55);opacity:.95}100%{transform:scale(1.25);opacity:0}}
@keyframes wipe{0%{transform:translateX(-105%)}40%,60%{transform:translateX(0)}100%{transform:translateX(105%)}}
@media (prefers-reduced-motion: reduce){.hint.thumb,.pulse.on,.btn.dot em{animation-duration:3s}}
`;

const fmt = (n) => (n >= 100000 ? Math.floor(n / 1000) + 'k' : String(Math.floor(n)));
/** Maps coverage (0..1) to the bar: 0-90% fills the first half, 90-97% the next quarter, 97-100% the last quarter. */
export const barShare = (c, st) => (c < st[0] ? c / st[0] * 0.5 : c < st[1] ? 0.5 + (c - st[0]) / (st[1] - st[0]) * 0.25 : 0.75 + Math.min(1, (c - st[1]) / (st[2] - st[1])) * 0.25);

/**
 * Builds the HUD inside `root` (after the canvas). `on` holds the handlers: album(), shop(), mute(), skip().
 * Returns the controls used by the game; see each method.
 */
export function createUI(root, cfg, on) {
  const style = document.createElement('style'); style.textContent = CSS; root.appendChild(style);
  const hud = document.createElement('div'); hud.className = 'hud'; root.appendChild(hud);
  hud.innerHTML = `
  <div class="spot"></div><div class="barsT"></div><div class="barsB"></div>
  <div class="stick"><i></i></div><div class="pulse"></div><div class="arrow"><svg viewBox="0 0 64 64"><path d="M32 5l23 27H42v14a8 8 0 0 1-8 8h-4a8 8 0 0 1-8-8V32H9z" fill="#e9795b" stroke="#fff6e3" stroke-width="6" stroke-linejoin="round"/></svg></div><div class="hint">${I.hand}</div>
  <div class="row">
    <div class="pill paper coins">${I.coin}<span class="num">0</span></div>
    <div class="pill paper prog"><div class="bar"><b></b><i style="left:50%">${I.star}</i><i style="left:75%">${I.star}</i><i style="left:100%">${I.star}</i></div><span class="num pct">0%</span></div>
    <div class="col"><button class="btn paper mute" aria-label="Sound">${I.snd}</button><button class="btn paper album" aria-label="Album" hidden>${I.book}<em></em></button><button class="btn paper shop" aria-label="Workshop" hidden>${I.tool}<em></em></button></div>
  </div>
  <button class="btn paper skip" aria-label="Skip" hidden>${I.x}</button>
  <div class="row2"></div>
  <div class="rcpt paper"></div>
  <div class="dimmer"></div>
  <div class="sheet paper"><div class="head"><div class="tabs"></div><button class="btn paper close" aria-label="Close">${I.x}</button></div><div class="body"></div></div>
  <div class="wipe"></div>`;
  const $ = (s) => hud.querySelector(s), E = { coins: $('.coins'), coinN: $('.coins .num'), prog: $('.prog'), fill: $('.bar b'), stars: [...hud.querySelectorAll('.bar i')], pct: $('.pct'), mute: $('.mute'), album: $('.album'), shop: $('.shop'), skip: $('.skip'), stick: $('.stick'), knob: $('.stick i'), spot: $('.spot'), hint: $('.hint'), pulse: $('.pulse'), arrow: $('.arrow'), bt: $('.barsT'), bb: $('.barsB'), row2: $('.row2'), rcpt: $('.rcpt'), dim: $('.dimmer'), sheet: $('.sheet'), tabs: $('.sheet .tabs'), body: $('.sheet .body'), wipe: $('.wipe') };
  const tap = (el, fn) => el.addEventListener('click', (e) => { e.stopPropagation(); fn(e); });
  tap(E.mute, () => on.mute()); tap(E.album, () => on.album()); tap(E.shop, () => on.shop()); tap(E.skip, () => on.skip()); tap($('.close'), () => api.closeSheet()); tap(E.dim, () => api.closeSheet());
  // flying coins: a small pool, animated with the Web Animations API (no per-frame DOM writes)
  const flies = []; for (let i = 0; i < 14; i++) { const f = document.createElement('div'); f.className = 'fly'; f.innerHTML = I.coin; hud.appendChild(f); flies.push({ el: f, busy: false }); }
  let u = 0.5, shown = { coins: -1, pct: -1, stars: -1, fill: -1 }, chipT = null, sheetName = null, rcptT = null, lastSpot = '';
  const bump = (el) => { el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); };

  const api = {
    el: hud, E,
    /** Sets the design unit from the stage size: 720 units across a phone, capped so a tablet keeps phone sizes. */
    resize(w, h) { u = Math.max(0.42, Math.min(0.75, Math.min(w, h * 0.62) / 720)); root.style.setProperty('--u', u + 'px'); return u; },
    unit: () => u,
    setCoins(n, doBump) { n = Math.floor(n); if (n === shown.coins) return; shown.coins = n; E.coinN.textContent = fmt(n); if (doBump) bump(E.coins); },
    /** Coverage 0..1 (the digits are the true rounded-down %) and stars 0..3. */
    setProgress(c, pct, stars) {
      const f = Math.round(barShare(c, cfg.stars) * 1000); if (f !== shown.fill) { shown.fill = f; E.fill.style.width = f / 10 + '%'; }
      if (pct !== shown.pct) { shown.pct = pct; E.pct.textContent = pct + '%'; }
      if (stars !== shown.stars) { shown.stars = stars; E.stars.forEach((s, i) => s.classList.toggle('on', i < stars)); if (stars > 0) bump(E.prog); }
    },
    setMute(m) { E.mute.classList.toggle('off', !!m); },
    showButtons(album, shop) { E.album.hidden = !album; E.shop.hidden = !shop; },
    dot(which, v) { E[which].classList.toggle('dot', !!v); },
    showSkip(v) { E.skip.hidden = !v; },
    /** The floating stick: base at (x, y) in stage pixels, knob offset (kx, ky) in -1..1. */
    stick(show, x, y, kx, ky) { E.stick.classList.toggle('on', !!show); if (show) { E.stick.style.transform = `translate(${x}px,${y}px)`; E.knob.style.transform = `translate(${kx * 52 * u}px,${ky * 52 * u}px)`; } },
    /** n coins fly from (x, y) to the coin pill; `each` runs as each one lands. */
    coinFly(x, y, n, each) {
      const r = E.coins.getBoundingClientRect(), rr = root.getBoundingClientRect(), tx = r.left - rr.left + 36 * u, ty = r.top - rr.top + r.height / 2; let k = 0;
      for (const f of flies) {
        if (k >= n) break; if (f.busy) continue; f.busy = true; const i = k++, sx = x + (Math.random() - 0.5) * 60 * u, sy = y + (Math.random() - 0.5) * 40 * u, mx = (sx + tx) / 2 + (Math.random() - 0.5) * 160 * u, my = Math.min(sy, ty) - 60 * u;
        f.el.style.display = 'block';
        const a = f.el.animate([{ transform: `translate(${sx}px,${sy}px) scale(.4)`, opacity: 0 }, { transform: `translate(${sx}px,${sy - 30 * u}px) scale(1.1)`, opacity: 1, offset: 0.18 }, { transform: `translate(${mx}px,${my}px) scale(1)`, offset: 0.6 }, { transform: `translate(${tx}px,${ty}px) scale(.7)`, opacity: 1 }], { duration: 520 + i * 55, easing: 'ease-in-out' });
        a.onfinish = a.oncancel = () => { f.busy = false; f.el.style.display = 'none'; each && each(i); };
      }
      for (; k < n; k++) each && each(k); // more coins than the pool: they count at once
    },
    /** A short "+N" in ink that rises from (x, y). */
    floatText(x, y, html) { const d = document.createElement('div'); d.className = 'ft'; d.innerHTML = html; d.style.left = x + 'px'; d.style.top = Math.max(y, (32 + 80 + 16 + 40) * u) + 'px'; hud.appendChild(d); setTimeout(() => d.remove(), 950); },
    /** A chip under the top row for `secs` seconds (a request, a find, a ribbon). */
    chip(html, secs = 2.4) { clearTimeout(chipT); E.row2.innerHTML = `<div class="chip paper">${html}</div>`; const c = E.row2.firstChild; chipT = setTimeout(() => { c.classList.add('out'); setTimeout(() => { if (E.row2.firstChild === c) E.row2.innerHTML = ''; }, 170); }, secs * 1000); return c; },
    bars(w) { const s = `scaleY(${w.toFixed(3)})`; if (E.bt.style.transform !== s) { E.bt.style.transform = s; E.bb.style.transform = s; } },
    /** The FTUE spotlight: a soft cutout at (x, y) radius r (stage pixels), with a hint: 'thumb', 'ring' or none. */
    spot(s) {
      if (!s) { if (lastSpot) { lastSpot = ''; E.spot.classList.remove('on'); E.hint.className = 'hint'; E.pulse.classList.remove('on'); } return; }
      const key = `${Math.round(s.x)},${Math.round(s.y)},${Math.round(s.r)},${s.hint},${s.dim}`; if (key === lastSpot) return; lastSpot = key;
      E.spot.classList.add('on'); E.spot.style.setProperty('--sx', s.x + 'px'); E.spot.style.setProperty('--sy', s.y + 'px'); E.spot.style.setProperty('--srr', s.r + 'px'); E.spot.style.setProperty('--dim', s.dim ?? cfg.ftue.dim);
      E.hint.className = 'hint' + (s.hint === 'thumb' ? ' thumb' : ''); if (s.hint === 'thumb') { E.hint.style.left = (s.hx ?? s.x) + 'px'; E.hint.style.top = (s.hy ?? s.y) + 'px'; }
      E.pulse.classList.toggle('on', s.hint === 'ring'); if (s.hint === 'ring') E.pulse.style.translate = `${s.x}px ${s.y}px`;
    },
    /** A small arrow at (x, y) turned to angle `a` (radians, 0 = up): it sits beside the hero and points at the goal. */
    arrow(show, x, y, a) { E.arrow.classList.toggle('on', !!show); if (show) E.arrow.style.transform = `translate(${x}px,${y}px) rotate(${a}rad)`; },
    /** The receipt slip: { face (canvas), name, pct, stars, ribbons: [..], tip, share: fn|null }. Folds away by itself. */
    receipt(d, secs = 3) {
      clearTimeout(rcptT); if (!d) { E.rcpt.classList.remove('on'); return; }
      E.rcpt.innerHTML = `<div class="mid"><div class="nm"></div><div class="big">${d.pct}%</div><div class="stars">${[0, 1, 2].map(() => I.star).join('')}</div></div><div class="side"><div class="rb">${(d.ribbons || []).map(() => I.ribbon).join('')}</div><div class="tip">${I.coin}<span>+${d.tip}</span></div>${d.share ? `<button aria-label="Share">${I.share}</button>` : ''}</div>`;
      E.rcpt.querySelector('.nm').textContent = d.name; if (d.face) E.rcpt.prepend(d.face);
      if (d.share) tap(E.rcpt.querySelector('button'), d.share);
      E.rcpt.classList.add('on'); const st = [...E.rcpt.querySelectorAll('.stars svg')];
      for (let i = 0; i < d.stars; i++) setTimeout(() => { st[i].classList.add('on'); d.onStar && d.onStar(i); }, 260 + i * 330);
      rcptT = setTimeout(() => E.rcpt.classList.remove('on'), secs * 1000);
    },
    receiptOpen: () => E.rcpt.classList.contains('on'),
    /** Opens a bottom sheet: tabs = [{ icon, id }], `fill(body, tabId)` draws a tab's content. */
    sheet(name, tabs, fill, first) {
      sheetName = name; E.tabs.innerHTML = tabs.map((t) => `<button class="tab" data-t="${t.id}" aria-label="${t.id}">${I[t.icon]}</button>`).join('');
      const pick = (id) => { [...E.tabs.children].forEach((b) => b.classList.toggle('on', b.dataset.t === id)); E.body.innerHTML = ''; E.body.scrollTop = 0; fill(E.body, id, () => pick(id)); };
      [...E.tabs.children].forEach((b) => tap(b, () => { on.click && on.click(); pick(b.dataset.t); }));
      pick(first || tabs[0].id); E.sheet.classList.add('on'); E.dim.classList.add('on'); on.sheet && on.sheet(name, true);
    },
    closeSheet() { if (!sheetName) return; const n = sheetName; sheetName = null; E.sheet.classList.remove('on'); E.dim.classList.remove('on'); on.sheet && on.sheet(n, false); },
    sheetOpen: () => sheetName,
    wipe(mid) { E.wipe.classList.remove('go'); void E.wipe.offsetWidth; E.wipe.classList.add('go'); setTimeout(mid, 400); },
    setLefty(v) { hud.classList.toggle('lefty', !!v); },
    setDir(rtl) { hud.dir = rtl ? 'rtl' : 'ltr'; },
    /** Rectangles of the HUD items in stage pixels, for the layout test. */
    layout() { const rr = root.getBoundingClientRect(), R = (el) => { const r = el.getBoundingClientRect(); return el.hidden || !r.width ? null : { x: r.left - rr.left, y: r.top - rr.top, w: r.width, h: r.height }; }; return { u, stage: { w: rr.width, h: rr.height }, coins: R(E.coins), prog: R(E.prog), mute: R(E.mute), album: R(E.album), shop: R(E.shop), skip: R(E.skip) }; },
    destroy() { clearTimeout(chipT); clearTimeout(rcptT); hud.remove(); style.remove(); },
  };
  return api;
}
