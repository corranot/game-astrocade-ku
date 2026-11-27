# usage: put.py <upload_id> <file> [<upload_id> <file> ...] - PUTs each file to the upload_url begin_upload issued for that id
import json,sys,subprocess,re
T='/root/.claude/projects/-home-user/8d4a219d-81b6-55cf-a925-698781637efa.jsonl'
txt=open(T).read()
a=sys.argv[1:]
for uid,f in zip(a[::2],a[1::2]):
    m=re.search(r'\\?"upload_id\\?":\s*\\?"'+re.escape(uid)+r'\\?",\s*\\?"upload_url\\?":\s*\\?"([^"\\]+)',txt)
    url=m.group(1).encode().decode('unicode_escape') if m else None
    if not url: print(uid,'NOT FOUND'); continue
    r=subprocess.run(['curl','-s','-o','/dev/null','-w','%{http_code}','-X','PUT','-T',f,url],capture_output=True,text=True)
    print(uid[:8],f.split('/')[-1],r.stdout)
