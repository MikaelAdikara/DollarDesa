# -*- coding: utf-8 -*-
"""C18: proyeksi korban keracunan MBG.
Pendekatan: laju insidensi 2026 ditahan tetap, lalu dikalikan rencana skala program.
Model tren SENGAJA tidak dipakai: hanya ada tiga ruas waktu 2026, dan porsi kumulatif
tahun 2025 (masa perintisan) tidak terdokumentasi cukup andal untuk dijadikan pembanding."""
import os, math, csv
import numpy as np, matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from scipy import stats
BASE=os.path.dirname(os.path.abspath(__file__)); OUT=os.path.join(BASE,"out")
INK="#12263A"; PAPER="#F3F5F7"; ORANGE="#F26A1B"; TEAL="#1B998B"
AMBER="#F2B705"; STEEL="#8A9BB0"; LINE="#D5DCE4"; WHITE="#FFFFFF"
DISP="Barlow Condensed"; MONO="IBM Plex Mono"
plt.rcParams.update({"figure.facecolor":PAPER,"axes.facecolor":PAPER,"savefig.facecolor":PAPER,
 "font.family":"Segoe UI","text.color":INK,"axes.labelcolor":INK,"xtick.color":INK,
 "ytick.color":INK,"axes.edgecolor":LINE,"axes.linewidth":1,"xtick.major.size":0,
 "ytick.major.size":0,"font.size":11,"figure.dpi":110})

# ---- RUAS 2026 (JPPI) : (label, korban, hari sekolah, porsi/hari) ----
RUAS=[("Jan – pertengahan Mei", 9167, 88, 55.1e6),
      ("Pertengahan Mei – awal Agu", 3489, 40, 55.1e6),
      ("Agustus", 3079, 20, 55.1e6)]
y=np.array([r[1] for r in RUAS],float)
porsi=np.array([r[2]*r[3] for r in RUAS])
laju=y/porsi*1e6
print("=== LAJU INSIDENSI TERAMATI 2026 ===")
for r,p_,l in zip(RUAS,porsi,laju):
    print(f"  {r[0]:28s} {r[1]:6,d} korban / {p_/1e9:4.2f} miliar porsi = {l:.2f} per juta".replace(",","."))
lj_tot=y.sum()/porsi.sum()*1e6
print(f"  {'Gabungan Jan–Agu 2026':28s} {y.sum():6,.0f} korban / {porsi.sum()/1e9:4.2f} miliar = {lj_tot:.2f} per juta".replace(",","."))
print(f"  Agustus {laju[2]/lj_tot:.2f}x laju gabungan -> ada kenaikan mutakhir")

# ---- PROYEKSI: laju ditahan tetap, skala dikalikan ----
def proj(laju_per_juta, hari, porsi_hari):
    P=porsi_hari*hari; mu=laju_per_juta/1e6*P
    lo,hi=stats.poisson.ppf([0.025,0.975],mu)
    return mu,lo,hi
SKEN=[("Sep – Des 2026\nlaju & skala tetap", lj_tot, 70, 55.1e6, AMBER),
      ("Tahun ajaran 2027\nlaju tetap, skala tetap", lj_tot, 200, 55.1e6, ORANGE),
      ("Tahun ajaran 2027\nlaju tetap, skala 82,9 juta", lj_tot, 200, 82.9e6, ORANGE),
      ("Tahun ajaran 2027\nlaju Agustus, skala 82,9 juta", laju[2], 200, 82.9e6, ORANGE)]
print("\n=== PROYEKSI KORBAN BARU (skenario, bukan ramalan) ===")
H=[]
for nm,lj,hari,ph,c in SKEN:
    mu,lo,hi=proj(lj,hari,ph); H.append((nm,mu,lo,hi,c))
    print(f"  {nm.replace(chr(10),' | '):48s} {mu:8,.0f}  [{lo:,.0f} ; {hi:,.0f}]".replace(",","."))
base=H[2][1]
print("\n=== BILA DETAK BERJALAN (skenario ketiga sebagai dasar) ===")
for f in [0.5,0.6,0.7]:
    for e in [0.6,0.8]:
        print(f"  {f:.0%} insiden berjejak waktu-suhu x {e:.0%} tertangkap -> "
              f"{base*f*e:8,.0f} dicegah, sisa {base*(1-f*e):8,.0f}".replace(",","."))
CEGAH=base*0.6*0.7

# ---- GAMBAR ----
fig,(ax,ax2)=plt.subplots(1,2,figsize=(14.6,5.6),gridspec_kw={"width_ratios":[1,1.3],"wspace":0.40})
xs=np.arange(3)
bb=ax.bar(xs,laju,color=[TEAL,TEAL,ORANGE],width=.58,zorder=3)
ax.axhline(lj_tot,color=INK,lw=1.7,ls=(0,(5,3)))
ax.text(2.42,lj_tot+0.06,f"rata-rata Jan–Agu  {lj_tot:.2f}".replace(".",","),ha="right",
        fontsize=10,fontfamily=MONO,color=INK)
for b_,l in zip(bb,laju):
    ax.text(b_.get_x()+b_.get_width()/2,l+0.07,f"{l:.2f}".replace(".",","),ha="center",
            fontsize=14,fontfamily=MONO,fontweight="bold",color=INK)
ax.text(2,laju[2]/2,"naik 45%\ndi Agustus",ha="center",va="center",fontsize=11.5,
        color=WHITE,fontweight="bold",linespacing=1.3)
ax.set_xticks(xs); ax.set_xticklabels([r[0].replace(" – ","\n") for r in RUAS],fontsize=10)
ax.set_ylim(0,3.6)
for s in ("top","right"): ax.spines[s].set_visible(False)
ax.grid(axis="y",color=LINE,lw=.9); ax.set_axisbelow(True)
ax.set_ylabel("korban per juta porsi")
ax.set_title("Laju insidensi 2026",fontfamily=DISP,fontsize=16,fontweight=700,loc="left",pad=24)
ax.text(0,1.035,"Korban dibagi porsi yang benar-benar disajikan pada ruas itu.",
        transform=ax.transAxes,fontsize=10.2,color=STEEL,va="bottom")

nm=[h[0] for h in H]; mu=[h[1] for h in H]; lo=[h[2] for h in H]; hi=[h[3] for h in H]
bb2=ax2.barh(range(4),mu,color=[h[4] for h in H],height=.56,zorder=3)
ax2.errorbar(mu,range(4),xerr=[np.array(mu)-np.array(lo),np.array(hi)-np.array(mu)],
             fmt="none",ecolor=INK,elinewidth=1.5,capsize=6,capthick=1.5,zorder=5)
ax2.barh([2],[CEGAH],color=TEAL,height=.56,zorder=4)
ax2.text(CEGAH/2,2,f"{CEGAH:,.0f}\ndicegah".replace(",","."),ha="center",va="center",
         fontsize=11,color=WHITE,fontweight="bold",linespacing=1.25)
for i,v in enumerate(mu):
    ax2.text(hi[i]*1.02,i,f"{v:,.0f}".replace(",","."),va="center",fontsize=12.5,
             fontfamily=MONO,fontweight="bold",color=INK)
ax2.set_yticks(range(4)); ax2.set_yticklabels(nm,fontsize=10.2)
ax2.invert_yaxis(); ax2.set_xlim(0,max(hi)*1.26)
for s in ("top","right"): ax2.spines[s].set_visible(False)
ax2.grid(axis="x",color=LINE,lw=.9); ax2.set_axisbelow(True)
ax2.set_xlabel("proyeksi korban baru")
ax2.set_title("Bila tidak ada yang berubah",fontfamily=DISP,fontsize=16,fontweight=700,loc="left",pad=24)
ax2.text(0,1.035,"Batang teal: bagian yang dicegah bila DETAK menahan 60% insiden berjejak waktu-suhu "
         "dengan tingkat tangkap 70%.",transform=ax2.transAxes,fontsize=10.2,color=STEEL,va="bottom")
fig.text(0.008,1.085,"PROYEKSI KORBAN KERACUNAN MBG",ha="left",fontfamily=DISP,
         fontsize=23,fontweight=700,color=INK)
fig.text(0.008,1.032,"Laju insidensi 2026 ditahan tetap, lalu dikalikan rencana skala program. "
         "Ini skenario “bila tidak ada yang berubah”, bukan ramalan deret waktu.",
         fontsize=10.8,color=STEEL,ha="left")
fig.text(0.005,-0.055,"Sumber korban: JPPI, 15.735 korban Jan–Agu 2026 (termasuk 3.079 pada Agustus). "
         "Porsi: BGN, 55,1 juta per hari, target 82,9 juta. Selang dihitung dari sebaran Poisson. "
         "Tahun 2025 TIDAK dipakai sebagai pembanding karena porsi kumulatif masa perintisan tidak "
         "terdokumentasi cukup andal. Model tren tidak dipakai karena hanya tersedia tiga ruas waktu.",
         fontsize=8.3,color=STEEL,ha="left",va="top")
for e in ("png","svg"):
    fig.savefig(os.path.join(OUT,f"C18_proyeksi_korban.{e}"),dpi=300,bbox_inches="tight",pad_inches=0.32)
print("\n  -> C18_proyeksi_korban")

with open(os.path.join(BASE,"data","13_proyeksi_korban.csv"),"w",newline="",encoding="utf-8-sig") as f:
    w=csv.writer(f,delimiter=";")
    w.writerow(["jenis","keterangan","korban","porsi_miliar","laju_per_juta_porsi","batas_bawah","batas_atas"])
    for r,p_,l in zip(RUAS,porsi,laju):
        w.writerow(["teramati",r[0]+" 2026",r[1],f"{p_/1e9:.2f}".replace(".",","),
                    f"{l:.2f}".replace(".",","),"",""])
    w.writerow(["teramati","Gabungan Jan-Agu 2026",int(y.sum()),f"{porsi.sum()/1e9:.2f}".replace(".",","),
                f"{lj_tot:.2f}".replace(".",","),"",""])
    for nm2,m,l2,h2,_ in H:
        w.writerow(["proyeksi",nm2.replace("\n"," "),f"{m:.0f}","","",f"{l2:.0f}",f"{h2:.0f}"])
    w.writerow(["skenario","DETAK 60% jejak x 70% tangkap",f"{CEGAH:.0f}","","","",""])
print("  -> data/13_proyeksi_korban.csv")
