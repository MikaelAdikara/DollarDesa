import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ActionButton } from "@/components/action-button";
import { BacteriaDial } from "@/components/bacteria-dial";
import { BatchJourneyChart } from "@/components/charts";
import { CheckpointTrack } from "@/components/checkpoint-track";
import { PersonaGate } from "@/components/persona-gate";
import { InfoTip } from "@/components/info-tip";
import { Tour } from "@/components/tour";
import { ReadingForm } from "@/components/reading-form";
import { Eyebrow, STATUS_META, fmtInt, fmtIp } from "@/components/ui";
import { fmtClock, fmtDateLong, fmtDuration, resolveClock } from "@/lib/pilot/clock";
import { detailOf, evaluateBatch, PHASE_LABEL } from "@/lib/pilot/engine";
import { batchById, CHECKPOINTS, type Checkpoint } from "@/lib/pilot/sim";
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

  return (
    <main className="mx-auto max-w-5xl px-4 pb-24 pt-6 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link href={`/sekolah${t ? `?t=${encodeURIComponent(t)}` : ""}`} className="text-sm font-semibold text-daun">
          ← Cari sekolah lain
        </Link>
        <PersonaGate role="sekolah" />
      </div>

      <div className="mt-4 grid gap-6 lg:grid-cols-[420px_1fr]">
        <section className="grid content-start gap-4">
          <div data-tour="verdict" className="card overflow-hidden">
            <div className={`${d.held ? "bg-ink text-white" : meta.bg} px-5 pb-5 pt-4`}>
              <p className={`font-mono text-[11px] font-semibold uppercase tracking-[0.14em] ${d.held ? "text-white/70" : "text-ink-2"}`}>
                {fmtDateLong(b.serviceDate)} · {b.school.name}
              </p>
              {d.held ? (
                <>
                  <p className="mt-3 font-display text-4xl font-extrabold leading-none">Ditahan</p>
                  <p className="mt-2 text-sm text-white/80">
                    oleh {d.held.by} pukul {fmtClock(d.held.at, b.tzOffset)} {tz}. {d.held.reason}. Jangan dibagikan.
                  </p>
                </>
              ) : (
                <>
                  <p className={`mt-3 font-display text-4xl font-extrabold leading-none ${meta.fg}`}>{d.phase === "disantap" ? `${meta.label} saat disantap` : meta.verb}</p>
                  <p className="mt-2 text-sm text-ink-2">
                    {d.phase === "disantap"
                      ? `Disantap pukul ${fmtClock(b.mealAt, b.tzOffset)} dengan Indeks Paparan ${fmtIp(d.ipAtMeal)}.`
                      : d.minutesLeft <= 0
                        ? "Batas aman sudah habis. Simpan, jangan dibagikan, dan laporkan ke SPPG."
                        : `Aman disantap sampai pukul ${fmtClock(deadline, b.tzOffset)} ${tz} (${fmtDuration((deadline - Math.min(now, b.mealAt)) / 60_000)} lagi).`}
                  </p>
                </>
              )}
            </div>
            <div className="grid grid-cols-3 divide-x divide-line border-t border-line text-center">
              <div className="px-2 py-3">
                <p className="flex items-center justify-center text-[11px] text-muted">IP sekarang<InfoTip title="Indeks Paparan sekarang">Pertumbuhan bakteri yang sudah terkumpul sampai saat ini, dibagi batas aman 3 log. 1,0 berarti batas aman habis.</InfoTip></p>
                <p className="font-display text-xl font-bold tnum">{fmtIp(d.ipNow)}</p>
              </div>
              <div className="px-2 py-3">
                <p className="flex items-center justify-center text-[11px] text-muted">IP saat makan<InfoTip title="Proyeksi saat makan">Perkiraan Indeks Paparan pada jam makan terjadwal, dengan suhu ruang kelas dari sensor sekolah. Inilah dasar peringatan dini.</InfoTip></p>
                <p className="font-display text-xl font-bold tnum">{fmtIp(d.ipAtMeal)}</p>
              </div>
              <div className="px-2 py-3">
                <p className="flex items-center justify-center text-[11px] text-muted">Batas 4 jam BGN<InfoTip title="Aturan 4 jam" align="right">Jam matang + 4 jam, sesuai siaran pers BGN SIPERS-281/BGN/08/2026. DETAK memakai mana yang lebih dulu habis: aturan ini atau batas Indeks Paparan.</InfoTip></p>
                <p className="font-display text-xl font-bold tnum">{fmtClock(d.rule4hAt, b.tzOffset)}</p>
              </div>
            </div>
            {!d.held && d.phase !== "disantap" && safeUntil ? (
              <p className="border-t border-line px-5 py-3 text-xs leading-relaxed text-muted">
                {bindingIsModel
                  ? `Pada suhu ruang ${b.schoolAmbientC.toFixed(1).replace(".", ",")}°C, batas Indeks Paparan habis lebih dulu daripada batas 4 jam. DETAK memakai yang lebih cepat.`
                  : "Batas 4 jam BGN habis lebih dulu daripada batas Indeks Paparan. DETAK tetap mengikuti aturan 4 jam."}
              </p>
            ) : null}
          </div>

          <div data-tour="dial" className="card flex justify-center p-5">
            <BacteriaDial wallHours={wallH} ip={d.phase === "disantap" ? d.ipAtMeal : d.ipNow} status={d.held ? d.statusAtMeal : shown} size={260} />
          </div>
        </section>

        <section className="grid content-start gap-4">
          <div data-tour="journey" className="card p-5">
            <Eyebrow>Perjalanan batch · {PHASE_LABEL[d.phase]}</Eyebrow>
            <p className="mt-1 font-display text-2xl font-bold">{b.school.name}</p>
            <p className="text-sm text-muted">
              {fmtInt(b.school.portions)} porsi dari {b.kitchen.name}, {d.regency.name} ({b.kitchen.slhs ? "ber-SLHS" : "belum ber-SLHS"}) · Menu: {b.menu}
            </p>
            <div className="mt-4">
              <CheckpointTrack s={d} />
            </div>
            <div className="mt-4">
              <BatchJourneyChart path={d.path} readings={batchReadings(d)} cookedAt={b.cookedAt} mealAt={b.mealAt} rule4hAt={d.rule4hAt} now={now} tzOffset={b.tzOffset} />
              <p className="mt-1 text-xs text-muted">Garis abu = suhu makanan. Garis hitam = Indeks Paparan (putus-putus = proyeksi sampai jam makan). Titik bernomor = titik cek; titik putih = nilai asumsi karena tidak tercatat.</p>
            </div>
          </div>

          {canAct && !d.held ? (
            <div data-tour="act" className="card p-5">
              <Eyebrow>Untuk guru piket</Eyebrow>
              {schoolCps.length ? (
                <div className="mt-3">
                  <ReadingForm batchId={id} checkpoints={schoolCps} suggestedCp={schoolCps[0]} ambientC={b.schoolAmbientC} t={t} />
                </div>
              ) : (
                <p className="mt-2 text-sm text-muted">Titik Tiba dan Pra-konsumsi sudah tercatat.</p>
              )}
              <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-line pt-4">
                <ActionButton batchId={id} kind="hold" reason="Ditahan guru di sekolah sebelum dibagikan" label="Tahan, jangan dibagikan" tone="danger" t={t} />
                <span className="text-xs text-muted">Tahan bila makanan berbau, berlendir, atau statusnya Buang. Dinas dan SPPG langsung menerima notifikasi.</span>
              </div>
            </div>
          ) : null}

          <div className="card p-5 text-sm">
            <Eyebrow>Arti status</Eyebrow>
            <ul className="mt-3 grid gap-2">
              <li><b className="text-aman">Aman</b> · IP di bawah 0,8. Boleh dibagikan.</li>
              <li><b className="text-[#8a6100]">Waspada</b> · IP 0,8 sampai di bawah 1,0. Bagikan segera, jangan disimpan lagi.</li>
              <li><b className="text-buang">Buang</b> · IP 1,0 atau lebih. Batas aman pertumbuhan bakteri sudah habis. Jangan dibagikan.</li>
            </ul>
            <p className="mt-3 text-xs text-muted">Indeks Paparan = pertumbuhan <i>Bacillus cereus</i> yang terkumpul dari suhu dan waktu, dibagi batas 3 log (10² ke 10⁵ CFU/g). {CHECKPOINTS[1].device} dipakai di dapur dan sekolah.</p>
          </div>
        </section>
      </div>
      <Tour
        id="cek"
        steps={[
          { target: "verdict", title: "Jawaban dalam satu kalimat", body: <>Hijau = boleh dibagikan, kuning = bagikan segera, merah = jangan dibagikan. Di bawahnya tertulis sampai jam berapa makanan aman.</> },
          { target: "dial", title: "Jam dinding vs jam bakteri", body: <>Jarum hitam menghitung jam sejak matang. Jarum berwarna menghitung pertumbuhan bakteri dalam satuan &quot;jam aturan&quot;. Di ruangan panas, jarum berwarna berlari lebih cepat.</> },
          { target: "journey", title: "Perjalanan suhunya", body: <>Titik bernomor adalah suhu yang diukur di dapur, saat berangkat, saat tiba, dan sebelum makan. Garis hitam menunjukkan Indeks Paparan naik seiring waktu; putus-putus adalah proyeksi.</> },
          { target: "act", title: "Guru piket bisa bertindak", body: <>Catat suhu saat makanan tiba dan sebelum dibagikan, atau tahan batch bila statusnya Buang atau makanan terlihat tidak layak. Dinas dan SPPG langsung menerima tanda Ditahan.</> },
        ]}
      />
    </main>
  );
}

function batchReadings(d: ReturnType<typeof detailOf>) {
  return d.readings.map((r) => ({ checkpoint: r.checkpoint, at: r.at, foodC: r.foodC, source: r.assumed ? "asumsi" : r.source }));
}
