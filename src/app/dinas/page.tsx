import Link from "next/link";
import type { Metadata } from "next";
import { ActionButton } from "@/components/action-button";
import { Board, BoardColumns, BoardHeader } from "@/components/board";
import { InfoTip } from "@/components/info-tip";
import { Tour } from "@/components/tour";
import { DayFlow, IpHistogram } from "@/components/viz";
import { CriteriaBars, PChart } from "@/components/charts";
import { GeoMap, PROVINCE_BBOX } from "@/components/geo-map";
import { PersonaGate } from "@/components/persona-gate";
import { Figure, STATUS_META, SegLink, StatusPill, fmtInt, fmtIp, fmtPct } from "@/components/ui";
import { statusOf } from "@/lib/model/ip";
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
  const q = sp.t ? `?t=${encodeURIComponent(sp.t)}` : "";
  const base = `/dinas?${tq}prov=${prov}${reg ? `&reg=${reg}` : ""}`;
  const incidents = PILOT_INCIDENTS.filter((i) => i.province === prov);
  const hm = clock.label.split("·").pop()?.trim();

  return (
    <main className="mx-auto max-w-[1400px] px-4 pb-28 pt-8 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav aria-label="Provinsi" className="flex gap-1 rounded-full bg-paper-2 p-1">
          {PROVINCES.map((p) => (
            <SegLink key={p.id} href={`/dinas?${tq}prov=${p.id}`} active={p.id === prov}>
              {p.short}
            </SegLink>
          ))}
        </nav>
        <PersonaGate role="dinas" />
      </div>

      <header className="mt-8">
        <h1 className="text-[clamp(2rem,4.5vw,3.5rem)] font-extrabold leading-none tracking-[-0.035em]">{reg ? province.regencies.find((r) => r.id === reg)!.name : province.name}</h1>
        <p className="mt-3 text-sm text-muted">
          Klaster {province.cluster} · {fmtInt(rows.length)} SPPG · {fmtInt(sum.portions)} porsi · jam {province.tzLabel}
        </p>
        <nav aria-label="Kabupaten/kota" className="-mx-1 mt-5 flex gap-1 overflow-x-auto px-1 pb-1 [scrollbar-width:none]">
          <SegLink href={`/dinas?${tq}prov=${prov}`} active={!reg}>
            Semua
          </SegLink>
          {province.regencies.map((r) => (
            <SegLink key={r.id} href={`/dinas?${tq}prov=${prov}&reg=${r.id}`} active={reg === r.id}>
              {r.name}
            </SegLink>
          ))}
        </nav>
      </header>

      {storeError ? <p className="mt-4 rounded-lg bg-buang-tint px-3 py-2 text-sm text-buang">Penyimpanan tidak bisa dibaca: {storeError}. Data dapur tetap tampil, tindakan belum tersimpan.</p> : null}

      <section data-tour="kpi" className="mt-8 grid grid-cols-2 gap-y-7 border-y border-line py-6 md:grid-cols-5 md:divide-x md:divide-line">
        <div className="pr-4 md:pr-6">
          <Figure value={fmtInt(sum.early)} label="peringatan dini" tone={sum.early ? "buang" : undefined} info={<InfoTip title="Peringatan dini">Batch yang belum disantap, tetapi Indeks Paparan P95-nya diproyeksikan ≥ 1,0 pada jam makan. Ini daftar yang harus ditindak sekarang.</InfoTip>} />
        </div>
        <div className="pl-4 md:px-6">
          <Figure value={fmtInt(sum.servedOver)} label="tersaji di atas ambang" tone={sum.servedOver ? "buang" : undefined} info={<InfoTip title="Tersaji di atas ambang">Sudah disantap dengan IP ≥ 1,0 dan tidak ditahan. Bukan berarti pasti ada korban (P95 itu konservatif), tetapi sekolahnya perlu dipantau hari ini.</InfoTip>} />
        </div>
        <div className="pr-4 md:px-6">
          <Figure value={fmtInt(sum.held)} label={`ditahan · ${fmtInt(sum.heldPortions)} porsi`} info={<InfoTip title="Ditahan">Batch yang ditahan guru piket, SPPG, atau Satgas. Di simulasi, guru menahan ±75% batch yang terbaca Buang pada cek pra-konsumsi.</InfoTip>} />
        </div>
        <div className="pl-4 md:px-6">
          <Figure value={fmtInt(sum.byStatus.waspada)} label="waspada saat makan" tone="waspada" info={<InfoTip title="Waspada">IP 0,8 sampai di bawah 1,0 saat jam makan: masih boleh dibagikan, tetapi segera. Jumlah tinggi berarti jadwal distribusi terlalu mepet.</InfoTip>} />
        </div>
        <div className="col-span-2 md:col-span-1 md:pl-6">
          <Figure value={fmtPct(sum.completeness)} label="data lengkap" info={<InfoTip title="Kelengkapan data" align="right">Titik cek jatuh tempo yang tercatat ÷ semua titik cek jatuh tempo. Titik yang bolong diganti asumsi konservatif 65°C saat matang, jadi data bolong menaikkan IP, bukan menurunkannya.</InfoTip>} />
        </div>
      </section>

      <div className="mt-8 grid grid-cols-[minmax(0,1fr)] gap-6 xl:grid-cols-[1.4fr_1fr]">
        <section data-tour="alerts" aria-label="Peringatan dini" className="board self-start overflow-hidden">
          <BoardHeader title="Peringatan dini" live={hm} right={<span className="font-mono text-xs text-night-muted">{alerts.length} batch · urut sisa waktu</span>} />
          <BoardColumns action />
          <Board
            rows={alerts.slice(0, 40)}
            now={clock.now}
            t={sp.t}
            maxH="max-h-[640px]"
            sub={(a) => `${a.regency.name} · ${fmtInt(a.batch.school.portions)} porsi · ${PHASE_LABEL[a.phase].toLowerCase()}`}
            empty="Tidak ada batch yang diproyeksikan lewat ambang saat ini."
            action={(a) => (
              <>
                <ActionButton batchId={a.id} kind="hold" reason="Ditahan Satgas: proyeksi IP ≥ 1,0 saat jam makan" label="Tahan" tone="danger" size="sm" t={sp.t} />
                <ActionButton batchId={a.id} kind="inspect" reason="Satgas menghubungi SPPG untuk percepat distribusi" label="SPPG dihubungi" tone="night" size="sm" t={sp.t} />
              </>
            )}
          />
          {served.length ? (
            <p className="border-t border-night-line px-5 py-3 text-xs text-night-muted">
              <b className="text-buang">{served.length} batch</b> sudah disantap dengan IP ≥ 1,0. Dapurnya naik ke puncak antrean inspeksi.
            </p>
          ) : null}
        </section>

        <section data-tour="map" className="card self-start p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-lg font-bold">Peta dapur</h2>
            <span className="flex gap-3 text-[11px] text-muted">
              {(["aman", "waspada", "buang"] as const).map((s) => (
                <span key={s} className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full" style={{ background: STATUS_META[s].hex }} />
                  {STATUS_META[s].label}
                </span>
              ))}
              <span className="flex items-center gap-1">
                <span className="h-2.5 w-2.5 rounded-full border border-ink" /> peringatan
              </span>
            </span>
          </div>
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
            <ul className="mt-3 divide-y divide-line border-t border-line text-xs">
              {incidents.map((i) => (
                <li key={i.date + i.place} className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 py-2">
                  <span className="min-w-0 truncate text-ink-2">
                    {i.place} <span className="text-muted">· {i.date} · {i.src}</span>
                  </span>
                  <span className="font-mono text-buang tnum">{i.victims} korban</span>
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      </div>

      <section className="mt-6 grid grid-cols-[minmax(0,1fr)] gap-6 xl:grid-cols-2">
        <figure data-tour="hist" className="card p-5">
          <figcaption className="flex items-baseline justify-between gap-2">
            <h2 className="flex items-center text-lg font-bold">
              Sebaran IP saat makan
              <InfoTip title="Cara membaca">
                Setiap batang = jumlah batch dalam rentang IP 0,05. Sumbu tegak berskala akar supaya ekor kanan tetap terlihat. Kuning 0,8–1,0 Waspada, merah ≥ 1,0 Buang. Batch yang belum disantap memakai proyeksi.
              </InfoTip>
            </h2>
            <span className="font-mono text-xs text-muted tnum">{fmtInt(scoped.length)} batch</span>
          </figcaption>
          <div className="mt-4">
            <IpHistogram states={scoped} />
          </div>
        </figure>
        <figure data-tour="flow" className="card p-5">
          <figcaption className="flex items-baseline justify-between gap-2">
            <h2 className="flex items-center text-lg font-bold">
              Ritme operasi
              <InfoTip title="Ritme operasi" align="right">
                Jumlah batch di tiap tahap, dihitung tiap 10 menit. Puncak oranye = jam sibuk distribusi, saat Satgas paling perlu siaga. Garis hitam = sekarang.
              </InfoTip>
            </h2>
            <span className="font-mono text-xs text-muted">jam {province.tzLabel}</span>
          </figcaption>
          <div className="mt-4">
            <DayFlow states={scoped} now={clock.now} tzOffset={province.tzOffset} />
          </div>
        </figure>
      </section>

      <section className="mt-6 grid grid-cols-[minmax(0,1fr)] gap-6 xl:grid-cols-[1.1fr_1fr]">
        <div data-tour="queue" className="card self-start overflow-hidden">
          <div className="flex items-baseline justify-between gap-2 px-5 pb-3 pt-5">
            <h2 className="flex items-center text-lg font-bold">
              Antrean inspeksi
              <InfoTip title="Urutan kunjungan">Dapur dengan peringatan hari ini didahulukan. Sisanya diurutkan skor AHP–SAW dari riwayat 10 hari sekolah terakhir. Klik baris untuk melihat rinciannya.</InfoTip>
            </h2>
            <span className="font-mono text-[11px] text-muted">AHP–SAW · CR 0,0115</span>
          </div>
          <div className="grid grid-cols-[32px_minmax(0,1fr)_64px] gap-3 border-y border-line bg-paper px-5 py-2 font-mono text-[10px] uppercase tracking-wider text-muted">
            <span>#</span>
            <span>Dapur · alasan</span>
            <span className="text-right">Skor</span>
          </div>
          <ol className="divide-y divide-line">
            {queue.slice(0, 12).map((r, i) => {
              const on = focus?.kitchen.id === r.kitchen.id;
              return (
                <li key={r.kitchen.id}>
                  <Link href={`${base}&k=${r.kitchen.id}`} scroll={false} aria-current={on ? "true" : undefined} className={`relative grid grid-cols-[32px_minmax(0,1fr)_64px] items-center gap-3 px-5 py-2.5 transition-colors duration-150 ${on ? "bg-daun-tint" : "hover:bg-paper"}`}>
                    {on ? <span aria-hidden className="absolute inset-y-0 left-0 w-[3px] bg-daun" /> : null}
                    <span className="font-mono text-sm text-muted tnum">{i + 1}</span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold">
                        {r.kitchen.name} <span className="font-normal text-muted">· {r.regency.name}</span>
                      </span>
                      <span className="block truncate text-xs text-muted">{r.reasons.join(" · ") || "tidak ada temuan menonjol"}</span>
                    </span>
                    <span className="text-right font-mono text-sm tnum">{r.score.toFixed(3).replace(".", ",")}</span>
                  </Link>
                </li>
              );
            })}
          </ol>
        </div>

        {focus ? (
          <div data-tour="pchart" className="card self-start p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-lg font-bold">{focus.kitchen.name}</h2>
              <Link href={`/dapur/${focus.kitchen.id}${q}`} className="whitespace-nowrap text-xs font-semibold text-daun hover:underline">
                Buka layar dapur →
              </Link>
            </div>
            <p className="mt-1 text-xs text-muted">
              {focus.regency.name} · {fmtInt(focus.kitchen.beneficiaries)} penerima · {focus.kitchen.slhs ? "ber-SLHS" : "belum ber-SLHS"}
            </p>

            <dl className="mt-5 grid grid-cols-2 divide-x divide-line border-y border-line py-4">
              <div className="pr-4">
                <dt className="text-xs text-muted">Lewat ambang, 10 hari</dt>
                <dd className={`font-mono text-2xl tnum ${focus.exceedRate > PCHART.p0 ? "text-buang" : ""}`}>{fmtPct(focus.exceedRate)}</dd>
              </div>
              <div className="pl-4">
                <dt className="text-xs text-muted">Skor antrean</dt>
                <dd className="font-mono text-2xl tnum">{focus.score.toFixed(3).replace(".", ",")}</dd>
              </div>
            </dl>

            <h3 className="mt-5 flex items-center text-sm font-semibold">
              Kartu kendali p
              <InfoTip title="Kartu kendali p" align="right">
                20 ompreng per hari dicek. p₀ = 2%. UCL = p₀ + 3√(p₀(1−p₀)/20) = 0,114, jadi sinyal muncul bila ≥ 3 dari 20 lewat ambang. Alarm palsu rata-rata sekali per 141 hari; pergeseran ke 10% terdeteksi dalam ±3,1 hari.
              </InfoTip>
            </h3>
            <PChart points={pts} ucl={PCHART.ucl} p0={PCHART.p0} />

            <h3 className="mt-5 flex items-center text-sm font-semibold">
              Komponen skor
              <InfoTip title="Skor AHP–SAW" align="right">
                Skor = Σ bobot × nilai kriteria (0–1). Bobot AHP (CR 0,0115): riwayat lewat ambang 0,466; kepatuhan (SLHS, kelengkapan data) 0,277; skala penerima 0,161; keterpencilan 0,096.
              </InfoTip>
            </h3>
            <div className="mt-2">
              <CriteriaBars criteria={focus.criteria} weights={AHP_WEIGHTS} />
            </div>

            <ul className="mt-5 flex flex-wrap gap-1.5">
              {scoped
                .filter((s) => s.batch.kitchen.id === focus.kitchen.id)
                .slice(0, 10)
                .map((s) => (
                  <li key={s.id}>
                    <Link href={`/cek/${s.id}${q}`} className="flex items-center gap-1.5 rounded-full border border-line py-1 pl-1 pr-2.5 text-xs transition-colors duration-150 hover:border-ink">
                      <StatusPill status={s.statusAtMeal} /> <span className="max-w-[150px] truncate">{s.batch.school.name}</span>
                    </Link>
                  </li>
                ))}
            </ul>
          </div>
        ) : null}
      </section>

      <Tour
        id="dinas-v2"
        steps={[
          { target: "kpi", title: "Lima angka pertama", body: <>Merah berarti perlu tindakan. Ikon <b>i</b> menjelaskan cara hitungnya.</> },
          { target: "alerts", title: "Tindak dari papan ini", body: <><b>Tahan</b> langsung mengubah label QR dan layar guru. Bar = sisa jendela aman sebelum jam makan.</> },
          { target: "map", title: "Di mana dapurnya", body: <>Satu titik satu SPPG. Lingkaran = ada peringatan dini. Klik titik untuk memilih dapur.</> },
          { target: "hist", title: "Ekor kanan", body: <>Yang dicari adalah batch di zona merah, bukan rata-ratanya.</> },
          { target: "flow", title: "Jam sibuk", body: <>Puncak oranye = banyak batch di jalan. Siagakan Satgas di jam ini.</> },
          { target: "queue", title: "Urutan kunjungan", body: <>Skor AHP–SAW dengan alasan tertulis, jadi urutannya bisa dipertanggungjawabkan.</> },
          { target: "pchart", title: "Kebetulan atau pola?", body: <>Titik di atas garis UCL = dapur bergeser dari normal, bukan sial satu hari.</> },
        ]}
      />
    </main>
  );
}
