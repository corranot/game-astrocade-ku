# PROTOTYPE - NOT FOR PRODUCTION
# Pacing model behind plan.md section 7: a greedy bot that stops at 2 stars, 65% path efficiency, Flow x1.15,
# buys the cheapest upgrade it can afford. W = deck width (m), S = speed (m/s), B = bale size (m2 of clippings).
# Run: python3 pace-model.py
areas=[60,110,170,240,320,400,480,560,640,740,860,1000]
N=9
W=[round(1.2+1.2*i/N,2) for i in range(N+1)]; S=[round(3.0+1.8*i/N,2) for i in range(N+1)]; B=[30,40,52,66,82,100,120,142,166,192]
base={'w':50,'s':40,'b':30}; G=1.72
cost=lambda k,l: round(base[k]*G**l/5)*5
lv={'w':0,'s':0,'b':0}; coins=0; t=0; eff=0.65; flow=1.15
rows=[]
for i,a in enumerate(areas,1):
    rate=W[lv['w']]*S[lv['s']]*eff*flow
    cut=a*0.97
    bales=cut/B[lv['b']]
    job=cut/rate + bales*1.2 + 6 + (4 if i>2 else 0)
    earn=round(cut*1.0 + a*0.25*2 + 6+2*i)
    t+=job+9
    coins+=earn; bought=[]
    while True:
        opts=[(cost(k,lv[k]),k) for k in lv if lv[k]<N]
        if not opts: break
        c,k=min(opts)
        if c>coins: break
        coins-=c; lv[k]+=1; bought.append(k+str(lv[k])); t+=2
    rows.append((i,a,round(job),earn,round(t/60,1),dict(lv),coins,bought))
    print(f"{i:2d} area {a:4d} job {job:5.0f}s earn {earn:4d} cum {t/60:5.1f} min lv {lv} left {coins} bought {bought}")
print('costs', {k:[cost(k,l) for l in range(N)] for k in base}); print('W',W,'S',S)
