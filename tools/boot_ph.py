# Prop Heist: the 1.5 MB physics download and its init no longer block the first picture: the world is built and the
# title shows while it loads. Colliders for everything built before physics was ready are added once it is ready, and
# the first round start waits for it (same world, same physics from the first round).
# Sound synthesis also starts after the first picture instead of before it. Usage: boot_ph.py <html>...
import sys, os
src = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'boot_pp.py')).read().split('E = [')[0]
ns = {}; exec(src, ns); rx = ns['rx']
LATE = """function Ey() {"""
LATE_NEW = """// physics arrives while the world is built: give every box and cylinder built so far its collider, then switch on
      function phLate() {
        if (!window.__pnLate) return;
        for (const s of Cl)
          s.c &&
            !s.col &&
            (s.col = yi.createCollider(
              Gi.cylinder(s.c.h / 2, s.c.r).setTranslation(s.c.x, s.c.h / 2, s.c.z).setCollisionGroups(vy)
            ));
        for (const b of Xs)
          Cl.push({
            id: 0,
            col: yi.createCollider(
              Gi.cuboid((b.x1 - b.x0) / 2, b.h / 2, (b.z1 - b.z0) / 2)
                .setTranslation((b.x0 + b.x1) / 2, b.h / 2, (b.z0 + b.z1) / 2)
                .setCollisionGroups(vy)
            ),
          });
        Pn = !0;
        yi.step();
      }
      function Ey() {"""
E = [
 ("""(Po = new ul({ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: -1 })),
            (Pn = !0),""", """(Po = new ul({ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: -1 })),
            (window.__pnLate = !0),"""),
 ("""await e(30),
          await ky(),
          await e(40));""", """await e(30),
          (window.__kyP = ky()),
          await e(40));"""),
 ("""await e(84),
          await cy());""", """await e(84),
          (window.__phReady = window.__kyP
            .then(() => (phLate(), cy()))
            .then(() => {
              window.__phOk = !0;
            })));"""),
 ("""((s4 = !0), YR(), u4(), d4());""", """// sound synthesis starts once the title is on screen (it used to take the main thread before the first picture)
        ((s4 = !0), YR(), (window.__synthGo = u4), d4());"""),
 ("""requestAnimationFrame(() => requestAnimationFrame(() => H1())));""", """requestAnimationFrame(() => requestAnimationFrame(() => (H1(), setTimeout(window.__synthGo, 0)))));"""),
 ("""function c1(e) {
        let t = Le.state === 'title';""", """function c1(e) {
        // the first round waits for physics (usually ready before the tap); one queued start, never two
        if (!window.__phOk) {
          window.__phQ ||
            ((window.__phQ = 1),
            window.__phReady.then(() => {
              window.__phQ = 0;
              c1(e);
            }));
          return;
        }
        let t = Le.state === 'title';"""),
 (LATE, LATE_NEW),
]
for f in sys.argv[1:]:
    s = open(f).read()
    for a, b in E:
        s, n = rx(a).subn(lambda m, r=b: r, s, count=1)
        assert n == 1, (f, a[:60])
    open(f, 'w').write(s); print('ok', f)
