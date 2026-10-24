# -*- coding: utf-8 -*-
"""Analisis spasial & regresi provinsi untuk poster NSC 2026.
Sumber: SPPG per provinsi = BGN via IDN Times/GoodStats, Juni 2026 (n=29.991).
Kejadian = kejadian keracunan MBG massal yang TERDOKUMENTASI MEDIA Agu 2025-Sep 2026 (subset, bukan sensus).
Suspend per wilayah = BGN via Databoks, 29 Mei 2026 (data resmi, cakupan penuh)."""
import numpy as np, math
from scipy import stats, optimize

# ---------- 1. DATA ----------
# provinsi: (SPPG Juni 2026, pulau, kejadian terdokumentasi)
D = {
 "Aceh":(737,"SUM",0), "Sumatera Utara":(1592,"SUM",1), "Sumatera Barat":(446,"SUM",1),
 "Riau":(775,"SUM",0), "Kepulauan Riau":(263,"SUM",0), "Jambi":(234,"SUM",0),
 "Sumatera Selatan":(850,"SUM",0), "Kep. Bangka Belitung":(106,"SUM",0), "Bengkulu":(175,"SUM",0),
 "Lampung":(1209,"SUM",0),
 "Banten":(1403,"JAW",0), "DKI Jakarta":(667,"JAW",1), "Jawa Barat":(6721,"JAW",0),
 "Jawa Tengah":(4590,"JAW",4), "DI Yogyakarta":(461,"JAW",3), "Jawa Timur":(4340,"JAW",2),
 "Bali":(277,"BNT",0), "Nusa Tenggara Barat":(871,"BNT",0), "Nusa Tenggara Timur":(339,"BNT",0),
 "Kalimantan Barat":(566,"KAL",0), "Kalimantan Tengah":(136,"KAL",1), "Kalimantan Selatan":(312,"KAL",0),
 "Kalimantan Timur":(326,"KAL",0), "Kalimantan Utara":(67,"KAL",0),
 "Sulawesi Utara":(203,"SUL",0), "Gorontalo":(117,"SUL",0), "Sulawesi Tengah":(239,"SUL",0),
 "Sulawesi Barat":(225,"SUL",0), "Sulawesi Selatan":(892,"SUL",1), "Sulawesi Tenggara":(328,"SUL",0),
 "Maluku":(124,"MAL",0), "Maluku Utara":(125,"MAL",0),
 "Papua":(92,"PAP",1), "Papua Barat":(65,"PAP",0), "Papua Barat Daya":(48,"PAP",0),
 "Papua Tengah":(36,"PAP",0), "Papua Selatan":(20,"PAP",0), "Papua Pegunungan":(14,"PAP",0),
}
prov = list(D); sppg = np.array([D[p][0] for p in prov], float)
pulau = [D[p][1] for p in prov]; y = np.array([D[p][2] for p in prov], float)
jawa = np.array([1.0 if D[p][1]=="JAW" else 0.0 for p in prov])
n = len(prov)
print("Total SPPG 38 provinsi = %d (rujukan BGN: 29.991)" % sppg.sum())
print("Total kejadian terdokumentasi = %d di %d provinsi\n" % (y.sum(), (y>0).sum()))

# ---------- 2. MORAN'S I (bobot blok pulau, baris terstandardisasi) ----------
rate = y/sppg*100.0            # kejadian per 100 SPPG
W = np.array([[1.0 if (pulau[i]==pulau[j] and i!=j) else 0.0 for j in range(n)] for i in range(n)])
W = W/W.sum(1, keepdims=True)
z = rate - rate.mean()
I = (n/W.sum()) * (z @ W @ z) / (z @ z)
EI = -1.0/(n-1)
# varians di bawah asumsi randomisasi
S0=W.sum(); S1=0.5*((W+W.T)**2).sum(); S2=((W.sum(1)+W.sum(0))**2).sum()
b2 = n*(z**4).sum()/((z**2).sum()**2)
A = n*((n*n-3*n+3)*S1 - n*S2 + 3*S0*S0)
B = b2*((n*n-n)*S1 - 2*n*S2 + 6*S0*S0)
VI = (A-B)/((n-1)*(n-2)*(n-3)*S0*S0) - EI**2
zI = (I-EI)/math.sqrt(VI); pI = 2*(1-stats.norm.cdf(abs(zI)))
print("=== MORAN'S I (laju kejadian per 100 SPPG, bobot blok pulau) ===")
print("  I = %.4f | E[I] = %.4f | z = %.3f | p = %.4f  -> %s" %
      (I, EI, zI, pI, "klaster spasial NYATA" if pI<0.05 else "tidak signifikan"))

# ---------- 3. NEGATIVE BINOMIAL, offset log(SPPG) ----------
X = np.column_stack([np.ones(n), jawa]); off = np.log(sppg)
def nll(par):
    b = par[:2]; a = math.exp(par[2])
    mu = np.exp(X@b + off)
    r = 1.0/a
    return -np.sum(stats.nbinom.logpmf(y, r, r/(r+mu)))
res = optimize.minimize(nll, [-8.0, 1.0, 0.0], method="Nelder-Mead",
                        options=dict(maxiter=20000, xatol=1e-8, fatol=1e-8))
b0, b1, la = res.x; alpha = math.exp(la)
# galat baku dari Hessian numerik
h = 1e-4; H = np.zeros((3,3))
for i in range(3):
    for j in range(3):
        e1=np.zeros(3); e2=np.zeros(3); e1[i]=h; e2[j]=h
        H[i,j]=(nll(res.x+e1+e2)-nll(res.x+e1-e2)-nll(res.x-e1+e2)+nll(res.x-e1-e2))/(4*h*h)
se = np.sqrt(np.diag(np.linalg.inv(H)))
IRR = math.exp(b1); lo = math.exp(b1-1.96*se[1]); hi = math.exp(b1+1.96*se[1])
print("\n=== REGRESI BINOMIAL NEGATIF (offset log SPPG) ===")
print("  Intersep    = %.3f (SE %.3f)" % (b0, se[0]))
print("  Jawa (IRR)  = %.2f  CI95%% [%.2f - %.2f]  z = %.2f  p = %.4f" %
      (IRR, lo, hi, b1/se[1], 2*(1-stats.norm.cdf(abs(b1/se[1])))))
print("  alpha (dispersi) = %.3f" % alpha)
# uji overdispersi: LRT vs Poisson
def nllp(par):
    mu = np.exp(X@par + off); return -np.sum(stats.poisson.logpmf(y, mu))
rp = optimize.minimize(nllp, [-8.0,1.0], method="Nelder-Mead", options=dict(maxiter=20000))
LR = 2*(rp.fun - res.fun); pLR = 0.5*(1-stats.chi2.cdf(LR,1))
print("  Uji overdispersi (LRT vs Poisson): LR = %.2f, p = %.4f -> %s" %
      (LR, pLR, "NegBin tepat" if pLR<0.05 else "Poisson memadai"))
print("  Laju dasar luar Jawa = %.2f kejadian per 100 SPPG | Jawa = %.2f" %
      (math.exp(b0)*100, math.exp(b0+b1)*100))

# ---------- 4. ANGKA RESMI: SUSPEND per WILAYAH (BGN, 29 Mei 2026) ----------
print("\n=== UJI SILANG DENGAN DATA RESMI: SPPG DISUSPEND (BGN, 29 Mei 2026) ===")
grup = {"Wilayah I (Sumatera)":["SUM"], "Wilayah II (Jawa)":["JAW"],
        "Wilayah III (Kal-Sul-Nusra-Bali-Mal-Pap)":["BNT","KAL","SUL","MAL","PAP"]}
susp = {"Wilayah I (Sumatera)":148, "Wilayah II (Jawa)":1666,
        "Wilayah III (Kal-Sul-Nusra-Bali-Mal-Pap)":399}
tot_s = sum(susp.values()); base = {}
for g, ps in grup.items():
    base[g] = sum(D[p][0] for p in prov if D[p][1] in ps)
print("  %-42s %8s %8s %10s" % ("Wilayah","SPPG","suspend","% suspend"))
for g in grup:
    print("  %-42s %8d %8d %9.1f%%" % (g, base[g], susp[g], susp[g]/base[g]*100))
rj = susp["Wilayah II (Jawa)"]/base["Wilayah II (Jawa)"]
rl = (tot_s-susp["Wilayah II (Jawa)"])/(sppg.sum()-base["Wilayah II (Jawa)"])
print("  Rasio laju suspend Jawa vs luar Jawa = %.2f kali" % (rj/rl))
print("  Total suspend nasional = %d (%.1f%% dari seluruh SPPG)" % (tot_s, tot_s/sppg.sum()*100))

# ---------- 5. TABEL SIAP TEMPEL ----------
print("\n=== TABEL UNTUK POSTER: 10 provinsi laju tertinggi ===")
ordr = np.argsort(-rate)
print("  %-22s %7s %6s %12s" % ("Provinsi","SPPG","kejadian","per 100 SPPG"))
for i in ordr[:10]:
    if y[i] > 0:
        print("  %-22s %7d %6d %11.2f" % (prov[i], sppg[i], y[i], rate[i]))

# ---------- 6. PENYUSUTAN EMPIRICAL BAYES (Poisson-Gamma) ----------
print("\n=== PENYUSUTAN EMPIRICAL BAYES: laju mentah menyesatkan ===")
lam = y.sum()/sppg.sum()                      # laju nasional per SPPG
a_hat = 1.0/alpha                             # bentuk Gamma dari dispersi NegBin
b_hat = a_hat/lam
eb = (y + a_hat)/(sppg + b_hat)*100           # posterior mean per 100 SPPG
print("  Laju nasional = %.3f kejadian per 100 SPPG" % (lam*100))
print("  %-22s %7s %6s %10s %10s %8s" % ("Provinsi","SPPG","kej","mentah","EB","susut"))
for i in np.argsort(-eb)[:8]:
    print("  %-22s %7d %6d %9.2f %9.3f %7.0f%%" %
          (prov[i], sppg[i], y[i], rate[i], eb[i], (1-eb[i]/rate[i])*100 if rate[i]>0 else 0))
print("  -> Papua turun dari peringkat 1 (mentah) ke peringkat %d setelah disusutkan."
      % (list(np.argsort(-eb)).index(prov.index("Papua"))+1))
