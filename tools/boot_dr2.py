# Tame a Dragon, round 2 (on top of boot_dr.py): the three rival riders and the sky thief (4 dragons + 4 riders, about
# 0.7 s of CPU on a mid phone) are built right after the first frame instead of before it. Every event that needs a
# rival builds them on the spot if they are not there yet (buildRivals is idempotent). Usage: boot_dr2.py <in> <out>...
import sys, os, re
src = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'boot_pp.py')).read().split('E = [')[0]
ns = {'__file__': __file__}; exec(src, ns); rx = ns['rx']
E = [
 ("""buildRivals();
            prog(0.85);""", """prog(0.85);"""),
 ("""checkUnlocks();
            rivalPowInit();""", """checkUnlocks();"""),
 ("""function buildRivals() {
        if (RIV.built || !HERO) return;
        RIV.built = true;""", """function buildRivals() {
        if (RIV.built || !HERO) return;
        RIV.built = true;
        setTimeout(rivalPowInit, 0);"""),
 ("""setTimeout(physicsLoad, 50);""", """setTimeout(physicsLoad, 50);
        setTimeout(buildRivals, 700); // rivals fly in after the title is up"""),
 ("""E.rival = RIV.list[(Math.random() * 2) | 0];""", """buildRivals();
          E.rival = RIV.list[(Math.random() * 2) | 0];"""),
 ("""E.th = RIV.thief;""", """buildRivals();
          E.th = RIV.thief;"""),
 ("""E.rv = RIV.list[2];""", """buildRivals();
              E.rv = RIV.list[2];"""),
]
for f, o in zip(sys.argv[1::2], sys.argv[2::2]):
    s = open(f).read()
    for a, b in E:
        m = list(rx(a).finditer(s)); assert len(m) == 1, (f, a[:60], len(m))
        m = m[0]; lead = m.group(0)[:len(m.group(0)) - len(m.group(0).lstrip())]
        s = s[:m.start()] + lead + b + s[m.end():]
    open(o, 'w').write(s); print('ok', o)
