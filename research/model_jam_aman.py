import numpy as np, math
from math import comb, sqrt, exp, log
rng = np.random.default_rng(7)

# --- (a) Cooling + growth (B. cereus vegetative, Dong et al. 2025 full Ratkowsky: a=0.022,b=0.424,Tmin=-2.568,Tmax=47.108; mu in log10/h)
def mu(T):
    if T<=-2.568 or T>=47.108: return 0.0
    s=0.022*(T+2.568)*(1-math.exp(0.424*(T-47.108)))
    return max(s,0)**2
def time_to_threshold(Tamb,k,N0,h0,T0=65.0,thr=5.0,ymax=8.0,dt=0.05):
    t=0; y=N0; work=0.0
    while t<48:
        T=Tamb+(T0-Tamb)*math.exp(-k*t)
        m=mu(T)
        if work<h0: work+=m*dt          # lag consumed (Baranyi h0 approach)
        else: y+=m*dt
        if y>=thr: return t
        t+=dt
    return 48.0
print("=== (a) JAM AMAN: waktu dari matang (65C) sampai 10^5 CFU/g ===")
print("Monte Carlo 4000 run/suhu; N0~U(1,3) log; h0~U(0.5,1.7); k~U(0.35,1.0)/h (ompreng tertutup dlm box s.d. terbuka)")
for Tamb in [22,24,26,27,28,30,32,34]:
    ts=[]
    for _ in range(4000):
        ts.append(time_to_threshold(Tamb,rng.uniform(0.35,1.0),rng.uniform(1,3),rng.uniform(0.5,1.7)))
    ts=np.array(ts)
    print(f"Tamb={Tamb:2d}C  p5={np.percentile(ts,5):4.1f} h  p10={np.percentile(ts,10):4.1f}  median={np.median(ts):4.1f} h  P(<4h)={np.mean(ts<4):.2f}")
print("Deterministic (N0=2, h0=1.2, k=0.6):")
for Tamb in [24,28,32]:
    print(f"  Tamb={Tamb}: {time_to_threshold(Tamb,0.6,2,1.2):.1f} h")

# --- (b) p-chart n=20, p0=0.02
n=20; p0=0.02
UCL=p0+3*sqrt(p0*(1-p0)/n); c=math.ceil(UCL*n)  # min count exceeding UCL
def P_ge(c,p): return sum(comb(n,x)*p**x*(1-p)**(n-x) for x in range(c,n+1))
print(f"\n=== (b) p-chart n={n}, p0={p0}: UCL={UCL:.3f} -> sinyal jika >= {c} dari 20 ompreng lewat batas")
print(f"ARL0 (alarm palsu) = {1/P_ge(c,p0):.0f} hari")
for p1 in [0.05,0.10,0.15,0.20]:
    print(f"  pergeseran ke p={p1:.2f}: P(sinyal/hari)={P_ge(c,p1):.3f}  ARL1={1/P_ge(c,p1):.1f} hari")

# --- (c) Dorfman pooling
print("\n=== (c) Uji gabungan Dorfman ===")
for p in [0.01,0.02,0.03,0.05,0.10]:
    best=min(range(2,40),key=lambda k:1/k+1-(1-p)**k)
    e=1/best+1-(1-p)**best
    print(f"p={p:.2f}: n*={best:2d} (1/sqrt p={1/sqrt(p):.1f})  uji/sampel={e:.2f}  hemat={100*(1-e):.0f}%")
tarif=550_000; sppg=29_991; par=2
print(f"\n1 putaran uji semua SPPG ({sppg}) x {par} parameter x Rp{tarif:,}= Rp{sppg*par*tarif/1e9:.1f} miliar")
for p in [0.02,0.05]:
    best=min(range(2,40),key=lambda k:1/k+1-(1-p)**k); e=1/best+1-(1-p)**best
    print(f"  dgn pooling p={p}: Rp{sppg*par*tarif*e/1e9:.1f} miliar")

# --- (d) base rate framing
porsi_hari=55.1e6
print(f"\n=== (d) Denominator ===")
print(f"50.059 korban / 560 kejadian = {50059/560:.0f} korban/kejadian (median jauh lebih kecil; ekor: 777 Lasem, 730 Sidoarjo, 707 Semarang)")
print(f"560 kejadian / 29.991 SPPG = {560/29991*100:.2f}% SPPG pernah kejadian (kumulatif)")
print(f"Porsi/tahun ajaran (200 hari) = {porsi_hari*200/1e9:.1f} miliar; 0,0007% x itu = {0.000007*porsi_hari*200:,.0f} orang")
