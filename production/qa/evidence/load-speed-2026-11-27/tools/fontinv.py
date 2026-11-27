# usage: fontinv.py <srcdoc>... - unique non-Latin inline woff2 subsets across pages (md5 of raw bytes), writes them to fonts/
import re,sys,base64,hashlib,os,json
os.makedirs('/tmp/claude-0/hv/fonts',exist_ok=True); A=json.load(open('/tmp/claude-0/hv/assets.json')); seen={}
for f in sys.argv[1:]:
    s=open(f,errors='ignore').read()
    for m in re.finditer(r'@font-face\s*\{[^}]*\}',s):
        b=m.group(0); ur=re.search(r'unicode-range:([^;}]+)',b); d=re.search(r'data:font/woff2;base64,([A-Za-z0-9+/=]+)',b)
        if not ur or not d or 'U+0000-00FF' in ur.group(1): continue
        raw=base64.b64decode(d.group(1)); h=hashlib.md5(raw).hexdigest()[:10]
        if len(raw)<6000: continue
        seen.setdefault(h,[len(raw),set()])[1].add(f.split('/')[0][-6:])
        p=f'/tmp/claude-0/hv/fonts/{h}.woff2'
        if not os.path.exists(p): open(p,'wb').write(raw)
new=[(h,v) for h,v in seen.items() if 'font:'+h not in A]
print(len(seen),'unique,',len(new),'new, total new KB',sum(v[0] for h,v in new)//1024)
for h,v in sorted(new,key=lambda x:-x[1][0]): print(h,v[0],len(v[1]))
