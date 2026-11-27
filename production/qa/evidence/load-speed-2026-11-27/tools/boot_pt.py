# Pet Thief boot-order rework: start font + save loads at boot start (parallel with the engine import),
# and compile shaders with compileAsync so the loader keeps animating. Usage: boot_pt.py <html>...
import sys, re
def rx(a): return re.compile(r'\s*'.join(re.escape(t) for t in a.split()))
E = [
 ("""        LG = detectLang();
        applyDir();
        await task(
          W.engine,""",
  """        LG = detectLang();
        applyDir();
        // start the independent loads now so they overlap the engine import (each task below then just awaits its promise)
        const pFont1 = document.fonts.load('800 20px "Baloo 2"', 'Aaअ ệ বাংলা');
        const pFont2 = document.fonts.load('800 20px "Baloo Bhaijaan 2"', 'مرحبا');
        const pSave = loadSave();
        pFont1.catch(() => {});
        pFont2.catch(() => {});
        await task(
          W.engine,"""),
 ("""        await task(W.font1, () => document.fonts.load('800 20px "Baloo 2"', 'Aaअ ệ বাংলা'), 3500);
        await task(
          W.font2,
          () => document.fonts.load('800 20px "Baloo Bhaijaan 2"', 'مرحبا'),
          3500
        );
        await task(
          W.save,
          async () => {
            saveLoadOk = await loadSave();
          },
          6000
        );""",
  """        await task(W.font1, () => pFont1, 3500);
        await task(W.font2, () => pFont2, 3500);
        await task(
          W.save,
          async () => {
            saveLoadOk = await pSave;
          },
          6000
        );"""),
 ("""          async () => {
            prewarm();
          },
          8000""",
  """          async () => {
            await prewarm();
          },
          8000"""),
 ("""      function prewarm() {""", """      async function prewarm() {"""),
 ("""        burst(0, -50, 0, 1, 0xffffff);
        renderer.compile(scene, camera);""",
  """        burst(0, -50, 0, 1, 0xffffff);
        // parallel shader compile where the GPU supports it; the loader keeps animating meanwhile
        try {
          await renderer.compileAsync(scene, camera);
        } catch (e) {
          renderer.compile(scene, camera);
        }"""),
]
for f in sys.argv[1:]:
    s = open(f).read()
    for a, b in E:
        ms = list(rx(a).finditer(s))
        if len(ms) != 1: sys.exit(f'{f}: {len(ms)} matches for {a[:60]!r}')
        s = s[:ms[0].start()] + b + s[ms[0].end():]
    open(f, 'w').write(s); print('ok', f)
