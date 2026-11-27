# usage: prof_before.py <cpuprofile> <ms> - self time per function+line for samples in the first <ms> of the profile
import json,collections,sys
P=json.load(open(sys.argv[1])); lim=float(sys.argv[2])
nodes={n['id']:n for n in P['nodes']}
t=P['startTime'];c=collections.Counter()
for sid,dt in zip(P['samples'],P['timeDeltas']):
    t+=dt
    if (t-P['startTime'])/1000>lim: break
    cf=nodes[sid]['callFrame']; c[(cf['functionName'] or '(anon)')+' '+cf['url'][-25:]+':'+str(cf['lineNumber']+1)]+=dt/1000
for k,v in c.most_common(30): print(round(v),k)
