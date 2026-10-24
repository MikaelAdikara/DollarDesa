import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { BatchLabel } from "@/components/batch-label";
import { PChart } from "@/components/charts";
import { CheckpointTimeline, CheckpointTrack } from "@/components/checkpoint-track";
import { InfoTip } from "@/components/info-tip";
import { PersonaGate } from "@/components/persona-gate";
import { Tour } from "@/components/tour";
import { ReadingForm } from "@/components/reading-form";
import { Figure, PHASE_STYLE, STATUS_META, fmtInt, fmtIp, fmtPct } from "@/components/ui";
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
  const tOnly = sp.t ? `?t=${encodeURIComponent(sp.t)}` : "";
  const todo = ordered.filter((s) => nextCheckpoint(s) !== null && s.phase !== "disantap" && s.phase !== "ditahan");

  return (
    <main className="mx-auto max-w-7xl px-4 pb-28 pt-8 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href={`/dapur?${tq}prov=${k.provinceId}&reg=${k.regencyId}`} className="whitespace-nowrap text-sm font-semibold text-ink-2 hover:text-ink">
          ← Dapur {reg.regency.name}
        </Link>
        <PersonaGate role="sppg" />
      </div>

      <header className="mt-8 grid grid-cols-[minmax(0,1fr)] items-end gap-8 lg:grid-cols-[minmax(0,1fr)_auto]">
        <div className="min-w-0">
          <h1 className="text-[clamp(2.2rem,5vw,3.75rem)] font-extrabold leading-none tracking-[-0.04em]">{k.name}</h1>
          <p className="mt-3 text-sm text-muted">
            {reg.regency.name}, {reg.province.short} · {fmtInt(k.beneficiaries)} penerima · {k.slhs ? "ber-SLHS" : "belum ber-SLHS"} · {k.ageMonths} bulan beroperasi · jam {tz}
          </p>
        </div>
        <div className="grid grid-cols-3 divide-x divide-line">
          <div className="pr-6">
            <Figure value={sum.batches} label="batch" />
          </div>
          <div className="px-6">
            <Figure value={fmtPct(sum.completeness, 0)} label="data lengkap" info={<InfoTip title="Kelengkapan data">Titik cek jatuh tempo yang benar-benar tercatat. Titik bolong diganti asumsi konservatif.</InfoTip>} />
          </div>
          <div className="pl-6">
            <Figure value={sum.early} label="peringatan" tone={sum.early ? "buang" : undefined} />
          </div>
        </div>
      </header>

      {todo.length ? (
        <Link href={`/dapur/${id}?${tq}b=${todo[0].id}`} scroll={false} className="mt-8 flex items-center gap-3 rounded-full bg-ink py-2 pl-4 pr-2 text-sm text-card transition-opacity duration-150 hover:opacity-90">
          <span className="relative flex h-2 w-2 shrink-0">
            <span className="pulse-dot absolute inline-flex h-full w-full rounded-full bg-detak" />
          </span>
          <span className="min-w-0 flex-1 truncate">
            <b>{todo.length} batch</b> belum dicatat di titik {todo.map((s) => nextCheckpoint(s)).filter((v, i, a) => a.indexOf(v) === i).join(" & ")}
          </span>
          <span className="shrink-0 whitespace-nowrap rounded-full bg-detak px-3 py-1 text-xs font-semibold text-ink">Mulai: {todo[0].batch.school.name}</span>
        </Link>
      ) : null}

      <div className="mt-6 grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <section data-tour="batches" aria-label="Batch hari ini" className="card self-start overflow-hidden">
          <div className="hidden grid-cols-[64px_minmax(0,1fr)_120px_84px] gap-4 border-b border-line bg-paper px-5 py-2 font-mono text-[10px] uppercase tracking-wider text-muted sm:grid">
            <span>Makan</span>
            <span>Tujuan</span>
            <span className="flex items-center">
              Titik cek
              <InfoTip title="Empat titik cek">1 Matang · 2 Berangkat · 3 Tiba · 4 Pra-konsumsi. Hijau = tercatat, merah = bolong, abu = belum waktunya.</InfoTip>
            </span>
            <span className="text-right">IP makan</span>
          </div>
          <ol className="divide-y divide-line">
            {ordered.map((s) => {
              const active = s.id === selected?.id;
              return (
                <li key={s.id}>
                  <Link href={`/dapur/${id}?${tq}b=${s.id}`} scroll={false} aria-current={active ? "true" : undefined} className={`relative grid grid-cols-[56px_minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 px-5 py-3 transition-colors duration-150 sm:grid-cols-[64px_minmax(0,1fr)_120px_84px] ${active ? "bg-daun-tint" : "hover:bg-paper"}`}>
                    {active ? <span aria-hidden className="absolute inset-y-0 left-0 w-[3px] bg-daun" /> : null}
                    <span className="font-mono text-lg tnum">{fmtClock(s.batch.mealAt, s.batch.tzOffset)}</span>
                    <span className="min-w-0">
                      <span className="block truncate font-semibold">{s.batch.school.name}</span>
                      <span className="flex items-center gap-2 text-xs text-muted">
                        <span className={`rounded-full px-2 py-px text-[11px] font-semibold ${PHASE_STYLE[s.phase]}`}>{PHASE_LABEL[s.phase]}</span>
                        <span className="truncate">{fmtInt(s.batch.school.portions)} porsi · {s.batch.school.travelMin} mnt</span>
                      </span>
                    </span>
                    <span className="hidden sm:block">
                      <CheckpointTrack s={s} compact />
                    </span>
                    <span className="text-right font-mono text-lg tnum" style={{ color: STATUS_META[s.statusAtMeal].hex }}>
                      {fmtIp(s.ipAtMeal)}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ol>
        </section>

        <aside className="grid content-start gap-4 lg:sticky lg:top-24">
          {selected ? (
            <>
              <div data-tour="form" className="card p-5">
                <div className="flex items-baseline justify-between gap-2">
                  <h2 className="truncate text-lg font-bold">{selected.batch.school.name}</h2>
                  <Link className="shrink-0 whitespace-nowrap text-xs font-semibold text-daun hover:underline" href={`/cek/${selected.id}${tOnly}`}>
                    Layar guru →
                  </Link>
                </div>
                <div className="mt-4">
                  <CheckpointTimeline s={selected} now={clock.now} />
                </div>
                <div className="mt-5 border-t border-line pt-4">
                  {selected.phase === "dimasak" ? (
                    <p className="text-sm text-muted">Belum matang. Form terbuka pukul {fmtClock(selected.batch.cookedAt, selected.batch.tzOffset)}.</p>
                  ) : selected.phase === "disantap" || selected.phase === "ditahan" ? (
                    <p className="text-sm text-muted">Sudah {selected.phase === "ditahan" ? "ditahan" : "disantap"}. Catatan tidak bisa diisi mundur.</p>
                  ) : nextCheckpoint(selected) === null ? (
                    <p className="text-sm text-muted">Titik dapur lengkap. Titik Tiba dan Pra-konsumsi diisi guru lewat QR.</p>
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
              </div>
              <div data-tour="label">
                <BatchLabel s={selected} origin={origin} />
              </div>
            </>
          ) : null}
          <figure className="card p-5">
            <figcaption className="flex items-center text-sm font-semibold">
              Kartu kendali p · 20 hari
              <InfoTip title="Kartu kendali p" align="right">20 ompreng dicek per hari. Titik di atas garis UCL = ≥ 3 ompreng lewat ambang, sinyal untuk kunjungan.</InfoTip>
            </figcaption>
            <div className="mt-2">
              <PChart points={pts} ucl={PCHART.ucl} p0={PCHART.p0} />
            </div>
          </figure>
        </aside>
      </div>
      <Tour
        id="dapur-v2"
        steps={[
          { target: "batches", title: "Batch hari ini", body: <>Satu baris satu pengantaran, urut jam makan. Angka kanan = IP saat makan.</> },
          { target: "form", title: "Catat suhu", body: <>Ketik suhu dari termometer tusuk. Jam dicap server, IP langsung dihitung ulang.</> },
          { target: "label", title: "Label QR", body: <>Ditempel di boks. Guru dan orang tua memindainya untuk melihat status.</> },
        ]}
      />
    </main>
  );
}
