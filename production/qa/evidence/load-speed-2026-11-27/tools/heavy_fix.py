# usage: heavy_fix.py <file> [<file>...]  - rewrites in place:
#  - drops the inline rapierB64 JSON block, starts the physics text fetch from the CDN in <head>
#  - reads the physics text from that fetch instead of the inline block
#  - points non-Latin @font-face subsets at their CDN copies (unicode-range keeps them lazy)
import re,sys,json,base64,hashlib
A=json.load(open('/tmp/claude-0/hv/assets.json'))
def fix(s,log):
    m=re.search(r'\s*<script (?:id="rapierB64" type="application/json"|type="application/json" id="rapierB64")>(.*?)</script>',s,re.S)
    if m:
        b=json.loads(m.group(1)); h=hashlib.md5(b.encode()).hexdigest()[:8]; url=A['rapier:'+h]
        s=s[:m.start()]+s[m.end():]
        boot=('<script>window.__physTxt=fetch("%s").then(function(r){if(!r.ok)throw new Error("physics "+r.status);return r.text()});'
              'window.__physTxt.catch(function(){});</script>')%url
        s,n=re.subn(r'(<meta charset="(?:utf|UTF)-8"\s*/?>)',lambda mm:mm.group(1)+boot,s,count=1); assert n==1,'charset'
        log.append('rapier '+h)
    # code side (may be in another file)
    s,n=re.subn(r"""JSON\.parse\(\$\((["'])rapierB64\1\)\.textContent\)""","(await window.__physTxt)",s); n and log.append(f'code x{n}')
    # worker-style loader (Prop Heist): element lookup + JSON.parse -> the fetched text
    s,n=re.subn(r"let t\s*=\s*document\.getElementById\('rapierB64'\);(\s*)if\s*\(!t\s*\|\|\s*!t\.textContent\.trim\(\)\)(.*?)atob\(JSON\.parse\(t\.textContent\)\)",
        lambda mm:"let t=await window.__physTxt.catch(function(){return ''});"+mm.group(1)+"if (!t || !t.trim())"+mm.group(2)+"atob(t)",s,count=1,flags=re.S); n and log.append('code worker')
    def font(mm):
        blk=mm.group(0); ur=re.search(r'unicode-range:([^;}]+)',blk)
        if not ur or 'U+0000-00FF' in ur.group(1): return blk
        d=re.search(r'data:font/woff2;base64,([A-Za-z0-9+/=]+)',blk)
        if not d: return blk
        k='font:'+hashlib.md5(base64.b64decode(d.group(1))).hexdigest()[:10]
        if k not in A: return blk
        log.append(k); return blk.replace(d.group(0),A[k])
    s=re.sub(r'@font-face\s*\{.*?\}',font,s,flags=re.S)
    return s
for f in sys.argv[1:]:
    s=open(f).read(); log=[]; t=fix(s,log)
    if t!=s: open(f,'w').write(t)
    print(f, len(s)//1024,'->',len(t)//1024,'K', log)
