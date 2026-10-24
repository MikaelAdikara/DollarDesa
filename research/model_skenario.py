import numpy as np, math
rng=np.random.default_rng(3)
def mu_bc(T):
    if T<=-2.568 or T>=47.108: return 0.0
    return max(0.022*(T+2.568)*(1-math.exp(0.424*(T-47.108))),0)**2
def ttt(Tamb,k,N0,h0,scale=1.0,T0=65.0,thr=5.0,dt=0.05):
    t=0;y=N0;work=0
    while t<48:
        T=Tamb+(T0-Tamb)*math.exp(-k*t); m=mu_bc(T)*scale
        if work<h0: work+=m*dt
        else: y+=m*dt
        if y>=thr: return t
        t+=dt
    return 48
sc={"A. Ompreng, B.cereus, N0 1-3 log (dasar)":dict(k=(0.35,1.0),N0=(1,3),scale=1.0),
    "B. Curah/panci besar (k 0.15-0.3), B.cereus":dict(k=(0.15,0.3),N0=(1,3),scale=1.0),
    "C. Ompreng, rekontaminasi handler (S.aureus/Salmonella ~1.5x, N0 2-4)":dict(k=(0.35,1.0),N0=(2,4),scale=1.5),
    "D. Curah + rekontaminasi (kasus masak malam)":dict(k=(0.15,0.3),N0=(2,4),scale=1.5)}
for name,s in sc.items():
    print(name)
    for Tamb in [24,28,32]:
        ts=np.array([ttt(Tamb,rng.uniform(*s['k']),rng.uniform(*s['N0']),rng.uniform(0.5,1.7),s['scale']) for _ in range(2500)])
        print(f"   Tamb={Tamb}: p5={np.percentile(ts,5):4.1f}h median={np.median(ts):4.1f}h P(<4h)={np.mean(ts<4):.2f} P(<6h)={np.mean(ts<6):.2f}")
