# Megalodon boot rework: the cloud-save request starts at boot (its answer is applied at the same point as before),
# and the synthesized SFX render runs after the title is up (the audio layer already starts sounds once it is ready).
# Usage: boot_mg.py <html>...
import sys, re
def rx(a):  # whitespace-insensitive; a whole-line // comment in the pattern is optional (the served page drops comments)
    out = []
    for line in a.split('\n'):
        t = line.strip()
        if t.startswith('//'): out.append(r'(?:\s*//[^\n]*)?')
        elif t: out.append(r'\s*' + r'\s*'.join(re.escape(w) for w in t.split()))
    return re.compile(''.join(out))
E = [
 ("""let o = await Promise.race([
                  u.getUserGameState(),""", """let o = await Promise.race([
                  window.__saveP || u.getUserGameState(),"""),
 ("""(h(0.06),
          await new Promise((e) => {""", """try {
          if (u && u.getUserGameState) (window.__saveP = Promise.resolve(u.getUserGameState())).catch(() => {});
        } catch {}
        (h(0.06),
          await new Promise((e) => {"""),
 ("""h(0.5);
        try {
          await l.prepare();
        } catch {}""", """h(0.5);"""),
 ("""requestAnimationFrame(Zt),
          h(1),""", """requestAnimationFrame(Zt),
          h(1),
          l.prepare().catch(() => {}),"""),
]
for f in sys.argv[1:]:
    s = open(f).read()
    for a, b in E:
        s, n = rx(a).subn(lambda m: b, s, count=1)
        assert n == 1, (f, a[:70])
    open(f, 'w').write(s); print('ok', f)
