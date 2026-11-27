# Tiny Town boot rework: rounded-box geometry is generated once per size and cloned (the town repeats the same
# boxes hundreds of times), plus the shared Kubo voxel-mesher speedup and shop-only looks after the first frame.
# Usage: boot_tt.py <html>...
import sys, re
def rx(a):  # whitespace-insensitive; a whole-line // comment in the pattern is optional (the served page drops comments)
    out = []
    for line in a.split('\n'):
        t = line.strip()
        if t.startswith('//'): out.append(r'(?:\s*//[^\n]*)?')
        elif t: out.append(r'\s*' + r'\s*'.join(re.escape(w) for w in t.split()))
    return re.compile(''.join(out))
E = [
 ("""const rbox = (w, h, d, r, seg) =>
        uvScale(""", """const RBOX = new Map();
      const rbox = (w, h, d, r, seg) => {
        const k = w + ',' + h + ',' + d + ',' + r + ',' + seg;
        let g = RBOX.get(k);
        if (!g) RBOX.set(k, (g = rbox0(w, h, d, r, seg)));
        return g.clone(); // callers transform their copy
      };
      const rbox0 = (w, h, d, r, seg) =>
        uvScale("""),
]
for f in sys.argv[1:]:
    s = open(f).read()
    for a, b in E:
        s, n = rx(a).subn(lambda m: b, s, count=1)
        assert n == 1, (f, a[:70])
    open(f, 'w').write(s); print('ok', f)
