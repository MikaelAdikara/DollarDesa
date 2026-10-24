# -*- coding: utf-8 -*-
"""Skor prioritas inspeksi: bobot AHP + agregasi SAW, 38 provinsi.
Metode ini sengaja dipilih karena transparan dan bisa diaudit, berbeda dari gradient boosting
yang butuh data hasil inspeksi yang belum tersedia untuk publik."""
import os
import numpy as np, json, io

# ---------- 1. KRITERIA ----------
# C1 laju insiden terdokumentasi (EB-shrunk, per 100 SPPG)  -> makin tinggi makin prioritas
# C2 laju suspend wilayah (%)                                -> makin tinggi makin prioritas
# C3 skala beban (jumlah SPPG)                               -> makin besar makin prioritas
# C4 keterpencilan (3T)                                      -> makin terpencil makin prioritas
KRIT = ["Riwayat insiden","Laju suspend","Skala beban","Keterpencilan"]

# Matriks perbandingan berpasangan skala Saaty (1-9).
# Riwayat insiden dianggap sedikit lebih penting dari laju suspend, jelas lebih penting dari skala,
# dan cukup lebih penting dari keterpencilan.
A = np.array([
 [1,   2,   3,   4  ],
 [1/2, 1,   2,   3  ],
 [1/3, 1/2, 1,   2  ],
 [1/4, 1/3, 1/2, 1  ]], float)

w_ = A / A.sum(0)
w = w_.mean(1)
lam = (A @ w / w).mean()
n = len(A)
CI = (lam - n) / (n - 1)
RI = {1:0,2:0,3:0.58,4:0.90,5:1.12}[n]
CR = CI / RI
print("=== BOBOT AHP ===")
for k, b in zip(KRIT, w):
    print(f"  {k:18s} {b:.4f}")
print(f"  lambda_max = {lam:.4f} | CI = {CI:.4f} | RI = {RI} | CR = {CR:.4f} -> "
      f"{'KONSISTEN (CR < 0,10)' if CR < 0.10 else 'TIDAK konsisten'}")

# ---------- 2. DATA PROVINSI ----------
D = {
 "Aceh":(737,"SUM",0),"Sumatera Utara":(1592,"SUM",1),"Sumatera Barat":(446,"SUM",1),
 "Riau":(775,"SUM",0),"Kepulauan Riau":(263,"SUM",0),"Jambi":(234,"SUM",0),
 "Sumatera Selatan":(850,"SUM",0),"Kep. Bangka Belitung":(106,"SUM",0),"Bengkulu":(175,"SUM",0),
 "Lampung":(1209,"SUM",0),"Banten":(1403,"JAW",0),"DKI Jakarta":(667,"JAW",1),
 "Jawa Barat":(6721,"JAW",0),"Jawa Tengah":(4590,"JAW",4),"DI Yogyakarta":(461,"JAW",3),
 "Jawa Timur":(4340,"JAW",2),"Bali":(277,"BNT",0),"Nusa Tenggara Barat":(871,"BNT",0),
 "Nusa Tenggara Timur":(339,"BNT",0),"Kalimantan Barat":(566,"KAL",0),
 "Kalimantan Tengah":(136,"KAL",1),"Kalimantan Selatan":(312,"KAL",0),
 "Kalimantan Timur":(326,"KAL",0),"Kalimantan Utara":(67,"KAL",0),
 "Sulawesi Utara":(203,"SUL",0),"Gorontalo":(117,"SUL",0),"Sulawesi Tengah":(239,"SUL",0),
 "Sulawesi Barat":(225,"SUL",0),"Sulawesi Selatan":(892,"SUL",1),"Sulawesi Tenggara":(328,"SUL",0),
 "Maluku":(124,"MAL",0),"Maluku Utara":(125,"MAL",0),"Papua":(92,"PAP",1),
 "Papua Barat":(65,"PAP",0),"Papua Barat Daya":(48,"PAP",0),"Papua Tengah":(36,"PAP",0),
 "Papua Selatan":(20,"PAP",0),"Papua Pegunungan":(14,"PAP",0)}
SUSPEND = {"SUM":2.3,"JAW":9.2,"BNT":7.4,"KAL":7.4,"SUL":7.4,"MAL":7.4,"PAP":7.4}
TERPENCIL = {"SUM":0.2,"JAW":0.0,"BNT":0.6,"KAL":0.5,"SUL":0.4,"MAL":0.9,"PAP":1.0}

prov = list(D)
sppg = np.array([D[p][0] for p in prov], float)
y = np.array([D[p][2] for p in prov], float)
# laju insiden disusutkan (Poisson-Gamma, alpha dari NegBin)
lam0 = y.sum()/sppg.sum(); a_hat = 1/1.247; b_hat = a_hat/lam0
c1 = (y + a_hat)/(sppg + b_hat)*100
c2 = np.array([SUSPEND[D[p][1]] for p in prov])
c3 = sppg.copy()
c4 = np.array([TERPENCIL[D[p][1]] for p in prov])

# ---------- 3. NORMALISASI SAW (benefit, makin besar makin prioritas) ----------
X = np.column_stack([c1, c2, c3, c4])
R = X / X.max(0)
skor = R @ w

# ---------- 4. HASIL ----------
order = np.argsort(-skor)
print("\n=== 12 PROVINSI PRIORITAS TERATAS (skor SAW berbobot AHP) ===")
print(f"  {'#':>2} {'Provinsi':22s} {'skor':>6} {'insiden':>8} {'suspend':>8} {'SPPG':>7} {'3T':>4}")
for r, i in enumerate(order[:12], 1):
    print(f"  {r:2d} {prov[i]:22s} {skor[i]:6.3f} {c1[i]:8.3f} {c2[i]:7.1f}% {sppg[i]:7.0f} {c4[i]:4.1f}")

print("\n=== ANALISIS SENSITIVITAS BOBOT ===")
alts = {"Setara (0,25 semua)": np.array([.25,.25,.25,.25]),
        "Riwayat dominan (0,55)": np.array([.55,.20,.15,.10]),
        "Skala dominan (0,55)": np.array([.15,.15,.55,.15])}
base_top5 = [prov[i] for i in order[:5]]
print(f"  AHP (dipakai)          : {', '.join(base_top5)}")
for nm, wa in alts.items():
    o = np.argsort(-(R @ wa))
    top5 = [prov[i] for i in o[:5]]
    sama = len(set(top5) & set(base_top5))
    print(f"  {nm:22s} : {', '.join(top5)}  [{sama}/5 sama]")

# ---------- 5. EKSPOR untuk prototipe ----------
out = [{"prov": prov[i], "skor": round(float(skor[i]),3), "sppg": int(sppg[i]),
        "insiden": round(float(c1[i]),3), "suspend": float(c2[i]), "t3": float(c4[i])}
       for i in order]
io.open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "out", "skor_prioritas.json"),"w",
        encoding="utf-8").write(json.dumps({"bobot":dict(zip(KRIT,[round(float(x),4) for x in w])),
        "CR":round(float(CR),4),"provinsi":out}, ensure_ascii=False, indent=1))
print("\nDiekspor ke visual/skor_prioritas.json")
