# usage: amap.py <game dir> - adds every CDN asset the fixed files reference (physics data, font subsets) to asset_map.json
import json,os,re,sys
d=sys.argv[1]; A=json.load(open('/tmp/claude-0/hv/assets.json')); inv={v:k for k,v in A.items()}
txt=''.join(open(os.path.join(r,f),errors='ignore').read() for r,_,fs in os.walk(d) for f in fs if f.endswith(('.html','.js')))
am=json.load(open(os.path.join(d,'asset_map.json')))
for url,k in inv.items():
    if url in txt:
        kind,h=k.split(':'); key={'rapier':'physics_data_','font':'font_subset_','model':'model_data_'}[kind]+h
        am[key]={'url':url,'type':'other','description':{'rapier':'Physics engine data (base64 gzip)','font':'Font subset (SIL Open Font License 1.1)','model':'Character model data (base64 gzip)'}[kind]}
json.dump(am,open(os.path.join(d,'asset_map.json'),'w'),indent=2); print(list(am))
