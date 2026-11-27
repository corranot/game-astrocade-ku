import json, time, statistics as st
M='/home/user/game-astrocade-ku/production/market/'
now=time.time()
rows=json.load(open('/tmp/claude-0/re/ac/rows.json'))
old={g['id']:g for g in json.load(open(M+'2026-11-26T1700-deep-dig/games-2026-11-26.json'))}
T_OLD=time.mktime(time.strptime('2026-11-26T17:00','%Y-%m-%dT%H:%M'))  # UTC env
T_MID=time.mktime(time.strptime('2026-11-27T07:47','%Y-%m-%dT%H:%M'))
mid={}
for r,v in json.load(open(M+'2026-11-27T0800-account-health/rows-2026-11-27.json')).items():
  for gid,g in v.get('games',{}).items(): mid[gid]=g['plays']
games={}
for r,v in rows.items():
  for i,gid in enumerate(v['ids']):
    g=v['games'][gid]; e=games.setdefault(gid,{'g':g,'rows':[]}); e['rows'].append(f'{r}#{i}')
out=[]
for gid,e in games.items():
  g=e['g']; pub=g.get('firstPublishedTimestamp') or g.get('createdAt'); age=(now-pub)/86400
  p=g['plays']; o=old.get(gid)
  gain=(p-o['plays'])*24*3600/(now-T_OLD) if o else ((p-mid[gid])*24*3600/(now-T_MID) if gid in mid else None)
  win='21h' if o else ('6.6h' if gid in mid else None)
  out.append(dict(id=gid,title=g['title'],by=g['username'],desc=g['description'],plays=p,ageD=round(age,1),
    perDayAge=round(p/max(age,0.5)),gain24=round(gain) if gain is not None else None,gainWin=win,
    likesK=round(1000*g['likeCount']/max(p,1),1),sharesK=round(1000*(g.get('shares') or 0)/max(p,1),1),
    commentsK=round(1000*(g.get('commentsCount') or 0)/max(p,1),2),remix=g['isRemix'],lb=g['hasLeaderboard'],
    ownerPlays=g['ownerTotalPlays'],followers=g['ownerFollowerCount'],thumb=g['thumbnailUrl'],
    ext=g['thumbnailUrl'].rsplit('.',1)[-1],upCover='/assets/images/' not in g['thumbnailUrl'],
    badges=g.get('cardBadges'),updatedD=round((now-g['lastUpdatedAt']/1000)/86400,1) if g.get('lastUpdatedAt') else None,
    rows=e['rows']))
out.sort(key=lambda x:-(x['gain24'] if x['gain24'] is not None else x['perDayAge']))
json.dump(out,open('/tmp/claude-0/re/ac/out/games-2026-11-27.json','w'))
print('games',len(out),'with gain',sum(1 for x in out if x['gain24'] is not None))
print('TOP 40 by 24h gain (proxy) ---')
for x in out[:40]: print(f"{x['gain24'] or 0:>7} {x['perDayAge']:>7} {x['ageD']:>5}d {x['plays']:>8} L{x['likesK']:>5} S{x['sharesK']:>5} {'R' if x['remix'] else ' '} {x['title'][:38]:38} | {x['by'][:14]:14} | {','.join(x['rows'])[:40]}")
