# usage: extract_pull.py <game_id> <outdir> [saved_result.json]  - writes the latest pull_game result for game_id from the session transcript
import json,sys,os,subprocess
gid,out=sys.argv[1],sys.argv[2]
T='/root/.claude/projects/-home-user/8d4a219d-81b6-55cf-a925-698781637efa.jsonl'
last=None
for line in open(T):
    if gid not in line or '"sync_token"' not in line or 'file_downloads' not in line: continue
    try: o=json.loads(line)
    except: continue
    def walk(x):
        global last
        if isinstance(x,str) and x.startswith('{"status":"pulled"') and gid in x: last=x
        elif isinstance(x,dict): [walk(v) for v in x.values()]
        elif isinstance(x,list): [walk(v) for v in x]
    walk(o)
if len(sys.argv)>3: last=open(sys.argv[3]).read()  # saved tool-result file for oversized pulls
r=json.loads(last)
os.makedirs(out,exist_ok=True)
for p,c in r['files'].items():
    os.makedirs(os.path.dirname(os.path.join(out,p)) or out,exist_ok=True); open(os.path.join(out,p),'w').write(c)
for p,d in r['file_downloads'].items():
    os.makedirs(os.path.dirname(os.path.join(out,p)) or out,exist_ok=True)
    subprocess.run(['curl','-s','-o',os.path.join(out,p),d['url']],check=True)
    assert os.path.getsize(os.path.join(out,p))==d['size_bytes'],p
open(os.path.join(out,'.sync_token'),'w').write(r['session']['sync_token'])
print(r['session']['sync_token'], sorted(list(r['files'])+list(r['file_downloads'])))
