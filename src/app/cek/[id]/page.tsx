import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ActionButton } from "@/components/action-button";
import { BacteriaDial } from "@/components/bacteria-dial";
import { BatchJourneyChart } from "@/components/charts";
import { CheckpointTimeline } from "@/components/checkpoint-track";
import { PersonaGate } from "@/components/persona-gate";
import { InfoTip } from "@/components/info-tip";
import { Tour } from "@/components/tour";
import { ReadingForm } from "@/components/reading-form";
import { Figure, STATUS_META, StatusPill, fmtInt, fmtIp } from "@/components/ui";
import { fmtClock, fmtDateLong, fmtDuration, resolveClock } from "@/lib/pilot/clock";
import { detailOf, evaluateBatch, PHASE_LABEL } from "@/lib/pilot/engine";
import { batchById, type Checkpoint } from "@/lib/pilot/sim";
import { batchEvents } from "@/lib/server/context";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const b = batchById(id);
  return { title: b ? `${b.school.name} · status makanan` : "Status makanan" };
}

export default async function CekPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ t?: string }> }) {
  const { id } = await params;
  const { t } = await searchParams;
  const b = batchById(id);
  if (!b) notFound();
  const clock = resolveClock(t);
  const now = b.serviceDate === clock.serviceDate ? clock.now : Date.parse(`${b.serviceDate}T23:59:00+07:00`);
  const events = await batchEvents(id);
  const d = detailOf(evaluateBatch(b, now, events), now);
  const tz = d.province.tzLabel;
  const shown = d.phase === "disantap" ? d.statusAtMeal : d.statusNow;
  const meta = STATUS_META[shown];
  const safeUntil = Number.isFinite(d.minutesLeft) ? Math.min(now, b.mealAt) + d.minutesLeft * 60_000 : null;
  const deadline = safeUntil ? Math.min(safeUntil, d.rule4hAt) : d.rule4hAt;
  const bindingIsModel = safeUntil !== null && safeUntil < d.rule4hAt;
  const wallH = (Math.min(now, b.mealAt) - b.cookedAt) / 3.6e6;
  const recorded = new Set(d.readings.filter((r) => !r.assumed).map((r) => r.checkpoint));
  const schoolCps = ([3, 4] as Checkpoint[]).filter((cp) => !recorded.has(cp));
  const canAct = d.phase === "di_sekolah" || d.phase === "perjalanan" || d.phase === "di_dapur";
  const expired = d.phase !== "disantap" && d.minutesLeft <= 0;
  const q = t ? `?t=${encodeURIComponent(t)}` : "";

  const verdict = d.held ? "Ditahan" : d.phase === "disantap" ? `${meta.label} saat disantap` : expired ? "Jangan dibagikan" : meta.verb;
  const verdictColor = d.held ? "text-ink" : expired ? "text-buang" : meta.fg;

  return (
    <main className="mx-auto max-w-6xl px-4 pb-16 pt-8 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link href={`/sekolah${q}`} className="whitespace-nowrap text-sm font-semibold text-ink-2 hover:text-ink">
          ← Sekolah lain
        </Link>
        <PersonaGate role="sekolah" />
      </div>

      <section className="mt-8 grid grid-cols-[minmax(0,1fr)] items-center gap-10 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div data-tour="verdict" className="min-w-0">
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted">
            <span className="font-semibold text-ink">{b.school.name}</span>
            <span>· {fmtDateLong(b.serviceDate)}</span>
          </p>
          <h1 className={`mt-4 text-[clamp(2.6rem,7vw,5.25rem)] font-extrabold leading-[0.92] tracking-[-0.045em] ${verdictColor}`}>{verdict}</h1>

          {d.held ? (
            <p className="mt-5 max-w-xl text-lg text-ink-2">
              Oleh {d.held.by}, pukul <span className="font-mono tnum">{fmtClock(d.held.at, b.tzOffset)}</span> {tz}. {d.held.reason}.
            </p>
          ) : d.phase === "disantap" ? (
            <p className="mt-5 text-lg text-ink-2">
              Disantap pukul <span className="font-mono tnum">{fmtClock(b.mealAt, b.tzOffset)}</span> dengan Indeks Paparan <span className="font-mono tnum">{fmtIp(d.ipAtMeal)}</span>.
            </p>
          ) : expired ? (
            <p className="mt-5 max-w-xl text-lg text-ink-2">Batas aman sudah habis. Simpan terpisah dan laporkan ke SPPG.</p>
          ) : (
            <div className="mt-6 flex flex-wrap items-end gap-x-5 gap-y-2">
              <p className="leading-none">
                <span className="block text-sm text-muted">aman disantap sampai</span>
                <span className="mt-1 block font-mono text-[clamp(2.5rem,6vw,4rem)] font-medium tracking-tight tnum">
                  {fmtClock(deadline, b.tzOffset)}
                  <span className="ml-2 text-lg text-muted">{tz}</span>
                </span>
              </p>
              <p className="pb-2 font-mono text-sm text-ink-2 tnum">{fmtDuration((deadline - Math.min(now, b.mealAt)) / 60_000)} lagi</p>
            </div>
          )}

          <p className="mt-6 flex items-center gap-2 text-sm text-muted">
            <StatusPill status={d.held ? d.statusAtMeal : shown} size="lg" />
            <span>{PHASE_LABEL[d.phase].toLowerCase()}</span>
            <InfoTip title="Arti status">
              <b className="text-aman">Aman</b>: IP di bawah 0,8, boleh dibagikan. <b className="text-waspada-ink">Waspada</b>: 0,8 sampai di bawah 1,0, bagikan segera. <b className="text-buang">Buang</b>: 1,0 atau lebih, batas pertumbuhan bakteri habis. IP = pertumbuhan <i>Bacillus cereus</i> dari suhu dan waktu, dibagi batas 3 log.
            </InfoTip>
          </p>
        </div>

        <figure data-tour="dial" className="card justify-self-center p-5 lg:justify-self-end">
          <BacteriaDial wallHours={wallH} ip={d.phase === "disantap" ? d.ipAtMeal : d.ipNow} status={d.held ? d.statusAtMeal : shown} size={280} />
        </figure>
      </section>

      <section className="mt-10 grid grid-cols-3 divide-x divide-line border-y border-line py-5">
        <div className="pr-3 sm:pr-6">
          <Figure value={fmtIp(d.ipNow)} label="IP sekarang" info={<InfoTip title="IP sekarang">Pertumbuhan bakteri yang sudah terkumpul sampai saat ini, dibagi batas aman 3 log. 1,0 berarti batas habis.</InfoTip>} />
        </div>
        <div className="px-3 sm:px-6">
          <Figure value={fmtIp(d.ipAtMeal)} label="IP saat makan" tone={d.statusAtMeal === "aman" ? undefined : d.statusAtMeal} info={<InfoTip title="Proyeksi saat makan">Perkiraan IP pada jam makan terjadwal, memakai suhu ruang kelas dari sensor sekolah. Ini dasar peringatan dini.</InfoTip>} />
        </div>
        <div className="pl-3 sm:pl-6">
          <Figure value={fmtClock(d.rule4hAt, b.tzOffset)} label="batas 4 jam BGN" info={<InfoTip title="Aturan 4 jam" align="right">Jam matang + 4 jam (SIPERS-281/BGN/08/2026). DETAK memakai mana yang lebih dulu habis: aturan ini atau batas IP.</InfoTip>} />
        </div>
      </section>
      {!d.held && d.phase !== "disantap" && safeUntil ? (
        <p className="mt-3 text-sm text-muted">
          {bindingIsModel ? (
            <>
              <b className="font-semibold text-ink">Batas IP habis lebih dulu dari aturan 4 jam</b> karena suhu ruang {b.schoolAmbientC.toFixed(1).replace(".", ",")}°C.
            </>
          ) : (
            <>
              <b className="font-semibold text-ink">Aturan 4 jam habis lebih dulu</b>, jadi DETAK mengikuti aturan BGN.
            </>
          )}
        </p>
      ) : null}

      <section className="mt-10 grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
        <div data-tour="track" className="card self-start p-5">
          <h2 className="text-lg font-bold">Perjalanan</h2>
          <p className="mt-1 truncate text-xs text-muted">
            {b.kitchen.name} · {d.regency.name} · {b.kitchen.slhs ? "ber-SLHS" : "belum ber-SLHS"}
          </p>
          <div className="mt-5">
            <CheckpointTimeline s={d} now={now} />
          </div>
          <p className="mt-5 border-t border-line pt-3 text-xs text-muted">
            {fmtInt(b.school.portions)} porsi · {b.menu}
          </p>
        </div>

        <figure data-tour="journey" className="card min-w-0 p-5">
          <figcaption className="flex items-center text-lg font-bold">
            Suhu dan Indeks Paparan
            <InfoTip title="Cara membaca" align="right">
              Garis abu = suhu makanan. Garis hitam = Indeks Paparan (putus-putus = proyeksi sampai jam makan). Titik bernomor = titik cek; titik putih = nilai asumsi karena tidak tercatat.
            </InfoTip>
          </figcaption>
          <div className="mt-4">
            <BatchJourneyChart path={d.path} readings={batchReadings(d)} cookedAt={b.cookedAt} mealAt={b.mealAt} rule4hAt={d.rule4hAt} now={now} tzOffset={b.tzOffset} />
          </div>
        </figure>
      </section>

      {canAct && !d.held ? (
        <section data-tour="act" className="mt-6 grid grid-cols-[minmax(0,1fr)] gap-6 rounded-[var(--radius-tray)] bg-paper-2 p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div>
            <h2 className="text-lg font-bold">Guru piket</h2>
            {schoolCps.length ? (
              <div className="mt-4">
                <ReadingForm batchId={id} checkpoints={schoolCps} suggestedCp={schoolCps[0]} ambientC={b.schoolAmbientC} t={t} />
              </div>
            ) : (
              <p className="mt-2 text-sm text-muted">Titik Tiba dan Pra-konsumsi sudah tercatat.</p>
            )}
          </div>
          <div className="flex flex-col justify-end gap-3 lg:border-l lg:border-line-2 lg:pl-6">
            <p className="text-sm text-ink-2">
              <b>Berbau, berlendir, atau Buang?</b> <span className="text-muted">Tahan. Dinas dan SPPG langsung menerima tanda Ditahan.</span>
            </p>
            <ActionButton batchId={id} kind="hold" reason="Ditahan guru di sekolah sebelum dibagikan" label="Tahan, jangan dibagikan" tone="danger" t={t} />
          </div>
        </section>
      ) : null}

      <Tour
        id="cek-v2"
        steps={[
          { target: "verdict", title: "Jawaban satu kalimat", body: <>Hijau boleh dibagikan, kuning segera, merah jangan. Di bawahnya: sampai jam berapa.</> },
          { target: "dial", title: "Dua jarum", body: <>Hitam = jam sejak matang. Berwarna = pertumbuhan bakteri. Di ruangan panas, jarum berwarna berlari lebih cepat.</> },
          { target: "track", title: "Empat titik cek", body: <>Suhu diukur di dapur, saat berangkat, tiba, dan sebelum makan. Merah = tidak tercatat.</> },
          { target: "journey", title: "Kurva perjalanan", body: <>Garis hitam naik seiring waktu. Putus-putus = proyeksi sampai jam makan.</> },
          ...(canAct && !d.held ? [{ target: "act", title: "Guru bisa bertindak", body: <>Catat suhu, atau tahan batch. Tanda Ditahan langsung sampai ke Dinas dan SPPG.</> }] : []),
        ]}
      />
    </main>
  );
}

function batchReadings(d: ReturnType<typeof detailOf>) {
  return d.readings.map((r) => ({ checkpoint: r.checkpoint, at: r.at, foodC: r.foodC, source: r.assumed ? "asumsi" : r.source }));
}
