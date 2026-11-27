# Toybox Town lazy physics (on top of boot_tb.py): the 1.5 MB physics download starts once the engine files are in (so
# it does not compete with them) and its unpack + init run after the first frame. Until Rapier is ready the world is built on stand-in objects that record every
# physics call; the calls replay in order once Rapier loads, then the stand-ins are swapped for the real bodies.
# Play / free-play taps and the edit-mode editor wait for physics (about 1.5 s on 4G). Usage: boot_tb_lazy.py <html>...
import sys, re
sys.path.insert(0, __import__('os').path.dirname(__file__))
def rx(a):  # whitespace-insensitive; a whole-line // comment in the pattern is optional (the served page drops comments)
    out = []
    for line in a.split('\n'):
        t = line.strip()
        if t.startswith('//'): out.append(r'(?:\s*//[^\n]*)?')
        elif t: out.append(r'\s*' + r'\s*'.join(re.escape(w) for w in t.split()))
    return re.compile(''.join(out))
HELPERS = r"""
      // Rapier arrives after the first frame: until then physics calls go to stand-ins that are replayed in order
      const PHQ = { log: [], wait: [], go: null, root: null };
      function phRec(src) {
        const rec = { src, done: false, real: undefined };
        const p = new Proxy(function () {}, {
          get(t, k) {
            if (k === '__rec') return rec;
            if (rec.done) {
              const v = rec.real[k];
              return typeof v === 'function' ? (...a) => v.apply(rec.real, a.map(phReal)) : v;
            }
            if (typeof k === 'symbol' || k === 'then') return undefined;
            return phRec({ op: 'get', of: p, k });
          },
          set(t, k, v) {
            if (rec.done) rec.real[k] = phReal(v);
            else PHQ.log.push({ op: 'set', of: p, k, v });
            return true;
          },
          apply(t, self, a) {
            if (rec.done) return phRes(phRec({ op: 'call', of: p, a }).__rec);
            const r = phRec({ op: 'call', of: p, a });
            PHQ.log.push(r.__rec);
            return r;
          },
          construct(t, a) {
            const r = phRec({ op: 'new', of: p, a });
            if (rec.done) return phRes(r.__rec);
            PHQ.log.push(r.__rec);
            return r;
          },
        });
        return p;
      }
      function phRes(rec) {
        if (rec.done) return rec.real;
        const s = rec.src,
          args = () => s.a.map(phReal);
        let v;
        if (s.op === 'get') v = phReal(s.of)[s.k];
        else if (s.op === 'new') v = new (phReal(s.of))(...args());
        else {
          const c = s.of.__rec.src;
          v = c && c.op === 'get' ? phReal(c.of)[c.k](...args()) : phReal(s.of)(...args());
        }
        rec.done = true;
        rec.real = v;
        return v;
      }
      function phReal(x) {
        return typeof x === 'function' && x.__rec ? phRes(x.__rec) : x;
      }
      function phStub() {
        PHQ.root = phRec(null);
        PH.R = PHQ.root;
      }
      function phLive(RP) {
        if (PHQ.root) {
          PHQ.root.__rec.real = RP;
          PHQ.root.__rec.done = true;
        }
        for (const e of PHQ.log) {
          if (e.src) phRes(e);
          else phReal(e.of)[e.k] = phReal(e.v);
        }
        PHQ.log = [];
        PH.R = RP;
        for (const k of ['W', 'hc', 'cc', 'carCol']) PH[k] = phReal(PH[k]);
        for (const o of OBJ.concat(H.cars || [])) {
          o.body = phReal(o.body);
          o.col = phReal(o.col);
        }
        for (const b of BUILDS) for (const s of b.slots) if (s.col) s.col = phReal(s.col);
        PH.ready = true;
        ui.play.style.opacity = '';
        PHQ.wait.splice(0).forEach((f) => f());
        const g = PHQ.go;
        PHQ.go = null;
        if (g) g();
      }
      function phWhenReady(f) {
        if (PH.ready) f();
        else PHQ.wait.push(f);
      }
      function phWait(f) {
        PHQ.go = f;
        ui.play.style.opacity = '0.7';
      }
      function physicsBuild() {"""
E = [
 (None, r'window\.__physTxt=(fetch\(.*?\}\));window\.__physTxt\.catch\(function\(\)\{\}\);',
  r'window.__physGo=function(){if(!window.__physTxt){window.__physTxt=\1;window.__physTxt.catch(function(){});}return window.__physTxt;};'),
 ("""b64u8((await window.__physTxt))""", """b64u8((await window.__physGo()))"""),
 ("""delete globalThis.__RAPIER_WASM;
        PH.R = RP;""", """delete globalThis.__RAPIER_WASM;
        return RP;"""),
 ("""function physicsBuild() {""", HELPERS),
 ("""physics: 12,""", """physics: 0,"""),
 ("""const pPhys = physicsLoad();
        pPhys.catch(() => {});""", """window.__physGo();"""),
 ("""await task(W.physics + W.audio, () => pPhys, 15000);""", ""),
 ("""buildChestLid();
            physicsBuild();""", """buildChestLid();
            phStub();
            physicsBuild();"""),
 ("""CAMS.z = 16;
          },
          12000""", """CAMS.z = 16;
            PH.ready = false;
          },
          12000"""),
 ("""o.body.applyImpulse({ x: 0, y: 3, z: 0 }, true);""", """if (PH.ready) o.body.applyImpulse({ x: 0, y: 3, z: 0 }, true);"""),
 ("""requestAnimationFrame(loop);
        await new Promise((r) => setTimeout(r, 700));""", """requestAnimationFrame(loop);
        physicsLoad().then(phLive).catch(fatal);
        await new Promise((r) => setTimeout(r, 700));"""),
 ("""if (MODE === 'edit') initObjectEditor();""", """if (MODE === 'edit')
          phWhenReady(() => {
            if (MODE === 'edit') initObjectEditor();
            else {
              ui.title.classList.add('on');
              stage.classList.add('ttl');
            }
          });"""),
 ("""function startPlay() {
        if (H.phase !== 'title') return;""", """function startPlay() {
        if (H.phase !== 'title') return;
        if (!PH.ready) return phWait(startPlay);"""),
 ("""function startFreeFromTitle() {
        if (H.phase !== 'title') return;""", """function startFreeFromTitle() {
        if (H.phase !== 'title') return;
        if (!PH.ready) return phWait(startFreeFromTitle);"""),
]
for f, o in zip(sys.argv[1::2], sys.argv[2::2]):
    s = open(f).read()
    for a, *b in E:
        pat = re.compile(b[0]) if a is None else rx(a)
        rep = b[-1]
        s, n = pat.subn(rep if a is None else (lambda m, r=rep: r), s, count=1)
        assert n == 1, (f, (a or b[0])[:70])
    open(o, 'w').write(s); print('ok', o)
