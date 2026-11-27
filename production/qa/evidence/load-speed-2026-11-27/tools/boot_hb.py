# Hero Bridge boot rework: the synthesized SFX/music render and the refresh-rate probe run after the title is up
# instead of in front of it; music starts as soon as its loops exist (also when the first tap came earlier).
# Usage: boot_hb.py <html>...
import sys, re
def rx(a):  # whitespace-insensitive; a whole-line // comment in the pattern is optional (the served page drops comments)
    out = []
    for line in a.split('\n'):
        t = line.strip()
        if t.startswith('//'): out.append(r'(?:\s*//[^\n]*)?')
        elif t: out.append(r'\s*' + r'\s*'.join(re.escape(w) for w in t.split()))
    return re.compile(''.join(out))
E = [
 ("""Snd.ready = true;
      }""", """Snd.ready = true;
        if (Snd.ctx) startBgm(Snd.ctx); // the first tap came before the loops were rendered
      }"""),
 ("""Snd.gd.connect(Snd.gm);
          Snd.bgm.forEach((b, i) => {""", """Snd.gd.connect(Snd.gm);
          startBgm(c);
        } catch (e) {
          /* no audio */
        }
      }
      function startBgm(c) {
        if (Snd.src || Snd.bgm.length < 4 || !Snd.gd) return;
        try {
          Snd.bgm.forEach((b, i) => {"""),
 ("""await step(52);
        try {
          await audioRender((p) => {
            ldP = Math.max(ldP, 52 + p * 28);
            ldPct.textContent = Math.round(ldP) + '%';
            ldBar.style.width = ldP + '%';
          });
        } catch (e) {
          console.error('audio render failed', e && e.message);
        }
        await step(82);""", """await step(82);"""),
 ("""await probeHz();""", ""),
 ("""requestAnimationFrame(frame);
      }""", """requestAnimationFrame(frame);
        // after the title is up: refresh-rate probe (runs beside the frame loop) and the synthesized SFX / music loops
        probeHz();
        audioRender().catch((e) => console.error('audio render failed', e && e.message));
      }"""),
 # bug fix: the feed hands a game over from edit to play with a second run(); after boot that call changed nothing, so a
 # game that finished booting before the switch kept "EDITOR MODE" on a disabled play button
 ("""window.run = function () {
          return window.__readyP;
        };""", """window.run = function () {
          applyLang(); // refreshes the play button for the current mode
          const eb = $('editBadge');
          if (eb) eb.style.display = IS_EDIT() ? '' : 'none';
          return window.__readyP;
        };"""),
]
for f in sys.argv[1:]:
    s = open(f).read()
    for a, b in E:
        s, n = rx(a).subn(lambda m: b, s, count=1)
        assert n == 1, (f, a[:60])
    open(f, 'w').write(s); print('ok', f)
