import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { BatchLabel } from "@/components/batch-label";
import { PChart } from "@/components/charts";
import { CheckpointTrack } from "@/components/checkpoint-track";
import { PersonaGate } from "@/components/persona-gate";
import { Tour } from "@/components/tour";
import { ReadingForm } from "@/components/reading-form";
import { Eyebrow, PHASE_STYLE, StatusPill, fmtInt, fmtIp, fmtPct } from "@/components/ui";
import { fmtClock } from "@/lib/pilot/clock";
import { PCHART, PHASE_LABEL, pChart, summarize, type BatchState } from "@/lib/pilot/engine";
import { regencyById } from "@/lib/pilot/reference";
import { kitchenById, type Checkpoint } from "@/lib/pilot/sim";
import { dayContext } from "@/lib/server/context";
import { requestOrigin } from "@/lib/server/origin";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  return { title: kitchenById(id)?.name ?? "Dapur" };
}

function nextCheckpoint(s: BatchState): Checkpoint | null {
  const have = new Set(s.readings.filter((r) => !r.assumed).map((r) => r.checkpoint));
  for (const cp of [1, 2] as Checkpoint[]) if (!have.has(cp) && s.phase !== "dimasak") return cp;
  return null;
}

export default async function DapurPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ t?: string; b?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  const k = kitchenById(id);
  if (!k) notFound();
  const { clock, states } = await dayContext(sp.t, { kitchen: id });
  const reg = regencyById(k.regencyId)!;
  const sum = summarize(states);
  const ordered = [...states].sort((a, b) => a.batch.mealAt - b.batch.mealAt);
  const selected = ordered.find((s) => s.id === sp.b) ?? ordered.find((s) => s.phase === "di_dapur" || s.phase === "perjalanan") ?? ordered[0];
  const origin = await requestOrigin();
  const pts = pChart(id, clock.serviceDate, states);
  const tz = reg.province.tzLabel;
  const tq = sp.t ? `t=${encodeURIComponent(sp.t)}&` : "";
  const todo = ordered.filter((s) => nextCheckpoint(s) !== null && s.phase !== "disantap" && s.phase !== "ditahan");

  return (
    <main className="mx-auto max-w-7xl px-4 pb-24 pt-6 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href={`/dapur?${tq}prov=${k.provinceId}&reg=${k.regencyId}`} className="text-sm font-semibold text-daun">
          ← Semua dapur {reg.regency.name}
        </Link>
        <PersonaGate role="sppg" />
      </div>
      <header className="mt-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <Eyebrow>
            {reg.regency.name}, {reg.province.short} · {k.id}
          </Eyebrow>
          <h1 className="mt-1 font-display text-4xl font-extrabold tracking-tight">{k.name}</h1>
          <p className="mt-1 text-sm text-muted">
            {fmtInt(k.beneficiaries)} penerima · {k.schools.length} titik antar · {k.slhs ? "ber-SLHS" : "belum ber-SLHS"} · beroperasi {k.ageMonths} bulan · jam {tz}
          </p>
        </div>
        <dl className="flex gap-6">
          <div>
            <dt className="text-xs text-muted">Batch hari ini</dt>
            <dd className="font-display text-2xl font-bold">{sum.batches}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted">Kelengkapan data</dt>
            <dd className="font-display text-2xl font-bold">{fmtPct(sum.completeness, 0)}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted">Peringatan</dt>
            <dd className={`font-display text-2xl font-bold ${sum.early ? "text-buang" : ""}`}>{sum.early}</dd>
          </div>
        </dl>
      </header>

      {todo.length ? (
        <section className="mt-6 rounded-[14px] border border-detak/40 bg-detak-tint px-4 py-3 text-sm">
          <b>Tugas sekarang:</b> {todo.length} batch belum dicatat suhunya di titik {todo.map((s) => nextCheckpoint(s)).filter((v, i, a) => a.indexOf(v) === i).join(" & ")}. Mulai dari{" "}
          <Link className="font-semibold underline" href={`/dapur/${id}?${tq}b=${todo[0].id}`}>
            {todo[0].batch.school.name}
          </Link>
          .
        </section>
      ) : null}

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
        <section data-tour="batches" aria-label="Batch hari ini" className="grid content-start gap-2">
          {ordered.map((s) => {
            const active = s.id === selected?.id;
            return (
              <Link key={s.id} href={`/dapur/${id}?${tq}b=${s.id}`} scroll={false} className={`card grid gap-3 p-4 transition sm:grid-cols-[1.3fr_1fr_auto] sm:items-center ${active ? "border-daun ring-2 ring-daun/30" : "hover:border-ink/30"}`}>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${PHASE_STYLE[s.phase]}`}>{PHASE_LABEL[s.phase]}</span>
                    <span className="font-mono text-xs text-muted">makan {fmtClock(s.batch.mealAt, s.batch.tzOffset)}</span>
                  </div>
                  <p className="mt-1 truncate font-semibold">{s.batch.school.name}</p>
                  <p className="text-xs text-muted">{fmtInt(s.batch.school.portions)} porsi · tempuh {s.batch.school.travelMin} menit</p>
                </div>
                <CheckpointTrack s={s} compact />
                <div className="flex items-center gap-3 sm:flex-col sm:items-end sm:gap-1">
                  <StatusPill status={s.statusAtMeal} />
                  <span className="font-mono text-xs tnum text-muted">IP makan {fmtIp(s.ipAtMeal)}</span>
                </div>
              </Link>
            );
          })}
        </section>

        <aside className="grid content-start gap-4 lg:sticky lg:top-20">
          {selected ? (
            <>
              <div data-tour="form" className="card p-4">
                <Eyebrow>Catat suhu · {selected.batch.school.name}</Eyebrow>
                <div className="mt-3">
                  <CheckpointTrack s={selected} />
                </div>
                <div className="mt-4">
                  {selected.phase === "dimasak" ? (
                    <p className="text-sm text-muted">Batch ini belum matang. Form terbuka setelah jam matang {fmtClock(selected.batch.cookedAt, selected.batch.tzOffset)}.</p>
                  ) : selected.phase === "disantap" || selected.phase === "ditahan" ? (
                    <p className="text-sm text-muted">Batch ini sudah {selected.phase === "ditahan" ? "ditahan" : "disantap"}. Catatan yang terlewat tidak bisa diisi mundur.</p>
                  ) : nextCheckpoint(selected) === null ? (
                    <p className="text-sm text-muted">Titik Matang dan Berangkat sudah tercatat. Titik Tiba dan Pra-konsumsi dicatat oleh guru piket di sekolah lewat QR pada label.</p>
                  ) : (
                    <ReadingForm
                      key={selected.id}
                      batchId={selected.id}
                      checkpoints={[1, 2]}
                      suggestedCp={nextCheckpoint(selected) ?? 2}
                      ambientC={selected.readings.at(-1)?.ambientC ?? selected.batch.schoolAmbientC}
                      t={sp.t}
                    />
                  )}
                </div>
                <p className="mt-3 border-t border-line pt-3 text-xs text-muted">
                  Menu: {selected.batch.menu}. <Link className="font-semibold text-daun underline" href={`/cek/${selected.id}${sp.t ? `?t=${encodeURIComponent(sp.t)}` : ""}`}>Lihat seperti guru →</Link>
                </p>
              </div>
              <div data-tour="label">
                <BatchLabel s={selected} origin={origin} />
              </div>
            </>
          ) : null}
          <div className="card p-4">
            <Eyebrow>Kartu kendali p · 20 hari</Eyebrow>
            <p className="mt-1 text-xs text-muted">20 ompreng dicek per hari. Titik merah = ≥ 3 ompreng lewat ambang (sinyal kunjungan).</p>
            <div className="mt-2">
              <PChart points={pts} ucl={PCHART.ucl} p0={PCHART.p0} />
            </div>
          </div>
        </aside>
      </div>
      <Tour
        id="dapur"
        steps={[
          { target: "batches", title: "Semua batch dapur ini hari ini", body: <>Satu kartu = satu pengantaran ke sekolah atau posyandu, urut jam makan. Empat bulatan = titik cek: hijau sudah tercatat, merah bolong, abu belum waktunya. Status di kanan adalah proyeksi saat jam makan.</> },
          { target: "form", title: "Catat suhu dalam 10 detik", body: <>Petugas cukup mengetik suhu dari termometer tusuk. Suhu ruang terisi dari sensor dan jam dicap server, jadi tidak bisa dimundurkan. Setelah disimpan, Indeks Paparan langsung dihitung ulang.</> },
          { target: "label", title: "Label QR untuk boks", body: <>Dicetak printer termal dan ditempel di boks. Guru dan orang tua memindai QR ini untuk melihat status batch secara langsung.</> },
        ]}
      />
    </main>
  );
}
