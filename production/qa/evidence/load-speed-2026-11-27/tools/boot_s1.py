# Splash #1 boot-order rework: hero data decode and the save request start at boot (overlapping the engine
# import, hero parse and world build); shaders compile with compileAsync. Usage: boot_s1.py <html>...
import sys, re
def rx(a): return re.compile(r'\s*'.join(re.escape(t) for t in a.split()))
E = [
 # 1. hero: decompress both blobs while three.js downloads; loadHero only parses
 ("""async function loadHero() {
        const glb = await (await gzText('heroData')).arrayBuffer();
        const cj = JSON.parse(await (await gzText('clipData')).text());""",
  """let heroBufP = null;
      async function loadHero() {
        const [glb, cj] = await (heroBufP || heroBufs());"""),
 ("""let HERO = null,""",
  """const heroBufs = () =>
        Promise.all([
          gzText('heroData').then((r) => r.arrayBuffer()),
          gzText('clipData').then((r) => r.text()).then((t) => JSON.parse(t)),
        ]);
      let HERO = null,"""),
 ("""const libP = ensureLib();""",
  """const libP = ensureLib();
        heroBufP = heroBufs();
        heroBufP.catch(() => {});
        // ask for the cloud save as soon as the lib and run mode are known, so its round trip overlaps the hero and world build
        earlyStateP = (async () => {
          await libP;
          await runQueueWait;
          return mode === 'play' ? lib.getUserGameState() : null;
        })();
        earlyStateP.catch(() => {});"""),
 ("""p = Promise.resolve(lib.getUserGameState());""",
  """p = Promise.resolve(earlyStateP || lib.getUserGameState());
          earlyStateP = null;"""),
 ("""async function loadSave() {""",
  """let earlyStateP = null;
      async function loadSave() {"""),
 # 2. prewarm: compileAsync (parallel shader compile where the GPU driver has it) keeps the main thread free
 ("""renderer.compile(scene, camera);
          renderer.render(scene, camera);
          for (const o of hid) o.visible = false;
          renderer.render(scene, camera);""",
  """const cp = renderer.compileAsync ? renderer.compileAsync(scene, camera) : renderer.compile(scene, camera);
          for (const o of hid) o.visible = false;
          await cp;
          for (const o of hid) o.visible = true;
          renderer.render(scene, camera);
          for (const o of hid) o.visible = false;"""),
  # 3. once everything is loaded the bar finishes in a few frames instead of creeping 0.6 % per frame
 ("""shownPct = Math.min(target, shownPct + Math.max(0.6, (target - shownPct) * 0.18));""",
  """shownPct = Math.min(target, shownPct + Math.max(loadDone ? 8 : 0.6, (target - shownPct) * 0.18));"""),
]
for f in sys.argv[1:]:
    s = open(f).read()
    for a, b in E:
        s, n = rx(a).subn(lambda m: b, s, count=1)
        assert n == 1, (f, a[:60])
    open(f, 'w').write(s); print('ok', f)
