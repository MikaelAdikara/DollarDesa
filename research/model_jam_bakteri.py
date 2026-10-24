import math, numpy as np
rng=np.random.default_rng(11)
# Ratkowsky penuh, B.cereus vegetatif (Dong dkk. 2025): a=0.022 b=0.424 Tmin=-2.568 Tmax=47.108
def mu(T):
    if T<=-2.568 or T>=47.108: return 0.0
    return max(0.022*(T+2.568)*(1-math.exp(0.424*(T-47.108))),0)**2

print("=== JAM BAKTERI: kecepatan detak relatif terhadap 24 C ===")
base=mu(24)
for T in [20,22,24,26,27,28,30,32,34,36]:
    print(f"  {T} C : mu={mu(T):.4f} log/jam | detak {mu(T)/base:.2f}x | 1 jam dinding = {60*mu(T)/base:.0f} menit bakteri")

print("\n=== INDEKS PAPARAN (IP): IP=1,0 saat naik 3 log (dari 10^2 ke 10^5) ===")
NEED=3.0
for T in [24,27,30,32]:
    jam=NEED/mu(T)
    print(f"  Suhu ruang {T} C -> IP mencapai 1,0 dalam {jam:.1f} jam pertumbuhan murni (belum termasuk fase lag)")

print("\n=== TUAS KENDALI RUANG: tambahan jendela aman per penurunan suhu ===")
def ttt(Tamb,k,N0,h0,scale=1.0,T0=65.0,thr=5.0,dt=0.02):
    t=0;y=N0;w=0
    while t<48:
        T=Tamb+(T0-Tamb)*math.exp(-k*t); m=mu(T)*scale
        if w<h0: w+=m*dt
        else: y+=m*dt
        if y>=thr: return t
        t+=dt
    return 48
def p5(Tamb,scale,N0r,n=3000):
    a=np.array([ttt(Tamb,rng.uniform(0.35,1.0),rng.uniform(*N0r),rng.uniform(0.5,1.7),scale) for _ in range(n)])
    return np.percentile(a,5), np.median(a)
print("  Skenario lauk tersentuh tangan (scale=1,5; N0 2-4 log) - kasus paling kritis:")
prev=None
for T in [32,30,28,26,24,22]:
    a,b=p5(T,1.5,(2,4))
    d=f"  (+{a-prev:.2f} jam)" if prev is not None else ""
    print(f"   ruang {T} C -> p5 {a:.2f} jam | median {b:.2f} jam{d}")
    prev=a
print("\n  Ompreng berinsulasi memperlambat pendinginan (k 0.15-0.3): makanan bertahan panas >60C lebih lama")
for T in [28,32]:
    for k in [(0.15,0.30),(0.35,1.0)]:
        a=np.array([ttt(T,rng.uniform(*k),rng.uniform(2,4),rng.uniform(0.5,1.7),1.5) for _ in range(2500)])
        print(f"   ruang {T} C, k={k}: p5={np.percentile(a,5):.2f} jam median={np.median(a):.2f} jam")

print("\n=== EKONOMI CCTV (sudah wajib, jadi biaya marginal = 0 untuk kamera) ===")
sppg=29991
print(f"  Kamera: sudah diwajibkan BGN (Agu 2026) -> Rp0 tambahan")
print(f"  Sensor suhu-kelembapan ruang tunggu Rp50.000 x {sppg} dapur = Rp{sppg*50000/1e9:.1f} miliar (sekali)")
print(f"  Stiker kolorimetrik Rp150/porsi x 55,1 juta porsi x 200 hari = Rp{150*55.1e6*200/1e12:.1f} triliun/tahun -> TERLALU MAHAL")
print(f"  -> Maka stiker kolorimetrik dipakai SAMPLING: 20 ompreng/dapur/hari")
print(f"     Rp150 x 20 x {sppg} x 200 hari = Rp{150*20*sppg*200/1e9:.1f} miliar/tahun")
print(f"     Label termal biasa (tanpa kimia) untuk semua porsi: Rp30 x 55,1jt x 200 = Rp{30*55.1e6*200/1e12:.2f} triliun -> juga besar")
print(f"     Label termal sudah WAJIB sejak 17 Agu 2026 -> biayanya sudah ditanggung program, kita hanya ubah isinya = Rp0")
tot=(sppg*50000+150*20*sppg*200)/1e9
print(f"\n  TOTAL TAMBAHAN DETIK = Rp{tot:.1f} miliar/tahun")
print(f"  Anggaran MBG 2026 = Rp335 triliun -> {tot*1e9/335e12*100:.4f}% dari anggaran")
print(f"  Per porsi = Rp{tot*1e9/(55.1e6*200):.1f}")
