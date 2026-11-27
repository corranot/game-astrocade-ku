# Candy Mine Vacuum staged boot: the first picture needs only the start land and its neighbour (landVis shows the
# current land +-1, and every player starts in land 0), and only the hat the cart wears. Lands 2-9 are decorated
# and the other hat meshes built one per tick after the first frame; hats build on first use if needed sooner.
# Same seeded decoration, same buckets, same materials. Usage: boot_cd.py <runtime.js or served html>...
import sys, os
src = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'boot_ma.py')).read().split('A = """')[0]
ns = {'__file__': os.path.join(os.path.dirname(os.path.abspath(__file__)), 'boot_ma.py')}; exec(src, ns)
import re
rx = lambda a: re.compile(ns['rx'](a).pattern.replace("'", '["\']'))  # the served page uses double quotes
E = [
 ("""function metaPrepare() {
        // boot: every hat look meshed once (no geometry is built when a kid buys one)
        for (const h of HATS)
          META.hatGeo[h] = KUBO.build(
            LOOKS.CH_MINER,
            h === 'hard' ? null : { hat: h, cosA: '#ff5fa8', cosB: '#ffd23f' }
          );
      }""", """function metaPrepare() {
        // each hat look is meshed on first use; the rest are built right after the first frame (lateBuild)
        const made = {};
        META.hatGeo = new Proxy(made, {
          get(t, h) {
            if (!(h in t) && HATS.includes(h))
              t[h] = KUBO.build(LOOKS.CH_MINER, h === 'hard' ? null : { hat: h, cosA: '#ff5fa8', cosB: '#ffd23f' });
            return t[h];
          },
        });
      }"""),
 ("""decorate(i);
        }
        BUCKET_LAND = -1;""", """if (i <= 1) decorate(i);
          else LATE_DECO.push(i); // decorated after the first frame (lateBuild)
        }
        BUCKET_LAND = -1;"""),
 ("""function decorate(i) {""", """// after the first frame: one far land's decoration or one hat mesh per tick, so no frame takes the whole build
      const LATE_DECO = [];
      function lateBuild() {
        const i = LATE_DECO.shift();
        if (i !== undefined) {
          BUCKET_LAND = i;
          decorate(i);
          BUCKET_LAND = -1;
          flushBuckets(W.scene);
        } else {
          const h = HATS.find((k) => !Object.prototype.hasOwnProperty.call(META.hatGeo, k));
          if (!h) return;
          META.hatGeo[h];
        }
        setTimeout(lateBuild, 40);
      }
      function decorate(i) {"""),
 ("""requestAnimationFrame(frame);
          audioPrepare()""", """requestAnimationFrame(frame);
          setTimeout(lateBuild, 250);
          audioPrepare()"""),
]
for f in sys.argv[1:]:
    s = open(f).read()
    for a, b in E:
        s, n = rx(a).subn(lambda m, r=b: m.group(0)[: len(m.group(0)) - len(m.group(0).lstrip())] + r, s, count=1)  # keep the leading indent
        assert n == 1, (f, a[:60])
    open(f, 'w').write(s); print('ok', f)
