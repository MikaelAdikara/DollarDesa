import Link from "next/link";
import type { Metadata } from "next";
import { ActionButton } from "@/components/action-button";
import { InfoTip } from "@/components/info-tip";
import { Tour } from "@/components/tour";
import { ActionWindow, DayFlow, IpHistogram } from "@/components/viz";
import { CriteriaBars, PChart } from "@/components/charts";
import { GeoMap, PROVINCE_BBOX } from "@/components/geo-map";
import { PersonaGate } from "@/components/persona-gate";
import { Eyebrow, STATUS_META, StatusPill, fmtInt, fmtIp, fmtPct } from "@/components/ui";
import { statusOf } from "@/lib/model/ip";
import { fmtClock, fmtDuration } from "@/lib/pilot/clock";
import { AHP_WEIGHTS, PCHART, PHASE_LABEL, detailOf, inspectionQueue, kitchenRows, pChart, summarize } from "@/lib/pilot/engine";
import { PILOT_INCIDENTS, PROVINCES, type ProvinceId } from "@/lib/pilot/reference";
import { dayContext } from "@/lib/server/context";

export const metadata: Metadata = { title: "Control panel Dinas" };
export const dynamic = "force-dynamic";

export default async function DinasPage({ searchParams }: { searchParams: Promise<{ t?: string; prov?: string; reg?: string; k?: string }> }) {
  const sp = await searchParams;
  const prov = (PROVINCES.find((p) => p.id === sp.prov)?.id ?? "DIY") as ProvinceId;
  const province = PROVINCES.find((p) => p.id === prov)!;
  const { clock, states, storeError } = await dayContext(sp.t, { province: prov });
  const reg = province.regencies.find((r) => r.id === sp.reg)?.id;
  const scoped = reg ? states.filter((s) => s.regency.id === reg) : states;
  const sum = summarize(scoped);
  const alerts = scoped
    .filter((s) => s.alert === "early")
    .map((s) => detailOf(s, clock.now))
    .sort((a, b) => a.minutesLeft - b.minutesLeft || b.batch.school.portions - a.batch.school.portions);
  const served = scoped.filter((s) => s.alert === "served_over");
  const queue = inspectionQueue(prov, clock.serviceDate, states).filter((r) => !reg || r.regency.id === reg);
  const focus = queue.find((r) => r.kitchen.id === sp.k) ?? queue[0];
  const pts = focus ? pChart(focus.kitchen.id, clock.serviceDate, states) : [];
  const rows = kitchenRows(scoped);
  const tq = sp.t ? `t=${encodeURIComponent(sp.t)}&` : "";
  const base = `/dinas?${tq}prov=${prov}${reg ? `&reg=${reg}` : ""}`;
  const incidents = PILOT_INCIDENTS.filter((i) => i.province === prov);

  return (
    <main className="mx-auto max-w-[1400px] px-4 pb-24 pt-6 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {PROVINCES.map((p) => (
            <Link key={p.id} href={`/dinas?${tq}prov=${p.id}`} className={`rounded-xl px-4 py-2 text-sm font-semibold ${p.id === prov ? "bg-ink text-white" : "bg-white text-ink-2"}`}>
              {p.short}
            </Link>
          ))}
        </div>
        <PersonaGate role="dinas" />
      </div>

      <header className="mt-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <Eyebrow>Control panel · Antrean Inspeksi & Kendali · {clock.label}</Eyebrow>
          <h1 className="mt-1 font-display text-4xl font-extrabold tracking-tight">
            {reg ? province.regencies.find((r) => r.id === reg)!.name : province.name}
          </h1>
          <p className="text-sm text-muted">
            Klaster {province.cluster} · {fmtInt(rows.length)} SPPG · {fmtInt(sum.batches)} batch · {fmtInt(sum.portions)} porsi hari ini · jam {province.tzLabel}
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Link href={`/dinas?${tq}prov=${prov}`} className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${!reg ? "bg-daun text-white" : "bg-white/70 text-ink-2"}`}>
            Semua
          </Link>
          {province.regencies.map((r) => (
            <Link key={r.id} href={`/dinas?${tq}prov=${prov}&reg=${r.id}`} className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${reg === r.id ? "bg-daun text-white" : "bg-white/70 text-ink-2"}`}>
              {r.name}
            </Link>
          ))}
        </div>
      </header>

      {storeError ? <p className="mt-3 rounded-lg bg-buang-tint px-3 py-2 text-sm text-buang">Penyimpanan tidak bisa dibaca: {storeError}. Data dapur tetap tampil, tindakan belum tersimpan.</p> : null}

      <section data-tour="kpi" className="well mt-5 grid grid-cols-2 gap-px overflow-hidden p-1 md:grid-cols-5">
        {(
          [
            ["Peringatan dini", fmtInt(sum.early), "akan lewat ambang sebelum disantap", "text-buang", "Batch yang belum disantap tetapi Indeks Paparan P95-nya diproyeksikan ≥ 1,0 pada jam makan terjadwal. Proyeksi memakai suhu terakhir yang tercatat dan sensor ruang di sekolah. Inilah daftar yang harus ditindak sekarang."],
            ["Tersaji di atas ambang", fmtInt(sum.servedOver), "tidak sempat ditahan", sum.servedOver ? "text-buang" : "", "Batch yang sudah disantap dengan IP ≥ 1,0 dan tidak ditahan. Bukan berarti pasti ada korban (IP memakai persentil ke-95 yang konservatif), tetapi sekolah tujuan perlu dipantau keluhannya hari ini."],
            ["Ditahan hari ini", fmtInt(sum.held), `${fmtInt(sum.heldPortions)} porsi`, "", "Batch yang ditahan guru piket, SPPG, atau Satgas sehingga tidak dibagikan. Di simulasi, guru menahan ±75% batch yang terbaca Buang pada cek pra-konsumsi."],
            ["Waspada saat makan", fmtInt(sum.byStatus.waspada), `${fmtPct(sum.byStatus.waspada / Math.max(1, sum.batches))} batch`, "text-[#8a6100]", "IP 0,8 sampai di bawah 1,0 saat jam makan: masih boleh dibagikan, tetapi harus segera. Jumlah yang tinggi menandakan jadwal distribusi terlalu mepet."],
            ["Kelengkapan data", fmtPct(sum.completeness), `${fmtInt(sum.due - sum.recorded)} titik cek bolong`, "", "Titik cek yang sudah jatuh tempo dan benar-benar tercatat, dibagi semua titik cek yang jatuh tempo. Titik yang bolong diganti asumsi konservatif (65°C saat matang), jadi data bolong membuat IP cenderung lebih tinggi, bukan lebih rendah."],
          ] as const
        ).map(([k, v, s2, tone, info]) => (
          <div key={k} className="rounded-[10px] bg-white/85 px-4 py-3">
            <p className="flex items-center text-xs font-semibold text-muted">
              {k}
              <InfoTip title={k}>{info}</InfoTip>
            </p>
            <p className={`font-display text-3xl font-bold tnum ${tone}`}>{v}</p>
            <p className="truncate text-xs text-muted">{s2}</p>
          </div>
        ))}
      </section>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.05fr_1fr]">
        <section aria-labelledby="alerts" data-tour="alerts" className="card p-4">
          <div className="flex items-baseline justify-between">
            <h2 id="alerts" className="font-display text-xl font-bold">Peringatan dini</h2>
            <span className="text-xs text-muted">urut: waktu tersisa paling sedikit</span>
          </div>
          <p className="mt-1 text-xs text-muted">Batch yang Indeks Paparan-nya diproyeksikan ≥ 1,0 saat jam makan. Tahan sebelum dibagikan atau minta SPPG mempercepat distribusi.</p>
          {alerts.length ? (
            <div data-tour="window" className="mt-3 rounded-xl bg-steel/60 p-2">
              <p className="flex items-center px-1 text-xs font-semibold text-ink-2">
                Jendela tindakan
                <InfoTip title="Jendela tindakan">Setiap baris satu batch. Hijau = masih aman dibagikan bila disantap sekarang. Merah = setelah titik ini Indeks Paparan P95 melewati 1,0. Titik hitam = jam makan terjadwal. Kalau merah dimulai sebelum titik hitam, batch akan melewati batas aman saat disantap kecuali dipercepat atau ditahan.</InfoTip>
              </p>
              <ActionWindow alerts={alerts} now={clock.now} tzOffset={province.tzOffset} />
            </div>
          ) : null}
          <ul className="mt-3 grid max-h-[620px] gap-2 overflow-y-auto pr-1">
            {alerts.length === 0 ? <li className="rounded-lg bg-aman-tint px-3 py-4 text-sm text-aman">Tidak ada batch yang diproyeksikan lewat ambang saat ini.</li> : null}
            {alerts.slice(0, 40).map((a) => (
              <li key={a.id} className="rounded-xl border border-line p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link href={`/cek/${a.id}${sp.t ? `?t=${encodeURIComponent(sp.t)}` : ""}`} className="block truncate font-semibold hover:underline">
                      {a.batch.school.name}
                    </Link>
                    <p className="truncate text-xs text-muted">
                      {a.batch.kitchen.name} · {a.regency.name} · {fmtInt(a.batch.school.portions)} porsi · {PHASE_LABEL[a.phase]}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-mono text-sm font-semibold text-buang tnum">IP makan {fmtIp(a.ipAtMeal)}</p>
                    <p className="text-xs text-muted">
                      habis {a.minutesLeft <= 0 ? "sekarang" : `dalam ${fmtDuration(a.minutesLeft)}`} · makan {fmtClock(a.batch.mealAt, a.batch.tzOffset)}
                    </p>
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <ActionButton batchId={a.id} kind="hold" reason="Ditahan Satgas: proyeksi IP ≥ 1,0 saat jam makan" label="Tahan batch" tone="danger" size="sm" t={sp.t} />
                  <ActionButton batchId={a.id} kind="inspect" reason="Satgas menghubungi SPPG untuk percepat distribusi" label="Catat: SPPG dihubungi" tone="light" size="sm" t={sp.t} />
                  <Link href={`${base}&k=${a.batch.kitchen.id}`} className="text-xs font-semibold text-daun underline">
                    lihat dapur
                  </Link>
                </div>
              </li>
            ))}
          </ul>
          {served.length ? (
            <p className="mt-3 rounded-lg bg-buang-tint px-3 py-2 text-xs text-buang">
              {served.length} batch sudah disantap dengan IP ≥ 1,0 hari ini. Dapurnya naik ke puncak antrean inspeksi dan pantau keluhan di sekolah tujuan.
            </p>
          ) : null}
        </section>

        <section className="grid content-start gap-6">
          <div data-tour="map" className="card p-4">
            <h2 className="font-display text-xl font-bold">Peta dapur hari ini</h2>
            <p className="mt-1 text-xs text-muted">Warna = status batch terburuk saat jam makan. Lingkaran = ada peringatan dini.</p>
            <div className="mt-3">
              <GeoMap
                label={`Peta SPPG ${province.name}`}
                bbox={PROVINCE_BBOX[prov]}
                mode="plain"
                highlight={prov}
                height={420}
                points={rows
                  .sort((a, b) => a.maxIpAtMeal - b.maxIpAtMeal)
                  .map((r) => ({ id: r.kitchen.id, lon: r.kitchen.lon, lat: r.kitchen.lat, color: STATUS_META[statusOf(r.maxIpAtMeal)].hex, r: prov === "DIY" ? 0.32 : 0.55, ring: r.alerts > 0, label: `${r.kitchen.name}: IP ${fmtIp(r.maxIpAtMeal)}`, href: `${base}&k=${r.kitchen.id}` }))}
              />
            </div>
            {incidents.length ? (
              <div className="mt-3 border-t border-line pt-3">
                <p className="text-xs font-semibold text-ink-2">Insiden terdokumentasi di provinsi ini (paket data DETAK)</p>
                <ul className="mt-1 grid gap-1 text-xs text-muted">
                  {incidents.map((i) => (
                    <li key={i.date + i.place}>
                      {i.date} · {i.place} · <b className="text-ink-2">{i.victims} korban</b> · jeda {i.gap} · {i.src}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </section>
      </div>

      <section className="mt-6 grid gap-6 xl:grid-cols-2">
        <div data-tour="hist" className="card p-4">
          <h2 className="flex items-center font-display text-xl font-bold">
            Sebaran Indeks Paparan saat makan
            <InfoTip title="Cara membaca histogram">
              Setiap batang = jumlah batch dengan Indeks Paparan (P95) dalam rentang 0,05. Sumbu tegak memakai skala akar supaya ekor kanan yang jarang tetap terlihat. Zona kuning 0,8–1,0 (Waspada), merah ≥ 1,0 (Buang). P50 = median, P95 = 95% batch berada di bawahnya. Dapur yang sehat menghasilkan sebaran yang menumpuk jauh di kiri garis 0,8.
            </InfoTip>
          </h2>
          <p className="mt-1 text-xs text-muted">{fmtInt(scoped.length)} batch hari ini, termasuk yang belum disantap (memakai proyeksi).</p>
          <div className="mt-3">
            <IpHistogram states={scoped} />
          </div>
        </div>
        <div data-tour="flow" className="card p-4">
          <h2 className="flex items-center font-display text-xl font-bold">
            Ritme operasi hari ini
            <InfoTip title="Ritme operasi">
              Jumlah batch di setiap tahap, dihitung tiap 10 menit dari jadwal matang, berangkat, tiba, dan makan. Puncak oranye = jam sibuk distribusi, saat Satgas paling perlu siaga. Garis hitam = waktu sekarang di layar ini.
            </InfoTip>
          </h2>
          <p className="mt-1 text-xs text-muted">Jam {province.tzLabel}. Gunakan untuk menjadwalkan patroli dan kunjungan.</p>
          <div className="mt-3">
            <DayFlow states={scoped} now={clock.now} tzOffset={province.tzOffset} />
          </div>
        </div>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[1.05fr_1fr]">
        <div data-tour="queue" className="card p-4">
          <div className="flex items-baseline justify-between">
            <h2 className="font-display text-xl font-bold">Antrean inspeksi</h2>
            <span className="font-mono text-[11px] text-muted">AHP–SAW · CR 0,0115</span>
          </div>
          <p className="mt-1 text-xs text-muted">Dapur dengan peringatan hari ini didahulukan; sisanya diurutkan dengan skor AHP–SAW dari riwayat 10 hari sekolah terakhir.</p>
          <ol className="mt-3 grid gap-1.5">
            {queue.slice(0, 12).map((r, i) => (
              <li key={r.kitchen.id}>
                <Link href={`${base}&k=${r.kitchen.id}`} scroll={false} className={`grid grid-cols-[28px_1fr_auto] items-center gap-3 rounded-xl border px-3 py-2 ${focus?.kitchen.id === r.kitchen.id ? "border-daun bg-daun-tint/60" : "border-line hover:border-ink/30"}`}>
                  <span className="font-mono text-sm text-muted">{i + 1}</span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold">{r.kitchen.name} <span className="font-normal text-muted">· {r.regency.name}</span></span>
                    <span className="block truncate text-xs text-muted">{r.reasons.join(" · ") || "tidak ada temuan menonjol"}</span>
                  </span>
                  <span className="font-mono text-sm tnum">{r.score.toFixed(3).replace(".", ",")}</span>
                </Link>
              </li>
            ))}
          </ol>
        </div>

        {focus ? (
          <div data-tour="pchart" className="card p-4">
            <Eyebrow>Dapur terpilih</Eyebrow>
            <div className="mt-1 flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="font-display text-xl font-bold">{focus.kitchen.name}</h2>
              <Link href={`/dapur/${focus.kitchen.id}${sp.t ? `?t=${encodeURIComponent(sp.t)}` : ""}`} className="text-xs font-semibold text-daun underline">
                buka layar dapur
              </Link>
            </div>
            <p className="text-xs text-muted">
              {focus.regency.name} · {fmtInt(focus.kitchen.beneficiaries)} penerima · {focus.kitchen.slhs ? "ber-SLHS" : "belum ber-SLHS"} · lewat ambang {fmtPct(focus.exceedRate)} batch (10 hari)
            </p>
            <p className="mt-3 flex items-center text-xs font-semibold text-ink-2">
              Komponen skor AHP–SAW
              <InfoTip title="Skor antrean inspeksi">
                Skor = Σ bobot × nilai kriteria (0–1). Bobot AHP dari matriks perbandingan berpasangan tim (CR 0,0115 &lt; 0,10): riwayat lewat ambang 10 hari 0,466; kepatuhan (SLHS dan kelengkapan data) 0,277; skala penerima 0,161; keterpencilan 0,096. Dapur yang punya peringatan hari ini selalu didahulukan.
              </InfoTip>
            </p>
            <div className="mt-2">
              <CriteriaBars criteria={focus.criteria} weights={AHP_WEIGHTS} />
            </div>
            <div className="mt-4">
              <p className="flex items-center text-xs font-semibold text-ink-2">
                Kartu kendali p · 20 ompreng per hari
                <InfoTip title="Kartu kendali p" align="right">
                  Setiap hari 20 ompreng dari dapur ini dicek. Proporsi dasar lewat ambang p₀ = 2%. Batas kendali atas UCL = p₀ + 3√(p₀(1−p₀)/20) = 0,114, artinya sinyal muncul bila ≥ 3 dari 20 ompreng lewat ambang. Alarm palsu rata-rata sekali per 141 hari; pergeseran ke 10% terdeteksi rata-rata dalam 3,1 hari.
                </InfoTip>
              </p>
              <PChart points={pts} ucl={PCHART.ucl} p0={PCHART.p0} />
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {scoped
                .filter((s) => s.batch.kitchen.id === focus.kitchen.id)
                .slice(0, 10)
                .map((s) => (
                  <Link key={s.id} href={`/cek/${s.id}${sp.t ? `?t=${encodeURIComponent(sp.t)}` : ""}`} className="flex items-center gap-1.5 rounded-lg border border-line px-2 py-1 text-xs hover:border-ink/40">
                    <StatusPill status={s.statusAtMeal} /> <span className="max-w-[140px] truncate">{s.batch.school.name}</span>
                  </Link>
                ))}
            </div>
          </div>
        ) : null}
      </section>
      <Tour
        id="dinas"
        steps={[
          { target: "kpi", title: "Lima angka yang dibaca pertama", body: <>Ringkasan provinsi saat ini. Merah = perlu tindakan. Klik ikon <b>i</b> di tiap angka untuk definisi dan cara hitungnya.</> },
          { target: "window", title: "Berapa lama waktu untuk bertindak", body: <>Satu baris satu batch bermasalah. Hijau = masih aman, merah = sudah lewat batas aman. Kalau merah mulai sebelum titik hitam (jam makan), batch itu akan disantap dalam kondisi berisiko.</> },
          { target: "alerts", title: "Tindak langsung dari sini", body: <><b>Tahan batch</b> mengirim status Ditahan ke label QR dan layar guru seketika. <b>Catat: SPPG dihubungi</b> menyimpan jejak tindakan untuk audit. Klik nama sekolah untuk melihat grafik perjalanan suhunya.</> },
          { target: "map", title: "Di mana dapurnya", body: <>Setiap titik satu SPPG, warnanya status terburuk hari ini. Lingkaran = ada peringatan dini. Indeks Moran nasional tidak signifikan, jadi titik merah biasanya tersebar: masalahnya di proses dapur, bukan wilayah.</> },
          { target: "hist", title: "Seberapa sehat provinsi ini hari ini", body: <>Sebaran Indeks Paparan semua batch. Yang penting adalah ekor kanan: batch di zona merah. P95 menunjukkan batas atas kebanyakan batch.</> },
          { target: "flow", title: "Jam sibuk distribusi", body: <>Puncak oranye = banyak batch di jalan. Jadwalkan patroli dan siaga Satgas di jam ini.</> },
          { target: "queue", title: "Dapur mana yang dikunjungi duluan", body: <>Antrean inspeksi dengan skor AHP–SAW. Alasan tiap peringkat tertulis di bawah nama dapur, supaya urutan kunjungan bisa dipertanggungjawabkan.</> },
          { target: "pchart", title: "Kebetulan atau pola?", body: <>Kartu kendali p 20 hari. Titik merah di atas garis UCL = sinyal statistik bahwa dapur ini bergeser dari normal, bukan sekadar sial satu hari.</> },
        ]}
      />
    </main>
  );
}
