# -*- coding: utf-8 -*-
"""Uji balik: hitung Indeks Paparan (IP) untuk kasus MBG nyata yang jeda waktunya terdokumentasi."""
import math, numpy as np
rng = np.random.default_rng(23)

def mu(T):  # Ratkowsky penuh, B. cereus vegetatif (Dong dkk. 2025)
    if T <= -2.568 or T >= 47.108: return 0.0
    return max(0.022*(T+2.568)*(1-math.exp(0.424*(T-47.108))), 0)**2

def IP(gap_h, Tamb, k, h0, scale=1.0, T0=65.0, need=3.0, dt=0.02):
    """IP = integral pertumbuhan / 3 log. Fase lag dikonsumsi lebih dulu."""
    t, work, grow = 0.0, 0.0, 0.0
    while t < gap_h:
        T = Tamb + (T0-Tamb)*math.exp(-k*t)
        m = mu(T)*scale
        if work < h0: work += m*dt
        else: grow += m*dt
        t += dt
    return grow/need

# kasus: (nama, jeda jam, suhu ruang perkiraan, skenario)
KASUS = [
    ("Kepatuhan penuh 4 jam @27C (pembanding)", 4.0, 27, "tertutup"),
    ("SMPN 3 Berbah, Sleman (27/8/2025)",        5.5, 28, "tersentuh"),
    ("SDN Jakarta Timur (8/5/2026)",             5.0, 30, "tersentuh"),
    ("Sidoarjo, jeda diperkirakan (1/9/2026)",   6.0, 30, "tersentuh"),
    ("SMKN 6 Semarang, masak malam (31/7/2026)",12.0, 29, "tersentuh"),
    ("Jayapura, Papua (5/8/2026)",              16.0, 27, "tersentuh"),
]
PAR = {"tertutup":  dict(k=(0.35,1.0), scale=1.0),
       "tersentuh": dict(k=(0.35,1.0), scale=1.5)}

print("=== UJI BALIK MODEL TERHADAP KASUS NYATA ===")
print("Monte Carlo 4000 run/kasus; h0~U(0,5;1,7); k sesuai skenario. IP>=1,0 = lewat ambang 10^5 CFU/g\n")
print(f"{'Kasus':44s} {'jeda':>5s} {'suhu':>5s} {'IP p50':>8s} {'IP p5':>7s} {'P(IP>=1)':>9s}")
hasil=[]
for nama, gap, T, sk in KASUS:
    pr = PAR[sk]
    v = np.array([IP(gap, T, rng.uniform(*pr['k']), rng.uniform(0.5,1.7), pr['scale']) for _ in range(4000)])
    hasil.append((nama, gap, np.median(v), np.mean(v>=1)))
    print(f"{nama:44s} {gap:5.1f} {T:4d}C {np.median(v):8.2f} {np.percentile(v,5):7.2f} {np.mean(v>=1):9.0%}")

print("\n=== PEMISAHAN ===")
patuh = hasil[0]
insiden = hasil[1:]
print(f"Pembanding patuh 4 jam : IP median {patuh[2]:.2f}, P(lewat ambang) {patuh[3]:.0%}")
print(f"Kasus insiden nyata    : IP median {min(h[2] for h in insiden):.2f}-{max(h[2] for h in insiden):.2f}, "
      f"P(lewat ambang) {min(h[3] for h in insiden):.0%}-{max(h[3] for h in insiden):.0%}")
n_lewat = sum(1 for h in insiden if h[3] >= 0.5)
print(f"{n_lewat} dari {len(insiden)} kasus insiden punya peluang >=50% melewati ambang; pembanding patuh tidak.")

print("\n=== BATAS AMAN YANG DIHITUNG ULANG (IP p95 = 1,0) ===")
for T in [24,27,30,32]:
    for sk in ["tertutup","tersentuh"]:
        pr=PAR[sk]; lo,hi=0.5,24.0
        for _ in range(40):
            mid=(lo+hi)/2
            v=np.array([IP(mid,T,rng.uniform(*pr['k']),rng.uniform(0.5,1.7),pr['scale']) for _ in range(700)])
            if np.percentile(v,95) < 1.0: lo=mid
            else: hi=mid
        print(f"  {T}C {sk:10s}: batas aman {lo:.1f} jam  (aturan berlaku: 4,0 jam)")
