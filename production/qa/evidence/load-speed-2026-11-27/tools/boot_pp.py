# Paint Peekaboo: faster voxel mesher (numeric voxel keys, no string split or spread pushes) with byte-identical
# output, so the ten character looks build in a fraction of the time before the first frame. Usage: boot_pp.py <html>...
import sys, re
def rx(a):  # whitespace-insensitive; a whole-line // comment in the pattern is optional (the served page drops comments)
    out = []
    for line in a.split('\n'):
        t = line.strip()
        if t.startswith('//'): out.append(r'(?:\s*//[^\n]*)?')
        elif t: out.append(r'\s*' + r'\s*'.join(re.escape(w) for w in t.split()))
    return re.compile(''.join(out))
E = [
 ("""const { w, h, d, min, fn, weight } = part,
          keys = new Map();
        for (let x = 0; x < w; x++)
          for (let y = 0; y < h; y++)
            for (let z = 0; z < d; z++) {
              const k = fn(x, y, z);
              if (k) keys.set(x + ',' + y + ',' + z, k);
            }
        let vox = 0;
        for (const [id, raw] of keys) {
          const [x, y, z] = id.split(',').map(Number);""",
  """const { w, h, d, min, fn, weight } = part,
          keys = new Map();
        // voxel key: 6 bits per axis, offset by 1 so a neighbour at -1 still has its own key (parts are under 62 voxels a side)
        const KY = (x, y, z) => ((x + 1) << 12) | ((y + 1) << 6) | (z + 1);
        for (let x = 0; x < w; x++)
          for (let y = 0; y < h; y++)
            for (let z = 0; z < d; z++) {
              const k = fn(x, y, z);
              if (k) keys.set(KY(x, y, z), k);
            }
        let vox = 0;
        for (const [id, raw] of keys) {
          const x = (id >> 12) - 1,
            y = ((id >> 6) & 63) - 1,
            z = (id & 63) - 1;"""),
 ("""if (keys.has(x + n[0] + ',' + (y + n[1]) + ',' + (z + n[2]))) continue;""",
  """if (keys.has(KY(x + n[0], y + n[1], z + n[2]))) continue;"""),
 ("""if (va.cross(vn).dot(vb.set(...n)) < 0) corners.reverse();""",
  """if (va.cross(vn).dot(vb.set(n[0], n[1], n[2])) < 0) corners.reverse();"""),
 ("""T.pos.push(...c);
              T.nor.push(...n);""",
  """T.pos.push(c[0], c[1], c[2]);
              T.nor.push(n[0], n[1], n[2]);"""),
 ("""const corners = [
                [0, 0],
                [1, 0],
                [1, 1],
                [0, 1],
              ].map(([cu, cv]) => {
                const c = [x, y, z];
                c[ax] += n[ax] > 0 ? 1 : 0;
                c[u] += cu;
                c[v] += cv;
                return [min[0] + c[0] * VS, min[1] + c[1] * VS, min[2] + c[2] * VS];
              });""",
  """const corners = new Array(4);
              for (let q = 0; q < 4; q++) {
                const c = [x, y, z];
                c[ax] += n[ax] > 0 ? 1 : 0;
                c[u] += q === 1 || q === 2 ? 1 : 0;
                c[v] += q >= 2 ? 1 : 0;
                corners[q] = [min[0] + c[0] * VS, min[1] + c[1] * VS, min[2] + c[2] * VS];
              }"""),
 ("""corners.forEach((c, i) => {""", """for (let i = 0; i < 4; i++) {
                const c = corners[i];"""),
 ("""T.fx.push(fl ? fl(c[0], c[1], c[2]) : 0);
              });""", """T.fx.push(fl ? fl(c[0], c[1], c[2]) : 0);
              }"""),
 # stage the character looks: the ones on screen at boot (player, the six bots, the worn style) before the first frame,
 # the shop-only looks in idle time right after it (kuboGeo still builds any look on demand)
 ("""async function kuboPrepare() {
        // boot: materials, clips and every look's mesh (about 1.3k voxels each) before play
        KUBO.makeMats();
        KUBO.makeClips();
        for (const id of Object.keys(LOOKS)) {
          kuboGeo(id, null);
          await new Promise((r) => setTimeout(r, 0));
        }
      }""",
  """async function kuboPrepare() {
        // boot: materials, clips and the meshes of the looks on screen (about 1.3k voxels each); shop looks follow in kuboPrepareRest
        KUBO.makeMats();
        KUBO.makeClips();
        const first = new Set(['CH_PLAYER', ...BOT_LOOKS]);
        try {
          if (STYLES[S.style]) first.add(STYLES[S.style].look);
        } catch (e) {}
        for (const id of first) {
          kuboGeo(id, null);
          await new Promise((r) => setTimeout(r, 0));
        }
      }
      function kuboPrepareRest() {
        const ids = Object.keys(LOOKS).filter((id) => !KGEO.has(id));
        const idle = window.requestIdleCallback || ((f) => setTimeout(f, 50));
        const next = () => {
          const id = ids.shift();
          if (!id) return;
          kuboGeo(id, null);
          idle(next, { timeout: 400 });
        };
        setTimeout(next, 300);
      }"""),
 ("""bootDone = true;""", """bootDone = true;
          kuboPrepareRest();"""),
 # bug fix: the shadow map is re-rendered only on request (autoUpdate off), so after the slow-phone quality step disposes
 # it the renderer must be told to draw it again; without this the whole world vanished (sky only) on slower phones
 ("""sun.shadow.mapSize.set(n, n);
          sun.shadow.needsUpdate = true;""", """sun.shadow.mapSize.set(n, n);
          sun.shadow.needsUpdate = true;
          if (REND.r) REND.r.shadowMap.needsUpdate = true;"""),
]
for f in sys.argv[1:]:
    s = open(f).read()
    for a, b in E:
        s, n = rx(a).subn(lambda m: b, s, count=1)
        assert n == 1, (f, a[:60])
    open(f, 'w').write(s); print('ok', f)
