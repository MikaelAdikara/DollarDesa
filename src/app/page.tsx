import Link from "next/link";
import { BacteriaDial } from "@/components/bacteria-dial";
import { GeoMap } from "@/components/geo-map";
import { InfoTip } from "@/components/info-tip";
import { Tour } from "@/components/tour";
import { Eyebrow, StatusPill, fmtInt, fmtIp, fmtPct } from "@/components/ui";
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

export default async function Home({ searchParams }: { searchParams: Promise<{ t?: string }> }) {
  const { t } = await searchParams;
  const { clock, states } = await dayContext(t);
  const sum = summarize(states);
  const featured = pickFeatured(states);
  const d = featured ? detailOf(featured, clock.now) : null;
  const q = t ? `?t=${encodeURIComponent(t)}` : "";
  const wallH = d ? (Math.min(clock.now, d.batch.mealAt) - d.batch.cookedAt) / 3.6e6 : 0;

  return (
    <main className="mx-auto max-w-7xl px-4 pb-24 sm:px-6">
      <section className="grid items-center gap-10 py-10 lg:grid-cols-[1.15fr_1fr] lg:py-16">
        <div>
          <Eyebrow>Modul ke-8 SIPGN · prototipe pilot {PILOT_TOTAL_SPPG} SPPG</Eyebrow>
          <h1 className="mt-4 font-display text-[clamp(2.4rem,5.6vw,4.6rem)] font-extrabold leading-[0.95] tracking-tight text-ink">
            Jam dinding tidak tahu isi ompreng.
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-2">
            Aturan BGN memberi waktu 4 jam setelah matang. Bakteri tidak membaca jam: di ruangan panas, 4 jam bisa habis lebih cepat. DETAK menghitung
            <b className="text-ink"> Indeks Paparan</b> setiap batch dari suhu dan waktu di empat titik cek, lalu mengirim satu angka ke guru, orang tua, dan
            pengawas sebelum makanan disantap.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href={`/dinas${q}`} className="rounded-xl bg-daun px-5 py-3 font-semibold text-white shadow-sm transition hover:bg-daun-2">
              Buka control panel Dinas
            </Link>
            {featured ? (
              <Link href={`/cek/${featured.id}${q}`} className="rounded-xl border border-ink/20 bg-white px-5 py-3 font-semibold text-ink transition hover:border-ink/40">
                Lihat status satu ompreng
              </Link>
            ) : null}
          </div>
        </div>

        {d && featured ? (
          <div data-tour="dial" className="card relative overflow-hidden p-5 shadow-[0_20px_60px_-30px_rgba(23,32,26,0.45)] sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <Eyebrow>Batch berjalan · {featured.province.short}</Eyebrow>
                <p className="mt-1 truncate font-display text-xl font-bold">{featured.batch.school.name}</p>
                <p className="truncate text-sm text-muted">
                  dari {featured.batch.kitchen.name}, {featured.regency.name} · {fmtInt(featured.batch.school.portions)} porsi
                </p>
              </div>
              <StatusPill status={featured.statusNow} size="lg" />
            </div>
            <div className="mt-4 grid items-center gap-4 sm:grid-cols-[1fr_170px]">
              <BacteriaDial wallHours={wallH} ip={featured.ipNow} status={featured.statusNow} size={280} />
              <dl className="grid grid-cols-2 gap-x-3 gap-y-3 text-sm sm:grid-cols-1">
                <div>
                  <dt className="text-xs text-muted">Matang</dt>
                  <dd className="font-mono tnum">{fmtClock(featured.batch.cookedAt, featured.batch.tzOffset)} {featured.province.tzLabel}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted">Posisi</dt>
                  <dd className="font-semibold">{PHASE_LABEL[featured.phase]}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted">Jadwal makan</dt>
                  <dd className="font-mono tnum">{fmtClock(featured.batch.mealAt, featured.batch.tzOffset)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted">IP saat makan</dt>
                  <dd className="font-mono tnum font-semibold">{fmtIp(featured.ipAtMeal)}</dd>
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <dt className="text-xs text-muted">Sisa jendela aman</dt>
                  <dd className="font-semibold">{fmtDuration(d.minutesLeft)}</dd>
                </div>
              </dl>
            </div>
            <p className="mt-4 border-t border-line pt-3 text-xs leading-relaxed text-muted">
              Jarum hitam = jam sejak matang. Jarum berwarna = Indeks Paparan × 4 jam. Kalau jarum berwarna mendahului jarum hitam, batas 4 jam terlalu longgar untuk batch ini.
            </p>
          </div>
        ) : null}
      </section>

      <section data-tour="pulse" aria-label="Denyut pilot hari ini" className="well grid gap-px overflow-hidden p-1 sm:grid-cols-3 lg:grid-cols-6">
        {(
          [
            ["SPPG pilot", fmtInt(PILOT_TOTAL_SPPG), "DIY · Papua · Sumbar", "", "Jumlah SPPG di tiga provinsi pilot menurut data BGN per 8–9 Juni 2026: DIY 461, Papua 92, Sumatera Barat 446."],
            ["Batch hari ini", fmtInt(sum.batches), `${fmtInt(sum.portions)} porsi`, "", "Satu batch = satu pengantaran dari satu dapur ke satu sekolah atau posyandu pada hari ini. Porsi per dapur mengikuti rata-rata penerima per SPPG di tiap provinsi."],
            ["Peringatan dini", fmtInt(sum.early), "lewat ambang sebelum disantap", "text-buang", "Batch yang belum disantap tetapi Indeks Paparan P95-nya diproyeksikan ≥ 1,0 pada jam makan. Bisa ditahan atau dipercepat dari control panel Dinas."],
            ["Ditahan", fmtInt(sum.held), `${fmtInt(sum.heldPortions)} porsi tidak dibagikan`, "", "Batch yang ditahan guru piket, SPPG, atau Satgas sehingga tidak dibagikan."],
            ["Kelengkapan data", fmtPct(sum.completeness), "titik cek yang jatuh tempo", "", "Titik cek yang sudah lewat jadwalnya dan benar-benar tercatat, dibagi semua titik cek yang jatuh tempo. Indikator keberhasilan pilot nomor 1."],
            ["Jam layanan", clock.mode === "live" ? "Langsung" : "Putar ulang", clock.label, "", "Dapur MBG bekerja sekitar 02.00–13.00. Di luar jam itu, aplikasi memutar ulang hari sekolah terakhir pada pukul 10.15 WIB. Ganti jam lewat pemilih di pojok kanan atas."],
          ] as const
        ).map(([k, v, s2, tone, info]) => (
          <div key={k} className="rounded-[10px] bg-white/80 px-4 py-3">
            <p className="flex items-center text-xs font-semibold text-muted">
              {k}
              <InfoTip title={k}>{info}</InfoTip>
            </p>
            <p className={`font-display text-2xl font-bold tnum ${tone}`}>{v}</p>
            <p className="truncate text-xs text-muted">{s2}</p>
          </div>
        ))}
      </section>

      <section className="mt-16">
        <span data-tour="portals" className="block">
        <Eyebrow>Satu sistem, empat layar</Eyebrow>
        </span>
        <h2 className="mt-2 max-w-2xl font-display text-3xl font-bold tracking-tight">Setiap pihak hanya melihat keputusan yang menjadi tugasnya.</h2>
        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            { href: "/dapur", who: "Petugas SPPG", device: "Ponsel di dapur", text: "Mencatat suhu di titik Matang dan Berangkat. Waktu diambil dari CCTV dan sensor, bukan diketik. Mencetak label QR untuk tiap boks." },
            { href: "/sekolah", who: "Guru & orang tua", device: "Pindai QR di boks", text: "Satu angka dan satu warna: boleh dibagikan, bagikan segera, atau jangan dibagikan. Guru piket mencatat cek Tiba dan Pra-konsumsi." },
            { href: "/dinas", who: "Dinas / Satgas", device: "Control panel", text: "Peringatan dini untuk batch yang akan lewat ambang, tombol tahan batch, dan antrean inspeksi AHP–SAW per dapur." },
            { href: "/bgn", who: "BGN pusat", device: "Dashboard pilot", text: "Tiga indikator keberhasilan pilot, perbandingan antar klaster, dan biaya, sebagai dasar keputusan perluasan nasional." },
          ].map((c) => (
            <Link key={c.href} href={c.href + q} className="card group flex flex-col p-5 transition hover:-translate-y-0.5 hover:shadow-lg">
              <span className="font-mono text-xs text-muted">{c.device}</span>
              <span className="mt-1 font-display text-xl font-bold group-hover:text-daun">{c.who}</span>
              <span className="mt-3 text-sm leading-relaxed text-ink-2">{c.text}</span>
              <span className="mt-auto pt-4 text-sm font-semibold text-daun">Buka layar →</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-16 grid gap-8 lg:grid-cols-[1.4fr_1fr]">
        <div className="card overflow-hidden p-4">
          <GeoMap
            label="Peta klaster K-Means 38 provinsi dan tiga lokasi pilot"
            points={PROVINCES.map((p) => {
              const s = summarize(states.filter((x) => x.province.id === p.id));
              const r = p.regencies[0];
              return { id: p.id, lon: r.lon, lat: r.lat, color: "#17201a", r: 1.4, ring: s.early > 0, label: `${p.name}: ${s.early} peringatan dini` };
            })}
          />
          <div className="mt-3 flex flex-wrap gap-4 text-xs text-ink-2">
            <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm bg-[#cc3418]" /> Klaster Tinggi (7)</span>
            <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm bg-[#e9b23a]" /> Sedang (21)</span>
            <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm bg-[#8aa05a]" /> Rendah (10)</span>
            <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full bg-ink" /> Provinsi pilot</span>
          </div>
        </div>
        <div>
          <Eyebrow>Kenapa tiga provinsi ini</Eyebrow>
          <h2 className="mt-2 font-display text-3xl font-bold tracking-tight">Satu provinsi dari setiap klaster risiko.</h2>
          <p className="mt-4 leading-relaxed text-ink-2">
            K-Means pada 38 provinsi (silhouette {String(NATIONAL.silhouette).replace(".", ",")}) memberi tiga profil pengelolaan. Pilot memakai provinsi dengan laju insiden tertinggi di klasternya, sehingga alur 4 titik cek diuji di kota padat, pegunungan, dan kepulauan sekaligus.
          </p>
          <ul className="mt-6 grid gap-3">
            {PROVINCES.map((p) => {
              const s = summarize(states.filter((x) => x.province.id === p.id));
              return (
                <li key={p.id} className="card flex items-center justify-between gap-3 px-4 py-3">
                  <span>
                    <span className="font-semibold">{p.name}</span>
                    <span className="block text-xs text-muted">
                      Klaster {p.cluster} · {fmtInt(p.sppg)} SPPG · {p.tzLabel}
                    </span>
                  </span>
                  <span className="text-right text-xs text-muted">
                    <b className="block font-display text-lg text-ink tnum">{s.early}</b>peringatan dini
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      <Tour
        id="home"
        steps={[
          { target: "dial", title: "Jam bakteri: inti DETAK", body: <>Satu batch MBG yang sedang berjalan. <b>Jarum hitam</b> = jam sejak matang. <b>Jarum berwarna</b> = Indeks Paparan × 4 jam. Kalau jarum berwarna mendahului jarum hitam, bakteri tumbuh lebih cepat daripada yang diasumsikan aturan 4 jam.</> },
          { target: "pulse", title: "Denyut pilot hari ini", body: <>Angka langsung dari 999 SPPG di tiga provinsi pilot. Di luar jam layanan, layar memutar ulang hari sekolah terakhir pada pukul 10.15. Jam bisa diganti di pojok kanan atas.</> },
          { target: "portals", title: "Pilih layar sesuai peranmu", body: <>Dapur mencatat suhu, sekolah membaca status, Dinas menindak, BGN menilai pilot. Setiap layar punya panduannya sendiri lewat tombol <b>Panduan layar ini</b>.</> },
        ]}
      />
      <footer className="mt-20 border-t border-line pt-6 text-xs leading-relaxed text-muted">
        <p>
          Prototipe pilot. Jumlah SPPG per provinsi, penerima, insiden, model Indeks Paparan, klaster, dan bobot AHP–SAW berasal dari data publik dan paket data DETAK. Dapur, sekolah, jadwal, dan pembacaan suhu harian disimulasikan secara deterministik dari angka tersebut sampai terhubung ke SIPGN dan perangkat lapangan. Rincian sumber ada di halaman{" "}
          <Link className="underline" href="/implementasi#data">Implementasi</Link>.
        </p>
      </footer>
    </main>
  );
}
