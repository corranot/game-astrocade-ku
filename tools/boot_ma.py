# Mega Aura: the static schoolyard (materials, renderer, sky, school buildings) is built while the save is being read,
# instead of after it. None of it reads the save or the language; everything built from the save still waits for it.
# Usage: boot_ma.py <html>...
import sys, os
src = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'boot_pp.py')).read().split('E = [')[0]
ns = {}; exec(src, ns); rx0 = ns['rx']
import re
def rx(a):  # also lets a trailing // comment on a code line be absent (the served page drops comments)
    out = []
    for line in a.split('\n'):
        t = line.strip()
        if t.startswith('//'): out.append(r'(?:\s*//[^\n]*)?'); continue
        c = ''
        if ' // ' in t: t, c = t.split(' // ', 1)
        if t: out.append(r'\s*' + r'\s*'.join(re.escape(w) for w in t.split()) + (r'(?:\s*//[^\n]*)?' if c else ''))
    return re.compile(''.join(out))
A = """await Promise.all([
            makeTextures(N).then(() => LP.mark('tex')),
            kuboPrepare().then(() => LP.mark('kubo')),
            audioPrepare().then(() => LP.mark('audio')),
            Promise.race([loadP, wait(2500)]).then(() => LP.mark('save')),
          ]);"""
A2 = """
          // the static world below reads neither the save nor the language, so it is built while the save is read
          const saveP = Promise.race([loadP, wait(2500)]).then(() => LP.mark('save'));
          await Promise.all([
            makeTextures(N).then(() => LP.mark('tex')),
            kuboPrepare().then(() => LP.mark('kubo')),
            audioPrepare().then(() => LP.mark('audio')),
          ]);
          @@WORLD@@
          await saveP;"""
B_START = """LP.mark('fonts');
          await yieldPaint();"""
W = """makeMaterials();
          LP.mark('mats');
          await yieldPaint();
          // no MSAA on any device (quality-mandate 0s); fixed 720x1280 backbuffer tiers, the host scales the iframe
          const r = new THREE.WebGLRenderer({
            canvas: $('cv'),
            antialias: false,
            powerPreference: 'high-performance',
            stencil: false,
          });
          r.setPixelRatio(1);
          r.outputColorSpace = THREE.SRGBColorSpace;
          r.toneMapping = THREE.ACESFilmicToneMapping;
          r.toneMappingExposure = 0.95;
          r.shadowMap.enabled = true;
          r.shadowMap.type = THREE.PCFSoftShadowMap;
          r.shadowMap.autoUpdate = false; // static world: one shadow render per zone change
          r.info.autoReset = false;
          REND.r = r;
          const scene = new THREE.Scene();
          REND.scene = scene;
          W.scene = scene;
          CAM.cam = new THREE.PerspectiveCamera(56, 405 / 720, 0.3, 400);
          skyAndLights(scene);
          W.sun.shadow.mapSize.set(N >= 256 ? 2048 : 1024, N >= 256 ? 2048 : 1024);
          school();
          colNormalize();
          flushBuckets(scene); // world decor must be added before this line (LESSONS 2026-10-21)
          LP.mark('w0');
          await yieldPaint();"""
for f in sys.argv[1:]:
    s = open(f).read()
    m = rx(W).search(s); assert m, (f, 'world')
    world = s[m.start():m.end()].strip()
    s = s[:m.start()] + '\n' + s[m.end():]  # remove the world block from after the fonts
    s, n = rx(A).subn(lambda _: A2.replace('@@WORLD@@', 'await yieldPaint();\n          ' + world.strip()), s, count=1)
    assert n == 1, (f, 'boot')
    open(f, 'w').write(s); print('ok', f)
