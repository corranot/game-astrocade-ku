# usage: prof-top.py <file.cpuprofile> [until_ms] - self time per function (and per script line) up to until_ms after start
import json, sys, collections
P = json.load(open(sys.argv[1])); until = float(sys.argv[2]) * 1e6 if len(sys.argv) > 2 else 1e18
nodes = {n['id']: n for n in P['nodes']}
t = P['startTime']; self_ = collections.Counter()
for sid, dt in zip(P['samples'], P['timeDeltas']):
    t += dt
    if t - P['startTime'] > until: break
    cf = nodes[sid]['callFrame']; self_[(cf['functionName'] or '(anon)', cf['url'][-30:], cf['lineNumber'])] += dt
for (fn, url, ln), us in self_.most_common(25): print(f'{us/1000:8.0f} ms  {fn[:40]:40s} {url}:{ln}')
