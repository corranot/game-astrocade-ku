# usage: prof_incl.py <cpuprofile> <ms> - inclusive time per srcdoc function (samples in the first <ms>)
import json,collections,sys
P=json.load(open(sys.argv[1])); lim=float(sys.argv[2])
nodes={n['id']:n for n in P['nodes']}; par={}
for n in P['nodes']:
    for ch in n.get('children',[]): par[ch]=n['id']
t=P['startTime'];c=collections.Counter()
for sid,dt in zip(P['samples'],P['timeDeltas']):
    t+=dt
    if (t-P['startTime'])/1000>lim: break
    seen=set(); i=sid
    while i in nodes:
        cf=nodes[i]['callFrame']
        if 'srcdoc' in cf['url']:
            k=(cf['functionName'] or '(anon)')+':'+str(cf['lineNumber']+1)
            if k not in seen: seen.add(k); c[k]+=dt/1000
        i=par.get(i)
for k,v in c.most_common(int(sys.argv[3]) if len(sys.argv)>3 else 40): print(round(v),k)
