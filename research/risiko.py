# -*- coding: utf-8 -*-
"""Klaster risiko K-Means + uji korelasi risiko struktural vs insiden teramati."""
import os
import numpy as np, math, json, io
from scipy import stats

D = {
 "Aceh":(737,"SUM",0),"Sumatera Utara":(1592,"SUM",1),"Sumatera Barat":(446,"SUM",1),
 "Riau":(775,"SUM",0),"Kepulauan Riau":(263,"SUM",0),"Jambi":(234,"SUM",0),
 "Sumatera Selatan":(850,"SUM",0),"Bangka-Belitung":(106,"SUM",0),"Bengkulu":(175,"SUM",0),
 "Lampung":(1209,"SUM",0),"Banten":(1403,"JAW",0),"Jakarta Raya":(667,"JAW",1),
 "Jawa Barat":(6721,"JAW",0),"Jawa Tengah":(4590,"JAW",4),"Yogyakarta":(461,"JAW",3),
 "Jawa Timur":(4340,"JAW",2),"Bali":(277,"BNT",0),"Nusa Tenggara Barat":(871,"BNT",0),
 "Nusa Tenggara Timur":(339,"BNT",0),"Kalimantan Barat":(566,"KAL",0),
 "Kalimantan Tengah":(136,"KAL",1),"Kalimantan Selatan":(312,"KAL",0),
 "Kalimantan Timur":(326,"KAL",0),"Kalimantan Utara":(67,"KAL",0),
 "Sulawesi Utara":(203,"SUL",0),"Gorontalo":(117,"SUL",0),"Sulawesi Tengah":(239,"SUL",0),
 "Sulawesi Barat":(225,"SUL",0),"Sulawesi Selatan":(892,"SUL",1),"Sulawesi Tenggara":(328,"SUL",0),
 "Maluku":(124,"MAL",0),"Maluku Utara":(125,"MAL",0),
 "Papua":(162,"PAP",1),"Papua Barat":(113,"PAP",0)}
SUSPEND={"SUM":2.3,"JAW":9.2,"BNT":7.4,"KAL":7.4,"SUL":7.4,"MAL":7.4,"PAP":7.4}
TERPENCIL={"SUM":0.2,"JAW":0.0,"BNT":0.6,"KAL":0.5,"SUL":0.4,"MAL":0.9,"PAP":1.0}

prov=list(D); n=len(prov)
sppg=np.array([D[p][0] for p in prov],float)
y=np.array([D[p][2] for p in prov],float)
lam0=y.sum()/sppg.sum(); a=1/1.247; b=a/lam0
insiden=(y+a)/(sppg+b)*100                      # laju disusutkan
suspend=np.array([SUSPEND[D[p][1]] for p in prov])
skala=sppg.copy()
terpencil=np.array([TERPENCIL[D[p][1]] for p in prov])

# ---------- 1. K-MEANS 3 KLASTER ----------
X=np.column_stack([insiden,suspend,np.log(skala),terpencil])
Z=(X-X.mean(0))/X.std(0)
def kmeans(Z,k,seed=7,iters=300):
    rng=np.random.default_rng(seed)
    C=Z[rng.choice(len(Z),k,replace=False)].copy()
    for _ in range(iters):
        lab=np.argmin(((Z[:,None,:]-C[None])**2).sum(2),1)
        Cn=np.array([Z[lab==j].mean(0) if (lab==j).any() else C[j] for j in range(k)])
        if np.allclose(Cn,C): break
        C=Cn
    return lab,C
best=None
for s in range(40):
    lab,C=kmeans(Z,3,seed=s)
    if len(set(lab))<3: continue
    inertia=sum(((Z[lab==j]-C[j])**2).sum() for j in range(3))
    if best is None or inertia<best[0]: best=(inertia,lab,C)
inertia,lab,C=best
# silhouette
def silhouette(Z,lab):
    Dm=np.sqrt(((Z[:,None,:]-Z[None])**2).sum(2)); s=[]
    for i in range(len(Z)):
        same=lab==lab[i]; same[i]=False
        ai=Dm[i,same].mean() if same.any() else 0
        bi=min(Dm[i,lab==j].mean() for j in set(lab) if j!=lab[i])
        s.append((bi-ai)/max(ai,bi))
    return np.mean(s)
sil=silhouette(Z,lab)
# urutkan klaster dari risiko rendah ke tinggi memakai skor gabungan terstandar
mean_risk=[Z[lab==j][:, [0,1,2,3]].mean() for j in range(3)]
order=np.argsort(mean_risk); remap={old:new for new,old in enumerate(order)}
lab=np.array([remap[l] for l in lab])
NAMA=["RENDAH","SEDANG","TINGGI"]
print(f"=== K-MEANS 3 KLASTER (38->34 wilayah peta) | silhouette = {sil:.3f} ===")
for j in range(3):
    m=lab==j
    print(f"\n  {NAMA[j]}  n={m.sum()} provinsi")
    print(f"    insiden/100 SPPG {insiden[m].mean():.3f} | suspend {suspend[m].mean():.1f}% | "
          f"SPPG rata2 {sppg[m].mean():.0f} | keterpencilan {terpencil[m].mean():.2f}")
    print("    "+", ".join(np.array(prov)[m][:8])+("..." if m.sum()>8 else ""))

# ---------- 2. KORELASI TIDAK SIRKULER ----------
# skor struktural TANPA riwayat insiden, lalu diuji terhadap insiden teramati
Zs=(np.column_stack([suspend,np.log(skala),terpencil])-
    np.column_stack([suspend,np.log(skala),terpencil]).mean(0))/np.column_stack([suspend,np.log(skala),terpencil]).std(0)
w_str=np.array([0.277,0.161,0.096]); w_str=w_str/w_str.sum()
skor_str=Zs@w_str
obs=y/sppg*100
rho,p_rho=stats.spearmanr(skor_str,obs)
r_p,p_p=stats.pearsonr(skor_str,obs)
print(f"\n=== KORELASI: skor struktural (tanpa riwayat insiden) vs insiden teramati ===")
print(f"  Spearman rho = {rho:.3f}  p = {p_rho:.4f}")
print(f"  Pearson  r   = {r_p:.3f}  p = {p_p:.4f}")
print(f"  n = {n} wilayah. Riwayat insiden SENGAJA dikeluarkan agar ujinya tidak sirkuler.")

# ---------- 3. STATISTIK DESKRIPTIF PAPARAN ----------
def mu(T):
    if T<=-2.568 or T>=47.108: return 0.0
    return max(0.022*(T+2.568)*(1-math.exp(0.424*(T-47.108))),0)**2
rng=np.random.default_rng(11)
def ip_at(gap,Tamb,scale,need=3.0,k=(0.35,1.0),N=3000,dt=0.05,T0=65.0):
    out=[]
    for _ in range(N):
        kk=rng.uniform(*k); h0=rng.uniform(0.5,1.7); t=0.0; w=0.0; g=0.0
        while t<gap:
            T=Tamb+(T0-Tamb)*math.exp(-kk*t); m=mu(T)*scale
            if w<h0: w+=m*dt
            else: g+=m*dt
            t+=dt
        out.append(g/need)
    return np.array(out)
print("\n=== PAPARAN PADA JAM MAKAN SIANG (matang 06.00, santap 12.00 = jeda 6 jam) ===")
hasil={}
for nm,sc in [("Nasi tertutup",1.0),("Lauk kering",1.2),("Lauk berkuah/tersentuh",1.5)]:
    v=ip_at(6.0,27.0,sc)
    hasil[nm]=(np.median(v),np.mean(v>=1)*100)
    print(f"  {nm:24s} IP median {np.median(v):.2f} | {np.mean(v>=1)*100:5.1f}% porsi lewat ambang")
JEDA=[5.0,5.5,6.0,12.0,16.0]
print(f"\n  Median jeda kasus terdokumentasi = {np.median(JEDA):.1f} jam (n={len(JEDA)})")
print(f"  Suhu rata-rata Indonesia 2025 = 27,05 C (BMKG, 115 stasiun); Juli 2026 = 27,0 C, anomali +0,8 C")

io.open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "out", "klaster_risiko.json"),"w",
  encoding="utf-8").write(json.dumps({
  "silhouette":round(float(sil),3),
  "spearman":{"rho":round(float(rho),3),"p":round(float(p_rho),4)},
  "klaster":{prov[i]:int(lab[i]) for i in range(n)},
  "profil":[{"nama":NAMA[j],"n":int((lab==j).sum()),
             "insiden":round(float(insiden[lab==j].mean()),3),
             "suspend":round(float(suspend[lab==j].mean()),1),
             "sppg":int(sppg[lab==j].mean()),
             "terpencil":round(float(terpencil[lab==j].mean()),2)} for j in range(3)]},
  ensure_ascii=False,indent=1))
print("\nDiekspor ke visual/klaster_risiko.json")
