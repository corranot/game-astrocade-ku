# Toybox Town boot rework: fonts and the cloud save start at boot, physics (download + init) and the hero model
# decode start as soon as the add-ons exist, all overlapping instead of one after another; shaders compile with
# compileAsync. Usage: boot_tb.py <html>...
import sys, re
def rx(a):  # whitespace-insensitive; a whole-line // comment in the pattern is optional (the served page drops comments)
    out = []
    for line in a.split('\n'):
        t = line.strip()
        if t.startswith('//'): out.append(r'(?:\s*//[^\n]*)?')
        elif t: out.append(r'\s*' + r'\s*'.join(re.escape(w) for w in t.split()))
    return re.compile(''.join(out))
E = [
 ("""LD.total = Object.values(W).reduce((a, b) => a + b);
        LG = detectLang();
        applyDir();""", """LD.total = Object.values(W).reduce((a, b) => a + b);
        LG = detectLang();
        applyDir();
        // independent loads start now and overlap; each task below only awaits its promise
        const pFonts = Promise.all([
          document.fonts.load('800 20px "Baloo 2"', 'Aaअ ệ অ'),
          document.fonts.load('800 20px "Baloo Bhaijaan 2"', 'مرحبا'),
        ]);
        pFonts.catch(() => {});
        const pSave = loadSave();
        pSave.catch(() => {});"""),
 ("""if (!THREE || !BG) throw new Error('engine failed');""", """if (!THREE || !BG) throw new Error('engine failed');
        const pPhys = physicsLoad();
        pPhys.catch(() => {});
        const pHero = (async () => {
          const glb = ADD.gunzipSync(b64u8(JSON.parse($('heroB64').textContent))).buffer;
          await ADD.MeshoptDecoder.ready;
          const ld = new ADD.GLTFLoader();
          ld.setMeshoptDecoder(ADD.MeshoptDecoder);
          HERO = await new Promise((res, rej) => ld.parse(glb, '', res, rej));
          HERO.extraClips = JSON.parse(
            ADD.strFromU8(ADD.gunzipSync(b64u8(JSON.parse($('clipsB64').textContent))))
          ).map((j) => THREE.AnimationClip.parse(j));
        })();
        pHero.catch(() => {});"""),
 ("""async () => {
            await document.fonts.load('800 20px "Baloo 2"', 'Aaअ ệ অ');
            await document.fonts.load('800 20px "Baloo Bhaijaan 2"', 'مرحبا');
          },""", """() => pFonts,"""),
 ("""saveLoadOk = await loadSave();""", """saveLoadOk = await pSave;"""),
 ("""await task(W.physics + W.audio, () => physicsLoad(), 15000);""", """await task(W.physics + W.audio, () => pPhys, 15000);"""),
 ("""async (prog) => {
            const glb = ADD.gunzipSync(b64u8(JSON.parse($('heroB64').textContent))).buffer;
            prog(0.4);
            await ADD.MeshoptDecoder.ready;
            prog(0.6);
            const ld = new ADD.GLTFLoader();
            ld.setMeshoptDecoder(ADD.MeshoptDecoder);
            HERO = await new Promise((res, rej) => ld.parse(glb, '', res, rej));
            prog(0.85);
            HERO.extraClips = JSON.parse(
              ADD.strFromU8(ADD.gunzipSync(b64u8(JSON.parse($('clipsB64').textContent))))
            ).map((j) => THREE.AnimationClip.parse(j));
          },""", """() => pHero,"""),
 ("""function prewarm() {""", """async function prewarm() {"""),
 ("""burst(0, -50, 0, 1, 0xffffff);
        renderer.compile(scene, camera);""", """burst(0, -50, 0, 1, 0xffffff);
        await (renderer.compileAsync ? renderer.compileAsync(scene, camera) : renderer.compile(scene, camera));"""),
 ("""async () => {
            prewarm();
          },""", """() => prewarm(),"""),
]
for f in sys.argv[1:]:
    s = open(f).read()
    for a, b in E:
        s, n = rx(a).subn(lambda m: b, s, count=1)
        assert n == 1, (f, a[:70])
    open(f, 'w').write(s); print('ok', f)
