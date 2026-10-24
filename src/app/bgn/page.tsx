import type { Metadata } from "next";
import { GeoMap } from "@/components/geo-map";
import { InfoTip } from "@/components/info-tip";
import { Tour } from "@/components/tour";
import { Funnel } from "@/components/viz";
import { PersonaGate } from "@/components/persona-gate";
import { Eyebrow, fmtInt, fmtPct } from "@/components/ui";
import { fmtDateLong } from "@/lib/pilot/clock";
import { historyDay, pastDays, summarize, type BatchState } from "@/lib/pilot/engine";
import { NATIONAL, PILOT_TOTAL_SPPG, PROVINCES, type ProvinceId } from "@/lib/pilot/reference";
import { dayContext } from "@/lib/server/context";

export const metadata: Metadata = { title: "Dashboard pilot BGN" };
export const dynamic = "force-dynamic";

interface DayKpi {
  date: string;
  complete: number; // share of batches with all 4 checkpoints recorded
  heldShare: number; // held / (held + served over), among batches that reached IP >= 1
  overPerMillion: number; // portions served with IP >= 1 per million portions
  overBatches: number;
}

function kpi(date: string, states: BatchState[]): DayKpi {
  const total = states.length || 1;
  const complete = states.filter((s) => s.missing.length === 0).length / total;
  const over = states.filter((s) => s.ipAtMeal >= 1);
  const held = over.filter((s) => s.held).length;
  const servedPortions = over.filter((s) => !s.held).reduce((a, s) => a + s.batch.school.portions, 0);
  const portions = states.reduce((a, s) => a + s.batch.school.portions, 0) || 1;
  return { date, complete, heldShare: over.length ? held / over.length : 1, overPerMillion: (servedPortions / portions) * 1e6, overBatches: over.length };
}

function Spark({ values, max, color = "#3b5a2c" }: { values: number[]; max: number; color?: string }) {
  const W = 160;
  const H = 36;
  const x = (i: number) => (i / Math.max(1, values.length - 1)) * W;
  const y = (v: number) => H - (Math.min(v, max) / max) * (H - 4) - 2;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-9 w-40" aria-hidden>
      <polyline points={values.map((v, i) => `${x(i)},${y(v)}`).join(" ")} fill="none" stroke={color} strokeWidth={2} />
      <circle cx={x(values.length - 1)} cy={y(values.at(-1) ?? 0)} r={3} fill={color} />
    </svg>
  );
}

const PHASES = [
  { name: "Persiapan", from: "2026-11-01", to: "2026-12-31", text: "Modul ke-8 dipasang di SIPGN, alat dibagikan, petugas SPPG dilatih" },
  { name: "Pilot", from: "2027-01-04", to: "2027-06-30", text: "DIY · Papua · Sumbar, 999 SPPG. Kalibrasi Indeks Paparan dengan data lapangan" },
  { name: "Nasional", from: "2027-07-01", to: "2027-12-31", text: "29.991 SPPG, urutan perluasan mengikuti antrean inspeksi" },
];

export default async function BgnPage({ searchParams }: { searchParams: Promise<{ t?: string }> }) {
  const { t } = await searchParams;
  const { clock, states } = await dayContext(t);
  const days = pastDays(clock.serviceDate, 10);
  const perProv = PROVINCES.map((p) => {
    const series = days.map((d) => kpi(d, historyDay(d, p.id)));
    const today = summarize(states.filter((s) => s.province.id === p.id));
    const last = series.at(-1)!;
    const avg = (f: (k: DayKpi) => number) => series.reduce((a, k) => a + f(k), 0) / series.length;
    return { p, series, today, last, avgComplete: avg((k) => k.complete), avgHeld: avg((k) => k.heldShare), avgOver: avg((k) => k.overPerMillion) };
  });
  const allSeries = days.map((d) => kpi(d, PROVINCES.flatMap((p) => historyDay(d, p.id as ProvinceId))));
  const avgAll = (f: (k: DayKpi) => number) => allSeries.reduce((a, k) => a + f(k), 0) / allSeries.length;
  const totalPortions = summarize(states).portions;
  const overToday = states.filter((s) => s.ipAtMeal >= 1);
  const funnel = [
    { label: "Porsi dipantau hari ini", value: totalPortions, note: `${fmtInt(states.length)} batch dari ${fmtInt(PILOT_TOTAL_SPPG)} SPPG`, color: "#3b5a2c" },
    { label: "Data suhu lengkap sejauh ini", value: states.filter((s) => s.missing.length === 0).reduce((a, s) => a + s.batch.school.portions, 0), note: "semua titik cek yang sudah jatuh tempo tercatat", color: "#6b8a55" },
    { label: "Diproyeksikan IP ≥ 1,0 saat makan", value: overToday.reduce((a, s) => a + s.batch.school.portions, 0), note: "butuh tindakan", color: "#e5600e" },
    { label: "Ditahan, tidak dibagikan", value: overToday.filter((s) => s.held).reduce((a, s) => a + s.batch.school.portions, 0), note: "oleh guru piket, SPPG, atau Satgas", color: "#17201a" },
    { label: "Tersaji di atas ambang", value: overToday.filter((s) => !s.held && s.phase === "disantap").reduce((a, s) => a + s.batch.school.portions, 0), note: "sasaran pilot: mendekati nol", color: "#cc3418" },
  ];
  const today = new Date(clock.now);
  const tl0 = Date.parse("2026-10-01");
  const tl1 = Date.parse("2028-01-01");
  const pos = (d: string | number) => `${((Date.parse(String(d)) || Number(d)) - tl0) / (tl1 - tl0) * 100}%`;
  const ratio = NATIONAL.lossScenariosRp.map((l) => l / NATIONAL.investmentRp);

  return (
    <main className="mx-auto max-w-7xl px-4 pb-24 pt-6 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Eyebrow>Dashboard pilot · Tim Kendali BGN · {fmtDateLong(clock.serviceDate)}</Eyebrow>
        <PersonaGate role="bgn" />
      </div>
      <h1 className="mt-2 max-w-3xl font-display text-4xl font-extrabold tracking-tight">Apakah pilot layak diperluas ke 29.991 dapur?</h1>
      <p className="mt-3 max-w-3xl text-ink-2">
        Tiga indikator keberhasilan dari proposal DETAK, dihitung dari {fmtInt(PILOT_TOTAL_SPPG)} SPPG pilot selama 10 hari sekolah terakhir. Angka di sini berasal dari simulasi operasi pilot; strukturnya sama dengan laporan yang akan ditarik dari SIPGN.
      </p>

      <section data-tour="timeline" aria-label="Tahapan" className="card mt-8 p-5">
        <div className="relative h-16">
          <div className="absolute inset-x-0 top-7 h-1.5 rounded-full bg-steel-2" />
          {PHASES.map((ph, i) => (
            <div key={ph.name} className="absolute top-5 h-5 rounded-md" style={{ left: pos(ph.from), width: `calc(${pos(ph.to)} - ${pos(ph.from)})`, background: ["#3b5a2c", "#e5600e", "#2c4520"][i] }}>
              <span className="absolute -top-5 left-1 whitespace-nowrap text-xs font-bold">{ph.name}</span>
            </div>
          ))}
          <div className="absolute top-2 h-12 w-0.5 bg-ink" style={{ left: pos(today.getTime()) }}>
            <span className="absolute left-1.5 top-9 whitespace-nowrap font-mono text-[11px] font-semibold">hari ini</span>
          </div>
        </div>
        <div className="mt-4 grid gap-3 text-sm md:grid-cols-3">
          {PHASES.map((ph) => (
            <p key={ph.name} className="text-ink-2">
              <b className="text-ink">{ph.name}</b> · {ph.text}
            </p>
          ))}
        </div>
      </section>

      <section data-tour="kpi" className="mt-6 grid gap-4 lg:grid-cols-3">
        {[
          { title: "Batch dengan data suhu lengkap", value: fmtPct(avgAll((k) => k.complete)), goal: "Target usulan ≥ 95%", info: "Batch yang keempat titik ceknya tercatat, dibagi semua batch. Rata-rata 10 hari sekolah terakhir; garis kecil per provinsi menunjukkan tren hariannya.", key: "complete" as const, max: 1, fmt: (v: number) => fmtPct(v, 0) },
          { title: "Batch IP ≥ 1 yang tertahan sebelum disantap", value: fmtPct(avgAll((k) => k.heldShare)), goal: "Target usulan ≥ 90%", info: "Dari batch yang Indeks Paparan-nya ≥ 1,0 saat jam makan, berapa persen yang ditahan dan tidak dibagikan. Ini ukuran langsung apakah peringatan dini benar-benar dipakai.", key: "heldShare" as const, max: 1, fmt: (v: number) => fmtPct(v, 0) },
          { title: "Porsi tersaji dengan IP ≥ 1 per juta porsi", value: fmtInt(avgAll((k) => k.overPerMillion)), goal: `Indikator awal. Hasil akhir: laju korban per juta porsi (baseline ${String(NATIONAL.baselineVictimsPerMillionPortions).replace(".", ",")})`, info: "Porsi yang tetap disantap meski Indeks Paparan ≥ 1,0, per satu juta porsi. Ini indikator awal; dampak akhirnya (korban per juta porsi, baseline 1,93 dari data JPPI Jan–Agu 2026) baru bisa dinilai setelah beberapa bulan.", key: "overPerMillion" as const, max: Math.max(...perProv.flatMap((x) => x.series.map((k) => k.overPerMillion)), 1), fmt: (v: number) => fmtInt(v) },
        ].map((card) => (
          <div key={card.title} className="card p-5">
            <p className="flex items-center text-sm font-semibold text-ink-2">
              {card.title}
              <InfoTip title={card.title}>{card.info}</InfoTip>
            </p>
            <p className="mt-1 font-display text-4xl font-bold tnum">{card.value}</p>
            <p className="text-xs text-muted">{card.goal}</p>
            <ul className="mt-4 grid gap-2">
              {perProv.map(({ p, series }) => (
                <li key={p.id} className="flex items-center justify-between gap-2">
                  <span className="w-28 text-xs font-semibold">{p.short}</span>
                  <Spark values={series.map((k) => k[card.key])} max={card.max} color={p.cluster === "Tinggi" ? "#cc3418" : p.cluster === "Sedang" ? "#c88f06" : "#3b5a2c"} />
                  <span className="w-14 text-right font-mono text-xs tnum">{card.fmt(series.at(-1)![card.key])}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      <section data-tour="funnel" className="card mt-6 p-5">
        <h2 className="flex items-center font-display text-xl font-bold">
          Ke mana porsi hari ini pergi
          <InfoTip title="Corong porsi">Semua porsi yang dipantau hari ini, lalu disaring: berapa yang punya data suhu lengkap, berapa yang Indeks Paparan-nya ≥ 1,0 saat makan, berapa yang berhasil ditahan, dan berapa yang tetap tersaji. Tujuan pilot: batang terakhir mendekati nol.</InfoTip>
        </h2>
        <div className="mt-4 grid gap-6 md:grid-cols-[1fr_280px]">
          <Funnel steps={funnel} />
          <p className="text-sm leading-relaxed text-ink-2">
            Dari <b>{fmtInt(funnel[0].value)}</b> porsi, <b className="text-buang">{fmtInt(funnel[2].value)}</b> diproyeksikan melewati ambang saat makan. Sejauh ini <b>{fmtInt(funnel[3].value)}</b> porsi sudah ditahan dan <b className="text-buang">{fmtInt(funnel[4].value)}</b> tersaji. Sisanya masih bisa ditindak lewat control panel Dinas sebelum jam makan.
          </p>
        </div>
      </section>

      <section data-tour="compare" className="card mt-6 overflow-x-auto p-5">
        <h2 className="font-display text-xl font-bold">Perbandingan antar klaster</h2>
        <p className="mt-1 text-xs text-muted">Rata-rata 10 hari sekolah, kecuali kolom &quot;hari ini&quot;. Pilot memakai satu provinsi dari setiap klaster K-Means agar hasilnya bisa digeneralisasi.</p>
        <table className="mt-4 w-full min-w-[760px] text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs text-muted">
              <th className="py-2 pr-3">Provinsi</th>
              <th className="py-2 pr-3">Klaster</th>
              <th className="py-2 pr-3 text-right">SPPG</th>
              <th className="py-2 pr-3 text-right">Batch hari ini</th>
              <th className="py-2 pr-3 text-right">Peringatan hari ini</th>
              <th className="py-2 pr-3 text-right">Data lengkap</th>
              <th className="py-2 pr-3 text-right">IP ≥ 1 tertahan</th>
              <th className="py-2 pr-3 text-right">Porsi IP ≥ 1 / juta</th>
              <th className="py-2 text-right">Skor AHP–SAW provinsi</th>
            </tr>
          </thead>
          <tbody>
            {perProv.map(({ p, today: s, avgComplete, avgHeld, avgOver }) => (
              <tr key={p.id} className="border-b border-line/60">
                <td className="py-2.5 pr-3 font-semibold">{p.name}</td>
                <td className="py-2.5 pr-3">{p.cluster}</td>
                <td className="py-2.5 pr-3 text-right font-mono tnum">{fmtInt(p.sppg)}</td>
                <td className="py-2.5 pr-3 text-right font-mono tnum">{fmtInt(s.batches)}</td>
                <td className="py-2.5 pr-3 text-right font-mono tnum text-buang">{fmtInt(s.early)}</td>
                <td className="py-2.5 pr-3 text-right font-mono tnum">{fmtPct(avgComplete)}</td>
                <td className="py-2.5 pr-3 text-right font-mono tnum">{fmtPct(avgHeld)}</td>
                <td className="py-2.5 pr-3 text-right font-mono tnum">{fmtInt(avgOver)}</td>
                <td className="py-2.5 text-right font-mono tnum">{p.ahpSaw.toFixed(3).replace(".", ",")}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-3 text-xs text-muted">
          Gerbang perluasan (usulan): data lengkap ≥ 95% dan IP ≥ 1 tertahan ≥ 90% di ketiga provinsi selama 8 minggu berturut-turut, serta Indeks Paparan terkalibrasi terhadap minimal 30 insiden atau uji lab yang jeda waktunya tercatat.
        </p>
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <div className="card p-4">
          <h2 className="font-display text-xl font-bold">Klaster nasional & lokasi pilot</h2>
          <div className="mt-3">
            <GeoMap
              label="Peta klaster K-Means 38 provinsi"
              points={PROVINCES.map((p) => ({ id: p.id, lon: p.regencies[0].lon, lat: p.regencies[0].lat, color: "#17201a", r: 1.5, ring: true, label: p.name }))}
            />
          </div>
          <p className="mt-2 text-xs text-muted">
            K-Means k = 3 pada 38 provinsi, silhouette {String(NATIONAL.silhouette).replace(".", ",")}. Indeks Moran I = −0,089 (p = 0,50): tidak ada pengelompokan spasial, jadi risiko melekat pada proses di dapur. Peta dasar memakai batas provinsi sebelum pemekaran Papua; perhitungan klaster memakai 38 provinsi.
          </p>
        </div>
        <div className="grid content-start gap-4">
          <div className="card p-5">
            <h2 className="font-display text-xl font-bold">Biaya</h2>
            <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-xs text-muted">Alat pilot (999 SPPG)</dt>
                <dd className="font-display text-2xl font-bold">±Rp170 jt</dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Alat nasional (29.991 SPPG)</dt>
                <dd className="font-display text-2xl font-bold">Rp5,1 M</dd>
              </div>
              <div className="col-span-2 text-xs text-muted">1 sensor suhu ruang (Rp20 rb) + 3 termometer tusuk (Rp50 rb) per SPPG. CCTV memakai instruksi yang sudah ada; uji sensitivitas sensor Rp80 rb menaikkan total ke Rp6,9 M.</div>
              <div className="col-span-2 border-t border-line pt-3">
                <dt className="text-xs text-muted">Rasio estimasi kerugian CELIOS terhadap investasi</dt>
                <dd className="font-mono text-lg tnum">{ratio.map((r) => `${r.toFixed(1).replace(".", ",")}×`).join(" / ")}</dd>
                <dd className="text-xs text-muted">skenario rendah / dasar / tinggi (Rp25,04 / 30,15 / 40,38 M)</dd>
              </div>
            </dl>
          </div>
          <div className="card p-5">
            <h2 className="font-display text-xl font-bold">Skala yang dipantau hari ini</h2>
            <p className="mt-2 font-display text-3xl font-bold tnum">{fmtInt(totalPortions)} porsi</p>
            <p className="text-xs text-muted">di {fmtInt(states.length)} batch. Nasional: {fmtInt(NATIONAL.sppg)} SPPG, {String(NATIONAL.beneficiaries / 1e6).replace(".", ",")} juta penerima.</p>
          </div>
        </div>
      </section>
      <Tour
        id="bgn"
        steps={[
          { target: "timeline", title: "Di mana kita sekarang", body: <>Tahapan dari proposal: persiapan, pilot enam bulan di tiga provinsi, lalu nasional. Garis hitam adalah hari ini.</> },
          { target: "kpi", title: "Tiga indikator keberhasilan", body: <>Diambil langsung dari proposal DETAK. Angka besar = rata-rata 10 hari sekolah; garis kecil = tren tiap provinsi. Klik <b>i</b> untuk definisi.</> },
          { target: "funnel", title: "Corong porsi hari ini", body: <>Dari semua porsi yang dipantau sampai yang tetap tersaji di atas ambang. Pilot dinilai berhasil bila batang merah terakhir mendekati nol.</> },
          { target: "compare", title: "Bandingkan antar klaster", body: <>Satu provinsi per klaster K-Means. Kalau ketiganya memenuhi target, hasilnya layak digeneralisasi ke 29.991 dapur.</> },
        ]}
      />
    </main>
  );
}
