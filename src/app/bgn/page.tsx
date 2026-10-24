import type { Metadata } from "next";
import { GeoMap } from "@/components/geo-map";
import { InfoTip } from "@/components/info-tip";
import { Tour } from "@/components/tour";
import { Funnel } from "@/components/viz";
import { PersonaGate } from "@/components/persona-gate";
import { Figure, fmtInt, fmtPct } from "@/components/ui";
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

function Spark({ values, max, target, color }: { values: number[]; max: number; target?: number; color: string }) {
  const W = 120;
  const H = 28;
  const x = (i: number) => (i / Math.max(1, values.length - 1)) * W;
  const y = (v: number) => H - (Math.min(v, max) / max) * (H - 4) - 2;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-7 w-full max-w-[120px]" aria-hidden preserveAspectRatio="none">
      {target !== undefined ? <line x1={0} x2={W} y1={y(target)} y2={y(target)} stroke="var(--color-line-2)" strokeDasharray="2 3" /> : null}
      <polyline points={values.map((v, i) => `${x(i)},${y(v)}`).join(" ")} fill="none" stroke={color} strokeWidth={1.75} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      <circle cx={x(values.length - 1)} cy={y(values.at(-1) ?? 0)} r={2.5} fill={color} />
    </svg>
  );
}

const PHASES = [
  { name: "Persiapan", from: "2026-11-01", to: "2026-12-31", text: "Modul ke-8 dipasang di SIPGN, alat dibagikan, petugas dilatih" },
  { name: "Pilot", from: "2027-01-04", to: "2027-06-30", text: "DIY · Papua · Sumbar, 999 SPPG, kalibrasi IP dengan data lapangan" },
  { name: "Nasional", from: "2027-07-01", to: "2027-12-31", text: "29.991 SPPG, urutan mengikuti antrean inspeksi" },
];

const CLUSTER_COLOR: Record<string, string> = { Tinggi: "var(--color-buang)", Sedang: "var(--color-waspada-ink)", Rendah: "var(--color-aman)" };

export default async function BgnPage({ searchParams }: { searchParams: Promise<{ t?: string }> }) {
  const { t } = await searchParams;
  const { clock, states } = await dayContext(t);
  const days = pastDays(clock.serviceDate, 10);
  const perProv = PROVINCES.map((p) => {
    const series = days.map((d) => kpi(d, historyDay(d, p.id)));
    const today = summarize(states.filter((s) => s.province.id === p.id));
    const avg = (f: (k: DayKpi) => number) => series.reduce((a, k) => a + f(k), 0) / series.length;
    return { p, series, today, avgComplete: avg((k) => k.complete), avgHeld: avg((k) => k.heldShare), avgOver: avg((k) => k.overPerMillion) };
  });
  const allSeries = days.map((d) => kpi(d, PROVINCES.flatMap((p) => historyDay(d, p.id as ProvinceId))));
  const avgAll = (f: (k: DayKpi) => number) => allSeries.reduce((a, k) => a + f(k), 0) / allSeries.length;
  const totalPortions = summarize(states).portions;
  const overToday = states.filter((s) => s.ipAtMeal >= 1);
  const funnel = [
    { label: "Porsi dipantau", value: totalPortions, note: `${fmtInt(states.length)} batch · ${fmtInt(PILOT_TOTAL_SPPG)} SPPG`, color: "var(--color-ink-2)" },
    { label: "Data suhu lengkap", value: states.filter((s) => s.missing.length === 0).reduce((a, s) => a + s.batch.school.portions, 0), note: "semua titik jatuh tempo tercatat", color: "var(--color-ink-2)" },
    { label: "IP ≥ 1,0 saat makan", value: overToday.reduce((a, s) => a + s.batch.school.portions, 0), note: "proyeksi, butuh tindakan", color: "var(--color-detak)" },
    { label: "Ditahan", value: overToday.filter((s) => s.held).reduce((a, s) => a + s.batch.school.portions, 0), note: "guru piket, SPPG, atau Satgas", color: "var(--color-ink)" },
    { label: "Tersaji di atas ambang", value: overToday.filter((s) => !s.held && s.phase === "disantap").reduce((a, s) => a + s.batch.school.portions, 0), note: "sasaran pilot: mendekati nol", color: "var(--color-buang)" },
  ];
  const tl0 = Date.parse("2026-10-01");
  const tl1 = Date.parse("2028-01-01");
  const pos = (d: string | number) => `${(((typeof d === "number" ? d : Date.parse(d)) - tl0) / (tl1 - tl0)) * 100}%`;
  const ratio = NATIONAL.lossScenariosRp.map((l) => l / NATIONAL.investmentRp);
  const overMax = Math.max(...perProv.flatMap((x) => x.series.map((k) => k.overPerMillion)), 1);

  const KPIS = [
    { key: "complete" as const, label: "batch dengan data lengkap", value: avgAll((k) => k.complete), target: 0.95, goal: "target ≥ 95%", max: 1, fmt: (v: number) => fmtPct(v, 0), info: "Batch yang keempat titik ceknya tercatat ÷ semua batch. Rata-rata 10 hari sekolah; garis per provinsi = tren harian, putus-putus = target." },
    { key: "heldShare" as const, label: "batch IP ≥ 1 tertahan", value: avgAll((k) => k.heldShare), target: 0.9, goal: "target ≥ 90%", max: 1, fmt: (v: number) => fmtPct(v, 0), info: "Dari batch dengan IP ≥ 1,0 saat jam makan, berapa persen yang ditahan. Ukuran langsung apakah peringatan dini dipakai." },
    { key: "overPerMillion" as const, label: "porsi IP ≥ 1 tersaji / juta", value: avgAll((k) => k.overPerMillion), target: undefined, goal: `indikator awal · baseline korban ${String(NATIONAL.baselineVictimsPerMillionPortions).replace(".", ",")}/juta`, max: overMax, fmt: (v: number) => fmtInt(v), info: "Porsi yang tetap disantap meski IP ≥ 1,0, per sejuta porsi. Dampak akhirnya (korban per juta porsi, baseline 1,93 dari JPPI Jan–Agu 2026) baru terlihat setelah beberapa bulan." },
  ];

  return (
    <main className="mx-auto max-w-7xl px-4 pb-16 pt-8 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-sm text-muted">{fmtDateLong(clock.serviceDate)}</span>
        <PersonaGate role="bgn" />
      </div>
      <h1 className="mt-6 max-w-4xl text-[clamp(2.2rem,5vw,4rem)] font-extrabold leading-[0.95] tracking-[-0.04em]">Layak diperluas ke {fmtInt(NATIONAL.sppg)} dapur?</h1>
      <p className="lede mt-4 max-w-2xl">
        <b>Tiga indikator dari proposal, 10 hari sekolah terakhir, {fmtInt(PILOT_TOTAL_SPPG)} SPPG.</b> Angka berasal dari simulasi operasi pilot dengan struktur laporan SIPGN.
      </p>

      <section data-tour="kpi" className="mt-10 grid grid-cols-[minmax(0,1fr)] gap-y-10 border-y border-line py-8 lg:grid-cols-3 lg:divide-x lg:divide-line">
        {KPIS.map((k, i) => (
          <div key={k.key} className={i === 0 ? "lg:pr-8" : i === 1 ? "lg:px-8" : "lg:pl-8"}>
            <Figure size="xl" value={k.fmt(k.value)} label={k.label} info={<InfoTip title={k.label} align={i === 2 ? "right" : "left"}>{k.info}</InfoTip>} />
            <p className="mt-1 text-xs text-muted">{k.goal}</p>
            <ul className="mt-6 grid gap-2.5">
              {perProv.map(({ p, series }) => {
                const last = series.at(-1)![k.key];
                const pass = k.target === undefined ? undefined : last >= k.target;
                return (
                  <li key={p.id} className="grid grid-cols-[88px_minmax(0,1fr)_56px] items-center gap-3">
                    <span className="truncate text-xs font-semibold">{p.short}</span>
                    <Spark values={series.map((x) => x[k.key])} max={k.max} target={k.target} color={CLUSTER_COLOR[p.cluster] ?? "var(--color-ink)"} />
                    <span className={`text-right font-mono text-xs tnum ${pass === false ? "text-buang" : ""}`}>{k.fmt(last)}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </section>

      <section data-tour="timeline" aria-label="Tahapan" className="mt-10">
        <div className="relative h-14">
          <div className="absolute inset-x-0 top-6 h-px bg-line-2" />
          {PHASES.map((ph, i) => (
            <div key={ph.name} className="absolute top-[18px] h-4 rounded-full" style={{ left: pos(ph.from), width: `calc(${pos(ph.to)} - ${pos(ph.from)})`, background: ["var(--color-line-2)", "var(--color-flame)", "var(--color-ink)"][i] }}>
              <span className="absolute -top-5 left-0 whitespace-nowrap text-xs font-semibold">{ph.name}</span>
            </div>
          ))}
          <div className="absolute top-2 h-9 w-0.5 bg-ink" style={{ left: pos(clock.now) }}>
            <span className="absolute left-1.5 top-6 whitespace-nowrap font-mono text-[11px]">hari ini</span>
          </div>
        </div>
        <ul className="mt-3 grid grid-cols-[minmax(0,1fr)] gap-2 text-xs text-muted md:grid-cols-3">
          {PHASES.map((ph) => (
            <li key={ph.name}>
              <b className="text-ink">{ph.name}</b> · {ph.text}
            </li>
          ))}
        </ul>
      </section>

      <section data-tour="funnel" className="card mt-10 p-5 sm:p-6">
        <h2 className="flex items-center text-lg font-bold">
          Ke mana porsi hari ini pergi
          <InfoTip title="Corong porsi">Semua porsi yang dipantau, lalu disaring: data lengkap, IP ≥ 1,0 saat makan, ditahan, dan yang tetap tersaji. Skala linear terhadap baris pertama.</InfoTip>
        </h2>
        <div className="mt-3">
          <Funnel steps={funnel} />
        </div>
      </section>

      <section data-tour="compare" className="card mt-6 overflow-hidden">
        <div className="flex flex-wrap items-baseline justify-between gap-2 px-5 pb-3 pt-5 sm:px-6">
          <h2 className="flex items-center text-lg font-bold">
            Antar klaster
            <InfoTip title="Kenapa tiga provinsi">Satu provinsi dari tiap klaster K-Means, supaya hasil pilot bisa digeneralisasi. Rata-rata 10 hari sekolah, kecuali kolom hari ini.</InfoTip>
          </h2>
          <span className="text-xs text-muted">gerbang: lengkap ≥ 95% dan tertahan ≥ 90% selama 8 minggu</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-y border-line bg-paper text-left font-mono text-[10px] uppercase tracking-wider text-muted">
                <th className="px-5 py-2 font-normal sm:px-6">Provinsi</th>
                <th className="py-2 pr-4 text-right font-normal">SPPG</th>
                <th className="py-2 pr-4 text-right font-normal">Batch hari ini</th>
                <th className="py-2 pr-4 text-right font-normal">Peringatan</th>
                <th className="py-2 pr-4 text-right font-normal">Lengkap</th>
                <th className="py-2 pr-4 text-right font-normal">Tertahan</th>
                <th className="py-2 pr-4 text-right font-normal">IP≥1 / juta</th>
                <th className="py-2 pr-5 text-right font-normal sm:pr-6">AHP–SAW</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {perProv.map(({ p, today: s, avgComplete, avgHeld, avgOver }) => (
                <tr key={p.id}>
                  <td className="px-5 py-3 sm:px-6">
                    <span className="flex items-center gap-2 font-semibold">
                      <span className="h-2 w-2 rounded-full" style={{ background: CLUSTER_COLOR[p.cluster] }} />
                      {p.name}
                    </span>
                    <span className="pl-4 text-xs text-muted">klaster {p.cluster}</span>
                  </td>
                  <td className="py-3 pr-4 text-right font-mono tnum">{fmtInt(p.sppg)}</td>
                  <td className="py-3 pr-4 text-right font-mono tnum">{fmtInt(s.batches)}</td>
                  <td className={`py-3 pr-4 text-right font-mono tnum ${s.early ? "text-buang" : ""}`}>{fmtInt(s.early)}</td>
                  <td className={`py-3 pr-4 text-right font-mono tnum ${avgComplete < 0.95 ? "text-buang" : ""}`}>{fmtPct(avgComplete)}</td>
                  <td className={`py-3 pr-4 text-right font-mono tnum ${avgHeld < 0.9 ? "text-buang" : ""}`}>{fmtPct(avgHeld)}</td>
                  <td className="py-3 pr-4 text-right font-mono tnum">{fmtInt(avgOver)}</td>
                  <td className="py-3 pr-5 text-right font-mono tnum sm:pr-6">{p.ahpSaw.toFixed(3).replace(".", ",")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-6 grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[1.4fr_1fr]">
        <figure className="card p-4">
          <figcaption className="flex items-center px-1 text-lg font-bold">
            Klaster nasional
            <InfoTip title="Peta klaster">K-Means k = 3 pada 38 provinsi, silhouette {String(NATIONAL.silhouette).replace(".", ",")}. Moran I = −0,089 (p = 0,50): tidak ada pengelompokan spasial, jadi risiko melekat pada proses dapur. Peta dasar memakai batas sebelum pemekaran Papua.</InfoTip>
          </figcaption>
          <div className="mt-3">
            <GeoMap label="Peta klaster K-Means 38 provinsi" points={PROVINCES.map((p) => ({ id: p.id, lon: p.regencies[0].lon, lat: p.regencies[0].lat, color: "var(--color-ink)", r: 1.5, ring: true, label: p.name }))} />
          </div>
        </figure>
        <div className="card self-start p-5 sm:p-6">
          <h2 className="flex items-center text-lg font-bold">
            Biaya alat
            <InfoTip title="Rincian" align="right">Per SPPG: 1 sensor suhu ruang (Rp20 rb) + 3 termometer tusuk (Rp50 rb). CCTV memakai instruksi yang sudah ada. Uji sensitivitas sensor Rp80 rb menaikkan total nasional ke Rp6,9 M.</InfoTip>
          </h2>
          <div className="mt-5 grid grid-cols-2 divide-x divide-line">
            <div className="pr-4">
              <Figure value="±Rp170 jt" label="pilot · 999 SPPG" />
            </div>
            <div className="pl-4">
              <Figure value="Rp5,1 M" label="nasional" />
            </div>
          </div>
          <div className="mt-6 border-t border-line pt-4">
            <p className="font-mono text-2xl tnum">{ratio.map((r) => `${r.toFixed(1).replace(".", ",")}×`).join(" · ")}</p>
            <p className="mt-1 text-xs text-muted">estimasi kerugian CELIOS ÷ investasi, skenario rendah · dasar · tinggi (Rp25,04 / 30,15 / 40,38 M)</p>
          </div>
        </div>
      </section>

      <Tour
        id="bgn-v2"
        steps={[
          { target: "kpi", title: "Tiga indikator", body: <>Angka besar = rata-rata 10 hari. Garis = tren per provinsi, putus-putus = target.</> },
          { target: "timeline", title: "Tahapan", body: <>Persiapan, pilot enam bulan, lalu nasional. Garis hitam = hari ini.</> },
          { target: "funnel", title: "Corong porsi", body: <>Pilot berhasil bila baris merah terakhir mendekati nol.</> },
          { target: "compare", title: "Antar klaster", body: <>Merah = belum memenuhi gerbang perluasan.</> },
        ]}
      />
    </main>
  );
}
