import Link from "next/link";
import { BacteriaDial } from "@/components/bacteria-dial";
import { Board, BoardColumns, BoardHeader } from "@/components/board";
import { GeoMap } from "@/components/geo-map";
import { InfoTip } from "@/components/info-tip";
import { Tour } from "@/components/tour";
import { Figure, StatusPill, fmtInt, fmtIp, fmtPct } from "@/components/ui";
import { fmtClock, fmtDuration } from "@/lib/pilot/clock";
import { detailOf, PHASE_LABEL, summarize, type BatchState } from "@/lib/pilot/engine";
import { NATIONAL, PILOT_TOTAL_SPPG, PROVINCES } from "@/lib/pilot/reference";
import { dayContext } from "@/lib/server/context";

export const dynamic = "force-dynamic";

function pickFeatured(states: BatchState[]): BatchState | undefined {
  const live = states.filter((s) => s.phase === "perjalanan" || s.phase === "di_sekolah");
  return (
    live.find((s) => s.province.id === "DIY" && s.statusNow === "waspada") ??
    live.sort((a, b) => b.ipNow - a.ipNow).find((s) => s.ipNow < 1) ??
    states.find((s) => s.phase === "disantap")
  );
}

const SCREENS = [
  { href: "/dapur", who: "Petugas SPPG", does: "Catat suhu, cetak label QR", where: "ponsel di dapur" },
  { href: "/sekolah", who: "Guru & orang tua", does: "Satu angka, satu warna", where: "pindai QR di boks" },
  { href: "/dinas", who: "Dinas & Satgas", does: "Tahan batch, atur inspeksi", where: "control panel" },
  { href: "/bgn", who: "BGN pusat", does: "Nilai pilot, putuskan perluasan", where: "dashboard" },
];

export default async function Home({ searchParams }: { searchParams: Promise<{ t?: string }> }) {
  const { t } = await searchParams;
  const { clock, states } = await dayContext(t);
  const sum = summarize(states);
  const featured = pickFeatured(states);
  const d = featured ? detailOf(featured, clock.now) : null;
  const q = t ? `?t=${encodeURIComponent(t)}` : "";
  const wallH = d ? (Math.min(clock.now, d.batch.mealAt) - d.batch.cookedAt) / 3.6e6 : 0;
  const diy = states.filter((s) => s.province.id === "DIY" && s.phase !== "disantap" && s.phase !== "ditahan" && s.phase !== "dimasak");
  const upcoming = [
    ...diy.filter((s) => s.statusAtMeal !== "aman").slice(0, 3),
    ...diy.filter((s) => s.statusAtMeal === "aman").sort((a, b) => a.batch.mealAt - b.batch.mealAt).slice(0, 5),
  ]
    .sort((a, b) => a.batch.mealAt - b.batch.mealAt)
    .map((s) => detailOf(s, clock.now));

  return (
    <main className="mx-auto max-w-7xl px-4 pb-28 sm:px-6">
      <section className="grid grid-cols-[minmax(0,1fr)] items-center gap-12 pb-14 pt-12 lg:grid-cols-[1.1fr_1fr] lg:pt-20">
        <div>
          <h1 className="max-w-xl text-[clamp(2.6rem,6vw,5rem)] font-extrabold leading-[0.95] tracking-[-0.04em] text-ink">Jam dinding tidak tahu isi ompreng.</h1>
          <p className="lede mt-6 max-w-lg text-lg leading-relaxed">
            <b>DETAK menghitung risiko bakteri setiap batch MBG dari suhu dan waktu.</b> Hasilnya satu angka untuk guru, orang tua, dan pengawas, sebelum makanan disantap.
          </p>
          <div className="mt-8 flex flex-wrap gap-2.5">
            <Link href={`/dinas${q}`} className="whitespace-nowrap rounded-full bg-ink px-5 py-3 text-sm font-semibold text-card transition-opacity duration-150 hover:opacity-90">
              Buka control panel
            </Link>
            {featured ? (
              <Link href={`/cek/${featured.id}${q}`} className="whitespace-nowrap rounded-full border border-line-2 bg-card px-5 py-3 text-sm font-semibold text-ink transition-colors duration-150 hover:border-ink">
                Cek satu ompreng
              </Link>
            ) : null}
          </div>
          <div data-tour="pulse" className="mt-12 grid max-w-lg grid-cols-3 divide-x divide-line">
            <div className="pr-5">
              <Figure value={fmtInt(PILOT_TOTAL_SPPG)} label="SPPG pilot" info={<InfoTip title="SPPG pilot">Data BGN 8–9 Juni 2026: DIY 461, Papua 92, Sumatera Barat 446.</InfoTip>} />
            </div>
            <div className="px-5">
              <Figure value={fmtInt(sum.batches)} label="batch hari ini" info={<InfoTip title="Batch">Satu batch = satu pengantaran dari satu dapur ke satu sekolah atau posyandu. Hari ini {fmtInt(sum.portions)} porsi.</InfoTip>} />
            </div>
            <div className="pl-5">
              <Figure value={fmtInt(sum.early)} label="peringatan" tone="buang" info={<InfoTip title="Peringatan dini" align="right">Batch yang belum disantap tetapi Indeks Paparan-nya diproyeksikan ≥ 1,0 pada jam makan.</InfoTip>} />
            </div>
          </div>
        </div>

        {d && featured ? (
          <figure data-tour="dial" className="card relative p-6 shadow-[0_30px_80px_-50px_oklch(21%_0.02_145/0.6)]">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-lg font-bold">{featured.batch.school.name}</p>
                <p className="truncate text-sm text-muted">
                  {featured.batch.kitchen.name} · {PHASE_LABEL[featured.phase].toLowerCase()}
                </p>
              </div>
              <StatusPill status={featured.statusNow} size="lg" />
            </div>
            <div className="mt-2 flex justify-center">
              <BacteriaDial wallHours={wallH} ip={featured.ipNow} status={featured.statusNow} size={300} />
            </div>
            <dl className="mt-4 grid grid-cols-3 divide-x divide-line border-t border-line pt-4 text-center">
              <div>
                <dt className="text-xs text-muted">Matang</dt>
                <dd className="font-mono text-lg tnum">{fmtClock(featured.batch.cookedAt, featured.batch.tzOffset)}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted">IP saat makan</dt>
                <dd className="font-mono text-lg tnum">{fmtIp(featured.ipAtMeal)}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Sisa aman</dt>
                <dd className="font-mono text-lg tnum">{fmtDuration(d.minutesLeft)}</dd>
              </div>
            </dl>
          </figure>
        ) : null}
      </section>

      <section data-tour="board" className="board overflow-hidden">
        <BoardHeader
          title="Papan distribusi · DI Yogyakarta"
          live={clock.label.split("·").pop()?.trim()}
          right={
            <Link href={`/dinas${q}`} className="whitespace-nowrap rounded-full bg-night-2 px-3 py-1.5 text-xs font-semibold text-night-ink hover:bg-night-line">
              Semua peringatan →
            </Link>
          }
        />
        <BoardColumns />
        <Board rows={upcoming} now={clock.now} t={t} empty="Semua batch DIY sudah disantap. Ganti jam di kanan atas." />
      </section>

      <section data-tour="portals" className="mt-20 grid grid-cols-[minmax(0,1fr)] gap-10 lg:grid-cols-[1fr_1.4fr]">
        <h2 className="max-w-sm text-3xl font-bold leading-tight">Satu sistem, empat layar.</h2>
        <ul className="divide-y divide-line border-y border-line">
          {SCREENS.map((s) => (
            <li key={s.href}>
              <Link href={s.href + q} className="group grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 py-5">
                <span className="min-w-0">
                  <span className="block text-xl font-bold group-hover:text-daun">{s.who}</span>
                  <span className="block text-sm text-muted">
                    {s.does} · {s.where}
                  </span>
                </span>
                <span aria-hidden className="text-2xl text-line-2 transition-transform duration-150 group-hover:translate-x-1 group-hover:text-ink">
                  →
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-20 grid grid-cols-[minmax(0,1fr)] items-start gap-10 lg:grid-cols-[1.5fr_1fr]">
        <figure className="card p-4">
          <GeoMap
            label="Klaster risiko 38 provinsi dan tiga lokasi pilot"
            points={PROVINCES.map((p) => ({ id: p.id, lon: p.regencies[0].lon, lat: p.regencies[0].lat, color: "var(--color-ink)", r: 1.4, ring: true, label: p.name }))}
          />
          <figcaption className="mt-3 flex flex-wrap gap-4 text-xs text-ink-2">
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-buang" /> Tinggi 7</span>
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-waspada" /> Sedang 21</span>
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-aman" /> Rendah 10</span>
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-ink" /> Pilot</span>
          </figcaption>
        </figure>
        <div>
          <h2 className="text-3xl font-bold leading-tight">Satu provinsi dari tiap klaster.</h2>
          <p className="lede mt-3 text-[15px] leading-relaxed">
            <b>K-Means 38 provinsi, silhouette {String(NATIONAL.silhouette).replace(".", ",")}.</b> Pilot memakai provinsi dengan laju insiden tertinggi di klasternya.
          </p>
          <ul className="mt-6 divide-y divide-line border-y border-line">
            {PROVINCES.map((p) => {
              const s = summarize(states.filter((x) => x.province.id === p.id));
              return (
                <li key={p.id} className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-baseline gap-5 py-3.5">
                  <span className="min-w-0">
                    <span className="block font-semibold">{p.short}</span>
                    <span className="block text-xs text-muted">
                      {p.cluster} · {fmtInt(p.sppg)} SPPG · {p.tzLabel}
                    </span>
                  </span>
                  <span className="text-right font-mono text-sm text-muted tnum">{fmtPct(s.completeness, 0)}</span>
                  <span className={`w-10 text-right font-mono text-lg tnum ${s.early ? "text-buang" : "text-muted"}`}>{s.early}</span>
                </li>
              );
            })}
          </ul>
          <p className="mt-2 flex justify-end gap-6 text-[11px] text-muted">
            <span>data lengkap</span>
            <span>peringatan</span>
          </p>
        </div>
      </section>

      <footer className="mt-24 flex flex-wrap items-baseline justify-between gap-3 border-t border-line pt-5 text-xs text-muted">
        <span>
          <b className="text-ink">DETAK</b> · Deteksi Risiko, Setiap Detik · modul ke-8 SIPGN
        </span>
        <span>
          Data operasional disimulasikan dari angka resmi ·{" "}
          <Link className="underline hover:text-ink" href="/implementasi#data">
            sumber
          </Link>
        </span>
      </footer>

      <Tour
        id="home-v2"
        steps={[
          { target: "dial", title: "Jam bakteri", body: <>Jarum hitam = jam sejak matang. Jarum berwarna = Indeks Paparan × 4 jam. Kalau jarum berwarna lebih dulu sampai, aturan 4 jam terlalu longgar untuk batch ini.</> },
          { target: "pulse", title: "Hari ini di pilot", body: <>Angka langsung dari 999 dapur. Ikon <b>i</b> menjelaskan setiap angka.</> },
          { target: "board", title: "Papan distribusi", body: <>Seperti papan keberangkatan: jam makan, tujuan, sisa jendela aman, dan Indeks Paparan saat makan. Klik baris untuk detail.</> },
          { target: "portals", title: "Pilih layarmu", body: <>Setiap peran punya layar sendiri, masing-masing dengan panduan.</> },
        ]}
      />
    </main>
  );
}
