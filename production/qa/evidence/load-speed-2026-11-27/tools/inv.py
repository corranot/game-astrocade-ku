# usage: inv.py <srcdoc>... - lists the big inline payloads of each page (scripts, data: URLs, fonts)
import re,sys,gzip
for f in sys.argv[1:]:
    s=open(f,errors='ignore').read(); t=re.search(r'<title>([^<]*)',s); out=[]
    for m in re.finditer(r'<script([^>]*)>(.*?)</script>',s,re.S):
        if len(m.group(2))>60000: out.append(('script'+(re.search(r'id="([^"]+)"',m.group(1)) or [0,''])[1],len(m.group(2))))
    for m in re.finditer(r'data:([a-z]+/[a-z0-9.+-]+);base64,[A-Za-z0-9+/=]{20000,}',s): out.append((m.group(1),len(m.group(0))))
    nonlat=sum(len(m.group(0)) for m in re.finditer(r'@font-face\s*\{[^}]*\}',s) if 'U+0000-00FF' not in m.group(0) and 'data:' in m.group(0))
    print(f.split('/')[0], (t.group(1) if t else '?')[:28], len(s)//1024,'K gz',len(gzip.compress(s.encode(),6))//1024,'K | nonlatin fonts',nonlat//1024,'K |', ', '.join(f'{a}:{b//1024}K' for a,b in sorted(out,key=lambda x:-x[1])[:6]))
