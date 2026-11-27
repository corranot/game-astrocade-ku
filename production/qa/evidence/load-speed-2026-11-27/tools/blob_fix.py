# usage: blob_fix.py <file>... - moves Bicep Clash's inline base64 model blocks to CDN text files fetched at page start
import re,sys
B='https://d16qq0o35va7kz.cloudfront.net/images/Google_110121609879044057577/'
U={'heroB64':B+'1795799621895_01M8EZZ88788Q928KPT2JBRB2S.txt','clipsB64':B+'1795799623869_01M8EZZA5XTCDVABPAEJ81NQ62.txt','charB64':B+'1795799624740_01M8EZZB148BCWFQRRT9VSSGZZ.txt'}
for f in sys.argv[1:]:
    s=open(f).read(); n0=len(s)
    for k in U:
        s,n=re.subn(r'\s*<script (?:id="%s" type="text/plain"|type="text/plain" id="%s")>.*?</script>'%(k,k),'',s,count=1,flags=re.S); assert n==1,k
    boot='<script>window.__blobs={};'+''.join('window.__blobs.%s=fetch("%s").then(function(r){if(!r.ok)throw new Error("model "+r.status);return r.text()});window.__blobs.%s.catch(function(){});'%(k,u,k) for k,u in U.items())+'</script>'
    s,n=re.subn(r'(<meta charset="(?:utf|UTF)-8"\s*/?>)',lambda m:m.group(1)+boot,s,count=1); assert n==1
    s,n=re.subn(r'atob\(\$\(id\)\.textContent\.trim\(\)\)','atob((await window.__blobs[id]).trim())',s); assert n==1,'code'
    open(f,'w').write(s); print(f,n0//1024,'->',len(s)//1024,'K')
