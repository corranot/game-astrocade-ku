import json, time, collections
M='/home/user/game-astrocade-ku/production/market/'
def ts(s): return time.mktime(time.strptime(s,'%Y-%m-%dT%H:%M'))
snaps=[]  # (time, label, ids, gamesinfo)
def addfeed(f,t):
  d=json.load(open(M+f)); tp=d['top_picks']
  if isinstance(tp,dict): snaps.append((ts(t),f,tp['ids'],{k:dict(plays=v['plays'],pub=v.get('firstPublishedTimestamp'),title=v['title'],by=v['username']) for k,v in tp.get('games',{}).items()}))
  else: snaps.append((ts(t),f,[g['id'] for g in tp],{g['id']:dict(plays=g['plays'],pub=g.get('published'),title=g['title'],by=g['by']) for g in tp}))
for f,t in [('2026-11-18T1659/feed.json','2026-11-18T16:59'),('2026-11-20T0749/feed.json','2026-11-20T07:49'),('2026-11-24T1035/feed.json','2026-11-24T10:35'),('2026-11-25T1244/feed.json','2026-11-25T12:44'),('2026-11-26T1700-deep-dig/rows-2026-11-26.json','2026-11-26T17:00'),('2026-11-27T0600-soap-carving-audit/rows-2026-11-27.json','2026-11-27T05:45'),('2026-11-27T0800-account-health/rows-2026-11-27.json','2026-11-27T07:47'),('2026-11-27T1215-wonder-sprout-fit/rows-2026-11-27.json','2026-11-27T12:15')]:
  try: addfeed(f,t)
  except Exception as e: print('skip',f,e)
# 26 Nov 10 samples
for g in json.load(open(M+'2026-11-26T1700-deep-dig/players-choice-pool-10-samples.json')):
  pass
S=json.load(open('/tmp/claude-0/re/ac/pc-samples.json'))
for s in S:
  t=time.mktime(time.strptime(s['t'][:16],'%Y-%m-%dT%H:%M'))
  snaps.append((t,'now '+s['t'][11:19],s['ids'],{k:dict(plays=v['plays'],pub=v.get('firstPublishedTimestamp'),title=v['title'],by=v['username'],g=v) for k,v in s['games'].items()}))
snaps.sort()
NOW=time.time()
fill={g['id']:dict(title=g['title'],by=g['by'],pub=NOW-g['ageD']*86400,plays=g['plays']) for g in json.load(open('/tmp/claude-0/re/ac/out/games-2026-11-27.json'))}
for g in json.load(open(M+'2026-11-26T1700-deep-dig/games-2026-11-26.json')):
  fill.setdefault(g['id'],dict(title=g['title'],by=g['by'],pub=ts('2026-11-26T17:00')-g['age']*86400,plays=g['plays']))
for g in json.load(open(M+'2026-11-27T1215-wonder-sprout-fit/top-by-daily-gain.json')):
  fill.setdefault(g['id'],dict(title=g['title'],by='?',pub=ts('2026-11-27T12:15')-g['ageD']*86400,plays=g['plays']))
info={}; first={}; seen=collections.Counter()
for t,l,ids,gi in snaps:
  for i in ids:
    if i in gi: info.setdefault(i,{}).update({k:v for k,v in gi[i].items() if v is not None})
    if i not in first: first[i]=(t,l,gi.get(i,{}).get('plays'))
cur=collections.Counter(); 
for s in S: cur.update(s['ids'])
print('snapshots',len(snaps),'distinct PC games ever',len(first),'now samples',len(S),'distinct now',len(cur))
rows=[]
for i,(t,l,p) in first.items():
  inf={**fill.get(i,{}),**info.get(i,{})}; pub=inf.get('pub')
  ageFirst=(t-pub)/86400 if pub else None
  rows.append((ageFirst if ageFirst is not None else 999,i,l,p,inf.get('title'),inf.get('by'),cur.get(i,0),inf.get('plays')))
rows.sort()
print('ageAtFirstSeen | firstSeen | plays then | now-seen/%d | title | by'%len(S))
for a,i,l,p,ti,by,c,pn in rows: print(f"{a:6.1f}d {l[:28]:28} {p or 0:>8} {c:>3} {pn or 0:>8} {str(ti)[:40]:40} {by}")
json.dump({'first':first,'cur':cur},open('/tmp/claude-0/re/ac/out/pc-history.json','w'))
